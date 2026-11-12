# Issue 243 discovery: Tasks section tags saved per vault

Waits on 030: done in `.scratch/open-itens/ledger.md` (721ef3a5c), so the file-protected session never writes.

## Files that change
- `src/lib/core/settings/settings.types.ts:390-446`: `AppSettings.tasksView?: unknown`, JSDoc like `layout.railListPrefs` (:111-116). `DEFAULT_SETTINGS` untouched.
- `src/lib/core/settings/settings.service.ts:93-200` (`parseSettings`): `...(parsed.tasksView !== undefined ? { tasksView: parsed.tasksView } : {})` at the end of `merged`. `normalizeSettings` (`settings.logic.ts:217`) spreads `settings`, so the key reaches both write paths.
- `src/lib/core/settings/settings.store.svelte.ts:167-407`: getter `tasksView`, `updateTasksView(value: unknown)` doing `settings.tasksView = value` (in place, like `updateLayout` :248).
- `src/lib/features/tasks/tasks.logic.ts` (after `parseSectionTags` :139): `parseTasksView`, `withSectionTag`, plus a local `isPlainObject`.
- `src/lib/features/tasks/tasks.service.ts:122-125` (`updateSectionTagFilter`): `settingsStore.updateTasksView(withSectionTag(settingsStore.tasksView, tag))` after `setSectionTag`, before `buildTaskIndex`. New sync export `loadSavedTasksView()` with the error log and the toast.
- `src/lib/app/lifecycle/app-lifecycle.service.ts:210-212`: `loadSavedTasksView()` right after the `initVersion` guard, before `configureSentry` / `startSettingsPersistence`.
- `help/documentation/10-tasks-and-todoist.md:107`: Section filter row sentence.

## Tests (prior art)
- `src/tests/lib/features/tasks/tasks-view-settings.test.ts` (new, jsdom): copies `settings-persistence.test.ts` setup (fs mock, fake timers, `settle()`, `stopSettingsPersistence` in afterEach), plus `@tauri-apps/api/core` invoke mock, `svelte-sonner`, `theme.service.js`, `#lib/utils/debug.js` partial (spy on `error`). Round-trip, missing key, empty-ish values, invalid `it.each`, unknown keys, vault switch, protected session, and one textbox test via `mountTasksView` (Issue 110 fixture).
- `tasks.logic.test.ts`: pure `parseTasksView` / `withSectionTag` cases.
- `tasks.service.test.ts:359-382`: `settingsStore.reset()` in beforeEach, real-store asserts on `tasksView.sectionTag`.
- `TasksView.test.ts:604-633` (Issue 234 flush tests): add `settingsStore.tasksView` asserts.
- `app-lifecycle.service.test.ts:189-192`: add `loadSavedTasksView: vi.fn()` to the mock; order test next to :329-337; superseded test after :1444-1463.
- `settings.service.test.ts` (`loadSettings` describe): absent stays absent, object/42/null verbatim in store and write-back. `settings.store.test.ts`: `updateTasksView`, reset, DEFAULT_SETTINGS has no key.

## Risks
- The store value is a `$state` proxy: `withSectionTag` spreads it into a plain object (no `structuredClone`).
- Persistence effect must see a newly added key: `serialize()` JSON.stringifies the proxy, so `ownKeys` subscribes; covered by the round-trip test.
- `loadSettings` with `readTextFile` returning the payload runs `applyLoadedSettings` (theme service): mocked as in `settings.service.test.ts`.
- `debug.js` imports the settings store and Sentry; mock it with `vi.fn` for `error` and keep `debug`/`timeAsync` as pass-through.

## Defaults taken
- Invalid-value detection lives in `loadSavedTasksView`; the toast text and log are as written in the Issue.
- Vault switch test drives `loadSettings` + `startSettingsPersistence` per vault directly (no `initializeVault`), as the Issue names the real persistence functions.
