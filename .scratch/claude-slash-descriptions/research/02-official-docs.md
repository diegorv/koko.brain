# 02 - Official docs: skills, commands, plugins, MCP prompts, locations

Scope: what the official Claude Code docs say about where slash-menu descriptions come from and where the data lives. Pages were fetched on 2026-11-15 with WebFetch and with `curl <url>.md` into a temp dir outside the repo (every docs page has a `.md` twin). The docs mention versions up to v2.1.324 and the installed CLI is 2.1.325, so they are current for it, but whether each documented behavior is present in 2.1.325 is UNVERIFIED (the bundle check belongs to another research file).

No private data is quoted. All command names below are built-in or bundled.

Sources (all fetched):
- S1 https://code.claude.com/docs/en/skills (`skills.md`)
- S2 https://code.claude.com/docs/en/slash-commands (redirects to the same content as S1: "Custom commands have been merged into skills")
- S3 https://code.claude.com/docs/en/commands (`commands.md`)
- S4 https://code.claude.com/docs/en/plugins-reference (manifest reference), https://code.claude.com/docs/en/plugins/components.md, https://code.claude.com/docs/en/plugins/loading.md
- S5 https://code.claude.com/docs/en/mcp (section "Use MCP prompts as commands")
- S6 https://code.claude.com/docs/en/agent-sdk/slash-commands and https://code.claude.com/docs/en/agent-sdk/typescript.md
- S7 https://code.claude.com/docs/en/claude-directory
- S8 https://code.claude.com/docs/en/headless.md, https://code.claude.com/docs/en/env-vars.md, https://code.claude.com/docs/en/managed-settings.md, https://code.claude.com/docs/en/settings-reference.md

## 1. Headline findings for feature (A)

1. **`slash_commands` and `skills` in `system/init` are string arrays, names only.** S6 TypeScript `SDKSystemMessage`: `slash_commands: string[]`, `skills: string[]`, `terminal_slash_commands?: string[]`, `plugins: { name: string; path: string }[]`. No description field exists on that message. This matches what the spec records for the panel.
2. **The CLI does have a structured command list with descriptions, but through the SDK control protocol, not the `-p` init line.** S6 `SlashCommand`:
   `{ name: string; description: string; argumentHint: string; aliases?: string[]; builtin?: boolean }`,
   returned by `supportedCommands()` and by `SDKControlInitializeResponse.commands`; `SDKCommandsChangedMessage` pushes the full updated list mid-session. `builtin` is true for Claude Code's own commands and absent for user, project, plugin or MCP commands (needs Agent SDK v0.3.277+). The docs do not describe the wire format of the `initialize` control request for a non-SDK client, so whether the panel can obtain this list from a plain `claude -p --output-format stream-json` spawn is UNVERIFIED. Per-turn spawns with a prompt argument do not send an `initialize` request.
3. **If the panel reads disk instead, the description rule is documented and simple.** `description` frontmatter; "If omitted, uses the first non-empty line of the markdown content" (S1 frontmatter table, S2). `when_to_use` is appended to it. Combined text is truncated at 1,536 characters in the model-facing skill listing (S1); whether the `/` menu applies the same cap is UNVERIFIED (S1 only states the cap for "the skill listing").
4. **`argument-hint`** is "Hint shown during autocomplete to indicate expected arguments", e.g. `[issue-number]` (S1). It is a separate field from `description`.
5. **Built-in commands have no files.** Their descriptions exist only in the docs table (S3, 121 rows) or in the SDK `SlashCommand.description`. A static table in the panel would drift with CLI versions.
6. **Hidden entries.** `user-invocable: false` removes the skill from the `/` menu, from `slash_commands` and from the `skills` array (S1, S6). `skillOverrides` value `"off"` also hides it from "Agent SDK callers" and Remote Control lists; `"name-only"` keeps it in the menu (S1 "Override skill visibility from settings"). Skills whose YAML does not parse "still load with no fields set" (S1), so the fallback description rule applies to them.

## 2. SKILL.md and command frontmatter (S1, S2)

Rules: all fields optional, only `description` recommended. Field names must match exactly; unknown fields are ignored without error. Frontmatter is read only when the opening `---` is the first line of the file. Booleans accept `true/false/yes/no/on/off/1/0`. `when_to_use` is the only field name with an underscore.

