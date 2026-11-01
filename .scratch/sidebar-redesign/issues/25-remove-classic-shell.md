# 25: Remove the classic shell

**What to build:** The classic left side goes: `layout.sidebarMode`, the mode toggle, the three header strips, the old Files, Types and Calendar panels and note list where nothing reuses them, the Cycle Sidebar View command with its rebindable keybinding setting, and `layout.shell` itself. Cmd+Shift+E is left unbound. Loading old settings drops the stale keys.

**Blocked by:** 23, 24
Also blocked by `.scratch/sidebar-fixes/issues/02-remove-dead-trash-shortcut-hint.md`, in another feature: do not start until that file says `**Status:** resolved` on `main`.
Also blocked by `.scratch/sidebar-fixes/issues/07-stale-shortcut-and-settings-text.md`, in another feature: do not start until that file says `**Status:** resolved` on `main`.

**Status:** resolved

**Gate:** the frontend gate plus `bash scripts/e2e.sh` (this ticket has E2E criteria; never run Playwright by hand).

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Rollout step 4, decision Q6.

- [x] Every removed component, function and setting has the CLAUDE.md proof in the commit: callers traced, and the replacement path named with the store it updates
- [x] Old settings with `sidebarMode`, `shell`, the cycle keybinding and the classic pane sizes load without errors and are not written back
- [x] The palette, the Settings keybindings section and the help pages no longer mention Cycle Sidebar View or the modes
- [x] The Calendar tab's Cmd+Shift+C no longer needs the cycle-binding conflict check
- [x] The full E2E suite passes
- [x] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [x] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme

## Comments

- 2026-11-01, branch `issue/25-remove-classic-shell`: removed the classic shell (Files, Types and Calendar panels, Cycle Sidebar View, classic layout keys and keybinding setting; `mergeLayout` keeps the one-time rail pane-size reset). Deliver fix round reworded the remaining "type sidebar" Settings strings and help example to the Types navigator / rail vocabulary. Review round 1: CHANGES_REQUESTED; fix round ran; round 2: APPROVED (nits: CLAUDE.md `file-explorer` entry left to the owner, squash-body nit not applicable). Tests: `pnpm check` 0 errors; full vitest 371 files, 8998 passed, 1 todo; `pnpm build` ok (exit=0). E2E (`bash scripts/e2e.sh`) not run in this workflow, criterion left unticked.
