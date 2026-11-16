# 06 Prior art: slash command and skill descriptions in other Claude Code GUIs

Scope: how other open-source Claude Code front ends get a description next to each `/` entry. Feature A only; session history (feature B) gets one short note at the end. Research date 2026-11-15. All repo facts were read through `gh api repos/<o>/<r>/contents/...` (public repos, no authentication beyond the local `gh`), and every link is pinned to the commit I read.

Kokobrain context (read, not changed): the panel takes names from `system/init` `slash_commands` (`.scratch/claude-code-integration/spec.md`, "Verified CLI behavior"), which carry no descriptions. The spec already lists "skill descriptions in the autocomplete (read SKILL.md frontmatter, as t3code ClaudeSkills.ts ...)" under "Later".

## Summary table

| Project | Data source for the description | SDK `supportedCommands` / `initializationResult` | Reads files |
|---|---|---|---|
| pingdotgg/t3code | Commands: SDK `initializationResult().commands` (name, description, argumentHint). Skills: `SKILL.md` frontmatter on disk. UI shows `command.description ?? input.hint`, and `skill.description` | Yes, for commands | Yes, for skills (and plugin roots), not for `commands/*.md` |
| agentclientprotocol/claude-agent-acp (was zed-industries/claude-code-acp) | SDK `Query.supportedCommands()` and the `commands_changed` message; `description` copied as is | Yes, only | Only to find a SKILL.md path for one client extension, never for the description |
| winfunc/opcode | `.claude/commands/**/*.md` frontmatter `description`, plus 3 hardcoded defaults | No | Yes (commands only, no skills) |
| siteboon/claudecodeui | `.claude/commands/**/*.md` frontmatter `description`, fallback first body line, plus hardcoded built-ins | No | Yes (commands only) |

Pattern: GUIs built on the Agent SDK take descriptions from the SDK. GUIs that spawn the CLI or have no SDK read the markdown files and parse YAML frontmatter. Only t3code combines both, and it does so because file reading is the only way to get skill metadata the SDK list does not give (see below).

## 1. pingdotgg/t3code

Repo: https://github.com/pingdotgg/t3code, commit `b732621b5194c47e415f864296d0e9145e420b0d` (default branch HEAD when read). Command used to find the files: `gh api 'search/code?q=repo:pingdotgg/t3code+filename:ClaudeSkills'` returned `apps/server/src/provider/Drivers/ClaudeSkills.ts` and its test.

### 1a. Skills from files

File: https://github.com/pingdotgg/t3code/blob/b732621b5194c47e415f864296d0e9145e420b0d/apps/server/src/provider/Drivers/ClaudeSkills.ts (844 lines).

- Frontmatter regex `^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)` at line 25. Parsed with the `yaml` package (YAML 1.2), `parseSkillFrontmatter` lines 61-107.
- Fields read: `name`, `description` (both trimmed strings), `disable-model-invocation` (sets `userInvocationOnly`), `user-invocable` (only `false` is kept). Lines 94-106.
- Booleans accept YAML 1.1 forms (`yes`, `on`, `1`) because Claude Code does (lines 38-59).
- Recovery for a CLI-accepted but YAML-invalid scalar such as `description: a: b`: on a parse error the code re-quotes values that contain `: ` and parses again (lines 72-87). If that fails, the skill is dropped (`malformed`, line 799-802 loop). A file with no frontmatter still yields the skill, without a description (`missing`).
- Roots scanned, lowest precedence first (lines 752-770): managed dir (`/Library/Application Support/ClaudeCode/.claude/skills` on macOS), `<config dir>/skills`, `<cwd>/.claude/skills`, extra directories from launch args, inline plugins from `CLAUDE_CODE_PLUGIN_DIRS` (lines 744-745), installed plugins via `<config dir>/plugins/installed_plugins.json` (line 539), and synced claude.ai plugins under `<config dir>/plugins/synced`.
- Naming: plugin skills become `<plugin>:<skill>`; a name is kept only if a regex check says the composer can invoke it (lines 807-816). First name wins (`skillsByName.has(name)` skip, line 819).
- Result shape per skill: `name, path, enabled, scope, description?, userInvocationOnly?, userInvocable?` (lines 828-838).
- `skillOverrides` and `enabledPlugins` from the settings files (user, project, local, managed) switch skills off (lines 146-330). This is how it matches what the CLI actually loads.
- This file does NOT read `.claude/commands/*.md`. I grepped the file for `commands` outside slash-command identifiers and found nothing, so legacy command files only reach t3code through the SDK list below.

