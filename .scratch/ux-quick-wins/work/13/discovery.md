# 13 discovery: callouts, headings and the meta-bind number field read cleanly

No `spec.md` in `.scratch/ux-quick-wins/`. Rules read: `docs/agents/live-preview-rules.md` (no decoration, reveal or widget change here; rule 1 untouched). Line numbers moved after 08; current ones below (`P = src/lib/core/markdown-editor/extensions/live-preview`).

## Files that change

- `P/plugins/callout-field.ts:173-176` line deco style: `border-left-color: ${header.color}; --callout-accent: ${header.color}`. Same deco object, same counts.
- `P/styles.ts:503-516` `.cm-lp-callout-type-label`: `color: var(--callout-accent, inherit)`, `textTransform: 'capitalize'`.
- `P/styles.ts:478-482` after `.cm-lp-callout`: `':where(.cm-lp-callout) span': { fontStyle: 'normal' }`, then `'.cm-lp-callout .cm-lp-italic, .cm-lp-callout .cm-lp-italic span': { fontStyle: 'italic' }`. With the baseTheme scope prefix the cancel rule is (0,1,1): beats the quote HighlightStyle class (0,1,0), loses to every scoped single-class italic rule (embed, meta-bind, mermaid, math, qjs errors at (0,2,0)).
- `P/styles.ts:171-191` `.cm-lp-h1/h2/h3`: `paddingTop: 'var(--heading-hN-space-above, 0.6em|0.5em|0.4em)'`. h4-h6 untouched.
- `P/styles.ts` after `.cm-lp-meta-bind-input` (795-806, unchanged): `'.cm-lp-meta-bind-input[type="number"]': { fieldSizing: 'content', minWidth: '4ch', maxWidth: '16ch' }`. style-mod turns camelCase into `field-sizing`.

## Tests (test-first)

- `src/tests/.../live-preview/styles.test.ts` (`exactRule`, `themeRules`): label rule; `:where(.cm-lp-callout) span` has `font-style: normal`, no rule whose exact selector is `.cm-lp-callout span`; italic restore rule (the comma selector is emitted as one rule string, so match it with `themeRules().find` on `.cm-lp-callout .cm-lp-italic`); h1-h3 padding var, h4-h6 no `padding-top`; number input rule; shared input rule snapshot of its declarations stays equal to today's.
- `src/tests/.../plugins/callout-field.test.ts`: `[!warning]` header line deco `spec.attributes.style` contains `--callout-accent: var(--callout-warning)`; existing count tests stay as they are.

## Defaults taken

- Padding starts at the Issue's values (0.6/0.5/0.4em); the eye tuning is the owner's.
- The owner eye check (WKWebView) and the E2E specs cannot run in this build step; left for the owner and deliver.

## Risks

- `exactRule` splits on spaces: for the comma rule the "exact selector" is not one selector, hence the `find` above.
- Heading padding-top grows line height; E2E heading specs assert classes/text, not geometry (no selector change).
