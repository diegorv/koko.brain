use noted_lib::sync::manifest::{
	build_manifest, diff_manifests, is_excluded, FileDiff, FileEntry, Side, SyncManifest,
};

// ---------------------------------------------------------------------------
// is_excluded
// ---------------------------------------------------------------------------

#[test]
fn is_excluded_folder() {
	assert!(is_excluded(
		".noted/trash/old.md",
		&[]
	));
	assert!(is_excluded(".noted/sync-identity", &[]));
	assert!(is_excluded(".noted/sync-local.json", &[]));
	assert!(is_excluded(".noted/sync-state.json", &[]));
}

#[test]
fn is_excluded_glob() {
	let excl = vec!["private/**".to_string(), "drafts/".to_string()];
	assert!(is_excluded("private/secret.md", &excl));
	assert!(!is_excluded("notes/hello.md", &excl));
}

#[test]
fn is_excluded_empty_list() {
	assert!(!is_excluded("notes/hello.md", &[]));
	assert!(!is_excluded("README.md", &[]));
}

#[test]
fn is_excluded_hardcoded_always_applies() {
	// Even with an empty user list, hardcoded exclusions apply
	assert!(is_excluded("noted.db", &[]));
	assert!(is_excluded("noted.db-wal", &[]));
	assert!(is_excluded("noted.db-shm", &[]));
}

// ---------------------------------------------------------------------------
// build_manifest
// ---------------------------------------------------------------------------

#[test]
fn build_manifest_excludes_sync_local_json() {
	let dir = tempfile::tempdir().unwrap();
	let vault = dir.path();
	let noted = vault.join(".noted");
	std::fs::create_dir_all(&noted).unwrap();
	std::fs::write(noted.join("sync-local.json"), "{}").unwrap();
	std::fs::write(vault.join("note.md"), "# Hello").unwrap();

	let manifest = build_manifest(vault.to_str().unwrap(), &[]).unwrap();
	let paths: Vec<&str> = manifest.files.iter().map(|f| f.path.as_str()).collect();
	assert!(!paths.contains(&".noted/sync-local.json"));
}

#[test]
fn build_manifest_excludes_sync_state_json() {
	let dir = tempfile::tempdir().unwrap();
	let vault = dir.path();
	let noted = vault.join(".noted");
	std::fs::create_dir_all(&noted).unwrap();
	std::fs::write(noted.join("sync-state.json"), "{}").unwrap();
	std::fs::write(vault.join("note.md"), "# Hello").unwrap();

	let manifest = build_manifest(vault.to_str().unwrap(), &[]).unwrap();
	let paths: Vec<&str> = manifest.files.iter().map(|f| f.path.as_str()).collect();
	assert!(!paths.contains(&".noted/sync-state.json"));
}

