# Kokobrain code map
> Generated from the code by scripts/codemap.mjs; no hand-written text. inputs=sha256:2f02433dd677 · check freshness: node scripts/codemap.mjs --stale · written by CI on main only; never edit or stage codemap/.

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
- Svelte $effect sites: codemap/effects/reactive.md · DOM listeners: codemap/effects/dom.md · SQLite writes: codemap/effects/db.md · Tauri dialogs, opener, window, http: codemap/effects/host.md · Rust spawns: codemap/effects/spawn.md · localStorage and sessionStorage: codemap/effects/storage.md
- Observer lists, hooks, CodeMirror facets (who registers, who fires): codemap/wiring/<layer>.md by the layer of the file that defines the sink (wiring/core.md, wiring/features.md, wiring/plugins.md), q reg <id>

## Tests
- Tests for a source file: test lines in its card, or q tests <file>
- Sources a test covers: q deps <test file>
- t<n> counts test files that import a file; imports-type (type-only) and example test lines are listed but not counted, harness lines count.

## IDs
file = repo path · location = <file>:<line> · symbol = <file>:<name> · member = <file>:<object>.<member> · component = <file>:default · Rust method = <file>:<Type>::<name> · scopes = <file>:$effect@<line>, <file>:<var>=$derived, <file>:(module), (script), (markup) · module = folder path · ipc:<command> · event:<name> · dto:<Name> · sink = <origin>.<api>
Line tags: file imp in2 out2 test sym by local store mem call mount fx reg ipc-call ev ipc event dto dep entry module layer rule debt fx-count ipc-count hub more. "-" means no static reference found, not "unused". "in <name>" names a function in the same file as the line's location. On a by line, +<n> counts the further sites in that user file, in any function; its card has every call line. A signature on a sym or local line is copied as written, " | " included; the doc follows the first " | " after L<span>. Elsewhere (ipc lines, args= and doc excerpts) " / " inside copied text stands for " | ".

## Blind spots (fall back to Grep or Read)
- Module-level $state outside store objects, and Svelte onMount/onDestroy: not tracked.
- CodeMirror extensions wired by value (ViewPlugin.fromClass, StateField.define): plain imports only.
- Calls through stored callbacks, string ids and mod commands at runtime: not tracked.
- Namespace imports and non-destructured dynamic imports: file level only, no symbol uses.
- Svelte $effect and $derived: direct store reads only, not reads inside the functions they call.
- Svelte markup: uses only inside {…} expressions; <svelte:component>, {@render} and <Ns.Item> are no mounts.
- Rust trait dispatch, macros and items inside inline modules: not tracked.
- Rust .method() calls: only pub methods with a crate-unique name that contains _ (lexical-method).
- Frontend-to-Rust events and frontend-only event buses: none exist, so none are tracked.
- The rust-db.execute receiver and the DOM listener receiver: not resolved.
- Settings key joins (AppSettings, DEFAULT_SETTINGS) beyond settingsStore members: not tracked.
- Imports of unparsed files (.js, .json, scripts): file edges only, no symbols.
- Class methods: only this.m() and C.m() inside the defining file; calls on instances, inherited methods and super.m() are not tracked.
- Test, e2e and crate example (src-tauri/examples) files: graph nodes for test lines and q --tests answers, no cards.

## Hubs (production importers, test importers)
hub app src/lib/app/rail-navigation.ts in3 t1
hub app src/lib/app/global-keybindings.ts in2 t1
hub app src/lib/app/boot.ts in1 t15
hub routes src/routes/composer/+page.svelte in0 t1
hub routes src/routes/(app)/+layout.svelte in0 t0
hub routes src/routes/(app)/+page.svelte in0 t0
hub core src/lib/core/vault/vault.store.svelte.ts in83 t150
hub core src/lib/core/settings/settings.store.svelte.ts in83 t124
hub core src/lib/core/editor/editor.service.ts in55 t97
hub features src/lib/features/collection/collection.types.ts in37 t0
hub features src/lib/features/type-definitions/type-definitions.store.svelte.ts in20 t38
hub features src/lib/features/event-calendar/event-calendar-view.store.svelte.ts in20 t20
hub plugins src/lib/plugins/periodic-notes/periodic-notes.service.ts in8 t9
hub plugins src/lib/plugins/mods/mods.logic.ts in8 t3
hub plugins src/lib/plugins/kanban/kanban.logic.ts in7 t7
hub utils src/lib/utils/debug.ts in73 t53
hub utils src/lib/utils/path.ts in27 t1
hub utils src/lib/utils/date.ts in16 t3
hub lib-root src/lib/utils.ts in54 t1
hub contracts src/lib/contracts/ipc.ts in45 t5
hub contracts src/lib/contracts/index.ts in28 t0
hub contracts src/lib/contracts/events.ts in7 t1
hub types src/lib/types/vault-v2.types.ts in32 t0
hub rust src-tauri/src/utils/logger.rs in20 t4
hub rust src-tauri/src/utils/fs.rs in8 t2
hub rust src-tauri/src/db/mod.rs in6 t8

## Counts
files 1635 (cards 646) · modules 60 · symbols 3152 · locals 1413 · calls 6869 · ipc 72 · events 9 · dto 51 · stores 43 · registries 27 · effect sites 549

## Optional
- Layer rules, layer edge totals, baseline debt: codemap/modules.md
- Every effect class: codemap/effects/
