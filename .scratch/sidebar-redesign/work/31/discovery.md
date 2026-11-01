# Issue 31 discovery

No `spec.md` in `.scratch/sidebar-redesign/` (only PRD.md); the Issue text is the spec.

## Trace: calendar day-paths pipeline

Readers of `calendarStore.dayPaths` in app code: none. `CalendarNavigator.svelte` reads only
`currentYear` / `currentMonth` and the navigation methods. Every other `dayPaths` read is a test.

Writers (all removed):
- `calendar.store.svelte.ts:6,12,54-81,88` - `dayPaths` state, getter, `setDayPaths`, `updateFileDate`, the reset line.
- `calendar.service.ts:14-121` - `fileDateKeys` / `fileDiskTimes` (only used to diff day keys for
  `updateFileDate`), `scanFilesForCalendar`, `updateCalendarForFile`, `removeCalendarForFile`,
  `registerCalendarNoteChangeConsumer`. Kept: `openOrCreatePeriodicNoteForDate`, `resetCalendar`
  (now `calendarStore.reset()` only; still called by `teardownVault`, resets the month).
- `app-lifecycle.service.ts:57,59,254,421` - import, consumer registration, step-5b call; the comment
  at :403 that names `scanFilesForCalendar` and the "calendar" mention at :249 are updated.
- `watcher-handler.service.ts:5,76` - import and full-rebuild call.
`noteDateKey` stays (used by `lens.logic.ts`). No layer-baseline line covers these imports
(app-lifecycle is a composition root), so the baseline is untouched.

## Trace: `'favorites'` SidebarFilter

`buildTypeSections` callers: `lens.logic.ts` passes `'all'`; only test `type-sidebar.logic.test.ts:95-102`
passes `'favorites'`. Remove the union member (`type-sidebar.logic.ts:31`) and the case (`:224-225`).
`NavItemId` `'favorites'` / `filterByNavItem` is a different path (`getNotesForSelection`), out of scope.
`_favorite_index` alias untouched.

## Tests
- Delete: `calendar.service.test.ts` blocks for scan/update/remove/reset-of-dayPaths; `calendar.store.test.ts`
  `setDayPaths` / `updateFileDate` blocks and the dayPaths half of reset.
- Edit: `note-change.service.test.ts`, `index-updater.service.test.ts`, `watcher-handler.service.test.ts`
  drop the calendar consumer (collection + file-icons still prove the fan-out); `app-lifecycle.service.test.ts`
  drops `scanFilesForCalendar` mock/asserts; `type-sidebar.logic.test.ts` drops the favorites-filter test.

## Risks / defaults
- CLAUDE.md "Indexing & Watcher" #4 and #6 name `scanFilesForCalendar` / `registerCalendarNoteChangeConsumer`.
  Default: leave CLAUDE.md alone in this build (project instruction file); flag it in the report.
