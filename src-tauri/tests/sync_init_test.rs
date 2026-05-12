//! Hotfix-stage: assert the LAN sync init now extends a `tauri::Builder`
//! (not a `TauriPlugin`) and that `SyncState::default()` constructs with
//! every slot empty. Replaces the Stage 0 test which targeted the plugin
//! shape that produced "Command not found" errors at runtime — see the
//! hotfix commit body for the diagnosis.

use std::sync::Arc;

use kokobrain_lib::sync::{self, SyncState};

#[test]
fn init_attaches_sync_state_to_builder() {
	let builder = tauri::Builder::<tauri::Wry>::default();
	let _builder = sync::init(builder);
}

#[test]
fn sync_state_default_constructs_with_empty_slots() {
	let state = Arc::new(SyncState::default());
	assert!(state.announcer.lock().unwrap().is_none());
	assert!(state.browser.lock().unwrap().is_none());
	assert!(state.identity.lock().unwrap().is_none());
	assert!(state.tcp_accept_handle.lock().unwrap().is_none());
	assert!(state.last_seen_addrs.lock().unwrap().is_empty());
}
