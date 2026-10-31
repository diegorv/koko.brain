# 16: Drag to move and folder notes in the rail shell

**What to build:** Folders can be dragged onto folders in the Files navigator, and note list rows onto navigator folders, to move them. With the folder notes setting on, picking a folder that has a folder note also opens it, as in today's tree.

**Blocked by:** 15 (Folder operations on the Files navigator)

**Status:** ready-for-agent

**Gate:** the frontend gate plus `bash scripts/e2e.sh` (this ticket has E2E criteria; never run Playwright by hand).

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Navigators (Files), decision Q15.

- [ ] Dragging a list row onto a folder moves the file; dragging a folder onto a folder moves it; the list and the navigator update
- [ ] Moving the picked folder keeps it picked under its new path
- [ ] A move onto an existing name shows a toast and moves nothing
- [ ] With folder notes on, picking a folder with a folder note opens it; with the setting off it does not
- [ ] E2E: drag a note from the list onto another folder and it shows there
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
