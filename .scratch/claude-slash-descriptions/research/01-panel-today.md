# 01: How slash commands reach the panel today

Scope: the path from the CLI's `system/init` line to the `/` menu in the agent panel, and what the real capture shows. Research only; no repo code changed. Branch `mvp-claude`, claude 2.1.325.

## Summary

- The panel gets slash commands from exactly one source: the `slash_commands` array of `system/init`, an array of bare name strings. No descriptions, no argument hints, no source labels.
- The CLI's own command objects do carry `description` and `argumentHint` (bundle evidence below), but the `init` builder maps them to `name` only. So descriptions must come from somewhere else (SKILL.md frontmatter, command `.md` frontmatter, plugin files), not from the stream.
- The list arrives only after the first message of a chat, because the CLI is spawned once per turn and `init` is the first line of a turn.
- `Init.skills` is parsed and exported to TypeScript but nothing in the frontend reads it.

## Rust: `init_event`

- `src-tauri/src/commands/claude/stream.rs:123` routes `{"type":"system","subtype":"init"}` to `init_event`. Other `system` subtypes (`hook_started`, `hook_response`, `status`) fall through to `_ => Vec::new()` at line 137.
- `stream.rs:141-152`: `init_event` reads `terminal_slash_commands`, then builds `ClaudeEvent::Init` with four fields only: `session_id`, `model`, `slash_commands` (the CLI list minus the terminal-only names), `skills` (CLI list unchanged).
- `strings()` at `stream.rs:281-288` keeps only string elements of an array and silently drops anything else. If a future CLI sent objects in `slash_commands` (for example `{name, description}`), the panel would get an empty list with no error. Relevant for any plan that depends on the CLI changing the shape.
- DTO: `stream.rs:17-31` (`ClaudeEvent::Init`, `#[ts(export)]`). Generated binding: `src/lib/contracts/generated/ClaudeEvent.ts` (Init: `sessionId`, `model`, `slashCommands: Array<string>`, `skills: Array<string>`). Adding a field to `Init` is an IPC DTO change, so per CLAUDE.md rule 6 it is a "Both" change (cargo test regenerates the binding, which is committed).
- Test of the filter: `src-tauri/tests/commands/claude_stream_test.rs:206-213` (`doctor` and `color` removed, `hello` and `review` kept). Test of the real capture: same file, line 25-45 (`slash_commands` = 3 names, `skills` = 1 name).

## Turn spawn (why the list is late)

- `src-tauri/src/commands/claude/turn.rs:90-112` (`build_args`): `-p --output-format stream-json --verbose --include-partial-messages --permission-mode bypassPermissions [--resume id] [--model m] --append-system-prompt ... -- <prompt>`. The prompt is mandatory; there is no spawn that only asks for `init`.
- `turn.rs:122` runs the process with `current_dir(vault_path)`.
- So the CLI never runs before the first user message. `init` comes at the start of that first turn, and every later turn emits a fresh `init` with a fresh list.

## Frontend: store and logic

- `src/lib/features/claude-code/claude.logic.ts:43-44` and `:58`: `ChatState.slashCommands: string[]`, initial `[]`.
- `claude.logic.ts:122-124` (`applyEvent`, case `Init`): `slashCommands: event.slashCommands` replaces the whole list on every `Init`; `sessionId` is kept from `Init` too. `event.skills` is never read (grep for `skills` in `src/lib/features/claude-code/` finds no hit outside tests passing `skills: []`).
- `claude.logic.ts:104-107` (`resetChat`): a new chat keeps `slashCommands` ("they belong to the app session").
- `claude.store.svelte.ts:25-26`: getter `slashCommands`. `claude.store.svelte.ts:55-58`: `reset()` (called by `resetClaude` on vault close, `claude.service.ts:81-89`) sets `chat = EMPTY_CHAT`, which clears the list. So the list survives "New chat" but not a vault close or an app restart; the store header (line 4) says chat lives in memory only.
- `claude.logic.ts:200-203` `slashQuery`: `/^\/(\S*)$/` on the whole prompt; the menu is open only while the text is a lone `/word` with no whitespace.
- `claude.logic.ts:205-211` `filterSlashCommands(query, commands: readonly string[]): string[]`: case-insensitive, prefix matches first, then names containing the query, each group in list order. It matches on the name string only; a description cannot be searched without changing its signature. Return type is `string[]`, so a description lookup would be a second map keyed by name, or a change to an object list.

## Frontend: the menu in `ClaudePanel.svelte`

