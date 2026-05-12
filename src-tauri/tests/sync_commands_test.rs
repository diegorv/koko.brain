//! Stage 5 unit tests for the LAN sync command shims.
//!
//! Only the commands that do NOT need a Tauri runtime are exercised
//! here:
//! - `lan_sync_list_trusted_peers` — thin wrapper over `trust::load`.
//! - `lan_sync_remove_trusted_peer` — thin wrapper over `trust::remove`.
//!
//! The other four commands (`lan_sync_get_my_fingerprint`,
//! `lan_sync_set_discoverable`, `lan_sync_start_browse`,
//! `lan_sync_stop_browse`) require `tauri::State` extraction and an
//! `AppHandle`. They will be covered via `tauri::test::mock_app`
//! once that wiring lands in a later stage.
//!
//! TODO(stage 8 follow-up): cover the remaining four commands via
//! `tauri::test::mock_app` so the lock + race paths are exercised.

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use kokobrain_lib::commands::sync::{lan_sync_list_trusted_peers, lan_sync_remove_trusted_peer};
use kokobrain_lib::sync::trust::{save, TrustedPeer};
use tempfile::TempDir;

/// Builds a syntactically valid `TrustedPeer` for the given seed +
/// fingerprint. Same shape used by `sync_trust_test.rs`.
fn fake_peer(seed: u8, fp_hex: &str) -> TrustedPeer {
	TrustedPeer {
		fingerprint_hex: fp_hex.to_string(),
		fingerprint_display: "alpha-bravo-charlie-delta-echo-foxtrot".to_string(),
		public_key_b64: BASE64.encode([seed; 32]),
		display_name: None,
		trusted_at_ms: 1_700_000_000_000,
	}
}

// ---------------------------------------------------------------------------
// lan_sync_list_trusted_peers
// ---------------------------------------------------------------------------

#[tokio::test]
async fn list_trusted_peers_returns_empty_when_no_file() {
	let tmp = TempDir::new().unwrap();
	let out = lan_sync_list_trusted_peers(tmp.path().to_string_lossy().into_owned())
		.await
		.expect("no file is not an error");
	assert!(out.is_empty());
}

#[tokio::test]
async fn list_trusted_peers_returns_saved_records() {
	let tmp = TempDir::new().unwrap();
	let a = fake_peer(0x01, "aaaa000000000001");
	let b = fake_peer(0x02, "aaaa000000000002");
	save(tmp.path(), &[a.clone(), b.clone()]).unwrap();

	let out = lan_sync_list_trusted_peers(tmp.path().to_string_lossy().into_owned())
		.await
		.expect("load succeeds");
	assert_eq!(out, vec![a, b]);
}

#[tokio::test]
async fn list_trusted_peers_surfaces_parse_errors_as_string() {
	let tmp = TempDir::new().unwrap();
	let kokobrain_dir = tmp.path().join(".kokobrain");
	std::fs::create_dir_all(&kokobrain_dir).unwrap();
	std::fs::write(kokobrain_dir.join("peers.json"), b"{ not valid json").unwrap();

	let err = lan_sync_list_trusted_peers(tmp.path().to_string_lossy().into_owned())
		.await
		.expect_err("malformed peers.json must error");
	assert!(
		!err.is_empty(),
		"error string must be non-empty for the frontend toast"
	);
}

// ---------------------------------------------------------------------------
// lan_sync_remove_trusted_peer
// ---------------------------------------------------------------------------

#[tokio::test]
async fn remove_trusted_peer_drops_matching_entry() {
	let tmp = TempDir::new().unwrap();
	let a = fake_peer(0x01, "bbbb000000000001");
	let b = fake_peer(0x02, "bbbb000000000002");
	let c = fake_peer(0x03, "bbbb000000000003");
	save(tmp.path(), &[a.clone(), b.clone(), c.clone()]).unwrap();

	let after = lan_sync_remove_trusted_peer(
		tmp.path().to_string_lossy().into_owned(),
		"bbbb000000000002".to_string(),
	)
	.await
	.expect("remove succeeds");
	assert_eq!(after, vec![a, c]);
}

#[tokio::test]
async fn remove_trusted_peer_is_noop_on_missing_fingerprint() {
	let tmp = TempDir::new().unwrap();
	let a = fake_peer(0x01, "cccc000000000001");
	save(tmp.path(), &[a.clone()]).unwrap();

	let after = lan_sync_remove_trusted_peer(
		tmp.path().to_string_lossy().into_owned(),
		"ffffffffffffffff".to_string(),
	)
	.await
	.expect("missing fp is a no-op");
	assert_eq!(after, vec![a]);
}

#[tokio::test]
async fn remove_trusted_peer_returns_empty_when_store_was_empty() {
	let tmp = TempDir::new().unwrap();
	let after = lan_sync_remove_trusted_peer(
		tmp.path().to_string_lossy().into_owned(),
		"deadbeefcafebabe".to_string(),
	)
	.await
	.expect("missing file behaves like empty store");
	assert!(after.is_empty());
}
