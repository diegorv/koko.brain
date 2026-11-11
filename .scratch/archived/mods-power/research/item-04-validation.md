# Item 4 validation: expression engine for mods (read-only)

Adversarial pass over `item-04-host.md` and `item-04-contract.md`. Nothing was run. `MODS:` = `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src` (HEAD `03526cf`); other paths are relative to the host checkout.

## Verdict

- (a) Cost: **small code, medium overall.** The host code is about 40 lines plus one wiring line. The cross-repo contract adoption (mods-repo commit, host SHA bump with `pnpm build`, pinned type lists, docs) is what makes it medium. Marginal cost drops to small if its contract addition shares a mods-repo release with another item's.
- (b) Contract change: **yes**, for the requested `ctx.query`. It is additive, so no `apiVersion` bump (`MODS:packages/mod-core/src/contract/mod-api.v1.ts:15-16`). A raw `ctx.app` member would need no contract change, but it gives no stable access, and the expression engine is unreachable today without it (below).
- (c) Minimal design: two string-in, paths/boolean-out functions. No object filters, no options, no disk fallback, no record copy. The scouts' readiness check, row rule and error rule need changes (below).
- (d) Main risks: empty results before the property index is built, evaluation errors that read as "no match", `file.mtime/ctime` set to `0` (epoch) for a just-created note, and a window after a move/rename in which the note is missing from the index. None of them is a write, a loop or a security risk.
- (e) Ordering: no hard dependency on any other item. Serialize its contract edit with items 1, 2 and 5, which edit the same pinned files. Item 5 must document the rename window this item exposes.

## Claims checked

Confirmed (I opened the code):
- `evaluateExpression` / `validateExpression` at `src/lib/features/collection/expression/evaluator.ts:77,308`. `validateExpression` checks parsing and plain functions only, not methods (`:300-317`).
- `executeQuery` returns `filterError` before reading any record (`src/lib/features/collection/collection.logic.ts:141-145`) and takes `vaultPath` for a relative `file.inFolder()` (`evaluator.ts:574-582`).
- `blockRowSet` drops system-folder notes, `.view` files, `_type: Type` notes and uncited archived notes (`src/lib/features/rail-shell/lens.logic.ts:749-762`). It is reachable through `getViewRowSetPort()` (`src/lib/features/collection/view-row-set.port.ts:63`), which is registered in `src/lib/app/boot.ts:61-65` and called from `src/routes/(app)/+layout.svelte:28`, before any vault opens.
- `plugins/mods` already imports `features/collection` (`src/lib/plugins/mods/mod-app.service.ts:9`), so this adds no new layer edge.
- `ctx.vault` / `ctx.workspace` are built at `src/lib/plugins/mods/mods-host.service.ts:592-593`. `createModContext` returns `ModContext` (`:122`), which extends `ModContextV1` (`:36`). The SHA bump and the implementation therefore have to land in one host commit, as the contract scout said.
- The save path updates the property index synchronously before the mod's `onNoteSaved` timer runs. `notifyAfterSave` calls `applyNoteChange` with source `save` (`src/lib/core/editor/editor.hooks.ts:81`), whose policy has no yield before the consumers (`src/lib/core/filesystem/note-change.service.ts:90`). The mod callback is deferred with `setTimeout(0)` (`mods-host.service.ts:575`). `matches` inside `onNoteSaved` therefore sees the saved frontmatter.
- Pinned host lists: `CONTEXT_PUBLIC satisfies Record<keyof ModContextV1, true>` (`src/tests/lib/plugins/mods/mod-api-contract.test.ts:46-63`) and the key-equality test (`:230-232`). `STABLE_TYPES`, plus the exported-name comparison against the installed contract (`src/tests/help/mods-types.test.ts:25-47,55-60`). The typed literal `ctx: ModContextV1` (`src/tests/help/mods-example.test.ts:38-40`). `fakeCtx` returns an object literal typed as `FakeCtx` (`MODS:packages/mod-core/src/testing/fake-ctx.ts:60,215`).
- The pinned SHA `328ca55f...` (`package.json:81`) is an ancestor of `MODS` HEAD, and `git diff --stat 328ca55..HEAD -- packages/mod-core/src/contract` is empty. I re-ran both.

