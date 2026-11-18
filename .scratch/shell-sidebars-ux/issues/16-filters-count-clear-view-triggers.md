# 16: Filters show their count and can be cleared; the .view tab's triggers are named single buttons; an empty table says filters hid its rows

**Origin:** design review 2026-11-17, proposal P84 (all but the Display dot, which is 17), the collection-table half of P29 (the rail half is 12) and the `CollectionView` part of review P87 (nested interactive controls), prototype `.scratch/design-review/prototypes/note-list-rail.html`, research `.scratch/shell-sidebars-ux/research/verdict-nl-header-creation.md` (T1), `verdict-nl-empty-states.md` (T3) and `breakdown.md` (old ticket 17). Absorbs bullet 1 of `.scratch/open-itens/issues/140-view-tab-keyboard-and-labels.md` (the four `.view` toolbar names); its table-row keyboard and collection-calendar halves have no owner in this batch, so do not wontfix 140 whole.

**What to build:**

1. **Counts and names.** The rail's Filter trigger (`src/lib/features/rail-shell/RailNoteList.svelte:754-760`) and the `.view` tab's Filter trigger show a count pill and are named "Filter, 2 active" (or "Filter"). Sort shows a pill and "Sort, 1 column". Columns shows a dot and "Columns, some hidden" when the saved columns leave one out (no count: `allColumns` is every vault property, so a three-column order would read "40 hidden"). A view's badge counts the view's own filters, not "filters you changed"; the help says so. The rail Filter trigger also gets a `focus-visible` ring like its neighbours.
2. **One button per control.** Each `.view` toolbar control is one button, not a bits-ui `PopoverTrigger` wrapping a shadcn `Button` (`src/lib/features/collection/CollectionView.svelte:594-602, 621-628, 644-651, 666-670`; two tab stops today, and a name on the inner `Button` is not on the element the trigger toggles). Use the trigger's `child` snippet, with `aria-label` and `title`: "Filter", "Sort", "Columns", "Calendar settings".
3. **Clear filters.** Inside the filter panel of the rail and of the `.view` tab, "Clear filters" empties both groups (it rewrites the view's definition, no confirm; it drops the file's YAML comments, open-itens 071). `FilterPanel` gets an optional `onClear`, rendered only when passed and a row exists; only the rail and `CollectionView` pass it. The New view / Edit view dialog (`ViewDialog.svelte:202-210`) and auto-organize rules (`AutoOrganizeRuleRow.svelte:332-340`) do not (a one-click clear there would save a rule that matches nothing, `auto-organize.logic.ts:38-46`).
4. **Empty table.** An empty `.view` table says "No rows in this view" with no filters, or "No rows match N filter(s)" with an Edit filters action that opens the Filter popover and writes nothing (today it always says "No results match the current filters", `src/lib/features/collection/CollectionTableView.svelte:34-38`). It uses `EmptyState` from 12. `CollectionTableView` gets `filterCount` and `onEditFilters`; `CollectionView.svelte:726-731` passes them. The live-preview widget copy (`collection-block-widget.ts:160-165`) is untouched.
5. **Code.** Pure `countFilterRows(global, view)` in `src/lib/features/collection/toolbar/filter.logic.ts`, used by `countActiveFilters` (`src/lib/features/type-definitions/type-note-list.logic.ts:124`, stays exported) and by `CollectionView`'s inline sum (`:221-225`; rows counted as the panel shows them, draft rows included until open-itens 013 defines drafts). Pure `hasHiddenColumns(saved, all)` in `src/lib/features/collection/toolbar/properties.logic.ts` (not `core/frontmatter/properties.logic.ts`, a different file that 04, 10 and others edit): false when `saved` is undefined, true when `saved` leaves out one of `all`. New `src/lib/features/collection/toolbar/ToolbarCountBadge.svelte` (14 px pill, theme tokens, `aria-hidden` because the trigger's name carries the number, dot variant).
6. **Help.** `help/documentation/12-views.md` section Toolbar (`:60`) names the four buttons, the counts and Clear filters; `25-types-and-relationships.md:461-465` gets the same for the rail.

