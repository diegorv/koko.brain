## Where in code
- Contract, frozen v1 with no imports: `src/lib/plugins/mods/contract/mod-api.v1.ts`. `ModVaultV1` is at :113-132 (read, exists, list, create, write). `workspace.openNote` is at :134-138. `ModContextV1` is at :289-329. Run signal, log and progress are at :51-63. Rail button is at :87-96.
- Host: `src/lib/plugins/mods/mods-host.service.ts`. `ctx` is built at :96. `ui` is at :132-176. `runAction` is at :204-247. The picker is at :256-275. `addRailButton` is at :323-356, registering into `railRegistryStore` at :344 with key `mod:<id>:<id>` (:343). The `vault`, `workspace`, `app` and `kb` members are at :357-365.
- Vault: `src/lib/plugins/mods/mod-vault.service.ts`. `createModVault` is at :32-114, `createModData` at :125-201, `createModWorkspace` at :204-225.
- App objects: `src/lib/plugins/mods/mod-app.service.ts:23-53` (`MOD_APP`, live references, unstable). It has no rename, move, delete or path-change entry.
- Rename and delete core: `src/lib/core/filesystem/fs.service.ts` `deleteItem` :246-267, `renameItem` :280-299, `moveItem` :307-330. `path-change.service.ts` `applyPathChange` :145-236. `link-updater.service.ts` :35-109. `delete-note.service.ts` :12-28. `trash.service.ts:49` (`moveToTrash`).
- Editor: `src/lib/core/editor/editor.service.ts` `syncExternalContentToEditor` :71-95, `openFileInEditor` :99, `saveFileByPath` :171-178, `closeTabsForDeletedPath` :401-416. `editor.logic.ts:45` (`isTabDirty`).
- Rust: `src-tauri/src/commands/vault.rs` `create_note` :984-1000, `write_mod_data` :1045-1051, `read_mod_data` :1061-1070 (returns `Option<Vec<u8>>`, unused by `ctx.vault`), `rename_note` :1231. `src-tauri/src/commands/search_index.rs:265` (`rename_in_search_index`).

## Existing seam (a registry or store, or hard-coded? how do built-ins add to it?)
- Rail: `railRegistryStore` (`src/lib/features/rail-shell/rail-registry.store.svelte.ts`) is a registry store with `registerNavigator`, `registerLensProvider`, `registerTodaySection`, `registerFolderCreator` and `registerAction` (:79-83). Each returns an unregister function, and `registerAction` replaces by key.
- Built-ins add through their own service: `calendar-rail.service.ts:25`, `kanban.service.ts:27` (folder creator), `one-on-one-today.service.ts:12` (today section), `one-on-one.service.ts:105` (action bar action).
- Mods reach only `registerAction`, through `addRailButton`. Navigators, lens providers, today sections and folder creators are not in `ModContextV1`.
- Other registries, none exposed to mods: `registerNoteChangeConsumer` (`note-change.service.ts:104`), `registerPathChangeConsumer` (`path-change.service.ts:73`), `registerTabCloseListener` (`editor.service.ts:28`), `registerContentInvalidationListener` (`note-change.service.ts:139`).
- Global keybindings are hard-coded: `global-keybindings.ts:222`.
- Mod actions are held in a per-button-owner `Map` inside `createModContext` (`mods-host.service.ts:118`), not in a store.

## What mods could do
Verified today:
- Rail buttons and actions, with text input, progress, log, dialogs, toasts and theme colors (`mod-api.v1.ts:192-212`).
- Vault: read text, exists, list one level, create a new file (creates parents), overwrite an existing file. `write` refuses a missing file and a dirty open tab (`mod-vault.service.ts:94-101`).
- Open notes (`openNote`, `:204-225`), frontmatter rewrites with open tabs kept (`ctx.app.updateNoteFrontmatter`, `mod-app.service.ts:46-50`), today's daily note, 1:1 notes, the editor store and CodeMirror view (unstable).
- Private JSON state through `loadData` and `saveData` (`mod-vault.service.ts:125-201`).

Not possible today: rename, move, delete or trash, binary read or write, recursive list, an atomic read-modify-write, reading an open tab's unsaved buffer, and a forced overwrite.

