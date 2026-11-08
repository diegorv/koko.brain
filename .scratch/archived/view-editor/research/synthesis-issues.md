# view-editor: proposed .scratch Issues

I re-read the code behind the claims that set scope and order:
- `updateViewEditYaml` always sets `edited.name = edit.label` and always re-stringifies (`src/lib/features/collection/yaml-parser.ts:286-330`, `:318`, `:329`).
- `removeView` and `renameView` never touch `_rail_view` (`yaml-parser.ts:364-407`). `railViewIndex` falls back to 0 (`:142-144`).
- The dialog always sends `viewFilters` (`src/lib/features/type-definitions/ViewDialog.svelte:145-149`). Its prefill is a disk read (`:83`) and its label comes from the row (`:76`).
- `handleEditView` returns when no visible row exists (`src/lib/features/rail-shell/TypesNavigator.svelte:147-152`).
- The only places the dialog is mounted are `TypesNavigator.svelte:473-481` and `src/lib/features/rail-shell/FilesNavigator.svelte:400`.
- `NoteRowMenu` has Show in Views and no Edit view (`src/lib/features/note-list/NoteRowMenu.svelte:215-219`).
- Pin buttons have no context menu (`src/lib/features/rail-shell/Rail.svelte:138-157`).
- `queryViewLens` has no list-sort override (`src/lib/features/rail-shell/lens.logic.ts:785-800`), and `viewRowSet` reads `_sort` from `ctx.entries` (`:711-714`).
- The write base is a dirty tab's buffer (`src/lib/features/type-definitions/type-definitions.service.ts:388`). `editView` passes `promptIndexRefresh` (`:541-549`).
- `validateExpression` does not check method calls (`src/lib/features/collection/expression/evaluator.ts:300-332`). `evaluateFilterCached` turns a throw into `false` (`src/lib/features/collection/collection.logic.ts:347-358`).
- `getPropertyValue` resolves only 8 `file.*` fields and the exact key (`collection.logic.ts:406-424`). `compareForSort` puts null last before the direction is applied (`:426-434`).
- Linear-calendar bars divide by `daysInMonth` over a 31-column track (`src/lib/features/collection/CollectionLinearCalendarView.svelte:67-73`, `:189-202`).
- `tabContextIndex` is set only at `src/lib/features/collection/CollectionView.svelte:536` and never cleared (`:105`, `:553-554`). Delete runs at `:577` with no confirmation.
- The `type-definitions.service.ts` hotspot trigger is "3+ fixes" (`docs/HOTSPOTS.md:40`).

Everything else is cited from the validators (V01 to V10) and marked "per Vxx".

**Gate for every Issue below:** frontend only, `pnpm check` + `pnpm vitest run`, because no Issue touches `src-tauri/` or dependencies. Issues that name a spec also run `bash scripts/e2e.sh`.

**Testing rule for every Issue:** never mock `collectionStore`, `typeDefinitionsStore`, `fsStore`, `editorStore` or any `.logic.ts`. Seed the real stores. Mock only `invoke` and the fs plugin calls, as `edit-view.service.test.ts` and `rewrite-view-file.service.test.ts` already do.

## Owner decisions needed before launch

| ID | Question | Recommendation | Blocks |
|---|---|---|---|
| D1 | Replace "Save writes everything the dialog shows" (`PRD.md:13`) with a patch of touched fields only | Yes. An unchanged Save today renames a view and runs the lossy filter round trip | 02 |
| D2 | Comments: a writer on the yaml Document API (`parseDocument`, `setIn`, `deleteIn`) or accept the loss (`PRD.md:21`) | Document writer, proved by a failing test first. V01 and the completeness critic both ran yaml 2.9.1 and kept head and inline comments. ADR-0029:74 is about the frontmatter serializer | 02 |
| D3 | One-view file: should `views[0].name` follow the label always (PRD) or only when it equalled the old label? | Only when it equalled the old label, so New table's `All` survives | 02 |
| D4 | Entry point for hidden views: `NoteRowMenu` for `.view`, a pin context menu, a rail header button, or all three. Must it ship before Behavior? | All three, and yes | 04, 07 |
| D5 | Switching `_rail_view` while that view's fields are touched: block, discard with a warning, or keep a draft per view | Discard with a warning (simplest) | 07 |
| D6 | Keep New view's `_sort: title` preset, shown as set? | Yes | 05 |
| D7 | Allow adding "All views" filters when the file has none? | Yes, as a "+ All views" toggle | 03 |
| D8 | Allow menu-only edits when the YAML parses but a view entry is invalid? | No for now; keep the block | 02 |
| D9 | Validate the name only when touched or new (fixes the Duplicate clash, V06-M2)? | Yes | 02 |
| D10 | Block Save on a preview `filterError` when filters were touched? | Yes | 03 |
| D11 | Raw-expression rows in the panel | Follow-up | none |
| D12 | ADR-0027:40 accepts a stale `_rail_view` after a tab rename. Reverse it by syncing? | Yes | 01 |

