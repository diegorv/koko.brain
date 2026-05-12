//! Wire protocol message structs and framing helpers for LAN sync.
//!
//! All on-wire messages are JSON-serialised structs with a `type` tag.
//! Plaintext framing (handshake only) uses [`encode_frame`] /
//! [`decode_frame`] over a 4-byte big-endian length prefix; after the
//! handshake completes, the same framing is wrapped inside AES-256-GCM
//! by the transport layer.
//!
//! The maximum frame payload is [`MAX_FRAME_SIZE`] = 8 MiB. The transport
//! layer chunks large file contents into 64 KiB pieces via [`BlockData`]
//! to stay well under that limit; an oversized frame indicates either a
//! buggy peer or an injection attempt and is rejected.
//!
//! Version negotiation is done by both sides advertising their
//! `[min_supported_version, max_supported_version]` in `OpeningClient`
//! and `OpeningServer`. If the intersection is empty, the connection
//! aborts before any keys are derived.

use serde::{Deserialize, Serialize};

/// Current protocol version. Incremented on every breaking change to
/// any wire structure.
pub const PROTOCOL_VERSION: u8 = 1;

/// Lowest protocol version this build will accept from a peer.
pub const MIN_SUPPORTED_VERSION: u8 = 1;

/// Highest protocol version this build will speak. Always equal to
/// `PROTOCOL_VERSION` today; remains separate so a future build can
/// support a range.
pub const MAX_SUPPORTED_VERSION: u8 = 1;

/// Maximum size, in bytes, of a single framed payload. Matches the cap
/// used by the `tokio_util::codec::LengthDelimitedCodec` builder in the
/// transport layer.
pub const MAX_FRAME_SIZE: usize = 8 * 1024 * 1024;

/// Default chunk size for large file content (64 KiB). Files above this
/// are split into multiple [`AppMsg::BlockData`] frames with
/// `is_last_chunk = true` on the last one.
pub const DEFAULT_CHUNK_SIZE: usize = 64 * 1024;

/// Errors returned by [`encode_frame`] and [`decode_frame`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FramingError {
	/// Encoded JSON exceeded [`MAX_FRAME_SIZE`].
	Oversized { size: usize, max: usize },
	/// Serde failed to serialise the message.
	Encode(String),
	/// Serde failed to deserialise the payload.
	Decode(String),
}

impl core::fmt::Display for FramingError {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		match self {
			Self::Oversized { size, max } => {
				write!(f, "frame exceeds limit: {size} > {max}")
			}
			Self::Encode(msg) => write!(f, "frame encode error: {msg}"),
			Self::Decode(msg) => write!(f, "frame decode error: {msg}"),
		}
	}
}

impl std::error::Error for FramingError {}

// ============================================================================
// Handshake messages (sent plaintext before session keys exist)
// ============================================================================

/// Plaintext messages exchanged during the session handshake. After
/// `IdentityProof` is exchanged and verified on both sides, the
/// transport switches to [`AppMsg`] frames wrapped in AES-256-GCM.
///
/// Binary fields (`eph_pub`, `nonce`, `my_pubkey`, `signature`) are
/// carried as standard base64 strings so the JSON is small, readable in
/// debug logs, and free of serde's `[u8; N]` limitations. Helper
/// functions [`encode_b64`] / [`decode_b64`] handle the round-trip.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum HandshakeMsg {
	/// Sent by the connecting side first. Carries the version range it
	/// can speak plus the ephemeral X25519 public key and an 8-byte
	/// nonce that both sides hash into the transcript.
	OpeningClient {
		min_supported_version: u8,
		max_supported_version: u8,
		eph_pub_b64: String,
		nonce_b64: String,
	},
	/// Sent by the accepting side in response. Same shape as
	/// `OpeningClient` plus the negotiated version.
	OpeningServer {
		min_supported_version: u8,
		max_supported_version: u8,
		agreed_version: u8,
		eph_pub_b64: String,
		nonce_b64: String,
	},
	/// Sent by both sides after the session keys are derived. Carries
	/// the long-term Ed25519 public key and a signature over the
	/// transcript hash. The receiving side rejects the connection if
	/// the public key is not in `peers.json` or if the signature does
	/// not verify.
	IdentityProof {
		my_pubkey_b64: String,
		signature_b64: String,
	},
}

// ============================================================================
// Application-layer messages (sent encrypted after handshake)
// ============================================================================

/// Whether a [`ManifestEntry`] represents a regular file or an empty
/// directory placeholder. Empty directories are explicitly synced so a
/// vault structure like `Projects/empty-dir/` survives the round trip.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EntryKind {
	File,
	Directory,
}

/// One row in a [`AppMsg::Manifest`]. The hash is `""` for directories
/// (which have no content to hash).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestEntry {
	pub path_rel: String,
	pub kind: EntryKind,
	pub mtime_ms: i64,
	pub lamport: u64,
	pub sha256_hash: String,
	pub size: u64,
	pub origin_fingerprint: String,
}

/// Summary of a share, returned in response to [`AppMsg::ListShares`].
/// Only contains fields the peer needs to subscribe — never echoes the
/// authoritative `allowed_peer_fingerprints` list.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShareSummary {
	pub share_id: String,
	pub display_name: String,
	pub direction: String,
	pub manifest_version: u64,
	pub read_only: bool,
}

