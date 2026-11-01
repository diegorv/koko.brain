# 59: A calendar field write that lands after an outside delete recreates the note under the delete tombstone

**What to build:** A calendar field write is in flight on note X when X is deleted outside the calendar. `followPathChange` puts a settled `delete` tombstone on X (`event-calendar.service.ts`, ~:613); the write then lands and recreates X on disk, under the tombstone, so the note exists but the calendar hides it until two bumps pass. This is the window the "Known limitations" comment above `followPathChange` names (a write in flight on `from` settles at `from`), and the model test's generator excludes it today (an outside rename or delete targets only a note with no calendar field write in flight).

The tombstone design has no answer for a write that lands after the delete, so the first step is choosing the behavior: the write is refused (a note deleted outside stays deleted), or it wins and replaces the tombstone. Record the choice in the Issue before building.

**Blocked by:** 49

**Status:** needs-triage

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Files:** src/lib/features/event-calendar/,src/tests/lib/features/event-calendar/

**Source:** Issue 49 build, 2026-11-01 (`work/49/discovery.md` on branch `issue/49-calendar-outside-delete-races-restore`, "Conflict: criterion 3"). Found by the model test (`src/tests/lib/features/event-calendar/event-calendar.model.test.ts`) with Issue 49's generator and `finish` bumping once for every run: `MODEL_SEED=127` fails. Not reproduced on main and not checked in the running app; the seed number is only meaningful with Issue 49's generator, which is why this waits on 49.

- [ ] The behavior for a field write landing after an outside delete is chosen and written in this Issue
- [ ] A failing named sequence reproduces it first (field write held, outside delete of the note, release, one bump)
- [ ] After the fix the store and the disk agree after one bump
- [ ] The model test's generator lifts the "no calendar field write in flight" limit for outside deletes, and seed 127 passes with one end bump

## Notes

- **Size:** S to M. Serialize with the other calendar Issues (49, 56, 58-61): they share `event-calendar.service.ts` and the model test.
