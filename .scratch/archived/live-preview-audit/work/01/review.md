VERDICT: APPROVED

Review of `git diff main...HEAD` (75ebb26e, 34f653f3) on branch issue/01-table-empty-cells-dropped.

## Acceptance criteria

- [met] Failing test first: move the table cases of `.scratch/live-preview-audit/repro/interactions/interactions.test.ts` ('+col keeps one table drawn, with three columns', 'renders an empty corner cell and an empty body cell in their columns') under `src/tests/` and see them fail — both cases are removed from the repro file and live in `src/tests/lib/core/markdown-editor/extensions/live-preview/table-empty-cells.test.ts`. I put main's `parsers/table.ts` back in the worktree for one run (and restored it afterwards): both moved cases and 6 of the 8 new parser cases failed (8 failed, 24 passed). On HEAD all 32 pass.
- [met] After +col on `| a | b |` the rendered header has three `th` and every body row three `td` — table-empty-cells.test.ts '+col keeps one table drawn...' clicks `.cm-lp-table-add-col` on the real widget and asserts one wrapper, headers `['a','b','']`, body `[['1','2','']]`. It passes.
- [met] `|  | Mon | Tue |` renders three header cells `['', 'Mon', 'Tue']`, and each body row's cells stay in their columns — the widget test 'renders an empty corner cell...' asserts headers `['', 'Mon', 'Tue']` and rows `[['run','1','2'],['a','','c']]`. The parser test 'keeps an empty top-left header cell in the first column' asserts the same thing on the model. Both pass.
- [met] `| a |  | c |` renders `c` in the third column — the same widget test asserts the row `['a','','c']` from the rendered `td`s, and the parser test 'keeps an empty body cell in its column' asserts it on the model. Both pass.
- [met] Cells holding `[[Note|alias]]`, `\|` or a pipe inside inline code stay one cell; the existing table-widget and table parser tests pass — the new parser tests cover `[[Note|alias]]`, `x\|y` and `` `x|y` ``. My probe also gave one cell for `![[img.png|100]]`, `[[Note\|alias]]` and ``` ``x|`y`` ```. table-widget.test.ts and parsers/table.test.ts pass unchanged.
- [met] A row with more cells than the header keeps today's behavior (extra cells are kept in the source; rendering follows the delimiter row's column count) — the widget test 'a body row with more cells than the delimiter row renders the delimiter count' asserts that 2 columns render and the doc still contains `| 1 | 2 | 3 |`. The existing parser test (rows `[['1','2']]`) passes. `normalizeRow(row, alignments.length)` truncates only the model. +col and +row still do point inserts from the source lines (widgets.ts is unchanged).

## Verification

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- Targeted vitest run, exit 0, 39 files, 729 passed, 1 skipped. The files are `src/tests/lib/core/markdown-editor/extensions/live-preview/table-empty-cells.test.ts`, `table-widget.test.ts`, `plugins/table-field.test.ts`, everything under `parsers/` (table.test.ts and the combined-* table files included), `invariants-harness.test.ts`, `meta-bind-input-redraw.test.ts`, `meta-bind-writers.test.ts`, `src/tests/lib/core/markdown-editor/editor-host.test.ts` and `src/tests/lib/app/editor-host.test.ts`.
- Red check: described under the first criterion.
- I checked the build report's main risk ("Lezer may accept a delimiter row that `parseAlignments` rejects") against `@lezer/markdown` `TableParser`. Lezer only builds a table when the delimiter matches `delimiterLine` (`/^[>\s]*\|?(\s*:?-+:?\s*\|)+(\s*:?-+:?\s*)?$/`) and its `parseRow` count equals the header count. Every cell of such a row passes `SEPARATOR_CELL_RE`, so `alignments.length` equals Lezer's column count, and a table can never come out with 0 columns. The `TableDelimiter` node starts at `line.pos`, so it already excludes `> ` and list indents. My probe confirmed this for list-indented, nested-quote and pipe-less quoted tables.
- The only consumer of `findAllTables` is `plugins/table-field.ts`, which hands the result to `TableWidget`. Nothing writes the parsed model back to the source.
- The full suite and `pnpm build` belong to deliver. I ran neither.

## Findings

1. minor — src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:80. The code span check in `splitRow` searches for its closing backtick run across cell boundaries. A row with one unpaired backtick in each of two cells, e.g. `` | 5` | x | 6` | `` in a 3-column table (prime or feet notation, shell snippets), now comes out as one cell `` 5` | x | 6` `` plus two empty cells. GFM, and the old Lezer `TableCell` path, show three cells. The Issue asks for pipes inside inline code to stay in one cell, so some trade-off is expected here, but this case is not recorded anywhere. Fix: add a parser test that pins the current result and add one line to the `splitRow` JSDoc saying that a code span which crosses a `|` joins the cells. If the owner wants GFM behavior, protect a pipe only when the closing run comes before the next cell-ending pipe that is outside any code span.
2. nit — src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:70. The branch deliberately changes how an unclosed `[[` is handled (it no longer joins the rest of the row into one cell), and discovery.md lists that as a default, but no test pins the new behavior. Fix: add a parser test such as `| [[Note | b |` → `['[[Note', 'b']` under a 2-column delimiter.

## Resolution

1. Fixed (pinned, not changed). Kept the cross-cell code span search: the Issue asks for a pipe inside inline code to stay in one cell, and an unpaired backtick in two cells of one row is rare in the owner's notes. `splitRow`'s JSDoc now says a code span that crosses a `|` joins the cells it spans (GFM would split), and the parser test 'joins the cells a code span crosses when unpaired backticks sit in two cells' pins `| 5` | x | 6` |` -> ['5` | x | 6`', '', ''].
2. Fixed. Parser test 'splits on the pipe after an unclosed `[[`' pins `| [[Note | b |` -> ['[[Note', 'b'].
