# Validation: where slash descriptions come from and how names map to them

Adversarial check of research files 01 to 04 for feature (A). Every load-bearing claim was treated as wrong until re-checked. Research only; no repo code changed.

## Method

- Repo: re-read `src-tauri/src/commands/claude/stream.rs`, `turn.rs`, `src/lib/features/claude-code/claude.logic.ts`, `claude.store.svelte.ts`, `ClaudePanel.svelte`, `.scratch/claude-code-integration/spec.md` on branch `mvp-claude`.
- Bundle: `strings -n 20 ~/.local/share/claude/versions/2.1.325 > <tmp>/s.txt` (0.5 s, 76 MB), then `grep -o` / `grep -b -o` and `dd` windows on that text file. Offsets below are byte offsets in that strings dump, NOT in the binary (03 used binary offsets; both move on upgrade). `claude --version` printed `2.1.325 (Claude Code)`.
- Docs: `curl https://code.claude.com/docs/en/agent-sdk/typescript.md` (334981 bytes), grepped.
- Live: the free `initialize` probe, 3 runs (plain twice, then plain plus `--bare`), each in a fresh `mktemp -d`, no user message, `CLAUDECODE` removed, Python run with `-I` from a script dir outside the temp dir. Only counts and key names were printed. Temp dirs removed; no `~/.claude/projects` entry was created for any of them.
- Disk: one structure-only count over `~/.claude/skills/*/SKILL.md` and `<vault>/.claude/skills/*/SKILL.md` (frontmatter `name` equal to the dir name or not; no names printed).

## Verdicts on load-bearing claims

