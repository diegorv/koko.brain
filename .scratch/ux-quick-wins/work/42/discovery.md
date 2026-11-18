# Issue 42 discovery: Kanban cards move between lanes from the card menu

Checked at `729eff0ac` (10, 11, 12 merged; line numbers below are from this commit).

## Files that change

- `src/lib/plugins/kanban/KanbanView.svelte`: `canReorder` at `:180`; sort block `:556-572` (the themed Select, chip goes right after it); drag handlers `:428-473` and `disableDrag={!canReorder}` `:626` stay untouched. Add `handleMoveItem(fromLaneId, itemId, toLaneId)` next to the card operations (`:101-123`) and pass `moveTargets` + `onMoveItem` to `KanbanLane` (`:614-656`).
- `src/lib/plugins/kanban/KanbanLane.svelte`: new props `moveTargets` (the other lanes, `{ id, title }[]`) and `onMoveItem(laneId, itemId, toLaneId)`; forward to each `KanbanCard` (`:366-386`) as `moveTargets` and `onMove(toLaneId)`.
- `src/lib/plugins/kanban/KanbanCard.svelte`: card menu `:273-343` gains a `ContextMenu.Sub` "Move to" (icon `ArrowRightLeft`) listing `moveTargets` by title; `SubTrigger disabled` when the list is empty.
- `help/documentation/21-kanban.md:73,76` (and the Manual row of the sort table `:188`): name Move to and the chip.
- `src/tests/lib/plugins/kanban/KanbanView.test.ts`: menu pin `:261-269` gains "Move to"; new describe for Move to, the chip, and drag state.

## Plan

1. Failing test: "Move to" > "Done" on a To Do card puts it last in Done in `api.getMarkdown()`, gone from To Do.
2. `handleMoveItem` in KanbanView: `target = board.lanes.find(id)`; `moveItem(board, from, item, to, target.items.length, isLaneAutoComplete(board, target.title))` on the stored `board` (not `displayBoard`), then `applyChange`. A missing target returns early (moveItem would refuse it anyway).
3. `moveTargets` for a lane = `board.lanes.filter(l => l.id !== lane.id).map(({ id, title }) => ({ id, title }))`, from the stored board so titles and ids match what `moveItem` sees.
4. Chip: `<span>` "Manual order paused" after the sort block, `{#if !canReorder}`, `title` naming the card menu's Move to.
5. Tests for auto-complete, filtered target (full lane order), current lane not listed, single lane disabled, chip states, drag state (draggable on/off, a manual-order drop still moves).
6. Help text.

## Prior art

- Menu helpers `openMenu` and sub-trigger ArrowRight opening in `KanbanView.test.ts:248-306` (the "card limits" test).
- Filter via `kanbanStore.setFilterQuery`, sort via `setSortMode` in the seed, as `mountBoard` at `:366-374`.
- Restore test `:1434` for asserting persisted markdown via `parseKanbanBoard(api.getMarkdown())`.

## Risks

- Stored vs displayed length: using `displayBoard` would land the card before hidden cards. The filtered-target test asserts the full lane order.
- Auto-complete: derived from the target lane's title in the stored board, as the drop path does.
- No existing drag tests in the repo; the drag criterion is covered by new tests on `draggable` and a jsdom drop in manual order.

## Defaults taken

- Menu order: Edit, Archive, Move to, Card color, (Tag color), Delete. "Next to Card color", before it, so the two colour submenus stay together.
- The chip shows only in board view: list and table views have no drag and no card menu, so the hint would point at nothing there.
- No card limit check (42.1 default in the Issue).
