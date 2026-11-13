# Views and settings: mod entry points (cluster report)

Read-only pass. Paths are relative to the brain repo; `mods-src/` is `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`. Nothing was run, built or edited. Every line number below was read in this session.

## Ranking

| # | Entry point | Tier | Cost | Core file touched? | Mod-only prototype? |
|---|---|---|---|---|---|
| 1 | `ctx.ui.suggest` | A | M | none | crude, yes |
| 2 | Declarative settings (manifest `settings` + `ctx.settings`) | A | M | none | schema only, no UI |
| 3 | `ctx.ui.form` (reuses 2's field renderer) | B | M | none | already how mods do it (chained prompts) |
| 4 | Sidebar section with `mount(el)` | B | M | none | fragile DOM hack |
| 5 | `ctx.ui.openPanel` (host dialog chrome) | B | M | none | yes, Habits can go non-modal today |
| 6 | Mod-owned editor tab | C | L | 4 core files | no |
| 7 | General declarative view spec (List/Detail) | C | L | none | n/a |

## Ground truth I verified

- Contract: `ModUiV1` has alert, confirm, prompt, loading only (`src/lib/plugins/mods/contract/mod-api.v1.ts:192-205`). `ModContextV1` has addAction (303), addRailButton (305), no settings, panel or suggest (289-329). Additive members need no apiVersion bump (15-17).
- Dialogs: one queue, one shown at a time (`mod-dialogs.store.svelte.ts:32-36,49-51`); unload settles each as cancelled via `CANCELLED` (30, 81-84). The queue holds plain data, resolvers live in a separate Map (34-35). `ModDialogHost.svelte:68-160` is one bits-ui `Dialog` keyed by dialog id.
- Habits: own `<dialog>` + `showModal()` (`mods-src/mods/habits/src/habits.view.ts:151-165`), Preact+htm bundled (`index.ts:1`), `::backdrop` CSS injected (`habits.view.ts:19-20,112`), centering restated because the app's Tailwind reset zeroes margin (23-25), inline delete confirm because `ctx.ui.confirm` opens outside the modal (105). Its only config is `CHART_DAYS`/`WEEK_DAYS` constants (16-17).
- Layer rule: `app/**` may import anything (`scripts/import-graph.mjs:161-162`); nothing outside `app/` may import `app/`. `LabsSection.svelte:9-11`, `AppOverlays.svelte:9-10,21-22` already import `plugins/mods`. So an `app/` file can mount a `plugins/mods` component directly. **No core registry is needed for UI mounts** (see refuted claims). `plugins/mods` may import core and features (`ruleFor`, 163-174; allowlist 47-52 is only plugin-to-plugin).
- Right sidebar: five hard-coded panels, each behind a layout flag (`app/AppShell.svelte:278-290`), inside `ScrollArea` (276), shown only when `rightSidebarShown` (60, 264). Hidden on tasks/graph/tags/calendar tabs and canvas/.view/.kanban files (`core/layout/layout.logic.ts:14-28`).
- Tabs: `fileType` is a closed union (`core/editor/editor.types.ts:12`). `EditorView.svelte:42-64` renders exactly one branch per active tab, so switching tabs destroys the view component. `isVirtualTab` is a `__virtual__/` prefix test (`core/editor/editor.logic.ts:18-20`), so a mod path under that prefix already skips dirty/save logic (`core/editor/editor.service.ts:189,211,279`). I found no tab persistence in `editor.store.svelte.ts` (only grepped it and `core/vault`).
- Settings today: Labs is machine-local, keyed by vault path (`help/documentation/19-settings.md:332-339`); flags live in localStorage (`mods-enabled.store.svelte.ts:12-19`). `parseModManifest` copies named fields into a new object, so an unknown `settings` field is dropped silently (`mods.logic.ts:197-216`). Saving `manifest.json` reloads the mod (`mods.logic.ts:14,47`). Only Habits calls `loadData`/`saveData` (grep of `mods-src/mods` and `shared`).
- Reload churn: autosave reloads a mod every couple of seconds while the owner edits `main.js` in the app (`help/documentation/28-mods.md:121`).

## 1. `ctx.ui.suggest` (Tier A, cost M)

```ts
export interface ModSuggestItemV1 { id: string; title: string; description?: string }
export interface ModSuggestOptionsV1<T extends ModSuggestItemV1> {
	title: string; placeholder?: string; items: T[];
}
// in ModUiV1: resolves to the picked item, or null on Esc and on unload
suggest: <T extends ModSuggestItemV1>(options: ModSuggestOptionsV1<T>) => Promise<T | null>;
```
The host stores only `{id,title,description}` in the queue and the ctx wrapper maps the picked id back to the mod's object, so no mod value crosses the store (matches `mod-dialogs.store.svelte.ts:34`). v1 is a static array. A later `search?: (query) => Promise<T[]>` would run mod code per keystroke: debounce, cap, try/catch, stale-response guard.

- **Files:** contract `mod-api.v1.ts:186-205`; store kind/result/cancel maps `mod-dialogs.store.svelte.ts:5-9,12-17,30`; `mods-host.service.ts:132-176` (validate ids, like `dialogOptions` 123-129); `ModDialogHost.svelte:68-160` new branch built on `components/ui/command` as `ModActionPicker.svelte:165-184` does; docs `28-mods.md:266-297` (line 297 says "only these four"); tests `mod-api-contract.test.ts` (UI_PUBLIC), `ModDialogHost.test.ts`, `mod-dialogs.store.test.ts`, `mods-host.service.test.ts`.
- **Layer:** all in `plugins/mods`, imports only `components/ui`. Holds.
- **Risks:** (a) Hot path: every row is DOM. The quick switcher caps at 100 "to cap DOM work" (`core/filesystem/file-entries.logic.ts:28-29`); a mod passing every note from `ctx.kb()` would hang the dialog, so the host must cap rows. (b) Single queue: waits behind any open prompt (contract comment 186-191). (c) Unload: needs `suggest: null` in `CANCELLED`, else `settle` resolves `undefined`. (d) Duplicate ids make a keyed `{#each}` throw: reject in the host. (e) Keep the `isComposing` Enter guard (`ModDialogHost.svelte:52,61`).
- **Removes:** `inbox-triage/src/triage.service.ts:35-48` (types pasted into a prompt message, `resolveType`, unknown-type alert), `bulk-tag/src/bulk-tag.service.ts:45` (typed folder), `portent/src/index.ts:32-38` (typed parent, dangling-link risk). `one-on-one` keeps `ctx.app.openOneOnOnePicker` (`one-on-one/src/index.ts:16,23`) because the 1:1 picker is richer.
- **Unlocks:** type picker in triage, jump-to-note action, folder picker for bulk-tag (needs `ctx.vault.list`, non-recursive, `mod-api.v1.ts:118`).
- **Mod-only prototype:** yes. A mod-built `<dialog>` list as in `28-mods.md:323-340`. No host theme or cmdk keys, and it hits the same inert-confirm problem. Enough to learn which fields (description, limit) matter.

## 2. Declarative settings (Tier A, cost M)

```jsonc
// manifest.json, additive
"settings": [
	{ "key": "staleDays", "type": "number", "label": "Stale after (days)", "default": 7, "min": 1, "max": 90 },
	{ "key": "reportFolder", "type": "text", "label": "Report folder", "default": "vault/_inbox" },
	{ "key": "chartDays", "type": "select", "label": "Chart length", "default": "14", "options": ["7", "14", "30"] },
	{ "key": "autoOpen", "type": "toggle", "label": "Open after run", "default": false }
]
```
```ts
export interface ModSettingsV1 {
	/** Values with defaults filled, read when called; throws once unloaded */
	get: () => Record<string, string | number | boolean>;
	/** Disposer returned; also removed at unload; a throwing callback goes to the debug log */
	onChange: (callback: (values: Record<string, string | number | boolean>, key: string) => void) => () => void;
}
// ModContextV1: settings: ModSettingsV1
```
Why manifest, not `ctx.settings.declare()`: validated before `onload` with an error naming the field, shown in Labs even when `onload` threw (`ModsStatusList.svelte:66-74`), no mod code runs to render a form. Cost: a schema edit is a manifest build step; saving it reloads the mod, and values persist outside the mod.

**Storage decision (owner call):** (a) localStorage keyed by vault path and mod id, like the mod flags (`mods-enabled.store.svelte.ts:12-19`) and Labs semantics (`19-settings.md:334`): no Rust, no ADR change, not in the vault. (b) A reserved key in `data.json`: rejected, because Habits rebuilds `{habits, log}` on parse (`habits.logic.ts:39-48`) and `saveData(next)` (`habits.view.ts:81`) would erase foreign keys. (c) A new `settings.json` Rust command: `write_mod_data` is deliberately narrow, fixed file name (ADR 0036 amendment), so it needs an ADR amendment and a Rust test. Recommend (a).

- **Files:** contract (new type, member in 289-329); `mods.logic.ts:138-153,165-216` (type, parse, errors); new `mod-settings.logic.ts` (coerce, clamp) and `mod-settings.store.svelte.ts`; `mods-host.service.ts:357-361` (member, subscribers via `disposable` 105-116, pattern of `theme.onChange` 183-195); `ModsStatusList.svelte:46-75` (expandable row) or a new `ModSettingsForm.svelte` on `core/settings/sections/SettingItem.svelte:4-17` and `Switch`/`Input` (`LabsSection.svelte:5-6`); docs `28-mods.md:52-83`, `19-settings.md:332-341`; tests `mods.logic.test.ts`, `ModsStatusList.test.ts`, `LabsSection.test.ts`, contract test, new store test.
- **Layer:** `LabsSection` is in `app/` and already imports `ModsStatusList` (`LabsSection.svelte:11`); `plugins/mods` importing core `SettingItem` is allowed. Holds.
- **Risks:** no hot path (values read on demand). Wrong stored type after a schema change: coerce to default on read, never throw. Removed keys leave harmless orphans. Number input: empty or NaN, clamp to min/max. Key includes vault path so values do not leak across vaults. No `secret` type: localStorage is plaintext and `ctx.http` (Issue 08) will want tokens, so do not store tokens here.
- **Removes:** `vault-health/src/health.logic.ts:7` (STALE_DAYS), `shared/upsert.ts:4` (REPORT_FOLDER `vault/_inbox`, vault-specific, used at `vault-health/src/health.service.ts:9` and `one-on-one/src/one-on-one.service.ts:12`), `hf-scout/src/hf-scout.logic.ts:3`, `playground/src/playground.logic.ts:3`, `habits.view.ts:16-17`, `focus-timer/src/index.ts:16-20` (25 and 5 minutes). Not `bulk-tag` pacing (20-21): that mirrors core tuning, not a preference.
- **Unlocks:** change report folder or thresholds with no rebuild; A/B focus lengths; per-vault values.
- **Mod-only prototype:** the schema and `get/onChange` semantics, yes, with `ctx.loadData` plus a prompt per field. The Labs UI cannot be prototyped without core.
- **Obsidian precedent (third-party data):** 1.13 added declarative settings, `getSettingDefinitions()` (`obsidian.d.ts:7443`), controls toggle/dropdown/text/textarea/number/file/folder/slider/color/secret (8519), per-control `validate` (8548-8560 area) and a `SettingDefinitionRender` escape hatch (8911). Declarative plus raw escape hatch is the shape that worked there.

## 3. `ctx.ui.form` (Tier B, cost M, after 2)

```ts
export type ModFieldV1 =
	| { key: string; type: 'text'; label: string; value?: string; placeholder?: string }
	| { key: string; type: 'select'; label: string; options: { value: string; label: string }[]; value?: string }
	| { key: string; type: 'toggle'; label: string; value?: boolean };
form: (options: { title: string; message?: string; fields: ModFieldV1[];
	/** May reject: the message shows in the dialog, which stays open */
	submit?: (values: Record<string, string | boolean>) => unknown }) => Promise<Record<string, string | boolean> | null>;
```
- **Files:** as 1 (contract, store kind `'form'`, host `ui`, `ModDialogHost.svelte`), plus a shared `ModFieldControl.svelte` that 2 also uses.
- **Risks:** mod code runs on submit only, not per keystroke: safe. Lock buttons while `submit` is pending (double submit). Unload settles null. Keep the same fields as settings or two renderers drift.
- **Removes:** triage's two serial prompts (`triage.service.ts:35-56`), bulk-tag's two (`bulk-tag.service.ts:45-47`), the retry loop in `one-on-one/src/one-on-one.service.ts:19-34`.
- **Why `submit` and not `validate`:** that loop retries after the write refuses (unsaved edits in another tab, lines 25-33), not after bad input, so only a submit that can reject, keeping the dialog open, replaces it.
- **Mod-only prototype:** that is what mods do today (chained prompts). No new information, so build it only after a second mod asks.

## 4. Sidebar section with `mount(el)` (Tier B, cost M)

```ts
export interface ModViewHandleV1 { signal: AbortSignal } // aborted on hide, collapse, reload, unload
export interface ModSidebarSectionV1 {
	id: string; title: string; defaultOpen?: boolean;
	/** Runs when the section is shown and open, again after every re-show; return a cleanup */
	mount: (el: HTMLElement, view: ModViewHandleV1) => void | (() => void);
}
addSidebarSection: (section: ModSidebarSectionV1) => () => void; // ModContextV1
```
- **Files:** contract (type, member near 303-305); new `mod-views.store.svelte.ts` (plain-data registry, key `mod:<modId>:<id>` like `mods-host.service.ts:343`); new `ModSidebarSections.svelte` on `core/layout/SidebarSection.svelte:15-29`, mounting lazily like `BacklinksPanel.svelte:30-38`; `app/AppShell.svelte:290` (render it; legal, `import-graph.mjs:162`); `mods-host.service.ts:323-356` (copy `addRailButton`: validation, duplicate-id throw 332, `disposable` 352-355); docs; tests `AppShell.test.ts`, new component and store tests, contract test.
- **Layer:** holds, no core file changes.
- **Risks:** (a) Visibility: hidden on non-markdown tabs and when the setting is off (see ground truth), so "Habits" would vanish on the Tasks tab. (b) `{#if rightSidebarShown}` (`AppShell.svelte:264`) destroys and re-creates the subtree on tab changes: `mount` must be re-entrant with state outside the DOM (`saveData`). (c) `el` is an empty div Svelte never diffs, so mod DOM inside it is safe; wrap `mount` in try/catch, show the error in the section body and `debug('MOD:<id>')`, as `runAction` does (`mods-host.service.ts:237-243`). (d) A mod that forgets `render(null, el)` leaks timers: the host also empties `el` and aborts `view.signal`. (e) Style: the app's reset leaks into mod DOM (`habits.view.ts:23`); an open shadow root would isolate it and CSS variables still inherit (`28-mods.md:321`), but I did not test that here. (f) No per-keystroke hook: `editorStore.updateContent` runs per keystroke (`editor.store.svelte.ts:83-88`), so any later active-note API must be debounced path-only, never content. (g) A sync loop in `mount` freezes the app like any mod code (`28-mods.md:517`); no new class.
- **Removes:** from Habits, `habits.view.ts:19-25,112,151-165`, `index.ts:10-11` and the inline confirm row (`habits.view.ts:72-73,105-109,132-137`), because `ctx.ui.confirm` should work when nothing is modal (expected, not run). Other mods' report notes (`vault-health/src/health.service.ts:20-22`) could render live.
- **Unlocks:** Habits as a side panel; an Inbox or triage panel for portent; the owner's "menu in the right sidebar".
- **Mod-only prototype:** yes, fragile. Insert a node into `[data-right-sidebar]` (`AppShell.svelte:274`); it dies when the `{#if}` re-creates the pane, so it needs a MutationObserver, the same `isConnected` dance as `focus-timer/src/status-chip.ts`. Fine for a one-day demand test.

## 5. `ctx.ui.openPanel`, host dialog chrome (Tier B, cost M, spike first)

```ts
openPanel: (options: { title: string; width?: number;
	mount: (el: HTMLElement, panel: { close: () => void; signal: AbortSignal }) => void | (() => void) }) =>
	{ close: () => void; closed: Promise<void> };
```
- **Files:** contract `ModUiV1`; new `ModPanelHost.svelte` on `Dialog` (pattern `ModDialogHost.svelte:70-79`) mounted beside `ModDialogHost` (`AppOverlays.svelte:22`); a panel store separate from the dialog queue, since a panel must stay open while a confirm shows; `mods-host.service.ts:385-390` (close for mod at unload, as `closeForMod`); tests.
- **Risks:** (a) Two modal bits-ui dialogs open at once (panel plus confirm): focus trap and inert interplay are **unverified**; this needs a spike in the app, not a mod. If it fails, this entry point has no value over 4. (b) The inert-confirm cause is a native modal `<dialog>` making everything outside it inert; per the HTML spec I believe the host cannot fix that from outside, so scouts' "core placement fix" (mod:tasks) looks wrong. Not run. (c) Unload and reload close the panel: every autosave reload (`28-mods.md:121`) closes it mid-edit, same as Habits today (`index.ts:11`).
- **Removes:** Habits' dialog CSS and plumbing as in 4 (`habits.view.ts:19-25,112,151-165`); fixes inert confirm only if (a) passes.
- **Mod-only prototype:** yes, zero core. Habits switches `dialog.showModal()` (`habits.view.ts:161`) to `dialog.show()`; a non-modal dialog is not in the top layer and should leave `ctx.ui.confirm` clickable. Expected, not run. Do this before building the host panel.

## 6. Mod-owned editor tab (Tier C, cost L)

```ts
openView: (view: { id: string; title: string; mount: ModSidebarSectionV1['mount'] }) => { close: () => void };
```
- **Files (core):** `core/editor/editor.types.ts:12` (union gets `'mod'`); `core/layout/layout.logic.ts:14-28` (fixed Set, needs a prefix rule); `app/EditorView.svelte:36-64` (new branch, legal from `app/`); `core/markdown-editor/EditorTabs.svelte:69-81` (icon falls to the `tabIcon` snippet, probably no change); host `mods-host.service.ts` unload must `editorStore.removeTab` (`editor.store.svelte.ts:71`); tests `EditorView.test.ts`, layout tests, host tests.
- **Layer:** holds, since a mod tab component lives in `plugins/mods` and mounts from `app/`; but the `fileType` union and `layout.logic.ts` are core edits.
- **Risks:** `EditorView` renders one view per active tab, so every tab switch destroys the mod DOM (state must live outside). Worst reload story of the set: a reload on save kills the tab, and reopening "the same view" after reload is extra logic the other surfaces do not need. Dead tab if unload forgets to remove it.
- **Removes:** nothing today (Habits fits 4 or 5). **Unlocks:** boards, dashboards at editor size.
- **Mod-only prototype:** no, `EditorView` has no mod branch. An overlay `position:fixed` div over the editor is the only hack.

## 7. General declarative view spec (Tier C, cost L)

Raycast-style List/Detail/Form, host-rendered. Reject for now.
- Habits needs a 14-bar chart and a 7-cell grid per row (`habits.view.ts:47-51,131`): not a List or Form, so a chart widget would be new host code that Habits alone needs.
- Every widget is host code and, once shipped, a frozen contract member (`mod-api.v1.ts:15-17`, freeze test `mod-api-contract.test.ts`).
- Keep declarative only where the host gains behavior: settings fields (2), form (3), suggest (1). Everything else gets `mount(el)` (4, 5).

## Declarative vs raw DOM

Use both: declarative for narrow, form-shaped surfaces; `mount(el)` for views. Declarative buys validation, persistence, a11y and theme for free and keeps mods short, but narrows freedom per widget and adds contract surface. Raw DOM keeps the host small and mods free, but each mod re-solves styling (Habits: ~25 lines of CSS strings restating dialog behavior, `habits.view.ts:22-45`) and a bundled Preact (`habits.view.ts:4-6`). The host-owned container (empty `el`, abort signal, cleanup, error fallback) removes the dangerous half of raw DOM (lifetime and leaks) without a widget DSL. Obsidian ended in the same place: declarative settings plus a raw render hatch.

## Suggested order

1. `suggest` (1): smallest, no storage decision, three mods show demand.
2. Settings (2): the storage choice is the owner's; field renderer is reused later.
3. Habits `show()` spike (5, mod-only): one hour, may remove 5 entirely.
4. Sidebar `mount` (4): the first real panel; defines the mount contract 5 and 6 reuse.
5. `form` (3) after a second mod hits a chained prompt; `openPanel` (5) only if the spike says stacking works.
6. Defer 6 and 7 until a view needs editor size.

## Refuted or corrected scout claims

- "A core surface must expose a registry that plugins/mods fill in" (task text, ext:raycast): false for UI mounts. `app/**` is exempt (`import-graph.mjs:161-162`), so `AppShell` and `EditorView` can render `plugins/mods` components. Core edits are only needed for the tab `fileType` union and `layout.logic.ts` (entry 6).
- mod:tasks "copies theme variables into inline CSS": refuted. Habits uses `var(--x)` references (`habits.view.ts:1-2,22-45`), no copies.
- mod:tasks "a validate callback on `ui.prompt` removes the one-on-one retry loop": half refuted. The loop reacts to a refused write after the answer (`one-on-one.service.ts:25-33`), not to invalid input.
- mod:tasks/habits "a host dialog placement fix makes `ctx.ui.confirm` stack above a mod's modal": unsupported. See entry 5 (b).
- surface:switcher "evidence of demand for suggest is thin: no mod calls it": backwards, since it does not exist. Typed choices from lists are in `triage.service.ts:35-41`, `bulk-tag.service.ts:45`, `portent/src/index.ts:32-38`.
- mod:portent "the rail list is not virtualized": refuted. `VList` is imported at `features/rail-shell/RailNoteList.svelte:4` and used at 823-848. mod:habits was right but cited line 888.
- Line drift: `MOD_APP` is `mod-app.service.ts:23-53` (surface scout said 14-45) and `openOneOnOnePicker` is 36-40 (said 27-31). Right sidebar has five panels (`AppShell.svelte:278-290`, includes `NoteInfo`), not four (portent, ext:raycast).
- mod:habits "10 of 12 mods use ctx.app" vs mod:tasks "9 of 12": both hold. 9 reference `.app` directly in `mods/*/src` (bulk-tag, daily-log, hotkeys, inbox-triage, one-on-one, playground, portent, tasks, vault-health); focus-timer reaches it only through `shared/editor.ts:25`.
- ext:raycast "StatusBar registry not verified": verified none, `core/status-bar/StatusBar.svelte:4-20` takes `left`/`right` snippets only (outside this cluster).

## Not verified

- Raycast docs (manifest preferences, List/Form): not fetched, scout text only. The Raycast scout reported an embedded instruction on a fetched page; it was ignored.
- bits-ui behavior with two modal dialogs open; shadow DOM isolation of mod styles in this app; HTML-spec inert behavior for the confirm case; cmdk with thousands of rows. All reasoned from code, none run.
- Habits' built `main.js` size: the build output is in the vault, which I did not read.
- Tab restore on startup: only `editor.store.svelte.ts` and `core/vault` were searched.
- Test content of `ModDialogHost.test.ts` and `AppShell.test.ts`: only their existence.
- No tests, builds or app runs. Obsidian facts come from `obsidian.d.ts` only (1.14.4 per its `package.json`).
