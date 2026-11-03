//! `utils::logger` sink path: `debug_log` forwards (tag, message, ts_ms) to
//! the sink installed with `set_log_sink` (the app installs one that emits
//! `tauri-debug-log`).
//!
//! This file holds exactly ONE `#[test]` so it runs alone in its own test
//! binary: `DEBUG_ENABLED` and the sink are process globals, and the
//! sink can be installed only once per process.

use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use kokobrain_lib::utils::logger::{debug_log, set_debug_mode, set_log_sink};

fn now_ms() -> u64 {
	SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64
}

#[test]
fn debug_log_reaches_sink_only_when_debug_enabled() {
	let received: Arc<Mutex<Vec<(String, String, u64)>>> = Arc::new(Mutex::new(Vec::new()));
	let sink_received = Arc::clone(&received);
	set_log_sink(Box::new(move |tag, message, ts_ms| {
		sink_received
			.lock()
			.unwrap()
			.push((tag.to_string(), message.to_string(), ts_ms));
	}));

	set_debug_mode(true);
	let before = now_ms();
	debug_log("T", "m");
	let after = now_ms();
	{
		let got = received.lock().unwrap();
		assert_eq!(got.len(), 1, "enabled debug_log must deliver one line to the sink");
		let (tag, message, ts_ms) = &got[0];
		assert_eq!((tag.as_str(), message.as_str()), ("T", "m"));
		assert!(
			*ts_ms >= before && *ts_ms <= after,
			"ts_ms {ts_ms} must be the Rust wall clock at the call, in [{before}, {after}]"
		);
	}

	set_debug_mode(false);
	debug_log("T-OFF", "must-not-arrive");
	assert_eq!(
		received.lock().unwrap().len(),
		1,
		"disabled debug_log must not call the sink"
	);
}
