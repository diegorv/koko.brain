# Synthesis: descriptions in the panel's `/` autocomplete (feature A)

Inputs: scouts `01`-`08` and validators `validate-source.md`, `validate-impl.md` in this folder, plus the gap probes in section 2 (run 2026-11-15, claude 2.1.325, branch `mvp-claude` at c8b646da6). Paths: `~` is home, `<vault>` the owner's vault. No owner skill names, descriptions or note text appear here. The MCP names `probe` and `hello-prompt` are invented for a test server.

## 1. Confirmed facts

| # | Fact | Evidence |
|---|---|---|
| F1 | The panel's menu lists names only. `init_event` emits `slash_commands` minus `terminal_slash_commands`, and `skills` unchanged. `strings()` drops non-string elements without an error | `stream.rs:141-152`, `:281-288` (01, validate-source 1-2) |
| F2 | `Init.skills` is never read by the frontend. `resetChat` keeps `slashCommands`; `claudeStore.reset()` (vault close) clears them | `claude.logic.ts:104-107,122-124`, `claude.store.svelte.ts:55-58` (01, validate-source 3-4) |
| F3 | A turn cannot carry a control request: stdin is null and the prompt follows `--` | `turn.rs:109`, `turn.rs:126` (validate-source 5) |
| F4 | `system/init` lists are name-only by design. The CLI builder maps `.name`, and the zod schema declares string arrays | bundle `PMt` (01, 03, validate-source 6-7) |
| F5 | A bare `{"type":"control_request","request_id":X,"request":{"subtype":"initialize"}}` on stdin of `claude -p --input-format stream-json --output-format stream-json --verbose` returns `response.response.commands`. It needs no user message and makes no model call. It emits no `system/init` and writes no transcript | 03, 04, validate-source 8, validate-impl probe, section 2 |
| F6 | Each row always has string `name`, `description` and `argumentHint` (empty string for none), plus optional `aliases`, `builtin` and `plugin`. Neutral cwd: 126 rows, 51 builtin, 38 hints, 30 with `:`, 0 empty descriptions, max 1436 chars, 73 over 100, 1 with a newline (a built-in) | 04, validate-source 9-10, validate-impl |
| F7 | Row descriptions already carry the CLI's source labels: `(user)`, `(project)`, `(<plugin>) ` prefix. They never include `when_to_use`. The body-line fallback cuts at 100 chars. Rows have no 1,536 cap | bundle `Son`, `ex`, `hZe`, `fge`, `w1t`, `wRr` (03, validate-source 15-19) |
| F8 | Row `name` is `userFacingName ?? name`, while init uses the internal `name`. They differ for a skill with a custom frontmatter `name` (the internal name goes to `aliases` only when `E$n` passes) and for MCP prompts | bundle `wRr`, `Us`, `yBn` (validate-source 13, validate-impl 07.1-2) |
| F9 | Owner setup today: all 48 user and vault skills have `name` equal to their dir, so F8 is latent for skills | validate-source disk check |
| F10 | Terminal-only `doctor`, `color`, `focus` and `reload-plugins` appear in rows with no flag | 04, validate-source 11 |
| F11 | `--bare` drops every user and plugin row (52 built-ins only) | validate-source 23, validate-impl |
| F12 | A disk scan is wrong on this machine. It misses 7 plugin skills declared by a manifest string path, 51 built-in or bundled rows and 1 runtime-registered command. A user skill shadows a bundled name. Strict YAML fails on 2 of 71 files that the CLI loads after its auto-quote retry | validate-impl (05 verdicts 3, 5, 9) |
| F13 | Prior art agrees. t3code takes commands from `initializationResult().commands`, and the ACP adapter from `supportedCommands()`. File-based GUIs (opcode, claudecodeui) cover only `commands/*.md` | 06, validate-impl 06 |
| F14 | Rust plumbing: `claude_status` pattern (`claude.rs:220-234`, `spawn_blocking`), binary lookup `resolve_turn_claude` (`claude.rs:188`, honors the Settings override), `turn_command` (`turn.rs:119-135`, env-cleared, own process group), `kill_group` (`turn.rs:341`), fake `claude` shell scripts in tests (`claude_turn_test.rs:26`). Contracts wiring at `src/lib/contracts/commands.ts:222-229,335-337` | repo, 08 |
| F15 | UI: one-line truncated rows in a `max-h-48` box (`ClaudePanel.svelte:325-338`). The filter is name-only (`claude.logic.ts:200-211`). The only exact-text test is `ClaudePanel.test.ts:583` | 01, 08, validate-impl 08.5-6 |

