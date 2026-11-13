# Review F2: audit bugs B4, B5, B6, B7, B8, B10, B11, B12, B13, B14, B15

Scope: the uncommitted diff on `feat/codemap` (scripts/codemap/{ts,model,render,query,rust}.mjs, scripts/import-graph.mjs, spec.md, codemap tests and goldens).

Verdict: CHANGES_REQUESTED (0 blockers, 1 major, 7 minors).

## How it was checked

- `pnpm vitest run` on codemap.test.ts and codemap-query.test.ts: 226 tests. One run failed on test 40 (timeout, see 2), the others passed. `pnpm check`: 0 errors.
- Probes in /tmp/codemap-review-F2/:
  - `render-both.mjs` rendered the worktree with the HEAD generator (`git archive HEAD`) to `out-head/` and with the working tree to `/tmp/codemap-out-F2/`.
  - `q-both.mjs` runs the same `q` command with both generators.
  - `model-probe.mjs` dumps model facts.
  - `determinism.mjs` builds from a reversed inputs map and got 726 files, 0 differing, the same key order.
- Every cited real case is fixed in `/tmp/codemap-out-F2`:
  - B4: `applyPathChange <- fs.service.ts:248 in deleteItem call +2`, `setInvokeTracking … +1`, `isVirtualTab … +1`.
  - B5: `q flow …editor.service.ts:scheduleAutoSave …:saveDirtyTabs` gives `call :298 scheduleAutoSave -> debouncedSave` then `ref :276 debouncedSave -> saveDirtyTabs`. The other wrapper consts (`debouncedSaveFrontmatter`, tags `debouncedTrigger`, TypesNavigator `recountViews`) are locals with call lines.
  - B6: `ensureFrontmatterLink` now owns lines 523-547. No `in insertAfterOpen` is left. `attempt`, `record` and `move` are real top-level functions.
  - B7: `q callers KBAPI.ensureCache` gives 3, renderValue 3, runView 1, resolveScriptPath 1, `KBUI.loadChartJS` 1.
  - B8: boot.ts:41 resolves to `-> kanban.service.ts:clearLinkedContentCache`, boot.ts:42 to `drainEventCalendarWrites`, deep-link-actions.ts:234/235 to the action fns, and the `fires notifyContentInvalidated -> clearLinkedContentCache` edge exists.
  - B10: `q sym NoteEntryV2` gives `reexport NoteEntryV2 = dto:NoteEntry`. `src/lib/types` shows `pub 8/17`. There are 136 reexports and 0 unresolved.
  - B11: NoteRow.svelte and NoteRowMenu.svelte show `t3` with `harness … via NoteRowMenuHarness.svelte`. vault-v2.types.ts has an `imports-type … mirror` row.
  - B12: `q calls KBAPI.date` gives `-> KBDateTime new`, and there are 37 `new` call lines.
  - B13: `effects/storage.md` has 17 sites. That matches a grep of every non-comment `localStorage` call in src/lib and src/routes.
  - B14: `wiring/core.md` 28,864 B, `features.md` 17,648 B, `plugins.md` 2,693 B, all under 85 % of 49,152.
  - B15: `updateTagSort(mode: 'name' | 'count')`, settings.types.ts:398 `type:AppearanceSettings`, type-sidebar.logic.ts:30 `type:FrontmatterValue`, and no `type:*` is left.
- Each new test fails on the HEAD behavior: the `+2` rows, `in outer`, the `this.b`/`C.s` rows, `args='x', cb -> cb`, `imports-type`/`harness` rows, the `new` kind, the storage sites, the wiring shards, `type:Y`, and the union kept in the signature. No test was weakened beyond what the Decisions settle (WIRING_CAP 20, the B11 type-only rows, the B6 `inner` row).

## Findings

