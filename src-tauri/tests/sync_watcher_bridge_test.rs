//! Tests for `sync::watcher_bridge`.
//!
//! The broadcaster is a single global `OnceLock`, so all tests share
//! one channel. A `TEST_LOCK` mutex serialises them to keep
//! `subscriber_count` deterministic — otherwise a test that
//! subscribes can see counts from a concurrent test still draining.

use kokobrain_lib::sync::watcher_bridge::{
	forward, sender, subscribe, subscriber_count, CHANNEL_CAPACITY,
};
use std::sync::Mutex;
use std::time::Duration;
use tokio::sync::broadcast::error::TryRecvError;

static TEST_LOCK: Mutex<()> = Mutex::new(());

#[test]
fn capacity_constant_is_nonzero() {
	assert!(CHANNEL_CAPACITY > 0);
}

#[test]
fn sender_returns_same_underlying_channel() {
	let _guard = TEST_LOCK.lock().unwrap();
	let a = sender();
	let b = sender();
	// Both clones bind to the same broadcaster: sending on a delivers
	// to a receiver subscribed via b.
	let mut rx = b.subscribe();
	a.send(vec!["a/note.md".to_string()]).unwrap();
	let received = rx.try_recv().unwrap();
	assert_eq!(received, vec!["a/note.md".to_string()]);
}

#[test]
fn forward_reaches_a_subscribed_receiver() {
	let _guard = TEST_LOCK.lock().unwrap();
	let mut rx = subscribe();
	forward(vec!["x.md".to_string(), "y.md".to_string()]);
	let received = rx.try_recv().unwrap();
	assert_eq!(received, vec!["x.md".to_string(), "y.md".to_string()]);
}

#[test]
fn forward_with_no_subscribers_is_a_silent_noop() {
	let _guard = TEST_LOCK.lock().unwrap();
	// Drain any leftover subscribers from earlier tests by dropping
	// them — receivers we created here all go out of scope.
	let pre_count = subscriber_count();
	// We can't force zero (other tests may have left some) but we can
	// at least exercise the path without panicking.
	forward(vec!["nobody-listens.md".to_string()]);
	// Subscriber count must not change just because we forwarded.
	assert_eq!(subscriber_count(), pre_count);
}

#[test]
fn multiple_subscribers_each_see_every_payload() {
	let _guard = TEST_LOCK.lock().unwrap();
	let mut rx1 = subscribe();
	let mut rx2 = subscribe();
	forward(vec!["m.md".to_string()]);
	assert_eq!(rx1.try_recv().unwrap(), vec!["m.md".to_string()]);
	assert_eq!(rx2.try_recv().unwrap(), vec!["m.md".to_string()]);
}

#[test]
fn empty_receive_returns_empty_error() {
	let _guard = TEST_LOCK.lock().unwrap();
	let mut rx = subscribe();
	// Drain anything that might be lingering before we test the empty
	// path.
	while rx.try_recv().is_ok() {}
	match rx.try_recv() {
		Err(TryRecvError::Empty) => {}
		other => panic!("expected Empty, got {other:?}"),
	}
}

#[test]
fn subscriber_count_reflects_active_subscribers() {
	let _guard = TEST_LOCK.lock().unwrap();
	let baseline = subscriber_count();
	let _rx_a = subscribe();
	assert_eq!(subscriber_count(), baseline + 1);
	let _rx_b = subscribe();
	assert_eq!(subscriber_count(), baseline + 2);
	drop(_rx_b);
	assert_eq!(subscriber_count(), baseline + 1);
}

#[tokio::test]
async fn forwarded_payload_is_consumable_in_async_context() {
	let _guard = TEST_LOCK.lock().unwrap();
	let mut rx = subscribe();
	forward(vec!["async.md".to_string()]);
	// `recv()` should resolve immediately — payload was sent before
	// we awaited.
	let payload = tokio::time::timeout(Duration::from_millis(200), rx.recv())
		.await
		.expect("recv timed out")
		.expect("recv error");
	assert_eq!(payload, vec!["async.md".to_string()]);
}
