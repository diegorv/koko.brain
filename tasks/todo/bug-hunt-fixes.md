# Bug Hunt Fixes (src/)

Output of a 35-group multi-agent bug hunt across `src/` with adversarial verification.
51 findings raised -> 45 confirmed (7 high, 22 medium, 16 low), 4 cosmetic-only, 2 false-positives.

This batch fixes the **7 HIGH** bugs (one commit each). Medium + Low are backlog below.

## Tasks (HIGH — fix now, one commit each)

- [x] H1: trash.service.ts data loss — `moveToTrash` cleanup deletes the user's file when `saveManifest` fails after a successful rename. `src/lib/core/trash/trash.service.ts:64-79`. Fix: `renamed` flag, guard cleanup `if (containerCreated && !renamed)`, wrap saveManifest in try/catch mirroring `restoreItem`.
- [x] H2: auto-move unarchive hardcodes `"_archive"` suffix -> never fires for other `archiveTo` destinations. `src/lib/features/auto-move/type-lifecycle-rules.ts:22-32`. Fix: derive suffix from resolved `metadata.archiveTo` tail, not literal.
- [ ] H3: collection parser — method/field chaining on a function-call result broken (`now().format()`, `today().date()`). `src/lib/features/collection/expression/parser.ts:130-143,206-212`. Fix: structural `methodCall` node holding receiver ASTNode, not flattened dotted string.
- [ ] H4: collection filter — single-row `not` group collapses to bare positive expression, inverting filter + persisting inverted YAML. `src/lib/features/collection/toolbar/filter.logic.ts:146-148`. Fix: shortcut only when `conjunction !== 'not'`.
- [ ] H5: properties panel crashes (Svelte `each_key_duplicate`) when frontmatter has alias + canonical twin (`color` + `_color`). `src/lib/features/properties/PropertiesView.svelte:92-96,221`. Fix: `dedupeCanonicalKeys` on parse path (or key=index).
- [ ] H6: kanban drag-drop misplaces cards (DOM filtered index spliced into full array) when a filter is active -> corrupts `.kanban`. `src/lib/plugins/kanban/KanbanView.svelte:372-393`. Fix: disable drag while filtered, or map filtered->absolute index.
- [ ] H7: Table of Contents empty for CRLF files (`\r` breaks HEADING_RE). `src/lib/plugins/table-of-contents/toc.logic.ts:63-93` (root: `wikilink/navigation.logic.ts:2`). Fix: split `/\r?\n/` or strip `\r`; also fixes wikilink `#heading` jump on CRLF docs.

## Backlog — MEDIUM (22)

- [ ] M08 `app-lifecycle/watcher-handler.service.ts:141-158` — incremental watcher leaves deleted files in TS collection propertyIndex (phantom pages).
- [ ] M09 `core/editor/editor.service.ts:377-389` — `reloadExternallyChangedTabs` overwrites unsaved edits if tab becomes dirty during async disk read.
- [ ] M10 `filesystem/link-updater.logic.ts:23-40` — corrupt wikilink when new file name contains `#`.
- [ ] M11 `live-preview/parsers/callout.ts:52-62` — callout marker/title boundary miscomputed with trailing whitespace in header.
- [ ] M12 `live-preview/widgets/collection-block-widget.ts:40,44-45,347-353` — cache keyed on index SIZE shows stale data after equal-count property edits.
- [ ] M13 `live-preview/widgets/queryjs-block-widget.ts:84-89` — re-attaches cached DOM without `isConnected` guard, blanking a duplicate identical block.
- [ ] M14 `auto-move/type-lifecycle-rules.ts:19-25` — archive `{year}/{month}` destination re-moves note across time boundaries on any edit.
- [ ] M15 `outgoing-links/OutgoingLinksPanel.svelte:28-34` — panel never refreshes on `vaultIndexVersion` bump (stale).
- [ ] M16 `backlinks/BacklinksPanel.svelte:31-37` — same as M15 for backlinks (stale until tab switch).
- [ ] M17 `canvas/canvas.logic.ts:209` — clearing a node's color never persists to `.canvas`.
- [ ] M18 `collection/linear-calendar.logic.ts:131,148` — drops Dec 31 events that carry a time-of-day.
- [ ] M19 `folder-notes/folder-notes.logic.ts:24-25` — empty/whitespace `_order` coerces to 0, forcing note to top.
- [ ] M20 `properties/PropertiesView.svelte:268` — adding the same relationship target twice crashes (duplicate `each` key).
- [ ] M21 `properties/properties.service.ts:20-50` — global `skipNextParse` flag consumed by a different tab -> stale properties after fast tab switch.
- [ ] M22 `search/SearchResult.svelte:100-110` — semantic/hybrid click passes a line number where a char offset is expected.
- [ ] M23 `periodic-notes/periodic-notes.logic.ts:165` — weekly note paths not normalized to ISO-week start -> one week maps to multiple files.
- [ ] M24 `periodic-notes/periodic-notes.logic.ts:303-327` — `detectPeriodicNoteType` fails for `gggg/ww/wo/Wo` formats.
- [ ] M25 `periodic-notes/periodic-notes.logic.ts:361-365` — uses calendar year as ISO week-year, mis-resolving weeks at year boundary.
- [ ] M26 `graph-view/graph-view.logic.ts:35-38` — note linking to same target twice falsely marked bidirectional.
- [ ] M27 `kanban/KanbanView.svelte:64-82` — `selfUpdate` guard stuck true on no-op serialization, drops next external reload.
- [ ] M28 `queryjs/kb-ui.ts:686` — `heatmapCalendar` off-by-one day for UTC+ timezones.
- [ ] M29 `utils/sanitize-url.ts:5-15` — `isSafeUrl` misclassifies URLs with interior control chars (tab/`\x01`-embedded `javascript:`) as safe.

