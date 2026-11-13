# 49: An outside delete racing a Calendar restore leaves a tombstone over the restored note for two bumps

**What to build:** when an outside delete of a Trash entry's original path races the calendar's restore of that entry, the restore ends with a clocked tombstone still standing over the restored note. `prunePending` (event-calendar-event.logic.ts) only drops it at `settledAtVersion + 2`, so the restored note is hidden for two index bumps.

Drop or replace the tombstone when the restore settles, and let the model test's generator run an outside delete while a calendar restore is in flight. The model test's `finish` keeps two bumps for runs with an outside change: four other races still need the second bump (Issues 58-61).

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** Issue 14 (calendar write queue model test, branch `issue/14-calendar-write-queue-model-test`): the unrestricted random runs of `src/tests/lib/features/event-calendar/event-calendar.model.test.ts` reached this race; the generator now excludes it (see that file's header). Code: `src/lib/features/event-calendar/event-calendar.service.ts`.

- [x] A failing named sequence reproduces it first (calendar restore with its rename held, an outside delete on the path, release, one bump)
- [x] After the fix the restored note shows after one bump
- [x] The model test's generator no longer excludes an outside delete racing a calendar restore, and the model test stays green with `finish` bumping twice only for runs with an outside change

## Notes

- **Not checked:** in the running app; found by the model test only.

## Comments

- 2026-11-01, owner triage: criterion 3 amended. The first run showed that the one-bump `finish` also fails on four races that do not involve a restore (model seeds 40, 127, 166 and 252, see `work/49/discovery.md` on the branch); they are filed as Issues 58-61. Retry on the kept branch: criteria 1 and 2 are committed there.
- 2026-11-01, deliver (branch `issue/49-calendar-outside-delete-races-restore`): `restoreNow` in `event-calendar.service.ts` keeps outside deletes recorded while a restore is in flight and, on a match, checks the disk (`exists`) before tombstoning, so the restored note shows after one bump. The model test admits outside deletes during calendar restores (undo/redo restores count too) and adds two named sequences. Reviews: round 1 CHANGES_REQUESTED (delete of another note at the path tombstoned a restored note; undo/redo restores not counted), fixed; round 2 APPROVED with one nit (an outside delete whose consumer call lands after `restoreItem` returns behaves as main does), accepted without change. Full suite: first run 1 flaky failure in `NoteActionBar.test.ts` (untouched; passes alone 30/30), second run green: `pnpm check` 0 errors, vitest 406 files, 9618 passed, 1 skipped, 1 todo, `pnpm build` ok.
