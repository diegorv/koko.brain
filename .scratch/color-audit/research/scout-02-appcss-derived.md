# Scout 02: app.css derived colors

Read-only audit. Area: vars that `src/app.css` derives with color-mix(), opacity or relative color, and the surfaces and text they sit on, on all 28 themes.

## Method

- Resolved each theme's cssVars (theme-tokens.json) plus the app.css derived declarations (parsed from `src/app.css` lines 381-393 column tones, 402-415 event colors, 420-466 code block, syntax and meta-bind vars). `.dark` rules (rail/nav/list) applied when `isDarkColor(--editor-bg) !== false`, the same test as `theme.service.ts:31`; it agrees with the JSON `dark` flag on all 28 themes. No derived name collides with an inline theme var.
- Own resolver (`lib.mjs` in the scratchpad): var(), color-mix in oklab / srgb / oklch with premultiplied alpha and `transparent`, `oklch(from X calc(l - n) c h)`. Alpha colors are composited in gamma-encoded sRGB over the real surface (Tailwind `/N` opacities treated as plain alpha, hover `brightness-110` as x1.1 on sRGB channels).
- Validation: the oklab event vars match `mixColors` from color-tools.mts exactly (28 themes x 4 vars, 0 mismatches). The oklch rail/list mix and the relative-color nav/rail dark values were NOT checked against a real browser (chrome-devtools MCP timed out connecting). Out-of-gamut oklab results (6 evaluations total) are clamped per channel.
- WCAG 2 ratio and APCA Lc (same constants as color-tools `labelColors`). Thresholds: text 4.5, icons and selected-state indicators 3, APCA |Lc| < 45 flagged for small text.
- Surfaces and fg usage were traced by reading the component classes (file:line in each finding).

## Findings (ranked)

