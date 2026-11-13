# 17: Left-sidebar list rows use the same 8px corner as the rail and right sidebar

**What to build:** The same role, a full-width row with a hover or active fill, has two corners on either side of the editor. Left-sidebar rows use bare `rounded` (4px), while the rail icon next to them (`features/rail-shell/Rail.svelte:79`), every right-sidebar row (`TableOfContentsPanel.svelte:65`, `BacklinksPanel.svelte:72/99`, `LinkItem.svelte:17`, `OutgoingLinksPanel.svelte:71`, `TagItem.svelte:40/56`) and the settings nav (`app/SettingsPanel.svelte:141`) use `rounded-md` (8px). Change bare `rounded` to `rounded-md` on exactly these rows:

- `features/rail-shell/FilesNavigator.svelte` about line 286 (`rowClass`)
- `features/rail-shell/TypesNavigator.svelte` about line 265 (type row) and about line 403 (lens row)
- `features/note-list/NoteRow.svelte` about line 44 (rename wrapper) and about line 63 (row button)
- `plugins/one-on-one/MyPeopleSection.svelte` about line 42 (person row)
- `features/tasks/TasksView.svelte` about line 201 (task row)
- `features/event-calendar/EventCalendarNeedsAttention.svelte` about line 44 (row)

Nested controls inside these rows (the rename input at `NoteRow.svelte:57`, chips at `NoteRow.svelte:99/109`, the rename input at `FilesNavigator.svelte:458`) keep their radius here. Lower the radius-scale baseline for the six files by the sites removed.

**Blocked by:** 16

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing first: class assertions that the row element carries `rounded-md` and no bare `rounded` token (`/(^|\s)rounded(\s|$)/`), following the existing class assertions in each file: `src/tests/lib/features/rail-shell/FilesNavigator.test.ts` (the row loop at about line 147), `TypesNavigator.test.ts` (one type row and one lens row), `RailNoteList.test.ts` (the `row('beta')` NoteRow at about line 243) and `src/tests/lib/plugins/one-on-one/MyPeopleSection.test.ts`. They fail before the change and pass after
- [x] `TasksView.svelte:201` and `EventCalendarNeedsAttention.svelte:44` have no component test; their change is held by the radius-scale baseline, whose counts for those two files drop by one
- [x] The already-`rounded-md` sites listed above are unchanged
- [x] The radius-scale baseline is lowered for the six files and the ratchet passes

## Notes

- **Source:** review section 1 item 10; `.scratch/ux-polish/work/radius.md` P1.
- **Corrections to the lead:** `RailSection.svelte` has no row and no radius class (it is a settings section wrapper), and the settings nav is already `rounded-md`, so neither is touched.
- **Visible change:** rows go from 4px to 8px corners. No text, size or color changes, so the chrome type scale is not affected.
- **Out of scope:** inputs (radius.md P3), segmented controls (P6), popover rows (P10), the remaining bare `rounded` sites (Issue 18).
- **Size:** S.

## Comments

- 2026-11-04, branch `issue/17-sidebar-row-radius`: left-sidebar list rows (FilesNavigator, TypesNavigator, NoteRow incl. rename wrapper, MyPeopleSection, TasksView, EventCalendarNeedsAttention) moved from bare `rounded` to `rounded-md`; radius-scale baseline lowered for the six files. Fix round added a RailNoteList test for the rename wrapper corner. Tests: `pnpm check` 0 errors; full suite + build exit=0 (493 files, 11684 passed, 1 skipped, 1 todo). Reviews: round 1 APPROVED (two nits: one fixed, one rejected as Issue 18 scope), round 2 APPROVED.
