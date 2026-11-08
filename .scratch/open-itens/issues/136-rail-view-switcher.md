# 136: Rail view switcher for multi-view files

**Origin:** `view-engine-fixes` Issue 09, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/view-engine-fixes/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** the rail runs only `views[railViewIndex]` (`src/lib/features/rail-shell/lens.logic.ts:792`). With several views in a file, switching what the rail lists means editing `_rail_view` (in view-editor 07's dialog, or by hand).

- When the picked `.view` has two or more views, the rail list header shows a view picker (the view names, the running one checked). Picking one writes `_rail_view` through the dialog's patch writer (`applyViewDialogPatch` from view-editor 02, via `rewriteViewFile` with `promptIndexRefresh`), and the list re-runs.
- Calendar-type views stay listed as lists in the rail (it cannot draw calendars), so the picker marks them "(list)".

**Blocked by:** 013

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `src/tests/lib/features/rail-shell/RailNoteList.view.test.ts`: picking "Board" renders Board's rows and writes content with `_rail_view: Board` (the mocked write).
- [ ] `help/documentation/25-types-and-relationships.md` § Multiple Views in a .view File: the picker.

## Notes

- **Run after (other feature):** view-editor 07 and 04 (07 needs 02, which creates `applyViewDialogPatch`). relay-lite does not enforce this.
- **Size:** M.
