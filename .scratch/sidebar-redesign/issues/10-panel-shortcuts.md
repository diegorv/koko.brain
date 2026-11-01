# 10: Cmd+1, Cmd+2 and Cmd+Shift+B in the rail shell

**What to build:** In the rail shell Cmd+1 hides the panels between the rail and the editor (the note list, and the navigator whenever one is shown), Cmd+2 shows them, and Cmd+Shift+B toggles them. The rail never hides. The classic shell keeps today's Cmd+Shift+B, and Cmd+1 / Cmd+2 do nothing there.

**Blocked by:** 07

**Status:** resolved

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Layout and Shortcuts, decision Q12.

- [x] Keybinding tests for the three shortcuts in both shells
- [x] The hidden state persists across restarts
- [x] With the panels hidden the editor takes the space, and the macOS traffic lights still have room
- [x] The shortcut list and help pages list the new bindings
- [x] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [x] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme

## Comments

- 2026-11-01, branch `issue/10-panel-shortcuts`: rail shell gains `layout.railPanelsVisible` (persisted, default true) with hide/show/toggle in `layout.service.ts`; Cmd+1 hides and Cmd+2 shows the rail panels, Cmd+Shift+B toggles them in the rail shell (classic unchanged, Cmd+1/2 no-op there); `AppShell.svelte` drops the note-list pane and renders a 24 px traffic-light spacer when hidden; help docs and reserved-keybinding labels ("Hide Panels" / "Show Panels") updated. Review round 1: APPROVED (finding 2 fixed, finding 1 deferred to the owner, finding 3 not changed). Full suite: 364 files, 8744 tests passed, 1 todo, `pnpm build` ok (`test-logs/sidebar-redesign/10-deliver.log`).
