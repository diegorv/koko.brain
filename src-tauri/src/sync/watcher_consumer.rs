//! Consumer side of `sync::watcher_bridge`. Subscribes to the
//! vault-watcher fan-out, debounces incoming path bursts for 200 ms,
//! turns each path into the appropriate `AppMsg` (`PushUpdate` when
//! the file still exists, `Delete` when it does not), and fans the
//! resulting message out to every active LAN sync connection.
//!
//! Spawned once per vault by `lan_sync_start` and aborted by
//! `lan_sync_stop`. Cheap to leave running when no peer is
//! connected - the fan-out loop iterates an empty map and immediately
//! returns to waiting on the broadcast receiver.
//!
//! Scope deferred for follow-up commits (intentionally not in this
//! Stage 6 commit):
//! - Rename detection (`sync::rename_detect`) is wired only at the
//!   batch level: this consumer emits a `Delete` then a `PushUpdate`
//!   for a rename, leaving collapse to the future `PushRename`
//!   path. The infra is in place; the call site is one batch-shape
//!   change away.
//! - Per-share, per-peer allow-list filtering of `outbound` fan-out.
//! - Chunked transfer for files larger than the AEAD frame size
//!   (`protocol::MAX_FRAME_SIZE`, 8 MiB).
//! - `share-progress` event emission. The payload type already
//!   exists (Stage 1); only the call site is missing.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use tokio::sync::Mutex;
use tokio::task::JoinHandle;

use crate::sync::identity::PeerIdentity;
use crate::sync::protocol::{encode_b64, AppMsg};
use crate::sync::{shares, state_db, watcher_bridge};

/// Capacity at which the watcher receiver drops oldest payloads.
/// Documented for the test suite; equal to
/// [`watcher_bridge::CHANNEL_CAPACITY`].
pub const SUBSCRIBER_CHANNEL_CAPACITY: usize = watcher_bridge::CHANNEL_CAPACITY;

/// Debounce window the consumer collects bursts within. Picked to
/// match the vault watcher's own debounce so the consumer does not
/// see double bursts from a single editor save.
pub const DEBOUNCE_WINDOW: Duration = Duration::from_millis(200);

/// Carries everything the consumer needs from `LanSyncState`. All
/// fields are cheap to clone (`Arc` for the connection map,
/// `PathBuf` + `PeerIdentity` are 32 bytes of secret + a public key).
#[derive(Clone)]
pub struct ConsumerContext {
	pub vault_root: PathBuf,
	pub identity: PeerIdentity,
	pub active_connections: Arc<Mutex<HashMap<String, OutboundChannel>>>,
}

/// Trimmed handle the consumer holds for each live connection. The
/// real `ActiveConnection` in `commands::sync` carries more fields
/// (peer fingerprint, addr, task join handle); the consumer only
/// needs the outbound `mpsc::Sender`.
#[derive(Clone)]
pub struct OutboundChannel {
	pub outbound: tokio::sync::mpsc::Sender<AppMsg>,
}

/// Spawns the consumer task and returns its `JoinHandle`. Caller
/// stores the handle and aborts it on `lan_sync_stop`.
pub fn spawn_watcher_consumer(ctx: ConsumerContext) -> JoinHandle<()> {
	tokio::spawn(consumer_loop(ctx))
}

async fn consumer_loop(ctx: ConsumerContext) {
	let mut rx = watcher_bridge::subscribe();
	loop {
		// Block until the first event lands.
		let first_batch = match rx.recv().await {
			Ok(b) => b,
			Err(tokio::sync::broadcast::error::RecvError::Lagged(_n)) => {
				// Resubscribe + skip - the next iteration starts a
				// fresh batch. A real production consumer would also
				// schedule a full manifest rescan here; that is a
				// later commit.
				continue;
			}
			Err(tokio::sync::broadcast::error::RecvError::Closed) => return,
		};
		let mut batch: Vec<String> = first_batch;
		// Drain anything that arrives within the debounce window.
		let deadline = tokio::time::Instant::now() + DEBOUNCE_WINDOW;
		loop {
			match tokio::time::timeout_at(deadline, rx.recv()).await {
				Ok(Ok(more)) => batch.extend(more),
				Ok(Err(_)) => break,
				Err(_) => break, // deadline hit
			}
		}
		batch.sort();
		batch.dedup();
		for abs_path in &batch {
			if let Err(e) = process_one(&ctx, abs_path).await {
				eprintln!("[lan-sync] watcher consumer: {e}");
			}
		}
	}
}

