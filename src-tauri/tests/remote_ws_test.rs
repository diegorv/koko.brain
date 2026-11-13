//! The browser session on `/ws` (`remote::ws`, `remote::rpc`), the vault
//! root cell (`remote::host`) and the policy-driven dispatcher
//! (`remote::dispatch`). A raw TCP client drives the real server.

mod common_ws;

use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::net::{Ipv4Addr, TcpStream};
use std::sync::{Arc, RwLock};
use std::time::Duration;

use common_ws::{connect_session, WsClient};
use kokobrain_lib::commands::vault::scan_vault_v2_inner;
use kokobrain_lib::remote::access::Route;
use kokobrain_lib::remote::dispatch::{dispatch, Call, HostContext};
use kokobrain_lib::remote::host::VaultRootCell;
use kokobrain_lib::remote::rpc::{RpcHost, CONFLICT_ERROR};
use kokobrain_lib::remote::server::{AssetLookup, RemoteServer, ServedAsset};
use kokobrain_lib::remote::write::CONFLICT_PREFIX;
use kokobrain_lib::remote::ws::{accept_key, sha1};
use kokobrain_lib::vault::index::VaultIndex;
use kokobrain_lib::vault::VaultIndexState;
use serde_json::{json, Value};
use tempfile::TempDir;

fn bundle() -> AssetLookup {
	let mut files: HashMap<String, ServedAsset> = HashMap::new();
	files.insert("index.html".into(), ServedAsset { bytes: b"<html></html>".to_vec(), mime_type: "text/html".into() });
	Arc::new(move |path: &str| files.get(path).cloned())
}

fn echo_host(cell: Arc<VaultRootCell>) -> Arc<RpcHost> {
	Arc::new(RpcHost {
		server_version: "9.9.9".into(),
		vault_root: cell,
		index_version: Arc::new(|| 42),
		events: Arc::default(),
		dispatch: Arc::new(|call: &Call, root: Option<String>| {
			if call.cmd == "fail" {
				return Err("boom".into());
			}
			if call.cmd == "stale" {
				return Err(format!("{CONFLICT_PREFIX}the note changed on the Mac"));
			}
			Ok(json!({ "cmd": call.cmd, "args": call.args, "root": root }))
		}),
	})
}

fn raw_upgrade(port: u16, host: &str, origin: Option<&str>) -> String {
	let mut stream = TcpStream::connect((Ipv4Addr::LOCALHOST, port)).unwrap();
	stream.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
	let origin = origin.map(|o| format!("Origin: {o}\r\n")).unwrap_or_default();
	let req = format!(
		"GET /ws HTTP/1.1\r\nHost: {host}\r\n{origin}Upgrade: websocket\r\nConnection: Upgrade\r\n\
		 Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n"
	);
	stream.write_all(req.as_bytes()).unwrap();
	let mut buf = [0u8; 512];
	let n = stream.read(&mut buf).unwrap();
	String::from_utf8_lossy(&buf[..n]).lines().next().unwrap_or("").to_string()
}

