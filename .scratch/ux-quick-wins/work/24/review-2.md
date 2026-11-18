VERDICT: APPROVED

# Re-review 2: Issue 24, fixes in b8219c82b

Reviewed `git diff 8a3acd782..HEAD` (the fix commit b8219c82b): `EventForm.svelte`, `EventBlock.svelte`, `event-calendar-keys.logic.ts`, `27-calendar.md`, `EventDialog.test.ts`, `EventTimeGrid.test.ts`, plus the review's Resolution.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | The fix step reports `bash scripts/e2e.sh` on the two specs (38/38) and the other five calendar specs (10/10). Not re-run here (E2E is deliver's); the fix commit changes no e2e file and no selector, and the e2e edits were already correct by reading in round 1. |
| 2 | minor | resolved | `EventForm.svelte:84-93`: `<p data-title-message class="min-h-4 ...">` is always rendered; `id` and `data-error="title"` are set only with `titleError`, and `aria-describedby` (`:81`) still points at the id only when it exists. Test `EventDialog.test.ts:564-578` checks the row exists before the error, has `min-h-4`, no text, no id, and after blur is the same node as `[data-error="title"]`. Red against the pre-fix form. |
| 3 | minor | resolved | `EventForm.svelte:53-54` sets `titleTouched = true` before the `!valid` return. Test `EventDialog.test.ts:580-590` submits the empty untouched form and expects "Enter a title.", `aria-invalid="true"` and the dialog still open. Red against the pre-fix form. |
| 4 | nit | resolved | `event-calendar-keys.logic.ts:88-89` reads "Drag an event's block ..." and "Drag the bottom edge of an event's block" (label "Change an event's length"); `27-calendar.md:54-55` matches, so the doc tie test still passes. No other test or e2e spec asserts the old strings (grep of `src`, `help`, `e2e`). |
| 5 | nit | resolved | `EventBlock.svelte:91-106`: both layouts' `[data-event-content]` wrapper add `pr-4 @max-[84px]:pr-4` when `event.readOnly`. Under Tailwind v4 (`^4.3.5`) `pr-*` (padding-right) sorts after `px-*` (padding-inline) and the `@max-[84px]:` variant repeats the override, so the order is right by reading; not checked visually. `EventTimeGrid.test.ts:177,182` asserts `pr-4` on the read-only block and its absence on a normal one; red against the pre-fix block. |
| 6 | nit | rejection stands | No change; the test meets the criterion as written, as round 1 said. |

## Acceptance criteria re-checked

- [met] Failing test first, `src/tests/lib/features/event-calendar/EventDialog.test.ts` ("EventDialog: create"): opening create shows no `[data-error="title"]`, no `aria-invalid`, and Save is disabled; focusing then blurring the empty title shows "Enter a title." with `aria-invalid="true"` and `aria-describedby`; the placeholder is "Event title". The existing cases stay green: spaces (`:244-252`), a colon title and the edit-mode cases. — The always-rendered `<p>` carries `data-error` only with an error, so the "no `[data-error="title"]` on open" case still holds; the whole `EventDialog.test.ts` passes, including the two new cases.
- [met] `CALENDAR_GESTURES` is non-empty, every row has a label and a view scope and none repeats a `CALENDAR_SHORTCUTS` chord (`event-calendar-keys.logic.test.ts`); the dialog opened through `openHelp()` shows a "Mouse" heading and one row per gesture, and the key rows are unchanged. — Only two gesture strings and one label changed; `event-calendar-keys.logic.test.ts` and `EventCalendarView.test.ts` pass.
- [met] A doc tie: every gesture row has a matching row in the `27-calendar.md` creation table, the month chip drag included (same pattern as `event-calendar-keys.logic.test.ts:229-245`). — `27-calendar.md:54-55` carry the new gesture text; the doc-tie test and `sync-wiki-docs.test.ts` pass.
- [met] A read-only month chip, all-day chip and time block contain the lock marker and their accessible name ends with "read-only"; a normal one has neither. `EventMonthGrid.test.ts:567` and `EventAllDayLane.test.ts:140-141` ("never drags it") pass unchanged. — The fix touches only the block's content padding; `EventTimeGrid.test.ts`, `EventMonthGrid.test.ts`, `EventAllDayLane.test.ts` pass.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (236 files, 0 errors, 0 warnings); targeted tests pass (below); the full suite is deliver's to run.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/event-calendar src/tests/scripts/sync-wiki-docs.test.ts`: exit 0, 30 files, 1153 tests passed.
- Red check: with `EventForm.svelte` and `EventBlock.svelte` restored to 8a3acd782 (and checked back out afterwards, worktree clean), `EventDialog.test.ts` + `EventTimeGrid.test.ts` show exactly the three new or extended tests failing (93 pass).
- No test weakened or deleted; no layer-baseline or composition-root change; no scope creep (every change traces to findings 2-5).

## Findings

1. **nit** `src/lib/features/event-calendar/EventForm.svelte:86-93`: the reserved message row is now always present, so the form (create and edit) is about 22px taller than before even with no error. This is the intended tradeoff of finding 2's fix. Fix: none needed; accept.
