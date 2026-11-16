# 08: Where the slash descriptions code would go (Rust and UI)

Scout 8. Research only; no repo code changed. Branch `mvp-claude` at c8b646da6, claude 2.1.325, 2026-11-15.
Paths are repo-relative unless they start with `~`. Label key: **[code]** read in the repo, **[probe]** a command I ran
(output shape only), **[bundle]** `grep -a -o` over `~/.local/share/claude/versions/2.1.325`, **[inference]** my reasoning.

## TL;DR

- Rust: a new `src-tauri/src/commands/claude/skills.rs` (pure scan + parse, no Tauri) and one thin `#[tauri::command]` in
  `commands/claude.rs`, built like `claude_status`. No new crate: `yaml-rust2` and a frontmatter reader already exist.
- The file reads need the config dir. Resolve it from the same captured login-shell env a turn runs with: `CLAUDE_CONFIG_DIR`
  if present, else `<HOME>/.claude`. That env can contain both.
- UI: change the menu row at `ClaudePanel.svelte:326-334` from one line to two (name, then a 2-line clamped muted
  description). Both existing "secondary line" lists (command palette, quick switcher) match the first line only; do the same
  in v1.
- Load: at panel mount, cached per vault in a small store, and refetch after each `Init` (the names are authoritative; the
  descriptions are a best-effort side map). Descriptions alone do not fix the empty menu before the first turn.
- Correction to the task text: there is no `status.rs`. Status lives inline in `commands/claude.rs`; the files under
  `commands/claude/` are `shell_env.rs`, `stream.rs`, `turn.rs`.

## 1. Rust: how the module is laid out today

| File | What it holds | Anchor |
|---|---|---|
| `src-tauri/src/commands/claude.rs` | module doc, `pub mod` list, `ClaudeStatus` DTO, binary resolution, the three `#[tauri::command]`s | `claude.rs:13-15` (mods), `:40-53` (DTO), `:220-234` (`claude_status`), `:242-263` (`claude_run_turn`), `:267-270` (cancel) |
| `.../claude/turn.rs` | request DTO, args, process spawn, `ClaudeRuns` | `turn.rs:32-53` (`ClaudeTurnRequest`), `:119-135` (`turn_command`), `:209-282` (`run_turn_with`) |
| `.../claude/stream.rs` | NDJSON line to `ClaudeEvent` | `stream.rs:141-151` (`init_event`) |
| `.../claude/shell_env.rs` | login-shell env capture and cache | `shell_env.rs:137-146` (`child_env`), `:171-176` (`turn_env`), `:221-249` (`ShellEnv`) |

Registration: `commands/mod.rs` lists `pub mod claude;`; commands go in `lib.rs:393-395` (`commands::claude::claude_status`,
`claude_run_turn`, `claude_cancel_turn`) and managed state at `lib.rs:325-326`.

Convention to copy, from `claude_status` (`claude.rs:220-234`): the command is a thin async wrapper, the work is a pure
`*_with(...)` function that takes its inputs as arguments (env, shell, candidates, timeout), and the wrapper runs it in
`tokio::task::spawn_blocking`. `history.rs:57-65` does the same for blocking work. Tests then call the `*_with` function from
`src-tauri/tests/commands/claude_*_test.rs` with `tempfile::TempDir` (dev-dependency, `Cargo.toml:105`) and no Tauri; the files
are registered in `src-tauri/tests/commands/mod.rs`.

Proposed shape [inference]:

```
commands/claude/skills.rs   pub fn read_slash_entries(config_dir: &Path, vault: &Path) -> Vec<SlashEntry>   (pure, tested)
commands/claude.rs          #[tauri::command] claude_slash_entries(shell_env, vault_path) -> Result<Vec<SlashEntry>, String>
                            (env = turn_env(shell_env.get(), &clean_base(std::env::vars_os())), as at claude.rs:252)
src-tauri/tests/commands/claude_skills_test.rs
```

Put `pub mod skills;` at `claude.rs:13-15`, register at `lib.rs:393-395`, add the test module to `tests/commands/mod.rs`.

## 2. Rust: config dir, HOME and the captured env

- A turn child runs with exactly `env.vars` after `env_clear()` (`turn.rs:120-125`), and the status check does the same
  (`claude.rs:82-88`). So the CLI resolves its config dir from that env, not from the app's.
- `child_env` keeps every captured variable except `PWD OLDPWD SHLVL _ CLAUDECODE` and the four injected names
  (`shell_env.rs:60`, `:137-146`). A `CLAUDE_CONFIG_DIR` exported by the user's rc files therefore reaches the child.
  `HOME` is in `BASE_NAMES` (`shell_env.rs:46`), is part of the capture's starting env (`:182`, `:311`) and is printed by `env -0`.