## List 1: feature `view-editor`

Chains are forced by shared files: 01 then 02, then 03 and 04 in parallel, then 05, then 06, then 07.

### 01: Tab rename and delete keep `_rail_view` in sync

- **What to build:**
  - `renameView`: when `_rail_view` equals the old name of the renamed view, write the new name.
  - `removeView`: when the removed view is the one `_rail_view` resolves to, delete `_rail_view`.
  - The existing duplicate and empty-name refusals stay.
  - Without this, a double-click tab rename silently moves the rail list, its count, its toolbar and Edit view to `views[0]`. The only signal is the grey navigator mark (`type-sidebar.logic.ts:426-440`).
- **Files:**
  - `src/lib/features/collection/yaml-parser.ts:364-407`. Callers `CollectionView.svelte:443-449` and `:476` stay unchanged.
  - `help/documentation/25-types-and-relationships.md:487` (per V09).
  - The ADR-0027:40 amendment (D12).
- **Failing tests first:**
  - `src/tests/lib/features/collection/yaml-parser.test.ts`:
    - Renaming the view `_rail_view` names gives YAML whose `_rail_view` is the new name, and `railViewIndex(parseCollectionYaml(out).definition)` is still that view's index.
    - Renaming another view leaves `_rail_view` unchanged.
    - Removing the named view deletes the key, and removing another view keeps it.
    - A stale `_rail_view` that names no view is left as it is by both functions.
  - `src/tests/lib/features/collection/CollectionView.view-writes.test.ts`: the tab rename path writes a file whose `_rail_view` follows. Assert on the content passed to the mocked write.
- **Blocked by:** none.
- **Size:** S.
- **Shares:** `yaml-parser.ts` with 02, so chain.
- **Owner decision:** D12, which is a confirmation.

### 02: Edit view saves only what the user changed

This is the foundation: draft, patch and load base.

- **What to build:**
  - **New pure module** `src/lib/features/type-definitions/view-dialog.logic.ts`:
    - `readViewDialogDraft(raw, definition, fileName)` gives a `Field<T> = { state: 'absent'|'set'|'ignored'; value; note? }` per field. Root keys are folded with `canonicalizeKey` (`src/lib/utils/frontmatter-aliases.ts`), the last one winning. The state comes from the readers in `type-sidebar.logic.ts:337-481`, not from `RESERVED_KEY_RULES`.
    - `buildViewDialogPatch(loaded, draft)` keeps changed fields only. Filters are compared with `canonicalToolbarValue` (`type-note-list.logic.ts:153-156`).
    - `applyViewDialogPatch(yaml, patch, viewIndex)`:
      - Returns the input unchanged for an empty patch.
      - A set writes the canonical key and drops its aliases. A clear deletes both spellings.
      - Untouched keys and filter bytes are not written.
      - Uses the Document API if D2 is accepted; `lineWidth: 0` either way.
      - Returns `{ok:false}` on a parse failure.
  - **Name and Filters only** in this Issue:
    - The name is validated only when touched (D9).
    - One view: `views[0].name` follows only when it equalled the old label (D3).
    - Several views: write `_sidebar_label` only, with no view rename and no `_rail_view` write (`PRD.md:19`).
  - **Load:** add `readViewBase(path)` in `type-definitions.service.ts`, returning a dirty tab's buffer else the disk bytes (as at `:387-388`). Read the label from those bytes, not from the index row (`TypesNavigator.svelte:150`).
  - **Replace** `ViewEdit` and `updateViewEditYaml`. `editView` is its only caller in `src/lib`.
