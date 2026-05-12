//! Wire-shape tests for the LAN sync event payloads in
//! `src-tauri/src/sync/events.rs`. Every payload is serialised to
//! JSON via the same serde derives Tauri uses, then asserted against
//! the camelCase field names declared in
//! `src/lib/plugins/lan-sync/lan-sync.types.ts`. These tests are the
//! contract enforcement: if a Rust field is renamed without updating
//! the TS interface, this test fails.

use kokobrain_lib::sync::auth_log::{BlockedEntry, FailureReason};
use kokobrain_lib::sync::events::{
	ConflictSavedPayload, ConnectionState, ConnectionStatePayload, PairingPassphraseRequiredPayload,
	PeerDiscoveredPayload, PeerTrustedPayload, ShareProgressPayload, EVT_CONFLICT_SAVED,
	EVT_CONNECTION_STATE, EVT_PAIRING_PASSPHRASE_REQUIRED, EVT_PEER_BLOCKED, EVT_PEER_DISCOVERED,
	EVT_PEER_TRUSTED, EVT_SHARE_PROGRESS,
};

fn json_keys(v: &serde_json::Value) -> Vec<&str> {
	let mut keys: Vec<&str> = v
		.as_object()
		.expect("payload serialises to a JSON object")
		.keys()
		.map(|s| s.as_str())
		.collect();
	keys.sort();
	keys
}

// ============================================================================
// Event names match the strings the frontend listens on.
// ============================================================================

#[test]
fn event_names_match_frontend_service() {
	// These literals are copied verbatim from `lan-sync.service.ts:27-33`.
	assert_eq!(EVT_PEER_DISCOVERED, "lan-sync:peer-discovered");
	assert_eq!(EVT_PEER_TRUSTED, "lan-sync:peer-trusted");
	assert_eq!(EVT_PAIRING_PASSPHRASE_REQUIRED, "lan-sync:pairing-passphrase-required");
	assert_eq!(EVT_SHARE_PROGRESS, "lan-sync:share-progress");
	assert_eq!(EVT_CONFLICT_SAVED, "lan-sync:conflict-saved");
	assert_eq!(EVT_CONNECTION_STATE, "lan-sync:connection-state");
	assert_eq!(EVT_PEER_BLOCKED, "lan-sync:peer-blocked");
}

// ============================================================================
// Field-shape parity per payload.
// ============================================================================

#[test]
fn peer_discovered_serialises_camelcase_shape() {
	let payload = PeerDiscoveredPayload {
		fingerprint_hex: "AAAA-BBBB-CCCC-DDDD".into(),
		fingerprint_display: "apple-banjo-cargo-doctor-eagle-fence".into(),
		addr: "192.168.1.10".into(),
		port: 51820,
		vault_label_hash: "deadbeef".into(),
		protocol_version_range: (1, 1),
	};
	let v = serde_json::to_value(&payload).unwrap();
	assert_eq!(
		json_keys(&v),
		vec![
			"addr",
			"fingerprintDisplay",
			"fingerprintHex",
			"port",
			"protocolVersionRange",
			"vaultLabelHash",
		]
	);
	assert_eq!(v["fingerprintHex"], "AAAA-BBBB-CCCC-DDDD");
	assert_eq!(v["protocolVersionRange"], serde_json::json!([1, 1]));
}

#[test]
fn peer_trusted_serialises_camelcase_shape() {
	let payload = PeerTrustedPayload {
		fingerprint_hex: "AAAA-BBBB-CCCC-DDDD".into(),
		fingerprint_display: "apple-banjo-cargo-doctor-eagle-fence".into(),
		display_name: "MacBook".into(),
		public_key_b64: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=".into(),
		trusted_at_ms: 1_700_000_000_000,
	};
	let v = serde_json::to_value(&payload).unwrap();
	assert_eq!(
		json_keys(&v),
		vec![
			"displayName",
			"fingerprintDisplay",
			"fingerprintHex",
			"publicKeyB64",
			"trustedAtMs",
		]
	);
}

