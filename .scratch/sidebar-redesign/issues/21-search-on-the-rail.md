# 21: Search on the rail

**What to build:** The rail gains Search at the top. Search, the "/" key outside text inputs, and in the rail shell Cmd+Shift+F, the palette's search command, a tag click in the Tags tab and a `kokobrain://search` link all land on it with their query. The note list header becomes the search input with today's text / semantic / hybrid controls, and the rows are today's search result rows with their snippets. There is no New here. The classic shell keeps today's SearchPanel.

**Blocked by:** 07

**Status:** resolved

**Gate:** the frontend gate plus `bash scripts/e2e.sh` (this ticket has E2E criteria; never run Playwright by hand).

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Lenses (Search) and Shortcuts, decision Q14.

- [x] "/" opens Search and focuses the input only when focus is not in a text input or the editor
- [x] Cmd+Shift+F, the palette command, a tag click and a search deep link each open rail Search with the expected query in the rail shell, and SearchPanel in the classic shell
- [x] Results, modes and snippets behave exactly as in today's SearchPanel
- [x] Escape leaves the input
- [x] E2E: press "/", type a query, the matching note shows with its snippet
- [x] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [x] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme

## Comments

- 2026-11-01, branch `issue/21-search-on-the-rail`: Search is a rail item that fills the note list with a rail variant of SearchPanel; "/", Cmd+Shift+F, the palette command, tag clicks and search deep links go through `openSearch` / `toggleSearch`. Fix round after review: rail Search no longer steals focus on an unasked mount (Cmd+2, a saved rail item, a layout switch), "/" is ignored inside dialogs, and the help pages document "/" and the rail Cmd+Shift+F. Review round 1: APPROVED (2 minor, 3 nits; 3 fixed, 2 nits rejected with reasons in the review's Resolution). Tests: `pnpm check` 0 errors; full `pnpm vitest run && pnpm build` 378 files, 9128 passed, 1 todo, build ok (`test-logs/sidebar-redesign/21-deliver.log`).
