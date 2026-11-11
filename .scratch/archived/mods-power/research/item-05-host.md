# Item 5 (note create / move / rename events for mods): host side

Scout report. Nothing was run; every claim is from reading code. Paths are relative to `/Users/diegorv/Dev/pet-projects/koko/brain` unless prefixed.

## 1. Summary

- There is no creation hook and no move hook a mod can subscribe to today. `onNoteSaved` rides `addAfterSaveObserver` (`src/lib/plugins/mods/mods-host.service.ts:566-591`, `src/lib/core/editor/editor.hooks.ts:56-62`), which fires only from `notifyAfterSave`.
- Moves and renames already have one owner: `applyPathChange` (`src/lib/core/filesystem/path-change.service.ts:145-236`). All three entry points (`deleteItem`, `renameItem`, `moveItem`, `src/lib/core/filesystem/fs.service.ts:248, 285, 313`) route through it, and `ctx.vault.rename/move/delete` call those same functions (`src/lib/plugins/mods/mod-vault.service.ts:56-77`). A consumer registered with `registerPathChangeConsumer` (`path-change.service.ts:73-80`) sees every app-originated rename, move and delete, but the interface is too thin for a mod (see 3.2).
- Creation has no registry. Four call sites create a note and then call `applyNoteChange`: `fs.service.ts:216` (source `fs`), `note-creator.service.ts:118`, `closed-note-writer.service.ts:79` and `mod-vault.service.ts:108` (all source `create`). These are the only callers of Rust `create_note` (grep `'create_note'` in `src/lib`: exactly these four). The cheapest single point is the `applyNoteChange` upsert branch, gated on source `create` or `fs`.
- External changes (Finder, git, sync) are not observable as create or move: the watcher payload is bare paths (`fs.watcher.ts:57-59`, `notifyListeners`), and a move shows up as a delete plus a create. Recommend app-originated events only, same as `onNoteSaved` ("does not subscribe to external filesystem edits or to note creation", `help/documentation/28-mods.md:173`).
- Recommended shape on the host: (a) optional third argument on `PathChangeConsumer.pathChanged` carrying directory flag and the child snapshot `applyPathChange` already computes; (b) an optional `settled` callback fired at the end of `applyPathChange`, because delivering at the consumer's position hands a mod a half-finished move; (c) a created listener registry in `note-change.service.ts` fired by the owner for sources `create` and `fs`; (d) path-keyed "own operation" marks in `mod-vault.service.ts` so item 2's `ignoreOwnWrites` has a counterpart here.
- This item is blocked on the contract: `mod-api-contract.test.ts` types `CONTEXT_PUBLIC` as `Record<keyof ModContextV1, true>` (`src/tests/lib/plugins/mods/mod-api-contract.test.ts:38-55`), so host code cannot compile against new `ctx` members until the mods workspace commit is adopted by SHA (`docs/MOD-CORE.md` "Updating the dependency").

## 2. Existing pieces to reuse

| Piece | Where | Use |
|---|---|---|
| `registerPathChangeConsumer(consumer)` returning unregister | `path-change.service.ts:73-80` | One registration per mod subscription; the unregister fits `disposable(...)` in `createModContext` (`mods-host.service.ts:131-142`), so unload and double-dispose are already handled. |
| Consumer fan-out: synchronous, per change, isolated try/catch, iterates a copy | `path-change.service.ts:176-182` | A throwing mod cannot break the move. |
| Child snapshot taken before `diskOp` | `path-change.service.ts:149-151` (`collectFilePathsUnder`, `fs.logic.ts:365-380`, files only, all extensions) | Give a folder move its note list without a second tree walk. |
| `movedNode` snapshot | `path-change.service.ts:152` | Source for `isDirectory` when the caller omitted it (rename/move omit it, `fs.service.ts:287-289, 315-317`). Null on delete. |
| `applyNoteChange` upsert branch with explicit `SOURCE_POLICY` | `note-change.service.ts:89-98, 197-269` | Single owner for "a note's bytes were written"; `create` and `fs` rows have `consumers: 'always'`, `yieldBeforeConsumers: false`, so the fan-out is synchronous (`:268`). |
| `vaultRelativeKey(vaultPath, path)` (null outside the vault) | `src/lib/utils/path.ts:120-123` | Already used by `onNoteSaved` (`mods-host.service.ts:572`); same conversion for the new events. |
| `setTimeout(0)` + `pending` set + liveness checks | `mods-host.service.ts:569-590` | Template for delivery and for cancelling on dispose/unload. Copy it; do not invent a second pattern. |
| Test template with real services | `src/tests/lib/plugins/mods/mod-vault-paths.test.ts:1-100` (rename/move via real `applyPathChange`), `mod-note-saved.test.ts` (fake timers, `startModsHost`) | Base for the new test file. |
| Recorder-style consumer tests | `src/tests/lib/core/filesystem/fs.service.test.ts:1308-1385` | Pattern for asserting `(from, to)` and isolation of a throwing consumer. |

