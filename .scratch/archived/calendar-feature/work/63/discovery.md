# 63 discovery: a failed restore is not reported as "no longer in the Trash"

Anchors on main (2294a13d). Template: work/71 (same service and test file).

## What the code does today

- `restoreItem` (`src/lib/core/trash/trash.service.ts:109-172`) never returns `null`: it returns the
  restored path or logs and re-throws (`:168-171`). Its `Promise<string | null>` type is wider than the body.
- `restoreNow` (`src/lib/features/event-calendar/event-calendar.service.ts:1018-1053`) maps a missing
  entry to `EventCalendarError('not-in-trash')` (`:1028`), and has a dead `restored === null` check (`:1030`).
- A rename or mkdir error therefore reaches `toastEventError` raw: the toast shows the OS / Tauri text
  (e.g. "permission denied"), which never says the restore failed. The Issue's premise (null mapped to
  not-in-trash) no longer matches the code, but its outcome (a restore-failed reason and message) is still missing.

## Plan

1. `event-calendar.service.ts:771-779`: add `'restore-failed'` to `EventCalendarErrorReason` with message
   "Could not restore the note from the Trash".
2. `restoreNow`: wrap `restoreItem` in try/catch and throw `EventCalendarError('restore-failed')`
   (`restoreItem` already logged the cause). Drop the dead null check. JSDoc `@throws` of `restoreNow`,
   `restoreDeletedEvent` updated.
3. `trash.service.ts:109`: return type `Promise<string>`; JSDoc gets `@returns` / `@throws`.
   `TrashSection.svelte:26` ignores the result and catches the throw: unchanged.
4. `applyNoteOp` (`:1118-1124`) unchanged: a non-`not-in-trash` error is refused and re-thrown, so the
   undo / redo toast goes through `toastEventError` and shows the new message.

## Tests (prior art)

- `src/tests/lib/features/event-calendar/event-calendar.service.test.ts`: the `not-in-trash` cases
  (:1942-1961, :2124, :2433, :2645) and the delete rename failure (:1869, `vi.mocked(rename).mockRejectedValueOnce`).
  New: `restoreDeletedEvent` with a rejected rename -> reason `restore-failed`, Trash entry kept, note not on
  disk; toast Undo and `undoEventChangeFromUi` with a rejected rename -> "Could not restore the note from the
  Trash"; the `toastEventError` it.each table gains the new reason.
- `src/tests/lib/core/trash/trash.service.test.ts:319` "throws on error": also asserts the entry stays.

## Risks / defaults

- An error thrown by `restoreItem` after the rename succeeded (re-index, tree refresh) is reported as
  restore-failed although the note is back; before it was reported with its raw message. Same behavior class
  as today (an error toast, op refused); not widened.
- A manifest entry whose file vanished from `.trash` on disk fails the rename: reported as restore-failed,
  not not-in-trash (the entry is still listed in the Trash).
