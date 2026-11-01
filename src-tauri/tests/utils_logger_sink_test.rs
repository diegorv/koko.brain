//! `utils::logger` sink path: `debug_log` forwards (tag, message) to the
//! sink installed with `set_log_sink` (the app installs one that emits
//! `tauri-debug-log`).
//!
//! This file holds exactly ONE `#[test]` so it runs alone in its own test
//! binary: `DEBUG_ENABLED` and the sink are process globals, and the
//! sink can be installed only once per process.

use std::sync::{Arc, Mutex};

use kokobrain_lib::utils::logger::{debug_log, set_debug_mode, set_log_sink};

#[test]
fn debug_log_reaches_sink_only_when_debug_enabled() {
	let received: Arc<Mutex<Vec<(String, String)>>> = Arc::new(Mutex::new(Vec::new()));
	let sink_received = Arc::clone(&received);
	set_log_sink(Box::new(move |tag, message| {
		sink_received
			.lock()
			.unwrap()
			.push((tag.to_string(), message.to_string()));
	}));

	set_debug_mode(true);
	debug_log("T", "m");
	assert_eq!(
		*received.lock().unwrap(),
		vec![("T".to_string(), "m".to_string())],
		"enabled debug_log must deliver (tag, message) to the sink"
	);

	set_debug_mode(false);
	debug_log("T-OFF", "must-not-arrive");
	assert_eq!(
		received.lock().unwrap().len(),
		1,
		"disabled debug_log must not call the sink"
	);
}
