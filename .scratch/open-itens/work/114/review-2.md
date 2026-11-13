VERDICT: APPROVED

Re-review round 2 of `git diff 047d107f3..HEAD` (fix commit a74e8c07d). The fix touches only `src/tests/lib/features/tasks/tasks.service.test.ts` and the Resolution section of `review.md`; no source change.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | The probe listener (`tasks.service.test.ts:398-401`) records `upserts.length` at each invalidation; the new test "runs the per-file consumers before the invalidation signal fires" (`:428-434`) asserts `[1]`. In `afterTaskWrite` (`tasks.service.ts:186-201`) `applyNoteChange` for the `task` source has no yield, so the consumer runs before `notifyContentInvalidated()`; swapping the two would record `[0]` and fail. The optional `note-change.service.test.ts` row was declined with a stated reason (order pinned end to end through the real owner); that holds. |

## Acceptance criteria re-checked

- [met] Failing test first, in `src/tests/lib/features/tasks/tasks.service.test.ts`, with real stores, mocking only `invoke`: open the vault with `vaultStore.open('/vault')` (it writes the recent-vaults list, so call `setupLocalStorage()` from `src/tests/fixtures/localStorage.fixture` first, as `note-action-bar.service.test.ts:2-5` does), register a real consumer through `registerNoteChangeConsumer` and a real listener through `registerContentInvalidationListener` (unregister both in `afterEach`). After a changed toggle on `/vault/a.md`: `update_search_index_file` is invoked with `{ filePath: 'a.md', content: <updated content>, vaultPath: '/vault' }`, the consumer's `upsert` received the updated content, the listener fired once, and `areAllRecentSaves(['/vault/a.md'])` is true. Fails today. — the fix only extends the probe listener (still counts `invalidations`) and adds one test; the original four-fact test is unchanged and passes; `upsertsAtInvalidation` is reset in `beforeEach`.

## Findings

None open or new.

## Other checks

- No test weakened or deleted: the diff adds lines only, apart from the listener body that now also pushes to `upsertsAtInvalidation`.
- No scope creep: no file outside the tasks test and the workflow's own records changed.
- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/tasks/ src/tests/lib/core/filesystem/note-change.service.test.ts`: exit 0, 12 files, 215 tests passed. The full suite is deliver's to run.
