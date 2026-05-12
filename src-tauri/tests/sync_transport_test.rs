use ed25519_dalek::SigningKey;
use kokobrain_lib::sync::protocol::{encode_b64, HandshakeMsg};
use kokobrain_lib::sync::transport::{
	build_transcript_hash, derive_session_keys, finalize_handshake, verify_identity_proof,
	ClientHandshake, Opener, Sealer, SealedFrame, ServerHandshake, TransportError, KEY_LEN,
};
use x25519_dalek::PublicKey;

// ============================================================================
// build_transcript_hash
// ============================================================================

#[test]
fn transcript_hash_is_deterministic() {
	let h1 = build_transcript_hash(1, &[1u8; 32], &[2u8; 32], &[3u8; 8], &[4u8; 8]);
	let h2 = build_transcript_hash(1, &[1u8; 32], &[2u8; 32], &[3u8; 8], &[4u8; 8]);
	assert_eq!(h1, h2);
}

#[test]
fn transcript_hash_diverges_on_any_byte_change() {
	let base = build_transcript_hash(1, &[1u8; 32], &[2u8; 32], &[3u8; 8], &[4u8; 8]);
	let diff_version = build_transcript_hash(2, &[1u8; 32], &[2u8; 32], &[3u8; 8], &[4u8; 8]);
	let diff_client_pub = build_transcript_hash(1, &[9u8; 32], &[2u8; 32], &[3u8; 8], &[4u8; 8]);
	let diff_server_pub = build_transcript_hash(1, &[1u8; 32], &[9u8; 32], &[3u8; 8], &[4u8; 8]);
	let diff_client_nonce =
		build_transcript_hash(1, &[1u8; 32], &[2u8; 32], &[9u8; 8], &[4u8; 8]);
	let diff_server_nonce =
		build_transcript_hash(1, &[1u8; 32], &[2u8; 32], &[3u8; 8], &[9u8; 8]);
	for other in [
		diff_version,
		diff_client_pub,
		diff_server_pub,
		diff_client_nonce,
		diff_server_nonce,
	] {
		assert_ne!(base, other);
	}
}

// ============================================================================
// derive_session_keys
// ============================================================================

#[test]
fn derive_session_keys_is_deterministic() {
	let secret = [7u8; 32];
	let (a_c2s, a_s2c) = derive_session_keys(&secret, &[1u8; 8], &[2u8; 8]);
	let (b_c2s, b_s2c) = derive_session_keys(&secret, &[1u8; 8], &[2u8; 8]);
	assert_eq!(a_c2s, b_c2s);
	assert_eq!(a_s2c, b_s2c);
}

#[test]
fn derived_keys_are_distinct_per_direction() {
	let secret = [7u8; 32];
	let (c2s, s2c) = derive_session_keys(&secret, &[1u8; 8], &[2u8; 8]);
	assert_ne!(c2s, s2c);
}

#[test]
fn derived_keys_change_with_nonce() {
	let secret = [7u8; 32];
	let (k1, _) = derive_session_keys(&secret, &[1u8; 8], &[2u8; 8]);
	let (k2, _) = derive_session_keys(&secret, &[9u8; 8], &[2u8; 8]);
	let (k3, _) = derive_session_keys(&secret, &[1u8; 8], &[9u8; 8]);
	assert_ne!(k1, k2);
	assert_ne!(k1, k3);
}

#[test]
fn derived_keys_change_with_secret() {
	let (a, _) = derive_session_keys(&[1u8; 32], &[0u8; 8], &[0u8; 8]);
	let (b, _) = derive_session_keys(&[2u8; 32], &[0u8; 8], &[0u8; 8]);
	assert_ne!(a, b);
}

// ============================================================================
// Sealer / Opener round-trip
// ============================================================================

#[test]
fn seal_then_open_round_trips() {
	let key = [42u8; KEY_LEN];
	let mut sealer = Sealer::new(&key);
	let mut opener = Opener::new(&key);
	let frame = sealer.seal(b"hello, lan sync").unwrap();
	let plaintext = opener.open(&frame).unwrap();
	assert_eq!(plaintext, b"hello, lan sync");
}

#[test]
fn sealer_increments_counter() {
	let key = [42u8; KEY_LEN];
	let mut sealer = Sealer::new(&key);
	assert_eq!(sealer.next_nonce_counter(), 0);
	let f1 = sealer.seal(b"one").unwrap();
	assert_eq!(f1.counter, 0);
	let f2 = sealer.seal(b"two").unwrap();
	assert_eq!(f2.counter, 1);
	assert_eq!(sealer.next_nonce_counter(), 2);
}

