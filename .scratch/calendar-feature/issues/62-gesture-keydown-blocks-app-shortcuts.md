# 62: App shortcuts work while a Calendar pointer gesture is live

**What to build:** Cmd+S, Cmd+P, Cmd+W and the Cmd+Shift+C toggle keep working between pointerdown and pointerup on the Calendar time grid.

**Blocked by:** None

**Status:** ready-for-agent

- From the ticket 31 post-merge review (finding 1): `EventTimeGrid.svelte:124-125` calls `e.stopPropagation()` on every non-modifier key from a `window` capture listener (`:158`) while a gesture is live, which runs before `global-keybindings.ts:40` and `utils/keybindings.ts:32`. From pointerdown to pointerup on the grid (a plain click included) every app shortcut is dead.
- Fix as the review suggests: stop the key only in the view's own shortcut handler, behind a "gesture live" flag.
- The month grid and the all-day lane share the same defect (Issue 59 review, finding 2): `event-calendar-day-drag.svelte.ts` (`DayDrag.#keydown`) stops every non-modifier key from its own `window` capture listener while a day drag is live, and `EventMonthGrid.test.ts` ("Escape mid-drag puts the chip back, writes nothing and keeps keys from the view") asserts that a document listener does not see keys mid-drag. The fix and its test must cover both controllers, and that assertion changes with it.

- [ ] A test that a document-level listener still sees Cmd+S mid-gesture (fails today)
- [ ] Escape still cancels the gesture; view shortcuts still do not fire mid-gesture

## Comments

- 2026-10-28 21:12 — discovery — store flag `gestureLive` blocks view shortcuts in `resolveCalendarKey`; window capture listeners keep only Escape — (this commit)
