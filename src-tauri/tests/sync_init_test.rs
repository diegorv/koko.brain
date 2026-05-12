//! Stage 0: assert the LAN sync plugin mounts without panicking.
//!
//! This is the seam test — it pins the public shape of `sync::init` so that
//! subsequent stages can grow the plugin (commands, setup work) without
//! breaking the host integration in `lib.rs`. Future stages should extend
//! this file with assertions about registered commands and state.

use kokobrain_lib::sync;

#[test]
fn init_constructs_plugin_without_panic() {
	let _plugin = sync::init::<tauri::Wry>();
}
