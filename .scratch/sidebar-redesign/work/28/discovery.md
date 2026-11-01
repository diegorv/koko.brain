# Issue 28 discovery: remove write-only classic-shell state

No `spec.md` for this feature (PRD.md only). Proofs from `grep` over `src/lib`, `src/routes`, `e2e`.

## 1. `fsStore.selectedFilePath` / `setSelectedFilePath`
- Store: `src/lib/core/filesystem/fs.store.svelte.ts:7-8, 24, 33, 42`.
- Writers: `src/lib/core/editor/editor.service.ts:85, 100, 111, 226, 269, 352`.
- Readers in app code / e2e: none. Only tests read it.
- Plan: drop state, getter, setter, reset line and the six editor writes; `fsStore` import stays (check).
- Tests: `fs.store.test.ts:11,24-27,65,73`; `fs.service.test.ts:1138-1143,1245-1252`;
  `editor.service.test.ts` (103,117,497,509-514,609-623,907,910-924,1062);
  `command-palette.new-commands.test.ts:91`. Drop tests whose only point is the selection;
  where the test proves something else, swap the assertion for `editorStore.activeTab?.path`.

## 2. `calendarStore.selectedDateKey`, `setSelectedDateKey`, `dayFileCounts`, `selectedDateFiles`
- Store: `src/lib/plugins/calendar/calendar.store.svelte.ts:7-8, 18, 21-23, 62, 66, 103`.
- Readers: none in app code. `CalendarNavigator.svelte:142` passes its own `dayCounts` / `pickedDay`
  as `CalendarGrid` props (those props are named the same but are not the store).
- Plan: drop them; `goToToday` / `reset` keep month/year only; `toDateKey` import becomes unused.
  Fix the `showMonth` / `goToToday` JSDoc that mention the selected day.
- Tests: `calendar.store.test.ts` (setSelectedDateKey, dayFileCounts, selectedDateFiles blocks, the
  goToToday selected-day assertion); `calendar.service.test.ts:80-86,291-297,354-363,383,421` and
  `note-change.service.test.ts:239` switch to `calendarStore.dayPaths`.

## 3. `subFilter` of `getNotesForSelection` / `getNotesForViewPaths`
- `src/lib/features/type-definitions/type-sidebar.logic.ts:62-63, 71-136, 157-177, 226-232`.
- Callers: `src/lib/features/rail-shell/lens.logic.ts:284, 567`, never pass it.
- `sortNotes` favorites branch: only reached via `buildTypeSections(..., 'favorites')`; the only app
  caller (`lens.logic.ts:362`) passes `'all'`.
- Plan: drop `subFilter`, `NoteListSubFilter`, `matchesSubFilter` (inline `!e.archived`), the
  `filter` parameter + favorites branch of `sortNotes`, and the orphans that removal creates:
  `TypeSidebarNote.favoriteIndex` (only reader was that branch) and the `typeMetadataMap` parameter
  of `getNotesForSelection` (only read for the favorites sub-filter sort). `buildTypeSections` keeps
  its `SidebarFilter` (its `applyFilter` still filters on it).
- Tests: `type-sidebar.logic.test.ts` sub-filter cases and the two `_favorite_index` sort cases go;
  call sites drop the extra args; `type-note-list.logic.test.ts:297`, `lens.logic.test.ts:316`.

## Risks / defaults
- Default: removing a now-orphaned param (`typeMetadataMap`) rather than keeping it unused.
- `buildTypeSections(.., 'favorites')` would now sort favorites by `_order` then title, not
  `_favorite_index`; no app caller uses that filter.