#[test]
fn pairing_passphrase_required_serialises_camelcase_shape() {
	let payload = PairingPassphraseRequiredPayload {
		session_id: "session-uuid".into(),
		passphrase: vec!["abandon".into(); 7],
		remote_fingerprint_display: "apple-banjo-cargo-doctor-eagle-fence".into(),
		remote_fingerprint_hex: "AAAA-BBBB-CCCC-DDDD".into(),
	};
	let v = serde_json::to_value(&payload).unwrap();
	assert_eq!(
		json_keys(&v),
		vec![
			"passphrase",
			"remoteFingerprintDisplay",
			"remoteFingerprintHex",
			"sessionId",
		]
	);
	assert_eq!(v["passphrase"].as_array().unwrap().len(), 7);
}

#[test]
fn share_progress_serialises_camelcase_shape() {
	let payload = ShareProgressPayload {
		share_id: "share-1".into(),
		peer: "AAAA-BBBB-CCCC-DDDD".into(),
		path: "Projects/note.md".into(),
		bytes_done: 0,
		bytes_total: 1024,
	};
	let v = serde_json::to_value(&payload).unwrap();
	assert_eq!(
		json_keys(&v),
		vec!["bytesDone", "bytesTotal", "path", "peer", "shareId"]
	);
}

#[test]
fn conflict_saved_serialises_camelcase_shape() {
	let payload = ConflictSavedPayload {
		share_id: "share-1".into(),
		original_path: "Projects/note.md".into(),
		conflict_path: "Projects/note.conflict-PEER8888-20260101000000.md".into(),
		peer_fingerprint: "AAAA-BBBB-CCCC-DDDD".into(),
		timestamp_ms: 1_700_000_000_000,
	};
	let v = serde_json::to_value(&payload).unwrap();
	assert_eq!(
		json_keys(&v),
		vec![
			"conflictPath",
			"originalPath",
			"peerFingerprint",
			"shareId",
			"timestampMs",
		]
	);
}

#[test]
fn connection_state_serialises_lowercase_variants() {
	for (variant, lowered) in [
		(ConnectionState::Idle, "idle"),
		(ConnectionState::Connecting, "connecting"),
		(ConnectionState::Connected, "connected"),
		(ConnectionState::Transferring, "transferring"),
		(ConnectionState::Disconnected, "disconnected"),
		(ConnectionState::Error, "error"),
	] {
		let payload = ConnectionStatePayload {
			state: variant,
			peer: None,
			error: None,
		};
		let v = serde_json::to_value(&payload).unwrap();
		assert_eq!(
			v["state"], lowered,
			"variant {variant:?} should serialise to {lowered:?}"
		);
	}
}

#[test]
fn connection_state_omits_none_fields() {
	// `peer` and `error` are `#[serde(skip_serializing_if = "Option::is_none")]`
	// so absent transitions stay terse on the wire.
	let payload = ConnectionStatePayload {
		state: ConnectionState::Idle,
		peer: None,
		error: None,
	};
	let v = serde_json::to_value(&payload).unwrap();
	assert_eq!(json_keys(&v), vec!["state"]);
}

#[test]
fn connection_state_includes_optional_fields_when_present() {
	let payload = ConnectionStatePayload {
		state: ConnectionState::Error,
		peer: Some("AAAA-BBBB-CCCC-DDDD".into()),
		error: Some("handshake timeout".into()),
	};
	let v = serde_json::to_value(&payload).unwrap();
	assert_eq!(json_keys(&v), vec!["error", "peer", "state"]);
}

#[test]
fn peer_blocked_payload_serialises_camelcase_shape() {
	// `PeerBlockedPayload` is a re-export of `BlockedEntry`, so its
	// existing serde derives govern. The TS interface lives at
	// `lan-sync.types.ts:48` and lists: identifier, blockedAtMs,
	// blockedUntilMs, triggerReason, failureCountInWindow.
	let payload: kokobrain_lib::sync::events::PeerBlockedPayload = BlockedEntry {
		identifier: "ip:192.168.1.10".into(),
		blocked_at_ms: 1_700_000_000_000,
		blocked_until_ms: 1_700_086_400_000,
		trigger_reason: FailureReason::PathTraversal,
		failure_count_in_window: 5,
	};
	let v = serde_json::to_value(&payload).unwrap();
	assert_eq!(
		json_keys(&v),
		vec![
			"blockedAtMs",
			"blockedUntilMs",
			"failureCountInWindow",
			"identifier",
			"triggerReason",
		]
	);
}
