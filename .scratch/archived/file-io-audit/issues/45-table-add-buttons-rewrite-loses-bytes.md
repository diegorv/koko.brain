# 45: Table +row / +col rewrite the whole table and lose cells, backslashes and container prefixes

**Status:** resolved

Priority: P0 (one click on a `+` button permanently deletes note text, with no prompt)

**What to build:** The live-preview table widget's `+col` and `+row` buttons (src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:408-446) call `dispatchAppendColumn` / `dispatchAppendRow` (:468-482), which replace the whole range `[sourceRange.from, sourceRange.to)` with `renderTableSource(headers, alignments, rows)` (:486-503) built from the parsed model, not from the source. Three byte losses follow:

1. Cells beyond the header count are deleted (F98). `findAllTables` passes every body row through `normalizeRow` (src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:141-143), which slices it to `headers.length` (:54-58). GFM ignores the extra cell when rendering, so the user never sees it, and the first click removes it from the note. A header with an unclosed `[[` merges header cells in `extractCells` (:97-111), shrinks the header count and drops body cells the same way.
2. Raw cell source is escaped a second time (F99). `extractCells` slices cell text straight from the source (:92) and merges `[[Note|alias]]` back with a bare pipe. `cellEscape` (widgets.ts:491) then doubles every `\` and escapes every `|`, so `C:\temp` becomes `C:\\temp` (doubling again on each click), `x\|y` becomes `x\\\|y`, and `[[Note|alias]]` becomes `[[Note\|alias]]`, whose target `WIKILINK_DECORATION_RE` (wikilink/decoration.logic.ts:2-3) reads as `Note\`, so clicking it can create a stray note (live-preview/wikilink-navigation.ts:17-22).
3. Container prefixes are dropped (F100). For a table inside a blockquote or callout (`> | a | b |`) or a list item (two-space indent), `table.from` sits after the marker on the first line (table-field.ts:30-40 hands `table.from`/`table.to` to the widget), and `renderTableSource` emits no prefix, so every line after the first leaves the callout or list, and the new row is written unquoted.

Fix: edit the source minimally and never re-serialise existing cells. `+row`: insert one new line after the last table line (`sourceRange.endLine`), made of that line's prefix (the text before its first `|` or table content, e.g. `> ` or `  `) plus one empty cell per header (`|  |  |`). `+col`: append one cell at the end of every table line from `startLine` to `endLine`: `  |` on header and body lines, and a delimiter cell repeating the last column's alignment (` --- |`, as the current code does) on the delimiter line. A line without a trailing `|` gets ` |` before the new cell so the cell count really grows. Dispatch all of it as one transaction with the existing `userEvent` values (`input.table.add-column`, `input.table.add-row`). A row that already had more cells than the header keeps them; after `+col` its first extra cell shows under the new column, which is expected. Update the `attachAddButtons` JSDoc (widgets.ts:399-407), which says the full rewrite is needed. If `renderTableSource` has no app caller left, say in the commit whether it was kept for its test callers (table-widget.test.ts, editor-host.test.ts, app/editor-host.test.ts) or moved into them.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:399-503, src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:54-58,84-114,141-143, src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:14-46, src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts

- [x] Failing test comes first. Move `.scratch/editor-data-safety/repro/table-and-doc-mutations/table-add-buttons.test.ts` under `src/tests/` (into `src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts` or next to it, fixing the `test-helpers` import path) and see it fail
- [x] `+row` and `+col` on `| apple | 3 | bought at Lidl |` under a two-column header keep `bought at Lidl` in the note (F98)
- [x] With a header holding an unclosed `[[`, `+row` keeps every body cell (the repro's third F98 case)
- [x] One click keeps `C:\temp`, `[[Note|alias]]` and `x\|y` byte for byte; repeated clicks do not double backslashes (F99)
- [x] `+row` on a table inside a `> [!note]` callout keeps `> ` on every table line, including the new row; a table indented two spaces in a list item keeps its indent on every line (F100)
- [x] `+col` on a table with and without outer pipes adds exactly one column to the header, delimiter and every body row; the new delimiter cell repeats the last column's alignment
- [x] Every line that existed before a click is unchanged except for the appended cell (`+col`) or is unchanged entirely (`+row`)
- [x] The existing `+col` / `+row` tests in table-widget.test.ts still pass (`| name | age |  |`, `| --- | --- | --- |`, `| alice | 30 |  |`, trailing `|  |  |`)
- [x] The `attachAddButtons` JSDoc describes the point-insert, not the full rewrite

## Audit evidence (editor-data-safety, 2026-11-02)

Source: editor-data-safety audit (`.scratch/editor-data-safety/audit-2026-11-02.md`, P0 row 12 and P1 row F99, F100), cross-referenced in `.scratch/editor-data-safety/xref-file-io-audit.md` (no existing issue covers the table widget). Code re-read at 1351a35d; the line numbers above are current.

### F98: +row and +col delete cells beyond the header count

- Verdict: CONFIRMED_BY_TEST (P0, likelihood rare)

**How a user hits it.** A table `| Item | Qty |` / `| --- | --- |` / `| apple | 3 | bought at Lidl |` (a pasted table, or a column header deleted by hand) renders with two columns. Hovering the table and clicking either `+` button replaces the table with the parsed model, and `bought at Lidl` is gone. The 2 s autosave writes it. Undo can bring it back only while the tab stays open and the user notices.

**Code trace.** parsers/table.ts:141-143 `rows.push(normalizeRow(row, headers.length))`; :56 `cells.slice(0, columnCount)`. widgets.ts:449-466 build the new table from `this.rows`; :468-482 dispatch `{ from: sourceRange.from, to: sourceRange.to, insert: newSource }`.

**Repro test.** `.scratch/editor-data-safety/repro/table-and-doc-mutations/table-add-buttons.test.ts`, describe `F98`. It mounts the real markdown + GFM language, builds the widget through the real `computeTables`, and clicks the button. Failing assertion: `expect(clickAdd(doc, 'row')).toContain('bought at Lidl')` (and the same for `'col'`). Recorded result: +row writes `| apple | 3 |` plus `|  |  |`, +col writes `| apple | 3 |  |`; the F111 variant (`| Note | [[Link | Status |`) writes header `[[Link\|Status` and drops `done`.

### F99: +row and +col re-escape raw cell text

- Verdict: CONFIRMED_BY_TEST (P1, likelihood occasional)

**How a user hits it.** Any table with a Windows path, a LaTeX cell (`$\frac{a}{b}$`), an escaped pipe, or a wikilink alias. One `+` click rewrites every such cell. The widget shows raw text, so the doubled backslashes are visible and grow on each click. The alias cell's link now targets `Note\`.

**Code trace.** parsers/table.ts:92 slices raw cell source; :97-111 re-merge `[[Note|alias]]` with a bare `|`. widgets.ts:491 `cell.replace(/\\/g, '\\\\').replace(/\|/g, '\\|')` runs over those raw cells at :495 and :500. The existing unit test (table-widget.test.ts:35-38) feeds only unescaped input (`has|pipe`), so it cannot catch the round trip.

**Repro test.** Same file, describe `F99`. Failing assertions: `expect(out).toContain('| C:\\temp |')`, `expect(out).toContain('[[Note|alias]]')`, `expect(out).not.toContain('x\\\\\\|y')`. Recorded result: `| C:\temp |` becomes `| C:\\temp |`, `[[Note|alias]]` becomes `[[Note\|alias]]`, `x\|y` becomes `x\\\|y`.

### F100: tables in callouts or list items lose their prefixes

- Verdict: CONFIRMED_BY_TEST (P1, likelihood occasional)

**How a user hits it.** A table inside a callout (`> [!note]` followed by `> | a | b |` lines) or inside a list item. One `+row` click moves the delimiter and body rows out of the callout or list, so the callout ends after its header row and the table breaks apart.

**Code trace.** table-field.ts:30-40 passes `table.from` (after the `> ` marker) and `table.to` as `sourceRange`; widgets.ts:486-503 joins lines with `\n` and no prefix; :468-482 replace the range, so lines 2..n lose `> ` or the indent. table-field.ts has no container guard.

**Repro test.** Same file, describe `F100`. Failing assertions: `expect(tableLines.every((l) => l.startsWith('> ')), out).toBe(true)` and `expect(tableLines.every((l) => l.startsWith('  |')), out).toBe(true)`. Recorded result: after `+row`, the callout table becomes `> | a | b |`, `| --- | --- |`, `| 1 | 2 |`, `|  |  |`; the list-item table becomes `  | a | b |` then `| --- | --- |` with no indent.

**Fix sketch (all three).** Point-insert the new row and column instead of re-serialising the model; this keeps every existing byte, so it fixes F98, F99 and F100 together.

## Comments

### 2026-11-02 delivery (branch issue/45-table-add-buttons-rewrite-loses-bytes)

Table +row / +col now point-insert the new row or cell instead of re-serialising the table, so cells, backslashes, wikilink aliases and callout/list prefixes are kept byte for byte. Review fixes: delimiter alignment parsing strips the container prefix (pipe-less callout +row), plus tests for list-item +col and +row / +col on escaped cells. Review round 1: APPROVED; fix round ran; round 2: APPROVED (no findings). Tests: pnpm check 0 errors; targeted 3 files / 65 passed; full suite at ba41652c exit=0, 435 files, 10029 passed, 1 skipped, 1 todo (test-logs/file-io-audit/45-deliver.log).
