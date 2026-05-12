//! LAN peer discovery via mDNS-SD (`mdns_sd` crate, 0.13).
//!
//! Two roles:
//! - **Announcer** publishes a `_kokobrain-sync._tcp.local.` service
//!   record carrying the local Ed25519 fingerprint. Opt-in per
//!   vault — default off, only active while the user enables
//!   "Make this vault discoverable" in the LAN sync panel.
//! - **Browser** scans for the same service type and invokes a
//!   user-supplied callback for each fresh discovery, skipping the
//!   local fingerprint (so the daemon does not see itself) and
//!   skipping non-IPv4 / loopback peers.
//!
//! Both halves wrap a single `mdns_sd::ServiceDaemon`. The browser
//! runs the event consumer on a dedicated `std::thread` so it does
//! not require the Tokio runtime; callbacks fire on that thread.
//!
//! Pure helpers (`build_txt_record`, `parse_txt_record`) live at
//! module scope so unit tests can exercise the TXT contract without
//! a real mDNS socket.

use std::collections::HashMap;
use std::net::IpAddr;
use std::thread;

use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};

use crate::sync::events::PeerDiscoveredPayload;
use crate::sync::wordlist::six_words_from_bytes;
use crate::utils::logger::debug_log;

/// Log tag for all `sync::discovery` diagnostic lines. Captured here so
/// `debug_log` callers cannot drift on the tag string.
const LOG_TAG: &str = "sync::discovery";

/// mDNS service type advertised by every Kokobrain sync instance.
///
/// Service-type strings must end with a trailing dot per RFC 6763.
pub const SERVICE_TYPE: &str = "_kokobrain-sync._tcp.local.";

/// Default TCP port the announcer publishes. `0` means "OS-assigned";
/// MVP callers (`lan_sync_set_discoverable`) override this with a
/// fixed port so peers can connect deterministically.
pub const DEFAULT_PORT: u16 = 0;

/// TXT record key carrying the full fingerprint hex (16 lowercase
/// hex chars). Browsed peers without this key are dropped.
pub const TXT_KEY_FP_HEX: &str = "fp_hex";

/// TXT record key carrying the protocol version number. Currently
/// always `1`; mismatched values are ignored at parse time but kept
/// for future negotiation.
pub const TXT_KEY_PROTO: &str = "proto";

/// Current protocol version advertised in the TXT record.
pub const PROTOCOL_VERSION: u32 = 1;

// ============================================================================
// Errors
// ============================================================================

/// Errors surfaced by discovery startup / shutdown.
#[derive(Debug)]
pub enum DiscoveryError {
	/// Underlying `mdns_sd` daemon error.
	Mdns(mdns_sd::Error),
	/// Could not determine a non-loopback local IPv4 address to
	/// advertise.
	NoLocalIp(local_ip_address::Error),
	/// Generic I/O error (e.g. spawning the browser thread).
	Io(std::io::Error),
}

impl std::fmt::Display for DiscoveryError {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		match self {
			Self::Mdns(e) => write!(f, "mdns: {e}"),
			Self::NoLocalIp(e) => write!(f, "no local IP: {e}"),
			Self::Io(e) => write!(f, "io: {e}"),
		}
	}
}

impl std::error::Error for DiscoveryError {
	fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
		match self {
			Self::Mdns(e) => Some(e),
			Self::NoLocalIp(e) => Some(e),
			Self::Io(e) => Some(e),
		}
	}
}

impl From<mdns_sd::Error> for DiscoveryError {
	fn from(e: mdns_sd::Error) -> Self {
		Self::Mdns(e)
	}
}

impl From<local_ip_address::Error> for DiscoveryError {
	fn from(e: local_ip_address::Error) -> Self {
		Self::NoLocalIp(e)
	}
}

impl From<std::io::Error> for DiscoveryError {
	fn from(e: std::io::Error) -> Self {
		Self::Io(e)
	}
}

// ============================================================================
// Pure TXT helpers (unit-tested in `tests/sync_discovery_test.rs`).
// ============================================================================

