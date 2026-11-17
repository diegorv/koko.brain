# Design review: Event calendar and periodic notes

Scope: `src/lib/features/event-calendar`, `src/lib/plugins/calendar`, `src/lib/plugins/periodic-notes`, plus the two settings sections that configure them. Paths relative to `src/lib/`. Screenshots in `.scratch/design-review/screens/`.

## Clear

### 1. Rail mini calendar overflows its column
- Evidence: `calendar-plugin-navigator-light.png` (weekday headers "MONTUEWEDTHU..." collide at y=115, the month title wraps to two lines, the double chevrons are clipped at x=193 and x=352). `plugins/calendar/CalendarGrid.svelte:22-51` (week column `w-6` + gap + 7 fluid columns, header `text-xs` 3-letter labels), `CalendarNavigator.svelte:96-137` (five buttons plus the title in one non-wrapping row). `app/AppShell.svelte:210` gives the navigator pane `minSize={3}`, so nothing keeps it above the width the grid needs.
- Math: column is 163px, inner 147px, minus 28px week column and 4px gap leaves about 115px, so about 16px per day; "MON" at 12px needs about 24px.
- Proposal: make the grid container-aware. Under about 200px drop the week-number column behind a toggle and use single-letter weekday headers; keep the header on one row (title truncates, year chevrons move into the title's menu or appear only above 200px). Also give the navigator pane a sensible minimum width so it cannot be dragged to a broken state.

### 2. Month cells clip the "+N more" button
- Evidence: `calendar-month-light.png` (cells for Tue 10 and Thu 12: "+4 more" and "+2 more" cut in half at y=491). `EventMonthGrid.svelte:92` (`overflow-hidden`), `:122-152`, `event-calendar-view.logic.ts:43` (`MONTH_MAX_CHIPS = 3`, fixed) and `event-calendar-dates.logic.ts:167-169` (always 42 cells, 6 rows).
- Math: 12 padding + 24 day row + 3x22 chips + 4 gaps x4 + 24 more-button = 142px, but a cell is about 125px at 1440x900.
- Proposal: size the visible slots from the real cell height (ResizeObserver or container query) and always reserve the footer; at 125px that means 2 chips plus "+N more". Alternative: put the "+N" count in the day-number row at the right so it can never be clipped. Optionally render 5 rows for 5-week months (20% taller cells).

### 3. Tasks hidden in the week and day Tasks lane with no cue
- Evidence: `calendar-week-light.png` and `calendar-day-light.png` (Tue 10 shows 3 task chips and a sliver of a 4th at y=260 / y=324). `EventTaskLane.svelte:23` (rows capped by `ALL_DAY_MAX_ROWS = 3`), `:38` (`overflow-y-auto` inside each cell). The all-day lane next to it uses an explicit "+N" button (`EventAllDayLane.svelte:90-99`); the task lane does not.
- Proposal: same pattern as the all-day lane: show the first 2 tasks plus a "+N" chip that opens the day view, or make the lane expandable with a chevron next to the "Tasks" label and a count ("Tasks 5"). Never rely on a hidden inner scrollbar.

## Moderate

### 4. New event dialog opens with a red error and a disabled Save
- Evidence: `EventForm.svelte:38-39` (`errors = validateDraft(draft)` runs on the pristine draft), `:73-75` (renders `errors.title` unconditionally), `:187` (Save disabled), `event-calendar-form.logic.ts:163` ("Enter a title."), `:104` (create draft title is `''`).
- Proposal: show field errors only after the field was touched or a submit was attempted; give Title a placeholder ("Event title"), keep it focused on open, and keep the Save disabled state without the red text.

### 5. Time grid never scrolls to "now"; Today does not either
- Evidence: the only scroll code is `EventTimeGrid.svelte:97-100` (on mount, to `dayStartHour * HOUR_HEIGHT`, 64px per hour). `calendar-week-light.png` starts at 08:00. At 900px high about 10 hours are visible, so after roughly 17:00 the now-line is off screen and the Today button/T key only changes the date.
- Proposal: on mount and on Today, if today is visible, scroll so the now-line sits about a third from the top (never above `dayStartHour`). When the now-line is off screen, show a small "Now" pill pinned to the axis edge that jumps to it.

### 6. Day view stacks two headers and wastes a third of the height
- Evidence: `calendar-day-light.png`: week strip (y=80-143), then a second "TUE 10" column header (y=144-191), All day row (empty), Tasks lane; the first hour label (08:00) is at y=391. Code: `EventCalendarView.svelte:250-251` (strip) plus `EventTimeGrid.svelte:253` (day headers also render for one day). A 30-minute standup is a 960px wide bar.
- Proposal: in day view hide the in-grid day header (the strip already names the day, and its daily-note button can move into the strip), collapse an empty All day row to a thin line, and cap event block width (for example 720px, left-aligned) or split the pane into timeline plus a side agenda.

### 7. Creating events is hidden and inconsistent across views
- Evidence: time grid, a plain press and release on empty space opens the create dialog (`EventTimeGrid.svelte:119-141`, `event-calendar-drag.logic.ts:192-195` returns `create` with no "moved" check); month, double-click on an empty cell (`EventMonthGrid.svelte:60-63`); all-day lane, single click (`EventAllDayLane.svelte:47-50`); a second click on the selected day opens day view (`EventMonthGrid.svelte:45-49`, `EventDayHeaders.svelte:14-18`). `event-calendar-keys.logic.ts:57-67` and the help dialog list only keys, no mouse gestures. A stray click on the grid therefore opens a dialog.
- Proposal: one rule for all views (drag or double-click creates; single click only selects or dismisses), plus a "Mouse" section in the shortcuts dialog and a one-line hint ("Drag on the grid or press N to add an event") when the visible range has no events.

### 8. Daily-note icon is repeated in every cell and header, at an ambiguous weight
- Evidence: `calendar-month-light.png` (42 notebook icons, one per day cell), `calendar-week-light.png` (7 in the headers). `EventDailyNoteButton.svelte:30` (`opacity-60` at rest), `:32` (native `title` only, unlike the header's Tooltip), `EventMonthGrid.svelte:120`, `EventDayHeaders.svelte:47`. The pen-on-notebook glyph reads as "edit" or "new", next to a grid where new events are created.
- Proposal: show it on hover or focus-within of the cell, and always on today's cell; use a clearer glyph and a shared Tooltip ("Open daily note, Tue 10 Nov"). Keep the aria-label.

### 9. Rail Periodic notes list: no daily row, no created/not-created cue, silent weekly failure, unlabeled grid buttons
- Evidence: `calendar.logic.ts:121-142` returns week, month, quarter, year only; the daily note is reachable only through an icon in the note-list header (`calendar-rail.service.ts:36-43`, title in tooltip only). Rows read "Week 46", "November 2026" with a tooltip "Open or create the {period} note" (`CalendarNavigator.svelte:147`): a click may silently create a note. Weekly failure: `openWeeklyNote(...).catch(console.error)` at `:80-82` (no toast; the other path toasts at `:71`). `CalendarGrid.svelte:30-36` and `:56-63`: accessible names are just "46" or "10" (no month/weekday). The month label button is "Go to today" (`:113-120`, `title` only), which a title-styled label does not suggest.
- Proposal: add a "Today, Tue 10 Nov" row first; mark rows whose note exists (filled dot or normal weight) versus "create" (faint plus icon); toast the weekly failure like the others; give the day and week buttons full aria-labels ("Tuesday, 10 November 2026, 3 notes", "Open weekly note, week 46"); add an explicit "Today" button beside the month title and make the title a plain label.

### 10. Color swatches do not look like the event colors
- Evidence: `EventColorSwatches.svelte:52` and `EventPopover.svelte:165` paint with `--event-{color}-fg`, which `app.css:403-414` defines as 30% hue mixed into the editor foreground, so the swatches are muddy dark tones (`settings-calendar-light.png`: teal, purple, slate, brown, plum, navy, hard to tell apart) while the chips use the pastel `-bg`. `aria-label={color}` is the raw id.
- Proposal: render each swatch with the real chip fill (`-bg`) and a stronger hue ring or dot, show a check icon on the selected one, and add a Tooltip with the capitalized color name.

### 11. "Needs attention" panel: developer wording and permanent height
- Evidence: `EventCalendarNeedsAttention.svelte:17-39` ("all_day is not true or false", "end_date is not YYYY-MM-DD", "has a trailing # comment"), `:74` (list always expanded, up to `max-h-40` = 160px under the grid), `:82` "Unscheduled (n)" versus `:94` "n unscheduled" for the same state in two components. Not visible in the mock vault; verified in code only.
- Proposal: one collapsed line ("2 events need attention", chevron) that expands on click; plain wording with the field in secondary text ("All day must be true or false (all_day)"); a single phrase for unscheduled; keep the destructive tint only for the badge.

### 12. Settings: periodic note formats write on every keystroke with no preview
- Evidence: `core/settings/sections/PeriodicNotesSection.svelte:26-31, 37-49, 68-80` (`oninput` writes settings per character; formats like `YYYY-[W]WW` are cryptic; "Template path" is free text with no picker), `:58-63` (Auto-pin stays enabled when Auto-open is off though its description says "requires auto-open"), `:20` heading "Periodic Notes" in Title Case versus "Calendar". `settings-periodic-notes-light.png`. Calendar section: `EventCalendarSection.svelte:157` "Day starts at" actually sets the hour the grid scrolls to on open.
- Proposal: under each Format show a live example ("Today: 2026-11-10, Daily/2026-11-10.md"), validate on blur, add a template picker or autocomplete limited to the templates folder, disable Auto-pin when Auto-open is off, and rename "Day starts at" to "Scroll to hour on open".

## Polish

### 13. Read-only (multi-day) events look editable but ignore drags
- Evidence: `EventBlock.svelte:83`, `EventMonthGrid.svelte:132` set only `data-readonly`; `EventTimeGrid.svelte:125` skips the gesture, `EventPopover.svelte:181-192` shows the same actions. Dragging such a block silently does nothing.
- Proposal: add a small lock or span icon on the block and a one-line caption in the popover ("Multi-day: change the dates in the note").

### 14. Header controls and title
- Evidence: `EventCalendarHeader.svelte:99-121` (D/W/M one-letter `role="tab"`, no tabpanel, labels only in aria), `:43` Today button never says which day it jumps to, `event-calendar-view.logic.ts:165` title "November, 2026" (stray comma; `calendar-month-light.png`).
- Proposal: show "Day Week Month" at normal widths (letters only when narrow), use radiogroup or toggle-group semantics, add Tooltips with the key hints, and drop the comma.

### 15. Today versus selected, weekends, out-of-month styling
- Evidence: `EventMonthGrid.svelte:104-111` (selected day gets the filled primary badge, today only colored text, so after selecting another day today nearly disappears), `:94` (out-of-month cells get a darker `bg-muted/40` and look heavier than in-month ones, `calendar-month-light.png` rows 1 and 6), no weekend distinction.
- Proposal: today always keeps a ring or dot, selection is the fill; out-of-month cells recede (lighter text, no darker fill); weekend columns get a very light tint.

### 16. Size and tooltip drift
- Evidence: chip heights 22, 24 and 28px across month, task lane and all-day lane (`EventMonthGrid.svelte:125`, `EventTaskLane.svelte:16`, `EventAllDayLane.svelte:19`); `text-[11px]` used 9 times though `--text-label` (11px) exists (`app.css:92`); native `title` on popover/dialog/daily-note buttons versus shadcn Tooltip in the header.
- Proposal: one chip height token per density, use `text-label`, and route icon-button hints through the shared Tooltip.
