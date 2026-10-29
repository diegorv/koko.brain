# 74: Do not let the time grid's click swallow eat a later keyboard or AT click

**What to build:** the time grid's post-gesture click swallow eats only the click its own release produces. A `pointercancel` (or lost capture) arms nothing, and a keyboard (`detail === 0`) or assistive-tech click (`detail >= 1`, no press) on a block or day still acts.

**Status:** ready-for-agent

- Found by the review of issue 67 (`.scratch/calendar-feature/work/67/review.md`, finding 3). Same class of bug as ticket 59, which issue 67 fixed for `DayDrag` (`event-calendar-day-drag.svelte.ts`: `#arm` / `#disarm` / `#clickOutside`, `#discard(armOnRelease)`).
- `discardGesture` (`EventTimeGrid.svelte:110-117`) sets `swallowClick = true` on Escape, `pointercancel` and lost capture. A cancelled pointer produces no click, so the flag stays set until the next press in the grid resets it (`:137`).
- `handleClickCapture` (`:236-240`) has no `detail === 0` exemption, so a keyboard Enter or Space on a block after a cancelled gesture is eaten too.
- Suggested fix: mirror `DayDrag`: arm on the release (not on cancel), disarm on any press anywhere or a click outside the grid, and let `detail === 0` clicks pass.

- [ ] A test fails today: `pointercancel` mid-gesture, then a `detail: 0` click on a block, does not open its popover
- [ ] A test fails today: `pointercancel` mid-gesture, then a `detail: 1` click with no press on a block, does not open its popover
- [ ] After the fix both open the popover, and the click after a moved block or an Escape-discarded gesture is still swallowed

## Comments

- 2026-10-28 21:56 — discovery — mirror DayDrag's arm/disarm in EventTimeGrid; plan in work/74/discovery.md — f5671033
- 2026-10-28 21:57 — implement — EventTimeGrid mirrors DayDrag arm/disarm, detail 0 passes; pnpm check 0 errors, event-calendar vitest 983/983 — a323dfff
- 2026-10-28 22:01 — review — VERDICT: APPROVED; AC met (8 new tests red on main), 3 low test gaps (days-change arm, unmount cleanup, every-release arm) + 2 info in work/74/review.md — be003422
- 2026-10-28 22:03 — fix — review findings 1-3 covered by three tests (each mutant from review.md now fails), 4-5 no action; EventTimeGrid.test 56/56, pnpm check 0 errors — fcb861bc
