use kokobrain_lib::sync::protocol::{
	decode_b64, decode_frame, encode_b64, encode_frame, negotiate_version, AppMsg, EntryKind,
	FramingError, HandshakeMsg, ManifestEntry, ShareSummary, MAX_FRAME_SIZE,
	MAX_SUPPORTED_VERSION, MIN_SUPPORTED_VERSION, PROTOCOL_VERSION,
};

// ============================================================================
// Version constants sanity
// ============================================================================

#[test]
fn version_constants_are_consistent() {
	assert_eq!(PROTOCOL_VERSION, MAX_SUPPORTED_VERSION);
	assert!(MIN_SUPPORTED_VERSION <= MAX_SUPPORTED_VERSION);
}

// ============================================================================
// negotiate_version
// ============================================================================

#[test]
fn negotiate_returns_highest_overlap() {
	assert_eq!(negotiate_version(1, 1, 1, 1), Some(1));
	assert_eq!(negotiate_version(1, 3, 2, 5), Some(3));
	assert_eq!(negotiate_version(2, 5, 1, 3), Some(3));
}

#[test]
fn negotiate_returns_none_when_disjoint() {
	assert_eq!(negotiate_version(1, 2, 3, 5), None);
	assert_eq!(negotiate_version(5, 7, 1, 3), None);
}

#[test]
fn negotiate_handles_single_version_ranges() {
	assert_eq!(negotiate_version(1, 1, 1, 1), Some(1));
	assert_eq!(negotiate_version(2, 2, 1, 1), None);
}

// ============================================================================
// HandshakeMsg round-trips
// ============================================================================

#[test]
fn opening_client_round_trips() {
	let msg = HandshakeMsg::OpeningClient {
		min_supported_version: 1,
		max_supported_version: 1,
		eph_pub_b64: encode_b64(&[7u8; 32]),
		nonce_b64: encode_b64(&[3u8; 8]),
	};
	let bytes = encode_frame(&msg).unwrap();
	let parsed: HandshakeMsg = decode_frame(&bytes).unwrap();
	assert_eq!(parsed, msg);
}

#[test]
fn opening_server_round_trips() {
	let msg = HandshakeMsg::OpeningServer {
		min_supported_version: 1,
		max_supported_version: 1,
		agreed_version: 1,
		eph_pub_b64: encode_b64(&[9u8; 32]),
		nonce_b64: encode_b64(&[4u8; 8]),
	};
	let bytes = encode_frame(&msg).unwrap();
	let parsed: HandshakeMsg = decode_frame(&bytes).unwrap();
	assert_eq!(parsed, msg);
}

#[test]
fn identity_proof_round_trips() {
	let msg = HandshakeMsg::IdentityProof {
		my_pubkey_b64: encode_b64(&[11u8; 32]),
		signature_b64: encode_b64(&[5u8; 64]),
	};
	let bytes = encode_frame(&msg).unwrap();
	let parsed: HandshakeMsg = decode_frame(&bytes).unwrap();
	assert_eq!(parsed, msg);
}

#[test]
fn handshake_uses_type_tag_in_json() {
	let msg = HandshakeMsg::IdentityProof {
		my_pubkey_b64: encode_b64(&[0u8; 32]),
		signature_b64: encode_b64(&[0u8; 64]),
	};
	let bytes = encode_frame(&msg).unwrap();
	let json = std::str::from_utf8(&bytes).unwrap();
	assert!(
		json.contains("\"type\":\"identityProof\""),
		"json must carry tagged enum: {json}"
	);
	assert!(
		json.contains("\"myPubkeyB64\""),
		"camelCase rename expected: {json}"
	);
}

#[test]
fn b64_helpers_round_trip() {
	let raw = [0x42, 0x00, 0xFF, 0x10, 0x80, 0x7F, 0xC0, 0x3A];
	let encoded = encode_b64(&raw);
	let decoded = decode_b64(&encoded).unwrap();
	assert_eq!(decoded, raw);
}

#[test]
fn b64_decode_rejects_invalid_input() {
	let err = decode_b64("not!valid!base64").unwrap_err();
	matches!(err, FramingError::Decode(_));
}

// ============================================================================
// AppMsg round-trips for every variant
// ============================================================================

fn sample_entry() -> ManifestEntry {
	ManifestEntry {
		path_rel: "Projects/sync-test/note.md".to_string(),
		kind: EntryKind::File,
		mtime_ms: 1_700_000_000_000,
		lamport: 42,
		sha256_hash: "a".repeat(64),
		size: 1024,
		origin_fingerprint: "A1B2-C3D4-E5F6-0708".to_string(),
	}
}

fn assert_round_trip(msg: AppMsg) {
	let bytes = encode_frame(&msg).unwrap();
	let parsed: AppMsg = decode_frame(&bytes).unwrap();
	assert_eq!(parsed, msg);
}

#[test]
fn list_shares_round_trips() {
	assert_round_trip(AppMsg::ListShares);
}

#[test]
fn shares_available_round_trips() {
	assert_round_trip(AppMsg::SharesAvailable {
		shares: vec![ShareSummary {
			share_id: "share-1".to_string(),
			display_name: "Projects".to_string(),
			direction: "bi".to_string(),
			manifest_version: 10,
			read_only: false,
		}],
	});
}

