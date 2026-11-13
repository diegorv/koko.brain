# 71 discovery: clockless delete tombstones hide a restored or renamed-back event

Anchors on main (cb258fca). Template: work/49 (same store / service / tests).

## Files that change

1. `src/lib/features/event-calendar/event-calendar.store.svelte.ts:183-199` (`remapPath`):
   - signature becomes `remapPath(from, to, version, outside?: { fromBase, toBase })`; `version` is the
     current `vaultIndexVersion`, used for the `create` at `to` when `outside` (as before) and now for the
     `delete` tombstone at `from` (`settledAtVersion: version`).
   - a settled `delete` tombstone already held at `to` no longer blocks the move: the moved event replaces
     it (rename-back A->B->A shows the event at A). Any other write held at `to` is still kept.
   - JSDoc of `remapPath` and `settlePending:136-143` updated (the tombstone now carries a clock).
2. `src/lib/features/event-calendar/event-calendar.service.ts:575` (outside delete): tombstone gets
   `settledAtVersion: vaultStore.vaultIndexVersion`; `:579` and `:637` pass the version positionally.
3. `prunePending` (`event-calendar-event.logic.ts:446-470`) unchanged: a clocked settled `delete` already
   expires at `version >= settledAtVersion + 2`.

## Tests (prior art)

- `src/tests/lib/features/event-calendar/event-calendar.store.test.ts` `remapPath` describe (:303-527): new
  cases: tombstone expires two bumps later while the snapshot keeps `from`; rename-back (own and outside)
  shows the event at A and none at B. Existing call sites gain the version arg. The case "prunes the
  tombstone only once the snapshot no longer contains the old path" asserted the clockless rule the Issue
  removes; it is rewritten to: kept at v+1, gone at v+2. "ignores settlePending on the tombstone" moves its
  stale snapshot to v+1 (at v+2 the clock legitimately expires it).
- `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` "path changes made outside the
  calendar" (:2149): outside `deleteItem` then the note back on disk (restore) with the index never dropping
  it -> visible after two refreshes; outside rename Standup->Retro->Standup before any refresh -> event at
  Standup, none at Retro. `:302` and `EventPopover.test.ts:190` pass a version; `:299` stale-store case bumps
  to v+1 instead of 5 so the tombstone is still live.

## Risks / defaults

- A clocked rename tombstone assumes the index drops `from` within two bumps of the rename, the same
  assumption every other settled write already relies on; the remap runs after the disk rename succeeded.
- No E2E change; `e2e/specs/event-calendar-path-identity.spec.ts` is run by the orchestrator after merge.
