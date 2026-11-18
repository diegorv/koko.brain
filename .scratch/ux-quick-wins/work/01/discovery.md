# Issue 01 discovery: rename keeps lane settings, unique lane titles

No `spec.md` exists for ux-quick-wins; the Issue is the spec.

## Files that change

- `src/lib/plugins/kanban/kanban.logic.ts:475-499`: `addLane` (unchanged), `renameLane` (moves or copies the `laneSettings` entry, suffixes a taken title), new exported `uniqueLaneTitle(board, wanted, exceptLaneId?)`.
- `src/lib/plugins/kanban/KanbanView.svelte:128-133`: `handleAddLane` passes `uniqueLaneTitle(board, 'New Lane')`; import added. `handleRenameLane` (`:120-122`) stays as is because `renameLane` itself applies the suffix.
- `src/tests/lib/plugins/kanban/kanban.logic.test.ts:552-561` (renameLane block) and a new `uniqueLaneTitle` block.
- `src/tests/lib/plugins/kanban/KanbanView.test.ts`: new describe, Add Lane twice persists "New Lane" and "New Lane 2".

## Plan

1. Tests first in `kanban.logic.test.ts`: the five logic criteria (move with all three settings, no entry gains none, rename onto taken title gives "<title> 2" and keeps the other lane's entry, shared "Done" entry copied, serialize/parse round trip plus `moveItem` with `isLaneAutoComplete`). Plus `uniqueLaneTitle` unit cases (free title, " 2", skips to " 3", `exceptLaneId` ignores the lane itself).
2. `uniqueLaneTitle`: return `wanted` if no other lane (ignoring `exceptLaneId`) has it, else the first free `${wanted} ${n}` for n = 2, 3, ...
3. `renameLane`: find lane; final title = `uniqueLaneTitle(board, newTitle, laneId)`; if lane missing or final title equals the current title return `board` unchanged. Map titles. If `laneSettings[oldTitle]` exists, write a copy under the final title, and delete the old key only when no remaining lane has the old title.
4. `handleAddLane`: `addLane(board, uniqueLaneTitle(board, 'New Lane'))`; title-edit focus unchanged.
5. View test: mount `KanbanViewHarness`, click the "Add Lane" button twice, parse `api.getMarkdown()` and check lane titles.

## Prior art

- Logic tests: `makeBoard()` helper and `settings round-trip` describe in `kanban.logic.test.ts:799-845`.
- View tests: `KanbanView.test.ts:45-110` (mount harness, `api.getMarkdown()`, `flushSync`).

## Risks

- `renameLane` with an unchanged or self-suffixed title ("Done 2" renamed to "Done" while another "Done" exists resolves to "Done 2") returns the same board, so `applyChange`'s no-op guard keeps it from persisting.
- A stale key under the new title (left by an earlier rename) is taken over when the renamed lane has no entry, by title lookup. The Issue leaves stale keys alone, so no cleanup.
- View test: the first new lane is in title edit when Add Lane is clicked again; `.click()` in jsdom does not blur, so the second lane is added from the same board state. If the input's blur fires on unmount it commits an unchanged title, which is a no-op.

## Defaults taken

- Suffix rule as in the prototype (`kanban-board.html:1174`): " 2", " 3", counting from 2, applied on rename (Issue comment 01.1) and on Add Lane.
- `addLane` keeps accepting any title; uniqueness is applied by its caller, as the Issue states.
- No E2E change: no selector changes.
