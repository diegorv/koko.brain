## Where in code

Both menus are hard-coded Svelte markup. Neither reads from a registry.

- **Editor tabs:** `src/lib/core/markdown-editor/EditorTabs.svelte`
  - `ContextMenu.Root` at line 48, one per tab in the `{#each}` loop.
  - `ContextMenu.Content` at lines 98-109 holds "Pin tab / Unpin tab" (99-102) and "Close tab" (103-107, shown only when the tab is not pinned).
  - Items call `togglePinTab(index)` and `closeTab(index)` from `#lib/core/editor/editor.service.js` (line 11). The menu gets the tab by index, so a mod-facing item would need `tab.path` passed in explicitly.
- **Editor body:** `src/lib/core/markdown-editor/MarkdownEditor.svelte`
  - The right-click listener is on the CodeMirror container: `oncontextmenu={handleContextMenu}` at line 726.
  - `handleContextMenu` (297-305) stores `contextMenuPos` from `view.posAtCoords`, moves the cursor unless the click is inside a non-empty selection, and sets `menuHasSelection` (290).
  - `ContextMenu.Root` wraps the container at lines 722-757. `ContextMenu.Content` (729-756) has Cut (730), Copy (734), Paste (738), Select all (742), then a separator, Copy block link with shortcut (747-751) and Copy block embed (752-755).
  - Handlers: `handleCut` (336-343), `handleCopy` (328-332), `handlePaste` (346-365, uses `readText` and not a `ClipboardEvent`, per the comment at 345-347), `handleSelectAll` (367-371), `handleCopyBlockLink` (384-388), `handleCopyBlockEmbed` (390-394).
  - Block-link actions come from the `BlockLinkActions` interface in `src/lib/core/markdown-editor/editor-host.ts:79`, which the app supplies.
- Other hard-coded menus, not inspected in depth: `NoteRowMenu.svelte`, `CanvasContextMenu.svelte`, `TypesNavigator.svelte`, `FilesNavigator.svelte`, `KanbanCard.svelte`, `KanbanLane.svelte`, `CollectionView.svelte`. A grep found 16 `ContextMenu.Content` sites outside `components/ui/`.

## Existing seam (a registry or store, or hard-coded? how do built-ins add to it?)

- **Editor and tab menus: hard-coded.** No registry exists for them. Built-ins add items by editing the markup. No `registry` or `Registry` class exists under `src/lib/core` or `src/lib/features`. The only match was `src/lib/features/collection/expression/methods.logic.ts`.
- **Mod seams that do exist:**
  - `ctx.addAction` (`src/lib/plugins/mods/contract/mod-api.v1.ts:66-80`) adds actions to the mod picker.
  - `ctx.addRailButton` (`mod-api.v1.ts:83-96`) adds a rail button whose picker lists those actions.
  - Both are implemented in `src/lib/plugins/mods/mods-host.service.ts:295-360`, which uses `railRegistryStore.registerAction` (line 344).
- **Rail registry:** `src/lib/features/rail-shell/rail-registry.store.svelte.ts` (`registerNavigator`, `registerLensProvider`, `registerAction`). The calendar plugin uses it (`src/lib/plugins/calendar/calendar-rail.service.ts:26,33`). It covers the rail only, not editor or tab menus.
- **Command palette:** `getBuiltInCommands()` at `src/lib/app/commands.ts:93` returns a static list. I did not check whether mods can add to it.
- **Mod access to the editor:** `MOD_APP.editorStore` (`src/lib/plugins/mods/mod-app.service.ts:23-25`) exposes `activeTab` (with `path`) and `editorView`. `editorStore.editorView` is defined at `src/lib/core/editor/editor.store.svelte.ts:43`. The doc at `help/documentation/28-mods.md:389` describes this, and the example at line 422-424 calls `replaceSelection` on it.
- **Layer rule:** core cannot import `plugins/`. Any editor-menu registry therefore has to live in `core/` (for example `core/markdown-editor/` or `core/editor/`). The plugin then registers into it, which is the allowed direction (plugins may import core).

## What mods could do

