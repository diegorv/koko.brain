VERDICT: APPROVED

## Acceptance criteria

- [met] The fixture is the real capture in `.scratch/claude-code-integration/research/stream-json-capture/turn.ndjson` (one turn that streams text, calls `Read` and ends in a `result`, personal values already replaced), copied over `src-tauri/tests/fixtures/claude/stream.ndjson` unchanged. — `cmp src-tauri/tests/fixtures/claude/stream.ndjson .scratch/claude-code-integration/research/stream-json-capture/turn.ndjson` exits 0 (30 lines). A scan of the fixture for home dirs, user names, emails and temp paths finds only the neutral `/Users/user` and `/tmp/cc-socks/1.sock` (line 3, `init`).
- [met] The parser tests that read the fixture pass against it, or are updated to the fields the real stream sends. — `claude_stream_test.rs:21-55` pins the capture's events (Init with session `0bf03d03-...`, filtered `slash_commands`, ToolStart Read `/vault/notes/hello.md`, its ToolResult, one TextDelta, Result cost 0.2596148, 2 turns); `:87-123` allowlists `system/hook_started` and `system/hook_response`. `claude_turn_test.rs:290-322` derives its expectation from the fixture and is unchanged. `cargo test --manifest-path src-tauri/Cargo.toml --test commands_test claude_`: exit 0, 84 passed (13 of them `claude_stream`). The parser in `src-tauri/src/commands/claude/stream.rs` needed no change: it reads none of the extra keys (`caller`, `tool_use_result`, `modelUsage`, ...) and maps every non-init `system` subtype to no event (`:104-120`). The full suite is deliver's to run.
- [met] Owner decision recorded in Notes: the capture needs a paid `claude` run on the owner's machine. — Issue Notes, first bullet ("Owner decision (2026-11-15) ..."), already ticked on `mvp-claude`; the branch makes no `claude` run.
- [met] The `system` events the CLI sends besides `init` (`hook_started`, `hook_response`, `status`) are skipped without an error event, tested against the fixture. — `claude_stream_test.rs:57-78` `recorded_system_events_other_than_init_are_skipped` first asserts the fixture holds all three subtypes (so it cannot pass vacuously on a fixture without them; the fixture has them at lines 1, 2, 4 and 22), then asserts `dispatch_line` returns an empty vec for each, which rules out an `Error` event, and that `saw_result` stays false.

## Findings

1. nit, `src-tauri/tests/commands/claude_stream_test.rs:1-5`: the module doc says the fixture has "the vault path, home dir and `init` lists replaced by neutral values", but the sanitizing also cut the six `SessionStart` hook pairs to one and emptied their `output`/`stdout`/`stderr` (Issue Notes). "so a field the CLI renames fails these tests" also claims more than a frozen capture proves: it pins the parser to claude 2.1.325's shape, and a rename in a later CLI version fails only after a re-capture. Fix: name the hook trimming and say the fixture pins the 2.1.325 stream shape.

## Other checks

- Typecheck: `pnpm check` in the worktree, exit 0 (0 errors, 0 warnings). No frontend file changed.
- Test verdict rests on `src-tauri/tests/commands/claude_stream_test.rs` (changed) and `src-tauri/tests/commands/claude_turn_test.rs` (reads the fixture), run through `--test commands_test claude_`.
- ts-rs bindings: the worktree is clean after `cargo test`, so `src/lib/contracts/generated/` did not change.
- Scope: the diff touches only `src-tauri/tests/` and the Issue's own `work/08/discovery.md`, which matches the Issue's Files. No layer baseline or composition-root change.
- `thinking_delta_maps_to_thinking_event` (`:80-85`) keeps `ThinkingDelta` covered now that the capture has no thinking block. Leaving the capture unchanged for this was the right call.

## Resolution

1. Fixed: the module doc of `src-tauri/tests/commands/claude_stream_test.rs` now names the hook trimming (the `SessionStart` pairs cut to one, `output`/`stdout`/`stderr` emptied) and says the fixture pins the claude 2.1.325 stream shape, so a later rename fails only after a re-capture.