## 3. What an implementation touches

### 3.1 Contract (other repo, listed only for the dependency edge)

`/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/packages/mod-core/src/contract/mod-api.v1.ts`. `onNoteSaved` is at about line 362; its JSDoc says it does not cover external edits. New members are additive (no `apiVersion` bump, header rules). Host files re-export only (`src/lib/plugins/mods/contract/mod-api.v1.ts`, 2 lines). Host work cannot start before the SHA is adopted (`package.json`, `pnpm-lock.yaml`).

### 3.2 `src/lib/core/filesystem/path-change.service.ts`

- `PathChangeConsumer.pathChanged(from, to)` (`:38-49`) gives a mod nothing about folder children. For a folder, the consumer is called once for the folder (`:43-45`). A mod that wants note-level events needs the child list. Recommended additive change: `pathChanged(from, to, info?)` where `info = { isDirectory: boolean; childPaths: string[] }`, built from `childPaths` (`:149-151`) and `change.isDirectory ?? movedNode?.isDirectory`. Existing consumers ignore the extra argument; no existing test changes shape (`fs.service.test.ts:1311` uses a two-argument arrow).
  - Alternative without touching core: in the mod consumer, call `collectFilePathsUnder(fsStore.fileTree, from)` synchronously. It works for rename/move because the tree still holds the old subtree when consumers run (tree is rewritten at `:199`, after the awaits), but on delete the node is already removed (`:172`), so deletes would lose children. Prefer the explicit argument.
- Timing problem. Consumers run after `diskOp` and `updateTabAfterRenameOrMove` but before three further awaits: `updateLinksAfterRename` (`:190`), the tree re-key (`:199`), `rename_note` and `rename_in_search_index` (`:209, :222`). A mod callback scheduled with `setTimeout(0)` (the `onNoteSaved` pattern) runs inside that window and observes: links in referencing notes not yet rewritten, `fsStore.fileTree` still at the old path, Rust `VaultIndex` and FTS rows still at the old key, `ctx.kb()` stale. If that callback itself calls `ctx.vault.move` on the moved path, a second `applyPathChange` starts while the first is at `get_backlinks_v2` / `rename_note`; `movedNode` for the new path is null, so it takes the `refreshTree()` fallback (`:200-202`) and `rename_note` calls race. It is survivable, not clean.
  - Recommended: add an optional `settled?(from, to, info)` to `PathChangeConsumer`, called once after the final `forgetNote` loop (`:233-235`), isolated like the first fan-out. The mod host registers `settled` only; other consumers are untouched. Cost: one new loop, same error isolation.
  - Pre-existing gap to be aware of: `updateLinksAfterRename` is not in a try/catch (`:190`); if it rejects, `applyPathChange` rejects and a `settled` call at the end never runs (the move still happened on disk). The mod would silently miss that event. Either call `settled` from a `try/finally` around the tail, or accept and state it. Do not widen scope without asking.
- Rename vs move: `PathChange` does not distinguish them (`:16-31`); `renameItem` and `moveItem` build identical changes. A mod-visible distinction can only be derived (same parent directory means rename). Suggest one event `onNoteMoved({ from, to })` documented as covering rename too, or two names fed by the same dirname comparison. Decision for the contract scout/owner.
- Delete arrives as `to === null`. Not requested by item 5. Free to add (`onNoteDeleted`) but widens the contract; flag as a scope question. Note a "delete" is a move into `.kokobrain/trash` done inside `diskOp` (`trash.service.ts:71`), so mods never see the trash path.

### 3.3 `src/lib/core/filesystem/note-change.service.ts` (creation)

