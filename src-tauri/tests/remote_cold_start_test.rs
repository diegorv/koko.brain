//! Replays the recorded browser cold start
//! (`tests/fixtures/browser-cold-start.json`, written by
//! `src/tests/lib/app/remote/browser-cold-start.test.ts`) over a real `/ws`
//! session against a desktop that has a vault open, and checks the desktop
//! is untouched: database open, watcher in place and still reporting, index
//! version unchanged, Sentry and debug flags unchanged, no file created or
//! changed in the vault or `.kokobrain/`.

mod common_ws;

use std::collections::BTreeMap;
use std::fs;
use std::path::Path;
use std::sync::mpsc;
use std::sync::{Arc, RwLock};
use std::time::Duration;

use common_ws::connect_session;
use kokobrain_lib::commands::vault::scan_vault_v2_inner;
use kokobrain_lib::db;
use kokobrain_lib::error_monitoring::{is_sentry_active, SentryState};
use kokobrain_lib::remote::dispatch::{dispatch, HostContext};
use kokobrain_lib::remote::host::VaultRootCell;
use kokobrain_lib::remote::rpc::RpcHost;
use kokobrain_lib::remote::server::{AssetLookup, RemoteServer};
use kokobrain_lib::utils::logger;
use kokobrain_lib::vault::index::VaultIndex;
use kokobrain_lib::vault::watcher::{replace_watcher, VaultWatcherState};
use kokobrain_lib::vault::VaultIndexState;
use serde_json::Value;
use tempfile::TempDir;

const FIXTURE: &str = include_str!("fixtures/browser-cold-start.json");

/// Every file under `dir` with its bytes, skipping the desktop database's
/// own files (SQLite may checkpoint them on its own schedule).
fn snapshot(dir: &Path, out: &mut BTreeMap<String, Vec<u8>>) {
	for entry in fs::read_dir(dir).unwrap() {
		let path = entry.unwrap().path();
		let name = path.file_name().unwrap().to_string_lossy().to_string();
		if name.starts_with("kokobrain.db") || name.starts_with("search.db") {
			continue;
		}
		if path.is_dir() {
			out.insert(format!("{}/", path.display()), Vec::new());
			snapshot(&path, out);
		} else {
			out.insert(path.display().to_string(), fs::read(&path).unwrap());
		}
	}
}

fn encode_component(text: &str) -> String {
	text.bytes()
		.map(|b| match b {
			b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'!' | b'~' | b'*' | b'\'' | b'(' | b')' => {
				(b as char).to_string()
			}
			_ => format!("%{b:02X}"),
		})
		.collect()
}

