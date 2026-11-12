# 247: A list column picks, saves and manages Tasks views

**Origin:** split from Issue 124 (the PRD's `tasks-view` Issue 17) on 2026-11-12 by the deep dive (`.scratch/tasks-view-ux/research/deep-dive/SUMMARY.md` section 4, `dossier-123+124.md` section 5.3). This is 124b; Issue 124 (124a) builds the saved-view model, storage and migration. The PRD stays in `.scratch/archived/tasks-view/` ("Lists and views"). Issue numbers in this text keep the open-itens numbering: the Tasks view Issues live in `.scratch/tasks-view-ux/issues/`, the others (030, 085, 151, 198, 204, 205 and the rest) in `.scratch/open-itens/issues/`.

**What to build:** After Issue 124 the store holds "All open", the saved views and the active list, but nothing on screen shows or picks them. Add the list column, the view actions and the "Global" excludes section.

**Before editing, on the branch:** `grep -rn "savedViews\|activeList\|globalExcludes\|selectTaskList\|saveTaskView\|renameTaskView\|duplicateTaskView\|deleteTaskView\|setTaskExcludes" src/lib src/tests`. Issue 124 named these; adapt to what landed.

- **List column** left of the list: "All open" first, then the saved views in stored order. The active list is marked with `aria-current="true"`. Clicking a list calls Issue 124's `selectTaskList(id)`.
- **"+ Save view"** at the end of the column opens an inline name input (Enter saves, Escape cancels; a blank name keeps the input open). It calls `saveTaskView(name)`, and the new view becomes active.
- **Row menu** on each saved view, a `DropdownMenu` from `#lib/components/ui/dropdown-menu/` with Rename (inline input, as Save view), Duplicate and Delete, calling `renameTaskView`, `duplicateTaskView` and `deleteTaskView`. Delete is `disabled` on the last saved view (owner Q4). "All open" has no row menu.
- **Narrow pane:** below 720 px container width (`@max-[720px]:`; the root is `@container` since Issue 109) the column becomes a dropdown above the rule sentence. Both renderings are in the DOM and container-query classes hide one, as Issue 239's filter fold does; there is no resize observer. Tests scope each rendering by a `data-` hook (`data-task-lists="column"` and `data-task-lists="menu"`), since jsdom does not apply container queries.
- **Global excludes.** The Sources panel (Issue 245) gets two exclude sections: "Global", which edits `globalExcludes` through Issue 123's `setTaskExcludes` and applies to every list, and "This list", which edits the active list's own `exclude` (session state, like every list edit). The "Global" section holds the four switches and lists the panel has today; "This list" holds the same controls, starting off and empty.
- Neither the column nor its dropdown carries the `pane-toolbar` class.

**Blocked by:** 124

**Status:** resolved

**Answered:** PRD B1 (b): the vault opens on the seeded "To list" view (owner, 2026-11-12). Owner, 2026-11-12: Q4, deleting the last saved view is not allowed; the split of Issue 124 into 124 (model and migration) and this Issue (list column UI), blocked by 124.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts` because the list column changes what the spec sees first. relay-lite's configured checks do not run e2e: the build step runs this spec before its last commit and reports its pass count, and the reviewer runs it again as a probe and cites the result. Do not run the whole e2e suite. Targeted checks include the source scans that read this feature: `src/tests/lib/pane-toolbar.test.ts`, `menu-item-anatomy.test.ts`, `chrome-type-scale.test.ts`, `chrome-state-styles.test.ts`, `src/tests/lib/features/tasks/tasks-palette.test.ts` and `src/tests/lib/architecture/{pure-logic,layer-rules,feature-cycle}.test.ts`.

Component tests go in a new `src/tests/lib/features/tasks/TasksView.lists.test.ts`, serve tasks through Issue 110's `mockTaskFetch` and mount through `mountTasksView` (`src/tests/fixtures/tasks.fixture.ts`), open menus with its `openMenu`, and mock only the allowed boundaries (`invoke`, `@tauri-apps/plugin-fs`, `svelte-sonner`, `theme.service`, `#lib/utils/debug.js` or a `console.error` spy). Stores and `.logic.ts` stay real.

- [x] Failing test first, `TasksView.lists.test.ts`: the column lists "All open" and "To list", with "To list" marked active after load; clicking "All open" lists every open fixture task and marks it active. Fails today (no column).
- [x] "+ Save view" with the name `Work` adds a `Work` row that becomes active; the written `settings.json` (the `plugin-fs` `writeTextFile` mock) holds it in `tasksView.savedViews`.
- [x] Rename, Duplicate and Delete through the row menu change the column and the written `savedViews`. With one saved view, its Delete item is `disabled`.
- [x] Both renderings exist: inside `[data-task-lists="menu"]`, picking "All open" from the dropdown selects it.
- [x] Turning a "Global" switch off changes `globalExcludes` and the list on every list; turning a "This list" switch on hides the matching tasks on the active list only, and switching lists drops it.
- [x] e2e: the vault opens on "To list" (the `#to-list` card lists no fixture task); one new test picks "All open" in the column and asserts the fixture tasks. Do not assert persistence across `page.reload` (a reload wipes the e2e virtual FS).
- [x] `help/documentation/10-tasks-and-todoist.md`: the list column, "All open", saved views and their row menu, the narrow dropdown, Global and This list excludes, and that unsaved edits last until a list switch or a restart (PRD A12).

## Notes

- **Size:** M.
- Run in series with the other Tasks view Issues; launch it only by number. Issue 125 adds built-in lists and their counts to this column; Issue 126 adds the "modified" marker and reuses the Save view name input.
- Delivery note: the column layout and the 720 px switch were not checked by eye (relay agents cannot run the app); the owner checks them in a narrow split after the merge.

## Comments

- 2026-11-12: created by the deep dive's split of Issue 124 (SUMMARY section 4, dossier-123+124 section 5.3). It holds the list column, Save view, the row menu with the last-view Delete disabled (Q4), the narrow dropdown, the Global and This list exclude sections, the e2e update and the help doc.
- 2026-11-12: delivered from branch issue/247-tasks-list-column. Tasks view gets a list column (All open plus saved views) with Save view, a Rename/Duplicate/Delete row menu (Delete disabled on the last view), a narrow-width dropdown, and Global / This list exclude sections; e2e and help doc updated. Review round 1 APPROVED with 4 minor/nit findings, all fixed (This list refocus test, narrow Save view test, Escape focuses "+ Save view", focus after Delete); round 2 APPROVED with no findings. Tests: pnpm check exit 0; full suite at e9006c87d exit 0, 633 files, 16460 passed, 54 skipped, 1 todo.
