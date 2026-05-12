//! Integration tests for the Stage 8 pairing protocol.
//!
//! These cover the wire-level handshake driven by
//! `crate::sync::dispatch::handle_inbound_connection` against a hand-
//! rolled initiator that mirrors what `lan_sync_pair_with_peer`
//! (initiator-mode) does over a real TCP socket. We use
//! `tokio::io::duplex` instead of TCP to keep the test deterministic.
//!
//! Coverage:
//! - `PeerHandshake` and `PairResponse` serialise to camelCase JSON.
//! - Happy path: dispatcher emits `pairing-incoming`, the responder
//!   side accepts via the oneshot, dispatcher returns
//!   `PairResponse { accepted: true }`; on the initiator side the
//!   peer can be persisted to `peers.json` with the verified
//!   fingerprint hex / display / pubkey.
//! - Reject path: oneshot is signalled with `false`, dispatcher
//!   replies `PairResponse { accepted: false }`, no peer ends up in
//!   the trust store.
//! - Fingerprint mismatch on the initiator side: `transport::open_to`
//!   returns `PeerMismatch`, dispatcher never receives a handshake
//!   envelope.
//! - Push-intent against an untrusted peer is rejected with
//!   `reason: "not trusted"`.

use std::path::Path;
use std::sync::Arc;
use std::time::Duration;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use kokobrain_lib::sync::dispatch::{
	handle_inbound_connection, PairResponse, PeerHandshake, INTENT_PAIR, INTENT_PUSH,
};
use kokobrain_lib::sync::transport::{
	accept, fingerprint_hex_from_static, open_to, static_keys_from_ed25519_secret, Session,
	StaticKeys, TransportError,
};
use kokobrain_lib::sync::trust::{self, TrustedPeer};
use kokobrain_lib::sync::SyncState;
use tauri::test::mock_builder;
use tempfile::TempDir;
use tokio::io::DuplexStream;

const DUPLEX_CAP: usize = 1024 * 1024;

// ============================================================================
// Wire-format assertions
// ============================================================================

#[test]
fn peer_handshake_serialises_to_camel_case() {
	let h = PeerHandshake {
		intent: "pair".into(),
		fingerprint_display: "alpha-bravo-charlie-delta-echo-foxtrot".into(),
	};
	let json = serde_json::to_value(&h).unwrap();
	assert_eq!(json["intent"], "pair");
	assert_eq!(
		json["fingerprintDisplay"],
		"alpha-bravo-charlie-delta-echo-foxtrot"
	);
	assert!(json.get("fingerprint_display").is_none());
}

#[test]
fn pair_response_serialises_with_optional_reason() {
	let ok = PairResponse { accepted: true, reason: None };
	let ok_json = serde_json::to_value(&ok).unwrap();
	assert_eq!(ok_json["accepted"], true);
	// `reason` is skipped on `None`.
	assert!(ok_json.get("reason").is_none());

	let rej = PairResponse {
		accepted: false,
		reason: Some("not trusted".into()),
	};
	let rej_json = serde_json::to_value(&rej).unwrap();
	assert_eq!(rej_json["accepted"], false);
	assert_eq!(rej_json["reason"], "not trusted");
}

#[test]
fn pair_response_roundtrips() {
	let r = PairResponse { accepted: true, reason: None };
	let bytes = serde_json::to_vec(&r).unwrap();
	let parsed: PairResponse = serde_json::from_slice(&bytes).unwrap();
	assert_eq!(parsed, r);
}

// ============================================================================
// Test helpers
// ============================================================================

fn pair_keys() -> (StaticKeys, StaticKeys) {
	(
		static_keys_from_ed25519_secret(&[0x11_u8; 32]),
		static_keys_from_ed25519_secret(&[0x22_u8; 32]),
	)
}