/// Builds the TXT record map for the announcer. Two keys:
/// - `fp_hex` -> the caller-supplied fingerprint hex (16 lowercase
///   chars).
/// - `proto` -> [`PROTOCOL_VERSION`] as a decimal string.
///
/// Pulled out as a free function so the unit test can pin the shape
/// without spinning up the daemon.
pub fn build_txt_record(fingerprint_hex: &str) -> HashMap<String, String> {
	let mut map = HashMap::new();
	map.insert(TXT_KEY_FP_HEX.to_string(), fingerprint_hex.to_string());
	map.insert(TXT_KEY_PROTO.to_string(), PROTOCOL_VERSION.to_string());
	map
}

/// Parses a TXT record map into `(fingerprint_hex, proto_version)`.
///
/// Returns `None` when either required key is missing or the `proto`
/// value does not parse as `u32`. Browsed records that fail this
/// parse are silently dropped by the browser loop.
pub fn parse_txt_record(txt: &HashMap<String, String>) -> Option<(String, u32)> {
	let fp = txt.get(TXT_KEY_FP_HEX)?.clone();
	let proto = txt.get(TXT_KEY_PROTO)?.parse::<u32>().ok()?;
	Some((fp, proto))
}

/// Derives the six-word display form from a fingerprint hex string.
///
/// The fingerprint is 16 lowercase hex chars (8 bytes). The wordlist
/// helper [`six_words_from_bytes`] pads short slices with zero, so
/// passing only the 8-byte prefix is safe and deterministic; both
/// peers compute the same words for the same `fingerprint_hex`.
///
/// Returns an empty string when the hex is malformed (odd length or
/// non-hex chars) — the UI treats that as "show hex only".
pub fn fingerprint_display_from_hex(fingerprint_hex: &str) -> String {
	if fingerprint_hex.len() % 2 != 0 {
		return String::new();
	}
	let mut bytes = Vec::with_capacity(fingerprint_hex.len() / 2);
	let chars: Vec<char> = fingerprint_hex.chars().collect();
	for pair in chars.chunks(2) {
		let hi = match pair[0].to_digit(16) {
			Some(v) => v as u8,
			None => return String::new(),
		};
		let lo = match pair[1].to_digit(16) {
			Some(v) => v as u8,
			None => return String::new(),
		};
		bytes.push((hi << 4) | lo);
	}
	six_words_from_bytes(&bytes).join("-")
}

// ============================================================================
// Announcer
// ============================================================================

/// Background mDNS announcer for the local vault.
///
/// Owns a `ServiceDaemon` registration; on [`Self::stop`] the
/// service is unregistered and the daemon is shut down. The
/// background announce loop runs inside `mdns_sd` itself.
pub struct Announcer {
	/// Daemon handle. Kept alive for the lifetime of the announcer.
	daemon: ServiceDaemon,
	/// Service `fullname` (`<instance>.<service-type>`) returned by
	/// `ServiceInfo::get_fullname`. Needed for `daemon.unregister`.
	fullname: String,
}

impl Announcer {
	/// Starts a fresh mDNS announce for `fingerprint_hex` on `port`.
	///
	/// Instance name is `kokobrain-<first-8-hex-of-fingerprint>` so
	/// two vaults on the same LAN can be distinguished at a glance.
	/// The host's addresses are populated automatically by the mDNS
	/// daemon via [`ServiceInfo::enable_addr_auto`], which iterates
	/// every local non-loopback interface (IPv4 + IPv6). This replaces
	/// the earlier single-interface lookup via
	/// `local_ip_address::local_ip()` which on multi-homed macOS hosts
	/// could pick a virtual interface (Docker bridge, Tailscale
	/// `utun*`, AWDL `awdl0`) and announce on a network the peer
	/// could not reach. The TXT record is built via
	/// [`build_txt_record`].
	///
	/// Errors are returned, not panicked, so the Tauri command shim
	/// can map them to a `String` for the frontend. Every step is
	/// instrumented via `utils::logger::debug_log` so silent
	/// registration failures become visible in the session log when
	/// the debug toggle is on.
	pub fn start(fingerprint_hex: &str, port: u16) -> Result<Self, DiscoveryError> {
		let instance_name = format!(
			"kokobrain-{}",
			&fingerprint_hex[..fingerprint_hex.len().min(8)]
		);
		debug_log(
			LOG_TAG,
			format!("Announcer::start fingerprint={fingerprint_hex} instance={instance_name} port={port}"),
		);
		let daemon = match ServiceDaemon::new() {
			Ok(d) => d,
			Err(e) => {
				debug_log(LOG_TAG, format!("Announcer ServiceDaemon::new failed: {e}"));
				return Err(e.into());
			}
		};
		let hostname = format!("{instance_name}.local.");
		let txt = build_txt_record(fingerprint_hex);
		let info = match ServiceInfo::new(
			SERVICE_TYPE,
			&instance_name,
			&hostname,
			(),
			port,
			txt,
		) {
			Ok(i) => i.enable_addr_auto(),
			Err(e) => {
				debug_log(LOG_TAG, format!("Announcer ServiceInfo::new failed: {e}"));
				return Err(e.into());
			}
		};
		let fullname = info.get_fullname().to_string();
		if let Err(e) = daemon.register(info) {
			debug_log(LOG_TAG, format!("Announcer daemon.register failed: {e}"));
			return Err(e.into());
		}
		debug_log(
			LOG_TAG,
			format!("Announcer registered fullname={fullname} (auto-addr mode)"),
		);
		Ok(Self { daemon, fullname })
	}

