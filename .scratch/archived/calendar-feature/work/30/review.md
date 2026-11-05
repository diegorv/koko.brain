VERDICT: CHANGES_REQUESTED

# 30 review: pointer create, move and resize in the time grid

Reviewed `git diff main...HEAD` (3279f5b1, 14df9dbf, bb71ea98) against Issue 30, plan Task 29 (`plan-2026-10-28.md:685-703`), the prototype (`calender-app-design/src/components/calendar/time-grid.tsx:225-380, 582-587`) and CLAUDE.md.

## Checks I ran

- `pnpm check`: 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/event-calendar/`: 16 files, 630 passed. The verdict rests on `event-calendar-drag.logic.test.ts` (new `previewDayEvents` block), `EventTimeGrid.test.ts` (new resize-handle test) and `event-calendar.service.test.ts:671-748` (the move/resize rollback the component relies on).
- `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts --retries=0`: 21 passed, 1 run. The pointer verdicts rest on the `Event calendar pointer drag` group (`e2e/specs/event-calendar.spec.ts:479-578`).
- Full gate not run (deliver owns it).

## Acceptance criteria

- [x] **Body handlers wired to the drag logic; hit-test only at pointerdown; read-only skipped.** Met. `EventTimeGrid.svelte:278-288` binds `bodyEl` with all five handlers. `closest('[data-event-path]')` and `closest('[data-resize]')` run only in `handlePointerDown` (`:132`, `:140`). A `data-readonly` block returns before any gesture (`:133`), so its `onclick` popover is kept. `EventBlock.svelte:106-109` renders `data-resize` only when `!event.readOnly`, covered by `EventTimeGrid.test.ts:137-149`.
- [x] **Capture on the bound body.** Met: `body.setPointerCapture?.(e.pointerId)` at `:148`, where `body = bodyEl`.
- [x] **Preview in `$state.raw`; only source and target columns re-laid out.** Met. `preview` and `dragged` are `$state.raw` (`:60-62`). `columns` (`:69-74`) keeps the `baseColumns` reference for any column where `previewDayEvents` returns `null`. The source/target/neither/resize/create cases are tested in `event-calendar-drag.logic.test.ts` (`previewDayEvents` block).
- [~] **One write per gesture; ghost held until the promise resolves; failure reverts and toasts.** Code met, test not met. `handlePointerUp` calls `commitDrop` once on `result.kind === 'move'` (`:177-180`). `commitDrop` (`:199-207`) awaits `resizeEvent`/`moveEvent`, toasts through `toastEventError` on failure, and clears the preview only if it is still the same drag. The service drops the pending overlay before it rethrows (`event-calendar.service.ts` `writeEvent` catch, tested at `event-calendar.service.test.ts:703-711`), so the revert happens behind the held preview with no snap-back. The one-write rule and the hold are covered by the E2E move/resize cases. The component's failure-and-toast branch has no test; see finding 1.
- [x] **Unmoved click or drag-create opens the dialog prefilled; nothing written until Save.** Met. `:183-184` opens `openDialog({ mode: 'create', ...payload })` with no service call. The E2E at `:534-561` checks the click range (13:00-14:00), the drag range (13:00-15:00), that the ghost is gone and that the block count is unchanged.
- [x] **Escape and `pointercancel` discard; mouse and pen only.** Met. `:130` filters pointer types. `handleGestureKeydown` (`:115-120`, window capture, only while a gesture is live) and `handlePointerCancel` (pointercancel and lostpointercapture) both call `discardGesture`. The E2E at `:563-577` checks the discard on screen and that the file bytes are unchanged.
- [x] **Logic tests extended; no jsdom pointer smoke test (ticket 01 (f)).** Met: 7 new `previewDayEvents` tests. `EventTimeGrid.test.ts` gets only the DOM test for the handle.
- [x] **E2E with `page.mouse`.** Met. Covered: one hour down (label plus `start`, `end`, `date`, and no popover), one column right (next column plus `date: 2026-11-11`), resize (`end`), and empty-space click and drag (dialog range). Escape is an extra case.
- [ ] **Gate green; one commit in the full format.** Pending: deliver runs the gate. Commit 14df9dbf has Context, Problem, Solution, Behavior, Files with line ranges, and the trailer.

Scope: the two changes outside Touches are both justified and documented. `EventBlock.svelte` gets the handle the hit-test needs, matching prototype `time-grid.tsx:582-587`. The DST E2E test waits for the daily-note tab, a flake fix forced by the new tests. Layering is fine: the new code is in `features/event-calendar`, and `previewDayEvents` is pure with no framework imports. User-facing errors go through a toast, not `console.error`.

## Findings

1. **Medium. The failed-write path of a drop has no automated test.** At `EventTimeGrid.svelte:199-207`, the criterion "a failure reverts and toasts" rests on code reading alone. The build report says no E2E can inject a write failure, but the frontmatter writer has a deterministic, TS-side refusal: a YAML comment in the frontmatter makes `updateNoteFrontmatter` throw `FrontmatterWriteError('comments')` (`properties.logic.ts:242`, already used in `event-calendar.service.test.ts:713-726`). The E2E mock runs that code.
   **Fix:** add an E2E to the pointer-drag group:
   - Write Standup with `# keep me` inside its frontmatter through `window.__e2e.fs.writeFile`, then open the grid.
   - Drag the block one hour down.
   - Assert that a toast with the refusal message and an "Open note" action appears, that the block's `[data-event-time]` returns to `09:00 – 10:00` with `data-pending="false"`, and that the file bytes are unchanged.
