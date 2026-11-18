# Scout: calendar-tasks (17 proposals)

Checked at HEAD 085b23c5d. Prototype: `.scratch/design-review/prototypes/calendar-tasks.html` (section `#Pxx`). Review text: `.scratch/design-review/review.md`. Read-only research; nothing was edited or run.

Files that `git diff --name-only origin/main...origin/mvp-claude` lists and that this slice could touch: only `src/lib/app/global-keybindings.ts` (P167 asks for Cmd+F there) and `help/documentation/20-keyboard-shortcuts.md`. Both are avoided below (P167 binds Cmd+F inside `TasksView.svelte`; P129 adds no row to doc 20). No other file in this slice is on the Claude MVP branch.

No proposal here is DONE or DROP: every premise holds at HEAD. Nothing in `.scratch/shell-sidebars-ux`, `tasks-view-ux`, `finders-ux` or `open-itens` cites any of these ids.

## Summary table

| id | call | size | one-line reason |
|----|------|------|-----------------|
| P64 | QUICK-PART | S | Cell-height-driven chip slots (pure capacity function + `bind:clientHeight`); skip the optional 5-row month and the "+N in the day row" variant |
| P183 | QUICK | S | Classes in `EventMonthGrid.svelte` plus the `rangeLabel` title string |
| P130 | QUICK | S | Reveal the daily-note button on hover/focus/today, one glyph, shared Tooltip |
| P65 | QUICK-PART | S | Week view: "+N" opens day view, same pattern as the all-day lane; day view: count in the label only |
| P127 | QUICK-PART | S | Mount scroll brings the now-line into view when it is below the fold; Today-button scroll and "Now" pill deferred |
| P128 | DEFER | M | Restructures the sticky header, moves the daily-note button, reshapes the all-day lane hit target; depends on P130 and a layout decision |
| P129 | QUICK | S | A "Mouse" group in the shortcuts dialog from a new constant; no gesture changes |
| P182 | QUICK | S | Lock icon on read-only blocks/chips and a popover caption reusing the dialog's wording |
| P32 | QUICK-PART | S | CalendarGrid container-aware (single-letter weekdays, no week column, non-clipping chevrons); per-navigator `minWidth` deferred |
| P132 | QUICK-PART | S | Full-date aria labels with note counts and a today mark that is not a ring; roving tabindex and arrows deferred |
| P131 | QUICK-PART | S | Weekly-note failure toast and an explicit Today button; the Today row and existence markers are already dropped by the review |
| P63 | QUICK | S | Folder inline after the count, `space-y-6` to `space-y-4` |
| P180 | QUICK | S | "Shown for context" title plus a left rule on dimmed rows instead of `opacity-60` |
| P163 | QUICK | S | Show the current grouping in the Display trigger |
| P165 | QUICK | S | Rename the sentence button "Edit" to "Edit sources" |
| P167 | QUICK | S | Full-contrast search field and a local Cmd+F focus handler in `TasksView.svelte` |
| P164 | QUICK-PART | S | "or" divider between source cards; the Global excludes disclosure deferred (focus and test churn) |

Counts: QUICK 9, QUICK-PART 7, DEFER 1.

## Per-proposal detail

### P64. Month cells clip "+N more" (QUICK-PART, S)

Premise true. `EventMonthGrid.svelte:92` cell is `p-1.5` (12 px), day row `h-6` (24 px), chips `h-[22px]` with `gap-1` (4 px), footer button `py-1 text-xs` (about 24 px). Three chips plus footer need 12 + 24 + 3x26 + 28 = 142 px; a cell in a 1440x900 window is about 125 px and the cell is `overflow-hidden`. The slot count is the constant `MONTH_MAX_CHIPS = 3` (`event-calendar-view.logic.ts:43`) consumed by `monthCellSlots` (`event-calendar-tasks.logic.ts:92`).

