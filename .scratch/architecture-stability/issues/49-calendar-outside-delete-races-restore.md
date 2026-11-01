# 49: An outside delete racing a Calendar restore leaves a tombstone over the restored note for two bumps

**What to build:** when an outside delete of a Trash entry's original path races the calendar's restore of that entry, the restore ends with a clocked tombstone still standing over the restored note. `prunePending` (event-calendar-event.logic.ts) only drops it at `settledAtVersion + 2`, so the restored note is hidden for two index bumps.

Drop or replace the tombstone when the restore settles, then make the model test's end check use one bump for every run (it uses two only when the run has an outside change).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** Issue 14 (calendar write queue model test, branch `issue/14-calendar-write-queue-model-test`): the unrestricted random runs of `src/tests/lib/features/event-calendar/event-calendar.model.test.ts` reached this race; the generator now excludes it (see that file's header). Code: `src/lib/features/event-calendar/event-calendar.service.ts`.

- [ ] A failing named sequence reproduces it first (calendar restore with its rename held, an outside delete on the path, release, one bump)
- [ ] After the fix the restored note shows after one bump
- [ ] The model test's `finish` bumps once for every run and stays green

## Notes

- **Not checked:** in the running app; found by the model test only.
