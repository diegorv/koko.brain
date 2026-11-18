# 42: Kanban cards move between lanes from the card menu

**Origin:** design review 2026-11-17, proposal P02 (part), prototype `.scratch/design-review/prototypes/kanban-board.html`, research `.scratch/ux-quick-wins/research/verdict-kanban.md` (P02 and its slice ticket 4, the verdict's own numbering) and `breakdown.md` (old ticket 12).

**What to build:**

1. **"Manual order paused" chip.** After the sort control in the toolbar (`src/lib/plugins/kanban/KanbanView.svelte`, the sort block at `:486-496`, which ticket 02 turns into the themed Select), a chip shows while `!canReorder` (`:173`), titled to say that drag reorder is off while the board is sorted or filtered and that the card menu has Move to. It is absent in manual order with no filter.
2. **"Move to" in the card menu.** A `ContextMenu.Sub` next to "Card color" (`KanbanCard.svelte:225-263`) lists the other lanes by title (the current lane is not listed; with one lane the trigger is disabled). Choosing one calls a new `onMove(toLaneId)` prop, passed through `KanbanLane.svelte` (`:328`), and `KanbanView` runs `moveItem(board, fromLaneId, itemId, toLaneId, storedTargetLength, isLaneAutoComplete(board, target.title))` and `applyChange`. `storedTargetLength` is the target lane's length in the stored `board`, not in `displayBoard`, so with a filter hiding cards in the target lane the moved card lands after the hidden ones. `moveItem` already refuses a missing target lane (`kanban.logic.ts:437-438`), so a stale lane id cannot drop a card.
3. **Works in every state.** Move to is the keyboard-reachable way to change lanes in any sort or filter state; it does not depend on `canReorder`.
4. **Untouched.** The drag handlers (`handleItemDragOver`, `handleItemDrop`, `KanbanView.svelte:365-410`) and `disableDrag={!canReorder}` stay as they are: open-itens 040 owns the drop-index bug in them. Move to appends and never reuses the drag index math.
5. **Card limits.** Move to does not enforce a lane's card limit, the same as drag (the limit only styles the lane, `KanbanLane.svelte:215,311`).
6. **Help.** `help/documentation/21-kanban.md:73` ("Move a card") and `:76` (the right-click menu list) name Move to and the chip.

Not in this ticket: keeping card drag on while sorted or filtered, and a lane insertion bar (both edit the 040 drop handlers); a lane picker on Restore; the "..." lane menu.

**Size:** S.

**Blocked by:** 10, 11, 12

**Status:** resolved

**Gate:** pnpm check + pnpm vitest run, plus the `chrome-state-styles`, `menu-item-anatomy` and `chrome-type-scale` source-scan tests (they run in vitest).

- [x] Failing test first, `src/tests/lib/plugins/kanban/KanbanView.test.ts` (harness `src/tests/fixtures/KanbanViewHarness.svelte`, real store and logic, only `kanban.service.js` mocked): "Move to" > "Done" on a To Do card puts it last in Done in `api.getMarkdown()`, and it is gone from To Do. Fails today (no such item).
- [x] Moving into an auto-complete lane checks the card. With a filter hiding cards in the target lane, the moved card lands after the hidden ones in the persisted markdown (assert the full lane order).
- [x] The current lane is not listed; with a single lane the submenu trigger is disabled.
- [x] The chip shows with a sort other than manual and with a filter, and not in manual order with no filter; it names the card menu.
- [x] The card-menu pin at `KanbanView.test.ts:246-254` gains "Move to" on purpose (and keeps whatever ticket 05 added); the lane-menu pin below it is unchanged.
- [x] Drag still works in manual order with no filter, and `disableDrag` is still set while sorted or filtered (existing drag tests pass unchanged).
- [x] Frontend gate: pnpm check and pnpm vitest run pass. Not checked in WKWebView: submenu placement near the board edge.

## Original proposal

- **P02.** Kanban cards cannot move between lanes while a sort or filter is active: `canReorder` protects in-lane indexes but also turns off cross-lane drag, which needs no index, and nothing explains it. Proposal: keep card drag on in every state (a drop into another lane appends, a drop in the same lane does nothing), show a "Manual order paused" chip next to the sort control, add a "Move to" submenu and a lane insertion bar. Validation: revise. Only the chip and Move to are built here; keeping drag on and the lane bar are deferred with open-itens 040.

## Problem

With a sort or a filter active the board turns card drag off, with no explanation and no other way to move a card to another lane. A person who sorts by date or filters by tag has to clear the sort first, move the card, and set it again.

## Evidence

Checked at `085b23c5d`.

- `KanbanView.svelte:173` `canReorder = canReorderItems(currentSortMode, filterQuery)` (`kanban.logic.ts:933-935`); `:534` `disableDrag={!canReorder}`; it drops `draggable` on cards (`KanbanCard.svelte:160-162`) and the lane grip (`KanbanLane.svelte:234`).
- `KanbanCard.svelte:225-263`: the card menu is Edit, Archive, Card color, Delete, with no move action; `KanbanView.test.ts:246-254` pins exactly that list.
- `KanbanView.svelte:403-405`: the drop path already derives `autoCheck` from `isLaneAutoComplete(board, targetLane.title)` and calls `moveItem`; `kanban.logic.ts:420-455` `moveItem`, with the missing-lane guard at `:437-438`.
- `help/documentation/21-kanban.md:73,76`.

## Why blocked

- 10: it edits `KanbanCard.svelte` (the date row, `rounded-md`, the editor) and the board-root focus code in `KanbanView.svelte`.
- 11: it edits `KanbanLane.svelte` (the add row and the empty and filtered counts) and the lane props `KanbanView.svelte` passes, where this ticket adds `onMove`. Its own blocker 05 (the toolbar and the card menu: the filter clear and the Tag color submenu) is covered through 10.
- 12: it edits `KanbanView.svelte` (archive rows and the Restore toast) and `KanbanListView.svelte`, in the same file and test.

## Risk

This ticket adds a new trigger for the card-placement write path of the `.kanban` file: `moveItem` then `applyChange` then the persist of the tab's markdown. What could be lost or changed: a card placed in the wrong lane or position of a daily-use board, a card silently checked as done when the target lane has auto-complete, and (if the stored and displayed lane lengths were confused) a card landing before hidden cards instead of after them. A lost card is guarded by `moveItem` refusing a missing target lane. The drag path has a known off-by-one (open-itens 040); this ticket avoids its index math by always appending at the stored target length. It runs only when the owner names it (launch by number, never `--all`), after the kanban tickets 10 to 12 are merged.

## Sequence with

Tickets 01, 02, 05, 10, 11 and 12 all edit `KanbanView.svelte` and `KanbanView.test.ts` on other lines; this ticket is last in the kanban chain. Shell-sidebars-ux 25 wraps the kanban toolbar (`KanbanView.svelte:462-507`) in a `ViewHeader` and forbids a new prop on the views: do not run both in parallel, and place the chip inside the header's children if 25 landed first. Open-itens 040 and 006 (drag drops and the wrong-tab write) stay open; this ticket avoids their code paths.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping, and for this ticket "tickets at the end, run only when named". Defaults (not individually answered): 42.1 (written here, not in the old ticket): Move to does not enforce the lane card limit, matching drag. Default: yes, because the limit only styles the lane today.
- 2026-11-18, deliver (branch issue/42-kanban-cards-move-between-lanes-card): card menu gains "Move to" (other lanes, auto-complete lanes check the card, lands after hidden cards); "Manual order paused" chip on the board names the card menu. Review round 1 APPROVED with 3 findings: 1 deferred to Issue 50 (keyboard opening of the card menu), 2 no change (chip stays board-view only), 3 fixed (chip title copy, 33a72a151). Round 2 APPROVED, no findings. Full suite at 33a72a151: 661 files, 17703 passed, 56 skipped, 1 todo, exit=0; pnpm check 0 errors.
