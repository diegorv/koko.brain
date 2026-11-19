# CLI bundle: how Claude Code builds slash command descriptions

Scope: Claude Code 2.1.325 (`claude --version` printed `2.1.325 (Claude Code)`), one Mach-O arm64 binary at `~/.local/share/claude/versions/2.1.325`. The JS bundle is embedded as plain text and was read with `grep -a -b -o <literal>` (byte offsets) plus `dd` windows. Offsets below are byte offsets in that binary (first copy of the code; the file holds the JS more than once, so `grep -a -b -o` lists several hits). Minified identifiers collide across modules (`Qle`, `Ad`, `A` exist more than once), so every identifier is tied to an offset. Names, offsets and fragments are for this version only and will move on upgrade.

Privacy: no skill body, description, name or note text from `~` or the vault appears here. Counts and key names only. Quoted descriptions are Claude Code built-ins or bundle strings.

## Summary

1. The terminal typeahead row is built by `bme` (offset 320083234+). Row text = `/name` + description, where description = `Son(cmd, X_t(cmd))` plus `" (arguments: a, b)"` when the skill declares `arguments`.
2. A skill or command description comes from frontmatter `description`. If it is missing or empty, the CLI uses the first non-empty body line (leading `#` heading marker stripped, cut to 100 chars). `when_to_use` is NOT in the typeahead; it is appended only in the model-facing skill listing.
3. `argument-hint` is not in the list row. It is ghost text shown after `/name ` once the name is typed and a space follows.
4. Source label is appended by `Son`: `(user)`, `(project)`, `(project, gitignored)`, `(managed)`, `(cli flag)`; plugin items get a `(<plugin name>) ` prefix instead.
5. Hidden: `user-invocable: false` sets `isHidden`, drops the entry from `slash_commands` in `system/init`, and drops it from the SDK `commands` list. Skills switched off via the `skillOverrides` setting are dropped too.
6. Non-interactive exposure that carries descriptions: yes, exactly one route. A `control_request` with `subtype: "initialize"` on stdin (`--input-format stream-json`) returns `commands: [{name, description, argumentHint, aliases?, builtin?, plugin?}]`. `system/init` has names only. I ran it: 126 commands in a neutral cwd, 130 in the vault cwd, 2 seconds, no model call.

## 1. Where the typeahead row is built

`function bme(h,P,D,H,ee,xe)` at offset 320083234 (found via `grep -a -b -o 'X_t(' <bin>` then a `dd` window before 320083234):

```js
nt=D?P.menuDescription??P.description:Ve?P.description:Son(P,X_t(P)),
...
yt=XNi(De)+nt+(P.type==="prompt"&&P.argNames?.length?` (arguments: ${P.argNames.join(", ")})`:"");
return{id:i5(P),displayText:`/${De}${$e}`,tag:Ve?"dynamic workflow":void 0,description:yt,metadata:P,...}
```

- `D` is the "menu kind lanes" experiment flag (`CLAUDE_CODE_ENABLE_MENU_KIND_LANES` / `tengu_mint_lanes`). Default path is `Son(P, X_t(P))`.
- `XNi` returns `""` unless the command is `ultrareview` (promo text). Ignore.
- `X_t` (offset 291125115) is the "human facing description":

```js
function X_t(e){if(e.type!=="prompt"||!bon(e))return e.description;return e.menuDescription||e.description}
```

  Built-in prompt commands may carry a shorter `menuDescription`; skills and user commands do not.
- `Son` (offset 291125222) adds the source label:

```js
function Son(e,n=e.description){if(e.type!=="prompt")return n;if(e.kind==="workflow")return`${n} (dynamic workflow)`;
if(e.source==="plugin"){if(pZ(e.pluginInfo?.repository))return`${n} (${F3})`;let r=e.pluginInfo?.pluginManifest;if(r)return`(${b_(r)}) ${n}`;return`${n} (plugin)`}
if(e.source==="builtin"||e.source==="mcp"||e.source==="memoryStore"||e.source==="bundled")return n;
if(e.loadedFrom==="syncedSkills")return`${n} (${F3})`;return`${n} (${ex(e.source)})`}
```