| # | Claim (file) | Verdict | Evidence |
|---|---|---|---|
| 1 | `init_event` emits name-only lists, terminal names removed, `skills` unchanged (01) | confirmed | `stream.rs:141-152`; `strings()` at `stream.rs:281-288` uses `filter_map(as_str)` |
| 2 | `strings()` silently drops non-string elements (01) | confirmed | same lines; an object array yields `vec![]` with no log |
| 3 | Nothing in the feature reads `Init.skills` (01) | confirmed | `grep -rn skills src/lib/features/claude-code/` returns no line |
| 4 | `resetChat` keeps `slashCommands`, `reset()` clears them (01) | confirmed | `claude.logic.ts:104-107`, `claude.store.svelte.ts:55-58` |
| 5 | Turns cannot carry a control request: stdin is null, prompt after `--` (01, 04) | confirmed | `turn.rs:109` (`"--"`), `turn.rs:126` (`Stdio::null()`) |
| 6 | Init builder maps commands and skills to `.name` only (01, 03) | confirmed | dump: `slash_commands:e.commands.filter((t)=>t.userInvocable!==!1).map((t)=>t.name)` and `skills:Zi(e.skills,"name").filter((t)=>t.userInvocable!==!1&&!t.rowFromHost)` |
| 7 | Init schema declares string arrays; plugins `{name,path,source?,version?}` (01) vs `{name,path}` (02) | confirmed, both | dump: `skills:A(o()),plugins:A(u({name:o(),path:o(),source:o().optional().describe('@internal ...` and mapper `function Ooo(e)` returns `{name,path,source,...version}`. `source` is marked `@internal`, which is why the public doc type omits it. Not a real contradiction |
| 8 | A bare `initialize` control_request returns `response.response.commands`, no model call, no `system/init` (03, 04) | confirmed | my run 1: reply at 1.48 s, exit 0 at 2.49 s, 13 lines (6 `hook_started`, 6 `hook_response`, 1 `control_response`), no `init`, no `assistant`/`result` |
| 9 | Every entry has string `name`, `description`, `argumentHint`; optional `aliases`, `builtin`, `plugin` (04) | confirmed | run 1 key sets: `{argumentHint,description,name}` 51, `+builtin` 44, `+aliases` 23, `+aliases+builtin` 7, `+plugin` 1. Docs `ts.md:5182` list the same type minus `plugin` |
| 10 | Counts 126 / 38 hints / 51 builtin / 30 with `:` / max 1436 / 0 empty (03, 04) | confirmed | run 1 reproduced every number; also 73 longer than 100 chars and 1 description that contains a newline (not reported by 03 or 04) |
| 11 | Terminal-only `doctor`, `color`, `focus`, `reload-plugins` are in `commands` with no flag (04) | confirmed | run 1: all four present; key sets above carry no terminal field. Some interactive built-ins (`help`, `login`, `exit`, `theme`, `resume`, `cost`) are absent from the list |
| 12 | Initialize and init use the same filter `Fkr`, so the counts match (04 claim 6) | uncertain | Print-mode init call site passes `commands:QNt(M)` (dump offset 46272502), and `QNt(e)=Zi(e,"name").filter(Fkr)`, the same set `Ele` maps. So the SETS plausibly match. But the spec's 126 (`spec.md:21`, 2026-11-14) does not record its cwd, and 03 got 130 in `<vault>`; equal counts on different days and cwds prove nothing |
| 13 | The join key between init and initialize is `name` (01, 03, 04) | refuted as stated | `function wRr(e,n){let r=Us(e),...return{name:r,...}` and, near it, `function Us(e){return e.userFacingName?.()??e.name}` (dump 24028631; command matcher `Nx(e,n)` uses `e.name===n||Us(e)===n||aliases`). Initialize emits the user-facing name; init emits the internal `name`. They differ for (a) a skill whose frontmatter `name` differs from its dir (`let _o=n||e,Pn=...` in `yBn`, dump 29153484; `name:vn` is the dir name, `userFacingName(){return Pn}`) and (b) every MCP prompt (next row). In case (a) `wRr` adds the internal name to `aliases` when it passes the `E$n` check; in case (b) it does not. The join must be name OR alias, and MCP prompts still do not join |
| 14 | MCP prompts show as `/server:prompt (MCP)`, run as `/mcp__server__prompt` (02) | confirmed in bundle, not live | MCP prompt builder: `name:"mcp__"+Ln(e.name)+"__"+O.name`, `userFacingName(){return E?O.name:\`${e.name}:${O.name} (MCP)\`}`, `aliases:E?[...]:void 0`, description `v?.prompts?.[O.name]??O.description`. So initialize would list `server:prompt (MCP)` (with a space) and no `mcp__` alias. Owner's run 1 had 0 names with a space, 0 ending `(MCP)`, 0 starting `mcp__`; whether MCP servers had connected before the reply is UNVERIFIED |
| 15 | Plugin names are `<plugin>:<...>` with a `(<plugin>) ` prefix; user items end `(user)`, project `(project)` (03) | confirmed | `Son` source read in dump; run 1: 44 end `(user)`, 31 start `(`, 30 names with `:`. Run 2: the 23 non-builtin entries with aliases all start `(` (plugin) and every alias is a suffix of its name (bare form), none contains `:` |
| 16 | Descriptions in initialize already carry source labels (03; 04 mentions plugin only) | confirmed | `description:Son(e)`; `Son` appends `(user)`, `(project)`, `(project, gitignored)`, `(managed)`, `(cli flag)`, `(plugin)` or prefixes `(<plugin>) ` |
| 17 | Fallback: first non-empty body line, `#` marker stripped, cut at 100 chars (03) | confirmed | `function hZe(e,n="Custom item")` body read in dump; `fge` treats empty, null, object and list as missing |
| 18 | `when_to_use` is not in the menu row or the initialize description (03) | confirmed | `w1t` joins `whenToUse` for the model listing only; `wRr` uses `Son(e)` with `n=e.description` |
| 19 | The menu or SDK list applies the 1,536 cap (02, open) | refuted for initialize | `wRr`/`Son` contain no cut; the max seen (1436) is under 1536, so the data alone could not show it |
| 20 | A non-SDK client's wire format is undocumented (02) | refuted (partly) | `ts.md:915` "A repeated initialize sent over the CLI's stdin also returns `true`", `ts.md:929` gives the `{type:"control_request",request_id,request}` shape, `ts.md:933` "if you parse the wire protocol yourself", `ts.md:956` "A client that drives the CLI's control protocol directly". The request envelope is semi-documented; the `initialize` request body itself is documented only through the SDK types |
| 21 | Option 1 needs a long-lived process (02 section 10) | refuted | runs 1 to 3: one-shot spawn, write one line, read one reply, close stdin |
| 22 | Hooks run during the probe (03, 04) | confirmed | run 1: 6 `hook_started` + 6 `hook_response`, the reply arrived before the last hook finished in 04's run; in mine the counts were the same |
| 23 | `--bare` might avoid the hooks without losing skills (03 open) | refuted | run 3: `--bare` replied in 0.19 s with no hook lines, but only 52 commands, all `builtin`; the 44 user and 30 plugin entries were gone (74 names missing, 0 new). `claude --help` says `--bare` skips hooks and plugin sync |
| 24 | The probe writes no transcript (04) | confirmed for an empty cwd | all three runs: no `~/.claude/projects` entry named after the temp dir |
| 25 | Vault cwd adds vault-local entries (03: 130, 4 `(project)`) | plausible, not re-run | disk count: `<vault>/.claude/skills` has 4 SKILL.md files, 126 + 4 = 130. I did not probe in `<vault>` (task rule: fresh temp dir) |

