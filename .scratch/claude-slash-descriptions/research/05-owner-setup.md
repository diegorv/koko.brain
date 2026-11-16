# 05 - Inventory of the owner's real skills and commands

Scope: how the owner's real setup looks on disk, so the slash-description feature (A) is designed against real shapes. Counts and shapes only. No skill or command names of the owner's own entries, no description text. Plugin counts are anonymous.

Paths: `~` is the home dir, `<vault>` is the owner's main vault. Date of the inventory: 2026-11-15.

## Method and limits

- Listed only: `~/.claude/skills`, `~/.claude/commands`, `~/.claude/plugins` (`installed_plugins.json`, `known_marketplaces.json`, cache layout), `<vault>/.claude/skills`, `<vault>/.claude/commands`, and the `enabledPlugins` key of `~/.claude/settings.json` (count only). Plugin skill files were read through the `installPath` values recorded in `installed_plugins.json`.
- Commands run: `ls -la` on those dirs, `find ... -name SKILL.md` with `-maxdepth` 3 inside `~/.claude/skills/synced`, and `python3 -I` scripts (kept in `/tmp`, not committed) that parse frontmatter and print aggregates.
- The frontmatter parser is a small regex reader, not a YAML library (`pyyaml` is not installed: `import yaml` failed). It reads `key: value`, quoted values, `|` / `>` block indicators and indented continuation lines. Numbers below are character counts of the value after unquoting.
- Not read: `<vault>/.claude/settings*.json` and project `settings.json` files (outside the named paths). So which project-scoped plugins the vault enables is UNVERIFIED.
- No `claude` process was started, so the live `system/init` lists were not re-captured here. The spec's totals are quoted from the spec (see "Reconciliation").

## 1. Entries by source

| Source | Path | Entries | Notes |
|---|---|---|---|
| User skills | `~/.claude/skills/<name>/SKILL.md` | 44 | 42 are symlinks, 2 are real dirs |
| Vault skills | `<vault>/.claude/skills/<name>/SKILL.md` | 4 | real dirs; one has 2 files, the others 1 |
| User commands | `~/.claude/commands` | 0 | dir does not exist (`ls`: No such file or directory) |
| Vault commands | `<vault>/.claude/commands` | 0 | dir does not exist |
| Plugin skills (enabled at user level) | `<installPath>/skills/<name>/SKILL.md` | 19 | from 6 plugins |
| Plugin commands (enabled at user level) | `<installPath>/commands/*.md` | 4 | from 1 plugin; flat, no subdirs |
| **Total with a description-bearing file** | | **71** | 67 skills + 4 plugin commands |

Entries in `~/.claude/skills` that are not a skill dir with a `SKILL.md` (2 of 46 entries):

- 1 symlink named `skills` that points back to `~/.claude/skills` itself (absolute target). A recursive walk that follows symlinks would loop on it. `ls -la` shows `skills -> ~/.claude/skills`.
- 1 real dir `synced` with no `SKILL.md` at its top. Below it there are 13 `SKILL.md` files at depth `synced/<dir>/<name>/SKILL.md` (`find ~/.claude/skills/synced -maxdepth 3 -name SKILL.md`: 13 hits, all with 4 path components). A scan that reads only `~/.claude/skills/<name>/SKILL.md` does not see them. Whether the CLI lists them is UNVERIFIED (not checked in the bundle here).

Symlink shapes in `~/.claude/skills`: 42 relative links of the form `../../.agents/skills/<same name>`, 1 self-loop (above), 0 broken links (every link resolves, checked with `os.path.exists`). `~/.agents/skills` holds 43 dirs (count only), so one dir there has no link.

### Plugins

