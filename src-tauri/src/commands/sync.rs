//! Tauri IPC commands for P2P sync. Thin wrappers over `crate::sync`.

use tauri::State;

use crate::sync::engine::{list_remote_shares, run_sync, PeerTarget, SyncSummary};
use crate::sync::noise::{generate_pairing_key, parse_pairing_key};
use crate::sync::server::{start_server, ServerConfig, SyncServerState};

/// Listener status returned to the frontend.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
	/// True while the listener is running.
	pub listening: bool,
	/// Bound port when listening.
	pub port: Option<u16>,
	/// Best-effort LAN IP of this machine, for display in settings.
	pub local_ip: Option<String>,
}

/// Best-effort local LAN IP: "connecting" a UDP socket picks the outbound
/// interface without sending any packet.
fn local_lan_ip() -> Option<String> {
	let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
	socket.connect("8.8.8.8:80").ok()?;
	Some(socket.local_addr().ok()?.ip().to_string())
}

/// Generate a fresh 64-hex-char pairing key.
#[tauri::command]
pub fn sync_generate_pairing_key() -> Result<String, String> {
	generate_pairing_key()
}

/// (Re)start the listener. `port` 0 picks an ephemeral port; the bound port
/// is returned so the frontend can persist it.
#[tauri::command]
pub async fn sync_start_listener(
	state: State<'_, SyncServerState>,
	vault_path: String,
	port: u16,
	pairing_key: String,
	device_name: String,
	exposed_folders: Vec<String>,
) -> Result<u16, String> {
	let psk = parse_pairing_key(&pairing_key)?;
	// Stop any previous listener first. Scoped so the std::sync::MutexGuard
	// (not Send) is dropped before the await below.
	{
		let mut guard = state.0.lock().map_err(|e| format!("sync state lock poisoned: {e}"))?;
		if let Some(running) = guard.take() {
			running.stop();
		}
	}
	let config = ServerConfig { vault_path, device_name, psk, exposed_folders };
	let running = start_server(config, port).await?;
	let bound = running.port;
	let mut guard = state.0.lock().map_err(|e| format!("sync state lock poisoned: {e}"))?;
	*guard = Some(running);
	Ok(bound)
}

/// Stop the listener if it is running.
#[tauri::command]
pub fn sync_stop_listener(state: State<'_, SyncServerState>) -> Result<(), String> {
	let mut guard = state.0.lock().map_err(|e| format!("sync state lock poisoned: {e}"))?;
	if let Some(running) = guard.take() {
		running.stop();
	}
	Ok(())
}

/// Current listener status plus this machine's LAN IP.
#[tauri::command]
pub fn sync_status(state: State<'_, SyncServerState>) -> Result<SyncStatus, String> {
	let guard = state.0.lock().map_err(|e| format!("sync state lock poisoned: {e}"))?;
	let port = guard.as_ref().map(|r| r.port);
	Ok(SyncStatus { listening: port.is_some(), port, local_ip: local_lan_ip() })
}

/// Ask the peer for its exposed folders.
#[tauri::command]
pub async fn sync_list_remote_shares(
	address: String,
	pairing_key: String,
	device_name: String,
) -> Result<Vec<String>, String> {
	list_remote_shares(&PeerTarget { address, pairing_key, local_device_name: device_name }).await
}

/// Run one pull session against the peer.
#[tauri::command]
pub async fn sync_now(
	vault_path: String,
	address: String,
	pairing_key: String,
	device_name: String,
	subscriptions: Vec<String>,
) -> Result<SyncSummary, String> {
	run_sync(
		&vault_path,
		&PeerTarget { address, pairing_key, local_device_name: device_name },
		&subscriptions,
	)
	.await
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn generated_keys_are_valid_and_unique() {
		let a = sync_generate_pairing_key().unwrap();
		let b = sync_generate_pairing_key().unwrap();
		assert_eq!(a.len(), 64);
		assert_ne!(a, b);
		assert!(crate::sync::noise::parse_pairing_key(&a).is_ok());
	}

	#[test]
	fn local_lan_ip_is_a_parseable_ip_when_present() {
		// May be None on a machine with no route; when present it must
		// parse as an IP address.
		if let Some(ip) = local_lan_ip() {
			assert!(ip.parse::<std::net::IpAddr>().is_ok(), "got: {ip}");
		}
	}
}
