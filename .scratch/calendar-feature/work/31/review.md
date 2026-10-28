VERDICT: CHANGES_REQUESTED

# 31 review: view-scoped keyboard shortcuts, global toggle and undo feedback

Reviewed `git diff main...91f7d339` in the worktree: feature commits 55ff4b57, 2ca330d2, c81fa6dd, fabd70b3 and 606589f8.

## Checks I ran

- `pnpm check`: 205 files, 0 errors, 0 warnings.
- `./node_modules/.bin/vitest run src/tests/lib/features/event-calendar src/tests/lib/core/keybindings src/tests/lib/features/command-palette src/tests/lib/core/markdown-editor`: 120 files, 2074 passed.
- `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts e2e/specs/keyboard-shortcuts.spec.ts e2e/specs/command-palette.spec.ts`: 35 passed, 2 flaky, exit 0. Both flaky tests (`:128` "clicking a Needs-attention row opens that note" and `:235` "switching to Month shows the event chips") failed first in `openCalendar` (`:97`). The page snapshot shows `2026-11-10.md` holding the tab selection, so the auto-opened daily note took the tab after the palette opened the Calendar. Finding 1 explains why this matters for the new keyboard test.
- Mutation probe, reverted afterwards: with `global-keybindings.ts` restored to main, 5 tests in `global-keybindings.test.ts` fail (count, registration, cleanup, open/close handler, yield). With only the yield guard removed, the yield test fails. The C10 claim that these tests fail first holds.
- Throwaway jsdom probes, deleted and never committed:
  - Mounting the view while the create dialog is already open (the palette "New Calendar Event" path with the tab closed) leaves focus inside `[data-event-dialog]`. `root.focus()` on mount does not steal it.
  - Delete on the root with the popover open: the popover closes and focus ends on the event block, not on the root. See finding 2.
- The full gate was not run. The deliver step runs it.

My test verdict rests on these files:
- `src/tests/lib/features/event-calendar/event-calendar-keys.logic.test.ts`
- `src/tests/lib/features/event-calendar/EventCalendarView.test.ts` ("EventCalendarView: keyboard")
- `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` ("undoEventChangeFromUi and redoEventChangeFromUi")
- `src/tests/lib/core/keybindings/global-keybindings.test.ts`
- `src/tests/lib/core/keybindings/keybindings.logic.test.ts`
- `src/tests/lib/features/command-palette/command-palette.service.test.ts`
- `e2e/specs/event-calendar.spec.ts` ("Event calendar keyboard")
- `e2e/specs/keyboard-shortcuts.spec.ts` and `e2e/specs/command-palette.spec.ts`

## Acceptance criteria

- [x] **Keys logic.** Met. `event-calendar-keys.logic.ts:49-54` `isTypingTarget` returns true for INPUT, TEXTAREA, SELECT and `isContentEditable`. `resolveCalendarKey` (`:66-89`) covers:
  - T, N, D/W/M, and ArrowLeft/ArrowRight, which return null when `targetInTablist` is set.
  - Delete/Backspace, targeting the popover event first, then the focused block.
  - Escape, Cmd+Z, Shift+Cmd+Z and Ctrl+Y.

  Letters and arrows return null while Meta, Ctrl or Alt is held. Every key returns null while the user types or `dialogOpen` is set. The view reads `dialogOpen` from `eventCalendarViewStore.isDialogOpen` and `popoverPath` from `selectedEventPath` (`EventCalendarView.svelte:49-53`), not from DOM probes. The logic test covers each branch, including "ignores the arrows inside the tablist".
- [x] **View wiring.** Met.
  - The root has `onkeydown={handleKeydown}` (`EventCalendarView.svelte:143`) and `onMount` calls `root?.focus()` (`:38`). No bare key goes through `registerKeybinding`.
  - The `document` listener (`:91-97`) forwards only when `e.target === document.body`, and the effect cleanup removes it.
  - Only the active tab is mounted (`EditorView.svelte:57-58`), so the body fallback is gone whenever the Calendar tab is not shown.
  - Tests cover focus on mount, a key on `<body>`, the `<input>` guard, and listener removal on unmount.
