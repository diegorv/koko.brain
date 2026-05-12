//! LAN peer discovery via mDNS-SD.
//!
//! Two roles:
//! - **Announcer** publishes a `_kokobrain-sync._tcp.local.` service
//!   record carrying the local fingerprint, vault label hash, and
//!   protocol version. Opt-in per vault — default off, only active
//!   while the user enables "Make this vault discoverable".
//! - **Browser** scans for the same service type and emits a
//!   [`DiscoveredPeer`] event for each matching record. Active only
//!   while the pairing dialog is open.
//!
//! Two layers of defence apply to every browsed record:
//! - **RFC 1918 filter**: peers reachable through public IPs are
//!   silently dropped before reaching the UI. Loopback (`127.0.0.0/8`,
//!   `::1`) is rejected too unless `LAN_SYNC_TEST_PORT_OFFSET` is set,
//!   which is the dev-only mode for running two instances on one host.
//! - **TXT record validation**: missing `fp` or wrong `pv` causes the
//!   record to be dropped before emission.

use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

/// Service type advertised on the LAN.
pub const SERVICE_TYPE: &str = "_kokobrain-sync._tcp.local.";

/// Environment variable that, when set to a non-empty value, allows
/// loopback peers (`127.0.0.0/8`, `::1`) to be accepted by the
/// discovery filter. Intended for running two `pnpm tauri dev`
/// instances on a single development host.
pub const TEST_LOOPBACK_ENV: &str = "LAN_SYNC_TEST_PORT_OFFSET";

/// TXT record key for the peer's fingerprint (hex grouped or compact).
pub const TXT_KEY_FINGERPRINT: &str = "fp";
/// TXT record key for the protocol version range.
pub const TXT_KEY_PROTOCOL_VERSION: &str = "pv";
/// TXT record key for the 8-byte vault label hash (hex, lowercase).
pub const TXT_KEY_VAULT_LABEL: &str = "vl";

/// A peer that has been discovered AND passed the RFC1918 + TXT
/// validation gates. UI subscribes to these via the
/// `lan-sync:peer-discovered` event.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DiscoveredPeer {
	/// Peer's Ed25519 fingerprint as advertised (`XXXX-XXXX-XXXX-XXXX`
	/// uppercase, or compact 16-hex form — caller normalises).
	pub fingerprint_hex: String,
	/// Best LAN address to reach the peer. The first acceptable
	/// address is picked; further addresses can be tried by the
	/// transport layer on connect failure.
	pub addr: IpAddr,
	/// TCP port advertised in the SRV record.
	pub port: u16,
	/// 8-character vault label hash, useful to distinguish two vaults
	/// run on the same machine during pairing.
	pub vault_label_hash: String,
	/// Protocol version range advertised, e.g. `(1, 1)`.
	pub protocol_version_range: (u8, u8),
}

/// Errors surfaced when parsing TXT records or filtering addresses.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DiscoveryError {
	/// TXT record is missing a required key.
	MissingTxtKey(&'static str),
	/// TXT record key has the wrong shape (e.g. fingerprint > 32 hex
	/// chars, version not parseable).
	BadTxtValue { key: &'static str, value: String },
	/// No address advertised passed the RFC 1918 filter.
	NoPrivateAddress,
}

impl core::fmt::Display for DiscoveryError {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		match self {
			Self::MissingTxtKey(key) => write!(f, "TXT record missing required key {key:?}"),
			Self::BadTxtValue { key, value } => {
				write!(f, "TXT record {key:?} has invalid value {value:?}")
			}
			Self::NoPrivateAddress => write!(f, "no RFC 1918 address advertised"),
		}
	}
}

impl std::error::Error for DiscoveryError {}

// ============================================================================
// Pure address classification
// ============================================================================

/// Returns `true` if the IPv4 address falls in an RFC 1918 range or
/// the link-local `169.254.0.0/16` block (auto-config on LAN with no
/// DHCP). Public IPs return `false`.
pub fn is_private_ipv4(addr: Ipv4Addr) -> bool {
	let o = addr.octets();
	// 10.0.0.0/8
	if o[0] == 10 {
		return true;
	}
	// 172.16.0.0/12
	if o[0] == 172 && (16..=31).contains(&o[1]) {
		return true;
	}
	// 192.168.0.0/16
	if o[0] == 192 && o[1] == 168 {
		return true;
	}
	// 169.254.0.0/16 link-local
	if o[0] == 169 && o[1] == 254 {
		return true;
	}
	false
}

/// Returns `true` if the IPv6 address is in the link-local range
/// (`fe80::/10`) or the Unique Local Address range (`fc00::/7`).
pub fn is_private_ipv6(addr: Ipv6Addr) -> bool {
	let segments = addr.segments();
	let first = segments[0];
	// fe80::/10 → first 10 bits are 0xfe80 (i.e. 1111_1110_10xxxxxx_xxxxxxxx)
	if (first & 0xffc0) == 0xfe80 {
		return true;
	}
	// fc00::/7 → first 7 bits are 0xfc00 (i.e. 1111_110x_xxxxxxxx_xxxxxxxx)
	if (first & 0xfe00) == 0xfc00 {
		return true;
	}
	false
}

