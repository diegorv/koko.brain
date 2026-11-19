# Validation: owner reality, prior art and plumbing (feature A)

Adversarial check of `05-owner-setup.md`, `06-prior-art.md`, `07-name-mapping.md` and `08-rust-and-ui.md`, with `03` and `04` read for contradictions. Branch `mvp-claude` at c8b646da6, claude 2.1.325, 2026-11-15. Home is `~`, the vault is `<vault>`. Only counts, key names and shapes appear here; no owner skill names or description text.

## Method

- Disk: a `bun` script (kept in `/tmp`, deleted) parsed every frontmatter with `Bun.YAML.parse`, the parser the CLI itself uses (bundle: `Ad` calls `Bun.YAML.parse`, see `03` section 2). On a failure it retried with the CLI's auto-quote rule (`Hu=/[{}[\]*&#!|>%@\`]|: /`). Output: aggregates only.
- Bundle: `strings -n 8 <binary> > <tmp>` (78 MB text, under 1 s), then Python `re` over that file. Minified names collide, so every function below was found by its full signature text.
- Repo: `sed -n` and `grep -n` in this worktree.
- Prior art: `gh api -H "Accept: application/vnd.github.raw" repos/<o>/<r>/contents/<path>?ref=<sha>` at the SHAs pinned in `06`; ACP doc via `curl` with a generic user agent.
- Probe: the free `initialize` probe from `04`, run twice in a fresh `mktemp -d` (cwd not the vault), `CLAUDECODE` removed, `--no-session-persistence`, no user message. Run 2 added `--bare`. Temp dirs, the strings dump and a local name list for the join were deleted. No `~/.claude/projects` entry was created for the cwd (checked by its encoded name).

## Probe results (aggregates)

| Measure | Normal | `--bare` |
|---|---|---|
| exit, reply time, exit time | 0, 0.79 s, 1.52 s | 0, 0.18 s, 0.68 s |
| stdout lines | 6 `system/hook_started`, 6 `system/hook_response`, 1 `control_response` | 1 `system/ui_invalidate`, 1 `control_response` |
| `commands` / builtin / non-builtin | 126 / 51 / 75 | 52 / 52 / 0 |
| names with `:` / with a space / ending `(MCP)` / `mcp__` | 30 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| rows with `aliases`, with `plugin` key | 30, 1 | 8, 0 |
| descriptions empty / with a newline / max length | 0 / 1 / 1436 | 0 / 1 / 1436 |
| descriptions ending `(user)` / starting `(` / ending `(claude.ai sync)` | 44 / 31 / 0 | 0 / 1 / 0 |
| terminal-only `doctor color focus reload-plugins` present | 4 of 4 | 4 of 4 |
| disk-derived names (67 user and plugin, vault excluded by cwd) found as a row `name` | 67 of 67 | 1 |
| non-builtin rows with no disk name from a `skills/*/SKILL.md` + `commands/*.md` scan | 8 | 0 |

Readings: the 1436-char description and the one with a newline are built-ins (both remain under `--bare`). `--bare` drops every user and plugin entry, so it cannot be used to avoid hooks. One disk name equals a built-in or bundled name (the `--bare` match), and in the normal run the builtin count falls from 52 to 51: a user skill shadows a bundled one.

## Verdicts on 05 (owner setup)

