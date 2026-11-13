# 27 discovery: edit dialog with validation and color swatches

Template: issue 26 (`work/26/discovery.md`): store-driven component mounted in `EventCalendarView` with a `root` prop, focus redirected on close with the same block-or-root rule, mount tests on real stores. Only the differences are listed.

## Pre-flight re-check
- `pnpm-lock.yaml:1270` still resolves `bits-ui@2.19.5`, the Task 1 (g) baseline. The Task 1 (a) answer stands (`onCloseAutoFocus` on `Dialog.Content`, through `dialog-content.svelte` `restProps`). No Pre-flight log edit.

## Files that change
- New `EventDialog.svelte`: `Dialog.Root open={dialog?.payload.mode === 'edit' && event}`, `Dialog.Content class="gap-5 p-5 sm:max-w-[440px]"`, `{#key session}` around `EventForm`. Initial draft `draftFromEvent(event)` captured once per session; original `eventState(event)`. Submit: `draftToPatch`, empty patch closes, else `editEvent(path, patch)` then `closeDialog()`. "Open note" closes and calls `openFileInEditor`. `onCloseAutoFocus` prevented; focus `[data-event-path=<last path>]` in `root`, else `root` (last path follows `remapPath`, and the final path `editEvent` returns).
- New `EventForm.svelte`: owns the draft (`$state`), `validateDraft` errors shown live, Save `disabled` while invalid or saving; `applyStartChange` / `applyEndChange` / `toggleAllDay` on input; values via `timeInputValue`. Date, times and the all-day switch disabled with a notice when `timingLocked`. A rejected `onSubmit` shows its message in `[data-form-error]` (`role="alert"`). No body field (D21). Footer snippet prop for "Open note".
- New `EventColorSwatches.svelte`: `role="radiogroup"`, six `role="radio"` buttons over `EVENT_CALENDAR_COLORS`, roving tabindex, Arrow keys (and Home/End) move focus and select.
- `EventPopover.svelte:113-115`: footer gains an "Edit" button: `closePopover()` then `openDialog({ mode: 'edit', path })`; skips its own close-focus restore so it does not fight the dialog's open autofocus.
- `EventCalendarView.svelte:81`: mount `<EventDialog {root} />`.
- `EventBlock.svelte:71`: `data-pending="true" | "false"` (was absent when settled), so the E2E selector `[data-pending="false"]` from the ticket matches. `EventTimeGrid.test.ts:124,134` move from `hasAttribute` to the attribute value. Month chips are left as they are.

## Tests
- New `EventDialog.test.ts`: fake disk + mocked `@tauri-apps/plugin-fs` / `renameItem` copied from `event-calendar.service.test.ts:500-610`; mount `EventTimeGrid` + `EventDialog` into one root as `EventPopover.test.ts` does. Cases from the ticket plus swatch arrow keys and failed-save inline error.
- `EventPopover.test.ts`: Edit opens the dialog state and closes the popover. `EventCalendarView.test.ts`: an open edit dialog renders in the view.
- E2E `event-calendar.spec.ts`: edit time; rename then index catch-up (`REFRESH_DELAY_MS` 2 s / 10 s spacing, so generous timeouts); rename to `1:1 sync`.

## Defaults taken
- Errors are shown live (no touched state); create mode is ticket 29's concern.
- The all-day switch is disabled with the date and times when locked (it changes timing too).
- An unchanged draft closes without a write.
