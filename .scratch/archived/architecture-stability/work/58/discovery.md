# Issue 58 discovery

No `spec.md` exists for architecture-stability; the Issue is the spec.

## Cause
`deleteNow` (`event-calendar.service.ts:1003`) puts an unsettled `delete` at X
before `deleteItem`. An outside rename Y->X in the delete's tail reaches
`followPathChange` (:613) -> `eventCalendarStore.remapPath(Y, X, v, outside)`
(`event-calendar.store.svelte.ts:186`), which keeps any write held at `to` except
a settled delete, so the unsettled delete stays and Y's event is not moved.
`deleteNow` then settles it (:1011) into a clocked tombstone over the renamed-in
note, which `prunePending` keeps until `v + 2` because the path is present.

## Files that change
- `src/lib/features/event-calendar/event-calendar.store.svelte.ts:186-205`
  (`remapPath`): with `outside`, a `delete` held at `to` (settled or not) never
  survives: the moved event replaces it, or it is dropped when `from` shows no
  event. An outside rename lands only on a path that is free on disk, so any
  delete held there has landed. `deleteNow`'s `settlePending(X)` then no-ops
  (the create is settled, or nothing is held). JSDoc updated.
- `src/tests/lib/features/event-calendar/event-calendar.store.test.ts` (~:508,
  next to "keeps an unsettled delete held at the new path"): outside cases.
- `src/tests/lib/features/event-calendar/event-calendar.model.test.ts`: named
  sequence (holdScan, delete Standup, outside rename Retro->Standup, release,
  settle, one refresh, check); `runModel` / `finish` take an optional end-bump
  count so a test can run seed 40 with one end bump.

## Prior art
Issue 46 named sequence "outside renames onto and off a path while the calendar
delete of it is in its tail" (same holdScan shape); Issue 49 sequences for the
mid-run `check` after one bump.

## Defaults / risks
- Own renames (no `outside`) keep today's rule: an unsettled delete at `to`
  blocks the move (the existing store test). The per-path queue keeps an own
  rename off a path whose delete is in flight.
- If `deleteItem` throws after the rename landed, its `dropPending(X)` drops the
  moved create; the next bump shows X from the index. Not handled.
- Criterion 3: seed 40 depends on Issue 49's generator (merged). `finish` keeps
  two bumps for random runs with an outside change (Issues 59-61); a dedicated
  test runs seed 40 with one end bump.