## API sketch
Additive members only, per the contract rules (`mod-api.v1.ts:14-16`):
- `vault.process(path, fn)`: serialized per path like `createModData`'s `inOrder` (`mod-vault.service.ts:138-145`). Refuses a dirty tab, as `write` does. One disk write.
- `vault.rename(from, to)` and `vault.move(from, dir)`: wrap the `fs.service` logic so they go through `applyPathChange`, which handles tabs, link rewrites, the index and search.
- `vault.delete(path)`: wraps `deleteItem`, which saves dirty tabs first (`path-change.service.ts:55-62`) and closes tabs (`:157`). Prefer trash over permanent removal.
- `vault.readBinary(path)` and `vault.writeBinary(path, bytes)`: pattern exists in `read_mod_data`.
- `vault.list(folder, { recursive })`.
- `ctx.addFolderCreator`, `ctx.addTodaySection`, `ctx.addNavigator`: thin wrappers over the existing `railRegistryStore` register functions, with disposal in `disposable()` (`mods-host.service.ts:105-116`).
- `ctx.onPathChange(cb)`: wraps `registerPathChangeConsumer`, disposed at unload.

## Cost
- Recursive list: S. Only a `readDir` loop.
- Binary read and write: S to M. Mirrors `read_mod_data` and `write_mod_data`, which are already in Rust.
- Rail seams (folder creator, today section, navigator): S each. Registries exist, and disposal is already wired.
- `process`: M. Needs a per-path queue and a dirty-tab policy (see Risks).
- Rename, move, delete: M each. Calls exist, but the mod-facing ordering, unload behavior and error mapping need tests.
- Full set: L.

## Risks (hot path, reactivity, layer rule, disposal on unload, data)
- Layer rule: mods live in `plugins/`, so importing `core/filesystem/*` is allowed. Any core-to-plugin notification must go through a registry, as the indexing rules require (`docs/agents/indexing-watcher-rules.md` rule 15).
- Indexing rule 13 (`docs/agents/indexing-watcher-rules.md:13`): any path change must go through `applyPathChange`, never the per-file updaters. `ctx.vault.create` and `write` call `applyNoteChange` and `notifyAfterSave` directly (`mod-vault.service.ts:84`, `:111`). That is allowed for writes, not for path changes.
- Hot path: `edit` consumers run on debounced keystrokes; `save` consumers run on every save (`indexing-watcher-rules.md:14-16`). A mod consumer on `pathChanged` is cheap, but a note-change consumer would not be.
- Reactivity: the rail registry replaces its arrays on each register (`$state.raw`). Fine for a few mods. Not tested with many re-registrations.
- Disposal: `assertLive` runs before `diskOp` (`mod-vault.service.ts:95`, `:72`), but `applyPathChange` after `diskOp` (`path-change.service.ts:162-227`) has no live check. A rename started before unload finishes its link rewrite and index re-key after the mod is gone. That may be correct, since the disk already changed, but it needs a decision.
- Data, dirty tabs: `read` returns disk text, not the tab buffer (`mod-vault.service.ts:55-57`). A mod reading an open note with unsaved edits sees stale text.
- Data, lost update: a mod's read followed by its write can overwrite a user save that lands in between. There is no lock across the two calls.
- Data, permanent delete: `fs.service.ts:256-263` falls back to `remove(...)` when no vault is open. A mod delete must not reach that path.

## Bugs or complexity removed (say none if none)
- Plausible race, not reproduced: in `ctx.vault.write`, the dirty check runs at `mod-vault.service.ts:100-101`, before `await writeTextFile` at :103. A keystroke typed during that disk write leaves the tab dirty, then `syncExternalContentToEditor(abs, content, true, 'none')` at :105 replaces both `content` and `savedContent` with the mod's text. That silently drops the keystroke. The fix would be to re-check the tab after the write, or to hold a per-path lock. This needs a test that flips the tab dirty during the await.
- Complexity: none removed. The vault wrapper is thin, and `write`'s mod-code early return (:108) is a deliberate skip, not dead code.

## Could not verify
- Plan status and the failed haiku runs: I have no view of them. This report maps only the mod surface.
- Not read: `src/tests/lib/plugins/mods/mod-vault.service.test.ts` and `mod-api-contract.test.ts`. The `help/documentation/28-mods.md` file was only grepped, not read in full. The real mods under `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/mods` were not read.
- Not located: the command palette registry and the status bar seam.
- Not read: `trash.service.ts` `moveToTrash` body, `rename_note_inner` (`vault.rs:1150`), and `fs.watcher.ts` behavior under a mod-driven rename.
- Nothing was built, run or tested. The dirty-tab race and the rename-after-unload behavior are inferred from code reading only.