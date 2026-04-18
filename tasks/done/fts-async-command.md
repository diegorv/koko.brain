# FTS Build — Convert Tauri Command to Async + spawn_blocking

During startup profiling we found that `build_search_index` holds the Tauri
IPC thread for ~3 seconds (full rebuild of 1829 docs). Because the command is
declared as synchronous (`pub fn`), all other `invoke()` and `listen()` calls
queue behind it — including `await startSemanticProgressListener()` in
`initializeVault`, which noticeably delays the "ready" moment of the app.

The semantic index sibling (`build_semantic_index`) already uses the correct
pattern: `pub async fn` + `tokio::task::spawn_blocking`. This task brings
FTS in line.

This is step A of a two-step fix. Step B (skip rebuild when the index is
already populated and the mtimes match) is tracked separately and gives the
bigger wall-clock win; step A is the cheap, targeted fix that keeps the IPC
thread free while the rebuild does run.

## Tasks

- [x] Task A: Split `build_search_index` in `src-tauri/src/commands/search_index.rs`
  into a sync helper `build_search_index_inner` (keeps the current body) plus a
  thin `#[tauri::command] pub async fn build_search_index` wrapper that offloads
  the inner to `tokio::task::spawn_blocking`. Update the existing Rust tests in
  `src-tauri/tests/search_fts_test.rs` to call the inner helper — they remain
  synchronous, no `#[tokio::test]` change needed.

## Notes

- Frontend invoke call shape (`invoke('build_search_index', { vaultPath })`)
  does not change — Tauri marshals the async return the same way.
- Do not touch `search_fts`, `update_search_index_file`, etc. in this task.
  They are called on small payloads and individually fast; rework them
  separately if profiling shows a problem.
- Step B (skip-when-up-to-date) is a separate plan, not in this one.
