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
