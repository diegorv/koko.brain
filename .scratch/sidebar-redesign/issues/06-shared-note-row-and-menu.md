# 06: Prefactor: one note row and one row menu

**What to build:** The row and its context menu in today's Types note list become one shared component in `features/`, so the rail shell's note list can reuse them. Nothing visible changes in the classic shell.

**Blocked by:** none
Also blocked by `.scratch/sidebar-fixes/issues/02-remove-dead-trash-shortcut-hint.md`, in another feature: do not start until that file says `**Status:** resolved` on `main`.
Also blocked by `.scratch/sidebar-fixes/issues/03-types-view-sort-visible-order.md`, in another feature: do not start until that file says `**Status:** resolved` on `main`.

**Status:** ready-for-agent

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Lenses (Row), ADR 0033 Consequences.

- [ ] The classic Types note list looks and behaves exactly as before: the existing Types note list tests pass without edits to their assertions
- [ ] The row menu keeps every item and its behavior (open in new tab, duplicate, copy path, change icon, favorite, reveal, rename, move to trash), as left by the trash-hint fix
- [ ] Inline rename still works from the shared row
- [ ] No behavior change: the commit says so, and any pure helpers moved out keep their tests
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
