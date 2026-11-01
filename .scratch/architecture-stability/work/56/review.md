VERDICT: APPROVED

## Acceptance criteria

- [met] A failing test first: the reproduction above. After the fix the store shows `2026-11-11` (matching the disk), and undoing the earlier move succeeds — `event-calendar.service.test.ts:1013-1027` ("a failed write keeps the settled overlay an earlier move left, so that move stays undoable") runs the Issue's reproduction: move Standup to 11-11, failed drag (`writeTextFile` rejects), then asserts disk `date: 2026-11-11`, store `{ date: '2026-11-11', start: 600, end: 660, pending: true }`, undo stack `['Move event']`, `undoEventChange()` returns `{ status: 'done' }`, and disk and store back at 11-10 09:30. Probe: with `event-calendar.service.ts` swapped for `main`'s version the test fails (2 failed / 230 passed across the service and model files); with the branch's version restored it passes.
- [met] A failed write on a note with no earlier overlay still rolls back to the snapshot, as today — with no prior overlay `prior` is undefined and the branch still calls `dropPending(target)` (`event-calendar.service.ts:752-753`). The existing test "rolls the overlay back and rethrows when the write fails" (`event-calendar.service.test.ts:971-979`, asserts 11-10, `pending: false`, `isPending` false, empty undo) is unchanged and passes.
- [met] The model test generates a failed write after a settled move on the same note (or the named sequence is added to it) — named sequence "a failed drag after a settled move on the same note (Issue 56)" (`event-calendar.model.test.ts:840-859`) with a new named-only `failWrite` op (`:380-383`). It checks the store against the disk after the failed drag and again after the undo, and `finish` asserts no refused undo. It also fails on the `main` service in the probe above and passes on the branch.

## Findings

1. minor — `src/lib/features/event-calendar/event-calendar.service.ts:1018` (`deleteNow`), outside this Issue's scope. A failed delete has the same defect: `putPending({ kind: 'delete', ... })` replaces a settled overlay an earlier move left on the path, and the `catch` then calls `dropPending(path)`. The store shows the stale snapshot, and an undo of the earlier move is refused. Fix: file a follow-up Issue that applies the same capture-and-restore of the prior overlay there, with a service test (move, settle, failed delete, undo -> `done`). This does not block this Issue.
2. nit — `src/lib/features/event-calendar/event-calendar.service.ts:731,752`. If an index bump catches the snapshot up with the prior overlay while the failing write is in flight, `prunePending` would have dropped the prior. The rollback puts it back anyway, so `isPending` reads true for one extra bump. The shown state is identical to the snapshot, and the next `setSnapshot` prunes it (the snapshot matches, or `version >= settledAtVersion + 2`). When the snapshot does not match (an outside edit), the prior would have survived that bump unpruned anyway, so the restore matches what the store would hold had the failed write never run. No change needed.

## Other checks

- Typecheck: `pnpm check` exit 0, 0 errors, 0 warnings.
- Tests my verdict rests on, all run by me: `pnpm vitest run src/tests/lib/features/event-calendar/` exit 0, 29 files, 1096 tests passed. This covers `event-calendar.service.test.ts` and `event-calendar.model.test.ts`, the test files of the changed code and the two files the diff changes.
- Probe: I put `main`'s `event-calendar.service.ts` in place, ran the service and model test files (exit 1, only the two new tests failed), then restored the file with `git checkout HEAD --`. The worktree was clean afterwards.
- Scope: the diff is 6 lines of app code in `renameAndWrite` plus tests, and the rename branch (`target !== path`) is untouched (`prior` is undefined there). The diff makes no layer-baseline or composition-root change and changes no `src-tauri/`. The full suite and `pnpm build` belong to deliver; I did not run them.
- No `.scratch/architecture-stability/spec.md` exists.

## Resolution

1. Accepted, out of scope here as the finding says: filed as Issue 64 (`.scratch/architecture-stability/issues/64-calendar-failed-delete-drops-earlier-overlay.md`, needs-triage), with the service test the finding names as its first criterion. No code change in this Issue.
2. No change, as the finding says: the extra `isPending` bump shows the same state as the snapshot and the next `setSnapshot` prunes it.
