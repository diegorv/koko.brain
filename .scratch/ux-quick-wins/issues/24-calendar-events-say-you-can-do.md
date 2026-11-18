# 24: Calendar events say what you can do; the new-event form opens without an error

**Origin:** design review 2026-11-17, proposals P129, P182 and P91 (part), prototype `.scratch/design-review/prototypes/calendar-tasks.html` (sections `P129`, `P182`) and `.scratch/design-review/prototypes/feedback-components.html` (section `P91`), research `.scratch/ux-quick-wins/research/verdict-calendar-tasks.md`, `verdict-feedback-a.md` and `breakdown.md` (old ticket 43). Absorbs open-itens 217 (`.scratch/open-itens/issues/217-new-event-dialog-shows-enter-title-only.md`, already marked wontfix with a pointer here).

**What to build:**

1. **Mouse group in the shortcuts dialog.** A new `CALENDAR_GESTURES` constant in `src/lib/features/event-calendar/event-calendar-keys.logic.ts` (next to `CALENDAR_SHORTCUTS`, `:57-67`): one row per gesture with a label and the views it applies to. The gestures are the ones the code already supports: click an empty spot or drag a range on the time grid (new event), click an empty spot in the All day lane (new all-day event), double-click an empty part of a month cell (new event), drag a block to another time or day, drag a block's bottom edge to change its length, drag a month or all-day chip to another day. `EventShortcutsDialog.svelte:17-32` renders it under its own "Mouse" heading, because its description at `:15` talks about keys only. `CALENDAR_SHORTCUTS` and its doc-tie tests stay untouched.
2. **Doc 27.** The creation table in `help/documentation/27-calendar.md:46-61` gains the two rows the code already supports and the doc lacks: dragging a month chip to another day (`EventMonthGrid.svelte:22`, tests `EventMonthGrid.test.ts:502,530`) and dragging an all-day chip (`EventAllDayLane.svelte:27`).
3. **Read-only events say so.** A read-only event (an end date or a block that crosses midnight, `event-calendar-event.logic.ts:222`) gets a decorative lock icon (`aria-hidden`), `cursor-default`, ", read-only" at the end of its accessible name, and a caption in the popover that reuses the sentence at `EventForm.svelte:78-82` ("This event has an end date or crosses midnight. Change its date and time in the note."). Sites: `EventBlock.svelte:72-87` (name from `label` at `:43`), the month chip `EventMonthGrid.svelte:123-137`, the all-day chip `EventAllDayLane.svelte:76-88`, `EventPopover.svelte:165-180`. Chips have no `aria-label` today (their name is their text): add an `sr-only` ", read-only" suffix there.
4. **New-event form opens clean.** `EventForm.svelte` gets `titleTouched`, set by the title input and by blur. `aria-invalid`, `aria-describedby` and the message paragraph (`:69-75`) use `titleTouched && errors.title`. `valid` and the disabled Save keep reading the full `errors`. Placeholder "Event title"; the message uses `text-meta`. `validateDraft` and `event-calendar-form.logic.ts` do not change. The form remounts per dialog session, so the flag resets on its own.

Not in this ticket: the hover hint on empty month cells (P129 remainder); resize handles (read-only blocks already have none, `EventBlock.svelte:118`); the date and time messages (they start valid).

**Size:** M (eight source files, a new constant, a dialog group, three components, the form). Split point: item 4 (`EventForm.svelte` only) first, then items 1 and 2 (constant, dialog, doc), then item 3 (the lock and name on the four components).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`; no E2E selector changes (E2E reads `data-readonly` only: `event-calendar-day-drag.spec.ts`, `event-calendar.spec.ts`)

- [ ] Failing test first, `src/tests/lib/features/event-calendar/EventPopover.test.ts`: the popover of a `readOnly` event shows `[data-popover-readonly]` with the sentence; a normal event does not.
- [ ] Failing test first, `src/tests/lib/features/event-calendar/EventDialog.test.ts` ("EventDialog: create"): opening create shows no `[data-error="title"]`, no `aria-invalid`, and Save is disabled; focusing then blurring the empty title shows "Enter a title." with `aria-invalid="true"` and `aria-describedby`; the placeholder is "Event title". The existing cases stay green: spaces (`:244-252`), a colon title and the edit-mode cases.
- [ ] `CALENDAR_GESTURES` is non-empty, every row has a label and a view scope and none repeats a `CALENDAR_SHORTCUTS` chord (`event-calendar-keys.logic.test.ts`); the dialog opened through `openHelp()` shows a "Mouse" heading and one row per gesture, and the key rows are unchanged.
- [ ] A doc tie: every gesture row has a matching row in the `27-calendar.md` creation table, the month chip drag included (same pattern as `event-calendar-keys.logic.test.ts:229-245`).
- [ ] A read-only month chip, all-day chip and time block contain the lock marker and their accessible name ends with "read-only"; a normal one has neither. `EventMonthGrid.test.ts:567` and `EventAllDayLane.test.ts:140-141` ("never drags it") pass unchanged.
- [ ] Tests use the real stores; nothing mocks `event-calendar-*.logic.ts`.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P129.** Event creation gestures are hidden: the shortcuts dialog lists keys only. Add a Mouse group. Validation: a separate constant, and doc 27 must list what the code does.
- **P182.** Multi-day read-only events look editable but ignore drags. Mark them: lock icon, default cursor, name and popover caption.
- **P91 (part).** Form validation fires on open, and error styles differ. Only the event form's title is in this ticket; the other dialogs' error styles are not.
- **open-itens 217.** The New event dialog shows "Enter a title." only after the title was touched. Same scope and criteria; its "`event-calendar-form.logic.test.ts` untouched" criterion is not carried (this ticket does not list that file).

## Problem

Nothing in the calendar says a day cell takes a double-click or that a block can be dragged, and a multi-day event looks as draggable as any other until a drag silently does nothing. The New event dialog opens with a red "Enter a title." and a red border before the person typed.

## Evidence

Checked at `085b23c5d`.

- `event-calendar-keys.logic.ts:57-67`: `CALENDAR_SHORTCUTS` has keys only. `EventShortcutsDialog.svelte:15,17-32`.
- `help/documentation/27-calendar.md:46-61`: the creation table has no month chip or all-day chip drag row.
- `readOnly: span` at `event-calendar-event.logic.ts:222`; `data-readonly` at `EventBlock.svelte:83`, `EventMonthGrid.svelte:132`, `EventAllDayLane.svelte:83`; the drag skip at `EventTimeGrid.svelte:125` and `event-calendar-day-drag.svelte.ts:57`.
- `EventForm.svelte:38` (`errors = $derived(validateDraft(draft))`, no touched gate) and `:67-75`; `event-calendar-form.logic.ts:104` starts a create draft with `title: ''`.
- Bare mounts of the grids in tests (`EventDialog.test.ts:87`, `EventPopover.test.ts:65`) mount no Tooltip provider: this ticket adds no tooltip, so they stay as they are.

## Sequence with

Ticket 25 and ticket 26 edit other lines of `help/documentation/27-calendar.md`; ticket 25 also edits `EventTimeGrid.test.ts`, and ticket 26 edits `EventMonthGrid.svelte` and `EventMonthGrid.test.ts`. Both are blocked by this ticket. Open-itens 065 and 140 concern the Collection calendar, not these files.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): this ticket had no owner question in the old breakdown.
