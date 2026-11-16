# Slash autocomplete descriptions in the Claude panel

**Status:** ready-for-agent (Issues 01-02)

## Goal

The Claude panel's `/` menu shows what each skill and command does, as the terminal's typeahead does, instead of bare names. Builds on the Claude Code panel (`.scratch/claude-code-integration/`, branch `mvp-claude`).

## Decisions (owner, 2026-11-15)

| Topic | Decision |
|---|---|
| Source | Ask the CLI: an `initialize` control request on `claude -p --input-format stream-json --output-format stream-json --verbose` returns every command with `name`, `description`, `argumentHint` and `aliases`, with no model call. No reading of SKILL.md or command files. |
| Hooks during that request | The user's hooks run, as in a turn (no `disableAllHooks`). The reply waits for SessionStart hooks; a 30 s deadline kills a slower request and leaves the names-only menu. |
| Row layout | Two lines: `/name` with the argument hint muted after it, then the description clamped to two lines. |
| Before the first message | The menu lists the CLI's rows, so it works before any turn. |
| Filter | Names only, as today; the description is display. |
| Freshness | One request per vault per app session, plus one after a turn whose `Init` brought names neither in the map nor tried before. No manual refresh. |
| MCP prompts | Out of v1 (see Later). |

## Research

`research/` holds the deep dive (2026-11-15, claude 2.1.325): scouts `01`-`08`, validators `validate-source.md` and `validate-impl.md`, and `synthesis.md` with the facts below and the probes that back them.

## How it works today

- `init_event` (`src-tauri/src/commands/claude/stream.rs:141-152`) emits `slash_commands` minus `terminal_slash_commands`, and `skills`; both are name-only string arrays by the CLI's design (synthesis F1, F4). `Init.skills` is never read by the frontend.
- The store keeps `slashCommands: string[]`, replaced on every `Init` (`claude.logic.ts:122-124`), kept by New chat, cleared by `claudeStore.reset()` on vault close. Before the first turn the menu says "Slash commands load after the first message."
- The menu (`ClaudePanel.svelte`, `max-h-48`, one truncated `/name` row) filters with `filterSlashCommands` (`claude.logic.ts:200-211`).

## What the CLI gives (synthesis F5-F8, G1-G5)

- Request line: `{"type":"control_request","request_id":"<id>","request":{"subtype":"initialize"}}` on stdin; the answer is a `control_response` whose `response.response.commands` is the list. No `system/init`, no transcript. With hooks, the reply comes after the SessionStart hooks (about 1 s with the owner's hooks, 8.3 s with an 8 s hook).
- Each row: string `name`, `description`, `argumentHint` (empty string for none), optional `aliases`, `builtin`, `plugin`. Descriptions already carry the CLI's `(user)`, `(project)` and `(<plugin>)` labels. Owner's machine: 126 rows in a neutral cwd, 129 in the vault; max description 1436 chars, median about 180.
- Row `name` is the user-facing name; init uses the internal name. They differ for a skill whose frontmatter `name` differs from its folder (the internal name is then in `aliases`) and for MCP prompts (`server:prompt (MCP)` versus `mcp__server__prompt`). Joining on name plus aliases is exact for the owner's setup today.
- MCP prompts never come in the reply; they arrive later in `system/commands_changed` on a live process.

## Constraints

- The request spawns `claude` like a turn: the turn env and binary resolution (`resolve_turn_claude`, Issue 10 of claude-code-integration), cwd = vault, own process group, `CLAUDECODE` removed. stdin is piped here, unlike a turn.
- The reply is the user's private setup: never log it.
- The control protocol is semi-documented (Agent SDK docs describe direct protocol clients). A CLI upgrade that changes the row shape gives an error, and the menu falls back to names.

## Delivery

These Issues are delivered onto `mvp-claude`, never onto `main`: relay-lite's base on that branch is `mvp-claude`. After each delivery, merge `mvp-claude` into `preview` so the Preview build carries it. They reach `main` only with PR #247 (whose last commit sets the base back to `main`).

## Later (not v1)

MCP prompt descriptions (read `system/commands_changed` for a bounded window and map `server:prompt (MCP)` to `mcp__server__prompt`); a manual refresh; matching descriptions in the filter.

## Issues

| # | Issue | Blocked by | Status |
|---|---|---|---|
| [01](issues/01-slash-menu-descriptions.md) | The slash menu shows each command's description | none | ready-for-agent |
| [02](issues/02-slash-menu-before-first-message.md) | The slash menu works before the first message | 01 | ready-for-agent |
