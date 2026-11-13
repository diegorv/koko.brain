# Issue 46 discovery

No `spec.md` for architecture-stability; the Issue is the spec. Builds on `work/14` and `work/45`
(same model test and fixture); only the differences are listed.

## Files that change

- `src/lib/features/event-calendar/event-calendar.service.ts`
  - :365 `ownPathChanges = new Set<string>()`: bare `from` paths.
  - :556-564 `asOwnPathChange(path, change)`: marks the path for the whole rename / delete,
    including the path-change tail (link rewrite, `refreshTree`, `rename_note`, `forgetNote`).
  - :583 `followPathChange`: `if (ownPathChanges.has(from)) return;` skips ANY change from
    a marked path while the calendar's change is in flight, not only the calendar's own.
  - Callers: :683 (rename, target `${getParentPath(path)}/${renameTo}`), :966 (delete, `to = null`).
- `src/tests/fixtures/calendar-vault.fixture.ts`: `holdNextScan()`, holds the next `scan_vault`
  (the `refreshTree` of `applyPathChange`'s tail, after the consumer fan-out).
- `src/tests/lib/features/event-calendar/event-calendar.model.test.ts`: `holdScan` op, a named
  sequence, the generator limit, the file header.

## Plan

1. Test first: named sequence: `holdScan`, delete Standup, flush (the delete is in its tail,
   Standup is in the Trash), outside rename Retro -> Standup, flush, outside rename Standup ->
   Planning (from = the marked path, skipped today), release, settle. Expected to fail: the store
   keeps the event at Standup / misses Planning after drain + bump.
2. Fix: key the marker to the change: `asOwnPathChange(from, to, change)` adds a `{ from, to }`
   record; `followPathChange` skips only a call matching a record's `from` AND `to`, and
   consumes that record (`applyPathChange` calls each consumer once per change), so every later
   change on the same path is followed.
3. Lift the limit: an outside rename / delete may start while the only path changes in flight
   are calendar deletes (track `run.deleting`); random `holdScan` op so the runs reach the tail.

## Prior art

- `work/45` named sequence "write during the rename tail" and fixture `holdNextRenameTail`.

## Defaults / risks

- An outside change identical to the calendar's own (same from and to) landing during the
  calendar's disk op would consume the mark first; the calendar's own disk op then fails on the
  missing file and rolls back. Not handled further (rare, visible, recoverable).
- Only the outside-change limit for calendar deletes is lifted; renames by the calendar run on
  the mocked `renameItem`, which never reaches the consumer.

## Build findings

- The planned sequence passed the end-of-run invariants on the old code: a bump re-projects the
  disk, so the skipped rename only showed in the history. The named sequence adds a move of Retro
  before and two undos after; on the old code the second undo ("Move event") targets the note
  restored at Standup and is refused. Passes with the fix.
- Fixture helper is `holdNextScan()` (op `holdScan`); the random runs reached an outside change
  during a calendar delete 112 times over the 300 seeds (counted with a temporary probe).
- Not fixed, outside this Issue: mid-run (before a bump), an outside rename onto a path whose
  calendar delete overlay is still unsettled does not show the moved event (`remapPath` keeps a
  held unsettled `delete` at `to`); the next bump shows it.
