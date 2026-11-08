# Issue 45 discovery

No `spec.md` for architecture-stability; the Issue is the spec. Builds on `work/14` (same model
test and fixture); only the differences are listed.

## Files that change

- `src/lib/features/event-calendar/event-calendar.service.ts`
  - :639-656 `writeEvent` rename branch: the target path is known before the rename
    (`renameItem` returns `${getParentPath(path)}/${renameTo}`, fs.service.ts:202-216).
  - :668-670 `holdPath(target, write)`: held only after `renameItem` returns, so a write
    enqueued on the new path during the rename tail runs at once.
- `src/tests/fixtures/calendar-vault.fixture.ts`: `holdNextRenameTail()`, a calendar rename that
  moves the file on disk, then waits on a gate before returning (the link rewrite /
  `refreshTree` / `rename_note` tail of the real `renameItem`).
- `src/tests/lib/features/event-calendar/event-calendar.model.test.ts`: `holdRenameTail` op,
  a named sequence, the generator limit, the file header.

## Plan

1. Test first: named sequence `holdRenameTail`, edit Standup -> "Daily sync" with fields,
   flush, refresh (the index shows the new path), move "Daily sync", release, settle.
   Fails today: the move runs before the edit's field write, the edit's `create` overlay
   overwrites the move's, and after drain + bump the overlay outlives it / the store shows
   the edit's fields over the move's.
2. Fix: in `writeEvent`, hold the planned target path on the queue (a deferred that settles
   when `writeEvent` finishes, success or failure) before `renameItem` runs; drop the late
   `holdPath(target, write)`. Rename + field write become one queued unit on both paths.
3. Lift the limit: `writable` is every shown note (drop `shownBefore`); add a random
   `holdRenameTail` op so the random runs reach the tail. Update the header.

## Prior art

- `work/14` named sequence "an index bump between the rename and the field write (abeec4ee)".
- Fixture `holdNextRename` for the gate shape.

## Defaults / risks

- The outside-rename half of the title stays excluded by the "path changes one at a time"
  limit, which Issue 46 owns; this Issue lifts only the field-write limit its criteria name.
- A rename that fails still releases the held target (the deferred resolves in `finally`).
- Mid-run, a bump during the tail still shows the new path with the old fields until the
  rename returns (the same window as abeec4ee); the end-of-run invariants are unaffected.

## Build findings

- Holding the new path alone (step 2) was not enough: with the limit lifted, seed 165 showed
  writes still queued on the new path for a note renamed away earlier running concurrently with
  the rename unit. Final fix: `joinPath` on the planned path before `renameItem` (the
  `duplicateEvent` pattern); pinned by the "rename onto a path with queued writes" sequence.
- The limit is lifted only while the path change in flight is a calendar edit; creates,
  duplicates, deletes, restores, undo / redo and outside changes keep it (Issues 46-49).
- The lifted generator also reached a calendar rename of a note an outside delete had
  already removed (seed 103): the fixture's `renameItem` wrote `undefined` to disk where the
  real one throws. The fixture now throws `No such file` for a missing source.
