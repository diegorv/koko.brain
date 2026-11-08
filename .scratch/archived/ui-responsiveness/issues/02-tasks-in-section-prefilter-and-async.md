# 02: `get_tasks_in_section_v2` reads only notes with tasks, off the main thread

**Status:** resolved

Priority: P1 (quick-win bundle; 57 s of main-thread blocking over 12 sessions)

**What to build:** `get_tasks_in_section_v2` (`src-tauri/src/commands/vault.rs:614-656`) is a sync command, so Tauri runs it on the app main thread ("Commands without the async keyword are executed on the main thread", https://v2.tauri.app/develop/calling-rust/). It holds the `VaultIndex` read guard and calls `read_to_string` for every note (`:632`). Every other sync command queues behind it (verified); async invokes probably do too, since WKWebView delivers IPC on the main thread (inferred). Max 6,164 ms, 17 calls, 57.5 s total in 12 sessions. Triggers left after Issue 01: each Tasks-tab activation and two scans per task toggle (`tasks.service.ts:137` plus the throttled bump, `tauri-listeners.service.ts:106,109`).

1. **Prefilter** (quick win): `if entry.tasks.is_empty() { continue; }` before `read_to_string`. It is exact: `NoteEntry.tasks = extract_tasks(content)` over the full content (`vault/entry.rs:244`), and `extract_tasks_from_section` (`parsing.rs:1704-1750`) uses the same split, fence logic and `parse_task_line` as `extract_tasks` (`:1676-1698`) plus a heading gate, so section tasks are a subset. Log K (notes read) once per call. Fix the stale doc comment (`vault.rs:607-613`).
2. **Off the main thread:** make the command `async` with `spawn_blocking`. Copy the `(path, modified_at)` candidates under a brief read guard and read the files outside the lock: holding the guard across reads would block sync writers such as `update_note_in_index` (`vault.rs:302-316`), which take `.write()` on the main thread. Async commands with borrowed args must return `Result` (see the Tauri page above).
3. **Sequence guard in `buildTaskIndex`** (`tasks.service.ts:54`): async completion can land out of order (explicit call plus bump), so only the latest request may write the store.

**Blocked by:** none

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build` (Rust and frontend)

**Source:** src-tauri/src/commands/vault.rs:600-656, src-tauri/src/vault/entry.rs:244, src-tauri/src/vault/parsing.rs:1676-1750, src/lib/features/tasks/tasks.service.ts:54-80,137, src/lib/app/tauri-listeners.service.ts:106-109

- [x] Failing first: move the loop into `tasks_in_section(entries, tag, read)` with an injected `read`. Note A has a `## Todo #to-list` task, note B has none. Assert `read` is called only for A
- [x] Parity test: on a fixture vault the result equals the unfiltered loop
- [x] Failing first: two overlapping `buildTaskIndex` calls where the first resolves last; the newer result wins
- [x] Existing Rust tests for the command stay green
- [x] Not verified by the agent: K for the owner's vault (the gain is about N/K; the bench's 14-22x was an assumed task share, not a measurement)

## Notes

- Item 1 is the quick win and stands alone. If items 2-3 turn out harder than expected (lock handling, parallel scans on toggle), ship item 1 and move 2-3 to a follow-up Issue rather than holding it back. The verifier rates 2-3 as low marginal value after item 1.

- If K stays large (templates with checkboxes), storing heading marks in `NoteEntry` removes the disk reads entirely. That needs an `INDEX_SCHEMA_VERSION` bump and must not leak into the `#[ts(export)]` DTO. Not in this Issue; see `A-deep-dive.md` F5 and the nested-heading quirk at `parsing.rs:1736-1741`.
- Research: `.scratch/ui-responsiveness/research/A-deep-dive.md` (F1, F3), `A-verify.md`.

## Comments

- 2026-11-02, branch `issue/02-tasks-in-section-prefilter-and-async`: `get_tasks_in_section_v2` now prefilters to notes whose index entry has tasks (`section_task_candidates`) and reads them in `spawn_blocking` after dropping the index guard; `buildTaskIndex` keeps only the latest call's result and error, and `resetTasks` invalidates calls in flight. Tests: pnpm check 0 errors; targeted vitest 273 passed; full suite exit=0 (439 files, 10135 passed, 1 skipped, 1 todo); cargo test 1223 passed (round-1 reviewer). Reviews: round 1 APPROVED (findings 1 and 3 fixed, 2 no change, 4 rejected), round 2 APPROVED with no findings. Measuring K needs Debug mode on (`debug_log`).