- `ClaudePanel.svelte:61-62`: `query = slashDismissed ? null : slashQuery(prompt)`, `slashMatches = filterSlashCommands(query, claudeStore.slashCommands)`.
- `:130-135` `pickSlashCommand(name)`: sets `prompt = "/" + name + " "`.
- `:145-165` keys: ArrowUp/Down move `slashIndex`, Enter or Tab pick, Escape dismisses (`slashDismissed`).
- `:324-340` render: `max-h-48` scroll box, `role="listbox"`; each row is one `<button role="option">` with `class="block w-full truncate px-2 py-1 text-left"` whose only content is `/{name}`; `data-claude-slash-option={name}`. The empty state at line 337 reads "Slash commands load after the first message." when the list is empty, else "No matching command."
- Layout consequence for descriptions: rows are single-line and truncated, so a description needs a second text span or a two-line row, and the `max-h-48` box shows fewer rows.
- Tests that pin the current rows: `src/tests/lib/features/claude-code/ClaudePanel.test.ts` lines 101, 579, 594 (they feed `slashCommands` as a string array through an `Init` event); `claude.logic.test.ts:52-53, 287-290`; `claude.store.test.ts:14, 23-32, 69-76`.

## The real capture: `system/init`

File: `.scratch/claude-code-integration/research/stream-json-capture/turn.ndjson`, 30 lines, 15544 bytes. Line 3 is the init line (2137 bytes). Lines 1-2 are `system/hook_started` and `system/hook_response`, line 4 is `system/status`.

Command run: a short `python3 -I` script that loads line 3 and prints key names, types, list lengths and name shapes only.

IMPORTANT limit: Issue 08 records that the capture was made in a temporary vault and that the `init` lists (`tools` MCP entries, `slash_commands`, `skills`, `plugins`, `mcp_servers`) "were cut to neutral entries in the real shape" (`.scratch/claude-code-integration/issues/08-real-stream-json-fixture.md`, Notes). So the counts below describe the sanitized fixture, not the owner's setup (the spec reports 126 slash commands, 88 skills and 133 tools for that, `spec.md:21`).

All keys of `system/init` in the capture (type, then what it holds):

| Key | Type | Content (structure only) |
|---|---|---|
| `type`, `subtype` | string | `system`, `init` |
| `uuid`, `session_id` | string | 36-char UUIDs |
| `cwd`, `original_cwd` | string | same value; the vault dir |
| `additional_directories` | string[] (1) | extra dirs the CLI has access to |
| `claude_code_version` | string | `2.1.325` |
| `model` | string | model id |
| `permissionMode` | string | `bypassPermissions` |
| `apiKeySource` | string | `none` |
| `output_style` | string | `default` |
| `view_mode` | string | `default` |
| `tools` | string[] (25) | tool names: 24 plain, 1 `mcp__x__y` |
| `slash_commands` | string[] (3) | bare names, no leading `/`, no duplicates |
| `terminal_slash_commands` | string[] (4) | `doctor`, `color`, `focus`, `reload-plugins`; none of them is in `slash_commands` in this capture |
| `skills` | string[] (1) | bare names |
| `agents` | string[] (3) | agent type names (for example built-ins `Explore`, `general-purpose`) |
| `plugins` | object[] (1) | each `{name, path, source}`, all strings |
| `mcp_servers` | object[] (2) | each `{name, source, status}`, all strings |
| `capabilities` | string[] (20) | protocol capability flags (`*_v1`) |
| `memory_paths` | object | one key, `auto`, a string path |
| `messaging_socket_path` | string | a socket path |
| `fast_mode_state`, `fast_mode_disabled_reason` | string | fast-mode status |
| `analytics_disabled`, `product_feedback_disabled`, `per_turn_effort_active`, `ultrathink_available`, `ultrathink_typed_raises` | boolean | flags |

Answers to the specific questions:

- **Do plugin entries carry a path?** Yes. `plugins[i].path` is an absolute path string (8 path segments in the capture); `source` has the shape `name@marketplace` (one word, `@`, one word); `name` is a string. The bundle schema also lists an optional `version` (see below). The path is the plugin's directory, which is where its `commands/`, `skills/` and `agents/` would live (UNVERIFIED: the layout of a plugin dir was not inspected here; see other research files).
- **`mcp_servers`:** each entry has `name`, `status` (`connected` and `failed` seen) and `source` (`user` and `plugin` seen). A plugin-provided server's name has the shape `plugin:x:y` (three words, colons). No tools or prompts are listed per server in `init`.
- **Is `skills` a subset of `slash_commands`?** In the fixture, yes (1 of 1 is in the 3), but that is a sanitized fixture, so it proves nothing. UNVERIFIED for a real setup. Evidence that points to yes: the CLI registers skills as invocable commands, and the two lists use the same `userInvocable !== false` filter (bundle, below). Evidence against a clean equality: `slash_commands` also lists built-in and custom commands, and `skills` additionally drops entries with `rowFromHost`. The spec's counts (88 skills vs 126 commands) are consistent with a subset but do not prove it. A one-off check needs a real init line from the owner's vault, which needs a paid model call and was not run.
- **Name shapes.** In the capture all `slash_commands` and `skills` names are plain (no `:`). `plugin:name` for plugin commands and skills, and `mcp__x__y` for MCP prompts, are NOT present in the sanitized `slash_commands`, so they are UNVERIFIED here. What the capture does show: the `mcp__x__y` shape in `tools` (1 of 25) and a `plugin:x:y` shape in an MCP server name. The shape of plugin skill names in `slash_commands` must come from another source (docs or a real init line).
- **The list loads only after the first message.** Confirmed by `turn.rs:90-112` (the prompt is part of the spawn args; no init-only mode) and by the empty-state text at `ClaudePanel.svelte:337`. Each turn re-sends the list, and `applyEvent` replaces the stored list each time.

