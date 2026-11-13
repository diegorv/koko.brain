# 31 discovery: view-scoped keyboard, global toggle and undo feedback

## Files that change

- `src/lib/features/event-calendar/event-calendar-keys.logic.ts` (new): `isTypingTarget`, `resolveCalendarKey(e, state)` returning a `CalendarKeyAction | null`. `state` = `{ typing, dialogOpen, targetInTablist, popoverPath, focusedEventPath }`, all computed by the view from the store (`isDialogOpen`, `selectedEventPath`) and `e.target.closest(...)`.
- `src/lib/features/event-calendar/EventCalendarView.svelte:24-64, 67`: root `onkeydown={handleKeydown}`, `root.focus()` in `onMount`, a `document` keydown `$effect` forwarding only `e.target === document.body`.
- `src/lib/features/event-calendar/event-calendar.service.ts:251-260, 840-905, 990-1047`: not in Touches. `EventChangeResult` gains `path?` (set on `refused`, for "Open note"); new `undoEventChangeFromUi(root)` / `redoEventChangeFromUi(root)` own the feedback toasts, so the view keys and the palette commands share them (same home as `deleteEventFromUi`).
- `src/lib/core/keybindings/keybindings.logic.ts:94-115`: export `TOGGLE_CALENDAR_KEYBINDING` (Cmd+Shift+C) and a "Toggle Calendar" reserved entry.
- `src/lib/core/keybindings/global-keybindings.ts:94-101`: register Cmd+Shift+C after Cmd+Shift+T, yielding to `cycleSidebarView`.
- `src/lib/features/command-palette/command-palette.service.ts:149-156`: `shortcut` on `event-calendar:toggle`; new `event-calendar:undo` / `event-calendar:redo` ("Calendar: Undo" / "Calendar: Redo", no shortcut, 29 -> 31).
- Tests: the five in Touches plus `event-calendar.service.test.ts` (3 refused assertions gain `path`, new `*FromUi` cases); E2E `event-calendar.spec.ts`.

## Plan

1. Keys logic + test (pure). 2. Service feedback functions + test. 3. View wiring + `EventCalendarView.test.ts`. 4. Global toggle, reserved entry, palette (tests first, C10). 5. E2E.
- Keys: T today, D/W/M views, ArrowLeft/Right step (null in the tablist), N `openNewEventDialog`, Delete/Backspace `deleteEventFromUi(popoverPath ?? focusedEventPath)` then focus root, Escape closes the popover (null when none, so the grid's live-gesture window listener still cancels a drag), Meta+Z undo, Meta+Shift+Z and Ctrl+Y redo. Any action is `preventDefault`ed; null leaves the event alone.
- Typing target or open dialog: every key returns null (not only letters), so Cmd+Z in an input keeps native undo. Letters and arrows also return null with Meta, Ctrl or Alt held.

## Prior art

- Toast + root focus: `deleteEventFromUi` and its service tests (`toastAction()` helper, `event-calendar.service.test.ts:1649-1700`). View harness: `EventCalendarView.test.ts` popover block. Handler capture: `findHandler` in `global-keybindings.test.ts`.

## Risks

- `registerKeybinding` handlers get no event, so the yield uses `keybindingsEqual(settingsStore.keybindings.cycleSidebarView, TOGGLE_CALENDAR_KEYBINDING)`. Equivalent to `matchesKeybinding(e, cycle)` here: the handler only runs when `e` matched Cmd+Shift+C exactly, and both helpers lowercase the key and compare every modifier. Avoids changing `utils/keybindings.ts`.
- The body fallback and the root handler never both run: a key on the root has `target !== body`.

## Defaults for open questions

- Task 1 (b) is yes (actions on). Task 1 (e): Cmd+Shift+C, keys kept and palette Undo / Redo added.
- Redo refusal / vanished texts mirror undo: "Event changed since; not redone", "...; cannot redo". Delete is offered on read-only blocks too (the popover does the same).
- Palette Undo / Redo do not open the tab; their toast actions still focus the root when mounted.
