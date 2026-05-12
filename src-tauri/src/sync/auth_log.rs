//! Audit log + brute-force rate limiter for LAN sync.
//!
//! Two tables (defined in [`state_db::init_schema`]):
//! - `auth_events`: append-only log of every connection attempt.
//!   Holds success AND failure events so users have an audit trail,
//!   not just a "who failed" list. Cleaned up automatically by
//!   `cleanup_old_events`.
//! - `auth_blocks`: materialised set of currently-blocked
//!   identifiers, derived from recent failures in `auth_events`.
//!   The `accept_loop` hot path queries this directly (O(1)) so a
//!   blocked peer is rejected before any handshake bytes are read.
//!
//! Policy:
//! - **Threshold**: 5 failures within a 15-minute window → block 24h.
//! - **Path-traversal weight 2**: a `PathTraversal` failure counts as
//!   two regular failures, so 3 traversal attempts trip the block.
//! - **Dual identifier**: every failure registers two events — one
//!   keyed by `"ip:..."` and one by `"fp:..."` (when a Ed25519
//!   public key trafficked before the failure). Either dimension
//!   blocking closes the connection.
//! - **Success redemption**: a successful handshake DELETES the
//!   matching `auth_blocks` row (peer is forgiven) but leaves the
//!   audit trail in `auth_events` untouched.

use crate::sync::state_db::StateDbError;
use rusqlite::{params, Connection};

/// Rolling window during which failures accumulate toward the block
/// threshold.
pub const WINDOW_MS: i64 = 15 * 60 * 1000;

/// Number of failures (after weighting) that triggers a block.
pub const FAILURE_THRESHOLD: u32 = 5;

/// How long a peer stays blocked after the threshold trips.
pub const BLOCK_DURATION_MS: i64 = 24 * 60 * 60 * 1000;

/// Path-traversal failures are weighted higher because the intent is
/// unambiguous (no legitimate peer sends `../etc/passwd`).
pub const PATH_TRAVERSAL_WEIGHT: u32 = 2;

/// Why the handshake failed (if it did) — feeds the `failure_reason`
/// column and the block trigger metadata.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FailureReason {
	UnknownFingerprint,
	BadSignature,
	BadAead,
	NonceReplay,
	PakeAbort,
	PathTraversal,
	ProtocolVersionMismatch,
	AlreadyBlocked,
}

impl FailureReason {
	pub fn as_str(&self) -> &'static str {
		match self {
			Self::UnknownFingerprint => "unknown_fingerprint",
			Self::BadSignature => "bad_signature",
			Self::BadAead => "bad_aead",
			Self::NonceReplay => "nonce_replay",
			Self::PakeAbort => "pake_abort",
			Self::PathTraversal => "path_traversal",
			Self::ProtocolVersionMismatch => "protocol_version_mismatch",
			Self::AlreadyBlocked => "already_blocked",
		}
	}
	pub fn from_str(s: &str) -> Option<Self> {
		Some(match s {
			"unknown_fingerprint" => Self::UnknownFingerprint,
			"bad_signature" => Self::BadSignature,
			"bad_aead" => Self::BadAead,
			"nonce_replay" => Self::NonceReplay,
			"pake_abort" => Self::PakeAbort,
			"path_traversal" => Self::PathTraversal,
			"protocol_version_mismatch" => Self::ProtocolVersionMismatch,
			"already_blocked" => Self::AlreadyBlocked,
			_ => return None,
		})
	}
	/// Weight for the rolling-window count. `PathTraversal` is the
	/// only outlier today.
	pub fn weight(&self) -> u32 {
		match self {
			Self::PathTraversal => PATH_TRAVERSAL_WEIGHT,
			_ => 1,
		}
	}
}

/// Which step of the connection the event belongs to. Pinned to a
/// small set of strings so log queries can filter on phase
/// reliably.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HandshakePhase {
	TcpAccept,
	Opening,
	IdentityProof,
	Session,
	PairingPake,
	PairingExchange,
}

impl HandshakePhase {
	pub fn as_str(&self) -> &'static str {
		match self {
			Self::TcpAccept => "tcp_accept",
			Self::Opening => "opening",
			Self::IdentityProof => "identity_proof",
			Self::Session => "session",
			Self::PairingPake => "pairing_pake",
			Self::PairingExchange => "pairing_exchange",
		}
	}
}

/// Outcome of a connection attempt.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Outcome {
	Success,
	Failure,
}

impl Outcome {
	pub fn as_str(&self) -> &'static str {
		match self {
			Self::Success => "success",
			Self::Failure => "failure",
		}
	}
}

/// All the inputs `record_event` needs in one struct so callers don't
/// have to pass a long parameter list at every call site.
#[derive(Debug, Clone)]
pub struct AuthEventInput<'a> {
	pub timestamp_ms: i64,
	pub identifier: &'a str,
	pub peer_fingerprint: Option<&'a str>,
	pub remote_addr: &'a str,
	pub outcome: Outcome,
	pub handshake_phase: HandshakePhase,
	pub failure_reason: Option<FailureReason>,
	pub detail: Option<&'a str>,
}

