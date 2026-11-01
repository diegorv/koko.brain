# 52 discovery

Only `help/examples/` data, `src/tests/help/queryjs-contract.test.ts` and its
snapshot change. No app code.

## Files and plan

- `queryjs-features/__system/queryjs/project-status-cards.js:6,17` and
  `project-progress-bars.js:6,10`: the script is wrong, not the notes. Every
  other example query uses the `type/*` tags (`meeting-list.js:14`,
  `weekly-meeting-list.js:13`, the `type/journal/*` charts), so switch to
  `whereTag('type/project')`, drop `type/project` from the subtitle, and say
  `#type/project` in the empty message. Fixes dashboard #3 / #4 too.
- `note-shortlist.js:17`: `whereTag('type/meeting')`. Fixes dashboard #7.
  The missing `README.md` stays missing: `kb.page()` returning undefined is
  part of the demo, and the meeting links alone make the run differ.
- `#to-list`: tag the open-task headings the way `templates/Daily Note.md:21`
  does: `daily-2026-02-14.md` (inside the 7-day window of
  `recent-open-tasks`) and `project-garden.md` (created 2026-02-01, outside
  it, so `open-tasks` and `recent-open-tasks` render different lists).
- `weekly-2026-W07.md` frontmatter: add `satisfaction_*` and `practice_*`
  (Monthly template + monthly charts + `_shared-period-radar`).
- New `monthly-2026-02.md` (`type/journal/monthly`) and
  `quarterly-2026-Q1.md` (`type/journal/quarterly`) with the same fields
  (quarterly and yearly charts / templates).
- `templates/Daily Note.md #1`: `meeting-list` needs a `type/meeting` note
  created on 2026-02-15 that LINKS to the daily note, whose basename in the
  fixture is `Daily Note`. A queryjs-features note linking `[[Daily Note]]`
  would be a dangling link in that example vault. Default taken: the test
  expands `templates/One on One.md` with the variables the 1:1 plugin passes
  (`buildOneOnOneVariables`, `one-on-one.logic.ts:48`), dated 2026-02-15 and
  with `dailyNotePath` = `Daily Note`, so the 1:1 note links the Daily
  template's note, as it does in the app.
- Contract test: remove every `queryjs-features/` and `templates/` key from
  `NO_EXAMPLE_DATA`; regenerate snapshots with `-u` and read the diff.

## Prior art

Issue 19 work folder (`work/19/`) built this test; no new pattern.

## Risks

- New notes change snapshots of vault-wide example scripts
  (`vault-overview-cards`, `recent-edits-timeline`, tag cloud / heatmap).
  Expected; review the snapshot diff for anything else.
- `vault-overview-cards.js:7-8` has the same `whereTag('project'|'meeting')`
  mismatch but is not listed (its other counts differ). Out of scope; noted.
- `examples-scoping.test.ts` / `queryjs-features-scoping.test.ts` must stay
  green (new notes carry no queries).
