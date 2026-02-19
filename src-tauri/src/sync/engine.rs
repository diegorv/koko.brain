use std::collections::{HashMap, HashSet};
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Instant;

use sha2::{Digest, Sha256};
use tokio::sync::{mpsc, Mutex};
use tokio::task::JoinHandle;
use tokio::time::Duration;
use tokio_util::sync::CancellationToken;
use zeroize::Zeroizing;

use super::client;
use super::conflict;
use super::crypto::{self, SyncKeys, SyncState};
use super::discovery::{self, DiscoveryCandidate, DiscoveryEvent, SyncPeer};
use super::manifest::{self, FileDiff, Side, SyncManifest};
use super::server::{self, SyncServer};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Debounce delay for `trigger_sync()` — sync fires 2s after the last trigger.
const TRIGGER_DEBOUNCE: Duration = Duration::from_secs(2);

/// Backoff schedule in seconds: attempt 1→5s, 2→15s, 3→30s, 4+→60s.
const BACKOFF_SCHEDULE: &[u64] = &[5, 15, 30, 60];

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/// Current status of the sync engine.
#[derive(Debug, Clone, serde::Serialize)]
pub enum SyncStatus {
	/// Engine is running but not currently syncing.
	Idle,
	/// Actively syncing with a peer.
	Syncing {
		peer_id: String,
		files_done: usize,
		files_total: usize,
	},
	/// Last sync attempt resulted in an error.
	Error(String),
}

/// Statistics from a completed sync cycle with a single peer.
#[derive(Debug, Clone)]
pub struct SyncStats {
	pub files_changed: usize,
	pub conflicts: usize,
}

/// Events emitted by the sync engine (bridged to Tauri events by the commands layer).
#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum SyncEvent {
	PeerDiscovered {
		peer_id: String,
		name: String,
		ip: String,
		port: u16,
	},
	PeerLost {
		peer_id: String,
	},
	Started {
		peer_id: String,
	},
	Progress {
		peer_id: String,
		files_total: usize,
		files_done: usize,
	},
	Completed {
		peer_id: String,
		files_changed: usize,
		conflicts: usize,
	},
	Error {
		peer_id: String,
		message: String,
	},
	Conflict {
		original_path: String,
		conflicted_path: String,
	},
	FileDeleted {
		peer_id: String,
		path: String,
	},
	SettingsConflict {
		conflicted_path: String,
	},
}

/// Retry state for backoff after sync failures.
#[derive(Debug, Clone)]
pub struct RetryState {
	/// Number of consecutive failures.
	pub attempts: u32,
	/// Earliest time the next retry is allowed.
	pub next_retry: Instant,
}

