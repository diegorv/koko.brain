VERDICT: APPROVED

# Issue 46 review


## Acceptance criteria

- [met] A failing named sequence reproduces it first (calendar delete with its tail held, an outside rename onto the deleted path) — `event-calendar.model.test.ts:718-737` "outside renames onto and off a path while the calendar delete of it is in its tail (Issue 46)": `holdScan` holds the `refreshTree` of the delete's tail, then outside renames Retro -> Standup (onto the deleted path) and Standup -> Planning. Probe: in a throwaway worktree at HEAD with `event-calendar.service.ts` checked out from `main`, the model test file fails on exactly this test (1 failed, 22 passed) with `no undo or redo is refused: expected [ '#13 undo Move event' ] to deeply equal []`.
- [met] After the fix the outside change is followed and the store equals the vault after drain + bump — with the fix the same sequence passes. `runSequence` ends in `finish()` (`event-calendar.model.test.ts:381-420`), which releases every gate, drains, bumps twice (the log has `outside*` ops) and asserts no pending overlay, `shownEvents()` equal to `project(vault.diskEntries())`, and no refused undo. The two undos (restore Standup, then undo the move of the note now at Planning) prove the history followed the outside rename, which the end-state check alone would not (a bump re-reads the disk).
- [met] The matching generator limit is lifted — `randomStep` now allows `outsideRename` / `outsideDelete` while `run.movingPaths === run.deleting` (`:462`, `:479-480`), tracked by `run.deleting` in `fire()` (`:240`, `:245`), adds a random `holdScan` op (`:487`), and drops (46) from the header's list of open races (`:12-26`). Probe: an uncommitted counter in the throwaway worktree recorded 73 `outsideRename` and 41 `outsideDelete` started while a calendar delete was in flight over the test file (112 from the random seeds, 2 from the named sequence); all 23 tests pass.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/event-calendar/ src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts`: exit 0, 30 files, 1162 tests passed. The test verdict rests on these files, chiefly `event-calendar.model.test.ts` (changed), `event-calendar.service.test.ts` (tests of the changed service, including "undoes and redoes its own title rename through the real rename" and "keeps the ops of its own delete, ..." which run the real `renameItem` / `deleteItem` with the consumer registered, so the `{ from, to }` mark still matches the calendar's own changes), and `app-lifecycle.service.test.ts` (registers the consumer). `calendar-vault.fixture.ts` has no users outside `features/event-calendar/`.
- Pre-fix probe described above (throwaway worktree, removed afterwards).
- Full suite and `pnpm build` not run: deliver's to run.

## Correctness notes (no finding)

- The rename mark's `to` (`${getParentPath(path)}/${renameTo}`, `event-calendar.service.ts:705`) is built with the same `getParentPath` from `fs.logic` and the same template as `renameItem`'s `newPath` (`fs.service.ts:202-203`), and `deleteItem` reports `to: null`, so both own changes match their mark.
- A mark is removed in `finally` when the consumer never fires (`renameItem`'s `oldPath === newPath` early return, a failing `diskOp`), so no mark leaks.
- `applyPathChange` calls each consumer once per change (`path-change.service.ts:139-145`), so consuming the mark on the first match is sound.
- No layer-baseline, composition-root, ledger or `src-tauri/` change.

## Findings

1. nit — `src/lib/features/event-calendar/event-calendar.service.ts:705` — the rename target is spelled out a second time (also `:678` for `joinPath`) and must equal `renameItem`'s internal `newPath` byte for byte; if either drifts, the mark never matches and the calendar's own rename is followed a second time without any test necessarily failing. Fix (optional): compute the target once in `writeEvent` and pass it to `renameAndWrite`.
2. nit — `.scratch/architecture-stability/issues/46-calendar-own-path-changes-keyed-by-path.md` — the Issue says the rename onto the deleted path is skipped, but the pre-fix check `ownPathChanges.has(from)` only skipped a change whose `from` was marked: the rename off the deleted path (Standup -> Planning). The named sequence covers both, so no code change; mention it in the closing commit so the record matches the actual bug.
3. nit — `src/tests/lib/features/event-calendar/event-calendar.model.test.ts:240` — `run.deleting` counts only the `delete` op, so an outside change never starts during a calendar delete run by an undo of a create or a redo of a delete. Conservative and within this Issue's scope; no change required.

## Resolution

1. Fixed: `writeEvent` computes the rename target once (`renamedPath`) and passes it to both `joinPath` and `renameAndWrite` (now `rename: { name, path } | null`), so the own-change mark and the queue key cannot drift apart. Behavior unchanged; event-calendar tests and `pnpm check` green.
2. Accepted, no code change: the closing commit records that the pre-fix `has(from)` check skipped the outside rename off the deleted path (Standup -> Planning); the named sequence covers both directions.
3. Accepted as is: conservative, within scope, no change.
