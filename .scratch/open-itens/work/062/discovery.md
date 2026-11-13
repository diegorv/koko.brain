# 062 discovery

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts:1-58`
  (`InlineSegmentType`, `InlineSegment`, `INLINE_RE` at :17, `renderInlineMarkdown`).
- `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:222-285`
  (`renderInlineSegments` gains `link` and `break` cases; JSDoc of it and of `renderCellContent`).
- Tests: `src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts`
  (new describes) and `.../parsers/inline-markdown.test.ts` (new cases only; existing ones untouched).

## Plan

1. Parser. Alternation in this order: code span, backslash escape (`\` + ASCII punctuation),
   `<br>` / `<br/>` / `<br />` (case-insensitive), link `[text](url)` (text `[^\]]+`, url
   non-whitespace with one level of balanced parens so `javascript:alert(1)` is one url),
   then `**`, `*`, `~~`. Emphasis bodies use `(?:\\.|[^\\])+?` so an escaped `\*` never closes
   them; their content and link text are unescaped. Code content only turns `\|` into `|`.
   Escapes yield text; adjacent text segments are merged. New types `link` (with optional
   `href`) and `break`.
2. Widget. `break` -> `<br>`. `link` -> `span.cm-lp-link` with textContent. mousedown: return
   unless `button === 0 && isOpenLinkModifier(e, IS_MAC)`; then preventDefault +
   stopPropagation; open through `view.state.facet(editorHost).openExternal(url)` only when
   `isSafeUrl(url)`, rejected promise -> `reportError('LIVE-PREVIEW', ...)` (click-handler.ts:36-39).
   `isOpenLinkModifier` already rejects macOS Ctrl+click (metaKey && !ctrlKey).
3. No innerHTML anywhere; everything stays textContent / createTextNode.

## Prior-art tests

- `table-widget.test.ts:123-240` `cell wikilink click` (platform mock, `press`, host stub).
- `table-widget.test.ts:243-263` `clickAdd` (real parser via `mountMarkdownView` + `computeTables`).

## Risks

- `renderInlineMarkdown` has one production caller (widgets.ts:232), so only table cells change.
- Existing inline-markdown.test.ts pins (`==x==` text, `**bold***italic*`, `***text***`) must stay:
  no backslashes there, so the escape-aware bodies match the same as `.+?`.
- splitRow / findAllTables, paste-tsv.logic.ts and click-handler.ts untouched.

## Defaults taken

- Escapes are also unescaped inside bold/italic/strike content and link text (CommonMark).
  The link url drops surrounding `<...>` and resolves escapes (review.md finding 1 and 3).
- Optional help-vault rows and e2e skipped.

## Retry (after review-2.md CHANGES_REQUESTED)

- review-2.md finding 1 (exponential backtracking in the url group) fixed in the build step:
  the bare `\\` alternative is gone, so `\\\S`, `[^\s()\\]` and `\(...\)` are disjoint.
  `[a](b\)` (lone backslash before `)`) is no longer a link, as in CommonMark.
