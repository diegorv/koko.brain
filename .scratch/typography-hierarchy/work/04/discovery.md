# Issue 04 discovery

No `spec.md` exists; the Issue is the spec. Line numbers in the Issue are ~2 lines early against `styles.ts` on main.

## Files that change

- `live-preview/styles.ts`: `.cm-lp-codeblock-lang/-copy` (:285,291), `-pre` (:312), callout option (:478), collection (:522-578), embed (:592-622), meta-bind (:641,668,713,732,745), mermaid lang/error (:779,797), math error (:817), qjs (:832-946). New line classes `cm-lp-codeblock-line` and `cm-lp-table-line` plus exported `CODE_BLOCK_FONT_SIZE` / `TABLE_FONT_SIZE` used by both the widget rule and the line rule.
- `plugins/code-block-field.ts:28,57`: a revealed closed fenced block (and a revealed indented block) gets `Decoration.line` on every line instead of nothing.
- `plugins/table-field.ts:22`: same for a revealed table.
- `features/collection/collection-block-widget.ts:180-350`: inline px -> em; weekday `th` and linear day numbers match the Svelte views; timeline bar title 0.8em + contrast text color.
- `features/collection/linear-calendar.logic.ts`: new pure `barTextColor(color)` (hsl palette -> black/white by WCAG luminance, `var(--primary)` -> `var(--primary-foreground)`).
- `plugins/queryjs/kb-ui.ts:122-385,585,736,780`: px -> em (/16, the qjs container size today); heatmap calendar labels and cell text to the floor. `contract/kb-api.v1.ts:442-453` JSDoc: an explicit `fontSize`/`minFontSize`/`maxFontSize` stays px, only the defaults are em (no signature change).

## Scale (defaults taken, no owner values beyond code 0.85em)

- One block base `0.85em` of body: code, embed, collection, QueryJS, meta-bind controls (QueryJS keeps its rendered 16px; embeds/collections go 13px -> ~16px).
- Code/mermaid chrome labels `0.7em`; error/label text inside blocks (mermaid, math, meta-bind, callout options) `0.75em`.
- Inside a 0.85em container children keep their old ratio to the old base, rounded: headers/tables/messages `0.9em`, footers `0.85em`; QueryJS children /16.
- Readable floor = 11px at the default editor font (18px x 1.05), expressed in em (no `max()` with px). Applies to heatmap calendar text, timeline bar titles and the collection "+N" markers.
- Fixed geometry stays px (timeline `BAR_HEIGHT`, cell heights, the table +col/+row glyphs, toggle box), except the linear-calendar label column width, which becomes em so month labels still fit.

## Prior-art tests

- `styles.test.ts` (rule-string scan of `livePreviewStyles`): add a font-size scan for the touched selectors.
- `plugins/code-block-field.test.ts`, `plugins/table-field.test.ts`: decoration counts; the "cursor inside -> 0 decorations" cases become "line decorations only, no replace".
- `collection-block-widget.test.ts` (linear-calendar describe), `linear-calendar.logic.test.ts`, kb-ui tests.

## Risks

- jsdom has no layout: tests assert rule strings and inline styles, not rendered px.
- Timeline bars keep a 16px height; above ~editor 26px the title clips (overflow hidden).
- LP-PROFILE needs the running app; the profile here is `computeCodeBlocks` timed in vitest on a long note, recorded in the Issue Comments as such.
