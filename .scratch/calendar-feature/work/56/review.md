VERDICT: CHANGES_REQUESTED

# Review: Issue 56, open an event on the Calendar from search and backlinks

Reviewed `git diff main...HEAD` on `issue/calendar-feature-56-focus-event-pulse` (commits 7b2f30d3..6f1fc50b).

## Checks run by the reviewer

- `pnpm check`: 0 errors, 0 warnings (206 files).
- `vitest run src/tests/lib/features/event-calendar src/tests/lib/features/search src/tests/lib/features/backlinks`: 29 files, 957 tests passed. The test verdict rests on these files from the diff: `event-calendar.service.test.ts`, `event-calendar-view.store.test.ts`, `event-calendar-view.logic.test.ts`, `EventCalendarView.test.ts`, `ShowInCalendarButton.test.ts`, `search/SearchResult.test.ts`, `backlinks/LinkItem.test.ts`. The rest of those three folders are the tests of the code the diff changes.
- Probe (a temporary copy of `event-calendar.service.test.ts` plus one case, deleted afterwards and not committed): `loadEvents()` at index version 1 with the event on 2026-11-10. Then the index moves to version 5 with the event on 2026-11-20, and no reload follows because the Calendar view is not mounted. Results: `findCalendarEvent` returned `2026-11-10`, `openEventInCalendar` set `focusedDate` to `2026-11-10`, and after a further bump that made the note a plain note, `findCalendarEvent` still returned the event. This confirms finding 1.
- E2E was not run, per the step rules. The spec sits at `e2e/specs/event-calendar-focus.spec.ts`, which is correct because `e2e/playwright.config.ts:6` sets `testDir: './specs'`. The e2e mock handles `search_fts`, `get_backlinks_v2` and `get_all_vault_entries_v2` (`e2e/mocks/tauri-core.ts:310-331`).

## Acceptance criteria

- [x] **Action available on search results and backlinks for event notes.** Met. `ShowInCalendarButton` renders only when `findCalendarEvent` resolves. It is wired as a sibling button in `SearchResult.svelte:174-177` for every result kind (`notePath`, `:98-104`) and in `LinkItem.svelte:34` on `entry.sourcePath`. Tests: `ShowInCalendarButton.test.ts` (event / plain / not ready / failure / index bump), `SearchResult.test.ts` "Show in Calendar", `LinkItem.test.ts`. Only the FTS branch of `notePath` is tested (finding 3).
- [ ] **The Calendar opens on the right date and view with the block focused and pulsing once.** Partly met. The fresh-index path works: `openEventInCalendar` (`event-calendar.service.ts:192-201`) followed by the view effect (`EventCalendarView.svelte:146-162`), covered by `EventCalendarView.test.ts` "focus request" and the service tests. It fails in two realistic cases. (a) Whenever the Calendar tab is not the active tab, the date comes from a stale store snapshot (finding 1). (b) An event hidden under "+N more" in month view, or in the all-day lane, is never focused or pulsed, and the request is left dangling (finding 2).
- [x] **E2E covering the flow.** Met, though not run. `e2e/specs/event-calendar-focus.spec.ts` covers a search result, a plain-note negative case and a backlink. It asserts the active tab, the title/subtitle, focus on the block, `data-event-pulse` on exactly one block and its removal.

## CLAUDE.md / plan conformance

- Layer rules: `features/search` and `features/backlinks` import `features/event-calendar`. Feature-to-feature imports already exist (event-calendar imports properties and type-definitions), and nothing in `core/` imports features. OK.
- Errors: `findCalendarEvent` propagates IPC errors. The button logs lookup failures (`utils/debug.error`) and toasts click failures. The store is not written on error. OK.
- Performance: `getVaultEntries` is version-memoized and already read on every bump by `tauri-listeners.service.ts:145`, so the rows add no IPC. The projection is memoized per snapshot plus settings. OK.
- Tests exist for every changed source file except `event-calendar.types.ts`, which is types only. No stores or `.logic.ts` files are mocked. OK.
- Scope: no edits to EventMonthGrid, EventAllDayLane, EventDayHeaders or the projection logic. No scope creep found.