Refuted or corrected:
1. **"`src/tests/help/mods-examples.test.ts` needs a `query` stub"** (host section 4.2). Wrong. Its `ctx` is an untyped literal (`:267`) cast with `as unknown as ModContextV1` (`:481`), so a new member does not fail `pnpm check`. Only `mods-example.test.ts` needs `query: unused`.
2. **"`notes()`/`matches()` must be async because `buildPropertyIndex` is async"** (contract point 1). That reason does not hold: both read the in-memory `collectionStore.propertyIndex` and await nothing. Keep `Promise` for a different reason: the shape is frozen in the stable contract, and sync to async later is a breaking change. A Promise leaves room to wait for readiness, or to scan off the main thread, without `apiVersion: 2`, and it costs no code.
3. **"Reject unless `isIndexReady`; a mod waits with `ctx.watch` as the docs show"** (host R2). The docs example watches `ctx.app.vaultStore.indexReady` (`help/documentation/mods/10-querying-the-index.md:74-82`), which is the wrong flag. The property index is a secondary builder that runs in a later `setTimeout` after the vault index (`src/lib/app/lifecycle/app-lifecycle.service.ts:418-428`), so `vaultStore.indexReady` can be true while `collectionStore.isIndexReady` is false. A mod built only on the stable contract also cannot read either flag. Rejecting is still right (see design), but the contract text must say "rejects until the vault's notes are indexed; retry later". Later relaxing that to "waits" is compatible, because it only turns a rejection into a result. The existing `whenIndexReady` doc example is wrong for `ctx.kb()` too: it reads the property index through `createModKb` (`mod-app.service.ts:84`). That is a separate docs bug, so file it, do not fix it here.
4. **"Disk fallback in `matches` (read the file, `buildNoteRecord`)"** (host 3.1 step 3). Cut it. Every note write the app or a mod makes reaches the index synchronously: `save` (`note-change.service.ts:90`), `create` and `fs` (`:93-94`, consumers always). The paths that are really unindexed are non-Markdown files, which the consumer never indexes (`src/lib/features/collection/collection.service.ts:182-190`), a path whose new record has not landed after a move (risk D4), and the time before the first build. A disk-built record would disagree with views in exactly those cases, and it adds Tauri reads and mocks. Reject `Mod "<id>": query.matches: "<path>" is not an indexed note` instead. With no disk read the factory makes no Tauri call.
5. **"Let evaluation errors throw in `matches`, like Auto Organize"** (host 3.1 step 4). That would give the two functions different rules. `notes()` runs `executeQuery`, whose `evaluateFilterCached` turns a per-note evaluation error into `false` (`collection.logic.ts:368`). If `matches` threw, `matches(e, p)` would reject on a note that `notes(e)` simply leaves out. Errors at evaluation are common, not edge cases: an unknown method throws only when it runs (`src/lib/features/collection/expression/methods.logic.ts:269`), and so does a method on a missing property. Under the throwing rule `matches('status.lower() == "done"', p)` would reject for every note without `status`. Auto Organize throws because of object filters, where `not` can turn a failed leaf into a match (`src/lib/features/auto-organize/auto-organize.logic.ts:64-82`). With **string-only** expressions that cannot happen: `!x.foo()` propagates the throw for the whole string, so an error can only produce "no match", never a false match. Recommended rule for both functions: reject what `validateExpression` rejects, and count a per-note evaluation error as no match, as views do.
6. **"Accept object filters in `notes()`"** (host 3.1, R9). Cut them, as the contract scout says. Object filters are where errors-as-false become unsafe (point 5), and supporting them would need the `filterProblem` checks from `auto-organize` (an empty object matches every note, `auto-organize.logic.ts:29-35`). Strings can still express `and/or/not` (`&&`, `||`, `!`). Object filters can be added later without a break.
7. **"`limit` option"** (host 3.1). Cut it. `executeQuery` scans every record before it applies the limit (`collection.logic.ts:150,214-218`), so `limit` saves nothing that `.slice()` in the mod does not.
8. **"Give `matches` a shallow copy of the record"** (host R4). Cut it. `evaluateListHigherOrder` restores `properties` in `finally` (`evaluator.ts:541,556`), so a throw cannot leak the swapped map. The evaluation is synchronous, and views already pass the shared index records into the evaluator (`collection.logic.ts:164-172`). The copy guards against a future async evaluator that does not exist.
9. **"Reject a `.view` path in `matches`"** (host R3). Cut it. It is read-only, a `.view` record evaluates harmlessly, and the special case buys nothing.
10. **"No new freshness risk beyond mtime"** (host R1, R3). Incomplete: see D3 and D4.

