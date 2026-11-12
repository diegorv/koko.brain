# Dossier: tickets 123 (view state survives a restart) and 124 (saved views, "To list" migration)

Read-only research at HEAD `d2304ac9e` (docs-only commits on top of the code state). Paths are relative to the repo root. "F" marks a fact verified in code or tickets at HEAD. "I" marks inference about code that does not exist yet because predecessor tickets have not landed.

Tickets read in full: 123, 124, and their chain 108, 242, 243, 110, 234, 236, 109, 111, 238, 239, 113, 112, 240, 241, 115, 116, plus 030, 121, 122, 129. Background: `.scratch/archived/tasks-view/PRD.md` ("One query model" 265-289, "Storage" 309-313, "Lists and views" 203-209, A4, A6), `.scratch/tasks-view-ux/research/scout-15-state-persistence.md`.

## 0. Headline findings

1. F. Nothing in the Tasks view is persisted at HEAD (`src/lib/features/tasks/tasks.store.svelte.ts:4-33`). There is no `tasksView`, `TaskQuery`, `savedViews` or `activeList` anywhere in `src` or `e2e`. Everything 123 and 124 extend is created by 108..116 and 243; this dossier states what those tickets promise and marks it "I".
2. F. The settings save path is generic and effect-driven: `startSettingsPersistence` (`src/lib/core/settings/settings-persistence.svelte.ts:46-66`) serializes the whole store inside a `$effect.root` and debounces a write 500 ms. "Follow the existing save path, no new `writeTextFile` site" therefore means: put the data into `settingsStore` and let that effect write it. The only `writeTextFile` site stays `writeSettingsFile` (`settings.service.ts:251-264`).
3. F. `loadSettings` writes the store back to disk right after a successful parse (`settings.service.ts:68-74`), and `parseSettings` rebuilds the object section by section (`:82-198`), dropping any top-level key it does not name. So (a) `tasksView` must be added to `parseSettings` or it is erased on load, and (b) it must be passed through verbatim (not validated in core) or the write-back would already "overwrite" an invalid `tasksView: 42` and break 123's criterion "not written until the next change".
4. I. Ticket 124 removes the single persisted `query` that 123 introduces (`tasksView` becomes `{ version, activeList, globalExcludes, savedViews }`, edits are session-only until Issue 126/29). After 124, quick filters, group and sort edits on a list no longer survive a restart. 123's `query` persistence is therefore a stepping stone that 124 reads once and drops. The implementer of 123 should keep the `query` part small and isolated.
5. I. Dependency gap: 243 (creates the `tasksView` key and plumbing) is blocked by 242 and 030 but is not in anyone's `Blocked by` chain; 116 and 123 rely on it in prose only (123 Comments; 116 "Default source"). 123 must verify at start whether the 243 plumbing exists, and the plan below covers creating it if it does not.
6. F. Ticket status mismatch: 123 is `needs-triage` yet 124 (`ready-for-agent`) is blocked only by 123. 123 says "Otherwise fully specified", so it should be set to ready-for-agent before a relay run, or the run is refused/blocked.

## 1. Code map

### 1.1 Settings core (F at HEAD, all `src/lib/core/settings/`)

| Site | HEAD line | What 123 does there |
|---|---|---|
| `settings.types.ts` `AppSettings` | `:390-446` (last field `dockBadgeInboxCount` at `:445`; `todoist` at `:403-404`) | Add `tasksView?: unknown` with a doc comment like `railListPrefs` (`:109-116`: "Loaded unvalidated ... `core/` cannot import `features/`, so the type stays `unknown`"). Optional so literals of `AppSettings` in tests keep compiling. 243 adds this key first (I); 123 only re-documents it. |
| `settings.store.svelte.ts` `DEFAULT_SETTINGS` | `:162` end of object | Do NOT add a `tasksView` default. An absent key means "no saved state"; a default object would be written to every existing vault's `settings.json` at the load write-back. |
| `settings.store.svelte.ts` getters | `:167-198` | Add `get tasksView() { return settings.tasksView; }` (243 adds it, I). |
| `settings.store.svelte.ts` updaters | `updateLayout` `:248-253` (in-place `Object.assign`, with the comment why), `updateTodoist` `:319-325`, `reset` `:404-406` | `updateTasksView(value: unknown)` must assign in place (`settings.tasksView = value`), as `updateLayout` does: replacing the root re-runs every settings reader app-wide, and view edits (palette command, search typing) are frequent. `reset()` already clones defaults, so the key disappears. |
| `settings.service.ts` `parseSettings` | `:82-198`; `todoist` merge `:160-163`; last keys `:194-195` | Add `tasksView: parsed.tasksView,` (verbatim, no spread, no default). The ticket points at the `todoist` merge as the model, but a spread merge is wrong for an opaque value: `{...undefined, ...42}` would silently turn 42 into `{}`. |
| `settings.service.ts` `loadSettings` | `:36-76`; write-back `:68-74` | 030 makes it return a load outcome (I: `'loaded' | 'defaults-written' | 'file-protected'`). No change needed in 123 beyond relying on it. |
| `settings.logic.ts` `normalizeSettings` | `:217-240` | No change. It spreads `...settings`, so `tasksView` passes through by identity. |
| `settings-persistence.svelte.ts` | `:46-66` effect; baseline `lastWritten = serialize()` at `:50`; flush `:73-87` | No change in 123. After 030 it will refuse to write for a `file-protected` session (I), which also covers Tasks edits for free. |

