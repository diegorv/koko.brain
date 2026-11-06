# 27: Remove `get_tasks_in_section_v2` and its disk re-read

**What to build:** After Issue 12 the Tasks view runs the heading rule in TS over the entries snapshot, and nothing in `src/lib` calls `get_tasks_in_section_v2`. The command still re-reads every task note from disk (`src-tauri/src/commands/vault.rs:736-753`) and keeps a second, case-sensitive heading rule alive in Rust (`parsing.rs:1700-1750`). Remove it (PRD decision B6 (a), "IPC changes").

- Before removing anything, trace every caller (CLAUDE.md "Removing or Refactoring Code") and confirm Issue 12 left none in `src/lib`.
- Remove `get_tasks_in_section_v2` (`commands/vault.rs:737-753`, with its doc comment above) and the helpers only it uses (`extract_tasks_from_section`, `section_task_candidates`, `tasks_in_section`; trace each), its `src/lib/contracts/commands.ts` entries (`:82`, `:227`) and its `invoke_handler` registration (`src-tauri/src/lib.rs:347`).
- Remove the e2e mock handler (`e2e/mocks/tauri-core.ts:152-154` and its table entry at `:450`, `e2e/mocks/vault-index.ts:478-484`).
- The Rust tests that pin the removed helpers go with them, on purpose: `parsing.rs:3040-3082` (`extract_tasks_from_section_*`), `src-tauri/tests/commands/vault_test.rs:1058` (`tasks_in_section_reads_only_notes_with_tasks`) and its import at `:7`.
- The comment at `src/lib/app/lifecycle/app-lifecycle.service.ts:398` names the removed command; correct it.
- Update `docs/agents/indexing-watcher-rules.md` rule 1, which lists the command.

**Blocked by:** 12

**Status:** needs-info

**Waits on:** PRD decision B6 (inherited from Issue 12).

**Gate:** both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the e2e mock changes. Run cargo from the checkout or worktree root.

- [ ] Failing check first: `grep -rn get_tasks_in_section src src-tauri/src e2e docs/agents` lists the sites above before the change and nothing after it.
- [ ] `cargo test` passes with the removed tests gone and no other test changed.
- [ ] `ipc-mirrors.test.ts` and the typed command map (`contracts/commands.ts`) still pass `pnpm check`.
- [ ] The e2e Tasks spec still passes.

## Notes

- **Size:** S. Split out of Issue 12 so the fetch move and the Rust removal each fit one run.
