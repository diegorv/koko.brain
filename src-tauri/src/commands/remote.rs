//! Tauri glue for the loopback server in `remote::server`: the asset lookup
//! reads the same bundle the desktop webview loads, and browser calls are
//! dispatched against the app's managed state.

use std::sync::Arc;

use tauri::{AppHandle, Manager, State};

use crate::remote::dispatch::{dispatch, HostContext};
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

fn rpc_host(app: AppHandle) -> Arc<RpcHost> {
	let server_version = app.package_info().version.to_string();
	Arc::new(RpcHost {
		server_version,
		vault_root: desktop_vault_root(),
		dispatch: Arc::new(move |call, vault_root| {
			let index = app.state::<VaultIndexState>();
			dispatch(&HostContext { index: &index, vault_root }, call)
		}),
	})
}

/// Serves the frontend bundle on `127.0.0.1:<port>`; restarts on a new port,
/// no-op when already on this one. Errors name a port that is taken.
/// `async` runs it on the thread pool, off the main thread: a restart stops
/// the old server, which can block for up to a second.
#[tauri::command(async)]
pub fn start_remote_server(
	app: AppHandle,
	state: State<'_, RemoteServerState>,
	port: u32,
) -> Result<(), String> {
	let port = u16::try_from(port).map_err(|_| "Port must be between 1 and 65535".to_string())?;
	state.0.start(port, bundle_lookup(app.clone()), Some(rpc_host(app)))
}

/// Stops the loopback server; no-op when it is not running. Off the main
/// thread for the same reason as `start_remote_server`.
#[tauri::command(async)]
pub fn stop_remote_server(state: State<'_, RemoteServerState>) -> Result<(), String> {
	state.0.stop();
	Ok(())
}
