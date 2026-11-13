# S19: Settings, optional plugins, and where a Mods page fits

## Answer

There is no plugin enable/disable mechanism. Everything under `src/lib/plugins/` is registered unconditionally when a vault opens. The only user toggles are feature flags on `AppSettings` for a few features (file history, auto-move, semantic search, Sentry, folder notes). Each feature with a toggle reads its flag at init time; the plugin registrations do not check one.

The settings panel has no generic per-plugin section pattern. It is a hand-maintained list of 18 sections (`SettingsSection` union), wired in four places (type, icon map, component map, group list). Each section is a bespoke Svelte component that imports its store and writes through a typed `settingsStore.updateX()` method. Per-feature configuration is either a typed sub-object on `AppSettings` (`queryjs`, `sentry`, `todoist`, `autoMove`) or a separate JSON file in `.kokobrain/` (auto-move rules).

A Mods page fits as one new section with a `SETTINGS_SECTION_GROUPS` entry and a component. It does not fit the current persistence model well for trust. `settings.json` lives inside the vault and parsing drops any top-level key it does not know, so per-machine trust state and secrets should live elsewhere. The rail has no slot for a modal-only button; that needs a new registration kind.

## Evidence

### Settings panel shell
- `src/lib/app/SettingsPanel.svelte:2-19`: section components imported statically into a `<script module>`.
- `src/lib/app/SettingsPanel.svelte:42-61`: `sectionIcons: Record<SettingsSection, Component>`. Compile-time exhaustive.
- `src/lib/app/SettingsPanel.svelte:68-87`: `sectionComponents: Record<SettingsSection, Component>`, exported for tests.
- `src/lib/app/SettingsPanel.svelte:99`: active component is `$derived(sectionComponents[settingsPanelStore.activeSection])`.
- `src/lib/app/SettingsPanel.svelte:125-141`: sidebar renders `SETTINGS_SECTION_GROUPS` as group headers plus buttons.
- `src/lib/app/SettingsPanel.svelte:101-105`: Escape closes the panel.
- `src/lib/core/settings/settings-panel.store.svelte.ts:11-17`: `open(section?)`, `setSection`. Any caller can open the panel on a given section, so a Mods button can deep-link to a Mods section.
- `src/tests/lib/app/SettingsPanel.test.ts:22-37`: test asserts `sectionComponents` keys equal the nav ids. A new section must be in both places or the test fails.

### Section registry and types
- `src/lib/core/settings/settings.types.ts:331`: `export type SettingsSection = 'appearance' | ... | 'update'` (18 members).
- `src/lib/core/settings/settings.logic.ts:205-264`: `SettingsSectionItem`, `SettingsSectionGroup`, `SETTINGS_SECTION_GROUPS`. Groups: General, Notes, Vault, Tools, Integrations (Todoist only), Advanced.
- `src/lib/core/settings/settings.types.ts:362-416`: `AppSettings`. Per-feature sub-objects are `history`, `search`, `autoMove`, `eventCalendar`, `todoist`, `sentry`, `queryjs`, `updates`, plus flat booleans.
- `src/lib/core/settings/settings.types.ts:251-256`: `SentrySettings { enabled, dsn }`. Typical feature-flag shape.
- `src/lib/core/settings/settings.types.ts:272-282`: `QueryjsSettings { autoRunQueries }`. Doc says "QueryJS plugin configuration". Plugin config is an ordinary `AppSettings` field.
- `src/lib/core/settings/settings.types.ts:400-405`: `queryjs` field comment reads "QueryJS plugin configuration (execution policy, ...)".

### Defaults and store
- `src/lib/core/settings/settings.store.svelte.ts:6-152`: `DEFAULT_SETTINGS`. Feature flags default off where they are risky: `autoMove.enabled: false` (107-110), `search.semanticSearchEnabled: false` (104-106), `sentry.enabled: false` (126-129). `history.enabled: true` (99-103).
- `src/lib/core/settings/settings.store.svelte.ts:157-186`: getters per section, e.g. `get sentry()`, `get queryjs()`.
- `src/lib/core/settings/settings.store.svelte.ts:189-390`: `setSettings`, one `updateX(partial)` per section, which shallow-merges and reassigns `settings`. `updateLayout` mutates in place (237-240).
- `src/lib/core/settings/settings.store.svelte.ts:387-389`: `reset()`.

