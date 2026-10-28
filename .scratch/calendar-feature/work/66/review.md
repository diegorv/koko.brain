VERDICT: CHANGES_REQUESTED

# Review: Issue 66, Calendar path identity across rename, delete and undo

Reviewed `git diff main...HEAD` on `issue/calendar-feature-66-path-identity` (67348869..edb2ee2c).

## What I ran

- `pnpm check`: 0 errors, 0 warnings (211 files).
- `pnpm vitest run src/tests/lib/features/event-calendar src/tests/lib/core/app-lifecycle`: 27 files, 993 tests, all pass.
- Red-first probe: I checked out main's `event-calendar.service.ts` and `EventDialog.svelte` into the worktree, ran the three changed suites, then restored HEAD (`git status` clean). All 10 new service/dialog tests fail on main; the popover test (item 4, verify-only) passes on main, as the build report says.
- Regression probe for finding 1: a throwaway test file (deleted afterwards) showing `findCalendarEvent` returns null for a real event (details below).

The test verdict rests on:
- `src/tests/lib/features/event-calendar/event-calendar.service.test.ts`
- `src/tests/lib/features/event-calendar/EventDialog.test.ts`
- `src/tests/lib/features/event-calendar/EventPopover.test.ts`
- `src/tests/lib/features/event-calendar/EventCalendarView.test.ts` and `ShowInCalendarButton.test.ts` (mock-only change)
- `src/tests/lib/core/app-lifecycle/*` (callers of `resetEventCalendar`)

`e2e/specs/event-calendar-path-identity.spec.ts` was read, not run (the orchestrator runs it on main).

## Acceptance criteria

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | `opsUpTo` stops moving ops left by an earlier note at the path | met (heuristic, see finding 3) | `event-calendar.service.ts:907-919` walks back from the anchor, keeps a `create` and stops before an older `delete`. Tests "a suffixed restore leaves the ops of an earlier note at the old path on it" and "... leaves an earlier delete and the ops before it on the old path" fail on main and pass here. |
| 2 | A suffixed restore without a state drops the stale delete tombstone | met | `:966-969` drops a tombstone (`isPending && !eventByPath`) on any suffixed restore and on a same-path restore without state. `it.each` "a suffixed restore without a recorded delete op / with the recorded state drops the delete tombstone" fails on main for both rows and passes here. |
| 3 | `duplicateEvent` serializes behind writes on the copy's path | met (same-instant race left, as the report says) | `:813-830` plans the name with `generateUniqueName` over the same `readDir` that `createFile` uses (`fs.service.ts:119-122`, same `${parent}/${name}` join), then `joinPath` (`:414-420`). Test "waits for a write in flight on the copy's path before creating the copy" fails on main and passes here. I checked for a queue cycle: the planned path is never an existing file, and the only task that joins another queue is a duplicate on an existing source, so a cycle needs two sources missing from disk while both duplicates run. Not a practical concern. |
| 4 | Popover follows a rename overlay | met (verify-only) | `writeEvent` remaps both stores in one synchronous step (`:571-572`). `EventPopover.test.ts` "follows a rename overlay to the new path instead of closing" passes on main and on HEAD. |
| 5 | EventDialog stays open through its own rename save; success focuses the renamed block; failure stays inline; E2E | met | `EventDialog.svelte:41,48-49,80,122-133`. A failure after the rename lands leaves a `create` overlay at the remapped path (`service:604-613`), so the dialog still finds its event once `savingSession` clears and the inline error stays. Both new `EventDialog.test.ts` tests fail on main and pass here. The E2E spec exists, pins `clockTime` and `timezoneId`, filters the tab locator with `hasText`, and uses selectors that exist (`data-event-dialog`, `data-popover-title`, `data-pending`, `data-time-grid`). It covers the normal rename flow; the race itself is only in vitest. |
| 6 | Undo after a vault switch refused; toast dismissed | met (finding 2 leaves an edge) | `resetEventCalendar` dismisses the tracked ids (`:328-329`). The Undo is gated by `generationCheck()` (`:1195,1208`). `resetEventCalendar` runs only from `initializeVault` and `teardownVault` (`app-lifecycle.service.ts:147,617`), so nothing else dismisses the toasts. Both new tests fail on main and pass here. |
| 7 | `lookupCalendarEvent` returns `{ event: null }` for a tombstone in a stale store | met as written, but it regresses a real case (finding 1) | `:215-219`; test "finds nothing at the old path of a rename or delete tombstone in a stale store". |
| 8 | Wording of the throttled-bump lag | met | `openEventInCalendar` JSDoc `:244-246`. |

