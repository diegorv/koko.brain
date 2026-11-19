# 04: Asking the CLI itself for slash command descriptions (control protocol)

Question: can the panel get name + description + argument hint for every slash command and skill from the `claude` CLI, instead of reading SKILL.md files?

Short answer: yes. The CLI answers an `initialize` control request with a `commands` array of `{name, description, argumentHint, aliases?, builtin?, plugin?}`. It works before any user message, makes no model call, and answered in about 1.4 s in one probe (SessionStart hooks run during startup). Two caveats below: terminal-only commands are not flagged in that reply, and descriptions can be very long.

All numbers below are from one probe on 2026-11-15 against claude 2.1.325, run in an empty temp dir (not the vault). No message text, skill bodies or user skill descriptions are reproduced here.

## 1. Where the shapes come from

| Source | How read | What it gave |
|---|---|---|
| npm `@anthropic-ai/claude-agent-sdk` 0.3.321 (`package.json` `claudeCodeVersion` = 2.1.321) | `npm pack` into a temp dir, `tar xzf`, read `sdk.d.ts`. 0.3.325 (latest, modified 2026-11-13) was refused by the local npm `min-release-age=5`, so I took 0.3.321 | Type definitions and the SDK's own `initialize` sender |
| CLI 2.1.325 bundle | `strings -n 20 ~/.local/share/claude/versions/2.1.325 > <tmp>/cli-strings.txt`, then `grep`/`sed` on that file | The `initialize` handler and the mapper that builds `commands` |
| Docs https://code.claude.com/docs/en/agent-sdk/typescript | WebFetch (page truncated at 100k of 335k chars) | `supportedCommands(): Promise<SlashCommand[]>`; `SDKControlInitializeResponse.commands: SlashCommand[]`; the method is not marked "streaming input only" |

Note: a plain `grep -a -o '.\{300\}...'` straight on the 347 MB binary did not finish in 120 s. Extract with `strings` first (2 s), then grep the text.

### Envelope (SDK `sdk.d.ts`)

- Request, `SDKControlRequest` (`sdk.d.ts:5300`): `{type: "control_request", request_id: string, request: {subtype: "initialize", ...}}`. `request_id` is chosen by the sender and echoed back.
- `SDKControlInitializeRequest` (`sdk.d.ts:4723`): every field besides `subtype` is optional (hooks, sdkMcpServers, systemPrompt, appendSystemPrompt, agents, title, skills, ...). The SDK's own sender fills them from options (`core.mjs`, string `subtype:"initialize",hooks:this.initHooksPayload,...`). A bare `{subtype: "initialize"}` is enough; the probe used exactly that.
- Reply, `SDKControlResponse` (`sdk.d.ts:5351`): `{type: "control_response", response: ControlResponse | ControlErrorResponse}`. Success is `{subtype: "success", request_id, response: {...}, pending_permission_requests, pending_user_dialog_requests?, pending_elicitation_requests?}` (`sdk.d.ts:435`). Error is `{subtype: "error", request_id, error: string}` (`sdk.d.ts:406`).
- Success payload, `SDKControlInitializeResponse` (`sdk.d.ts:4818`): `commands`, `agents`, `output_style`, `available_output_styles`, `models`, `account`, `claude_code_version?`, and more.
- `SlashCommand` type (`sdk.d.ts:9923`): `name: string` (no leading slash), `description: string`, `argumentHint: string`, `aliases?: string[]`, `builtin?: boolean` ("Claude Code's own; absent for a command defined by a user, project, plugin or MCP server").
- `SDK.supportedCommands()` (`sdk.d.ts:3127`) just awaits the initialize result and returns `commands`, or the latest `commands_changed` push (`core.mjs`: `async supportedCommands(){let{commands:s}=await this.initialization;return this.latestCommands??s}`).
- `reinitialize()` (`sdk.d.ts` near 3115) "always sends a fresh request rather than returning the cached result". A second `initialize` on a live process is therefore an accepted pattern.
- `SDKCommandsChangedMessage` (`sdk.d.ts:3881`): `{type: "system", subtype: "commands_changed", commands: SlashCommand[], uuid, session_id}`, a fire-and-forget push when skills are discovered mid-session. Not needed by a one-shot probe.

### CLI handler (bundle, 2.1.325)