### Load and save
- `src/lib/core/settings/settings.service.ts:82-197`: `parseSettings` builds a new `merged: AppSettings` field by field. It never spreads `parsed`. Any top-level key not listed (lines 89-195) is dropped on load and therefore on the next save. A new `mods` field must be added here, not only to `AppSettings`.
- `src/lib/core/settings/settings.service.ts:36-76`: `loadSettings`. Missing or blank file gives defaults and writes them. Unparseable file is copied to `settings.broken-<stamp>.json` and reset (199-225).
- `src/lib/core/settings/settings.service.ts:269-273`: `saveSettings` writes `normalizeSettings(settingsStore.settings)` to `<vault>/.kokobrain/settings.json`.
- `src/lib/core/settings/settings-persistence.svelte.ts:10`: 500 ms debounce. `:46-66`: an `$effect` serializes the whole store and writes on any change. No explicit save call is needed for a store update.
- `src/lib/core/settings/settings.logic.ts:180-202`: `normalizeSettings` clamps values, run on every write.

### Plugin registration is unconditional
- `src/lib/app/lifecycle/app-lifecycle.service.ts:247-267`: per-note consumers, Calendar, One-on-one, Kanban and Calendar rail registered with no settings check.
- `src/lib/app/lifecycle/app-lifecycle.service.ts:269-274`: file history registers only if `settingsStore.history.enabled`.
- `src/lib/app/lifecycle/app-lifecycle.service.ts:432-437`: auto-move registers only if `settingsStore.autoMove.enabled`.
- `src/lib/app/lifecycle/app-lifecycle.service.ts:447`: semantic search gated on `settingsStore.search.semanticSearchEnabled`.
- `src/lib/app/boot.ts:34-83`: app-wide ports (`registerAppPorts`) registered once at app load, outside vault lifetime. QueryJS block ports at line 40.
- `src/lib/plugins/calendar/calendar-rail.service.ts:20-40`: `registerCalendarRail()` returns one unregister function. Pattern for vault-lifetime registration.
- `src/lib/features/rail-shell/rail-registry.store.svelte.ts:13-79`: registry for navigators, lens providers, Today sections, folder creators. Register returns an unregister closure; `reset()` drops all.

### Rail shell (where the entry button would go)
- `src/lib/features/rail-shell/rail-items.logic.ts:8-19`: `RailItem { key, label, group, navigator?, pin? }`. Groups: top, navigator, pinned, bottom.
- `src/lib/features/rail-shell/rail-items.logic.ts:30-60`: `railItems(...)` builds the ordered list from built-ins, navigators and pins. Built-in keys are hard-coded (37-47).
- `src/lib/features/rail-shell/rail-items.logic.ts:70-81`: `arrangeRailGroups` applies `layout.railHidden` and `layout.railOrder`. Any keyed item gets hide and reorder for free.
- `src/lib/features/rail-shell/rail-shell.types.ts:104-115`: `RailPin` (view or type).
- `src/lib/features/rail-shell/rail-shell.types.ts:175-186`: `RailNavigator { id, label, icon, component, lens }`. Requires a panel component shown beside the note list; not a modal-only trigger.
- `src/lib/features/rail-shell/Rail.svelte` (`items` derived near line 61): `onclick={() => onSelect(item.key)}` at line 126. The owner decides the click action; the rail has no built-in modal action.
- `src/lib/features/rail-shell/LayoutSection.svelte:33-38, 161-166`: per-item "Show" switch writes `layout.railHidden`. This is the existing enable/disable-per-entry UI.
- `src/lib/app/commands.ts:51-66`: "Go to <item>" commands built from the same `railItems` list, so a rail item also gets a palette command.
- `src/lib/features/command-palette/command-palette.types.ts:1-7`: `AppCommand { id, label, category, shortcut?, action }`. A second entry point (palette) can reuse this shape.

### Per-feature file config precedent
- `src/lib/features/auto-move/auto-move.service.ts:19, 70-82`: auto-move keeps its rules in `.kokobrain/auto-move-rules.json`, not in `settings.json`. Loaded in `app-lifecycle.service.ts:292`.

