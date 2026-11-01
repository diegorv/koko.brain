# Issue 19 discovery: Today lens

No `spec.md`; the source is `PRD.md` (Lenses: Today, Persistence, Q8, Q24). Builds on `work/17` (Day lens:
`entryNoteDate`, `listEntries`, `dayNewNoteRule`, Daily note header action) and `work/11` (`DEFAULT_RAIL_ITEM`,
whose discovery already said "the Today ticket changes that one constant"). Only the differences are listed.
My people is Issue 20: here only the empty section slot (`railRegistryStore.todaySections`, already typed).

## Files that change
- `rail-shell/rail-shell.types.ts:48-56`: `ResolvedLens.groups?: LensGroup[]` (`{ id, label, notes }`); `notes` stays
  the flat, path-deduped list (row menu lookup and header count).
- `rail-shell/lens.logic.ts:48-108`: `TODAY_LENS` (`{ kind: 'today' }`), `TODAY_RAIL_ITEM`, `todayLens(todayKey)`,
  `DEFAULT_RAIL_ITEM = 'today'` (Inbox keeps its own key); `restoreRailItem` falls back to Today. NEW
  `resolveTodayLens`: group `pinned` (favorite, not archived) then group `today` (note date === target, same rule as
  the Day lens), each newest change first, system folder out; rule `pinned; note date is today`. `newNoteRule`
  for `today`: plain note in the Cmd+N folder with `date: <ctx.now as YYYY-MM-DD>`.
- `rail-shell/Rail.svelte:38-41`: Today (Sun icon) after Inbox.
- `rail-shell/RailNoteList.svelte`: on a Today lens it holds `acquireCalendarClock` and resolves
  `todayLens(eventCalendarViewStore.todayKey)`, so the list moves at midnight; group headers with counts; the
  registered Today sections render after Pinned; a built-in "Daily note" header action calls
  `eventCalendarDailyNoteStore.open(day)` (the periodic-notes plugin registers the opener; features may import
  features), shown only while an opener is registered; failures toast.
- `core/settings/settings.store.svelte.ts:57`: default `railItem: 'today'`.
- `e2e/specs/rail-shell.spec.ts`: Inbox tests click Inbox first (fresh rail starts on Today); the unknown-item and
  stale-pick fallbacks expect Today; NEW test: a pinned note and a note dated today both show under their headers.

## Plan (test-first)
1. `lens.logic.test.ts`: Today groups favorites first then today's notes (date > created > disk); archived
   favorite out; a note both pinned and dated today in both groups, once in `notes`; empty vault; bad target;
   New here writes `date`; `restoreRailItem` fallback and `DEFAULT_RAIL_ITEM` are Today.
2. `Rail.test.ts`: order Inbox, Today, Favorites.
3. `RailNoteList.test.ts`: group headers and counts; midnight move with fake timers; Daily note opens today's
   note through the real `eventCalendarDailyNoteStore`, hidden without an opener, rejection toasts; a registered
   Today section renders between Pinned and Today; theme-token assertion on the new header markup.
4. `settings.service.test.ts`: a fresh settings file loads `railItem: 'today'`.
5. E2E as above.

## Prior art
`day-lens.logic.test.ts`, `CalendarNavigator.test.ts` (fake clock + `acquireCalendarClock`),
`RailNoteList.test.ts` header action tests, the Issue 17 E2E test.

## Defaults taken
- Archived notes stay in the Today group (same rule as the Day lens); only Pinned excludes them (PRD).
- A note both favorite and dated today shows in both groups (prototype); the header count is distinct notes.
- New here uses the click-time clock for `date`, as the Cmd+N folder does.
- Section headings show their label only (a plugin section's count is its own business).

## Risks
- Every E2E test that relied on the rail opening on Inbox needs an Inbox click; E2E is run via `scripts/e2e.sh`.
