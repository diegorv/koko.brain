VERDICT: CHANGES_REQUESTED

# 71 review: clockless delete tombstones hide a restored or renamed-back event

Reviewed `git diff main...HEAD` (6741d755, 83c7896a, f388736b) in the worktree.

## Test verdict rests on

Run by the reviewer in the worktree, not taken from the build report:

- `./node_modules/.bin/vitest run src/tests/lib/features/event-calendar/` (24 files, 933 passed). It covers the three changed test files: `event-calendar.store.test.ts`, `event-calendar.service.test.ts`, `EventPopover.test.ts`.
- Red check: with `event-calendar.store.svelte.ts` and `event-calendar.service.ts` reverted to `main` (and restored afterwards), the new repros fail. These are the service "deleted and restored ... two refreshes later" and "rename and a rename back before the index catches up" cases, plus the store "stamps the tombstone", "rename and a rename back" and "with `outside` ... rename back" cases.
- Mutation probes (source restored after each one; `git status` clean):
  - Re-clocking a settled `delete` in `settlePending` survives the whole suite (finding 1).
  - Dropping `&& held.settled` in `remapPath` survives the whole suite (finding 2).
- `pnpm check`: 0 errors, 0 warnings.
- E2E not run (out of scope for this step).

## Acceptance criteria

- [x] **Failing store/service tests first for both scenarios.** Met. The service repros at `event-calendar.service.test.ts:2295-2317` use the fake-disk index, which keeps the path across `refresh(2)`. The store cases at `event-calendar.store.test.ts:355-411` keep `from` in the snapshot for several versions. All of them fail against main's source (red check above).
- [x] **Every `delete` tombstone carries `settledAtVersion`; the rename-back case shows the event at A.** Met. These are every `kind: 'delete'` pending write in `src/lib`:
  - `event-calendar.service.ts:576` (outside delete) now stamps `vaultStore.vaultIndexVersion`.
  - `event-calendar.store.svelte.ts:201` (`remapPath` tombstone) stamps `version`.
  - `event-calendar.service.ts:912` (the calendar's own delete) is unsettled and is clocked by `settlePending` at `:916`.
  - Rename-back: `remapPath` at `:192` lets the moved event replace a settled `delete` at `to`. It is exercised own and `outside` (store `:384-411`) and end to end through the real `renameItem` / `applyPathChange` (service `:2309-2317`).
  - Caveat: the type still allows a clockless settled `delete` (`event-calendar.types.ts:152`). See finding 4.
- [ ] **`e2e/specs/event-calendar-path-identity.spec.ts` still passes.** Not verifiable in this step; the orchestrator runs it after merge. A static read says it should pass:
  - The spec asserts the old path's absence only before any refresh.
  - The mock `rename_note` (`e2e/mocks/tauri-core.ts:153`) re-keys the index, so the clocked tombstone prunes on the "path absent" rule, as it did before.

## Other checks

- Layer rules: the changes stay inside `features/event-calendar/`, with no new imports. `.logic.ts` is untouched, and `prunePending`'s JSDoc (`event-calendar-event.logic.ts:446-457`) is still accurate.
- JSDoc for `remapPath`, `settlePending` and `followPathChange` is updated to the new clock and to the tombstone being replaced at `to`.
- Error handling and performance are unaffected.
- No scope creep. The positional `version` argument is a necessary signature change, and every caller is updated (two service call sites and the tests).
- Changed existing tests:
  - "prunes the tombstone only once the snapshot no longer contains the old path" asserted the clockless rule the Issue removes. Splitting it into a clock-expiry case and an absent-path case is correct.
  - The stale-store `findCalendarEvent` case moving from v5 to v2 keeps its intent inside the clock window. That is legitimate, since beyond v+2 the snapshot is treated as truth by design.
  - The rewrite of "ignores settlePending on the tombstone" is not legitimate (finding 1).
- The commit follows docs/COMMITS.md and its Files line ranges match the diff.

## Findings

1. **Medium: the rewritten test no longer verifies what it is named for.** `src/tests/lib/features/event-calendar/event-calendar.store.test.ts:462-472` ("ignores settlePending on the tombstone, so both paths never render").
   - Before, it could tell the two behaviours apart: the tombstone was clockless, and `settlePending(a, 5)` followed by a snapshot at 7 would have pruned it if `settlePending` re-clocked it.
   - Now the tombstone is clocked at 5, then `settlePending(a, 9)` and a snapshot at 6. A re-clocked tombstone (9) and an ignored one (5) are both still pending at 6, so the test passes either way.
   - Probe: changing `settlePending` to re-clock a settled `delete` passes all 933 tests. The settlePending JSDoc contract at `event-calendar.store.svelte.ts:136-139` ("a rename tombstone left by `remapPath` keeps the one it was created with") is therefore unguarded. This is the kind of test weakening CLAUDE.md forbids.
   - Fix: after `settlePending(a.path, 9)`, assert `store.pendingWrite(a.path)` toEqual `{ kind: 'delete', path: a.path, settled: true, settledAtVersion: 5 }`. Optionally also take a snapshot at 7 that still lists `a` and expect `isPending(a.path)` to be false (the original clock expires). Rename the test to match what it asserts, for example "settlePending keeps the tombstone's remap clock".

2. **Low: the "unsettled write at `to` is kept" branch of the new `remapPath` guard is untested.** `src/lib/features/event-calendar/event-calendar.store.svelte.ts:192`.
   - Probe: dropping `&& held.settled` passes all 933 tests. The only test of a held write at `to` (`event-calendar.store.test.ts:490`) holds a `create`, not a `delete`.
   - Fix: add a store case where `to` holds `{ kind: 'delete', settled: false }` and `remapPath(from, to, v)` keeps it: `pendingWrite(to)` is still the unsettled delete, and no event shows at `to`.

3. **Low (informational, no code change required): the outside-rename tombstone is clocked before Rust re-keys the index.** The discovery's risk note says the remap "runs after the disk rename succeeded". That is true, but for an outside rename the path-change consumer runs at `path-change.service.ts:134`. That is before the awaited `updateLinksAfterRename` and `refreshTree`, and before `rename_note` at `:156`. So the "index drops `from` within two bumps" assumption has to hold across the link rewrite:
   - In a large vault where that rewrite spans two throttled bumps (roughly 12 s or more in a burst), a snapshot can still list `from` at v+2. The old event then shows at `from` until the next bump.
   - This is transient and self-healing. The `to` create's clock already had the same exposure before this change.
   - Fix: none needed. Optionally add one sentence to the `followPathChange` JSDoc (`event-calendar.service.ts:550-562`) or to the discovery risks noting the window.

4. **Low (informational): "every delete tombstone carries a clock" is held by convention, not by type.** `src/lib/features/event-calendar/event-calendar.types.ts:152` keeps `settledAtVersion?` optional on the `delete` variant (unsettled deletes legitimately lack it). A future `putPending({ kind: 'delete', settled: true })` without a clock would bring the bug back silently.
   - Fix: none needed now. Alternatively, findings 1 and 2's tests plus the service assertion at `event-calendar.service.test.ts:2299` (`settledAtVersion: version`) are the guard. Keep that assertion.

Required before delivery: finding 1. Findings 2-4 are optional.
