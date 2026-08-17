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
