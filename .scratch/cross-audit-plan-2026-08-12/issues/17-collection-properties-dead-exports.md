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

### 2026-08-18 — done, all nine items landed

| Step | Resolving SHA | Fix rounds |
| --- | --- | --- |
| #23-reduced | `05d6c06f` | 0 |
| #31 | `4c058840` | 0 |
| #19 | `0b3469f0` | 0 |
| #42 | `89bc0892` | 0 |
| #50 | `222f764a` | 0 |
| #35 | `2e79e3de` | 0 |
| #40 | `1ece714c` | 0 |
| #45 | `05fdb9ad` | 0 |
| #71 | (this commit) | 0 |

Per-step gate + review verdict (frontend surface throughout: `pnpm check` + `pnpm vitest run` + `pnpm build`):

- **#23-reduced** `05d6c06f` — gate green. Fable reviewer: could_not_refute, 0 fix rounds. Only `addSort`,
  `finishAllEditing`, `isDurationString` cut; the three C03-struck symbols left untouched.
- **#31** `4c058840` — gate green. Fable reviewer: could_not_refute, 0 fix rounds.
- **#19** `0b3469f0` — gate green. Fable reviewer: could_not_refute, 0 fix rounds. The 5 yaml-quoting `it`s
  were ported to `serializeProperties` rather than deleted, keeping ADR-0029's emitter guards live.
- **#42** `89bc0892` — gate green. Fable reviewer: could_not_refute, 0 fix rounds. Full `mapPriorityFromTodoist`
  range cut (the audited `:41-52` was short, as the issue warned).
- **#50** `222f764a` — gate green. Fable reviewer: could_not_refute, 0 fix rounds.
- **#35** `2e79e3de` — gate green. Fable reviewer: could_not_refute, 0 fix rounds. File itself survives.
- **#40** `1ece714c` — gate green. Fable reviewer: could_not_refute, 0 fix rounds.
- **#45** `05fdb9ad` — gate green. Fable reviewer: could_not_refute, 0 fix rounds.
- **#71** (this commit) — gate green. Fable reviewer: could_not_refute, 0 fix rounds.

Evidence:

- Every item is a dead-export deletion, so the proof obligation is a caller trace, not a red-green pair:
  each symbol was grepped repo-wide (`src/`, excluding its own test file) and had zero production call
  sites before deletion. Where a symbol had a live consumer, the import was re-pointed instead of cut.
- #19's ported `it`s are the red-green surrogate: run against `serializeProperties` they still pin the
  yaml-quoting output, so ADR-0029's guarantees fail loudly if the emitter regresses.
- #71 caller trace: `fuzzyMatch` / `FuzzyMatchResult` had exactly one consumer of the barrel copy
  (`completion.logic.ts:2`), re-pointed to `$lib/utils/fuzzy-match`. After the change, repo-wide grep for
  `FuzzyMatchResult` hits only `src/lib/utils/fuzzy-match.ts`, and every remaining
  `quick-switcher.logic` importer pulls `flattenFileTree` / `filterAndRank` / `getRelativePath` /
  `MAX_RESULTS` / `FileEntry` only. The 50 deleted test lines were a byte-for-byte duplicate of the 9 `it`s
  in the surviving canonical `src/tests/lib/utils/fuzzy-match.test.ts`.

Notes:

- All seven prior steps reviewed could_not_refute by Fable reviewers, zero fix rounds, frontend gates green.
- Minor finding from #19: ADR-0029 cites `serializeProperties` at `properties.logic.ts:202` — stale line
  anchor predating this issue (symbol anchor holds).
- Wording discrepancy on #71: the step brief said "delete the fuzzy-match barrel re-export **file**", but
  there is no separate barrel file. The barrel was a single re-export line inside
  `quick-switcher.logic.ts`; the issue's own wording ("re-point the import at `completion.logic.ts:2`") is
  what was implemented. The issue wins, per the playbook.

Minor findings worth follow-up: none.
