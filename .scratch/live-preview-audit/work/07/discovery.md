# Issue 07 discovery: plain code block in a container shows only its last line

No `spec.md` exists for live-preview-audit; the Issue is the source. Repeats the per-line
`CodeText` join from work/03 (finding 2 of its review); only the generic path differs.

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:15-18,51-94`
  `FencedCodeBlockRange.contentFrom/contentTo` become `content: string`, built in
  `findAllFencedCodeBlocks` with the per-line join now at `:145-156`. Content lines run from the
  line after the opening fence to the line before the closing fence (to the node's last line
  when unclosed).
- `parsers/fenced-code-block.ts:145-156` (`findSpecialFenceBlocks`): uses `block.content`
  instead of its own join; fence-char and content-column checks stay.
- `plugins/code-block-field.ts:31-34`: passes `block.content` to `CodeBlockWidget`. The
  language range (`languageFrom/languageTo/openFenceTo`) is untouched.
- `contentFrom/contentTo` have no other reader: grep over src/lib, src/routes, e2e finds only
  code-block-field and the parser test (`footnote.ts` has its own unrelated fields).

## Tests

- New `src/tests/lib/core/markdown-editor/extensions/live-preview/code-block-in-containers.test.ts`
  (harness copied from `special-fences-in-containers.test.ts`): a two-line ```` ```js ```` block
  at top level, in a callout, a blockquote and a list item renders `a = 1\nb = 2`; Copy writes
  that text (mocked `navigator.clipboard`); the language `<select>` rewrites only the `js` tag.
- `parsers/fenced-code-block.test.ts`: `extracts content range correctly` asserts `content`;
  new cases for content in a quote, nested quote, list item, a blank quote line.

## Defaults for open questions

- A fence whose body is only blank lines now gives one content line per line (`''` for one
  blank line) at the top level too; the old `CodeText` slice gave `'\n'` for one or two blank
  lines (Lezer folds them inconsistently). Same rule the special fences use since Issue 03.
  Visible effect: a language-less block with one blank line no longer shows the Copy header.
- Indented fence at top level (`  ```js`): content stays as the `CodeText` slices give it.

## Risks

- `block-comment-field.ts` also calls `findAllFencedCodeBlocks` but reads only fence lines.
- Building `content` costs one slice per content line per block, the same as before for the
  widget and now also for blocks the generic path skips (special, unclosed): negligible.
