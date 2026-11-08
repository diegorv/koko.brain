# 226: The Periodic Notes help shows format examples that escape literal words with [ ]

**Origin:** `audit-2026-11-05` Issue 77, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** buildPeriodicNotePath runs `date.format(format)` (src/lib/plugins/periodic-notes/periodic-notes.logic.ts:16). dayjs treats a bare `a` as am/pm and a bare `d` as the weekday digit (node_modules/dayjs/esm/constant.js REGEX_FORMAT), so `journal` renders as `journpml` and `day` gets a digit plus am/pm. The doc's promised path `_notes/2026/02-Feb/journal-17-02-2026.md` (08:104) is never produced, and the am/pm part changes with the time of day, so the same day can resolve to two files. The shipped defaults already escape correctly (settings.store.svelte.ts:10 `_[journal]-[day]-DD-MM-YYYY`). Fix: rewrite the doc 08 examples (:62, :95-104, the wikilink example at :224) with `[ ]` around literal text, add the `[ ]` escape to the token table with a one-line warning that letters like a, d, h, m, s are tokens, and correct the JSDoc example in periodic-notes.logic.ts:7-8.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/plugins/periodic-notes/periodic-notes.logic.test.ts: read help/documentation/08-periodic-notes-and-calendar.md (as src/tests/lib/features/event-calendar/event-calendar-keys.logic.test.ts:159 reads its doc), take the worked example's Format string, and assert buildPeriodicNotePath('/v', '_notes', format, dayjs('2026-02-17T15:00')) ends with the path the doc shows. It fails today.
- [ ] The same holds at 09:00 (no am/pm dependence).
- [ ] The token table documents the `[ ]` escape.
- [ ] Targeted test run of the touched test file plus `pnpm check`.

## Notes

- **Priority:** polish (bucket 3-polish). Re-rated polish: a documentation fix, since the shipped defaults escape correctly.
- **Trigger:** Follow doc 08 and set a daily Format to `YYYY/MM-MMM/_journal-day-DD-MM-YYYY` (08:62) or `YYYY/MM-MMM/journal-DD-MM-YYYY` (08:95-101), then open today's daily note.
- **Evidence (verified by reading code at `5f8003d67`):** help/documentation/08-periodic-notes-and-calendar.md:62 table example `YYYY/MM-MMM/_journal-day-DD-MM-YYYY`; :95-104 worked example `journal-DD-MM-YYYY` -> `journal-17-02-2026.md`; :224 wikilink example. periodic-notes.logic.ts:16 date.format(format); :7-8 JSDoc repeats the unescaped example. node_modules/dayjs/esm/constant.js REGEX_FORMAT = /\[([^\]]+)]|YYYY|YY|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g. Defaults escape correctly: src/lib/core/settings/settings.store.svelte.ts:10,17,25.
- **Second opinion:** upheld (polish, low). Confirmed. The doc 08 examples (:62, :95-104, :224) and the JSDoc at periodic-notes.logic.ts:7-8 use unescaped `journal` and `day`. dayjs treats `a` as am/pm and `d` as the weekday (advancedFormat is also loaded in utils/date.ts), so the documented path is never produced. The shipped defaults escape correctly, so this needs the owner to copy the doc example. It is a doc defect. Corrections to apply while implementing: Category polish (documentation): nothing on disk is lost, a doc-copied format just produces a different file name.
- **Source:** audit 2026-11-05, domain `calendar`, finding `N-calendar-05` (from calendar-spec-2). Size S.

## Comments