- The stdin loop in print mode has a branch `else if(q.request.subtype==="initialize"){...}` (bundle text line 254463 of my `strings` dump; the line number is dump-specific, search for the quoted code). It validates optional fields and answers with `control_response` `{subtype:"success", request_id, response: {...}, pending_permission_requests, ...}`.
- The response object is built by a function that sets `commands: Ele(e())`, `agents`, `output_style`, `available_output_styles`, `models`, `account: {email, organization, ...}`, `pid`, `claude_code_version`. Real replies in this CLI carried `account` with only `tokenSource` and `apiProvider` (no email), so the panel need not handle personal fields, but should never log the object whole.
- `Ele(e)` maps each command through `wRr`: `{name, description: Son(e), argumentHint: e.argumentHint || "", aliases?, builtin: true if source is builtin, plugin: registeredBy if set}`. The set is `QNt(e)` = commands filtered by `Fkr`: drops `userInvocable === false`, host rows and hidden ones. `Son` appends suffixes to descriptions: `" (dynamic workflow)"` for workflow kind, and for plugin commands a `(<plugin label>)` prefix or `(plugin)` suffix. So some descriptions already carry a source tag.
- `system/init` builds `slash_commands` with `commands.filter(t => t.userInvocable !== false).map(t => t.name)` and `terminal_slash_commands` from `t.terminalOriented === true` (same bundle region). The `initialize` mapper has no `terminalOriented` field (see section 3).
- `--input-format stream-json` is documented by `claude --help` ("only works with --print"). `--await-initialize` exists in the SDK spawn args (`core.mjs`) and only matters for loading `plugins` from the initialize request; not needed here.

## 2. The probe

Safety review before running: the CLI runs the user's own SessionStart hooks and loads plugins and MCP config at startup, exactly as any `claude -p` run does. No user message is sent, so no model call. cwd is a fresh `mktemp -d`, never the vault. Run with `CLAUDECODE` removed from the env (nested-session guard, `turn.rs:125`).

Command shape (script kept outside the temp dir, `python3 -I`):

```
cwd=<mktemp -d>  claude -p --input-format stream-json --output-format stream-json --verbose
stdin: {"type":"control_request","request_id":"probe-1","request":{"subtype":"initialize"}}\n
then wait for the control_response line, then close stdin (timeout 60 s)
```

Result:

