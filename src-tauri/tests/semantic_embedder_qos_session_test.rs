//! Tests that the embedder's session builder (`embedder_session_builder` in
//! `src/semantic/embedder.rs`) makes ORT start the intra-op workers through
//! `UtilityQosThreadManager` (`src/semantic/qos.rs`) at macOS utility QoS.
//!
//! Its own test binary: `utility_workers_started()` is a process-wide counter,
//! so no other test may start ORT workers in this process.

use kokobrain_lib::semantic::embedder::embedder_session_builder;
use kokobrain_lib::semantic::qos::utility_workers_started;

/// A hand-encoded ONNX model (ir_version 7, opset 13): graph `y = Add(x, x)`
/// over a float tensor of shape `[1]`. Small enough to commit in a test, so no
/// real embedding model is needed.
const ADD_MODEL: &[u8] = &[
	8, 7, 66, 4, 10, 0, 16, 13, 58, 53, 10, 14, 10, 1, 120, 10, 1, 120, 18, 1, 121, 34, 3, 65, 100, 100, 18, 1, 103, 90,
	15, 10, 1, 120, 18, 10, 10, 8, 8, 1, 18, 4, 10, 2, 8, 1, 98, 15, 10, 1, 121, 18, 10, 10, 8, 8, 1, 18, 4, 10, 2, 8, 1,
];

#[test]
fn embedder_session_starts_its_intra_op_workers_at_utility() {
	let before = utility_workers_started();
	let session = embedder_session_builder(4)
		.expect("builder")
		.commit_from_memory(ADD_MODEL)
		.expect("tiny model commits");
	let started = utility_workers_started() - before;
	drop(session);

	// ORT creates `intra_threads - 1` workers at commit; the calling thread
	// is the fourth. Off macOS the manager still runs but QoS is a no-op.
	if cfg!(target_os = "macos") {
		assert_eq!(started, 3);
	} else {
		assert_eq!(started, 0);
	}
}

#[test]
fn embedder_session_builder_rejects_invalid_model_bytes() {
	assert!(embedder_session_builder(1)
		.expect("builder")
		.commit_from_memory(b"not an onnx model")
		.is_err());
}
