use kokobrain_lib::sync::shares::{
	is_excluded_by_user, is_path_exposable, is_path_in_share, read_shares, shares_file_path,
	should_sync_path, validate_share_config, write_shares, Share, ShareDirection, ShareError,
	ShareMode, SharesFile, CURRENT_SHARES_VERSION,
};
use std::path::Path;

// ============================================================================
// is_path_exposable — hard-deny rules
// ============================================================================

#[test]
fn exposable_rejects_dot_segment_top_level() {
	assert!(!is_path_exposable(Path::new(".kokobrain/settings.json")));
	assert!(!is_path_exposable(Path::new(".git/HEAD")));
	assert!(!is_path_exposable(Path::new(".obsidian/workspace.json")));
	assert!(!is_path_exposable(Path::new(".claude/agents.md")));
	assert!(!is_path_exposable(Path::new(".DS_Store")));
}

#[test]
fn exposable_rejects_dot_segment_at_any_depth() {
	assert!(!is_path_exposable(Path::new("Projects/.git/HEAD")));
	assert!(!is_path_exposable(Path::new("Projects/sub/.kokobrain/x")));
	assert!(!is_path_exposable(Path::new("a/b/c/.archive/x")));
}

#[test]
fn exposable_rejects_encrypted_suffix() {
	assert!(!is_path_exposable(Path::new("notes/secret.encrypted")));
	assert!(!is_path_exposable(Path::new("a/b/c/payload.encrypted")));
}

#[test]
fn exposable_rejects_parent_traversal() {
	assert!(!is_path_exposable(Path::new("../etc/passwd")));
	assert!(!is_path_exposable(Path::new("Projects/../../etc/passwd")));
	assert!(!is_path_exposable(Path::new("a/b/../c")));
}

#[test]
fn exposable_rejects_absolute_paths() {
	assert!(!is_path_exposable(Path::new("/etc/passwd")));
	assert!(!is_path_exposable(Path::new("/Projects/note.md")));
}

#[test]
fn exposable_rejects_nul_byte() {
	let with_nul = std::ffi::OsString::from("Projects/note\0.md");
	let p = Path::new(&with_nul);
	assert!(!is_path_exposable(p));
}

#[test]
fn exposable_rejects_empty_path() {
	assert!(!is_path_exposable(Path::new("")));
}

#[test]
fn exposable_accepts_plain_files() {
	assert!(is_path_exposable(Path::new("note.md")));
	assert!(is_path_exposable(Path::new("Projects/sub/note.md")));
	assert!(is_path_exposable(Path::new("Pasta com espaço/arq.txt")));
}

#[test]
fn exposable_accepts_uppercase_and_hyphens() {
	assert!(is_path_exposable(Path::new("My-Projects/Sub_Folder/file.md")));
}

// ============================================================================
// validate_share_config — Subfolder mode
// ============================================================================

fn vault_dir() -> std::path::PathBuf {
	std::env::temp_dir().join("kokobrain-test-vault")
}

fn make_subfolder_share(local_path: &str) -> Share {
	Share {
		id: "share-test".to_string(),
		mode: ShareMode::Subfolder,
		local_path: local_path.to_string(),
		excludes: Vec::new(),
		allowed_peer_fingerprints: vec!["A1B2-C3D4-E5F6-0708".to_string()],
		direction: ShareDirection::Bi,
		read_only: false,
		created_at_ms: 0,
	}
}

fn make_root_share(excludes: &[&str]) -> Share {
	Share {
		id: "share-root".to_string(),
		mode: ShareMode::RootWithExcludes,
		local_path: "".to_string(),
		excludes: excludes.iter().map(|s| s.to_string()).collect(),
		allowed_peer_fingerprints: vec!["A1B2-C3D4-E5F6-0708".to_string()],
		direction: ShareDirection::Bi,
		read_only: false,
		created_at_ms: 0,
	}
}

#[test]
fn validate_subfolder_accepts_legitimate_path() {
	let share = make_subfolder_share("Projects/sync-test");
	assert!(validate_share_config(&vault_dir(), &share).is_ok());
}

#[test]
fn validate_subfolder_rejects_empty_path() {
	let share = make_subfolder_share("");
	assert_eq!(
		validate_share_config(&vault_dir(), &share),
		Err(ShareError::EmptyLocalPath)
	);
}