## 2. Gaps closed here (new probes)

All probes: aggregate-only Python (`-I`) outside the cwd, `CLAUDECODE` removed, `--no-session-persistence`, fresh `mktemp -d` cwd unless stated. Temp dirs and the scripts were deleted afterwards.

| # | Question | Result |
|---|---|---|
| G1 | Can hooks be skipped without losing skills? | `--settings '{"disableAllHooks":true}'`: reply in 0.21 s, exit 0.76 s, 0 hook lines, 125 rows (51 builtin, 44 `(user)`, 30 with `:`). Only the 1 row with a `plugin` key is gone, which is the command a hook or mod registers at startup. Baseline the same day: 126 rows, reply 0.98 s, 6 `hook_started` lines |
| G2 | Does a slow SessionStart hook delay the reply? | Yes. Adding a `sleep 8` SessionStart hook through `--settings` moved the reply to 8.34 s. The reply waits for SessionStart hooks |
| G3 | Vault cwd (validators did not re-probe) | Run in `<vault>` with hooks disabled: 129 rows = 125 + 4 `(project)`. Vault-scoped plugins do not load. The vault's session dir had 36 entries before and after, so no transcript was written |
| G4 | Do init names and row names match as sets? (04 claim 6, uncertain) | A free `system/init` comes from `-p --output-format stream-json --verbose --no-session-persistence -- "/theme"`: `result.total_cost_usd` 0, `num_turns` 0, 0 input and output tokens. In a neutral cwd its 126 `slash_commands` equal the 126 row names exactly, in both directions. `skills` (88) is a subset of `slash_commands`. All 4 `terminal_slash_commands` are inside `slash_commands`, unlike the sanitized fixture. This run created an empty `memory/` dir under `~/.claude/projects/<encoded cwd>` (removed). The initialize probe creates none |
| G5 | MCP prompts (no live evidence before) | A local stdio MCP server with one prompt, added with `--mcp-config`. Init lists `mcp__probe__hello-prompt`. The initialize reply lists no MCP row, even for a server that answers at once. A `system/commands_changed` push follows once the server connects: at 0.40 s for an instant server, 5.34 s for a server that waits 5 s. It carries the full list with row `{"name":"probe:hello-prompt (MCP)","description":<server's text>,"argumentHint":""}`, with no `aliases` and an empty hint although the prompt declares an argument. A second `initialize` on the same live process returns the updated list |

Consequences: F8's MCP gap is real, and a one-shot reply never holds MCP prompts. For the owner's skills, plugins and built-ins, joining init names to row names (plus aliases) is exact today.

## 3. Refuted claims

- "Descriptions must come from disk" (01, 05): refuted by F5 and F12.
- "Join on `name`" (01, 03, 04): refuted as a general rule (F8). It holds for the owner today (G4) except for MCP prompts (G5).
- "126 = 126 proves a shared filter" (04): the evidence was wrong, but G4 now shows set equality in one cwd on one day.
- "The wire protocol is undocumented and needs a long-lived process" (02): refuted. One-shot works, and `agent-sdk/typescript.md` documents repeated initialize over stdin and direct protocol clients (validate-source 20-21).
- "MCP prompts might be in the reply" (validate-source open): refuted by G5. They arrive only via `commands_changed`.
- "`--bare` keeps skills" (03 open): refuted (F11). `disableAllHooks` does keep them (G1).
- 05's "plugin `skills/*/SKILL.md` scan is complete", "0 collisions", "only the colon file fails YAML": refuted (F12). 05's manifest counts were not reproduced (validate-impl 05.10).
- 08's config-dir evidence string belonged to a self-hosted runner. The rule (`CLAUDE_CONFIG_DIR`, else `os.homedir()/.claude`) stands (validate-impl 08.3). It is moot for the CLI route.
- 08's "refetch after every Init": rejected, since each probe runs hooks unless G1 is used.

## 4. Recommended approach

Get descriptions from the CLI's `initialize` reply and keep `Init.slash_commands` as the authoritative name list once a turn has run.