## Bundle evidence: what the CLI puts in init

Binary: `~/.local/share/claude/versions/2.1.325` (347406976 bytes). Method: `grep -a -b -o '<needle>' <binary>` to get byte offsets, then `dd if=<binary> bs=1 skip=<offset-N> count=M | tr -c '[:print:]\n' '?'` to read the surrounding JS. (A plain `grep -o '.{300}needle.{500}'` on the whole binary times out at 120 s; use offsets.)

- Offset 298555125 (init builder, function taking `e`): 
  - `slash_commands: e.commands.filter(t => t.userInvocable !== false).map(t => t.name)`
  - `terminal_slash_commands`: commands with `userInvocable !== false && terminalOriented === true`, mapped to `name`, added only when non-empty.
  - `skills: dedupeByName(e.skills).filter(t => t.userInvocable !== false && !t.rowFromHost).map(t => t.name)`
  - `agents: e.agents.map(t => t.agentType)`; `plugins: e.plugins.map(<fn>)`; `mcp_servers: e.mcpClients.map(t => ({name, status, source?}))`.
  - So descriptions exist on the command and skill objects in memory but only `name` is emitted.
- Offset 280726308 (zod schema of the init message, same binary): `slash_commands: A(o())` (array of strings), `terminal_slash_commands` (optional, described as "Subset of slash_commands whose UX is bound to the local terminal ... Phone/remote UIs should hide these"), `skills: A(o())`, `plugins: A({name, path, source (optional, "name@marketplace"; sentinels such as name@inline for --plugin-dir, name@skills-dir for .claude/skills plugins, name@builtin), version (optional)})`, `mcp_servers: A({name, status, source (optional)})`. This is the declared contract: a string array, so a CLI that stays within its schema will not add descriptions to the stream.
- Offset 299625432 (a built-in artifact command definition): command objects carry `name`, `description`, `argumentHint`, `userInvocable`, `disableModelInvocation`, `rowFromHost`, `getPromptForCommand`. This shows the internal shape that has a description and an argument hint.

Consequence for the "terminal-only" filter: `terminal_slash_commands` is described as a subset of `slash_commands`, and `init_event` subtracts it (`stream.rs:148`). In the capture the two lists do not overlap (Issue 13 notes the same, `13-stream-session-errors-retries.md`), so the filter is exercised only by the hand-written unit test.

## What the panel would need for (A), as facts only

1. The stream gives names only, so a description source outside the stream is required. What is available on disk is covered by the other research files, not this one.
2. The `Init` DTO has no place for descriptions; the frontend list is `string[]`; `filterSlashCommands` takes `readonly string[]` and returns `string[]`; the menu row template renders `/{name}` only. Any of these changes together with its tests (Panel, logic, store, stream tests, generated binding).
3. If descriptions come from the CLI's disk files, they can be read before the first message, which would also remove the empty "load after the first message" state. Names in `slash_commands` are the join key, so the name shapes (plain, `plugin:name`, `mcp__x__y`) decide how a name maps to a file. Only the plain shape is confirmed by the fixture.
4. `Init.skills` is already available in the frontend event but unused. It could mark which names are skills, if the menu should label them.

## Open questions

- In a real (unsanitized) init line, what are the name shapes of plugin commands and skills in `slash_commands` (`plugin:name`, `name`, or both)? Does `slash_commands` contain MCP prompt names (`mcp__x__y`)? Needs a real init line from a vault with plugins and MCP servers, or a docs source.
- Is `skills` a strict subset of `slash_commands` in a real setup, and are there skills with `userInvocable: false` that appear in neither?
- Do built-in commands (for example ones with no file on disk) appear in `slash_commands`, and if so, where would their descriptions come from?
- Does the CLI re-emit `init` when plugins reload mid-session (`reload-plugins` is terminal-only), so a long-lived list could go stale? Not applicable per turn, since every turn spawns a fresh process.
- Does a newer CLI version add descriptions to `init`? Only 2.1.325 was inspected; the installed schema says no.

## Claims to verify

- `init_event` emits `slash_commands` and `skills` as name-only string lists (`stream.rs:141-152`), and the CLI's init builder maps commands to `.name` only (bundle offset 298555125).
- Nothing in `src/lib/features/claude-code/` reads `Init.skills`.
- `resetChat` keeps `slashCommands` but `claudeStore.reset()` clears them (`claude.logic.ts:104-107`, `claude.store.svelte.ts:55-58`).
- Plugin entries in `init` carry `name`, `path` (absolute), `source` and optionally `version`; MCP server entries carry `name`, `status`, `source`.
- The fixture's init lists were sanitized to neutral entries, so subset and name-shape conclusions cannot be drawn from it (Issue 08 Notes).
- `strings()` drops non-string array elements, so a CLI that changed `slash_commands` to objects would yield an empty list without an error.
