# Review S4: F6 tests, F11 registries and facets, F15 effects, F17 mounts, model.mjs (F14)

Scope: the uncommitted diff on `feat/codemap` (`scripts/codemap/ts.mjs`, untracked `scripts/codemap/model.mjs`, `src/tests/lib/architecture/codemap.test.ts`), checked against spec sections 7 (F6, F11, F14, F15, F17), 13 and 14 (tests 23 to 29, 31).

Checks run:
- `pnpm vitest run src/tests/lib/architecture/codemap.test.ts`: 113 passed.
- `pnpm check`: 0 errors, 0 warnings.
- Probes under `/tmp/codemap-review-S4/` (`build.mjs`, `p1.mjs` to `p10.mjs`) build the real-repo model (1620 files, about 1.9 s).
- Determinism (`p10.mjs`): the same hash of registries, effects, mounts, tests, edges, hubs, module edges, entry files, symbol edges and package imports for normal input order, reversed input order, and `LC_ALL=tr_TR.UTF-8 TZ=Pacific/Kiritimati`.
- No `localeCompare`, `Date` or `os.` in `model.mjs` or `ts.mjs`. Tabs and `// @ts-nocheck` header are in place. Every exported function has JSDoc.

Real-repo counts that match the spec: 25 sinks and 2 facets; every sink named in test 43 is found. `onFileChange` is fired by `handleChangedPaths <- startWatching`. `registerPathChangeConsumer` at `event-calendar.service.ts:658` registers `-> followPathChange`. `railRegistryStore.registerNavigator` is fired in `AppShell.svelte:108/116`. 65 global timers; `timer-wrap.debounce` at `tags.service.ts:90 ... 300 as debouncedTrigger` and at `editor.service.ts:276 ... 2000`. 162 plugin-fs calls; 19 Rust fs writes; 45 `rust-db.execute`. 58 `addEventListener` sites plus 5 `<svelte:window>` attributes. The hub top 5 is in the order the spec gives (counts have drifted by 1 or 2). `q flow saveFileByPath -> registerSearchIndexHook` resolves through `writeTab` (call), `notifyAfterSave` (call) and fires. `buildTagIndex -> ipc:get_all_tags_v2 -> vault.rs:get_all_tags_v2` resolves. Spec drift, for information only: `$effect` sites are 121 today, not 117.

## Findings

1. **major: re-export edge names are collected per specifier, not per statement.**
   Evidence: `scripts/codemap/model.mjs:172-174` (`edgeNames`, `reexport` branch). It takes every `exports.names` entry whose `spec` matches and every star with that spec, and puts the current statement's `typeOnly` prefix on all of them. Probe `p8.mjs`:
   ```
   imp u.ts:1 -> p.ts [a,b,T]                (source: export { a } from './p.js')
   imp u.ts:2 -> p.ts [a,b,T]                (source: export { b } from './p.js')
   imp u.ts:3 -> p.ts [type:a,type:b,type:T] (source: export type { T } from './p.js')
   imp u.ts:4 -> q.ts [c,*]                  (source: export * from './q.js')
   ```
   Real repo: `src/lib/core/markdown-editor/extensions/wikilink/index.ts:3` gets `findWikilinkInfoAtPosition,WikilinkInfo`. Line `:4` (`export type { WikilinkInfo }`) gets `type:findWikilinkInfoAtPosition,type:WikilinkInfo`, which marks a function as a type. Both are wrong `imp` facts, and they are written on both cards of the edge. The S4 test ("records import edges with their names in source order") has only one re-export statement per specifier, so it does not catch this.
   Fix: compute the names from the `ExportDeclaration` node at `imp.line`. Either record the statement line on each export-table entry and on each star in `extractTsFile`, or walk `region.sf.statements` for the declaration whose line equals `imp.line`. Use that node's own `isTypeOnly` and its per-element `isTypeOnly`. Add a fixture with two `export {…} from` statements to the same file, one of them `export type`, plus `export *` next to a named re-export.

