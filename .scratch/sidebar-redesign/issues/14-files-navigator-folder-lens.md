# 14: Files navigator and folder lens

**What to build:** The rail gains Files. It opens a navigator that shows folders only, as a tree with a vault root. Picking a folder fills the note list with that folder's direct children of every kind: markdown, canvas, kanban, `.view`, PDF and images, each with its kind's icon; opening one behaves as it does from the file tree today. New here creates a note in that folder. Expanded folders persist.

**Blocked by:** 12

**Status:** ready-for-agent

**Gate:** the frontend gate plus `bash scripts/e2e.sh` (this ticket has E2E criteria; never run Playwright by hand).

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Navigators (Files) and Lenses (Folder), decision Q15.

- [ ] Logic test first: a folder lens lists direct children only (not nested ones), of every file kind, with the rule "in <folder>/"
- [ ] Hidden folders stay out, as in today's tree
- [ ] New here creates the note in the picked folder and the list shows it
- [ ] Expanded folders and the picked folder survive a restart; a folder that no longer exists falls back to the default item
- [ ] E2E: pick a folder, the list shows its notes and a canvas in it, and opening the canvas works
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
