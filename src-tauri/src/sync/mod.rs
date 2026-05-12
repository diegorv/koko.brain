//! LAN sync MVP — discovery, pairing (TOFU), one-shot folder push.
//!
//! This module is the single mount point for the feature. The host file
//! `lib.rs` calls `sync::init()` once; everything else (commands, types,
//! transport, push) is added inside this module + `commands/sync.rs`.
//! Per-stage growth never touches host files outside the plugin.

pub mod discovery;
pub mod events;
pub mod identity;
pub mod trust;
pub mod wordlist;

use std::sync::Mutex;

use tauri::plugin::{Builder, TauriPlugin};
use tauri::{Manager, Runtime};

/// Plugin-wide shared state, attached via `app.manage(SyncState::default())`.
///
/// Wraps the long-lived handles each command needs to coordinate
/// across calls:
/// - the running mDNS announcer (`Some` only while the user has
///   marked the vault discoverable);
/// - the running mDNS browser (`Some` only while a pairing dialog
///   is open);
/// - the cached device identity (lazy-loaded on first command call
///   so the keypair is touched at most once per process).
///
/// All three slots are guarded by a `Mutex` because commands run on
/// the Tauri worker pool and hold the lock for microseconds.
pub struct SyncState {
	/// Active mDNS announcer. `Some` between `set_discoverable(true)`
	/// and `set_discoverable(false)`.
	pub announcer: Mutex<Option<discovery::Announcer>>,
	/// Active mDNS browser. `Some` between `start_browse` and
	/// `stop_browse`.
	pub browser: Mutex<Option<discovery::Browser>>,
	/// Cached device identity. Lazily populated by
	/// `lan_sync_get_my_fingerprint` (and any other command that needs
	/// it). The slot is overwritten whenever a fresh identity is
	/// loaded — a new vault path may have its own key.
	pub identity: Mutex<Option<identity::DeviceIdentity>>,
}

impl Default for SyncState {
	fn default() -> Self {
		Self {
			announcer: Mutex::new(None),
			browser: Mutex::new(None),
			identity: Mutex::new(None),
		}
	}
}

/// Build the LAN sync Tauri plugin.
///
/// Stages 0-3 registered no commands and only set up the plugin
/// seam. Stage 5 wires six commands (identity bootstrap,
/// announce on/off, browse on/off, trusted-peer list/remove) and
/// installs the shared [`SyncState`] via `app.manage`.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
	Builder::new("kokobrain-sync")
		.invoke_handler(tauri::generate_handler![
			crate::commands::sync::lan_sync_get_my_fingerprint,
			crate::commands::sync::lan_sync_set_discoverable,
			crate::commands::sync::lan_sync_start_browse,
			crate::commands::sync::lan_sync_stop_browse,
			crate::commands::sync::lan_sync_list_trusted_peers,
			crate::commands::sync::lan_sync_remove_trusted_peer,
		])
		.setup(|app, _api| {
			app.manage(SyncState::default());
			Ok(())
		})
		.build()
}
