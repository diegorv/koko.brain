# 11: Field-level undo/redo history for calendar changes

**What to build:** the calendar has its own pure undo/redo history in `event-calendar-history.logic.ts`. It records field-level `HistoryOp` entries: `update` (move, resize, edit including the title), `create` / `duplicate`, and `delete`. It moves ops between the undo and redo stacks, retires ops that fail their precondition or that the toast Undo already handled, and follows or drops note paths. This keeps the prototype's behaviour that Cmd+Z right after a delete restores the event (`app-store.ts:147-231`). The module is written fresh, not imported from `src/lib/features/canvas/canvas-history.logic.ts:1-75`, which stores whole snapshots typed on `@xyflow/svelte` `Node` / `Edge`. The data store (Task 16) and the write services (Tasks 23 and 27) build on it.

**Plan reference:** Task 10 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 257-269). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 05

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/event-calendar-history.logic.ts` (new)
- `src/tests/lib/features/event-calendar/event-calendar-history.logic.test.ts` (new)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

- [ ] Ops are typed as the `HistoryOp` union declared in `event-calendar.types.ts` (ticket 05); the module has no framework imports and does not import `canvas-history.logic.ts`.
- [ ] `createEventHistory(max = 100)` creates an empty history with the given cap.
- [ ] `pushOp(h, op)` skips an `update` whose before equals its after, clears the redo stack, and caps the stack at `max`.
- [ ] `takeUndo(h)` / `takeRedo(h)` return `{ op; history }` with the op moved to the opposite stack.
- [ ] `refuseOp(h, op)` removes an op that failed its precondition.
- [ ] `removeOp(h, predicate)` removes the matching op (the toast Undo uses it to retire a delete op).
- [ ] `remapPath(h, from, to)` moves ops to the new path and `dropPath(h, path)` removes a path's ops.
- [ ] `event-calendar-history.logic.test.ts` ports the behaviour of `calender-app-design/src/stores/app-store.test.ts:6-37` without its order dependence on seed ids, and covers: labels, redo cleared by a new op, the cap, a no-op not recorded, remap and drop, create/delete round trips through undo and redo, `refuseOp` and `removeOp`.
- [ ] JSDoc on every export; tabs for indentation.
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 12:35 — discovery — plan in work/11/discovery.md; one new pure module + test — 0ace4d20
