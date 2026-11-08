## Where in code

- Menu host: `src/lib/features/rail-shell/FilesNavigator.svelte:309-396`. A bits-ui `ContextMenu.Root` wraps the tree container (`:310-323`) and the content (`:343-395`).
- Menu target: a single `menuTarget` `$state` (`:92`). The tree container sets it to the vault root for right-clicks outside any folder row (`:316-321`). Each folder row sets it to its own folder (`:437-443`). Rename mode on a row stops propagation and keeps the native menu (`:439-441`).
- Items, in order: creators from `fileCreators` (`:78-89`, `:346-351`), then "New view" (`:352-355`), "New folder" (`:356-359`). Only for non-root targets (`:360-393`): "Change icon", "Copy path" submenu (absolute and relative), "Reveal in Finder", "Rename", "Move to Trash" (destructive).
- Built-in creators are hard-coded in the component (`:78-89`): New note, New Canvas, New table. Plugin creators are appended from the registry (`:88`).
- Handlers: `handleNewFile` (`:122-127`), `handleNewFolder` (`:136-141`), `commitRename` (`:163-177`), `handleDelete` (`:192-200`, confirm via `ask`), `copyPath` (`:203-205`), `handleDrop` (`:276-287`).
- Rows: `folderRow` snippet (`:421-494`). Folder rows only. Root row at `:324-336`.
- Navigator service: `src/lib/features/rail-shell/files-navigator.service.ts:11-19`. Registers a path-change consumer that moves the saved pick and expanded folders on rename, move or delete.
- Folder filter: `src/lib/features/rail-shell/lens.logic.ts:928-930`. `navigatorFolders` keeps directories only and drops hidden names. Files never appear in this tree.
- Core: no file-tree component exists. `src/lib/core/filesystem/` has only `.ts` files, and the tree UI lives in `features/rail-shell/`.
- Tests: `src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts:177-206` asserts the exact item list for a folder row and for the vault root. `:482` covers a plugin creator.

## Existing seam (a registry or store, or hard-coded? how do built-ins add to it?)

- Partly a registry. Only the "New <file>" items are registry-driven. `railRegistryStore.registerFolderCreator` (`src/lib/features/rail-shell/rail-registry.store.svelte.ts:70-76`) adds entries to a `$state.raw` list (`:20`). Each registration returns an unregister that matches by identity. `reset()` clears it (`:87-93`).
- The entry type is `RailFolderCreator` (`rail-shell.types.ts:218-229`): `id`, `label`, `icon: Component`, `fileName`, `create(dir) => Promise<string>`.
- Kanban is the one plugin user. `registerKanbanFolderCreator` (`src/lib/plugins/kanban/kanban.service.ts:23-33`) is wired in `src/lib/app/lifecycle/app-lifecycle.service.ts:265-266`, next to the path-change consumer at `:257`. The features layer never imports plugins (ADR-0003).
- Everything else in the menu is hard-coded: Rename, Delete, Copy path, Reveal, Change icon, New view, New folder. Nothing registers into those.
- Mods have no path into the folder menu. `src/lib/plugins/mods/` has no reference to `registerFolderCreator` or any menu registry. The contract (`src/lib/plugins/mods/contract/mod-api.v1.ts`) exposes only `addAction` and `addRailButton` (`:65-97`, `:304-305`).
- `addRailButton` (`src/lib/plugins/mods/mods-host.service.ts:323-359`) registers into the rail action registry (`registerAction`, `:344`), not the folder menu.

## What mods could do

- Add an item to a folder's "New" list (create a note, board or any file in the chosen folder), using the existing registry. This is the cheapest entry point.
- Add a mod-owned item to the folder menu that runs an action on the folder path. Needs a new registry, or an extension of `RailFolderCreator` to a generic menu item.
- Add items to the note-row menu. That menu is a different component (`src/lib/features/note-list/NoteRowMenu.svelte`, opened from `NoteRow.svelte:47,67`). Not read in depth.
- Unlike the rail button, a folder-menu item would run in the tree's right-click path and could target the vault root or any folder row.