/// Returns `true` if `addr` is a private LAN address. Loopback is
/// accepted only when [`TEST_LOOPBACK_ENV`] is set (for two-instance
/// dev runs on a single host).
pub fn is_acceptable_lan_address(addr: IpAddr) -> bool {
	if addr.is_loopback() {
		return std::env::var(TEST_LOOPBACK_ENV)
			.map(|v| !v.is_empty())
			.unwrap_or(false);
	}
	match addr {
		IpAddr::V4(v4) => is_private_ipv4(v4),
		IpAddr::V6(v6) => is_private_ipv6(v6),
	}
}

// ============================================================================
// TXT record parsing
// ============================================================================

/// Parses the protocol-version TXT field. Accepts either a single
/// value (`"1"`) or a range (`"1-1"` / `"1-3"`).
pub fn parse_protocol_version(value: &str) -> Result<(u8, u8), DiscoveryError> {
	let trimmed = value.trim();
	if trimmed.is_empty() {
		return Err(DiscoveryError::BadTxtValue {
			key: TXT_KEY_PROTOCOL_VERSION,
			value: value.to_string(),
		});
	}
	if let Some((lo, hi)) = trimmed.split_once('-') {
		let lo: u8 = lo.parse().map_err(|_| DiscoveryError::BadTxtValue {
			key: TXT_KEY_PROTOCOL_VERSION,
			value: value.to_string(),
		})?;
		let hi: u8 = hi.parse().map_err(|_| DiscoveryError::BadTxtValue {
			key: TXT_KEY_PROTOCOL_VERSION,
			value: value.to_string(),
		})?;
		if lo > hi {
			return Err(DiscoveryError::BadTxtValue {
				key: TXT_KEY_PROTOCOL_VERSION,
				value: value.to_string(),
			});
		}
		Ok((lo, hi))
	} else {
		let v: u8 = trimmed.parse().map_err(|_| DiscoveryError::BadTxtValue {
			key: TXT_KEY_PROTOCOL_VERSION,
			value: value.to_string(),
		})?;
		Ok((v, v))
	}
}

/// Validates a fingerprint advertised in TXT. Accepts the canonical
/// `XXXX-XXXX-XXXX-XXXX` form (19 chars) or its compact 16-hex form.
/// Other shapes are rejected.
pub fn validate_advertised_fingerprint(value: &str) -> Result<String, DiscoveryError> {
	let cleaned: String = value
		.chars()
		.filter(|c| !c.is_whitespace() && *c != '-')
		.collect();
	if cleaned.len() != 16 {
		return Err(DiscoveryError::BadTxtValue {
			key: TXT_KEY_FINGERPRINT,
			value: value.to_string(),
		});
	}
	if !cleaned.chars().all(|c| c.is_ascii_hexdigit()) {
		return Err(DiscoveryError::BadTxtValue {
			key: TXT_KEY_FINGERPRINT,
			value: value.to_string(),
		});
	}
	Ok(cleaned.to_uppercase())
}

/// Validates an 8-char vault label hash (hex). Returns the normalised
/// lowercase form.
pub fn validate_vault_label(value: &str) -> Result<String, DiscoveryError> {
	let trimmed = value.trim();
	if trimmed.len() != 8 || !trimmed.chars().all(|c| c.is_ascii_hexdigit()) {
		return Err(DiscoveryError::BadTxtValue {
			key: TXT_KEY_VAULT_LABEL,
			value: value.to_string(),
		});
	}
	Ok(trimmed.to_lowercase())
}

/// Composes a TXT-key lookup into a fully validated [`DiscoveredPeer`].
/// `addresses` is the list of IPs the service advertised; the first
/// one that passes [`is_acceptable_lan_address`] wins. `port` comes
/// from the SRV record.
///
/// `txt_lookup` is a `Fn` so the caller can adapt whatever
/// representation `mdns-sd` returns (slice of `TxtProperty`, HashMap,
/// etc.) without binding this helper to any particular shape.
pub fn build_discovered_peer<F>(
	addresses: &[IpAddr],
	port: u16,
	txt_lookup: F,
) -> Result<DiscoveredPeer, DiscoveryError>
where
	F: Fn(&str) -> Option<String>,
{
	let fingerprint_hex = validate_advertised_fingerprint(
		&txt_lookup(TXT_KEY_FINGERPRINT)
			.ok_or(DiscoveryError::MissingTxtKey(TXT_KEY_FINGERPRINT))?,
	)?;
	let protocol_version_range = parse_protocol_version(
		&txt_lookup(TXT_KEY_PROTOCOL_VERSION)
			.ok_or(DiscoveryError::MissingTxtKey(TXT_KEY_PROTOCOL_VERSION))?,
	)?;
	let vault_label_hash = validate_vault_label(
		&txt_lookup(TXT_KEY_VAULT_LABEL)
			.ok_or(DiscoveryError::MissingTxtKey(TXT_KEY_VAULT_LABEL))?,
	)?;
	let addr = addresses
		.iter()
		.copied()
		.find(|&a| is_acceptable_lan_address(a))
		.ok_or(DiscoveryError::NoPrivateAddress)?;
	Ok(DiscoveredPeer {
		fingerprint_hex,
		addr,
		port,
		vault_label_hash,
		protocol_version_range,
	})
}