| Measure | Value |
|---|---|
| Works before any message | Yes. Reply arrived with stdin otherwise empty |
| Time to `control_response` | 1.37 s after the write (process start to reply, includes spawn) |
| Time to process exit after stdin close | 2.51 s total, exit code 0 |
| Lines on stdout | 13: 6 `system/hook_started`, 6 `system/hook_response`, 1 `control_response` |
| Hook events seen | `SessionStart` only (12 lines); hooks were still finishing when the reply came |
| `system/init` emitted | No. No `init` line without a user message |
| stderr | 189 bytes, 1 line (plain text warning) |
| Reply line size | about 46 KB (one JSON line) |
| Session file | None created. `~/.claude/projects` had no entry matching the temp dir name (checked with the temp dir's encoded basename) |

Reply structure (key names and types only):

- Envelope keys: `type`, `response`. `response` keys: `subtype` ("success"), `request_id` (echoed "probe-1"), `response` (object), `pending_permission_requests`, `pending_user_dialog_requests`.
- Inner `response` keys: `commands` (list), `agents` (list), `output_style` (str), `available_output_styles` (list), `user_output_styles_dir` (str), `models` (list, 5), `pid` (int), `claude_code_version` (str), `current_permission_mode` (str), `session_state` (str), `capabilities` (list of str), `fast_mode_state`, `feedback_mode` (dict), `account` (dict with `tokenSource`, `apiProvider`), plus several boolean flags (`hook_on_failure_supported`, `analytics_disabled`, `remote_control_*`, ...).

Counts for `commands` (owner's real `~` setup, empty cwd):

| Measure | Count |
|---|---|
| Commands | 126 (equals the 126 `slash_commands` the spec recorded in `system/init` for this setup, `spec.md` "Verified CLI behavior") |
| With non-empty `description` | 126 of 126 |
| With non-empty `argumentHint` | 38 |
| With `aliases` | 30 |
| With `builtin: true` | 51 (this includes Claude Code's bundled skills such as `dataviz`-style skills shipped with the CLI, not only slash commands) |
| Not builtin | 75 (user/plugin/project skills and commands) |
| With `plugin` key | 1 |
| Names containing `:` (plugin-namespaced) | 30 |
| Duplicate names | 0 |
| Description length | min 18, max 1436, mean about 213 characters |
| Agents | 7 (keys `name`, `description`, sometimes `model`) |

Key sets seen on a command: `{name, description, argumentHint}` (51), `+builtin` (44), `+aliases` (23), `+aliases +builtin` (7), `+plugin` (1). `description` and `argumentHint` were always present as strings (empty string for no hint), never missing.

Built-in examples (quoted, safe):

- `{"name":"debug","description":"Enable debug logging for this session and help diagnose issues","argumentHint":"[issue description]","builtin":true}`
- `{"name":"design","description":"Grant or revoke Claude agent access to your Design projects","argumentHint":"consent | revoke","builtin":true}`
- argument hints seen on built-ins: `/simplify` `[<target>]`, `/batch` `<instruction>`, `/doctor` `[prompt-audit [<path>]]`.

Cleanup: the temp dir was removed; no `~/.claude/projects` entry existed for it, so nothing there was removed. The SDK tarball, extracted package, `strings` dump and probe output (all under a second temp folder) were deleted at the end.

## 3. Findings that affect the design

1. **Names agree with `system/init`, but terminal-only ones are included.** `doctor`, `color`, `focus`, `reload-plugins` (the `terminal_slash_commands` from the real capture, `.scratch/claude-code-integration/research/stream-json-capture/turn.ndjson`, `system/init`) are all present in the `initialize` `commands` and carry no flag. The panel today drops them with the init list: `stream.rs:141-151` (`init_event` filters `slash_commands` by `terminal_slash_commands`). So a descriptions map built from `initialize` must be joined onto the names from `system/init` (name -> description), or the panel needs its own hard-coded terminal-only list. Only the join is verified; a hard-coded list is fragile because the set comes from a `terminalOriented` bundle field that `initialize` does not export.
2. **Join key is `name`.** Plugin skills are named `plugin:skill` in both lists (30 such names in `commands`). `aliases` (for example a short name that resolves to a command) are extra input names; the panel's current list does not use them (`claude.logic.ts:206` `filterSlashCommands(query, commands: string[])` is a plain prefix/substring filter on names).
3. **Dependence on cwd (UNVERIFIED for vault-local commands).** The probe ran in an empty dir, so `<vault>/.claude/commands` and `<vault>/.claude/skills` were not exercised. The spec records that a vault-local command appeared in `slash_commands` when the turn ran in that dir (`spec.md`, "A slash command works in print mode"); `initialize` uses the same command registry in the same process, so the probe must run with cwd = the vault to include them. I did not run a second probe to confirm, per the one-probe limit.
4. **Descriptions can be long.** Up to 1436 characters, mean about 213. The menu needs a one-line truncation (CSS clamp or a character cap) and a full-text tooltip or none. Many skill descriptions contain trigger lists, not summaries.
5. **Descriptions are user content.** User and project skill descriptions come from the owner's own SKILL.md frontmatter and can contain private text. Keep them in memory only; do not write them to logs (`debug()` is off by default but writes to the session log file when enabled) or to committed fixtures. A test fixture must use made-up entries or built-in ones.
6. **Before-first-message autocomplete.** The panel menu currently says "Slash commands load after the first message." (`ClaudePanel.svelte:337`, from `claudeStore.slashCommands.length === 0`) because names only arrive with `system/init` of the first turn (`claude.logic.ts:124`). A probe at panel open (or when the setting is enabled and the vault is known) would fill the menu, with descriptions, before any message. That is a side benefit; whether to keep `system/init` as the source of truth after a turn is a design choice for the Issue.
7. **Current spawn cannot do this in place.** Turns run with `Stdio::null()` stdin and the prompt as an argument after `--` (`turn.rs:88-126`, `build_args`, `.stdin(Stdio::null())`). The control protocol needs `--input-format stream-json` and an open stdin, which is a different process shape from a turn. The probe would be a second, short-lived spawn, run like a turn (same binary lookup, login-shell env from Issue 05, cwd = vault, `CLAUDECODE` removed).
8. **Cost per probe.** 1.4 s to reply, 2.5 s to exit, with the owner's hooks and plugin startup included; no model tokens. Hooks with side effects (any SessionStart hook that records or notifies) run on every probe. Cache the result per vault and per CLI version and refresh on demand (panel open, "reload" action), not on every keystroke.
9. **Mid-session changes.** A one-shot probe is a snapshot. New skills the owner adds while the app is open show only after the next probe. `commands_changed` pushes and `reload_skills` / `reload_plugins` requests exist (`sdk.d.ts:5269`, `5276`) but need a long-lived process, which the one-process-per-turn design (ADR 0038, `spec.md` "Shape") does not have.

## 4. Options, as a comparison of mechanisms

| Option | Source of descriptions | Pros | Cons |
|---|---|---|---|
| A. One-shot `initialize` probe | CLI itself | Same registry the CLI will run: user, project, plugin, MCP, built-in, bundled skills; always matches the installed version; no filesystem parsing; works before any message | Extra 2.5 s process with hooks; needs terminal-only filter via the join; a new Rust command and a DTO; stdin protocol code |
| B. Read SKILL.md / command .md frontmatter | Files under `~/.claude`, plugin dirs, vault `.claude` | No process | Must reimplement discovery (plugins, namespaces, built-ins have no files); drifts from the CLI. This is what t3code does (`ClaudeSkills.ts`, per `spec.md` "Later") |
| C. Both: A for descriptions, `system/init` for the authoritative name list | CLI | Smallest regression risk for the existing filter | Two sources to keep in sync |

The research supports A or C. The choice is for the Issue.

## 5. Not verified

- Behavior with cwd = the vault (vault-local commands, vault-local plugins/settings).
- Whether `initialize` blocks on a slow or failing SessionStart hook or MCP server (the probe's hooks finished in under 1.5 s; the reply came before the last hook response).
- Behavior when the SDK/CLI version differs from 2.1.325 (the SDK types were read from 0.3.321; the CLI handler from 2.1.325; the observed reply matched the 0.3.321 `SlashCommand` type exactly, plus an extra `plugin` field that the 0.3.321 type does not list).
- Whether stdin EOF alone (without waiting for the reply) is safe; the probe waited for the reply first, then closed stdin.
- The `SlashCommand` section of the web docs (page truncated before it); the type was read from `sdk.d.ts` instead.
- Latest SDK 0.3.325 types (blocked by npm cooldown).
- Windows/Linux behavior (macOS only).

## Open questions

1. Should the panel run the probe with cwd = the vault only, or also read a user-level list once per app start? (Vault cwd is needed for vault-local commands; the user-level list does not change per vault.)
2. Is a 2.5 s hook-running process acceptable on every panel open, or should the probe be cached per (vault, CLI version) and refreshed manually? Owner SessionStart hooks have side effects.
3. How to hide terminal-only commands for names that have no `system/init` yet (before the first turn): hard-coded list of the four known names, or show them?
4. Should `aliases` be searchable in the menu (typing an alias finds its command)?
5. Does the owner want `builtin` marked in the UI (51 of 126 are Claude Code's own, including bundled skills)?
6. Description display: one-line clamp with tooltip, or two lines? Descriptions reach 1436 characters.

## Claims to verify

1. A bare `{"type":"control_request","request_id":"x","request":{"subtype":"initialize"}}` written to `claude -p --input-format stream-json --output-format stream-json --verbose` gets a `control_response` with `response.response.commands`, with no user message and no model call.
2. Each `commands` entry always has string `name`, `description` and `argumentHint` (empty string for none); optional `aliases`, `builtin`, `plugin`.
3. In the probe: 126 commands, 126 with a description, 38 with an argument hint, 51 builtin, max description length 1436; reply in about 1.4 s.
4. `initialize` `commands` include the terminal-only names `doctor`, `color`, `focus`, `reload-plugins` with no flag identifying them.
5. The probe created no `~/.claude/projects` entry for its cwd and emitted no `system/init`.
6. The `initialize` `commands` list uses the same user-invocable filter as `system/init` `slash_commands` (bundle: `Fkr` drops `userInvocable === false`), explaining the equal count of 126.
7. `reinitialize()` / a second `initialize` is accepted by a live CLI (SDK doc comment only; not exercised).
8. The SDK package 0.3.321 `claudeCodeVersion` is 2.1.321, so the types may differ slightly from 2.1.325 (the extra `plugin` key was seen in the live reply).
