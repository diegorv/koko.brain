VERDICT: APPROVED

# 63 review: a failed restore is not reported as "no longer in the Trash"

Reviewed `git diff main...HEAD` at 8bc7cd05 (commits e3259c85, 6b3c483d, 8bc7cd05).

## Premise check

The discovery is right: on main, `restoreItem` (`src/lib/core/trash/trash.service.ts:112-175`) never
returns `null`. It returns the path or logs and re-throws (`:171-174`). The `restored === null`
check the Issue cites was dead, and the real symptom was a raw OS / Tauri message in the toast.
Narrowing the return type to `Promise<string>` and wrapping the throw in `restoreNow` matches the Issue's
own alternative ("a throw that the caller maps").

## Acceptance criteria

- [x] **Failing test first: a rename error during restore yields a restore-failed reason and message.** Met.
  `event-calendar.service.test.ts:1965` (reason `restore-failed`, message, entry kept, note off disk, history
  unchanged), `:2462` (toast Undo shows the message, exact `toast.error` calls), `:2684` (Cmd+Z shows the
  message and refuses the op), `:2754` (`toastEventError` table). Red probe run by this review: with main's
  `event-calendar.service.ts` and the branch tests, exactly these 4 tests fail (189 pass); restored after.
- [x] **Entry-missing still yields `not-in-trash`; other `restoreItem` callers keep their behavior.** Met.
  `restoreNow` still throws `not-in-trash` before calling `restoreItem` (`event-calendar.service.ts:1030`);
  the existing tests `:1942` (Trash emptied, every store untouched), `:1955` (unknown path), the toast Undo
  after an emptied Trash (`:2449`) and the undo / redo `notInTrash` cases still pass. `applyNoteOp`
  (`:1126-1133`) still maps only `not-in-trash` to a `refused` result and re-throws everything else, so
  `restore-failed` reaches `toastEventError`. The only other caller, `TrashSection.svelte:23-30`, ignores
  the return value and catches the throw: unchanged. The `kanban` `restoreItem` is an unrelated function.

## Rules

- Layer rules: `features/event-calendar` imports `core/trash`; no new cross-layer import.
- Error handling: the cause is logged by `restoreItem` (`trash.service.ts:172`) before the typed re-throw;
  nothing is silently swallowed, and no store is written before the throw.
- Tests for every changed source file: `trash.service.ts` (type + JSDoc) gets the extra assertion in
  `trash.service.test.ts:327`; `event-calendar.service.ts` gets the four cases above.
- Tabs, JSDoc on the changed functions, comments describe the code. Commit 6b3c483d follows docs/COMMITS.md.
- No scope creep: 2 source files, 2 test files, scratch docs.

## Checks run by this review

- `vitest run src/tests/lib/features/event-calendar src/tests/lib/core/trash src/tests/lib/core/settings`:
  41 files, 1309/1309 passed. The test verdict rests on
  `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` and
  `src/tests/lib/core/trash/trash.service.test.ts` (plus the settings suite covering `TrashSection`).
- Red probe described above (4 new tests fail on main's source).
- `pnpm check`: 0 errors, 0 warnings.
- Full gate not run (deliver runs it).

## Findings

1. **Low** `src/lib/features/event-calendar/event-calendar.service.ts:1034-1036` - a failure AFTER the rename
   (in practice `refreshTree` -> `scan_vault` rejecting, `trash.service.ts:154-155`) is now toasted as
   "Could not restore the note from the Trash" although the note is back on disk and its Trash entry was
   already removed (`trash.service.ts:145`). Before, the toast showed the raw error, so the UX gets a false
   statement instead of an opaque one. The calendar-side consequences (delete op refused, tombstone at `path`
   not dropped, no remap) are pre-existing and unchanged. Rare path; discovery recorded it. Fix (follow-up,
   not blocking): make `restoreItem` treat post-rename steps as non-fatal (log, still return `restorePath`),
   matching how it already treats the manifest save, and test it in `trash.service.test.ts`.
2. **Low** `src/tests/lib/features/event-calendar/event-calendar.service.test.ts:2462-2474` - the toast Undo
   case does not assert that the delete op stays in the history after the failed restore, which is the
   `undoDeleteEvent` contract ("The op stays when the restore fails", `event-calendar.service.ts:1088`) and the
   one difference from `restoreDeletedEvent` (`retire`). Fix: add `expect(eventCalendarStore.canUndo).toBe(true)`
   (or compare `eventCalendarStore.history` before / after) to that test.
