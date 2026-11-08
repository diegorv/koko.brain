# 59: A calendar field write that lands after an outside delete recreates the note under the delete tombstone

**What to build:** A calendar field write is in flight on note X when X is deleted outside the calendar. `followPathChange` puts a settled `delete` tombstone on X (`event-calendar.service.ts`, ~:613); the write then lands and recreates X on disk, under the tombstone, so the note exists but the calendar hides it until two bumps pass. This is the window the "Known limitations" comment above `followPathChange` names (a write in flight on `from` settles at `from`), and the model test's generator excludes it today (an outside rename or delete targets only a note with no calendar field write in flight).

The tombstone design has no answer for a write that lands after the delete. **Chosen behavior (owner, 2026-11-01): the write is refused.** A note deleted outside the calendar stays deleted: the calendar's pending write must not recreate the file, the store keeps the note hidden, the write's op is not recorded in the undo history, and the user sees the same refusal as any other write whose note is gone. The alternative (the write wins and replaces the tombstone) was rejected because it would bring back a note the user just deleted.

**Blocked by:** 49

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Files:** src/lib/features/event-calendar/,src/tests/lib/features/event-calendar/

**Source:** Issue 49 build, 2026-11-01 (`work/49/discovery.md` on branch `issue/49-calendar-outside-delete-races-restore`, "Conflict: criterion 3"). Found by the model test (`src/tests/lib/features/event-calendar/event-calendar.model.test.ts`) with Issue 49's generator and `finish` bumping once for every run: `MODEL_SEED=127` fails. Not reproduced on main and not checked in the running app; the seed number is only meaningful with Issue 49's generator, which is why this waits on 49.

- [x] A field write landing after an outside delete is refused: the note is not recreated on disk, the store does not show it, and no op is recorded
- [x] A failing named sequence reproduces it first (field write held, outside delete of the note, release, one bump)
- [x] After the fix the store and the disk agree after one bump
- [x] The model test's generator lifts the "no calendar field write in flight" limit for outside deletes, and seed 127 passes with one end bump

## Notes

- **Size:** S to M. Serialize with the other calendar Issues (49, 56, 58-61): they share `event-calendar.service.ts` and the model test.

- 2026-11-01, branch `issue/59-calendar-field-write-after-outside-delete`: a closed-note frontmatter write now opens with `{ create: false }`, so a field write that lands after an outside delete is refused (`missing`) instead of recreating the note; the calendar rolls back only its own overlay, so the delete tombstone stays and no op is recorded. Named model sequence and seed 127 (one end bump) pass; the generator lets outside deletes race field writes. Review round 1 APPROVED with minor findings, then a fix round (Known-limitations JSDoc for the outside-rename variant, new service test for the `missing` refusal); round 2 APPROVED with no findings. Full suite at a108794e: exit=0, 413 files, 9745 passed, 1 skipped, 1 todo, build ok.
