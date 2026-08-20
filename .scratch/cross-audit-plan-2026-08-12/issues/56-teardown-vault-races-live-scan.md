# Issue 56: `resetBacklinks` clears `isBuilding` mid-scan, so a vault switch can leave the Rust index holding the OLD vault

Status: done
Phase: unplanned
Source: reviewer follow-up surfaced during the cross-audit run, verified 2026-08-19 by triage
Blocked by: none

Note on anchors: everything below is anchored by symbol. The only sha-bound facts are the two
commits cited (`2f109e26`, `7c1186ef`) and the verification HEAD `5e0b8bd3`; any line number in
this file is illustrative only and will drift.

## What

Verified against current code. The claim is **partially confirmed**: its mechanism and its second
consequence are real and reachable, its first consequence is mechanically real but benign in every
reachable path. The severe consequence is one the claim did not name.

### The state machine

`src/lib/features/backlinks/backlinks.service.ts` holds three module-level values: `vaultPath`,
`isBuilding`, `pendingRebuild`, plus `inflightBuild`.

- `buildIndex(path)` assigns `vaultPath = path` first, then either takes the queue branch
  (`isBuilding` true: set `pendingRebuild = true`, return `inflightBuild`) or the build branch
  (`isBuilding = true`, `inflightBuild = runBuildIndex(path)`).
- `runBuildIndex(path)` awaits `invoke('scan_vault_v2_cached', { path })`, and in its `finally`
  sets `isBuilding = false` and, if `pendingRebuild && vaultPath`, replays `buildIndex(vaultPath)`
  and awaits it. Awaiting the replay is what makes the queued caller's promise settle only once the
  latest vault has been scanned. That contract is the whole point of commit `2f109e26` (issue 46).
- `resetBacklinks()` sets `vaultPath = null`, `isBuilding = false`, `pendingRebuild = false`.
  `teardownVault()` in `src/lib/core/app-lifecycle/app-lifecycle.service.ts` calls it synchronously.

`isBuilding` is the ONLY thing serializing scans. Clearing it while a scan is in flight destroys the
serialization, and nothing downstream re-establishes it.

### Causal chain, by file:symbol

1. `src-tauri/src/vault/watcher.rs` emits `vault-files-changed`; the listener registered in
   `app-lifecycle.service.ts::initializeVault` step 7 debounces 300 ms into
   `watcher-handler.service.ts::rebuildAllIndexes`.
2. `rebuildAllIndexes` takes the FULL-rebuild branch whenever the batch has no markdown file at all
   (`mdPaths.length > 0 && mdPaths.length <= INCREMENTAL_THRESHOLD` fails on `mdPaths.length === 0`)
   or more than `INCREMENTAL_THRESHOLD` markdown files. Dropping one image or attachment into the
   vault is enough. It calls `backlinks.service.ts::rebuildIndex` -> `buildIndex(A)`, so
   `isBuilding` is true and `scan_vault_v2_cached({ path: A })` is in flight.
