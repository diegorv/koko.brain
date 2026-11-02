# Issue 06 discovery

## Files that change

- `src/lib/core/vault/exit.service.ts:15-24`: extract the discard prompt of `prepareForExit` into `confirmDiscardFailedSaves(failedPaths, verb)` (Issue 01 landed `prepareForExit` with the prompt inline; this is its "prompt helper"). Close keeps "Close anyway ...".
- `src/lib/core/vault/vault.service.ts:18-22`: `switchVault(path): Promise<boolean>`; on failed paths ask "Failed to save: X. Switch anyway and lose unsaved changes?"; on cancel return `false` before the drain and `vaultStore.open`. `openVaultDialog` / `openRecentVault` return the `switchVault` result.
- `src/lib/features/deep-link/deep-link.service.ts:163-166`: when `switchVault` returns `false`, `deepLinkStore.consumePendingAction()`.
- `src/lib/app/lifecycle/app-lifecycle.service.ts:174-179`: comment only ("opens the new vault anyway" goes stale).

## Plan (test-first)

1. Move `.scratch/file-io-audit/repro/o01-quit-and-switch/vault-switch-failed-save.test.ts` to `src/tests/lib/core/vault/vault-switch-failed-save.test.ts` (red). Its second test runs the `initializeVault` safety net + `teardownVault` unconditionally; adapt it to run that chain only when the path changed (the `+layout` effect runs `initializeVault` only on a path change).
2. Update `vault.service.switch-save.test.ts`: the failed-save test becomes "opens B only after the user agrees to discard" (ask -> true, prompt text asserted); add the cancel case; the success tests also assert `ask` not called.
3. Implement helper + `switchVault`.
4. deep-link: `deep-link.service.test.ts` adds a `@tauri-apps/plugin-dialog` mock and a test: `saveAllDirtyTabs` resolves a failed path, `ask` false, real `resolveAndDispatch` + `switchVault` -> `hasPending` false, path unchanged. Then the fix.
5. app-lifecycle test: real `initializeVault`. After `teardownVault()` (clears the watcher handle so the next init takes the branch that skips teardown and so skips `resetDeepLink`), a cancelled deep link to B, then `initializeVault('/vault-c')`: the dropped `open` action never reaches `openFileInEditor`. Needs `ask` mocked and `openFileInEditor` in the editor.service mock. Fails without step 4 (pending slot survives to step 8).

## Prior art

- `src/tests/lib/core/vault/exit.service.test.ts` (prompt wording assertions), `vault.service.switch-save.test.ts`.

## Risks / defaults

- Issue 26 has not landed (single-slot store), so the cancel clears the whole slot; the slot holds only this URL's action at that point.
- Cancel skips `drainPendingWrites()` too: nothing leaves the vault, so no barrier has to settle.
- The prompt names files by basename, same as the close prompt.
