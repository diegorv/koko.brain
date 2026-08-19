# Issue 55: a failed vault scan still marks the index ready

Status: ready-for-agent
Phase: unplanned
Source: reviewer follow-up surfaced during the cross-audit run, verified 2026-08-19 by triage
Blocked by: none

## What

Confirmed, with two of the original claim's three assertions narrowed.

Causal chain, by symbol:

- `backlinks.service.ts::runBuildIndex` wraps the single `invoke('scan_vault_v2_cached')` in
  `try/catch`; the catch calls `errorLog('BACKLINKS', 'scan_vault_v2_cached failed:', err)` and
  falls through. Nothing is rethrown, nothing is recorded. The `finally` only resets `isBuilding`
  and replays a queued rerun. `buildIndex` therefore resolves identically on success and on
  failure, and its own JSDoc already admits it: "IPC failures are logged and swallowed, so a
  resolved promise does not by itself prove the scan succeeded."
- `app-lifecycle.service.ts::initializeVault` step 4 awaits
  `Promise.all([buildIndex(vaultPath), loadDirectoryTree(vaultPath)])`. Its `catch` logs and fires
  `toast.error('Failed to load vault contents...')` but does **not** `return`, and it can only ever
  be entered by `loadDirectoryTree` (which does rethrow) - never by `buildIndex`.
- Execution then reaches, unconditionally: `vaultStore.markIndexReady()`, `invalidateVaultEntries()`,
  `indexedVaultPath = vaultPath`, and step 4b's `invoke('get_all_vault_entries_v2')` ->
  `buildContentOrderMap` -> `fsStore.setContentOrder`.
- `vaultStore.markIndexReady` sets `indexReady = true` **and** clears `indexReadySuppressed`. The
  suppression flag is the only thing keeping a stale `vault-index-updated` bump from lifting the
  placeholder, so the lie is not merely "one boolean is wrong": readiness is now pinned open for
  the rest of the vault session.

