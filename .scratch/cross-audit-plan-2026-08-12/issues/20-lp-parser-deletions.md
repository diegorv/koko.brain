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

### 2026-08-18 - closing

The issue's mandated series landed in the mandated order: PONY #1 first (the 11 parsers + their 911
own-test lines + the 13 `combined-*.test.ts` surgeries, paid ONCE), then PONY #10 (the dead halves of
`link.ts` / `math.ts` and their own-test collateral). The live halves of both files stay.

| Step | Resolving SHA |
|------|---------------|
| PONY #1 - delete the 11 superseded parsers + combined-test surgery | `664cdc03` |
| PONY #10 - delete the dead `link.ts` / `math.ts` halves | this commit |

**Gate + review:**

- **PONY #1** (`664cdc03`) - frontend gate green: `pnpm check` 0 errors, `pnpm vitest run` 282 files
  / 6326 tests passing, `pnpm build` succeeded. Review: Fable 5 sub-agent under the presumed-flawed
  stance, verdict could_not_refute after **1 fix round** (findings from the first pass were applied
  and the delta re-reviewed before commit).
- **PONY #10** (this commit) - frontend gate green, re-run at commit time: `pnpm check` 191 files /
  0 errors / 0 warnings, `pnpm vitest run` 282 files / 6299 tests passing (1 todo), `pnpm build`
  succeeded. Review: Fable 5 sub-agent under the presumed-flawed stance, verdict could_not_refute,
  0 fix rounds.

**Evidence in brief:**

- **Caller trace for every deleted export.** `grep -rn` over `src/` and `docs/` for
  `findMarkdownLinkRanges`, `MarkdownLinkRange`, `findAutolinkRanges`, `AutolinkRange`,
  `findInlineMathRanges` and `InlineMathRange` returns **zero** hits after the change, and returned
  zero hits under `src/lib/` **before** it - the only pre-change references were the own-test
  describes deleted here plus the combined-suite call sites already stripped by `664cdc03`. The
  remaining matches anywhere in the repo are the historical audit artifacts under
  `.scratch/ponytail-audit-2026-08-12/`, which describe the deletion rather than depend on it.
- **Live halves proven live, not assumed.** `findMarkdownLinkUrlAtPosition` ->
  `live-preview/click-handler.ts:3,23`; `findExtendedAutolinkRanges` ->
  `live-preview/inline/handlers/autolink-handlers.ts:4,44`; `findAllBlockMath` ->
  `live-preview/plugins/block-math-field.ts:4,14`. All three keep their own-test describes and their
  combined-suite coverage (`combined-link-image-wikilink.test.ts:2`,
  `combined-block-structures.test.ts:6`). Both surviving files still need `syntaxTree` /
  `EditorState`, so no import was orphaned.
- **Red-green by test-count delta.** The dead-half own-tests removed here are exactly 27 cases (10
  `findMarkdownLinkRanges` + 5 `findAutolinkRanges` + 12 `findInlineMathRanges`), and the suite total
  moves 6326 -> 6299 across the two commits. The deleted describes were the only remaining consumers
  of the deleted exports, which is what made them dead; a revert of the source deletion without the
  test deletion is what the pre-change grep already demonstrated.
- **Combined files untouched by this commit, by design.** The issue requires the shared-suite surgery
  to happen exactly once; `664cdc03` paid it, including the dead-half call sites. Re-checked before
  committing: the two combined suites that still import from `parsers/link` / `parsers/math` import
  **only** surviving symbols, so no dead-half assertion remained to strip and no combined file was
  re-edited.
- **No doc edits**, per the issue: ADR-0008 already describes the unified inline pipeline and nothing
  in `docs/` names the deleted symbols.

**Discrepancy vs the issue text:** none. The issue and the plan's Track A step 1 agree, and the
landed shape matches both (#1 first, #10 second, one commit each, combined surgery paid once).

**Minor findings for follow-up (none blocking):**

- minor - `src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-block-structures.test.ts:265-283`:
  the two retained tests `code block containing inline math syntax` and `code block containing link
  syntax` now assert only `findAllFencedCodeBlocks(...)` has length 1, which makes them near-duplicates
  of their existing `code block containing backticks` sibling. Keeping them is the letter of the
  issue's "PRESERVE every assertion belonging to a surviving parser" mandate and the implementer
  flagged them deliberately; deleting the two `describe`s in a later cleanup would lose no coverage.
  No change required before commit.
