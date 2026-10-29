# Issue 07 discovery: callouts are robust

Paths below are under `src/lib/core/markdown-editor/extensions/`.

## Files that change
- `callout/callout.logic.ts:1,35-42`: the one matcher. `CALLOUT_REGEX` becomes `CALLOUT_HEADER_RE` (`^(?:>\s*)+\[!type\](+|-)?\s*(rest)$`, accepts `> > [!`) plus `matchCalloutHeader(text)` returning `{ type, foldable, rawTitle, markerLength }`. `parseCalloutLine` (legacy source-mode decoration) calls it; its colour default stays `var(--callout-note)`.
- `live-preview/parsers/callout.ts:33,42-64`: drop the local `CALLOUT_HEADER_RE`; `parseCalloutHeader` calls `matchCalloutHeader`. Marker end = `markerLength` (computed from the untrimmed rest), so `> [!note] Title   ` keeps the full title. Colour default `#60a5fa` unchanged.
- `live-preview/parsers/blockquote.ts:11-26`: drop `CALLOUT_RE`. A line is excluded when any `Blockquote` ancestor of its last `QuoteMark` starts on a line `matchCalloutHeader` accepts, so callout content lines (and `> > [!note]` headers) get no blockquote styling.
- `live-preview/plugins/callout-field.ts:133-231`: collect ranges and finish with `Decoration.set(ranges, true)` (nested callouts emit out of order). Each line is owned by its innermost callout: the outer skips lines a nested callout owns; a callout inside a collapsed one is skipped; a callout inside a revealed one is revealed.
- `live-preview/inline/handlers/blockquote-handler.ts:21-23`: JSDoc only (exclusion now covers callout content lines).

## Plan (test-first, one commit each)
1. Matcher + trailing-space title: tests in `callout/callout.logic.test.ts` (`matchCalloutHeader`, nested `> > [!`) and `parsers/callout.test.ts` (`> [!note] Title   ` marker ends before `Title`). Wire `parseCalloutHeader` and `parseCalloutLine`.
2. Nested callout: `plugins/callout-field.test.ts` case `> [!warning] W\n> > [!note] N\n> > inner` (throws today), asserting both headers get the type-switcher and no line gets two `cm-lp-callout` line decos.
3. One style: `inline/handlers/blockquote-handler.test.ts` callout content lines (`> [!note] T\n> body`) produce no blockquote decos; plain quote with nested callout keeps line 1 only. `parsers/blockquote.test.ts` gains the content-line case.

## Prior-art tests
`plugins/callout-field.test.ts` (computeCallouts over `createMarkdownState`), `inline/handlers/blockquote-handler.test.ts` (`buildInlineDecorations` with one handler).

## Risks
- Legacy `calloutDecoration` (source mode) now also styles `> > [!x]` headers. Intended: one matcher.
- Nested lines show only the inner callout's border colour (no box-in-box). Acceptable for "renders both".
- `findBlockquoteMarkRange` walks the tree ancestors per line: O(depth), negligible.

## Defaults taken
- The two colour fallbacks (`#60a5fa` vs `var(--callout-note)`) are not unified; out of scope.
- Dead code noted in the report (`isFoldable = true`, duplicate hidden line deco) left alone.
