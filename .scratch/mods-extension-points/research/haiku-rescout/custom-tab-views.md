## Where in code
- Tab model: `EditorTab` has a closed `fileType` union (`src/lib/core/editor/editor.types.ts:12`). Virtual tabs are paths prefixed `__virtual__/` (`src/lib/core/editor/editor.logic.ts:5-20`).
- Store: a module-level `$state` array with getters (`src/lib/core/editor/editor.store.svelte.ts:8`). `addTab` (`:52-61`) and `updateTabPath` (`:121-127`, which does not recompute `fileType`).
- Open path: `openFileInEditor` (`src/lib/core/editor/editor.service.ts:99-149`). It sets `fileType` from the extension once, at open (`:136-141`): `.view` becomes `collection`, `.canvas` becomes `canvas`, `.kanban` becomes `kanban`, everything else `undefined`.
- Render: a hard-coded `if` chain in `src/lib/app/EditorView.svelte:71-93` (tasks, tags, graph, event-calendar, kanban, canvas, collection, else `MarkdownEditor`). The fallthrough to `MarkdownEditor` is at `:91-92`.
- Tab strip: a second hard-coded icon chain in `src/lib/core/markdown-editor/EditorTabs.svelte:69-83`. The dirty dot is skipped for virtual tabs (`:63`).
- Singleton virtual tabs are opened by each feature service with `findTabIndex` + `addTab`: tasks (`src/lib/features/tasks/tasks.service.ts:164-170`), graph (`src/lib/plugins/graph-view/graph-view.service.ts:35-43`), calendar (`src/lib/features/event-calendar/event-calendar.service.ts:141-147`), tags (`src/lib/features/tags/tags.service.ts:126`).
- Right sidebar hides per tab kind by a path set and extension check (`src/lib/core/layout/layout.logic.ts:15-27`).

## Existing seam (a registry or store, or hard-coded? how do built-ins add to it?)
- Hard-coded. No tab-kind registry exists. Adding a kind means touching: the `fileType` union (`editor.types.ts:12`), `EditorView.svelte` (`:36-44` derived flags, `:71-93` render branch, `:94-150` toggle buttons), `EditorTabs.svelte:69-83`, the path set in `layout.logic.ts:15-20`, and the virtual path constants in `editor.logic.ts`.
- Closest existing registry: `railRegistryStore` (`src/lib/features/rail-shell/rail-registry.store.svelte.ts:24-94`). Plugins register and get an unregister function back, and the lists are `$state.raw`. Mods already use it for rail buttons (`src/lib/plugins/mods/mods-host.service.ts:344-355`).
- Other seams: `registerTabCloseListener` (`src/lib/core/editor/editor.service.ts:28-35`) and the per-mod disposer list in `mods-host.service.ts:52,399-...`.
- Mod contract: no tab or view member. `ModContextV1` (`src/lib/plugins/mods/contract/mod-api.v1.ts:289-329`) has `addAction`, `addRailButton`, `workspace`, `ui`, `theme`, `loadData`/`saveData`. `ModWorkspaceV1` has only `openNote` (`:134-138`). `ctx.app.editorStore` is the raw store (`src/lib/plugins/mods/mod-app.service.ts:23-25`, documented at `help/documentation/28-mods.md:389`).

## What mods could do
- Today: open existing file-backed notes with `ctx.workspace.openNote` (`src/lib/plugins/mods/mod-vault.service.ts:204-223`), and write any vault file that the app then shows in the matching editor. A `.canvas`, `.kanban` or `.view` file a mod writes opens with that app view, because the kind comes from the extension (`editor.service.ts:136-141`).
- Today: a real modal. The `habits` mod renders its UI in a `<dialog>` (`/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/mods/habits/src/habits.view.ts:151-154`), which is not a tab.
- Today, unverified at runtime: `ctx.app.editorStore.addTab({fileType: 'mod-something', path: '__virtual__/...'})` would type-check only through a cast. At runtime the unknown kind would fall through to `MarkdownEditor` (`EditorView.svelte:91-92`), so the mod gets no custom UI.
- Proposed: a mod registers a view (id, title, icon, `mount(host: HTMLElement, view) => dispose`) and opens it as a virtual tab. Mods are untyped JS in the main webview, so `mount` gets a plain DOM element. Preact plus htm works there, as the habits mod shows. Svelte components cannot be passed.

