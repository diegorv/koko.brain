VERDICT: APPROVED

# 11 review: field-level undo/redo history

Reviewed `git diff main...HEAD` (d9769e20, 3fc6beb8, 0f3291dc) in the worktree, against Issue 11, plan Task 10 (`plan-2026-10-28.md:257-269`), the later plan tasks that call this API (Task 16 `:381-392`, Task 23 `:541-570`, Task 27 `:630-660`), the prototype (`calender-app-design/src/stores/app-store.ts:147-231`, `app-store.test.ts:6-37`) and CLAUDE.md.

## Checks I ran myself

- `pnpm vitest run src/tests/lib/features/event-calendar/`: 2 files, 56/56 passed. The test verdict rests on `src/tests/lib/features/event-calendar/event-calendar-history.logic.test.ts` (21 cases, new). The other file in the folder, `event-calendar-dates.logic.test.ts`, is not touched by the diff and only confirms nothing nearby broke.
- `pnpm check`: 0 errors, 0 warnings.
- Probe (a scratchpad copy of the module run with `node --experimental-strip-types`, nothing written to the worktree): 2000 random sequences of push / takeUndo / takeRedo / remapPath with `max` 1-5 never let `undo.length` or `undo.length + redo.length` exceed `max`; `createEventHistory(0)` keeps nothing; `refuseOp` after a `remapPath` of the taken op's path removes nothing (finding 2).
- Indentation: no space-indented lines in either new file.

## Acceptance criteria

- [x] Ops typed as the `HistoryOp` union from `event-calendar.types.ts`; no framework imports; no `canvas-history.logic.ts` import. Evidence: the module's only import is `import type { EventState, HistoryOp } from './event-calendar.types'` (`event-calendar-history.logic.ts:12`).
- [x] `createEventHistory(max = 100)` creates an empty history with the cap. Evidence: `:40-42`; tests `:59-65`.
- [x] `pushOp` skips an update whose before equals its after, clears redo, caps at `max`. Evidence: `:49-53`; tests `:77-91` (no-op returns the same object, redo kept, matching the prototype, which leaves `future` alone when nothing changed), `:93-102` (a title-only change is recorded), `:104-111` (redo cleared), `:113-117` (cap drops the oldest).
- [x] `takeUndo` / `takeRedo` return `{ op; history }` with the op on the opposite stack. Evidence: `:56-67`; tests `:126-148`, `:171-176` (input not mutated), `:121-124` (null on an empty stack, the prototype's `undo()` contract).
- [x] `refuseOp(h, op)` removes an op that failed its precondition. Evidence: `:78-80` (by reference, both stacks, which fits Task 23 calling it after the take has moved the op to the other stack); tests `:180-200`.
- [x] `removeOp(h, predicate)` removes the matching op. Evidence: `:70-72`; tests `:204-221`, including the toast-Undo delete case.
- [x] `remapPath` moves ops to the new path; `dropPath` removes a path's ops. Evidence: `:83-91`, both stacks (Task 23's `vanished` path needs `dropPath` to reach the taken op on the redo stack, and it does); tests `:225-250`.
- [x] The test ports `app-store.test.ts:6-37` without seed-id order dependence and covers labels, redo cleared, the cap, no-op, remap and drop, create/delete round trips, `refuseOp`, `removeOp`. Evidence: ops come from the local `state()` / `move()` / `create()` / `del()` factories (`test.ts:19-51`); labels `:126-148`, `:150-159`; delete round trip with `trashId` `:161-169`. The prototype's third case ("does not record notifications") has no counterpart here because the calendar history only ever receives ops; correct to leave out.
- [x] JSDoc on every export; tabs. Evidence: every exported interface, field and function carries `/** */`; the private `STATE_KEYS` / `sameState` are not exports (`sameState` has JSDoc anyway).
- [ ] Gate green; one commit in the full CLAUDE.md format. Not met yet by design: the full gate is the deliver step's job. The feat commit 3fc6beb8 is in the full format (Context, Solution, Behavior, Files with line ranges `1-91` and `1-251`, both verified against the files; Problem is omitted, which docs/COMMITS.md:82 allows for a purely additive feature).

## Scope and rules

- Layer: a pure `.logic.ts` under `features/event-calendar/`, type-only import from its sibling types file. No store, no service, no side effects. No scope creep: the two files in "Touches" plus the scratch notes.
- No error handling added for impossible inputs; `takeUndo` / `takeRedo` return `null` rather than throwing, which is the prototype contract and what Task 23's `{ status: 'empty' }` needs.
- Immutability is real: every function builds new arrays (`slice`, spread, `filter`, `map`), and the probe plus the non-mutation tests confirm it.

## Findings

1. Low. `src/lib/features/event-calendar/event-calendar-history.logic.ts:32`. `STATE_KEYS` is typed `(keyof EventState)[]`, so a field added to `EventFields` later is not a compile error here, and an update that changes only that field would be judged a no-op and silently not recorded (Cmd+Z would skip it). Fix: make the list exhaustive at compile time, for example build it from an object literal checked with `satisfies Record<keyof EventState, true>`, or switch to ticket 07's `sameEventState` (`plan-2026-10-28.md:171`) once 07 is on main. The switch is only noted in `work/11/discovery.md`; a one-line comment at `sameState` naming `sameEventState` would keep the follow-up from being lost, since 07 is being built in parallel and two equality helpers for the same type will otherwise coexist.
2. Low. `src/lib/features/event-calendar/event-calendar-history.logic.ts:74-86`. `refuseOp` matches by reference and `remapPath` replaces every op on the path with a new object, so a `refuseOp(h, taken.op)` issued after a `remapPath` of that op's path removes nothing (probe confirmed). Task 23's planned order (take, check precondition, refuse) does not hit this, but the queued write service could if a rename lands between the take and the refusal. Fix: say it in the `refuseOp` JSDoc ("call it before any `remapPath` of the op's path; a remap replaces the op object"), so Task 23 does not have to rediscover it. No code change needed.
3. Nit. `src/tests/lib/features/event-calendar/event-calendar-history.logic.test.ts:203-250`. Non-mutation is asserted for `pushOp` (`:69-75`) and `takeUndo` (`:171-176`) but not for `removeOp`, `refuseOp`, `remapPath` or `dropPath`, though the module JSDoc (`logic.ts:2-4`) promises it for every function and the Task 16 store relies on it. Fix: one case that snapshots `h.undo` / `h.redo` before a `remapPath` and a `dropPath` that do change something, and checks the original is unchanged.

## Resolution

All three findings accepted and fixed in the fix commit.

1. `STATE_KEYS` is now derived from `STATE_KEY_SET`, an object literal checked with `satisfies Record<keyof EventState, true>`, so a new `EventFields` key is a compile error until listed. Ticket 07's `sameEventState` is not on main yet; a follow-up line in the `sameState` JSDoc names it.
2. `refuseOp` JSDoc now says to call it before any `remapPath` of the op's path, since a remap replaces the op object. No code change.
3. New test case: `remapPath`, `dropPath`, `removeOp` and `refuseOp` each change the history, and the input history (values and op references) is unchanged afterwards.