- [x] **Undo feedback toasts.** Met. `event-calendar.service.ts:1051-1125` produces:
  - "Undone: <label>" with a Redo action, and "Redone: <label>" with an Undo action. The action re-resolves the live `[data-event-calendar]` root and focuses it in `finally`. Task 1 (b) is a "yes" in the Pre-flight log, so the actions stay on.
  - "Nothing to undo" / "Nothing to redo".
  - On a refusal, "Event changed since; not undone" with "Open note" when the note is still on disk (the new `path` on `EventChangeResult`).
  - On `vanished`, "Event was moved or renamed outside the calendar; cannot undo".
  - A thrown write error goes through `toastEventError`.

  The service tests cover each case, including focusing the live root over a stale one. Finding 4 covers the text of the not-in-trash refusal.
- [x] **Global toggle.** Met, with the documented deviation.
  - Cmd+Shift+C (per the ticket 02 log) is registered right after Cmd+Shift+T (`global-keybindings.ts:103-116`) and calls `toggleEventCalendarTab`.
  - The yield uses `keybindingsEqual(cycleSidebarView, TOGGLE_CALENDAR_KEYBINDING)` instead of `matchesKeybinding(e, ...)`. That is equivalent: `utils/keybindings.ts:14-25` fires the handler only when every modifier matches exactly and the key matches case-insensitively, and `keybindingsEqual` compares the same fields the same way.
  - `registerCycleSidebarKeybinding` is untouched.
- [x] **Reserved entry and palette shortcut.** Met. `RESERVED_KEYBINDINGS` has `{ label: 'Toggle Calendar', binding: TOGGLE_CALENDAR_KEYBINDING }` (`keybindings.logic.ts:107`). `event-calendar:toggle` carries `shortcut: { meta: true, shift: true, key: 'c' }` (`command-palette.service.ts:159`). Both test files cover these, the latter through `formatShortcut` -> `⌘⇧C`.
- [x] **Keys plus palette Undo/Redo.** Met. The Cmd+Z / Shift+Cmd+Z / Ctrl+Y keys stay, and "Calendar: Undo" / "Calendar: Redo" were added (`command-palette.service.ts:181-196`). The palette count goes from 29 to 31, and a test asserts the "Nothing to undo/redo" toasts and that the tab does not open.
- [x] **`global-keybindings.test.ts`.** Met.
  - The count goes from 20 to 21 and the cleanup array from 19 to 21.
  - The event-calendar service is not mocked. The captured handler opens the tab (`activeTab.path === EVENT_CALENDAR_VIRTUAL_PATH`, `fileType === 'event-calendar'`), and a second call removes it.
  - With `cycleSidebarView` on Cmd+Shift+C, the tabs stay unchanged.
  - The mutation probe confirmed these tests fail first.
- [x] **`EventCalendarView.test.ts`.** Met. Cmd+Z with an empty stack toasts "Nothing to undo". After Escape on an open popover, `document.activeElement` is the block and `w` switches to week. `m` on `document.body` switches to month, and `w` in an `<input>` does not. There is no unit test of the view's Delete/Backspace branch (finding 3).
- [x] **E2E.** Met: M/W/D after a palette open with no click, Meta+Z / Meta+Shift+Z against `readNote`, Delete with the toast Undo (root focused afterwards), and Escape closing the popover. All four passed in my run. The first of them carries the daily-note race (finding 1).
- [ ] **Gate green and one commit.** Pending. The gate is the deliver step's. The work spans five feature/test commits instead of the "one commit" this line asks for. Each commit has Context, Problem (where applicable), Solution, Behavior, Files and the trailer. That matches CLAUDE.md's no-batching rule, so I do not ask for a squash.

## Findings

