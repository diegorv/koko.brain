# Scout 11: QueryJS kb.ui helpers (kb-ui.ts)

Read-only audit. Scripts and raw output:
/private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-11-queryjs/
(lib.mts, m1.mts..m5.mts, m1.txt..m5.txt). Run with `node mN.mts`.

## Method

1. Read src/lib/plugins/queryjs/kb-ui.ts end to end (cards, progressBar, heatmap, tagCloud, tags, statusCards, timeline, table, chart, heatmapCalendar, yearlyCalendar), kb-api.ts (renderValue, links, error), queryjs-block-widget.ts (error/run UI) and the QueryJS rules in live-preview/styles.ts:923-1080.
2. Surface stack: every kb.ui helper is appended inside `.cm-lp-qjs-block`, whose background is `--lp-collection-bg` (opaque in all 28 themes, styles.ts:923-931). Text inherits `--editor-fg`. No kb.ui helper sets a surface other than that.
   Resolved per theme from theme-tokens.json cssVars: --editor-fg, --editor-bg, --lp-collection-bg, -border, -table-header-bg, -table-hover, -error, -loading, --lp-codeblock-bg, --lp-wikilink, --primary, --primary-foreground (app.css:455-456 maps the meta-bind primary button vars to these).
3. Translucent fills: `rgba(...)` flattened over the block bg with flatten(). `opacity: N` on a container: fg and bg both blended toward the block bg (fade()), which is what the browser paints.
4. Dark/light as the code sees it: `document.documentElement.classList.contains('dark')` (kb-ui.ts:608, 1018). theme.service.ts:33 sets `html.dark` from `isDarkColor(--editor-bg)` (luminance < 0.2). I recomputed it for all 28 themes: it matches the `dark` flag of every theme, so chart text #fff/#000 is always the right polarity against `--lp-collection-bg` (15.06:1 worst, Graphite Violet).
5. Thresholds: text 4.5; non-text meaningful 3; APCA |Lc| < 45 noted for small text. Font sizes assume a 16px editor font: block is 0.85em, heatmap cell 0.875em of that (~11.9px label, ~13.6px bold value).
6. Cross-checked against scout-03 (faded text) so the opacity-only items it already owns are not repeated as findings.

## Measurements (28 themes, fails counted by theme)

### Heatmap (kb-ui.ts:29-36, 202, 209, 215)

Default scale = fixed rgba (gray .2, red .5, amber .5, yellow .5, lime .5, green .6) flattened over the block bg. The documented example (help/documentation/13-queryjs.md:753) uses the default scale plus `label`.

| element | fails | worst |
|---|---|---|
| value text (editor-fg, bold ~13.6px) step 0 gray | 0/28 | 6.27 |
| value step 1 red .5 | 5 light (all Zettlr light) | 3.83 Lc45 |
| value step 2 amber | 5 dark | 3.26 Shimmering Focus Dark |
| value step 3 yellow | 7 dark | 3.02 Shimmering Focus Dark |
| value step 4 lime | 6 dark | 3.06 Shimmering Focus Dark |
| value step 5 green .6 | 11 dark (all but KokoBrain Default, Willemstad Dark) | 2.80 Shimmering Focus Dark, 2.89 Zettlr Bordeaux Dark |
| label text at opacity .6 (cell 0 gray) | 19 | 2.66 |
| label step 1 | 28/28 | 2.13 Zettlr Berlin Light |
| label step 2 | 27/28 | 2.10 Shimmering Focus Dark |
| label step 3 | 27/28 | 2.00 |
| label step 4 | 27/28 | 2.02 |
| label step 5 | 27/28 | 1.87 Shimmering Focus Dark |
| legend "Low/High" at opacity .6 on block bg | 15 | 2.84 (scout-03 has it) |

### Tag cloud (kb-ui.ts:256, 279-283), default chip, whole-chip opacity 0.4..1.0 over block bg

text at .4: 28/28 fail, worst 1.69 (Zettlr Berlin Light); at .7: 15 fail, worst 2.77; at 1.0: 0 fail (5.22). Same root cause as scout-03 finding 9, not re-reported.

### Cards, timeline, statusCards secondary text (opacity)

cards label @0.7 on the tinted card: 10-11 themes fail (3.19 worst, Berlin Light red). timeline date header @0.7: 6 light fail (3.50); timeline subtitle @0.5: 22 fail (2.30); statusCards subtitle @0.6: 16 fail (2.73). card value (large bold, editor-fg) 0 fail (6.03 worst); statusCards title 0 fail (6.66 worst). All opacity cases are scout-03's root cause (kb-ui.ts:133, 339, 369, 390); numbers agree.
timeline default dot rgba(139,108,239,.8) vs block bg: 15 light themes below 3:1 (2.21 Lavender Haze); the dot is decorative next to the title, not reported.

### Table (kb.ui.table, kb-api table; styles.ts:1016-1034)

th editor-fg on --lp-collection-table-header-bg 0 fail (4.82 worst Zettlr Bordeaux Dark); td on block 0 fail (7.31); td on zebra 0 fail; nav button hover text 0 fail (6.50). Cell borders (--lp-collection-border vs block 1.06 to ~1.9) and footer border rgba(150,150,150,.3) (1.23 worst) are structural lines, not needed to identify content, not reported.
Zebra stripe `rgba(255,255,255,0.03)` (kb-ui.ts:421): over the block bg the stripe is 1.000 to 1.010:1 on all 15 light themes (a 0 to 2 step change out of 255, invisible); dark themes 1.07 to 1.10.
Wikilink in td/footer (`.cm-lp-qjs-link`, styles.ts:992, color --lp-wikilink) on --lp-collection-bg: 7 themes below 4.5 (Sakura 3.79, Shimmering Focus Light 4.08, Willemstad Dark 4.18, Zettlr Berlin Light 4.19, Zettlr Karl-Marx-Stadt Light 4.32, Zettlr Bordeaux Light 4.29, Lavender Haze 4.41). READABILITY_PAIRS (theme-builder.logic.ts:129) tests wikilink only against editorBg, where the same themes pass (4.52 to 5.45).
th does not render links (textContent), so the link-on-header case does not occur.

### Error, loading, run (styles.ts:933-986)

collection-loading on block 0 fail (4.58 worst). collection-error (error title, `.cm-lp-qjs-error`, also the stack on --lp-codeblock-bg) on block bg: 11 themes fail 4.5: Lavender Haze 3.66, Sakura 3.97, Shimmering Focus Dark 4.42, Shimmering Focus Light 3.69, Tolaria Light 3.82, Willemstad Light 3.62, Zettlr Berlin/Bielefeld/Frankfurt/Karl-Marx-Stadt Dark 3.55, Zettlr Bordeaux Dark 3.39. READABILITY_PAIRS has no collectionError pair. details at .85 is scout-03's (22 fail).
Chart error box (kb-ui.ts:601, color-mix red 30% + editor-fg 70% on rgba(239,68,68,.1)): 0 fail (5.12 worst).
Run button (`.cm-lp-qjs-run`: --primary-foreground on --primary): WCAG fails 0 at rest; hover (primary 85% + editor-fg) fails 1 (Zettlr Berlin Light 4.16). APCA below 45: Zettlr Berlin Light #030305 on #12865e Lc33 (4.51:1), Willemstad Dark #090909 on #567f83 Lc33 (4.51:1), Twilight Violet Lc39, Zettlr Frankfurt Dark / Karl-Marx-Stadt Dark Lc41. Same mid-saturated-fill problem as the owner's badge; the token pair is app-wide, so it comes from the theme palette (primaryForeground).

### Chart (kb-ui.ts:607-681)

