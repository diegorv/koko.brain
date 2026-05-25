//! Phase 7 — Task integration tests (FS-level, TempDir, VaultIndex).
//!
//! Unit tests for `extract_tasks`, `extract_tasks_from_section`,
//! `parse_task_metadata`, `map_checkbox_char`, and `toggle_task_in_content`
//! live inline in `src/vault/parsing.rs`.

use kokobrain_lib::commands::vault::toggle_task_status_inner;
use kokobrain_lib::vault::index::VaultIndex;
use std::sync::{Arc, Barrier};
use std::thread;

// --- Audit finding #9 — toggle_task_status FS-level TOCTOU --------------------
//
// `commands/vault.rs::toggle_task_status_inner` does read -> modify -> write
// on the file on disk (lines 559, 561, 574). The write-lock on VaultIndex
// is held throughout, but the FILE has no lock. Another process (external
// vim, Obsidian running in parallel, sync apps like iCloud/Dropbox/
// Syncthing) that rewrites the file between the read and the write gets
// its changes silently overwritten.
//
// Marked #[ignore] because the result is timing-dependent -- thread B's
// few-microsecond sleep can land before/during/after thread A's
// read-write window. Repeats N iterations to raise the chance that at
// least one lands in the bad window.
//
// Audit plan: ~/.claude/plans/atue-como-um-auditor-witty-minsky.md (Appendix A.3).

#[test]
#[ignore]
fn audit_finding_9_toggle_task_loses_concurrent_external_edit() {
	const ITERATIONS: usize = 200;
	let mut lost = 0;

	for _i in 0..ITERATIONS {
		let dir = tempfile::tempdir().unwrap();
		let path = dir.path().join("note.md");
		std::fs::write(&path, "- [ ] Buy milk\n- [ ] Write tests\n").unwrap();
		let path_str = path.to_string_lossy().to_string();
		let path_b = path_str.clone();

		// Barrier synchronizes so both threads start at roughly the same time.
		let barrier = Arc::new(Barrier::new(2));
		let barrier_b = Arc::clone(&barrier);

		let h = thread::spawn(move || {
			barrier_b.wait();
			// Short sleep to try to land between the read (l. 559) and
			// the write (l. 574) of toggle_task_status_inner. Value chosen
			// empirically; too small lands before the read, too large
			// lands after the write.
			thread::sleep(std::time::Duration::from_micros(10));
			let _ = std::fs::write(
				&path_b,
				"- [ ] Buy milk\n- [ ] Write tests\n- [ ] Externally added\n",
			);
		});

		let mut idx = VaultIndex::default();
		barrier.wait();
		let _ = toggle_task_status_inner(&mut idx, &path_str, 1);
		h.join().unwrap();

		let final_content = std::fs::read_to_string(&path).unwrap();
		// If the external edit was lost (toggle_task wrote AFTER thread B's
		// write), "Externally added" will not be in the file.
		if !final_content.contains("Externally added") {
			lost += 1;
		}
	}

	// We don't assert `lost == 0` because the test is probabilistic -- the
	// goal is to DETECT when the TOCTOU window is exercised in practice.
	// We print and fail only if it NEVER lands in the window (unlikely in
	// 200 iterations; if zero, revisit the test setup, e.g. sleep timing).
	// Users running this manually will see "lost > 0" as bug confirmation.
	eprintln!(
		"audit_finding_9: {} of {} iterations lost the external edit (FS race confirmed when >0)",
		lost, ITERATIONS
	);
	assert!(
		lost > 0 || ITERATIONS == 0,
		"expected at least 1 loss in {} iterations to confirm the TOCTOU window; \
		if always 0, adjust thread B's sleep timing",
		ITERATIONS
	);
}

#[test]
#[ignore]
fn audit_finding_9_toggle_task_no_concurrent_writer_preserves_state() {
	// Deterministic counterpart: WITHOUT a concurrent thread,
	// toggle_task_inner produces the expected result. Serves as baseline
	// and sanity check to distinguish a TOCTOU bug (#9) from a bug in
	// toggle itself.
	let dir = tempfile::tempdir().unwrap();
	let path = dir.path().join("note.md");
	std::fs::write(&path, "- [ ] Buy milk\n- [ ] Write tests\n").unwrap();
	let path_str = path.to_string_lossy().to_string();

	let mut idx = VaultIndex::default();
	let result = toggle_task_status_inner(&mut idx, &path_str, 1).unwrap();

	let final_content = std::fs::read_to_string(&path).unwrap();
	assert_eq!(final_content, "- [x] Buy milk\n- [ ] Write tests\n");
	assert_eq!(result.updated_content, final_content);
}
