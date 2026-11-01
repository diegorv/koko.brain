# 09: Favorites and Archive lenses

**What to build:** The rail gains Favorites (after Inbox) and Archive (at the bottom). Favorites lists favorite, not archived notes, and its New here creates a plain note with `_favorite: true`. Archive lists archived notes and has no New here; restoring a note from the action bar removes it from the list.

**Blocked by:** 03, 08

**Status:** resolved

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Rail and Lenses, decision Q8.

- [x] Logic tests first for both lenses' rules and for Favorites' creation rule
- [x] Favoriting or archiving a note from the action bar updates the open list without a restart
- [x] Archive shows no New here button
- [x] The rail order matches the PRD (Favorites after Inbox; Archive pinned to the bottom)
- [x] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [x] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme

## Comments

- 2026-11-01, branch `issue/09-favorites-and-archive-lenses`: rail gains Favorites (after Inbox; New here writes `_favorite: true`) and Archive (pinned to the bottom; no New here), both as built-in lenses in `lens.logic.ts`. Fix round after review: rows are italic only for Inbox notes in every lens (`isInboxEntry`), and the built-in New here frontmatter lives on `BuiltInLens.newNote` instead of a second map. Tests: `pnpm check` 0 errors; full suite `pnpm vitest run && pnpm build` passed (364 files, 8732 tests, 1 todo; build ok); review ran the rail-shell E2E spec (7 passed). Review round 1: APPROVED (1 minor, 1 nit, both fixed).
