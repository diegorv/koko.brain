# Issue 02 discovery: Rust turn runner

Builds on `work/01` (resolver, test helpers in `src-tauri/tests/commands/claude_test.rs`).

## Files that change

- `src-tauri/src/commands/claude.rs:86-121`: split out `resolve_claude(override, shell, candidates, timeout) -> Result<PathBuf, String>`; override check becomes "executable file named `claude`". Add `claude_run_turn` and `claude_cancel_turn` commands; `pub mod stream; pub mod turn;`.
- `src-tauri/src/commands/claude/stream.rs` (new): `ClaudeEvent` (ts-rs, `tag = "type"`, camelCase), `StreamState { saw_result }`, `dispatch_line(&str, &mut StreamState) -> Vec<ClaudeEvent>`.
- `src-tauri/src/commands/claude/turn.rs` (new): `ClaudeTurnRequest`, `ClaudeEventPayload { run_id, event }` (both ts-rs), `system_prompt`, `build_args`, `ClaudeRuns` (managed `Arc<Mutex<HashMap<run_id, Run>>>`), `run_turn_with(request, shell, candidates, sink)`, `cancel`.
- `src-tauri/src/events.rs`: `CLAUDE_EVENT = "claude-event"`. `src-tauri/src/lib.rs:319-324,391`: manage `ClaudeRuns`, register both commands.
- Frontend contract only: `contracts/events.ts` (name + `EventMap`), `contracts/commands.ts` (CommandMap + COMMAND_ARGS), `contracts/index.ts` (new generated types), generated bindings from `cargo test`.
- Tests: `src-tauri/tests/commands/claude_test.rs` (resolver: `claude` accepted, `sh` refused and not run), new `claude_stream_test.rs` and `claude_turn_test.rs` in `tests/commands/`, fixture `src-tauri/tests/fixtures/claude/stream.ndjson`.

## Plan

1. Resolver: override canonicalized, name must be `claude`, must be an executable file; else error, nothing run. `claude_status` reports it, `run_turn_with` returns it.
2. Parser (pure, test-first against the recorded fixture): `system/init` -> `Init` (slash_commands minus terminal_slash_commands); `stream_event` `content_block_delta` `text_delta`/`thinking_delta` -> deltas (`input_json_delta` ignored); `assistant` `tool_use` blocks -> `ToolStart`; `user` `tool_result` -> `ToolResult` (summary = first 500 chars, text blocks joined); `result` -> `Result` + `saw_result`. Non-JSON skipped and logged, unknown types ignored.
3. Runner: std threads (no new tokio features). `Command` with cwd = vault, `CLAUDECODE` removed, stdin null, stdout/stderr piped, `process_group(0)`. stdout thread reads lines (`read_until`, lossy UTF-8) -> `dispatch_line` -> sink; stderr thread logs and keeps the last 20 lines. At stdout EOF: remove the run from the map (before `wait`, so `killpg` never targets a reaped pgid), wait, emit `Error` when exit != 0, no `result` and not cancelled, then `Done { exit_code }`.
4. Cancel: set the run's cancelled flag and `libc::killpg(pgid, SIGKILL)`; unknown/finished id is a no-op.
5. Commands: `claude_run_turn` runs resolve + spawn on `spawn_blocking` (login-shell lookup blocks up to 5 s), sink emits `CLAUDE_EVENT`.

## Prior art

- `tests/commands/claude_test.rs` `script()` helper for fake binaries; `commands/watcher.rs` for emit-from-callback.
- Wire-shape tests: `tests/ipc_contracts_test.rs`, `tests/commands/update_channel_test.rs`.

## Defaults taken

- "Canonicalized path named `claude`": the parent directory is canonicalized and the file name is kept, so the native installer's `~/.local/bin/claude -> .../versions/2.1.325` symlink is accepted (canonicalizing the whole path would name it `2.1.325` and refuse the owner's own install). A relative override fails canonicalization and is refused. `ClaudeStatus.path` keeps reporting the override as typed.
- Errors before a run exists (bad binary, a run already active for the vault) return `Err`; once a `run_id` exists everything is events, so a spawn failure emits `Error` then `Done { exitCode: null }` and the command returns the id.
- A cancelled run emits no `Error`, only `Done { exitCode: null }`.
- Blank `model` / `resume_session_id` count as unset.
- Found while building: `codemap.test.ts` (test 41) fails for an emitted event with no frontend listener, so `onClaudeEvent` (typed `on(EVENT_NAMES.CLAUDE, ...)`) lands in `features/claude-code/claude-code.service.ts` now, for Issue 03 to consume. The E2E mock gets `claude_run_turn` (throws) and `claude_cancel_turn` (no-op), since `Handlers` must cover `CommandMap`.

## Risks

- Events for a run can reach the frontend before `invoke` resolves with its `run_id` (spawn-failure events always do). Issue 03 should accept events for a run it has not seen the id of yet.
- A prompt starting with `-` would be read by the CLI as an option (AC fixes the arg order `-p <prompt>`).
- Recorded lines are hand-written from the spec's probe description (no paid CLI run in tests).
