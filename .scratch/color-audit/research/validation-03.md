# Validation 03: collection toolbar, QueryJS, calendars

Validator for 18 scout findings (scouts 09, 11, 12). Every number below comes from my own scripts in
`/private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-validate-03/`
(f1, f4, f7, f9, f14, m1, m2, sim `.mts`), using `color-tools.mts` and the `cssVars` in `theme-tokens.json`.
Tailwind `/NN` was modeled as alpha compositing; `color-mix(in oklab, X 85%, Y)` as `mixColors`.

## Facts that change owners

- Every theme, built-in or from the themes repo, is a palette expanded by `buildTheme` (theme.logic.ts:117, 231; theme-package.logic.ts:193).
  Installed themes are rebuilt from their palette at load (`loadAppearance`, theme-package.logic.ts:398). A builder change reaches all 28 themes
  without a themes-repo release, so builder-rooted findings are owned by the app. The repo is a co-owner only where a theme sets the token by override.
- The QueryJS block has no `color`; text inherits `--editor-fg` (editor-theme.ts:24). Block surface is `--lp-collection-bg` over `--editor-bg`.
- Calendar view sits on `bg-editor-bg` (EditorView.svelte:71). EventForm sits in a Dialog, `bg-popover` (dialog-content.svelte:30). Collection toolbar panels are in `PopoverContent` (`bg-popover`).

## Verdicts

| # | Finding | Verdict | My measurement | Severity | Owner |
|---|---|---|---|---|---|
| 1 | FilterPanel.svelte:96,162 count pill text-primary on primary/15 | confirmed | 15/28 under 4.5: Sakura 3.11 (Lc45), Willemstad Dark 3.43, Graphite Violet 3.50, Zettlr Frankfurt Dark 3.73, SF Light 3.74, KokoBrain Default 3.78 ... Zettlr Berlin Dark 4.25 | medium | app |
| 2 | FilterRow.svelte:102 etc. border-input on popover | confirmed | border vs popover 1.06 Sakura, 1.24 KokoBrain Default, 1.49 Graphite Violet, 1.51 Lavender Haze, 1.67 Zettlr light, 1.81 Zettlr dark, 2.70 Willemstad Dark; only Lumen Contrast 4.29 and Willemstad Light 3.95 pass | medium | app |
| 3 | PropertiesPanel.svelte:135,142, FormulaRow, SortPanel:91 icons at muted-fg/50 | confirmed | 1.95 to 2.96 on popover (all 28), 1.66 to 2.82 on accent; /70 still fails 12 themes (2.78 Tolaria Light, 2.83 Zettlr light) so /70 is not enough; plain muted-fg is 4.51+ | medium | app |
| 4 | styles.ts:933 QueryJS error on collection bg | confirmed | 11 themes: Zettlr Bordeaux Dark 3.39 (Lc-27), other Zettlr dark 3.55, Willemstad Light 3.62, Lavender Haze 3.66, SF Light 3.69, Tolaria Light 3.82, Sakura 3.97, SF Dark 4.42; details at .85: 2.76 worst | medium | app |
| 5 | styles.ts:992 qjs links on collection bg | confirmed | Sakura 3.79, SF Light 4.08, Willemstad Dark 4.18, Zettlr Berlin Light 4.19, Bordeaux Light 4.29, KMS Light 4.32, Lavender Haze 4.41 | low | app |
| 6 | styles.ts:963 Run button primary-fg on primary | confirmed | Zettlr Berlin Light 4.51 Lc33, hover 4.16 Lc30; Willemstad Dark 4.51 Lc33; Twilight Violet 4.95 Lc39; Frankfurt/KMS Dark 4.54-4.56 Lc41. Same root as 15 | low | app |
| 7 | kb-ui.ts:215 heatmap label opacity .6 on cell | confirmed | 28/28 fail on red step, 27/28 on amber..green, 19/28 gray; worst 1.87 SF Dark (green), 2.13 Zettlr light (red) | medium | app |
| 8 | kb-ui.ts:29 heatmap value on fixed rgba scale | confirmed | green step fails 11 themes (SF Dark 2.80 Lc-43, Zettlr Bordeaux Dark 2.89, Twilight Violet 3.15); red step 3.83 on 5 Zettlr light | low (rare widget) | app |
| 9 | kb-ui.ts:608,1018 charts/calendar bake html.dark | confirmed by trace (not run) | no theme invalidation: cache key is path+jsContent, cached DOM is re-attached on toDOM, editor theme reconfigure does not touch it. Stale #000 on dark blocks 1.14-1.39, #fff on light 1.08-1.39 | low (only after a manual light/dark switch, clears on next content invalidation) | app |
| 10 | kb-ui.ts:800,893 today border rgb(61,61,61) | confirmed | 1.16 vs #333 empty cell on all 13 dark themes; 1.39-1.70 vs block | medium | app |
| 11 | kb-ui.ts:977,1019 calendar default scale/empty | confirmed | light: level 1 vs block 1.01 (Lavender Haze) to 1.31, level 1 vs empty 1.20; empty vs block 1.01-1.19. dark: level 5 vs block 1.99-2.44, vs #333 empty 1.67 (darkest = most activity is the least visible) | medium | app |
| 12 | kb-ui.ts:1067 documented series colors | confirmed | Lavender Haze: yellow 1.38, green 1.74, orange 1.83, gray 1.88, blue 2.19; all 15 light under 3 for these 5; dark pass | low | app (help docs are in this repo) |
| 13 | kb-ui.ts:421 striped rgba(255,255,255,.03) | confirmed | 1.00-1.01 on all 15 light themes. The scout's fix (use --lp-collection-table-alt) does not work: that token flattens to 1.00-1.06 on 22 themes (see missed) | low | app |
| 14 | EventCalendarNeedsAttention.svelte:69 + form/load errors | confirmed | badge 15 themes (Zettlr Berlin/Bielefeld/Frankfurt/KMS Dark 2.78 Lc-25, KokoBrain Default 3.19); dialog errors on popover 12 (Zettlr Bordeaux Dark 2.96, KokoBrain Default 3.02); load error on editor 10 (Zettlr dark 3.01, KokoBrain Default 3.44; it is text-sm, not text-xs); trash icon under 3 only Zettlr Bordeaux Dark 2.96 | medium | app |
| 15 | EventMonthGrid.svelte:113 etc. selected day black on mid primary | confirmed | WCAG 4.51-4.95 but Lc33 Willemstad Dark and Zettlr Berlin Light, Lc39 Twilight Violet, Lc41 Frankfurt/KMS Dark; white is Lc-63 to -77. Navigator (file-explorer-primary) same 5 themes | medium | app |
| 16 | EventMonthGrid.svelte:118 etc. hover fill under muted/primary | confirmed | muted-fg on muted 14 themes (Zettlr Bordeaux Dark 2.52, Zettlr dark 2.58); primary on muted 15 (Frankfurt Dark 2.58, KMS Dark 2.60, Berlin Dark 2.96); navigator weekend on accent 11 (Zettlr Berlin Light 2.73) | medium | app |
| 17 | EventMonthGrid.svelte:115 today by hue only | confirmed | primary vs editor-fg under 3:1 on 26/28 (Zettlr Bordeaux Dark 1.08, Deep Ocean 1.22); no weight/ring in code | low | app |
| 18 | CalendarGrid.svelte:68 dots on selected day | confirmed by code | dot and fill are both bg-file-explorer-primary: 1.00 on 28/28. Picked day defaults to today (day-lens.logic.ts:25). Mitigated: the picked day's notes are listed by the day lens | low | app |

