use kokobrain_lib::sync::protocol::{EntryKind, ManifestEntry};
use kokobrain_lib::sync::sync_engine::{diff_manifests, paginate_manifest, DiffEntry};

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
