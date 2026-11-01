VERDICT: APPROVED

# Re-review (round 2): Issue 01, a note's day has one rule

Fix commits reviewed: `149b657a` (code and tests) and `ce0e8268` (resolution notes), i.e. `git diff 18d57561..HEAD`. The fixes touch only `src/lib/utils/note-date.ts`, `src/tests/lib/utils/note-date.test.ts` and `review.md`. No scope creep.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `parseDateKey` (`src/lib/utils/note-date.ts:22-41`) now takes only strings matching `DATE_STRING_PATTERN`, checks the day exists with a local `Date` round-trip, and returns null for every number. The disk time is formatted directly in `noteDateKey` (`note-date.ts:48-53`). Every probe value from round 1 (`2026-02-30`, `2026-13-01`, `Meeting 12`, `tbd 2026`, `Oct 27`, numeric `2026`, `created: 0`) is now a fall-through test in `note-date.test.ts:45-55`, and they pass. A leftover edge case with an out-of-range offset is new finding 1 (minor). |
| 2 | nit | rejection stands | Not a regression. The old `fileFilesystemKeys` had the same scan-only disk-time gap. Moving it to the Day/Today lens Issue is reasonable. |

## Acceptance criteria re-checked

- [met] Logic test first: `date` wins over `created`, `created` over the disk time; an unparseable value falls through to the next source and never throws; a note with no source has no day — the precedence, no-source and never-throws tests are still there. New fall-through tests cover the lenient values from round 1 and pass under `TZ=America/Sao_Paulo` and `TZ=Asia/Tokyo`. One rare input (an offset like `+99:99`) still slips through, see finding 1. It is minor and does not block this criterion.
- [met] Editing a note's `date` moves it to the new day without a restart (the incremental update path, not only the full scan) — `updateCalendarForFile` (`calendar.service.ts:79-92`) still calls `noteDateKey`. The calendar service tests pass (part of the 210/210 run below).
- [met] Regression test: a note with only frontmatter `created` and a later disk time stays on its `created` day — the scan and incremental-path tests in `src/tests/lib/plugins/calendar` still pass. The disk time is now read in `noteDateKey`, and `note-date.test.ts:57-60` checks that it reads as a local-time timestamp.
- [met] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter — the changed tests are pure-function tests with no mocks. Happy cases (space, seconds, milliseconds, UTC offset), empty cases (null, undefined, empty string) and error cases (impossible days and times, prose, numbers, invalid Date) are covered. The removed timestamp and Infinity tests now check the new contract: `parseDateKey` returns null for numbers (`note-date.test.ts:106-110`), and the disk-time path is tested through `noteDateKey`. No test was weakened without a replacement.

## Findings

1. **minor**, `src/lib/utils/note-date.ts:23` and `:40`. The offset group `[+-]\d{2}:?\d{2}` does not check its range. `parseDateKey('2026-10-27T12:00:00+99:99')` passes the regex and the day check, and then `dayjs(value).format(...)` returns the string `"Invalid Date"`, not null. I saw this in a probe under `TZ=America/Sao_Paulo`. That breaks the `string | null` "never a non-day" contract, and the calendar would file the note under an `"Invalid Date"` key instead of falling through to `created`. The input is rare in real frontmatter. Fix: in the offset branch, return `parsed.isValid() ? parsed.format('YYYY-MM-DD') : null`, or limit the offset in the regex to `(?:[01]\d|2[0-3]):?[0-5]\d`. Add a fall-through test.
2. **nit**, `src/lib/utils/note-date.ts:37-38`. Years `0000`-`0099` always fail the round-trip check, because `new Date(y, m, d)` maps years 0-99 to 1900-1999. So `0050-01-01` falls through and is not accepted. This is harmless, since nothing real is dated then. No change needed.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `TZ=America/Sao_Paulo pnpm vitest run src/tests/lib/utils/note-date.test.ts src/tests/lib/plugins/calendar src/tests/help`: exit 0, 10 files, 210 tests passed.
- `TZ=Asia/Tokyo pnpm vitest run src/tests/lib/utils/note-date.test.ts`: exit 0, 25 tests passed.
- Probe: a temporary vitest file ran `parseDateKey` on offset and edge inputs. Results: `+0530`, `+05:30`, `Z`, `-03:00` and 7-digit fractions all give the right day. `+99:99` gives `"Invalid Date"` (finding 1). `0050-01-01` gives null (finding 2). The file is deleted and the worktree is clean.
- I did not run the full suite or `pnpm build`. Both belong to deliver. There are no `src-tauri/` changes, so I did not run cargo.

## Resolution

1. Fixed. In the offset branch `parseDateKey` now returns `null` when dayjs reads the value as an invalid instant, so `2026-10-27T12:00:00+99:99` falls through to `created`. The value was added to the fall-through test in `note-date.test.ts` (seen failing with `'Invalid Date'` before the fix).
2. Not changed, as the review says: years 0000-0099 falling through is harmless.