1. [high] Files/Types navigator selected row: `text-file-explorer-primary` on `bg-file-explorer-primary/25` over `--nav-bg`. 20/28 themes below 4.5; worst 2.97 Zettlr Karl-Marx-Stadt Light, 2.98 Shimmering Focus Light, 3.00 Sakura, 3.07 Twilight Violet; KokoBrain Default 4.06. FilesNavigator.svelte:347-350, TypesNavigator.svelte:282, 411. The same text on the 25% tint over `--list-bg`: 21 fail. Fix is app side: the tint and its source color cannot be text and background of each other; `text-file-explorer-fg` on the tint passes everywhere (worst 5.03).
2. [high] Search result snippet `<mark>`: `--lp-highlight-bg` (alpha, tuned for editor text) behind inherited `--file-explorer-muted-fg`. 14/28 fail; worst 1.61 on the four Zettlr dark themes, KokoBrain Default 2.43, Willemstad Dark 2.65, Twilight Violet 2.72. app.css:488, SearchResult.svelte:171.
3. [high] Rail item icon colors are hardcoded saturated hues, same on every theme, drawn on `--rail-bg` (darker than the light panel): 15 light themes fail 3:1 for most icons; favorites #eab308 1.31 on Sepia (1.39 Lavender Haze), tasks #22c55e 1.56, files #14b8a6 1.71, fallback/pins #0ea5e9 1.90, today #f97316 1.92. On the active-row 18% tint they get worse (favorites 1.24). rail-items.logic.ts:144-155, 160-165, Rail.svelte:386. Dark themes pass.
4. [medium] Destructive used as text: theme-builder lifts `error` to only 3:1 on editorBg (theme-builder.logic.ts:187) but `text-destructive` is small error text in 35 components on popover, settings dialog, list and editor surfaces and on `bg-destructive/10` boxes (meta-bind error app.css:463 + styles.ts:806, RailNoteList.svelte:1093, TasksView.svelte:634, CollectionView.svelte:520, EventForm.svelte:115). 10 to 15 themes fail by surface; worst 2.79 (error box) and 2.96 (popover) on Zettlr dark themes; KokoBrain Default 3.02 popover, 3.20 error box.
5. [medium] Types navigator count (`--file-explorer-badge-fg`, 12px) on the selected row tint: 21/28 fail, worst 3.08 KokoBrain Default, 3.15 Lavender Haze. TypesNavigator.svelte:299, 430.
6. [medium] SearchResult "Semantic" and "Both" badges (11px): `--search-semantic-fg` / primary on a 15% tint over `--list-bg`: 14/28 fail, worst 3.25-3.27 Twilight Violet, 3.55-3.57 Sakura, Shimmering Focus Light, Willemstad Dark. SearchResult.svelte:153-155; tokens theme-builder.logic.ts:243. Same cause on the fuzzy toggle (SearchPanel.svelte:348, 20/28 fail, worst 3.03).
7. [medium] SearchResult "Text" badge and every `bg-muted` + muted text chip: `--file-explorer-muted-fg` / `--muted-foreground` on `--muted`: 14/28 fail, worst 2.52 Zettlr Bordeaux Dark, 2.58 other Zettlr dark, 3.68 Zettlr light. SearchResult.svelte:156, TrashSection.svelte:68, EventForm.svelte:97, AutoOrganizeRuleRow.svelte:444, QuickSwitcher.svelte:150. `muted` vs `mutedForeground` (theme-builder.logic.ts:234) is not in READABILITY_PAIRS.
8. [medium] Dark/black label on saturated fills: `--primary-foreground` on `--primary` (5 themes) and `--destructive-foreground` on `--destructive` (7 themes, including built-in KokoBrain Default #171717 on #f3333b). WCAG 4.51-4.95 but APCA Lc 32.8-41.5; white would be Lc -63 to -77 but only 3.1-4.6 WCAG (below 4.5 on 11 of the 12 pairs), so the fill must darken (what `labelColors` does). theme-builder.logic.ts:194, 198. This is the owner's original bug class on every button.
9. [medium] Code block header: language label and copy button (0.7em) use `--muted-foreground` on `--lp-codeblock-header-bg`: 13/28 fail, worst 3.84 Sakura, 3.89 Lavender Haze, 3.93 Tolaria Light; copy hover (`--lp-codeblock-copy-hover` at 88 alpha) 15 fail, worst 3.34. app.css:427-428, 426; styles.ts:350, 356, 370.
10. [medium] Input boundary: `--input` border and `--input-bg` fill vs surface. Border 25-26/28 under 3:1 (KokoBrain Default 1.09 vs editor, 1.24 vs popover; Sakura 1.06 vs popover), fill 1.0-1.2 everywhere. input.svelte:43, meta-bind select styles.ts:730. Fields are nearly invisible in dialogs on the default theme until focused.
11. [medium] Collection null/empty text (`--lp-collection-null`/`-empty` = faintFg): 27/28 fail on collection-bg, worst 1.33 Sakura, 1.37 Lavender Haze, KokoBrain Default 2.46. theme-builder.logic.ts:283, styles.ts:620, 658, 670.
12. [medium] Date input text is `--foreground` at 70% (app.css:480-481): 5 Zettlr light themes 3.69:1 on `--input-bg`; right sidebar variant also Sakura 4.37.
13. [medium] `--lp-syntax-punctuation` (app.css:444, 65% editor-fg toward codeblock-bg): 7 light themes fail on codeblock-bg, worst 3.32 Zettlr Berlin/Frankfurt/Karl-Marx-Stadt Light, 3.47 Bielefeld/Bordeaux Light; also 8 fail on editor-bg for code files. `--lp-syntax-comment` (app.css:439) 4.24 on Zettlr Berlin Light.
14. [low] Meta-bind hover fills mix toward `--editor-fg`, the same polarity as the label: destructive hover 8 fail, worst 3.15 Willemstad Light, 3.67 Zettlr dark; primary hover Zettlr Berlin Light 4.16. app.css:457, 460.
15. [low] Event chips (`--event-*-fg` on `--event-*-bg`, 11-12px): all six hues fail on Zettlr Bielefeld Light (4.10-4.40); green and cyan 4.46-4.50 on four more Zettlr light themes. The app.css:398-401 comment only validates KokoBrain Default and Sakura. app.css:403-414. APCA fine (Lc 57+).
16. [low] Archived event chips use `opacity-50` on the whole chip: text lands at 1.9-3.0 on 15-18 themes (worst 1.93 Zettlr Bielefeld Light). Deliberate de-emphasis but still clickable text. EventBlock.svelte:80, EventMonthGrid.svelte:135, EventAllDayLane.svelte:81. Lock icon at opacity .7 is 2.60-2.74 on 5 Zettlr light themes.
17. [low] Selected event ring `ring-primary/70` vs editor-bg: 10 themes 2.68-2.97 (needs 3). EventBlock.svelte:79.
18. [low] `==highlight==` text: `--editor-fg` on `--lp-highlight-bg` over editor-bg is 3.94 on four Zettlr dark themes. styles.ts:269 (token from themes repo).
19. [low] `--file-explorer-primary` text on nav/list surfaces: nav 8 fail (worst 4.08 Shimmering Focus Light), list 7 fail (worst 3.97 Twilight Violet); `fileExplorerPrimary: p.primary` (theme-builder.logic.ts:241) is lifted only on editorBg. Calendar nav month title CalendarNavigator.svelte:114.
20. [low] Active-line gutter number: `--muted-foreground` on `--syntax-active-line-gutter`: 11/28 fail, worst 2.52 Zettlr Bordeaux Dark. editor-theme.ts:66-67.

## Passed (not findings)

- `--rail-muted-fg` on `--rail-bg`: all 28 pass (worst 4.61 Zettlr Bielefeld Light). Rail row text `file-explorer-fg` and `/85`: worst 4.54. Active rail row text on the 18% tint: worst 5.37.
- `--file-explorer-fg` on rail/nav/list: all pass (worst 6.37). `--file-explorer-muted-fg` and badge-fg on nav and list: all pass (worst 4.50 / 4.51), but only barely on KokoBrain Default and Lavender Haze; several dark themes sit at APCA Lc 38-43.
- `--lp-syntax-*` except punctuation and comment: all pass on codeblock-bg (worst 4.65 string, Zettlr Berlin Light) and editor-bg. `--lp-codeblock-text`, meta-bind select text, default/plain buttons, primary/destructive base labels: pass WCAG.
- Event swatches and popover dot (`--event-*-fg` vs editor-bg / popover): all >= 4.89.
- Highlight on KokoBrain Default and light themes with editor text, active line, table alt rows, collection hover, `.cm-lp-tag` pill (5 Zettlr light themes 4.00-4.35, low, not listed separately), COLOR_PRESET_CHIP_TEXT (see c3 output J-chip, passes except near-threshold).
- Decorative: scrim, elevation ring (1.0-1.3 vs popover, edge only, popover also has a border in CM tooltips), codeblock edge, rail dividers, `--file-explorer-border` dividers 1.1-2.2: not reported (decorative separators).

## Not checked

- Real rendering: no browser or app launch, so oklch/relative-color resolution is from my own math (event oklab vars were cross-checked, rail/nav/list were not).
- Surfaces I assumed: chips on editor-bg; dialog inputs on `--popover` (checked popover, card, settings-dialog-bg all).
- Hover/focus compositions beyond those listed; images, charts, canvas; tailwind opacity colors outside app.css-derived surfaces; the 134th var (`--lp-frontmatter-bg`) on Sakura and Twilight Violet.
- Whether `--input`/`--muted` boundaries need 3:1 where a text label also identifies the component (WCAG 1.4.11 leaves that to judgment); reported at medium.

## Raw measurements

Format per check: failing themes with WCAG ratio; APCA list = passes WCAG but |Lc| < 45. Scripts: /private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-02-appcss-derived/ (lib.mjs, c1-c5.mjs). Note in c1 the rows for rail-bg other than rail-muted/fg/fg85 (muted-fg, primary, badge, destructive, tab-inactive on rail-bg) are not drawn on the rail and are not findings; duplicate id B-rail-muted appears twice (second is file-explorer-muted-fg).

### c1
```

## A-event-green: event green chip text fg on bg (11-12px text) (min 4.5)
  fail 5/28; worst 4.12 on Zettlr Bielefeld Light (fg #4f6f66 bg #c8e5ce, Lc 58.02); apca<45 while wcag ok: 0
  FAIL: Zettlr Berlin Light 4.50; Zettlr Bielefeld Light 4.12; Zettlr Bordeaux Light 4.48; Zettlr Frankfurt Light 4.50; Zettlr Karl-Marx-Stadt Light 4.50

## A-event-purple: event purple chip text fg on bg (11-12px text) (min 4.5)
  fail 1/28; worst 4.40 on Zettlr Bielefeld Light (fg #605788 bg #d6d0f0, Lc 57.15); apca<45 while wcag ok: 0
  FAIL: Zettlr Bielefeld Light 4.40

## A-event-cyan: event cyan chip text fg on bg (11-12px text) (min 4.5)
  fail 5/28; worst 4.10 on Zettlr Bielefeld Light (fg #4f6e7d bg #c8e4e4, Lc 58.00); apca<45 while wcag ok: 0
  FAIL: Zettlr Berlin Light 4.47; Zettlr Bielefeld Light 4.10; Zettlr Bordeaux Light 4.46; Zettlr Frankfurt Light 4.47; Zettlr Karl-Marx-Stadt Light 4.47

## A-event-orange: event orange chip text fg on bg (11-12px text) (min 4.5)
  fail 1/28; worst 4.17 on Zettlr Bielefeld Light (fg #825e53 bg #f9d5bb, Lc 57.84); apca<45 while wcag ok: 0
  FAIL: Zettlr Bielefeld Light 4.17

## A-event-pink: event pink chip text fg on bg (11-12px text) (min 4.5)
  fail 1/28; worst 4.30 on Zettlr Bielefeld Light (fg #80536c bg #f7ccd4, Lc 57.41); apca<45 while wcag ok: 0
  FAIL: Zettlr Bielefeld Light 4.30

## A-event-blue: event blue chip text fg on bg (11-12px text) (min 4.5)
  fail 1/28; worst 4.32 on Zettlr Bielefeld Light (fg #4d6087 bg #c5d9ef, Lc 57.74); apca<45 while wcag ok: 0
  FAIL: Zettlr Bielefeld Light 4.32

## B-rail-muted: Rail section label --rail-muted-fg on --rail-bg (11px uppercase) (min 4.5)
  fail 0/28; worst 4.61 on Zettlr Bielefeld Light (fg #5f5f67 bg #dcdcdc, Lc 60.99); apca<45 while wcag ok: 0

## B-rail-fg: Rail row text-file-explorer-fg on rail-bg (min 4.5)
  fail 0/28; worst 6.37 on Zettlr Bielefeld Light (fg #4a4a54 bg #dcdcdc, Lc 69.49); apca<45 while wcag ok: 0

## B-rail-fg85: Rail inactive row text-file-explorer-fg/85 on rail-bg (min 4.5)
  fail 0/28; worst 4.54 on Zettlr Bielefeld Light (fg #606068 bg #dcdcdc, Lc 60.57); apca<45 while wcag ok: 0

## B-rail-muted: text-file-explorer-muted-fg on --rail-bg (min 4.5)
  fail 9/28; worst 4.01 on Lavender Haze (fg #6b6486 bg #dcdbe0, Lc 56.91); apca<45 while wcag ok: 7
  FAIL: Lavender Haze 4.01; Foolscap 4.33; Sakura 4.47; Tolaria Light 4.08; Zettlr Berlin Light 4.12; Zettlr Bielefeld Light 4.02; Zettlr Bordeaux Light 4.12; Zettlr Frankfurt Light 4.12; Zettlr Karl-Marx-Stadt Light 4.12
  APCA: KokoBrain Default 5.37/Lc-41.04; Twilight Violet 5.50/Lc-42.41; Zettlr Berlin Dark 6.07/Lc-43.00; Zettlr Bielefeld Dark 6.07/Lc-43.00; Zettlr Bordeaux Dark 5.92/Lc-41.99; Zettlr Frankfurt Dark 6.07/Lc-43.00; Zettlr Karl-Marx-Stadt Dark 6.07/Lc-43.00

## B-rail-primary: text-file-explorer-primary on --rail-bg (min 4.5)
  fail 9/28; worst 3.63 on Shimmering Focus Light (fg #108189 bg #e2e3e8, Lc 55.37); apca<45 while wcag ok: 4
  FAIL: Cool Mist 4.49; Sakura 3.70; Shimmering Focus Light 3.63; Tolaria Light 4.28; Zettlr Berlin Light 3.73; Zettlr Bielefeld Light 3.68; Zettlr Bordeaux Light 3.82; Zettlr Frankfurt Light 4.04; Zettlr Karl-Marx-Stadt Light 3.85
  APCA: Twilight Violet 4.75/Lc-36.87; Willemstad Dark 4.55/Lc-31.05; Zettlr Frankfurt Dark 6.08/Lc-43.20; Zettlr Karl-Marx-Stadt Dark 6.11/Lc-43.92

## B-rail-fg: text-file-explorer-fg on --rail-bg (min 4.5)
  fail 0/28; worst 6.37 on Zettlr Bielefeld Light (fg #4a4a54 bg #dcdcdc, Lc 69.49); apca<45 while wcag ok: 0

## B-rail-badge: text-file-explorer-badge-fg on --rail-bg (min 4.5)
  fail 9/28; worst 4.01 on Lavender Haze (fg #6b6486 bg #dcdbe0, Lc 56.91); apca<45 while wcag ok: 7
  FAIL: Lavender Haze 4.01; Foolscap 4.33; Sakura 4.47; Tolaria Light 4.08; Zettlr Berlin Light 4.12; Zettlr Bielefeld Light 4.02; Zettlr Bordeaux Light 4.12; Zettlr Frankfurt Light 4.12; Zettlr Karl-Marx-Stadt Light 4.12
  APCA: KokoBrain Default 5.39/Lc-41.12; Twilight Violet 5.47/Lc-42.21; Zettlr Berlin Dark 6.07/Lc-43.00; Zettlr Bielefeld Dark 6.07/Lc-43.00; Zettlr Bordeaux Dark 5.92/Lc-41.99; Zettlr Frankfurt Dark 6.07/Lc-43.00; Zettlr Karl-Marx-Stadt Dark 6.07/Lc-43.00

## B-rail-destructive: text-destructive on --rail-bg (min 4.5)
  fail 14/28; worst 3.23 on Willemstad Light (fg #e93147 bg #e1e1e1, Lc 49.64); apca<45 while wcag ok: 2
  FAIL: KokoBrain Default 4.37; Lavender Haze 3.70; Sakura 3.94; Shimmering Focus Light 3.29; Tolaria Light 3.40; Twilight Violet 4.44; Willemstad Light 3.23; Zettlr Berlin Dark 4.04; Zettlr Bielefeld Dark 4.04; Zettlr Bielefeld Light 4.03; Zettlr Bordeaux Dark 3.85; Zettlr Bordeaux Light 4.34; Zettlr Frankfurt Dark 4.04; Zettlr Karl-Marx-Stadt Dark 4.04
  APCA: Shimmering Focus Dark 5.18/Lc-39.99; Willemstad Dark 5.82/Lc-40.98

## B-rail-tabinactive: icon text-tab-text-inactive on --rail-bg (3:1 icon / 4.5 text) (min 3)
  fail 0/28; worst 3.67 on Zettlr Bielefeld Light (fg #6e6e77 bg #dcdcdc, Lc 54.39); apca<45 while wcag ok: 5
  APCA: Zettlr Berlin Dark 6.07/Lc-43.00; Zettlr Bielefeld Dark 6.07/Lc-43.00; Zettlr Bordeaux Dark 5.92/Lc-41.99; Zettlr Frankfurt Dark 6.07/Lc-43.00; Zettlr Karl-Marx-Stadt Dark 6.07/Lc-43.00

## B-nav-muted: text-file-explorer-muted-fg on --nav-bg (min 4.5)
  fail 0/28; worst 4.50 on Lavender Haze (fg #6b6486 bg #e8e7ec, Lc 63.82); apca<45 while wcag ok: 7
  APCA: KokoBrain Default 4.96/Lc-40.05; Twilight Violet 5.06/Lc-41.37; Zettlr Berlin Dark 5.73/Lc-42.43; Zettlr Bielefeld Dark 5.73/Lc-42.43; Zettlr Bordeaux Dark 5.59/Lc-41.42; Zettlr Frankfurt Dark 5.73/Lc-42.43; Zettlr Karl-Marx-Stadt Dark 5.73/Lc-42.43

## B-nav-primary: text-file-explorer-primary on --nav-bg (min 4.5)
  fail 8/28; worst 4.08 on Shimmering Focus Light (fg #108189 bg #eff0f5, Lc 62.95); apca<45 while wcag ok: 2
  FAIL: Sakura 4.15; Shimmering Focus Light 4.08; Twilight Violet 4.37; Willemstad Dark 4.39; Zettlr Berlin Light 4.19; Zettlr Bielefeld Light 4.13; Zettlr Bordeaux Light 4.29; Zettlr Karl-Marx-Stadt Light 4.32
  APCA: Zettlr Frankfurt Dark 5.74/Lc-42.62; Zettlr Karl-Marx-Stadt Dark 5.77/Lc-43.34

## B-nav-fg: text-file-explorer-fg on --nav-bg (min 4.5)
  fail 0/28; worst 7.15 on Zettlr Bielefeld Light (fg #4a4a54 bg #e8e8e8, Lc 76.41); apca<45 while wcag ok: 0

## B-nav-badge: text-file-explorer-badge-fg on --nav-bg (min 4.5)
  fail 0/28; worst 4.50 on Lavender Haze (fg #6b6486 bg #e8e7ec, Lc 63.82); apca<45 while wcag ok: 7
  APCA: KokoBrain Default 4.97/Lc-40.14; Twilight Violet 5.04/Lc-41.17; Zettlr Berlin Dark 5.73/Lc-42.43; Zettlr Bielefeld Dark 5.73/Lc-42.43; Zettlr Bordeaux Dark 5.59/Lc-41.42; Zettlr Frankfurt Dark 5.73/Lc-42.43; Zettlr Karl-Marx-Stadt Dark 5.73/Lc-42.43

## B-nav-destructive: text-destructive on --nav-bg (min 4.5)
  fail 12/28; worst 3.62 on Willemstad Light (fg #e93147 bg #eeeeee, Lc 57.20); apca<45 while wcag ok: 2
  FAIL: KokoBrain Default 4.03; Lavender Haze 4.15; Sakura 4.42; Shimmering Focus Light 3.69; Tolaria Light 3.82; Twilight Violet 4.09; Willemstad Light 3.62; Zettlr Berlin Dark 3.81; Zettlr Bielefeld Dark 3.81; Zettlr Bordeaux Dark 3.64; Zettlr Frankfurt Dark 3.81; Zettlr Karl-Marx-Stadt Dark 3.81
  APCA: Shimmering Focus Dark 4.81/Lc-39.14; Willemstad Dark 5.61/Lc-40.77

## B-nav-tabinactive: icon text-tab-text-inactive on --nav-bg (3:1 icon / 4.5 text) (min 3)
  fail 0/28; worst 4.12 on Zettlr Bielefeld Light (fg #6e6e77 bg #e8e8e8, Lc 61.30); apca<45 while wcag ok: 5
  APCA: Zettlr Berlin Dark 5.73/Lc-42.43; Zettlr Bielefeld Dark 5.73/Lc-42.43; Zettlr Bordeaux Dark 5.59/Lc-41.42; Zettlr Frankfurt Dark 5.73/Lc-42.43; Zettlr Karl-Marx-Stadt Dark 5.73/Lc-42.43

## B-list-muted: text-file-explorer-muted-fg on --list-bg (min 4.5)
  fail 0/28; worst 4.51 on KokoBrain Default (fg #8490ad bg #262938, Lc -38.80); apca<45 while wcag ok: 7
  APCA: KokoBrain Default 4.51/Lc-38.80; Twilight Violet 4.60/Lc-40.06; Zettlr Berlin Dark 5.34/Lc-41.60; Zettlr Bielefeld Dark 5.34/Lc-41.60; Zettlr Bordeaux Dark 5.20/Lc-40.59; Zettlr Frankfurt Dark 5.34/Lc-41.60; Zettlr Karl-Marx-Stadt Dark 5.34/Lc-41.60

## B-list-primary: text-file-explorer-primary on --list-bg (min 4.5)
  fail 7/28; worst 3.97 on Twilight Violet (fg #9a7bb9 bg #2c2a34, Lc -34.52); apca<45 while wcag ok: 2
  FAIL: Sakura 4.33; Shimmering Focus Light 4.30; Twilight Violet 3.97; Willemstad Dark 4.18; Zettlr Berlin Light 4.38; Zettlr Bielefeld Light 4.33; Zettlr Bordeaux Light 4.47
  APCA: Zettlr Frankfurt Dark 5.34/Lc-41.79; Zettlr Karl-Marx-Stadt Dark 5.37/Lc-42.52

## B-list-fg: text-file-explorer-fg on --list-bg (min 4.5)
  fail 0/28; worst 7.49 on Zettlr Bielefeld Light (fg #4a4a54 bg #edede8, Lc 79.12); apca<45 while wcag ok: 0

## B-list-badge: text-file-explorer-badge-fg on --list-bg (min 4.5)
  fail 0/28; worst 4.52 on KokoBrain Default (fg #8a8faa bg #262938, Lc -38.89); apca<45 while wcag ok: 7
  APCA: KokoBrain Default 4.52/Lc-38.89; Twilight Violet 4.57/Lc-39.86; Zettlr Berlin Dark 5.34/Lc-41.60; Zettlr Bielefeld Dark 5.34/Lc-41.60; Zettlr Bordeaux Dark 5.20/Lc-40.59; Zettlr Frankfurt Dark 5.34/Lc-41.60; Zettlr Karl-Marx-Stadt Dark 5.34/Lc-41.60

## B-list-destructive: text-destructive on --list-bg (min 4.5)
  fail 12/28; worst 3.39 on Zettlr Bordeaux Dark (fg #d3322f bg #1e1e1e, Lc -27.29); apca<45 while wcag ok: 1
  FAIL: KokoBrain Default 3.67; Lavender Haze 4.34; Shimmering Focus Dark 4.42; Shimmering Focus Light 3.89; Tolaria Light 3.97; Twilight Violet 3.71; Willemstad Light 3.91; Zettlr Berlin Dark 3.55; Zettlr Bielefeld Dark 3.55; Zettlr Bordeaux Dark 3.39; Zettlr Frankfurt Dark 3.55; Zettlr Karl-Marx-Stadt Dark 3.55
  APCA: Willemstad Dark 5.34/Lc-40.31

## B-list-tabinactive: icon text-tab-text-inactive on --list-bg (3:1 icon / 4.5 text) (min 3)
  fail 0/28; worst 4.32 on Zettlr Bielefeld Light (fg #6e6e77 bg #edede8, Lc 64.01); apca<45 while wcag ok: 6
  APCA: Twilight Violet 5.12/Lc-44.47; Zettlr Berlin Dark 5.34/Lc-41.60; Zettlr Bielefeld Dark 5.34/Lc-41.60; Zettlr Bordeaux Dark 5.20/Lc-40.59; Zettlr Frankfurt Dark 5.34/Lc-41.60; Zettlr Karl-Marx-Stadt Dark 5.34/Lc-41.60

## B-nav-sel25: TypesNavigator selected row: file-explorer-primary text on primary/25 over nav-bg (min 4.5)
  fail 20/28; worst 2.97 on Zettlr Karl-Marx-Stadt Light (fg #dc2d2d bg #efc3c3, Lc 42.27); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 4.06; Lavender Haze 3.88; Cool Mist 3.56; Foolscap 3.90; Graphite Violet 4.19; Mint Linen 3.88; Sakura 3.00; Sepia 3.59; Shimmering Focus Light 2.98; Tolaria Light 3.35; Twilight Violet 3.07; Willemstad Dark 3.34; Zettlr Berlin Dark 4.36; Zettlr Berlin Light 3.04; Zettlr Bielefeld Light 3.06; Zettlr Bordeaux Light 3.10; Zettlr Frankfurt Dark 3.91; Zettlr Frankfurt Light 3.26; Zettlr Karl-Marx-Stadt Dark 3.98; Zettlr Karl-Marx-Stadt Light 2.97

## B-nav-sel25-fg: selected row primary/25 over nav-bg with file-explorer-fg text (FilesNavigator active) (min 4.5)
  fail 0/28; worst 5.03 on Zettlr Karl-Marx-Stadt Light (fg #50505a bg #efc3c3, Lc 58.93); apca<45 while wcag ok: 0

## B-nav-sel25-muted: selected row primary/25 over nav-bg with muted text (min 4.5)
  fail 21/28; worst 3.08 on KokoBrain Default (fg #8490ad bg #3e425b, Lc -31.68); apca<45 while wcag ok: 1
  FAIL: KokoBrain Default 3.08; Lavender Haze 3.15; Cool Mist 3.91; Deep Ocean 4.39; Foolscap 3.40; Graphite Violet 4.34; Mint Linen 3.56; Sakura 3.62; Sepia 3.81; Tolaria Light 3.19; Twilight Violet 3.55; Zettlr Berlin Dark 3.80; Zettlr Berlin Light 3.37; Zettlr Bielefeld Dark 3.23; Zettlr Bielefeld Light 3.33; Zettlr Bordeaux Dark 3.23; Zettlr Bordeaux Light 3.35; Zettlr Frankfurt Dark 3.90; Zettlr Frankfurt Light 3.33; Zettlr Karl-Marx-Stadt Dark 3.96; Zettlr Karl-Marx-Stadt Light 3.19
  APCA: Willemstad Dark 5.11/Lc-43.18

## B-nav-hover10-muted: hover primary/10 over nav-bg with muted text (min 4.5)
  fail 12/28; worst 3.92 on Lavender Haze (fg #6b6486 bg #dbd7e5, Lc 55.38); apca<45 while wcag ok: 5
  FAIL: KokoBrain Default 4.15; Lavender Haze 3.92; Foolscap 4.24; Mint Linen 4.42; Sakura 4.42; Tolaria Light 3.98; Twilight Violet 4.43; Zettlr Berlin Light 4.09; Zettlr Bielefeld Light 4.01; Zettlr Bordeaux Light 4.08; Zettlr Frankfurt Light 4.08; Zettlr Karl-Marx-Stadt Light 4.00
  APCA: Zettlr Berlin Dark 5.00/Lc-40.68; Zettlr Bielefeld Dark 4.72/Lc-39.95; Zettlr Bordeaux Dark 4.66/Lc-39.13; Zettlr Frankfurt Dark 5.02/Lc-40.81; Zettlr Karl-Marx-Stadt Dark 5.06/Lc-40.97

## B-list-err: RailNoteList error alert text-destructive on destructive/10 over list-bg (14px) (min 4.5)
  fail 15/28; worst 3.15 on Zettlr Bordeaux Dark (fg #d3322f bg #302020, Lc -26.34); apca<45 while wcag ok: 2
  FAIL: KokoBrain Default 3.40; Lavender Haze 3.78; Sakura 3.99; Shimmering Focus Dark 3.99; Shimmering Focus Light 3.38; Tolaria Light 3.47; Twilight Violet 3.32; Willemstad Light 3.40; Zettlr Berlin Dark 3.27; Zettlr Bielefeld Dark 3.27; Zettlr Bielefeld Light 4.08; Zettlr Bordeaux Dark 3.15; Zettlr Bordeaux Light 4.34; Zettlr Frankfurt Dark 3.27; Zettlr Karl-Marx-Stadt Dark 3.27
  APCA: Graphite Violet 4.85/Lc-44.99; Willemstad Dark 4.84/Lc-39.17

## B-search-fuzzy: SearchPanel fuzzy toggle primary on primary/20 over list-bg (min 4.5)
  fail 20/28; worst 3.03 on Twilight Violet (fg #9a7bb9 bg #423a4f, Lc -29.59); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 4.11; Lavender Haze 4.35; Cool Mist 3.97; Foolscap 4.43; Graphite Violet 4.26; Mint Linen 4.34; Sakura 3.33; Sepia 4.05; Shimmering Focus Light 3.33; Tolaria Light 3.74; Twilight Violet 3.03; Willemstad Dark 3.35; Zettlr Berlin Dark 4.44; Zettlr Berlin Light 3.38; Zettlr Bielefeld Light 3.39; Zettlr Bordeaux Light 3.44; Zettlr Frankfurt Dark 3.94; Zettlr Frankfurt Light 3.63; Zettlr Karl-Marx-Stadt Dark 4.02; Zettlr Karl-Marx-Stadt Light 3.34

## B-rail-primary-sel: accent-fg on accent hover chips (hover:text-tab-text-active on file-explorer-accent) (min 4.5)
  fail 0/28; worst 4.76 on Zettlr Berlin Light (fg #50505a bg #c8c8c8, Lc 55.89); apca<45 while wcag ok: 0

## B-rail-inactive-hover: tab-text-inactive on file-explorer-accent (hover bg) (min 3)
  fail 0/28; worst 3.02 on Zettlr Berlin Light (fg #6e6e77 bg #c8c8c8, Lc 43.15); apca<45 while wcag ok: 13
  APCA: Deep Ocean 4.50/Lc-43.66; Graphite Violet 3.70/Lc-42.04; Twilight Violet 4.39/Lc-41.90; Zettlr Berlin Dark 4.67/Lc-39.83; Zettlr Berlin Light 3.02/Lc43.15; Zettlr Bielefeld Dark 4.67/Lc-39.83; Zettlr Bielefeld Light 3.02/Lc43.15; Zettlr Bordeaux Dark 4.55/Lc-38.82; Zettlr Bordeaux Light 3.02/Lc43.15; Zettlr Frankfurt Dark 4.67/Lc-39.83; Zettlr Frankfurt Light 3.02/Lc43.15; Zettlr Karl-Marx-Stadt Dark 4.67/Lc-39.83; Zettlr Karl-Marx-Stadt Light 3.02/Lc43.15

## B-search-semantic: SearchResult "Semantic" badge: search-semantic-fg on search-semantic-bg over list-bg (11px) (min 4.5)
  fail 14/28; worst 3.27 on Twilight Violet (fg #9a7bb9 bg #3c3648, Lc -31.05); apca<45 while wcag ok: 1
  FAIL: Cool Mist 4.28; Sakura 3.57; Sepia 4.37; Shimmering Focus Light 3.56; Tolaria Light 4.04; Twilight Violet 3.27; Willemstad Dark 3.57; Zettlr Berlin Light 3.62; Zettlr Bielefeld Light 3.62; Zettlr Bordeaux Light 3.69; Zettlr Frankfurt Dark 4.29; Zettlr Frankfurt Light 3.89; Zettlr Karl-Marx-Stadt Dark 4.37; Zettlr Karl-Marx-Stadt Light 3.61
  APCA: Zettlr Berlin Dark 4.88/Lc-44.62

## B-search-both: SearchResult "Both" badge: file-explorer-primary on primary/15 over list-bg (11px) (min 4.5)
  fail 14/28; worst 3.25 on Twilight Violet (fg #9a7bb9 bg #3d3648, Lc -30.98); apca<45 while wcag ok: 1
  FAIL: Cool Mist 4.27; Sakura 3.57; Sepia 4.37; Shimmering Focus Light 3.55; Tolaria Light 4.03; Twilight Violet 3.25; Willemstad Dark 3.57; Zettlr Berlin Light 3.61; Zettlr Bielefeld Light 3.61; Zettlr Bordeaux Light 3.68; Zettlr Frankfurt Dark 4.29; Zettlr Frankfurt Light 3.89; Zettlr Karl-Marx-Stadt Dark 4.36; Zettlr Karl-Marx-Stadt Light 3.61
  APCA: Zettlr Berlin Dark 4.87/Lc-44.62

## B-search-text: SearchResult "Text" badge: muted-fg on --muted over list-bg (11px) (min 4.5)
  fail 14/28; worst 2.52 on Zettlr Bordeaux Dark (fg #8f8f98 bg #505050, Lc -27.16); apca<45 while wcag ok: 1
  FAIL: Lavender Haze 3.68; Sakura 4.26; Tolaria Light 4.15; Twilight Violet 4.16; Zettlr Berlin Dark 2.58; Zettlr Berlin Light 3.68; Zettlr Bielefeld Dark 2.58; Zettlr Bielefeld Light 4.03; Zettlr Bordeaux Dark 2.52; Zettlr Bordeaux Light 3.68; Zettlr Frankfurt Dark 2.58; Zettlr Frankfurt Light 3.68; Zettlr Karl-Marx-Stadt Dark 2.58; Zettlr Karl-Marx-Stadt Light 3.68
  APCA: KokoBrain Default 4.60/Lc-39.07
```
### c2
```

## C-railicon-search: rail icon search #64748b on rail-bg (3:1 icon) (min 3)
  fail 0/28; worst 3.26 on Sepia (fg #64748b bg #dfd5bd, Lc 48.88); apca<45 while wcag ok: 0

## C-railicon-inbox: rail icon inbox #3b82f6 on rail-bg (3:1 icon) (min 3)
  fail 10/28; worst 2.52 on Sepia (fg #3b82f6 bg #dfd5bd, Lc 39.74); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.67; Cool Mist 2.82; Foolscap 2.66; Lumen Contrast 2.93; Mint Linen 2.85; Sakura 2.80; Sepia 2.52; Shimmering Focus Light 2.88; Willemstad Light 2.82; Zettlr Bielefeld Light 2.68

## C-railicon-today: rail icon today #f97316 on rail-bg (3:1 icon) (min 3)
  fail 15/28; worst 1.92 on Sepia (fg #f97316 bg #dfd5bd, Lc 29.01); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.03; Cool Mist 2.15; Foolscap 2.02; Lumen Contrast 2.23; Mint Linen 2.17; Sakura 2.14; Sepia 1.92; Shimmering Focus Light 2.19; Tolaria Light 2.31; Willemstad Light 2.15; Zettlr Berlin Light 2.29; Zettlr Bielefeld Light 2.04; Zettlr Bordeaux Light 2.29; Zettlr Frankfurt Light 2.29; Zettlr Karl-Marx-Stadt Light 2.29

## C-railicon-favorites: rail icon favorites #eab308 on rail-bg (3:1 icon) (min 3)
  fail 15/28; worst 1.31 on Sepia (fg #eab308 bg #dfd5bd, Lc 12.21); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 1.39; Cool Mist 1.47; Foolscap 1.38; Lumen Contrast 1.53; Mint Linen 1.49; Sakura 1.46; Sepia 1.31; Shimmering Focus Light 1.50; Tolaria Light 1.58; Willemstad Light 1.47; Zettlr Berlin Light 1.57; Zettlr Bielefeld Light 1.40; Zettlr Bordeaux Light 1.57; Zettlr Frankfurt Light 1.57; Zettlr Karl-Marx-Stadt Light 1.57

## C-railicon-types: rail icon types #8b5cf6 on rail-bg (3:1 icon) (min 3)
  fail 1/28; worst 2.90 on Sepia (fg #8b5cf6 bg #dfd5bd, Lc 44.56); apca<45 while wcag ok: 0
  FAIL: Sepia 2.90

## C-railicon-calendar: rail icon calendar #f43f5e on rail-bg (3:1 icon) (min 3)
  fail 14/28; worst 2.52 on Sepia (fg #f43f5e bg #dfd5bd, Lc 38.70); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.66; Cool Mist 2.82; Foolscap 2.65; Lumen Contrast 2.92; Mint Linen 2.85; Sakura 2.80; Sepia 2.52; Shimmering Focus Light 2.87; Willemstad Light 2.82; Zettlr Berlin Light 3.00; Zettlr Bielefeld Light 2.67; Zettlr Bordeaux Light 3.00; Zettlr Frankfurt Light 3.00; Zettlr Karl-Marx-Stadt Light 3.00

## C-railicon-files: rail icon files #14b8a6 on rail-bg (3:1 icon) (min 3)
  fail 15/28; worst 1.71 on Sepia (fg #14b8a6 bg #dfd5bd, Lc 24.17); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 1.80; Cool Mist 1.91; Foolscap 1.80; Lumen Contrast 1.98; Mint Linen 1.93; Sakura 1.90; Sepia 1.71; Shimmering Focus Light 1.95; Tolaria Light 2.05; Willemstad Light 1.91; Zettlr Berlin Light 2.03; Zettlr Bielefeld Light 1.81; Zettlr Bordeaux Light 2.03; Zettlr Frankfurt Light 2.03; Zettlr Karl-Marx-Stadt Light 2.03

## C-railicon-archive: rail icon archive #78716c on rail-bg (3:1 icon) (min 3)
  fail 0/28; worst 3.29 on Sepia (fg #78716c bg #dfd5bd, Lc 49.16); apca<45 while wcag ok: 0

## C-railicon-tasks: rail icon tasks #22c55e on rail-bg (3:1 icon) (min 3)
  fail 15/28; worst 1.56 on Sepia (fg #22c55e bg #dfd5bd, Lc 20.18); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 1.65; Cool Mist 1.75; Foolscap 1.65; Lumen Contrast 1.81; Mint Linen 1.77; Sakura 1.74; Sepia 1.56; Shimmering Focus Light 1.78; Tolaria Light 1.88; Willemstad Light 1.75; Zettlr Berlin Light 1.86; Zettlr Bielefeld Light 1.66; Zettlr Bordeaux Light 1.86; Zettlr Frankfurt Light 1.86; Zettlr Karl-Marx-Stadt Light 1.86

## C-railicon-graph: rail icon graph #6366f1 on rail-bg (3:1 icon) (min 3)
  fail 0/28; worst 3.06 on Sepia (fg #6366f1 bg #dfd5bd, Lc 46.42); apca<45 while wcag ok: 0

## C-railicon-tags: rail icon tags #ec4899 on rail-bg (3:1 icon) (min 3)
  fail 15/28; worst 2.42 on Sepia (fg #ec4899 bg #dfd5bd, Lc 37.55); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.56; Cool Mist 2.71; Foolscap 2.55; Lumen Contrast 2.81; Mint Linen 2.74; Sakura 2.69; Sepia 2.42; Shimmering Focus Light 2.76; Tolaria Light 2.91; Willemstad Light 2.71; Zettlr Berlin Light 2.88; Zettlr Bielefeld Light 2.57; Zettlr Bordeaux Light 2.88; Zettlr Frankfurt Light 2.88; Zettlr Karl-Marx-Stadt Light 2.88

## C-railicon-fallback: rail icon fallback #0ea5e9 on rail-bg (3:1 icon) (min 3)
  fail 15/28; worst 1.90 on Sepia (fg #0ea5e9 bg #dfd5bd, Lc 28.68); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.01; Cool Mist 2.13; Foolscap 2.00; Lumen Contrast 2.21; Mint Linen 2.15; Sakura 2.11; Sepia 1.90; Shimmering Focus Light 2.17; Tolaria Light 2.28; Willemstad Light 2.13; Zettlr Berlin Light 2.26; Zettlr Bielefeld Light 2.02; Zettlr Bordeaux Light 2.26; Zettlr Frankfurt Light 2.26; Zettlr Karl-Marx-Stadt Light 2.26

## C-railicon-action: rail icon action #d946ef on rail-bg (3:1 icon) (min 3)
  fail 15/28; worst 2.37 on Sepia (fg #d946ef bg #dfd5bd, Lc 36.81); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.51; Cool Mist 2.65; Foolscap 2.50; Lumen Contrast 2.75; Mint Linen 2.68; Sakura 2.63; Sepia 2.37; Shimmering Focus Light 2.71; Tolaria Light 2.85; Willemstad Light 2.66; Zettlr Berlin Light 2.83; Zettlr Bielefeld Light 2.52; Zettlr Bordeaux Light 2.83; Zettlr Frankfurt Light 2.83; Zettlr Karl-Marx-Stadt Light 2.83

## C-railicon-active-search: rail icon search on its active tint (18% over rail-bg) (min 3)
  fail 7/28; worst 2.72 on Sepia (fg #64748b bg #c9c4b4, Lc 39.07); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 2.97; Lavender Haze 2.86; Foolscap 2.85; Sakura 2.99; Sepia 2.72; Twilight Violet 2.92; Zettlr Bielefeld Light 2.87

## C-railicon-active-inbox: rail icon inbox on its active tint (18% over rail-bg) (min 3)
  fail 15/28; worst 2.14 on Sepia (fg #3b82f6 bg #c1c6c8, Lc 30.54); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.25; Cool Mist 2.37; Foolscap 2.24; Lumen Contrast 2.44; Mint Linen 2.39; Sakura 2.35; Sepia 2.14; Shimmering Focus Light 2.41; Tolaria Light 2.52; Willemstad Light 2.37; Zettlr Berlin Light 2.50; Zettlr Bielefeld Light 2.26; Zettlr Bordeaux Light 2.50; Zettlr Frankfurt Light 2.50; Zettlr Karl-Marx-Stadt Light 2.50

## C-railicon-active-today: rail icon today on its active tint (18% over rail-bg) (min 3)
  fail 15/28; worst 1.69 on Sepia (fg #f97316 bg #e3c39f, Lc 21.54); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 1.76; Cool Mist 1.85; Foolscap 1.76; Lumen Contrast 1.91; Mint Linen 1.87; Sakura 1.84; Sepia 1.69; Shimmering Focus Light 1.88; Tolaria Light 1.97; Willemstad Light 1.85; Zettlr Berlin Light 1.95; Zettlr Bielefeld Light 1.77; Zettlr Bordeaux Light 1.95; Zettlr Frankfurt Light 1.95; Zettlr Karl-Marx-Stadt Light 1.95

## C-railicon-active-favorites: rail icon favorites on its active tint (18% over rail-bg) (min 3)
  fail 15/28; worst 1.24 on Sepia (fg #eab308 bg #e1cf9d, Lc 9.09); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 1.30; Cool Mist 1.36; Foolscap 1.30; Lumen Contrast 1.40; Mint Linen 1.37; Sakura 1.35; Sepia 1.24; Shimmering Focus Light 1.38; Tolaria Light 1.45; Willemstad Light 1.36; Zettlr Berlin Light 1.43; Zettlr Bielefeld Light 1.30; Zettlr Bordeaux Light 1.43; Zettlr Frankfurt Light 1.43; Zettlr Karl-Marx-Stadt Light 1.43

## C-railicon-active-types: rail icon types on its active tint (18% over rail-bg) (min 3)
  fail 15/28; worst 2.42 on Sepia (fg #8b5cf6 bg #d0bfc8, Lc 34.45); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.54; Cool Mist 2.67; Foolscap 2.53; Lumen Contrast 2.76; Mint Linen 2.70; Sakura 2.66; Sepia 2.42; Shimmering Focus Light 2.72; Tolaria Light 2.85; Willemstad Light 2.67; Zettlr Berlin Light 2.82; Zettlr Bielefeld Light 2.55; Zettlr Bordeaux Light 2.82; Zettlr Frankfurt Light 2.82; Zettlr Karl-Marx-Stadt Light 2.82

## C-railicon-active-calendar: rail icon calendar on its active tint (18% over rail-bg) (min 3)
  fail 15/28; worst 2.08 on Sepia (fg #f43f5e bg #e2baac, Lc 28.12); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.18; Cool Mist 2.28; Foolscap 2.17; Lumen Contrast 2.36; Mint Linen 2.30; Sakura 2.28; Sepia 2.08; Shimmering Focus Light 2.33; Tolaria Light 2.44; Willemstad Light 2.29; Zettlr Berlin Light 2.42; Zettlr Bielefeld Light 2.18; Zettlr Bordeaux Light 2.42; Zettlr Frankfurt Light 2.42; Zettlr Karl-Marx-Stadt Light 2.42

## C-railicon-active-files: rail icon files on its active tint (18% over rail-bg) (min 3)
  fail 15/28; worst 1.52 on Sepia (fg #14b8a6 bg #bad0b9, Lc 17.68); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 1.60; Cool Mist 1.68; Foolscap 1.59; Lumen Contrast 1.73; Mint Linen 1.69; Sakura 1.66; Sepia 1.52; Shimmering Focus Light 1.71; Tolaria Light 1.78; Willemstad Light 1.68; Zettlr Berlin Light 1.77; Zettlr Bielefeld Light 1.60; Zettlr Bordeaux Light 1.77; Zettlr Frankfurt Light 1.77; Zettlr Karl-Marx-Stadt Light 1.77

## C-railicon-active-archive: rail icon archive on its active tint (18% over rail-bg) (min 3)
  fail 6/28; worst 2.74 on Sepia (fg #78716c bg #ccc3af, Lc 39.15); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 2.96; Lavender Haze 2.88; Foolscap 2.87; Sepia 2.74; Twilight Violet 2.91; Zettlr Bielefeld Light 2.89

## C-railicon-active-tasks: rail icon tasks on its active tint (18% over rail-bg) (min 3)
  fail 15/28; worst 1.41 on Sepia (fg #22c55e bg #bdd2ac, Lc 14.40); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 1.48; Cool Mist 1.56; Foolscap 1.48; Lumen Contrast 1.60; Mint Linen 1.57; Sakura 1.54; Sepia 1.41; Shimmering Focus Light 1.58; Tolaria Light 1.65; Willemstad Light 1.56; Zettlr Berlin Light 1.64; Zettlr Bielefeld Light 1.49; Zettlr Bordeaux Light 1.64; Zettlr Frankfurt Light 1.64; Zettlr Karl-Marx-Stadt Light 1.64

## C-railicon-active-graph: rail icon graph on its active tint (18% over rail-bg) (min 3)
  fail 15/28; worst 2.54 on Sepia (fg #6366f1 bg #c8c1c7, Lc 36.05); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.67; Cool Mist 2.81; Foolscap 2.66; Lumen Contrast 2.90; Mint Linen 2.84; Sakura 2.79; Sepia 2.54; Shimmering Focus Light 2.86; Tolaria Light 2.99; Willemstad Light 2.81; Zettlr Berlin Light 2.97; Zettlr Bielefeld Light 2.68; Zettlr Bordeaux Light 2.97; Zettlr Frankfurt Light 2.97; Zettlr Karl-Marx-Stadt Light 2.97

## C-railicon-active-tags: rail icon tags on its active tint (18% over rail-bg) (min 3)
  fail 15/28; worst 2.02 on Sepia (fg #ec4899 bg #e1bcb7, Lc 27.95); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.12; Cool Mist 2.23; Foolscap 2.12; Lumen Contrast 2.30; Mint Linen 2.25; Sakura 2.22; Sepia 2.02; Shimmering Focus Light 2.27; Tolaria Light 2.38; Willemstad Light 2.23; Zettlr Berlin Light 2.36; Zettlr Bielefeld Light 2.13; Zettlr Bordeaux Light 2.36; Zettlr Frankfurt Light 2.36; Zettlr Karl-Marx-Stadt Light 2.36

## C-railicon-active-fallback: rail icon fallback on its active tint (18% over rail-bg) (min 3)
  fail 15/28; worst 1.66 on Sepia (fg #0ea5e9 bg #b9ccc5, Lc 20.89); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 1.75; Cool Mist 1.84; Foolscap 1.74; Lumen Contrast 1.89; Mint Linen 1.85; Sakura 1.82; Sepia 1.66; Shimmering Focus Light 1.87; Tolaria Light 1.95; Willemstad Light 1.84; Zettlr Berlin Light 1.94; Zettlr Bielefeld Light 1.75; Zettlr Bordeaux Light 1.94; Zettlr Frankfurt Light 1.94; Zettlr Karl-Marx-Stadt Light 1.94

## C-railicon-active-action: rail icon action on its active tint (18% over rail-bg) (min 3)
  fail 15/28; worst 1.98 on Sepia (fg #d946ef bg #debbc6, Lc 26.99); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.09; Cool Mist 2.19; Foolscap 2.08; Lumen Contrast 2.26; Mint Linen 2.21; Sakura 2.18; Sepia 1.98; Shimmering Focus Light 2.23; Tolaria Light 2.33; Willemstad Light 2.19; Zettlr Berlin Light 2.32; Zettlr Bielefeld Light 2.09; Zettlr Bordeaux Light 2.32; Zettlr Frankfurt Light 2.32; Zettlr Karl-Marx-Stadt Light 2.32

## C-rail-activerow-text: rail active row text file-explorer-fg on 18% blue tint over rail-bg (min 4.5)
  fail 0/28; worst 5.37 on Zettlr Bielefeld Light (fg #4a4a54 bg #bfcce0, Lc 59.86); apca<45 while wcag ok: 0

## C-rail-busy: rail busy dot file-explorer-primary on rail-bg (3:1) (min 3)
  fail 0/28; worst 3.63 on Shimmering Focus Light (fg #108189 bg #e2e3e8, Lc 55.37); apca<45 while wcag ok: 0

## C-rail-divider: rail divider file-explorer-fg/25 on rail-bg (decorative) (min 1.5)
  fail 5/28; worst 1.45 on Zettlr Bielefeld Light (fg #b7b7ba bg #dcdcdc, Lc 18.26); apca<45 while wcag ok: 0
  FAIL: Zettlr Berlin Light 1.45; Zettlr Bielefeld Light 1.45; Zettlr Bordeaux Light 1.45; Zettlr Frankfurt Light 1.45; Zettlr Karl-Marx-Stadt Light 1.45

## D-syn-keyword: --lp-syntax-keyword on --lp-codeblock-bg (min 4.5)
  fail 0/28; worst 5.20 on Zettlr Berlin Light (fg #845788 bg #f5f5f5, Lc 72.29); apca<45 while wcag ok: 0

## D-syn-builtin: --lp-syntax-builtin on --lp-codeblock-bg (min 4.5)
  fail 0/28; worst 4.68 on Zettlr Berlin Light (fg #7c6c4c bg #f5f5f5, Lc 69.29); apca<45 while wcag ok: 0

## D-syn-type: --lp-syntax-type on --lp-codeblock-bg (min 4.5)
  fail 0/28; worst 4.68 on Zettlr Berlin Light (fg #7c6c4c bg #f5f5f5, Lc 69.29); apca<45 while wcag ok: 0

## D-syn-literal: --lp-syntax-literal on --lp-codeblock-bg (min 4.5)
  fail 0/28; worst 5.67 on Zettlr Berlin Light (fg #43695d bg #f5f5f5, Lc 74.64); apca<45 while wcag ok: 0

## D-syn-number: --lp-syntax-number on --lp-codeblock-bg (min 4.5)
  fail 0/28; worst 5.67 on Zettlr Berlin Light (fg #43695d bg #f5f5f5, Lc 74.64); apca<45 while wcag ok: 0

## D-syn-string: --lp-syntax-string on --lp-codeblock-bg (min 4.5)
  fail 0/28; worst 4.65 on Zettlr Berlin Light (fg #567754 bg #f5f5f5, Lc 68.85); apca<45 while wcag ok: 0

## D-syn-function: --lp-syntax-function on --lp-codeblock-bg (min 4.5)
  fail 0/28; worst 5.27 on Zettlr Berlin Light (fg #4466a2 bg #f5f5f5, Lc 72.51); apca<45 while wcag ok: 0

## D-syn-variable: --lp-syntax-variable on --lp-codeblock-bg (min 4.5)
  fail 0/28; worst 7.31 on Zettlr Berlin Light (fg #50505a bg #f5f5f5, Lc 81.68); apca<45 while wcag ok: 0

## D-syn-comment: --lp-syntax-comment on --lp-codeblock-bg (min 4.5)
  fail 1/28; worst 4.24 on Zettlr Berlin Light (fg #46806b bg #f5f5f5, Lc 65.90); apca<45 while wcag ok: 1
  FAIL: Zettlr Berlin Light 4.24
  APCA: Twilight Violet 6.01/Lc-44.99

## D-syn-meta: --lp-syntax-meta on --lp-codeblock-bg (min 4.5)
  fail 0/28; worst 6.18 on Zettlr Berlin Light (fg #894949 bg #f5f5f5, Lc 76.99); apca<45 while wcag ok: 0

## D-syn-attr: --lp-syntax-attr on --lp-codeblock-bg (min 4.5)
  fail 0/28; worst 5.67 on Zettlr Berlin Light (fg #43695d bg #f5f5f5, Lc 74.64); apca<45 while wcag ok: 0

## D-syn-property: --lp-syntax-property on --lp-codeblock-bg (min 4.5)
  fail 0/28; worst 5.67 on Zettlr Berlin Light (fg #43695d bg #f5f5f5, Lc 74.64); apca<45 while wcag ok: 0

## D-syn-tag: --lp-syntax-tag on --lp-codeblock-bg (min 4.5)
  fail 0/28; worst 6.18 on Zettlr Berlin Light (fg #894949 bg #f5f5f5, Lc 76.99); apca<45 while wcag ok: 0

## D-syn-punctuation: --lp-syntax-punctuation on --lp-codeblock-bg (min 4.5)
  fail 7/28; worst 3.32 on Zettlr Berlin Light (fg #86868d bg #f5f5f5, Lc 57.80); apca<45 while wcag ok: 5
  FAIL: Lavender Haze 4.27; Tolaria Light 4.41; Zettlr Berlin Light 3.32; Zettlr Bielefeld Light 3.47; Zettlr Bordeaux Light 3.47; Zettlr Frankfurt Light 3.32; Zettlr Karl-Marx-Stadt Light 3.32
  APCA: Deep Ocean 4.95/Lc-39.35; Shimmering Focus Dark 4.61/Lc-36.73; Tolaria Dark 5.53/Lc-44.33; Twilight Violet 4.98/Lc-37.59; Zettlr Bordeaux Dark 4.64/Lc-36.29

## D-syn-operator: --lp-syntax-operator on --lp-codeblock-bg (min 4.5)
  fail 0/28; worst 5.67 on Zettlr Berlin Light (fg #43695d bg #f5f5f5, Lc 74.64); apca<45 while wcag ok: 0

## D-codeblock-text: lp-codeblock-text on codeblock-bg (min 4.5)
  fail 0/28; worst 7.31 on Zettlr Berlin Light (fg #50505a bg #f5f5f5, Lc 81.68); apca<45 while wcag ok: 0

## D-codeblock-lang: lp-codeblock-lang (muted-foreground, 0.7em) on header-bg (min 4.5)
  fail 13/28; worst 3.84 on Sakura (fg #735f6c bg #decdcf, Lc 52.53); apca<45 while wcag ok: 3
  FAIL: Lavender Haze 3.89; Graphite Violet 4.20; Sakura 3.84; Tolaria Light 3.93; Zettlr Berlin Dark 4.48; Zettlr Berlin Light 4.07; Zettlr Bielefeld Dark 4.48; Zettlr Bielefeld Light 4.42; Zettlr Bordeaux Light 4.42; Zettlr Frankfurt Dark 4.48; Zettlr Frankfurt Light 4.07; Zettlr Karl-Marx-Stadt Dark 4.48; Zettlr Karl-Marx-Stadt Light 4.07
  APCA: Twilight Violet 4.64/Lc-38.37; Willemstad Dark 5.81/Lc-44.83; Zettlr Bordeaux Dark 4.51/Lc-38.79

## D-codeblock-copy: lp-codeblock-copy (muted-foreground) on header-bg (min 4.5)
  fail 13/28; worst 3.84 on Sakura (fg #735f6c bg #decdcf, Lc 52.53); apca<45 while wcag ok: 3
  FAIL: Lavender Haze 3.89; Graphite Violet 4.20; Sakura 3.84; Tolaria Light 3.93; Zettlr Berlin Dark 4.48; Zettlr Berlin Light 4.07; Zettlr Bielefeld Dark 4.48; Zettlr Bielefeld Light 4.42; Zettlr Bordeaux Light 4.42; Zettlr Frankfurt Dark 4.48; Zettlr Frankfurt Light 4.07; Zettlr Karl-Marx-Stadt Dark 4.48; Zettlr Karl-Marx-Stadt Light 4.07
  APCA: Twilight Violet 4.64/Lc-38.37; Willemstad Dark 5.81/Lc-44.83; Zettlr Bordeaux Dark 4.51/Lc-38.79

## D-codeblock-copy-hover: copy btn muted-fg on copy-hover (88 alpha table-hover) over header-bg (min 4.5)
  fail 15/28; worst 3.34 on Zettlr Bordeaux Dark (fg #8f8f98 bg #3e3e3e, Lc -33.29); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 4.05; Graphite Violet 4.38; Sakura 4.06; Tolaria Light 4.05; Twilight Violet 4.23; Zettlr Berlin Dark 3.37; Zettlr Berlin Light 3.86; Zettlr Bielefeld Dark 3.37; Zettlr Bielefeld Light 4.02; Zettlr Bordeaux Dark 3.34; Zettlr Bordeaux Light 4.02; Zettlr Frankfurt Dark 3.37; Zettlr Frankfurt Light 3.86; Zettlr Karl-Marx-Stadt Dark 3.37; Zettlr Karl-Marx-Stadt Light 3.86

## D-codeblock-edge: codeblock-bg vs editor-bg (surface edge, informational 1.1) (min 1.1)
  fail 17/28; worst 1.00 on Zettlr Bordeaux Light (fg #ffffff bg #fffff8, Lc 0.00); apca<45 while wcag ok: 0
  FAIL: Cool Mist 1.07; Deep Ocean 1.08; Foolscap 1.04; Ink Night 1.08; Mint Linen 1.03; Sepia 1.07; Shimmering Focus Dark 1.05; Shimmering Focus Light 1.05; Tolaria Dark 1.05; Tolaria Light 1.08; Twilight Violet 1.09; Willemstad Dark 1.05; Willemstad Light 1.06; Zettlr Berlin Light 1.09; Zettlr Bordeaux Light 1.00; Zettlr Frankfurt Light 1.09; Zettlr Karl-Marx-Stadt Light 1.09

## E-select-text: meta-bind select text editor-fg on input-bg (min 4.5)
  fail 0/28; worst 7.97 on Zettlr Berlin Light (fg #50505a bg #ffffff, Lc 87.64); apca<45 while wcag ok: 0

## E-select-text-hover: select text on hover? (hover changes border only) (min 4.5)
  fail 0/28; worst 7.97 on Zettlr Berlin Light (fg #50505a bg #ffffff, Lc 87.64); apca<45 while wcag ok: 0

## E-select-arrow: select caret muted-foreground on input-bg (3:1 icon) (min 3)
  fail 0/28; worst 4.51 on Twilight Violet (fg #908aa4 bg #282630, Lc -37.97); apca<45 while wcag ok: 0

## E-select-border: select border (--input) vs editor-bg (3:1 UI boundary) (min 3)
  fail 25/28; worst 1.09 on KokoBrain Default (fg #242835 bg #2a2e3d, Lc 0.00); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 1.09; Lavender Haze 1.34; Cool Mist 1.69; Deep Ocean 1.83; Foolscap 1.73; Graphite Violet 1.83; Ink Night 1.89; Mint Linen 1.62; Sakura 1.28; Sepia 1.85; Shimmering Focus Dark 2.59; Shimmering Focus Light 2.59; Tolaria Dark 1.69; Tolaria Light 1.41; Twilight Violet 1.26; Zettlr Berlin Dark 1.75; Zettlr Berlin Light 1.67; Zettlr Bielefeld Dark 1.75; Zettlr Bielefeld Light 1.50; Zettlr Bordeaux Dark 1.86; Zettlr Bordeaux Light 1.67; Zettlr Frankfurt Dark 1.75; Zettlr Frankfurt Light 1.67; Zettlr Karl-Marx-Stadt Dark 1.75; Zettlr Karl-Marx-Stadt Light 1.67

## E-select-bg-edge: select fill input-bg vs editor-bg (boundary alt) (min 3)
  fail 28/28; worst 1.00 on Lumen Contrast (fg #ffffff bg #ffffff, Lc 0.00); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 1.11; Lavender Haze 1.09; Cool Mist 1.07; Deep Ocean 1.08; Foolscap 1.04; Graphite Violet 1.13; Ink Night 1.08; Lumen Contrast 1.00; Mint Linen 1.03; Sakura 1.09; Sepia 1.07; Shimmering Focus Dark 1.05; Shimmering Focus Light 1.05; Tolaria Dark 1.05; Tolaria Light 1.00; Twilight Violet 1.08; Willemstad Dark 1.05; Willemstad Light 1.06; Zettlr Berlin Dark 1.00; Zettlr Berlin Light 1.00; Zettlr Bielefeld Dark 1.00; Zettlr Bielefeld Light 1.12; Zettlr Bordeaux Dark 1.00; Zettlr Bordeaux Light 1.00; Zettlr Frankfurt Dark 1.00; Zettlr Frankfurt Light 1.00; Zettlr Karl-Marx-Stadt Dark 1.00; Zettlr Karl-Marx-Stadt Light 1.00

## E-select-hover-border: select hover border vs editor-bg (min 3)
  fail 28/28; worst 1.26 on Zettlr Bielefeld Light (fg #d9d9dc bg #f3f3e8, Lc 12.15); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 1.91; Lavender Haze 1.64; Cool Mist 1.44; Deep Ocean 1.68; Foolscap 1.46; Graphite Violet 1.85; Ink Night 1.75; Lumen Contrast 1.66; Mint Linen 1.45; Sakura 1.67; Sepia 1.42; Shimmering Focus Dark 1.59; Shimmering Focus Light 1.60; Tolaria Dark 1.69; Tolaria Light 1.50; Twilight Violet 1.67; Willemstad Dark 1.65; Willemstad Light 1.98; Zettlr Berlin Dark 1.69; Zettlr Berlin Light 1.40; Zettlr Bielefeld Dark 1.69; Zettlr Bielefeld Light 1.26; Zettlr Bordeaux Dark 1.52; Zettlr Bordeaux Light 1.40; Zettlr Frankfurt Dark 1.69; Zettlr Frankfurt Light 1.40; Zettlr Karl-Marx-Stadt Dark 1.69; Zettlr Karl-Marx-Stadt Light 1.40

## E-btn-default: btn default text on default-bg (min 4.5)
  fail 0/28; worst 6.08 on Zettlr Bielefeld Light (fg #50505a bg #e1e1d9, Lc 69.67); apca<45 while wcag ok: 0

## E-btn-default-hover: btn default text on hover bg (min 4.5)
  fail 0/28; worst 5.32 on Zettlr Bielefeld Light (fg #50505a bg #d3d3cd, Lc 61.78); apca<45 while wcag ok: 0

## E-btn-default-border: btn default border vs editor-bg (3:1 UI boundary; fill 10% also marks it) (min 3)
  fail 28/28; worst 1.43 on Zettlr Bielefeld Light (fg #cdcdc7 bg #f3f3e8, Lc 19.36); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 1.83; Lavender Haze 1.59; Cool Mist 1.60; Deep Ocean 1.60; Foolscap 1.59; Graphite Violet 1.75; Ink Night 1.69; Lumen Contrast 1.75; Mint Linen 1.56; Sakura 1.62; Sepia 1.58; Shimmering Focus Dark 1.57; Shimmering Focus Light 1.60; Tolaria Dark 1.69; Tolaria Light 1.57; Twilight Violet 1.61; Willemstad Dark 1.56; Willemstad Light 2.00; Zettlr Berlin Dark 1.79; Zettlr Berlin Light 1.46; Zettlr Bielefeld Dark 1.79; Zettlr Bielefeld Light 1.43; Zettlr Bordeaux Dark 1.60; Zettlr Bordeaux Light 1.46; Zettlr Frankfurt Dark 1.79; Zettlr Frankfurt Light 1.46; Zettlr Karl-Marx-Stadt Dark 1.79; Zettlr Karl-Marx-Stadt Light 1.46

## E-btn-default-fill: btn default fill vs editor-bg (min 3)
  fail 28/28; worst 1.15 on Willemstad Dark (fg #191919 bg #070707, Lc 0.00); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 1.30; Lavender Haze 1.22; Cool Mist 1.23; Deep Ocean 1.20; Foolscap 1.23; Graphite Violet 1.27; Ink Night 1.23; Lumen Contrast 1.28; Mint Linen 1.22; Sakura 1.23; Sepia 1.22; Shimmering Focus Dark 1.20; Shimmering Focus Light 1.23; Tolaria Dark 1.23; Tolaria Light 1.22; Twilight Violet 1.22; Willemstad Dark 1.15; Willemstad Light 1.35; Zettlr Berlin Dark 1.28; Zettlr Berlin Light 1.18; Zettlr Bielefeld Dark 1.28; Zettlr Bielefeld Light 1.17; Zettlr Bordeaux Dark 1.22; Zettlr Bordeaux Light 1.18; Zettlr Frankfurt Dark 1.28; Zettlr Frankfurt Light 1.18; Zettlr Karl-Marx-Stadt Dark 1.28; Zettlr Karl-Marx-Stadt Light 1.18

## E-btn-primary: btn primary text primary-foreground on primary (min 4.5)
  fail 0/28; worst 4.51 on Zettlr Berlin Light (fg #030305 bg #12865e, Lc 32.82); apca<45 while wcag ok: 5
  APCA: Twilight Violet 4.95/Lc39.38; Willemstad Dark 4.51/Lc33.38; Zettlr Berlin Light 4.51/Lc32.82; Zettlr Frankfurt Dark 4.54/Lc40.79; Zettlr Karl-Marx-Stadt Dark 4.56/Lc41.49

## E-btn-primary-hover: btn primary text on primary-hover (mix 85% primary + editor-fg) (min 4.5)
  fail 1/28; worst 4.16 on Zettlr Berlin Light (fg #030305 bg #297e5e, Lc 30.08); apca<45 while wcag ok: 2
  FAIL: Zettlr Berlin Light 4.16
  APCA: Twilight Violet 5.65/Lc44.33; Willemstad Dark 5.78/Lc41.86

## E-btn-destr: btn destructive text on destructive (min 4.5)
  fail 0/28; worst 4.52 on Lavender Haze (fg #f1f1f3 bg #c83848, Lc -70.30); apca<45 while wcag ok: 7
  APCA: KokoBrain Default 4.57/Lc37.83; Shimmering Focus Dark 4.61/Lc40.24; Shimmering Focus Light 4.56/Lc36.28; Tolaria Light 4.54/Lc36.34; Twilight Violet 4.56/Lc37.25; Willemstad Dark 4.61/Lc40.24; Willemstad Light 4.56/Lc36.28

## E-btn-destr-hover: btn destructive text on destructive-hover (min 4.5)
  fail 8/28; worst 3.15 on Willemstad Light (fg #0f0f0f bg #bc2537, Lc 24.84); apca<45 while wcag ok: 2
  FAIL: Shimmering Focus Light 3.83; Tolaria Light 3.87; Willemstad Light 3.15; Zettlr Berlin Dark 3.67; Zettlr Bielefeld Dark 3.67; Zettlr Bordeaux Dark 4.11; Zettlr Frankfurt Dark 3.67; Zettlr Karl-Marx-Stadt Dark 3.67
  APCA: Shimmering Focus Dark 5.20/Lc44.40; Twilight Violet 5.27/Lc42.36

## E-btn-plain-hover: btn plain text on plain-hover (table-hover alpha over editor-bg) (min 4.5)
  fail 0/28; worst 6.41 on Zettlr Bielefeld Light (fg #50505a bg #e7e7e2, Lc 73.25); apca<45 while wcag ok: 0

## E-error: meta-bind error text (--destructive, 0.75em italic) on error-bg over editor-bg (min 4.5)
  fail 15/28; worst 2.79 on Zettlr Berlin Dark (fg #cf413b bg #3b2d2d, Lc -24.96); apca<45 while wcag ok: 1
  FAIL: KokoBrain Default 3.20; Lavender Haze 3.94; Graphite Violet 4.35; Sakura 4.16; Shimmering Focus Dark 4.45; Shimmering Focus Light 3.55; Tolaria Light 3.60; Twilight Violet 3.77; Willemstad Light 3.64; Zettlr Berlin Dark 2.79; Zettlr Bielefeld Dark 2.79; Zettlr Bielefeld Light 4.26; Zettlr Bordeaux Dark 2.96; Zettlr Frankfurt Dark 2.79; Zettlr Karl-Marx-Stadt Dark 2.79
  APCA: Willemstad Dark 5.41/Lc-40.38

## E-error-plain: destructive text on editor-bg (any use of text-destructive in editor/dialog) (min 4.5)
  fail 10/28; worst 3.01 on Zettlr Berlin Dark (fg #cf413b bg #2b2b2c, Lc -26.14); apca<45 while wcag ok: 2
  FAIL: KokoBrain Default 3.44; Shimmering Focus Light 4.09; Tolaria Light 4.13; Twilight Violet 4.23; Willemstad Light 4.20; Zettlr Berlin Dark 3.01; Zettlr Bielefeld Dark 3.01; Zettlr Bordeaux Dark 3.05; Zettlr Frankfurt Dark 3.01; Zettlr Karl-Marx-Stadt Dark 3.01
  APCA: Shimmering Focus Dark 4.93/Lc-39.44; Willemstad Dark 5.83/Lc-40.98

## F-date-fg: date input text: --foreground @70% on input-bg (Tasks/Event dialogs) (min 4.5)
  fail 5/28; worst 3.69 on Zettlr Berlin Light (fg #85858c bg #ffffff, Lc 64.25); apca<45 while wcag ok: 2
  FAIL: Zettlr Berlin Light 3.69; Zettlr Bielefeld Light 3.69; Zettlr Bordeaux Light 3.69; Zettlr Frankfurt Light 3.69; Zettlr Karl-Marx-Stadt Light 3.69
  APCA: Shimmering Focus Dark 5.50/Lc-43.66; Zettlr Bordeaux Dark 5.11/Lc-42.50

## F-date-prop: date input in right sidebar: right-sidebar-fg @70% on input-bg (min 4.5)
  fail 6/28; worst 3.69 on Zettlr Berlin Light (fg #85858c bg #ffffff, Lc 64.25); apca<45 while wcag ok: 2
  FAIL: Sakura 4.37; Zettlr Berlin Light 3.69; Zettlr Bielefeld Light 3.69; Zettlr Bordeaux Light 3.69; Zettlr Frankfurt Light 3.69; Zettlr Karl-Marx-Stadt Light 3.69
  APCA: Shimmering Focus Dark 5.50/Lc-43.66; Zettlr Bordeaux Dark 5.11/Lc-42.50

## F-date-prop-sb: same, over right-sidebar-bg (if Input bg were transparent) (min 4.5)
  fail 6/28; worst 3.52 on Zettlr Berlin Light (fg #828289 bg #f5f5f5, Lc 59.73); apca<45 while wcag ok: 2
  FAIL: Sakura 4.37; Zettlr Berlin Light 3.52; Zettlr Bielefeld Light 3.52; Zettlr Bordeaux Light 3.52; Zettlr Frankfurt Light 3.52; Zettlr Karl-Marx-Stadt Light 3.52
  APCA: Shimmering Focus Dark 5.27/Lc-43.50; Zettlr Bordeaux Dark 5.57/Lc-43.29

## F-input-fg80: Input text-foreground/80 on input-bg (min 4.5)
  fail 0/28; worst 4.70 on Zettlr Berlin Light (fg #73737b bg #ffffff, Lc 72.67); apca<45 while wcag ok: 0

## F-input-placeholder: Input placeholder muted-foreground on input-bg (min 4.5)
  fail 0/28; worst 4.51 on Twilight Violet (fg #908aa4 bg #282630, Lc -37.97); apca<45 while wcag ok: 7
  APCA: KokoBrain Default 4.62/Lc-44.07; Twilight Violet 4.51/Lc-37.97; Zettlr Berlin Dark 4.53/Lc-39.39; Zettlr Bielefeld Dark 4.53/Lc-39.39; Zettlr Bordeaux Dark 4.68/Lc-38.98; Zettlr Frankfurt Dark 4.53/Lc-39.39; Zettlr Karl-Marx-Stadt Dark 4.53/Lc-39.39
```
### c3
```

## G-nav-sel-badge: Types/Files selected row count: badge-fg on primary/25 over nav-bg (12px) (min 4.5)
  fail 21/28; worst 3.08 on KokoBrain Default (fg #8a8faa bg #3e425b, Lc -31.77); apca<45 while wcag ok: 1
  FAIL: KokoBrain Default 3.08; Lavender Haze 3.15; Cool Mist 3.91; Deep Ocean 4.39; Foolscap 3.40; Graphite Violet 4.34; Mint Linen 3.56; Sakura 3.62; Sepia 3.81; Tolaria Light 3.19; Twilight Violet 3.53; Zettlr Berlin Dark 3.80; Zettlr Berlin Light 3.37; Zettlr Bielefeld Dark 3.23; Zettlr Bielefeld Light 3.33; Zettlr Bordeaux Dark 3.23; Zettlr Bordeaux Light 3.35; Zettlr Frankfurt Dark 3.90; Zettlr Frankfurt Light 3.33; Zettlr Karl-Marx-Stadt Dark 3.96; Zettlr Karl-Marx-Stadt Light 3.19
  APCA: Willemstad Dark 5.11/Lc-43.18

## G-nav-hover-primary-fg: row hover primary/10: file-explorer-fg on it (min 4.5)
  fail 0/28; worst 6.32 on Zettlr Karl-Marx-Stadt Light (fg #50505a bg #f3e1e1, Lc 72.30); apca<45 while wcag ok: 0

## G-nav-sel-primary-text-listbg: RailNoteList-like: primary on primary/25 over list-bg (if used) (min 4.5)
  fail 21/28; worst 2.82 on Twilight Violet (fg #9a7bb9 bg #483e55, Lc -28.09); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 3.72; Lavender Haze 4.03; Cool Mist 3.69; Foolscap 4.10; Graphite Violet 3.85; Mint Linen 4.02; Sakura 3.11; Sepia 3.75; Shimmering Focus Dark 4.28; Shimmering Focus Light 3.11; Tolaria Light 3.46; Twilight Violet 2.82; Willemstad Dark 3.13; Zettlr Berlin Dark 4.04; Zettlr Berlin Light 3.16; Zettlr Bielefeld Light 3.18; Zettlr Bordeaux Light 3.21; Zettlr Frankfurt Dark 3.61; Zettlr Frankfurt Light 3.39; Zettlr Karl-Marx-Stadt Dark 3.69; Zettlr Karl-Marx-Stadt Light 3.09

## H-event-archived-green: archived event green: whole chip opacity .5 over editor-bg (text 4.5; intentional dim, informational) (min 3)
  fail 15/28; worst 1.94 on Zettlr Bielefeld Light (fg #96ada0 bg #deecdb, Lc 33.48); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.28; Cool Mist 2.34; Foolscap 2.30; Lumen Contrast 2.71; Mint Linen 2.26; Sakura 2.35; Sepia 2.24; Shimmering Focus Light 2.35; Tolaria Light 2.27; Zettlr Berlin Light 2.01; Zettlr Bielefeld Light 1.94; Zettlr Bordeaux Dark 2.76; Zettlr Bordeaux Light 2.01; Zettlr Frankfurt Light 2.01; Zettlr Karl-Marx-Stadt Light 2.01

## H-event-archived-purple: archived event purple: whole chip opacity .5 over editor-bg (text 4.5; intentional dim, informational) (min 3)
  fail 18/28; worst 2.04 on Zettlr Bielefeld Light (fg #a29cba bg #e5e1ec, Lc 34.51); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.42; Cool Mist 2.45; Foolscap 2.41; Graphite Violet 2.96; Lumen Contrast 2.84; Mint Linen 2.35; Sakura 2.50; Sepia 2.35; Shimmering Focus Dark 2.85; Shimmering Focus Light 2.49; Tolaria Light 2.38; Twilight Violet 2.85; Zettlr Berlin Light 2.11; Zettlr Bielefeld Light 2.04; Zettlr Bordeaux Dark 2.65; Zettlr Bordeaux Light 2.11; Zettlr Frankfurt Light 2.11; Zettlr Karl-Marx-Stadt Light 2.11

## H-event-archived-cyan: archived event cyan: whole chip opacity .5 over editor-bg (text 4.5; intentional dim, informational) (min 3)
  fail 15/28; worst 1.93 on Zettlr Bielefeld Light (fg #96adb1 bg #deece6, Lc 33.28); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.28; Cool Mist 2.33; Foolscap 2.29; Lumen Contrast 2.69; Mint Linen 2.25; Sakura 2.34; Sepia 2.23; Shimmering Focus Light 2.35; Tolaria Light 2.26; Zettlr Berlin Light 2.00; Zettlr Bielefeld Light 1.93; Zettlr Bordeaux Dark 2.78; Zettlr Bordeaux Light 2.00; Zettlr Frankfurt Light 2.00; Zettlr Karl-Marx-Stadt Light 2.00

## H-event-archived-orange: archived event orange: whole chip opacity .5 over editor-bg (text 4.5; intentional dim, informational) (min 3)
  fail 16/28; worst 1.96 on Zettlr Bielefeld Light (fg #bca192 bg #f6e4d2, Lc 33.47); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.31; Cool Mist 2.35; Foolscap 2.33; Lumen Contrast 2.74; Mint Linen 2.25; Sakura 2.41; Sepia 2.28; Shimmering Focus Light 2.34; Tolaria Light 2.30; Twilight Violet 2.98; Zettlr Berlin Light 2.03; Zettlr Bielefeld Light 1.96; Zettlr Bordeaux Dark 2.78; Zettlr Bordeaux Light 2.03; Zettlr Frankfurt Light 2.03; Zettlr Karl-Marx-Stadt Light 2.03

## H-event-archived-pink: archived event pink: whole chip opacity .5 over editor-bg (text 4.5; intentional dim, informational) (min 3)
  fail 17/28; worst 2.01 on Zettlr Bielefeld Light (fg #bb9aa5 bg #f5e0de, Lc 34.10); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.38; Cool Mist 2.41; Foolscap 2.39; Lumen Contrast 2.81; Mint Linen 2.31; Sakura 2.48; Sepia 2.34; Shimmering Focus Dark 2.91; Shimmering Focus Light 2.42; Tolaria Light 2.35; Twilight Violet 2.90; Zettlr Berlin Light 2.08; Zettlr Bielefeld Light 2.01; Zettlr Bordeaux Dark 2.71; Zettlr Bordeaux Light 2.08; Zettlr Frankfurt Light 2.08; Zettlr Karl-Marx-Stadt Light 2.08

## H-event-archived-blue: archived event blue: whole chip opacity .5 over editor-bg (text 4.5; intentional dim, informational) (min 3)
  fail 18/28; worst 2.01 on Zettlr Bielefeld Light (fg #95a3b9 bg #dce6ec, Lc 34.34); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.38; Cool Mist 2.43; Foolscap 2.38; Graphite Violet 3.00; Lumen Contrast 2.80; Mint Linen 2.33; Sakura 2.45; Sepia 2.32; Shimmering Focus Dark 2.90; Shimmering Focus Light 2.46; Tolaria Light 2.35; Twilight Violet 2.89; Zettlr Berlin Light 2.08; Zettlr Bielefeld Light 2.01; Zettlr Bordeaux Dark 2.67; Zettlr Bordeaux Light 2.08; Zettlr Frankfurt Light 2.08; Zettlr Karl-Marx-Stadt Light 2.08

## H-event-lock-blue: read-only lock icon (opacity .7 of fg) on event-blue-bg (3:1) (min 3)
  fail 5/28; worst 2.60 on Zettlr Bielefeld Light (fg #7184a6 bg #c5d9ef, Lc 41.81); apca<45 while wcag ok: 0
  FAIL: Zettlr Berlin Light 2.74; Zettlr Bielefeld Light 2.60; Zettlr Bordeaux Light 2.73; Zettlr Frankfurt Light 2.74; Zettlr Karl-Marx-Stadt Light 2.74

## H-event-swatch-green: swatch/popover dot: event-green-fg vs editor-bg (3:1 identifying color) (min 3)
  fail 0/28; worst 4.97 on Zettlr Bielefeld Light (fg #4f6f66 bg #f3f3e8, Lc 69.98); apca<45 while wcag ok: 0

## H-event-swatch-pop-green: popover dot: event-green-fg vs popover bg (min 3)
  fail 0/28; worst 5.55 on Zettlr Berlin Light (fg #4f6f66 bg #ffffff, Lc 77.59); apca<45 while wcag ok: 0

## H-event-chipedge-green: event chip fill vs editor-bg (not required, informational) (min 1.2)
  fail 1/28; worst 1.19 on Sepia (fg #cae0c2 bg #f4ecd8, Lc 8.52); apca<45 while wcag ok: 0
  FAIL: Sepia 1.19

## H-event-swatch-purple: swatch/popover dot: event-purple-fg vs editor-bg (3:1 identifying color) (min 3)
  fail 0/28; worst 5.85 on Zettlr Bielefeld Light (fg #605788 bg #f3f3e8, Lc 74.71); apca<45 while wcag ok: 0

## H-event-swatch-pop-purple: popover dot: event-purple-fg vs popover bg (min 3)
  fail 0/28; worst 6.46 on Graphite Violet (fg #c9c1f1 bg #3c3c43, Lc -63.86); apca<45 while wcag ok: 0

## H-event-chipedge-purple: event chip fill vs editor-bg (not required, informational) (min 1.2)
  fail 0/28; worst 1.24 on Willemstad Dark (fg #221b39 bg #070707, Lc 0.00); apca<45 while wcag ok: 0

## H-event-swatch-cyan: swatch/popover dot: event-cyan-fg vs editor-bg (3:1 identifying color) (min 3)
  fail 0/28; worst 4.89 on Zettlr Bielefeld Light (fg #4f6e7d bg #f3f3e8, Lc 69.51); apca<45 while wcag ok: 0

## H-event-swatch-pop-cyan: popover dot: event-cyan-fg vs popover bg (min 3)
  fail 0/28; worst 5.47 on Zettlr Berlin Light (fg #4f6e7d bg #ffffff, Lc 77.11); apca<45 while wcag ok: 0

## H-event-chipedge-cyan: event chip fill vs editor-bg (not required, informational) (min 1.2)
  fail 4/28; worst 1.18 on Sepia (fg #cadfd8 bg #f4ecd8, Lc 8.11); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 1.19; Foolscap 1.20; Sepia 1.18; Zettlr Bielefeld Light 1.19

## H-event-swatch-orange: swatch/popover dot: event-orange-fg vs editor-bg (3:1 identifying color) (min 3)
  fail 0/28; worst 5.13 on Zettlr Bielefeld Light (fg #825e53 bg #f3f3e8, Lc 70.91); apca<45 while wcag ok: 0

## H-event-swatch-pop-orange: popover dot: event-orange-fg vs popover bg (min 3)
  fail 0/28; worst 5.73 on Zettlr Berlin Light (fg #825e53 bg #ffffff, Lc 78.52); apca<45 while wcag ok: 0

## H-event-chipedge-orange: event chip fill vs editor-bg (not required, informational) (min 1.2)
  fail 0/28; worst 1.22 on Sepia (fg #f9d0af bg #f4ecd8, Lc 9.62); apca<45 while wcag ok: 0

## H-event-swatch-pink: swatch/popover dot: event-pink-fg vs editor-bg (3:1 identifying color) (min 3)
  fail 0/28; worst 5.55 on Zettlr Bielefeld Light (fg #80536c bg #f3f3e8, Lc 73.32); apca<45 while wcag ok: 0

## H-event-swatch-pop-pink: popover dot: event-pink-fg vs popover bg (min 3)
  fail 0/28; worst 6.20 on Zettlr Berlin Light (fg #80536c bg #ffffff, Lc 80.93); apca<45 while wcag ok: 0

## H-event-chipedge-pink: event chip fill vs editor-bg (not required, informational) (min 1.2)
  fail 0/28; worst 1.27 on Willemstad Dark (fg #371826 bg #070707, Lc 0.00); apca<45 while wcag ok: 0

## H-event-swatch-blue: swatch/popover dot: event-blue-fg vs editor-bg (3:1 identifying color) (min 3)
  fail 0/28; worst 5.60 on Zettlr Bielefeld Light (fg #4d6087 bg #f3f3e8, Lc 73.67); apca<45 while wcag ok: 0

## H-event-swatch-pop-blue: popover dot: event-blue-fg vs popover bg (min 3)
  fail 0/28; worst 6.26 on Zettlr Berlin Light (fg #4d6087 bg #ffffff, Lc 81.27); apca<45 while wcag ok: 0

## H-event-chipedge-blue: event chip fill vs editor-bg (not required, informational) (min 1.2)
  fail 0/28; worst 1.26 on Willemstad Dark (fg #142239 bg #070707, Lc 0.00); apca<45 while wcag ok: 0

## H-event-ring: selected event ring ring-primary/70 over editor-bg (3:1 selected indicator) (min 3)
  fail 10/28; worst 2.68 on Zettlr Bielefeld Light (fg #af906f bg #f3f3e8, Lc 48.80); apca<45 while wcag ok: 0
  FAIL: Sakura 2.79; Shimmering Focus Light 2.75; Twilight Violet 2.93; Willemstad Dark 2.75; Zettlr Berlin Light 2.77; Zettlr Bielefeld Light 2.68; Zettlr Bordeaux Light 2.81; Zettlr Frankfurt Dark 2.97; Zettlr Frankfurt Light 2.89; Zettlr Karl-Marx-Stadt Dark 2.94

## H-event-ring-vs-chip: selected event ring primary/70 vs event-blue-bg chip edge (min 3)
  fail 20/28; worst 2.30 on Zettlr Karl-Marx-Stadt Dark (fg #b35e5e bg #32415a, Lc -20.89); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 2.81; Lavender Haze 2.78; Cool Mist 2.62; Foolscap 2.80; Graphite Violet 2.79; Mint Linen 2.72; Sakura 2.40; Sepia 2.82; Shimmering Focus Light 2.31; Tolaria Light 2.60; Twilight Violet 2.35; Willemstad Dark 2.46; Zettlr Berlin Dark 2.61; Zettlr Berlin Light 2.33; Zettlr Bielefeld Light 2.32; Zettlr Bordeaux Light 2.36; Zettlr Frankfurt Dark 2.38; Zettlr Frankfurt Light 2.43; Zettlr Karl-Marx-Stadt Dark 2.30; Zettlr Karl-Marx-Stadt Light 2.68

## H-event-hover-green: event green chip under hover:brightness-110 (both fg and bg x1.1) (min 4.5)
  fail 1/28; worst 4.33 on Zettlr Bielefeld Light (fg #567a70 bg #dcfce2, Lc 66.36); apca<45 while wcag ok: 0
  FAIL: Zettlr Bielefeld Light 4.33

## H-event-hover-purple: event purple chip under hover:brightness-110 (both fg and bg x1.1) (min 4.5)
  fail 0/28; worst 4.63 on Zettlr Bielefeld Light (fg #6a6095 bg #ebe5ff, Lc 64.76); apca<45 while wcag ok: 0

## H-event-hover-cyan: event cyan chip under hover:brightness-110 (both fg and bg x1.1) (min 4.5)
  fail 5/28; worst 4.30 on Zettlr Bielefeld Light (fg #577989 bg #dcfbfb, Lc 66.32); apca<45 while wcag ok: 0
  FAIL: Zettlr Berlin Light 4.49; Zettlr Bielefeld Light 4.30; Zettlr Bordeaux Light 4.49; Zettlr Frankfurt Light 4.49; Zettlr Karl-Marx-Stadt Light 4.49

## H-event-hover-orange: event orange chip under hover:brightness-110 (both fg and bg x1.1) (min 4.5)
  fail 1/28; worst 4.21 on Zettlr Bielefeld Light (fg #8f675c bg #ffeace, Lc 63.30); apca<45 while wcag ok: 0
  FAIL: Zettlr Bielefeld Light 4.21

## H-event-hover-pink: event pink chip under hover:brightness-110 (both fg and bg x1.1) (min 4.5)
  fail 1/28; worst 4.37 on Zettlr Bielefeld Light (fg #8d5c77 bg #ffe0e9, Lc 62.72); apca<45 while wcag ok: 0
  FAIL: Zettlr Bielefeld Light 4.37

## H-event-hover-blue: event blue chip under hover:brightness-110 (both fg and bg x1.1) (min 4.5)
  fail 0/28; worst 4.55 on Zettlr Bielefeld Light (fg #556a95 bg #d9eeff, Lc 65.11); apca<45 while wcag ok: 0

## I-highlight-text: ==highlight== / search mark: editor-fg on lp-highlight-bg over editor-bg (min 4.5)
  fail 14/28; worst 1.06 on Zettlr Berlin Dark (fg #f0f0f0 bg #ffff00, Lc 0.00); apca<45 while wcag ok: 1
  FAIL: KokoBrain Default 1.57; Lavender Haze 4.27; Deep Ocean 1.13; Graphite Violet 1.34; Ink Night 1.69; Shimmering Focus Dark 1.48; Shimmering Focus Light 4.22; Tolaria Dark 1.22; Twilight Violet 1.44; Willemstad Dark 1.51; Zettlr Berlin Dark 1.06; Zettlr Bielefeld Dark 1.06; Zettlr Frankfurt Dark 1.06; Zettlr Karl-Marx-Stadt Dark 1.06
  APCA: Sakura 4.82/Lc42.36

## I-highlight-text2: highlight-bg as given (alpha from hex) over editor-bg with editor-fg (min 4.5)
  fail 4/28; worst 3.94 on Zettlr Berlin Dark (fg #f0f0f0 bg #7b7b1b, Lc -66.60); apca<45 while wcag ok: 0
  FAIL: Zettlr Berlin Dark 3.94; Zettlr Bielefeld Dark 3.94; Zettlr Frankfurt Dark 3.94; Zettlr Karl-Marx-Stadt Dark 3.94

## I-highlight-muted-list: search snippet mark: file-explorer-muted-fg text on highlight-bg over list-bg (min 4.5)
  fail 14/28; worst 1.61 on Zettlr Berlin Dark (fg #91919a bg #737313, Lc -15.48); apca<45 while wcag ok: 1
  FAIL: KokoBrain Default 2.43; Lavender Haze 3.63; Deep Ocean 4.01; Foolscap 4.36; Graphite Violet 3.46; Ink Night 4.37; Sakura 4.08; Tolaria Light 4.40; Twilight Violet 2.72; Willemstad Dark 2.65; Zettlr Berlin Dark 1.61; Zettlr Bielefeld Dark 1.61; Zettlr Frankfurt Dark 1.61; Zettlr Karl-Marx-Stadt Dark 1.61
  APCA: Zettlr Bordeaux Dark 6.55/Lc-42.43

## I-highlight-primary-link: link text (syntax-link) inside highlight over editor-bg (min 4.5)
  fail 15/28; worst 1.44 on Zettlr Frankfurt Dark (fg #5e97c7 bg #7b7b1b, Lc -12.19); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 2.89; Lavender Haze 3.78; Graphite Violet 3.04; Sakura 3.48; Shimmering Focus Light 3.54; Tolaria Dark 4.39; Twilight Violet 3.18; Willemstad Dark 1.97; Zettlr Berlin Dark 1.65; Zettlr Berlin Light 4.32; Zettlr Bielefeld Dark 2.56; Zettlr Bordeaux Light 4.29; Zettlr Frankfurt Dark 1.44; Zettlr Karl-Marx-Stadt Dark 1.45; Zettlr Karl-Marx-Stadt Light 4.46

## I-selection: CM selection: editor-fg on syntax-selection (min 4.5)
  fail 13/28; worst 1.32 on Shimmering Focus Dark (fg #c3c8df bg #18c1cd33, Lc -13.31); apca<45 while wcag ok: 0
  FAIL: Cool Mist 2.40; Deep Ocean 3.60; Foolscap 2.03; Graphite Violet 2.00; Ink Night 1.69; Lumen Contrast 2.29; Mint Linen 1.94; Sepia 2.05; Shimmering Focus Dark 1.32; Shimmering Focus Light 3.85; Willemstad Dark 1.75; Zettlr Berlin Dark 2.52; Zettlr Bordeaux Dark 4.28

## I-selection-link: CM selection: syntax-link on syntax-selection (min 3)
  fail 15/28; worst 1.00 on Foolscap (fg #2f5d8a bg #2f5d8a33, Lc 0.00); apca<45 while wcag ok: 4
  FAIL: Cool Mist 1.00; Deep Ocean 2.95; Foolscap 1.00; Graphite Violet 1.00; Ink Night 1.00; Lumen Contrast 1.00; Mint Linen 1.00; Sepia 1.00; Shimmering Focus Dark 1.00; Shimmering Focus Light 1.32; Tolaria Dark 2.46; Willemstad Dark 2.38; Zettlr Berlin Dark 1.06; Zettlr Bordeaux Dark 2.68; Zettlr Karl-Marx-Stadt Dark 2.40
  APCA: KokoBrain Default 3.87/Lc-40.92; Twilight Violet 4.17/Lc-39.44; Zettlr Bielefeld Light 3.11/Lc44.60; Zettlr Frankfurt Dark 3.46/Lc-34.26

## I-activeline: active line: editor-fg on active-line over editor-bg (min 4.5)
  fail 0/28; worst 6.71 on Zettlr Bielefeld Light (fg #50505a bg #ecece4, Lc 76.05); apca<45 while wcag ok: 0

## I-activeline-muted: active line gutter: muted-foreground on active-line-gutter (min 4.5)
  fail 11/28; worst 2.52 on Zettlr Bordeaux Dark (fg #8f8f98 bg #505050, Lc -27.16); apca<45 while wcag ok: 1
  FAIL: Tolaria Light 4.15; Zettlr Berlin Dark 2.58; Zettlr Berlin Light 3.68; Zettlr Bielefeld Dark 2.58; Zettlr Bielefeld Light 3.68; Zettlr Bordeaux Dark 2.52; Zettlr Bordeaux Light 3.68; Zettlr Frankfurt Dark 2.58; Zettlr Frankfurt Light 3.68; Zettlr Karl-Marx-Stadt Dark 2.58; Zettlr Karl-Marx-Stadt Light 3.68
  APCA: Twilight Violet 5.32/Lc-40.06

## I-gutter: gutter line numbers muted-foreground on editor-bg (min 4.5)
  fail 0/28; worst 4.52 on Zettlr Bielefeld Light (fg #6e6e77 bg #f3f3e8, Lc 67.30); apca<45 while wcag ok: 6
  APCA: Twilight Violet 4.87/Lc-39.00; Zettlr Berlin Dark 4.53/Lc-39.39; Zettlr Bielefeld Dark 4.53/Lc-39.39; Zettlr Bordeaux Dark 4.68/Lc-38.98; Zettlr Frankfurt Dark 4.53/Lc-39.39; Zettlr Karl-Marx-Stadt Dark 4.53/Lc-39.39

## I-quote1: blockquote text syntax-quote on blockquote-bg3 over editor-bg (min 4.5)
  fail 13/28; worst 3.40 on Zettlr Bielefeld Dark (fg #91919a bg #463d34, Lc -34.14); apca<45 while wcag ok: 1
  FAIL: Lavender Haze 4.00; Tolaria Light 4.11; Twilight Violet 4.30; Zettlr Berlin Dark 3.72; Zettlr Berlin Light 4.27; Zettlr Bielefeld Dark 3.40; Zettlr Bielefeld Light 3.85; Zettlr Bordeaux Dark 3.51; Zettlr Bordeaux Light 4.24; Zettlr Frankfurt Dark 3.75; Zettlr Frankfurt Light 4.25; Zettlr Karl-Marx-Stadt Dark 3.80; Zettlr Karl-Marx-Stadt Light 4.15
  APCA: KokoBrain Default 4.61/Lc-44.60

## I-code-inline: inline code syntax-code on lp-code-bg (min 4.5)
  fail 5/28; worst 1.10 on Foolscap (fg #8a3f3f bg #6b5a3f1a, Lc 0.00); apca<45 while wcag ok: 1
  FAIL: Foolscap 1.10; Graphite Violet 1.81; Mint Linen 1.63; Tolaria Dark 1.17; Tolaria Light 2.54
  APCA: Shimmering Focus Dark 4.77/Lc-39.59

## I-code-inline-fg: inline code editor-fg on lp-code-bg (min 4.5)
  fail 4/28; worst 1.00 on Mint Linen (fg #1f3a33 bg #1f3a330f, Lc 0.00); apca<45 while wcag ok: 0
  FAIL: Foolscap 2.10; Graphite Violet 1.22; Mint Linen 1.00; Tolaria Dark 1.68

## I-tablealt: table alt row: editor-fg on lp-table-alt over editor-bg (min 4.5)
  fail 0/28; worst 6.76 on Zettlr Bielefeld Light (fg #50505a bg #edede5, Lc 76.63); apca<45 while wcag ok: 0

## I-collhover: collection row hover: editor-fg on table-hover over collection-bg (min 4.5)
  fail 0/28; worst 6.49 on Zettlr Berlin Light (fg #50505a bg #e8e8e8, Lc 74.04); apca<45 while wcag ok: 0

## I-collhover-null: collection null text on table-hover over collection-bg (min 4.5)
  fail 28/28; worst 1.29 on Sakura (fg #d5c0c5 bg #ebdbdb, Lc 12.10); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 2.15; Lavender Haze 1.31; Cool Mist 4.02; Deep Ocean 3.28; Foolscap 3.34; Graphite Violet 2.52; Ink Night 3.43; Lumen Contrast 4.30; Mint Linen 2.76; Sakura 1.29; Sepia 2.93; Shimmering Focus Dark 2.11; Shimmering Focus Light 2.34; Tolaria Dark 2.38; Tolaria Light 1.82; Twilight Violet 1.50; Willemstad Dark 2.75; Willemstad Light 3.31; Zettlr Berlin Dark 1.46; Zettlr Berlin Light 1.36; Zettlr Bielefeld Dark 1.46; Zettlr Bielefeld Light 1.36; Zettlr Bordeaux Dark 1.46; Zettlr Bordeaux Light 1.36; Zettlr Frankfurt Dark 1.46; Zettlr Frankfurt Light 1.36; Zettlr Karl-Marx-Stadt Dark 1.46; Zettlr Karl-Marx-Stadt Light 1.36

## I-collnull: collection null text on collection-bg (min 4.5)
  fail 27/28; worst 1.33 on Sakura (fg #d5c0c5 bg #eedede, Lc 13.82); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 2.46; Lavender Haze 1.37; Cool Mist 4.15; Deep Ocean 3.71; Foolscap 3.46; Graphite Violet 2.99; Ink Night 3.86; Mint Linen 2.86; Sakura 1.33; Sepia 3.11; Shimmering Focus Dark 2.32; Shimmering Focus Light 2.34; Tolaria Dark 2.66; Tolaria Light 1.92; Twilight Violet 1.75; Willemstad Dark 2.80; Willemstad Light 3.40; Zettlr Berlin Dark 2.09; Zettlr Berlin Light 1.53; Zettlr Bielefeld Dark 2.09; Zettlr Bielefeld Light 1.53; Zettlr Bordeaux Dark 2.09; Zettlr Bordeaux Light 1.53; Zettlr Frankfurt Dark 2.09; Zettlr Frankfurt Light 1.53; Zettlr Karl-Marx-Stadt Dark 2.09; Zettlr Karl-Marx-Stadt Light 1.53

## I-collempty: collection empty text on collection-bg (min 4.5)
  fail 27/28; worst 1.33 on Sakura (fg #d5c0c5 bg #eedede, Lc 13.82); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 2.46; Lavender Haze 1.37; Cool Mist 4.15; Deep Ocean 3.71; Foolscap 3.46; Graphite Violet 2.99; Ink Night 3.86; Mint Linen 2.86; Sakura 1.33; Sepia 3.11; Shimmering Focus Dark 2.32; Shimmering Focus Light 2.34; Tolaria Dark 2.66; Tolaria Light 1.92; Twilight Violet 1.75; Willemstad Dark 2.80; Willemstad Light 3.40; Zettlr Berlin Dark 2.09; Zettlr Berlin Light 1.53; Zettlr Bielefeld Dark 2.09; Zettlr Bielefeld Light 1.53; Zettlr Bordeaux Dark 2.09; Zettlr Bordeaux Light 1.53; Zettlr Frankfurt Dark 2.09; Zettlr Frankfurt Light 1.53; Zettlr Karl-Marx-Stadt Dark 2.09; Zettlr Karl-Marx-Stadt Light 1.53

## I-collerror: collection error on collection-bg (min 4.5)
  fail 11/28; worst 3.39 on Zettlr Bordeaux Dark (fg #d3322f bg #1e1e1e, Lc -27.29); apca<45 while wcag ok: 2
  FAIL: Lavender Haze 3.66; Sakura 3.97; Shimmering Focus Dark 4.42; Shimmering Focus Light 3.69; Tolaria Light 3.82; Willemstad Light 3.62; Zettlr Berlin Dark 3.55; Zettlr Bielefeld Dark 3.55; Zettlr Bordeaux Dark 3.39; Zettlr Frankfurt Dark 3.55; Zettlr Karl-Marx-Stadt Dark 3.55
  APCA: Twilight Violet 4.63/Lc-35.45; Willemstad Dark 5.34/Lc-40.31

## I-embederror: embed error on embed-bg (min 4.5)
  fail 11/28; worst 3.39 on Zettlr Bordeaux Dark (fg #d3322f bg #1e1e1e, Lc -27.29); apca<45 while wcag ok: 2
  FAIL: Lavender Haze 3.66; Sakura 3.97; Shimmering Focus Dark 4.42; Shimmering Focus Light 3.69; Tolaria Light 3.82; Willemstad Light 3.62; Zettlr Berlin Dark 3.55; Zettlr Bielefeld Dark 3.55; Zettlr Bordeaux Dark 3.39; Zettlr Frankfurt Dark 3.55; Zettlr Karl-Marx-Stadt Dark 3.55
  APCA: Twilight Violet 4.63/Lc-35.45; Willemstad Dark 5.34/Lc-40.31

## I-tag-pill: cm-lp-tag: color-mix(primary 70%, editor-fg) on color-mix(primary 20%, editor-bg) (min 4.5)
  fail 5/28; worst 4.00 on Zettlr Bielefeld Light (fg #7e5f47 bg #e0d5c4, Lc 55.23); apca<45 while wcag ok: 1
  FAIL: Zettlr Berlin Light 4.16; Zettlr Bielefeld Light 4.00; Zettlr Bordeaux Light 4.20; Zettlr Frankfurt Light 4.35; Zettlr Karl-Marx-Stadt Light 4.23
  APCA: Twilight Violet 4.57/Lc-42.78

## I-callout-bg: callout 7% bg: editor-fg text over callout-note 7% over editor-bg (min 4.5)
  fail 0/28; worst 6.57 on Zettlr Bielefeld Light (fg #50505a bg #e4ebea, Lc 74.89); apca<45 while wcag ok: 0

## J-chip-blue: COLOR_PRESET_CHIP_TEXT blue on COLOR_PRESET_BG over editor-bg (min 4.5)
  fail 0/28; worst 4.60 on Zettlr Bielefeld Light (fg #516681 bg #d8e5e7, Lc 62.62); apca<45 while wcag ok: 0

## J-chip-green: COLOR_PRESET_CHIP_TEXT green on COLOR_PRESET_BG over editor-bg (min 4.5)
  fail 1/28; worst 4.37 on Zettlr Bielefeld Light (fg #546f64 bg #d9ebd7, Lc 62.53); apca<45 while wcag ok: 0
  FAIL: Zettlr Bielefeld Light 4.37

## J-chip-red: COLOR_PRESET_CHIP_TEXT red on COLOR_PRESET_BG over editor-bg (min 4.5)
  fail 0/28; worst 4.69 on Zettlr Bielefeld Light (fg #815357 bg #f2d9cf, Lc 62.06); apca<45 while wcag ok: 0

## J-chip-orange: COLOR_PRESET_CHIP_TEXT orange on COLOR_PRESET_BG over editor-bg (min 4.5)
  fail 1/28; worst 4.40 on Zettlr Bielefeld Light (fg #7e6257 bg #f2e3cd, Lc 62.37); apca<45 while wcag ok: 0
  FAIL: Zettlr Bielefeld Light 4.40

## J-chip-purple: COLOR_PRESET_CHIP_TEXT purple on COLOR_PRESET_BG over editor-bg (min 4.5)
  fail 0/28; worst 4.82 on Zettlr Bielefeld Light (fg #605a85 bg #e3dfe9, Lc 63.75); apca<45 while wcag ok: 0

## J-chip-yellow: COLOR_PRESET_CHIP_TEXT yellow on COLOR_PRESET_BG over editor-bg (min 4.5)
  fail 1/28; worst 4.12 on Zettlr Bielefeld Light (fg #7b6d57 bg #f2e9c6, Lc 61.63); apca<45 while wcag ok: 0
  FAIL: Zettlr Bielefeld Light 4.12

## J-chip-gray: COLOR_PRESET_CHIP_TEXT gray on COLOR_PRESET_BG over editor-bg (min 4.5)
  fail 1/28; worst 4.49 on Zettlr Bielefeld Light (fg #67676e bg #e7e7dd, Lc 63.49); apca<45 while wcag ok: 0
  FAIL: Zettlr Bielefeld Light 4.49
```
### c4
```

## K-destructive---popover: text-destructive on --popover (min 4.5)
  fail 12/28; worst 2.96 on Zettlr Bordeaux Dark (fg #d3322f bg #282832, Lc -25.52); apca<45 while wcag ok: 2
  FAIL: KokoBrain Default 3.02; Graphite Violet 4.14; Sakura 3.97; Shimmering Focus Dark 4.42; Shimmering Focus Light 4.09; Tolaria Light 4.13; Willemstad Light 4.20; Zettlr Berlin Dark 3.11; Zettlr Bielefeld Dark 3.11; Zettlr Bordeaux Dark 2.96; Zettlr Frankfurt Dark 3.11; Zettlr Karl-Marx-Stadt Dark 3.11
  APCA: Twilight Violet 4.63/Lc-35.45; Willemstad Dark 5.14/Lc-39.93

## K-destructive---background: text-destructive on --background (min 4.5)
  fail 11/28; worst 3.39 on Zettlr Bordeaux Dark (fg #d3322f bg #1e1e1e, Lc -27.29); apca<45 while wcag ok: 1
  FAIL: KokoBrain Default 4.01; Shimmering Focus Dark 4.42; Shimmering Focus Light 3.69; Tolaria Light 3.82; Twilight Violet 4.23; Willemstad Light 3.62; Zettlr Berlin Dark 3.55; Zettlr Bielefeld Dark 3.55; Zettlr Bordeaux Dark 3.39; Zettlr Frankfurt Dark 3.55; Zettlr Karl-Marx-Stadt Dark 3.55
  APCA: Willemstad Dark 5.34/Lc-40.31

## K-destructive---card: text-destructive on --card (min 4.5)
  fail 12/28; worst 3.01 on Zettlr Berlin Dark (fg #cf413b bg #2b2b2c, Lc -26.14); apca<45 while wcag ok: 3
  FAIL: KokoBrain Default 3.44; Lavender Haze 4.16; Sakura 4.42; Shimmering Focus Light 3.89; Tolaria Light 4.13; Twilight Violet 3.92; Willemstad Light 3.96; Zettlr Berlin Dark 3.01; Zettlr Bielefeld Dark 3.01; Zettlr Bordeaux Dark 3.05; Zettlr Frankfurt Dark 3.01; Zettlr Karl-Marx-Stadt Dark 3.01
  APCA: Graphite Violet 4.55/Lc-43.81; Shimmering Focus Dark 4.70/Lc-38.87; Willemstad Dark 5.55/Lc-40.67

## K-destructive---settings-dialog-bg: text-destructive on --settings-dialog-bg (min 4.5)
  fail 12/28; worst 3.01 on Zettlr Berlin Dark (fg #cf413b bg #2b2b2c, Lc -26.14); apca<45 while wcag ok: 3
  FAIL: KokoBrain Default 3.08; Lavender Haze 4.16; Sakura 4.42; Shimmering Focus Light 3.89; Tolaria Light 4.13; Twilight Violet 3.92; Willemstad Light 3.96; Zettlr Berlin Dark 3.01; Zettlr Bielefeld Dark 3.01; Zettlr Bordeaux Dark 3.05; Zettlr Frankfurt Dark 3.01; Zettlr Karl-Marx-Stadt Dark 3.01
  APCA: Graphite Violet 4.55/Lc-43.81; Shimmering Focus Dark 4.70/Lc-38.87; Willemstad Dark 5.55/Lc-40.67

## K-destructive---editor-bg: text-destructive on --editor-bg (min 4.5)
  fail 10/28; worst 3.01 on Zettlr Berlin Dark (fg #cf413b bg #2b2b2c, Lc -26.14); apca<45 while wcag ok: 2
  FAIL: KokoBrain Default 3.44; Shimmering Focus Light 4.09; Tolaria Light 4.13; Twilight Violet 4.23; Willemstad Light 4.20; Zettlr Berlin Dark 3.01; Zettlr Bielefeld Dark 3.01; Zettlr Bordeaux Dark 3.05; Zettlr Frankfurt Dark 3.01; Zettlr Karl-Marx-Stadt Dark 3.01
  APCA: Shimmering Focus Dark 4.93/Lc-39.44; Willemstad Dark 5.83/Lc-40.98

## K-destructive---setting-item-bg: text-destructive on --setting-item-bg (min 4.5)
  fail 12/28; worst 3.39 on Zettlr Bordeaux Dark (fg #d3322f bg #1e1e1e, Lc -27.29); apca<45 while wcag ok: 2
  FAIL: KokoBrain Default 4.06; Lavender Haze 3.66; Sakura 3.97; Shimmering Focus Dark 4.42; Shimmering Focus Light 3.69; Tolaria Light 3.82; Willemstad Light 3.62; Zettlr Berlin Dark 3.55; Zettlr Bielefeld Dark 3.55; Zettlr Bordeaux Dark 3.39; Zettlr Frankfurt Dark 3.55; Zettlr Karl-Marx-Stadt Dark 3.55
  APCA: Twilight Violet 4.63/Lc-35.45; Willemstad Dark 5.34/Lc-40.31

## K-destructive---right-sidebar-bg: text-destructive on --right-sidebar-bg (min 4.5)
  fail 13/28; worst 3.39 on Zettlr Bordeaux Dark (fg #d3322f bg #1e1e1e, Lc -27.29); apca<45 while wcag ok: 1
  FAIL: KokoBrain Default 3.44; Lavender Haze 4.16; Sakura 4.42; Shimmering Focus Dark 4.42; Shimmering Focus Light 3.69; Tolaria Light 3.82; Twilight Violet 3.92; Willemstad Light 3.62; Zettlr Berlin Dark 3.55; Zettlr Bielefeld Dark 3.55; Zettlr Bordeaux Dark 3.39; Zettlr Frankfurt Dark 3.55; Zettlr Karl-Marx-Stadt Dark 3.55
  APCA: Willemstad Dark 5.34/Lc-40.31

## K-destructive---file-explorer-bg: text-destructive on --file-explorer-bg (min 4.5)
  fail 13/28; worst 3.39 on Zettlr Bordeaux Dark (fg #d3322f bg #1e1e1e, Lc -27.29); apca<45 while wcag ok: 1
  FAIL: KokoBrain Default 3.67; Lavender Haze 4.15; Sakura 4.42; Shimmering Focus Dark 4.42; Shimmering Focus Light 3.69; Tolaria Light 3.82; Twilight Violet 3.71; Willemstad Light 3.62; Zettlr Berlin Dark 3.55; Zettlr Bielefeld Dark 3.55; Zettlr Bordeaux Dark 3.39; Zettlr Frankfurt Dark 3.55; Zettlr Karl-Marx-Stadt Dark 3.55
  APCA: Willemstad Dark 5.34/Lc-40.31

## K-destr-box-editor: destructive text on destructive/10 over editor-bg (TasksView/CollectionView alert) (min 4.5)
  fail 15/28; worst 2.79 on Zettlr Berlin Dark (fg #cf413b bg #3b2d2e, Lc -24.95); apca<45 while wcag ok: 1
  FAIL: KokoBrain Default 3.20; Lavender Haze 3.94; Graphite Violet 4.35; Sakura 4.16; Shimmering Focus Dark 4.45; Shimmering Focus Light 3.55; Tolaria Light 3.60; Twilight Violet 3.77; Willemstad Light 3.64; Zettlr Berlin Dark 2.79; Zettlr Bielefeld Dark 2.79; Zettlr Bielefeld Light 4.26; Zettlr Bordeaux Dark 2.96; Zettlr Frankfurt Dark 2.79; Zettlr Karl-Marx-Stadt Dark 2.79
  APCA: Willemstad Dark 5.41/Lc-40.38

## K-muted-on-muted: text-muted-foreground on bg-muted (Trash count, Off chip, Archived, locked note) (min 4.5)
  fail 14/28; worst 2.52 on Zettlr Bordeaux Dark (fg #8f8f98 bg #505050, Lc -27.16); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 4.20; Sakura 4.26; Tolaria Light 4.15; Twilight Violet 3.87; Zettlr Berlin Dark 2.58; Zettlr Berlin Light 3.68; Zettlr Bielefeld Dark 2.58; Zettlr Bielefeld Light 3.68; Zettlr Bordeaux Dark 2.52; Zettlr Bordeaux Light 3.68; Zettlr Frankfurt Dark 2.58; Zettlr Frankfurt Light 3.68; Zettlr Karl-Marx-Stadt Dark 2.58; Zettlr Karl-Marx-Stadt Light 3.68

## K-muted-on-muted-fe: file-explorer-muted-fg on --muted (SearchResult Text badge) (min 4.5)
  fail 14/28; worst 2.52 on Zettlr Bordeaux Dark (fg #8f8f98 bg #505050, Lc -27.16); apca<45 while wcag ok: 1
  FAIL: Lavender Haze 3.68; Sakura 4.26; Tolaria Light 4.15; Twilight Violet 4.16; Zettlr Berlin Dark 2.58; Zettlr Berlin Light 3.68; Zettlr Bielefeld Dark 2.58; Zettlr Bielefeld Light 4.03; Zettlr Bordeaux Dark 2.52; Zettlr Bordeaux Light 3.68; Zettlr Frankfurt Dark 2.58; Zettlr Frankfurt Light 3.68; Zettlr Karl-Marx-Stadt Dark 2.58; Zettlr Karl-Marx-Stadt Light 3.68
  APCA: KokoBrain Default 4.60/Lc-39.07

## K-primaryfg: primary-foreground on primary (Button default, selected day) (min 4.5)
  fail 0/28; worst 4.51 on Zettlr Berlin Light (fg #030305 bg #12865e, Lc 32.82); apca<45 while wcag ok: 5
  APCA: Twilight Violet 4.95/Lc39.38; Willemstad Dark 4.51/Lc33.38; Zettlr Berlin Light 4.51/Lc32.82; Zettlr Frankfurt Dark 4.54/Lc40.79; Zettlr Karl-Marx-Stadt Dark 4.56/Lc41.49

## K-destrfg: destructive-foreground on destructive (Button destructive) (min 4.5)
  fail 0/28; worst 4.52 on Lavender Haze (fg #f1f1f3 bg #c83848, Lc -70.30); apca<45 while wcag ok: 7
  APCA: KokoBrain Default 4.57/Lc37.83; Shimmering Focus Dark 4.61/Lc40.24; Shimmering Focus Light 4.56/Lc36.28; Tolaria Light 4.54/Lc36.34; Twilight Violet 4.56/Lc37.25; Willemstad Dark 4.61/Lc40.24; Willemstad Light 4.56/Lc36.28

## K-input-border---popover: --input border vs --popover (3:1) (min 3)
  fail 26/28; worst 1.06 on Sakura (fg #e8d8d8 bg #eedede, Lc 0.00); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 1.24; Lavender Haze 1.51; Cool Mist 1.80; Deep Ocean 1.56; Foolscap 1.87; Graphite Violet 1.49; Ink Night 1.62; Mint Linen 1.71; Sakura 1.06; Sepia 2.04; Shimmering Focus Dark 2.32; Shimmering Focus Light 2.59; Tolaria Dark 1.50; Tolaria Light 1.41; Twilight Violet 1.38; Willemstad Dark 2.70; Zettlr Berlin Dark 1.81; Zettlr Berlin Light 1.67; Zettlr Bielefeld Dark 1.81; Zettlr Bielefeld Light 1.67; Zettlr Bordeaux Dark 1.81; Zettlr Bordeaux Light 1.67; Zettlr Frankfurt Dark 1.81; Zettlr Frankfurt Light 1.67; Zettlr Karl-Marx-Stadt Dark 1.81; Zettlr Karl-Marx-Stadt Light 1.67

## K-input-border---background: --input border vs --background (3:1) (min 3)
  fail 26/28; worst 1.07 on KokoBrain Default (fg #242835 bg #21222e, Lc 0.00); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 1.07; Lavender Haze 1.34; Cool Mist 1.55; Deep Ocean 1.94; Foolscap 1.54; Graphite Violet 2.04; Ink Night 2.00; Mint Linen 1.53; Sakura 1.28; Sepia 1.67; Shimmering Focus Dark 2.32; Shimmering Focus Light 2.34; Tolaria Dark 1.80; Tolaria Light 1.31; Twilight Violet 1.26; Willemstad Dark 2.80; Zettlr Berlin Dark 2.07; Zettlr Berlin Light 1.53; Zettlr Bielefeld Dark 2.07; Zettlr Bielefeld Light 1.53; Zettlr Bordeaux Dark 2.07; Zettlr Bordeaux Light 1.53; Zettlr Frankfurt Dark 2.07; Zettlr Frankfurt Light 1.53; Zettlr Karl-Marx-Stadt Dark 2.07; Zettlr Karl-Marx-Stadt Light 1.53

## K-input-border---editor-bg: --input border vs --editor-bg (3:1) (min 3)
  fail 25/28; worst 1.09 on KokoBrain Default (fg #242835 bg #2a2e3d, Lc 0.00); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 1.09; Lavender Haze 1.34; Cool Mist 1.69; Deep Ocean 1.83; Foolscap 1.73; Graphite Violet 1.83; Ink Night 1.89; Mint Linen 1.62; Sakura 1.28; Sepia 1.85; Shimmering Focus Dark 2.59; Shimmering Focus Light 2.59; Tolaria Dark 1.69; Tolaria Light 1.41; Twilight Violet 1.26; Zettlr Berlin Dark 1.75; Zettlr Berlin Light 1.67; Zettlr Bielefeld Dark 1.75; Zettlr Bielefeld Light 1.50; Zettlr Bordeaux Dark 1.86; Zettlr Bordeaux Light 1.67; Zettlr Frankfurt Dark 1.75; Zettlr Frankfurt Light 1.67; Zettlr Karl-Marx-Stadt Dark 1.75; Zettlr Karl-Marx-Stadt Light 1.67

## K-input-border---card: --input border vs --card (3:1) (min 3)
  fail 26/28; worst 1.09 on KokoBrain Default (fg #242835 bg #2a2e3d, Lc 0.00); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 1.09; Lavender Haze 1.23; Cool Mist 1.80; Deep Ocean 1.70; Foolscap 1.81; Graphite Violet 1.63; Ink Night 1.75; Mint Linen 1.67; Sakura 1.18; Sepia 1.98; Shimmering Focus Dark 2.47; Shimmering Focus Light 2.47; Tolaria Dark 1.61; Tolaria Light 1.41; Twilight Violet 1.17; Willemstad Dark 2.91; Zettlr Berlin Dark 1.75; Zettlr Berlin Light 1.67; Zettlr Bielefeld Dark 1.75; Zettlr Bielefeld Light 1.67; Zettlr Bordeaux Dark 1.86; Zettlr Bordeaux Light 1.67; Zettlr Frankfurt Dark 1.75; Zettlr Frankfurt Light 1.67; Zettlr Karl-Marx-Stadt Dark 1.75; Zettlr Karl-Marx-Stadt Light 1.67

## K-inputbg---popover: --input-bg fill vs --popover (min 3)
  fail 28/28; worst 1.00 on Cool Mist (fg #ffffff bg #ffffff, Lc 0.00); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 1.02; Lavender Haze 1.23; Cool Mist 1.00; Deep Ocean 1.09; Foolscap 1.04; Graphite Violet 1.10; Ink Night 1.08; Lumen Contrast 1.00; Mint Linen 1.02; Sakura 1.11; Sepia 1.03; Shimmering Focus Dark 1.06; Shimmering Focus Light 1.05; Tolaria Dark 1.08; Tolaria Light 1.00; Twilight Violet 1.18; Willemstad Dark 1.08; Willemstad Light 1.06; Zettlr Berlin Dark 1.03; Zettlr Berlin Light 1.00; Zettlr Bielefeld Dark 1.03; Zettlr Bielefeld Light 1.00; Zettlr Bordeaux Dark 1.03; Zettlr Bordeaux Light 1.00; Zettlr Frankfurt Dark 1.03; Zettlr Frankfurt Light 1.00; Zettlr Karl-Marx-Stadt Dark 1.03; Zettlr Karl-Marx-Stadt Light 1.00

## K-inputbg---card: --input-bg fill vs --card (min 3)
  fail 28/28; worst 1.00 on Lavender Haze (fg #eae6f2 bg #eae6f2, Lc 0.00); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 1.11; Lavender Haze 1.00; Cool Mist 1.00; Deep Ocean 1.00; Foolscap 1.00; Graphite Violet 1.00; Ink Night 1.00; Lumen Contrast 1.00; Mint Linen 1.00; Sakura 1.00; Sepia 1.00; Shimmering Focus Dark 1.00; Shimmering Focus Light 1.00; Tolaria Dark 1.00; Tolaria Light 1.00; Twilight Violet 1.00; Willemstad Dark 1.00; Willemstad Light 1.00; Zettlr Berlin Dark 1.00; Zettlr Berlin Light 1.00; Zettlr Bielefeld Dark 1.00; Zettlr Bielefeld Light 1.00; Zettlr Bordeaux Dark 1.00; Zettlr Bordeaux Light 1.00; Zettlr Frankfurt Dark 1.00; Zettlr Frankfurt Light 1.00; Zettlr Karl-Marx-Stadt Dark 1.00; Zettlr Karl-Marx-Stadt Light 1.00

## K-inputbg---settings-dialog-bg: --input-bg fill vs --settings-dialog-bg (min 3)
  fail 28/28; worst 1.00 on Lavender Haze (fg #eae6f2 bg #eae6f2, Lc 0.00); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 1.00; Lavender Haze 1.00; Cool Mist 1.00; Deep Ocean 1.00; Foolscap 1.00; Graphite Violet 1.00; Ink Night 1.00; Lumen Contrast 1.00; Mint Linen 1.00; Sakura 1.00; Sepia 1.00; Shimmering Focus Dark 1.00; Shimmering Focus Light 1.00; Tolaria Dark 1.00; Tolaria Light 1.00; Twilight Violet 1.00; Willemstad Dark 1.00; Willemstad Light 1.00; Zettlr Berlin Dark 1.00; Zettlr Berlin Light 1.00; Zettlr Bielefeld Dark 1.00; Zettlr Bielefeld Light 1.00; Zettlr Bordeaux Dark 1.00; Zettlr Bordeaux Light 1.00; Zettlr Frankfurt Dark 1.00; Zettlr Frankfurt Light 1.00; Zettlr Karl-Marx-Stadt Dark 1.00; Zettlr Karl-Marx-Stadt Light 1.00

## K-border-fe: file-explorer-border vs nav-bg (min 3)
  fail 28/28; worst 1.08 on KokoBrain Default (fg #242835 bg #1f2230, Lc 0.00); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 1.08; Lavender Haze 1.20; Cool Mist 1.19; Deep Ocean 1.50; Foolscap 1.17; Graphite Violet 1.55; Ink Night 1.54; Lumen Contrast 1.56; Mint Linen 1.15; Sakura 1.18; Sepia 1.27; Shimmering Focus Dark 1.31; Shimmering Focus Light 1.21; Tolaria Dark 1.47; Tolaria Light 1.12; Twilight Violet 1.22; Willemstad Dark 1.43; Willemstad Light 1.60; Zettlr Berlin Dark 2.22; Zettlr Berlin Light 1.26; Zettlr Bielefeld Dark 2.22; Zettlr Bielefeld Light 1.12; Zettlr Bordeaux Dark 2.22; Zettlr Bordeaux Light 1.26; Zettlr Frankfurt Dark 2.22; Zettlr Frankfurt Light 1.26; Zettlr Karl-Marx-Stadt Dark 2.22; Zettlr Karl-Marx-Stadt Light 1.26

## L-elev-ring-popover: popover ring var(--elev-ring) 1px over editor-bg vs popover (shadow-md edge; also border-border?) (min 1.3)
  fail 28/28; worst 1.01 on Ink Night (fg #292725 bg #2a2721, Lc 0.00); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 1.05; Lavender Haze 1.30; Cool Mist 1.23; Deep Ocean 1.01; Foolscap 1.25; Graphite Violet 1.03; Ink Night 1.01; Lumen Contrast 1.18; Mint Linen 1.21; Sakura 1.05; Sepia 1.26; Shimmering Focus Dark 1.05; Shimmering Focus Light 1.16; Tolaria Dark 1.05; Tolaria Light 1.15; Twilight Violet 1.30; Willemstad Dark 1.02; Willemstad Light 1.19; Zettlr Berlin Dark 1.24; Zettlr Berlin Light 1.13; Zettlr Bielefeld Dark 1.24; Zettlr Bielefeld Light 1.25; Zettlr Bordeaux Dark 1.15; Zettlr Bordeaux Light 1.13; Zettlr Frankfurt Dark 1.24; Zettlr Frankfurt Light 1.13; Zettlr Karl-Marx-Stadt Dark 1.24; Zettlr Karl-Marx-Stadt Light 1.13

## L-scrim: modal scrim over editor-bg (informational) (min 1.5)
  fail 18/28; worst 1.02 on Willemstad Dark (fg #030303 bg #070707, Lc 0.00); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 1.35; Deep Ocean 1.13; Graphite Violet 1.35; Ink Night 1.13; Shimmering Focus Dark 1.14; Tolaria Dark 1.16; Twilight Violet 1.19; Willemstad Dark 1.02; Zettlr Berlin Dark 1.31; Zettlr Berlin Light 1.49; Zettlr Bielefeld Dark 1.31; Zettlr Bielefeld Light 1.47; Zettlr Bordeaux Dark 1.26; Zettlr Bordeaux Light 1.49; Zettlr Frankfurt Dark 1.31; Zettlr Frankfurt Light 1.49; Zettlr Karl-Marx-Stadt Dark 1.31; Zettlr Karl-Marx-Stadt Light 1.49

## M-highlight: ==highlight==: editor-fg on lp-highlight-bg flattened over editor-bg (min 4.5)
  fail 4/28; worst 3.94 on Zettlr Berlin Dark (fg #f0f0f0 bg #7b7b1b, Lc -66.60); apca<45 while wcag ok: 0
  FAIL: Zettlr Berlin Dark 3.94; Zettlr Bielefeld Dark 3.94; Zettlr Frankfurt Dark 3.94; Zettlr Karl-Marx-Stadt Dark 3.94

## M-highlight-search-muted: search snippet <mark>: file-explorer-muted-fg on highlight-bg over list-bg (min 4.5)
  fail 14/28; worst 1.61 on Zettlr Berlin Dark (fg #91919a bg #737313, Lc -15.48); apca<45 while wcag ok: 1
  FAIL: KokoBrain Default 2.43; Lavender Haze 3.63; Deep Ocean 4.01; Foolscap 4.36; Graphite Violet 3.46; Ink Night 4.37; Sakura 4.08; Tolaria Light 4.40; Twilight Violet 2.72; Willemstad Dark 2.65; Zettlr Berlin Dark 1.61; Zettlr Bielefeld Dark 1.61; Zettlr Frankfurt Dark 1.61; Zettlr Karl-Marx-Stadt Dark 1.61
  APCA: Zettlr Bordeaux Dark 6.55/Lc-42.43

## M-highlight-search-muted-hover: same + hover:bg-file-explorer-accent/60 row bg? (snippet over list-bg then hover) skip (min 4.5)
  fail 14/28; worst 1.61 on Zettlr Berlin Dark (fg #91919a bg #737313, Lc -15.48); apca<45 while wcag ok: 1
  FAIL: KokoBrain Default 2.43; Lavender Haze 3.63; Deep Ocean 4.01; Foolscap 4.36; Graphite Violet 3.46; Ink Night 4.37; Sakura 4.08; Tolaria Light 4.40; Twilight Violet 2.72; Willemstad Dark 2.65; Zettlr Berlin Dark 1.61; Zettlr Bielefeld Dark 1.61; Zettlr Frankfurt Dark 1.61; Zettlr Karl-Marx-Stadt Dark 1.61
  APCA: Zettlr Bordeaux Dark 6.55/Lc-42.43

## M-highlight-syntax: highlight text strong (syntax-strong) over highlight (min 4.5)
  fail 6/28; worst 3.38 on Shimmering Focus Dark (fg #ed5aa8 bg #4a3b32, Lc -34.60); apca<45 while wcag ok: 0
  FAIL: Shimmering Focus Dark 3.38; Shimmering Focus Light 3.48; Zettlr Berlin Dark 3.94; Zettlr Bielefeld Dark 3.94; Zettlr Frankfurt Dark 3.94; Zettlr Karl-Marx-Stadt Dark 3.94

## M-selection: CM selection: editor-fg on syntax-selection over editor-bg (min 4.5)
  fail 1/28; worst 3.37 on Zettlr Berlin Dark (fg #f0f0f0 bg #519149, Lc -61.21); apca<45 while wcag ok: 0
  FAIL: Zettlr Berlin Dark 3.37

## M-selection-link: CM selection: syntax-link on selection over editor-bg (min 4.5)
  fail 21/28; worst 1.41 on Zettlr Berlin Dark (fg #1cb27e bg #519149, Lc -12.86); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 3.87; Lavender Haze 3.74; Cool Mist 4.00; Deep Ocean 4.25; Graphite Violet 2.85; Ink Night 3.86; Sakura 3.60; Sepia 4.23; Shimmering Focus Light 3.65; Tolaria Dark 2.46; Twilight Violet 4.17; Willemstad Dark 1.84; Zettlr Berlin Dark 1.41; Zettlr Berlin Light 3.67; Zettlr Bielefeld Light 3.11; Zettlr Bordeaux Dark 3.12; Zettlr Bordeaux Light 3.80; Zettlr Frankfurt Dark 3.71; Zettlr Frankfurt Light 3.78; Zettlr Karl-Marx-Stadt Dark 3.07; Zettlr Karl-Marx-Stadt Light 3.27

## M-selection-meta: selection: syntax-meta (3:1) (min 3)
  fail 12/28; worst 1.41 on Zettlr Berlin Dark (fg #1cb27e bg #519149, Lc -12.86); apca<45 while wcag ok: 3
  FAIL: KokoBrain Default 2.22; Lavender Haze 2.49; Graphite Violet 2.95; Sakura 2.66; Twilight Violet 2.36; Willemstad Dark 2.81; Zettlr Berlin Dark 1.41; Zettlr Berlin Light 2.44; Zettlr Bielefeld Light 2.08; Zettlr Bordeaux Light 2.57; Zettlr Frankfurt Dark 2.47; Zettlr Karl-Marx-Stadt Dark 2.02
  APCA: Deep Ocean 3.01/Lc-34.94; Ink Night 3.23/Lc-37.13; Tolaria Dark 3.24/Lc-44.69

## M-code-inline: inline code syntax-code on lp-code-bg over editor-bg (min 4.5)
  fail 0/28; worst 4.51 on Sakura (fg #3c764f bg #f1e9e9, Lc 64.69); apca<45 while wcag ok: 1
  APCA: Shimmering Focus Dark 4.77/Lc-39.59

## M-code-inline-fg: inline code editor-fg on lp-code-bg over editor-bg (min 4.5)
  fail 0/28; worst 6.99 on Zettlr Berlin Light (fg #50505a bg #f0f0f0, Lc 78.72); apca<45 while wcag ok: 0

## M-code-src: source-mode monospace syntax-code on syntax-code-bg over editor-bg (min 4.5)
  fail 0/28; worst 4.60 on Sakura (fg #3c764f bg #f3ebeb, Lc 65.86); apca<45 while wcag ok: 1
  APCA: Shimmering Focus Dark 4.77/Lc-39.59

## M-activegutter: gutter number muted-fg on active-line-gutter (min 4.5)
  fail 11/28; worst 2.52 on Zettlr Bordeaux Dark (fg #8f8f98 bg #505050, Lc -27.16); apca<45 while wcag ok: 1
  FAIL: Tolaria Light 4.15; Zettlr Berlin Dark 2.58; Zettlr Berlin Light 3.68; Zettlr Bielefeld Dark 2.58; Zettlr Bielefeld Light 3.68; Zettlr Bordeaux Dark 2.52; Zettlr Bordeaux Light 3.68; Zettlr Frankfurt Dark 2.58; Zettlr Frankfurt Light 3.68; Zettlr Karl-Marx-Stadt Dark 2.58; Zettlr Karl-Marx-Stadt Light 3.68
  APCA: Twilight Violet 5.32/Lc-40.06

## M-activegutter-fg: gutter number muted-fg on active-line (syntax-active-line over editor-bg) (min 4.5)
  fail 6/28; worst 3.85 on Zettlr Berlin Dark (fg #91919a bg #363637, Lc -36.71); apca<45 while wcag ok: 1
  FAIL: Zettlr Berlin Dark 3.85; Zettlr Bielefeld Dark 3.85; Zettlr Bielefeld Light 4.25; Zettlr Bordeaux Dark 4.00; Zettlr Frankfurt Dark 3.85; Zettlr Karl-Marx-Stadt Dark 3.85
  APCA: Twilight Violet 5.01/Lc-39.30

## M-collnull: collection null/empty text on collection-bg (flattened over editor-bg) (min 4.5)
  fail 27/28; worst 1.33 on Sakura (fg #d5c0c5 bg #eedede, Lc 13.82); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 2.46; Lavender Haze 1.37; Cool Mist 4.15; Deep Ocean 3.71; Foolscap 3.46; Graphite Violet 2.99; Ink Night 3.86; Mint Linen 2.86; Sakura 1.33; Sepia 3.11; Shimmering Focus Dark 2.32; Shimmering Focus Light 2.34; Tolaria Dark 2.66; Tolaria Light 1.92; Twilight Violet 1.75; Willemstad Dark 2.80; Willemstad Light 3.40; Zettlr Berlin Dark 2.09; Zettlr Berlin Light 1.53; Zettlr Bielefeld Dark 2.09; Zettlr Bielefeld Light 1.53; Zettlr Bordeaux Dark 2.09; Zettlr Bordeaux Light 1.53; Zettlr Frankfurt Dark 2.09; Zettlr Frankfurt Light 1.53; Zettlr Karl-Marx-Stadt Dark 2.09; Zettlr Karl-Marx-Stadt Light 1.53

## M-collloading: collection loading (min 4.5)
  fail 0/28; worst 4.58 on Tolaria Light (fg #71706d bg #f7f6f3, Lc 68.93); apca<45 while wcag ok: 5
  APCA: Zettlr Berlin Dark 5.34/Lc-41.60; Zettlr Bielefeld Dark 5.34/Lc-41.60; Zettlr Bordeaux Dark 5.20/Lc-40.59; Zettlr Frankfurt Dark 5.34/Lc-41.60; Zettlr Karl-Marx-Stadt Dark 5.34/Lc-41.60

## M-collheader: collection header text on header bg (min 4.5)
  fail 0/28; worst 4.53 on Tolaria Light (fg #6b6a67 bg #ebebea, Lc 65.10); apca<45 while wcag ok: 0

## M-codeblock-lang-flat: codeblock lang on header-bg (header-bg derived) (min 4.5)
  fail 13/28; worst 3.84 on Sakura (fg #735f6c bg #decdcf, Lc 52.53); apca<45 while wcag ok: 3
  FAIL: Lavender Haze 3.89; Graphite Violet 4.20; Sakura 3.84; Tolaria Light 3.93; Zettlr Berlin Dark 4.48; Zettlr Berlin Light 4.07; Zettlr Bielefeld Dark 4.48; Zettlr Bielefeld Light 4.42; Zettlr Bordeaux Light 4.42; Zettlr Frankfurt Dark 4.48; Zettlr Frankfurt Light 4.07; Zettlr Karl-Marx-Stadt Dark 4.48; Zettlr Karl-Marx-Stadt Light 4.07
  APCA: Twilight Violet 4.64/Lc-38.37; Willemstad Dark 5.81/Lc-44.83; Zettlr Bordeaux Dark 4.51/Lc-38.79
```
### c5
```

## N-syn-punctuation-editor: lp-syntax-punctuation on editor-bg (code files in CM) (min 4.5)
  fail 8/28; worst 3.11 on Zettlr Bielefeld Light (fg #898990 bg #f3f3e8, Lc 54.71); apca<45 while wcag ok: 4
  FAIL: Mint Linen 4.39; Sepia 4.44; Zettlr Berlin Light 3.62; Zettlr Bielefeld Light 3.11; Zettlr Bordeaux Dark 4.18; Zettlr Bordeaux Light 3.45; Zettlr Frankfurt Light 3.62; Zettlr Karl-Marx-Stadt Light 3.62
  APCA: Deep Ocean 5.35/Lc-40.32; Shimmering Focus Dark 4.83/Lc-37.31; Tolaria Dark 5.79/Lc-44.91; Twilight Violet 4.55/Lc-36.53

## N-syn-comment-editor: lp-syntax-comment on editor-bg (code files in CM) (min 4.5)
  fail 1/28; worst 4.40 on Zettlr Bielefeld Light (fg #886b56 bg #f3f3e8, Lc 66.32); apca<45 while wcag ok: 1
  FAIL: Zettlr Bielefeld Light 4.40
  APCA: Twilight Violet 5.50/Lc-43.93

## N-syn-builtin-editor: lp-syntax-builtin on editor-bg (code files in CM) (min 4.5)
  fail 0/28; worst 4.77 on Zettlr Bielefeld Light (fg #78694b bg #f3f3e8, Lc 69.06); apca<45 while wcag ok: 0

## N-syn-type-editor: lp-syntax-type on editor-bg (code files in CM) (min 4.5)
  fail 0/28; worst 4.77 on Zettlr Bielefeld Light (fg #78694b bg #f3f3e8, Lc 69.06); apca<45 while wcag ok: 0

## N-syn-string-editor: lp-syntax-string on editor-bg (code files in CM) (min 4.5)
  fail 0/28; worst 4.81 on Zettlr Bielefeld Light (fg #537252 bg #f3f3e8, Lc 69.22); apca<45 while wcag ok: 0

--- fill label check (fg given, white, black) ---
KokoBrain Default          --destructive  fg #171717 bg #f3333b cur 4.57 Lc 37.83 | white 3.93 Lc -70.40 | black 5.35 Lc 39.18
Shimmering Focus Dark      --destructive  fg #222222 bg #fb464c cur 4.61 Lc 40.24 | white 3.45 Lc -66.11 | black 6.08 Lc 43.41
Shimmering Focus Light     --destructive  fg #0f0f0f bg #e93147 cur 4.56 Lc 36.28 | white 4.20 Lc -72.80 | black 5.00 Lc 36.79
Tolaria Light              --destructive  fg #121212 bg #e53e3e cur 4.54 Lc 36.34 | white 4.13 Lc -72.47 | black 5.09 Lc 37.12
Twilight Violet            --primary      fg #1a181f bg #9a7bb9 cur 4.95 Lc 39.38 | white 3.55 Lc -68.55 | black 5.91 Lc 41.01
Twilight Violet            --destructive  fg #1b1a1d bg #d06060 cur 4.56 Lc 37.25 | white 3.80 Lc -70.49 | black 5.52 Lc 39.09
Willemstad Dark            --primary      fg #090909 bg #567f83 cur 4.51 Lc 33.38 | white 4.41 Lc -76.03 | black 4.76 Lc 33.53
Willemstad Dark            --destructive  fg #222222 bg #fb464c cur 4.61 Lc 40.24 | white 3.45 Lc -66.11 | black 6.08 Lc 43.41
Willemstad Light           --destructive  fg #0f0f0f bg #e93147 cur 4.56 Lc 36.28 | white 4.20 Lc -72.80 | black 5.00 Lc 36.79
Zettlr Berlin Light        --primary      fg #030305 bg #12865e cur 4.51 Lc 32.82 | white 4.57 Lc -76.71 | black 4.60 Lc 32.84
Zettlr Frankfurt Dark      --primary      fg #2b2b2b bg #5e97c7 cur 4.54 Lc 40.79 | white 3.12 Lc -63.50 | black 6.73 Lc 45.95
Zettlr Karl-Marx-Stadt Dark --primary      fg #2b2b2b bg #eb6a60 cur 4.56 Lc 41.49 | white 3.11 Lc -62.78 | black 6.76 Lc 46.66
```
