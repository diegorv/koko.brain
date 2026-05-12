//! Integration tests for the Stage 8 inbound-push dispatch path.
//!
//! Covers the `intent: "push"` route inside
//! `crate::sync::dispatch::handle_inbound_connection`:
//!
//! 1. Trusted peer — dispatcher acks the envelope, runs
//!    `receive_folder`, and writes the transferred files to the
//!    vault.
//! 2. Untrusted peer — dispatcher replies with
//!    `PairResponse { accepted: false, reason: "not trusted" }` and
//!    no files are written.
//!
//! Like `sync_pairing_test.rs` and `sync_push_test.rs` these run over
//! `tokio::io::duplex` instead of real TCP so the test is hermetic
//! and deterministic.

use std::fs;
use std::path::Path;
use std::sync::Arc;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use kokobrain_lib::sync::dispatch::{
	handle_inbound_connection, PairResponse, PeerHandshake, INTENT_PUSH,
};
use kokobrain_lib::sync::identity::DeviceIdentity;
use kokobrain_lib::sync::push::{plan_push, send_folder};
use kokobrain_lib::sync::transport::{
	accept, open_to, static_keys_from_ed25519_secret, Session, StaticKeys,
};
use kokobrain_lib::sync::trust::{self, TrustedPeer};
use kokobrain_lib::sync::SyncState;
use tauri::test::mock_builder;
use tempfile::TempDir;
use tokio::io::DuplexStream;

const DUPLEX_CAP: usize = 8 * 1024 * 1024;

/// Ed25519 secret seed used for both the X25519 derivation in
/// [`pair_keys`] and the on-disk identity in [`identity_for`] for the
/// initiator. Hard-coded so the binding signature matches the Noise
/// static the handshake authenticates.
const INIT_SEED: [u8; 32] = [0x33_u8; 32];

/// Ed25519 secret seed for the responder. See [`INIT_SEED`].
const RESP_SEED: [u8; 32] = [0x44_u8; 32];

fn pair_keys() -> (StaticKeys, StaticKeys) {
	(
		static_keys_from_ed25519_secret(&INIT_SEED),
		static_keys_from_ed25519_secret(&RESP_SEED),
	)
}

/// Builds a `DeviceIdentity` for `seed` by pre-writing the secret file
/// into a fresh tempdir then calling `load_or_create`. The tempdir is
/// returned so the binding-sig file remains reachable for the test's
/// lifetime.
fn identity_for(seed: &[u8; 32]) -> (DeviceIdentity, TempDir) {
	let tmp = TempDir::new().unwrap();
	let path = tmp.path().join("identity.key");
	fs::write(&path, seed).unwrap();
	let id = DeviceIdentity::load_or_create(&path).unwrap();
	(id, tmp)
}

async fn handshaked_pair(
	init_keys: &StaticKeys,
	resp_keys: &StaticKeys,
) -> (Session<DuplexStream>, Session<DuplexStream>) {
	let (init_identity, _it) = identity_for(&INIT_SEED);
	let (resp_identity, _rt) = identity_for(&RESP_SEED);
	let init_fp = init_identity.fingerprint_hex();
	let resp_fp = resp_identity.fingerprint_hex();
	let init_proof = init_identity.identity_proof();
	let resp_proof = resp_identity.identity_proof();
	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);
	let ik = init_keys.clone();
	let rk = resp_keys.clone();

	let init_task = tokio::spawn(async move {
		open_to(init_side, &ik, &init_proof, &resp_fp).await
	});
	let resp_task = tokio::spawn({
		let init_fp = init_fp.clone();
		async move { accept(resp_side, &rk, &resp_proof, |fp| fp == init_fp).await }
	});
	let init = init_task.await.unwrap().expect("initiator handshake");
	let resp = resp_task.await.unwrap().expect("responder handshake");
	(init, resp)
}

fn mock_app() -> tauri::App<tauri::test::MockRuntime> {
	mock_builder()
		.build(tauri::generate_context!())
		.expect("build mock app")
}

