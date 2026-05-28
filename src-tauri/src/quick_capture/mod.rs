//! Quick Capture module.
//!
//! Hosts the Rust side of the composer + clipboard-capture surface
//! merged from the sibling quick-capture app. The frontend lives at
//! `src/lib/plugins/quick-capture/`; this module owns the clipboard
//! adapter, the pure kind-detection step, the global-shortcut intent
//! registry, and the Tauri command(s) that bridge them.

pub mod clipboard;
pub mod commands;
pub mod kind_detect;
pub mod shortcuts;
