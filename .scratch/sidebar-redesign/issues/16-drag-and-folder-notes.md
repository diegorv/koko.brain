# 16: Drag to move and folder notes in the rail shell

**What to build:** Folders can be dragged onto folders in the Files navigator, and note list rows onto navigator folders, to move them. With the folder notes setting on, picking a folder that has a folder note also opens it, as in today's tree.

**Blocked by:** 15

**Status:** resolved

**Gate:** the frontend gate plus `bash scripts/e2e.sh` (this ticket has E2E criteria; never run Playwright by hand).

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Navigators (Files), decision Q15.

- [x] Dragging a list row onto a folder moves the file; dragging a folder onto a folder moves it; the list and the navigator update
- [x] Moving the picked folder keeps it picked under its new path
- [x] A move onto an existing name shows a toast and moves nothing
- [x] With folder notes on, picking a folder with a folder note opens it; with the setting off it does not
- [x] E2E: drag a note from the list onto another folder and it shows there
- [x] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [x] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme

## Comments

- 2026-11-01, branch `issue/16-drag-and-folder-notes`: folder rows on the files navigator are draggable and every folder row plus the root row accept drops (file or folder, through `moveItem` / `applyPathChange`); note-list rows in the rail drag their path; a folder moved into a collapsed folder expands it; picking a folder with folder notes on opens its folder note. Deliver fixes: a drop whose text is not a path in the file tree is ignored, and the picked row under a drag shows only the drop background. Tests: `pnpm check` 0 errors; full suite `pnpm vitest run && pnpm build` exit 0, 370 files, 8984 passed, 1 todo (`test-logs/sidebar-redesign/16-deliver.log`); targeted E2E run by the review, 2 passed. Review round 1: APPROVED (one minor, one nit, both fixed).
