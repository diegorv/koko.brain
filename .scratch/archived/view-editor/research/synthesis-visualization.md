# Visualization synthesis: how views are shown and used

Scope: the rail note list of a view, the Types navigator Views section and rail pins, the collection editor (table, calendar, linear-calendar), inline blocks, and Bases parity. I re-read the code for every item marked "verified". Items marked "per V0x" come from the validators and I did not re-read them. Nothing was run.

Items are ranked by how likely the owner is to hit them. The owner is a single user who uses tables heavily, plus canvas, meta-bind, kanban and Quick Capture, with no external sync. Real bugs come first, then improvements.

## A. Real bugs

### B1. Rail and editor move to `views[0]` after a tab rename or delete. Likely, Medium.
- **Problem:**
  - `renameView` (`src/lib/features/collection/yaml-parser.ts:385-407`) and `removeView` (`:364-379`) never touch `_rail_view`.
  - `railViewIndex` then falls back to 0 (`yaml-parser.ts:142-144`).
  - The tab's inline rename calls `renameView` (`src/lib/features/collection/CollectionView.svelte:476`, per V01). Verified.
- **Consequence:**
  - After a double-click rename of the tab the rail shows, the rail list, its count, and the rail's Sort and Filter all switch to another view without saying so.
  - Edit view also starts editing `views[0]`, and its sync never repairs the key (`yaml-parser.ts:298-299, 319`, per V07).
  - The only signal is a grey mark in the navigator (`type-sidebar.logic.ts:426-440`).
- **Fix:**
  - In `renameView`, when `_rail_view === oldName`, write the new name.
  - In `removeView`, when the removed view is the one `_rail_view` names, delete the key.
  - Add tests for both. No current test covers rename together with `_rail_view` (per V07).
- **Size:** S.
- **Where:** view-editor. The PRD's `_rail_view` selector (`.scratch/view-editor/PRD.md:19`) writes this key, so the key must survive editor tab operations. It could go in the Behavior-section Issue, or a small Issue ahead of it.

### B2. The tab-strip context menu acts on the last right-clicked tab, including Delete, with no confirmation. Likely for a table user, Medium.
- **Problem:**
  - The `ContextMenu.Trigger` wraps the whole strip, including the "+" button and the empty space (`CollectionView.svelte:517-551`).
  - `tabContextIndex` is set only by a tab's `oncontextmenu` (`:536`) and is never cleared. It is declared at `:105`; grep finds only `:105, :536, :553-554`.
  - `handleDeleteView` writes at once, with no confirmation and no undo (`:443-449`). Verified.
- **Consequence:** right-clicking "+" or empty strip space after an earlier tab right-click opens the menu for that earlier index. If the tabs have changed since, Rename, Change type or Delete act on whatever view now sits at that index. A deleted view is gone except through file history.
- **Fix:**
  - Clear `tabContextIndex` when the menu closes.
  - Put the trigger on each tab button only.
  - Confirm before Delete view, naming the view.
- **Size:** S.
- **Where:** follow-up. The collection editor is out of scope for view-editor (`PRD.md:9, 35`).

### B3. A typo'd or wrong-type method in a filter gives an empty list with no error. Likely for hand-written or agent-written files, Medium.
- **Problem:**
  - `validateExpression` checks only plain function names (`src/lib/features/collection/expression/evaluator.ts:300-330`).
  - Any throw while a note is evaluated becomes `false` (`src/lib/features/collection/collection.logic.ts:347-358`).
  - Methods are dispatched on the value's runtime type (`methods.logic.ts:255-269`, per V04), so `status.lower()` throws, and therefore drops the note, wherever `status` is a number, a list or null.
  - Examples that fail this way: `file.hasLink(...)`, `x.reverse()`, `containsAll`. Verified.
- **Consequence:** the view lists 0 notes, or quietly drops some, in the rail, the editor and inline blocks, with no "Filter error" box. Inside `not` the same failure keeps the note instead (`:370-371`).
- **Fix:**
  - Validate method names against the method tables, for each receiver type and `file.*`, in `validateExpression`.
  - Return a per-query count of notes that threw, and show "N notes could not be evaluated" in the error area.
