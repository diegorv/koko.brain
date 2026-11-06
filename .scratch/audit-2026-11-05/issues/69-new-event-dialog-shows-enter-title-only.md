# 69: The New event dialog shows "Enter a title." only after the title was touched

**Migrated from:** `.scratch/ux-polish/issues/11-event-title-error-after-touch.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Still present. It is error-timing fine-tuning in a flow the owner does not use daily.

**Audit check at `5f8003d67`:** still_present (ux, medium). Checked at HEAD. src/lib/features/event-calendar/EventForm.svelte:38 derives errors = validateDraft(draft) with no touched gate. The title Input at :69-70 sets aria-invalid and aria-describedby straight from errors.title, and :73-74 renders the message under {#if errors.title}. No titleTouched state or onblur exists in the file. createDraft (event-calendar-form.logic.ts:104) starts with title: '' and validateDraft (:163) sets 'Enter a title.' for an empty trimmed title, so the New event dialog opens with the red message and red border before any input. git log for EventForm.svelte shows only the original feature commits (5fc1f66e4, eb7ab2b1b, fe7430ee2, 03026a540) plus a import-path refactor (87254d850); none add a touched flag. src/tests/lib/features/event-calendar/EventDialog.test.ts:250 only pins the message after typing spaces. Not run (read-only audit).

**Stale in the text below:** Line numbers are accurate within 1 line: aria-invalid is at :69, aria-describedby at :70 and the message paragraph at :73-74. The Save button reference (about line 187) was not rechecked. Nothing else in the Issue text is out of date.

**What to build:** Opening the New event dialog shows the red "Enter a title." message and a red title border before the user has typed anything, because `EventForm.svelte` derives `errors` from the draft on every render (about line 38) and a create draft starts with `title: ''` (`event-calendar-form.logic.ts` about line 104). Gate the title message on a touched flag in `src/lib/features/event-calendar/EventForm.svelte`:

- add `let titleTouched = $state(false);`, set to `true` by the title `Input`'s `oninput` (about line 68) and by a new `onblur`
- `aria-invalid`, `aria-describedby` (about lines 69-70) and the `{#if errors.title}` paragraph (about line 73) use `titleTouched && errors.title`
- `valid` and the disabled Save button (about line 187) keep reading the full `errors`, so Save stays disabled for an empty title
- `validateDraft` in `event-calendar-form.logic.ts` does not change (its tests pin the message)

The date and time messages are not gated: their fields start filled and valid, so they only appear after an edit already.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

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

- 2026-11-06: migrated from `.scratch/ux-polish/issues/11-event-title-error-after-touch.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