- The fallback env (capture failed) is `clean_base` plus a new PATH (`shell_env.rs:88-98`, `:151-167`): it keeps `HOME` but
  drops `CLAUDE_CONFIG_DIR`. Same loss for the child, so reading with `TurnEnv.vars` stays consistent with the CLI in both cases.
- Existing code reads `std::env::var_os("HOME")` from the app's own env, but only to build install-path candidates
  (`claude.rs:229`, `:253`). Do not reuse that for the config dir: an app started from Finder has no rc exports.
- How the CLI picks its config dir: [bundle] `grep -a -o 'process.env.CLAUDE_CONFIG_DIR[^;]\{0,80\}'` finds
  `process.env.CLAUDE_CONFIG_DIR||Mt(Mc(),".claude")` (21 mentions of the variable in the binary). So the rule is
  `CLAUDE_CONFIG_DIR` else `<home>/.claude`. UNVERIFIED: whether `Mc()` is `os.homedir()` (which on Unix prefers `$HOME`) or
  something else, and whether a `settings.json` `env` block can also move the config dir (a helper
  `_6e(e){let n=e==="CLAUDE_CONFIG_DIR"?fut():process.env[e]` special-cases the name).
- Login-shell research already notes the keychain entry is keyed to `CLAUDE_CONFIG_DIR`
  (`.scratch/claude-code-integration/research/login-shell-env/01-claude-code-side.md:200`), which is why the env must be the
  captured one.
- The command must not trigger a second capture cost: `claude_status` on mount already calls `shell_env.get()`
  (`claude.rs:228` through `status_env`, `shell_env.rs:243`), and the cache holds one result for the app run. `get()` blocks
  while a capture runs (up to `CAPTURE_TIMEOUT`, 10 s, `shell_env.rs:29`), so the new command needs `spawn_blocking` too.

## 3. Rust: YAML and frontmatter, nothing new to add

- `Cargo.toml:44`: `yaml-rust2 = { version = "0.13", default-features = false }`. Used only by `src-tauri/src/vault/parsing.rs:26-27`.
- `vault::parsing::parse_frontmatter(content: &str) -> BTreeMap<String, serde_json::Value>` (`parsing.rs:588`) already handles
  the leading `---` block, quoted scalars and block scalars (`|`, `>`; module comment `parsing.rs:555-573`), returns an empty map
  when there is none and "never panics". The commands module can import it (`vault` is a core dir; the ratchet only forbids Tauri
  imports inside core, `src-tauri/tests/core_tauri_free_test.rs:1-30`).
- Rejected blocks fall back to a line subset parser (`parsing.rs:618-631`, `:861-`) that splits each top-level line at its
  first `:` (`:882-886`). That matters because an unquoted `description: Use when: x` is invalid YAML. UNVERIFIED: the exact value the
  fallback returns for such a line (trimming, quote handling); a Rust test with that input pins it.
- [probe] Shape of the user's own skills (structure only, `~/.claude/skills`): 44 `SKILL.md` files, all 44 have a `description`
  key; 33 plain scalars, 10 quoted, 1 block scalar; 0 plain values containing `: `; 0 CRLF files; first-line value length min 1,
  median 149, max 1016 characters. So expect long prose, a few quoted and block forms.
