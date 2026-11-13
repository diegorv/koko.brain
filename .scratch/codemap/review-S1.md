# Review S1: import-graph exports and scripts/codemap/ts.mjs (spec section 15 steps 1 and 2, tests 1 to 9)

Scope: the uncommitted diff in `.claude/worktrees/architecture-deterministic` (`scripts/import-graph.mjs`, `src/tests/lib/architecture/import-graph.test.ts`, new `scripts/codemap/ts.mjs`, new `src/tests/lib/architecture/codemap.test.ts`).

Verdict: no blocker. Step 1 preserves behavior, and the step 2 extraction gives correct facts on the real repo. The weak spots are tests that still pass when line pointers break, and source forms the code handles wrongly without saying so (none of them occur in the repo today).

## What was checked

- `pnpm vitest run src/tests/lib/architecture`: 12 files, 151 tests pass. `codemap.test.ts` has 32 tests, `import-graph.test.ts` + `layer-rules.test.ts` pass. `pnpm check`: 0 errors.
- Behavior preservation (`/tmp/codemap-review-S1/cmp-ig.mjs`): the HEAD and new `import-graph.mjs` give byte-identical `scanLib(root)` output (721969 chars of JSON) and identical `extractImports` for every TS/Svelte file in `src/lib`, `src/routes`, `src/tests`, `e2e`.
- Real repo (`probe1.mjs`, `probe2.mjs`, `probe6.mjs`, `probe7.mjs`): 2549 symbols in production files (142 components, 43 stores in 43 of 43 store files, 1 `method`), no duplicate names per file. Every `sym`/`local` line contains its name and never points at a comment line, and no span runs past the end of the file. All 16110 bindings have a statement line containing `import` and a specifier line containing the local name. Only 1 production internal binding is unresolved (`src/lib/core/settings/BuildInfo.svelte:2` `channelLabel` from the `.js` file `src/lib/utils/build-info.js`, out of scope per F1). DTO chains give 51 distinct `dto:` IDs, matching the 51 generated files. Two runs, and a run with the file map in reverse order, give identical results.
- Determinism tokens: no `localeCompare`, `Date` or `os.` in `scripts/codemap/ts.mjs`, and every sort uses `cmp`. Tabs only, no trailing whitespace, JSDoc on every exported function.
- Mutation run (`/tmp/codemap-review-S1/mut/`, a copy of the script and test run with vitest): mutants M1, M4, M5, M8, M14, M15, M16, M21 and M23 survive. See findings 1 and 9.

## Findings

1. **major: line pointers of Svelte bindings and of JSDoc-preceded declarations are never asserted.**
   Evidence: mutant M14 removes `lineOffset` from `bindingsOf`'s `lineOf` (`scripts/codemap/ts.mjs:161`), so every binding line in a `.svelte` file counts from the script tag instead of the file start, and all 32 tests still pass. The only binding-line test (`codemap.test.ts:393`) uses a `.ts` file. Mutant M1 changes the symbol line to `n.getStart(sf, true)` (`ts.mjs:242`), so every documented symbol points at its `/**` line, and the tests still pass. The 14.2 fixtures have no JSDoc, and 14.3 compares only names and docs. These lines feed `by ... kind import` (F3), `imp` and every `sym` location, the map's main promise. The real-repo output is right today (`probe6.mjs`: 0 bad lines), so only the guard is missing.
   Fix: in 14.8, add a `.svelte` fixture whose `<script>` starts on line 3 or later, with a multi-line `import {` and a `const { x } = await import(...)`, and assert `line`/`specLine`. In 14.2 or 14.3, assert the line of a declaration under a multi-line JSDoc block (it must be the `export` line).

2. **minor: `resolveBindings` gives wrong IDs if `exists` returns true for directories.**
   Evidence: `ts.mjs:357` hands `exists` to `resolveSpecifier`, which tries the bare path first. With `existsSync` as `exists`, 26 real bindings break (`probe2.mjs`). For example, `src/lib/core/markdown-editor/MarkdownEditor.svelte:46` `./setup` resolves to the folder and gives `null` instead of `setup/index.ts` → `editor-extensions.ts:createExtensions`. `../../widgets` hits the folder `live-preview/widgets/` instead of the file `widgets.ts`. The JSDoc says "whether a repo-relative file exists", but no test pins the file/folder collision, and stage 9 has to pass the right callback.
   Fix: inside `resolveBindings`, resolve against the parsed inventory (`(p) => files.has(p) || exists(p)` with `files.has` first, or only `files.has` plus the non-parsed inventory). Add a fixture with `widgets.ts` next to a `widgets/` folder.

