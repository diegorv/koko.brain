---
summary: "Search UI, search state, and frontend orchestration of FTS, semantic and hybrid queries."
---

## Responsibility

Owns the frontend Search surface: the panel, result list, status indicators and the settings section for semantic models. It holds the search store (query, mode, per-mode results, index and model status, progress), the service that runs text, semantic and hybrid queries and drives index build and incremental update on save, the semantic progress listener, and the openSearch entry point used by shortcuts, commands and links. Pure helpers for query operators, snippets, RRF merge and status labels are in .logic.ts files. It does not own the search engine (Rust, src-tauri/src/search and src-tauri/src/semantic) or index maintenance on external edits, deletes and renames, which core/filesystem drives.

## Key files

- `src/lib/features/search/search.service.ts`: Runs text, semantic and hybrid queries, builds and updates indexes, owns the progress listener and search reset.
- `src/lib/features/search/search.store.svelte.ts`: Module-level search state behind getters and setters, with reset for teardown.
- `src/lib/features/search/search.types.ts`: Frontend search types; index and result contract types re-exported from generated contracts.
- `src/lib/features/search/search.logic.ts`: Query operator parsing (tag:, path:), in-memory fallback search, snippet helpers.
- `src/lib/features/search/search-hybrid.logic.ts`: Reciprocal Rank Fusion merge of text and semantic results for the legacy hybrid path.
- `src/lib/features/search/open-search.service.ts`: Single entry point that selects the Search rail item, shows panels and focuses the input.
- `src/lib/features/search/SearchPanel.svelte`: Search input, mode switch, fuzzy toggle and result list host.
- `src/lib/features/search/SearchSection.svelte`: Settings section for semantic and reranker model availability and downloads.
- `src/lib/features/search/SemanticIndexStatus.svelte`: Status bar label showing whether the active note is indexed.

## State

- Module-level $state in search.store.svelte.ts: query, results, isSearching, focus request counters, mode, fuzzyEnabled, ftsResults, semanticResults, hybridResults, indexStats, isIndexing, semanticStats, isSemanticIndexing, semanticProgress, modelAvailable.
- Module variables in search.service.ts: progress listener handle, progress throttle timer and pending payload, searchVersion, activeBuildPromise, buildGeneration.
- No browser storage or files; index data lives on the Rust side.

## Collaborators

- `IPC:build_search_index`: Builds the FTS index on vault open.
- `IPC:search_fts`: Text mode query, with fuzzy flag.
- `IPC:search_hybrid`: Hybrid mode: FTS plus semantic with rerank in one command.
- `IPC:search_semantic`: Semantic mode query.
- `IPC:update_search_index_file`: Incremental FTS update after save.
- `IPC:update_semantic_file`: Incremental semantic update after save.
- `IPC:build_semantic_index`: Full chunk and embed build.
- `IPC:init_semantic_search`: Loads the embedder and tokenizer.
- `IPC:is_semantic_model_available`: Model presence check for the store.
- `IPC:get_semantic_stats`: Semantic index statistics after init.
- `IPC:get_semantic_file_status`: Per-note index status for the status bar label.
- `IPC:is_reranker_model_available`: Reranker model presence in SearchSection.
- `IPC:download_semantic_model`: Model download from SearchSection.
- `IPC:download_reranker_model`: Reranker download from SearchSection.
- `IPC:get_all_vault_entries_v2`: Entries for operator-only queries, tag filtering and the FTS failure fallback.
- `IPC:read_files_batch`: Reads note contents for the in-memory fallback only.
- `event:semantic-index-progress`: Progress events during semantic builds, consumed by the progress listener.
- `src/lib/core/editor`: addAfterSaveObserver for the incremental index hook; openFileInEditor and open-note-at for result activation.
- `src/lib/core/vault`: Vault path for IPC calls.
- `src/lib/core/settings`: Layout updates in openSearch and search settings values.
- `src/lib/core/filesystem`: isViewFile; separately, note-change.service updates the FTS and semantic indexes on non-save upserts and removes, and path-change.service renames index entries, outside this folder.
- `src/lib/features/rail-shell`: SEARCH_RAIL_ITEM from lens.logic used by openSearch.
- `src/lib/features/event-calendar`: ShowInCalendarButton in results.
- `src/lib/features/tags`: TagsView calls openSearch with a tag: query.
- `src/lib/features/deep-link`: kokobrain://search calls openSearch.
- `src/lib/contracts`: IPC call and event name contracts and generated types.
- `src/lib/app`: app-lifecycle builds and initializes indexes, registers the hook, starts and stops the listener, resets; AppShell, SettingsPanel mount components; commands, global-keybindings, rail-navigation and editor-host call openSearch.
- `src/routes/(app)`: +layout.svelte calls performSearch and reads the query.

## Gotchas

- performSearch returns early after a successful search_hybrid call. The legacy FTS plus semantic merge runs only when the hybrid call throws.
- performSearch uses a searchVersion counter and every await must re-check it, or a slow older query overwrites newer results.
- tag: and path: prefixes are stripped before semantic and hybrid calls so embeddings receive plain text. Text mode sends the raw query when it has no operators.
- Operator-only queries and tag filtering use tags from get_all_vault_entries_v2. loadVaultContentMap reads every note through read_files_batch and is used only by the FTS failure fallback.
- Index maintenance is split. registerSearchIndexHook covers saves here, while core/filesystem note-change.service handles other upserts and removes and path-change.service handles renames. Rename must run before the removal sweep, as documented in path-change.service.
- A semantic update failure after save is logged at debug level only, while an FTS update failure is logged as an error.
- Progress events are throttled within a phase, but a phase change is flushed immediately.
- buildSemanticIndex deduplicates concurrent calls with activeBuildPromise. resetSearch bumps buildGeneration so a build started for a previous vault discards its stats.
- Search result and index types come from generated contracts; change them in Rust.
- The store exposes getters over module-level $state with no $derived values.
- openSearch writes the rail item and panel visibility through settingsStore.updateLayout, so any caller changes layout as well as the query.
