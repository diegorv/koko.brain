# 245 discovery: Sources panel, section tag textbox removal

No `spec.md` in `.scratch/tasks-view-ux/`; the Issue is the spec. 116 (query, excludes, sentence) and 243 (saved tags) have landed. `tasks-palette.test.ts` (Issue 236) does not exist on main, so it is not run; the panel uses theme tokens only anyway.

## Files that change
- `src/lib/features/tasks/SourcesPanel.svelte` (new): cards, clauses, excludes; reads `tasksStore.query`, writes through `setTaskSources` and `tasksStore.setExclude`.
- `src/lib/features/tasks/TasksView.svelte`: textbox (:914-924), `Hash` (:15), debounce + `clearSectionTag` + destroy flush (:124-168), `updateSectionTagFilter`/`getTasksResetGeneration`/`parseSectionTags` imports go; the sentence row (Edit, Clear) and the panel move above the branch chain (:940-969) so the panel stays mounted when the list empties while typing; `runEmptyAction` (:257) opens the panel.
- `src/lib/features/tasks/tasks.service.ts`: `updateSectionTagFilter` (:145) becomes `setTaskSources(sources)`; `loadSavedTasksView` (:159) sets `headingSources(parseSectionTags(saved))`.
- `src/lib/features/tasks/tasks.store.svelte.ts`: `sectionTag` state, getter, `setSectionTag` (:28-32, :109, :127, :166) go.
- `src/lib/features/tasks/task-query.logic.ts`: `explainEmptyTasks` (:986-999) actions `editSources` / `editExcludes` replace `clearTag`; new pure `tagHeadingCardText(sources)` (what `tasksView.sectionTag` remembers).
- `e2e/specs/tasks-view.spec.ts`: every textbox `fill('')` becomes the sentence's Clear; the two-tag test adds a `#work` heading card in the panel.
- `help/documentation/10-tasks-and-todoist.md`: Section filter row → a Sources section.

## Plan (commits)
1. discovery.md.
2. Failing `TasksView.sources.test.ts`, then logic + service + store + panel + view, with every consumer test migrated (one commit so the suite stays green).
3. e2e spec migration, run `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts`.
4. Help doc.

## Tests
- New `TasksView.sources.test.ts` (prior art: `TasksView.test.ts` folder-card and templates cases, `openMenu` from `tasks.fixture.ts`).
- `tasks-view-settings.test.ts`: 243's harness, `updateSectionTagFilter` → `setTaskSources`, `sectionTag` asserts → `query.sources`; the textbox case becomes a panel heading-card case.
- `tasks.service.test.ts`, `tasks.store.test.ts`, `task-query.logic.test.ts` (`CLEAR_TAG`, new `tagHeadingCardText` suite), `TasksView.test.ts` (Clear tag, textbox, 234 debounce/flush/sync cases), `TasksView.filters.test.ts:512`, `TasksView.keyboard.test.ts:276` (focus kept in the search box instead); every `setSectionTag('')` becomes `setSources([])`.

## Defaults taken
- Write-back: `tagHeadingCardText` returns the trimmed texts of the cards holding exactly one tag heading clause, space-joined, or null while one of them is empty (`#` alone counts as empty). `setTaskSources` writes only when it is non-null and differs from the previous sources' value. So a new or emptied heading card writes nothing until it holds text; Clear (`[]`) writes `''`.
- A new heading clause starts in Tag mode.
- Each card gets a "Remove card" button: without it the only way out of a card is removing its clauses, which leaves an empty card that matches every note.
- Excludes edits call `tasksStore.setExclude` directly (session-only, no service logic to add).
- The textbox-case empty state keeps its message ("No task sits under a heading containing #to-list") with the "Edit sources" action.
- List editors add on Enter or the Add button; a blank or duplicate entry is not added.
- `src/lib/contracts/commands.ts` `get_tasks_in_section_v2` `sectionTags` is the Rust IPC contract, not the view's tag text; left as is.

## Risks
- The panel was not checked by eye (no app run); the owner checks the layout after merge.
