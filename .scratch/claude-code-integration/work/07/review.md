VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first: Issue 02's original cancel script (`echo '<init>'; sleep 30; echo 'never'`, no `exec`) run through `run_turn_with` with Issue 05's system-PATH env, cancelled after `Init`, ends in `Done { exit_code: None }` within a few seconds. Today it ends after 30 s. — `cancel_reaches_a_child_forked_during_the_kill` (src-tauri/tests/commands/claude_turn_test.rs:349-371) uses that script through `start` -> `run_turn_with` with `system_env()`, waits for `Init`, cancels, and asserts `[Done { exit_code: None }]` plus under 5 s from the cancel. I built the test binary with mvp-claude's turn.rs, copied it aside (`nm`: no `wait_for_exit` symbol) and ran the test 10 times: 9 failed at the 10 s `collect_until_done` timeout and 1 passed. The fixed binary (`wait_for_exit` present) passed 15 of 15, about 0.10 s each. The test does fail before the fix and passes after it.
- [met] `kill_group` in `src-tauri/src/commands/claude/turn.rs` sends `SIGKILL` to the group again after the leader is reaped, or repeats `killpg` until it returns `ESRCH`, without signalling a reused group id. — turn.rs:162-175: after the first `kill_group`, a thread blocks in `wait_for_exit` (turn.rs:337-351, `waitid(P_PID, WEXITED | WNOWAIT)`, EINTR retried), then takes the runs lock and calls `kill_group(pid)` again only if the run is still listed. The run leaves the map (turn.rs:264) before `finish` reaps the leader (turn.rs:280). So a listed run means an unreaped leader, and the group id cannot have been reused. If `finish` reaps first, `waitid` returns ECHILD and the map check skips the kill. The kill comes after the leader exits, not after it is reaped; see finding 3 for why that still meets the criterion.
- [met] The comment on `sleeping_run_cancelled_mid_run_ends_in_done` (`src-tauri/tests/commands/claude_turn_test.rs`) no longer points here. — claude_turn_test.rs:330-332 now names `cancel_reaches_a_child_forked_during_the_kill`, and the `.scratch/.../07-...` path is gone.

## Checks run by the reviewer

- Test files: `cargo test --manifest-path src-tauri/Cargo.toml --test commands_test claude_turn_test` exited 0 with 23 passed. These are the tests of turn.rs, the only source file changed. The test verdict rests on `src-tauri/tests/commands/claude_turn_test.rs`, plus the probe binaries above: the pre-fix one failed 9 of 10, the fixed one passed 15 of 15.
- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `cargo clippy --all-targets --locked -- -D warnings` (in src-tauri): exit 0.
- No ts-rs DTO changed, and `src/lib/contracts/generated` is untouched. No frontend or layer-baseline changes.
- Scope: the diff touches only turn.rs, its test file and the discovery record.
- Spec/ADR-0038: "cancel kills the process" still holds, and the change does not affect any documented decision.
- Note: the worktree builds into the shared `brain/src-tauri/target`. A first `cargo test` probe against the pre-fix code passed 3 of 3, and cargo recompiled between runs. A binary that was built and then copied aside reproduced the race, so trust copied binaries over in-place reruns.

## Findings

1. minor, src-tauri/src/commands/claude/turn.rs:162-175. The second kill waits only for the leader to exit. If the process forking during the first `killpg` is not the leader (for example a Bash tool's shell, a grandchild of `claude`, forking a command), the leader can exit and the second `killpg` can run before that fork finishes. The new child is then missed again and holds stdout until it exits. This is out of this Issue's test scope and the build report states it. Fix: none needed here. Optionally file a follow-up Issue, for example one that repeats `killpg` from the reader thread while the run is listed and the leader is unreaped.
2. nit, src-tauri/tests/commands/claude_turn_test.rs:349-371. No test covers the guard where the run has already left the map and no second signal is sent (the reused-group case). It is hard to make that case happen on purpose. Fix: none required. The invariant is documented at turn.rs:143-145 and turn.rs:165-166.
3. nit, .scratch/claude-code-integration/issues/07-cancel-misses-a-child-forked-during-killpg.md (criterion 2). The criterion's wording says "after the leader is reaped". The code kills after the leader exits, before it is reaped. That is the stronger choice. Killing after the reap is not possible in this design anyway: `finish` reaps only after stdout reaches EOF, and the missed child holds stdout open. Killing before the reap keeps the group id reserved. Fix: no code change.

## Resolution

1. Accepted as a known limit, no code change in this Issue. The second `killpg` covers the leader forking during the first kill, which is what the Issue and its test target. A non-leader process forking during the kill is a separate case; the main session can file a follow-up Issue for it.
2. Accepted, no test added. The reused-group guard cannot be triggered deterministically, and the invariant is documented at turn.rs:143-145 and 165-166.
3. Accepted, no code change. Killing after the leader exits and before the reap is the stronger form of criterion 2 and keeps the group id reserved.
