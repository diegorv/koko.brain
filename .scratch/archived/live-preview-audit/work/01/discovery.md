# Issue 01 discovery: table widget drops empty cells

No `spec.md` exists for live-preview-audit; the Issue and `audit-2026-11-02.md` are the source.

## Cause (verified with a Lezer probe)

Lezer GFM emits `TableDelimiter` nodes for each `|` of a header/body row but no
`TableCell` for an empty gap. `extractCells` reads only `TableCell`, so
`|  | Mon |` yields `['Mon']`. Lezer also splits on a `|` inside inline code
(`` `x|y` `` becomes two cells), which the criteria say must stay one cell.

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:75-114`
  `extractCells`: split the row's source (`TableHeader` / `TableRow` slice, which
  already excludes a `> ` or list prefix) on unescaped `|` outside inline code
  spans (closed backtick run) and outside closed `[[...]]`. Drop the blank
  segment before a leading pipe and after a trailing pipe. Replaces the
  `unclosedWikilinkDepth` merge.
- `table.ts:121-160` `findAllTables`: column count = `alignments.length`;
  normalize headers and every row to it (pad / truncate) after the loop.
- `widgets.ts`: no change needed; `TableWidget.toDOM` renders `headers.length`,
  which now equals the delimiter count.

## Tests

- Move the two table cases from `.scratch/live-preview-audit/repro/interactions/interactions.test.ts`
  into a new `src/tests/lib/core/markdown-editor/extensions/live-preview/table-empty-cells.test.ts`
  (same mount helper: `mountMarkdownView` + `livePreviewExtensions`), plus `| a |  | c |`.
- `parsers/table.test.ts`: empty corner / body cell, pipe-less row with empty
  middle cell, `[[Note|alias]]`, `\|`, `` `x|y` ``, extra cells truncated to the
  delimiter count.

## Risks / defaults

- An unclosed `[[` no longer swallows the rest of the row; its pipes split cells
  like any other (matches Lezer and the delimiter count). Default taken.
- An unmatched backtick is literal (CommonMark), so its pipes split.
- +row / +col dispatch code (Issue 45 point inserts) is untouched.