- **Size:** M.
- **Where:** follow-up for the engine. View-editor Issue 01, the live preview, should show `filterError` plus that count before Save.

### B4. Table columns and sort keys `file.tags`, `file.properties` and aliases resolve to null. Likely for a table user, Medium.
- **Problem:**
  - `getPropertyValue` resolves only 8 `file.*` fields plus the exact indexed key (`collection.logic.ts:406-424`). Verified.
  - `file.tags`, `file.properties`, the `note.`/`property.` prefixes and alias spellings come back null.
  - Filter expressions do resolve them (`evaluator.ts:193-212, 605-620`, per V04).
  - The help doc lists `file.tags` as a field that works (`help/documentation/12-collection.md:316-325`, per V04).
  - Inline blocks also lose `file.basename` (`collection-block-widget.ts:492-506`, per V04).
- **Consequence:**
  - A Tags column shows only dashes.
  - Sorting by an alias or by `file.tags` does nothing, with no message.
- **Fix:** resolve columns through the evaluator's member lookup (shared code) instead of the switch, and apply `canonicalizeKey`.
- **Size:** S-M.
- **Where:** follow-up.

### B5. A DESC sort lists notes with no value first. Likely for a table user, Medium.
- **Problem:**
  - `compareForSort` puts null last in ascending order (`collection.logic.ts:426-434`), but DESC negates the result.
  - A test pins the current behavior (`src/tests/lib/features/collection/collection-logic.test.ts:640-659`), and the comment "null/undefined always sort last" is wrong. Verified.
- **Consequence:**
  - "Sort by priority DESC" opens with every note that has no priority.
  - With `limit`, the docs' "Top 10 by priority" example (`12-collection.md:161`, per V04) returns 10 notes that have no priority.
- **Fix:** handle nulls before applying the direction, so they are always last, and change the pinned test.
- **Size:** S.
- **Where:** follow-up. It needs an owner decision, because it flips a test-pinned behavior.

### B6. Linear-calendar bars drift right in months shorter than 31 days. Certain whenever linear-calendar is used, Medium.
- **Problem:** the track spans 31 columns (`src/lib/features/collection/CollectionLinearCalendarView.svelte:163, 172-183, 189-194`), but left and width divide by `row.daysInMonth` (`:67-73, 201-202`). Verified.
- **Consequence:** in 2026 February, a bar for day 28 starts at 27/28 = 96.4% of the track, while the day-28 column starts at 27/31 = 87.1%, about 2.9 cells to the right. 30-day months drift by up to one cell. That is 5 of 12 months wrong, and February badly.
- **Fix:** divide by 31, and add a geometry test. No test checks the geometry today; the only related test is `linear-calendar-logic.test.ts:70-75`, which checks only `daysInMonth`.
- **Size:** S.
- **Where:** follow-up. Owner usage of linear-calendar is not verified.

### B7. In calendars, notes without a parseable date vanish while the header count includes them. Medium likelihood, Low-Medium severity.
- **Problem:**
  - `groupRecordsByDate` skips records with no start date (`src/lib/features/collection/calendar.logic.ts:109-111`). Verified.
  - The editor's count is `queryResult.records.length` (`CollectionView.svelte:585`), and the inline block's header uses the same length (`collection-block-widget.ts:138`). Verified.
- **Consequence:** "12 results" over a calendar that shows 7 chips, with no hint why.
- **Fix:** show "N without <dateProperty>" next to the count in calendar views.
- **Size:** S.
- **Where:** follow-up.

### B8. "Add filter" in the live toolbars writes an empty-value filter at once. Medium likelihood. Per V04/V05, not re-verified.
- **Problem:**
  - `addFilter` appends `createEmptyFilterRow(availableProperties[0] ?? 'file.name', ...)` (`src/lib/features/collection/toolbar/FilterPanel.svelte:73-85`, verified).
  - The rail and the editor persist each change at once (`RailNoteList.svelte:304-357`, `CollectionView.svelte:380-388`, per V04/V05).
- **Consequence:** the list empties and the file is rewritten, losing its comments, before a value is typed.
- **Fix:** keep a row with a blank value as a draft; do not persist it until it has a value.
- **Size:** S.
- **Where:** follow-up. The dialog version is covered by view-editor 01.

