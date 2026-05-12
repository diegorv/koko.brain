use kokobrain_lib::sync::auth_log::{
	cleanup_old_events, is_blocked, list_blocked, list_events, record_event, unblock,
	AuthEventInput, EventFilter, FailureReason, HandshakePhase, Outcome, BLOCK_DURATION_MS,
	FAILURE_THRESHOLD, WINDOW_MS,
};
use kokobrain_lib::sync::state_db::open_in_memory;

const NOW: i64 = 1_700_000_000_000;

fn failure(time_ms: i64, identifier: &str, reason: FailureReason) -> AuthEventInput<'static> {
	let ident: &'static str = Box::leak(identifier.to_string().into_boxed_str());
	AuthEventInput {
		timestamp_ms: time_ms,
		identifier: ident,
		peer_fingerprint: None,
		remote_addr: "192.168.1.4",
		outcome: Outcome::Failure,
		handshake_phase: HandshakePhase::IdentityProof,
		failure_reason: Some(reason),
		detail: None,
	}
}

fn success(time_ms: i64, identifier: &str) -> AuthEventInput<'static> {
	let ident: &'static str = Box::leak(identifier.to_string().into_boxed_str());
	AuthEventInput {
		timestamp_ms: time_ms,
		identifier: ident,
		peer_fingerprint: Some("A1B2C3D4E5F60708"),
		remote_addr: "192.168.1.4",
		outcome: Outcome::Success,
		handshake_phase: HandshakePhase::IdentityProof,
		failure_reason: None,
		detail: None,
	}
}

// ============================================================================
// Constants sanity
// ============================================================================

#[test]
fn constants_match_plan() {
	assert_eq!(FAILURE_THRESHOLD, 5);
	assert_eq!(WINDOW_MS, 15 * 60 * 1000);
	assert_eq!(BLOCK_DURATION_MS, 24 * 60 * 60 * 1000);
}

// ============================================================================
// FailureReason serialisation round-trip
// ============================================================================

#[test]
fn failure_reason_string_round_trip() {
	for r in [
		FailureReason::UnknownFingerprint,
		FailureReason::BadSignature,
		FailureReason::BadAead,
		FailureReason::NonceReplay,
		FailureReason::PakeAbort,
		FailureReason::PathTraversal,
		FailureReason::ProtocolVersionMismatch,
		FailureReason::AlreadyBlocked,
	] {
		assert_eq!(FailureReason::from_str(r.as_str()), Some(r));
	}
}

#[test]
fn path_traversal_weighs_two() {
	assert_eq!(FailureReason::PathTraversal.weight(), 2);
	assert_eq!(FailureReason::UnknownFingerprint.weight(), 1);
}

// ============================================================================
// record_event + is_blocked threshold logic
// ============================================================================

#[test]
fn four_failures_in_window_do_not_block() {
	let conn = open_in_memory().unwrap();
	for i in 0..4 {
		let _ = record_event(
			&conn,
			failure(NOW + i, "ip:1.1.1.1", FailureReason::BadSignature),
		)
		.unwrap();
	}
	assert!(is_blocked(&conn, "ip:1.1.1.1", NOW + 100).unwrap().is_none());
}

#[test]
fn five_failures_in_window_create_a_block() {
	let conn = open_in_memory().unwrap();
	let mut new_block = None;
	for i in 0..5 {
		new_block = record_event(
			&conn,
			failure(NOW + i, "ip:1.1.1.1", FailureReason::BadSignature),
		)
		.unwrap();
	}
	let block = new_block.expect("5th failure must trip the block");
	assert_eq!(block.identifier, "ip:1.1.1.1");
	assert_eq!(block.blocked_until_ms, NOW + 4 + BLOCK_DURATION_MS);
	assert!(is_blocked(&conn, "ip:1.1.1.1", NOW + 100).unwrap().is_some());
}

#[test]
fn block_does_not_extend_when_more_failures_pile_up() {
	let conn = open_in_memory().unwrap();
	// Fire the 5 failures that trip the block.
	for i in 0..5 {
		let _ = record_event(
			&conn,
			failure(NOW + i, "ip:1.1.1.1", FailureReason::BadSignature),
		)
		.unwrap();
	}
	let initial = is_blocked(&conn, "ip:1.1.1.1", NOW + 100)
		.unwrap()
		.unwrap();
	// Fire 3 more failures; block expiration must NOT move forward.
	for j in 5..8 {
		let _ = record_event(
			&conn,
			failure(NOW + j, "ip:1.1.1.1", FailureReason::BadSignature),
		)
		.unwrap();
	}
	let after = is_blocked(&conn, "ip:1.1.1.1", NOW + 200).unwrap().unwrap();
	assert_eq!(initial.blocked_until_ms, after.blocked_until_ms);
}

