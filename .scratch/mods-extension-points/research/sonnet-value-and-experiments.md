# Mod entry points: value and experiments

Read-only research. Everything cited was read in this session; scout claims I did not confirm are listed at the end. Layer fact checked: `plugins/` may import `core/` and `features/` (`src/tests/lib/architecture/layer-rules.test.ts:135-150`), and `layer-baseline.json` holds 3 entries, all `utils/` to `core/`. So every surface below is a registry in `core/` or `features/` that `plugins/mods` fills, the pattern of `railRegistryStore` (`rail-registry.store.svelte.ts:12-94`, unregister by identity).

Shared facts all entry points rely on:
- Mods have two UI entry points today: `addAction` (`mods-host.service.ts:295`) and `addRailButton` (`:323`, registers `railRegistryStore.registerAction` at `:344`). Disposal is `disposable()` (`:105`) plus `ctx.register` and `unloadMod` (`:385`), which closes the picker and dialogs and runs cleanups in reverse.
- The contract is frozen by key lists in `src/tests/lib/plugins/mods/mod-api-contract.test.ts:48-62`; a new member is additive (`mod-api.v1.ts:15-16`) but needs that test updated.
- `MOD_APP` (`mod-app.service.ts:23-53`) is live objects, "Adding a member is one line here". Counted by grep in the mods repo: 9 mods use `ctx.app` directly (bulk-tag, daily-log, hotkeys, inbox-triage, one-on-one, playground, portent, tasks, vault-health; focus-timer reaches it through `shared/editor.ts`), 7 use `ctx.kb`, 13 `addRailButton` and 25 `addAction` call sites.

## 1. Stable facade on ctx (notes, frontmatter, daily, types, editor)
```ts
notes: { active(): { path: string; content: string } | null; isDirty(path: string): boolean;
  updateFrontmatter(path: string, mutate: (p: Property[]) => Property[]): Promise<void>; query(q: { folder?: string; where?: Record<string, unknown> }): Promise<NoteDTO[]> };
daily: { path(d?: Date): string; openOrCreate(): Promise<void> };
types: { list(): string[] };  editor: { insertAtCursor(text: string): void };
```
- Cost M. Files: `contract/mod-api.v1.ts:289-329`, `mod-app.service.ts:23-53` (source of the wrapped functions), `mods-host.service.ts` (new members next to `vault:` at `:361`), contract test `:48-62`, `help/documentation/28-mods.md` raw-access section.
- Core change: none. Wraps `updateNoteFrontmatter`, `dailyNotePath`, `openOrCreateDailyNote`, `typeDefinitionsStore`. Layers hold (mods already import these).
- Risks: each member freezes an API (add only what 2+ mods use). Writers re-run `mutate`, so purity must be documented (`bulk-tag.service.ts:89-90`). `editor.insertAtCursor` must use the changed-range approach, not a whole-doc replace (`shared/editor.ts:9-20`, `docs/agents/live-preview-rules.md`). Paths: contract is vault-relative, app is absolute (indexing rule 9), so convert at the boundary like `mod-vault.service.ts` does.
- Removes: raw `ctx.app` in 9 mods; `requestPromptIndexRefresh` timing hack (`portent.service.ts:22`, the host should do it); hand-copied `RawApp` types (`shared/types.ts:47-76`); CodeMirror dispatch in `playground/src/index.ts:41-48` and `shared/editor.ts:24-40`; 3 copies of frontmatter writing (bulk-tag:87, inbox-triage:65, portent:24).
- Experiments: any "act on the open note" mod without raw access; insert link to today's note at the caret; mods whose tests use the contract instead of `fake-ctx`.
- Tier A. Prototype first: already is one (that is what the 9 mods do). Promote only after a second mod copies the same call.

## 2. Command palette: `ctx.addCommand`, `when`, run by id
```ts
addCommand(c: { id: string; title: string; when?: () => boolean; hotkey?: string; input?: ModActionInputV1; run(input: string, run: ModRunV1): unknown }): () => void;
actions: { run(modId: string, actionId: string, input?: string): Promise<void> };
```
Or zero new API: list every `addAction` as `<Mod>: <title>`.
- Cost S to M. Files: new registry in `features/command-palette/` (store next to `command-palette.store.svelte.ts`), merge at `app/AppOverlays.svelte:18` (`commands={getBuiltInCommands()}`; the app layer may import everything), `CommandPalette.svelte:27-37`, `mods-host.service.ts:295-322` and `:204` (`runAction`), contract and test.
- Layers hold: registry in `features/`, filled from `plugins/mods`.
- Risks: not on a hot path or save path; runs on user action. Palette `executeCommand` only does `console.error` plus a toast (`CommandPalette.svelte:33-35`), so a palette run must go through `runAction`, or Stop, progress and the MOD log are lost. `runAction` takes a `buttonKey` and runs are keyed per button, "one live run per button" (`mods-runs.store.svelte.ts:55-71`), so a palette run needs a synthetic key. Recents key on `id` (`command-palette.store.svelte.ts:43-45`), so namespace ids `mod:<id>:<cmd>`. `when()` runs when the palette opens: document it as sync and cheap (a sync loop cannot be stopped, `28-mods.md:515`). Unload: unregister in `disposable`, same as actions. Palette noise: Labs per-mod switch exists.
- Removes: `hotkeys.service.ts:28-31` DOM click on another mod's rail button; "Open a note first" failed runs (`28-mods.md:452-456`) via `when`; rail-only reach of 25 actions.
- Experiments: Portent captures as palette commands with a title input; every vault-health, bulk-tag and tasks action by fuzzy search; a mod calling another mod's action.
- Tier A. Prototype first as a mod: no (nothing to hook). Cheapest spike: one line exposing the palette store in `MOD_APP`, then `ctx.register` the unregister.

## 3. Context-menu items for note rows and folders
```ts
addMenuItem(i: { target: 'note' | 'folder'; id: string; title: string; icon?: string; when?(t: { path: string; isFolder: boolean }): boolean; run(t: { path: string; isFolder: boolean }, run: ModRunV1): unknown }): () => void;
```
- Cost M. Files: new registry in `features/note-list/` (note rows) and `features/rail-shell/` (folders), render after the built-in items at `NoteRowMenu.svelte:212-270` and `FilesNavigator.svelte:343-395`, host wiring in `mods-host.service.ts`, contract and test.
- Layers hold. `RailNoteList.svelte:56` imports `NoteRowMenu`, so one registry serves the rail list.
- Risks: not per row. `NoteRowMenu` is one `ContextMenu.Root` around the whole `VList` with a single `contextTarget` (`:43`, `:212`), and `VList` is used at `RailNoteList.svelte:823,888`. `when(target)` runs once per open. Give the mod a DTO with a vault-relative path (indexing rule 9 uses absolute everywhere inside the app). Handle a note deleted since open (toast). Do not let an item reset inline rename state (`NoteRowMenu.svelte:43-49`). Disposal: replace-by-id plus unregister like `railRegistryStore`.
- Removes: bulk-tag's two text prompts (`bulk-tag.service.ts:45,47`, folder is what the user right-clicked); portent and inbox-triage's dependence on the active tab (`portent.service.ts:18-20`); lets the hardcoded items stay hardcoded.
- Experiments: right-click folder, "Tag all notes here"; right-click note, "Triage", "Mark organized", "Archive"; "Start focus on this project".
- Tier A. Prototype as a mod: no. DOM `contextmenu` listeners would fight the Radix menu, not recommended.

## 4. Status bar item
```ts
addStatusItem(i: { id: string; side?: 'left' | 'right' }): { setText(t: string): void; setTitle(t: string): void; onClick(fn: () => void): void; remove(): void };
```
- Cost S. Files: `core/status-bar/` new store plus `StatusBar.svelte:11-20`, snippets at `AppShell.svelte:301-310`, contract and host.
- Layers hold (`core/` store, mod fills it). Text only: no mod DOM.
- Risks: a per-second `setText` writes one `$state` string, cheap; still coalesce equal text. The host owns dividers (`StatusBar.svelte:24-33` draws `:not(:first-child)::before`), so hide means remove from the list. Cap text length. Disposal: `remove()` in `disposable`.
- Removes: `focus-timer/src/status-chip.ts:12-26` (querySelectorAll on `.status-bar-group`, isConnected re-check each tick, remove-not-hide workaround).
- Experiments: live inbox count, open tasks today, vault-health findings, focus countdown; a core `WordCount` clone as a mod (see "move to mods").
- Tier A. Prototype as a mod: already done by focus-timer (the DOM hack); that is the evidence.

## 5. Pickers and forms: `ui.pick`, `ui.pickNote`, `ui.form`, confirm above mod dialogs
```ts
pick<T>(o: { title: string; items: { value: T; label: string; description?: string }[] }): Promise<T | null>;
pickNote(o: { title: string }): Promise<string | null>;   // vault-relative path
prompt(o: ModPromptOptionsV1 & { validate?: (v: string) => string | null }): Promise<string | null>;
```
- Cost S (`pick`, `pickNote`, `validate`) to M (`form`, confirm stacking). Files: `mod-dialogs.store.svelte.ts`, `ModDialogHost.svelte`, `mods-host.service.ts` (`ui`), contract (`mod-api.v1.ts:192-205`), test. `pickNote` can reuse the quick switcher, `openOneOnOnePicker` is the existing callback picker (`mod-app.service.ts:37-40`).
- Layers hold (all inside `plugins/mods` plus an existing `features` component).
- Risks: one dialog at a time already holds (`mod-api.v1.ts:186-191`). Confirm over a mod's own modal `<dialog>` is a dialog-host placement fix (habits comment at `habits.view.ts:105`, not re-read by me). Large vaults: `pickNote` list must virtualize.
- Removes: type-by-name prompts with typo risk (portent `index.ts:32-38` dangling `_belongs_to`; inbox-triage `triage.service.ts:33-56` serial prompts); one-on-one `for(;;)` retry loop (`one-on-one.service.ts:23-35`).
- Experiments: triage with a real type list; Set parent with a picker; any mod that today asks for a note or folder.
- Tier A for `pick`/`pickNote`, B for `form` and stacking. Prototype as a mod: yes for `pick` (own `<dialog>`, as habits does), which is the hack being removed.

## 6. Declared hotkeys on commands, routed by core
```ts
addCommand({ id, title, hotkey: 'Mod-Shift-J', run })   // one dispatcher in core, conflicts refused and logged
```
- Cost M. Files: `utils/keybindings.ts:57-79`, `app/global-keybindings.ts:62` (`GLOBAL_KEYBINDINGS`), `:211` (`shortcutFor`), `:222`, palette registry from section 2, host, contract and test.
- Layers hold if the dispatcher lives in `app/` or a `features/` registry. Note `registerKeybinding` has no typing-target or dialog guard and always `preventDefault`s; the app's `/` handler adds both (`global-keybindings.ts:33-50`). A mod dispatcher must copy that guard. `shortcutFor` throws on an unknown id (`:211-216`), so mod chords need their own label lookup; `formatShortcut` (`keybindings.ts:40-54`) already renders any combo.
- Risks: keydown on every keystroke, so one `Map<combo, command>` lookup and early return on no modifier. Precedence: app bindings win, a mod chord that collides is refused (PRD later-list names the Cmd+S shadow case, `PRD.md` "Later"). Overlap with the CodeMirror keymap needs a rule. Disposal: unregister on unload.
- Removes: `hotkeys/src/index.ts:17-19` window capture listener with `stopPropagation` (silently shadows app chords) and `hotkeys.service.ts:28-31`; the duplicated `code` plus `label` pair; chords with no run view.
- Experiments: daily-log and tasks chords; compare chord against rail click for speed; test conflicts before building a remap UI.
- Tier B. Prototype as a mod: already done by the hotkeys mod. Keep it as the control for the experiment.

## 7. Declared mod settings in Labs
```ts
settings: { schema: Record<string, { type: 'text' | 'number' | 'boolean' | 'select'; label: string; default: unknown; options?: string[] }>; get<T>(k: string): T; onChange(fn): () => void }
```
Backed by `saveData` (`mod-api.v1.ts:315-328`).
- Cost M. Files: `plugins/mods/ModsStatusList.svelte` (rendered by `app/LabsSection.svelte:50`), host, contract and test.
- Layers hold. Risks: not hot; a form API is a surface to maintain, keep it declarative. Data: schema change vs stored values needs defaults only. Disposal: none.
- Removes: hardcoded `vault/_inbox` (`shared/upsert.ts:4`, `vault-health/health.service.ts:9`), `STALE_DAYS`, PACE constants as editable knobs.
- Experiments: change a report folder without editing `main.js`; thresholds per vault.
- Tier B. Prototype as a mod: yes, `loadData`/`saveData` plus `ctx.ui.prompt` today.