2. **minor: side-effect imports give edges with no names.**
   Evidence: `model.mjs:170-171`. A bare `import 'x'` has no bindings, so `names` is `[]`. Real repo (`p8`/edge probe): `src/lib/plugins/calendar/calendar.logic.ts:2`, `src/lib/plugins/queryjs/kb-datetime.ts:5` (`import '#lib/utils/date.js';`), and `src/tests/lib/features/auto-organize/auto-organize.no-chain.test.ts:56`. Section 6 grammar `imp <importer>:<line> -> <target file> <names>` has no token for this case. A renderer that joins with a space then emits a trailing space, which test 32 forbids. `import '@tauri-apps/…'` package imports have the same problem.
   Fix: give these edges a fixed name, for example `side-effect` or `-`. Add it to the section 6 `imp` names rule, and add a fixture line.

3. **minor (spec gap): `registered-at` callbacks come only from the first argument.**
   Five of the 25 sinks take `(name, callback)`, so the callback falls back to the enclosing function. As a result, the `fires` edges and `q flow` stop at the registering function:
   - `registerContentInvalidationListener('kanban-linked-content', clearLinkedContentCache)` at `src/lib/app/boot.ts:41`, and `('queryjs-cache', invalidateQueryjsCache)` at `src/lib/plugins/queryjs/queryjs-ports.ts:15`;
   - `registerWriteBarrier('event-calendar', drainEventCalendarWrites)` at `boot.ts:42`;
   - `registerTabCloseListener('queryjs-autorun', …)` at `queryjs-ports.ts:16`;
   - `registerDeepLinkAction('daily', executeDailyAction)` at `src/lib/app/deep-link-actions.ts:234-235`.

   Probe `p2.mjs` shows, for example, `registered-at src/lib/app/boot.ts:42 in registerAppPorts args='event-calendar' -> src/lib/app/boot.ts:registerAppPorts`. The code follows the F11 text (`ts.mjs` `callbacksOf`, about lines 1623-1639), but the result loses the real callback.
   Fix: change the F11 rule to "the first argument that is a function identifier, an object literal of function identifiers, or an inline function". Make `args=` show all arguments, the way timer wrappers do (cap 80). Add a `(name, fn)` fixture to test 24. This needs an owner or spec decision first.

4. **minor (spec mismatch): `mirror` requires a `.` after the source stem.**
   Evidence: `ts.mjs` `testRelations`, the `mirror` computation (`startsWith(\`${sourceStem(target)}.\`)`). Spec F6 says "basename starting with the source stem". Real repo (`p5.mjs`): 3 mirrors that the spec text would count are dropped:
   - `src/tests/lib/contracts/events-parity.test.ts` for `src/lib/contracts/events.ts`;
   - `.../plugins/frontmatter-field-click.test.ts` for `frontmatter-field.ts`;
   - `src/tests/lib/plugins/queryjs/kb-api-contract.test.ts` for `kb-api.ts`.

   The stricter rule avoids `edit.ts` matching `editor.test.ts`, which is reasonable, but the spec and the code now disagree.
   Fix: update spec F6 (and test 23) to "basename starting with `<stem>.`", or accept `<stem>.` and `<stem>-`. Either way, add a fixture that pins the choice.

5. **minor: Tauri calls and timers inside Svelte markup are not F15 sites, and no blind spot lists them.**
   Evidence (`p7.mjs`): `tauri-opener.openUrl` in `onclick={() => openUrl(…)}` at `src/lib/core/settings/sections/UpdateSection.svelte:294` and `:328`, and at `src/lib/features/todoist-sync/TodoistSection.svelte:92`; `queueMicrotask` at `src/lib/features/properties/RelationshipSearch.svelte:41`. `q sink tauri-opener.openUrl` will miss 3 of its 8 call sites. Section 8 says host and timer effects are "tracked".
   Fix: run the F4 markup matcher (brace spans, `B(`) for Tauri bindings and the global timer names, enclosing `(markup)`. Otherwise add "effects called from markup expressions" to the section 8 blind spots and the INDEX blind spots.

6. **minor (spec conflict): `fired-by` of an exported reader stops after one hop.**
   Section 6 `wiring.md` shows `fired-by src/lib/core/editor/editor.service.ts:245 in writeTab <- …:<line> in saveFileByPath`, because `writeTab` is file-local (`editor.service.ts:236`). The code (`ts.mjs` `collectRegistries`, the `r.member !== null || !localNames.has(r.name)` branch) prints only `editor.service.ts:245 in writeTab`, which follows the F11 text ("for an exported read-by function, its F4 use sites").
   Fix: decide which rule holds. If it is the example, continue each same-file site whose enclosing is a file-local function up the same `climb` used for local readers. Then add a case to test 24.

