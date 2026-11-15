# Issue 05 discovery: login shell env for `claude`

Builds on `work/02` (turn runner, fake-script helpers in `src-tauri/tests/commands/claude_turn_test.rs`). Plan follows `research/login-shell-env/05-validation.md` "Minimal plan".

## Files that change

- `src-tauri/src/commands/claude/shell_env.rs` (new): `EnvVars = BTreeMap<OsString, OsString>`; pure `clean_base(vars)`, `parse(stdout, nonce)`, `child_env(&captured)`, `fallback_env(&base, is_dir)`, `capture_shell(Option<OsString>)`; `capture_with(shell, &base, timeout)` (setsid, reader thread, deadline, killpg, reap) and `capture(shell)`; `ShellEnv` cache (managed state, `Arc<Mutex<Option<Result<Arc<EnvVars>, String>>>>`, `get` and `refresh`); `TurnEnv { vars, captured }` and `turn_env(result, &base)`.
- `src-tauri/src/commands/claude.rs:10-11` `pub mod shell_env`; new `resolve_turn_claude` next to `resolve_claude` (`:128`): override as before, else a file named `claude` in an absolute dir of the env's PATH, else candidates (captured env) or Issue 01's lookup (fallback env). `claude_status` (`:160`) calls `ShellEnv::refresh` and does not wait; `claude_run_turn` (`:175`) waits on `ShellEnv::get` inside its `spawn_blocking`.
- `src-tauri/src/commands/claude/turn.rs:121` `turn_command(binary, request, env)` adds `env_clear().envs(env)` (keeps `env_remove(CLAUDECODE)`); `run_turn_with(runs, request, &TurnEnv, shell, candidates, sink)` (`:180`) uses `resolve_turn_claude`.
- `src-tauri/src/lib.rs:325`: `.manage(ShellEnv::default())`.
- `help/documentation/19-settings.md:273`: one paragraph after the Claude Code table.
- Tests: new `src-tauri/tests/commands/claude_shell_env_test.rs` (units + fake shells), `claude_turn_test.rs` (env integration tests, call sites get a `TurnEnv`), `commands/mod.rs`.

## Plan (test-first)

1. Integration test through `run_turn_with`: fake login shell `export X=..; exec /bin/sh -c "$4"`, fake `claude` prints a `result` with `$X`. Fails (does not compile) before.
2. Pure units: parse (noise, non-UTF-8, newline in value, missing marker), child-env drop list, fallback keeps only existing dirs, clean base keeps only listed names.
3. Capture with fake shells and a short injected deadline: noise, exit 1 after output, hang (pid reaped at the deadline), background grandchild holding stdout (returns within ~1 s of END), no END, stdout cap (`yes`), test-process var not in the capture.
4. Cache: concurrent `get` share one capture; `refresh` discards; `refresh` while a capture runs is a no-op.
5. Wire commands, lib.rs, help text.

## Defaults taken

- "No extra shell when the capture succeeded": with a captured env the resolver never runs Issue 01's `-lc` lookup (PATH, then candidates); with the fallback env it runs the full Issue 01 lookup after the PATH search.
- Fallback PATH order: the existing user dirs in the listed order, then the system dirs (a login shell puts Homebrew, mise etc. before `/usr/bin`).
- PATH lookup skips relative entries (they would resolve against the vault cwd).
- Capture cwd = base `HOME`, `/` when unset. Records without `=` are skipped.
- After END or EOF: `try_wait` up to 1 s, then `killpg` + reap; never `killpg` after the shell is reaped, so helpers the rc started (agents) survive a clean exit.
- `refresh` runs `try_lock` on its detached thread; a refresh that finds a capture running is skipped. Returns the `JoinHandle` (tests join it; commands drop it).

## Risks

- A grandchild that calls `setsid` itself and keeps stdout open escapes `killpg`; the reader thread then stays blocked until it closes the pipe (caller still returns at the deadline).
- `std::env::set_var` in a test: std's env lock covers `Command::spawn`, so other tests' spawns are safe.
