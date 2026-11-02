//! Serves the frontend bundle to a browser on the Mac's loopback interface,
//! and the browser session that forwards its IPC calls to the desktop.
//! Tauri-free: the caller injects the asset lookup and the dispatcher
//! (`commands::remote` wraps `AppHandle::asset_resolver` and the managed
//! state).

pub mod access;
pub mod asset;
pub mod csp;
pub mod dispatch;
pub mod events;
pub mod host;
pub mod policy;
pub mod rpc;
pub mod server;
pub mod ws;
