# 138: Calendars say how many notes have no date

**Origin:** `view-engine-fixes` Issue 06, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/view-engine-fixes/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** `groupRecordsByDate` skips records without a parseable start date (`src/lib/features/collection/calendar.logic.ts:109-111`), while the editor's count is `queryResult.records.length` (`CollectionView.svelte:585`) and the inline block's header uses the same length (`collection-block-widget.ts:138`). "12 results" over a calendar with 7 chips gives no hint why.

- In calendar and linear-calendar views, show "N without <dateProperty>" next to the count, in the editor and in inline blocks.
- `weekStartDay` outside 0 to 6 or quoted (`"1"`) breaks the weekday labels (`calendar.logic.ts:40`, `:169`): fall back to 1. A non-string `dateProperty` throws in `getPropertyValue` (`collection.logic.ts:407`): treat it as unset.

**Blocked by:** 012, 067, 069

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first:
  - `src/tests/lib/features/collection/CollectionView.test.ts`: a calendar over 3 records, 1 without `due`, renders "1 without due".
  - `src/tests/lib/features/collection/calendar-logic.test.ts`: `weekStartDay: "1"` labels start on Mon; `weekStartDay: 9` falls back to Mon.
  - `src/tests/lib/features/collection/collection-block-widget.test.ts`: a block calendar renders the same "without" text.

## Notes

- **Size:** S.
