# 64: A failed calendar delete drops the overlay an earlier move left on the same note

**What to build:** `deleteNow` in `src/lib/features/event-calendar/event-calendar.service.ts` (~:1013) calls `putPending({ kind: 'delete', path, settled: false })`, which replaces any settled overlay an earlier move left on the path, and its `catch` then calls `dropPending(path)`. After a failed delete the store shows the snapshot, an earlier state than the disk, until the next index bump, and an undo of the earlier move is refused and its op dropped. This is the delete-side twin of Issue 56, which fixed the same defect in `renameAndWrite` by capturing `eventCalendarStore.pendingWrite(path)` before `putPending` and restoring it in the rollback.

Fix: in `deleteNow`, capture the prior overlay before `putPending` and restore it on failure (`dropPending` only when there was none).

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`.

**Files:** src/lib/features/event-calendar/event-calendar.service.ts,src/tests/lib/features/event-calendar/

**Source:** review of Issue 56 (`.scratch/architecture-stability/work/56/review.md`, finding 1, minor), 2026-11-01.

- [x] A failing test first: move Standup to 11-11, settle, a delete whose `deleteItem` rejects, then `undoEventChange()`. The store shows `2026-11-11` (matching the disk) after the failed delete, and the undo returns `{ status: 'done' }`
- [x] A failed delete on a note with no earlier overlay still rolls back to the snapshot, as today

## Notes

- **Size:** S.

## Comments

- 2026-11-01, branch `issue/64-calendar-failed-delete-drops-earlier-overlay`: `deleteNow` captures `pendingWrite(path)` before `putPending` and, when `deleteItem` fails, restores it (it calls `dropPending` only when there was no earlier overlay). A new service test covers move, then failed delete, then undo. Full suite: 410 files, 9719 tests passed (1 skipped, 1 todo), `pnpm build` ok (`test-logs/architecture-stability/64-deliver.log`). Review round 1: APPROVED with one optional nit (JSDoc wording), not applied; see review.md Resolution.
