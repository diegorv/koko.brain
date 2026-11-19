# 040 discovery: Kanban drop lands where the indicator shows

No `spec.md` in `.scratch/open-itens/`; the Issue is the spec.

## Files that change

- `src/lib/plugins/kanban/kanban.logic.ts` (after `moveItem`, ~:470): new pure `dropSlotToIndex(slot, sourceSlot)`:
  returns `slot - 1` when `0 <= sourceSlot < slot`, else `slot`. Maps a visual slot (counted with the dragged
  element still rendered) to the post-removal index that `moveItem` / `moveLane` splice at.
- `src/lib/plugins/kanban/KanbanView.svelte`
  - `handleItemDrop` (:460-485): when `fromLaneId === toLaneId`, find the dragged card's index among the lane's
    `[data-item-id]` elements and pass `dropSlotToIndex(toIndex, thatIndex)` to `moveItem`. Cross-lane drops keep the raw slot.
    `handleItemDragOver` keeps the raw slot: the indicator is drawn before card i in the full rendered list (KanbanLane.svelte:368), which is the visual slot.
  - `handleLaneDrop` (:509-531): select lanes with `:scope > [data-lane-id]` (lane roots are direct children of the
    board region, KanbanView.svelte:626-634; cards carry `data-lane-id` too, KanbanCard.svelte:209, but are nested).
    Compute the visual slot over lanes (fallback `laneEls.length`, past the last lane), then
    `dropSlotToIndex(slot, fromIndex)`; skip when the result equals `fromIndex`.
- `moveItem` / `moveLane` are unchanged (their tests use post-removal indices and stay green).

## Tests (test-first)

- `src/tests/lib/plugins/kanban/KanbanView.test.ts`, `describe('card drag')` (:1634) is the prior art: mount harness,
  `dispatchEvent(new MouseEvent('dragstart'))`, drop on the lane `[role="list"]`, assert `persistedLanes()`.
  Add: stub `getBoundingClientRect` per card (A 0-20, B 20-40, C 40-60) ->
  1. A dropped at clientY just above C's midpoint -> To Do = B, A, C (fails today: B, C, A).
  2. A dropped on its own lower half -> unchanged (fails today: B, A, C).
  3. Upward move (C dropped above A's midpoint) -> C, A, B (stays green).
  Lane drag: three lanes with cards, stub lane rects (0-100, 110-210, 220-320), dragstart on lane 1's
  `[aria-label="Drag to reorder lane"]`, drop on `[role="region"][aria-label="Kanban board"]`:
  4. clientX past last lane's midpoint -> lanes 2, 3, 1 (fails today: no change).
  5. clientX between lane 2 and lane 3 midpoints -> lanes 2, 1, 3.
- `src/tests/lib/plugins/kanban/kanban.logic.test.ts`: `dropSlotToIndex` unit tests (source before, at, after slot; -1 source).

## Risks / defaults

- `:scope` selector: supported by jsdom and WebKit. Relies on lanes staying direct children of the board region.
- Drag is disabled when sorted or filtered (`canReorder`), so DOM card order equals stored lane order; no mapping needed for filtered views.
- Card drop events bubble to the board region's `handleLaneDrop`, which returns early without `dragLaneId` (unchanged).
