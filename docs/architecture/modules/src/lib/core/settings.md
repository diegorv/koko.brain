---
summary: "App settings state, vault-level settings.json persistence, theme application and the Settings panel sections."
---

## Responsibility

Owns the reactive AppSettings store, the load, parse, merge and write of .kokobrain/settings.json in the open vault (settings.service.ts, settings-persistence.svelte.ts), and the pure normalization, merge and theme rules (settings.logic.ts, theme.logic.ts, theme-package.logic.ts and related theme files). It applies the active theme and heading typography to the DOM, fetches the built-in theme catalog, wraps the Sentry configuration and the background update check, and holds the Settings panel UI under sections/. It does not own the vault lifecycle that calls load and start (src/lib/app), the Rust update, Sentry and font commands it invokes, or the data each feature keeps in its own settings slice.

## Key files

- `src/lib/core/settings/settings.store.svelte.ts`: settingsStore: DEFAULT_SETTINGS, getters per slice and update methods.
- `src/lib/core/settings/settings.service.ts`: loadSettings, parseSettings, saveSettings, the single writeSettingsFile write site and heading typography CSS variables.
- `src/lib/core/settings/settings-persistence.svelte.ts`: Effect-driven debounced persistence session with the file-protected guard, flushSettingsPersistence and stopSettingsPersistence.
- `src/lib/core/settings/settings.logic.ts`: Pure normalization and clamping, layout merge, and the Settings sidebar section groups.
- `src/lib/core/settings/settings.types.ts`: AppSettings, per-slice interfaces, SettingsSection and SettingsLoadOutcome.
- `src/lib/core/settings/theme.service.ts`: Applies themes to the document root and mirrors theme variables to localStorage for secondary windows.
- `src/lib/core/settings/theme-package.logic.ts`: Theme package and catalog parsing, install, update and uninstall rules.
- `src/lib/core/settings/sentry.service.ts`: Sentry configuration, event scrubbing and captureSentryException gated by the opt-in setting.
- `src/lib/core/settings/update-check.service.ts`: Background update check on launch when autoCheck is on.
- `src/lib/core/settings/sections/SettingItem.svelte`: Shared row component for the Settings panel sections.

## State

- Vault file .kokobrain/settings.json, read and written through the Tauri fs plugin in settings.service.ts
- Broken settings files copied to .kokobrain/settings.broken-<stamp>.json before defaults replace them
- In-memory settingsStore (module-level $state), including the tasksView slice stored verbatim
- Settings panel open state and active section in settings-panel.store.svelte.ts
- Applied theme dark flag and revision in applied-theme.store.svelte.ts
- localStorage key kokobrain:theme-vars mirroring the applied theme variables for secondary windows

## Collaborators

- `IPC:check_for_update_on_channel`: Invoked by update-check.service.ts and sections/UpdateSection.svelte.
- `IPC:configure_sentry`: Invoked by sentry.service.ts.
- `IPC:list_system_fonts`: Invoked by sections/EditorSection.svelte.
- `IPC:plugin:updater|download_and_install`: Invoked with a raw invoke from sections/UpdateSection.svelte because it is a plugin command outside the typed command map.
- `src/lib/core/vault`: exit.service.ts calls flushSettingsPersistence before the app exits, UpdateSection.svelte calls prepareForExit before restarting to update, and TrashSection.svelte reads vaultStore.path.
- `src/lib/core/trash`: sections/TrashSection.svelte reads the trash store and calls the trash service.
- `src/lib/core/markdown-editor`: MarkdownEditor.svelte reads settingsStore and appliedThemeStore and calls applyHeadingTypography, and TroubleshootingSection renders the live-preview decorator names.
- `src/lib/app`: app-lifecycle.service.ts calls loadSettings, startSettingsPersistence, stopSettingsPersistence, configureSentry and maybeAutoCheckForUpdates; SettingsPanel.svelte mounts the sections.
- `src/lib/utils`: debug.ts imports settingsStore and captureSentryException, and app-channel.ts imports the settings types. These are the documented utils-to-core exceptions.
- `src/lib/features`: Features read settingsStore getters and call update methods on their own slice.
- `src/lib/plugins`: Plugins read settingsStore getters and call update methods on their own slice.
- `src/routes`: The Quick Capture composer window (composer/+page.svelte) and (app)/+layout.svelte call applyStoredTheme, which reads the localStorage mirror; the composer has no settings store.

## Subfolders

- `src/lib/core/settings/sections`: Svelte components for each Settings panel section plus shared rows and the theme editor and preview.

## Gotchas

- settings.json is written from the frontend with the Tauri fs plugin, not through a Rust command. writeSettingsFile is the only write site.
- loadSettings writes the merged settings back to disk after a successful load, so new default keys appear in the file.
- When loadSettings resolves 'file-protected' (the file could not be read, or it is broken and its backup failed) the store holds defaults the file never contained, and settings-persistence.svelte.ts never writes the file, including on the quit and vault-exit flushes.
- A file that does not parse to a JSON object is copied to settings.broken-<stamp>.json before defaults overwrite it. If the copy fails the file is left untouched.
- Persistence is driven by an effect that serializes the whole normalized settings object, so a change to any leaf is saved. updateLayout and updateTasksView mutate in place on purpose, to avoid re-running every reader of the root object.
- Values are normalized on load and before each save, so out-of-range values typed before commit cannot reach disk.
- Writes are debounced. stopSettingsPersistence disposes the effect synchronously before awaiting the flush, so resetSettings during teardown cannot write defaults into the vault being left. The persistence session captures the vault path at start and never re-reads it.
- Sentry is opt-in and captureSentryException does nothing unless Sentry is active.
- Other windows read the localStorage theme mirror, not the settings store.
- theme-catalog.service.ts fetches a fixed raw GitHub catalog URL with the Tauri http plugin.
- tasksView is copied verbatim on load and never merged with defaults.
- This folder imports no features/, plugins/ or app/ code. Dependency flows the other way, plus the documented utils exceptions.
