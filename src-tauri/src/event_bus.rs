//! Internal pub/sub bus that decouples event producers (commands, watchers,
//! logger) from event consumers (the native Tauri window and the embedded
//! HTTP SSE endpoint).
//!
//! Why this exists: before the HTTP server was added, every emit went
//! straight to `tauri::AppHandle::emit(...)` which only the native window
//! could see. Browser-attached clients had no way to learn about
//! `vault-files-changed`, `vault-index-updated`, semantic/terminal/log
//! events. The bus lets the SSE handler subscribe alongside the native
//! window without producers caring which transport is listening.
//!
//! Flow: `bus.emit(topic, &payload)` -> all subscribers receive
//! `(topic, JSON payload)`. A dedicated bridge task in `lib.rs::run`
//! subscribes once and forwards every message to `AppHandle::emit` so
//! the native window keeps working unchanged. The SSE handler in
//! `http.rs` subscribes per HTTP request and filters by `?topic=...`.
//!
//! Capacity: 1024 messages. Lagging subscribers (slow SSE client) will
//! get `RecvError::Lagged`; the SSE handler logs and continues. Producers
//! never block — `broadcast::Sender::send` returns `Err` when no receivers
//! exist (silently ignored, matches the previous "best-effort emit" shape)
//! but never waits.

use tokio::sync::broadcast;

/// Bus capacity. Sized so a burst of semantic/log events can land while a
/// slow SSE consumer catches up. Producers do not block when the buffer
/// is full; the slowest subscriber loses the oldest messages.
const BUS_CAPACITY: usize = 1024;

/// Cloneable handle to the broadcast channel. `clone()` is cheap — it
/// just bumps the Arc inside the sender. Stored in Tauri-managed state
/// (`State<'_, EventBus>`) and in `http::AppState`.
#[derive(Clone)]
pub struct EventBus {
	tx: broadcast::Sender<BusMessage>,
}

/// `(topic, payload-as-json)` pair shared across subscribers. Payload is
/// pre-serialized to `serde_json::Value` once at emit time so each
/// subscriber doesn't re-serialize. SSE encodes the value directly; the
/// Tauri bridge re-serializes (cheap; the JSON is already a Value).
pub type BusMessage = (String, serde_json::Value);

impl EventBus {
	pub fn new() -> Self {
		let (tx, _rx) = broadcast::channel(BUS_CAPACITY);
		Self { tx }
	}

	/// Emit a typed payload on `topic`. Serialization failures are logged
	/// and the event is dropped — same best-effort policy the previous
	/// `let _ = app.emit(...)` calls had. No backpressure on the producer.
	pub fn emit<T: serde::Serialize>(&self, topic: &str, payload: &T) {
		let value = match serde_json::to_value(payload) {
			Ok(v) => v,
			Err(err) => {
				eprintln!("[BUS] serialize failed for topic={}: {}", topic, err);
				return;
			}
		};
		let _ = self.tx.send((topic.to_string(), value));
	}

	/// Emit a pre-built JSON value (used by the bus re-broadcaster and
	/// any caller that already holds the value). Same best-effort policy
	/// as `emit`.
	pub fn emit_value(&self, topic: &str, value: serde_json::Value) {
		let _ = self.tx.send((topic.to_string(), value));
	}

	/// Subscribe to every message. Filtering by topic is left to the
	/// consumer (the SSE handler filters via `?topic=...`; the Tauri
	/// bridge forwards everything).
	pub fn subscribe(&self) -> broadcast::Receiver<BusMessage> {
		self.tx.subscribe()
	}
}

impl Default for EventBus {
	fn default() -> Self {
		Self::new()
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use serde::Serialize;

	#[derive(Serialize)]
	struct P {
		paths: Vec<String>,
	}

	#[tokio::test]
	async fn emit_reaches_subscriber() {
		let bus = EventBus::new();
		let mut rx = bus.subscribe();
		bus.emit("watcher", &P { paths: vec!["a".into()] });
		let (topic, value) = rx.recv().await.unwrap();
		assert_eq!(topic, "watcher");
		assert_eq!(value["paths"][0], "a");
	}

	#[tokio::test]
	async fn emit_with_no_subscriber_is_ok() {
		let bus = EventBus::new();
		// No subscribers — should not panic or block.
		bus.emit("noop", &P { paths: vec![] });
	}

	#[tokio::test]
	async fn multiple_subscribers_each_see_every_message() {
		let bus = EventBus::new();
		let mut a = bus.subscribe();
		let mut b = bus.subscribe();
		bus.emit("t", &P { paths: vec!["x".into()] });
		assert_eq!(a.recv().await.unwrap().0, "t");
		assert_eq!(b.recv().await.unwrap().0, "t");
	}
}
