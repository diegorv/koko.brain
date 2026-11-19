# Scout 07: code blocks and syntax highlighting

Read-only audit. Scripts and raw output: `/private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-07-code-syntax/` (lib.mts, run1-4.mts, run2.txt, tokens.json, mm.mjs).

## Method

1. Traced where code colors are set:
   - Fenced blocks in live preview: `CodeBlockWidget` (`widgets/code-block-widget.ts`) renders lowlight/hljs spans; colors come from `styles.ts:334-413` (`.cm-lp-codeblock*`, `.hljs-*`) and the `--lp-syntax-*` / `--lp-codeblock-*` vars derived in `src/app.css:426-445` with `color-mix(in oklab, ...)`.
   - Code files opened in the editor: `codeHighlight` in `highlight-styles.ts:61-85`, same `--lp-syntax-*` vars, drawn on `--editor-bg` (not on the code block bg).
   - Inline code: live preview `.cm-lp-code` (`styles.ts:299`, bg `--lp-code-bg`) plus `markdownHighlight` monospace (`highlight-styles.ts:33-38`, fg `--syntax-code`, bg `--syntax-code-bg`). Source mode only has the second.
   - Source mode: line numbers and active-line gutter (`editor-theme.ts:61-68`), `tags.comment/meta` -> `--syntax-meta` (`highlight-styles.ts:49-50`), frontmatter in `--syntax-meta` (`source-frontmatter.ts:57-61`).
   - Mermaid: `mermaid-widget.ts` picks mermaid `default` or `dark` from `isDarkColor(--editor-bg)`; the container is `--lp-codeblock-bg` (`styles.ts:867`).
2. Resolved every var per theme from `theme-tokens.json` cssVars. `color-mix(in oklab, A p%, B)` = `mixColors(A, B, 1-p)` (OKLab in linear sRGB, same as CSS). Translucent colors flattened over the real surface (`--editor-bg`, or header bg for the copy hover).
   - Surfaces: code block bg = flatten(`--lp-codeblock-bg`, editor bg); header bg = mix(codeblock 92%, editor-fg); inline code bg = flatten(`--lp-code-bg`) over editor bg; active gutter = `--syntax-active-line-gutter`; active line = flatten(`--syntax-active-line`).
3. WCAG 2 ratio via `contrastRatio`; APCA Lc via a copy of the APCA-W3 0.0.98G math from `color-tools.mts` (signed Lc, positive = dark on light).
4. Mermaid: read the real theme variables by importing mermaid 12.3.0's `themes_default` in node (`mm.mjs`): default theme text/line `#333`/`#333333`, pie title/gantt outside text black; dark theme text `#ccc`, line/signal/pie `lightgrey`, title `#F9FFFE`. Measured those against the code block bg.

Sizes: default editor font 19px (`settings.store.svelte.ts:82`), so the language label (0.7em) is about 13.3px and the mermaid error (0.75em) about 14.3px. Both are small text, 4.5:1 applies.

## Findings (all measured on 28 themes)

### 1. `--lp-syntax-punctuation` and `--lp-syntax-comment` fall under 4.5:1 (app.css:439, 444)

Punctuation = editor-fg 65% mixed with the code block bg, no contrast clamp. On the code block bg:

| Theme | punctuation fg on bg | ratio | Lc |
|---|---|---|---|
| Zettlr Berlin / Frankfurt / Karl-Marx-Stadt Light | #86868d on #f5f5f5 | 3.32 | 57.8 |
| Zettlr Bielefeld / Bordeaux Light | #898990 on #ffffff | 3.47 | 62.3 |
| Tolaria Light | #74736d on #f7f6f3 | 4.40 | 67.7 |
| Lavender Haze (built-in) | #676077 on #ddd8e8 | 4.28 | 58.4 |

Comment on the code block bg: Zettlr Berlin Light #46806b on #f5f5f5 = 4.22 (Lc 65.9). Comment is mixed from `--syntax-meta`, which is a saturated accent in the Zettlr palettes.

Code files (drawn on `--editor-bg`): punctuation Bielefeld Light 3.11, Bordeaux Light 3.46, Berlin/Frankfurt/KMS Light 3.62, Bordeaux Dark 4.18 (Lc -34.7), Mint Linen 4.38, Sepia 4.44; comment Bielefeld Light 4.39. On the active line overlay the punctuation drops further (Bielefeld Light 2.93, Bordeaux Dark 3.57).

Fix check: punctuation at 80% editor-fg gives at least 4.63 on the code block bg and 4.53 on editor bg for all 28 themes (script run4).

### 2. Language label and Copy button on the code block header (app.css:426-429, styles.ts:350-372)

`--lp-codeblock-lang` and `--lp-codeblock-copy` are `--muted-foreground`, but the header bg is the code block bg mixed 8% toward editor-fg, which lowers the contrast `muted-foreground` was lifted to on editor bg. Small text (13px).

Header ratio under 4.5: Lavender Haze 3.88 (built-in), Sakura 3.84, Tolaria Light 3.93, Berlin/Frankfurt/KMS Light 4.09, Bielefeld/Bordeaux Light 4.43, Graphite Violet 4.23, Berlin/Bielefeld/Frankfurt/KMS Dark 4.47. Copy hover bg (`--lp-collection-table-hover` over header) is worse: Bordeaux Dark 3.34, Berlin/Bielefeld/Frankfurt/KMS Dark 3.37, Berlin/Frankfurt/KMS Light 3.86, Bielefeld/Bordeaux Light 4.01, Lavender Haze 4.04, Tolaria Light 4.04, Sakura 4.06, Twilight Violet 4.25, Graphite 4.42. APCA only: Twilight Violet header Lc -38.4, Willemstad Dark -44.8.

The native `<select>` that replaces the label (`code-block-widget.ts:155`, no CSS besides the label rule) is drawn by WebKit; its own background could not be measured (see not checked).

### 3. Active line number in source mode and code files (editor-theme.ts:66-68, theme-builder.logic.ts:266)

`.cm-activeLineGutter` bg = `--syntax-active-line-gutter` = palette `hover`; the number keeps `--muted-foreground` (from `.cm-gutters`). `readableCore` lifts mutedFg only on the listed surfaces, not on `hover`.

- Zettlr Berlin/Bielefeld/Frankfurt/KMS Dark: #91919a on #505050 = 2.58 (Lc -28.2). Zettlr Bordeaux Dark: #8f8f98 on #505050 = 2.52.
- Zettlr light family: #6e6e77 on #dcdcdc = 3.68. Tolaria Light 4.15.
- Plain line numbers (not active) pass but barely and with low Lc in dark: Zettlr dark family 4.53 / Lc -39.4, Twilight Violet 4.87 / Lc -39.0.

### 4. `--syntax-meta` text is 3.0-3.3:1 on 9 themes (source-frontmatter.ts:60, highlight-styles.ts:49-50)

Source mode draws the whole frontmatter block at body size in `--syntax-meta`, and the same token colors `tags.comment` / `tags.meta` (HTML comments, comments in fenced code in source mode). The builder only lifts `meta` to 3:1 (`theme-builder.logic.ts:201`, `READABILITY_PAIRS`: `['syntax','meta','ui','editorBg',3]`), but the text is body text.

Ratio on editor bg: KokoBrain Default (built-in dark) #6a798f on #2a2e3d 3.05 (Lc -26.2); Lavender Haze (built-in) #8A80A0 on #F3F0F8 3.28; Sakura 3.33; Twilight Violet 3.08 (Lc -23.6); Zettlr Berlin Light 3.04, Bielefeld Light 3.03, Bordeaux Light 3.06, Frankfurt Dark 3.02, Karl-Marx-Stadt Dark 3.00. The other 19 are 4.71 or better.

### 5. Mermaid parse error text (styles.ts:898-903)

`.cm-lp-mermaid-error` uses `--lp-collection-error` at 0.75em italic on the code block bg. `collectionError` = palette `error`, lifted to 3:1 only (`theme-builder.logic.ts:187, 283`).

Under 4.5: Lavender Haze (built-in) #c83848 on #ddd8e8 3.66, Sakura 3.97, Shimmering Focus Light 3.89, Tolaria Light 3.82, Willemstad Light 3.96, Zettlr Bordeaux Dark 3.39, Berlin/Bielefeld/Frankfurt/KMS Dark 3.55 (#cf413b on #1e1e1e). APCA only: Twilight Violet Lc -35.5, Shimmering Focus Dark -38.9, Willemstad Dark -40.7, Graphite Violet -43.8.