3. **minor: `components/ui` barrels resolve to IDs that no symbol declares.**
   Evidence: `src/lib/components/ui/popover/index.ts` does `const Root = PopoverPrimitive.Root; export { Root, ... }`. 14 bindings resolve to `src/lib/components/ui/popover/index.ts:Root`/`:Trigger`/`:Portal` (`probe1.mjs`, "resolved ids with no symbol"). This follows F3 as written (a non-import local), but no F2 symbol has that ID. Test 33 ("every symbol ID in `by`, `call`, `reg` exists in the model") will trip on it once `by` lines exist, unless ui files are exempt.
   Fix: decide now. Either map a local whose initializer is a property access on a package import to `external:<pkg>` (the F3 package rule), or have `extractTsFile` record `export { localConst }` targets as `const` symbols, so the ID exists in the model.

4. **minor: source forms the parser handles wrongly without saying so (0 in the repo today, each checked by grep or probe).**
   Evidence (probe run inline):
   - Overloads: `export function f(a: string): void; export function f(a: number): void; export function f(a) {}` gives three `fn f` symbols (lines 1, 2, 3). Test 42 forbids duplicates. Local overloads also give duplicate `local` rows.
   - `export default function g() {}` registers export name `g`, not `default`, so `import g from` resolves to `null` and `import { g }` resolves where it should fail. `export default <expr>` is ignored.
   - `export * as ns from './y'` is in neither `names` nor `stars` (`ts.mjs:284-291` handles only `NamedExports`).
   - `<script context="module">` (Svelte 4 syntax, still accepted by Svelte 5) is not seen as a module script (`MODULE_ATTR_RE`, `import-graph.mjs:58`), so its `export function` becomes a `method` and drops out of the export table.
   - An instance-script `export const focus = () => {}` (a component export in Svelte 5) is dropped from both symbols and locals (`ts.mjs:263-267`).
   Fix: skip bodiless `FunctionDeclaration`s (`!st.body`) for symbols and locals; map `export default function` to export name `default`; record `export * as ns` as a namespace entry (resolving to file level, like namespace imports); accept `context="module"` in `MODULE_ATTR_RE`; give instance `export const` arrows kind `method`, like `export function`. Or, if these stay out of scope, list them in the blind-spot template and add a test that pins the chosen behavior.

5. **minor: `firstSentence` can cut a surrogate pair in half at the 160 cap.**
   Evidence: `cap` (`ts.mjs:49`) slices UTF-16 code units. `firstSentence('😀'.repeat(100))` keeps 79.5 emoji, and the last char is a lone high surrogate, which the writer turns into U+FFFD. 61 doc lines in the repo contain non-BMP emoji (e.g. `src/lib/contracts/generated/TaskMetadata.ts:16`, `src/lib/features/todoist-sync/anchor.logic.ts:2`), so a long doc with an emoji near char 159 produces invalid text. It is deterministic but corrupt.
   Fix: in `cap`, step back one unit when `s.charCodeAt(n - 2)` is a high surrogate (or slice `Array.from(s)`), and add a test.

6. **minor: the blank-line cut and the header block parser ignore CRLF.**
   Evidence: `firstSentence('A one\r\n\r\nB two.')` returns `A one B two.`, because `/\n[ \t]*\n/` (`ts.mjs:63`) does not match `\r\n\r\n`. `blockText` splits on `\n` and leaves `\r` on each line. No CRLF files are in the repo today (checked with `git ls-files | xargs grep -l $'\r'`), so this only matters for a future checkout or contribution with CRLF.
   Fix: normalize `\r\n` to `\n` once in `extractTsFile` (or use `/\r?\n[ \t\r]*\n/`).

7. **minor: the spec says 43 file headers, the code finds 45.**
   Evidence: `probe5.mjs` and the per-case split: 27 files whose first statement is an import, 16 with two leading blocks, and 2 export-from files (`src/lib/contracts/index.ts`, `src/lib/types/vault-v2.types.ts`). The count is 45 at `cbe67cb28` too, so the spec's 43 apparently left out the export-from case its own D2 text includes. The code follows the rule text, and both extra headers are real file headers.
   Fix: no code change. Correct the count in spec F2 (D2) to 45 so test 41/43 authors don't assert 43.

8. **minor: comments point at a `.scratch` spec that the repo's issue flow deletes.**
   Evidence: `codemap.test.ts:12` "Numbers in test names refer to spec section 14 of `.scratch/codemap/spec.md`", the `ts.mjs:7` header "(spec F2, F3)" and the JSDoc "(spec D3)", "(spec F5)", "(spec F3)". Per CLAUDE.md, finished `.scratch` files are deleted, so these references will dangle.
   Fix: keep the rule descriptions, which already say what the code does, and drop the spec section numbers, or point at a durable doc (an ADR) if the spec is kept.

9. **minor: these branches are still untested, since their mutants survive.**
   Evidence: M8 (drop `cf` from `ABBREV_RE`), M15 (drop `plain` from `{@linkplain}`), M4/M5 (drop the `seen` set or the `MAX_DEPTH` check: the cycle test passes either way, so neither guard is pinned), M16 (follow a dynamic `await import` destructure when resolving a local `export { x }`), M21 (put instance-script exports into the export table), M23 (count `dto:` IDs as public). Spec 14.1 names e.g, i.e, etc but D3 also lists `vs` (tested) and `cf` (not), and D3 names `{@linkplain}`.
   Fix: add `firstSentence('See cf. Foo for more. Next.')` and a `{@linkplain X}` case; a 10-hop acyclic chain that resolves to `null` (depth cap) next to the cycle case; a fixture where an instance-script `export function` is imported by name and stays `null`.

10. **minor: the new `createRequire` import sits in its own group.**
    Evidence: `src/tests/lib/architecture/import-graph.test.ts:6` puts `import { createRequire } from 'node:module';` in a separate group after the `node:os` import, split by a blank line. CLAUDE.md groups external and built-in imports together.
    Fix: move it into the `node:` group at lines 2 to 4.

## Not checked

- Spec tests 10 and later (F4 uses, by-lines, render) are out of this stage. Findings 2 and 3 are flagged because those stages will consume this output.
- No probe for `src/routes/**/*.js` files (F1 lists them; `extractTsFile` treats any non-`.svelte` path as TS, so a `.js` route parses as TS, which is harmless for plain JS).

## Resolution

1. fixed: tests now assert a `.svelte` fixture whose `<script>` opens on line 3 (multi-line `import {` and `await import` destructure, `line`/`specLine` counted from the file start), and a `fn` and a `const` under JSDoc blocks sitting on their `export` line, which kills M14 and M1.
2. fixed: `resolveBindings(files)` drops the `exists` callback and resolves specifiers only against the parsed inventory, so a folder or an unparsed file can no longer shadow `widgets.ts` or `setup/index.ts`. A fixture pins both. The real repo gives the same IDs as the `isFile` probe, apart from finding 3.
3. fixed: a top-level non-exported `const X = A.B…` is recorded in `aliases`. When `A` is a package binding, re-exporting `X` resolves to `external:<pkg>`. The 14 popover bindings now give `external:bits-ui`, so no resolved ID lacks a symbol.
4. fixed: bodiless overload signatures are skipped (one symbol and one local, at the implementation). `export default function|class` registers export `default`. `export * as ns` is a namespace entry and stays file-level (null). `MODULE_ATTR_RE` accepts `context="module"`. An instance-script `export const` arrow is a `method`, kept out of the export table. Each case has a test. `export default <expr>` stays unread, which the `extractTsFile` JSDoc now says, so it can go on the blind-spot list at render.
5. fixed: `cap` steps back one unit before a high surrogate; an emoji test pins it.
6. fixed: `firstSentence` reads CRLF as LF before the blank-line cut. Since the header path also ends in `firstSentence`, its trailing `\r` is collapsed as whitespace. A test covers it.
7. fixed (spec): F2 now says 45 header files (27 import-led, 16 with two leading blocks, 2 export-from-led). The code is unchanged, and a re-probe gives 45, with none for `note-change.service.ts`.
8. fixed: the spec section and D/F references are gone from the comments in `ts.mjs` and `codemap.test.ts`, and so are the `(14.x)` suffixes in describe names. The rule text stays.
9. fixed except M4: new tests cover `cf.` (M8), `{@linkplain}` (M15), the 8-hop cap with 8 hops resolving and 9 not (M5), a function-scoped `await import` destructure that must not shadow a top-level export (M16), an instance `export function` imported by name staying null (M21), and DTO and package IDs never being public (M23). M4 (the `seen` set) is rejected: the depth cap ends every cycle with the same null, so `seen` only bounds work and leaves no observable output to assert.
10. fixed: `createRequire` moved into the `node:` import group, sorted.
