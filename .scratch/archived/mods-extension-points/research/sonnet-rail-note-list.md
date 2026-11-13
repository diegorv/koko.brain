# Rail note list as a mod surface (cluster: rail-note-list)

Read-only analysis. Every file:line below was read in this session (paths relative to `/Users/diegorv/Dev/pet-projects/koko/brain/`; mods repo = `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`). Nothing was run or measured.

## Facts the ranking rests on

- One `NoteRowMenu` wraps the whole list (`src/lib/features/rail-shell/RailNoteList.svelte:821-897`), with one `ContextMenu` whose content exists only for the right-clicked row (`src/lib/features/note-list/NoteRowMenu.svelte:189-272`). Rows only call `menu.setContextTarget(note)` (`NoteRow.svelte:67`). `NoteRowMenu` is referenced only by `RailNoteList` and its context file, so it is the one place to extend.
- Rows are virtualized with virtua `VList` (`RailNoteList.svelte:4,823,888`). Per-row work today: `resolveNoteIcon` (644, 903), `listPropertiesFor` (699, 905), `typeChipFor` (694, 907), and one uncached `resolveWikilink` scan per wikilink pill (`NoteRow.svelte:9,103`, `core/filesystem/wikilink-resolution.logic.ts:64-80`; the cached variant exists at `:128`).
- The lens is resolved in a `$derived.by` (`RailNoteList.svelte:177-190`) that reads `typeDefinitionsStore.entries` and `entriesVersion`. `entriesVersion++` on every `setEntries` and `patchEntries` (`type-definitions.store.svelte.ts:66,90`), so every note save re-resolves. Built-in lenses already pay O(N log N) there (`lens.logic.ts:324-328`).
- `resolveLens` calls `provider.resolve(lens, ctx)` with no try/catch (`lens.logic.ts:434`). Built-in kinds win over providers (`:427-433`); `registerLensProvider` replaces by kind silently (`rail-registry.store.svelte.ts:55-56`).
- A provider alone is not selectable. The rail picks only items from `railItems` (`rail-items.logic.ts:31-61`): built-ins, navigators (need a Svelte `Component`, `rail-shell.types.ts:175-186`, rendered at `AppShell.svelte:213-214`), and pins. `RailAction` is "never picked" (`rail-shell.types.ts:198-200`), which is all a mod has today (`mods-host.service.ts:344-351`, `busy` is host-owned at `:349`).
- A mod can already make a selectable rail list with no core change: write a `.view` with `_rail: true`. Pins come from entries with `_rail === true` (`lens.logic.ts:218-237`); docs `help/documentation/25-types-and-relationships.md:151-155`. `ctx.vault.create/write` accept any path (`help/documentation/28-mods.md:~196`).
- Sort already accepts any frontmatter key: `parseListSort` takes `property:<key>` (`list-sort.logic.ts:56-59`), a list with no saved sort keeps the native order (`RailNoteList.svelte:543-544`). Row pills already show any frontmatter key (`NoteRow.svelte:99-121`). `ResolvedLens.groups` already renders headed sections in a list (`rail-shell.types.ts:51-69`, `RailNoteList.svelte:675-691,823-848`).
- Layer rules hold for every candidate below: `plugins/mods` may import `features/` (`mods-host.service.ts:9` already imports `rail-registry.store.svelte.js`); the registry stays in `features/`. No baseline entry changes (`layer-baseline.json` lists 3 `utils/` entries).
- `ctx.app` (`mod-app.service.ts:23-53`) has no rail or menu member, so a raw-`ctx.app` prototype of anything below needs a one-line `MOD_APP` addition (line 21: "Adding a member is one line here"). That is a core edit, not a zero-core prototype.
- The 12 real mods never touch the list or write a `.view` (grep of `mods/` and `shared/` for `_rail`, `.view`, `data-note-row`: no hits). Real evidence of the need: vault-health writes its result as a note and opens it (`mods/vault-health/src/health.service.ts:9,20-22`); portent computes "oldest `_organized: false`" paths from `kb()` (`shared/notes.ts:16`).

## E0. Mod-written pinned `.view` as a list (recipe, no core)

- API: none. `await ctx.vault.create('Views/Stale.view', yaml)` with `_rail: true` and a filter expression.
- Cost: 0 (docs only, one paragraph in `28-mods.md`).
- Core change: none. Layer rules n/a.
- Risks: expressible only as a collection filter (`help/documentation/12-collection.md:75,190-217`), not arbitrary JS. Disposal: the file stays after the mod is removed (a leftover pin; user deletes the file). Data: the file is indexed like any note, and pin/unpin rewrites it (comments lost, `25-types...:155`).
- Removes: nothing in core. Mod hack removed: a "report note" for any list that is a pure filter.
- Unlocks: "stale notes", "notes without parent" lists today.
- Tier: A (free). Prototype as a mod: yes, it is the prototype.

