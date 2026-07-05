//! Read-only sync listener. Accepts one peer session at a time, runs the
//! Noise responder handshake, and serves shares/manifests/files from the
//! exposed folders. Never writes to the vault.

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tokio::net::{TcpListener, TcpStream};
use tokio::sync::watch;

use crate::utils::logger::debug_log;

use super::manifest::{build_manifest, hash_bytes, validate_rel_path};
use super::noise::{handshake_responder, NoiseChannel};
use super::protocol::{Msg, FILE_CHUNK_LEN, MANIFEST_PAGE_LEN, PROTOCOL_VERSION};

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
					// One session at a time: serve inline so a second
					// connection waits in the OS backlog until this ends.
					if let Err(e) = serve_connection(stream, &config).await {
						debug_log("SYNC", format!("session ended with error: {e}"));
					}
				}
			}
		}
		debug_log("SYNC", "listener stopped".to_string());
	});
	Ok(RunningServer { port, shutdown: tx })
}

async fn serve_connection(stream: TcpStream, config: &ServerConfig) -> Result<(), String> {
	let mut chan = handshake_responder(stream, &config.psk).await?;
	let Msg::Hello { protocol_version, device_name } = chan.recv().await? else {
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
		// A recv error here just means the peer hung up — normal end.
		let Ok(msg) = chan.recv().await else { return Ok(()) };
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

/// True when `rel_path` is inside one of the exposed folders.
fn is_exposed(exposed: &[String], rel_path: &str) -> bool {
	exposed.iter().any(|f| rel_path.starts_with(&format!("{f}/")))
}

async fn serve_file(
	chan: &mut NoiseChannel<TcpStream>,
	vault_root: &Path,
	exposed: &[String],
	rel_path: &str,
) -> Result<(), String> {
	if validate_rel_path(rel_path).is_err() || !is_exposed(exposed, rel_path) {
		return chan.send(&Msg::Error { message: format!("file not shared: {rel_path}") }).await;
	}
	// Defense in depth: the resolved file must stay under the vault root
	// (validate_rel_path already blocks `..`; this also blocks symlink games).
	let resolved = match vault_root.join(rel_path).canonicalize() {
		Ok(p) => p,
		Err(e) => return chan.send(&Msg::Error { message: format!("file not readable: {e}") }).await,
	};
	let root = vault_root.canonicalize().map_err(|e| format!("vault root missing: {e}"))?;
	if !resolved.starts_with(&root) {
		return chan.send(&Msg::Error { message: format!("file not shared: {rel_path}") }).await;
	}
	let bytes = match std::fs::read(&resolved) {
		Ok(b) => b,
		Err(e) => return chan.send(&Msg::Error { message: format!("read failed: {e}") }).await,
	};
	let sha256 = hash_bytes(&bytes);
	for chunk in bytes.chunks(FILE_CHUNK_LEN) {
		chan.send(&Msg::FileChunk { data: chunk.to_vec() }).await?;
	}
	chan.send(&Msg::FileEnd { sha256 }).await
}
