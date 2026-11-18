# Inventory: Event calendar and periodic notes

Scope: `src/lib/features/event-calendar`, `src/lib/plugins/calendar`, `src/lib/plugins/periodic-notes`. Facts only, no judgments. Paths are relative to `src/lib/`. Line counts are `wc -l`.

## 1. Components

### features/event-calendar

- `EventCalendarView.svelte` (290 lines). View root `<section aria-label="Calendar">`, global key handler, load effects, focus-request pulse, mounts header, needs-attention, popover, dialog, shortcuts. Shadcn: `Tooltip.Provider` only. Custom markup for the states (`:240-259`).
- `EventCalendarHeader.svelte` (124). Title and subtitle, Today button, prev/next/shortcuts icon buttons, D/W/M tablist. Shadcn: `Button`, `Tooltip`. Tabs are custom `<button role="tab">` (`:108-121`).
- `EventMonthGrid.svelte` (156). 6x7 (or 6x5) grid of day cells, chips, "+N more". Shadcn: none. Custom grid, custom chip buttons.
- `EventTimeGrid.svelte` (336). Time grid with axis, hour lines, blocks, create ghost, now line, pointer gestures. Shadcn: none.
- `EventBlock.svelte` (122). Timed event block, `div role="button"`. Shadcn: none.
- `EventAllDayLane.svelte` (104). All-day lane with chips and "+N" overflow. Shadcn: none.
- `EventTaskLane.svelte` (48). "Tasks" lane for dated tasks. Shadcn: none.
- `EventTaskChip.svelte` (43). Outlined task chip, used in month cell and task lane. Shadcn: none.
- `EventDayHeaders.svelte` (50). Day-view/week-view column headers (weekday + date button). Shadcn: none.
- `EventWeekStrip.svelte` (60). Seven-day strip shown above the day view. Shadcn: none.
- `EventPopover.svelte` (195). Event details card (Popover). Shadcn: `Popover.Root`, `Popover.Content`, `Button` x3 (Edit, Open note, plus icon Duplicate/Delete via `Button`).
- `EventDialog.svelte` (223). Create/edit dialog with footer actions. Shadcn: `Dialog`, `Button`.
- `EventForm.svelte` (190). Shared form (title, date, all-day, start/end, location, color, notes). Shadcn: `Button`, `Input`, `Switch`. Notes textarea is custom markup that copies `ui/input` classes (`:167-171`).
- `EventShortcutsDialog.svelte` (34). Shortcut table in a dialog. Shadcn: `Dialog`. Custom `<table>` and `<kbd>`.
- `EventColorSwatches.svelte` (58). Radio group of six color swatches. Shadcn: none.
- `EventCalendarNeedsAttention.svelte` (116). Attention badge, issue lists, "N unscheduled", archived toggle. Shadcn: none. Native `<details>`/`<summary>` (`:81-84`).
- `EventCalendarSection.svelte` (273). Settings panel section (Display, New events, Event type). Shadcn: `Input`, `Switch`, `Button`, `Select.Root/Trigger/Content/Item`. Uses project `SettingItem`. Mounted from `app/SettingsPanel.svelte:12`.
- `EventDailyNoteButton.svelte` (38). Day-level daily note icon button. Shadcn: none. Native `title` (`:32`). Renders nothing when no opener is registered (`:27`).
- `ShowInCalendarButton.svelte` (75). Icon button shown on search/backlink rows for calendar-event notes. Shadcn: none. Native `title` (`:69`). Renders nothing unless the note is an event (`:64`).

### plugins/calendar

- `CalendarNavigator.svelte` (163). Rail navigator: month header with year/month steppers, `CalendarGrid`, periodic-notes list, "Open Calendar tab" button. Shadcn: none. Native buttons with `title` on each (`:100-156`).
- `CalendarGrid.svelte` (76). Mini month grid, week-number column, day buttons with 1 to 3 dots. Shadcn: none.

### plugins/periodic-notes

- `DailyNoteButton.svelte` (23). Shadcn `Button` + `Tooltip` ("Daily Note"). Imported nowhere in `src` (grep for `DailyNoteButton` finds only `EventDailyNoteButton`). Appears to be an orphan component.