- Add a small registry next to `registerContentInvalidationListener` (`:127-152`), e.g. `registerNoteCreatedListener(name, fn(path, content))`, and fire it in `applyNoteChange` right before `fanOut('upsert', ...)` (`:268`) when `change.source` is `create` or `fs`. Put the flag in `SourcePolicy` (`:55-70`) as `created: boolean` so the table stays the single statement of per-source behavior (`create: true`, `fs: true`, all others false).
- `fs` is documented as "the file explorer's create / delete / rename / move" (`:9-16`) but its only upsert caller is `createFile` (`fs.service.ts:216`; grep `source: 'fs'` in `src/lib` finds only that line). The doc comment is stale; correct it in the same change if the flag is added.
- Rule 6 of `docs/agents/indexing-watcher-rules.md` says "do not grow a second owner". A listener fired by the owner is a consumer-style extension, not a second owner, but it must be wired like the others: a registry that nobody registers into is a SILENT no-op. The mod host registers per `ctx` subscription (not in `initializeVault`), so there is no lifetime list to maintain, only the `disposable` wrapper.
- Do not fire on `restore` (Trash restore, `trash.service.ts:257`): it is a return of an existing note, not a new one. State this in the docs. Open decision for the owner: whether restore should count as created.
- Gaps: `duplicateItem` (`fs.service.ts:345-364`) uses `copyFile` and `addScannedToTree`, never `applyNoteChange`, so duplicated notes (and folder copies) produce no created event. Either call the owner there (a behavior change in a core write path, see memory "no core changes for corner cases") or document the gap. Recommend documenting it.
- Content: creators pass `content` to the owner, so the listener can hand the text to the mod. Whether the contract exposes it is an item 2 / contract question (item 2 wants content for saved).
- `ctx.vault.create` (`mod-vault.service.ts:95-117`) calls `applyNoteChange` itself with source `create`, so it fires the same listener for free. Today's doc line "`create` does not run them [after-save steps]" (`help/documentation/28-mods.md:313`) stays true.

### 3.4 `src/lib/plugins/mods/mods-host.service.ts`

- Add the new `ctx` members next to `onNoteSaved` (`:566-591`). Share its structure: validate callback (`invalid('... needs a callback function')`, pattern at `:568`), `assertLive`, `vaultRelativeKey` null filter (`:572-573`), `setTimeout(0)`, `pending` set, `report` to `debug(tag, ...)` (never Sentry, PRD P9), return `disposable(...)`.
- Extract the shared scheduling (a `deliver(relative, fn)` helper) rather than copy-pasting a third time; `onNoteSaved` would use it unchanged. Keep this inside `createModContext`; no new file needed.
- Path filtering. `onNoteSaved` reports every in-vault path, including non-Markdown (`28-mods.md:313`). For move/create, decide a filter: at minimum drop paths under `_system/mods/` that `isModCodePath` marks as code (`mods.logic.ts:58-61`), because editing a mod's own `main.js` already triggers a host reload (`onModFilesChanged`, `mods-host.service.ts:854-861`) and a mod would get events about its own source. Also decide Markdown-only vs all files; `.view` files are notes to the app (`isViewFile`).
- `ModContext` host-only members (`:36-69`) are not frozen; the new events are stable and belong in `ModContextV1`.
- Folder events: for a folder move either (a) one callback per child note, or (b) one folder event. A 1000-note folder under (a) schedules 1000 timers and 1000 mod calls in one tick. Recommend (a) delivered through one timer that loops children, or (b) with `isFolder` and `children` in the payload. Contract scout to pick the shape; the host supports either from the `info` argument.

### 3.5 `src/lib/plugins/mods/mod-vault.service.ts` (own writes)

- `ctx.vault.rename/move/delete/create` (`:56-77, :95-117`) are the mod's own writes and trigger the same events for all mods, including the caller. Without a guard, `onNoteCreated -> vault.create -> onNoteCreated` loops (a new loop class `onNoteSaved` docs already warn about, `help/documentation/28-mods.md:179`).
- Cheapest correct mechanism, matching item 2's `ignoreOwnWrites`: a module-level `Map<absolutePath, Set<modId>>` (or a counter map) set in the vault adapter immediately before the service call and cleared in `finally`; the event delivery checks `own.get(path)?.has(modId)`. Key by path, not by a global "currently writing" flag, because the services await across macrotasks and other writers interleave. For rename/move key on `from` (the consumer sees `from` and `to`); for create key on the absolute path (the listener runs synchronously inside `create`, before it returns, so the mark is still set); for write, `notifyAfterSave` runs synchronously inside `write` (`:135`), so a mark around it is enough.
- Marks are consumed only by events for that exact path, so a cleared `finally` leaves no residue. A folder move marks `from` once; children events inherit through the `info` snapshot (check `from` prefix) or are keyed by the folder; define which in the implementation.
- Note this is the same structure item 2 needs. Coordinate: one helper, two features. Do not implement it twice.

