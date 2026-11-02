# 06 A vault switch after a failed save wipes the dirty buffer with no prompt

Status: needs-triage
Priority: P1
Severity: data-loss
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