Non-Svelte files of note: `event-calendar.service.ts` (toast copy, `:1400-1426`, `:1501`, `:1507-1522`), `event-calendar-keys.logic.ts` (shortcut table `:57-67`), `calendar-rail.service.ts` (rail registration and rail header copy `:33-44`), `periodic-notes.service.ts` (`:83-85` registers the daily-note opener).

## 2. States

Empty states
- No component renders a "no events" / "no tasks" empty message. Month, week and day grids always render their empty grid (`EventMonthGrid.svelte:66-155`, `EventTimeGrid.svelte:241-335`).
- `EventTaskLane.svelte:28` renders nothing when no task is due on the visible days (no copy).
- `EventCalendarNeedsAttention.svelte:64` renders nothing when there are no issues, attention, unscheduled, or archived items (no copy).
- `CalendarGrid.svelte` and `CalendarNavigator.svelte` have no empty state (periodic list always has 3 or 4 entries, `calendar.logic.ts:121-142`).
- `EventDailyNoteButton.svelte:27` and `ShowInCalendarButton.svelte:64` render nothing in the empty case (by design, no placeholder).

Loading states
- `Indexing vault...` placeholder text, no spinner: `EventCalendarView.svelte:240-241` (shown while `!vaultStore.indexReady`).
- Calendar events have no loading state. `eventCalendarStore.isLoading` is read only in `EventCalendarView.svelte:159` and `:171` (focus request logic). Grids render empty until loaded, with no indicator.
- Tasks have no loading state (`EventCalendarView.svelte:205-217`).
- No spinner or `animate-spin` anywhere in the three folders.

Error states
- Load error for events: full-pane replacement with `role="alert"` text "Could not load events: {message}", `EventCalendarView.svelte:242-245` (`data-calendar-load-error`). Replaces the whole grid.
- Load error toast for events: `EventCalendarView.svelte:134-143`. Load error toast for tasks: `:211-215` (no description detail beyond message).
- Form submit error: inline `role="alert"` paragraph, `EventForm.svelte:179-181`.
- Field validation: inline per-field errors, `EventForm.svelte:73-75`, `:96-98`, `:143-145`. Save is disabled when invalid (`:187`) with no text explaining why beyond the field error.
- Write errors: toasts only (`event-calendar.service.ts:1415-1426`, `EventDialog.svelte:154`). Toasts can carry an "Open note" action.
- Daily note open failure: toast "Could not open the daily note" (`EventDailyNoteButton.svelte:19-21`).
- Show-in-calendar failure: toast "This note is no longer a calendar event" (`ShowInCalendarButton.svelte:54`), "Could not open the Calendar" (`:57-59`).
- Rail navigator periodic note failure: toast `Could not open the ${label} note` (`CalendarNavigator.svelte:70-71`), with `console.error` (`:70`).
- Rail weekly note failure: `openOrCreatePeriodicNoteForDate('weekly', dateKey).catch(console.error)` (`CalendarNavigator.svelte:81`). No toast, no user feedback.
- Rail "Open Calendar tab" button (`CalendarNavigator.svelte:76-78`) has no `.catch`.
- `DailyNoteButton.svelte` (orphan, `:16`) calls `openOrCreateDailyNote()` with no catch.

Loading/pending on writes
- Pending events: dashed border via `::after` (`EventBlock.svelte:75-76`) and `data-pending` attribute (`EventBlock.svelte:82`, `EventMonthGrid.svelte:131`). No text label.
- Archived events: `opacity-50` and `data-archived` (`EventBlock.svelte:78`, `EventMonthGrid.svelte:128`, `EventAllDayLane.svelte:80`).
- Dialog save in flight: `saving` disables only the Save button (`EventForm.svelte:187`). Label stays "Save". No spinner.
- Dialog footer Delete and Duplicate buttons are not disabled while saving (`EventDialog.svelte:210-216`).
- Create button "Open Event type" disabled while creating (`EventCalendarSection.svelte:252`). No label change.
- Settings "Default duration" and other inputs have no pending state.

Disabled states
- Timing fields locked when the event has an end date or crosses midnight: `EventForm.svelte:90`, `:105`, `:122`, `:135`, with banner `:78-82` ("This event has an end date or crosses midnight. Change its date and time in the note.").
- Read-only events: `data-readonly` only (`EventBlock.svelte:83`, `EventMonthGrid.svelte:132`, `EventAllDayLane.svelte:83`). No visible read-only marker. `EventPopover.svelte:181-192` and `EventDialog.svelte:208-218` show Edit/Delete/Duplicate regardless of `readOnly` (no conditional found).
- `EventForm` Save disabled when invalid or saving (`:187`).
- Color, all-day toggle: no disabled state except locked timing.

## 3. Interaction

Keyboard
- View-wide shortcuts: `EventCalendarView.svelte:48-92`, resolver `event-calendar-keys.logic.ts:99-123`. Keys: `?`, T, N, D/W/M, Left/Right, Delete/Backspace, Escape, Cmd+Z, Cmd+Shift+Z, Ctrl+Y.
- Document-level fallback when focus is on `<body>`: `EventCalendarView.svelte:110-116`.
- Keyboard cannot move or resize an event. `EventBlock.svelte:62-67` handles only Enter and Space (open popover). The shortcut table has no move or resize action (`event-calendar-keys.logic.ts:57-67`).
- Keyboard cannot create an event in a grid cell. N opens the create dialog (`EventCalendarView.svelte:73-74`).
- Arrow keys in the D/W/M tablist are handled by the tablist (`EventCalendarHeader.svelte:24-32`, roving tabindex `:115`).
- Color swatches: arrow keys, Home and End (`EventColorSwatches.svelte:27-36`).
- Week strip: arrow step past edge refocuses (`EventWeekStrip.svelte:13-25`).
- Focus after close: custom return logic (`EventPopover.svelte:88-106`, `EventDialog.svelte:92-104`).
- Focus pulse on navigation from search: `EventCalendarView.svelte:156-196`.
- Escape cancels a live drag (`event-calendar-gesture-guard.ts:142-147`).
- Root `section` has `tabindex="-1"` and receives focus on mount (`EventCalendarView.svelte:41`, `:231`).

Focus management in dialogs and popover
- Popover opens without auto-focus (`EventPopover.svelte:158`).
- Dialog uses default bits-ui focus (no `onOpenAutoFocus` override in `EventDialog.svelte:192`).

Hover-only affordances
- Resize handle is a 6px (`h-1.5`) invisible strip at block bottom with `cursor-ns-resize` only (`EventBlock.svelte:118-121`). No visible grip.
- Day header hover fills only (`EventDayHeaders.svelte:41-42`, `EventWeekStrip.svelte:53-54`). Hover is the only sign of a clickable day number other than `focus-visible:bg-muted`.
- Daily note icon: `opacity-60`, hover `opacity-100` (`EventDailyNoteButton.svelte:30`). Visible at 60% at rest.
- Event chips: `hover:brightness-110` (`EventMonthGrid.svelte:125`, `EventAllDayLane.svelte:78`, `EventBlock.svelte:75`).
- Rail navigator: no hover-only controls (all visible).
- Calendar grid dots (`CalendarGrid.svelte:66-71`): unlabeled decorative spans carrying meaning (count of notes).

Drag and drop
- Time grid (`EventTimeGrid.svelte:119-200`): press on empty space creates (drag sets range), press on a block moves, press on `[data-resize]` resizes. Pointer capture on body. Movement threshold and click swallow via `GestureGuard`.
- Month grid and all-day lane (`event-calendar-day-drag.svelte.ts:27-143`): drag a chip to another day cell. Window listeners.
- Drop writes through the service with preview held until settle (`EventTimeGrid.svelte:192-200`, `event-calendar-day-drag.svelte.ts:134-142`).
- Only mouse and pen start a gesture (`EventTimeGrid.svelte:122`, `event-calendar-day-drag.svelte.ts:52`).
- No drag from the rail (none in the three folders).

Context menus
- None in the three folders (grep for `contextmenu` returned nothing).

Tooltips
- Shadcn Tooltip with 400 ms delay: `EventCalendarView.svelte:237`. Used on header icon buttons (`EventCalendarHeader.svelte:45-96`). Tooltip content: "Previous {unit}", "Next {unit}", "Keyboard shortcuts (?)".
- Native `title` attributes (not Tooltip): `EventDailyNoteButton.svelte:32`, `ShowInCalendarButton.svelte:69`, `EventTaskChip.svelte:28`, `EventPopover.svelte:185`, `:188`, `EventDialog.svelte:210`, `:213`, `CalendarNavigator.svelte:100-156`, `CalendarGrid.svelte:33`, `EventCalendarSection.svelte:247`.
- Shadcn Tooltip used in `plugins/periodic-notes/DailyNoteButton.svelte` (orphan) only in this area besides the header.

## 4. Accessibility facts

Icon-only buttons
- Have aria-label and title: `EventDailyNoteButton.svelte:31-32`, `ShowInCalendarButton.svelte:68-69`, `EventPopover.svelte:185`, `:188`, `EventDialog.svelte:210`, `:213`.
- Have aria-label (no title in the header, title via Tooltip): `EventCalendarHeader.svelte:52`, `:69`, `:86`.
- Have aria-label and title: `CalendarNavigator.svelte:100-130` (prev/next year and month).
- Missing aria-label: `CalendarGrid.svelte:30-36` (week buttons: only a text number, e.g. "12", plus `title` `W12`). Accessible name is just the number.
- Missing aria-label: `CalendarGrid.svelte:56-63` (day buttons: text is the day number only, no month or weekday context, no title).
- Month label button `CalendarNavigator.svelte:113-120` has a text name and `title` only.
- Color swatches `EventColorSwatches.svelte:47` use the raw identifier as aria-label (`green`, `purple`, `cyan`, `orange`, `pink`, `blue`).

Roles and semantics
- Event block: `div role="button" tabindex="0"` with composed aria-label (`EventBlock.svelte:72-80`).
- Time grid body: `role="presentation"` with pointer handlers (`EventTimeGrid.svelte:281-292`).
- Time grid day column: `role="group"` with aria-label `{date} schedule` (`:296-299`).
- Month cells: plain `div onclick` with svelte-ignore (`EventMonthGrid.svelte:89-99`). Keyboard users use the day button (`:90`).
- Month cell grid: `role="presentation"` with pointer handlers (`EventMonthGrid.svelte:78`).
- All-day cell: `div role="group"` with `onclick` (`EventAllDayLane.svelte:65-74`, svelte-ignore `:66`).
- All-day lane cells container: `role="presentation"` (`EventAllDayLane.svelte:60`).
- Tablist: `role="tablist"` with `tabindex="-1"` and `onkeydown` (`EventCalendarHeader.svelte:99-105`). Tabs `role="tab"` with `aria-selected` and roving tabindex (`:108-121`). No `aria-controls`, no `tabpanel` anywhere in the area (grep).
- Attention section: `<section aria-label="Needs attention">` (`EventCalendarNeedsAttention.svelte:67`). Issue lists are `<ul>` of buttons.
- Color radiogroup: `role="radiogroup"` with `role="radio"` buttons and `aria-checked` (`EventColorSwatches.svelte:39-56`). The Event form's visible "Color" label is a plain `<span>` (`EventForm.svelte:160`), not a `<label>`.
- Event form labels: `<label for>` used for all fields (`EventForm.svelte:64-166`). Switch linked through `id` (`:102-109`).
- Shortcuts table has no header row or caption (`EventShortcutsDialog.svelte:17-32`).
- Alerts: `role="alert"` on the load error (`EventCalendarView.svelte:243`) and form error (`EventForm.svelte:180`). No `aria-live` region in the area (grep).
- Calendar root has `aria-label="Calendar"` (`EventCalendarView.svelte:233`).

Focus-visible styles
- Custom buttons with `focus-visible:ring-2 focus-visible:ring-ring`: `EventAllDayLane.svelte:78`, `:93`; `EventBlock.svelte:75`; `EventColorSwatches.svelte:49`; `EventDailyNoteButton.svelte:30`; `EventDayHeaders.svelte` (`focus-visible:bg-muted` only, `:29`, not ring); `EventMonthGrid.svelte:104`, `:125`, `:145`; `ShowInCalendarButton.svelte:67`; `EventTaskChip.svelte:27`.
- `EventWeekStrip.svelte:40` uses `outline-none focus-visible:bg-muted` (background change only, no ring).
- `EventCalendarHeader.svelte` tab buttons (`:116-117`) and icon buttons have no focus class of their own (rely on shadcn Button for icon buttons; tabs use UA default).
- No focus-visible class at all: `EventCalendarNeedsAttention.svelte` (buttons `:44-52`, `:88-95`, `:104-112`), `CalendarNavigator.svelte` (all buttons, `:97-160`), `CalendarGrid.svelte` (`:30-36`, `:56-63`), `EventTimeGrid.svelte` body and axis (no interactive children).
- `EventCalendarNeedsAttention.svelte` and `CalendarNavigator.svelte` set `cursor-default` on buttons (`CalendarNavigator.svelte:97-160`).

Other a11y facts
- Escape-to-close on popover and dialog via bits-ui (no custom code).
- `aria-keyshortcuts` on header buttons and tabs (`EventCalendarHeader.svelte:87`, `:114`).
- Time axis labels `aria-hidden` (`EventTimeGrid.svelte:272`). Now line `aria-hidden` (`:320-326`).
- Drag ghost `aria-hidden` (`EventTimeGrid.svelte:314`).
- Task chips use `aria-label` that mixes description, status and file (`EventTaskChip.svelte:29`).

## 5. Styling facts

Raw color values
- No hex, rgb, or hsl literals in any `.svelte` or `.ts` file in the three folders (grep).
- Event colors defined in `app.css:403-414` as `color-mix(in oklab, #hex 25%/30%, ...)` for green, purple, cyan, orange, pink, blue. Used via `var(--event-{color}-fg)` (`EventPopover.svelte:165`, `EventColorSwatches.svelte:52`) and `eventColorStyle` (not read).
- Component token references: `--primary` (`EventCalendarView.svelte:277`, `:287`, `EventTimeGrid.svelte:327-328`), `--border`, `--muted`, `--destructive`, `--ring`, `--input`, `--editor-bg`, `--input-bg` (`EventForm.svelte:171`), `--divider` (`CalendarNavigator.svelte:89`, `:154`), `--rail-header-pad` (`:88`), `--nav-bg`, `--tab-bar`, `--tab-text-active`, `--file-explorer-*` (`CalendarNavigator.svelte` and `CalendarGrid.svelte`).
- Two token families coexist: shadcn tokens (`primary`, `muted`, `border`) inside the Calendar view, and `file-explorer-*` / `nav-bg` tokens in the rail navigator. `CalendarGrid.svelte:60` mixes both (`text-primary-foreground` with `bg-file-explorer-primary`).
- `text-meta` custom token (12px, `app.css:94`) used at `EventCalendarHeader.svelte:39` and `EventCalendarSection.svelte:247`.
- `section-label` utility (`app.css:140`) used in `CalendarNavigator.svelte:142`, `EventCalendarSection.svelte:117`, `:215`, `:255`.
- `pane-toolbar` utility (`app.css:151`) used at `EventCalendarHeader.svelte:35`. `CalendarNavigator.svelte:88` uses its own `h-10` header instead.

Hard-coded font sizes (arbitrary values)
- `text-[11px]`: `EventAllDayLane.svelte:55` ("All day" label), `EventBlock.svelte:90` (`@max-[84px]:text-[11px]`), `EventBlock.svelte:108` (time line), `EventBlock.svelte:110` (snippet), `EventBlock.svelte:113` (narrow title, with `leading-[13px]`), `EventTaskLane.svelte:31` ("Tasks" label), `EventTimeGrid.svelte:275` (hour labels), `EventTimeGrid.svelte:312` (create ghost), `EventWeekStrip.svelte:47` (weekday).
- `text-[13px]`: `CalendarGrid.svelte:57` (day numbers).
- Named tokens and Tailwind scale otherwise: `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-meta`.
- `text-[11px]` appears 9 times in the three folders. No other arbitrary font sizes.

Inline styles (all occurrences)
- `EventTaskLane.svelte:29` (height).
- `EventColorSwatches.svelte:52` (background var).
- `EventTimeGrid.svelte:244` (`--axis`), `:249` (min-width), `:265` (height), `:268` (hour line top), `:276` (hour label top), `:313` (ghost top and height), `:323` (now line top).
- `EventAllDayLane.svelte:53` (height), `:81` (`eventColorStyle`).
- `EventMonthGrid.svelte:67` (grid columns), `:77` (grid template rows and columns), `:129` (`eventColorStyle`).
- `EventPopover.svelte:165` (dot background var).
- `CalendarNavigator.svelte:89` (`box-shadow` inset divider).
- Event block: `EventBlock.svelte:44-54` builds one long style string: `top`, `height` (min 14px), `left` and `width` calc, `z-index: 10 + min(column, 9)`, `--lines`.

Z-index values
- Class-based: `z-10` (`EventAllDayLane.svelte:54`, `EventDayHeaders.svelte:22`, `EventTaskLane.svelte:30`, `EventTimeGrid.svelte:240` is the scroller with `isolate`, see below), `z-20` (`EventTimeGrid.svelte:312` ghost, `:322` now line), `z-30` (`:272` time axis), `z-40` (`:252` sticky header, also the comment on `:240` says the grid layers are z-10..z-40 under `isolate`).
- `EventTimeGrid.svelte:240` `isolate` on the scroller, with comment stating it keeps layers below app overlays (Settings is z-40).
- Dynamic: `EventBlock.svelte:51` `z-index: 10 + min(column, 9)`, so block z-index is 10 to 19. `MAX_Z_COLUMN = 9` (`:35`).

Spacing and sizes (hard-coded)
- Time grid: `AXIS_PX = 56` (`EventTimeGrid.svelte:38`), `HOUR_HEIGHT` and `MIN_COLUMN_PX` from `event-calendar-layout.logic.ts`.
- Block thresholds: `COMPACT_PX = 44`, `TWO_LINE_TITLE_PX = 60`, `SNIPPET_PX = 56`, `MIN_BLOCK_PX = 14`, `NARROW_LINE_PX = 13` (`EventBlock.svelte:25-33`).
- Chip heights differ by surface: month chip `h-[22px]` (`EventMonthGrid.svelte:125`), month task chip `h-[22px]` (`:140`), all-day chip `h-7` = 28px (`EventAllDayLane.svelte:78`, `CHIP_HEIGHT = 28` `:19`), task lane chip `h-6` = 24px (`EventTaskLane.svelte:42`, `CHIP_HEIGHT = 24` `:16`).
- Header heights: month weekday row `h-10` (`EventMonthGrid.svelte:67`), day headers `h-12` (`EventDayHeaders.svelte:21`), week strip `h-16` (`EventWeekStrip.svelte:29`) plus day buttons `h-12` (`:40`), toolbar `pane-toolbar` = `h-10` (`app.css:151-153`), rail header `h-10` (`CalendarNavigator.svelte:88`).
- Popover width `w-[300px]` (`EventPopover.svelte:157`), `max-w-[calc(100vw-24px)]`. Dialogs `sm:max-w-[440px]` (`EventDialog.svelte:192`, `EventShortcutsDialog.svelte:12`).
- Settings: `w-44` selects and inputs (`EventCalendarSection.svelte:126`, `:145`, `:203`, `:262`) and `w-24` number inputs (`:161`, `:219`).
- Textarea: `min-h-16` (`EventForm.svelte:171`).
- Rail mini calendar: `h-7` day cells, `h-6` weekday row, `gap-y-0.5`, `w-6` week column (`CalendarGrid.svelte:31`, `:45`, `:57`).
- Rail dot indicators: `w-1 h-1` (`CalendarGrid.svelte:68`).
- Icons: `size-3.5`, `size-4`, `size-3`, `size-6` buttons, `size-8` popover buttons (`EventPopover.svelte:185`).

Custom CSS
- Only one `<style>` in the area: `EventCalendarView.svelte:268-290`. Defines `:global([data-event-calendar] [data-event-pulse])` animation and `@keyframes -global-event-calendar-pulse` (3px ring, `box-shadow`) and a reduced-motion override (`:284-288`).
- No separate `.css` files in the three folders.

Transitions and animation
- Pulse animation: CSS `1.4s ease-out 1` (`EventCalendarView.svelte:271`). JS `PULSE_MS = 1600` (`:148`) to remove the attribute. Comment says 1600 is the animation plus slack.
- Reduced motion: only the pulse has an override (`EventCalendarView.svelte:284-288`, replaces the animation with a 2px outline). Other transitions are not gated.
- Other transitions use Tailwind defaults with no explicit duration: `transition-colors` (`EventCalendarHeader.svelte:116`, `CalendarNavigator.svelte:98-154`, `CalendarGrid.svelte:31`, `:57`), `transition-[color,box-shadow]` (`EventForm.svelte:171`).
- `hover:brightness-110` on chips and blocks (no transition duration set).
- No `@keyframes` other than the pulse.

Dark mode
- Area uses token classes only; no `dark:` variants in the three folders (grep not run for `dark:`; no literal colors found, so no theme-specific overrides).

## 6. Copy (user-visible strings)

Case and style
- Sentence case: "Open daily note" (`EventDailyNoteButton.svelte:32`), "Show in Calendar" (`ShowInCalendarButton.svelte:68-69`), "Open note" (`EventPopover.svelte:183`), "Open note after creating" (`EventDialog.svelte:203`).
- Title case: "Open Event type" (`EventCalendarSection.svelte:252`), "Open Calendar tab" (`CalendarNavigator.svelte:159`), "Daily Note" tooltip in the unused `plugins/periodic-notes/DailyNoteButton.svelte:22`, rail header label "Daily note" (`calendar-rail.service.ts:38`).
- Mixed phrasing of the same action: "Open or create the {period} note" (`CalendarNavigator.svelte:147`), "Open or create this day's daily note" (`calendar-rail.service.ts:39`), "Open weekly note (W{n})" (`CalendarGrid.svelte:33`), "Open the Calendar tab on the picked day" (`CalendarNavigator.svelte:156`).
- Keyboard help label casing: "Keyboard shortcuts (?)" tooltip (`EventCalendarHeader.svelte:95`), "Show keyboard shortcuts" (`event-calendar-keys.logic.ts:66`), dialog title "Keyboard shortcuts" (`EventShortcutsDialog.svelte:14`).
- Settings section headings are sentence case: "Display", "New events", "Event type" (`EventCalendarSection.svelte:117`, `:215`, `:255`), with page heading "Calendar" (`:115`).

Terminology
- "event" vs "note": load error "Could not load events" (`EventCalendarView.svelte:244`) vs toast "Could not load calendar events" (`:140`) vs "Could not load tasks" (`:212`).
- "Could not save the note" (`event-calendar.service.ts:1400`), "The note was moved or deleted outside the calendar" (`:1401`), vs "Event was moved or renamed outside the calendar; cannot undo" (`:1516-1521` range, undo text object).
- "Event changed since; not undone" (`event-calendar.service.ts` undo text) vs "Event changed since; not redone".
- "This note is no longer a calendar event" (`ShowInCalendarButton.svelte:54`).
- "Event duplicated" toast (`event-calendar.service.ts:1501`).
- Undo and redo toasts: "Undone: {label}", "Redone: {label}", "Nothing to undo", "Nothing to redo", "Redo" / "Undo" action labels (`event-calendar.service.ts:1507-1522`).
- "Open note" toast action (`event-calendar.service.ts:1420`, `:1583`) and "Open note" button (`EventPopover.svelte:183`, `EventDialog.svelte:216`).
- Errors: "Could not open the daily note" (`EventDailyNoteButton.svelte:19`), "Could not open the Calendar" (`ShowInCalendarButton.svelte:57`), "Could not open the {label} note" (`CalendarNavigator.svelte:71`), "Could not create the \"{name}\" type" (`EventCalendarSection.svelte:107`).

Units, dates and numbers
- Weekday short labels: uppercase "SUN MON TUE WED THU FRI SAT" (`event-calendar-dates.logic.ts:40`, `calendar.logic.ts:7`). Settings option labels are title case "Monday", "Sunday" (`EventCalendarSection.svelte:24-27`).
- Ranges in settings helper text use en dash and parentheses: "(0–12)" (`EventCalendarSection.svelte:158`), "(15–480, in steps of 15)" (`:218`).
- Ellipsis: "Indexing vault..." uses three ASCII dots (`EventCalendarView.svelte:241`).
- Emoji in settings copy: "Show tasks with a due date (📅) on their day in every view" (`EventCalendarSection.svelte:184`).
- Archived footer: "{n} archived event(s) shown|hidden" with "Show"/"Hide" link (`EventCalendarNeedsAttention.svelte:102-113`).
- Unscheduled: summary "Unscheduled ({n})" (`:82`) vs button "{n} unscheduled" (`:94`), in two different components of the same state.
- Attention badge: "{n} event(s) need(s) attention" (`:72`).
- Issue reasons, developer-facing wording: "all_day is not true or false", "end_date is not YYYY-MM-DD", "{detail} is not a valid time (HH:mm)", "end is not after start", "end_date is before date", "{detail} has a trailing # comment", hints "date is not YYYY-MM-DD", "add `date:` (and `start` / `end` for a timed event)" (`EventCalendarNeedsAttention.svelte:17-39`). Uses YAML key names and code formatting in the UI text.

Long-form copy
- Settings type-name help is long: "Notes of this type appear on the calendar. If you rename the type in the Types navigator, enter its new name here." (`EventCalendarSection.svelte:258-260`). Other helper texts are one short line.
- Timing lock banner: "This event has an end date or crosses midnight. Change its date and time in the note." (`EventForm.svelte:79-81`).
- Shortcut help intro: "These work while the Calendar has focus, not while you type in a field." (`EventShortcutsDialog.svelte:15`).
- Shortcut table wording: "Delete the event in the open popover, or the focused event", "Close the event popover, or cancel a drag" (`event-calendar-keys.logic.ts:62-63`), "Previous / next day, week or month" (`:61`). Keys written as "Left", "Right", "Cmd+Z", "Ctrl+Y".

Other labels
- Dialog titles: "New event", "Edit event" (`EventDialog.svelte:194`).
- Form labels: "Title", "Date", "All day", "Start", "End", "Location", "Color", "Notes" (`EventForm.svelte`).
- Footer and popover actions: "Edit", "Open note", "Duplicate" (title and aria), "Delete" (title) with aria "Delete event" and "Duplicate event" (`EventPopover.svelte:182-188`, `EventDialog.svelte:210-216`).
- Settings labels: "Week starts on", "Time format", "Day starts at", "Show weekends", "Show dated tasks", "Default view", "Default duration", "Default color", "New events go to", "Folder and template", "Type name" (`EventCalendarSection.svelte`).
- "Event type" name in settings described as "Type name" with the input showing the type name.
- Today button "Today" (`EventCalendarHeader.svelte:43`) and "Go to today" tooltip in rail (`CalendarNavigator.svelte:116`).
- Rail: "Periodic notes" section heading (`CalendarNavigator.svelte:142`), "Calendar" (`:92`), "Open Calendar tab" (`:159`).
- Tasks lane label "Tasks" (`EventTaskLane.svelte:31`), aria "Tasks due" (`:37`). All-day label "All day" (`EventAllDayLane.svelte:55`), aria "All-day events" (`:70`).
- Aria "{n} more items, open day view" (`EventMonthGrid.svelte:146`), "+{n} more" text. All-day overflow "+{n}" text, aria "{n} more all-day events, open day view" (`EventAllDayLane.svelte:94-98`). Two patterns for overflow ("+N more" vs "+N").
- Week view previous and next aria built from unit (`EventCalendarHeader.svelte:52`, `:69`), e.g. "Previous week". Rail uses "Previous month" / "Previous year" (`CalendarNavigator.svelte:100-130`).
- Stale comment: `EventAllDayLane.svelte:67` refers to a palette command "New Calendar Event" (not verified against the command registry in this scout).

## 7. Other notable facts

- `event-calendar-keys.logic.ts` comment ties shortcuts to `help/documentation/20-keyboard-shortcuts.md` and `27-calendar.md` (not read).
- Header `pane-toolbar` and the rail header share the 40px height but are built differently.
- `CalendarNavigator` drops the saved day when "Go to today" is clicked (`CalendarNavigator.svelte:61-65`).
- Rail weekly and day actions use `console.error` (`CalendarNavigator.svelte:70`, `:81`), in conflict with the project rule to use `debug`/`error` from `#lib/utils/debug.js` (CLAUDE.md, Frontend logging).
- `EventCalendarView.svelte` and `EventTimeGrid.svelte` use `$effect` with `untrack` (project rule followed).
- No `title`-based or `aria-describedby` tooltips for task chips beyond `title` plus `aria-label` (`EventTaskChip.svelte:28-29`).

## 8. Not checked

- `event-calendar-event.logic.ts` (`eventColorStyle`) and `event-calendar-layout.logic.ts` (`HOUR_HEIGHT`, `MIN_COLUMN_PX`) were not read; values quoted from their call sites only.
- `dark:` variants, shadcn `ui/` internals (Dialog close button, Popover focus trap), and `app/SettingsPanel.svelte` surroundings were not read.
- Palette command names and `help/documentation` files were not read.
- No browser run; all facts come from source reading and grep.
