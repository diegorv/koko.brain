# Issue 05: Relational filters corrupt .collection and .view files

Status: ready-for-agent
Phase: P0.5
Source: ARCH LB7 + arch 7.2 (reduced) — plan-2026-08-12.md §P0 — Live-bug surgical fixes
Blocked by: none

## What

A relational filter on a non-numeric value (e.g. `status >= "b"`) is emitted unquoted, so it does not round-trip: every write corrupts the saved `.collection` or `.view` file. Goal: saved views stay valid across write/read cycles.

## How

- Write the failing regression test FIRST: a non-numeric relational filter must survive a serialize/parse round-trip. Confirm it fails before the fix.
- Emitter-side fix only: quote non-numeric relational values at `filter.logic.ts:60-67`. This single site covers BOTH the `.collection` and the `.view` write paths, so no per-consumer patching is needed.
- Optional, same commit: an exhaustive `Record<FilterOperator>` round-trip test (zero production change), filed next to L34 in the existing test file.
- This is the reduced form of arch 7.2. Do not build the filter-mapping table variant.
- No doc or ADR edits.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to this issue (`git add <specific files>`), then verify with `git diff --cached --stat`.
- One commit for this fix, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges). Test collateral lands in the same commit as the source change.

## Comments

2026-08-17 — Implemented and validated.

- Red-green evidence: three new tests written first and confirmed RED against the broken emitter
  (serialize emitted `status >= b` / `prop > b`; re-parse degraded the row to raw fallback because
  the bare value tokenizes as an identifier). Green after the fix; full suite 6699 passed.
- Fix: `quoteUnlessNumber(val)` applied at the four relational cases (gt/lt/gte/lte) in
  `filterRowToExpression`. Values matching `/^-?\d+(\.\d+)?$/` stay bare (numeric semantics
  preserved, pinned by the pre-existing "serializes numeric operators without quotes" test);
  everything else goes through the existing `quoteString` escaping.
- Exhaustive `Record<FilterOperator>` round-trip test added (compile-time exhaustive over all 20
  operators), same commit, zero production change beyond the emitter fix.
- Adversarial review (Fable 5): could not refute the changed lines. Confirmed both write paths
  (`.collection` via CollectionView save, `.view` via `buildViewYamlUpdates`) route through the
  single fixed emitter. Confirmed test non-vacuity by revert trace.
- Review discovery filed as follow-up: eq/neq (filter.logic.ts:56-59) are the same corruption
  class and ARE reachable (number-typed property dropdown + free-text value input in
  FilterRow.svelte), contrary to this issue's exclusion premise. Filed as issue 48; out of this
  issue's scope contract.
- Known pre-existing degradations left untouched (also noted by review, none regressions):
  negative values (`-5`) still degrade to raw via unary-minus parse; smart-quote values break
  `quoteString` escaping for all string operators; hand-written quoted numerics lose their
  string-ness on re-serialize. All predate this fix.
