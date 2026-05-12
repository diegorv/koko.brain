//! Per-vault TOFU trust store for LAN sync (`peers.json`).
//!
//! Each vault keeps the set of devices the user has paired with under
//! `<vault>/.kokobrain/peers.json`. The file is plain JSON, written
//! atomically (temp + rename) and on Unix is `chmod 0600` so other users
//! on the same machine cannot read the public-key catalogue.
//!
//! The MVP only stores public material — Ed25519 verifying keys, the
//! display fingerprint, and a friendly name. Long-term shared secrets
//! (session keys, channel binders) live elsewhere; this file is enough
//! to recognise a previously trusted device on reconnect.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::{Deserialize, Serialize};

/// Length of an Ed25519 public key, in bytes. Matches
/// `ed25519_dalek::PUBLIC_KEY_LENGTH`.
const PUBLIC_KEY_LEN: usize = 32;

/// One trusted peer record persisted in `peers.json`.
///
/// All fields are public material — safe to copy across devices for
/// debugging. The `fingerprint_hex` field is the stable primary key:
/// upserts replace any existing record with the same value.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrustedPeer {
	/// First 16 hex chars (lowercase) of `SHA-256(public_key)`. Stable
	/// primary key for upsert / remove operations.
	pub fingerprint_hex: String,
	/// Six BIP-39 English words separated by `-`, derived from the same
	/// public key. Persisted so the UI can render the human form without
	/// re-computing it on every load.
	pub fingerprint_display: String,
	/// Base64-encoded Ed25519 public key (exactly 32 bytes when decoded).
	/// Records whose `public_key_b64` does not decode to 32 bytes are
	/// silently skipped by [`load`].
	pub public_key_b64: String,
	/// Optional user-set display name. `None` until the user customises
	/// the peer in the UI.
	pub display_name: Option<String>,
	/// Wall-clock timestamp (Unix epoch, milliseconds) when the peer was
	/// first trusted. The caller picks the source; this module never
	/// rewrites it on upsert.
	pub trusted_at_ms: u64,
}

/// Returns the absolute path where `peers.json` lives for the given
/// `vault_root`: `<vault_root>/.kokobrain/peers.json`. Does not touch
/// the filesystem.
pub fn peers_path(vault_root: &Path) -> PathBuf {
	vault_root.join(".kokobrain").join("peers.json")
}

/// Loads the trust store for `vault_root`. Returns an empty list if the
/// file does not exist yet (a brand-new vault has trusted no one).
///
/// Records whose `public_key_b64` does not decode to exactly
/// [`PUBLIC_KEY_LEN`] bytes are skipped and an `eprintln!` warning is
/// emitted; the rest of the file is still parsed. JSON parse errors on
/// the whole document propagate via [`io::ErrorKind::InvalidData`].
pub fn load(vault_root: &Path) -> io::Result<Vec<TrustedPeer>> {
	let path = peers_path(vault_root);
	if !path.exists() {
		return Ok(Vec::new());
	}
	let raw = fs::read(&path)?;
	let parsed: Vec<TrustedPeer> = serde_json::from_slice(&raw)
		.map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;
	let mut out = Vec::with_capacity(parsed.len());
	for peer in parsed {
		match BASE64.decode(peer.public_key_b64.as_bytes()) {
			Ok(bytes) if bytes.len() == PUBLIC_KEY_LEN => out.push(peer),
			Ok(bytes) => {
				eprintln!(
					"[sync::trust] skipping peer {}: public key has {} bytes, expected {}",
					peer.fingerprint_hex,
					bytes.len(),
					PUBLIC_KEY_LEN
				);
			}
			Err(e) => {
				eprintln!(
					"[sync::trust] skipping peer {}: invalid base64 ({})",
					peer.fingerprint_hex, e
				);
			}
		}
	}
	Ok(out)
}

/// Persists `peers` to `peers.json` for the given `vault_root`.
///
/// Writes go through a sibling `.tmp` file then `rename` so a crash
/// mid-write never leaves a half-written file. On Unix the destination
/// is `chmod 0600`. The parent `.kokobrain/` directory is created on
/// demand.
pub fn save(vault_root: &Path, peers: &[TrustedPeer]) -> io::Result<()> {
	let path = peers_path(vault_root);
	if let Some(parent) = path.parent() {
		if !parent.as_os_str().is_empty() {
			fs::create_dir_all(parent)?;
		}
	}
	let json = serde_json::to_vec_pretty(peers)
		.map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;
	let tmp_path = temp_path_for(&path);
	if let Err(e) = write_with_perms(&tmp_path, &json) {
		let _ = fs::remove_file(&tmp_path);
		return Err(e);
	}
	if let Err(e) = fs::rename(&tmp_path, &path) {
		let _ = fs::remove_file(&tmp_path);
		return Err(e);
	}
	Ok(())
}

/// Inserts `peer` into the trust store, replacing any existing record
/// with the same `fingerprint_hex`.
///
/// Persists the updated list via [`save`] and returns the full list as
/// stored. The order of existing entries is preserved; new entries are
/// appended.
pub fn upsert(vault_root: &Path, peer: TrustedPeer) -> io::Result<Vec<TrustedPeer>> {
	let mut peers = load(vault_root)?;
	match peers.iter().position(|p| p.fingerprint_hex == peer.fingerprint_hex) {
		Some(idx) => peers[idx] = peer,
		None => peers.push(peer),
	}
	save(vault_root, &peers)?;
	Ok(peers)
}

/// Removes the peer whose `fingerprint_hex` matches `fingerprint_hex`,
/// persists, and returns the updated list.
///
/// No-op (other than a re-write to disk) when no entry matches.
pub fn remove(vault_root: &Path, fingerprint_hex: &str) -> io::Result<Vec<TrustedPeer>> {
	let mut peers = load(vault_root)?;
	peers.retain(|p| p.fingerprint_hex != fingerprint_hex);
	save(vault_root, &peers)?;
	Ok(peers)
}

/// Builds the sibling temp path used by the atomic-write flow. Same
/// directory + same filename + `.tmp` suffix.
fn temp_path_for(path: &Path) -> PathBuf {
	let mut tmp = path.as_os_str().to_owned();
	tmp.push(".tmp");
	PathBuf::from(tmp)
}

/// Writes `bytes` to `path` and applies 0600 permissions on Unix.
fn write_with_perms(path: &Path, bytes: &[u8]) -> io::Result<()> {
	fs::write(path, bytes)?;
	#[cfg(unix)]
	{
		use std::os::unix::fs::PermissionsExt;
		let mut perms = fs::metadata(path)?.permissions();
		perms.set_mode(0o600);
		fs::set_permissions(path, perms)?;
	}
	Ok(())
}