Quick slice: make the capacity depend on the measured cell height.
- Behaviour: a cell shows every item when they fit; otherwise it shows as many chips as fit with the footer reserved, then "+N more". At 125 px that is 3 chips with no footer, or 2 chips plus "+N more". Nothing is ever clipped; the footer always shows the hidden count.
- Pure function in `event-calendar-tasks.logic.ts`: capacity from cell height, `all = floor((cellH - 36) / 26)` and `withFooter = floor((cellH - 64) / 26)`, each floored at 1; `monthCellSlots(eventCount, taskCount, capacity?)` takes it. Unmeasured (height 0, as in jsdom) falls back to today's 3/3, so the existing 3-chip tests stay valid.
- `EventMonthGrid.svelte`: `bind:clientHeight` on the existing `cellsEl` div, per-row height `clientHeight / 6`, passed into `monthCellSlots` at line 86.
- Files: `event-calendar-tasks.logic.ts`, `EventMonthGrid.svelte`; tests `src/tests/lib/features/event-calendar/event-calendar-tasks.logic.test.ts`, `EventMonthGrid.test.ts` (`:178`, `:194`, `:219` pin the 3-chip behaviour).
- Test seam: pure function tests; component test with real stores, and `clientHeight` stubbed on the element (DOM measurement, not a store). Events keep coming from the real `eventCalendarStore`.
- Skipped on purpose: 5-row months (Nov 2026 needs 6 rows anyway) and moving "+N" into the day row.
- Acceptance:
  1. Failing test first: `monthCellSlots` with capacity `{all: 3, withFooter: 2}` and 4 items returns 2 shown and 2 hidden; with 3 items returns 3 shown and 0 hidden.
  2. Capacity from height: 125 gives `{3, 2}`, 200 gives larger values, 40 gives 1 (never 0 or negative).
  3. Unmeasured height keeps today's behaviour (`monthCellSlots(5, 0)` still 3 shown, 2 hidden).
  4. Component test: with a stubbed row height of 125, a day with 4 events shows 2 chips and "+2 more", and the footer button is in the DOM.
  5. The focus-request fallback in `EventCalendarView.svelte:174-178` (`[data-month-more]`) still finds the footer.

### P183. Today versus selected, out-of-month cells, title comma (QUICK, S)

Premise true: `EventMonthGrid.svelte:94` fills out-of-month cells `bg-muted/40`; `:104-111` gives today only `text-primary` when another day is selected; `rangeLabel` builds `"<Month>, <year>"` at `event-calendar-view.logic.ts:165`.
- Behaviour: today always has a primary ring on its number; selection is the solid fill; when both coincide the fill plus an offset ring show. Out-of-month cells drop the fill and keep muted numbers. The title reads "November 2026". No weekend tint.
- Files: `EventMonthGrid.svelte`, `event-calendar-view.logic.ts` (title), help text if it quotes the comma form (grep `help/documentation/27-calendar.md`, none found).
- Tests to move on purpose (they pin the comma): `event-calendar-view.logic.test.ts:164-232`, `event-calendar-view.store.test.ts:119-133`, `EventCalendarView.test.ts:117`, `e2e/specs/event-calendar.spec.ts:110`. Existing `EventMonthGrid.test.ts:102` ("dims out-of-month cells") and `:112` ("colors a today ... text-primary") change with the classes.
- Test seam: pure `rangeLabel` test; component tests with real `eventCalendarViewStore`.
- Acceptance:
  1. Failing test first: `rangeLabel('month', '2026-11-12', days).title` is `'November 2026'` (and week/day views likewise).
  2. Component: with the selection on 2026-11-10 and today 2026-11-12, today's number button carries the ring marker and the selected one the fill marker (assert on a stable `data-` attribute or class, not on color).
  3. Component: with today selected, the button carries both the fill and the ring classes.
  4. Out-of-month cell no longer has the `bg-muted/40` class; its number keeps `text-muted-foreground`.
  5. E2E title assertion updated to `November 2026`.

### P130. Daily-note icon repeats in every cell and header (QUICK, S)

