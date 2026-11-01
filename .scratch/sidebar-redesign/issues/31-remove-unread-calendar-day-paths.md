# 31: Remove the unread calendar day-paths pipeline and the dead `'favorites'` section filter

**What to build:** Two leftovers that Issue 28's review found outside that Issue's list:
- `calendarStore.dayPaths` (`src/lib/plugins/calendar/calendar.store.svelte.ts`) has no reader in app code. It is still filled by `scanFilesForCalendar` (`calendar.service.ts`, called from `initializeVault` in `app-lifecycle.service.ts` and from the watcher's full-rebuild branch in `watcher-handler.service.ts`), by `calendarStore.updateFileDate` and by the note-change consumer `registerCalendarNoteChangeConsumer` (wired in `initializeVault`). That work runs on every scan and save for state nothing reads. `CalendarNavigator.svelte` computes its own day counts.
- `buildTypeSections(..., 'favorites')` (`src/lib/features/type-definitions/type-sidebar.logic.ts`) still accepts `'favorites'` through `SidebarFilter` / `applyFilter`, but has no app caller (`lens.logic.ts` passes `'all'`), and since Issue 28 it sorts by the type's `_sort`, not `_favorite_index`. Keep the `_favorite_index` frontmatter alias (`utils/frontmatter-aliases.ts`, `src-tauri/src/vault/aliases.rs`): it canonicalizes user frontmatter.

For each, follow CLAUDE.md "Removing or Refactoring Code": trace every reader and writer (including tests, E2E fixtures and the note-change consumer registry) before removing, and state the proof in the commit.

**Blocked by:** none

**Status:** ready-for-agent

**Source:** Issue 28 review, findings 2 and 3 (`.scratch/sidebar-redesign/work/28/review.md`).

- [ ] `calendarStore.dayPaths` and the code that only fills it are removed, or kept with the reader that needs it named in a comment
- [ ] `'favorites'` is removed from `SidebarFilter` / `applyFilter`, or kept with its caller named
- [ ] Tests that only exercised the removed code are removed with it
