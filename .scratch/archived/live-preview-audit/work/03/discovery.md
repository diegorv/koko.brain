# Issue 03 discovery: special fences inside callouts, blockquotes and list items

No `spec.md` exists for live-preview-audit; the Issue and `audit-2026-11-02.md` are the source.

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:116-160`
  `findSpecialFenceBlocks(state, openRe)` becomes `findSpecialFenceBlocks(state, language, fenceChars)`:
  match `block.language` (the trimmed `CodeInfo`) exactly and check the first
  `CodeMark` character against `fenceChars`. Content becomes the concatenation
  of the `FencedCode` node's `CodeText` children. A probe of the Lezer tree
  showed `CodeText` already starts after the container prefix (each `>` plus one
  space, or the list indent), keeps extra indentation, and carries the newline
  of each line, blank quote lines included (`>\n` gives a `CodeText` of `\n`).
  The node is reached with `syntaxTree(state).resolve(languageFrom, 1).parent`
  (no mounted trees entered).
- `parsers/meta-bind-button.ts:19`, `parsers/mermaid.ts:19`, `parsers/queryjs-block.ts:19`,
  `parsers/collection-block.ts:19`: drop the `*_OPEN_RE` regexes, pass
  `('meta-bind-button', '`')`, `('mermaid', '`~')`, `('queryjs', '`')`, `('collection', '`')`.
- `code-block-field.ts:12,27` (`SPECIAL_LANGUAGES`) and the four block fields stay as they are.

## Tests

- New `src/tests/lib/core/markdown-editor/extensions/live-preview/special-fences-in-containers.test.ts`:
  the repro's 'special fences nested in a container render' cases (jsdom mount harness),
  extended to callout / blockquote / list item for all four, a callout button that
  shows its label and runs an `updateMetadata` action, and a ```` ```mermaid-js ```` control.
- `parsers/fenced-code-block.test.ts` `findSpecialFenceBlocks`: new signature; content
  stripped for `> `, nested `> > `, a list indent, blank quote lines.
- `plugins/special-fence-detection.test.ts:127` and `plugins/meta-bind-button-field.test.ts:165`
  ("renders nothing for a fence inside a blockquote") assert the bug this Issue fixes:
  they flip to "renders ... with the prefix stripped". All other existing cases stay.

## Defaults for open questions

- An indented opening fence at top level (`  ```mermaid`, parent `Document`) keeps
  rendering nothing, as the existing tests assert ("top-level renders as today").
  Only a fence inside a container may start past column 0.
- Fence characters per parser unchanged: mermaid backtick or tilde, the other three backtick only.

## Risks

- `findAllFencedCodeBlocks` keeps only the last `CodeText` as `contentFrom/contentTo`, so a
  plain code block in a callout shows only its last line. Out of scope here (generic code
  block path); noted for the main session.
