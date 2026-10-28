VERDICT: CHANGES_REQUESTED

# 18 review: event-calendar view store

Reviewed `git diff main...HEAD` (bbc45c45, b3ac4367, 2e33caf9) against Issue 18, plan Task 17 (plan lines 396-410), Task 1 types (plan line 110), D24, and CLAUDE.md.

## Checks I ran

- `pnpm check`: 192 files, 0 errors, 0 warnings.
- `vitest run src/tests/lib/features/event-calendar/ src/tests/lib/core/settings/settings.store.test.ts`: 8 files, 323/323 passed.
- `vitest run .../event-calendar-view.store.test.ts --reporter=verbose`: 35/35 passed. The DST case under `describe.runIf(runtimeTimeZoneSwitchWorks())` ran here; it was not skipped.
- A throwaway probe test (deleted afterwards, never committed) for exact `rangeLabel` strings, payload aliasing, and invalid `setDate` input. Its results are quoted in the findings.

My test verdict rests on `src/tests/lib/features/event-calendar/event-calendar-view.store.test.ts` (new). I also ran the rest of `src/tests/lib/features/event-calendar/` and `src/tests/lib/core/settings/settings.store.test.ts` to confirm nothing regressed.

## Acceptance criteria

- [x] **State and getters.** State is `view`, `focusedDate`, `popover`, `dialog`, `nowMs` and `initialized`. It is read through getters only, with no `$derived`, and every export, state variable and method has JSDoc. Evidence: store lines 68-127. `grep '\$derived'` finds nothing.
- [x] **`focusedDate` and selection.** `focusedDate` is today at module load: `toKey(new Date())` at line 71, tested at lines 48-57 via `vi.resetModules`. There is no separate selection state; `selectedEventPath` (line 125) reads `popover?.path ?? null`.
- [x] **Getters exist and each is tested.**
  - `visibleDays`: test lines 59-91.
  - `monthCells`: test lines 93-112. Both read the real `settingsStore.eventCalendar` (store lines 100 and 105).
  - `rangeLabel`: test lines 114-133. The assertions are loose; see finding 3.
  - `todayKey` and `nowMinutes`: test lines 135-160, including DST.
  - `isDialogOpen` and `selectedEventPath`: covered throughout.
- [x] **Navigation clears the popover.** `setView`, `setDate`, `step` and `goToToday` each clear it (store lines 130-151, test lines 162-199).
- [x] **Popover.** `openPopover` copies a plain rect and does no DOM work (line 155, test 209-215). `closePopover` clears it (test 217-222).
- [x] **Dialog.** `openDialog` bumps a monotonic `session` (lines 164-167, test 226-246), and `closeDialog` clears the dialog (test 248-253).
- [x] **`closeTransient`.** It closes both the popover and the dialog (lines 175-178, test 256-274).
- [x] **Remaining methods.** `setNow`, `remapPath`, `initFromSettings` (once per session) and `reset` exist and are tested. `reset` leaves `nowMs` alone, per D24 (test 40-45).
- [x] **Test hygiene.** The test uses the real `settingsStore` and has no store or `.logic.ts` mocks. `beforeEach` resets both stores, and fake timers or `withTimeZone` replace the real clock.
- [ ] **Gate green and one commit.** Pending, because the gate is deliver's job. There is one feat commit, in the full format with line ranges.

## Findings

1. **Medium. Duplicate popover and dialog types.** At `src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:14-63`, the store declares its own `EventPopoverTarget`, `EventDialogPayload` and `EventDialogState`. The feature's shared types file already exports `PopoverTarget` and `DialogState` for this store (`src/lib/features/event-calendar/event-calendar.types.ts:227-253`, created by plan Task 1, line 110). Nothing imports those two, and both contradict this ticket:
   - `PopoverTarget.rect` is a `DOMRect`, while this ticket requires a plain rect.
   - `DialogState` has a `'closed'` mode and a `draft: EventDraft`, while plan Task 17 specifies `{ mode; payload; session } | null`.

   The feature now has two incompatible definitions of the same concept. Tickets 26, 27 and 30 can import the wrong one: `PopoverTarget` from types.ts will not type-check against `eventCalendarViewStore.popover`.

   **Fix:** make `event-calendar.types.ts` the single home of these types.
   - Move `PopoverRect` there and give `PopoverTarget.rect` that type.
   - Replace `DialogState` with the store's `{ mode; payload; session }` shape.
   - Add `EventDialogPayload` there.
   - Import all of them in the store, and delete the local copies.

   This touches one file outside the ticket's Touches list. That is justified, because the stale types were written for this store.

2. **Low. `openDialog` keeps the caller's payload object.** At `src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:164-167`, `openDialog` stores the caller's object by reference. `openPopover` copies its rect (line 155) for exactly this reason. My probe mutated the payload after `openDialog`, and the change showed up in `dialog.payload.date` (`"x"`) with no reactive update, because the dialog is `$state.raw`.

   **Fix:** store a copy, `payload: { ...payload }`. Add a test next to the rect-copy test (test line 209) asserting that a later mutation of the argument does not reach `dialog.payload`.

3. **Low. The `rangeLabel` tests do not pin the settings wiring.** At `src/tests/lib/features/event-calendar/event-calendar-view.store.test.ts:114-133`, the assertions are prefix regexes (`/^Week 44 · /`) and `not.toMatch(/^Week/)`. No case shows that `weekStartsOn` or `showWeekends` reach the label through `this.visibleDays`. A store that passed the default-settings days would still pass.

   **Fix:** assert the exact subtitles my probe produced:
   - `weekStartsOn: 1, showWeekends: false`: `Week 44 · Oct 26 – 30`
   - `weekStartsOn: 0`: `Week 44 · Oct 25 – 31`
   - month view: `Oct 1 – 31`
   - a cross-month week (focused 2026-11-01, `weekStartsOn: 1`): title `October, 2026`, subtitle `Week 44 · Oct 26 – Nov 1`, since the title comes from the first visible day.

4. **Info. No change requested.** `setDate` accepts any string (store line 136). In my probe, `setDate('garbage')` produced the header `"undefined, NaN"`. Every planned caller passes a computed day key, so I am not asking for a guard. If ticket 33 (the sidebar bridge) ever forwards external input, it should validate with `isValidDayKey` there.

## Scope, layers and rules

- **Layers.** `features/` imports `core/settings` and its own `.logic.ts` files only, which follows the layer rules. There is no service, no Tauri call and no DOM work.
- **Scope.** Nothing was added beyond plan Task 17, apart from the `PopoverRect` export. Navigation leaving the dialog open matches the prototype, which keeps the overlay store separate from the calendar store.
- **Getters.** Getters recompute on each read: `visibleDays` returns a new array every time. That is cheap (at most 42 items) and only re-runs when its reactive dependencies change, so it is not a finding.

## Resolution

- Finding 1: fixed. `PopoverRect`, `PopoverTarget` (rect is now `PopoverRect`), `EventDialogPayload` and `DialogState` (`{ mode; payload; session }`, null when closed) live in `event-calendar.types.ts`, under the plan's names. The store imports them; its local copies (`EventPopoverTarget`, `EventDialogState`) are gone.
- Finding 2: fixed. `openDialog` stores `{ ...payload }`; a new test mutates the argument afterwards and checks `dialog.payload` is unchanged.
- Finding 3: fixed. `rangeLabel` tests now assert exact labels for `weekStartsOn: 1` without weekends, `weekStartsOn: 0`, month view, and the cross-month week focused on 2026-11-01.
- Finding 4: no change, as the review asked.
