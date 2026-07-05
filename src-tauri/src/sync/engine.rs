//! Client side of a sync session: connect, pull subscribed folders, apply
//! the decision table, write verified downloads atomically. This is the ONLY
//! sync code that writes into the vault.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tokio::net::TcpStream;
use tokio::time::{timeout, Duration};

use crate::utils::logger::debug_log;

use super::decision::{conflict_copy_rel_path, decide, Action};
use super::manifest::{build_manifest, hash_bytes, validate_rel_path};
use super::noise::{handshake_initiator, parse_pairing_key, NoiseChannel};
use super::protocol::{FileMeta, Msg, PROTOCOL_VERSION};
use super::state::{load_state, save_state, FileSyncState};

const CONNECT_TIMEOUT: Duration = Duration::from_secs(5);
const RECV_TIMEOUT: Duration = Duration::from_secs(30);
/// Hard cap per downloaded file; a well-behaved peer never exceeds it.
const MAX_FILE_LEN: usize = 1024 * 1024 * 1024;

/// Result of one sync session, returned to the frontend.
#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncSummary {
	/// Files downloaded (new or remote-changed).
	pub downloaded: u32,
	/// New conflict copies written this session (still-diverged files whose
	/// copy already exists count as `skipped`).
	pub conflicts: u32,
	/// Files needing no action (up to date, local-only change, or known conflict).
	pub skipped: u32,
	/// Subscribed folders the peer no longer exposes.
	pub skipped_folders: Vec<String>,
	/// Per-file or per-folder failures; the sync continues past them.
	pub errors: Vec<String>,
}

/// Who to connect to and how to authenticate.
pub struct PeerTarget {
	/// `ip:port` of the peer's listener.
	pub address: String,
	/// Shared pairing key, 64 hex chars.
	pub pairing_key: String,
	/// Our device name, sent in `Hello`.
	pub local_device_name: String,
}

async fn recv(chan: &mut NoiseChannel<TcpStream>) -> Result<Msg, String> {
	timeout(RECV_TIMEOUT, chan.recv()).await.map_err(|_| "peer timed out".to_string())?
}

/// Connect + handshake + hello. Returns the channel and the peer's device name.
async fn connect(target: &PeerTarget) -> Result<(NoiseChannel<TcpStream>, String), String> {
	let psk = parse_pairing_key(&target.pairing_key)?;
	let stream = timeout(CONNECT_TIMEOUT, TcpStream::connect(&target.address))
		.await
		.map_err(|_| format!("connection to {} timed out", target.address))?
		.map_err(|e| format!("connection to {} failed: {e}", target.address))?;
	let mut chan = handshake_initiator(stream, &psk)
		.await
		.map_err(|e| format!("handshake failed (check the pairing key): {e}"))?;
	chan.send(&Msg::Hello {
		device_name: target.local_device_name.clone(),
		protocol_version: PROTOCOL_VERSION,
	})
	.await?;
	match recv(&mut chan).await.map_err(|e| format!("handshake failed (check the pairing key): {e}"))? {
		Msg::HelloAck { device_name, protocol_version } => {
			if protocol_version != PROTOCOL_VERSION {
				return Err(format!(
					"protocol version mismatch: peer {protocol_version}, local {PROTOCOL_VERSION}"
				));
			}
			Ok((chan, device_name))
		}
		Msg::Error { message } => Err(message),
		other => Err(format!("unexpected reply to Hello: {other:?}")),
	}
}

/// Fetch the peer's exposed folder list.
pub async fn list_remote_shares(target: &PeerTarget) -> Result<Vec<String>, String> {
	let (mut chan, _peer) = connect(target).await?;
	chan.send(&Msg::ListShares).await?;
	let reply = recv(&mut chan).await?;
	let _ = chan.send(&Msg::Bye).await;
	match reply {
		Msg::Shares { folders } => Ok(folders),
		Msg::Error { message } => Err(message),
		other => Err(format!("unexpected reply to ListShares: {other:?}")),
	}
}

/// Pull every subscribed folder from the peer. Writes only to this vault.
pub async fn run_sync(
	vault_path: &str,
	target: &PeerTarget,
	subscriptions: &[String],
) -> Result<SyncSummary, String> {
	let (mut chan, peer_name) = connect(target).await?;
	let mut summary = SyncSummary::default();
	let mut state_map = load_state(vault_path);
	let peer_state = state_map.entry(peer_name.clone()).or_default();

	chan.send(&Msg::ListShares).await?;
	let shares = match recv(&mut chan).await? {
		Msg::Shares { folders } => folders,
		Msg::Error { message } => return Err(message),
		other => return Err(format!("unexpected reply to ListShares: {other:?}")),
	};

	let vault_root = PathBuf::from(vault_path);
	let today = chrono::Local::now().format("%Y-%m-%d").to_string();
	for folder in subscriptions {
		if !shares.contains(folder) {
			summary.skipped_folders.push(folder.clone());
			continue;
		}
		if let Err(e) =
			sync_folder(&mut chan, &vault_root, folder, &peer_name, &today, peer_state, &mut summary).await
		{
			summary.errors.push(format!("{folder}: {e}"));
		}
	}
	let _ = chan.send(&Msg::Bye).await;
	save_state(vault_path, &state_map)?;
	debug_log(
		"SYNC",
		format!(
			"sync with '{peer_name}' done: {} downloaded, {} conflicts, {} skipped, {} errors",
			summary.downloaded,
			summary.conflicts,
			summary.skipped,
			summary.errors.len()
		),
	);
	Ok(summary)
}