### 1b. Commands from the SDK

File: https://github.com/pingdotgg/t3code/blob/b732621b5194c47e415f864296d0e9145e420b0d/apps/server/src/provider/ClaudeProvider.ts

- `probeClaudeCapabilities` builds an SDK `query()` with an async-generator prompt that never yields (so no API call is made), then awaits `q.initializationResult()` (line 536, comment "never yields, so no prompt reaches the API" line 523).
- `parseClaudeInitializationCommands(init.commands)` (lines 394-415) maps each SDK command to `{ name, description?, input: { hint: argumentHint }? }`, trimming empty strings.
- `dedupeSlashCommands` (lines 417-445) merges duplicates case-insensitively and keeps the first non-empty description and hint.
- Skills (file scan) and commands (SDK) are joined in `probeClaudeWorkspaceSnapshot` (lines 641-665) and the status path (lines 801-895). The probe is per workspace cwd, with a `slashCommandsPending` flag while it has not answered (line 663).
- grep for the literal `supportedCommands` in the repo returned no file: t3code uses `initializationResult()`, not `supportedCommands()`.

### 1c. How the description reaches the UI

File: https://github.com/pingdotgg/t3code/blob/b732621b5194c47e415f864296d0e9145e420b0d/apps/web/src/components/chat/useComposerMenuItems.ts (lines 286-334).

- Command row: `description: command.description ?? command.input?.hint ?? "Run provider command"` (line 293).
- Skill row: `skill.shortDescription ?? skill.description ?? (skill.scope ? \`${skill.scope} skill\` : "")` (lines 302-306).
- Skill names are removed from the command list so a name does not appear twice: `omitSkillSlashCommands` in https://github.com/pingdotgg/t3code/blob/b732621b5194c47e415f864296d0e9145e420b0d/packages/client-runtime/src/providerSkills.ts (lines 56-60). Agent-only skills (`user-invocable: false`) and disabled skills are filtered from the menu (lines 37-51).
- Fallback chain worth copying: description, then argument hint, then a generic label.

### 1d. Dispatch (already cited by the spec)

`apps/server/src/provider/Drivers/ClaudeSkillDispatch.ts` header comment: one skill per message, only when `/name` opens the text block, citing anthropics/claude-code#87113. I read lines 1-30; consistent with the spec's claim.

## 2. agentclientprotocol/claude-agent-acp (formerly zed-industries/claude-code-acp)

The old name redirects: `gh api repos/zed-industries/claude-code-acp` returned `full_name = agentclientprotocol/claude-agent-acp`, not archived, last push 2026-11-14. Commit read: `b1c198754d1cb4e086de6c6bc6a9659ae3351a0a`.

