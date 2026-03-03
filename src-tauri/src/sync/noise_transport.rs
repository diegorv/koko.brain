use snow::TransportState;
use std::net::SocketAddr;
use std::time::Instant;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::time::{timeout, Duration};
use crate::utils::logger::debug_log;

/// Noise Protocol pattern for sync transport.
pub const NOISE_PATTERN: &str = "Noise_XXpsk3_25519_AESGCM_SHA256";

/// Default connection timeout.
const CONNECT_TIMEOUT: Duration = Duration::from_secs(5);

/// Default handshake timeout.
const HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(5);

/// Maximum payload size per message (10 MB — generous for markdown notes).
pub const MAX_PAYLOAD_SIZE: usize = 10 * 1024 * 1024;

/// Maximum Noise protocol message size (spec limit).
const MAX_NOISE_MSG: usize = 65535;

/// Maximum plaintext per Noise frame (message minus 16-byte AEAD tag).
const MAX_PLAINTEXT_CHUNK: usize = MAX_NOISE_MSG - 16;

/// Encrypted transport channel over TCP using Noise Protocol.
///
/// Wraps a `TcpStream` with `Noise_XXpsk3_25519_AESGCM_SHA256` encryption.
/// All data sent after the handshake is authenticated and encrypted.
pub struct NoiseTransport {
	stream: TcpStream,
	noise: TransportState,
	last_activity: Instant,
}

impl NoiseTransport {
	/// Connects to a peer as the Noise initiator with default timeouts (5s).
	pub async fn connect(
		addr: SocketAddr,
		psk_key: &[u8; 32],
		static_priv: &[u8; 32],
	) -> Result<Self, String> {
		Self::connect_with_timeouts(addr, psk_key, static_priv, CONNECT_TIMEOUT, HANDSHAKE_TIMEOUT)
			.await
	}

	/// Connects to a peer as the Noise initiator with custom timeouts.
	pub async fn connect_with_timeouts(
		addr: SocketAddr,
		psk_key: &[u8; 32],
		static_priv: &[u8; 32],
		connect_timeout: Duration,
		handshake_timeout: Duration,
	) -> Result<Self, String> {
		debug_log("SYNC:NOISE", format!("Connecting to {addr} (timeout={}s)", connect_timeout.as_secs()));
		let mut stream = timeout(connect_timeout, TcpStream::connect(addr))
			.await
			.map_err(|_| "Connection timed out".to_string())?
			.map_err(|e| format!("Connection failed: {e}"))?;

		let mut hs = snow::Builder::new(NOISE_PATTERN.parse().unwrap())
			.local_private_key(static_priv)
			.psk(3, psk_key)
			.build_initiator()
			.map_err(|e| format!("Failed to build Noise initiator: {e}"))?;

		timeout(handshake_timeout, async {
			// -> e
			write_frame(&mut stream, &hs_write(&mut hs)?).await?;
			// <- e, ee, s, es
			let msg = read_frame(&mut stream).await?;
			hs_read(&mut hs, &msg)?;
			// -> s, se, psk
			write_frame(&mut stream, &hs_write(&mut hs)?).await?;
			stream
				.flush()
				.await
				.map_err(|e| format!("Flush failed: {e}"))?;
			Ok::<_, String>(())
		})
		.await
		.map_err(|_| "Handshake timed out".to_string())??;

		let noise = hs
			.into_transport_mode()
			.map_err(|e| format!("Failed to enter transport mode: {e}"))?;

		debug_log("SYNC:NOISE", format!("Handshake complete with {addr} (initiator)"));
		Ok(Self {
			stream,
			noise,
			last_activity: Instant::now(),
		})
	}

	/// Accepts a peer connection as the Noise responder with default timeout (5s).
	pub async fn accept(
		stream: TcpStream,
		psk_key: &[u8; 32],
		static_priv: &[u8; 32],
	) -> Result<Self, String> {
		Self::accept_with_timeout(stream, psk_key, static_priv, HANDSHAKE_TIMEOUT).await
	}

