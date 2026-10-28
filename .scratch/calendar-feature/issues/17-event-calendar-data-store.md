# 17: Event-calendar data store with cached merged events

**What to build:** a reactive data store for the Calendar tab, `event-calendar.store.svelte.ts`, that holds the projected snapshot, issues, archived count, snapshot version, the pending-write overlay, the undo history and the load state. Every mutation recomputes, once, the merged and sorted events (ticket 07's `mergePending`), a path-to-event map, the pending path set and the split issue lists (ticket 07's `isActionableIssue`), and the getters only return those cached values. Reads such as `eventByPath` or `isPending` are O(1), a month with hundreds of events renders in O(N), and `canUndo` / `canRedo` come from the held history (ticket 11). There is no service and no UI yet.

**Plan reference:** Task 16 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 379-395). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done. Notes > Conventions (lines 942-956) apply, including "derived values are cached in the mutating methods".

**Blocked by:** 07, 11

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/event-calendar.store.svelte.ts` (new)
- `src/tests/lib/features/event-calendar/event-calendar.store.test.ts` (new)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

- [x] The store uses module `$state`, `$state.raw` for event arrays and maps, getters only and no `$derived`, with JSDoc on every export, state variable and store method
- [x] State is `snapshot`, `issues`, `archivedCount`, `snapshotVersion`, `pending: Map<string, PendingWrite>`, `history`, `loadError`, `loading`; `pending` is always reassigned, never mutated in place
- [x] Each mutating method (`setSnapshot`, `putPending`, `settlePending`, `dropPending`, `remapPath`, `reset`) recomputes once the `$state.raw` merged and sorted `events` array (via `mergePending`), the `Map<path, EventNote>`, the pending path `Set` and the split issue lists; getters do no recomputation
- [x] Getters exist: `events`, `eventByPath(path)`, `isPending(path)`, `pendingPaths`, `issues`, `attentionIssues` (actionable reasons via `isActionableIssue`), `unscheduledIssues`, `attentionCount`, `archivedCount`, `isLoading`, `loadError`, `snapshotVersion`, `canUndo`, `canRedo`
- [x] Methods exist: `setSnapshot(projection, version)` (calls `prunePending`), `setLoading`, `setLoadError`, `putPending`, `settlePending(path, versionAtSettle)`, `dropPending`, `setHistory`, `reset()`
- [x] `remapPath(from, to)` moves pending and history to `to` and leaves a `delete` tombstone for `from` that prunes once the snapshot no longer contains `from`
- [x] Tests cover initial state, every setter, every getter after every setter, and `reset()`, with no store or `.logic.ts` mocked and every `beforeEach` resetting the store
- [x] Tests prove repeated reads return the same array and map instances until the next mutation
- [x] Tests cover overlay merge and prune, including the "+1 version does not prune" case
- [x] Tests prove that after `remapPath` and before the snapshot updates, `events` holds exactly one entry for that event and `eventByPath(from)` is undefined
- [x] Tests prove 50 `unscheduled` plus 1 `invalid-time` issue gives `attentionCount === 1` and 50 `unscheduledIssues`
- [x] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 12:53 — discovery — plan written to work/17/discovery.md — 29a7f5d8
- 2026-10-28 12:55 — implement — store + 31 tests; pnpm check 0 errors, event-calendar vitest 222/222 — 046387de
- 2026-10-28 12:58 — review — CHANGES_REQUESTED: moved settled write keeps stale settledAtVersion (event vanishes on lagging snapshot), settle-on-tombstone duplicate, remap overwrite at to, partial getter coverage — 91894e89
- 2026-10-28 13:00 — fix — review findings 1-4 fixed (remap builds versionless create at to, settle skips settled writes, keep write at to, getter table test); event-calendar vitest 233/233, pnpm check 0 errors — 6a78ab1f
