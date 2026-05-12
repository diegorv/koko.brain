//! Integration tests for `sync::transport`: Noise XX handshake,
//! framing, fingerprint verification, and round-trip messaging.
//!
//! All tests use `tokio::io::duplex` to wire an in-process pair of
//! [`AsyncRead`] + [`AsyncWrite`] streams so we never touch a real
//! socket. The two halves are passed into [`open_to`] (initiator) and
//! [`accept`] (responder), which run concurrently via `tokio::join!`.

use kokobrain_lib::sync::transport::{
	accept, fingerprint_hex_from_static, open_to, static_keys_from_ed25519_secret,
	StaticKeys, TransportError, FRAME_LEN_PREFIX_BYTES, MAX_FRAME_BYTES, NOISE_PARAMS,
};
use tokio::io::AsyncWriteExt;

/// Duplex buffer size large enough to hold a handshake message plus a
/// few MiB of application data without blocking the writer.
const DUPLEX_CAP: usize = 4 * 1024 * 1024;

// --- constants ---

#[test]
fn noise_params_string_is_xx_aesgcm_sha256() {
	assert_eq!(NOISE_PARAMS, "Noise_XX_25519_AESGCM_SHA256");
}

#[test]
fn frame_len_prefix_is_four_bytes() {
	assert_eq!(FRAME_LEN_PREFIX_BYTES, 4);
}

#[test]
fn max_frame_bytes_is_eight_mib() {
	assert_eq!(MAX_FRAME_BYTES, 8 * 1024 * 1024);
}

// --- static_keys_from_ed25519_secret ---

#[test]
fn static_keys_are_deterministic_for_the_same_secret() {
	let secret = [7_u8; 32];
	let a = static_keys_from_ed25519_secret(&secret);
	let b = static_keys_from_ed25519_secret(&secret);
	assert_eq!(a.private, b.private);
	assert_eq!(a.public, b.public);
}

#[test]
fn static_keys_differ_across_different_secrets() {
	let a = static_keys_from_ed25519_secret(&[1_u8; 32]);
	let b = static_keys_from_ed25519_secret(&[2_u8; 32]);
	assert_ne!(a.private, b.private);
	assert_ne!(a.public, b.public);
}

#[test]
fn static_private_key_is_rfc7748_clamped() {
	let keys = static_keys_from_ed25519_secret(&[0xff_u8; 32]);
	// Bottom three bits of byte 0 cleared.
	assert_eq!(keys.private[0] & 0b0000_0111, 0);
	// High bit of byte 31 cleared.
	assert_eq!(keys.private[31] & 0b1000_0000, 0);
	// Second-highest bit of byte 31 set.
	assert_eq!(keys.private[31] & 0b0100_0000, 0b0100_0000);
}

// --- fingerprint_hex_from_static ---

#[test]
fn fingerprint_hex_is_sixteen_lowercase_hex_chars() {
	let keys = static_keys_from_ed25519_secret(&[42_u8; 32]);
	let hex = fingerprint_hex_from_static(&keys.public);
	assert_eq!(hex.len(), 16);
	assert!(hex.chars().all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase()));
}

#[test]
fn fingerprint_hex_is_stable_for_the_same_key() {
	let pk = [0xab_u8; 32];
	assert_eq!(fingerprint_hex_from_static(&pk), fingerprint_hex_from_static(&pk));
}

#[test]
fn fingerprint_hex_differs_for_different_keys() {
	let a = fingerprint_hex_from_static(&[1_u8; 32]);
	let b = fingerprint_hex_from_static(&[2_u8; 32]);
	assert_ne!(a, b);
}

// --- handshake helpers ---

/// Returns two deterministic static keypairs used across the
/// async-handshake tests below.
fn pair_keys() -> (StaticKeys, StaticKeys) {
	(
		static_keys_from_ed25519_secret(&[0x11_u8; 32]),
		static_keys_from_ed25519_secret(&[0x22_u8; 32]),
	)
}

// --- successful handshake ---

