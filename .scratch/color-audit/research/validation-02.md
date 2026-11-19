# Validation 02 (live-preview text, callouts, code, collection views)

Scripts: /private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-validate-02/t1..t10.mts (lib.mts wraps color-tools.mts and adds signed APCA).
Surfaces: Tailwind `x/NN` and `color-mix(in srgb, X 7%, transparent)` are treated as X at that alpha and flattened over the real parent (`--card` for CollectionView, `--lp-collection-bg` over `--editor-bg` for widgets, `--editor-bg` for editor lines). Group `opacity` composited the same way.

Repo themes are JSON palettes run through `buildTheme` (theme-package.logic.ts:2,192), so builder changes reach all 28 themes; "app" owner below means the builder or the component.

## Verdicts

| # | Finding | Verdict | Sev | Own | My numbers |
|---|---|---|---|---|---|
| 1 | blockquote text on tint | confirmed | medium | app | d1: Bielefeld Dark 3.88, Bordeaux Dark 4.02, Berlin/Frankfurt Dark 4.06/4.07, KMS Dark 4.14, Bielefeld Light 4.15, Lavender Haze 4.25, Tolaria Light 4.49. d3: Bielefeld Dark 3.40 |
| 2 | APCA-only accent text | confirmed (APCA only) | medium | both | Willemstad Dark links/wikilinks/footnote/ol/url 4.57 Lc -31; Frankfurt Dark 4.53 Lc -40; KMS Dark 4.56 Lc -40; Zettlr dark #91919a 4.53 Lc -39. Missed by scout: Twilight Violet wikilink 4.53 Lc -36, h6 Lc -40, link Lc -44; KokoBrain Default url #818cf8 4.52 Lc -41 |
| 3 | callout type label | confirmed | high | app | 127/168 type pairs < 4.5, 46 < 3, 25/28 themes; worst Bordeaux Dark caution 2.26 Lc -18, Lavender Haze warning 2.33 |
| 4 | callout title/body on tint | confirmed | medium | app | Lavender Haze 4.15, Bielefeld Light 4.18, Zettlr dark family 4.20, Bordeaux Dark 4.29, Twilight Violet 4.41, Tolaria Light 4.49 |
| 5 | callout fold chevron .6 | confirmed | low | app | 2.72 Bielefeld Light, 2.85 Berlin/Bordeaux/Frankfurt/KMS Light. Colour verified as `--editor-fg` (jsdom CM6 render: the side -1 widget at markerTo is not wrapped in the quote highlight span) |
| 6 | mermaid error on codeblock bg | confirmed | medium | app | 3.39 Bordeaux Dark, 3.55 Zettlr dark x4, 3.66 Lavender Haze, 3.82 Tolaria Light, 3.89 Shimmering Light, 3.96 Willemstad Light, 3.97 Sakura |
| 7 | mermaid stale after light/dark switch | confirmed by trace, not run | low | app | eq() source-only (mermaid-widget.ts:132), theme effect only reconfigures editorThemeCompartment (MarkdownEditor.svelte:702-713), no {#key}. mermaid 12.3.0 default lineColor #333333 on dark block bg 1.05-1.52; dark textColor #ccc on light block bg 1.15-1.61 |
| 8 | source frontmatter in --syntax-meta | confirmed | medium | app | 3.00-3.33 on 9 themes incl. both built-ins |
| 9 | collection-error on collection bg | confirmed, same root cause as 6 and 16 | medium | app | 3.39 Bordeaux Dark, 3.55 Zettlr dark x4, 3.62 Willemstad Light, 3.66 Lavender Haze, 3.69 Shimmering Light, 3.82 Tolaria Light, 3.97 Sakura, 4.42 Shimmering Dark; math error on editor bg 3.01 Zettlr dark |
| 10 | widget calendar td opacity .35 | confirmed | medium | app | day 1.76-3.11, 26/28 < 3; pill text 1.72-3.11 |
| 11 | out-of-month mf/40 on muted/20 | confirmed | low | app | 1.69-2.37, 28/28 < 3 (intentional dimming, hence low) |
| 12 | mf on bg-muted/60 header | confirmed | medium | app | 3.26 Zettlr dark x4, 3.32 Bordeaux Dark, 4.12 Twilight Violet, 4.20 Zettlr light x5, 4.46 Tolaria Light (12 themes) |
| 13 | legend swatches vs card | confirmed | low | app | light 1.25-1.53 (all 15), dark min 2.62; 17/28 under 3 |
| 14 | primary as small text / primary/80 hover | confirmed | low | app | card 4.15 Sakura, 4.19 Twilight, 4.30 Shimmering Light; hovered row 3.43 Frankfurt Dark; /80 hover 2.70 KMS Dark; month label on accent hover 2.73 Berlin Light; widget today 3.73 Sakura |
| 15 | null em dash mf/50 | confirmed | low | app | 1.99-3.02, 27/28 < 3 |
| 16 | text-destructive panels/messages | confirmed | medium | app | panel 2.79 Zettlr dark x4 (Lc -25), 14/28 < 4.5; popover 2.96 Bordeaux Dark, 3.02 KokoBrain Default, 12/28 |
| 17 | badge() raw preset on own tint | confirmed | high | app | light card: yellow 1.45, green 1.79, orange 1.86, gray 1.93, blue 2.18, red 2.57, purple 2.69 (Lavender Haze worst); widget yellow 1.29; red/purple fail 28/28 |
| 18 | color()/progress() raw preset | confirmed | high | app | color() light: yellow 1.56, green 1.98, orange 2.08, gray 2.13, blue 2.49; dark red 3.19 / purple 3.14 Graphite Violet; pct label 2.13 card, 1.88 widget |

## Shared fixes

- A. Quote on tints (1, 4): `syntax.quote` is clamped to 4.5 on bare `editorBg` only. Add `['syntax','quote','preview','blockquoteBg3',4.5]` to READABILITY_PAIRS (withReadableContrast already flattens the bg over editorBg) and a quote check against the 7% callout-note tint. Fixes the blockquote and the callout body in all themes.
- B. Error text (6, 9, 16, math/qjs errors): `readableCore` lifts `error` to 3:1 only (theme-builder.logic.ts:189). Lift it to 4.5 on editorBg, panelBg, popoverBg and sidebarBg (collection bg and codeblock bg come from these); errorFg is re-derived against it, so the destructive button stays 4.5. The tinted panel (destructive/10) still needs either text-foreground for the body or a pair against the tint.
- C. Preset text on surfaces (17, 18): use COLOR_PRESET_CHIP_TEXT (30% preset in --editor-fg); measured 4.58+ on card for all colours and themes, 4.23+ on the widget surface (yellow and green under 4.5 on the five Zettlr light themes), so move it to about 25% or clamp. Percent label: --muted-foreground. Progress fill: darker fill or 1px outline for 3:1 on light themes.
- D. Callout label (3): colour it `color-mix(in oklab, accent 40%, var(--editor-fg))` at opacity 1; measured min 4.58 (Bielefeld Light warning) and |Lc| 48+ across all 168 pairs. Keep the raw hue for the border. 50% accent gives only 4.23.
- E. Muted text on muted tints (12 and the missed "+N more"): mutedForeground is clamped on card, not on card+muted/20 or /60. Lighten the tint or add pairs.
- F. APCA floor (2): ensureContrast stops at exactly 4.5; on dark editors mid tones land at Lc 31-44. An APCA floor of |Lc| 45 in readableCore for linkFg/primary/mutedFg would fix 2 and also lift 1, 4, 8 margins.

Chevron fix (5): opacity .7 gives 3.32 worst, .75 gives 3.70.

## Missed

- CollectionCalendarView.svelte:161 "+N more" (11px, text-muted-foreground) inside out-of-month cells (bg-muted/20 over card): 4.10 Zettlr Berlin/Bielefeld/Frankfurt/KMS Dark, 4.25 Bordeaux Dark, 4.39 Twilight Violet (Lc -38). Scout 09 measured it on plain card only. Shares fix E.