## Backlog — LOW (16)

- [ ] L30 `file-explorer/FileTreeItem.svelte:109-127` — inline rename commits twice on Enter (Enter handler + blur).
- [ ] L31 `filesystem/fs.watcher.ts:168-196` — concurrent `handleChangedPaths` batches drop incremental tree updates (snapshot-then-write race).
- [ ] L32 `live-preview/parsers/callout.ts:52-62` — callout boundary off by count of trailing whitespace (related to M11).
- [ ] L33 `file-history/file-history.logic.ts:168-170` — `findBackupTimestamp` returns first-within-tolerance, not closest.
- [ ] L34 `collection/toolbar/filter.logic.ts:68-75` — date operator serialization interpolates value without escaping quotes/backslashes.
- [ ] L35 `copy-block-link/copy-block-link.logic.ts:79-83` — heading whose text is only a block id yields `[[note#^null]]`.
- [ ] L36 `file-icons/IconPicker.svelte:68-75` — `recentNormalized` never re-runs after icon packs finish loading (missing `packVersion` dep).
- [ ] L37 `tags/tags.logic.ts:59-65` — unterminated inline tag array drops the last tag's final character.
- [ ] L38 `tasks/task-metadata.logic.ts:59-60` — `dependsOn` regex drops all IDs after a space-separated comma.
- [ ] L39 `type-definitions/type-sidebar.logic.ts:221-226` — `_order`/`_favorite_index` of YAML null coerces to 0, pinning note to top.
- [ ] L40 `calendar/calendar.service.ts:90-110` — drops a newly-created note with no frontmatter `created` and no cached fs key.
- [ ] L41 `graph-view/GraphView.svelte:155,374-396` — toggling Arrows switch does not redraw the canvas.
- [ ] L42 `one-on-one/one-on-one.logic.ts:30-32` — person name containing `]` breaks dayjs literal escaping, corrupting filename.
- [ ] L43 `queryjs/kb-api.ts:181-184` — `kb.progressBar()` throws RangeError when max is negative.
- [ ] L44 `queryjs/kb-ui.ts:1020-1021` — `chart()` expandDataset crashes on empty color array for line/bar/radar.
- [ ] L45 `utils/date.ts:98-114` — `formatToCapturingRegex` omits time tokens (HH/H/mm/m/ss/s/SSS) -> regex never matches.

## Notes

- Verifier excluded as **false-positive**: `editor.service.ts:398-402` (resetEditor debounce), `TypeNoteList.svelte` (selfUpdate dangling).
- Verifier flagged as **cosmetic-only** (not fixing here): `backlinks.store.svelte.ts:22-23` (unconsumed flag), `file-history.service.ts:56-77` (request ordering), `search.service.ts:177` + `search-hybrid.logic.ts:44-53` (source label `both`).
- Test command for these (all frontend): `pnpm check` + `pnpm vitest run`.
- Each fix is test-first: add/extend the `.test.ts`, confirm RED, fix, confirm GREEN, commit.
