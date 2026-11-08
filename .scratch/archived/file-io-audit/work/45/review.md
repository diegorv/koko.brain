VERDICT: APPROVED

Review of `git diff main...HEAD` (3552ea3c, 8b26491f, 5e4b559f) on branch issue/45-table-add-buttons-rewrite-loses-bytes.

## Acceptance criteria

- [met] Failing test comes first. Move `.scratch/editor-data-safety/repro/table-and-doc-mutations/table-add-buttons.test.ts` under `src/tests/` (into `src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts` or next to it, fixing the `test-helpers` import path) and see it fail — 8b26491f deletes the repro and adds its cases to table-widget.test.ts (import `../../test-helpers`, which resolves to src/tests/lib/core/markdown-editor/test-helpers, the same path editor-extensions.test.ts and decorator-toggles.test.ts use). I put main's widgets.ts back temporarily and ran table-widget.test.ts: 13 failed, 12 passed. All 13 new tests fail; the old ones pass. Then I restored the branch file, and the worktree was clean.
- [met] `+row` and `+col` on `| apple | 3 | bought at Lidl |` under a two-column header keep `bought at Lidl` in the note (F98) — table-widget.test.ts "F98: cells beyond the header count" (+row and +col) pass. The fix never reads `this.rows`: +col appends at the end of each line and +row inserts after `line(endLine).to` (widgets.ts:462-494).
- [met] With a header holding an unclosed `[[`, `+row` keeps every body cell (the repro's third F98 case) — the test asserts that both `| a | b | done |` and the header line `| Note | [[Link | Status |` survive unchanged, and it passes.
- [met] One click keeps `C:\temp`, `[[Note|alias]]` and `x\|y` byte for byte; repeated clicks do not double backslashes (F99) — the F99 tests pass: `C:\temp` with +row, `[[Note|alias]]` with +row and +col, `x\|y` with +col, plus row/col/row repeated on `C:\temp`. `cellEscape` is no longer on the click path (it survives only inside `renderTableSource`, which has no app caller).
- [met] `+row` on a table inside a `> [!note]` callout keeps `> ` on every table line, including the new row; a table indented two spaces in a list item keeps its indent on every line (F100) — both F100 +row tests assert the exact resulting doc (`... > | 1 | 2 |\n> |  |  |` and `...  | 1 | 2 |\n  |  |  |`) and pass. My probes also passed for nested `> > `, `>` with no space, a tab indent, a quote inside a list item, and a table starting on the list-marker line.
- [met] `+col` on a table with and without outer pipes adds exactly one column to the header, delimiter and every body row; the new delimiter cell repeats the last column's alignment — "+col adds exactly one column" asserts exact docs: `:---:` is repeated with outer pipes, and `---:` is repeated without them, where each line is closed with ` |` first. Both pass. My probe of a pipe-less callout table with `:---: | --- | ---:` also repeated `---:`.
- [met] Every line that existed before a click is unchanged except for the appended cell (`+col`) or is unchanged entirely (`+row`) — the exact-doc `toBe` assertions in the F100, "+col adds exactly one column" and "+row leaves every existing line unchanged" tests compare every line. The code path makes only end-of-content inserts (+col) or one insert at `last.to` (+row).
- [met] The existing `+col` / `+row` tests in table-widget.test.ts still pass (`| name | age |  |`, `| --- | --- | --- |`, `| alice | 30 |  |`, trailing `|  |  |`) — "TableWidget — +col / +row buttons" is unchanged and passes (25/25 in the file).
- [met] The `attachAddButtons` JSDoc describes the point-insert, not the full rewrite — widgets.ts:413-418 now describes point inserts read from the source lines and why the model is not re-serialised.

## Findings

1. minor — src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:486 (and :464). The column count comes from `parseAlignments(doc.line(startLine + 1).text)` on the raw line, including its container prefix. When a table in a blockquote or callout has no leading pipe (`> a | b` / `> --- | ---` / `> 1 | 2`), the first split cell is `> ---`. `SEPARATOR_CELL_RE` rejects it, so the count is one short. Probe: +row writes `> |  |` (1 cell) for a 2-column table. Nothing is lost and GFM pads the short row, so it still renders full width, but the Issue asks for "one empty cell per header". In the same case :464 still picks the right last alignment, because only the first cell is dropped. Fix: strip the prefix before parsing, e.g. `parseAlignments(text.slice(LINE_PREFIX_RE.exec(text)![0].length))`, and add a test with a pipe-less table in a callout.
2. nit — src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts:249. The F100 tests cover +col only in a callout. +col on a list-item table (two-space indent) is not tested. The code path is the same and my probe passed, so this is only a coverage gap.
3. nit — src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts:241. `x\|y` is tested only with +col, and `C:\temp` gets a single-click test only with +row. The criterion says "one click" of either button. Adding the other button to each case would close it.

Not findings, checked:
- renderTableSource is kept for its test callers, and the commit body says so as the Issue asked. Sharing `delimiterCell` with it is a no-op refactor (same mapping), so it is not scope creep.
- The stale `sourceRange` risk is unchanged: `eq()` still compares from/to/startLine/endLine (widgets.ts:390-398).
- Lezer's lazy continuation of a quoted table onto an unquoted row (`> | a |` / `> | --- |` / `| 1 | 2 |`) gives a new row with no `> `. That mirrors the last source line, which is the specified behavior.
- No change to layer-baseline.json, BASELINE_SIZE or composition roots. No src-tauri changes.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts src/tests/lib/core/markdown-editor/editor-host.test.ts src/tests/lib/app/editor-host.test.ts`: exit 0, 3 files, 61 tests passed. These three files are what my test verdict rests on: the changed test file and the test files of widgets.ts / renderTableSource.
- Red check: the branch tests run against main's widgets.ts gave 13 failed and 12 passed.
- Edge-case probes (temporary test file, deleted afterwards): end of doc with no newline, header-only table, nested quote, quote with no space, list-marker-line table, tab indent, quote inside a list, escaped trailing pipe `x\|`, escaped backslash `x\\|`, code span `` `x|` ``, short row, pipe-less continuation row, lazy quote row, table followed by a heading. All kept every existing byte. Only finding 1 came out of them.
- The full suite and `pnpm build` were not run. Deliver runs them.

## Resolution

1. Fixed. `delimiterAlignments()` in widgets.ts strips the `LINE_PREFIX_RE` match before `parseAlignments`, and both +row and +col use it. New tests: +row on a pipe-less callout table writes `> |  |  |`, which failed before the fix, and +col on one repeats the last alignment.
2. Fixed. Added a test for +col on a list-item (two-space indent) table.
3. Fixed. The `x\|y` test also clicks +row now, and a new test does one +col click on `C:\temp`.
