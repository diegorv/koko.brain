# 06: Prefactor: one note row and one row menu

**What to build:** The row and its context menu in today's Types note list become one shared component in `features/`, so the rail shell's note list can reuse them. Nothing visible changes in the classic shell.

**Blocked by:** none
Also blocked by `.scratch/sidebar-fixes/issues/02-remove-dead-trash-shortcut-hint.md`, in another feature: do not start until that file says `**Status:** resolved` on `main`.
Also blocked by `.scratch/sidebar-fixes/issues/03-types-view-sort-visible-order.md`, in another feature: do not start until that file says `**Status:** resolved` on `main`.

**Status:** resolved

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Lenses (Row), ADR 0033 Consequences.

- [x] The classic Types note list looks and behaves exactly as before: the existing Types note list tests pass without edits to their assertions
- [x] The row menu keeps every item and its behavior (open in new tab, duplicate, copy path, change icon, favorite, reveal, rename, move to trash), as left by the trash-hint fix
- [x] Inline rename still works from the shared row
- [x] No behavior change: the commit says so, and any pure helpers moved out keep their tests
- [x] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [x] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme

## Comments

- 2026-10-31, branch `issue/06-shared-note-row-and-menu`: the Types note list row and its context menu move into `features/note-list/` (`NoteRow.svelte`, `NoteRowMenu.svelte`, the rename context and the row type). `TypeNoteList.svelte` renders them, with no behavior change. Review round 1: APPROVED with 2 minor and 3 nit findings. Fixed in deliver: a test pins the mid-rename refresh guard, the Escape test title now says what it checks, and the open/copy/favorite/reveal tests assert that the menu closed. Deferred to the rail note list ticket: moving the shared helpers out of `type-definitions` (finding 2) and the region tokens (finding 5). Tests: `pnpm check` 0 errors; full suite 357 files / 8626 passed, 1 todo, and `pnpm build` ok (`test-logs/sidebar-redesign/06-deliver.log`).