| Field | Meaning (as documented) |
| :- | :- |
| `name` | Command name in the `/` menu. Default: directory name. |
| `description` | What it does and when to use it. Default: first non-empty line of the body. Shown with `when_to_use`, capped at 1,536 chars combined in the listing. `<` and `>` display as `&lt;` and `&gt;`. |
| `when_to_use` | Extra trigger context, appended to `description`, counts toward the cap. |
| `argument-hint` | Autocomplete hint for arguments. |
| `arguments` | Named positional args for `$name` substitution (string or YAML list). |
| `disable-model-invocation` | `true`: Claude does not auto-load it; user can still type `/name`. Default false. |
| `user-invocable` | `false`: hidden from `/` menu and not runnable by typing. Default true. |
| `allowed-tools`, `disallowed-tools` | Tool grants or removals for the invoking turn only. |
| `model`, `effort` | Overrides for the rest of the current turn. |
| `context` (`fork`), `agent`, `background` | Run in a forked subagent. |
| `hooks`, `paths`, `shell` | Hooks on invoke; auto-load glob gate; `bash` or `powershell`. |
| `metadata`, `license`, `compatibility` | Accepted, not acted on. |

Commands (`.claude/commands/*.md`): "supports the same frontmatter except `name` and `paths`" (S1, S2, S7 "Frontmatter fields by file"). So `description`, `argument-hint`, `model`, `allowed-tools` all apply, plus the rest of the table. The name comes from the file name; a subdirectory adds `:` segments (`commands/frontend/component.md` is `/frontend:component`).

Field list also appears in S7 for `skills/<name>/SKILL.md`: `name, description, when_to_use, argument-hint, arguments, disable-model-invocation, user-invocable, allowed-tools, disallowed-tools, model, effort, context, agent, background, hooks, paths, shell, metadata, license, compatibility`.

Portability note (S1): claude.ai uploads and the Skills API reject `argument-hint` and other Claude Code fields; irrelevant to local files.

## 3. Naming in the slash list (S1 "How a skill gets its command name", S2, S4)

| Source | Slash name |
| :- | :- |
| `~/.claude/skills/<dir>/SKILL.md` or `.claude/skills/<dir>/SKILL.md` | frontmatter `name`, else dir name. The dir name also invokes it. |
| Nested `.claude/skills/` on a name clash | `/<subdir path>:<name>` (example in docs: `/apps/web:deploy`) |
| `--add-dir` skill that clashes | `/<added folder>:<name>` (v2.1.309+) |
| `.claude/commands/x.md`, `commands/sub/x.md` | `/x`, `/sub:x` |
| Plugin `skills/<dir>/SKILL.md` | `/<plugin>:<dir>`; frontmatter `name` replaces the last segment; the prefix is not doubled when `name` already carries it (v2.1.246+). Bare `/<name>` also works unless taken. |
| Plugin `commands/<file>.md` | `/<plugin>:<file>`; `commands/db/migrate.md` is `/my-plugin:db:migrate` (S4 components.md) |
| Plugin root `SKILL.md` | `/<plugin>:<name or plugin dir name>` |
| Plugin manifest `commands` object map | `/<plugin>:<key>`; entries take `description`, `argumentHint`, `model`, `allowedTools`, and `source` or `content` (S4 manifest reference) |
| Saved workflow `workflows/*.js` (project or `~/.claude`) | "each file becomes a `/<name>` command" (S7 file table) |
| claude.ai synced skill | `/anthropic-skills:<name>`, or short `/<name>` if free |
| MCP prompt | listed as `/servername:promptname (MCP)`; typed form `/mcp__servername__promptname` (S5) |

Plugin name rules: no spaces, `@`, `:`, path separators (S4 `name`). Plugin names are kebab-case by convention, and `name` is the namespace for every component.

Non-interactive nuance (S1): in `-p` and SDK sessions the names `help` and `feedback` are not reserved, so a plugin skill with that name keeps its bare command there; other terminal-only built-in names stay reserved.

## 4. Locations and precedence (S1, S2, S7, S8)

Locations (S1 "Choose where skills load"):