## 8. Right sidebar section
```ts
addSidebarSection(s: { id: string; title: string; mount(el: HTMLElement, a: { path: string | null }): void | (() => void) }): () => void;
```
- Cost M to L. Files: new registry in `core/layout/` or `features/`, render list after `AppShell.svelte:277-290` inside `SidebarSection` chrome, `layout.logic.ts:23-37` (hidden on some tabs), contract and host.
- Layers hold. Risks: highest DOM exposure of the UI entry points. Pass a `path` signal, never `activeTab.content`: effects must key on `editorStore.activeTabPath` (`editor.store.svelte.ts:39`; the store comment at `:21` says its effect avoids `content` for this reason). Wrap `mount` in try/catch so one mod cannot blank the sidebar. Unmount on tab change and unload; sidebar absent on some tabs.
- Removes: habits' own `<dialog>` and Preact bundle (`habits.view.ts:151-164`), its inline confirm workaround.
- Experiments: Portent panel (type, organized, parent, verbs), Triage panel without modal loops, tasks for the open note, one-on-one topics, habit streak. This is the owner's "properties menu" idea: the type dropdown inside `PropertiesView.svelte:169-201` is hardcoded to types, so a section beats a menu item.
- Tier B. Prototype as a mod: partly. `[data-right-sidebar]` exists (`AppShell.svelte:274`); appending a div after its `ScrollArea` is inferred to survive re-renders but I did not run it.

## 9. Post-save and active-note events
```ts
on(e: 'note-saved', fn: (p: { path: string }) => void): () => void;   // never 'edit'
on(e: 'active-note-changed', fn: (p: { path: string | null }) => void): () => void;
```
- Cost M. Files: wrap `addAfterSaveObserver` (`core/editor/editor.hooks.ts:52`), host, contract and test. The registry already exists and is used by auto-move, search and file-history.
- Layers hold, no new core code beyond a plugin-side subscription.
- Risks (concrete): observers run synchronously inside `notifyAfterSave` (`editor.hooks.ts:67-90`), try/catch per observer, so a slow mod stalls the save path; queue the mod callback with `queueMicrotask` or a timer and never await it. Mods write with `ctx.vault.write`, which itself calls `notifyAfterSave` (`mod-vault.service.ts:111`): a mod that writes in its own handler loops forever, so drop events whose path the same mod wrote in the last N ms. `applyNoteChange` stays the sole owner (indexing rule 6, `save` must stay synchronous), so hooks add no writer. Mod data files skip it (`:109`).
- Removes: polling and "run it by hand" automations. No mod hack today (no mod asks for it).
- Experiments: auto-tag on save, copy `_organized` into a property, weekly report on save, habit log.
- Tier B (post-save only), C for any edit-source hook. Prototype as a mod: crude, poll `vaultStore.vaultIndexVersion` and `editorStore.activeTabPath` with `setInterval` and `ctx.signal`; lags about 2 s (`tauri-listeners.service.ts:105`). Good enough to learn whether any mod wants it before building it.

## 10. Rail button state (badge and busy)
- Cost S. `RailAction` has `busy` but no count (`rail-shell.types.ts:202-215`); `Rail.svelte:143-183` builds rows with `count: 0` for actions and `:373` shows the pill when `count > 0`. Add `badge?: () => number` and a `ctx` setter. Files: `rail-shell.types.ts`, `Rail.svelte:143-183`, `mods-host.service.ts:344-351`, contract and test.
- Layers hold. Risks: a getter read in the rail's derived list; cheap. Removes: focus-timer's invisible running state and part of the status chip need. Experiments: blocks today or inbox count on a button. Tier A (small, low value). Prototype as a mod: no.

