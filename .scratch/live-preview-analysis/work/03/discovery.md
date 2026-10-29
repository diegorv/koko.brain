# Issue 03 discovery: headings have a single size owner

## Measured (before)
Real editor DOM (jsdom mount of markdownLanguage + markdownHighlight + livePreviewExtensions, CSS from the mounted style-mod sheets) loaded in Playwright Chromium, root 16px, `--heading-hN-*` vars set from the default `headingTypography` as `applyHeadingTypography` does:
- The heading text sits in a HighlightStyle span (`tags.headingN` covers `ATXHeadingN/...`) inside `.cm-line.cm-lp-hN`, so the two `em` sizes multiply.
- H1 line 32.93px, text 67.77px (4.235x base, intended 2.058x); H2 25.89 / 41.89px; H3 20.35 / 25.89px; H4-H6 16 / 16px.
- Line box height (vars set): H1 94.86, H2 58.64, H3 36.23, H4-H6 25.59px. Same with the cursor on or off the line.
- Without the vars (fallbacks): H1 text 52.68px (2.058 x 1.6), H2 36.24, H3 24.42px.

## Files that change
- `src/lib/core/markdown-editor/highlight-styles.ts:15-17`: drop `fontSize` from heading1-3. Weight and colour stay (they do not compound).
- `src/lib/core/markdown-editor/extensions/live-preview/styles.ts:109-150`: unchanged; `.cm-lp-hN` is the owner. JSDoc on `headingLineDeco` (:30) gets one line saying the line class is the only font-size rule.

## Plan
1. Test-first in `src/tests/lib/core/markdown-editor/extensions/live-preview/inline/pipeline-dom.test.ts`: mount `HEADINGS`, walk `document.styleSheets`, assert exactly one rule sets `--heading-hN-font-size` and its selector ends in `.cm-lp-hN`; for cursor off and on the line, no rule matching an element inside the heading line sets `font-size`. `highlight-styles.test.ts`: heading rules of `markdownHighlight.module.getRules()` have no `font-size`.
2. Remove the three `fontSize` entries; record before/after numbers in the commit message (re-measure after with the same script).

## Prior art
`pipeline-dom.test.ts` mountView + `createMarkdownState(doc, { cursor })`; `highlight-styles.test.ts`.

## Risks
- Source mode has no `.cm-lp-hN` line class, so headings there drop to body size (still bold and coloured). Same when the `heading` decorator is disabled. The Issue picks the line class as the only owner; flagged for the reviewer.
- jsdom has no layout: line-height equality is pinned structurally (no font-size rule reaches inside the line, on or off cursor) and measured in Chromium for the commit.

## Defaults taken
- No source-mode heading line decoration added (out of scope; Issue names the line class as sole owner).
