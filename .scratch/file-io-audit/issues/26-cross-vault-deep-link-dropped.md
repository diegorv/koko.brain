# 26 A deep link to another vault is dropped by teardownVault

Status: needs-triage
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
