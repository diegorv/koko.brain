# 08: New here on the note list

**What to build:** The note list header gets "+ New here". It creates a note that inherits what the current lens knows, through one lens-to-new-note rule that every later lens extends. In the Inbox it creates a plain note (where Cmd+N puts one today) with `_organized: false`, opens it, and the note appears in the list.

**Blocked by:** 07

**Status:** resolved

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Lenses (New here column), decision Q16.

- [x] Logic test first: the Inbox lens yields the Cmd+N folder and `_organized: false`; a lens with no creation rule yields none and the button is hidden
- [x] New here in the Inbox creates and opens the note, and the Inbox list shows it
- [x] Creation goes through the existing note creation and note-change owners (no new indexing path)
- [x] A failed creation shows a toast and creates nothing
- [x] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [x] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme

## Comments

- 2026-10-31, branch `issue/08-new-here-on-note-list`: "+ New here" in the rail note list header creates a note from the lens creation rule (Inbox: Cmd+N folder, `_organized: false`) through `createFile` and opens it. Round 1 fixes: a re-entry guard against double clicks, tab-bar text tokens for the button, JSDoc on `createNoteHere`'s post-write rejection, `cursor-default`. Round 2 nit (unpinned hover pair) rejected and deferred to a theme-token Issue. Reviews: round 1 CHANGES_REQUESTED, round 2 APPROVED. Full suite: vitest 364 files, 8710 passed, 1 todo; `pnpm build` ok (exit 0).
