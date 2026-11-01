# 23: The rail shell becomes the default

**What to build:** `layout.shell` defaults to Rail for new settings, and existing settings move from Classic to Rail once; users can still switch back until the classic shell is removed. The default pane sizes are checked so the editor keeps a usable width at 1440 px with the right sidebar open. The help pages describe the rail shell, and the sidebar E2E specs run against it. ADR 0033 becomes `active`, and ADR 0026 gets a dated amendment saying its "file-tree sidebar remains the default" consequence is replaced by ADR 0033.

**Blocked by:** 09, 10, 13, 16, 18, 20, 21, 22
Also blocked by `.scratch/sidebar-fixes/issues/08-help-pages-match-behavior.md`, in another feature: do not start until that file says `**Status:** resolved` on `main`.

**Status:** ready-for-agent

**Gate:** the frontend gate plus `bash scripts/e2e.sh` (this ticket has E2E criteria; never run Playwright by hand).

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Rollout step 3, Risks (Width), decision Q22.

- [ ] A new install starts in the rail shell; an existing Classic setting migrates to Rail exactly once, and a user who switches back stays on Classic
- [ ] The commit states the measured editor width at 1440 px with every panel open and the chosen default sizes
- [ ] The file explorer, types and calendar help pages describe the rail shell; no page promises behavior the app lacks
- [ ] ADR 0033 is `active` (frontmatter and the README index), with code citations updated to the shipped files; ADR 0026 carries the dated amendment
- [ ] The sidebar, file explorer, calendar and search E2E specs pass in the rail shell
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
