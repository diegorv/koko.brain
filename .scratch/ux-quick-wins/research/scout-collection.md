# Scout: collection (prototype collection-queryjs.html)

HEAD 085b23c5d. Slice: P09 P48 P82 P49 P141 P142 P47 P50 P138 P139 P140.
Every call below was checked against the code at HEAD (path:line). Nothing in this slice is built yet and no premise is false.

Claude MVP branch (`git diff --stat origin/main...origin/mvp-claude`, 172 files): it changes none of `features/collection/`, `plugins/queryjs/` or `live-preview/styles.ts`. No collision.

## Summary table

| Id | Call | Size | One-line reason |
|---|---|---|---|
| P09 | QUICK-PART | S | Ship the CSS + scroll wrapper + nowrap dates/headers + focus rings; skip per-cell ellipsis on kb.table / kb.ui cells (arbitrary script output). |
| P48 | QUICK-PART | S | Ship rank number + `aria-sort`; DEFER the click semantics (a plain click that replaces the sort would drop a panel-configured secondary sort in the user's `.view` file). |
| P82 | QUICK | S | Add `mousedown` stopPropagation to Prev/Next, the same fix the Run buttons already carry; harmless if the lead is false. |
| P49 | QUICK-PART | S | Ship "N without <date>" in toolbar and block header, plus a "No dated entries" line, from one pure helper; DEFER the chip that opens a list. |
| P141 | DEFER | M | New drag interaction that writes `order` to the `.view`, and the panel does not yet match the table's real columns (open-itens 139). |
| P142 | QUICK | S | Sticky `th` and `max-w` + truncate + title in CollectionTableView; remove the inner `overflow-auto` so the real scroller owns sticky. |
| P47 | QUICK | S | Built-in labels for `file.*` columns in `resolveColumns`, raw key as tooltip, `.md` hidden in the name cell only (value unchanged). |
| P50 | QUICK | S | Muted "1 of N views" hint (tooltip names the views) in the inline block header; no chips. |
| P138 | QUICK | S | Type icon per tab, a chevron button opening the existing tab menu, and a reason on the disabled Delete; same handlers, no new write path. |
| P139 | QUICK | S | Style the and/or/not trigger like the FilterRow selectors (border + chevron); labels unchanged. |
| P140 | QUICK | S | Insertion line, Alt+Up/Down via the existing `reorderSorts`, `role="list"` wrapper, named remove buttons. Same persist path as the drag. |

Counts: QUICK 7 (P82 P142 P47 P50 P138 P139 P140), QUICK-PART 3 (P09 P48 P49), DEFER 1 (P141), DONE 0, DROP 0.

## Per-proposal detail

### P09. Result tables in notes break words mid-word and cannot scroll (QUICK-PART)

Premise holds. CodeMirror's `EditorView.lineWrapping` (`core/markdown-editor/setup/editor-extensions.ts:172`) puts `overflow-wrap: anywhere; word-break: break-word` on `.cm-content` (`node_modules/@codemirror/view/dist/index.js:6917-6918`), and widget tables inherit it. `live-preview/styles.ts` has no override and no scroll container: `.cm-lp-collection-table` (`styles.ts:593-616`), `.cm-lp-qjs-table` (`:954-967`), the buttons `.cm-lp-qjs-run` (`:917`) and `.cm-lp-qjs-table-nav-btn` (`:984`) have no `:focus-visible` (the existing pattern is `.cm-lp-meta-bind-btn:focus-visible`, `:734`).

Two traps found:
1. `.cm-lp-collection-table` is also the class of the widget's month grid and linear-calendar tables (`collection-block-widget.ts:~205, ~300`, both `tableLayout: fixed`). A blanket `white-space: nowrap` / ellipsis on that class would damage the calendars. Key every new rule on a new wrapper class so calendars are untouched.
2. `kb.ui.table` returns the `<table>` itself when not paginated (`kb-ui.ts:~500-541`, documented as the legacy contract) and the wrapper only when paginated. Keep the returned element unchanged: append a scroll `<div>` to the container that holds the table, and still return the table. Same for `kb.table` (`kb-api.ts:~314-346`).

Slice to ship (QUICK):
- New wrapper class (for example `cm-lp-table-scroll`): `overflow-x: auto; overflow-wrap: normal; word-break: normal`; `th` `white-space: nowrap`.
- `buildCollectionTable` (`collection-block-widget.ts:432`) returns the table; `renderView` (`:169`) appends it inside the wrapper. Date, number and boolean cells get a nowrap class (dates like `2026-11-18` otherwise break after the hyphen even with `overflow-wrap: normal`). Text cells of this table (we render them with `textContent`) get `max-width` + ellipsis + `title`.
- `kb.table` and `kb.ui.table`: wrap in the same scroll container; `renderValue` (`kb-api.ts:489`) sets `white-space: nowrap` on cells for `KBDateTime`, `Date`, numbers.
- `.cm-lp-qjs-run:focus-visible` and `.cm-lp-qjs-table-nav-btn:focus-visible` get the `--ring` box-shadow used by `.cm-lp-meta-bind-btn:focus-visible`.
- Leave `file.folder` absolute (review validation).

Not shipped: ellipsis/title on `kb.table` / `kb.ui.table` text cells. They hold arbitrary script output (HTMLElements, links); truncating hides the user's data. With `overflow-wrap: normal` plus horizontal scroll they stay readable.

Files: `src/lib/core/markdown-editor/extensions/live-preview/styles.ts`, `src/lib/features/collection/collection-block-widget.ts`, `src/lib/plugins/queryjs/kb-ui.ts`, `src/lib/plugins/queryjs/kb-api.ts`.
Test seam: jsdom DOM tests on the real builders (no mocks needed, they are pure DOM): `collection-block-widget.test.ts`, `kb-ui.test.ts`, `kb-api.test.ts`; `styles.test.ts` reads the real theme spec object (it already checks `.cm-lp-qjs-run` and the nav button).
Acceptance criteria are in candidate tickets Q2 (collection side) and Q3 (QueryJS side).

### P48. Clicking a collection header silently stacks multi-column sorts (QUICK-PART)

Premise holds: `handleToggleSort` (`CollectionView.svelte:397-409`) appends a new column to `localSort` and calls `persistKey('viewSort', ...)`, which writes the `.view`. `CollectionTableView.svelte:44-49` shows only an arrow, no rank, and the `th` has no `aria-sort`.

Why only a part: the review's main change (plain click = single sort cycling ASC, DESC, off; Shift+click stacks) makes a stray header click replace a multi-column sort that the user set in the Sort panel, and that sort is saved in the vault `.view`. That rewrites user data on one click. DEFER that half: needs an owner decision (or a guard such as "plain click cycles only the primary and keeps the rest").

Ship (QUICK): when `currentSort.length > 1`, show the rank next to the arrow (`↑1`, `↓2`); set `aria-sort` (`ascending` / `descending`) on the primary sorted `th` only (ARIA says one header at a time) and leave the rank number to say the rest. Pure helper `sortState(sorts, key)` returning `{ direction, rank } | null`, in `toolbar/sort.logic.ts`. No write-path change.

Files: `CollectionTableView.svelte`, `toolbar/sort.logic.ts`. Test seam: `sort-logic.test.ts` (pure) and `CollectionTableView.svelte.test.ts` (real component, `currentSort` prop).
Criteria in Q1.

### P82. QueryJS Prev/Next probably destroy the widget on mouse click (QUICK)

Premise plausible and unrefuted at HEAD. `kb-ui.ts:526-538` sets `prev.onclick` / `next.onclick` and nothing on `mousedown`; `QueryjsBlockWidget.ignoreEvent()` returns false (`queryjs-block-widget.ts:168-170`); the Run buttons do stop it (`:208`, `:318`); rule 11 of `docs/agents/live-preview-rules.md` is exactly this. Existing test clicks with `.click()` (`kb-ui.test.ts:789-792`), which cannot see it. Not reproduced at runtime by this scout (read-only).

The fix is two lines and safe even if the lead turns out false: `btn.addEventListener('mousedown', (e) => e.stopPropagation())` on both buttons (same pattern as `queryjs-block-widget.ts:208`). Do not add a container-level guard here (open-itens 086 prefers it; that is a wider change to the widget).

Files: `src/lib/plugins/queryjs/kb-ui.ts`. Test seam: `kb-ui.test.ts` with a bubbling `mousedown` listener on an ancestor of the buttons (the real boundary is event propagation; jsdom cannot run CodeMirror). Optional proof in the app: `e2e/specs/queryjs-basic.spec.ts` style test clicking Next; run only via `bash scripts/e2e.sh`.
Criteria in Q3.

### P49. Collection calendar views silently drop undated notes (QUICK-PART)

Premise holds: `groupRecordsByDate` skips records with no parseable start (`calendar.logic.ts:109-111`); the toolbar prints `queryResult.records.length results` (`CollectionView.svelte:587`) and the block header `${view.name} (${result.records.length})` (`collection-block-widget.ts:139`); an empty grid has no message (`CollectionCalendarView.svelte`, `CollectionLinearCalendarView.svelte`). The linear calendar uses the same predicate (`extractDateFromRecord`, `linear-calendar.logic.ts:3`).

Ship (QUICK): pure `countUndated(records, dateProperty)` in `calendar.logic.ts` (`records.filter(r => !extractDateFromRecord(r, dateProperty)).length`). When the active view is a calendar or linear-calendar with a `dateProperty`: toolbar reads `12 results, 5 without <dateProperty>` (only the second part when it is above 0); the block header reads `Name (12, 5 without date)`; when records exist and none is dated, a muted "No dated entries" line under the header/grid.

DEFER the review's "chip that opens a list of the undated notes" (M: new popover, new list UI and row actions).

Overlap: open-itens 138 bullet 1 is the same text ("N without <dateProperty>"); 138 bullet 2 (`weekStartDay` / non-string `dateProperty` hardening) is a parser fix, not in this ticket.
Files: `calendar.logic.ts`, `CollectionView.svelte` (the line at :587 only), `collection-block-widget.ts` (`renderView` header). Test seam: `calendar-logic.test.ts`, `CollectionView.test.ts` (real `collectionStore`, Tauri mocked), `collection-block-widget.test.ts`.
Criteria in Q2.

### P141. Collection columns cannot be reordered (DEFER)

Premise holds (`PropertiesPanel.svelte:77-105` checkboxes only; `toggleColumn` in `toolbar/properties.logic.ts:47-72` inserts by `allColumns` order). DEFER: M; drag reorder writes `order` to the `.view` (`handleColumnsChange`, `CollectionView.svelte:392-395`), and the panel lists `visibleColumns = localColumns ?? allColumns` (`CollectionView.svelte:674`), so without an `order` it disagrees with the table's rendered columns and the first edit writes every vault property into `order` (open-itens 139, todo). Reorder must be built on top of 139. Also needs the drag-with-indicator pattern from P140 first.

### P142. Collection tables have no sticky header or cell truncation (QUICK)

Premise holds. `CollectionTableView.svelte:39` wraps the table in `<div class="overflow-auto">` with no height bound, so it is a scroll container that never scrolls vertically; a `position: sticky` `th` would resolve against it and not stick. The real scroller is `CollectionView.svelte:686` (`flex-1 overflow-auto`). `th` has no sticky class (`:44-49`), `td` is `whitespace-nowrap` with no cap (`:61`). `CollectionTableView` is only used by `CollectionView` (codemap importers).

Change: replace the inner `overflow-auto` div with a plain div (the outer scroller still scrolls both axes); `th` gets `sticky top-0 z-10 bg-card` and a bottom edge via inset shadow (borders do not travel with sticky under `border-collapse`); text `td` gets `max-w-80 truncate` and `title={text}`; links/images/html cells untouched.

Note for the implementer: jsdom cannot prove sticky. The test asserts the classes and that no ancestor of the `th` below the CollectionView scroller carries `overflow-*`; visual check is manual.
Overlap: open-itens 215 (truncate + title; its check icon and section-label header are not covered) and 216 (sticky; its humanized names are not covered). shell-sidebars-ux 16 edits the empty-state branch of the same file (`CollectionTableView.svelte:34-38`), a different region.
Files: `CollectionTableView.svelte`. Criteria in Q1.

### P47. Collection headers show raw column ids and file names keep .md (QUICK)

Premise holds: `resolveColumns` falls back to the key (`collection.logic.ts:474-477`); `getPropertyValue('file.name')` returns `record.name` with `.md` (`:419-420`). The prototype and review settle the design: built-in labels when the definition sets none, a `displayName` in the `.view` still wins, raw key as tooltip, `.md` hidden in the cell only, so filters/sorts/queries keep the Bases-style value. Do not switch the default column to `file.basename`: it is not in `getAllAvailableColumns` (`toolbar/properties.logic.ts:14-22`), so the Properties panel could not toggle it.

Change:
- `collection.logic.ts`: exported pure `columnLabel(key, propertyConfigs)` = config `displayName`, else built-in for `file.name` Name, `file.path` Path, `file.folder` Folder, `file.ext` Extension, `file.size` Size, `file.ctime` Created, `file.mtime` Modified, else the key (note properties unchanged: humanizing `due_date` needs an owner decision, open-itens 216). `resolveColumns` uses it.
- Pure `formatColumnCell(key, value)`: `formatCellValue` plus a trailing `.md` removed when `key === 'file.name'` and the value is a string.
- `CollectionTableView.svelte` (`:48`, `:77`): `title={col.key}` on `th` when the label differs from the key; cell text through `formatColumnCell`.
- `PropertiesPanel.svelte:56` and `SortPanel.svelte:48` `getDisplayName` call `columnLabel` so the panels agree with the header (also used by the rail note list through `SortPanel`).
- `collection-block-widget.ts` `th` (`:441`) title and cell strip: done in Q2 with the same helpers.

Existing tests that assert `displayName: 'file.name'` change on purpose: `collection-logic.test.ts:342`, `:765`.
Files: `collection.logic.ts`, `CollectionTableView.svelte`, `toolbar/PropertiesPanel.svelte`, `toolbar/SortPanel.svelte`. Test seam: `collection-logic.test.ts` (pure), `CollectionTableView.svelte.test.ts`, panel render tests.
Criteria in Q1.

### P50. An embedded collection block shows only its first view (QUICK)

Premise holds: `definition.views[0]` (`collection-block-widget.ts:111`), ADR 0027 documents it. Change: when the parsed definition has N > 1 views, the block header appends a muted `1 of N views` with `title` listing the other view names; no chips (review validation). The cache entry (`CollectionCacheEntry`, `:26`) must carry the view names, because the cache-hit path (`:84-87`) never re-parses; keep the cache key unchanged (live-preview rule 2/3: do not add work to `toDOM`).
Interaction: open-itens 143 (`_block_view`, todo) would change the wording to "2 of 3 views"; the hint stays valid.
Files: `collection-block-widget.ts`. Test seam: `collection-block-widget.test.ts` (real `collectionStore`; first test with a second view in the YAML, also on the cache-hit path).
Criteria in Q2.

### P138. Collection view-tab actions hide behind double-click and right-click (QUICK)

Premise holds: rename is `ondblclick` (`CollectionView.svelte:537`), Change type / Delete only in the context menu (`:519-585`), tabs have no icon, Delete is `disabled` with no reason (`:577-581`), `title` exists only on "Add view" (`:546`).

Change: lucide icon per view type (Table, Calendar, CalendarRange; the three types of Change type); a chevron button on the active tab (and on hover/focus) with `aria-label="View actions"` that opens the same Rename / Change type / Delete items; a reason on the disabled Delete ("A collection needs at least one view") via `title` on a wrapper (a disabled item swallows pointer events). Double-click rename and right-click stay. Preferred wiring: reuse the one `ContextMenu` by dispatching a `contextmenu` MouseEvent at the chevron's position (no menu duplication); fallback a `DropdownMenu` with the same three handlers. Handlers are the existing `startTabRename`, `handleSetViewType`, `handleDeleteView`; no new write path.

Owner-visible risk: `handleDeleteView` deletes a view with no confirm (`:~420`), and the chevron makes it one click closer. Recoverable through file history; do not add a confirm in this ticket, but the ticket should say so.
Overlap: shell-sidebars-ux 16 rewrites the four right-side toolbar triggers in the same file; 25 moves the header into `ViewHeader` (blocked by 16). Different lines from the tab strip, but run after 16 or rebase.
Files: `CollectionView.svelte`. Test seam: `CollectionView.test.ts` (real stores, Tauri mocked), `CollectionView.view-writes.test.ts` for the written YAML of rename/type/delete through the chevron.
Criteria in Q4.

### P139. The filter conjunction selector looks like plain text (QUICK)

Premise holds: `FilterPanel.svelte:113` and `:175` render `<button class="text-xs text-muted-foreground hover:text-foreground">` with the label; `FilterRow` selectors are bordered with a `ChevronDown` (`FilterRow.svelte:~118-125`). Change: same classes (`flex h-7 items-center justify-between gap-1 rounded-md border border-input bg-background px-2 text-xs hover:bg-accent`) plus the chevron, in both places; `CONJUNCTION_LABELS` text unchanged (`toolbar.types.ts:59-63`). `FilterPanel` has four consumers (rail, `.view` tab, `ViewDialog`, auto-organize rule row), so the change shows in all four; no behavior change.
Overlap: shell-sidebars-ux 16 adds `onClear` to `FilterPanel`.
Files: `toolbar/FilterPanel.svelte`. Test seam: `FilterPanel.svelte.test.ts` (exists).
Criteria in Q5.

### P140. Sort rows drag with no indicator and no keyboard path (QUICK)

Premise holds: rows are `draggable` with `role="listitem"` and no list parent (`SortPanel.svelte:80-92`), no drop indicator (`handleDragOver`, `:58-63`), the remove `Button` has only an `X` icon (`:126-133`). Change: `role="list"` wrapper around the `{#each}` only; insertion line on the hovered target while `dragIndex` is set; row `tabindex="0"` and `onkeydown` Alt+ArrowUp/ArrowDown calling the existing pure `reorderSorts(sorts, i, i +/- 1)` then `onSortsChange` (the same call the drop makes, so same persisted result); a polite live region announcing "Moved Status to position 2 of 3" and focus kept on the moved row; remove button `aria-label="Remove sort by <label>"` and the same `title`. No new write path. `SortPanel` is shared with the rail note list (`RailNoteList.svelte:30`).
Note: the direction trigger is a `<button>` inside `DropdownMenuTrigger` (`:98-103`), a nested control; shell-sidebars-ux 16 fixes that only for the `.view` toolbar, not here; leave it.
Files: `toolbar/SortPanel.svelte`. Test seam: new `toolbar/SortPanel.svelte.test.ts` (there is none; real component, pure `sort.logic.ts` unmocked).
Criteria in Q5.

## Candidate quick tickets

Five tickets, ordered by impact against size. Sequence: Q3 and Q1 first (independent), then Q2 (uses Q1's helpers), Q5, Q4 last because of shell-sidebars-ux 16/25.

### Q1. Collection table: finished names, visible sort order, sticky header (P47 view side, P48 part, P142)

Behaviour: the `.view` table shows "Name / Folder / Modified" instead of `file.name`, with the raw key as tooltip and no `.md` in name cells; a multi-column sort shows rank numbers and the primary header carries `aria-sort`; the header stays visible while scrolling; long text cells truncate with the full text in `title`. The Properties and Sort panels use the same labels.
Files: `src/lib/features/collection/collection.logic.ts`, `CollectionTableView.svelte`, `toolbar/sort.logic.ts`, `toolbar/PropertiesPanel.svelte`, `toolbar/SortPanel.svelte` (the `getDisplayName` line only); tests `collection-logic.test.ts`, `sort-logic.test.ts`, `CollectionTableView.svelte.test.ts`, panel tests; `help/documentation/12-views.md` (default column names).
Acceptance criteria:
1. Failing test first, `collection-logic.test.ts`: `executeQuery` with no `displayName` gives `Name` for `file.name`, `Modified` for `file.mtime`, and the raw key for a note property; a `properties.file.name.displayName: Note` still wins; the stored `order` and filter/sort keys are unchanged. (The two existing `displayName: 'file.name'` assertions at `:342` and `:765` change in the same commit.)
2. Failing test first, `CollectionTableView.svelte.test.ts`: a `file.name` cell of `Roadmap.md` renders `Roadmap`; `title` on the header is `file.name`; the `file.path` cell keeps its full text; the underlying `getPropertyValue` still returns `Roadmap.md`.
3. Failing test first, `sort-logic.test.ts` + component: two sorts render `1` and `2` next to the arrows and only the first `th` has `aria-sort="ascending"`; one sort renders no rank.
4. Failing test first, component: a 120-character text cell has `title` equal to its text and the truncate classes; the `th` has `sticky`; no element between the `th` and the root of the component has an `overflow-*` class (the inner `overflow-auto` is gone).
5. `PropertiesPanel` / `SortPanel` show "Name" for `file.name` (render tests); `RailNoteList` sort tests pass.
6. Gate: `pnpm check` + `pnpm vitest run`. Manual check, stated in the ticket: header sticks in the running app with 60+ rows.
Not verified by this ticket: sticky in a real WebView (jsdom has no layout).

### Q2. Inline collection block: readable table, hint for other views, undated count (P09 collection side, P47 block side, P50, P49)

Behaviour: the inline table does not break words or dates and scrolls sideways; headers show the built-in names with the raw key as tooltip, `.md` hidden; a block with several views says "1 of N views" (tooltip lists them); a calendar block and the calendar toolbar say how many notes have no date, and an all-undated calendar says "No dated entries".
Files: `collection-block-widget.ts`, `live-preview/styles.ts` (collection rules only), `calendar.logic.ts`, `CollectionView.svelte` (the count span at `:587` only); tests `collection-block-widget.test.ts`, `calendar-logic.test.ts`, `CollectionView.test.ts`, `styles.test.ts`. Blocked by Q1 for `columnLabel` / `formatColumnCell`.
Acceptance criteria:
1. Failing test first, `collection-block-widget.test.ts`: the table is inside a scroll wrapper; the calendar and linear-calendar tables are not (class check on both); a date cell has the nowrap class; a long text cell has `title`.
2. Failing test first, same file: header cells use the built-in label with `title` raw key; a `file.name` cell hides `.md`.
3. Failing test first, same file: a two-view YAML renders `1 of 2 views` with the second name in `title`, on the first render and on the cache-hit path; a one-view YAML renders no hint.
4. Failing test first, `calendar-logic.test.ts`: `countUndated` is 0 for empty input, counts a record with a missing or unparseable date, ignores `endDateProperty`.
5. Failing test first, `collection-block-widget.test.ts` and `CollectionView.test.ts`: a calendar over 3 records with 1 undated shows `1 without <dateProperty>`; a table view shows no such text; all undated shows "No dated entries".
6. `styles.test.ts` passes (radius ladder and em-size tables unchanged); gate: `pnpm check` + `pnpm vitest run`.
Not verified: height re-measure of the widget in a real CodeMirror (rule 6 of live-preview-rules is not exercised by jsdom).

### Q3. QueryJS result tables: no mid-word breaks, scroll, working Prev/Next, focus rings (P09 QueryJS side, P82)

Behaviour: `kb.table` and `kb.ui.table` results keep words and dates whole and scroll sideways; the Run, Run again, Prev and Next buttons show a focus ring; clicking Prev/Next with the mouse does not move the editor cursor onto the fence.
Files: `src/lib/plugins/queryjs/kb-ui.ts`, `kb-api.ts`, `live-preview/styles.ts` (qjs rules only); tests `kb-ui.test.ts`, `kb-api.test.ts`, `styles.test.ts`. No dependency on Q1/Q2.
Acceptance criteria:
1. Failing test first, `kb-ui.test.ts`: a bubbling `mousedown` on Prev and on Next never reaches an ancestor listener (today it does); `click` still pages.
2. Failing test first, `kb-ui.test.ts` and `kb-api.test.ts`: the container holds the table inside a scroll wrapper, and `kb.ui.table` / `kb.table` still RETURN the `<table>` (non-paginated) so scripts that style the return value keep working; the paginated return is unchanged.
3. Failing test first, `kb-api.test.ts`: a `KBDateTime`, a `Date` and a number cell get `white-space: nowrap`; a string cell does not.
4. `styles.test.ts`: `.cm-lp-qjs-run`, `.cm-lp-qjs-table-nav-btn` have a `:focus-visible` rule using `--ring`.
5. Existing kb-ui/kb-api/kb-api-contract tests pass; gate: `pnpm check` + `pnpm vitest run`.
Not verified: that the lead in P82 is real in the running app (the fix is safe either way); `e2e/specs/queryjs-basic.spec.ts` style test can prove it, run only through `bash scripts/e2e.sh`.

### Q4. Collection view tabs: type icons, actions menu, Delete reason (P138)

Behaviour: each tab has a type icon; a chevron on the active/hovered tab opens Rename / Change type / Delete view (also by keyboard); Delete on the last view says why it is disabled. Double-click and right-click keep working.
Files: `CollectionView.svelte` (tab strip, `:519-585`); tests `CollectionView.test.ts`, `CollectionView.view-writes.test.ts`. Sequence after shell-sidebars-ux 16 (same file).
Acceptance criteria:
1. Failing test first, `CollectionView.test.ts`: with a table, calendar and linear-calendar view the tabs render three different icons; the chevron is a button named "View actions" reachable by Tab.
2. Failing test first: activating the chevron shows Rename, Change type and Delete view; Rename starts the inline rename input.
3. Failing test first, `view-writes`: Change type via the chevron writes the same YAML as the context menu does; Delete via the chevron removes only that view.
4. Failing test first: with one view, Delete view is disabled and its wrapper `title` is "A collection needs at least one view".
5. Right-click menu and double-click rename tests pass unchanged. Gate: `pnpm check` + `pnpm vitest run`.

### Q5. Filter and Sort panels: visible conjunction control, keyboard and indicator for sort order (P139, P140)

Behaviour: the and/or/not selector looks like the row selectors; sort rows show where a drag will land, move with Alt+Up/Down, are a named list, and their remove buttons are named.
Files: `toolbar/FilterPanel.svelte`, `toolbar/SortPanel.svelte`; tests `FilterPanel.svelte.test.ts`, new `toolbar/SortPanel.svelte.test.ts`, `RailNoteList` sort tests. Shared with the rail note list and three other `FilterPanel` consumers. Sequence after Q1 (SortPanel `getDisplayName` line) and after shell-sidebars-ux 16 (FilterPanel `onClear`).
Acceptance criteria:
1. Failing test first, `FilterPanel.svelte.test.ts`: the conjunction trigger renders a chevron icon and the bordered selector classes in the global and the view group; its text is still `All the following are true`; choosing "Any" still calls the change handler with `or`.
2. Failing test first, `SortPanel.svelte.test.ts`: rows are `listitem`s inside one `role="list"`; each remove button's name is `Remove sort by <label>`.
3. Failing test first: Alt+ArrowDown on the first of three rows calls `onSortsChange` with the exact array `reorderSorts` returns for (0 to 1) and announces the new position in the live region; Alt+ArrowUp on the first row changes nothing; plain ArrowDown changes nothing.
4. Failing test first: during a drag over row 2, an insertion-line element appears before/after it; it disappears on drop and on dragend.
5. Gate: `pnpm check` + `pnpm vitest run`; rail sort tests (`RailNoteList.sort.test.ts`) pass.

## Overlaps found

Live folders (dependencies, never replacements):
- shell-sidebars-ux 16 (todo, blocked only by 12 which is done): edits `CollectionView.svelte` right-side toolbar triggers (`:593-670`), the table call (`:726-731`) and inline count (`:221-225`), `FilterPanel` (`onClear`), `CollectionTableView.svelte` empty state (`:34-38`). Touches Q1, Q4 and Q5 files in other regions. Run those after 16 or rebase.
- shell-sidebars-ux 25 (todo, blocked by 16): moves the `.view` header into `ViewHeader`. Q4 edits the tab strip inside that header; run Q4 before 25 only if the owner accepts a rebase on 25.
- shell-sidebars-ux 17: only the rail Display popover; no collection overlap (SortPanel stays a standalone panel for it, so Q5 coexists).
- frontmatter-rules 03/04, vault-organization-v2 03, tasks-view-ux: already merged or unrelated to these files.

Open items in `.scratch/open-itens` (abandoned; none is fully covered, so none should be wontfixed yet):
- 086 (QueryJS pager; wikilinks in inline code; media tags in code): item 1 equals P82 (Q3). Items 2 and 3 are not covered. Close only item 1, or leave the Issue.
- 138 (calendar undated count): bullet 1 equals the P49 slice in Q2. Bullet 2 (`weekStartDay` / `dateProperty` shape hardening) is not covered. Not fully covered.
- 215 (collection table reads as a table): truncation + title covered by P142 (Q1). Check icon for booleans and section-label header not covered.
- 216 (humanized headers, sticky header; needs-info): sticky covered by P142 (Q1); built-in `file.*` names covered by P47 (Q1); humanizing note property keys is not and is still an owner decision.
- 139 (Properties panel matches the table's columns): not covered; it is the prerequisite of the deferred P141.
- 140 (`.view` tab keyboard and labels): table-row and header keyboard access and calendar Today / `+N more` are not covered (P48 adds `aria-sort` only, not key activation). bullet 1 already moved to shell-sidebars-ux 16.
- 143 (inline block chooses a view and navigates months): complements P50. If 143 lands first, Q2's hint reads "<name>, N of M views".
- 206 is already wontfix.

Cross-slice: P87/P153-style nested-button fixes and any "primitive" for focus rings or empty states belong to other slices; Q3 uses the existing `.cm-lp-meta-bind-btn:focus-visible` pattern and invents no shared primitive. The `:focus-visible` ring for `.cm-lp-qjs-*` is the only styles.ts change shared with a possible editor/feedback ticket.

Not checked: runtime behaviour in the app (read-only research; P82 and the sticky header need a manual look), and E2E coverage of `.view` tables (there is no `.view` E2E spec, only `collection-block.spec.ts` for inline blocks, which may assert header text and would need the built-in labels).