- `ex` (offset 278738723) maps the source: `userSettings`->`user`, `projectSettings`->`project`, `localSettings`->`project, gitignored`, `flagSettings`->`cli flag`, `policySettings`->`managed`.
- The typeahead function `OW` (found by locating `function OW(h,P,D){if(!sM(P))`) with an empty query `/` filters `!oo.isHidden&&!EA(oo)`, then orders: up to 5 usage-scored prompt commands, then local commands, then user/local skills, project skills, managed, others, each group sorted by name. With a query it uses a fuzzy search (`AJt(...).search(ee, {filter:(yt)=>!EA(yt.command)})`). A hidden command is found only on an exact name match.
- No truncation in this code; the Ink row clips to terminal width. UNVERIFIED how newlines inside a multi-line YAML `description` render in the row (a sanitizer exists, `A`/`j` at offset 283250475, which maps control characters to spaces, not read in detail).

## 2. How frontmatter is read

### Key list
Known frontmatter keys (array `Gu`, offset 284640724): `name, description, model, allowed-tools, argument-hint, arguments, disable-model-invocation, user-invocable, effort, shell, version, when_to_use, paths, hooks, context, agent, ...`. Schema text (offset 289691030):

```js
"argument-hint":B_().optional().describe("Placeholder text shown after the slash command name."),
"disable-model-invocation":UL().optional().describe("If true, the model cannot invoke this via the Skill tool; only users can type the slash command."),
"user-invocable":UL().optional().describe("If false, hides the slash command from users; only the model can invoke it via the Skill tool."),
```

### Parser
`function Ad(e,n,r)` (frontmatter parser; the one with `normalizeKeys`, offset 289704599 region):
- Frontmatter regex `Yx=/^---\s*\n([\s\S]*?)---\s*\n?/`. No `---` block means `frontmatter: {}` and the whole file is the body.
- YAML via `Bun.YAML.parse` (`M4`). On a parse failure it retries once after `Yu`, which auto-quotes `key: value` lines whose value holds `{}[]*&#!|>%@\`` or `: ` (regex `Hu=/[{}[\]*&#!|>%@\`]|: /`). If both fail it logs `Failed to parse YAML frontmatter` and the frontmatter is `{}`, so the description falls back to the body line, and the broken frontmatter block is already cut off the body.

### Description (`fge` + `hZe`)
`fge` (offset 284646993) coerces the value:

```js
function fge(e,n){if(e==null)return null;if(typeof e==="string")return e.trim()||null;if(typeof e==="number"||typeof e==="boolean")return String(e);return t(`Description invalid for ${n??"unknown"} - omitting`,{level:"warn"}),null}
```

So an empty or whitespace-only string, `null`, and objects/arrays (YAML lists) all count as "no description".

`hZe` (offset 289698678) is the fallback, applied to the body (frontmatter already removed):

```js
function hZe(e,n="Custom item"){let r=e.split(`\n`);for(let s of r){let h=s.trim();if(h){let E=h.match(/^#+\s+(\S.*)$/)?.[1]??h;return E.length>100?E.substring(0,97)+"...":E}}return n}
```

