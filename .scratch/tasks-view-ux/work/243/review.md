VERDICT: APPROVED

# Review: Issue 243, the Tasks section tags are saved per vault

Reviewed `git diff main...HEAD` (6 commits, 37c624434..c0596b547) in the worktree.

## Acceptance criteria

- [met] Failing test first: `updateSectionTagFilter('#to-list #work')` with persistence running, then advance past the persistence debounce; the last `writeTextFile` payload holds `tasksView` equal to `{ version: 1, sectionTag: '#to-list #work' }`. Then stop persistence, reset both stores, have `readTextFile` return that payload, `await loadSettings('/vault')` and `loadSavedTasksView()`: `tasksStore.sectionTag` is `#to-list #work`. Fails today (the key is dropped and the loader does not exist). One sibling test drives the same path through the textbox, mounted with Issue 110's `mountTasksView`. — `tasks-view-settings.test.ts` "saves a section tag change and restores it at the next load" does exactly this with the real `loadSettings`, persistence and stores; "saves a tag typed in the textbox" uses `mountTasksView`. Probe: deleting the `parseSettings` pass-through line makes the round trip (and 11 other tests) fail, so the test bites.
- [met] A settings file without `tasksView` loads `#to-list` (start from `tasksStore.setSectionTag('#stale')` so the explicit set is proven), with no `error` and no toast, and the load write-back has no `tasksView` key. — "loads #to-list when the file has no tasksView, quietly, and writes none back" starts from `#stale`, asserts no TASKS error, no `toast.error`, one write-back without the key.
- [met] `sectionTag: ''` and `sectionTag: ' , '` load `#to-list`; `sectionTag: ' #a, b '` loads `' #a, b '`. — `it.each([[''], [' , ']])` and "restores a saved text as typed, untrimmed" in `tasks-view-settings.test.ts`; pure cases also in `tasks.logic.test.ts`. `parseTasksView` (tasks.logic.ts:164-171) returns the untrimmed text when `parseSectionTags` finds a tag.
- [met] `it.each` over `42`, `null`, `[]`, `'x'` and `{ sectionTag: 5 }`: the load gives `#to-list`, `error` is called once with the tag `'TASKS'`, `toast.error` once. Every `writeTextFile` payload until the next section tag change (the load write-back, and a write caused by `settingsStore.updateLayout(...)`) carries the value unchanged; assert on the JSON of each payload, not on the call count. Then `updateSectionTagFilter('#work')`: the next payload's `tasksView` equals `{ version: 1, sectionTag: '#work' }`. — The invalid `it.each` asserts the single TASKS `error` call with its message and value, one `toast.error` with the exact text, that an `updateLayout` write happened, and `tasksView` in every payload's JSON; then the `#work` replacement.
- [met] Unknown keys inside `tasksView` survive a save: `{ version: 1, sectionTag: '#a', extra: { x: 1 } }` becomes `{ version: 1, sectionTag: '#b', extra: { x: 1 } }` after `updateSectionTagFilter('#b')`. Pure cases for `parseTasksView` and `withSectionTag` in `tasks.logic.test.ts`. — "keeps unknown keys inside tasksView across a save"; `describe('parseTasksView')` and `describe('withSectionTag')` in `tasks.logic.test.ts` (valid/invalid shapes, version kept or `1`, non-object replaced, no mutation of `raw`).
- [met] Vault switch: vault A saves `#a`, vault B saves `#b`, vault C has no `tasksView`. Run the load for C while `tasksStore.sectionTag` still holds `#b`, without `resetTasks()` in between (the double-switch path): it becomes `#to-list`. After switching to B, a change writes only to `/vb/.kokobrain/settings.json`, and no payload written to A's path holds B's text. — "loads each vault its own tags, and writes a change only to the open vault": C loads `#to-list` from `#b` with no reset; writes after the change all target `/vb`; every `/va` payload holds `#a`.
- [met] Issue 030's protected session: after a load where `readTextFile` rejects, changing the section tag leaves `/vault/.kokobrain/settings.json` unwritten for the rest of the session. — "never writes settings.json of a session whose file could not be read" asserts zero payloads after the debounce and the stop flush. Features code never calls `saveSettings`/`writeSettingsFile` (grep of `src/lib/features/tasks`).
- [met] `TasksView.test.ts` (Issue 234's flush): type `#work`, unmount before 400 ms: `settingsStore.tasksView.sectionTag` is `#work`. Type a tag, call `resetTasks()`, unmount: `settingsStore.tasksView` is unchanged. — Asserts added to "applies a section tag still waiting on its debounce when the view unmounts" and "drops a pending section tag when resetTasks ran before the view unmounts" (`toBe(savedBefore)`), with `settingsStore.reset()` in that describe's `beforeEach`.
- [met] `app-lifecycle.service.test.ts`: `initializeVault` calls `loadSavedTasksView` once, after `loadSettings` and before `startSettingsPersistence` (`invocationCallOrder`), and a superseded init (the slow-`loadSettings` pattern in the same file) does not call it for the stale vault. — Mock factory entry added; "loads the saved Tasks view once, after the settings load and before persistence starts" and "does not load the saved Tasks view for a superseded init". The call sits after the `initVersion` guard (app-lifecycle.service.ts:212-213), so the superseded test would count 2 if it moved above it.
- [met] `settings.service.test.ts`: an absent `tasksView` stays absent after `loadSettings`; an object, `42` and `null` survive it verbatim, in the store and in the write-back. `settings.store.test.ts`: `updateTasksView` sets the value, `reset()` removes it, `DEFAULT_SETTINGS` has no `tasksView` key. — `describe('tasksView')` in both files covers each case.
- [met] `tasks.service.test.ts`: add `settingsStore.reset()` to the `updateSectionTagFilter` describe's `beforeEach`; `updateSectionTagFilter('#work')` and `('')` leave `settingsStore.tasksView.sectionTag` at `#work` and `''` (real store state, not a spy). — Both present, plus a save-before-refetch test and `describe('loadSavedTasksView')` cases on real store state.
- [met] `layer-rules.test.ts` stays green with no new baseline entry. — `layer-rules.test.ts` passes; the diff does not touch `layer-baseline.json` or `BASELINE_SIZE`; `core/settings` imports nothing from `features/`.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- Targeted vitest, exit 0, 68 files / 1546 tests passed: `src/tests/lib/core/settings/`, `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts`, `src/tests/lib/features/tasks/` (incl. the new `tasks-view-settings.test.ts`, `TasksView.test.ts`, `tasks.logic.test.ts`, `tasks.service.test.ts`), `src/tests/lib/pane-toolbar.test.ts`, `menu-item-anatomy.test.ts`, `chrome-type-scale.test.ts`, `chrome-state-styles.test.ts`, `src/tests/lib/architecture/{pure-logic,layer-rules,feature-cycle}.test.ts`, `src/tests/help/`, `src/tests/scripts/sync-wiki-docs.test.ts` (help doc change).
- Probe: removed the `tasksView` pass-through in `parseSettings`; 12 tests failed in `tasks-view-settings.test.ts` and `settings.service.test.ts`; restored, worktree clean.
- Full suite not run: deliver runs it. No `src-tauri/` change, so no cargo.

## Spec and correctness notes

- Save path matches the Issue: `updateSectionTagFilter` writes `withSectionTag(settingsStore.tasksView, tag)` as typed, before `buildTaskIndex`; all three textbox paths (debounce, Clear, destroy flush) route through it (TasksView.svelte:77, 87, 99).
- `updateTasksView` assigns in place; adding a new key to the `$state` proxy is picked up by persistence's `serialize()` (the round-trip test proves the write happens when the key was absent).
- `loadSavedTasksView` is synchronous, always sets the tag, writes nothing, starts no fetch; the log and toast text match the Issue verbatim.
- Help text matches the Issue's sentence.
- No scope creep found.

## Findings

1. nit, src/lib/features/tasks/tasks.logic.ts:150: `DEFAULT_SECTION_TAG = '#to-list'` duplicates the literal in `tasks.store.svelte.ts:12` and `:55`; a later default change has to touch both. Fix (optional): have the store import the constant from `tasks.logic.ts` (stores may import `.logic.ts`), or leave it, since Issue 245 removes `tasksStore.sectionTag`.

## Resolution

1. nit, `DEFAULT_SECTION_TAG` duplicate literal: rejected, left as is. The review marks the fix optional, and Issue 245 (`245-tasks-sources-panel-and-textbox-removal.md`) removes `tasksStore.sectionTag`, which takes the store's two literals with it. Changing the store now would only add a source change that needs another review round before delivery.
