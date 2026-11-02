//! Rust events forwarded to browser sessions (`remote::events`): the
//! allowlist, its parity with the frontend `EventMap`, and delivery over the
//! real `/ws` session.

mod common_ws;

use std::sync::Arc;
use std::time::Duration;

use common_ws::connect_session;
use kokobrain_lib::remote::events::{forwarding, EventHub, Forwarding, FORWARDED_EVENTS};
use kokobrain_lib::remote::host::VaultRootCell;
use kokobrain_lib::remote::rpc::RpcHost;
use kokobrain_lib::remote::server::{AssetLookup, RemoteServer};
use serde_json::{json, Value};

/// The keys of `interface EventMap` in `src/lib/contracts/events.ts`, in any
/// key form (`'a': T`, `"a": T`, `a: T`, `'a'?: T`). Panics on a member line
/// it cannot read, so a new key form fails the parity test instead of being
/// skipped.
fn frontend_event_names() -> Vec<String> {
	let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../src/lib/contracts/events.ts");
	let source = std::fs::read_to_string(path).expect("events.ts");
	let start = source.find("export interface EventMap {").expect("EventMap");
	let body = &source[start..];
	let body = &body[body.find('{').unwrap() + 1..body.find("\n}").expect("end of EventMap")];
	body.lines()
		.filter(|line| line.starts_with('\t') && !line.starts_with("\t\t"))
		.map(str::trim)
		.filter(|line| !line.is_empty() && !line.starts_with("/*") && !line.starts_with('*') && !line.starts_with("//"))
		.map(|line| parse_event_key(line).unwrap_or_else(|| panic!("unreadable EventMap member: {line}")))
		.collect()
}

/// The key of one `EventMap` member line, `None` when it is not `key: type`.
fn parse_event_key(line: &str) -> Option<String> {
	let colon = line.find(':')?;
	let quoted = line.starts_with('\'') || line.starts_with('"');
	let key = if quoted {
		let quote = line.chars().next()?;
		let end = line[1..].find(quote)? + 1;
		&line[1..end]
	} else {
		line[..colon].trim_end_matches('?').trim()
	};
	let after = line[if quoted { key.len() + 2 } else { colon }..].trim_start_matches('?');
	(after.starts_with(':') && !key.is_empty()).then(|| key.to_string())
}

#[test]
fn the_event_map_parser_reads_every_key_form() {
	assert_eq!(parse_event_key("'vault-index-updated': UpdateResult;").as_deref(), Some("vault-index-updated"));
	assert_eq!(parse_event_key("\"qc:open-composer\": string;").as_deref(), Some("qc:open-composer"));
	assert_eq!(parse_event_key("fooBar: X;").as_deref(), Some("fooBar"));
	assert_eq!(parse_event_key("'opt'?: X;").as_deref(), Some("opt"));
	assert_eq!(parse_event_key("bare?: X;").as_deref(), Some("bare"));
	assert_eq!(parse_event_key("not a member"), None);
}

#[test]
fn every_frontend_event_is_classified() {
	let names = frontend_event_names();
	assert!(names.len() >= 8, "parsed too few EventMap keys: {names:?}");
	let unclassified: Vec<&String> = names.iter().filter(|n| forwarding(n).is_none()).collect();
	assert!(unclassified.is_empty(), "classify these in remote::events: {unclassified:?}");
}

#[test]
fn the_allowlist_is_the_three_index_events() {
	assert_eq!(FORWARDED_EVENTS, ["vault-index-updated", "vault-files-changed", "semantic-index-progress"]);
	for name in FORWARDED_EVENTS {
		assert_eq!(forwarding(name), Some(Forwarding::Forwarded));
	}
}

#[test]
fn clipboard_debug_menu_and_exit_events_are_never_forwarded() {
	for name in ["qc:capture-detected", "qc:open-composer", "qc:anything-new", "tauri-debug-log", "menu:settings", "menu:other", "app:exit-requested"] {
		assert_eq!(forwarding(name), Some(Forwarding::NeverForwarded), "{name}");
	}
	assert_eq!(forwarding("some-new-event"), None);
}

