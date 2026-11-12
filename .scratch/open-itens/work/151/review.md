VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first, `src/tests/lib/plugins/kanban/kanban.logic.test.ts`: `cardProximity` returns `'none'` for a checked overdue card and `'overdue'` for the same card unchecked; `PROXIMITY_CLASSES` has an entry for every `DateProximity`, none of its strings matches a Tailwind palette class (`/-(red|orange|amber|yellow|green|blue|purple)-\d{2,3}\b/`), and each tone uses the token named above. — `kanban.logic.test.ts:1172-1213` covers all four parts. The token test asserts exact `{ badge, border }` objects that match the Issue's list (destructive, warning, type-orange, type-blue, muted with an empty border for future and none). Failing first holds by construction: commit 647f430c5 adds the test together with the exports it imports. The implementation is at `kanban.logic.ts:703-728`.
- [met] Failing first, `src/tests/lib/plugins/kanban/KanbanView.test.ts` (real stores): a board with a checked card dated yesterday renders that card without `border-l-destructive`, and an unchecked one with it. — `KanbanView.test.ts:144-212` mounts `KanbanViewHarness` with the real `kanbanStore`, and the board test asserts that the `[data-item-id]` element lacks `border-l-destructive` for the checked card and has it for the unchecked one. Both cards use 2000-01-01 instead of yesterday. It is overdue on the same branch of `getDateProximity` and needs no clock mock. Probe: with the four components restored to `main` and the new logic kept, the board, list and table tests all fail (3 failed / 9 passed). They pass on HEAD.
- [met] Existing kanban tests stay green. — `pnpm vitest run src/tests/lib/plugins/kanban src/tests/lib/architecture` exits 0 with 17 files and 360/360 tests. The full suite is deliver's to run.

## Findings

None.

## Checks run by the reviewer

- `pnpm check`: exit 0, 230 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/plugins/kanban src/tests/lib/architecture`: exit 0, 17 files, 360/360. My test verdict rests on these files: `src/tests/lib/plugins/kanban/kanban.logic.test.ts`, `src/tests/lib/plugins/kanban/KanbanView.test.ts`, the other kanban test files, and `src/tests/lib/architecture/` (pure-logic, layer-rules).
- Probe: I put the `main` versions of `KanbanCard`, `KanbanDatePicker`, `KanbanListView` and `KanbanTableView` back in place and ran `KanbanView.test.ts`. Exit 1, and the 3 new tests fail. Then I restored the files with `git checkout HEAD`, which left the worktree clean.
- `git diff main...HEAD --check` is clean, and no added line is indented with spaces.

## Verification notes

- No local map or ternary remains: `getDateProximity` is now called only inside `cardProximity`. The four components import `cardProximity` and `PROXIMITY_CLASSES`. A grep for palette classes in the four files finds only `KanbanTableView.svelte:74` (`text-green-500` on Done), which the Issue puts out of scope.
- The tokens are mapped as Tailwind colors in `src/app.css:25,67,71,75` (`--color-destructive`, `--color-type-orange`, `--color-type-blue`, `--color-warning`). Both themes define them (`app.css:195-203`, `269-277`). `app.css` has no `source(none)`, so Tailwind 4's automatic scan picks up the class strings in `kanban.logic.ts`. `features/tasks/task-status.logic.ts` already relies on that.
- Scope: the diff touches only the files the Issue names, their two test files and the discovery record. There is no layer-baseline or composition-root change.
- I did not check the rendered colors visually or measure contrast. The Issue's Notes put the contrast of type-orange and type-blue in separate work.
