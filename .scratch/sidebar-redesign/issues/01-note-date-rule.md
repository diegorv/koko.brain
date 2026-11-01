# 01: A note's day has one rule

**What to build:** Which day a note belongs to is decided by one pure function: frontmatter `date`, else frontmatter `created`, else the file's disk creation time. The sidebar calendar's dots and its selected-day file list use it now, so a meeting dated the 27th but written on the 30th shows on the 27th, while imported notes without `date` keep their `created` day. The later Day and Today lenses use the same function.

**Blocked by:** none

**Status:** resolved

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Terms (Note date), decision Q2.

- [x] Logic test first: `date` wins over `created`, `created` over the disk time; an unparseable value falls through to the next source and never throws; a note with no source has no day
- [x] The rule lives in `utils/` so both `plugins/calendar` and the `features/` lenses can import it (PRD, Code placement)
- [x] In the sidebar calendar a note with `date: 2026-10-27` and `created: 2026-10-30` is counted on the 27th and listed when the 27th is picked
- [x] Editing a note's `date` moves it to the new day without a restart (the incremental update path, not only the full scan)
- [x] Regression test: a note with only frontmatter `created` and a later disk time stays on its `created` day
- [x] No other code computes a note's day on its own; the calendar's frontmatter-vs-disk bookkeeping goes through the rule
- [x] If a help page describes what the calendar dots count, it says note date
- [x] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [x] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme

## Comments

- 2026-10-31, branch `issue/01-note-date-rule`: `noteDateKey` / `parseDateKey` in `src/lib/utils/note-date.ts` is the one note-date rule (`date`, else `created`, else disk time; strict ISO day strings only). The calendar scan and incremental paths use it, and the help pages say the dots count notes by note date. Deliver fix: an out-of-range offset (`+99:99`) now falls through instead of yielding "Invalid Date". Tests: `pnpm check` clean, full suite 349 files / 8454 passed / 1 todo, `pnpm build` ok. Reviews: round 1 CHANGES_REQUESTED, round 2 APPROVED (one minor fixed, one nit left as is).
