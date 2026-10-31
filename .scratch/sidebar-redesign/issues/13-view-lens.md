# 13: View lens

**What to build:** The Types navigator gains Views above Types, with counts and a New view button. Picking a view fills the note list with the view's query result, in the order its Sort shows. The Sort and Filter popovers sit in the list header and persist to the `.view` file as today. New here creates a note of the view's type when the view filters exactly one `_type`, otherwise a plain note. Today's view context menu works on the navigator rows.

**Blocked by:** 12 (Types navigator and type lens)
Also blocked by `.scratch/sidebar-fixes/issues/03-types-view-sort-visible-order.md`, in another feature: do not start while that file exists on `main`.

**Status:** ready-for-agent

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Navigators (Types) and Lenses (View), decision Q16.

- [ ] Logic test first for the New here type inference: one `_type` equality filter gives that type; none, several, or an OR group gives a plain note
- [ ] The list order follows the view's Sort, the single source of truth the view-sort fix established
- [ ] Changing Sort or Filter updates the list and persists to the `.view` file
- [ ] The picked view survives a restart; a deleted view falls back to the default item
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
