# 13: View lens

**What to build:** The Types navigator gains Views above Types, with counts and a New view button. Picking a view fills the note list with the view's query result, in the order its Sort shows. The Sort and Filter popovers sit in the list header and persist to the `.view` file as today. New here creates a note of the view's type when the view filters exactly one `_type`, otherwise a plain note. Today's view context menu works on the navigator rows.

**Blocked by:** 12
Also blocked by `.scratch/sidebar-fixes/issues/03-types-view-sort-visible-order.md`, in another feature: do not start until that file says `**Status:** resolved` on `main`.

**Status:** resolved

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Navigators (Types) and Lenses (View), decision Q16.

- [x] Logic test first for the New here type inference: one `_type` equality filter gives that type; none, several, or an OR group gives a plain note
- [x] The list order follows the view's Sort, the single source of truth the view-sort fix established
- [x] Changing Sort or Filter updates the list and persists to the `.view` file
- [x] The picked view survives a restart; a deleted view falls back to the default item
- [x] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [x] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme

## Comments

- 2026-11-01, branch `issue/13-view-lens`: Views section above Types in the Types navigator (counts, New view, the classic view context menu); the view lens fills the note list with the `.view` query in its Sort order, Sort and Filter popovers in the header persist to the file, New here infers the type from one `_type` equality filter (also `note.` / `property.` forms). Review round 1: APPROVED with 6 findings; fixed 1, 2, 4, 5, 6 (save no longer clobbers a view picked mid-save, failed save re-seeds from the file, typed New here for `note._type` filters, stronger restart E2E, view test mocks only the disk); finding 3 (rule text vs the PRD's "the view's label") left for the owner. Tests: `pnpm check` 0 errors; full suite `pnpm vitest run && pnpm build` 367 files, 8863 passed, 1 todo, exit 0; `e2e/specs/rail-shell.spec.ts` 18 passed.
