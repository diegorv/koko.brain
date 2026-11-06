# 19: Task tag quick filter

**What to build:** Rust already sends each task's tags (`metadata.tags`, `src-tauri/src/vault/task.rs:42-130`), and Issue 05 shows them as chips, but nothing filters on them. Add a tag quick filter next to Issue 07's status, due and priority menus (PRD "Filtering", goal 2).

- A "Tag" menu (trigger `Tag` when empty, `Tag: #a, #b` otherwise) with one checkbox item per tag present in `tasksStore.rows` (before the quick filters, so choosing one tag does not hide the others), shown with a leading `#`, de-duplicated case-insensitively (first spelling wins) and sorted case-insensitively. Empty means any. A task passes when it carries any of the chosen tags.
- `quick.tags` stores the tags without `#`, as Rust emits them (`parsing.rs:3219`).
- A chosen tag `work` matches a task tag `work` or one starting with `work/` (nested prefix, the same rule as the note tag clause in Issue 13). Today's `TASK_TAG_RE` (`parsing.rs:1576-1577`) never emits a `/`, so the nested case only shows once Issue 26 lands; the logic covers it now.
- Matching is case-insensitive.
- `applyQuickFilters` evaluates `quick.tags` (with the dimmed-parent rule of Issue 07). The rule sentence (Issue 07's `describeTaskRule`, or `describeTaskQuery` once Issue 13 has landed) adds `, tagged #a or #b` after the priority part. The empty state checks the tag filter after priority and before search: "No task matches the Tag filter" with `{ kind: 'resetQuick', field: 'tags', label: 'Reset' }`. Reset (Issue 07) and the `Filters (n)` count include the tag filter.
- This Issue works on the tags Rust emits today. Which characters a task tag may hold is Issue 26 (decision B7); the filter needs no change when that rule changes.

**Blocked by:** 07

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `task-query.logic.test.ts`: the tag filter with a nested prefix (`work` keeps `work/client`, drops `workshop`), with two tags (any of them), with a different case, and with an empty set (no filtering). Fails today (no `quick.tags`).
- [ ] The tag list helper (`taskTagOptions(rows)` in `task-query.logic.ts`) de-duplicates by case and sorts.
- [ ] `TasksView.test.ts` with real stores: choosing `#work` in the Tag menu lists only rows tagged `work` or `work/...`, and Reset brings the rest back.

## Notes

- **Size:** S. The parser half of the old Issue 19 (Unicode task tags) moved to Issue 26, because open Issue `audit-2026-11-05/142` (migrated from `tags-obsidian-parity/01`) asks for an owner decision on the task tag rule first.
