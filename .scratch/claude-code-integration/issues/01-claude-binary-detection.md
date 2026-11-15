# 01: Detect the `claude` binary and show its status in Settings

**What to build:** A Rust command `claude_status` that finds the `claude` binary and returns whether it is installed, its path and its version, and a new Settings section "Claude Code" that shows that status, an enable toggle (off by default), an optional binary path override and the privacy sentence from the spec.

**Blocked by:** none

**Status:** resolved

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm check`, `pnpm vitest run` (new ts-rs DTO).

- [x] Resolution order: the Settings override path when set, else `$SHELL -lc 'command -v claude'` (fallback `/bin/zsh`), else the first executable of `~/.local/bin/claude`, `~/.claude/local/claude`, `/opt/homebrew/bin/claude`, `/usr/local/bin/claude`, else not found. The override must be an existing executable file, otherwise the status says so.
- [x] `claude --version` runs with a timeout (5 s) and `CLAUDECODE` removed from the env; its first line is the version string.
- [x] `ClaudeStatus` is a `#[ts(export)]` DTO (`installed`, `path`, `version`, `error`), bindings committed.
- [x] Rust tests use a fake executable script in a temp dir (pattern: Tolaria `claude_cli.rs` tests) for found, missing, non-executable override and a hanging `--version`.
- [x] Settings: `claudeCode.enabled` (default `false`) and `claudeCode.binaryPath` (default empty) persist through the settings store; section has a "Check again" button; tests cover the store getters and the section render for installed and missing.
- [x] Enabling the toggle for the first time shows two sentences: note content goes to Anthropic through the user's Claude Code account, and the agent runs with full permissions (any shell command, any file the user can write, no prompt).

## Notes

- GUI apps on macOS do not inherit the login shell PATH; that is why the login-shell lookup exists.
- Do not add the `tauri-plugin-shell` crate: spawn with `std::process::Command` / `tokio::process::Command` from a Rust command, like `quick_capture/source.rs:244`.

## Comments

- 2026-11-14, branch issue/01-claude-binary-detection: `claude` binary detection (override, login shell, known paths; `--version` with 5 s timeout, `CLAUDECODE` removed), `ClaudeStatus` ts-rs DTO, Claude Code settings section with status row, Check again and first-enable notice. Fixes from round 1: Cancel resets the switch (3dfcebed1), `run_with_timeout` doc (0b9176148), settings help page (f8bf4f0e2), testable `shell_from_env` (0b9176148). Tests: full suite at a056c911a 639 files, 16958 passed, 54 skipped, exit=0; pnpm check 0 errors; claude cargo tests 16 passed. Reviews: round 1 CHANGES_REQUESTED, round 2 APPROVED, round 3 APPROVED.