- `installed_plugins.json`: top keys `version` (value 2) and `plugins`. 19 plugin ids, 28 install entries (an id has one entry per scope/project). 15 entries have scope `user`, 13 have scope `project`. Entry keys: `scope`, `projectPath` (project only), `installPath`, `version`, `installedAt`, `lastUpdated`, `gitCommitSha` (25 of 28), `sourceCommand` and `sourceProducerPath` (3 of 28). All 28 `installPath` dirs exist.
- 3 of the 13 project entries have `projectPath` equal to `<vault>` (compared by realpath). The other 10 point to other projects and do not apply to the vault.
- `known_marketplaces.json`: 11 marketplaces; entry keys `source`, `installLocation`, `lastUpdated`, `autoUpdate`; source kinds: 9 `github`, 2 `directory`. Plugin ids are `<plugin>@<marketplace>` (all 19 contain `@`), spread over 11 marketplaces (per-marketplace counts: 6, 3, 2, then eight with 1).
- `~/.claude/settings.json` `enabledPlugins`: 14 keys, 13 `true`, 1 `false`. Every key is an installed id. 5 installed ids are not in `enabledPlugins` at all.
- Cache layout: `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`. 37 marketplace dirs, 25 of them empty; 231 version dirs, of which 113 carry an `.orphaned_at` marker and 99 an `.in_use` marker (`ls -d .../*/*/*/.orphaned_at | wc -l`). So the cache holds many stale versions; only the `installPath` recorded in `installed_plugins.json` is current. The reader must go through `installed_plugins.json` and not walk the cache.
- Skills dir layouts seen across the 28 install paths: `skills/<name>/SKILL.md` (the common case), `skills/<category>/<name>/SKILL.md` (one plugin, 38 skills in 4 category dirs, user scope, not in `enabledPlugins`), plus tool-specific copies under `.claude/skills`, `.cursor/skills` and `cli/assets/skills` that are not plugin-loaded paths. One plugin cache has 56 `SKILL.md` files and 5 commands but is `enabled: false`, so none of it loads.
- `plugin.json` (`.claude-plugin/plugin.json`) can override discovery: of the 13 enabled plugins' manifests, 2 declare `skills` (one as a string path, one as a list of 27 entries), 1 declares `commands` (a list of 4), 1 declares `agents` (a list of 3). Key sets seen: `author,description,name,version` (3), none at all (2), several larger sets. A reader that only lists `skills/*/SKILL.md` can miss entries that a manifest points elsewhere. Which manifest field the CLI honors is UNVERIFIED here.
- Of the 13 enabled plugins, 7 contribute no skill and no command (MCP servers or hooks only). Skill counts per contributing plugin: 7, 7, 2, 1, 1, 1. Command count: one plugin with 4 (and 1 skill).
- The 3 vault-scoped project entries: 0 `SKILL.md` and 19 command files in total (17, 2, 0). They are absent from the user-level `enabledPlugins`, so whether they load in the vault depends on settings I did not read (UNVERIFIED). If enabled, they add up to 19 commands.

## 2. Frontmatter and description coverage

All 71 entries have a frontmatter block and a non-empty `description`. No entry lacks one. (Command files in the 4 plugin commands have no `name:` key; their name comes from the file name.)

| Source | n | with description | without | name key present | name != folder |
|---|---|---|---|---|---|
| User skills | 44 | 44 | 0 | 44 | 0 |
| Vault skills | 4 | 4 | 0 | 4 | 0 |
| Plugin skills | 19 | 19 | 0 | 19 | 0 |
| Plugin commands | 4 | 4 | 0 | 0 (4 files, name from file) | n/a |

Frontmatter key sets, user skills (44): `name,description` 16; `name,description,disable-model-invocation` 19; `name,description,disable-model-invocation,argument-hint` 4; `name,description,metadata` 3; `name,description,license,metadata` 2. So 23 of 44 set `disable-model-invocation` and 4 have `argument-hint`. Vault skills: all 4 are `name,description`. The only keys that matter for the autocomplete are `name`, `description` and optionally `argument-hint`.

Anything a naive parser could trip on (counts, by source):