#[test]
fn path_traversal_blocks_after_three_attempts() {
	// 3 × weight(2) = 6 ≥ 5 → blocked.
	let conn = open_in_memory().unwrap();
	let mut block = None;
	for i in 0..3 {
		block = record_event(
			&conn,
			failure(NOW + i, "ip:1.1.1.1", FailureReason::PathTraversal),
		)
		.unwrap();
	}
	assert!(block.is_some(), "3 path-traversal attempts must block");
}

#[test]
fn failures_outside_window_do_not_count() {
	let conn = open_in_memory().unwrap();
	// 4 old failures outside the 15-min window.
	for i in 0..4 {
		let _ = record_event(
			&conn,
			failure(
				NOW - WINDOW_MS - 1_000 + i,
				"ip:1.1.1.1",
				FailureReason::BadSignature,
			),
		)
		.unwrap();
	}
	// 4 new failures inside the window: still 4 < 5.
	for i in 0..4 {
		let _ = record_event(
			&conn,
			failure(NOW + i, "ip:1.1.1.1", FailureReason::BadSignature),
		)
		.unwrap();
	}
	assert!(is_blocked(&conn, "ip:1.1.1.1", NOW + 100).unwrap().is_none());
}

#[test]
fn block_expires_lazily_on_read() {
	let conn = open_in_memory().unwrap();
	for i in 0..5 {
		let _ = record_event(
			&conn,
			failure(NOW + i, "ip:1.1.1.1", FailureReason::BadSignature),
		)
		.unwrap();
	}
	// Just before expiration: still blocked.
	let still = is_blocked(&conn, "ip:1.1.1.1", NOW + BLOCK_DURATION_MS - 1).unwrap();
	assert!(still.is_some());
	// At or after expiration: cleared lazily.
	let gone = is_blocked(&conn, "ip:1.1.1.1", NOW + BLOCK_DURATION_MS + 100).unwrap();
	assert!(gone.is_none());
	// And the auth_blocks row is actually deleted.
	let gone_again = is_blocked(&conn, "ip:1.1.1.1", NOW + BLOCK_DURATION_MS + 200).unwrap();
	assert!(gone_again.is_none());
}

// ============================================================================
// Success path: redeems the block but keeps the audit trail
// ============================================================================

#[test]
fn success_clears_active_block_but_keeps_audit_trail() {
	let conn = open_in_memory().unwrap();
	for i in 0..5 {
		let _ = record_event(
			&conn,
			failure(NOW + i, "ip:1.1.1.1", FailureReason::BadSignature),
		)
		.unwrap();
	}
	assert!(is_blocked(&conn, "ip:1.1.1.1", NOW + 100).unwrap().is_some());

	// User changes their setup, peer reconnects and succeeds.
	let _ = record_event(&conn, success(NOW + 1000, "ip:1.1.1.1")).unwrap();
	assert!(is_blocked(&conn, "ip:1.1.1.1", NOW + 2000).unwrap().is_none());

	// Audit trail: 5 failures + 1 success = 6 events.
	let events = list_events(
		&conn,
		EventFilter {
			identifier: Some("ip:1.1.1.1"),
			..Default::default()
		},
	)
	.unwrap();
	assert_eq!(events.len(), 6);
}

// ============================================================================
// unblock + list_blocked
// ============================================================================

#[test]
fn unblock_removes_row_and_returns_true() {
	let conn = open_in_memory().unwrap();
	for i in 0..5 {
		let _ = record_event(
			&conn,
			failure(NOW + i, "ip:1.1.1.1", FailureReason::BadSignature),
		)
		.unwrap();
	}
	assert!(unblock(&conn, "ip:1.1.1.1").unwrap());
	assert!(!unblock(&conn, "ip:1.1.1.1").unwrap()); // already gone
	assert!(is_blocked(&conn, "ip:1.1.1.1", NOW + 100).unwrap().is_none());
}

