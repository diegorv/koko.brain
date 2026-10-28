# 18: Event-calendar view store for view, date, popover, dialog and now

**What to build:** a view store for the Calendar tab, `event-calendar-view.store.svelte.ts`, that ports the prototype's `calendar-store.ts` and the event kind of `overlay-store.ts`. It holds which view (day, week, month) and which date the tab shows, the popover target, the dialog state with a `session` counter for `{#key}` remounts, and the current clock value. Getters wrap ticket 08's view logic (visible days, month cells, range label, now offset) and read the real `settingsStore.eventCalendar`, so week start and weekend settings change what the calendar shows. Navigation clears the popover, selection derives from the popover target, and `closeTransient()` gives the view one call to close the popover and dialog when it unmounts. There is no UI yet.

**Plan reference:** Task 17 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 396-410). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done. The unmount rule is decision D24 (lines 908-911), and the prototype mapping is in Notes > Stack migration map (line 1096).

**Blocked by:** 08

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/event-calendar-view.store.svelte.ts` (new)
- `src/tests/lib/features/event-calendar/event-calendar-view.store.test.ts` (new)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

- [ ] State is `view`, `focusedDate`, `popover: { path; rect } | null`, `dialog: { mode: 'create' | 'edit'; payload; session } | null`, `nowMs`, `initialized`, exposed through getters only (no `$derived`), with JSDoc on every export, state variable and store method
- [ ] `focusedDate` is today at module load, never a fixed design date such as `DESIGN_DATE`; there is no separate selection state (selection derives from the popover target, as in prototype `time-grid.tsx:140`)
- [ ] Getters exist and each is tested: `visibleDays` and `monthCells` (both reading the real `settingsStore.eventCalendar`), `rangeLabel` (`{ title, subtitle }`), `todayKey`, `nowMinutes`, `isDialogOpen`, `selectedEventPath` (`popover?.path ?? null`)
- [ ] `setView`, `setDate`, `step` and `goToToday` each clear the popover (as `calender-app-design/src/stores/calendar-store.ts:45-52`)
- [ ] `openPopover(path, rect)` takes a plain rect and does no DOM work; `closePopover` clears it
- [ ] `openDialog(payload)` bumps `session` (as `global-dialogs.tsx:25-31`); `closeDialog` clears the dialog
- [ ] `closeTransient()` closes both the popover and the dialog
- [ ] `setNow`, `remapPath`, `initFromSettings()` (applies the default view once per session) and `reset()` exist
- [ ] `event-calendar-view.store.test.ts` sets the real `settingsStore` (no store or `.logic.ts` mocks), every `beforeEach` resets every store it uses, and time-dependent cases use fake timers or `withTimeZone`, never the real clock
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 12:55 — discovery — plan in work/18/discovery.md: one store + test, payload type declared locally — bbc45c45
- 2026-10-28 12:57 — implement — view store + 35 tests; pnpm check 0 errors, event-calendar + settings store tests 323/323 — b3ac4367
- 2026-10-28 13:01 — review — CHANGES_REQUESTED: duplicate popover/dialog types vs event-calendar.types.ts (medium), openDialog payload not copied, loose rangeLabel asserts — work/18/review.md
- 2026-10-28 13:03 — fix — review findings 1-3 fixed (types moved to event-calendar.types.ts, payload copied, exact rangeLabel asserts); event-calendar tests 278/278, pnpm check 0 errors — rebased on 658b70c9