- First non-empty body line; a leading `#`-heading marker is stripped; longer than 100 chars is cut to 97 + `...`; an empty body yields the label.
- Labels by call site (found with `grep -a -o 'hZe([^)]*)'` and the `SHe(` call sites): skills in `.claude/skills` `"Skill"`; `.claude/commands/*.md` `"Custom command"` (call `SHe(ne,Ce,Ne,"Custom command")` in `hus`); plugin skill `"Plugin skill"`; plugin command `"Plugin command"`.
- The skill path is `SHe(e,n,r,s="Skill")` (offset 292295037 region): `let h=fge(e.description,r),y=h??hZe(n,s)` and it returns `hasUserSpecifiedDescription:h!==null`.
- A description set in frontmatter is NOT truncated by this code. In the SDK list below, one description was 1436 characters and was returned whole.
- The official doc agrees on the fallback: "If omitted, uses the first non-empty line of the markdown content." (https://code.claude.com/docs/en/skills, Frontmatter fields). The doc does not mention the 100-char cut or the heading strip; the bundle does.

### when_to_use
Read as `e.when_to_use!=null?String(e.when_to_use):void 0` (in `SHe`). Not used in `bme`. Used only here (offset 291399316):

```js
function w1t(e){let n=e.listingDescription??e.description;return e.whenToUse?`${n} - ${e.whenToUse}`:n}
```

That string is the model-facing skill listing; `skillListingMaxDescChars` defaults to 1536 (`w7r=1536`, same offset). Doc: "the combined `description` and `when_to_use` text is truncated at 1,536 characters in the skill listing". This is for the model, not the `/` menu. Also in `dIn` (offset 291139657) skills without a user-written description and without `when_to_use` are left out of the model's slash-command skill list, but they still appear in the typeahead (with the body-line fallback).

### argument-hint and arguments
- `argumentHint: e["argument-hint"]!=null ? String(e["argument-hint"]) : void 0` (in `SHe`).
- `argNames` come from `ARe(e.arguments)`; `bme` appends `(arguments: a, b)` to the row description when there are any.
- Ghost text: in the typeahead state code (offset 320154842) `if(Il?.argumentHint&&ja)hi=Il.argumentHint` where `ja` means the input is `/name ` with a trailing space and nothing after. Otherwise, with `argNames`, it shows the next unfilled argument name. So the hint is a second UI element, not part of the row description.
- Doc: `argument-hint` is "Hint shown during autocomplete to indicate expected arguments."

## 3. Naming of skills, commands and plugin items

| Source | Name rule | Evidence |
|---|---|---|
| `<dir>/.claude/skills/<d>/SKILL.md` (user or project) | skill name = directory name; frontmatter `name` becomes `displayName`, used as `userFacingName` (`Pn=!ro?_o:...`, `_o=n||e`) | `yBn` (offset 292300429) |
| `.claude/commands/**/*.md` | relative path with `/` turned into `:`, `.md` dropped (`mus`/`pus`); `displayName:void 0` so frontmatter `name` is ignored for these | `hus` (offset ~292312251), `mus` |
| Plugin `commands/*.md`, `skills/*/SKILL.md` | `<plugin>:<subdirs joined by ':'>:<filename without .md, or the SKILL.md directory name>` | `function $1r(e,n,r)` |
| Plugin item with frontmatter `name` | prefixed with the same `<plugin>:` unless it already starts with it | `Ht=e.slice(0,e.lastIndexOf(":")+1), rn=ln?ln.startsWith(Ht)?ln:...` in `a9` |
| Plugin manifest metadata | can override `description`, `argumentHint`, `model`, `allowedTools` | `function Ddt(e,n)` |

`$1r` source:

```js
function $1r(e,n,r){if(Ldt(e)){let h=JO(e),y=JO(h),E=zB(h),v=y.startsWith(n)?...:"",H=v?v.split(/[/\\]/).join(":"):"";return H?`${r}:${H}:${E}`:`${r}:${E}`}else{...return v?`${r}:${v}:${y}`:`${r}:${y}`}}
```

`Ldt(e)` is `/^skill\.md$/i.test(basename)`. The 30 names with a `:` in the 126-command run are consistent with this (counted, names not read).

The plugin path also reads the description with the same `fge` and falls back to `hZe(Y, E?"Plugin skill":"Plugin command")`. Plugin items then show `(<plugin name>) description` (prefix) in the row, not a suffix. In my run 31 of 126 descriptions start with `(<name>) `.

The `$.command.register` plugin-API (bundle string, offset ~134.7M region) is a third way to add a command: `takes { name, description, argumentHint?, immediate? }` and `needs a description (what the menu shows)`. In my runs exactly 1 command carried the `plugin` key (`registeredBy`).

## 4. What is hidden

- Skills and user commands: `isHidden:!userInvocable` in the object built by `yBn` (offset 292302305: `isHidden:!Fe`, `userInvocable:Fe`) and `isHidden:!vo` for plugin items (offset 290730769). `userInvocable` defaults to true; `user-invocable: false` (also "false" strings, via `k4n`) hides.
- `function Fkr(e)` (the filter behind the SDK list and `slash_commands`):

```js
function Fkr(e){if(e.userInvocable===!1||e.rowFromHost||EA(e))return!1;if(!Q7e())return!0;try{return e.isHidden!==!0}catch(n){return a(n),!0}}
```

- `EA(e)` = `dFe(e)==="off"`: a skill turned off through the `skillOverrides` setting, or a prompt `hiddenBehindPlugin`. These are excluded from the typeahead and from the SDK list.
- Built-in commands set `isHidden` themselves, often as a getter tied to a feature gate (`get isHidden(){return!LRn()}` on `autofix-pr`; `isHidden:!1` on `autocompact`). Example built-in table entries, quoted: `name:"debug"` is described as "Enable debug logging for this session and help diagnose issues" with `argumentHint "[issue description]"`; `name:"btw"` "Ask a quick side question without interrupting the main conversation" with `"[question]"`; `name:"cd"` "Move this session to a new working directory" with `"<path>"`.
- `disable-model-invocation: true` does NOT hide a skill from the typeahead; it only removes it from the model. Doc: "Set to `true` to prevent Claude from automatically loading this skill. Use for workflows you want to trigger manually with `/name`."
- Terminal-only commands (`terminalOriented`): `system/init` lists them in `terminal_slash_commands` (`d=e.commands.filter(t=>t.userInvocable!==!1&&t.terminalOriented===!0)`), already used by the panel.

## 5. Non-interactive output that exposes descriptions

### 5a. `system/init` (what the panel reads today): names only
`PMt` (offset 298555032) builds it:

```js
slash_commands:e.commands.filter((t)=>t.userInvocable!==!1).map((t)=>t.name),
skills:Zi(e.skills,"name").filter((t)=>t.userInvocable!==!1&&!t.rowFromHost).map((t)=>t.name),
agents:e.agents.map((t)=>t.agentType), plugins:e.plugins.map(Ooo)
```

Confirmed on the repo capture `.scratch/claude-code-integration/research/stream-json-capture/turn.ndjson` with jq: `slash_commands` is an array of strings (3 entries in that capture), `skills` array of strings (1), `agents` array of strings (3), `plugins` array of objects with keys `name, path, source`. No descriptions. Note the capture is a small run; the spec's 126 slash commands came from the owner's setup (`.scratch/claude-code-integration/spec.md:21`).

### 5b. `control_request` `initialize` (SDK control protocol): full list with descriptions
Handler: `else if(q.request.subtype==="initialize"){...` (offset 310710593), response builder `async function yv(...)` (offset 310827980):

```js
let ... Ye={commands:Ele(e()),agents:n.map((Ee)=>({name:Ee.agentType,description:Ee.whenToUse,model:Ee.model})),output_style:se,...models:r,...account:{...}
```

`Ele` and `wRr` (offset 291125686):

```js
function Ele(e){let n=E$n();return QNt(e).map((r)=>wRr(r,n))}
function wRr(e,n){let r=Us(e),s=bon(e),h=...;return{name:r,description:Son(e),argumentHint:e.argumentHint||"",aliases:E?.length?E:void 0,...s&&{builtin:!0},...e.registeredBy!==void 0&&{plugin:e.registeredBy}}}
```

So the list uses the same `Son` source label as the typeahead, uses `e.description` (NOT `menuDescription`), does not include `when_to_use`, and is filtered by `Fkr` (hidden and off entries are absent). The SDK host object exposes it as `supportedCommands:()=>Promise.resolve(...?_e.commands)` (offset 299098370). `reload_plugins` returns the same list after a reload (`commands:Ele(uo())`, offset 310759822).

Empirical run (command shape, nothing else printed):

```
printf '%s\n' '{"type":"control_request","request_id":"r1","request":{"subtype":"initialize"}}' \
 | claude -p --input-format stream-json --output-format stream-json --verbose --no-session-persistence
```

- Exit 0 in about 2 s, 14 lines in a neutral cwd (`/tmp/...`), no `assistant`/`result` message, so no model call. A line with `type: "control_response"`, `response.subtype: "success"` carries `response.response` with keys `account, agents, available_output_styles, capabilities, claude_code_version, commands, current_permission_mode, models, output_style, pid, session_state, ...`.
- Neutral cwd: `commands` length 126, key sets all within `{name, description, argumentHint, aliases?, builtin?, plugin?}`; 51 with `builtin: true` (this flag covers built-ins and bundled skills such as `update-config`); 0 empty descriptions; 38 non-empty `argumentHint`; 30 with `aliases`; 30 names containing `:`; description length max 1436; 73 longer than 100 chars; 44 end in `(user)`; 31 start with `(<plugin>) `.
- Vault cwd (`<vault>`): 130 commands; 4 end in `(project)`, 44 in `(user)`; 0 empty descriptions; 38 hints. So project skills/commands under the vault's `.claude/` show up only when cwd is the vault, as expected for the panel.
- Side effects seen: the owner's SessionStart-type hooks ran (`system` messages `hook_started`/`hook_response`, 6 of each in the neutral cwd) even without `--include-hook-events`; stderr printed a connectors notice. The same command in a per-turn `-p "prompt"` run is not needed: the descriptions can come from a separate short helper process (initialize, then close stdin).
- Wire format for the request was inferred from the handler (`q.request.subtype`, `request_id`) and confirmed by the run. The exact public schema is UNVERIFIED beyond that; no SDK docs were fetched.

### 5c. Other routes checked
- `claude --help` subcommands (2.1.325): `agents, attach, auth, auto-mode, doctor, gateway, import, install, logs, mcp, plugin|plugins, purge, respawn, rm, setup-token, stop|kill, ultrareview, update|upgrade`. None lists skills or commands. `claude plugin --help` was not read (UNVERIFIED whether `plugin list` prints per-command descriptions; it would list plugins, not user skills).
- `--include-partial-messages`, `--output-format json`: no description fields (the `result` message carries cost/session data only; checked in the spec capture).
- Bridge path `LTs` (offset 291126206) builds a similar list for the remote bridge (`tengu_bridge_initialize_commands` flag), using `menuDescription` and skipping `isHidden`. Not reachable from a plain local `-p` process.
- Typing `/name` in `-p` print mode only runs it (spec.md:22); no `/help`-style listing was run, so whether any local command prints descriptions in print mode is UNVERIFIED.

## 6. Implications for the panel (facts, not a design)

- Reading `SKILL.md` and `.claude/commands/*.md` frontmatter by hand would need to re-implement: YAML with the auto-quote retry, `fge`, the 100-char body fallback, `(user)`/`(project)` labels, plugin naming and manifest overrides, `skillOverrides`, and `user-invocable`. The CLI already does all of it.
- The initialize route returns the already-resolved list in the exact order of work the typeahead uses, for the same cwd and settings, in about 2 s. Costs: a spawn per refresh, the user's hooks run, and the descriptions are not truncated (max seen 1436 chars), so the UI must clip them.
- `argumentHint` is separate from the description in both routes, matching the CLI UI (ghost text after the name).
- Version drift: every identifier above is minified. The stable surface is the protocol (`initialize`, `commands`, `name/description/argumentHint`), not the bundle code.

## Open questions

- Does the initialize response arrive reliably when stdin is closed at once, on slower machines or with many MCP servers? One run per cwd succeeded (exit 0, 2 s); MCP-provided prompts (source `mcp`) were not inspected.
- Is the `initialize` request format part of a documented, stable SDK contract (the Agent SDK's `supportedCommands()`), or internal? Not checked against the SDK docs.
- Do SessionStart hooks that run for the helper process have visible side effects for this owner (6 hook runs seen)? Can `--bare` or `--setting-sources` avoid them without dropping the user's skills? Not tested.
- How does the CLI render a multi-line YAML `description` (folded `>` or literal `|`) in the row? Sanitizer found, behavior not read.
- Does `claude plugin list --json` (or similar) print command descriptions? Not read.

## Claims to verify

1. `bme` builds the typeahead row as source-labelled `description` plus `(arguments: ...)`, and `when_to_use` is not part of it (offset 320083234; compare `w1t` at 291399316).
2. Frontmatter `description` empty/null/object means fallback to the first non-empty body line, heading marker stripped, cut at 100 chars (`fge` at 284646993, `hZe` at 289698678); the official doc says only "first non-empty line".
3. `user-invocable: false` removes the entry from `slash_commands`, `skills` (init) and the initialize `commands` list; `disable-model-invocation: true` does not (`Fkr`, `PMt`).
4. The `initialize` control request returns `commands` with `name, description, argumentHint` and works with only that line on stdin, no prompt, no model call, 2 s (run on 2.1.325, 126 commands in a neutral cwd, 130 in the vault).
5. `system/init` has names only (`slash_commands`, `skills`, `agents` as string arrays; `plugins` as `{name,path,source}`), per `PMt` and the repo capture.
6. Plugin item names are `<plugin>:<subdirs>:<file or skill dir>` and show `(<plugin>) ` as a description prefix, user/project ones a `(user)`/`(project)` suffix (`$1r`, `Son`, counts 31/44/4).
7. The initialize run fires the user's configured session hooks.
