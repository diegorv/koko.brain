# V2: Rail shell, modals and UI entry points (opus validator)

Theme: where a vault mod could plug into the UI (first: a rail button that opens a modal action picker), and what the codebase already offers.

**Scout status:** none of the five scout reports exist. `.scratch/vault-mods/research/haiku/` holds only S01, S02, S03, S05, S15, S18 (checked with `ls` on 2026-11-05). S06, S07, S08, S09 and S10 died, so every question below is answered here straight from the code. Nothing was refuted because there were no claims to refute. The corrections section covers wrong assumptions in the task's own questions.

All paths are relative to `src/lib/` unless they say otherwise.

---

## 1. Verified facts (file:line)

### 1.1 Rail registry (S06)

- `features/rail-shell/rail-registry.store.svelte.ts:14-20` holds four `$state.raw` lists: `navigators`, `lensProviders`, `todaySections` and `folderCreators`. **The rail has no generic "button" or "action" registration.** You can register a navigator panel, a lens provider, a Today section or a Files folder-menu creator, and nothing else.
- `register*` (`:41-70`) replaces any entry with the same id and returns an unregister closure that matches by identity. `$state.raw` is a requirement: a deep proxy would break the `!==` identity check (`:8-10`).
- `reset()` (`:73-78`) has no caller in `src/lib` outside the store itself. Teardown goes through each registration's unregister closure.
- **Runtime registration already happens.** `app/lifecycle/app-lifecycle.service.ts:247-264` calls `registerCalendarRail()`, `registerKanbanFolderCreator()`, `registerOneOnOneTodaySection()` and `registerOneOnOneActionBarAction()` during `initializeVault` step 2, after `open_vault_db` (`:234`) and before the index build (`:316`). The closures are stored in `unregisterNoteChangeConsumers`. They run in `teardownVault` (`:538`, `:571-572`) and at the start of a re-init (`:160-161`).
- The `RailNavigator` shape (`features/rail-shell/rail-shell.types.ts:175-186`) is `{ id, label, icon: Component, component: Component, lens: () => Lens }`. Every field is required, and `icon` is a **Svelte component**, not a string.
- The rail item model (`features/rail-shell/rail-items.logic.ts:5-19`) is `RailItem { key, label, group: 'top'|'navigator'|'pinned'|'bottom', navigator?, pin? }`.
- `railItems()` (`rail-items.logic.ts:30-60`) hardcodes the built-in items: Search, Inbox, Today and Favorites in `top`; Types, the registered navigators and Files in `navigator`; Archive in `bottom`. Pins sit between `navigator` and `bottom`. Registered navigators always land between Types and Files (`:44`).
- **Persistence:**
  - `layout.railItem`, `layout.railHidden` and `layout.railOrder` are typed at `core/settings/settings.types.ts:55,81,86`, with defaults at `core/settings/settings.store.svelte.ts:54,59,60`.
  - They live in `<vault>/.kokobrain/settings.json` (`core/settings/settings.service.ts:13-18`), so they are per vault.
  - `arrangeRailGroups` (`rail-items.logic.ts:70-81`) ignores keys it does not know, so a stale mod key in `railOrder` or `railHidden` does no harm.
  - Pins never come from settings: `pinnedRailItems` (`features/rail-shell/lens.logic.ts:218-238`) derives them from `_rail: true` in the frontmatter of `.view` files and type definitions, ordered by `_order`.
- Settings > Layout (`features/rail-shell/LayoutSection.svelte:35`) builds its hide/order list from `railItems(railRegistryStore.navigators, [], [], ...)`, so registered navigators get hide and reorder rows for free.

### 1.2 Rail rendering and click path (S07)

- `Rail.svelte` is mounted in `app/AppShell.svelte:201-204` with `onSelect={(key, pin) => selectRailItem({ key, pin })}`. `AppShell` renders it only while `vaultStore.isOpen` (`:184-186`).
- **Icons:**
  - Built-in items take lucide Svelte components from `BUILT_IN_ICONS` (`Rail.svelte:47-55`).
  - A navigator brings its own `icon` component (`:119`).
  - A pin is drawn through `IconRenderer` from `resolveIconForPath(pin.path)`, with a `Table`/`FileText` fallback (`:141-156`). That path takes string icon refs (`pack:name`) from 12 packs (`features/file-icons/file-icons.types.ts:2-14`) and renders sanitized SVG (`features/file-icons/IconRenderer.svelte:22-37`, DOMPurify in `utils/sanitize.ts:38-51`).
