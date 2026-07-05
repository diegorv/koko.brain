//! Read-only sync listener. Accepts one peer session at a time, runs the
//! Noise responder handshake, and serves shares/manifests/files from the
//! exposed folders. Never writes to the vault.

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tokio::net::{TcpListener, TcpStream};
use tokio::sync::watch;
use tokio::time::{timeout, Duration};

use crate::utils::logger::debug_log;

use super::manifest::{build_manifest, hash_bytes, validate_rel_path};
use super::noise::{handshake_responder, NoiseChannel};
use super::protocol::{Msg, FILE_CHUNK_LEN, MANIFEST_PAGE_LEN, PROTOCOL_VERSION};

/// Max time for the Noise handshake before an unauthenticated connection is dropped.
const HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(10);
/// Max idle time waiting for the next request before the session is dropped.
const RECV_TIMEOUT: Duration = Duration::from_secs(30);

/// Config snapshot the listener serves from. Rebuilt on every start; the
/// frontend restarts the listener to apply exposure changes.
#[derive(Clone)]
pub struct ServerConfig {
	/// Absolute vault root.
	pub vault_path: String,
	/// Name reported to the peer in `HelloAck`.
	pub device_name: String,
	/// Parsed pairing key.
	pub psk: [u8; 32],
	/// Vault-relative folders the peer may read.
	pub exposed_folders: Vec<String>,
}

/// Handle to a running listener.
pub struct RunningServer {
	/// Actually bound port (differs from the requested port when it was 0).
	pub port: u16,
	shutdown: watch::Sender<bool>,
}

impl RunningServer {
	/// Signal the accept loop to exit and drop the listening socket.
	pub fn stop(self) {
		let _ = self.shutdown.send(true);
	}
}

/// Tauri managed state: the currently running listener, if any.
#[derive(Default)]
pub struct SyncServerState(pub Mutex<Option<RunningServer>>);

/// Bind `0.0.0.0:port` (0 = ephemeral) and spawn the accept loop.
pub async fn start_server(config: ServerConfig, port: u16) -> Result<RunningServer, String> {
	let listener = TcpListener::bind(("0.0.0.0", port))
		.await
		.map_err(|e| format!("bind on port {port} failed: {e}"))?;
	let port = listener.local_addr().map_err(|e| format!("local_addr failed: {e}"))?.port();
	let (tx, mut rx) = watch::channel(false);
	tokio::spawn(async move {
		loop {
			tokio::select! {
				// Fires on stop() and also when RunningServer is dropped
				// (sender closed) — either way the loop must exit.
				_ = rx.changed() => break,
				accepted = listener.accept() => {
					let Ok((stream, addr)) = accepted else { continue };
					debug_log("SYNC", format!("peer connected from {addr}"));
					// One session at a time, but shutdown must stay
					// responsive: race the session against the shutdown
					// signal. Dropping the session future closes the socket.
					tokio::select! {
						_ = rx.changed() => break,
						result = serve_connection(stream, &config) => {
							if let Err(e) = result {
								debug_log("SYNC", format!("session ended with error: {e}"));
							}
						}
					}
				}
			}
		}
		debug_log("SYNC", "listener stopped".to_string());
	});
	Ok(RunningServer { port, shutdown: tx })
}

