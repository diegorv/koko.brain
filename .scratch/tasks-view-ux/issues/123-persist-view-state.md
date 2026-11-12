# 123: The Tasks excludes and heading tags survive a restart

**Origin:** `tasks-view` Issue 16, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/tasks-view/`. Shrunk on 2026-11-12 by the owner's Q3 after the deep dive (`.scratch/tasks-view-ux/research/deep-dive/SUMMARY.md`, `dossier-123+124.md`, `cross-persistence-sources.md`). Issue numbers in this text keep the open-itens numbering: the Tasks view Issues live in `.scratch/tasks-view-ux/issues/`, the others (030, 085, 151, 198, 204, 205 and the rest) in `.scratch/open-itens/issues/`.

**What to build:** After Issue 245 only the texts of the tag heading cards survive a restart, as the free text `tasksView.sectionTag`; the excludes edited in the Sources panel are lost. Save the global excludes per vault, and move the saved heading tags into a normalized field that Issue 124 seeds the "To list" view from. Nothing else is saved here: other source cards, quick filters, `groupBy`, `sort`, collapsed groups (Issue 240) and the current row (Issue 113) stay session-only. Issue 124 then stores whole queries in saved views.

**Plumbing.** Reuse Issue 243's: `AppSettings.tasksView?: unknown` with the verbatim pass-through in `parseSettings`, `settingsStore.tasksView` and the in-place `settingsStore.updateTasksView`, and the single loader `loadSavedTasksView` that `initializeVault` calls after `loadSettings`. `core/settings` never imports `TaskQuery` or `TaskExcludes`, not even as a type. Add no `$effect` mirror from `tasksStore` to settings: writes happen in the service functions that apply a change, as Issue 245's `setTaskSources` does, so a mirror cannot write the previous vault's state on the double-switch path.

**Shape.** `tasksView` becomes `{ version: 1, globalExcludes: TaskExcludes, headingTags: string[] }`, plus any unknown key, which survives every write.
- `globalExcludes` is `tasksStore.query.exclude` (Issue 116's `TaskExcludes`; in this Issue the store has one exclude set, which the panel's Excludes section edits).
- `headingTags` holds the texts of the cards that hold exactly one heading clause with `match: 'tag'`, in card order, as Issue 245 selects them.

**Parse (pure, in `tasks.logic.ts` next to Issue 243's `parseTasksView`, which it extends).** Returns the excludes, the heading tags and `valid`.
- Invalid (log and toast, as Issue 243): a `tasksView` that is not a plain object, or a `globalExcludes` or `headingTags` that is present and not a plain object or an array. The state then falls back to the defaults and the value stays on disk until the next change.
- A field with a wrong-typed value falls back to its own default with no toast: each switch to `true`, each list to `[]`; non-string list entries are dropped. `version` is not checked.
- Heading tags: a `headingTags` array of strings, or, when it is absent, `parseSectionTags` of a legacy `sectionTag` string (Issues 243 and 245). An empty result gives `['#to-list']` (owner Q1).

**Load.** `loadSavedTasksView` sets `tasksStore.setSources(headingSources(tags))` (Issue 116) and `tasksStore.setExclude(globalExcludes)`, always, defaults included. It never writes settings.

**Save.** A service `setTaskExcludes(exclude: TaskExcludes)` calls `tasksStore.setExclude` and writes `globalExcludes`; Issue 245's `setTaskSources` writes `headingTags` instead of `sectionTag`. Both go through one pure `withTasksViewState(raw: unknown, state: { globalExcludes; headingTags }): Record<string, unknown>`, which keeps every unknown key and a numeric `version` (else `1`), writes both fields, and removes the legacy `sectionTag` key. So the first change after this Issue migrates a vault's saved tags; until then the legacy key is read and left alone. Writes mutate `settingsStore.tasksView` through `updateTasksView`; settings persistence writes them. Never call `saveSettings`. No new `writeTextFile` site. The panel's exclude switches and lists call `setTaskExcludes`.

- `help/documentation/10-tasks-and-todoist.md`, the Sources section (Issue 245): the excludes and the tag heading cards are remembered per vault; other cards and the quick filters are not.

**Blocked by:** 245, 117

**Waits on:** open-itens Issue 030 (`.scratch/open-itens/issues/030-session-whose-settings-json-was-never-loaded.md`, a settings file that was never loaded is never saved over). relay-lite cannot see a blocker in another folder: launch this Issue by number only after 030 is `done` in `.scratch/open-itens/ledger.md`.

**Status:** ready-for-agent

**Answered:** owner, 2026-11-12 (Q3): this Issue saves only the global excludes and migrates the saved section tags; Issue 124 seeds "To list" from them. Owner, 2026-11-12 (Q1): `#to-list` stays the default, and a saved empty section filter is not restored. Recorded as this Issue's reading of Q3, for the owner to confirm at review: "migrate the saved section tags" means moving the free text `sectionTag` into the normalized `headingTags` list at the first write.

