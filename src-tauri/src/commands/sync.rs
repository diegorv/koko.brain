use std::sync::Arc;

use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;

use crate::sync::crypto::{self, SyncLocalConfig};
use crate::sync::engine::{SyncEngine, SyncEvent, SyncStatus};

// ---------------------------------------------------------------------------
// State type (managed by Tauri)
// ---------------------------------------------------------------------------

/// Shared sync engine state, registered via `app.manage()` in `lib.rs`.
pub type SyncEngineState = Arc<Mutex<Option<SyncEngine>>>;

// ---------------------------------------------------------------------------
// Passphrase commands
// ---------------------------------------------------------------------------

/// Generates a new 15-character sync passphrase using CSPRNG.
#[tauri::command]
pub fn generate_sync_passphrase() -> Result<String, String> {
	Ok(crypto::generate_passphrase())
}

/// Saves a sync passphrase to the Keychain for a vault.
///
/// Validates minimum length (15 chars) before storing.
#[tauri::command]
pub fn save_sync_passphrase(vault_path: String, passphrase: String) -> Result<(), String> {
	crypto::save_passphrase(&vault_path, &passphrase)
}

/// Checks whether a sync passphrase exists in the Keychain for a vault.
#[tauri::command]
pub fn has_sync_passphrase(vault_path: String) -> Result<bool, String> {
	crypto::has_passphrase(&vault_path)
}

/// Deletes the sync passphrase from the Keychain for a vault.
#[tauri::command]
pub fn delete_sync_passphrase(vault_path: String) -> Result<(), String> {
	crypto::delete_passphrase(&vault_path)
}

/// Changes the sync passphrase: stops engine if active, updates Keychain,
/// re-starts engine if it was active.
///
/// Remote peers must update their passphrase independently — handshake
/// fails until both sides use the new passphrase.
#[tauri::command]
pub async fn change_sync_passphrase(
	vault_path: String,
	new_passphrase: String,
	engine_state: State<'_, SyncEngineState>,
	app: AppHandle,
) -> Result<(), String> {
	crypto::validate_passphrase(&new_passphrase)?;

	let was_running;
	let port;

	// Stop engine if active
	{
		let mut engine = engine_state.lock().await;
		was_running = engine.is_some();
		port = engine.as_ref().map(|e| e.server_addr().port()).unwrap_or(0);
		if let Some(e) = engine.take() {
			e.stop().await;
		}
	}

	// Update passphrase in Keychain
	crypto::save_passphrase(&vault_path, &new_passphrase)?;

	// Re-start engine if it was active
	if was_running {
		start_engine(&vault_path, port, &engine_state, &app).await?;
	}

	Ok(())
}

// ---------------------------------------------------------------------------
// Reset command
// ---------------------------------------------------------------------------

/// Full sync reset: stops engine, deletes identity/state/keys.
///
/// Preserves `.noted/sync-local.json` (local allowlist config).
/// After reset, the user re-enters passphrase and re-enables sync.
#[tauri::command]
pub async fn reset_sync(
	vault_path: String,
	engine_state: State<'_, SyncEngineState>,
) -> Result<(), String> {
	// Stop engine if active
	{
		let mut engine = engine_state.lock().await;
		if let Some(e) = engine.take() {
			e.stop().await;
		}
	}

	let noted_dir = std::path::Path::new(&vault_path).join(".noted");

	// Delete sync-identity (static keypair)
	let identity_path = noted_dir.join("sync-identity");
	if identity_path.exists() {
		std::fs::remove_file(&identity_path)
			.map_err(|e| format!("Failed to delete sync-identity: {e}"))?;
	}

	// Delete sync-state.json (baselines, canonical UUID, last_sync)
	let state_path = noted_dir.join("sync-state.json");
	if state_path.exists() {
		std::fs::remove_file(&state_path)
			.map_err(|e| format!("Failed to delete sync-state.json: {e}"))?;
	}

	// Remove passphrase from Keychain (ignore errors if not found)
	let _ = crypto::delete_passphrase(&vault_path);

	// Remove sync-identity encryption key from Keychain
	let _ = crypto::delete_sync_id_key(&vault_path);

	Ok(())
}

// ---------------------------------------------------------------------------
// Local config commands
// ---------------------------------------------------------------------------

/// Reads the local sync config (`.noted/sync-local.json`).
#[tauri::command]
pub fn get_sync_local_config(vault_path: String) -> Result<SyncLocalConfig, String> {
	crypto::load_sync_local_config(&vault_path)
}