	/// Accepts a peer connection as the Noise responder with custom timeout.
	pub async fn accept_with_timeout(
		mut stream: TcpStream,
		psk_key: &[u8; 32],
		static_priv: &[u8; 32],
		handshake_timeout: Duration,
	) -> Result<Self, String> {
		debug_log("SYNC:NOISE", "Accepting Noise handshake (responder)");
		let mut hs = snow::Builder::new(NOISE_PATTERN.parse().unwrap())
			.local_private_key(static_priv)
			.psk(3, psk_key)
			.build_responder()
			.map_err(|e| format!("Failed to build Noise responder: {e}"))?;

		timeout(handshake_timeout, async {
			// <- e
			let msg = read_frame(&mut stream).await?;
			hs_read(&mut hs, &msg)?;
			// -> e, ee, s, es
			write_frame(&mut stream, &hs_write(&mut hs)?).await?;
			// <- s, se, psk
			let msg = read_frame(&mut stream).await?;
			hs_read(&mut hs, &msg)?;
			stream
				.flush()
				.await
				.map_err(|e| format!("Flush failed: {e}"))?;
			Ok::<_, String>(())
		})
		.await
		.map_err(|_| "Handshake timed out".to_string())??;

		let noise = hs
			.into_transport_mode()
			.map_err(|e| format!("Failed to enter transport mode: {e}"))?;

		debug_log("SYNC:NOISE", "Handshake complete (responder)");
		Ok(Self {
			stream,
			noise,
			last_activity: Instant::now(),
		})
	}

	/// Sends an encrypted message with the given type and payload.
	///
	/// Wire format: Noise-encrypted chunks terminated by a zero-length marker.
	/// Plaintext layout: `[msg_type: u8][payload_len: u32 BE][payload]`.
	pub async fn send(&mut self, msg_type: u8, payload: &[u8]) -> Result<(), String> {
		if payload.len() > MAX_PAYLOAD_SIZE {
			return Err(format!(
				"Payload too large: {} bytes (max {MAX_PAYLOAD_SIZE})",
				payload.len()
			));
		}

		// Build plaintext: [msg_type][payload_len: u32 BE][payload]
		let mut plaintext = Vec::with_capacity(1 + 4 + payload.len());
		plaintext.push(msg_type);
		plaintext.extend_from_slice(&(payload.len() as u32).to_be_bytes());
		plaintext.extend_from_slice(payload);

		// Encrypt and send in chunks (Noise max message = 65535)
		let mut buf = vec![0u8; MAX_NOISE_MSG];
		for chunk in plaintext.chunks(MAX_PLAINTEXT_CHUNK) {
			let len = self
				.noise
				.write_message(chunk, &mut buf)
				.map_err(|e| format!("Noise encrypt failed: {e}"))?;
			self.stream
				.write_all(&(len as u16).to_be_bytes())
				.await
				.map_err(|e| format!("Write chunk len failed: {e}"))?;
			self.stream
				.write_all(&buf[..len])
				.await
				.map_err(|e| format!("Write chunk failed: {e}"))?;
		}

		// Zero-length terminator
		self.stream
			.write_all(&0u16.to_be_bytes())
			.await
			.map_err(|e| format!("Write terminator failed: {e}"))?;
		self.stream
			.flush()
			.await
			.map_err(|e| format!("Flush failed: {e}"))?;

		self.last_activity = Instant::now();
		Ok(())
	}

