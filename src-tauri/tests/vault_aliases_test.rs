//! Edge-case tests for `vault::aliases::canonicalize_key`.
//!
//! The inline tests in `src/vault/aliases.rs` cover every known alias,
//! canonical pass-through, and common unknown keys. This file pins the
//! remaining edge inputs (empty, numeric-only, case variants, padded
//! whitespace) — all must pass through unchanged because the alias map
//! is an exact-match, case-sensitive lookup.

use kokobrain_lib::vault::aliases::canonicalize_key;

#[test]
fn empty_key_passes_through_unchanged() {
	assert_eq!(canonicalize_key(""), "");
}

#[test]
fn numeric_only_keys_pass_through_unchanged() {
	assert_eq!(canonicalize_key("123"), "123");
	assert_eq!(canonicalize_key("0"), "0");
	assert_eq!(canonicalize_key("3.14"), "3.14");
	assert_eq!(canonicalize_key("-1"), "-1");
}

#[test]
fn alias_lookup_is_case_sensitive() {
	// Only the exact lowercase spelling is an alias; any case variant is
	// treated as a user-defined property and passes through.
	assert_eq!(canonicalize_key("Type"), "Type");
	assert_eq!(canonicalize_key("TYPE"), "TYPE");
	assert_eq!(canonicalize_key("Color"), "Color");
	assert_eq!(canonicalize_key("Sidebar Label"), "Sidebar Label");
}

#[test]
fn whitespace_padded_alias_is_not_resolved() {
	assert_eq!(canonicalize_key(" type"), " type");
	assert_eq!(canonicalize_key("type "), "type ");
	assert_eq!(canonicalize_key("\ttype"), "\ttype");
}

#[test]
fn underscore_prefixed_unknown_key_passes_through() {
	assert_eq!(canonicalize_key("_unknown"), "_unknown");
	assert_eq!(canonicalize_key("_123"), "_123");
}

#[test]
fn hash_prefixed_and_symbol_keys_pass_through() {
	assert_eq!(canonicalize_key("#type"), "#type");
	assert_eq!(canonicalize_key("type:"), "type:");
}
