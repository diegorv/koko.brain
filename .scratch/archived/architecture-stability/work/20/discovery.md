# Issue 20 discovery

No `spec.md` for architecture-stability; ADR-0003 is the reference. Ratchets from `work/04/`
(layer-baseline) and `work/05/` (featureCycleEdges) are only shrunk here.

## Counts before the move (old paths, all green, 146 tests)

quick-switcher.logic 15, copy-block-link.logic 28, folder-notes.logic 15, backlinks.logic 36
(moving: getNoteName 4 + resolveWikilink 7 + buildResolutionCache 3 + resolveWikilinkCached 6 = 20;
staying: parseWikilinks 11 + noteEntryV2ToBacklinkEntry 5), tags.logic 52 (moving:
extractFrontmatterTags 13 + extractInlineTags 16 + extractAllTags 4 = 33; staying 19).

## Moves (one commit each)

1. `features/quick-switcher/quick-switcher.logic.ts` -> `core/filesystem/file-entries.logic.ts`
   (git mv, test too). Importers: MarkdownEditor.svelte:19, widgets.ts:591, wikilink-navigation.ts:19,
   meta-bind-button-widget.ts:94, completion.ts:3, completion.logic.ts:1, QuickSwitcher.svelte:11,
   KanbanWikilinkSuggestions.svelte:4, kanban.service.ts:7, RelationshipSearch.svelte:7,
   CanvasFilePicker.svelte:3, RailNoteList.svelte:30, PropertiesView.svelte:12, completion.logic.test.ts:8.
2. `backlinks.logic.ts:63-130` -> `core/filesystem/wikilink-resolution.logic.ts`; tests split
   (describes getNoteName..resolveWikilinkCached -> `src/tests/lib/core/filesystem/wikilink-resolution.logic.test.ts`).
   Importers: MarkdownEditor:17, widgets.ts:592, wikilink-navigation:20, meta-bind-button-widget:92,
   completion.ts:6, kb-api.ts:8, queryjs.logic.ts:8, NoteRow:8, kanban.service:8, graph-view.logic:1,
   lens.logic:17, PropertiesView:13, copy-block-link.logic:2, queryjs.logic.test:10, e2e/mocks/vault-index.ts:40.
3. `copy-block-link.logic.ts` -> `core/markdown-editor/copy-block-link/copy-block-link.logic.ts` (git mv + test).
   Service stays; its relative import becomes `#lib/core/...`.
4. `folder-notes.logic.ts` -> `core/filesystem/folder-notes.logic.ts` (git mv + test); the empty
   feature folder goes; CLAUDE.md:67 drops folder-notes. Importers: tauri-listeners.service:15,
   app-lifecycle.service:74, FilesNavigator.svelte:47.
5. `tags.logic.ts:3-127` -> `utils/tag-extraction.ts`; tests split to `src/tests/lib/utils/tag-extraction.test.ts`.
   Importers: search.logic:2, collection.logic:14, e2e/mocks/vault-index.ts:41.
6. `AutoMoveSettings` (references no other type) -> `core/settings/settings.types.ts`; settings.types:348
   and settings.store:2 rewritten.

Each step deletes the layer-baseline lines it makes stale and lowers BASELINE_SIZE; featureCycleEdges
entries that leave the cycle are deleted and FEATURE_CYCLE_EDGES_SIZE lowered. featurePairs is resynced by
the test itself.

## Defaults / risks

- `copy-block-link.logic.ts:92` `export { getNoteName }` predates the Issue and is used by the service; it is
  kept (only its source path changes), not treated as a move shim.
- feature-cycle.test.ts uses `search -> tags` as a synthetic "removed baselined pair"; that pair leaves the
  baseline, so the synthetic switches to another baselined pair.
- Split test files cannot show as renames under `git diff -M`; whole-file moves do.
- Stale doc comments naming the old paths (vault-v2.types.ts:73,84, ADR-0025:102, e2e mock header) are
  updated; ADR-0004:33 (an older, already-stale listing) is left.