## E1. Note-row context-menu items

```ts
interface ModNoteMenuItemV1 {
	id: string;                        // unique within the mod
	title: string;
	icon?: string;                     // 'pack:name' or bare lucide name, like addRailButton
	when?: (note: ModMenuNoteV1) => boolean;   // evaluated on menu open only
	run: (note: ModMenuNoteV1, run: ModRunV1) => unknown;
}
interface ModMenuNoteV1 { path: string /* vault-relative */; title: string; isA: string | null; favorite: boolean; kind: 'markdown' | 'canvas' | 'kanban' | 'view' | 'pdf' | 'image' | 'other'; }
// ModContextV1: addNoteMenuItem: (item: ModNoteMenuItemV1) => () => void;  // throws on duplicate id
```

- Cost: S. Files: new `features/note-list/note-menu-items.store.svelte.ts` ($state.raw list, same shape as `rail-registry.store.svelte.ts:14-22,78-84`); read it in `NoteRowMenu.svelte:211-272`; forward in `mods-host.service.ts` next to `addRailButton` (`:323-356`); contract `mod-api.v1.ts:~304`; contract test (`mod-api-contract.test.ts`); docs `28-mods.md:~165`.
- Core: one registry plus one `{#each}` in the menu. Layer rules hold.
- Risks:
  - Hot path: none per row; content is built for one row on open. `when` is a mod callback evaluated in the menu render, so the host must wrap it in try/catch and treat a throw as false.
  - Path form: `NoteRowMenu` targets carry absolute paths (`note-row.types.ts:5-6`); the contract is vault-relative, so the host converts. Non-markdown rows exist on the folder lens (`lens.logic.ts` `fileToLensNote`), hence `kind`; the built-in menu already guards markdown-only items at `NoteRowMenu.svelte:245-255`.
  - Disposal: unregister by identity (as `rail-registry...:78-84`); a menu open during unload keeps captured items, so `run` must check `runtime.unloaded` (set at `mods-host.service.ts:385-388`) before calling mod code.
  - Error path: route `run` through `runAction` (`:204-247`) so Stop, progress and the failure toast match rail actions; a quiet run closes its view (`28-mods.md:199`).
- Removes: portent "Open a note first" active-tab dependency (`mods/portent/src/portent.service.ts:18-20` per the portent scout; not re-read by me), typed parent/type prompts if paired with a picker, `bulk-tag`'s folder prompt only if the folder menu gets the same registry (`FilesNavigator.svelte:88,343-395`, outside this cluster).
- Unlocks: right-click "Organize", "Archive", "Check this note", "Start focus here" on any rail list row; tests whether per-note verbs beat the picker.
- Tier: A. Prototype as a mod without core: no clean way (would need a DOM `contextmenu` listener on `[data-note-row]`, `NoteRow.svelte:64`, plus a mod-owned popup; fragile). A one-day core spike is cheaper.

## E2a. Mod-supplied list, push model (recommended slice)

```ts
interface ModListV1 { id: string; title: string; icon: string; rule?: string; }
interface ModListHandleV1 {
	/** Replaces the list. Paths are vault-relative; unknown paths are dropped by the host. */
	set: (list: { paths: string[] } | { groups: { id: string; label: string; paths: string[] }[] }) => void;
	dispose: () => void;
}
// ModContextV1: addList: (list: ModListV1) => ModListHandleV1;  // throws on duplicate id
```