async fn handshaked_pair(
	initiator_keys: &StaticKeys,
	responder_keys: &StaticKeys,
) -> (Session<DuplexStream>, Session<DuplexStream>) {
	let init_fp = fingerprint_hex_from_static(&initiator_keys.public);
	let resp_fp = fingerprint_hex_from_static(&responder_keys.public);
	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);

	let init_keys = initiator_keys.clone();
	let resp_keys = responder_keys.clone();
	let init_task = tokio::spawn(async move {
		open_to(init_side, &init_keys, &resp_fp).await
	});
	let resp_task = tokio::spawn({
		let init_fp = init_fp.clone();
		async move {
			accept(resp_side, &resp_keys, |fp| fp == init_fp).await
		}
	});
	let init = init_task.await.unwrap().expect("initiator handshake");
	let resp = resp_task.await.unwrap().expect("responder handshake");
	(init, resp)
}

/// Builds a Tauri mock-runtime app so we can pass an `AppHandle` into
/// the dispatcher. Events emitted via `app.emit` go nowhere — that's
/// fine; we only care about state mutations and wire I/O here.
fn mock_app() -> tauri::App<tauri::test::MockRuntime> {
	mock_builder()
		.build(tauri::generate_context!())
		.expect("build mock app")
}

// ============================================================================
// Pairing happy path
// ============================================================================

#[tokio::test]
async fn pair_happy_path_writes_peer_to_trust_store() {
	let (init_keys, resp_keys) = pair_keys();
	let init_fp = fingerprint_hex_from_static(&init_keys.public);
	let resp_fp_display =
		kokobrain_lib::sync::discovery::fingerprint_display_from_hex(&init_fp);

	let vault = TempDir::new().unwrap();
	let state = Arc::new(SyncState::default());

	let (mut init_session, resp_session) = handshaked_pair(&init_keys, &resp_keys).await;

	let app = mock_app();
	let app_handle = app.handle().clone();
	let state_clone = state.clone();
	let vault_path = vault.path().to_path_buf();

	// Dispatcher runs in the background.
	let dispatch_task = tokio::spawn(async move {
		handle_inbound_connection(
			app_handle,
			state_clone,
			vault_path,
			resp_session,
			"127.0.0.1".into(),
			65000,
		)
		.await
	});

	// Initiator-side: send the pair envelope.
	let envelope = PeerHandshake {
		intent: INTENT_PAIR.into(),
		fingerprint_display: resp_fp_display,
	};
	init_session
		.send(&serde_json::to_vec(&envelope).unwrap())
		.await
		.unwrap();

	// Wait for the dispatcher to register the pending session.
	let request_id = poll_for_request_id(&state).await;

	// Simulate the user accepting: insert the peer into the trust
	// store via the public API (mirrors what
	// `lan_sync_pair_with_peer` does in respond mode), then signal
	// the dispatcher.
	let entry = {
		let mut map = state.pending_pair_sessions.lock().await;
		map.remove(&request_id).expect("pending entry must exist")
	};
	let peer = TrustedPeer {
		fingerprint_hex: entry.remote_fingerprint_hex.clone(),
		fingerprint_display: entry.remote_fingerprint_display.clone(),
		public_key_b64: entry.remote_public_key_b64.clone(),
		display_name: None,
		trusted_at_ms: 1_700_000_000_000,
	};
	trust::upsert(vault.path(), peer.clone()).unwrap();
	let tx = entry.responder.expect("responder oneshot present");
	tx.send(true).expect("dispatcher must still be waiting");

	// Read the wire response from the dispatcher.
	let resp_bytes = init_session.recv().await.expect("response");
	let response: PairResponse = serde_json::from_slice(&resp_bytes).unwrap();
	assert!(response.accepted, "dispatcher must ack accept");

	dispatch_task.await.unwrap().expect("dispatcher ok");

	// Trust store contains the peer with the correct fingerprint.
	let stored = trust::load(vault.path()).unwrap();
	assert_eq!(stored.len(), 1);
	assert_eq!(stored[0].fingerprint_hex, init_fp);
	let derived_b64 = BASE64.encode(init_keys.public);
	assert_eq!(stored[0].public_key_b64, derived_b64);
}