7. **minor: identical `fx` rows for two calls on one line.**
   Evidence (`p4.mjs`): `src/lib/contracts/ipc.ts:26 tauri-api-core.invoke in call` appears twice (the two `invoke` calls of the ternary on line 26). The card and `effects/host.md` will carry two byte-identical lines, against the "one fact per line" reading.
   Fix: dedupe `effects` by (file, line, sink, arg, enclosing), or fold the repeat into a `+<n>` suffix as `by`/`call` do. Then pin the choice in test 27 or 28.

8. **minor: `args=` excerpts keep source comments.**
   Evidence: `ts.mjs` `collectRegistries` (`collapse(arg.getText(…))`). Probe `p2.mjs` gives `registered-at src/lib/app/boot.ts:44 … args={ // A view later living at the old path is re-read from disk, not served stale…`. After the whitespace collapse, the `//` comment runs into the rest of the object, and the real `name`/`pathChanged` keys fall past the 80-char cap. The same happens at `boot.ts:49`, `sync-scheduler.service.ts:90` and `mods-host.service.ts:653`.
   Fix: remove comment ranges (`ts.getLeadingCommentRanges` / a scanner pass, or `ts.createPrinter({ removeComments: true })` on the node) before collapsing. State in section 13 rule 6 that excerpts drop comments.

9. **minor: some new tests cannot fail when the behavior they guard breaks.**
   - The symbol-graph test (`codemap.test.ts`, "links the symbol graph…") uses `expect.arrayContaining`, and its fixture has no test files. Spurious edges, and deleting the `isTest` filters in `model.mjs` `symbolGraph` (lines 417, 421, 444), both still pass. Edge order (by from, kind order, to) is not asserted either.
   - The hub test ("ranks production files…") has no file that imports the same target twice (two statements, or static plus `import type`). Counting edges instead of distinct importer files still passes. Test 26 says "distinct".
   - `readInputs`, `isInput`, `layerOf`, `isTestFile`, `discoverModules`, `moduleOf` and `fileRole` in `model.mjs` have no tests in `codemap.test.ts`. The last three are copies of `scripts/architecture-map.mjs`, whose tests stage 6 deletes. The F1 inventory rules (no `.d.ts`, `.js` in `src/lib` with no symbols, tests `.ts` only) are new code that is not tested first.

   Fix: add a fixture test file that calls and mounts things, and assert that no edge has a test file as `from`. Add an exact-order check on a small fixture. Add a duplicate-import importer to the hub fixture. Move the existing `discoverModules`/`moduleOf`/`fileRole` tests to `codemap.test.ts` now, and add an `isInput`/`readInputs` fixture-directory test.

10. **minor (spec conflict): the `lib-root` layer never reaches the INDEX hubs.**
    Evidence: `model.mjs:111-115` `layerOf` returns `locate(path).layer`, so `src/lib/utils.ts` is in `hubsByLayer.get('lib-root')` (probe `p1.mjs`: `layer lib-root src/lib/utils.ts 54 1`). F14 lists the INDEX layers as `app, routes, core, features, plugins, utils, contracts, types, rust`, with no `lib-root` and no `components`. So the global number-5 hub `src/lib/utils.ts`, which F14 itself names, will be missing from INDEX. `scripts/architecture-map.mjs` `layerOf` mapped `src/lib/utils.ts` to `utils`.
    Fix: either map `lib-root` to `utils` in `layerOf` (also for F7), or add `lib-root` to the F14 INDEX layer list. Then pin it in test 26.

## Not findings (checked)

