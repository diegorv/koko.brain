VERDICT: APPROVED

# Issue 49 re-review, round 2

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | `restoreNow` (`event-calendar.service.ts:1132-1149`) keeps `deletedOutside` registered in `restoresInFlight` until the `gone` decision. On a match it sets `gone = !(await exists(restored).catch(() => true))`, so a delete of another note at the path no longer tombstones a restored note that is on disk. `exists` is already imported (`:14`) and runs only on a match. `isCurrent()` is still checked before any store write (`:1150`). The new named sequence "an outside delete of another note at the path, recorded while a calendar restore of it is in flight (Issue 49)" (`event-calendar.model.test.ts:875`) is the reviewer's probe. I swapped in the service from 105401b2 (before the fix) and it failed (1 failed, 27 passed). With the branch's service it passes. |
| 2 | minor | resolved (toast part: rejection stands) | `restores()` (`event-calendar.model.test.ts:235`) counts an undo whose top op is a `delete`, or a redo whose top op is a `create`, toward `run.restoring`, which matches `applyNoteOp` reaching `restoreNow` (`service.ts:1245`). With a field write in flight it does not count, which is the conservative choice: an uncounted restore only keeps outside deletes out of the generator, as before. While a restore runs, `outsideDelete` weighs 12 instead of 2. I swapped in main's service: 5 of the 10 random-run tests failed, plus the first named sequence (6 failed, 22 passed). So the random runs now pin the fix as well. The toast undo (`undoDeleteEvent`, `service.ts:1214`) goes through the same `restoreNow` and differs only by `retire`, so leaving it out of the model is acceptable. |

## Acceptance criteria

- [met] A failing named sequence reproduces it first (calendar restore with its rename held, an outside delete on the path, release, one bump) — the named sequence at `event-calendar.model.test.ts:837` fails against main's service (probe, see the table). The test added in this round fails against the pre-fix service from 105401b2 and passes on HEAD.
- [met] After the fix the restored note shows after one bump — the round-2 named sequence (`event-calendar.model.test.ts:875`) keeps the restored `Standup.md` on disk and asserts with `check` after a single `refresh` that the store shows it. It passes on HEAD and failed before 28f81314.
- [met] The model test's generator no longer excludes an outside delete racing a calendar restore, and the model test stays green with `finish` bumping twice only for runs with an outside change — `outsideDeleteOk` admits outside deletes during calendar restores, and undo/redo restores now count as well (`restores()`). The model test file passes, 28/28. `finish` is unchanged by the fixes. Main's service now fails 5 random-run tests.

## Findings

1. **nit**, `src/lib/features/event-calendar/event-calendar.service.ts:1146`: one ordering is still open, and the fix report states it. An outside delete of another note at the path can have its consumer call land only after `restoreItem` returns, with no other recorded delete matching. In that case the store behaves as main does. This is not a regression, and no fix is needed for this Issue. If the model ever reaches it, file a follow-up.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/event-calendar/ src/tests/lib/core/trash/`: exit 0, 32 files, 1167 tests passed.
- Probes against `event-calendar.model.test.ts`, each reverted with `git checkout HEAD --`; the worktree was clean afterwards:
  - (a) the service from 105401b2: the new named sequence fails.
  - (b) main's service: 6 failed (1 named sequence and 5 random-run tests).
- Scope: the fixes touch only the service, its model test and the work folder. There is no layer-baseline, `BASELINE_SIZE` or composition-root change.
- Full suite and `pnpm build`: not run. Deliver runs them.

## Resolution

1. nit (`event-calendar.service.ts:1146`, an outside delete whose consumer call lands only after `restoreItem` returns): accepted as stated, no code change. The store then behaves as main does today, so it is not a regression; the random runs of the model test do not reach this ordering. A follow-up Issue is warranted only if the model reaches it.
