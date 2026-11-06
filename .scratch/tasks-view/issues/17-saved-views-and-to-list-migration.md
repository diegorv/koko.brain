# 17: Saved views and the "To list" migration

**What to build:** One persisted configuration (Issue 16) cannot hold "To list" next to "All open". Add a list column with saved views and change the default list (PRD "Lists and views", decision B1). The "modified" marker comes in Issue 29.

- **List column** left of the list: the built-in "All open" (every note, global excludes, status open, group by note) and the saved views. "+ Save view" stores the current query under a name. Views can be renamed, duplicated and deleted from a row menu. Below 720 px pane width the column becomes a dropdown above the rule sentence.
- **Who owns what.** Global excludes (Issue 16's `globalExcludes`) apply to every list and view. A view's own `exclude` only adds to them. Sources, quick filters, group and sort belong to the view. Global excludes are edited in a "Global" section of the Sources panel.
- **Edits before Issue 29.** Changing anything on a list changes the session state only. "+ Save view" stores it as a new view; switching lists drops it. Nothing writes a saved view except Save view, rename, duplicate and delete.
- **Migration**, once per vault, when `tasksView.savedViews` is missing: if any row has an ancestor heading matching `#to-list` (Issue 12's rule), seed a saved view "To list" holding that heading card. Under B1 (a) the vault then opens on "All open"; under B1 (b) it opens on "To list".
- `tasksView` becomes `{ version: 1, activeList, globalExcludes, savedViews: { id, name, query }[] }`. Issue 16's single `query` is read once as the active session state.
- After a restart the view reopens the last list.

**Blocked by:** 16

**Status:** needs-info

**Waits on:** PRD decision B1 (default list and `#to-list`).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the default list changes what the spec sees first.

- [ ] Failing test first, with the real settings store and `tasksStore`: a vault whose snapshot has a `## Inbox #to-list` heading and no `savedViews` gets a "To list" view after load, and the active list follows B1. A second load does not seed it again.
- [ ] Saving, renaming, duplicating and deleting a view round-trips through `settings.json`.
- [ ] A view exclude adds to the global ones and never removes one.
- [ ] Switching from an edited list to another drops the edit, and the saved view is unchanged on disk.
- [ ] `tasks.store.test.ts` drops its `#to-list` default assertion, on purpose, and the commit says so.
- [ ] `e2e/specs/tasks-view.spec.ts` no longer needs to clear a section tag before asserting the fixture tasks.

## Notes

- **Size:** M to L. The "modified" marker was split into Issue 29; the migration stays with the default change.
