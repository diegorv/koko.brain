# 01: Detect the `claude` binary and show its status in Settings

**What to build:** A Rust command `claude_status` that finds the `claude` binary and returns whether it is installed, its path and its version, and a new Settings section "Claude Code" that shows that status, an enable toggle (off by default), an optional binary path override and the privacy sentence from the spec.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm check`, `pnpm vitest run` (new ts-rs DTO).

- [ ] Resolution order: the Settings override path when set, else `$SHELL -lc 'command -v claude'` (fallback `/bin/zsh`), else the first executable of `~/.local/bin/claude`, `~/.claude/local/claude`, `/opt/homebrew/bin/claude`, `/usr/local/bin/claude`, else not found. The override must be an existing executable file, otherwise the status says so.
- [ ] `claude --version` runs with a timeout (5 s) and `CLAUDECODE` removed from the env; its first line is the version string.
- [ ] `ClaudeStatus` is a `#[ts(export)]` DTO (`installed`, `path`, `version`, `error`), bindings committed.
- [ ] Rust tests use a fake executable script in a temp dir (pattern: Tolaria `claude_cli.rs` tests) for found, missing, non-executable override and a hanging `--version`.
- [ ] Settings: `claudeCode.enabled` (default `false`) and `claudeCode.binaryPath` (default empty) persist through the settings store; section has a "Check again" button; tests cover the store getters and the section render for installed and missing.
- [ ] Enabling the toggle for the first time shows two sentences: note content goes to Anthropic through the user's Claude Code account, and the agent runs with full permissions (any shell command, any file the user can write, no prompt).

## Notes

- GUI apps on macOS do not inherit the login shell PATH; that is why the login-shell lookup exists.
- Do not add the `tauri-plugin-shell` crate: spawn with `std::process::Command` / `tokio::process::Command` from a Rust command, like `quick_capture/source.rs:244`.
