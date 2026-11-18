# Issue 02 discovery: kanban keys act only on the visible card; themed sort Select

No `spec.md` exists for ux-quick-wins; the Issue is the spec. Same harness and test file as `work/01`.

## Files that change

- `src/lib/plugins/kanban/KanbanView.svelte`
  - `:237-327` `handleBoardKeydown`: return unless `currentViewMode === 'board'`; replace the tag check at `:241` with `target.closest('input, textarea, select, button, a, [role="button"], [role="gridcell"], [role="menuitem"], [contenteditable]')`; `lanes` from `displayBoard.lanes` (`:206-209`) instead of `board.lanes` (`:243`).
  - `:523-528` board `#each`: iterate `displayBoard.lanes`, pass `lane` as is, ring id from the visible lane's items.
  - New `$effect` reading `kanbanStore.filterQuery`, `currentSortMode`, `currentViewMode`, then `untrack(() => kanbanStore.clearFocus())`. Derived strings do not re-fire on a re-parse with the same values.
  - `:487-498` native `<select>` becomes `Select.Root type="single"` + `Select.Trigger size="sm" aria-label="Sort cards"` + one `Select.Item` per `SORT_LABELS` entry; `onValueChange` calls `handleSetSortMode`. Trigger text: `SORT_LABELS[mode]` when `Object.hasOwn`, else "Custom sort".
  - `:465-485` view buttons: `aria-pressed={currentViewMode === mode}` and `aria-label` equal to `title`.
- `src/tests/lib/plugins/kanban/KanbanView.test.ts`: new describes for keys, sort Select, view buttons. Add the jsdom pointer-capture / scrollIntoView stubs the Select needs.

## Plan (test-first)

1. Red tests: filtered Backspace deletes the ringed visible card, hidden cards stay; trigger div ArrowDown moves ring; list/table Delete/Backspace/Space no-op; Space/Enter on a check button and a calendar day leave the ringed card; bubbling keys from the sort trigger leave the card and issue no save; sort Select options, persist, no-save on mount/re-pick, "unchecked" mount; aria-pressed; ring clears on sort/view/filter change.
2. Handler guard + visible lanes + effect. 3. Select. 4. View-button ARIA.

## Prior art

- Select test helpers (`trigger`, `openOptions`, `choose`, jsdom stubs): `src/tests/lib/plugins/graph-view/GraphControls.test.ts:18-21,77-107`.
- Harness mount, `api.getMarkdown()`, `getPersistCount()`: `KanbanView.test.ts:44-76`.

## Risks

- bits-ui `allowDeselect` defaults false: re-picking the current item only closes (`select.svelte.js:1078-1083`), and `onValueChange` does not fire on mount, so no stray save. Even a same-value call is absorbed by the `applyChange` no-op guard (`:88`).
- Select content is portaled (`select-content.svelte`), so option keys never reach the board root.
- The calendar's own Enter/Space may change the date of the card that holds the picker; the test puts the picker on another card and asserts only on the ringed card.
- `pane-toolbar.test.ts` scans this file's toolbar class list: the toolbar `class` stays untouched.

## Defaults taken

- Unknown `sortMode` shows "Custom sort" (the Issue allows it or the raw value).
- Trigger sized `h-7 text-xs` (GraphControls recipe, fits the 40px toolbar).
- No E2E change: no E2E uses the kanban sort select or these buttons (`verdict-feedback-b.md:80`).