1. **Rust.** Add `commands/claude/slash.rs`. It holds a pure `parse_initialize_line(line, request_id)` and a `slash_commands_with(binary, env, vault, timeout)` that spawns `claude -p --input-format stream-json --output-format stream-json --verbose --no-session-persistence --settings '{"disableAllHooks":true}'` (hooks flag per owner decision D2). The env is the turn env (`turn_env`, `CLAUDECODE` removed), cwd is the vault, the child gets its own process group and stdin is piped. It writes one initialize line, skips non-JSON and other lines, stops at the matching `control_response`, closes stdin and kills the group on a timeout (15 s, or longer if hooks stay on, G2). An error subtype or a missing `commands` is an error. It reads only `name`, `description`, `argumentHint` and `aliases`, ignores unknown keys and never logs the reply. A thin `#[tauri::command] claude_slash_commands(binary_path, vault_path)` runs it in `spawn_blocking` and resolves the binary with `resolve_turn_claude`. The output DTO is `SlashCommandInfo { name, description, argument_hint, aliases }` with `#[ts(export)]`. This is a "Both" gate change. `ClaudeEvent::Init` is unchanged.
2. **Frontend.** Add a per-vault map from each row's `name` and every alias to `{description, argumentHint}`, with a getter and its own test, keyed by `normalizeVaultPath`. It is fetched at panel mount inside `untrack()` and fetched again only when an `Init` brings a name the map lacks. A reply for a vault that is no longer current is dropped, and `resetClaude` clears the map. A failed fetch leaves today's names-only menu.
3. **Display.** Rows stay filtered on names (`filterSlashCommands` unchanged). Each row shows `/name`, then the description with whitespace collapsed and a clamp (D4). A name with no hit renders as today.

### Alternatives

| Option | For | Against |
|---|---|---|
| Disk scan of SKILL.md and commands (05, 08) | No process, no hooks | Wrong on this machine (F12); must reimplement YAML retry, naming paths, labels, precedence, `skillOverrides`, enablement; built-ins and MCP have no file |
| Static table of built-in descriptions | Trivial | Covers 51 of 126 at best, drifts per CLI version (02 section 7) |
| Free init via `-p "/theme"` for the names before the first turn (G4) | Gives `terminal_slash_commands` with no model call | Undocumented use of a refusal path, creates an empty `memory/` dir per new cwd, adds a second probe; rows already give names |
| Long-lived control process (`commands_changed`, `reload_skills`) | Live updates, MCP prompts | Contradicts ADR 0038 one-process-per-turn; idle process with hooks and MCP servers |
| Probe with the owner's hooks on | Includes the hook-registered command | +0.8 s, waits on every SessionStart hook (G2), fires 6 hooks with side effects per probe |

## 5. Owner decisions

- **D1 Source.** Choose between the CLI initialize probe and a disk scan. *Recommend the probe* (F12, F13).
- **D2 Hooks during the probe.** Choose between `disableAllHooks` and the full hooks. *Recommend `disableAllHooks`*: 0.2 s, no side effects, no wait on slow hooks. Cost: 1 hook-registered command shows its name without a description.
- **D3 Menu before the first message.** Choose between showing the probe's rows and keeping "Slash commands load after the first message." *Recommend showing the rows* minus names with whitespace. Hide terminal-only names using the last `Init` of this app session, and show them before any `Init`.
- **D4 Row layout.** Two lines (`line-clamp-2`, `max-h-64`) or one truncated line with a `title` tooltip. *Recommend two lines*: median description 180 chars, about 40 chars fit per line at 250 px (estimate). The validators split on this.
- **D5 Extras.** Show `argumentHint` muted after the name (38 rows have one)? Keep the CLI's `(user)` and `(<plugin>)` labels? *Recommend yes to both.* Match descriptions in the filter? *Recommend no* (prior art, Enter picks row 0).
- **D6 Freshness.** *Recommend* one probe per vault per app session, plus one when an `Init` brings an unknown name. No manual refresh in v1. Edited description text stays stale until restart.
- **D7 MCP prompt descriptions.** *Recommend out of v1*: the owner has 0 prompt-providing servers, and support needs a bounded wait for `commands_changed` plus a name bridge (Issue candidate 03).

## 6. Proposed Issues

