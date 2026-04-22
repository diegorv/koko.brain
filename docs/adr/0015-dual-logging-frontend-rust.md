---
type: ADR
id: "0015"
title: "Dual logging: appendLog (frontend → file) and debug_log (Rust → stderr + event)"
status: active
date: 2026-04-22
---

## Context

Debugging a Tauri desktop app is harder than debugging a browser app. The WebView devtools are not immediately visible; users rarely reproduce in dev mode; Rust side errors live in a different process's stderr entirely; timing problems between TS and Rust require correlation across two logs that are, by default, written nowhere useful.

Early debugging used `console.log` in TS and `eprintln!` in Rust. Both were invisible in shipped builds. When users reported bugs, the only option was "reproduce it while attached to the devtools," which nobody did.

The project needed logging that:

- Is persistent across sessions so post-mortem analysis is possible.
- Is correlatable — Rust events and TS events in one timeline when needed.
- Is cheap enough to sprinkle liberally (hot paths, per-keystroke plugins, per-save hooks).
- Does not require the user to open devtools.

## Decision

**Two separate logging facilities, both mandatory — TypeScript code calls `appendLog(tag, ...args)` from `$lib/utils/log.service`; Rust code calls `debug_log(tag, msg)` from `utils::logger`.** `console.log` and `eprintln!` are discouraged for anything beyond ephemeral local debugging.

### Frontend: `appendLog` (`src/lib/utils/log.service.ts`)

- Writes to a session log file at the OS-resolved app log directory (macOS: `~/Library/Logs/com.diegorv.kokobrain/`). Path comes from Tauri's `appLogDir()` (`log.service.ts:31`).
- File name is `YYYY-MM-DD_HH-mm-ss.log` (one file per session — `log.service.ts:50`).
- Each line: `[HH:mm:ss.SSS] [TAG] message` (`log.service.ts:64`).
- Writes are serialized through a promise chain (`writeChain`) to guarantee ordering when many log lines fire in the same tick.
- `initLogSession()` creates the directory on first call, is idempotent, and is called during app startup.
- `flushLog()` awaits the pending queue — useful in tests.
- `openLogDir()` surfaces a UI action to open the log folder in Finder/Explorer.

### Rust: `debug_log` (`src-tauri/src/utils/logger.rs`)

- Emits to stderr (visible in the terminal where `pnpm tauri dev` runs).
- Emits a `tauri-debug-log` event via the Tauri event bus **when debug mode is enabled** — the frontend can subscribe and forward into the same session log file, producing a merged timeline.
- For structured debug runs: `RUST_LOG=debug pnpm tauri dev`.
- `eprintln!` remains available for raw terminal prints in dev only.

### Tailing and monitoring

`python3 scripts/log-watcher.py` tails the latest session log file in real time. CLAUDE.md references this as the first-reach tool when debugging.

### Enforcement

`CLAUDE.md` §Debugging makes logging the first debugging tool, explicitly: *"**Logging is ALWAYS the first debugging tool.** When something isn't working, add log statements to inspect values, execution flow, and state BEFORE trying to reason about the problem or rewrite code."*

And: *"Use `appendLog(tag, ...args)` — NOT `console.log`. `appendLog` writes to the session log file; `console.log` only goes to browser devtools (which requires right-click → Inspect in the Tauri window) and is not persisted."*

## Alternatives considered

- **Single unified log channel via a Rust-side collector**: forces every TS log through the Tauri bridge; adds IPC cost to every log line and risks reentrancy with the bridge layer itself. Rejected — direct file writes from TS are faster and simpler.
- **Cloud-shipped telemetry**: useful product-wise but orthogonal and privacy-sensitive for a local-first app. Could be added as an optional, opt-in layer later; does not replace local logs.
- **`console.log` only**: invisible in shipped builds; non-starter for a real debugging story.
- **Third-party logging library (pino, winston-style)**: overkill for this scope; line-based text logs are trivial to tail and grep.
- **Merge Rust + TS logs transparently into one file at write time**: complicates ordering, shared-lock concerns on the file. The `tauri-debug-log` event path merges the two streams at read time for debug sessions, which is sufficient.

## Consequences

- Every new TS module that does anything interesting should start with an `import { appendLog } from '$lib/utils/log.service'` and tag its logs. Tag discipline is informal (`BACKLINKS`, `LP-PROFILE`, `INDEX`, etc.) — tags become grep anchors later.
- Live-preview plugins leave permanent `LP-PROFILE` timing logs in production; cost is a Map-serialized file write per decoration rebuild (~150 ms debounced). Acceptable for current-stage debugging.
- Log files accumulate in `~/Library/Logs/com.diegorv.kokobrain/`. No rotation today — if this becomes an issue, add a retention job at session start.
- `writeChain` guarantees ordering but swallows write errors with a `console.error` fallback. If the app log directory becomes unwritable mid-session, logs silently stop — an edge case worth watching.
- Re-evaluation triggers: log volume becomes painful to ship / analyze (add rotation + level filters); the `tauri-debug-log` event path proves insufficient for merged-timeline debugging (add a dedicated collector process); shipped-build debugging becomes a customer-support workflow (need a "bundle and share logs" command).
