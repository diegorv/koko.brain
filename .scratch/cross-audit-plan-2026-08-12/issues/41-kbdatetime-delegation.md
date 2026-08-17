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