- Tooltips are the native `title` attribute. `Rail.svelte:122-123` sets `title` and `aria-label` to `item.label`, and no tooltip component is used, although `components/ui/tooltip` exists.
- The active state is `item.key === activeItem` (`Rail.svelte:118`), styled by `buttonClass` (`:78-82`). The only badge in the rail is Inbox's (`:129-134`).
- **Click semantics:** `railButton` calls `onSelect(item.key)` (`Rail.svelte:126`), which reaches `app/rail-navigation.ts:14-24`:
  - Search runs `openSearch()`.
  - A pin with `_open_in_editor` runs `openFileInEditor`.
  - **Every other key runs `settingsStore.updateLayout({ railItem: key, railPanelsVisible: true })`**, which persists the key as the active lens item.
  - `restoreRailItem` (`features/rail-shell/lens.logic.ts:188-207`) maps a key it does not know to `DEFAULT_RAIL_ITEM`/`TODAY_LENS` (`:206`).
- Rail items also become "Go to <label>" palette commands: `app/commands.ts:56-66` maps every `railItems(...)` entry to `selectRailItem(item)`.

### 1.3 Modals and dialogs (S08)

- **There is no central dialog or overlay store.** Each picker owns a tiny store with an `isOpen` flag and is mounted once in `app/AppOverlays.svelte:12-18`: Toaster, SettingsPanel, QuickSwitcher, CommandPalette, TemplatePicker, OneOnOnePicker and FileHistoryDialog. `AppOverlays` is mounted in `routes/(app)/+layout.svelte:183` outside `AppShell`, so it exists even before a vault opens.
- **The pattern to reuse ("service opens a store-driven global picker"):**
  - The store is `plugins/one-on-one/one-on-one.store.svelte.ts:3-26`: `isOpen`, the data list, `open/close/toggle/set*/reset`.
  - The component is `plugins/one-on-one/OneOnOnePicker.svelte:38-80`: `Command.Dialog open={store.isOpen} onOpenChange shouldFilter={false}`, grouped `Command.Item`s, and an `onSelect` that closes the picker, then awaits the service and toasts on failure (`:26-35`).
- **A two-step picker already exists** in `plugins/templates/TemplatePicker.svelte:18-113`: step one picks an item, step two collects a text input (`isNamingStep`) and confirms on Enter. This is the closest match for "pick an action, then fill an input".
- `Command.Dialog` (`components/ui/command/command-dialog.svelte:26-40`) wraps the shadcn `Dialog.Root` and bits-ui `Command`. A generic form dialog with a validated input is in `features/type-definitions/TypeNameDialog.svelte:6-60`, controlled by props with `bind:open` and mounted locally (`features/rail-shell/TypesNavigator.svelte:464,486`).
- Native confirm dialogs use `ask` from `@tauri-apps/plugin-dialog` (`core/filesystem/delete-note.service.ts:1,14`, `core/editor/editor.service.ts:2,313`).
- Event-calendar dialogs open through a view store, `eventCalendarViewStore.openDialog` (`features/event-calendar/event-calendar.service.ts:277-289`). They are mounted inside `EventCalendarView.svelte:262-263`, so they only exist while that tab renders.

### 1.4 Command palette and keybindings (S09)

- `AppCommand` is `{ id, label, category, shortcut?, action: () => void | Promise<void> }` (`features/command-palette/command-palette.types.ts:1-7`).
- **There is no command registry.** The palette receives `commands={getBuiltInCommands()}` as a prop expression (`app/AppOverlays.svelte:15`). `getBuiltInCommands` (`app/commands.ts:93-374`) returns a literal array plus `railGoToCommands()` and `openViewCommands()`.
- The list follows reactive state because the prop expression reads stores while it builds (`app/commands.ts:51-55`). INFERRED: a mod-commands store read inside `getBuiltInCommands` would make mod commands appear and disappear reactively, the same way the Go to commands do.
- `CommandPalette.svelte:27-37` (`executeCommand`) records the command as recent, closes the palette, awaits `action()`, and on a throw logs it and toasts `Command "<label>" failed.`
- Recent command ids go to `localStorage` under the key `kokobrain:recent-commands` (`features/command-palette/command-palette.store.svelte.ts:1,9-16`). That key is **not per vault**.
- **Keybindings:**
  - `app/global-keybindings.ts:62-203` defines a static `GLOBAL_KEYBINDINGS` array.
  - `registerGlobalKeybindings` (`:222-229`) runs once from `routes/(app)/+layout.svelte:41-43` and is app-lifetime, not vault-lifetime.
  - `shortcutFor(commandId)` (`:211-216`) throws when no binding names the command.
  - `utils/keybindings.ts:57-80` (`registerKeybinding`) adds one `document` keydown listener per binding. It does no conflict detection, does not check whether a dialog or input has focus, and calls `preventDefault()` on every match.