Premise true: `EventDailyNoteButton.svelte:30` renders at `opacity-60` in all 42 cells (`EventMonthGrid.svelte:120`) and every day header (`EventDayHeaders.svelte:47`), with a native `title`. The Day lens header already has a "Daily note" action (`RailNoteList.svelte:626-640`, `calendar-rail.service.ts:38`), so discoverability survives.
- Behaviour: the button is hidden (`opacity-0`) until the cell or header is hovered, the button is focused, or the day is today (always visible). Glyph becomes `calendar-plus` (exists in `@lucide/svelte`). The native `title` is replaced by the shared Tooltip (the calendar view already wraps everything in `Tooltip.Provider`, `EventCalendarView.svelte:237`).
- Files: `EventDailyNoteButton.svelte`, `EventMonthGrid.svelte` (add a named `group/cell` class on the cell), `EventDayHeaders.svelte` (group class on the day wrapper). Tests: `EventMonthGrid.test.ts:335-418` (the daily-note cases), `EventDayHeaders` coverage inside `EventTimeGrid.test.ts` / `EventCalendarView.test.ts`.
- Test seam: real `eventCalendarDailyNoteStore`; mock only the opener it calls (already done in the existing cases).
- Acceptance:
  1. Failing test first: the button for a non-today day has the hidden class and reveal classes (`group-hover/cell`, `focus-visible`); the today button has neither hidden class.
  2. The button keeps `aria-label="Open daily note for ..."` and `data-daily-note`, so the click and toast cases still pass.
  3. No `title` attribute remains; hovering shows the Tooltip content "Open daily note".
  4. The button is still a Tab stop (hidden only visually) and shows on focus-visible.

### P65. Week and day Tasks lane hides tasks with no cue (QUICK-PART, S)

Premise true: `EventTaskLane.svelte:23` caps the lane at `ALL_DAY_MAX_ROWS` rows (3) and each cell is `overflow-y-auto` (`:38`), so a fourth chip is a scroll sliver. The all-day lane already does it right (`buildAllDayChips`, `event-calendar-view.logic.ts:364-371`: 2 chips plus "+N" at 3 rows).
- Quick slice (week view): a day with more than 3 tasks shows 2 chips plus a "+N" button with `aria-label="N more tasks, open day view"` that opens day view (copy `EventAllDayLane.svelte:41-45,90-99`). In day view (`days.length === 1`) the "+N" would loop, so the lane label reads "Tasks (N)" with the count and keeps its internal scroll.
- Deferred part: expanding the lane in place in day view. The lane sits in the sticky header (`EventTimeGrid.svelte:171`), so a day with 20 tasks would grow the sticky block over the whole viewport; it needs a max-height design.
- Files: `event-calendar-tasks.logic.ts` (a pure `taskLaneCells(days, tasks)` mirroring `buildAllDayChips`), `EventTaskLane.svelte`; tests `event-calendar-tasks.logic.test.ts`, `EventTaskLane.test.ts`. Update the line in `help/documentation/27-calendar.md` ("A busy day scrolls inside its cell").
- Test seam: pure function; component with real stores and `openFileInEditor` mocked (as `EventTaskLane.test.ts:7` does).
- Acceptance:
  1. Failing test first: `taskLaneCells` with 5 tasks on one day returns 2 chips and overflow 3; with 3 tasks returns 3 and 0.
  2. Component: a week-view day with 5 tasks renders 2 `[data-calendar-task]` and one `[data-task-lane-more]` reading "+3".
  3. Clicking it sets the focused date to that day and the view to `day`.
  4. Component with a single day: no "+N" button, the label shows the count, and all tasks render.
  5. Lane height still equals `rows` x chip height (no clipped sliver).

### P127. Time grid never scrolls to the now-line (QUICK-PART, S)