// ============================================================================
// mDNS announce + browse handles (network ops; integration tested in
// the real environment, not the build sandbox).
// ============================================================================

/// Configuration for announcing the local vault on the LAN.
#[derive(Debug, Clone)]
pub struct AnnounceConfig {
	pub instance_name: String,
	pub hostname: String,
	pub port: u16,
	pub fingerprint_hex: String,
	pub vault_label_hash: String,
}

/// Builds the TXT property map that callers hand to
/// `ServiceInfo::new`. Kept here so the validation rules and the
/// announced shape stay in lock-step.
pub fn build_announce_txt(cfg: &AnnounceConfig) -> Vec<(&'static str, String)> {
	use crate::sync::protocol::{MAX_SUPPORTED_VERSION, MIN_SUPPORTED_VERSION};
	let pv = if MIN_SUPPORTED_VERSION == MAX_SUPPORTED_VERSION {
		format!("{}", MAX_SUPPORTED_VERSION)
	} else {
		format!("{}-{}", MIN_SUPPORTED_VERSION, MAX_SUPPORTED_VERSION)
	};
	vec![
		(TXT_KEY_FINGERPRINT, cfg.fingerprint_hex.clone()),
		(TXT_KEY_PROTOCOL_VERSION, pv),
		(TXT_KEY_VAULT_LABEL, cfg.vault_label_hash.clone()),
	]
}

/// Computes the 8-char vault label hash (first 4 bytes of
/// SHA-256(vault_root_path) rendered as lowercase hex). Identifies
/// the *vault* (not the device) so two vaults running on the same
/// machine can be told apart in the TXT record.
pub fn compute_vault_label_hash(vault_path: &std::path::Path) -> String {
	use sha2_v10::{Digest, Sha256};
	let mut hasher = Sha256::new();
	hasher.update(vault_path.to_string_lossy().as_bytes());
	let digest: [u8; 32] = hasher.finalize().into();
	digest[..4]
		.iter()
		.map(|b| format!("{b:02x}"))
		.collect()
}

/// Strips the `XXXX-XXXX-XXXX-XXXX` separators from a fingerprint
/// hex so it can be embedded in an mDNS instance name (which must
/// stay short and dot-free). Returns the lowercase 16-char form.
pub fn fingerprint_hex_compact(fingerprint_hex: &str) -> String {
	fingerprint_hex
		.chars()
		.filter(|c| *c != '-')
		.flat_map(|c| c.to_lowercase())
		.collect()
}

/// Reverse helper of [`build_discovered_peer`] that consumes a fully
/// resolved `mdns_sd::ServiceInfo` instead of taking an arbitrary
/// `txt_lookup` closure. Pulled out so the browser loop in the
/// Tauri command layer reads cleanly.
///
/// Returns `Ok(None)` (not `Err`) when the advertised peer is the
/// *local* device itself - this happens whenever the same daemon
/// announces and browses, and the loopback packets reach the
/// browser. Self-discoveries are filtered by comparing the resolved
/// fingerprint hex against `our_fingerprint_hex`.
pub fn service_info_to_discovered_peer(
	info: &mdns_sd::ServiceInfo,
	our_fingerprint_hex: &str,
) -> Result<Option<DiscoveredPeer>, DiscoveryError> {
	let addresses: Vec<IpAddr> = info.get_addresses().iter().copied().collect();
	let port = info.get_port();
	let peer = build_discovered_peer(&addresses, port, |key| {
		info.get_property_val_str(key).map(|s| s.to_string())
	})?;
	// `validate_advertised_fingerprint` already normalises the
	// returned fingerprint to uppercase compact form. Apply the same
	// transformation to the caller-supplied `our_fingerprint_hex`
	// before comparing so dashes / lowercase do not mask a true
	// self-loopback.
	let ours = fingerprint_hex_compact(our_fingerprint_hex);
	let theirs = fingerprint_hex_compact(&peer.fingerprint_hex);
	if ours.eq_ignore_ascii_case(&theirs) {
		Ok(None)
	} else {
		Ok(Some(peer))
	}
}
