VERDICT: CHANGES_REQUESTED

# Review: Issue 17, event-calendar data store

Reviewed `git diff main...HEAD` at 91894e89 (commits f6783a66, 046387de, 91894e89).

## What the test verdict rests on

I ran these myself in the worktree:

- `./node_modules/.bin/vitest run src/tests/lib/features/event-calendar/`: 6 files, 222/222 passed. These cover the new `event-calendar.store.test.ts` (31 tests) and the tests of the logic the store calls (`event-calendar-event.logic.test.ts`, `event-calendar-history.logic.test.ts`, and the rest of the folder).
- `pnpm check`: 0 errors, 0 warnings across 192 files.
- A throwaway probe under `src/tests/lib/features/event-calendar/zz-probe/`, deleted afterwards, which reproduces findings 1 to 3. The worktree is clean.

I did not run the full gate (`pnpm vitest run` on the whole suite, plus `pnpm build`). The deliver step runs it.

## Acceptance criteria

- [x] **Module `$state`, `$state.raw` for arrays and maps, getters only, no `$derived`, JSDoc everywhere.** Met. Source arrays and maps use `$state.raw` (store :17-27). The cached values use it too (:34-42). The scalars use `$state` (:21, :23, :29, :31). There is no `$derived`. Every state variable, helper, getter and method has JSDoc.
- [x] **State fields, and `pending` always reassigned.** Met. The fields are at :17-31. `pending` gets a new Map at :112, :124, :136, :143-145, :161-166 and :180, and is never changed in place.
- [x] **Each mutating method recomputes once, and getters do no work.** Met. `recompute()` (:54-61) is called once at the end of `setSnapshot`, `putPending`, `settlePending`, `dropPending`, `remapPath` and `reset`. The no-op early returns skip it. Getters only return values (:72-100). `canUndo` and `canRedo` are O(1) length reads of the held history.
- [x] **Getters list.** Met (:72-100). There is also an extra `history` getter (see finding 6).
- [x] **Methods list, with `setSnapshot` calling `prunePending`.** Met (:107-185, `prunePending` at :112).
- [ ] **`remapPath` moves pending and history, and the tombstone prunes once the snapshot lacks `from`.** Only partly met. The tombstone and history parts work (:165, :167; tests :341-366). But a moved settled write keeps its old `settledAtVersion`. The +2 fallback can then prune it before `to` is indexed, while the tombstone still hides `from`, and the event disappears (finding 1). A `settlePending(from)` call also defeats "prunes once the snapshot no longer contains `from`" (finding 2).
- [x] **Tests: initial state, every setter, getters after setters, `reset()`, no mocks, `beforeEach` resets.** Mostly met. There are no mocks, and `beforeEach` calls `store.reset()` (test :52-54). Coverage of "every getter after every setter" is not exhaustive (finding 4).
- [x] **Repeated reads return the same instances.** Met (test :129-166).
- [x] **Overlay merge and prune, including "+1 does not prune".** Met (test :169-288, +1 case at :262-275).
- [x] **After `remapPath`, before the snapshot updates: exactly one event, and `eventByPath(from)` undefined.** Met for the case where the snapshot has not changed (test :291-302, :304-326). It is not true once a lagging snapshot arrives (finding 1).
- [x] **50 `unscheduled` plus 1 `invalid-time` gives `attentionCount === 1` and 50 `unscheduledIssues`.** Met (test :109-117).
- [ ] **Gate green, and one commit in the full format.** The commit format is met (046387de has Context, Problem, Solution, Behavior, and Files with line ranges). The gate is pending until the deliver step.

## Findings

1. **Medium: a moved settled write keeps its stale `settledAtVersion`, so the event disappears on a lagging snapshot.**
   - **Where:** `src/lib/features/event-calendar/event-calendar.store.svelte.ts:162-163`.
   - **Problem:** `remapPath` copies the write at `from` (`{ ...write, path: to }`), including `settledAtVersion` from the earlier write. Under `prunePending`, a settled write whose content rule does not match goes once `version >= settledAtVersion + 2`. So the +2 guard that protects the old write's index update gives no protection to the rename.
   - **Probe, `update`:** setSnapshot([a], 5), putPending(update a), settlePending(a, 5), setSnapshot([a], 6), remapPath(a, b). Then setSnapshot([a], 7), a snapshot that still predates the rename. The update at `b` is pruned, the tombstone at `a` stays, and `events.length === 0`.
   - **Probe, `create`:** the same sequence ends with an empty `pendingPaths` and `events.length === 0`.
   - **Also:** a moved `update` has no snapshot event at `to`, so `mergePending` rebuilds it with `snippet: ''` and `readOnly: false`. The first probe showed `snippet: ""` right after the remap. The no-write branch (:164) keeps the snippet.
   - **Fix:** when a write moves, do not carry the old version clock. The simplest consistent rule is to treat a settled write the same as the no-write branch: build a settled `create` at `to` from the merged `eventMap.get(from)`, which already has the update's state, plus the snippet and `readOnly`, with no `settledAtVersion`. It prunes once `to` is present. A moved unsettled write can keep its kind, but drop `settledAtVersion`.
   - **Tests:** add both sequences above, asserting exactly one event before and after the lagging snapshot. Also assert that the snippet survives the remap of a pending update.

