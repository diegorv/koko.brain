# Issue 47 discovery: a write on a created note before `showCreated`

No `spec.md` exists for architecture-stability; the Issue is the spec.

## Files that change
- `src/lib/features/event-calendar/event-calendar.service.ts:887-930` (`createNow`): hold the
  planned path's write queue from `buildContent` until the create is shown.
- `src/lib/features/type-definitions/type-definitions.service.ts:99,131` (`createTypedNote`):
  `buildContent`'s target also carries `path` (`${dir}/${fileName}`), so the caller knows where
  the note lands before the write.
- `src/lib/core/filesystem/fs.logic.ts` + `fs.service.ts:200-202`: a pure `renamedPath(oldPath, newName)`
  that `renameItem` and `writeEvent` (`event-calendar.service.ts:678-679`) both use; the comment goes.
- Tests: `event-calendar.model.test.ts` (header, `fire`, two named sequences),
  `type-definitions.service.test.ts:405-426` (target shape), `fs.logic.test.ts` (`renamedPath`).

## Plan
1. Named sequence first: `holdScan`, `create` Planning, flush (note on disk, `createFile` held in
   `refreshTree`), `refresh`, `move` Planning, flush, `release`, settle, `undo`, `undo`; then assert
   the disk keeps the move after the run and the undo labels are Move then Create. Watch it fail.
2. Fix: in `buildContent` (after the lossy check) `holdPath(target.path, shown)` where `shown`
   resolves in a `finally` after `showCreated`. A move enqueued on the new path while the create
   is in flight then runs after it: it sees the create overlay, writes after it, and records after
   the Create op. Duplicate already does this (`joinPath` of the planned copy path, :955).
3. Lift the limit: `fire` sets `shownBefore = null` for a create and a duplicate as it does for an
   edit; header updated. Run all 300 seeds.
4. Named sequence: the calendar's own rename through the real `renameItem` (a named-only op
   `realRenames` swaps the fixture rename for the real one) racing an outside rename of another
   note during its tail (`holdScan`), then undo both: a wrong own-change mark would remap the
   history on `followPathChange` and leave a mark that swallows a later outside change.
5. `renamedPath` shared helper; test in `fs.logic.test.ts`.

## Defaults taken
- The Issue phrases the fix as "`showCreated` must not clobber a newer overlay". Holding the
  queue means no newer overlay can exist at `showCreated` on the planned path, and needs no
  history reordering (re-ordering `pushOp` would have to place Create under a Move and decide
  what a later redo stack means). Skipping `putPending` when an overlay exists would also be
  wrong: a stale delete tombstone at a re-used path (40a3b8a1 sequence) must be overwritten.
- `createFile` re-dedupes; a same-instant name race moves the note off the planned path, where
  the hold does not cover it. `createTypedNote` already accepts that race; left as is.
- `holdScan` stands in for "create_note delayed": it holds `createFile`'s `refreshTree` after
  the note is on disk, which is the same window (the fixture's `create_note` returns at once).
- For the rename coupling the Issue's "make renameItem return the path" is already true
  (it returns `newPath`); the mark needs the path before the call, so one shared pure helper.

## Risks
- A held path queue while `createTypedNote` runs: nothing in `createTypedNote` waits on a
  calendar queue, so no deadlock; the hold is released in a `finally` on every outcome.