- **Files:**
  - `view-dialog.logic.ts` (new).
  - `yaml-parser.ts:265-330` (remove the writer).
  - `type-definitions.service.ts:541-549`, plus `readViewBase` near `:377-390`. Change signatures only; this is the hotspot.
  - `ViewDialog.svelte:74-99`, `:118-157`.
  - `TypesNavigator.svelte:147-152` (pass the path).
  - Help `25-types-and-relationships.md:177`, `:487`.
  - ADR-0027:40 amendment for the multi-view rename rule.
- **Failing tests first:**
  - `src/tests/lib/features/type-definitions/view-dialog.logic.test.ts` (new). It must cover:
    - Each field's absent, set and ignored state, including `_order: "1"` ignored and the alias last-wins rule.
    - An empty patch returns the identical string.
    - `date('2026-01-05')`, `x > '10'` and `{and: []}` survive an untouched Save byte for byte.
    - A set drops `sidebar_label`.
    - A clear deletes both spellings.
    - If D2: a head comment and an inline comment survive a label change.
  - `yaml-parser.test.ts:956-1150`: the multi-view rename tests at `:988` and `:1093` move to the new module with the new expectation. This is a behavior change with owner approval (D1 and D3), not a weakened test.
  - `edit-view.service.test.ts`:
    - With a dirty `.view` tab in the real `editorStore`, the dialog's base is the buffer.
    - An unchanged save performs no write (the mocked write is not called, and the file content is unchanged).
  - `ViewDialog.svelte.test.ts`:
    - Opening New table's file (`views: [{name: All}]`, no `_sidebar_label`) and pressing Save leaves the content unchanged.
    - A Duplicate copy opens with Save enabled.
- **Blocked by:** 01.
- **Size:** M.
- **Shares:** `yaml-parser.ts` (01), `ViewDialog.svelte` and `view-dialog.logic.ts` (03, 05, 06, 07), `TypesNavigator.svelte` (04).
- **Owner decision:** D1, D2, D3, D8, D9.

### 03: Section layout and live Filters preview

- **What to build:**
  - **Layout:**
    - Collapsible sections with one-line summaries (`PRD.md:11`). Filters starts open.
    - Visible "Name" label, `aria-describedby`, and Enter skipped while `e.isComposing` (V02-14).
    - A discard prompt when closing with touched fields (`ViewDialog.svelte:102-116`).
  - **Preview:**
    - Calls `queryViewLens` with a draft definition where `limit` is unset. The dialog slices the result itself, giving "N notes" or "N of M notes (limit)" and the first 20 titles.
    - Add an optional `listSort` argument to `queryViewLens` and `viewRowSet` (`lens.logic.ts:704-721`, `:785-800`) that replaces `getViewSort(viewEntry)`.
    - Debounce 300 ms in `$effect` with `untrack`, dropping stale runs by sequence number.
    - A blank value shows "Finish the filter to see matches" and skips the run.
    - `filterError` shows inline and blocks Save when filters were touched (D10).
    - A caveat line says a misspelled method gives 0 rows.
    - Build `ctx` inside the dialog from the real stores. Do not edit `TypesNavigator.svelte` or `RailNoteList.svelte`, so 04 can run in parallel.
  - **Property picker:** `availableProperties = combineAvailableProperties(...)` with the definition's formulas (`type-note-list.logic.ts:105-112`).
  - **Help text:** "Inline blocks run the first view and the filters as written."
  - **"+ All views" toggle** if D7 is accepted.
- **Files:** `ViewDialog.svelte`, `view-dialog.logic.ts` (summaries), `lens.logic.ts:704-800`, help `25-types-and-relationships.md:177`.
- **Failing tests first:**
  - `src/tests/lib/features/rail-shell/lens.logic.test.ts`: `listSort: 'title'` orders rows by title. Omitting it keeps today's order, with the existing tests unchanged.
  - `ViewDialog.svelte.test.ts`, with a real `collectionStore.propertyIndex` and entries seeded:
    - Rendered text "3 notes" changes to "1 note" after editing a filter row.
    - "2 of 3 notes" appears with a limit of 2.
    - A `formula.x` option is listed.
    - An unparseable value shows the error text and disables Save.
    - Closing with a touched field shows the discard prompt.
- **Blocked by:** 02.
- **Size:** M.
- **Shares:** `ViewDialog.svelte` and `view-dialog.logic.ts` (05 to 07). `lens.logic.ts` is shared with follow-up F8, so chain F8 after this.
- **Owner decision:** D7, D10.

### 04: Edit view opens from anywhere, including hidden views

- **What to build:**
  - **Mount:** one Edit view dialog in `AppOverlays.svelte`, which is always mounted (per V06), opened through `viewDialogStore.openEdit(path)` (new `view-dialog.store.svelte.ts`). `existingLabels` comes from `viewLabels(...)` as at `TypesNavigator.svelte:481`.
  - **Callers:**
    - The Types row menu (`TypesNavigator.svelte:312`).
    - `NoteRowMenu` for `.view` paths (`NoteRowMenu.svelte:205-268`).
    - A header menu on the rail list of a view with Open in editor and Edit view (I2; `RailNoteList.svelte`, near the rule line).
    - A pin context menu with Unpin (`setViewRailPin`, `type-definitions.service.ts:465`), Edit view and Open in editor (`Rail.svelte:138-157`).
  - **Remove** the local edit mount in `TypesNavigator.svelte:117-119`, `:147-152`, `:481`. New view stays local.
- **Files:**
  - `AppOverlays.svelte`.
  - `view-dialog.store.svelte.ts` (new).
  - `TypesNavigator.svelte`, `NoteRowMenu.svelte`, `RailNoteList.svelte`, `Rail.svelte`.
  - Help `25-types-and-relationships.md:153`, `:177`.
- **Failing tests first:**
  - `NoteRowMenu.show-in-views.test.ts`, or a new `NoteRowMenu.edit-view.test.ts`: a hidden `.view` row's menu shows "Edit view", and clicking it renders a dialog titled "Edit view" whose name input holds the file's `_sidebar_label`.
  - `Rail.test.ts`: right-clicking a view pin shows Unpin. Clicking it writes content without `_rail`.
  - `RailNoteList.view.test.ts`: a working view list shows the header menu, and Edit view opens the dialog.
  - `TypesNavigator.test.ts`: the existing Edit view tests still pass through the store.
  - Spec `e2e/specs/rail-shell.spec.ts`: New table, then the Files row menu, Edit view, and the dialog renders the name.
- **Gate:** add `bash scripts/e2e.sh`.
- **Blocked by:** 02, because the path-only entry and the label read from the file land there.
- **Size:** M.
- **Shares:** `TypesNavigator.svelte` (02), `RailNoteList.svelte` (follow-ups F7, F10).
- **Owner decision:** D4.

### 05: Sort & limit section

- **What to build:**
  - **View sort:** `SortPanel` over `views[idx].sort`, written with uppercase `ASC`/`DESC`. Empty deletes the key.
  - **List order:** a `_sort` select with "Default (modified, newest first)" plus the `VIEW_SORTS` values (`type-sidebar.logic.ts:395`).
    - A root `sort:` list or an unknown value shows as ignored with its note.
    - The select is disabled with an explanation while the view sort is set (`type-note-list.logic.ts:96-98`).
  - **Limit:** an integer of at least 1; empty deletes it. `.nan` and `.inf` show as ignored, and `2.5` shows "acts as 2".
  - **Preview:** passes the draft `_sort` through `listSort`.
  - **Info note:** DESC lists notes without a value first (pinned in `collection-logic.test.ts:640-659`).
  - **New view:** shows the `_sort: title` preset as set (D6).
- **Files:** `ViewDialog.svelte`, `view-dialog.logic.ts`, `type-definitions.service.ts:271-279` (`createView` takes the patch), help `25-types-and-relationships.md:411`, `:439`.
- **Failing tests first:**
  - `view-dialog.logic.test.ts`: the reader states for `_sort`, root `sort`, `limit` NaN, Infinity and 2.5. Clearing `_sort` deletes `sort` too.
  - `ViewDialog.svelte.test.ts`:
    - Setting limit 1 renders "1 of 3 notes".
    - Choosing Title reorders the preview titles.
    - With a view sort set, the List order select is disabled and the explanation renders.
  - `create-view-folder.service.test.ts`: New view with a limit writes `limit` under `views[0]`.
- **Blocked by:** 03.
- **Size:** M.
- **Shares:** `ViewDialog.svelte`, `view-dialog.logic.ts`, `type-definitions.service.ts`.
- **Owner decision:** D6.

### 06: Display section

- **What to build:**
  - **Icon and colors:** through `IconPicker`, held in the draft. The key rules are those of `updateViewIconYaml` (`type-sidebar.logic.ts:520-543`). A rejected `_icon` shows its note.
  - **Group:** input with a datalist of the groups in use; blank deletes `_group`.
  - **Position:** `_order`, a number. The help text says it is the position in Views and among pins, not note order.
  - **Row properties:** `RailPropertiesPicker` over the frontmatter keys of the vault's property index, excluding `file.*` and `formula.*`, because pills render only `note.frontmatter[key]` (`NoteRow.svelte:100`, per V05).
- **Files:** `ViewDialog.svelte`, `view-dialog.logic.ts`, help `25-types-and-relationships.md:405`, `:414-415`.
- **Failing tests first:**
  - `view-dialog.logic.test.ts`:
    - `icon:` alias read and dropped on write.
    - Remove deletes all six spellings.
    - `_order: "1"` is ignored and kept when untouched.
    - `_group: "  "` reads as absent.
  - `ViewDialog.svelte.test.ts`:
    - Choosing an icon in the nested picker writes nothing until Save. This also tests the nested bits-ui dialog, which is not verified.
    - Save writes `_icon` and `_group`.
    - The row-property list shows a vault key that is absent from the current rows.
- **Blocked by:** 05.
- **Size:** M.
- **Shares:** `ViewDialog.svelte`, `view-dialog.logic.ts`, and `type-sidebar.logic.ts` with follow-up F12.
- **Owner decision:** none.

### 07: Behavior section

- **What to build:**
  - **Checkboxes:** Show in Views (`_visible`), Pin to rail (`_rail`), Click opens the editor (`_open_in_editor`).
    - Each follows its reader (`type-sidebar.logic.ts:360-380`, `lens.logic.ts:222`). `"false"` or `"true"` strings show as ignored.
    - Hiding shows where to reopen the view (the entry points from 04).
  - **"Note list runs" select:** shown with 2 or more views or when a stale `_rail_view` exists.
    - "First view (name)" deletes the key.
    - A duplicate name after the first is disabled, with "same name as view N".
    - A stale value is kept with its note until the user picks.
    - Switching re-seeds This view's filters, sort and limit, under D5.
    - Hint: only the rail reads it.
- **Files:** `ViewDialog.svelte`, `view-dialog.logic.ts`, help `25-types-and-relationships.md:155`, `:360`, `:418`, `:420`. Fix the false claim at `:155` that a hidden `_rail: "true"` is marked.
- **Failing tests first:**
  - `view-dialog.logic.test.ts`: the `visible` alias is dropped, `_visible` true deletes the key, the stale `_rail_view` is kept, and duplicates are disabled.
  - `ViewDialog.svelte.test.ts`:
    - Unchecking Show in Views and saving writes `_visible: false`.
    - Picking view "Board" re-renders the Filters rows of Board and the preview count.
  - Spec `rail-shell.spec.ts`: hide a view through the dialog, reopen it from the Files row menu, show it again, and the Views row returns.
- **Gate:** add `bash scripts/e2e.sh`.
- **Blocked by:** 06, 04, 01.
- **Size:** M.
- **Shares:** `ViewDialog.svelte`, `view-dialog.logic.ts`.
- **Owner decision:** D5.

## List 2: follow-ups (separate feature, suggested `view-engine-fixes`)

Ranked by likelihood for a heavy table user.

### F1: Tab-strip menu acts on the right tab, and Delete asks first

- **What to build:**
  - Clear `tabContextIndex` when the menu closes, and put the trigger on each tab only (`CollectionView.svelte:105`, `:517-554`).
  - Confirm before `handleDeleteView` (`:443-449`, `:577`), naming the view.
