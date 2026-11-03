//! What the browser host writes to the Mac's session log (`debug_log`):
//! one `REMOTE` line per request, session start and end, one line per call
//! without its arguments, and the browser's own `BROWSER:` lines, sanitized
//! (`remote::log_text`).
//!
//! The sink and the debug flag are process globals: this binary installs
//! the sink once and keeps debug on. Tests run in parallel, so each one
//! looks only at lines carrying its own markers.

mod common_ws;

use std::io::{Read, Write};
use std::net::{Ipv4Addr, TcpStream};
use std::sync::{Arc, Mutex, Once, OnceLock};
use std::time::{Duration, Instant};

use common_ws::{connect_session, WsClient};
use kokobrain_lib::remote::access::Route;
use kokobrain_lib::remote::dispatch::Call;
use kokobrain_lib::remote::host::VaultRootCell;
use kokobrain_lib::remote::log_text::{one_line, quoted, sanitize_tag, INVALID_TAG, TRUNCATED_MARKER};
use kokobrain_lib::remote::rpc::{RpcHost, MAX_BROWSER_LOG_CHARS};
use kokobrain_lib::remote::server::{AssetLookup, RemoteServer, ServedAsset};
use kokobrain_lib::utils::logger::{debug_log, set_debug_mode, set_log_sink};
use serde_json::{json, Value};

type Lines = Arc<Mutex<Vec<(String, String)>>>;

fn lines() -> Lines {
	static LINES: OnceLock<Lines> = OnceLock::new();
	static INSTALL: Once = Once::new();
	let lines = LINES.get_or_init(Lines::default).clone();
	INSTALL.call_once(|| {
		let sink = lines.clone();
		set_log_sink(Box::new(move |tag, message, _| sink.lock().unwrap().push((tag.into(), message.into()))));
		set_debug_mode(true);
	});
	lines
}

/// Waits up to 5 s for a line matching `pred` and returns it.
fn wait_line(pred: impl Fn(&str, &str) -> bool) -> (String, String) {
	let all = lines();
	let deadline = Instant::now() + Duration::from_secs(5);
	loop {
		if let Some(line) = all.lock().unwrap().iter().find(|(t, m)| pred(t, m)) {
			return line.clone();
		}
		assert!(Instant::now() < deadline, "no matching line in {:?}", all.lock().unwrap());
		std::thread::sleep(Duration::from_millis(10));
	}
}

fn matching(pred: impl Fn(&str, &str) -> bool) -> Vec<(String, String)> {
	lines().lock().unwrap().iter().filter(|(t, m)| pred(t, m)).cloned().collect()
}

fn bundle() -> AssetLookup {
	Arc::new(|path: &str| {
		(path == "index.html").then(|| ServedAsset { bytes: b"<html></html>".to_vec(), mime_type: "text/html".into() })
	})
}

fn host() -> Arc<RpcHost> {
	let cell = Arc::new(VaultRootCell::default());
	cell.set(Some("/v".into()));
	Arc::new(RpcHost {
		server_version: "test".into(),
		vault_root: cell,
		index_version: Arc::new(|| 1),
		events: Arc::default(),
		dispatch: Arc::new(|call: &Call, _| {
			if call.cmd == "rename_note" {
				return Err("Command is not available in the browser: rename_note".into());
			}
			Ok(json!({ "echo": call.args }))
		}),
	})
}

fn start(route: Route) -> RemoteServer {
	lines();
	RemoteServer::start_routed(route, bundle(), Some(host())).unwrap()
}

fn status_of(port: u16, raw: &str) -> String {
	let mut stream = TcpStream::connect((Ipv4Addr::LOCALHOST, port)).unwrap();
	stream.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
	stream.write_all(raw.as_bytes()).unwrap();
	let mut out = Vec::new();
	let _ = stream.read_to_end(&mut out);
	String::from_utf8_lossy(&out).lines().next().unwrap_or("").to_string()
}

