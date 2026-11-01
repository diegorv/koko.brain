VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | `066c8efc`: `renameAndWrite` (`event-calendar.service.ts:734-736`) strips `current.titled` and sets `titled: true` only when `fields.eventTitle` is a non-empty string. That matches `hasWrittenTitle` in `event-calendar-event.logic.ts:130-133`, and `fields.eventTitle` always comes from `planTitleChange` when a rename is planned (`:678-683`). The failed-write branch (`:765`) honours `current.titled`. The new model sequence (the round-1 probe) and the two service tests fail when I restore the pre-fix `event-calendar.service.ts` from `4f0c5543` (3 failed), and they pass on HEAD. |
| 2 | minor | resolved (documented) | `effb52a3` lists the restore `create` overlay's missing `titled` flag, and the same heuristic in `followFilename`, under discovery.md "Defaults / risks". Round 1 offered this as an acceptable fix. Carrying the flag would need `titled` on the history `EventState`, which is outside this Issue. |
| 3 | nit | resolved | `e336dcac` adds the comment at `event-calendar.service.ts:1004-1005`. It changes no code. |

## Acceptance criteria

- [met] A failing test first: a duplicate with a written title equal to its filename base, renamed outside, keeps its written title in the overlay and the history — the fixes leave this untouched. The named sequence and the store test from `359eede5` still pass on HEAD (event-calendar folder: 29 files, 1118 tests passed).
- [met] An untitled note renamed outside still shows its new filename as its title — the round-1 counterexample (Standup -> "Retro 1" with `event_title`, then calendar rename to `Planning.md` with no `event_title`, then outside rename to Foo) is now the named model sequence "an outside rename of a note whose calendar rename removed its written title (Issue 61)". It passes on HEAD and fails with the pre-fix service. The existing store test for an untitled outside rename also passes.
- [met] Seed 166 passes with one end bump — `seed 166, an outside rename of a titled duplicate, with one end bump (Issue 61)` passes on HEAD (inside the event-calendar folder run).

## Findings

1. **nit** `src/lib/features/event-calendar/event-calendar.service.ts:763`. The comment "keep it visible and undoable on its own" is wrong for a titled note. When the field write fails after the rename, `renamedOnly` equals `before`, so `pushOp` drops the op and the rename cannot be undone. Main already behaved this way for a titled note whose title differs from its base. The fix extends it to a title equal to the base, which replaces an op built on a misread title. This is acceptable for a rare failure path. Fix: reword the comment to "visible, and undoable when its shown title changed" (or similar) at the next edit there.

## Checks run (this review)

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `./node_modules/.bin/vitest run src/tests/lib/features/event-calendar/`: exit 0, 29 files, 1118 tests passed.
- The 18 other test files under `src/tests` that reference `event-calendar`: exit 0, 614 tests passed.
- Red check: with `event-calendar.service.ts` restored from `4f0c5543`, the three tests the fix added fail (3 failed). I then restored HEAD, and the worktree is clean.
- Scope: the fix commits touch only `event-calendar.service.ts`, its service and model tests, and the Issue's work records. No test was weakened or deleted, and nothing was added to the layer baseline or as a composition root.
- I did not run the full suite or `pnpm build`; both are deliver's job.

## Resolution

1. nit (comment at `event-calendar.service.ts:763`): accepted and fixed. Verified that `pushOp` (`event-calendar-history.logic.ts:43`) returns the history unchanged for an `update` whose before equals its after, so a titled note whose field write fails records no undo op. The comment now says the rename-only overlay is undoable only when its shown title changed. Comment-only change.
