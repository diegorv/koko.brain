# Verdict: calendar-tasks (17 proposals)

Refutation of `scout-calendar-tasks.md` at HEAD 085b23c5d (origin/main), mvp-claude at 361cbc32c. Read-only: nothing edited, run or built.

## What I checked across the slice

- **Claude MVP branch.** `git diff --name-only origin/main...origin/mvp-claude` outside `.scratch` lists, among frontend files: `src/lib/app/{AppShell.svelte,SettingsPanel.svelte,commands.ts,global-keybindings.ts,tauri-listeners.service.ts}`, `src/lib/core/layout/layout.service.ts`, `src/lib/core/settings/*`, `src/routes/(app)/+layout.svelte`, `e2e/mocks/tauri-core.ts`, `help/documentation/{07-sidebar-panels,19-settings,20-keyboard-shortcuts}.md`. None of the files in the tickets below is on that list. The scout's routing of P167 away from `global-keybindings.ts` and of P129 away from doc 20 holds.
- **Shared components.** Every component in this slice has a single importer: `EventMonthGrid`, `EventPopover`, `EventShortcutsDialog`, `EventTimeGrid` from `EventCalendarView.svelte:30-33`; `EventDayHeaders`, `EventTaskLane`, `EventBlock`, `EventAllDayLane` from `EventTimeGrid.svelte:23-26`; `CalendarGrid` from `CalendarNavigator.svelte:17`; `CalendarNavigator` from `calendar-rail.service.ts:9`; `SourcesPanel` from `TasksView.svelte:34`; `TasksView` and `EventCalendarView` from `EditorView.svelte:16,21`, mounted only while their tab is active (`EditorView.svelte:72-79`, one `EditorView` in `AppShell.svelte:264`, no split panes). `EventDailyNoteButton` is used by `EventMonthGrid.svelte:120` and `EventDayHeaders.svelte:47` only.
- **Data writes.** No proposal here writes a vault file, frontmatter, `.canvas`, `.kanban`, `.view` or the settings schema. The only write anywhere near the slice is `settingsStore.updateLayout({ railDay })` in `CalendarNavigator.svelte:57-65`, an existing field written by existing functions; P131's Today button reuses `goToToday` unchanged. No indexing, watcher, save or live-preview path is touched; no Rust; no dependency (`calendar-plus` and `lock` exist in `@lucide/svelte/dist/icons/`).
- **DONE / DROP.** No commit since the review touches these files except e5e08038f (Issue 29, "Days" rename). Every premise holds at HEAD; nothing is DONE or DROP.
- **open-itens.** 006, 065, 138, 140, 204, 217, 230 mention calendars or primitives but none is fully covered by these tickets (065/140 are the collection `CollectionCalendarView`, not `EventMonthGrid`). No wontfix pointer to add.

## Per-proposal verdict

### P64. Month cells clip "+N more" - QUICK-PART (unchanged call, slice tightened)

Premise verified: `EventMonthGrid.svelte:92` cell `p-1.5 overflow-hidden`, chips `h-[22px] shrink-0` (`:125`), footer `py-1 text-xs` (`:145`); 12 + 24 + 3x26 + 28 = 142 px against a 125 px cell. `monthCellSlots` (`event-calendar-tasks.logic.ts:92-96`) caps at `MONTH_MAX_CHIPS = 3` (`event-calendar-view.logic.ts:43`).