| Scope | Path |
| :- | :- |
| Enterprise (managed) | `.claude/skills/<name>/SKILL.md` inside the managed settings directory: macOS `/Library/Application Support/ClaudeCode/`, Linux/WSL `/etc/claude-code/`, Windows `C:\Program Files\ClaudeCode\` (S8 managed-settings) |
| Personal | `~/.claude/skills/<name>/SKILL.md`, `~/.claude/commands/*.md` |
| Project | `.claude/skills/...` in the start dir and every parent up to the repo root; `.claude/commands/` |
| Nested | `<subdir>/.claude/skills/...`; loaded only after Claude reads or edits a file there, until then not in the `/` menu (S1) |
| Additional dir | `.claude/skills/...` under each `--add-dir`; its `.claude/commands/` is not discovered or watched |
| Plugin | `<plugin>/skills/`, `<plugin>/commands/` (root of the installed plugin) |
| claude.ai synced | `~/.claude/skills/synced/` |

Precedence when names collide (S1 "Resolve skills that share a name"):
- enterprise over personal over project; skill over `.claude/commands/` file with the same name;
- a local skill replaces a bundled skill or built-in command of the same name, but not its aliases (`/review` still runs `/code-review`; `/cost` still runs the built-in);
- plugin skills never collide because they are namespaced; both load;
- nested plus root with same name: both load, root wins the bare name.

Worktree detail (S1): in a git worktree the search stops at the worktree root; if the worktree has no `.claude/skills`, the main checkout's skills are used (v2.1.277+). Relevant if the vault is ever a worktree; it is not a concern for a normal vault folder.

Live reload (S1 "Live change detection"): the CLI watches `~/.claude/skills/`, project `.claude/skills/` and added-dir skills and picks up edits in-session; a top-level skills dir created after startup is not watched until `/reload-skills`. `.claude/commands/` in an added dir is not watched. Plugin changes need `/reload-plugins`. Consequence for the panel: any list cached from the first turn's `init` can go stale; each new turn spawns a fresh process, so the next init is current.

## 5. Plugins (S4)

Layout (manifest reference "Standard layout"): `.claude-plugin/plugin.json` (optional; `name` is the only required key), `skills/<name>/SKILL.md`, `commands/*.md`, `agents/`, `hooks/hooks.json`, `.mcp.json`, `.lsp.json`, `output-styles/`, `workflows/`, `themes/`, `monitors/monitors.json`, `bin/`. Without a manifest, defaults load and the name comes from the marketplace entry or directory.

Manifest keys that change discovery: `skills` (adds to default `skills/`), `commands` (replaces default `commands/`; path, array or object map), `agents` (replaces). Component paths must start with `./` and stay inside the plugin root.

On disk (loading.md "Find plugins on disk"), plugins root is `~/.claude/plugins` unless `CLAUDE_CODE_PLUGIN_CACHE_DIR` is set:
- `cache/<marketplace>/<plugin>/<version>/` : one dir per installed version; this is `${CLAUDE_PLUGIN_ROOT}`. Old versions get an `.orphaned_at` marker and are deleted after 14 days, so several version dirs for one plugin can coexist.
- `installed_plugins.json`, `known_marketplaces.json` : install records (schema not documented; UNVERIFIED).
- `marketplaces/<name>/`, `data/<plugin-id>/`, `synced/`, `.trash/`.
- `--plugin-dir` and local-path marketplace plugins load in place, never copied, so they are not under `cache/`.
- Enablement is in settings `enabledPlugins` (settings reference); the docs say an installed plugin may be disabled, so presence in `cache/` is not proof it is active.

The robust discovery signal is `system/init.plugins[].path` (S6 type `{ name: string; path: string }[]`): it names each loaded plugin and its root, so a reader of plugin skill files needs no knowledge of the cache layout or enablement. Whether `path` is the version directory is UNVERIFIED.

## 6. MCP prompts (S5)

- "Claude Code lists each MCP prompt as `/servername:promptname (MCP)`. Typing `/mcp__servername__promptname` also runs it."
- Arguments: space-separated after the command, split on whitespace, one token each; "Arguments are parsed based on the prompt's defined parameters".
- Name normalization (S5 tip): in the `/mcp__server__prompt` form, characters in the server name outside `A-Z a-z 0-9 _ -` become `_`; the prompt name is used as the server declares it.
- Prompts of a server named `anthropic-skills` are not listed (reserved name).
- Prompts are fetched with `prompts/list` after connect (retried up to 3 times); in `-p` and the SDK a `list_changed` notification refreshes only the tool list, not prompts (S5 "Dynamic tool updates").
- The Agent SDK page says MCP prompts can appear as commands in sessions that configure MCP servers (S6). The form in `slash_commands` is UNVERIFIED by docs.
- The MCP protocol gives each prompt a `description` and `arguments`; the docs do not say the CLI shows them. UNVERIFIED here.

## 7. Built-in commands (S3)

S3 "All commands" table has 121 rows (counted with grep on the `.md`), each `| \`/name [args]\` | Purpose |`. Entries marked **Skill** are bundled skills (20 rows); some are marked **Workflow**. Not every command appears for every user (platform, plan, environment). A few are hidden from the menu until fully typed (e.g. `/heapdump`). Names (arguments omitted), verbatim from the table:

add-dir, advisor, agents, artifact-capabilities, artifact-diagramming, artifacts, auto-mode-setup, autocompact, autofix-pr, background, batch, branch, btw, bug, cd, chrome, claude-api, claude-in-chrome, clear, code-review, color, compact, config, context, copy, cost, dataviz, debug, deep-research, design, design-login, design-sync, desktop, diff, doctor, effort, exit, export, fast, feedback, fewer-permission-prompts, focus, fork, goal, heapdump, help, hooks, ide, import, init, insights, install-github-app, install-slack-app, keybindings, list-agents, login, logout, loop, mcp, memory, mobile, model, output-style, passes, permissions, plan, plugin, plugin-authoring, powerup, pr-comments, privacy-settings, radio, rate-limit-options, recap, release-notes, reload-plugins, reload-skills, remote-control, remote-env, rename, restart, resume, review, rewind, run, run-skill-generator, sandbox, schedule, scroll-speed, security-review, setup-bedrock, setup-vertex, simplify, skill-doctor, skills, slides, stats, status, statusline, stickers, stop, subtask, tasks, team-onboarding, teleport, terminal-setup, theme, tui, ultraplan, ultrareview, update-config, upgrade, usage, usage-credits, verify, vim, voice, web-setup, workflow-authoring, workflows.

Examples of the Purpose text style (quotable): `/run` "Launch and drive your app to see a change working"; `/verify` "Confirm a code change does what it should by building your project's app, running it, and observing the result, rather than relying on tests or type checks". Purpose texts are long, often with links; they are docs prose, not the short `description` the CLI itself shows. Using them in the panel would need trimming and would drift.

Print-mode availability (S8 headless): "User-invoked skills and custom commands work. Include `/skill-name` in the prompt string and Claude Code expands it before running." "Built-in commands that only run in the terminal interface, such as `/login`, aren't available." `/model`, `/effort`, `/fast`, `/color`, `/rename` take an argument; `/mcp` with no argument prints a text summary; `/config key=value` works; `/output-style` works (v2.1.269+). An unknown `/name` is sent to the model as a normal message with a note, since v2.1.274 (S6); a terminal-only built-in returns "`/theme isn't available in this environment.`" with no model turn.

Menu behavior (S3 "How the command menu matches what you type"): filtering ignores `:`, `_`, `-`; alias matches highlight (`/new` highlights `/clear`); unavailable commands are left out; hidden commands appear only on full-name typing. `/skills` filters "by name, description, or source".

## 8. CLAUDE_CONFIG_DIR and session storage (S7, S8)

- `CLAUDE_CONFIG_DIR`: "Override the configuration directory (default: `~/.claude`). All settings, session history, and plugins are stored under this path." Every `~/.claude` path in S7 moves under it, and `~/.claude.json` moves too. Cannot be set from project or local settings. A path value must be absolute (no `~` expansion in settings `env`). The panel's child inherits the captured login-shell env, so a `CLAUDE_CONFIG_DIR` exported there applies to both the CLI and any disk reader the app adds; an app-side reader must use the same variable.
- `CLAUDE_CODE_PROJECT_DIR_NAME` (with `CLAUDE_CONFIG_DIR`) overrides the `projects/<dir>` name.
- Transcripts: `~/.claude/projects/<project>/<session>.jsonl`; `<project>` is the working directory path with non-alphanumerics replaced by `-` (docs example `-Users-you-my-project`, written for the scratchpad; the same shape is in the repo's session dir name given in the task). Older transcripts are deleted after `cleanupPeriodDays` (default 30, min 1). Related to feature (B): a stored session id older than the retention window may no longer resume. `projects/<project>/<session>/subagents/` and `tool-results/` sit beside the jsonl. Transcripts are plaintext and hold file contents, command output and the system prompt (S7 "Plaintext storage").
- `--no-session-persistence` with `-p` and `CLAUDE_CODE_SKIP_PROMPT_HISTORY` disable transcript writes (S7), so resume depends on neither being set.
- `claude purge <path>` deletes a project's transcripts and `history.jsonl` lines (S7).

## 9. Skill listing budget (S1 "Skill descriptions are cut short", S8)

The listing sent to the model always keeps every name, drops descriptions of least-invoked skills when over budget (1% of the context window), and caps each entry at 1,536 chars. Settings `skillListingBudgetFraction`, `skillListingMaxDescChars`, env `SLASH_COMMAND_TOOL_CHAR_BUDGET`. These shape what the model sees. The docs do not say they affect the `/` menu text or the SDK `description`, so a description read from disk is complete and independent of the budget (UNVERIFIED for the SDK path).

## 10. What this implies (inputs for the Issue, not decisions)

- Option 1, SDK control protocol: richest and version-proof (includes built-ins, aliases, `argumentHint`, MCP and plugin commands), but needs a long-lived stream-json-input process and an undocumented-for-non-SDK-clients handshake.
- Option 2, disk reader for user, project, plugin and `--add-dir` skills and commands, keyed by names from `init`: documented rules, no CLI changes, but must re-implement frontmatter parsing, the first-line fallback, precedence, namespacing and `init.plugins[].path`. Built-ins and MCP prompts stay without descriptions unless a small static table is added.
- Names in `init.slash_commands` are the join key either way. The docs example shows bare names (`clear`, `compact`, `code-review`, `security-check`); the namespaced `plugin:skill` form in that array is UNVERIFIED by docs and should be checked against the capture shape.

## Open questions

1. Can a non-SDK client obtain `SlashCommand[]` from the CLI (the `initialize` control request over `--input-format stream-json`), and does it work with a per-turn spawn or only a persistent process? Wire format is not in the docs.
2. Does the `/` menu in the TUI truncate `description` the same way as the model-facing listing (1,536 chars, `skillListingMaxDescChars`)?
3. Is `init.plugins[].path` the version directory (`cache/<marketplace>/<plugin>/<version>/`) or the marketplace entry? Does it include plugins loaded in place?
4. How does the CLI name plugin skills and MCP prompts inside `init.slash_commands` (bare, `plugin:name`, `server:prompt`, `mcp__server__prompt`)?
5. Does the CLI show an MCP prompt's own `description` in the menu?
6. Exact schema of `installed_plugins.json` and where `enabledPlugins` is merged from, if a disk reader is chosen.
7. Do the docs for 2.1.325 match the pages fetched today (pages cite changes up to v2.1.324)?

## Claims to verify

1. `init.slash_commands` and `init.skills` carry names only, with no description (S6 type; confirm against the real capture shape without copying names).
2. A command file with no `description` falls back to the first non-empty body line, and `.claude/commands` and `SKILL.md` share the same fallback (S1, S2).
3. `.claude/commands/*.md` accepts every skill field except `name` and `paths` (S1, S7).
4. Plugin skills appear as `/<plugin>:<name>`, plugin commands as `/<plugin>:<file>` with subdirectory segments joined by `:` (S1, S4 components).
5. Precedence: enterprise over personal over project; skill over same-named command file; plugin entries never collide (S1).
6. `user-invocable: false` and `skillOverrides: "off"` entries are absent from `init.slash_commands` and `skills` (S1, S6).
7. `SlashCommand` has `name`, `description`, `argumentHint`, `aliases`, `builtin` (S6 `typescript.md`), and `supportedCommands()` and the `initialize` response return it.
8. In `-p` mode, user skills and custom commands expand; terminal-only built-ins return an "isn't available" message; an unknown `/name` is sent to the model (S6, S8).
9. `CLAUDE_CONFIG_DIR` relocates skills, plugins and transcripts, and transcripts expire after `cleanupPeriodDays` (default 30) (S7, S8).
10. The MCP prompt menu form is `/servername:promptname (MCP)` and the runnable form is `/mcp__servername__promptname` (S5).
