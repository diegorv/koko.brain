//! Wire protocol for P2P vault sync: message types and length-prefixed
//! framing. Every frame on the wire is `u32 LE length ++ payload`; after the
//! Noise handshake the payload is one encrypted Noise message that decrypts
//! to one MessagePack-encoded `Msg`.

use serde::{Deserialize, Serialize};
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};

/// Bump on breaking wire changes. Peers with different versions refuse to sync.
pub const PROTOCOL_VERSION: u32 = 1;

/// Max bytes for one frame. Noise transport messages cap at 65535 bytes.
pub const MAX_FRAME_LEN: u32 = 65_535;

/// Max plaintext bytes per Noise message (65535 minus the 16-byte AEAD tag).
pub const MAX_PLAINTEXT_LEN: usize = 65_519;

/// Payload bytes per `FileChunk`; keeps the MessagePack envelope safely under
/// `MAX_PLAINTEXT_LEN`.
pub const FILE_CHUNK_LEN: usize = 48 * 1024;

/// Files per `ManifestPage`; bounds page size well under `MAX_PLAINTEXT_LEN`.
pub const MANIFEST_PAGE_LEN: usize = 200;

/// Metadata for one file inside an exposed folder.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FileMeta {
	/// Vault-relative path, `/`-separated.
	pub rel_path: String,
	/// File size in bytes.
	pub size: u64,
	/// Lowercase hex SHA-256 of the file content.
	pub sha256: String,
}

/// One protocol message. One `Msg` == one Noise message == one frame.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Msg {
	/// Client greeting; first message after the handshake.
	Hello { device_name: String, protocol_version: u32 },
	/// Server reply to `Hello`.
	HelloAck { device_name: String, protocol_version: u32 },
	/// Ask for the list of exposed folders.
	ListShares,
	/// Exposed folders that currently exist on disk (vault-relative paths).
	Shares { folders: Vec<String> },
	/// Ask for the file manifest of one exposed folder.
	GetManifest { folder: String },
	/// One page of manifest entries; `done` marks the last page.
	ManifestPage { files: Vec<FileMeta>, done: bool },
	/// Ask for one file's content.
	GetFile { rel_path: String },
	/// One chunk of file content (`FILE_CHUNK_LEN` max).
	FileChunk {
		#[serde(with = "serde_bytes")]
		data: Vec<u8>,
	},
	/// End of file transfer; hash of the full content just sent.
	FileEnd { sha256: String },
	/// Request-level failure; the session stays usable.
	Error { message: String },
	/// Clean end of session.
	Bye,
}

/// Serialize a message with named fields (matches vault/index_cache.rs usage).
pub fn encode_msg(msg: &Msg) -> Result<Vec<u8>, String> {
	rmp_serde::to_vec_named(msg).map_err(|e| format!("message encode failed: {e}"))
}

/// Deserialize a message.
pub fn decode_msg(bytes: &[u8]) -> Result<Msg, String> {
	rmp_serde::from_slice(bytes).map_err(|e| format!("message decode failed: {e}"))
}

/// Write one length-prefixed frame.
pub async fn write_frame<S: AsyncWrite + Unpin>(stream: &mut S, payload: &[u8]) -> Result<(), String> {
	if payload.len() > MAX_FRAME_LEN as usize {
		return Err(format!("frame too large: {} bytes", payload.len()));
	}
	let len = payload.len() as u32;
	stream.write_all(&len.to_le_bytes()).await.map_err(|e| format!("frame write failed: {e}"))?;
	stream.write_all(payload).await.map_err(|e| format!("frame write failed: {e}"))?;
	stream.flush().await.map_err(|e| format!("frame flush failed: {e}"))?;
	Ok(())
}

/// Read one length-prefixed frame. Rejects frames over `MAX_FRAME_LEN`.
pub async fn read_frame<S: AsyncRead + Unpin>(stream: &mut S) -> Result<Vec<u8>, String> {
	let mut len_buf = [0u8; 4];
	stream.read_exact(&mut len_buf).await.map_err(|e| format!("frame read failed: {e}"))?;
	let len = u32::from_le_bytes(len_buf);
	if len > MAX_FRAME_LEN {
		return Err(format!("frame too large: {len} bytes"));
	}
	let mut buf = vec![0u8; len as usize];
	stream.read_exact(&mut buf).await.map_err(|e| format!("frame read failed: {e}"))?;
	Ok(buf)
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn msg_roundtrips_through_messagepack() {
		let msgs = vec![
			Msg::Hello { device_name: "Studio".into(), protocol_version: PROTOCOL_VERSION },
			Msg::Shares { folders: vec!["Notes".into(), "Projects/Public".into()] },
			Msg::ManifestPage {
				files: vec![FileMeta { rel_path: "Notes/a.md".into(), size: 3, sha256: "ab".into() }],
				done: true,
			},
			Msg::FileChunk { data: vec![0u8, 255, 1, 2] },
			Msg::Error { message: "nope".into() },
			Msg::Bye,
		];
		for msg in msgs {
			let bytes = encode_msg(&msg).unwrap();
			assert_eq!(decode_msg(&bytes).unwrap(), msg);
		}
	}

	#[tokio::test]
	async fn frame_roundtrips_over_duplex() {
		let (mut a, mut b) = tokio::io::duplex(1024);
		write_frame(&mut a, b"hello frame").await.unwrap();
		assert_eq!(read_frame(&mut b).await.unwrap(), b"hello frame");
	}

	#[tokio::test]
	async fn oversized_frame_write_is_rejected() {
		let (mut a, _b) = tokio::io::duplex(64);
		let big = vec![0u8; (MAX_FRAME_LEN as usize) + 1];
		assert!(write_frame(&mut a, &big).await.is_err());
	}

	#[tokio::test]
	async fn oversized_frame_length_header_is_rejected() {
		use tokio::io::AsyncWriteExt;
		let (mut a, mut b) = tokio::io::duplex(64);
		a.write_all(&(MAX_FRAME_LEN + 1).to_le_bytes()).await.unwrap();
		assert!(read_frame(&mut b).await.is_err());
	}
}
