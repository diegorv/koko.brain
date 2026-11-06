# 62: The status bar note count follows notes created, imported and deleted during the session

**What to build:** `searchStore.setIndexStats` is called only by `buildSearchIndex` (src/lib/features/search/search.service.ts:288), which runs at vault open. The incremental FTS paths update rows but never the stats: the after-save hook (`registerSearchIndexHook`, search.service.ts:301-330, update at :320), `applyNoteChange` updates (src/lib/core/filesystem/note-change.service.ts:247) and deletes (:209). `setSemanticStats` is likewise only set by init and full build (search.service.ts:356, :398). SearchStatus.svelte:19-28 renders the frozen numbers. Fix direction: refresh the counts after incremental index changes, coalesced (for example on the throttled vault-index-updated refresh, not per keystroke save). Rust already has `fts_repo::count_entries` (src-tauri/src/db/fts_repo.rs:245) and `get_semantic_stats` (src-tauri/src/commands/semantic.rs:1220); a cheap FTS count command or returning the count from the incremental commands are both fine.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/search/search.service.test.ts: after `buildSearchIndex` resolves with totalDocuments 42, an incremental index change for a new note runs (through the registered after-save hook or the chosen refresh trigger) with the IPC that reports the FTS count mocked to 43; once it settles, `searchStore.indexStats.totalDocuments` is 43. It fails today (stays 42).
- [ ] A delete through applyNoteChange lowers the count the same way.
- [ ] With semantic search enabled, the chunk count shown next to it is refreshed by the same trigger.
- [ ] A failed count read leaves the previous stats in place and is logged with `error()`.
- [ ] If a Rust command is added, it has a test in src-tauri/tests (search_fts_test.rs or fts_repo_test.rs) and an entry in src/lib/contracts/commands.ts.
- [ ] Gate: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` pass (frontend only if no Rust change).

## Notes

- **Priority:** polish (bucket 3-polish). Polish/medium. The count stays at the vault-open value for the whole session.
- **Trigger:** Open the vault, then create notes (daily note, Quick Capture, new note) or delete one, and read 'N notes indexed' (or 'N notes · M chunks') in the status bar. It keeps the vault-open number until the next launch.
- **Evidence (verified by reading code at `5f8003d67`):** search.service.ts:278-294 buildSearchIndex, the only setIndexStats caller (:288), run from initializeVault. search.service.ts:301-330 after-save hook calls update_search_index_file / update_semantic_file and discards the result. note-change.service.ts:209 remove_from_search_index, :247 update_search_index_file, results not read. search.service.ts:356, :398 the only setSemanticStats callers. search.store.svelte.ts:65,67 setters, :83,:85 reset. SearchStatus.svelte:22 and :27 render indexStats.totalDocuments and semanticStats.totalChunks. src-tauri/src/db/fts_repo.rs:245 count_entries, used only by search_index.rs:115 in the full build.
- **Related Issues before the audit:** `.scratch/ux-polish/issues/14-search-panel-drops-duplicate-index-status.md`, `.scratch/file-io-audit/issues/28-watcher-index-staleness.md`
- **Source:** audit 2026-11-05, domain `reactivity`, finding `N-reactivity-03` (from reactivity-reactivity-4). Size S.

**Second opinion (audit 2026-11-05, round 2):** upheld (polish, medium). Confirmed. setIndexStats has one caller, buildSearchIndex (search.service.ts:288), and buildSearchIndex is called only from app-lifecycle.service.ts:425. setSemanticStats has two callers (:356, :398). The after-save hook (:320) and applyNoteChange (note-change.service.ts:209, :247) discard their results. SearchStatus is mounted in AppShell.svelte:305 and renders the frozen totalDocuments. fts_repo::count_entries (:245) and get_semantic_stats (semantic.rs:1220) exist as stated, and src-tauri/tests has fts_repo_test.rs and search_fts_test.rs. Any create or delete leaves the count stale.

## Comments
