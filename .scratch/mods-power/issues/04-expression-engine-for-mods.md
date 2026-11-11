# 04: Mods match notes with the view and rule expression engine (`ctx.query`)

**What to build:** the host implements the stable `ctx.query` that mods Issue 03 adds to the contract: `matches(expression, path)` and `notes(expression)`, read-only, over the same Collection engine that views, inline blocks and Auto Organize rules use (`executeQuery`, `src/lib/features/collection/collection.logic.ts:132`). This Issue adopts the new `@kokobrain/mod-core` SHA in the same commit, because the bump alone fails `pnpm check`.

```js
export default {
	onload(ctx) {
		ctx.onNoteSaved(async (path) => {
			if (!path.endsWith('.md')) return;
			if (await ctx.query.matches('type == "meeting" && status == "done"', path)) ctx.notify(`Done: ${path}`);
		});
	},
};
```

**Blocked by:** none

**Requires first (other repo):** mods Issue `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/.scratch/mods-power/issues/03-expression-engine-for-mods.md` delivered and pushed to `origin/main` of `diegorv/koko.brain-mods`, with its full SHA in that Issue's Comments. This Issue adopts that SHA per `docs/MOD-CORE.md` "Updating the dependency" (steps 3-6). Check first that every contract change between the pinned `328ca55f6add4d18e3c5b1490feee66ce8503b5e` (`package.json:81`) and the adopted SHA is either this one or already implemented here: `git -C <mods> diff 328ca55..<sha> -- packages/mod-core/src/contract`. Another item's unimplemented member would fail `pnpm check`; stop and report instead of implementing it.

**Status:** ready-for-agent

**Gate:** frontend, with a dependency change: `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm vitest run`, `pnpm build` (`package.json` and `pnpm-lock.yaml` change). Then the mods workspace's `KOKOBRAIN_HOST_ROOT=<this checkout> pnpm verify` (`docs/MOD-CORE.md` step 6).

### Behavior

1. **Adopt the contract.** `pnpm add -D '@kokobrain/mod-core@github:diegorv/koko.brain-mods#<full-sha>&path:/packages/mod-core'`. Inspect the lockfile: repository, commit and path match; no credentials, workspace links or personal paths (`docs/MOD-CORE.md` step 4). `src/lib/plugins/mods/contract/mod-api.v1.ts` is `export type *` and needs no edit.
2. **New file `src/lib/plugins/mods/mod-query.service.ts`**, `createModQuery({ modId, vaultPath, assertLive }: ModVaultScope): ModQueryV1`, reusing `ModVaultScope` (`src/lib/plugins/mods/mod-vault.service.ts:18-26`). Both members are `async`, so every throw is a rejection. Shared steps, in this order:
   1. `assertLive()`.
   2. `expression` is a string with non-whitespace text, else `Mod "<id>": query.<op> needs a non-empty expression`. An empty string must not reach the engine: `findFilterError` treats `''` as no filter (`collection.logic.ts:233-235`), which matches every note.
   3. `matches` only: `assertVaultPath(path)` (`src/lib/plugins/mods/mods.logic.ts:69-73`), which rejects `Invalid vault path "<path>"`.
   4. `collectionStore.isIndexReady` (`src/lib/features/collection/collection.store.svelte.ts:10,30`), else `Mod "<id>": query.<op>: the vault's notes are not indexed yet`. The property index is empty until the secondary builders run (`src/lib/app/lifecycle/app-lifecycle.service.ts:419-428`) and mods start in the same pass (`:541`), so `onload` often runs before it. An empty answer there would look like "no note matches".
   5. `definition = { views: [{ type: 'table', name: 'mod', filters: expression }] }`. No formulas, no sort, no limit.
   6. After `executeQuery`, a `filterError` (parse error or unknown function, through `validateExpression`, `collection.logic.ts:141-145,238-241`) rejects `Mod "<id>": query.<op>: <filterError>`. Never `false` or `[]` for it.
   
   No `await` between step 1 and the index read, so one live check is enough.
