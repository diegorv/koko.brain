# 06: A vault switch asks before discarding tabs that failed to save

**Status:** resolved

Priority: P1 (data loss when a save keeps failing)

**What to build:** `switchVault` (src/lib/core/vault/vault.service.ts:15-22) ignores the failed paths returned by `saveAllDirtyTabs()` and opens the new vault. `initializeVault` ignores them again (app-lifecycle.service.ts:180) and calls `teardownVault()`, whose `resetEditor()` drops every tab. When a save keeps failing (read-only file, full disk, unplugged drive), the user sees only "Failed to save" toasts, and the unsaved text is destroyed on the switch. The window close already asks in the same case (tauri-listeners.service.ts:55-62).

Fix: in `switchVault`, when `saveAllDirtyTabs()` returns failed paths, ask "Failed to save: X. Switch anyway and lose unsaved changes?", with the same wording style as the close handler. On cancel, return without `vaultStore.open`. This covers the open dialog, recent vaults and deep links, which all go through `switchVault`. If issue 01 has already landed a shared `prepareForExit`, reuse its prompt helper; otherwise do not wait for it.

A cancel must also clear the pending deep-link action. `resolveAndDispatch` (src/lib/features/deep-link/deep-link.service.ts:163-166) calls `deepLinkStore.setPendingAction(action)` before `await switchVault(resolvedPath)`. After a cancel, `switchVault` returns without `vaultStore.open`, so the action stays in the single slot, and the next successful vault open runs it at step 8 of `initializeVault` (app-lifecycle.service.ts:502-505 -> `executePendingAction`, deep-link.service.ts:347-358) against `vaultStore.path`: a `new`, `daily` or `capture` meant for vault B writes into whatever vault opens next. Have `switchVault` return whether it opened the vault (`Promise<boolean>`), and have `resolveAndDispatch` call `deepLinkStore.consumePendingAction()` when it returns `false`. Today `teardownVault` empties the slot through `resetDeepLink()` (app-lifecycle.service.ts:641) before step 8 runs, which hides this; issue 26 removes or moves that reset, so this fix must not rely on it.

The existing test `vault.service.switch-save.test.ts` "switchVault still opens B when the save of a tab of A fails" pins the current behavior. This fix changes it, as approved with batch 1 on 2026-11-02: the test becomes "opens B only after the user agrees to discard".

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/core/vault/vault.service.ts:15-22, src/lib/app/lifecycle/app-lifecycle.service.ts:180-188, src/lib/core/editor/editor.service.ts:412-417, src/lib/app/tauri-listeners.service.ts:55-62

- [x] Failing test comes first. Move `.scratch/file-io-audit/repro/o01-quit-and-switch/vault-switch-failed-save.test.ts` under `src/tests/`
- [x] A failed save and a cancel at the prompt keep vault A open, with the dirty tab and its text
- [x] A failed save and an accept at the prompt switch to B (the current behavior, now explicit)
- [x] No prompt appears when every save succeeds
- [x] The existing switch-save test is updated as described above, and no other assertion is weakened
- [x] After a cancelled deep-link switch, `deepLinkStore.hasPending` is `false`. Tested in `src/tests/lib/features/deep-link/deep-link.service.test.ts` through the real `resolveAndDispatch` and `switchVault`, with `saveAllDirtyTabs` resolving a failed path and `ask` resolving `false`
- [x] After that cancel, the next vault open does not run the dropped action. Tested through the real `initializeVault` (app-lifecycle.service tests), not in deep-link.service.test.ts
- [x] Cross-reference with issue 26: if 26 has turned the pending slot into a per-vault queue, the cancel removes only that URL's queue entry

## Audit evidence

