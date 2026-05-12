use kokobrain_lib::sync::protocol::{EntryKind, ManifestEntry};
use kokobrain_lib::sync::sync_engine::{
	apply_inbound_delete, apply_inbound_update, atomic_write, build_conflict_filename,
	cleanup_orphan_tmp_files, diff_manifests, paginate_manifest, save_conflict_copy,
	safe_resolve_under_share, validate_inbound_path, ApplyError, ApplyOutcome, DiffEntry,
	InboundLocalState, TMP_PREFIX,
};
use std::path::PathBuf;

fn entry(path: &str, lamport: u64, mtime_ms: i64, hash: &str) -> ManifestEntry {
	ManifestEntry {
		path_rel: path.to_string(),
		kind: EntryKind::File,
		mtime_ms,
		lamport,
		sha256_hash: hash.to_string(),
		size: 1024,
		origin_fingerprint: "A1B2C3D4E5F60708".to_string(),
	}
}

// ============================================================================
// diff_manifests
// ============================================================================

#[test]
fn empty_manifests_diff_empty() {
	assert!(diff_manifests(&[], &[]).is_empty());
}

#[test]
fn entirely_local_yields_added_local() {
	let diff = diff_manifests(&[entry("a.md", 1, 100, "h1")], &[]);
	assert_eq!(diff.len(), 1);
	matches!(diff[0], DiffEntry::AddedLocal(_));
}

#[test]
fn entirely_remote_yields_added_remote() {
	let diff = diff_manifests(&[], &[entry("a.md", 1, 100, "h1")]);
	assert_eq!(diff.len(), 1);
	matches!(diff[0], DiffEntry::AddedRemote(_));
}

#[test]
fn identical_entries_are_skipped() {
	let local = vec![entry("a.md", 5, 100, "h1")];
	let remote = vec![entry("a.md", 5, 100, "h1")];
	assert!(diff_manifests(&local, &remote).is_empty());
}

#[test]
fn same_hash_different_clock_is_idempotent() {
	// Hash + size + kind drive the "are they equal?" check; lamport
	// and mtime drift is intentionally absorbed.
	let local = vec![entry("a.md", 5, 100, "h1")];
	let remote = vec![entry("a.md", 99, 9999, "h1")];
	assert!(diff_manifests(&local, &remote).is_empty());
}

#[test]
fn modified_remote_wins_with_higher_lamport() {
	let local = vec![entry("a.md", 5, 100, "h1")];
	let remote = vec![entry("a.md", 6, 100, "h2")];
	let diff = diff_manifests(&local, &remote);
	assert_eq!(diff.len(), 1);
	match &diff[0] {
		DiffEntry::RemoteWins(e) => {
			assert_eq!(e.path_rel, "a.md");
			assert_eq!(e.lamport, 6);
		}
		other => panic!("expected RemoteWins, got {other:?}"),
	}
}

#[test]
fn modified_local_wins_with_higher_lamport() {
	let local = vec![entry("a.md", 10, 100, "h1")];
	let remote = vec![entry("a.md", 6, 100, "h2")];
	let diff = diff_manifests(&local, &remote);
	assert_eq!(diff.len(), 1);
	matches!(diff[0], DiffEntry::LocalWins(_));
}

#[test]
fn lww_breaks_lamport_tie_by_mtime() {
	let local = vec![entry("a.md", 5, 100, "h1")];
	let remote = vec![entry("a.md", 5, 200, "h2")];
	let diff = diff_manifests(&local, &remote);
	assert_eq!(diff.len(), 1);
	matches!(diff[0], DiffEntry::RemoteWins(_));
}

#[test]
fn lww_tie_falls_through_to_fingerprint() {
	// Identical lamport AND mtime; tiebreaker is origin_fingerprint
	// lexicographic — deterministic across runs.
	let mut l = entry("a.md", 5, 100, "h1");
	let mut r = entry("a.md", 5, 100, "h2");
	l.origin_fingerprint = "AAAA".to_string();
	r.origin_fingerprint = "BBBB".to_string();
	let diff = diff_manifests(&[l], &[r]);
	matches!(&diff[0], DiffEntry::RemoteWins(_));
}

#[test]
fn diff_sorts_by_path() {
	let local = vec![
		entry("zzz.md", 1, 100, "h"),
		entry("aaa.md", 1, 100, "h"),
	];
	let remote = vec![];
	let diff = diff_manifests(&local, &remote);
	let paths: Vec<_> = diff
		.iter()
		.map(|d| match d {
			DiffEntry::AddedLocal(e) => e.path_rel.clone(),
			DiffEntry::AddedRemote(e) => e.path_rel.clone(),
			DiffEntry::LocalWins(e) => e.path_rel.clone(),
			DiffEntry::RemoteWins(e) => e.path_rel.clone(),
		})
		.collect();
	assert_eq!(paths, vec!["aaa.md", "zzz.md"]);
}