### 1.2 Lifecycle wiring (F)

`src/lib/app/lifecycle/app-lifecycle.service.ts`:
- `:154` `void stopSettingsPersistence()` in the unconditional "double-switch window" at the top of `initializeVault`.
- `:210` `await loadSettings(vaultPath)`, `:212` `if (initVersion !== version) return;`, `:222` `startSettingsPersistence(vaultPath)`. This is where Tasks state must be restored: after the `:212` guard, before or right after `:222`.
- `:601` `void stopSettingsPersistence()` inside `teardownVault`, `:656` `resetSettings()`, `:664` `resetTasks()`. Order matters: settings are reset before tasks, so a live Tasks-to-settings effect would write default Tasks state into the next vault's settings object. `resetTasks()` must stop the Tasks persistence synchronously as its first statement.
- Test: `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts:189-192` mocks `#lib/features/tasks/tasks.service.js` as `{ buildTaskIndex, resetTasks }` only. Importing any new function from that module into the lifecycle makes the existing suite fail until the mock factory gets the new export (changed on purpose). `:1655-1680` `expectIncreasing(...)` pins teardown order; add nothing there if `resetTasks` stays the stop point.

### 1.3 Tasks feature (F at HEAD, then I for what predecessors change)

HEAD: `tasks.store.svelte.ts:4-33` (five module `$state`s: `fileTaskGroups`, `dateFilter`, `sectionTag='#to-list'`, `hideCompleted`, `isLoading`; `reset()`), `tasks.service.ts` (`buildTaskIndex :65-86`, `updateSectionTagFilter :96-99`, `toggleTask :130-167`, `resetTasks :227-231`), `TasksView.svelte` (textbox `:31-44`, `:126-132`; date pills `:25-29`, `:94-104`; eye `:108-121`), no persistence module.

Predecessor state 123 assumes (I, from the ticket texts):

| Ticket | Relevant state at the time 123 runs |
|---|---|
| 108 | `hasLoaded`, rule sentence; `sectionTag` still the filter. |
| 242 | `parseSectionTags(text)` in `tasks.logic.ts`; several tags. |
| 243 | `AppSettings.tasksView` opaque; `parseSettings` passthrough; a `features/tasks` parse/validate function for `{ version: 1, sectionTag }`; load into `tasksStore.sectionTag` when settings load (call site not specified by the ticket: lifecycle or view, see 4.1); save from `updateSectionTagFilter`; error()+toast on invalid; unknown keys inside `tasksView` survive. |
| 110, 234, 236, 109 | `isTaskOpen`, `statusGlyph`, path order, error field, scroll offset, chips. No effect on persistence. `tasksStore.reset()` clears scroll/error (234). |
| 111 | `tasksStore.quick: { show, statuses? }`, `rows`, `setQuick`, `resetQuick`, `visibleRows` (module `$derived`, ADR-0034). |
| 238, 239 | `quick.due`, `quick.priorities`, `quick.tags`, `quick.search`. |
| 113 | Current-row `{filePath,lineNumber}` in store (transient); palette `tasks:status-filter` mutates `quick` from outside the view. |
| 112 | `tasksStore.group: 'note'|'folder'|'due'|'priority'|'status'` default `'note'`, `setGroup`; `sort: TaskSortKey[]` fixed `['due','priority','path']`; `groups` getter. 112 says explicitly that `sort` is in the store "so Issues 123 and 126 can persist" it. |
| 240 | `collapsedKeys` in store, session-only (ticket: "Issue 123 decides persistence"). 123's text does not list collapse, so it stays session-only. |
| 241 | `setTaskStatus`, row menu, Undo. No effect. |
| 115 | Fetch from entries snapshot; `matchesHeading(headings, tags, 'tag')`; `tasksStore.fileTaskGroups` unused. |
| 116 | `tasksStore.query: TaskQuery { version:1, sources, exclude: TaskExcludes, quick }`; `quick` getter reads `query.quick`; sources panel; the section tag textbox and `tasksStore.sectionTag` are REMOVED; default source = one `{kind:'heading', text, match:'tag'}` card per tag from `tasksView.sectionTag` or `#to-list`; heading-card texts are written back to `tasksView.sectionTag` (space-joined) "until Issue 123 saves the whole query". `Clear` button sets `sources` to `[]`. |

