# 07 - Mapping init names to a source with a description

Question: how does each name in the init `slash_commands` and `skills` lists map to something that carries a description, and what breaks if the app reads files instead of asking the CLI?

Evidence tags: `[repo]` file:line in this worktree, `[fixture]` `.scratch/claude-code-integration/research/stream-json-capture/turn.ndjson` (parsed with python, structure only), `[doc]` URL + section, `[bundle]` string found in the 2.1.325 binary (`strings -n 8 <binary>` into a temp file, then substring/regex search for the quoted identifier; minified names such as `wRr` are local to that build), `[cmd]` command I ran. Home is `~`, the vault is `<vault>`. No note, prompt, skill body or title is copied here.

## 1. What the two init lists are

- Builder, bundle: `slash_commands: e.commands.filter(t => t.userInvocable !== false).map(t => t.name)` and `skills: <skills>.filter(t => t.userInvocable !== false && !t.rowFromHost).map(t => t.name)` [bundle, function `PMt`, found by searching `subtype:"init"`]. Both lists carry the internal `name`, never a description.
- `terminal_slash_commands` = commands with `terminalOriented === true`, a subset of `slash_commands` [bundle, same function]. The repo drops them from the menu [repo: src-tauri/src/commands/claude/stream.rs:141-150].
- The panel stores `slashCommands: string[]` and filters by name only [repo: src/lib/features/claude-code/claude.logic.ts:44,124,206-211].
- Fixture shape [fixture, init event]: `slash_commands` is 3 strings, `skills` 1 string, `plugins` is a list of objects with keys `name`, `path`, `source` (value shaped `name@marketplace`), `mcp_servers` 2 objects (`name`, `status`), `agents` 3 strings. Every `skills` entry is also in `slash_commands`; 2 `slash_commands` entries are not in `skills`.
- In the fixture those 2 are a vault command file (the `hello` fixture) and the built-in `init`. So `skills` is a strict subset that leaves out command files and built-ins. The init builder reads the field `skills` of its input, so this subset rule is applied before the builder; I did not find that rule [UNVERIFIED: exact rule; observed in the fixture only].
- Docs agree: `slash_commands` "mixes built-in commands, bundled skills, your user-invocable skills, and `.claude/commands/` files"; `skills` lists user-invocable skills plus bundled skills; `user-invocable: false` skills are in neither [doc: https://code.claude.com/docs/en/agent-sdk/slash-commands, "Discover available commands", "Confirm skills loaded"].
- Owner scale: 126 slash commands, 88 skills [repo: .scratch/claude-code-integration/spec.md:21], so at least 38 names are not skills.

## 2. Name class table

| Class | Name in init | Description source | File-backed? |
|---|---|---|---|
| User command file | `<file stem>`; nested dirs become `a:b:stem` | frontmatter `description`, else first non-empty body line | yes, `<config dir>/commands/**/*.md` |
| Project command file | same rule | same | yes, `<dir>/.claude/commands/**/*.md` for cwd and each parent up to the repo root |
| User or project skill | skill directory name | frontmatter `description`, else first non-empty body line | yes, `.../skills/<dir>/SKILL.md` |
| Skill in a nested or `--add-dir` dir that clashes | `apps/web:deploy`, `cli:verify` style | same | yes, but the prefix depends on what else loaded |
| Plugin skill | `<plugin>:<skill>` | SKILL.md frontmatter `description` | yes, inside the plugin install dir |
| Plugin command file | `<plugin>:<name>` | file frontmatter, or manifest `commands` map `description` | yes, or inline in `plugin.json` |
| Plugin inline command (`content`) | `<plugin>:<key>` | manifest `description` | no file, JSON only |
| Plugin registered command (mod `$.command.register`) | bare `name` | text the plugin passed | no |
| MCP prompt | `mcp__<server>__<prompt>` | server's `prompts/list` description | no, remote |
| Built-in command | bare name | compiled into the binary | no |
| Bundled skill | bare name (`code-review`, `simplify`, `loop`, ...) | compiled into the binary, may be computed | no |
| Synced claude.ai skill | `anthropic-skills:<name>` style | server catalog | partly, `~/.claude/plugins/synced` exists on this machine [cmd: `ls`, 1 entry] |
| Host catalog row | any, from `CLAUDE_CODE_HOST_SKILL_CATALOG` | empty string | no, and excluded from `skills` |

Evidence per row follows.

### 2.1 Command files (`commands/`)

- Name rule: file stem; subdirectory path relative to `commands/` with each `/` replaced by `:`, then the stem [doc: https://code.claude.com/docs/en/skills, "How a skill gets its command name" table; `.claude/commands/frontend/component.md` gives `/frontend:component`]. The bundle does the same: `V5n` joins relative dir segments with `:` and `mus`/`gus` build `dirs:stem` [bundle, search `function V5n(`]. A `SKILL.md` inside a commands subfolder takes the folder name (`pus`).
- Frontmatter `name` and `paths` do not apply to command files [doc: same page, "Choose where skills load"]. The bundle passes `displayName: void 0` for them and tags them `loadedFrom:"commands_DEPRECATED"` [bundle, search that string].
- Description: `fge(frontmatter.description, name) ?? hZe(body, "Custom command")`, i.e. frontmatter description, else a line derived from the body [bundle, `function SHe(`]. Doc: "If omitted, uses the first non-empty line of the markdown content" [doc: skills, "Frontmatter reference"]. Whether `hZe` is exactly the first non-empty line, or trims or strips headings, is [UNVERIFIED].
- Search roots, bundle `Aur`/`qpe`: managed policy dir `<managed>/.claude/commands`, user dir `<config dir>/commands`, and `.claude/commands` in cwd and each parent up to the repo root (or home). Gated by `Kt("userSettings")` and `Kt("projectSettings")`.
- Fixture: the vault command appears as a plain stem in `slash_commands` and not in `skills` [fixture].
- Owner machine: 0 command files under `~/.claude/commands` and 0 under `<vault>/.claude/commands` [cmd: `find ... -name '*.md' | wc -l`]. Nested names matter for other users, not for this vault today.

### 2.2 Skills (`skills/<dir>/SKILL.md`)

- Name: directory name; frontmatter `name` "defaults to the directory name" and sets what the `/` menu shows, but "the directory name also invokes the skill" [doc: skills, "How a skill gets its command name" and "Frontmatter reference"].
- Bundle detail that matters for mapping: the loader sets the command's internal `name` to the directory name (`skillName: ve.name`) and keeps frontmatter `name` as `displayName`, which feeds `userFacingName()` [bundle, `function cko(`, `function yBn(`]. The init builder maps `t.name` (shown in section 1). Therefore init lists directory names, while the SDK `commands` rows (section 4) use the display name and put the other one in `aliases`. A reader keyed by frontmatter `name` can miss a skill whose name differs from its directory.
- Owner skills: 44 SKILL.md under `~/.claude/skills`, 4 under `<vault>/.claude/skills`; 0 have a `name` that differs from the directory [cmd: python regex over frontmatter, counts only].
- 46 entries under `~/.claude/skills`, of which 43 are symlinks and 2 lack SKILL.md [cmd: `ls | wc -l`, `find -type l`]. A reader must follow symlinks and skip dirs without SKILL.md; the CLI also dedupes files by inode ("Skipping duplicate file ... same inode") [bundle, `Aur`].
- Owner frontmatter: all 48 have a `description`, 1 uses a YAML block scalar (`|` or `>`), 23 set `disable-model-invocation: true`, 0 set `user-invocable: false` [cmd, counts only]. Block scalars break line-regex parsing; use a YAML parser. `disable-model-invocation: true` skills stay in init (they are user-invocable) [doc: skills, "Control who invokes a skill"].
- Description length: "the combined `description` and `when_to_use` text is truncated at 1,536 characters in the skill listing" [doc: skills, "Frontmatter reference"]. This is the listing sent to the model; whether the menu text is cut the same way is [UNVERIFIED].

### 2.3 Plugin commands and skills

- Plugin name: `plugin.json` `name`; every component is namespaced under it. Without a manifest the name comes from the marketplace entry or, with `--plugin-dir`, the directory name [doc: https://code.claude.com/docs/en/plugins-reference, "Manifest file", "name"].
- Skills: `skills/<dir>/SKILL.md` gives `/<plugin>:<dir>`; frontmatter `name` replaces only the last segment [doc: skills, "How a skill gets its command name"]. Bundle: `QAo` builds `${plugin}:${name.replace(/[^a-zA-Z0-9_-]/g,"-")}` and, when the frontmatter name has no colon, adds it as an alias [bundle, search `function QAo(`]. A plugin with `SKILL.md` at its root and no `skills/` loads as a single skill [doc: plugins-reference, "Standard layout"].
- Commands: default `commands/` (flat `.md`), or a `commands` manifest key that REPLACES the default scan; the object form maps key to `source` or inline `content`, with an optional `description` and `argumentHint` [doc: plugins-reference, "commands"]. The `skills` key ADDS to the default `skills/` scan.
- Extra roots: `"skills": ["./extra-skills/", "."]` is valid [doc: plugins-reference, "Path-only fields"]. A file reader that only looks at `<plugin>/skills` and `<plugin>/commands` misses these.
- Description decoration: for plugin rows the CLI wraps the description as `(<plugin display name>) <desc>` or `<desc> (plugin)` [bundle, `function Son(`]. User and project rows get a suffix from `ex(source)`: `user`, `project`, `project, gitignored`, `cli flag`, `managed` [bundle, `function ex(`]. Built-in, bundled, MCP rows are undecorated. Dynamic workflows get `(dynamic workflow)`.
- Fixture: one plugin `example` is loaded but contributes no entry to either list, and its MCP server shows `plugin:example:broken` with status `failed` [fixture]. So the fixture cannot confirm the `plugin:name` shape. Independent hint: this session's own skill listing uses `plugin:skill` names, as `<plugin>:<skill>` pairs, next to bare names such as `init` and `simplify` (an assumption that it mirrors init for this machine; not checked against an init event).

### 2.4 MCP prompts

- Name: `"mcp__" + Ln(serverName) + "__" + promptName`, `type: "prompt"`, `source: "mcp"`; `userFacingName` is `<server>:<prompt> (MCP)`, or just the prompt name for http/sse servers with a valid URL, with the long forms as aliases [bundle, regex on `name:"mcp__"+`, inside the function that maps `prompts/list` results]. `Ln` is not read here; the doc says characters outside `A-Z a-z 0-9 _ -` in the server name become `_`, and the prompt name is kept as declared [doc: https://code.claude.com/docs/en/mcp, "Use MCP prompts as commands", Tips]. That doc says the typed form is `/mcp__servername__promptname` and the menu shows `/servername:promptname (MCP)`.
- Description: the server's prompt `description`, or an override from the server config (`prompts[name]` of the config object) [bundle, same function]. It is empty when the server gives none.
- Prompts of a server named `anthropic-skills` are dropped [doc: mcp, same section].
- Timing: prompts load after the server connects and refresh only on `list_changed`; the doc says `-p` / SDK sessions refresh only the tool list on those notifications [doc: mcp, "Dynamic tool updates"]. Whether the init event of a per-turn `-p` run already contains prompts of a slow server is [UNVERIFIED]. The fixture has two MCP servers and no `mcp__` names [fixture]; its `kb` server connects, but I did not check whether it declares prompts.
- Plugin-provided MCP servers have names like `plugin:<plugin>:<server>` [fixture: `mcp_servers`], so their prompt names are `mcp__plugin_<plugin>_<server>__<prompt>` after the `_` replacement [doc: mcp, "Plugin MCP tool names" gives this shape for tools; for prompts it is [UNVERIFIED]].

### 2.5 Built-ins and bundled skills

- Built-ins: `source: "builtin"`; the SDK row marks them `builtin: true` [bundle, `wRr`]. Their descriptions exist only in the binary. Example found by `strings`: `init` has "Initialize new CLAUDE.md file(s) and optional skills/hooks with codebase documentation" [bundle]. Built-in descriptions may differ by version; they are not in any file the app can read.
- Bundled skills: `source: "bundled"`, `loadedFrom: "bundled"`; `description` may be a function and then the static field is `""`, with `menuDescription` and `listingDescription` as optional separate fields [bundle, registration code found by searching `loadedFrom:"bundled"`]. The SDK menu row prefers `menuDescription` when set [bundle, `function LTs(`].
- Examples named by the docs: `/doctor`, `/code-review`, `/batch`, `/debug`, `/loop`, `/claude-api`, `/run`, `/verify`, `/simplify`; aliases exist (`/review` for `/code-review`, `checkup` for `/doctor`) [doc: skills, "Bundled skills"].
- Availability depends on flags and settings (`isEnabled`, `requires`, `policyGate` on the bundled definition [bundle]); `disableBundledSkills` or `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS` removes them [bundle, settings schema text]. A static list of names would drift per CLI version and per account.
- Fixture: `code-review` is the one skill and `init` the one built-in [fixture]. This is consistent with the docs; the fixture does not state which class each belongs to.

## 3. Names that cannot be mapped to a file

1. Built-in commands (`init` in the fixture, and the terminal-only ones that the repo already filters out).
2. Bundled skills, including computed descriptions.
3. MCP prompts (remote; description arrives over the protocol).
4. Plugin commands defined inline in `plugin.json` (`content`) and commands a plugin registers at runtime through its mod hook (the SDK row then carries a `plugin` field) [bundle, `Pjo`/`wRr`].
5. Synced claude.ai skills (`anthropic-skills:`-style names, stored under the plugins `synced` dir with sync-owned layout) and host-catalog names [bundle: loader branches `syncedSkills`, `CLAUDE_CODE_HOST_SKILL_CATALOG`].
6. Aliases: typed aliases resolve to a command but are not in `slash_commands`; `aliases` exist only in the SDK rows [bundle, `wRr`, `LTs`; doc: skills, "Resolve skills that share a name"].

## 4. Where a file-reading approach goes wrong

- Precedence and shadowing [doc: skills, "Resolve skills that share a name"]: enterprise over personal over project; a skill beats a `.claude/commands` file of the same name; a user skill replaces a bundled command "but not its aliases"; plugin skills never clash because of the prefix; nested or `--add-dir` skills that clash get a path prefix (v2.1.309+); a synced skill yields to any other. The SDK page adds that a `.claude/commands/code-review.md` shadows the bundled skill and "`slash_commands` lists the name once" [doc: agent-sdk/slash-commands, Create your first skill note]. A reader that scans all roots gets two descriptions for one name unless it implements this order.
- Prefixes depend on what else is loaded. `apps/web:deploy` only exists when `deploy` clashes. A reader cannot compute the init name of a nested or added-dir skill without loading every other root.
- Disabled plugins: enablement is `enabledPlugins` merged across setting sources, plus `defaultEnabled` (default true) when a plugin is not listed [doc: plugins-reference, `defaultEnabled`]. Owner machine, structure only [cmd]: 19 plugin ids in `installed_plugins.json`; `~/.claude/settings.json` lists 14 (13 true, 1 false); 5 installed ids are not listed in the user settings, 3 of them with `scope: project` and a `projectPath`. The installed file is therefore not the enabled list. For `scope: project` entries a reader would also have to match `projectPath` to the session cwd [match rule UNVERIFIED]. Plugin install dirs are version-keyed `installPath` values; the largest disabled plugin on this machine holds 56 SKILL.md files, so counting installed-but-disabled plugins would roughly double the menu.
- `skillOverrides` setting: per-skill `on`, `name-only`, `user-invocable-only`, `off`; `off` hides a skill from both model and `/name`, and `name-only` removes its description from the listing [bundle, settings schema text: "Per-skill listing overrides keyed by skill name"]. A file reader must also read this key from every settings source. Not set in `~/.claude/settings.json` on this machine [cmd]; vault settings files were not opened.
- Setting sources: `--setting-sources user,project,local` limits which sources load [bundle, CLI help text "Comma-separated list of setting sources to load (user, project, local)"]; the SDK default loads user and project [doc: agent-sdk/slash-commands, "How skills work with the Agent SDK"]. The panel passes no such flag today [repo: grep of src-tauri/src/commands/claude/ found no `setting-sources`], so the CLI default applies. If the app one day adds the flag, a file reader has to follow it. Managed policy dirs (`/Library/Application Support/ClaudeCode` on macOS [bundle, function `IS`]) are a source too and may be skipped when the session takes managed settings from its organization [bundle, `Aur` log text].
- `CLAUDE_CONFIG_DIR`: the user root is `CLAUDE_CONFIG_DIR` when set, else `~/.claude` [bundle, helpers `fut()` and `Sf()`; `aYr` uses `process.env.CLAUDE_CONFIG_DIR||...`]. The panel runs `claude` with the env captured from the login interactive shell [repo: .scratch/claude-code-integration/spec.md:50], so the variable can come from the shell rc and not from the app process. A file reader inside the app must read it from that same captured env. Not set in my shell [cmd].
- Project roots are not just `<vault>/.claude`: the CLI walks from cwd up to the repo root or home, so a vault inside a git repo or under a parent that has `.claude/commands` also contributes [bundle, `qpe`]. For the owner's vault the dir has `skills` (4), `settings.json`, `settings.local.json` and a `plugins` dir [cmd: `ls`]; the `plugins` dir content was not examined.
- Parsing: YAML frontmatter with block scalars (1 case on this machine), invalid YAML is "ignored" by the CLI with a logged error and the skill still loads with defaults [bundle, `cko`], files over a size cap are skipped, and `SKILL.md` over `commands/` folders follows different naming (`pus` vs `mus`).
- Description decoration: the menu text the CLI would show includes a source label (`(user)`, `(project)`, `(<plugin>)`); a raw frontmatter description lacks it [bundle, `Son`]. Whether the panel wants the label is a product choice.
- Init versus rows: init uses `name` and filters only on `userInvocable`; SDK rows use `userFacingName`, skip `isHidden`, and skip any command that another command shadows [bundle, `PMt` vs `LTs`]. Names in init can be missing from the rows and the reverse, so a join on name needs fallbacks.
- Timing: a mid-session change (skills discovered in a subdirectory, plugin reload) is pushed as a full replacement list in streaming mode [bundle, push text "Clients should REPLACE their cached command list"]. A turn spawned per `claude -p` call sees a fresh init each time, so the per-turn init is always current; a file cache keyed to app start is not.

## 5. Option that avoids the mapping

The CLI already builds rows with `name`, `description`, `argumentHint`, `aliases`, `builtin`, and `plugin` from the same objects that feed init [bundle: schema text "Information about an available skill (invoked via /command syntax)", rows built by `wRr`/`LTs`]. The SDK exposes them as `supportedCommands()` [bundle: `supportedCommands:()=>Promise.resolve(...commands)`; doc: https://code.claude.com/docs/en/agent-sdk/slash-commands is silent on descriptions, so the row shape is bundle-only]. Whether the same rows can be requested from the per-turn `claude -p --output-format stream-json` process the panel spawns (a control request needs `--input-format stream-json`) is outside this file and [UNVERIFIED here]; see 03 and 04 in this folder.

## Open questions

1. Does the init event of a `-p` run include prompts of an MCP server that is still connecting? The doc says `-p` refreshes only tools on `list_changed`.
2. Exact `hZe` fallback: first non-empty line, with or without heading markers and length cap?
3. Exact `Ln` normalization for MCP server names beyond the doc's character rule, and whether `plugin:` prefixed server names keep a colon in `mcp__` names.
4. Which of two same-named commands wins in `Zi(...,"name")` de-duplication when sources differ, as opposed to what the docs list. The docs give the precedence; the bundle order was not traced.
5. How `scope: project` plugin entries are matched to the session (`projectPath` equal to cwd, or any ancestor).
6. Does `skills` in init exclude command files by a type check or by `loadedFrom`? Fixture shows only the outcome.
7. Do `menuDescription` and the 1,536-character cap apply to the text a menu shows?

## Claims to verify

1. Init `slash_commands` is `commands.filter(userInvocable !== false).map(name)` and `skills` is the same filter plus `!rowFromHost`, both by `name`, not by display name (bundle function `PMt`).
2. Skill directory name is the init name; frontmatter `name` becomes the display name and an alias (bundle `cko`/`yBn`; doc "How a skill gets its command name").
3. Nested command files are named `dir:sub:stem` with `:` for every `/` (doc table; bundle `V5n`/`mus`).
4. MCP prompt command name is `mcp__<normalized server>__<prompt>` and its description is the server's prompt description (bundle, `prompts/list` mapper).
5. Plugin skills are `<plugin>:<dir-sanitized-name>`; plugin command and skill discovery honors manifest `commands`/`skills` keys (doc "commands", "Path-only fields").
6. Built-in and bundled descriptions exist only in the binary and bundled ones can be computed (bundle registration code).
7. On this machine `installed_plugins.json` lists 19 ids and settings `enabledPlugins` 14 (13 true), so installed is not enabled (command output counts).
8. The CLI adds source labels to descriptions (`(user)`, `(project)`, `(<plugin>)`) in `Son` and `ex`.
9. `CLAUDE_CONFIG_DIR` overrides `~/.claude` for the user commands and skills root (bundle `fut`/`Sf`).
