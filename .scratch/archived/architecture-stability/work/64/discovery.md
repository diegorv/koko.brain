# Issue 64 discovery

Same pattern as `.scratch/architecture-stability/work/56/` (`renameAndWrite`), applied to `deleteNow`.

## Files that change

- `src/lib/features/event-calendar/event-calendar.service.ts:1029-1033` (`deleteNow`): `putPending`
  of an unsettled `delete` (:1029) replaces a settled overlay an earlier move left; the `catch`
  `dropPending(path)` (:1033) then removes it, so the store falls back to the stale snapshot.
- `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` (describe
  `deleteEvent and restoreDeletedEvent`, ~:1948): new failing test with the Issue's reproduction.
  The existing "throws when deleteItem fails, rolling the overlay back" (:1948) already covers
  criterion 2 (no earlier overlay -> snapshot, `pending: false`).

## Plan

1. Failing test: `moveEvent` to 11-11 (settles), `rename` rejects once, `deleteEvent` rejects;
   store shows 2026-11-11 pending; `undoEventChange()` returns `{ status: 'done' }`.
2. Fix: `const prior = eventCalendarStore.pendingWrite(path)` before `putPending`; in the catch,
   `putPending(prior)` when set, else `dropPending(path)`. Same commit as the test.

## Prior art

- Service test "a failed write keeps the settled overlay an earlier move left, so that move stays
  undoable" (service.test.ts:1013); failed delete via `vi.mocked(rename).mockRejectedValueOnce`
  (:1949).

## Risks / defaults

- `pendingWrite` (`event-calendar.store.svelte.ts:82`) returns any kind; the prior overlay is
  restored as it was (settled flag and version clock), as in Issue 56. A later index bump prunes
  it as before. Only overlays on the deleted path itself are touched.
- Default: no model-test named sequence (Issue 56 added one; this Issue's criteria ask only for the
  service test). No `spec.md` for this feature.
