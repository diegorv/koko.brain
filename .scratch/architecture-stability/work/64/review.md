VERDICT: APPROVED

## Acceptance criteria

- [met] A failing test first: move Standup to 11-11, settle, a delete whose `deleteItem` rejects, then `undoEventChange()`. The store shows `2026-11-11` (matching the disk) after the failed delete, and the undo returns `{ status: 'done' }` — new test "a failed delete keeps the settled overlay an earlier move left, so that move stays undoable" (`src/tests/lib/features/event-calendar/event-calendar.service.test.ts:1958-1971`) moves Standup to 2026-11-11 (`moveEvent` settles its overlay), makes `rename` (under `deleteItem`) reject, then asserts disk and store both show `2026-11-11`, the 'Move event' op is still on the undo stack, and `undoEventChange()` returns `{ status: 'done', label: 'Move event' }` and writes 2026-11-10 back. Red probe: with main's `event-calendar.service.ts` swapped in, the test fails at the store assertion (`expected { path: '/vault/Standup.md', ... } to match object { date, start, ... }`, exit 1); with the branch's file it passes. The service file was restored with `git checkout HEAD --` and the worktree is clean.
- [met] A failed delete on a note with no earlier overlay still rolls back to the snapshot, as today — `event-calendar.service.ts:1036-1039` calls `dropPending(path)` when `prior` is undefined, which is the same path main takes. The existing test "throws when deleteItem fails, rolling the overlay back" (`event-calendar.service.test.ts:1947-1955`) asserts the note stays on disk, the store shows it with `pending: false` (the snapshot), and the undo stack is empty. It passes on the branch.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/event-calendar/`: exit 0, 29 files and 1119 tests passed. My test verdict rests on these files, mainly `src/tests/lib/features/event-calendar/event-calendar.service.test.ts`, the test file for the one source file this branch changes.
- Red probe of the new test against main's service file: fails as expected (see criterion 1).
- Full suite and `pnpm build` not run: those belong to deliver.

## Correctness notes

- The fix uses the same pattern as Issue 56's `renameAndWrite` rollback (`event-calendar.service.ts:739,759-761`): capture `pendingWrite(path)` before `putPending`, then restore it, or drop the overlay when there was none. `prior` is read after the `saveFileByPath` await, so it is the overlay that is current when the delete overlay replaces it. The per-path queue (`enqueue`) keeps any other calendar write on the path from running between the capture and the restore.
- A `create` prior (a restored or duplicated note the snapshot does not have yet) is now restored as well. On main, a failed delete there drops the overlay and the event disappears until the next index bump. The fix covers this case too, and it is the correct behavior.
- If an index bump in the window prunes nothing (the delete overlay is unsettled and `prior` is out of the map), the restored `prior` keeps its old `settledAtVersion` and is pruned on the next snapshot that matches it. This is the same accepted behavior as Issue 56.
- No scope creep: the branch changes only the service and its test file (plus the workflow's own `work/64/discovery.md`). It makes no layer-baseline or composition-root changes.

## Findings

1. nit: `src/lib/features/event-calendar/event-calendar.service.ts:1023`: the `deleteNow` JSDoc still says "a delete error (the overlay rolled back)". That is still accurate, but "rolled back to the prior overlay, or dropped" would describe the new branch exactly. Optional; it does not block.

## Resolution

1. nit (deleteNow JSDoc wording): not applied. The reviewer marks it optional and confirms "the overlay rolled back" is still accurate (a rollback to the prior overlay, or a drop when there was none, are both rollbacks). Editing the source comment after the review would require a re-review round for a wording-only change.
