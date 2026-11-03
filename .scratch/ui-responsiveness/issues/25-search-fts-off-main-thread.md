# 25: A text search no longer blocks the app main thread while FTS runs

**Status:** resolved

Priority: P2 (every text search blocks the UI for as long as its FTS query takes, 0.8 s for a fuzzy "OKR" on a 10.6k-note vault, and the search box fires a search per query)

**What to build:** `search_fts` is a sync `pub fn` Tauri command (`src-tauri/src/commands/search_index.rs:148-160`), so it runs on the app main thread; Issues 06, 11 and 23 established the same for `scan_vault`, the semantic status commands and `read_files_batch`, each with a `[MAIN-HB]` stall. Its siblings in the same file are already `async fn` over `tokio::task::spawn_blocking` (`update_search_index_file`, `search_index.rs:195-206`, and `remove_from_search_index`), and `search_semantic` and `search_hybrid` are async too. Make `search_fts` the same: an `async fn` that runs `search_fts_inner` (`:164`) in `spawn_blocking` and maps a join error the way `update_search_index_file` does.

The frontend already awaits the call (`call('search_fts', ...)`, `src/lib/features/search/search.service.ts:198`) and drops results of an older search through `searchVersion` (`search.service.ts:77`, checked at `:153-257`), so an out-of-order answer cannot overwrite a newer one. No TS change is expected. `search_fts_inner` stays sync because the hybrid pipeline already calls it from inside `spawn_blocking`.

Evidence from the owner session `2026-11-03_11-40-57.log` (release build):

| Time (log clock, UTC) | Log line |
|---|---|
| 15:33:23.951 | `performSearch() mode=text query="OKR" fuzzy=true` |
| 15:33:24.814 | `[FTS] Results: 50 matches in 860ms` |
| 15:33:24.817 | `[MAIN-HB] stall 791ms` |

The stall was logged 3 ms after the FTS result and is the only `[MAIN-HB]` stall in the user's part of that session. The text search "P" (FTS 73 ms) logged none. The search box runs a search per query, so a slow query freezes typing, scrolling and tab clicks for its whole duration.

**Blocked by:** none

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` (Rust only: no IPC DTO changes, `FtsSearchResult` is untouched)

**Source:** src-tauri/src/commands/search_index.rs:148-185,195, src/lib/features/search/search.service.ts:77,153-257,198

- [x] Failing first: a Rust test awaits `search_fts(...)` (it does not compile while the command is sync) and returns the same hits as `search_fts_inner` for the same query on a seeded FTS database; an empty query returns an empty list
- [x] `search_fts` is an `async fn` that runs `search_fts_inner` in `tokio::task::spawn_blocking` and maps a join error to a `String`, like `update_search_index_file`
- [x] `search_fts_inner`, its hybrid caller, the `FtsSearchResult` type and the TS call and its `searchVersion` guard are unchanged; existing search tests stay green
- [x] Not verified by the agent: on device, a fuzzy text search for "OKR" logs no `[MAIN-HB]` stall over 300 ms (before: 791 ms), and the search results still arrive in order while typing

## Notes

- Seen, not filed: in the same session the fuzzy text searches took 73 ms ("P") and 860 ms ("OKR"), while the four non-fuzzy FTS steps of the hybrid searches took 27 to 46 ms, among them "OKR" at 28 ms 33 s after the 860 ms run. The fuzzy path of `build_fts_query` (called at `search_index.rs:173`, defined at `:312`) may be the cost, but it is one sample and the 860 ms run could have been a cold read, so nothing here says which. Moving the command off the main thread removes the freeze, not the wait. File a separate Issue if the 0.8 s shows up again once the UI stays responsive.
- Sync commands that take the shared FTS database lock still wait on `update_search_index_file` when it holds it; that wait now lands on a worker thread, not on the UI.

## Comments

- 2026-11-03, branch `issue/25-search-fts-off-main-thread`: `search_fts` is now an `async fn` that runs `search_fts_inner` in `tokio::task::spawn_blocking` (join error mapped to a `String`), so a slow fuzzy query no longer runs on the app main thread. Two new `#[tokio::test]` cases in `src-tauri/tests/search_fts_test.rs` check it returns the same hits as `search_fts_inner` and an empty list for an empty query. Review round 1: APPROVED with one nit (perf figure in the doc comment), fixed in a fix round. Review round 2: APPROVED, no findings. Tests: targeted `cargo test --test search_fts_test` 37 passed; full suite (pnpm check + vitest + build + cargo test) first run had one vitest flake in MarkdownEditor.test.ts (passed 15/15 alone, branch changes no frontend code), second run exit 0: 459 files, 10617 tests passed, build passed, cargo test no failures.
