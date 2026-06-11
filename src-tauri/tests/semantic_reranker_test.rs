//! Boundary tests for `Reranker` (`src/semantic/reranker.rs`).
//!
//! EXCLUDED: `rerank()` scoring (including the empty-documents fast path) and
//! `with_batch_size()` chaining require a constructed `Reranker`, which needs
//! the real BGE-reranker-v2-m3 ONNX model (~571MB download) plus live ORT
//! inference — out of scope for unit/integration tests per the project's
//! semantic-test policy. These tests cover the load-time validation boundary
//! (missing files, invalid model bytes) and the public constants that gate
//! batching/truncation behavior.

use kokobrain_lib::semantic::reranker::Reranker;
use std::fs;
use tempfile::tempdir;

#[test]
fn default_constants_regression() {
	// 8 = CPU sweet spot documented in reranker.rs; 512 = the trained
	// sequence cap for (query + doc) pairs. Changing either silently shifts
	// rerank latency/quality, so pin them.
	assert_eq!(Reranker::DEFAULT_BATCH_SIZE, 8);
	assert_eq!(Reranker::DEFAULT_MAX_SEQ_LEN, 512);
}

#[test]
fn load_fails_when_model_file_missing() {
	let tmp = tempdir().unwrap();
	let err = Reranker::load(tmp.path()).err().expect("empty dir must fail");
	assert!(
		err.contains("Reranker model not found"),
		"error should name the missing model, got: {err}"
	);
}

#[test]
fn load_fails_when_tokenizer_missing() {
	let tmp = tempdir().unwrap();
	fs::write(tmp.path().join("model.onnx"), b"not a real model").unwrap();
	let err = Reranker::load(tmp.path()).err().expect("missing tokenizer must fail");
	assert!(
		err.contains("Reranker tokenizer not found"),
		"error should name the missing tokenizer, got: {err}"
	);
}

#[test]
fn load_fails_gracefully_on_invalid_onnx_content() {
	// Both files exist so the existence checks pass; ORT must then reject
	// the garbage protobuf with an Err (mapped message), not a panic/abort.
	let tmp = tempdir().unwrap();
	fs::write(tmp.path().join("model.onnx"), b"garbage bytes, not protobuf").unwrap();
	fs::write(tmp.path().join("tokenizer.json"), b"{}").unwrap();
	let err = Reranker::load(tmp.path()).err().expect("garbage onnx must fail");
	assert!(
		err.contains("Failed to load reranker model"),
		"error should come from the ORT load step, got: {err}"
	);
}