3. The user switches vault. `+layout.svelte`'s vault effect calls `initializeVault(B)`, which runs
   `teardownVault()` (the `unsubscribeFileChange` guard is satisfied, because that handle is set at
   step 7 of A's init) -> `resetBacklinks()` -> `isBuilding = false` while A's scan is still running.
4. `initializeVault(B)` step 4 calls `buildIndex(B)`. `isBuilding` is false, so it takes the BUILD
   branch and starts a SECOND concurrent `scan_vault_v2_cached({ path: B })`. This is the claim's
   second consequence, confirmed.
5. Both scans are real concurrency, not an illusion:
   `src-tauri/src/commands/vault.rs::scan_vault_v2_cached` wraps its work in
   `tokio::task::spawn_blocking`, and `scan_vault_v2_cached_inner` holds the `VaultIndexState` write
   lock only around `idx.build(...)`. The walk, the disk re-reads and the parse all run outside the
   lock, on separate blocking-pool threads.
6. `idx.build(...)` REPLACES the whole index (both the cache-miss branch and the mtime-reconcile
   branch build a fresh `Vec<NoteEntry>` and hand it to `build`). There is no vault-path check in
   `VaultIndexState`. Whichever scan reaches `state.write()` LAST wins.
7. A's scan can easily be the loser-that-wins: it started earlier but is a reconcile over a large
   vault with re-reads, while B's is a cache hit over a small vault. When A lands last, the Rust
   `VaultIndex` holds vault A's entries while vault B is open, and `emit_index_updated` fires with
   the higher version.
8. `core/layout/tauri-listeners.service.ts::registerVaultIndexUpdatedListener` survives the vault
   switch, takes the latest version, and its debounced `refresh()` runs `buildPropertyIndex()` and
   `getVaultEntries()` -> `refreshArchivedPaths`, `refreshTypeDefinitions`,
   `typeDefinitionsStore.setEntries`, `fsStore.setContentOrder`. Every panel `$effect` on
   `vaultStore.vaultIndexVersion` (Backlinks, Outgoing, Tags, Tasks, Graph) refetches its `*_v2`
   command from the same wrong index.
9. It does not self-heal on typing or saving: `applyNoteChange` only patches per-file entries into
   whatever the index currently holds. It heals only when a later FULL rebuild of B runs.
10. Second-order: the next `teardownVault()` runs `invoke('save_vault_cache', { path:
    indexedVaultPath })` with `indexedVaultPath === B`, and `save_vault_cache` snapshots whatever the
    in-memory index holds. Vault A's entries get written into vault B's cache file. This one does
    self-heal, because the next reconcile of B drops every cached path missing from B's disk walk,
    but it costs a full re-read on B's next open.

### Repro path, user-visible

1. Open vault A (large, a few thousand notes).
2. Cause a watcher batch in A with no markdown file in it: drag in an image, let a sync client write
   an attachment, or `git pull` a change touching more than ten notes.
3. Within the scan window (hundreds of ms to seconds on a large vault) switch to vault B.
4. Vault B is open, but the backlinks / tags / tasks / properties / graph panels show vault A's
   notes, and the file explorer's `_order` sorting comes from A's `contentOrder`. It stays wrong
   until a full rebuild of B happens.

The window is narrow and needs a multi-vault user, which is why the severity is medium rather than
high. When it does hit, the wrong state is global and sticky, not a flicker.

### What of the original claim is refuted

- **"a caller queued behind the in-flight scan resolves WITHOUT its index having been built"** is
  mechanically real but benign. Reaching it requires a caller sitting in the `pendingRebuild` queue
  at teardown time, and the only production caller that can be there is a second watcher
  `rebuildIndex()` for the vault being torn down. Its promise resolving early costs nothing: the
  vault is closing, and its continuation in `rebuildAllIndexes` (`buildPropertyIndex`,
  `buildFrontmatterIconIndex`, `scanFilesForCalendar`) would have run either way. Do not build the
  fix around this half.
- **`teardownVault()` from `+layout.svelte`'s `else` branch is NOT a live trigger.** That branch runs
  only when `vaultStore.isOpen` is false, and `vaultStore.close()` has no production caller, so it
  fires only on the boot pass with nothing in flight. The single live trigger is the teardown INSIDE
  `initializeVault`.
- The A -> B -> C double-switch is NOT this issue: there `initializeVault` skips the teardown because
  `unsubscribeFileChange` is still null, so `isBuilding` survives and the coalescing works. That path
  is already fixed by `2f109e26` and closed by `7c1186ef` (issue 46). This issue is the single switch
  A -> B, where the teardown DOES run.

### Not already fixed

`git log -S"isBuilding" -- src/lib/features/backlinks/backlinks.service.ts` returns exactly
`b7358e71` (initial) and `2f109e26`. `2f109e26` is issue 46's fix and named this race as follow-up 1
in its closing comment, explicitly out of scope. Nothing since has touched it; verified at HEAD
`5e0b8bd3`.

### Existing coverage

`src/tests/lib/features/backlinks/backlinks.service.test.ts` has four concurrency tests
(`queues a pending rebuild when called concurrently`, `reruns the queued build for the LATEST
requested vault path`, `resolves the queued call only after the latest vault has been scanned`, and
`rebuildIndex targets the latest vault after a queued switch`) plus a `mockSlowFirstScan()` helper
that hangs the first `scan_vault_v2_cached` until released. None of them calls `resetBacklinks()`
mid-scan, so the race is uncovered. The helper makes a red test trivial to write; no mount, no jsdom,
no `$effect.root` needed.

## How

### Fix

One line, in `src/lib/features/backlinks/backlinks.service.ts::resetBacklinks`: delete
`isBuilding = false;`.

`runBuildIndex`'s `finally` always runs (the IPC rejection is caught above it), so `isBuilding`
always returns to false on its own. Keeping it true across the teardown restores the serialization:
`buildIndex(B)` then takes the queue branch, sets `vaultPath = B` and `pendingRebuild = true`, and
returns `inflightBuild` (still A's promise, which `resetBacklinks` deliberately does not clear). A's
`finally` replays `buildIndex(B)` and awaits it, so B's scan runs strictly AFTER A's, B wins
`state.write()`, and step 4's `Promise.all` settles only once B is genuinely indexed, which is what
`markIndexReady()`, step 4b and step 5b already assume.

- **Keep `pendingRebuild = false` in `resetBacklinks`.** It is not part of the bug and removing it
  regresses the close-with-no-reopen case: `vaultPath` is null there, the `finally`'s
  `pendingRebuild && vaultPath` guard skips the replay, and a stale `pendingRebuild` would make the
  NEXT vault's first `buildIndex` fire one spurious extra full scan. Any post-teardown caller re-arms
  the flag by itself.
- Update the JSDoc that the change invalidates: `resetBacklinks` needs a sentence on why
  `isBuilding` is left alone, and the `inflightBuild` JSDoc's "`isBuilding = true` is always followed
  synchronously by the assignment" reasoning must be re-stated for the new case where `isBuilding`
  stays true across a reset (it still holds: `inflightBuild` is the still-pending promise of the
  scan that owns the flag).
- Name the accepted cost in the commit message: on a switch that lands inside a watcher full
  rebuild, step 4 now waits for the dead vault's scan plus its own. This is the same tradeoff
  `2f109e26` already accepted and documented for the double-switch path, and step 4's own comment
  ("Must complete before starting the watcher to avoid concurrent builds") asks for it.

### Red-first test strategy

Add to `src/tests/lib/features/backlinks/backlinks.service.test.ts`, in the `buildIndex` describe,
reusing `mockSlowFirstScan()` and `CACHED_SCAN_RESULT`. `resetBacklinks()` is the honest stand-in for
`teardownVault()`: it is the only thing `teardownVault` does to this module.

```ts
it('does not start a second concurrent scan when the vault is torn down mid-scan', async () => {
	const { resolveFirst } = mockSlowFirstScan();

	const first = buildIndex('/vault-a');
	// teardownVault() lands while /vault-a is still scanning.
	resetBacklinks();
	const second = buildIndex('/vault-b');

	// Must still be ONE scan: /vault-b has to queue behind the live one.
	expect(invoke).toHaveBeenCalledTimes(1);

	resolveFirst(CACHED_SCAN_RESULT);
	await first;
	await second;

	expect(invoke).toHaveBeenCalledTimes(2);
	expect(vi.mocked(invoke).mock.calls[1]).toEqual(['scan_vault_v2_cached', { path: '/vault-b' }]);
});
```

Side channels that would fake a green, all of them load-bearing:

- **Asserting only the final `toHaveBeenCalledTimes(2)`.** It is 2 in both worlds. Broken: A and B
  concurrently. Fixed: A then B serially. The assertion BEFORE `resolveFirst` is the one that goes
  red; keep it there.
- **Using the same path for both calls.** This is exactly how the pre-`2f109e26` bug survived its
  test. Use two distinct paths and assert on the invoke ARGUMENT.
- **Writing the test in `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts`.** That
  suite mocks `$lib/features/backlinks/backlinks.service` wholesale (`buildIndex`, `rebuildIndex`,
  `resetBacklinks` are all `vi.fn()`), so any ordering test there is vacuous and passes against
  broken code. The probe must live in the backlinks suite with the real service and only `invoke`
  mocked.
- A second assertion worth adding, mirroring the existing `resolves the queued call only after the
  latest vault has been scanned`: with the fix, the post-teardown `buildIndex('/vault-b')` promise
  must still be PENDING across several microtask ticks. Against broken code it settles as soon as
  B's own (immediately-resolving) mock scan returns, so the `settled` flag flips early.
- Test-isolation trap the implementer must not trip: after the fix, `resetBacklinks()` in `beforeEach`
  no longer clears `isBuilding`, so any test that leaves a `mockSlowFirstScan()` scan unresolved
  leaks `isBuilding = true` into the next test in the file and silently turns its build branch into a
  queue branch. Every existing concurrency test already resolves and awaits; the new ones must too.

### Must NOT change

- `src/lib/features/tags/tags.service.ts::resetTags` clears the same two flag names for
  `runScheduledRebuild`. Leave it alone here. Its queued rebuilds are fire-and-forget `void` calls
  with no caller promise, and both concurrent `get_all_tags_v2` reads hit the SAME global Rust index,
  so no cross-vault corruption follows from the flag clearing. The real tags defect in that
  neighbourhood (an orphaned `buildTagIndex` writing the old vault's tree into `tagsStore` after
  `tagsStore.reset()`) is caused by `buildTagIndex` having no epoch guard at all, not by `isBuilding`,
  and belongs in its own issue.
- `runBuildIndex`'s `catch`, and the fact that IPC failures are logged and swallowed. That is the
  separate "buildIndex swallows IPC errors" follow-up. **Overlap warning:** that issue edits the same
  `runBuildIndex` body and the same test file, so it must share a worktree with this one or be
  sequenced after it.
- `inflightBuild` must stay uncleared by `resetBacklinks`.
- The `isBuilding = false` reset inside `runBuildIndex`'s `finally` must stay BEFORE the replay.
  Moving it self-deadlocks (`2f109e26`).
- `app-lifecycle.service.ts` needs no edit. In particular do not try to await or cancel the orphaned
  scan there; TS cannot cancel an in-flight `invoke`, and ordering is the whole fix.
- The residual transient (A's orphaned scan still lands, emits `vault-index-updated`, and shows A's
  data for one debounce window before B's scan overwrites it) is the "stale post-teardown index
  events" follow-up, which wants a vault-scoped guard in
  `core/layout/tauri-listeners.service.ts`. Out of scope here. This fix downgrades the outcome from
  "wrong vault, sticky" to "wrong vault, transient"; it does not claim to close it.
- Rejected alternative, do not implement: a current-vault check inside
  `scan_vault_v2_cached_inner`. It would need a vault identity in `VaultIndexState`, is a
  cross-language change, and buys nothing the ordering fix does not already buy.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`. No Rust file changes, so
  `cargo test` is not required.
- Stage only the files related to this issue, verify with `git diff --cached --stat`.
- One commit, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

### 2026-08-19 resolved

Fixed as specified: the single line `isBuilding = false;` is gone from
`backlinks.service.ts::resetBacklinks`. `vaultPath = null`, `pendingRebuild = false`, both
version caches and the store reset all stay, and `inflightBuild` stays uncleared.

**Race timeline this closes.** A watcher batch with no markdown file in it takes
`watcher-handler.service.ts::rebuildAllIndexes`'s full-rebuild branch, so
`backlinks.service.ts::buildIndex(A)` is live and `scan_vault_v2_cached({ path: A })` is on the
Rust blocking pool. The user switches vault, `initializeVault(B)` runs `teardownVault()` ->
`resetBacklinks()`. Before: the flag was cleared, `buildIndex(B)` at step 4 took the BUILD branch
and started a second concurrent scan, and since `VaultIndexState::build` replaces the whole index
with no vault-path check, whichever scan reached `state.write()` last won. A slow reconcile of A
landing after a cache hit on B left the process-wide index holding vault A while vault B was open,
sticky until the next full rebuild of B. After: the flag survives the teardown, `buildIndex(B)`
takes the QUEUE branch, sets `vaultPath = B` and `pendingRebuild = true` and returns A's still
pending `inflightBuild`; A's `finally` replays `buildIndex(B)` and awaits it, so B's scan runs
strictly after A's and step 4's `Promise.all` settles only once B is genuinely indexed.

**Accepted cost, unchanged from `2f109e26`.** A vault switch that lands inside a watcher full
rebuild now waits for the dying vault's remaining scan before its own. Step 4's own comment
("Must complete before starting the watcher to avoid concurrent builds") asks for exactly that.

**Red-green.** Two probes added to the `buildIndex` describe in
`src/tests/lib/features/backlinks/backlinks.service.test.ts`, both reusing `mockSlowFirstScan()`
and two distinct vault paths:

- `does not start a second scan when the vault is torn down mid-scan` asserts
  `toHaveBeenCalledTimes(1)` BEFORE `resolveFirst`, then the invoke ARGUMENT of call 2.
- `keeps the post-teardown caller pending until the new vault is scanned` asserts the
  post-teardown promise is still unsettled after a full macrotask drain.

Red, with `isBuilding = false;` put back into `resetBacklinks`: 2 failed | 37 passed (39). Failures
are `expected "vi.fn()" to be called 1 times, but got 2 times` and `expected true to be false`, i.e.
the two detecting assertions the issue named, not the trailing ones. Green with the fix: 39 passed.

**Collateral.** No other test file needed a change. `app-lifecycle.service.test.ts` mocks this
module wholesale, so it is unaffected by construction; the four pre-existing concurrency tests all
already resolve and await their slow scan, so the isolation trap the issue warned about is not
tripped. `mockSlowFirstScan`'s JSDoc now records that contract for future callers, since
`resetBacklinks()` in `beforeEach` no longer unsticks a leaked flag.

**Gate at the fix commit.** `pnpm check` 191 files 0 errors 0 warnings. `pnpm vitest run` 292 files,
6484 passed | 1 todo (baseline on main was 6476 | 1 todo; +6 from issue 55, +2 here). `pnpm build`
exit 0. No Rust file touched.

**Review verdict: findings, all three minor, all applied.**

1. `resetBacklinks`'s new JSDoc opened with "Clears every piece of per-vault state this module owns",
   which is false since `isBuilding` and `inflightBuild` are per-vault state it deliberately keeps.
   Rewritten to list what it actually clears and to name both exceptions up front.
2. The isolation contract change was unrecorded. Added to `mockSlowFirstScan`'s JSDoc.
3. `const t0 = perfStart();` sat outside `runBuildIndex`'s `try`, the one statement that could in
   principle throw between `isBuilding = true` and the `finally` that clears it. Unreachable today
   (`perfStart` only reads two settings flags and `performance.now()`), but the fix now rests the
   whole serialization on that flag, so the statement moved inside the `try` with a comment. The
   invariant is now unconditional instead of a reachability argument.

**Still open, deliberately out of scope.** A's orphaned scan still lands, still emits
`vault-index-updated`, and still shows A's data for one debounce window before B's scan overwrites
it. This fix downgrades the outcome from "wrong vault, sticky" to "wrong vault, transient"; closing
the transient wants a vault-scoped guard in `core/layout/tauri-listeners.service.ts` and is the
separate "stale post-teardown index events" follow-up. The tags-side defect (`buildTagIndex` has no
epoch guard, so an orphaned run writes the old vault's tree into `tagsStore` after
`tagsStore.reset()`) is likewise untouched and needs its own issue.