Not in this ticket: the "showing N of M" strip and "N notes are hidden by filters"; a Clear filters button on the trigger or in the empty state; a count on Columns; the Display dot (17); moving the toolbar into a shared header (25 does that with the buttons as this ticket leaves them and does not claim 140's bullet).

**Split point if one context struggles:** 16a badges, names and the nested-button fix; 16b Clear filters and the empty table. In sequence.

**Blocked by:** 12

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing test first, `src/tests/lib/features/collection/toolbar/filter-logic.test.ts`: `countFilterRows` is 0 for empty input, sums global and view rows, counts a row with an empty value; `type-note-list.logic.test.ts:392-415` passes unchanged.
- [ ] `src/tests/lib/features/collection/toolbar/properties-logic.test.ts`: `hasHiddenColumns(undefined, all)` false; an equal list false; missing one true; a saved column absent from `all` does not make it true.
- [ ] Failing test first, `CollectionView.test.ts` (real `collectionStore`, Tauri mocked): no `button button` in the toolbar; two filter rows give `getByRole('button', { name: /Filter, 2 active/ })` with pill 2; none gives "Filter" and no pill; same for Sort with one sort and Columns after hiding one column (dot, name "Columns, some hidden").
- [ ] `FilterPanel.svelte.test.ts`: no `onClear` means no "Clear filters" even with rows; with it, it shows only when a row exists and calls it once. `CollectionView.view-writes.test.ts`: Clear filters writes the `.view` with no `filters` on the active view or at the top level (asserted on the written YAML, the same content removing each row produces).
- [ ] `RailNoteList.view.test.ts` (real stores): a view with two filters shows "Filter, 2 active" with a 2 pill; Clear filters empties the rows and the trigger reads "Filter".
- [ ] An auto-organize rule's filter panel has no "Clear filters" (one assertion in the `AutoOrganizeRuleRow` test); `ViewDialog` tests pass.
- [ ] Failing test first, `CollectionTableView.svelte.test.ts`: an empty result with `filterCount` 0 does not contain "filter" (red today); `filterCount` 2 shows "No rows match 2 filters" (1: singular) and an Edit filters button that calls `onEditFilters`. `CollectionView.test.ts`: on a filtered-out view, Edit filters opens the Filter panel and nothing is written; a view with rows is unchanged.
- [ ] `pane-toolbar`, `chrome-state-styles`, `palette-classes` and `feature-cycle` tests pass.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P84.** Active filter, sort and display state is shown by colour only. Count badges on the note-list Filter trigger and the collection Filter and Sort triggers (`activeFilterCount`, `localSort.length`), a dot on Archive when not at its default and on Columns when any column is hidden, plus a one-click "Clear filters". Validation: revise (Tasks, Graph and FilterPanel already show values as text). The Archive dot is built in 17, as part of Display.
- **P29 (collection half).** Filtered views say "No results match N filters" with Clear filters. This ticket ships "No rows match N filters" with Edit filters, and puts Clear filters inside the panel, a deliberate change (ticket 12's default 12.1).
- **P87 (`CollectionView` part).** Interactive controls are nested inside other interactive controls; fixed here for the four `.view` toolbar triggers.
- **140 (absorbed, bullet 1).** `.view` tab keyboard and labels: the four toolbar controls need accessible names.

## Problem

An active filter only tints its icon, hidden columns give no sign, and nothing clears filters in one step. Each `.view` toolbar control is a button nested in a button with no name. An empty `.view` table always says "No results match the current filters", even when no filter exists.

## Evidence

Checked at `ab143a411`.

- `src/lib/features/rail-shell/RailNoteList.svelte:174` and `:754-760` (Filter trigger: tint only, `title="Filter"`, although `activeFilterCount` exists); `:766` `FilterPanel` consumer.
- `src/lib/features/collection/CollectionView.svelte:221-225` (count, commented "for the toolbar badge", no badge rendered), `:593-670` (the four triggers), `:654` `FilterPanel`, `:726-731` table call.
- `src/lib/features/collection/CollectionTableView.svelte:34-38`.
- `FilterPanel` has four consumers (rail, `.view` tab, `ViewDialog`, `AutoOrganizeRuleRow`); no "Clear filters" exists anywhere in `src/lib`.
- `RailArchivedMenu.svelte:34-41` already names itself; `help/documentation/12-views.md:60` and `25-types-and-relationships.md:461-465` are the help locations (not `25` for the `.view` tab).
- `docs/agents/view-files.md:155`: every toolbar write drops the file's YAML comments.

## Why blocked

- 12: (`EmptyState`)

## Sequence with

- `RailNoteList.svelte`: 12 (`{#if}` chain `:815-879`, blocker), 15, 17 (header `:698-801`; blocked by this ticket), 19, 20, 24, 34.
- `CollectionView.svelte`: 25 (moves the four triggers into a shared view header as this ticket leaves them; blocked by this ticket), 34 (pane-band).
- open-itens 013 (draft filter rows in `FilterPanel`) and 139 (inferred columns): coordinate count semantics and `hasHiddenColumns`; 071 (comment loss) is context for Clear filters.
- open-itens 010 (view unknown methods) changes which views reach the error branch; no shared lines.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: granularity of 34 consolidated tickets (this is old ticket 17 unchanged). Defaults (not individually answered): 16.1 (old 17.1) Clear filters rewrites the view's definition with no confirm, inside the panel only, not on the trigger or in the empty state; 16.2 (old 17.2) Columns shows a dot and "some hidden", not a count.
