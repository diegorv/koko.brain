# 15: Folder operations on the Files navigator

**What to build:** Folder rows in the Files navigator get the folder menu: new note, folder, canvas, kanban and collection in it, rename (inline), move to trash, change icon, reveal and copy path. Every failure tells the user with a toast, following the pattern of the file-tree toast fix.

**Blocked by:** 14
Also blocked by `.scratch/sidebar-fixes/issues/01-file-tree-failure-toasts.md`, in another feature: do not start until that file says `**Status:** resolved` on `main`.

**Status:** ready-for-agent

**Gate:** the frontend gate plus `bash scripts/e2e.sh` (this ticket has E2E criteria; never run Playwright by hand).

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Navigators (Files), decision Q15.

- [ ] Each menu item works and goes through the existing filesystem and path-change owners
- [ ] Renaming the picked folder keeps it picked under its new path; expanded state follows
- [ ] Rename onto an existing name, an invalid name, and delete and create failures each show a toast; tests assert the toast, not only a log call
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
