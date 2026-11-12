# 243: The Tasks section tags are saved per vault

**Origin:** owner request, 2026-11-12, during the Tasks view UX review. Reviewed by the 2026-11-12 deep dive (`.scratch/tasks-view-ux/research/deep-dive/SUMMARY.md`, `dossier-243.md`, `refute-243.md`, `cross-persistence-sources.md`). Issue numbers in this text keep the open-itens numbering: the Tasks view Issues live in `.scratch/tasks-view-ux/issues/`, the others (030, 085, 151, 198, 204, 205 and the rest) in `.scratch/open-itens/issues/`.

**What to build:** The section tags typed in the Tasks view (Issue 242) come back after an app restart, per vault. Today the field is not saved and returns to `#to-list` on every start.

**Settings core (opaque key).**
- `AppSettings` (`src/lib/core/settings/settings.types.ts`) gains an optional `tasksView?: unknown`, documented like `layout.railListPrefs`: loaded unvalidated, parsed in `features/tasks`, never inspected by core. `core/settings` imports nothing from `features/tasks`, not even a type (core to features fails `layer-rules.test.ts`). `DEFAULT_SETTINGS` gets no `tasksView` key: an absent key means nothing was saved, and a default would be written into every vault's `settings.json` by the load write-back.
- `parseSettings` (`settings.service.ts`) rebuilds the settings key by key and drops any key it does not name, and `loadSettings` writes the result back after every good parse, so without a change `tasksView` is erased at the next vault open. Pass it through verbatim, with no spread and no default: `...(parsed.tasksView !== undefined ? { tasksView: parsed.tasksView } : {})`. The `todoist` merge is the wrong model here: spreading `42` gives `{}`, which would silently rewrite an invalid value.
- `settingsStore` gains the getter `tasksView` and `updateTasksView(value: unknown)`, which assigns in place (`settings.tasksView = value`), as `updateLayout` does, so a write does not re-run every settings reader. `reset()` already clones the defaults, so the key disappears on reset.

**Parse (pure, `tasks.logic.ts`).**
- `parseTasksView(raw: unknown): { sectionTag: string; valid: boolean }` and `withSectionTag(raw: unknown, sectionTag: string): Record<string, unknown>`, both import-free.
- Valid: absent, or a plain object whose `sectionTag` is absent or a string. Invalid: `null`, an array, a primitive, or a `sectionTag` of another type. `version` is not checked on read, so a newer build's `version: 2` does not reset the field.
- A missing key, a missing `sectionTag`, an invalid value, and a `sectionTag` that `parseSectionTags` (Issue 242) turns into no tag (`''`, spaces, commas) all give `#to-list` (owner Q1). Any other saved string is restored as typed, untrimmed.
- `withSectionTag` keeps every other key of a plain-object `raw`, keeps a numeric `version` (else writes `1`), sets `sectionTag`, and replaces a non-object `raw` wholesale.

**Load.** `loadSavedTasksView()`, a synchronous export of `tasks.service.ts`, reads `settingsStore.tasksView`, parses it, and always calls `tasksStore.setSectionTag` with the result, `#to-list` included. Skipping the set when nothing is saved would leave the previous vault's tag after a rapid double switch, which skips `teardownVault`. It never mutates the settings store and starts no fetch (the view fetches on mount). An invalid value logs `error('TASKS', 'Invalid tasksView in settings.json:', raw)` and shows `toast.error('The saved Tasks section tags could not be read, so #to-list is used.')` at the default duration; the toast repeats at each vault open until the next section tag change, which is accepted.
- `initializeVault` (`src/lib/app/lifecycle/app-lifecycle.service.ts`) calls it once, right after `await loadSettings(vaultPath)` and its `if (initVersion !== version) return;` guard, so a superseded init never applies a value. `app/` may import `features/` (it already imports `resetTasks`). Add `loadSavedTasksView: vi.fn()` to the `vi.mock('#lib/features/tasks/tasks.service.js')` factory in `app-lifecycle.service.test.ts` in the same commit: a factory without it makes every `initializeVault` test in that file fail.
- Issue 234's textbox follows `tasksStore.sectionTag`, so the loaded value shows in the box.

