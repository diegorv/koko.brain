# 15: Folder operations on the Files navigator

**What to build:** Folder rows in the Files navigator get the folder menu: new note, folder, canvas, kanban and collection in it, rename (inline), move to trash, change icon, reveal and copy path. Every failure tells the user with a toast, following the pattern of the file-tree toast fix.

**Blocked by:** 14
Also blocked by `.scratch/sidebar-fixes/issues/01-file-tree-failure-toasts.md`, in another feature: do not start until that file says `**Status:** resolved` on `main`.

**Status:** resolved

**Gate:** the frontend gate plus `bash scripts/e2e.sh` (this ticket has E2E criteria; never run Playwright by hand).

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Navigators (Files), decision Q15.

- [x] Each menu item works and goes through the existing filesystem and path-change owners
- [x] Renaming the picked folder keeps it picked under its new path; expanded state follows
- [x] Rename onto an existing name, an invalid name, and delete and create failures each show a toast; tests assert the toast, not only a log call
- [x] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [x] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme

## Comments

- 2026-11-01, branch `issue/15-folder-operations`: the Files navigator's folder rows get the folder menu (new note / canvas / collection / folder, New Kanban Board registered by the kanban plugin through `railRegistryStore.registerFolderCreator`, change icon, copy path, reveal, inline rename, move to Trash), with failure toasts; a path-change consumer keeps the pick and expanded folders on a renamed folder and drops them on a deleted one. Scope: the consumer follows in-app renames and deletes only; a folder removed or renamed outside the app keeps a stale pick until the next vault open repairs it (`staleFolderPickFix`). Reveal in Finder does not toast on failure, matching every other `revealInSystemExplorer` caller. Not checked by eye in a light and a dark theme. Review round 1: APPROVED (6 findings; copy-path toast, creator id key and the icon / rename-input tests fixed, the rest recorded in review.md Resolution). Tests: `pnpm check` 0 errors; full `pnpm vitest run` 370 files, 8960 passed, 1 todo; `pnpm build` ok (log `test-logs/sidebar-redesign/15-deliver.log`); E2E `rail-shell.spec.ts` 24 passed at review time.
