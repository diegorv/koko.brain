# 136: Vault-root commands (scan, index builds, watcher, model init) only accept the open vault

**Migrated from:** `.scratch/audit-2026-11-04/issues/18-confine-vault-root-commands.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). Hardening. It is blocked by 16.

**Audit check at `5f8003d67`:** still_present (corner, low). Rust still does not know the open vault root: src-tauri/src/db/mod.rs:17-27 hold only Connection slots, and rg finds no open-root accessor. scan_vault_inner validates only the given path (src-tauri/src/commands/vault.rs:125-132); scan_vault_v2 / scan_vault_v2_cached at vault.rs:1233-1260 and :1320-1382 use canonical_vault_root; build_search_index_inner at src-tauri/src/commands/search_index.rs:57-59; start_vault_watcher (src-tauri/src/commands/watcher.rs:12-23) passes path straight to replace_watcher; init_semantic_search (src-tauri/src/commands/semantic.rs:371), is_semantic_model_available (:399), is_reranker_model_available (:406), build_semantic_index (:483) take the path as given. Blocker 16 (and 05) is still todo in .scratch/audit-2026-11-04/ledger.md. Defence in depth against a compromised renderer, not a daily-use failure.

**Stale in the text below:** Line numbers moved: scan_vault_v2 is now vault.rs:1233-1260 (Issue says :1192-1206), scan_vault_v2_cached :1320-1382 (Issue says :1280-1293), init_semantic_search starts at semantic.rs:371. Still blocked by 16, which is not delivered.

**What to build:** Commands that take a vault root and read or index under it return Err when the canonical root differs from the open vault: scan_vault (vault.rs:114-132), scan_vault_v2 (:1192-1206), scan_vault_v2_cached (:1280-1293), build_search_index (search_index.rs:38-59), build_semantic_index (semantic.rs:483), start_vault_watcher (commands/watcher.rs:11-24), init_semantic_search (semantic.rs:370-395), is_semantic_model_available/is_reranker_model_available (:398-409), plus the vault_path arguments of update_search_index_file and update_semantic_file. Today none of them can be pointed at an arbitrary directory and have its content returned through the index, the FTS tables or the vault-files-changed events. After this, none can.

**Blocked by:** 135

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** Rust only: `cargo test --manifest-path src-tauri/Cargo.toml`.

- [ ] Failing test first in src-tauri/tests (vault_index_test.rs or commands/vault_test.rs): with vault A open, scan_vault_v2 / scan_vault_v2_cached_inner on another tempdir holding a .md file returns Err, and the VaultIndex holds none of that dir's entries. Fails today.
- [ ] build_search_index_inner for a root other than the open vault returns Err and writes no FTS rows.
- [ ] start_vault_watcher for a root other than the open vault returns Err.
- [ ] The normal initializeVault order (open_vault_db at :234 before buildIndex at :318 and startWatching at :504) still works. Existing scan/index tests open the vault first.
- [ ] cargo test passes.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 3 of the parallel plan.
- **Finding `read-files-batch-scope`:** real, medium. Root cause: The Rust side does not know which vault is open. read_files_batch accepts whatever root the caller sends, and validate_vault_path only checks that the root canonicalizes to a directory. So the starts_with guard keeps reads inside a root the attacker picked, which breaks the compromised-renderer threat model in ADR-0020. Exploiting it needs script execution in the webview first, so this is a defence-in-depth gap, not a remote exploit.
  Evidence: src-tauri/src/utils/fs.rs:39-47: validate_vault_path checks only canonicalize() and is_dir(). src-tauri/src/commands/files.rs:31 uses that result as vault_root, :49 checks canonical.starts_with(&vault_root), and :63 calls fs::read_to_string directly, so the plugin-fs scope in capabilities/default.json is never consulted. With vault_path='/' or the secret's own parent directory, every path passes. Nothing in src-tauri/src/db/mod.rs:36-99 or commands/db.rs:7-11 keeps the opened root. docs/adr/0020-path-security-absolute-canonicalize.md states the threat model as 'a compromised renderer process is the attacker', and files.rs:19-20 claims the check prevents arbitrary reads in that case. The sweep found the same caller-chosen-root pattern, with worse effects, in toggle_task_status (vault.rs:765/779, which writes any path), create_note/create_folder (vault.rs:983-1022; ensure_safe_write_path at :958-970 blocks only '..'), save_vault_cache, the model downloads, the scan_* commands, build_*_index and start_vault_watcher.
- **Blocking edge:** Both tickets edit commands/vault.rs and reuse the open-root accessor from Issue 05.
- Check every TS caller of scan_vault (file tree, folder pickers, templates) for one that runs before open_vault_db or on a non-vault folder. If one exists, stop and ask. This also gives the unreachable stale-scan race (scan-stale-vault, not-real) a Rust-side entry check, but not a mid-scan one. The asset-protocol scope being wider than the vault roots (tauri.conf.json, 'kokobrain-vault' singular vs capabilities 'kokobrain-vaults') is a separate hardening item, left out of this ticket.
- **Size:** M.

## Comments

- 2026-11-06: migrated from `.scratch/audit-2026-11-04/issues/18-confine-vault-root-commands.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
