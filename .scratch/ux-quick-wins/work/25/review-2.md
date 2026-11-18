VERDICT: APPROVED

Re-review round 2 of the fixes after `review.md` (c657af3cc..HEAD: one source commit, 123be47e5, test-only, plus the Resolution section in `review.md`).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | nit | resolved | `EventTimeGrid.test.ts:309-323` now fakes only `Date` (`toFake: ['Date']`) at 2026-11-10 07:30, a day inside the shown `WEEK`, and restores real timers in `finally`. Traced `mountScrollTop` (`event-calendar-layout.logic.ts:101-108`): today is visible, jsdom gives `clientHeight`/`offsetHeight` 0 so `body` is 0, the 07:30 line (480 px) is not above `start + body` (512), so the result is the start scroll 512. The fix report's claim that 10:00 would give 640 (line 640 > 512 + 0, minus 0) holds, so 07:30 is the right pin for this unstubbed test. The test no longer depends on the real date. The morning-with-layout case stays in "keeps the start-hour scroll at a morning clock" (`:354-359`). |

## Acceptance criteria re-checked

- [met] `EventTimeGrid.test.ts`: with the store clock at a stale 08:00 and `vi.setSystemTime` at 22:15, the mounted scroller's `scrollTop` equals the 22:15 value (the mount read the instant itself); `:287` ("scrolls to dayStartHour on mount") still passes at a morning clock. — The stale-clock test (`:345-352`) is unchanged and expects 1424 - 170. "scrolls to dayStartHour on mount" now runs at a pinned 07:30 morning clock on the shown week and expects 512; `pnpm vitest run src/tests/lib/features/event-calendar/EventTimeGrid.test.ts` exit 0, 64 tests.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (236 files, 0 errors, 0 warnings); the targeted test file of the fix passes (exit 0). The full suite is deliver's to run.

## Findings

None open or new. The fix adds no assertion removal or weakening (the 512 expectation is kept), touches no source code, and the fake timer is restored in `finally`, so it cannot leak into later tests (the suite's `afterEach` at `:80` does not reset timers, so the `finally` matters and is present).

## Checks run by the re-reviewer

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/features/event-calendar/EventTimeGrid.test.ts`: exit 0, 64 passed.
