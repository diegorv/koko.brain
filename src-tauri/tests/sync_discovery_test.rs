use kokobrain_lib::sync::discovery::{
	build_announce_txt, build_discovered_peer, is_acceptable_lan_address, is_private_ipv4,
	is_private_ipv6, parse_protocol_version, validate_advertised_fingerprint,
	validate_vault_label, AnnounceConfig, DiscoveryError, SERVICE_TYPE, TEST_LOOPBACK_ENV,
	TXT_KEY_FINGERPRINT, TXT_KEY_PROTOCOL_VERSION, TXT_KEY_VAULT_LABEL,
};
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

// ============================================================================
// Constants
// ============================================================================

#[test]
fn service_type_is_kokobrain_sync_tcp() {
	assert_eq!(SERVICE_TYPE, "_kokobrain-sync._tcp.local.");
}

#[test]
fn txt_keys_are_short() {
	// TXT records have a 255-byte ceiling; short keys leave room for
	// the values.
	assert_eq!(TXT_KEY_FINGERPRINT, "fp");
	assert_eq!(TXT_KEY_PROTOCOL_VERSION, "pv");
	assert_eq!(TXT_KEY_VAULT_LABEL, "vl");
}

// ============================================================================
// is_private_ipv4 / is_private_ipv6
// ============================================================================

#[test]
fn ipv4_10_dot_block_is_private() {
	assert!(is_private_ipv4(Ipv4Addr::new(10, 0, 0, 1)));
	assert!(is_private_ipv4(Ipv4Addr::new(10, 255, 255, 254)));
}

#[test]
fn ipv4_172_16_block_is_private_and_boundary_correct() {
	assert!(is_private_ipv4(Ipv4Addr::new(172, 16, 0, 1)));
	assert!(is_private_ipv4(Ipv4Addr::new(172, 31, 255, 254)));
	// 172.15.x.x and 172.32.x.x are NOT private.
	assert!(!is_private_ipv4(Ipv4Addr::new(172, 15, 0, 1)));
	assert!(!is_private_ipv4(Ipv4Addr::new(172, 32, 0, 1)));
}

#[test]
fn ipv4_192_168_block_is_private() {
	assert!(is_private_ipv4(Ipv4Addr::new(192, 168, 0, 1)));
	assert!(is_private_ipv4(Ipv4Addr::new(192, 168, 255, 254)));
	// 192.169.x.x and 192.167.x.x are NOT private.
	assert!(!is_private_ipv4(Ipv4Addr::new(192, 169, 0, 1)));
	assert!(!is_private_ipv4(Ipv4Addr::new(192, 167, 0, 1)));
}

#[test]
fn ipv4_link_local_169_254_is_private() {
	assert!(is_private_ipv4(Ipv4Addr::new(169, 254, 1, 1)));
}

#[test]
fn ipv4_public_is_not_private() {
	assert!(!is_private_ipv4(Ipv4Addr::new(8, 8, 8, 8)));
	assert!(!is_private_ipv4(Ipv4Addr::new(1, 1, 1, 1)));
	assert!(!is_private_ipv4(Ipv4Addr::new(140, 82, 121, 4)));
}

#[test]
fn ipv6_link_local_fe80_is_private() {
	let addr: Ipv6Addr = "fe80::1".parse().unwrap();
	assert!(is_private_ipv6(addr));
	let addr2: Ipv6Addr = "febf:ffff::1".parse().unwrap();
	assert!(is_private_ipv6(addr2));
}

#[test]
fn ipv6_ula_fc00_is_private() {
	let addr: Ipv6Addr = "fc00::1".parse().unwrap();
	assert!(is_private_ipv6(addr));
	let addr2: Ipv6Addr = "fd12:3456:789a::1".parse().unwrap();
	assert!(is_private_ipv6(addr2));
}

#[test]
fn ipv6_public_is_not_private() {
	let addr: Ipv6Addr = "2606:4700:4700::1111".parse().unwrap(); // Cloudflare
	assert!(!is_private_ipv6(addr));
	let addr2: Ipv6Addr = "2001:4860:4860::8888".parse().unwrap(); // Google DNS
	assert!(!is_private_ipv6(addr2));
}