## 11. Mod-owned rail note-list lens (the owner's idea)
- Cost M to L, and more than the scouts said. `registerLensProvider` (`rail-registry.store.svelte.ts:55-60`) only resolves a kind; a lens is picked by a navigator's `lens()` (`rail-shell.types.ts:175-186`) whose `component` is a Svelte `Component`, which a mod cannot supply. A mod lens needs a host-owned generic navigator row too.
- Risks: `resolve` runs inside `$derived.by` with no try/catch (`RailNoteList.svelte:177-190`, `lens.logic.ts:426-436`), re-runs on `entriesVersion`, and a throw or sync loop freezes or blanks the main list. Registration replaces by kind silently (`:55-56`).
- Tier C. Prototype as a mod: no. Build only after sections 2 to 5 exist and a mod proves it needs a list.

## 12. Other C items (do not schedule)
- Mod-owned editor tab or view (`EditorTab.fileType` is a closed union, `core/editor/editor.types.ts:12`, from a scout, not re-read), CodeMirror extensions and code-block processors: run on every keystroke and break Live Preview invariants (`live-preview-rules.md`). The owner already has QueryJS blocks.
- User-remappable hotkeys UI: only the hotkeys mod asks. Declared defaults (section 6) first.
- Host-paced batch write (`ctx.vault.updateMany`): bulk-tag copies core pacing constants (`bulk-tag.service.ts:16-21`, core `tauri-listeners.service.ts:109,116,273`). It is a core write-path change; rank below the owner's rule against core changes for rare cases, unless a second bulk mod appears.

## Recommended order
1. Facade (1) and palette (2) in parallel, they share nothing. 2. `pick`/`pickNote` (5). 3. Status item (4) and badge (10). 4. Menus (3). 5. Hotkeys (6) after the palette. 6. Settings (7). 7. Sidebar section (8). 8. Events (9) only if the polling spike shows demand. 9. Lens (11) and the rest stay out.
Ledger overlap: 08, 09, 10, 12, 13 are todo (`.scratch/vault-mods/ledger.md`), none covers these entry points; PRD already lists palette and note action bar as "Later" and P5 says later entry points reuse the same actions (`PRD.md`).

## Which core features could move to mods later (line counts only, parity not verified)
- word-count (66 lines, reads `editorStore.activeTab.content` at `WordCount.svelte:12-18`): needs 4 + an active-note read.
- table-of-contents (238 lines): needs 8.
- templates picker (309 lines) and the Cmd+N composer (`global-keybindings.ts:150`; note-composer files): need 2, 5, 6. Quick Capture's global shortcut and clipboard capture are Rust-side (`quick-capture.service.ts:11-30`), so they stay core.
- 1:1 and periodic notes (554 and 474 lines): partly mods already; need 2 and 6.
- Kanban (2923 lines), meta-bind (core Live Preview widgets), canvas and tables: need views, tabs or CodeMirror, tier C. They do not move.

## Refuted scout claims
- "The rail note list is not virtualized" (portent scout): false, `VList` at `RailNoteList.svelte:823,888`, and one menu wraps the list.
- "folderCreators needs near-zero core change" (focus-timer, tasks scouts): only for "New file" items. `icon` is a Svelte `Component` and `create` returns a file path (`rail-shell.types.ts:218-230`; menu `FilesNavigator.svelte:88-98,346-351`). Folder actions need a new registry; only the shape and disposal carry over.
- "A data-only lens provider is enough" (several scouts): false, a navigator must select the lens (section 11).
- "9 of 12" vs "10 of 12" mods use `ctx.app`: 9 directly by grep, 10 counting focus-timer via shared code.
- Scouts "one-on-one" and "daily-log, hf-scout and playground" returned test payloads with no content. Those four mods have no scout evidence, only the greps above.
- "CLAUDE.md core-to-features violation list is stale": `layer-baseline.json` has only 3 `utils/` entries; true, but irrelevant to this plan.

## Could not verify
- `habits.view.ts:105,151-164` inert-confirm and `<dialog>` hack (cited from scouts), `MarkdownEditor.svelte` context menu, `TypesNavigator.svelte:239-246`, `EditorTab.fileType` union.
- Whether `ModActionPicker` shows a run view for a synthetic non-rail button key (section 2).
- Portent's `_organized: false` bug (only set with `explicitOrganization`) and vault-health's `ctx.kb` lag after a save: not tested.
- Whether Radix `ContextMenu.Content` mounts items lazily (assumed from the single `{#if contextTarget}`), and the sidebar-DOM-injection spike. Nothing was run, built or tested; no vault notes were read.