#[test]
fn opener_rejects_replay() {
	let key = [42u8; KEY_LEN];
	let mut sealer = Sealer::new(&key);
	let mut opener = Opener::new(&key);
	let frame = sealer.seal(b"first").unwrap();
	assert_eq!(opener.open(&frame).unwrap(), b"first");
	// Replay the same frame — must fail.
	let err = opener.open(&frame).unwrap_err();
	assert_eq!(err, TransportError::NonceReplay);
}

#[test]
fn opener_rejects_wrong_key() {
	let mut sealer = Sealer::new(&[1u8; KEY_LEN]);
	let mut opener = Opener::new(&[2u8; KEY_LEN]);
	let frame = sealer.seal(b"plaintext").unwrap();
	let err = opener.open(&frame).unwrap_err();
	matches!(err, TransportError::Aead(_));
}

#[test]
fn opener_rejects_tampered_ciphertext() {
	let key = [42u8; KEY_LEN];
	let mut sealer = Sealer::new(&key);
	let mut opener = Opener::new(&key);
	let mut frame = sealer.seal(b"plaintext").unwrap();
	// Flip a bit in the ciphertext.
	frame.ciphertext[0] ^= 1;
	let err = opener.open(&frame).unwrap_err();
	matches!(err, TransportError::Aead(_));
}

#[test]
fn opener_accepts_many_sequential_frames() {
	let key = [42u8; KEY_LEN];
	let mut sealer = Sealer::new(&key);
	let mut opener = Opener::new(&key);
	for i in 0..50 {
		let payload = format!("frame {i}");
		let frame = sealer.seal(payload.as_bytes()).unwrap();
		let pt = opener.open(&frame).unwrap();
		assert_eq!(pt, payload.as_bytes());
	}
}

#[test]
fn sealed_frame_round_trips_through_bytes() {
	let frame = SealedFrame {
		counter: 0x0123_4567_89ab_cdef,
		ciphertext: vec![1, 2, 3, 4, 5],
	};
	let bytes = frame.to_bytes();
	let parsed = SealedFrame::from_bytes(&bytes).unwrap();
	assert_eq!(parsed, frame);
}

#[test]
fn sealed_frame_from_bytes_rejects_short_input() {
	let err = SealedFrame::from_bytes(&[1, 2, 3]).unwrap_err();
	matches!(err, TransportError::Aead(_));
}

// ============================================================================
// Full handshake round-trip + MITM detection
// ============================================================================

/// Helper: simulate both sides of a handshake end-to-end and return
/// both `EstablishedSession`s.
fn simulate_handshake(
	client_identity: &SigningKey,
	server_identity: &SigningKey,
	trust_for_server: &[ed25519_dalek::VerifyingKey],
	trust_for_client: &[ed25519_dalek::VerifyingKey],
) -> Result<
	(
		kokobrain_lib::sync::transport::EstablishedSession,
		kokobrain_lib::sync::transport::EstablishedSession,
	),
	TransportError,
> {
	let client = ClientHandshake::new();
	let server = ServerHandshake::from_client_opening(&client.opening_message())?;

	// Client computes its half of the ECDH (consumes client.eph_secret).
	let client_shared = client.eph_secret.diffie_hellman(&server.eph_pub);
	let client_eph_pub_bytes: [u8; 32] = *client.eph_pub.as_bytes();
	let server_eph_pub_bytes: [u8; 32] = *server.eph_pub.as_bytes();

	let (mut client_session, client_proof) = finalize_handshake(
		client_shared,
		&client_eph_pub_bytes,
		&server_eph_pub_bytes,
		&client.nonce,
		&server.nonce,
		server.agreed_version,
		client_identity,
		true,
	);

	// Server computes its half (consumes server.eph_secret).
	let server_shared = server.eph_secret.diffie_hellman(&PublicKey::from(client_eph_pub_bytes));

	let (mut server_session, server_proof) = finalize_handshake(
		server_shared,
		&client_eph_pub_bytes,
		&server_eph_pub_bytes,
		&client.nonce,
		&server.nonce,
		server.agreed_version,
		server_identity,
		false,
	);

	// Each side verifies the other's IdentityProof against its own trust store.
	let server_remote_pubkey = verify_identity_proof(
		&client_proof,
		&server_session.transcript_hash,
		trust_for_server,
	)?;
	let client_remote_pubkey = verify_identity_proof(
		&server_proof,
		&client_session.transcript_hash,
		trust_for_client,
	)?;

	client_session.remote_pubkey = client_remote_pubkey;
	server_session.remote_pubkey = server_remote_pubkey;

	Ok((client_session, server_session))
}