1. **major: re-export symbols make bare names ambiguous in `q` (a B10 regression).**
   Evidence:
   - `scripts/codemap/ts.mjs:829` pushes a `reexport` symbol named after the export. `scripts/codemap/query.mjs:340` indexes every symbol under its bare name. So a barrel that re-exports a name unchanged (`export { f } from './x'`) adds a second definition of `f`.
   - `q-both.mjs` on the real repo: at HEAD, `q callers createExtensions`, `q impact buildEditorTheme` and `q callers findHeadingPosition` exit 0 with results. In the working tree each exits 1 with `ambiguous: rerun with one of …/setup/editor-extensions.ts:createExtensions …/setup/index.ts:createExtensions`, and the same shape for the other two.
   - 89 of the 134 re-export lines in `/tmp/codemap-out-F2` re-export under the origin's own name, so 89 bare names that resolved before now fail.
   - No test covers a bare-name lookup through a barrel. The new `q sym Y` test uses a renamed alias.

   Fix: keep `reexport` symbols in the `q sym` listing, but leave them out of the bare-name candidates of the other commands. In `query.mjs:340`, use `names: s.kind === 'reexport' ? [] : [s.name]` and list them separately for `sym`. Or collapse hits whose reexport `sig` points at another hit. Add a test: with `x.ts` `export function f(){}` and `t.ts` `export { f } from './x.js'`, `q callers f` exits 0 on `x.ts:f`.

2. **minor: test 40 (real repo, location check) is flaky at the default 5 s timeout, and the diff makes it slower.**
   Evidence:
   - `src/tests/lib/architecture/codemap.test.ts:3995` has no timeout argument (beforeAll has 60_000).
   - Full-file runs: 7127 ms and 6409 ms failed, 4021 ms passed.
   - Same-harness comparison (`vitest --root` on a HEAD copy and a current copy): HEAD 3280 ms and 5528 ms (failed), current 4039 ms and 4351 ms.
   - The flakiness exists at HEAD, but the gate `pnpm vitest run` can now go red at random.

   Fix: build a `Map<file, string[]>` once for `sourceLine`, and index `model.resolved` by `from` once for `localNames`, instead of `split('\n')` and `filter` per checked line. Or pass a 30_000 timeout like the beforeAll.

3. **minor: hub `t<n>` and card `t<n>` disagree for harness targets.**
   Evidence:
   - `scripts/codemap/model.mjs:338` `testImporters` counts the edge from the harness file, which is now an input because of `isInput` at model.mjs:139.
   - `q hubs --module src/lib/features/note-list` prints `NoteRowMenu.svelte in1 t1` (HEAD `t0`), while the card line says `in1 t3`. Under the same tag, `t1` counts the harness and `t3` counts the 3 tests behind it.

   Fix: derive the hub test count from the F6 rows with the card's `UNCOUNTED_RELATIONS` filter (`render.mjs:491`), or leave harness files out of `testImporters`. Add a hub assertion to the harness test.

4. **minor: nothing in the rendered map explains why `t<n>` leaves `imports-type` rows out.**
   Evidence:
   - `/tmp/codemap-out-F2/files/src/lib/types/vault-v2.types.ts.md` line 3 shows `in32 t0`, followed by 279 `imports-type` test lines in total across the map.
   - The rule exists only in spec section 5. The INDEX "Tests" section (lines 32-34) and the card `cols:` line say nothing, so a reader sees `t0` above many test lines.

   Fix: add one INDEX line under "## Tests": "imports-type (type-only) and example test lines are listed, not counted in t<n>; harness lines count."

5. **minor: the INDEX legend states a global rule that ipc lines and excerpts break.**
   Evidence:
   - The legend at `render.mjs:1022` reads "A signature is copied as written, " | " included".
   - But `ipc/commands.md` prints `ipc:check_for_update_on_channel | args channel,allowDowngrades -> UpdateMetadata / null` and `ipc:read_mod_data … -> number[] / null`.
   - `fx … args=` and `reg … args=` still go through `excerpt()` (render.mjs:468, 471, 940).
   - Spec line 281 documents ` / ` only for a doc in the ipc files.

   Fix: scope the legend to `sym` and `local` lines and add "elsewhere, ` / ` inside a copied type, doc or args= excerpt stands for ` | `". Update spec line 281 to cover ipc argument and return types.

