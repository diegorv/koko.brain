# 56: A failed calendar field write drops the overlay an earlier move left on the same note

**What to build:** On a failed field write, the rollback `dropPending(target)` in `src/lib/features/event-calendar/event-calendar.service.ts` (~:739) drops the whole overlay on the path, including the settled overlay an earlier move left there. The store then shows the snapshot, an earlier state than the disk, until the next index bump, and any undo of the earlier move is refused and its op dropped.

Reproduction (from the Issue 48 review, service test): move Standup to 11-11, then a drag whose `writeTextFile` rejects, then `undoEventChange()` issued after the failure. Result: `{ status: 'refused' }`, the store shows `2026-11-10`, the disk has `2026-11-11`, and `history.undo == []`. No undo is in flight, so this predates Issue 48 and is not a regression.

Fix: the rollback restores the overlay that was on the path before `putPending`, instead of dropping it.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`.

**Source:** review of Issue 48 (`.scratch/architecture-stability/work/48/review.md`, finding 1, minor), 2026-11-01. Issue 48 is squash 1754f195.

- [x] A failing test first: the reproduction above. After the fix the store shows `2026-11-11` (matching the disk), and undoing the earlier move succeeds
- [x] A failed write on a note with no earlier overlay still rolls back to the snapshot, as today
- [x] The model test generates a failed write after a settled move on the same note (or the named sequence is added to it)

## Notes

- **Size:** S.

## Comments

- 2026-11-01, branch `issue/56-calendar-failed-write-drops-earlier-overlay`: `renameAndWrite` captures the overlay already on the path before `putPending` and restores it when the field write fails (`dropPending` only when there was none), so a settled earlier move stays shown and undoable. Service test for the reproduction plus a named model sequence with a `failWrite` op. Review round 1: APPROVED (finding 1, the same defect in `deleteNow`, filed as Issue 64; finding 2, nit, no change). Full suite: 407 files, 9627 passed, 1 skipped, 1 todo, `pnpm build` ok (`test-logs/architecture-stability/56-deliver.log`).