async fn serve_connection(stream: TcpStream, config: &ServerConfig) -> Result<(), String> {
	let mut chan = timeout(HANDSHAKE_TIMEOUT, handshake_responder(stream, &config.psk))
		.await
		.map_err(|_| "handshake timed out".to_string())??;
	let hello = timeout(RECV_TIMEOUT, chan.recv()).await.map_err(|_| "peer timed out".to_string())??;
	let Msg::Hello { protocol_version, device_name } = hello else {
		return Err("expected Hello".to_string());
	};
	if protocol_version != PROTOCOL_VERSION {
		let _ = chan
			.send(&Msg::Error {
				message: format!("protocol version mismatch: peer {protocol_version}, local {PROTOCOL_VERSION}"),
			})
			.await;
		return Err("protocol version mismatch".to_string());
	}
	debug_log("SYNC", format!("session started with peer '{device_name}'"));
	chan.send(&Msg::HelloAck {
		device_name: config.device_name.clone(),
		protocol_version: PROTOCOL_VERSION,
	})
	.await?;

	let vault_root = PathBuf::from(&config.vault_path);
	loop {
		// A recv error or timeout here just means the peer hung up (or went
		// silent) — normal end.
		let Ok(Ok(msg)) = timeout(RECV_TIMEOUT, chan.recv()).await else { return Ok(()) };
		match msg {
			Msg::ListShares => {
				let folders: Vec<String> = config
					.exposed_folders
					.iter()
					.filter(|f| validate_rel_path(f).is_ok() && vault_root.join(f.as_str()).is_dir())
					.cloned()
					.collect();
				chan.send(&Msg::Shares { folders }).await?;
			}
			Msg::GetManifest { folder } => {
				if !config.exposed_folders.contains(&folder) {
					chan.send(&Msg::Error { message: format!("folder not shared: {folder}") }).await?;
					continue;
				}
				match build_manifest(&vault_root, &folder) {
					Ok(files) => {
						if files.is_empty() {
							chan.send(&Msg::ManifestPage { files: vec![], done: true }).await?;
							continue;
						}
						let pages: Vec<_> = files.chunks(MANIFEST_PAGE_LEN).collect();
						let last = pages.len() - 1;
						for (i, page) in pages.iter().enumerate() {
							chan.send(&Msg::ManifestPage { files: page.to_vec(), done: i == last }).await?;
						}
					}
					Err(message) => chan.send(&Msg::Error { message }).await?,
				}
			}
			Msg::GetFile { rel_path } => {
				serve_file(&mut chan, &vault_root, &config.exposed_folders, &rel_path).await?;
			}
			Msg::Bye => return Ok(()),
			other => {
				chan.send(&Msg::Error { message: format!("unexpected message: {other:?}") }).await?;
			}
		}
	}
}

/// Returns the exposed folder that `rel_path` sits inside, if any.
fn matched_exposed_folder<'a>(exposed: &'a [String], rel_path: &str) -> Option<&'a String> {
	exposed.iter().find(|f| rel_path.starts_with(&format!("{f}/")))
}

async fn serve_file(
	chan: &mut NoiseChannel<TcpStream>,
	vault_root: &Path,
	exposed: &[String],
	rel_path: &str,
) -> Result<(), String> {
	// One generic denial for every failure mode below, so an authenticated
	// peer cannot distinguish "not shared" from "exists but unreadable" or
	// "resolves outside the exposed folder" while probing, and no OS error
	// text leaks.
	if validate_rel_path(rel_path).is_err() {
		return chan.send(&Msg::Error { message: format!("file not available: {rel_path}") }).await;
	}
	let Some(folder) = matched_exposed_folder(exposed, rel_path) else {
		return chan.send(&Msg::Error { message: format!("file not available: {rel_path}") }).await;
	};
	// The resolved file must stay inside the *matched exposed folder*, not
	// merely inside the vault. Canonicalizing both and comparing rejects a
	// symlink within an exposed folder that points elsewhere in the vault
	// (e.g. Notes/leak.md -> ../Private/secret.md): validate_rel_path cannot
	// catch it because the traversal happens on disk, not in the path string.
	let folder_root = match vault_root.join(folder).canonicalize() {
		Ok(p) => p,
		Err(_) => return chan.send(&Msg::Error { message: format!("file not available: {rel_path}") }).await,
	};
	let resolved = match vault_root.join(rel_path).canonicalize() {
		Ok(p) => p,
		Err(_) => return chan.send(&Msg::Error { message: format!("file not available: {rel_path}") }).await,
	};
	if !resolved.starts_with(&folder_root) {
		return chan.send(&Msg::Error { message: format!("file not available: {rel_path}") }).await;
	}
	let bytes = match std::fs::read(&resolved) {
		Ok(b) => b,
		Err(_) => return chan.send(&Msg::Error { message: format!("file not available: {rel_path}") }).await,
	};
	let sha256 = hash_bytes(&bytes);
	for chunk in bytes.chunks(FILE_CHUNK_LEN) {
		chan.send(&Msg::FileChunk { data: chunk.to_vec() }).await?;
	}
	chan.send(&Msg::FileEnd { sha256 }).await
}