#[tokio::test]
async fn handshake_succeeds_when_fingerprints_match() {
	let (initiator_keys, responder_keys) = pair_keys();
	let responder_fp = fingerprint_hex_from_static(&responder_keys.public);
	let initiator_fp = fingerprint_hex_from_static(&initiator_keys.public);

	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let initiator = tokio::spawn(async move {
		open_to(init_side, &initiator_keys, &responder_fp).await
	});
	let responder = tokio::spawn({
		let responder_keys = responder_keys.clone();
		let initiator_fp = initiator_fp.clone();
		async move {
			accept(resp_side, &responder_keys, |fp| fp == initiator_fp).await
		}
	});

	let init_session = initiator.await.unwrap().expect("initiator handshake");
	let resp_session = responder.await.unwrap().expect("responder handshake");

	// Each side learned the other's verified static public key.
	assert_eq!(init_session.remote_static(), responder_keys.public);
	let (initiator_keys2, _) = pair_keys();
	assert_eq!(resp_session.remote_static(), initiator_keys2.public);
}

// --- round-trip messages ---

#[tokio::test]
async fn round_trip_small_and_large_payloads() {
	let (initiator_keys, responder_keys) = pair_keys();
	let responder_fp = fingerprint_hex_from_static(&responder_keys.public);
	let initiator_fp = fingerprint_hex_from_static(&initiator_keys.public);

	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let init_keys_clone = initiator_keys.clone();
	let resp_keys_clone = responder_keys.clone();

	let initiator = tokio::spawn(async move {
		let mut s = open_to(init_side, &init_keys_clone, &responder_fp).await.unwrap();
		s.send(b"x").await.unwrap();
		s.send(&[7_u8; 1024]).await.unwrap();
		// Read echo of the 1024 payload back.
		let echo_small = s.recv().await.unwrap();
		assert_eq!(echo_small, b"X");
		let echo_kb = s.recv().await.unwrap();
		assert_eq!(echo_kb.len(), 1024);
		assert!(echo_kb.iter().all(|&b| b == 7));
	});
	let responder = tokio::spawn(async move {
		let mut s = accept(resp_side, &resp_keys_clone, |fp| fp == initiator_fp).await.unwrap();
		let one = s.recv().await.unwrap();
		assert_eq!(one, b"x");
		let kb = s.recv().await.unwrap();
		assert_eq!(kb.len(), 1024);
		assert!(kb.iter().all(|&b| b == 7));
		s.send(b"X").await.unwrap();
		s.send(&[7_u8; 1024]).await.unwrap();
	});

	initiator.await.unwrap();
	responder.await.unwrap();
}

#[tokio::test]
async fn multiple_round_trips_on_the_same_session() {
	let (initiator_keys, responder_keys) = pair_keys();
	let responder_fp = fingerprint_hex_from_static(&responder_keys.public);
	let initiator_fp = fingerprint_hex_from_static(&initiator_keys.public);

	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let init_keys_clone = initiator_keys.clone();
	let resp_keys_clone = responder_keys.clone();

	let initiator = tokio::spawn(async move {
		let mut s = open_to(init_side, &init_keys_clone, &responder_fp).await.unwrap();
		for i in 0_u8..10 {
			s.send(&[i]).await.unwrap();
			let echo = s.recv().await.unwrap();
			assert_eq!(echo, vec![i ^ 0xff]);
		}
	});
	let responder = tokio::spawn(async move {
		let mut s = accept(resp_side, &resp_keys_clone, |fp| fp == initiator_fp).await.unwrap();
		for _ in 0..10 {
			let msg = s.recv().await.unwrap();
			let reply: Vec<u8> = msg.iter().map(|b| b ^ 0xff).collect();
			s.send(&reply).await.unwrap();
		}
	});

	initiator.await.unwrap();
	responder.await.unwrap();
}

// --- mismatch / reject paths ---

