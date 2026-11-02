//! The loopback server that serves the frontend bundle to a browser
//! (`remote::server`) and the CSP it builds (`remote::csp`). The asset lookup
//! is a closure over an in-memory bundle, so no Tauri app is needed.

use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{Ipv4Addr, Ipv6Addr, TcpListener, TcpStream};
use std::sync::Arc;
use std::time::Duration;

use base64::Engine;
use kokobrain_lib::remote::csp::{browser_csp, inline_script_hashes};
use kokobrain_lib::remote::server::{AssetLookup, RemoteServer, RemoteServerSlot, ServedAsset};
use sha2::{Digest, Sha256};

const INLINE_SCRIPT: &str = "{ __sveltekit_x = { base: \"\" }; Promise.all([import(\"/_app/a.js\")]); }";

fn index_html() -> String {
	format!(
		"<!doctype html><html><head><script type=\"module\" src=\"/_app/start.js\"></script></head>\
		 <body><div><script nonce=\"abc\">{INLINE_SCRIPT}</script></div></body></html>"
	)
}

fn bundle() -> AssetLookup {
	let mut files: HashMap<String, ServedAsset> = HashMap::new();
	files.insert(
		"index.html".into(),
		ServedAsset { bytes: index_html().into_bytes(), mime_type: "text/html".into() },
	);
	files.insert(
		"_app/start.js".into(),
		ServedAsset { bytes: b"console.log(1)".to_vec(), mime_type: "text/javascript".into() },
	);
	Arc::new(move |path: &str| files.get(path).cloned())
}

fn sha256_source(text: &str) -> String {
	let digest = Sha256::digest(text.as_bytes());
	format!("'sha256-{}'", base64::engine::general_purpose::STANDARD.encode(digest))
}

struct Reply {
	status: u16,
	headers: HashMap<String, String>,
	body: Vec<u8>,
}

fn send(port: u16, raw: &str) -> Reply {
	let mut stream = TcpStream::connect((Ipv4Addr::LOCALHOST, port)).expect("connect");
	stream.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
	stream.write_all(raw.as_bytes()).unwrap();
	let mut buf = Vec::new();
	stream.read_to_end(&mut buf).unwrap();
	let split = buf.windows(4).position(|w| w == b"\r\n\r\n").expect("header end");
	let head = String::from_utf8(buf[..split].to_vec()).unwrap();
	let body = buf[split + 4..].to_vec();
	let mut lines = head.split("\r\n");
	let status: u16 = lines.next().unwrap().split(' ').nth(1).unwrap().parse().unwrap();
	let headers = lines
		.filter_map(|l| l.split_once(':'))
		.map(|(k, v)| (k.trim().to_ascii_lowercase(), v.trim().to_string()))
		.collect();
	Reply { status, headers, body }
}

fn get(port: u16, path: &str) -> Reply {
	send(port, &format!("GET {path} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\n\r\n"))
}

fn start() -> RemoteServer {
	RemoteServer::start(0, bundle()).expect("start on an ephemeral port")
}

#[test]
fn serves_index_html_at_the_root() {
	let server = start();
	let reply = get(server.port(), "/");
	assert_eq!(reply.status, 200);
	assert_eq!(reply.headers["content-type"], "text/html");
	assert_eq!(String::from_utf8(reply.body).unwrap(), index_html());
}

#[test]
fn serves_bundle_assets_by_path() {
	let server = start();
	let reply = get(server.port(), "/_app/start.js?v=1");
	assert_eq!(reply.status, 200);
	assert_eq!(reply.headers["content-type"], "text/javascript");
	assert_eq!(reply.body, b"console.log(1)");
	assert!(!reply.headers.contains_key("content-security-policy"));
}

#[test]
fn unknown_paths_fall_back_to_index_html() {
	let server = start();
	let reply = get(server.port(), "/some/client/route");
	assert_eq!(reply.status, 200);
	assert_eq!(String::from_utf8(reply.body).unwrap(), index_html());
	assert!(reply.headers.contains_key("content-security-policy"));
}

#[test]
fn html_carries_the_host_csp_with_the_served_inline_script_hash() {
	let server = start();
	let reply = get(server.port(), "/");
	let csp = &reply.headers["content-security-policy"];
	assert!(csp.len() < 4096, "CSP is {} bytes", csp.len());
	assert!(csp.contains(&sha256_source(INLINE_SCRIPT)), "{csp}");
	assert!(csp.contains("script-src 'self'"), "{csp}");
	assert_eq!(reply.headers["x-content-type-options"], "nosniff");
}

#[test]
fn wrong_host_header_gets_403() {
	let server = start();
	let port = server.port();
	for host in [
		format!("localhost:{port}"),
		"127.0.0.1".to_string(),
		format!("127.0.0.1:{}", port.wrapping_add(1)),
		format!("[::1]:{port}"),
		format!("evil.example:{port}"),
	] {
		let reply = send(port, &format!("GET / HTTP/1.1\r\nHost: {host}\r\n\r\n"));
		assert_eq!(reply.status, 403, "host {host}");
		assert!(reply.body.is_empty() || !String::from_utf8_lossy(&reply.body).contains("<html"));
	}
}

#[test]
fn missing_or_duplicate_host_header_gets_403() {
	let server = start();
	let port = server.port();
	assert_eq!(send(port, "GET / HTTP/1.1\r\n\r\n").status, 403);
	let dup = format!("GET / HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nHost: evil:1\r\n\r\n");
	assert_eq!(send(port, &dup).status, 403);
}

