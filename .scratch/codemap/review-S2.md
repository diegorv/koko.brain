# Review S2: F4 uses, F5 stores (spec section 15 steps 3 and 4, tests 10 to 14)

Scope: the uncommitted diff in `scripts/codemap/ts.mjs` and `src/tests/lib/architecture/codemap.test.ts`, plus the untracked file `scripts/codemap/render.mjs`.

Verdict: CHANGES_REQUESTED. 0 blockers, 2 majors, 6 minors.

## What holds (checked, not assumed)

- `pnpm vitest run src/tests/lib/architecture/codemap.test.ts`: 64 passed.
- Real-repo probe (`/tmp/codemap-review-S2/probe.mjs`, 1515 files, 58490 use rows, about 1.2 s) confirms the section 14 test 43 facts that this stage can answer:
  - `buildTagIndex` by `app-lifecycle.service.ts:433 in initializeVault call`.
  - `AppShell.svelte:192` `toggleRightSidebar` ref markup.
  - `AppShell.svelte:220` `settingsStore.updateLayout` mcall markup.
  - `editorStore.tabs` w-via includes `addTab` and `removeTab`.
  - `tags.service.ts:90 in debouncedTrigger`.
  - `mods-host.service.ts:179` (param `call`) gives no use.
- Markup uses against the `svelte/compiler` AST (`markup-vs-svelte.mjs`, probe only): 1450 (line, symbol) keys compared, 0 extra, 14 missing. All 14 come from findings 1 and 3.
- Script uses against the TS checker (`checker.mjs`, every `src/lib` and `src/routes` `.ts` file): the remaining differences are artifacts of the probe itself (`typeof X` inside type arguments, shorthand properties, the two rows a destructure gives). No real shadowing or `isValueRef` error found.
- Determinism (`det.mjs`): `extractUses`, `usersBySymbol` and `collectStores` give the same output when the file map is fed in reverse order. There is no `localeCompare`, `Date` or `os.` in `scripts/codemap/*.mjs`. Indentation is tabs.
- No markup shadowing case exists in the repo (`{#each … as X}`, snippet params, `{@const}` naming an import or a same-file function): `shadow-markup.mjs` printed nothing.

## Findings

1. **major: a comment inside a markup `{…}` expression that contains a quote swallows every later markup use in the file.**
   - Cause: `markupCode` (`scripts/codemap/ts.mjs:485-523`) tracks quotes inside expression frames but not `//` and `/* */` comments. An apostrophe in a comment opens a "string" that runs until the next quote.
   - Evidence, real repo: `src/lib/features/rail-shell/RailSortMenu.svelte:134` (`// … the menu's key handler …` inside `onOpenAutoFocus={(event) => {…}}`). Every markup use after it is lost: `focusActiveRow` :137, `handleMenuKeydown` :143, `pick` :202/:215/:228, `sortOptionLabel` :204/:209/:222 (10 sites, from `markup-vs-svelte.mjs`).
   - Evidence, fixture probe (`edge.mjs`): `<p onclick={() => {\n// the menu's handler\ng();\n}}>` followed by `<p>{g()}</p>` gives no rows, not even the later `{g()}`.
   - Fix: inside an expression frame, blank `//` up to the newline and `/*` up to `*/`, keeping newlines, before quote handling. Add a test-12 case with `// it's` inside an `onclick={() => { … }}` arrow, followed by a `{fmt()}` that must still be found.