#[test]
fn full_handshake_succeeds_when_both_sides_trust_each_other() {
	let client_id = SigningKey::from_bytes(&[1u8; 32]);
	let server_id = SigningKey::from_bytes(&[2u8; 32]);
	let (mut client_session, mut server_session) = simulate_handshake(
		&client_id,
		&server_id,
		&[client_id.verifying_key()],
		&[server_id.verifying_key()],
	)
	.unwrap();

	// Both ends derive the same transcript hash.
	assert_eq!(client_session.transcript_hash, server_session.transcript_hash);

	// They can talk to each other through the AEAD pair.
	let cipher = client_session.sealer.seal(b"hi from client").unwrap();
	assert_eq!(
		server_session.opener.open(&cipher).unwrap(),
		b"hi from client"
	);
	let cipher = server_session.sealer.seal(b"hi from server").unwrap();
	assert_eq!(
		client_session.opener.open(&cipher).unwrap(),
		b"hi from server"
	);
}

#[test]
fn handshake_rejects_unknown_peer() {
	let client_id = SigningKey::from_bytes(&[1u8; 32]);
	let server_id = SigningKey::from_bytes(&[2u8; 32]);
	let stranger = SigningKey::from_bytes(&[3u8; 32]);
	// Server's trust store does NOT include the real client.
	let err = simulate_handshake(
		&client_id,
		&server_id,
		&[stranger.verifying_key()],
		&[server_id.verifying_key()],
	)
	.unwrap_err();
	matches!(err, TransportError::UnknownPeer { .. });
}

#[test]
fn handshake_rejects_modified_transcript_signature() {
	// Build a normal handshake, then forge an IdentityProof with a
	// signature over a DIFFERENT transcript. verify_identity_proof must
	// reject it as BadSignature.
	let client_id = SigningKey::from_bytes(&[1u8; 32]);
	let server_id = SigningKey::from_bytes(&[2u8; 32]);

	let client = ClientHandshake::new();
	let server = ServerHandshake::from_client_opening(&client.opening_message()).unwrap();
	let client_eph_pub_bytes: [u8; 32] = *client.eph_pub.as_bytes();
	let server_eph_pub_bytes: [u8; 32] = *server.eph_pub.as_bytes();
	let server_transcript = build_transcript_hash(
		server.agreed_version,
		&client_eph_pub_bytes,
		&server_eph_pub_bytes,
		&client.nonce,
		&server.nonce,
	);

	// MITM produces a signature over the WRONG transcript (flips one byte).
	let mut wrong_transcript = server_transcript;
	wrong_transcript[0] ^= 1;
	use ed25519_dalek::Signer;
	let bad_sig = client_id.sign(&wrong_transcript);
	let forged = HandshakeMsg::IdentityProof {
		my_pubkey_b64: encode_b64(client_id.verifying_key().as_bytes()),
		signature_b64: encode_b64(&bad_sig.to_bytes()),
	};

	let err =
		verify_identity_proof(&forged, &server_transcript, &[client_id.verifying_key()]).unwrap_err();
	assert_eq!(err, TransportError::BadSignature);
	let _ = server_id; // silence unused
}

#[test]
fn handshake_rejects_incompatible_version() {
	// Forge an OpeningClient that advertises a version range above what
	// we support.
	let bad_opening = HandshakeMsg::OpeningClient {
		min_supported_version: 99,
		max_supported_version: 100,
		eph_pub_b64: encode_b64(&[0u8; 32]),
		nonce_b64: encode_b64(&[0u8; 8]),
	};
	let err = ServerHandshake::from_client_opening(&bad_opening).unwrap_err();
	matches!(err, TransportError::IncompatibleVersion { .. });
}

#[test]
fn handshake_rejects_wrong_opening_type() {
	// Sending an IdentityProof as the first message must fail.
	let wrong = HandshakeMsg::IdentityProof {
		my_pubkey_b64: encode_b64(&[0u8; 32]),
		signature_b64: encode_b64(&[0u8; 64]),
	};
	let err = ServerHandshake::from_client_opening(&wrong).unwrap_err();
	matches!(err, TransportError::BadHandshakeBytes(_));
}

#[test]
fn verify_rejects_wrong_pubkey_length() {
	let proof = HandshakeMsg::IdentityProof {
		my_pubkey_b64: encode_b64(&[0u8; 31]), // 31 != 32
		signature_b64: encode_b64(&[0u8; 64]),
	};
	let err = verify_identity_proof(&proof, &[0u8; 32], &[]).unwrap_err();
	matches!(err, TransportError::BadHandshakeBytes(_));
}