#[test]
fn a_loopback_request_logs_method_path_source_and_status() {
	let server = start(Route::local(0));
	let port = server.port();
	let reply = status_of(port, &format!("GET /loopback-marker?secret=1 HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\n\r\n"));
	assert!(reply.starts_with("HTTP/1.1 200"), "{reply}");
	let (tag, message) = wait_line(|_, m| m.contains("/loopback-marker"));
	assert_eq!(tag, "REMOTE");
	assert_eq!(message, "GET /loopback-marker loopback -> 200");
}

#[test]
fn a_refused_proxied_request_logs_its_login_and_403() {
	let server = start(Route { port: 0, tailnet_host: Some("mac.tail.ts.net".into()), owner_login: Some("owner@x".into()) });
	let port = server.port();
	let raw = format!(
		"GET /refused-marker HTTP/1.1\r\nHost: mac.tail.ts.net:{port}\r\nX-Forwarded-For: 100.64.0.2\r\n\
		 Tailscale-User-Login: mallory@x\r\n\r\n"
	);
	assert!(status_of(port, &raw).starts_with("HTTP/1.1 403"));
	let (_, message) = wait_line(|t, m| t == "REMOTE" && m.starts_with("GET /refused-marker"));
	assert_eq!(message, "GET /refused-marker proxied login=\"mallory@x\" -> 403");
	// The proxied-headers line stays.
	wait_line(|_, m| m.starts_with("proxied request GET /refused-marker"));
}

#[test]
fn a_session_logs_its_start_its_end_and_each_call_without_arguments() {
	let server = start(Route::local(0));
	let (mut client, _) = connect_session(server.port());
	let reply = client.invoke_with(
		1,
		"plugin:fs|write_text_file",
		json!({ "text": "SECRET-NOTE-TEXT" }),
		// plugin-fs sends the path header percent-encoded.
		json!({ "path": "%2Fv%2Fcall-marker.md", "base": "SECRET-BASE-TEXT" }),
	);
	assert!(reply["result"].is_object());
	let refused = client.invoke(2, "rename_note", json!({ "oldPath": "/v/call-marker-2.md", "newName": "SECRET-NAME" }));
	assert!(refused["error"].is_object());
	client.invoke(3, "bogus_call_marker", json!({ "content": "SECRET-CONTENT" }));
	drop(client);

	let (_, write) = wait_line(|_, m| m.contains("call plugin:fs|write_text_file") && m.contains("call-marker.md"));
	assert!(write.contains("class=Write path=\"/v/call-marker.md\" ok "), "{write}");
	assert!(write.ends_with("ms"), "{write}");
	let (_, denied) = wait_line(|_, m| m.contains("call rename_note"));
	assert!(denied.contains("class=Denied error=\"Command is not available in the browser: rename_note\""), "{denied}");
	let (_, unclassified) = wait_line(|_, m| m.contains("call bogus_call_marker"));
	assert!(unclassified.contains("class=unclassified ok"), "{unclassified}");

	let label = write.split(": call").next().unwrap().trim_start_matches("session ").to_string();
	assert!(label.ends_with("(loopback)"), "{label}");
	// The upgrade line carries no session id, so any loopback session's matches.
	wait_line(|t, m| t == "REMOTE" && m == "GET /ws loopback -> 101");
	wait_line(|_, m| m == format!("session {label} started"));
	wait_line(|_, m| m.starts_with(&format!("session {label} ended: ")));
	assert!(matching(|_, m| m.contains("SECRET")).is_empty(), "an argument value reached the log");
}

