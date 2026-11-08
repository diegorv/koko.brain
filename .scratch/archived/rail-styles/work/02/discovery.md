# Issue 02 discovery: resizable width saved in `layout.railWidth`

Builds on `.scratch/rail-styles/work/01`. Only the width changes; the labeled form's classes stay.

## Files that change (read on d8dd546d5)

- `src/lib/features/rail-shell/rail-items.logic.ts:142-143`: `RAIL_WIDTH` gets `min: 140`, `max: 320`; new `parseRailWidth` using `#lib/utils/clamp.js`.
- `src/lib/core/settings/settings.store.svelte.ts:61`: `railWidth: 192`. `src/lib/core/settings/settings.types.ts:88`: field with the "loaded unvalidated" JSDoc.
- `src/lib/features/rail-shell/Rail.svelte:161`: frame width from `dragWidth ?? parseRailWidth(...)`; `Rail.svelte:210`: handle after the edge, in the frame; script: start, move, end, block; `<svelte:window ondragstart>`.
- `src/lib/app/AppShell.svelte:39,186`: `railHeaderPad(parseRailWidth(settingsStore.layout.railWidth))`; `RAIL_WIDTH` import goes.
- Tests: `rail-items.logic.test.ts:181`, `settings.logic.test.ts:278`, `settings.store.test.ts:150`, `Rail.test.ts:183`, `AppShell.test.ts:326`, `e2e/specs/rail-styles.spec.ts`.

## Store chain

`updateLayout({ railWidth })` writes `settingsStore.layout`; readers: `Rail.svelte` (frame) and `AppShell.svelte` (pad). `settings-persistence.svelte.ts` picks it up with every other key. No computed getter involved.

## Plan

1. `parseRailWidth`, `RAIL_WIDTH` bounds, the setting and `mergeLayout` tests, test-first.
2. `Rail.svelte` handle and drag, test-first in `Rail.test.ts` (stub `setPointerCapture`, real store).
3. `AppShell` pad through `parseRailWidth`. A saved `"wide"` gives `NaNpx` and a saved `10` gives `110px` without the parse, so the test has teeth even though 140-320 always pads 12.
4. E2E in `rail-styles.spec.ts`; run `bash scripts/e2e.sh e2e/specs/rail-styles.spec.ts e2e/specs/sidebars.spec.ts`. Remove the guards once to confirm the row test fails without them.

## Prior art

- Handle and handlers: `git show scratch/testes:src/lib/features/rail-shell/RailPrototypeVariant.svelte` lines 123-148, 323-336.
- E2E helper: `dragRailTo` in `git show scratch/testes:e2e/specs/prototype-rail.spec.ts:45`. The prototype has no note-row test; this one is new.
- Pointer events in jsdom: `src/tests/lib/features/event-calendar/event-calendar-day-drag.test.ts:45-51`. `restartWithSettings`, `savedFile`: `e2e/specs/rail-shell.spec.ts:50,58` (not exported, so a small copy in the spec).

## Risks

- The note-row test only proves anything if a row really sits under the pressed point at the end, so it asserts that with `elementsFromPoint`.
- Checked by removing code, in Chromium: both guards gone, the rail stops at about 299 px and the row test fails. Only the `dragstart` block, or only the handle's `mousedown` `preventDefault`, and it passes. So the E2E guards the pair, and `Rail.test.ts` pins each one.
- Header text at 140 and 320 reuses `headerStart`.

## Defaults taken

- A press with no move writes nothing: `dragWidth` stays null until the first move, so a plain click or each half of a double-click saves no extra value.
- `pointercancel` saves the last shown width, as the Issue says.
- The handle has no focus ring classes: the Issue lists its classes, and it is not a tab stop.
- `help/documentation/19-settings.md` is left to Issue 05, which owns the docs.
