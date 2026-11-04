# 20: The Views section has groups, hidden views and Move to Trash

**What to build:** Three `.view` keys and one menu item give Types > Views structure. `_group: Work` puts the view under a "Work" subheading inside Views; views without `_group` stay at the top, ungrouped. Groups sort by name and views inside a group by `_order`, then label. `_visible: false` hides the view from Views (it stays a file, reachable from Files and the palette). The view row menu gets "Move to Trash", using the same trash path and confirmation as Files. View names sort naturally ("Week 2" before "Week 10"), like the file tree.

**Blocked by:** 10, 17, 19

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] `viewNavigatorRows` (or its successor) groups by `_group`, orders groups by name and rows by `_order` then label with natural comparison (logic test, real entries)
- [ ] `_visible: false` (YAML boolean) drops the row; `"false"` is reported as an ignored key through Issue 10's tooltip (logic test)
- [ ] The Types navigator renders group subheadings and keeps keyboard and click behaviour per row, `_open_in_editor` rows included (component test, real stores and real row builder)
- [ ] "Move to Trash" on a view row moves the `.view` through the existing trash service, clears a saved pick of that view, and shows the failure toast on error (component test, Tauri boundary mocked)
- [ ] Help 25's View Metadata Fields table lists `_group` and `_visible`; ADR 0027 is amended with both keys

## Notes

- **Owner decision (2026-11-04):** menus of one's own start with structure inside Views (option D of the review), then pins (Issue 21).
- **Today (traced):** Views are a flat list sorted with `localeCompare` (`features/type-definitions/type-sidebar.logic.ts:297-315,360`); the view row menu has no trash (`features/rail-shell/TypesNavigator.svelte:262-294`).
- **Out of scope:** renaming a view (label) is "Edit view" in Issue 19; the label frozen as "Untitled" goes away with Issue 17's name dialog.
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F54, F23.
- **Size:** S.

## Comments
