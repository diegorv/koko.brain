//! Boot-time on/off flag for the MCP server.
//!
//! `crate::mcp::start` is spawned inside `tauri::Builder::setup()`, long
//! before any vault is selected or `.kokobrain/settings.json` is read.
//! The user-facing toggle therefore cannot live in the per-vault settings
//! file alone — Rust needs a source it can consult during `setup()`. The
//! mirror file written here serves that purpose:
//!
//! - Location: `<app_config_dir>/mcp.json`
//! - Shape: `{ "enabled": bool }`
//! - Missing / unreadable / unparseable → defaults to `false` so a fresh
//!   install does not silently expose the MCP server; the user must
//!   opt in via the in-app toggle.
//!
//! The frontend writes the mirror via the `set_mcp_enabled` IPC command
//! every time the in-app toggle flips, so the flag observed at boot is
//! always whatever the user last picked. The per-vault `AppSettings.mcp`
//! field still drives the UI; this file is only the boot-time consultable
//! copy.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// Filename of the mirror inside `app_config_dir`.
const MCP_CONFIG_FILE: &str = "mcp.json";

/// On-disk shape of `<app_config_dir>/mcp.json`.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct McpConfigFile {
	enabled: bool,
}

/// Resolves the absolute path of the mirror file inside `config_dir`.
pub fn mirror_path(config_dir: &Path) -> PathBuf {
	config_dir.join(MCP_CONFIG_FILE)
}

/// Reads the mirror file and returns whether MCP should boot.
///
/// Returns `false` for every failure mode (missing, unreadable, malformed
/// JSON) so a fresh install does not silently boot the MCP server. Only
/// an explicit `{ "enabled": true }` enables it.
pub fn is_mcp_enabled(config_dir: &Path) -> bool {
	let path = mirror_path(config_dir);
	let raw = match fs::read_to_string(&path) {
		Ok(s) => s,
		Err(_) => return false,
	};
	match serde_json::from_str::<McpConfigFile>(&raw) {
		Ok(cfg) => cfg.enabled,
		Err(_) => false,
	}
}

/// Persists the mirror file with `enabled`. Creates `config_dir` if it
/// does not exist yet. Returned errors are propagated to the frontend
/// via the `set_mcp_enabled` Tauri command.
pub fn write_mcp_enabled(config_dir: &Path, enabled: bool) -> io::Result<()> {
	fs::create_dir_all(config_dir)?;
	let payload = McpConfigFile { enabled };
	let serialized = serde_json::to_string_pretty(&payload)
		.map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;
	fs::write(mirror_path(config_dir), serialized)
}

#[cfg(test)]
mod tests {
	use super::*;
	use tempfile::tempdir;

	#[test]
	fn defaults_to_disabled_when_file_missing() {
		let dir = tempdir().unwrap();
		assert!(!is_mcp_enabled(dir.path()));
	}

	#[test]
	fn reads_enabled_false_when_persisted() {
		let dir = tempdir().unwrap();
		write_mcp_enabled(dir.path(), false).unwrap();
		assert!(!is_mcp_enabled(dir.path()));
	}

	#[test]
	fn reads_enabled_true_when_persisted() {
		let dir = tempdir().unwrap();
		write_mcp_enabled(dir.path(), true).unwrap();
		assert!(is_mcp_enabled(dir.path()));
	}

	#[test]
	fn defaults_to_disabled_when_file_corrupt() {
		let dir = tempdir().unwrap();
		std::fs::write(mirror_path(dir.path()), "{ not json ").unwrap();
		assert!(!is_mcp_enabled(dir.path()));
	}

	#[test]
	fn write_creates_missing_parent_dir() {
		let dir = tempdir().unwrap();
		let nested = dir.path().join("nested").join("config");
		write_mcp_enabled(&nested, false).unwrap();
		assert!(!is_mcp_enabled(&nested));
	}
}