/// One row from `auth_events`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuthEvent {
	pub id: i64,
	pub timestamp_ms: i64,
	pub identifier: String,
	pub peer_fingerprint: Option<String>,
	pub remote_addr: String,
	pub outcome: Outcome,
	pub handshake_phase: String,
	pub failure_reason: Option<FailureReason>,
	pub detail: Option<String>,
}

/// One row from `auth_blocks`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BlockedEntry {
	pub identifier: String,
	pub blocked_at_ms: i64,
	pub blocked_until_ms: i64,
	pub trigger_reason: FailureReason,
	pub failure_count_in_window: u32,
}

/// Records one event and, when the event is a failure that pushes the
/// rolling-window weighted count over [`FAILURE_THRESHOLD`], inserts
/// or extends a corresponding `auth_blocks` row.
///
/// Returns the freshly-inserted block when one was created or
/// refreshed; returns `None` otherwise (success path, or failure
/// below threshold).
pub fn record_event(
	conn: &Connection,
	event: AuthEventInput<'_>,
) -> Result<Option<BlockedEntry>, StateDbError> {
	conn.execute(
		"INSERT INTO auth_events(
			timestamp_ms, identifier, peer_fingerprint, remote_addr,
			outcome, handshake_phase, failure_reason, detail
		) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
		params![
			event.timestamp_ms,
			event.identifier,
			event.peer_fingerprint,
			event.remote_addr,
			event.outcome.as_str(),
			event.handshake_phase.as_str(),
			event.failure_reason.map(|r| r.as_str()),
			event.detail,
		],
	)?;

	if event.outcome == Outcome::Success {
		// Success removes any existing block for this identifier —
		// peer is redeemed. Audit trail in `auth_events` is preserved.
		conn.execute(
			"DELETE FROM auth_blocks WHERE identifier = ?1",
			params![event.identifier],
		)?;
		return Ok(None);
	}

	// Failure path: count weighted failures inside the rolling window.
	let window_start = event.timestamp_ms - WINDOW_MS;
	let mut stmt = conn.prepare(
		"SELECT failure_reason FROM auth_events
		 WHERE identifier = ?1
		   AND outcome = 'failure'
		   AND timestamp_ms >= ?2",
	)?;
	let rows = stmt.query_map(params![event.identifier, window_start], |r| {
		r.get::<_, Option<String>>(0)
	})?;
	let mut count: u32 = 0;
	for row in rows {
		let reason_str = row?;
		let weight = reason_str
			.as_deref()
			.and_then(FailureReason::from_str)
			.map(|r| r.weight())
			.unwrap_or(1);
		count = count.saturating_add(weight);
	}

	if count < FAILURE_THRESHOLD {
		return Ok(None);
	}

	// Threshold tripped. Insert OR refresh the block:
	// - INSERT case: blocked_until_ms = now + 24h.
	// - Existing row with blocked_until_ms still in the future: keep
	//   the original timestamp (don't extend on every additional
	//   failure beyond the threshold).
	let trigger = event
		.failure_reason
		.unwrap_or(FailureReason::AlreadyBlocked);
	let blocked_until = event.timestamp_ms + BLOCK_DURATION_MS;

	conn.execute(
		"INSERT INTO auth_blocks(
			identifier, blocked_at_ms, blocked_until_ms, trigger_reason,
			failure_count_in_window
		) VALUES (?1, ?2, ?3, ?4, ?5)
		ON CONFLICT(identifier) DO UPDATE SET
			failure_count_in_window = excluded.failure_count_in_window",
		params![
			event.identifier,
			event.timestamp_ms,
			blocked_until,
			trigger.as_str(),
			count as i64,
		],
	)?;

	// Read back the row that's actually persisted (in case ON CONFLICT
	// preserved an older blocked_until_ms).
	is_blocked(conn, event.identifier, event.timestamp_ms)
}

/// Returns the active block row for `identifier`, or `None` if none.
/// Expired rows are deleted lazily on read.
pub fn is_blocked(
	conn: &Connection,
	identifier: &str,
	now_ms: i64,
) -> Result<Option<BlockedEntry>, StateDbError> {
	let row = conn.query_row(
		"SELECT identifier, blocked_at_ms, blocked_until_ms, trigger_reason,
				failure_count_in_window
		 FROM auth_blocks WHERE identifier = ?1",
		params![identifier],
		|r| {
			let trigger: String = r.get(3)?;
			Ok(BlockedEntry {
				identifier: r.get(0)?,
				blocked_at_ms: r.get(1)?,
				blocked_until_ms: r.get(2)?,
				trigger_reason: FailureReason::from_str(&trigger)
					.unwrap_or(FailureReason::AlreadyBlocked),
				failure_count_in_window: r.get::<_, i64>(4)? as u32,
			})
		},
	);
	match row {
		Ok(entry) => {
			if entry.blocked_until_ms <= now_ms {
				// Expired — delete it and report "not blocked".
				conn.execute(
					"DELETE FROM auth_blocks WHERE identifier = ?1",
					params![identifier],
				)?;
				Ok(None)
			} else {
				Ok(Some(entry))
			}
		}
		Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
		Err(e) => Err(e.into()),
	}
}

