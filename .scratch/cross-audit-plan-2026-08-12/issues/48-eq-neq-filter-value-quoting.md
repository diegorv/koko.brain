# Issue 48: eq/neq filter values also serialize unquoted (same class as issue 05)

Status: ready-for-agent
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

### 2026-08-19 - implementation (commit-step 1/2)

Triage verified the reachability chain in code, not just from the issue text: `inferPropertyType`
returns `'number'` for a numeric sampled value (filter.logic.ts:244) and for `file.size` (:231);
`getOperatorsForType('number')` (:177) lists eq first; `createEmptyFilterRow` (:259-267) and
`FilterRow.handlePropertyChange` (FilterRow.svelte:63-67) both pick `operators[0]`, so `eq` is the
DEFAULT for numeric properties, and the value input (FilterRow.svelte:165-170) is a plain
`<input>` with no numeric constraint. Status flipped needs-triage -> ready-for-agent.

Operator-mapping decision (the `## How` caveat): accept the `is`/`is_not` re-parse. `prop == 'b'`
is byte-identical to what an `is` row emits, so no syntax distinguishes eq-with-a-string from is;
operator preservation is unachievable, not merely unasserted. `mapBinaryOp` is NOT changed (making
`==` yield `eq` would break the text `is` round-trip at filter-logic.test.ts:254). The exhaustive
Record<FilterOperator> round-trip test stays UNMODIFIED and green: its table already uses numeric
`eq: '5'` / `neq: '3'`, which `quoteUnlessNumber` leaves bare, so the issue's prediction that it
"would need its eq/neq expectations adjusted" does not hold against the current test. The
non-numeric mapping gets its own new test that asserts `is` explicitly instead of hiding it.

Red-first evidence (against unfixed code): `quotes non-numeric eq/neq values so they stay literals`
failed with `expected 'status == b' to be "status == 'b'"`; `round-trips non-numeric eq: stays a
visual row and keeps the value` failed at `expect(parsed.raw).toBeUndefined()` with received
`"status == b"`. Side channel designed around: the raw fallback is itself a fixed point
(filterRowToExpression returns `row.raw` verbatim at :38), so a stability-only probe passes against
the bug; the load-bearing assertion is `parsed.raw` toBeUndefined plus explicit property/value.

Plan discrepancy (issue wins per the execution rule): plan-2026-08-12.md line 70 (P0.5) and line 199
(LB7) scope the emitter-side quoting fix to `filter.logic.ts:60-67` (gt/lt/gte/lte only) and call
the exhaustive round-trip test "optional (zero production change)". This issue extends the same fix
to :56-59 (eq/neq), which that line range excludes, and the eq/neq half IS a production change.

Not fixed here (out of scope, recommend follow-up issues): (1) the date cases (filter.logic.ts:68-75)
interpolate into `date('${val}')` with no escaping at all, so a value containing `'` produces a parse
error and a raw-fallback row - same corruption class, different mechanism; (2) no migration for
already-corrupted saved files - a stored bare `prop == b` keeps rendering as a raw-expression row
until the user re-enters the filter.
