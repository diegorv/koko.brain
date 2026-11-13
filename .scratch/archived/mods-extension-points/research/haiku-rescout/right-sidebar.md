## Where in code

- The right sidebar is hard-coded in the composition root `src/lib/app/AppShell.svelte`, not in `LayoutSection.svelte`. `src/lib/features/rail-shell/LayoutSection.svelte` is the Settings > Layout pane. Its "Right sidebar" block (lines 113-161) only holds the on/off switches.
- `AppShell.svelte:42-47` imports the four panels directly: `BacklinksPanel`, `OutgoingLinksPanel`, `PropertiesView`, `TableOfContentsPanel`. `NoteInfo` is imported at line 44.
- `AppShell.svelte:60`: `rightSidebarShown = isRightSidebarShown(settingsStore.layout.rightSidebarVisible, editorStore.activeTabPath)`.
- `AppShell.svelte:264-295`: `{#if rightSidebarShown}` renders a `Resizable.Pane` (order 4, size from `layout.rightSidebarSize`, min 3, max 30) with `data-right-sidebar`, a 40px drag header, and a `ScrollArea`. Inside, lines 277-291 are a fixed sequence of `{#if settingsStore.layout.<x>Visible}` blocks: PropertiesView, TableOfContentsPanel, BacklinksPanel, OutgoingLinksPanel, then NoteInfo (gated on `propertiesVisible`).
- `AppShell.svelte:187-192`: the sidebar toggle button, hidden when `hidesRightSidebar(...)` is true.
- `src/lib/core/layout/layout.logic.ts:15-20`: `NO_RIGHT_SIDEBAR_PATHS` (calendar, tasks, tags, graph virtual tabs). Lines 22-28 add canvas, view and kanban files. Lines 36-38: `isRightSidebarShown` combines the persisted flag with that check.
- `src/lib/core/layout/layout.service.ts:30-34`: `toggleRightSidebar()`, which no-ops on those tabs so the saved setting is not flipped out of sight.
- `src/lib/core/layout/SidebarSection.svelte:1-72` is the shared section wrapper. It has a `title`, an optional `bind:open` that makes it collapsible (Collapsible), and a body. The panels use it: `BacklinksPanel.svelte:55`, `OutgoingLinksPanel.svelte:51`, `PropertiesView.svelte:155` (static, no `open`), `TableOfContentsPanel.svelte:46`. `NoteInfo.svelte` does not use it.

## Existing seam (a registry or store, or hard-coded? how do built-ins add to it?)

- Right sidebar panels: hard-coded. There is no registry. A new built-in panel needs an import, a `{#if}` block and a `layout` flag in `AppShell.svelte` and in `LayoutSection.svelte`.
- Left rail: a registry exists. `src/lib/features/rail-shell/rail-registry.store.svelte.ts:14-22` holds `$state.raw` lists (navigators, lensProviders, todaySections, folderCreators, actions). Each `register*` function replaces by id or key and returns an unregister closure (lines 46-84). `Rail.svelte:192` renders `railRegistryStore.actions`. `calendar-rail.service.ts:26` and `mods-host.service.ts:344` are the two current callers.
- Mods: `src/lib/plugins/mods/contract/mod-api.v1.ts` exposes `addAction` (line 302) and `addRailButton` (line 304) on `ModContextV1` (lines 289-330). No panel, sidebar, or DOM-mount call exists in the frozen contract. `ModRailButtonV1` is at lines 84-96.
- `mods-host.service.ts:323-347` implements `addRailButton`, which calls `railRegistryStore.registerAction` at line 344 and wraps the disposer with `disposable()`.
- `mods-host.service.ts:32-39` adds `ctx.app` (`MOD_APP`, unstable) and `ctx.kb`, outside the contract. `mod-app.service.ts:23-53` lists the objects `ctx.app` exposes. None of them is a sidebar or DOM handle.
- Mod DOM and disposal: `ctx.register` (line 281-283) and `unloadMod` (lines 385-405) run the disposers in reverse at unload. A mod can already reach the DOM by using `document` directly (full trust, no sandbox). Nothing in the contract removes that DOM for it.

## What mods could do

- Add a right-sidebar panel with a title, an optional order, and a mount function that receives a host element. The mod returns a teardown, which the host calls on hide, on tab-type change, and at unload.
- Add more rail buttons (already possible, contract lines 84-96), with pickers that run actions.
- Read the active note through `ctx.app.editorStore`, and vault data through `ctx.vault` or `ctx.kb()`.
- Using `document` directly, a mod could also inject DOM into `[data-right-sidebar]` today. That is undocumented and gets no lifecycle help.

## API sketch

Not implemented. Contract-level sketch only:

```ts
// ModContextV1 addition (a new method on the frozen v1 surface, additive)
addRightPanel: (panel: ModRightPanelV1) => () => void;

interface ModRightPanelV1 {
	id: string;                  // unique within the mod
	title: string;               // section header, sentence case
	order?: number;              // position among built-in panels (default: after them)
	/** Mounts into `el`; returns a teardown. Called again on re-show. */
	mount: (el: HTMLElement) => void | (() => void);
}
```

The host wraps the mount in the `SidebarSection` look (or plain markup) and keeps the panel's visibility in a new layout key.

## Cost

M. The core work is small. The parts that need care:
- A new `$state.raw` registry, as in `rail-registry.store.svelte.ts`. It has to live in `core/` (or be imported by `core/`) because `AppShell.svelte` is the composition root and `core/` may not import features.
- A render loop in `AppShell.svelte` that mounts and unmounts mod panels, and calls each teardown.
- A visibility key per mod panel in `settings.types.ts` (`LayoutSettings` at line 47) and in `LayoutSection.svelte`, or a single generic mods switch.
- A contract decision: the v1 surface is frozen, so this is an additive minor change. I did not verify the versioning rule for the mod contract. The rule I saw (additive is minor) is in `docs/agents/indexing-watcher-rules.md` for `kb.version`, not for mods.

## Risks (hot path, reactivity, layer rule, disposal on unload, data)

- Hot path: built-in panels refetch on `vaultStore.vaultIndexVersion` (`docs/agents/indexing-watcher-rules.md:5`, `BacklinksPanel.svelte:44-51`). A mod panel that reads the index on every bump would repeat that cost. Rule 12 (same file) says the entries snapshot is a memo that a bump does not refetch in the common case. A mod should read `ctx.kb()` or `getVaultEntries` through that memo, not call `ctx.vault` in a loop.
- Reactivity: a plain array of panels will not notify Svelte. Use `$state.raw` with replace-on-change, as `rail-registry.store.svelte.ts:8-11` warns (a deep `$state` proxy breaks identity-based unregister).
- Layer rule: `src/tests/lib/architecture/layer-rules.test.ts:158-178` treats `src/lib/app/` as inbound only: core, features and plugins must not import `#lib/app/`. So `AppShell` must read the registry, not the mod code. Plugins may import core and features (`mods-host.service.ts:9` already imports `railRegistryStore` from features). The rule as written forbids core importing features, so the registry belongs in `core/layout` or in a feature that `AppShell` imports.
- Disposal: `{#if rightSidebarShown}` (`AppShell.svelte:264`) destroys Svelte children on hide. It does not remove DOM a mod appended by hand. The host has to call the mod's teardown on hide and in `unloadMod` (`mods-host.service.ts:399-405`). `unloadMod` also runs on vault switch (`mods-host.service.ts:99`), so panels must not outlive the vault.
- Hidden tabs: a mod panel inherits `hidesRightSidebar`. Calendar, tasks, tags, graph, canvas, views and kanban hide the whole sidebar (`layout.logic.ts:15-28`). A mod that wants to show on those tabs needs a separate decision.
- Data: visibility and order persist in settings (`LayoutSettings`). Mod ids must survive a mod being disabled, or its key becomes stale (the rail registry has the same issue, handled by `staleRailPinFix` in `lens.logic.js`, which I did not read).
- Trust: the mod gets full DOM and can break the sidebar layout or leave listeners on `document`. The existing `ctx.app` warning (`mods-host.service.ts:32-39`) only covers subscriptions made through `ctx.app`.

## Bugs or complexity removed (say none if none)

- Naming: `LayoutSection.svelte` is the Settings pane, not the sidebar. The per-panel switches (`LayoutSection.svelte:127-161`) duplicate the `AppShell.svelte:277-291` `{#if}` list by hand. A registry would make the two lists one.
- Label drift: the settings description (`LayoutSection.svelte:117`) names four panels. `AppShell.svelte:289-291` also shows `NoteInfo` under the Properties flag, and the label does not mention it. This is a copy issue, not a functional bug. I did not check whether it is deliberate.
- No functional bug found in the sidebar path I read.

## Could not verify

- Runtime behavior: I did not run the app (read-only task). Mount order, teardown on tab switch, and the `ScrollArea` layout with an extra panel are inferred from code, not observed.
- `staleRailPinFix` and `lens.logic.js`: referenced by `AppShell.svelte:24` but not read.
- `ModPanel` ordering and the `order` field in the sketch: a design proposal, not a verified contract.
- The mod contract's versioning policy: I did not read a document that states it.
- `help/documentation/28-mods.md`: a grep for sidebar, panel and pane matched only line 290 (a prompt row). I did not read the whole file, so I cannot say whether it documents any panel behavior.
- Whether mod DOM written into `[data-right-sidebar]` today survives re-renders: not tested.
- Your question about the plan and the failed haiku runs: I have no workflow state or run data in this task. This read-only mapping did not inspect it, so I cannot say what failed or why.