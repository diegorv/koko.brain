# Draft plan: mod entry points, priority MAXIMUM FREEDOM

Shorthand: `host` = `src/lib/plugins/mods/mods-host.service.ts`, `contract` = `src/lib/plugins/mods/contract/mod-api.v1.ts`, `MOD_APP` = `src/lib/plugins/mods/mod-app.service.ts:23-53`. Mods repo = `kokobrain-mods-src`. Cites marked (R) come from a validated research report and were not re-read; all others were read in this pass. Nothing was run.

## Thesis

Mods need four things to try an idea with no core change. Reach: be started from anywhere. Render: draw anywhere. Act: read, write and react. Editor: change the editor. Today each axis is one narrow door. Spend core cost once on one primitive per axis, so that each later surface is one field or one word.

- **Reach primitive:** one action, many origins. A surface is an optional field on `ModActionV1`, so moving an experiment from the rail to a hotkey or a menu is a one-line edit in the mod.
- **Render primitive:** one `ModMount` container, used by sidebar, tab and rail pane. Moving a panel from sidebar to tab is one word.
- **Act primitive:** widen raw `ctx.app` first, and freeze a contract only for what real mods keep calling. Raw is unstable but costs one line (`mod-app.service.ts:20-21`), and every contract member is frozen for good (`contract:15-17`).
- **Editor primitive:** one raw seam (a compartment plus the host's CodeMirror classes), with no contract.
- **Safety rule, kept everywhere but Issue 07:** mod code runs at event time, never inside a `$derived`, template or effect body that the host re-runs. Issue 07 breaks this on purpose, is raw, and goes through the Labs switch.

## Facts the plan rests on

- Entry today: `addAction`, `addRailButton` only (`contract:303,305`). Actions sit in a per-mod map (`host:118`). `openPicker` already runs one action or opens its text field under a free-string key (`host:256-275`).
- `runAction` calls `showRun` before mod code (`host:223`), and the run view takes focus (`ModActionPicker.svelte:39-42`). A quiet run closes itself only when it ends (`mods.logic.ts:133`, `ModActionPicker.svelte:51`). Rail clicks can live with this. A hotkey pressed while typing cannot.
- `app/` may import anything (`scripts/import-graph.mjs:162`), and `plugins/mods` may import core and features (`host:9`). A registry goes in `core/` or `features/` only when a non-app file reads it. The baseline stays at 3 entries.
- Reload is unload then load (`host:560-568`). A tab survives it if the tab does not depend on the registration, since tabs are plain store entries (`tasks.service.ts:163-176`).
- `editorModeEffects` runs on tab revisit and on mode change (`MarkdownEditor.svelte:239,657`, `editor-extensions.ts:115-124`), and `livePreviewCompartment` is a module-level compartment (`live-preview.ts:38`). A second one reaches every saved per-tab state with no new tab-switch work.
- A rail item that picks a list needs a navigator plus a lens provider; calendar does exactly this (`calendar-rail.service.ts:26-33`). The provider's `resolve` runs in `$derived.by` (`RailNoteList.svelte:177-190`) with no try/catch (`lens.logic.ts:434`), so it must stay host code.

## Issues, in order

Dependencies are in each heading. All edit `host` and `contract`, so run them one at a time. Create them in `.scratch/mods-extension-points/issues/`.

### 01. Widen raw `ctx.app` for events, paths and tab-aware saves (blocked by: none)
**Scope:** add unstable `MOD_APP` members so real mods can test Act before any freeze: `addAfterSaveObserver` (`editor.hooks.ts:52`), `registerPathChangeConsumer` (`path-change.service.ts:73`), `renameItem`, `moveItem`, `deleteItem` (`fs.service.ts:280,307,246`), `syncExternalContentToEditor`, `saveFileByPath` (`editor.service.ts:71,171`), `railRegistryStore`. Docs table in `28-mods.md`.
**API:** `ctx.register(ctx.app.addAfterSaveObserver(fn))`. **Files, size:** `mod-app.service.ts`, `28-mods.md`, `shared/types.ts` in the mods repo. XS.
**Removes:** nothing yet; 12 and 13 use it to shrink. **Unlocks:** auto-tag on save, archive-by-move, rename-safe indexes, read-modify-write on an open note, this week.
**Risk:** a raw observer runs inside the sync loop of `notifyAfterSave` (`editor.hooks.ts:85-91`), so a slow one delays the rest and a write in it can loop. Accepted: raw has no promise and teaches what 12 must guard. Path changes must use these calls, not plugin-fs (indexing rule 6).
**Test:** host test: a mod registers through `ctx.app`, a save reaches it, unload removes it.

### 02. One action, every origin: palette rows, `run.target`, lazy run view (blocked by: none)
**Scope:** split a host kernel `invoke(action, origin, target)` out of `openPicker`, with a busy guard and a `runtime.unloaded` check. Every action gets a palette row by default. `run.target` says what the action acts on: the clicked thing, else the active note. Non-rail origins reveal the run view only at the first `log` or `progress`, so a quick action never takes focus. Failures still toast (`host:242`).
**API:** `ModActionV1.palette?: boolean` (default true); `ModRunV1.target: ModTargetV1 | null`, where `ModTargetV1 = { surface: 'active' | 'note'; path; title; kind } | { surface: 'folder'; path }`, paths vault-relative via `getRelativePath` (`fs.logic.ts:265`); `ctx.actions.run(modId, actionId, input?)`.
**Files, size:** new `features/command-palette/command-registry.store.svelte.ts` (copy `rail-registry.store.svelte.ts:46-84`), `app/commands.ts:93` (rows read inside `getBuiltInCommands`, like `:56-66`), `host:204-275,295-322`, `contract:51-81`, `mod-api-contract.test.ts:254,269`, `28-mods.md`. M.
**Removes:** rail-only reach of all 25 `addAction` sites (R); portent's "Open a note first" (`portent.service.ts:18-20`). **Unlocks:** new action testable with no button, palette-first Portent, macro mods calling other mods.
**Risk:** palette noise (opt out with `palette: false`). A long quiet run from the palette shows no Stop and no busy mark until a second invoke opens it. Palette closing while a picker opens for an `input` action is an unverified focus handoff. `ctx.actions.run` recursion stops at the busy key.
**Test:** store test (identity unregister, replace); host tests (row gone after unload, one row after reload, busy shows the run, target is the active note, no `runKey` before the first log); `commands.test.ts:505-546` style; a mounted `AppOverlays` test that a registration changes the list; E2E: Cmd+P, pick row, assert the toast text.

### 03. `ModMount` plus right sidebar sections and the active note (blocked by: none)
**Scope:** the one place mod DOM enters the app: an empty `div`, `mount` in try/catch under `untrack`, an inline error on throw, signal abort, cleanup and emptying on teardown, `{#key entry}` so a reload remounts the new code. Sidebar is the first placement. A mod follows the note by subscribing, so mount stays stable across note changes.
**API:** `ctx.addView({ id, title, place: 'sidebar', mount: (el, view: { signal }) => void | (() => void) })`; `ctx.workspace.activeNote(): { path } | null`; `ctx.workspace.onActiveNoteChange(cb)`.
**Files, size:** new `plugins/mods/ModMount.svelte`, `ModSidebarSections.svelte` (on `core/layout/SidebarSection.svelte`), `mod-views.store.svelte.ts`; `app/AppShell.svelte:290`; `host`, watcher pattern from `mod-theme.svelte.ts:50-62`; `contract`; docs. M to L, paid once.
**Removes:** habits' own `<dialog>` (`habits.view.ts:151-165`) and its inline confirm (R). **Unlocks:** Portent panel, triage panel, tasks of this note, the owner's "properties panel" idea with more room than a menu.
**Risk:** the sidebar is hidden on some tabs (`layout.logic.ts:15-28`) and re-created by `{#if rightSidebarShown}` (R `AppShell.svelte:264`), so `mount` re-runs and mod state must live outside the DOM. A sync loop in `mount` still freezes. The app's CSS reset leaks into mod DOM (R). The watcher reads `activeTabPath` only (`editor.store.svelte.ts:39`), never content.
**Test:** `ModMount` component test (mount, throw shows error, destroy aborts and cleans, replaced entry remounts); host test (gone after unload); E2E: section text follows a tab switch.

### 04. Context menus: `menu` on the action, note rows and folders (blocked by: 02)
**Scope:** declare `menu` on an action; the row or folder right-clicked becomes `run.target`. Items append after built-ins, which stay hard-coded. `when` runs once on the `contextmenu` event into a `$state.raw` snapshot, so nothing runs in the virtualized list.
**API:** `ModActionV1.menu?: { surfaces: ('note' | 'folder')[]; when?: (target: ModTargetV1) => boolean }`.
**Files, size:** new `core/context-menu/menu-contributions.store.svelte.ts`, `.logic.ts` (`when` in try/catch, `=== true`), `ContributedMenuItems.svelte`; `NoteRowMenu.svelte:43,211-271`; `FilesNavigator.svelte:316-322,343-395` (R); `host`, `contract`. M. In core from the start because 14 needs core consumers.
**Removes:** bulk-tag's typed folder (`bulk-tag.service.ts:45-48`, R), active-tab dependence for right-clicked notes. **Unlocks:** right-click Organize, Archive, Tag all here, New PRD here, Check this note.
**Risk:** `.canvas`, `.view`, PDF rows appear; the guard at `NoteRowMenu.svelte:245-255` covers built-ins only, so `kind` is on the target. A menu open during unload: `invoke` checks `unloaded`. A prompt opened as the menu closes may lose focus (unverified, `context-menu-content.svelte:12-17`, R).
**Test:** with zero items `NoteRowMenu.test.ts:285-294` and `FilesNavigator.menu.test.ts` stay green; real registry; a throwing `when` hides one item; relative path reaches `run`; root folder is `''`; E2E: right-click a row, pick item, assert rendered result.

### 05. Mod tab: `place: 'tab'` and `ctx.workspace.openView` (blocked by: 03)
**Scope:** full-size mod UI in the main area, the singleton virtual-tab shape of Tasks. Path `__virtual__/mod/<modId>/<viewId>`. The tab outlives a reload: unload shows a placeholder, the re-registered entry remounts through `{#key entry}`, so saving `main.js` is hot reload. A mod switched off leaves a closable placeholder.
**API:** `ctx.addView({ id, title, place: 'tab', mount })`; `ctx.workspace.openView(id)`.
**Files, size:** `core/editor/editor.types.ts:12` (`'mod'`), `core/layout/layout.logic.ts:22-28` (prefix rule), `app/EditorView.svelte` (one branch), `host`, `contract`. M. Virtual tabs already skip saves (`editor.service.ts:189`).
**Removes:** report notes as the only big output (`vault-health/health.service.ts:20-22`, R); habits could pick tab over sidebar. **Unlocks:** the class of ideas that today means core work: dashboards, review queues, board variants, an agent console. The core features the value report lists as tab-bound could then be tried as mods.
**Risk:** `EditorView` renders one branch, so a tab switch destroys the DOM; mod memory survives in its closure, DOM state does not. New union member: `pnpm check` finds exhaustive uses. No tab persistence found by grep, so nothing restores a mod tab at boot.
**Test:** `EditorView.test.ts` branch, layout test, host test (openView twice is one tab, unknown id rejects); E2E: open, assert text, rewrite `main.js`, assert the new text in the same tab.

### 06. Rail item: push list with optional pane (blocked by: 03 for the pane only)
**Scope:** the owner's "changes the rail shell's own list". A mod adds a picked rail item whose note list it fills by `setList`. Host-owned navigator plus provider, as calendar. The list reuses sort, search, pills, groups and row menus. Go to command and Settings > Layout come free (`rail-items.logic.ts:45`, `commands.ts:56-66`).
**API:** `ctx.addRailItem({ id, title, icon, rule?, pane?: mount }) => { setList(items | { groups: [{ id, label, items }] }), dispose }`, where an item is `path | { path, subtitle }`.
**Files, size:** `rail-shell.types.ts:175-186` (`icon: Component | string`, `component?`), `AppShell.svelte:115-117,213-214`, `Rail.svelte:337`, `lens.logic.ts:280` (export a paths-to-notes helper over `toLensNote`), `host`, `contract`. M. Also one docs paragraph: a mod-written `_rail: true` `.view` is the free version (R).
**Removes:** vault-health's report note and count toast (R). **Unlocks:** Portent "Needs type / Needs parent / Stale", findings as a list, session logs.
**Risk:** a saved mod pick shows Today until the mod loads and flips on each reload (`lens.logic.ts:206`, derived at `AppShell.svelte:104-111`); recovers unless clicked meanwhile. Staleness is the mod's job, fed by 01 or 12. Unknown paths drop.
**Test:** logic test for path mapping and groups; host test (both unregisters run, key `mod:<id>:<id>`); E2E: click item, assert row titles, `setList` updates them.

### 07. Raw editor seam: `ctx.app.cm`, extensions, completion sources (blocked by: none)
**Scope:** one compartment and one composite completion source, no contract. Mods get the host's CodeMirror classes: `MOD_APP` exposes none, mods have no `import` (`mods.logic.ts:243`), and a bundled copy would be a second instance, which CodeMirror rejects (from memory, not checked). Anything fence, decoration, keymap or slash menu becomes a mod experiment.
**API:** `ctx.app.cm = { state, view, language, autocomplete }`; `ctx.app.addEditorExtension(ext) => dispose`; `ctx.app.addCompletionSource(source) => dispose`.
**Files, size:** new plain module `core/markdown-editor/extensions/mod-extensions/registry.ts` (not `.service`, not `.store`, per `markdown-editor-imports.test.ts:15-22`); `editor-extensions.ts:115-145` (`.of` in `createExtensions`, `.reconfigure` in `editorModeEffects`, composite in `override`); `MarkdownEditor.svelte` (subscribe, dispatch once on change); `mod-app.service.ts`. S to M.
**Removes:** the two narrow seams the editor report proposes, and the need to run a `queryjs` block to draw in a note. **Unlocks:** ```habit and ```portent blocks, slash menu, snippets, inline badges, focus mode, typewriter scroll.
**Risk:** the one deliberate hot path: a bad extension hurts typing in meta-bind, tables and every note, and rules 1-5 and 11 of `live-preview-rules.md` become the mod author's job. Mitigation is the Labs switch: unload unregisters and the registry change reconfigures the compartment. Composite returns `null` at once when empty (`override` is asked per character). Unknown fences are also claimed by `codeBlockField` (`SPECIAL_LANGUAGES`, `code-block-field.ts:13`): spike overlap in this Issue, add a claim call only if needed. Namespace imports may grow the bundle: compare `pnpm build`.
**Test:** registry test; real `EditorState`: a fresh state and a saved state after `editorModeEffects` both carry the extension, unregister removes it; existing live-preview tests stay green; E2E: a mod adds a decoration, assert it renders and goes on switch-off.

### 08. `hotkey` on the action, one dispatcher (blocked by: 02)
**Scope:** declared chord, one bubble-phase listener after the built-ins. Skip on `defaultPrevented`, `repeat`, and targets in `[role="dialog"]`. Built-ins and editor keys win with no table. First registered wins between mods, the loser logs.
**API:** `ModActionV1.hotkey?: string` (`'Mod-Shift-j'`), needs Mod or Ctrl, no Alt.
**Files, size:** `utils/keybindings.ts:57-70` (extract `matchesCombo`, add `parseHotkey`), `app/global-keybindings.ts:222-229`, palette row `shortcut`, `host`, `contract`. M.
**Removes:** hotkeys mod's window capture listener (`hotkeys/index.ts:16-19`), typed-twice labels, DOM click (R). **Unlocks:** chords with run view and Stop; speed comparison of chord against rail. Replacing a built-in chord stays possible with a raw capture listener, as today.
**Risk:** `Mod-Shift-u` is taken by the editor (R), so that mod's chord must change. +1 keydown listener, a Map lookup. "Configurable" means the mod re-declares from `saveData` or a setting (Issue 10); no recorder UI.
**Test:** order test (built-in beats mod), guards, reload leaves one entry; E2E: chord runs action, not while a prompt is open.

### 09. `ctx.ui.suggest` (blocked by: none)
**Scope:** fuzzy pick from a list in the app's dialog queue. **API:** `suggest({ title, placeholder?, items: { id, title, description? }[] }) => Promise<item | null>`.
**Files, size:** `contract:192-205`, `mod-dialogs.store.svelte.ts`, `ModDialogHost.svelte`, `host:132-176`. M small (R).
**Removes:** typed types and parents (`triage.service.ts:35-48`, `portent/index.ts:32-38`, R). **Unlocks:** every "pick a note, type or folder" flow.
**Risk:** rows are DOM, so the host caps them (quick switcher caps at 100, R); duplicate ids rejected. **Test:** store and host tests, cancel on unload resolves `null`, E2E pick.

### 10. Declared settings in Labs (blocked by: none)
**Scope:** manifest `settings` fields, form in Labs, `ctx.settings`. Stored in localStorage by vault and mod (R option a). **API:** manifest `settings: [{ key, type: 'text' | 'number' | 'toggle' | 'select', label, default }]`; `ctx.settings.get()`, `.onChange(cb)`.
**Files, size:** `mods.logic.ts:197-216`, new store and `mod-settings.logic.ts`, `ModsStatusList.svelte`, `host`, `contract`. M.
**Removes:** `STALE_DAYS`, `vault/_inbox`, focus lengths as rebuilds (R). **Unlocks:** thresholds and A/B values with no rebuild, configurable chords.
**Risk:** wrong stored type coerces to default. No secrets: plaintext. **Test:** parse errors name the field, coercion, form renders and persists.

### 11. Status bar item (blocked by: none)
**Scope:** text chip with click, host-rendered, so no DOM in the bar. **API:** `ctx.addStatusItem({ id, text, title?, side?, onClick? }) => { setText, setVisible, dispose }`.
**Files, size:** new store and `StatusItems.svelte` in `core/status-bar/`, `app/AppShell.svelte:301-310`, `host`, `contract`. S.
**Removes:** `focus-timer/status-chip.ts:12-26`. **Unlocks:** live counts, countdowns.
**Risk:** divider CSS needs a hidden item to leave the list (`StatusBar.svelte:24-33`). **Test:** store, render without stray divider, disposal.

### 12. `ctx.on`: guarded note events (blocked by: 01, evidence from a mod using it)
**Scope:** one host dispatcher that freezes what raw use proved: macrotask delivery, per-mod serial queue, coalesce by path, a loop breaker. **API:** `ctx.on('note.saved' | 'note.renamed' | 'note.deleted', handler) => dispose`.
**Files, size:** new `plugins/mods/mod-events.service.ts`, `mod-vault.service.ts:111` (origin tag), `host`, `contract`. M. Core untouched.
**Removes:** raw observers from 01. **Unlocks:** automations safe enough to leave on daily.
**Risk:** loop through `updateNoteFrontmatter` has no origin, so the breaker is the real guard; its threshold is unmeasured (R). `vault.create` emits no event, do not add one to core. **Test:** bursts coalesce, breaker drops and toasts, slow handler does not delay built-in observers.

### 13. Data contract: `vault.process`, `updateFrontmatter`, `rename`, `delete` (blocked by: 01, evidence)
**Scope:** freeze the tab-aware writers mods proved through raw. `process` works on dirty tabs (R table). No new core behavior. **API:** `process(path, fn)`, `updateFrontmatter(path, fn)`, `rename(from, to)`, `delete(path)` on `ModVaultV1`.
**Files, size:** `mod-vault.service.ts`, `contract:113-132`, docs. M.
**Removes:** `shared/editor.ts:24-40`, one-on-one's retry loop, raw frontmatter in 3 mods, copied error table (R). **Unlocks:** stable mod tests, fewer breaks on app changes. Adds no new capability over 01, hence its rank.
**Risk:** `process` edits are not undoable with Cmd+Z (R); `fn` may run twice; two mods on one closed note race. **Test:** real `editorStore`: clean, dirty active, dirty background, no tab.

### 14. Remaining menu surfaces: tab, editor, More menu, property row (blocked by: 04)
**Scope:** each is one more `surfaces` word and one target shape. **API:** `surfaces` gains `'tab' | 'editor' | 'note-more' | 'property'`; targets `{ surface: 'editor'; path; selection }`, `{ surface: 'property'; path; key; value }`.
**Files, size:** `EditorTabs.svelte:51-62,98-109`, `MarkdownEditor.svelte:297-305,729-756`, `NoteActionBar.svelte:191-220`, `PropertyField.svelte:158-164` (R for the first three lines). S to M. More and property use dropdown items, so the renderer needs a second variant.
**Removes:** picker round trips for selection actions. **Unlocks:** the owner's property menu, selection verbs.
**Risk:** the bar's derived runs per keystroke (R `NoteActionBar.svelte:56`): evaluate `when` on menu open only. Property actions must write through `updateNoteFrontmatter`, not the panel. **Test:** per-surface menu tests with zero and one item.

## If only 3 or 6 Issues ship

**3: 01, 02, 03.** Raw Act, every action in the palette with a target, one mount slot. Loses right-click, big UI, mod lists, editor. Every loss is placement or size, except the editor. **6: add 04, 05, 06.** Covers the owner's list except hotkeys and the property menu. Everything left has a working fallback today: 08 the hotkeys mod, 09 chained prompts, 10 constants, 11 the status-chip hack, 12 and 13 raw from 01, 14 sidebar sections. The exception is 07: slash menus and decorations have no fallback, only `queryjs` `kb.view` for drawing (`kb-api.ts:388-430`, R). If the owner cares more about writing than about lists, swap 06 for 07.

## What not to do, and why

- **Generic `ctx.contribute(surface, spec)`:** a union of unrelated shapes loses the per-member freeze test. Fields on the action cover Reach; `addView` covers Render.
- **`when` on palette rows or hotkeys:** puts mod code in the list build; runs fail soft already (R).
- **Pull lens `resolve`, per-row callbacks, row decoration, mod sort or filter:** mod code on a list path. Push `setList`, `subtitle`, and `property:<key>` sort cover the experiments (R).
- **Mod deep links:** PRD says no (`.scratch/vault-mods/PRD.md:90`): outside content must not run vault code.
- **Contract for fences, keymaps or decorations:** raw 07 first. Freeze a fence API only if two mods converge. Note a fence mount is note-triggered code, close to the same PRD line.
- **Rebinding UI:** built and removed once (R `cb0a0b50e`). **Before-save hook, batch write, write pacing:** core write paths (indexing rules 6, 17).
- **Crash guard or safe mode:** renaming the folder already recovers (`28-mods.md` Limits). Rare, core startup code.
- **Multi-select targets, inline bar buttons, value widgets, hub slot, OS-global hotkeys, moving built-in menu items to the registry, declarative view DSL:** large cost, no current mod asks.

## Companion work outside these Issues

- Mods repo, before 02: `recordRegistrations` records only actions and rail buttons, and the Proxy stub silently accepts anything else (`scripts/mod-loader.ts:28-60`). New members would pass its smoke test unseen. Add `pnpm new <id>` (R).
- Ledger: 08 `ctx.http` is orthogonal and high on freedom (any API, MCP); run it whenever. 12 matters more as surfaces grow, unchanged in scope.

## Owner decisions before launching

1. Palette default on (25 new rows) or opt-in. Recommend on. 2. Accept 07's typing-path risk for raw power, or take the two narrow seams. Recommend raw. 3. Settings in localStorage, not in the vault. 4. `process` edits outside Cmd+Z history. 5. Menu items flat after a separator. Recommend flat.

## Disagreements with the research reports

- **views-and-settings** ranks the mod tab Tier C for its "worst reload story". Keeping the tab through reload and remounting on `{#key entry}` turns it into the best one. Top 6 here, since it is the only surface for ideas that do not fit a sidebar.
- **editor** says keep CodeMirror raw with no hook, and build narrow E1 and E2. Its objections are per-tab states, persisted decorator names and hot path. `editorModeEffects` solves the first, raw extensions skip the kill-switch tuple, and the hot path is accepted under this priority. One seam costs less than the two it replaces.
- **context-menus** proposes a separate `addMenuItem`; **contract-and-host** per-surface APIs. I put placement on the action: PRD P5 says later entry points reuse actions (`PRD.md:49`), and one action then works from row, palette and chord with one `run.target`. Registries stay per surface inside the host, as both reports say.
- **contract-and-host** wants palette opt-in and calls the prop non-reactive. Default on gives reach with no edit; `commands.ts:50-55` documents that the prop re-runs. I require a mounted test instead of a change to `AppOverlays`.
- **palette-hotkeys, context-menus** route through `runAction` as is. `showRun` before mod code takes focus; lazy reveal is required (Issue 02).
- **value-and-experiments, data-api, contract-and-host** rank the stable facade first. It adds no capability over raw; bug removal is second here, so it comes after real use (13).
- **events-background** rates a mod deep link Tier B. PRD line 90 rejects it.
- **rail-note-list** caps `paths`. No cap: built-in lenses already list every note, and rows are virtual.
- **right-sidebar** puts the section registry in `core/`. `app/` may import plugins, so it stays in `plugins/mods` (views report is right).

## Not verified

Nothing was run. Open points: a palette and picker focus handoff; focus after a menu closes into a prompt; mod DOM inside `ScrollArea` and shadow DOM isolation; `codeBlockField` overlap with a mod's fence decoration; bundle growth from CodeMirror namespace imports; whether a thrown `StateField.update` from a mod breaks typing (only `ViewPlugin` deactivation is cited, R); tab persistence beyond a grep; Linux `Mod` mapping; `toLensNote` being enough for non-markdown paths (first version lists entries only). Line cites marked (R) were not re-read here.
