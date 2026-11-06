# 08: The Usage stats page shows what I use most and what I never use

**What to build:** Under the toggle in `UsageStatsSection.svelte` (Issue 06), when enabled:

1. **Range picker:** last 7 days, 30 days, 90 days, all time (maps to `get_usage(from_day)`).
2. **Most used:** a table of features by total count in the range, with a label for known ids (the palette command label from `getBuiltInCommands()` in `src/lib/app/commands.ts` about line 93, the rail item label, the settings section label) and the raw id for anything else. Show the first and last day each feature was used.
3. **Never used:** registered ids with a zero count in the range. The denominator is built at runtime from the palette command list (`getBuiltInCommands()` plus the rail and view commands built in `commands.ts` about lines 56-84), the rail navigators (`railRegistryStore.navigators`), and the `SettingsSection` ids. No hand-kept registry.
4. A note above the tables: "Counting since <first recorded day>" so a fresh install does not read as "never used".

Pure aggregation (sum by feature, first/last day, never-used diff, label lookup) goes in `usage-stats.logic.ts`.

**Blocked by:** 06, 07

**Status:** ready-for-agent

**Gate:** Frontend: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/settings.spec.ts` with a mocked `get_usage` result.

- [ ] Failing first, logic tests: totals by feature over a range; first/last day; never-used = registered minus counted; unknown ids keep their raw id; empty rows give an empty "most used" and the full registry as "never used"
- [ ] Render test: the range picker changes the `from_day` passed to `get_usage`; disabled toggle hides the tables
- [ ] E2E: with mocked rows, the page shows the top feature's label and count, and a registered-but-unused command under Never used
- [ ] `get_usage` failure shows an inline error, not a blank page

## Notes

- Possible follow-up, not in scope: a `kb.usage()` QueryJS API so the owner can chart usage in a note (Chart.js is already bundled, `src/lib/plugins/queryjs/kb-ui.ts` about line 67).
- Size: M.

## Comments