#[test]
fn diff_handles_mixed_categories() {
	let local = vec![
		entry("only-local.md", 1, 100, "h"),
		entry("conflict.md", 5, 100, "local_hash"),
		entry("identical.md", 1, 100, "same"),
	];
	let remote = vec![
		entry("only-remote.md", 1, 100, "h"),
		entry("conflict.md", 6, 100, "remote_hash"),
		entry("identical.md", 1, 100, "same"),
	];
	let diff = diff_manifests(&local, &remote);
	assert_eq!(diff.len(), 3);
	let kinds: Vec<&str> = diff
		.iter()
		.map(|d| match d {
			DiffEntry::AddedLocal(_) => "local",
			DiffEntry::AddedRemote(_) => "remote",
			DiffEntry::LocalWins(_) => "local-wins",
			DiffEntry::RemoteWins(_) => "remote-wins",
		})
		.collect();
	// Sorted alphabetically: conflict, only-local, only-remote.
	assert_eq!(kinds, vec!["remote-wins", "local", "remote"]);
}

// ============================================================================
// paginate_manifest
// ============================================================================

#[test]
fn paginate_empty_emits_one_empty_page() {
	let pages = paginate_manifest(vec![], 10);
	assert_eq!(pages.len(), 1);
	assert!(pages[0].0.is_empty());
	assert!(pages[0].1, "single empty page must be last");
}

#[test]
fn paginate_single_under_limit() {
	let entries = vec![entry("a.md", 1, 0, "h")];
	let pages = paginate_manifest(entries, 10);
	assert_eq!(pages.len(), 1);
	assert_eq!(pages[0].0.len(), 1);
	assert!(pages[0].1);
}

#[test]
fn paginate_splits_at_chunk_boundary() {
	let entries: Vec<_> = (0..25)
		.map(|i| entry(&format!("f{i:03}.md"), 1, 0, "h"))
		.collect();
	let pages = paginate_manifest(entries, 10);
	assert_eq!(pages.len(), 3);
	assert_eq!(pages[0].0.len(), 10);
	assert!(!pages[0].1);
	assert_eq!(pages[1].0.len(), 10);
	assert!(!pages[1].1);
	assert_eq!(pages[2].0.len(), 5);
	assert!(pages[2].1);
}

#[test]
fn paginate_with_chunk_size_zero_treated_as_one() {
	let entries: Vec<_> = (0..3)
		.map(|i| entry(&format!("f{i}.md"), 1, 0, "h"))
		.collect();
	let pages = paginate_manifest(entries, 0);
	assert_eq!(pages.len(), 3);
	assert!(pages[2].1);
}

// ============================================================================
// validate_inbound_path
// ============================================================================

#[test]
fn validate_inbound_rejects_traversal() {
	assert!(matches!(
		validate_inbound_path("../etc/passwd"),
		Err(ApplyError::InvalidPath(_))
	));
	assert!(matches!(
		validate_inbound_path("a/../../b"),
		Err(ApplyError::InvalidPath(_))
	));
}

#[test]
fn validate_inbound_rejects_absolute() {
	assert!(matches!(
		validate_inbound_path("/etc/passwd"),
		Err(ApplyError::InvalidPath(_))
	));
	assert!(matches!(
		validate_inbound_path("C:\\Windows"),
		Err(ApplyError::InvalidPath(_))
	));
}

#[test]
fn validate_inbound_rejects_dot_segment() {
	assert!(matches!(
		validate_inbound_path(".kokobrain/db"),
		Err(ApplyError::InvalidPath(_))
	));
	assert!(matches!(
		validate_inbound_path("Projects/.git/HEAD"),
		Err(ApplyError::InvalidPath(_))
	));
}

#[test]
fn validate_inbound_rejects_nul() {
	assert!(matches!(
		validate_inbound_path("foo\0bar"),
		Err(ApplyError::InvalidPath(_))
	));
}

#[test]
fn validate_inbound_rejects_empty() {
	assert!(matches!(
		validate_inbound_path(""),
		Err(ApplyError::InvalidPath(_))
	));
}

#[test]
fn validate_inbound_accepts_plain_paths() {
	assert!(validate_inbound_path("note.md").is_ok());
	assert!(validate_inbound_path("Projects/sub/note.md").is_ok());
}