2. **Low: `settlePending(from)` after `remapPath` turns the tombstone into a version-pruned delete, and both paths render.**
   - **Where:** `event-calendar.store.svelte.ts:133-138` and :165.
   - **Probe:** setSnapshot([a], 5), remapPath(a, b), settlePending(a, 5), setSnapshot([a], 7). The result is `events = [a, b]`.
   - **How it happens:** the tombstone has been given a `settledAtVersion`, so it goes at +2 even though the snapshot still has `from`. This is the duplicate the ticket's tombstone rule exists to prevent.
   - **Realistic trigger:** a rename lands while an update write to `from` is in flight. The service then settles `from`, which is now the tombstone, and the moved write at `to` stays unsettled forever.
   - **Fix:** make `settlePending` treat the `from` tombstone as non-settleable. One way is to mark rename tombstones (for example by never giving a `delete` without `settledAtVersion` a version). Another is to document on `remapPath` and `settlePending` that a settle after a remap must target `to`, and leave the wiring to Task 23.
   - **Test:** add one for whichever rule is chosen.

3. **Low: `remapPath` silently overwrites a write already held at `to`.**
   - **Where:** `event-calendar.store.svelte.ts:162-164`.
   - **Problem:** if `to` already holds a pending write (for example a `create` the service put before calling remap, the reverse of the order in test :328-339), it is replaced without notice.
   - **Fix:** either document that the caller must remap before putting writes at `to`, or keep an existing write at `to` and only set the tombstone.
   - **Test:** add one for the chosen order.

4. **Low: test coverage of "every getter after every setter" is partial.**
   - **Where:** `src/tests/lib/features/event-calendar/event-calendar.store.test.ts:169-385`.
   - **Problem:** after `putPending`, `settlePending`, `dropPending` and `remapPath`, no test checks that `issues`, `attentionIssues`, `unscheduledIssues`, `attentionCount`, `archivedCount` and `snapshotVersion` are unchanged. The identity test (:150-154) checks that `events`, `pendingPaths` and `attentionIssues` change after a mutation, but not `unscheduledIssues`. No test checks `isPending` after `settlePending`.
   - **Fix:** add a small table-driven test that runs each mutator and asserts the full getter set.

5. **Info: the issue checkboxes are still unticked.** The deliver step should tick them when it closes the Issue. No change is needed now.

6. **Info: scope.** The `history` getter (`event-calendar.store.svelte.ts:96`) is not in the ticket's getter list. The write service needs the held history to call `takeUndo` and `pushOp`, so it is justified and tested (:357-366, :402-414). Keep it.

No layer-rule, error-handling or performance problems were found. The store imports only `./*.logic.ts` and types. It has no Tauri calls or services. Recompute is O(N log N) per mutation, and every read is O(1).

## Resolution

All six findings accepted; none rejected.

1. Fixed. `remapPath` now turns the merged event at `from` (pending update or create already applied, snippet and `readOnly` included) into a `create` at `to` with no `settledAtVersion`, keeping the moved write's `settled` flag (settled when there was no write). It prunes only once the snapshot has `to`. Tests cover the lagging-snapshot sequence for an update and for a create, and the snippet / `readOnly` surviving.
2. Fixed. `settlePending` is a no-op on an already settled write, so the rename tombstone never gains a version clock and a write keeps its first one. `remapPath` JSDoc says a write in flight must be settled at `to`. Tests: settle on the tombstone leaves only `to` visible; settle at `to` then prunes on presence; re-settle keeps the clock.
3. Fixed by keeping an existing write at `to` (the event at `from` is not moved over it) and documenting the call order on `remapPath`. Test added.
4. Fixed. Table-driven test runs `putPending`, `settlePending`, `dropPending` and `remapPath` and checks every getter; the identity test now also checks `unscheduledIssues`.
5. Done at close: acceptance checkboxes ticked.
6. Kept.