Text color is #fff or #000 chosen once from `html.dark`; grid rgba(128,128,128,.3) (non-text, 1.31 worst vs block; decorative, not reported). Text vs block bg 0 fail.
Staleness (traced, see finding): colors are baked at render time and the result DOM is cached. Nothing in queryjs or theme.service re-renders on a theme change: `applyMode` only sets `html.dark`, bumps `appliedThemeStore.revision` (no consumer in queryjs or the live-preview extension), and the editor theme compartment reconfigure keeps the widget DOM because `QueryjsBlockWidget.eq` compares only jsContent. The only cache flush is `registerContentInvalidationListener('queryjs-cache', ...)` (queryjs-ports.ts:15), which fires on vault content changes. If a chart was rendered under the opposite mode, text is #000 on a dark block or #fff on a light block: 1.08 to 1.39:1 on every target theme (list in m3.txt). Not run in the live app.
Documented series colors (help/documentation/13-queryjs.md:975-1003: rgba(66,153,225,1) blue, green, purple, orange, gray) are drawn as 2px borders over a .15 fill (expandDataset, kb-ui.ts:1067-1078). Against the block bg on light themes: blue 2.19 worst (15 light fail), green 1.74, orange 1.83, gray 1.88, yellow 1.38, purple 2.74 (3 fail), red 2.70 (3 fail). Dark themes pass.

### Calendars (kb-ui.ts:977, 1018-1019, 800, 893)

- emptyColor `#333`/`#ebedf0` picked from `html.dark`. Empty cell vs block bg: 1.01 to 1.19 on light themes (Cool Mist and Willemstad Light 1.01, Shimmering Focus Light 1.03), 1.19 to 1.46 on dark.
- Default GitHub green scale (`#c6e48b ... #196127`, designed for a white page) vs block bg: light themes level 1 down to 1.01 (Lavender Haze), level 2 1.44, level 3 1.99, all 15 light fail 3:1; level 4 passes (3.20 worst). Dark themes: level 5 `#196127` vs block 1.99 worst (Graphite Violet), 13/13 dark fail; vs the `#333` empty cell 1.67 (KokoBrain Default). Documented palettes behave the same (blue `#1e3a8a` top level 1.45 vs dark block, amber top 2.12, red top 2.51; their level 1 is 1.00 to 1.04 vs block on light themes).
- Today border `solid 1px rgb(61, 61, 61)` is the only today marker. vs empty cell `#333`: 1.16 (KokoBrain Default); vs dark block bg 1.39 worst (Graphite Violet). 13/13 dark themes fail 3:1. Light themes: dark border on light cell, fine (except a today cell at top level 5).
- Cell `content` text (editor-fg, 11px) on the default scale: dark themes fail on levels 1 to 3 (1.07 to 1.66), light themes fail on levels 4 to 5 (1.05 to 1.79). The docs use emoji for `content`, so this is not reported (emoji are not text-contrast bound); a text `content` would be unreadable.

## Findings recorded in the structured result

1. heatmap label opacity .6 over colored cells (28/28, 1.87 worst).
2. heatmap value text on default fixed scale (5 light, 11 dark, 2.80 worst).
3. chart and calendar colors snapshot html.dark and are not redone on theme switch.
4. calendar today border rgb(61,61,61) invisible on dark themes.
5. calendar default palette and empty cell fixed hex, not theme aware.
6. collection-error text on collection-bg below 4.5 in 11 themes (no READABILITY_PAIRS pair).
7. wikilink in QueryJS tables below 4.5 on collection-bg in 7 themes.
8. documented chart series colors below 3:1 on light themes.
9. run button primary pair APCA low (4 to 5 themes), hover 4.16 on Berlin Light.
10. table zebra invisible on light themes.

## Not checked

- Nothing was run in the live app: no screenshots; all numbers are computed from resolved tokens. The font size assumption (16px editor) affects only the large/small text classification (card value counted large, everything else small).
- User-supplied colors (`color` options, `rowStyle`, `dotColor`, custom `colorScale`, `colors` palettes, chart dataset colors) cannot be audited; only defaults and documented examples were measured.
- Chart.js tooltip colors (Chart.js defaults, not set by the app) and Chart.js default legend hover.
- kb-api.ts list/tasklist/value renderers (belong to another area), `kb.ui.statusCards` badge (in flight), `kb.ui.tags` default text (in flight).
- `color-mix(in oklab)` in `tags`/chart error was approximated by mixColors (OKLab hex), within rounding.