#[test]
fn publish_reaches_subscribers_only_for_forwarded_names() {
	let hub = EventHub::default();
	let seen = Arc::new(std::sync::Mutex::new(Vec::<String>::new()));
	let sink_seen = seen.clone();
	let id = hub.subscribe(Arc::new(move |name: &str, _payload: &Value| {
		sink_seen.lock().unwrap().push(name.to_string());
		true
	}));
	hub.publish("qc:capture-detected", r#"{"text":"secret"}"#);
	hub.publish("unknown-event", "null");
	hub.publish("vault-files-changed", r#"{"paths":["/v/a.md"]}"#);
	hub.unsubscribe(id);
	hub.publish("vault-files-changed", r#"{"paths":["/v/b.md"]}"#);
	assert_eq!(*seen.lock().unwrap(), ["vault-files-changed"]);
}

#[test]
fn a_sink_that_reports_failure_is_dropped() {
	let hub = EventHub::default();
	let calls = Arc::new(std::sync::atomic::AtomicUsize::new(0));
	let sink_calls = calls.clone();
	hub.subscribe(Arc::new(move |_: &str, _: &Value| {
		sink_calls.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
		false
	}));
	hub.publish("vault-files-changed", r#"{"paths":[]}"#);
	hub.publish("vault-files-changed", r#"{"paths":[]}"#);
	assert_eq!(calls.load(std::sync::atomic::Ordering::SeqCst), 1);
	assert_eq!(hub.subscriber_count(), 0);
}

fn session_host(events: Arc<EventHub>) -> Arc<RpcHost> {
	Arc::new(RpcHost {
		server_version: "test".into(),
		vault_root: Arc::new(VaultRootCell::default()),
		index_version: Arc::new(|| 0),
		events,
		dispatch: Arc::new(|_, _| Ok(Value::Null)),
	})
}

#[test]
fn a_quick_capture_event_never_reaches_a_browser() {
	let hub = Arc::new(EventHub::default());
	let lookup: AssetLookup = Arc::new(|_| None);
	let server = RemoteServer::start_with_rpc(0, lookup, Some(session_host(hub.clone()))).unwrap();
	let (mut client, welcome) = connect_session(server.port());
	assert_eq!(welcome["method"], "welcome");

	hub.publish("qc:capture-detected", r#"{"text":"clipboard secret","app":"Safari","url":"https://x"}"#);
	hub.publish("tauri-debug-log", r#"{"tag":"T","message":"m"}"#);
	hub.publish("menu:settings", "null");
	hub.publish("vault-files-changed", r#"{"paths":["/v/a.md"]}"#);

	// Frames arrive in publish order, so the first one proves the three
	// before it were not sent.
	let frame = client.recv();
	assert_eq!(frame, json!({
		"jsonrpc": "2.0",
		"method": "event",
		"params": { "event": "vault-files-changed", "payload": { "paths": ["/v/a.md"] } },
	}));
}

#[test]
fn a_closed_session_unsubscribes() {
	let hub = Arc::new(EventHub::default());
	let lookup: AssetLookup = Arc::new(|_| None);
	let server = RemoteServer::start_with_rpc(0, lookup, Some(session_host(hub.clone()))).unwrap();
	let (client, _) = connect_session(server.port());
	assert_eq!(hub.subscriber_count(), 1);
	drop(client);
	let deadline = std::time::Instant::now() + Duration::from_secs(5);
	while hub.subscriber_count() != 0 && std::time::Instant::now() < deadline {
		std::thread::sleep(Duration::from_millis(20));
	}
	assert_eq!(hub.subscriber_count(), 0);
}

#[test]
fn a_session_that_never_reads_is_closed_and_unsubscribed() {
	let hub = Arc::new(EventHub::default());
	let lookup: AssetLookup = Arc::new(|_| None);
	let server = RemoteServer::start_with_rpc(0, lookup, Some(session_host(hub.clone()))).unwrap();
	let (mut client, _) = connect_session(server.port());
	assert_eq!(hub.subscriber_count(), 1);

	// The client reads nothing, so the socket buffers fill, the writer thread
	// blocks and the session's event queue overflows.
	let payload = json!({ "paths": ["x".repeat(16 * 1024)] }).to_string();
	let mut published = 0;
	while hub.subscriber_count() != 0 && published < 20_000 {
		hub.publish("vault-files-changed", &payload);
		published += 1;
	}
	assert_eq!(hub.subscriber_count(), 0, "still subscribed after {published} events");

	// The host shut the socket down: a write from the client soon fails.
	let deadline = std::time::Instant::now() + Duration::from_secs(5);
	let hello = json!({ "jsonrpc": "2.0", "method": "ping" });
	while client.try_send(&hello) && std::time::Instant::now() < deadline {
		std::thread::sleep(Duration::from_millis(20));
	}
	assert!(!client.try_send(&hello), "the socket is still open");
}
