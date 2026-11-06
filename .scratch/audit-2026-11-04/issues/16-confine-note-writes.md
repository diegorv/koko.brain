# 16: Note-writing commands refuse paths outside the open vault

**What to build:** Every Rust command that writes or rewrites a file at a caller-supplied path rejects a path whose canonical form (canonical parent, for a file that does not exist yet) is not inside the open vault root. Sites from the sweep: toggle_task_status (vault.rs:765/779), create_note (vault.rs:983-1010), create_folder (vault.rs:1017-1022), update_note_in_index, so that propagate_type_rename (vault.rs:407-420) cannot rewrite a planted outside path, save_vault_cache (vault.rs:1516-1534; path must equal the open root), download_semantic_model/download_reranker_model (semantic.rs:422-480), and the quick_capture write/remove commands (quick_capture/commands.rs:209-245). Fix ensure_safe_write_path (vault.rs:949-970) so it does confine to the vault, as its comment claims, or correct the comment.

**Blocked by:** 05

**Status:** wontfix

**Gate:** Rust only: `cargo test --manifest-path src-tauri/Cargo.toml`.

- [ ] Failing test first in src-tauri/tests (vault_task_test.rs or vault_file_ops_test.rs): with vault A open, toggle_task_status on a markdown file with '- [ ] x' in another tempdir returns Err, and the file bytes are unchanged on disk. Fails today because the file is rewritten.
- [ ] create_note and create_folder targeting a path outside the open vault return Err and create nothing on disk.
- [ ] update_note_in_index for a path outside the open vault is refused, and propagate_type_rename does not touch an outside file.
- [ ] save_vault_cache for a path other than the open root returns Err and writes no .kokobrain directory there.
- [ ] Existing happy-path tests still pass with a vault opened first. cargo test passes.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 2 of the parallel plan.
- **Finding `read-files-batch-scope`:** real, medium. Root cause: The Rust side does not know which vault is open. read_files_batch accepts whatever root the caller sends, and validate_vault_path only checks that the root canonicalizes to a directory. So the starts_with guard keeps reads inside a root the attacker picked, which breaks the compromised-renderer threat model in ADR-0020. Exploiting it needs script execution in the webview first, so this is a defence-in-depth gap, not a remote exploit.
  Evidence: src-tauri/src/utils/fs.rs:39-47: validate_vault_path checks only canonicalize() and is_dir(). src-tauri/src/commands/files.rs:31 uses that result as vault_root, :49 checks canonical.starts_with(&vault_root), and :63 calls fs::read_to_string directly, so the plugin-fs scope in capabilities/default.json is never consulted. With vault_path='/' or the secret's own parent directory, every path passes. Nothing in src-tauri/src/db/mod.rs:36-99 or commands/db.rs:7-11 keeps the opened root. docs/adr/0020-path-security-absolute-canonicalize.md states the threat model as 'a compromised renderer process is the attacker', and files.rs:19-20 claims the check prevents arbitrary reads in that case. The sweep found the same caller-chosen-root pattern, with worse effects, in toggle_task_status (vault.rs:765/779, which writes any path), create_note/create_folder (vault.rs:983-1022; ensure_safe_write_path at :958-970 blocks only '..'), save_vault_cache, the model downloads, the scan_* commands, build_*_index and start_vault_watcher.
- **Blocking edge:** Reuses the open-root accessor from Issue 05.
- Before adding a check, trace every frontend caller of each command. If any legit caller writes outside the open vault (for example a quick-capture target vault other than the open one), stop and ask the owner. teardownVault sends save_vault_cache(indexedVaultPath) before close_vault_db (app-lifecycle.service.ts:591-608), so the root still matches at that point. Keep that order.
- **Size:** M.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/135-note-writing-commands-refuse-paths-outside-open.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
