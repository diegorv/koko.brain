# Issue 20: Delete the 11 superseded live-preview parsers

Status: ready-for-agent
Phase: P3 Track A step 1
Source: PONY #1 + #10 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track A — Live preview)
Blocked by: none

## What

Eleven live-preview parsers were superseded by the unified inline pipeline and now only their own
tests keep them alive. Delete them together with the dead halves of `link.ts` / `math.ts`, in one
commit series with **#1 first**, so the 13 shared `combined-*.test.ts` files are edited exactly once
instead of twice. No user-visible change.

## How

- **#1 first, then #10, one commit series.** They share test files; splitting them across two series
  would pay the `combined-*.test.ts` surgery twice.
- Delete the 11 parsers plus their 911 lines of own-test coverage, and the dead `link.ts` / `math.ts`
  halves (the live halves stay).
- Do the 13 `combined-*.test.ts` surgeries **ONCE**: strip the call sites of the dead parsers while
  **PRESERVING every assertion belonging to a surviving parser**. Do not delete a combined file
  wholesale to save effort.
- Any combined file left near-empty after the strip: **check it before deleting outright** — confirm
  no surviving-parser assertion remains in it, then remove it.
- Delete by symbol, never by line range.
- **No doc edits** — ADR-0008 already describes the unified pipeline, so nothing in the docs asserts
  the deleted parsers.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Test collateral (own tests + combined-test surgery) lands in the same commit as the source deletion.
- Stage only the files related to this step (`git add <specific files>`), verify with
  `git diff --cached --stat`.
- One commit per step of the series (#1, then #10), using the repo's full commit format (Context,
  Problem, Solution, Behavior, Files with line ranges).

## Comments