3. **`matches(expression, path)`.** `abs = vaultPath + '/' + path`; `record = collectionStore.propertyIndex.get(abs)`, else reject `Mod "<id>": query.matches: "<path>" is not an indexed note`. Then `executeQuery(definition, definition.views[0], new Map([[abs, record]]), vaultPath)` with no row set, and resolve `result.records.length === 1`. Reusing `executeQuery` keeps the view rule for evaluation errors: `evaluateFilterCached` turns a per-note error into `false` (`collection.logic.ts:359-372`), so `matches` and `notes` agree on every note. No disk read, no Tauri call, no record copy, no special case for `.view` paths.
4. **`notes(expression)`.** `port = getViewRowSetPort()` (`src/lib/features/collection/view-row-set.port.ts:63`); null throws `Mod "<id>": query.notes is not available yet` (in the app it is registered at boot, `src/lib/app/boot.ts:61-65`, before any vault opens). Then `executeQuery(definition, definition.views[0], collectionStore.propertyIndex, vaultPath, (r, v, d) => port.blockRows(r, v, d))`, the same call as an inline block (`src/lib/features/collection/collection-block-widget.ts:117-124`). The row rule is `blockRowSet` (`src/lib/features/rail-shell/lens.logic.ts:749-762`): no system-folder note, `.view` or `_type: Type` note, no archived note unless the expression cites `archived` or `_archived`. Map `result.records` with `relativePath(vaultPath, r.path)` (`src/lib/utils/path.ts:98`) and `.sort()`: Map order differs between a rebuild and deltas.
5. **Wiring.** In `createModContext`, `query: createModQuery({ modId: manifest.id, vaultPath, assertLive }),` after `workspace:` (`src/lib/plugins/mods/mods-host.service.ts:593`), and the import next to `./mod-vault.service` (`:24`). `ModContext` (`:36`) needs no edit: `query` comes from `ModContextV1`.
6. **Layers.** `plugins/mods` already imports `features/collection` (`mod-app.service.ts:9`). Import `collection.logic`, `collection.store.svelte`, `view-row-set.port` and `#lib/utils/path.js` only: not `rail-shell` (use the port) and not `auto-organize`. `layer-baseline.json` must not grow.
7. **Read-only.** Nothing writes, so no save loop and no write race. No core change: the known limits below are documented, not fixed.

### Docs

- `help/documentation/mods/13-api-reference.md`: a `## ctx.query` section after `## ctx.vault` (`:112`), **stable**, a table in the `ctx.vault` style (member, signature, resolves to, rejects with). Add `ctx.query` to the Paths bullet (`:23`) and its messages to the error index (`:248`).
- `help/documentation/mods/10-querying-the-index.md`: a section "`ctx.query` or `ctx.kb()`": `query` is stable and takes the view and rule language; `kb()` is raw and returns pages. Then, in user terms:
  - Inside an expression `file.path` and `file.folder` are absolute: use `file.inFolder("Ideas")`.
  - `notes()` lists like an inline collection block, so it leaves out archived notes unless the expression cites `archived`; `ctx.kb().pages()` keeps them (`src/lib/plugins/queryjs/kb-api.ts:468-481`).
  - Both reject until the vault's notes are indexed: catch and retry later.
  - A typo in a method name (`file.hasTagg("x")`) matches nothing and does not reject, because methods are checked only when they run. Put a negation inside the expression (`!file.hasTag("x")`); never compute "everything except `notes(e)`" in JavaScript and act on it.
  - `file.mtime`, `file.ctime` and `file.size` are `0` (1970) for a note created this session until the index refreshes, a few seconds later. Never pick notes to move or delete by them.
  - After a move or rename, the note is missing from `notes()` and `matches()` rejects for its new path until the index refreshes.
  - Inside `onNoteSaved`, check the extension first: `matches` rejects for a non-Markdown path.
  - `notes()` scans every note on the UI thread: debounce it in `onNoteSaved`, as for `ctx.kb()` ("Cost", `:113`).
- `help/documentation/28-mods.md`: a `### ctx.query` subsection under "The `ctx` reference" (`:135`), after `ctx.vault` (`:294`), with the example above and a link to `10-querying-the-index.md`.
- `help/documentation/mods/15-errors-and-debugging.md`: the "`ctx.vault`, `ctx.workspace` ... call rejects" row (`:20`) also names `ctx.query`.
- `help/documentation/mods/01-anatomy-and-loading.md:300`: `every ctx.query.*` in the list of what rejects after unload.
- `help/examples/mods/kokobrain-mod.d.ts`: `ModQueryV1` and `ModContextV1.query`, identical to the contract.

`src/tests/scripts/sync-wiki-docs.test.ts` pins page names and links, not headings (`:9-32`), so new sections are safe.

### Acceptance

