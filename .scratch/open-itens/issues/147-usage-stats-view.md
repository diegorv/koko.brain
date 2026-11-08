# 147: The Usage stats page shows what I use most and what I never use

**Origin:** `usage-telemetry` Issue 08, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/usage-telemetry/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Add the following below the toggle in `src/lib/app/UsageStatsSection.svelte` (Issue 06).

1. **Range picker:** last 7 days, 30 days, 90 days, or all time.
   - Ranges include today: `fromDay = localDay(today - (N - 1) days)`, and all time sends no `fromDay`.
   - The JS arg is `fromDay` (`get_usage({ fromDay })`).
2. **Most used:** a table of features ranked by total count in the range, showing the first and last day each one was used.
   - Show a label for known ids: the palette command label from `getBuiltInCommands()` (`src/lib/app/commands.ts` about line 93; it already includes the rail Go to and Open view commands), and the settings section label from `SETTINGS_SECTION_GROUPS`.
   - Anything else keeps its raw id.
3. **Never used:** registered ids with a zero count in the range.
   - Registered ids are every `id` in `getBuiltInCommands()`, plus `settings:<id>` for every section id in `SETTINGS_SECTION_GROUPS` (`src/lib/core/settings/settings.logic.ts`).
   - Do not add `railRegistryStore`, which holds only plugin navigators, and do not add the rail or view commands a second time.
   - `key:*` ids have no denominator and appear only under Most used.
4. **Counting-since note:** show "Counting since <first recorded day>" above the tables, so that a fresh install does not read as "never used".
5. **Toggle off:** the tables stay visible over the data already recorded, with a note that recording is paused. Reset (Issue 06) is the way to delete the data.

Pure aggregation goes in `src/lib/features/usage-stats/usage-stats.logic.ts`: sum by feature, first and last day, the never-used diff, and the label lookup taking an `{ id, label }[]` list as an argument. The component lives in `app/`, so it may import `app/commands.ts` (layer rule `app-inbound`).

**Blocked by:** 145, 146

**Status:** ready-for-agent

**Gate:** Frontend: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/settings.spec.ts`, using the seedable `get_usage` mock from Issue 06.

**Logic tests** (failing first):
- [ ] Totals by feature over a range.
- [ ] First and last day.
- [ ] Never used = registered minus counted.
- [ ] Unknown ids keep their raw id.
- [ ] `key:*` ids never appear under Never used.
- [ ] Empty rows give an empty Most used, and the full registry as Never used.
- [ ] `fromDay` for 7, 30 and 90 days includes today.

**Render test** (`src/tests/lib/app/UsageStatsSection.test.ts`):
- [ ] The range picker changes the `fromDay` passed to `get_usage`.
- [ ] Data stays visible while the toggle is off.

**E2E:**
- [ ] With the toggle on and rows seeded, the page shows the top feature's label and count, and lists a registered but unused command under Never used.

**Errors:**
- [ ] A `get_usage` failure shows an inline error, not a blank page.

## Notes

- Possible follow-up, not in scope: a `kb.usage()` QueryJS API, so the owner can chart usage in a note. Chart.js is already bundled (`src/lib/plugins/queryjs/kb-ui.ts` about line 67).
- Size: M.

## Comments
