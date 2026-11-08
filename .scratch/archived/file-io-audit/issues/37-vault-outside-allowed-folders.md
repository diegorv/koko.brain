# 37: A vault outside the two fs-scope folders half-works

**Status:** wontfix

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

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/083-vault-picked-outside-two-allowed-folders-refused.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
