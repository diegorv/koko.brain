# 22: Reconsider reliable deep-link delivery across vault switches

**What to build:** If cross-vault actions are approved, an accepted action executes against its intended ready vault or is visibly rejected, never silently dropped or redirected.

**Blocked by:** none
**Files:** src/lib/features/deep-link/deep-link.service.ts, src/lib/features/deep-link/deep-link.store.svelte.ts, src/lib/app/lifecycle/app-lifecycle.service.ts, src/lib/core/vault/vault.service.ts, src/lib/app/deep-link-actions.ts, src/tests/lib/features/deep-link/, src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts, src/tests/lib/app/
**Status:** needs-triage
**Priority:** P2
**Gate:** Frontend with real lifecycle and deep-link state.

## Disposition

This duplicates an archived wontfix decision based on one vault per session. The later approved switch-menu work warrants reconsideration but does not automatically reopen that decision or become a prerequisite.

An owner scope and delivery-policy decision is required before implementation.

## Decisions and acceptance criteria

- [ ] Confirm whether cross-vault action delivery is now supported.
- [ ] Choose ordering versus visible discard for back-to-back requests and retention-for-retry versus visible cancellation after failed initialization.
- [ ] A single accepted action survives teardown and executes once in its intended vault after initialization succeeds.
- [ ] Failure or canceled switching cannot leave an action that later executes in a different vault.
- [ ] Requests to the currently selected but still-initializing vault respect readiness.
- [ ] Exercise initialized and initializing source vaults, failed target initialization, cancellation, and multiple requests.
- [ ] Verify actual target content/action effects with real orchestration; merely removing teardown reset is insufficient.

## Provenance

Reconsideration successor to [archived file-io-audit 26](../../archived/file-io-audit/issues/26-cross-vault-deep-link-dropped.md), which remains wontfix with a forward reference. [Evidence](../evidence.md#cross-vault-actions).

## Comments
