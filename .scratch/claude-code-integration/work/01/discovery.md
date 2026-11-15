# Issue 01 discovery: claude binary detection + Settings section

## Files that change

- `src-tauri/src/commands/claude.rs` (new): `ClaudeStatus` DTO (`#[ts(export)]`, camelCase, `installed`, `path`, `version`, `error`), `find_claude(override, shell, candidates, timeout)`, `claude_status_with(...)`, `run_with_timeout`, async command `claude_status(binary_path: String)` on `spawn_blocking`.
- `src-tauri/src/commands/mod.rs:1-13`: `pub mod claude;`. `src-tauri/src/lib.rs:390`: register `commands::claude::claude_status`.
- `src-tauri/tests/commands/claude_test.rs` (new) + `tests/commands/mod.rs`: fake executable scripts in a `tempfile` dir.
- `src/lib/contracts/generated/ClaudeStatus.ts` (cargo test), `contracts/index.ts:53`, `contracts/commands.ts:214,323` (CommandMap + COMMAND_ARGS; `ipc-parity.test.ts` MIN_COMMANDS stays a floor).
- `src/lib/core/settings/settings.types.ts:279,359,406`: `ClaudeCodeSettings`, `'claude-code'` section id, `AppSettings.claudeCode`.
- `settings.store.svelte.ts:135,182,330`: default, `get claudeCode`, `updateClaudeCode`. `settings.service.ts:168`: load with type checks (like `sentry`). `settings.logic.ts:290`: Integrations gets `{ id: 'claude-code', label: 'Claude Code' }`.
- `src/lib/features/claude-code/claude-code.service.ts` + `ClaudeCodeSection.svelte` (new; feature folder that Issues 02-03 extend). `src/lib/app/SettingsPanel.svelte:44,71`: icon + component.

## Plan

1. Rust: resolution order override -> `$SHELL -lc 'command -v claude'` (fallback `/bin/zsh`; last non-empty stdout line, must be an absolute executable file, so rc noise and aliases are skipped) -> first executable of `~/.local/bin/claude`, `~/.claude/local/claude`, `/opt/homebrew/bin/claude`, `/usr/local/bin/claude`. A bad override returns an error status, no fallback. `--version` and the shell lookup run via `std::process::Command` with `CLAUDECODE` removed, polled `try_wait` with a 5 s deadline, child killed on timeout. Version = first stdout line, trimmed.
2. Tests inject shell, candidates and timeout so the developer's real `claude` never leaks in, and the hang test uses a 300 ms timeout with `exec sleep 30`.
3. Frontend: settings fields + store getter tests + service load tests; section render tests (installed, missing, Check again, consent) mocking `@tauri-apps/api/core` only.

## Prior art

- `tests/commands/update_channel_test.rs` (camelCase wire shape), `tests/ipc_contracts_test.rs`.
- Sentry settings: `settings.store.test.ts:309`, `settings.service.test.ts:241-279`, `SentrySection.svelte` (Switch + Input + note paragraphs in `text-meta`).
- Section render: `QuickCaptureSection.test.ts`, `TodoistSection.test.ts`.

## Defaults taken

- `installed` is true only when the binary answered `--version` with exit 0; `path` is still set when found but the version run fails or times out, with `error` explaining.
- "First time" is persisted as `claudeCode.privacyAcknowledged` (default `false`). Turning the switch on while unacknowledged shows the two sentences with Enable / Cancel; the switch stays off until Enable. Later toggles skip it.
- The section checks status on mount and on "Check again"; editing the override path does not re-run the check on each keystroke.
- Section lives in `features/claude-code/` (like `features/todoist-sync/TodoistSection.svelte`), so no new layer-baseline entry.

## Risks

- Login shells with slow rc files: bounded by the same 5 s timeout.
- ts-rs `Option<String>` emits `string | null`; the frontend treats null as absent.