// ============================================================================
// safe_resolve_under_share
// ============================================================================

#[test]
fn safe_resolve_creates_parent_for_new_file() {
	let tmp = tempfile::tempdir().unwrap();
	let share = tmp.path();
	let resolved = safe_resolve_under_share(share, "deep/sub/note.md").unwrap();
	assert!(resolved.starts_with(share.canonicalize().unwrap()));
	assert!(resolved.parent().unwrap().exists());
}

#[test]
fn safe_resolve_rejects_traversal() {
	let tmp = tempfile::tempdir().unwrap();
	let err = safe_resolve_under_share(tmp.path(), "../etc").unwrap_err();
	matches!(err, ApplyError::InvalidPath(_));
}

#[test]
fn safe_resolve_rejects_outside_share_via_symlink() {
	// Symlink attack: create a symlink INSIDE the share that points
	// outside, then try to write under it.
	let outside = tempfile::tempdir().unwrap();
	let share = tempfile::tempdir().unwrap();
	let link_path = share.path().join("escape");
	#[cfg(unix)]
	{
		std::os::unix::fs::symlink(outside.path(), &link_path).unwrap();
		let err = safe_resolve_under_share(share.path(), "escape/evil.md").unwrap_err();
		matches!(err, ApplyError::OutsideShare(_));
	}
	#[cfg(not(unix))]
	{
		// Skip on non-unix; the strict_starts_with check still applies
		// to the parent dir on Windows but symlink creation needs
		// admin rights.
		let _ = link_path;
	}
}

// ============================================================================
// build_conflict_filename
// ============================================================================

#[test]
fn conflict_filename_preserves_extension() {
	let original = PathBuf::from("/vault/Projects/note.md");
	let conflict = build_conflict_filename(&original, "A1B2C3D4", "20260512143000");
	assert_eq!(
		conflict.to_string_lossy(),
		"/vault/Projects/note.conflict-A1B2C3D4-20260512143000.md"
	);
}

#[test]
fn conflict_filename_handles_no_extension() {
	let original = PathBuf::from("/vault/Projects/README");
	let conflict = build_conflict_filename(&original, "A1B2C3D4", "20260512143000");
	assert_eq!(
		conflict.to_string_lossy(),
		"/vault/Projects/README.conflict-A1B2C3D4-20260512143000"
	);
}

#[test]
fn conflict_filename_lives_alongside_original() {
	let original = PathBuf::from("/vault/sub/dir/note.md");
	let conflict = build_conflict_filename(&original, "ABCD0000", "20260101000000");
	assert_eq!(conflict.parent(), original.parent());
}

// ============================================================================
// atomic_write + save_conflict_copy
// ============================================================================

#[test]
fn atomic_write_creates_file_with_content() {
	let tmp = tempfile::tempdir().unwrap();
	let dest = tmp.path().join("a.md");
	atomic_write(&dest, b"hello").unwrap();
	assert_eq!(std::fs::read(&dest).unwrap(), b"hello");
}

#[test]
fn atomic_write_replaces_existing() {
	let tmp = tempfile::tempdir().unwrap();
	let dest = tmp.path().join("a.md");
	std::fs::write(&dest, b"old").unwrap();
	atomic_write(&dest, b"new").unwrap();
	assert_eq!(std::fs::read(&dest).unwrap(), b"new");
}

#[test]
fn atomic_write_leaves_no_tmp_file_after_success() {
	let tmp = tempfile::tempdir().unwrap();
	let dest = tmp.path().join("a.md");
	atomic_write(&dest, b"x").unwrap();
	let entries: Vec<_> = std::fs::read_dir(tmp.path())
		.unwrap()
		.flatten()
		.map(|e| e.file_name().to_string_lossy().to_string())
		.collect();
	assert!(!entries.iter().any(|n| n.starts_with(TMP_PREFIX)));
}

#[test]
fn atomic_write_creates_parent_dir() {
	let tmp = tempfile::tempdir().unwrap();
	let dest = tmp.path().join("deep/nest/a.md");
	atomic_write(&dest, b"x").unwrap();
	assert!(dest.exists());
}

#[test]
fn save_conflict_copy_renames_existing_file() {
	let tmp = tempfile::tempdir().unwrap();
	let original = tmp.path().join("note.md");
	std::fs::write(&original, b"old content").unwrap();
	let conflict = save_conflict_copy(&original, "A1B2C3D4", "20260512143000").unwrap();
	assert!(!original.exists());
	assert!(conflict.exists());
	assert_eq!(std::fs::read(&conflict).unwrap(), b"old content");
	assert!(conflict
		.file_name()
		.unwrap()
		.to_string_lossy()
		.contains(".conflict-A1B2C3D4-20260512143000"));
}