- **Failing tests first:** `CollectionView.view-writes.test.ts`:
  - Right-clicking tab 1, closing the menu, then right-clicking "+" renders no Delete item.
  - Delete renders a confirmation containing the view name. Without confirming, no write happens and the tab is still rendered.
- **Blocked by:** none.
- **Size:** S.
- **Shares:** `CollectionView.svelte` with F11, F13 and F15.
- **Owner decision:** no.

### F2: Filters report unknown methods and per-note failures

- **What to build:**
  - `validateExpression` checks method names against the method tables per receiver kind and `file.*` (`evaluator.ts:300-332`; `methods.logic.ts:255-269`, per V04).
  - `executeQuery` returns a count of records that threw (`collection.logic.ts:347-358`). The rail, the editor and inline blocks show "N notes could not be evaluated".
  - The dialog preview (view-editor 03) picks it up automatically.
- **Failing tests first:**
  - `src/tests/lib/features/collection/expression/evaluator.test.ts`: `validateExpression("file.hasLink('x')")` and `"x.reverse()"` return a reason.
  - `collection-logic.test.ts`: `status.lower()` over a numeric `status` reports one failure.
  - `RailNoteList.view.test.ts`: the rendered error text.
- **Blocked by:** none.
- **Size:** M.
- **Shares:** `collection.logic.ts` with F3, F4 and F8, so chain.
- **Owner decision:** no.

### F3: Columns and sort keys resolve like expressions

- **What to build:**
  - `getPropertyValue` resolves `file.tags`, `file.properties`, the `note.` and `property.` prefixes and aliases through the evaluator's member lookup plus `canonicalizeKey` (`collection.logic.ts:406-424`).
  - Fix `file.basename` in the inline block (`collection-block-widget.ts:492-506`, per V04).
- **Failing tests first:**
  - `collection-logic.test.ts`: a `file.tags` column value equals the record's tags, and a sort by an alias key orders the rows.
  - `collection-block-widget.test.ts`: a basename cell renders its text.
- **Blocked by:** F2 (shared file).
- **Size:** S-M.
- **Owner decision:** no.

### F4: DESC sort lists notes without a value last

- **What to build:** handle nulls before applying the direction (`collection.logic.ts:426-434`), and fix the wrong comment.
- **Failing tests first:** `collection-logic.test.ts:640-659` is flipped to nulls last. That test pins today's behavior, so changing it needs owner approval.
- **Blocked by:** F3.
- **Size:** S.
- **Owner decision:** yes.

### F5: Linear-calendar bars line up with their day columns

- **What to build:** move `getBarLeft` and `getBarWidth` into `linear-calendar.logic.ts` and divide by 31 (`CollectionLinearCalendarView.svelte:67-73`, `:201-202`).
- **Failing tests first:** `linear-calendar-logic.test.ts`: February 2026 day 28 gives `left` 27/31 (87.1%) and width 1/31.
- **Blocked by:** none.
- **Size:** S.
- **Owner decision:** no. Owner use of linear-calendar is not verified.

### F6: Calendars say how many notes have no date

- **What to build:** show "N without <dateProperty>" next to the count (`calendar.logic.ts:109-111`, `CollectionView.svelte:585`, `collection-block-widget.ts:138`). Also validate `weekStartDay` and a non-string `dateProperty` (`calendar.logic.ts:40`, `:169`; `collection.logic.ts:407`, per V08).
- **Failing tests first:**
  - `CollectionView.test.ts`: a calendar over 3 records, 1 without a date, renders "1 without due".
  - `calendar-logic.test.ts`: `weekStartDay: "1"` labels start on Mon.
- **Blocked by:** none.
- **Size:** S.
- **Shares:** `CollectionView.svelte`.
- **Owner decision:** no. It overlaps `ux-polish/61` (needs-triage).

### F7: The Filter panel cannot write an empty or unparseable filter

- **What to build:**
  - Live toolbars keep a blank-value row as a draft and do not persist it (`FilterPanel.svelte:73-85`; `RailNoteList.svelte:304-357` and `CollectionView.svelte:380-388`, per V04 and V05).
  - The picker leaves out keys the expression language cannot reference: spaces and non-ASCII (`filter.logic.ts:221-236`).
  - Date values are escaped (`:71-78`).