Consequences for 123's code map (I):
- `group` and `sort` live beside `query` in the store (116 only moves `quick` into `query`; 112 adds them as separate fields). 123 says `query` on disk holds "sources, quick filters, group and sort", so the on-disk `query` is a composition: `{ sources, quick, group, sort }`, while `globalExcludes` is `tasksStore.query.exclude`. Mapping lives in the new pure logic file, not in the store.
- The 116 write-back of heading cards into `tasksView.sectionTag` is the piece 123 replaces: find it (grep `sectionTag` in `src/lib/features/tasks/` after 116) and delete it in the same commit.

### 1.4 Tests and fixtures that touch the same ground (F at HEAD)

- `src/tests/lib/core/settings/settings-persistence.test.ts` (251 lines): jsdom, fake timers, mocks only `@tauri-apps/plugin-fs`, real `settingsStore` and `vaultStore`; `settle()` helper `:28-31`, `writtenSettings()` `:33-37`. Template for the new round-trip test.
- `src/tests/lib/core/settings/settings.service.test.ts` (1497 lines): `loadSettings` block from `:48`; section merge cases (`eventCalendar` `:829-903`, `tagColors` `:919-940`, `dockBadgeInboxCount` `:181-198`). Add the `tasksView` passthrough cases here.
- `src/tests/lib/core/settings/settings.store.test.ts`: per-field getter and updater cases.
- `src/tests/lib/features/tasks/tasks.store.test.ts` (58 lines), `tasks.service.test.ts` (533 lines; mocks `#lib/utils/debug.js` with only `debug/error/timeAsync` at `:11-15` and `svelte-sonner` with `toast.error/info` at `:17-19`).
- `src/tests/lib/architecture/layer-rules.test.ts` (baseline `layer-baseline.json`, size 3), `pure-logic.test.ts` (a `.logic.ts` may not import stores, services, `utils/debug.ts`, svelte, tauri), `feature-cycle.test.ts` (+ `feature-cycle-baseline.json`).
- `e2e/specs/tasks-view.spec.ts`: no settings interplay in 123.

## 2. Ticket 123: acceptance criteria, tests, failing-first

New files proposed (names are suggestions): `src/lib/features/tasks/tasks-view-state.logic.ts` (pure parse/serialize), `src/lib/features/tasks/tasks-view-persistence.svelte.ts` (effect root, like `settings-persistence.svelte.ts`), tests `src/tests/lib/features/tasks/tasks-view-state.logic.test.ts` and `tasks-view-persistence.test.ts`.

