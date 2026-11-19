# 01: The slash menu shows each command's description

**What to build:** A Rust command asks the installed `claude` for its command list through the `initialize` control request, and the panel's `/` menu shows each entry's description and argument hint under its name.

**Blocked by:** none

**Files:** src-tauri/src/commands/claude.rs,src-tauri/src/commands/claude/,src-tauri/src/lib.rs,src-tauri/tests/commands/,src/lib/contracts/,src/lib/features/claude-code/,src/tests/lib/features/claude-code/,help/documentation/07-sidebar-panels.md

**Status:** resolved

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml` (commit the regenerated `src/lib/contracts/generated/`), `pnpm check`, `pnpm vitest run`.

- [x] Failing tests first: Rust parser and runner tests, store/logic tests, service and panel tests.
- [x] **Parser.** `src-tauri/src/commands/claude/slash.rs`: a pure `parse_initialize_line(line, request_id)` with three outcomes: not this request's reply (non-JSON, a hook or other message, a `control_response` with another `request_id`), this request's rows, or this request's reply but malformed (an `error` subtype, no `commands` array, a row without a string `name`). Per row it reads only `name`, `description` (missing or not a string: `""`), `argumentHint` (same) and `aliases` (missing or not a string array: empty); unknown keys are ignored. Tested per outcome and per field with synthetic lines that use built-in or invented names only.
- [x] **Runner.** Spawns `claude -p --input-format stream-json --output-format stream-json --verbose --no-session-persistence` with the turn env (`turn_env`, `CLAUDECODE` removed), cwd = the vault, its own process group, stdin piped, stderr discarded (`Stdio::null()`, nothing logged). It writes one initialize line with a fresh `request_id`, parses stdout lines until its reply, then closes stdin and keeps reading stdout to EOF without parsing (hooks can still print after the reply). One deadline (30 s) covers the reply and the exit: past it the group is killed, and the rows already parsed are returned if the reply came, an error otherwise. No hook-disabling setting: the user's hooks run, as in a turn.
- [x] **Runner tests**, with fake `claude` shell scripts (the `claude_turn_test.rs` pattern) that read one stdin line and echo its `request_id` in the reply, and fail when no request arrives:
  - the args contain `--input-format stream-json` and `--no-session-persistence`, and no `--bare`, `--settings` or `disableAllHooks`;
  - hook lines and a `control_response` with another `request_id` (success and error) before the reply are skipped;
  - lines printed after the reply, and a script that ignores stdin EOF, still return the rows within the deadline;
  - a script that never answers is killed at the deadline (shorter in the test through a parameter), with a grandchild it started, and returns an error;
  - a script that exits 1 with no reply returns an error at once, not at the deadline.
- [x] **Quit.** A running request is registered in managed state with the turns, and `ClaudeRuns::cancel_all()` on `RunEvent::Exit` (`lib.rs:419`) kills its group too. Tested like `cancel_all_kills_every_run_and_its_process_group` (`claude_turn_test.rs:374`).
- [x] **Command.** `#[tauri::command] claude_slash_commands(binary_path, vault_path)` resolves the binary with `resolve_turn_claude` (the Settings override included), runs the runner in `spawn_blocking`, and returns `Vec<SlashCommandInfo { name, description, argument_hint, aliases: Vec<String> }>` (`#[ts(export)]`, camelCase). Registered in `lib.rs` and `src/lib/contracts/commands.ts`.
- [x] **Map.** A per-vault map from each row's `name` and each alias to `{ description, argumentHint }`, with a store getter and its test. A row's `name` wins over another row's alias (logic test with an invented colliding alias).
- [x] **When it is fetched.** The service passes `settingsStore.claudeCode.binaryPath` and the normalized vault path (test like the `claude_status` one at `ClaudePanel.test.ts:712`).
  - At panel mount, only when the vault has no map and no request in flight: a remount (canvas, kanban or view tab) makes no new call.
  - When an `Init` brings slash commands that are neither in the map nor already tried for this vault in this app session, once, after that run's `Done` (never while a turn runs). Tests: an `Init` with an MCP-style name followed by a second identical `Init` causes one extra fetch, not two; an `Init` during a pending fetch causes none.
  - A reply that arrives after the vault changed is dropped; `resetClaude` clears the map, the in-flight flag and the tried names.
  - A failed fetch keeps today's names-only menu and calls `error()` with no description text in it (tested); it is retried only through the `Init` rule above.
  - Changing the binary override in Settings does not refetch; the next vault open does.
- [x] **Panel.** Each row shows `/name` and the argument hint muted on the first line, and the description with whitespace collapsed and clamped to two lines (`line-clamp-2`) on the second; the menu grows to `max-h-64`. A name with no description renders as today. Enter, Tab, the arrows, the wrap and `scrollIntoView` work as before; the exact-text test at `ClaudePanel.test.ts:583` is updated.
- [x] **Help.** `help/documentation/07-sidebar-panels.md` (Claude section) says the menu shows descriptions, that Kokobrain asks `claude` for them when the panel opens (the user's SessionStart hooks run then), and that a hook slower than 30 s is stopped and the menu shows names only.

## Notes

- Evidence and probes: `research/synthesis.md` (F5-F8, F14, F15, G1-G4) and `research/04-control-protocol.md`. Review: research 04 and `validate-source.md` row 22 saw hook lines after the reply, hence reading stdout to EOF.
- The join is on the row `name` plus `aliases`, because `Init` names a skill by its internal name, which differs from the row name when frontmatter `name` differs from the folder (synthesis F8). MCP prompts never join and show no description (spec, Later); the tried-names rule keeps them from causing a fetch per turn.
- The 30 s deadline is shorter than the CLI's default hook timeout (not looked up), so a slow SessionStart hook is killed by this request where the terminal would wait. Accepted with the owner's choice to keep hooks on.
- Neither side logs the reply or a description: a review item, plus the `error()` test above.
- `ClaudeEvent::Init` does not change.
- **Delivery:** onto `mvp-claude` (relay-lite base `mvp-claude`), then merged into `preview`; see `spec.md`.

## Comments

- 2026-11-16, branch `issue/01-slash-menu-descriptions`: the slash menu shows each command's description and argument hint, fetched once per vault through a new `claude_slash_commands` command (initialize control request, 30 s deadline, killed on quit). Fix round: fetch on panel mount only (f50ddb2d9); a request that closes stdout still ends at the deadline (3e3042ea4). Tests: full vitest at 3e3042ea4 exit 0 (644 files, 17230 passed, 54 skipped, 1 todo); full cargo test exit 0, bindings unchanged; clippy and pnpm check clean. Reviews: round 1 APPROVED (review.md), round 2 APPROVED (review-2.md).