**01 Slash menu shows each command's description**
- Scope: Rust probe command and DTO, per-vault description map, row rendering after the first turn, per D2, D4, D5 and D6.
- Files: `src-tauri/src/commands/claude.rs`, `src-tauri/src/commands/claude/slash.rs` (new), `src-tauri/src/lib.rs:393-395`, `src-tauri/tests/commands/claude_slash_test.rs` (new) and `mod.rs`, `src/lib/contracts/generated/`, `src/lib/contracts/commands.ts`, `src/lib/contracts/index.ts`, `src/lib/features/claude-code/` (logic, store, service, `ClaudePanel.svelte`), `src/tests/lib/features/claude-code/`.
- Acceptance:
  - The parser returns rows from a synthetic reply line (built-in or invented names only), ignores unknown keys, and errors on an `error` subtype or missing `commands`.
  - With a fake `claude` script, the command writes one initialize line, skips hook and non-JSON lines, returns the rows and passes the hooks flag. A script that never answers is killed at the timeout and returns an error.
  - The binding `SlashCommandInfo.ts` is generated and committed, and the command is in the contracts map.
  - The lookup maps both name and alias to a description. A name missing from the map renders with no description.
  - A reply for a vault that is no longer current is dropped, and `resetClaude` clears the map.
  - An `Init` with an unknown name triggers one more fetch. The same names trigger none.
  - Rows show the collapsed, clamped description. Enter still inserts the highlighted name. `ClaudePanel.test.ts:583` is updated.
  - Nothing logs a description or the reply.
- Blocked by: D1, D2 (owner). Gate: Both.

**02 Slash menu before the first message**
- Scope: with no `Init` yet in this app session, the menu lists the probe's row names minus names with whitespace. Terminal-only names are hidden once an `Init` has given the list. The empty-state text shows only when the probe failed or is pending (D3).
- Files: `src/lib/features/claude-code/claude.logic.ts`, `claude.store.svelte.ts`, `ClaudePanel.svelte`, and their tests.
- Acceptance:
  - Before any `Init`, typing `/` lists probe names, and `(MCP)`-style names with spaces are left out.
  - After an `Init`, the list equals `Init.slash_commands` (minus terminal-only names) as today.
  - Terminal-only names from the last `Init` stay hidden after "New chat".
  - With the probe pending or failed and no `Init`, the existing empty state shows.
- Blocked by: 01, D3. Gate: frontend.

**03 MCP prompt descriptions** (only if D7 says yes)
- Scope: after the initialize reply, keep reading `system/commands_changed` for a bounded window. Map `<server>:<prompt> (MCP)` rows to `mcp__<server, chars outside [A-Za-z0-9_-] as _>__<prompt>`.
- Files: `src-tauri/src/commands/claude/slash.rs`, its test, and the frontend join with its tests.
- Acceptance:
  - A fake script that sends a `commands_changed` within the window yields its rows. One after the window is ignored without an error.
  - The bridge maps the stdio form and leaves http/sse bare names unmatched.
  - The window bounds total probe time.
- Blocked by: 01, D7. The `Ln` normalization is not read (doc rule only).

## Open questions

1. Does the `title` tooltip render in the Tauri WKWebView (only matters if D4 picks one line)? Not rendered.
2. What is the default timeout of a command hook, which bounds G2 when hooks stay on? Not looked up.
3. Does `disableAllHooks` given through `--settings` lose anything besides hook-registered commands, for example plugin mod side effects the owner relies on at session start? Only the row count was compared.
4. Will the CLI keep accepting `initialize` without the SDK, and keep the row shape? It is semi-documented (validate-source 20). An upgrade test is a manual step.
5. Should the panel ever show aliases as separate menu entries? Not asked by the owner.

## Claims to verify

1. `--settings '{"disableAllHooks":true}'` returns 125 rows in a neutral cwd, with only the `plugin`-key row missing, and no hook lines (G1).
2. A `sleep 8` SessionStart hook delays the initialize reply to about 8.3 s (G2).
3. In `<vault>` with hooks disabled: 129 rows, 4 ending `(project)`, no new entry in the vault's session dir (G3).
4. `-p "/theme"` gives a `system/init` with cost 0 and 0 tokens. Its `slash_commands` equal the row names as sets in a neutral cwd, and all 4 terminal-only names are inside it (G4).
5. MCP prompts are absent from the one-shot reply and arrive in `system/commands_changed` as `<server>:<prompt> (MCP)` with no aliases. Init names them `mcp__<server>__<prompt>` (G5).
6. All counts are from one machine with claude 2.1.325. Minified bundle names change on upgrade.
