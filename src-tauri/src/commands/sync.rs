//! Tauri command handlers for the LAN sync plugin.
//!
//! Each command is a thin shim over the pure functions in
//! `crate::sync::*`. State that lives across calls (the mDNS
//! announcer, the mDNS browser, the cached identity) is held in
//! `crate::sync::SyncState` and reached through the `State` extractor.
//!
//! Errors are normalised to `String` because Tauri serialises command
//! results to JSON and `String` is the simplest end-to-end surface.

use std::path::PathBuf;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use tauri::{AppHandle, Runtime, State};

use crate::sync::discovery::{Announcer, Browser};
use crate::sync::events::{self, MyFingerprintPayload};
use crate::sync::identity::DeviceIdentity;
use crate::sync::trust::{self, TrustedPeer};
use crate::sync::SyncState;

/// Default TCP port the announcer publishes. Fixed for MVP so peers
/// can reconnect deterministically; later stages will negotiate a
/// dynamic port via the SRV record.
const ANNOUNCE_PORT: u16 = 7878;

/// Returns the on-disk path of the per-vault identity key.
///
/// Path layout: `<vault_root>/.kokobrain/identity.key`. The parent
/// directory is created on demand by
/// `DeviceIdentity::load_or_create`.
fn identity_path(vault_path: &str) -> PathBuf {
	PathBuf::from(vault_path)
		.join(".kokobrain")
		.join("identity.key")
}

/// Loads (or creates) the device identity for `vault_path` and
/// caches it in `state.identity`, overwriting any previous slot.
/// Returns the public fingerprint surfaces as a [`MyFingerprintPayload`].
fn ensure_identity_cached(
	state: &SyncState,
	vault_path: &str,
) -> Result<MyFingerprintPayload, String> {
	let identity = DeviceIdentity::load_or_create(&identity_path(vault_path))
		.map_err(|e| format!("load identity: {e}"))?;
	let payload = MyFingerprintPayload {
		fingerprint_hex: identity.fingerprint_hex(),
		fingerprint_display: identity.fingerprint_display(),
	};
	let mut guard = state
		.identity
		.lock()
		.map_err(|e| format!("identity lock poisoned: {e}"))?;
	*guard = Some(identity);
	Ok(payload)
}

/// Returns the cached fingerprint hex, loading + caching the
/// identity from disk when the slot is empty.
fn fingerprint_hex_for(state: &SyncState, vault_path: &str) -> Result<String, String> {
	{
		let guard = state
			.identity
			.lock()
			.map_err(|e| format!("identity lock poisoned: {e}"))?;
		if let Some(id) = guard.as_ref() {
			return Ok(id.fingerprint_hex());
		}
	}
	let payload = ensure_identity_cached(state, vault_path)?;
	Ok(payload.fingerprint_hex)
}

/// Loads (or creates) the device identity for `vault_path` and
/// returns its fingerprint surfaces.
///
/// Inputs:
/// - `vault_path` — absolute path to the vault root.
///
/// Side effects: caches the loaded identity in `state.identity`,
/// overwriting any previous value. Creates
/// `<vault_path>/.kokobrain/identity.key` on first call.
///
/// Errors when the parent directory cannot be created, the key file
/// has wrong length, or the disk write fails. Each is surfaced as a
/// human-readable `String`.
#[tauri::command]
pub async fn lan_sync_get_my_fingerprint<R: Runtime>(
	_app: AppHandle<R>,
	state: State<'_, SyncState>,
	vault_path: String,
) -> Result<MyFingerprintPayload, String> {
	ensure_identity_cached(&state, &vault_path)
}

/// Toggles whether the local vault is discoverable over mDNS.
///
/// Inputs:
/// - `vault_path` — absolute path to the vault root. Used to load
///   the per-vault identity when the cache is empty.
/// - `enabled` — `true` starts the announcer, `false` stops it.
///
/// Side effects: writes to `state.announcer`. Idempotent — calling
/// twice with the same `enabled` value is a no-op (the second call
/// returns `Ok(())` without touching the daemon).
///
/// Errors when starting the announcer fails (no local IP, mDNS
/// daemon error) or stopping fails (daemon already gone).
#[tauri::command]
pub async fn lan_sync_set_discoverable<R: Runtime>(
	_app: AppHandle<R>,
	state: State<'_, SyncState>,
	vault_path: String,
	enabled: bool,
) -> Result<(), String> {
	if enabled {
		// Check current state under the lock; release before doing
		// network I/O so the announcer thread does not deadlock on
		// the same Mutex if it ever needs to consult it.
		{
			let guard = state
				.announcer
				.lock()
				.map_err(|e| format!("announcer lock poisoned: {e}"))?;
			if guard.is_some() {
				return Ok(());
			}
		}
		let fp_hex = fingerprint_hex_for(&state, &vault_path)?;
		let announcer =
			Announcer::start(&fp_hex, ANNOUNCE_PORT).map_err(|e| format!("announce: {e}"))?;
		let mut guard = state
			.announcer
			.lock()
			.map_err(|e| format!("announcer lock poisoned: {e}"))?;
		// Race: a second `enabled=true` call may have started its own
		// announcer between the early-return check and now. Prefer
		// the existing slot and stop the new one to avoid leaks.
		if guard.is_some() {
			if let Err(e) = announcer.stop() {
				eprintln!("[lan-sync] dropped duplicate announcer stop: {e}");
			}
			return Ok(());
		}
		*guard = Some(announcer);
		Ok(())
	} else {
		let taken = {
			let mut guard = state
				.announcer
				.lock()
				.map_err(|e| format!("announcer lock poisoned: {e}"))?;
			guard.take()
		};
		if let Some(announcer) = taken {
			announcer.stop().map_err(|e| format!("unannounce: {e}"))?;
		}
		Ok(())
	}
}

