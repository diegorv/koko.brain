# 74 discovery: time grid click swallow eats only its own release's click

Template: `DayDrag` (`event-calendar-day-drag.svelte.ts:33-149`, issues 59/67): `#arm` / `#disarm` / `#clickOutside` / `#discard(armOnRelease)` / `#releaseAfterDiscard`, and the `detail === 0` exemption in `clickcapture`. Differences below.

## Files that change
- `src/lib/features/event-calendar/EventTimeGrid.svelte`
  - `:57-59` `swallowClick` doc; `:86-89` unmount also disarms (window listeners).
  - `:110-118` `discardGesture(armOnRelease)`: no longer sets `swallowClick`; with `armOnRelease` adds a window capture `pointerup` that arms on the release still to come.
  - `:125-142` Escape and focus leaving pass `true`; `:245-247` `pointercancel` / `lostpointercapture` pass `false`; `:237-243` the days-change effect passes `true` (button may still be down).
  - `:149-150` press calls `disarm()`; `:194-199` release calls `arm()` (every release, not only moved ones: a plain press opens the dialog or popover from `pointerup`, so its click must still be swallowed).
  - `:249-254` `handleClickCapture` lets `detail === 0` through.
  - `arm` adds window capture `pointerdown` -> `disarm` and `click` -> disarm when the target is outside `bodyEl`.
- `src/tests/lib/features/event-calendar/EventTimeGrid.test.ts`: new describe "click swallow after a gesture".

## Plan (test-first)
1. Red tests: `pointercancel` (and `lostpointercapture`) mid-move, then a `detail: 0` click on a block opens its popover; same with `detail: 1` and no press.
2. Guards that must stay green: a moved block's release click (`detail: 1`) is swallowed; Escape mid-gesture, then release, then `detail: 1` click is swallowed; a plain press's release click does not re-trigger anything.
3. Extra: after a moved drop whose click lands outside the body, a later no-press click on a block acts (the `#clickOutside` case); a press anywhere disarms.

## Prior-art tests to copy
- `EventMonthGrid.test.ts:640-698` (AT click after drop / pointercancel / stray pointerup / press anywhere).
- `EventTimeGrid.test.ts:550-634` (`mountSized`, `pointer` helpers).

## Risks / defaults
- With pointer capture the release click lands on the body (inside `bodyEl`), so `clickOutside` does not disarm it. After an Escape discard the capture is released, so the click may land outside and disarm: harmless, nothing to swallow then.
- Lost capture with the button still down arms nothing, so its release click can act; the Issue asks for exactly this (cancel/lost capture arm nothing).
- No E2E spec: the unit tests drive the real component and stores.
