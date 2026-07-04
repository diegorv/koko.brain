//! Pure conflict-resolution logic: the decision table from the spec plus
//! conflict-copy naming. No I/O — exhaustively unit-tested.

use super::state::FileSyncState;

/// What the engine should do with one remote file.
#[derive(Debug, PartialEq)]
pub enum Action {
	/// Take the remote version.
	Download,
	/// Hashes match; just record agreement.
	UpToDate,
	/// Only local changed; the peer picks it up when it pulls.
	KeepLocal,
	/// Both changed: keep local. `write_copy` = save the remote version as a
	/// conflict copy (false when this remote hash was already seen).
	Conflict { write_copy: bool },
}

/// Decide the action for one file. `local` is `None` when the file does not
/// exist locally; `state` is `None` on first contact with this path.
pub fn decide(local: Option<&str>, remote: &str, state: Option<&FileSyncState>) -> Action {
	let Some(local) = local else {
		return Action::Download;
	};
	if local == remote {
		return Action::UpToDate;
	}
	let synced = state.and_then(|s| s.synced.as_deref());
	if synced == Some(local) {
		return Action::Download;
	}
	if synced == Some(remote) {
		return Action::KeepLocal;
	}
	let seen = state.and_then(|s| s.seen_remote.as_deref());
	Action::Conflict { write_copy: seen != Some(remote) }
}

/// `Notes/a.md` + peer `Studio` + `2026-07-03` ->
/// `Notes/a (conflict from Studio 2026-07-03).md`. The peer name is
/// sanitized so it can never introduce path separators.
pub fn conflict_copy_rel_path(rel_path: &str, peer: &str, date: &str) -> String {
	let peer: String = peer
		.chars()
		.map(|c| if c == '/' || c == '\\' || c == ':' { '-' } else { c })
		.collect();
	let (dir, name) = match rel_path.rsplit_once('/') {
		Some((d, n)) => (Some(d), n),
		None => (None, rel_path),
	};
	let renamed = match name.rsplit_once('.') {
		Some((stem, ext)) if !stem.is_empty() => {
			format!("{stem} (conflict from {peer} {date}).{ext}")
		}
		_ => format!("{name} (conflict from {peer} {date})"),
	};
	match dir {
		Some(d) => format!("{d}/{renamed}"),
		None => renamed,
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::sync::state::FileSyncState;

	fn st(synced: Option<&str>, seen: Option<&str>) -> FileSyncState {
		FileSyncState {
			synced: synced.map(String::from),
			seen_remote: seen.map(String::from),
		}
	}

	#[test]
	fn row1_no_local_file_downloads() {
		assert_eq!(decide(None, "r1", None), Action::Download);
	}

	#[test]
	fn row2_identical_hashes_up_to_date() {
		assert_eq!(decide(Some("h"), "h", Some(&st(Some("old"), None))), Action::UpToDate);
	}

	#[test]
	fn row3_only_remote_changed_downloads() {
		assert_eq!(decide(Some("base"), "r2", Some(&st(Some("base"), Some("base")))), Action::Download);
	}

	#[test]
	fn row4_only_local_changed_keeps_local() {
		assert_eq!(decide(Some("l2"), "base", Some(&st(Some("base"), Some("base")))), Action::KeepLocal);
	}

	#[test]
	fn row5_both_changed_conflicts_with_copy() {
		assert_eq!(
			decide(Some("l2"), "r2", Some(&st(Some("base"), Some("base")))),
			Action::Conflict { write_copy: true }
		);
	}

	#[test]
	fn row5_repeat_sync_does_not_duplicate_copy() {
		assert_eq!(
			decide(Some("l2"), "r2", Some(&st(Some("base"), Some("r2")))),
			Action::Conflict { write_copy: false }
		);
	}

	#[test]
	fn first_sync_with_differing_local_is_conflict_with_copy() {
		assert_eq!(decide(Some("l1"), "r1", None), Action::Conflict { write_copy: true });
	}

	#[test]
	fn conflict_copy_naming() {
		assert_eq!(
			conflict_copy_rel_path("Notes/a.md", "Studio", "2026-07-03"),
			"Notes/a (conflict from Studio 2026-07-03).md"
		);
		assert_eq!(
			conflict_copy_rel_path("noext", "Studio", "2026-07-03"),
			"noext (conflict from Studio 2026-07-03)"
		);
		assert_eq!(
			conflict_copy_rel_path("dir.v1/f.md", "Studio", "2026-07-03"),
			"dir.v1/f (conflict from Studio 2026-07-03).md"
		);
		// peer names never inject path separators
		assert_eq!(
			conflict_copy_rel_path("a.md", "evil/../peer", "2026-07-03"),
			"a (conflict from evil-..-peer 2026-07-03).md"
		);
	}
}