- **Read the selection today, with no API change:** `ctx.app.editorStore.editorView.state.selection` and `state.sliceDoc(from, to)`. `ctx.app.editorStore.activeTab.path` gives the note path. This is through the unstable `ctx.app` escape hatch (doc line 380).
- **Read the clicked position today:** not exposed. `contextMenuPos` is a private `let` in `MarkdownEditor.svelte:287`.
- **Add a menu item:** not possible without a core change. A mod could attach a DOM `contextmenu` listener to `editorView.dom` through `ctx.app`, but that would not add a menu item. It would also have to be undone in `ctx.register`, per doc line 383.
- **Tab menu:** a mod could read `editorStore.tabs` through `ctx.app`, but it cannot add an item to the tab menu today.

## API sketch

Not implemented. A possible shape, following the `addAction` pattern:

```ts
// contract (mod-api.v1.ts), new member of ModContextV1
addEditorMenuItem: (item: {
  id: string;                       // unique within the mod
  title: string;
  icon?: string;                    // same ref format as addRailButton
  where?: 'editor' | 'tab';         // which menu
  when?: (ctx: { path: string; selection: string; hasSelection: boolean }) => boolean;
  run: (ctx: { path: string; selection: string; from: number; to: number; view: unknown }) => unknown;
}) => () => void;                   // disposer, also removed at unload
```

The `view` field would be unstable, like `ctx.app`. The host would store items in a core registry. `MarkdownEditor` would render them after the built-ins, and `EditorTabs` would render them with `tab.path`. A `run` that replaces text would dispatch through `editorView` and would need the same doc-changed guard as `handleCut` (lines 338-340).

## Cost

**M.**
- Core: a small registry store and two markup loops (about 60-100 lines across `MarkdownEditor.svelte` and `EditorTabs.svelte`).
- Mods host: an `addEditorMenuItem` member plus disposal in the existing cleanup list.
- Contract: one new `.v1` member and doc updates in `help/documentation/28-mods.md`.
- Tests: the existing `MarkdownEditor.test.ts` and `EditorTabs.test.ts` cover menu rendering, so new cases fit there.

Reading the selection alone is S (no API change, already possible through `ctx.app`).

## Risks (hot path, reactivity, layer rule, disposal on unload, data)

- **Hot path:** low. The work happens only on right-click (`handleContextMenu`). Mod `when` callbacks would run on every open, so they should be cheap or guarded.
- **Reactivity:** `ContextMenu.Content` mounts only when open, so a registry read inside the content is fresh per open. This is an inference from the component shape, not something I ran.
- **Layer rule:** the registry must sit in `core/`. A mod-side import of the editor view stays on the `ctx.app` path, already allowed.
- **Disposal:** items must be removed at unload, like `addAction`. Without that, a stale item could call `run` after the mod is gone (doc line 113 says `ctx` functions throw after unload, so the disposer must run first).
- **Data:** a menu item that replaces selection text can lose unsaved edits if it writes through `vault` instead of the open editor. Use the editor dispatch path.
- **Clipboard:** Cut and Copy use `navigator.clipboard.writeText` (lines 316-321). A mod's copy would need the same error toast.

## Bugs or complexity removed (say none if none)

None verified. I did not find a defect in these menus while reading them. The paste path bypasses the paste handlers by design (comment at `MarkdownEditor.svelte:345-347`).

## Could not verify

- I did not run the app or the tests. All findings come from reading the source.
- I did not read `src/lib/components/ui/context-menu/` to confirm how `ContextMenu.Trigger` handles right-click and keyboard menu keys.
- I did not check whether `getBuiltInCommands()` (`commands.ts:93`) can be extended by mods.
- I did not inspect `NoteRowMenu`, `CanvasContextMenu`, or the Kanban menus in depth.
- I did not check whether the `help/documentation/28-mods.md` contract section matches `mod-api.v1.ts` for `addAction` and `addRailButton`.
- I did not check whether the mod loader's PLUGIN_ALLOWLIST (mentioned in `mod-app.service.ts:11`) has a definition in the repo. The grep found only comments.
- Per the request, I did not read `/Users/diegorv/kokobrain-vaults/brain-os-vault/vault/`, and I did not check the real mod sources.
- On the question in the message: I have no visibility into other haiku runs or how many failed. This report is the output of this one subagent only.