Premise true: `EventTimeGrid.svelte:97-100` scrolls to `dayStartHour * HOUR_HEIGHT` only; after about 15:00 on a typical viewport the now-line is below the fold.
- Quick slice: on mount, when a visible day is today and the now-line would be below the viewport after the start-hour scroll, scroll so the line sits about a third from the top. Otherwise the existing scroll is unchanged, so the "Day starts at" setting is still honoured (a 09:30 now does nothing new).
- Pure function in `event-calendar-layout.logic.ts`: `mountScrollTop({ dayStartHour, nowMinutes | null, viewportPx, headerPx })` returning the scrollTop. Component reads `scroller.clientHeight` and the `[data-time-grid-header]` height.
- Deferred: the Today button also scrolling to now (needs a store signal because the grid does not remount when the week is the same) and the optional "Now" pill.
- Files: `event-calendar-layout.logic.ts`, `EventTimeGrid.svelte`; tests `event-calendar-layout.logic.test.ts`, `EventTimeGrid.test.ts:287` (current mount-scroll case).
- Test seam: pure function; component test sets the store clock (`eventCalendarViewStore` `nowMs` setter) and stubs `clientHeight`/`offsetHeight`.
- Acceptance:
  1. Failing test first: `mountScrollTop` with now 15:40, start 8, viewport 600, header 90 returns a scrollTop that puts the line at one third of the visible body; with now 09:30 it returns `8 * 64`.
  2. Now earlier than the start hour, or no visible today (a past week), returns the start-hour scroll.
  3. Component: existing "scrolls to dayStartHour on mount" case still passes at a morning clock.
  4. Component: at 22:15 with a stubbed viewport, the scroller's `scrollTop` equals the computed value.

### P128. Day view stacks two headers (DEFER, M)

Premise true (`EventCalendarView.svelte:250-251` week strip plus `EventDayHeaders` in the grid; empty all-day lane is 41 px from `laneRows` minimum 1). The fix moves the daily-note button into `EventWeekStrip`, drops the in-grid header in day view and shrinks the empty all-day lane to a strip that still accepts create clicks. That reshapes the sticky header that P65, P127 and P130 also read, changes where tests find `[data-day-header]` in day view, and needs a decision on the create affordance in the thin strip. Do it after the quick calendar tickets, not with them.

### P129. Event creation gestures are hidden (QUICK, S)

Premise true: `CALENDAR_SHORTCUTS` (`event-calendar-keys.logic.ts:57-67`) lists keys only; `EventShortcutsDialog.svelte:19` renders that table.
- Behaviour: a second table headed "Mouse" below the keys: click or drag an empty slot (day/week) creates; click an empty spot in the All day lane creates an all-day event; double-click an empty month cell creates at the day-start hour; click a month day number selects, click the selected number opens day view; drag a block to move, drag its bottom edge to resize (day/week); drag a month chip to another day; click an event for details. Gestures themselves do not change. The optional hover hint on month cells is skipped.
- New constant `CALENDAR_GESTURES` in `event-calendar-keys.logic.ts` (separate from `CALENDAR_SHORTCUTS`, whose tests tie each chord to the resolver and to doc tables, `:236` of the keys test reads the doc 20 heading). Do not edit `20-keyboard-shortcuts.md` (on the MVP branch); `27-calendar.md` already has the gesture table at `:48-52` and gets one sentence that the dialog lists them.
- Files: `event-calendar-keys.logic.ts`, `EventShortcutsDialog.svelte`, `27-calendar.md`; tests `event-calendar-keys.logic.test.ts`, a dialog case in `EventCalendarView.test.ts` (or a new `EventShortcutsDialog.test.ts`).
- Test seam: real `eventCalendarViewStore.openHelp()`; no mocks.
- Acceptance:
  1. Failing test first: `CALENDAR_GESTURES` is non-empty, each row has a label and a view scope, and no row duplicates a `CALENDAR_SHORTCUTS` chord.
  2. Dialog opened via `openHelp()` renders a "Mouse" heading and one row per gesture, with the existing key rows unchanged.
  3. A consistency test ties each gesture to the `27-calendar.md` creation table text (same pattern as the existing doc ties).
  4. Existing shortcut-resolver tests stay green untouched.

### P182. Multi-day read-only events look editable (QUICK, S)