#[test]
fn a_browser_cold_start_leaves_the_desktop_untouched() {
	let fixture: Value = serde_json::from_str(FIXTURE).unwrap();
	let recorded_vault = fixture["vault"].as_str().unwrap().to_string();
	let calls = fixture["calls"].as_array().unwrap();
	assert!(calls.len() > 10, "the recording looks empty");
	// The flag checks below only mean something when the boot asks to turn
	// the flags on: the recording's settings enable Sentry and debug mode.
	let sends = |cmd: &str| calls.iter().any(|c| c["cmd"] == cmd && c["args"]["enabled"] == true);
	assert!(sends("configure_sentry") && sends("set_tauri_debug_mode"), "the recording never enables the flags");
	assert!(calls.iter().any(|c| c["cmd"] == "build_search_index"), "the recording skipped the welcome's vault open");

	// The desktop: a vault with notes and settings, its database open, its
	// index built and its watcher running.
	let dir = TempDir::new().unwrap();
	let root = dir.path().canonicalize().unwrap().to_string_lossy().to_string();
	fs::write(format!("{root}/note.md"), "# Note\n- [ ] task #to-list\n").unwrap();
	fs::create_dir(format!("{root}/folder")).unwrap();
	fs::write(format!("{root}/folder/other.md"), "[[note]]").unwrap();
	fs::create_dir(format!("{root}/.kokobrain")).unwrap();
	fs::write(format!("{root}/.kokobrain/settings.json"), r#"{"todoist":{"apiToken":"secret"}}"#).unwrap();
	db::open_database(Path::new(&root)).unwrap();
	let index: VaultIndexState = RwLock::new(VaultIndex::default());
	scan_vault_v2_inner(&root, &index).unwrap();
	let version = index.read().unwrap().version();
	let watcher: VaultWatcherState = Default::default();
	let (changes_tx, changes_rx) = mpsc::channel::<Vec<String>>();
	replace_watcher(&watcher, &root, move |paths| {
		let _ = changes_tx.send(paths);
	})
	.unwrap();
	// Both flags start off, the opposite of what the browser asks for, so a
	// call that reached the desktop's code would flip them.
	// The replay's own SentryState only shows a call that reached it; the
	// main hub's client shows a `configure_sentry` with any state.
	let sentry = SentryState::default();
	assert!(!is_sentry_active(&sentry).unwrap());
	assert!(sentry::Hub::main().client().is_none());
	logger::set_debug_mode(false);
	let mut before = BTreeMap::new();
	snapshot(dir.path(), &mut before);

	// The host, wired like `commands::remote` wires the app's state.
	let cell = Arc::new(VaultRootCell::default());
	cell.set(Some(root.clone()));
	let index = Arc::new(index);
	let dispatch_index = index.clone();
	let host = Arc::new(RpcHost {
		server_version: "test".into(),
		vault_root: cell,
		index_version: Arc::new(|| 0),
		dispatch: Arc::new(move |call, vault_root| dispatch(&HostContext { index: &dispatch_index, vault_root }, call)),
	});
	let lookup: AssetLookup = Arc::new(|_| None);
	let server = RemoteServer::start_with_rpc(0, lookup, Some(host)).unwrap();
	let (mut client, welcome) = connect_session(server.port());
	assert_eq!(welcome["params"]["vaultRoot"], root.as_str());

	let encoded_vault = encode_component(&recorded_vault);
	let encoded_root = encode_component(&root);
	let mut errors = Vec::new();
	for (i, call) in calls.iter().enumerate() {
		let rewrite = |v: &Value| -> Value {
			let text = v.to_string()
				.replace(&format!("\"{recorded_vault}"), &format!("\"{root}"))
				.replace(&encoded_vault, &encoded_root);
			serde_json::from_str(&text).unwrap()
		};
		let cmd = call["cmd"].as_str().unwrap();
		let reply = client.invoke_with(i as u64 + 1, cmd, rewrite(&call["args"]), rewrite(&call["headers"]));
		if let Some(err) = reply.get("error") {
			errors.push(format!("{cmd}: {}", err["message"]));
		}
	}
	// The browser boot reads what it needs; the tree and settings succeed.
	assert!(!errors.iter().any(|e| e.starts_with("scan_vault:")), "{errors:?}");
	assert!(!errors.iter().any(|e| e.contains("read_text_file")), "{errors:?}");
	assert!(!errors.iter().any(|e| e.contains("not classified")), "{errors:?}");
	drop(client);
	server.stop();

	assert!(db::is_open(), "the desktop database was closed");
	assert_eq!(index.read().unwrap().version(), version, "the index was rebuilt");
	assert!(!is_sentry_active(&sentry).unwrap(), "Sentry was turned on");
	assert!(sentry::Hub::main().client().is_none(), "a Sentry client was bound");
	assert!(!logger::is_debug_enabled(), "debug mode was turned on");
	let mut after = BTreeMap::new();
	snapshot(dir.path(), &mut after);
	assert_eq!(after.keys().collect::<Vec<_>>(), before.keys().collect::<Vec<_>>(), "files created or removed");
	assert!(after == before, "a file changed in the vault");

	// The desktop's watcher is the same one and still reports changes.
	assert!(watcher.lock().unwrap().is_some(), "the watcher was replaced or stopped");
	while changes_rx.try_recv().is_ok() {}
	fs::write(format!("{root}/after.md"), "x").unwrap();
	let seen = changes_rx.recv_timeout(Duration::from_secs(10)).expect("the watcher still reports");
	assert!(seen.iter().any(|p| p.ends_with("after.md")), "{seen:?}");
	db::close_database().unwrap();
}
