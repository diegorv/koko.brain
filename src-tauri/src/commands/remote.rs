//! Tauri glue for the loopback server in `remote::server`: the asset lookup
//! reads the same bundle the desktop webview loads, browser calls are
//! dispatched against the app's managed state, and the forwarded Rust events
//! reach the sessions' hub.

use std::sync::{Arc, Once};

use tauri::{AppHandle, Listener, Manager, State};

use crate::remote::access::Route;
use crate::remote::dispatch::{dispatch, HostContext};
use crate::remote::events::{desktop_event_hub, FORWARDED_EVENTS};
use crate::remote::host::desktop_vault_root;
use crate::remote::rpc::RpcHost;
use crate::remote::server::{AssetLookup, RemoteServerSlot, ServedAsset};
use crate::vault::VaultIndexState;

/// App-wide holder of the running loopback server.
#[derive(Default)]
pub struct RemoteServerState(pub RemoteServerSlot);

fn bundle_lookup(app: AppHandle) -> AssetLookup {
	std::sync::Arc::new(move |path: &str| {
		app.asset_resolver()
			.get(path.to_string())
			.map(|asset| ServedAsset { bytes: asset.bytes, mime_type: asset.mime_type })
	})
}

/// Publishes every forwarded event the app emits to the hub, once per
/// process: listening on the allowlisted names only means no other event is
/// ever handed to the hub. `app.emit` reaches Rust listeners as well as the
/// webview (tauri 2.12.5 `manager/mod.rs:538-539`).
fn listen_for_forwarded_events(app: &AppHandle) {
	static LISTENING: Once = Once::new();
	LISTENING.call_once(|| {
		for name in FORWARDED_EVENTS {
			let hub = desktop_event_hub();
			app.listen_any(name, move |event| hub.publish(name, event.payload()));
		}
	});
}

fn rpc_host(app: AppHandle) -> Arc<RpcHost> {
	listen_for_forwarded_events(&app);
	let server_version = app.package_info().version.to_string();
	let version_app = app.clone();
	Arc::new(RpcHost {
		server_version,
		vault_root: desktop_vault_root(),
		events: desktop_event_hub(),
		index_version: Arc::new(move || {
			version_app.state::<VaultIndexState>().read().map(|idx| idx.version()).unwrap_or(0)
		}),
		dispatch: Arc::new(move |call, vault_root| {
			let index = app.state::<VaultIndexState>();
			dispatch(&HostContext { index: &index, vault_root }, call)
		}),
	})
}

/// Serves the frontend bundle on `127.0.0.1:<port>`, also reachable through
/// Tailscale Serve as `https://<tailnet_host>:<port>` for `owner_login`
/// (`remote::access`; an empty value leaves that route closed).
/// Restarts when any of the three changes, no-op otherwise. Errors name a
/// port that is taken. `async` runs it on the thread pool, off the main
/// thread: a restart stops the old server, which can block for up to a
/// second.
#[tauri::command(async)]
pub fn start_remote_server(
	app: AppHandle,
	state: State<'_, RemoteServerState>,
	port: u32,
	tailnet_host: String,
	owner_login: String,
) -> Result<(), String> {
	let port = u16::try_from(port).map_err(|_| "Port must be between 1 and 65535".to_string())?;
	let non_empty = |v: String| Some(v.trim().to_string()).filter(|s| !s.is_empty());
	let route = Route { port, tailnet_host: non_empty(tailnet_host), owner_login: non_empty(owner_login) };
	state.0.start(route, bundle_lookup(app.clone()), Some(rpc_host(app)))
}

/// Stops the loopback server; no-op when it is not running. Off the main
/// thread for the same reason as `start_remote_server`.
#[tauri::command(async)]
pub fn stop_remote_server(state: State<'_, RemoteServerState>) -> Result<(), String> {
	state.0.stop();
	Ok(())
}