// ============================================================================
// is_acceptable_lan_address (composition + loopback rule)
// ============================================================================

#[test]
fn loopback_is_rejected_by_default() {
	// We use a serial guard because this test pokes a process-wide env
	// var (cargo test runs tests in parallel by default).
	let _guard = ENV_LOCK.lock().unwrap();
	std::env::remove_var(TEST_LOOPBACK_ENV);
	assert!(!is_acceptable_lan_address(IpAddr::V4(Ipv4Addr::LOCALHOST)));
	assert!(!is_acceptable_lan_address(IpAddr::V6(Ipv6Addr::LOCALHOST)));
}

#[test]
fn loopback_is_accepted_when_env_set() {
	let _guard = ENV_LOCK.lock().unwrap();
	std::env::set_var(TEST_LOOPBACK_ENV, "1000");
	assert!(is_acceptable_lan_address(IpAddr::V4(Ipv4Addr::LOCALHOST)));
	assert!(is_acceptable_lan_address(IpAddr::V6(Ipv6Addr::LOCALHOST)));
	std::env::remove_var(TEST_LOOPBACK_ENV);
}

#[test]
fn loopback_empty_env_does_not_count() {
	let _guard = ENV_LOCK.lock().unwrap();
	std::env::set_var(TEST_LOOPBACK_ENV, "");
	assert!(!is_acceptable_lan_address(IpAddr::V4(Ipv4Addr::LOCALHOST)));
	std::env::remove_var(TEST_LOOPBACK_ENV);
}

#[test]
fn private_ipv4_is_accepted() {
	let _guard = ENV_LOCK.lock().unwrap();
	std::env::remove_var(TEST_LOOPBACK_ENV);
	assert!(is_acceptable_lan_address(IpAddr::V4(Ipv4Addr::new(192, 168, 1, 4))));
	assert!(is_acceptable_lan_address(IpAddr::V4(Ipv4Addr::new(10, 0, 0, 5))));
}

#[test]
fn public_ipv4_is_rejected() {
	let _guard = ENV_LOCK.lock().unwrap();
	std::env::remove_var(TEST_LOOPBACK_ENV);
	assert!(!is_acceptable_lan_address(IpAddr::V4(Ipv4Addr::new(8, 8, 8, 8))));
}

// Tests that touch process-wide env vars must serialise to avoid races
// when `cargo test` runs them in parallel threads of the same binary.
static ENV_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

// ============================================================================
// parse_protocol_version
// ============================================================================

#[test]
fn parse_pv_accepts_single_value() {
	assert_eq!(parse_protocol_version("1").unwrap(), (1, 1));
	assert_eq!(parse_protocol_version("5").unwrap(), (5, 5));
}

#[test]
fn parse_pv_accepts_range() {
	assert_eq!(parse_protocol_version("1-3").unwrap(), (1, 3));
}

#[test]
fn parse_pv_rejects_inverted_range() {
	assert!(parse_protocol_version("3-1").is_err());
}

#[test]
fn parse_pv_rejects_garbage() {
	assert!(parse_protocol_version("").is_err());
	assert!(parse_protocol_version("foo").is_err());
	assert!(parse_protocol_version("1-foo").is_err());
}

// ============================================================================
// validate_advertised_fingerprint
// ============================================================================

#[test]
fn validate_fp_accepts_grouped_form() {
	let fp = validate_advertised_fingerprint("a1b2-c3d4-e5f6-0708").unwrap();
	assert_eq!(fp, "A1B2C3D4E5F60708");
}

#[test]
fn validate_fp_accepts_compact_form() {
	let fp = validate_advertised_fingerprint("a1b2c3d4e5f60708").unwrap();
	assert_eq!(fp, "A1B2C3D4E5F60708");
}

#[test]
fn validate_fp_rejects_wrong_length() {
	assert!(validate_advertised_fingerprint("a1b2c3d4").is_err());
	assert!(validate_advertised_fingerprint("a1b2c3d4e5f60708ff").is_err());
}