| AC | Test file and shape | Existing tests changed | Does it fail first, and why |
|---|---|---|---|
| 1. Round trip: add a folder card and set Group by due; saved JSON holds both under `tasksView`; a fresh load restores them | `tasks-view-persistence.test.ts`, `// @vitest-environment jsdom`, fake timers, mock only `@tauri-apps/plugin-fs` (`exists`, `readTextFile`, `writeTextFile`, `mkdir`, `copyFile`) and `svelte-sonner` (side-effect, other tests mock it too). Real `settingsStore`, `tasksStore`. Flow: `loadSettings('/v')` (readTextFile `'{}'`), restore function, `startSettingsPersistence('/v')`, call the same store methods the 116 panel uses to add a folder source, `tasksStore.setGroup('due')`, `await settle()` (0 then 500 ms), parse last `writeTextFile` call: assert `tasksView.query.sources` holds the folder clause and `tasksView.query.group === 'due'`. Then `stopSettingsPersistence()`, reset both stores, feed the written JSON back through `readTextFile`, load and restore, assert `tasksStore.query.sources` and `tasksStore.group`. Assert on real store state, not on `toHaveBeenCalled` alone. | None. | Yes, an assertion failure, not only a missing import: today nothing mirrors Tasks state into `settingsStore`, so after the store edits no `writeTextFile` call happens at all, and `writtenSettings().tasksView` is `undefined`. Because the restore function does not exist yet, first add an empty stub so the test compiles, see it fail on the assertion, then implement. |
| 2a. File without `tasksView` loads defaults | Same file. After load+restore: `tasksStore.query` equals the default (one heading card `#to-list`, four excludes on, `quick.show='open'`), `group='note'`. Also assert the on-disk JSON written at load has no `tasksView` key (no churn for existing vaults) and `settings.service.test.ts`: `parseSettings` of a file without the key leaves `settingsStore.settings.tasksView` `undefined`. | None. | The defaults half passes today (it is the 116 default); the "no `tasksView` key is written" half is the regression guard against adding a default to `DEFAULT_SETTINGS`. State this in the test name so nobody thinks it is vacuous. |
| 2b. `tasksView: 42` loads defaults, logs, is not written until the next change | Same file, mock `#lib/utils/debug.js` (`debug`, `error`) as `tasks.service.test.ts:11-15` does. Load a file whose `tasksView` is `42`; restore; assert `error` called with a `'TASKS'` tag, `toast.error` called, `tasksStore` at defaults. Then run all timers: every `writeTextFile` call to `settings.json` (load write-back included) still carries `tasksView === 42`. Then change the group: the next write carries a `tasksView` object with `version: 1`. | None. | Yes. Pitfall: `loadSettings` itself writes the store back (`settings.service.ts:68-74`). The criterion holds only because core passes `42` through verbatim; the assertion "all writes carry 42" is what proves it. If an implementer validates in `parseSettings`, this test goes red, which is the intent. |
| 3. Unknown keys inside `tasksView` survive a save | Same file. Seed `tasksView: { version: 1, futureKey: { a: 1 }, query: {...} }`, restore, change the group, assert the written `tasksView.futureKey` deep-equals the seed. Also a pure test of the serializer: `serializeTasksView(existing, state)` keeps unknown top-level keys of `existing`, and returns a fresh object when `existing` is not a plain object. | None. | Yes, the serializer is new. Decide scope: top-level unknown keys only (4.7). |
| 4. `layer-rules.test.ts` stays green, no baseline entry | No new test. Run `layer-rules`, `pure-logic`, `feature-cycle`. | None. | Not a failing-first item; it is a gate. It would turn red if core imported `TaskQuery`/`TaskExcludes` (core to features), if the `.logic.ts` imported a store or `debug.ts` (pure-logic), or if `app` ordering created a feature pair. Keeping `tasksView` as `unknown` in core and returning `{ ok: false }` from the logic (log and toast in the service) satisfies all three. |

Extra tests I recommend (CLAUDE.md "every computed getter" and "every suite covers happy, empty, error"):
- `tasks-view-state.logic.test.ts`: parse of a full valid object; each key missing; a wrong-typed field; an unknown `group`/`sort`/`quick.show` value; `version` missing or `2`; clause shapes (folder/type/noteTag/heading, `negate`); arrays of the wrong element type; empty object; `serialize(parse(x))` is stable.
- `settings.store.test.ts`: `updateTasksView` sets in place and `reset()` clears it. `settings.service.test.ts`: object and non-object `tasksView` round trip through `loadSettings` unchanged.
- `tasks-view-persistence.test.ts`: starting persistence does not write (baseline), `resetTasks()` stops it (a store change after reset does not touch `settingsStore.tasksView`), and a vault switch loads the second vault's state, never the first's (243 has the same criterion; reuse its test shape).
- `app-lifecycle.service.test.ts`: `restoreTasksView` runs after `loadSettings` and is not called when `initVersion` moved on.

## 3. Ticket 123: implementation plan (one context window)

Order of edits, each step verified before the next. Repo rule 10 of the project CLAUDE.md (commit after each task) and test-first apply; gate is `pnpm check` + `pnpm vitest run` (frontend only).

