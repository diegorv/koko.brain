VERDICT: APPROVED

Reviewed `git diff main...HEAD` (105636ed9, bd5f7b34e, 25b5c8151) in the worktree. No `spec.md` exists for ux-quick-wins; the Issue is the spec.

## Acceptance criteria

- [met] Failing test first, `src/tests/lib/plugins/kanban/kanban.logic.test.ts` (real logic, no mocks): lane "Done" with `{ autoComplete: true, maxItems: 5, collapsed: true }` renamed to "Complete": `isLaneAutoComplete`, `getLaneMaxItems` and `isLaneCollapsed` return true, 5, true for "Complete" and `laneSettings` has no "Done" key. — test `moves the lane settings to the new title` (kanban.logic.test.ts:566-576) asserts all three getters and `not.toHaveProperty('Done')`; no mocks in the file; commit bd5f7b34e adds tests and logic together (build report says 12 failed before; the test body would fail on main since main's `renameLane` leaves the "Done" key and the getters return defaults).
- [met] A lane with no settings renames without gaining a `laneSettings` entry. — `does not give a lane without settings a settings entry` (:578-583) and `does not create laneSettings on a board that has none` (:585-589); code path kanban.logic.ts:518-520 returns early with no entry. See finding 1 for a prototype-key edge.
- [met] Renaming to a title another lane has gives "<title> 2" and leaves that lane's settings unchanged (its limit and auto-complete are not overwritten). — `suffixes a title another lane already has and keeps that lane's settings` (:591-606): "To Do" renamed to "Done" becomes "Done 2", `Done` entry stays `{ autoComplete: true, maxItems: 5 }`, "Done 2" carries the moved `maxItems: 2`.
- [met] Two lanes titled "Done" sharing one entry: renaming one keeps the "Done" entry and gives the renamed lane a copy. — `copies a shared entry when another lane still has the old title` (:609-623) checks both entries and that the copy is a distinct object; code kanban.logic.ts:522-523 deletes the old key only when no remaining lane has it.
- [met] Serialize then `parseKanbanBoard` keeps the settings under the new title; a card moved into the renamed auto-complete lane with `moveItem` and `isLaneAutoComplete` is checked. — `keeps the settings under the new title through serialize and parse` (:647-665) round-trips, asserts `laneSettings` equals `{ Complete: {...} }`, then `moveItem(..., autoCheck)` with `isLaneAutoComplete(parsed, 'Complete') === true` and the moved card `checked: true`.
- [met] `src/tests/lib/plugins/kanban/KanbanView.test.ts` (harness `src/tests/fixtures/KanbanViewHarness.svelte`, only `kanban.service.js` mocked): clicking Add lane twice persists lanes "New Lane" and "New Lane 2". — new describe `KanbanView: Add Lane` (KanbanView.test.ts:288-323) mounts the harness, clicks the rendered "Add Lane" button twice, parses `api.getMarkdown()` to `['To Do', 'Done', 'New Lane', 'New Lane 2']` and checks 2 persists; the only `vi.mock` in the file is `kanban.service.js` (:15-17).
- [met] Frontend gate: pnpm check and pnpm vitest run pass. — `pnpm check` exit 0 (0 errors, 0 warnings); targeted tests pass (see below). The full `pnpm vitest run` is deliver's to run.

## Checks run by the reviewer

- `pnpm check`: exit 0, 236 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/plugins/kanban/kanban.logic.test.ts src/tests/lib/plugins/kanban/KanbanView.test.ts`: exit 0, 261/261.
- `pnpm vitest run src/tests/lib/plugins/kanban` (all 8 kanban test files plus a throwaway probe): exit 0, 296 tests. The test verdict rests on these kanban test files.
- Probe (deleted, worktree clean afterwards): a lane titled `constructor` with no entry, renamed to "X" on a board with `laneSettings: { Done: {...} }`, yields `laneSettings` `{ Done: {...}, X: {} }`. Basis of finding 1.
- Callers: `renameLane` and `uniqueLaneTitle` are used only in KanbanView.svelte:122 and :130; no E2E spec references "New Lane" or the rename path; no selector changed.
- `KanbanLane.svelte:150-154` trims the typed title and the parser trims headings (kanban.logic.ts:219), so a trailing-space title cannot dodge the uniqueness check and collide after a round trip.
- `applyChange` (KanbanView.svelte:80-91) skips a same-reference board, so the `return board` paths in `renameLane` (unchanged or self-suffixed title, unknown lane) do not persist.
- No layer-baseline or composition-root change. Scope: only the two source files and their test files named by the Issue.

## Findings

1. minor, src/lib/plugins/kanban/kanban.logic.ts:519 — `laneSettings?.[oldTitle]` reads inherited `Object.prototype` members, so a lane titled `constructor`, `toString`, `hasOwnProperty`, `valueOf` (etc.) with no entry of its own gets `entry` = a function, passes the `!entry` guard and gains an empty `"<newTitle>": {}` entry that is written into the `%% kanban:settings` block. This breaks "a lane with no entry gains none" for those titles (reproduced with a probe). Harmless to behaviour (an empty entry reads as defaults) but it writes junk. Fix: `const entry = laneSettings && Object.hasOwn(laneSettings, oldTitle) ? laneSettings[oldTitle] : undefined;` and add a test renaming a `constructor` lane. The same inherited-key read exists in the pre-existing getters (:621, :642, :673), out of scope here.
2. nit, src/lib/plugins/kanban/kanban.logic.ts:513-514 — renaming "Done 2" to "Done" while another lane is "Done" resolves back to "Done 2" and silently does nothing. Correct per the suffix rule and the Issue; noted only because the user gets no feedback. No change asked.

## Resolution

1. Fixed: `renameLane` reads the old title's entry only when `laneSettings` has it as an own key (`Object.hasOwn`), so a lane titled `constructor` gains no entry on rename. Test: `does not read an Object.prototype member as the settings of a lane titled "constructor"` in `src/tests/lib/plugins/kanban/kanban.logic.test.ts` (failed before the fix). The same read in the pre-existing getters is left out of scope, as the review says.
2. No change: the nit asks for none; the behaviour follows the suffix rule.
