# Discovery: Issue 01, a resume whose session is gone starts over

## Files that change

- `src/lib/features/claude-code/claude.logic.ts:152-160` (`applyEvent`, `Result` case): today it keeps `event.sessionId || state.sessionId`, so the dead id is resumed again on every send.
- `src-tauri/tests/commands/claude_stream_test.rs`: new test next to `error_result_without_text_shows_the_errors` (line 217). No change to `stream.rs`: `result_message` (`stream.rs:155-162`) already joins `errors` when `result` is missing.
- Tests: `src/tests/lib/features/claude-code/claude.logic.test.ts` (Result cases at 130-182), `claude.service.test.ts` ("resumes the session of the last Result", line 65: same shape, asserts `resumeSessionId` undefined), `ClaudePanel.test.ts` ("shows an Error event inline", line 241: same shape, asserts `[data-claude-error]` text).
- No change to `ClaudePanel.svelte` or `claude.store.svelte.ts`: the panel already shows `claudeStore.error` as one `<p role="alert" data-claude-error>` (`ClaudePanel.svelte:256-257`), and `sessionId` flows from the reducer to `claude.service.ts:37`.

## Plan

1. Rust test: the G3 line built inline (no `result` key) gives `Result { text: "No conversation found with session ID: <id>", is_error: true, num_turns: Some(0), session_id: <id>, cost_usd: None }`. Expected green on today's code.
2. Failing tests first (logic, service, panel), then in `claude.logic.ts`:
   - an exported `SESSION_GONE` message constant with the Issue's exact text;
   - a private check: `isError && numTurns === 0 && text.startsWith('No conversation found with session ID')`;
   - in the `Result` case, when it holds: `sessionId: null`, `error: SESSION_GONE`, messages untouched. Otherwise today's path.
3. Targeted checks: `pnpm check`, the three vitest files, `cargo test --manifest-path src-tauri/Cargo.toml --test <crate test target>` for the stream test file.

## Defaults taken

- The line shows through the existing inline error (`error` field), so it uses the alert styling and the turn ends with `status: 'error'` after `Done`. The Issue asks for "one line in place of the CLI's error text"; a separate neutral notice would need new state and markup for no criterion. The next `beginTurn` clears it as it clears any error.
- Text check uses the prefix without the trailing colon and space, as the Issue writes it for the reducer.
- `numTurns === null` does not match (only an explicit 0), per the Issue.
- An `Init` cannot re-set the dead id: G3 says no `system/init` comes for this failure.

## Risks

- A later CLI that rewords the message falls back to today's behavior (shows the CLI text, keeps the id). Acceptable: the Rust test pins the 2.1.325 shape.
