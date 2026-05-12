//! Stage 4 contract tests: pin the JSON shape of every typed event
//! payload against the TS interfaces in
//! `src/lib/plugins/lan-sync/lan-sync.types.ts`.
//!
//! These tests do NOT spin up a Tauri runtime — `serde_json` is
//! enough to verify the field names and shapes. The emit helpers
//! themselves are exercised via the integration tests of later
//! stages once the full pairing flow lands.

use kokobrain_lib::sync::events::{
	MyFingerprintPayload, PairingIncomingPayload, PeerDiscoveredPayload, PeerTrustedPayload,
	PushCompletePayload, PushProgressPayload, EVT_PAIRING_INCOMING, EVT_PEER_DISCOVERED,
	EVT_PEER_TRUSTED, EVT_PUSH_COMPLETE, EVT_PUSH_PROGRESS,
};
use serde_json::{json, Value};

// ---------------------------------------------------------------------------
// Event-name constants — frontend listeners pin to these strings.
// ---------------------------------------------------------------------------

#[test]
fn event_name_peer_discovered_is_stable() {
	assert_eq!(EVT_PEER_DISCOVERED, "lan-sync:peer-discovered");
}

#[test]
fn event_name_peer_trusted_is_stable() {
	assert_eq!(EVT_PEER_TRUSTED, "lan-sync:peer-trusted");
}

#[test]
fn event_name_pairing_incoming_is_stable() {
	assert_eq!(EVT_PAIRING_INCOMING, "lan-sync:pairing-incoming");
}

#[test]
fn event_name_push_progress_is_stable() {
	assert_eq!(EVT_PUSH_PROGRESS, "lan-sync:push-progress");
}

#[test]
fn event_name_push_complete_is_stable() {
	assert_eq!(EVT_PUSH_COMPLETE, "lan-sync:push-complete");
}

// ---------------------------------------------------------------------------
// Payload JSON shape — keys must match the TS interfaces exactly.
// ---------------------------------------------------------------------------

#[test]
fn peer_discovered_serialises_to_camelcase_keys() {
	let payload = PeerDiscoveredPayload {
		fingerprint_hex: "0123456789abcdef".to_string(),
		fingerprint_display: "alpha-bravo-charlie-delta-echo-foxtrot".to_string(),
		addr: "192.168.1.10".to_string(),
		port: 7878,
	};
	let actual = serde_json::to_value(&payload).expect("serialise PeerDiscoveredPayload");
	let expected = json!({
		"fingerprintHex": "0123456789abcdef",
		"fingerprintDisplay": "alpha-bravo-charlie-delta-echo-foxtrot",
		"addr": "192.168.1.10",
		"port": 7878,
	});
	assert_eq!(actual, expected);
}

#[test]
fn peer_trusted_serialises_to_camelcase_keys() {
	let payload = PeerTrustedPayload {
		fingerprint_hex: "fedcba9876543210".to_string(),
		fingerprint_display: "zulu-yankee-xray-whiskey-victor-uniform".to_string(),
		public_key_b64: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=".to_string(),
		display_name: Some("Laptop".to_string()),
		trusted_at_ms: 1_700_000_000_000,
	};
	let actual = serde_json::to_value(&payload).expect("serialise PeerTrustedPayload");
	let expected = json!({
		"fingerprintHex": "fedcba9876543210",
		"fingerprintDisplay": "zulu-yankee-xray-whiskey-victor-uniform",
		"publicKeyB64": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
		"displayName": "Laptop",
		"trustedAtMs": 1_700_000_000_000_u64,
	});
	assert_eq!(actual, expected);
}

#[test]
fn peer_trusted_display_name_null_when_none() {
	let payload = PeerTrustedPayload {
		fingerprint_hex: "0000000000000001".to_string(),
		fingerprint_display: "a-b-c-d-e-f".to_string(),
		public_key_b64: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=".to_string(),
		display_name: None,
		trusted_at_ms: 1,
	};
	let actual = serde_json::to_value(&payload).expect("serialise PeerTrustedPayload");
	assert_eq!(actual["displayName"], Value::Null);
}