- **Failing tests first:**
  - `toolbar/filter-logic.test.ts`: a date value containing `'` emits an expression that parses.
  - `RailNoteList.toolbar.test.ts`: Add filter writes nothing, and the list still renders its rows.
  - `FilterPanel.svelte.test.ts`: a `due date` key is not offered.
- **Blocked by:** none.
- **Size:** M.
- **Shares:** `filter.logic.ts` with F8 and F14, `RailNoteList.svelte` with view-editor 04.
- **Owner decision:** no.

### F8: The rail and the editor run the file's filter, and bad shapes are errors

- **What to build:**
  - With no toolbar override, run the raw definition instead of the group round trip (`lens.logic.ts:793-797`; `type-note-list.logic.ts:44-87`; `CollectionView.svelte:157-161`, `:257-273`).
  - Report a YAML list or an unknown shape under `filters:` as a filter error (`collection.logic.ts:232-250`).
  - Round-trip tests for every documented shape.
- **Failing tests first:**
  - `lens.logic.test.ts`: `{and: [x], or: []}` gives no rows, as the inline block does.
  - `collection-logic.test.ts`: `filters: [a]` reports a `filterError`.
  - `filter-logic.test.ts`: a table of shapes where the round trip is an identity or the case is marked lossy.
- **Blocked by:** view-editor 03 (`lens.logic.ts`) and F7 (`filter.logic.ts`).
- **Size:** M.
- **Owner decision:** yes, light. A list filter now errors where today it matches everything.

### F9: Rail view switcher for multi-view files

- **What to build:** a picker in the rail header that writes `_rail_view` through the patch writer from view-editor 02 (`lens.logic.ts:792`).
- **Failing tests first:** `RailNoteList.view.test.ts`: picking "Board" re-renders Board's rows and writes `_rail_view: Board`.
- **Blocked by:** view-editor 07 and 04.
- **Size:** M.
- **Owner decision:** no.

### F10: Rule line names the limit and the sort source

- **What to build:** show "max N" and "view sort" or "`_sort`: title" (I3; `RailNoteList.svelte:717`, `lens.logic.ts:720`, per V05). Also explain that a sort-menu pick turns off `_sort` and the pins (`RailSortMenu.svelte:60-64`).
- **Failing tests first:** `RailNoteList.view.test.ts`: the rendered rule line contains "max 10".
- **Blocked by:** view-editor 04 (`RailNoteList.svelte`).
- **Size:** S.
- **Owner decision:** no.

### F11: Small editor write feedback

- **What to build:**
  - A refused tab rename shows a message (`yaml-parser.ts:403`, `CollectionView.svelte:311-329`).
  - `addView` picks a unique `Untitled N` (`yaml-parser.ts:344-356`).
  - `limit` must be a finite integer (`yaml-parser.ts:86`).
- **Failing tests first:**
  - `yaml-parser.test.ts`: two `addView` calls give distinct names, and `limit: .inf` fails the parse.
  - `CollectionView.view-writes.test.ts`: a duplicate rename renders the message.
- **Blocked by:** view-editor 02 (`yaml-parser.ts`) and F1 (`CollectionView.svelte`).
- **Size:** S.
- **Owner decision:** no.

### F12: View writers refresh promptly and fail loudly

- **What to build:**
  - `updateViewToolbarKey`, `updateViewIcon`, `updateViewIconColors` and `removeViewIcon` pass `promptIndexRefresh` (`type-definitions.service.ts:450`, `:455`, `:490`, `:524-529`, per V04).
  - The icon and color writers throw on unparseable YAML instead of a silent no-op (`type-sidebar.logic.ts:534-537`, `:558-560`).
- **Failing tests first:**
  - `update-view-toolbar-key.service.test.ts`: the real `vaultStore` prompt-refresh flag is set.
  - `type-sidebar.logic.test.ts`: broken YAML throws.
- **Blocked by:** view-editor 07 (service and `type-sidebar.logic.ts`).
- **Size:** S.
- **Owner decision:** no.

### F13: Properties panel matches the table's columns

