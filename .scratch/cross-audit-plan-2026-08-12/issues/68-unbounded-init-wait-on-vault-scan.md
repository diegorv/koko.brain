# Issue 68: `initializeVault` waits on the vault scan with no bound, so a stalled scan strands the new vault

Status: ready-for-agent
Phase: unplanned
Source: merge-gate review of branch `issues-55-56-backlinks`, minor finding 3 (deferred there rather than
changed, because it is the deliberate price of the issue 56 fix)

Blocked by: none

Anchoring note: every reference below is by symbol.

## What

**Verdict: confirmed, by construction from two commits on this branch.**

`app-lifecycle.service.ts::initializeVault` step 4 hoists the build promise and then reads its outcome
separately:

```ts
const indexBuild = buildIndex(vaultPath);
try {
	await Promise.all([indexBuild, loadDirectoryTree(vaultPath)]);
} catch (err) { /* toast, do not abort */ }
const indexBuilt = await indexBuild.catch(() => false);
```

That second `await` has no timeout, and neither does any leg beneath it. Before `be88d544` a
`loadDirectoryTree` rejection made `Promise.all` reject immediately and init proceeded without ever
waiting for the scan. That escape hatch is gone on purpose: the scan outcome is what decides
`markIndexReady()`, step 4b and the step 5b builders, and reading it early would withhold readiness
from a vault whose Rust `VaultIndex` was in fact built.

Composed with `backlinks.service.ts::resetBacklinks` deliberately NOT clearing `isBuilding`
(`bf6e870b`), the promise being awaited can belong to a scan `initializeVault` never started:

1. Vault A sits on a stale network mount or a spinning-down external drive. A watcher batch takes
   `watcher-handler.service.ts::rebuildAllIndexes`'s full-rebuild branch, so
   `scan_vault_v2_cached({ path: A })` is blocked inside `std::fs::read_dir` on the Rust blocking
   pool.
2. The user switches to local vault B. `teardownVault()` runs, leaving `isBuilding === true`.
3. Step 4's `buildIndex(B)` takes the `if (isBuilding)` branch and returns A's still-pending
   `inflightBuild`.
4. `loadDirectoryTree(B)` settles either way, but `await indexBuild` never does.
5. Steps 5 through 9 never run: no templates folder, no file watcher on B, no FTS5 search index, no
   daily note, no deep-link action. The UI stays on "Indexing vault..." indefinitely with no error.
   Only killing the app recovers.

This is not a regression to revert. Queueing behind the live scan is exactly what makes the wrong
scan ordering impossible (issue 56), and the unbounded wait is documented as deliberate in step 4's
comment. What is missing is a bound on the pathological case.

Severity: **low**. Requires a scan that never returns (an unresponsive mount), not merely a slow one,
and the process-global `VaultIndexState` write is what would be corrupted by the alternative.

## How

One symbol changes: step 4 of `app-lifecycle.service.ts::initializeVault`.

### Scope contract

- Race `indexBuild` against a generous timeout that RESOLVES `false` (do not reject, do not cancel
  anything). `false` already means "do not assert the Rust index holds this vault", and every
  statement gated on `indexBuilt` is already correct under it: readiness stays suppressed, step 4b is
  skipped, step 5b is skipped, `indexedVaultPath` stays unset, the "Failed to index the vault" toast
  fires.
- The timeout must be generous enough that a legitimately slow cold scan of a large vault never trips
  it. Pick the number from a measured full scan, not from taste, and record the measurement in the
  commit body.
- Clear the timer on the winning path so a resolved race does not keep a pending macrotask alive past
  teardown (the module already owns `secondaryBuildersTimer` as the pattern to follow).

### Explicitly must NOT change

- **Do not clear `isBuilding` in `resetBacklinks`.** That is issue 56's fix; undoing it reintroduces
  two concurrent `scan_vault_v2_cached` calls racing the process-wide `VaultIndexState` write lock.
- **Do not move the `await indexBuild` back inside the `Promise.all`.** That is `be88d544`; it reads
  a scan that is still in flight and withholds readiness from a vault that was in fact indexed.
- Do not try to cancel the Rust scan. There is no cancellation token on `scan_vault_v2_cached` and
  adding one is a separate, larger issue.
- Do not make the timeout produce a different outcome value than `false`. A third state is issue 69's
  subject, not this one's.

### Red-first test strategy

In `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts`, alongside the existing
`buildIndex` outcome cases. Use fake timers.

1. **Red case.** Mock `buildIndex` to return a promise that never settles, run `initializeVault`,
   advance timers past the bound, and assert `initializeVault` RESOLVES and that
   `ensureTemplatesFolder` + `startWatching` were reached. Against unmodified source this hangs
   rather than failing an assertion, so give the case an explicit test timeout so the red run is a
   timeout failure, not a wedged file.
2. **Green half (must not regress).** A scan that settles `true` just under the bound still marks the
   index ready and still runs step 4b and the step 5b builders. This is the case that catches a bound
   set too aggressively.

Trap: the existing suite's slow-scan helper leaves `isBuilding` true if its promise is never
resolved, which wedges every later test in the file rather than failing its own. Resolve or reject
every scan promise a case creates, in a `finally` if necessary.

## Gate

- Frontend surface only: `pnpm check` + `pnpm vitest run` + `pnpm build`. No Rust change, so no
  `cargo test`. No E2E collateral.
- Stage only `src/lib/core/app-lifecycle/app-lifecycle.service.ts`,
  `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts` and this issue file; verify with
  `git diff --cached --stat`.
- One commit, full format (Context, Problem, Solution, Behavior, Files with line ranges). Adversarial
  review before the commit, per the playbook.

## Comments