### B9. A pinned hidden view can be unpinned only by editing the YAML. Low-Medium likelihood.
- **Problem:**
  - Pin buttons have no context menu (`src/lib/features/rail-shell/Rail.svelte:138-157`, verified).
  - Hidden views have no Types row (`lens.logic.ts:646-647`, verified).
  - `NoteRowMenu` offers only Show in Views (`src/lib/features/note-list/NoteRowMenu.svelte:218`, verified).
- **Fix:** add a pin context menu with Unpin, Edit view and Open in editor.
- **Size:** S.
- **Where:** view-editor (see I1) or follow-up.

### B10. Filter results differ between surfaces for odd filter shapes. Low likelihood for app-written files; matters for agent-written ones.
- **Problem:**
  - The rail and the editor run the filter after a round trip through filter groups (`lens.logic.ts:793-797`, verified). Inline blocks run the raw value.
  - The round trip drops an empty `or: []` (`src/lib/features/collection/toolbar/filter.logic.ts:119-124`) and turns unknown shapes into JSON text (`:107-109, :133-137`). Verified.
- **Consequence:**
  - `{and: [x], or: []}` lists the matches of `x` in the rail, and nothing inline.
  - A YAML list under `filters:` matches every note on every surface (per V04).
- **Fix:** run the raw definition when no toolbar override exists. Report a list or unknown shape as a filter error.
- **Size:** M.
- **Where:** follow-up. Agent-reference rule: never write a list under `filters:`.

### B11. A `link()` cell sits inside a clickable table row. Low likelihood.
- **Evidence:** `<a href={value.href}>` inside the row (`CollectionTableView.svelte:67-68`, verified), and the row's `tr onclick` at `:57` (per V07).
- **Status:** already tracked as `audit-2026-11-04/08` (per V10). Leave it there.

## B. Improvements

### I1. Hidden views cannot reach Edit view. High; it is a premise of the PRD.
- **Evidence:**
  - `handleEditView` returns when there is no visible row (`src/lib/features/rail-shell/TypesNavigator.svelte:146-151`, verified).
  - `viewNavigatorRows` skips `_visible: false` (`lens.logic.ts:646-647`, verified).
  - Every New table file starts hidden (`collection.service.ts:18-21`, per V06).
- **Consequence:** once the Behavior section can set "hidden", saving it removes the dialog's own way in.
- **Fix:**
  - Add "Edit view" to `NoteRowMenu` for `.view` paths, and to the pin context menu (B9).
  - Or list hidden views dimmed under a "Hidden" fold in Views.
- **Size:** S-M.
- **Where:** view-editor, before or with the Behavior Issue.

### I2. A working rail list has no route to its editor or to Edit view. Medium.
- **Evidence:** `openFileInEditor` is used only in the error state (`RailNoteList.svelte:18, 871`, verified). Open view and Edit view exist only in the Types row menu (`TypesNavigator.svelte:310, 314`, per V05).
- **Fix:** add a header menu or buttons to the rail list of a view: Open in editor, Edit view.
- **Size:** S.
- **Where:** view-editor. It is the natural entry point to the dialog.

### I3. The rail hides where its order and size come from. Medium.
- **Evidence:**
  - `limit` is applied last; the count and search see only the capped list, and the rule line never mentions it (`lens.logic.ts:720`, `RailNoteList.svelte:717`, per V05).
  - Picking in the sort menu writes `sort:`, which silently turns off `_sort` and the `_order` pins (`RailSortMenu.svelte:60-64`, verified; `type-note-list.logic.ts:96-98`).
  - A view ordered by `_sort` alone shows no tint (per V05).
- **Fix:**
  - Rule line: say "max N" when `limit` is set, and name the sort source ("view sort" or "`_sort`: title").
  - Dialog: explain in the Sort & limit section that a view `sort` overrides `_sort` and the pins.
- **Size:** S.
- **Where:** the dialog part in view-editor 03; the rail rule line as a follow-up.

