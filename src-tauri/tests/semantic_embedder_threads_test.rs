//! Tests for `semantic::embedder::embedder_intra_threads` (`src/semantic/embedder.rs`).

use kokobrain_lib::semantic::embedder::embedder_intra_threads;

#[test]
fn caps_many_cores_at_four() {
	assert_eq!(embedder_intra_threads(Some(16)), 4);
}

#[test]
fn keeps_fewer_cores_than_the_cap() {
	assert_eq!(embedder_intra_threads(Some(2)), 2);
}

#[test]
fn falls_back_to_four_when_parallelism_is_unknown() {
	assert_eq!(embedder_intra_threads(None), 4);
}
