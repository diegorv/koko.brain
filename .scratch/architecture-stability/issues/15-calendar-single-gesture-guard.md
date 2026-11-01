# 15: One pointer-gesture guard and one focus-return rule for the Calendar

**What to build:** Two extractions, with no behaviour change:
- **Pointer gestures.** The discard / arm-on-release / click-swallow lifecycle exists twice today: inline in `EventTimeGrid.svelte:44-312`, and in `DayDrag` (`event-calendar-day-drag.svelte.ts:25-212`, the class without `#commit`). Bugs have been fixed in each copy separately. Move it into one class, or one pure reducer plus a thin listener adapter, and have both sites use it.
- **Real differences the shared guard must keep:** the time grid arms the swallow on every release, DayDrag only when `drag.moved`; the time grid uses pointer capture, `lostpointercapture` and element handlers, DayDrag uses window listeners; the time grid also discards from a days-change `$effect`.
- **Popover focus.** Move the close-focus decision out of `EventPopover.svelte:31-115` into a pure function in a `.logic.ts` file. Its input must include what the decision reads today: the clicked element, the view root, `handOffFocus`, `focusCopy`, `lastPath` and the block lookup.

**Blocked by:** none

**Status:** needs-triage

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh`

**Source:** `EventTimeGrid.svelte:44-312`, `event-calendar-day-drag.svelte.ts:25-212`, `EventPopover.svelte:31-115`; commits c637bc4e, 7642e85c (the same bug, once per copy), fb68a2d1, 5632bb89, a323dfff, e5124b78, a0d17897, dc8d6ad7, 699269c2, 22478edf; open issue `.scratch/calendar-feature/issues/77-*.md`

- [ ] Characterization tests are written FIRST against the two current implementations, and then pass unchanged against the shared guard:
  - Escape discard swallows only its own release click
  - a lost release (pointercancel, or release outside the window) does not arm a later swallow
  - a click with detail 0 (keyboard or assistive tech) is never swallowed
  - focus leaving mid-gesture discards it
  - app shortcuts pass through a live gesture
- [ ] `focusReturnTarget` table tests:
  - a native control is kept
  - a roving tabindex="-1" tab is kept
  - a tabindex="-1" wrapper inside this view returns focus to the block
  - a tabindex="-1" surface in another pane is left alone
- [ ] `DayDrag`, or whatever replaces it, gets a direct unit test file
- [ ] EventTimeGrid and DayDrag share one implementation. The existing EventTimeGrid, EventMonthGrid and EventAllDayLane tests and the E2E specs pass unedited

## Notes

- **Why:** the popover focus return has been fixed 3 times. Calendar issue 77 (focus lands on the original block after Duplicate, root cause unknown) is out of scope: this extraction does not fix it.
- **Review:** this touches gesture code. If issue 01 picks option B, it gets the post-delivery adversarial review.
- **Size:** M.
