# 05: Mods get `ctx.onNoteMoved` for renames and moves

**What to build:** a mod can subscribe to renames and moves with `ctx.onNoteMoved(({ from, to }) => ...)`, the stable member that mods Issue 04 adds to the contract. The host feeds it from the one owner of path changes, `applyPathChange`, through a new optional `settled` step that runs after the move is complete (links rewritten, tree and index re-keyed). Note creation (`onNoteCreated`) is split out to Issue 08 (`.scratch/mods-power/issues/08-on-note-created.md`), which waits for an owner decision.

```js
ctx.onNoteMoved(({ from, to }) => ctx.log('Moved:', from, '->', to));
```

**Blocked by:** 04, 06

**Requires first (other repo):** mods Issue 04 (`/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/.scratch/mods-power/issues/04-note-path-events.md`) delivered and pushed, with its full SHA recorded under its Comments. This Issue adopts that SHA per `docs/MOD-CORE.md` "Updating the dependency" (`:35-50`), in the same commit as the host code: the freeze tests fail on the new SHA until the host implements the member.

**Status:** resolved

Set `ready-for-agent` when mods Issue 04's full SHA is in its Comments. Launch by explicit number only.

**Gate:** frontend, and the dependency moves: `pnpm check` + `pnpm vitest run` + `pnpm build` (`package.json` and `pnpm-lock.yaml` change), plus the mods workspace's `pnpm check:package <temp consumer>` and `pnpm verify` with `KOKOBRAIN_HOST_ROOT` set to this checkout (`docs/MOD-CORE.md` steps 2 and 6).

### Behavior

