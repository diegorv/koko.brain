//! Poisoned-lock behavior for the global `DB` static in `db::mod`.
//!
//! This lives in its OWN integration-test binary on purpose: poisoning the
//! private `DB` Mutex is irreversible for the process (the module never
//! calls `clear_poison`), so these assertions cannot share a binary with
//! `db_test.rs` — every later `with_db` call there would fail. Keep this
//! file to a single #[test] so no sibling test observes the poisoned state.

use kokobrain_lib::db;
use std::panic::{catch_unwind, AssertUnwindSafe};
use tempfile::TempDir;

#[test]
fn poisoned_db_lock_is_distinguishable_from_closed_database() {
	// 1. Closed database: the error is "Database not open", and is_open()
	//    reports false. This is the baseline to distinguish from poisoning.
	let closed_err = db::with_db(|_conn| Ok(())).unwrap_err();
	assert_eq!(closed_err, "Database not open");
	assert!(!db::is_open(), "closed database must report is_open() == false");

	// 2. Open a real database so the closure actually runs (a closed DB
	//    short-circuits before the panic point and would never poison).
	let tmp = TempDir::new().unwrap();
	db::open_database(tmp.path()).unwrap();
	assert!(db::is_open(), "database must be open before poisoning");

	// 3. Poison the DB Mutex: panic while with_db holds the lock guard.
	let unwound = catch_unwind(AssertUnwindSafe(|| {
		let _ = db::with_db(|_conn| -> Result<(), String> {
			panic!("intentional panic to poison the DB lock");
		});
	}));
	assert!(unwound.is_err(), "the panic must propagate out of with_db");

	// 4. is_open() treats a poisoned lock as "no vault open" (graceful
	//    degradation via unwrap_or(false)) even though the connection is
	//    still Some behind the Mutex.
	assert!(!db::is_open(), "is_open() must return false on a poisoned lock");

	// 5. with_db now reports a lock error — NOT "Database not open". The
	//    two failure modes stay distinguishable for callers.
	let err = db::with_db(|_conn| Ok(())).unwrap_err();
	assert!(err.starts_with("Lock error:"), "got: {err}");
	assert!(err.contains("poisoned"), "got: {err}");
	assert_ne!(err, "Database not open");

	// 6. Transactions on the same Mutex surface the same lock error.
	let tx_err = db::with_db_transaction("poison-test", |_conn| Ok(())).unwrap_err();
	assert!(tx_err.starts_with("Lock error:"), "got: {tx_err}");

	// 7. The FTS connection has its own independent Mutex: still usable.
	let fts_result = db::with_fts_db(|_conn| Ok(42));
	assert_eq!(fts_result.unwrap(), 42, "FTS_DB must be unaffected by DB poisoning");

	// 8. close_database() must lock DB first, so it also reports the
	//    lock error instead of silently pretending to close.
	let close_err = db::close_database().unwrap_err();
	assert!(close_err.starts_with("Lock error:"), "got: {close_err}");
}
