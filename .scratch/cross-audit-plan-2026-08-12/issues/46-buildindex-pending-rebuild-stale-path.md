# Issue 46: buildIndex pendingRebuild reruns with a stale vaultPath

Status: needs-triage
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