Protocol doc (https://agentclientprotocol.com/protocol/slash-commands):
- Agent sends a `session/update` with `sessionUpdate: "available_commands_update"` and `availableCommands`, optionally after session creation and again any time.
- `AvailableCommand`: `name` (required), `description` (required string), `input` (optional, `{ hint }`, unstructured text only).
- A command runs by sending ordinary prompt text such as `/web query` in `session/prompt`; the agent detects the slash prefix.

Adapter code:
- https://github.com/agentclientprotocol/claude-agent-acp/blob/b1c198754d1cb4e086de6c6bc6a9659ae3351a0a/src/slash-commands.ts, `getAvailableSlashCommands` (lines 16-124). Input is the SDK `SlashCommand[]` (import at line 6). Mapping (lines 68-107): `description: command.description || ""`, `input: command.argumentHint ? { hint } : null` (array hints are joined with a space), names ending in ` (MCP)` become `mcp:<name>`.
- Filters: a static unsupported list (`clear`, `cost`, `keybindings-help`, `login`, `logout`, `output-style:new`, `release-notes`, `todos`, lines 43-52) and the names the CLI tags terminal-bound in `system/init` (`terminalCommands`, line 69). Same idea as the spec's `terminal_slash_commands`. Names with whitespace and duplicates are dropped (lines 109-120).
- https://github.com/agentclientprotocol/claude-agent-acp/blob/b1c198754d1cb4e086de6c6bc6a9659ae3351a0a/src/v2/commands.ts line 31: `this.render(await this.query.supportedCommands())`; line 34-36 re-emits `available_commands_update` from the SDK `commands_changed` message (handled in `src/v2/session.ts` line 1011).
- Files are read only for a client-specific extension (`resolveSkillPath` finds a SKILL.md path to put in `_meta`, lines 83-104). The description itself never comes from a file.

SDK facts (https://code.claude.com/docs/en/agent-sdk/typescript, fetched; the page was truncated before the `SlashCommand` type, so its field list is taken from the adapter code above and not from the type page):
- `supportedCommands(): Promise<SlashCommand[]>`; "from Agent SDK v0.3.216 the list reflects mid-session command changes".
- `initializationResult()` returns `SDKControlInitializeResponse`, whose `commands: SlashCommand[]` is the same list.
- `reloadSkills()` returns `{ skills: SlashCommand[] }` in the same shape.
- Fields seen in use: `name`, `description`, `argumentHint` (string or string array, per `Array.isArray` at slash-commands.ts line 73), `builtin` (SDK changelog 0.3.277, https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md), `aliases` (changelog 0.3.284).
- SDK changelog 0.3.287: the `initialize` response now includes commands registered at startup; 0.3.321: skill and command loss after entering a worktree was fixed.

## 3. winfunc/opcode (formerly Claudia)

Repo: https://github.com/winfunc/opcode, commit `c24004d3bbc910bd30b49d402daec254dac26ab2`, 22k stars, last push 2026-11-06. The `sugyan/claudia` path returned 404; the Tauri app is under `winfunc/opcode`.

File: https://github.com/winfunc/opcode/blob/c24004d3bbc910bd30b49d402daec254dac26ab2/src-tauri/src/commands/slash_commands.rs (471 lines, Rust, Tauri like Kokobrain).
- `CommandFrontmatter` has two fields only: `allowed-tools` and `description` (lines 37-43), parsed with `serde_yaml`. A frontmatter parse failure falls back to treating the file as plain content (lines 70-80).
- Scans `<project>/.claude/commands` and `~/.claude/commands` recursively; a subfolder becomes a `:`-joined namespace (`extract_command_info`, lines 85-112; user dir loop near lines 284-300).
- `create_default_commands` hardcodes three built-ins with descriptions (`add-dir`, `init`, `review`, lines 200-245).
- No skills support: grep for `skills|SKILL` in the file returned nothing. Plugin commands are also not scanned.
- Consequence: its list differs from what the CLI loaded, and shows none of the 100+ built-in or plugin commands a real setup has.
- Picker UI: `src/components/SlashCommandPicker.tsx` (found by `gh api search/code`, not read in detail: UNVERIFIED how it renders descriptions).

## 4. siteboon/claudecodeui (Claude Code UI / CloudCLI)

Repo: https://github.com/siteboon/claudecodeui, commit `7943e285fc814a54d5549a34b90fac0805135a24`, 14k stars, last push 2026-11-13.

File: https://github.com/siteboon/claudecodeui/blob/7943e285fc814a54d5549a34b90fac0805135a24/server/modules/commands/commands.routes.ts (634 lines).
- `POST /list` scans `<project>/.claude/commands` and `~/.claude/commands` (lines 480-500) with `scanCommandsDirectory` (lines 121-170).
- Description rule: frontmatter `description`, else the first body line with leading `#` stripped (lines 154-158). Frontmatter comes from a shared `parseFrontMatter` helper (import line 6).
- Seven hardcoded built-ins with descriptions (lines 187-230), handled by the server, not by the CLI.
- No skills scan found in this file (grep for `skills` returned nothing).
- The "first body line" fallback is a cheap rule that Kokobrain could also use when a command has no `description`.

## What this means for Kokobrain

1. Cheapest source with full coverage is the CLI's own initialize response. Both SDK-based projects (t3code, ACP) get name, description and argument hint for built-ins, user and project commands, skills and plugin commands from it, with no file parsing. The Kokobrain panel does not use the SDK (ADR-0038: no Node sidecar). Whether the same data is reachable from the CLI binary without the SDK is another agent's question; the SDK is documented to drive the CLI over a control protocol, but I did not verify the wire format: UNVERIFIED.
2. If file reading is chosen, t3code is the model to copy for skills: the roots and precedence at ClaudeSkills.ts lines 752-770, plugin namespacing `<plugin>:<skill>`, YAML 1.1 boolean tolerance, the `: ` repair, and honoring `skillOverrides` and `enabledPlugins`. It stops short of `commands/*.md`, which opcode and claudecodeui do cover (frontmatter `description` only, namespace from folders).
3. Built-in commands (`compact`, `init`, `review`, and so on) have no file. Both file-based GUIs hardcode a short list. The SDK route avoids that.
4. Fallback chain from t3code: description, then argument hint, then a scope label. claudecodeui adds first body line.
5. Filtering from the ACP adapter matches the spec's `terminal_slash_commands`: drop names the CLI marks terminal-only, and drop names with whitespace.
6. Plugin and project commands reload at runtime (`commands_changed`, `reloadSkills`, `reloadPlugins`). A per-turn process, as in Kokobrain, gets a fresh `system/init` each turn, so freshness is not an issue there.

## Session history (feature B), one line

opcode reads `~/.claude/projects/<project id>/<session id>.jsonl` directly (`src-tauri/src/commands/claude.rs`: `get_project_sessions` line 780, `load_session_history` line 1186, projects dir joins at lines 635, 741, 791, 1198), https://github.com/winfunc/opcode/blob/c24004d3bbc910bd30b49d402daec254dac26ab2/src-tauri/src/commands/claude.rs. claudecodeui lists `.jsonl` handling in `server/modules/providers/list/claude/` (file names only, not read: UNVERIFIED). I did not open either in depth.

## Open questions

- Can the `claude` binary return the `initialize` control response (commands with description and argumentHint) in print mode without the SDK, for example through `--input-format stream-json`? Not tested here.
- The `SlashCommand` type page of the SDK docs was truncated; the exact field list (and whether `argumentHint` is `string | string[]`) rests on adapter code.
- Does `system/init` on 2.1.325 list skill and plugin commands under the same names that SKILL.md folder scanning would give (for example the `<plugin>:<skill>` form)? Needed before joining file descriptions to init names.
- How does opcode's `SlashCommandPicker.tsx` render a missing description? Not read.
- The legacy `commands/*.md` frontmatter keys the CLI honors beyond `description` and `argument-hint` were not checked against the bundle in this task.

## Claims to verify

- t3code's `ClaudeSkills.ts` reads only skill directories and never `commands/*.md` (grep of the file at the pinned commit).
- t3code gets command descriptions from `q.initializationResult().commands`, not from `supportedCommands()` (ClaudeProvider.ts line 536 and 600; the literal `supportedCommands` has no hit in the repo code search).
- claude-agent-acp copies `command.description` from `Query.supportedCommands()` into `available_commands_update` without reading files for the description (src/slash-commands.ts lines 89-92, src/v2/commands.ts line 31).
- opcode has no skills support and hardcodes exactly three default commands (slash_commands.rs lines 200-245).
- claudecodeui falls back to the first body line when `description` is missing (commands.routes.ts lines 154-158).
- The ACP `AvailableCommand.description` is a required string while `input` is optional (agentclientprotocol.com/protocol/slash-commands).