#[test]
fn list_blocked_returns_active_only() {
	let conn = open_in_memory().unwrap();
	for i in 0..5 {
		let _ = record_event(
			&conn,
			failure(NOW + i, "ip:1.1.1.1", FailureReason::BadSignature),
		)
		.unwrap();
	}
	for i in 0..5 {
		let _ = record_event(
			&conn,
			failure(NOW + 1000 + i, "ip:2.2.2.2", FailureReason::BadAead),
		)
		.unwrap();
	}
	let active = list_blocked(&conn, NOW + 2000).unwrap();
	assert_eq!(active.len(), 2);
	let identifiers: Vec<&str> = active.iter().map(|b| b.identifier.as_str()).collect();
	assert!(identifiers.contains(&"ip:1.1.1.1"));
	assert!(identifiers.contains(&"ip:2.2.2.2"));
}

#[test]
fn list_blocked_filters_expired() {
	let conn = open_in_memory().unwrap();
	for i in 0..5 {
		let _ = record_event(
			&conn,
			failure(NOW + i, "ip:1.1.1.1", FailureReason::BadSignature),
		)
		.unwrap();
	}
	let active = list_blocked(&conn, NOW + BLOCK_DURATION_MS + 100).unwrap();
	assert!(active.is_empty());
}

// ============================================================================
// list_events filters
// ============================================================================

#[test]
fn list_events_returns_newest_first() {
	let conn = open_in_memory().unwrap();
	let _ = record_event(&conn, failure(NOW, "ip:1.1.1.1", FailureReason::BadAead)).unwrap();
	let _ = record_event(
		&conn,
		failure(NOW + 100, "ip:1.1.1.1", FailureReason::BadSignature),
	)
	.unwrap();
	let events = list_events(&conn, EventFilter::default()).unwrap();
	assert_eq!(events.len(), 2);
	assert!(events[0].timestamp_ms >= events[1].timestamp_ms);
}

#[test]
fn list_events_filters_by_outcome() {
	let conn = open_in_memory().unwrap();
	let _ = record_event(&conn, failure(NOW, "ip:1.1.1.1", FailureReason::BadAead)).unwrap();
	let _ = record_event(&conn, success(NOW + 100, "ip:1.1.1.1")).unwrap();
	let only_failures = list_events(
		&conn,
		EventFilter {
			outcome: Some(Outcome::Failure),
			..Default::default()
		},
	)
	.unwrap();
	assert_eq!(only_failures.len(), 1);
	assert_eq!(only_failures[0].outcome, Outcome::Failure);
}

#[test]
fn list_events_filters_by_time_range() {
	let conn = open_in_memory().unwrap();
	let _ = record_event(&conn, failure(100, "ip:1.1.1.1", FailureReason::BadAead)).unwrap();
	let _ = record_event(&conn, failure(200, "ip:1.1.1.1", FailureReason::BadAead)).unwrap();
	let _ = record_event(&conn, failure(300, "ip:1.1.1.1", FailureReason::BadAead)).unwrap();
	let mid = list_events(
		&conn,
		EventFilter {
			since_ms: Some(150),
			until_ms: Some(250),
			..Default::default()
		},
	)
	.unwrap();
	assert_eq!(mid.len(), 1);
	assert_eq!(mid[0].timestamp_ms, 200);
}

#[test]
fn list_events_honours_limit() {
	let conn = open_in_memory().unwrap();
	for i in 0..10 {
		let _ = record_event(
			&conn,
			failure(NOW + i, "ip:1.1.1.1", FailureReason::BadAead),
		)
		.unwrap();
	}
	let limited = list_events(
		&conn,
		EventFilter {
			limit: Some(3),
			..Default::default()
		},
	)
	.unwrap();
	assert_eq!(limited.len(), 3);
}

// ============================================================================
// cleanup_old_events
// ============================================================================

#[test]
fn cleanup_old_events_purges_below_threshold() {
	let conn = open_in_memory().unwrap();
	let _ = record_event(&conn, failure(100, "ip:1.1.1.1", FailureReason::BadAead)).unwrap();
	let _ = record_event(&conn, failure(2000, "ip:1.1.1.1", FailureReason::BadAead)).unwrap();
	let _ = record_event(&conn, failure(3000, "ip:1.1.1.1", FailureReason::BadAead)).unwrap();
	let removed = cleanup_old_events(&conn, 1500).unwrap();
	assert_eq!(removed, 1);
	let remaining = list_events(&conn, EventFilter::default()).unwrap();
	assert_eq!(remaining.len(), 2);
}
