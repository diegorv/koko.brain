//! Which Rust events reach browser sessions, and the hub that fans them out.
//!
//! Only `FORWARDED_EVENTS` are sent. Every name in the frontend `EventMap`
//! (`src/lib/contracts/events.ts`) must be classified here, forwarded or
//! never forwarded; `tests/remote_events_test.rs` fails otherwise. A name
//! that is neither is not forwarded either.

use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};

use serde_json::Value;

use crate::events::{
	APP_EXIT_REQUESTED_EVENT, SEMANTIC_INDEX_PROGRESS_EVENT, TAURI_DEBUG_LOG_EVENT, VAULT_FILES_CHANGED_EVENT,
	VAULT_INDEX_UPDATED_EVENT,
};

/// Whether an event may reach a browser.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Forwarding {
	/// Sent to every browser session.
	Forwarded,
	/// Kept on the Mac.
	NeverForwarded,
}

/// The events browser sessions receive.
pub const FORWARDED_EVENTS: [&str; 3] = [VAULT_INDEX_UPDATED_EVENT, VAULT_FILES_CHANGED_EVENT, SEMANTIC_INDEX_PROGRESS_EVENT];

/// Kept on the Mac. `qc:*` carries the Mac clipboard text, the frontmost app
/// and its URL; `tauri-debug-log` carries backend log lines; `menu:*` and
/// `app:exit-requested` drive the desktop window (a browser must not run the
/// desktop's exit flush). A `<prefix>:*` row covers every name with that
/// prefix.
const NEVER_FORWARDED: [&str; 4] = ["qc:*", "menu:*", TAURI_DEBUG_LOG_EVENT, APP_EXIT_REQUESTED_EVENT];

/// The class of `name`, `None` when it is not classified (not forwarded).
pub fn forwarding(name: &str) -> Option<Forwarding> {
	if FORWARDED_EVENTS.contains(&name) {
		return Some(Forwarding::Forwarded);
	}
	let never = NEVER_FORWARDED.iter().any(|row| match row.strip_suffix('*') {
		Some(prefix) => name.starts_with(prefix),
		None => *row == name,
	});
	never.then_some(Forwarding::NeverForwarded)
}

/// Receives one forwarded event (name, parsed payload). Returns `false` when
/// the subscriber is gone, which drops it. Must not block: it runs on the
/// thread that emitted the event.
pub type EventSink = Arc<dyn Fn(&str, &Value) -> bool + Send + Sync>;

/// Fans forwarded events out to the open browser sessions.
#[derive(Default)]
pub struct EventHub {
	sinks: Mutex<(u64, HashMap<u64, EventSink>)>,
}

impl EventHub {
	fn lock(&self) -> std::sync::MutexGuard<'_, (u64, HashMap<u64, EventSink>)> {
		match self.sinks.lock() {
			Ok(g) => g,
			Err(poisoned) => poisoned.into_inner(),
		}
	}

	/// Adds a subscriber; the id removes it.
	pub fn subscribe(&self, sink: EventSink) -> u64 {
		let mut guard = self.lock();
		guard.0 += 1;
		let id = guard.0;
		guard.1.insert(id, sink);
		id
	}

	/// Removes a subscriber; no-op for an unknown id.
	pub fn unsubscribe(&self, id: u64) {
		self.lock().1.remove(&id);
	}

	/// How many subscribers are registered.
	pub fn subscriber_count(&self) -> usize {
		self.lock().1.len()
	}

	/// Sends `name` with its JSON `payload` to every subscriber when the name
	/// is forwarded; anything else, or a payload that is not JSON, is dropped.
	pub fn publish(&self, name: &str, payload: &str) {
		if forwarding(name) != Some(Forwarding::Forwarded) {
			return;
		}
		let sinks: Vec<(u64, EventSink)> = self.lock().1.iter().map(|(id, s)| (*id, s.clone())).collect();
		// The desktop listener stays registered after the last session ends;
		// skip the parse when nobody would receive it.
		if sinks.is_empty() {
			return;
		}
		let Ok(payload) = serde_json::from_str::<Value>(payload) else { return };
		let gone: Vec<u64> = sinks.into_iter().filter(|(_, sink)| !sink(name, &payload)).map(|(id, _)| id).collect();
		if !gone.is_empty() {
			let mut guard = self.lock();
			for id in gone {
				guard.1.remove(&id);
			}
		}
	}
}

/// The process-wide hub the desktop's event listeners publish to.
pub fn desktop_event_hub() -> Arc<EventHub> {
	static HUB: OnceLock<Arc<EventHub>> = OnceLock::new();
	HUB.get_or_init(|| Arc::new(EventHub::default())).clone()
}
