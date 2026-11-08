VERDICT: APPROVED

# Issue 45 re-review (round 2)

Fixes reviewed: `git diff 00210bb4..HEAD` (4bb4f624, fb655862, 24b5c41c).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `src/tests/fixtures/calendar-vault.fixture.ts:168` now throws `No such file: ${from}` when the source is missing, matching the fixture's `rename` mock (:150) and the real `renameItem` (whose `diskOp` `rename` fails on a missing source). `Run.outside`, its bookkeeping in `fire`, its initialiser in `runModel` and the `writable` filter are gone from `event-calendar.model.test.ts`; the header clause is removed and the `randomStep` comment is back to main's wording. `MODEL_SEED=103` passes (13/13), and the whole directory with all 300 seeds passes, so random runs again cover a field write during an outside change of the same note. discovery.md's note now names the fixture bug. |
| 2 | minor | resolved | `event-calendar.service.ts:653-655` documents that the title is planned before the join and a restore queued on the new path makes the rename fail with its error. The review marked the re-plan optional; documenting it is acceptable. |
| 3 | minor | resolved | `joinPath` JSDoc (`event-calendar.service.ts:430-433`) names the X -> Y / Y -> X mutual wait and the `drainEventCalendarWrites` hang, as the review suggested. |

## Acceptance criteria

- [met] A failing named sequence in the model test reproduces the race first (a rename via edit with the tail held, a bump, then a write on the new path) — the fixes do not touch the named sequences; they still pass on the branch (model file green). The round-1 probe against main's service stands; no service logic changed since (fb655862 is comments only).
- [met] After the fix the store equals the vault after drain + bump, and no later write is lost — `finish()` still checks store == vault and no pending overlay; `pnpm vitest run src/tests/lib/features/event-calendar/` exit 0, 29 files, 1085 tests. Full suite and `pnpm build` are deliver's to run.
- [met] The model test's generator limit for this race is lifted and the random run stays green — the limit the branch had added (`run.outside` filter) is removed, `writable` is `shown` whenever no path change runs or the one in flight is a calendar edit; all 300 seeds pass, including seed 103.

## Findings

None open or new.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/event-calendar/`: exit 0, 29 files, 1085 tests (covers both users of `calendar-vault.fixture.ts`: `event-calendar.model.test.ts`, `event-calendar.service.test.ts`).
- `MODEL_SEED=103 pnpm vitest run src/tests/lib/features/event-calendar/event-calendar.model.test.ts`: exit 0, 13 tests.
- No test weakened or deleted by the fixes; no changes to `layer-baseline.json`, `BASELINE_SIZE` or composition roots; no `src-tauri/` changes.
- Not checked: the full suite, `pnpm build`, the running app (deliver's / out of scope).
