//! Stage 5 unit tests: pure helpers in `sync::discovery`.
//!
//! Integration tests that touch the real mDNS UDP socket are NOT
//! included — those require an unsandboxed network setup we cannot
//! rely on in CI. Only the TXT-record contract and a couple of
//! related helpers are unit-tested here.

use std::collections::HashMap;

use kokobrain_lib::sync::discovery::{
	build_txt_record, fingerprint_display_from_hex, parse_txt_record, DEFAULT_PORT, PROTOCOL_VERSION,
	SERVICE_TYPE, TXT_KEY_FP_HEX, TXT_KEY_PROTO,
};

// ---------------------------------------------------------------------------
// Constants — pin so the frontend / firewall rules can't drift.
// ---------------------------------------------------------------------------

#[test]
fn service_type_is_stable() {
	assert_eq!(SERVICE_TYPE, "_kokobrain-sync._tcp.local.");
}

#[test]
fn default_port_is_zero() {
	// `0` means "OS-assigned"; the command shim overrides this with a
	// fixed port for MVP.
	assert_eq!(DEFAULT_PORT, 0);
}

#[test]
fn protocol_version_is_one() {
	assert_eq!(PROTOCOL_VERSION, 1);
}

#[test]
fn txt_key_constants_are_stable() {
	assert_eq!(TXT_KEY_FP_HEX, "fp_hex");
	assert_eq!(TXT_KEY_PROTO, "proto");
}

// ---------------------------------------------------------------------------
// build_txt_record: the announcer's published shape.
// ---------------------------------------------------------------------------

#[test]
fn build_txt_record_contains_fp_hex_and_proto() {
	let map = build_txt_record("0123456789abcdef");
	assert_eq!(map.get(TXT_KEY_FP_HEX).map(String::as_str), Some("0123456789abcdef"));
	assert_eq!(map.get(TXT_KEY_PROTO).map(String::as_str), Some("1"));
	assert_eq!(map.len(), 2, "no extra keys leaked into TXT");
}

#[test]
fn build_txt_record_preserves_full_fingerprint() {
	// Whatever the caller hands in is stored verbatim — the parsing
	// side is responsible for length / hex-shape validation.
	let map = build_txt_record("DEADBEEFCAFEBABE");
	assert_eq!(map.get(TXT_KEY_FP_HEX).unwrap(), "DEADBEEFCAFEBABE");
}

// ---------------------------------------------------------------------------
// parse_txt_record: tolerate-or-skip semantics.
// ---------------------------------------------------------------------------

#[test]
fn parse_txt_record_returns_fp_and_proto_when_both_present() {
	let mut txt = HashMap::new();
	txt.insert(TXT_KEY_FP_HEX.to_string(), "abcdef0123456789".to_string());
	txt.insert(TXT_KEY_PROTO.to_string(), "1".to_string());
	let parsed = parse_txt_record(&txt).expect("both keys present");
	assert_eq!(parsed.0, "abcdef0123456789");
	assert_eq!(parsed.1, 1);
}

#[test]
fn parse_txt_record_returns_none_when_fp_missing() {
	let mut txt = HashMap::new();
	txt.insert(TXT_KEY_PROTO.to_string(), "1".to_string());
	assert!(parse_txt_record(&txt).is_none());
}

#[test]
fn parse_txt_record_returns_none_when_proto_missing() {
	let mut txt = HashMap::new();
	txt.insert(TXT_KEY_FP_HEX.to_string(), "abcdef0123456789".to_string());
	assert!(parse_txt_record(&txt).is_none());
}

#[test]
fn parse_txt_record_returns_none_when_proto_unparseable() {
	let mut txt = HashMap::new();
	txt.insert(TXT_KEY_FP_HEX.to_string(), "abcdef0123456789".to_string());
	txt.insert(TXT_KEY_PROTO.to_string(), "not-a-number".to_string());
	assert!(parse_txt_record(&txt).is_none());
}

#[test]
fn parse_txt_record_accepts_higher_proto_versions() {
	// A future bump should still parse — the consumer is responsible
	// for deciding whether to talk to the peer.
	let mut txt = HashMap::new();
	txt.insert(TXT_KEY_FP_HEX.to_string(), "abcdef0123456789".to_string());
	txt.insert(TXT_KEY_PROTO.to_string(), "42".to_string());
	let parsed = parse_txt_record(&txt).expect("higher proto is still valid");
	assert_eq!(parsed.1, 42);
}

// ---------------------------------------------------------------------------
// fingerprint_display_from_hex: deterministic 6-word derivation.
// ---------------------------------------------------------------------------

#[test]
fn fingerprint_display_from_hex_returns_six_dash_joined_words() {
	let display = fingerprint_display_from_hex("0123456789abcdef");
	let parts: Vec<&str> = display.split('-').collect();
	assert_eq!(parts.len(), 6, "expected 6 words, got {parts:?}");
	for part in parts {
		assert!(
			part.chars().all(|c| c.is_ascii_alphabetic()),
			"word {part:?} should be ASCII alpha"
		);
	}
}

#[test]
fn fingerprint_display_from_hex_is_deterministic() {
	let a = fingerprint_display_from_hex("0123456789abcdef");
	let b = fingerprint_display_from_hex("0123456789abcdef");
	assert_eq!(a, b);
}

#[test]
fn fingerprint_display_from_hex_changes_with_input() {
	let a = fingerprint_display_from_hex("0123456789abcdef");
	let b = fingerprint_display_from_hex("fedcba9876543210");
	assert_ne!(a, b);
}

#[test]
fn fingerprint_display_from_hex_rejects_malformed_input() {
	// Odd length and non-hex chars must produce an empty string so
	// the UI can fall back to displaying the hex alone.
	assert_eq!(fingerprint_display_from_hex("abc"), "");
	assert_eq!(fingerprint_display_from_hex("0123zz"), "");
}