Disk check for row 13 case (a): `~/.claude/skills` 44 skills, `<vault>/.claude/skills` 4 skills, frontmatter `name` equals the dir name in all 48. So the mismatch does not bite the owner today; it is a latent bug for any future skill with a custom `name`.

## Contradictions between the files

1. 01, 03 and 04 all say "join on `name`". The bundle says initialize `name` is `userFacingName` and init uses the internal name (row 13). None of the four files read `Us`.
2. 04 claim 6 calls the 126 = 126 match proof of the same filter. The filter is shared (row 12), but the evidence offered (counts from different days and cwds) is not proof, and 03's 130 in `<vault>` sits beside it unreconciled.
3. 02 says the direct wire protocol is undocumented and needs a long-lived process; 03, 04 and my runs show a one-shot spawn works, and the current docs reference direct protocol clients (rows 20, 21).
4. 02 lists MCP prompts as menu entries; 01 to 04 never check how they join. The bundle shows they cannot join by name or alias (row 14).
5. 02's plugin type `{name, path}` vs 01's `{name, path, source, version?}`: both correct; `source` is `@internal` (row 7).
6. 04 lists only the plugin label added by `Son`; 03 lists all labels. 03 is right (row 16).

## Recommendation

Use the CLI's `initialize` reply as the only source of descriptions. Do not read SKILL.md or command files from disk: that would re-implement discovery, YAML retry, the fallback, labels, plugin naming, manifest overrides and `skillOverrides`, and built-ins and MCP prompts have no file anyway.