0. Orient: read the files the predecessors landed: `tasks.store.svelte.ts`, `tasks.service.ts`, `task-query.logic.ts`, `tasks.types.ts`/query types, the 243 parse function and its call site, the 116 write-back of `tasksView.sectionTag`. Confirm 030 landed (`loadSettings` return type). If 243 is missing, do steps 1-3 yourself and say so in the delivery.
1. Failing tests first (section 2): write `tasks-view-persistence.test.ts` AC 1-3 against stubs; run, see red for the stated reasons.
2. Core plumbing (skip what 243 already did): `settings.types.ts` `tasksView?: unknown`; store getter plus in-place `updateTasksView`; `parseSettings` passthrough line; tests in `settings.store.test.ts` and `settings.service.test.ts`.
3. Pure logic `tasks-view-state.logic.ts` (tabs, JSDoc on every export): `parseTasksView(raw: unknown)` returning `{ ok: true; state } | { ok: false }` (never throws, no logging), `DEFAULT_TASKS_VIEW_STATE` builder taking the saved section tags (or none) and returning the default heading cards, `serializeTasksView(existing: unknown, state)` returning `{ ...plainObject(existing), version: 1, globalExcludes, query: { sources, quick, group, sort } }`, and the legacy read: if `query` is absent and `sectionTag` is a non-empty string, sources = one heading card per `parseSectionTags(sectionTag)` token; empty/absent gives the single `#to-list` card. Make validation strict on types, tolerant on missing keys. Unit tests first.
4. Persistence module `tasks-view-persistence.svelte.ts`, modeled on `settings-persistence.svelte.ts:46-105`: `startTasksViewPersistence()` stops any running session, captures a baseline string of `JSON.stringify(snapshot())` and installs `$effect.root(() => $effect(() => { const next = snapshot(); if (JSON.stringify(next) === baseline) return; baseline = ...; settingsStore.updateTasksView(serializeTasksView(untrack(() => settingsStore.tasksView), next)); }))`. Read the existing `settingsStore.tasksView` inside `untrack` so the effect does not also subscribe to settings. `stopTasksViewPersistence()` disposes synchronously. The settings effect then debounces and writes: no debounce needed here.
5. Service: `restoreTasksView()` in `tasks.service.ts` (or reuse the 243 loader name): `parseTasksView(settingsStore.tasksView)`; on `ok:false` with a defined, non-undefined raw value: `error('TASKS', 'Invalid tasksView in settings.json, using defaults', raw)` plus a fixed-message `toast.error` (never raw error text); apply the state to `tasksStore` through its setters (no `updateTasksView` call, so no write); then `startTasksViewPersistence()`. `resetTasks()` (`tasks.service.ts:227`) calls `stopTasksViewPersistence()` first.
6. Lifecycle: in `initializeVault` call `restoreTasksView()` after the `:212` guard and before `startSettingsPersistence` (`:222`). Update the `vi.mock` factory at `app-lifecycle.service.test.ts:189-192` and add an ordering test. If 243 already placed a loader call, replace it with this one instead of adding a second.
7. Remove the 116 write-back of heading texts into `tasksView.sectionTag`; stop reading `sectionTag` once `query` exists (legacy read only when `query` is absent). Do not delete a stored `sectionTag` key in 123 (it is an unknown key; 124 migration drops it, see 4.5).
8. Update `help/documentation/10-tasks-and-todoist.md` (PRD A12): the view remembers sources, excludes, filters, grouping and sort per vault. Replace the 243 sentence about the section field if 116 removed the field.
9. Gate: `pnpm check`, `pnpm vitest run` (full, since settings and lifecycle tests changed); explicitly run `layer-rules`, `pure-logic`, `feature-cycle`. Commit with the full-format message (Context, Problem, Solution, Behavior, Files).

## 4. Ambiguities (guess points) and most likely readings

