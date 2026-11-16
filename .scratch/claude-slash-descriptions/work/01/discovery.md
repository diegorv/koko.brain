# Discovery: Issue 01, the slash menu shows each command's description

## Files that change

- `src-tauri/src/commands/claude/slash.rs` (new): `SlashCommandInfo` (`#[ts(export)]`), `parse_initialize_line`, `slash_args`, `slash_command`, `slash_commands_with` (resolve + run, deadline parameter), `SLASH_DEADLINE` (30 s).
- `src-tauri/src/commands/claude/turn.rs:142-205`: `Run.vault_path` becomes `Option<String>` (`None` for a slash request, so it never blocks a turn at `:241`); `pub(super)` `register_request(pid)` / `remove(id)` so the runner lists its process and `cancel_all` (`lib.rs:423`) kills its group.
- `src-tauri/src/commands/claude.rs`: `pub mod slash;`, `#[tauri::command] claude_slash_commands(runs, shell_env, binary_path, vault_path)` in `spawn_blocking`, as `claude_run_turn` (`:243-264`).
- `src-tauri/src/lib.rs:393-399`: register the command. `RunEvent::Exit` already calls `cancel_all`.
- `src/lib/contracts/commands.ts:226-238,344-350`, `index.ts`: command entry, arg names, type export; `generated/SlashCommandInfo.ts` from `cargo test`.
- `src/lib/features/claude-code/claude.logic.ts`: `SlashCommandDetail`, `slashCommandDetails(rows)` (aliases first, row names overwrite, whitespace collapsed), `untriedSlashNames`.
- `claude.store.svelte.ts`: `slashCommandDetails` getter (a `$state.raw` Map), `setSlashCommandRows`, cleared in `reset()`, kept by `newChat`.
- `claude.service.ts`: `loadSlashDetails()` (mount / vault open), `slashDetailsAfterEvent(payload)` (Init rule, fetch after that run's `Done`), module state (fetched vault, in-flight generation, tried names, pending run) cleared in `resetClaude`.
- `src/lib/app/tauri-listeners.service.ts:116-122` (outside the Issue's Files list): one call to `slashDetailsAfterEvent(payload)` after `saveChatOnDone`. The listener is the only place that sees every event, panel mounted or not.
- `ClaudePanel.svelte:461-476`: two-line rows, `max-h-64`; an `$effect` on `vaultStore.path` calls `loadSlashDetails` (covers mount and the next vault open; the panel stays mounted across a switch).
- `help/documentation/07-sidebar-panels.md:157`.

## Plan

1. Rust parser + tests (`src-tauri/tests/commands/claude_slash_test.rs`).
2. Runner, `ClaudeRuns` registration, command, lib.rs + tests with fake `claude` scripts (pattern: `claude_turn_test.rs:24-66`, cancel_all test `:374`).
3. Contracts + logic + store + tests.
4. Service + listener + tests (prior art: `claude.service.test.ts`, `tauri-listeners.service.test.ts:1338`).
5. Panel + tests (prior art: `ClaudePanel.test.ts:636` exact text, `:765` status args).
6. Help page.

## Defaults taken

- Runner: a reader thread sends lines over a channel; the caller `recv_timeout`s against one deadline. Past it, `runs.cancel(id)` kills the group, then a short grace for stdout to close (so `kill`'s re-kill can still see the listed run) before the run is removed and the child reaped.
- An `error` reply's CLI message is kept in the Rust error string; no row content ever goes into an error.
- A stdin write failure is not an error by itself: EOF follows and returns "exited without answering".
- An `Init` during an in-flight fetch marks nothing as tried, so a failed fetch can still be retried by a later `Init`.
- Mount fetch: skipped when a fetch for this vault already started in this app session (success, failure or in flight), so a failure is retried only through the `Init` rule.

## Risks

- `Run.vault_path` type change touches the turn's busy check; a test proves a turn still starts while a slash request runs.
- Panel tests: the module state must be reset per test, so their `beforeEach` calls `resetClaude()`.
