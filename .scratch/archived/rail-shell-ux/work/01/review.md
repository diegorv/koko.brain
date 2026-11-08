VERDICT: APPROVED

Review of `git diff main...HEAD` (e799be00, 90c709d6, f8f8bd89) against Issue 01. No `spec.md` exists for rail-shell-ux; the Issue served as the spec.

## Acceptance criteria

- [met] Failing test first: `resolveViewLens(VIEW, queryViewLens(def, null, index), ctx)` for a view with no filters, over entries and an index that hold plain notes and two `.view` files (the view itself and another), lists the plain notes and no `.view` path (logic test in `src/tests/lib/features/rail-shell/lens.logic.test.ts`, existing fixtures, no mocks; the fixture holds no type definition, Issue 12 owns those) — `lens.logic.test.ts:1069` "an unfiltered view lists the plain notes and no .view file": extends the existing `index`/`entries` fixtures with `Projects.view` (VIEW) and `People.view`, no mocks, no Type entry. It asserts the query result does contain both `.view` paths (`arrayContaining([VIEW, OTHER_VIEW])`), so the only thing removing them is the new filter, then that the list is exactly a.md, b.md, c.md, person.md. The old code would list both `.view` paths: both are in `ctx.entries` and in `result.paths`, and the old `resolveViewLens` dropped only the system folder and archived notes. Passes on the branch.
- [met] A filtered view never lists a `.view` file, even one whose top-level keys match the filter (same test file) — `lens.logic.test.ts:1077`: `def()` (`_type == "Project"`) over index records for both `.view` files built with `_type: Project` inside a `---` fence. It asserts the query matches both, and that the list is `['a', 'b', 'c']` with the label still `All projects`.
- [met] `isListableNote` is false for a `.view` entry and true for a markdown note (logic test in `src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts`) — `type-sidebar.logic.test.ts:852-866`: false for `Projects.view` and `Shouty.VIEW`, true for `notes/a.md`, `review.md` and `my.view.md`. Implementation at `type-sidebar.logic.ts:66` is `!isViewFile(entry.path)`, and `isViewFile` (`fs.logic.ts:76`) compares the lowercased extension, so the casing case holds.
- [met] The view's label still comes from its own `.view` entry (`_sidebar_label`) and its `_sort` still applies: the existing `queryViewLens and resolveViewLens` tests stay green — `lens.logic.ts:573` still reads `viewEntry` from the unfiltered `ctx.entries`; only the list `entries` at `:576` is filtered. The existing tests "lists the query result in the order its Sort shows" (label `All projects`) and "falls back to the view's _sort when it has no Sort" (`['a', 'b', 'c']`) pass unchanged, and the new filtered test asserts the label again with the `.view` entry present.
- [met] The navigator count of an unfiltered view excludes `.view` files (`src/tests/lib/features/rail-shell/view-lens.service.test.ts`, with a `.view` in the entries and the index) — `view-lens.service.test.ts:82`: an unfiltered `All.view`, with `All.view` and `Projects.view` in the index and the entries, counts 3 (a, b, p; old.md is archived). Without the filter it would count 5. `countViewNotes` (`view-lens.service.ts:24`) counts `resolveViewLens(...).notes.length`, so it needs no code change.

## Findings

1. nit — `src/lib/features/type-definitions/type-sidebar.logic.ts:62-63`: the JSDoc says why the predicate exists by pointing at Rust behavior ("Rust counts `.view` as markdown"). That fact can go stale if `is_markdown_filename` ever changes. The comment is accurate today and gives the reason, so no change is required. Optional fix: cite `src-tauri/src/utils/fs.rs` `is_markdown_filename` so a reader can check it.
2. nit — `src/tests/lib/features/rail-shell/lens.logic.test.ts:1060-1063`: the index record for VIEW carries `_type: Project`, but its entry in `entries` (line 1004) has no `_type`. The index and the entries disagree about the same file. This does not affect the assertions, because the list reads `result.paths` from the index and the label/sort from the entry. Optional fix: add `_type: 'Project'` to the VIEW entry's frontmatter, or leave a comment.

No blocker or major findings. Scope: the diff touches only the two source files the Issue names and their three test files, plus the workflow's own `work/01/discovery.md`. There are no changes to Rust, the collection editor or the layer baseline. Other callers of `resolveViewLens` are `RailNoteList.svelte:167,185,190` (the view note list) and `countViewNotes`. Both want the same rule, so the filter applies to the list and the count alike. Indentation is tabs, and the new export has JSDoc.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on every test file that references `resolveViewLens`, `countViewNotes`, `RailNoteList`, `type-sidebar.logic` or `isListableNote`: `src/tests/lib/features/rail-shell/{Rail,RailNoteList,RailNoteList.view,TypesNavigator,lens.logic,rail-shell.boundary,view-lens.service}.test.ts` and `src/tests/lib/features/type-definitions/{type-note-list.logic,type-sidebar.logic}.test.ts`: exit 0, 9 files, 436 tests passed. The test verdict rests on these files.
- I did not re-run the new tests against the pre-fix source. Their test-first value comes from reading the code: each lens test asserts that the query result contains the `.view` paths, and the old `resolveViewLens` kept every non-system, non-archived entry.
- Not run here: the full suite (`pnpm vitest run && pnpm build`) and `pnpm build`. Deliver runs them, per the Issue's gate.

## Resolution

1. Fixed: the `isListableNote` JSDoc in `src/lib/features/type-definitions/type-sidebar.logic.ts` now cites `is_markdown_filename` in `src-tauri/src/utils/fs.rs`.
2. Fixed with a comment in `src/tests/lib/features/rail-shell/lens.logic.test.ts`: the VIEW entry lives in the shared `entries` fixture used by the other `resolveViewLens` tests, so the comment explains why its missing `_type` is harmless instead of changing that fixture.
