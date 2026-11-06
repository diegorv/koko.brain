# 05: Sort & limit section

**What to build:** a section for the three keys that decide the order and size of the list. No UI writes `limit` or `_sort` today.

| Field | Key | Control | Read | Write |
|---|---|---|---|---|
| View sort | `views[idx].sort` | `SortPanel` (`toolbar/SortPanel.svelte`: `sorts`, `availableProperties`, `propertyConfigs = definition.properties ?? {}`, `propertyIndex`, `onSortsChange`) | empty means not set | the list, `direction` uppercase `ASC`/`DESC`; empty deletes the key |
| List order | `_sort` (alias root `sort`) | `Select`: "Default (modified, newest first)" plus `VIEW_SORTS` (`type-sidebar.logic.ts:395`) with the labels of the Sort Mode table in the help | `getViewSort`; a wrong value, or a root `sort:` list, shows the default with the ignored note | the value; "Default" deletes `_sort` and `sort` |
| Limit | `views[idx].limit` | number input; empty means not set | a finite integer of at least 1 is set; `.nan` and `.inf` show as ignored; `2.5` shows "acts as 2" | an integer from 1; required to be one when touched; empty deletes the key |

- While the view sort is not empty, the List order select is disabled with: "The view's sort wins; _sort and _order pins apply only without it" (`type-note-list.logic.ts:96-98`).
- If `view-engine-fixes/04` has not landed, an info line under the view sort: "With DESC, notes without the value come first" (`collection.logic.ts:426-434`). If it has, no line.
- The preview (03) passes the draft `_sort` as `listSort` and the draft view sort, and applies the draft limit: "N of M notes".
- New view shows the `_sort: title` preset as set (PRD default D6). `createView` (`type-definitions.service.ts:271-279`) takes the patch: `buildNewViewYaml`, then `applyViewDialogPatch`.
- Collapsed summary: `title, max 50`, or `due DESC, max 50`.

**Blocked by:** 04

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first:
  - `src/tests/lib/features/type-definitions/view-dialog.logic.test.ts`: the reader states for `_sort`, a root `sort` list, `limit` `.nan`, `.inf` and `2.5`; clearing `_sort` deletes `sort` too; an untouched ignored `_sort: "Title"` is kept.
  - `src/tests/lib/features/type-definitions/ViewDialog.svelte.test.ts`:
    - Setting limit 1 renders "1 of 3 notes".
    - Choosing Title reorders the preview titles.
    - With a view sort set, the List order select is disabled and its explanation renders.
    - Save writes `sort` under the edited view and `_sort` at the root (assert on the patch handed to the mocked `editView`, and on `applyViewDialogPatch` output in the logic test).
  - `src/tests/lib/features/type-definitions/create-view-folder.service.test.ts`: New view with a limit writes `limit` under `views[0]`.
- [ ] `help/documentation/25-types-and-relationships.md` § Sort Mode, View Metadata Fields (`_sort`, `sort`, `limit` rows) name the dialog as a way to set them.

## Notes

- **Size:** M.
