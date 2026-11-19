# Scout 06: callouts (live preview, source mode)

Scripts and raw output: `/private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-06-callouts/` (`measure.mts`, `inline.mts`, `stats.mts`, `hl.mjs`).

## Method

1. Traced what actually paints a callout.
   - `live-preview/plugins/callout-field.ts` puts class `cm-lp-callout` plus `border-left-color: <accent>; --cm-lp-callout-accent: <accent>` on every callout line (line 176). `<accent>` is `var(--callout-<type>)` via `CALLOUT_COLORS` (`extensions/callout/callout.logic.ts`); aliases map onto six vars: note, tip, important, warning, caution, quote.
   - `live-preview/styles.ts:481` `.cm-lp-callout`: 3px left border, `background: color-mix(in srgb, var(--callout-note) 7%, transparent)`. The tint is hardwired to the note hue for every type in live preview. Source mode (`extensions/callout/callout.ts:14`) tints per type, same 7%.
   - Title (`.cm-lp-callout-title`, styles.ts:500) sets only weight 600, no color. Body and title colour therefore come from the markdown highlight style. Verified by running `@lezer/markdown` + `highlightTree` on a callout: every character of the callout (title, body) carries the `tags.quote` class (`"Blockquote/...": tags.quote`), which `highlight-styles.ts:39` colours with `--syntax-quote`. `>`, `[`, `]` also carry `processingInstruction` (`--syntax-processing`). Strong, link, wikilink, emphasis keep their own tokens. The CSS only cancels the quote italics, not the colour.
   - Type label (callout-field.ts:65 widget, styles.ts:520): `<button>` `color: var(--cm-lp-callout-accent)`, `opacity: .85`, weight 500, font inherited (body size). Shown whenever the callout is not touched by the selection.
   - Fold chevron (styles.ts:503): inherits `--editor-fg`, `opacity: .6`, `.cm-lp-callout-fold:hover` opacity 1.
   - Revealed header syntax (`> [!note]`, selection inside callout): `.cm-formatting-block` opacity .6 (styles.ts:108).
   - Type popover (styles.ts:538-575): `--popover`/`--popover-foreground`, hover `--accent`/`--accent-foreground`, current option opacity .85.
   - There is no separate reading view in `src/` (no reading-view renderer references callouts), so live preview and source mode are the whole surface. `markdown-plain-text.ts` and queryjs only mention callouts in comments or text stripping.
2. Resolved every theme from `theme-tokens.json` `cssVars` (all 28 carry every var used). Surface = `--editor-bg`. Callout tint = `rgba(callout-note, .07)` flattened over `--editor-bg` (`flatten`). Opacity effects composited with `flatten(rgba(fg, a), tint)`. Ratios via `contrastRatio`; APCA copied from color-tools.mts (`apcaContrast`, not exported).
3. Thresholds: text 4.5, icon/non-text 3.

## Measurements

### A. Type label (callout accent at .85 on note tint), all 28 themes x 6 types = 168 pairs
- 127 of 168 pairs below 4.5; 46 below 3.0; 25 of 28 themes have at least one failing type. Only Deep Ocean, Ink Night, Tolaria Dark pass every type.
- Even at full opacity (ignoring the .85) 73 pairs still fail 4.5, so opacity is not the only cause.
- Worst: Zettlr Bordeaux Dark caution 2.26; Lavender Haze warning 2.33; Tolaria Light warning 2.34; Shimmering Focus Light warning 2.34 (tip 2.41); Sakura warning 2.35 (tip 2.47); Willemstad Light warning 2.35 (tip 2.42); Zettlr Berlin/Bielefeld/Frankfurt/Karl-Marx-Stadt Dark caution 2.35 (note 2.78); Zettlr Bordeaux Light tip 2.35; Zettlr Bielefeld Light warning 2.35.
- Lavender Haze (built-in light): note 3.46, tip 2.79, important 3.77, warning 2.33, caution 3.41, quote 2.68.
- KokoBrain Default (built-in dark): 3.87 3.64 3.54 etc; note 3.87, tip 5.46, important 3.64, warning 5.64, caution 3.54, quote 3.87.
- APCA Lc: light themes 41-83 mostly 44-65; dark Zettlr themes 18-49, Shimmering/Willemstad Dark note 26-27.
- Cause: `READABILITY_PAIRS` (theme-builder.logic.ts:153) only demands 3:1 for the callout hues vs editorBg, and only for built-ins. The same hues are reused as text in the label.
- Hover (label on `--lp-table-alt`): min 2.47 (Zettlr Dark), similar spread.

