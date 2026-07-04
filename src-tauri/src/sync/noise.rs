//! Noise handshake and encrypted channel for sync connections.
//!
//! Pattern `Noise_XXpsk3_25519_ChaChaPoly_BLAKE2s`: each side generates a
//! fresh static keypair per session; identity comes from the 32-byte
//! pre-shared pairing key, not from the statics. A wrong PSK fails the
//! handshake before any application data flows, and every byte on the wire
//! is indistinguishable from random data.

use snow::{Builder, TransportState};
use tokio::io::{AsyncRead, AsyncWrite};

use super::protocol::{decode_msg, encode_msg, read_frame, write_frame, Msg, MAX_PLAINTEXT_LEN};

const NOISE_PARAMS: &str = "Noise_XXpsk3_25519_ChaChaPoly_BLAKE2s";
/// PSK slot for the `psk3` modifier (mixed into the third handshake message).
const PSK_POSITION: u8 = 3;

/// Generate a new pairing key: 32 random bytes as 64 lowercase hex chars.
pub fn generate_pairing_key() -> Result<String, String> {
	let mut key = [0u8; 32];
	getrandom::fill(&mut key).map_err(|e| format!("random generation failed: {e}"))?;
	Ok(key.iter().map(|b| format!("{:02x}", b)).collect())
}

/// Parse a hex pairing key into the 32-byte PSK. Trims surrounding whitespace.
pub fn parse_pairing_key(hex: &str) -> Result<[u8; 32], String> {
	let hex = hex.trim();
	if hex.len() != 64 {
		return Err(format!("pairing key must be 64 hex chars, got {}", hex.len()));
	}
	let mut key = [0u8; 32];
	for (i, chunk) in hex.as_bytes().chunks(2).enumerate() {
		let s = std::str::from_utf8(chunk).map_err(|_| "pairing key is not valid hex".to_string())?;
		key[i] = u8::from_str_radix(s, 16).map_err(|_| "pairing key is not valid hex".to_string())?;
	}
	Ok(key)
}

/// Encrypted message channel over any byte stream. One `Msg` per Noise message.
pub struct NoiseChannel<S> {
	stream: S,
	noise: TransportState,
}

impl<S: AsyncRead + AsyncWrite + Unpin> NoiseChannel<S> {
	/// Encrypt and send one message.
	pub async fn send(&mut self, msg: &Msg) -> Result<(), String> {
		let plain = encode_msg(msg)?;
		if plain.len() > MAX_PLAINTEXT_LEN {
			return Err(format!("message too large: {} bytes", plain.len()));
		}
		let mut buf = vec![0u8; plain.len() + 16];
		let n = self.noise.write_message(&plain, &mut buf).map_err(|e| format!("encrypt failed: {e}"))?;
		write_frame(&mut self.stream, &buf[..n]).await
	}

	/// Receive and decrypt one message.
	pub async fn recv(&mut self) -> Result<Msg, String> {
		let frame = read_frame(&mut self.stream).await?;
		let mut buf = vec![0u8; frame.len()];
		let n = self.noise.read_message(&frame, &mut buf).map_err(|e| format!("decrypt failed: {e}"))?;
		decode_msg(&buf[..n])
	}
}

/// Run the XXpsk3 handshake as initiator (the machine whose user clicked sync).
pub async fn handshake_initiator<S: AsyncRead + AsyncWrite + Unpin>(
	stream: S,
	psk: &[u8; 32],
) -> Result<NoiseChannel<S>, String> {
	handshake(stream, psk, true).await
}

/// Run the XXpsk3 handshake as responder (the listening machine).
pub async fn handshake_responder<S: AsyncRead + AsyncWrite + Unpin>(
	stream: S,
	psk: &[u8; 32],
) -> Result<NoiseChannel<S>, String> {
	handshake(stream, psk, false).await
}

