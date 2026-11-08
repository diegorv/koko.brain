# 11: The New event dialog shows "Enter a title." only after the title was touched

**What to build:** Opening the New event dialog shows the red "Enter a title." message and a red title border before the user has typed anything, because `EventForm.svelte` derives `errors` from the draft on every render (about line 38) and a create draft starts with `title: ''` (`event-calendar-form.logic.ts` about line 104). Gate the title message on a touched flag in `src/lib/features/event-calendar/EventForm.svelte`:

- add `let titleTouched = $state(false);`, set to `true` by the title `Input`'s `oninput` (about line 68) and by a new `onblur`
- `aria-invalid`, `aria-describedby` (about lines 69-70) and the `{#if errors.title}` paragraph (about line 73) use `titleTouched && errors.title`
- `valid` and the disabled Save button (about line 187) keep reading the full `errors`, so Save stays disabled for an empty title
- `validateDraft` in `event-calendar-form.logic.ts` does not change (its tests pin the message)

The date and time messages are not gated: their fields start filled and valid, so they only appear after an edit already.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first, in `src/tests/lib/features/event-calendar/EventDialog.test.ts` under "EventDialog: create": after `openCreate()`, the title error is absent, the title field has no `aria-invalid`, and Save is disabled. It fails on the current code
- [ ] A second new case: focusing the empty title and blurring it (no typing) shows "Enter a title." with `aria-invalid="true"` and `aria-describedby` pointing at the message
- [ ] Existing cases stay green unchanged: "shows an empty-title message" (types spaces), "accepts a title with a colon", and the edit-mode cases (an edit draft has a title, so no message on open; clearing it still shows the message)
- [ ] `event-calendar-form.logic.test.ts` is untouched and green

## Notes

- **Source:** review-2026-11-04.md "Overlays and modals" row "Form and picker inconsistencies" ("validation after touch") and section 2 "Overlay anatomy" ("validation after first input or submit").
- **Why blur, not submit:** Save is disabled while invalid, so a submit attempt never fires for an empty title; blur covers the user who tabs past the field.
- **Remount:** the form remounts per dialog session (`{#key session}` in `EventDialog.svelte`), so `titleTouched` resets on each open with no extra code.
- **Out of scope:** native checkbox and date inputs in the event dialog (review ticket 6).
- **Size:** S.

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/217-new-event-dialog-shows-enter-title-only.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
