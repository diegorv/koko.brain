# 29: Create, duplicate and delete in the UI with toasts and palette entries

**What to build:** users can create, duplicate and delete events from the Calendar tab. The event dialog gains a create mode (required title, a notes textarea that becomes the note body, an optional "Open note after creating" checkbox); the edit dialog footer and the popover gain Duplicate and Delete; empty all-day lane space and empty month cells open create; and the command palette gains "New Calendar Event" and "Calendar: Go to Today". A delete shows an "Event deleted" toast that can bring the event back, a duplicate shows the copy's title, and keyboard focus always lands on a live element (the view root or the copy's block) so the calendar shortcuts keep working.

**Plan reference:** Task 28 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 663-684). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 27, 28

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/EventDialog.svelte` (modify)
- `src/lib/features/event-calendar/EventPopover.svelte` (modify)
- `src/lib/features/event-calendar/EventAllDayLane.svelte` (modify)
- `src/lib/features/event-calendar/EventMonthGrid.svelte` (modify)
- `src/lib/features/command-palette/command-palette.service.ts` (modify)
- `src/tests/lib/features/event-calendar/EventDialog.test.ts` (modify)
- `src/tests/lib/features/command-palette/command-palette.service.test.ts` (modify)
- `e2e/specs/event-calendar.spec.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts e2e/specs/command-palette.spec.ts`

- [ ] `EventDialog` create mode: the title is required, a notes `<textarea>` (styled like `ui/input`) becomes the body, and an optional "Open note after creating" checkbox is present
- [ ] The edit-mode footer has Delete and Duplicate icon buttons (prototype `event-dialog.tsx:178-203`); each runs its service call, closes the dialog and shows the same toast as the popover, and the popover gains Duplicate and Delete
- [ ] Focus after these actions: a delete (popover or footer) moves focus to the view root; a duplicate moves it to the copy's block once it renders, else the root; toast action handlers focus the root after they finish
- [ ] Toasts: "Event deleted" with an Undo action that calls `undoDeleteEvent`, or the text "Event deleted. Press Cmd+Z to undo." when ticket 01 records pre-flight answer (b) as a "no"; "Event duplicated" with the copy's title (prototype `app-store.ts:261, 271`)
- [ ] Clicking empty all-day lane space opens create in all-day mode, and double-clicking an empty month cell opens create at `dayStartHour`, not the hard-coded 09:00 of `month-view.tsx:83`
- [ ] Palette entries `event-calendar:new-event` "New Calendar Event" (opens the tab and the dialog at `defaultCreateSlot`) and `event-calendar:today` "Calendar: Go to Today" exist; in `command-palette.service.test.ts` the count goes from 27 to 29, and the new-event command's real run leaves the tab active with the dialog open
- [ ] `EventDialog.test.ts`: a create submit makes the pending create visible; the footer Delete shows the toast text through the mocked `svelte-sonner`, closes the dialog, and leaves `document.activeElement` on the view root
- [ ] E2E: create via the dialog; the block renders, the note's frontmatter holds `_type: Event`, `date` and `start`, and the note sits in the folder `createNoteOfType` would use
- [ ] E2E: delete, then Undo; the block is gone, then back with `data-pending="false"` after the refresh
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 14:52 — discovery — plan in work/29/discovery.md: dialog create mode, footer and popover Delete/Duplicate via shared service flows, lane/month create, two palette entries — 02e742a7
- 2026-10-28 15:00 — implement — create mode, footer and popover Delete/Duplicate with toasts, lane/month create, two palette entries; pnpm check 0 errors, vitest event-calendar + command-palette 665 passed, e2e event-calendar 16 passed (1 pre-existing DST now-line flaky, passed on retry), e2e command-palette 3 passed; full gate not run — a6296fec
- 2026-10-28 15:05 — review — CHANGES_REQUESTED: new E2E delete/Undo test races the Trash move and failed twice (gate red); create error path untested; 4 lows in work/29/review.md — a408b70a
- 2026-10-28 15:09 — fix — all 6 review findings fixed (E2E race, create failure tests, openNewEventDialog, toast description, live Undo root, folder note); pnpm check 0 errors, vitest event-calendar + command-palette 670 passed, e2e event-calendar + command-palette 19 passed — pending
