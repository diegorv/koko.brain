# Issue 60 discovery

No `spec.md` exists for architecture-stability; the Issue is the spec.
Same calendar area and test shape as `work/58/`.

## Cause
`remapPath` (`event-calendar.store.svelte.ts:210`) leaves a settled `delete`
tombstone at `from`, clocked at `version`. `prunePending`
(`event-calendar-event.logic.ts:476-485`) drops a settled delete only when its
path is absent, else at `settledAtVersion + 2`. A note created outside at
`from` reaches no path-change consumer, so the snapshot shows it and the
tombstone hides it for two bumps. Reproduced: named sequence (edit Standup's
title to Planning, settle, outside create at Standup, one refresh, check) and
seed 252 with one end bump both fail on main.

## Plan (the second option of the Issue: the tombstone stops hiding a note whose state differs)
- `event-calendar.types.ts:144-153`: the `delete` variant gets an optional
  `states?: EventState[]`, the states of the note the tombstone hides.
- `event-calendar.store.svelte.ts` `remapPath`: the `from` tombstone carries
  the snapshot state at `from` and the merged (overlay) state, deduped. A stale
  index refresh can show either one: the snapshot is what the index had, the
  overlay is what the last settled calendar write put on disk. With no event
  at `from`, an empty `states` (build correction: seed 252's tombstone comes
  from such a rename, so the clock rule there kept it failing).
- `event-calendar-event.logic.ts` `prunePending`: a settled delete with
  `states` also goes when the snapshot event at its path matches none of them.
- Tests: logic test for `prunePending`, store test for `remapPath`'s
  tombstone states, model test named sequence + seed 252 with one end bump.
  Update exact-shape `toEqual` assertions on rename tombstones.

## Defaults / risks
- An outside create at `from` with the exact state of the renamed event stays
  hidden for two bumps (indistinguishable from a stale index row). Accepted.
- Other delete tombstones (calendar delete, outside delete, gone restore)
  keep the clock rule: the Issue scopes the rename's `from`. An outside create
  on a calendar-deleted path is the same gap; not handled here.
- A stale row with a third state (two settled writes, then a rename, with the
  index between them) would drop the tombstone early and briefly show the old
  event at `from` until the next bump. The per-path queue makes this rare.
