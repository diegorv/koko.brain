# Issue 37: TypeNoteList view pipeline cleanup

Status: ready-for-agent
Phase: P4
Source: ARCH 6.0 (remaining after issue 16 discharged its cache wiring) — plan-2026-08-12.md §P4 — Worth-exploring variants and heavy-collateral PARTIALs

Blocked by: 16-view-parse-cache-wire

## What

Arch 6.0's cache-clear leg was already discharged by issue 16 (the C02 commit). What remains is the
small view-pipeline cleanup in `TypeNoteList`: a reactive effect that should read its inputs
synchronously, a seed marker that never resets, and a comment that no longer describes the code.

## How

- Make the `TypeNoteList` effect read `propertyIndex` / `isIndexReady` **synchronously** (not through
  a deferred/async hop).
- **Reset `seededViewPath` on `contentHash` change** — today it stays set, so a changed view is not
  re-seeded.
- Fix the stale comment in the same file.
- **No store+service pair.** Do not create a new store or service module for this: ADR-0004 forbids
  preemptive store+service pairs, and nothing here needs shared reactive state.
- The cache wiring from arch 6.0 is already done in issue 16 — do not redo it or re-add the clears.
- Test collateral in the same commit: assert the re-seed happens on a `contentHash` change and that
  the effect sees the index-ready value in the same tick, against real store state.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only this change's files (`git add <specific files>`), verify with `git diff --cached --stat`.
- One commit, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments
