//! Persisted per-peer sync state: which content hash both sides last agreed
//! on (`synced`) and the last remote hash observed (`seen_remote`). Stored as
//! JSON at `<vault>/.kokobrain/sync-state.json` (same layout convention as
//! vault/index_cache.rs).

use std::collections::HashMap;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

/// Sync bookkeeping for one file relative to one peer.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct FileSyncState {
	/// SHA-256 of the last content local and remote agreed on. `None` before
	/// the first agreement.
	pub synced: Option<String>,
	/// SHA-256 of the remote version seen in the last session. Guards
	/// conflict-copy dedup: a copy is written only when this hash is new.
	pub seen_remote: Option<String>,
}

/// peer device name -> (vault-relative path -> state)
pub type SyncStateMap = HashMap<String, HashMap<String, FileSyncState>>;

/// Path of the state file inside the vault's hidden config dir.
pub fn state_file_path(vault_path: &str) -> PathBuf {
	PathBuf::from(vault_path).join(".kokobrain").join("sync-state.json")
}

/// Load the state map; missing or corrupt file yields an empty map (a lost
/// state file only means a one-time re-download/conflict-copy pass, never
/// data loss).
pub fn load_state(vault_path: &str) -> SyncStateMap {
	match std::fs::read_to_string(state_file_path(vault_path)) {
		Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
		Err(_) => SyncStateMap::default(),
	}
}

/// Persist the state map, creating `.kokobrain/` if needed.
pub fn save_state(vault_path: &str, state: &SyncStateMap) -> Result<(), String> {
	let path = state_file_path(vault_path);
	if let Some(dir) = path.parent() {
		std::fs::create_dir_all(dir).map_err(|e| format!("create .kokobrain failed: {e}"))?;
	}
	let json = serde_json::to_string_pretty(state).map_err(|e| format!("state serialize failed: {e}"))?;
	std::fs::write(&path, json).map_err(|e| format!("state write failed: {e}"))
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn load_missing_file_returns_empty_map() {
		let dir = tempfile::tempdir().unwrap();
		assert!(load_state(dir.path().to_str().unwrap()).is_empty());
	}

	#[test]
	fn save_then_load_roundtrips() {
		let dir = tempfile::tempdir().unwrap();
		let vault = dir.path().to_str().unwrap();
		let mut map = SyncStateMap::default();
		map.entry("Studio".to_string()).or_default().insert(
			"Notes/a.md".to_string(),
			FileSyncState { synced: Some("abc".into()), seen_remote: Some("def".into()) },
		);
		save_state(vault, &map).unwrap();
		assert_eq!(load_state(vault), map);
	}

	#[test]
	fn corrupt_state_file_loads_as_empty() {
		let dir = tempfile::tempdir().unwrap();
		let vault = dir.path().to_str().unwrap();
		let path = state_file_path(vault);
		std::fs::create_dir_all(path.parent().unwrap()).unwrap();
		std::fs::write(&path, "{not json").unwrap();
		assert!(load_state(vault).is_empty());
	}
}
