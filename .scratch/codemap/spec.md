# Code map (`codemap/`): final implementation spec

Verified against commit `cbe67cb28` in the worktree `.claude/worktrees/architecture-deterministic`. This spec replaces spec-v1 and spec-v2 and stands alone: an engineer needs no other design file. It applies the binding owner decisions (`owner-decisions.md`), the research digest, and the resolution of both critiques of spec-v2 (section 19). Probes that only read the repo: `/tmp/codemap-probe-v2/`, `/tmp/codemap-probe-aiu/`, `/tmp/codemap-probe-impl/`, `/tmp/codemap-probe-final/` (`wrappers.mjs`, `paramdelay.mjs`, `rm.mjs`).

## Contents

The file is about 95 KB, over one Read call: read it by section with offset and limit.

1. Reader and hard rules
2. Measured facts
3. Decisions
4. Identifiers
5. Output layout, budgets and caps
6. Line grammar
7. Extraction rules (F1 to F21)
8. Tracked and not tracked
9. Query CLI
10. `INDEX.md` template
11. Generation, CI, freshness, branch safety
12. Removals and edits outside the generator
13. Ordering and determinism
14. Tests
15. Implementation order (test-first)
16. Evaluation plan
17. Out of scope
18. Not checked and risks
19. Critique resolution
20. Owner questions

## 1. Reader and hard rules

The only reader is an AI coding agent (Opus orchestrators, Sonnet and Haiku sub-agents, Codex) asked to change one or several parts of the app. It must find the code to read without reading everything. The agent interprets the user's words; the map describes structure only. There is no keyword, term or UI-string index.

The map holds files, symbols (exported and file-local), imports, calls, IPC commands, events, DTOs, store reads and writes, side effects (disk, host APIs, timers, reactive effects, DOM listeners, database writes, spawns), registries and facets, and tests. Every fact has an exact `path:line` and is reachable from both ends.

Hard rules:
- Every output byte comes from code by a fixed rule. No LLM, no network, no hand-written or curated text in the output.
- Text copied from code: doc comments (JSDoc description, Rust `///` and `//!`) as a first sentence (D3), plus short code excerpts that a rule names (signatures, timer delays, call arguments). No rule asks anyone to write comments.
- Every other string is a generator template: tags, the line grammar, the blind-spot list, CLI help.
- No HTML, no Mermaid, no Markdown links, tables or emphasis.
- Same input tree gives the same bytes.
- The map leads to code. Each fact has a `path:line` the agent can Read.

## 2. Measured facts

| Fact | Count | Source |
|---|---|---|
| Exported declarations (`src/lib` + `src/routes`, without `components/ui`, `contracts/generated`) | 2399, 2300 with JSDoc | spec-v1 |
| Carded production files: TS/Svelte / Rust | 582 / 62 | v2 `probe.mjs` |
| Files parsed: `src/lib` / `src/routes` / `src/tests` / `e2e` / `src-tauri/tests` | 725 / 5 / 652 / 129 / 47 | v2 |
| Store objects (exported const object literal with a getter) | 43 of 43 store files, 225 getters, 0 setters | v2, impl `ts.mjs` |
| `#[tauri::command]` = `generate_handler!` entries / production `call('<literal>')` sites | 72 / 117 (max 9 per command, `get_all_vault_entries_v2`) | v2, grep |
| `*_EVENT` consts = `EVENT_NAMES` entries / Rust emit lines | 9 / 19 | v2 |
| `#[ts(export)]` types = generated files | 51 | spec-v1 |
| Internal import statements / bindings / resolved by F3 | 6153 / 10547 / 97.2% (rest: package re-exports and `components/ui` index re-exports fixed by F3 rule 3) | v2 |
| Same-file calls of top-level TS functions / non-exported top-level fns / files with such calls | 2373 / 1225 / 253 | aiu `samefile.mjs` |
| Distinct (enclosing fn, target) call pairs, production TS/Svelte | 5022, 646 KB as `call` lines, card median 364 B, p95 4.8 KB, max 31.6 KB `src/lib/features/event-calendar/event-calendar.service.ts` (210 pairs), next 16.4 KB `src/lib/app/lifecycle/app-lifecycle.service.ts` | aiu `calls.mjs` |
| Imported non-store, non-component bindings used only in Svelte markup | 190 (fn/value bindings) to 243 (all non-ui) | aiu `markup.mjs`, impl `ts.mjs` |
| Markup calls of a store `do` member (writes) | 107 (e.g. `src/lib/app/AppShell.svelte:220` `settingsStore.updateLayout`) | impl `ts.mjs` |
| `$effect` sites reading a store member directly / `$derived` likewise | 54 of 117 / 160 of 371 | aiu `effects.mjs` |
| `<svelte:window|document|body on…>` files | 4 (`SettingsPanel.svelte`, `EventPopover.svelte`, `Rail.svelte`, `src/routes/composer/+page.svelte`) | grep |
| F11 sinks / sinks with no exported `read-by` | 25 / 21 (local read-by: `onFileChange`, `registerTabCloseListener`, `registerDeepLinkAction`; getter read-by: six `railRegistryStore.register*`, `noteActionBarActionsStore.register`) | aiu `sinks.mjs` |
| Exported TS fns containing a timer / of those whose delay argument is one of their own parameters | 14 / 1 (`src/lib/utils/debounce.ts:debounce`, `:38` and `:40`) | final `wrappers.mjs`, `paramdelay.mjs` |
| `debounce(` call sites in production | 5 (`tags.service.ts:90`, `editor.service.ts:276`, `:279`, `app-lifecycle.service.ts:514`, `TypesNavigator.svelte:88`) | final `wrappers.mjs` |
| Rust: `use` statements inside `#[cfg(test)]` bodies / file edges that exist only because of them | 59 / 35 (e.g. `commands/debug.rs:47` `use super::*` misresolved to `commands/mod.rs`) | impl `rusttest.mjs`, `rustedges.mjs` |
| Rust pub impl methods / crate-unique names / `.name(` sites on unique names / `Type::name(` sites | 62 / 52 / 97 / 23 | aiu `rustmethods.mjs` |
| Rust impl headers with generic args after the type | 1 (`src-tauri/src/semantic/update_plan.rs:28` `impl UpdatePlan<'_>`) | impl |
| Grouped importer lines over 1000 chars under spec-v2's rule | 5 (max 1381, `vault.store.svelte.ts`) | impl `lines.mjs` |
| Hub-rank churn: ranks changed by one new file with one importer | 257 of 730 | impl `churn.mjs` |
| Rust fs writes / `.execute(`+`.execute_batch(` / timers / spawns, outside test bodies | 19 / 54 (all in `src-tauri/src/db/`) / 5 / 3 | v2 |
| Shadowed import names | 3 (`mods-host.service.ts:163` param `call`, `SearchResult.svelte:29` param `relativePath`, `fs.service.ts:253` `const { vaultStore } = await import(…)`, which is the same binding) | impl `ts.mjs` |
| e2e files importing `src/lib` | 3 (`e2e/mocks/tauri-core.ts`, `e2e/mocks/vault-index.ts`, one spec) | grep |
| Branch protection on `main` | none (`404 Branch not protected`, rulesets `[]`) | impl critique, `gh api` |

Timing (Node 26.12.1, TypeScript 6.0.3): v2 model of 1511 TS/Svelte files 0.82 to 0.95 s; Rust lexing and `use` resolution 67 ms; same-file call walk adds about 0.3 s (aiu). Estimate: full build 2 to 3 s, one CLI query 1.5 to 2.5 s.

## 3. Decisions

1. **Location.** Committed folder `codemap/`, entry `codemap/INDEX.md`, not gitignored. Every output file is `.md`, including the write-safety marker (INDEX itself, section 11), so the `!**/*.md` path filters in `main-checks.yml`, `nightly.yml`, `security.yml`, `commit-policy.yml` and `pr.yml` `paths-ignore` skip bot commits even if the token ever changes. `.gitattributes` gets `codemap/** linguist-generated=true`.
2. **Script: `scripts/codemap.mjs`**, helpers in `scripts/codemap/`: `ts.mjs` (TS/Svelte facts), `rust.mjs` (lexer, items, uses, calls, emits, sinks), `model.mjs` (`buildModel`, graph indexes, ranking), `render.mjs` (shards), `query.mjs` (CLI). The output folder, the INDEX, the CLI and the pointer line share one word. Estimated 2500 to 3000 lines.
3. **Pointer line.** The CLAUDE.md Documentation Index row for `docs/architecture/README.md` is replaced by exactly one row:
   `| codemap/INDEX.md | Generated code map for agents: files, symbols, calls, imports both ways, IPC, events, side effects, tests. Start there; query with \`node scripts/codemap.mjs q help\`. Put this row in the prompt of any sub-agent you send to do discovery. Grep code with path src or src-tauri. Written by CI on main; never edit or commit it. |`
   AGENTS.md does not exist today; see Owner question 1.
4. **Freshness.** A workflow on push to main regenerates from the tip of main and commits `chore(codemap): regenerate for <sha9>` only when the output changed. Branches never write `codemap/`: the build refuses to write in place off main (section 11). The `architecture` branch and its job are dropped (deleting the remote branch is an owner action).
5. **graphify** is dropped entirely (section 12).
6. **Curated docs** `docs/architecture/` are deleted with the doc-per-module rule and its tests.
7. **IDs are full repo-relative paths everywhere**, one spelling, namespaced kinds (section 4).
8. **No pre-commit guard.** The in-place-write refusal plus CI overwriting `codemap/` after every merge keep branches off it, with no hook change. A guard would block conflicted merges from main (impl critique 7).

## 4. Identifiers

One spelling in every shard, CLI output and CLI argument.

| Kind | Form | Example |
|---|---|---|
| File | repo-relative POSIX path | `src/lib/features/tags/tags.service.ts` |
| Location | `<file>:<line>`, 1-based, digits only | `src/lib/features/tags/tags.service.ts:26` |
| TS symbol (exported or file-local) | `<file>:<name>` | `src/lib/core/editor/editor.service.ts:writeTab` |
| Object method or store member | `<file>:<Obj>.<member>` | `src/lib/features/tags/tags.store.svelte.ts:tagsStore.sortMode` |
| Component | `<file>:default` (CLI also accepts `<file>:<Basename>`) | `src/lib/features/tags/TagsView.svelte:default` |
| Reactive scope | `<file>:$effect@<line>`, `<file>:$effect.pre@<line>`, `<file>:<var>=$derived`, `<file>:$derived@<line>` | `src/lib/app/AppShell.svelte:registeredNavigator=$derived` |
| File scope | `<file>:(module)`, `<file>:(script)`, `<file>:(markup)` | |
| Rust item | `<file>:<name>`, `<file>:<Type>::<method>` | `src-tauri/src/vault/index.rs:VaultIndex::update_entry` |
| Module | repo-relative folder | `src/lib/features/tags` |
| IPC command / event / DTO | `ipc:<command>` / `event:<wire name>` / `dto:<Name>` | `ipc:get_all_tags_v2`, `event:vault-index-updated`, `dto:TagAggregate` |
| Sink | `<origin>.<api>` | `tauri-fs.writeTextFile`, `rust-fs.write`, `timer.setTimeout`, `timer-wrap.debounce` |
| External | `external:<package>` | `external:@kokobrain/mod-core` |
| Package import target | `pkg:<specifier>` | `pkg:@tauri-apps/plugin-fs` |

A location's suffix is all digits and a name never starts with a digit, so the two never collide. Within a line that starts with a location, `in <name>` means `<that file>:<name>`; the CLI accepts both forms. No angle brackets appear in output; they mark placeholders in this spec only.

Grep recipes in the map always use fixed strings and a trailing space: `grep -rF -- '-> src/lib/utils/debounce.ts ' codemap/files`. Module `src/lib/utils` is a prefix of file `src/lib/utils.ts`, and route paths contain `(app)` and `+`, which are regex syntax.

## 5. Output layout, budgets and caps

All under `codemap/`. The folder is replaced on each run (write safety in section 11).

