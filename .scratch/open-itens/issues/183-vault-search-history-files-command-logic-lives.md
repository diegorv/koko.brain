# 183: Vault, search, history and files command logic lives in domain modules outside commands/

**Origin:** `audit-2026-11-05` Issue 148, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/architecture-stability/issues/28-move-command-logic-into-domain-modules.md` (audit 2026-11-05). Priority: later (refactor, deferred, feature) (bucket 5-later). Deferred architecture work. It waits for a second Rust consumer.

**Audit check:** not re-audited (deferred architecture work); carried over as it was.

**Owner decision (2026-11-06):** no second consumer yet; keep it deferred.

**What to build:** Move the non-command code into domain modules.

| From | What moves | To |
|---|---|---|
| `commands/vault.rs` | `*_inner`, `collect_v2_entries`, the body of the `scan_vault` command (`vault.rs:69` stays a command), `scan_dir`, `sort_nodes`, `natural_cmp`, `take_digits`, `read_file_mtime_secs`, `read_file_metadata`, `project_note_record`, `ensure_safe_write_path`, `FileNode`, `CachedScanResult` (`CmdTrace` traces command entry and exit, so it stays) | `vault/ops.rs` |
| `commands/search_index.rs` | `*_inner`, `IndexStats`, helpers | `search/index_service.rs` |
| `commands/history.rs` | `DiffLine` and the logic | `history.rs` |
| `commands/files.rs` | the `read_files_batch` body | `vault/files.rs` |

After the move:
- Commands become wrappers: borrow the state (`&*state`), call the domain function, emit.
- Update the `search_fts_inner` call site in semantic.
- Update the test imports.

**Blocked by:** none

**Status:** needs-info

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml`

**Source:** src-tauri/src/commands/{vault,search_index,history,files}.rs, tests/commands/{vault,files}_test.rs, tests/{history,search_fts,vault_*}_test.rs, ADR-0025

- [ ] Every `pub fn` under `src-tauri/src/commands/` carries `#[tauri::command]`, except `update_channel.rs:40` `endpoint_for_channel` (move it or exempt the file). Check it with a script: per file, the count of `pub (async )?fn` equals the count of `#[tauri::command]`
- [ ] `grep -rn 'crate::commands' src-tauri/src/{vault,db,search,semantic,utils,history.rs}` returns nothing
- [ ] A JSON key snapshot test for `FileNode`, `CachedScanResult`, `IndexStats`, `DiffLine` and `FileReadResult` (camelCase) passes before and after
- [ ] `cargo test -- --list 2>/dev/null | grep -c ': test$'` is the same before and after

## Notes

- **Size:** M.

## Comments

- 2026-11-06: migrated from `.scratch/architecture-stability/issues/28-move-command-logic-into-domain-modules.md` by audit 2026-11-05 without a re-check (deferred architecture work).
- 2026-11-06: owner answered in the 2026-11-06 survey: no second consumer yet; keep it deferred. Status stays needs-info.
