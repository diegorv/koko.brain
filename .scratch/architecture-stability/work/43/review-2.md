VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|---|---|---|
| 1 | blocker | resolved | b7a52d54 adds `sizes: Map<Node, number>` in `foldUnquotedWikilinks` (properties.logic.ts:84-99), so each target is sized once. I checked that the cached size cannot go stale: a target is only mutated while its own subtree is visited, and any alias visited inside that subtree is the chain's leaf (size 0, never replaced) or sits in a list with several items (size 0, item count unchanged by a replacement). So every later lookup sees the same size. Test properties.logic.test.ts:387 (depth-500 non-chain target, 50,000 aliases, `[]`, < 2000 ms) passes. |
| 2 | minor | resolved | 782b8ef4 wraps the property build in `computeAndCache` in a `try` whose catch caches `UNPARSEABLE` (properties.logic.ts:249-271). So `isFrontmatterUnparseable` no longer throws on `a: &x [*x]`. Test :1033 checks both `isFrontmatterUnparseable` (true) and `parseFrontmatterProperties` (`[]`). The JSDoc of `isFrontmatterUnparseable` lists the case. |
| 3 | nit | resolved | Test :397 checks 10,000 copies → 10,001 properties (last one `k9999: X`) and 10,001 copies → `[]`. |
| 4 | nit | resolved | Test :1020 spies on `console.warn`: a `!foo` block, a parse, then `isFrontmatterUnparseable` gives exactly one warning. That proves the parse is shared without relying on timing. The timing test at :1004 is unchanged. |

## Acceptance criteria re-checked

- [met] A failing test first, for each shape in the table: N aliases to one anchor, a deep chain with many aliases, and an alias chain. Each finishes well under a second (assert a bound loose enough not to flake on CI, for example 2 s), and the over-budget shapes parse to `[]`. — The four tests from 4a2f6e05 are unchanged, and the fixes add the depth-500 non-chain shape (:387) with the same 2 s bound and `[]`. All of them pass in my run.
- [met] The existing Issue 39 and 41 tests pass unedited, including the 13 anchor and alias cases the review ran (add the ones that are not already tests). — The diff from 0e0b9187 to HEAD on the test file only adds lines (hunks at :381 and :1017). properties.logic.test.ts passes.
- [met] `isFrontmatterUnparseable` does not pay the full cost a second time on a panel commit (share the parse, or reuse the cache). — The cache reuse is unchanged. The new catch path also caches `UNPARSEABLE`, and test :1020 proves the parse is shared without timing.
- [met] The ADR 0029 amendment states the budget and drops "harmless". — The fixes do not touch the ADR. docs/adr/0029-frontmatter-yaml-canonical-form.md:107 still names `ALIAS_COPY_BUDGET`, and `grep -c harmless` gives 0.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/properties .../live-preview/core/frontmatter-slice.test.ts src/tests/lib/features/collection/toolbar/properties-logic.test.ts .../live-preview/meta-bind-writers.test.ts .../live-preview/meta-bind-input-widgets.test.ts`: exit 0, 17 files, 665 passed, 1 skipped.
- Deliver runs the full suite and `pnpm build`; I ran neither. Nothing under src-tauri/ changed. The layer baseline and `BASELINE_SIZE` are untouched. The fixes stay in scope: only properties.logic.ts, its test file and the review file changed.

## Findings

None open or new.
