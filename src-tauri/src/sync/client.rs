use std::net::SocketAddr;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

use super::crypto::{verify_manifest, PROTOCOL_VERSION};
use super::manifest::SyncManifest;
use super::noise_transport::NoiseTransport;
use super::server::{
	msg, ErrorMessage, FileDelete, FileDeleteAck, FilePush, FilePushAck, FileRequest,
	FileResponse, ManifestResponse, VaultUuidExchange,
};
use crate::utils::logger::debug_log;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/// An active sync session over an authenticated Noise transport.
///
/// Wraps a `NoiseTransport` for a complete sync cycle (manifest exchange,
/// file transfers, deletes). Created via `open_session()`.
pub struct SyncSession {
	transport: NoiseTransport,
	/// The peer's vault UUID (received during UUID exchange).
	peer_uuid: String,
}

impl SyncSession {
	/// Returns the peer's vault UUID.
	pub fn peer_uuid(&self) -> &str {
		&self.peer_uuid
	}

	/// Requests the peer's manifest and verifies its HMAC signature.
	///
	/// Sends `manifest_request`, receives `manifest_response`, verifies HMAC
	/// with the provided key, and returns the parsed `SyncManifest`.
	pub async fn fetch_manifest(
		&mut self,
		hmac_key: &[u8; 32],
	) -> Result<SyncManifest, String> {
		debug_log("SYNC:CLI", "Requesting manifest from peer");
		// Send manifest request (empty payload)
		self.transport
			.send(msg::MANIFEST_REQUEST, &[])
			.await?;

		// Receive manifest response
		let (msg_type, payload) = self.transport.recv().await?;

		if msg_type == msg::ERROR {
			let err: ErrorMessage = serde_json::from_slice(&payload)
				.unwrap_or(ErrorMessage {
					message: "Unknown error".to_string(),
				});
			return Err(format!("Server error: {}", err.message));
		}

		if msg_type != msg::MANIFEST_RESPONSE {
			return Err(format!(
				"Expected manifest_response (0x02), got 0x{msg_type:02x}"
			));
		}

		let response: ManifestResponse = serde_json::from_slice(&payload)
			.map_err(|e| format!("Invalid manifest_response payload: {e}"))?;

		// Reconstruct the manifest for HMAC verification
		let manifest = SyncManifest {
			files: response.files,
			generated_at: response.generated_at,
		};

		let manifest_json = serde_json::to_vec(&manifest)
			.map_err(|e| format!("Failed to serialize manifest for HMAC: {e}"))?;

		let hmac_bytes = BASE64
			.decode(&response.hmac)
			.map_err(|e| format!("Invalid HMAC base64: {e}"))?;

		if hmac_bytes.len() != 32 {
			return Err(format!(
				"Invalid HMAC length: expected 32, got {}",
				hmac_bytes.len()
			));
		}

		let mut hmac_arr = [0u8; 32];
		hmac_arr.copy_from_slice(&hmac_bytes);

		if !verify_manifest(hmac_key, &manifest_json, &hmac_arr, manifest.generated_at) {
			debug_log("SYNC:CLI", "Manifest HMAC verification failed — rejecting");
			return Err("Manifest HMAC verification failed".to_string());
		}

		debug_log("SYNC:CLI", format!("Manifest received and verified: {} files", manifest.files.len()));
		Ok(manifest)
	}

	/// Fetches a single file from the peer.
	///
	/// Returns `(content, mtime)`.
	pub async fn fetch_file(
		&mut self,
		path: &str,
	) -> Result<(Vec<u8>, u64), String> {
		debug_log("SYNC:CLI", format!("Fetching file: {path}"));
		let request = FileRequest {
			path: path.to_string(),
		};
		let payload = serde_json::to_vec(&request)
			.map_err(|e| format!("Failed to serialize file_request: {e}"))?;

		self.transport
			.send(msg::FILE_REQUEST, &payload)
			.await?;

		let (msg_type, resp_payload) = self.transport.recv().await?;

		if msg_type == msg::ERROR {
			let err: ErrorMessage = serde_json::from_slice(&resp_payload)
				.unwrap_or(ErrorMessage {
					message: "Unknown error".to_string(),
				});
			return Err(format!("Server error: {}", err.message));
		}

		if msg_type != msg::FILE_RESPONSE {
			return Err(format!(
				"Expected file_response (0x04), got 0x{msg_type:02x}"
			));
		}

		let response: FileResponse = serde_json::from_slice(&resp_payload)
			.map_err(|e| format!("Invalid file_response payload: {e}"))?;

		let content = BASE64
			.decode(&response.content)
			.map_err(|e| format!("Invalid file content base64: {e}"))?;

		Ok((content, response.mtime))
	}

