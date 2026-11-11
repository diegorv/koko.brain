# Item 4 (host side): expression engine for mods, read-only

Scout report. Nothing was run. Paths are relative to `/Users/diegorv/Dev/pet-projects/koko/brain` unless prefixed `mods:` (the mods workspace `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`).

## 1. Verdict

Feasible with no core change and no layer-rule exception. All pieces exist; the host work is one new file (`src/lib/plugins/mods/mod-query.service.ts`), one new `query` member on `createModContext`, and the contract/doc/test follow-through. Risks are about freshness of index records and silent-empty results, not about security (ADR 0036 already gives mods more).

Assumption (stated, needs the lead's call): `ctx.query` is a new stable additive `ModContextV1` member (no `apiVersion` bump, per the header rule at `mods:packages/mod-core/src/contract/mod-api.v1.ts:14-17`), returning vault-relative paths and booleans only, never records.

## 2. Existing pieces to reuse (with evidence)

| Need | Piece | Evidence |
|------|-------|----------|
| Parse + evaluate one expression | `evaluateExpression(expression, ctx)`, `validateExpression(expression)` (returns reason or undefined; checks parse and unknown plain functions, not methods) | `src/lib/features/collection/expression/evaluator.ts:77`, `:308` |
| Eval context | `EvalContext { record, formulas, vaultPath? }`; `vaultPath` is what a relative `file.inFolder()` resolves against | `evaluator.ts:11-18`, `:574-585` |
| Filter object form (`and`/`or`/`not`) | `evaluateFilter(filter, ctx, onLeafError)`; a failing leaf is false unless `onLeafError` throws | `src/lib/features/collection/collection.logic.ts:328-353` |
| Full query over the index | `executeQuery(definition, view, index, vaultPath, rowSet?)`; validates every filter first and returns `filterError` with empty records; shares one parse cache across records (`evaluateFilterCached`) | `collection.logic.ts:132-224`, `:359-387` |
| The row rule for "notes" | `blockRowSet` (no system-folder note, no `.view`, no `_type: Type`, no archived unless filters cite it, then `limit`), reachable without importing rail-shell through `getViewRowSetPort()?.blockRows(records, view, definition)` | `src/lib/features/rail-shell/lens.logic.ts:749-762`, `src/lib/features/collection/view-row-set.port.ts:13-30`, `:63`, registered at `src/lib/app/boot.ts:61-65` |
| How an inline block calls it | `executeQuery(definition, viewWithDefaults, collectionStore.propertyIndex, vaultStore.path, rowSet)` after `collectionStore.isIndexReady` | `src/lib/features/collection/collection-block-widget.ts:100-124` |
| Records for one path | `collectionStore.propertyIndex.get(absPath)`; `buildNoteRecord(path, content, mtime, ctime, size)` | `collection.store.svelte.ts:28-31`, `collection.logic.ts:22-43` |
| Stats for a record built from content | `ruleRecordStats(indexed, content, now)` | `src/lib/features/auto-organize/auto-organize.logic.ts:724-732` |
| Rule-style strict matching (throws on a leaf error, so `not` cannot turn a failure into a match) | `ruleMatches` + `filterProblem` (private / auto-organize) | `auto-organize.logic.ts:74-82`, `:36-62` |
| Relative <-> absolute | `relativePath`, `vaultRelativeKey`; `assertVaultPath` | `src/lib/utils/path.ts:98-123`, `src/lib/plugins/mods/mods.logic.ts:69-73` |
| Live guard / error wording | `assertLive`, `invalid()` pattern in `createModContext`; `createModVault` scope pattern (`modId`, `vaultPath`, `assertLive`) | `src/lib/plugins/mods/mods-host.service.ts:122-128`, `src/lib/plugins/mods/mod-vault.service.ts:12-33` |

`plugins/mods` already imports `features/collection` (`mod-app.service.ts:9` imports `collectionStore`). So `mod-query.service.ts` importing `collection.logic`, `collection.store`, `view-row-set.port`, `evaluator` adds no new layer edge. The ratchet baseline (`src/tests/lib/architecture/layer-baseline.json`, size 3, `layer-rules.test.ts:33`) does not mention mods, and `plugins/mods` allowlist (`scripts/import-graph.mjs:51`) only concerns plugin-to-plugin edges. Do not import `rail-shell/lens.logic.ts` directly (use the port); do not import `auto-organize` (a feature depending on a plugin's need is the wrong direction for `filterProblem`; copy nothing, use `executeQuery`'s `filterError` instead).

## 3. Proposed host design (what an implementation touches)

### 3.1 New file: `src/lib/plugins/mods/mod-query.service.ts`

`createModQuery({ modId, vaultPath, assertLive }: ModVaultScope): ModQueryV1` (reuse the `ModVaultScope` type exported from `mod-vault.service.ts:10-17`, or re-declare as `createModWorkspace` does by importing it).

Sketch (two members; names are the lead's choice):

- `matches(expression: string, path: string): Promise<boolean>`
  1. `assertLive()`, `assertVaultPath(path)`, type-check `expression` is a non-empty string (mods are untyped JS, same as `assertContent` at `mod-vault.service.ts:35-37`).
  2. `validateExpression(expression)`; if a reason, throw `Mod "<id>": query.matches: <reason>`.
  3. Record: `collectionStore.propertyIndex.get(abs)`; if absent, read the file (`readTextFile`) and `buildNoteRecord(abs, content, ...ruleRecordStats(undefined, content, Date.now()))`. This is why it is async. A missing file rejects with the file system error, like `vault.read`.
  4. `evaluateExpression(expression, { record, formulas: {}, vaultPath })`, then truthiness. Let evaluation errors throw (wrap with `Mod "<id>": query.matches: ...`), do not return false: Auto Organize does the same for the same reason (`auto-organize.logic.ts:66-72`).
- `notes(filter: string | object, options?: { limit?: number }): string[]` (sync) or `Promise<string[]>`
  1. `assertLive()`; reject unless `collectionStore.isIndexReady` (see risk R2).
  2. Build `definition = { views: [{ type: 'table', name: 'mod', filters: filter, limit }] }` and call `executeQuery(definition, definition.views[0], collectionStore.propertyIndex, vaultPath, rowSet)` with `rowSet = port ? (r, v, d) => port.blockRows(r, v, d) : undefined`, exactly like `collection-block-widget.ts:117-124`. `ViewType` allows `'table'` (`yaml-parser.ts:332`).
  3. If `result.filterError`, throw `Mod "<id>": query.notes: <filterError>` (never return `[]`: the comment at `collection.logic.ts:142-143` says the engine reports a typo instead of "no notes match" for exactly this).
  4. Map `result.records` to `relativePath(vaultPath, r.path)`.
  5. Order: Map insertion order, which changes between a full rebuild and deltas (`collection.service.ts:122-125` `patchIndex` appends new keys). Sort the returned paths so mods get a deterministic order, or document "unordered".

Keep `formulas` out of the first version (the mod can compute in JS). `MAX_FORMULA_DEPTH` (`evaluator.ts:20`) already guards cycles if added later.

Without the port (unit tests, or before `registerAppPorts`), `rowSet` is undefined and `notes()` would return `.view` files, system-folder notes and type definitions. Either assert the port exists (throw `Mod "<id>": query.notes is not available yet`) or fall back to an inline copy of the rule. Recommendation: use the port, and have the tests register a real one (`registerViewRowSetPort` with `blockRowSet`, as `boot.ts:61-65` does; the port holds no hidden state, so using the real `blockRowSet` is not mocking).

### 3.2 Wire in `createModContext`

`src/lib/plugins/mods/mods-host.service.ts:592-593` is where `vault`/`workspace` are built:

```ts
vault: createModVault({ modId: manifest.id, vaultPath, assertLive }),
workspace: createModWorkspace({ modId: manifest.id, vaultPath, assertLive }),
```

Add `query: createModQuery({ modId: manifest.id, vaultPath, assertLive }),` next to them, and the import at `:24`. No change to `ModContext` (`:36-69`) since `query` comes from `ModContextV1`.

### 3.3 Contract dependency (blocks the host change)

The host type-checks against the pinned git dependency: `package.json:81` pins `@kokobrain/mod-core` to commit `328ca55f...`, and `src/lib/plugins/mods/contract/mod-api.v1.ts` is a type re-export. `createModContext` returns `ModContext extends ModContextV1`, so the host cannot add `query` until the contract commit that declares `ModQueryV1` and `ModContextV1.query` is pushed and the SHA bumped (`docs/MOD-CORE.md` "Updating the dependency", steps 1-6; includes `pnpm build` because `package.json`/lockfile change). Order: contract + helpers/fakeCtx in the mods repo first, host second.

## 4. Hidden costs and places that break when `ModContextV1` gains a member

All of these are required edits, found by reading, not by running:

1. `src/tests/lib/plugins/mods/mod-api-contract.test.ts:46-63` `CONTEXT_PUBLIC ... satisfies Record<keyof ModContextV1, true>`: add `query: true` (the `satisfies` fails `pnpm check` otherwise). Add a `QUERY_PUBLIC` object for `ModQueryV1` and a case like `ctx.vault exposes exactly the contract members` (`:231-247` pattern). `HOST_UNSTABLE` (`:66`) stays `['app','kb','labs']`.
2. `src/tests/help/mods-example.test.ts:36-60` builds a typed `ModContextV1` literal with `unused` stubs: add `query: unused`. Same for `src/tests/help/mods-examples.test.ts` (literal around `:270-320`): add a `query` stub, ideally a small real in-memory implementation if an example uses it.
3. `help/examples/mods/kokobrain-mod.d.ts` is a verbatim copy of the contract; `src/tests/help/mods-types.test.ts:25-47` `STABLE_TYPES` must list the new `ModQueryV1` (and any option/type names) and the d.ts must declare them identically (compile-time equality, `mods-types.test.ts:11-16`). The test also compares the exported name list of the installed contract to `STABLE_TYPES` (`:55-60`), so it fails the moment the SHA is bumped until updated.
4. Docs: `help/documentation/mods/13-api-reference.md` (new `## ctx.query` section near `## ctx.vault` at `:112`, the Paths bullet at `:23`, the error index at `:248+`), `help/documentation/mods/10-querying-the-index.md` (new "when to use query vs kb" paragraph and its freshness table), `help/documentation/28-mods.md` (the `ctx` member list near `:140-141`), `help/documentation/mods/15-errors-and-debugging.md` (error table `:87-99`), `help/documentation/mods/01-anatomy-and-loading.md:300` (the list of things that throw after unload). `src/tests/scripts/sync-wiki-docs.test.ts` references the docs; read it before editing headings in case it pins anchors.
5. Docs must state the path convention: `ctx.query` takes/returns vault-relative paths, but expressions see the engine's absolute `file.path` and `file.folder` (`evaluator.ts:196-203`). `file.path == "Ideas/A.md"` never matches; `file.inFolder("Ideas")` does (relative resolved through `vaultPath`, `evaluator.ts:574-585`). Do not rewrite the record to relative paths: it would diverge from Collection views, which is the stated goal ("the same engine").
6. If the d.ts/fakes in the mods repo (`mods:packages/mod-core/src/testing` `fakeCtx`) are not updated, mods' own tests break; that is the other scout's area, flagged here only because the host test fakes are the mirror image.

## 5. Risks

R1 (freshness, medium). Index records lag disk for derived fields. `updateNoteInIndex` keeps the old `mtime/ctime/size` (`collection.service.ts:152-162`), and the Rust delta lands ~2 s later (up to ~10 s in a burst; `docs/agents/indexing-watcher-rules.md` rule 12; `help/documentation/mods/10-querying-the-index.md` "Freshness and lag"). So `file.mtime`, `file.ctime`, `file.size` are stale or `0` right after a write, exactly the table already documented for `ctx.kb()`. Properties, `_type`, `tags`, `archived` are current: the `save` path runs the collection consumer synchronously (`editor.hooks.ts:67-81`, `note-change.service.ts` "save must stay synchronous"). Typing-only edits reach the index ~1 s later (`edit` source yields). Consequence for mods: `matches` inside `onNoteSaved` sees saved frontmatter correctly; a mod choosing notes to delete by `file.mtime` must apply the same caution as the doc's "untouched for 90 days" example. Document, do not fix.

R2 (silent empty, high for destructive mods). Before the first index build `propertyIndex` is an empty Map and `isIndexReady` is false (`collection.store.svelte.ts:9,78-82`). `notes()` would return `[]` and a mod that archives or moves "everything not matching" acts on nothing or, inverted, on the wrong set. Reject with a clear error when `!collectionStore.isIndexReady`. A mod waits with `ctx.watch` as the docs show (`10-querying-the-index.md`, `whenIndexReady`); that example uses `vaultStore.indexReady`, a different flag from `collectionStore.isIndexReady` (`vault.store.svelte.ts:28,76`). Check both are set at the same time, or use the collection one for `query` and say so in the docs.

R3 (unindexed path for `matches`, medium). Created-this-second notes: `vault.create` fires `applyNoteChange` with source `create` (`mod-vault.service.ts:119-126`), consumers run synchronously, so the record exists. Non-Markdown paths (`.canvas`, `.kanban`) are never in the index (`collection.service.ts:182-190`); `matches` on one should reject (`"<path>" is not a note`) or return false, not build a record from JSON. A `.view` is in the index but is not a note; decide to reject it too (`isViewFile`, `src/lib/core/filesystem/fs.logic.ts:71`).

R4 (shared-record mutation, low). `evaluateListHigherOrder` temporarily assigns `ctx.record.properties` on the record it is given and restores in `finally` (`evaluator.ts:522-559`). With the shared index record this is synchronous and restored, and records in the `$state` Map are not proxied, so nothing reacts. Still, give `matches` a shallow copy `{ ...record }` so a thrown error or a future async step cannot leak the swapped map into the live index. Cheap.

R5 (loops, none new). `ctx.query` is read-only and writes nothing, so it adds no save loop. The existing loop hazard is `onNoteSaved` + `vault.write` (item 2), unrelated here.

R6 (performance, low to medium). `notes()` is a synchronous full scan of the property index on the main thread (`Array.from(index.values())`, `collection.logic.ts:150`), the same cost the inline block pays on every refetch; no cancellation, no `await` to yield. Fine at thousands of notes. A mod calling it per `onNoteSaved` on a big vault repeats it; the docs already say to debounce `ctx.kb()` calls (`10-querying-the-index.md` "Cost"), say the same here. `matches` on a missing record also pays a disk read.

R7 (expression side effects, low). The evaluator has no `new Function`/`eval`/DOM/network (grep of `src/lib/features/collection/expression/*.ts` found none). `html()`, `badge()`, `link()` return plain `__display` objects (`evaluator.ts:426-464`) which a boolean/paths API never exposes. `string.matches(pattern)` builds `new RegExp(pattern, 'i')` from the note's own text or the expression (`methods.logic.ts:88-92`), so a pathological pattern can stall the window (ReDoS), the same exposure Collection views have. Under ADR 0036 mods are fully trusted ("Not a containment boundary", `docs/adr/0036-vault-mods-trust-loader-storage.md`, Decision/Trust), and `ctx.app`/`ctx.kb()` already hand out the raw index, so `ctx.query` grants no new capability. Only the freeze-on-infinite-loop limit applies, and it is already documented.

R8 (semantics divergence, medium). Three distinct "listable" rules exist: `kb.pages()` (entries: not Type, not `.view`, no system folder; keeps archived; `kb-api.ts:468-481`), `blockRowSet` (records: same plus drops archived unless cited), and raw `executeQuery` (everything). `notes()` using `blockRows` follows the inline-block rule, so it differs from `ctx.kb().pages()` on archived notes. State this in the docs, and pick deliberately. If the lead wants kb parity (archived kept), `blockRows` is wrong and the rule must be a small local filter (`excludeSystemFolder` from `type-definitions/type-sidebar.logic.ts:65-75` + `isViewFile` + `_type !== 'Type'`), which duplicates the rule that `view-row-set.port.ts` exists to centralize.

R9 (loose typing from JS). `notes(filter)` accepts object filters from untyped mods. `executeQuery` validates shapes (`findFilterError`, `collection.logic.ts:233-256`) and reports them as `filterError`, so no extra validation is needed beyond `typeof filter === 'string' | 'object'`. An empty object filter matches every note (see the comment at `auto-organize.logic.ts:30-35`): reject an object with no condition, or document it.

## 6. Questions for the lead (each changes behavior users or data see)

1. `notes()` sync or async? Sync is simpler (index already in memory) and matches `watch`'s reads; async leaves room for a later yielding scan. `matches` needs async only because of the disk fallback for an unindexed path.
2. `notes()` archived rule: inline-block rule (`blockRows`, archived hidden unless cited) or `kb.pages()` parity (archived kept)? See R8.
3. Unindexed or non-note path in `matches`: reject, or return false?
4. Return only paths, or `{ path, ... }` rows with chosen fields? Records are internal (`PropertyIndexRecord`, DTO-firewall spirit of the QueryJS contract in rule 12 of `indexing-watcher-rules.md`); paths-only is the minimal safe contract.
5. Options: only `limit`, or also `sort`? `executeQuery` already supports `view.sort` (`collection.logic.ts:198-211`) and `getPropertyValue` columns; adding `sort` is cheap but widens the contract.

## 7. Test plan (per `docs/TESTING.md`: real stores, mock only Tauri/side-effect/DOM services; happy path, empty/null input, error handling; every computed getter tested)

New `src/tests/lib/plugins/mods/mod-query.service.test.ts` (jsdom, same harness style as `mod-vault.service.test.ts:1-80`: hoisted in-memory disk behind `@tauri-apps/plugin-fs` and `invoke`, real `collectionStore`, real `vaultStore`, real `buildNoteRecord`/`executeQuery`/evaluator; `svelte-sonner` mocked). Never mock `collection.logic` or the evaluator.

- Setup: `vaultStore.open('/vault')`, `collectionStore.setPropertyIndex(new Map(...))` of records built with the real `buildNoteRecord` (fixtures with `_type`, tags, archived, a `.view`, a note under `_system/`, a `_type: Type` note). Register a real port: `registerViewRowSetPort({ blockRows: (r,v,d) => blockRowSet(r,v,d,{vaultPath:'/vault', systemFolder:'_system'}), ... })` (other members as no-ops), and unregister in `afterEach`.
- `matches`: true/false by property, tag (`file.hasTag`), folder (`file.inFolder("Ideas")` relative), `type == "person"` case-insensitive; indexed record vs unindexed path read from disk (`buildNoteRecord` fallback); missing file rejects; non-note and `.view` path rejects; invalid expression (`foo(`) and unknown function reject with `Mod "<id>": query.matches: ...`; evaluation error rejects instead of false; non-string expression/path rejects (`Invalid vault path` for bad paths).
- `notes`: string filter and object filter (`and`/`or`/`not`); results are vault-relative; excludes `.view`, system folder, type definitions; archived hidden unless the filter cites `archived`; `limit`; deterministic order; broken filter rejects with `filterError` text, never `[]`; object with no condition per the lead's answer; rejects before the index is ready (`collectionStore.reset()`); a note changed through `updateNoteInIndex` (the real consumer path) is seen at once; `file.mtime` of a just-written note documents the stale value (assert it, so the documented limit is pinned).
- Guards: after `runtime.unloaded = true` every call throws `Mod "<id>" is unloaded`; after `vaultStore.open('/other')` same; the shared index record is untouched after a `filter(...)` expression runs (R4).
- Integration through the real context: extend `mod-api-contract.test.ts` (CONTEXT_PUBLIC, QUERY_PUBLIC, "ctx.query exposes exactly the contract members") and add one case in `mods-host.service.test.ts` (existing file; pattern in `mod-note-saved.test.ts:1-60`: a mod source sets `globalThis.__ctx`, then call `ctx.query` through it) so the wiring in `createModContext` is covered, not just the factory. Include a mod calling `ctx.query.matches` from inside an `onNoteSaved` callback after a real `notifyAfterSave` to pin R1's "properties current at save" claim.
- Help tests: update `mods-example.test.ts`, `mods-examples.test.ts`, `mods-types.test.ts` as in section 4.
- Gate per `CLAUDE.md` rule 6 (frontend only): `pnpm check` + `pnpm vitest run`; because `package.json` and `pnpm-lock.yaml` change with the SHA bump, also `pnpm build`. No Rust, no IPC DTO change, so no `cargo test`. No E2E needed (no UI). Suggested commit split: (a) SHA bump + contract-pinned tests/d.ts/fakes (`pnpm build` required), (b) `mod-query.service.ts` + wiring + tests, (c) docs.

## 8. What I did not verify

- Whether `help/documentation/*` are mirrored into a wiki by a script that fails on new headings (`src/tests/scripts/sync-wiki-docs.test.ts` not read).
- Actual timing of `executeQuery` on a large vault; only read the code path.
- The contract/workspace side (types, `fakeCtx`, helper `editNote`): another scout.
- Whether `vaultStore.indexReady` and `collectionStore.isIndexReady` can differ in time at startup (R2); only their definitions were read.