| Path | Contents | Size on this repo |
|---|---|---|
| `INDEX.md` | Router (llms.txt shape): what the map is, which file or command answers which question, ID grammar, blind spots, hubs per layer, inputs hash. | est. 150 to 190 lines, 10 to 12 KB |
| `modules.md` | One `module` line per module (60), layer edge totals, layer rules, layer-baseline debt. | est. 9 KB |
| `modules/<module>.md` | Module card. | measured max 26 KB (`src/lib/utils`) under v2 grammar |
| `files/<file>.md` | File card, one per carded production file (582 TS/Svelte + 62 Rust). | v2 measured median 1.6 KB, max 25 KB; plus calls (median 0.4 KB) and locals (about 110 KB in total) |
| `files/<file>.calls.md` | The `calls` section of a card that would exceed 40 KB with it inline (section 5 split rule). | est. 1 file today (`event-calendar.service.ts`) |
| `ipc/commands.md`, `ipc/events.md`, `ipc/dto.md` | One line per command (72), event (9), DTO (51). | est. 28, 7, 15 KB |
| `wiring.md` | Registries and facets (F11). | est. 14 KB |
| `stores.md` | One line per store (43). | est. 5 KB |
| `effects/<class>.md` | One `fx` line per site; classes `disk-write`, `disk-read`, `host`, `timer`, `reactive`, `dom`, `db`, `spawn`. | est. 1 to 14 KB each |

Total about 3 MB in about 730 files. A push that changes one source file usually rewrites its card, its direct neighbors' cards (line numbers in `imp`, `by`, `call`), its module card, and INDEX line 2.

Token estimate: `bytes / 3` (pessimistic; no tokenizer is installed and the map must not call the network). Caps, enforced by tests for every file: at most 48 KB (16k estimated tokens, under Read's 25k-token and 256 KB limits), 1500 lines (Read's default window is 2000), 1000 chars per line. `INDEX.md`: at most 200 lines and 12 KB.

**Fixed list caps (one pass, no re-render).** Every list has a fixed cap. Over the cap, the line or section ends with a `more` line: `more <what> <n> not shown: <group>(<k>) … +<m> modules: q <command> <id>`, with at most 8 groups, ordered by count descending then code unit. So no line can grow without bound.

| List | Cap |
|---|---|
| `imported-by` lines | 40 |
| `by` lines per symbol | 8 |
| `tests` lines | 40 |
| Sites inside one `mem` line | 6, else groups only |
| `ipc-call` and `ev` lines on one Rust card per command or event | 12 |
| `registered-at` and `fired-by` lines per registry | 20 |
| `in2`/`out2` modules | top 5 |
| DTO `used-by` modules | 8 |
| Any other in-line list | 8 |

**Calls split rule.** Render the card with its `calls` section inline. If it exceeds 40 KB, write the section to `files/<file>.calls.md` instead and put `more calls codemap/files/<file>.calls.md` in the card. If any file still breaks a cap, the build fails and names it (the budget test catches this on the PR first); the fix is lowering a cap constant.

Rejected layouts (measured in v2): one shard per source directory (max 73 KB); a single tests file (450 KB); one graph or edge file (owner decision 3).

## 6. Line grammar

Every file:
- Line 1 `# <what this file is>`. Line 2 a `cols:` line giving the grammar of the lines below and one grep example (INDEX uses the llms.txt `>` summary instead). Files over 100 lines get line 3 `sections: …`.
- UTF-8, LF, final newline, no tabs, no trailing spaces, no `\r`.
- One fact per line. Each fact line starts with a fixed lowercase tag, so a grep hit stands alone. `##` headings only as section labels.
- Every location is a full `<file>:<line>`; no shortened paths.

Tags:

| Tag | Grammar | Where |
|---|---|---|
| `file` | `file <path> <role> L<lines> module <m> in<prod importer files> t<test files> [t:inline] [| header doc]` | card line 4, module card |
| `imp` | `imp <importer>:<line> -> <target file> <names>` | both cards of the edge |
| `in2`/`out2` | `in2 <file> <n> files in <m> modules: <module>(<k>) …` | card `reach` |
| `test` | `test <test file> imports|mocks|e2e <file> [mirror]` | source card |
| `sym` | `sym <loc> <kind> <name><sig> L<span> [| doc]` | card, module card |
| `by` | `by <symbol id> <- <use loc> in <enclosing> <kind> [+<n>]` | defining card |
| `local` | `local <loc> fn <name><sig> L<span>` | card |
| `store` | `store <loc> <name> esc:<n>` | store card |
| `mem` | `mem <loc> get|set|do <store>.<member> r:<sites>|w:<sites> [w-via:<do members>] [| doc]` | store card |
| `call` | `call <loc> in <enclosing> -> <target id> <kind> [+<n>]` | caller card |
| `mount` | `mount <loc> <Name> -> <component file>` | both cards |
| `fx` | `fx <loc> <sink> [<arg>] in <enclosing>` | card, `effects/*` |
| `reg` | `reg <loc> <registry id> in <enclosing> [args=<text>]` | registering card |
| `ipc-call` | `ipc-call <ts loc> in <fn> -> ipc:<cmd> -> <rust fn loc>` | TS card and Rust card |
| `ev` | `ev <rust emit loc> in <fn> -> event:<name> -> <ts listen loc> in <fn>` | Rust card and TS card |
| `ipc`, `event`, `dto` | see `ipc/*` below | `ipc/*` |
| `dep` | `dep <from module> -> <to module> <file pairs>` | both module cards |
| `entry` | `entry <file> ext-in<n> <importer files>` | module card |
| `module` | `module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k` | `modules.md`, module card |
| `hub` | `hub <layer> <file> in<n> t<n>` | INDEX |
| `more` | see section 5 | anywhere |

`imp` names: as exported by the target (`default`, `*` for namespace, `type:` prefix for type-only, `dyn:` prefix for `import()`), comma-joined in source order. An `imp` edge has exactly one text, written in both cards. The same holds for `mount`, `ipc-call`, `ev` and `dep`.

