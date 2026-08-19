# Issue 41: KBDateTime — delegate the safe six to dayjs

Status: ready-for-agent
Phase: P4
Source: PONY #14 — plan-2026-08-12.md §P4 — Worth-exploring variants and heavy-collateral PARTIALs

Blocked by: none

## What

`KBDateTime` hand-rolls calendar math that the already-installed dayjs does correctly. Delegate only
the six methods where dayjs is a faithful replacement, and keep the formatter hand-rolled — dayjs's
`REGEX_FORMAT` corrupts user-supplied format strings.

## How

- **Pin the current `plus`/`minus` clamping behavior with a new test FIRST**, before touching any
  implementation. That test is the behavior contract for the delegation.
- Delegate **only**: `startOf`, `endOf`, `weekNumber`, `quarter`, `hasSame`, `toISODate`.
- **KEEP `toFormat` hand-rolled.** dayjs's `REGEX_FORMAT` corrupts user format strings — do not
  delegate it, now or as a follow-up.
- Add the required dayjs **plugin `extends`** for the delegated methods (week-of-year / quarter /
  isSame-granularity support). Do not add a new dependency.
- Test collateral in the same commit: the clamping test plus per-method equivalence coverage for the
  six delegated methods (including month-end and week-boundary edges).

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only this change's files (`git add <specific files>`), verify with `git diff --cached --stat`.
- Two commits: (1) the clamping regression test alone, green against today's code; (2) the
  delegation + plugin extends + equivalence tests. Full commit format (Context, Problem, Solution,
  Behavior, Files with line ranges).

## Comments

### 2026-08-19 - done

Two commits, in the order the issue mandates.

**Commit 1 (54cbf5a9)** - `plus`/`minus` clamping pinned alone, green against unmodified code. It is a
characterization test, not a bug reproduction, so red-against-current is impossible by construction;
the playbook's "prove it is red" is satisfied by the mutation check below instead.

**Commit 2 (this one)** - the delegation. Six methods now call dayjs 1.11.21: `startOf`, `endOf`,
`weekNumber`, `quarter`, `hasSame`, `toISODate`. `toFormat`, `MONTHS_LONG`, `MONTHS_SHORT`, `plus`,
`minus`, `tryParse`, the constructor and every getter are untouched. Source drops 61 lines, adds 22
(net -39).

**Red-green evidence**

- New `calendar-math edges (dayjs delegation)` suite run against the UNMODIFIED source: 99 passed,
  1 failed - `expected '0NaN-NaN-NaN' to be 'Invalid Date'` at kb-datetime.test.ts:538. That is the
  one genuine behavior change (see below). The other 9 are characterization tests that pin the
  current answers, so they are green before and after by design.
- After the delegation: 100/100 green in that file.
- Mutation A (would the equivalence tests catch the most likely implementation slip?): dropped the
  `'isoWeek'` mapping from both `startOf` and `endOf` -> 6 failures, including three pre-existing
  ones (`startOf week returns Monday`: expected 16 to be 17) plus both new year-boundary cases
  (`expected '2023-12-31' to be '2023-12-25'`, `expected '2025-01-04' to be '2025-01-05'`). Reverted.
