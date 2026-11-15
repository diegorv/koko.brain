# Issue 10 discovery: the status check finds `claude` the way a turn does

Builds on `work/05` (ShellEnv cache, `resolve_turn_claude`, fake login shells in `claude_shell_env_test.rs`).

## Files that change

- `src-tauri/src/commands/claude.rs`
  - `claude_status_with` (`:90`) takes the `&TurnEnv` and resolves with `resolve_turn_claude` (`:165`); `read_version`/`version_command` (`:82`, `:263`) run `--version` with `env_clear().envs(env)` (CLAUDECODE still removed).
  - `resolve_claude` (`:131`) refuses a non-absolute override first, with "must be an absolute path ... `~` is not expanded".
  - `claude_status` (`:197`) gets `refresh_env: bool`; inside `spawn_blocking`: `if refresh_env { shell_env.refresh() }`, then `turn_env(shell_env.get(), &clean_base(..))`, then `claude_status_with`. No refresh otherwise.
  - `lookup_login_shell` (`:246`) stays: `resolve_turn_claude` still uses it for the fallback env (`:185`, asserted by `claude_turn_test.rs:269` `captured_env_without_claude_runs_no_login_shell`). The status now only runs it when the capture failed, as a turn does.
- `src-tauri/src/commands/claude/shell_env.rs:251-262` `refresh` becomes synchronous (the status waits for it) and keeps a cached success when the new capture fails.
- `src/lib/contracts/commands.ts:222,332` `claude_status` args `{ binaryPath, refreshEnv }`.
- `src/lib/features/claude-code/claude-code.service.ts` `checkClaudeStatus(binaryPath, refreshEnv)` writes the result to a new shared store `claude-status.store.svelte.ts` (`status`, `checkFailed`) and rethrows on IPC failure.
- `ClaudeCodeSection.svelte` calls it with `refreshEnv: true` (mount and Check again) and reads the store; `ClaudePanel.svelte:33-70` calls with `false` on mount and reads the store, so a Settings check updates the open panel. Field description text changes.
- Docs: `help/documentation/19-settings.md:271-275`, `spec.md:50` (GUI PATH), ADR-0038 `:31`.

## Plan (test-first)

1. Rust: failing test in `claude_test.rs`: fake login shell exports `PATH=<bin>` and `KOKO_NEEDED=yes`; `<bin>/claude` answers `--version` only when `KOKO_NEEDED` is set; captured with `capture_with` + `child_env`, `claude_status_with("", &env, ...)` reports installed with that path. Migrate the existing status tests to pass a `TurnEnv` (fallback env with an empty PATH dir keeps the login-shell tests meaningful).
2. Rust: absolute-override test next to `resolve_refuses_a_relative_override` (`./claude`, `bin/claude`, `~/.local/bin/claude`).
3. Rust: `refresh` keeps a good capture: fake shells good, then hanging (short deadline), then `get()` returns the good env; first failure still cached; refresh after a failure replaces it.
4. Frontend: service test (`refreshEnv` passed, store written, failure flag), section test (`refreshEnv: true`), panel test (`refreshEnv: false`; Settings check updates a mounted panel from unavailable to chat).
5. Docs.

## Defaults taken

- Explicit argument (`refreshEnv`), not a separate command: one round trip, and the refresh runs before the lookup in the same blocking task, so Settings shows the status for the fresh env.
- `refresh` is synchronous now (only caller is `claude_status`); it still skips when a capture is running, and the following `get()` waits on that capture.
- The panel still checks on every mount, without refresh: a `--version` run, and a capture only when nothing is cached yet (a turn would need it anyway).
- The shared status is not reset on vault close: both components re-check on mount.

## Risks

- "Check again" now waits up to the 10 s capture deadline before showing a status; the button is disabled meanwhile.
- A late panel check could overwrite a newer Settings result; both read the same env and override, so they agree.