impl RetryState {
	/// Returns the backoff duration for the current attempt count.
	pub fn backoff_duration(attempts: u32) -> Duration {
		let idx = (attempts as usize).saturating_sub(1).min(BACKOFF_SCHEDULE.len() - 1);
		Duration::from_secs(BACKOFF_SCHEDULE[idx])
	}
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/// Main sync orchestrator managing server, discovery, peers, and sync cycles.
pub struct SyncEngine {
	state: Arc<EngineState>,
	server: SyncServer,
	discovery_cancel: CancellationToken,
	main_loop_cancel: CancellationToken,
	main_loop_handle: JoinHandle<()>,
	trigger_tx: mpsc::Sender<()>,
}

/// Shared mutable state accessible from the main loop and sync tasks.
struct EngineState {
	vault_path: String,
	psk_key: Zeroizing<[u8; 32]>,
	hmac_key: Zeroizing<[u8; 32]>,
	static_priv: Zeroizing<[u8; 32]>,
	canonical_vault_uuid: String,
	peers: Mutex<HashMap<String, SyncPeer>>,
	peers_syncing: Mutex<HashSet<String>>,
	status: Mutex<SyncStatus>,
	retry_backoff: Mutex<HashMap<String, RetryState>>,
	excluded_paths: Mutex<Vec<String>>,
	sync_state: Mutex<SyncState>,
	event_tx: mpsc::Sender<SyncEvent>,
}

impl SyncEngine {
	/// Starts the sync engine: validates passphrase, derives keys, starts server
	/// and discovery, launches the main event loop.
	pub async fn start(
		vault_path: String,
		port: u16,
		passphrase: &str,
		event_tx: mpsc::Sender<SyncEvent>,
	) -> Result<Self, String> {
		// Validate passphrase
		crypto::validate_passphrase(passphrase)?;

		// Get canonical vault UUID
		let canonical_uuid = crypto::get_canonical_vault_uuid(&vault_path)?;

		// Load/generate static keypair
		let (_pub_key, static_priv) =
			crypto::load_or_generate_static_keypair(&vault_path, &canonical_uuid)?;

		// Derive master key → sync keys
		let master_key = crypto::derive_master_key(passphrase, &canonical_uuid)?;
		let sync_keys = crypto::derive_sync_keys(&master_key)?;

		// Load sync state and config
		let sync_state = crypto::load_sync_state(&vault_path)?;
		let config = crypto::load_sync_local_config(&vault_path)?;

		// Start server (separate copy of keys — both zeroed independently on drop)
		let server = server::start_server(
			vault_path.clone(),
			port,
			SyncKeys {
				psk_key: Zeroizing::new(*sync_keys.psk_key),
				hmac_key: Zeroizing::new(*sync_keys.hmac_key),
			},
			Zeroizing::new(*static_priv),
		)
		.await?;

		// Start mDNS discovery
		let discovery_handle =
			discovery::start_discovery(&canonical_uuid, server.addr.port())?;

		// Build shared state
		let state = Arc::new(EngineState {
			vault_path,
			psk_key: sync_keys.psk_key,
			hmac_key: sync_keys.hmac_key,
			static_priv,
			canonical_vault_uuid: canonical_uuid,
			peers: Mutex::new(HashMap::new()),
			peers_syncing: Mutex::new(HashSet::new()),
			status: Mutex::new(SyncStatus::Idle),
			retry_backoff: Mutex::new(HashMap::new()),
			excluded_paths: Mutex::new(config.excluded_paths),
			sync_state: Mutex::new(sync_state),
			event_tx,
		});

		let (trigger_tx, trigger_rx) = mpsc::channel(10);
		let main_loop_cancel = CancellationToken::new();

		let main_loop_handle = tokio::spawn(main_loop(
			Arc::clone(&state),
			discovery_handle.events_rx,
			trigger_rx,
			main_loop_cancel.clone(),
			Duration::from_secs(config.interval_secs),
		));

		Ok(Self {
			state,
			server,
			discovery_cancel: discovery_handle.cancel_token,
			main_loop_cancel,
			main_loop_handle,
			trigger_tx,
		})
	}

	/// Triggers an immediate sync (debounced by 2s in the main loop).
	pub async fn trigger_sync(&self) {
		let _ = self.trigger_tx.send(()).await;
	}

	/// Returns the current sync status.
	pub async fn get_status(&self) -> SyncStatus {
		self.state.status.lock().await.clone()
	}

	/// Returns a snapshot of all authenticated peers.
	pub async fn get_peers(&self) -> Vec<SyncPeer> {
		self.state.peers.lock().await.values().cloned().collect()
	}

	/// Reloads excluded paths from `sync-local.json` without restarting the engine.
	pub async fn reload_excluded_paths(&self) -> Result<(), String> {
		let config = crypto::load_sync_local_config(&self.state.vault_path)?;
		let mut excluded = self.state.excluded_paths.lock().await;
		*excluded = config.excluded_paths;
		Ok(())
	}

	/// Gracefully stops the engine: cancels main loop, stops discovery, stops server.
	///
	/// Keys are zeroed via `Zeroizing` drop on the `EngineState`.
	pub async fn stop(self) {
		self.main_loop_cancel.cancel();
		self.discovery_cancel.cancel();
		let _ = self.main_loop_handle.await;
		self.server.stop().await;
	}