1. **71 entries, all with a description: confirmed.** 44 user + 4 vault + 19 plugin skills + 4 plugin commands, 71 non-empty after Bun YAML (plus retry).
2. **Lengths median 180, p90 403, max 1016, 22 over 250: confirmed** with a real YAML parser (same method for percentiles).
3. **Shapes: confirmed, with one addition.** 51 plain, 18 quoted, 1 literal `|`, 1 plain with `: `, 0 folded. Strict `Bun.YAML.parse` fails on 2 files, not 1: the vault colon case and one plugin command whose description is plain (another key fails). Both parse after the CLI's auto-quote retry.
4. **No `~/.claude/commands`, no `<vault>/.claude/commands`: confirmed** (`ls`: No such file or directory).
5. **0 collisions: partly refuted.** 0 among user, vault and plugin, 0 folder-vs-`name` mismatches, but 1 user skill shares its name with a built-in or bundled entry (probe, above).
6. **Self-loop symlink and 13 nested `synced` SKILL.md: confirmed** (46 entries, 43 symlinks including the loop, 1 dir without SKILL.md, 13 nested). Open question answered: the CLI does not list the 13 (44 `(user)` rows = 44 top-level skills, 0 `claude.ai sync` rows).
7. **28 entries, 3 vault-scoped, 14 keys / 13 true, 113 of 231 orphaned: confirmed.** `<vault>/.claude/settings.json` and `settings.local.json` have no `enabledPlugins` key (key scan only). `03` measured 130 rows in the vault cwd = 126 + 4 project skills, so the 3 vault-scoped plugins (19 command files) do not load. Inference from `03`'s count, not re-probed in the vault.
8. **Init holds names only: confirmed** (bundle `slash_commands:e.commands.filter((t)=>t.userInvocable!==!1).map((t)=>t.name)`). **But the conclusion "every description must come from disk" is refuted** by the `initialize` reply (above; `03`, `04`).
9. **"The simple `skills/*/SKILL.md` scan covers the enabled plugin skills": refuted.** One enabled plugin declares `skills` as a string path in `.claude-plugin/plugin.json`, with 7 SKILL.md outside `skills/`. Plugin skills total 26, not 19. That accounts for the 126: 51 builtin + 44 user + 30 plugin-namespaced (19 + 7 + 4) + 1 runtime-registered (`plugin` key).
10. **Manifest stats ("2 declare skills, one a list of 27; 1 declares commands, a list of 4"): not reproduced.** Among the 13 enabled user-scope install paths, I found 1 `skills` key (string) and 0 `commands` keys. 05 may have counted other manifests. UNVERIFIED either way.

## Verdicts on 06 (prior art)

All checked claims hold at the pinned SHAs:
- t3code `ClaudeSkills.ts` (844 lines) has 0 hits for `commands`. `ClaudeProvider.ts:536` is `await q.initializationResult()`, `:600` is `parseClaudeInitializationCommands(init.commands)`. The "never yields" comment is in the same block. Confirmed.
- t3code's `: ` repair (`ClaudeSkills.ts:72-87`) quotes only values with `:<space>`. The CLI also quotes values containing `{}[]*&#!|>%@` and backtick. So t3code can mark a skill malformed when the CLI loads it. UNVERIFIED whether the owner's second failing file trips it (it is a command file, which t3code does not read).
- ACP `src/slash-commands.ts:89-92` sets `description: command.description || ""`. `src/v2/commands.ts:31` renders `await this.query.supportedCommands()`. Lines 78-81 rename names ending ` (MCP)` to `mcp:<name>`. Confirmed.
- opcode `slash_commands.rs:204,218,232` hardcodes `add-dir`, `init`, `review`. No `skill` hit. Confirmed.
- claudecodeui `commands.routes.ts:154-158`: frontmatter `description`, else the first content line minus `#`. Confirmed.
- ACP doc: `AvailableCommand.name` and `description` are `string required`, `input` is optional, `hint` is required inside it. Confirmed.

## Verdicts on 07 (name mapping)

1. **Init uses internal `name`; `initialize` rows use `userFacingName`: confirmed.** `wRr` starts `let r=Us(e)` and returns `{name:r,...}`. The `Us` near it is `function Us(e){return e.userFacingName?.()??e.name}`. Skills: `yBn` sets `userFacingName(){return Pn}` with `_o=n||e` (display name, else directory name).
2. **wRr adds the internal name to `aliases` only in some cases: confirmed, with a gap 07 missed.** It is added when it contains `:`, or when it is a non-MCP, non-builtin prompt that passes `E$n()`. For MCP prompts the init name is `"mcp__"+Ln(server)+"__"+prompt`. The row name is `<server>:<prompt> (MCP)` (stdio) or `<prompt>` (http/sse with a valid URL), and the row aliases never include the `mcp__` form. So a name or alias join cannot match MCP prompts. The owner's probe had 0 MCP prompt rows.
3. **Init does not drop `isHidden`, rows do: confirmed.** `Fkr` drops `userInvocable===false`, `rowFromHost`, `skillOverrides` off and (behind `Q7e()`) `isHidden`. Init filters only `userInvocable`. Some init names can have no row.
4. **Source labels `Son`/`ex`: confirmed** (text matches 07 and 03 exactly).
5. **Plugin skill name sanitized to `[a-zA-Z0-9_-]`: confirmed, with more than one code path.** `QAo(e,n,r)` builds `${e}:${n.replace(/[^a-zA-Z0-9_-]/g,"-")}`. Another loader uses the frontmatter `name` minus a `<plugin>:` prefix, else the file name. `03`'s `$1r` handles plugin commands. This is one more reason not to reimplement naming.
6. **`CLAUDE_CONFIG_DIR` else `~/.claude`: confirmed.** See 08.3 for the real resolver.
7. **19 installed ids vs 14 in `enabledPlugins`: confirmed.**
8. **43 of 46 symlinks, 44 SKILL.md, 1 block scalar: confirmed.**

