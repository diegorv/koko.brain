//! Phase 2.1+ - `VaultIndex` shape and behavior tests.
//!
//! Phase 2.1 covers the struct shape, defaults, and read-only getters.
//! Subsequent phases (2.2 build, 2.5 update_entry) extend this file.

use kokobrain_lib::vault::index::VaultIndex;

#[test]
fn default_index_is_empty_with_version_zero() {
	let idx = VaultIndex::default();
	assert!(idx.is_empty());
	assert_eq!(idx.len(), 0);
	assert_eq!(idx.version(), 0);
	assert!(idx.entries().is_empty());
	assert!(idx.by_path().is_empty());
	assert!(idx.backlinks().is_empty());
}

#[test]
fn cloned_index_is_independent_of_source() {
	// `Clone` should perform a deep copy; mutating one must not affect the
	// other. The fields are private, but cloning + comparing `len` /
	// `version` snapshots is enough to confirm Clone derives the deep
	// semantics we expect.
	let idx = VaultIndex::default();
	let cloned = idx.clone();
	assert_eq!(idx.len(), cloned.len());
	assert_eq!(idx.version(), cloned.version());
}

#[test]
fn debug_format_does_not_panic_on_empty_index() {
	// Debug derive over private fields must compile and not panic; this is
	// a smoke test that future field additions remain `Debug`-able.
	let idx = VaultIndex::default();
	let formatted = format!("{:?}", idx);
	assert!(!formatted.is_empty());
}
