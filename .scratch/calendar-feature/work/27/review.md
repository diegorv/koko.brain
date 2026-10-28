VERDICT: CHANGES_REQUESTED

# Review: calendar-feature issue 27, edit dialog with validation and color swatches

Scope: `git diff main...HEAD` on `issue/calendar-feature-27-edit-dialog` (846480d5, d5e42f54, 871f5729).

## What the test verdict rests on

Run by the reviewer in the worktree:

- `pnpm check`: 204 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/event-calendar/`: 16 files, 590/590 pass. This covers the files the diff adds or changes: `EventDialog.test.ts` (new), `EventPopover.test.ts`, `EventCalendarView.test.ts`, `EventTimeGrid.test.ts`, `event-calendar.service.test.ts`. It also covers the tests of the changed code: `EventMonthGrid.test.ts` and the `toastEventError` cases in the service test.
- `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts`: 14/14 pass, including the three new edit-dialog tests.
- A temporary probe test (copy of the `EventDialog.test.ts` harness, deleted afterwards, not committed) for findings 1 to 3. Probe output:
  - A: a save left running while the user closed the dialog and opened Retreat's dialog. When the write resolved, `eventCalendarViewStore.dialog` was `null`, so the stale save closed the newer dialog.
  - B: a save left running whose write then rejected, after the user closed the dialog. `toast.error` was never called, and no inline error is shown.
  - C: a multi-day event's all-day switch is disabled.
  - D: an event ending at `24:00` (end 1440) shows `23:59` in the End field.

## Acceptance criteria

- [x] **bits-ui re-check: met.** `pnpm-lock.yaml` still resolves `bits-ui@2.19.5` (discovery.md, Pre-flight re-check). No log edit was needed.
- [x] **`ui/dialog` with `class="gap-5 p-5 sm:max-w-[440px]"`, `{#key session}`, "Open note" in edit mode: met.** `EventDialog.svelte:81` is the `Dialog.Content` with that class. `:85` is `{#key session}` around the form. `:88` is the "Open note" button. The key wraps the form inside the content, which gives the per-session remount the plan wants. Test: `EventDialog.test.ts` "Open note" closes the dialog and opens the note.
- [x] **`onCloseAutoFocus` prevented, focus to the edited block or the view root: met.** `EventDialog.svelte:55-61` uses the same block-or-root rule as the popover. `EventPopover.svelte:88-91` hands focus off so the popover's close does not compete with the dialog. Tests: `EventDialog.test.ts:325` (Escape leaves focus on the block), the rename case (focus on the renamed block), and `EventCalendarView.test.ts:408` (Popover, then Edit, then Escape). The root fallback has no test (finding 4).
- [x] **Title, native `type=date`, `type=time step=900`, `ui/switch` all-day, `ui/input` location, each with `<label for>`, no body field: met.** See `EventForm.svelte:61-155`. The test "opens with the event fields and no note body field" checks `step="900"`, a `label[for]` for each input, and no `<textarea>`. The all-day `Switch` has `id` plus `label for` (`:98-106`).
- [x] **Date and time disabled with a notice when `timingLocked`: met.** `EventForm.svelte:76-80` shows the notice and `:85,117,130` set `disabled`. Test "disables the date and time fields of a multi-day event, with a notice". The all-day switch is also disabled (probe C), which is the builder's documented default.
- [x] **Inline errors from `validateDraft`, Save disabled while invalid: met.** `EventForm.svelte:36-37,166`. Tests: empty-date plus end-before-start, and empty title.
- [~] **Submit calls `editEvent`, failure keeps the dialog open with an inline error: met for the open dialog, not for a dialog closed mid-save.** `EventDialog.svelte:64-71` and `EventForm.svelte:45-57`. Test "keeps the dialog open with an inline error when the write fails". Findings 1 and 2 cover the closed-mid-save case.
- [x] **`EventColorSwatches` is a `role="radiogroup"` where arrow keys move and select; the popover has an Edit action: met.** `EventColorSwatches.svelte:39-57` uses a roving tabindex. `EventPopover.svelte:110-117,159` adds Edit. Tests: "is a radiogroup where arrow keys move and select" and `EventPopover.test.ts:317`.
- [x] **The ticket's `EventDialog.test.ts` cases pass: met.** All five are present and pass (empty-date/end-before-start, `1:1 with manager`, locked fields, valid submit through the mocked fs with a pending store event, Escape focus).
- [x] **E2E, edit time: met.** `event-calendar.spec.ts` "editing the time updates the block and the note frontmatter" asserts `[data-event-time]` `11:00 – 12:00` and the `start:` / `end:` bytes via `window.__e2e.fs.readFile`.
- [x] **E2E, rename then index catch-up: met.** It polls `__e2e.vaultIndex.version` past the old value, waits 300 ms, then asserts one `[data-event-path="<new>"][data-pending="false"]`, one block with the title, and the old path gone from the DOM and the disk.
- [x] **E2E, `1:1 sync`: met for the value.** The block shows "1:1 sync" and `1-1 sync.md` exists. The bytes are `event_title: 1:1 sync`, unquoted. That is the canonical form of ADR-0029 (`yaml@2.9.0` leaves a colon not followed by a space bare), and the test asserts what the writer produces. The ticket's `"1:1 sync"` is read as the value. See note 5.
- [ ] **Gate green and one commit in the full format: pending (deliver step).** The d5e42f54 message has Context, Problem, Solution, Behavior and Files with ranges.

## Findings

1. **Medium.** `src/lib/features/event-calendar/EventDialog.svelte:64-71` with `EventForm.svelte:53`. A save that fails after the user closed the dialog shows no error at all.
   - Escape, Cancel and the X button stay active while `saving`. Closing unmounts `EventForm`, so the `catch` sets `submitError` on a destroyed component.
   - `editEvent` does not toast. The pending overlay rolls back, so the block silently reverts (probe B: `toast.error` was never called).
   - This breaks the CLAUDE.md rule that user-facing errors are shown by toast or inline state.
   - **Fix:** in `save`, capture `const s = session` before the `await`. In a `catch`, when `eventCalendarViewStore.dialog?.session !== s`, call `toastEventError(err, path)` and return. Otherwise rethrow so the inline error shows.
   - **Test:** add one to `EventDialog.test.ts`: a deferred `writeTextFile` rejects after `closeDialog()`, then assert `toast.error` (the mocked `svelte-sonner`).
2. **Low.** `src/lib/features/event-calendar/EventDialog.svelte:68-70`. A stale save closes a newer dialog.
   - After `await editEvent(...)`, `closeDialog()` is unconditional, and so is the `lastPath` assignment. If the user dismissed the dialog and opened another event's dialog while the write was queued, that newer dialog closes when the old write resolves (probe A). The close focus may also go to the old block.
   - **Fix:** the same session guard as finding 1. Assign `lastPath` and call `closeDialog()` only while `eventCalendarViewStore.dialog?.session === s`.
   - **Test:** add a test for it.
3. **Low.** `src/lib/features/event-calendar/EventForm.svelte:132`. An event that ends at midnight shows `23:59` in the End field (probe D, end 1440).
   - `timeInputValue` clamps to 1439, while `applyEndChange` (`event-calendar-form.logic.ts`) documents `00:00` as the way to enter midnight. The field misstates the saved end. The off-step value also does not match `step=900`.
   - **Fix:** render the end as `draft.end >= 1440 ? '00:00' : timeInputValue(draft.end)`, or add an end-specific helper in `event-calendar-dates.logic.ts` with a unit test.
   - **Test:** an `EventDialog.test.ts` case for a 23:00-24:00 event.
4. **Low (test gap).** `src/tests/lib/features/event-calendar/EventDialog.test.ts:325`. The criterion "focus moves to the edited block, or to the view root" is only tested for the block.
   - **Fix:** add a case where the block is gone when the dialog closes and assert `document.activeElement === root`. For example, remove the note from the fake disk and `refresh()`, so the dialog closes itself through the `path && !event` effect.
5. **Info, no change needed.** The `event_title` quoting (see the criterion above). The unquoted bytes follow ADR-0029, and the E2E proves the round trip: the Rust-indexed title renders as "1:1 sync". If the ticket author meant quoted bytes, that is a writer change (ADR-0029) outside this ticket.
6. **Info, no change needed.** `EventBlock.svelte:71` now always emits `data-pending="true|false"`, while `EventMonthGrid.svelte:92` still adds or removes the attribute. Nothing in `src/` or `e2e/` selects on the presence of `[data-pending]`, so no consumer breaks. Ticket 29's E2E also expects `data-pending="false"` on blocks. The mismatch is documented in discovery.md. It is worth aligning when month chips gain a `[data-pending="false"]` assertion.

## Rules and scope

- Layer rules are respected. Everything new lives in `features/event-calendar/`, and nothing in `core/` imports it.
- Logic stays in `event-calendar-form.logic.ts`. The components only wire it.
- No stores or `.logic.ts` files are mocked in the new tests. Only `@tauri-apps/*`, `svelte-sonner`, `openFileInEditor` and `renameItem` are mocked, as `docs/TESTING.md` allows.
- Every changed source file has test changes: Dialog, Form and Swatches through `EventDialog.test.ts`; Popover; View; Block through `EventTimeGrid.test.ts`; and the service.
- Files outside the ticket's Touches list each trace to the ticket:
  - `EventCalendarView.svelte` mounts the dialog.
  - `EventBlock.svelte` makes the ticket's `[data-pending="false"]` selector match.
  - `event-calendar.service.ts` adds `eventErrorMessage` for the inline error. The `toastEventError` refactor keeps the same texts and actions, and the existing toast tests still pass.
- No scope creep found. Create mode, Delete and Duplicate are left to ticket 29.

## Resolution

- 1 (Medium): fixed. `EventDialog.svelte` `save` captures the dialog session before the write. When the session changed by the time the write rejects, it calls `toastEventError(err, path)`; otherwise it rethrows so `EventForm` shows the inline error. Test: "toasts a failed write when the dialog was closed during the save" (fails before the fix).
- 2 (Low): fixed with the same guard. After a successful write, `lastPath` and `closeDialog()` run only while the session is unchanged. Test: "leaves a newer dialog open when an earlier save finishes" (fails before the fix).
- 3 (Low): fixed inline in `EventForm.svelte`: the End field shows `00:00` when `draft.end >= 1440`, matching `applyEndChange`. Test: "shows 00:00, not 23:59, as the end of an event that ends at midnight" (fails before the fix).
- 4 (Low, test gap): added "moves focus to the view root when the edited block is gone" (the note is removed from the fake disk, `refresh()` closes the dialog through the `path && !event` effect).
- 5, 6 (Info): no change, as the review says.