- [ ] Failing test first, new `src/tests/lib/plugins/mods/mod-query.service.test.ts`: with a real `collectionStore` filled by `setPropertyIndex` from real `buildNoteRecord` records (`collection.logic.ts:22`), `createModQuery(...).matches('status == "done"', 'Ideas/a.md')` resolves `true` for a note with `status: done` and `false` for `status: todo`. It fails today (the module does not exist).
- [ ] `matches`: by property, tag (`file.hasTag`), relative `file.inFolder("Ideas")`, `type == "person"`. An evaluation error (`status.lower() == "done"` on a note without `status`) resolves `false`. Empty or whitespace expression, a parse error (`status ==`) and an unknown function reject with the messages above. A path with no record, and a `.canvas` path, reject `is not an indexed note`. A bad path rejects `Invalid vault path`. A `.view` path evaluates.
- [ ] `notes`: vault-relative and sorted; leaves out a `.view`, a note under `_system/`, a `_type: Type` note and an archived note; keeps the archived note when the expression cites `archived`; the evaluation error above leaves that note out; parse errors reject and never resolve `[]`. The test registers a real port wrapping `blockRowSet` (as `boot.ts:61-65` does) and unregisters it in `afterEach`; with no port, `notes` rejects `is not available yet`.
- [ ] Readiness: after `collectionStore.reset()`, both reject `not indexed yet`.
- [ ] Freshness pinned: a record written by the real `updateNoteInIndex` (`src/lib/features/collection/collection.service.ts:152-162`) is matched at once, and for a new path `matches('file.size == 0', p)` is `true` (the documented limit).
- [ ] Guards: after `runtime.unloaded = true`, and after `vaultStore.open('/other')`, both reject `Mod "<id>" is unloaded`.
- [ ] Wiring through the real host, in `src/tests/lib/plugins/mods/mod-note-saved.test.ts`: with the collection note-change consumer registered (`registerCollectionNoteChangeConsumer`, `collection.service.ts:182`) and the index ready, a mod calls `ctx.query.matches` inside its `onNoteSaved` after a real `saveFileByPath`, and sees the saved frontmatter.
- [ ] `src/tests/lib/plugins/mods/mod-api-contract.test.ts`: `query: true` in `CONTEXT_PUBLIC` (`:46-63`), a `QUERY_PUBLIC satisfies Record<keyof ModQueryV1, true>`, and a "ctx.query exposes exactly the contract members" case like `:244-246`. `HOST_UNSTABLE` (`:66`) unchanged.
- [ ] `src/tests/help/mods-types.test.ts`: `ModQueryV1` in `STABLE_TYPES` (`:25-47`) and an `expectTypeOf` equality like `:85`. `src/tests/help/mods-example.test.ts`: `query: unused` in the typed literal (`:38-40`). `mods-examples.test.ts` needs nothing (untyped literal cast at `:481`).
- [ ] Docs above updated.
- [ ] Gate above passes, including `pnpm build` and the mods workspace's `pnpm verify`.

## Notes

- **Research:** `.scratch/mods-power/research/item-04-contract.md`, `item-04-host.md`, `item-04-validation.md` (the validation wins where they differ). Code read at host `c2bed3463`, mods `03526cf`.
- **One commit for the bump and the code:** after the bump, `ModContext extends ModContextV1` requires `query` (`mods-host.service.ts:36,122`), and `CONTEXT_PUBLIC` and `STABLE_TYPES` fail, so the SHA change cannot land green alone. Docs can be a second commit.
- **Decisions taken from the validation:**
  - Stable contract member, strings in, boolean or vault-relative paths out (mods Issue 03 holds the contract text, which this Issue must match).
  - String expressions only. Object filters are where errors-as-false become unsafe (a `not` over a failed leaf matches; `src/lib/features/auto-organize/auto-organize.logic.ts:64-82`), and an empty object matches everything. With strings, `!x.foo()` propagates the error for the whole expression, so an error can only produce "no match".
  - Errors at evaluation count as no match in both functions, as in views. Throwing in `matches` would make it reject on notes that `notes` simply leaves out.
  - `notes` follows the inline-block row rule (archived hidden unless cited), not `kb.pages()` parity, so it lists what a ` ```collection ` block with the same filter lists.
  - Reject before the index is ready; a later change to "wait" is compatible.
- **Cut:** object filters, `limit` and `sort` (`executeQuery` scans every record before limiting, `collection.logic.ts:150,214-218`), formulas, a disk fallback in `matches`, a shallow record copy (`evaluateListHigherOrder` restores in `finally`, `evaluator.ts:541,556`), rejecting `.view` paths, returning records.
- **Accepted limits (documented, no core change):** epoch times and size `0` for a note created this session (`collection.service.ts:155-160`); a moved or renamed note missing until the `vault-index-updated` delta (`src/lib/core/filesystem/path-change.service.ts:209,234`); method typos match nothing (`validateExpression` checks plain functions only, `evaluator.ts:300-317`); a synchronous full scan per `notes()` call; ReDoS through `string.matches`, the same exposure views have. Mods are fully trusted (`docs/adr/0036-vault-mods-trust-loader-storage.md:41`), and `ctx.app`/`ctx.kb()` already expose the raw index, so no new capability.
- **Out of scope, file separately:** the `whenIndexReady` example in `help/documentation/mods/10-querying-the-index.md:71-82` watches `ctx.app.vaultStore.indexReady`, but `ctx.kb()` reads the property index, which is built later (`app-lifecycle.service.ts:419-428`). That is a docs bug for `ctx.kb()`, not for this Issue.
- **Ordering:** independent of items 3 and 6 (host only). Items 1, 2 and 5 also change the contract and the pinned host lists: one adoption at a time. Item 5's Issue must document the rename window above for `onNoteMoved`. With item 6, a `matches` rejection inside `onNoteSaved` becomes a visible callback error, which is why the docs say to check the extension first.
- **Not verified:** that `executeQuery` on a one-entry Map gives the same answer as a full run for that note (the code path was read; the tests pin it); the delay from a rename to the index delta; nothing was run.

## Comments
