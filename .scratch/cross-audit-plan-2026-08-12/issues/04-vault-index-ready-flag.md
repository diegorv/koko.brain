# Issue 04: Second vault never shows "Indexing vault..."

Status: ready-for-agent
Phase: P0.4
Source: ARCH LB3 + arch 3.2 part 1 — plan-2026-08-12.md §P0 — Live-bug surgical fixes
Blocked by: none

## What

Readiness is inferred from `vaultIndexVersion === 0`, but the counter is process-global and already non-zero by the time a second vault opens. The second vault therefore skips the "Indexing vault..." placeholder and briefly flashes empty backlinks and panels. Goal: every vault opened in a session shows the indexing state until its index is built.

## How

- Write the regression test FIRST and confirm it FAILS: teardown then bump, asserting readiness is `false` then `true` on the real store (no mocks).
- Add an additive `indexReady` flag on `vault.store.svelte.ts`: set in `bumpVaultIndexVersion`, cleared by a new reset called from `teardownVault`.
- Swap the two `vaultIndexVersion === 0` guards to read `indexReady`.
- The counter is NEVER reset. `completion.ts` depends on `vaultIndexVersion` monotonicity.
- Expose readiness as a getter, not `$derived` (store convention), and give the new getter its own test.
- Part 2 of arch 3.2 (the entries snapshot) is NOT in this issue: it merges into arch 5.0 at P4 (issue 36).

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to this issue (`git add <specific files>`), then verify with `git diff --cached --stat`.
- One commit for this fix, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges). Test collateral lands in the same commit as the source change.

## Comments

2026-08-17 — Implemented, with one deliberate deviation from the How.

Red-green evidence: 6 regression tests written first failed against the broken code for the right
reason (`indexReady` getter and `resetIndexReady()` absent — TypeError / `expect(undefined).toBe(false)`),
then went green after the fix. Full gate green: `pnpm check` 0 errors, `pnpm vitest run` 6696 passed,
`pnpm build` ok.

Deviation from the How: the prescribed contract ("set in `bumpVaultIndexVersion`, cleared in
teardown") was proven racy by adversarial review round 1 (MAJOR): `registerVaultIndexUpdatedListener`
is registered once at layout mount, debounced 300 ms, and never torn down on vault switch — so the
OLD vault's tail events (dirty-tab saves via `saveAllDirtyTabs` → fire-and-forget
`update_note_in_index` → Rust emits `vault-index-updated`) land AFTER `teardownVault` and would flip
`indexReady` back to true before the new vault's index is built, re-creating the exact bug on the
switch path. Fix: readiness is suppressed from `resetIndexReady()` (teardown, and unconditionally at
`initializeVault` entry to cover the rapid double-switch window where the internal teardown is
skipped) until `markIndexReady()`, called by `initializeVault` after step 4 completes under the
`initVersion` staleness check. Bumps set readiness only outside the suppression window.

Review: two rounds + final confirm by adversarial Fable 5 sub-agent. Round 1: 2 majors (race above;
guard swaps untested) — both fixed (suppression window; 2 mounted-component placeholder tests in
BacklinksPanel.test.ts that fail if the guard swap is reverted). Round 2 verdict: commit-ready;
mutant analysis confirmed all new tests kill (a) original code, (b) bump-sets-ready-unconditionally,
(c) suppression without the `markIndexReady` call.

Accepted trade (review round 2): if `scan_vault_v2_cached` fails, `buildIndex` swallows the error and
`markIndexReady` still runs — panels show "No backlinks found" + the step-4 error toast instead of an
eternal "Indexing vault..." placeholder. Judged acceptable: the eternal placeholder was a lie and the
toast is the honest signal.

Known gap: the swapped guard in `+layout.svelte` has no direct test (no layout test file exists;
mounting the app layout pulls the whole app graph). The store contract is pinned by
vault.store.test.ts and the user-visible placeholder by BacklinksPanel.test.ts.

Pre-existing bugs discovered by the review, filed separately: issue 46 (`buildIndex` pendingRebuild
reruns with stale `vaultPath` — Rust index can serve the wrong vault), issue 47 (`save_vault_cache`
in teardown writes the old vault's entries under the new vault's cache key). The listener's
post-teardown stale snapshot writes are noted on issue 36.