## Why a contract change and not `ctx.app`

`MOD_APP` (`mod-app.service.ts:25-68`) exposes no evaluator, and `ctx.kb()`'s `pages(source)` takes only a `#tag` or a `"folder"` source (`src/lib/plugins/queryjs/kb-api.ts:110-131`). Mods today filter in JS (`MODS:packages/mod-core/src/notes/notes.ts:4-17`). Adding `executeQuery` to `MOD_APP` is a one-line alternative that needs no contract change, but it hands mods absolute paths, `PropertyIndexRecord` and `CollectionDefinition`, all with no promise. The stable surface proposed below carries only strings, booleans and vault-relative paths, so it is cheap to freeze. One caveat must be in the contract text: the expression **language** is the app's view and rule language and evolves with it (the `is_a` alias was dropped: `evaluator.ts:85-95`). The promise covers the function shapes and the path, readiness and error rules, not every function name in the language.

## Minimal design

Contract (`MODS:packages/mod-core/src/contract/mod-api.v1.ts`, next to `vault` at about `:364`):

```ts
/** Read-only matching with the filter expressions of views and Auto Organize rules */
export interface ModQueryV1 {
	/**
	 * Resolves to whether the indexed note at vault-relative `path` matches `expression`.
	 * Rejects `Mod "<id>": ...` when the expression does not parse or calls an unknown
	 * function, when the path is not an indexed note, or before the vault's notes are indexed.
	 * An error while evaluating it on the note (an unknown method, a method on a missing
	 * property) counts as no match.
	 */
	matches: (expression: string, path: string) => Promise<boolean>;
	/**
	 * Resolves to the sorted vault-relative paths of the notes matching `expression`,
	 * listed like an inline collection block: no system-folder note, `.view` or type
	 * definition, and no archived note unless the expression cites archived.
	 * Same rejections and error rule as `matches`.
	 */
	notes: (expression: string) => Promise<string[]>;
}
```
and `query: ModQueryV1` in `ModContextV1`.

Host (`src/lib/plugins/mods/mod-query.service.ts`, `createModQuery(scope: ModVaultScope)`, reusing the scope type from `mod-vault.service.ts:18-26`):
- Shared guard: `assertLive()`. Expression is a non-empty string, else `invalid`. `collectionStore.isIndexReady`, else reject `query.<op>: the vault's notes are not indexed yet`.
- `matches`: `assertVaultPath(path)`, `abs = vaultPath + '/' + path`, `record = collectionStore.propertyIndex.get(abs)` or reject "not an indexed note". Then `executeQuery(def, view, new Map([[abs, record]]), vaultPath)` with no row set. This reuses the exact view semantics (validation, `filterError`, errors as false) and needs no second evaluation path. `filterError` rejects, otherwise the result is `records.length === 1`.
- `notes`: `executeQuery(def, view, collectionStore.propertyIndex, vaultPath, rowSet)` with `rowSet` from `getViewRowSetPort()`, the same call as `src/lib/features/collection/collection-block-widget.ts:117-124`. Throw if the port is null. In the app it is registered before any vault opens (layout `:28`), so a null port only shows up in a test that forgot to register it. `filterError` rejects, never `[]`. The result is mapped with `relativePath(vaultPath, r.path)` and `.sort()`ed, because Map order changes between a rebuild and deltas (`collection.service.ts:122-125`).
- `def = { views: [{ type: 'table', name: 'mod', filters: expression }] }`. No formulas, no sort.
- No await between `assertLive` and the read, so no second live check is needed.
- Wiring: one line in `createModContext` after `:593`, plus the import.

