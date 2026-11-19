# Validation 08

Validator measurements for 18 scout findings. Scripts: /private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-validate-08/ (lib.mts plus f*.mts and m*.mts).
Method: theme cssVars from theme-tokens.json. app.css color-mix calls are resolved with the OKLab mix (mixColors) or an OKLch mix for `in oklch`. Tailwind `/NN` is treated as alpha NN% and composited over the real surface. rail/nav/list follow app.css:380-393 (light: rail = file-explorer-bg 96% + black in oklch, list = 50/50 with editor-bg; dark: oklch L -0.06 / -0.03). The APCA math is copied from color.ts.

## Verdicts (all 18 confirmed; there are duplicates)

| # | key | verdict | my measurement |
|---|-----|---------|----------------|
| 1 | color-presets.ts:37 kanban tag chip | confirmed, low | plain card: Zettlr light x5 yellow 4.23 (Lc63); coloured card: Bielefeld L 3.36 (Lc49), other Zettlr L 3.58, Bordeaux Dark 4.09; built-ins min 4.96 |
| 2 | app.css:444 punctuation / :439 comment | confirmed, medium | punct on codeblock-bg: Zettlr Berlin/Frankfurt/KMS L 3.32, Bielefeld/Bordeaux L 3.47, Tolaria L 4.40, Lavender Haze 4.28; on editor-bg: Bielefeld L 3.11, Mint Linen 4.38, Sepia 4.44, Bordeaux D 4.18; comment Berlin L 4.22, Bielefeld L/ed 4.39 |
| 3 | app.css:427 codeblock lang/copy | confirmed, medium | label 13/28: Sakura 3.84, Lavender 3.88, Tolaria L 3.93, Zettlr L 4.09-4.43, Graphite 4.23, Zettlr D 4.47 (Lc39); copy hover 15/28, worst Bordeaux D 3.34 |
| 4 | theme-builder:283 collection null/empty | confirmed, medium | 27/28: Sakura 1.33, Lavender 1.37, Zettlr L 1.53, Twilight 1.75, Tolaria L 1.92, default 2.46. Empty is a real message ("No results match the current filters") |
| 5 | styles.ts:269 highlight | confirmed, low | editor-fg 3.93 on #7b7b1b (Zettlr Berlin/Bielefeld/Frankfurt/KMS D, Lc67); strong SF Dark 3.38 Lc35, SF Light 3.47 |
| 6 | app.css:460 meta-bind hover | confirmed, low | destructive hover Willemstad L 3.16 Lc25, SF L 3.84, Tolaria L 3.87, Zettlr D 3.66, Bordeaux D 4.12; primary hover Zettlr Berlin L 4.16 Lc30 |
| 7 | theme-builder:192 mutedFg APCA | confirmed (APCA only), medium | Zettlr D x5 4.53-4.68 Lc39-42; Twilight Violet 4.51-5.32 Lc38-40; also KokoBrain Default status bar 4.50 Lc37, popover muted Lc44 |
| 8 | NoteRow.svelte:108 active row | confirmed, high | title 21/28 (default 3.70 Lc41, Twilight 2.82 Lc28, Willemstad D 3.11); subtitle 22/28 (Bielefeld/Bordeaux D 2.96); pill on active 26/28, 8 under 3 |
| 9 | PropertyField:131 | confirmed, duplicate of #11 | Zettlr L x5 3.50 on right-sidebar-bg, 3.66 on input-bg; Sakura 4.38 |
| 10 | PropertiesView:235 Add property | confirmed, high | label 28/28 under 4.5, 21 under 3 (default 2.93 Lc25, Tolaria L 2.25, Zettlr L 2.28); "Add item..." placeholder 1.46-1.91 on all 28. Correction: the :224 plus icon only shows while adding; the icon in the idle button inherits the label colour |
| 11 | PropertyField:139 values at 70% | confirmed, medium | as #9; hover on right-sidebar-accent: 10/28, Zettlr L 2.77 |
| 12 | theme-builder:241 fe-primary on nav/list | confirmed, low | nav 8/28 (SF L 4.08, Bielefeld L 4.13, Sakura 4.15); list 7/28 (Twilight 3.97, Willemstad D 4.18). Owner is the app: the palettes do not set it |
| 13 | FilesNavigator:347 selected row | confirmed, medium | 20/28; KMS L 2.98, SF L 2.97, Sakura 3.01, Twilight 3.06, default 4.05. fg on the same tint >= 5.03 |
| 14 | TypesNavigator:299 counts | confirmed, medium | badge-fg on the selected tint 21/28: default 3.09 Lc32, Lavender 3.15, Tolaria L 3.20, Bielefeld/Bordeaux D 3.24 |
| 15 | FilesNavigator:349 | confirmed, duplicate of #13 + #14 | same numbers; FilesNavigator:569 muted count identical (badge-fg = mutedFg) |
| 16 | rail-items.logic.ts:144 rail icons | confirmed, high | see #17 |
| 17 | rail-items.logic.ts:143 | confirmed, duplicate of #16 | light rail rest: favorites 1.31-1.58, tasks 1.56-1.88, files 1.71-2.05, pin 1.90-2.28, today 1.92-2.31 (all 15/15 < 3); tags, action 15/15; inbox and calendar 10/15; active tint lower (favorites 1.24). Dark: Twilight active search/archive 2.9 |
| 18 | SidebarSection:46 primary on surfaces | confirmed, low | titles 7/28 (SF L 4.08, Willemstad D 4.18, Twilight 4.19, Berlin L 4.19); calendar weekend 8/28; Active label Sakura 3.73 (6/28) |