	/// Unregisters the service and shuts down the daemon.
	///
	/// Both `unregister` and `shutdown` return a `Receiver` for an
	/// async confirmation we do not wait on; the daemon stops
	/// emitting packets as soon as the call returns.
	pub fn stop(self) -> Result<(), DiscoveryError> {
		debug_log(LOG_TAG, format!("Announcer::stop fullname={}", self.fullname));
		let _ = self.daemon.unregister(&self.fullname)?;
		let _ = self.daemon.shutdown()?;
		Ok(())
	}
}

// ============================================================================
// Browser
// ============================================================================

/// Background mDNS browser for the local vault.
///
/// Spawns a dedicated `std::thread` that pulls events from the
/// daemon's channel and invokes the user-supplied `on_peer`
/// callback for each fresh discovery. Stopping the browser
/// triggers a daemon `shutdown`, which closes the channel and lets
/// the thread exit cleanly.
pub struct Browser {
	/// Daemon handle. Kept alive so the browse subscription stays
	/// open.
	daemon: ServiceDaemon,
	/// Join handle of the consumer thread.
	handle: Option<thread::JoinHandle<()>>,
}

impl Browser {
	/// Starts a browse for [`SERVICE_TYPE`].
	///
	/// `my_fingerprint_hex` is compared against each resolved
	/// peer's TXT `fp_hex` (case-insensitive) to filter self-
	/// loopback announcements that arrive when the same daemon
	/// both announces and browses. `on_peer` is invoked exactly
	/// once per fresh resolution that survives all filters.
	///
	/// Filters applied (in order):
	/// - TXT `fp_hex` + `proto` must parse via [`parse_txt_record`].
	/// - `fp_hex` must differ (case-insensitive) from
	///   `my_fingerprint_hex`.
	/// - First IPv4 address (`IpAddr::V4`) that is not loopback is
	///   used; if none, the record is dropped.
	pub fn start<F>(my_fingerprint_hex: String, on_peer: F) -> Result<Self, DiscoveryError>
	where
		F: Fn(PeerDiscoveredPayload) + Send + 'static,
	{
		debug_log(
			LOG_TAG,
			format!("Browser::start my_fingerprint={my_fingerprint_hex}"),
		);
		let daemon = match ServiceDaemon::new() {
			Ok(d) => d,
			Err(e) => {
				debug_log(LOG_TAG, format!("Browser ServiceDaemon::new failed: {e}"));
				return Err(e.into());
			}
		};
		let receiver = match daemon.browse(SERVICE_TYPE) {
			Ok(r) => r,
			Err(e) => {
				debug_log(LOG_TAG, format!("Browser daemon.browse failed: {e}"));
				return Err(e.into());
			}
		};
		let my_fp_lower = my_fingerprint_hex.to_lowercase();
		let handle = thread::Builder::new()
			.name("kokobrain-mdns-browser".into())
			.spawn(move || {
				debug_log(LOG_TAG, "Browser consumer thread up");
				for event in receiver.iter() {
					match event {
						ServiceEvent::SearchStarted(ty) => {
							debug_log(LOG_TAG, format!("event=SearchStarted type={ty}"));
						}
						ServiceEvent::ServiceFound(ty, fullname) => {
							debug_log(
								LOG_TAG,
								format!("event=ServiceFound type={ty} fullname={fullname}"),
							);
						}
						ServiceEvent::ServiceResolved(info) => {
							let fullname = info.get_fullname().to_string();
							let addrs: Vec<String> =
								info.get_addresses().iter().map(|a| a.to_string()).collect();
							debug_log(
								LOG_TAG,
								format!(
									"event=ServiceResolved fullname={fullname} addrs={addrs:?} port={}",
									info.get_port()
								),
							);
							match service_info_to_payload(&info, &my_fp_lower) {
								Some(payload) => {
									debug_log(
										LOG_TAG,
										format!(
											"accepted peer fp={} addr={} port={}",
											payload.fingerprint_hex, payload.addr, payload.port
										),
									);
									on_peer(payload);
								}
								None => {
									// Specific reason already logged by
									// service_info_to_payload below.
								}
							}
						}
						ServiceEvent::ServiceRemoved(ty, fullname) => {
							debug_log(
								LOG_TAG,
								format!("event=ServiceRemoved type={ty} fullname={fullname}"),
							);
						}
						ServiceEvent::SearchStopped(ty) => {
							debug_log(LOG_TAG, format!("event=SearchStopped type={ty}"));
						}
					}
				}
				debug_log(LOG_TAG, "Browser consumer thread exiting");
			})?;
		Ok(Self {
			daemon,
			handle: Some(handle),
		})
	}

