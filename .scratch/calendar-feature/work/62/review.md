VERDICT: APPROVED

# 62 review: app shortcuts work while a Calendar pointer gesture is live

Reviewed `git diff main...HEAD` at 6b249b86 (commits 98986754, c1c85523, 6b249b86).

## Acceptance criteria

- [x] **A test that a document-level listener still sees Cmd+S mid-gesture (fails today).** Met.
  - Time grid: `EventTimeGrid.test.ts` "lets every key but Escape reach the app's document shortcuts while a gesture is live" (Cmd+S, Cmd+P, Cmd+Shift+C, `d`, Delete reach a `document` listener; Cmd+S is not `defaultPrevented`).
  - Month grid: `EventMonthGrid.test.ts` "Escape mid-drag puts the chip back and writes nothing; only Escape is kept from the document" (the old "keeps keys from the view" assertion was changed as the Issue requires).
  - All-day lane: `EventAllDayLane.test.ts` "lets Cmd+S reach the document mid-drag ...".
  - Red-first verified by a probe: with main's `EventTimeGrid.svelte`, `event-calendar-day-drag.svelte.ts` and `EventBlock.svelte` checked out over the branch, these three tests plus the `EventCalendarView` one fail (4 failed / 140 passed); all pass after the files were restored.
- [x] **Escape still cancels the gesture; view shortcuts still do not fire mid-gesture.** Met.
  - Escape: the capture listeners keep only Escape (`EventTimeGrid.svelte:121-126`, `event-calendar-day-drag.svelte.ts:143-148`: stopPropagation, preventDefault, discard). Tests: `EventTimeGrid.test.ts` "Escape discards the gesture without reaching the document, and clears the live flag"; the month-grid Escape test above (chip back, no write, Escape `defaultPrevented`, not seen by the document).
  - View shortcuts: `resolveCalendarKey` returns null while `gestureLive` (`event-calendar-keys.logic.ts:100`), wired in `EventCalendarView.svelte:53`; this covers both the root `onkeydown` and the `<body>` fallback listener, which call the same `handleKeydown`. Tests: `event-calendar-keys.logic.test.ts` "maps nothing while a pointer gesture is live, chords included"; `EventCalendarView.test.ts` "keeps the view shortcuts from firing mid-gesture ..." (`m`, ArrowRight, Cmd+Z do nothing on the mounted view, the document still sees them, `m` works after release). A probe that removed only the `gestureLive` guard from `resolveCalendarKey` and the `EventBlock` guard turned 3 tests red (logic, view, Enter-on-block).
- [x] **Both controllers covered** (Issue body, Issue 59 finding 2): the time grid and `DayDrag` (month grid, all-day lane) both set and clear the flag and both keep only Escape.

## CLAUDE.md and design checks

- Layer rules: all changes stay in `features/event-calendar`; `.logic.ts` gains a plain boolean field, no framework import. OK.
- Store pattern: `gestureLive` is `$state` with a getter, a setter and `reset()` coverage; the getter is tested (`event-calendar-view.store.test.ts`). JSDoc on the state, getter, setter and the new `CalendarKeyState` field. OK.
- Cross-controller isolation: each `endGesture` clears the flag only when its own gesture was live (`EventTimeGrid.svelte:96`, `event-calendar-day-drag.svelte.ts:94`), so the press-start `endGesture()` and the unmount/`reset` paths of one surface cannot clear another surface's live gesture. Unmount clears it (`onMount` cleanup returns `endGesture`; `DayDrag.reset` on unmount in `EventMonthGrid.svelte:36`, `EventAllDayLane.svelte:38`), so Cmd+W / Cmd+Shift+C closing the tab mid-gesture leaves no stale flag (tested for the time grid and the all-day lane).
- Reactivity: the flag is only read inside event handlers, never in a template, `$derived` or `$effect`, so setting it per press re-renders nothing. The write from the `daysKey` effect goes through `untrack`. OK.
- Orphans: `MODIFIER_KEYS` removed from both files, now unused. OK.
- Keys that now pass mid-gesture: the only non-view `keydown` handlers in the feature are `EventBlock` (guarded), `EventColorSwatches` (inside the modal dialog, which cannot be open under a grid press) and the header tablist (focus leaves it on a grid press; if it fired anyway, the day change discards the gesture through the `daysKey` effect). Every `registerKeybinding` in `global-keybindings.ts` is chorded, so no bare key acts app-wide.
- E2E: `event-calendar.spec.ts:652` ("week step mid-drag") relies on a focused button's Enter default action, which neither the old nor the new listener prevents. It is unaffected.
- Scope: no creep. The diff is the flag, the two listeners, the view guard and the `EventBlock` guard the old window stop used to shield.

## Findings

1. **Low (follow-up, no change needed here)**: `EventTimeGrid.svelte:121-126` and `event-calendar-day-drag.svelte.ts:143-148`. Mid-gesture, Cmd+P / Cmd+O can now open the command palette or the quick switcher. While the press is held, the first Escape goes to the gesture's capture listener (stopped and default-prevented), so it discards the drag and does not close the overlay. Under the time grid's pointer capture (or `DayDrag`'s window listeners) the release can still open the create dialog or the popover behind the overlay. This needs keys during a held press and is far better than today's dead shortcuts. Fix: if it ever matters, discard the gesture when focus leaves the calendar root (`focusout`), as its own Issue.
2. **Low (test gap, optional)**: no test checks that `gestureLive` clears on the time grid's `pointercancel` / `lostpointercapture` or on `DayDrag`'s `pointercancel`. Both go through the same `discardGesture` / `#discard` -> `endGesture` path as Escape, which is tested, so the risk is small. Fix: one assertion each in `EventTimeGrid.test.ts` and `EventMonthGrid.test.ts`.
3. **Nit**: `.scratch/calendar-feature/work/62/discovery.md` Plan step 1 and the Tests section say `closeTransient()` clears `gestureLive`. The implementation leaves `closeTransient` alone, which is correct because the unmount paths already clear the flag. The Issue's implement comment records the change, but discovery.md does not. Fix: one line in discovery.md, or leave it as is.
4. **Nit (history, no action)**: in commit 98986754 the Files range for discovery.md says 1-48, but the file has 44 lines. Commit c1c85523 has `Co-Authored-By` twice. Do not rewrite history for this.

## Test verdict rests on

Run by the reviewer in the worktree:

- `pnpm check`: 211 files, 0 errors, 0 warnings.
- `vitest run` on `EventTimeGrid.test.ts`, `EventMonthGrid.test.ts`, `EventAllDayLane.test.ts`, `EventCalendarView.test.ts`, `event-calendar-keys.logic.test.ts` and `event-calendar-view.store.test.ts`: 6 files, 214 passed.
- `vitest run src/tests/lib/features/event-calendar/`: 24 files, 941 passed.
- Red probes (files restored afterwards, worktree clean): main's controllers + `EventBlock` gave 4 failed; the branch without the `resolveCalendarKey` and `EventBlock` guards gave 3 failed.

The full gate and `pnpm build` were not run (deliver runs them).
