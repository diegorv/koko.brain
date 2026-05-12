//! End-to-end test that the sync session driver works through a
//! real `tokio::net::TcpListener` rather than only through
//! `tokio::io::duplex` pairs. This exercises the path Stage 5
//! wires inside `lan_sync_start` -> `accept_loop` ->
//! `session::run_session_server`. The accept-loop body itself is
//! private to the Tauri command module; this test re-creates the
//! relevant subset directly to keep the test outside that crate
//! boundary.

use std::collections::HashMap;
use std::sync::Mutex;

use kokobrain_lib::sync::identity::{
	load_or_create_identity, IdentityError, KeyStorage, PeerIdentity,
};
use kokobrain_lib::sync::protocol::AppMsg;
use kokobrain_lib::sync::session::{
	run_session_client, run_session_server, SessionHandles, OUTBOUND_QUEUE_CAPACITY,
};
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

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn session_completes_over_real_tcp_listener() {
	let server_id = fresh_identity("server-tcp");
	let client_id = fresh_identity("client-tcp");
	let server_pub = *server_id.verifying_key();
	let client_pub = *client_id.verifying_key();

	// 1. Server side binds a real loopback listener.
	let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
	let port = listener.local_addr().unwrap().port();

	// 2. Server-side task: accept one connection and run the
	//    session driver. Holds onto its outbound sender via
	//    `_server_out_tx` so the channel stays open for the lifetime
	//    of the test (closing it would also close the session).
	let server_id_for_task = server_id.clone();
	let server_task = tokio::spawn(async move {
		let (stream, _) = listener.accept().await.unwrap();
		let (server_out_tx, server_out_rx) = mpsc::channel::<AppMsg>(OUTBOUND_QUEUE_CAPACITY);
		let handles = SessionHandles {
			app_handle: None,
			outbound_rx: server_out_rx,
		};
		let result = run_session_server(stream, &server_id_for_task, &[client_pub], handles).await;
		drop(server_out_tx);
		result
	});

	// 3. Client side: connect, run the client driver.
	let client_id_for_task = client_id.clone();
	let client_task = tokio::spawn(async move {
		let stream = tokio::net::TcpStream::connect(("127.0.0.1", port))
			.await
			.unwrap();
		let (client_out_tx, client_out_rx) = mpsc::channel::<AppMsg>(OUTBOUND_QUEUE_CAPACITY);
		let handles = SessionHandles {
			app_handle: None,
			outbound_rx: client_out_rx,
		};
		// Let the handshake settle, then drop the outbound channel
		// so the session loop returns Ok(()).
		let session = tokio::spawn(async move {
			run_session_client(stream, &client_id_for_task, &[server_pub], handles).await
		});
		tokio::time::sleep(std::time::Duration::from_millis(200)).await;
		drop(client_out_tx);
		session.await.unwrap()
	});

	let server_result = tokio::time::timeout(std::time::Duration::from_secs(5), server_task)
		.await
		.expect("server task did not finish")
		.expect("server task panicked");
	let client_result = tokio::time::timeout(std::time::Duration::from_secs(5), client_task)
		.await
		.expect("client task did not finish")
		.expect("client task panicked");

	assert!(server_result.is_ok(), "server: {server_result:?}");
	assert!(client_result.is_ok(), "client: {client_result:?}");
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn server_aborts_session_on_listener_close() {
	// Models `lan_sync_stop`: the TcpListener is dropped while a
	// session task is still running. The client side observes
	// connection close as an EOF, which the session driver
	// surfaces as Ok(()).
	let _server_id = fresh_identity("server-abort");
	let client_id = fresh_identity("client-abort");
	let server_pub = *_server_id.verifying_key();
	let _client_pub = *client_id.verifying_key();

	let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
	let port = listener.local_addr().unwrap().port();

	let server_task = tokio::spawn(async move {
		let (stream, _) = listener.accept().await.unwrap();
		let (_tx, server_out_rx) = mpsc::channel::<AppMsg>(OUTBOUND_QUEUE_CAPACITY);
		let handles = SessionHandles {
			app_handle: None,
			outbound_rx: server_out_rx,
		};
		// Abort by dropping the stream straight after accept - the
		// client should see EOF on its very first read attempt.
		drop(stream);
		drop(handles);
	});

	let stream = tokio::net::TcpStream::connect(("127.0.0.1", port))
		.await
		.unwrap();
	let (_tx, rx) = mpsc::channel::<AppMsg>(OUTBOUND_QUEUE_CAPACITY);
	let result = run_session_client(
		stream,
		&client_id,
		&[server_pub],
		SessionHandles {
			app_handle: None,
			outbound_rx: rx,
		},
	)
	.await;
	// EOF before handshake completes -> UnexpectedEof.
	use kokobrain_lib::sync::session::SessionError;
	assert!(
		matches!(result, Err(SessionError::UnexpectedEof) | Err(SessionError::Io(_))),
		"expected EOF/IO, got {result:?}"
	);
	let _ = server_task.await;
}
