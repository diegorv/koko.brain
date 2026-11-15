# 05: Run `claude` with the login shell's environment

**What to build:** A `shell_env` module that captures the user's login interactive shell environment once per app run, from a clean base, with a hard deadline, and the change to Issue 02's turn runner so every `claude` child gets that environment (or a fallback good enough for MCP servers), never the app's own. Research and evidence: `research/login-shell-env/` (scouts 01-04, validation 05; plan items below come from 05's "Minimal plan").

**Blocked by:** 02

**Status:** ready-for-agent

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` (Rust only, no `#[ts(export)]` change), plus `pnpm check` + `pnpm vitest run` if the Settings "Check again" wiring touches the frontend.

- [ ] Failing test first: an integration test through Issue 02's `run_turn_with` where a fake login shell exports a variable and a fake `claude` reports it in its `result` text; it fails before the change and the `Result` event carries the value after.
- [ ] `src-tauri/src/commands/claude/shell_env.rs` (next to Issue 02's modules), values as `OsString`. Capture runs `<shell> -l -i -c "/usr/bin/printf '%s\0' <START>; /usr/bin/env -0; /usr/bin/printf '%s\0' <END>"` with a per-run random nonce in both markers. Shell: `$SHELL` when absolute and executable, else `/bin/zsh` (Issue 01's `shell_from_env`).
- [ ] The capture process starts from `env_clear()` plus a clean base: `HOME`, `USER`, `LOGNAME`, `SHELL`, `TMPDIR`, `SSH_AUTH_SOCK`, `__CF_USER_TEXT_ENCODING`, `LANG`/`LC_*` when the app has them, `PATH=/usr/bin:/bin:/usr/sbin:/sbin`, plus `KOKOBRAIN_RESOLVING_ENVIRONMENT=1`, `DISABLE_AUTO_UPDATE=true`, `ZSH_TMUX_AUTOSTART=false`, `ZSH_TMUX_AUTOSTARTED=true`. The app's own environment never reaches the capture or the child (dev launches from a terminal or a Claude Code session would leak `CLAUDE_CODE_*`, `ANTHROPIC_*`, `npm_*`, `TERM_SESSION_ID`: validation 05, blocker 1). Test: a variable set only in the test process does not appear in the captured or child env.
- [ ] Process setup: cwd `$HOME`, stdin and stderr `Stdio::null()` (draining stderr blocks while an rc-started background job lives: validation 05, blocker 2), stdout piped, `pre_exec(libc::setsid)` and never `process_group` together with it (EPERM). A reader thread reads stdout until the END record, EOF or 4 MiB and reports over a channel; the caller waits with `recv_timeout(10 s)`. On deadline: `killpg(SIGKILL)` and reap. After END: `try_wait` up to 1 s, then `killpg(SIGKILL)` and reap. No zombie, no blocked thread left behind.
- [ ] Parsing is a pure function over the bytes between the markers: split on NUL, split each record at the first `=`, keep non-UTF-8 bytes and newlines, `None` when a marker is missing. A valid record set is accepted whatever the shell's exit status.
- [ ] Child env (pure): the captured env minus `PWD`, `OLDPWD`, `SHLVL`, `_`, `CLAUDECODE` and every name the capture injected. Fallback env (pure), used when the capture fails: the clean base with `PATH` = the system dirs plus whichever of `~/.local/bin`, `/opt/homebrew/bin`, `/opt/homebrew/sbin`, `/usr/local/bin`, `~/.local/share/mise/shims`, `~/.asdf/shims`, `~/.volta/bin`, `~/.bun/bin`, `~/.npm-global/bin` exist.
- [ ] Cache: one result per app run, success or failure, in a `Mutex<Option<Result<Arc<EnvVars>, String>>>` held during the capture so concurrent callers share one. The Settings "Check again" action clears it and captures again. No retry timer.
- [ ] Timing: nothing at app startup. `claude_status` starts the capture on a detached thread and does not wait. `claude_run_turn` waits for it (inside its blocking task) before spawning, so `claude` and its MCP servers never start with the app's env: one bad run makes Claude Code skip every plugin MCP server for 15 minutes in all `-p` runs sharing `~/.claude`, terminal ones included (scout 01, section 6).
- [ ] Issue 02's runner applies `env_clear().envs(env)` and resolves `claude` on the captured (or fallback) `PATH` first, keeping Issue 02's rule that only a file named `claude` runs, before falling back to Issue 01's lookup; a turn runs no extra shell when the capture succeeded.
- [ ] Logging through `debug_log` only: elapsed ms, outcome (ok, timeout, no markers, spawn error), variable count. Never a value, never `{cmd:?}` (`Command`'s Debug prints its env).
- [ ] Fake-shell tests (short deadline injected in tests): startup noise before START, exit 1 after valid output (accepted), a hang (killed at the deadline), a background grandchild holding stdout and stderr (returns within about 1 s of END), no END marker, the stdout cap. Unit tests: parse, child-env drop list, fallback keeps only existing dirs.
- [ ] Settings help (`help/documentation/19-settings.md`, Claude Code section): one paragraph saying the app reads the login shell environment once per run, that `KOKOBRAIN_RESOLVING_ENVIRONMENT=1` is set while it does, and that `.zshrc` edits apply after "Check again" or a restart.

## Problem

A macOS app started from Finder or the Dock gets `PATH=/usr/bin:/bin:/usr/sbin:/sbin` and almost nothing else. Claude Code fixes none of it: its Bash tool, command hooks and stdio MCP servers all take PATH from the `claude` process (scout 01). With that environment all 5 of the owner's local MCP servers failed, plugin hooks exited 127 and Bash had no `node`; with the login shell's PATH all of them worked (scout 01, probe table). `-lc` is not enough: it skips `.zshrc`, where `~/.local/bin` (the `claude` binary) and the mise tool dirs come from, 15 PATH entries against 35 with `-ilc` (scout 02). On the owner's machine the capture takes 0.17-0.47 s.

## Notes

- All variables, not an allowlist: terminal parity (Zed and VS Code keep all; t3code's allowlist grew one bug at a time, scout 03). Owner decision 2026-11-14: sole user, wants terminal behavior.
- Not a dependency on `fix-path-env-rs`: no timeout, waits for EOF, truncates multi-line values (scout 03).
- Runs in parallel with Issue 03 (frontend panel); only the "Check again" wiring touches Issue 01's Settings section.
- Known limits, accepted for the MVP: a GUI prompt from an rc file (Touch ID, pinentry) holds the capture until the deadline; `.envrc`/`mise.toml` in the vault are not applied (capture runs in `$HOME`); the env goes stale after rc edits until "Check again".