`<kind>` on `by` and `call`: `call`, `mcall` (method call on an imported object), `ref` (value use, e.g. a callback passed), `member` (property read), `assign` (write to a member), `markup` (use inside a Svelte `{…}` expression), `mount`, `import` (no use found, for example type-only; the location is then the import specifier's line), `lexical` and `lexical-method` (Rust, F16). `+<n>` counts further sites of the same (file, enclosing, target).

### `files/<file>.md` (abridged; lines and numbers real unless `<…>`)

```
# file card src/lib/features/tags/tags.service.ts
cols: file … · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> · local … · call <loc> in <fn> -> <target> <kind> · fx/reg/ipc-call/ev … · grep: grep -rF -- '-> src/lib/features/tags/tags.service.ts' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, effects
file src/lib/features/tags/tags.service.ts service L168 module src/lib/features/tags in3 t2
## imports
imp src/lib/features/tags/tags.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/tags/tags.service.ts:3 -> src/lib/utils/debounce.ts debounce
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:24 -> src/lib/features/tags/tags.service.ts buildTagIndex,resetTags
## reach
in2 src/lib/features/tags/tags.service.ts <n> files in <m> modules: src/lib/app(<n>) …
## tests
test src/tests/lib/features/tags/tags.service.test.ts imports src/lib/features/tags/tags.service.ts mirror
## symbols
sym src/lib/features/tags/tags.service.ts:26 fn buildTagIndex(): Promise<void> L<span> | Builds the tag tree from the Rust `VaultIndex`.
by src/lib/features/tags/tags.service.ts:buildTagIndex <- src/lib/app/lifecycle/app-lifecycle.service.ts:433 in initializeVault call
## locals
local src/lib/features/tags/tags.service.ts:<line> fn runScheduledRebuild(): Promise<void> L<span>
## calls
call src/lib/features/tags/tags.service.ts:91 in debouncedTrigger -> src/lib/features/tags/tags.service.ts:runScheduledRebuild call
## effects
ipc-call src/lib/features/tags/tags.service.ts:30 in buildTagIndex -> ipc:get_all_tags_v2 -> src-tauri/src/commands/vault.rs:638
fx src/lib/features/tags/tags.service.ts:90 timer-wrap.debounce args=() => { void runScheduledRebuild(); }, 300 as debouncedTrigger in debouncedTrigger
fx src/lib/features/tags/tags.service.ts:120 timer.setTimeout delay=0 in flushScheduledTagIndexRebuild
```

Section rules:
- `imports`: every import statement resolving to a scanned file, in line order, plus `@tauri-apps/*` package imports (`-> pkg:@tauri-apps/plugin-fs …`, importer card only). Other packages are left out.
- `imported-by`: production importers by (path, line). Test importers are in `tests`.
- `reach`: 2-hop summary only. `in2` = production files importing a direct importer, minus direct importers and self; `out2` forward. Full list: `q impact <file> --depth 2`.
- `tests`: mirrored first, then (relation, path).
- `symbols`: every exported symbol in line order, each followed by its `by` lines (one per user file other than this one, path order, first use site in that file).
- `locals`: non-exported top-level functions (declarations and consts bound to arrow or function expressions) and Rust non-`pub` fns, in line order.
- `store`: for a store file, the `store` line then one `mem` line per member in source order.
- `calls`: every distinct (enclosing, target) pair of this file's F4 uses of kind `call`, `mcall`, `ref` of a function, `markup` call, and Rust calls, by (enclosing line, first site line, target). Same-file pairs included, so the file's local call graph is on its card. The reverse is grep: `grep -rF -- '-> <id> ' codemap/files`.
- `effects`: `fx`, `reg`, `ipc-call`, `ev`, by line.
- Components: `sym <file>:1 component <Name> props:<…>`; instance-script exported functions as `sym <loc> method <name><sig>` (F2); a `## mounted-at` section with the `mount` lines that render it.
- Rust cards: `file` line with the `//!` first sentence and `t:inline` when the file has `#[cfg(test)]`; `imp` from F16; `sym` for F12 items with `by` from F16; `local` for non-pub fns; `test` from `src-tauri/tests`; `calls`; `ipc-call` lines into its commands (section `ipc-in`), `ev`, `fx`.

### `modules/<module>.md`

```
# module card src/lib/features/tags
cols: module … · dep <from> -> <to> <file pairs> · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/tags ' codemap/modules
module src/lib/features/tags features files 8 in-modules <n> out-modules <n> pub 3/24 ipc 1/0 card ~0.9k
## neighbors
dep src/lib/app -> src/lib/features/tags <n>
dep src/lib/features/tags -> src/lib/core/editor <n>
in2 src/lib/features/tags <n> modules: src/routes(<n>) …
## entry files
entry src/lib/features/tags/tags.service.ts ext-in2 src/lib/app/commands.ts src/lib/app/lifecycle/app-lifecycle.service.ts
## files
file src/lib/features/tags/tags.service.ts service L168 module src/lib/features/tags in3 t2
## public
sym src/lib/features/tags/tags.service.ts:26 fn buildTagIndex(): Promise<void> L<span> | Builds the tag tree from the Rust `VaultIndex`.
## stores
store src/lib/features/tags/tags.store.svelte.ts:9 tagsStore esc:0
## effects
fx-count timer.setTimeout 1 · ipc-call ipc:get_all_tags_v2 1
## debt
-
```
`dep` weight = distinct (from file, to file) production pairs, TS and Rust alike. No rank numbers on cards (they churn, impl critique 4).

### `modules.md`

```
# modules: one line per module, layer totals, layer rules, layer debt
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · grep: grep -F 'module src/lib/features/' codemap/modules.md
module src/lib/features/tags features files 8 in-modules 2 out-modules 7 pub 3/24 ipc 1/0 card ~0.9k
## layers (distinct file pairs)
layer src/lib/app -> core <n>
## layer rules (scripts/import-graph.mjs ruleFor)
rule features may: components contracts core features lib-root types utils
rule plugin->plugin allowed: plugins/calendar -> plugins/periodic-notes
## debt (src/tests/lib/architecture/layer-baseline.json)
<entries verbatim, one per line>
```

### `ipc/commands.md`, `ipc/events.md`, `ipc/dto.md`

```
ipc ipc:get_all_tags_v2 | args - -> TagAggregate[] | rust src-tauri/src/commands/vault.rs:638 | reg src-tauri/src/lib.rs:351 | keys src/lib/contracts/commands.ts:103 src/lib/contracts/commands.ts:284 e2e/mocks/tauri-core.ts:491 | callers src/lib/app/editor-host.ts:102 in <fn>, src/lib/features/tags/tags.service.ts:30 in buildTagIndex | doc …
event event:vault-index-updated | const VAULT_INDEX_UPDATED_EVENT src-tauri/src/events.rs:7 | ts EVENT_NAMES.VAULT_INDEX_UPDATED src/lib/contracts/events.ts:16 | payload UpdateResult | emits src-tauri/src/commands/vault.rs:373 in <fn>, src-tauri/src/commands/vault.rs:465 in <fn> | listens src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener | doc …
dto dto:TagAggregate | rust src-tauri/src/vault/task.rs:160 | ts src/lib/contracts/generated/TagAggregate.ts | returned-by ipc:get_all_tags_v2 | arg-of - | contains - | in - | used-by src/lib/contracts(2) src/lib/types(1) | e2e e2e/mocks/tauri-core.ts:37 e2e/mocks/vault-index.ts:29 | doc …
```
` | ` is the field separator in these three files only; a ` | ` inside a doc becomes ` / `. Lists over 8 items are grouped with a `q` hint (section 5).

### `wiring.md`, `stores.md`, `effects/<class>.md`

```
reg src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver sink src/lib/core/editor/editor.hooks.ts:52 | stores afterSaveObservers push | doc …
reg src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver read-by src/lib/core/editor/editor.hooks.ts:67 notifyAfterSave
reg src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver fired-by src/lib/core/editor/editor.service.ts:245 in writeTab <- src/lib/core/editor/editor.service.ts:<line> in saveFileByPath
reg src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver registered-at src/lib/features/search/search.service.ts:303 in registerSearchIndexHook args=(filePath, content) => { if (!filePath.endsWith('.md') && !filePath.e… -> src/lib/features/search/search.service.ts:registerSearchIndexHook
reg src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver invoked-at src/lib/app/lifecycle/app-lifecycle.service.ts:<line> in initializeVault
reg src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer registered-at src/lib/features/event-calendar/event-calendar.service.ts:658 in registerEventCalendarPathChangeConsumer args={ name: 'event-calendar', pathChanged: followPathChange } -> src/lib/features/event-calendar/event-calendar.service.ts:followPathChange
reg src/lib/core/markdown-editor/editor-host.ts:editorHost facet src/lib/core/markdown-editor/editor-host.ts:104
```
`stores.md`: `store <loc> <name> get <n> set <n> do <n> readers <files> writers <files> card codemap/files/<file>.md`.
`effects/<class>.md`: `fx` lines sorted by (sink, file, line).

## 7. Extraction rules

### F1. Inventory and modules

- Keep `walk`, `discoverModules`, `moduleOf`, `fileRole` and `handlerCommands` from `scripts/architecture-map.mjs` (move them into `scripts/codemap/`). 60 modules: 51 `src/lib` + `src/routes` + `src-tauri/src` + its 7 folders.
- Inputs: `src/lib/**/*.{ts,svelte}` (no `.d.ts`), `src/lib/**/*.js` (role `other`, no symbols), `src/routes/**/*.{ts,svelte,js}`, `src/tests/**/*.ts`, `e2e/**/*.ts`, `src-tauri/src/**/*.rs`, `src-tauri/tests/**/*.rs`, `src/tests/lib/architecture/layer-baseline.json`.
- `src/lib/components/ui/**` and `src/lib/contracts/generated/**` are graph nodes and count in module totals, but get no card and no `sym` lines.
- Test files and e2e files are graph nodes (for `test` relations, DTO users and CLI queries) with no card.

### F2. TS/Svelte exports

Each script region is parsed once with `ts.createSourceFile(…, ScriptKind.TS)`, reusing `codeRegions` and `extractImportsFromSource` from `scripts/import-graph.mjs` (section 12).
- Exports: `function` → `fn`; `class`; `interface`; `type`; each declarator of `export const|let` → `const`, or `fn` for an arrow or function expression; a store object (F5) → `store`. `<script module>` exports count. In an instance `<script>`, `export function` → kind `method` (called through `bind:this`; 1 today, `src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:42`).
- Line: `lineOffset + line of node.getStart(sf)`. Span `L<n>` = end line − start line + 1 of the declaration node.
- Signature: functions `(params): returnType` as written, whitespace collapsed, no inference; const initialized by a call without annotation: `= <callee>(…)`, callee capped at 40; const with annotation `: <type>`; class `extends <text>`; cap 120, then `…`.
- Doc (D1): last JSDoc of `ts.getJSDocCommentsAndTags(declarator)`, falling back to the statement; `ts.getTextOfJSDocComment`; tags dropped; then D3.
- Components: one `component` symbol per non-ui `.svelte`, name = basename, line 1, `props:` from the `$props()` destructuring (`name`, `name=`, `name=$bindable`, `...rest`), omitted when none.
- File header (D2): the first `/**` of the first statement's leading comments is a header only when the first statement is an import or export-from, or when two or more JSDoc blocks lead it (then the first). 43 `.ts` files qualify; `note-change.service.ts` gets none.
- D3 `firstSentence`: replace `{@link X}`/`{@linkcode X}`/`{@linkplain X}` with X or its label; cut at the first blank line; collapse whitespace; end at `.`, `?` or `!` followed by end, or by a space and an uppercase letter, backtick, `(` or `[`, outside backticks, except after `e.g`, `i.e`, `etc`, `vs`, `cf` (case-insensitive); over 160 chars → 159 + `…`; empty → field omitted.
- Locals: non-exported top-level `function` declarations and `const|let` bound to arrow or function expressions, with signature and span by the same rules.

### F3. Binding resolution

- Export table per file: local exports; `export { a as b } from 'x'` → (x, a); `export { a as b }` without `from` → the local a, and when a is an import binding, follow that import (every `components/ui/*/index.ts` has this shape); `export * from 'x'` searched in source order.
- Bindings per import in `src/lib`, `src/routes`, `src/tests`, `e2e`: named (aliases kept), default, `type` imports, and `const { a, b } = await import('x')`.
- Resolve with `resolveSpecifier` (aliases `#lib/*` and relative paths only, verified), follow the export table with a visited set, depth ≤ 8. A chain ending in `contracts/generated/<T>.ts` maps to `dto:T`. A chain ending in a package re-export is `external:<package>`. Any other unresolved chain counts on the file only, never guessed.
- Namespace imports and non-destructured dynamic imports are file-level only (all 47 `import * as` target `components/ui`).
- Public: imported by at least one non-test file outside its module.
- `by` location: the first F4 use site in the importer file; with no use, the line of the import specifier element (`buildTagIndex,` inside a multi-line `import {`), kind `import`. 138 import statements open with `import {` alone on a line.

### F4. Uses (references)

One AST walk per script region of every F1 TS/Svelte file (test and e2e files included; their rows feed only `--tests` answers and `t<n>` counts) records each use `(target id, kind, line, enclosing)` of:
- an import binding that resolves to a symbol (F3);
- a same-file top-level function or const-bound function (TS), or a method of a same-file top-level object literal called as `Obj.method(…)`.

Kinds: `call` (callee of a `CallExpression`); `member` (object of a `PropertyAccessExpression`, optional chaining included); `mcall` (that access itself called); destructuring `const { a, b } = store` → one `member` each; `assign` (member access on the left of `=`, a compound assignment, `++` or `--`); `ref` (any other value use, e.g. a callback argument such as `debounce(saveDirtyTabs, 2000)`).

Shadowing: an identifier is not a use of an import or same-file binding when an enclosing function-like node declares a parameter with that name, or an enclosing block declares `const`/`let`/`var`/`function` of that name, except a declaration destructured from `await import(x)`, which is itself an F3 binding. Fixes `mods-host.service.ts:179` (param `call`) and `SearchResult.svelte:29`.

**Svelte markup.** Blank `<script>`, `<style>` and `<!-- -->` to spaces, keeping newlines. Then, only inside brace-matched `{…}` expression spans (quotes respected), for every import binding and same-file top-level function B of the component, match `(?<![\w.$])B\b`:
- B is a store binding (F5): `B\??\.(\w+)` gives the member; followed by `(` and the member is `do` → `mcall` (a write); a `do` member not followed by `(` → `ref` (a write, e.g. `onclick={store.close}`); a `get` member → `member`.
- otherwise: followed by `(` → `call`, else `ref`; kind printed `markup` on `call` lines.
Enclosing `(markup)`. No `svelte/compiler` (0.4 to 0.7 s and a new failure mode).

**Enclosing (F4e)**, nearest ancestor wins, checked at each step outward:
1. `FunctionDeclaration` name.
2. Method, getter or arrow/function property of an object literal bound to a top-level `const Obj` → `Obj.member`.
3. Class method → `Class.method`.
4. Variable bound to an arrow or function expression → its name.
5. Callback of `$effect(…)`, `$effect.pre(…)`, `$effect.root(…)` → `$effect@<line>` (`$effect.pre@<line>`).
6. Initializer of `$derived(…)` or `$derived.by(…)` bound to identifier X → `X=$derived`; unbound → `$derived@<line>`.
7. Initializer of any other top-level `const|let X = …` → `X` (gives `debouncedTrigger` for `tags.service.ts:90`).
8. Anonymous callbacks resolve outward. Top level: `(module)`; component instance script: `(script)`; markup: `(markup)`.

Rows are not written as such; they feed `by`, `call`, `mem`, `ipc-call`, `reg`, `fx`, the CLI, F11 and F5.

### F5. Stores

- Detection: an exported `const` whose initializer is an object literal with at least one `GetAccessor` (43 files, nothing else).
- Members in source order: `get`, `set` (SetAccessor; 0 today, kept so the generic `assign` rule has a target), `do` (method, or property with arrow or function value), each with line and doc.
- Readers: F4 `member` uses of `get` members (script and markup). Writers: `mcall` and markup `ref` uses of `do` members; `assign` uses of any member.
- **State links (`w-via`).** In the store file: W(do) = module-level bindings written in the `do` member's body or in same-file local functions it calls (transitively): left side of an assignment, compound assignment, `++`/`--`; root of an assigned property or element chain (`tabs[i].content = …`); receiver of `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`, `set`, `delete`, `clear`, `add`. R(get) = module-level bindings referenced in the getter body, plus, one level, the bindings referenced by a module-level `$derived` initializer it reads. `w-via` on a `get` member = the `do` members with W ∩ R non-empty. So "who writes `editorStore.tabs`" = callers of `addTab`, `removeTab`, … (`editor.store.svelte.ts:8` `let tabs = $state(…)`, mutated by `tabs.push`/`tabs.splice` at `:52`, `:71`).
- `esc:N` on the `store` line counts files passing the store as a value. A member with no use shows `-` (no static reference found, not "unused"); `backlinksStore.unlinkedMentions` is a real case.

### F6. Tests

- `imports`: a test file has a non-type-only import that resolves to F. `mocks`: `vi.mock`/`vi.doMock` with a string-literal first argument (multi-line, AST), resolved from the test file; `mocks` wins when both; package mocks ignored. `e2e`: an e2e file with a non-type import resolving to F.
- `mirror`: test in `src/tests/<source dir without src/>/`, basename starting with the source stem, relation `imports`.
- Rust: each `kokobrain_lib::a::b…` path in lexed `src-tauri/tests/**/*.rs` maps by the F16 resolver; relation `imports`. Files with `#[cfg(test)]` get `t:inline`.
- The reverse (what a test covers): `grep -rF -- 'test <test path> ' codemap/files` or `q deps <test path>`.

### F7. Module layer facts

Layer = `locate(path).layer`, or `routes`, or `rust`. Layer rules in `modules.md` come from the exported `ruleFor` on one representative path per layer pair, one line per from-layer, plus `PLUGIN_ALLOWLIST` verbatim. Module debt: baseline entries with either side in the module.

### F8. IPC commands

- Entries from `generate_handler!` in `src-tauri/src/lib.rs` with lines.
- Rust fn: path minus last segment → file (`commands::vault` → `src-tauri/src/commands/vault.rs`, fallback `…/mod.rs`; `quick_capture::commands` → `src-tauri/src/quick_capture/commands.rs`), then the F12 `cmd` item.
- Args, result and doc from the `CommandMap` member in `src/lib/contracts/commands.ts` (args = property names of the `args` literal, `-` for `NoArgs`). `ipc-parity.test.ts` keeps Rust and TS in agreement.
- Key sites: property-assignment names, property-signature names or string-literal member keys equal to the command in `src/lib`, `src/routes`, `e2e`.
- Callers: `CallExpression` whose callee is the binding imported as `call` from `src/lib/contracts/ipc.ts` (alias-aware, shadow-aware) with a string-literal first argument; line and F4e enclosing. Each caller gives one `ipc-call` line on the TS card and the same line on the Rust card. Commands without callers (`capture_clipboard_now`, `open_composer`, `scan_vault_v2`) show `callers -`.
- Mismatches print `!no-rust-fn` / `!no-contract`.
- The raw `invoke` at `src/lib/core/settings/sections/UpdateSection.svelte:178` is an `fx … tauri-api-core.invoke` line (F15).

### F9. Events

- Consts `pub const (\w+_EVENT): &str = "(…)"` in `src-tauri/src/events.rs`, with line and `///` doc. TS key: the `EVENT_NAMES` property whose value equals the name; payload: the `EventMap` member type text.
- Emits: in production Rust text (F12) outside `events.rs`, an occurrence of the const counts when the nearest unclosed `(` before it follows an identifier starting with `emit` (handles the multi-line `emit_to` at `lib.rs:288-289`; ignores the multi-line `use events::{…}` at `lib.rs:20-22`). Enclosing fn from F12 ranges.
- Listens: a call of the binding imported as `on` from `contracts/ipc` whose first argument is `EVENT_NAMES.KEY`; enclosing by F4e (the callback resolves outward, e.g. `fs.watcher.ts:276` → `startWatching`).
- Each (emit, listen) pair gives one `ev` line, on both cards. All 9 events have both sides. Frontend-to-Rust events do not exist (Rust has no `.listen(`); listed as a blind spot.

### F10. DTOs

Rust struct or enum with `ts(export)`; TS file `src/lib/contracts/generated/<Name>.ts` (listed recursively; `serde_json/JsonValue.ts` is a ts-rs dependency); missing file → `!no-ts`.
- `used-by`: F3 importers (type imports included) through `contracts/index.ts` and aliases (`TagAggregate as TagAggregateV2`), as modules with counts.
- `returned-by` / `arg-of`: commands whose `CommandMap` result or args type text contains the DTO name as a whole identifier.
- `contains` / `in`: imports between generated files.
- `e2e`: e2e import locations whose binding resolves to the DTO (type imports included).

### F11. Registries and facets

- Sink rule: an exported function, or a method of an exported object literal, whose own body (a) has `return <arrow|function expression>` and (b) calls `.push`, `.add`, `.set` or `.unshift` on, or assigns, a module-level binding of the same file. 25 hits today; known false positives (`configureProfiling`, `acquireCalendarClock`, `modCommandsStore.place`) are printed with their evidence, not filtered.
- Facets: exported consts initialized with `Facet.define(…)`; registration sites are F4 `X.of(…)` member calls.
- Per sink:
  - `stores`: the written binding and the mutation.
  - `read-by`: same-file functions or getters referencing a written binding without mutating it (`notifyAfterSave` yes; `resetHooks` with `.length = 0` no).
  - `fired-by`: for an exported `read-by` function, its F4 use sites. For a local one, climb the same-file call graph (F4 same-file calls) until an exported function or `(module)`, and print the chain with each hop's location (`fs.watcher.ts:onFileChange` → `notifyListeners` ← `handleChangedPaths` ← `startWatching`). For a `get` member of a store object, its F5 readers (`railRegistryStore.navigators` readers in `src/lib/app/AppShell.svelte`, `Rail.svelte`, `src/lib/app/commands.ts`).
  - `registered-at`: F4 call sites of the sink, with `args=` the first argument's source text (whitespace collapsed, cap 80) and `->` the callback: the first argument when it is an identifier resolving to a function, else the identifier values of its object-literal properties, else the site's enclosing function.
  - `invoked-at`: one hop up from each exported `registered-at` enclosing fn.
- Each `registered-at` site is also a `reg` line on the registering card.

### F12. Rust lexer and items

- Lexer: one pass giving code-only text (comments and string contents blanked, newlines kept), brace depth, and `///`/`//!` runs with lines. Handles `//`, nested `/* */`, multi-line `"…"` with escapes, `b"…"`, raw strings `r"…"`/`r#…#"…"#…#`, char literals versus lifetimes.
- **Production text**: the code-only text with the whole body of every item preceded by `#[cfg(test)]` blanked (keeping newlines). F9, F12 items, F15, F16 and F20 all read only production text. Edges from test modules are dropped (the file is already `t:inline`).
- Inline modules: the lexer tracks `mod name {` nesting, so a path inside one resolves `self::`/`super::` against the module path, not the file (the only production inline module is `src-tauri/src/semantic/qos.rs:39` `mod sys`, `#[cfg(target_os = "macos")]`; its items are not carded, listed as a blind spot).
- Items: depth 0 `pub`, `pub(crate)`, `pub(super)` + `[async] fn|struct|enum|trait|type|const|static`; inside `impl` headers matching `impl(<…>)?\s+Path(<…>)?\s*(where …)?\{` and not `impl … for …`, `pub [async] fn` as `Type::name` (catches `impl UpdatePlan<'_>` → `UpdatePlan::is_noop` at `update_plan.rs:31`). Non-pub fns at depth 0 and in impls are `local` lines. Braces, never columns.
- Kinds: `cmd` (`#[tauri::command]`), `dto` flag (`ts(export)`), restricted visibility `fn(crate)`, `method` for `Type::name`.
- Doc: contiguous `///` run above, skipping attribute runs (multi-line `#[…]`), then D3. Signature: params between matched parens + ` -> ` return type up to `{` or `where`, cap 120. Span from the item's braces. File doc: first `//!` run (30 files).

### F13. Inputs hash and CLI entry

- Hash: `sha256` over the code-unit-sorted list of `path + "\0" + content + "\0"` for every F1 input file, plus `scripts/codemap.mjs`, `scripts/codemap/*.mjs`, `scripts/import-graph.mjs`, plus `typescript@<version>` from `node_modules/typescript/package.json`. First 12 hex chars on INDEX line 2.
- `node scripts/codemap.mjs` (alias `build`) writes `codemap/` (refusal rules in section 11); `--out <dir>` writes elsewhere. Stderr: counts and elapsed ms; stdout empty.
- `node scripts/codemap.mjs --stale`: recomputes the hash (reads files, no parsing), compares with INDEX; exit 0 when equal, 1 when different or INDEX missing. On exit 1, when `git` is available, it also prints up to 20 input files changed since the last commit touching `codemap/INDEX.md` (plus untracked inputs). Git affects the message only.
- `node scripts/codemap.mjs q <command> …`: section 9.

### F14. Graphs and ranking

- File graph: nodes = every F1 file; edges = F3-resolved import statements (static, type-only, re-export, literal dynamic) plus F16 Rust edges. Reverse edges precomputed.
- Module graph: production files only; weight = distinct (from file, to file) pairs.
- Symbol graph (CLI and F11): nodes = symbol IDs, local fns, scopes (section 4); edges = F4 uses, F16/F20 Rust calls, F8 IPC (TS enclosing → Rust cmd fn), F9 events (Rust emit enclosing → TS listener enclosing), F11 fires (each `read-by` fn → each registered callback), F5 state (a writer's enclosing → the enclosings of readers of the `get` members in `w-via` of the `do` member it calls), mounts (`(markup)` of X → `<Y>:default`; a component's `default` → its `(script)`, `(markup)` and reactive scopes).
- Hub rank (INDEX and `q hubs` only): production files sorted by (distinct production importer files desc, distinct test importer files desc, path asc). INDEX shows the top 3 per layer (`app`, `routes`, `core`, `features`, `plugins`, `utils`, `contracts`, `types`, `rust`). Today's global top 5: `settings.store.svelte.ts` (82, 124), `vault.store.svelte.ts` (81, 149), `utils/debug.ts` (73, 28), `editor.service.ts` (55, 74), `utils.ts` (54, 1).
- Entry files of a module: files with at least one production importer outside the module, by (external importer files desc, path asc).
- PageRank is not used: in-degree is exact, integer and explainable in one line.

### F15. Side-effect sites

Each site: `(location, sink, class, arg?, enclosing)`, written as an `fx` line on the card and in `effects/<class>.md`.
- **Tauri package calls (AST).** A call whose callee is bound by an import from `@tauri-apps/*` (named, aliased, or namespace member). Sink: `@tauri-apps/plugin-X` → `tauri-X`, `@tauri-apps/api/X` → `tauri-api-X`, plus `.` + exported name. Class from a fixed table: `disk-write` for `writeTextFile`, `writeFile`, `mkdir`, `remove`, `rename`, `copyFile`, `create`, `truncate`; `disk-read` for `readTextFile`, `readFile`, `readDir`, `exists`, `stat`, `lstat`, `readTextFileLines`, `open`; all else `host`. 200 production calls (plugin-fs 162).
- **Timers (AST).** Callee is the global `setTimeout`, `setInterval`, `requestAnimationFrame`, `requestIdleCallback` or `queueMicrotask` (or `window.`/`globalThis.` + name), not an import binding. Sink `timer.<name>`; `delay=<source text of the 2nd argument>` for `setTimeout`/`setInterval`, cap 30. 65 production sites.
- **Timer wrappers (AST).** A wrapper is an exported function containing a `setTimeout`/`setInterval` call whose delay argument's root identifier is one of the wrapper's own parameters (today only `src/lib/utils/debounce.ts:debounce`; the broader "contains a timer" rule matches 14 functions including `appendLog` and `initializeVault`, which would flood `timer.md`). Each F4 `call` of a wrapper is an `fx` line, sink `timer-wrap.<name>`, class `timer`, `args=<argument source text, whitespace collapsed, cap 60>`, ` as <X>` when the call initializes `const X`. Gives `tags.service.ts:90 … 300 as debouncedTrigger`.
- **Reactive effects.** `$effect`, `$effect.pre`, `$effect.root` sites, sink `svelte.$effect`, class `reactive` (117). Their store reads are F5 reader sites enclosed as `$effect@<line>` (F4e).
- **DOM listeners.** `<expr>.addEventListener('<literal>', …)` → `dom.<event>`, `arg` = receiver text cap 30 (58 sites, all literal). Markup `<svelte:window|document|body …>` attributes `on:?<name>=` → `dom.<name>`, arg `svelte:window` etc., enclosing `(markup)`.
- **Rust disk writes.** In production text: `fs::(write|create_dir_all|create_dir|remove_file|remove_dir_all|remove_dir|rename|copy)\s*\(`, `File::create\s*\(`, `OpenOptions::new\s*\(`, where `fs` is `std::fs`/`tokio::fs` written out or imported by `use std::fs`/`use tokio::fs` (a crate module named `fs` does not count). Sink `rust-fs.<name>` / `rust-tokio-fs.<name>`, class `disk-write`. 19 sites; `src-tauri/src/utils/fs.rs:write_atomic` is the enclosing fn of its own.
- **Rust database writes.** `.execute(`, `.execute_batch(` → `rust-db.execute`, class `db`, 54 sites. Receiver not resolved.
- **Rust timers / spawns.** `thread::sleep(`, `tokio::time::(sleep|interval|timeout)(` → `rust-timer.<name>`; `tauri::async_runtime::spawn(`, `std::thread::spawn(`, `tokio::spawn(` → `rust-spawn.<name>`, class `spawn`.
- Rust event emits are `ev` lines (F9), not `fx`.

### F16. Rust `use` edges, item importers and cross-file callers

- Sources (production text): `use` trees (nested braces, `self`, `as`, `pub use`) rooted at `crate::`, `super::`, `self::`, and `kokobrain_lib::` in `src-tauri/tests`; inline paths `crate::a::b…` outside `use`; in `lib.rs`/`main.rs`, bare paths whose first segment is a top-level crate module.
- Resolution: drop the root (resolving `self`/`super` against the module path, F12), map to the longest prefix existing as `src-tauri/src/<a>/<b>.rs` or `<a>/<b>/mod.rs`; the leaf is an item when it names an F12 item of that file.
- File edge: one `imp` line per (file, statement or inline-path line, target). `mod x;` is containment, not an edge.
- Item importers: `by` lines on the defining card.
- Callers, marked `lexical`: in a file importing item X, each occurrence of X's local name followed by `(` or `::`, `alias::X(` for a module alias (`vault_fs::write_atomic(`), or a full `crate::…::X` path, outside `use`, with the F12 enclosing fn. `Type::method(` and `Self::method(` count as calls of that method item when `Type` is imported or defined in the file.
- Method calls, marked `lexical-method`: `.name(` counts as a call of `Type::name` when `name` is a pub impl method defined once among all crate fn names, contains `_`, and is not in the generator's fixed `RUST_STD_METHOD_NAMES` list (Rust std/core methods with an underscore: `is_empty`, `to_string`, `as_str`, `as_ref`, `get_mut`, `to_owned`, `into_iter`, `iter_mut`, `unwrap_or`, `unwrap_or_default`, `unwrap_or_else`, `map_err`, `ok_or`, `and_then`, `starts_with`, `ends_with`, `push_str`, `to_lowercase`, `to_uppercase`, `split_whitespace`, `as_bytes`, `as_path`, `to_path_buf`, `file_name`, `extension`, `with_capacity`, `read_to_string`, `sort_by`, `sort_by_key`, `retain`, `extend_from_slice`, `is_some`, `is_none`, `is_ok`, `is_err`, `as_deref`, `contains_key`, `entry`, `or_insert`, `or_insert_with`, `get_or_insert_with`). Today this reaches e.g. `VaultIndex::update_entry` from `src-tauri/src/commands/vault.rs:343` and `:1340`. Names without `_` (`build`, `store`, `entries`, `start`) collide with `std`/crate APIs (`.store(` on atomics, `.build()` on builders) and are not counted.

### F17. Component mounts

In blanked markup (outside `{…}` too), for each import binding B resolving to a `.svelte` file, each `<B` followed by whitespace, `/` or `>` is a `mount` (`<TagItem …>` at `TagsView.svelte:86`). Dynamic components (`<svelte:component this={…}>`, `{@render}`) and namespace components (`<Menu.Item>`) are not tracked.

### F18. Cross-language lines on both cards

`ipc-call` (F8) and `ev` (F9) lines are written on the TS card and on the Rust card with identical text. A Rust `cmd` with no `use` importer therefore shows its TS callers on its own card instead of reading as unused.

### F19. Namespaced IDs in output

Wherever a command, event or DTO is named in output, it is printed as `ipc:<cmd>`, `event:<name>`, `dto:<Name>` (including `ipc/*` line heads, `returned-by`, `ipc-call`, `ev`). `grep -rF 'ipc:get_all_tags_v2' codemap` finds the line in `ipc/commands.md`, the TS card and the Rust card.

### F20. Rust same-file calls

In production text of file F, with F's F12 fn set (pub and local, depth 0 and impl methods): `self.name(` and `Self::name(` → `Type::name` of the enclosing impl; a bare `name(` not preceded by `.`, `::` or `fn ` → the depth-0 fn `name` of F. Kind `call`, F12 enclosing. Gives `commands/vault.rs:370` `update_note_in_index` → `update_note_in_index_inner`.

### F21. Card assembly

Section 6 defines each section; every value comes from F2 to F20. Caps and the calls split rule from section 5 are applied in one pass while rendering.

## 8. Tracked and not tracked

| Fact | Status | Rule |
|---|---|---|
| Imports (TS, Svelte, Rust `use`) | tracked | F3, F16 |
| Calls, same-file and cross-file, TS | tracked | F4 |
| Calls from Svelte markup | tracked inside `{…}` | F4 |
| Rust calls | same-file and imported names exact by text; `Type::method` exact; `.method()` for unique names with `_` (`lexical-method`) | F16, F20 |
| IPC TS → Rust, events Rust → TS | tracked, both ends | F8, F9, F18 |
| Store reads and writes, getter-to-mutator links | tracked | F5 |
| Svelte `$effect`/`$derived` store dependencies | direct store reads tracked as reader sites in the scope; indirect reads through called functions not | F4e, F5 |
| Disk, host, timers, timer wrappers, DOM, DB, spawns | tracked | F15 |
| Registries and facets, who fires and who registers | tracked | F11 |
| Component mounts | tracked (static tags) | F17 |
| Tests (imports, mocks, e2e, Rust integration, inline) | tracked | F6 |
| Module-level `$state` outside store objects; Svelte `onMount`/`onDestroy` | not tracked | blind spot |
| CodeMirror extensions wired by value (`ViewPlugin.fromClass`, `StateField.define`) | plain imports only | blind spot |
| Calls through stored callbacks, string ids, mod commands at runtime | not tracked | blind spot |
| Namespace imports, non-destructured dynamic imports | file level only | F3 |
| Rust trait dispatch, macros, methods with common names, items inside inline modules | not tracked | blind spot |
| Frontend-to-Rust events, frontend-only buses | none exist | blind spot |
| `rust-db.execute` receiver, DOM listener receiver | not resolved | blind spot |
| Settings key joins (`AppSettings`, `DEFAULT_SETTINGS`) beyond `settingsStore` members | not tracked | blind spot |
| Unresolved bindings | counted on the file | F3 |

## 9. Query CLI

`node scripts/codemap.mjs q <command> <arg> [options]`. Builds the model from the working tree on every call (same `buildModel` as the generator), so it is current on any branch. No cache; add one under `node_modules/.cache/codemap/` keyed by the inputs hash only if a measured query exceeds 3 s.

ID arguments accept every form in section 4; `in`-short forms with `--file`; `ipc:`, `event:` and `dto:` IDs; `EVENT_NAMES.KEY` and `*_EVENT` names.

| Command | Answer |
|---|---|
| `q help` | Commands, one-line grammar each, ID forms. |
| `q sym <name> [--match]` | Definitions with that exact name (TS export or local, store member, component, Rust item, `Type::method`) as `sym`/`local` lines. `--match <substring\|/regex/>`: case-insensitive name search, ranked (exact, prefix, substring), then production importer count desc, then ID. |
| `q file <file> [--section <name>]` | The card, computed live; one section with `--section`. |
| `q importers <file\|symbol> [--tests]` | File: `imp` lines into it. Symbol: `by` lines (all, uncapped up to `--limit`). |
| `q deps <file\|module>` | Outgoing `imp` lines or `dep` lines. For a test file: the sources it imports or mocks. |
| `q callers <id> [--tests]` | F4 uses into the ID as `call`-grammar lines: functions, store members (readers, writers, and writers via `w-via`), components (mounts), Rust items (`lexical`, `lexical-method`), `ipc:` (TS call sites), `event:` (listeners and emitters). |
| `q calls <symbol\|file>` | Outgoing `call` lines. |
| `q impact <file\|symbol> [--depth N] [--tests]` | Reverse closure, default depth 2, max 6. Depth 1 in full (to the limit); depth ≥ 2 summarized: count, module counts, top 10 files by hub rank. Symbol hops follow use edges to the enclosing scope; from `(module)` continue to the file's importers (`via-file`); from `(script)`, `(markup)` or a reactive scope of a component continue to its mounts (`via-mount`); from a Rust `cmd` continue to its TS call sites (`via ipc:<cmd>`). File: reverse import edges. `--tests`: test files that import or use any impacted node. |
| `q path <A> <B>` | Shortest import path (files or modules), BFS with neighbors in code-unit order; each hop as its `imp`/`dep` line. Falls back to B → A and says so; else `no path`. |
| `q flow <A> <B> [--depth N]` | Shortest runtime path over the F14 symbol graph (calls, refs, mounts, IPC, events, registry fires, store state), A and B being symbols, files (any symbol in it) or modules. BFS, neighbors ordered by (edge kind: call, ref, mount, fires, state, ipc, event; then target ID); default depth 12. Each hop: `<edge kind> <loc> <from id> -> <to id>`. Example: `saveFileByPath` → `writeTab` (call) → `notifyAfterSave` (call) → `registerSearchIndexHook` (fires) → `ipc:update_search_index_file` → Rust. Else `no flow within depth N`. |
| `q ipc <command>` | The `ipc` line split into one fact per line. |
| `q event <name\|CONST\|EVENT_NAMES.KEY>` | The `event` line split, with `ev` pairs. |
| `q store <store\|store.member>` | Members with readers, writers and `w-via`; for one member, every site. |
| `q sink <sink\|class> [--up N]` | `fx` sites of a sink or class. `--up N` (max 3) adds, per hop, the callers of each enclosing symbol: TS by F4; Rust by F16/F20 (`lexical`); a Rust `cmd` by its TS call sites (`via ipc:<cmd>`). |
| `q tests <file>` | `test` lines; Rust adds integration tests and `t:inline`. |
| `q hubs [--layer L] [--module M]` | Files by hub rank. |
| `q reg <registry>` | The `wiring.md` block of one registry or facet. |

Output rules:
- Plain lines in the shard grammar, full IDs, `path:line` on every fact. Line 1: `# <command> <resolved id> total <n> (prod <n>, tests <n>)`.
- `--limit N`, default 50. When cut, the last line is `more <k> not shown (total <n>): rerun with --limit <n>, or narrow with --module <m>`.
- `--module <m>` filters results to a module.
- Unknown argument: exit 1, `no match for '<arg>'; did you mean:` and up to 5 candidates ranked by (exact case-insensitive, prefix, substring, Damerau-Levenshtein distance ≤ max(2, ⌊len/4⌋)), ties by code unit. A bare name matching several IDs: exit 1 with `ambiguous: rerun with one of` and the IDs. Usage error: exit 2 with the `q help` text. Found: exit 0; an empty result prints `none (no static reference found; see Blind spots in codemap/INDEX.md)`.
- No color, no JSON, no tables. At the default limit output stays under Bash's ~30,000-char inline limit (50 lines × ≤ 400 chars); `q file` on a card over 28 KB prints a hint to use `--section` or Read the card.

## 10. `INDEX.md` template

Everything is generator template except `<…>` values. At most 200 lines.

```
# Kokobrain code map
> Generated from the code by scripts/codemap.mjs; no hand-written text. inputs=sha256:<12hex> · check freshness: node scripts/codemap.mjs --stale · written by CI on main only; never edit or stage codemap/.

Use this map to find code, then Read the code at the given path:line. Facts are static; read "Blind spots" before trusting an empty answer. On a branch, cards of files you changed lag the code; q commands read the working tree and are always current.
Search code with Grep path src or src-tauri; search the map with path codemap. IDs contain regex characters: grep with -F and end the ID with a space.

## Find things
- A file you know: codemap/files/<repo path>.md (e.g. codemap/files/src/lib/features/tags/tags.service.ts.md): imports, importers, tests, symbols with users, local functions, calls, store members, effects.
- A symbol by exact name: node scripts/codemap.mjs q sym <name> · by part of a name: q sym --match <part>
- A module: codemap/modules.md (one line per module), then codemap/modules/<module>.md
- Most-imported files per layer: "Hubs" below, or q hubs --layer <layer>

## Graph questions (run these instead of reasoning over lists)
- Who imports a file or symbol: q importers <id> [--tests]
- What a file or module depends on: q deps <id>
- Who calls, reads or writes a symbol: q callers <id> [--tests] · what a function calls: q calls <id>
- Blast radius of a change: q impact <id> --depth 2 [--tests]
- How control or data gets from A to B at runtime (calls, observers, IPC, events, store state): q flow <A> <B>
- How file A imports its way to B: q path <A> <B>
- Grep alternatives: grep -rF -- '-> <file> ' codemap/files (importers) · grep -rF -- '-> <symbol id> ' codemap/files (callers)

## Cross-language and side effects
- IPC command (TS call -> Rust fn, contract keys, mocks): codemap/ipc/commands.md or q ipc <command>
- Rust -> frontend event (emits, listeners, payload): codemap/ipc/events.md or q event <name>
- Rust type mirrored to TS (commands returning it, nested DTOs, e2e mocks): codemap/ipc/dto.md
- Store state, who reads it, who writes it: codemap/stores.md, q store <name>
- Disk writes and reads, frontend and Rust: codemap/effects/disk-write.md, codemap/effects/disk-read.md, q sink disk-write --up 2
- Timers, debounce calls and their delays: codemap/effects/timer.md
- Svelte $effect sites: codemap/effects/reactive.md · DOM listeners: codemap/effects/dom.md · SQLite writes: codemap/effects/db.md · Tauri dialogs, opener, window, http: codemap/effects/host.md · Rust spawns: codemap/effects/spawn.md
- Observer lists, hooks, CodeMirror facets (who registers, who fires): codemap/wiring.md, q reg <id>

## Tests
- Tests for a source file: test lines in its card, or q tests <file>
- Sources a test covers: q deps <test file>

## IDs
file = repo path · location = <file>:<line> · symbol = <file>:<name> · member = <file>:<object>.<member> · component = <file>:default · Rust method = <file>:<Type>::<name> · scopes = <file>:$effect@<line>, <file>:<var>=$derived, <file>:(module), (script), (markup) · module = folder path · ipc:<command> · event:<name> · dto:<Name> · sink = <origin>.<api>
Line tags: <generated list>. "-" means no static reference found, not "unused". "in <name>" names a function in the same file as the line's location.

## Blind spots (fall back to Grep or Read)
<one line per "not tracked" row of the generator's blind-spot table>

## Hubs (production importers, test importers)
<hub lines, top 3 per layer>

## Counts
files <n> (cards <n>) · modules <n> · symbols <n> · locals <n> · calls <n> · ipc <n> · events <n> · dto <n> · stores <n> · registries <n> · effect sites <n>

## Optional
- Layer rules, layer edge totals, baseline debt: codemap/modules.md
- Every effect class: codemap/effects/
```

The CLAUDE.md row (section 3) is not part of the map; there is no other mention elsewhere.

## 11. Generation, CI, freshness, branch safety

**`scripts/import-graph.mjs`**, behavior-preserving: export `codeRegions`; split `extractImports(file, text)` into `extractImportsFromSource(sf, lineOffset)` plus the existing wrapper; export `ruleFor`.

**Write safety.** `codemap/` (or `--out`) is replaced only when it does not exist, is empty apart from `.git`, or holds an `INDEX.md` whose line 1 is `# Kokobrain code map`. Otherwise the build throws and names the folder. The INDEX is the marker, so every output file is `.md`.

**In-place writes only on main.** Without `--out`, or with `--out` resolving to `<repo>/codemap`, the build writes only when `git rev-parse --abbrev-ref HEAD` prints `main` or `CI=true`. Otherwise it exits 2 with `codemap/ is written by CI on main; use q (live) or --out <dir>`. This decides whether it writes, never the bytes.

**Workflow `.github/workflows/codemap.yml`** (replaces `architecture.yml`):
- `on: push: branches: [main]`, `paths:` `src/lib/**`, `src/routes/**`, `src/tests/**`, `e2e/**`, `src-tauri/src/**`, `src-tauri/tests/**`, `scripts/codemap.mjs`, `scripts/codemap/**`, `scripts/import-graph.mjs`, `package.json`, `pnpm-lock.yaml`, `.github/workflows/codemap.yml`; plus `workflow_dispatch`. Pushes made with `GITHUB_TOKEN` start no workflow (GitHub docs, checked by the impl critique), so the bot commit cannot loop.
- `if: github.ref == 'refs/heads/main'`; `concurrency: { group: codemap, cancel-in-progress: false }` (a burst of pushes leaves at most one pending run); `permissions: contents: write`; `timeout-minutes: 10`.
- Steps: `actions/checkout@v7.0.1`; `./.github/actions/setup` with `mods-repo-read-token: ${{ secrets.MODS_REPO_READ_TOKEN }}` (declared `required: true` in `.github/actions/setup/action.yml`) and `rust: "false"`; then up to 3 attempts of:
  1. `git fetch --depth 1 origin main && git reset --hard FETCH_HEAD` (build from the tip, never rebase).
  2. If `pnpm-lock.yaml` differs between `$GITHUB_SHA` and `HEAD`, stop with success: installed `node_modules` may not match, and that newer push runs its own job.
  3. `node scripts/codemap.mjs`; `git add -A codemap`; if `git diff --cached --quiet`, print `codemap unchanged` and stop.
  4. Commit as `github-actions[bot]`, subject `chore(codemap): regenerate for $(git rev-parse --short=9 HEAD)`, body `Inputs hash <12hex>. Generated by scripts/codemap.mjs; no hand edits.`; `git push origin HEAD:main`. On success stop; on rejection go to 1.
  After 3 rejections the job fails.
- `main` has no branch protection or ruleset today, so a `GITHUB_TOKEN` push works.

**`scripts/release.sh`**: the changelog drops bot commits: after `COMMITS=$(git log … --oneline --no-decorate)`, filter `grep -v -E '^[0-9a-f]+ chore\(codemap\)'` (keeping the existing empty-check after it).

**Local use:** `q` works on any branch; `--stale` says whether the committed map matches the tree and which inputs changed; `--out /tmp/x` renders elsewhere.

## 12. Removals and edits outside the generator

Delete:
- `docs/architecture/` (README.md, overview.md, groups/, modules/; generated/ is untracked).
- `scripts/architecture-map.mjs`, `scripts/architecture-graphify.sh`, `scripts/architecture-graphify.requirements.txt`, `.github/workflows/architecture.yml`, `.graphifyignore`.
- Generator parts not carried over: `parseCurated`, `validate`, `--check`, `namedPaths`, `linkify`, the `yaml` import (the package stays; other code uses it), `overview`, `groups`, `GROUPS`, `groupOf`, `orphanDocs`, nested doc modules, `rolesText`, Mermaid (`moduleDiagram`, `DIAGRAM_NEIGHBORS`, `nodeId`), Markdown links, `--link-base`, `--source`, `--graphify`, `KEEP` (`graphify`; `.git` stays protected), the `.architecture-map` marker, `graph/modules.json`, the regex `commandCalls`, `stripComments` and `rustModuleRefs`, per-module IPC tables.

Edit:
- `.gitignore`: remove `docs/architecture/generated/` (and its comment line) and the six graphify lines (`graphify-out/cost.json`, `graphify-out/cache/`, `graphify-out/.graphify_python`, `graphify-out/.graphify_root`, `graphify-out/.rebuild.lock`, `docs/graphify-tauri/`).
- `.gitattributes`: replace `graphify-out/graph.json merge=graphify` with `codemap/** linguist-generated=true`.
- `CLAUDE.md`: the section 3 row replaces the `docs/architecture/README.md` row (line 254).
- `docs/README.md:29`: remove the "Architecture Map" row.
- `scripts/release.sh`: the filter in section 11.
- `src/tests/lib/architecture/architecture-map.test.ts` → `codemap.test.ts` and `codemap-query.test.ts`.
- Leave `docs/adr/0003-four-layer-source-taxonomy.md` and `.scratch/` mentions as they are.

Owner actions, not part of the change: delete the remote `architecture` branch; optionally record the decision in an ADR.

## 13. Ordering and determinism

1. Sort with `cmp` (code unit). No `localeCompare`, `Date`, `os.` in `scripts/codemap*`.
2. Sort `readdirSync` results; iterate a Map or Set only after sorting its keys.
3. Orders: modules by path; files by path; `imp` by (importer, line, target); symbols and locals by (file, line, name); `by` by (user file, line); `call` by (enclosing line, site line, target); store members in source order; tests mirrored first then (relation, path); `ipc/*` by name; `fx` by (sink, file, line) in effect shards and by line in cards; hubs by the F14 key; BFS neighbors by the stated key.
4. No absolute paths, environment variables or locale-dependent APIs in output; POSIX paths; no `\r`. Git calls affect only the `--stale` message and the write refusal.
5. Token estimate in `modules.md`: `Math.round(bytes / 300) / 10`. Cards render before `modules.md` and INDEX.
6. Doc and code excerpts verbatim after D3 or whitespace collapse; tabs and newlines become a space.
7. The model is built from path-sorted data, so input order does not matter; the CLI uses the same model and keys.

## 14. Tests

`src/tests/lib/architecture/codemap.test.ts` (generator) and `codemap-query.test.ts` (CLI): temp fixture repos plus real-repo blocks. Keep the existing `discoverModules`, `moduleOf`, `fileRole`, `handlerCommands` tests and the `.git` safety test; replace the marker test with the INDEX-marker test (52); delete the `graphify` keep test, the curated-doc and `validate` tests. Other files in `src/tests/lib/architecture/` are unchanged.

Extraction:
1. `firstSentence`: stops at ". B"; not at "e.g. Bar", "i.e. X", "etc. Y", "`a.B`"; blank-line cut; `{@link Foo}` → "Foo", `{@link Foo | the foo}` → "the foo"; 160 cap with `…`; empty → empty.
2. Export forms and lines (`export function`, `export async function`, `export const a = 1, b = () => {}`, class extends, interface, type, `<script module>` export, instance-script `export function` → `method`) in `.ts` and `.svelte` with a script offset; spans.
3. JSDoc placement: declarator versus statement; last of two blocks; none → no doc.
4. File header: before an import taken; two leading blocks take the first; a single block on the first declaration is not a header.
5. Signature: collapsed, cap 120; `= dedupeInflight(…)`; no inferred return type.
6. Props: `let { a, b = 1, c = $bindable(), ...rest }: Props = $props()` → `props:a,b=,c=$bindable,...rest`; none → no field.
7. Locals: non-exported function declaration and const arrow → `local` lines with signature and span; exported ones are not locals.
8. Barrels: two-hop aliased `export {a as b} from`; `export *` first source in order; cycle terminates; `contracts/generated/T.ts` → `dto:T`; `const { x } = await import('./m')`; `import Root from './b.svelte'; export { Root as Button }` → the component; package re-export → `external:<pkg>`.
9. Public/internal: test-only → internal; cross-module importer → public.
10. `by` lines: location is the first use site with its enclosing and kind; type-only importer → specifier element line with kind `import` (multi-line `import {` fixture); cap 8 then a `more` line with `q importers`.
11. Uses: imported `foo()` → `call`; same-file `helper()` → `call` to `<file>:helper`; `debounce(helper, 300)` → `ref`; `Obj.m()` within the file → `call` to `<file>:Obj.m`; parameter named like an import → no use; `const { x } = await import('./m')` then `x()` → use of `m:x`.
12. Markup: `{fmt(a)}` → `call`; `onclick={toggle}` → `ref`; a prose word equal to an import name outside braces → no use; `<!-- fmt() -->` and `<style>` ignored.
13. Stores: `s.x` read; `s.setX()` write; `s?.x`; `const { a, b } = s` two reads; markup `{s.x}` read; markup `s.setX(…)` write; markup `onclick={s.close}` write; `s` passed → `esc:1`; `s.x = v` → `assign` writer; `w-via`: a getter returning `tabs` lists `addTab` (`tabs.push`) and `removeTab` (`tabs.splice`) but not `setActiveIndex`; through a module-level `$derived`.
14. Enclosing: declaration; const arrow; `obj.method`; class method; anonymous callback inside `foo` → `foo`; `$effect(() => s.x)` → `$effect@<line>`; `const y = $derived(s.x)` → `y=$derived`; `const t = debounce(() => g(), 300)` → `t`; `(module)`; `(script)`; `(markup)`.
15. IPC callers: aliased `call as ipc` found; `call('x')` in a comment not; no-argument and non-literal not; shadowing param `call` not; `ipc-call` text identical on the TS and Rust card.
16. IPC join: `quick_capture::commands::x` → `quick_capture/commands.rs`; `a::b::x` → `a/b/mod.rs`; `!no-rust-fn`, `!no-contract`; key sites in `src/lib` and `e2e`.
17. Events: multi-line `emit_to(LABEL,\n X_EVENT, ())` counts with enclosing fn; multi-line `use events::{…}` does not; in a comment or string does not; `on(EVENT_NAMES.K, …)` maps through the value; `ev` text identical on both cards.
18. DTO: `returned-by` from a `CommandMap` result type text; nested generated import → `contains`/`in`; e2e type import → `e2e` location.
19. Rust lexer: raw and multi-line strings keep depth; `'a` vs `'{'`; nested block comments; multi-line `#[derive(\n…)]` between `///` and item keeps the doc; `#[cfg(test)] mod tests { pub fn t() {} use crate::x::Y; use super::*; }` → no item, no edge; `impl Foo { pub fn bar() }` → `Foo::bar`; `impl Foo<'_> { pub fn baz() }` → `Foo::baz`; `impl T for Foo` → nothing; `pub(crate) fn` → `fn(crate)`; private fn → `local`; `#[tauri::command] pub async fn` → `cmd`; `#[ts(export)]` → dto flag; `super::x` inside inline `mod m {` resolves against `m`'s parent module.
20. Rust uses: `use crate::a::{b::{C, D as E}, f::*};` gives C, D (alias E), `*`; `super::x` from `a/b.rs` under `a/`; inline `crate::a::b::f()` edge; `mod x;` none; item importers on the defining card.
21. Rust calls: `vault_fs::write_atomic(` via a module alias → `lexical`; `NoteEntry::from_content_full(` → that method; `.update_entry(` with a unique underscore name → `lexical-method`; `.store(` and `.is_empty(` → none; same-file `helper(` and `self.helper(` → `call`.
22. Rust tests: `use kokobrain_lib::vault::index::{VaultIndex}` → `vault/index.rs`; `#[cfg(test)]` → `t:inline`.
23. Test mapping: multi-line `vi.mock('#lib/x.js', …)` → `mocks`; mock + import → `mocks`; `import type` → no row; package mock → no row; relative `vi.mock('../x')`; e2e non-type import → `e2e`; `mirror` only for the mirrored path.
24. Registries: positives (push + returned arrow; `list = [...list, x]` + returned arrow); negatives (`.set` cache without returned fn; returns a call result; arrow nested in an inner fn); `read-by` includes `for…of`, excludes `.length = 0`; `fired-by` through a local chain (`notify` local ← `handle` local ← exported `start`); `fired-by` through a getter → the getter's readers; `registered-at` `args=` and `->` callback for an identifier, an object literal of identifiers, and an inline arrow (→ enclosing fn); `invoked-at` one hop.
25. Facet: `Facet.define` + `f.of(v)` elsewhere → `registered-at` and a `reg` line.
26. F14: three files imported by 3, 2, 2 production files and 0, 1, 0 tests → hub order; type-only importers count; test imports create no module edge; entry-file order; `in2` excludes direct importers and self; hubs per layer in INDEX, none on cards.
27. F15 Tauri: named, aliased and namespace calls → `tauri-fs.writeTextFile` `disk-write`; `exists` → `disk-read`; dialog `ask` → `host`; a same-named local function is not a sink.
28. F15 timers: `setTimeout(f, 300)` → `delay=300`; `window.setTimeout`; an imported `setTimeout` binding not; `$effect`/`$effect.pre`; `el.addEventListener('keydown', …)` → `dom.keydown`; `<svelte:window onkeydown={h}>` → `dom.keydown` arg `svelte:window`.
29. F15 timer wrappers: an exported `debounce(fn, delay)` using `setTimeout(fire, delay)` is a wrapper; one using a module const delay is not; `const t = debounce(() => g(), 300)` → `fx … timer-wrap.debounce args=() => g(), 300 as t in t`.
30. F15 Rust: `std::fs::write(` and `fs::write(` with `use std::fs;` count; `fs::write(` with `use crate::utils::fs;` not; inside `#[cfg(test)]` not; `tokio::fs::rename(` → `rust-tokio-fs.rename`; `.execute(` → `rust-db.execute`; `tauri::async_runtime::spawn(` → spawn.
31. F17 mounts: `<TagItem foo>` and `<TagItem/>` count; `<TagItemList>` not; inside `<!-- -->` not; `mount` text identical on both cards.

Format and caps:
32. Grammar: every non-heading line starts with a known tag; every location matches `^[^ ]+:\d+$` and points into an existing file; no `](`, no Mermaid fence, no `|` outside `ipc/*` separators and the `| doc` suffix, no tabs, no `\r`, no trailing spaces; on fact lines (not `cols:` lines, not INDEX prose), no space-separated token of the form `<…>` outside a signature, a `| doc` suffix or an `args=`/`delay=` excerpt.
33. ID spelling: every printed path is in the inventory; every symbol ID in `by`, `call`, `reg` exists in the model; every `ipc:`, `event:`, `dto:` token resolves.
34. Edge symmetry: for production-to-production `imp` pairs where the target has a card and its `imported-by` is not capped, the line is byte-identical on both cards; for every target, `grep -F -- '-> <file> '` over `codemap/files` (including `more` counts) equals the model's importer count; `dep`, `mount`, `ipc-call`, `ev` lines are identical at both ends.
35. Caps: a fixture with 60 importers, 20 `by` users, 50 tests and a 300-site store member renders the `more` lines with the right `q` commands and no line over 1000 chars; a card over 40 KB moves its `calls` section to `<file>.calls.md` with a `more calls` line; a card that still breaks a cap throws with the file name.

Golden and determinism:
36. Golden fixture: `core`, `features`, `plugins`, `app`, `routes`, `contracts` (ipc, commands, events, index barrel, generated), `utils` with `debounce`, a Tauri plugin-fs write, a `setTimeout`, an `$effect` and a `$derived` reading a store, a store with `w-via`, a registry with a local `fired-by` chain, a component mounted in another with a markup call, one test with `vi.mock`, one with an import, `e2e/mocks` with a keyed table and a DTO type import, a Rust crate with `generate_handler!`, `events.rs`, a `ts(export)` struct, a `cfg(test)` module with `use super::*`, a `std::fs::write`, a `use crate::…` edge, a same-file call, a unique-method call and `src-tauri/tests`. Output equals checked-in expected strings byte for byte for `INDEX.md`, `modules.md`, one module card, a TS card, a component card, a Rust card, `ipc/*`, `wiring.md`, `stores.md`, `effects/disk-write.md`, `effects/timer.md`.
37. Determinism: two runs identical; reversing every input list inside `buildModel` (test hook) identical; a CLI run with `LC_ALL=tr_TR.UTF-8 TZ=Pacific/Kiritimati` identical; no output contains the absolute repo root, `\r` or a date pattern.
38. Source scan: no `localeCompare`, `Date` or `os.` in `scripts/codemap.mjs` or `scripts/codemap/*.mjs`.
39. Inputs hash and `--stale`: a one-byte input change changes the hash; `--stale` exits 0 after a run, 1 after an edit, 1 without INDEX; in a fixture git repo it lists the changed input.

Real repo:
40. Line pointers: every location on `sym`, `local`, `mem`, `mount`, `call`, `by`, Rust items, IPC rust and handler sites, emits, listens and `fx` lines points at a line containing that name, the event const or key, or the sink API name; `imp` locations point into the import statement's line range.
41. Completeness: `ipc/commands.md` set = `generate_handler!` = `CommandMap` keys, no `!` flags; events = `*_EVENT` consts = `EVENT_NAMES` values, each with ≥ 1 emit and ≥ 1 listen; DTO count = `#[ts(export)]` count; every `*.store.svelte.ts` yields a store; module cards = `discoverModules`; file cards = production inventory minus `components/ui` and `contracts/generated`.
42. Unique placement: `sym` lines across cards equal an independent count of exported declarators plus non-ui components (TS parser in the test), no duplicates.
43. Known facts:
   - `buildTagIndex` `by` includes `src/lib/app/lifecycle/app-lifecycle.service.ts` with enclosing `initializeVault` and a line inside that function.
   - `get_all_tags_v2` callers include `src/lib/features/tags/tags.service.ts:30 in buildTagIndex`; the same `ipc-call` line is on `codemap/files/src-tauri/src/commands/vault.rs.md`.
   - `effects/timer.md` has `src/lib/features/tags/tags.service.ts:90 timer-wrap.debounce` with `300` in its args and `as debouncedTrigger`, and `src/lib/core/editor/editor.service.ts:276` with `2000`.
   - `wiring.md`: sinks include `registerNoteChangeConsumer`, `registerPathChangeConsumer`, `addAfterSaveObserver`, `registerWriteBarrier`, `railRegistryStore.registerNavigator`; `addAfterSaveObserver` read-by includes `notifyAfterSave`; `onFileChange` fired-by includes `handleChangedPaths`; `railRegistryStore.registerNavigator` fired-by includes a site in `src/lib/app/AppShell.svelte`; `registerPathChangeConsumer` registered-at `event-calendar.service.ts:658` has `-> …:followPathChange`.
   - `q callers src/lib/core/layout/layout.service.ts:toggleRightSidebar` includes `src/lib/app/AppShell.svelte:192`.
   - `q callers src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout` includes `src/lib/app/AppShell.svelte:220` as a writer.
   - `editorStore.tabs` `w-via` includes `addTab` and `removeTab`.
   - `q callers src-tauri/src/vault/index.rs:VaultIndex::update_entry` includes `src-tauri/src/commands/vault.rs:343`.
   - No `imp` line `src-tauri/src/commands/debug.rs:… -> src-tauri/src/commands/mod.rs`.
   - `src-tauri/src/semantic/update_plan.rs:31` is a `sym` line for `UpdatePlan::is_noop`.
   - `q flow src/lib/core/editor/editor.service.ts:saveFileByPath src/lib/features/search/search.service.ts:registerSearchIndexHook` succeeds through `writeTab` and `notifyAfterSave`.
   - `hub` lines in INDEX include `src/lib/core/settings/settings.store.svelte.ts` among the top 3 of `core`.
   - `effects/disk-write.md` has a `tauri-fs.writeTextFile` line in `src/lib/core/editor/editor.service.ts` and a `rust-fs.write` line in `src-tauri/src/utils/fs.rs` `in write_atomic`.
44. Budgets: every file ≤ 48 KB, ≤ 1500 lines, every line ≤ 1000 chars; INDEX ≤ 200 lines and ≤ 12 KB. On failure print the 5 largest files with bytes, lines, est. tokens. Log p50/p95/max card size and elapsed time; assert only build < 15 s.
45. Unresolved bindings: printed grouped by target; every entry is `external:<pkg>` or in a short checked-in allowlist.
46. Write safety: refuses a non-empty folder without the INDEX marker; keeps `.git`; replaces a folder whose INDEX line 1 is the template.
47. In-place refusal: in a fixture git repo on branch `feat` without `CI`, `build` exits 2 and writes nothing; on `main` it writes; with `CI=true` it writes; `--out /tmp/…` always writes.

CLI (`codemap-query.test.ts`, fixture unless noted):
48. Each command gives the expected text exactly: `sym` (exact, `--match`), `file` (`--section`), `importers` (± `--tests`), `deps` (file, module, test file), `callers` (TS fn, local fn, store member reader/writer/`w-via`, component mount, Rust `lexical` and `lexical-method`, `ipc:`, `event:`, `--tests`), `calls`, `impact` (depth 1/2/3, `via-file`, `via-mount`, `via ipc:`), `path` (found, reverse, none, code-unit tie), `flow` (call, fires, ipc, event, state hops; none), `ipc`, `event` (name, const, `EVENT_NAMES.KEY`), `store`, `sink` (id, class, `--up 2` from `rust-fs.write in write_atomic` through a `cmd` to its TS caller), `tests`, `hubs` (`--layer`), `reg`.
49. Limits: 60 importers → 50 lines and `more 10 not shown (total 60)`; `--limit 100` shows all; `--module` filters.
50. Did-you-mean: `buildTagIndx` suggests `buildTagIndex` first; a name defined in two files → `ambiguous` with both IDs, exit 1; unknown command → exit 2 with help.
51. IDs: every path and symbol in CLI output exists in the model; `path:name`, `in name` with `--file`, and `<file>:<Basename>` for a component are accepted.
52. Consistency: for every fixture file, `q file <f>` equals `codemap/files/<f>.md` byte for byte.
53. Real repo, smoke and speed: `q importers src/lib/utils/debounce.ts` lists `editor.service.ts:9`, `app-lifecycle.service.ts:7`, `tags.service.ts:3`, `TypesNavigator.svelte:25`; `q path src/lib/features/tags/tags.service.ts src/lib/contracts/ipc.ts` is one hop; each query's wall time logged and asserted < 10 s.

Non-test checks (config and scripts): `actionlint` on `codemap.yml` if installed, else a YAML parse; run the `release.sh` filter line on a sample `git log --oneline`; after merge, one `workflow_dispatch` run of `codemap.yml`.

## 15. Implementation order (test-first)

Each step: write its tests (section 14 numbers), see them fail, implement, see them pass, then commit (repo rule: one commit per task, frontend gate `pnpm check` + `pnpm vitest run`).

1. `import-graph.mjs` exports (`codeRegions`, `extractImportsFromSource`, `ruleFor`) → existing `import-graph.test.ts` and `layer-rules.test.ts` stay green.
2. `scripts/codemap/ts.mjs` exports, docs, locals, F3 → tests 1 to 9.
3. F4 uses, markup, enclosing, shadowing → 10 to 14.
4. F5 stores with `w-via` → 13.
5. `rust.mjs` lexer, production text, items, uses, calls → 19 to 22, 30.
6. IPC, events, DTO, cross-language lines → 15 to 18.
7. F6 tests, F11 registries and facets, F15 effects, F17 mounts → 23 to 25, 27 to 29, 31.
8. `model.mjs` graphs and ranking → 26.
9. `render.mjs` cards, shards, caps, split, INDEX, write safety, refusal → 32 to 39, 46, 47; then real-repo 40 to 45.
10. `query.mjs` CLI → 48 to 53.
11. Removals and edits (section 12), `codemap.yml`, `release.sh` filter, CLAUDE.md row → non-test checks; full gate.
12. First CI run on main writes `codemap/`; then the evaluation (section 16).

## 16. Evaluation plan

Goal: show per model that the map improves discovery (right files and lines) at lower cost, and find where it does not.

Arms (fixed commit, throwaway worktrees):
- **with**: `codemap/`, the CLI and the CLAUDE.md row.
- **without**: same commit, `codemap/`, `scripts/codemap*` and the row removed.
- **shards-only** (optional): `codemap/` present, `q` removed.
- **delegated** (optional): the question goes to an Explore sub-agent from an Opus orchestrator, to measure whether the pointer reaches sub-agents.

Questions: 30 to 40, written against the code before any run, each with an answer key of files and key `path:line`s taken from the code and checked by the owner. Mix:
- Navigation (10): where the tag tree is built and what calls it at vault open; which debounce the editor save path uses and who else uses it; which component renders a tag row and where it is mounted.
- Cross-language (6): add a field to `TagAggregate` (every file on both sides); what runs in the frontend when the vault index updates.
- State and effects (8): who writes `editorStore.tabs`; every place the app writes a file to disk (frontend and Rust); what debounces the tag index rebuild and with what delay; which code writes SQLite rows for file history.
- Callbacks (5): which features react after a note is saved and where they are registered; how a path rename reaches search, links and history; who fires file-watcher listeners.
- Multi-part change (6): add a "pinned tags" setting shown in the tags panel and persisted.
- Graph-dependent (5): what is affected if `src/lib/core/filesystem/fs.logic.ts` changes an export; how `features/tags` depends on `core/settings`; the entry points of `core/markdown-editor`.

Protocol: headless Claude Code, fresh session per (question, model, arm, run), same prompt ("Find the code relevant to: <question>. Answer with file paths and path:line where you can."), fixed tool budget and turn cap; Haiku, Sonnet and Opus (current IDs at run time). Scoring by script against the key (no LLM judge): file recall and precision, Acc@5, share of exact `path:line` on the right line, input and output tokens, tool calls, wall time, cost, map and CLI usage (reads under `codemap/`, `q` calls), and Grep calls whose hits under `codemap/` the agent did not use (token cost of the map's Grep noise). Analysis: per model and category, paired difference with bootstrap 95% CIs over questions (about 9% run-to-run noise reported). Budget and pass bar: Owner question 2.

## 17. Out of scope

- Keyword, term or UI-string indexes (owner decision 1). `q sym --match` searches identifiers taken from code only and writes no index.
- Writing raw F4 rows or a full edge list to disk.
- A cached model file.
- `svelte/compiler` markup parsing.
- Mirror key-set clustering, a settings join, `conventions.md`, `model.json`.
- PageRank.
- SCIP / type-resolved references (scip-typescript, rust-analyzer): a possible later layer.
- Sharing the Rust signature parser with `ipc-parity.test.ts`.
- An attribute-aware `<script>` open-tag regex (0 cases; the line-pointer test fails loudly if one appears).
- A pre-commit guard for `codemap/`.

## 18. Not checked and risks

Not checked:
- Token counts are `bytes / 3` estimates.
- Card sizes with the new `calls`, `locals` and per-user `by` lines are estimated from the v2 prototype (no calls, approximate grammar) plus the aiu `calls.mjs` sizes; only the budget test on the real build settles them. `event-calendar.service.ts` is expected to use the calls split; `lens.logic.ts` (23.7 KB prototype + 14 KB calls) may come close to 40 KB.
- The `RUST_STD_METHOD_NAMES` list is from memory of Rust std; a crate-unique underscore name that collides with an external crate method would give a false `lexical-method` line (marked as such).
- CLI time per query is estimated (1.5 to 2.5 s); CI runs Node 22.17 (setup action), not timed.
- Whether Explore sub-agents can run `node scripts/codemap.mjs` (Bash permissions) and whether Codex's sandbox allows it: from memory.
- The ordering of Grep results (mtime) between map and source hits.

Risks:
- Nearly every code push to main is followed by a bot commit (line numbers change), so main moves about twice as often; relay-lite deliveries rebase onto it cleanly (no branch touches `codemap/`), but this adds to "deliver starved by main commits" retries.
- Committed shards add Grep hits for plain symbol searches (in the v2 prototype, `applyNoteChange` appeared in 19 map files against 29 source files). The INDEX and CLAUDE.md row tell agents to Grep `src`/`src-tauri`; the evaluation measures the cost. Hiding the map from ripgrep (`.ignore`, `.rgignore`) is rejected because Grep would then skip it like a gitignored file.
- On a branch, cards lag the code for changed files until merge; INDEX and `--stale` say so, and `q` is live.
- Agents may not use the map; the evaluation measures usage.
- The repo grows by about 3 MB plus history churn of bot commits.

## 19. Critique resolution

AI-usability critique (`critique-ai-usability.md`):

| # | Item | Decision | Reason |
|---|---|---|---|
| 1 | Same-file calls untracked | accept | Reproduced 2373 calls, 1225 local fns; one more lookup per call in the same walk (F4, F20, `local` lines); `via-file` now only from `(module)`. |
| 2 | `fired-by` empty for 10 registries | accept | Reproduced 21 of 25 with no exported read-by; local chain climb and getter readers (F11). |
| 3 | `q path` follows imports only | accept | Added `q flow` over calls, refs, mounts, fires, state, IPC, events; `q path` kept for imports. |
| 4 | `by` points at imports; no outgoing calls | accept | `by` uses the first use site with enclosing; `calls` section (646 KB total) with a split rule for the one oversize card. |
| 5 | Debounce answer wrong | partial | Const-initializer enclosing accepted; wrapper rule narrowed to "delay from own parameter" (1 wrapper) because "contains a timer" matches 14 fns incl. `appendLog`. |
| 6 | Markup calls invisible | accept | Reproduced 190 markup-only bindings; same regex for all bindings, limited to `{…}` spans to avoid prose hits. |
| 7 | Cross-language not incident at both ends | accept | `ipc-call` and `ev` lines identical on TS and Rust cards (F18). |
| 8 | Rust method calls invisible | partial | `Type::method(` and unique underscore names accepted; names without `_` rejected (`build`, `store`, `entries` collide with std/builders, seen in `rm.mjs`). |
| 9 | Reactivity labeled `(script)` | accept | `$effect@<line>` and `X=$derived` scopes; plus `w-via` getter-to-mutator links so state flow is traceable. |
| 10 | Map adds Grep hits | partial | Guidance in INDEX and CLAUDE.md row plus an eval metric accepted; ripgrep ignore files rejected (would hide the map). |
| 11 | Sub-agents and Codex miss the pointer | partial | CLAUDE.md row tells the orchestrator to pass it on; delegated eval arm added; AGENTS.md is Owner question 1 (decision 7 says "if it exists"). |
| 12 | Namespaced IDs never printed | accept | F19; card tag renamed `ipc-call`. |
| 13 | One-spelling exceptions | accept | Full `path:line` everywhere, no angle brackets, `<file>:<Basename>` alias for components. |
| 14 | No locals or spans | accept | `local` lines and `L<span>` on `sym`/`local`; about 110 KB. |
| 15 | DTO consumers under-reported | accept | `returned-by`/`arg-of`, `contains`/`in`, e2e locations; e2e files become graph nodes (3 import `src/lib`). |
| 16 | `registered-at` lacks the callback | accept | `args=` excerpt (cap 80) and resolved `->` callback. |
| 17 | No partial-name entity search | accept | `q sym --match`; identifiers from code, no index written, so not the forbidden term index. |
| 18 | Grep recipes match prefixes | accept | `-F` and trailing space in every recipe. |
| 19a | Test 31 contradicts caps | accept | Symmetry asserted only for uncapped pairs; completeness by grep count (test 34). |
| 19b | `q callers` lacks `--tests` | accept | Added. |
| 19c | `q file` near Bash inline limit | accept | `--section` and a hint over 28 KB. |
| 19d | Hubs led by utils | partial | Hubs shown per layer (top 3 each) rather than dropping `utils`. |

Implementation critique (`critique-implementation.md`):

| # | Item | Decision | Reason |
|---|---|---|---|
| 1 | Grouped lists break the line cap; overflow cannot fix it | accept | Reproduced 5 lines over 1000; fixed caps with at most 8 groups, one pass, no re-render loop. |
| 2 | Markup-only imports invisible; `svelte:window` handlers | accept | Same fix as AIU 6; `svelte:window|document|body on…` as `dom` sites (4 files). |
| 3 | Markup store writes recorded as reads | accept | Reproduced 107; `do` call or `do` ref in markup is a writer. |
| 4 | `hub#` churn | accept | Reproduced 257 of 730 ranks changed; ranks only in INDEX and `q hubs`. |
| 5 | Rust test modules leak edges; `super` in inline mods | accept | Reproduced 35 test-only edges; production text for all Rust rules, module-path-aware `self`/`super`. |
| 6 | CI retry fragile, missing token, non-md marker | accept | Fetch-and-reset loop from the tip, token passed (verified `required: true`), INDEX as marker so all output is `.md`; skip on lockfile change added. |
| 7 | Guard blocks merges; INDEX invites regeneration | partial | Guard dropped instead of made merge-aware; build refuses in-place writes off main; "regenerate" removed from INDEX. |
| 8 | `--up` does not cross IPC | accept | `cmd` hop to TS callers in `--up`, `impact` and `flow`. |
| 9 | Bot commits flood releases | partial | `release.sh` filter accepted; `sleep 120` rejected (concurrency plus build-from-tip already coalesce bursts). |
| 10 | Test 31 contradicts rules | accept | Same as AIU 19a. |
| 11 | Multi-line import pointers | accept | `imp` checked by statement range; `by` uses the use site or the specifier element line. |
| 12 | Zero-instance writer kinds | partial | `bind:` writer dropped; `set` kind kept with one generic `assign` rule and one test. |
| 13 | `<script>` regex and `>` in attributes | reject | 0 cases today; global rule against code for theoretical cases; test 40 fails loudly if it appears. |
| 14 | `impl Type<…>` missed | accept | Real miss (`update_plan.rs:28`); header regex widened, test 19. |
| 15 | Shadowed import names | partial | Parameter and local-declaration check accepted; `fs.service.ts:253` is a dynamic-import binding of the same module, so it resolves, not shadows. |
| 16 | Svelte instance-script exports | accept | `method` kind on the component card; test 42 counts it. |
| 17 | Shell and regex metacharacters in IDs | accept | `-F`, trailing space, quoted paths in recipes. |
| 18 | Wrapper delays lost | accept | Wrapper call sites are `fx` lines with `args=` (F15). |
| 19 | Verified, no change | accept | No change. |
| 20 | Scope summary | accept | Applied through the items above. |

## 20. Owner questions

1. **AGENTS.md for Codex.** Decision 7 says to add the pointer to AGENTS.md "if it exists"; none exists, and Codex reads only AGENTS.md (32 KiB chain), so Codex never learns the map exists.
   - (a) Create `AGENTS.md` with the same single row. Codex sees the map, and there is one more file to keep in sync.
   - (b) Leave it absent; prompts that hand work to Codex must carry the line.
   Recommendation: (a). Codex is a named reader in decision 1, and the research shows that naming a tool in the context file is what raises its use.
2. **Evaluation budget and pass bar** (global rule 6: the agent count comes from the owner). 35 questions × 3 models × 2 arms × 3 runs = 630 sessions; with the shards-only and delegated arms, 1260.
   - (a) Pilot only: 12 questions × 3 models × 2 arms × 2 runs = 144 sessions, to check the harness and scoring.
   - (b) Pilot, then the full 630.
   - (c) Pilot, then full plus both optional arms (1260).
   Proposed pass bar: with ≥ without on recall for every model, and either ≥ 10 points better recall on graph-dependent and cross-language questions or ≥ 25% fewer tokens at equal recall.
   Recommendation: (b), adding the delegated arm only for Sonnet in the full run (+105 sessions), because discovery here is usually delegated.

## 21. Owner answers (2026-11-12)

1. AGENTS.md: create it with the same single pointer row as CLAUDE.md (option a).
2. Evaluation: within budget. 24 questions with an answer key checked against the code; each eval agent answers 3 questions in one fresh session; arms with and without the map; 16 Haiku + 16 Sonnet + 8 Opus agents; scoring by script, no LLM judge; one repeat round with Sonnet after fixes.