#[tokio::test]
async fn initiator_rejects_mismatched_responder_fingerprint() {
	let (initiator_keys, responder_keys) = pair_keys();
	// Wrong expected fingerprint — derive from a third key.
	let other_keys = static_keys_from_ed25519_secret(&[0x99_u8; 32]);
	let wrong_fp = fingerprint_hex_from_static(&other_keys.public);
	let initiator_fp = fingerprint_hex_from_static(&initiator_keys.public);

	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let init_keys_clone = initiator_keys.clone();
	let resp_keys_clone = responder_keys.clone();
	let wrong_fp_for_task = wrong_fp.clone();

	let initiator = tokio::spawn(async move {
		open_to(init_side, &init_keys_clone, &wrong_fp_for_task).await
	});
	let responder = tokio::spawn(async move {
		accept(resp_side, &resp_keys_clone, |fp| fp == initiator_fp).await
	});

	let init_result = initiator.await.unwrap();
	let _ = responder.await.unwrap();

	match init_result {
		Err(TransportError::PeerMismatch { expected_hex, got_hex }) => {
			assert_eq!(expected_hex, wrong_fp);
			assert_eq!(got_hex, fingerprint_hex_from_static(&responder_keys.public));
			assert_ne!(expected_hex, got_hex);
		}
		Ok(_) => panic!("expected PeerMismatch, got Ok(Session)"),
		Err(other) => panic!("expected PeerMismatch, got {other:?}"),
	}
}

#[tokio::test]
async fn responder_rejects_when_predicate_returns_false() {
	let (initiator_keys, responder_keys) = pair_keys();
	let responder_fp = fingerprint_hex_from_static(&responder_keys.public);

	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let init_keys_clone = initiator_keys.clone();
	let resp_keys_clone = responder_keys.clone();

	let initiator = tokio::spawn(async move {
		// Initiator may succeed or fail depending on whether the
		// responder finished writing msg 2 before the mismatch path
		// dropped the stream. The point of this test is the responder.
		let _ = open_to(init_side, &init_keys_clone, &responder_fp).await;
	});
	let responder = tokio::spawn(async move {
		accept(resp_side, &resp_keys_clone, |_| false).await
	});

	let _ = initiator.await.unwrap();
	let resp_result = responder.await.unwrap();

	match resp_result {
		Err(TransportError::PeerMismatch { expected_hex, got_hex }) => {
			assert_eq!(expected_hex, "");
			assert_eq!(got_hex, fingerprint_hex_from_static(&initiator_keys.public));
		}
		Ok(_) => panic!("expected PeerMismatch, got Ok(Session)"),
		Err(other) => panic!("expected PeerMismatch, got {other:?}"),
	}
}

// --- framing limits ---

