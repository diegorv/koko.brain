# Cluster: right sidebar, properties panel, note action bar, status bar

Read-only research. Every file:line below was read in this session unless marked "not verified". Nothing was run.

## Ground truth (verified)

- Right sidebar is a hard-coded list: PropertiesView, TableOfContentsPanel, BacklinksPanel, OutgoingLinksPanel, NoteInfo, each behind a `settingsStore.layout.*Visible` boolean (`src/lib/app/AppShell.svelte:274-291`, `settings.types.ts:97-104`). It hides on canvas/view/kanban/special tabs (`core/layout/layout.logic.ts:23-37`, used at `AppShell.svelte:60`).
- `app/` may import everything: the layer test explicitly allows `app/AppShell.svelte -> plugins/*` (`src/tests/lib/architecture/layer-rules.test.ts:158`) and AppShell already imports `plugins/table-of-contents` and `plugins/word-count` (`AppShell.svelte:47,49`). The baseline holds only 3 `utils/` entries (`layer-baseline.json`). So: registry in `core/`, mod host in `plugins/mods` fills it, AppShell mounts a generic loop. Layer rules hold.
- The only registry a mod reaches is `railRegistryStore` (`rail-registry.store.svelte.ts:14-24`, `$state.raw` lists, `register*` returns an unregister by identity). The host wires only `registerAction` (`mods-host.service.ts:344`). Disposal pattern: `disposable()` wraps a cleanup once and pushes to `runtime.disposers` (`mods-host.service.ts:104-115`); `unloadMod` aborts the signal, runs disposers in reverse with try/catch (`:385-405`). `assertLive` throws once unloaded or vault changed (`:98-99`).
- Contract members are additive without an `apiVersion` bump (`mod-api.v1.ts:14-16`); `mod-api-contract.test.ts:45-60` (`CONTEXT_PUBLIC ... satisfies Record<keyof ModContextV1, true>`) and `:206` force each new member to be listed.
- Mods already write frontmatter only through unstable `ctx.app.updateNoteFrontmatter` (`mod-app.service.ts:50`): bulk-tag `bulk-tag.service.ts:87`, inbox-triage `triage.service.ts:65`, portent `portent.service.ts:24`.
- Per-keystroke facts: `editorStore.updateContent` runs on every keystroke (`editor.store.svelte.ts:83-86`); `NoteActionBar.svelte:56` derives from `editorStore.activeTab?.content`, so the bar re-derives per keystroke; `PropertyField.svelte:138` text `oninput` commits a full frontmatter rebuild per keystroke (`properties.service.ts:83-109`). `activeTabPath` is a separate getter (`editor.store.svelte.ts:39`): key host effects on it, not on content.

## Candidate 1: Status bar item (declarative, text only)

```ts
// contract, additive
export interface ModStatusItemV1 { id: string; text: string; title?: string; side?: 'left' | 'right'; onClick?: () => unknown }
export interface ModStatusHandleV1 { setText: (text: string) => void; setVisible: (visible: boolean) => void; dispose: () => void }
addStatusItem: (item: ModStatusItemV1) => ModStatusHandleV1; // throws on duplicate id, removed at unload
```

- Cost M (small). Files: new `core/status-bar/status-items.store.svelte.ts` and `StatusItems.svelte`; `app/AppShell.svelte:301-310` (render after the built-ins in both snippets); `plugins/mods/mods-host.service.ts` after `:345`; `contract/mod-api.v1.ts:289-329`; `mod-api-contract.test.ts:45-60`; `help/documentation/28-mods.md`; mods repo `focus-timer/src/status-chip.ts`.
- Core change: one store plus one component. `StatusBar.svelte:4` takes only two snippets; nothing else changes. Layers hold (core store, mod host imports core).
- Risks. Divider: `StatusBar.svelte:24-33` draws `:not(:first-child)::before`, so each item must be exactly one element child and a hidden item must leave the `{#each}`, not use `display:none` (this is why `status-chip.ts:24-26` calls `chip.remove()`). Per-second timers: `setText` must write one per-item `$state` cell so only a text node updates. Disposal: through `disposable()`; the item list is `$state.raw`. The bar exists only while a vault is open (`AppShell.svelte:183-185`), so register-before-vault is moot because mods load after open (`app-lifecycle.service.ts:535`). Text only: no `render(el)` here, it would reintroduce the divider and re-render problems.
- Removes: focus-timer's DOM query `document.querySelectorAll('.status-bar-group')` and the `isConnected` re-check (`status-chip.ts:16, 14`), its dependency on StatusBar markup (comment at `:15` says it is "not an API").
- Unlocks: inbox count, open-tasks count, vault-health findings count, focus countdown, habit streak as live chips with click.
- Tier A (small surface, no hot path, deletes a real hack).
- Prototype first as a mod: already done by focus-timer through the DOM hack. It works but breaks on markup change; a second hack-mod would add no information. Skip prototyping, build it.