#[test]
fn parent_segments_are_rejected() {
	let server = start();
	let port = server.port();
	assert_eq!(get(port, "/../secret.txt").status, 400);
	assert_eq!(get(port, "/_app/%2e%2e/%2e%2e/secret.txt").status, 400);
}

#[test]
fn non_get_methods_get_405() {
	let server = start();
	let port = server.port();
	let reply = send(port, &format!("POST / HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nContent-Length: 0\r\n\r\n"));
	assert_eq!(reply.status, 405);
}

#[test]
fn head_returns_headers_without_a_body() {
	let server = start();
	let port = server.port();
	let reply = send(port, &format!("HEAD / HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\n\r\n"));
	assert_eq!(reply.status, 200);
	assert!(reply.body.is_empty());
	assert_eq!(reply.headers["content-length"], index_html().len().to_string());
}

#[test]
fn binds_loopback_only() {
	let server = start();
	assert_eq!(server.local_addr().ip(), std::net::IpAddr::V4(Ipv4Addr::LOCALHOST));
}

#[test]
fn port_in_use_is_an_error() {
	let taken = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
	let port = taken.local_addr().unwrap().port();
	let err = RemoteServer::start(port, bundle()).err().expect("bind must fail");
	assert!(err.contains("already in use"), "{err}");
	assert!(err.contains(&port.to_string()), "{err}");
}

/// std sets `SO_REUSEADDR`, which on macOS lets a `127.0.0.1` bind succeed
/// next to a wildcard listener and take over that port's loopback traffic.
#[test]
fn port_held_on_the_ipv4_wildcard_is_an_error() {
	let taken = TcpListener::bind((Ipv4Addr::UNSPECIFIED, 0)).unwrap();
	let port = taken.local_addr().unwrap().port();
	let err = RemoteServer::start(port, bundle()).err().expect("bind must fail");
	assert!(err.contains(&format!("Port {port} is already in use")), "{err}");
}

/// macOS sockets on `[::]` are dual-stack by default (`net.inet6.ip6.v6only=0`),
/// like Node's `listen(port)`.
#[test]
fn port_held_on_the_dual_stack_wildcard_is_an_error() {
	let taken = TcpListener::bind((Ipv6Addr::UNSPECIFIED, 0)).unwrap();
	let port = taken.local_addr().unwrap().port();
	let err = RemoteServer::start(port, bundle()).err().expect("bind must fail");
	assert!(err.contains(&format!("Port {port} is already in use")), "{err}");
}

/// Our own stopped server leaves TIME_WAIT sockets after a served request;
/// starting again on that port must not report it as taken.
#[test]
fn restart_after_serving_a_request_is_not_a_false_port_in_use() {
	let server = start();
	let port = server.port();
	assert_eq!(get(port, "/").status, 200);
	server.stop();
	let again = RemoteServer::start(port, bundle()).expect("port is free after stop");
	assert_eq!(get(again.port(), "/").status, 200);
}

#[test]
fn stop_frees_the_port() {
	let server = start();
	let port = server.port();
	server.stop();
	let again = RemoteServer::start(port, bundle()).expect("port is free after stop");
	assert_eq!(get(again.port(), "/").status, 200);
}

#[test]
fn missing_bundle_gets_404() {
	let empty: AssetLookup = Arc::new(|_: &str| None);
	let server = RemoteServer::start(0, empty).unwrap();
	assert_eq!(get(server.port(), "/").status, 404);
}

#[test]
fn inline_hashes_skip_external_scripts_and_cover_every_inline_one() {
	let html = "<script src=\"/a.js\"></script><script>one()</script><SCRIPT type=\"module\">two()</SCRIPT>";
	assert_eq!(inline_script_hashes(html), vec![sha256_source("one()"), sha256_source("two()")]);
}

#[test]
fn csp_without_inline_scripts_still_restricts_scripts_to_self() {
	let csp = browser_csp("<html></html>");
	assert!(csp.contains("script-src 'self' 'unsafe-eval';"), "{csp}");
	assert!(csp.contains("default-src 'self'"), "{csp}");
}

fn free_port() -> u16 {
	TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap().local_addr().unwrap().port()
}

#[test]
fn slot_starts_restarts_on_a_new_port_and_stops() {
	let slot = RemoteServerSlot::default();
	assert_eq!(slot.running_port(), None);

	let first = free_port();
	slot.start(first, bundle()).unwrap();
	assert_eq!(slot.running_port(), Some(first));
	assert_eq!(get(first, "/").status, 200);

	// Same port again is a no-op, not a bind error against itself.
	slot.start(first, bundle()).unwrap();
	assert_eq!(slot.running_port(), Some(first));

	let second = free_port();
	slot.start(second, bundle()).unwrap();
	assert_eq!(slot.running_port(), Some(second));
	assert!(TcpStream::connect((Ipv4Addr::LOCALHOST, first)).is_err(), "old port still open");

	slot.stop();
	assert_eq!(slot.running_port(), None);
	assert!(TcpStream::connect((Ipv4Addr::LOCALHOST, second)).is_err(), "port still open after stop");
	slot.stop();
}

#[test]
fn slot_rejects_port_zero_and_reports_a_taken_port() {
	let slot = RemoteServerSlot::default();
	assert!(slot.start(0, bundle()).is_err());

	let taken = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
	let port = taken.local_addr().unwrap().port();
	let err = slot.start(port, bundle()).unwrap_err();
	assert!(err.contains("already in use"), "{err}");
	assert_eq!(slot.running_port(), None);
}