### Trust, secrets and code execution precedent
- No trust concept in app code. Grep for `trust` in `src/lib` matched only `theme-package.logic.ts:94` ("untrusted JSON") and `utils/sanitize.ts:34`.
- `src/lib/plugins/queryjs/kb-api.ts:413`: `new Function('kb', 'dv', 'input', wrappedCode)` runs vault-authored JS.
- `src/lib/plugins/queryjs/kb-api.ts:552`: `new Function('kb', 'dv', ...)` in `runQueryjsBlock`. No sandbox, no trust gate, no per-note approval. The only control is the `autoRunQueries` policy (`settings.types.ts:272-282`).
- `src/lib/core/settings/settings.types.ts:243-248`: Todoist API token is a plain string in `settings.json`. `settings.store.svelte.ts:122-125` default is empty. `TodoistSection.svelte:24-29` shows it in a password input, stored unencrypted.
- `src/lib/core/settings/settings.types.ts:251-256`: Sentry DSN, also plain text in `settings.json`.
- Recent-vault list uses `localStorage` (`src/lib/core/vault/vault.store.svelte.ts:3, 43-46`), so app-level state outside the vault already has a precedent.

### Layer rules
- `docs/adr/0003-four-layer-source-taxonomy.md:9-43`: `app/` is the composition root. `features/` may not import `plugins/`; `plugin->plugin` imports are restricted (line 32). Mod host code wired from `app/` avoids these rules.
- `docs/adr/0003-four-layer-source-taxonomy.md:57, 67`: ADR says plugins are "optional and togglable by the user", but no toggle exists in the code (see Answer).

## Implications for vault mods

1. **Mods page = one more settings section.** Add `'mods'` to `SettingsSection` (`settings.types.ts:331`), an icon (`SettingsPanel.svelte:42-61`), a component (`:68-87`), and a group entry (`settings.logic.ts:217-264`). `SettingsPanel.test.ts:22-37` enforces the match. Group candidate: Integrations or Tools.
2. **Enable state: pick the home first.** Per-vault enable can go in `settings.json` as a new `AppSettings` field, but that needs a default, a `parseSettings` merge line (`settings.service.ts:89-195`), a getter and an updater. Missing the merge line silently loses the value. Trust is per machine, so it should not live in the vault. The options are `localStorage` (precedent above) or a file outside the vault.
3. **Mod config and secrets.** `settings.json` is inside the vault and holds the Todoist token and Sentry DSN in plain text. API keys for MCP or HTTP actions should not follow that path. The auto-move precedent (`.kokobrain/auto-move-rules.json`) is a per-feature file that avoids the `parseSettings` drop problem.
4. **Entry-point button.** The rail has no modal-only item kind. `RailNavigator` needs a panel component, so a mod button needs a new kind (for example a `RailAction` with `onRun`) added to `railItems` (`rail-items.logic.ts:30-60`) and handled in `Rail.svelte`. Keying it means hide, reorder and "Go to" come for free (`LayoutSection.svelte:33-38`, `commands.ts:51-66`).
5. **Registration lifetime.** Follow the `registerCalendarRail()` pattern (`app-lifecycle.service.ts:247-267`): register in `initializeVault`, return unregister, drop in teardown. App-wide ports go in `boot.ts`.
6. **Execution model is unsandboxed.** QueryJS already runs vault JS via `new Function` (`kb-api.ts:413, 552`) without a trust gate. If mods run on vault open or from a button, they reach the same level of access with no prior approval. A trust prompt (first run per mod, per machine) would be new to the app.
7. **Per-plugin settings UI does not exist generically.** Each section is bespoke. A mod-defined settings form would need a generic schema renderer built on `SettingItem.svelte` (`sections/SettingItem.svelte:4-17`), not a per-mod section.

## Open questions

- Is trust per vault or per machine? Who can revoke it, and where is the grant stored? (Not decided in any doc found.)
- Is per-vault enable state acceptable in a file that travels with the vault? If a vault is copied to another machine, do its mods auto-enable?
- Should mod code run unsandboxed like QueryJS, or in a Worker or iframe? The MCP and HTTP actions need network access; the sandbox choice changes what can be granted.
- Does the rail need a new item kind for modal-only buttons, or can a mod be a `RailNavigator` with a component that opens a modal? (The second avoids a rail change but puts a navigator slot in the rail.)
- Does an external edit of `.kokobrain/settings.json` reload into the store? Not checked. Relevant if mods write to settings.
- Not checked: the Rust side of settings, and whether any other module writes `settings.json` directly. Read-only research, so no tests or builds were run.
