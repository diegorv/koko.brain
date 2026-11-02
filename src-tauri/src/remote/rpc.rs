//! The browser session on `/ws`: a small JSON-RPC 2.0 protocol.
//!
//! 1. The client sends `{"method":"hello","params":{"proto":1}}`; the host
//!    answers `{"method":"welcome","params":{"proto","serverVersion","vaultRoot","indexVersion"}}`.
//!    Each side closes the session when the other's `proto` is not its own.
//! 2. Requests `{"id","method":"invoke","params":{"cmd","args","headers"}}`
//!    get `{"id","result"}` or `{"id","error":{"code","message"}}`. Each runs
//!    on its own thread, so a slow call does not hold up the others.
//! 3. When the desktop closes or switches vaults the host sends
//!    `{"method":"vault-changed","params":{"vaultRoot"}}`.
//! 4. Each forwarded Rust event (`remote::events`) arrives as
//!    `{"method":"event","params":{"event","payload"}}`, in emit order. There
//!    is no sequence number or replay: a session that falls behind is closed,
//!    and the browser refreshes in full when it reconnects.

use std::net::TcpStream;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{sync_channel, TrySendError};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde_json::{json, Value};

use super::dispatch::Call;
use super::events::EventHub;
use super::host::VaultRootCell;
use super::ws::{opcode, read_client_message, write_frame, Message};

/// Protocol version carried in hello/welcome.
pub const PROTO: u64 = 1;

/// JSON-RPC error code for a failed command (the command's own error).
const COMMAND_ERROR: i64 = -32000;
/// JSON-RPC error code for a request that is not a valid call.
const INVALID_REQUEST: i64 = -32600;
/// Events queued for one session before it counts as stalled and is closed.
const EVENT_QUEUE: usize = 1024;

/// Runs one call against the desktop: `(call, open vault root)` to result.
pub type Dispatcher = Arc<dyn Fn(&Call, Option<String>) -> Result<Value, String> + Send + Sync>;

/// What a session needs from the host.
pub struct RpcHost {
	/// Sent in `welcome`.
	pub server_version: String,
	/// The desktop's open vault.
	pub vault_root: Arc<VaultRootCell>,
	/// The desktop's `VaultIndex` version, sent in `welcome`: the browser
	/// stamps the index-updated event it raises after its own (Virtual) scan.
	pub index_version: Arc<dyn Fn() -> u64 + Send + Sync>,
	/// Forwarded Rust events; every session subscribes for its lifetime.
	pub events: Arc<EventHub>,
	/// Answers `invoke` requests.
	pub dispatch: Dispatcher,
}

type Writer = Arc<Mutex<TcpStream>>;

fn send(writer: &Writer, value: &Value) -> bool {
	let Ok(mut stream) = writer.lock() else { return false };
	write_frame(&mut *stream, opcode::TEXT, value.to_string().as_bytes(), None).is_ok()
}

