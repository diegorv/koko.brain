# 124: Saved views and the "To list" migration

**Origin:** `tasks-view` Issue 17, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/tasks-view/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** One persisted configuration (Issue 16) cannot hold "To list" next to "All open". Add a list column with saved views and seed "To list" (PRD "Lists and views", decision B1, revised by the owner on 2026-11-12: the view never defaults to every task). The "modified" marker comes in Issue 29.

- **List column** left of the list: the built-in "All open" (every note, global excludes, status open, group by note) and the saved views. "+ Save view" stores the current query under a name. Views can be renamed, duplicated and deleted from a row menu. Below 720 px pane width the column becomes a dropdown above the rule sentence.
- **Who owns what.** Global excludes (Issue 16's `globalExcludes`) apply to every list and view. A view's own `exclude` only adds to them. Sources, quick filters, group and sort belong to the view. Global excludes are edited in a "Global" section of the Sources panel.
- **Edits before Issue 29.** Changing anything on a list changes the session state only. "+ Save view" stores it as a new view; switching lists drops it. Nothing writes a saved view except Save view, rename, duplicate and delete.
- **Migration**, once per vault, when `tasksView.savedViews` is missing: seed a saved view "To list" holding the current heading cards (the saved section tags of Issues 242 and 243, or the `#to-list` card when none is saved). The vault then opens on "To list" (B1 (b)). "All open" stays in the column as a built-in list the user can pick.
- `tasksView` becomes `{ version: 1, activeList, globalExcludes, savedViews: { id, name, query }[] }`. Issue 16's single `query` is read once as the active session state.
- After a restart the view reopens the last list.

**Blocked by:** 123

**Status:** ready-for-agent

**Answered:** PRD B1, revised on 2026-11-12 from (a) to (b): the vault opens on the seeded "To list" view, never on every task (owner). The 2026-11-06 answer (a) is superseded.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the list column changes what the spec sees first.

- [ ] Failing test first, with the real settings store and `tasksStore`: a vault whose snapshot has a `## Inbox #to-list` heading and no `savedViews` gets a "To list" view after load, and the active list is "To list". A vault with saved section tags `#to-list #work` seeds a "To list" view with both heading cards. A second load does not seed it again.
- [ ] Saving, renaming, duplicating and deleting a view round-trips through `settings.json`.
- [ ] A view exclude adds to the global ones and never removes one.
- [ ] Switching from an edited list to another drops the edit, and the saved view is unchanged on disk.

## Notes

- **Size:** M to L. The "modified" marker was split into Issue 29.

## Comments

- 2026-11-12: the owner kept the `#to-list` default and revised B1 to (b): the vault opens on "To list", seeded from the saved section tags. Two criteria about removing the `#to-list` store default and the e2e section-tag clearing were dropped: the default does not change. Bare Issue numbers in this text use the tasks-view numbering (Issue 12 is 115, Issue 16 is 123, Issue 29 is 126).