### 3.6 Docs and help (must change with the feature)

- `help/documentation/28-mods.md:171-180` (the `onNoteSaved` section states "or to note creation"; update and add the new section), and `:313` (what `create` runs).
- `help/documentation/mods/07-events-and-reactivity.md`: intro line 3 ("three subscriptions"), table line 8, section `:173-229` (loop warning to extend), cleanup list `:419`, debounce line `:655`.
- `help/documentation/mods/13-api-reference.md:101` (row format shown: signature, returns, throws, stability), `mods/README.md:86, 100, 122, 181`, `mods/16-pitfalls-checklist.md:61, 78`, `mods/12-types-build-and-test.md:477, 570` (fake ctx `notModelled(...)` list: new members must be added or the fake drifts; the fake is in the mods workspace `packages/mod-core/src/testing`).
- Tests that read help: `src/tests/help/mods-example.test.ts`, `src/tests/scripts/sync-wiki-docs.test.ts`; check them when docs change (not read in detail here).
- `docs/adr/0036-vault-mods-trust-loader-storage.md` uses dated amendments for additive contract members (see the 2026-11-06 `loadData` amendment). A short amendment is the established pattern if the owner wants the decision recorded; not required by any test.

## 4. Hidden costs and layer rules

- Layers. `plugins/mods` importing `core/filesystem/path-change.service` and `core/filesystem/note-change.service` is plugin to core, allowed (`mod-vault.service.ts` already imports `core/filesystem/*`). Core must not import plugins, which is why registries live in core. `src/tests/lib/architecture/layer-rules.test.ts` (baseline size 3) will fail on any new inversion; nothing proposed adds one.
- Pure logic (path mapping `to + child.slice(from.length)`, rename-vs-move classification, filter) belongs in `mods.logic.ts` (no framework imports; `src/tests/lib/architecture/pure-logic.test.ts` enforces) with unit tests in `src/tests/lib/plugins/mods/mods.logic.test.ts`.
- Cost per rename: one more consumer per subscribed mod in a synchronous loop; negligible. With no subscribers, zero cost beyond the empty-array loop.
- Cost per create: one loop over zero or few listeners inside the already-synchronous branch; must not add an `await` (rule 6: "`save` must stay synchronous"; `create` and `fs` are also synchronous today).
- Indexing rules to respect: Rule 9 (absolute paths in core, relative only at the mod boundary; the host converts at delivery, as `onNoteSaved` does). Rule 6 (no second owner of path changes or note bytes; extend the existing owners). Rule 8 (dedupe map untouched). Do not call per-file updaters directly. A mod callback must not run inside the synchronous fan-out (hence the timer).
- `PathChangeConsumer` lifetimes (`path-change.service.ts:70-72`): vault-lifetime or app-lifetime. A mod subscription is a third lifetime (mod-lifetime), unregistered by the mod's disposer and by `stopModsHost` through `unloadMod` (`mods-host.service.ts:636-641`). No change needed to the doc, but the comment on `registerPathChangeConsumer` lists only two lifetimes; update it if the code lands.
- No dedupe on the mod side: two quick renames produce two events in order (timers with equal delay fire in order of scheduling).

## 5. Risks

1. Loops (highest). A handler that creates or moves notes retriggers itself. Mitigated by the own-operation marks in 3.5; cross-mod loops (A creates, B creates) remain and are the mods' business. Auto Organize also moves notes on save (`auto-organize.service.ts:338` uses `moveItem`, `:472` `renameItem`), so a mod that rewrites a moved note feeds Auto Organize again; Auto Organize's own `writingPaths` guard (`:64, :205`) only covers its own writes. Document with the existing "Avoid save loops" paragraph.
2. Half-finished state at delivery (3.2): use the `settled` hook, not the consumer position.
3. Bulk operations: folder move/delete with many children; folder copy produces nothing (3.3). Decide the payload shape before the contract is written.
4. Missed events: external changes, `duplicateItem`, trash restore, and a rejected `updateLinksAfterRename` (3.2). Document "events cover moves and creations the app makes", as `onNoteSaved` documents its limit.
5. Races at vault switch or unload: mirror `onNoteSaved` (`:573, :577`): re-check `runtime.unloaded` and `vaultStore.path !== vaultPath` in the timer. A `settled` call arrives after `await`s, so the vault may have changed; the check is mandatory, not decorative.
6. Mod-code paths: events for `_system/mods/**` code files (3.4).
7. Security (ADR 0036). Mods run with full app trust and can already call any Tauri command; events expose paths only (and content on create if the contract adds it), nothing the mod cannot already read. No new privilege. Keep mod errors out of Sentry (use `debug(tag, ...)` like `report`, `mods-host.service.ts:570`).