#[tokio::test]
async fn pair_reject_path_returns_accepted_false() {
	let (init_keys, resp_keys) = pair_keys();
	let init_fp = fingerprint_hex_from_static(&init_keys.public);
	let resp_display =
		kokobrain_lib::sync::discovery::fingerprint_display_from_hex(&init_fp);

	let vault = TempDir::new().unwrap();
	let state = Arc::new(SyncState::default());

	let (mut init_session, resp_session) = handshaked_pair(&init_keys, &resp_keys).await;
	let app = mock_app();
	let app_handle = app.handle().clone();
	let state_clone = state.clone();
	let vault_path = vault.path().to_path_buf();

	let dispatch_task = tokio::spawn(async move {
		handle_inbound_connection(
			app_handle,
			state_clone,
			vault_path,
			resp_session,
			"127.0.0.1".into(),
			65001,
		)
		.await
	});

	let envelope = PeerHandshake {
		intent: INTENT_PAIR.into(),
		fingerprint_display: resp_display,
	};
	init_session
		.send(&serde_json::to_vec(&envelope).unwrap())
		.await
		.unwrap();

	let request_id = poll_for_request_id(&state).await;
	let entry = {
		let mut map = state.pending_pair_sessions.lock().await;
		map.remove(&request_id).expect("pending entry")
	};
	// Reject: do NOT write to trust store, signal false.
	entry
		.responder
		.expect("responder oneshot")
		.send(false)
		.expect("dispatcher waiting");

	let resp_bytes = init_session.recv().await.unwrap();
	let response: PairResponse = serde_json::from_slice(&resp_bytes).unwrap();
	assert!(!response.accepted);

	dispatch_task.await.unwrap().expect("dispatcher ok");

	// Trust store stays empty.
	let stored = trust::load(vault.path()).unwrap();
	assert!(stored.is_empty(), "no peer should be persisted on reject");
}

#[tokio::test]
async fn pair_fingerprint_mismatch_on_initiator_aborts_before_envelope() {
	// Initiator expects the WRONG remote fingerprint. The handshake
	// itself produces `TransportError::PeerMismatch` and the
	// dispatcher never receives a `PeerHandshake`.
	let (init_keys, resp_keys) = pair_keys();
	let real_resp_fp = fingerprint_hex_from_static(&resp_keys.public);
	let wrong_fp = "deadbeefdeadbeef".to_string();
	assert_ne!(real_resp_fp, wrong_fp);

	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);
	let init_keys_clone = init_keys.clone();
	let resp_keys_clone = resp_keys.clone();
	let wrong_fp_for_init = wrong_fp.clone();

	let init_task = tokio::spawn(async move {
		open_to(init_side, &init_keys_clone, &wrong_fp_for_init).await
	});
	let resp_task = tokio::spawn(async move {
		// Responder accepts any fingerprint at the transport layer
		// (this matches the production `drive_inbound` predicate).
		accept(resp_side, &resp_keys_clone, |_| true).await
	});

	let init_result = init_task.await.unwrap();
	let _ = resp_task.await.unwrap(); // may succeed or fail depending on which side errors first.

	match init_result {
		Err(TransportError::PeerMismatch { expected_hex, got_hex }) => {
			assert_eq!(expected_hex, wrong_fp);
			assert_eq!(got_hex, real_resp_fp);
		}
		Err(e) => panic!("expected PeerMismatch on initiator, got error {e:?}"),
		Ok(_) => panic!("expected PeerMismatch on initiator, got Ok(session)"),
	}
}