What the false readiness costs. `indexReady` has exactly two consumers:
`BacklinksPanel.svelte` (the `{:else if vaultStore.isOpen && !vaultStore.indexReady}` branch that
renders "Indexing vault...") and the active-tab `$effect` in `src/routes/(app)/+layout.svelte`
(which skips `fetchBacklinksV2` while the index is not ready, precisely so it does not "write an
empty array and briefly flash the panel"). With readiness asserted after a failed scan, the panel
drops the placeholder and the layout effect fetches, so a note with real backlinks renders
"No backlinks found".

The sharper consequence is on the Rust side, and it is what raises this above cosmetic.
`scan_vault_v2_cached_inner` returns `Err` from `collect_v2_entries` / `validate_vault_path` /
`collect_markdown_paths_with_metadata` **before** it ever calls `idx.build(...)`, and
`teardownVault` never clears the Rust `VaultIndex`. So when vault B's scan fails, the process-wide
`VaultIndex` still holds vault A's entries. `markIndexReady()` then tells the UI that snapshot is
vault B's, step 4b feeds A's paths into `fsStore.contentOrder`, and `indexedVaultPath = vaultPath`
makes the next `teardownVault` write A's entries into B's cache file via `save_vault_cache`. (That
last one is self-healing: the mtime reconciliation on B's next open drops every cached path that is
not on B's disk and re-reads the rest, so the cost is one wasted full read, not a corrupt index.
Say so in the commit message rather than overselling it.)

Repro path, no Rust panic required. `openRecentVault` gates on `exists(path)`, and the directory
picker only yields real directories, so the ordinary "vault folder is gone" case is pre-empted -
but `validate_vault_path` is `canonicalize()` + `is_dir()` and
`collect_markdown_paths_with_metadata` walks with real `read_dir` calls, so:

1. Open vault A on local disk; let it index.
2. Open vault B in a directory that passes `exists()` but that the process cannot read - a macOS
   TCC-gated folder the app has not been granted (Documents / Desktop / iCloud Drive), or a mounted
   volume unmounted inside the TOCTOU window between `exists()` and step 4.
3. Backlinks panel drops "Indexing vault..." and shows vault A's notes as backlinks for whatever
   tab is open, or "No backlinks found"; the file explorer is empty or still shows A.

Parts of the original claim that are **refuted**, and must not be restated in the fix's commit
message:

- "every downstream consumer that gates on index-ready" - there are exactly two, both named above.
  Tags, tasks, properties, calendar and icons read the Rust index directly and never consult
  `indexReady`; they go empty (or stale) on a failed scan whether or not this issue is fixed.
- "no error surfaced to the user" - only true in the divergent case where the v2 scan fails and
  `scan_vault` succeeds. In the dominant case both fail, `loadDirectoryTree` rethrows, and step 4's
  catch already shows a toast. The genuinely silent window is a poisoned `VaultIndex` lock or a
  `spawn_blocking` join error, both of which need a prior Rust panic.
- Not already fixed, and the swallow is deliberate, not an oversight: `git log -S` puts it at
  `fe013e0c` (the cached-scan feature) with the "does not prove the scan succeeded" wording added at
  `2f109e26`, and `backlinks.service.test.ts` pins it with a test literally named "swallows
  scan_vault_v2_cached IPC failures (logs but does not throw)". `markIndexReady` itself arrived at
  `06a01402` (issue 04). The defect is the missing failure *signal*, not the missing throw.

## How

Scope: make `buildIndex` report success, and gate on it the three statements in `initializeVault`
that assert "the Rust index now holds THIS vault".

Symbols to change:

- `src/lib/features/backlinks/backlinks.service.ts`
  - `runBuildIndex`: return `Promise<boolean>` - `true` only after the `invoke` resolves. Keep the
    catch exactly as it is (log, do not rethrow).
  - **Trap, this is the whole difficulty of the change:** the queued-rerun replay currently lives in
    the `finally` block, and a value awaited inside `finally` is discarded. Left there, a caller
    that queued behind a failed scan would receive the *failed* scan's `false` even though its own
    rerun succeeded, which re-breaks the completion contract `2f109e26` established. Move the replay
    below the `try/catch/finally` and `return` it:

    ```ts
    let ok = false;
    try {
    	const result = await invoke<CachedScanResult>('scan_vault_v2_cached', { path });
    	ok = true;
    	// ...existing perfEnd + debug...
    } catch (err) {
    	errorLog('BACKLINKS', 'scan_vault_v2_cached failed:', err);
    } finally {
    	isBuilding = false;
    }
    if (pendingRebuild && vaultPath) {
    	pendingRebuild = false;
    	return buildIndex(vaultPath);
    }
    return ok;
    ```

    `isBuilding = false` must stay inside `finally` and must still run before the replay re-enters
    `buildIndex`, or the rerun takes the await branch and self-deadlocks.
  - `buildIndex`: signature becomes `Promise<boolean>`; the queued branch still returns
    `inflightBuild`, and its `?? Promise.resolve()` fallback becomes `?? Promise.resolve(false)`
    (unreachable, keep it honest). Update the JSDoc: delete the "a resolved promise does not by
    itself prove the scan succeeded" sentence and state the new contract.
  - `rebuildIndex`: leave the signature alone. The watcher ignores the value.
- `src/lib/core/app-lifecycle/app-lifecycle.service.ts` - `initializeVault` step 4 only:
  - Capture the flag without changing the existing `Promise.all` failure behaviour:
    `buildIndex(vaultPath).then((ok) => { indexBuilt = ok; })` inside the same `Promise.all`, so a
    `loadDirectoryTree` rejection still enters the existing catch and still does not abort init.
  - Gate `vaultStore.markIndexReady()`, `indexedVaultPath = vaultPath` and the step 4b
    `get_all_vault_entries_v2` block on `indexBuilt`.
  - On `!indexBuilt`, `toast.error(...)` with a message distinct from the existing
    "Failed to load vault contents..." one. In the both-fail case the user sees two toasts; that is
    accepted - do **not** build a dedupe mechanism for it.
  - Readiness after a failed build is deliberately sticky: `indexReadySuppressed` stays set, so a
    later successful watcher rebuild will not lift the placeholder and the user recovers by
    reopening the vault. Record that in the commit message. Auto-recovery (lifting suppression from
    a later successful `buildIndex`) is explicitly **out of scope** - it would move readiness
    ownership out of `initializeVault` and lose the `initVersion !== version` guard that keeps a
    superseded init from marking a torn-down vault ready.

Red-first test strategy:

- `src/tests/lib/features/backlinks/backlinks.service.test.ts`
  - **Update, do not delete**, "swallows scan_vault_v2_cached IPC failures (logs but does not
    throw)": `await expect(buildIndex('/vault')).resolves.toBe(false)`. Red today (resolves
    `undefined`).
  - Add the positive control in the same file: a resolved `CACHED_SCAN_RESULT` gives
    `resolves.toBe(true)`. Without it, `toBe(false)` could be satisfied by any falsy regression.
  - Add the coalescing case with the existing `mockSlowFirstScan` helper: first scan **rejects**,
    the queued `buildIndex('/vault-c')` must resolve `true` once the rerun succeeds. This is the
    only test that catches the `finally`-discards-the-value trap; a fix that leaves the replay in
    `finally` passes the two tests above and fails this one.