/// Messages exchanged after the handshake completes. Every variant is
/// AES-256-GCM-encrypted before going over the wire; the framing /
/// nonce-counter logic lives in the transport layer.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum AppMsg {
	/// Client asks the server which shares it is authorised to see.
	ListShares,
	/// Server's reply to `ListShares`. The list is filtered server-side
	/// to entries whose `allowed_peer_fingerprints` contains the
	/// authenticated peer.
	SharesAvailable { shares: Vec<ShareSummary> },
	/// Subscribe to a share, requesting the manifest from
	/// `since_version` onwards.
	Subscribe { share_id: String, since_version: u64 },
	/// Server's reply with the manifest. Large shares paginate by
	/// sending multiple `Manifest` frames with `is_last_page = false`
	/// on every frame except the last.
	Manifest {
		share_id: String,
		version: u64,
		entries: Vec<ManifestEntry>,
		is_last_page: bool,
	},
	/// Client asks for a specific file's content. `expected_hash` lets
	/// the server short-circuit if the file has changed between the
	/// manifest and this request.
	RequestBlock {
		share_id: String,
		path_rel: String,
		expected_hash: String,
	},
	/// One chunk of file content. `is_last_chunk = true` marks the end
	/// of the streamed file; `chunk_index` starts at 0.
	BlockData {
		share_id: String,
		path_rel: String,
		content_b64: String,
		hash: String,
		is_last_chunk: bool,
		chunk_index: u32,
	},
	/// Outbound notification of a local change. Receiver applies the
	/// LWW + atomic-write logic from the sync engine.
	PushUpdate {
		share_id: String,
		path_rel: String,
		mtime_ms: i64,
		lamport: u64,
		sha256_hash: String,
		origin_fingerprint: String,
		content_b64: String,
	},
	/// Atomic rename hint. When the watcher detects a delete+create
	/// pair with matching hashes, it sends this instead of two messages.
	PushRename {
		share_id: String,
		old_path_rel: String,
		new_path_rel: String,
		mtime_ms: i64,
		lamport: u64,
		sha256_hash: String,
		origin_fingerprint: String,
	},
	/// Tombstone for a deleted path.
	Delete {
		share_id: String,
		path_rel: String,
		mtime_ms: i64,
		lamport: u64,
		origin_fingerprint: String,
	},
	/// Keepalive ping. Sent at idle and reciprocated immediately.
	Ping,
	/// Reply to `Ping`.
	Pong,
	/// Protocol-level error from peer. Connection is typically closed
	/// after one of these.
	Error { code: String, message: String },
}

// ============================================================================
// Version negotiation
// ============================================================================

/// Returns the version both sides agree to speak — the largest value in
/// the intersection of their advertised ranges. `None` if the ranges do
/// not overlap (incompatible peers).
pub fn negotiate_version(
	local_min: u8,
	local_max: u8,
	remote_min: u8,
	remote_max: u8,
) -> Option<u8> {
	let lo = local_min.max(remote_min);
	let hi = local_max.min(remote_max);
	if lo <= hi {
		Some(hi)
	} else {
		None
	}
}

// ============================================================================
// Framing helpers (length-prefix is added by tokio_util::codec at the
// transport layer; here we only do JSON encode + size check).
// ============================================================================

/// Serialises `msg` to JSON and returns the bytes that will form one
/// frame payload. Rejects payloads larger than [`MAX_FRAME_SIZE`].
pub fn encode_frame<T: Serialize>(msg: &T) -> Result<Vec<u8>, FramingError> {
	let bytes = serde_json::to_vec(msg).map_err(|e| FramingError::Encode(e.to_string()))?;
	if bytes.len() > MAX_FRAME_SIZE {
		return Err(FramingError::Oversized {
			size: bytes.len(),
			max: MAX_FRAME_SIZE,
		});
	}
	Ok(bytes)
}

/// Parses one frame payload back into `T`. Rejects payloads larger than
/// [`MAX_FRAME_SIZE`] (defense in depth — the transport codec already
/// enforces the cap, but a corrupted framer or test harness could
/// bypass that).
pub fn decode_frame<'de, T: Deserialize<'de>>(bytes: &'de [u8]) -> Result<T, FramingError> {
	if bytes.len() > MAX_FRAME_SIZE {
		return Err(FramingError::Oversized {
			size: bytes.len(),
			max: MAX_FRAME_SIZE,
		});
	}
	serde_json::from_slice(bytes).map_err(|e| FramingError::Decode(e.to_string()))
}

// ============================================================================
// Base64 helpers for the binary fields in `HandshakeMsg` and `AppMsg`.
// Wire format is standard base64 (RFC 4648) without padding stripping.
// ============================================================================

/// Encodes a byte slice as standard base64 (RFC 4648, with padding).
pub fn encode_b64(bytes: &[u8]) -> String {
	use base64::Engine;
	base64::engine::general_purpose::STANDARD.encode(bytes)
}

/// Decodes a base64 string back to bytes. Returns a [`FramingError`] so
/// callers can bubble the error through the same `?` ladder as encode /
/// decode_frame.
pub fn decode_b64(s: &str) -> Result<Vec<u8>, FramingError> {
	use base64::Engine;
	base64::engine::general_purpose::STANDARD
		.decode(s)
		.map_err(|e| FramingError::Decode(format!("base64 decode: {e}")))
}