- Mutation B (would commit 1's contract catch a future `plus` delegation?): rewrote `plus()` as
  `dayjs(...).add(...)` -> all 5 clamping assertions fail (`expected '2024-02-29' to be '2024-03-02'`,
  `'2025-02-28'` vs `'2025-03-01'`, `'2025-02-28'` vs `'2025-03-03'`, `'2023-06-30'` vs `'2023-07-01'`).
  Reverted; `git status` shows only the two intended files.

**Gate**: `pnpm check` 191 files 0 errors; `pnpm vitest run` 284 files, 6361 passed 1 todo;
`pnpm build` exit 0. No e2e collateral touched.

**What discovery found**

- The delegation is NOT strictly behavior-neutral, contrary to the issue's "faithful replacement"
  wording. A differential sweep over 1990-2040 x 5 times of day in America/Sao_Paulo,
  America/Santiago, Asia/Tehran and UTC found `endOf` (all units), `weekNumber`, `quarter`,
  `toISODate` and `startOf('day')` zero-diff everywhere, and `hasSame` zero-diff over 120000 random
  pairs. `startOf('week'|'month'|'quarter'|'year')` diverges only in timezones with a midnight DST
  transition (Santiago 250 cases, Tehran 150, Sao_Paulo 145, UTC 0) - and in every one of them the
  OLD code was wrong: it called `setHours(0,0,0,0)` on the source day before shifting the date, so a
  skipped local midnight leaked a 1-hour offset into the result (source Sun Oct 21 1990 01:17 in
  Sao_Paulo gave `startOf('month')` = Oct 01 01:00 instead of 00:00). dayjs builds the target date
  first, then zeroes. Those four units have ZERO in-repo call sites, so nothing in the app can
  observe the fix; it is reachable only from a user queryjs script. No DST test was added - the
  correct answer depends on the machine timezone and `vitest.config.ts` pins none, so it would flake.
- Second divergence, found in review and NOT covered by the 1990-2040 sweep: years 0-99. dayjs
  rebuilds the date with `new Date(this.$y, m, d)`, and JS maps a 0-99 year argument to 1900+y, so on
  such a date `startOf`/`endOf` for month/quarter/year jump 1900 years (year 45 -> 1945), `weekNumber`
  returns garbage (-99112) and `hasSame` on month/year can report true across the 1900-year gap.
  `startOf('day')` and `hasSame(_, 'day')` are unaffected, and those are the only units any in-repo
  caller uses (`data-array.ts:79,80,86,102`, `kb-api.ts:125,126,425`), so the app cannot observe it.
  Reachable only from a user script doing `kb.date('0045-06-15').startOf('month')`. Same category as
  the DST divergence: disclosed rather than guarded, since a `setFullYear` fixup would add code for a
  case no caller has. `toISODate` is fine there and is pinned at kb-datetime.test.ts:530-534.
- `toISODate()` on an internally-invalid instance changes from `'0NaN-NaN-NaN'` to `'Invalid Date'`.
  `tryParse` rejects unparseable input before construction, so no internal path reaches it; only a
  direct `kb.date('garbage').toISODate()` does. Pinned with an explicit assertion so it is a decision
  rather than a later surprise.
- Callers traced before touching anything: `data-array.ts:79,80,86` (`startOf('day')`), `:102`
  (`hasSame(_, 'day')`), `kb-api.ts:125,126` (`startOf('day')`), `:425` (`toISODate`). `endOf`,
  `weekNumber` and the `quarter` getter have zero in-repo call sites on a `KBDateTime` - the hits in
  `periodic-notes.logic.ts` and `calendar.logic.ts` are on `dayjs.Dayjs`, a different type.
- `plus`/`minus` must never be delegated: native `setMonth`/`setFullYear` overflow (Jan 31 + 1 month
  = Mar 2) where dayjs clamps (Feb 29). That is exactly what commit 1 guards.

**Plan discrepancies**

- The issue says "Add the required dayjs plugin `extends`". They already existed at
  `src/lib/utils/date.ts:8-12`. Added `import '$lib/utils/date';` for its side effect instead -
  the precedent is `calendar.logic.ts:2` - so registration keeps a single source of truth. It pulls
  in three plugins this file does not need, but all five are already in the bundle.
- The issue lists "isSame-granularity support" among the plugins to add. `isSame(date, unit)` is core
  dayjs, no plugin needed. Only `isoWeek` and `quarterOfYear` are actually required.
- The issue's "faithful replacement" framing is inaccurate for `startOf` on week/month/quarter/year
  (see above). Proceeded because the divergence is a fix with no in-repo consumer.
- Size estimate: the step brief predicted roughly -85 source lines. Actual is -39 (61 removed, 22
  added). The estimate counted the deleted branches without the JSDoc and the `isoWeek` branching
  the delegation needs back.

**Implementation note worth knowing**

`startOf(unit === 'week' ? 'isoWeek' : unit)` does NOT type-check: `ISOUnitType` (from the isoWeek
plugin) covers `'isoWeek'` but not `'quarter'`, and `QUnitType | OpUnitType` (from quarterOfYear)
covers `'quarter'` but not `'isoWeek'`, so a union carrying both matches no overload
(`pnpm check`: "No overload matches this call", kb-datetime.ts:200 and :208). Split into
`unit === 'week' ? d.startOf('isoWeek') : d.startOf(unit)` so each branch resolves against one
overload. No cast needed. Same in `endOf`.

**Follow-ups**: none. `toFormat` stays hand-rolled permanently per the issue.
