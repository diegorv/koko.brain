# Issue 13 discovery: session from Init, error cause, stopped tool cards, retried and non-streamed text

Both sides. Builds on `work/02` (stream parser) and `work/03` (reducer, panel).

## CLI bundle check (claude 2.1.325, `readlink -f ~/.local/bin/claude` -> `~/.local/share/claude/versions/2.1.325`)

- `abandoned_blocks` is a **top-level** field of the `stream_event` line, beside `event` and `api_message_id` (builder `sr(...)` and `Jo(...)` in the bundle: `{type:"stream_event",event:{type:"message_stop"},...,api_message_id,abandoned_blocks:{api_message_id,from_block_index}}`), not inside `event`.
- `abandoned_blocks.api_message_id` is the response's `event.message.id` from its `message_start` (= `message.id` of its assistant messages); `from_block_index` is a `content_block_*` `event.index`; blocks at that index and above never get an assistant message. 0 means the whole response.
- Error results (`subtype` one of `error_during_execution`, `error_max_turns`, `error_max_budget_usd`, `error_max_structured_output_retries`) carry `errors: string[]` and no `result` field.

## Files that change

- `src-tauri/src/commands/claude/stream.rs`
  - `ClaudeEvent`: new `TextRetracted { text }` (text already sent as `TextDelta` to remove from the end of the reply). Regenerates `src/lib/contracts/generated/ClaudeEvent.ts`.
  - `StreamState` (`:86`): private `message_id` (from `message_start`), `block_text: BTreeMap<u64, String>` (text streamed per block of that response), `streamed: HashSet<String>` (message ids that had a `text_delta`).
  - `dispatch_line` `stream_event` arm (`:106`): `message_start` resets the response; `text_delta` records the text; `message_stop` with `abandoned_blocks` naming the current response emits `TextRetracted` with the joined text of blocks `>= from_block_index`.
  - `assistant` arm (`:107`, `tool_starts` `:150`): blocks in order; `tool_use` -> `ToolStart` as today; `text` -> `TextDelta` when the message id never streamed a `text_delta` and `parent_tool_use_id` is null (subagent messages are never streamed and must not land in the reply).
  - `result` arm (`:109-118`): when `is_error` and `result` is empty, text = `errors` joined with `\n`, else `subtype`.
- `src/lib/features/claude-code/claude.logic.ts`: `Init` sets `sessionId` (`:122`); `TextRetracted` strips the suffix from the last text part (drops it when empty); `Done` (`:154`) marks the reply's `running` tool cards `stopped`; `ToolPart.status` gains `'stopped'`.
- `src/lib/features/claude-code/ClaudePanel.svelte:235`: label `stopped`.
- Tests: `src-tauri/tests/commands/claude_stream_test.rs` (+ hand-written fixtures `fixtures/claude/{retry,non-streamed,error-during-execution}.ndjson` in the 2.1.325 shape), `claude.logic.test.ts`, `claude.service.test.ts` (Init, Done, next request resumes), `ClaudePanel.test.ts` (stopped label).

## Prior art

- `dispatch_all` helper and `recorded_stream_maps_to_events_in_order` in `claude_stream_test.rs`; `event(running(), ...)` helper in `claude.logic.test.ts`; `resumes the session of the last Result` in `claude.service.test.ts:66`; tool card test at `ClaudePanel.test.ts:201`.

## Existing tests whose expectation changes (behavior the Issue asks for)

- `init ... leaves the session to Result` (logic): now stores the Init id.
- `error_result_without_text_or_cost` (Rust): text becomes `error_max_turns`.
- `tool_start_comes_from_the_assistant_message_not_partial_json` (Rust): its never-streamed `text` block `x` now yields `TextDelta x` before the tool starts.

## Risks and defaults

- Retracted text is a suffix of the reply: abandoned blocks have no assistant message, so no tool card sits between their text and the end. When the last text part does not end with it, nothing is removed.
- A retry may repeat blocks below `from_block_index`; the schema states nothing about them, so they stay.
- An error result text was, and stays, also appended as reply text when nothing streamed (`claude.logic.ts:145-147`); not changed here.
- `stdout lines are not logged` (Problem 2) is not an acceptance criterion; not changed.
