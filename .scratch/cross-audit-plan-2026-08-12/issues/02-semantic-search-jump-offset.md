# Issue 02: Semantic/hybrid search jump lands at top of file

Status: ready-for-agent
Phase: P0.2
Source: ARCH LB1 (arch 2.2 pre-fix) — plan-2026-08-12.md §P0 — Live-bug surgical fixes
Blocked by: none

## What

Clicking a semantic or hybrid search result puts the cursor at the top of the note instead of at the match. A 1-indexed `lineStart` is passed where a character offset is expected, so the jump is a unit mismatch. Goal: the click lands the cursor on the actual match.

## How

- Write the failing regression test FIRST (failing-test-first is mandatory here), reproducing the wrong landing position from the search-result click path. Then apply the fix.
- Convert the 1-indexed `lineStart` to a character offset via `doc.line(n).from` at `SearchResult.svelte:102` and `SearchResult.svelte:109`.
- Standalone commit; it must land before arch 2.2, which later subsumes this conversion into the typed `openNoteAt` target (`{kind:'offset'} | {kind:'line'}`). The regression test must survive that relocation.
- Do not pre-empt the path-helper work here: `#27`'s call-site flips (including `SearchResult.svelte:64`) belong to P3 Track C, not to this fix.
- No doc or ADR edits.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to this issue (`git add <specific files>`), then verify with `git diff --cached --stat`.
- One commit for this fix, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges). Test collateral lands in the same commit as the source change.

## Comments
