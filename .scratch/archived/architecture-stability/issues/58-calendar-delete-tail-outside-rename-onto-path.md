# 58: An outside rename onto a path while the calendar's delete of it is in its tail leaves a tombstone over the renamed-in note

**What to build:** The calendar deletes note X; while that delete is still in its tail, an outside rename moves another note onto X's path. `followPathChange` (`src/lib/features/event-calendar/event-calendar.service.ts`, ~:613) remaps the overlay, so the delete, not settled yet, stays held at the new path; `deleteNow` (~:1006) then settles it into a `delete` tombstone over the note that was renamed in. The note is hidden until two index bumps pass (`prunePending`, `event-calendar-event.logic.ts:476`).

Fix so the renamed-in note shows after one bump: the delete tombstone must not outlive the rename onto its path.

**Blocked by:** 49

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Files:** src/lib/features/event-calendar/,src/tests/lib/features/event-calendar/

**Source:** Issue 49 build, 2026-11-01 (`work/49/discovery.md` on branch `issue/49-calendar-outside-delete-races-restore`, "Conflict: criterion 3"). Found by the model test (`src/tests/lib/features/event-calendar/event-calendar.model.test.ts`) with Issue 49's generator and `finish` bumping once for every run: `MODEL_SEED=40` fails. Not reproduced on main and not checked in the running app; the seed number is only meaningful with Issue 49's generator, which is why this waits on 49.

- [x] A failing named sequence reproduces it first (calendar delete with its tail held, an outside rename onto that path, release, one bump)
- [x] After the fix the renamed-in note shows after one bump
- [x] Seed 40 passes with one end bump

## Notes

- **Size:** S to M. Serialize with the other calendar Issues (49, 56, 58-61): they share `event-calendar.service.ts` and the model test.

## Comments

- 2026-11-01, branch `issue/58-calendar-delete-tail-outside-rename-onto-path`: the calendar drops a delete held at a path an outside rename lands on (and keeps it when the rename moves no event); model test covers the sequence and seed 40. Full suite: 407 files, 9637 passed, 1 skipped, 1 todo; build ok. Reviews: round 1 CHANGES_REQUESTED (fixed), round 2 APPROVED.
