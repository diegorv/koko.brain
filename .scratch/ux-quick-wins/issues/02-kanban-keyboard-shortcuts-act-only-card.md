# 02: Kanban keyboard shortcuts act only on the card you see; the sort menu is the themed Select

**Origin:** design review 2026-11-17, proposals P03 (part), P94, P86 (kanban view buttons) (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/kanban-board.html` (P03) and `feedback-components.html` (P94, P86), research `.scratch/ux-quick-wins/research/verdict-kanban.md`, `verdict-feedback-b.md` (QB2) and `breakdown.md` (old ticket 01).

**What to build:**

1. **Board mode only.** `handleBoardKeydown` (`src/lib/plugins/kanban/KanbanView.svelte:236`, bound on the root at `:460`) runs only in board mode. In list and table mode Delete, Backspace and Space on the root change nothing.
2. **Ignore interactive targets.** It returns when `e.target.closest('input, textarea, select, button, a, [role="button"], [role="gridcell"], [role="menuitem"], [contenteditable]')` is set (it replaces the INPUT, TEXTAREA and SELECT tag check at `:240`). This still lets keys through from a card's bits-ui ContextMenu trigger `div` (tabindex -1, `node_modules/bits-ui/dist/bits/menu/menu.svelte.js:1593-1599`), so arrows keep working after a click on a card, and it blocks the inline date picker's calendar days (`KanbanDatePicker.svelte:89-96` renders inline, no Portal). A guard of `e.target === e.currentTarget` is wrong and is not used.
3. **Visible cards only.** Lane and card indexes and the ring come from the visible lanes (`board.lanes.map(displayLane)`), not the stored `lane.items` read at `:242` and `:527`. With a filter on, Backspace deletes the ringed visible card and every hidden card stays in the file. Focus clears when the filter, the sort or the view mode changes.
4. **Themed sort control.** The native sort `<select>` (`:488-496`) becomes `Select.Root type="single"` with `Select.Trigger size="sm" aria-label="Sort cards"` (recipe of `src/lib/plugins/graph-view/GraphControls.svelte`) and one item per `SORT_LABELS` entry, calling the existing `handleSetSortMode` (`:175`). A stored `sortMode` that is not a `SORT_LABELS` key shows its raw value or "Custom sort", never "Manual".
5. **View buttons.** The three view buttons (`:465-483`) get `aria-pressed` for the current mode and an `aria-label` equal to their `title` (keep `title`).

**Why the guard and the Select ship together:** the Select trigger is a `<button>` whose keydown never stops propagation (`select.svelte.js:705-717`). Without item 2, Space toggles and Backspace deletes the focused card from the sort control.

Not in this ticket: roving tabindex, a focus-visible ring and a shortcut hint (M, changes the focus model of every card and menu). The graph mode pair of P86 is ticket 41. The "Manual order paused" chip and "Move to" belong to ticket 42.

**Size:** S.

**Blocked by:** 01

**Status:** resolved

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes. Also run the `chrome-state-styles`, `menu-item-anatomy` and `chrome-type-scale` tests (markup changes).

- [x] Failing test first, `src/tests/lib/plugins/kanban/KanbanView.test.ts` (harness `src/tests/fixtures/KanbanViewHarness.svelte`, real store and logic, only `kanban.service.js` mocked): lanes with `#x` and untagged cards, `setFilterQuery('#x')`, ArrowDown then Backspace on the board root deletes the ringed visible card and every hidden card stays in the persisted markdown.
- [x] Focus a card's trigger div; ArrowDown still moves the ring.
- [x] In list and table mode, Delete, Backspace and Space on the root change nothing.
- [x] Space or Enter on a button inside a card (check button, a calendar day) does not toggle or edit the ringed card.
- [x] With `kanbanStore.setFocus(0, 0)`, bubbling keydown of Space, Enter, Backspace and `n` on the sort trigger leaves the card, its checked state and `editingItemId` unchanged and issues no save.
- [x] No `select` element in the toolbar; "Sort cards" lists the `SORT_LABELS` in order; choosing "Text (A->Z)" persists `settings.sortMode === 'text-asc'`; mounting and re-choosing the current option issue no save; `"sortMode": "unchecked"` mounts without a save and the trigger does not read "Manual".
- [x] View buttons: `aria-pressed="true"` only on the current mode; `clickToolbarButton('List view')` (`KanbanView.test.ts:71-76`) still works. Changing sort, view or filter clears the ring.
- [x] Frontend gate: pnpm check and pnpm vitest run pass.

## Original proposal

- **P03.** The kanban key handler hijacks native keys and acts on hidden or wrong cards. One root handler runs in board, list and table modes, reads the unfiltered `board.lanes` and skips only INPUT, TEXTAREA and SELECT. Proposal: real DOM focus with a roving tabindex, shortcuts only when the target is the card, board mode only, indexes from the visible lanes. Validation: keep. This ticket ships the handler guard, the visible-lane indexes and the reset on filter, sort and view change; the roving tabindex, ring and hint are deferred.
- **P94.** Primitive gaps make features hand-roll their controls: the kanban sort is a native select next to the Select primitive. Replace it with Select. Validation: revise.
- **P86.** Segmented controls have five selected looks and only one has ARIA. This ticket ships `aria-pressed` and names on the kanban view trio; the shared SegmentedControl primitive is deferred.

## Problem

With a filter on, the focus ring and Backspace target a stored card that may be hidden, so the keyboard deletes a card the user cannot see; kanban has no undo, so this is silent data loss. In list and table mode arrow keys move an invisible focus and Delete removes a card nobody sees. Space on a focused button toggles the virtual card. The sort control is a native select that does not match the themed controls next to it.

## Evidence

Checked at `085b23c5d`.

- `KanbanView.svelte:236-326`: the handler. `:240` skips only INPUT, TEXTAREA and SELECT; `:242` reads `board.lanes`; `:301-312` Delete and Backspace; `:460` the root wraps all three view modes; `:527` the ring id comes from stored `lane.items`.
- `KanbanView.svelte:464-484` view buttons carry `title` only; `:488-496` the native sort select. `src/lib/plugins/kanban/KanbanCard.svelte:157-165`, `src/lib/plugins/kanban/kanban.store.svelte.ts:11-17` (focus state).
- `node_modules/bits-ui/dist/bits/menu/menu.svelte.js:1593-1599`: every card and lane title sits inside a ContextMenu trigger `div` with tabindex -1. `select.svelte.js:705-717`: the Select trigger keydown does not stop propagation.
- `src/tests/lib/plugins/kanban/KanbanView.test.ts:71-76`: toolbar buttons are found by `title`.

## Why blocked

- 01 edits `KanbanView.svelte` (`handleAddLane` at `:128-133`) and `KanbanView.test.ts`; both tickets add cases to the same harness file, so they run one after the other, 01 first.

## Sequence with

Tickets 05, 10, 11, 12 and 42 edit the toolbar, the card menu or the board root of the same file on other lines; run in order. shell-sidebars-ux 25 wraps the toolbar (`KanbanView.svelte:462-507`) in a new `ViewHeader`: land this ticket before 25 starts, or after it merges with the controls inside `ViewHeader`'s children, never in parallel. Open-itens 225 (the personal-week example uses the invalid sortMode "unchecked") will read this ticket's trigger in its criterion. Open-itens 040 and 006 (drop index, wrong-tab write) are avoided: no drag handler is edited.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): none.
- 2026-11-18, delivered from issue/02-kanban-keyboard-shortcuts-act-only-card: board keys read the displayed (filtered/sorted) lanes, treat collapsed lanes as empty, skip list/table mode and in-card controls; sort menu is the themed Select; view buttons carry aria-pressed. Review round 1 APPROVED (collapsed-lane finding fixed, JSDoc and import-order nits fixed, optional test nit declined); round 2 APPROVED. Tests: pnpm check 0 errors; kanban tests 312 passed; full suite at 38707115f exit 0 (657 files, 17543 passed, 56 skipped, 1 todo).
