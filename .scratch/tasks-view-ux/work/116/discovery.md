# 116 discovery: the Tasks query holds sources and default excludes

No `spec.md` in `.scratch/tasks-view-ux/`; the Issue is the spec. 244 (entries snapshot) and 243 (saved tags) have landed.

## Files that change
- `src/lib/features/tasks/task-query.logic.ts`: new `TaskSourceClause`, `TaskSource`, `TaskExcludes`, `TaskQuery`, `defaultTaskExcludes`, `headingSources`, `defaultTaskQuery`, `selectSourceRows`; `buildTaskRows` (:223) drops `sectionTags` and the `matchesHeading` skip (:236); `describeTaskRule` (:661) and `TaskRuleOptions` (:626) become `describeTaskQuery(query)`; `explainEmptyTasks` (:700) takes `{ rows, query, folders, today, now }` with the source and exclude stages.
- `src/lib/features/tasks/tasks.store.svelte.ts`: `quick` (:26) folds into `query` (`$state.raw`, replaced whole like `quick` was); `setSources`, `setExclude`; `setSectionTag` (:101) also sets the heading cards; a `sourceRows` derived (selectSourceRows with `settingsStore.templates`) that `visibleRows` (:63) filters; `reset()` restores `defaultTaskQuery()`.
- `src/lib/features/tasks/tasks.service.ts`: `buildTaskIndex` (:120) stops passing the tags; `updateSectionTagFilter` (:144) saves and sets, no fetch (becomes sync).
- `src/lib/features/tasks/TasksView.svelte`: sentence (:182), empty state (:189) with the folders, Tag menu options (:235) from `tasksStore.sourceRows`, loading gate (:943) adds `!vaultStore.indexReady`.
- `src/tests/fixtures/tasks.fixture.ts` `mountTasksView`: `vaultStore.markIndexReady()`.
- `help/documentation/10-tasks-and-todoist.md:111` Section filter row.

## Tests
- `task-query.logic.test.ts`: new `selectSourceRows` suite (failing first), `describeTaskQuery` (every `describeTaskRule` case with the default exclude part appended), `explainEmptyTasks` stages; the `buildTaskRows` "section tags" cases move to `selectSourceRows`.
- `tasks.store.test.ts`: query default, `setSectionTag` cards, `setSources` / `setExclude` / settings change follow-through, `sourceRows`, `reset()`. The existing `visibleRows` cases use rows with no heading, so they set `setSources([])` first.
- `tasks.service.test.ts`: the section-tag `buildTaskIndex` cases assert on `visibleRows`; `updateSectionTagFilter` cases assert no fetch.
- `TasksView.test.ts`: templates exclude, folder card sentence, typing `#work` with no new fetch, `indexReady` gate; sentence assertions get the exclude part; Issue 234's destroy-flush asserts `visibleRows` and no fetch; the failed-fetch-after-tag-change case refetches by hand.
- Prior art: Issue 244 (`work/244`) for snapshot-built rows and `mockTaskFetch` entries.

## Plan (commits)
1. discovery.md.
2. Logic model, `selectSourceRows`, `describeTaskQuery`, `explainEmptyTasks`, `buildTaskRows` change, with logic tests.
3. Store, service, view, fixture and every consumer test (one commit so the suite stays green).
4. Help doc.

## Defaults taken
- A card whose clauses are all inactive matches every row, so the sentence reads ` from every note` for it.
- The Tag menu reads the rows the sources and excludes keep (`sourceRows`): `rows` now holds the whole vault, and the menu used to list the section's tags only.
- `parentLine` is now computed over every task of the note; a source that drops a parent keeps the child undimmed (accepted in the Issue, commented).
- The switches' words stay `templates` and `the system folder` whatever path the settings hold; an empty setting still excludes nothing.
- The `!indexReady` gate wraps the content block only, not the toolbar count.