1. **Adopt the contract.** Follow `docs/MOD-CORE.md:37-48`. Adopt exactly the SHA recorded in mods Issue 04's Comments, never a later one. Before installing, `git -C /Users/diegorv/kokobrain-vaults/kokobrain-mods-src diff <pin in package.json> <sha> -- packages/mod-core/src/contract` must show only this Issue's change plus members already on this repo's `main`; otherwise stop and record it under Comments. `src/lib/plugins/mods/contract/mod-api.v1.ts` re-exports the package and needs no edit.
2. **Core: a `settled` step.** In `src/lib/core/filesystem/path-change.service.ts`:
   - `PathChangeConsumer` (`:38-49`) gains an optional `settled?(from: string, to: string): void`, with JSDoc: called once per rename or move, after `applyPathChange` finished every step (link rewrite, tree re-key, `rename_note`, `rename_in_search_index`, the removal sweep); never for a delete, never when `diskOp` failed, and not when the change rejected part way (the link rewrite's `get_backlinks_v2` at `link-updater.service.ts:47` is not caught, `path-change.service.ts:190`). Paths are absolute.
   - At the end of `applyPathChange`, after the `forgetNote` loop (`:233-235`), when `to !== null`: loop over a copy of the consumers, calling `settled` where present, each in its own try/catch that logs `error('FS', \`${consumer.name} settled failed:\`, err)`, as the first fan-out does (`:176-182`).
   - The registration comment (`:67-72`) names a third lifetime: mod-lifetime, registered by a mod's subscription and unregistered by its disposer or unload.
   - No other change to `applyPathChange`: no `try/finally` around the tail.
3. **Mods host: `ctx.onNoteMoved`.** In `createModContext` (`src/lib/plugins/mods/mods-host.service.ts`), next to `onNoteSaved` (`:566-591`), same structure:
   - `assertLive()`; a non-function callback throws `invalid('onNoteMoved needs a callback function')`.
   - Register with `registerPathChangeConsumer({ name: \`mod:${manifest.id}:onNoteMoved\`, pathChanged: () => {}, settled })`. Only `settled` does work. Delivering from `pathChanged` would run the mod during the link rewrite, and a mod write to a backlinking note would then be overwritten by `updateLinksAfterRename` (`link-updater.service.ts:52-58`; validation R3).
   - In `settled`: convert both paths with `vaultRelativeKey(vaultPath, ...)` (`src/lib/utils/path.ts:120-123`); return when either is `null`, when `runtime.unloaded`, or when `vaultStore.path !== vaultPath`. Otherwise schedule `setTimeout(0)`, track it in a `pending` set, re-check the same liveness in the timer, and deliver with `callModCallback('onNoteMoved', () => callback({ from, to }))` (the helper brain Issue 06 adds), a fresh object per call. The helper logs `debug(tag, 'onNoteMoved callback failed:', ...)`, records the Labs row error and toasts once per load; never `error` or Sentry.
   - Add `'onNoteMoved'` to the `ModCallbackError.callback` union in `src/lib/plugins/mods/mods.store.svelte.ts` (brain Issue 06).
   - Return `disposable(...)` that unregisters the consumer and clears the pending timers (`:586-590`).
   - Do not change `onNoteSaved`'s behavior here.
4. **What is reported.** Every rename and move that goes through `renameItem` or `moveItem` (`src/lib/core/filesystem/fs.service.ts:285, 313`): the file explorer, drag and drop, Auto Organize (`src/lib/features/auto-organize/auto-organize.service.ts:338, 472`), and `ctx.vault.rename` / `ctx.vault.move` of every mod, the caller included (`src/lib/plugins/mods/mod-vault.service.ts:56-70`). Any file type, as `onNoteSaved`. A folder is reported once, for the folder. Not reported: deletes (`to === null`), a no-op move (`moveItem` returns `null` before `applyPathChange`, `fs.service.ts:311`), a rename to the same path (`:283`), a failed disk rename, external moves (the watcher sends bare paths), Trash restore (`trash.service.ts:126`, not through `applyPathChange`), `duplicateItem` (`fs.service.ts:345-364`).

### Docs

- `help/examples/mods/kokobrain-mod.d.ts`: declare `ModNoteMovedV1` and add `onNoteMoved` after `onNoteSaved` (`:378`), identical to the contract. `src/tests/help/mods-types.test.ts` pins the file to the contract.
- `help/documentation/28-mods.md`: after the `ctx.onNoteSaved` section (`:171-180`), a short `ctx.onNoteMoved` section: vault-relative `{ from, to }`, rename and move are one event, runs after links are rewritten and the tree is updated, a folder is reported once (paths under `from + '/'` are under `to + '/'`), what is not reported (Behavior 4), that `ctx.query` may not see the note at `to` until the app's index refreshes, a few seconds later, and the loop warning (a callback that moves or renames again; Auto Organize can move a note a mod just wrote). The `onNoteSaved` sentence "does not subscribe to ... note creation" (`:173`) stays true.
- `help/documentation/mods/07-events-and-reactivity.md`: intro (`:3`), the members table (`:8`), and a section after the `onNoteSaved` one (`:173-229`) with the same points (including the `ctx.query` sentence) and one example that remaps a stored path by prefix for a folder move.
- `help/documentation/mods/13-api-reference.md`: a row after `ctx.onNoteSaved` (`:101`), a bullet after `:106`, the cleanups list (`:46`), and the error row after `:258` (`Mod "<id>": onNoteMoved needs a callback function`).
- `help/documentation/mods/15-errors-and-debugging.md`: rows after `:19` (`onNoteMoved callback failed: ...`, debug log, not Sentry, with the Labs row and once-per-load toast cells that brain Issue 06 gives the other callbacks) and `:102`.
- `help/documentation/mods/12-types-build-and-test.md`: the not-modelled list (`:477`) and the printed fake source (`:570`) gain `onNoteMoved`.
- `help/documentation/mods/README.md`: the stable list (`:100`) and the task table (`:122`, "React to a note being renamed or moved").

### Acceptance

- [x] Failing test first: a new `src/tests/lib/plugins/mods/mod-note-moved.test.ts`, set up like `mod-vault-paths.test.ts` (in-memory disk under the mocked `@tauri-apps/plugin-fs`, mocked `invoke`, real fs services and stores) with fake timers as in `mod-note-saved.test.ts`. Seed `/vault/Ideas/Note.md` in the tree and on disk, and `/vault/Other.md` holding `[[Note]]`, with `get_backlinks_v2` returning `Other.md`. A mod calls `ctx.onNoteMoved(cb)`; `renameItem('/vault/Ideas/Note.md', 'Renamed.md')`; after the timers run, `cb` was called once with `{ from: 'Ideas/Note.md', to: 'Ideas/Renamed.md' }`. Inside `cb`, `findNodeByPath(fsStore.fileTree, '/vault/Ideas/Renamed.md')` is not null and `Other.md` on disk already reads `[[Renamed]]`. These two checks prove delivery from `settled`, not from `pathChanged`. It fails today: `ctx.onNoteMoved` is not a function.
- [x] Same file: a move to another folder and to the vault root (`ctx.vault.move(path, '')`) report the right relative paths; a folder move is reported once as `{ from: 'Ideas', to: 'Archive/Ideas' }`; the mod's own `ctx.vault.rename` reaches its own callback; the event has exactly the keys `from` and `to`.
- [x] Same file, nothing reported: a delete, a no-op move, a failed disk rename, and a rename whose `get_backlinks_v2` rejects (the documented limit).
- [x] Same file, lifetime: the disposer cancels a pending callback and stops later ones; unload does the same and a later `ctx.onNoteMoved` throws `unloaded`; a vault switch between the move and the timer drops the callback; a sync throw and an async rejection are recorded under `modsStore.callbackErrorFor(<id>).callback === 'onNoteMoved'`, land in `debug(tag, 'onNoteMoved callback failed:', ...)` and never in `error`, and the per-load toast is shared with the other callbacks (one toast per load in total); a non-function callback throws `onNoteMoved needs a callback function`.
- [x] `src/tests/lib/core/filesystem/fs.service.test.ts`, block `path-change consumers` (`:1296`): `settled` receives `(from, to)` once for a rename and once for a folder move; when it runs, `invoke` was already called with `rename_note` and `rename_in_search_index`; it is not called for a delete, for a failed `diskOp`, or when `updateLinksAfterRename` rejects; a throwing `settled` is logged as `error('FS', 'thrower settled failed:', ...)` and a later consumer's `settled` still runs; the existing consumers without `settled` pass unchanged.
- [x] `src/tests/lib/plugins/mods/mod-api-contract.test.ts`: `onNoteMoved: true` in `CONTEXT_PUBLIC` (`:46-63`); `ModNoteMovedV1` imported; a `NOTE_MOVED_PUBLIC = { from: true, to: true } satisfies Record<keyof ModNoteMovedV1, true>` with an `Object.keys` assertion in the style of `:257-262`. The runtime key check at `:231` passes.
- [x] `src/tests/help/mods-types.test.ts`: `'ModNoteMovedV1'` in `STABLE_TYPES` (`:24-46`) and an `expectTypeOf<Doc.ModNoteMovedV1>().toEqualTypeOf<App.ModNoteMovedV1>()` near `:108`.
- [x] `package.json` and `pnpm-lock.yaml` pin the new SHA; the lockfile checks of `docs/MOD-CORE.md` step 4 hold.
- [x] `src/tests/help/mods-example.test.ts`: `onNoteMoved: unused` after `onNoteSaved` (`:46`) in the typed `ModContextV1` literal.
- [x] Docs above updated. `src/tests/scripts/sync-wiki-docs.test.ts` still passes.
- [x] Gate: `pnpm check`, `pnpm vitest run`, `pnpm build`, and the mods workspace's `pnpm verify` with `KOKOBRAIN_HOST_ROOT` set to this checkout.

## Notes

- **Research:** `.scratch/mods-power/research/item-05-host.md`, `item-05-contract.md` and `item-05-validation.md` (the validation wins where they differ). Code read at `c2bed3463`; mods workspace at `03526cf`.
- **Why Blocked by 04 and 06:** mods Issue 04's SHA sits after mods 03 (`ctx.query`), so brain 04 must be on `main` before this adoption passes `pnpm check`; brain 04 is itself after brain 01 and 02. Brain 06 adds `callModCallback`, which Behavior 3 uses.
- **Ordering:** Contract Issues land in the mods repo in the order 01, 02, 03, 04; each brain Issue adopts its own mods SHA in the order brain 01, 02, 04, 05. No batching. Full order: `.scratch/mods-power/PRD.md`.
- Line numbers are from `c2bed3463`; locate each edit by the quoted text after earlier mods-power Issues land.
- **Decisions taken from the validation:**
  - One event for rename and move; the host cannot tell them apart (`PathChange`, `path-change.service.ts:16-31`).
  - `settled` is required, not an option: delivery at the `pathChanged` position loses a mod write to a backlinking note (R3) and lets a mod's own `vault.move(to, ...)` start a second `applyPathChange` before the first re-keyed the tree and the Rust index (risk 2).
  - No `isFolder`, child list, deletes, own-write option or mod-code path filter (R4, R5). A mod handles a folder by prefix, as every core consumer does (`app/boot.ts:43-52`).
  - A rejected link rewrite skips the event; no `try/finally` (memory "No core changes for corner cases").
- **Split out to Issue 08 (`.scratch/mods-power/issues/08-on-note-created.md`, needs-info): `onNoteCreated`.** Item 5 also asked for creation events. The validation (R1, R2) found that the cheap hook, the `create`/`fs` branch of `applyNoteChange`, misses Quick Capture captures (`app/deep-link-actions.ts:213-225`, `features/deep-link/deep-link.service.ts:306-317, 325-337` write with `writeTextFile` and fire `onNoteSaved` instead), and fires before `openOrCreateNote` opens the tab (`note-creator.service.ts:118-127`, `editor.service.ts:125-141`), so a mod's `vault.write` in the callback can be overwritten by the next autosave. Two owner questions, recorded in Issue 08: should captures count as created notes (notifier calls in those write paths), and should the event fire after each creator's tab-open step? Until then, `onNoteSaved` covers captures.
- **Accepted limits:** external moves, Trash restore and duplicates are not reported; loops (a callback that moves again, or Auto Organize moving a note a mod wrote, `auto-organize.service.ts:64, 205`) are documented, not prevented.
- **Security:** no new privilege under ADR 0036. Paths only, no content; mods already have `vault.list` and full app trust.
- **Not verified:** whether `vi.runAllTimersAsync` (or an equivalent) drains the async disk mocks before the `settled` timer in the new test; the help-doc tests were not read.

## Comments

- 2026-11-11, branch `issue/05-note-path-events`: path-change consumers gain a `settled(from, to)` step run after the move, backlink rewrite and index updates complete; mods get `ctx.onNoteMoved(cb)` with `{ from, to }` vault-relative paths, delivered from `settled`, with disposer, unload, vault-switch and error handling shared with other callbacks; docs and the mod API contract/type tests updated. Fix round: the `callModCallback` JSDoc was rewrapped (d407e5c6f). Tests: `pnpm check` exit 0, `pnpm vitest run src/tests/lib/plugins/mods` exit 0, full suite at d407e5c6f exit 0 (613 files, 15469 passed, 54 skipped, 1 todo). Reviews: round 1 APPROVED, round 2 APPROVED.
