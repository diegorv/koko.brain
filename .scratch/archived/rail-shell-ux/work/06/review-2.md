VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | rejection stands | Not a criterion; the null-item round trip is pinned by an existing filter-logic.test.ts test and a real fix needs a row-level error carried through the toolbar. Reasonable follow-up, not a blocker. |
| 2 | minor | rejection stands | The message quotes the JSON text, so the key is visible; the criterion's letter holds (round 1 marked it met). Wording belongs with Issue 10's rail rendering. |
| 3 | nit | resolved | 264a63ef4: `collection.types.ts:1` adds `import type { ViewType } from './yaml-parser'` and line 33 is `type: ViewType`. `ViewType` is derived from `VIEW_TYPES` (`yaml-parser.ts:241-244`), so the accepted list, the parse message and the type now share one constant. `yaml-parser.ts:2` imports `collection.types` type-only too, so the cycle is type-only and erased at build. Extension-less relative import matches the file's neighbours (`yaml-parser.ts:2`). `pnpm check` passes, so no consumer relied on the old union being wider or narrower. |
| 4 | nit | rejection stands | `FormulaEntry.error` predates the branch; removing it touches the `updateFormulaEntry` tests. Deferring is fine. |
| 5 | nit | rejection stands | Predates the branch and is outside the criteria. |

## Acceptance criteria re-checked

- [met] A view with `type: tabel` fails to parse with a message listing `table`, `calendar`, `linear-calendar`; a view with no `type` keeps today's `View at index N is missing "type"` error (the existing `yaml-parser.test.ts` test 'returns error when view is missing type' stays green); `help/documentation/12-collection.md:35` no longer calls `table` the default and says `type` is required (logic test plus help line) — the fix only retypes `CollectionViewDef.type` to `ViewType`; runtime validation at `yaml-parser.ts:50-55` is unchanged. `yaml-parser.test.ts` passes (part of the 11-file targeted run below). The Issue's Notes ask for one constant shared with `ViewType`, which this fix completes.

## Findings

None open or new.

## Checks run by the reviewer

- Fix diff since the review file was added (`0ed12d92a..HEAD`): `collection.types.ts` (+3/-1) and the review's own Resolution section. No test weakened or deleted; no scope creep. `layer-baseline.json` and `BASELINE_SIZE` untouched.
- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on `yaml-parser.test.ts`, `collection-logic.test.ts`, `CollectionView.test.ts` and `src/tests/lib/architecture`: exit 0, 11 files, 251 tests passed.
- The full suite and `pnpm build` are deliver's to run; not run here.