## Shared roots (fix once)

- **A. `error` lifted only to 3:1** (theme-builder.logic.ts:187) but used as 4.5 text: findings 4 and 14. Lift a text form of error to 4.5 on editorBg, popoverBg and sidebarBg (= collectionBg). Simulated: lifting on those three surfaces fixes the plain-surface cases, but the needs-attention badge (destructive on destructive/10) is still 3.97 on Zettlr Berlin Dark, so the badge needs its own change (text-foreground on the tint, or measure the error against the tinted fill).
- **B. `primaryFg` chosen by WCAG only** (theme-builder.logic.ts:194, `ensureContrast(p.primaryFg, primary, 4.5)` lands on near-black): findings 6 and 15, every bg-primary + text-primary-foreground pair. `labelColors(primary)` gives white at Lc-76/-77 on the 5 themes, but its darkened fill drops to 3.13-4.57 vs the editor, so the fill cannot also be the text-primary token: add a fill token (or pick primaryFg by APCA and darken only the fill).
- **C. Tokens lifted against editorBg only, used on other surfaces**: findings 1 (primary on primary/15 over popover), 5 (wikilink on collectionBg), 16 (mutedFg/primary on muted, fileExplorerPrimary on fileExplorerAccent). Add the pairs to READABILITY_PAIRS / readableCore surfaces; 1 is simpler fixed in the component (text-foreground on the tint).
- **D. kb.ui hard-coded palettes and inherited text** (findings 7, 8, 10, 11, 12, 13): fixed colors assume a white page. Pick per-cell text with `labelColors`, derive scales/empty/today/stripe from theme vars at paint time; this also removes finding 9's stale html.dark read.
- **E. `--input` = borderStrong** (finding 2): clamp borderStrong to 3:1 on popoverBg and editorBg in the builder; also changes switchUncheckedBg.

## Missed

- Collection table zebra is a no-op: `.cm-lp-collection-table tr:nth-child(even)` (styles.ts:655) uses `--lp-collection-table-alt`, which the built-ins set to their own collectionBg plus alpha (theme.logic.ts:210 `#1e1e2e44`, :308 `#DDD8E845`), and Sakura/Twilight Violet override likewise in the themes repo; SF Light derives it from hover == sidebarBg (theme-builder.logic.ts:282). OKLab distance 0 on KokoBrain Default, Lavender Haze, Sakura, SF Light, Twilight Violet; 1.01-1.03:1 on 8 more. Decorative, not a WCAG failure; low, owner both.

Checked and not reported: navigator out-of-month /40 (scout-03 has it), heatmap legend .6 (scout-03), calendar `content` (emoji in docs), navigator today ring vs nav-bg (all at or above 3), selected navigator text vs file-explorer-primary (same 5 APCA themes as 15).

## Not verified

Not run in the app: finding 9 is a code trace; nav-bg in dark themes was approximated (6% toward black) for the navigator checks; font sizes assume a 16px editor base.
