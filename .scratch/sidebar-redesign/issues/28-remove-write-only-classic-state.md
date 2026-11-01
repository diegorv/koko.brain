# 28: Remove the write-only state the classic shell left behind

**What to build:** Issue 25 removed the classic Files, Types and Calendar panels. Some state they read is still written but no longer read by any component:
- `fsStore.selectedFilePath` / `setSelectedFilePath` (`src/lib/core/filesystem/fs.store.svelte.ts`), still set by `editor.service.ts` on every tab open, switch and close.
- `calendarStore.selectedDateKey`, `setSelectedDateKey`, `dayFileCounts` and `selectedDateFiles` (`src/lib/plugins/calendar/calendar.store.svelte.ts`). `CalendarNavigator.svelte` passes its own day counts and picked day to `CalendarGrid`.
- The `subFilter` parameter of `getNotesForSelection` / `getNotesForViewPaths` (`src/lib/features/type-definitions/type-sidebar.logic.ts`), with `matchesSubFilter` and the `favorites` branch of `sortNotes`. The only callers (`src/lib/features/rail-shell/lens.logic.ts`) never pass it.

For each, follow CLAUDE.md "Removing or Refactoring Code": trace every reader and writer (including tests and E2E fixtures) before removing, and state the proof in the commit.

**Blocked by:** 25

**Status:** resolved

**Source:** Issue 25 build report and review, finding 7.

- [x] Each item above is removed, or kept with the reader that still needs it named in a comment
- [x] Tests that only exercised the removed state are removed with it; the remaining getters keep their tests

## Comments

- 2026-11-01, branch `issue/28-remove-write-only-classic-state`: removed `fsStore.selectedFilePath` / `setSelectedFilePath` and their six writes in `editor.service.ts`; `calendarStore.selectedDateKey`, `setSelectedDateKey`, `dayFileCounts`, `selectedDateFiles`; the `subFilter` parameter of `getNotesForSelection` / `getNotesForViewPaths` with `matchesSubFilter` and the `favorites` sort branch. Tests that only covered them went with them. Review round 1: APPROVED (2 minor, 2 nits); fix round corrected the `getNotesForSelection` JSDoc and the `fs.store.test.ts` indentation, and filed Issue 31 for the unread `calendarStore.dayPaths` pipeline and the dead `'favorites'` section filter. Tests: `pnpm check` 0 errors; full suite 379 files, 9144 passed, 1 todo; `pnpm build` ok.