- Cost: M. Files: `rail-shell.types.ts:175-186` (make `RailNavigator.component` optional and `icon: Component | string`, i.e. a pane-less navigator); `AppShell.svelte:117` (`showsNavigator` only when a component exists); `Rail.svelte:195-200` icon path for string refs; `rail-registry.store.svelte.ts:46-60` (host calls `registerNavigator` plus `registerLensProvider`); `mods-host.service.ts` (new `addList`, key `mod:<modId>:<id>` so it never collides with built-in keys); `mod-api.v1.ts`; tests; docs.
- Why it reuses the most: a registered navigator already flows through `railItems` (`rail-items.logic.ts:45`), hide/order (`arrangeRailGroups`, `:71-82`), Settings > Layout (`LayoutSection.svelte:39`), the Go to command (`commands.ts:56-64`) and restore (`lens.logic.ts:201-202`). The list reuses sort, search, pills, groups, row menu (E1). The host maps paths to `LensNote` through `typeDefinitionsStore.entriesByPath` (`type-definitions.store.svelte.ts:62-66`), so the mod never sees a `NoteEntryV2` and no snapshot copy is needed.
- Why push, not a `resolve` callback: no mod code runs inside the `$derived` (`RailNoteList.svelte:177-190`), so no throw and no sync loop can hit the list path; the host keeps the last paths in a `$state.raw` and resolves them in O(paths). Trade-off: the list is as fresh as the mod's last `set` (no change event exists in `ModContextV1`, `mod-api.v1.ts:289-330`); the mod refreshes from an action, a timer, or on load via `ctx.kb()`.
- Risks: (1) saved `layout.railItem = mod:...` falls back to Today until the mod registers (mods start off the open path, `app-lifecycle.service.ts:525-538`; fallback `lens.logic.ts:206`); the saved value is not rewritten by `AppShell` (the stale fix only touches view/type pin keys, `lens.logic.ts:158-160,246-248`), so it recovers, but a click in between overwrites it. (2) Dispose must call both unregisters; `railRegistryStore.reset()` has no non-test caller (grep), so teardown relies on identity unregisters (`:49-52`). (3) Large `paths`: cap and truncate in the host. (4) "+ New here" stays hidden (no `newNote`, `rail-shell.types.ts:154-155`).
- Removes: vault-health's report note (`health.service.ts:9,20-22`) and the toast-with-count (`:25-26`), portent's inbox walk as a list; core: nothing.
- Unlocks: Vault health findings as a list with groups per check; Portent "Needs type / Needs parent / Stale" as one grouped list; today's focus-log notes. Per-item `subtitle` (existing `LensNote.subtitle`, `rail-shell.types.ts:40-41`) can carry a finding text with no per-row callback: allow `{path, subtitle?}` entries.
- Tier: B (valuable, needs the pane-less navigator change and a decision on the saved-pick flash). Prototype as a mod first: partly. Only E0 works with zero core; anything computed needs the `MOD_APP` line plus the optional-component change, so build E2a directly.

## E2b. Mod-supplied list, pull model (`resolve` callback)

```ts
resolve: (snap: { notes: readonly { path: string; title: string; isA: string | null; modifiedAt: number; frontmatter: Record<string, unknown> }[] }) => { paths: string[] } | null;
```

