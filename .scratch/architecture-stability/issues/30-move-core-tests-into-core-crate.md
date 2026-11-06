# 30 (deferred, follows 29): Move core tests into the core crate and drop the re-export shim

**What to build:**
- **Move tests.** Move the core-only integration tests to `src-tauri/crates/kokobrain-core/tests/`, rewriting `kokobrain_lib::` to `kokobrain_core::`:
  - fts_repo, history, search_*, semantic_*, utils_*, vault_*. `db_test` stays in the app: it imports `commands::db::{open_vault_db, close_vault_db}`
  - commands/vault_test.rs and commands/files_test.rs are modules of the `commands_test` binary, so they need new top-level test files in core
  - tests that call command functions directly (`history_test`, `semantic_commands_test`, `vault_file_ops_test`, `commands/vault_test`) need their function paths changed, not just the crate name
- **Keep in the app crate:** the debug, update_channel and error_monitoring tests stay in `src-tauri/tests/`.
- **Drop the shim.** Remove the `pub use` re-export, so app commands import from `kokobrain_core::` directly.
- **Optional CI job (ask first):** run `cargo test -p kokobrain-core` on ubuntu without the GTK/webkit apt step.

**Blocked by:** 29

**Status:** wontfix

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml`

**Source:** src-tauri/tests/, src-tauri/src/lib.rs, .github/workflows/ci.yml, docs/TESTING.md

- [ ] `grep -rn 'kokobrain_lib::\(vault\|db\|search\|semantic\|utils\|history\)' src-tauri` returns nothing
- [ ] `cargo test -p kokobrain-core` passes and compiles no `tauri*` crate
- [ ] `cargo test -- --list 2>/dev/null | grep -c ': test$'` equals the count from issue 29

## Notes

- **Size:** S-M.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/150-core-tests-live-core-crate-no-re.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