Cut from both scouts: object filters, `limit`/`sort` options, disk fallback, record copy, `.view` rejection, returning records.

## Risks the design must handle

- **D1 Silent empty before the first property-index build (high for destructive mods).** `propertyIndex` is an empty Map until `setPropertyIndex` (`src/lib/features/collection/collection.store.svelte.ts:8-9,37-41`). It is reset at vault teardown (`collection.service.ts:217-219`, `app-lifecycle.service.ts:666`), and mods start in a later timer (`app-lifecycle.service.ts:541`), so `onload` often runs before the index is built. Handled by the readiness rejection. Test it with `collectionStore.reset()`.
- **D2 Errors as no match (medium).** A typo in a method name (`file.hasTagg("x")`) matches nothing and does not reject, because `validateExpression` does not check methods (`evaluator.ts:300-305`). A mod that computes a complement in JS (`all - notes(e)`) and then acts on it would act on everything. Document "put the negation inside the expression". Do not add method validation here: it would be a core change to the evaluator.
- **D3 Epoch timestamps (medium, data-loss shaped).** A note created in this session has `mtime`, `ctime` and `size` set to `0` until the Rust delta lands (`collection.service.ts:152-162`: `existing?.mtime ?? 0`), and `file.mtime` evaluates to `new Date(0)` (`evaluator.ts:203`). An "older than 90 days" expression therefore matches a note created a second ago. The stable contract gives a mod no other mtime (`ModVaultEntryV1` has only `name`, `path`, `isFolder`: `MODS:.../mod-api.v1.ts:122-129`). Document: never choose notes to delete or move by `file.mtime/ctime/size`. Pin the current value in a test.
- **D4 Window after a move or rename (medium).** `applyPathChange` evicts the old path (`src/lib/core/filesystem/path-change.service.ts:234`, `forgetNote`), and the new path's record arrives only with the `vault-index-updated` delta (`path-change.service.ts:209`, `src/lib/app/tauri-listeners.service.ts:245`). No path-change consumer re-keys the property index (`collection.service.ts:213` moves only the view-index memory). Until the delta lands, `matches(newPath)` rejects and `notes()` leaves the note out. Document it. If item 5 ships `onNoteMoved`, its docs must say this, because "on move, test the note" is the obvious use. Do not fix it in core here.
- **D5 Performance (low).** `notes()` is a synchronous full scan on the main thread, the same cost an inline block pays. Document: debounce it in `onNoteSaved`, as the `ctx.kb()` docs already advise.
- **D6 Security (none new).** The evaluator has no `eval`, DOM or network access. `string.matches` builds a `RegExp`, which allows ReDoS, the same exposure views have. Mods are fully trusted (ADR 0036). The design is read-only and adds no loop or write race.

## Files and tests

