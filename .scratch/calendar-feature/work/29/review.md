VERDICT: CHANGES_REQUESTED

# Review: Issue 29, create, duplicate and delete in the UI

Reviewed `git diff main...HEAD` at `a408b70a` (feat commit `a6296fec`).

## What the verdict rests on

Commands I ran in the worktree:
- `pnpm check`: 0 errors, 0 warnings (204 files).
- `./node_modules/.bin/vitest run src/tests/lib/features/event-calendar src/tests/lib/features/command-palette`: 19 files, 665 tests passed. That covers every changed unit test file: `EventDialog.test.ts`, `EventPopover.test.ts`, `EventMonthGrid.test.ts`, `EventTimeGrid.test.ts`, `event-calendar.service.test.ts` and `command-palette.service.test.ts`, plus the rest of the event-calendar suite.
- `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts e2e/specs/command-palette.spec.ts`: **1 failed, 18 passed**. The new test "deleting from the popover hides the block, and the toast Undo brings it back settled" failed on the first run and again on its retry, with the same error both times (finding 1).

I did not run the full gate.

## Acceptance criteria

- [x] **EventDialog create mode.**
  - The title is required: `validateDraft` rejects an empty trimmed title, and Save starts disabled (`EventDialog.test.ts` "opens an untitled form", E2E `toBeDisabled`).
  - The notes `<textarea>` is styled like `ui/input` (`EventForm.svelte:164-177`). It becomes the body: `applyEventDraft`, plus the test and E2E assertions on "Agenda".
  - The "Open note after creating" checkbox exists (`EventDialog.svelte:189-192`) and is tested on and off.
- [x] **Edit footer and popover.**
  - The edit footer has Delete and Duplicate icon buttons (`EventDialog.svelte:197-202`), and so does the popover (`EventPopover.svelte:189-196`).
  - Both go through the same `deleteEventFromUi` / `duplicateEventFromUi`, so the toasts match.
  - Each closes its dialog or popover first.
- [x] **Focus.**
  - A delete moves focus to the root: `lastPath = null` before the close (dialog and popover tests, E2E `toBeFocused`).
  - A duplicate moves focus to the copy's block after `tick`, else to the root (`event-calendar.service.ts:1004-1018`, tests for both).
  - The Undo handler focuses the root in `.finally` (service test and dialog test).
  - I checked the bits-ui side: `FocusScope.use` unmounts the scope as soon as `enabled` goes false, so the trap is gone before the duplicate resolves.
- [x] **Toasts.** "Event deleted" carries an Undo action that calls `undoDeleteEvent`; pre-flight (b) is yes (plan `:1340`). "Event duplicated" carries the copy's title as its description. See finding 5 for the delete toast's missing description.
- [x] **Create from the lane and the month grid.**
  - A click on an empty all-day lane cell opens create `{ allDay: true }` (`EventAllDayLane.svelte:35-37`, `EventTimeGrid.test.ts`).
  - A double-click on an empty month cell opens create at `dayStartHour * 60` (`EventMonthGrid.svelte:45-48`, `EventMonthGrid.test.ts` with `dayStartHour: 7` giving 420).
- [x] **Palette entries.** `event-calendar:new-event` and `event-calendar:today` exist. The count goes from 27 to 29. The new-event real run leaves the Calendar tab active and the dialog payload at `defaultCreateSlot`, and is tested for today and for another day.
- [ ] **`EventDialog.test.ts` assertions: met, with a gap.**
  - Met: a create submit makes the pending create visible (`pending: true`). The footer Delete toasts through the mocked `svelte-sonner`, closes the dialog, and leaves focus on the root.
  - Gap: the create mode has no error-path test (finding 2).
- [x] **E2E create.** The block renders, and the note holds `_type: Event`, `date` and `start`. The folder check is weak (finding 4).
- [ ] **E2E delete, then Undo: not met.** The test is racy and failed twice in a row for me (finding 1).
- [ ] **Gate green: not met.** The Issue's gate includes `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts ...`, which is red because of finding 1. The single feat commit is in the full format.

## Findings

1. **High: the new E2E delete/Undo test is racy and fails** (`e2e/specs/event-calendar.spec.ts:431-433`).
   - Cause: `deleteNow` puts the pending `delete` overlay before `await deleteItem(path)` (`event-calendar.service.ts:645-646`). The block therefore disappears before the note is moved to the Trash, and the synchronous `expect(await page.evaluate(... fs.exists ...)).toBe(false)` right after `toHaveCount(0)` can still read `true`.
   - Observed: it failed on the first run and on the retry ("Expected: false, Received: true" at line 433). That makes the Issue's E2E gate red.
   - Fix (test only):
     - Assert the "Event deleted" toast first. The toast only appears after `deleteEvent` has resolved.
     - Then check `exists`, or make the check `await expect.poll(() => page.evaluate(... exists ...)).toBe(false)`.
     - Give the `exists(...) === true` check after Undo the same treatment: poll it, or assert it after the block is back and `data-pending="false"`.

