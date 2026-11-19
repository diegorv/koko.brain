# Scout 05: live preview text styles

Area: `src/lib/core/markdown-editor/extensions/live-preview/styles.ts` plus the highlight styles that also apply in live preview (`src/lib/core/markdown-editor/highlight-styles.ts`, `markdownHighlight`) and the editor theme (`setup/editor-theme.ts`). Read-only audit, 28 themes from `theme-tokens.json`.

## Method

- Scripts: `/private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-05-live-preview-text/measure.mts` and `extra.mts` (raw rows in `rows.json`, `extra.json` next to them). They import `color-tools.mts` (contrastRatio, flatten, mixColors) and carry a copy of the APCA function from `color.ts` (APCA-W3 0.0.98G constants; `Lc` is signed, negative = light text on dark).
- Surface stack: every token is measured on `--editor-bg` (all themes set it opaque). Translucent backgrounds (`--lp-blockquote-bg*`, `--lp-highlight-bg`, `--syntax-selection`, `--lp-code-bg`) are flattened over `--editor-bg` first. `.cm-lp-tag` is resolved as `color-mix(in oklab, primary 20%, editor-bg)` and `color-mix(in oklab, primary 70%, editor-fg)` via `mixColors`. Opacity rules (0.5, 0.6) are composited over the surface.
- Which rule colors what, traced in code (not rendered; I did not run the app):
  - `markdownHighlight` is installed in both modes (`editor-extensions.ts:175`), so in live preview: strong/emphasis/strikethrough/quote/monospace colors come from `--syntax-*` tokens, and `Blockquote/...` gives EVERY node inside a blockquote `--syntax-quote` (lezer markdown `markdownHighlighting`, index.js:1996). `.cm-lp-blockquote*` sets only border and tint, no color.
  - Inline code: `--syntax-code` on `--lp-code-bg` (the `.cm-lp-code` rule has higher specificity than the highlight class, so `--syntax-code-bg` does not win; both measured, both pass).
  - Revealed `#`, `>`, `**`, `[`: lezer maps them to `processingInstruction`, defined last in `markdownHighlight`, so `--syntax-processing` is assumed to win over the heading color (CSS order inside one HighlightStyle; not verified in a browser).
  - Selection: no `drawSelection()` anywhere, so the native `::selection` with `--syntax-selection` (`editor-theme.ts:58`) is what the user sees. Text keeps its own color on it.
  - Thresholds: body 19px (default `fontSize` in `settings.store.svelte.ts:82`), headings default bold: h1-h5 are large text (3:1; h4 21.4px bold, h5 19px bold both over 18.66px), h6 (17.1px, weight 600) is small (4.5:1). Everything else 4.5:1; markers, borders, checkbox 3:1.

## Findings (details in the structured result)