1. **Medium: the new E2E keyboard test races the auto-opened daily note.** `e2e/specs/event-calendar.spec.ts:628-629` calls `openCalendar` without first waiting for the `2026-11-10.md` tab, unlike `openSeededCalendar` (`:302-306`). In my run, two existing tests that open the same way failed their first attempt at `openCalendar` (`:97`) because the daily note took the tab selection. In this test the race is worse. If the daily note opens after the Calendar, `page.keyboard.press('m' / 'w' / 'd')` types into the daily note's editor, and the test fails or writes into the note. The Issue's gate runs this spec. **Fix:** make `openCalendar` (`:93-98`) wait for `page.locator('[role="tab"]', { hasText: '2026-11-10.md' })` before it opens the palette, then drop that wait from `openSeededCalendar`. This also fixes the two pre-existing flakes. The minimum fix is to add the same wait at the top of the new test.
2. **Low: Delete with the popover open leaves focus on the block being deleted, and focus falls to `<body>` once the block goes.** `EventCalendarView.svelte:69-74` calls `closePopover()` and then `root.focus()`. The popover's close runs afterwards: `EventPopover.svelte` `handleCloseAutoFocus` still has `lastPath` set and moves focus back to the block. The popover's own `deleteNote` clears `lastPath` for this reason (`EventPopover.svelte:133`). Once the delete lands, the block unmounts and focus is on `<body>`. Keys still work through the body fallback, but the line's own comment ("park focus on the root") does not hold, and the toast's Undo is the only path that refocuses the root. My jsdom probe confirmed that focus is on the block after the close. **Fix:** when `action.path` is the popover target, park focus on the root after the popover close has run, for example `void tick().then(() => focusRoot)` inside the view, or a guard that focuses the root when `document.activeElement` is not inside it. Add a test for it (see 3).
3. **Low: the view's Delete/Backspace branch has no unit test.** `EventCalendarView.svelte:69-74` (close the popover, focus the root, `deleteEventFromUi`) is covered only by E2E, which tests a focused block with no popover. CLAUDE.md requires a test change for every changed source path. **Fix:** in the "EventCalendarView: keyboard" describe of `src/tests/lib/features/event-calendar/EventCalendarView.test.ts`, add:
   - Delete on a focused block that deletes it (assert the "Event deleted" toast, or the store/disk state through the existing mocks).
   - Delete with the popover open that targets the popover event and leaves focus on the root.
   - Backspace on the root with no block and no popover, which does nothing and does not call `preventDefault`.
4. **Low: a delete undo whose Trash entry is gone reports "Event changed since; not undone".** `event-calendar.service.ts:861` returns `refused` for `not-in-trash`, and `applyEventChangeFromUi` (`:1056`, `:1063`) shows the "changed since" text. The note did not change; it cannot come back because the Trash was emptied. The service test at "a refusal of a delete whose Trash entry is gone" pins the misleading text. **Fix:** either have `applyNoteOp` mark that case (for example with a `reason: 'not-in-trash'` field on the result) and toast "The note is no longer in the Trash; cannot undo" / "...; cannot redo", or record in `discovery.md` that the spec's single refusal text deliberately covers it. This is a copy issue and does not block on its own.
5. **Low: calendar keys other than Escape still act during a live drag.** The time grid's gesture listener (`EventTimeGrid.svelte:115-120`, capture on `window`) swallows only Escape. Delete/Backspace on the dragged block (pointerdown focuses it), D/W/M (which remount the grid through `{#key view}`), the arrows (which shift the days under the pointer) and Cmd+Z all reach `handleKeydown` mid-gesture. The worst outcome is a drop on a deleted note, which ends in a "moved or deleted" toast, so no data is lost. **Fix (optional):** have `handleGestureKeydown` call `stopPropagation` on every non-modifier key while a gesture is live, or expose a `gestureLive` flag on the view store and return null from `resolveCalendarKey` while it is set (with a logic test). If you keep the current behavior, note it in `discovery.md`.
6. **Nit: the Undo/Redo toast actions act on the top of the stack, not on the op their toast names.** If you undo A and then B, clicking Redo on A's toast redoes B (`event-calendar.service.ts:1100-1106`). This matches the prototype (`keyboard-shortcuts.tsx:51-56` calls `redo()` / `undo()`). No change is needed. If you do change it, say so in the user docs (ticket 34).
