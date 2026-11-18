# Verdict: collection (refuting scout-collection.md)

HEAD 085b23c5d. Slice: P09 P48 P82 P49 P141 P142 P47 P50 P138 P139 P140.
Method: every QUICK / QUICK-PART call was attacked for hidden writes, shared consumers, live-preview rules, mvp-claude collisions, E2E surfaces and tests that pass while the bug stays. Read-only; nothing was run.

mvp-claude check (`git diff --stat origin/main...origin/mvp-claude`): no file under `features/collection/`, `plugins/queryjs/`, `live-preview/styles.ts`, `rail-shell/RailNoteList.svelte` or `help/documentation/12-views.md`. Confirmed, no collision.

## Summary

| Id | Scout | Final | Changed | One line |
|---|---|---|---|---|
| P09 | QUICK-PART | QUICK-PART | no (details fixed) | CSS + scroll wrappers + focus rings ship; truncation must sit on an inner span, not on `td` |
| P48 | QUICK-PART | QUICK-PART | no | Rank + `aria-sort` ship; plain-click replaces sort stays DEFER (rewrites a saved multi-sort) |
| P82 | QUICK | QUICK | no (test seam fixed) | Lead is confirmed by the archived real-CodeMirror repro; port that test, not an ancestor-listener test |
| P49 | QUICK-PART | QUICK-PART | no (own ticket) | Count + "No dated entries" ship; chip with list DEFER; count cached in the widget entry |
| P141 | DEFER | DEFER | no | Writes `order`, built on open-itens 139 |
| P142 | QUICK | QUICK | no (details fixed) | Sticky `th` OK; `max-w` on a `td` is unreliable in auto table layout, use an inner span |
| P47 | QUICK | QUICK | no (scope fixed) | Also breaks 3 E2E assertions and about 15 unit assertions that read `.md` names; list them |
| P50 | QUICK | QUICK | no | Names go into `CollectionCacheEntry`, header hint only |
| P138 | QUICK | QUICK-PART | yes | Icons + Delete reason ship; chevron menu DEFER (one click to a no-confirm Delete and to comment-dropping rewrites) |
| P139 | QUICK | QUICK | no | Classes + chevron, four consumers, tests find it by text so they keep working |
| P140 | QUICK | QUICK | no | Same `reorderSorts` + `onSortsChange` path; indicator side must be deterministic |

Counts: QUICK 6 (P82 P142 P47 P50 P139 P140), QUICK-PART 4 (P09 P48 P49 P138), DEFER 1 (P141), DONE 0, DROP 0.

DONE check: none of the slice exists at HEAD. `grep -rn "aria-sort|without date|No dated entries|sticky top-0|cm-lp-table-scroll" src/lib/features/collection src/lib/plugins/queryjs` finds nothing; last commits on these paths (`0b1f5586f`, `179cca328`, `054ace345`) are unrelated.

## Per proposal

### P09. Result tables break words and cannot scroll: QUICK-PART (unchanged call, details corrected)

Verified: `.cm-lp-collection-table` (`styles.ts:593-616`) and `.cm-lp-qjs-table` (`:954-967`) have no wrap override; `.cm-lp-qjs-run` (`:917`) and `.cm-lp-qjs-table-nav-btn` (`:984`) have no `:focus-visible`; the pattern to copy is `.cm-lp-meta-bind-btn:focus-visible` (`:734-736`). The calendar trap is real: the month grid (`collection-block-widget.ts:203-205`) and linear calendar (`:304-306`) reuse the class `cm-lp-collection-table` with `tableLayout: fixed`, so every new rule must key on a new wrapper class.