#[test]
fn validate_subfolder_rejects_dot_path() {
	let share = make_subfolder_share(".");
	assert_eq!(
		validate_share_config(&vault_dir(), &share),
		Err(ShareError::EmptyLocalPath)
	);
}

#[test]
fn validate_subfolder_rejects_parent_traversal() {
	let share = make_subfolder_share("Projects/../../etc/passwd");
	assert_eq!(
		validate_share_config(&vault_dir(), &share),
		Err(ShareError::ParentTraversalNotAllowed)
	);
}

#[test]
fn validate_subfolder_rejects_absolute_unix() {
	let share = make_subfolder_share("/etc/passwd");
	assert_eq!(
		validate_share_config(&vault_dir(), &share),
		Err(ShareError::AbsolutePathNotAllowed)
	);
}

#[test]
fn validate_subfolder_rejects_absolute_windows() {
	let share = make_subfolder_share("C:\\Windows\\System32");
	assert_eq!(
		validate_share_config(&vault_dir(), &share),
		Err(ShareError::AbsolutePathNotAllowed)
	);
}

#[test]
fn validate_subfolder_rejects_dot_dir() {
	let share = make_subfolder_share(".kokobrain");
	assert_eq!(
		validate_share_config(&vault_dir(), &share),
		Err(ShareError::HiddenOrSensitivePath)
	);
}

#[test]
fn validate_subfolder_rejects_git_dir() {
	let share = make_subfolder_share(".git");
	assert_eq!(
		validate_share_config(&vault_dir(), &share),
		Err(ShareError::HiddenOrSensitivePath)
	);
}

#[test]
fn validate_subfolder_rejects_nested_dot_path() {
	let share = make_subfolder_share("Projects/.git");
	assert_eq!(
		validate_share_config(&vault_dir(), &share),
		Err(ShareError::HiddenOrSensitivePath)
	);
}

#[test]
fn validate_subfolder_rejects_excludes() {
	let mut share = make_subfolder_share("Projects/sync-test");
	share.excludes.push("foo".to_string());
	assert_eq!(
		validate_share_config(&vault_dir(), &share),
		Err(ShareError::ExcludesNotAllowedInSubfolderMode)
	);
}

#[test]
fn validate_subfolder_rejects_nul_byte() {
	let share = make_subfolder_share("Projects/note\0.md");
	assert_eq!(
		validate_share_config(&vault_dir(), &share),
		Err(ShareError::NullByteInPath)
	);
}

// ============================================================================
// validate_share_config — RootWithExcludes mode
// ============================================================================

#[test]
fn validate_root_with_empty_excludes_is_ok() {
	let share = make_root_share(&[]);
	assert!(validate_share_config(&vault_dir(), &share).is_ok());
}

#[test]
fn validate_root_with_dot_path_is_ok() {
	let mut share = make_root_share(&[]);
	share.local_path = ".".to_string();
	assert!(validate_share_config(&vault_dir(), &share).is_ok());
}

#[test]
fn validate_root_accepts_legitimate_excludes() {
	let share = make_root_share(&["Trabalho", "Pessoal"]);
	assert!(validate_share_config(&vault_dir(), &share).is_ok());
}

#[test]
fn validate_root_accepts_redundant_dot_exclude() {
	// `.kokobrain` is already hard-denied — listing it explicitly is a
	// no-op but should not fail validation.
	let share = make_root_share(&[".kokobrain"]);
	assert!(validate_share_config(&vault_dir(), &share).is_ok());
}

#[test]
fn validate_root_rejects_local_path_set() {
	let mut share = make_root_share(&[]);
	share.local_path = "Projects".to_string();
	assert_eq!(
		validate_share_config(&vault_dir(), &share),
		Err(ShareError::UnexpectedLocalPath)
	);
}

#[test]
fn validate_root_rejects_traversal_in_exclude() {
	let share = make_root_share(&["../etc"]);
	assert_eq!(
		validate_share_config(&vault_dir(), &share),
		Err(ShareError::ParentTraversalNotAllowed)
	);
}

