//! Integration tests for `sync::transport`: Noise XX handshake,
//! framing, post-handshake [`IdentityProof`] exchange, Ed25519
//! fingerprint verification, and round-trip messaging.
//!
//! All tests use `tokio::io::duplex` to wire an in-process pair of
//! [`AsyncRead`] + [`AsyncWrite`] streams so we never touch a real
//! socket. The two halves are passed into [`open_to`] (initiator) and
//! [`accept`] (responder), which run concurrently via `tokio::spawn`.
//!
//! ## Hotfix H2 surface
//!
//! Every handshake test constructs an on-disk `DeviceIdentity` for
//! each side from a hard-coded Ed25519 seed and pairs it with a
//! `StaticKeys` derived from the same seed. Because the binding
//! signature carried in the `IdentityProof` is over the X25519 public
//! derived from that same seed, the Noise handshake and the proof
//! exchange agree on which X25519 belongs to which Ed25519 identity.

use std::fs;

use ed25519_dalek::{Signature, VerifyingKey, SIGNATURE_LENGTH};
use kokobrain_lib::sync::identity::{DeviceIdentity, IdentityProof};
use kokobrain_lib::sync::transport::{
	accept, open_to, static_keys_from_ed25519_secret, StaticKeys, TransportError,
	FRAME_LEN_PREFIX_BYTES, MAX_FRAME_BYTES, NOISE_PARAMS,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use tempfile::TempDir;
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

// --- handshake helpers ---

/// Returns two deterministic Ed25519 secret seeds used across the
/// async-handshake tests below. The initiator + responder use the
/// same seeds for both the X25519 derivation (`StaticKeys`) and the
/// `DeviceIdentity` so the binding signature lines up with the
/// Noise-authenticated X25519 static.
const INIT_SEED: [u8; 32] = [0x11_u8; 32];
const RESP_SEED: [u8; 32] = [0x22_u8; 32];

/// Returns matched X25519 static keypairs for the initiator and
/// responder, derived from the test-wide seeds.
fn pair_keys() -> (StaticKeys, StaticKeys) {
	(
		static_keys_from_ed25519_secret(&INIT_SEED),
		static_keys_from_ed25519_secret(&RESP_SEED),
	)
}

/// Builds a `DeviceIdentity` from `seed` by pre-writing the secret
/// file then calling `load_or_create`. The returned tempdir owns the
/// `identity-binding.sig` file and must outlive any session whose
/// proof was built from this identity.
fn identity_for(seed: &[u8; 32]) -> (DeviceIdentity, TempDir) {
	let tmp = TempDir::new().unwrap();
	let path = tmp.path().join("identity.key");
	fs::write(&path, seed).unwrap();
	let id = DeviceIdentity::load_or_create(&path).unwrap();
	(id, tmp)
}

// --- fingerprint surfaces on a successful handshake ---

#[tokio::test]
async fn handshake_succeeds_when_fingerprints_match() {
	let (init_keys, resp_keys) = pair_keys();
	let (init_id, _it) = identity_for(&INIT_SEED);
	let (resp_id, _rt) = identity_for(&RESP_SEED);
	let resp_fp = resp_id.fingerprint_hex();
	let init_fp = init_id.fingerprint_hex();
	let init_proof = init_id.identity_proof();
	let resp_proof = resp_id.identity_proof();
	let init_ed_pub = *init_id.public_key().as_bytes();
	let resp_ed_pub = *resp_id.public_key().as_bytes();

	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let resp_fp_for_task = resp_fp.clone();
	let init_fp_for_task = init_fp.clone();
	let initiator = tokio::spawn(async move {
		open_to(init_side, &init_keys, &init_proof, &resp_fp_for_task).await
	});
	let responder = tokio::spawn(async move {
		accept(resp_side, &resp_keys, &resp_proof, |fp| fp == init_fp_for_task).await
	});

	let init_session = initiator.await.unwrap().expect("initiator handshake");
	let resp_session = responder.await.unwrap().expect("responder handshake");

	// Each side learned the other's verified static X25519 public key.
	let (init_keys2, resp_keys2) = pair_keys();
	assert_eq!(init_session.remote_static(), resp_keys2.public);
	assert_eq!(resp_session.remote_static(), init_keys2.public);

	// Each side learned the other's verified Ed25519 public key.
	assert_eq!(init_session.remote_ed25519_pub(), resp_ed_pub);
	assert_eq!(resp_session.remote_ed25519_pub(), init_ed_pub);

	// Ed25519 fingerprint surface matches what each side's identity reports.
	assert_eq!(init_session.remote_ed25519_fingerprint_hex(), resp_fp);
	assert_eq!(resp_session.remote_ed25519_fingerprint_hex(), init_fp);
}

// --- round-trip messages ---

#[tokio::test]
async fn round_trip_small_and_large_payloads() {
	let (init_keys, resp_keys) = pair_keys();
	let (init_id, _it) = identity_for(&INIT_SEED);
	let (resp_id, _rt) = identity_for(&RESP_SEED);
	let resp_fp = resp_id.fingerprint_hex();
	let init_fp = init_id.fingerprint_hex();
	let init_proof = init_id.identity_proof();
	let resp_proof = resp_id.identity_proof();

	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let initiator = tokio::spawn(async move {
		let mut s = open_to(init_side, &init_keys, &init_proof, &resp_fp).await.unwrap();
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
		let mut s = accept(resp_side, &resp_keys, &resp_proof, |fp| fp == init_fp).await.unwrap();
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
	let (init_keys, resp_keys) = pair_keys();
	let (init_id, _it) = identity_for(&INIT_SEED);
	let (resp_id, _rt) = identity_for(&RESP_SEED);
	let resp_fp = resp_id.fingerprint_hex();
	let init_fp = init_id.fingerprint_hex();
	let init_proof = init_id.identity_proof();
	let resp_proof = resp_id.identity_proof();

	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let initiator = tokio::spawn(async move {
		let mut s = open_to(init_side, &init_keys, &init_proof, &resp_fp).await.unwrap();
		for i in 0_u8..10 {
			s.send(&[i]).await.unwrap();
			let echo = s.recv().await.unwrap();
			assert_eq!(echo, vec![i ^ 0xff]);
		}
	});
	let responder = tokio::spawn(async move {
		let mut s = accept(resp_side, &resp_keys, &resp_proof, |fp| fp == init_fp).await.unwrap();
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
async fn initiator_rejects_mismatched_responder_ed25519_fingerprint() {
	let (init_keys, resp_keys) = pair_keys();
	let (init_id, _it) = identity_for(&INIT_SEED);
	let (resp_id, _rt) = identity_for(&RESP_SEED);
	let init_proof = init_id.identity_proof();
	let resp_proof = resp_id.identity_proof();
	let real_resp_fp = resp_id.fingerprint_hex();
	let wrong_fp = "deadbeefdeadbeef".to_string();
	let init_fp = init_id.fingerprint_hex();

	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let wrong_fp_for_task = wrong_fp.clone();
	let initiator = tokio::spawn(async move {
		open_to(init_side, &init_keys, &init_proof, &wrong_fp_for_task).await
	});
	let responder = tokio::spawn(async move {
		accept(resp_side, &resp_keys, &resp_proof, |fp| fp == init_fp).await
	});

	let init_result = initiator.await.unwrap();
	let _ = responder.await.unwrap();

	match init_result {
		Err(TransportError::IdentityRejected { reason }) => {
			assert!(
				reason.contains(&wrong_fp) && reason.contains(&real_resp_fp),
				"expected reason to mention both fingerprints, got {reason:?}"
			);
		}
		Ok(_) => panic!("expected IdentityRejected, got Ok(Session)"),
		Err(other) => panic!("expected IdentityRejected, got {other:?}"),
	}
}

#[tokio::test]
async fn responder_rejects_when_predicate_returns_false() {
	let (init_keys, resp_keys) = pair_keys();
	let (init_id, _it) = identity_for(&INIT_SEED);
	let (resp_id, _rt) = identity_for(&RESP_SEED);
	let init_proof = init_id.identity_proof();
	let resp_proof = resp_id.identity_proof();
	let resp_fp = resp_id.fingerprint_hex();
	let init_fp = init_id.fingerprint_hex();

	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let initiator = tokio::spawn(async move {
		// Initiator may succeed or fail depending on whether the
		// responder finished writing its proof before the rejection
		// path dropped the stream. The point of this test is the
		// responder.
		let _ = open_to(init_side, &init_keys, &init_proof, &resp_fp).await;
	});
	let responder = tokio::spawn(async move {
		accept(resp_side, &resp_keys, &resp_proof, |_| false).await
	});

	let _ = initiator.await.unwrap();
	let resp_result = responder.await.unwrap();

	match resp_result {
		Err(TransportError::IdentityRejected { reason }) => {
			assert!(
				reason.contains(&init_fp),
				"reason must mention the rejected fingerprint, got {reason:?}"
			);
		}
		Ok(_) => panic!("expected IdentityRejected, got Ok(Session)"),
		Err(other) => panic!("expected IdentityRejected, got {other:?}"),
	}
}

#[tokio::test]
async fn responder_rejects_tampered_binding_signature() {
	let (init_keys, resp_keys) = pair_keys();
	let (init_id, _it) = identity_for(&INIT_SEED);
	let (resp_id, _rt) = identity_for(&RESP_SEED);
	// Build a tampered initiator proof: swap the binding signature
	// with bytes that decode to a valid `Signature` but verify against
	// nothing in particular (sign an unrelated message with a fresh
	// signing key).
	let real = init_id.identity_proof();
	let bogus_sig = [0xab_u8; SIGNATURE_LENGTH];
	let tampered_proof = IdentityProof {
		ed25519_pub_b64: real.ed25519_pub_b64.clone(),
		binding_sig_b64: BASE64.encode(bogus_sig),
	};
	let resp_proof = resp_id.identity_proof();
	let resp_fp = resp_id.fingerprint_hex();
	let init_fp = init_id.fingerprint_hex();

	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let initiator = tokio::spawn(async move {
		let _ = open_to(init_side, &init_keys, &tampered_proof, &resp_fp).await;
	});
	let responder = tokio::spawn(async move {
		accept(resp_side, &resp_keys, &resp_proof, |fp| fp == init_fp).await
	});

	let _ = initiator.await.unwrap();
	let resp_result = responder.await.unwrap();
	match resp_result {
		Err(TransportError::IdentityRejected { reason }) => {
			assert!(
				reason.contains("binding sig verify"),
				"reason must point at sig verify, got {reason:?}"
			);
		}
		Ok(_) => panic!("expected IdentityRejected, got Ok(Session)"),
		Err(other) => panic!("expected IdentityRejected, got {other:?}"),
	}
}

#[tokio::test]
async fn responder_rejects_wrong_ed25519_pub_in_proof() {
	let (init_keys, resp_keys) = pair_keys();
	let (init_id, _it) = identity_for(&INIT_SEED);
	let (resp_id, _rt) = identity_for(&RESP_SEED);
	// Build a tampered initiator proof: swap the Ed25519 public key
	// with the responder's own pub (decodes fine to a VerifyingKey but
	// won't verify against the initiator's Noise static).
	let real = init_id.identity_proof();
	let wrong_pub_b64 = BASE64.encode(resp_id.public_key().as_bytes());
	let tampered_proof = IdentityProof {
		ed25519_pub_b64: wrong_pub_b64,
		binding_sig_b64: real.binding_sig_b64.clone(),
	};
	let resp_proof = resp_id.identity_proof();
	let resp_fp = resp_id.fingerprint_hex();
	let init_fp = init_id.fingerprint_hex();

	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let initiator = tokio::spawn(async move {
		let _ = open_to(init_side, &init_keys, &tampered_proof, &resp_fp).await;
	});
	let responder = tokio::spawn(async move {
		accept(resp_side, &resp_keys, &resp_proof, |fp| fp == init_fp).await
	});

	let _ = initiator.await.unwrap();
	let resp_result = responder.await.unwrap();
	match resp_result {
		Err(TransportError::IdentityRejected { reason }) => {
			assert!(
				reason.contains("binding sig verify"),
				"reason should report sig-verify failure when pub is swapped, got {reason:?}"
			);
		}
		Ok(_) => panic!("expected IdentityRejected, got Ok(Session)"),
		Err(other) => panic!("expected IdentityRejected, got {other:?}"),
	}
	// Suppress unused warnings on Signature import; the type is used
	// implicitly via SIGNATURE_LENGTH and the binding decode paths.
	let _ = std::mem::size_of::<Signature>();
	let _ = std::mem::size_of::<VerifyingKey>();
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
	let (_, resp_keys) = pair_keys();
	let (resp_id, _rt) = identity_for(&RESP_SEED);
	let resp_proof = resp_id.identity_proof();

	let (mut init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let responder = tokio::spawn(async move {
		accept(resp_side, &resp_keys, &resp_proof, |_| true).await
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
	let (init_keys, resp_keys) = pair_keys();
	let (init_id, _it) = identity_for(&INIT_SEED);
	let (resp_id, _rt) = identity_for(&RESP_SEED);
	let resp_fp = resp_id.fingerprint_hex();
	let init_fp = init_id.fingerprint_hex();
	let init_proof = init_id.identity_proof();
	let resp_proof = resp_id.identity_proof();

	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let initiator = tokio::spawn(async move {
		let mut s = open_to(init_side, &init_keys, &init_proof, &resp_fp).await.unwrap();
		let huge = vec![0_u8; u16::MAX as usize]; // > MAX_PLAIN (65519)
		s.send(&huge).await
	});
	let responder = tokio::spawn(async move {
		let _ = accept(resp_side, &resp_keys, &resp_proof, |fp| fp == init_fp).await.unwrap();
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
	let (init_keys, resp_keys) = pair_keys();
	let (init_id, _it) = identity_for(&INIT_SEED);
	let (resp_id, _rt) = identity_for(&RESP_SEED);
	let resp_fp = resp_id.fingerprint_hex();
	let init_fp = init_id.fingerprint_hex();
	let init_proof = init_id.identity_proof();
	let resp_proof = resp_id.identity_proof();
	let init_pub = init_keys.public;
	let resp_pub = resp_keys.public;

	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let initiator = tokio::spawn(async move {
		open_to(init_side, &init_keys, &init_proof, &resp_fp).await
	});
	let responder = tokio::spawn(async move {
		accept(resp_side, &resp_keys, &resp_proof, |fp| fp == init_fp).await
	});

	let init_session = initiator.await.unwrap().unwrap();
	let resp_session = responder.await.unwrap().unwrap();

	assert_eq!(init_session.remote_static(), resp_pub);
	assert_eq!(resp_session.remote_static(), init_pub);
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
	let (init_keys_seed, resp_keys_seed) = pair_keys();
	let (init_id, _it) = identity_for(&INIT_SEED);
	let (resp_id, _rt) = identity_for(&RESP_SEED);

	for _ in 0..2 {
		let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);
		let init_keys_clone = init_keys_seed.clone();
		let resp_keys_clone = resp_keys_seed.clone();
		let resp_fp = resp_id.fingerprint_hex();
		let init_fp = init_id.fingerprint_hex();
		let init_proof = init_id.identity_proof();
		let resp_proof = resp_id.identity_proof();
		let init_pub = init_keys_clone.public;
		let resp_pub = resp_keys_clone.public;
		let initiator = tokio::spawn(async move {
			let mut s = open_to(init_side, &init_keys_clone, &init_proof, &resp_fp).await.unwrap();
			s.send(b"probe").await.unwrap();
			s.remote_static()
		});
		let responder = tokio::spawn(async move {
			let mut s = accept(resp_side, &resp_keys_clone, &resp_proof, |fp| fp == init_fp).await.unwrap();
			let msg = s.recv().await.unwrap();
			assert_eq!(msg, b"probe");
			s.remote_static()
		});
		assert_eq!(initiator.await.unwrap(), resp_pub);
		assert_eq!(responder.await.unwrap(), init_pub);
	}
}
