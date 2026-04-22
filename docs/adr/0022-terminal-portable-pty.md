---
type: ADR
id: "0022"
title: "Terminal plugin via portable-pty with per-session managed state"
status: active
date: 2026-04-22
---

## Context

A subset of users — developers working in research or code-adjacent vaults — want a real terminal embedded in the app without context-switching to iTerm or Terminal.app. The feature has to be:

- A real PTY, not a command executor. Interactive tools (`vim`, `htop`, `tmux`) require a terminal-like stream, not just `stdout` capture.
- Multi-session. Users open several terminals in tabs/panes, each with its own shell and state.
- Cross-platform at the Rust level (macOS primary; Windows/Linux nice-to-have from the start).
- Fully optional. Users who don't want a terminal shouldn't pay for it (it's a plugin, not core).

A command-runner approach (`invoke('run', 'ls')`) is a dead end for this use case — the user's terminal experience is inseparable from PTY semantics (prompt editing, ANSI codes, flow control, `SIGWINCH` on resize).

## Decision

**Implement the terminal as an optional plugin under `src/lib/plugins/terminal/` backed by the `portable-pty` crate in Rust, with per-session state managed in a `TerminalState { sessions: Mutex<HashMap<String, TerminalSession>> }` registered via Tauri's `app.manage()`. Sessions are keyed by UUID and bridge to the frontend via xterm.js (`@xterm/xterm`) plus WebGL acceleration.** Output is streamed back through Tauri events.

### Rust side (`src-tauri/src/commands/terminal.rs`)

- **Dependencies**: `portable-pty = "0.9"` (`Cargo.toml:29`), `uuid` v4 (`Cargo.toml:30`) for session IDs.
- **`TerminalSession`** holds three resources per session:
  - `writer: Box<dyn Write + Send>` — stdin handle for user input.
  - `master: Box<dyn MasterPty + Send>` — PTY master, needed for `resize(PtySize)` on window changes.
  - `child: Box<dyn Child + Send + Sync>` — child shell process, needed to `kill()` and `wait()`.
- **`TerminalState`** is the Tauri managed state; `sessions_count()` reports active sessions, with a poisoned-mutex fallback that logs and still returns a count rather than panicking.
- **Output streaming**: each session spawns a background `thread::spawn` that reads from the PTY and emits a `terminal-output` Tauri event per chunk. The reader loop exits when the PTY read returns EOF/error (e.g., after `child.kill()`).
- **Session-ID masking in logs**: `mask_session_id()` shows `"a1b2c3d4…"` rather than the full UUID to keep debug output tidy.

### Frontend side (`src/lib/plugins/terminal/`)

- `TerminalPanel.svelte` — the pane wrapper, creates/destroys sessions.
- `TerminalInstance.svelte` — one xterm.js terminal, subscribes to the session's `terminal-output` event, sends input via `invoke('terminal_write', …)`.
- `terminal.store.svelte.ts` — reactive session list (getter pattern, ADR-0005).
- `terminal.service.ts` — Tauri IPC wrapper.
- `terminal.types.ts` — shared types.

Frontend dependencies (`package.json:61-65`):
- `@xterm/xterm ^6.0.0` — terminal emulator.
- `@xterm/addon-webgl ^0.19.0` — GPU-accelerated renderer; falls back to canvas automatically.
- `@xterm/addon-fit ^0.11.0` — resize handling.
- `@xterm/addon-web-links ^0.12.0` — clickable URLs.
- `@xterm/addon-unicode11 ^0.9.0` — Unicode 11 width tables.

## Alternatives considered

- **Node-pty (`node-pty` npm package)**: standard choice in Electron apps, but requires Node as a runtime — Tauri's WebView has no Node. Rejected at the stack level.
- **Command runner (spawn + capture `stdout`)**: fundamentally wrong for interactive shells. Rejected.
- **A Rust-native terminal emulator** (alacritty-style): massive scope; we want the terminal to *feel* native, which xterm.js already does in WebViews.
- **Single-session (only one terminal)**: simpler managed state (no `HashMap`), but the plugin would be less useful than opening a real terminal. Rejected; the per-session map is cheap.
- **Store sessions in a `DashMap` or lock-free structure**: premature; terminal session creation/destruction is rare and user-paced, so `Mutex` contention is a non-issue.
- **Use `Option` instead of panicking on poisoned mutex**: considered; the current fallback (log + `e.into_inner()`) matches what most Rust apps do and has never caused an issue in practice.

## Consequences

- The terminal is fully optional — it's a plugin (ADR-0003) and the app works with zero terminal code loaded at runtime for users who disable it. Bundle-size cost is xterm.js + addons (~200 KB minified) and the portable-pty Rust code; only the JS side matters for startup, and the chunk is only loaded when the plugin initializes.
- Shell selection is currently the OS default (via `CommandBuilder`'s platform defaults) — on macOS `$SHELL`, on Windows `cmd.exe`. A future setting could expose "terminal shell" to users.
- Session lifecycle on app quit: the `TerminalState` drops with the app; active child processes receive SIGKILL via `Drop`. Clean termination (SIGTERM, wait for flush) is not currently implemented — acceptable for local PTYs but worth revisiting if users report losing shell history.
- `WebGL` renderer may fail on some GPUs — the fallback to canvas is automatic (`TerminalInstance.svelte:122` comment), so the worst case is degraded performance rather than a blank pane.
- Error handling around poisoned mutexes logs a warning and continues. If a thread panics while holding `sessions.lock()`, subsequent operations still return sensible values (possibly incomplete); the app does not crash.
- Re-evaluation triggers: users ask for custom shells / env vars per session (expand `CommandBuilder` wiring); performance proves inadequate on large scroll buffers (would replace xterm.js or tune buffer size); cross-platform parity becomes a ship requirement (Windows `ConPTY` vs legacy, Linux edge cases).