What the scout missed:
1. **A second consumer of the cap.** `focusViewFor` (`event-calendar-view.logic.ts:242-254`) decides "Show in calendar" (`openEventInCalendar`, `event-calendar.service.ts:271`) with `index >= MONTH_MAX_CHIPS ? 'day' : view`. With a measured capacity of 2 chips plus footer, an event at index 2 is hidden but `focusViewFor` keeps the month view. It does not break: the focus effect falls back to `[data-month-more]` (`EventCalendarView.svelte:173-178`) and focuses "+N more". The ticket must say this on purpose, and keep `focusViewFor` unchanged (it cannot know the measured height) with a comment that the fallback covers the gap. `event-calendar-view.logic.test.ts:434` (`MONTH_MAX_CHIPS` is 3) and `:675` stay green if the constant stays as the unmeasured default.
2. **The tests can pass while the clip stays.** The capacity formula hard-codes pixel sizes that live in Tailwind classes; a jsdom test with a stubbed `clientHeight` proves only the arithmetic. The ticket needs one real-layout check: a Playwright case at the default viewport that seeds 5 events on one day (`window.__e2e.fs.writeFile` + `vault-index-updated`, as `tasks-view.spec.ts:267-271` does) and asserts the `[data-month-more]` box bottom is at or above its `[data-month-cell]` box bottom.

The scout's slice (measured capacity, footer reserved, unmeasured falls back to 3) stands. `bind:clientHeight` on `cellsEl` cannot loop: rows are `minmax(0, 1fr)` (`:77`) and cells are `overflow-hidden`, so content never changes the height. Skipped: the 5-row month, "+N" in the day row.

### P183. Today versus selected, out-of-month, title comma - QUICK-PART (changed from QUICK)

Premise verified (`EventMonthGrid.svelte:94`, `:104-111`; `rangeLabel` at `event-calendar-view.logic.ts:166`, its only UI reader `EventCalendarHeader.svelte:20`).

Why it is not all quick: the review asks for a permanent primary **ring** on today, but `--ring` and `--primary` are the same color in both themes (`src/app.css:162,174` and `:223,235`), and the day-number button already uses `focus-visible:ring-2 focus-visible:ring-ring` (`:104`). A today ring is the focus ring, which is exactly the defect P132 removes from the rail mini month. Two validated proposals disagree; the today mark needs a one-line owner pick (ring as reviewed, or the same soft fill + bold number as P132 so both calendars agree, which I recommend).

Quick now: the title reads "November 2026" and out-of-month cells drop `bg-muted/40` (numbers stay `text-muted-foreground`). The scout's test list was short: the comma is pinned in `event-calendar-view.logic.test.ts:164-232`, `event-calendar-view.store.test.ts:119-133`, `EventCalendarView.test.ts:117`, and three E2E files, not one: `e2e/specs/event-calendar.spec.ts:110`, `e2e/specs/event-calendar-focus.spec.ts:34`, `e2e/specs/calendar-plugin.spec.ts:66`. All are selector-text updates. `EventMonthGrid.test.ts:91,102` (dims out-of-month) change on purpose.

### P130. Daily-note icon in every cell - QUICK (unchanged, two hidden costs)

Premise verified (`EventDailyNoteButton.svelte:28-37`, `opacity-60` and native `title`).

Hidden costs the scout missed:
1. **bits-ui Tooltip throws without a Provider.** `Tooltip.Root` reads `TooltipProviderContext.get()` (`node_modules/bits-ui/dist/bits/tooltip/tooltip.svelte.js:192`), and runed's `Context.get()` throws when it is missing (`runed@0.35.1 .../context.js:37-40`). `EventMonthGrid` and `EventTimeGrid` are mounted bare in six test sites: `EventMonthGrid.test.ts:62`, `EventTimeGrid.test.ts:62,811`, `EventPopover.test.ts:65`, `EventDialog.test.ts:87`, `event-calendar-gestures.characterization.test.ts:89`. Moving the button to the shared Tooltip without a Provider in its own subtree turns all of those red. Put one `Tooltip.Provider` in `EventMonthGrid` and one in `EventDayHeaders` (nesting under `EventCalendarView.svelte:237` is fine), so no test harness changes.
2. **Hide with `opacity-0`, never `invisible` or `hidden`.** `e2e/specs/event-calendar-daily-note.spec.ts:23-34` clicks the button in a non-today header and cell; Playwright treats an opacity-0 element as visible and clickable, but not a `visibility: hidden` one. Opacity also keeps it a Tab stop.

