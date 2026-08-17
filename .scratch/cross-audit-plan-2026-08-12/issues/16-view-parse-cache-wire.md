# Issue 16: View parse cache — delete dead accessors, wire the clears

Status: ready-for-agent
Phase: P2 (conflict C02)
Source: PONY #21-reduced, ARCH LB8 (and ARCH 6.0/6.2 cache leg) — plan-2026-08-12.md §P2 — Safe deletion batch (C02 commit), §Conflicts resolved C02
Blocked by: none

## What

The view parse cache exposes four dead symbols, and its two live clear functions are never called:
`app-lifecycle.service.ts:411-415` clears five peer caches on teardown but never this one, and
`deleteItem` clears the dedupe entry while a deleted `.view`'s parsed definition stays resident. This
is LB8. Delete the genuinely dead accessors and wire the clears — in the same commit.

## How

- **C02 resolution: wire wins.** Delete **only** `queryResultCache` plus the three dead accessors
  `getCachedViewYaml`, `setViewQueryResult`, `getViewQueryResult`. Nothing else in the module goes.
- **Same commit:** wire `clearViewParseCache` into `deleteItem` beside `fs.service.ts:184`, and
  `clearAllViewParseCache` into vault teardown after `app-lifecycle.service.ts:415` (beside the five
  peer cache clears already there).
- Narrow the import at `TypeSidebar.svelte:32` to the symbols that survive.
- Clean the perf-test mock so it no longer stubs the removed accessors.
- **Keeping `clearAllViewParseCache` also dissolves #21's own HIGH risk** — it is the test harness's
  only `parseCache` reset (`view-parse-cache.test.ts:23`). Do not delete it as "dead".
- Deletion and wiring must not split into two commits: splitting leaves an interval where the cache
  has neither accessors nor clears.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files for this change (`git add <specific files>`), then verify with
  `git diff --cached --stat`.
- **One commit** covering the deletion, both wirings, the import narrowing, the perf-test mock, and
  the test collateral. Full commit format (Context, Problem, Solution, Behavior, Files with line
  ranges).

## Comments
