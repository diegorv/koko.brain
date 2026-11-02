//! A minimal HTTP/1.1 server on `127.0.0.1` that serves the frontend bundle.
//!
//! One accept thread, one short-lived thread per connection, `Connection:
//! close` on every response. GET and HEAD only. Loopback traffic from one
//! browser does not need more.
//!
//! A placeholder for phase 1 step 1.1 of
//! `.scratch/ios-app/architecture-proposal-2026-11-02.md`, which replaces it
//! with axum + tower-http (Host and Origin allowlist, WebSocket on the same
//! server). Do not grow WebSocket or other routes on this module.

use std::io::{ErrorKind, Read, Write};
use std::net::{Ipv4Addr, SocketAddr, TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::Duration;

use socket2::{Domain, Protocol, Socket, Type};

use super::csp::browser_csp;

/// One bundle file as the server sends it.
#[derive(Clone, Debug)]
pub struct ServedAsset {
	/// The file bytes.
	pub bytes: Vec<u8>,
	/// The `Content-Type` value.
	pub mime_type: String,
}

/// Resolves a bundle path without its leading `/` (`index.html`,
/// `_app/immutable/...`) to its bytes, or `None` when the bundle has no such
/// file.
pub type AssetLookup = Arc<dyn Fn(&str) -> Option<ServedAsset> + Send + Sync>;

/// Largest request head accepted; the bundle needs no large headers.
const MAX_HEAD_BYTES: usize = 16 * 1024;

/// A running server. Dropping it stops the server and frees the port.
pub struct RemoteServer {
	addr: SocketAddr,
	stop: Arc<AtomicBool>,
	thread: Option<JoinHandle<()>>,
}

impl RemoteServer {
	/// Binds `127.0.0.1:<port>` (port 0 picks a free one) and starts serving.
	/// A port that is already taken returns an error naming it.
	pub fn start(port: u16, lookup: AssetLookup) -> Result<Self, String> {
		let in_use = |ip: Ipv4Addr| {
			move |e: std::io::Error| {
				if e.kind() == ErrorKind::AddrInUse {
					format!("Port {port} is already in use")
				} else {
					format!("Could not listen on {ip}:{port}: {e}")
				}
			}
		};
		// std binds with `SO_REUSEADDR`, so on macOS the `127.0.0.1` bind below
		// succeeds next to another process listening on `0.0.0.0` or dual-stack
		// `[::]`, and would take over that port's loopback traffic. A wildcard
		// bind does conflict with those holders. The probe is a raw socket that
		// is bound and dropped without `listen` (std's `TcpListener::bind` would
		// listen), so nothing is ever reachable on a non-loopback address. It
		// sets `SO_REUSEADDR` like std, so TIME_WAIT sockets left by our own
		// stopped server do not trip it.
		if port != 0 {
			probe_wildcard(port).map_err(in_use(Ipv4Addr::UNSPECIFIED))?;
		}
		let listener =
			TcpListener::bind((Ipv4Addr::LOCALHOST, port)).map_err(in_use(Ipv4Addr::LOCALHOST))?;
		let addr = listener.local_addr().map_err(|e| e.to_string())?;
		let stop = Arc::new(AtomicBool::new(false));
		let thread_stop = stop.clone();
		let thread = std::thread::Builder::new()
			.name("remote-server".into())
			.spawn(move || accept_loop(listener, addr.port(), lookup, thread_stop))
			.map_err(|e| format!("Could not start the server thread: {e}"))?;
		Ok(Self { addr, stop, thread: Some(thread) })
	}

	/// The bound port.
	pub fn port(&self) -> u16 {
		self.addr.port()
	}

	/// The bound address (always on `127.0.0.1`).
	pub fn local_addr(&self) -> SocketAddr {
		self.addr
	}

	/// Stops accepting connections and waits for the accept thread to exit.
	pub fn stop(self) {
		drop(self);
	}

	fn shutdown(&mut self) {
		let Some(thread) = self.thread.take() else { return };
		self.stop.store(true, Ordering::SeqCst);
		// `accept` blocks; one connection wakes it so it sees the flag.
		let _ = TcpStream::connect_timeout(&self.addr, Duration::from_secs(1));
		let _ = thread.join();
	}
}

/// Binds a TCP socket to `0.0.0.0:<port>` without listening, then drops it.
fn probe_wildcard(port: u16) -> std::io::Result<()> {
	let socket = Socket::new(Domain::IPV4, Type::STREAM, Some(Protocol::TCP))?;
	socket.set_reuse_address(true)?;
	socket.bind(&SocketAddr::from((Ipv4Addr::UNSPECIFIED, port)).into())
}

impl Drop for RemoteServer {
	fn drop(&mut self) {
		self.shutdown();
	}
}

/// Holds at most one running server: the app-wide state behind the
/// `start_remote_server` / `stop_remote_server` commands.
#[derive(Default)]
pub struct RemoteServerSlot(Mutex<Option<RemoteServer>>);

impl RemoteServerSlot {
	/// Starts serving on `port`. Already running on that port: no-op. Running
	/// on another port: the old server stops first. Port 0 is refused (the
	/// browser must be pointed at a known port).
	pub fn start(&self, port: u16, lookup: AssetLookup) -> Result<(), String> {
		if port == 0 {
			return Err("Port must be between 1 and 65535".into());
		}
		let mut guard = self.0.lock().map_err(|e| format!("Lock error: {e}"))?;
		if guard.as_ref().is_some_and(|s| s.port() == port) {
			return Ok(());
		}
		if let Some(old) = guard.take() {
			old.stop();
		}
		*guard = Some(RemoteServer::start(port, lookup)?);
		Ok(())
	}

	/// Stops the running server, if any.
	pub fn stop(&self) {
		let old = match self.0.lock() {
			Ok(mut guard) => guard.take(),
			Err(poisoned) => poisoned.into_inner().take(),
		};
		if let Some(old) = old {
			old.stop();
		}
	}

	/// The port of the running server, `None` when stopped.
	pub fn running_port(&self) -> Option<u16> {
		self.0.lock().ok().and_then(|g| g.as_ref().map(RemoteServer::port))
	}
}

fn accept_loop(listener: TcpListener, port: u16, lookup: AssetLookup, stop: Arc<AtomicBool>) {
	for stream in listener.incoming() {
		if stop.load(Ordering::SeqCst) {
			break;
		}
		let Ok(stream) = stream else { continue };
		let lookup = lookup.clone();
		let _ = std::thread::Builder::new()
			.name("remote-conn".into())
			.spawn(move || handle_connection(stream, port, &lookup));
	}
}

struct Response {
	status: u16,
	reason: &'static str,
	headers: Vec<(&'static str, String)>,
	body: Vec<u8>,
}

impl Response {
	fn empty(status: u16, reason: &'static str) -> Self {
		Self { status, reason, headers: Vec::new(), body: Vec::new() }
	}
}

fn handle_connection(mut stream: TcpStream, port: u16, lookup: &AssetLookup) {
	let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
	let _ = stream.set_write_timeout(Some(Duration::from_secs(30)));
	let Some(head) = read_head(&mut stream) else {
		write_response(&mut stream, Response::empty(400, "Bad Request"), true);
		return;
	};
	let (response, is_head) = respond(&head, port, lookup);
	write_response(&mut stream, response, !is_head);
}

/// Reads up to the blank line that ends the request head.
fn read_head(stream: &mut TcpStream) -> Option<String> {
	let mut buf = Vec::with_capacity(1024);
	let mut chunk = [0u8; 1024];
	loop {
		if let Some(end) = buf.windows(4).position(|w| w == b"\r\n\r\n") {
			buf.truncate(end);
			return String::from_utf8(buf).ok();
		}
		if buf.len() > MAX_HEAD_BYTES {
			return None;
		}
		match stream.read(&mut chunk) {
			Ok(0) | Err(_) => return None,
			Ok(n) => buf.extend_from_slice(&chunk[..n]),
		}
	}
}

/// Builds the response for one request head; also reports whether it was HEAD.
fn respond(head: &str, port: u16, lookup: &AssetLookup) -> (Response, bool) {
	let mut lines = head.split("\r\n");
	let mut parts = lines.next().unwrap_or("").split(' ');
	let (Some(method), Some(target)) = (parts.next(), parts.next()) else {
		return (Response::empty(400, "Bad Request"), false);
	};
	let is_head = method == "HEAD";

	// Exactly one Host header, exactly `127.0.0.1:<port>`: refuses DNS
	// rebinding and any name other than the loopback address.
	let hosts: Vec<&str> = lines
		.filter_map(|l| l.split_once(':'))
		.filter(|(name, _)| name.trim().eq_ignore_ascii_case("host"))
		.map(|(_, value)| value.trim())
		.collect();
	if hosts.len() != 1 || hosts[0] != format!("127.0.0.1:{port}") {
		return (Response::empty(403, "Forbidden"), is_head);
	}

	if method != "GET" && !is_head {
		let mut res = Response::empty(405, "Method Not Allowed");
		res.headers.push(("Allow", "GET, HEAD".into()));
		return (res, is_head);
	}

	let Some(path) = bundle_path(target) else {
		return (Response::empty(400, "Bad Request"), is_head);
	};

	// Unknown paths fall back to `index.html` so client routes load.
	let asset = lookup(if path.is_empty() { "index.html" } else { &path }).or_else(|| lookup("index.html"));
	let Some(asset) = asset else {
		return (Response::empty(404, "Not Found"), is_head);
	};

	let mut res = Response::empty(200, "OK");
	if asset.mime_type.starts_with("text/html") {
		res.headers.push(("Content-Security-Policy", browser_csp(&String::from_utf8_lossy(&asset.bytes))));
	}
	res.headers.push(("Content-Type", asset.mime_type));
	res.headers.push(("X-Content-Type-Options", "nosniff".into()));
	res.headers.push(("Cache-Control", "no-cache".into()));
	res.body = asset.bytes;
	(res, is_head)
}

/// The percent-decoded bundle path of a request target, without the leading
/// `/`, query or fragment. `None` for a target that is not an absolute path,
/// does not decode, or contains a `..` segment: under `tauri dev` the asset
/// resolver joins the path onto the build directory on disk, so a parent
/// segment would read outside it.
fn bundle_path(target: &str) -> Option<String> {
	let raw = target.split(['?', '#']).next()?;
	let raw = raw.strip_prefix('/')?;
	let decoded = percent_decode(raw)?;
	if decoded.contains('\\') || decoded.contains('\0') || decoded.split('/').any(|seg| seg == "..") {
		return None;
	}
	Some(decoded)
}

fn percent_decode(text: &str) -> Option<String> {
	let bytes = text.as_bytes();
	let mut out = Vec::with_capacity(bytes.len());
	let mut i = 0;
	while i < bytes.len() {
		if bytes[i] == b'%' {
			let hex = std::str::from_utf8(bytes.get(i + 1..i + 3)?).ok()?;
			out.push(u8::from_str_radix(hex, 16).ok()?);
			i += 3;
		} else {
			out.push(bytes[i]);
			i += 1;
		}
	}
	String::from_utf8(out).ok()
}

fn write_response(stream: &mut TcpStream, res: Response, with_body: bool) {
	let mut head = format!("HTTP/1.1 {} {}\r\n", res.status, res.reason);
	for (name, value) in &res.headers {
		head.push_str(&format!("{name}: {value}\r\n"));
	}
	head.push_str(&format!("Content-Length: {}\r\nConnection: close\r\n\r\n", res.body.len()));
	let _ = stream.write_all(head.as_bytes());
	if with_body {
		let _ = stream.write_all(&res.body);
	}
	let _ = stream.flush();
}
