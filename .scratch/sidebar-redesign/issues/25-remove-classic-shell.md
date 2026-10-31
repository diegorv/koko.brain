# 25: Remove the classic shell

**What to build:** The classic left side goes: `layout.sidebarMode`, the mode toggle, the three header strips, the old Files, Types and Calendar panels and note list where nothing reuses them, the Cycle Sidebar View command with its rebindable keybinding setting, and `layout.shell` itself. Cmd+Shift+E is left unbound. Loading old settings drops the stale keys.

**Blocked by:** 23 (The rail shell becomes the default); 24 (Bookmarks merge into Favorites)
Also blocked by `.scratch/sidebar-fixes/issues/02-remove-dead-trash-shortcut-hint.md`, in another feature: do not start while that file exists on `main`.
Also blocked by `.scratch/sidebar-fixes/issues/07-stale-shortcut-and-settings-text.md`, in another feature: do not start while that file exists on `main`.

**Status:** ready-for-agent

**Gate:** the frontend gate plus `bash scripts/e2e.sh` (this ticket has E2E criteria; never run Playwright by hand).

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Rollout step 4, decision Q6.

- [ ] Every removed component, function and setting has the CLAUDE.md proof in the commit: callers traced, and the replacement path named with the store it updates
- [ ] Old settings with `sidebarMode`, `shell`, the cycle keybinding and the classic pane sizes load without errors and are not written back
- [ ] The palette, the Settings keybindings section and the help pages no longer mention Cycle Sidebar View or the modes
- [ ] The Calendar tab's Cmd+Shift+C no longer needs the cycle-binding conflict check
- [ ] The full E2E suite passes
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