async fn sync_folder(
	chan: &mut NoiseChannel<TcpStream>,
	vault_root: &Path,
	folder: &str,
	peer_name: &str,
	today: &str,
	peer_state: &mut HashMap<String, FileSyncState>,
	summary: &mut SyncSummary,
) -> Result<(), String> {
	chan.send(&Msg::GetManifest { folder: folder.to_string() }).await?;
	let mut remote_files: Vec<FileMeta> = Vec::new();
	loop {
		match recv(chan).await? {
			Msg::ManifestPage { files, done } => {
				remote_files.extend(files);
				if done {
					break;
				}
			}
			Msg::Error { message } => return Err(message),
			other => return Err(format!("unexpected reply to GetManifest: {other:?}")),
		}
	}

	// Local hashes for the same folder; empty when it doesn't exist yet.
	let local: HashMap<String, String> = if vault_root.join(folder).is_dir() {
		build_manifest(vault_root, folder)?
			.into_iter()
			.map(|f| (f.rel_path, f.sha256))
			.collect()
	} else {
		HashMap::new()
	};

	for meta in remote_files {
		let inside = meta.rel_path.starts_with(&format!("{folder}/"));
		if validate_rel_path(&meta.rel_path).is_err() || !inside {
			summary.errors.push(format!("rejected remote path: {}", meta.rel_path));
			continue;
		}
		let local_hash = local.get(&meta.rel_path).map(String::as_str);
		match decide(local_hash, &meta.sha256, peer_state.get(&meta.rel_path)) {
			Action::Download => match download_file(chan, vault_root, &meta.rel_path, &meta.rel_path).await {
				Ok(verified_hash) => {
					peer_state.insert(
						meta.rel_path.clone(),
						FileSyncState {
							synced: Some(verified_hash.clone()),
							seen_remote: Some(verified_hash),
						},
					);
					summary.downloaded += 1;
				}
				Err(e) => summary.errors.push(format!("{}: {e}", meta.rel_path)),
			},
			Action::UpToDate => {
				peer_state.insert(
					meta.rel_path.clone(),
					FileSyncState {
						synced: Some(meta.sha256.clone()),
						seen_remote: Some(meta.sha256.clone()),
					},
				);
				summary.skipped += 1;
			}
			Action::KeepLocal => {
				peer_state.entry(meta.rel_path.clone()).or_default().seen_remote = Some(meta.sha256.clone());
				summary.skipped += 1;
			}
			Action::Conflict { write_copy } => {
				if write_copy {
					let copy_rel = conflict_copy_rel_path(&meta.rel_path, peer_name, today);
					match download_file(chan, vault_root, &meta.rel_path, &copy_rel).await {
						Ok(_) => summary.conflicts += 1,
						Err(e) => summary.errors.push(format!("{}: {e}", meta.rel_path)),
					}
				} else {
					summary.skipped += 1;
				}
				peer_state.entry(meta.rel_path.clone()).or_default().seen_remote = Some(meta.sha256.clone());
			}
		}
	}
	Ok(())
}

/// Request `src_rel` from the peer and write it to `dest_rel` (same path for
/// normal downloads, the conflict-copy path for conflicts). Returns the
/// verified content hash — `FileEnd` is authoritative, not the manifest,
/// because the file may change between the two requests.
async fn download_file(
	chan: &mut NoiseChannel<TcpStream>,
	vault_root: &Path,
	src_rel: &str,
	dest_rel: &str,
) -> Result<String, String> {
	chan.send(&Msg::GetFile { rel_path: src_rel.to_string() }).await?;
	let mut bytes: Vec<u8> = Vec::new();
	loop {
		match recv(chan).await? {
			Msg::FileChunk { data } => {
				if bytes.len() + data.len() > MAX_FILE_LEN {
					return Err("file exceeds size limit".to_string());
				}
				bytes.extend_from_slice(&data);
			}
			Msg::FileEnd { sha256 } => {
				if hash_bytes(&bytes) != sha256 {
					return Err("hash mismatch after transfer".to_string());
				}
				write_atomic(vault_root, dest_rel, &bytes)?;
				return Ok(sha256);
			}
			Msg::Error { message } => return Err(message),
			other => return Err(format!("unexpected reply to GetFile: {other:?}")),
		}
	}
}

/// Write to a dot-prefixed temp file in the destination dir, then rename.
/// The vault never sees a half-written file, and the temp name is hidden
/// from sync itself (dot-prefixed).
fn write_atomic(vault_root: &Path, rel_path: &str, bytes: &[u8]) -> Result<(), String> {
	let dest = vault_root.join(rel_path);
	let dir = dest.parent().ok_or_else(|| "invalid destination".to_string())?;
	std::fs::create_dir_all(dir).map_err(|e| format!("create dir failed: {e}"))?;
	let tmp = dir.join(format!(".sync-tmp-{}", uuid::Uuid::new_v4()));
	std::fs::write(&tmp, bytes).map_err(|e| format!("write failed: {e}"))?;
	std::fs::rename(&tmp, &dest).map_err(|e| {
		let _ = std::fs::remove_file(&tmp);
		format!("rename failed: {e}")
	})
}
