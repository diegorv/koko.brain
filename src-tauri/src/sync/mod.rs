//! LAN sync MVP — discovery, pairing (TOFU), one-shot folder push.
//!
//! This module is the single mount point for the feature. The host file
//! `lib.rs` calls `sync::init()` once; everything else (commands, types,
//! transport, push) is added inside this module + `commands/sync.rs`.
//! Per-stage growth never touches host files outside the plugin.

pub mod dispatch;
pub mod discovery;
pub mod events;
pub mod identity;
pub mod push;
pub mod trust;
pub mod transport;
pub mod wordlist;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use tauri::plugin::{Builder, TauriPlugin};
use tauri::{Manager, Runtime};

/// Plugin-wide shared state, attached via `app.manage(Arc::new(SyncState::default()))`.
///
/// Wraps the long-lived handles each command needs to coordinate
/// across calls:
/// - the running mDNS announcer (`Some` only while the user has
///   marked the vault discoverable);
/// - the running mDNS browser (`Some` only while a pairing dialog
///   is open);
/// - the cached device identity (lazy-loaded on first command call
///   so the keypair is touched at most once per process);
/// - the running TCP accept loop handle (`Some` only while
///   discoverable; aborts on shutdown);
/// - a map of pending inbound-pair sessions keyed by request_id;
/// - a map of last-seen LAN addresses keyed by remote fingerprint
///   hex, populated by the mDNS browser and consumed by
///   `lan_sync_push_folder` to locate the peer's socket.
///
/// Locks: `announcer`, `browser`, `identity`, `tcp_accept_handle`,
/// and `last_seen_addrs` use std::sync::Mutex because the critical
/// section never crosses an await. `pending_pair_sessions` holds its
/// entries across awaits (the oneshot signalling), so it uses
/// `tokio::sync::Mutex`.
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
	/// Tokio JoinHandle for the TCP accept loop spawned when the
	/// vault becomes discoverable. `Some` while the loop is running;
	/// `None` otherwise. Aborted by `set_discoverable(false)`.
	pub tcp_accept_handle: Mutex<Option<tokio::task::JoinHandle<()>>>,
	/// Pending inbound pair requests, keyed by the backend-issued
	/// request_id. Entries are inserted by the dispatch task and
	/// removed by `lan_sync_pair_with_peer` (respond mode).
	pub pending_pair_sessions: tokio::sync::Mutex<HashMap<String, dispatch::PendingPairEntry>>,
	/// Last observed `(addr, port)` for each peer fingerprint hex,
	/// updated by the mDNS browser callback. Consumed by
	/// `lan_sync_push_folder` to locate the peer's socket without
	/// requiring the frontend to remember it.
	pub last_seen_addrs: Mutex<HashMap<String, (String, u16)>>,
}

impl Default for SyncState {
	fn default() -> Self {
		Self {
			announcer: Mutex::new(None),
			browser: Mutex::new(None),
			identity: Mutex::new(None),
			tcp_accept_handle: Mutex::new(None),
			pending_pair_sessions: tokio::sync::Mutex::new(HashMap::new()),
			last_seen_addrs: Mutex::new(HashMap::new()),
		}
	}
}

/// Build the LAN sync Tauri plugin.
///
/// Stages 0-3 registered no commands and only set up the plugin
/// seam. Stage 5 wired six commands (identity bootstrap, announce
/// on/off, browse on/off, trusted-peer list/remove). Stage 8 wires
/// two more: pairing (initiator + respond, dual-mode) and folder
/// push. The shared [`SyncState`] is installed via `app.manage`
/// as an `Arc<SyncState>` so the accept-loop tasks can clone the
/// handle without exclusive ownership.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
	Builder::new("kokobrain-sync")
		.invoke_handler(tauri::generate_handler![
			crate::commands::sync::lan_sync_get_my_fingerprint,
			crate::commands::sync::lan_sync_set_discoverable,
			crate::commands::sync::lan_sync_start_browse,
			crate::commands::sync::lan_sync_stop_browse,
			crate::commands::sync::lan_sync_list_trusted_peers,
			crate::commands::sync::lan_sync_remove_trusted_peer,
			crate::commands::sync::lan_sync_pair_with_peer,
			crate::commands::sync::lan_sync_push_folder,
		])
		.setup(|app, _api| {
			app.manage(Arc::new(SyncState::default()));
			Ok(())
		})
		.build()
}
