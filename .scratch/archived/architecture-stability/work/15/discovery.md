# Issue 15 discovery

## Files that change
- `src/lib/features/event-calendar/EventTimeGrid.svelte:45-312`: inline gesture/swallow lifecycle (`gesture`, `swallowClick`, `endGesture`, `discardGesture`, `armSwallow`, `disarmSwallow`, `handleClickOutside`, key/focus handlers, `handleClickCapture`) moves to the shared guard.
- `src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:29-206`: same lifecycle; `DayDrag` keeps its public API (`preview`, `pointerdown`, `clickcapture`, `reset`) and `#commit`, delegating the rest to the guard.
- New `src/lib/features/event-calendar/event-calendar-gesture-guard.ts`: `GestureGuard<G extends { pointerId }>` class (plain `.ts`, no runes): `begin`, `end`, `discard(armOnRelease)`, `arm`, `disarm`, `clickcapture`, `owns(e)`, `reset`, `gesture`. Options: `area()`, `onDiscard(gesture)`, `onEnd?()`.
- `src/lib/features/event-calendar/EventPopover.svelte:31-121`: close-focus decision moves to new `src/lib/features/event-calendar/event-calendar-focus.logic.ts` `focusReturnTarget(input): HTMLElement | null`.

## Plan
1. Characterization tests first, against the current code: new `event-calendar-gestures.characterization.test.ts` runs the five Issue scenarios (`describe.each`) against a mounted EventTimeGrid and a directly driven DayDrag. New `event-calendar-day-drag.test.ts` (direct DayDrag unit test: arm only when moved, commit/preview hold, reset, read-only chip). Both pass before the refactor; commit.
2. `GestureGuard` + `event-calendar-gesture-guard.test.ts` (test first), commit.
3. DayDrag on the guard (`onEnd` removes its window move/up/cancel listeners; `onDiscard` clears the preview; arms only when `drag.moved`). Commit.
4. EventTimeGrid on the guard (element handlers + pointer capture stay in the component; `onDiscard` clears the preview and releases capture; arms on every release; days-change `$effect` calls `guard.discard(true)`; `lostpointercapture` routes to the cancel handler as today). Commit.
5. `focusReturnTarget` table tests first, then the function, then EventPopover uses it. Commit.

## Real differences kept
- Arm policy is the caller's: time grid calls `guard.arm()` on every release, DayDrag only when `drag.moved`.
- Move/up/cancel wiring stays per site (element handlers + capture vs window listeners); only the guard's own listeners (keydown, focusin, swallow listeners) live in the guard.
- Discard order kept: end gesture, disarm, register arm-on-release listeners, then `onDiscard` (time grid: clear preview, release capture; DayDrag: clear preview).
- `EventPopover`: the reset of `handOffFocus` / `focusCopy` stays exactly as today (only the flag that decided is cleared).

## Prior-art tests to copy
- `EventTimeGrid.test.ts` "click swallow after a gesture", "keys during a gesture", "focus leaving" helpers (stubbed body rect, `pointer()`, `click(detail)`).
- `EventMonthGrid.test.ts` "drag to another day" (window move/up, `moveEventToDay` mock).
- `EventPopover.test.ts` "closing" for the focus cases.

## Risks
- Listener ordering: `begin` calls `end` first, which runs `onEnd`; DayDrag must add its window listeners after `begin`.
- `focusReturnTarget` reads `document.activeElement`: passed in as `activeElement` so the function stays pure.

## Defaults taken
- Shared guard is a class (not reducer + adapter): both copies are listener lifecycles, a reducer would only move the same state.
- E2E (`bash scripts/e2e.sh`) is the deliver step's gate, not run here.
