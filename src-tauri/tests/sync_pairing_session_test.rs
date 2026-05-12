//! Integration tests for `src-tauri/src/sync/pairing_session.rs`,
//! exercising the host and guest async drivers via in-process
//! `tokio::io::duplex` pairs. No real TCP is involved.

use std::collections::HashMap;
use std::sync::Mutex;

use kokobrain_lib::sync::identity::{
	load_or_create_identity, IdentityError, KeyStorage, PeerIdentity,
};
use kokobrain_lib::sync::pairing_session::{
	run_pairing_guest, run_pairing_host, PairingSessionError,
};

#[derive(Default)]
struct MemoryStorage {
	inner: Mutex<HashMap<String, [u8; 32]>>,
}

impl KeyStorage for MemoryStorage {
	fn store(&self, account: &str, key: &[u8; 32]) -> Result<(), IdentityError> {
		self.inner.lock().unwrap().insert(account.to_string(), *key);
		Ok(())
	}

	fn retrieve(&self, account: &str) -> Result<Option<[u8; 32]>, IdentityError> {
		Ok(self.inner.lock().unwrap().get(account).copied())
	}

	fn has(&self, account: &str) -> bool {
		self.inner.lock().unwrap().contains_key(account)
	}
}

fn fresh_identity(account: &str) -> PeerIdentity {
	let storage = MemoryStorage::default();
	load_or_create_identity(&storage, account).unwrap()
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn pairing_succeeds_when_passphrases_match() {
	let host_id = fresh_identity("host-A");
	let guest_id = fresh_identity("guest-A");
	// Capture the public keys BEFORE moving the identities into
	// their tasks (PeerIdentity is not Clone because SigningKey
	// is not).
	let host_pub = *host_id.verifying_key();
	let guest_pub = *guest_id.verifying_key();
	let passphrase = "abandon-ability-able-about-above-absent-absorb";

	let (a, b) = tokio::io::duplex(16 * 1024);

	let host_task = tokio::spawn(async move {
		run_pairing_host(a, passphrase, &host_id).await
	});
	let guest_task = tokio::spawn(async move {
		run_pairing_guest(b, passphrase, &guest_id).await
	});

	let host_result = tokio::time::timeout(std::time::Duration::from_secs(5), host_task)
		.await
		.expect("host did not finish in time")
		.expect("host task panicked");
	let guest_result = tokio::time::timeout(std::time::Duration::from_secs(5), guest_task)
		.await
		.expect("guest did not finish in time")
		.expect("guest task panicked");

	let host_view = host_result.expect("host pairing must succeed");
	let guest_view = guest_result.expect("guest pairing must succeed");

	// Each side's "remote identity" should match the OTHER side's
	// local identity. Round-trip the verifying keys to be sure.
	assert_eq!(
		host_view.verifying_key.as_bytes(),
		guest_pub.as_bytes(),
		"host saw the wrong remote verifying key"
	);
	assert_eq!(
		guest_view.verifying_key.as_bytes(),
		host_pub.as_bytes(),
		"guest saw the wrong remote verifying key"
	);

	// Fingerprints round-trip too.
	assert_eq!(host_view.fingerprint_hex.len(), 19); // XXXX-XXXX-XXXX-XXXX
	assert_eq!(guest_view.fingerprint_hex.len(), 19);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn pairing_fails_when_passphrases_differ() {
	let host_id = fresh_identity("host-B");
	let guest_id = fresh_identity("guest-B");

	let (a, b) = tokio::io::duplex(16 * 1024);

	let host_task = tokio::spawn(async move {
		run_pairing_host(a, "abandon-ability-able-about-above-absent-absorb", &host_id).await
	});
	let guest_task = tokio::spawn(async move {
		// Different passphrase. SPAKE2 cannot reach a common K_pair,
		// so the IdentityProof exchange will fail to decrypt and
		// `BadSignature` / `Aead` will surface on both sides.
		run_pairing_guest(b, "above-absent-absorb-abstract-absurd-abuse-access", &guest_id).await
	});

	let host_result = tokio::time::timeout(std::time::Duration::from_secs(5), host_task)
		.await
		.expect("host did not finish")
		.expect("host task panicked");
	let guest_result = tokio::time::timeout(std::time::Duration::from_secs(5), guest_task)
		.await
		.expect("guest did not finish")
		.expect("guest task panicked");

	assert!(
		host_result.is_err(),
		"host should fail when passphrases differ, got Ok"
	);
	assert!(
		guest_result.is_err(),
		"guest should fail when passphrases differ, got Ok"
	);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn pairing_rejects_empty_passphrase() {
	let host_id = fresh_identity("host-C");
	let guest_id = fresh_identity("guest-C");

	let (a, b) = tokio::io::duplex(16 * 1024);

	let host_task = tokio::spawn(async move {
		run_pairing_host(a, "", &host_id).await
	});
	let guest_task = tokio::spawn(async move {
		run_pairing_guest(b, "abandon-ability-able-about-above-absent-absorb", &guest_id).await
	});

	let host_result = tokio::time::timeout(std::time::Duration::from_secs(3), host_task)
		.await
		.expect("host did not finish")
		.expect("host task panicked");

	// The host's empty passphrase must surface as a Spake error
	// from `start_pairing_host`, propagated through the session
	// driver as `PairingSessionError::Spake(_)`.
	match host_result {
		Err(PairingSessionError::Spake(_)) => {}
		other => panic!("expected Spake error for empty passphrase, got {other:?}"),
	}

	let _ = tokio::time::timeout(std::time::Duration::from_secs(3), guest_task).await;
}
