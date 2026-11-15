---
type: ADR
id: "0038"
title: "Claude Code integration spawns the user's claude CLI per turn, in print mode with stream-json"
status: proposed
date: 2026-11-14
---

## Context

The owner wants to work on vault notes with Claude Code from inside Kokobrain (`.scratch/claude-code-integration/spec.md`). Two existing apps show the options: Tolaria spawns the `claude` binary from Rust and parses its NDJSON stream (Tolaria ADR 0012), and t3code runs `@anthropic-ai/claude-agent-sdk` in a Node server. Kokobrain ships a Tauri bundle with no Node runtime, and makes no network calls outside the allowlist in `.github/workflows/privacy.yml`.

## Decision

**Rust spawns the user's installed `claude` binary once per turn with `-p --output-format stream-json --verbose --include-partial-messages --permission-mode bypassPermissions`, cwd set to the vault, and turns its stdout lines into a normalized `ClaudeEvent` emitted to the frontend. Follow-up turns use `--resume <session_id>`. The typed text is the prompt, unchanged, and note context goes in `--append-system-prompt`, because the CLI expands a skill or slash command only when `/name` starts the text.**

- Auth, model access, skills, slash commands, plugins, MCP servers, user settings and billing belong to Claude Code, loaded as in the terminal. Kokobrain stores no API key and makes no HTTP call for this feature.
- Full permissions, by owner decision: the agent can run any command and write any file the user can, without a prompt. The feature is off by default, and enabling it states that and that note content goes to Anthropic through the user's Claude Code account.
- Edits apply directly. The app learns about them through the native watcher (ADR-0031), like any external edit, and flushes dirty tabs before every turn so the editor does not overwrite them.

## Options considered

- **CLI subprocess, print mode, per turn** (chosen): no new runtime, the parser is a pure function testable with recorded lines, cancel is a process kill, and skills and slash commands work in print mode (probed). Per-edit approval would need a permission-prompt MCP tool; the owner chose direct edits with full permissions.
- **Agent SDK in a Node sidecar**: native permission callbacks and typed messages. Costs bundling a JS runtime into the .dmg and a second long-lived process to supervise.
- **Embedded terminal running interactive `claude`**: least code, but no tool cards, no changed-files list and no active-note context.
- **Long-lived process with `--input-format stream-json`**: saves a spawn per turn; adds process supervision and a stdin protocol for a gain the per-turn spawn does not need yet.

## Consequences

- The app depends on the CLI's stream-json format. The parser ignores unknown event types and non-JSON lines, so additions do not break it; a removed field shows up in the parser tests against recorded lines.
- Binary lookup goes through the login shell, because a Finder-launched macOS app does not inherit the shell PATH: the Settings status and every turn search the `PATH` of the captured `$SHELL -l -i` env and run `claude` with that env (Issues 05 and 10), then try the known install paths; `$SHELL -lc 'command -v claude'` runs only when the capture failed. An override path in Settings must be an absolute path to a file named `claude`.
- Reviewing or reverting Claude's edits in the app is out of v1. File History does not see Claude's writes before they happen (it snapshots editor saves only), so a later revert needs git or a PreToolUse hook.
- Re-evaluate if Claude Code changes or drops print-mode stream-json, or if per-edit approval or safer permission modes become a requirement.