/// Persists a `TrustedPeer` record for the initiator into the vault's
/// `peers.json`. Uses the Ed25519 identity (NOT the X25519 static) so
/// the on-wire fingerprint surface matches what `peers.json` is
/// supposed to pin under Hotfix H2.
fn pre_trust(vault: &Path) {
	let (id, _tmp) = identity_for(&INIT_SEED);
	let peer = TrustedPeer {
		fingerprint_hex: id.fingerprint_hex(),
		fingerprint_display: id.fingerprint_display(),
		public_key_b64: BASE64.encode(id.public_key().as_bytes()),
		display_name: None,
		trusted_at_ms: 1_700_000_000_000,
	};
	trust::upsert(vault, peer).expect("upsert peer");
}

#[tokio::test]
async fn inbound_push_from_trusted_peer_writes_files() {
	let (init_keys, resp_keys) = pair_keys();
	let (init_identity_for_display, _ifd_tmp) = identity_for(&INIT_SEED);
	let init_fp_display = init_identity_for_display.fingerprint_display();

	// Set up the source folder + receiver vault.
	let source = TempDir::new().unwrap();
	fs::write(source.path().join("a.md"), b"hello a").unwrap();
	fs::write(source.path().join("b.md"), b"hello b").unwrap();
	fs::create_dir(source.path().join("nested")).unwrap();
	fs::write(source.path().join("nested/c.md"), b"hello c").unwrap();

	let vault = TempDir::new().unwrap();
	pre_trust(vault.path());

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
			65010,
		)
		.await
	});

	// Initiator sends the routing envelope.
	let envelope = PeerHandshake {
		intent: INTENT_PUSH.into(),
		fingerprint_display: init_fp_display,
	};
	init_session
		.send(&serde_json::to_vec(&envelope).unwrap())
		.await
		.unwrap();

	// Wait for the responder's accept ack.
	let ack_bytes = init_session.recv().await.expect("push ack");
	let ack: PairResponse = serde_json::from_slice(&ack_bytes).unwrap();
	assert!(ack.accepted, "trusted peer must be accepted");

	// Drive the push.
	let plan = plan_push(source.path()).expect("plan");
	let source_path = source.path().to_path_buf();
	let target = "inbox".to_string();
	let send_result = send_folder(
		&mut init_session,
		&source_path,
		&target,
		&plan,
		|_bytes, _files| {},
	)
	.await
	.expect("send");
	assert_eq!(send_result, 3);

	dispatch_task.await.unwrap().expect("dispatcher ok");

	// All three files landed.
	assert_eq!(
		fs::read(vault.path().join("inbox/a.md")).unwrap(),
		b"hello a"
	);
	assert_eq!(
		fs::read(vault.path().join("inbox/b.md")).unwrap(),
		b"hello b"
	);
	assert_eq!(
		fs::read(vault.path().join("inbox/nested/c.md")).unwrap(),
		b"hello c"
	);
}

#[tokio::test]
async fn inbound_push_from_untrusted_peer_is_refused() {
	let (init_keys, resp_keys) = pair_keys();
	let (init_identity_for_display, _ifd_tmp) = identity_for(&INIT_SEED);
	let init_fp_display = init_identity_for_display.fingerprint_display();

	let vault = TempDir::new().unwrap();
	// NOTE: no pre_trust call — peers.json stays empty.
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
			65011,
		)
		.await
	});

	let envelope = PeerHandshake {
		intent: INTENT_PUSH.into(),
		fingerprint_display: init_fp_display,
	};
	init_session
		.send(&serde_json::to_vec(&envelope).unwrap())
		.await
		.unwrap();

	let ack_bytes = init_session.recv().await.expect("rejection");
	let ack: PairResponse = serde_json::from_slice(&ack_bytes).unwrap();
	assert!(!ack.accepted);
	assert_eq!(ack.reason.as_deref(), Some("not trusted"));

	dispatch_task.await.unwrap().expect("dispatch clean ok");

	// Vault stayed untouched.
	let entries = fs::read_dir(vault.path()).unwrap().count();
	// .kokobrain may or may not exist depending on prior state — just
	// assert no other content landed.
	assert!(entries <= 1, "vault should have nothing but possibly .kokobrain");
	if vault.path().join(".kokobrain").exists() {
		// peers.json may exist but no incoming dir should.
		assert!(!vault.path().join(".kokobrain/incoming").exists());
	}
}