- Bound the read: skill bodies can be large and private. Read only the head of each file (the frontmatter is at the top), parse it
  with `parse_frontmatter`, return `name` and `description` only, and cap the description length in Rust so the IPC payload stays
  small. Do not `debug_log` descriptions or file text (they are the owner's content); log counts and the config dir only.

## 4. Rust: DTO and IPC conventions

- DTO derive pattern: `#[derive(Debug, PartialEq, Serialize, ts_rs::TS)] #[ts(export)] #[serde(rename_all = "camelCase")]`
  (`claude.rs:40-42`, `turn.rs:56-58`); doc comments on the struct and every field (they become JSDoc in the generated file);
  `Option<T>` with `#[ts(optional)]` only on input DTOs (`turn.rs:42-44`), while output DTOs use plain `Option` (`claude.rs:48`).
- ts-rs is pinned `=12.0.1` (`Cargo.toml:38`); `cargo test` writes `src/lib/contracts/generated/` per `.cargo/config.toml:28`
  (`TS_RS_EXPORT_DIR`, `TS_RS_IMPORT_EXTENSION = "js"`). Generated files for claude today: `ClaudeEvent.ts`,
  `ClaudeEventPayload.ts`, `ClaudeStatus.ts`, `ClaudeTurnRequest.ts` [probe: `ls`].
- Frontend wiring for a new command: re-export in `src/lib/contracts/index.ts:9-10`, import and add the entry to the command
  map near `src/lib/contracts/commands.ts:225-229`, and add the argument names to the list at `commands.ts:335-337`.
- Per `CLAUDE.md` an IPC DTO change is a "Both" change: `cargo test`, `pnpm check` and `pnpm vitest run`, committing the
  regenerated bindings. Per the project rules the Rust test needs happy path, empty input and error cases.
- Alternative for the Init event: `Init` currently carries only `session_id`, `model`, `slash_commands`, `skills`
  (`stream.rs:141-151`), and the raw `system/init` line also has `plugins` as objects with keys `name`, `path`, `source` and
  `skills` as plain strings [probe: key names and types of the capture in
  `.scratch/claude-code-integration/research/stream-json-capture/turn.ndjson`, whose `slash_commands` and `skills` are string
  lists and whose skills are a subset of the slash commands]. Adding `plugins[].path` to `Init` would give the scan the plugin
  directories the CLI actually loaded, without parsing `installed_plugins.json`. This is a second DTO change; the other scouts
  decide whether plugin descriptions are in scope.
- No process spawning is needed for a file scan. The spawn helpers exist if some CLI subcommand turns out to print
  descriptions: `run_with_timeout` (`claude.rs:314-338`, short output, killed on timeout) and `turn_command`
  (`turn.rs:119-135`, env-cleared, own process group). UNVERIFIED that such a subcommand exists; I did not look for one.

## 5. Rust: what the scan needs to decide (hand-off to the other scouts)

These are not mine to answer; the scan cannot be written until they are:
- Roots: `<config>/skills/*/SKILL.md`, `<config>/commands/**/*.md`, `<vault>/.claude/skills`, `<vault>/.claude/commands`, plugin
  dirs. [probe] counts: `~/.claude/skills` has 46 entries, `~/.claude/commands` has none, and `<vault>/.claude` holds
  `skills`, `plugins`, `settings.json`, `settings.local.json`, `CLAUDE.md`, `README.md`, `docs`.
- Name derivation: skill name from the `name` key or the directory name; command name from the file stem, with sub-folders and
  plugin namespaces. UNVERIFIED; the names must equal the strings in `Init.slash_commands` or the join misses.
- Built-in commands have no files; their descriptions would be a static table in Rust or the frontend (names only otherwise).
- Many skill entries are likely symlinks; `std::fs::metadata` follows them, `symlink_metadata` does not. Pick the first.
- Privacy: the command reads outside the vault, unlike `files.rs:31` which confines reads through
  `vault_fs::validate_vault_path` (`src-tauri/src/utils/fs.rs:62`). Use `validate_vault_path` for the vault-local roots, and
  document that the config-dir read is deliberate (ADR 0038: skills "loaded as in the terminal").

## 6. UI: the slash menu today

- The menu is rendered inside the prompt wrapper: `ClaudePanel.svelte:323-341`. Container `absolute bottom-full left-0 right-0 mb-1
  max-h-48 overflow-y-auto`; each row is `<button class="block w-full truncate px-2 py-1 ...">/{name}</button>` (`:326-334`).
  Empty state text is at `:336-338` and reads "Slash commands load after the first message." when the list is empty.
- Data: `slashCommands: string[]` in the chat state, replaced on every `Init` (`claude.logic.ts:124`) and kept across New chat
  (`claude.logic.ts:104-107`); exposed by `claude.store.svelte.ts:26`. Filter: `filterSlashCommands` (`claude.logic.ts:206-211`),
  prefix matches first, then substring, both on the name; the query is one token without spaces (`slashQuery`, `claude.logic.ts:200-203`).
  Derived at `ClaudePanel.svelte:61-62`. Enter and Tab pick `slashMatches[slashIndex]` (`:155-158`), `slashIndex` resets to 0 on input (`:125-128`).
- Width budget: the menu spans the wrapper inside `p-3` (`ClaudePanel.svelte:266`), so at a 290 px sidebar it is 290 - 24 = 266 px
  and 250 px after `px-2` [arithmetic, [inference]]. The sidebar is a percent pane, `minSize={3} maxSize={30}`
  (`AppShell.svelte:283-285`), default `rightSidebarSize: 3` (`settings.store.svelte.ts:73`), so the 290 px is the owner's figure,
  not something the code fixes. Text tokens: row 14 px / 20 px, meta 12 px / 16 px (`src/app.css:94-99`). At 12 px roughly 40
  characters fit per line [estimate, not measured]. Against a median description of 149 characters (section 3), one truncated
  line shows about a quarter of a typical description.

## 7. UI: how the palette and switcher render a secondary line

- `command-palette/CommandPalette.svelte:56-60`: `div.flex.flex-col.gap-0.5` with `<span>{label}</span>` over
  `<span class="text-xs text-muted-foreground">{category}</span>`; shortcut on the right (`:61-63`).
- `quick-switcher/QuickSwitcher.svelte:85-92`: same two-line stack, the second line is the vault-relative path in
  `text-xs text-muted-foreground`.
- Both use `Command.Dialog` with `shouldFilter={false}` (`CommandPalette.svelte:40-45`, `QuickSwitcher.svelte:63-69`), so ranking is
  entirely theirs. The secondary line is display only: the palette fuzzy-matches `cmd.label` (`command-palette.logic.ts:24`), the
  switcher fuzzy-matches `file.nameWithoutExt` (`file-entries.logic.ts:53`). Neither searches category or path.
- `src/lib/components/ui/command/command-item.svelte` is a bits-ui item with `px-2 py-1.5 text-sm`; the slash menu is not
  built on it (plain buttons with `role="option"`), and nothing requires moving it onto it.
- Precedent for clamping: `line-clamp` is used in `event-calendar/EventBlock.svelte`, `EventPopover.svelte` and
  `search/SearchResult.svelte` (Tailwind `^4.3.5`, `package.json:104`). `title=` tooltips are used on the panel's chips
  (`ClaudePanel.svelte:269`, `:281`). UNVERIFIED that a native `title` tooltip shows in the Tauri WKWebView; no test covers it.

## 8. UI recommendation

Row layout (two lines, like both precedents), keeping the existing data attributes and ARIA:

```
<button class="block w-full px-2 py-1 text-left ..." role="option" data-claude-slash-option={name} title={description}>
  <span class="block truncate">/{name}</span>
  {#if description}<span class="line-clamp-2 text-meta text-right-sidebar-muted-fg">{description}</span>{/if}
</button>
```

- Height: a described row is 8 + 20 + 2 x 16 = 60 px (44 px with a 1-line clamp, 28 px without a description, today). With
  `max-h-48` (192 px) the menu shows about 3 described rows instead of about 7 names. Raise to about `max-h-64` (256 px, about 4
  rows) or use `line-clamp-1` and keep 6 rows. Tradeoff: 2 lines shows about 80 characters; 1 line about 40 and the tooltip.
  I would take 2 lines and `max-h-64`; the panel is tall (it is a full-height sidebar), the menu opens upward and only while `/` is typed.
- Rows without a description render as today, so a failed or partial scan degrades to the current menu. The first-turn empty
  state at `:336-338` is unchanged.
- Existing tests that break and must be updated: `src/tests/lib/features/claude-code/ClaudePanel.test.ts:583` asserts each
  option's `textContent` equals exactly `'/review'`; seeding goes through `Init` at `:98-101`. Add tests for the described row,
  the undescribed row, and that Enter still inserts the highlighted name.
- Logic: `filterSlashCommands` takes `readonly string[]` (`claude.logic.ts:206`). Keep it on names and map names to
  descriptions at render with a `Map<string, string>`, so `claudeStore.slashCommands` stays `string[]` and the Init reducer and
  its tests do not change. Store the map in a new small store (or a field in `claude.store.svelte.ts`) with a getter and its own test.

### Should filtering match descriptions?

Recommendation: no in v1.
- Both precedents match the label only (section 7).
- Descriptions are long prose (median 149 characters); a substring query such as `rev` hits unrelated descriptions, and the menu
  has up to 126 slash commands in the owner's setup (`spec.md` verified-behavior section).
- Enter and Tab pick the highlighted row (`ClaudePanel.svelte:155-158`), so a noisy result changes what Enter inserts unless the
  order guarantees a name match first.
- The query is one whitespace-free token (`claude.logic.ts:200-203`), so description search would be single-word substring only.
- If wanted later: add a third group after prefix and name-substring in `filterSlashCommands` (`claude.logic.ts:206-211`), only for
  queries of 3 or more characters. Name matches keep indexes 0..n, so the default Enter pick is unchanged.

## 9. When to load

- Mount: the panel effect at `ClaudePanel.svelte:79-84` runs `checkClaudeStatus` once per mount inside `untrack()`
  (project rule: services in `$effect` go through `untrack`). The panel remounts when a canvas, kanban or view tab hides the sidebar
  (comment at `:74-77`), so a fetch there needs a cache or it reads the disk on every tab switch.
- Cache key: the vault, because `<vault>/.claude/...` roots differ per vault. Use `normalizeVaultPath`
  (`claude.logic.ts:213-216`), the same key the runner uses. Clear it with the chat on vault close: `resetClaude`
  (`claude.service.ts:77-86`) already calls `claudeStore.reset()`. Issue 09 (stale run after a vault switch) is still open
  (`spec.md` issues table), so a response that arrives after a vault change must be dropped by comparing the vault path it was
  requested for.
- Refresh: each turn starts a new `claude` process, and the CLI re-reads its skills and commands then; the app learns the new name
  list on every `Init` (`claude.logic.ts:124`). Refetch descriptions after an `Init` whose name list differs, or simply after every
  `Init`, fire and forget, replacing the map in one assignment. The scan is a bounded read of the head of about 100 small files
  (the user's own skill dir has 44); I did not time it. A user who edits a `SKILL.md` between turns then sees the new text on the
  next turn.
- Before the first turn: the menu is empty because names come only from `Init` (`:336-338`). Descriptions loaded at mount do
  not change that. Listing names before the first turn would need the Rust scan to return names too (user, vault and plugin skills
  and commands, but no built-ins or MCP prompts), which gives an incomplete list that later jumps. Out of scope unless the owner asks.
- Gate: the panel mounts only when the feature is enabled and visible (`AppShell.svelte:66`), so nothing reads the config dir for
  users who have not turned the feature on.

## 10. Test plan sketch

1. Rust `claude_skills_test.rs` with `TempDir`: scan finds user and vault skills and commands; quoted, plain, block-scalar and
   invalid-YAML (`a: b: c`) descriptions; no frontmatter; unreadable and missing dirs return an empty list, not an error; description cap;
   `CLAUDE_CONFIG_DIR` wins over `HOME`; symlinked skill dir.
2. Rust: DTO field names pinned like `ipc_contracts_test.rs` pins other DTOs; `cargo test` regenerates and commits the binding.
3. Vitest: `claude.logic.test.ts` (any new pure helper), store getter test, `claude.service.test.ts` (fetch after `Init`, drop on
   vault change; `call` mocked, stores real), `ClaudePanel.test.ts` (rows, Enter, no description).

## Open questions

- Slash entry naming: do `Init.slash_commands` names equal the skill `name` key, the directory name, or `plugin:name`? The join
  depends on it (scouts on skills and plugins).
- Does the CLI resolve its config dir from `$HOME` or from `os.homedir()`, and can a settings `env` block set
  `CLAUDE_CONFIG_DIR`? (`Mc()` and `fut()` in the bundle were not traced.)
- Should built-in commands get descriptions from a static table? Who maintains it when the CLI changes?
- Is a description-only match tier wanted at all, or is names-only final?
- Is the 290 px width the typical case or the narrow case? The pane is percent-based, so the real range is wider and narrower.
- Does a native `title` tooltip render in the Tauri WKWebView? If not, the full description is not reachable from the menu.

## Claims to verify

1. `ShellEnv`'s captured env includes `HOME` and any exported `CLAUDE_CONFIG_DIR`, and the fallback env keeps `HOME` but drops
   `CLAUDE_CONFIG_DIR` (`shell_env.rs:46`, `:88-98`, `:137-146`, `:151-167`). A Rust test over `child_env` and `fallback_env` settles it.
2. `process.env.CLAUDE_CONFIG_DIR||Mt(Mc(),".claude")` is the CLI's default config dir rule (bundle grep, 2.1.325 only).
3. `vault::parsing::parse_frontmatter` returns a usable `description` for quoted, plain and `>` block scalars, and its subset
   fallback returns the text after the first `:` for an unquoted value that contains `: `.
4. No `status.rs` exists; status is inline in `commands/claude.rs` (`ls src-tauri/src/commands/claude/` shows three files).
5. Both the command palette and quick switcher match the first line only (`command-palette.logic.ts:24`, `file-entries.logic.ts:53`).
6. The only existing test that asserts the slash option's exact text is `ClaudePanel.test.ts:583`.
7. A described row is 60 px with a 2-line clamp at `text-meta`, and about 40 characters fit per 12 px line at 250 px. Estimates, to
   check with a rendered screenshot at the real width.
8. The user's skills first-line description statistics in section 3 (44 files, median 149, max 1016) describe one machine only.
