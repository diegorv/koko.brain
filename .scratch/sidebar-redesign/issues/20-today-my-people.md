# 20: My people on Today

**What to build:** Today shows My people between Pinned and the day's notes: the markdown files directly in `oneOnOne.workPeopleFolder` (the work half of the 1:1 picker's list), each with the days since their last 1:1 ("never" when none), flagged with the `warning` token past `oneOnOne.dueAfterDays` (a new setting, default 14). A 1:1 for a person is any note whose `_related_to` links that person, wherever it lives; its day is its note date. Body wikilinks and folders do not count. Each row opens the person and offers New 1:1. The section is owned by `plugins/one-on-one` and registers into Today.

**Blocked by:** 02, 05, 19

**Status:** ready-for-agent

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Lenses (Today), Code placement, decisions Q3, Q4 (revised) and Q19.

- [ ] Logic test first for last 1:1: a note with `_related_to: [[<person>]]` counts wherever it lives; a daily note that only mentions the person in its body does not; the latest note date wins; no 1:1 gives "never"
- [ ] Boundary test: exactly `dueAfterDays` days is not flagged, one more day is
- [ ] `oneOnOne.dueAfterDays` is in Settings with default 14 and changes the flag live
- [ ] New 1:1 from a row creates the linked 1:1 (ticket 05) and the row's days drop to 0
- [ ] The flag uses the `warning` token in every built-in theme
- [ ] The registration is wired at vault open, unwired at teardown, and pinned by a test
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
