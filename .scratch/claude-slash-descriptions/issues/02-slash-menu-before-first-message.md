# 02: The slash menu works before the first message

**What to build:** Before any turn in the open vault, typing `/` lists the commands from Issue 01's CLI reply instead of "Slash commands load after the first message."

**Blocked by:** 01

**Files:** src/lib/features/claude-code/,src/tests/lib/features/claude-code/,help/documentation/07-sidebar-panels.md

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing tests first in the logic, store and panel tests.
- [ ] With no `slashCommands` from an `Init` in the current chat state, the menu's names are the reply's row names minus the known terminal-only names.
- [ ] Once an `Init` has arrived, the menu's names are `Init.slashCommands` as today (Rust already removes `terminal_slash_commands`, `stream.rs:141-150`), and that stays true after New chat.
- [ ] Terminal-only names: the rows carry no flag for them (synthesis F10) and the frontend never receives `terminal_slash_commands`. The store learns them as the row names that an `Init`'s `slashCommands` lacks, keeps that set across `claudeStore.reset()` (it belongs to the CLI, not the vault), and hides it from the pre-`Init` list. Before any `Init` in this app session nothing is hidden. Tested: first vault shows them before its first turn; after a turn and a vault switch, the new vault's pre-`Init` list hides them.
- [ ] With the reply pending or failed and no `Init`, the existing empty-state text shows.
- [ ] The help page drops "The list loads with your first message."

## Notes

- Evidence: `research/synthesis.md` G4 (init names and row names are the same set in a neutral cwd, and the 4 terminal-only names are in both), F10. The one-shot reply never holds MCP rows (G5), so no filter for them.
- **Delivery:** as Issue 01 (after PR #247 merges, or with the relay base set to `mvp-claude`).

## Comments