123:
1. Where does hydration run? The 243 text says "when the vault's settings have loaded" and names no call site. Most likely and recommended: `initializeVault` after `loadSettings` (needed because the palette command `tasks:status-filter` of 113 can mutate `quick` before the view ever mounts, and `TasksView` unmounts on every tab switch, `EditorView.svelte:72-73`). Use whatever 243 chose.
2. How does a store change reach `settingsStore`? Not specified. Recommended: one `$effect.root` mirror (step 4) rather than editing every setter, because 116's panel and 113's palette write the store from several places. Note `tasks.service.ts` is a plain `.ts` file and cannot hold runes, hence a `.svelte.ts` module.
3. What does "invalid value" mean? `tasksView: 42` is clear. For a wrong-typed field inside, `version: 2`, or an unknown `group` string, the ticket is silent. Most likely: any value that fails parsing means whole-state defaults plus log plus toast; missing keys silently default. Risk: a newer app's `version: 2` or a future `group` ('type', Issue 118) is treated as invalid and later overwritten, losing it. Decide and test it.
4. Does `quick.search` persist? Ticket says "quick filters". Typing sets it per keystroke (239), each keystroke would serialize the whole settings object twice (scout-15, finding 5) and a restart would reopen with a stale search hiding rows. Recommended and flagged for the owner: exclude `search` from the persisted shape (and from the baseline comparison). Fallback reading: persist the whole `quick` object.
5. Legacy `sectionTag`: 123 says to read it once into heading cards and stop writing. If `query` exists it must win over a stale `sectionTag`. The ticket does not say whether to delete the key.
6. `globalExcludes` vs `query.exclude` in 123: the ticket puts the four toggles and the lists under `globalExcludes` and omits `exclude` from `query`. In 123's store there is only `query.exclude` (116), so persistence maps `query.exclude` to `globalExcludes` and the saved `query` has no `exclude`. 124 introduces the real split. Do not add a store field in 123.
7. Unknown keys: preserved at the top level of `tasksView` (what the criterion tests). Unknown keys inside `query` and `globalExcludes` are dropped on rebuild. Most likely intended; stating it avoids a half-hearted preserve-everywhere implementation.
8. `sort` is always the fixed array today; persist it anyway (112's own text says so) but accept only members of `'due'|'priority'|'path'`.
9. Collapsed groups (240) and the current row (113): session-only; not in 123's list.
10. 030 interplay: no extra Tasks code. A `file-protected` session keeps Tasks edits in memory only, via the settings persistence guard.

124 (see section 5 for the plan):
11. Seeding condition. The migration text seeds "To list" unconditionally when `savedViews` is missing (owner revision of B1 on 2026-11-12), while the test text says "a vault whose snapshot has a `## Inbox #to-list` heading". The PRD (line ~210) says "a vault with a `#to-list` heading gets a seeded view". Most likely: unconditional, since the owner said the view must never default to every task; the heading in the test only makes the list non-empty. No snapshot access is needed for seeding.
12. What exactly does the seed hold when 123's `query` already exists? "Current heading cards (the saved section tags ... or the `#to-list` card)". Recommended: the heading-kind cards of the 123 `query.sources` (or the sectionTag-derived cards when no `query`), else one `#to-list` card; quick/group/sort defaults. Non-heading cards (folder, type) and quick filters a user built under 123 are not carried over. Conflict in the text: "Issue 16's single query is read once as the active session state" versus "the vault then opens on To list". Most likely reading: seed, set `activeList` to the new view, and the session query starts as that view's query (the legacy `query` is read only to build the seed). Flag it: a user who built a custom 123 query loses it on first open after 124.
13. Legacy keys: 124's shape has no `query`. Recommended: the migrating write removes `query` and `sectionTag` (both known legacy keys), keeps truly unknown keys. Otherwise both linger forever. Needs a one-line owner nod; the alternative (leave them) is harmless but stale.
14. "Once per vault" key: `savedViews` presence. A user who deletes every view leaves `savedViews: []`, which must be written explicitly (not omitted) or the seed returns. Test it.
15. Active list on unknown id (view deleted, hand edit) and after deleting the active view: unspecified. Likely: fall back to the first saved view, else the built-in "All open". Note the tension with "never defaults to every task"; with no saved views there is no alternative.
16. "+ Save view": name entry UI (inline input, popover or dialog), empty or duplicate names, whether the new view becomes the active list, and the duplicate naming ("X copy"). Unspecified; likely: inline input in the column, trimmed non-empty name, duplicates allowed or suffix-numbered, new view becomes active with no pending edit.
17. What "All open" holds precisely: `sources: []`, view exclude empty, `quick.show='open'`, `group='note'`, default sort. Built-in id reserved (for example `all-open`); saved view ids from `crypto.randomUUID()` (precedent `kanban.logic.ts:34`, `trash.logic.ts:46`) generated in a service, not in the pure logic.
18. View `exclude` shape: reuses `TaskExcludes` where the four booleans default to off for a view's own excludes (they add to the global ones). Merge rule: boolean OR, lists concatenated and de-duplicated, never subtract. Not written in the ticket beyond "only adds".
19. Where the view's own excludes are edited. The ticket only defines the "Global" section of the Sources panel; the existing 116 exclude section presumably becomes the "This list" part. Likely, but it changes 116's panel markup and its tests.
20. Narrow mode (< 720 px): do it as 239 does, both renderings in the DOM and container-query classes hide one (no resize observer; jsdom then sees both). Unit tests must scope by `data-` hooks, not by role/name.
21. Edited-list state in the session: no "modified" marker yet (Issue 126/29). Switching lists silently drops edits; a restart reopens the last list without the edits. This reverses 123's headline for the active list. Say so in the help text.

## 5. Ticket 124: acceptance criteria, tests, plan

### 5.1 Code map (I unless marked)

- `tasks-view-state.logic.ts` (from 123): new shape `{ version:1, activeList, globalExcludes, savedViews: {id,name,query}[] }`, plus legacy `query` and `sectionTag` reads for the one-time migration. Pure helpers (new, in `task-query.logic.ts` or a `task-views.logic.ts`): `BUILTIN_ALL_OPEN`, `mergeExcludes(global, own)`, `seedToListView(legacy)`, `resolveActiveList(state)`, `renameView`, `duplicateView`, `deleteView` (all pure, immutable).
- `tasks.store.svelte.ts`: add `activeList`, `globalExcludes`, `savedViews`; `tasksStore.query.exclude` becomes the active view's own exclude; the `visibleRows` derived (111/116) must call the source selector with `mergeExcludes(globalExcludes, query.exclude)`. ADR-0034 applies: any new computed getter gets a test.
- `tasks.service.ts`: `selectList(id)`, `saveView(name)`, `renameView`, `duplicateView`, `deleteView` (mutate store only; persistence writes). `restoreTasksView` gains the migration.
- `tasks-view-persistence.svelte.ts` (from 123): persisted snapshot becomes `{ activeList, globalExcludes, savedViews }`; session `query` is no longer persisted.
- `TasksView.svelte` (region: root `@container` from 109, filter row 111, rule sentence 108, sources panel 116): new list column left of the list (below 720 px a dropdown above the sentence), row menu (rename, duplicate, delete) via `#lib/components/ui/dropdown-menu/`, "+ Save view". Not `pane-toolbar`: `src/tests/lib/pane-toolbar.test.ts:30-50` allows exactly one per file and forbids height, padding, gap and `flex-wrap` overrides on it.
- Sources panel (116): add a "Global" section editing `globalExcludes`; the existing exclude section edits the view's own `exclude`.
- `e2e/specs/tasks-view.spec.ts` (F at HEAD: every test fills the section textbox, `:17-21`, `:27-29`, `:37-39`, `:68-70`, `:98`; after 116 these become the "Clear" button): after 124 the vault opens on the seeded "To list" view, so the spec must first pick "All open" (or use Clear).
- `help/documentation/10-tasks-and-todoist.md`: lists, saved views, Global excludes.
- `app-lifecycle.service.test.ts` mock: no new export if `restoreTasksView` was already added in 123.

### 5.2 Acceptance criteria and tests

| AC | Test shape | Fails first because |
|---|---|---|
| Vault with a `## Inbox #to-list` heading and no `savedViews` gets a "To list" view, active list is "To list". Saved tags `#to-list #work` seed both heading cards. A second load does not reseed | `tasks-view-persistence.test.ts` (same harness as 123): file with `tasksView: { version:1, sectionTag: '#to-list #work' }` (and one with `query` from 123), load+restore, assert `tasksStore.savedViews` has one view named "To list" with two heading cards and `activeList` equals its id; persist (advance timers), reload the written JSON, restore again, assert exactly one "To list" view. Pure seed tests in `task-views.logic.test.ts`. | `savedViews` does not exist. |
| Save, rename, duplicate, delete round trip through `settings.json` | Same harness: perform each service call, advance timers, parse the written JSON, restore into reset stores, compare. Include "delete all views leaves `savedViews: []` and a reload does not reseed". | No such API, nothing written. |
| A view exclude adds to the global ones and never removes one | Pure `mergeExcludes` cases (global archived true + own false stays true; folder lists unite) plus one store-level case through `tasksStore.visibleRows` with a real archived-note row. | `mergeExcludes` missing; at HEAD there is only one exclude set. |
| Switching from an edited list to another drops the edit; the saved view is unchanged on disk | Edit quick filters on "To list", `selectList(other)`, then back: session equals the saved query; the last `writeTextFile` content has the original `savedViews[i].query`. | No list switching exists. |

Additional: `mergeExcludes` property-style cases, `resolveActiveList` fallbacks, rename/duplicate/delete pure tests, narrow-mode markup test (both renderings present, scoped by `data-` hooks), `TasksView.test.ts` for picking a list, "+ Save view", row-menu actions; e2e: open "All open" and assert the fixture tasks, one saved view survives `page.reload` only if the e2e FS keeps `settings.json` (a page load wipes the mock FS per `rail-styles.spec.ts:124`, so do not assert persistence in e2e).

### 5.3 Plan (L; order of edits)

Recommended internal split into two commits (each independently green), because the whole ticket likely exceeds one comfortable context window:

A. Model and persistence (no UI): tests first for migration, merge, CRUD, round trip; pure logic; store fields; persistence snapshot switched to the new shape; `restoreTasksView` migration (seed, `activeList`, remove legacy keys); `visibleRows` uses merged excludes; delete the 123 `query` persistence path. Gate: `pnpm check`, `pnpm vitest run`.
B. UI: list column and narrow dropdown, Save view, row menu with rename UI, Global section in the Sources panel, `TasksView.test.ts` additions, e2e update (pick "All open" first; handle both wide column and dropdown mode: the Tasks pane can be under 720 px at small viewports, so use a helper that works in either mode or fix the viewport), help doc, `bash scripts/e2e.sh` (never `pnpm dev` by hand).

If the relay run must stay one ticket, step A alone is the safe stopping point and B can be a follow-up Issue.

## 6. Risks

1. Dependency gap on 243 and the 123 `needs-triage` status (section 0).
2. Per-keystroke cost: search typing (239) hits the settings effect twice per key if `search` is persisted (section 4.4). Use in-place `updateTasksView`; consider excluding `search`.
3. Teardown order: `resetSettings()` (`:656`) runs before `resetTasks()` (`:664`). Without a synchronous stop at the top of `resetTasks`, the Tasks effect writes default state into the next vault's freshly reset `settingsStore`. Add a test for it (quick reference rule 4 warns about silent regressions when reset calls move).
4. The double-switch window (`app-lifecycle.service.ts:154`): the settings persistence is stopped there; the Tasks persistence is stopped by `restoreTasksView`'s stop-then-start (and by `resetTasks` when teardown runs). Harmless because `loadSettings` replaces the store wholesale, but keep stop-then-start semantics.
5. Core must not import features (`layer-rules.test.ts`, ADR-0003). The persistence module lives in `features/tasks` and imports `core/settings` (allowed). `pure-logic.test.ts` bans stores, services and `utils/debug.ts` from the `.logic.ts`; logging and toast belong to the service.
6. The `loadSettings` write-back would overwrite an invalid `tasksView` if core validated it (section 0.3). Keep the passthrough verbatim.
7. A settings file that failed to load must not be saved over: that is 030. Without it, a Tasks click would become a new trigger for overwriting an unreadable file; this is why 123 waits on 030.
8. 124 undoes 123's persisted `query` (section 0.4, 4.21). The owner-visible effect: filters and grouping edits no longer survive a restart for the active list until Issue 126. State it in the delivery and the help doc.
9. 124 changes what the e2e spec sees first (To list is empty for the fixture vault, which has no `#to-list` heading). `button` roles inside the list column or dropdown can be absent depending on pane width; Playwright ignores `display:none` elements, jsdom does not.
10. `tasksStore.reset()` is called by many tests (`beforeEach`), including `TasksView.test.ts:62`; the new store fields must reset to the defaults those tests assume (heading card `#to-list`, `activeList` unset).
11. Tests that change on purpose: `app-lifecycle.service.test.ts` mock factory (123), `tasks.store.test.ts` `reset()` cases (new fields), `TasksView.test.ts` default-source assumptions after the active list exists (124), `e2e/specs/tasks-view.spec.ts` (124). The `settings.service.test.ts` suite should not change except by additions.
12. Claims in the tickets that code or sibling tickets contradict or leave open:
    - 123 names the `todoist` merge (`settings.service.ts:160-162`, F at `:160-163`) as the model, but that spread merge is wrong for an opaque value (0.3).
    - 124's test mentions a snapshot but seeding needs none (4.11).
    - 124 says the 116 `exclude` is the view's; 116's panel has no "Global" notion, so the panel is edited by both tickets.
    - 123 says `core/settings` should type `tasksView` as "an opaque JSON value". `JsonValue` exists (`src/lib/contracts/generated/serde_json/JsonValue.ts`) and `contracts` is an open layer, but `unknown` avoids a cast on read and matches `railListPrefs`.
13. No IPC or ts-rs contract changes, no Rust, no `INDEX_SCHEMA_VERSION`. Indexing rules are not touched: no `applyNoteChange`, no new `writeTextFile` site, no absolute-path concern (saved folder clauses are vault-relative by 116's definition).
14. Not verified: behavior of `$effect.root` plus `untrack` under vitest for the new module (the settings equivalent runs under jsdom, `settings-persistence.test.ts:1-3`), the exact names of the 116 store methods and 243 loader, and the real width of the Tasks pane at the e2e default viewport.

## 7. Size

- 123: M. About 8 touched source files (3 settings core one-liners, one pure logic file, one `.svelte.ts` module, `tasks.service.ts`, `tasks.store` if a bulk setter is needed, lifecycle, help doc) and 5 test files. Fits one context window if the implementer reads the landed 116/243 code first (about 6 files).
- 124: L. Model and migration (about M) plus list column, narrow dropdown, row menu, rename UI, panel "Global" section, e2e rewrite and help doc (about M). Borderline for one window; split as in 5.3, or deliver A and open a follow-up Issue for B.
