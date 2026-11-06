# 28: Renaming a kanban lane keeps its card limit, auto-complete and collapsed state

**What to build:** Lane settings are keyed by lane title (board.settings.laneSettings, src/lib/plugins/kanban/kanban.types.ts:54-55; lookups at src/lib/plugins/kanban/kanban.logic.ts:594-659), but renameLane (kanban.logic.ts:492-499) changes only lane.title. After a rename the lane loses its limit, auto-check on drop and collapsed state, and the old key stays in the %% kanban:settings block, where a lane later given the old title inherits it. Fix direction: renameLane moves the laneSettings entry from the old title to the new one (and drops the old key) in the same board update.

**Blocked by:** 123

**Status:** ready-for-agent

**First wave:** yes, added by the owner on 2026-11-06 after the challenge review (`raw/first-wave-challenge.json`).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/plugins/kanban/kanban.logic.test.ts: board with lane 'Done' and settings.laneSettings { Done: { autoComplete: true, maxItems: 5, collapsed: true } }; renameLane(board, laneId, 'Complete'); isLaneAutoComplete, getLaneMaxItems and isLaneCollapsed for 'Complete' return true, 5, true, and laneSettings has no 'Done' key. It fails today.
- [ ] A lane with no settings renames without adding a laneSettings entry.
- [ ] The serialized board round-trips through parseKanbanBoard with the settings under the new title.
- [ ] A card dragged into the renamed auto-complete lane is checked.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/medium. A lane rename drops the lane's settings on a daily-used board.
- **Trigger:** Rename a lane that has a card limit, auto-complete or is collapsed (e.g. 'Done' with auto-complete, renamed to 'Complete') by double-clicking its title or via Rename.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/plugins/kanban/KanbanLane.svelte:149-155 commitTitleEdit -> onRenameLane; src/lib/plugins/kanban/KanbanView.svelte:120-122 handleRenameLane applies renameLane only; src/lib/plugins/kanban/kanban.logic.ts:492-499 renameLane maps title only; kanban.logic.ts:595, :616, :647 read laneSettings[laneTitle]; KanbanView.svelte:528-532 pass collapsed/maxItems/atLimit/autoComplete by lane.title; KanbanView.svelte:402-403 auto-check on drop reads isLaneAutoComplete(board, targetLane.title); src/tests/lib/plugins/kanban/kanban.logic.test.ts:549-561 renameLane tests check only the title.
- **Second opinion:** upheld (ux, medium). Confirmed. renameLane (kanban.logic.ts:492-499) changes only lane.title. Every lane-settings getter reads laneSettings[laneTitle] (:594-659), and handleRenameLane (KanbanView.svelte:120-122) applies renameLane alone. After a rename the lane loses its limit, auto-complete and collapsed state. The old key stays in the settings block rather than being deleted from disk, so the effect is lost configuration in behavior, not lost written content. Corrections to apply while implementing: Category ux: the settings entry stays on disk under the old title, and no written content is lost.
- **Source:** audit 2026-11-05, domain `boards`, finding `N-boards-02` (from boards-content-3, boards-ux-4, boards-spec-3). Size S.

## Comments

- 2026-11-06: added to the first wave by the owner after the challenge review.
