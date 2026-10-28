# 26: Read-only event popover and selected-event ring

**What to build:** clicking an event block in the week/day grid, a chip in the month view or a chip in the all-day lane (or pressing Enter or Space on a focused block) opens a read-only popover beside the event instead of opening the note directly, as the Task 21 slice did. The popover shows a color dot, the title, the time range with its duration (or "All day"), the location and the snippet, plus an "Open note" action. The selected event carries a `ring-2 ring-primary/70` ring. The popover is driven by `eventCalendarViewStore.popover`, closes on scroller scroll, window resize, view or date change and Escape, and on close returns focus to the clicked event (or to the view root when the event is gone) instead of leaving it on `<body>`.

**Plan reference:** Task 25 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 585-602). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 23

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/EventPopover.svelte` (new)
- `src/lib/features/event-calendar/EventBlock.svelte` (modify)
- `src/lib/features/event-calendar/EventMonthGrid.svelte` (modify)
- `src/lib/features/event-calendar/EventAllDayLane.svelte` (modify)
- `src/tests/lib/features/event-calendar/EventPopover.test.ts` (new)
- `e2e/specs/event-calendar.spec.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts`

- [ ] If the bits-ui version in `pnpm-lock.yaml` differs from the one Task 1 (g) recorded (kit-3 ticket `.scratch/sveltekit-3-migration/issues/02-bump-bits-ui-runed.md` bumps it), Task 1 (a) is re-run and Notes > Pre-flight log in `.scratch/calendar-feature/plan-2026-10-28.md` is updated in this commit; otherwise the anchor answer from ticket 01, which reaches this ticket through tickets 23, 22 and 21, is used as recorded
- [ ] `EventPopover.svelte` uses `Popover.Root` and `Popover.Content` from `$lib/components/ui/popover`, with the anchor prop confirmed in Task 1 (a) passed through `restProps`; bits-ui `Popover.Portal` is used only if clipping requires it, and `src/lib/components/ui/` stays unedited. If Task 1 (a) was a "no", a feature-local `position: fixed` card at the stored rect is used instead (Notes > Risks 4 (a))
- [ ] The popover is controlled by `eventCalendarViewStore.popover`, prevents `onOpenAutoFocus`, and uses `side="right" align="start" sideOffset={8}`
- [ ] `onCloseAutoFocus` is prevented and focus moves to `[data-event-path="<CSS.escape(path)>"]` inside the view root, or to the root when the block is gone (fallback if `onCloseAutoFocus` is missing: focus the block from the `onOpenChange(false)` callback after a `tick()`, Notes > Risks 4 (a))
- [ ] The popover closes on scroller scroll, window resize, view or date change, and Escape
- [ ] The popover shows a color dot, the title, `formatTimeRange` + `formatDuration` (or "All day"), the location and the snippet, plus an "Open note" action
- [ ] Blocks, month chips and lane chips (prototype `all-day-row.tsx:57`) open the popover, and Enter or Space on a focused block opens it too
- [ ] Each of the three renders `ring-2 ring-primary/70` while `eventCalendarViewStore.selectedEventPath === event.path`, and no other event carries it
- [ ] `EventPopover.test.ts` (mount) passes: a lane-chip click opens the popover with the event title; the clicked block carries the ring class and the others do not; Escape closes it and `document.activeElement` is then the clicked block
- [ ] `event-calendar.spec.ts` passes: clicking a block shows the popover with the title; "Open note" opens the note tab; switching back to the Calendar tab shows no popover
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 14:08 — discovery — plan in work/26/discovery.md: EventPopover (bits-ui customAnchor, fixed strategy, no portal) mounted in the view; blocks/chips open it and carry the ring; focus restored only when lost; bits-ui unchanged at 2.19.5 — pending
- 2026-10-28 14:18 — implement — EventPopover + ring on blocks/month chips/lane chips; check 0 errors, event-calendar vitest 517/517, event-calendar E2E 10/11 with the pre-existing DST now-line test flaky under parallel load (3/3 alone); new popover E2E 4/4 repeated — f7ac87e4
- 2026-10-28 14:24 — review — CHANGES_REQUESTED: quick click on another event opens nothing (bits-ui 10 ms dismiss race), outside clicks leave focus on body or steal it, stale target reopens a vanished event, EventCalendarView test not updated — 2fa1a2b5
- 2026-10-28 14:28 — fix — all 4 review findings fixed (retarget on another event, focus follows an outside click, stale target cleared, view-level tests); event-calendar vitest 534/534, popover E2E 1/1 — pending
