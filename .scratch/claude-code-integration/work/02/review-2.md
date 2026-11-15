VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `turn.rs:212-215`: the stderr reader runs on a detached thread and sends its tail over an `mpsc` channel. `turn.rs:253-257`: after `child.wait()`, `finish` takes the tail with `recv_timeout(STDERR_DRAIN_TIMEOUT)` (2 s, `turn.rs:28`) and otherwise logs and goes on with an empty tail, so `Done` is bounded by about 2 s after claude exits. New test `grandchild_holding_stderr_does_not_hold_back_done` (`claude_turn_test.rs:229-246`) runs `sleep 8 >/dev/null &`, which holds stderr but not stdout, and asserts `Done { exitCode: 0 }` within 5 s, that `Done` comes last (`collect_until_done`), and `runs.is_empty()`. The 5 s bound sits below the 8 s sleep, so the test fails without the fix. It passes here. A late `send` on the dropped receiver is ignored (`let _ =`), and the detached thread ends when the grandchild closes the pipe. |
| 2 | minor | rejection stands | The fix needs either a different arg order than the criterion's `-p <prompt>` first, or a change in the panel. Both are owner choices. The deferral is real: `issues/03-claude-chat-panel.md` now has a criterion that requires an owner decision in Notes and a test. |
| 3 | minor | rejection stands | Accepted as an Issue 03 concern. Issue 03 now has a criterion to buffer events for an unseen `runId` until `claude_run_turn` resolves, with a test. The runner is unchanged and matches its documented contract (`turn.rs:165-168`). |
| 4 | minor (owner decision) | rejection stands | The finding itself asked the owner to confirm. The resolver is unchanged. The owner still has to confirm, or the spec sentence should change. It does not block this Issue. |
| 5 | nit | rejection stands | Recorded in Issue 03's Notes (always send one path form). |
| 6 | nit | rejection stands | No captured run is available in this step. Issue 03's Notes now say to replace the fixture during its manual check. |

## Acceptance criteria re-checked

- [met] Spawn with cwd = `vault_path`, `CLAUDECODE` removed, stdin closed, stdout and stderr piped separately. stderr lines go to `debug_log` and, when the process exits non-zero with no `result`, into the `Error` event text. — `turn_command` (`turn.rs:113-127`) is unchanged. `read_stderr` still logs every line, and `finish` still adds the tail on a non-zero exit with no result (`turn.rs:261-268`). `non_zero_exit_without_result_reports_stderr` passes. Only when stderr stays open past 2 s after exit is the tail missing (finding 1 below).
- [met] `ClaudeEvent` (`#[ts(export)]`, tagged enum): `Init { session_id, model, slash_commands, skills }` (`slash_commands` minus `terminal_slash_commands`), `TextDelta { text }`, `ThinkingDelta { text }`, `ToolStart { id, name, input }`, `ToolResult { id, is_error, summary }`, `Result { session_id, text, is_error, cost_usd, num_turns }`, `Error { message }`, `Done { exit_code }`. Emitted on a new `CLAUDE_EVENT` constant in `src-tauri/src/events.rs` with payload `{ run_id, event }`. `Done` is always the last event of a run, also after a kill or a spawn failure. — The fix changes no DTO. `Done` is still emitted last in `finish` (`turn.rs:276`) and now arrives on time even when a leftover process holds stderr (`grandchild_holding_stderr_does_not_hold_back_done`). The kill and spawn-failure tests still pass.
- [met] `claude_cancel_turn(run_id)` kills the child and its process group and is a no-op for an unknown or finished run. Runs live in managed state keyed by `run_id`; a finished run removes itself. — `ClaudeRuns::cancel` is unchanged. The removal at stdout EOF (`turn.rs:237`) still comes before `wait`, so `kill_group` never signals a reaped group. `sleeping_run_cancelled_mid_run_ends_in_done` and `cancel_of_an_unknown_run_is_a_no_op` pass. Before the fix, a finished run could go a long time with no `Done`. The 2 s bound now caps that gap.
- [met] Integration test with a fake `claude` script that prints a fixed NDJSON sequence and checks the emitted events in order; one with a script that sleeps, cancelled mid-run, ends in `Done`. — Both tests are unchanged and pass. One test was added and none were weakened or removed (the diff to `claude_turn_test.rs` only adds lines).

## Findings

1. **nit**, `src-tauri/src/commands/claude/turn.rs:254-257`. If the drain times out, the tail the reader has already collected is dropped along with the lines still to come. Then a run that exits non-zero with no `result` while a leftover process holds stderr gets an `Error` with only `claude exited with ...`, without the stderr lines the criterion asks for. This is rare (a crash while an MCP server is still alive), and the lines are still in `debug_log`. Fix if wanted: keep the tail in an `Arc<Mutex<VecDeque<String>>>` that the reader fills, and read it after the timeout instead of getting an empty deque.

## Checks run by the reviewer

Each read from its own exit status, in the worktree:

- `cargo test --manifest-path src-tauri/Cargo.toml --test commands_test claude`: exit 0, 51 passed, including `grandchild_holding_stderr_does_not_hold_back_done`.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings`: exit 0.
- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `git status` was clean after the runs. The fixes change no `#[ts(export)]` type, so the bindings were not regenerated.

The fix commit touches only `turn.rs`, its test, `review.md` and Issue 03's file. It adds no scope creep, no layer-baseline entry, no `BASELINE_SIZE` change and no composition root. The full suite was not run here: deliver runs it.