### 1.5 Other entry points (S10)

- **Note action bar:**
  - `features/note-action-bar/note-action-bar-actions.store.svelte.ts:11-33` exposes `register(action)` and `reset()`.
  - `NoteHubAction` is `{ id, label, typeName, run(path) }` (`features/note-action-bar/note-action-bar.logic.ts:43-52`).
  - `resolveHubAction` (`:65-74`) picks **one** action, the first registered for the note's `typeName`, and uses it for the bar's single hub button (`NoteActionBar.svelte:65-74`).
  - The only registrant is `plugins/one-on-one/one-on-one.service.ts:106`.
  - The More menu (`NoteActionBar.svelte:188-216`) has a hardcoded list.
- **Meta-bind buttons:**
  - The widget is `core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts`. A click runs `getButtonActions(config)` in sequence and stops on the first `false` (`:33-40`).
  - `executeButtonAction` (`:95-137`) is a closed `switch` over `ButtonAction = UpdateMetadataAction | OpenAction | CreateNoteAction | OpenViewAction` (`meta-bind-button.logic.ts:43`).
  - Side effects go through the `editorHost` CodeMirror facet (`core/markdown-editor/editor-host.ts:36-66,93`), which is implemented in `app/editor-host.ts:125,148`. That facet is the existing seam a new button action type would go through.
- **Deep links:**
  - `features/deep-link/deep-link.logic.ts:25` fixes the action set with `VALID_ACTIONS = {'open','new','search','daily','capture'}`.
  - The dispatcher (`features/deep-link/deep-link.service.ts:182-216`, `executeAction`) is a closed switch.
  - `daily` and `capture` go through `registerDeepLinkAction` (`:56-66`), typed to `RegisteredDeepLinkActionType = 'daily' | 'capture'` (`:39`), and registered in `app/deep-link-actions.ts:227-235` from `app/boot.ts:54`.
  - `resolveAndDispatch` (`deep-link.service.ts:153-174`) **switches vaults** when a link names another vault, then runs the action as pending.
- **Quick Capture:**
  - `plugins/quick-capture/quick-capture.service.ts:51-82` listens to the Rust `qc:capture-detected` event and routes it into the deep-link `executeAction` pipeline (`:5`).
  - It has no registration point. It is a capture source, not an extension point.
- **App events** (outside this theme, listed for the PRD):
  - `addAfterSaveObserver` (`core/editor/editor.hooks.ts:52-60`)
  - `registerNoteChangeConsumer` (`core/filesystem/note-change.service.ts:104`)
  - `registerPathChangeConsumer` (`core/filesystem/path-change.service.ts:73`)

### 1.6 Layering

- The ADR-0003 ratchet (`src/tests/lib/architecture/layer-rules.test.ts`) flags `core->features`, `core->plugins` and `features->plugins` (`:111-126`), and `plugins->plugins` except a periodic-notes allowlist (`:121,146-148`).
- It allows `features->features` (`:140`) and exempts `app/` (`:154-159`). Only `src/routes` may import `app/` (`:166`).

---

## 2. Refuted or corrected claims

No scout claims exist to refute (all five reports are missing). These are corrections to assumptions in the task and the questions:

1. **"core/keybindings" does not exist.** `ls src/lib/core` lists editor, filesystem, frontmatter, layout, markdown-editor, note-creator, settings, status-bar, trash, vault and zoom. The keybinding helper is `utils/keybindings.ts`, and the bindings are in `app/global-keybindings.ts`. The root CLAUDE.md project structure also lists `keybindings` and `app-lifecycle` under `core/`. That list is stale: lifecycle lives in `app/lifecycle/`.
2. **"Items registered in the rail" is narrower than it sounds.** The only rail-button-producing registration is `registerNavigator`, and a navigator is a **panel plus lens**, not a button that runs an action (`rail-shell.types.ts:175-186`). A mod button cannot reuse it as-is: the click persists `railItem` (`rail-navigation.ts:23`) and opens a navigator pane (`AppShell.svelte:116-118,214-215`).
3. **A "central dialog/overlay store" does not exist** (§1.3). Each overlay owns its own store and its own mount in `AppOverlays.svelte`.
4. **Rail icons are not "lucide or arbitrary SVG".** Built-ins and navigators take a Svelte `Component`, and pins take string icon refs resolved through the file-icons packs. Arbitrary SVG is accepted nowhere in the rail. `IconRenderer` sanitizes pack SVG, but the rail never passes it user-authored markup.

---

## 3. Answers to the scouts' open questions

**S06. Can non-built-in code add a rail item at runtime? What does an item need? How are pins and order persisted?**
Yes, but only as a navigator, through `railRegistryStore.registerNavigator` (§1.1). That takes `{id, label, icon: Component, component: Component, lens}`. Plugins register at vault open and unregister at teardown. Order and visibility live in `layout.railOrder` and `layout.railHidden` in the vault's `.kokobrain/settings.json`, and Settings > Layout edits them. Pins come from `_rail: true` frontmatter and sort by `_order`, so they are never stored in settings. A mod action button needs a **new** registration kind; see §5.

**S07. How does a mod button plug in?**
`Rail.svelte` has no slot for an action item. A mod button needs all of the following:
- A new `RailItemGroup` (or a separate list) in `railItems`.
- A render branch in `Rail.svelte` whose `onclick` opens a modal **without** calling `onSelect`. Calling `onSelect` would persist `railItem`, then fall back to Today on restore.
- An icon path. INFERRED best fit: a manifest string `pack:name` resolved with `parseIconValuePermissive` (`features/file-icons/file-icons.logic.ts:41-48`) and `getIconSync` (`features/file-icons/file-icons.icon-data.ts:306`), rendered through `IconRenderer` like a pin, with a fallback icon. Mods then never ship SVG or components.

**S08. What should a mod action picker reuse?**
The OneOnOnePicker/TemplatePicker pattern: a `Command.Dialog` mounted once in `AppOverlays.svelte` and driven by a small store holding `isOpen`, the current mod and its actions. A rail click (or a palette command) calls a service that fills the store and opens it. TemplatePicker's two-step flow covers "pick an action, then enter input". `TypeNameDialog` covers a single validated text field. Long-running agent orchestration needs progress and cancel UI, and nothing in this inventory has that. See the gaps.

**S09. Can a mod register commands at runtime? How do keybindings attach?**
Not today: there is no command registry (§1.4). The smallest change is a `$state.raw` mod-commands store that `getBuiltInCommands()` spreads in, which follows the `railGoToCommands` precedent at `app/commands.ts:56-66,371`. Keybindings are a static app-lifetime array with no conflict check, and `shortcutFor` throws for an unknown id. Any mod shortcut therefore needs its own `registerKeybinding` call with a vault-lifetime unregister, plus a conflict check against `GLOBAL_KEYBINDINGS`. Otherwise a mod binding of Cmd+S fires next to Save, because every listener matches independently (`utils/keybindings.ts:57-75`).

**S10. Which other entry points exist, and how are they registered and dispatched?**
- **Note action bar:** a register/unregister store exists, but there is one hub button per note type and the first registration wins. It is not a general action list.
- **Meta-bind buttons:** a closed action union in `core/`. A `runMod` action would go through the `editorHost` facet, since `core/` cannot import a feature.
- **Deep links:** a closed set of actions, with a registered-handler map keyed by a literal union type.
- **Quick Capture:** no extension point.

---

## 4. Remaining gaps

