# 02: Rust turn runner: spawn, NDJSON to events, cancel

**What to build:** Rust commands `claude_run_turn` and `claude_cancel_turn` in `src-tauri/src/commands/claude.rs`. A turn spawns the resolved binary in the vault directory with full permissions, parses stdout NDJSON into a normalized `ClaudeEvent` and emits each event to the frontend; cancel kills the process.

**Blocked by:** 01

**Status:** ready-for-agent

**Gate:** Both (new ts-rs DTOs).

- [ ] `claude_run_turn(request: ClaudeTurnRequest) -> String` returns a `run_id` immediately and streams on a background task. Request fields: `vault_path`, `prompt`, `resume_session_id` (optional), `model` (optional), `context_note_paths` (vault-relative, may be empty).
- [ ] Args: `-p <prompt> --output-format stream-json --verbose --include-partial-messages --permission-mode bypassPermissions`, plus `--resume <id>` and `--model <m>` when set, plus `--append-system-prompt <text>` built from the vault root and `context_note_paths`. The prompt is passed exactly as typed: a leading `/name` must stay first so the CLI expands the skill or command (spec, Verified CLI behavior). The args builder and the system-prompt text are pure functions with unit tests, including an empty context list (the system prompt still names the vault root) and a prompt starting with `/`.
- [ ] Spawn with cwd = `vault_path`, `CLAUDECODE` removed, stdin closed, stdout and stderr piped separately. stderr lines go to `debug_log` and, when the process exits non-zero with no `result`, into the `Error` event text.
- [ ] `ClaudeEvent` (`#[ts(export)]`, tagged enum): `Init { session_id, model, slash_commands, skills }` (`slash_commands` minus `terminal_slash_commands`), `TextDelta { text }`, `ThinkingDelta { text }`, `ToolStart { id, name, input }`, `ToolResult { id, is_error, summary }`, `Result { session_id, text, is_error, cost_usd, num_turns }`, `Error { message }`, `Done { exit_code }`. Emitted on a new `CLAUDE_EVENT` constant in `src-tauri/src/events.rs` with payload `{ run_id, event }`. `Done` is always the last event of a run, also after a kill or a spawn failure.
- [ ] Parsing (`dispatch_line(&str, &mut State) -> Vec<ClaudeEvent>`) is pure and tested with recorded lines for every type listed in the spec, plus a non-JSON line (skipped, logged) and an unknown `type` (ignored).
- [ ] `ToolStart` comes from the `assistant` message `tool_use` blocks, not from partial `input_json_delta` chunks, so `input` is complete.
- [ ] `claude_cancel_turn(run_id)` kills the child and its process group and is a no-op for an unknown or finished run. Runs live in managed state keyed by `run_id`; a finished run removes itself.
- [ ] Integration test with a fake `claude` script that prints a fixed NDJSON sequence and checks the emitted events in order; one with a script that sleeps, cancelled mid-run, ends in `Done`.

## Notes

- One run per vault at a time: a second `claude_run_turn` while one runs returns an error.
- `ToolResult.summary` is the first 500 chars of the tool result content, to keep events small.
- The user's settings sources stay at the CLI default so skills, plugins, hooks and MCP servers load as in the terminal. Do not pass `--setting-sources`, `--strict-mcp-config` or `--tools`.
