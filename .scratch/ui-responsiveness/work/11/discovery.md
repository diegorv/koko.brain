# Issue 11 discovery

No `spec.md` exists for ui-responsiveness; the Issue and research/A-verify.md (F4) are the inputs.

## Files that change

- `src/lib/features/search/search.service.ts:334-357` `initSemanticSearch()`: add `{ fetchStats = true }` option; skip `get_semantic_stats` when false.
- `src/lib/app/lifecycle/app-lifecycle.service.ts:451` startup path calls `initSemanticSearch({ fetchStats: false })`; `buildSemanticIndex()` right after sets the same stats. `SearchSection.svelte:78` keeps the default (it still fetches).
- `src-tauri/src/commands/history.rs:56-77` `save_snapshot` -> `async fn` + `tokio::task::spawn_blocking` (pattern: `commands/semantic.rs:367`).
- `src-tauri/src/commands/semantic.rs:1164-1173` `get_semantic_file_status` -> same.
- `src/lib/features/search/SemanticIndexStatus.svelte:28-52`: stale-response guard. It already has one (effect cleanup sets `cancelled`), so the component test pins it rather than changing it.

## Tests (prior art)

- `src/tests/lib/features/search/search.service.test.ts:465` initSemanticSearch: add "fetchStats false skips get_semantic_stats".
- `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts:1251`: startup path passes `{ fetchStats: false }` (search.service is mocked there).
- New `src/tests/lib/features/search/SemanticIndexStatus.test.ts` (jsdom mount, pattern `src/tests/lib/core/settings/GeneralSection.test.ts`): tab A request held, tab B resolves, then A resolves last; label shows B.
- Rust: `src-tauri/tests/history_test.rs` and `semantic_commands_test.rs:508-552,708` switch the affected calls to `#[tokio::test]` + `.await` (pattern `semantic_commands_test.rs:361`, `#![allow(clippy::await_holding_lock)]`).

## Defaults taken

- Criterion 1 (a session log with `[MAIN-HB]`) needs the running app and a cache load; an agent cannot produce it. Left for the owner. The async part is built anyway: it is cheap, and the Issue's criteria 3-4 cover it. If the owner's log shows no wait, the Rust async change can be reverted alone (own commit).
- The stale-response test cannot "fail first": the guard pre-exists. Recorded honestly in the report.

## Risks

- `save_snapshot` off the main thread: two snapshot calls for one file could now run concurrently. Body saves are debounced (2 s; 500 ms for frontmatter), and `created_at` is taken before the lock while `find_latest_hash` orders by `created_at`, so the window is small; noted, not handled. Per-file serialisation by the editor was not verified.
- Startup stats now arrive only when `buildSemanticIndex` finishes; during a long first build the status bar shows the indexing spinner anyway (`SearchStatus.svelte:14`). A failed startup build leaves stats null (display only).
