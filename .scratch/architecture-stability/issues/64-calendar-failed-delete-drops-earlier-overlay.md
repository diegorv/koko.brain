# 64: A failed calendar delete drops the overlay an earlier move left on the same note

**What to build:** `deleteNow` in `src/lib/features/event-calendar/event-calendar.service.ts` (~:1013) calls `putPending({ kind: 'delete', path, settled: false })`, which replaces any settled overlay an earlier move left on the path, and its `catch` then calls `dropPending(path)`. After a failed delete the store shows the snapshot, an earlier state than the disk, until the next index bump, and an undo of the earlier move is refused and its op dropped. This is the delete-side twin of Issue 56, which fixed the same defect in `renameAndWrite` by capturing `eventCalendarStore.pendingWrite(path)` before `putPending` and restoring it in the rollback.

Fix: in `deleteNow`, capture the prior overlay before `putPending` and restore it on failure (`dropPending` only when there was none).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`.

**Files:** src/lib/features/event-calendar/event-calendar.service.ts,src/tests/lib/features/event-calendar/

**Source:** review of Issue 56 (`.scratch/architecture-stability/work/56/review.md`, finding 1, minor), 2026-11-01.

- [ ] A failing test first: move Standup to 11-11, settle, a delete whose `deleteItem` rejects, then `undoEventChange()`. The store shows `2026-11-11` (matching the disk) after the failed delete, and the undo returns `{ status: 'done' }`
- [ ] A failed delete on a note with no earlier overlay still rolls back to the snapshot, as today

## Notes

- **Size:** S.