	/// Pushes a file to the peer.
	///
	/// Sends the file content and mtime, waits for acknowledgment.
	pub async fn push_file(
		&mut self,
		path: &str,
		content: &[u8],
		mtime: u64,
	) -> Result<(), String> {
		debug_log("SYNC:CLI", format!("Pushing file: {path} ({} bytes)", content.len()));
		let push = FilePush {
			path: path.to_string(),
			content: BASE64.encode(content),
			mtime,
		};
		let payload = serde_json::to_vec(&push)
			.map_err(|e| format!("Failed to serialize file_push: {e}"))?;

		self.transport
			.send(msg::FILE_PUSH, &payload)
			.await?;

		let (msg_type, resp_payload) = self.transport.recv().await?;

		if msg_type == msg::ERROR {
			let err: ErrorMessage = serde_json::from_slice(&resp_payload)
				.unwrap_or(ErrorMessage {
					message: "Unknown error".to_string(),
				});
			return Err(format!("Server error: {}", err.message));
		}

		if msg_type != msg::FILE_PUSH_ACK {
			return Err(format!(
				"Expected file_push_ack (0x06), got 0x{msg_type:02x}"
			));
		}

		let ack: FilePushAck = serde_json::from_slice(&resp_payload)
			.map_err(|e| format!("Invalid file_push_ack payload: {e}"))?;

		if !ack.ok {
			return Err(format!("Server rejected file push for: {}", ack.path));
		}

		Ok(())
	}

	/// Requests the peer to delete a file.
	///
	/// Sends the file path, waits for acknowledgment.
	pub async fn delete_file(
		&mut self,
		path: &str,
	) -> Result<(), String> {
		debug_log("SYNC:CLI", format!("Requesting remote delete: {path}"));
		let delete = FileDelete {
			path: path.to_string(),
		};
		let payload = serde_json::to_vec(&delete)
			.map_err(|e| format!("Failed to serialize file_delete: {e}"))?;

		self.transport
			.send(msg::FILE_DELETE, &payload)
			.await?;

		let (msg_type, resp_payload) = self.transport.recv().await?;

		if msg_type == msg::ERROR {
			let err: ErrorMessage = serde_json::from_slice(&resp_payload)
				.unwrap_or(ErrorMessage {
					message: "Unknown error".to_string(),
				});
			return Err(format!("Server error: {}", err.message));
		}

		if msg_type != msg::FILE_DELETE_ACK {
			return Err(format!(
				"Expected file_delete_ack (0x09), got 0x{msg_type:02x}"
			));
		}

		let ack: FileDeleteAck = serde_json::from_slice(&resp_payload)
			.map_err(|e| format!("Invalid file_delete_ack payload: {e}"))?;

		if !ack.ok {
			return Err(format!("Server rejected file delete for: {}", ack.path));
		}

		Ok(())
	}
}

// ---------------------------------------------------------------------------
// Session creation
// ---------------------------------------------------------------------------

/// Opens an authenticated sync session with a peer.
///
/// 1. Establishes a Noise `XXpsk3` connection (client = initiator).
/// 2. Sends our vault UUID, receives the peer's UUID.
/// 3. Returns a `SyncSession` ready for manifest/file operations.
///
/// The caller (engine) is responsible for validating the returned `peer_uuid`
/// against the expected canonical vault UUID.
pub async fn open_session(
	peer_addr: SocketAddr,
	psk_key: &[u8; 32],
	static_priv: &[u8; 32],
	our_vault_uuid: &str,
) -> Result<SyncSession, String> {
	debug_log("SYNC:CLI", format!("Connecting to {peer_addr}"));
	// Connect and perform Noise handshake (initiator role)
	let mut transport =
		NoiseTransport::connect(peer_addr, psk_key, static_priv).await?;

	// Send our vault UUID exchange (client sends first)
	let our_exchange = VaultUuidExchange {
		vault_uuid: our_vault_uuid.to_string(),
		protocol_version: PROTOCOL_VERSION,
	};
	let payload = serde_json::to_vec(&our_exchange)
		.map_err(|e| format!("Failed to serialize uuid exchange: {e}"))?;
	transport
		.send(msg::VAULT_UUID_EXCHANGE, &payload)
		.await?;

	// Receive peer's UUID exchange
	let (msg_type, resp_payload) = transport.recv().await?;
	if msg_type != msg::VAULT_UUID_EXCHANGE {
		return Err(format!(
			"Expected vault_uuid_exchange (0x07), got 0x{msg_type:02x}"
		));
	}

	let peer_exchange: VaultUuidExchange = serde_json::from_slice(&resp_payload)
		.map_err(|e| format!("Invalid vault_uuid_exchange payload: {e}"))?;

	if peer_exchange.protocol_version != PROTOCOL_VERSION {
		debug_log("SYNC:CLI", format!(
			"Protocol version mismatch: expected {PROTOCOL_VERSION}, got {}",
			peer_exchange.protocol_version
		));
		return Err(format!(
			"Protocol version mismatch: expected {PROTOCOL_VERSION}, got {}",
			peer_exchange.protocol_version
		));
	}

	debug_log("SYNC:CLI", format!("Session established with peer_uuid={}", peer_exchange.vault_uuid));
	Ok(SyncSession {
		transport,
		peer_uuid: peer_exchange.vault_uuid,
	})
}
