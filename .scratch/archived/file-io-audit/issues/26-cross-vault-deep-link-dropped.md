# 26: A deep link to another vault is dropped by teardownVault

**Status:** wontfix

**Blocked by:** none
Priority: P2
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o03-deep-link (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

Reviewer note: the deep dive graded this P1. Downgraded to P2: the content still lives at the source (clipboard, Raycast, Shortcuts) and can be sent again.

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: feature-writers-2

**How a user hits it.** Any deep link (new/daily/capture/open) whose vault differs from the open, initialized vault. That is normal with more than one vault. There is no toast and no log.

**Recoverable from.** Only from the payload's source (clipboard, Shortcut input) if the user notices. Nothing in the app.

**Root cause.** src/lib/app/lifecycle/app-lifecycle.service.ts:641 (resetDeepLink inside teardownVault, called at :188 before step 8 at :503)

**Evidence.** deep-link.service.ts:165-166 calls setPendingAction then switchVault. switchVault calls vaultStore.open (vault.service.ts:21). The +layout.svelte:64-78 effect runs initializeVault. unsubscribeFileChange is set from the previous init (:494), so teardownVault runs (:172-188). resetDeepLink sets pendingAction=null (deep-link.store.svelte.ts:33-35). executePendingAction consumes null and returns (deep-link.service.ts:330-331). An end-to-end test with real initializeVault called twice fails. The control test with no prior vault passes.

**Repro test.** `.scratch/file-io-audit/repro/o03-deep-link/deep-link-cross-vault-pending.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
2 failed | 1 passed (control): AssertionError: expected '# Inbox\n' to be '# Inbox\n\nCLIP' (teardown sequence and end-to-end initializeVault(Personal)->initializeVault(Work))
```

**Fix sketch.** Do not reset the pending action in teardownVault. Or capture it with consumePendingAction at initializeVault entry, before teardown, and run it at step 8.

## A second cross-vault deep link replaces the first pending action before it runs

**How a user hits it.** Two deep links for different vaults back to back, for example a Shortcut that appends to vault B and then to vault C, or two Raycast captures sent quickly. URL 1 (vault=B) stores its action and switches to B. URL 2 (vault=C) arrives before B's initializeVault reaches step 8 and stores its own action in the same slot. Action 1 never runs, with no toast and no log. The serial dispatch queue does not prevent it: each URL's dispatch resolves once switchVault returns, and initializeVault runs later from the +layout effect.

**Root cause.** src/lib/features/deep-link/deep-link.store.svelte.ts:18-20 (`setPendingAction` assigns `pendingAction = action`, a single slot) together with src/lib/features/deep-link/deep-link.service.ts:162-168 (every different-vault URL calls setPendingAction, then `await switchVault`). Fixing the teardown reset alone does not close it: URL 2 can overwrite action 1 before initializeVault entry captures it. executePendingAction (deep-link.service.ts:347-359) also runs the action against `vaultStore.path`, not the action's own vault, so a kept action can run in the wrong vault.

**Fix sketch.** Make the pending slot a queue of actions keyed by resolved target vault path. At step 8, drain only the entries whose vault matches `vaultStore.path` and leave the others for their own init. Toast whenever a pending action is dropped without running, so a drop is never silent. Cross-reference with issue 06: its cancelled vault switch calls `consumePendingAction()`; with a queue, that must remove only the cancelled URL's entry.

These criteria cover only the editor-data-safety amendment (2026-11-02). Triage must add criteria for the original sections above before this Issue runs; each section's repro test is its red test.

- [ ] Two different-vault deep links dispatched back to back (URL 1 vault=B append, URL 2 vault=C append) both write their content, each into its own vault; or a discarded action shows a toast. A red test with the real initializeVault comes first
- [ ] A pending action runs only when `vaultStore.path` is the vault the action named

## Audit evidence (editor-data-safety, 2026-11-02)

- Finding F136 (.scratch/editor-data-safety/audit-2026-11-02.md; cross-reference in .scratch/editor-data-safety/xref-file-io-audit.md). No repro test was written for F136 under /Users/diegorv/Dev/pet-projects/koko/brain/.scratch/editor-data-safety/repro/; the first criterion above is the red test to write.
- Verified at the current main: deep-link.store.svelte.ts:18-20 assigns the single slot; deep-link.service.ts:23-33 serializes `handleDeepLinkUrl` calls, but resolveAndDispatch (:150-169) returns after `await switchVault(resolvedPath)` (:166), and switchVault (src/lib/core/vault/vault.service.ts:18-22) only saves, drains and calls `vaultStore.open`; step 8 `executePendingAction()` is at src/lib/app/lifecycle/app-lifecycle.service.ts:502-505; executePendingAction (deep-link.service.ts:347-359) consumes the slot and uses `vaultStore.path`.

## Comments

- 2026-11-06: closed by audit 2026-11-05 at `5f8003d67` (wontfix): Against the owner decision 'one vault per session'. A deep link to another vault is dropped only because it triggers switchVault -> teardownVault (deep-link.service.ts:161-173), and that vault switch inside a session is not a real scenario.