#[test]
fn validate_fp_rejects_non_hex() {
	assert!(validate_advertised_fingerprint("g1b2-c3d4-e5f6-0708").is_err());
	assert!(validate_advertised_fingerprint("xxxx-xxxx-xxxx-xxxx").is_err());
}

// ============================================================================
// validate_vault_label
// ============================================================================

#[test]
fn validate_vl_accepts_8_hex_chars() {
	assert_eq!(validate_vault_label("a1b2c3d4").unwrap(), "a1b2c3d4");
	assert_eq!(validate_vault_label("AABBCCDD").unwrap(), "aabbccdd");
}

#[test]
fn validate_vl_rejects_wrong_length() {
	assert!(validate_vault_label("a1b2").is_err());
	assert!(validate_vault_label("a1b2c3d4e").is_err());
}

#[test]
fn validate_vl_rejects_non_hex() {
	assert!(validate_vault_label("gggggggg").is_err());
}

// ============================================================================
// build_discovered_peer (composes the gates)
// ============================================================================

fn lookup<'a>(items: &'a [(&'a str, &'a str)]) -> impl Fn(&str) -> Option<String> + 'a {
	move |key| {
		items
			.iter()
			.find(|(k, _)| *k == key)
			.map(|(_, v)| v.to_string())
	}
}

#[test]
fn build_peer_happy_path() {
	let _guard = ENV_LOCK.lock().unwrap();
	std::env::remove_var(TEST_LOOPBACK_ENV);
	let addrs = vec![IpAddr::V4(Ipv4Addr::new(192, 168, 1, 4))];
	let txt = [
		(TXT_KEY_FINGERPRINT, "a1b2-c3d4-e5f6-0708"),
		(TXT_KEY_PROTOCOL_VERSION, "1"),
		(TXT_KEY_VAULT_LABEL, "deadbeef"),
	];
	let peer = build_discovered_peer(&addrs, 31337, lookup(&txt)).unwrap();
	assert_eq!(peer.fingerprint_hex, "A1B2C3D4E5F60708");
	assert_eq!(peer.addr, IpAddr::V4(Ipv4Addr::new(192, 168, 1, 4)));
	assert_eq!(peer.port, 31337);
	assert_eq!(peer.vault_label_hash, "deadbeef");
	assert_eq!(peer.protocol_version_range, (1, 1));
}

#[test]
fn build_peer_rejects_public_only_addresses() {
	let _guard = ENV_LOCK.lock().unwrap();
	std::env::remove_var(TEST_LOOPBACK_ENV);
	let addrs = vec![IpAddr::V4(Ipv4Addr::new(8, 8, 8, 8))];
	let txt = [
		(TXT_KEY_FINGERPRINT, "a1b2-c3d4-e5f6-0708"),
		(TXT_KEY_PROTOCOL_VERSION, "1"),
		(TXT_KEY_VAULT_LABEL, "deadbeef"),
	];
	let err = build_discovered_peer(&addrs, 31337, lookup(&txt)).unwrap_err();
	assert_eq!(err, DiscoveryError::NoPrivateAddress);
}

#[test]
fn build_peer_picks_first_private_address() {
	let _guard = ENV_LOCK.lock().unwrap();
	std::env::remove_var(TEST_LOOPBACK_ENV);
	let addrs = vec![
		IpAddr::V4(Ipv4Addr::new(8, 8, 8, 8)),         // public, skipped
		IpAddr::V4(Ipv4Addr::new(192, 168, 1, 4)),    // private, chosen
		IpAddr::V4(Ipv4Addr::new(10, 0, 0, 5)),       // private, ignored
	];
	let txt = [
		(TXT_KEY_FINGERPRINT, "a1b2-c3d4-e5f6-0708"),
		(TXT_KEY_PROTOCOL_VERSION, "1"),
		(TXT_KEY_VAULT_LABEL, "deadbeef"),
	];
	let peer = build_discovered_peer(&addrs, 31337, lookup(&txt)).unwrap();
	assert_eq!(peer.addr, IpAddr::V4(Ipv4Addr::new(192, 168, 1, 4)));
}

