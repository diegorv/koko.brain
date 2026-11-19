# 05: Validation of plan.md (Issue 05, login shell env for claude)

[V] = verified here (std source for rustc 1.98.1, experiments in /tmp/kk-val/, binary strings, Issue 02 code). [I] = inferred.

## Facts check
- F1 is partly wrong. Settings `env` does reach hooks and MCP children, through `Ts()` (scout 01 section 4 [V source]). The real reason to reject it: `--settings '{"env":...}'` puts secrets in argv, where `ps` shows them, and the other route writes the user's file. The conclusion stands.
- F2, F4, F5, F7 hold [V by the scouts]. F3 holds: `~/.claude/mcp-needs-auth-cache.json` still has 4 plugin entries from the probe at 22:03 [V]. "Terminal runs" means terminal `-p` runs. Interactive sessions were not tested.
- F6 holds. Under `setsid`, zsh `-i` has `monitor` off, so a `&` job stays in the shell's process group and `killpg` reaches it [V exp2]. `Child::kill` signals only the pid [V].
- F8 is out of date. Issue 02's `turn.rs` is now written: `run_turn_with(runs, request, shell, candidates, sink)`, `process_group(0)`, `killpg(SIGKILL)`, and only `env_remove(CLAUDECODE)` [V]. The Debug leak is real: `impl Debug for Command` prints env in both `{:?}` and `{:#?}` (`std/src/sys/process/unix/common.rs:492`) [V]. turn.rs formats `binary.display()` only, never the Command [V].
- New fact: `CommandExt::setsid` is unstable (`process_setsid`, #105376) [V], so the code must use `pre_exec(libc::setsid)`. `setsid()` after `setpgid(0,0)` fails with EPERM [V exp3]. Combining it with `process_group(0)` (the turn.rs pattern) therefore makes every spawn fail, or leaves the tty attached if the error is ignored.

## Per item
1. KEEP.
2. CHANGE. Build the probe env with `env_clear()` plus a clean base: HOME, USER, LOGNAME, SHELL, TMPDIR, SSH_AUTH_SOCK, __CF_USER_TEXT_ENCODING, LANG/LC_* if set, `PATH=/usr/bin:/bin:/usr/sbin:/sbin`, plus the sentinels. Do not pass the app env (blocker 1). Set `stderr(Stdio::null())`; do not drain it (blocker 2). Use `pre_exec(setsid)` only, never `process_group` (fact above). Add `ZSH_TMUX_AUTOSTARTED=true`, as shell-env does. Prototype run against the owner's real rc: 0.17-0.36 s, 78 vars, 35 PATH entries, claude/node/npx/uvx all found [V exp5].
3. CHANGE. On deadline, send `killpg(SIGKILL)` at once and reap. The SIGTERM step and its 500 ms wait are wasted: an interactive shell ignores SIGTERM, and a probe has nothing to clean up. After END, `try_wait` for at most 1 s, then `killpg(SIGKILL)` and `wait`. The plan leaves this step undefined, and a dropped `Child` becomes a zombie. Cut the 200 ms grace; the deadline covers that case. Cap stdout at 4 MiB. Mechanism: a reader thread stops at END, EOF or the cap and reports over mpsc; the caller does `recv_timeout`.
4. KEEP.
5. CHANGE. Child env = the captured env minus `PWD OLDPWD SHLVL _ CLAUDECODE` and every name the probe injected (`KOKOBRAIN_RESOLVING_ENVIRONMENT DISABLE_AUTO_UPDATE ZSH_TMUX_AUTOSTART ZSH_TMUX_AUTOSTARTED`). These names do come back in the capture [V exp5]. With a clean base, the app-env overlay and the PATH merge do nothing on a Finder launch (launchd's PATH is a subset of path_helper's), so cut both.
6. CHANGE. Fallback = the clean base, with PATH = system dirs plus whichever of the listed dirs exist. Cut `path_helper -s`: it is one more spawn and a `PATH="..."; export PATH;` parser, and it only adds dirs the list already has. On this machine the fallback finds node, npx and uvx (mise shims, /opt/homebrew/bin) [V], so it should not trip the 15-minute plugin skip here [I].
7. CHANGE. Cut the 60 s gate and the injectable clock. Cache success and failure for the app run (`Mutex<Option<Result<Arc<EnvVars>,String>>>`, held during the capture so concurrent callers share one). "Check again" and a restart clear it. This matches the Issue AC ("debug_log once") and removes blocker 3.
8. KEEP. Await the capture inside `spawn_blocking` before the spawn. That is the Zed #60800 lesson.
9. KEEP. With an env lookup, the per-turn `-lc command -v claude` goes away. The PATH lookup must keep the "named claude" rule.
10. KEEP.
11. CHANGE. Drop the "ignores SIGTERM" and 60 s gate tests. Add: a grandchild holds both stdout and stderr (returns within 1 s); injected names are stripped; stdout cap.
12. CHANGE. One paragraph in the Claude Code settings help, not a new page.
- Open choice VSCODE_RESOLVING_ENVIRONMENT: no (agree).

## Blockers the plan misses (most severe first)
1. **The app env leaks into the child on dev launches.** [V] With the plan's probe env (app env inherited), a capture run from this Claude session returned 14 host-session vars: ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL, CLAUDE_CODE_CHILD_SESSION, CLAUDE_CODE_ENTRYPOINT, CLAUDE_CODE_SESSION_ID, CLAUDE_CODE_MESSAGING_SOCKET/TOKEN, CLAUDE_PID, CLAUDE_EFFORT, T3CODE_*. The plan removes only CLAUDECODE. Effects in the binary [V source, I impact]:
   - `N()` keeps an inherited CLAUDE_CODE_ENTRYPOINT, so the child reports the parent's product surface.
   - CLAUDE_CODE_CHILD_SESSION flips `V$()` (Bash result and edit-diff paths).
   - The child registers the parent's messaging socket.
   - The child authenticates with the host session's token instead of the user's login.

   `pnpm run` also adds `npm_*`, `pnpm_config_*`, `INIT_CWD`, and `<repo>/node_modules/.bin` on PATH [V exp pn]. Under Apple Terminal, an inherited TERM_SESSION_ID makes `/etc/zshrc_Apple_Terminal` source that tab's `.zsh_sessions` restore file and register a zshexit writer [V file, I effect]. The owner tests in `pnpm tauri dev` and agents start it from Claude Bash, so dev runs would not show Finder parity. The clean probe base (item 2) fixes all of this in one place.
2. **The stderr drain blocks for as long as a background process lives.** [V exp4] The shell exits 0.01 s after END, but stderr reaches EOF only when a `sleep 5 &` grandchild exits, 4.55 s later. Logging the "stderr byte count" means joining that thread, which blocks for as long as any rc-started daemon keeps stderr open. Fix: `Stdio::null()`.
3. **The 60 s gate adds up to 10 s to the turn after every gap of more than 60 s, when the rc is slow or broken.** Chat turns are usually more than 60 s apart, so this is almost every turn. That breaks "no noticeable delay" [I]. Fix: cache the failure (item 7).
4. **`setsid` plus `process_group` gives EPERM on every spawn** [V]. Copying the turn.rs pattern breaks the capture.
5. **Reaping after END is undefined** (zombie, or an early `killpg` kills helpers the rc started) [I]. See item 3.
6. **Injected sentinel names reach claude and its Bash tool** [V exp5].
7. **No stdout cap**: an rc that loops printing can use memory without bound until the deadline [I].
8. Minor:
   - The first `claude_run_turn` invoke can block up to 10 s with no UI feedback (once per run, given blocker 3's fix) [I].
   - Opening Settings with the feature off runs the user's interactive rc (prewarm side effects) [I].
   - A capture that hangs on a Touch ID or network prompt outlives an app quit [I].
   - After `.zshrc` edits or mise upgrades the env is stale until "Check again". An optional cheap fix: recapture when the mtime of `.zshenv`, `.zprofile` or `.zshrc` changes [I].

## Simpler options the plan rejected (my view)
- Capturing only PATH (`-lic 'printf %s "$PATH"'`) costs the same shell startup and needs the same timeout, kill and setsid, so it saves only a 15-line NUL parser. It loses `__MISE_DIFF` (t3code #19340, mise wrapper loops; the owner uses mise), `${VAR}` secrets and NVM_DIR. Reject.
- `--settings '{"env":...}'`: secrets in argv. Reject. A short allowlist means the t3code pattern of about 8 bug-driven additions and no parity. Reject.
- All variables, captured from a clean base, is both the simplest and the closest to Terminal.

## Minimal plan I would ship
`shell_env.rs`:
1. `capture(shell, timeout)`: clean base env and sentinels, cwd $HOME, stdin null, stderr null, stdout piped, `pre_exec(setsid)`, nonce markers around `/usr/bin/env -0`. A reader thread stops at END, EOF or 4 MiB; the caller does `recv_timeout(10 s)`. On timeout: `killpg(SIGKILL)` and wait. After END: `try_wait` up to 1 s, then `killpg(SIGKILL)` and wait.
2. Pure `parse` (accepted whatever the exit status), pure `child_env` (drop list), pure `fallback_env` (clean base plus existing dirs).
3. Cache success or failure per run in a Mutex. "Check again" resets it. debug_log logs ms, outcome and count only.
4. `claude_status` prewarms on a detached thread. `claude_run_turn` awaits the capture, resolves `claude` on the captured PATH, and calls `run_turn_with(.., env)`, which applies `env_clear().envs(env)`.
5. Tests: parse/filter/fallback units; fake shells (noise, exit 1 after valid output, hang, grandchild holding both pipes, no END); 2 integration tests through `run_turn_with`.

Not checked: zsh `/dev/tty` behaviour in `pnpm tauri dev` without setsid; the effect of CHILD_SESSION and ENTRYPOINT on a real `-p` turn; whether the 15-minute skip affects interactive sessions.
