# 22: Neighbourhood lens

**What to build:** In the rail shell the action bar gains Neighbourhood. It fills the note list with the note on top, then its outgoing links, its backlinks, and its relationship groups (belongs to, related to, has many, other relationships), each with a count; empty groups show 0. There is no New here. The button is hidden in the classic shell, which has no note list.

**Blocked by:** 04, 07

**Status:** resolved

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Lenses (Neighbourhood), Note action bar.

- [x] Logic test first: the groups and their order for a note with links in every direction, and for a note with none
- [x] The data comes from the vault index commands and refreshes when the vault index version bumps
- [x] Neighbourhood is a foldable action: it moves into More when the bar is narrow
- [x] Hidden in the classic shell
- [x] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [x] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme

## Comments

- 2026-11-01, branch `issue/22-neighbourhood-lens`: Neighbourhood lens in the rail shell (grouped lens in `lens.logic.ts`, `neighbourhood.store`/`neighbourhood.service`, foldable Neighbourhood action in the note action bar, hidden in classic, E2E + help docs). Deliver fix: a `neighbourhood` path-change consumer so the open neighbourhood follows its note through rename/move and falls back to Today on delete. Review round 1: APPROVED (1 minor fixed, 1 nit kept as the documented default). Full suite: 380 files, 9166 passed, 1 todo; `pnpm build` ok (`test-logs/sidebar-redesign/22-deliver.log`).
