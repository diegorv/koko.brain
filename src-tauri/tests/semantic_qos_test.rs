//! Tests for `semantic::qos` (`src/semantic/qos.rs`).
//!
//! Each test runs in a fresh `std::thread` so the QoS it sets never leaks
//! into the test harness thread. That ORT starts a real session's intra-op
//! workers through the manager is tested in
//! `semantic_embedder_qos_session_test.rs`, its own binary so the process-wide
//! worker counter is not shared with the tests here.

use kokobrain_lib::semantic::qos::{current_qos_class, enter_utility_qos, UtilityQosThreadManager, QOS_CLASS_UTILITY};
use kokobrain_lib::semantic::embedder::embedder_session_builder;
use ort::environment::ThreadManager;

#[cfg(target_os = "macos")]
#[test]
fn guard_lowers_the_thread_to_utility_and_restores_it() {
	std::thread::spawn(|| {
		let before = current_qos_class().expect("macOS reports a QoS class");
		assert_ne!(before, QOS_CLASS_UTILITY);
		{
			let _qos = enter_utility_qos();
			assert_eq!(current_qos_class(), Some(QOS_CLASS_UTILITY));
		}
		assert_eq!(current_qos_class(), Some(before));
	})
	.join()
	.unwrap();
}

#[cfg(target_os = "macos")]
#[test]
fn nested_guards_restore_in_order() {
	std::thread::spawn(|| {
		let before = current_qos_class().unwrap();
		{
			let _outer = enter_utility_qos();
			{
				let _inner = enter_utility_qos();
				assert_eq!(current_qos_class(), Some(QOS_CLASS_UTILITY));
			}
			assert_eq!(current_qos_class(), Some(QOS_CLASS_UTILITY));
		}
		assert_eq!(current_qos_class(), Some(before));
	})
	.join()
	.unwrap();
}

#[cfg(target_os = "macos")]
#[test]
fn thread_manager_starts_workers_at_utility() {
	let (tx, rx) = std::sync::mpsc::channel();
	let handle = UtilityQosThreadManager
		.create(move || {
			tx.send(current_qos_class()).unwrap();
		})
		.expect("thread spawns");
	UtilityQosThreadManager::join(handle).expect("thread joins");
	assert_eq!(rx.recv().unwrap(), Some(QOS_CLASS_UTILITY));
}

#[cfg(not(target_os = "macos"))]
#[test]
fn qos_is_a_no_op_off_macos() {
	assert_eq!(current_qos_class(), None);
	let _qos = enter_utility_qos();
	assert_eq!(current_qos_class(), None);
}

#[test]
fn thread_manager_runs_the_work() {
	let (tx, rx) = std::sync::mpsc::channel();
	let handle = UtilityQosThreadManager
		.create(move || tx.send(42).unwrap())
		.expect("thread spawns");
	UtilityQosThreadManager::join(handle).expect("thread joins");
	assert_eq!(rx.recv().unwrap(), 42);
}

#[test]
fn embedder_session_builder_constructs() {
	// Smoke test on every target; the macOS worker check needs a commit and
	// lives in `semantic_embedder_qos_session_test.rs`.
	assert!(embedder_session_builder(2).is_ok());
}
