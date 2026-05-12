//! Bridges the existing `vault::watcher` callback into a Tokio
//! `broadcast` channel that the sync engine consumes.
//!
//! The watcher's debounce loop is single-threaded (`std::thread`) and
//! emits to one `on_change` callback. To run the sync engine alongside
//! the frontend emit without rewiring the watcher's internals, we
//! plant a single fan-out call inside the watcher's callback: it
//! `app.emit(...)` to the frontend AND `forward(paths.clone())` to
//! this module's broadcaster. Sync consumers subscribe to that
//! broadcaster and react in their own tokio task.
//!
//! Capacity is intentionally bounded (`CHANNEL_CAPACITY`); lagging
//! subscribers will drop the oldest payloads rather than back up the
//! watcher thread. The sync engine is expected to keep up; if it
//! doesn't, the next debounce burst recovers state via the watcher's
//! normal scan-after-burst pattern.

use std::sync::OnceLock;
use tokio::sync::broadcast;

/// How many payloads the broadcaster buffers before lagging
/// subscribers start dropping the oldest. 256 covers a heavy burst
/// (notify debounce is 500ms so a sustained 500/s save rate would
/// still fit).
pub const CHANNEL_CAPACITY: usize = 256;

static BRIDGE: OnceLock<broadcast::Sender<Vec<String>>> = OnceLock::new();

/// Lazily creates the broadcaster on first use. The returned sender
/// is `Clone`, so anyone (the watcher fan-out point, tests) can hold
/// their own handle.
pub fn sender() -> broadcast::Sender<Vec<String>> {
	BRIDGE
		.get_or_init(|| broadcast::channel::<Vec<String>>(CHANNEL_CAPACITY).0)
		.clone()
}

/// Subscribes to broadcast updates. Each call returns a fresh
/// receiver; multiple subscribers each see every payload.
pub fn subscribe() -> broadcast::Receiver<Vec<String>> {
	sender().subscribe()
}

/// Forwards a watcher payload to subscribers. Safe to call when no
/// subscriber is alive — the broadcast returns a `SendError` which
/// we swallow (this is fire-and-forget by design).
pub fn forward(paths: Vec<String>) {
	let _ = sender().send(paths);
}

/// Returns the current subscriber count. Exposed for diagnostics and
/// tests; the production path doesn't read it.
pub fn subscriber_count() -> usize {
	sender().receiver_count()
}
