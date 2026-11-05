# 62 discovery: app shortcuts work while a Calendar pointer gesture is live

Anchors on main (2294a13d).

## Cause

Both gesture controllers add a `window` capture `keydown` listener for the gesture's life and call
`e.stopPropagation()` on every non-modifier key: `EventTimeGrid.svelte:119-128` (`handleGestureKeydown`,
added at `:159`) and `event-calendar-day-drag.svelte.ts:140-150` (`DayDrag.#keydown`, added at `:57`, used
by the month grid and the all-day lane). Window capture runs before the document listeners of
`core/keybindings/global-keybindings.ts` and `utils/keybindings.ts`, so Cmd+S/P/W and Cmd+Shift+C die.

## Plan

1. `event-calendar-view.store.svelte.ts`: `gestureLive` state + getter, `setGestureLive(live)`, cleared by
   `reset()` and `closeTransient()`. (Implemented without the `closeTransient()` clear: each surface's
   unmount path already clears the flag, so `closeTransient` stays untouched.)
2. `event-calendar-keys.logic.ts`: `CalendarKeyState.gestureLive`; `resolveCalendarKey` returns null for
   every key while it is set (after the typing/dialog guard). `EventCalendarView.svelte:handleKeydown`
   passes `eventCalendarViewStore.gestureLive`. View shortcuts are blocked here, not at window.
3. Both controllers: the capture listener handles only Escape (stopPropagation + preventDefault +
   discard); other keys pass untouched. Start sets `setGestureLive(true)`; `endGesture` sets it false only
   when a gesture was live (endGesture also runs at the start of every press and on unmount).
4. `EventBlock.svelte:55` Enter/Space popover handler returns while `gestureLive` (it was shielded by the
   window stop before; keeps a mid-drag Enter from opening the popover).

## Tests (prior art)

- `event-calendar-keys.logic.test.ts`: `state()` helper gains `gestureLive: false`; new case: every
  shortcut (letters, arrows, Delete, Escape with popover, Cmd+Z, Ctrl+Y, ?) resolves null mid-gesture.
- `event-calendar-view.store.test.ts`: getter, setter, reset clears it (not closeTransient, see Plan step 1).
- `EventTimeGrid.test.ts:415-480` "keys during a gesture": document listener now sees `d`, `Delete`,
  Cmd+S mid-gesture (failing first); `gestureLive` true mid-gesture, false after Escape/pointerup; Escape
  still stopped. Enter on a block mid-gesture opens no popover.
- `EventMonthGrid.test.ts:581` assertion changes: document sees `d` and Cmd+S mid-drag, not Escape.
- `EventAllDayLane.test.ts`: one case that Cmd+S reaches document mid-drag and `gestureLive` is set.
- `EventCalendarView.test.ts`: mid-gesture on the mounted view, `m` and Cmd+Z do nothing; after pointerup
  `m` switches view.

## Risks / defaults

- Bare keys now reach app-level document listeners mid-gesture; those are Cmd/Ctrl-chorded, so none acts.
- Header tablist arrows (`EventCalendarHeader.svelte:24`) are not guarded: a grid pointerdown moves focus
  out of the tablist, so they cannot be the key target mid-gesture.
- One boolean, not a counter: two simultaneous gestures (two pointers on two surfaces) are not supported.