1. Unchecked task checkbox border (`--lp-task-border` = `faintFg` in the builder) on `--editor-bg`: below 3:1 on 19 of 28 themes, below 2:1 on 13, worst 1.50 (Zettlr Bielefeld Light), KokoBrain Default 2.02, Lavender Haze 1.69. The unchecked box has a transparent fill, so the border is the whole control. `styles.ts:234`, `theme-builder.logic.ts:273`; `taskBorder` is not in `READABILITY_PAIRS`.
2. Revealed `%%comment%%`, `^block-id` and the hard-break arrow: `--syntax-meta` at opacity 0.5. 28/28 themes below 4.5, 24/28 below 3, range 1.60 to 3.24. The comment text is user content shown while editing it. `styles.ts:586,593,137`.
3. Blockquote text: `--syntax-quote` on the blockquote tint. Depth 1: 8 themes below 4.5 (worst 3.88 Zettlr Bielefeld Dark); depth 3: 13 themes (worst 3.40). APCA Lc 34-38 on five Zettlr dark themes. Pair is only guarded against plain editor-bg in `READABILITY_PAIRS`.
4. `==highlight==`: body text on the highlight background below 4.5 on four Zettlr dark themes (3.93, bg #7b7b1b); emphasis/strong/link/wikilink inside it drop further (link 15 themes below 4.5, worst 1.43 Zettlr Frankfurt Dark; strong/emphasis worst 2.97/3.38). No pair covers text on `highlightBg`.
5. Accent text on dark themes passes WCAG 2 but reads poorly by APCA: Willemstad Dark `#567f83` on `#070707` (4.57:1, Lc -31) is used for links, wikilinks, footnote refs, ordered-list markers, URLs and syntax markers; Zettlr Frankfurt Dark `#5e97c7` and Karl-Marx-Stadt Dark `#eb6a60` Lc -40. Five Zettlr dark themes' muted `#91919a` (h6, strikethrough, blockquote text) Lc -39.
6. Tag pill text below 4.5 on five Zettlr light themes (4.01 to 4.37; worst Bielefeld Light). `styles.ts:272` mixes 70% primary with editor-fg and never checks the result.
7. Link reference definition lines (`[1]: url`) at opacity 0.5 are visible whenever the cursor is elsewhere: label 27/28 below 4.5 (worst 2.31), URL 28/28 below 4.5 (worst 1.93, 25 below 3). `styles.ts:149`.
8. Revealed block syntax (`#`, `>`) at opacity 0.6: syntax-processing color, 19/28 below 3:1, worst 2.27 (Bielefeld Light). `styles.ts:108`. Deliberate dimming, listed for completeness.
9. Selection: native selection background vs text. Plain text fails only on Zettlr Berlin Dark (3.35). Colored text (links, wikilinks) on the selection is below 3:1 on Tolaria Dark (2.46), Willemstad Dark (1.83), Berlin Dark (1.40), Graphite Violet (2.85) and below 4.5 on 21 themes.
10. Ordered-list marker (18px, weight 600, so not large text) on Lavender Haze 3.05 and Sakura 3.01. `READABILITY_PAIRS` holds `olMarker` at 3 only.
11. Blockquote left bar: 1.34:1 on Shimmering Focus Dark and Light, 2.79 on KokoBrain Default. With a 7% tint, the italic text is then the only cue.
12. `--syntax-meta` is guarded at 3:1 only: 9 themes at 3.00 to 3.33. It colors source-mode wikilink brackets and visible HTML comments. Deliberate guard value; low.

## Passed

- Heading colors h1-h5 at >=3:1 on all 28 (worst Sakura h2 3.01, h3 3.02, h4 3.24; they pass only as large text, so a smaller or non-bold heading setting would fail them; h1 4.41 also below 4.5). h6 4.5 on Sakura, all pass.
- Body fg (>=7.1), emphasis and strong (>=4.5), strikethrough (>=4.52), `--lp-link`/`--syntax-link` (identical values on all 28; >=4.51), `--lp-wikilink` (=`--wikilink-target`, >=4.52), footnote ref and def marker (>=4.51), URL (>=4.51), syntax-processing full opacity (>=4.53), inline code on its background (>=4.51), source wikilink heading/display/target, task hover/checked/checkmark (>=3), `--lp-ol-marker` on 26 of 28.
- Quote color on plain editor-bg: >=4.52 everywhere (the failures are only on the tint).
- HR border is a decorative rule: 25/28 below 3:1 (worst 1.41 Tolaria Light), not reported.
- Tokens that failed above were all unguarded pairs; every `READABILITY_PAIRS` entry holds on all 28 themes, so the builder guards work as written.

## Not checked

- Unresolved-link styling: no class or token exists in live preview (grep for unresolved/broken links under `src/lib` finds none), so there is nothing to measure.
- Frontmatter/properties: live preview hides the frontmatter (`frontmatter-field.ts`); the `--lp-frontmatter-bg` token is retired (`theme-validation.logic.ts:43`). The properties panel is a Svelte surface, outside this area.
- Nothing was rendered in a browser: class precedence (processing vs heading color on `#`, link mark vs highlight span nesting) is traced from code. `--lp-link` equals `--syntax-link` on every theme, so that nesting cannot change a link color.
- Blockquote border and task border meaning is a judgment call: both are 3:1 only if the owner counts them as required-to-understand graphics.
- Callouts, code blocks, tables, embeds, meta-bind and QueryJS blocks are other scouts' areas; widget CSS in the same file (lines 400+) was only read for token use.
- Large-text status depends on the font-size setting (19px default) and heading weight settings.
