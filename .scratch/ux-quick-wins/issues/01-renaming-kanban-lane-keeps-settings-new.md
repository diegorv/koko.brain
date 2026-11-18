# 01: Renaming a kanban lane keeps its settings; new lanes get unique names

**Origin:** design review 2026-11-17, proposal P04 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/kanban-board.html` (P04, suffix rule at `:418,:1174`), research `.scratch/ux-quick-wins/research/verdict-kanban.md` and `breakdown.md` (old ticket 03). Absorbs open-itens 049 (`.scratch/open-itens/issues/049-renaming-kanban-lane-keeps-card-limit-auto.md`, already marked wontfix with a pointer here).

**What to build:**

1. **Rename keeps the settings.** `renameLane` (`src/lib/plugins/kanban/kanban.logic.ts:491-499`) moves `laneSettings[oldTitle]` to the new title. When another lane still has the old title (two lanes titled "Done" sharing one entry) it copies the entry instead of moving it, so neither lane loses its behaviour. A lane with no entry gains none.
2. **Titles stay unique.** A new title that another lane already has gets a suffix (" 2", " 3"). The suffix rule ships with the key move, never alone: without it a rename onto an existing title would move one lane's entry over another's and overwrite that lane's limit and auto-complete. Exported pure `uniqueLaneTitle(board, wanted, exceptLaneId?)` serves both rename and Add lane.
3. **Add lane.** `handleAddLane` (`src/lib/plugins/kanban/KanbanView.svelte:128-133`) calls `addLane(board, uniqueLaneTitle(board, 'New Lane'))`, so two clicks give "New Lane" and "New Lane 2". The new lane still opens in title edit (`:132`).
4. **Write path, stated.** This changes what a lane rename writes into the existing `%% kanban:settings` block of a `.kanban` file, through the existing serializer. It removes a settings loss and adds no new write path and no new file. The owner promoted this ticket to the top on 2026-11-18 because the loss is silent on a daily-use board.

Not in this ticket: open-itens 048 (renaming a lane to "Archive" after a raw `---`) stays open and is not fixed here. Stale settings keys left by renames made before this ticket stay as they are. No change to card drag or to lane ids (they are regenerated on every parse and are not persisted, so no id-keyed migration).

**Size:** S.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [ ] Failing test first, `src/tests/lib/plugins/kanban/kanban.logic.test.ts` (real logic, no mocks): lane "Done" with `{ autoComplete: true, maxItems: 5, collapsed: true }` renamed to "Complete": `isLaneAutoComplete`, `getLaneMaxItems` and `isLaneCollapsed` return true, 5, true for "Complete" and `laneSettings` has no "Done" key.
- [ ] A lane with no settings renames without gaining a `laneSettings` entry.
- [ ] Renaming to a title another lane has gives "<title> 2" and leaves that lane's settings unchanged (its limit and auto-complete are not overwritten).
- [ ] Two lanes titled "Done" sharing one entry: renaming one keeps the "Done" entry and gives the renamed lane a copy.
- [ ] Serialize then `parseKanbanBoard` keeps the settings under the new title; a card moved into the renamed auto-complete lane with `moveItem` and `isLaneAutoComplete` is checked.
- [ ] `src/tests/lib/plugins/kanban/KanbanView.test.ts` (harness `src/tests/fixtures/KanbanViewHarness.svelte`, only `kanban.service.js` mocked): clicking Add lane twice persists lanes "New Lane" and "New Lane 2".
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Original proposal

- **P04.** Lane settings are keyed by title, so a rename drops auto-complete, the card limit and the collapsed state, and every new lane is titled "New Lane". `renameLane` moves `laneSettings[oldTitle]` to the new title and refuses or suffixes a title already in use; new lanes get unique titles. Validation: revise, the "key by lane id" follow-up is dropped because lane ids are not persisted.
- **Open-itens 049.** Renaming a kanban lane keeps its card limit, auto-complete and collapsed state; its five criteria are carried above.

## Problem

A lane titled "Done" with auto-complete on, a card limit of 5 and a collapsed state loses all three the moment it is renamed "Complete", and nothing says so. The old key stays in the settings block, so the loss is in behaviour, not in written text, and it is invisible until a card is dropped into the lane and is not checked. A second lane added with the default title shares the first one's settings entry.

## Evidence

Checked at `085b23c5d`.

- `src/lib/plugins/kanban/kanban.logic.ts:491-499`: `renameLane` maps the title only. `:595`, `:616`, `:647` read `laneSettings[laneTitle]` (`isLaneCollapsed`, `getLaneMaxItems`, `isLaneAutoComplete`); `:600-659` write them the same way. No reader of `laneSettings` exists outside `kanban.logic.ts`.
- `src/lib/plugins/kanban/kanban.logic.ts:476-481`: `addLane` takes any title. `KanbanView.svelte:128-133`: `handleAddLane` always passes "New Lane". `KanbanView.svelte:120-122` `handleRenameLane` applies `renameLane` alone; `:403` and `:532` read the settings by `lane.title`.
- `src/tests/lib/plugins/kanban/kanban.logic.test.ts:552-561`: the rename tests check only the title.

## Sequence with

Tickets 02, 05, 10, 11, 12 and 42 all edit `KanbanView.svelte` and `KanbanView.test.ts` on other lines (02 the key handler and toolbar, 05 the toolbar and card menu, 10 the board root focus, 42 the card menu); run them in order, one at a time. shell-sidebars-ux 25 wraps the kanban toolbar (`KanbanView.svelte:462-507`) in a `ViewHeader`; this ticket edits `handleAddLane` outside that block, but do not run both in parallel worktrees. Open-itens 048 edits the neighbouring lane actions and stays open.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping, and the promotion of this ticket to 01 as a grave data bug. Defaults (not individually answered): 01.1 (old 03.1, raised by the coverage check): a typed lane title that matches another lane is suffixed (" 2") on rename as well as on Add lane, a visible change to a daily-use file. Default: yes, because without it a rename would overwrite the other lane's limit and auto-complete.
