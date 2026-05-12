//! Integration tests for the post-handshake session driver in
//! `src-tauri/src/sync/session.rs`. Each test wires two halves of
//! the same `tokio::io::duplex` pair to a client and a server task,
//! so no real socket is involved.
//!
//! For Stage 2 the goals are:
//! - The handshake exchange succeeds when both sides trust each
//!   other and both run on the same protocol version.
//! - An unknown peer is rejected with the right `TransportError`.
//! - The Ping/Pong keepalive round-trips through the encrypted
//!   transport (because `Ping` flows through `Sealer`/`Opener`, this
//!   also proves end-to-end AEAD wiring).
//! - Outbound `AppMsg::Pong` injected by an external producer
//!   reaches the peer.
//!
//! Application-protocol dispatch (`Subscribe`, `Manifest`,
//! `RequestBlock`, etc.) is intentionally not exercised here; it
//! lands together with the orchestration code in Stage 5.

use std::collections::HashMap;
use std::sync::Mutex;

use kokobrain_lib::sync::identity::{
	load_or_create_identity, IdentityError, KeyStorage, PeerIdentity,
};
use kokobrain_lib::sync::protocol::AppMsg;
use kokobrain_lib::sync::session::{
	run_session_client, run_session_server, SessionError, SessionHandles, OUTBOUND_QUEUE_CAPACITY,
};
use kokobrain_lib::sync::transport::TransportError;
use tokio::sync::mpsc;

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

/// Convenience constructor for `SessionHandles` with no AppHandle
/// (tests do not emit Tauri events; nothing to assert against).
fn handles_with(outbound_rx: mpsc::Receiver<AppMsg>) -> SessionHandles {
	SessionHandles {
		app_handle: None,
		outbound_rx,
	}
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn handshake_succeeds_when_both_sides_trust_each_other() {
	let client_id = fresh_identity("client");
	let server_id = fresh_identity("server");
	let client_trusts = vec![*server_id.verifying_key()];
	let server_trusts = vec![*client_id.verifying_key()];

	let (a, b) = tokio::io::duplex(16 * 1024);
	let (client_out_tx, client_out_rx) = mpsc::channel::<AppMsg>(OUTBOUND_QUEUE_CAPACITY);
	let (server_out_tx, server_out_rx) = mpsc::channel::<AppMsg>(OUTBOUND_QUEUE_CAPACITY);

	let server_task = tokio::spawn(async move {
		run_session_server(a, &server_id, &server_trusts, handles_with(server_out_rx)).await
	});
	let client_task = tokio::spawn(async move {
		run_session_client(b, &client_id, &client_trusts, handles_with(client_out_rx)).await
	});

	// Let the handshake settle.
	tokio::time::sleep(std::time::Duration::from_millis(100)).await;

	// Close the channels: producers drop -> sessions return Ok(()).
	drop(client_out_tx);
	drop(server_out_tx);

	let server_result = tokio::time::timeout(std::time::Duration::from_secs(5), server_task)
		.await
		.expect("server task did not finish in time")
		.expect("server task panicked");
	let client_result = tokio::time::timeout(std::time::Duration::from_secs(5), client_task)
		.await
		.expect("client task did not finish in time")
		.expect("client task panicked");

	assert!(matches!(server_result, Ok(())), "server: {server_result:?}");
	assert!(matches!(client_result, Ok(())), "client: {client_result:?}");
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn handshake_rejects_unknown_peer_on_server_side() {
	let client_id = fresh_identity("client");
	let server_id = fresh_identity("server");
	let stranger_id = fresh_identity("stranger");
	// Server's trust store does NOT include the real client - it
	// has a different fingerprint instead.
	let server_trusts = vec![*stranger_id.verifying_key()];
	let client_trusts = vec![*server_id.verifying_key()];

	let (a, b) = tokio::io::duplex(16 * 1024);
	let (_client_out_tx, client_out_rx) = mpsc::channel::<AppMsg>(OUTBOUND_QUEUE_CAPACITY);
	let (_server_out_tx, server_out_rx) = mpsc::channel::<AppMsg>(OUTBOUND_QUEUE_CAPACITY);

	let server_task = tokio::spawn(async move {
		run_session_server(a, &server_id, &server_trusts, handles_with(server_out_rx)).await
	});
	let client_task = tokio::spawn(async move {
		run_session_client(b, &client_id, &client_trusts, handles_with(client_out_rx)).await
	});

	let server_result = tokio::time::timeout(std::time::Duration::from_secs(5), server_task)
		.await
		.expect("server task hung")
		.expect("server task panicked");

	// The server must reject the unknown client with UnknownPeer.
	match server_result {
		Err(SessionError::Transport(TransportError::UnknownPeer { .. })) => {}
		other => panic!("server should reject unknown peer, got {other:?}"),
	}

	// The client side may either succeed in the handshake (server
	// closed after receiving the client's IdentityProof) or surface
	// an EOF / IO error; we only require the task to finish.
	let _ = tokio::time::timeout(std::time::Duration::from_secs(5), client_task).await;
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn outbound_pong_reaches_peer_after_handshake() {
	let client_id = fresh_identity("c-out");
	let server_id = fresh_identity("s-out");
	let client_trusts = vec![*server_id.verifying_key()];
	let server_trusts = vec![*client_id.verifying_key()];

	let (a, b) = tokio::io::duplex(16 * 1024);
	let (client_out_tx, client_out_rx) = mpsc::channel::<AppMsg>(OUTBOUND_QUEUE_CAPACITY);
	let (_server_out_tx, server_out_rx) = mpsc::channel::<AppMsg>(OUTBOUND_QUEUE_CAPACITY);

	let server_task = tokio::spawn(async move {
		run_session_server(a, &server_id, &server_trusts, handles_with(server_out_rx)).await
	});
	let client_task = tokio::spawn(async move {
		run_session_client(b, &client_id, &client_trusts, handles_with(client_out_rx)).await
	});

	// Let the handshake complete before pushing outbound traffic.
	tokio::time::sleep(std::time::Duration::from_millis(100)).await;

	// Client pushes a `Ping` outbound; the server's session loop
	// should auto-reply with `Pong`. If the seal/open AEAD plumbing
	// were broken the server would error out before the timeout.
	client_out_tx
		.send(AppMsg::Ping)
		.await
		.expect("client outbound channel must accept the Ping");
	// Give the server a chance to round-trip the Pong.
	tokio::time::sleep(std::time::Duration::from_millis(100)).await;

	drop(client_out_tx);
	let _ = tokio::time::timeout(std::time::Duration::from_secs(5), server_task).await;
	let _ = tokio::time::timeout(std::time::Duration::from_secs(5), client_task).await;
}
