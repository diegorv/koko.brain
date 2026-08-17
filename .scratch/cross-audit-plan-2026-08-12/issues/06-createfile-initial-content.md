# Issue 06: createFile indexes new notes as empty

Status: ready-for-agent
Phase: P0.6
Source: ARCH LB5 + arch 0.1 (reduced, module merge dropped) — plan-2026-08-12.md §P0 — Live-bug surgical fixes
Blocked by: none

## What

New kanban, canvas, collection and typed notes are created empty and then overwritten with their real content, so the index captures the empty version and never re-indexes. The note is unsearchable and unlinkable until something else touches it. Goal: new content participates in the vault from the first second.

## How

- Write the failing regression test FIRST: creating a file with initial content must index that content, not an empty document. Confirm it fails before the fix.
- Add an optional `content` param to `fs.service.createFile`.
- Delete the empty-then-overwrite two-step and its comments at the 5 callers: canvas, kanban, collection, type-definitions, note-creator.
- Reduced scope: the arch 0.1 module merge is DROPPED. Do not widen the `openOrCreateNote` seam (ADR-0007).
- Update the affected caller tests and `fs.service` tests in the same commit.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to this issue (`git add <specific files>`), then verify with `git diff --cached --stat`.
- One commit for this fix, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges). Test collateral lands in the same commit as the source change.

## Comments