| Shape | User | Vault | Plugin skills | Plugin cmds |
|---|---|---|---|---|
| Plain inline scalar | 33 | 4 | 11 | 4 |
| Quoted scalar (`"` or `'`) | 10 | 0 | 8 | 0 |
| Folded block (`>`) | 0 | 0 | 0 | 0 |
| Literal block (`\|`) | 1 | 0 | 0 | 0 |
| Plain multi-line (continuation without indicator) | 0 | 0 | 0 | 0 |
| Descriptions containing a newline | 1 | 0 | 0 | 0 |

- The one literal-block description (user skill): indicator `|`, 5 continuation lines, 341 chars after joining, and the joined value contains newlines. A single-line menu row has to collapse whitespace.
- One user skill uses a double-quoted scalar with `\"` escapes (the only backslash escape seen, in 1 file). A reader must unescape it.
- One vault skill (of 4) has an unquoted plain scalar that contains `: ` (at char offset 52 of 267). Strict YAML rejects a plain scalar with `: ` inside (a mapping value is not allowed there), so a YAML library may throw or drop the key on that file, while a line-based reader gets the full text. How the CLI itself reads it is UNVERIFIED. This is a real example for the parser's fallback test.
- No BOM, no CRLF in any of the 71 files (`startswith("﻿")` and `"\r\n"` checks). No duplicate `description:` key in any file.
- No file lacks a closing `---`.

## 3. Description length distribution (characters)

| Source | n | min | median | p90 | max | > 250 | > 500 | > 1024 |
|---|---|---|---|---|---|---|---|---|
| User skills | 44 | 27 | 149 | 378 | 1016 | 8 | 2 | 0 |
| Vault skills | 4 | 217 | 279.5 | 401 | 401 | 3 | 0 | 0 |
| Plugin skills | 19 | 46 | 275 | 439 | 772 | 11 | 2 | 0 |
| Plugin commands | 4 | 56 | 85.5 | 126 | 126 | 0 | 0 | 0 |
| **All** | **71** | **27** | **180** | **403** | **1016** | **22 (31%)** | **4** | **0** |

Percentile method: sorted values, index `round(0.9 * (n - 1))`. Length buckets for the user skills: <= 100: 15, 101-250: 21, 251-500: 6, 501-1000: 1, > 1000: 1. For plugin skills: <= 100: 1, 101-250: 7, 251-500: 9, 501-1000: 2.

Reading: almost a third of descriptions are longer than 250 chars and the longest is 1016, so a menu row needs a clamp (CSS line clamp or a character cut with an ellipsis). A native tooltip or a detail pane can hold the full text. The median (180) fits in about two lines at a normal panel width. Whether the CLI applies its own cap to descriptions in its listings is UNVERIFIED (not searched in the bundle in this task).

## 4. Names across sources

- Same folder name in more than one source (user, vault, plugin): 0.
- Same bare skill name in more than one plugin: 0. Same bare command name in more than one plugin: 0.
- A user skill whose name equals a plugin skill's bare name: 0.
- Folder name vs frontmatter `name`: 0 mismatches in all 67 skills.
- So on this setup the name-collision rules (user vs project vs plugin precedence) never trigger. The design still needs a rule for collisions, since other users and the owner's future setup can have them. The skills listed in this session's own skill menu show plugin skills namespaced as `<plugin>:<skill>` (for example the `ai-memory:` and `seecode:` rows), while user and vault skills are bare names. So the `slash_commands` entry of a plugin skill is `<plugin>:<skill>` and the description lookup key must carry the plugin prefix, not the folder name alone. Evidence: the "available skills" list of this session (Claude Code context, not a file).

## 5. Reconciliation with the spec's init counts