## Verdicts on 08 (Rust and UI)

1. **No `status.rs`; `claude_status` at `claude.rs:220-234`; `commands/claude/` holds `shell_env.rs`, `stream.rs`, `turn.rs`: confirmed** (`ls`, `sed`).
2. **`child_env` keeps everything except `SHELL_LOCAL` and `INJECTED` (`shell_env.rs:137-146`); `fallback_env` builds on `clean_base` (only `BASE_NAMES` + `LANG`/`LC_*`, `:84-98`) so it keeps `HOME` and drops `CLAUDE_CONFIG_DIR`: confirmed.**
3. **Config-dir bundle string: the conclusion is right, but the evidence is the wrong code.** `process.env.CLAUDE_CONFIG_DIR||Mt(Mc(),".claude")` belongs to a self-hosted runner (`SELF_HOSTED_RUNNER_HOST_CONFIG_DIR||...` precedes it). The CLI's own resolver is `var Ge=p(()=>(fut()??u(D(),".claude")).normalize("NFC"),fut)`, with `function fut(){return process.env.CLAUDE_CONFIG_DIR}` and `homedir as D}from"os"` in the same module. So the rule is `CLAUDE_CONFIG_DIR`, else `os.homedir()/.claude`, NFC-normalized. The open question about `Mc()` goes away.
4. **`parse_frontmatter` (`parsing.rs:588`) falls back to the subset parser on rejection, splitting at the first `:` (`parsing.rs:618-631`, `:861-`): confirmed.** It would return the full colon value. The subset parser skips block scalars, but the 1 block-scalar file parses as valid YAML. The `FRONTMATTER` debug log prints only the yaml-rust2 error. This matters only for a file scan, which I do not recommend.
5. **Palette and switcher match one field: confirmed.** `command-palette.logic.ts:24` matches `cmd.label`. The switcher path is `src/lib/core/filesystem/file-entries.logic.ts:53` (`file.nameWithoutExt`), not a quick-switcher file.
6. **Test that breaks: confirmed, wording corrected.** `ClaudePanel.test.ts:583` asserts the options' `textContent` list equals `['/review', '/code-review']`. No other test or E2E spec reads `data-claude-slash-option` text.
7. **Row height and characters per line:** estimates, still UNVERIFIED (not rendered).
8. **"Refetch after each Init": rejected for the probe route.** Each probe runs the owner's SessionStart hooks (6 in both runs here), so a probe per turn doubles hook runs.

## Contradictions between files

- 01 and 05 say descriptions must come from disk. 03, 04 and two runs here show the CLI returns all 126 (130 in the vault per 03) with descriptions, before any message, with no model call.
- 04 says the join key is `name`. The bundle shows rows carry `userFacingName`, and MCP prompt names differ with no alias bridge (07.2 above).
- 04 claim 6 explains "126 = 126" by a shared filter. It compares a neutral-cwd probe with the spec's init count (a turn runs in the vault, where 03 measured 130). Init also keeps `isHidden` entries. The equal count is not evidence.
- 05 says the plugin scan is complete (19). The real total is 26 plus 4 commands (item 9).
- 05's manifest counts disagree with mine (item 10).
- 08 recommends a disk scan in Rust, while 03 and 04 recommend the probe. The UI half of 08 (two-line row, names-only filter, per-vault cache, drop stale vault replies) holds with either source.

## Recommendation

Get descriptions from the CLI, not from files. Keep `Init.slash_commands` as the authoritative name list.