#[test]
fn save_conflict_copy_fails_when_original_missing() {
	let tmp = tempfile::tempdir().unwrap();
	let missing = tmp.path().join("nope.md");
	assert!(save_conflict_copy(&missing, "A1B2C3D4", "20260512143000").is_err());
}

// ============================================================================
// cleanup_orphan_tmp_files
// ============================================================================

#[test]
fn cleanup_removes_tmp_files_older_than_threshold() {
	let tmp = tempfile::tempdir().unwrap();
	let stale_path = tmp.path().join(format!("{TMP_PREFIX}stale-uuid"));
	std::fs::write(&stale_path, b"junk").unwrap();
	// Wait briefly so the file's mtime is reliably in the past, then
	// run cleanup with a zero-second threshold (anything older than
	// now should be deleted). This avoids needing to backdate mtime
	// via filetime/utimes — which would require an extra dev-dep.
	std::thread::sleep(std::time::Duration::from_millis(50));
	let removed = cleanup_orphan_tmp_files(tmp.path(), 0).unwrap();
	assert!(removed >= 1);
	assert!(!stale_path.exists());
}

#[test]
fn cleanup_leaves_fresh_tmp_files_alone() {
	let tmp = tempfile::tempdir().unwrap();
	let fresh_path = tmp.path().join(format!("{TMP_PREFIX}fresh-uuid"));
	std::fs::write(&fresh_path, b"junk").unwrap();
	// Threshold is 1 hour; fresh file (just created) must survive.
	let removed = cleanup_orphan_tmp_files(tmp.path(), 3600).unwrap();
	assert_eq!(removed, 0);
	assert!(fresh_path.exists());
}

#[test]
fn cleanup_ignores_non_tmp_files() {
	let tmp = tempfile::tempdir().unwrap();
	let regular = tmp.path().join("note.md");
	std::fs::write(&regular, b"keep me").unwrap();
	cleanup_orphan_tmp_files(tmp.path(), 0).unwrap();
	assert!(regular.exists());
}

#[test]
fn cleanup_recurses_into_subdirs() {
	let tmp = tempfile::tempdir().unwrap();
	let subdir = tmp.path().join("sub");
	std::fs::create_dir(&subdir).unwrap();
	let stale = subdir.join(format!("{TMP_PREFIX}deep"));
	std::fs::write(&stale, b"junk").unwrap();
	std::thread::sleep(std::time::Duration::from_millis(50));
	let removed = cleanup_orphan_tmp_files(tmp.path(), 0).unwrap();
	assert!(removed >= 1);
	assert!(!stale.exists());
}

// ============================================================================
// apply_inbound_update (LWW + atomic + conflict)
// ============================================================================

#[test]
fn apply_inbound_creates_new_file() {
	let tmp = tempfile::tempdir().unwrap();
	let outcome = apply_inbound_update(
		tmp.path(),
		"note.md",
		b"hello",
		"hash1",
		1000,
		1,
		"PEERAAAA",
		None,
		"PEER8888",
		"20260101000000",
	)
	.unwrap();
	assert!(matches!(outcome, ApplyOutcome::Applied));
	assert_eq!(std::fs::read(tmp.path().join("note.md")).unwrap(), b"hello");
}

#[test]
fn apply_inbound_idempotent_when_hash_matches() {
	let tmp = tempfile::tempdir().unwrap();
	std::fs::write(tmp.path().join("note.md"), b"old").unwrap();
	let local = InboundLocalState {
		exists: true,
		hash: "hash1".to_string(),
		mtime_ms: 100,
		lamport: 5,
		origin_fp: "MY".to_string(),
	};
	let outcome = apply_inbound_update(
		tmp.path(),
		"note.md",
		b"new", // ignored — hash matches
		"hash1",
		200,
		10,
		"PEER",
		Some(&local),
		"PEER8888",
		"20260101000000",
	)
	.unwrap();
	assert!(matches!(outcome, ApplyOutcome::IgnoredIdempotent));
	// File unchanged.
	assert_eq!(std::fs::read(tmp.path().join("note.md")).unwrap(), b"old");
}

