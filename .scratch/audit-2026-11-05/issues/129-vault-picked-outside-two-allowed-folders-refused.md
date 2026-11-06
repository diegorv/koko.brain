# 129: A vault picked outside the two allowed folders is refused or warned about, never half-working

**Migrated from:** `.scratch/file-io-audit/issues/37-vault-outside-allowed-folders.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). The owner's vault is inside an allowed root, so this needs an unusual vault location. The fix is a UX choice.

**Audit check at `5f8003d67`:** still_present (ux, low). openVaultDialog calls open({ directory: true, multiple: false }) at src/lib/core/vault/vault.service.ts:31, and switchVault (:22-27) does no scope check. The static fs scope in src-tauri/capabilities/default.json lists only $DOCUMENT/kokobrain-vaults/** and $HOME/kokobrain-vaults/** (for example lines 40-61 and 69-78). rg finds no allowDirectory or allow_directory call and no persisted-scope plugin in src, src-tauri/src or src-tauri/Cargo.toml. scan_vault bypasses the ACL with std::fs::read_dir (src-tauri/src/commands/vault.rs:139), and ensure_safe_write_path (vault.rs:958-970) checks only that the path is absolute and has no '..'. The onboarding copy at src/routes/(app)/+page.svelte:44 lists the allowed locations, but Open Vault never enforces them. Likelihood is low for this owner: the owner set these locations (c887921c7) and the screen shows them, so the real vault very likely lives there. The failure is no data loss, only a half-working vault.

**Stale in the text below:** Line refs drifted: open() is vault.service.ts:31 (Issue says :26), scan read_dir is vault.rs:139 (Issue says :96), ensure_safe_write_path is vault.rs:958-970 (Issue says :862-874), and the link-updater failure log is link-updater.service.ts:75-79 (Issue says :55-59). The dialog plugin's non-recursive grant was not re-verified (it is outside the repo). The likely fix is UX: refuse or warn when the picked folder is outside the allowed scope.

**Owner decision needed:** For a vault picked outside ~/Documents/kokobrain-vaults and ~/kokobrain-vaults: refuse to open it with a message naming the allowed folders, or open it with a warning that some features fail?

**Status:** needs-info

**Blocked by:** none
Priority: P2
Severity: stale-state
Source: file I/O audit, deep-dive group(s) h07-paths-canvas-automove (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TRACE (deep dive priority P2, severity stale-state)
- Claims covered: rust-writes-4

**How a user hits it.** Normal use: Open Vault (routes/(app)/+page.svelte:12-14,31) accepts any folder via vault.service.ts:26. Subfolder notes fail to open, Ctrl-N in a subfolder creates a file then fails to open it, root-note rename leaves subfolder backlinks unchanged with only a logged error (link-updater.service.ts:55-59). After restart the dialog grant is gone (no persisted-scope plugin in Cargo.toml), so reads of root notes are also denied.

**Recoverable from.** No content loss found: reads fail before any tab exists, so no stale write overwrites content. Nothing to recover because nothing was lost.

**Root cause.** src/lib/core/vault/vault.service.ts:26 open({directory:true}) with no recursive flag; the dialog plugin grants the folder non-recursively (fetched plugins-workspace plugins/dialog/src/commands.rs: allow_directory(&path, options.recursive)), and tauri scope/fs.rs allow_directory(recursive=false) pushes only 'dir' and 'dir/*'. Static capabilities/default.json allows only $DOCUMENT|$HOME/kokobrain-vaults.

**Evidence.** Subfolder readTextFile fails on the dir/* scope (fetched tauri scope/fs.rs); editor open path and link-updater.service.ts:35,39 use plugin-fs; createFile readDir allowed for direct children only (fs.service.ts:119-130). Rust bypasses the ACL: scan_vault std::fs read_dir (commands/vault.rs:96) and create_note via ensure_safe_write_path only checks '..' (commands/vault.rs:862-874). Onboarding copy (+page.svelte:44) states limits nothing enforces.

## Acceptance criteria

Written by audit 2026-11-05 from the text above and its audit header; the original Issue had none.

- [ ] Failing test first, in src/tests/lib/core/vault/vault.logic.test.ts: a new pure check (name it in the test, for example isVaultPathAllowed) returns true for '<home>/kokobrain-vaults/work', '<documents>/kokobrain-vaults' and a nested folder under both, and false for '<home>/Projects/notes', '<home>/kokobrain-vaults-other' and '<home>/Documents/notes' (prefix lookalikes must not pass). It fails today because no check exists.
- [ ] Failing test first, in src/tests/lib/core/vault/vault.service.test.ts (describe 'openVaultDialog'): when the dialog resolves to a folder outside both allowed roots, the behavior chosen by the owner decision below happens, and a folder inside them opens as today. Refuse branch: switchVault is not called, vaultStore.path is unchanged and a toast names both allowed folders. Warn branch: switchVault is called and a toast warns that some features will fail, naming both folders. It fails today because openVaultDialog (vault.service.ts:31) passes any folder to switchVault.
- [ ] Cancelling the dialog and opening an allowed folder keep working as in the existing openVaultDialog and openRecentVault tests, which pass without edits.
- [ ] The Rust side (scan_vault, ensure_safe_write_path) and the capability scope in src-tauri/capabilities/default.json are not changed.
- [ ] Frontend gate: pnpm check + pnpm vitest run pass.
- [ ] Owner decision recorded in the Issue Notes: for a vault picked outside ~/Documents/kokobrain-vaults and ~/kokobrain-vaults, refuse to open it with a message naming the allowed folders, or open it with a warning that some features fail.

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/37-vault-outside-allowed-folders.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