#[test]
fn build_peer_missing_fingerprint() {
	let addrs = vec![IpAddr::V4(Ipv4Addr::new(192, 168, 1, 4))];
	let txt = [
		(TXT_KEY_PROTOCOL_VERSION, "1"),
		(TXT_KEY_VAULT_LABEL, "deadbeef"),
	];
	let err = build_discovered_peer(&addrs, 31337, lookup(&txt)).unwrap_err();
	assert_eq!(err, DiscoveryError::MissingTxtKey(TXT_KEY_FINGERPRINT));
}

#[test]
fn build_peer_missing_protocol_version() {
	let addrs = vec![IpAddr::V4(Ipv4Addr::new(192, 168, 1, 4))];
	let txt = [
		(TXT_KEY_FINGERPRINT, "a1b2-c3d4-e5f6-0708"),
		(TXT_KEY_VAULT_LABEL, "deadbeef"),
	];
	let err = build_discovered_peer(&addrs, 31337, lookup(&txt)).unwrap_err();
	assert_eq!(err, DiscoveryError::MissingTxtKey(TXT_KEY_PROTOCOL_VERSION));
}

#[test]
fn build_peer_missing_vault_label() {
	let addrs = vec![IpAddr::V4(Ipv4Addr::new(192, 168, 1, 4))];
	let txt = [
		(TXT_KEY_FINGERPRINT, "a1b2-c3d4-e5f6-0708"),
		(TXT_KEY_PROTOCOL_VERSION, "1"),
	];
	let err = build_discovered_peer(&addrs, 31337, lookup(&txt)).unwrap_err();
	assert_eq!(err, DiscoveryError::MissingTxtKey(TXT_KEY_VAULT_LABEL));
}

#[test]
fn build_peer_bad_fingerprint_shape() {
	let addrs = vec![IpAddr::V4(Ipv4Addr::new(192, 168, 1, 4))];
	let txt = [
		(TXT_KEY_FINGERPRINT, "tooshort"),
		(TXT_KEY_PROTOCOL_VERSION, "1"),
		(TXT_KEY_VAULT_LABEL, "deadbeef"),
	];
	let err = build_discovered_peer(&addrs, 31337, lookup(&txt)).unwrap_err();
	matches!(err, DiscoveryError::BadTxtValue { .. });
}

// ============================================================================
// build_announce_txt
// ============================================================================

#[test]
fn announce_txt_contains_required_keys() {
	let cfg = AnnounceConfig {
		instance_name: "test".to_string(),
		hostname: "host.local.".to_string(),
		port: 31337,
		fingerprint_hex: "A1B2C3D4E5F60708".to_string(),
		vault_label_hash: "deadbeef".to_string(),
	};
	let txt = build_announce_txt(&cfg);
	let keys: Vec<&str> = txt.iter().map(|(k, _)| *k).collect();
	assert!(keys.contains(&TXT_KEY_FINGERPRINT));
	assert!(keys.contains(&TXT_KEY_PROTOCOL_VERSION));
	assert!(keys.contains(&TXT_KEY_VAULT_LABEL));
}

#[test]
fn announce_txt_round_trips_through_build_discovered_peer() {
	// Important: whatever we advertise via build_announce_txt must
	// parse back through build_discovered_peer without surprises.
	let _guard = ENV_LOCK.lock().unwrap();
	std::env::remove_var(TEST_LOOPBACK_ENV);
	let cfg = AnnounceConfig {
		instance_name: "test".to_string(),
		hostname: "host.local.".to_string(),
		port: 31337,
		fingerprint_hex: "A1B2C3D4E5F60708".to_string(),
		vault_label_hash: "deadbeef".to_string(),
	};
	let txt = build_announce_txt(&cfg);
	let addrs = vec![IpAddr::V4(Ipv4Addr::new(192, 168, 1, 4))];
	let lookup_fn = |key: &str| {
		txt.iter()
			.find(|(k, _)| *k == key)
			.map(|(_, v)| v.clone())
	};
	let peer = build_discovered_peer(&addrs, cfg.port, lookup_fn).unwrap();
	assert_eq!(peer.fingerprint_hex, "A1B2C3D4E5F60708");
	assert_eq!(peer.vault_label_hash, "deadbeef");
	assert_eq!(peer.port, 31337);
}
