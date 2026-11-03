//! The browser session on `/ws`: a small JSON-RPC 2.0 protocol.
//!
//! 1. The client sends `{"method":"hello","params":{"proto":1}}`; the host
//!    answers `{"method":"welcome","params":{"proto","serverVersion","vaultRoot","indexVersion"}}`.
//!    Each side closes the session when the other's `proto` is not its own.
//! 2. Requests `{"id","method":"invoke","params":{"cmd","args","headers"}}`
//!    get `{"id","result"}` or `{"id","error":{"code","message"}}`. Each runs
//!    on its own thread, so a slow call does not hold up the others. A note
//!    write refused because the note changed on the Mac has code `-32001`.
//! 3. When the desktop closes or switches vaults the host sends
//!    `{"method":"vault-changed","params":{"vaultRoot"}}`.
//! 4. Each forwarded Rust event (`remote::events`) arrives as
//!    `{"method":"event","params":{"event","payload"}}`, in emit order. There
//!    is no sequence number or replay: a session that falls behind is closed,
//!    and the browser refreshes in full when it reconnects.
//! 5. The browser sends its own log lines as `{"method":"log","params":{"tag","message"}}`
//!    (no `id`, no reply); the host writes each one through `debug_log` as
//!    `BROWSER:<tag>`, sanitized (`remote::log_text`). One sent before the
//!    hello is skipped.
//!
//! Every session start and end and every call (command, policy class,
//! outcome, time) is logged under `REMOTE`. Argument values, bodies and
//! results are never logged (a write carries the note's text), except the
//! call's path.

use std::net::TcpStream;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{sync_channel, TrySendError};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde_json::{json, Value};

use super::dispatch::{percent_decode, Call};
use super::events::EventHub;
use super::host::VaultRootCell;
use super::log_text::{one_line, quoted, sanitize_tag};
use super::policy::{classify, Class};
use super::write::CONFLICT_PREFIX;
use super::ws::{opcode, read_client_message, write_frame, Message};
use crate::utils::logger::debug_log;

/// Protocol version carried in hello/welcome.
pub const PROTO: u64 = 1;

/// JSON-RPC error code for a failed command (the command's own error).
const COMMAND_ERROR: i64 = -32000;
/// JSON-RPC error code for a note write refused as stale (`remote::write`).
pub const CONFLICT_ERROR: i64 = -32001;
/// JSON-RPC error code for a request that is not a valid call.
const INVALID_REQUEST: i64 = -32600;
/// Events queued for one session before it counts as stalled and is closed.
const EVENT_QUEUE: usize = 1024;
/// Longest browser log message written; the rest is cut.
pub const MAX_BROWSER_LOG_CHARS: usize = 2000;
/// Longest path or error message written in a call line.
const MAX_FIELD_CHARS: usize = 512;

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
/// socket fails. `label` names the session in the log (its id, and whether
/// it came from loopback or through the proxy, with the login).
pub fn run_session(stream: TcpStream, host: Arc<RpcHost>, label: &str) {
	debug_log("REMOTE", format!("session {label} started"));
	let reason = serve(stream, &host, label);
	debug_log("REMOTE", format!("session {label} ended: {reason}"));
}

/// Whether `message` is a browser log notification (`log`, no `id`).
fn is_log_notification(message: &Value) -> bool {
	message.get("method").and_then(Value::as_str) == Some("log") && message.get("id").is_none()
}

/// Writes one browser log notification as a sanitized `BROWSER:<tag>` line.
fn write_browser_log(message: &Value) {
	let tag = message.pointer("/params/tag").and_then(Value::as_str).unwrap_or("");
	let text = message.pointer("/params/message").and_then(Value::as_str).unwrap_or("");
	debug_log(&format!("BROWSER:{}", sanitize_tag(tag)), one_line(text, MAX_BROWSER_LOG_CHARS));
}