	/// Receives and decrypts a message, returning `(msg_type, payload)`.
	pub async fn recv(&mut self) -> Result<(u8, Vec<u8>), String> {
		let mut plaintext = Vec::new();
		let mut buf = vec![0u8; MAX_NOISE_MSG];

		loop {
			let mut len_buf = [0u8; 2];
			self.stream
				.read_exact(&mut len_buf)
				.await
				.map_err(|e| format!("Read chunk len failed: {e}"))?;
			let chunk_len = u16::from_be_bytes(len_buf) as usize;

			if chunk_len == 0 {
				break;
			}

			if chunk_len > MAX_NOISE_MSG {
				return Err(format!("Chunk too large: {chunk_len}"));
			}

			let mut encrypted = vec![0u8; chunk_len];
			self.stream
				.read_exact(&mut encrypted)
				.await
				.map_err(|e| format!("Read chunk failed: {e}"))?;

			let len = self
				.noise
				.read_message(&encrypted, &mut buf)
				.map_err(|e| format!("Noise decrypt failed: {e}"))?;
			plaintext.extend_from_slice(&buf[..len]);

			// Early rejection of oversized messages
			if plaintext.len() > 5 + MAX_PAYLOAD_SIZE {
				return Err("Message exceeds maximum size".to_string());
			}
		}

		if plaintext.len() < 5 {
			return Err(format!("Message too short: {} bytes", plaintext.len()));
		}

		let msg_type = plaintext[0];
		let payload_len = u32::from_be_bytes([plaintext[1], plaintext[2], plaintext[3], plaintext[4]])
			as usize;

		if payload_len > MAX_PAYLOAD_SIZE {
			return Err(format!(
				"Payload too large: {payload_len} bytes (max {MAX_PAYLOAD_SIZE})"
			));
		}

		if plaintext.len() != 5 + payload_len {
			return Err(format!(
				"Message length mismatch: expected {}, got {}",
				5 + payload_len,
				plaintext.len()
			));
		}

		self.last_activity = Instant::now();
		Ok((msg_type, plaintext[5..].to_vec()))
	}

	/// Returns the time of the last send or receive activity.
	pub fn last_activity(&self) -> Instant {
		self.last_activity
	}
}

// ---------------------------------------------------------------------------
// Handshake helpers
// ---------------------------------------------------------------------------

/// Writes the next outgoing handshake message.
fn hs_write(hs: &mut snow::HandshakeState) -> Result<Vec<u8>, String> {
	let mut buf = vec![0u8; MAX_NOISE_MSG];
	let len = hs
		.write_message(&[], &mut buf)
		.map_err(|e| format!("Noise handshake write failed: {e}"))?;
	Ok(buf[..len].to_vec())
}

/// Processes an incoming handshake message.
fn hs_read(hs: &mut snow::HandshakeState, msg: &[u8]) -> Result<(), String> {
	let mut buf = vec![0u8; MAX_NOISE_MSG];
	hs.read_message(msg, &mut buf)
		.map_err(|e| format!("Noise handshake read failed: {e}"))?;
	Ok(())
}

// ---------------------------------------------------------------------------
// Wire-level framing: [u16 BE length][data]
// ---------------------------------------------------------------------------

/// Writes a length-prefixed frame to the stream.
async fn write_frame(stream: &mut TcpStream, data: &[u8]) -> Result<(), String> {
	let len = data.len() as u16;
	stream
		.write_all(&len.to_be_bytes())
		.await
		.map_err(|e| format!("Write frame len failed: {e}"))?;
	stream
		.write_all(data)
		.await
		.map_err(|e| format!("Write frame data failed: {e}"))?;
	Ok(())
}

/// Reads a length-prefixed frame from the stream.
async fn read_frame(stream: &mut TcpStream) -> Result<Vec<u8>, String> {
	let mut len_buf = [0u8; 2];
	stream
		.read_exact(&mut len_buf)
		.await
		.map_err(|e| format!("Read frame len failed: {e}"))?;
	let len = u16::from_be_bytes(len_buf) as usize;
	if len > MAX_NOISE_MSG {
		return Err(format!("Frame too large: {len}"));
	}
	let mut buf = vec![0u8; len];
	stream
		.read_exact(&mut buf)
		.await
		.map_err(|e| format!("Read frame data failed: {e}"))?;
	Ok(buf)
}