- `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts` (the suite already mocks
  `$lib/features/backlinks/backlinks.service` and `svelte-sonner`)
  - **Fix the suite's base mock first, or the gate produces a wall of unexplained reds.** The
    block-level mock is `buildIndex: vi.fn(() => Promise.resolve())`, which resolves `undefined` -
    falsy under the new gate, so every test in the file behaves as if the scan failed. Change the
    base mock to `buildIndex: vi.fn(() => Promise.resolve(true))` and let the red case opt out with
    `vi.mocked(buildIndex).mockResolvedValueOnce(false)`. Collateral this closes, enumerated so a
    fresh agent does not weaken the gate to make it pass:
    - `'clears index readiness so the next vault shows the indexing state'` - asserts
      `vaultStore.indexReady === true` after `await initializeVault('/vault-b')`, which the gate
      turns false by skipping `markIndexReady()`.
    - `'saves the index cache under the torn-down vault path, not the newly opened one'` - asserts
      `save_vault_cache` is called with `/vault-a`, which requires `indexedVaultPath` to have been
      set during vault A's init; the gate skips that assignment.
    - Every remaining `initializeVault` case additionally starts firing the new failure
      `toast.error`. Nothing asserts on it today so none of them fail, but the noise is expected and
      is not a reason to soften the message or the gate.
  - Red test: `vi.mocked(buildIndex).mockResolvedValueOnce(false)`, `await initializeVault('/vault')`,
    then `expect(vaultStore.indexReady).toBe(false)` plus
    `expect(toast.error).toHaveBeenCalledWith('<the new message>')`.
  - Side channels that can fake a green here, all of which the test must close:
    - The suite's `beforeEach` does **not** call `vaultStore._reset()`. Call it at the top of the
      test, otherwise a previous test's `indexReady = true` (or `false`) decides the assertion.
    - Pair it with a positive control in the same test file - `buildIndex` resolving `true` must
      still yield `indexReady === true` - or the red test passes against a fix that simply never
      marks ready.
    - `bumpVaultIndexVersion` also sets `indexReady`. Do not call it, and do not call
      `markIndexReady()`, anywhere in the new test.
    - Assert `toast.error` on the exact message string. Steps 2, 3 and 4 all call `toast.error`, so
      a bare `toHaveBeenCalled()` passes for the wrong reason. Keep the mocked `loadDirectoryTree`
      resolving so step 4's own catch does not fire.

Must NOT change:

- The swallow itself. `runBuildIndex` still must not rethrow: `inflightBuild` is shared with the
  queued caller, so a rejection would propagate to a caller whose own vault indexed fine.
- The coalescing contract from `2f109e26`: `vaultPath = path` before the `isBuilding` early return,
  the shared `inflightBuild`, and `resetBacklinks` deliberately not clearing it.
- `vault.store.svelte.ts`. No new store method, no change to `resetIndexReady`,
  `bumpVaultIndexVersion`, `markIndexReady` or the `indexReadySuppressed` semantics.
- `invalidateVaultEntries()` in step 4 stays **unconditional** - dropping the memo is correct
  whether or not the scan succeeded.
- The existing step 4 catch, its message, and the fact that it does not abort init.
- `rebuildIndex`, `watcher-handler.service.ts`, `BacklinksPanel.svelte`, the layout `$effect`, and
  every Rust file. The Rust index retaining the previous vault's entries on a failed scan is a
  separate defect; this issue only stops the app from asserting that snapshot is valid.

## Gate

- **Worktree overlap:** issue 56 (`56-teardown-vault-races-live-scan.md`) edits the same
  `runBuildIndex` body and the same `src/tests/lib/features/backlinks/backlinks.service.test.ts`.
  The two must share a worktree or be sequenced one after the other; do not run them as parallel
  branches. Issue 56 carries the reciprocal note.
- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to this issue (`git add <specific files>`), then verify with
  `git diff --cached --stat`.
- One commit for the fix, using the repo's full commit format (Context, Problem, Solution,
  Behavior, Files with line ranges). Test collateral lands in the same commit as the source change.

## Comments

### 2026-08-19 - triage revision after adversarial review

Two findings applied. Verdict unchanged: confirmed, medium, ready-for-agent.

- The test strategy now names the app-lifecycle suite's base mock
  (`buildIndex: vi.fn(() => Promise.resolve())`, which resolves `undefined` and is falsy under the
  new gate), prescribes changing it to resolve `true`, and enumerates the two existing tests the
  gate would otherwise turn red, mirroring issue 54's collateral list.
