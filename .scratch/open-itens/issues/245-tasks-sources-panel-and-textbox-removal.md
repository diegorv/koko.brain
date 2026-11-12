# 245: A Sources panel edits the Tasks query, and the section tag textbox goes

**Origin:** split from Issue 116 (the PRD's `tasks-view` Issue 13) on 2026-11-12 by the deep dive (`.scratch/tasks-view-ux/research/deep-dive/SUMMARY.md` section 4, `dossier-116.md`, `cross-persistence-sources.md`, `cross-state-chain.md` M13). This is 116b; Issue 116 (116a) builds the query, the excludes and the sentence. The PRD stays in `.scratch/archived/tasks-view/` ("Sourcing rules", A4, A12). Issue numbers in this text are open-itens numbers.

**What to build:** After Issue 116 the query holds source cards and excludes, but only the section tag textbox edits it, and only as heading cards. Replace the textbox with a Sources panel that edits every clause kind and the excludes.

**Before editing, on the branch:** `grep -rn "sectionTag\|setSectionTag\|updateSectionTagFilter\|sectionTagInput\|Section tag\|tasksView\|loadSavedTasksView\|getTasksResetGeneration" src/lib src/tests e2e help`. Issues 108, 242, 234, 243 and 116 shaped these names.

**Panel.**
- An "Edit" button after the rule sentence (it carries `aria-expanded` and `aria-controls`) opens an inline region between the sentence and the list, in a new `SourcesPanel.svelte`, built from `#lib/components/ui/` `button`, `input`, `switch` and `dropdown-menu`. Theme tokens only (Issue 236's `tasks-palette.test.ts`). Neither the panel nor the sentence row carries the `pane-toolbar` class.
- **Sources section.** One block per card. "Add card" adds an empty card; inside a card, "Add clause" (a `DropdownMenu`: Folder, Type, Note tag, Heading) adds a clause with an empty value, and each clause has a remove button named "Remove clause". Folder, type and note tag clauses have a "Not" switch that sets `negate`; a heading clause has a Tag / Contains choice for `match`. Values are typed into plain text fields (Issue 119 adds the pickers and the lifecycle clause; Issue 117 adds the property clause). An empty value is inactive (Issue 116), so a new clause does not blank the list.
- **Excludes section.** Four switches: "Archived notes", "Type definitions", "Templates folder", "System folder". Four list editors (input, Add, remove per entry) for excluded folders, notes (`relPath`), note tags and types.
- Every control has an accessible name. Edits call `tasksStore.setSources` / `tasksStore.setExclude` through the service (below), at once; there is no Apply button.
- The empty-state actions of Issue 116's stages 2 and 3 become "Edit sources" and "Edit excludes", which open the panel. "Edit excludes" also moves focus to the Excludes section's first switch.
- When `query.sources` is not empty, a "Clear" button after the sentence sets `sources` to `[]` for the session (every note, the excludes still apply). It shows in the empty state too, and not while "Indexing tasks..." shows.

**Textbox removal.** The section tag textbox, `sectionTagInput`, its debounce, Issue 234's destroy flush and textbox sync, the `Hash` icon, `tasksStore.sectionTag` / `setSectionTag` and `updateSectionTagFilter` go, with their tests. `getTasksResetGeneration` stays (Issue 241's Undo). Issue 108's "Clear tag" button and `clearTag` empty-state action are replaced by Clear and "Edit sources". `describeTaskQuery` keeps Issue 116's textbox wording for a query whose cards each hold one tag heading clause.

**Saving the heading cards** until Issue 123 saves the whole query:
- A service function `setTaskSources(sources: TaskSource[])` in `tasks.service.ts` calls `tasksStore.setSources(sources)` and, when the cards that hold exactly one heading clause with `match: 'tag'` change, writes their texts, space-joined, to `tasksView.sectionTag` with Issue 243's `settingsStore.updateTasksView(withSectionTag(settingsStore.tasksView, text))`, synchronously. Settings persistence debounces the disk write, so this Issue adds no timer. Never call `saveSettings`.
- Other cards (substring headings, folder, type and tag clauses, a heading clause sharing a card) and the excludes are session-only until Issue 123. `resetTasks()` and `tasksStore.reset()` never write settings.
- Clear writes `sectionTag: ''`, which loads as `#to-list` after a restart (owner Q1). An emptied heading card is not written until it holds text.
- **Loader.** Issue 243's `loadSavedTasksView` stays the single load point and keeps its call from `initializeVault`: it now sets `tasksStore.setSources(headingSources(tags))` (Issue 116), where `tags` is `parseSectionTags` of the saved text, or `['#to-list']` when that yields no tag, and keeps 243's invalid-value behavior (`error()`, toast, the value left on disk until the next sources change). Always set it, as 243 does. It never writes settings.

**Blocked by:** 116

**Status:** ready-for-agent

**Answered:** PRD B6 (a) (owner, 2026-11-06). Owner, 2026-11-12: Q1, `#to-list` stays the default and the view never defaults to every task, so a saved empty section filter is not restored; the split of Issue 116 into 116 (query) and this Issue (panel, textbox removal), blocked by 116.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts` because the spec's section tag textbox goes away. relay-lite's configured checks do not run e2e: the build step runs this spec before its last commit and reports its pass count, and the reviewer runs it again as a probe and cites the result. Do not run the whole e2e suite. Targeted checks include `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts`, `src/tests/lib/features/tasks/tasks-view-settings.test.ts` (Issue 243) and the source scans that read this feature: `src/tests/lib/pane-toolbar.test.ts`, `menu-item-anatomy.test.ts`, `chrome-type-scale.test.ts`, `chrome-state-styles.test.ts`, `src/tests/lib/features/tasks/tasks-palette.test.ts` and `src/tests/lib/architecture/{pure-logic,layer-rules,feature-cycle}.test.ts`.

Tests mock only the allowed boundaries: `invoke` (tasks served through Issue 110's `mockTaskFetch` in `src/tests/fixtures/tasks.fixture.ts`), `@tauri-apps/plugin-fs`, `svelte-sonner`, the DOM service `theme.service`, and `#lib/utils/debug.js` or a `console.error` spy. Open menus with Issue 110's `openMenu` and mount with `mountTasksView`. Query new buttons by exact name (`Edit`, `Clear`, `Edit sources`, `Edit excludes`, `Add card`, `Add clause`), since Issue 239's "Reset filters" and others share words.

**Tests that change on purpose** (name them in the commit): Issue 242's e2e test that types two tags (it now builds two heading cards in the panel); every e2e step that fills the section textbox or finds `getByRole('textbox', { name: /section tag/i })`; Issue 243's load and save tests, which move to the query and the heading-card write-back, not deleted; Issue 108's Clear tag and sentence tests; Issue 234's destroy-flush, reset-guard and textbox-sync tests (removed with the textbox); Issue 243's destroy-flush case; every `setSectionTag` call in `src/tests` (become `setSources`).

- [ ] Failing test first, a new `src/tests/lib/features/tasks/TasksView.sources.test.ts` with real stores: click "Edit", "Add card", "Add clause" > "Folder", type `Projects`: only `Projects` tasks are listed and the sentence says so; turn the "Templates folder" switch off: a template task comes back. Fails today (no panel).
- [ ] Same file: a folder card that matches no note shows "No note matches the sources", and its "Edit sources" action sets the Edit button's `aria-expanded` to `true` and renders the panel. The same for "Every matching note is excluded" and "Edit excludes".
- [ ] Same file: "Clear" shows only when `sources` is not empty, and clicking it lists every non-excluded task.
- [ ] `tasks-view-settings.test.ts` (Issue 243's harness): adding a heading card `#work` next to the default writes `tasksView.sectionTag` `#to-list #work`; a reload builds two heading cards. A substring heading card and a folder-plus-heading card are not written back; a reload restores the tag cards only. Clear writes `''`, and a reload gives the `#to-list` card. The invalid-value and vault-switch cases still pass against `query.sources`.
- [ ] `tasks.service.test.ts`: `setTaskSources` with unchanged tag cards leaves `settingsStore.tasksView` unchanged; `resetTasks()` writes nothing to settings.
- [ ] No `src/lib` code references `sectionTag` except the `tasksView.sectionTag` parse and write (`grep -rn "sectionTag" src/lib`).
- [ ] e2e: every step that cleared the textbox clicks the sentence's Clear button and the specs still assert the listed tasks. Issue 242's two-tag test adds a `#work` heading card through the panel and asserts both tagged tasks visible and the untagged one at `toHaveCount(0)`.
- [ ] `help/documentation/10-tasks-and-todoist.md` replaces the Section filter row of the Filters table with a "Sources" section: cards (OR), clauses (AND), the four clause kinds, Not, the default excludes and the lists, Clear, the rule sentence, and that only tag heading cards are remembered after a restart until saved views come (PRD A12).

## Notes

- **Size:** M to L (panel component, test migration, e2e). If the window runs short, the panel and its tests are the core; the help doc comes last.
- Run in series with the other Tasks view Issues. Issues 117 and 119 add clause kinds to this panel.
- 113's focus on mount must not steal focus from a panel input, and opening the panel does not reset the current row.
- Delivery note: the panel layout was not checked by eye (relay agents cannot run the app); the owner checks it after the merge.

## Comments

- 2026-11-12: created by the deep dive's split of Issue 116 (SUMMARY section 4; cross-persistence H1, M6, M7; cross-state M13; dossier-116). It holds the panel, the textbox removal, the heading-card write-back (only one-tag-heading cards, synchronous, through `updateTasksView`, never `saveSettings`), the repointed 243 loader, the e2e migration and a "Tests that change on purpose" list.
