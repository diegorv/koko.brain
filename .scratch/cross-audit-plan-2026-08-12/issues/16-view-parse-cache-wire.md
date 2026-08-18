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

### 2026-08-18 - closed, resolved by a single commit

| Step | Resolving SHA | Fix rounds |
|---|---|---|
| Whole issue - delete `queryResultCache` + the three dead accessors, wire `clearViewParseCache` into `deleteItem` and `clearAllViewParseCache` into teardown, narrow the `TypeSidebar` import, clean the perf-test mock | this commit | none reported |

The issue mandates one indivisible commit (splitting would leave an interval where the cache has
neither accessors nor clears), so there is a single step and a single resolving SHA.

**Per-step result**

- Gate green: `pnpm check` 190 files / 0 errors / 0 warnings, `pnpm vitest run` 291 files, 6654 passed
  + 1 todo (exit 0), `pnpm build` exit 0 (adapter-static wrote `build/`).
- Adversarial review: Fable 5 reviewer, `could_not_refute`; no fix rounds reported.

**Evidence**

- *Red-green (LB8, deletion leg):* `fs.service.test.ts:547` refreshes `/vault/Task.view` into the
  parse cache, deletes it via `deleteItem`, then asserts the next `getCachedViewDefinition` re-reads
  from disk (`readTextFile` call count for that path goes 1 -> 2). Against the pre-fix code the second
  lookup was served from `parseCache`, so the count stayed at 1 and the test failed. The probe counts
  reads of the view path only, filtered out of the other `readTextFile` traffic `deleteItem` produces
  (`.kokobrain/folder-order.json`), so no side channel can fake it green.
- *Red-green (LB8, teardown leg):* `app-lifecycle.service.test.ts:468` refreshes `/vault-a/Task.view`,
  calls `teardownVault()`, then asserts the next lookup re-reads (1 -> 2 reads). Pre-fix, teardown
  cleared the five peer caches but not this one, so the next vault kept serving the previous vault's
  parsed definition for a same-named path and the count stayed at 1. The suite needed a
  `@tauri-apps/plugin-fs` mock (`:159`) it did not previously carry, since the cache module reads
  through it.
- *Caller trace (deletion leg):* `getCachedViewYaml`, `setViewQueryResult` and `getViewQueryResult`
  had no production callers other than the single `setViewQueryResult(v.path, matchingPaths)` write in
  `TypeSidebar.svelte`'s counts effect, whose value was never read back - `getViewQueryResult` had
  zero call sites, so `queryResultCache` was write-only. Removing the write leaves
  `counts.set(v.path, matchingPaths.size)` untouched, so the sidebar badge counts are unaffected.
  `clearAllViewParseCache` was explicitly kept: it is the test harness's only `parseCache` reset
  (`view-parse-cache.test.ts:23`) and is now also a production caller via teardown.
- *Coverage kept after the cut:* the four deleted `getCachedViewYaml` / query-result cases were
  replaced by two entry-level cases that exercise the surviving behaviour - `clearViewParseCache`
  leaves sibling paths cached (`view-parse-cache.test.ts:105`) and `clearAllViewParseCache` drops
  every entry (`:119`).

**Discrepancies between issue and plan**

None substantive; both name the same four symbols and the same two wiring sites. Line drift only:
the issue cites `app-lifecycle.service.ts:411-415` for the peer-clear block and `fs.service.ts:184`
for the dedupe clear; in the current tree those are `app-lifecycle.service.ts:431-434` (new call
appended at `:435`) and `fs.service.ts:190` (`:184` is the dynamic `index-dedupe` import that opens
the same block). Symbols matched, so the placement is as specified.

**Notes**

None.

**Minor findings worth follow-up**

- `ParseCacheEntry.yaml` (`view-parse-cache.ts:7`) is still populated on every refresh but, with
  `getCachedViewYaml` gone, nothing reads it. Left in place deliberately - the issue's scope contract
  is "nothing else in the module goes". Worth a separate look if no round-trip edit consumer appears.
