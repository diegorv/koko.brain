# 05: Action bar: New 1:1 and New linked note

**What to build:** Person notes get "New 1:1" in the action bar, and hub notes (notes whose type definition sets `_hub: true`) get "New linked note". New 1:1 creates the note through the existing 1:1 settings (folder, file name, template) and always writes `_related_to: [[Person]]`, even when the template does not; that link is now the only thing that makes a note count as a 1:1 (PRD, Today). New linked note creates a plain note with `_belongs_to: [[Hub]]` in the hub's folder. The Cmd+Shift+N 1:1 picker writes the same link because it shares the creation path. New 1:1 is owned by `plugins/one-on-one` and registers into the action bar (PRD, Code placement).

**Blocked by:** 03

**Status:** resolved

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Note action bar, Code placement, decisions Q18 and Q19.

- [x] `_hub` is read into the type metadata (default false), with a logic test
- [x] On a Person note, New 1:1 creates and opens a 1:1 whose frontmatter has `_related_to: [[<person>]]`; a template that already writes the link does not produce a duplicate
- [x] The Cmd+Shift+N picker writes the same link (one creation owner)
- [x] On a hub note, New linked note creates and opens a note in the hub's folder with `_belongs_to: [[<hub>]]`
- [x] Neither button shows on other notes; the registration is wired at vault open, unwired at teardown, and pinned by a test
- [x] A failed creation shows a toast and leaves no partial file
- [x] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [x] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme

## Comments

- 2026-10-31, branch `issue/05-action-bar-hub-actions`: `_hub` type flag, plugin action registry for the note action bar, New 1:1 (Person notes, writes `_related_to`, shared with the Cmd+Shift+N picker) and New linked note (hub notes, writes `_belongs_to`), help pages 03/09/25. Review round 1: APPROVED with 7 minor/nit findings; fix round hardened `ensureFrontmatterLink` (link stems, empty block, CRLF, plain value kept), raised `HUB_ACTION_WIDTH` to 136 and documented the invalid-template failure; finding 5 and the leading-blank-line half of 2 rejected (see review.md Resolution). Full suite: 356 files, 8599 passed + 1 todo, `pnpm build` ok (test-logs/sidebar-redesign/05-deliver.log).
