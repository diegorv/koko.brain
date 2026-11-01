# 48: Cmd+Z while a drag's write is in flight is refused and dropped

**What to build:** with a drag's write still in flight, `undoEventChange` takes the op before the drag (the drag is not in the history yet), finds the note in the drag's state instead of the state that op expects, returns `refused` and drops the op. The user's Cmd+Z silently does nothing and the earlier change can no longer be undone.

Reproduced by the Issue 14 review with the sequence: move, settle, hold, move, flush, undo, release, settle; the undo returns `refused` ("Move event").

Decide the intended behaviour (wait for in-flight writes before undoing, or undo the in-flight drag), then extend the model test's refused-undo invariant to undos issued while an earlier op is in flight.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** Issue 14 (calendar write queue model test, branch `issue/14-calendar-write-queue-model-test`): the unrestricted random runs of `src/tests/lib/features/event-calendar/event-calendar.model.test.ts` reached this race; the generator now excludes it (see that file's header). Code: `src/lib/features/event-calendar/event-calendar.service.ts`.

- [ ] A failing named sequence reproduces it first (the sequence above)
- [ ] After the fix no undo issued during an in-flight drag is refused, and the earlier change stays undoable
- [ ] The model test's refused-undo check covers non-idle undos

## Notes

- **Not checked:** in the running app; the review reproduced it in the model test.