### 6. Mermaid diagram not re-rendered on theme switch (traced, not run)

`MermaidWidget.eq` compares only `source` (`mermaid-widget.ts:121`). On a light/dark switch `MarkdownEditor.svelte:704-715` reconfigures the theme compartment, but `block-decorator.ts` has no theme dependency and CodeMirror keeps the DOM of an `eq` widget, so a visible diagram keeps the SVG drawn with the previous mermaid theme until it leaves the viewport or the doc changes. A stale light-theme SVG on a dark code block has text/lines `#333` on the block bg at 1.05-1.28:1 (stale dark SVG on light block 1.01-1.15:1). The existing test (`mermaid-widget.test.ts:149`) only builds a second widget, it does not cover a live widget. I could not run the app, so this is a code trace; confirm in the running app before fixing.

### 7. Inline `%%comment%%` and block-ref text at 50% opacity (styles.ts:586-595, outside my area, measured)

`--syntax-meta` at `opacity: 0.5` over editor bg: 1.67-3.23:1 on all 28 themes (Lavender Haze 1.73, KokoBrain Default 1.72, Twilight 1.67, Zettlr Berlin Light 1.67). It is shown only while the cursor is on that line (`inline-comment-handler.ts:16`), so it is an intentional dim, but the text being edited is unreadable. Low.

### 8. Dim text in dark themes under APCA Lc 45 while WCAG passes (low)

Punctuation on the code block bg: Deep Ocean Lc -39.4 (4.92:1), Shimmering Focus Dark -36.7 (4.61), Twilight Violet -37.6 (4.99), Zettlr Bordeaux Dark -36.3 (4.64), Tolaria Dark -44.3 (5.53). Inline code `--syntax-code` on `--lp-code-bg`: Shimmering Focus Dark #8a8fa8 on #23252f 4.77 / Lc -39.6 (same in source mode, `--syntax-code-bg`). Code-file comment: Twilight Violet 5.51 / Lc -43.9. Line numbers: see finding 3.

## Passed

- Code block body text (`--lp-codeblock-text` = editor-fg) on the code block bg: 7.31:1 or better on all 28 (Zettlr Berlin/Frankfurt/KMS Light lowest).
- All hljs/lp tokens except punctuation, the Zettlr Berlin Light comment (4.22) and the Zettlr Bielefeld Light comment on editor bg (4.39): 4.63:1 or better on the code block bg and 4.5:1 or better on editor bg on all 28 themes (keyword, builtin, type, literal, number, string, function, variable, comment, meta, attr, property, tag, operator). On the code block bg all of them are Lc 45 or better; on editor bg only the Twilight Violet comment is under (Lc -43.9, finding 8).
- Tokens on the active-line overlay (code files): only punctuation drops under 4.5 (see 1); the rest stay above 4.5.
- Inline code (live preview) `--syntax-code` on `--lp-code-bg`, source mode on `--syntax-code-bg`, and editor-fg on `--lp-code-bg` (code inside a table cell or callout inherits editor-fg): 4.5:1 or better on all 28.
- Mermaid theme choice: `isDarkColor(--editor-bg)` agrees with `isDarkColor(--lp-codeblock-bg)` on all 28 themes; the chosen mermaid theme's text, line, title, pie and gantt-outside colors on the code block bg are 7.47:1 or better (worst: Graphite Violet text `#ccc` 7.47). The 0.2 luminance cut-off is sound for these themes (equal-contrast point is about 0.18).
- Code block border and header are decorative (container edge); not rated.

## Not checked

- The `<select>` language switcher: its background and popup are drawn by WebKit under `color-scheme`; only the text color `--muted-foreground` is known, so no ratio.
- Source-mode `tags.processingInstruction` (markdown marks, `--syntax-processing`), headings and other markdown syntax: another scout's area.
- Node fill/text inside mermaid diagrams (fixed by mermaid's own palette, independent of app colors), and mermaid diagram types other than the variables listed.
- Keyboard focus visibility of the Copy button (opacity 0 until hover; the button handles only `mousedown`): not a color measurement.
- Nothing was run in the real app; hover/active states and `color-mix` rendering were computed, not observed. The OKLab mix matches CSS but was not compared with a browser render.
- User-installed themes beyond the 28.
