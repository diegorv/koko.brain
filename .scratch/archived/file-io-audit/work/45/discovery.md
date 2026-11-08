# Issue 45 discovery: table +row / +col point-insert

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:408-416` `attachAddButtons` JSDoc (describes the full rewrite).
- `widgets.ts:458-491` `buildAppendColumnSource` / `buildAppendRowSource` / `dispatchAppendColumn` / `dispatchAppendRow`: replace the whole-range rewrite with point inserts computed from `view.state.doc` lines `sourceRange.startLine..endLine`.
- `widgets.ts:494-511` `renderTableSource`: no app caller left after the change. Kept, unchanged, for its test callers (table-widget.test.ts fixtures + its own unit tests, editor-host.test.ts, app/editor-host.test.ts). Moving it would touch three test files for no behavior gain.
- `src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts`: gains the repro (moved from `.scratch/editor-data-safety/repro/table-and-doc-mutations/table-add-buttons.test.ts`, which is deleted; import becomes `../../test-helpers`) plus new cases.

## Plan

1. Move the repro into table-widget.test.ts, see F98/F99/F100 fail.
2. `+row`: one change at `line(endLine).to` inserting `\n` + prefix + `|` + `  |` per column. Prefix = leading run of whitespace and `>` on the last table line (`/^[\s>]*/`), e.g. `> `, `  `.
3. `+col`: one change per line `startLine..endLine`, at the end of the line's content (before trailing whitespace). Header/body: `  |`; delimiter (line `startLine + 1`): ` <sep> |` repeating the last alignment. A line whose content does not end in an unescaped `|` gets ` |` first.
4. All changes in one `view.dispatch` with the existing `userEvent` values.
5. Tests: F98 x3, F99 x3 (+ repeated clicks), F100 callout + list indent, +col with/without outer pipes and alignment, every pre-existing line unchanged except the appended cell. Existing +col/+row tests stay green.

## Prior art

- Repro file above (`clickAdd` helper using `mountMarkdownView` + real `computeTables`).
- Existing `TableWidget — +col / +row buttons` describe in table-widget.test.ts.

## Defaults taken

- Column count for the new row and the alignment for the new delimiter cell are read from the delimiter line in the source (`parseAlignments`), not from the parsed `headers`. That is the GFM column count, so the F111 case (`| Note | [[Link | Status |`) gets 3 new cells, matching what renders.
- Trailing-pipe check treats `\|` at line end as escaped (no trailing pipe). A pipe inside a trailing inline code span is not special-cased.

## Risks

- The doc at click time must match `sourceRange`; already guaranteed by `eq()` rebuilding on any range move (unchanged).
