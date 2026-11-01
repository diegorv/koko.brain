# 60: An outside create on a path that holds a calendar rename's `from` tombstone stays hidden for two bumps

**What to build:** After the calendar renames X to Y, X carries a settled `delete` tombstone (the rename's `from`). A note created outside the calendar at X sends no path-change notice (creates do not reach `registerPathChangeConsumer`), and `prunePending` (`event-calendar-event.logic.ts:476`) drops a `delete` tombstone only when the path is absent, otherwise on the version clock (`settledAtVersion + 2`). So the new note at X is hidden for two bumps.

This is a gap in the tombstone design, not a one-line fix: either the calendar learns about outside creates, or a `delete` tombstone stops hiding a note whose state differs from the deleted one.

**Blocked by:** 49

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Files:** src/lib/features/event-calendar/,src/tests/lib/features/event-calendar/

**Source:** Issue 49 build, 2026-11-01 (`work/49/discovery.md` on branch `issue/49-calendar-outside-delete-races-restore`, "Conflict: criterion 3"). Found by the model test (`src/tests/lib/features/event-calendar/event-calendar.model.test.ts`) with Issue 49's generator and `finish` bumping once for every run: `MODEL_SEED=252` fails. Not reproduced on main and not checked in the running app; the seed number is only meaningful with Issue 49's generator, which is why this waits on 49.

- [ ] A failing named sequence reproduces it first (calendar rename X to Y, settle, an outside create at X, one bump)
- [ ] After the fix the note created at X shows after one bump
- [ ] Seed 252 passes with one end bump

## Notes

- **Size:** S to M. Serialize with the other calendar Issues (49, 56, 58-61): they share `event-calendar.service.ts` and the model test.
