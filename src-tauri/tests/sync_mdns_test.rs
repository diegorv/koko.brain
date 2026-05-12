//! Unit tests for the mDNS-facing helpers in
//! `src-tauri/src/sync/discovery.rs`. The live announce/browse loop
//! (the bit that touches a real UDP multicast socket) is exercised
//! via `pnpm tauri dev` on real hardware; here we cover the pure
//! adapters that turn an `mdns_sd::ServiceInfo` into a
//! `DiscoveredPeer`, the self-loopback filter, and the vault-label
//! hash derivation.

use kokobrain_lib::sync::discovery::{
	compute_vault_label_hash, fingerprint_hex_compact, service_info_to_discovered_peer,
	DiscoveryError, SERVICE_TYPE,
};

fn make_service_info(
	instance: &str,
	fingerprint_hex: &str,
	vault_label: &str,
	port: u16,
	addr: &str,
) -> mdns_sd::ServiceInfo {
	let host = format!("{instance}.local.");
	let props: &[(&str, &str)] = &[
		("fp", fingerprint_hex),
		("pv", "1"),
		("vl", vault_label),
	];
	mdns_sd::ServiceInfo::new(SERVICE_TYPE, instance, &host, addr, port, props)
		.expect("build ServiceInfo for test")
}

#[test]
fn compute_vault_label_hash_is_deterministic_and_8_chars() {
	let p = std::path::Path::new("/some/vault/path");
	let a = compute_vault_label_hash(p);
	let b = compute_vault_label_hash(p);
	assert_eq!(a, b, "label hash must be deterministic");
	assert_eq!(a.len(), 8, "label hash must be 8 hex chars");
	assert!(a.chars().all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase()));
}

#[test]
fn compute_vault_label_hash_differs_for_different_paths() {
	let a = compute_vault_label_hash(std::path::Path::new("/vault/alpha"));
	let b = compute_vault_label_hash(std::path::Path::new("/vault/beta"));
	assert_ne!(a, b);
}

#[test]
fn fingerprint_hex_compact_strips_dashes_and_lowercases() {
	assert_eq!(
		fingerprint_hex_compact("4CD3-F1C9-DBC6-252C"),
		"4cd3f1c9dbc6252c"
	);
	// Already compact + lowercase passes through unchanged.
	assert_eq!(
		fingerprint_hex_compact("4cd3f1c9dbc6252c"),
		"4cd3f1c9dbc6252c"
	);
}

#[test]
fn service_info_to_peer_extracts_valid_announce() {
	// Use a non-loopback RFC1918 address so the filter accepts it.
	let info = make_service_info(
		"abcdefabcdefabcd",
		"AAAA-BBBB-CCCC-DDDD",
		"deadbeef",
		51820,
		"192.168.1.42",
	);
	let peer = service_info_to_discovered_peer(&info, "0000-0000-0000-0000")
		.unwrap()
		.expect("non-self announce should resolve to Some(peer)");
	// `validate_advertised_fingerprint` normalises to compact
	// uppercase form. The caller (Tauri command layer) is free to
	// re-format for display via `fingerprint_display_from_hex`.
	assert_eq!(peer.fingerprint_hex, "AAAABBBBCCCCDDDD");
	assert_eq!(peer.port, 51820);
	assert_eq!(peer.vault_label_hash, "deadbeef");
	assert_eq!(peer.protocol_version_range, (1, 1));
}

#[test]
fn service_info_to_peer_filters_self_loopback() {
	let info = make_service_info(
		"abcdefabcdefabcd",
		"AAAA-BBBB-CCCC-DDDD",
		"deadbeef",
		51820,
		"192.168.1.42",
	);
	// Same fingerprint -> the helper should return Ok(None) so the
	// caller silently drops the self-discovery instead of emitting a
	// peer-discovered event for itself.
	let outcome = service_info_to_discovered_peer(&info, "AAAA-BBBB-CCCC-DDDD").unwrap();
	assert!(
		outcome.is_none(),
		"self announce must return None, got {outcome:?}"
	);
}

#[test]
fn service_info_to_peer_filters_self_loopback_case_insensitive() {
	// Frontend may send lowercase from one path and uppercase from
	// another; the self-filter must accept either.
	let info = make_service_info(
		"abcdefabcdefabcd",
		"aaaa-bbbb-cccc-dddd",
		"deadbeef",
		51820,
		"192.168.1.42",
	);
	let outcome = service_info_to_discovered_peer(&info, "AAAA-BBBB-CCCC-DDDD").unwrap();
	assert!(outcome.is_none());
}

#[test]
fn service_info_to_peer_rejects_missing_txt_key() {
	// Build a ServiceInfo with an incomplete TXT set (no `vl` field).
	let info = mdns_sd::ServiceInfo::new(
		SERVICE_TYPE,
		"abcdefabcdefabcd",
		"abcdefabcdefabcd.local.",
		"192.168.1.42",
		51820,
		&[("fp", "AAAA-BBBB-CCCC-DDDD"), ("pv", "1")][..],
	)
	.unwrap();
	let err =
		service_info_to_discovered_peer(&info, "0000-0000-0000-0000").unwrap_err();
	matches!(err, DiscoveryError::MissingTxtKey(_));
}
