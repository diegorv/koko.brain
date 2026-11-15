VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `.scratch/claude-code-integration/issues/07-cancel-misses-a-child-forked-during-killpg.md` (needs-triage, Blocked by 05) records the race with Issue 02's original script as its failing test and a concrete fix direction; the comment on `sleeping_run_cancelled_mid_run_ends_in_done` (src-tauri/tests/commands/claude_turn_test.rs:309-313) points to it. The review asked for exactly this. |
| 2 | minor | resolved | `shell_that_lingers_after_the_end_marker_is_killed_after_the_grace` (src-tauri/tests/commands/claude_shell_env_test.rs:324): the shell records `$$`, prints the env, then `sleep 30` without `exec`. Asserts < 4 s, `FROM_RC` parsed, and the shell pid gone (`kill(pid, 0)` fails, so not a zombie either, since `kill_session` waits). Passes. |
| 3 | minor | resolved | `reap` (src-tauri/src/commands/claude/shell_env.rs:350-357) always ends in `kill_session`. `exited_unreaped` uses `waitid(P_PID, WEXITED | WNOHANG | WNOWAIT)`, so the shell is never reaped before `killpg` and its pid (the session's pgid) stays reserved. I checked the macOS behaviour with a standalone C probe: `si_pid` is 0 before exit and the child's pid after, repeatedly with `WNOWAIT`, and a later `waitpid` still reaps it. On error (`waitid` != 0) it falls through to `killpg` + `wait`, which is safe. `background_job_of_a_shell_that_exits_is_killed` (:345) passes. |
| 4 | nit | resolved | `ShellEnv.capturing` (shell_env.rs:223-226) is set only inside `run`; `refresh` (:253-261) skips only when it is set and otherwise blocks on the lock. A remaining check-then-lock window can at worst run one extra capture, which is harmless for a refresh. `refresh_while_a_capture_runs_is_skipped` still asserts one capture and a fast return. |
| 5 | nit | rejection stands | The test still proves the capture does not wait for the 8 s job, and the new grace test covers the post-END timing. Optional nit, rejection acceptable. |
| 6 | nit | resolved | Double blank line after `EXIT_GRACE` removed. |

## Acceptance criteria re-checked

- [met] Process setup: cwd `$HOME`, stdin and stderr `Stdio::null()` (draining stderr blocks while an rc-started background job lives: validation 05, blocker 2), stdout piped, `pre_exec(libc::setsid)` and never `process_group` together with it (EPERM). A reader thread reads stdout until the END record, EOF or 4 MiB and reports over a channel; the caller waits with `recv_timeout(10 s)`. On deadline: `killpg(SIGKILL)` and reap. After END: `try_wait` up to 1 s, then `killpg(SIGKILL)` and reap. No zombie, no blocked thread left behind. — The post-END path now polls up to `EXIT_GRACE` (1 s) with a non-reaping `waitid` in place of `try_wait`, then always `killpg(SIGKILL)` + `wait` (shell_env.rs:350-385); same contract, and it no longer leaves rc background jobs alive. Covered by the new lingering-shell and background-job tests plus the existing deadline test.
- [met] Cache: one result, success or failure, in a `Mutex<Option<Result<Arc<EnvVars>, String>>>` held during the capture so concurrent callers share one. Every `claude_status` call (the Settings section on mount and its "Check again" button, Issue 01) discards the cached result and starts a fresh capture on a detached thread, unless one is already running; no frontend change. No retry timer. — The slot type and lock-held capture are unchanged (`get` at shell_env.rs:243-249); "unless one is already running" now keys on the `capturing` flag. Cache tests pass.
- [met] Fake-shell tests (short deadline injected in tests): startup noise before START, exit 1 after valid output (accepted), a hang (killed at the deadline), a background grandchild holding stdout and stderr (returns within about 1 s of END), no END marker, the stdout cap. Unit tests: parse, child-env drop list, fallback keeps only existing dirs. — All previous tests are still present and unweakened; two tests were added (post-END grace kill, background job of an exiting shell).

## Checks run by this review

- `cargo test --manifest-path src-tauri/Cargo.toml --test commands_test claude`: 80 passed, 0 failed, exit 0 (78 before plus the 2 new tests).
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings`: exit 0.
- `pnpm check`: exit 0, 0 errors, 0 warnings.
- Standalone C probe of `waitid(WEXITED|WNOHANG|WNOWAIT)` on macOS: behaves as `exited_unreaped` expects.
- Scope: the fix commit touches only shell_env.rs, its test file, one comment in claude_turn_test.rs, the new Issue 07 file and review.md. No test was deleted or loosened; no layer-baseline change.
- The full suite is deliver's to run. The Linux `waitid`/`si_pid` path was not run (macOS only), as the fix report says.

## Findings

1. nit, src-tauri/src/commands/claude/shell_env.rs:269-274: `run` does not reset `capturing` if the capture function panics, so later `refresh` calls would always skip. `get` would still recapture on an empty slot, and `capture_with` has no panicking path in practice. Fix: optional, reset the flag with a drop guard.