2. **major: test and e2e rows feed `by` users, store readers and writers, and `esc`.**
   - Spec F4: test and e2e rows "feed only `--tests` answers and `t<n>` counts". Spec F5: a member with no use shows `-`, and `backlinksStore.unlinkedMentions` is named as a real case.
   - `usersBySymbol` (`ts.mjs:964-990`) and `collectStores` (`ts.mjs:1007-1036`) take no test predicate and do not mark test sites, and `byLines` prints whatever it is given.
   - Evidence (`bytests.mjs`): 1937 of 2364 symbols with `by` entries have test-file users. `buildTagIndex` lists `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts:610` and `src/tests/lib/features/tags/tags.service.test.ts:44`. 51 store members have only test sites; `backlinksStore.unlinkedMentions` has 11 readers, all in `src/tests/lib/features/backlinks/backlinks.service.test.ts`, so it would render `r:` with test sites instead of `-`. Path order also puts `e2e/` before `src/`, so e2e users would take the first of the 8 `by` slots.
   - Fix: pass `isTest` to `usersBySymbol` and `collectStores`, and either drop test rows or return them in a separate `tests` list for the CLI `--tests`. Count `esc` over production files only. Add tests: a test-file user is absent from `by`, a member used only in a test has empty readers and writers.

3. **minor: a markup spread of a binding (`...B`) is not a use.**
   - The lookbehind `(?<![\w.$])` at `ts.mjs:922` rejects the last `.` of `...`. The spec regex has the same flaw.
   - Evidence: `TypesSection.svelte:18`, `:32`, `:47`, `LayoutSection.svelte:108` and `QuickCaptureSection.svelte:73` (`...settingsStore.settings`, `...settingsStore.quickCapture.templates`) lose their reads. `FilesNavigator.svelte:330` `{ ...FILES_LENS }` is lost too. Fixture `<C v={{ ...s }} />` gives no row (`edge.mjs`).
   - Fix: reject only a single property dot, for example `(?<![\w$])(?<!(?<!\.)\.)`, or check the previous three characters for `...`. Add the case to test 12 and to test 13 (`{ ...s.x }` is a read of `x`). Record the regex correction in spec F4.

4. **minor: several branches can break with every test still green.**
   - The `isTopLevel(a)` restriction of F4e rule 7 (`ts.mjs:567`): dropping it changes no test, because every `const t = debounce(…)` fixture is top-level. Add `function f() { const t = debounce(() => g(), 300); }`, which must give `in f`.
   - The transitive local-function chain in `writes` (`ts.mjs:438-457`): only one hop is tested (`reset` → `clearAll`). Add `do` → `a()` → `b()` where only `b` writes.
   - The same-file `call` writer in `collectStores` (`ts.mjs:1032`, `u.kind === 'call'`): no test has a store file that calls its own `s.addTab()`.
   - The `CaseBlock` and `for…in` shadow scopes (`ts.mjs:349-351`) have no test.
   - A backslash escape inside a markup string (`ts.mjs:510-512`) has no test: `{"a\"fmt"}`.

5. **minor: w-via misses writes through a local alias of state, and through `this`.**
   - `writes` marks only the chain root of the assigned expression (`ts.mjs:442-450`), so `const tab = tabs.find(…); tab.content = c` writes nothing.
   - Evidence: `editor.store.svelte.ts:91` `markSavedByPath`, `:121` `updateTabPath`, `:130` `updateTabContentByPath` and `:139` `updateTabContentOnly` all change `tabs` entries, yet none of them appears in the w-via of `activeTab`, `activeTabContent` or `tabs` (probe: `tabs addTab,removeTab,updateContent,togglePin,setPinned,reset`). An agent asking who changes `editorStore.activeTabContent` gets an incomplete answer.
   - The getters at `event-calendar-view.store.svelte.ts:84` and `:92` read `this.visibleDays` and `this.todayKey`, so they miss those getters' writers.
   - This is a gap in the spec rule rather than a deviation from it. Fix: treat a body-local `const`/`let` whose initializer's chain root (through `.find`, `.filter`, `[i]` and `.at`) is a module binding as an alias of that binding. Resolve `this.<get member>` to that member's R set. Then update spec F5.

6. **minor: an unused dynamic-import binding inside a function gets enclosing `(module)`.**
   - `bindingsOf` stamps `top` on dynamic bindings too (`ts.mjs:215`), and `usersBySymbol` prints it (`ts.mjs:982`).
   - Evidence (`edge.mjs`): `export async function lazy() { const { s } = await import('#lib/utils/g.js'); }` gives `{file: 'src/lib/x/b.ts', line: 7, enclosing: '(module)', kind: 'import'}`.
   - Fix: record `enclosingOf(bindingElement, top, lineOf)` for dynamic bindings.

