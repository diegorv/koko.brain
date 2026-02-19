use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{IpAddr, SocketAddr};
use std::sync::Arc;
use std::time::Instant;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use tokio::net::TcpListener;
use tokio::sync::{Mutex, Semaphore};
use tokio::task::JoinHandle;
use tokio::time::Duration;
use tokio_util::sync::CancellationToken;
use zeroize::Zeroizing;

use super::conflict::validate_vault_path;
use super::crypto::{
	load_sync_local_config, load_sync_state, save_sync_state, sign_manifest, SyncKeys,
	PROTOCOL_VERSION,
};
use super::manifest::{build_manifest, FileEntry};
use super::noise_transport::NoiseTransport;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Maximum concurrent TCP connections the server will accept.
const MAX_CONCURRENT_CONNECTIONS: usize = 10;

/// Maximum Noise handshake attempts per IP per minute.
const MAX_HANDSHAKES_PER_IP_PER_MIN: usize = 3;

/// Timeout for a single Noise handshake.
const HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(5);

/// Idle timeout for an authenticated session (no messages for this long = disconnect).
const IDLE_TIMEOUT: Duration = Duration::from_secs(60);

// ---------------------------------------------------------------------------
// Message type constants (shared with client)
// ---------------------------------------------------------------------------

/// Wire protocol message types.
pub mod msg {
	pub const MANIFEST_REQUEST: u8 = 0x01;
	pub const MANIFEST_RESPONSE: u8 = 0x02;
	pub const FILE_REQUEST: u8 = 0x03;
	pub const FILE_RESPONSE: u8 = 0x04;
	pub const FILE_PUSH: u8 = 0x05;
	pub const FILE_PUSH_ACK: u8 = 0x06;
	pub const VAULT_UUID_EXCHANGE: u8 = 0x07;
	pub const FILE_DELETE: u8 = 0x08;
	pub const FILE_DELETE_ACK: u8 = 0x09;
	pub const ERROR: u8 = 0xFF;
}

// ---------------------------------------------------------------------------
// Message payload types (serde, shared with client)
// ---------------------------------------------------------------------------

/// Manifest response payload (server → client).
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct ManifestResponse {
	pub files: Vec<FileEntry>,
	pub generated_at: u64,
	/// Base64-encoded HMAC-SHA256 of the canonical JSON manifest.
	pub hmac: String,
}

/// File request payload (client → server).
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct FileRequest {
	pub path: String,
}

/// File response payload (server → client).
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct FileResponse {
	pub path: String,
	/// Base64-encoded file content.
	pub content: String,
	pub mtime: u64,
}

/// File push payload (client → server).
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct FilePush {
	pub path: String,
	/// Base64-encoded file content.
	pub content: String,
	pub mtime: u64,
}

/// File push acknowledgment (server → client).
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct FilePushAck {
	pub path: String,
	pub ok: bool,
}

/// Vault UUID exchange (bidirectional, after Noise handshake).
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct VaultUuidExchange {
	pub vault_uuid: String,
	pub protocol_version: u8,
}

/// File delete request (client → server).
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct FileDelete {
	pub path: String,
}

/// File delete acknowledgment (server → client).
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct FileDeleteAck {
	pub path: String,
	pub ok: bool,
}

/// Error message payload.
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct ErrorMessage {
	pub message: String,
}

// ---------------------------------------------------------------------------
// Server types
// ---------------------------------------------------------------------------

/// Running sync server handle.
pub struct SyncServer {
	/// Address the server is bound to.
	pub addr: SocketAddr,
	/// Token to signal graceful shutdown.
	cancel_token: CancellationToken,
	/// Join handle for the accept loop task.
	handle: JoinHandle<()>,
}

impl SyncServer {
	/// Signals the server to stop and waits for the accept loop to finish.
	pub async fn stop(self) {
		self.cancel_token.cancel();
		let _ = self.handle.await;
	}

	/// Returns a clone of the cancellation token.
	pub fn cancel_token(&self) -> CancellationToken {
		self.cancel_token.clone()
	}
}

/// Shared state for all server connection handlers.
struct SyncServerState {
	vault_path: String,
	psk_key: Zeroizing<[u8; 32]>,
	hmac_key: Zeroizing<[u8; 32]>,
	static_priv: Zeroizing<[u8; 32]>,
}

/// Rate limiter tracking handshake attempts per IP address.
pub struct RateLimiter {
	attempts: Arc<Mutex<HashMap<IpAddr, Vec<Instant>>>>,
}

impl RateLimiter {
	/// Creates a new rate limiter.
	pub fn new() -> Self {
		Self {
			attempts: Arc::new(Mutex::new(HashMap::new())),
		}
	}

	/// Checks whether a new handshake from `ip` should be allowed.
	///
	/// Returns `true` if under the limit, `false` if rate-limited.
	pub async fn check(&self, ip: IpAddr) -> bool {
		let mut map = self.attempts.lock().await;
		let now = Instant::now();
		let one_minute_ago = now - Duration::from_secs(60);

		let attempts = map.entry(ip).or_default();
		// Remove stale entries
		attempts.retain(|t| *t > one_minute_ago);

		if attempts.len() >= MAX_HANDSHAKES_PER_IP_PER_MIN {
			return false;
		}

		attempts.push(now);
		true
	}

	/// Inserts timestamps directly (for testing backoff/reset behaviour).
	///
	/// This is exposed publicly so that integration tests in `tests/` can use it.
	pub async fn insert_test_timestamps(&self, ip: IpAddr, timestamps: Vec<Instant>) {
		let mut map = self.attempts.lock().await;
		map.insert(ip, timestamps);
	}
}

// ---------------------------------------------------------------------------
// Path-safe file I/O
// ---------------------------------------------------------------------------

/// Opens a file safely with `O_NOFOLLOW` to prevent symlink-based TOCTOU attacks.
///
/// - Validates the path is within the vault root (anti path-traversal).
/// - Opens with `O_NOFOLLOW` so symlinks in the last component fail atomically.
/// - Verifies via `fstat` that the opened fd points to a regular file.
/// - For writes: creates parent directories and truncates existing content.
pub fn safe_open_file(
	vault_path: &str,
	relative_path: &str,
	write: bool,
) -> Result<std::fs::File, String> {
	let full = validate_vault_path(vault_path, relative_path)?;

	if write {
		if let Some(parent) = full.parent() {
			std::fs::create_dir_all(parent)
				.map_err(|e| format!("Failed to create parent dirs: {e}"))?;
		}
	}

	let mut opts = std::fs::OpenOptions::new();
	opts.read(true);
	if write {
		opts.write(true).create(true).truncate(true);
	}

	#[cfg(unix)]
	{
		use std::os::unix::fs::OpenOptionsExt;
		opts.custom_flags(libc::O_NOFOLLOW);
	}

	let file = opts
		.open(&full)
		.map_err(|e| format!("Failed to open file: {e}"))?;

	// fstat check: verify we opened a regular file
	let meta = file
		.metadata()
		.map_err(|e| format!("fstat failed: {e}"))?;
	if !meta.is_file() {
		return Err(format!("Not a regular file: {relative_path}"));
	}

	Ok(file)
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

/// Starts the sync TCP server.
///
/// Binds to `0.0.0.0:{port}`, enforces rate limiting and concurrency limits,
/// and handles authenticated Noise sessions with message routing.
pub async fn start_server(
	vault_path: String,
	port: u16,
	sync_keys: SyncKeys,
	static_priv: Zeroizing<[u8; 32]>,
) -> Result<SyncServer, String> {
	let addr: SocketAddr = ([0, 0, 0, 0], port).into();
	let listener = TcpListener::bind(addr)
		.await
		.map_err(|e| format!("Failed to bind to {addr}: {e}"))?;
	let bound_addr = listener
		.local_addr()
		.map_err(|e| format!("Failed to get local addr: {e}"))?;

	let cancel_token = CancellationToken::new();
	let semaphore = Arc::new(Semaphore::new(MAX_CONCURRENT_CONNECTIONS));
	let rate_limiter = RateLimiter::new();

	let state = Arc::new(SyncServerState {
		vault_path,
		psk_key: sync_keys.psk_key,
		hmac_key: sync_keys.hmac_key,
		static_priv,
	});

	let cancel = cancel_token.clone();
	let handle = tokio::spawn(async move {
		loop {
			tokio::select! {
				_ = cancel.cancelled() => break,
				result = listener.accept() => {
					let (stream, peer_addr) = match result {
						Ok(v) => v,
						Err(_) => continue,
					};

					// Rate limit
					if !rate_limiter.check(peer_addr.ip()).await {
						drop(stream);
						continue;
					}

					// Acquire concurrency permit
					let permit = match semaphore.clone().try_acquire_owned() {
						Ok(p) => p,
						Err(_) => {
							drop(stream);
							continue;
						}
					};

					let state = Arc::clone(&state);
					let cancel = cancel.clone();
					tokio::spawn(async move {
						let _permit = permit;
						let _ = handle_connection(stream, state, cancel).await;
					});
				}
			}
		}
	});

	Ok(SyncServer {
		addr: bound_addr,
		cancel_token,
		handle,
	})
}

// ---------------------------------------------------------------------------
// Connection handler
// ---------------------------------------------------------------------------

/// Handles a single authenticated connection: handshake → UUID exchange → message loop.
async fn handle_connection(
	stream: tokio::net::TcpStream,
	state: Arc<SyncServerState>,
	cancel: CancellationToken,
) -> Result<(), String> {
	// Noise handshake (server = responder)
	let mut transport =
		NoiseTransport::accept_with_timeout(stream, &state.psk_key, &state.static_priv, HANDSHAKE_TIMEOUT)
			.await?;

	// UUID exchange (expect client to send first, then we respond)
	let peer_uuid = handle_uuid_exchange(&mut transport, &state).await?;
	let _ = peer_uuid; // Used by engine for peer identification

	// Message loop with idle timeout
	loop {
		tokio::select! {
			_ = cancel.cancelled() => break,
			_ = tokio::time::sleep(IDLE_TIMEOUT) => {
				if transport.last_activity().elapsed() >= IDLE_TIMEOUT {
					break;
				}
			}
			result = transport.recv() => {
				let (msg_type, payload) = result?;
				match msg_type {
					msg::MANIFEST_REQUEST => {
						handle_manifest_request(&mut transport, &state).await?;
					}
					msg::FILE_REQUEST => {
						handle_file_request(&mut transport, &state, &payload).await?;
					}
					msg::FILE_PUSH => {
						handle_file_push(&mut transport, &state, &payload).await?;
					}
					msg::FILE_DELETE => {
						handle_file_delete(&mut transport, &state, &payload).await?;
					}
					_ => {
						let err = ErrorMessage {
							message: format!("Unknown message type: 0x{msg_type:02x}"),
						};
						let payload = serde_json::to_vec(&err).unwrap_or_default();
						transport.send(msg::ERROR, &payload).await?;
					}
				}
			}
		}
	}

	Ok(())
}

// ---------------------------------------------------------------------------
// UUID exchange handler
// ---------------------------------------------------------------------------

/// Performs vault UUID exchange after the Noise handshake.
///
/// - Receives the client's vault UUID.
/// - Sends our own vault UUID.
/// - On first sync: saves client's UUID as canonical (initiator is source of truth).
/// - On subsequent syncs: rejects mismatched UUIDs.
async fn handle_uuid_exchange(
	transport: &mut NoiseTransport,
	state: &SyncServerState,
) -> Result<String, String> {
	// Receive client's UUID exchange
	let (msg_type, payload) = transport.recv().await?;
	if msg_type != msg::VAULT_UUID_EXCHANGE {
		return Err(format!(
			"Expected vault_uuid_exchange (0x07), got 0x{msg_type:02x}"
		));
	}

	let client_exchange: VaultUuidExchange = serde_json::from_slice(&payload)
		.map_err(|e| format!("Invalid vault_uuid_exchange payload: {e}"))?;

	if client_exchange.protocol_version != PROTOCOL_VERSION {
		return Err(format!(
			"Protocol version mismatch: expected {PROTOCOL_VERSION}, got {}",
			client_exchange.protocol_version
		));
	}

	// Load our sync state
	let mut sync_state = load_sync_state(&state.vault_path)?;
	let our_uuid = super::crypto::get_canonical_vault_uuid(&state.vault_path)?;

	// Send our UUID exchange
	let our_exchange = VaultUuidExchange {
		vault_uuid: our_uuid.clone(),
		protocol_version: PROTOCOL_VERSION,
	};
	let response_payload = serde_json::to_vec(&our_exchange)
		.map_err(|e| format!("Failed to serialize uuid exchange: {e}"))?;
	transport
		.send(msg::VAULT_UUID_EXCHANGE, &response_payload)
		.await?;

	// Validate or establish canonical UUID
	match &sync_state.canonical_vault_uuid {
		Some(canonical) => {
			// Subsequent sync: reject mismatched UUID
			if client_exchange.vault_uuid != *canonical {
				return Err(format!(
					"Vault UUID mismatch: expected {canonical}, got {}",
					client_exchange.vault_uuid
				));
			}
		}
		None => {
			// First sync: adopt initiator's UUID as canonical
			sync_state.canonical_vault_uuid = Some(client_exchange.vault_uuid.clone());
			save_sync_state(&state.vault_path, &sync_state)?;
		}
	}

	Ok(client_exchange.vault_uuid)
}

// ---------------------------------------------------------------------------
// Message handlers
// ---------------------------------------------------------------------------

/// Handles a `manifest_request`: builds manifest, signs with HMAC, sends response.
async fn handle_manifest_request(
	transport: &mut NoiseTransport,
	state: &SyncServerState,
) -> Result<(), String> {
	let config = load_sync_local_config(&state.vault_path)?;
	let manifest = build_manifest(&state.vault_path, &config.excluded_paths)?;

	// Serialize manifest for HMAC computation (files + generated_at only)
	let manifest_json = serde_json::to_vec(&manifest)
		.map_err(|e| format!("Failed to serialize manifest: {e}"))?;
	let hmac = sign_manifest(&state.hmac_key, &manifest_json);

	let response = ManifestResponse {
		files: manifest.files,
		generated_at: manifest.generated_at,
		hmac: BASE64.encode(hmac),
	};

	let payload = serde_json::to_vec(&response)
		.map_err(|e| format!("Failed to serialize manifest response: {e}"))?;
	transport.send(msg::MANIFEST_RESPONSE, &payload).await
}

/// Handles a `file_request`: reads the file from the vault and sends its content.
async fn handle_file_request(
	transport: &mut NoiseTransport,
	state: &SyncServerState,
	payload: &[u8],
) -> Result<(), String> {
	let request: FileRequest = serde_json::from_slice(payload)
		.map_err(|e| format!("Invalid file_request payload: {e}"))?;

	match read_vault_file(&state.vault_path, &request.path) {
		Ok((content, mtime)) => {
			let response = FileResponse {
				path: request.path,
				content: BASE64.encode(&content),
				mtime,
			};
			let resp_payload = serde_json::to_vec(&response)
				.map_err(|e| format!("Failed to serialize file response: {e}"))?;
			transport.send(msg::FILE_RESPONSE, &resp_payload).await
		}
		Err(err) => {
			let error = ErrorMessage { message: err };
			let err_payload = serde_json::to_vec(&error).unwrap_or_default();
			transport.send(msg::ERROR, &err_payload).await
		}
	}
}

/// Handles a `file_push`: validates path, writes file, sets mtime, sends ack.
async fn handle_file_push(
	transport: &mut NoiseTransport,
	state: &SyncServerState,
	payload: &[u8],
) -> Result<(), String> {
	let push: FilePush = serde_json::from_slice(payload)
		.map_err(|e| format!("Invalid file_push payload: {e}"))?;

	let content = BASE64
		.decode(&push.content)
		.map_err(|e| format!("Invalid base64 content: {e}"))?;

	let result = write_vault_file(&state.vault_path, &push.path, &content, push.mtime);

	let ack = FilePushAck {
		path: push.path,
		ok: result.is_ok(),
	};
	let ack_payload = serde_json::to_vec(&ack)
		.map_err(|e| format!("Failed to serialize push ack: {e}"))?;
	transport.send(msg::FILE_PUSH_ACK, &ack_payload).await
}

/// Handles a `file_delete`: validates path, deletes file, sends ack.
async fn handle_file_delete(
	transport: &mut NoiseTransport,
	state: &SyncServerState,
	payload: &[u8],
) -> Result<(), String> {
	let delete: FileDelete = serde_json::from_slice(payload)
		.map_err(|e| format!("Invalid file_delete payload: {e}"))?;

	let result = super::conflict::safe_delete_file(&state.vault_path, &delete.path);

	let ack = FileDeleteAck {
		path: delete.path,
		ok: result.is_ok(),
	};
	let ack_payload = serde_json::to_vec(&ack)
		.map_err(|e| format!("Failed to serialize delete ack: {e}"))?;
	transport.send(msg::FILE_DELETE_ACK, &ack_payload).await
}

// ---------------------------------------------------------------------------
// File I/O helpers
// ---------------------------------------------------------------------------

/// Reads a file from the vault using TOCTOU-safe I/O.
///
/// Returns `(content, mtime)`.
pub fn read_vault_file(vault_path: &str, relative_path: &str) -> Result<(Vec<u8>, u64), String> {
	let mut file = safe_open_file(vault_path, relative_path, false)?;

	let mut content = Vec::new();
	file.read_to_end(&mut content)
		.map_err(|e| format!("Failed to read file: {e}"))?;

	let mtime = file
		.metadata()
		.and_then(|m| m.modified())
		.ok()
		.and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
		.map(|d| d.as_secs())
		.unwrap_or(0);

	Ok((content, mtime))
}

/// Writes a file to the vault using TOCTOU-safe I/O, then sets its mtime.
pub fn write_vault_file(
	vault_path: &str,
	relative_path: &str,
	content: &[u8],
	mtime: u64,
) -> Result<(), String> {
	let mut file = safe_open_file(vault_path, relative_path, true)?;

	file.write_all(content)
		.map_err(|e| format!("Failed to write file: {e}"))?;

	// Set modification time
	let modified = std::time::UNIX_EPOCH + std::time::Duration::from_secs(mtime);
	let times = std::fs::FileTimes::new().set_modified(modified);
	file.set_times(times)
		.map_err(|e| format!("Failed to set mtime: {e}"))?;

	Ok(())
}