#[tokio::test]
async fn responder_rejects_oversized_handshake_frame_before_allocating() {
	// The framing layer is shared between handshake messages and
	// transport frames; rejecting an oversized length prefix during
	// the first handshake read is sufficient to prove the guard
	// triggers before any allocation. A fully-handshook session
	// can't be observed for this property without opening private
	// internals, so we exercise the same code path via `accept`.
	let (_, responder_keys) = pair_keys();
	let resp_keys_clone = responder_keys.clone();

	let (mut init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let responder = tokio::spawn(async move {
		accept(resp_side, &resp_keys_clone, |_| true).await
	});

	// Send a length prefix that exceeds MAX_FRAME_BYTES without any
	// payload. The responder should reject before reading any bytes
	// past the prefix.
	let oversize = (MAX_FRAME_BYTES as u32 + 1).to_be_bytes();
	init_side.write_all(&oversize).await.unwrap();
	// Keep the write half open so the responder reads the prefix.
	drop(init_side);

	let result = responder.await.unwrap();
	match result {
		Err(TransportError::FrameTooLarge(n)) => {
			assert_eq!(n, MAX_FRAME_BYTES + 1);
		}
		Ok(_) => panic!("expected FrameTooLarge, got Ok(Session)"),
		Err(other) => panic!("expected FrameTooLarge, got {other:?}"),
	}
}

#[tokio::test]
async fn send_rejects_payload_larger_than_noise_message_limit() {
	// snow caps one transport message at 65535 bytes, of which 16 go
	// to the AES-GCM tag. Anything larger must be rejected before
	// touching the wire.
	let (initiator_keys, responder_keys) = pair_keys();
	let responder_fp = fingerprint_hex_from_static(&responder_keys.public);
	let initiator_fp = fingerprint_hex_from_static(&initiator_keys.public);

	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let init_keys_clone = initiator_keys.clone();
	let resp_keys_clone = responder_keys.clone();

	let initiator = tokio::spawn(async move {
		let mut s = open_to(init_side, &init_keys_clone, &responder_fp).await.unwrap();
		let huge = vec![0_u8; u16::MAX as usize]; // > MAX_PLAIN (65519)
		s.send(&huge).await
	});
	let responder = tokio::spawn(async move {
		let _ = accept(resp_side, &resp_keys_clone, |fp| fp == initiator_fp).await.unwrap();
		// Hold the session so the initiator's send goes through framing
		// rather than failing on broken pipe. We don't recv anything.
	});

	let result = initiator.await.unwrap();
	let _ = responder.await.unwrap();
	match result {
		Err(TransportError::FrameTooLarge(_)) => {}
		Ok(()) => panic!("expected FrameTooLarge, got Ok(())"),
		Err(other) => panic!("expected FrameTooLarge, got {other:?}"),
	}
}

// --- session metadata ---

#[tokio::test]
async fn remote_static_matches_peer_public_key() {
	let (initiator_keys, responder_keys) = pair_keys();
	let responder_fp = fingerprint_hex_from_static(&responder_keys.public);
	let initiator_fp = fingerprint_hex_from_static(&initiator_keys.public);

	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let init_keys_clone = initiator_keys.clone();
	let resp_keys_clone = responder_keys.clone();
	let initiator_pub = initiator_keys.public;
	let responder_pub = responder_keys.public;

	let initiator = tokio::spawn(async move {
		open_to(init_side, &init_keys_clone, &responder_fp).await
	});
	let responder = tokio::spawn(async move {
		accept(resp_side, &resp_keys_clone, |fp| fp == initiator_fp).await
	});

	let init_session = initiator.await.unwrap().unwrap();
	let resp_session = responder.await.unwrap().unwrap();

	assert_eq!(init_session.remote_static(), responder_pub);
	assert_eq!(resp_session.remote_static(), initiator_pub);
}

// --- ephemeral keys ensure forward secrecy ---

#[tokio::test]
async fn two_sessions_have_independent_state_no_replay() {
	// Forward secrecy in Noise XX comes from a fresh ephemeral key
	// pair on each handshake. We can't observe raw ciphertext without
	// monkey-patching the stream, but we can prove two sequential
	// sessions with the same static keys complete successfully and
	// produce identical verified remote-static bytes — i.e. neither
	// session's transport state bleeds into the next. State bleed
	// would manifest as a handshake decryption failure on round 2.
	let (initiator_keys, responder_keys) = pair_keys();
	let responder_fp = fingerprint_hex_from_static(&responder_keys.public);
	let initiator_fp = fingerprint_hex_from_static(&initiator_keys.public);

	for _ in 0..2 {
		let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);
		let init_keys_clone = initiator_keys.clone();
		let resp_keys_clone = responder_keys.clone();
		let resp_fp = responder_fp.clone();
		let init_fp = initiator_fp.clone();
		let initiator = tokio::spawn(async move {
			let mut s = open_to(init_side, &init_keys_clone, &resp_fp).await.unwrap();
			s.send(b"probe").await.unwrap();
			s.remote_static()
		});
		let responder = tokio::spawn(async move {
			let mut s = accept(resp_side, &resp_keys_clone, |fp| fp == init_fp).await.unwrap();
			let msg = s.recv().await.unwrap();
			assert_eq!(msg, b"probe");
			s.remote_static()
		});
		assert_eq!(initiator.await.unwrap(), responder_keys.public);
		assert_eq!(responder.await.unwrap(), initiator_keys.public);
	}
}
