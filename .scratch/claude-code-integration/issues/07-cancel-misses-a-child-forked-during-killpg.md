# 07: Cancel misses a child forked during `killpg`

**What to build:** Make `claude_cancel_turn` reach every process of the turn's group, including one the CLI forks while the first `killpg` runs, so a cancelled turn ends in `Done` at once instead of when that process exits.

**Blocked by:** 05

**Files:** src-tauri/

**Status:** resolved

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml`

- [x] Failing test first: Issue 02's original cancel script (`echo '<init>'; sleep 30; echo 'never'`, no `exec`) run through `run_turn_with` with Issue 05's system-PATH env, cancelled after `Init`, ends in `Done { exit_code: None }` within a few seconds. Today it ends after 30 s.
- [x] `kill_group` in `src-tauri/src/commands/claude/turn.rs` sends `SIGKILL` to the group again after the leader is reaped, or repeats `killpg` until it returns `ESRCH`, without signalling a reused group id.
- [x] The comment on `sleeping_run_cancelled_mid_run_ends_in_done` (`src-tauri/tests/commands/claude_turn_test.rs`) no longer points here.

## Problem

Found by Issue 05's review (`.scratch/claude-code-integration/work/05/review.md`, finding 1). With the short child PATH Issue 05 gives `claude`, Issue 02's original cancel test reached `Done` only after 30 s in 3 of 3 runs: `sh` forks `sleep` while `killpg` runs, the new child misses `SIGKILL` and keeps stdout open. Issue 05 changed the test to fork the grandchild before `Init`, which still proves the group kill but no longer exposes the race. In production a cancel that lands while `claude` forks a tool or an MCP server hits the same path.

## Comments

- 2026-11-15, branch `issue/07-cancel-misses-a-child-forked-during-killpg`: after the first `killpg`, a thread waits for the turn's leader to exit (`waitid` with `WNOWAIT`) and sends `SIGKILL` to the group again while the run is still listed, so a child forked during the first kill is reached and no reused group id is signalled. Added `cancel_reaches_a_child_forked_during_the_kill`. Tests: `pnpm vitest run` 643 files, 17069 passed, 54 skipped, 1 todo, exit 0; `cargo test` 1538 passed, 0 failed, 13 ignored, exit 0. Review round 1: APPROVED (1 minor, 2 nits, all accepted with no code change; a non-leader process forking during the kill is a possible follow-up).
