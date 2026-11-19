# 01: A resume whose session is gone keeps the chat and starts a new session

**What to build:** When the CLI answers a `--resume` with "No conversation found", the chat drops its session id, keeps its messages, and says the next message starts without the earlier context.

**Blocked by:** none

**Files:** src-tauri/tests/commands/claude_stream_test.rs,src/lib/features/claude-code/,src/tests/lib/features/claude-code/

**Status:** resolved

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm check`, `pnpm vitest run`.

- [x] Failing tests first in `claude.logic` and panel tests.
- [x] Rust test in `claude_stream_test.rs`: the line from synthesis G3 (`type` `result`, `subtype` `error_during_execution`, `is_error` true, `num_turns` 0, `duration_ms` 0, `session_id`, one `errors` string starting `No conversation found with session ID: `, no `result` key), built inline, gives `Result { text` starting with that prefix, `isError` true, `numTurns` 0, `sessionId` the id `}` (`stream.rs:155-162` joins `errors` when `result` is missing). Expected to pass on today's code; it pins the shape the frontend relies on.
- [x] Reducer: a `Result` with `isError`, `numTurns` 0 and text starting `No conversation found with session ID` sets `sessionId` to null and keeps `messages`; the next send carries no `resumeSessionId`.
- [x] A zero-turn error `Result` with any other text keeps `sessionId`.
- [x] The panel shows, in place of the CLI's error text, one line: "The earlier conversation is no longer available to Claude. Your next message starts a new one."

## Notes

- Evidence: `research/synthesis.md` G3 and G6. Today the panel keeps the dead id (`claude.logic.ts:153`), so every later send fails the same way until New chat. No extra `Error` event comes, because `saw_result` suppresses it (`turn.rs:302`).
- Useful now (a session pruned after 30 days in a chat kept open), and needed by Issue 02, where restored chats carry old ids.
- **Delivery:** onto `mvp-claude` (relay-lite base `mvp-claude`), then merged into `preview`; see `spec.md`.

## Comments

- 2026-11-16, `issue/01-gone-session-starts-over` onto `mvp-claude`: the reducer drops `sessionId` (and keeps the chat) on a zero-turn error `Result` whose text starts `No conversation found with session ID`, and shows "The earlier conversation is no longer available to Claude. Your next message starts a new one."; a Rust test pins the CLI's stream shape. Tests: `cargo test` exit 0 (1559 passed, 0 failed, 13 ignored); `pnpm vitest run` exit 0 (17111 passed, 54 skipped, 1 todo). Review round 1: APPROVED; deliver ran the missing cargo gate (finding 1) and left both nits (see `work/01/review.md` Resolution).