async fn handshake<S: AsyncRead + AsyncWrite + Unpin>(
	mut stream: S,
	psk: &[u8; 32],
	initiator: bool,
) -> Result<NoiseChannel<S>, String> {
	// XX requires a local static keypair; ours is throwaway per session
	// because authentication comes from the PSK alone.
	let params: snow::params::NoiseParams =
		NOISE_PARAMS.parse().map_err(|e| format!("noise params: {e}"))?;
	let keypair = Builder::new(NOISE_PARAMS.parse().map_err(|e| format!("noise params: {e}"))?)
		.generate_keypair()
		.map_err(|e| format!("keypair generation failed: {e}"))?;
	let builder = Builder::new(params)
		.local_private_key(&keypair.private)
		.map_err(|e| format!("noise key setup failed: {e}"))?
		.psk(PSK_POSITION, psk)
		.map_err(|e| format!("noise psk setup failed: {e}"))?;
	let mut hs = if initiator {
		builder.build_initiator()
	} else {
		builder.build_responder()
	}
	.map_err(|e| format!("noise build failed: {e}"))?;

	let mut buf = vec![0u8; 65_535];
	if initiator {
		// -> e
		let n = hs.write_message(&[], &mut buf).map_err(|e| format!("handshake failed: {e}"))?;
		write_frame(&mut stream, &buf[..n]).await?;
		// <- e ee s es
		let frame = read_frame(&mut stream).await?;
		hs.read_message(&frame, &mut buf).map_err(|e| format!("handshake failed: {e}"))?;
		// -> s se (PSK mixed here)
		let n = hs.write_message(&[], &mut buf).map_err(|e| format!("handshake failed: {e}"))?;
		write_frame(&mut stream, &buf[..n]).await?;
	} else {
		let frame = read_frame(&mut stream).await?;
		hs.read_message(&frame, &mut buf).map_err(|e| format!("handshake failed: {e}"))?;
		let n = hs.write_message(&[], &mut buf).map_err(|e| format!("handshake failed: {e}"))?;
		write_frame(&mut stream, &buf[..n]).await?;
		let frame = read_frame(&mut stream).await?;
		hs.read_message(&frame, &mut buf).map_err(|e| format!("handshake failed: {e}"))?;
	}
	let noise = hs.into_transport_mode().map_err(|e| format!("handshake incomplete: {e}"))?;
	Ok(NoiseChannel { stream, noise })
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::sync::protocol::Msg;

	#[test]
	fn generated_pairing_keys_are_64_hex_and_unique() {
		let a = generate_pairing_key().unwrap();
		let b = generate_pairing_key().unwrap();
		assert_eq!(a.len(), 64);
		assert!(a.chars().all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase()));
		assert_ne!(a, b);
	}

	#[test]
	fn parse_pairing_key_roundtrips_and_trims() {
		let hex = generate_pairing_key().unwrap();
		let key = parse_pairing_key(&format!("  {hex}\n")).unwrap();
		let rehex: String = key.iter().map(|b| format!("{:02x}", b)).collect();
		assert_eq!(rehex, hex);
	}

	#[test]
	fn parse_pairing_key_rejects_bad_input() {
		assert!(parse_pairing_key("abc").is_err());
		assert!(parse_pairing_key(&"zz".repeat(32)).is_err());
	}

	#[tokio::test]
	async fn handshake_and_encrypted_roundtrip() {
		let psk = parse_pairing_key(&generate_pairing_key().unwrap()).unwrap();
		let (a, b) = tokio::io::duplex(65_536);
		let (init, resp) = tokio::join!(handshake_initiator(a, &psk), handshake_responder(b, &psk));
		let (mut init, mut resp) = (init.unwrap(), resp.unwrap());
		init.send(&Msg::ListShares).await.unwrap();
		assert_eq!(resp.recv().await.unwrap(), Msg::ListShares);
		resp.send(&Msg::Shares { folders: vec!["Notes".into()] }).await.unwrap();
		assert_eq!(init.recv().await.unwrap(), Msg::Shares { folders: vec!["Notes".into()] });
	}

	#[tokio::test]
	async fn wrong_psk_fails_handshake_on_responder() {
		let psk_a = parse_pairing_key(&generate_pairing_key().unwrap()).unwrap();
		let psk_b = parse_pairing_key(&generate_pairing_key().unwrap()).unwrap();
		let (a, b) = tokio::io::duplex(65_536);
		let (_init, resp) = tokio::join!(handshake_initiator(a, &psk_a), handshake_responder(b, &psk_b));
		assert!(resp.is_err());
	}

	#[tokio::test]
	async fn oversized_message_is_rejected_before_send() {
		let psk = parse_pairing_key(&generate_pairing_key().unwrap()).unwrap();
		let (a, b) = tokio::io::duplex(65_536);
		let (init, resp) = tokio::join!(handshake_initiator(a, &psk), handshake_responder(b, &psk));
		let mut init = init.unwrap();
		let _resp = resp.unwrap();
		let big = Msg::FileChunk { data: vec![0u8; MAX_PLAINTEXT_LEN + 1] };
		let err = init.send(&big).await.unwrap_err();
		assert!(err.contains("too large"), "got: {err}");
	}
}
