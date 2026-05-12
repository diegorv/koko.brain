//! Manifest diffing for LAN sync.
//!
//! Compares a local manifest against a peer's manifest and produces a
//! [`DiffEntry`] per path the two sides disagree on. The actual
//! conflict resolution (`apply_inbound_update`, atomic writes,
//! conflict file generation) lands in the next commit; this file is
//! the pure, deterministic engine that decides who needs which bytes.

use std::collections::BTreeMap;

use crate::sync::protocol::ManifestEntry;

/// Outcome of comparing a single path across two manifests.
///
/// "Winner" is decided by the LWW rule:
/// `(lamport, mtime_ms)` tuple lexicographic — Lamport first, mtime as
/// a tiebreaker. If both fingerprints match all four fields, no diff
/// is emitted (idempotent no-op).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DiffEntry {
	/// Path exists remotely but not locally — pull it.
	AddedRemote(ManifestEntry),
	/// Path exists locally but not remotely — push it.
	AddedLocal(ManifestEntry),
	/// Path exists on both sides; the remote version wins under LWW.
	RemoteWins(ManifestEntry),
	/// Path exists on both sides; the local version wins under LWW.
	LocalWins(ManifestEntry),
}

/// Compares `local` against `remote` and returns the set of actions
/// needed to converge. Both inputs are full manifests for a single
/// share. Order in the output is by `path_rel` ascending for
/// determinism.
pub fn diff_manifests(
	local: &[ManifestEntry],
	remote: &[ManifestEntry],
) -> Vec<DiffEntry> {
	let local_map: BTreeMap<&str, &ManifestEntry> =
		local.iter().map(|e| (e.path_rel.as_str(), e)).collect();
	let remote_map: BTreeMap<&str, &ManifestEntry> =
		remote.iter().map(|e| (e.path_rel.as_str(), e)).collect();

	let mut out: Vec<DiffEntry> = Vec::new();
	// Iterate the union of paths in sorted order.
	let mut all_paths: Vec<&str> = local_map.keys().copied().collect();
	for p in remote_map.keys() {
		if !local_map.contains_key(p) {
			all_paths.push(p);
		}
	}
	all_paths.sort();

	for path in all_paths {
		match (local_map.get(path), remote_map.get(path)) {
			(None, Some(r)) => out.push(DiffEntry::AddedRemote((*r).clone())),
			(Some(l), None) => out.push(DiffEntry::AddedLocal((*l).clone())),
			(Some(l), Some(r)) => {
				if entries_equal(l, r) {
					continue;
				}
				match lww_winner(l, r) {
					Winner::Remote => out.push(DiffEntry::RemoteWins((*r).clone())),
					Winner::Local => out.push(DiffEntry::LocalWins((*l).clone())),
				}
			}
			(None, None) => unreachable!(),
		}
	}
	out
}

/// Returns `true` if `local` and `remote` agree on everything that
/// would otherwise drive a sync action (kind, hash, size). Lamport
/// and mtime drift below the hash level is intentionally ignored.
fn entries_equal(local: &ManifestEntry, remote: &ManifestEntry) -> bool {
	local.kind == remote.kind
		&& local.size == remote.size
		&& local.sha256_hash == remote.sha256_hash
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Winner {
	Local,
	Remote,
}

/// LWW: lexicographic on `(lamport, mtime_ms)`. Ties broken by
/// `origin_fingerprint` lexicographic (deterministic across runs).
fn lww_winner(local: &ManifestEntry, remote: &ManifestEntry) -> Winner {
	match (remote.lamport, remote.mtime_ms).cmp(&(local.lamport, local.mtime_ms)) {
		std::cmp::Ordering::Greater => Winner::Remote,
		std::cmp::Ordering::Less => Winner::Local,
		std::cmp::Ordering::Equal => {
			if remote.origin_fingerprint > local.origin_fingerprint {
				Winner::Remote
			} else {
				Winner::Local
			}
		}
	}
}

/// Page slicing for `AppMsg::Manifest`. Returns the manifest split
/// into chunks of up to `chunk_size` entries; the last chunk carries
/// `is_last_page = true` so the receiver knows when to stop waiting.
pub fn paginate_manifest(
	entries: Vec<ManifestEntry>,
	chunk_size: usize,
) -> Vec<(Vec<ManifestEntry>, bool)> {
	if entries.is_empty() {
		return vec![(vec![], true)];
	}
	let chunk_size = chunk_size.max(1);
	let mut out = Vec::new();
	let total = entries.len();
	let mut iter = entries.into_iter();
	let mut emitted = 0;
	while emitted < total {
		let take = chunk_size.min(total - emitted);
		let mut chunk = Vec::with_capacity(take);
		for _ in 0..take {
			chunk.push(iter.next().unwrap());
		}
		emitted += take;
		let is_last = emitted == total;
		out.push((chunk, is_last));
	}
	out
}