- F11 negatives: a `.set` cache with no returned function, returning a call result, an arrow nested in an inner function, and a shadowed parameter are all rejected. `reset` with `.length = 0` is not a reader. `acquireCalendarClock`, `configureProfiling` and `modCommandsStore.place` show up as the false positives the spec already names.
- Mutation reasoning: removing the `sc[i] === own` check in the wrapper scan makes `inner` a wrapper, which test 29 catches. Removing the `!o.muts.has(b)` check makes `reset` a reader, which test 24 catches. Removing the `!fileNames.has` check in `timerName` emits the `u.ts` row, which test 28 catches.
- F17: `</B>`, `<BList>`, `<B.Item>` and comments are not mounts. A `ui` barrel component (`<Button`) resolves to `button.svelte`. Mount `line` values point at the tag line (`p9.mjs`).
- F6 relations in the real repo: `vi.mock` forms are all string literals (no `vi.mock(import(…))`), and the e2e imports of `src/lib` are type-only except 2, which are mapped.
- `import('x').T` type nodes become `type:*` edges (48 in the real repo). This matches `import-graph.mjs` and the "type-only importers count" rule.

## Resolution

1. fixed: `edgeNames` takes re-export names from the one `ExportDeclaration` at the edge's line (`ts.mjs` `reexportNames`), with that statement's and each element's own `isTypeOnly`; the import-edge test now has two `export {…} from` statements to one file (one `export type`), `export *` next to a named re-export, and `export * as`. Real repo: `wikilink/index.ts:3` is `findWikilinkInfoAtPosition`, `:4` is `type:WikilinkInfo`.
2. fixed: a static import or re-export that binds nothing gets the name `side-effect` (file edges and `pkg:` edges); spec section 6 `imp` names rule updated, fixture lines added. No edge in the real repo has an empty name list.
3. rejected for now: the review itself marks it as needing an owner or spec decision (changing the F11 callback rule and the `args=` text). The current code follows F11 as written; left unresolved for the owner.
4. fixed: `mirror` accepts the source stem followed by `.` or `-`, so `events-parity.test.ts`, `frontmatter-field-click.test.ts` and `kb-api-contract.test.ts` mirror and `edit.ts` still does not match `editor.test.ts`; spec F6 updated, fixture pins `x.service-parity.test.ts` (mirror) and `x.servicex.test.ts` (no mirror).
5. fixed: `markupEffects` finds Tauri binding calls (`B(`, `ns.name(`) and global timers (delay parsed at the call) in Svelte markup expressions, enclosing `(markup)`; spec F15 updated. Real repo: `tauri-opener.openUrl` has all 8 sites, `RelationshipSearch.svelte:41` `queueMicrotask` is found.
6. fixed: the section 6 example holds. Every `read-by` reader climbs: each first hop continues while its enclosing is a file-local function of its file, one hop per distinct (file, enclosing); spec F11 updated; test 24 has a local `writeTab` calling the reader twice under exported `saveFileByPath`. Real repo: `editor.service.ts:245 in writeTab <- editor.service.ts:222 in saveFileByPath`.
7. fixed: `tsEffects` drops identical rows (file, line, sink, arg, enclosing); the Tauri test has both arms of a ternary calling `invoke` on one line. Real repo: one `ipc.ts:26` row.
8. fixed: `args=`, `delay=`, timer-wrapper `args=` and DOM receiver excerpts drop comments (leading and same-line comment ranges) before the collapse; spec section 13 rule 6 updated; fixtures carry `//` and `/* */` comments in a registration object, a delay and wrapper arguments.
9. fixed: the symbol-graph fixture adds a test `.ts` file that calls, writes a store and calls IPC, a test `.svelte` that mounts, and a Rust integration test call, and asserts no edge touches a test file (this caught test-file mounts reaching the graph; `symbolGraph` now filters them); a new exact-order test pins (from, kind order, to); the hub fixture has a production and a test importer that import the same target twice; `discoverModules`, `moduleOf` and `fileRole` tests are copied into `codemap.test.ts` (the `architecture-map` tests stay until stage 6), and a temp-folder test covers `readInputs`/`isInput` (no `.d.ts`, no `node_modules`, `.js` only in `src/lib` and `src/routes` and without facts, tests `.ts` only, baseline read as data).
10. fixed by spec: `layerOf` keeps F7 (`locate(path).layer`), and F14 now lists `lib-root` among the INDEX hub layers, so `src/lib/utils.ts` reaches INDEX; a test pins the `lib-root` hub layer.