	/// Returns the server's bound address.
	pub fn server_addr(&self) -> SocketAddr {
		self.server.addr
	}
}

// ---------------------------------------------------------------------------
// Main event loop
// ---------------------------------------------------------------------------

/// Runs the main engine loop: handles discovery events, sync triggers, and periodic sync.
async fn main_loop(
	state: Arc<EngineState>,
	mut discovery_rx: mpsc::Receiver<DiscoveryEvent>,
	mut trigger_rx: mpsc::Receiver<()>,
	cancel: CancellationToken,
	interval: Duration,
) {
	let mut sync_interval = tokio::time::interval(interval);
	// Skip the immediate first tick (don't sync on startup)
	sync_interval.tick().await;

	let mut debounce_deadline: Option<tokio::time::Instant> = None;

	loop {
		// Compute the debounce future — only active when there's a pending trigger
		let debounce_fut = async {
			match debounce_deadline {
				Some(deadline) => tokio::time::sleep_until(deadline).await,
				None => std::future::pending().await,
			}
		};

		tokio::select! {
			biased;

			_ = cancel.cancelled() => break,

			event = discovery_rx.recv() => {
				if let Some(event) = event {
					handle_discovery_event(&state, event).await;
				}
			}

			_ = trigger_rx.recv() => {
				// Reset debounce timer on each trigger
				debounce_deadline = Some(tokio::time::Instant::now() + TRIGGER_DEBOUNCE);
			}

			_ = debounce_fut, if debounce_deadline.is_some() => {
				debounce_deadline = None;
				sync_all_peers(&state).await;
			}

			_ = sync_interval.tick() => {
				sync_all_peers(&state).await;
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Discovery event handling
// ---------------------------------------------------------------------------

/// Processes a discovery event: authenticates new candidates or removes lost peers.
async fn handle_discovery_event(state: &EngineState, event: DiscoveryEvent) {
	match event {
		DiscoveryEvent::Found(candidate) => {
			match authenticate_candidate(state, &candidate).await {
				Ok(peer) => {
					let _ = state
						.event_tx
						.send(SyncEvent::PeerDiscovered {
							peer_id: peer.id.clone(),
							name: peer.name.clone(),
							ip: peer.ip.to_string(),
							port: peer.port,
						})
						.await;
					state
						.peers
						.lock()
						.await
						.insert(peer.id.clone(), peer);
				}
				Err(_) => {
					// Authentication failed — silently ignore (wrong passphrase, etc.)
				}
			}
		}
		DiscoveryEvent::Lost(fullname) => {
			let mut peers = state.peers.lock().await;
			// Find peer by name (fullname from mDNS)
			if let Some(id) = peers
				.iter()
				.find(|(_, p)| p.name == fullname)
				.map(|(id, _)| id.clone())
			{
				peers.remove(&id);
				let _ = state.event_tx.send(SyncEvent::PeerLost { peer_id: id }).await;
			}
		}
	}
}

/// Authenticates a discovery candidate via Noise handshake + UUID exchange.
///
/// Returns a `SyncPeer` if authentication succeeds.
async fn authenticate_candidate(
	state: &EngineState,
	candidate: &DiscoveryCandidate,
) -> Result<SyncPeer, String> {
	let peer_addr = SocketAddr::new(candidate.ip, candidate.port);

	let session = client::open_session(
		peer_addr,
		&state.psk_key,
		&state.static_priv,
		&state.canonical_vault_uuid,
	)
	.await?;

	// Validate peer UUID matches our canonical UUID
	if session.peer_uuid() != state.canonical_vault_uuid {
		return Err(format!(
			"Vault UUID mismatch: expected {}, got {}",
			state.canonical_vault_uuid,
			session.peer_uuid()
		));
	}

	Ok(SyncPeer {
		id: session.peer_uuid().to_string(),
		name: candidate.name.clone(),
		ip: candidate.ip,
		port: candidate.port,
	})
}

// ---------------------------------------------------------------------------
// Sync orchestration
// ---------------------------------------------------------------------------

/// Syncs with all known peers sequentially.
async fn sync_all_peers(state: &EngineState) {
	let peer_ids: Vec<String> = state.peers.lock().await.keys().cloned().collect();

	for peer_id in peer_ids {
		if let Err(err) = sync_with_peer(state, &peer_id).await {
			let _ = state
				.event_tx
				.send(SyncEvent::Error {
					peer_id: peer_id.clone(),
					message: err.clone(),
				})
				.await;
			*state.status.lock().await = SyncStatus::Error(err);
		}
	}
}

/// Performs a complete sync cycle with a single peer.
///
/// Backoff check → peer lock → session → manifest → diff → process → save baseline.
async fn sync_with_peer(state: &EngineState, peer_id: &str) -> Result<SyncStats, String> {
	// Check backoff
	{
		let backoffs = state.retry_backoff.lock().await;
		if let Some(retry) = backoffs.get(peer_id) {
			if Instant::now() < retry.next_retry {
				return Err("In backoff period".to_string());
			}
		}
	}

	// Acquire peer lock (prevent concurrent sync with same peer)
	{
		let mut syncing = state.peers_syncing.lock().await;
		if syncing.contains(peer_id) {
			return Err("Already syncing with this peer".to_string());
		}
		syncing.insert(peer_id.to_string());
	}

	let result = do_sync(state, peer_id).await;

	// Release peer lock
	{
		let mut syncing = state.peers_syncing.lock().await;
		syncing.remove(peer_id);
	}

	// Update backoff state
	match &result {
		Ok(_) => {
			state.retry_backoff.lock().await.remove(peer_id);
		}
		Err(_) => {
			let mut backoffs = state.retry_backoff.lock().await;
			let retry = backoffs
				.entry(peer_id.to_string())
				.or_insert(RetryState {
					attempts: 0,
					next_retry: Instant::now(),
				});
			retry.attempts += 1;
			let delay = RetryState::backoff_duration(retry.attempts);
			retry.next_retry = Instant::now() + delay;
		}
	}

	result
}

/// Core sync logic: session → manifest → diff → apply changes → save baseline.
async fn do_sync(state: &EngineState, peer_id: &str) -> Result<SyncStats, String> {
	let peer = {
		let peers = state.peers.lock().await;
		peers
			.get(peer_id)
			.cloned()
			.ok_or_else(|| format!("Peer not found: {peer_id}"))?
	};

	let peer_addr = SocketAddr::new(peer.ip, peer.port);

	// Open authenticated session
	let mut session = client::open_session(
		peer_addr,
		&state.psk_key,
		&state.static_priv,
		&state.canonical_vault_uuid,
	)
	.await?;

	// Validate peer UUID
	if session.peer_uuid() != state.canonical_vault_uuid {
		return Err("Peer UUID mismatch".to_string());
	}

	// Fetch remote manifest + verify HMAC
	let remote_manifest = session.fetch_manifest(&state.hmac_key).await?;

	// Build local manifest
	let excluded = state.excluded_paths.lock().await.clone();
	let local_manifest = manifest::build_manifest(&state.vault_path, &excluded)?;

	// Load baseline for this peer
	let baseline: Option<SyncManifest> = {
		let sync_state = state.sync_state.lock().await;
		sync_state
			.baseline_manifests
			.get(peer_id)
			.and_then(|v| serde_json::from_value(v.clone()).ok())
	};

	// Three-way diff
	let diffs = manifest::diff_manifests(&local_manifest, &remote_manifest, baseline.as_ref());

	// Filter by local excluded_paths (receptor-side filtering)
	let diffs: Vec<_> = diffs
		.into_iter()
		.filter(|(path, _)| !manifest::is_excluded(path, &excluded))
		.collect();

	let total = diffs
		.iter()
		.filter(|(_, d)| !matches!(d, FileDiff::Identical))
		.count();
	let mut done = 0;
	let mut files_changed = 0;
	let mut conflicts = 0;

	// Update status
	*state.status.lock().await = SyncStatus::Syncing {
		peer_id: peer_id.to_string(),
		files_done: 0,
		files_total: total,
	};

	let _ = state
		.event_tx
		.send(SyncEvent::Started {
			peer_id: peer_id.to_string(),
		})
		.await;

	// Process diffs
	for (path, diff) in &diffs {
		match diff {
			FileDiff::Identical => continue,

			FileDiff::PullFromPeer => {
				let (content, mtime) = session.fetch_file(path).await?;
				verify_file_integrity(&content, &remote_manifest, path)?;
				server::write_vault_file(&state.vault_path, path, &content, mtime)?;
				files_changed += 1;
			}

			FileDiff::PushToPeer => {
				let (content, mtime) =
					server::read_vault_file(&state.vault_path, path)?;
				session.push_file(path, &content, mtime).await?;
				files_changed += 1;
			}

			FileDiff::Conflict => {
				let (remote_content, remote_mtime) =
					session.fetch_file(path).await?;
				let (local_content, local_mtime) =
					server::read_vault_file(&state.vault_path, path)?;

				let conflict_name = conflict::resolve_conflict(
					&state.vault_path,
					path,
					&local_content,
					local_mtime,
					&remote_content,
					remote_mtime,
				)?;

				conflicts += 1;
				files_changed += 1;

				let _ = state
					.event_tx
					.send(SyncEvent::Conflict {
						original_path: path.clone(),
						conflicted_path: conflict_name.clone(),
					})
					.await;

				// Special handling for settings.json
				if path == ".noted/settings.json" {
					let _ = state
						.event_tx
						.send(SyncEvent::SettingsConflict {
							conflicted_path: conflict_name,
						})
						.await;
				}
			}

			FileDiff::DeleteLocal => {
				// Remote deleted this file → delete locally
				conflict::safe_delete_file(&state.vault_path, path)?;
				let _ = state
					.event_tx
					.send(SyncEvent::FileDeleted {
						peer_id: peer_id.to_string(),
						path: path.clone(),
					})
					.await;
			}

			FileDiff::DeleteRemote => {
				// We deleted this file → tell peer to delete
				session.delete_file(path).await?;
			}

			FileDiff::DeleteModifyConflict { modified_side } => {
				match modified_side {
					Side::Local => {
						// We modified, peer deleted → keep our version
						let (content, mtime) =
							server::read_vault_file(&state.vault_path, path)?;
						conflict::resolve_delete_modify_conflict(
							&state.vault_path,
							path,
							&content,
							mtime,
							Side::Local,
						)?;
					}
					Side::Remote => {
						// Peer modified, we deleted → fetch and keep their version
						let (content, mtime) =
							session.fetch_file(path).await?;
						conflict::resolve_delete_modify_conflict(
							&state.vault_path,
							path,
							&content,
							mtime,
							Side::Remote,
						)?;
					}
				}
				conflicts += 1;
			}
		}

		done += 1;
		*state.status.lock().await = SyncStatus::Syncing {
			peer_id: peer_id.to_string(),
			files_done: done,
			files_total: total,
		};

		let _ = state
			.event_tx
			.send(SyncEvent::Progress {
				peer_id: peer_id.to_string(),
				files_total: total,
				files_done: done,
			})
			.await;
	}

	// Save baseline (rebuild manifest after all changes)
	let reconciled = manifest::build_manifest(&state.vault_path, &excluded)?;
	{
		let mut sync_state = state.sync_state.lock().await;
		sync_state.baseline_manifests.insert(
			peer_id.to_string(),
			serde_json::to_value(&reconciled).unwrap_or_default(),
		);
		let now = std::time::SystemTime::now()
			.duration_since(std::time::UNIX_EPOCH)
			.unwrap_or_default()
			.as_secs();
		sync_state
			.last_sync
			.insert(peer_id.to_string(), now);
		crypto::save_sync_state(&state.vault_path, &sync_state)?;
	}

	*state.status.lock().await = SyncStatus::Idle;

	let _ = state
		.event_tx
		.send(SyncEvent::Completed {
			peer_id: peer_id.to_string(),
			files_changed,
			conflicts,
		})
		.await;

	Ok(SyncStats {
		files_changed,
		conflicts,
	})
}

// ---------------------------------------------------------------------------
// File integrity verification
// ---------------------------------------------------------------------------

/// Verifies that received file content matches the expected SHA-256 from the manifest.
pub fn verify_file_integrity(
	content: &[u8],
	manifest: &SyncManifest,
	path: &str,
) -> Result<(), String> {
	let expected = manifest
		.files
		.iter()
		.find(|f| f.path == path)
		.ok_or_else(|| format!("File not in manifest: {path}"))?;

	let actual_hash = hex_encode(&Sha256::digest(content));
	if actual_hash != expected.sha256 {
		return Err(format!(
			"File integrity check failed for {path}: expected {}, got {actual_hash}",
			expected.sha256
		));
	}

	Ok(())
}

/// Encodes bytes as lowercase hex string.
fn hex_encode(bytes: &[u8]) -> String {
	bytes.iter().map(|b| format!("{b:02x}")).collect()
}

