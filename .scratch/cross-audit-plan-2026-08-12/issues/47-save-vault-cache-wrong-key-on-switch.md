# Issue 47: teardown save_vault_cache writes the old vault's entries under the new vault's key

Status: ready-for-agent
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

### 2026-08-19: resolved

**Verified, then fixed.** Discovery confirmed the report end to end. The only production
trigger for an A -> B switch is `vaultStore.open(B)` (`vault.service.ts:11` / `:33`,
`deep-link.service.ts:137`), which mutates the store and only afterwards wakes the `$effect`
at `(app)/+layout.svelte:57-63` that calls `initializeVault(B)`. That init tears down at
`app-lifecycle.service.ts:135` before B's `buildIndex` (Step 4), so the teardown save read
`vaultStore.path` when it was already B while the Rust `VaultIndex` still held A's entries.
`save_vault_cache` (`src-tauri/src/commands/vault.rs:1290-1308`) trusts its `path` argument
and snapshots the current in-memory entries, so B's cache file got A's entries.

**Red-green evidence.** New test `saves the index cache under the torn-down vault path, not
the newly opened one` in `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts`,
inside the `state transitions: teardown -> reinitialize` describe. It reproduces the real
ordering (`vaultStore.open('/vault-a')` -> `initializeVault('/vault-a')` ->
`vaultStore.open('/vault-b')` -> `initializeVault('/vault-b')`) and asserts both the positive
and the negative key. Against the unfixed code it failed with the recorded call
`["save_vault_cache", { "path": "/vault-b" }]` and no `/vault-a` call at all
(`1 failed | 42 passed`). After the fix: `43 passed`. The negative assertion alone would be
vacuous (a suite that never opens a vault records no call), so both assertions ship in the
same `it`.

**Fix.** Module-level `indexedVaultPath` in `app-lifecycle.service.ts`, assigned right after
`vaultStore.markIndexReady()` (the exact point where the Rust index becomes this vault's) and
read by the teardown save, which nulls it afterwards. The anchor matters: assigning at
function entry instead would let an init that aborts early (the `open_vault_db` failure return,
or any of the five `initVersion !== version` guards) leave `indexedVaultPath` naming a vault
whose entries are not in the index, re-creating the same class of bug in a rarer path.

**Both teardown callers traced.**
- `app-lifecycle.service.ts:135` (internal teardown on switch): the bug site; now saves under
  the old vault's key.
- `(app)/+layout.svelte:91` (else-branch when `isOpen`/`path` go falsy): fires once at app
  start with no vault. Before: `vaultStore.path` null, no save. After: `indexedVaultPath` null,
  no save. Identical. Note there is NO production caller of `vaultStore.close()` anywhere in
  `src/lib` (grep: tests only), so the welcome-screen close path is currently unreachable; if it
  is ever wired, today it would save nothing (path already null) and after this fix it saves the
  old vault's entries under the old key. Strict improvement, no regression.

`save_vault_cache` has exactly one call site in the whole repo, so no side channel can fake the
positive assertion. None of the ~24 `reset*` functions teardown calls reads `vaultStore` or
invokes IPC, so `:413-422` was the single site and this is a root-cause fix, not a symptom patch.

**Gate.** `pnpm check` 0 errors / 0 warnings / 191 files. `pnpm vitest run` 284 files, 6332
passed, 1 todo. `pnpm build` succeeded (adapter-static wrote `build/`).

**Plan discrepancies.**
- The plan's cluster C10 (`plan-2026-08-12.md:26`) and its P2 settings bullet (`:98-102`) refer
  to a `#47` that is the PONY audit item "inline `shouldAutoCheckNow`" in
  `update-check.service.ts`, a DIFFERENT #47 from this tracker's issue 47. That PONY item is
  already applied (`update-check.service.ts` is 56 lines, no `shouldAutoCheckNow`, no 24h
  throttle). The plan's C10 sequencing text is not ordering guidance for this issue.
- The issue cites `app-lifecycle.service.ts:390-394` for the cache save; in the current worktree
  the block sits at `:413-422` after the fix (`:400-405` before it). Same code, same bug.

**Minor findings, not fixed here (no follow-up issue opened).**
- The cache save is fire-and-forget while the very next statements close the vault DB and shut
  down the semantic engine. It races nothing today (the Rust command reads the in-memory
  `VaultIndex`, not the DB), but a future `save_vault_cache` that touches the vault DB would be
  ordering-sensitive.
- `initializeVault`'s early `return` on `open_vault_db` failure leaves the previous vault's
  stores already torn down. Out of scope here; the `indexedVaultPath` anchor is deliberately
  chosen so that path stays correct.
