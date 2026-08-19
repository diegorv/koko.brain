# Issue 46: buildIndex pendingRebuild reruns with a stale vaultPath

Status: ready-for-agent
Phase: unplanned
Source: issue 04 adversarial review (2026-08-17) — pre-existing, not introduced by the indexReady fix
Blocked by: none

## What

`buildIndex(path)` in `src/lib/features/backlinks/backlinks.service.ts:53-78` early-returns when
`isBuilding` is true, setting `pendingRebuild = true` WITHOUT updating the module-level `vaultPath`.
The in-flight build's `finally` then reruns `buildIndex(vaultPath)` — the OLD path.

Concrete failure (rapid double-switch A→B→C while B's scan is in flight): init(C) calls
`buildIndex(C)`, which no-ops into `pendingRebuild`; the pending rerun scans B, never C. The Rust
`VaultIndex` is left holding B's entries while C is open — every `*_v2` query (backlinks, tags,
tasks, properties, entries snapshot) serves the wrong vault's data until some later rebuild.

Secondary symptom: init(C)'s step 4 resolves instantly (the no-op), so
`vaultStore.markIndexReady()` asserts readiness for an index that was never built for C — the
"step 4 done implies this vault's index is built" premise is violated on this path.

## How

- Regression test FIRST (red): concurrent `buildIndex(B)` in flight, call `buildIndex(C)`, assert
  the pending rerun scans C (assert on the `invoke('scan_vault_v2_cached', { path })` argument).
- Minimal fix candidate: assign `vaultPath = path` BEFORE the `isBuilding` early return, so the
  pending rerun always targets the latest requested path.
- Trace all callers of `buildIndex` / `rebuildIndex` before changing (root CLAUDE.md removal rules).

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to this issue, verify with `git diff --cached --stat`.
- One commit, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

### 2026-08-19 — implemented

**Red-green evidence.** Three new tests in
`src/tests/lib/features/backlinks/backlinks.service.test.ts`, run against the unfixed
service (`pnpm vitest run src/tests/lib/features/backlinks/backlinks.service.test.ts`
-> `3 failed | 32 passed`):

- `buildIndex > reruns the queued build for the LATEST requested vault path` — the
  second `invoke` call was `['scan_vault_v2_cached', { path: '/vault-b' }]`, expected
  `/vault-c`.
- `buildIndex > resolves the queued call only after the latest vault has been scanned`
  — `settled` was `true` after three microtask ticks (the queued call returned an
  already-resolved promise), expected `false`.
- `rebuildIndex > targets the latest vault after a queued switch` — the replay hit
  `{ path: '/vault-b' }`, expected `/vault-c`. This is the assertion proving the
  corruption is permanent, not one-shot.

After the fix: `35 passed (35)`. Full gate: `pnpm check` 191 files / 0 errors,
`pnpm vitest run` 284 files / 6344 passed + 1 todo, `pnpm build` exit 0.

**What discovery found.** Confirmed by probe. `vaultPath = path` sat AFTER the
`isBuilding` early return, so the rerun in the `finally` replayed the OLD path and
`rebuildIndex()` kept replaying it on every later watcher rebuild. Reachability on the
A->B->C double-switch is real: C's init skips teardown because `unsubscribeFileChange`
is still null (`app-lifecycle.service.ts:122`), so `resetBacklinks()` never clears
`isBuilding` and C's `buildIndex` hits the queue path.

**Scope note (the `## How` is narrower than the fix).** The prescribed minimal fix
(move `vaultPath = path` above the early return) closes the stale-path half but NOT
the `markIndexReady()` premise documented in `## What`: with it alone, `buildIndex(C)`
still resolves instantly, so `markIndexReady()` (`app-lifecycle.service.ts:218`), step
4b's `get_all_vault_entries_v2` (:222) and step 5b's `buildPropertyIndex` /
`buildFrontmatterIconIndex` / `scanFilesForCalendar` (:261-267) still run against the
previous vault. Unlike backlinks/tags/tasks/graph, those three are never re-run by
`tauri-listeners.service.ts:refresh()`, so properties, file-icons and calendar would
stay wrong until a watcher full rebuild. Same root cause (the function lying about
which path and about completion), so both halves landed here: `buildIndex` is now a
thin sync wrapper that stores the in-flight promise in `inflightBuild` and returns it
from the queued branch, with the body moved to a private `runBuildIndex(path)`.

**Deliberate behavior change.** On the rare double-switch, step 4 now waits for the
previous vault's scan plus its own instead of resolving instantly. That is what step
4's own comment (`app-lifecycle.service.ts:200`) asks for, but it is a real change on
that path. The normal single-vault path is untouched (`isBuilding` is false).

**Test collateral.** The existing `queues a pending rebuild when called concurrently`
test encoded the broken "returns immediately" contract (`await second` before
`resolveFirst`) and would have deadlocked; it was reordered to
`resolveFirst -> await first -> await second`, keeping the
`toHaveBeenCalledTimes(1)` assertion before the resolve. A shared
`mockSlowFirstScan()` helper + `CACHED_SCAN_RESULT` fixture back the four concurrency
tests. The three new tests assert on the `invoke` ARGUMENT, not a call count — the old
test passed against the bug precisely because it used `/vault` for both calls.

**Numbering collision.** The plan file's `#46` (`plan-2026-08-12.md:90`) is an
unrelated Rust search-index item (`search_index.rs:198-207`). This issue is
`Phase: unplanned`; do not conflate them.

**Review.** adversarial review: see commit.

**Follow-ups worth their own issues (out of scope here).**

1. `teardownVault()` landing mid-scan runs `resetBacklinks()`, which clears
   `pendingRebuild` and sets `isBuilding = false` while the scan is still running, so a
   queued caller can resolve without its index being built and a fresh `buildIndex` can
   start a second concurrent scan. Pre-existing.
2. `buildIndex` still swallows IPC errors (`backlinks.service.ts` catch block), so a
   queued caller cannot distinguish "index built" from "scan failed";
   `markIndexReady()` stays optimistic on a failed scan.
