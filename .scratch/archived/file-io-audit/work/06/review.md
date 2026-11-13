VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test comes first. Move `.scratch/file-io-audit/repro/o01-quit-and-switch/vault-switch-failed-save.test.ts` under `src/tests/` — `git diff main...HEAD -M --summary` shows a rename (73%) to `src/tests/lib/core/vault/vault-switch-failed-save.test.ts`, done in 6afc4d8d together with the fix. Probe: with `switchVault` restored to the main body (`await saveAllDirtyTabs();`), both of its tests fail.
- [met] A failed save and a cancel at the prompt keep vault A open, with the dirty tab and its text — `vault.service.switch-save.test.ts` "switchVault stays in A, with the dirty tab, when the user cancels..." checks the return is `false`, the path is A, `content` is 'edited in A', `savedContent` is 'old', and there is no drain. The moved repro checks the prompt text, `opened === false`, path A and the EDIT text still in a tab. The `it.each` covers `openVaultDialog` and `openRecentVault`. `vault.service.ts:22-23` returns before `drainPendingWrites` and `vaultStore.open`.
- [met] A failed save and an accept at the prompt switch to B (the current behavior, now explicit) — "switchVault opens B only after the user agrees to discard..." mocks `ask` as true and checks one `ask` call with the exact text "Failed to save: note.md. Switch anyway and lose unsaved changes?", returns true, drains A, and leaves the path at B.
- [met] No prompt appears when every save succeeds — the three success tests in `vault.service.switch-save.test.ts` (dirty tab saved, deep link, no dirty tab) now check `expect(ask).not.toHaveBeenCalled()`. `confirmDiscardFailedSaves` returns true early on an empty list (`exit.service.ts:33`).
- [met] The existing switch-save test is updated as described above, and no other assertion is weakened — the pinned test is renamed to "opens B only after the user agrees to discard..." and keeps all of its assertions (`save_snapshot` empty, `savedContent` 'old', path B). It gains the `ask` and trace checks. The other tests only gain assertions. In the moved repro, "in a tab or on disk" is narrowed to "in a tab" (stricter). The chain is now conditional on a path change, which matches the `+layout` effect, and it still fails without the fix (probe above).
- [met] After a cancelled deep-link switch, `deepLinkStore.hasPending` is `false`. Tested in `src/tests/lib/features/deep-link/deep-link.service.test.ts` through the real `resolveAndDispatch` and `switchVault`, with `saveAllDirtyTabs` resolving a failed path and `ask` resolving `false` — test "drops the pending action when the switch is cancelled at the discard prompt" (deep-link.service.test.ts:236-247). `vault.service` is not mocked in that file; `saveAllDirtyTabs` is mocked with a failed path and `ask` returns false. Probe: with deep-link.service.ts reverted to main, it fails with "expected true to be false".
- [met] After that cancel, the next vault open does not run the dropped action. Tested through the real `initializeVault` (app-lifecycle.service tests), not in deep-link.service.test.ts — app-lifecycle.service.test.ts "initializeVault after a cancelled deep-link vault switch" uses the real `resolveAndDispatch`, `switchVault` and `initializeVault('/vaults/C')`. It calls `teardownVault()` first, so `resetDeepLink()` cannot hide the leak. Probe: with the deep-link fix reverted, it fails ("openFileInEditor ... called 1 times").
- [met] Cross-reference with issue 26: if 26 has turned the pending slot into a per-vault queue, the cancel removes only that URL's queue entry — Issue 26 is still `needs-triage`. `deep-link.store.svelte.ts` is still a single slot, and `resetDeepLink()` is still at app-lifecycle.service.ts:642, so clearing the whole slot is correct. The success path still keeps the action (deep-link.service.test.ts:229).

## Checks run by the reviewer

- `pnpm check`: exit 0, 212 files, 0 errors, 0 warnings.
- `vitest run` over src/tests/lib/core/vault, src/tests/lib/app, src/tests/lib/features/deep-link, src/tests/lib/features/event-calendar and src/tests/lib/architecture: exit 0, 62 files, 1820 tests passed. My test verdict rests on these files, especially `vault-switch-failed-save.test.ts`, `vault.service.switch-save.test.ts`, `vault.service.test.ts`, `exit.service.test.ts` (close prompt text unchanged), `tauri-listeners.service.test.ts`, `deep-link.service.test.ts`, `app-lifecycle.service.test.ts` and `layer-rules.test.ts`.
- Revert probes (restored with `git checkout`; the worktree is clean afterwards):
  - Revert the `switchVault` prompt: 6 tests fail in the repro and switch-save files.
  - Revert the deep-link consume: the deep-link and app-lifecycle tests fail.
- `vaultStore.open(` has a single caller (`vault.service.ts:25`), so the prompt covers every way to switch vault.
- No layer-baseline entry and no composition root are added.
- The full suite and `pnpm build` are deliver's to run.

## Findings

1. nit — src/lib/app/lifecycle/app-lifecycle.service.ts:176-177: the edited comment leaves a short line ("prompt. This retry runs") before the old wrapped text. Fix: reflow the paragraph.
2. nit — src/tests/lib/core/vault/vault-switch-failed-save.test.ts:91-104: with the fix in place, the `if (vaultStore.path !== VAULT_A)` branch never runs, so this test now checks the same thing as the first test (tab text kept after a cancel). It is still a valid regression guard: it fails when the fix is reverted. Fix (optional): note in the title that the chain runs only when the switch went through, or leave it as is.

## Resolution

1. Fixed: the safety-net comment in `app-lifecycle.service.ts` is reflowed into one paragraph.
2. Fixed: the test title now says the `initializeVault` safety net and `teardownVault` run only if the switch went through.