CLAUDE.md checks: no layer violations (feature imports `core/filesystem/fs.logic`, which is allowed). Every changed source file has test changes. No stores or `.logic.ts` mocked. Tabs used. No scope creep beyond the 8 items. Issue 49's undo code is touched only inside `opsUpTo`, `restoreNow` and `duplicateEvent`, as asked.

## Findings

1. **Medium**, `src/lib/features/event-calendar/event-calendar.service.ts:219`. In the stale-store branch, a pending tombstone always wins, but a stale store never prunes because it reloads only while the Calendar view is mounted. Example: an event is deleted through the calendar, which leaves a settled `delete` with `settledAtVersion`. The user closes the Calendar tab, then restores the note from the Trash panel or creates a new note with the same name. The tombstone is still in the store, so `findCalendarEvent` returns null and "Show in Calendar" disappears for a real event until the Calendar is reopened. On main the lookup fell through to the fresh snapshot and found it. Probe: load the store at version 1, `putPending({ kind: 'delete', path: P('Standup'), settled: true, settledAtVersion: 1 })`, bump the version to 50, and have the entries list `Standup`. `findCalendarEvent(P('Standup'))` returns `null` (`AssertionError: expected null to match object { date: '2026-11-20' }`). **Fix:** honor the tombstone only while the store itself would keep it. Expose the pending write (for example `eventCalendarStore.pendingWrite(path)`), and return null only when `prunePending([write], lookupMemo.events, vaultStore.vaultIndexVersion)` keeps it. A settled delete then expires after `settledAtVersion + 2`, as it does on a reload. Turn the probe into a regression test next to the item 7 test.

2. **Low**, `src/lib/features/event-calendar/event-calendar.service.ts:1195-1214`. `deleteEventFromUi` captures `isCurrent` before `await deleteEvent(path)` but shows the "Event deleted" toast without checking it. If a vault switch runs while the delete is in flight, the reset has already dismissed the tracked toasts and cleared the Set. The toast then appears in the new vault and is only dismissed by the next reset, and its Undo always fails with "no longer in the Trash". **Fix:** `if (!isCurrent()) return;` before `toast(...)`, plus a test that resets during a deferred delete and asserts no toast.

3. **Low**, `src/lib/features/event-calendar/event-calendar.service.ts:914` (doc only). The boundary heuristic has a second blind spot that the JSDoc and the report do not name. A note deleted through the calendar (op `d1` stays on the undo stack) and restored outside it (Trash panel) is the same note. If it is deleted again (`d2`) and restored with a suffix, the walk stops at `d1` and leaves that note's own earlier ops on the old path. They then target whichever note holds that path, and their undo is refused by the state precondition, so no wrong write happens, but they are lost. **Fix:** name this limit in the `opsUpTo` JSDoc next to the existing "created outside the calendar" one. No code change needed now; Issue 49 may revisit it.

4. **Nit**, `src/lib/features/event-calendar/event-calendar.service.ts:57,1214`. `deleteToasts` keeps ids of toasts that auto-closed or were dismissed by the user until the next reset. svelte-sonner offers `onDismiss` / `onAutoClose`, which could `deleteToasts.delete(id)`. Optional.

5. **Nit**, `src/lib/features/event-calendar/EventDialog.svelte:107-114`. The edited JSDoc has one over-long line ("so the result still reaches it. When the dialog was closed (or reopened for another"). Rewrap it to match the paragraph.

## Resolution

All five findings accepted and fixed; none rejected.

1. `lookupCalendarEvent` honors a pending write only while `prunePending([write], lookupMemo.events, vaultIndexVersion)` keeps it, via the new `eventCalendarStore.pendingWrite(path)`. The probe is a regression test ("finds a note restored at the path of an expired delete tombstone in a stale store"), next to one that pins a tombstone still within its window.
2. `deleteEventFromUi` returns before the toast when `isCurrent()` is false; test "a vault switch while the delete is in flight shows no "Event deleted" toast".
3. `opsUpTo` JSDoc names both blind spots (replacement outside the calendar; delete, restore outside, delete again).
4. The toast's `onDismiss` / `onAutoClose` remove its id from `deleteToasts`; test "a toast closed by the user or by its timer is not dismissed again on a vault switch".
5. `EventDialog.svelte` `save()` JSDoc rewrapped.