1. Rust: a new command (for example `claude_list_commands(vault_path)`) that spawns the same binary with the same login-shell env as a turn, `CLAUDECODE` removed, `current_dir(vault_path)`, args `-p --input-format stream-json --output-format stream-json --verbose`. Write `{"type":"control_request","request_id":<id>,"request":{"subtype":"initialize"}}`, read stdout lines until the `control_response` whose `response.request_id` matches, then close stdin and wait; kill on a timeout (10 to 15 s). Treat `response.subtype:"error"` and a missing `commands` as an error (rule 7: propagate). Parse only `name`, `description`, `argumentHint`, `aliases` with serde, ignoring unknown keys. Never log the reply: it holds private skill descriptions and an `account` object.
2. DTO: `SlashCommandInfo { name, description, argument_hint, aliases }` with `#[ts(export)]` (a Both change). Leave `ClaudeEvent::Init` as it is.
3. Frontend join: build a lookup keyed by each entry's `name` and each `alias`. Keep the menu's names from `system/init` once a turn has run (those are the names the CLI runs), and look up the description by that name. A name with no hit (an MCP prompt, or a CLI change) shows with no description.
4. Before the first turn, show the initialize list so the menu is not empty, minus names that contain whitespace (MCP `(MCP)` names neither match `slashQuery`'s `\S*` nor run when typed). Hide terminal-only names with the `terminal_slash_commands` of the last `init` when the app has one; before any init, show them (docs: they can be sent like any other entry, and in `-p` a terminal-only built-in answers "isn't available" without a model turn).
5. Display: collapse whitespace (one description has a newline), clamp to one line with CSS `truncate`, full text in `title`. Keep the source labels the CLI adds; they match the terminal menu. Show `argumentHint` as muted text after the name if wanted. Keep filtering on names only (smallest change to `filterSlashCommands`).
6. Cache per vault in the store, fetched lazily when the panel first opens for a vault, cleared on vault close. A manual refresh action is enough for new skills; do not fetch per turn or per keystroke.

## Risks

- Each fetch runs the owner's 6 SessionStart hooks; any hook with side effects (logging, notifying) fires on every panel open per vault. `--bare` is not a way out (row 23). `--setting-sources` was not tested.
- The control protocol is an SDK contract, documented through the SDK types and a few wire notes; the CLI could change it. Mitigation: unknown keys ignored, a missing list is an error, the menu still works from `system/init` names.
- Name mismatch (row 13): a skill with a custom frontmatter `name` and every MCP prompt need the alias path or get no description. Not present in the owner's setup today.
- MCP prompts may arrive after the reply if servers connect slowly (UNVERIFIED); a one-shot snapshot would miss them, and the docs say `commands_changed` covers mid-session changes only for a live process.
- About 1.2 to 1.5 s to the reply, 2.5 s to exit with hooks. Must not block the panel; run async and show names first.
- Descriptions up to 1436 chars and user-authored: keep them in memory only, out of logs and fixtures (tests use built-in or made-up entries).
- Stale cache: a skill added while the app runs shows no description until a refresh; the name still appears from the next `init`.

## Open questions

1. Does the print-mode `system/init` list MCP prompts at all, and under which spelling (`mcp__server__prompt`)? Needs a real init line from a setup with a prompt-providing MCP server, which needs a model call.
2. Do MCP prompts appear in the `initialize` reply if the servers connect after it is sent? Not testable on this setup (0 MCP prompt names seen).
3. Can `--setting-sources project,local` skip user hooks while keeping `~/.claude/skills`? Not tested.
4. What does `E$n` check exactly, that is, when does a skill with a custom `name` get its dir name as an alias? Read only in part.
5. Is the reply stable when hooks or MCP servers hang? The reply came before the last hook finished, but a hung hook was not tested.
6. Which of the several init builder call sites (dump offsets 46272502 and others) runs for a plain `claude -p` turn? I traced the one that calls `QNt`, not the others.

## Claims to verify

1. Initialize `commands[].name` is `userFacingName ?? name` (`wRr` plus `Us` in the dump), while `system/init` uses the internal `name`; join on name OR alias.
2. MCP prompt commands are named `mcp__<server>__<prompt>` internally and `<server>:<prompt> (MCP)` in initialize, with no `mcp__` alias.
3. `--bare` returns only the 52 builtin commands, so it cannot be used for the list.
4. The initialize reply for the owner's setup in an empty cwd: 126 commands, 0 names with whitespace, 23 plugin entries with bare-name aliases, 1 description with a newline.
5. Print-mode init passes `commands:QNt(M)`, the same `Fkr` filter as initialize, so the two name sets differ only by the name mapping and the terminal-only subtraction.
6. The current SDK docs describe repeated `initialize` over stdin and direct protocol clients (`ts.md` lines 915, 929, 933, 956).