## 6. Test plan (per `docs/TESTING.md`; no mocking of stores or `.logic.ts`)

Write each test before the code and watch it fail.

1. `src/tests/lib/core/filesystem/note-change.service.test.ts`: created listener fires for `create` and `fs` with `(path, content)`, not for `save`, `edit`, `watcher`, `restore`, `task`, and not for `delete`; fires synchronously (no await needed); a throwing listener is isolated and logged and later listeners still run; unregister stops it; listener sees the call before the returned promise resolves. Template: the per-source loop at `:85`.
2. `src/tests/lib/core/filesystem/fs.service.test.ts` (block at `:1308`): `pathChanged` receives `info` with `isDirectory` and `childPaths` for a folder move, a file rename, and a delete; the old two-argument recorder still passes; `settled` runs after the link rewrite and tree re-key (assert order against `invoke` calls `rename_note` and `rename_in_search_index`), not on a failed `diskOp`, isolated on throw.
3. New `src/tests/lib/plugins/mods/mod-note-events.test.ts`, built like `mod-note-saved.test.ts` (fake timers, `startModsHost`, real services, mocked Tauri fs/invoke): 
   - `ctx.vault.create` by mod A reaches mod B's `onNoteCreated` as a vault-relative path and does not reach A when the own-write option is on; reaches A when off.
   - `renameItem` and `moveItem` on a note and on a folder (real tree from `mod-vault-paths.test.ts` setup) deliver old and new relative paths after the `setTimeout(0)`; assert the file tree and the tab already show the new path inside the callback (this is what proves `settled`, not just "was called").
   - Paths outside the vault and `_system/mods/` code paths are not delivered.
   - Dispose cancels pending callbacks; unload cancels and later registration throws `unloaded`; vault switch drops pending; a sync throw and an async rejection land in `debug(tag, ...)`, not `error`; a non-function callback throws.
   - Duplicate (`duplicateItem`) and Trash restore produce no created event (pin the documented limit).
4. `src/tests/lib/plugins/mods/mod-api-contract.test.ts`: add the new keys to `CONTEXT_PUBLIC` (`satisfies Record<keyof ModContextV1, true>` fails `pnpm check` until the contract SHA is adopted) and to the argument-shape assertions; `:231` compares `Object.keys(makeContext())` against the list, so a missing host member also fails at runtime.
5. `src/tests/lib/plugins/mods/mods.logic.test.ts` for any pure helper (child mapping, rename-versus-move, path filter).
6. Gate: frontend only, so `pnpm check` + `pnpm vitest run` (plus `pnpm build` if the dependency SHA moves `package.json` or `pnpm-lock.yaml`, per CLAUDE.md rule 6). Per the owner's memory "Gate matches what changed", targeted tests plus `pnpm check` suffice for the small edits; the SHA adoption needs the full steps in `docs/MOD-CORE.md`.

## 7. Open questions for the owner / synthesis

1. One event for rename and move, or two names? The host cannot tell them apart except by dirname (3.2).
2. Folder moves: per-note events, or one folder event with children (3.4)?
3. Include delete, and restore-as-created (3.2, 3.3)?
4. Markdown only, or every file like `onNoteSaved` (3.4)?
5. Accept the `duplicateItem` and external-change gaps as documented limits (recommended), or extend the owner (touches core write paths)?
6. Does the created event carry content (the creators have it)? Tied to item 2's design for `onNoteSaved` content.
7. Own-write marks: shared with item 2; implement once.

## 8. Not verified

- Did not read `watcher-handler.service.ts` beyond its `applyNoteChange` calls (`src/lib/app/lifecycle/watcher-handler.service.ts:115-118`), so the claim "externals cannot be classified as create" rests on the watcher payload being bare paths (`fs.watcher.ts` `onFileChange`/`notifyListeners`); a tree-diff in `handleChangedPaths` could classify them but was not designed.
- Did not read `updateLinksAfterRename` to confirm what it can throw.
- Did not read the two help-doc tests (`src/tests/help/mods-example.test.ts`, `src/tests/scripts/sync-wiki-docs.test.ts`) or the Labs UI (`src/lib/app/LabsSection.svelte`); item 5 needs no UI.
- The mods workspace contract was only skimmed (header and `onNoteSaved` JSDoc). No tests, builds or commits were run.
