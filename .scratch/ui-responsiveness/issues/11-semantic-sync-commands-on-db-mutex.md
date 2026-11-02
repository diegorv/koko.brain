# 11: UI-path sync commands stop waiting on the semantic DB mutex on the main thread

**Status:** needs-triage

Priority: P3 (suspected main-thread waits during a semantic cache load; the size is unconfirmed)

**What to build:** `get_or_load_cache` holds `SEARCH_CACHE` and then the shared `DB` mutex for the whole cache load (`src-tauri/src/commands/semantic.rs:152-194`, `db/mod.rs:17,110-117`). Sync commands that take the same mutex run on the app main thread and would wait for it: `save_snapshot` (`commands/history.rs:56-77`, every save) and `get_semantic_file_status`. Scout A7 measured an 11.5 s load in another session; no one re-checked it.

1. Confirm the wait with Issue 05's `[MAIN-HB]` and queue-wait lines.
2. Skip the duplicate `get_semantic_stats` fetch on the startup path: `buildSemanticIndex` returns the same stats about 1 ms later (`app-lifecycle.service.ts:450-464`, `search.service.ts:349`). `SearchSection.svelte:78` also calls `initSemanticSearch`, so the call cannot simply be deleted.
3. Make `save_snapshot` and `get_semantic_file_status` async, with a stale-response guard on the TS side.

**Blocked by:** 05

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build` (Rust and frontend)

**Source:** src-tauri/src/commands/semantic.rs:152-194,1377-1390, src-tauri/src/db/mod.rs:17,110-117, src-tauri/src/commands/history.rs:56-77, src/lib/app/lifecycle/app-lifecycle.service.ts:450-464, src/lib/features/search/search.service.ts:349, src/lib/features/search/SearchSection.svelte:78

- [ ] A session log with `[MAIN-HB]` shows whether `save_snapshot` waits during a cache load (record the numbers in Notes)
- [ ] Failing first: the startup path fetches semantic stats once
- [ ] Failing first: an older `get_semantic_file_status` response that lands last does not overwrite a newer one
- [ ] History snapshot tests stay green; a save still writes its snapshot

## Notes

- If step 1 shows no wait, close the async part as wontfix and keep only step 2.
- Research: `.scratch/ui-responsiveness/research/A-verify.md` (correction 6, fix F4), `G-verify.md` (UI-thread claims).
