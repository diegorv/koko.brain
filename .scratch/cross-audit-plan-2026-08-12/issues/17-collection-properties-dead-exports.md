# Issue 17: Collection, properties and misc dead exports

Status: ready-for-agent
Phase: P2
Source: PONY #23-reduced #31 #19 #42 #50 #35 #40 #45 #71 — plan-2026-08-12.md §P2 — Safe deletion batch (Type-definitions/inbox/properties), §Conflicts resolved C03
Blocked by: none

## What

The confirmed-dead exports across the collection, properties, kanban, theme and fuzzy-match surfaces,
each deleted with its test collateral. The collection cut is deliberately shrunk per conflict C03:
three of the six originally proposed symbols are load-bearing for a later fix and are struck from
this issue.

## How

- **#23-reduced — ONLY `addSort`, `finishAllEditing`, `isDurationString`** (+ their matching
  describes). **STRUCK per C03:** `removeNoteFromIndex`, `removeRecord`,
  `flushScheduledTagIndexRebuild` are **not** deleted — issue 29 wires them (deleting them would make
  bug M08, phantom collection pages, permanent; `flushScheduledTagIndexRebuild` is a live test seam
  with 3 call sites).
- **#31** lifecycle-filter trio, plus its ~35 test lines.
- **#19** properties trio — **port the 5 yaml-quoting `it`s at test `:668-698` over to
  `serializeProperties`**; they are ADR-0029's only emitter guards and must not be deleted with the
  functions.
- **#42** `mapPriorityFromTodoist` — cut `:30-52`, **not** `:41-52` (the audited range was short).
- **#50** `getContrastTextColor` — cut `:26-37`.
- **#35** `extractAliasesFromContent` — the file itself survives.
- **#40** `removeThemeOverrides`.
- **#45** kanban `strip*` twins.
- **#71** fuzzy-match barrel — re-point the import at `completion.logic.ts:2`; ~48-line duplicate-test
  win.
- Delete by symbol, never by stale line number; re-check each cited symbol before applying.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files for each item (`git add <specific files>`), then verify with
  `git diff --cached --stat`.
- **One commit per item**, each carrying its own test collateral (deleted describes, ported `it`s,
  re-pointed imports). Full commit format (Context, Problem, Solution, Behavior, Files with line
  ranges).

## Comments
