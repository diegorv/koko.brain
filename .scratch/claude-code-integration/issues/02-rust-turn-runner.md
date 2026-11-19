# 02: Rust turn runner: spawn, NDJSON to events, cancel

**What to build:** Rust commands `claude_run_turn` and `claude_cancel_turn` in `src-tauri/src/commands/claude.rs`. A turn spawns the resolved binary in the vault directory with full permissions, parses stdout NDJSON into a normalized `ClaudeEvent` and emits each event to the frontend; cancel kills the process.

**Blocked by:** 01

**Status:** resolved

**Gate:** Both (new ts-rs DTOs).

- [x] `claude_run_turn(request: ClaudeTurnRequest) -> String` returns a `run_id` immediately and streams on a background task. Request fields: `vault_path`, `prompt`, `resume_session_id` (optional), `model` (optional), `context_note_paths` (vault-relative, may be empty).
- [x] Args: `-p <prompt> --output-format stream-json --verbose --include-partial-messages --permission-mode bypassPermissions`, plus `--resume <id>` and `--model <m>` when set, plus `--append-system-prompt <text>` built from the vault root and `context_note_paths`. The prompt is passed exactly as typed: a leading `/name` must stay first so the CLI expands the skill or command (spec, Verified CLI behavior). The args builder and the system-prompt text are pure functions with unit tests, including an empty context list (the system prompt still names the vault root) and a prompt starting with `/`.
- [x] The binary is resolved in Rust with Issue 01's resolver (request field `binary_path`: the Settings override, may be empty), never spawned from a raw renderer path. The resolver, used by both `claude_status` and `claude_run_turn`, accepts an override only when its canonicalized path is an executable file named `claude`; otherwise `claude_status` reports the error and `claude_run_turn` returns it without spawning. Tested with a fake executable named `claude` (accepted) and one named `sh` (refused, `claude_status` runs nothing).
- [x] Spawn with cwd = `vault_path`, `CLAUDECODE` removed, stdin closed, stdout and stderr piped separately. stderr lines go to `debug_log` and, when the process exits non-zero with no `result`, into the `Error` event text.
- [x] `ClaudeEvent` (`#[ts(export)]`, tagged enum): `Init { session_id, model, slash_commands, skills }` (`slash_commands` minus `terminal_slash_commands`), `TextDelta { text }`, `ThinkingDelta { text }`, `ToolStart { id, name, input }`, `ToolResult { id, is_error, summary }`, `Result { session_id, text, is_error, cost_usd, num_turns }`, `Error { message }`, `Done { exit_code }`. Emitted on a new `CLAUDE_EVENT` constant in `src-tauri/src/events.rs` with payload `{ run_id, event }`. `Done` is always the last event of a run, also after a kill or a spawn failure.
- [x] Parsing (`dispatch_line(&str, &mut State) -> Vec<ClaudeEvent>`) is pure and tested with recorded lines for every type listed in the spec, plus a non-JSON line (skipped, logged) and an unknown `type` (ignored).
- [x] `ToolStart` comes from the `assistant` message `tool_use` blocks, not from partial `input_json_delta` chunks, so `input` is complete.
- [x] `claude_cancel_turn(run_id)` kills the child and its process group and is a no-op for an unknown or finished run. Runs live in managed state keyed by `run_id`; a finished run removes itself.
- [x] Integration test with a fake `claude` script that prints a fixed NDJSON sequence and checks the emitted events in order; one with a script that sleeps, cancelled mid-run, ends in `Done`.

## Notes

- One run per vault at a time: a second `claude_run_turn` while one runs returns an error.
- `ToolResult.summary` is the first 500 chars of the tool result content, to keep events small.
- The user's settings sources stay at the CLI default so skills, plugins, hooks and MCP servers load as in the terminal. Do not pass `--setting-sources`, `--strict-mcp-config` or `--tools`.

## Comments

- 2026-11-14, branch issue/02-rust-turn-runner: Rust turn runner (resolver override check, stream-json parser into ClaudeEvent, claude_run_turn/claude_cancel_turn with process-group kill, CLAUDE_EVENT). Fix round: Done is sent even when a leftover process keeps stderr open (stderr drain timeout). Tests at 35eee8f73: full vitest exit 0 (639 files, 16960 passed, 54 skipped, 1 todo); cargo test exit 0 (1507 passed); clippy -D warnings exit 0; pnpm check 0 errors. Reviews: round 1 APPROVED, round 2 APPROVED (one nit left open: stderr tail dropped when the drain times out).
