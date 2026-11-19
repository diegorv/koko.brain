# Discovery: Issue 02, the slash menu works before the first message

Builds on `work/01` (rows from `claude_slash_commands` reach `claudeStore.setSlashCommandRows`). The service, Rust and listener do not change.

## Files that change

- `src/lib/features/claude-code/claude.logic.ts:371-401`: two pure functions next to `slashCommandDetails`:
  - `terminalOnlySlashNames(rows, initNames)`: the row names whose row is in no `Init` name, by its name or one of its aliases.
  - `slashMenuCommands(initNames, rows, terminalOnly)`: `initNames` when not empty, else the row names minus `terminalOnly`, in row order.
- `src/lib/features/claude-code/claude.store.svelte.ts`: keep the rows (`$state.raw`, cleared by `reset()`, kept by New chat) and the terminal-only set (`$state.raw`, NOT cleared by `reset()`). Learn the set when the chat's `slashCommands` change (in `receive` and `startRun`, compared by reference so streaming deltas cost nothing) and in `setSlashCommandRows`, whenever both the rows and an `Init`'s names are present. New getter `slashMenuCommands`. Test-only `_reset()` (repo convention, `vault.store.svelte.ts:150`) also clears the set, so each test starts as a fresh app session.
- `src/lib/features/claude-code/ClaudePanel.svelte:71,485`: filter `claudeStore.slashMenuCommands`; the empty text keys on it, so a pending or failed reply with no `Init` still says "Slash commands load after the first message."
- `help/documentation/07-sidebar-panels.md:157`: drop "The list loads with your first message."

## Tests (failing first)

- `claude.logic.test.ts` (prior art `:570-610`): both new functions, alias case, empty inputs.
- `claude.store.test.ts` (prior art `:19-40`): pre-Init list from rows; nothing hidden before any Init; Init wins and stays after New chat; set learned from Init-then-rows and rows-then-Init; set survives `reset()`; `_reset()` clears it.
- `ClaudePanel.test.ts:630-640`: the first test becomes "pending" and "failed" reply cases (rows never arrive); new: rows listed with descriptions before the first turn; after a turn whose Init lacks a row and a vault switch (`resetClaude()` + `vaultStore.open('/other')` + remount, as `:826-852`), the new vault's pre-Init list hides it. `beforeEach` calls `claudeStore._reset()`.

## Defaults taken

- A row counts as present in an `Init` by its name or any alias: an `Init` names a skill by its internal name, an alias when its frontmatter `name` differs (spec "What the CLI gives"). Matching on names only would hide such a skill in the next vault.
- Each learning replaces the set (latest `Init` against the latest rows); no accumulation.
- `Init` with an empty `slashCommands` counts as no `Init` (the menu uses the rows).

## Risks

- The set is module state that outlives `reset()`: tests that seed an Init against `SLASH_ROWS` would leak hidden names into later tests without `_reset()` in `beforeEach`.
- Rows learned after an `Init` from a later fetch may hold a skill added in between; it is hidden pre-Init in the next vault until a later `Init` relearns. Rare and recoverable.