Premise true: `readOnly: span` at `event-calendar-event.logic.ts:222`; blocks mark it only with `data-readonly` (`EventBlock.svelte:83`, `EventMonthGrid.svelte:132`, `EventAllDayLane.svelte:83`), drags skip it (`EventTimeGrid.svelte:125`, `event-calendar-day-drag.svelte.ts:54-57`), and `EventPopover.svelte` shows nothing about it. The wording already exists in `EventForm.svelte:80` ("This event has an end date or crosses midnight. Change its date and time in the note.").
- Behaviour: a small `lock` icon (exists in lucide) on read-only blocks and chips (decorative, `aria-hidden`), `cursor-default` instead of `cursor-pointer`, ", read-only" appended to the block's aria-label, and a caption line in the popover for read-only events reusing the form's sentence. Popover Edit keeps working as today.
- Files: `EventBlock.svelte`, `EventMonthGrid.svelte` (chip), `EventAllDayLane.svelte` (chip), `EventPopover.svelte`; tests in `EventMonthGrid.test.ts:567`, `EventAllDayLane.test.ts:141`, `EventTimeGrid.test.ts`, `EventPopover.test.ts:161`. Sequence after the month-grid ticket (same file).
- Test seam: real stores; no mocks.
- Acceptance:
  1. Failing test first: popover for a `readOnly` event shows `[data-popover-readonly]` with the sentence; a normal event does not.
  2. Month chip, all-day chip and time block with `readOnly` contain the lock marker; normal ones do not.
  3. The accessible name of a read-only time block ends with "read-only".
  4. Drag behaviour tests (`:567` "never drags it") unchanged.

### P32. Calendar navigator renders broken at about 163 px (QUICK-PART, S)