/// Saves the local sync config and hot-reloads allowed paths if engine is active.
#[tauri::command]
pub async fn save_sync_local_config(
	vault_path: String,
	config: SyncLocalConfig,
	engine_state: State<'_, SyncEngineState>,
) -> Result<(), String> {
	crypto::save_sync_local_config(&vault_path, &config)?;

	// Hot-reload allowed paths if engine is running
	let engine = engine_state.lock().await;
	if let Some(ref e) = *engine {
		e.reload_allowed_paths().await?;
	}

	Ok(())
}

// ---------------------------------------------------------------------------
// Engine control commands
// ---------------------------------------------------------------------------

/// Starts the sync engine: reads passphrase from Keychain, derives keys,
/// starts server + discovery, launches main loop, bridges events to Tauri.
#[tauri::command]
pub async fn start_sync(
	vault_path: String,
	port: u16,
	engine_state: State<'_, SyncEngineState>,
	app: AppHandle,
) -> Result<(), String> {
	{
		let engine = engine_state.lock().await;
		if engine.is_some() {
			return Err("Sync engine is already running".to_string());
		}
	}

	start_engine(&vault_path, port, &engine_state, &app).await
}

/// Stops the sync engine gracefully.
#[tauri::command]
pub async fn stop_sync(engine_state: State<'_, SyncEngineState>) -> Result<(), String> {
	let mut engine = engine_state.lock().await;
	match engine.take() {
		Some(e) => {
			e.stop().await;
			Ok(())
		}
		None => Err("Sync engine is not running".to_string()),
	}
}

/// Manually triggers a sync cycle (debounced by 2s in the engine).
#[tauri::command]
pub async fn trigger_sync(engine_state: State<'_, SyncEngineState>) -> Result<(), String> {
	let engine = engine_state.lock().await;
	match *engine {
		Some(ref e) => {
			e.trigger_sync().await;
			Ok(())
		}
		None => Err("Sync engine is not running".to_string()),
	}
}

/// Returns the list of authenticated sync peers.
#[tauri::command]
pub async fn get_sync_peers(
	engine_state: State<'_, SyncEngineState>,
) -> Result<Vec<SyncPeerInfo>, String> {
	let engine = engine_state.lock().await;
	match *engine {
		Some(ref e) => {
			let peers = e.get_peers().await;
			Ok(peers
				.into_iter()
				.map(|p| SyncPeerInfo {
					id: p.id,
					name: p.name,
					ip: p.ip.to_string(),
					port: p.port,
				})
				.collect())
		}
		None => Err("Sync engine is not running".to_string()),
	}
}

/// Returns the current sync status.
#[tauri::command]
pub async fn get_sync_status(
	engine_state: State<'_, SyncEngineState>,
) -> Result<SyncStatus, String> {
	let engine = engine_state.lock().await;
	match *engine {
		Some(ref e) => Ok(e.get_status().await),
		None => Err("Sync engine is not running".to_string()),
	}
}

// ---------------------------------------------------------------------------
// Types (serializable for Tauri)
// ---------------------------------------------------------------------------

/// Peer info returned to the frontend (IpAddr → String for serialization).
#[derive(serde::Serialize)]
pub struct SyncPeerInfo {
	pub id: String,
	pub name: String,
	pub ip: String,
	pub port: u16,
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Starts the sync engine and bridges events to Tauri.
async fn start_engine(
	vault_path: &str,
	port: u16,
	engine_state: &Mutex<Option<SyncEngine>>,
	app: &AppHandle,
) -> Result<(), String> {
	let passphrase = crypto::load_passphrase(vault_path)?;

	let (event_tx, mut event_rx) = tokio::sync::mpsc::channel(100);

	let engine = SyncEngine::start(
		vault_path.to_string(),
		port,
		&passphrase,
		event_tx,
	)
	.await?;

	*engine_state.lock().await = Some(engine);

	// Spawn event bridge: SyncEvent → Tauri events
	let app_handle = app.clone();
	tokio::spawn(async move {
		while let Some(event) = event_rx.recv().await {
			let event_name = match &event {
				SyncEvent::PeerDiscovered { .. } => "sync:peer-discovered",
				SyncEvent::PeerLost { .. } => "sync:peer-lost",
				SyncEvent::Started { .. } => "sync:started",
				SyncEvent::Progress { .. } => "sync:progress",
				SyncEvent::Completed { .. } => "sync:completed",
				SyncEvent::Error { .. } => "sync:error",
				SyncEvent::Conflict { .. } => "sync:conflict",
				SyncEvent::FileDeleted { .. } => "sync:file-deleted",
				SyncEvent::SettingsConflict { .. } => "sync:settings-conflict",
			};
			let _ = app_handle.emit(event_name, &event);
		}
	});

	Ok(())
}