Also: `help/documentation/27-calendar.md:30` says "a notebook button sits beside each day header"; update it. The Day lens header action keeps `NotebookPen` (`calendar-rail.service.ts:40`); the glyph mismatch is accepted, noted in the ticket.

### P65. Week/day Tasks lane hides tasks - QUICK-PART (unchanged)

Verified `EventTaskLane.svelte:23,38` and the all-day pattern in `buildAllDayChips` (`event-calendar-view.logic.ts:365-371`). No other reader of the lane; E2E (`event-calendar-tasks.spec.ts:38-56`) uses one task per day, so it is untouched. Note for the ticket: the all-day lane already has the same day-view no-op (its "+N" opens day view on the day already shown); leave it. Doc line `27-calendar.md:40` ("A busy day scrolls inside its cell") changes. Deferred: in-place expansion in day view (sticky header growth).

### P127. Time grid never scrolls to now - QUICK-PART (unchanged, one trap)

Verified `EventTimeGrid.svelte:97-100`. Trap: the store clock is only ticked while a consumer holds it (`acquireCalendarClock`, `event-calendar.service.ts:310-316`), and the Calendar view acquires it in its own `$effect` (`EventCalendarView.svelte:220`), which is not guaranteed to run before the child grid's `onMount`. Reading `eventCalendarViewStore.nowMinutes`/`todayKey` at mount can see a value hours old (the last tick, or module load time), and the feature silently does nothing; a test that sets `nowMs` first would still pass. The mount decision must read the current instant itself (`Date.now()`), and the test must set the store clock to a stale morning value with the system time at 22:15. The task lane loads after mount, so the header can grow by up to one lane after the scroll; with the line placed a third down it stays on screen. The focus-request effect runs after `tick()` and still wins for "Show in calendar". Doc `27-calendar.md:34` changes. Deferred: Today-button scroll, "Now" pill.

### P128. Day view stacks two headers - DEFER (unchanged)

Restructures the sticky header the P65/P127/P130 slices also read. The one separable piece, shrinking the empty all-day lane (`laneRows` floors at 1, `event-calendar-view.logic.ts:380-382`), also shrinks the all-day create target in week view, and the prototype pairs it with a hover affordance: a design decision, not a free slice.

### P129. Creation gestures are hidden - QUICK (unchanged)

Verified `CALENDAR_SHORTCUTS` (`event-calendar-keys.logic.ts:57-67`) and the dialog (`EventShortcutsDialog.svelte:17-32`). A separate `CALENDAR_GESTURES` constant keeps the doc-tie tests (`event-calendar-keys.logic.test.ts:159-236`) untouched. Correction: the gesture list must match the code, and `27-calendar.md:48-52` lacks the month chip drag that `EventMonthGrid` supports (`DayDrag`, `:22`; tests `EventMonthGrid.test.ts:502,530`) and the all-day chip drag; add both rows to doc 27 in the same commit or the "Mouse" table and the doc disagree. The dialog description (`:15`, "These work while the Calendar has focus, not while you type in a field.") describes keys only; give the Mouse group its own heading.

### P182. Read-only events look editable - QUICK (unchanged)

Verified `readOnly: span` (`event-calendar-event.logic.ts:222`), `data-readonly` on `EventBlock.svelte:83`, `EventMonthGrid.svelte:132`, `EventAllDayLane.svelte:83`, drag skip at `EventTimeGrid.svelte:125`, the sentence at `EventForm.svelte:80`. Read-only blocks already omit the resize handle (`EventBlock.svelte:116-119`). E2E checks `data-readonly` only (`event-calendar-day-drag.spec.ts:89,134`, `event-calendar.spec.ts:317`), so appending ", read-only" to the accessible name breaks nothing there. Shares `EventMonthGrid.svelte` with P64/P183/P130: after CAL-1.