- Added the reciprocal worktree-overlap note with issue 56: same `runBuildIndex` body, same
  `backlinks.service.test.ts`, share a worktree or sequence them.

### 2026-08-19 - resolved

Red-green evidence. The two source files were stashed (`git stash push --` on
`backlinks.service.ts` + `app-lifecycle.service.ts`) and both suites re-run against the
pre-fix code, so the red below is a real run, not a recollection:

```
FAIL src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts > initializeVault >
     leaves the index unready and warns when the vault scan fails
AssertionError: expected true to be false   (vaultStore.indexReady)

FAIL src/tests/lib/features/backlinks/backlinks.service.test.ts > buildIndex >
     swallows scan_vault_v2_cached IPC failures (logs, does not throw, resolves false)
AssertionError: expected undefined to be false

FAIL src/tests/lib/features/backlinks/backlinks.service.test.ts > buildIndex >
     resolves true when the scan succeeds
AssertionError: expected undefined to be true

FAIL src/tests/lib/features/backlinks/backlinks.service.test.ts > buildIndex >
     resolves the queued call true when the rerun succeeds after a failed first scan
AssertionError: expected undefined to be true

Test Files  2 failed (2)     Tests  4 failed | 86 passed (90)
```

Green after the fix, same two files: `Test Files 2 passed (2)`, `Tests 90 passed (90)`.

Full gate, all real runs in this worktree:

- `pnpm check` - 191 files, 0 errors, 0 warnings.
- `pnpm vitest run` - 292 files passed, 6480 passed + 1 todo (baseline 6476 + 1 todo; the
  delta is exactly the 4 tests added here). No false reds: the three known-unstable files
  passed in the full run.
- `pnpm build` - exit 0.

What discovery re-derived:

- `buildIndex` has exactly two call sites, `app-lifecycle.service.ts::initializeVault`
  (step 4) and `backlinks.service.ts::rebuildIndex`. The latter awaits and discards the
  value, so widening the return type to `Promise<boolean>` needs no change there and none
  was made.
- `indexReady` still has exactly the two consumers the issue names, `BacklinksPanel.svelte`
  and the active-tab `$effect` in `src/routes/(app)/+layout.svelte`. Nothing else reads it,
  so the gate's blast radius is the placeholder plus the deferred `fetchBacklinksV2`.
- The queued-replay trap is real and the third backlinks test is the only thing that catches
  it: with the replay left inside `finally` the first two backlinks tests still pass.

Collateral tests updated:

- `app-lifecycle.service.test.ts` block mock changed from `buildIndex: vi.fn(() =>
  Promise.resolve())` to `Promise.resolve(true)`. Without it every `initializeVault` case in
  the file would have behaved as a failed scan. The two tests the issue enumerated
  (`'clears index readiness so the next vault shows the indexing state'` and `'saves the
  index cache under the torn-down vault path, not the newly opened one'`) pass unchanged
  under the new base mock; neither assertion was weakened.
- The red case opts out with `mockResolvedValueOnce(false)` and calls `vaultStore._reset()`
  first, since the suite's `beforeEach` does not. It is paired with a positive control in the
  same file.
- Deviation from the issue's suggested test shape: the coalescing case uses
  `mockRejectedValueOnce(...).mockResolvedValue(CACHED_SCAN_RESULT)` rather than the existing
  `mockSlowFirstScan` helper, because that helper resolves the first scan and therefore cannot
  express "failed first scan, succeeding rerun". The rejection settles on a microtask, so the
  queued call still observes `isBuilding === true` and takes the queue branch, which the test
  pins with `expect(invoke).toHaveBeenCalledTimes(1)`.

Adversarial review: returned an empty finding list, nothing to fix. This agent independently
re-derived the red evidence above rather than trusting the report.

Found and deliberately left out of scope:

- The Rust `VaultIndex` keeps the previous vault's entries when `scan_vault_v2_cached_inner`
  returns `Err` before `idx.build(...)`, and `teardownVault` never clears it. This fix only
  stops the app from asserting that stale snapshot is valid. Clearing it is a separate defect.
- Auto-recovery. Readiness stays suppressed for the rest of the vault session after a failed
  build, so a later successful watcher rebuild will not lift the placeholder; the user recovers
  by reopening the vault. Lifting suppression from a later `buildIndex` would move readiness
  ownership out of `initializeVault` and lose the `initVersion !== version` guard.
- Toast dedupe. When both `buildIndex` and `loadDirectoryTree` fail the user sees two toasts.
  Accepted, as the issue specified.
