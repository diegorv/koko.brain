//! Tests for `semantic::session_builder` (`src/semantic/mod.rs`).
//!
//! EXCLUDED: asserting that no graph node lands on CoreML needs the real
//! BGE-M3 model and live ORT inference, which the semantic-test policy keeps
//! out of unit/integration tests. There is no automated guard for it:
//! re-check peak memory by hand after any `ort` bump.

use kokobrain_lib::semantic::session_builder;

#[test]
fn session_builder_constructs() {
	// Smoke test only: proves the policy and thread setters do not error.
	// ort has no getter for the EP policy, so whether CoreML stays out is
	// checked by the probe example, not here.
	assert!(session_builder(2).is_ok());
}

#[test]
fn session_builder_rejects_invalid_model_bytes() {
	let tmp = tempfile::tempdir().unwrap();
	let model = tmp.path().join("model.onnx");
	std::fs::write(&model, b"not an onnx model").unwrap();
	let result = session_builder(1).unwrap().commit_from_file(&model);
	assert!(result.is_err());
}
