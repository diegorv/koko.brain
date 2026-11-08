# 01: Table widget drops empty cells: +col looks dead and an empty corner cell shifts the columns

**Status:** resolved

**Blocked by:** none

Priority: P1 (tables are a daily feature for the owner; every +col click hits it)

**What to build:** `extractCells` (src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:85-113) builds cells only from Lezer `TableCell` children. Lezer GFM emits no `TableCell` node for an empty cell, so empty cells are dropped and the cells after them shift left. `TableWidget.toDOM` (src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:350-372) then renders `headers.length` columns. Read the cells of every row from its `|` delimiter positions (the `TableDelimiter` nodes, or the row's source split on unescaped pipes that are not inside inline code), emitting `''` for the gap between two delimiters, so a row's cell count matches the delimiter row; use the delimiter row's column count (`alignments.length`) as the table's column count. Keep the Issue 45 point-insert behavior of +row / +col (file-io-audit, 1f0ce850 is the current main), the `[[Note|alias]]` and `\|` handling, and rows with more cells than the header.

**How a user hits it.**
1. Click +col on any table: the source gets a third column (`| a | b |  |`, `| --- | --- | --- |`), but the rendered table still shows two, so the button looks dead until a header is typed into the new cell.
2. A table with an empty top-left cell, `|  | Mon | Tue |` (a weekly habit grid), renders as two columns, Mon and Tue, with the row-label column under Mon and the last data column dropped.
3. A body row `| a |  | c |` renders `c` under the wrong column.

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:54-58,85-114,141-143, src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:332-503, src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts, .scratch/live-preview-audit/repro/interactions/interactions.test.ts

- [x] Failing test first: move the table cases of `.scratch/live-preview-audit/repro/interactions/interactions.test.ts` ('+col keeps one table drawn, with three columns', 'renders an empty corner cell and an empty body cell in their columns') under `src/tests/` and see them fail
- [x] After +col on `| a | b |` the rendered header has three `th` and every body row three `td`
- [x] `|  | Mon | Tue |` renders three header cells `['', 'Mon', 'Tue']`, and each body row's cells stay in their columns
- [x] `| a |  | c |` renders `c` in the third column
- [x] Cells holding `[[Note|alias]]`, `\|` or a pipe inside inline code stay one cell; the existing table-widget and table parser tests pass
- [x] A row with more cells than the header keeps today's behavior (extra cells are kept in the source; rendering follows the delimiter row's column count)

## Comments

- 2026-11-02, branch `issue/01-table-empty-cells-dropped`: `parsers/table.ts` now splits each row on its unescaped `|` (outside wikilinks and code spans), emits `''` for empty cells and normalizes every row to the delimiter row's column count, so +col, an empty corner cell and an empty body cell render in their columns. Review fix round: pinned the cross-cell code span join (JSDoc + parser test) and the unclosed `[[` split (parser test). Tests: pnpm check 0 errors; targeted vitest 3 files, 70 tests passed; full suite at 866cde1a exit=0, 443 files, 10171 passed, 1 skipped, 1 todo, pnpm build ok. Reviews: round 1 APPROVED (2 findings, fixed), round 2 APPROVED (no findings).
