# Issue 47: teardown save_vault_cache writes the old vault's entries under the new vault's key

Status: needs-triage
Phase: unplanned
Source: issue 04 adversarial review (2026-08-17) — pre-existing, not introduced by the indexReady fix
Blocked by: none

## What

During an A→B vault switch, `vaultStore.open(B)` runs BEFORE the layout `$effect` triggers
`initializeVault(B)` → internal `teardownVault()`. Teardown's cache save
(`src/lib/core/app-lifecycle/app-lifecycle.service.ts:390-394`) reads `vaultStore.path`, which is
already B — so `invoke('save_vault_cache', { path: B })` persists the STILL-IN-MEMORY old vault A's
entries under B's cache key (`src-tauri/src/commands/vault.rs:1290-1308`).

Consequence: correctness self-heals (the cached-scan reconcile walks B's disk root and drops foreign
entries, `commands/vault.rs:1172-1220`), but B's previously good cache is clobbered — every vault
switch degrades the next open of B to a de-facto full re-read instead of a cache hit.

## How

- Capture the vault path for the cache save from the vault being torn down, not from
  `vaultStore.path` at teardown time. Candidate: `teardownVault` already lives next to the watcher
  state — snapshot the path when the vault finishes initializing (e.g. module-level
  `initializedVaultPath`), or pass the old path explicitly from the callers that know it.
- Regression test FIRST (red): simulate open(A) → initialized → open(B) → teardown, assert
  `save_vault_cache` is invoked with A's path (or not at all), never B's.
- Trace both teardown callers (`+layout.svelte` else-branch and `initializeVault`'s internal
  teardown) — the welcome-screen close path must keep saving under the correct (old) key.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to this issue, verify with `git diff --cached --stat`.
- One commit, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments
