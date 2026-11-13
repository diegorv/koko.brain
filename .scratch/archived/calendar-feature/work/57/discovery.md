# 57 discovery: Calendar keyboard shortcuts help dialog

## Files that change

- `src/lib/features/event-calendar/event-calendar-keys.logic.ts:10-18,64-89`: there is no key table today, only the `resolveCalendarKey` branches. Add an exported `CALENDAR_SHORTCUTS` table (key chords as the help pages write them, label, action kind), a `{ kind: 'help' }` action and the `?` branch.
- `src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:30,76-78,130-134,158-164`: `helpOpen` state with `openHelp()` / `closeHelp()`; `isDialogOpen` also covers it (it only gates the shortcuts); `closeTransient` and `reset` clear it.
- `src/lib/features/event-calendar/EventCalendarView.svelte:55-84,170-171`: `help` case calls `openHelp()`; mount the new dialog.
- `src/lib/features/event-calendar/EventCalendarHeader.svelte:34-73`: a "Keyboard shortcuts" icon button (`aria-keyshortcuts="?"`) with tooltip, next to prev/next.
- New `src/lib/features/event-calendar/EventShortcutsDialog.svelte`: bits-ui `Dialog` rendering `CALENDAR_SHORTCUTS` as a table of `<kbd>` chords and labels.
- `help/documentation/20-keyboard-shortcuts.md:60-73` and `27-calendar.md:171-185`: add the `?` row (a new shortcut, not a third copy).

## Plan

1. Logic (test-first): table + `help` action. Tests in `event-calendar-keys.logic.test.ts`:
   - every row's chords, parsed into a key event, resolve to that row's action;
   - every `CalendarKeyAction['kind']` has a row (exhaustive `Record` keyed by kind, so `pnpm check` fails on a new kind);
   - every chord appears backticked in the Calendar section of both help pages (read with `node:fs`).
2. Store: `helpOpen` / `openHelp` / `closeHelp`, cleared by `closeTransient` / `reset`; store test.
3. UI: dialog + header button + `?` wiring. `EventCalendarView.test.ts`: `?` opens it, every chord of the table is rendered, Escape closes and returns focus to the root; header button opens it and Escape returns focus to the button; letters do nothing while it is open.

## Prior art

Ticket 31 (`work/31`) for the key table and its tests; `EventCalendarView.test.ts` "popover" / "keyboard" blocks for the bits-ui Escape + focus assertions (`settlePopover`).

## Risks

- bits-ui restores focus to the element focused before open when the dialog has no trigger; if that does not hold in jsdom, use `onCloseAutoFocus` with the remembered element.
- `?` needs Shift on most layouts; the resolver does not check Shift for bare keys, so `?` works with it held.

## Defaults taken

- Key: `?`. Button: lucide `Keyboard` icon, icon-sm ghost, in the prev/next group.
- Escape row in the dialog keeps the help pages' wording ("or cancel a drag"), since the drag's own listener handles it.