/// Removes the block for `identifier`. Returns `true` if a row was
/// actually deleted.
pub fn unblock(conn: &Connection, identifier: &str) -> Result<bool, StateDbError> {
	let n = conn.execute(
		"DELETE FROM auth_blocks WHERE identifier = ?1",
		params![identifier],
	)?;
	Ok(n > 0)
}

/// Returns every active block row. Lazily expires while iterating.
pub fn list_blocked(
	conn: &Connection,
	now_ms: i64,
) -> Result<Vec<BlockedEntry>, StateDbError> {
	let mut stmt = conn.prepare(
		"SELECT identifier, blocked_at_ms, blocked_until_ms, trigger_reason,
				failure_count_in_window
		 FROM auth_blocks
		 ORDER BY blocked_at_ms DESC",
	)?;
	let rows = stmt.query_map([], |r| {
		let trigger: String = r.get(3)?;
		Ok(BlockedEntry {
			identifier: r.get(0)?,
			blocked_at_ms: r.get(1)?,
			blocked_until_ms: r.get(2)?,
			trigger_reason: FailureReason::from_str(&trigger)
				.unwrap_or(FailureReason::AlreadyBlocked),
			failure_count_in_window: r.get::<_, i64>(4)? as u32,
		})
	})?;
	let mut out: Vec<BlockedEntry> = Vec::new();
	for r in rows {
		let entry = r?;
		if entry.blocked_until_ms <= now_ms {
			conn.execute(
				"DELETE FROM auth_blocks WHERE identifier = ?1",
				params![&entry.identifier],
			)?;
			continue;
		}
		out.push(entry);
	}
	Ok(out)
}

/// Filter for `list_events`. All fields are optional and combine with
/// AND semantics.
#[derive(Debug, Clone, Default)]
pub struct EventFilter<'a> {
	pub since_ms: Option<i64>,
	pub until_ms: Option<i64>,
	pub identifier: Option<&'a str>,
	pub outcome: Option<Outcome>,
	pub limit: Option<u32>,
}

/// Returns events newest-first. Used by the "Activity log" UI panel.
pub fn list_events(
	conn: &Connection,
	filter: EventFilter<'_>,
) -> Result<Vec<AuthEvent>, StateDbError> {
	let mut sql = String::from(
		"SELECT id, timestamp_ms, identifier, peer_fingerprint, remote_addr,
				outcome, handshake_phase, failure_reason, detail
		 FROM auth_events WHERE 1=1",
	);
	let mut p: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
	if let Some(since) = filter.since_ms {
		sql.push_str(" AND timestamp_ms >= ?");
		p.push(Box::new(since));
	}
	if let Some(until) = filter.until_ms {
		sql.push_str(" AND timestamp_ms <= ?");
		p.push(Box::new(until));
	}
	if let Some(id) = filter.identifier {
		sql.push_str(" AND identifier = ?");
		p.push(Box::new(id.to_string()));
	}
	if let Some(outcome) = filter.outcome {
		sql.push_str(" AND outcome = ?");
		p.push(Box::new(outcome.as_str().to_string()));
	}
	sql.push_str(" ORDER BY timestamp_ms DESC, id DESC");
	if let Some(limit) = filter.limit {
		sql.push_str(" LIMIT ?");
		p.push(Box::new(limit as i64));
	}

	let mut stmt = conn.prepare(&sql)?;
	let params_iter = rusqlite::params_from_iter(p.iter().map(|b| b.as_ref()));
	let rows = stmt.query_map(params_iter, |r| {
		let outcome_str: String = r.get(5)?;
		let outcome = if outcome_str == "success" {
			Outcome::Success
		} else {
			Outcome::Failure
		};
		let reason: Option<String> = r.get(7)?;
		Ok(AuthEvent {
			id: r.get(0)?,
			timestamp_ms: r.get(1)?,
			identifier: r.get(2)?,
			peer_fingerprint: r.get(3)?,
			remote_addr: r.get(4)?,
			outcome,
			handshake_phase: r.get(6)?,
			failure_reason: reason.as_deref().and_then(FailureReason::from_str),
			detail: r.get(8)?,
		})
	})?;
	let mut out = Vec::new();
	for r in rows {
		out.push(r?);
	}
	Ok(out)
}

/// Deletes events older than `older_than_ms` (absolute timestamp).
/// Returns the number of rows removed. Default retention is 30 days
/// — call with `now - 30 * 24 * 60 * 60 * 1000` once per app start.
pub fn cleanup_old_events(
	conn: &Connection,
	older_than_ms: i64,
) -> Result<u64, StateDbError> {
	let n = conn.execute(
		"DELETE FROM auth_events WHERE timestamp_ms < ?1",
		params![older_than_ms],
	)?;
	Ok(n as u64)
}
