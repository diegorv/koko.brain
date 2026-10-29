# Issue 02 discovery: instant syntax swaps

## Files that change (paths under src/lib/core/markdown-editor/extensions/live-preview/)
- `styles.ts:30-56`: delete `.cm-formatting-inline`, `-inline-visible`, `-block-visible`; `.cm-formatting-block` keeps only `opacity: 0.6` (no font-size, no transition) and now means "revealed block syntax"; `:504` drop `.cm-lp-inline-comment-hidden`. Add shared `hiddenSyntaxDeco = Decoration.replace({})`.
- `inline/handlers/heading-handler.ts:24-29,46-50`: off-line -> `hiddenSyntaxDeco`; touched -> `cm-formatting-block` mark (dim).
- `inline/handlers/blockquote-handler.ts:45-48`: same as heading.
- `inline/handlers/mark-handlers.ts:4-5,21-22,52-54`: off -> `hiddenSyntaxDeco`; touched -> nothing.
- `inline/handlers/markdown-link-handlers.ts`, `autolink-handlers.ts`, `wikilink-handler.ts`: the `cm-formatting-inline` marks become `hiddenSyntaxDeco`.
- `inline/handlers/inline-comment-handler.ts:20-23`: off -> `hiddenSyntaxDeco`; touched -> `cm-lp-inline-comment` mark.
- `plugins/footnote-plugin.ts:92,96` and `plugins/callout-field.ts:162-164,192,222`: they use the same classes; without converting them, deleting the CSS would leave `^[`/`]` and `> [!type]` visible. Same treatment (callout touched -> dim mark).
- `inline/inline-formatting-plugin.ts:12-14`: JSDoc mentions `*-visible`.
- Docs: `docs/adr/0008-...md` (amendment section + :15,:23,:53,:62,:68 pointers), `CLAUDE.md` Live Preview rule 1, `docs/LIVE-PREVIEW.md:18,41-60,72-80` ("Critical Rule" says NEVER replace; must flip or it contradicts the ADR).

## Plan
1. Test-first: handler tests assert `replace` (via `RangeValue.point`) off the cursor line and no replace on it. Convert handlers + footnote + callout + CSS. Update e2e specs that assert `-visible` / `-hidden` classes to assert the rendered text instead.
2. Docs commit: ADR 0008 amendment dated 2026-10-29, CLAUDE.md rule 1, LIVE-PREVIEW.md.

## Prior-art tests
`src/tests/.../inline/handlers/*.test.ts` (build() helper over `buildInlineDecorations`), `plugins/footnote-plugin.test.ts`, `plugins/callout-field.test.ts`, `inline/pipeline-dom.test.ts:149-158`.

## Risks
- Callout: type-switcher widget at `markerFrom` side -1 and fold widget at `markerTo` side -1 sit outside a non-inclusive replace (replace endSide is -6e8+1 < -1), so both still render; builder order unchanged.
- Replace inside a ViewPlugin is legal only within one line; every range here is single-line.
- e2e specs cannot be run in this step (not part of the gate); edited by reading only.

## Defaults taken
- Revealed block syntax keeps the old dim look via a plain `cm-formatting-block` mark (opacity 0.6, static). Revealed inline syntax gets no decoration (it was full opacity before).
- `cm-lp-block-ref-hidden` (display:none, not animated, not named in the Issue) is left alone.