6. **minor: the INDEX names wiring shards that do not exist.**
   Evidence:
   - `render.mjs:1014` hard-codes "codemap/wiring/<layer>.md … (core, features, plugins, app, …)".
   - The real map has only `wiring/core.md`, `features.md` and `plugins.md`, and the golden fixture has only `core.md`. A reader who opens `wiring/app.md` gets no file.

   Fix: render the line from the generated shard keys (`[...wiring.keys()].sort(cmp)`). INDEX then lists exactly the existing files. Assert it in the shard test (codemap.test.ts:3645).

7. **minor: a same-file `new C()` is not a use, although the spec says the calls section includes same-file pairs and that `new` is a kind.**
   Evidence:
   - `extractUses` (`ts.mjs:1071-1073`) puts no class in `own`, so `new DataArray(...)` inside data-array.ts (lines 39, 65, 82, 110, 115, 127) makes 0 call lines: `grep -c "DataArray new" files/…/data-array.ts.md` gives 0.
   - The same-file `C.s()` is tracked (B7), so the gap is now inconsistent.
   - Spec section 5 `calls` ("Same-file pairs included") and section 6 `new` (`new C(…)` of a class) do not limit `new` to imported classes.

   Fix: in the walk, when `n` is the callee of a `NewExpression` and `facts.classes.has(n.text)` with no shadowing `hit`, push kind `new` to `<file>:<Class>`. Add a fixture row to the `new K()` test. Or limit the spec wording to imported classes and add a blind-spot line.

8. **minor: there is no blind-spot line for class-method calls outside the class's own body.**
   Evidence:
   - B7 tracks only `this.m()` and `C.m()` inside the same file.
   - `q callers src/lib/plugins/queryjs/kb-api.ts:KBAPI.pages` gives `total 1` (only `KBAPI.pagePaths`), though callers use the API as `kb.pages()` on an instance.
   - Inherited methods (`class D extends C { x() { this.b(); } }`) and `super.m()` silently give no row (`thisClass`/`methodCall`, ts.mjs:982-990, 1082-1087).
   - `BLIND_SPOTS` (render.mjs:302-316) says nothing. Section 8 says TS calls are "tracked (including … same-class `this.m()`/`C.m()`)", so an empty or short `q callers` on a method reads as complete.

   Fix: add the blind spot "Class methods: only this.m() and C.m() inside the defining file; calls on instances, inherited methods and super.m() are not tracked." Also add it to spec section 8.

## Not checked

- I did not count, across the whole tree, how B6 rule 1 (nested function declarations now resolve outward) moved other enclosings. The effect shards show 7 changed lines, for example mods-host.service.ts:328-431 `in createUi`/`runAction` becoming `in createModContext`, and all of them are consistent with the new rule.
- I did not run E2E or cargo, as the stage rules require.

## Resolution

1. fixed: `reexport` symbols are named by `q sym` only (`symNames`); other commands resolve a bare name to the origin. Test `a barrel that re-exports a name unchanged does not make the bare name ambiguous` failed with the ambiguity error before the fix. Real repo: `q callers createExtensions` exits 0 again.
2. fixed: test 40 builds the split source lines and the `resolved` index by file once, instead of per checked line.
3. fixed: `hubs[].test` is the distinct test files of the F6 rows minus `example` and `imports-type`, the card's `t<n>`. Test `counts the same t<n> in the hub ranking as on the card` failed before. Spec section 7 hub rank and its top-5 numbers updated.
4. fixed: INDEX "Tests" section states that `imports-type` and example lines are listed but not counted in `t<n>`, harness lines count (INDEX template in the spec too).
5. fixed: the INDEX legend scopes the "copied as written" rule to sym and local lines and says ` / ` stands for ` | ` in ipc lines, `args=` and doc excerpts; the spec's ipc paragraph now names argument and return types.
6. fixed: the INDEX wiring line lists the generated shard files; test asserts `wiring/core.md, wiring/features.md` and no `wiring/app.md`.
7. fixed: a same-file `new C()` of an exported class is a `new` use. Test `records a same-file new K() of an exported class` failed before.
8. fixed: blind-spot line for class methods added to INDEX and to spec section 8.
