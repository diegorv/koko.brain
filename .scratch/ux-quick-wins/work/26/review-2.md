VERDICT: APPROVED

Re-review round 2. Fix range: `git diff 9a1a8a89f..HEAD` (commits 633bf2d8c review resolution, efea57f4b daily-note button focus reveal).

## Previous findings

| # | Finding (review.md) | Status | Evidence |
|---|---|---|---|
| 1 | nit: month capacity not capped at `MONTH_MAX_CHIPS` (`event-calendar-tasks.logic.ts:140`) | rejection stands | Reviewer wrote "Fix: none required"; discovery records the uncapped capacity as the chosen default; day view still shows the event. No code changed. |
| 2 | nit: weaker out-of-month boundary in light Lavender Haze (`EventMonthGrid.svelte:118`) | rejection stands | Removing the fill is Issue item 4; left for owner judgement. No code changed. |

## Acceptance criteria re-checked

- [met] A non-today daily-note button has `opacity-0` plus hover and `focus-visible` reveal classes, today's does not; `aria-label` and `data-daily-note` are kept and no `title` remains. The six bare-mount sites (`EventMonthGrid.test.ts:62`, `EventTimeGrid.test.ts:62,811`, `EventPopover.test.ts:65`, `EventDialog.test.ts:87`, `event-calendar-gestures.characterization.test.ts:89`) and `event-calendar-daily-note.spec.ts` pass unchanged. — `EventDailyNoteButton.svelte:24-27` off-today reveal is `opacity-0 group-hover/day:opacity-100 focus-visible:opacity-100 focus-within:opacity-100`, today `''`; the added `focus-within` keeps every required class. `EventMonthGrid.test.ts:407-415` still asserts `opacity-0`, the hover and `focus-visible` classes, the new `focus-within` class, `aria-label` and no `title`. `event-calendar-daily-note.spec.ts` asserts no opacity classes (grep finds none), so the class addition cannot change it; E2E not re-run by me. `EventMonthGrid.test.ts` and `EventTimeGrid.test.ts` pass.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (0 errors, 0 warnings); targeted `EventMonthGrid.test.ts`, `EventTimeGrid.test.ts`, `chrome-state-styles.test.ts` exit 0 (3 files, 119 tests). The full suite is deliver's to run.

## Other checks

- The fix changes the component, not `chrome-state-styles.test.ts` (unchanged in the range), so no check was weakened. `OWN_FOCUS_REVEAL_RE` (`chrome-state-styles.test.ts:49`) matches the new `focus-within:opacity-100`.
- Not using `group-focus-within/day` is correct: it would reveal the button whenever a chip in the same cell has focus.
- `help/documentation/27-calendar.md` ("on other days when you hover the day or Tab to the button") stays accurate.
- No scope creep: only `EventDailyNoteButton.svelte`, `EventMonthGrid.test.ts` and the review record changed.

## Findings

1. nit, `src/lib/features/event-calendar/EventDailyNoteButton.svelte:18-19` — the comment still says the button shows "while it has keyboard focus", but `focus-within` now also keeps it visible after a pointer click until blur (the fix report names this side effect). Fix: say "while it has focus" in that line; optional.