#[test]
fn sha1_matches_known_vectors() {
	let hex = |d: [u8; 20]| d.iter().map(|b| format!("{b:02x}")).collect::<String>();
	assert_eq!(hex(sha1(b"abc")), "a9993e364706816aba3e25717850c26c9cd0d89d");
	assert_eq!(hex(sha1(b"")), "da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assert_eq!(hex(sha1(&[b'a'; 1000])), "291e9a6c66994949b57ba5e650361e98fc36b1ba");
}

#[test]
fn accept_key_matches_rfc_6455_example() {
	assert_eq!(accept_key("dGhlIHNhbXBsZSBub25jZQ=="), "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=");
}

#[test]
fn upgrade_requires_the_exact_origin_and_host() {
	let server = RemoteServer::start_with_rpc(0, bundle(), Some(echo_host(Arc::default()))).unwrap();
	let port = server.port();
	let host = format!("127.0.0.1:{port}");
	let origin = format!("http://{host}");
	assert!(raw_upgrade(port, &host, Some(&origin)).contains("101"));
	assert!(raw_upgrade(port, &host, None).contains("403"));
	assert!(raw_upgrade(port, &host, Some("http://localhost:1")).contains("403"));
	assert!(raw_upgrade(port, &host, Some(&format!("https://{host}"))).contains("403"));
	assert!(raw_upgrade(port, &host, Some(&format!("{origin}/"))).contains("403"));
	assert!(raw_upgrade(port, &format!("localhost:{port}"), Some(&origin)).contains("403"));
}

#[test]
fn a_tailnet_upgrade_needs_the_owner_login_and_the_tailnet_origin() {
	let route = Route { port: 0, tailnet_host: Some("mac.ts.net".into()), owner_login: Some("me@x.com".into()) };
	let server = RemoteServer::start_routed(route, bundle(), Some(echo_host(Arc::default()))).unwrap();
	let port = server.port();
	let upgrade = |host: &str, origin: &str, extra: &str| {
		let mut stream = TcpStream::connect((Ipv4Addr::LOCALHOST, port)).unwrap();
		stream.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
		let req = format!(
			"GET /ws HTTP/1.1\r\nHost: {host}\r\nOrigin: {origin}\r\n{extra}Upgrade: websocket\r\nConnection: Upgrade\r\n\
			 Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n"
		);
		stream.write_all(req.as_bytes()).unwrap();
		let mut buf = [0u8; 512];
		let n = stream.read(&mut buf).unwrap();
		String::from_utf8_lossy(&buf[..n]).lines().next().unwrap_or("").to_string()
	};
	let host = format!("mac.ts.net:{port}");
	let origin = format!("https://{host}");
	let login = "Tailscale-User-Login: me@x.com\r\n";
	assert!(upgrade(&host, &origin, login).contains("101"));
	assert!(upgrade(&host, &origin, "").contains("403"), "missing login");
	assert!(upgrade(&host, &origin, "Tailscale-User-Login: other@x.com\r\n").contains("403"));
	assert!(upgrade(&host, &format!("http://{host}"), login).contains("403"), "http origin");
	let loopback = format!("127.0.0.1:{port}");
	assert!(upgrade(&loopback, &origin, "X-Forwarded-For: 100.64.0.2\r\n").contains("403"), "rewritten Host");
	assert!(upgrade(&loopback, &origin, &format!("X-Forwarded-For: 100.64.0.2\r\n{login}")).contains("101"));
}

#[test]
fn ws_is_not_found_without_a_session_host() {
	let server = RemoteServer::start(0, bundle()).unwrap();
	let port = server.port();
	let host = format!("127.0.0.1:{port}");
	assert!(raw_upgrade(port, &host, Some(&format!("http://{host}"))).contains("404"));
}

#[test]
fn welcome_carries_the_server_version_and_the_open_vault() {
	let cell = Arc::new(VaultRootCell::default());
	cell.set(Some("/v/vault".into()));
	let server = RemoteServer::start_with_rpc(0, bundle(), Some(echo_host(cell))).unwrap();
	let (_client, welcome) = connect_session(server.port());
	assert_eq!(welcome["method"], "welcome");
	assert_eq!(welcome["params"]["serverVersion"], "9.9.9");
	assert_eq!(welcome["params"]["vaultRoot"], "/v/vault");
	assert_eq!(welcome["params"]["proto"], 1);
	assert_eq!(welcome["params"]["indexVersion"], 42);
}

#[test]
fn welcome_reports_no_vault_as_null() {
	let server = RemoteServer::start_with_rpc(0, bundle(), Some(echo_host(Arc::default()))).unwrap();
	let (_client, welcome) = connect_session(server.port());
	assert_eq!(welcome["params"]["vaultRoot"], Value::Null);
}

#[test]
fn invoke_round_trips_results_and_errors() {
	let cell = Arc::new(VaultRootCell::default());
	cell.set(Some("/v".into()));
	let server = RemoteServer::start_with_rpc(0, bundle(), Some(echo_host(cell))).unwrap();
	let (mut client, _) = connect_session(server.port());
	let ok = client.invoke(1, "scan_vault", json!({ "path": "/v" }));
	assert_eq!(ok["id"], 1);
	assert_eq!(ok["result"]["cmd"], "scan_vault");
	assert_eq!(ok["result"]["args"]["path"], "/v");
	assert_eq!(ok["result"]["root"], "/v");
	let err = client.invoke(2, "fail", Value::Null);
	assert_eq!(err["id"], 2);
	assert_eq!(err["error"]["message"], "boom");
	assert_eq!(err["error"]["code"], -32000);
	let stale = client.invoke(4, "stale", Value::Null);
	assert_eq!(stale["error"]["code"], CONFLICT_ERROR);
	assert_eq!(CONFLICT_ERROR, -32001);
	client.send(&json!({ "jsonrpc": "2.0", "id": 3, "method": "nope" }));
	assert_eq!(client.recv()["error"]["code"], -32600);
}

#[test]
fn a_session_without_hello_is_closed() {
	let server = RemoteServer::start_with_rpc(0, bundle(), Some(echo_host(Arc::default()))).unwrap();
	let mut client = WsClient::open(server.port());
	client.send(&json!({ "jsonrpc": "2.0", "id": 1, "method": "invoke", "params": { "cmd": "x" } }));
	assert!(client.recv_raw().is_none(), "no reply before hello");
}

#[test]
fn a_hello_with_another_protocol_is_closed() {
	let server = RemoteServer::start_with_rpc(0, bundle(), Some(echo_host(Arc::default()))).unwrap();
	for params in [json!({ "proto": 2 }), json!({})] {
		let mut client = WsClient::open(server.port());
		client.send(&json!({ "jsonrpc": "2.0", "method": "hello", "params": params }));
		assert!(client.recv_raw().is_none(), "welcome sent for {params}");
	}
}

#[test]
fn a_vault_change_is_pushed_to_the_session() {
	let cell = Arc::new(VaultRootCell::default());
	cell.set(Some("/a".into()));
	let server = RemoteServer::start_with_rpc(0, bundle(), Some(echo_host(cell.clone()))).unwrap();
	let (mut client, _) = connect_session(server.port());
	cell.set(Some("/b".into()));
	let note = client.recv();
	assert_eq!(note["method"], "vault-changed");
	assert_eq!(note["params"]["vaultRoot"], "/b");
	cell.set(None);
	assert_eq!(client.recv()["params"]["vaultRoot"], Value::Null);
}

#[test]
fn setting_the_same_root_is_not_a_change() {
	let cell = VaultRootCell::default();
	cell.set(Some("/a".into()));
	let (_, generation) = cell.get();
	cell.set(Some("/a".into()));
	assert_eq!(cell.get().1, generation);
	assert!(cell.wait_change(generation, Duration::from_millis(20)).is_none());
}

// ── dispatch ────────────────────────────────────────────────────────────

struct Vault {
	dir: TempDir,
	index: VaultIndexState,
}

impl Vault {
	fn new() -> Self {
		let dir = TempDir::new().unwrap();
		fs::write(dir.path().join("note.md"), "# Note\n#tag [[other]]\n").unwrap();
		fs::create_dir(dir.path().join("folder")).unwrap();
		fs::write(dir.path().join("folder/other.md"), "other").unwrap();
		fs::create_dir(dir.path().join(".kokobrain")).unwrap();
		fs::write(
			dir.path().join(".kokobrain/settings.json"),
			r#"{"todoist":{"apiToken":"secret-token","enabled":true},"debugMode":false}"#,
		)
		.unwrap();
		fs::write(dir.path().join(".kokobrain/kokobrain.db"), "db").unwrap();
		let index = RwLock::new(VaultIndex::default());
		scan_vault_v2_inner(&dir.path().to_string_lossy(), &index).unwrap();
		Self { dir, index }
	}

	fn root(&self) -> String {
		self.dir.path().to_string_lossy().to_string()
	}

	fn path(&self, rel: &str) -> String {
		format!("{}/{rel}", self.root())
	}

	fn call(&self, cmd: &str, args: Value) -> Result<Value, String> {
		self.call_with(cmd, args, Value::Null)
	}

	fn call_with(&self, cmd: &str, args: Value, headers: Value) -> Result<Value, String> {
		let ctx = HostContext { index: &self.index, vault_root: Some(self.root()) };
		dispatch(&ctx, &Call { cmd: cmd.into(), args, headers })
	}
}

fn bytes_text(value: &Value) -> String {
	let bytes: Vec<u8> = serde_json::from_value(value.clone()).unwrap();
	String::from_utf8(bytes).unwrap()
}

#[test]
fn read_commands_return_the_desktop_data() {
	let vault = Vault::new();
	let tree = vault.call("scan_vault", json!({ "path": vault.root(), "sortBy": "name" })).unwrap();
	let names: Vec<&str> = tree.as_array().unwrap().iter().map(|n| n["name"].as_str().unwrap()).collect();
	assert!(names.contains(&"note.md") && names.contains(&"folder"), "{names:?}");
	let entries = vault.call("get_all_vault_entries_v2", Value::Null).unwrap();
	assert_eq!(entries.as_array().unwrap().len(), 2);
	let tags = vault.call("get_all_tags_v2", Value::Null).unwrap();
	assert!(tags.to_string().contains("tag"));
}

#[test]
fn link_panel_reads_return_the_desktop_data() {
	let vault = Vault::new();
	let third = "---\n_related_to: \"[[other]]\"\n---\nthe note is mentioned here\n";
	fs::write(vault.path("third.md"), third).unwrap();
	// The index keys canonical paths (`/private/var` on macOS).
	let root = vault.dir.path().canonicalize().unwrap().to_string_lossy().to_string();
	scan_vault_v2_inner(&root, &vault.index).unwrap();
	let ctx = HostContext { index: &vault.index, vault_root: Some(root.clone()) };
	let call = |cmd: &str, args: Value| dispatch(&ctx, &Call { cmd: cmd.into(), args, headers: Value::Null }).unwrap();
	let (note, other, third_path) = (format!("{root}/note.md"), format!("{root}/folder/other.md"), format!("{root}/third.md"));

	let backlinks = call("get_backlinks_v2", json!({ "path": other }));
	let sources: Vec<&str> = backlinks.as_array().unwrap().iter().map(|e| e["path"].as_str().unwrap()).collect();
	// The frontmatter wikilink counts as a backlink, as on the desktop.
	assert_eq!(sources, vec![note.as_str(), third_path.as_str()]);

	let related = call("get_relationship_backlinks_v2", json!({ "path": other }));
	assert_eq!(related.as_array().unwrap().len(), 1, "{related}");
	assert_eq!(related[0]["sourcePath"], third_path);
	assert_eq!(related[0]["relationshipType"], "related_to");

	let outgoing = call("get_outgoing_links_v2", json!({ "path": note }));
	assert_eq!(outgoing.as_array().unwrap().len(), 1, "{outgoing}");
	assert_eq!(outgoing[0]["target"], "other");
	assert_eq!(outgoing[0]["resolvedPath"], other);

	let mentions = call("get_outgoing_unlinked_mentions_v2", json!({ "path": third_path, "content": third }));
	assert_eq!(mentions.as_array().unwrap().len(), 1, "{mentions}");
	assert_eq!(mentions[0]["noteName"], "note");
	assert_eq!(mentions[0]["notePath"], note);
}

#[test]
fn scan_vault_outside_the_vault_is_denied() {
	let vault = Vault::new();
	assert!(vault.call("scan_vault", json!({ "path": "/", "sortBy": "name" })).is_err());
	let meta = vault.path(".kokobrain");
	assert!(vault.call("scan_vault", json!({ "path": meta, "sortBy": "name" })).is_err());
}

#[test]
fn fs_reads_are_forwarded() {
	let vault = Vault::new();
	let text = vault.call("plugin:fs|read_text_file", json!({ "path": vault.path("note.md") })).unwrap();
	assert_eq!(bytes_text(&text), "# Note\n#tag [[other]]\n");
	assert_eq!(vault.call("plugin:fs|exists", json!({ "path": vault.path("note.md") })).unwrap(), json!(true));
	assert_eq!(vault.call("plugin:fs|exists", json!({ "path": vault.path("missing.md") })).unwrap(), json!(false));
	let dir = vault.call("plugin:fs|read_dir", json!({ "path": vault.path("folder") })).unwrap();
	assert_eq!(dir[0]["name"], "other.md");
	assert_eq!(dir[0]["isFile"], true);
	let stat = vault.call("plugin:fs|stat", json!({ "path": vault.path("note.md") })).unwrap();
	assert_eq!(stat["isFile"], true);
	assert_eq!(stat["size"], 22);
	assert!(stat["mtime"].is_u64());
}

#[test]
fn settings_are_read_with_the_todoist_token_redacted() {
	let vault = Vault::new();
	let raw = vault.call("plugin:fs|read_text_file", json!({ "path": vault.path(".kokobrain/settings.json") })).unwrap();
	let settings: Value = serde_json::from_str(&bytes_text(&raw)).unwrap();
	assert_eq!(settings["todoist"]["apiToken"], "");
	assert_eq!(settings["todoist"]["enabled"], true);
	assert_eq!(settings["debugMode"], false);
}

#[test]
fn settings_writes_are_acknowledged_and_dropped() {
	let vault = Vault::new();
	let path = vault.path(".kokobrain/settings.json");
	let before = fs::read(&path).unwrap();
	let headers = json!({ "path": path.replace('/', "%2F"), "options": "{}" });
	assert_eq!(vault.call_with("plugin:fs|write_text_file", Value::Null, headers).unwrap(), Value::Null);
	assert_eq!(fs::read(&path).unwrap(), before);
}

#[test]
fn other_writes_and_kokobrain_access_are_denied() {
	let vault = Vault::new();
	// A note write with no base is refused (the browser never loaded it).
	let headers = json!({ "path": vault.path("note.md") });
	assert!(vault.call_with("plugin:fs|write_text_file", json!({ "text": "x" }), headers).is_err());
	assert_eq!(fs::read_to_string(vault.path("note.md")).unwrap(), "# Note\n#tag [[other]]\n");
	assert!(vault.call("plugin:fs|read_file", json!({ "path": vault.path(".kokobrain/kokobrain.db") })).is_err());
	assert!(vault.call("plugin:fs|read_dir", json!({ "path": vault.path(".kokobrain") })).is_err());
	assert!(vault.call("plugin:fs|mkdir", json!({ "path": vault.path(".kokobrain/new.json") })).is_err());
	assert!(vault.call("plugin:fs|mkdir", json!({ "path": vault.path("new"), "options": { "baseDir": 14 } })).is_err());
	assert!(vault.call("plugin:fs|read_text_file", json!({ "path": "/etc/hosts" })).is_err());
	let base_dir = json!({ "path": "x.json", "options": { "baseDir": 14 } });
	assert!(vault.call("plugin:fs|read_text_file", base_dir).is_err());
	assert!(!vault.dir.path().join("new").exists());
}

#[test]
fn denied_and_unclassified_commands_return_errors() {
	let vault = Vault::new();
	let err = vault.call("rename_note", json!({ "oldPath": vault.path("note.md"), "newPath": vault.path("x.md") })).unwrap_err();
	assert!(err.contains("not available"), "{err}");
	assert!(!vault.dir.path().join("x.md").exists());
	let err = vault.call("no_such_command", Value::Null).unwrap_err();
	assert!(err.contains("not classified"), "{err}");
}

#[test]
fn path_commands_fail_with_no_vault_open() {
	let index = RwLock::new(VaultIndex::default());
	let ctx = HostContext { index: &index, vault_root: None };
	let call = Call { cmd: "plugin:fs|exists".into(), args: json!({ "path": "/x" }), headers: Value::Null };
	assert!(dispatch(&ctx, &call).unwrap_err().contains("No vault"));
}

#[test]
fn virtual_commands_leave_the_index_alone() {
	let vault = Vault::new();
	let version = vault.index.read().unwrap().version();
	let cached = vault.call("scan_vault_v2_cached", json!({ "path": vault.root() })).unwrap();
	assert_eq!(cached["source"], "cache");
	assert_eq!(cached["entryCount"], 2);
	let update = vault.call("update_note_in_index", json!({ "path": vault.path("note.md"), "content": "x" })).unwrap();
	assert_eq!(update["changed"], false);
	assert_eq!(vault.call("init_semantic_search", json!({ "vaultPath": vault.root() })).unwrap(), json!(false));
	assert!(vault.call("plugin:event|listen", json!({ "event": "x" })).unwrap().is_u64());
	assert_eq!(vault.index.read().unwrap().version(), version);
}

#[test]
fn unlinked_mentions_are_read_from_the_vault_notes() {
	let vault = Vault::new();
	fs::write(vault.path("folder/other.md"), "talks about note here").unwrap();
	fs::write(vault.path("third.md"), "nothing").unwrap();
	// The index keys canonical paths (`/private/var` on macOS), so the host
	// root is spelled the same way, as the desktop's is.
	let root = vault.dir.path().canonicalize().unwrap().to_string_lossy().to_string();
	scan_vault_v2_inner(&root, &vault.index).unwrap();
	let ctx = HostContext { index: &vault.index, vault_root: Some(root.clone()) };
	let call = |path: String| {
		dispatch(&ctx, &Call { cmd: "get_unlinked_mentions_v2".into(), args: json!({ "path": path }), headers: Value::Null })
	};
	let found = call(format!("{root}/note.md")).unwrap();
	let paths: Vec<&str> = found.as_array().unwrap().iter().map(|e| e["path"].as_str().unwrap()).collect();
	assert_eq!(paths, vec![format!("{root}/folder/other.md").as_str()]);
	assert!(call("/etc/hosts".into()).is_err());
}

/// Whether a read reply leaks the Todoist token: an error is fine, bytes
/// must not carry it.
fn leaks_token(reply: Result<Value, String>) -> bool {
	reply.is_ok_and(|bytes| bytes_text(&bytes).contains("secret-token"))
}

#[test]
fn settings_spellings_never_leak_the_token() {
	let vault = Vault::new();
	for rel in [
		".KOKOBRAIN/settings.json",
		".Kokobrain/settings.json",
		".kokobrain/SETTINGS.json",
		".kokobrain/Settings.json",
		"/.kokobrain/settings.json",
	] {
		for cmd in ["plugin:fs|read_text_file", "plugin:fs|read_file"] {
			let reply = vault.call(cmd, json!({ "path": vault.path(rel) }));
			assert!(!leaks_token(reply), "{cmd} {rel}");
		}
	}
	let db = vault.call("plugin:fs|read_file", json!({ "path": vault.path(".Kokobrain/kokobrain.db") }));
	assert!(db.is_err());
	let dir = vault.call("plugin:fs|read_dir", json!({ "path": vault.path("/.kokobrain") }));
	assert!(dir.is_err());
}

#[cfg(unix)]
#[test]
fn a_link_to_the_settings_file_is_redacted_or_refused() {
	let vault = Vault::new();
	std::os::unix::fs::symlink(vault.path(".kokobrain/settings.json"), vault.path("link.json")).unwrap();
	fs::hard_link(vault.path(".kokobrain/settings.json"), vault.path("hard.json")).unwrap();
	for rel in ["link.json", "hard.json"] {
		let reply = vault.call("plugin:fs|read_text_file", json!({ "path": vault.path(rel) }));
		assert!(!leaks_token(reply), "{rel}");
	}
	let batch = vault.call(
		"read_files_batch",
		json!({ "vaultPath": vault.root(), "paths": [vault.path("link.json"), vault.path("hard.json")] }),
	);
	assert!(!batch.is_ok_and(|v| v.to_string().contains("secret-token")));
	for rel in [".KOKOBRAIN/settings.json", "/.kokobrain/settings.json"] {
		let batch = vault.call("read_files_batch", json!({ "vaultPath": vault.root(), "paths": [vault.path(rel)] }));
		assert!(batch.is_err(), "{rel}");
	}
}

#[cfg(unix)]
#[test]
fn exists_reports_a_dangling_link_as_missing() {
	let vault = Vault::new();
	std::os::unix::fs::symlink(vault.path("gone.md"), vault.path("dangling.md")).unwrap();
	assert_eq!(vault.call("plugin:fs|exists", json!({ "path": vault.path("dangling.md") })).unwrap(), json!(false));
}

#[test]
fn stopping_the_server_ends_open_sessions() {
	let cell = Arc::new(VaultRootCell::default());
	cell.set(Some("/v".into()));
	let server = RemoteServer::start_with_rpc(0, bundle(), Some(echo_host(cell))).unwrap();
	let (mut client, _) = connect_session(server.port());
	assert_eq!(client.invoke(1, "scan_vault", json!({}))["id"], 1);
	server.stop();
	let sent = client.try_send(&json!({ "jsonrpc": "2.0", "id": 2, "method": "invoke", "params": { "cmd": "scan_vault" } }));
	assert!(!sent || client.recv_raw().is_none(), "the session still answers after stop");
}
