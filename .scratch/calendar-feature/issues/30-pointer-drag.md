# 30: Pointer create, move and resize in the time grid

**What to build:** in week and day view the user can drag on empty grid space to create an event (an unmoved click or a drag opens the dialog prefilled, and nothing is written until Save), drag a block to move it, including into another day column, and drag its resize handle to change its end. Each gesture writes at most once, on pointerup, through the write service; the dropped block holds its position until the write resolves so it never snaps back; a failed write reverts with a toast; Escape and `pointercancel` discard the gesture; read-only blocks are not draggable. Mouse and pen only.

**Plan reference:** Task 29 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 685-703). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 09, 29

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/EventTimeGrid.svelte` (modify)
- `src/tests/lib/features/event-calendar/event-calendar-drag.logic.test.ts` (modify)
- `src/tests/lib/features/event-calendar/EventTimeGrid.test.ts` (modify)
- `e2e/specs/event-calendar.spec.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts`

- [ ] The `EventTimeGrid.svelte` body handlers (`onpointerdown`, `onpointermove`, `onpointerup`, `onpointercancel`, `onlostpointercapture`) are wired to `event-calendar-drag.logic.ts` (`beginCreate` / `beginMove` / `beginResize`, `updateDrag`, `resolveDrag`); `closest('[data-event-path]')` and `[data-resize]` are hit-tested only at pointerdown, and `data-readonly` blocks are skipped
- [ ] Pointer capture is taken with `bodyEl.setPointerCapture?.(e.pointerId)` on the bound body element, not on `e.target`
- [ ] The live preview is kept in component `$state.raw`, and only the source and target columns are re-laid out during a drag
- [ ] On pointerup, `moveEvent` / `resizeEvent` is called once per gesture when `resolveDrag` says so; the ghost stays at the drop position until the promise resolves, then the pending overlay takes over; a failure reverts and toasts
- [ ] An unmoved click on empty space, or a drag-create, opens the dialog prefilled, and nothing is written until Save
- [ ] Escape and `pointercancel` discard the drag; only mouse and pen pointers start a gesture
- [ ] `event-calendar-drag.logic.test.ts` is extended with any edge cases found; the drag tests stay logic-only (plus the E2E below): ticket 01 recorded pre-flight answer (f) as jsdom 30.1.3 implementing `PointerEvent` but not `Element.setPointerCapture`, so `EventTimeGrid.test.ts` gets no pointer smoke test
- [ ] E2E (`page.mouse`): dragging a block one hour down updates its label and the frontmatter `start`; dragging a block one column right renders it in the next day column and the note's `date:` equals the next day; a resize updates `end`; a drag on empty space opens the dialog with the dragged range
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)
