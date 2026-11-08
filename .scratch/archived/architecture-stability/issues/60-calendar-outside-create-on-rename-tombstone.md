# 60: An outside create on a path that holds a calendar rename's `from` tombstone stays hidden for two bumps

**What to build:** After the calendar renames X to Y, X carries a settled `delete` tombstone (the rename's `from`). A note created outside the calendar at X sends no path-change notice (creates do not reach `registerPathChangeConsumer`), and `prunePending` (`event-calendar-event.logic.ts:476`) drops a `delete` tombstone only when the path is absent, otherwise on the version clock (`settledAtVersion + 2`). So the new note at X is hidden for two bumps.

This is a gap in the tombstone design, not a one-line fix: either the calendar learns about outside creates, or a `delete` tombstone stops hiding a note whose state differs from the deleted one.

**Blocked by:** 49

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Files:** src/lib/features/event-calendar/,src/tests/lib/features/event-calendar/

**Source:** Issue 49 build, 2026-11-01 (`work/49/discovery.md` on branch `issue/49-calendar-outside-delete-races-restore`, "Conflict: criterion 3"). Found by the model test (`src/tests/lib/features/event-calendar/event-calendar.model.test.ts`) with Issue 49's generator and `finish` bumping once for every run: `MODEL_SEED=252` fails. Not reproduced on main and not checked in the running app; the seed number is only meaningful with Issue 49's generator, which is why this waits on 49.

- [x] A failing named sequence reproduces it first (calendar rename X to Y, settle, an outside create at X, one bump)
- [x] After the fix the note created at X shows after one bump
- [x] Seed 252 passes with one end bump

## Notes

- **Size:** S to M. Serialize with the other calendar Issues (49, 56, 58-61): they share `event-calendar.service.ts` and the model test.

## Comments

- 2026-11-01, branch `issue/60-calendar-outside-create-on-rename-tombstone`: the rename tombstone always carries the recorded states (even empty), so an outside create at the old path with a new state shows after one bump; named store sequence and seed 252 model test added; a pinning test for the accepted third-state ghost and a clearer seed 252 comment came from review round 1. Tests: `pnpm check` 0 errors; full suite (`pnpm vitest run && pnpm build`) exit=0, 408 files, 9662 passed, 1 skipped, 1 todo (log `test-logs/architecture-stability/60-deliver.log`). Reviews: round 1 APPROVED (fixes applied), round 2 APPROVED (no findings).