Premise true: `CalendarGrid.svelte:44-50` renders 3-letter uppercase weekday labels in seven columns next to a `w-6` week-number column; `CalendarNavigator.svelte:96-137` header holds five buttons plus the month label with no `shrink-0`. The default pane sizes (`settings.store.svelte.ts:70-74`) stay as the owner set them.
- Quick slice: make the grid and header container-aware with Tailwind container queries (already used in this repo, e.g. `@max-[560px]` in `TasksView.svelte`): below about 190 px of content the weekday headers show one letter, the week-number column is hidden (`@max-[190px]:hidden`), the month label uses the short form, and the chevron buttons are `shrink-0`. Both variants are in the DOM and CSS picks one (the repo's own pattern for the Tasks Filters menu).
- Deferred: letting navigators declare a pixel `minWidth` (touches layout/pane code).
- Files: `CalendarGrid.svelte`, `CalendarNavigator.svelte`, `calendar.logic.ts` (a short month label next to `label`); tests `CalendarGrid.test.ts`, `CalendarNavigator.test.ts`, `calendar.logic.test.ts`.
- Risk to say out loud: jsdom cannot evaluate container queries, so the tests pin the DOM and classes; the width behaviour needs a by-eye check in the app (say so in the commit).
- Test seam: pure `buildMonthGrid` label test; component tests with the real calendar store.
- Acceptance:
  1. Failing test first: `buildMonthGrid(...)` exposes `shortLabel` ("Nov 2026") alongside `label`.
  2. Each day header contains a full label and a one-letter label with the container-query hide classes; screen-reader text is the full weekday.
  3. The week-number column carries the narrow-hide class and still opens the weekly note.
  4. Month label button (`data-calendar-month-label`) keeps its existing text for the e2e checks (`calendar-plugin.spec.ts:25`, `rail-shell.spec.ts:975`).
  5. By-eye check at 140, 163, 200, 260 px recorded in the commit.

### P132. Rail mini month has no grid semantics (QUICK-PART, S)

Premise true: `CalendarGrid.svelte:56-72` gives 42 day buttons plus 6 week buttons (48 Tab stops), number-only names, dots without text, and the today mark is `ring-1` (`:59`).
- Quick slice: each day button gets `aria-label` with the full date and the note count ("Tuesday, November 10, 2026, 2 notes"), `aria-pressed` for the selected day and `aria-current="date"` on today; today is shown with a soft fill and bold number instead of a ring, so it no longer looks like focus; the selected fill still wins when both coincide.
- Deferred: roving tabindex with arrow, Home and End keys (new focus management, month change while focused). Real a11y gain, but it is the risky half.
- Files: `CalendarGrid.svelte` (the label can come from `formatLong`-style helper in `calendar.logic.ts`), `calendar.logic.ts` if a label helper is added; tests `CalendarGrid.test.ts`, `calendar.logic.test.ts`.
- Test seam: real component, props only; no mocks.
- Acceptance:
  1. Failing test first: a day with 2 notes has an accessible name containing its weekday, date and "2 notes"; a day with none has no count text; 1 note reads "1 note".
  2. Today has `aria-current="date"`; the selected day has `aria-pressed="true"`.
  3. Today no longer has the `ring-1` class; today and selected together render the selected fill.
  4. Existing `data-date` and click behaviour unchanged.

### P131. Rail periodic notes: silent weekly errors, hidden "Go to today" (QUICK-PART, S)

Premise true: `CalendarNavigator.svelte:80-82` `openWeeklyNote` catches with `console.error` only, while `openPeriodicEntry` (`:68-73`) toasts; "Go to today" exists only as the month label's `title` (`:113-120`).
- Quick slice: `openWeeklyNote` toasts `Could not open the weekly note` (same text pattern as `:71`); an explicit "Today" button runs `goToToday`; the month label becomes plain text (the review's call). Not included: the Today row and existence markers (dropped by the review).
- Existing tests that pin the label as a button and move on purpose: `CalendarNavigator.test.ts:213` (label click goes to today), `e2e/specs/calendar-plugin.spec.ts:30-38` ("the month label goes back to today"). `data-calendar-month-label` stays on the label.
- Placement: follow the prototype (`#P131` host) and fit it with P32's narrow header; do this in the same ticket as P32 and P132.
- Files: `CalendarNavigator.svelte`; tests `CalendarNavigator.test.ts`, e2e `calendar-plugin.spec.ts`. Sequence with shell-sidebars-ux Issue 34 (`CalendarNavigator.svelte:88`, band class, ready-for-agent): different lines, whichever lands second rebases.
- Test seam: mock `openOrCreatePeriodicNoteForDate` to reject (a Tauri/file side effect; the existing tests already mock `calendar.service`), real calendar store, real `svelte-sonner` spy.
- Acceptance:
  1. Failing test first: a week-number click whose open rejects calls `toast.error` with "Could not open the weekly note".
  2. A "Today" button exists with an accessible name; after stepping to another month, clicking it shows today's month and clears `railDay` (the behaviour of `goToToday`, `:62-65`).
  3. The month label is not a button (no click handler) and keeps its text.
  4. The e2e case is rewritten to use the Today button.

### P63. Tasks note-group headers use two lines (QUICK, S)

Premise true: `TasksView.svelte:766-779` puts the folder in `<p data-task-group-subtitle>` under the title row; the group list is `space-y-6` at `:1135`.
- Behaviour: the folder moves inline after the "N of M open" count (muted, `truncate`, still hidden under 560 px via `@max-[560px]:hidden`), and group spacing drops to `space-y-4`. The count text is kept (Issue 236).
- Files: `TasksView.svelte`; tests `TasksView.filters.test.ts:210` (reads the subtitle text) and `TasksView.grouping.test.ts:159` (no subtitle for flat groups); keep `data-task-group-subtitle`.
- Test seam: real `tasksStore`; mock only `tasks.service` side effects as the file already does.
- Acceptance:
  1. Failing test first: the subtitle element is a descendant of the same row element as the title and the count (not a sibling block under it).
  2. Flat groups still have no subtitle.
  3. The list container has `space-y-4`.
  4. Count text still `N of M open`.

### P180. Dimmed Tasks context rows have no explanation (QUICK, S)

Premise true: `TasksView.svelte:803` applies `opacity-60` to `row.dimmed` rows, with a comment but no user-visible reason; `VisibleRow.dimmed` is defined at `task-query.logic.ts:55-58`.
- Behaviour: dimmed rows get `title="Shown for context"` and `data-task-context`, keep full opacity, and show a thin left rule (`border-l-2` in the divider color, padding adjusted so indent does not shift). The prototype also offers muted text instead of a rule; the rule is the proposal's first choice.
- Sequence: tasks-view-ux Issue 129 (todo, Todoist state on rows) edits row markup; rebase whichever is second.
- Files: `TasksView.svelte`; tests `TasksView.grouping.test.ts:285` (dimmed parent case) and `TasksView.test.ts`.
- Test seam: real stores; no mocks.
- Acceptance:
  1. Failing test first: a dimmed parent row has `title="Shown for context"` and `data-task-context`; a passing row has neither.
  2. A dimmed row no longer has `opacity-60`.
  3. Dimmed rows stay interactive (toggle button still present and enabled).
  4. Indentation (`padding-left`) of a dimmed row equals that of a passing row at the same indent.

### P163. Tasks Display trigger hides the current grouping (QUICK, S)

Premise true: the trigger text is the constant "Display" (`TasksView.svelte:930`); `groupBy` is a string key or `{ property }` (`task-query.logic.ts:846`).
- Behaviour: the trigger reads "Display · Note" (Folder, Due date, Priority, Status, Type, Heading, or the property name for a property grouping). No Sort control.
- Files: `TasksView.svelte` (label derived from `GROUP_OPTIONS` at `:124-131`, `Heading`, and the property name). Existing tests find the trigger by exact text "Display" (`TasksView.grouping.test.ts:40`), so they match by prefix or by an `aria-label` on purpose.
- Test seam: real `tasksStore.setGroupBy`.
- Acceptance:
  1. Failing test first: default trigger text includes "Note"; after `setGroupBy('due')` it includes "Due date".
  2. After `setGroupBy({ property: 'area' })` it includes "area"; after `'heading'` it includes "Heading".
  3. Menu content and radio checks unchanged.
  4. Trigger has an accessible name that still starts with "Display".

### P165. The rule sentence button says only "Edit" (QUICK, S)

Premise true: `TasksView.svelte:1094` renders the visible text "Edit" on `data-task-sources-edit`; the empty state calls the same action "Edit sources" (`task-query.logic.ts:1466`).
- Behaviour: label becomes "Edit sources"; markers and Clear untouched (Issues 125 and 245).
- Files: `TasksView.svelte`; tests that look for the button by text (`TasksView.test.ts:409` expects exactly one "Edit sources" button in the empty state, so with the sentence button visible there will be two; adjust that assertion on purpose or scope it to the empty-state container).
- Acceptance:
  1. Failing test first: the sentence row button text is "Edit sources" and it keeps `aria-expanded`/`aria-controls`.
  2. Clicking toggles the panel as before.
  3. Empty-state test updated to scope to the empty-state container.

### P167. Tasks search field low contrast and no shortcut (QUICK, S)

Premise true: `TasksView.svelte:915-922` uses `bg-background/50 border-border/50 placeholder:text-muted-foreground/50`. Cmd+F is unbound globally: `global-keybindings.ts:100-105` binds only Cmd+Shift+F (`search:toggle`); `searchKeymap` lives only inside CodeMirror (`editor-extensions.ts`).
- Behaviour: full `placeholder:text-muted-foreground` and `border-border` (and a solid background token). Cmd/Ctrl+F focuses and selects the field while the Tasks view is mounted, implemented as a keydown listener inside `TasksView.svelte`, not in `global-keybindings.ts` (that file is on the Claude MVP branch). The handler acts only when focus is inside the view or on `<body>`, so Cmd+F in a note editor in another split pane still reaches CodeMirror. No "/" key (owner decision A8).
- Escape clearing is native `type=search` behaviour; check by eye in the app.
- Files: `TasksView.svelte`; tests `TasksView.keyboard.test.ts:238` (already queries the search input).
- Test seam: real stores; dispatch a real `KeyboardEvent` on `document`.
- Acceptance:
  1. Failing test first: Cmd+F with focus on a task row focuses the search input.
  2. Cmd+F with focus in a CodeMirror-like contenteditable outside the view does nothing and is not `preventDefault`ed.
  3. The listener is removed on unmount (a second Cmd+F after unmount does not touch a stale node).
  4. The input classes no longer contain `/50`.
  5. Cmd+Shift+F still reaches the global handler.

### P164. Sources panel has no "or" cue and 16 always-open controls (QUICK-PART, S)

Premise true: `SourcesPanel.svelte:348-495` stacks cards with no separator; both exclude sections are always expanded (`:495-496`).
- Quick slice: an "or" divider between consecutive source cards (`aria-hidden`, with the text "or"), and the card description line stays. Vocabulary unchanged.
- Deferred: collapsing Global excludes behind a disclosure with a count. `openSources('excludes')` (`TasksView.svelte:149-154`) focuses the first switch in `[data-task-excludes]` right after opening, and `TasksView.lists.test.ts:254,337` reach `[data-task-excludes="global"]` directly, so a collapsed default needs focus and test rework.
- Files: `SourcesPanel.svelte`; tests `TasksView.sources.test.ts`.
- Test seam: real `tasksStore` and `setTaskSources` through the service with only the persistence IPC mocked, as the file already does.
- Acceptance:
  1. Failing test first: with two cards there is one "or" separator between them; with one card or zero, none.
  2. Add card, Remove card and clause editing still pass unchanged.
  3. The separator is not in the accessibility tree (no extra stops, `aria-hidden`).

## Candidate quick tickets

All gates: `pnpm check` + `pnpm vitest run` (frontend only). Run order below is conflict-free: CAL-1, CAL-2, CAL-3, TSK-1 touch disjoint files except `EventMonthGrid.svelte` (CAL-1 then CAL-2).

1. **CAL-1: Month grid reads at a glance.** P64 (part), P183, P130. Files: `EventMonthGrid.svelte`, `EventDayHeaders.svelte`, `EventDailyNoteButton.svelte`, `event-calendar-tasks.logic.ts`, `event-calendar-view.logic.ts` and their tests plus the title assertion in `e2e/specs/event-calendar.spec.ts`. One commit per proposal. Not covered by tests: container sizing and hover visuals, check by eye in light and dark.
2. **CAL-2: Time grid and event details.** P65 (part), P127 (part), P129, P182. Files: `EventTaskLane.svelte`, `EventTimeGrid.svelte`, `EventBlock.svelte`, `EventAllDayLane.svelte`, `EventPopover.svelte`, `EventShortcutsDialog.svelte`, `EventMonthGrid.svelte` (lock icon on chips only), `event-calendar-tasks.logic.ts`, `event-calendar-layout.logic.ts`, `event-calendar-keys.logic.ts`, `27-calendar.md`. Blocked by CAL-1 (shared `EventMonthGrid.svelte` and `event-calendar-tasks.logic.ts`).
3. **CAL-3: Rail mini month.** P32 (part), P131 (part), P132 (part). Files: `CalendarGrid.svelte`, `CalendarNavigator.svelte`, `calendar.logic.ts` and tests, `e2e/specs/calendar-plugin.spec.ts`. Needs the by-eye width check. Sequence with shell-sidebars-ux Issue 34.
4. **TSK-1: Tasks view polish.** P63, P163, P165, P167, P180, plus P164's "or" divider as its own commit. Files: `TasksView.svelte`, `SourcesPanel.svelte` and the `TasksView.*.test.ts` files. Sequence with tasks-view-ux Issue 129 (todo) on row markup, and keep `global-keybindings.ts` untouched.

Left for later (owner decisions or non-trivial): P128 (day view header restructure), P64 optional 5-row month, P65 in-place expand in day view, P127 Today-button scroll and "Now" pill, P32 navigator `minWidth`, P132 roving tabindex and arrows, P164 Global excludes disclosure, P129 hover hint on month cells.

## Overlaps found

- `.scratch/open-itens` Issues that look related but are not covered by these tickets: 065 (collection `CollectionCalendarView` "+N more" is a bare span, collection slice, not the event calendar's `EventMonthGrid`), 138 and 230 (collection calendar), 217 (New event dialog error timing, `EventForm.svelte`, not in this slice), 006 (calendar archived overlay, logic). None can be marked wontfix by CAL-1 to TSK-1.
- Live Issues to sequence with: shell-sidebars-ux 34 (`CalendarNavigator.svelte:88` band class, ready-for-agent); tasks-view-ux 129 (todo, Todoist state on Tasks rows). shell-sidebars-ux 29 (resolved) already renamed the rail entry to "Days", so P131/P132 text should say "Days" where it names the navigator.
- Shared work with other slices: none of the shared primitives (Tooltip, Lock/Calendar icons) need to be built; the shared `Tooltip` already exists, so P130 only uses it. `monthCellSlots` and `EventMonthGrid.svelte` are owned by this slice only.
- Claude MVP branch: no file in CAL-1, CAL-2, CAL-3 or TSK-1 is on it. P167's Cmd+F and P129's doc row were routed away from `global-keybindings.ts` and `20-keyboard-shortcuts.md` for that reason.
