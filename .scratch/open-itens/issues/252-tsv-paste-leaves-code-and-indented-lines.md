# 252: TSV paste leaves code, frontmatter and tab-indented lines alone

**Origin:** split from Issue 061 (part 3, audit finding F121) on 2026-11-12 by the deep dive (`.scratch/open-itens/research/deep-dive-2026-11-12/`). Issue 061's Origin and Migrated-from lines apply; its archived evidence is in `.scratch/archived/editor-data-safety/audit-2026-11-02.md` (P2 table) and `.scratch/archived/file-io-audit/issues/52-live-preview-unrequested-rewrites.md`.

**What to build:** pasting tab-indented text inside a code block, inline code or the frontmatter, or pasting text whose every line starts with a tab, inserts it as typed. It is not turned into a pipe table.

Today `pasteTsvHandler` (src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts:19-40) converts any text that `clipboardToMarkdownTable` accepts, with no look at where the cursor is. `looksLikeTSV` (handlers/paste-tsv.logic.ts:19-26) accepts any text whose first row has two cells, so a leading tab (an empty first cell) passes. Tab-indented Go, Makefile or TypeScript code (this repo uses tabs) pasted into a ` ```go ` fence arrives as a pipe table with an empty first column.

Fix, two parts:

- (a) In the handler, return `false` (default paste) when the selection head is inside a block context (`isInsideBlockContext`, live-preview/core/is-inside-block-context.ts:13, covers `FencedCode` and `CodeBlock`), inside `InlineCode`, or inside the frontmatter block (`findFrontmatterBlock`, parsers/frontmatter.ts:17).
- (b) In `looksLikeTSV`, return `false` when every row starts with an empty first cell (every line begins with a tab): that is indentation, not a table. A spreadsheet range whose top-left cell alone is blank still converts. Update the file header and the `looksLikeTSV` JSDoc (paste-tsv.logic.ts:1-18) to match.

**Blocked by:** none

**Status:** needs-info

**Answered:** owner, 2026-11-12: split out of 061 and parked as needs-info. The validators rated it low-medium impact and medium risk (paste plus live preview), as a second pass after 061.

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`.

**Source:** src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts:19-40; handlers/paste-tsv.logic.ts:1-26; live-preview.ts:104 (handler order); core/is-inside-block-context.ts:13; parsers/frontmatter.ts:17; the `F121` describe in `.scratch/archived/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts:72-104`; src/tests/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.test.ts.

- [ ] Failing tests first: move the `F121` describe of `.scratch/archived/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts` into a new jsdom test, `src/tests/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.test.ts` (test-helpers import `../../../test-helpers`), and see it fail.
- [ ] A real paste event of `\tif err != nil {\n\t\treturn err\n\t}` inside a ` ```go ` fence inserts the code verbatim (full-doc equality); the same paste into frontmatter, an indented code block or inline code is not converted either.
- [ ] `clipboardToMarkdownTable('\t- child one\n\t- child two')` returns `null`; a TSV whose first row alone starts with a tab (blank top-left cell) still converts to a table.
- [ ] A plain two-column TSV pasted into body text still converts, as one `input.paste` transaction.
- [ ] Existing TSV tests still pass.

## Notes

- Read `docs/agents/live-preview-rules.md` before changing these files.
- The trigger is tab-indented code copied from elsewhere. The editor sets no `indentUnit` (`setup/editor-extensions.ts` has only `indentWithTab`), so CodeMirror indents with two spaces and list lines copied from the app carry tabs only when the note already has them (validate-s3+s4).
- `pasteHtmlLinkHandler` runs first (`live-preview.ts:104`) and returns `false` when the clipboard HTML has no anchor, so IDE copies reach this handler.
- Undoable: the paste is one transaction, so Cmd+Z restores it and the clipboard still holds the original.

## Audit evidence (editor-data-safety, 2026-11-02)

### F121: TSV paste turns tab-indented code, even inside a fence, and tab-indented lines into a table

- Verdict: PARTIAL (P2, likelihood occasional). The fence and indentation part is reproduced. The audit's backslash claim is not carried here: `\` to `\\` in `tsvRowsToMarkdownTable` (paste-tsv.logic.ts:129-130) is correct escaping for literal cell text and renders the same in GFM.

**Code trace.** paste-tsv-handler.ts checks only `clipboardToMarkdownTable(clipboardText)`. paste-tsv.logic.ts:19-26: `text.includes('\t')` and `rows[0].length >= 2`; for `\tif err...` row 0 is `['', 'if err != nil {']`.

**Repro test.** describe `F121` in the archived repro file. Both tests fail: the paste inside the fence inserts `|  | if err != nil { |  |` / `| --- | --- | --- |` / `|  |  | return err |` / `|  | } |  |` instead of the code (`expect(out).toBe('```go\n' + code + '\n```')`), and `expect(clipboardToMarkdownTable('\t- child one\n\t- child two')).toBeNull()` receives a 2-column table.

## Comments

- 2026-11-12: created from Issue 061 part 3 by the deep dive (validate-s3+s4 "Rejected additions", cross-tests-relay M4). Status needs-info by owner decision. The "tab-indented editor" premise of the old text is dropped: the editor indents with two spaces.
