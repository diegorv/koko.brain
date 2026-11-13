# Issue 22 discovery

No `spec.md` in `.scratch/ux-polish/`; the Issue and `work/radius.md` (section 3 role table, section 4 quick win 6) are the source. Repeats Issue 16's pattern (`work/16`): runtime `--radius-*` variables on `:root`, ratchet in `src/tests/lib/radius-scale.test.ts`.

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/styles.ts`, `borderRadius` values only:
  - `var(--radius-md)`, blocks: `.cm-lp-codeblock` :293, `.cm-lp-collection-block` :548, `.cm-lp-embed` :617, `.cm-lp-mermaid` :798, `.cm-lp-qjs-block` :862
  - `var(--radius-md)`, controls: `.cm-lp-codeblock-copy` :319, `.cm-lp-meta-bind-select` :667, `.cm-lp-meta-bind-btn` :696, `.cm-lp-meta-bind-button-error` :748, `.cm-lp-meta-bind-input` :762, `.cm-lp-qjs-run` :903, `.cm-lp-qjs-table-nav-btn` :968
  - `var(--radius-xs)`: `.cm-lp-task-checkbox` :200, `.cm-lp-highlight` :231, `.cm-lp-tag` :239, `.cm-lp-code` :264, `.cm-lp-image` :272, `.cm-lp-audio` :281, `.cm-lp-video` :285, `.cm-lp-callout-type-label` :476, `.cm-lp-qjs-error-stack` :894
  - Untouched: `.cm-lp-callout-type-popover` :497 (6px), `.cm-lp-callout-type-option` :509 (4px), Issue 23.
- `src/tests/lib/core/markdown-editor/extensions/live-preview/styles.test.ts`: `radiusOf(selector)` next to `fontFamilyOf`, two `it.each` tables (md, xs).
- `src/tests/lib/radius-scale.test.ts:203`: `styles.ts` baseline 23 -> 2.

## Plan

1. Test first: `radiusOf` + the two `it.each` tables; run, see 21 cases fail. Commit with the fix (one logical step), or the red test alone first.
2. Replace the 21 literals; run `styles.test.ts` and `radius-scale.test.ts` (the ratchet fails until the baseline drops to 2, then passes).
3. Header corners: render the emitted `.cm-lp-codeblock` CSS plus the widget's header/pre markup in a standalone page, screenshot it in headless Chromium (Playwright from `node_modules`), and note the result in the commit.
4. Targeted checks: `pnpm check`, both test files.

## Defaults taken

- `radiusOf` matches the rule whose whole selector is the scope class plus `selector` (as `exactRule` does at styles.test.ts:134), not `includes`, so `.cm-lp-image` cannot hit `.cm-lp-image-wrapper` and `.cm-lp-codeblock` cannot hit a `:has(...)` rule.
- No other test asserts the old px values (grep for `borderRadius`/`border-radius` in `src/tests` and `e2e` before committing).

## Risks

- Visible changes: blocks 6 -> 8px (codeblock, embed, mermaid), controls 3/4/6 -> 8px, highlight 2 -> 4px, inline code and callout label 3 -> 4px. Checkbox, tag, media, qjs stack, collection and qjs blocks keep their pixel value.
- `.cm-lp-codeblock-copy` (8px) sits in the header of an 8px block; it is inset by the header padding, so it does not touch the block's corner.
- Themes that override these selectors in a theme CSS file keep winning; nothing changes there.
