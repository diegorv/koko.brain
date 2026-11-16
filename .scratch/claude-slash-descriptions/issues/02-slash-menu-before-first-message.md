# 02: The slash menu works before the first message

**What to build:** Before any turn in the open vault, typing `/` lists the commands from Issue 01's CLI reply instead of "Slash commands load after the first message."

**Blocked by:** 01

**Files:** src/lib/features/claude-code/,src/tests/lib/features/claude-code/,help/documentation/07-sidebar-panels.md

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`

- [x] Failing tests first in the logic, store and panel tests.
- [x] With no `slashCommands` from an `Init` in the current chat state, the menu's names are the reply's row names minus the known terminal-only names.
- [x] Once an `Init` has arrived, the menu's names are `Init.slashCommands` as today (Rust already removes `terminal_slash_commands`, `stream.rs:141-150`), and that stays true after New chat.
- [x] Terminal-only names: the rows carry no flag for them (synthesis F10) and the frontend never receives `terminal_slash_commands`. The store learns them as the row names that an `Init`'s `slashCommands` lacks, keeps that set across `claudeStore.reset()` (it belongs to the CLI, not the vault), and hides it from the pre-`Init` list. Before any `Init` in this app session nothing is hidden. Tested: first vault shows them before its first turn; after a turn and a vault switch, the new vault's pre-`Init` list hides them.
- [x] With the reply pending or failed and no `Init`, the existing empty-state text shows.
- [x] The help page drops "The list loads with your first message."

## Notes

- Evidence: `research/synthesis.md` G4 (init names and row names are the same set in a neutral cwd, and the 4 terminal-only names are in both), F10. The one-shot reply never holds MCP rows (G5), so no filter for them.
- **Delivery:** onto `mvp-claude` (relay-lite base `mvp-claude`), then merged into `preview`; see `spec.md`.

## Comments

- 2026-11-16, branch `issue/02-slash-menu-before-first-message`: before any `Init`, the slash menu lists the one-shot reply's row names minus terminal-only names the store learned from an earlier `Init` (kept across `claudeStore.reset()`); after an `Init`, `Init.slashCommands` as before. Help page updated. Review round 1 APPROVED (one finding rejected with reason, one fixed: help text on a slow hook, c450b7fa1); round 2 APPROVED, no findings. Tests: `pnpm check` 0 errors; full suite at c450b7fa1 exit 0, 644 files, 17246 passed, 54 skipped, 0 failed.
