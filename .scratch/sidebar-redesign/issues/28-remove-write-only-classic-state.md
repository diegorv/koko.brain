# 28: Remove the write-only state the classic shell left behind

**What to build:** Issue 25 removed the classic Files, Types and Calendar panels. Some state they read is still written but no longer read by any component:
- `fsStore.selectedFilePath` / `setSelectedFilePath` (`src/lib/core/filesystem/fs.store.svelte.ts`), still set by `editor.service.ts` on every tab open, switch and close.
- `calendarStore.selectedDateKey`, `setSelectedDateKey`, `dayFileCounts` and `selectedDateFiles` (`src/lib/plugins/calendar/calendar.store.svelte.ts`). `CalendarNavigator.svelte` passes its own day counts and picked day to `CalendarGrid`.
- The `subFilter` parameter of `getNotesForSelection` / `getNotesForViewPaths` (`src/lib/features/type-definitions/type-sidebar.logic.ts`), with `matchesSubFilter` and the `favorites` branch of `sortNotes`. The only callers (`src/lib/features/rail-shell/lens.logic.ts`) never pass it.

For each, follow CLAUDE.md "Removing or Refactoring Code": trace every reader and writer (including tests and E2E fixtures) before removing, and state the proof in the commit.

**Blocked by:** 25

**Status:** ready-for-agent

**Source:** Issue 25 build report and review, finding 7.

- [ ] Each item above is removed, or kept with the reader that still needs it named in a comment
- [ ] Tests that only exercised the removed state are removed with it; the remaining getters keep their tests