Mods repo (first commit, pushed):
- `packages/mod-core/src/contract/mod-api.v1.ts`: `ModQueryV1` and `query`.
- `packages/mod-core/src/testing/fake-ctx.ts`: `query: { matches: notModelled('query.matches'), notes: notModelled('query.notes') }` (`notModelled` at `:155`) and an optional `query?: Partial<ModQueryV1>` override in `FakeCtxOptions` (`:45-57`).
- `packages/mod-core/test/testing/fake-ctx.test.ts`: the default throws, the override is used.
- Gate: `pnpm check` with `KOKOBRAIN_HOST_ROOT`, plus `check:package` in a temp consumer (`docs/MOD-CORE.md`, Updating the dependency 1-2).

Host (one commit: SHA bump plus code plus pinned tests, because the bump alone fails `pnpm check`):
- `package.json`, `pnpm-lock.yaml` (SHA).
- `src/lib/plugins/mods/mod-query.service.ts` (new), `mods-host.service.ts` (one line plus the import).
- `src/tests/lib/plugins/mods/mod-query.service.test.ts` (new): real `collectionStore`, real records from `buildNoteRecord`, a real port wrapping `blockRowSet`, unregistered in `afterEach`. Cases: match/no match by property, tag, relative `inFolder`, `type`. Parse error and unknown function reject in both functions. An evaluation error is false in `matches` and leaves the note out of `notes`. Not ready rejects. An unindexed path and a non-Markdown path reject. Bad path gives `Invalid vault path`. Results are vault-relative and sorted. The `.view`, system-folder and type-definition notes are excluded. Archived is hidden unless cited. A record changed through `updateNoteInIndex` is seen at once. A new note's `mtime` is `0` (D3). Every call throws after unload or a vault switch.
- `src/tests/lib/plugins/mods/mod-api-contract.test.ts`: `query: true`, `QUERY_PUBLIC`, a "ctx.query exposes exactly the contract members" case.
- One case in the existing host test file that covers the `onNoteSaved` wiring: a mod calls `ctx.query.matches` inside its `onNoteSaved` after a real `notifyAfterSave` (pins the save-time freshness claim).
- `src/tests/help/mods-example.test.ts` (`query: unused`), `src/tests/help/mods-types.test.ts` (`ModQueryV1` in `STABLE_TYPES`), `help/examples/mods/kokobrain-mod.d.ts` (the identical declaration).
- Gate: `pnpm check`, `pnpm vitest run`, `pnpm build` (lockfile change). Then `pnpm verify` in MODS. No cargo.

Docs (a separate commit is fine): `help/documentation/mods/13-api-reference.md` (a `ctx.query` section and the error index), `help/documentation/mods/10-querying-the-index.md` (query vs kb, absolute `file.path` inside expressions, D2-D4), `help/documentation/28-mods.md` (the stable member list), `help/documentation/mods/15-errors-and-debugging.md` (error table). `src/tests/scripts/sync-wiki-docs.test.ts` pins page names and links, not headings (`:9-32`), so new sections are safe.

## Ordering

- No dependency on items 1, 2, 3, 6 or 7. Item 3 and item 6 are host-only and can run in parallel with this one.
- Items 1, 2, 4 and 5 all edit `mod-api.v1.ts`, `fake-ctx.ts`, `CONTEXT_PUBLIC`, `STABLE_TYPES` and the help d.ts. Run them one at a time (one mods commit plus one host bump each), or put several contract additions in one mods release and adopt them in one host commit. Never two in flight.
- Item 4 is the lowest-risk contract addition: read-only, with no core change. It makes a good first SHA bump if item 1 is not urgent.
- Before item 5: item 5's Issue has to cover D4.
- With item 6: `matches` rejecting for a non-note path inside `onNoteSaved` would show up as a visible callback error. The item 4 docs should tell mods to check the extension first.

## Not verified

- The time from `rename_note` until the delta lands (D4). I traced only the order of the calls.
- The `>`/`<` comparison semantics between `file.mtime` and a date expression. D3 relies on `new Date(0)` being older than any cutoff, not on a specific syntax.
- That `executeQuery` on a one-entry Map behaves the same as a full run for `matches`. I read the code path. A test should pin it.
- I did not read ADR 0036.
