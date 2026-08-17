# Issue 36: Version-keyed vault-entries memo

Status: ready-for-agent
Phase: P4
Source: ARCH 5.0 (half), absorbs ARCH 3.2 part 2 — plan-2026-08-12.md §P4 — Worth-exploring variants and heavy-collateral PARTIALs

Blocked by: 04-vault-index-ready-flag

## What

Every widget render refetches `get_all_vault_entries_v2`, and `completion.ts` keeps its own private
snapshot cache with no vault-scoped invalidation — so for ~300 ms after a vault switch, wikilink
completion still suggests notes from the previous vault. Replace both with one version-keyed
`entries()` memo whose invalidation is explicit on vault open/close.

## How

- Build a version-keyed `entries()` memo over `get_all_vault_entries_v2`, keyed on the vault index
  version; **fold `completion.ts`'s own cache into it** (it stops holding a private snapshot).
- **Explicit invalidation on vault open and vault close** — this is what closes the ~300 ms
  wrong-vault completion window; do not rely on the version counter alone (it is never reset).
- Fixes the per-widget refetch: one IPC per version instead of one per widget render.
- **Absorbs arch 3.2 part 2** (the entries-snapshot leg deferred out of the LB3/indexReady fix). Do
  not ship a second snapshot holder.
- Extract `versionGated` / `isStillCurrentPath` into `src/lib/utils/inflight.ts` as part of the same
  work — they are the guards the memo and its callers share.
- **Drop the `subscribe(fetch, apply)` half of arch 5.0.** Only the memo + inflight extraction ship.
- Document the memo as a **cache, not a mirror**, in ADR-0025, amended in this same commit series.
- Test collateral: assert real store/memo state across a vault switch (open A → entries A → close →
  open B → entries B, never A's), plus same-version reuse (no second IPC).

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only this change's files (`git add <specific files>`), verify with `git diff --cached --stat`.
- One commit for the memo + inflight extraction + ADR-0025 amendment + tests, using the repo's full
  commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

2026-08-17 (from issue 04 adversarial review) — additional consumer for the invalidation scope:
`registerVaultIndexUpdatedListener`'s debounced `refresh()` (`tauri-listeners.service.ts:106-118`)
survives vault switches and, on a stale post-teardown event, fetches the snapshot directly and
writes it into `typeDefinitionsStore` / `refreshArchivedPaths` / `fsStore.contentOrder` — the old
vault's data lands in those stores until the new vault's first index event overwrites it. When the
version-keyed memo ships, route this fetch through it so the open/close invalidation covers these
writes too. (The indexReady suppression from issue 04 gates only the readiness flag, not these
snapshot writes.)
