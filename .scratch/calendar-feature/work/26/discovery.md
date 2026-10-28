# 26 discovery: read-only event popover and selected-event ring

Template: issue 23 (`work/23/discovery.md`): same store-driven components, test setup (real stores, `openFileInEditor` mock, `event()` / `seed()`) and E2E helpers. Only the differences are listed.

## Pre-flight re-check
- `pnpm-lock.yaml:1270` still resolves `bits-ui@2.19.5`, the Task 1 (g) baseline, so the Task 1 (a) answer stands: `customAnchor` (string | HTMLElement | Measurable) passes through `popover-content.svelte` `restProps`; `onOpenAutoFocus` / `onCloseAutoFocus` exist. No Pre-flight log edit.
- bits-ui floating content defaults to `strategy = "fixed"` (`floating-layer-content.svelte:22`), so no `Popover.Portal`.

## Files that change
- New `src/lib/features/event-calendar/EventPopover.svelte`: `Popover.Root` (open = `popover !== null` and the event is in `eventCalendarStore.events`) + `Popover.Content` with `customAnchor` = `{ getBoundingClientRect: () => DOMRect.fromRect(rect) }`, `side="right" align="start" sideOffset={8}`, `onOpenAutoFocus` prevented. Prop `root` (the view `<section>`).
- `EventCalendarView.svelte:63-83`: `bind:this` on the section, mount `<EventPopover {root} />`.
- `EventBlock.svelte:49-67`, `EventMonthGrid.svelte:84-96`, `EventAllDayLane.svelte:46-55`: click (and Enter/Space on the block) calls `eventCalendarViewStore.openPopover(path, el.getBoundingClientRect())` instead of `openFileInEditor`; `ring-2 ring-primary/70` while `selectedEventPath === path`.
- New `src/tests/lib/features/event-calendar/EventPopover.test.ts`; `EventTimeGrid.test.ts:178-188, 281-291`, `EventMonthGrid.test.ts:183-190` switch from "opens the note" to "opens the popover".
- `e2e/specs/event-calendar.spec.ts`: click block, popover title, "Open note" opens the tab, back to Calendar shows no popover.

## Plan (one feat commit, the ticket asks for one)
- Content: color dot (`var(--event-<color>-fg)`), title, `formatWeekday, formatLong` date line, `formatTimeRange · formatDuration` or "All day", location with `map-pin` icon, snippet, footer `Button size="sm"` "Open note" (`closePopover()` then `openFileInEditor(path)`). Marked `data-event-popover`.
- Close: `onOpenChange(false)` -> `closePopover()` (Escape, outside click); capture-phase `scroll` listener on `root` (catches the time-grid scroller; scrolls inside the card ignored); `<svelte:window onresize>`; view/date change already close in the store.
- Focus: `onCloseAutoFocus` prevented; the last opened path is kept locally; focus goes to `root.querySelector('[data-event-path="' + CSS.escape(path) + '"]')`, else `root`, when `root` is still connected ("Open note" unmounts the view).

## Defaults / risks
- Focus is always redirected on close, as the spec says. The focus trap pulls any focus that leaves the block into the card, so a "keep focus on the control the user moved to" rule would never fire; a mouse click on a header button still ends on that button in Chromium, since its default focus runs after the close.
- `trapFocus` stays on (bits default): Tab from the focused block lands in the card.
- A click on another block first closes (outside interaction), then opens the new target: one popover at a time.
- The snippet is clamped to 4 lines; the card is `w-[300px] max-w-[calc(100vw-24px)]`, `p-0`.