/// Starts the mDNS browser for the LAN sync service type.
///
/// Inputs:
/// - `vault_path` — absolute path to the vault root, used to load
///   the local identity for self-loopback filtering.
///
/// Side effects: writes to `state.browser`. No-op when a browser is
/// already running (the existing slot wins). Each fresh discovery
/// emits an `lan-sync:peer-discovered` event via
/// [`events::emit_peer_discovered`].
///
/// Errors when starting the daemon fails or the consumer thread
/// cannot be spawned.
#[tauri::command]
pub async fn lan_sync_start_browse<R: Runtime>(
	app: AppHandle<R>,
	state: State<'_, SyncState>,
	vault_path: String,
) -> Result<(), String> {
	{
		let guard = state
			.browser
			.lock()
			.map_err(|e| format!("browser lock poisoned: {e}"))?;
		if guard.is_some() {
			return Ok(());
		}
	}
	let fp_hex = fingerprint_hex_for(&state, &vault_path)?;
	let app_for_cb = app.clone();
	let browser = Browser::start(fp_hex, move |payload| {
		if let Err(e) = events::emit_peer_discovered(&app_for_cb, &payload) {
			eprintln!("[lan-sync] emit peer-discovered failed: {e}");
		}
	})
	.map_err(|e| format!("browse: {e}"))?;
	let mut guard = state
		.browser
		.lock()
		.map_err(|e| format!("browser lock poisoned: {e}"))?;
	if guard.is_some() {
		// Same race-handling as `set_discoverable`: if another caller
		// raced ahead, drop the freshly-built browser.
		if let Err(e) = browser.stop() {
			eprintln!("[lan-sync] dropped duplicate browser stop: {e}");
		}
		return Ok(());
	}
	*guard = Some(browser);
	Ok(())
}

/// Stops the mDNS browser.
///
/// Side effects: takes the value out of `state.browser` and calls
/// `Browser::stop`. No-op when no browser is running.
#[tauri::command]
pub async fn lan_sync_stop_browse(state: State<'_, SyncState>) -> Result<(), String> {
	let taken = {
		let mut guard = state
			.browser
			.lock()
			.map_err(|e| format!("browser lock poisoned: {e}"))?;
		guard.take()
	};
	if let Some(browser) = taken {
		browser.stop().map_err(|e| format!("stop browse: {e}"))?;
	}
	Ok(())
}

/// Loads the per-vault trust store and returns its current contents.
///
/// Inputs:
/// - `vault_path` — absolute path to the vault root.
///
/// Returns an empty vector when the file does not exist yet (a
/// brand-new vault has trusted no one). Records with an invalid
/// `public_key_b64` (wrong length, non-base64) are silently skipped
/// by `trust::load`.
///
/// Errors propagate from `trust::load` as their `to_string`.
#[tauri::command]
pub async fn lan_sync_list_trusted_peers(vault_path: String) -> Result<Vec<TrustedPeer>, String> {
	trust::load(std::path::Path::new(&vault_path)).map_err(|e| e.to_string())
}

/// Removes a single peer from the trust store and returns the
/// updated list.
///
/// Inputs:
/// - `vault_path` — absolute path to the vault root.
/// - `fingerprint_hex` — stable primary key of the peer to remove.
///
/// No-op when no entry matches (the file is still re-written to
/// preserve the atomic-rename invariant).
///
/// Errors propagate from `trust::remove` as their `to_string`.
#[tauri::command]
pub async fn lan_sync_remove_trusted_peer(
	vault_path: String,
	fingerprint_hex: String,
) -> Result<Vec<TrustedPeer>, String> {
	trust::remove(std::path::Path::new(&vault_path), &fingerprint_hex)
		.map_err(|e| e.to_string())
}

/// Re-encodes a public key to base64. Kept private so the trust
/// store stays the single source of truth for serialisation.
///
/// Unused by the six commands above but referenced by future stages
/// that pair-and-trust in a single shot; kept here so the symbol
/// resolves the moment that stage lands.
#[allow(dead_code)]
pub(crate) fn encode_public_key(bytes: &[u8]) -> String {
	BASE64.encode(bytes)
}