/// Serves one upgraded connection until the client closes it or the
/// socket fails.
pub fn run_session(mut stream: TcpStream, host: Arc<RpcHost>) {
	let _ = stream.set_read_timeout(None);
	let Ok(write_half) = stream.try_clone() else { return };
	let writer: Writer = Arc::new(Mutex::new(write_half));

	// The client speaks first.
	let hello = match read_client_message(&mut stream) {
		Ok(Message::Text(text)) => serde_json::from_str::<Value>(&text).ok(),
		_ => None,
	};
	// A client on another protocol version gets no welcome: it would send
	// calls this host does not understand.
	let is_hello = hello.as_ref().and_then(|h| h.get("method")).and_then(Value::as_str) == Some("hello");
	let proto = hello.as_ref().and_then(|h| h.pointer("/params/proto")).and_then(Value::as_u64);
	if !is_hello || proto != Some(PROTO) {
		close(&writer);
		return;
	}
	// Subscribed before the welcome so no event emitted after it is missed.
	// The sink only queues: it runs on the emitting thread, which must not
	// wait on this socket. A full queue shuts the socket down, which ends the
	// session below.
	let (event_tx, event_rx) = sync_channel::<Value>(EVENT_QUEUE);
	let subscription = match stream.try_clone() {
		Ok(socket) => host.events.subscribe(Arc::new(move |name: &str, payload: &Value| {
			let note = json!({ "jsonrpc": "2.0", "method": "event", "params": { "event": name, "payload": payload } });
			match event_tx.try_send(note) {
				Ok(()) => true,
				Err(TrySendError::Full(_)) => {
					let _ = socket.shutdown(std::net::Shutdown::Both);
					false
				}
				Err(TrySendError::Disconnected(_)) => false,
			}
		})),
		Err(_) => {
			close(&writer);
			return;
		}
	};
	let (root, mut seen) = host.vault_root.get();
	let welcome = json!({
		"jsonrpc": "2.0",
		"method": "welcome",
		"params": {
			"proto": PROTO,
			"serverVersion": host.server_version,
			"vaultRoot": root,
			"indexVersion": (host.index_version)(),
		},
	});
	if !send(&writer, &welcome) {
		host.events.unsubscribe(subscription);
		return;
	}
	{
		let writer = writer.clone();
		let _ = std::thread::Builder::new().name("remote-events".into()).spawn(move || {
			// Ends when the sink is dropped (unsubscribed) or a write fails.
			while let Ok(note) = event_rx.recv() {
				if !send(&writer, &note) {
					break;
				}
			}
		});
	}

	let closed = Arc::new(AtomicBool::new(false));
	{
		let (writer, closed, cell) = (writer.clone(), closed.clone(), host.vault_root.clone());
		let _ = std::thread::Builder::new().name("remote-vault-watch".into()).spawn(move || {
			while !closed.load(Ordering::SeqCst) {
				if let Some((root, generation)) = cell.wait_change(seen, Duration::from_millis(500)) {
					seen = generation;
					let note = json!({ "jsonrpc": "2.0", "method": "vault-changed", "params": { "vaultRoot": root } });
					if !send(&writer, &note) {
						break;
					}
				}
			}
		});
	}

	loop {
		match read_client_message(&mut stream) {
			Ok(Message::Text(text)) => handle_request(&text, &host, &writer),
			Ok(Message::Ping(payload)) => {
				if let Ok(mut s) = writer.lock() {
					let _ = write_frame(&mut *s, opcode::PONG, &payload, None);
				}
			}
			Ok(Message::Close) | Err(_) => break,
		}
	}
	closed.store(true, Ordering::SeqCst);
	host.events.unsubscribe(subscription);
	close(&writer);
}

fn close(writer: &Writer) {
	if let Ok(mut s) = writer.lock() {
		let _ = write_frame(&mut *s, opcode::CLOSE, &[], None);
		let _ = s.shutdown(std::net::Shutdown::Both);
	}
}

fn handle_request(text: &str, host: &Arc<RpcHost>, writer: &Writer) {
	let request: Value = serde_json::from_str(text).unwrap_or(Value::Null);
	let id = request.get("id").cloned().unwrap_or(Value::Null);
	let params = request.get("params").cloned().unwrap_or(Value::Null);
	let cmd = params.get("cmd").and_then(Value::as_str).map(str::to_owned);
	let (Some(cmd), Some("invoke")) = (cmd, request.get("method").and_then(Value::as_str)) else {
		let reply = json!({
			"jsonrpc": "2.0", "id": id,
			"error": { "code": INVALID_REQUEST, "message": "Expected an invoke request with params.cmd" },
		});
		send(writer, &reply);
		return;
	};
	let call = Call {
		cmd,
		args: params.get("args").cloned().unwrap_or(Value::Null),
		headers: params.get("headers").cloned().unwrap_or(Value::Null),
	};
	let (host, writer) = (host.clone(), writer.clone());
	let _ = std::thread::Builder::new().name("remote-call".into()).spawn(move || {
		let (root, _) = host.vault_root.get();
		let reply = match (host.dispatch)(&call, root) {
			Ok(result) => json!({ "jsonrpc": "2.0", "id": id, "result": result }),
			Err(message) => {
				json!({ "jsonrpc": "2.0", "id": id, "error": { "code": COMMAND_ERROR, "message": message } })
			}
		};
		send(&writer, &reply);
	});
}