1. **Rust:** a new `commands/claude/slash.rs` with a pure `parse_initialize_reply(line) -> Option<Vec<SlashRow>>` and a `slash_rows_with(binary, env, vault, timeout)`. The latter spawns `claude -p --input-format stream-json --output-format stream-json --verbose --no-session-persistence`, resolving the binary like a turn: env-cleared turn env, `CLAUDECODE` removed, cwd = vault, own process group, stdin piped. It writes one `{"type":"control_request","request_id":<id>,"request":{"subtype":"initialize"}}` line and reads stdout until the `control_response` with that `request_id`. It skips hook and non-JSON lines, then closes stdin, waits briefly and kills the group on timeout (about 15 s). Also add a thin `#[tauri::command] claude_slash_rows` wrapped in `spawn_blocking`, like `claude_status`. DTO `SlashRow { name, description, argument_hint, aliases }` with `#[ts(export)]` (a "Both" change). Never log descriptions, and never log the reply or its `account` object.
2. **Join in the frontend:** build a `Map` from each row's `name` and every alias to `{description, argumentHint}`. Look up each Init name. A name with no row (hidden built-ins, MCP prompts) renders as today. Optionally bridge MCP later by turning `<server>:<prompt> (MCP)` into `mcp__<server with [^A-Za-z0-9_-] as _>__<prompt>`. That rule comes from the docs; `Ln` was not read.
3. **When:** once per vault per app session, at panel mount inside `untrack()`, cached by `normalizeVaultPath`. Run it again only when an `Init` brings a name the map lacks, at most once per such change. Drop a reply whose vault no longer matches (Issue 09). Clear the cache with `resetClaude`.
4. **UI:** 08's two-line row (`line-clamp-2`, muted `text-meta`, about `max-h-64`). Collapse whitespace (1 description has a newline). Keep the CLI's `(user)` / `(<plugin>)` labels as the CLI shows them. Do not match descriptions in v1. `argumentHint` could later become ghost text, as in the TUI (`03` section 2).
5. **Tests:** a Rust test for the reply parser on a synthetic fixture (built-in rows only, invented names), plus the timeout and non-JSON paths. Vitest for the join (alias hit, missing row, MCP name). `ClaudePanel.test.ts:583` updated.
6. **Not chosen:** a disk scan. On this one machine it already misses 7 manifest-declared plugin skills, 51 built-in or bundled rows, a runtime-registered command and a bundled-name shadow. It must reimplement YAML retry, labels, precedence, `skillOverrides`, enablement and naming paths that change between CLI versions.

## Open questions

- Do `initialize` rows include prompts from an MCP server that is still connecting? The owner had 0 MCP prompt rows, so this is untested.
- Can `--settings '{"disableAllHooks":true}'` skip the SessionStart hooks while keeping user and plugin skills? `--bare` cannot (52 built-ins only). Not run.
- Does the panel want rows before the first turn? Rows include the 4 terminal-only names with no flag, and MCP display names that cannot be typed.
- Is a probe on each "new name seen" enough, or does the owner want a manual refresh for edited SKILL.md text?
- Which manifests did 05 count for "skills list of 27" and "commands list of 4"?

## Claims to verify

1. The `initialize` probe returns 126 rows in an empty cwd (51 builtin, 30 with `:`, 30 with aliases, 1 with `plugin`, 0 empty descriptions, max 1436) and 52 built-in rows only under `--bare`. Two runs here, both 2.1.325.
2. `wRr` names rows by `Us(e)` = `userFacingName?.()??name`, and MCP prompt rows (`<server>:<prompt> (MCP)` or `<prompt>`) never carry the init `mcp__<server>__<prompt>` name, as name or alias.
3. Init `slash_commands` filters only `userInvocable`, while rows also drop `isHidden`, `rowFromHost` and `skillOverrides` off (`Fkr`).
4. The CLI config dir is `(process.env.CLAUDE_CONFIG_DIR ?? os.homedir()+"/.claude").normalize("NFC")` (`Ge`, `fut`, `homedir as D`).
5. On the owner's disk, 2 of 71 frontmatter blocks fail strict `Bun.YAML.parse` and pass the CLI auto-quote retry. 7 enabled plugin skills sit outside `skills/` via a manifest string path. The 13 nested `synced` skills are not listed.
6. 1 user skill shares its name with a built-in or bundled entry (`--bare` probe match, builtin count 52 to 51).
7. The vault-scoped project plugins do not load in the vault (130 = 126 + 4, from 03's count; vault settings have no `enabledPlugins`).