#[test]
fn validate_root_rejects_compound_traversal_in_exclude() {
	let share = make_root_share(&["Trabalho/../../etc"]);
	assert_eq!(
		validate_share_config(&vault_dir(), &share),
		Err(ShareError::ParentTraversalNotAllowed)
	);
}

#[test]
fn validate_root_rejects_absolute_exclude() {
	let share = make_root_share(&["/etc/passwd"]);
	assert_eq!(
		validate_share_config(&vault_dir(), &share),
		Err(ShareError::AbsolutePathNotAllowed)
	);
}

#[test]
fn validate_root_rejects_drive_letter_exclude() {
	let share = make_root_share(&["C:\\Foo"]);
	assert_eq!(
		validate_share_config(&vault_dir(), &share),
		Err(ShareError::AbsolutePathNotAllowed)
	);
}

#[test]
fn validate_root_rejects_empty_exclude_entry() {
	let share = make_root_share(&[""]);
	assert_eq!(
		validate_share_config(&vault_dir(), &share),
		Err(ShareError::EmptyLocalPath)
	);
}

// ============================================================================
// is_excluded_by_user
// ============================================================================

#[test]
fn excludes_only_apply_to_root_mode() {
	let mut share = make_subfolder_share("Projects/sync-test");
	share.excludes.push("Trabalho".to_string()); // ignored by mode
	assert!(!is_excluded_by_user(&share, Path::new("Trabalho/foo")));
}

#[test]
fn excludes_match_exact_path() {
	let share = make_root_share(&["Trabalho"]);
	assert!(is_excluded_by_user(&share, Path::new("Trabalho")));
}

#[test]
fn excludes_match_paths_under_excluded_prefix() {
	let share = make_root_share(&["Trabalho"]);
	assert!(is_excluded_by_user(&share, Path::new("Trabalho/note.md")));
	assert!(is_excluded_by_user(&share, Path::new("Trabalho/sub/deep/x.md")));
}

#[test]
fn excludes_dont_match_similar_prefix() {
	// "Trabalho" must not exclude "Trabalhos/...".
	let share = make_root_share(&["Trabalho"]);
	assert!(!is_excluded_by_user(&share, Path::new("Trabalhos/note.md")));
	assert!(!is_excluded_by_user(&share, Path::new("Trabalho2/note.md")));
}

#[test]
fn multiple_excludes_combine() {
	let share = make_root_share(&["Trabalho", "Pessoal"]);
	assert!(is_excluded_by_user(&share, Path::new("Trabalho/foo")));
	assert!(is_excluded_by_user(&share, Path::new("Pessoal/bar")));
	assert!(!is_excluded_by_user(&share, Path::new("Outras/baz")));
}

// ============================================================================
// is_path_in_share + should_sync_path
// ============================================================================

#[test]
fn in_share_subfolder_matches_under_local_path() {
	let share = make_subfolder_share("Projects/sync-test");
	let vault = Path::new("/vault");
	assert!(is_path_in_share(
		&share,
		vault,
		Path::new("/vault/Projects/sync-test/note.md")
	));
	assert!(is_path_in_share(
		&share,
		vault,
		Path::new("/vault/Projects/sync-test/sub/x.md")
	));
}

#[test]
fn in_share_subfolder_rejects_sibling_paths() {
	let share = make_subfolder_share("Projects/sync-test");
	let vault = Path::new("/vault");
	assert!(!is_path_in_share(
		&share,
		vault,
		Path::new("/vault/Projects/other/note.md")
	));
	assert!(!is_path_in_share(
		&share,
		vault,
		Path::new("/vault/Other/sync-test/note.md")
	));
}

#[test]
fn in_share_root_matches_anything_in_vault() {
	let share = make_root_share(&[]);
	let vault = Path::new("/vault");
	assert!(is_path_in_share(&share, vault, Path::new("/vault/a.md")));
	assert!(is_path_in_share(
		&share,
		vault,
		Path::new("/vault/sub/deep/x.md")
	));
}

