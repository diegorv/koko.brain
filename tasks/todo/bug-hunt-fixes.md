# Bug Hunt Fixes (src/)

Output of a 35-group multi-agent bug hunt across `src/` with adversarial verification.
51 findings raised -> 45 confirmed (7 high, 22 medium, 16 low), 4 cosmetic-only, 2 false-positives.

The **7 HIGH** bugs are fixed (one commit each, done below). Medium + Low remain as
backlog, ordered by impact for a later pass. Recommended attack order = top of the
MEDIUM tiers downward. Numbers [1]-[9] mark the planned next batch (Tier 1 + Tier 2).

Workflow per item: test-first (add/extend `.test.ts`, confirm RED), fix, confirm
GREEN, run `pnpm check` + `pnpm vitest run`, one commit each.

## Tasks (HIGH — fix now, one commit each)

- [x] H1: trash.service.ts data loss — `moveToTrash` cleanup deletes the user's file when `saveManifest` fails after a successful rename. `src/lib/core/trash/trash.service.ts:64-79`. Fix: `renamed` flag, guard cleanup `if (containerCreated && !renamed)`, wrap saveManifest in try/catch mirroring `restoreItem`.
- [x] H2: auto-move unarchive hardcodes `"_archive"` suffix -> never fires for other `archiveTo` destinations. `src/lib/features/auto-move/type-lifecycle-rules.ts:22-32`. Fix: derive suffix from resolved `metadata.archiveTo` tail, not literal.
- [x] H3: collection parser — method/field chaining on a function-call result broken (`now().format()`, `today().date()`). `src/lib/features/collection/expression/parser.ts:130-143,206-212`. Fix: structural `methodCall` node holding receiver ASTNode, not flattened dotted string.
- [x] H4: collection filter — single-row `not` group collapses to bare positive expression, inverting filter + persisting inverted YAML. `src/lib/features/collection/toolbar/filter.logic.ts:146-148`. Fix: shortcut only when `conjunction !== 'not'`.
- [x] H5: properties panel crashes (Svelte `each_key_duplicate`) when frontmatter has alias + canonical twin (`color` + `_color`). `src/lib/features/properties/PropertiesView.svelte:92-96,221`. Fix: `dedupeCanonicalKeys` on parse path (or key=index).
- [x] H6: kanban drag-drop misplaces cards (DOM filtered index spliced into full array) when a filter is active -> corrupts `.kanban`. `src/lib/plugins/kanban/KanbanView.svelte:372-393`. Fix: disable drag while filtered, or map filtered->absolute index.
- [x] H7: Table of Contents empty for CRLF files (`\r` breaks HEADING_RE). `src/lib/plugins/table-of-contents/toc.logic.ts:63-93` (root: `wikilink/navigation.logic.ts:2`). Fix: split `/\r?\n/` or strip `\r`; also fixes wikilink `#heading` jump on CRLF docs.

## Backlog — MEDIUM (22), ordered by impact

### Tier 1 — security / data loss / crash (planned next batch)
- [ ] [1] M29 `utils/sanitize-url.ts:5-15` — SECURITY: `isSafeUrl` misclassifies URLs with interior control chars (tab/`\x01`-embedded `javascript:`) as safe -> XSS via note content. Fix: strip control/whitespace chars (0x00-0x20) before scheme classification. (NOTE: a WIP attempt was reverted; redo test-first.)
- [ ] [2] M09 `core/editor/editor.service.ts:377-389` — `reloadExternallyChangedTabs` overwrites unsaved edits if tab becomes dirty during async disk read (data loss). Fix: re-check dirty flag after the await, skip reload if dirtied.
- [ ] [3] M20 `properties/PropertiesView.svelte:268` — adding the same relationship target twice crashes the panel (duplicate `each` key). Fix: dedupe targets or key by index (same class as H5).

### Tier 2 — silently wrong result / file churn (planned next batch)
- [ ] [4] M23 `periodic-notes/periodic-notes.logic.ts:165` — weekly note paths not normalized to ISO-week start -> one week maps to multiple files. Fix: normalize date to ISO-week start before templating.
- [ ] [5] M14 `auto-move/type-lifecycle-rules.ts:19-25` — archive `{year}/{month}` destination re-moves note across time boundaries on any edit. Fix: gate on isAlreadyInDestination against resolved parent / skip when already under the archive root.
- [ ] [6] M22 `search/SearchResult.svelte:100-110` — semantic/hybrid click passes a line number where a char offset is expected -> wrong scroll position. Fix: convert line->char offset (or pass a line-targeted scroll).
- [ ] [7] M12 `live-preview/widgets/collection-block-widget.ts:40,44-45,347-353` — cache keyed on index SIZE shows stale data after equal-count property edits. Fix: key cache on a content hash, not count.
- [ ] [8] M21 `properties/properties.service.ts:20-50` — global `skipNextParse` flag consumed by a different tab -> stale properties after fast tab switch. Fix: scope the skip to a (path, content) signature instead of a global bool.
- [ ] [9] M17 `canvas/canvas.logic.ts:209` — clearing a node's color never persists to `.canvas` (`'color' in d && d.color !== undefined` skips the delete). Fix: persist removal when color is cleared.

### Tier 3 — stale UI on a common flow
- [ ] M15 `outgoing-links/OutgoingLinksPanel.svelte:28-34` — panel never refreshes on `vaultIndexVersion` bump (stale). Fix: add `vaultIndexVersion` to the `$effect` deps.
- [ ] M16 `backlinks/BacklinksPanel.svelte:31-37` — same as M15 for backlinks (stale until tab switch). (Pair with M15 — same root.)
- [ ] M27 `kanban/KanbanView.svelte:64-82` — `selfUpdate` guard stuck true on no-op serialization, drops next external reload (board stale).
- [ ] M19 `folder-notes/folder-notes.logic.ts:24-25` — empty/whitespace `_order` coerces to 0, forcing note to top. Fix: skip blank `_order` instead of `Number('')===0`.

### Tier 4 — config-dependent / narrower edge
- [ ] M10 `filesystem/link-updater.logic.ts:23-40` — corrupt wikilink when new file name contains `#`. Fix: escape/encode `#` or guard rename targets.
- [ ] M24 `periodic-notes/periodic-notes.logic.ts:303-327` — `detectPeriodicNoteType` fails for `gggg/ww/wo/Wo` formats.
- [ ] M08 `app-lifecycle/watcher-handler.service.ts:141-158` — incremental watcher leaves deleted files in TS collection propertyIndex (phantom pages). NOTE: re-verify — may overlap with the recent `fix(watcher)` commit `dac9bd0`.
- [ ] M26 `graph-view/graph-view.logic.ts:35-38` — note linking to same target twice falsely marked bidirectional (wrong graph edges).

### Tier 5 — narrow / visualization
- [ ] M18 `collection/linear-calendar.logic.ts:131,148` — drops Dec 31 events that carry a time-of-day.
- [ ] M25 `periodic-notes/periodic-notes.logic.ts:361-365` — uses calendar year as ISO week-year, mis-resolving weeks at year boundary.
- [ ] M28 `queryjs/kb-ui.ts:686` — `heatmapCalendar` off-by-one day for UTC+ timezones.
- [ ] M11 `live-preview/parsers/callout.ts:52-62` — callout marker/title boundary miscomputed with trailing whitespace in header.
- [ ] M13 `live-preview/widgets/queryjs-block-widget.ts:84-89` — re-attaches cached DOM without `isConnected` guard, blanking a duplicate identical block.

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