## Candidate 2: Note action bar, More-menu items (declarative)

```ts
export interface ModNoteActionV1 { id: string; title: string; icon?: string; appliesTo?: (note: { path: string; typeName: string | null }) => boolean; run: (note: { path: string }) => unknown }
addNoteAction: (action: ModNoteActionV1) => () => void;
```

- Cost M. Files: new sibling registry in `features/note-action-bar/` (copy `note-action-bar-actions.store.svelte.ts`, 33 lines); the More menu loop in `NoteActionBar.svelte` between `:200` and `:205` (the separator rule at `:203-206` needs a fix for the extra group); `mods-host.service.ts` (model on `addAction`, `:295-321`); contract `:289-329`; contract test `:45-60`; docs.
- Layer: `features/note-action-bar` holds the store; mods fill it; same as one-on-one's registration (`app-lifecycle.service.ts:262`). Holds.
- Risks. Hot path: `bar` re-derives per keystroke (`NoteActionBar.svelte:56`), so `appliesTo` must be called only when the menu opens, never inside that derived. Silent failures: `run()` only logs (`:111-113`), so the host wrapper must toast on throw like `addAction`. Ids: the existing store does not namespace; use `mod:<modId>:<id>` as the rail does (`mods-host.service.ts:335`). Path form: the bar passes absolute paths (`note-action-bar.logic.ts:50` doc, indexing rule 9), contract paths are vault-relative (`mod-api.v1.ts` vault section); host must convert, an open decision. More-menu growth is clutter for the owner; cap or group under a "Mods" label.
- Removes: no mod hack or core code. Mods already act on the open note from a rail picker via `ctx.app.editorStore.activeTab` (portent `portent.service.ts:18-20`). This adds placement and discoverability only.
- Unlocks: "Send to Kanban", "Triage this note", "Mark organized" next to Archive. Better value if the same registry also feeds the note-list row menu (that is another cluster's surface; `NoteRowMenu.svelte` was not read here).
- Tier B (cheap and safe, but low added capability).
- Prototype as a mod: no extra value; the rail picker already does this.

## Candidate 3: Note action bar hub slot for mods (type-keyed button)

- The store already exists (`note-action-bar-actions.store.svelte.ts:11-33`); a mod would call `register({ id, label, typeName, run })`. Cost S, but the slot is one button per type and `resolveHubAction` uses `find`, first registration wins (`note-action-bar.logic.ts:71`), which silently hides New linked note for a hub type (`:72-73`). Also the width math uses an estimated `HUB_ACTION_WIDTH` (`:101-104`).
- Tier C. Do not expose until the shadowing is fixed or documented. Low freedom.

## Candidate 4: Inline foldable bar buttons for mods

- Needs the closed `FoldableAction` union, `FOLD_ORDER`, and `BAR_RESERVED_WIDTH = 960` / `ACTION_SLOT_WIDTH = 32` (`note-action-bar.logic.ts:77-121`) to become dynamic, plus width tests. Cost L. Highest bug surface in the bar for the least gain.
- Tier C. Not recommended; More-menu items cover it.

## Candidate 5: Right sidebar section registry (declarative rows plus `render(el)`)

```ts
export interface ModSidebarSectionV1 {
	id: string; title: string;
	// Called when the section is open and the active markdown note changed; never per keystroke.
	render: (el: HTMLElement, note: { path: string; signal: AbortSignal }) => void | (() => void);
}
addSidebarSection: (section: ModSidebarSectionV1) => () => void;
```

- Cost L (the largest in this cluster; M if declarative rows only). Files: new `core/layout/right-sidebar-sections.store.svelte.ts` and `core/layout/RightSidebarSections.svelte` (generic: loops the store, one `SidebarSection` each, calls `render`); `app/AppShell.svelte:289-291` (mount after `NoteInfo`); `mods-host.service.ts`; contract; contract test; docs.
- Reuse: `core/layout/SidebarSection.svelte:15-27` already gives header, chevron and a collapsible body. Lazy-on-open precedent: `OutgoingLinksPanel.svelte` fetches only when `expanded` (`:12-17`, effects after) and resets on tab change. Copy it: the section renders nothing until opened.
- Risks. (a) Reactivity: the host effect depends on `editorStore.activeTabPath` and open state only, body under `untrack` (CLAUDE.md quick-ref 2). A per-keystroke trigger would call mod code on every edit. (b) A sync throw in `render` must be caught per section and shown as an inline error row; a sync infinite loop cannot be stopped (`mod-api.v1.ts:56`). (c) Disposal: the returned cleanup runs on tab change, section close, mod unload (`disposable`) and vault change; the host removes `el`. After unload, a stale `render` callback must hit `assertLive`. (d) Sidebar visibility: hidden for canvas/view/kanban tabs and when the user toggles it (`layout.logic.ts:23-37`), so sections must tolerate not being mounted. (e) No sandbox: ADR 0036 is full trust, so DOM isolation only guards against accidents. Give each section its own container with `overflow:hidden`; an open Shadow DOM is an option but would stop app Tailwind classes applying (not verified). (f) Markdown only: gate with the same check lifecycle uses (`isMarkdownNoteTab`, `lifecycle.service.ts:32`).
- Declarative vs `render(el)`: ship `render(el)` only here. This is the one slot where a mod needs real UI (habits hand-builds a `<dialog>` and bundles Preact; the other slots need only a label and a click). Optionally add a declarative `rows: [{label, value}]` mode later for simple read-only data; do not start with both.
- Removes: habits' own dialog and its inert-confirm workaround (per the habits scout, habits.view.ts:105; not re-read here); the "Open a note first" pattern in portent (`portent.service.ts:18-20`) since the section receives the note.
- Unlocks: a Portent panel (type, organized, belongs_to, archived, Organize/Archive buttons), a Triage panel for inbox notes, 1:1 queued topics, open tasks of the note, habit streak.
- Tier B (highest freedom in the cluster, needs the care above).
- Prototype as a mod through raw `ctx.app`: only as a DOM hack. A mod can find `[data-right-sidebar]` (`AppShell.svelte:274`) and append into it, but the content sits in a bits-ui `ScrollArea` (`:276`), a foreign node under a Svelte-managed parent may be dropped on re-render, and layout is untested. Same fragility as `status-chip.ts`. Not verified; only worth a one-hour spike to learn what the owner wants in a panel before building the registry.

## Candidate 6: Properties panel per-row action menu

```ts
export interface ModPropertyActionV1 {
	id: string; title: string;
	appliesTo?: (p: { key: string; type: 'text' | 'list' | 'number' | 'date' | 'boolean' }) => boolean;
	run: (p: { key: string; value: string | number | boolean | string[] }, note: { path: string }) => unknown;
}
addPropertyAction: (a: ModPropertyActionV1) => () => void;
```

- Cost M. Files: new registry in `features/properties/` (pattern of the rail store); `PropertyField.svelte` next to the delete button (`:158-164`); `PropertiesView.svelte:209-` passes the note path; `mods-host.service.ts`; contract; contract test; docs. The action menu opens on click, so it adds no per-keystroke work if `appliesTo` runs on menu open only.
- Layer: registry in `features/properties`, filled by the mod host. Holds.
- Writes: the action must write via `updateNoteFrontmatter` (`frontmatter-write.service.ts:99`), not through the panel's `commitChanges`. That keeps the single lossy-frontmatter guard (`detectLossyFrontmatter`, `properties.logic.ts:405`; callers `properties.service.ts:87`, `frontmatter-write.service.ts:125`, meta-bind `widgets.ts:870`).
- Risks. Two save behaviours: the panel updates content only and relies on the 500 ms timer (`properties.service.ts:106`, indexing rule 7); `updateNoteFrontmatter` on an open tab saves the whole tab at once, flushing unsaved body text (`frontmatter-write.service.ts:132-133`). Refusal conventions differ: panel returns `false`, writer throws `FrontmatterWriteError`. Concurrency: the doc comment before `:99` says concurrent writes to one closed note race and callers must serialize; a mod firing two actions can clobber itself. Hidden keys (`_favorite`, `_organized`, `_archived`, `_type`, relationships) never reach the generic list (`PropertiesView.svelte:51-57`), so actions on them need the section (Candidate 5), not this menu.
- Removes: nothing existing. It mostly adds a surface mods can already imitate with a rail action.
- Unlocks: "Convert text to list", "Normalize dates", "Add to tags with one click", "Set _belongs_to from picker".
- Tier B (valuable, moderate; the real unlock is the frontmatter write API below).
- Prototype as a mod: yes, except the menu. The write half works today through `ctx.app.updateNoteFrontmatter`.

## Prerequisite for 5 and 6: stable frontmatter write on the contract (other cluster owns it, listed for ordering)

- Promote `updateNoteFrontmatter` to a stable `ctx.notes.updateFrontmatter(path, mutate)`; three mods depend on it. Resolve before promoting: per-path serialization, one error type with a message, whether the host calls `vaultStore.requestPromptIndexRefresh()` as `lifecycle.service.ts:34,50,68` does and portent does by hand (`portent.service.ts:22`), and the whole-tab save. Tier A. Already prototyped by three real mods through `ctx.app`.

## Candidate 7: Custom value widgets per key/type in the properties panel

- The value controls are a hard-coded chain (`PropertyField.svelte:122-155`), `PropertyType` is a closed 5-union (`properties.types.ts:2`), and meta-bind already is a second writer (`widgets.ts:868-897`). A widget registry adds a fourth writer that must call `detectLossyFrontmatter`, honour the refusal rebuild (`refusals`, `:122`) and not commit per keystroke. Cost L. Needs a per-property schema that does not exist (not verified beyond the scout's grep).
- Tier C. Do not schedule.

## Candidate 8: Mod inline meta-bind kinds / Live Preview widgets

- The parser and widgets are core CodeMirror code (`widgets.ts`); a registry there sits on the editor hot path governed by `docs/agents/live-preview-rules.md`. Not read in full here.
- Tier C. Do not schedule.

## Suggested order inside this cluster

1. Status bar item (A, M small, deletes a hack).
2. Stable frontmatter write (A, other cluster) in parallel.
3. Sidebar section registry (B, L), after a one-hour DOM-hack spike to confirm the panel shape.
4. Note More-menu items (B, M), ideally sharing a "note menu item" shape with the row-menu registry.
5. Property row actions (B, M), after 2.
6. Hub slot, inline bar buttons, value widgets, meta-bind kinds: C.

## Refuted or corrected scout claims

- "10 of 12 mods use ctx.app" (habits scout) vs "9 of 12" (tasks scout): 9 mods call `ctx.app` directly (bulk-tag, daily-log, hotkeys, inbox-triage, one-on-one, playground, portent, tasks, vault-health, by grep of `mods/*/src`); focus-timer reaches it indirectly via `shared/editor.ts`. Both counts are right under different definitions.
- Portent scout "grep found no virtualization in rail-shell": refuted, `RailNoteList.svelte:4,823` uses `VList` from virtua.
- Properties scout risk "a direct `_archived` write may skip lifecycle rules": refuted. `toggleArchived` is only `setBooleanFlag(properties, '_archived', archived)` (`lifecycle.logic.ts:57-59`) and the save path runs `notifyAfterSave` in both branches (`editor.service.ts:196` via `writeTab`; `frontmatter-write.service.ts:161`), so Auto Move applies to a mod's write too. Real difference: core calls `requestPromptIndexRefresh()` first (`lifecycle.service.ts:34,50,68`); the recipe in `28-mods.md` does not.
- Line drift in scouts: `get app()` is at `mods-host.service.ts:362` (scout said 363-366); More menu is `NoteActionBar.svelte:191-220` (scout said 187-221). Content correct.
- Note-bar scout "More menu re-parses per keystroke": the bar's derived does (`:56`); the menu items themselves are static. Claim confirmed for the bar, not the menu.
- Status-bar scout "no mod hack removed besides focus-timer": confirmed; the only occurrence is `status-chip.ts:16`.

## Not verified

- Runtime behaviour of any candidate; whether foreign DOM appended under the Svelte-managed sidebar survives re-render; whether `.status-bar-group` ordering with an `{#each}` of items keeps the divider CSS right (read, not run).
- `NoteRowMenu.svelte`, `Rail.svelte`, command palette, hotkeys, `docs/agents/live-preview-rules.md` beyond what scouts cite (other clusters).
- Whether bits-ui `ScrollArea` tolerates extra children and whether Shadow DOM is worth it for mod sections.
- Per-property schema absence (from the scout's grep only); `syncExternalContentToEditor` internals; whether any test pins the per-keystroke commit rate.