**Save.** A change that `updateSectionTagFilter` applies (the textbox debounce, Issue 234's destroy flush, or Clear tag) calls `settingsStore.updateTasksView(withSectionTag(settingsStore.tasksView, text))` before it refetches, with the text as typed (no `parseSectionTags` on write). Settings persistence (`settings-persistence.svelte.ts`) writes it after its debounce. `features/tasks` never calls `saveSettings` or `writeSettingsFile`: Issue 030's guard for a session whose `settings.json` was never loaded lives in persistence, and a direct call would bypass it. No new `writeTextFile` site. Unknown keys inside `tasksView` survive a save, so Issues 123 and 124 can add to the same key.

**"Not written" means the bytes stay.** An invalid saved value is not rewritten until the next section tag change. `loadSettings` still writes the merged settings back after a good parse, and other settings changes still write the file; both carry the invalid value through unchanged, because core passes it verbatim and `loadSavedTasksView` does not write. The next section tag change replaces it with `{ version: 1, sectionTag: <text> }`.

- `tasksStore.reset()` already restores `#to-list` and is tested (`tasks.store.test.ts`); no change, keep that test.
- `help/documentation/10-tasks-and-todoist.md`, the Section filter row: "The field is remembered per vault and comes back after a restart. An empty field is not remembered: the next start shows `#to-list`."

**Blocked by:** 234

**Waits on:** open-itens Issue 030 (`.scratch/open-itens/issues/030-session-whose-settings-json-was-never-loaded.md`, a settings file that was never loaded is never saved over). relay-lite cannot see a blocker in another folder: launch this Issue by number only after 030 is `done` in `.scratch/open-itens/ledger.md`.

**Status:** ready-for-agent

**Answered:** owner, 2026-11-12: save the section tags per vault. Owner, 2026-11-12 (Q1): `#to-list` stays the default section filter and the view never defaults to every task; a saved empty section filter is not restored, so after a restart an empty saved value gives `#to-list`. Run order (deep dive X7): this Issue is blocked by 234 and 030 and is launched only by number; Issue 116 is blocked by it.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`. Targeted checks include `src/tests/lib/core/settings/`, `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts`, and the source scans that read this feature: `src/tests/lib/pane-toolbar.test.ts`, `menu-item-anatomy.test.ts`, `chrome-type-scale.test.ts`, `chrome-state-styles.test.ts` and `src/tests/lib/architecture/{pure-logic,layer-rules,feature-cycle}.test.ts`.

Tests mock only the boundaries `docs/TESTING.md` allows: `@tauri-apps/plugin-fs`, `@tauri-apps/api/core` (`invoke`, which the refetch after a change calls; component tests serve tasks through Issue 110's `mockTaskFetch` in `src/tests/fixtures/tasks.fixture.ts`), `svelte-sonner` (to assert the toast), the DOM service `#lib/core/settings/theme.service.js` as `settings.service.test.ts` does, and `#lib/utils/debug.js` or a `console.error` spy (to assert the log). The real `loadSettings`, `startSettingsPersistence`, `settingsStore`, `tasksStore`, `loadSavedTasksView` and `updateSectionTagFilter` run under jsdom with fake timers, with `await stopSettingsPersistence()` in `afterEach`, as `settings-persistence.test.ts` does. New round-trip tests go in `src/tests/lib/features/tasks/tasks-view-settings.test.ts`.

- [ ] Failing test first: `updateSectionTagFilter('#to-list #work')` with persistence running, then advance past the persistence debounce; the last `writeTextFile` payload holds `tasksView` equal to `{ version: 1, sectionTag: '#to-list #work' }`. Then stop persistence, reset both stores, have `readTextFile` return that payload, `await loadSettings('/vault')` and `loadSavedTasksView()`: `tasksStore.sectionTag` is `#to-list #work`. Fails today (the key is dropped and the loader does not exist). One sibling test drives the same path through the textbox, mounted with Issue 110's `mountTasksView`.
- [ ] A settings file without `tasksView` loads `#to-list` (start from `tasksStore.setSectionTag('#stale')` so the explicit set is proven), with no `error` and no toast, and the load write-back has no `tasksView` key.
- [ ] `sectionTag: ''` and `sectionTag: ' , '` load `#to-list`; `sectionTag: ' #a, b '` loads `' #a, b '`.
- [ ] `it.each` over `42`, `null`, `[]`, `'x'` and `{ sectionTag: 5 }`: the load gives `#to-list`, `error` is called once with the tag `'TASKS'`, `toast.error` once. Every `writeTextFile` payload until the next section tag change (the load write-back, and a write caused by `settingsStore.updateLayout(...)`) carries the value unchanged; assert on the JSON of each payload, not on the call count. Then `updateSectionTagFilter('#work')`: the next payload's `tasksView` equals `{ version: 1, sectionTag: '#work' }`.
- [ ] Unknown keys inside `tasksView` survive a save: `{ version: 1, sectionTag: '#a', extra: { x: 1 } }` becomes `{ version: 1, sectionTag: '#b', extra: { x: 1 } }` after `updateSectionTagFilter('#b')`. Pure cases for `parseTasksView` and `withSectionTag` in `tasks.logic.test.ts`.
- [ ] Vault switch: vault A saves `#a`, vault B saves `#b`, vault C has no `tasksView`. Run the load for C while `tasksStore.sectionTag` still holds `#b`, without `resetTasks()` in between (the double-switch path): it becomes `#to-list`. After switching to B, a change writes only to `/vb/.kokobrain/settings.json`, and no payload written to A's path holds B's text.
- [ ] Issue 030's protected session: after a load where `readTextFile` rejects, changing the section tag leaves `/vault/.kokobrain/settings.json` unwritten for the rest of the session.
- [ ] `TasksView.test.ts` (Issue 234's flush): type `#work`, unmount before 400 ms: `settingsStore.tasksView.sectionTag` is `#work`. Type a tag, call `resetTasks()`, unmount: `settingsStore.tasksView` is unchanged.
- [ ] `app-lifecycle.service.test.ts`: `initializeVault` calls `loadSavedTasksView` once, after `loadSettings` and before `startSettingsPersistence` (`invocationCallOrder`), and a superseded init (the slow-`loadSettings` pattern in the same file) does not call it for the stale vault.
- [ ] `settings.service.test.ts`: an absent `tasksView` stays absent after `loadSettings`; an object, `42` and `null` survive it verbatim, in the store and in the write-back. `settings.store.test.ts`: `updateTasksView` sets the value, `reset()` removes it, `DEFAULT_SETTINGS` has no `tasksView` key.
- [ ] `tasks.service.test.ts`: add `settingsStore.reset()` to the `updateSectionTagFilter` describe's `beforeEach`; `updateSectionTagFilter('#work')` and `('')` leave `settingsStore.tasksView.sectionTag` at `#work` and `''` (real store state, not a spy).
- [ ] `layer-rules.test.ts` stays green with no new baseline entry.

## Notes

- **Size:** M (about 14 files, most of them tests).
- Launch it only by number, never beside a running Tasks view Issue: it edits the same files. It waits on Issue 030 because a settings file that was never loaded must not be saved over; until 030 lands, a failed read followed by a section tag edit would write defaults over the file.
- Do not `structuredClone` a value read back from the store: it is a `$state` proxy, and `structuredClone` throws on proxies.
- Known limit, not handled: a tag typed less than about 900 ms before quitting (the 400 ms view debounce plus the 500 ms persistence debounce) can be lost, because the quit flush writes only what is already in the store.
- Issue 116 keeps `loadSavedTasksView` as the single load point and its call from `initializeVault`. Issue 245 removes the textbox and `tasksStore.sectionTag`, repoints the loader to the query's heading cards and writes the card texts back to `tasksView.sectionTag`; it moves this Issue's round-trip, invalid-value and vault-switch tests to the query instead of deleting them. Issue 123 adds `globalExcludes` to the same key.

## Comments

- 2026-11-12: deep dive applied (SUMMARY 243; refute-243 M1-M6, S1-S7; cross-persistence H1, M1, M2, L2; cross-tests M1). Saving now mutates the store through an in-place `updateTasksView` and never calls `saveSettings`; `parseSettings` passes the key through verbatim instead of the `todoist` merge; the loader is named `loadSavedTasksView`, called from `initializeVault`, with the lifecycle mock; "not written" is defined on the bytes; invalid values, the log and the toast are pinned; the allowed boundary mocks are named. Blocked by 234 and 030. Added the protected-session, double-switch, destroy-flush and Q1 criteria. Per the owner's Q1, an empty saved value loads `#to-list` (refute-243 M7's opposite reading is not applied).

- 2026-11-12: moved to `.scratch/tasks-view-ux/issues/` with the other Tasks view Issues; the 030 edge became a Waits on line, because 030 stays in open-itens.
