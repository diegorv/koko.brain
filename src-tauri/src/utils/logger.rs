use crate::event_bus::EventBus;
use chrono::Local;
use serde::Serialize;
use std::fmt::Display;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::OnceLock;

/// Global flag controlling whether debug logs are emitted to the frontend.
static DEBUG_ENABLED: AtomicBool = AtomicBool::new(false);

/// Global event bus handle, set once during app setup. Debug log events
/// flow through the bus so both the native Tauri window (via the
/// `bus -> AppHandle::emit` bridge) and any browser-attached SSE client
/// can subscribe to `tauri-debug-log`.
static BUS: OnceLock<EventBus> = OnceLock::new();

/// Payload emitted to the frontend for each debug log event.
#[derive(Serialize, Clone, Debug)]
pub struct DebugLogPayload {
	pub tag: String,
	pub message: String,
}

/// Stores the event bus handle for later use by `debug_log`.
/// Must be called once from `lib.rs::setup` after the bus is constructed.
pub fn init_logger(bus: &EventBus) {
	let _ = BUS.set(bus.clone());
}

/// Sets whether debug logging is enabled.
pub fn set_debug_mode(enabled: bool) {
	DEBUG_ENABLED.store(enabled, Ordering::Relaxed);
}

/// Returns whether debug logging is currently enabled.
pub fn is_debug_enabled() -> bool {
	DEBUG_ENABLED.load(Ordering::Relaxed)
}

/// Logs a debug message. When enabled:
/// 1. Prints to stderr (terminal where `pnpm tauri dev` runs)
/// 2. Emits a `tauri-debug-log` event through the event bus, which
///    fans out to the native Tauri window and any browser SSE client.
///
/// When disabled, this is a no-op (just an atomic load).
pub fn debug_log(tag: &str, msg: impl Display) {
	if !DEBUG_ENABLED.load(Ordering::Relaxed) {
		return;
	}

	let message = msg.to_string();
	let ts = Local::now().format("%H:%M:%S%.3f");
	eprintln!("[{}] [{}] {}", ts, tag, message);

	if let Some(bus) = BUS.get() {
		bus.emit(
			"tauri-debug-log",
			&DebugLogPayload {
				tag: tag.to_string(),
				message,
			},
		);
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn debug_mode_starts_disabled() {
		assert!(!is_debug_enabled());
	}

	#[test]
	fn set_debug_mode_toggles_flag() {
		set_debug_mode(true);
		assert!(is_debug_enabled());
		set_debug_mode(false);
		assert!(!is_debug_enabled());
	}

	#[test]
	fn debug_log_noop_when_disabled() {
		set_debug_mode(false);
		// Should not panic even without the BUS handle set
		debug_log("TEST", "this should be silently ignored");
	}
}
