# Validation 10 (scouts 01, 16, 18, 20 and overlaps)

Method: own scripts (scratchpad/audit-validate-10/m1..m6.mts) over theme-tokens.json with color-tools (lib.mts copied from validate-01). Tailwind `/N` = token at alpha N composited over the real surface; `dark:` follows html.dark (theme.service.ts:33). Surfaces traced: TasksView under EditorView.svelte:71 `bg-editor-bg`; menus `bg-popover` (dropdown-menu-content.svelte:24, context-menu-content.svelte:36); Settings panel `bg-settings-dialog-bg` (SettingsPanel.svelte:116), rows `bg-setting-item-bg` (SettingItem.svelte:21). Builder: setting-item-bg = background = sidebarBg, muted = settings-hover-bg = hover, accent = selected, input = switch-unchecked-bg = borderStrong, input-bg = panelBg.

| # | Finding | Verdict | Measured |
|---|---|---|---|
| 1 | Tasks row hover accent/50 | confirmed, medium, both | muted 6/28 (3.74 Zettlr Bielefeld Light, 4.37 Twilight Violet); primary 10/28 (3.59 Zettlr Berlin Light, 4.06 TV Lc35). Rest passes; fg on hover passes 28/28. |
| 2 | muted 11px APCA weak dark | confirmed, medium, app (builder) | muted on editor 6/28 Lc39 at 4.53-4.87 (TV, 5 Zettlr Dark) |
| 3 | primary small text APCA dark | confirmed, low | 4/28: Willemstad Dark 4.57 Lc31, TV 4.53 Lc36, Zettlr Frankfurt/KMS Dark Lc40 |
| 4 | parser vs schema syntaxes | confirmed, low, both (latent) | color.ts:16,32 parse only #3/6/8, comma rgb(a), oklch; schema:593-594 allows #4, hsl, space rgb, transparent, color-mix. No shipped theme uses them (grep). |
| 5 | primaryFg on primary | confirmed, medium, app | rest Lc33 Zettlr Berlin Light/Willemstad Dark (4.51), Lc39 TV, Lc41 Zettlr Frankfurt/KMS Dark; hover /90 11/28 <4.5 (3.75 Zettlr Bielefeld Light, 3.83-3.97 Willemstad/Zettlr dark). White on #12865e is 4.57 Lc77. |
| 6 | muted chrome text dark Lc 37-42 | confirmed, low, duplicate root of #2 | status bar KB 4.50 Lc37 (StatusBar.svelte:9), 7/28 |Lc|<45; popover 7/28; tab-inactive 5/28 Lc41-42 |
| 7 | destructive as text lifted to 3:1 | confirmed, medium, app | popover 12/28 (2.96 Zettlr Bordeaux Dark, KB 3.02); settings-dialog 12/28 (3.01); setting-item 12/28 (LH 3.66); editor 10/28 |
| 8 | muted on bg-muted chips | confirmed, medium, both | 14/28: 2.52 Zettlr Bordeaux Dark, 2.58 other Zettlr Dark, 3.68 Zettlr Light, 3.87 TV, LH 4.20 (file-explorer-muted 3.68 LH) |
| 9 | custom/imported themes skip lift | confirmed, low (latent), both | theme.logic.ts:105-109 keeps partial tokens verbatim; test loops BUILTIN_THEMES only (theme-builder.logic.test.ts:248) |
| 10 | READABILITY_PAIRS gaps (settings, destructive) | confirmed, medium, app | muted on settings-hover 15/28 (2.52); primary on hover 17/28 (2.58); primary on setting-item 6/28 (Sakura 3.73) |
| 11 | readableCore lifts on 4 plain surfaces only | confirmed, medium, app; same root as #10 | destructive on hover 19/28 (1.64 Zettlr Bordeaux Dark); muted on accent 11/28 (3.02 Zettlr Light); primary on accent 11/28 (2.73) |
| 12 | Zettlr hover/selected = border gray | confirmed, high, themes-repo | palettes: dark hover=border=borderStrong #505050, light hover #dcdcdc, selected=borderStrong #c8c8c8; resting bg-muted chips 2.52-2.58 on 5 Zettlr Dark |
| 13 | Todoist error + link | confirmed, low, duplicate of #7/#10 | error 12/28 (3.01 Zettlr Berlin Dark); link 4/28 (4.15 Sakura, 4.19 TV, 4.30 SF Light, 4.34 Willemstad Dark) |
| 14 | destructive button text-white | confirmed, low, app; fix corrected | white 3/28 at rest (4.13 Tolaria Light), hover /90 5/28 (3.67 Tolaria Light); dark /60 over popover Graphite Violet 4.47. Scout's fix wrong: destructiveForeground on dark /60 fill fails 8/13 dark (2.2 Willemstad Dark, KB 2.70). |
| 15 | input border / checkbox | partly confirmed, medium, both | border vs setting-item 26/28 <3 (1.06 Sakura, 1.09 KB), fill vs surface 28/28 ~1.0-1.3; kanban /40 28/28 (1.68-2.40), full muted passes 28/28. PropertyField native checkbox refuted: no appearance reset, WebKit draws the native control, border-input has no effect. |
| 16 | destructive menu item highlighted | confirmed, medium (transient), both | 18/28: 2.56 Zettlr Bordeaux Dark, KB 2.63 Lc27; light worst Sakura 3.48 |
| 17 | switch off state | confirmed, high (light), both | track vs row 26/28 <3 (1.06 Sakura); light thumb (bg-background) equals the row: 1.00 on 13/15 light themes, 1.21-1.24 Sakura/LH. Dark thumb (foreground) is visible, so dark is low. |

## Shared fixes
- A. labelColors-style text pick + fill adjust for primaryForeground (#5), with hover headroom; also covers kanban checked box and calendar selected day.
- B. Builder lift surfaces (#7, #10, #11, #13, #16): lift error to 4.5 as text, lift mutedFg/primary/error against hover, selected and settings surfaces; add pairs to READABILITY_PAIRS and the test. Destructive menu: keep the neutral accent highlight or lift against the flattened tint.
- C. Zettlr palette hover/selected (#12, #8, part of #1): needs the themes-repo change or B collapses the muted/fg hierarchy.
- D. APCA floor on dark themes for muted/primary text (#2, #3, #6).
- E. borderStrong as control boundary (#15, #17): dedicated control-border/switch track token at 3:1 vs setting-item-bg and a light thumb distinct from the row.
- #14: drop dark:bg-destructive/60 and use destructiveForeground on the opaque fill (28/28 pass 4.5), or keep white and darken the fill.
- #4, #9: tooling (parser/schema alignment, run the lift or show ratios for custom themes, extend the test to catalog themes).

## Missed
None new adjacent to this batch: input text fg/80 and placeholder pass 28/28; task status glyphs pass 3:1 at rest and on hover; Search Both/Semantic badges, error panels on destructive/10 and ring/50 focus are already reported by scouts 01, 02, 17, 19.

Not verified: rendered pixels (no app run); Tailwind v4 oklab color-mix for `/N` approximated as straight alpha compositing.