/// Builds the right `AppMsg` for the path's current state and
/// broadcasts it. Distinct from the consumer loop so it can be
/// unit-tested directly.
pub async fn process_one(ctx: &ConsumerContext, abs_path_str: &str) -> Result<(), String> {
	let abs_path = Path::new(abs_path_str);
	// Skip paths outside the vault. The vault watcher emits absolute
	// paths so the prefix check is straightforward.
	let rel = match abs_path.strip_prefix(&ctx.vault_root) {
		Ok(r) => r.to_path_buf(),
		Err(_) => return Ok(()),
	};
	let path_rel_str = rel.to_string_lossy().to_string();

	let shares_file =
		shares::read_shares(&ctx.vault_root).map_err(|e| format!("read shares: {e}"))?;
	if shares_file.shares.is_empty() {
		return Ok(()); // nothing to sync
	}

	let exists = abs_path.exists();
	let origin_fp = ctx.identity.fingerprint_string();
	let mtime_ms = if exists { read_mtime_ms(abs_path) } else { 0 };

	// One state_db handle per process_one call. Rusqlite's Connection
	// is `!Send` across `.await` boundaries, so we open + drop it
	// inside this synchronous segment before any await reaches the
	// outbound channel.
	let db = state_db::open_state_db(&ctx.vault_root)
		.map_err(|e| format!("open state db: {e}"))?;

	let mut outbound_msgs: Vec<AppMsg> = Vec::new();
	for share in &shares_file.shares {
		if !shares::should_sync_path(share, &ctx.vault_root, abs_path) {
			continue;
		}
		let lamport =
			state_db::bump_lamport(&db, &share.id).map_err(|e| format!("bump lamport: {e}"))?;
		let msg = if exists {
			let content =
				std::fs::read(abs_path).map_err(|e| format!("read content: {e}"))?;
			let hash = sha256_hex(&content);
			AppMsg::PushUpdate {
				share_id: share.id.clone(),
				path_rel: path_rel_str.clone(),
				mtime_ms,
				lamport,
				sha256_hash: hash,
				origin_fingerprint: origin_fp.clone(),
				content_b64: encode_b64(&content),
			}
		} else {
			AppMsg::Delete {
				share_id: share.id.clone(),
				path_rel: path_rel_str.clone(),
				mtime_ms,
				lamport,
				origin_fingerprint: origin_fp.clone(),
			}
		};
		outbound_msgs.push(msg);
	}
	drop(db);

	// Fan out *after* the DB handle drops so we are free to await.
	if outbound_msgs.is_empty() {
		return Ok(());
	}
	let guard = ctx.active_connections.lock().await;
	for msg in outbound_msgs {
		for conn in guard.values() {
			// `try_send` so a stalled connection cannot block the
			// watcher consumer. Lost messages will be recovered by
			// the next full-manifest sync.
			let _ = conn.outbound.try_send(msg.clone());
		}
	}
	Ok(())
}

fn read_mtime_ms(path: &Path) -> i64 {
	std::fs::metadata(path)
		.and_then(|m| m.modified())
		.ok()
		.and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
		.map(|d| d.as_millis() as i64)
		.unwrap_or(0)
}

fn sha256_hex(bytes: &[u8]) -> String {
	use sha2_v10::{Digest, Sha256};
	let digest: [u8; 32] = Sha256::digest(bytes).into();
	digest.iter().map(|b| format!("{b:02x}")).collect()
}
