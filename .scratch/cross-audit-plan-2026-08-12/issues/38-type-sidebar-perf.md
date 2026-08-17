# Issue 38: Type sidebar lookup/sort performance

Status: ready-for-agent
Phase: P4
Source: ARCH 6.1 (reduced) — plan-2026-08-12.md §P4 — Worth-exploring variants and heavy-collateral PARTIALs

Blocked by: 15-inbox-type-sidebar-cleanup

## What

Arch 6.1 as filed was broad; only one part is a genuine hotspot. Three linear entry lookups should
go through `getEntryByPath`, and `sortViewFiles` should take a `Map` so its comparator stops doing a
scan per comparison. Everything else in 6.1 is optional.

## How

- Swap the **three** linear lookups to `getEntryByPath`.
- Change `sortViewFiles` to take a `Map` and use it in the comparator — **this is the only genuine
  hotspot** in the finding.
- Memoized `visibleEntries` is **optional**; skip it unless it is measurably needed. Do not build it
  speculatively.
- This **rebases free over issue 15's deletes** (the C05 inbox/system-folder deletions) — apply on
  top of them, do not re-derive or resurrect anything issue 15 removed.
- Test collateral in the same commit: sort-order assertions over the `Map` comparator (stable order,
  empty map, missing entry) plus coverage for the swapped lookups, asserting real returned data.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only this change's files (`git add <specific files>`), verify with `git diff --cached --stat`.
- One commit, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments
