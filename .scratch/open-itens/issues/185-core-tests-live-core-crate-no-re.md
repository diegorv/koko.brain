# 185: Core tests live in the core crate, with no re-export shim

**Origin:** `audit-2026-11-05` Issue 150, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/architecture-stability/issues/30-move-core-tests-into-core-crate.md` (audit 2026-11-05). Priority: later (refactor, deferred, feature) (bucket 5-later). Deferred. It follows 29.

**Audit check:** not re-audited (deferred architecture work); carried over as it was.

**Owner decision (2026-11-06):** no second consumer yet; keep it deferred.

**What to build:**
- **Move tests.** Move the core-only integration tests to `src-tauri/crates/kokobrain-core/tests/`, rewriting `kokobrain_lib::` to `kokobrain_core::`:
  - fts_repo, history, search_*, semantic_*, utils_*, vault_*. `db_test` stays in the app: it imports `commands::db::{open_vault_db, close_vault_db}`
  - commands/vault_test.rs and commands/files_test.rs are modules of the `commands_test` binary, so they need new top-level test files in core
  - tests that call command functions directly (`history_test`, `semantic_commands_test`, `vault_file_ops_test`, `commands/vault_test`) need their function paths changed, not just the crate name
- **Keep in the app crate:** the debug, update_channel and error_monitoring tests stay in `src-tauri/tests/`.
- **Drop the shim.** Remove the `pub use` re-export, so app commands import from `kokobrain_core::` directly.
- **Optional CI job (ask first):** run `cargo test -p kokobrain-core` on ubuntu without the GTK/webkit apt step.

**Blocked by:** 184

**Status:** needs-info

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml`

**Source:** src-tauri/tests/, src-tauri/src/lib.rs, .github/workflows/ci.yml, docs/TESTING.md

- [ ] `grep -rn 'kokobrain_lib::\(vault\|db\|search\|semantic\|utils\|history\)' src-tauri` returns nothing
- [ ] `cargo test -p kokobrain-core` passes and compiles no `tauri*` crate
- [ ] `cargo test -- --list 2>/dev/null | grep -c ': test$'` equals the count from issue 29

## Notes

- **Size:** S-M.

## Comments

- 2026-11-06: migrated from `.scratch/archived/architecture-stability/issues/30-move-core-tests-into-core-crate.md` by audit 2026-11-05 without a re-check (deferred architecture work).
- 2026-11-06: owner answered in the 2026-11-06 survey: no second consumer yet; keep it deferred. Status stays needs-info.
