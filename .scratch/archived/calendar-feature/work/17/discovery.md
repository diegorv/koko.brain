# 17 discovery: event-calendar data store

## Files that change (all new)

- `src/lib/features/event-calendar/event-calendar.store.svelte.ts`: imports `mergePending`, `prunePending`, `isActionableIssue` from `event-calendar-event.logic.ts:188, 382, 425`, `createEventHistory` / `remapPath` from `event-calendar-history.logic.ts:57, 102`, types from `event-calendar.types.ts` (`PendingWrite` :113, `EventProjection` :100).
- `src/tests/lib/features/event-calendar/event-calendar.store.test.ts`.

## Plan

One feat commit (ticket asks for one), test first.

- Source state (`$state.raw`): `snapshot: EventNote[]`, `issues`, `archivedCount`, `snapshotVersion`, `pending: Map<string, PendingWrite>` (one write per path, always a new Map), `history: EventHistory`, `loadError: string | null`, `loading`.
- Cached state (`$state.raw`): `events` (merged + sorted), `eventMap`, `pendingSet`, `attentionIssues`, `unscheduledIssues`. One private `recompute()` called at the end of every mutating method; getters only return.
- `setSnapshot(projection, version)`: stores the three projection fields and the version, then `pending = new Map(prunePending(...))`.
- `putPending(write)` sets by `write.path`; `settlePending(path, v)` sets `settled: true, settledAtVersion: v` (no-op when absent); `dropPending(path)`.
- `remapPath(from, to)`: the write at `from` moves to `to` (`update` repathed; `create` repathed including `event.path`); with no write at `from` but a visible event there, a settled `create` at `to` built from that event (keeps snippet / readOnly; prunes once the snapshot has `to`). A `delete` at `from` is not moved (it would hide `to`). Then `from` gets `{ kind: 'delete', settled: true }` without `settledAtVersion`, so it prunes only once the snapshot lacks `from`. History goes through the logic's `remapPath`. `from === to` is a no-op.
- `pendingPaths` is the set of pending map keys (tombstones included).

## Prior art

- Store shape: `src/lib/plugins/calendar/calendar.store.svelte.ts:1-100` (getters object, Map reassigned at :67, :89, `reset()`).
- Tests: `src/tests/lib/plugins/calendar/calendar.store.test.ts` (`beforeEach(reset)`), fixtures style from `event-calendar-event.logic.test.ts`.

## Risks

- `$state.raw` must stay assigned only in mutating methods; identity tests guard against getters allocating.
- A synthesized rename `create` that never gets indexed stays forever; acceptable since the watcher indexes renames, and the service (Task 23) can `dropPending`.

## Defaults taken for open questions

- Sort order: `date`, then `start`, then `end`, then `title`, then `path` (deterministic).
- `setSnapshot` does not touch `loading` / `loadError`; the read service (ticket 19) owns those.
- `settlePending` does not prune; pruning happens only in `setSnapshot` (as the plan says).
