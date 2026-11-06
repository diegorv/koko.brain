# 28 (deferred until a second Rust consumer exists): Move vault/search/history/files command logic out of commands/

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

**Status:** wontfix

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml`

**Source:** src-tauri/src/commands/{vault,search_index,history,files}.rs, tests/commands/{vault,files}_test.rs, tests/{history,search_fts,vault_*}_test.rs, ADR-0025

- [ ] Every `pub fn` under `src-tauri/src/commands/` carries `#[tauri::command]`, except `update_channel.rs:40` `endpoint_for_channel` (move it or exempt the file). Check it with a script: per file, the count of `pub (async )?fn` equals the count of `#[tauri::command]`
- [ ] `grep -rn 'crate::commands' src-tauri/src/{vault,db,search,semantic,utils,history.rs}` returns nothing
- [ ] A JSON key snapshot test for `FileNode`, `CachedScanResult`, `IndexStats`, `DiffLine` and `FileReadResult` (camelCase) passes before and after
- [ ] `cargo test -- --list 2>/dev/null | grep -c ': test$'` is the same before and after

## Notes

- **Size:** M.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/148-vault-search-history-files-command-logic-lives.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