## Findings

1. **HIGH: a stale Calendar store beats the fresher snapshot, so the Calendar opens on the wrong day.** `src/lib/features/event-calendar/event-calendar.service.ts:168`.
   - **Cause:** `findCalendarEvent` returns `eventCalendarStore.eventByPath(path)` whenever the store holds the path. `loadEvents` only runs while `EventCalendarView` is mounted (`EventCalendarView.svelte:116-134`), and `EditorView.svelte:57-58` unmounts it whenever another tab is active. Once the Calendar has been opened in a session, the store therefore keeps the snapshot from the last time the tab was active.
   - **Effect:** the usual flow is the user on a note with search or backlinks in the sidebar, so the Calendar tab is not active. If an event's date changed since then (edited in its note, or by an external edit), the Calendar opens on the old date. The view then reloads, the block renders on the new day outside the visible range, nothing is focused or pulsed, and the request dangles. A note that stopped being an event keeps its button and opens the Calendar on an old date, with no toast.
   - **Fix:** trust the store only when it is current, i.e. `eventCalendarStore.snapshotVersion === vaultStore.vaultIndexVersion`. Otherwise project the snapshot, keeping the store's pending write for that path if `eventCalendarStore.isPending(path)`.
   - **Tests:** add a service case for each direction: load at v1 / date A, bump to v2 / date B with no reload, then expect `findCalendarEvent` to return B and `openEventInCalendar` to set `focusedDate` B; and a case where a stale store hit for a note that is no longer an event returns null / false. Keep the existing "prefers the loaded store, which carries pending writes" case green.
2. **MEDIUM: an event hidden behind an overflow control is never focused, and the request dangles.** `src/lib/features/event-calendar/event-calendar.service.ts:197` (view choice) and `src/lib/features/event-calendar/EventCalendarView.svelte:156` (silent `if (!block) return`).
   - **Month view:** only `MONTH_MAX_CHIPS` (3) chips render per day (`EventMonthGrid.svelte:62`). "+N more" calls `setView('day')`, which drops the request, so the user never sees the pulse.
   - **All-day lane:** `buildAllDayChips` (`event-calendar-view.logic.ts:258-264`) caps chips at `ALL_DAY_MAX_ROWS - 1` in every view, the day view included. A focus request for, say, the third of four all-day events can therefore never land.
   - **Focus steal:** in both cases the request stays live. A later `events` change that makes the block render, such as deleting a sibling event on that day, yanks focus and pulses it out of context.
   - **Fix:** decide in pure logic before opening. Switch month view to `day` when the event's index in `itemsByDay(...)` for its day is `>= MONTH_MAX_CHIPS`. When the event is an all-day event outside `buildAllDayChips(...).chips` even in the day view, have the view focus and pulse that day's overflow control (`[data-all-day-more]` / `[data-month-more]`) instead, or clear the request once events are loaded and the block is absent.
   - **Tests:** add logic tests for the view choice, plus a view test that the request does not outlive a completed load when the block cannot render.
3. **LOW: `notePath` is tested only for FTS results.** `src/lib/features/search/SearchResult.svelte:98-104`. The semantic (`sourcePath`), hybrid (`path`) and legacy (`filePath`, already absolute) branches have no test. A wrong field or a double prefix in one of them would silently hide the action for that search mode. Fix: add one `SearchResult.test.ts` case per branch asserting `[data-show-in-calendar]` renders for an event note.
4. **LOW (cosmetic): the pulse's 12px box-shadow is clipped in the month grid and the all-day lane.** `src/lib/features/event-calendar/EventCalendarView.svelte:226`. Month cells (`EventMonthGrid.svelte:68`, `overflow-hidden p-1.5`) and all-day cells (`EventAllDayLane.svelte:50`, `overflow-hidden px-1`) cut the ring to about 4-6px, so there the highlight reads as a faint edge flash. Fix: use a pulse that stays inside the element (an inset shadow or a background/brightness flash), or a spread of 4px or less.
