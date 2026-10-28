# 11 discovery: field-level undo/redo history

## Files that change (all new)

- `src/lib/features/event-calendar/event-calendar-history.logic.ts`: pure module; only `import type { EventState, HistoryOp }` from `./event-calendar.types` (`HistoryOp` at `event-calendar.types.ts:150-185`).
- `src/tests/lib/features/event-calendar/event-calendar-history.logic.test.ts`.

## Plan

One feat commit (the ticket asks for one), test first.

- `EventHistory = { undo: HistoryOp[]; redo: HistoryOp[]; max: number }`, treated as immutable: every function returns a new object and never mutates its input (the data store of Task 16 replaces its `$state` field with the result).
- `createEventHistory(max = 100)`.
- `pushOp(h, op)`: an `update` whose `before` equals `after` field by field returns `h` unchanged (same reference, redo kept); otherwise appends, drops the oldest past `max`, clears redo.
- `takeUndo(h)` / `takeRedo(h)`: `{ op; history } | null` (null on an empty stack); the op moves to the top of the opposite stack, so the caller applies `op` and needs no extra push.
- `refuseOp(h, op)`: removes that op (by reference) from both stacks. Used after `takeUndo` / `takeRedo` when the precondition fails, so the op sits on the opposite stack by then.
- `removeOp(h, predicate)`: removes every op matching the predicate from both stacks.
- `remapPath(h, from, to)`: ops whose `path === from` get `path: to` (other fields kept). `dropPath(h, path)`: removes ops whose `path === path`.

## Prior art

- Prototype `calender-app-design/src/stores/app-store.ts:147-231` (snapshot stack, limit 100, redo cleared on a new change, no-op not recorded) and `app-store.test.ts:6-37`.
- Test style: `src/tests/lib/features/event-calendar/event-calendar-dates.logic.test.ts`. Tests build ops from a local `state()` factory, so no seed-id order dependence.

## Risks

- `sameEventState` is planned in ticket 07 (`event-calendar-event.logic.ts`, not on main yet). The no-op check uses a private field comparison over the seven `EventState` keys instead, to avoid a dependency on an unmerged ticket. A later cleanup can switch to `sameEventState` once 07 lands.

## Defaults taken for open questions

- Empty-stack take returns `null` (the prototype's `undo()` returns null).
- `refuseOp` / `removeOp` / `remapPath` / `dropPath` touch both stacks.
- The cap applies on push only; ops moved by take never exceed it because the total count does not grow.
