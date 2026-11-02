VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1(a) | minor | resolved | `collection.service.ts:60-100`: `buildPropertyIndex` records `logStart = deltaLog.length`, and `applyPropertyDelta` logs every batch while `wholeReadsInFlight > 0`. When the whole read lands, it replays `deltaLog.slice(logStart)` on its snapshot before `setPropertyIndex`. The log is emptied in `finally` once no read is in flight. A replayed delta whose IPC was issued before the whole read could be older than the whole snapshot, but the Rust change that made it stale emits its own event, and that delta lands later in memo order, so the index still converges. Test "survives a whole read that started before it and lands after it" fails with the old `collection.service.ts` (probe below). |
| 1(b) | minor | resolved | A failed whole read sets `wholeReadFailed`. `propertyIndexNeedsWholeRead()` returns `!isIndexReady \|\| wholeReadFailed`, and the listener (`tauri-listeners.service.ts:216-217`) uses it, so the next window re-reads the index whole and skips the delta. The flag is cleared by a successful read and by `resetCollection`. The widgets' `isIndexReady` is unchanged. Tests: "stays true after a failed whole read on a ready index..." and the listener test "re-reads the property index on the next window after a full rescan failed to read it" both fail with the old code (probe). |
| 2 | minor | rejection stands | This is a manual Heartbeat measurement on the owner's 10k-note vault, and no agent step can take it. It stays open for the owner (criterion 4 below). |
| 3 | nit | resolved | `type-definitions.store.svelte.ts:13`, `:15`, `:26` now name `patchEntries`. |
| 4 | nit | resolved | The listener JSDoc (`tauri-listeners.service.ts:144-145`) keeps the reason and the Issue link and drops the measurement. |
| 5 | nit | rejection stands | Documented and vanishingly rare. No change was asked for. |

## Acceptance criteria

- [met] A failing test first: a `vault-index-updated` event for one upserted path triggers no `get_all_property_records` / `get_all_vault_entries_v2` call, and the property index and entries snapshot reflect that note's new record — the fix switches the listener's readiness check to `propertyIndexNeedsWholeRead()`. That is still false on a ready index with no failed read, so "patches the snapshots for one upserted path without re-reading the whole vault" still passes (tauri-listeners.service.test.ts, exit 0) and still asserts that no whole-vault call is made.
- [met] A removed path drops the note from the property index, the entries snapshot and the content order — `applyPropertyDelta` still drops `removed` through `patchIndex`, and the listener removal test passes. The new replay also re-drops a removed path from a late whole snapshot (the "survives" test checks that `/vault/b.md` stays gone).
- [met] A full rescan event still re-reads the whole vault, as today — `fullRefresh` is unchanged, and "re-reads the whole vault on a full rescan event, as before" passes. A failed full-rescan property read now also forces a whole read in the next window.
- [not met] Measured in the app with Heartbeat on: a favorite toggle on a 10k-note vault produces no `[HB] stall` line — still unmeasured. It is a manual in-app check for the owner, and no agent step can run it. This does not block APPROVED (previous finding 2).

## Findings

1. **nit** `src/lib/app/tauri-listeners.service.ts:156-160`: the rewritten JSDoc drops a caveat that is still true. Two whole reads can overlap, for example a prompt refresh right after a timer refresh, or the watcher's full rebuild plus the listener. If the older one lands last, it overwrites the newer whole snapshot. Its delta replay restores only the paths that deltas touched, not the other changes the newer full rescan picked up. Those stay stale until their paths are touched again or the next whole read runs. Fix: restore one sentence saying that an older whole read landing after a newer one still wins, for paths no delta touched. Or add a whole-read sequence in `buildPropertyIndex` that drops a landing older than the last published one.
2. **nit** `src/lib/features/collection/collection.service.ts:171-174`: `resetCollection` clears `wholeReadFailed` but leaves `deltaLog` and `wholeReadsInFlight` alone. A whole read still in flight at vault teardown keeps logging the next vault's deltas until it lands. It then replays them onto its old-vault snapshot. Landing into the new vault's store at all is pre-existing behavior, so this only adds to an existing cross-vault race. No change needed unless the owner wants a vault generation guard.

## Other checks (run by this review)

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- Targeted vitest (`./node_modules/.bin/vitest run src/tests/lib/features/collection src/tests/lib/app/tauri-listeners.service.test.ts src/tests/lib/features/type-definitions src/tests/lib/architecture`): exit 0, 36 files, 1201 tests passed.
- Probe: I swapped in the review-commit `collection.service.ts` (4822584e), plus a stub `propertyIndexNeedsWholeRead` that returns `!isIndexReady`. Three new tests then fail: "survives a whole read...", "stays true after a failed whole read...", and the listener's "re-reads the property index on the next window...". I restored the file, and the worktree is clean. "does not re-apply a delta that landed before the whole read started" passes either way. It guards against replaying too much and is not a regression test.
- No test was weakened or deleted. The fixes touch only the three source files and two test files the findings name, plus the review file. No scope creep.
- Layer rules: `layer-baseline.json` and `BASELINE_SIZE` are untouched, and no composition root was added. The listener's `collectionStore` import was removed along with its last use.
- Left to deliver and e2e: the full vitest suite, `pnpm build`, and `bash scripts/e2e.sh`.