- **What to build:** seed the panel from the inferred columns, not every vault property (`CollectionView.svelte:672`, per V07; `toggleColumn` not read).
- **Failing tests first:** a new `PropertiesPanel` render test: without `order`, the panel lists only the rendered headers, and the first toggle writes an `order` equal to the shown columns minus one.
- **Blocked by:** F11 (`CollectionView.svelte`).
- **Size:** M.
- **Owner decision:** no.

### F14: New here infers the type from a compound `&&` filter

- **What to build:** split a top-level `&&` string into `and` rows when parsing (`filter.logic.ts:385-387`), so `viewNoteType` (`lens.logic.ts:883`, per V05) finds `type ==`.
- **Failing tests first:** `lens.logic.test.ts`: `'type == "Project" && status == "active"'` gives the type `Project`.
- **Blocked by:** F8.
- **Size:** S-M.
- **Owner decision:** no.

### F15: Collection keyboard and labels

- **What to build:** `aria-label` and `title` on the four toolbar icon buttons (`CollectionView.svelte:593-668`, per V07), keyboard focus on rows and headers (`CollectionTableView.svelte:44-58`), and calendar Today by keyboard (per V08).
- **Failing tests first:** `CollectionView.test.ts`: buttons found by role and name. A table row is activated by Enter.
- **Blocked by:** F13.
- **Size:** S.
- **Owner decision:** no. It overlaps `ux-polish/62` (needs-triage), so merge into it if preferred.

### F16: Inline blocks choose a view and navigate months

- **What to build:** an optional `view: <name>` key, and month or year navigation (`collection-block-widget.ts:110`, `:188-191`, `:284`).
- **Failing tests first:** `collection-block-widget.test.ts`: `view: Board` renders Board, and clicking next renders the next month's label.
- **Blocked by:** F3 (same widget file).
- **Size:** M.
- **Owner decision:** yes, on the key name and syntax.

### F17: Collection help docs are corrected

- **What to build:** fix `help/documentation/12-collection.md`:
  - `:32-34`: the manual steps produce a file that fails to parse, and New table lists every note.
  - `:180`: inline blocks run `views[0]` and can draw calendars.
  - `:352`: `date - today()` gives NaN; use `date(due) - today()`.
  - `:348`: prefer `and:` lists.
  - `:316-325`: `file.tags` as a column, unless F3 lands first.
  - The 50- and 200-row caps, and DESC null order.
- **Tests:** docs only, so a targeted check only.
- **Blocked by:** F3 and F4, so it can state the final behavior.
- **Size:** S.
- **Owner decision:** no.

### F18: A `.view` checker for agents

- **What to build:** a script under `scripts/` around `parseCollectionYaml`, `validateExpression` (with F2's method check) and the reader notes. `docs/agents/view-files.md` points to it.
- **Tests:** a vitest over fixtures: a list filter, `asc`, an unquoted numeric name and fences each give the documented message.
- **Blocked by:** F2.
- **Size:** S-M.
- **Owner decision:** yes, on how a Node script loads TS modules in this repo.

### Bookkeeping

- `ux-polish/53` is already done for `.view` (`layout.logic.ts:23-28`, per V10). Close it.
- `audit-2026-11-04/08` keeps the `link()` cell work (B11).
- Not proposed until measured: rail re-read and re-query per entries bump (A05-1, G15), and the property-index rebuild in every editor (A05-6).
- Deferred: Bases parity (`groupBy`, `summaries`, `columnSize`, `this`, `file.links`, `hasLink`); document them as ignored in the reference.
- Low and not proposed: the stale pin after an external rename.

## Not verified

- Whether the Document-API writer keeps comments under every patch shape. V01 and the completeness critic ran samples; 02's first test proves or refutes it.
- Nested `IconPicker` and `RailPropertiesPicker` inside `Dialog.Content` (06).
- Preview cost on the owner's vault.
- Whether `waitForTabSave` flushes a pending autosave debounce (02's dirty-base test covers the path).
- The help line numbers for 25:155, 25:177 and 25:487, which are cited from validators.
- `lens.logic.ts:883` (`viewNoteType`).
- `RailNoteList.svelte:304-357` (persist path).
- `CollectionView.svelte:672`, cited per V07.