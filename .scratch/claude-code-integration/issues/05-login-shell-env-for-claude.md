# 05: Run `claude` with the login shell's environment

**What to build:** `claude_run_turn` spawns `claude` with the user's login shell environment (PATH and exported variables) instead of the app's, so MCP servers started with `npx`/`node` and those reading keys exported in `~/.zshrc` work when Kokobrain is opened from Finder or the Dock.

**Blocked by:** 02

**Status:** ready-for-agent

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` (Rust only).

- [ ] The environment is captured once per app run (cached, e.g. `OnceLock`/`tokio::sync::OnceCell`), on the first `claude_run_turn` or `claude_status`, by running the user's `$SHELL` (fallback `/bin/zsh`) as a login interactive shell (`-lic`) that prints a start marker, `env -0`, and an end marker, with a 5 s timeout.
- [ ] Parsing is a pure function, tested: it reads only what is between the markers (startup files may print to stdout before them, e.g. a prompt theme), splits on NUL, keeps values that contain newlines, and returns nothing when a marker is missing.
- [ ] Merge is a pure function, tested: start from the app's environment, overlay every captured variable except `PWD`, `OLDPWD`, `SHLVL`, `_` and `CLAUDECODE`, then remove `CLAUDECODE`.
- [ ] When the capture fails or times out, the child gets the app's environment with PATH extended by `~/.local/bin`, `/opt/homebrew/bin` and `/usr/local/bin` (those not already in it), and the failure goes to `debug_log` once. Tested with a fake shell script that hangs and one that prints no markers.
- [ ] Integration test: a fake `claude` script reports a variable only the fake login shell exports (in its `result` text), and the `Result` event carries it.
- [ ] No variable value is logged (keys may hold secrets); `debug_log` may name how many variables were captured.

## Problem

A macOS app started from Finder or the Dock gets a minimal environment, not the shell's. Issue 02 spawns `claude` with the app's environment, so MCP servers launched through `npx` or `node` (Homebrew, nvm) do not start, and those that read API keys exported in shell startup files miss them. Issue 01 uses the login shell only to find the binary. The probes in the spec ran from a terminal, which hid this. Tolaria extends the child PATH and copies auth variables from shell startup files for the same reason (its `docs/ARCHITECTURE.md`, AI System).

## Notes

- Runs in parallel with Issue 03: it touches only the Rust spawn path, not the panel.