	/// Stops the browser. Issues `stop_browse` + `shutdown` so the
	/// consumer thread's receiver closes, then joins the thread.
	pub fn stop(mut self) -> Result<(), DiscoveryError> {
		debug_log(LOG_TAG, "Browser::stop");
		let _ = self.daemon.stop_browse(SERVICE_TYPE)?;
		let _ = self.daemon.shutdown()?;
		if let Some(handle) = self.handle.take() {
			// Best-effort join; a panicked thread is logged but not
			// re-raised so `stop` always tears down cleanly.
			if let Err(e) = handle.join() {
				debug_log(LOG_TAG, format!("browser thread panicked: {e:?}"));
				eprintln!("[sync::discovery] browser thread panicked: {e:?}");
			}
		}
		Ok(())
	}
}

/// Converts an `mdns_sd::ServiceInfo` into a [`PeerDiscoveredPayload`]
/// after applying the browser filters. Returns `None` when the record
/// should be skipped (missing TXT, self-loopback, no IPv4).
fn service_info_to_payload(
	info: &ServiceInfo,
	my_fp_lower: &str,
) -> Option<PeerDiscoveredPayload> {
	let fullname = info.get_fullname().to_string();
	// Extract TXT into a HashMap so the pure helper can validate it.
	let mut txt = HashMap::new();
	if let Some(fp) = info.get_property_val_str(TXT_KEY_FP_HEX) {
		txt.insert(TXT_KEY_FP_HEX.to_string(), fp.to_string());
	}
	if let Some(proto) = info.get_property_val_str(TXT_KEY_PROTO) {
		txt.insert(TXT_KEY_PROTO.to_string(), proto.to_string());
	}
	let (fp_hex, _proto) = match parse_txt_record(&txt) {
		Some(v) => v,
		None => {
			debug_log(
				LOG_TAG,
				format!("filter-drop fullname={fullname} reason=txt-parse-failed txt={txt:?}"),
			);
			return None;
		}
	};
	if fp_hex.to_lowercase() == my_fp_lower {
		debug_log(
			LOG_TAG,
			format!("filter-drop fullname={fullname} reason=self-fingerprint fp={fp_hex}"),
		);
		return None;
	}
	// Pick the first IPv4 address that is not loopback.
	let addr = match info
		.get_addresses()
		.iter()
		.copied()
		.find(|ip| matches!(ip, IpAddr::V4(v4) if !v4.is_loopback()))
	{
		Some(a) => a,
		None => {
			let all_addrs: Vec<String> =
				info.get_addresses().iter().map(|a| a.to_string()).collect();
			debug_log(
				LOG_TAG,
				format!(
					"filter-drop fullname={fullname} reason=no-ipv4-non-loopback all_addrs={all_addrs:?}"
				),
			);
			return None;
		}
	};
	let port = info.get_port();
	let fingerprint_display = fingerprint_display_from_hex(&fp_hex);
	Some(PeerDiscoveredPayload {
		fingerprint_hex: fp_hex,
		fingerprint_display,
		addr: addr.to_string(),
		port,
	})
}
