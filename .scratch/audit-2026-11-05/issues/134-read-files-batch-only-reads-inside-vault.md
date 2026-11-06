# 134: read_files_batch only reads inside the vault that is actually open

**Migrated from:** `.scratch/audit-2026-11-04/issues/05-open-vault-root-read-batch.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). Hardening against a compromised frontend. It starts the 05, 16, 18 confinement chain.

**Audit check at `5f8003d67`:** still_present (corner, low). src-tauri/src/commands/files.rs:24-84: read_files_batch takes the caller's vault_path, validate_vault_path at :31, per-path canonicalize at :37 and starts_with(&vault_root) at :49, then fs::read_to_string at :63. Doc comment at :19-20 still claims it prevents arbitrary reads from a compromised frontend. src-tauri/src/commands/db.rs:7-11 open_vault_db validates and opens without recording the root; close_vault_db :15-18 keeps no state. src-tauri/src/utils/fs.rs:59-67 validate_vault_path only canonicalizes and checks is_dir. No open-root accessor exists in src-tauri/src. Defence-in-depth only: exploiting it needs script execution in the webview, so no daily-use trigger.

**Stale in the text below:** Issue cites files.rs:23-61; the function now spans :24-84 (validate at :31, starts_with at :49, read at :63). utils/fs.rs validate_vault_path is now at :59-67, not :39-47 as the Notes say. Test file src-tauri/tests/commands/files_test.rs location should be checked against the current src-tauri/tests layout when implementing.

**What to build:** Rust records the canonical root of the open vault when open_vault_db succeeds (commands/db.rs:7-11) and clears it in close_vault_db. One accessor exposes it, either next to the connections in db/mod.rs or in a small managed state. read_files_batch (commands/files.rs:23-61) compares the canonicalized vault_path with that root and returns Err when they differ or when no vault is open, before reading anything. The per-path canonicalize + starts_with check stays. The two frontend callers (watcher-handler.service.ts:90, search.service.ts:26) already pass vaultStore.path, so the IPC shape and frontend do not change. Update the comment at files.rs:19-20 and add an amendment to ADR-0020 saying the root is now the open vault, not the caller's choice.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** Rust only: `cargo test --manifest-path src-tauri/Cargo.toml`.

- [ ] Failing test first in src-tauri/tests/commands/files_test.rs: open vault A (tempdir) through the open-vault path, write a secret file in a second tempdir, call read_files_batch(vault_path = secret dir, paths=[secret]) and assert it returns Err or content None. Fails today because the content comes back. Add the same assertion for vault_path='/'.
- [ ] read_files_batch with no vault open returns Err.
- [ ] read_files_batch for the open vault still reads files inside it. The existing 11 files_test cases open their tempdir vault first. Update them, do not delete or weaken them. A shared test lock serializes them because the open root is process-global inside the commands_test binary.
- [ ] The comparison uses canonical paths, so a root reached through a symlink (macOS /var vs /private/var) still matches.
- [ ] cargo test --manifest-path src-tauri/Cargo.toml passes.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 1 of the parallel plan.
- **Finding `read-files-batch-scope`:** real, medium. Root cause: The Rust side does not know which vault is open. read_files_batch accepts whatever root the caller sends, and validate_vault_path only checks that the root canonicalizes to a directory. So the starts_with guard keeps reads inside a root the attacker picked, which breaks the compromised-renderer threat model in ADR-0020. Exploiting it needs script execution in the webview first, so this is a defence-in-depth gap, not a remote exploit.
  Evidence: src-tauri/src/utils/fs.rs:39-47: validate_vault_path checks only canonicalize() and is_dir(). src-tauri/src/commands/files.rs:31 uses that result as vault_root, :49 checks canonical.starts_with(&vault_root), and :63 calls fs::read_to_string directly, so the plugin-fs scope in capabilities/default.json is never consulted. With vault_path='/' or the secret's own parent directory, every path passes. Nothing in src-tauri/src/db/mod.rs:36-99 or commands/db.rs:7-11 keeps the opened root. docs/adr/0020-path-security-absolute-canonicalize.md states the threat model as 'a compromised renderer process is the attacker', and files.rs:19-20 claims the check prevents arbitrary reads in that case. The sweep found the same caller-chosen-root pattern, with worse effects, in toggle_task_status (vault.rs:765/779, which writes any path), create_note/create_folder (vault.rs:983-1022; ensure_safe_write_path at :958-970 blocks only '..'), save_vault_cache, the model downloads, the scan_* commands, build_*_index and start_vault_watcher.
- Exploiting this needs script execution in the webview first (CSP has 'unsafe-eval'). This ticket only closes the read_files_batch hole and lays the primitive the other tickets reuse. A record set by open_vault_db is enough because initializeVault returns early when open_vault_db fails (app-lifecycle.service.ts:233-238). Teardown sends close_vault_db before init awaits open_vault_db, and both are sync main-thread commands, so they arrive in order.
- **Size:** S.

## Comments

- 2026-11-06: migrated from `.scratch/audit-2026-11-04/issues/05-open-vault-root-read-batch.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