2. **Medium: the dialog's create error path has no test** (`EventDialog.svelte:133-151`, `EventDialog.test.ts`).
   - `create()` has two failure branches:
     - an inline error while the session is current (rethrown to `EventForm`);
     - `toast.error(eventErrorMessage(err))` when the dialog was closed or reopened during the write.
   - There is also the success-after-session-change branch, which leaves the dialog alone. None of the three is exercised.
   - The `save()` counterparts are tested in work 27, and CLAUDE.md asks every suite to cover error handling.
   - Fix: add an `EventDialog: create` test where `createEvent` fails (for example `create_note` rejecting, or a lossy template giving `template-lossy`). Assert that the inline `[data-form-error]` text appears, the dialog stays open and nothing is written. Add a second test that closes the dialog mid-write and asserts the `toast.error` text.

3. **Low: the palette re-implements calendar logic** (`command-palette.service.ts:158-176`).
   - The new-event action knows that the clock only ticks while the view is mounted (`setNow(Date.now())`). It also reads four view-store getters and two settings to call `defaultCreateSlot`.
   - That is calendar behavior living in the command-palette feature. A second caller, such as a keybinding in ticket 31, would have to copy it.
   - Fix: move it to `event-calendar.service.ts` as `openNewEventDialog()` (open the tab, refresh now, compute the slot, open the dialog), and make the palette action a one-liner like `toggleEventCalendarTab`. Move the payload assertions to the service test and keep a thin palette test.

4. **Low: the E2E "folder createNoteOfType would use" check only proves the vault root** (`e2e/specs/event-calendar.spec.ts:389-390`).
   - The seeded vault has no Event type definition, so the expected path is hard-coded to `/test-vault/Planning.md`.
   - A regression that always wrote to the root would still pass, so the test does not show that the dialog goes through the type's `_folder`.
   - Fix (optional if the ticket 28 service tests already cover `_folder` through `createTypedNote`): seed an `Event` type definition with `_folder: Events` and assert `/test-vault/Events/Planning.md`. Otherwise, note in the test that the routing is covered at the service level.

5. **Low: the delete toast omits the title description the prototype shows** (`event-calendar.service.ts:984-993`).
   - The plan cites `app-store.ts:261`, which is `toast("Event deleted", { description: removed.title, action: ... })`.
   - The implementation drops `description`, so with several quick deletes the user cannot tell which toast's Undo restores which event.
   - Fix: pass `description` with the event's title, captured before the delete (for example `eventCalendarStore.eventByPath(path)?.title` read before `await deleteEvent`), and update the two `toHaveBeenCalledWith('Event deleted', ...)` assertions.

6. **Low: the Undo handler focuses the `root` captured at delete time** (`event-calendar.service.ts:977-993`).
   - If the Calendar view unmounts and remounts during the toast's lifetime (switching to a note tab and back), `root` is the old, disconnected section. `focusRoot` then does nothing and focus stays on `<body>`, which is the dead-shortcut state the Issue wants to avoid.
   - Fix: at click time, resolve the live root (for example `document.querySelector('[data-event-calendar]')`), falling back to the captured one. Alternatively, record this as an accepted edge case in a comment.

## Resolution

All six findings accepted and fixed in the fix step.

1. E2E delete/Undo: the test now asserts the "Event deleted" toast (and its "Standup" description) before the Trash check, and both `fs.exists` checks are `expect.poll`. `e2e.sh event-calendar + command-palette`: 19 passed.
2. `EventDialog.test.ts` gains "EventDialog: create failures": a rejected `create_note` keeps the dialog open with the inline `[data-form-error]`, writes nothing and toasts nothing; a close mid-write toasts the error; a create that finishes after a newer dialog opened leaves that dialog alone.
3. The palette's new-event logic moved to `openNewEventDialog()` in `event-calendar.service.ts`; the palette action is a one-liner. The slot assertions moved to the service test; the palette test checks the tab and the create dialog.
4. Took the documented alternative: the E2E test now notes that `_folder` routing is covered by the createEvent service test "uses the Event type's folder and template" (no E2E fixture seeds type definitions).
5. The "Event deleted" toast carries the event's title, read before the delete, as `description`; both assertions updated.
6. The Undo handler resolves the live `[data-event-calendar]` root at click time, falling back to the captured root; a service test covers a remount while the toast is up.
