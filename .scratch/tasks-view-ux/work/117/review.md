VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first, `task-query.logic.test.ts`: each property op on a scalar string, a number, a list, a missing key, an empty value and an object value. Fails today (no property clause). — `src/tests/lib/features/tasks/task-query.logic.test.ts` "property clause" suite runs `is`, `isNot`, `contains` and `exists` over notes with a string, number, boolean, list, missing key, `''`, `null`, `[]`, object and object-list value, plus blank key/value inactivity and key case; the `describeTaskQuery` test words each op. On main `TaskSourceClause` has no `property` kind and `clauseTest` no case, so these could not pass there. Passes on the branch.
- [met] A pure `onlyThisFolder(query, folder)` and `hideFolder` / `hideNote` in `task-query.logic.ts` return the new query: tested with no cards, with one card, and with the folder already excluded. — `task-query.logic.ts` `onlyThisFolder` / `hideFolder` / `hideNote` spread into new objects and never mutate the input (structuredClone snapshot test). The "group header actions" suite covers no cards, one card, two cards (one empty), a card already holding the folder (slash-normalized) vs a negated one, the folder already excluded (`/Projects/`), the note already excluded, and the vault root.
- [met] `TasksView.test.ts` with real stores: a property card `status is active` lists only tasks from notes with that frontmatter; "Hide this folder" on a folder group removes its tasks and the sentence names the exclude; "Only this folder" leaves only that folder's tasks. — In `src/tests/lib/features/tasks/TasksView.sources.test.ts` (the Sources panel tests moved there when Issue 245 split `TasksView.test.ts`), real `tasksStore` / `settingsStore` / `vaultStore`, only Tauri modules mocked: the property card test types `status` / `Active` and asserts rows, sentence and query, then switches to `exists` and asserts the value field is gone; "Hide this folder" asserts rows, the removed group, `exclude.folders` and the sentence `..., folder Projects`; "Only this folder" is tested with no card and ANDed into the `#to-list` card, each asserting only that folder's rows and the sentence.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/tasks/ src/tests/scripts/sync-wiki-docs.test.ts`: exit 0, 19 files, 753 tests passed. The test verdict rests on `task-query.logic.test.ts` and `TasksView.sources.test.ts` (the files the diff changes) and the rest of `src/tests/lib/features/tasks/` (tests of `TasksView.svelte`, `SourcesPanel.svelte` and `task-query.logic.ts`), plus `sync-wiki-docs.test.ts` for the help doc. No other test asserts the changed help strings (searched `src/tests` and `e2e`).
- `git diff main...HEAD --check`: clean; added lines use tabs.
- The full suite is deliver's to run.

## Findings

1. minor, `help/documentation/10-tasks-and-todoist.md:118-119`: Folder groups are keyed by a note's direct folder (`flatGrouping` 'folder', `keyOf: row.folder`), but a folder clause and a folder exclude include subfolders (`inFolder`). So "Hide this folder" on `Projects` also removes the separate `Projects/Sub` group, and "Only this folder" on `Projects` keeps it, while the help says "lists only that folder's tasks" / "adds the folder to the excluded folders". The behavior follows the Issue's mechanism, so this is not a code change; fix: say "that folder and its subfolders" in both bullets so the second group vanishing is not a surprise.
2. nit, `src/lib/features/tasks/TasksView.svelte:685-693`: every folder group renders buttons with the same accessible names ("Only this folder", "Hide this folder"), so a screen reader user tabbing through the list hears no group name. Fix: add an `aria-label` that names the target, for example `Hide folder Projects` / `Hide note Projects/P.md`, keeping the visible text.
3. nit, `src/lib/features/tasks/TasksView.svelte:683`: the hover and focus-within reveal (`opacity-0` plus `group-hover/header` / `group-focus-within/header`) is untested (jsdom cannot check it) and was not checked by eye; the buttons stay clickable while invisible only under the pointer, where hover shows them. Fix: check in the app once before or at delivery.

## Resolution

1. Fixed: both help bullets now say the folder actions cover the folder and its subfolders (`help/documentation/10-tasks-and-todoist.md`).
2. Fixed: each header action button gets an `aria-label` of its visible text plus the target, for example `Hide this folder Projects` and `Hide this note Projects/P.md`, so the visible text stays the start of the name. Tested in `TasksView.sources.test.ts` ("names the group each action targets").
3. Not fixed in code: the hover and focus-within reveal can only be checked by eye in the running app, which this headless delivery step cannot do. Left for the owner to check once.