**Waits on:** 030 (listed in Blocked by): a settings file that was never loaded must not be saved over. The origin's "audit-2026-11-05 Issue 115" is open-itens 030, not open-itens 115.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`. Targeted checks include `src/tests/lib/core/settings/`, `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts`, `src/tests/lib/features/tasks/tasks-view-settings.test.ts` and `src/tests/lib/architecture/{pure-logic,layer-rules,feature-cycle}.test.ts`.

Tests use Issue 243's harness in `tasks-view-settings.test.ts`: the real `loadSettings`, `startSettingsPersistence`, `settingsStore`, `tasksStore` and `loadSavedTasksView` under jsdom with fake timers; mocks only for `@tauri-apps/plugin-fs`, `invoke`, `svelte-sonner`, `theme.service` and `#lib/utils/debug.js` (or a `console.error` spy); `await stopSettingsPersistence()` in `afterEach`.

**Tests that change on purpose:** Issue 245's write-back cases in `tasks-view-settings.test.ts`, which now expect `headingTags` and no `sectionTag` in the written JSON.

- [ ] Failing test first: `setTaskExcludes` with the templates switch off, and `setTaskSources` adding a `#work` tag heading card; after the persistence debounce the written `tasksView` holds `globalExcludes.templatesFolder: false`, `headingTags: ['#to-list', '#work']` and no `sectionTag`. A fresh load from that JSON restores both in `tasksStore`. Fails today (excludes are not saved).
- [ ] Legacy: `{ version: 1, sectionTag: '#a b', extra: 1 }` loads two heading cards and the default excludes, and the bytes stay until the next change. The first `setTaskExcludes` writes `headingTags: ['#a', '#b']`, `globalExcludes`, `extra: 1`, and no `sectionTag`.
- [ ] A file without `tasksView` loads the `#to-list` card and the default excludes, with no toast and no `tasksView` key in the load write-back. `headingTags: []` loads the `#to-list` card.
- [ ] `tasksView: 42` and `globalExcludes: 5` load the defaults, log once with the tag `'TASKS'`, toast once, and every `writeTextFile` payload carries the value unchanged until the next change. `globalExcludes: { archived: 'x' }` loads `archived: true` with no toast.
- [ ] A folder card, a quick filter and a `groupBy` change leave `settingsStore.tasksView` unchanged.
- [ ] Loading vault C (no `tasksView`) while the store still holds vault B's excludes, without `resetTasks()` in between (the double-switch path), gives the defaults.
- [ ] Issue 030's protected session: after a load where `readTextFile` rejects, `setTaskExcludes` leaves `settings.json` unwritten for the rest of the session.
- [ ] Pure tests for the parse and `withTasksViewState` in `tasks.logic.test.ts`.
- [ ] `layer-rules.test.ts` stays green with no new baseline entry.

## Notes

- **Size:** S to M.
- Run in series with the other Tasks view Issues; launch it only by number.
- Collapsed groups (Issue 240) stay session-only: this Issue answers 240's "Issue 123 decides persistence".

## Comments

- 2026-11-12: Issue 243 already creates the per-vault `tasksView` key (opaque to core, parsed in `features/tasks`) holding `{ version: 1, sectionTag }`. This Issue extends that key with `globalExcludes` and `query`, reads an existing `sectionTag` once into the query's heading cards, and stops writing `sectionTag` after that. Its first bullet's plumbing exists by then; reuse it.
- 2026-11-12: deep dive and owner Q3 applied (SUMMARY 123; cross-persistence M2, M3, H1, L1, L3, L4). Shrunk: no `query` is saved, only `globalExcludes` and the normalized `headingTags`, which replace the legacy `sectionTag` at the first write; Issue 124 seeds from them. Reuses Issue 243's plumbing and dropped the `todoist` merge pointer; writes go through `updateTasksView` in service functions, never `saveSettings`, and no `$effect` mirror is used, which removes the stop-and-restart ordering the deep dive asked for. Added the invalid-value rule, the protected-session and double-switch criteria, and what is not saved. Fixed the audit-number line. Blocked by 245 and 030 (112 and 116 dropped: no grouping is saved, and 245 follows 116). Status set to ready-for-agent after Q3.

- 2026-11-12: main session, after the consistency review: also blocked by 117, which unblocks at the same time and edits the same Sources panel; the edge only keeps the two runs apart.

- 2026-11-12: moved to `.scratch/tasks-view-ux/issues/` with the other Tasks view Issues; the 030 edge became a Waits on line, because 030 stays in open-itens.
