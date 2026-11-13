# Kokobrain code map
> Generated from the code by scripts/codemap.mjs; no hand-written text. inputs=sha256:abcdef012345 · check freshness: node scripts/codemap.mjs --stale · written by CI on main only; never edit or stage codemap/.

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
Line tags: file imp in2 out2 test sym by local store mem call mount fx reg ipc-call ev ipc event dto dep entry module layer rule debt fx-count ipc-count hub more. "-" means no static reference found, not "unused". "in <name>" names a function in the same file as the line's location.

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
- Test and e2e files: graph nodes for test lines and q --tests answers, no cards.

## Hubs (production importers, test importers)
hub app src/lib/app/boot.ts in1 t0
hub routes src/routes/+page.svelte in0 t0
hub core src/lib/core/notes/notes.store.svelte.ts in3 t0
hub core src/lib/core/notes/notes.service.ts in2 t1
hub core src/lib/core/notes/hooks.ts in2 t0
hub features src/lib/features/tags/TagRow.svelte in1 t0
hub features src/lib/features/tags/TagsView.svelte in1 t0
hub features src/lib/features/tags/tags.service.ts in1 t0
hub plugins src/lib/plugins/cal/cal.ts in1 t0
hub utils src/lib/utils/debounce.ts in1 t1
hub contracts src/lib/contracts/generated/TagAggregate.ts in2 t0
hub contracts src/lib/contracts/ipc.ts in2 t0
hub contracts src/lib/contracts/index.ts in1 t1
hub rust src-tauri/src/commands/notes.rs in1 t1
hub rust src-tauri/src/events.rs in1 t0
hub rust src-tauri/src/index.rs in1 t0

## Counts
files 27 (cards 21) · modules 10 · symbols 28 · locals 4 · calls 21 · ipc 2 · events 1 · dto 1 · stores 1 · registries 1 · effect sites 8

## Optional
- Layer rules, layer edge totals, baseline debt: codemap/modules.md
- Every effect class: codemap/effects/
