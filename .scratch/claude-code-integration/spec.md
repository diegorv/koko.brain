# Claude Code integration: an agent panel for the vault through the `claude` CLI

**Status:** ready-for-agent (Issues 01-03)

## Goal

Open an agent panel in Kokobrain and work with Claude Code on the vault as a whole, with zero, one or several notes attached as context. Skills, slash commands, plugins, MCP servers and settings are the user's own Claude Code setup, with the same permissions the CLI has. The app spawns the installed `claude` binary, so auth, models and billing stay with Claude Code. No API key in Kokobrain.

## Decisions (owner, 2026-11-14)

| Topic | Decision |
|---|---|
| Mechanism | Rust spawns `claude -p --output-format stream-json` per turn, parses NDJSON, emits Tauri events. No Node sidecar, no Agent SDK, no PTY. ADR [0038](../../docs/adr/0038-claude-code-cli-subprocess.md). |
| Permissions | Full: `--permission-mode bypassPermissions`, every tool the CLI has, the user's settings, skills, plugins and MCP servers loaded as the CLI loads them. No Kokobrain modes. |
| Must have | Skills and slash commands work from the panel. |
| Not in v1 | Reviewing or reverting Claude's edits in the app. |

## Verified CLI behavior (claude 2.1.325, probed 2026-11-14)

- `claude -p "<prompt>" --output-format stream-json --verbose --include-partial-messages` prints one JSON object per line on stdout. Seen types: `system/init`, `system/status`, `stream_event` (Anthropic stream events: `message_start`, `content_block_start`, `content_block_delta`, `content_block_stop`, `message_delta`, `message_stop`), `assistant` (full message with `text` and `tool_use` blocks), `user` (tool results), `result` (`subtype`, `result`, `session_id`, `is_error`, `total_cost_usd`, `num_turns`, `permission_denials`).
- `system/init` carries `session_id`, `cwd`, `model`, `permissionMode`, `tools`, `slash_commands`, `skills`, `agents`, `plugins`, `mcp_servers` (name and status) and `terminal_slash_commands` (`doctor`, `color`, `focus`, `reload-plugins`: terminal only, not offered in the panel). With the owner's setup: 126 slash commands, 88 skills, 133 tools.
- A slash command works in print mode: a vault-local `.claude/commands/hello.md` run as `-p "/hello world"` answered `HELLO-CMD world`, with `hello` listed in `slash_commands`.
- The CLI expands one skill or command per message, and only when `/name` starts the text; the rest of the text becomes its arguments (t3code `apps/server/src/provider/Drivers/ClaudeSkillDispatch.ts`, citing anthropics/claude-code#87113). So the panel sends the typed text unchanged as the prompt, and note context goes in `--append-system-prompt`, never in front of the text.
- `--verbose` is required with `stream-json` in print mode. Warnings go to stderr as plain text; read stderr separately, skip and log a non-JSON stdout line.
- `--permission-mode bypassPermissions` ran with every tool; `--resume <session_id>`, `--model`, `--append-system-prompt`, `--no-session-persistence` exist.
- Tolaria removes the `CLAUDECODE` env var before spawning to avoid the nested-session guard (`src-tauri/src/claude_cli.rs` there); the probes ran with it unset.

## Shape

```
ClaudePanel.svelte (right sidebar)
  -> claude.service.ts: flush dirty tabs, build request, invoke('claude_run_turn')
  -> Rust commands/claude.rs: resolve binary, spawn in vault dir,
     parse stdout NDJSON -> ClaudeEvent (ts-rs DTO), emit 'claude-event' {runId, event}
  -> claude.store.svelte.ts: messages, streaming text, tool cards, status, slash commands
  -> file writes reach the app through the existing native watcher (ADR-0031):
     index update + reloadExternallyChangedTabs for clean open tabs
```

One turn = one process. Follow-up turns pass `--resume <session_id>` from the previous `result`. Cancel kills the process.

## Constraints found in this repo

- **Dirty tabs win over disk.** `reloadExternallyChangedTabs` (`src/lib/core/editor/editor.service.ts:477-512`) skips dirty tabs, and the next auto-save writes the editor content back, silently undoing Claude's edit. Every turn must first flush dirty tabs (`saveAllDirtyTabs`, same file, line 324). An edit the user types into a note while a turn is running can still overwrite Claude's change to that note; the panel says so while a turn runs.
- **Full permissions.** With `bypassPermissions` the agent runs any shell command and writes anywhere the user can, with no prompt. This is the owner's choice; the Settings toggle that enables the feature states it.
- **Any webview code can drive the agent.** App commands have no IPC ACL (ADR-0036, Consequences), and both vault mods and QueryJS blocks in any note run in the main webview (`src/lib/plugins/queryjs/kb-api.ts:414`), so they can call `claude_run_turn` and, through `bypassPermissions`, run shell commands. Accepted while the owner writes every mod and note in the vault; revisit together with ADR-0036's triggers (a mod or vault from someone else). The commands only run a binary named `claude` (Issue 02), so they are not a generic exec primitive.
- **Settings live in the vault.** `claudeCode.*` (enabled, override path, privacy acknowledged) persist in `<vault>/.kokobrain/settings.json`, so a vault from elsewhere could arrive with the feature on and an override pointing at a `claude` script it ships, which the Settings section runs. Accepted by the owner (sole user, writes every vault); Issue 04, which moved them to per-machine storage, is wontfix.
- **Privacy.** Kokobrain does no network calls outside the allowlist in `.github/workflows/privacy.yml`. The `claude` process sends note content to Anthropic under the user's own Claude Code account. The feature is off by default, enabling it shows that sentence once, and no Kokobrain code makes the HTTP call.
- **GUI PATH.** A macOS app launched from Finder does not inherit the login shell PATH. Resolve `claude` via `$SHELL -lc 'command -v claude'`, then known install paths (`~/.local/bin`, `~/.claude/local`, Homebrew), with an override path in Settings. The same applies to the child's environment: `claude` and the MCP servers it starts need the shell's PATH and exported variables (Issue 05).

## Later (not v1)

Changed-files summary and revert (git diff when the vault is a repo, as Tolaria relies on git; otherwise File History pre-edit snapshots, which need a PreToolUse hook because File History only snapshots editor saves, `src/lib/features/file-history/file-history.service.ts:190-197`); safer permission modes; skill descriptions in the autocomplete (read SKILL.md frontmatter, as t3code `ClaudeSkills.ts` does); a Kokobrain MCP server; other agents; session history across restarts.

## Issues

| # | Issue | Blocked by | Status |
|---|---|---|---|
| [01](issues/01-claude-binary-detection.md) | Detect the `claude` binary and show its status in Settings | none | resolved |
| [02](issues/02-rust-turn-runner.md) | Rust turn runner: spawn, NDJSON to events, cancel | 01 | ready-for-agent |
| [03](issues/03-claude-chat-panel.md) | Agent panel: chat, note context, slash commands | 02 | ready-for-agent |
| [04](issues/04-claude-settings-per-machine.md) | Claude Code settings per machine, not in the vault | 01 | wontfix |
| [05](issues/05-login-shell-env-for-claude.md) | Run `claude` with the login shell's environment | 02 | ready-for-agent |
