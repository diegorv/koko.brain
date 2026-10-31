# 04: Action bar: view and file actions

**What to build:** The action bar gains Raw (Cmd+\), note width (normal / wide, one global setting), Table of contents, Reveal in Finder, Copy path (absolute) and, in More, Copy deeplink. Raw moves from Cmd+K to Cmd+\ and Cmd+K becomes free. When the bar runs out of width, width, TOC and the two path actions fold into More.

**Blocked by:** 03

**Status:** ready-for-agent

**Gate:** the frontend gate plus `bash scripts/e2e.sh` (this ticket has E2E criteria; never run Playwright by hand).

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Note action bar and Shortcuts, decisions Q11 and Q23.

- [ ] Raw toggles source mode from the button and Cmd+\; Cmd+K no longer does anything; the source-mode E2E spec, the shortcut list and the help pages say Cmd+\
- [ ] Note width switches every note between the configured content width and full width, persists across restarts, and the button shows the current state
- [ ] TOC shows the right sidebar with the Table of contents section open
- [ ] Reveal in Finder and Copy path work on the active note; Copy path copies the absolute path and confirms with a toast
- [ ] Copy deeplink copies a `kokobrain://open` link for the note, and a round-trip test shows the deep-link parser resolves it to the same note
- [ ] Logic test first for the overflow: given the available width, the foldable actions move into More in a fixed order, and back when space returns; the order leaves room for a later Neighbourhood action
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
