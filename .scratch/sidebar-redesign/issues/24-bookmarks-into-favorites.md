# 24: Bookmarks merge into Favorites

**What to build:** On vault open, once per vault, every bookmarked markdown file gets `_favorite: true`. Bookmarks on folders and non-markdown files cannot carry frontmatter: they are listed in one toast and dropped. After a successful migration the bookmarks file is deleted. The Bookmark menu item and the bookmarks feature are removed.

**Blocked by:** 23

**Status:** resolved

**Gate:** the frontend gate plus `bash scripts/e2e.sh` (this ticket has E2E criteria; never run Playwright by hand).

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Rollout (Bookmark migration), decision Q7.

- [x] Test first: a vault with markdown, folder and canvas bookmarks ends with `_favorite: true` on the markdown files, one toast naming the others, and no bookmarks file
- [x] Running it again does nothing; a vault with no bookmarks file shows no toast
- [x] A failed frontmatter write keeps the bookmarks file for the next open and shows a toast
- [x] No menu still offers Bookmark; the bookmarks code, its tests and its E2E spec are gone, each removal traced per CLAUDE.md
- [x] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [x] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme

## Comments

- 2026-11-01, branch `issue/24-bookmarks-into-favorites`: legacy bookmarks migrate to `_favorite: true` on vault open (markdown notes inside the vault only; the rest is named in one toast), the bookmarks feature is removed, help docs updated. Review round 1: CHANGES_REQUESTED (outside-vault writes, mid-write vault switch, silent unparseable file), fixed. Review round 2: APPROVED with one minor and two nits, all fixed at deliver (vault-switch guard between bookmarks and before remove/toasts, `..` normalization, JSDoc rewrap). Full suite: 378 files, 9162 passed, 1 todo, `pnpm build` ok (`test-logs/sidebar-redesign/24-deliver.log`).
