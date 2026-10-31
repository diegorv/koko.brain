# 17: Calendar navigator and day lens

**What to build:** The rail gains Calendar. It opens a navigator with the mini month (previous and next month and year, the configured week start, today highlighted and moving at midnight, dots counted by note date). Picking a day fills the note list with the notes whose note date is that day, and the header offers that day's daily note. New here creates a plain note with `date: <that day>`. The navigator and the day lens are owned by `plugins/calendar` and register into the rail shell (PRD, Code placement).

**Blocked by:** 01 (A note's day has one rule); 12 (Types navigator and type lens)
Also blocked by `.scratch/sidebar-fixes/issues/04-sidebar-calendar-week-start.md`, in another feature: do not start while that file exists on `main`.
Also blocked by `.scratch/sidebar-fixes/issues/05-sidebar-calendar-today-and-month-label.md`, in another feature: do not start while that file exists on `main`.

**Status:** ready-for-agent

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Navigators (Calendar), Lenses (Day), Code placement, decision Q2.

- [ ] Logic test first: the day lens lists exactly the notes whose note date is the day
- [ ] The mini month follows `weekStartsOn` and the today highlight follows the clock, as the two calendar fixes established
- [ ] The header's Daily note opens or creates that day's daily note
- [ ] New here writes `date: <day>` and the note appears in that day's list
- [ ] The picked day survives a restart
- [ ] The registration is wired at vault open, unwired at teardown, and pinned by a test
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