- Cost: L (E2a plus: a snapshot built once per `entriesVersion` and cached in the host, try/catch in `lens.logic.ts:434` that returns a `status: { kind: 'error' }` lens, a time check that disables a list that ran too long, tests for `resolveLens`).
- Risks: `resolve` runs in the derived on every entries change (`:177-190`); it can throw (guardable), be slow (detectable only after the fact), or loop forever (cannot be stopped, `28-mods.md:517`). Reads inside `resolve` of `$state` would add hidden dependencies. A stale `LensContext` shape would leak if passed instead of the narrow snapshot (`rail-shell.types.ts:20-31`).
- Removes: the need for the mod to schedule refreshes. Adds a hot-path callback to remove none.
- Tier: C for now (build only if E2a's staleness hurts in daily use). Prototype: same as E2a.

## E3. Row decoration (badge, color, extra pill)

```ts
// precomputed, no per-row callback
decorate: (map: Map<string /* vault-relative path */, { badge?: string; color?: string }>) => void;
```

- Cost: M. Files: `rail-shell` store for the map, `RailNoteList.svelte:900-912` (`noteRow` snippet), `NoteRow.svelte:84-121`, host forward, contract, tests.
- Risks: a callback `(note) => decoration` would run per visible row on every re-render, with no error boundary; allowed only as a Map lookup, O(visible rows). A map replaced on each push re-renders visible rows. Mod-removed decorations vanish with the dispose. Colors need theme safety (`ctx.theme`).
- Removes: nothing today; pills of any frontmatter key and the italic inbox style already exist (`NoteRow.svelte:84,99-121`).
- Unlocks: a "stale" dot, a "needs parent" badge across all built-in lists.
- Tier: C. Low marginal value over E2a's `subtitle` and frontmatter pills. Prototype as a mod: write a derived frontmatter key and show it with the Properties picker (`RailNoteList.svelte:744`), at the cost of a write per note.

## E4. Mod-defined sort and filter

```ts
addSort: (s: { id: string; label: string; key: (note: ModListNoteV1) => number | string }) => () => void;   // key precomputed once per note
addFilter: (f: { id: string; label: string; keep: (note: ModListNoteV1) => boolean }) => () => void;
```

- Cost: M each. Sort touches the closed union (`list-toolbar.types.ts:2`), `parseListSort` (`list-sort.logic.ts:61-62`), `RailSortMenu`, and `list-sort-compare.logic.ts:79-97`. Filter touches `list-search.logic.ts:40-61` and the toolbar.
- Risks: sort `key` must be computed once per note, not per comparison (today `comparable()` re-runs a regex per comparison, `list-sort-compare.logic.ts:41-59,67-72`). Filter `keep` runs per note per keystroke (`RailNoteList.svelte:545`). A saved `mod:` sort from a removed mod parses to null and the list reverts to the default (`list-sort.logic.ts:61-62`), unless the parser is extended, which then needs its own fallback. Persisted prefs stay in `settings.json` and `.view` files.
- Removes: nothing; a mod list (E2a) already controls its own order, and `property:<key>` sorts any frontmatter key.
- Tier: C. Prototype as a mod: yes, via a derived frontmatter key plus `property:` sort.

## E5. Mod navigator with its own panel (DOM mount)

```ts
addNavigator: (n: { id: string; label: string; icon: string; lens: () => { kind: string; target?: string }; mount: (el: HTMLElement, ctx: { signal: AbortSignal }) => () => void }) => () => void;
```

- Cost: L as a standalone (host Svelte wrapper that mounts and tears down mod DOM, try/catch around `mount`, per-mod pick persistence because `lens()` is sync and `saveData` is async, `AppShell.svelte:104-111` reads `lens()` in a derived). XS once a shared "mount host" exists for other surfaces (right sidebar, status bar clusters).
- Risks: a throw in `mount` inside the pane; I did not find or read an error boundary at `AppShell.svelte:213-214`. A hung mod DOM is on the main thread. Disposal must call the returned cleanup and remove the element.
- Removes: habits' hand-built `<dialog>` only if combined with a panel host (outside this cluster).
- Unlocks: a mod-owned tree or filter UI next to the list. Most freedom, least needed: E2a's groups cover "sections".
- Tier: C now, B after a shared mount host exists. Prototype as a mod: not without core.

## E6. Replace built-in lens kinds, columns, mod-owned list rendering

- Built-ins win over providers by design (`lens.logic.ts:427-433`); columns would replace a single-column row (`NoteRow.svelte:63-124`).
- Tier: C (reject). Large core change for a corner case.

## Recommended order and trade-offs

1. E0 as a docs recipe now (no code, no risk).
2. E1 (S): max freedom per core line, zero hot-path cost, same registry pattern as `folderCreators` (`FilesNavigator.svelte:88`).
3. E2a (M): the "mod list" experiment, with push semantics so mod code never runs inside the rail's derived.
4. E2b, E3, E4, E5 only on demonstrated need; E6 never.

Optional core cleanups, independent of mods, worth doing before E3 or E4: cached wikilink resolution in `NoteRow.svelte:103`; `allPaths` is rebuilt from the whole tree on each tree change and passed to every row (`RailNoteList.svelte:564,906`); `sortProperties` and `pickableProperties` scan all notes on each change (`:557-558`).

## Scout claims refuted or corrected

- Refuted (portent scout): "the rail list is not virtualized". It is: `RailNoteList.svelte:4,823,888`.
- Refuted (rail-registry scout): NoteRowMenu is "wrapped around each virtualized row". One menu wraps the whole list (`RailNoteList.svelte:821-897`).
- Wrong lines/size (note-list scout, vault-health scout): the menu items are at `NoteRowMenu.svelte:211-272`, not 95-151 or 189-235; about ten items, not 20.
- Corrected (rail-registry scout): a navigator id like `inbox` does not duplicate keys in one keyed each; built-ins and navigators are separate each blocks (`Rail.svelte:275,281,289,298,304`). The real clash: `restoreRailItem` checks built-ins first (`lens.logic.ts:199-202`) so the navigator is unpickable. Namespaced `mod:<id>:<id>` keys avoid it.
- Corrected (portent and hotkeys scouts): "resolve runs on every list render". It re-runs when the derived's dependencies change (entries, entriesVersion, lens, providers), not per render (`RailNoteList.svelte:177-190`).
- Corrected: the scouts' menu-item sketches pass `{path}` untouched; row paths are absolute (`note-row.types.ts:5-6`) while the contract is vault-relative.
- Confirmed: unguarded `provider.resolve` (`lens.logic.ts:434`); `reset()` has no non-test caller; uncached wikilink pills (`NoteRow.svelte:103`); `busy` host-owned (`mods-host.service.ts:349`); saved unregistered navigator falls back to Today without rewrite (`lens.logic.ts:206`, `AppShell.svelte:104-111`).

## Not verified

- No timing or memory measurement of any hot path; no budget number is proposed because none was measured.
- Not read: `Rail.svelte` icon snippet (~335-353), `RailSortMenu.svelte`, `list-fulltext.service.ts` (the 500-hit cap claim is unchecked), `FilesNavigator.svelte` folder menu contents beyond lines 88 and 343-395, `LayoutSection.svelte` beyond line 39, `mod-api-contract.test.ts`.
- Unknown: whether `AppShell.svelte:213-214` has an error boundary; how Settings > Layout behaves for a pane-less navigator; whether `staleRailPinFix` or another effect rewrites a saved `mod:` key (only the view/type-prefixed pin path was read).
- Not read: portent's `portent.service.ts` (its "Open a note first" claim is the scout's); brain-os-vault was not touched.
