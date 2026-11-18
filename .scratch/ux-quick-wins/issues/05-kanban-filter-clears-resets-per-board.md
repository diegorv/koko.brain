# 05: Kanban filter clears, resets per board, and a tag click filters

**Origin:** design review 2026-11-17, proposals P143 (toolbar half), P88 (part) (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/kanban-board.html` (P143, P88), research `.scratch/ux-quick-wins/research/verdict-kanban.md` and `breakdown.md` (old ticket 11). The lane half of P143 ("n of m", "No matching cards") is ticket 11.

**What to build:**

1. **Clear the filter.** An X button named "Clear filter", shown only while there is a query, next to the filter input (`src/lib/plugins/kanban/KanbanView.svelte:498-506`); Escape in the input clears it too. The pattern is `RailListSearch`.
2. **The filter resets per board.** `kanbanStore.filterQuery` is module state (`src/lib/plugins/kanban/kanban.store.svelte.ts:9,19,29`) and the view is mounted unkeyed (`src/lib/app/EditorView.svelte:81`), so the query follows the user to the next board where cards look gone. `KanbanView` reads `editorStore.activeTab?.path` itself and clears the filter and the keyboard focus when it changes and on destroy. No new prop and no `EditorView` edit (shell-sidebars-ux 25 forbids a new prop on the three views). `editingItemId` and `editingLaneId` are left alone: clearing them on a tab switch unmounts an open textarea, which is the unfixed wrong-tab write of open-itens 006.
3. **A tag click filters.** The tag chip in `src/lib/plugins/kanban/KanbanCardText.svelte:32-72` stops being a Popover trigger and becomes a plain button that calls `kanbanStore.setFilterQuery('#tag')`, with the callback passed down through `KanbanCard.svelte` and `KanbanLane.svelte` (pass-through only).
4. **Tag colour moves to the card menu.** A "Tag color" submenu in the card context menu (`KanbanCard.svelte:225-263`, beside "Card color"), shown only on cards with tags: one row per tag, swatches, "Reset to default", using the existing `onSetTagColor` / `onRemoveTagColor` (`KanbanView.svelte:154-160`, the same `settings.tagColors` write as today). Card menu only, no Shift+click, so it is keyboard reachable.
5. **Known limit, stated.** The filter is a raw substring match (`src/lib/plugins/kanban/kanban.logic.ts:913-921`, kept by design so dates and `#tag` work), so `#design` also shows `#design-system` cards.
6. **Help.** `help/documentation/21-kanban.md:154` ("Click a tag chip to open a color popover") is rewritten: a click filters, colour is in the card menu.

Not in this ticket: the shared swatch radiogroup / `menuitemradio` primitive (cross-feature), lane counts and empty-lane text (ticket 11), any drag-handler change.

**Size:** S.

**Blocked by:** 02

**Status:** resolved

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes. Also run `chrome-state-styles`, `menu-item-anatomy` and `chrome-type-scale` (markup changes).

- [x] Failing test first, `src/tests/lib/plugins/kanban/KanbanView.test.ts` (harness `src/tests/fixtures/KanbanViewHarness.svelte`, real stores and logic, only `kanban.service.js` mocked): typing a query shows "Clear filter"; clicking it empties `kanbanStore.filterQuery` and all cards render again.
- [x] Escape in the filter input clears it.
- [x] With two kanban tabs in the real `editorStore`, switching the active tab path clears the filter and the focus ring; unmounting clears the filter. An open card edit is not closed by the switch.
- [x] Clicking a `#design` chip sets the filter to `#design` and hides an untagged card.
- [x] "Tag color" (only on cards with tags) writes `settings.tagColors` in the persisted markdown and "Reset to default" removes the entry; the card-menu pin at `KanbanView.test.ts:246-254` (`['Edit', 'Archive', 'Card color', 'Delete']`) is updated on purpose.
- [x] Frontend gate: pnpm check and pnpm vitest run pass.

## Original proposal

- **P143 (toolbar half).** The kanban filter has no clear button, gives no empty feedback and leaks across boards. Add an X button and Escape to clear; clear the query when another board loads, or key it by board path. Keep raw-text matching. Validation: revise, the reset mechanism changed to reading `editorStore` in the view, never a new prop.
- **P88 (part).** Clicking a kanban tag opens the colour palette instead of filtering. A click on a tag sets the board filter (`setFilterQuery('#tag')`) and tag colour moves to the card menu. Validation: revise, tag-click filtering is the daily-use part; the shared radiogroup is deferred.

## Problem

There is no way to leave a filter except to select and delete the text; Escape does nothing. The query then stays when the user opens another kanban, where cards look vanished. Clicking a tag, the obvious way to see its cards, opens a colour palette instead.

## Evidence

Checked at `085b23c5d`.

- `KanbanView.svelte:178-184` `displayLane` filters through `kanbanStore.filterQuery`; `:498-506` the input has no clear and no Escape; `kanban.store.svelte.ts:9,29` the module state.
- `KanbanCardText.svelte:32-72` the chip is a Popover trigger, swatches use `onmousedown` and `title` only (`:52-59`), `onOpenAutoFocus` is prevented (`:49`).
- `help/documentation/21-kanban.md:154` documents the colour popover. `KanbanView.test.ts:246-254` pins the card menu.
- `src/lib/plugins/kanban/kanban.logic.ts:913-921` raw substring matching.

## Why blocked

- 02 rewrites the board key handler and the toolbar in `KanbanView.svelte` and adds its cases to `KanbanView.test.ts`; this ticket edits the filter input in the same toolbar and reads the same focus state, so it runs after 02. Its "ignore interactive targets" guard also decides that Escape and Backspace typed in the filter input never reach the board handler.

## Sequence with

Tickets 10, 11, 12 and 42 edit `KanbanView.svelte`, `KanbanCard.svelte` and `KanbanLane.svelte` on other lines (10 the date row and board root focus, 11 the lane footer, 12 table and archive, 42 the card menu again: it adds "Move to" and re-edits the pin at `KanbanView.test.ts:246-254` after this ticket). Help `21-kanban.md` is also edited by tickets 11, 12 and 42. shell-sidebars-ux 25 wraps the toolbar (`KanbanView.svelte:462-507`): not in parallel. Open-itens 040 and 006 are avoided on purpose.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): none.

- 2026-11-18, branch issue/05-kanban-filter-clears-resets-per-board: the kanban filter gets a "Clear filter" button and clears on Escape, resets on tab switch, source-mode toggle and unmount (an open card edit survives), a tag chip click filters on that tag, and "Tag color" moves to the card menu. Review round 1 APPROVED with findings; fix round: the tab-switch test opens a real card edit, help text reworded; swatch keyboard gap deferred to the shared radiogroup follow-up. Review round 2 APPROVED (no findings). Tests: pnpm check 0 errors; full suite at 76cea8a32 657/657 files, 17555 passed, 56 skipped, 1 todo, exit=0.
