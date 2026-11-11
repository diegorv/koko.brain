VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `todoist_state_test.rs:210-221` now opens and closes the other vault before `setup()`, and asserts `other/.kokobrain/kokobrain.db` exists. With that file present, the `canonicalize` in `ensure_open_vault` (`db/mod.rs:165-169`) succeeds, so only the `open != expected` check at `db/mod.rs:170` can produce "not the open vault". The test now fails if that comparison is removed. `setup()` still runs `close_database()` first, so the main vault is the open one when the commands run. 10 of 10 pass. |
| 2 | minor | resolved | `settings.logic.ts:168-173` returns 5 when `typeof minutes !== 'number'`, before rounding. The new case at `settings.logic.test.ts:581-589` drives `normalizeSettings` with `null` and `'10'` and expects 5. The UI caller (`TodoistSection.svelte:45-50`) passes only finite numbers, so its behavior does not change, and TodoistSection.test still passes. |
| 3 | nit | rejection stands | Nothing reads `syncFolder` in this Issue, and the finding itself puts the path rules in the engine ticket. |
| 4 | nit | rejection stands | The connection-check counts filter `checked`, so the fake's full-sync behavior has no effect here. The adoption ticket owns the fix. |

## Acceptance criteria re-checked

- [met] `TodoistSettings` gains flat keys `syncEnabled` (false), `syncFolder` (`Todoist`), `syncIntervalMinutes` (5, min 1), `syncContext` (`'work' | 'personal'`, default `'work'`, design rule 8b), `syncRootProjectId` (empty = sync off) chosen from a project list fetched from Todoist, and `syncIncludeInbox` (false) (design rule 8c), shown in the Todoist settings section; the context control explains that a work vault lets the webhook add `Work` and a personal vault sends `personal`. — the fix keeps the minimum of 1 and the default of 5, and a non-number now becomes the default 5 (`settings.logic.ts:168-173`). `src/tests/lib/core/settings` and `TodoistSection.test.ts` pass (41 files, 779 tests).
- [met] Schema module creates `todoist_kv`, `todoist_task_link` (anchor PK, todoist_id, note_rel_path, local_base, remote_base, pending_uuid, pending_cmd, miss_count, frozen), `todoist_sync_log` (newest 1000 rows kept). IPC commands read and write them; a multi-row update plus the `sync_token` commit in one transaction. Every command takes the vault root the caller believes is open and refuses a mismatch. — the refusal test now covers a real vault switch, where both vaults have a database. `cargo test --test todoist_state_test`: 10 passed.
- [met] Gate: Both; commit regenerated bindings. — the fixes change no `#[ts(export)]` type. `pnpm check`: 0 errors, 0 warnings. `cargo test --test todoist_state_test`: ok. `cargo clippy --all-targets -- -D warnings`: exit 0 (the fix report had not re-run it). The full vitest and cargo suites are deliver's to run.

## Findings

No open or new findings. The fixes touch only the two files the findings named, their tests, and review.md's Resolution. No test was weakened or deleted, and `layer-baseline.json`, `BASELINE_SIZE` and the composition roots are unchanged.

## Checks run

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/core/settings src/tests/lib/features/todoist-sync/TodoistSection.test.ts`: exit 0, 41 files, 779 tests.
- `cargo test --manifest-path src-tauri/Cargo.toml --test todoist_state_test`: exit 0, 10 passed.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`: exit 0.
