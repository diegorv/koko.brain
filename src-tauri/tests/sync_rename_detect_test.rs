use kokobrain_lib::sync::rename_detect::{detect_renames, SyncEvent};

fn created(path: &str, hash: &str) -> SyncEvent {
	SyncEvent::Created {
		path: path.to_string(),
		hash: hash.to_string(),
	}
}

fn modified(path: &str, hash: &str) -> SyncEvent {
	SyncEvent::Modified {
		path: path.to_string(),
		hash: hash.to_string(),
	}
}

fn deleted(path: &str, prior_hash: &str) -> SyncEvent {
	SyncEvent::Deleted {
		path: path.to_string(),
		prior_hash: prior_hash.to_string(),
	}
}

#[test]
fn empty_window_returns_empty() {
	assert!(detect_renames(vec![]).is_empty());
}

#[test]
fn rename_collapses_delete_create_pair() {
	let events = vec![
		deleted("foo.md", "H1"),
		created("bar.md", "H1"),
	];
	let out = detect_renames(events);
	assert_eq!(out.len(), 1);
	match &out[0] {
		SyncEvent::Renamed { from, to, hash } => {
			assert_eq!(from, "foo.md");
			assert_eq!(to, "bar.md");
			assert_eq!(hash, "H1");
		}
		other => panic!("expected Renamed, got {other:?}"),
	}
}

#[test]
fn rename_collapses_pair_when_create_comes_first() {
	// notify sometimes orders events the other way (Create then
	// Delete). The detector should still pair them.
	let events = vec![
		created("bar.md", "H1"),
		deleted("foo.md", "H1"),
	];
	let out = detect_renames(events);
	assert_eq!(out.len(), 1);
	matches!(out[0], SyncEvent::Renamed { .. });
}

#[test]
fn delete_without_matching_create_passes_through() {
	let events = vec![deleted("foo.md", "H1")];
	let out = detect_renames(events);
	assert_eq!(out.len(), 1);
	matches!(out[0], SyncEvent::Deleted { .. });
}

#[test]
fn create_without_matching_delete_passes_through() {
	let events = vec![created("foo.md", "H1")];
	let out = detect_renames(events);
	assert_eq!(out.len(), 1);
	matches!(out[0], SyncEvent::Created { .. });
}

#[test]
fn modified_events_are_left_alone() {
	let events = vec![
		modified("a.md", "H1"),
		modified("b.md", "H2"),
	];
	let out = detect_renames(events);
	assert_eq!(out.len(), 2);
	for ev in &out {
		matches!(ev, SyncEvent::Modified { .. });
	}
}

#[test]
fn create_and_delete_at_same_path_are_not_a_rename() {
	// `foo.md` is deleted then recreated with the same content: this
	// is a "save / re-save" sequence, not a rename.
	let events = vec![
		deleted("foo.md", "H1"),
		created("foo.md", "H1"),
	];
	let out = detect_renames(events);
	assert_eq!(out.len(), 2, "same-path pair must not collapse to rename");
}

#[test]
fn delete_with_empty_prior_hash_does_not_pair() {
	// We never observed the file before — no way to correlate.
	let events = vec![
		deleted("foo.md", ""),
		created("bar.md", "H1"),
	];
	let out = detect_renames(events);
	assert_eq!(out.len(), 2);
}

#[test]
fn create_with_empty_hash_does_not_pair() {
	let events = vec![
		deleted("foo.md", "H1"),
		created("bar.md", ""),
	];
	let out = detect_renames(events);
	assert_eq!(out.len(), 2);
}

#[test]
fn unrelated_files_with_same_hash_collapse_to_rename() {
	// Documented edge case: two files genuinely sharing the same hash
	// AND in the same window WILL collapse. The receiver's
	// fs::rename + watcher tick recovers state on the next round,
	// so this is acceptable in exchange for the simpler heuristic.
	let events = vec![
		deleted("foo.md", "SAME"),
		created("bar.md", "SAME"),
	];
	let out = detect_renames(events);
	matches!(out[0], SyncEvent::Renamed { .. });
}

#[test]
fn multiple_renames_match_in_order() {
	// Two renames in one batch — each Create finds its own Delete.
	let events = vec![
		deleted("a.md", "HA"),
		deleted("b.md", "HB"),
		created("a2.md", "HA"),
		created("b2.md", "HB"),
	];
	let out = detect_renames(events);
	let renamed: Vec<_> = out
		.iter()
		.filter_map(|e| match e {
			SyncEvent::Renamed { from, to, .. } => Some((from.as_str(), to.as_str())),
			_ => None,
		})
		.collect();
	assert!(renamed.contains(&("a.md", "a2.md")));
	assert!(renamed.contains(&("b.md", "b2.md")));
}

#[test]
fn rename_preserves_unrelated_modify_events() {
	let events = vec![
		modified("untouched.md", "HX"),
		deleted("foo.md", "H1"),
		created("bar.md", "H1"),
		modified("other.md", "HY"),
	];
	let out = detect_renames(events);
	assert_eq!(out.len(), 3, "1 modified + 1 renamed + 1 modified");
	assert!(matches!(out[0], SyncEvent::Modified { .. }));
	assert!(matches!(out[1], SyncEvent::Renamed { .. }));
	assert!(matches!(out[2], SyncEvent::Modified { .. }));
}

#[test]
fn one_delete_only_pairs_with_one_create() {
	// One Delete and two Creates with the same hash: only the first
	// Create in order pairs up.
	let events = vec![
		deleted("foo.md", "H1"),
		created("first.md", "H1"),
		created("second.md", "H1"),
	];
	let out = detect_renames(events);
	let mut renames = 0;
	let mut creates = 0;
	for ev in &out {
		match ev {
			SyncEvent::Renamed { .. } => renames += 1,
			SyncEvent::Created { .. } => creates += 1,
			_ => {}
		}
	}
	assert_eq!(renames, 1);
	assert_eq!(creates, 1);
}

#[test]
fn already_renamed_event_passes_through() {
	let events = vec![SyncEvent::Renamed {
		from: "a.md".to_string(),
		to: "b.md".to_string(),
		hash: "H1".to_string(),
	}];
	let out = detect_renames(events);
	assert_eq!(out.len(), 1);
	matches!(out[0], SyncEvent::Renamed { .. });
}