### P32. Navigator broken at about 163 px - QUICK-PART (unchanged, two corrections)

Verified `CalendarGrid.svelte:22-51` and `CalendarNavigator.svelte:96-137`.
1. **Dual-rendered labels change `textContent`.** Playwright `toHaveText` reads hidden text too. If both "November 2026" and "Nov 2026" sit inside `[data-calendar-month-label]`, `calendar-plugin.spec.ts:25,35-40` and `rail-shell.spec.ts:980,982,997` fail. Keep `data-calendar-month-label` on the full-text element only (or render the short form outside it). Likewise `CalendarNavigator.test.ts:41` (`headerLabels` from `[data-day-header]` text) and `CalendarGrid.test.ts:21` change on purpose.
2. Container queries need an ancestor with `@container`; `CalendarNavigator.svelte:94` has none today. Add it.
jsdom cannot evaluate container queries: by-eye check at 140/163/200/260 px in the commit. Deferred: per-navigator `minWidth`.

### P132. Rail mini month semantics - QUICK-PART (unchanged)

Verified `CalendarGrid.svelte:56-72` (`ring-1` today at `:59`). The today test helper keys on the `ring-1` class (`CalendarNavigator.test.ts:44-47`) and moves on purpose. The new today fill must not use the exact `bg-file-explorer-primary` token: `selectedKeys` (`CalendarNavigator.test.ts:48-50`) and `rail-shell.spec.ts:1000` treat that token as "selected" (an opacity variant such as `/15` is a different class token and is safe for the unit helper; the E2E regex there targets a selected day, so it stays true). Also give the week buttons an `aria-label` ("Open weekly note, week N"; today only `title` at `:33`), as the prototype does: same file, no behaviour change. Deferred: roving tabindex and arrow keys.

### P131. Silent weekly errors, hidden Today - QUICK-PART (unchanged, one correction)

Verified `CalendarNavigator.svelte:68-73` toasts, `:80-82` only `console.error`s, `:113-120` label is the only Today control. Correction: the prototype's header (`calendar-tasks.html:1014`) drops the previous/next **year** buttons. Do not follow that: `calendar-plugin.spec.ts:37` and `rail-shell.spec.ts` use "Next year", and removing navigation is not in the proposal. Keep all four chevrons and add Today. Tests that move on purpose: `CalendarNavigator.test.ts:213` (label click) and `calendar-plugin.spec.ts:30-41`. Sequence with shell-sidebars-ux 34 (`CalendarNavigator.svelte:88`, ready-for-agent).

### P63. Tasks group headers on two lines - QUICK (unchanged)

Verified `TasksView.svelte:766-779` and `space-y-6` at `:1135`. Issue 236 (resolved) set the subtitle hooks, not its line; the `data-task-group-subtitle` hook stays. Tests: `TasksView.filters.test.ts:210`, `TasksView.grouping.test.ts:159`. The `tasks-palette.test.ts` guard (Issue 236) only bans palette classes; tokens pass.

### P180. Dimmed context rows unexplained - QUICK (unchanged)

Verified `opacity-60` at `TasksView.svelte:803`. The left rule must not shift indent: the row's `padding-left` is inline (`:804`), so use an inset shadow or a pseudo-element rather than `border-l-2`. Use a token color (palette guard). `help/documentation/10-tasks-and-todoist.md:158` says "stays, dimmed": reword. Sequence with tasks-view-ux 129 (needs-info, row markup).

### P163. Display trigger hides grouping - QUICK (unchanged)

Verified trigger text at `TasksView.svelte:930`, options at `:124-131`, Heading at `:957`. A property grouping can carry a long key; the trigger is `shrink-0` in a toolbar that already squeezes the search field (`:922`), so the value part needs `truncate` with a max width. Test helper `TasksView.grouping.test.ts:40` matches exact "Display" and changes on purpose. No E2E uses it.

### P165. Bare "Edit" - QUICK (unchanged, test churn larger than claimed)

Verified `TasksView.svelte:1094`. The scout cited one test; the visible text "Edit" is the lookup key in about 20 places: `TasksView.sources.test.ts:115,148,174,219,250,287,291,304,349,357,379`, `TasksView.lists.test.ts:258,338,432,465,481,498`, `tasks-view-settings.test.ts:345`, `TasksView.test.ts:409`, and E2E `e2e/specs/tasks-view.spec.ts:279` (`getByRole('button', { name: 'Edit', exact: true })`). `TasksView.sources.test.ts:291` uses an `only('button', 'Edit sources')` helper that throws once two buttons share the name in the empty state. Still mechanical; `help/documentation/10-tasks-and-todoist.md:107` ("**Edit**, after the sentence") changes too.

### P167. Search field contrast and Cmd+F - QUICK (unchanged)

Verified `TasksView.svelte:915-922` and `global-keybindings.ts:100-105` (Cmd+Shift+F only). Only one TasksView can be mounted (one EditorView, active tab only), so a document listener in the view cannot double-fire. The `/50` style also lives in `KanbanLane.svelte` and `KanbanView.svelte`; leave those (Kanban is owner data surface, out of slice). No doc 20 row (MVP branch); mention Cmd+F in doc 10 instead.

### P164. Sources panel "or" and excludes - QUICK-PART (unchanged)

Verified `SourcesPanel.svelte:348-495` (card loop at `:350`). The divider sits between cards only. Deferred: collapsing Global excludes (`openSources('excludes')` focuses `[data-task-excludes] [role="switch"]` at `TasksView.svelte:149-154`).

## Final quick tickets

Gate for every ticket: `pnpm check` + `pnpm vitest run` (frontend only) and the named E2E specs via `bash scripts/e2e.sh`. One commit per proposal. Run in this order (shared files): CAL-1, then CAL-2 and CAL-3; CAL-4 independent; TSK-1 then TSK-2.

### CAL-1: Month grid reads at a glance (P64 part, P183 part, P130)

- **Files:** `src/lib/features/event-calendar/{EventMonthGrid.svelte,EventDayHeaders.svelte,EventDailyNoteButton.svelte,event-calendar-tasks.logic.ts,event-calendar-view.logic.ts}`, `help/documentation/27-calendar.md`; tests `event-calendar-tasks.logic.test.ts`, `event-calendar-view.logic.test.ts`, `event-calendar-view.store.test.ts`, `EventMonthGrid.test.ts`, `EventCalendarView.test.ts`; E2E `event-calendar.spec.ts`, `event-calendar-focus.spec.ts`, `calendar-plugin.spec.ts` (title text only) and one new month-geometry case.
- **What to build:** month cells size their chip slots from the measured row height with the footer reserved (unmeasured keeps today's 3); the title drops the comma; out-of-month cells lose the fill; the daily-note button shows on cell or header hover, on focus and always on today, with a `calendar-plus` glyph and the shared Tooltip under a Provider owned by `EventMonthGrid` and `EventDayHeaders`.
- **Acceptance:**
  1. Failing test first: `monthCellSlots` with capacity `{ all: 3, withFooter: 2 }` and 4 items shows 2 and hides 2; with 3 items shows 3 and hides 0; `monthCellSlots(5, 0)` with no capacity still shows 3 and hides 2.
  2. Capacity from height: 125 px gives `{ 3, 2 }`, 40 px gives at least 1, never 0 or negative.
  3. Component: with the cells element's `clientHeight` stubbed to 750 (125 per row), a day with 4 events shows 2 chips and "+2 more".
  4. E2E at the default viewport: a seeded day with 5 events has its `[data-month-more]` bottom at or above its `[data-month-cell]` bottom.
  5. `focusViewFor` is unchanged and `event-calendar-view.logic.test.ts:434,675` stay green; a comment at its `MONTH_MAX_CHIPS` check says the `[data-month-more]` fallback covers a smaller measured capacity.
  6. `rangeLabel(...).title` is `November 2026` for month, week and day; every pinned test and the three E2E title assertions are updated.
  7. An out-of-month cell has no `bg-muted/40`; its number keeps `text-muted-foreground`.
  8. The daily-note button for a non-today day carries `opacity-0` plus the hover and `focus-visible` reveal classes; today's does not; it keeps `aria-label` and `data-daily-note`; no `title` attribute remains.
  9. All six bare-mount test sites (`EventMonthGrid.test.ts:62`, `EventTimeGrid.test.ts:62,811`, `EventPopover.test.ts:65`, `EventDialog.test.ts:87`, `event-calendar-gestures.characterization.test.ts:89`) pass unchanged; `event-calendar-daily-note.spec.ts` passes unchanged.
  10. Doc 27 line 30 describes the new glyph and reveal rule.
- **Not covered by tests:** hover visuals and the light/dark look; check by eye.

### CAL-2: Time grid shows what is now and what is hidden (P65 part, P127 part)

- **Blocked by:** CAL-1 (`event-calendar-tasks.logic.ts`).
- **Files:** `src/lib/features/event-calendar/{EventTaskLane.svelte,EventTimeGrid.svelte,event-calendar-tasks.logic.ts,event-calendar-layout.logic.ts}`, `help/documentation/27-calendar.md`; tests `event-calendar-tasks.logic.test.ts`, `event-calendar-layout.logic.test.ts`, `EventTaskLane.test.ts`, `EventTimeGrid.test.ts`.
- **What to build:** in week view a day with more than 3 tasks shows 2 chips and a "+N" that opens day view (all-day lane pattern); in day view the lane label shows the count and keeps its scroll. On mount, when today is visible and the now-line would sit below the viewport after the start-hour scroll, scroll so it sits a third down; otherwise keep the start-hour scroll.
- **Acceptance:**
  1. Failing test first: `taskLaneCells` with 5 tasks on one day returns 2 chips and overflow 3; with 3 returns 3 and 0.
  2. Week view, 5 tasks on a day: 2 `[data-calendar-task]` and one `[data-task-lane-more]` reading "+3", `aria-label` "3 more tasks, open day view"; clicking it sets that date and the `day` view.
  3. Day view: no "+N", the label shows the count, every task renders.
  4. `mountScrollTop` with now 15:40, start 8, viewport 600, header 90 puts the line at a third of the visible body; with now 09:30 returns `8 * HOUR_HEIGHT`; now before the start hour or no visible today returns the start-hour scroll.
  5. Component: with the store clock set to a stale 08:00 and the system time at 22:15 (`vi.setSystemTime`), the mounted scroller's `scrollTop` equals the 22:15 value (the mount reads the instant itself).
  6. `EventTimeGrid.test.ts:287` ("scrolls to dayStartHour on mount") still passes at a morning clock.
  7. Doc 27 lines 34 and 40 match the new behaviour.

### CAL-3: Event details say what you can do (P129, P182)

- **Blocked by:** CAL-1 (`EventMonthGrid.svelte`).
- **Files:** `src/lib/features/event-calendar/{event-calendar-keys.logic.ts,EventShortcutsDialog.svelte,EventBlock.svelte,EventMonthGrid.svelte,EventAllDayLane.svelte,EventPopover.svelte}`, `help/documentation/27-calendar.md`; tests `event-calendar-keys.logic.test.ts`, `EventCalendarView.test.ts` (dialog), `EventMonthGrid.test.ts`, `EventAllDayLane.test.ts`, `EventTimeGrid.test.ts`, `EventPopover.test.ts`.
- **What to build:** a "Mouse" group in the shortcuts dialog from a new `CALENDAR_GESTURES` constant, gestures unchanged; doc 27 gains the month and all-day chip drag rows. Read-only events get a decorative lock icon, `cursor-default`, ", read-only" at the end of the block's accessible name, and a popover caption reusing `EventForm.svelte:80`'s sentence.
- **Acceptance:**
  1. Failing test first: the popover for a `readOnly` event shows `[data-popover-readonly]` with the sentence; a normal event does not.
  2. `CALENDAR_GESTURES` is non-empty, every row has a label and a view scope, no row repeats a `CALENDAR_SHORTCUTS` chord; the existing resolver and doc-tie tests stay untouched and green.
  3. The dialog opened through `openHelp()` renders a "Mouse" heading and one row per gesture; the key rows are unchanged.
  4. A doc tie: every gesture row has a matching row in the `27-calendar.md` creation table, including month chip drag.
  5. Month chip, all-day chip and time block with `readOnly` contain the lock marker; normal ones do not; a read-only block's accessible name ends with "read-only".
  6. `EventMonthGrid.test.ts:567` ("never drags it") and `EventAllDayLane.test.ts:141` pass unchanged.

### CAL-4: Days mini month works narrow and by screen reader (P32 part, P131 part, P132 part)

- **Sequence with:** shell-sidebars-ux 34 (`CalendarNavigator.svelte:88`).
- **Files:** `src/lib/plugins/calendar/{CalendarGrid.svelte,CalendarNavigator.svelte,calendar.logic.ts}`; tests `CalendarGrid.test.ts`, `CalendarNavigator.test.ts`, `calendar.logic.test.ts`; E2E `calendar-plugin.spec.ts`.
- **What to build:** container-aware grid and header (one-letter weekdays, hidden week column and short month label below about 190 px, chevrons `shrink-0`, `@container` on the navigator body); full-date day labels with note counts, `aria-current="date"` on today, `aria-pressed` on the picked day, week-button `aria-label`s; today as a soft fill and bold number instead of `ring-1`; weekly-note failures toast; an explicit Today button beside the four existing chevrons; the month label becomes plain text.
- **Acceptance:**
  1. Failing test first: a week-number click whose `openOrCreatePeriodicNoteForDate` rejects calls `toast.error('Could not open the weekly note')`.
  2. `buildMonthGrid(...)` exposes `shortLabel` ("Nov 2026") beside `label`.
  3. A day with 2 notes has an accessible name with weekday, full date and "2 notes"; 1 note reads "1 note"; none has no count.
  4. Today has `aria-current="date"` and no `ring-1`; the picked day has `aria-pressed="true"` and the exact `bg-file-explorer-primary` class; today's fill uses another class token.
  5. A Today button with an accessible name returns to today's month and clears `railDay` after a month step; Previous/Next year and month stay.
  6. `[data-calendar-month-label]` holds only the full label text, is not a button, and the E2E label assertions (`calendar-plugin.spec.ts:25,35-40`, `rail-shell.spec.ts:980-997`) pass with only the "label goes back to today" case rewritten to the Today button.
  7. By-eye check at 140, 163, 200 and 260 px recorded in the commit (jsdom cannot evaluate container queries).

### TSK-1: Tasks toolbar says what it does (P163, P165, P167)

- **Sequence with:** tasks-view-ux 129 (needs-info).
- **Files:** `src/lib/features/tasks/TasksView.svelte`, `help/documentation/10-tasks-and-todoist.md`; tests `TasksView.grouping.test.ts`, `TasksView.sources.test.ts`, `TasksView.lists.test.ts`, `tasks-view-settings.test.ts`, `TasksView.test.ts`, `TasksView.keyboard.test.ts`; E2E `tasks-view.spec.ts:279`.
- **What to build:** the Display trigger shows the current grouping ("Display · Note"), truncating a long property key; the sentence button reads "Edit sources"; the search field uses full `border-border` and `placeholder:text-muted-foreground`; Cmd/Ctrl+F focuses and selects it while the view is mounted, from a listener in `TasksView.svelte` that acts only when focus is in the view or on `<body>`.
- **Acceptance:**
  1. Failing test first: the default Display trigger text includes "Note"; after `setGroupBy('due')` "Due date"; after `{ property: 'area' }` "area"; after `'heading'` "Heading"; its accessible name starts with "Display".
  2. The sentence button reads "Edit sources", keeps `aria-expanded`/`aria-controls`, toggles the panel; every test lookup of "Edit" and the E2E case are updated; the empty-state test scopes its "Edit sources" lookup to the empty-state container.
  3. Cmd+F with focus on a task row focuses the search input; Cmd+F from a contenteditable outside the view does nothing and is not `preventDefault`ed; after unmount the listener is gone; Cmd+Shift+F still reaches the global handler.
  4. The search input classes contain no `/50`.
  5. Doc 10 line 107 names "Edit sources" and the doc mentions Cmd+F; doc 20 is not touched.

### TSK-2: Tasks list is denser and explains itself (P63, P180, P164 part)

- **Blocked by:** TSK-1 (`TasksView.svelte`).
- **Files:** `src/lib/features/tasks/{TasksView.svelte,SourcesPanel.svelte}`, `help/documentation/10-tasks-and-todoist.md`; tests `TasksView.filters.test.ts`, `TasksView.grouping.test.ts`, `TasksView.test.ts`, `TasksView.sources.test.ts`.
- **What to build:** the folder moves inline after "N of M open" (muted, truncated, hidden under 560 px), group spacing `space-y-4`; dimmed context rows keep full opacity, get a thin token-colored left rule that does not shift the indent, `title="Shown for context"` and `data-task-context`; an `aria-hidden` "or" divider between consecutive source cards.
- **Acceptance:**
  1. Failing test first: `[data-task-group-subtitle]` is inside the same row element as the title and the count; flat groups still have none; the list container has `space-y-4`; the count text is still "N of M open".
  2. A dimmed parent row has `title="Shown for context"` and `data-task-context`, no `opacity-60`, an enabled toggle, and the same inline `padding-left` as a passing row at its indent; a passing row has neither attribute.
  3. Two cards render one "or" separator between them; one or zero cards render none; the separator is `aria-hidden`; Add card, Remove card and clause edits pass unchanged.
  4. Doc 10 line 158 describes the rule and tooltip instead of "dimmed".

## Deferred

- P64: optional 5-row months and "+N" in the day row (alternative design, not needed for Nov 2026).
- P183: the permanent today mark in the month grid. A primary ring equals the focus ring (`--ring` = `--primary`, `src/app.css:162,174`), the defect P132 removes; owner picks ring or P132's fill, then it is a quick follow-up in `EventMonthGrid.svelte`.
- P65: in-place expansion of the day-view task lane (sticky header growth needs a max-height design).
- P127: Today button scrolling to now (needs a store signal, the grid does not remount within the same week) and the "Now" pill.
- P128: one day-view header and a thin empty all-day lane (header restructure, create-target decision; M).
- P129: hover hint on empty month cells.
- P32: per-navigator pixel `minWidth` (pane/layout code).
- P132: roving tabindex with arrows, Home and End (new focus management).
- P164: Global excludes behind a disclosure (focus target of `openSources('excludes')` and `TasksView.lists.test.ts:254,337`).

## Overlaps

- open-itens: none fully covered; no wontfix pointers.
- Live: shell-sidebars-ux 34 (CAL-4, `CalendarNavigator.svelte:88`), tasks-view-ux 129 (TSK-1/TSK-2, needs-info, row markup). Neither is replaced.
- Claude MVP branch: no ticket file is on it.

Not verified: real pixel heights (no app run), whether Svelte runs the parent `$effect` before the child `onMount` here (CAL-2 avoids depending on it), and Playwright's hidden-text behaviour was taken from its documented `textContent` default, not run.