2. **Low. A held preview is keyed by column index, not by day.** At `EventTimeGrid.svelte:69-74` and `event-calendar-drag.logic.ts:236-238`, `previewDayEvents` places the dragged event in column `drag.day` of whatever `days` currently is. The grid is not remounted on a week step: `EventCalendarView.svelte:81` keys only on `view`. If `days` changes while a gesture is live, or while a drop is held waiting on a slow or queued write, a phantom copy of the event renders in column `drag.day` of the new week until the write settles. The change can come from the toolbar, the palette's Go to Today, or a hide-weekends or week-start setting change. `resolveDrag` also guards only against an out-of-range index, so a live drop after such a change writes into the new week's day.
   **Fix:** clear `preview`/`dragged` and discard any live gesture when `days` changes. Do it in an `$effect` on `days` with an `untrack`ed body, or hold the target day key with the drop and compare it in `columns`.
3. **Nit. The `as PendingEventNote[]` cast is unneeded.** At `EventTimeGrid.svelte:71`, `previewDayEvents` is generic, so calling it with `T = EventNote` type-checks: `dragged` is a `PendingEventNote`, which extends `EventNote`. That removes the cast, which hides the `EventNote` element type `groupEventsByDay` returns.
   **Fix:** drop the cast, or keep it with a comment saying why.

Not a finding, by design: an empty-space click while a popover is open both dismisses the popover and opens the create dialog. The prototype does the same (`time-grid.tsx:346-356`, no popover check).

## Resolution

All three findings accepted and fixed in the fix-and-deliver step.

1. Added the E2E `a refused drop reverts the block and toasts with "Open note"`: Standup gets a `# keep me` frontmatter comment through `window.__e2e.fs.writeFile`, a one-hour drag down shows the comments refusal toast with its "Open note" action, the block is back at `09:00 – 10:00` with `data-pending="false"`, and the file bytes are unchanged.
2. `EventTimeGrid.svelte` now discards the live gesture and clears the preview when the visible range changes (an `$effect` on `days.join(',')`, so a fresh array for the same days does not drop a held drop). A held drop's write still settles; `commitDrop` only clears a preview that is still its own. New E2E `a week step mid-drag discards the move`: it fails on the pre-fix code (the phantom copy shows in the new week) and passes with the fix.
3. Dropped the `as PendingEventNote[]` cast.