#[test]
fn should_sync_combines_all_three_gates() {
	let share = make_root_share(&["Trabalho"]);
	let vault = Path::new("/vault");

	// Plain file in scope, exposable, not excluded.
	assert!(should_sync_path(
		&share,
		vault,
		Path::new("/vault/Projects/note.md")
	));

	// Hard-deny wins even when the user did not list it in excludes.
	assert!(!should_sync_path(
		&share,
		vault,
		Path::new("/vault/.kokobrain/settings.json")
	));
	assert!(!should_sync_path(
		&share,
		vault,
		Path::new("/vault/note.encrypted")
	));
	assert!(!should_sync_path(
		&share,
		vault,
		Path::new("/vault/sub/.git/HEAD")
	));

	// User exclude.
	assert!(!should_sync_path(
		&share,
		vault,
		Path::new("/vault/Trabalho/note.md")
	));

	// Outside the vault.
	assert!(!should_sync_path(&share, vault, Path::new("/etc/passwd")));
}

// ============================================================================
// shares.json read/write round-trip
// ============================================================================

#[test]
fn read_shares_returns_default_when_missing() {
	let tmp = tempfile::tempdir().unwrap();
	let file = read_shares(tmp.path()).unwrap();
	assert_eq!(file.version, CURRENT_SHARES_VERSION);
	assert!(file.shares.is_empty());
}

#[test]
fn write_then_read_round_trips() {
	let tmp = tempfile::tempdir().unwrap();
	let original = SharesFile {
		version: CURRENT_SHARES_VERSION,
		shares: vec![
			make_subfolder_share("Projects/sync-test"),
			make_root_share(&["Trabalho", "Pessoal"]),
		],
	};
	write_shares(tmp.path(), &original).unwrap();
	let parsed = read_shares(tmp.path()).unwrap();
	assert_eq!(parsed, original);
}

#[test]
fn write_creates_parent_directory() {
	let tmp = tempfile::tempdir().unwrap();
	let file = SharesFile::default();
	write_shares(tmp.path(), &file).unwrap();
	let on_disk = shares_file_path(tmp.path());
	assert!(on_disk.exists());
	assert!(on_disk.parent().unwrap().exists());
}

#[test]
fn write_rejects_invalid_share() {
	let tmp = tempfile::tempdir().unwrap();
	let mut bad = SharesFile::default();
	bad.shares.push(make_subfolder_share(".kokobrain"));
	let err = write_shares(tmp.path(), &bad).unwrap_err();
	assert_eq!(err, ShareError::HiddenOrSensitivePath);
}

#[test]
fn read_rejects_unsupported_version() {
	let tmp = tempfile::tempdir().unwrap();
	let dir = tmp.path().join(".kokobrain").join("lan-sync");
	std::fs::create_dir_all(&dir).unwrap();
	std::fs::write(
		dir.join("shares.json"),
		serde_json::to_string_pretty(&serde_json::json!({
			"version": 999,
			"shares": []
		}))
		.unwrap(),
	)
	.unwrap();
	let err = read_shares(tmp.path()).unwrap_err();
	matches!(
		err,
		ShareError::VersionMismatch {
			found: 999,
			supported: _
		}
	);
}

#[test]
fn read_rejects_malformed_json() {
	let tmp = tempfile::tempdir().unwrap();
	let dir = tmp.path().join(".kokobrain").join("lan-sync");
	std::fs::create_dir_all(&dir).unwrap();
	std::fs::write(dir.join("shares.json"), "not json").unwrap();
	let err = read_shares(tmp.path()).unwrap_err();
	matches!(err, ShareError::Decode(_));
}

#[test]
fn read_rejects_share_with_smuggled_traversal() {
	// shares.json hand-edited (or corrupted) to include `..` must not load.
	let tmp = tempfile::tempdir().unwrap();
	let dir = tmp.path().join(".kokobrain").join("lan-sync");
	std::fs::create_dir_all(&dir).unwrap();
	let payload = serde_json::json!({
		"version": CURRENT_SHARES_VERSION,
		"shares": [{
			"id": "share-attack",
			"mode": "subfolder",
			"localPath": "Projects/../../etc",
			"excludes": [],
			"allowedPeerFingerprints": [],
			"direction": "bi",
			"readOnly": false,
			"createdAtMs": 0,
		}]
	});
	std::fs::write(
		dir.join("shares.json"),
		serde_json::to_string_pretty(&payload).unwrap(),
	)
	.unwrap();
	let err = read_shares(tmp.path()).unwrap_err();
	assert_eq!(err, ShareError::ParentTraversalNotAllowed);
}
