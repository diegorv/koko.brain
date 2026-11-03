//! A minimal HTTP/1.1 server on `127.0.0.1` that serves the frontend bundle.
//!
//! One accept thread, one short-lived thread per connection, `Connection:
//! close` on every response. GET and HEAD only (the bundle and the vault
//! files under `/v1/asset/`, `remote::asset`), plus the `/ws` upgrade that
//! hands the connection to the browser session (`remote::rpc`). Loopback
//! traffic from one browser does not need more.
//!
//! Proposal step 1.1 (`.scratch/ios-app/architecture-proposal-2026-11-02.md`)
//! planned axum + tower-http; the std server and the hand-written WebSocket
//! in `remote::ws` avoid new crates while the host stays on loopback. The
//! deviation, its limits and when to revisit it (Issue 04) are recorded
//! under M1 in that proposal.

use std::io::{ErrorKind, Read, Write};
use std::net::{Ipv4Addr, SocketAddr, TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::Duration;

use socket2::{Domain, Protocol, Socket, Type};

use super::access::{header_values, has_proxy_marker, origin_allowed, request_allowed, Route};
use super::asset::{asset_type, is_cross_site};
use super::csp::browser_csp;
use super::dispatch::asset_path;
use super::log_text::{one_line, quoted};
use crate::utils::logger::debug_log;
use super::rpc::{run_session, RpcHost};
use super::ws::accept_key;

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

/// Longest path or login written in a request line.
const MAX_LOGGED_CHARS: usize = 512;

/// The open `/ws` sockets, so stopping the server also ends its sessions
/// (each runs on its own thread and would otherwise keep answering).
#[derive(Default)]
struct Sessions {
	stopped: bool,
	next_id: u64,
	open: HashMap<u64, TcpStream>,
}

type SessionList = Arc<Mutex<Sessions>>;

fn lock_sessions(sessions: &SessionList) -> std::sync::MutexGuard<'_, Sessions> {
	match sessions.lock() {
		Ok(g) => g,
		Err(poisoned) => poisoned.into_inner(),
	}
}

/// Registers a session's socket; `None` when the server already stopped.
fn register_session(sessions: &SessionList, stream: &TcpStream) -> Option<u64> {
	let mut list = lock_sessions(sessions);
	if list.stopped {
		return None;
	}
	let clone = stream.try_clone().ok()?;
	list.next_id += 1;
	let id = list.next_id;
	list.open.insert(id, clone);
	Some(id)
}

/// A running server. Dropping it stops the server, ends its sessions and
/// frees the port.
pub struct RemoteServer {
	addr: SocketAddr,
	route: Arc<Route>,
	stop: Arc<AtomicBool>,
	sessions: SessionList,
	thread: Option<JoinHandle<()>>,
}

impl RemoteServer {
	/// Binds `127.0.0.1:<port>` (port 0 picks a free one) and starts serving.
	/// A port that is already taken returns an error naming it.
	pub fn start(port: u16, lookup: AssetLookup) -> Result<Self, String> {
		Self::start_with_rpc(port, lookup, None)
	}

	/// `start`, plus the `/ws` browser session when `rpc` is set (without
	/// it `/ws` is a 404).
	pub fn start_with_rpc(port: u16, lookup: AssetLookup, rpc: Option<Arc<RpcHost>>) -> Result<Self, String> {
		Self::start_routed(Route::local(port), lookup, rpc)
	}

	/// `start_with_rpc` with the tailnet name and owner login of `route`
	/// (`remote::access`). Binds `route.port`; port 0 picks a free one, and
	/// the checks then use the bound port.
	pub fn start_routed(route: Route, lookup: AssetLookup, rpc: Option<Arc<RpcHost>>) -> Result<Self, String> {
		let port = route.port;
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
		let route = Arc::new(Route { port: addr.port(), ..route });
		let stop = Arc::new(AtomicBool::new(false));
		let sessions = SessionList::default();
		let (thread_stop, thread_sessions) = (stop.clone(), sessions.clone());
		let thread = std::thread::Builder::new()
			.name("remote-server".into())
			.spawn({
				let route = route.clone();
				move || accept_loop(listener, route, lookup, rpc, thread_stop, thread_sessions)
			})
			.map_err(|e| format!("Could not start the server thread: {e}"))?;
		Ok(Self { addr, route, stop, sessions, thread: Some(thread) })
	}

