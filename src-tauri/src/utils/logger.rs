use chrono::Local;
use serde::Serialize;
use std::fmt::Display;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::OnceLock;

/// Receives `(tag, message)` for every enabled `debug_log` call.
pub type LogSink = Box<dyn Fn(&str, &str) + Send + Sync>;

/// Global flag controlling whether debug logs are emitted to the frontend.
static DEBUG_ENABLED: AtomicBool = AtomicBool::new(false);

/// Global log sink, set once during app setup. Keeps this module free of
/// framework types: the app shell decides how a log line leaves the process.
static LOG_SINK: OnceLock<LogSink> = OnceLock::new();

/// Payload emitted to the frontend for each debug log event.
#[derive(Serialize, Clone, Debug, ts_rs::TS)]
#[ts(export)]
pub struct DebugLogPayload {
	pub tag: String,
	pub message: String,
}

/// Installs the sink that `debug_log` forwards to after writing stderr.
/// Called once from the `lib.rs` setup, which emits `tauri-debug-log` with a
/// `DebugLogPayload`. Only the first call takes effect.
pub fn set_log_sink(sink: LogSink) {
	let _ = LOG_SINK.set(sink);
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
/// 2. Forwards `(tag, message)` to the sink installed by `set_log_sink`
///
/// When disabled, this is a no-op (just an atomic load).
pub fn debug_log(tag: &str, msg: impl Display) {
	if !DEBUG_ENABLED.load(Ordering::Relaxed) {
		return;
	}

	let message = msg.to_string();
	let ts = Local::now().format("%H:%M:%S%.3f");
	eprintln!("[{}] [{}] {}", ts, tag, message);

	if let Some(sink) = LOG_SINK.get() {
		sink(tag, &message);
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn set_debug_mode_toggles_flag() {
		set_debug_mode(false);
		assert!(!is_debug_enabled());
		set_debug_mode(true);
		assert!(is_debug_enabled());
		set_debug_mode(false);
		assert!(!is_debug_enabled());
	}

	#[test]
	fn debug_log_noop_when_disabled() {
		set_debug_mode(false);
		debug_log("TEST", "this should be silently ignored");
	}

	#[test]
	fn debug_log_enabled_without_sink_does_not_panic() {
		set_debug_mode(true);
		debug_log("TEST", "enabled but no sink - should print to stderr, not panic");
		set_debug_mode(false);
	}
}