Source: file I/O audit, deep-dive group(s) o01-quit-and-switch (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: save-pipeline-6, cross-cutting-9, vault-lifecycle-6

**How a user hits it.** Needs a save that keeps failing (read-only or locked file, ACL, full disk, vault on an unplugged drive), then a vault switch through the open dialog, a recent vault or a deep link to another vault. Default settings. Less common but realistic. The user sees only 'Failed to save file.' toasts, never a prompt.

**Recoverable from.** The File History snapshot of the last successful save keeps the pre-failure bytes. The edits made after the failure are gone.

**Root cause.** src/lib/core/vault/vault.service.ts:19 ignores the failed paths returned by saveAllDirtyTabs() and calls vaultStore.open(); app-lifecycle.service.ts:180 ignores them again before teardownVault() -> resetEditor()

**Evidence.** vault.service.ts:18-22 switchVault drops the saveAllDirtyTabs() result. +layout.svelte:64-78 effect -> initializeVault. app-lifecycle.service.ts:180 safety-net save, result ignored; :188 teardownVault(); teardownVault calls resetEditor() unconditionally -> editor.service.ts:412-417 -> editor.store.svelte.ts:165-166 tabs=[]. The close handler prompts in the same case (tauri-listeners.service.ts:55-62). The existing test vault.service.switch-save.test.ts 'switchVault still opens B when the save of a tab of A fails' enshrines this and never checks the buffer. Sub-claim in vault-lifecycle-6 (truncation on disk) is not part of this bug; see refutation.

**Limits found while trying to refute.** Partly refuted: vault-lifecycle-6's claim that the failed write left the note truncated on disk. Fetched fs-v2.7.1 plugins/fs/src/commands.rs:1125-1185: write_text_file opens with truncate:true and then writes, so the write is non-atomic. But permission, read-only and missing-folder errors fail at open, before truncation, so the file stays intact. With a full disk the truncation frees the old blocks first, so only a larger new write ends partial. It also happens on the failing autosave whether or not the user switches vault. It belongs to the non-atomic-write finding, not to this bug.

**Repro test.** `.scratch/file-io-audit/repro/o01-quit-and-switch/vault-switch-failed-save.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
FAIL > does not leave vault A when a dirty tab failed to save and the user did not agree to discard it: AssertionError: expected '/vaults/B' to be '/vaults/A' (vault-switch-failed-save.test.ts:87). FAIL > the unsaved text survives the full switch chain (switchVault -> initializeVault safety net -> teardownVault): AssertionError: unsaved text must survive in a tab or on disk: expected false to be true. Both use the real switchVault, saveAllDirtyTabs and teardownVault with real stores; only @tauri-apps/* and svelte-sonner are mocked.
```

**Fix sketch.** In switchVault: const failed = await saveAllDirtyTabs(); if failed.length, ask('Failed to save: X. Switch anyway and lose unsaved changes?') and return without vaultStore.open on cancel. This covers the dialog, recent-vault and deep-link callers. Update the existing switch-save test.

## Audit evidence (editor-data-safety, 2026-11-02)

Finding F151 (P0, rare): a vault switch silently discards dirty tabs whose save failed (`resetEditor` wipes them with no prompt). Report: `.scratch/editor-data-safety/audit-2026-11-02.md`; cross-reference: `.scratch/editor-data-safety/xref-file-io-audit.md` (F151). Same scenario and fix as this issue; the one gap was the pending deep-link action a cancel leaves behind, added above.

**Repro test.** `.scratch/editor-data-safety/repro/quit-and-vault-switch/f151-vault-switch-failed-save.test.ts` (copy to `src/tests/audit-repro/quit-and-vault-switch/` to run, see the repro README). 'does not silently drop the unsaved content of a tab that could not be saved' fails on line 255 (no tab holds the typed text after `switchVault` + `initializeVault(B)`), with real `switchVault`, `initializeVault`, `saveAllDirtyTabs` and stores and `writeTextFile` rejecting `EACCES`. Its sanity block (lines 245-250: `vaultStore.path` is B, `ask` not called) records the pre-fix flow; if this file is moved into `src/tests/` as well, that block changes with the fix, the same way as the pinned switch-save test.

**Code path verified on the current tree.**
- src/lib/core/vault/vault.service.ts:18-22 `switchVault` awaits `saveAllDirtyTabs()`, drops the returned failed paths, and calls `vaultStore.open(path)`; it returns `Promise<void>`. Callers: `openVaultDialog` (:28), `openRecentVault` (:50), `resolveAndDispatch` (deep-link.service.ts:166).
- src/lib/core/editor/editor.service.ts:238-251 `saveAllDirtyTabs` returns the paths whose `saveFileByPath` returned `false`.
- src/lib/app/lifecycle/app-lifecycle.service.ts:180 safety-net `saveAllDirtyTabs()` with the result ignored, then `teardownVault()` at :188, which calls `resetEditor()` (editor.service.ts:416-421, `editorStore.reset()` empties the tabs).
- src/lib/features/deep-link/deep-link.service.ts:163-166 `setPendingAction(action)` runs before `await switchVault(resolvedPath)`; :347-358 `executePendingAction` consumes the slot and runs it against `vaultStore.path`, not `action.vault`; it is called at step 8 of `initializeVault` (app-lifecycle.service.ts:502-505).
- src/lib/features/deep-link/deep-link.store.svelte.ts:18-20 single-slot `setPendingAction`, :26-30 `consumePendingAction`.
- src/lib/app/lifecycle/app-lifecycle.service.ts:641 `resetDeepLink()` inside `teardownVault` currently clears a stale action before the next open reaches step 8, so the cancelled-switch leak is latent until issue 26 changes that reset; the `hasPending` assertion in the checklist fails on a fix that only adds the prompt.

## Comments

- 2026-11-02, branch `issue/06-vault-switch-after-failed-save`: `switchVault` now asks before discarding tabs whose save failed (cancel keeps vault A and the dirty tab); a cancelled deep-link switch drops its pending action. Review fixes: reflowed the safety-net comment in `app-lifecycle.service.ts`, clarified a test title in `vault-switch-failed-save.test.ts`. Tests: `pnpm check` 0 errors; full suite at e5fdc8fe exit=0 (425 files, 9893 passed, 1 skipped, 1 todo), build OK. Reviews: round 1 APPROVED, round 2 APPROVED (no findings).
