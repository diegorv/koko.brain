# Refutation: Issue 243, the Tasks section tags are saved per vault

Ticket: `.scratch/open-itens/issues/243-tasks-section-tags-saved-per-vault.md` (cited as `243:N`). Dossier: `dossier-243.md`. Code cited at HEAD `d2304ac9e`. (F) = verified in code. (I) = inference. Nothing was run.

## Verdict

**Confidence: medium** that a fresh agent implements it right from the ticket text alone.

The feature is small and the file list is right (F: `settings.types.ts:390-446`, `settings.store.svelte.ts:164-407`, `settings.service.ts:82-198`, the single write site `settings.service.ts:259`). `tasksStore.reset()` already restores `#to-list` (F: `tasks.store.svelte.ts:30`, tested at `tasks.store.test.ts:44-56`). Seven gaps remain. Two of them can ship a bug that no criterion catches:

1. "through the settings service's existing save path" (`243:9`) reads most naturally as `saveSettings(vaultPath)` (`settings.service.ts:270-274`). Issue 030 puts its "never write a file that was not loaded" guard in `settings-persistence.svelte.ts` (`030` "What to build"). A direct `saveSettings` call from `features/tasks` bypasses that guard. One Tasks textbox edit in a session whose `settings.json` could not be read would then write defaults over it, and that is the exact data loss 243 waits on 030 to prevent (`243:30`). No criterion tests this.
2. "the per-section merge in `settings.service.ts`, as `todoist` does" (`243:7`) is the wrong model for an opaque value. `{ ...DEFAULT.todoist, ...parsed.todoist }` (`settings.service.ts:160-163`) applied to `tasksView` turns `42` into `{}`, because spreading a number yields no keys. The 42 criterion catches this, so it costs the agent a cycle but does not ship broken.
3. The load seam is not named (`243:8`). `loadSettings` has one caller, `initializeVault` (F: `app-lifecycle.service.ts:210`, no other call in `src/lib`). `core/settings` cannot call `features/tasks`. The lifecycle test mocks `tasks.service.js` with a factory that has only `buildTaskIndex` and `resetTasks` (F: `app-lifecycle.service.test.ts:189-192`). A new export called from `initializeVault` and missing from that factory makes every `initializeVault` test in the file throw.
4. "is not written until the next change" (`243:22`) cannot mean "no `writeTextFile` call": `loadSettings` writes the merged settings back after every good parse (F: `settings.service.ts:68-74`).
5. "mocking only `@tauri-apps/plugin-fs`" (`243:21`) contradicts the same test's path. The debounce calls `updateSectionTagFilter`, which runs `buildTaskIndex`, which calls `invoke` (F: `tasks.service.ts:65-99`). Criterion 2 asserts a log and a toast, and neither can be observed without the `svelte-sonner` mock and either a `debug.js` mock or a `console.error` spy. `docs/TESTING.md:14-20` allows those boundary mocks.
6. The vault-switch criterion (`243:24`) passes with a load that skips the set when the key is missing, because a normal switch runs `resetTasks()` first (F: `app-lifecycle.service.ts:664`). The rapid double-switch skips `teardownVault` (F: comment `:138-140`, branch `:184`), so the store can still hold the previous vault's tag when the next `loadSettings` returns.
7. A saved empty string is undefined behaviour. Clear tag writes `''` (`108` part 2), and the owner rule "the view never defaults to every task" (`108` Answered) sits beside it. An agent may treat `''` as missing (`#to-list`) or as typed (every task), or stop and call it an owner decision. Issue 116 inherits the answer: it writes the card texts back to `tasksView.sectionTag`, and its Clear sets `sources` to `[]` (`116-sources-panel-and-excludes.md:14`).

## Must-fix edits

### M1. Name the save path as a store mutation, never `saveSettings`

- In `243:9`, replace "saves the new text through the settings service's existing save path. No new `writeTextFile` site." with:
  > saves the new text by mutating the settings store through a new `settingsStore.updateTasksView(value: unknown)`; the running persistence effect (`settings-persistence.svelte.ts`) writes it after its debounce. `features/tasks` never calls `saveSettings` or `writeSettingsFile`: Issue 030's guard for a session whose `settings.json` was not loaded lives in persistence, and a direct call would bypass it. No new `writeTextFile` site.