/// The session itself; returns why it ended.
fn serve(mut stream: TcpStream, host: &Arc<RpcHost>, label: &str) -> String {
	let _ = stream.set_read_timeout(None);
	let Ok(write_half) = stream.try_clone() else { return "socket error".into() };
	let writer: Writer = Arc::new(Mutex::new(write_half));

	// The client speaks first. A log line before the hello is skipped: the
	// browser holds its lines until the welcome, so one here is not its own.
	let hello = loop {
		match read_client_message(&mut stream) {
			Ok(Message::Text(text)) => match serde_json::from_str::<Value>(&text) {
				Ok(message) if is_log_notification(&message) => continue,
				parsed => break parsed.ok(),
			},
			_ => break None,
		}
	};
	// A client on another protocol version gets no welcome: it would send
	// calls this host does not understand.
	let is_hello = hello.as_ref().and_then(|h| h.get("method")).and_then(Value::as_str) == Some("hello");
	let proto = hello.as_ref().and_then(|h| h.pointer("/params/proto")).and_then(Value::as_u64);
	if !is_hello {
		close(&writer);
		return "no hello".into();
	}
	if proto != Some(PROTO) {
		close(&writer);
		return format!("protocol {proto:?} is not {PROTO}");
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
			return "socket error".into();
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
		return "welcome not sent".into();
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

	let reason = loop {
		match read_client_message(&mut stream) {
			Ok(Message::Text(text)) => {
				let message: Value = serde_json::from_str(&text).unwrap_or(Value::Null);
				if is_log_notification(&message) {
					write_browser_log(&message);
				} else {
					handle_request(message, host, &writer, label);
				}
			}
			Ok(Message::Ping(payload)) => {
				if let Ok(mut s) = writer.lock() {
					let _ = write_frame(&mut *s, opcode::PONG, &payload, None);
				}
			}
			Ok(Message::Close) => break "closed by the browser".to_string(),
			Err(e) => break format!("read failed: {e}"),
		}
	};
	closed.store(true, Ordering::SeqCst);
	host.events.unsubscribe(subscription);
	close(&writer);
	reason
}

fn close(writer: &Writer) {
	if let Ok(mut s) = writer.lock() {
		let _ = write_frame(&mut *s, opcode::CLOSE, &[], None);
		let _ = s.shutdown(std::net::Shutdown::Both);
	}
}

/// The class name a call line shows.
fn class_name(cmd: &str) -> &'static str {
	match classify(cmd) {
		Some(Class::Read) => "Read",
		Some(Class::Write) => "Write",
		Some(Class::Virtual) => "Virtual",
		Some(Class::Denied) => "Denied",
		None => "unclassified",
	}
}

/// The path a call names, the only argument a call line shows: the
/// `path` header of a plugin-fs write, percent-decoded as dispatch reads it
/// (as sent when it does not decode), else the `path` or `filePath` arg.
fn call_path(call: &Call) -> Option<String> {
	if let Some(raw) = call.headers.get("path").and_then(Value::as_str) {
		return Some(percent_decode(raw).unwrap_or_else(|| raw.to_string()));
	}
	call.args.get("path").or_else(|| call.args.get("filePath")).and_then(Value::as_str).map(str::to_owned)
}

fn handle_request(request: Value, host: &Arc<RpcHost>, writer: &Writer, label: &str) {
	let id = request.get("id").cloned().unwrap_or(Value::Null);
	let params = request.get("params").cloned().unwrap_or(Value::Null);
	let cmd = params.get("cmd").and_then(Value::as_str).map(str::to_owned);
	let (Some(cmd), Some("invoke")) = (cmd, request.get("method").and_then(Value::as_str)) else {
		let reply = json!({
			"jsonrpc": "2.0", "id": id,
			"error": { "code": INVALID_REQUEST, "message": "Expected an invoke request with params.cmd" },
		});
		send(writer, &reply);
		debug_log("REMOTE", format!("session {label}: invalid request"));
		return;
	};
	let call = Call {
		cmd,
		args: params.get("args").cloned().unwrap_or(Value::Null),
		headers: params.get("headers").cloned().unwrap_or(Value::Null),
	};
	let (host, writer, label) = (host.clone(), writer.clone(), label.to_string());
	let _ = std::thread::Builder::new().name("remote-call".into()).spawn(move || {
		let (root, _) = host.vault_root.get();
		let started = Instant::now();
		let outcome = (host.dispatch)(&call, root);
		let elapsed = started.elapsed().as_millis();
		let path = call_path(&call).map(|p| format!(" path={}", quoted(&p, MAX_FIELD_CHARS))).unwrap_or_default();
		let result = match &outcome {
			Ok(_) => "ok".to_string(),
			Err(message) => format!("error={}", quoted(message, MAX_FIELD_CHARS)),
		};
		debug_log(
			"REMOTE",
			format!(
				"session {label}: call {} class={}{path} {result} {elapsed}ms",
				one_line(&call.cmd, MAX_FIELD_CHARS),
				class_name(&call.cmd)
			),
		);
		let reply = match outcome {
			Ok(result) => json!({ "jsonrpc": "2.0", "id": id, "result": result }),
			Err(message) => {
				let code = if message.starts_with(CONFLICT_PREFIX) { CONFLICT_ERROR } else { COMMAND_ERROR };
				json!({ "jsonrpc": "2.0", "id": id, "error": { "code": code, "message": message } })
			}
		};
		send(&writer, &reply);
	});
}