### B. Callout body and title text (`--syntax-quote` on note tint)
- On the bare editor bg every theme passes (4.52 to 13.58): quote tokens were clamped to about 4.5:1 against `--editor-bg`. The 7% note tint costs about 0.35-0.55 and flips these below 4.5:
  - Lavender Haze 4.15 (bare 4.55), Tolaria Light 4.49 (bare 4.95), Twilight Violet 4.41 (bare 4.87), Zettlr Bielefeld Light 4.18 (bare 4.52), Zettlr Berlin/Bielefeld/Frankfurt/Karl-Marx-Stadt Dark 4.20 (bare 4.53), Zettlr Bordeaux Dark 4.29 (bare 4.68).
  - Source mode (per-type tint) is worse by up to 0.3 in a few themes: Zettlr Dark family worst 3.93, Lavender Haze 4.13, Bielefeld Light 4.07, Zettlr Berlin/Bordeaux/Frankfurt/KMS Light 4.51-4.53 (pass).
- APCA Lc (live preview): below 45 for KokoBrain Default 44.95, Twilight Violet 37.7, Zettlr Dark family 37.7-38.2. All light themes 61+.
- `--editor-fg` itself on the tint is fine: 6.59 to 19.11.

### C. Inline tokens inside callouts (on note tint vs bare)
Tokens pass 4.5 on the bare bg in all themes and fall below on the tint. Link/wikilink/strong/emphasis only (strikethrough, url and processing omitted from the headline count):
- `--lp-link` / `--syntax-link`: Lavender Haze 4.50 (ok edge), Sakura 4.14, Shimmering Focus Light 4.17, Willemstad Dark 4.36, Zettlr Berlin Light 4.20, Bielefeld Light 4.19, Bordeaux Light 4.16, Frankfurt Dark 4.20, Karl-Marx-Stadt Dark 4.22, KMS Light 4.34.
- `--lp-wikilink` / `--wikilink-target`: KokoBrain Default 4.43, Sakura 4.22, Shimmering Focus Light 4.11, Twilight Violet 4.10, plus the Zettlr themes above.
- `--syntax-strong`: Shimmering Focus Light 4.09. `--syntax-emphasis`: Lavender Haze 4.11, Shimmering Focus Light 4.09.
- `--syntax-url`: KokoBrain Default 4.04, Lavender Haze 4.11, Sakura 4.22.
- Inline `code` chip (`--syntax-code` on `--syntax-code-bg` over tint): min 4.23 Lavender Haze, 4.24 Sakura, 4.26 Tolaria Light.
- 12 themes have at least one link or wikilink token under 4.5 on the tint; worst 4.09-4.10.

### D. Fold chevron (editor-fg at .6 on note tint), 3:1 icon threshold
- Fails in 5 light themes: Zettlr Berlin Light 2.85, Bielefeld Light 2.72, Bordeaux Light 2.85, Frankfurt Light 2.85, Karl-Marx-Stadt Light 2.85. Others 3.47 to 6.89. Hover restores 6.59+.

### E. Revealed header syntax (`> [!note]` while editing, opacity .6)
- `!note` text (quote colour at .6): 2.17 to 3.72 in all 28 themes.
- `>`, `[`, `]` (`--syntax-processing` at .6): 2.19 to 3.71 in all 28. This is the callout instance of the global `.cm-formatting-block` dimming, likely also reported by the block-syntax scouts.

### F. Passing
- Left border vs `--editor-bg` (3:1): all 28 themes x 6 types pass; tightest 3.01 (Zettlr Karl-Marx-Stadt/Frankfurt/Berlin/Bielefeld Dark caution), 3.02 (Lavender Haze warning, Sakura warning, Willemstad Light warning, Shimmering Focus Light warning). Marginal but passing. The border is not the only type cue (label), so 3:1 is conservative.
- Type popover: `--popover-foreground` on `--popover` 7.97 to 21.0; current option (.85) 5.35 to 15.13; hover pair accent-fg/accent 4.76 to 17.86. Popover surface vs `--accent` hover fill is 1.00-1.67 (hover state only, not required).
- Body `--editor-fg` on tint 6.59+.

### G. Not a contrast fault, polish
- Live-preview tint is always the note blue, so a caution (red border) or tip (green border) callout has a blue-tinted body. Source mode tints per type. Active-line override (styles.ts:96) repeats note. In Lavender Haze the tint is `#3868B0` at 7%.

## Not checked
- Reading view: none exists in the codebase.
- Selection background (`--syntax-selection`) over callout text: belongs to the editor-chrome scout.
- Nested callouts or blockquote-in-callout stack of tints (`--lp-blockquote-bg*`): the blockquote parser skips lines owned by a callout, but a plain quote inside a callout paints `--lp-blockquote-bg` over the tint; not measured.
- Real rendering in the app was not run; fonts sizes assumed body size (16px) for the label.
- Themes repo files for non-built-in themes were measured through `theme-tokens.json`, not re-derived from `themes/*.json`.
