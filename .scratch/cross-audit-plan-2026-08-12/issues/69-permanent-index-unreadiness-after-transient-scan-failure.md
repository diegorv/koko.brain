# Issue 69: a transient scan failure makes the Backlinks panel claim "Indexing vault..." for the whole session

Status: ready-for-agent
Phase: unplanned
Source: merge-gate review of branch `issues-55-56-backlinks`, minor finding 4 (deferred there:
`68bdffc8` explicitly scopes auto-recovery out and gives the reason)

Blocked by: none

Anchoring note: every reference below is by symbol.

## What

**Verdict: confirmed.** After `68bdffc8`, `vault.store.svelte.ts`'s `indexReadySuppressed` latch is
cleared by exactly one caller, `markIndexReady()`, and `initializeVault` now calls that only when the
scan resolved `true`. So unreadiness after a failed scan is permanent for the vault session, and the
UI states it as work in progress that is not happening.

### Causal chain

1. `resetIndexReady()` (from `teardownVault`) sets `indexReady = false` and
   `indexReadySuppressed = true`.
2. `bumpVaultIndexVersion` only does `if (!indexReadySuppressed) indexReady = true;`, so no later
   event can lift the latch.
3. `initializeVault` calls `markIndexReady()` inside `if (indexBuilt)`. A failed
   `scan_vault_v2_cached` therefore leaves the latch set with nothing left to clear it.
4. `BacklinksPanel.svelte` renders `Indexing vault...` for `vaultStore.isOpen && !vaultStore.indexReady`,
   and the active-tab effect in `src/routes/(app)/+layout.svelte` early-returns on
   `!vaultStore.indexReady`, so `fetchBacklinksV2` is never called for the rest of the session.

The trigger does not need an unusable vault. `src-tauri/src/utils/fs.rs::walk_dir_with_metadata`
propagates a `read_dir` error from ANY subdirectory (`std::fs::read_dir(dir).map_err(...)?`), so a
folder a sync client removes mid-walk, a TCC-gated folder, or a momentarily unreadable directory
fails the whole scan. Every other panel self-heals on the very next watcher-driven `rebuildIndex()`;
Backlinks alone does not.

Secondary cost: `indexedVaultPath` is assigned inside the same `if (indexBuilt)`, so `teardownVault`'s
`save_vault_cache` never runs for that session and the next open of that vault pays a full cold scan.

Severity: **low-medium**. One panel dark plus a lost cache write, recoverable by reopening the vault,
but the message actively misinforms: it says indexing is in progress when nothing is running, and the
one-shot "Failed to index the vault. Reopen it to try again." toast is off screen within seconds.

## How

The cheapest honest improvement is to stop the placeholder lying, NOT to add auto-recovery.

### Scope contract

- Give `vault.store.svelte.ts` a third readiness state so consumers can distinguish "building" from
  "build failed". Shape it as a getter (repo rule: getters, not `$derived`, in stores) and give it a
  test, like every other computed getter in that store.
- Set the failed state from `initializeVault`'s existing `else` branch, next to the toast that already
  fires there. Do not add a second decision point.
- `BacklinksPanel.svelte` renders the failed state as its own message naming the recovery ("Vault
  indexing failed. Reopen the vault to try again."), keeping "Indexing vault..." for the genuinely
  in-progress case.
- The `+layout.svelte` active-tab effect keeps early-returning in both states. Nothing changes about
  when `fetchBacklinksV2` runs.

### Explicitly must NOT change

- **Do not move readiness ownership out of `initializeVault`.** `68bdffc8` scoped that out with a
  reason: `initializeVault` is where the `initVersion !== version` guard lives, and a readiness signal
  emitted anywhere else loses it and can mark a torn-down vault ready.
- **Do not lift the latch on a `vault-index-updated` bump.** The listener survives vault switches
  (issue 54), so a tail event from the old vault would clear the placeholder for the new one. That is
  the exact bug `68bdffc8` fixed.
- Do not add a retry loop or a "retry" button in this issue. Auto-recovery is a bigger design question
  (it has to decide which vault the retry belongs to) and it is not what makes the current behaviour
  wrong; the wrong part is the message.
- Do not touch `vaultIndexVersion` monotonicity, `markIndexReady` or `resetIndexReady` semantics.
- Do not move the `indexedVaultPath` assignment out of the `if (indexBuilt)` branch. Writing a cache
  key for a vault whose index was never built is worse than losing one cold-scan's worth of cache.

### Red-first test strategy

1. `src/tests/lib/core/vault/vault.store.svelte.test.ts`: the new getter's own cases, including that
   `_reset()` clears it and that `markIndexReady()` clears it.
2. `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts`: with the scan resolving `false`,
   assert the store ends in the failed state and NOT merely `indexReady === false` (the existing case
   already asserts the latter, so a new case that stops there is vacuous and would pass against
   unmodified source). Prove the red run.
3. With the scan resolving `true`, assert the failed state is not set. This is the case that catches
   setting the flag unconditionally.

Component rendering is not testable in this repo, so the `BacklinksPanel.svelte` branch is covered by
the store state, not by a render assertion.

## Gate

- Frontend surface only: `pnpm check` + `pnpm vitest run` + `pnpm build`. No Rust change, so no
  `cargo test`. Check whether any E2E spec asserts the "Indexing vault..." string before changing it;
  if one does, run `bash scripts/e2e.sh` (never manual).
- Stage only the store, `app-lifecycle.service.ts`, `BacklinksPanel.svelte`, their tests and this
  issue file; verify with `git diff --cached --stat`.
- One commit, full format (Context, Problem, Solution, Behavior, Files with line ranges). Adversarial
  review before the commit, per the playbook.

## Comments
