# Draft plan for Issue 05: run `claude` with the login shell environment

Synthesized from scout reports 01-04 in /tmp/kk-deepdive/. Not yet validated.

## Facts it rests on (from the scouts)
- Claude Code fixes no PATH: Bash tool (snapshot exports the process PATH), hooks (`sh -c`, inherited env) and stdio MCP servers all use the claude process env. Settings `env` and CLAUDE_ENV_FILE do not cover `${VAR}` expansion of shell secrets or hooks/MCP fully. (01)
- With a Finder-like env all 5 local stdio MCP servers failed, plugin hooks exited 127; replacing PATH with the login-shell PATH fixed MCP, hooks and Bash. (01, probe)
- One `claude -p` run with a bad env marks every plugin stdio MCP server failed for 15 minutes for every later `-p` run sharing ~/.claude (`~/.claude/mcp-needs-auth-cache.json`), terminal runs included. (01, probe)
- Finder/Dock apps get USER LOGNAME HOME SHELL TMPDIR PATH(/usr/bin:/bin:/usr/sbin:/sbin) SSH_AUTH_SOCK plus XPC_/__CF vars; SHELL is set; `launchctl getenv PATH` is empty. (02, read from Raycast/AltTab)
- `-lc` misses ~/.local/bin (where claude lives) and all mise tool dirs on the owner's machine: 15 vs 35 PATH entries. `-ilc` takes 0.17-0.47 s here, prints nothing. (02)
- Interactive shells ignore SIGTERM; Child::kill only kills the shell; a background grandchild can hold the pipe. Kill the process group. Without setsid, `zsh -i` under `pnpm tauri dev` can read /dev/tty or fight for the terminal. (02, 04)
- Zed: `-l -i -c`, keep all vars minus SHLVL, parse before checking exit code, setsid, no timeout (bugs #60800 MCP racing the capture, #58386 slow). VS Code: `-i -l -c`, 10 s timeout, all vars, rejects non-zero exit (many issues). t3code: allowlist that kept growing per bug; users asking for all vars were refused for scope/credential caution, not a technical failure. Tolaria: `-lc` + sourcing rc, 23 auth vars, never takes PATH from the shell. (03)
- Code today (04): Issue 01 `claude.rs` uses std::process, `run_with_timeout` polls try_wait and kills only the child; no env_clear. Issue 02 (in progress) plans std threads, process_group(0), killpg on cancel, `run_turn_with(request, shell, candidates, sink)`, and re-runs `-lc command -v claude` each turn when no override. debug_log is a no-op until the frontend enables debug mode. `Command`'s Debug output may include env (secrets) — never `{cmd:?}`. Tests live in src-tauri/tests/commands/, fake executables via `script()` helper. libc and uuid are deps; tokio has no `process` feature.

## Proposal
1. **Module** `src-tauri/src/commands/claude/shell_env.rs` (next to Issue 02's `stream.rs`), values as `OsString`.
2. **Capture command:** `<shell> -l -i -c "/usr/bin/printf '%s\0' <START>; /usr/bin/env -0; /usr/bin/printf '%s\0' <END>"`, START/END with a per-run random nonce; `cwd=$HOME`; stdin `/dev/null`; stdout piped and read until the END record (never wait for EOF); stderr drained concurrently and discarded (only its byte count logged); `pre_exec(setsid)` so the shell has no controlling terminal and is its own process group.
   - Shell: `$SHELL` when absolute and executable, else `/bin/zsh` (reuse Issue 01 `shell_from_env`).
   - Probe env: the app env plus `KOKOBRAIN_RESOLVING_ENVIRONMENT=1` (documented so users can skip slow rc work), `DISABLE_AUTO_UPDATE=true`, `ZSH_TMUX_AUTOSTART=false`.
3. **Timeout and kill:** 10 s deadline; then `killpg(SIGTERM)`, `killpg(SIGKILL)` 500 ms later, always reap. If the shell exits before END, wait at most 200 ms more, then treat as failure.
4. **Parse:** pure fn over bytes between the markers, split on NUL, split each record at the first `=`, keep non-UTF-8 and newlines. Parse first, then look at the exit status: a valid record set with a non-zero exit is accepted (warn only).
5. **Merge (pure):** base = app env; overlay every captured var except `PWD OLDPWD SHLVL _ CLAUDECODE KOKOBRAIN_RESOLVING_ENVIRONMENT`; PATH = shell PATH entries first, then app PATH entries not already present; finally remove `CLAUDECODE`.
6. **Fallback (pure, when capture fails):** app env with PATH = app PATH + `/usr/libexec/path_helper -s` entries + existing dirs among `~/.local/bin`, `/opt/homebrew/bin`, `/opt/homebrew/sbin`, `/usr/local/bin`, `~/.local/share/mise/shims`, `~/.asdf/shims`, `~/.volta/bin`, `~/.bun/bin`, `~/.npm-global/bin`.
7. **Cache:** success cached for the app run (OnceLock + a Mutex so concurrent callers share one capture). Failure: that turn uses the fallback and the next attempt is allowed only after 60 s (so a broken rc does not add 10 s to every turn).
8. **Timing:** no work at app startup (feature off by default; debug_log not ready). `claude_status` starts the capture on a background thread and does not wait (Settings section and, later, the panel call it). `claude_run_turn` waits for the capture (inside its spawn_blocking) before spawning, so MCP never starts with a bad env (avoids the 15-min plugin skip and Zed #60800). The Settings "Check again" button forces a fresh capture.
9. **Use of the env:** Issue 02's `run_turn_with` takes `env: &EnvVars` and applies `env_clear().envs(env)`. Binary resolution looks up `claude` in the captured PATH before falling back to Issue 01's `-lc command -v claude`, so a turn does not run an extra shell.
10. **Logging:** only elapsed ms, outcome, variable count, stderr byte count. Never values, never `{cmd:?}`.
11. **Tests (Rust, src-tauri/tests/commands/claude_shell_env_test.rs):** parse (noise before START, newline and `=` in values, missing markers, non-UTF-8); merge (PATH order and dedupe, dropped names, CLAUDECODE removed); fallback (only existing dirs); fake-shell capture: success, prints noise, exits 1 after valid output (accepted), hangs (killed by deadline, test uses a short timeout), ignores SIGTERM (SIGKILL path), leaves a background grandchild holding stdout (returns at END), never prints END; failure retry gate (60 s, injectable clock); integration through `run_turn_with`: a var only the fake login shell exports reaches the child, and the fallback PATH reaches it on failure.
12. **Docs:** help/documentation settings page: what the app reads, `KOKOBRAIN_RESOLVING_ENVIRONMENT`, and that edits to `.zshrc` apply after "Check again" or restart.

## Open choices for the owner
- All vars (proposal) vs allowlist. Owner wants terminal parity; sole user.
- Also set `VSCODE_RESOLVING_ENVIRONMENT=1` so existing guards apply (borrowed convention) — proposal: no.
