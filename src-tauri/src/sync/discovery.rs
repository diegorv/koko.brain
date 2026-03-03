use std::net::IpAddr;

use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use tokio_util::sync::CancellationToken;

use super::crypto::hash_vault_id_for_mdns;
use crate::utils::logger::debug_log;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// mDNS service type for Noted sync.
const SERVICE_TYPE: &str = "_noted._tcp.local.";

/// TXT record key for the vault hash.
const TXT_VAULT_KEY: &str = "vault";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/// An authenticated sync peer (after Noise handshake + UUID exchange).
#[derive(Debug, Clone)]
pub struct SyncPeer {
	/// Vault UUID (established after authentication).
	pub id: String,
	/// Human-readable name (e.g., hostname).
	pub name: String,
	/// Peer IP address.
	pub ip: IpAddr,
	/// Peer port.
	pub port: u16,
}

/// An unauthenticated candidate discovered via mDNS.
///
/// The engine must perform a Noise handshake + UUID exchange to verify
/// this candidate before promoting it to a `SyncPeer`.
#[derive(Debug, Clone)]
pub struct DiscoveryCandidate {
	/// Peer IP address.
	pub ip: IpAddr,
	/// Peer port.
	pub port: u16,
	/// Human-readable name (instance name from mDNS).
	pub name: String,
}

/// Events emitted by the mDNS discovery process.
#[derive(Debug)]
pub enum DiscoveryEvent {
	/// A candidate with a matching vault hash was found on the network.
	Found(DiscoveryCandidate),
	/// A previously discovered candidate went away (identified by mDNS fullname).
	Lost(String),
}

/// Handle to a running mDNS discovery process.
pub struct DiscoveryHandle {
	/// Token to signal graceful shutdown.
	pub cancel_token: CancellationToken,
	/// Receiver for discovery events.
	pub events_rx: mpsc::Receiver<DiscoveryEvent>,
	/// JoinHandle for the spawned discovery task — must be awaited on shutdown
	/// to ensure the mDNS daemon is fully stopped.
	pub task_handle: JoinHandle<()>,
}

// ---------------------------------------------------------------------------
// Discovery lifecycle
// ---------------------------------------------------------------------------

/// Starts mDNS service registration and peer discovery for a vault.
///
/// - Registers `_noted._tcp` with TXT `vault={hash}` (truncated SHA-256, not real UUID).
/// - Browses for other instances with the same vault hash.
/// - Emits `DiscoveryEvent::Found` / `Lost` via the returned handle's channel.
/// - The engine is responsible for authenticating candidates via Noise handshake.
pub fn start_discovery(
	vault_uuid: &str,
	port: u16,
) -> Result<DiscoveryHandle, String> {
	let vault_hash = hash_vault_id_for_mdns(vault_uuid);
	let cancel_token = CancellationToken::new();
	let (events_tx, events_rx) = mpsc::channel(100);

	let mdns = ServiceDaemon::new()
		.map_err(|e| format!("Failed to create mDNS daemon: {e}"))?;

	// Determine instance name from system hostname
	let instance_name = get_hostname();
	debug_log("SYNC:DISC", format!(
		"Starting mDNS discovery: vault_hash={vault_hash}, port={port}, hostname={instance_name}"
	));

	// Register our service
	let service = ServiceInfo::new(
		SERVICE_TYPE,
		&instance_name,
		&format!("{instance_name}.local."),
		"", // auto-detect IP addresses
		port,
		&[(TXT_VAULT_KEY, vault_hash.as_str())][..],
	)
	.map_err(|e| format!("Failed to create mDNS service info: {e}"))?;

	let our_fullname = service.get_fullname().to_string();

	mdns.register(service)
		.map_err(|e| format!("Failed to register mDNS service: {e}"))?;
	debug_log("SYNC:DISC", format!(
		"Registered: {instance_name}._noted._tcp.local. (vault={vault_hash})"
	));

	// Browse for peers with the same service type
	let browse_rx = mdns
		.browse(SERVICE_TYPE)
		.map_err(|e| format!("Failed to start mDNS browse: {e}"))?;

	let cancel = cancel_token.clone();
	let vault_hash_clone = vault_hash.clone();

	let task_handle = tokio::spawn(async move {
		loop {
			tokio::select! {
				_ = cancel.cancelled() => {
					debug_log("SYNC:DISC", "mDNS discovery stopped");
					let _ = mdns.shutdown();
					break;
				}
				event = browse_rx.recv_async() => {
					match event {
						Ok(ServiceEvent::ServiceResolved(info)) => {
							// Skip our own service
							if info.get_fullname() == our_fullname {
								continue;
							}

							// Check vault hash in TXT record
							let matches = info
								.get_properties()
								.iter()
								.any(|p| p.key() == TXT_VAULT_KEY && p.val_str() == vault_hash_clone);

							if matches {
								if let Some(ip) = info.get_addresses().iter().next() {
									let name = extract_instance_name(info.get_fullname());
									debug_log("SYNC:DISC", format!(
										"Peer found: {name} at {ip}:{}",
										info.get_port()
									));
									let candidate = DiscoveryCandidate {
										ip: *ip,
										port: info.get_port(),
										name,
									};
									if events_tx.send(DiscoveryEvent::Found(candidate)).await.is_err() {
										break; // Receiver dropped
									}
								}
							} else {
								debug_log("SYNC:DISC", format!(
									"Service found but vault hash mismatch — skipping {}",
									info.get_fullname()
								));
							}
						}
						Ok(ServiceEvent::ServiceRemoved(_, fullname)) => {
							if fullname != our_fullname {
								debug_log("SYNC:DISC", format!("Peer lost: {fullname}"));
								if events_tx.send(DiscoveryEvent::Lost(fullname)).await.is_err() {
									break;
								}
							}
						}
						Ok(_) => {} // SearchStarted, ServiceFound, SearchStopped
						Err(_) => break, // Channel closed
					}
				}
			}
		}
	});

	Ok(DiscoveryHandle {
		cancel_token,
		events_rx,
		task_handle,
	})
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Extracts the human-readable instance name from an mDNS fullname.
///
/// e.g., `"Diegos-MacBook._noted._tcp.local."` → `"Diegos-MacBook"`.
fn extract_instance_name(fullname: &str) -> String {
	fullname
		.split('.')
		.next()
		.unwrap_or(fullname)
		.to_string()
}

/// Gets the system hostname via libc.
fn get_hostname() -> String {
	let mut buf = [0u8; 256];
	let result = unsafe {
		libc::gethostname(buf.as_mut_ptr() as *mut libc::c_char, buf.len())
	};
	if result == 0 {
		let len = buf.iter().position(|&b| b == 0).unwrap_or(buf.len());
		String::from_utf8_lossy(&buf[..len]).to_string()
	} else {
		"noted-peer".to_string()
	}
}
