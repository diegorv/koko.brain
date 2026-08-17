# Issue 48: eq/neq filter values also serialize unquoted (same class as issue 05)

Status: needs-triage
Phase: unplanned
Source: issue 05 adversarial review (2026-08-17) — pre-existing, not introduced by the relational quoting fix

## What

`filterRowToExpression` in `src/lib/features/collection/toolbar/filter.logic.ts:56-59` emits
eq/neq values bare (`${prop} == ${val}`), exactly like the pre-fix gt/lt/gte/lte cases. Issue 05
excluded eq/neq on the premise that a non-numeric value cannot reach them; the review refuted
that premise. Reachability chain: `inferPropertyType` returns `'number'` for a numeric-valued
property -> `getOperatorsForType('number')` offers eq/neq in the same dropdown as gt..lte
(filter.logic.ts:177) -> the value input is a plain free-text `<input>` with no numeric
constraint (`src/lib/features/collection/toolbar/FilterRow.svelte:165-170`). User picks "=",
types `b` -> `prop == b` is written -> `b` re-parses as an identifier -> `extractLiteralValue`
returns null -> raw fallback; semantics silently flip from string equality to
property-vs-property comparison.

## How

- Regression test FIRST (red): `{ eq, value: 'b' }` must serialize to a quoted literal and the
  saved expression must re-parse to a visual row, not raw fallback.
- Candidate fix: apply the existing `quoteUnlessNumber` helper (filter.logic.ts:459-465, added by
  the issue 05 fix) at the eq/neq cases.
- Caveat to decide during triage: quoting changes the round-trip OPERATOR for eq/neq — `==` on a
  string literal re-parses as `is`, not `eq` (mapBinaryOp non-numeric branch, filter.logic.ts:437).
  The serialized file is stable and semantically equivalent, but the exhaustive
  Record<FilterOperator> round-trip test asserts operator preservation and would need its eq/neq
  expectations adjusted for the non-numeric case, or the fix needs an operator-mapping decision.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to this issue, verify with `git diff --cached --stat`.
- One commit, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments
