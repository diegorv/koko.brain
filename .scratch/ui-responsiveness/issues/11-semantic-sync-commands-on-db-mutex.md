# 11: UI-path sync commands stop waiting on the semantic DB mutex on the main thread

**Status:** resolved

Priority: P3 (suspected main-thread waits during a semantic cache load; the size is unconfirmed)

**What to build:** `get_or_load_cache` holds `SEARCH_CACHE` and then the shared `DB` mutex for the whole cache load (`src-tauri/src/commands/semantic.rs:152-194`, `db/mod.rs:17,110-117`). Sync commands that take the same mutex run on the app main thread and would wait for it: `save_snapshot` (`commands/history.rs:56-77`, every save) and `get_semantic_file_status`. Scout A7 measured an 11.5 s load in another session; no one re-checked it.

1. Confirm the wait with Issue 05's `[MAIN-HB]` and queue-wait lines.
2. Skip the duplicate `get_semantic_stats` fetch on the startup path: `buildSemanticIndex` returns the same stats about 1 ms later (`app-lifecycle.service.ts:450-464`, `search.service.ts:349`). `SearchSection.svelte:78` also calls `initSemanticSearch`, so the call cannot simply be deleted.
3. Make `save_snapshot` and `get_semantic_file_status` async, with a stale-response guard on the TS side.

**Blocked by:** 05

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build` (Rust and frontend)

**Source:** src-tauri/src/commands/semantic.rs:152-194,1377-1390, src-tauri/src/db/mod.rs:17,110-117, src-tauri/src/commands/history.rs:56-77, src/lib/app/lifecycle/app-lifecycle.service.ts:450-464, src/lib/features/search/search.service.ts:349, src/lib/features/search/SearchSection.svelte:78

- [ ] A session log with `[MAIN-HB]` shows whether `save_snapshot` waits during a cache load (record the numbers in Notes)
- [x] Failing first: the startup path fetches semantic stats once
- [x] Failing first: an older `get_semantic_file_status` response that lands last does not overwrite a newer one
- [x] History snapshot tests stay green; a save still writes its snapshot

## Notes

- If step 1 shows no wait, close the async part as wontfix and keep only step 2.
- Owner session `2026-11-03_09-36-54.log` (release build, after this Issue): 4 semantic cache loads from the DB (12:37:42 3.0 s, 12:38:43 1.9 s, 12:38:55 0.8 s, 12:39:40 1.0 s, each 156888 chunks, ~438 MB) and 24 saves, none of them inside a load window, so the session cannot show whether a save waits. No `[MAIN-HB]` stall came during a load or a save; the session's only main-thread stalls (246-2267 ms) came from the Tags-tab searches filed as Issue 23. `save_snapshot` reached Rust 0-7 ms after the front-end call for every save. The load holds the DB mutex for 0.8-3.0 s, not the 11.5 s Scout A7 saw, and every save invalidates the search cache, so the next semantic search after a save pays a reload.
- Research: `.scratch/ui-responsiveness/research/A-verify.md` (correction 6, fix F4), `G-verify.md` (UI-thread claims).

## Comments

- 2026-11-03, branch issue/11-semantic-sync-commands-on-db-mutex: the startup path fetches semantic stats once (70949c0e); SemanticIndexStatus has a pinned stale-response guard (972569bc); `save_snapshot` and `get_semantic_file_status` run off the main thread as async commands (f7d84875); fix round: doc comment at semantic.rs:1164 says the DB mutex can be held during a cache load (ee2adb23). Tests: full frontend suite at ee2adb23 exit=0, 449/449 files, 10287 passed, 1 skipped, 1 todo, build OK; cargo test exit=0, 1249 passed, 0 failed, no binding changes; pnpm check 0 errors. Reviews: round 1 APPROVED, round 2 APPROVED (after the fix round). Open, owner work: criterion 1, the `[MAIN-HB]` measurement, is not recorded. If it shows no wait, revert the async part in these 4 Rust files: src-tauri/src/commands/history.rs, src-tauri/src/commands/semantic.rs, src-tauri/tests/history_test.rs, src-tauri/tests/semantic_commands_test.rs.