#[tokio::test]
async fn pair_fingerprint_lie_in_envelope_is_rejected() {
	// Remote completes the handshake correctly but sends a
	// `fingerprint_display` that does NOT match what the dispatcher
	// derives from its static key. Dispatcher must abort with
	// `FingerprintLie` and not register a pending entry.
	let (init_keys, resp_keys) = pair_keys();
	let init_fp = fingerprint_hex_from_static(&init_keys.public);
	let real_display = kokobrain_lib::sync::discovery::fingerprint_display_from_hex(&init_fp);
	assert!(!real_display.is_empty());

	let vault = TempDir::new().unwrap();
	let state = Arc::new(SyncState::default());

	let (mut init_session, resp_session) = handshaked_pair(&init_keys, &resp_keys).await;
	let app = mock_app();
	let app_handle = app.handle().clone();
	let state_clone = state.clone();
	let vault_path = vault.path().to_path_buf();

	let dispatch_task = tokio::spawn(async move {
		handle_inbound_connection(
			app_handle,
			state_clone,
			vault_path,
			resp_session,
			"127.0.0.1".into(),
			65002,
		)
		.await
	});

	let envelope = PeerHandshake {
		intent: INTENT_PAIR.into(),
		fingerprint_display: "totally-fake-six-words-here-fake".into(),
	};
	init_session
		.send(&serde_json::to_vec(&envelope).unwrap())
		.await
		.unwrap();

	// Dispatcher must return an error and NOT register a pending entry.
	let result = tokio::time::timeout(Duration::from_secs(2), dispatch_task)
		.await
		.expect("dispatcher must terminate")
		.unwrap();
	assert!(result.is_err(), "dispatcher must error on fingerprint lie");

	// No pending session was registered.
	let map = state.pending_pair_sessions.lock().await;
	assert!(map.is_empty());
}

// ============================================================================
// Push-intent dispatch
// ============================================================================

#[tokio::test]
async fn push_intent_against_untrusted_peer_is_rejected() {
	let (init_keys, resp_keys) = pair_keys();
	let init_fp = fingerprint_hex_from_static(&init_keys.public);
	let resp_display =
		kokobrain_lib::sync::discovery::fingerprint_display_from_hex(&init_fp);

	let vault = TempDir::new().unwrap();
	let state = Arc::new(SyncState::default());

	// peers.json is empty — the dispatcher must reject.
	let (mut init_session, resp_session) = handshaked_pair(&init_keys, &resp_keys).await;
	let app = mock_app();
	let app_handle = app.handle().clone();
	let state_clone = state.clone();
	let vault_path = vault.path().to_path_buf();

	let dispatch_task = tokio::spawn(async move {
		handle_inbound_connection(
			app_handle,
			state_clone,
			vault_path,
			resp_session,
			"127.0.0.1".into(),
			65003,
		)
		.await
	});

	let envelope = PeerHandshake {
		intent: INTENT_PUSH.into(),
		fingerprint_display: resp_display,
	};
	init_session
		.send(&serde_json::to_vec(&envelope).unwrap())
		.await
		.unwrap();

	let resp_bytes = init_session.recv().await.expect("rejection wire reply");
	let response: PairResponse = serde_json::from_slice(&resp_bytes).unwrap();
	assert!(!response.accepted);
	assert_eq!(response.reason.as_deref(), Some("not trusted"));

	// Dispatcher returns Ok (clean rejection, not an error).
	dispatch_task.await.unwrap().expect("dispatch ok");
}

// ============================================================================
// Polling helper for the request_id (waits for the dispatcher to
// register the pending session). The dispatcher does this on its own
// tokio task; we just spin a few times with short sleeps.
// ============================================================================

async fn poll_for_request_id(state: &Arc<SyncState>) -> String {
	for _ in 0..200 {
		{
			let map = state.pending_pair_sessions.lock().await;
			if let Some(id) = map.keys().next().cloned() {
				return id;
			}
		}
		tokio::time::sleep(Duration::from_millis(5)).await;
	}
	panic!("dispatcher never registered a pending pair session");
}

// Ensure the import is exercised (keeps the linter from removing
// `Path` if a future refactor drops the only use site).
#[allow(dead_code)]
fn _path_used(_p: &Path) {}