#[test]
fn verify_rejects_wrong_signature_length() {
	let proof = HandshakeMsg::IdentityProof {
		my_pubkey_b64: encode_b64(&[0u8; 32]),
		signature_b64: encode_b64(&[0u8; 63]), // 63 != 64
	};
	let err = verify_identity_proof(&proof, &[0u8; 32], &[]).unwrap_err();
	matches!(err, TransportError::BadHandshakeBytes(_));
}

#[test]
fn verify_rejects_non_identity_proof_variant() {
	let wrong = HandshakeMsg::OpeningClient {
		min_supported_version: 1,
		max_supported_version: 1,
		eph_pub_b64: encode_b64(&[0u8; 32]),
		nonce_b64: encode_b64(&[0u8; 8]),
	};
	let err = verify_identity_proof(&wrong, &[0u8; 32], &[]).unwrap_err();
	matches!(err, TransportError::BadHandshakeBytes(_));
}

/// Builds a valid `IdentityProof` over `transcript_hash` for `signer`.
fn build_identity_proof(signer: &SigningKey, transcript_hash: &[u8; 32]) -> HandshakeMsg {
	use ed25519_dalek::Signer;
	let sig = signer.sign(transcript_hash);
	HandshakeMsg::IdentityProof {
		my_pubkey_b64: encode_b64(signer.verifying_key().as_bytes()),
		signature_b64: encode_b64(&sig.to_bytes()),
	}
}

#[test]
fn verify_accepts_trust_store_match_at_first_position() {
	// Match at index 0 must succeed even though the loop has more peers
	// after it - the loop runs to completion, but the result is correct.
	let signer = SigningKey::from_bytes(&[7u8; 32]);
	let other_a = SigningKey::from_bytes(&[8u8; 32]).verifying_key();
	let other_b = SigningKey::from_bytes(&[9u8; 32]).verifying_key();
	let transcript = [42u8; 32];
	let proof = build_identity_proof(&signer, &transcript);
	let trusted = [signer.verifying_key(), other_a, other_b];
	let remote = verify_identity_proof(&proof, &transcript, &trusted).unwrap();
	assert_eq!(remote.as_bytes(), signer.verifying_key().as_bytes());
}

#[test]
fn verify_accepts_trust_store_match_at_middle_position() {
	let signer = SigningKey::from_bytes(&[7u8; 32]);
	let other_a = SigningKey::from_bytes(&[8u8; 32]).verifying_key();
	let other_b = SigningKey::from_bytes(&[9u8; 32]).verifying_key();
	let transcript = [42u8; 32];
	let proof = build_identity_proof(&signer, &transcript);
	let trusted = [other_a, signer.verifying_key(), other_b];
	let remote = verify_identity_proof(&proof, &transcript, &trusted).unwrap();
	assert_eq!(remote.as_bytes(), signer.verifying_key().as_bytes());
}

#[test]
fn verify_accepts_trust_store_match_at_last_position() {
	let signer = SigningKey::from_bytes(&[7u8; 32]);
	let other_a = SigningKey::from_bytes(&[8u8; 32]).verifying_key();
	let other_b = SigningKey::from_bytes(&[9u8; 32]).verifying_key();
	let transcript = [42u8; 32];
	let proof = build_identity_proof(&signer, &transcript);
	let trusted = [other_a, other_b, signer.verifying_key()];
	let remote = verify_identity_proof(&proof, &transcript, &trusted).unwrap();
	assert_eq!(remote.as_bytes(), signer.verifying_key().as_bytes());
}

#[test]
fn verify_rejects_empty_trust_store() {
	let signer = SigningKey::from_bytes(&[7u8; 32]);
	let transcript = [42u8; 32];
	let proof = build_identity_proof(&signer, &transcript);
	let err = verify_identity_proof(&proof, &transcript, &[]).unwrap_err();
	matches!(err, TransportError::UnknownPeer { .. });
}

#[test]
fn verify_rejects_when_no_peer_in_trust_store_matches() {
	let signer = SigningKey::from_bytes(&[7u8; 32]);
	let other_a = SigningKey::from_bytes(&[8u8; 32]).verifying_key();
	let other_b = SigningKey::from_bytes(&[9u8; 32]).verifying_key();
	let transcript = [42u8; 32];
	let proof = build_identity_proof(&signer, &transcript);
	let trusted = [other_a, other_b];
	let err = verify_identity_proof(&proof, &transcript, &trusted).unwrap_err();
	matches!(err, TransportError::UnknownPeer { .. });
}