- Add a criterion after `243:22`:
  > - [ ] After a load where `readTextFile` rejects (Issue 030's protected session), changing the section tag leaves `/vault/.kokobrain/settings.json` unwritten for the rest of the session.
- Evidence: `saveSettings` writes directly (F: `settings.service.ts:270-274` -> `:251-264`). The persistence write is a separate path (F: `settings-persistence.svelte.ts:73-87`). 030's guard is scoped to persistence ("settings-persistence.svelte.ts never writes settings.json for the rest of a session whose outcome is 'file-protected'", `030-session-whose-settings-json-was-never-loaded.md`, What to build).

### M2. Replace the `todoist` merge pointer with a verbatim pass-through

- In `243:7`, replace "and the per-section merge in `settings.service.ts`, as `todoist` does" with:
  > and `parseSettings` in `settings.service.ts`, which rebuilds the settings key by key and drops any key it does not name, so the load write-back would erase `tasksView`. Pass it through verbatim, with no spread and no default: `...(parsed.tasksView !== undefined ? { tasksView: parsed.tasksView } : {})`. The `todoist` merge is the wrong model here: `{ ...42 }` is `{}`, which would silently drop an invalid value and rewrite it. `AppSettings.tasksView` is optional (`tasksView?: unknown`) and `DEFAULT_SETTINGS` has no `tasksView` key, so an absent key still means nothing was saved. The precedent for an opaque value parsed in a feature is `layout.railListPrefs` (`settings.types.ts:111-116`, parsed by `features/rail-shell/list-prefs.logic.ts`).
- Evidence: `parseSettings` builds `merged` from named keys only (F: `settings.service.ts:89-196`). `loadSettings` writes it back (F: `:68-70`). `normalizeSettings` spreads `...settings` and keeps an extra key (F: `settings.logic.ts:217-240`). Opaque precedent (F: `settings.types.ts:111-116`, `list-prefs.logic.ts:41-56`).

### M3. Name the load seam and the lifecycle mock

- In `243:8`, replace "When the vault's settings have loaded, `tasksStore.sectionTag` takes the saved value." with:
  > A synchronous function exported by `features/tasks/tasks.service.ts` (for example `loadSavedTasksView()`) reads `settingsStore.tasksView`, parses it with a pure function in `tasks.logic.ts`, and always calls `tasksStore.setSectionTag` with the result, `#to-list` included. A skipped set would leave the previous vault's tag after a rapid double-switch, which skips `teardownVault`. `initializeVault` calls it once, right after `await loadSettings(vaultPath)` and its `if (initVersion !== version) return;`, so a superseded init never applies. It never mutates the settings store and starts no fetch. Add it to the `vi.mock('#lib/features/tasks/tasks.service.js')` factory in `app-lifecycle.service.test.ts`: a factory without it makes every `initializeVault` test in that file fail.
- Add a criterion:
  > - [ ] `app-lifecycle.service.test.ts`: `initializeVault` calls the load after `loadSettings` and before `startSettingsPersistence` (`invocationCallOrder`), and a superseded init (the slow-`loadSettings` pattern in the same file) does not call it for the stale vault.
- Evidence: single caller (F: `app-lifecycle.service.ts:210-212`), import line already reaching `features/tasks` (F: `:57`), mock factory (F: `app-lifecycle.service.test.ts:189-192`), superseded-init test pattern (F: `:1409-1415`), double-switch window (F: `app-lifecycle.service.ts:138-140`, `:184-201`).

### M4. Say what "not written" means

- In `243:22`, replace "and is not written until the next change." with:
  > and the value stays `42` on disk until the next section tag change. The load write-back and any write caused by another setting carry it through unchanged (assert on the JSON of every `writeTextFile` payload, not on the call count). The next change replaces it with `{ version: 1, sectionTag: <text> }`.
- Make the same change in `243:8` ("is not written back until the user changes the field").
- Evidence: `loadSettings` always writes back after a good parse (F: `settings.service.ts:68-74`). Persistence takes the loaded state as its baseline (F: `settings-persistence.svelte.ts:50`, `:57`), so the load path itself does not schedule another write.

### M5. List the boundary mocks the tests may use

- In `243:21`, replace "mocking only `@tauri-apps/plugin-fs`:" with:
  > mocking only the boundaries `docs/TESTING.md` allows: `@tauri-apps/plugin-fs`, `@tauri-apps/api/core` (`invoke`, which the refetch after the debounce calls), `svelte-sonner` (to assert the toast), the DOM service `#lib/core/settings/theme.service.js` as `settings.service.test.ts` does, and `#lib/utils/debug.js` (or a `console.error` spy) to assert the log. Run the real `loadSettings`, `startSettingsPersistence`, `settingsStore` and `tasksStore` under jsdom, with fake timers, and `await stopSettingsPersistence()` in `afterEach`, as `settings-persistence.test.ts` does.
- Evidence: `buildTaskIndex` calls `invoke` (F: `tasks.service.ts:70-73`). `loadSettings` calls `applyActiveTheme` (F: `settings.service.ts:242-245`), which the settings suite mocks (F: `settings.service.test.ts:14-16`). Allowlist (F: `docs/TESTING.md:14-20`). Persistence test pattern (F: `settings-persistence.test.ts:1-3`, `:23-27`, `:56-60`).

### M6. Make the vault-switch criterion fail with a skipped set

- Replace `243:24` with:
  > - [ ] A vault switch loads the second vault's value, never the first one's. Vault A saves `#a`; vault B saves `#b`; vault C has no `tasksView`. Run the load for C while `tasksStore.sectionTag` still holds `#b`, without `resetTasks()` in between (the double-switch path): it becomes `#to-list`. After switching to B, a change writes only to B's `settings.json`.
- Evidence: a normal switch resets the tag first (F: `app-lifecycle.service.ts:664`, `tasks.store.svelte.ts:30`), so a test that resets between vaults passes with the bug. The double-switch path skips teardown (F: `:184`).

### M7. Pin the empty string

- In `243:8`, after "A missing key or a missing `sectionTag` gives `#to-list`.", add:
  > A saved `sectionTag` that is a string is restored as typed, including `''` (left by Clear tag or an emptied box), which lists every task as it does in the session. The owner rule "the view never defaults to every task" covers the default only: an absent key or an absent `sectionTag`. Saved text is not trimmed or passed through `parseSectionTags`.
- Add to the criteria: "`sectionTag: ''` loads `''`."
- Evidence: Clear tag calls `updateSectionTagFilter('')` (`108-mounted-list-and-rule-sentence.md`, part 2). `243:7` says "the textbox text as typed". Issue 116 writes card texts back to `tasksView.sectionTag` and allows `sources: []` (`116-sources-panel-and-excludes.md:14`), so it needs this answer fixed. (I) This is the reading most consistent with the owner's recorded words. If the owner wants `''` to load as `#to-list`, change this line before launch, not during the build.

## Should-fix edits

- S1. Define "invalid" (`243:8`). Add: "Valid: absent, or a plain object whose `sectionTag` is absent or a string. Invalid: `null`, an array, a primitive, or a `sectionTag` of another type. `version` is not checked on read. On save, keep an existing numeric `version`, else write `1`, keep every other key, and replace an invalid value wholesale." Without this, `null` and `{ sectionTag: 5 }` are guesses. Model: `parseRailListPrefs` / `withListPrefs` (`list-prefs.logic.ts:41-97`).
- S2. Give the toast text and the log tag. Suggested: `error('TASKS', 'Invalid tasksView in settings.json:', raw)` and `toast.error('The saved Tasks section tags could not be read, so #to-list is used.')` at the default duration. The persistent `BROKEN_FILE_TOAST` (`settings.service.ts:204`) is for a lost file. With M4, the toast repeats at every vault open until the user changes the field. Say that is accepted.
- S3. Tests that now write the real settings store. `updateSectionTagFilter` will mutate `settingsStore`. `tasks.service.test.ts`'s `describe('updateSectionTagFilter')` resets only `tasksStore` and `editorStore` (F: `tasks.service.test.ts:189-194`). Add "add `settingsStore.reset()` to that `beforeEach`, and assert `settingsStore.tasksView` after `updateSectionTagFilter('#work')` and `('')` (real store state, not a spy)". `TasksView.test.ts` already resets it in one describe only (F: `TasksView.test.ts:195-201`). Check the others.
- S4. Interaction with Issue 234, which may land first (243 launches "between two chain Issues", `243:30`). 234 makes `onDestroy` apply a pending debounce through `updateSectionTagFilter` unless `resetTasks()` ran since mount (`234-tasks-groups-keep-their-place.md:15`). After 243, that flush also saves. Add: "If Issue 234 has landed, add one `TasksView.test.ts` case: type a tag, call `resetTasks()`, unmount; `settingsStore.tasksView` is unchanged." The dossier's A9 ("no extra guard, onDestroy clears the timer") is true only before 234.
- S5. Help doc. The row is `help/documentation/10-tasks-and-todoist.md:103` (Section filter). Suggested text: "The field is remembered per vault and comes back after a restart."
- S6. Known limit, stated once (CLAUDE.md section 2): a tag typed less than about 900 ms before quit (400 ms view debounce plus 500 ms persistence) can be lost, because the quit flush only writes what is already in the store (`settings-persistence.svelte.ts:68-87`). Do not handle it.
- S7. In `243:10`, "`tasksStore.reset()` still restores `#to-list`" is already true and tested (F: `tasks.store.svelte.ts:30`, `tasks.store.test.ts:44-56`). Mark it "no change; keep the existing test" so the agent does not look for a red test.

## Dossier errors

- Finding 5 cites the double-switch comment at `app-lifecycle.service.ts:142-147` and the branch at `:177`. The comment is at `:138-140`, and the teardown branch is `if (unsubscribeFileChange)` at `:184`. `:177` is the search-index unsubscribe.
- A8 says the ticket's "No new `writeTextFile` site holds either way", which treats a direct `saveSettings` call as acceptable. It is not: it bypasses Issue 030's persistence-level guard (M1). Section 1.5 says 243 "is compatible without reading the outcome". That holds only on the persistence path.
- A9 ("no extra guard": `onDestroy` clears the timer) goes stale if Issue 234 lands before 243, because 234 makes destroy apply the pending debounce (S4).
- R1 says only the lifecycle file was found to mock `tasks.service.js` wholesale. `commands.test.ts:26`, `global-keybindings.test.ts:25` and `CommandPalette.test.ts:26` also do. They do not reach `initializeVault`, so they do not break. Not a wrong conclusion, but the list was incomplete.
- Otherwise accurate. Verified: `parseSettings` drops unknown keys and the load write-back (findings 1 and 4), the single `loadSettings` caller (finding 2), the mock factory (finding 3), the jsdom and theme-mock pattern, `TasksView.svelte:31`, `:34-44`, `:73-78`, `tasks.logic.ts` at 161 lines importing only `sanitize-url` and types, and `BASELINE_SIZE = 3` (`layer-rules.test.ts:32`).