#[test]
fn build_manifest_includes_settings_json() {
	let dir = tempfile::tempdir().unwrap();
	let vault = dir.path();
	let noted = vault.join(".noted");
	std::fs::create_dir_all(&noted).unwrap();
	std::fs::write(noted.join("settings.json"), r#"{"theme":"dark"}"#).unwrap();

	let manifest = build_manifest(vault.to_str().unwrap(), &[]).unwrap();
	let paths: Vec<&str> = manifest.files.iter().map(|f| f.path.as_str()).collect();
	assert!(paths.contains(&".noted/settings.json"));
}

#[test]
fn build_manifest_includes_vault_id() {
	let dir = tempfile::tempdir().unwrap();
	let vault = dir.path();
	let noted = vault.join(".noted");
	std::fs::create_dir_all(&noted).unwrap();
	std::fs::write(noted.join("vault-id"), "test-uuid").unwrap();

	let manifest = build_manifest(vault.to_str().unwrap(), &[]).unwrap();
	let paths: Vec<&str> = manifest.files.iter().map(|f| f.path.as_str()).collect();
	assert!(paths.contains(&".noted/vault-id"));
}

#[test]
fn build_manifest_collects_md_files() {
	let dir = tempfile::tempdir().unwrap();
	let vault = dir.path();
	std::fs::write(vault.join("hello.md"), "# Hello").unwrap();
	std::fs::create_dir_all(vault.join("sub")).unwrap();
	std::fs::write(vault.join("sub/nested.md"), "# Nested").unwrap();

	let manifest = build_manifest(vault.to_str().unwrap(), &[]).unwrap();
	let paths: Vec<&str> = manifest.files.iter().map(|f| f.path.as_str()).collect();
	assert!(paths.contains(&"hello.md"));
	assert!(paths.contains(&"sub/nested.md"));
}

#[test]
fn build_manifest_respects_user_exclusions() {
	let dir = tempfile::tempdir().unwrap();
	let vault = dir.path();
	std::fs::create_dir_all(vault.join("private")).unwrap();
	std::fs::write(vault.join("private/secret.md"), "secret").unwrap();
	std::fs::write(vault.join("public.md"), "public").unwrap();

	let excl = vec!["private/**".to_string()];
	let manifest = build_manifest(vault.to_str().unwrap(), &excl).unwrap();
	let paths: Vec<&str> = manifest.files.iter().map(|f| f.path.as_str()).collect();
	assert!(!paths.contains(&"private/secret.md"));
	assert!(paths.contains(&"public.md"));
}

// ---------------------------------------------------------------------------
// diff_manifests — three-way (with baseline)
// ---------------------------------------------------------------------------

fn entry(path: &str, hash: &str) -> FileEntry {
	FileEntry {
		path: path.to_string(),
		sha256: hash.to_string(),
		mtime: 1000,
	}
}

fn manifest(files: Vec<FileEntry>) -> SyncManifest {
	SyncManifest {
		files,
		generated_at: 1000,
	}
}

fn find_diff<'a>(results: &'a [(String, FileDiff)], path: &str) -> Option<&'a FileDiff> {
	results.iter().find(|(p, _)| p == path).map(|(_, d)| d)
}

#[test]
fn manifest_diff_identical() {
	let local = manifest(vec![entry("a.md", "aaa")]);
	let remote = manifest(vec![entry("a.md", "aaa")]);
	let base = manifest(vec![entry("a.md", "aaa")]);

	let diffs = diff_manifests(&local, &remote, Some(&base));
	assert_eq!(find_diff(&diffs, "a.md"), Some(&FileDiff::Identical));
}

#[test]
fn manifest_diff_local_changed() {
	let local = manifest(vec![entry("a.md", "bbb")]);
	let remote = manifest(vec![entry("a.md", "aaa")]);
	let base = manifest(vec![entry("a.md", "aaa")]);

	let diffs = diff_manifests(&local, &remote, Some(&base));
	assert_eq!(find_diff(&diffs, "a.md"), Some(&FileDiff::PushToPeer));
}

#[test]
fn manifest_diff_remote_changed() {
	let local = manifest(vec![entry("a.md", "aaa")]);
	let remote = manifest(vec![entry("a.md", "bbb")]);
	let base = manifest(vec![entry("a.md", "aaa")]);

	let diffs = diff_manifests(&local, &remote, Some(&base));
	assert_eq!(find_diff(&diffs, "a.md"), Some(&FileDiff::PullFromPeer));
}

#[test]
fn manifest_diff_both_changed() {
	let local = manifest(vec![entry("a.md", "bbb")]);
	let remote = manifest(vec![entry("a.md", "ccc")]);
	let base = manifest(vec![entry("a.md", "aaa")]);

	let diffs = diff_manifests(&local, &remote, Some(&base));
	assert_eq!(find_diff(&diffs, "a.md"), Some(&FileDiff::Conflict));
}

#[test]
fn manifest_diff_both_changed_identically() {
	let local = manifest(vec![entry("a.md", "bbb")]);
	let remote = manifest(vec![entry("a.md", "bbb")]);
	let base = manifest(vec![entry("a.md", "aaa")]);

	let diffs = diff_manifests(&local, &remote, Some(&base));
	assert_eq!(find_diff(&diffs, "a.md"), Some(&FileDiff::Identical));
}

