VERDICT: APPROVED

Re-review, round 2, of fix commit 811943fd6 (`git diff 813c7d947..HEAD`): `claude.logic.ts`, `claude.logic.test.ts`, `stream.rs`, `claude_stream_test.rs`, `spec.md`, plus the Resolution in `review.md`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `claude.logic.ts:155` adds the `Result` text to the reply only when `!event.isError`; `:158` still sets `error` from the text. New test "Result with isError on an empty reply shows its cause only as the error, not as reply text" asserts `error === 'error_max_turns'` and `messages` unchanged; with the old condition the reply would gain a text part, so it fails before the fix. The non-error path (fallback text on a non-streamed success) is unchanged. |
| 2 | nit | resolved | `stream.rs:182-185` inserts into `streamed` only a known, non-empty id. The Resolution's correction holds: in `assistant_events` (`stream.rs:218-219`) a real-id message is looked up by its own id, which was never inserted in either version, so it resends either way; the `""` entry only matched an `assistant` message without `id` (`unwrap_or_default()`), hiding its text. New test `text_delta_with_no_known_response_does_not_hide_an_assistant_message_text` returns `vec![]` under the old code and the `TextDelta` now. |
| 3 | nit | rejection stands | No change was asked; the known limit is recorded in `discovery.md`. |
| 4 | nit | resolved | `spec.md:40` now says the `--resume` session comes from the previous turn's `system/init` and its `result`. |

## Acceptance criteria re-checked

- [met] Failing tests first for each criterion, in `claude.logic` tests, `claude_stream_test.rs` or both. — Both fixes come with a test that fails on the pre-fix code (traced above); no existing test was changed or deleted in 811943fd6 (the diff only adds tests).
- [met] Session: the reducer stores `sessionId` from `Init` as well as from `Result`, so a first turn that is stopped or exits with no `result` still lets the next send pass `--resume` with it. Test: `Init` then `Done` with no `Result`, then the next request carries that id. — Untouched by the fix except the spec sentence; `Result` still keeps `event.sessionId || state.sessionId` (`claude.logic.ts:153`); the service test passes.
- [met] Error cause: for a `result` with `is_error: true` and no or empty `result` text, `Result.text` is the `errors` strings joined with newlines; when there are none, the `subtype` (`error_during_execution`, `error_max_turns`, ...). The panel shows it instead of "Claude ended the turn with an error." Tested with a fixture line for `error_during_execution` with `errors`. — `result_message` unchanged; the cause is still the `error` (`claude.logic.ts:158`) shown in `[data-claude-error]`, now without a duplicate reply bubble; the fixture test and the panel tests pass.
- [met] Non-streamed fallback: a `text` block in an `assistant` message whose text was not streamed (no `text_delta` for that message) reaches the panel as text. Tested with fixture lines. — The fix widens it: an id-less `assistant` message after an id-less delta now reaches the panel; `non_streamed_fallback_sends_its_text_and_tools` and `streamed_text_is_not_sent_again_by_its_assistant_message` still pass.

## Findings

None open or new.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/claude-code/`: exit 0, 7 files, 136 tests passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --test commands_test claude_`: exit 0, 102 passed.
- Scope: the fix commit touches only Issue files and the workflow's own records; no layer-baseline or composition-root change; no `#[ts(export)]` type changed, so no binding regeneration is needed.
- The full suites were not run: deliver runs them.
