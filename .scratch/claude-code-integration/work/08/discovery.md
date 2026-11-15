# Issue 08 discovery: real stream-json fixture

## Files that change

- `src-tauri/tests/fixtures/claude/stream.ndjson` (26 hand-written lines): replaced byte for byte by `.scratch/claude-code-integration/research/stream-json-capture/turn.ndjson` (30 lines, trailing newline).
- `src-tauri/tests/commands/claude_stream_test.rs`
  - :1-3 module doc says the fixture holds "one line of every type the CLI prints"; now it is a real capture.
  - :16-47 `recorded_stream_maps_to_events_in_order`: expected events change to the capture's values (session `0bf03d03-...`, `slash_commands` `[code-review, hello, init]`, skills `[code-review]`, one `ToolStart` Read `{file_path: /vault/notes/hello.md}`, its `ToolResult` with the line-numbered content, one `TextDelta`, `Result` cost 0.2596148, 2 turns). No `ThinkingDelta`, no leading text.
  - :49-83 `each_recorded_line_type_is_handled`: the allowlist of silent kinds gains `system/hook_started` and `system/hook_response`.
  - New test: every `system` line in the fixture other than `init` maps to no event, and the fixture holds `hook_started`, `hook_response` and `status` (so the test cannot pass on a fixture without them). Covers criterion 4.
  - New inline test for `thinking_delta`: the capture has no thinking block, so the old fixture was the only coverage of `ThinkingDelta`; keep it with a one-line input.
- `src-tauri/tests/commands/claude_turn_test.rs:290-322` reads the fixture but derives its expected events from `dispatch_line`, so it needs no change.

## Parser

`src-tauri/src/commands/claude/stream.rs:104-120` already maps any `system` subtype other than `init` to no event (`_ => Vec::new()`), and ignores the extra keys (`caller`, `tool_use_result`, `tool_result_meta`, `wire_tool_inputs`, `ttft_ms`, `modelUsage`). Expected: no source change; the Issue's Files is `src-tauri/tests/` only.

## Plan

1. Copy the capture over the fixture with `command cp -f`, verify with `cmp`.
2. Update the two fixture tests and add the two new ones in the same commit (the fixture alone turns the suite red).
3. `cargo test --manifest-path src-tauri/Cargo.toml --test` for the claude stream and turn tests, then the Issue gate `cargo test --manifest-path src-tauri/Cargo.toml`.

## Risks

- The real `assistant` line comes before `content_block_stop` of the same block; the exact-order test pins that order, which matches what the CLI sends.
- No frontend test reads the fixture (`grep` in `src/tests` finds none), so `pnpm check`/vitest are not in scope.

## Defaults taken

- Keep `ThinkingDelta` covered by an inline line instead of editing the capture, which the Issue says to copy unchanged.