#[test]
fn subscribe_round_trips() {
	assert_round_trip(AppMsg::Subscribe {
		share_id: "s1".to_string(),
		since_version: 0,
	});
}

#[test]
fn manifest_round_trips_with_file_and_dir() {
	let dir = ManifestEntry {
		path_rel: "Projects/empty-dir".to_string(),
		kind: EntryKind::Directory,
		mtime_ms: 1_700_000_000_000,
		lamport: 1,
		sha256_hash: String::new(),
		size: 0,
		origin_fingerprint: "A1B2-C3D4-E5F6-0708".to_string(),
	};
	assert_round_trip(AppMsg::Manifest {
		share_id: "s1".to_string(),
		version: 7,
		entries: vec![sample_entry(), dir],
		is_last_page: true,
	});
}

#[test]
fn request_block_round_trips() {
	assert_round_trip(AppMsg::RequestBlock {
		share_id: "s1".to_string(),
		path_rel: "a.md".to_string(),
		expected_hash: "b".repeat(64),
	});
}

#[test]
fn block_data_round_trips() {
	assert_round_trip(AppMsg::BlockData {
		share_id: "s1".to_string(),
		path_rel: "a.md".to_string(),
		content_b64: "SGVsbG8gd29ybGQ=".to_string(),
		hash: "c".repeat(64),
		is_last_chunk: false,
		chunk_index: 0,
	});
}

#[test]
fn push_update_round_trips() {
	assert_round_trip(AppMsg::PushUpdate {
		share_id: "s1".to_string(),
		path_rel: "a.md".to_string(),
		mtime_ms: 1_700_000_000_000,
		lamport: 42,
		sha256_hash: "d".repeat(64),
		origin_fingerprint: "A1B2-C3D4-E5F6-0708".to_string(),
		content_b64: "Zm9v".to_string(),
	});
}

#[test]
fn push_rename_round_trips() {
	assert_round_trip(AppMsg::PushRename {
		share_id: "s1".to_string(),
		old_path_rel: "foo.md".to_string(),
		new_path_rel: "bar.md".to_string(),
		mtime_ms: 1_700_000_000_000,
		lamport: 43,
		sha256_hash: "e".repeat(64),
		origin_fingerprint: "A1B2-C3D4-E5F6-0708".to_string(),
	});
}

#[test]
fn delete_round_trips() {
	assert_round_trip(AppMsg::Delete {
		share_id: "s1".to_string(),
		path_rel: "old.md".to_string(),
		mtime_ms: 1_700_000_000_000,
		lamport: 44,
		origin_fingerprint: "A1B2-C3D4-E5F6-0708".to_string(),
	});
}

#[test]
fn ping_pong_round_trip() {
	assert_round_trip(AppMsg::Ping);
	assert_round_trip(AppMsg::Pong);
}

#[test]
fn error_round_trips() {
	assert_round_trip(AppMsg::Error {
		code: "protocol_incompatible".to_string(),
		message: "no version overlap".to_string(),
	});
}

// ============================================================================
// Framing rules
// ============================================================================

#[test]
fn encode_rejects_oversized_payload() {
	// Build a message that serialises to more than MAX_FRAME_SIZE.
	let huge = "x".repeat(MAX_FRAME_SIZE + 1);
	let msg = AppMsg::Error {
		code: "huge".to_string(),
		message: huge,
	};
	let err = encode_frame(&msg).unwrap_err();
	match err {
		FramingError::Oversized { size, max } => {
			assert_eq!(max, MAX_FRAME_SIZE);
			assert!(size > MAX_FRAME_SIZE);
		}
		other => panic!("expected Oversized, got {other:?}"),
	}
}

#[test]
fn decode_rejects_oversized_input() {
	let oversized = vec![b'x'; MAX_FRAME_SIZE + 1];
	let err = decode_frame::<AppMsg>(&oversized).unwrap_err();
	matches!(err, FramingError::Oversized { .. });
}

#[test]
fn decode_rejects_malformed_json() {
	let bytes = b"not valid json";
	let err = decode_frame::<AppMsg>(bytes).unwrap_err();
	matches!(err, FramingError::Decode(_));
}

#[test]
fn decode_rejects_wrong_variant_payload() {
	// Encode HandshakeMsg, try decode as AppMsg — must fail.
	let msg = HandshakeMsg::IdentityProof {
		my_pubkey_b64: encode_b64(&[0u8; 32]),
		signature_b64: encode_b64(&[0u8; 64]),
	};
	let bytes = encode_frame(&msg).unwrap();
	let err = decode_frame::<AppMsg>(&bytes).unwrap_err();
	matches!(err, FramingError::Decode(_));
}

#[test]
fn entry_kind_serializes_lowercase() {
	let bytes = serde_json::to_string(&EntryKind::Directory).unwrap();
	assert_eq!(bytes, "\"directory\"");
	let bytes = serde_json::to_string(&EntryKind::File).unwrap();
	assert_eq!(bytes, "\"file\"");
}