	/// The bound port.
	pub fn port(&self) -> u16 {
		self.addr.port()
	}

	/// The route the server checks requests against (with the bound port).
	pub fn route(&self) -> &Route {
		&self.route
	}

	/// The bound address (always on `127.0.0.1`).
	pub fn local_addr(&self) -> SocketAddr {
		self.addr
	}

	/// Stops accepting connections, waits for the accept thread to exit and
	/// closes every open `/ws` session.
	pub fn stop(self) {
		drop(self);
	}

	fn shutdown(&mut self) {
		let Some(thread) = self.thread.take() else { return };
		self.stop.store(true, Ordering::SeqCst);
		// `accept` blocks; one connection wakes it so it sees the flag.
		let _ = TcpStream::connect_timeout(&self.addr, Duration::from_secs(1));
		let _ = thread.join();
		let mut sessions = lock_sessions(&self.sessions);
		sessions.stopped = true;
		for (_, stream) in sessions.open.drain() {
			let _ = stream.shutdown(std::net::Shutdown::Both);
		}
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
	/// Starts serving `route`. Already running with that route: no-op.
	/// Running with another one (port, tailnet name or owner): the old server
	/// stops first, which also ends its sessions. Port 0 is refused (the
	/// browser must be pointed at a known port).
	pub fn start(&self, route: Route, lookup: AssetLookup, rpc: Option<Arc<RpcHost>>) -> Result<(), String> {
		if route.port == 0 {
			return Err("Port must be between 1 and 65535".into());
		}
		let mut guard = self.0.lock().map_err(|e| format!("Lock error: {e}"))?;
		if guard.as_ref().is_some_and(|s| *s.route() == route) {
			return Ok(());
		}
		if let Some(old) = guard.take() {
			old.stop();
		}
		*guard = Some(RemoteServer::start_routed(route, lookup, rpc)?);
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

fn accept_loop(
	listener: TcpListener,
	route: Arc<Route>,
	lookup: AssetLookup,
	rpc: Option<Arc<RpcHost>>,
	stop: Arc<AtomicBool>,
	sessions: SessionList,
) {
	for stream in listener.incoming() {
		if stop.load(Ordering::SeqCst) {
			break;
		}
		let Ok(stream) = stream else { continue };
		let lookup = lookup.clone();
		let rpc = rpc.clone();
		let sessions = sessions.clone();
		let route = route.clone();
		let _ = std::thread::Builder::new()
			.name("remote-conn".into())
			.spawn(move || handle_connection(stream, &route, &lookup, rpc, &sessions));
	}
}

struct Response {
	status: u16,
	reason: &'static str,
	headers: Vec<(&'static str, String)>,
	body: Vec<u8>,
	/// `Content-Length` when it is not `body.len()`: a HEAD for an asset
	/// reports the file size without reading the file.
	length: Option<u64>,
}

impl Response {
	fn empty(status: u16, reason: &'static str) -> Self {
		Self { status, reason, headers: Vec::new(), body: Vec::new(), length: None }
	}
}

fn handle_connection(
	mut stream: TcpStream,
	route: &Route,
	lookup: &AssetLookup,
	rpc: Option<Arc<RpcHost>>,
	sessions: &SessionList,
) {
	let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
	let _ = stream.set_write_timeout(Some(Duration::from_secs(30)));
	let Some(head) = read_head(&mut stream) else {
		debug_log("REMOTE", "unreadable request -> 400");
		write_response(&mut stream, Response::empty(400, "Bad Request"), true);
		return;
	};
	log_proxied(&head);
	if is_ws_target(&head) {
		match upgrade_response(&head, route, rpc.is_some()) {
			Ok(accept) => {
				let reply = format!(
					"HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: {accept}\r\n\r\n"
				);
				let Some((rpc, id)) = rpc.zip(register_session(sessions, &stream)) else {
					debug_log("REMOTE", format!("{} -> upgrade dropped, no session registered (101 not sent)", request_summary(&head)));
					return;
				};
				match stream.write_all(reply.as_bytes()) {
					Ok(()) => {
						log_request(&head, 101);
						run_session(stream, rpc, &format!("{id} ({})", request_source(&head)));
					}
					Err(e) => debug_log("REMOTE", format!("{} -> 101 not sent: {e}", request_summary(&head))),
				}
				lock_sessions(sessions).open.remove(&id);
			}
			Err(res) => {
				log_request(&head, res.status);
				write_response(&mut stream, res, true);
			}
		}
		return;
	}
	let (response, is_head) = respond(&head, route, lookup, rpc.as_deref());
	log_request(&head, response.status);
	write_response(&mut stream, response, !is_head);
}

/// Where a request came from, as the log shows it: `loopback`, or
/// `proxied login="<Tailscale-User-Login>"` for one through Tailscale Serve.
fn request_source(head: &str) -> String {
	if !has_proxy_marker(head) {
		return "loopback".into();
	}
	let login = header_values(head, "tailscale-user-login").join(",");
	format!("proxied login={}", quoted(&login, MAX_LOGGED_CHARS))
}

/// A request as the log shows it: method, path without the query and its
/// source.
fn request_summary(head: &str) -> String {
	let mut parts = head.split("\r\n").next().unwrap_or("").split(' ');
	let method = one_line(parts.next().unwrap_or(""), 16);
	let path = parts.next().unwrap_or("").split(['?', '#']).next().unwrap_or("");
	format!("{method} {} {}", one_line(path, MAX_LOGGED_CHARS), request_source(head))
}

/// Logs one request (`request_summary`) with the response status.
fn log_request(head: &str, status: u16) {
	debug_log("REMOTE", format!("{} -> {status}", request_summary(head)));
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

/// In debug mode, logs the Host and the proxy and identity headers of a
/// request that did not come straight from loopback, so the owner can see
/// what Tailscale Serve forwards.
fn log_proxied(head: &str) {
	if !has_proxy_marker(head) {
		return;
	}
	let target = head.split("\r\n").next().unwrap_or("");
	let fields: Vec<String> = ["host", "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto", "tailscale-user-login"]
		.iter()
		.map(|name| format!("{name}={:?}", header_values(head, name)))
		.collect();
	debug_log("REMOTE", format!("proxied request {target}: {}", fields.join(" ")));
}

/// Whether the request line targets `/ws` (query ignored).
fn is_ws_target(head: &str) -> bool {
	let target = head.split("\r\n").next().unwrap_or("").split(' ').nth(1).unwrap_or("");
	target.split(['?', '#']).next() == Some("/ws")
}

/// Checks a `/ws` upgrade and returns the `Sec-WebSocket-Accept` value. The
/// request must pass `request_allowed` and carry exactly one Origin on the
/// allowlist: a page from any other origin cannot open a session (browsers
/// do not apply CORS to WebSocket).
fn upgrade_response(head: &str, route: &Route, has_rpc: bool) -> Result<String, Response> {
	let origins = header_values(head, "origin");
	let origin_ok = matches!(origins.as_slice(), [origin] if origin_allowed(origin, route));
	if !request_allowed(head, route) || !origin_ok {
		return Err(Response::empty(403, "Forbidden"));
	}
	if !has_rpc {
		return Err(Response::empty(404, "Not Found"));
	}
	let method = head.split(' ').next().unwrap_or("");
	let upgrade = header_values(head, "upgrade");
	let key = header_values(head, "sec-websocket-key");
	let is_websocket = upgrade.len() == 1 && upgrade[0].eq_ignore_ascii_case("websocket");
	if method != "GET" || !is_websocket || key.len() != 1 || header_values(head, "sec-websocket-version") != ["13"] {
		return Err(Response::empty(400, "Bad Request"));
	}
	Ok(accept_key(key[0]))
}

/// Builds the response for one request head; also reports whether it was HEAD.
fn respond(head: &str, route: &Route, lookup: &AssetLookup, rpc: Option<&RpcHost>) -> (Response, bool) {
	let mut parts = head.split("\r\n").next().unwrap_or("").split(' ');
	let (Some(method), Some(target)) = (parts.next(), parts.next()) else {
		return (Response::empty(400, "Bad Request"), false);
	};
	let is_head = method == "HEAD";

	// Host allowlist (refuses DNS rebinding) and the identity rule. Same-origin
	// GETs send no Origin; one that does must name an allowed origin.
	let origins = header_values(head, "origin");
	let origin_ok = match origins.as_slice() {
		[] => true,
		[origin] => origin_allowed(origin, route),
		_ => false,
	};
	if !request_allowed(head, route) || !origin_ok {
		return (Response::empty(403, "Forbidden"), is_head);
	}

	if method != "GET" && !is_head {
		let mut res = Response::empty(405, "Method Not Allowed");
		res.headers.push(("Allow", "GET, HEAD".into()));
		return (res, is_head);
	}

	if let Some(rel) = target.split(['?', '#']).next().and_then(|p| p.strip_prefix("/v1/asset/")) {
		return (asset_response(head, rel, rpc, is_head), is_head);
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

/// Serves the vault file at the percent-encoded vault-relative `rel`
/// (`remote::asset`). A cross-site request is refused before the path is
/// looked at, so its answer does not depend on whether the file exists.
/// No session host or no open vault: 404. A path the containment rule
/// refuses (`asset_path`): 403. Missing or unreadable: 404. The whole file
/// is sent; there is no Range support. A HEAD takes the length from the
/// file's metadata and reads nothing.
fn asset_response(head: &str, rel: &str, rpc: Option<&RpcHost>, is_head: bool) -> Response {
	if is_cross_site(head) {
		return Response::empty(403, "Forbidden");
	}
	let Some(root) = rpc.and_then(|rpc| rpc.vault_root.get().0) else {
		return Response::empty(404, "Not Found");
	};
	let Some(rel) = percent_decode(rel) else {
		return Response::empty(400, "Bad Request");
	};
	let Ok(canon) = asset_path(&root, &format!("{}/{rel}", root.trim_end_matches('/'))) else {
		return Response::empty(403, "Forbidden");
	};
	let (bytes, length) = if is_head {
		match std::fs::metadata(&canon) {
			Ok(meta) if meta.is_file() => (Vec::new(), Some(meta.len())),
			_ => return Response::empty(404, "Not Found"),
		}
	} else {
		match std::fs::read(&canon) {
			Ok(bytes) => (bytes, None),
			Err(_) => return Response::empty(404, "Not Found"),
		}
	};
	let (mime_type, inline) = asset_type(&canon);
	let mut res = Response::empty(200, "OK");
	if !inline {
		res.headers.push(("Content-Security-Policy", "sandbox".into()));
		res.headers.push(("Content-Disposition", "attachment".into()));
	}
	res.headers.push(("Content-Type", mime_type.into()));
	res.headers.push(("X-Content-Type-Options", "nosniff".into()));
	res.headers.push(("Cache-Control", "no-cache".into()));
	res.body = bytes;
	res.length = length;
	res
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
	let length = res.length.unwrap_or(res.body.len() as u64);
	head.push_str(&format!("Content-Length: {length}\r\nConnection: close\r\n\r\n"));
	let _ = stream.write_all(head.as_bytes());
	if with_body {
		let _ = stream.write_all(&res.body);
	}
	let _ = stream.flush();
}