#[test]
fn apply_inbound_ignores_when_local_wins() {
	let tmp = tempfile::tempdir().unwrap();
	std::fs::write(tmp.path().join("note.md"), b"local content").unwrap();
	let local = InboundLocalState {
		exists: true,
		hash: "local-hash".to_string(),
		mtime_ms: 200,
		lamport: 99, // very high
		origin_fp: "MY".to_string(),
	};
	let outcome = apply_inbound_update(
		tmp.path(),
		"note.md",
		b"remote content",
		"remote-hash",
		100,
		1, // low remote lamport
		"PEER",
		Some(&local),
		"PEER8888",
		"20260101000000",
	)
	.unwrap();
	assert!(matches!(outcome, ApplyOutcome::IgnoredLocalWins));
	assert_eq!(
		std::fs::read(tmp.path().join("note.md")).unwrap(),
		b"local content"
	);
}

#[test]
fn apply_inbound_saves_conflict_when_remote_wins_with_divergence() {
	let tmp = tempfile::tempdir().unwrap();
	std::fs::write(tmp.path().join("note.md"), b"local divergent").unwrap();
	let local = InboundLocalState {
		exists: true,
		hash: "local-hash".to_string(),
		mtime_ms: 100,
		lamport: 5,
		origin_fp: "MY".to_string(),
	};
	let outcome = apply_inbound_update(
		tmp.path(),
		"note.md",
		b"remote winning",
		"remote-hash",
		200,
		10,
		"PEER",
		Some(&local),
		"PEER8888",
		"20260101000000",
	)
	.unwrap();
	match outcome {
		ApplyOutcome::AppliedWithConflict { conflict_path } => {
			assert_eq!(
				std::fs::read(tmp.path().join("note.md")).unwrap(),
				b"remote winning"
			);
			assert!(conflict_path.exists());
			assert_eq!(
				std::fs::read(&conflict_path).unwrap(),
				b"local divergent"
			);
		}
		other => panic!("expected AppliedWithConflict, got {other:?}"),
	}
}

#[test]
fn apply_inbound_rejects_bad_path() {
	let tmp = tempfile::tempdir().unwrap();
	let err = apply_inbound_update(
		tmp.path(),
		"../etc/passwd",
		b"x",
		"h",
		1,
		1,
		"P",
		None,
		"P8",
		"20260101000000",
	)
	.unwrap_err();
	matches!(err, ApplyError::InvalidPath(_));
}

// ============================================================================
// apply_inbound_delete
// ============================================================================

#[test]
fn apply_delete_noop_when_local_missing() {
	let tmp = tempfile::tempdir().unwrap();
	let outcome = apply_inbound_delete(
		tmp.path(),
		"note.md",
		200,
		10,
		"PEER",
		None,
		"PEER8888",
		"20260101000000",
	)
	.unwrap();
	assert!(matches!(outcome, ApplyOutcome::IgnoredIdempotent));
}

#[test]
fn apply_delete_ignores_when_local_wins() {
	let tmp = tempfile::tempdir().unwrap();
	std::fs::write(tmp.path().join("note.md"), b"keep me").unwrap();
	let local = InboundLocalState {
		exists: true,
		hash: "local".to_string(),
		mtime_ms: 200,
		lamport: 99,
		origin_fp: "MY".to_string(),
	};
	let outcome = apply_inbound_delete(
		tmp.path(),
		"note.md",
		100,
		1,
		"PEER",
		Some(&local),
		"PEER8888",
		"20260101000000",
	)
	.unwrap();
	assert!(matches!(outcome, ApplyOutcome::IgnoredLocalWins));
	assert!(tmp.path().join("note.md").exists());
}

#[test]
fn apply_delete_saves_conflict_when_remote_wins() {
	// Tombstone wins LWW but local has unique content — must NOT be
	// destroyed silently; the local copy gets renamed to a conflict
	// sibling so the user can rescue it.
	let tmp = tempfile::tempdir().unwrap();
	std::fs::write(tmp.path().join("note.md"), b"local unique edit").unwrap();
	let local = InboundLocalState {
		exists: true,
		hash: "local".to_string(),
		mtime_ms: 100,
		lamport: 5,
		origin_fp: "MY".to_string(),
	};
	let outcome = apply_inbound_delete(
		tmp.path(),
		"note.md",
		200,
		10,
		"PEER",
		Some(&local),
		"PEER8888",
		"20260101000000",
	)
	.unwrap();
	match outcome {
		ApplyOutcome::AppliedWithConflict { conflict_path } => {
			assert!(!tmp.path().join("note.md").exists());
			assert!(conflict_path.exists());
			assert_eq!(
				std::fs::read(&conflict_path).unwrap(),
				b"local unique edit"
			);
		}
		other => panic!("expected AppliedWithConflict, got {other:?}"),
	}
}
