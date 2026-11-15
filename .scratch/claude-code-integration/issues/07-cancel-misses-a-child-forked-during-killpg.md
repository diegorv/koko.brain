# 07: Cancel misses a child forked during `killpg`

**What to build:** Make `claude_cancel_turn` reach every process of the turn's group, including one the CLI forks while the first `killpg` runs, so a cancelled turn ends in `Done` at once instead of when that process exits.

**Blocked by:** 05

**Files:** src-tauri/

**Status:** ready-for-agent

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml`

- [ ] Failing test first: Issue 02's original cancel script (`echo '<init>'; sleep 30; echo 'never'`, no `exec`) run through `run_turn_with` with Issue 05's system-PATH env, cancelled after `Init`, ends in `Done { exit_code: None }` within a few seconds. Today it ends after 30 s.
- [ ] `kill_group` in `src-tauri/src/commands/claude/turn.rs` sends `SIGKILL` to the group again after the leader is reaped, or repeats `killpg` until it returns `ESRCH`, without signalling a reused group id.
- [ ] The comment on `sleeping_run_cancelled_mid_run_ends_in_done` (`src-tauri/tests/commands/claude_turn_test.rs`) no longer points here.

## Problem

Found by Issue 05's review (`.scratch/claude-code-integration/work/05/review.md`, finding 1). With the short child PATH Issue 05 gives `claude`, Issue 02's original cancel test reached `Done` only after 30 s in 3 of 3 runs: `sh` forks `sleep` while `killpg` runs, the new child misses `SIGKILL` and keeps stdout open. Issue 05 changed the test to fork the grandchild before `Init`, which still proves the group kill but no longer exposes the race. In production a cancel that lands while `claude` forks a tool or an MCP server hits the same path.
