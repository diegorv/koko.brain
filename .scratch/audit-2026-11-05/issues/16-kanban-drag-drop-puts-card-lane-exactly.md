# 16: Kanban drag-and-drop puts a card or lane exactly where the drop indicator shows

**What to build:** Two index bugs in the Board view drag handlers. (1) Cards: handleItemDragOver/handleItemDrop (src/lib/plugins/kanban/KanbanView.svelte:365-405) compute the slot among all rendered cards, the dragged card included, and moveItem (src/lib/plugins/kanban/kanban.logic.ts:446-450) removes the card before splicing at that index. A downward move inside one lane therefore lands one slot below the indicator ([A,B,C], A dropped before C gives [B,C,A]), and dropping on the lower half of the card itself moves it down by one. (2) Lanes: handleLaneDrop (KanbanView.svelte:434-456) indexes container.querySelectorAll('[data-lane-id]'), but every card also carries data-lane-id (KanbanCard.svelte:173), so the index counts cards; moveLane (kanban.logic.ts:502-505) rejects the out-of-range index and the drop silently does nothing, or targets the wrong lane. Even with only lanes counted, a rightward lane move has the same remove-then-insert off-by-one (kanban.logic.ts:508-509). Fix direction: compute the lane drop index over lane elements only (a selector or attribute cards do not carry), and map the visual slot to the post-removal index when the source sits before the slot, for both cards in one lane and lanes. Keep cross-lane card moves as they are (they are right today).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/plugins/kanban/KanbanView.test.ts: mount the harness with lanes 'To Do' [A,B,C] and 'Done' [D], stub getBoundingClientRect on the cards, dispatch dragstart on card A and drop on the To Do card list with clientY just above C's midpoint; the persisted markdown lists To Do as B, A, C. It fails today (B, C, A).
- [ ] A drop on the lower half of the dragged card itself leaves the lane order unchanged.
- [ ] Failing test first, same file: board with three lanes that each hold cards, stub lane rects, dragstart on lane 1's grip and drop with clientX past the last lane's midpoint; the persisted lane order is lane 2, lane 3, lane 1. It fails today (no change).
- [ ] Dropping a lane before the lane to its right's right neighbour lands it between those two lanes, matching the drop position.
- [ ] Upward card moves, cross-lane card moves and auto-complete on cross-lane drop behave as today (existing moveItem tests stay green).
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/high. Moving a card down inside a lane, or moving any lane, lands in the wrong slot on a daily-used board. Acceptance item 1 should read 'lists To Do as B, A, C'.
- **Trigger:** In Board view with manual sort and no filter: drag a card down inside its own lane (e.g. A in [A,B,C] dropped in the gap before C), or drop it on the lower half of itself; or drag a lane by its grip to any slot except the first on a board whose lanes hold cards.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/plugins/kanban/KanbanView.svelte:370-381 indicator index over all [data-item-id] cards including the dragged one; src/lib/plugins/kanban/KanbanLane.svelte:325-327 indicator drawn before card i; KanbanView.svelte:388-405 same index passed to moveItem; src/lib/plugins/kanban/kanban.logic.ts:440,446-450 takeFromLane removes the card, then splice at toIndex into the shorter list; src/tests/lib/plugins/kanban/kanban.logic.test.ts:429-434 only tests the post-removal index. Lanes: KanbanView.svelte:438-450 querySelectorAll('[data-lane-id]') over the board region; KanbanLane.svelte:217 lanes and KanbanCard.svelte:173 cards both carry data-lane-id; KanbanView.svelte:441 fallback laneEls.length - 1 counts cards; kanban.logic.ts:505 toIndex >= lanes.length returns the board unchanged; kanban.logic.ts:508-509 remove-then-insert off-by-one for rightward moves. Documented: help/documentation/21-kanban.md:46 and :73. No lane-drop or card-drop test in src/tests/lib/plugins/kanban/KanbanView.test.ts.
- **Second opinion:** upheld (ux, high). Confirmed. handleItemDrop (KanbanView.svelte:385-405) indexes over all [data-item-id] cards, the dragged one included, and moveItem takes the card out before splicing (kanban.logic.ts:440-450), so [A,B,C] with A dropped before C becomes [B,C,A]. handleLaneDrop (:434-456) uses querySelectorAll('[data-lane-id]'), and KanbanCard.svelte:173 also puts data-lane-id on every card, so the index counts cards and moveLane (:502-505) rejects it or moves the wrong lane. The board order on disk follows the move, but no text is lost. Corrections to apply while implementing: Acceptance item 1 contains a leftover fragment ('lists To Do as A? no: B, A, C'). It should read 'lists To Do as B, A, C'.
- **Source:** audit 2026-11-05, domain `boards`, finding `N-boards-01` (from boards-content-5, boards-ux-3, boards-spec-2, boards-spec-4). Size M.

## Comments
