# Issue 07: meta-bind plugin allocates the full doc per rebuild

Status: ready-for-agent
Phase: P0.7
Source: arch 1.1 sub-item — plan-2026-08-12.md §P0 — Live-bug surgical fixes
Blocked by: none

## What

The meta-bind input plugin calls `doc.toString()` on every decoration rebuild, allocating a string copy of the entire document per keystroke in large notes. The user feels it as typing and scrolling lag. Goal: typing in large notes stays smooth with no whole-document allocation.

## How

- Write the regression test FIRST (failing before the fix): pin that the rebuild path no longer materializes the full document string.
- Apply the `doc.toString()` one-liner in `meta-bind-input-plugin.ts`.
- Ship this standalone. It is explicitly INDEPENDENT of the arch 1.1 inline ViewPlugin fold, which is gated on `tasks/todo/audit-vault-and-freeze.md` 0.2/0.3 closing (P5). Do not start the fold here.
- No doc or ADR edits.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to this issue (`git add <specific files>`), then verify with `git diff --cached --stat`.
- One commit for this fix, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges). Test collateral lands in the same commit as the source change.

## Comments