7. **minor: `+<n>` on a `by` line counts rows, not sites.**
   - A destructure `const { a, b } = s` makes two `member` rows at one identifier (`useKinds`, `ts.mjs:816-824`), and `usersBySymbol` (`ts.mjs:975`) adds `+1` for the second.
   - Spec section 6 says `+<n>` "counts further sites". The same identifier at the same line should count once.
   - Fix: count distinct (line, column) or distinct identifier nodes per (file, enclosing, symbol). Carry a column or an `id` key on each row so the dedupe has something to work with.

8. **minor: some doc comments are now wrong (repo rule: update the comments your change made wrong).**
   - The header of `scripts/codemap/ts.mjs:4-12` still lists only symbols, docs, header, locals, bindings and resolution. It should also cover F4 uses, the enclosing scopes, markup and F5 stores.
   - The `@returns` types of `extractTsFile` (`ts.mjs:592`) and `resolveBindings` (`ts.mjs:768`) do not include the new `top` field. `top` is mentioned only in prose.

## Probes

All probes are under `/tmp/codemap-review-S2/`, run with `node probe.mjs <worktree> <check.mjs>`:

- `facts.mjs`
- `stores.mjs`
- `bytests.mjs`
- `wvia.mjs`
- `wvia2.mjs`
- `markup-vs-svelte.mjs`
- `shadow-markup.mjs`
- `checker.mjs`
- `det.mjs`

`edge.mjs` runs on its own with `node edge.mjs <worktree>`.

## Resolution

1. **fixed.** `markupCode` blanks `//` (to the newline) and `/* */` inside an expression frame before quote handling; new test 12 case with `// the menu's handler` inside an `onclick` arrow and a later `{fmt()}`. Real repo: all `RailSortMenu.svelte` markup uses after :134 are back.
2. **fixed.** `usersBySymbol(resolved, uses, isTest)` and `collectStores(files, uses, isTest)` drop test and e2e rows, `esc` included. A later `--tests` answer can pass the inverse predicate. New tests: test and e2e users absent from `by`; a member used only in tests has no readers or writers and `esc` stays 0. Real repo: 0 test users in `by`, `backlinksStore.unlinkedMentions` has 0 readers.
3. **fixed.** Markup regex is `(?<![\w$])(?<!(?<!\.)\.)B(?![\w$])`; tests for `{{ ...LENS }}` (ref) and `{{ ...s.x }}` (member read). Spec F4 updated.
4. **fixed.** Tests added for rule 7 inside a function (`in later`), a two-hop local function chain, a same-file `call` writer, `switch` case and `for…in` shadowing, and a backslash escape in a markup string. Each was checked by mutating its branch and seeing the test fail.
5. **fixed.** A body-local `const`/`let` set from a module binding through access chains and `.find`, `.findLast`, `.at` is an alias: writes through it (property or element assignment, mutator call) mark the binding, but reassigning the local does not. `.filter` copies are not aliases. Getters take R of each `this.<get member>` they read, to a fixpoint. Spec F5 updated. Real repo: `editorStore.tabs` w-via now includes `markSavedByPath`, `updateTabPath`, `updateTabContentByPath` and `updateTabContentOnly`; `rangeLabel` and `nowMinutes` pick up `visibleDays` and `todayKey` writers.
6. **fixed.** A dynamic binding's `enclosing` is `enclosingOf` of its binding element. The binding field `top` is now `enclosing`. Test: an unused `await import` destructure in `lazy` gives `in lazy import`.
7. **fixed.** Each use row carries `site` (`<region>:<offset>` or `m:<offset>`), and `usersBySymbol` counts distinct sites. Test: `const { a, b } = s; s.a;` gives `+1`.
8. **fixed.** The `ts.mjs` header covers F4 and F5, and the `@returns` of `extractTsFile` and `resolveBindings` list `enclosing`.