- Spec: "With the owner's setup: 126 slash commands, 88 skills, 133 tools" (`.scratch/claude-code-integration/spec.md:21`).
- Disk inventory above: 67 skill dirs (44 user + 4 vault + 19 plugin) plus 4 plugin commands, for a cwd at `<vault>` with only user-level plugins counted. That is 21 fewer skills than 88 and far fewer than 126 commands. The gap is not explained by this inventory. Candidate explanations, none verified: skills bundled inside the CLI binary (this session's skill menu shows about a dozen with no folder on disk, such as `init`, `simplify`, `loop`), the 19 commands of the vault-scoped project plugins if enabled, built-in slash commands that are not skills, and project-level settings I did not read.
- The captured `turn.ndjson` is not from the owner's setup: its `system/init` has 3 `slash_commands`, 1 `skills`, 3 `agents`, 1 `plugins`, 4 `terminal_slash_commands` (parsed with `json.loads`, counts only). Both `slash_commands` and `skills` are arrays of plain strings (type `str`), with no description field. So the stream gives names only, and every description must come from disk. In that capture `skills` is a subset of `slash_commands` (1 of 1) and the init plugin entry keys are `name`, `path`, `source`.

## 6. Implications for feature A

1. Source of truth is the filesystem, not the stream: `system/init` carries only name strings (capture above, plus `spec.md:21`).
2. Four places to read: `~/.claude/skills/*/SKILL.md`, `<vault>/.claude/skills/*/SKILL.md`, `<installPath>/skills/*/SKILL.md` and `<installPath>/commands/*.md` for each enabled plugin entry. Plugin paths come from `installed_plugins.json` (scope `user` entries, plus `project` entries whose `projectPath` equals the vault), filtered by `enabledPlugins`.
3. Follow symlinks one level (42 of 44 user skills are links) but never recurse into the self-loop.
4. Key plugin items as `<plugin name>:<skill>`; command files take their name from the file name (4 of 4 have no `name:`).
5. Parser needs: quoted-scalar unescape, `|` and `>` blocks, whitespace collapse, and a tolerant path for a plain scalar with `: ` inside (1 of 71 files today).
6. Descriptions are always present on this setup, but the code still needs an empty fallback (name only) for foreign setups.
7. Clamp long descriptions: 31% exceed 250 chars, max 1016.
8. Nested or manifest-declared layouts exist (category dirs, `plugin.json` `skills` as string or list). The simple `skills/*/SKILL.md` scan covers the 19 enabled plugin skills found here, which matches the name counts in this session's skill menu for those plugins (UNVERIFIED as a one-to-one match, not compared name by name).

## Open questions

- Does the CLI list the 13 skills under `~/.claude/skills/synced/<dir>/<name>/`? A one-level scan would not, and no check against the bundle was done.
- Which of the 3 vault-scoped project plugins are enabled for the vault (project `settings.json` not read)? That decides whether 19 plugin commands show up.
- What explains 88 skills and 126 slash commands in the spec versus 67 skills and 4 commands on disk? Needs a fresh `system/init` capture from the vault with counts by source.
- How does the CLI parse the unquoted description with `: ` inside (1 vault skill)? Its own listing would show whether it truncates at the colon, keeps the whole value, or drops the entry.
- Does the CLI cap description length in its own menus (so the panel should match it)?
- Which `plugin.json` fields (`skills` string vs list, `commands`) does the CLI honor, and should the reader do the same?

## Claims to verify

1. 71 entries (67 skills, 4 plugin commands) were found, all with a `description`, none without. Re-run a parse over `~/.claude/skills`, `<vault>/.claude/skills` and the 13 enabled plugins' install paths.
2. Description lengths: median 180, p90 403, max 1016 over those 71 (22 above 250 chars). Depends on my regex parser; a YAML library may differ on the quoted, literal and colon cases.
3. Exactly one literal-block description, one `\"`-escaped description and one plain scalar containing `: ` exist; no folded block, no plain multi-line value.
4. `~/.claude/commands` and `<vault>/.claude/commands` do not exist, so every command comes from plugins.
5. Zero name collisions across user, vault and plugin sources, and zero folder-vs-`name` mismatches.
6. `~/.claude/skills` contains a symlink to itself, and a `synced` dir that hides 13 `SKILL.md` files two levels down.
7. Of 28 plugin install entries, 3 are scoped to the vault, 13 enabled ids are in `enabledPlugins` (14 keys, 1 false), and 113 of 231 cache version dirs are marked `.orphaned_at`.
8. The `system/init` of the capture holds names only (arrays of strings), so no description is available from the stream.