### I4. No way to switch between the views of a multi-view file in the rail. Medium.
- **Evidence:** the rail runs only `views[railViewIndex]` (`lens.logic.ts:792`, verified).
- **Fix:** add a view picker in the rail header that writes `_rail_view` through the same writer the dialog uses.
- **Size:** M.
- **Where:** follow-up. The `_rail_view` writer comes from view-editor.

### I5. Inline blocks show `views[0]` only, and block calendars are frozen at the current month or year. Medium.
- **Evidence:**
  - `const view = definition.views[0]` (`src/lib/features/collection/collection-block-widget.ts:110`, verified).
  - The block calendar is built for the current month or year, with no navigation (`:188-191, 284`, per V04/V08).
- **Fix:**
  - Docs, S: say this in `12-collection.md`.
  - Code, M: add an optional `view: <name>` key in the block, and month navigation.
- **Where:** follow-up.

### I6. Row pills have no property name, and the picker's sources are limited. Low-Medium.
- **Evidence:**
  - Pills render `note.frontmatter[key]` only (`NoteRow.svelte:100`, per V05).
  - The picker offers only frontmatter keys of the rows listed now (`list-properties.logic.ts:29-38`, per V05).
- **Fix:** add a tooltip with the property name; offer the vault's known properties in the picker.
- **Size:** S.
- **Where:** the picker part in view-editor 04 (Display section); the tooltip as a follow-up.

### I7. "New here" can create a note that is not in the list. Low-Medium.
- **Evidence:** `viewNoteType` skips raw rows (`lens.logic.ts:883`, verified). The docs' own `'type == "Project" && status == "active"'` example becomes one raw row (per V05).
- **Fix:** split a top-level `&&` string into `and` rows when parsing, or warn when New here cannot infer a type.
- **Size:** S-M.
- **Where:** follow-up.

### I8. The Properties panel without `order` lists every vault property, and the first toggle writes all of them into `order`. Low-Medium. Per V07; `toggleColumn` was not read.
- **Evidence:** `visibleColumns = localColumns ?? allColumns` (`CollectionView.svelte:672`, per V07).
- **Fix:** seed the panel from the columns the table actually infers.
- **Size:** M.
- **Where:** follow-up.

### I9. Calendar interactions. Low-Medium.
- **Evidence:** `+N more` is inert, there is no way to create a note on a day, "Today" works only on double-click, and nothing has an `aria-label` (`CollectionCalendarView.svelte:90-96, 133-165`, per V08).
- **Size:** M.
- **Where:** follow-up.

### I10. Accessibility. Low.
- **Evidence:** the four toolbar icon buttons have no `title` or `aria-label` (`CollectionView.svelte:593-668`, per V07), and table rows and headers have no keyboard access (`CollectionTableView.svelte:44-58`, per V07).
- **Size:** S.
- **Where:** follow-up.

### I11. Bases parity: defer.
- `groupBy`, `summaries`, `columnSize`, `this`, `file.links` and `hasLink` are unimplemented (per V08).
- The owner's workflow does not depend on them, and Bases is a concept-level inspiration only (per V08).
- Document them as ignored keys in the agent reference. Do not build them now.

### Info: latency after an external write.
- An external write takes 3 to 12 s to reach Views and the count (per V06). This is by design (indexing rule 4).
- It matters only for the agent reference.

## Summary for view-editor

| Item | Size | Placement |
|---|---|---|
| I1 Edit view for hidden views | S-M | Ahead of the Behavior Issue |
| I2 Rail header link to the editor and Edit view | S | With Issue 01 |
| B1 `_rail_view` kept in sync by `renameView` and `removeView` | S | Ahead of the `_rail_view` selector |
| B3 Show `filterError` and per-note failures in the preview | Engine fix M | Preview in Issue 01; engine fix separate |
| I3 Explain the sort source and `limit` | S | Sort & limit section (03) |
| I6 Vault-wide property picker | S | Display section (04) |

Follow-ups (separate Issues): B2, B4, B5 (owner decision), B6, B7, B8, B9, B10, I4, I5, I7, I8, I9, I10. B11 is already tracked as `audit-2026-11-04/08`.

Not verified: the persistence path behind B8, `toggleColumn` (I8), whether the owner uses linear-calendar or calendar views at all, and anything at runtime. No item was reproduced in the app.