#[test]
fn pairing_incoming_serialises_to_camelcase_keys() {
	let payload = PairingIncomingPayload {
		fingerprint_hex: "0011223344556677".to_string(),
		fingerprint_display: "one-two-three-four-five-six".to_string(),
		addr: "10.0.0.42".to_string(),
		port: 7878,
		request_id: "abc-123".to_string(),
	};
	let actual = serde_json::to_value(&payload).expect("serialise PairingIncomingPayload");
	let expected = json!({
		"fingerprintHex": "0011223344556677",
		"fingerprintDisplay": "one-two-three-four-five-six",
		"addr": "10.0.0.42",
		"port": 7878,
		"requestId": "abc-123",
	});
	assert_eq!(actual, expected);
}

#[test]
fn push_progress_serialises_to_camelcase_keys() {
	let payload = PushProgressPayload {
		peer_fingerprint: "deadbeefcafebabe".to_string(),
		files_done: 3,
		files_total: 10,
		bytes_done: 4096,
		bytes_total: 8192,
	};
	let actual = serde_json::to_value(&payload).expect("serialise PushProgressPayload");
	let expected = json!({
		"peerFingerprint": "deadbeefcafebabe",
		"filesDone": 3,
		"filesTotal": 10,
		"bytesDone": 4096,
		"bytesTotal": 8192,
	});
	assert_eq!(actual, expected);
}

#[test]
fn push_complete_serialises_to_camelcase_keys_with_error() {
	let payload = PushCompletePayload {
		peer_fingerprint: "deadbeefcafebabe".to_string(),
		files_transferred: 5,
		error: Some("connection reset".to_string()),
	};
	let actual = serde_json::to_value(&payload).expect("serialise PushCompletePayload");
	let expected = json!({
		"peerFingerprint": "deadbeefcafebabe",
		"filesTransferred": 5,
		"error": "connection reset",
	});
	assert_eq!(actual, expected);
}

#[test]
fn push_complete_skips_error_when_none() {
	// Matches the TS interface where `error?: string` is optional.
	let payload = PushCompletePayload {
		peer_fingerprint: "deadbeefcafebabe".to_string(),
		files_transferred: 5,
		error: None,
	};
	let actual = serde_json::to_value(&payload).expect("serialise PushCompletePayload");
	let expected = json!({
		"peerFingerprint": "deadbeefcafebabe",
		"filesTransferred": 5,
	});
	assert_eq!(actual, expected);
	assert!(
		actual.get("error").is_none(),
		"error key must be omitted when None"
	);
}

#[test]
fn my_fingerprint_serialises_to_camelcase_keys() {
	let payload = MyFingerprintPayload {
		fingerprint_hex: "0123456789abcdef".to_string(),
		fingerprint_display: "alpha-bravo-charlie-delta-echo-foxtrot".to_string(),
	};
	let actual = serde_json::to_value(&payload).expect("serialise MyFingerprintPayload");
	let expected = json!({
		"fingerprintHex": "0123456789abcdef",
		"fingerprintDisplay": "alpha-bravo-charlie-delta-echo-foxtrot",
	});
	assert_eq!(actual, expected);
}

#[test]
fn payloads_roundtrip_through_serde() {
	// Belt-and-braces: every payload type must deserialise back to
	// an equal value so the frontend's `invoke` return type does not
	// silently drift away from the emit payloads.
	let original = PeerDiscoveredPayload {
		fingerprint_hex: "ff".repeat(8),
		fingerprint_display: "x-x-x-x-x-x".to_string(),
		addr: "172.16.0.1".to_string(),
		port: 12345,
	};
	let json = serde_json::to_string(&original).unwrap();
	let parsed: PeerDiscoveredPayload = serde_json::from_str(&json).unwrap();
	assert_eq!(original, parsed);
}
