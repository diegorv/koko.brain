//! Rename detection over a sliding window of file events.
//!
//! The watcher emits raw `Created` / `Modified` / `Deleted` events as
//! `notify` produces them. Without rename detection, a user-driven
//! `mv foo.md bar.md` becomes `Delete(foo)` + `PushUpdate(bar)` on the
//! wire — the receiver re-downloads the full content and `foo.md`'s
//! file_history breaks. We can do better by correlating events that
//! share a content hash: a `Delete(foo, hash=H)` immediately followed
//! by a `Create(bar, hash=H)` is, with high probability, a rename.
//!
//! This module is the pure correlation step. The async watcher
//! consumer (Task 13) buffers events for a short window (200ms) and
//! hands the batch to [`detect_renames`]; the output replaces matching
//! Delete/Create pairs with a single [`SyncEvent::Renamed`].
//!
//! Edge case: when two unrelated files happen to have the same content
//! hash AND both happen in the same window, the heuristic produces a
//! false rename. That is acceptable because (a) the resulting on-disk
//! state after the receiver applies `fs::rename` is correct (the
//! source path ends up empty after the matching `Create` is processed)
//! and (b) the cost is one extra round-trip on the next watcher tick
//! when the empty source path is re-deleted.

/// A single event in the watcher window. Hash is the SHA-256 of the
/// current content (file events) or empty (delete-only) — same source
/// the sync engine already computes for the manifest.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SyncEvent {
	Created { path: String, hash: String },
	Modified { path: String, hash: String },
	Deleted { path: String, prior_hash: String },
	Renamed { from: String, to: String, hash: String },
}

impl SyncEvent {
	pub fn path(&self) -> &str {
		match self {
			Self::Created { path, .. } => path,
			Self::Modified { path, .. } => path,
			Self::Deleted { path, .. } => path,
			Self::Renamed { to, .. } => to,
		}
	}
}

/// Walks the input events, collapses adjacent Delete/Create pairs that
/// share a non-empty hash into a single `Renamed`. Order is preserved
/// otherwise. Returns a new Vec so the caller can keep its untouched
/// window for diagnostics.
///
/// The matching is one-to-one within a single window: each `Delete`
/// matches at most one `Create`, and vice versa, with `prior_hash`
/// vs. `hash` equality as the only correlation signal. Events whose
/// hash is empty (e.g. a file deleted before we ever scanned it) are
/// never candidates.
pub fn detect_renames(events: Vec<SyncEvent>) -> Vec<SyncEvent> {
	let mut consumed_deletes = vec![false; events.len()];
	let mut consumed_creates = vec![false; events.len()];
	let mut rename_at_create: Vec<Option<(String, String)>> = vec![None; events.len()];

	// First pass: walk Create events in order, pair each with the
	// first unconsumed matching Delete (by hash, different path).
	// Index Deletes by hash for efficient lookup.
	let mut deletes_by_hash: std::collections::HashMap<String, Vec<usize>> =
		std::collections::HashMap::new();
	for (i, ev) in events.iter().enumerate() {
		if let SyncEvent::Deleted { prior_hash, .. } = ev {
			if !prior_hash.is_empty() {
				deletes_by_hash
					.entry(prior_hash.clone())
					.or_default()
					.push(i);
			}
		}
	}

	for (i, ev) in events.iter().enumerate() {
		if let SyncEvent::Created { path, hash } = ev {
			if hash.is_empty() {
				continue;
			}
			let candidates = match deletes_by_hash.get(hash) {
				Some(c) => c,
				None => continue,
			};
			for &del_idx in candidates {
				if consumed_deletes[del_idx] {
					continue;
				}
				let from = match &events[del_idx] {
					SyncEvent::Deleted { path, .. } => path,
					_ => unreachable!(),
				};
				if from == path {
					// Same path → not a rename. Don't consume the delete;
					// the user may have done save → re-save.
					continue;
				}
				consumed_deletes[del_idx] = true;
				consumed_creates[i] = true;
				rename_at_create[i] = Some((from.clone(), path.clone()));
				break;
			}
		}
	}

	// Second pass: emit output. Skip consumed deletes; replace consumed
	// creates with the corresponding Renamed; leave everything else
	// untouched.
	let mut out: Vec<SyncEvent> = Vec::with_capacity(events.len());
	for (i, ev) in events.into_iter().enumerate() {
		match &ev {
			SyncEvent::Deleted { .. } if consumed_deletes[i] => continue,
			SyncEvent::Created { hash, .. } if consumed_creates[i] => {
				let (from, to) = rename_at_create[i].clone().unwrap();
				out.push(SyncEvent::Renamed {
					from,
					to,
					hash: hash.clone(),
				});
			}
			_ => out.push(ev),
		}
	}
	out
}