#[test]
fn a_browser_log_line_is_written_as_one_sanitized_line() {
	let server = start(Route::local(0));
	let (mut client, _) = connect_session(server.port());
	let send = |client: &mut WsClient, tag: &str, message: &str| {
		client.send(&json!({ "jsonrpc": "2.0", "method": "log", "params": { "tag": tag, "message": message } }));
	};
	send(&mut client, "FRONT-END:LOG-MARKER", "first\nsecond\r\u{2028}third");
	send(&mut client, "bad tag\n[REMOTE]", "badtag-marker");
	let long = format!("long-marker{}", "x".repeat(MAX_BROWSER_LOG_CHARS * 2));
	send(&mut client, "LONG", &long);
	// A call after them proves they were read without a reply in between.
	client.invoke(1, "get_all_tags_v2", Value::Null);

	let (tag, message) = wait_line(|t, _| t == "BROWSER:FRONT-END:LOG-MARKER");
	assert_eq!((tag.as_str(), message.as_str()), ("BROWSER:FRONT-END:LOG-MARKER", "first\\nsecond\\r\\u{2028}third"));
	let (tag, _) = wait_line(|_, m| m == "badtag-marker");
	assert_eq!(tag, format!("BROWSER:{INVALID_TAG}"));
	let (_, message) = wait_line(|t, m| t == "BROWSER:LONG" && m.starts_with("long-marker"));
	assert!(message.ends_with(TRUNCATED_MARKER));
	assert_eq!(message.chars().count(), MAX_BROWSER_LOG_CHARS + TRUNCATED_MARKER.len());
	for (tag, message) in matching(|t, _| t.starts_with("BROWSER:")) {
		assert!(!tag.contains(['\n', '\r', ' ']) && !message.contains(['\n', '\r']), "{tag} {message}");
	}
}

#[test]
fn a_log_line_before_the_hello_is_ignored() {
	let server = start(Route::local(0));
	let mut client = WsClient::open(server.port());
	client.send(&json!({ "jsonrpc": "2.0", "method": "log", "params": { "tag": "EARLY", "message": "early-marker" } }));
	client.send(&json!({ "jsonrpc": "2.0", "method": "hello", "params": { "proto": 1 } }));
	assert_eq!(client.recv()["method"], "welcome");
	client.send(&json!({ "jsonrpc": "2.0", "method": "log", "params": { "tag": "LATE", "message": "late-marker" } }));
	wait_line(|_, m| m == "late-marker");
	assert!(matching(|_, m| m == "early-marker").is_empty());
}

#[test]
fn sanitize_tag_keeps_short_plain_tags_only() {
	assert_eq!(sanitize_tag("ERROR:FRONT-END:LIFECYCLE"), "ERROR:FRONT-END:LIFECYCLE");
	assert_eq!(sanitize_tag(""), INVALID_TAG);
	assert_eq!(sanitize_tag("has space"), INVALID_TAG);
	assert_eq!(sanitize_tag("caf\u{e9}"), INVALID_TAG);
	assert_eq!(sanitize_tag(&"A".repeat(49)), INVALID_TAG);
}

#[test]
fn one_line_escapes_controls_and_cuts_at_the_cap() {
	assert_eq!(one_line("", 10), "");
	assert_eq!(one_line("a\tb\u{1b}c", 100), "a\\tb\\u{1b}c");
	assert_eq!(one_line("abcdef", 3), format!("abc{TRUNCATED_MARKER}"));
	// An escape is never split by the cut.
	assert_eq!(one_line("ab\n", 3), format!("ab{TRUNCATED_MARKER}"));
}

#[test]
fn quoted_escapes_quotes_and_backslashes_inside_its_quotes() {
	assert_eq!(quoted("", 10), "\"\"");
	assert_eq!(quoted("a\" ok 0ms", 100), "\"a\\\" ok 0ms\"");
	assert_eq!(quoted("C:\\x\n", 100), "\"C:\\\\x\\n\"");
	assert_eq!(quoted("ab\"", 3), format!("\"ab{TRUNCATED_MARKER}\""));
}

#[test]
fn a_path_header_that_does_not_decode_is_logged_as_sent() {
	let server = start(Route::local(0));
	let (mut client, _) = connect_session(server.port());
	client.invoke_with(1, "plugin:fs|write_text_file", Value::Null, json!({ "path": "/v/bad-%zz-marker.md" }));
	let (_, line) = wait_line(|_, m| m.contains("bad-%zz-marker"));
	assert!(line.contains("path=\"/v/bad-%zz-marker.md\""), "{line}");
}

#[test]
fn debug_log_still_reaches_the_sink_unchanged() {
	lines();
	debug_log("DESKTOP-MARKER", "line\nkept as is");
	wait_line(|t, m| t == "DESKTOP-MARKER" && m == "line\nkept as is");
}