## API sketch
```ts
// mod-api.v1.ts (additive member, apiVersion stays 1)
export interface ModViewV1 {
  id: string;                      // unique within the mod
  title: string;                   // tab title
  icon: string;                    // pack:name, as in ModRailButtonV1.icon
  mount: (host: HTMLElement, view: {
    signal: AbortSignal;           // aborted on close, unload, vault change
    setTitle: (text: string) => void;
  }) => unknown;                   // returns cleanup or nothing
}
// ModContextV1
addView: (view: ModViewV1) => () => void;             // like addAction, disposable
// ModWorkspaceV1
openView: (viewId: string, key?: string) => Promise<void>; // key = one tab per key
closeView: (viewId: string, key?: string) => Promise<void>;
```
Host side: a core registry (`core/editor/`) so `EditorView.svelte` renders one generic branch and core never imports plugins. Tab path `__virtual__/mod/<modId>/<viewId>/<key>`.

## Cost
M. The core change is one generic branch in `EditorView.svelte`, one tab-strip icon branch, a core registry store, the `fileType` union widened (or a separate `modView` field), a `layout.logic.ts` default that hides the right sidebar for mod tabs, and unload cleanup (close tabs, dispose the mount). Plus contract additions and tests (the contract freeze test is named in `mod-api.v1.ts:17`). Tab restoration on restart would be a separate L, since no tab state persists today.

## Risks (hot path, reactivity, layer rule, disposal on unload, data)
- Hot path: `EditorTabs` iterates `editorStore.tabs` on every change. Keep view objects out of the `$state` array, or store only ids.
- Reactivity: `EditorView` uses `{#key editorStore.activeTab.path}` for canvas and collection (`EditorView.svelte:82-89`). A mod view needs the same keying, or its mount state leaks across tabs.
- Layer rule: `core/` must not import `plugins/`. The registry must live in `core/` and mods register into it, as `railRegistryStore` does for features (`rail-registry.store.svelte.ts:1-11`). `mods-host.service.ts` already imports features (`:9`), which is allowed.
- Disposal: `unloadMod` (`mods-host.service.ts:385-...`) must close the mod's view tabs and call each mount cleanup. `resetEditor` (`editor.service.ts:460-465`) clears the store on vault change; mount cleanup must still run then.
- Data: `writeTab` skips virtual tabs (`editor.service.ts:189`), so mod views cannot trigger note saves by accident. Mod-owned data goes through `saveData` (`mod-vault.service.ts:125-...`). `ctx.vault.write` refuses to overwrite a dirty tab (`mod-vault.service.ts:99-101`).
- Trust: `mount` runs in the main webview with full app trust. A broken mount freezes the app like any mod code (`help/documentation/28-mods.md:517`).

## Bugs or complexity removed (say none if none)
- No confirmed bug in scope.
- Complexity: the `fileType` decision is repeated in at least four files (`EditorView.svelte`, `EditorTabs.svelte`, `layout.logic.ts`, `editor.logic.ts`). A kind registry would remove that. The `fileType` type is closed while the render is a string compare with a markdown fallback, so an unknown kind silently becomes a note editor.
- Possible stale kind: `updateTabPath` (`editor.store.svelte.ts:121-127`) changes `path` and `name` but not `fileType`. Whether a rename can change the extension and reach this path is not verified.

## Could not verify
- Tab restoration on restart. Grep of `src/lib` and `src-tauri/src` found no open-tabs persistence: localStorage keys are for vaults (`vault.store.svelte.ts:3`), mods (`mods-enabled.store.svelte.ts:12,18`), quick switcher, command palette and theme only. `settings.types.ts` has no tab field; its only open-on-start setting is the daily note (`:22-23`). I did not read every Rust command, so a Rust-side store is not fully excluded.
- Runtime behavior of an unknown `fileType` (the fallthrough at `EditorView.svelte:91-92`) and of a rename that changes an extension. Both are read from code, not run, per the read-only instruction.
- Whether `resetEditor` (`app-lifecycle.service.ts:642`) runs on every vault close or only some paths.
- The relayed question about the failed haiku agents and the plan status is outside this read-only map. I have no data on it.