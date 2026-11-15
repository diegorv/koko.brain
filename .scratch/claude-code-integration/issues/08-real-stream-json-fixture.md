# 08: Replace the hand-written stream-json fixture with a real capture

**What to build:** Replace `src-tauri/tests/fixtures/claude/stream.ndjson`, written by hand in Issue 02, with the output of a real `claude -p ... --output-format stream-json --verbose --include-partial-messages` run, so a field renamed by the CLI fails the parser tests instead of reaching the panel.

**Blocked by:** 03

**Files:** src-tauri/tests/

**Status:** ready-for-agent

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml`

- [ ] The fixture is the real capture in `.scratch/claude-code-integration/research/stream-json-capture/turn.ndjson` (one turn that streams text, calls `Read` and ends in a `result`, personal values already replaced), copied over `src-tauri/tests/fixtures/claude/stream.ndjson` unchanged.
- [ ] The parser tests that read the fixture pass against it, or are updated to the fields the real stream sends.
- [x] Owner decision recorded in Notes: the capture needs a paid `claude` run on the owner's machine.
- [ ] The `system` events the CLI sends besides `init` (`hook_started`, `hook_response`, `status`) are skipped without an error event, tested against the fixture.

## Problem

Found by Issue 02's review (finding 6) and carried by Issue 03's Notes, which planned the capture for Issue 03's manual check. Issue 03 was delivered by an agent that cannot make a paid run, so the capture was not done (Issue 03 review, finding 5). A hand-written fixture only proves the parser reads what its author expected.

## Notes

- Owner decision (2026-11-15): the owner approved this Issue, which needs a paid run. The main session made it on the owner's machine with claude 2.1.325 in a temporary vault with one note (`notes/hello.md`): `claude -p --output-format stream-json --verbose --include-partial-messages --permission-mode bypassPermissions --no-session-persistence -- "Read notes/hello.md with the Read tool, then reply with its second line only."`, exit 0, 40 lines. The agent makes no `claude` run.
- Sanitized before commit: the vault path became `/vault` (also inside the `input_json_delta` chunks, rejoined and re-split into the same number of chunks), the home dir `/Users/user`; the `init` lists (`tools` MCP entries, `slash_commands`, `skills`, `plugins`, `mcp_servers`) were cut to neutral entries in the real shape; of 6 `SessionStart` hook pairs one `hook_started`/`hook_response` pair is kept, with `output`, `stdout` and `stderr` emptied. Everything else is as the CLI printed it.
- Differences from the hand-written fixture: no `thinking` block; the first message is a single `tool_use` block streamed in 10 `input_json_delta` chunks; `hook_started`/`hook_response` system events before `init`; `assistant.message.content[].caller`, `user.tool_use_result` and `user.tool_result_meta`; `init` and `result` carry many more keys (`capabilities`, `memory_paths`, `modelUsage`, `ttft_ms`, ...). Assertions on the old fixture's values (`sess-1`, `notes/a.md`, `Done.`) change to the capture's.