## Shared roots
- A, accent text on its own tint (#8, #13, #14, #15, missed: idle note pills, search source badges). Use the column foreground for selected labels and counts, or emit a per-theme `--*-primary-on-tint` from ensureContrast against the flattened tint.
- B, readableCore lifts primary (4.5) and error (3) against editorBg only (#12, #18, missed: destructive context-menu item). Lift against sidebarBg, panelBg, popoverBg and the nav/list tones, with error as text at 4.5.
- C, opacity modifiers on text (#9/#11, #10, missed: other-month calendar days).
- D, label on a fill picked by WCAG alone (missed: primaryFg/errorFg APCA; #6 hover direction). Apply the labelColors APCA choice in readableCore.
- E, ==highlight== bg is not paired with anything (#5, missed: links in highlight).
- F, fixed rail hexes (#16/#17).
- G, code-block derived tokens (#2, #3).

## Missed (measured)
1. Destructive context/dropdown item text (context-menu-item.svelte:23): KokoBrain Default 3.02 Lc30, Zettlr D 2.96-3.11, highlighted 2.56-2.63; also Sakura 3.97, SF L 4.09, Tolaria L 4.13, Graphite 4.14, Willemstad L 4.20, SF D 4.42.
2. Button labels pass WCAG but fail APCA: primaryFg on primary Willemstad D #090909/#567f83 4.51 Lc33, Zettlr Berlin L #030305/#12865e 4.51 Lc33, Twilight Lc39, Zettlr Frankfurt/KMS D #2b2b2b on #5e97c7 Lc41 (black on mid blue); errorFg on destructive default #171717/#f3333b Lc38, SF L/Tolaria L/Willemstad L Lc36. The calendar selected day uses the same pair.
3. Idle note-row type/property pills (NoteRow.svelte:141): text-primary on primary/10 over list-bg, 10/28: Twilight 3.49, Willemstad D 3.77, SF L 3.78, Sakura 3.79, Zettlr L 3.82-4.17, Tolaria L 4.32.
4. Search hybrid source badges (SearchResult.svelte:153-156, 11px): Both/Semantic 14/28 (Twilight 3.25, SF L 3.54, Sakura 3.56); Text badge (fe-muted-fg on bg-muted #505050) 2.52-2.58 on Zettlr D x5.
5. Links and wikilinks inside ==highlight==: 15/28, 7 under 3: default #a78bfa on #625536 2.69 Lc32, Zettlr Frankfurt/KMS D 1.43/1.44, Berlin D 1.65, Willemstad D 1.96, Twilight 2.63.
6. Calendar other-month days (CalendarGrid.svelte:58, fe-muted-fg/40): 1.67-2.42 on all 28.
