# 13: Stream and chat keep the session, the error cause and retried text right

**What to build:** The chat records the session id from `Init`, shows the cause of an error result, closes tool cards left open when a turn ends, and shows a reply that the CLI retried or re-sent without streaming exactly once.

**Blocked by:** 12

**Files:** src-tauri/src/commands/claude/stream.rs,src-tauri/src/commands/claude/turn.rs,src-tauri/tests/,src/lib/contracts/generated/,src/lib/features/claude-code/,src/tests/lib/features/claude-code/

**Status:** ready-for-agent

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml` (commit the regenerated `src/lib/contracts/generated/` if a `ClaudeEvent` changes), `pnpm check`, `pnpm vitest run`.

- [ ] Failing tests first for each criterion, in `claude.logic` tests, `claude_stream_test.rs` or both.
- [ ] Session: the reducer stores `sessionId` from `Init` as well as from `Result`, so a first turn that is stopped or exits with no `result` still lets the next send pass `--resume` with it. Test: `Init` then `Done` with no `Result`, then the next request carries that id.
- [ ] Error cause: for a `result` with `is_error: true` and no or empty `result` text, `Result.text` is the `errors` strings joined with newlines; when there are none, the `subtype` (`error_during_execution`, `error_max_turns`, ...). The panel shows it instead of "Claude ended the turn with an error." Tested with a fixture line for `error_during_execution` with `errors`.
- [ ] Tool cards: on `Done`, every tool card of that reply still `running` gets a final status shown as "stopped" in the panel. Test: `ToolStart`, then `Done` with no `ToolResult`.
- [ ] Retried stream: when the CLI ends a message with its own `message_stop` carrying `abandoned_blocks` and then retries (a new `message_start`), the text streamed for the abandoned blocks is removed, so the reply shows the retried text once. Tested with fixture lines in that shape.
- [ ] Non-streamed fallback: a `text` block in an `assistant` message whose text was not streamed (no `text_delta` for that message) reaches the panel as text. Tested with fixture lines.
- [ ] A test covers `slash_commands` minus `terminal_slash_commands` in `init_event`: the real capture's lists do not overlap, so the filter can be deleted today with every test green. Use a small inline line, not the fixture.

## Problem

From the PR #247 review (2026-11-15), confirmed by verifiers:

1. `sessionId` is set only from `Result` (`src/lib/features/claude-code/claude.logic.ts:143-144`); `Init`'s id is dropped (`:122-123`). A stopped or crashed first turn leaves it null, so the next send starts a new CLI session without the exchange the panel still shows. A later stopped turn very likely keeps context, since `--resume` reuses the id.
2. `dispatch_line` (`src-tauri/src/commands/claude/stream.rs:109-118`) builds `Result` from the `result` field only, dropping `errors` and `subtype`; `saw_result` then suppresses the stderr-based error, and stdout lines are not logged, so the cause is lost.
3. A tool card whose `ToolResult` never arrives (Stop during a tool) stays "running" after `Done` (`claude.logic.ts:131-142`).
4. `delta_event` (`stream.rs:138-148`) ignores `message_stop` and its `abandoned_blocks`, and `tool_starts` (`stream.rs:150-158`) keeps only `tool_use` blocks. The claude 2.1.325 bundle's `stream_event` schema describes `abandoned_blocks` on a `message_stop` Claude Code produces when the API stream fails, stalls or ends early, followed by a retry (new `message_start`), the same request without streaming (assistant messages under another id, no `message_start`), an error message, or nothing. A retry appends its deltas to the partial text (duplicated text); a non-streamed fallback loses its text whenever the reply already has a text part (`claude.logic.ts:145-147`). The schema marks the field `@internal`: read the installed CLI bundle (`readlink -f ~/.local/bin/claude`) to confirm the field names before building on them, and note what you found.
5. `init_event` subtracts `terminal_slash_commands` from `slash_commands`; no test covers it since Issue 08 replaced the fixture.
