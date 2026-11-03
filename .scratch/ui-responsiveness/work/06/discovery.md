# Issue 06 discovery

No `spec.md` in the feature folder; plan from the Issue.

## Files and plan (one commit per item)

1. Watcher temp filter: `src-tauri/src/vault/watcher.rs`. New pure `is_write_atomic_temp(path)`: the last path segment ends in `.tmp-<digits>-<digits>` with a non-empty stem before it (the name `write_atomic` builds at `utils/fs.rs:26`). `run_debounce_loop` (`watcher.rs:186-191`) drops it next to `is_inside_hidden_dir`. Unit tests in the `watcher.rs` test module; an integration test in `src-tauri/tests/vault_watcher_test.rs` runs the real `write_atomic` on `dir/note.md` under a live watcher.
2. `scan_vault` async: `commands/vault.rs:109`. The sync body becomes `pub fn scan_vault_inner(path, sort_by)`; `#[tauri::command] pub async fn scan_vault` wraps it in `tokio::task::spawn_blocking`, same shape as `build_search_index` (`commands/search_index.rs:38-43`). `tests/commands/vault_test.rs` switches its calls to `scan_vault_inner`, plus one `#[tokio::test]` through the async wrapper. Command name and args are unchanged, so `lib.rs:333` and the TS side are untouched.
3. Generation guard: `fs.service.ts:74-102` `loadDirectoryTree`. A module counter bumped at entry; after the IPC await, a call that is no longer the newest skips the order + `setFileTree` (loading counter and errors unchanged). Test in `fs.service.test.ts` `describe('loadDirectoryTree')`: two calls, the first's `scan_vault` resolves last, the newer tree stays.
4. Watcher rebase: `fs.watcher.ts:220-249`. The incremental branch collects `(parentDir, subtree)` pairs across its awaits, then applies every patch to the current `fsStore.fileTree` in one synchronous step and writes once. Test in `fs.watcher.test.ts` `describe('vault-files-changed handling')`: two batches for `/vault/a` and `/vault/b`, the first batch's scan resolves last, both new files end up in the tree.

## Prior-art tests

- `fs.watcher.test.ts` `setupWatcher()` + `emit`, `invoke` mocked per command.
- `fs.service.test.ts` `loadDirectoryTree` block (`invoke` mocked, real `fsStore`).
- Rust: `watcher.rs` `hidden_filter_*` unit tests; `vault_watcher_test.rs` `watcher_emits_on_file_creation`.

## Risks and defaults

- A user file whose name really ends in `.tmp-<digits>-<digits>` is now ignored by the watcher (it still shows on the next full scan). Accepted: the pattern is the `write_atomic` shape.
- The rebase covers watcher-vs-watcher and watcher-after-full-load. A full load that started before a watcher patch and lands after it still overwrites with its own (fresh-from-disk) tree; Issue 09 owns app-initiated updates.
- A stale `loadDirectoryTree` still resolves (no throw), so `refreshTree` callers that await it see the newer call's tree once that one lands.
- On the incremental branch, a mid-loop scan failure still falls back to a full refresh and discards the collected patches (unchanged).