Refutations that hold and change the ticket text:
1. **Text-cell truncation on a `td` does not reliably work.** CSS 2.1 leaves `max-width` on table cells undefined in auto layout, and WebKit (the Tauri macOS webview) is the engine where it is known to be ignored (from memory, not checked against WebKit source). A class assertion in jsdom would pass while the cell still grows. Put `max-width` + ellipsis + `title` on an inner `<span class="...truncate">` inside the `td`. Same for P142.
2. **The date nowrap rule as written misses most dates.** `buildCollectionTable` (`collection-block-widget.ts:432-468`) gets `Date` objects only for `file.ctime` / `file.mtime`; frontmatter dates arrive as strings. Detect "date" as `value instanceof Date` or a string matching `^\d{4}-\d{2}-\d{2}`. (The scout's claim that `2026-11-18` breaks at hyphens under `overflow-wrap: normal` is doubtful: UAX #14 LB25 forbids a break between a hyphen and a digit. From memory. The rule is cheap either way.)
3. **QueryJS wrapper changes `kb.container`'s children.** `kb.table` (`kb-api.ts:316-346`) and `kb.ui.table` (`kb-ui.ts:411-554`) are the public contract `contract/kb-api.v1.ts:623-730`, also used by mods through `ctx.kb()` with a detached container (`help/documentation/mods/10-querying-the-index.md:44`). Returning the same `<table>` keeps the typed contract; the one visible change is that a script which moves the returned table elsewhere leaves an empty scroll `div` behind (zero height, harmless). Keep it, and say so in the ticket. Put the nowrap rule in the table builders or as a class from `renderValue`'s Date / KBDateTime / number branches; `renderValue` (`kb-api.ts:489-523`) also feeds `kb.list` and `kb.paragraph`, where a class is harmless but an inline `white-space` on `li` is surprising.
4. Overlap in the same function: open-itens 060 rewrites `renderValue`'s array branch (`kb-api.ts:518-519`). Not covered by this ticket; edit only the Date / KBDateTime / number branches.

Not shipped: ellipsis on QueryJS cells (arbitrary script output), `file.folder` stays absolute (review validation).

### P48. Header click stacks sorts: QUICK-PART (unchanged)

Verified: `handleToggleSort` (`CollectionView.svelte:397-409`) appends and calls `persistKey('viewSort', ...)` (`:408`), which writes the `.view`. `getSortIndicator` (`CollectionTableView.svelte:27-31`) shows only an arrow; no `aria-sort` on the `th` (`:44-49`).
Attack on the DEFER half: the review validated the click semantics ("keep"), so the design is settled, but a plain click would replace a multi-column sort that lives in the user's `.view` file. Under the owner rule (anything that can rewrite their data waits) it stays DEFER.
Attack on the QUICK half: no write; `sortState` is a pure helper. The only test that reads header text with an arrow is `CollectionView.view-writes.test.ts:195` (`'status ↓'`, single sort, so no rank appears and it stays green). Holds.

### P82. QueryJS Prev/Next lose the click: QUICK (unchanged call, test seam replaced, line refs fixed)

Verified at HEAD: `prev.onclick` / `next.onclick` (`kb-ui.ts:526-538`) and no `mousedown` handler; `ignoreEvent()` returns false at `queryjs-block-widget.ts:177-179` (scout cited the stale `:168-170`); the Run stops are at `:217` and Retry at `:329` (scout cited `:208`, `:318`, copied from open-itens 086's stale text).
The lead is not "unverified": `.scratch/archived/live-preview-audit/repro/interactions/widget-click.test.ts:105-115` ('pager Next survives its click and turns the page') mounts a real CodeMirror and was kept in open-itens 086 as a confirmed failing test. The scout's seam (a bubbling listener on an ancestor) proves propagation stops but not that the widget survives; port the real-CM repro instead, built like `src/tests/lib/features/collection/collection-block-click.test.ts` (`mountMarkdownView` + `livePreviewExtensions`). This also answers the prototype's "verify first" note without the app.
Container-level guard (086's preferred variant) stays out: it changes every control a script appends.

### P49. Calendars drop undated notes silently: QUICK-PART (unchanged call, own ticket)

Verified: `groupRecordsByDate` skips at `calendar.logic.ts:111`; toolbar count `CollectionView.svelte:587`; block header `collection-block-widget.ts:139`.
Refutations:
1. The scout's Q2 put this in a ticket with P09/P47/P50 and listed only the `:587` line of `CollectionView.svelte`, but "No dated entries" in the `.view` tab must go in the body branch (`CollectionView.svelte:695-720`, the calendar / linear-calendar `{#if activeView.dateProperty}` blocks) or in `CollectionCalendarView.svelte` / `CollectionLinearCalendarView.svelte`. That region and `:587` sit in the header that shell-sidebars-ux 25 moves into `ViewHeader`. Split it out and sequence it after shell-sidebars-ux 16 (and rebase over 25 if 25 lands first).
2. Live-preview rule 2: `renderView` runs on every `toDOM()`, cache hits included. Counting undated records there is an O(n) scan per scroll-in (the block can hold 10k records). Compute `undated` once on the cache-miss path and store it in `CollectionCacheEntry` (`collection-block-widget.ts:26-33`).
3. Wording: the prototype says "12 results, 9 on calendar". The scout's "5 without <dateProperty>" is the better text for the inline block, which shows only the current month, where "on calendar" would be wrong. Keep the scout's wording and note the deviation.
Undated-notes chip that opens a list: DEFER (new popover and list UI, M).
Overlap: open-itens 138 bullet 1 only; bullet 2 (`weekStartDay` / `dateProperty` hardening) is not covered, so 138 stays open.

### P141. Columns cannot be reordered: DEFER (unchanged)

Verified: `PropertiesPanel.svelte:77-105` checkboxes only; `toggleColumn` (`toolbar/properties.logic.ts:47-79`); `visibleColumns={localColumns ?? allColumns}` (`CollectionView.svelte:674`) disagrees with the rendered columns until open-itens 139 lands, and any reorder writes `viewOrder` (`:392-395`). No safe slice: the only visible-without-write part (show visible columns first) still depends on 139's column set.

### P142. No sticky header or truncation: QUICK (unchanged call, details corrected)

Verified: inner `<div class="overflow-auto">` (`CollectionTableView.svelte:39`) with no height, real scroller `CollectionView.svelte:686`. `CollectionTableView` has one importer (`CollectionView.svelte`), no write path.
Refutations:
1. Truncation on `td` (`max-w-80 truncate`) has the same table-cell problem as P09: use an inner span, assert on the span.
2. Sticky cannot be proven in jsdom. The scout's structural test (no `overflow-*` between `th` and the component root) is the right proxy; keep it and keep the manual check.
3. Same file as shell-sidebars-ux 16 (empty state `:34-38`, new `filterCount` / `onEditFilters` props). Different region, but the ticket must run before 16 starts or after it merges, never in parallel.

### P47. Raw column ids and `.md` names: QUICK (unchanged call, scope corrected)

Verified: `resolveColumns` (`collection.logic.ts:469-494`, fallback `:476`); `getPropertyValue('file.name')` returns `record.name` (`:419`). `QueryResult.columns[].displayName` has exactly two readers: `CollectionTableView.svelte:48` and `collection-block-widget.ts:441`; mods (`plugins/mods/mod-query.service.ts`) read only `records`. `file.basename` is absent from `getAllAvailableColumns` (`toolbar/properties.logic.ts:12-20`), so the scout is right not to switch the default column.
Open-itens 216 asks for an owner decision on how dotted keys read. The design review P47 (validated, owner applies all proposals) settles it for `file.*`; `formula.*` and note keys stay raw. 216 is therefore not fully covered.
Missed by the scout, must be in the tickets:
1. **E2E.** `e2e/specs/collection-block.spec.ts:36, :41, :49, :54, :66` assert `'Roadmap.md | active'` / `'2026-Q2.md | active'` and locate a row with `hasText: 'Roadmap.md'` (`:58`). Hiding `.md` in the inline block breaks them. The block-side ticket updates them and runs `bash scripts/e2e.sh` for that spec.
2. **Unit tests reading names.** `CollectionView.test.ts:422-460` (`renderedNames()` compared to `records.map(r => r.name)`), `collection-block-widget.test.ts:188, :238, :254` (`'w.md'`, `'x.md'`, ...), plus `collection-logic.test.ts:342, :765`. They change on purpose, in the same commit as the behavior.
3. `PropertiesPanel` has no test file; the label check needs a new `toolbar/PropertiesPanel.svelte.test.ts`.
4. `SortPanel`'s label change shows in the rail note list (`RailNoteList.svelte:818-825`); no rail test asserts a `file.*` label (checked `RailNoteList.view.test.ts`, `RailNoteList.toolbar.test.ts`, `e2e/specs/rail-shell.spec.ts`; the `'file.name'` button at `rail-shell.spec.ts:664` is a FilterRow, which this ticket does not touch).

### P50. Block shows only its first view: QUICK (unchanged)

Verified: `definition.views[0]` (`collection-block-widget.ts:111`), cache hit skips parsing (`:84-87`), entry has no names (`:26-33`). Header-only change; the cache key stays the yaml. No E2E block defines two views (`collection-block.spec.ts`, `offscreen-block-rerender-keeps-scroll.spec.ts` both one view), so `toHaveText('Active (1)')` stays green. Open-itens 143 changes the rendered view later; the hint stays valid.

### P138. Tab actions hidden: QUICK-PART (changed from QUICK)

Verified: `ondblclick` rename (`CollectionView.svelte:537`), context menu only (`:519-585`), Delete `disabled` with no reason (`:576-582`), no type icon.
Why not the whole thing:
1. **The chevron menu puts destructive and rewriting actions one click away.** `handleDeleteView` (`:445-452`) deletes a view with no confirm; `removeView` (`yaml-parser.ts:364-379`) and `setViewType` (`:416-430`) re-serialize the whole `.view` with `stringifyYaml`, dropping the file's comments (open-itens 071), and `setViewType` rewrites even when the type does not change. The code path is not new, but exposure is, and it is the owner's data. DEFER the chevron until the owner picks a guard (confirm or undo on Delete, no-op when the type is unchanged).
2. **Hidden test trap for the icons.** `CollectionView.test.ts:755` finds the calendar config trigger with `document.querySelector('svg.lucide-calendar')?.closest('button')`. A `Calendar` icon on a calendar view's tab comes first in DOM order, so that helper would click the tab and the two calendar-config tests fail. The ticket must move that helper to a role/name lookup (shell-sidebars-ux 16 gives the trigger the name "Calendar settings"), so it runs after 16.
QUICK slice: lucide icon per tab type (`table`, `calendar`, `calendar-range` exist in `node_modules/@lucide/svelte/dist/icons/`), icon `aria-hidden`; the disabled "Delete view" item shows the reason as muted text inside the item ("A collection needs at least one view"), which needs no hover on a disabled element.

### P139. Conjunction selector looks like text: QUICK (unchanged)

Verified: `FilterPanel.svelte:113-115` and `:175-177`, `FilterRow.svelte:114-121` classes, labels `toolbar.types.ts:59-63`. Four consumers (`CollectionView.svelte:26`, `RailNoteList.svelte:29`, `ViewDialog.svelte:8`, `AutoOrganizeRuleRow.svelte:23`); all their tests find the trigger by `textContent?.trim()` (`FilterPanel.svelte.test.ts:51-53`, `ViewDialog.svelte.test.ts:334-338`, `AutoOrganizeRuleRow.test.ts:132-136`), which an added SVG does not change. No write, no logic. The nested-button pattern (`DropdownMenuTrigger` around a `<button>`) is the same as FilterRow's and belongs to the P87 slice; leave it.

### P140. Sort rows: QUICK (unchanged)

Verified: `SortPanel.svelte:80-92` (`role="listitem"`, no list), `:58-63` (no indicator), `:126-133` (unnamed X). Keyboard reorder uses the existing `reorderSorts` (`toolbar/sort.logic.ts:27-36`) and `onSortsChange`, the same call the drop makes (`:65-70`). Consumers: `CollectionView.svelte:27` (`persistKey`) and `RailNoteList.svelte:30` (`persistViewState`, `:320-345`, serialized through `serializeListWrite`); both write only the `.view` sort key, once per Alt+Arrow press, as a drop does once per drop. No new write path, no data beyond what the user asked to move.
Detail to fix: the insertion line must not depend on pointer geometry (jsdom has no layout). Draw it above the target row when `dragIndex > target` and below when `dragIndex < target`, which matches what `reorderSorts` does.

## Final quick tickets

Order: T3 and T1 first (independent), then T2 (uses T1's helpers), T5 (after T1, SortPanel label line), T4 last (after shell-sidebars-ux 16; touches the widget too, so after T2). T2, T3 and the editor slice's styles tickets all edit `live-preview/styles.ts`: one after another, never in parallel worktrees.

### T1. Collection table: names, visible sort order, sticky header (P47 view side, P48 part, P142)

Files: `src/lib/features/collection/collection.logic.ts`, `CollectionTableView.svelte`, `toolbar/sort.logic.ts`, `toolbar/PropertiesPanel.svelte` and `toolbar/SortPanel.svelte` (the `getDisplayName` bodies only), `help/documentation/12-views.md` (default column names). Tests: `collection-logic.test.ts`, `sort-logic.test.ts`, `CollectionTableView.svelte.test.ts`, `CollectionView.test.ts`, new `toolbar/PropertiesPanel.svelte.test.ts`.
What to build: pure `columnLabel(key, propertyConfigs)` (config `displayName`, else Name / Path / Folder / Extension / Size / Created / Modified for the seven `file.*` keys, else the key) used by `resolveColumns`, `PropertiesPanel` and `SortPanel`; pure `formatColumnCell(key, value)` that drops a trailing `.md` for `file.name` only (the value and every filter/sort stay unchanged); `th` `title` = raw key when it differs; pure `sortState(sorts, key)` returning `{ direction, rank } | null`, rank shown only when more than one sort exists, `aria-sort` on the primary sorted `th` only; inner `overflow-auto` div replaced by a plain div, `th` `sticky top-0 z-10 bg-card` with an inset bottom shadow; text cells wrap their text in a span with `max-w-80 truncate` and `title`. Header click behavior unchanged.
Acceptance criteria:
1. Failing test first, `collection-logic.test.ts`: with no `displayName`, `file.name` is `Name`, `file.mtime` is `Modified`, a note property keeps its key; `properties.file.name.displayName: Note` wins; `order`, filter and sort keys are unchanged. The assertions at `:342` and `:765` change in the same commit.
2. Failing test first, `CollectionTableView.svelte.test.ts`: a `Roadmap.md` record renders `Roadmap` in the name cell; the header `title` is `file.name`; a `file.path` cell keeps its full text; `getPropertyValue(record, 'file.name')` still returns `Roadmap.md`.
3. Failing test first, `sort-logic.test.ts` and component: two sorts render ranks 1 and 2 and only the first `th` has `aria-sort="ascending"`; one sort renders no rank; `CollectionView.view-writes.test.ts:195` stays green.
4. Failing test first, component: a 120-character text cell's inner span has `title` equal to the text and the truncate classes; the `th` has `sticky`; no element between the `th` and the component root has an `overflow-*` class.
5. New `PropertiesPanel.svelte.test.ts` and a `SortPanel` render check: `file.name` reads `Name`. `CollectionView.test.ts` `renderedNames()` (`:422-460`) compares against names without `.md`. `RailNoteList.view.test.ts` / `.toolbar.test.ts` pass.
6. Gate: `pnpm check` + `pnpm vitest run`. Manual: header stays visible with 60+ rows in the app.

### T2. Inline collection block: readable table, built-in names, other-views hint (P09 collection side, P47 block side, P50)

Files: `src/lib/features/collection/collection-block-widget.ts`, `src/lib/core/markdown-editor/extensions/live-preview/styles.ts` (collection rules only), `e2e/specs/collection-block.spec.ts`. Tests: `collection-block-widget.test.ts`, `styles.test.ts`. Blocked by T1 (`columnLabel`, `formatColumnCell`).
What to build: `buildCollectionTable` returns the table unchanged; `renderView` appends it inside a new `cm-lp-table-scroll` div (`overflow-x: auto; overflow-wrap: normal; word-break: normal`, `th` nowrap); the calendar and linear-calendar tables are not wrapped; date cells (`Date` or `^\d{4}-\d{2}-\d{2}` string) and number cells get a nowrap class; text cells hold an inner span with max-width, ellipsis and `title`; headers use `columnLabel` with `title` = key; name cells use `formatColumnCell`; `CollectionCacheEntry` carries the view names, and with more than one view the header appends a muted `1 of N views` span whose `title` lists the other names.
Acceptance criteria:
1. Failing test first: the table sits inside `.cm-lp-table-scroll`; the month-grid and linear-calendar tables do not; a date-string cell and a `Date` cell carry the nowrap class; a long text cell's span has `title`.
2. Failing test first: headers read `Name` with `title="file.name"`; a `file.name` cell reads `w`, not `w.md` (update `:188`, `:238`, `:254` in the same commit).
3. Failing test first: a two-view YAML renders `1 of 2 views` with the second name in `title`, on the first render and again on the cache-hit path; a one-view YAML renders no hint and the header text stays `All (2)`.
4. `styles.test.ts` passes, plus a check that no new rule targets `.cm-lp-collection-table` alone.
5. `e2e/specs/collection-block.spec.ts` expectations move to `'Roadmap | active'` / `'2026-Q2 | active'` and the row locator to `hasText: 'Roadmap'`; run `bash scripts/e2e.sh` for that spec and `live-preview/click-reveal/collection-block.spec.ts`.
6. Gate: `pnpm check` + `pnpm vitest run`. Not verified by jsdom: widget height re-measure in a real editor.

### T3. QueryJS tables: no mid-word breaks, scroll, working Prev/Next, focus rings (P09 QueryJS side, P82)

Files: `src/lib/plugins/queryjs/kb-ui.ts`, `src/lib/plugins/queryjs/kb-api.ts` (`table` and the Date / KBDateTime / number branches of `renderValue` only), `live-preview/styles.ts` (qjs rules only). Tests: new real-CodeMirror pager click test under `src/tests/lib/plugins/queryjs/`, `kb-ui.test.ts`, `kb-api.test.ts`, `styles.test.ts`. No dependency.
What to build: `mousedown` stopPropagation on Prev and Next (the pattern at `queryjs-block-widget.ts:217`); `kb.table` and the non-paginated `kb.ui.table` append a `cm-lp-table-scroll` div holding the table to the container and still return the `<table>`; the paginated wrapper gets the same scroll behavior and is still returned; nowrap class for Date / KBDateTime / number cells; `.cm-lp-qjs-run:focus-visible` and `.cm-lp-qjs-table-nav-btn:focus-visible` copy the `--ring` box-shadow of `.cm-lp-meta-bind-btn:focus-visible`.
Acceptance criteria:
1. Failing test first: port 'pager Next survives its click and turns the page' from `.scratch/archived/live-preview-audit/repro/interactions/widget-click.test.ts:105-115` (real CodeMirror, setup like `collection-block-click.test.ts`); it fails today; after the fix the widget stays drawn, the indicator reads `Page 2 of 3`, the cursor does not move. Same for Prev.
2. Failing test first: `kb.ui.table` and `kb.table` (non-paginated) still return an element with `tagName === 'TABLE'` (existing `kb-ui.test.ts:754`, `kb-api.test.ts:719` stay green) whose parent is the scroll div inside the container.
3. Failing test first, `kb-api.test.ts`: a `KBDateTime`, a `Date` and a number cell carry the nowrap class; a string cell does not.
4. `styles.test.ts`: both buttons have a `:focus-visible` rule using `--ring`; radius ladder unchanged.
5. Existing `kb-ui`, `kb-api`, `kb-api-contract` and `queryjs-block-widget` tests pass. Gate: `pnpm check` + `pnpm vitest run`.
Note for the ticket: a script that moves the returned table leaves an empty zero-height scroll div in `kb.container`; mods mount `kb.container` outside the editor, where the theme rules do not apply.

### T4. Calendars count undated notes; view tabs show their type (P49 part, P138 part)

Files: `src/lib/features/collection/calendar.logic.ts`, `collection-block-widget.ts` (`CollectionCacheEntry` and the header), `CollectionView.svelte` (count `:587`, calendar body branches `:695-720`, tab buttons `:534-541`, Delete item `:576-582`). Tests: `calendar-logic.test.ts`, `collection-block-widget.test.ts`, `CollectionView.test.ts`. Blocked by shell-sidebars-ux 16 (same file; its trigger names fix the icon test trap) and by T2 (same widget header).
What to build: pure `countUndated(records, dateProperty)` built on `extractDateFromRecord`; widget computes it on the cache-miss path and stores it in the cache entry; for a calendar or linear-calendar view with a `dateProperty` and a count above 0, the block header reads `Name (12, 5 without date)` and the toolbar `12 results, 5 without <dateProperty>`; when records exist and none is dated, a muted "No dated entries" line replaces the empty grid in both places. Each view tab shows a lucide `table` / `calendar` / `calendar-range` icon (`aria-hidden`); the disabled "Delete view" item carries the muted reason "A collection needs at least one view". No chevron menu, no change to Rename / Change type / Delete handlers.
Acceptance criteria:
1. Failing test first, `calendar-logic.test.ts`: `countUndated` is 0 for an empty list, counts a missing and an unparseable date, ignores `endDateProperty`.
2. Failing test first, `collection-block-widget.test.ts`: a calendar block over 3 records with 1 undated shows `1 without date`, on first render and on a cache hit; a table block shows no such text; all undated shows "No dated entries".
3. Failing test first, `CollectionView.test.ts`: the same counts in the toolbar for a calendar and a linear-calendar view; a table view still reads `N results` (`CollectionView.restored-view.test.ts:115-136` stay green).
4. Failing test first: table, calendar and linear-calendar tabs render three different icons; with one view the Delete item contains the reason text and is still disabled; the `openConfig` helper (`CollectionView.test.ts:748-760`) finds the trigger by role and name, not by `svg.lucide-calendar`.
5. Context-menu and double-click rename tests pass unchanged; `CollectionView.view-writes.test.ts` passes. Gate: `pnpm check` + `pnpm vitest run`.

### T5. Filter and Sort panels: visible conjunction, keyboard and indicator for sort order (P139, P140)

Files: `src/lib/features/collection/toolbar/FilterPanel.svelte`, `toolbar/SortPanel.svelte`. Tests: `toolbar/FilterPanel.svelte.test.ts`, new `toolbar/SortPanel.svelte.test.ts`, rail sort tests. Blocked by T1 (SortPanel label line); coordinate with shell-sidebars-ux 16 (`onClear` in FilterPanel, different lines).
What to build: conjunction triggers get the FilterRow classes and a `ChevronDown`, labels unchanged, in both groups; sort rows inside one `role="list"`; rows `tabindex="0"`, Alt+ArrowUp / Alt+ArrowDown call `onSortsChange(reorderSorts(sorts, i, i +/- 1))`, focus stays on the moved row, a polite live region says "Moved <label> to position N of M"; an insertion line on the hovered row while `dragIndex` is set (above when moving up, below when moving down), cleared on drop and dragend; remove buttons get `aria-label` and `title` "Remove sort by <label>".
Acceptance criteria:
1. Failing test first, `FilterPanel.svelte.test.ts`: both conjunction triggers contain a chevron and the bordered classes; text still `All the following are true`; choosing "Any" still emits `or`. `ViewDialog.svelte.test.ts` and `AutoOrganizeRuleRow.test.ts` pass unchanged.
2. Failing test first, `SortPanel.svelte.test.ts`: rows are `listitem`s inside one `list`; each remove button is named `Remove sort by <label>`.
3. Failing test first: Alt+ArrowDown on row 1 of 3 calls `onSortsChange` once with exactly `reorderSorts(sorts, 0, 1)` and the live region names the new position; Alt+ArrowUp on row 1 and a plain ArrowDown call nothing.
4. Failing test first: dragging row 3 over row 2 shows the line above row 2; dragging row 1 over row 2 shows it below; it disappears on drop and on dragend.
5. `RailNoteList.view.test.ts` and `.toolbar.test.ts` pass. Gate: `pnpm check` + `pnpm vitest run`.

## Deferred

- P48 click semantics: plain click replaces a saved multi-column sort in the `.view`; owner picks a guard first.
- P49 undated chip with a list: new popover and list UI, M.
- P138 chevron menu: one click to a no-confirm Delete view and to `stringifyYaml` rewrites that drop comments; needs a Delete confirm/undo decision.
- P141 column reorder: writes `order`, M, needs open-itens 139 first.
- P09 ellipsis on QueryJS cells: script output, truncation would hide user data.
- P47 humanized note-property keys (`due_date` to "Due date") and `formula.*` labels: owner decision, open-itens 216.

## Overlaps and wontfix candidates

None of the open-itens Issues is fully covered, so none should be wontfixed: 086 (item 1 only, by T3), 138 (bullet 1 only, by T4), 215 (truncation only, by T1), 216 (sticky + `file.*` names, by T1; note keys still open), 060 (same `renderValue`, not covered), 139 / 140 / 143 (not covered).
Live folders: shell-sidebars-ux 16 (blocks T4; same files as T1 and T5, sequence), 25 (moves the `.view` header; T4 rebases over it if it lands first). Cross-slice: the editor slice's styles tickets edit `live-preview/styles.ts` like T2 and T3 (serial only); the color slice lists `CollectionView.svelte:530` (rename input ring), same file as T4.

Not verified: runtime behavior in the app (read-only); whether WebKit ignores `max-width` on `td` and whether ISO dates break at hyphens are from memory, and the tickets are written so they hold either way.
