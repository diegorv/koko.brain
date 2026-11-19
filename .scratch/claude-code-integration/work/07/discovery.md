# Issue 07 discovery: cancel misses a child forked during `killpg`

## Files that change

- `src-tauri/src/commands/claude/turn.rs:151-158` (`ClaudeRuns::cancel`) and `:308-317` (`kill_group`): a second group kill once the leader has exited.
- `src-tauri/tests/commands/claude_turn_test.rs:325-348`: new failing test next to `sleeping_run_cancelled_mid_run_ends_in_done`, whose comment (`:329-333`) stops pointing at this Issue.

## Cause

`cancel` holds the runs lock and sends one `killpg(SIGKILL)`. On macOS a child that `sh` is forking while that runs is created after the group is walked and misses the signal; it keeps stdout open, the reader thread never sees EOF, so `finish` (reap + `Done`) waits for the child to exit by itself (30 s for `sleep 30`).

## Plan

1. Failing test `cancel_reaches_a_child_forked_during_the_kill`: Issue 02's original script (`echo '<init>'`, `sleep 30`, `echo 'never'`, no `exec`, git `6f72a4e17^` history of the test file), `start` (system-PATH env, `system_env()`), cancel after `Init`, assert `[Done { exit_code: None }]` and under 5 s from the cancel.
2. `cancel`: after the first `killpg`, spawn a thread that blocks in `waitid(P_PID, pid, WEXITED | WNOWAIT)` until the leader exits, without reaping it. Then it takes the runs lock and, if the run is still listed, sends `killpg(SIGKILL)` again. A forked child exists by the time its parent has exited, so the second kill reaches it.
3. No reused group id: the run is removed from the map before `finish` reaps the child (turn.rs:246-247), so "still listed under the lock" means the leader is unreaped (a zombie after `WNOWAIT`) and its pid, hence the group id, cannot be reused. If the reader reaps first, `waitid` returns `ECHILD` or the run is gone, and no second signal is sent.
4. Edit the old test's comment to drop the pointer to this Issue (the test still proves the kill reaches a grandchild started before `Init`).

## Prior art

- `shell_env.rs:359-372` `exited_unreaped`: `waitid(... WNOWAIT)` to keep the group id reserved before `killpg` (Issue 05 review finding 3). Same idea, blocking instead of `WNOHANG` polling.
- Test helpers `start`, `collect_until_done`, `script` in `claude_turn_test.rs`.

## Defaults taken

- The AC offers "again after the leader is reaped" or "`killpg` until `ESRCH`". Taken: again after the leader *exits*, before it is reaped. After reaping the id is only protected while some member lives; before reaping it is always protected. A loop until `ESRCH` would spin while the zombie leader stays unreaped (it is reaped only after stdout closes).
- One extra kill, not a loop: a child forked by the missed child during the second kill is not handled (needs a survivor that is itself forking at that instant).
- The wait runs on its own thread so `cancel` (a sync Tauri command) never blocks while holding the runs lock.

## Risks

- The race is timing-based; the test reproduced 3 of 3 in Issue 05's probe. If it passes before the fix here, the test does not prove the fix (check in step 1).
- A leader stuck in uninterruptible sleep keeps the thread blocked in `waitid` until it exits; nothing else waits on it.
