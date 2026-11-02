//! Serves the frontend bundle to a browser on the Mac's loopback interface.
//! Tauri-free: the caller injects the asset lookup (`commands::remote` wraps
//! `AppHandle::asset_resolver`).

pub mod csp;
pub mod server;