- No progress, streaming or cancel UI pattern was found for long-running actions such as an LLM agent fan-out. The pickers close before they await the service (`OneOnOnePicker.svelte:27`, `CommandPalette.svelte:29`), so results can only come back as toasts or files. Not searched: status-bar items (`core/status-bar/`) as a progress surface.
- Global keybindings ignore an open dialog (except "/", `app/global-keybindings.ts:44`). Not checked: whether bits-ui Dialog traps Cmd+P and the like.
- Not checked: whether a mod-registered navigator `component` could be anything but compiled Svelte. INFERRED no, because vault JS is not compiled. Mods should not provide UI components in the MVP.
- Not checked: the E2E test hooks for the rail (`data-rail-item` at `Rail.svelte:125`) and how new items would be tested in Playwright.
- No runtime check was done (read-only research). Everything here comes from reading the code.

---

## 5. Constraints the vault-mods design must respect

1. **Registration lifetime is the vault.** Register mod entry points in `initializeVault`, next to `app/lifecycle/app-lifecycle.service.ts:247-264`, and push their unregister closures into the list that `teardownVault` drains (`:571`). Registries must be `$state.raw` with identity-based unregister (`rail-registry.store.svelte.ts:8-10`).
2. **A mod rail button must not go through `selectRailItem`.** That path persists `railItem` (`app/rail-navigation.ts:23`), and an unknown key restores to Today (`lens.logic.ts:206`). An action button needs its own item kind, its own click path and an `aria-current` that is never set.
3. **Keep mod buttons out of `railGoToCommands`,** or label them as actions. Every `railItems` entry today becomes a "Go to X" command bound to `selectRailItem` (`app/commands.ts:56-66`).
4. **Decide the rail placement explicitly.** The groups are top, navigator, pinned and bottom (`rail-items.logic.ts:5`), and only the pinned block scrolls (`Rail.svelte:103-108`). Many mods in a fixed group will overflow a 48 px rail. INFERRED: put mods in their own scrollable group or inside the pinned block.
5. **Hide and order.** If mod items join `arrangeRailGroups`, `LayoutSection` picks them up only when they come through `railItems` (`LayoutSection.svelte:35`). Mod keys need a namespace (for example `mod:<id>`) so they cannot collide with built-in keys or `view:`/`type:` pin keys.
6. **Icons are data, never markup or components.** Use the existing string icon refs (`pack:name`, bare name defaults to lucide, `file-icons.logic.ts:41-48`) rendered by `IconRenderer` with sanitized pack SVG, plus a fallback.
7. **The modal follows the AppOverlays pattern.** Mount it once in `app/AppOverlays.svelte`, give it a dedicated store with `reset()` on teardown, and keep `features/` free of plugin imports. The ADR-0003 ratchet (`layer-rules.test.ts:111-126`) fails any new `features->plugins` or `core->features` edge, so a mod feature in `features/` may only be wired from `app/`.
8. **Errors must surface.** Follow `executeCommand` and the pickers: close the picker, await the action, toast on a throw, log with `error()` from `utils/debug.ts`. Never swallow.
9. **Palette integration must be reactive and per vault.** Feed mod commands through a store read inside `getBuiltInCommands()`. Note that recent command ids are global across vaults (`command-palette.store.svelte.ts:1`), so a mod command id from vault A will show up in vault B's recent list as a dead id. INFERRED: harmless if ids that do not resolve are dropped. Check how `filterAndRankCommands` handles them.
10. **Keybindings conflict silently.** Mod shortcuts need a conflict check against `GLOBAL_KEYBINDINGS` and must not take Cmd+S, Cmd+W, Cmd+P and so on (`app/global-keybindings.ts:62-203`). Leaving mod shortcuts out of the MVP is the simplest option.
11. **Security for external triggers.** A deep link can switch vaults and run an action unattended (`deep-link.service.ts:153-174`). Any web page can open a `kokobrain://` URL. A `mod` deep-link action would let outside content run vault code, so it must stay out of the MVP or require an explicit confirmation. The same applies to a meta-bind `runMod` action in a note that was synced or shared from elsewhere.
12. **Meta-bind or editor entry points must go through `editorHost`** (`core/markdown-editor/editor-host.ts:36-66`), because `core/` cannot import the mod feature. The live-preview rules in `docs/agents/live-preview-rules.md` apply to any widget change.
13. **Note action bar reuse is limited** to one button per type, first registration wins (`note-action-bar.logic.ts:65-74`). A mod entry point there needs a list in the More menu, not the hub slot.