#[test]
fn manifest_diff_delete_local() {
	// File in baseline + remote, but NOT in local → local deleted it
	let local = manifest(vec![]);
	let remote = manifest(vec![entry("a.md", "aaa")]);
	let base = manifest(vec![entry("a.md", "aaa")]);

	let diffs = diff_manifests(&local, &remote, Some(&base));
	assert_eq!(find_diff(&diffs, "a.md"), Some(&FileDiff::DeleteLocal));
}

#[test]
fn manifest_diff_delete_remote() {
	// File in baseline + local, but NOT in remote → remote deleted it
	let local = manifest(vec![entry("a.md", "aaa")]);
	let remote = manifest(vec![]);
	let base = manifest(vec![entry("a.md", "aaa")]);

	let diffs = diff_manifests(&local, &remote, Some(&base));
	assert_eq!(find_diff(&diffs, "a.md"), Some(&FileDiff::DeleteRemote));
}

#[test]
fn manifest_diff_delete_modify_conflict() {
	// Remote deleted, local modified → delete-modify conflict
	let local = manifest(vec![entry("a.md", "bbb")]);
	let remote = manifest(vec![]);
	let base = manifest(vec![entry("a.md", "aaa")]);

	let diffs = diff_manifests(&local, &remote, Some(&base));
	assert_eq!(
		find_diff(&diffs, "a.md"),
		Some(&FileDiff::DeleteModifyConflict {
			modified_side: Side::Local
		})
	);

	// Local deleted, remote modified → delete-modify conflict
	let local2 = manifest(vec![]);
	let remote2 = manifest(vec![entry("a.md", "bbb")]);

	let diffs2 = diff_manifests(&local2, &remote2, Some(&base));
	assert_eq!(
		find_diff(&diffs2, "a.md"),
		Some(&FileDiff::DeleteModifyConflict {
			modified_side: Side::Remote
		})
	);
}

#[test]
fn manifest_diff_both_deleted() {
	let local = manifest(vec![]);
	let remote = manifest(vec![]);
	let base = manifest(vec![entry("a.md", "aaa")]);

	let diffs = diff_manifests(&local, &remote, Some(&base));
	// Both deleted → not included in results (no action needed)
	assert!(find_diff(&diffs, "a.md").is_none());
}

#[test]
fn manifest_diff_new_file_after_baseline() {
	// File not in baseline, only on local → push
	let local = manifest(vec![entry("new.md", "xxx")]);
	let remote = manifest(vec![]);
	let base = manifest(vec![]);

	let diffs = diff_manifests(&local, &remote, Some(&base));
	assert_eq!(find_diff(&diffs, "new.md"), Some(&FileDiff::PushToPeer));

	// File not in baseline, only on remote → pull
	let local2 = manifest(vec![]);
	let remote2 = manifest(vec![entry("new.md", "xxx")]);

	let diffs2 = diff_manifests(&local2, &remote2, Some(&base));
	assert_eq!(find_diff(&diffs2, "new.md"), Some(&FileDiff::PullFromPeer));
}

// ---------------------------------------------------------------------------
// diff_manifests — two-way (no baseline / first sync)
// ---------------------------------------------------------------------------

#[test]
fn manifest_diff_no_baseline_first_sync() {
	let local = manifest(vec![entry("a.md", "aaa"), entry("b.md", "bbb")]);
	let remote = manifest(vec![entry("a.md", "aaa"), entry("c.md", "ccc")]);

	let diffs = diff_manifests(&local, &remote, None);

	// Same hash → identical
	assert_eq!(find_diff(&diffs, "a.md"), Some(&FileDiff::Identical));
	// Only local → push
	assert_eq!(find_diff(&diffs, "b.md"), Some(&FileDiff::PushToPeer));
	// Only remote → pull
	assert_eq!(find_diff(&diffs, "c.md"), Some(&FileDiff::PullFromPeer));
}

#[test]
fn manifest_diff_no_baseline_different_hash_is_conflict() {
	let local = manifest(vec![entry("a.md", "aaa")]);
	let remote = manifest(vec![entry("a.md", "bbb")]);

	let diffs = diff_manifests(&local, &remote, None);
	assert_eq!(find_diff(&diffs, "a.md"), Some(&FileDiff::Conflict));
}