## API sketch

```ts
// contract (mod-api.v1.ts), illustrative only
interface ModFolderMenuItemV1 {
  id: string;                       // unique within the mod
  label: string;
  icon: string;                     // 'lucide:file-plus', resolved by the host
  fileName?: string;                // named in the error toast
  run: (folder: string) => Promise<string | void>; // folder = absolute path
}
ctx.addFolderMenuItem(item: ModFolderMenuItemV1): () => void; // disposer, also run at unload
```

- The host must turn `icon` (a string ref) into a `Component`, because `RailFolderCreator.icon` is typed `Component`. The rail path keeps the string, so this is new glue.
- Wrap `create` in the host with `runOrToast` semantics (`FilesNavigator.svelte:110-119`) so mod errors toast.
- Dedupe names: `createFile` dedupes (the test at `:258` covers `Untitled 1.view`). The mod contract's `vault.create` writes at "exactly `path`" (`mod-api.v1.ts:121`), so a mod using it would skip dedupe.

## Cost

- M for "mod adds a folder 'New' item": the registry, the disposal path and the menu rendering exist. Work is the contract type, host wiring with icon resolution, unload cleanup, tests and docs in `help/documentation/28-mods.md`.
- L for "mod adds arbitrary items to folder, root and note menus": a generic menu registry that replaces the hard-coded items. Also touches `NoteRowMenu`, which I did not map.

## Risks (hot path, reactivity, layer rule, disposal on unload, data)

- Hot path: none. The menu is built when opened. `fileCreators` is a `$derived` that recomputes only when the registry changes (`FilesNavigator.svelte:78`).
- Reactivity: the registry is `$state.raw` and unregister matches by identity (`rail-registry.store.svelte.ts:9-11`). A mod disposer must return the same object it registered, or the entry stays behind.
- Layer rule: `plugins/mods` may import core (`railRegistryStore` is in `features/rail-shell`, which mods would import through the registry). Import direction is safe only if the mod host, not the features layer, imports the registry. Verify against `docs/agents/indexing-watcher-rules.md` and ADR-0003 before wiring.
- Disposal: mod cleanups run at unload (`mods-host.service.ts:52`). A registered folder item must be included, or it survives a mod switch-off. Teardown reset is covered by `app-lifecycle.service.test.ts:837-843`.
- Data: mod `run` gets an absolute folder path and runs with full trust. It can write anywhere in the vault. Same trust level as existing mod actions.
- Path changes: a folder item keyed by path does not need the path-change consumer, but a stored pick would. Follow the consumer pattern in `files-navigator.service.ts` if mods store paths.

## Bugs or complexity removed (say none if none)

- None confirmed. The two `oncontextmenu` handlers (container `:316-321` and row `:437-443`) split the target logic. I traced the order: the row handler runs first, and the container checks `closest('[data-files-navigator-row]')`, so the target is correct. The rename guard (`:439-441`) stops propagation so bits-ui does not open.
- Minor: built-in creators (`:78-87`) could become registry entries, which would remove the built-in/plugin split. That is a refactor, not a defect.

## Could not verify

- Read-only run: no tests or app run. Behavior is from reading code and the existing test names, not from execution.
- bits-ui ContextMenu internals (the `child` snippet props merge, keyboard open via Shift+F10) and `src/lib/components/ui/context-menu/*` were not read beyond the file list.
- `NoteRowMenu.svelte` and `TypesNavigator.svelte` menus were not mapped in depth.
- Layer check: `docs/agents/indexing-watcher-rules.md` was grepped for path-change rules (lines 13, 15, 19, 23), not read in full.
- `help/documentation/28-mods.md` was grepped only. It mentions rail buttons, not folder menu items.
- The user's relayed question about failed Haiku runs: this run has no record of earlier attempts, so I cannot say what failed or where the plan stands.