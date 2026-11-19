# Scout 17: overlays and feedback

Read-only audit. Area: status bar, toasts, tooltips, popovers, dropdown/context menus, command palette, quick switcher, search match highlights, dialogs, note action bar, dock badge. All 28 themes.

## Method

- Traced every color class from the component to the token (file:line below), including shadcn primitives under `src/lib/components/ui/`, `svelte-sonner` CSS (node_modules/svelte-sonner/dist/Toaster.svelte), `@codemirror/autocomplete` base theme, and bits-ui Command (`aria-selected` set at command.svelte.js:1227).
- Resolved tokens per theme with the scout-02 resolver (`lib.mjs`, copied into the scratchpad; it applies app.css derived vars, `.dark` rules by `isDarkColor(--editor-bg)`, color-mix and oklch). Alpha fills are composited in sRGB over the real surface stack (popover under `bg-muted/50`, `success/15`, `accent/60` hover over `--list-bg`, etc.).
- WCAG 2 ratio plus APCA Lc with the same constants as `labelColors`. Text 4.5, meaningful non-text 3, APCA |Lc| < 45 flagged for small text.
- `html.dark` (which drives `dark:` utilities and sonner's theme) follows the editor background; I confirmed popover polarity matches it on all 28 themes (a3.mjs: no mismatch), so sonner's dark/light hardcoded greys land on a matching surface.
- Scripts and raw output: `/private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-17-overlays-feedback/a1.mjs`, `a1.out` (all checks), `a2.mjs`, `a3.mjs`.
- Not run: any app, test, pnpm check, browser. oklch/relative-color resolution is my own math (validated against `mixColors` by scout 02 for the oklab vars only).

## Findings (ranked)

1. [high, both] Selected/highlighted row is invisible or nearly so: `--accent` vs `--popover` is 1.00 on the five Zettlr dark themes (accent `#282832` == popover `#282832`, palette `selected` == `popoverBg`), 1.01 Willemstad Dark, 1.06 Sakura, 1.12 Tolaria Light, 1.16 Tolaria Dark, 1.18 Ink Night/Willemstad Light; at best 1.67 (Zettlr light). The only indicator of the keyboard position is `bg-accent`: command-item.svelte:20 and command-link-item.svelte:16 (command palette, quick switcher, template/one-on-one/mod pickers), dropdown-menu-item.svelte:23 and context-menu-item.svelte:23 (every menu), editor-theme.ts:85-88 (wikilink/tag/date autocomplete), KanbanWikilinkSuggestions. Text color does not change (accent-foreground == popover-foreground in practice). No hover/selection pair is in READABILITY_PAIRS (theme-builder.logic.ts:105). Fix: themes repo must make `selected` differ from `popoverBg` on those themes; app: add accent-vs-popover (about 1.3 minimum, not 3:1 for a tint, but never 1.0) to the theme-builder pairs, or add a non-color cue (left bar or ring) to the selected row. I measured the strict 3:1: all 28 fail, which is the usual tint convention, so I report severity on the near-1.0 cases.
2. [high, both] Search snippet `<mark>` (app.css:488-491, SearchResult.svelte:171): `--file-explorer-muted-fg` (inherited) on `--lp-highlight-bg` over `--list-bg`. 14/28 fail: Zettlr Berlin/Bielefeld/Frankfurt/Karl-Marx-Stadt Dark 1.61, KokoBrain Default 2.43, Willemstad Dark 2.65, Twilight Violet 2.72, Graphite Violet 3.46, Lavender Haze 3.63. On the hovered row (accent/60 under the mark) 22/28 fail, worst 1.53. Swapping the text to `--file-explorer-fg` fixes all but four Zettlr dark themes (4.42), so the highlight token also needs to be lighter or more transparent there. Same finding as scout 02 #2; re-measured with the hover state.
3. [high, both] File History diff: `text-destructive` on `bg-destructive/15` and `text-success` on `bg-success/15` over the dialog's popover (DiffViewer.svelte:14-15, text 14px mono, the dialog's whole content). Deleted lines 21/28 fail: Zettlr Bordeaux Dark 2.67, Zettlr dark 2.74, KokoBrain Default 2.73, Twilight Violet 3.88, Sakura 3.24, Graphite Violet 3.31, Zettlr Berlin Light 4.36. Inserted lines 11/28 fail: Sakura 3.41, Graphite Violet 3.83, Tolaria Light 4.05, Zettlr light 4.07. Line numbers (`text-muted-foreground`, DiffViewer.svelte:43,46) on the same tints: 17/28 fail on insert (KokoBrain Default 3.31), 15/28 on delete (Sakura 3.68). Fix: take the text from `--popover-foreground` and signal add/remove with the tint plus the `+`/`-` prefix, or lift the hue against the tint.
4. [high, both] Destructive menu items (context and dropdown menus: delete note, trash, delete lane/view): `text-destructive` on popover fails on 12/28 (Zettlr Bordeaux Dark 2.96, Zettlr dark 3.11, KokoBrain Default 3.02, Sakura 3.97, Graphite Violet 4.14), and highlighted (`bg-destructive/10`, `/20` under `html.dark`) on 18/28 (Zettlr Bordeaux Dark 2.56, KokoBrain Default 2.62, Zettlr dark 2.61, Graphite Violet 3.07, Sakura 3.47). Lines: dropdown-menu-item.svelte:23, context-menu-item.svelte:23. Root cause: `buildTheme` lifts `error` only to 3:1 on editorBg (theme-builder.logic.ts:187, `lift(p.error, 3)`), while menus draw it as 14px text on popover and on the red tint. Same cause: toast error left border (AppOverlays.svelte:22) 2.96 on Zettlr Bordeaux Dark.
5. [high, both] `--muted-foreground` / `--file-explorer-muted-fg` on `--muted`: 14/28 fail (Zettlr Bordeaux Dark 2.52, Zettlr dark 2.58, Zettlr light 3.68, Lavender Haze 3.68 on `--file-explorer-muted-fg`; Twilight Violet 3.87 on muted-foreground, Lavender Haze 4.20). My instances: the search mode toggle's inactive labels (11px, SearchPanel.svelte:251-253, track `bg-muted`), "Text" badge (SearchResult.svelte:156), the quick switcher "Archived" chip (QuickSwitcher.svelte:150), command dialog footer key hints (command-dialog.svelte:49,53). `muted`/`mutedForeground` is not in READABILITY_PAIRS (theme-builder.logic.ts:105-111 lists mutedForeground on editorBg, background, card, popover only). Same as scout 02 #7.
6. [medium, both] `--muted-foreground` on the highlighted `--accent` row: 11/28 fail (Zettlr light x5 3.02, Graphite Violet 3.70, Twilight Violet 3.87, Sepia 4.13, Lavender Haze 4.20, Sakura 4.26, Tolaria Light 4.43; 6 more dark themes pass WCAG with Lc 38-44). Hits the category label in the command palette (CommandPalette.svelte:60, 12px), the folder label in the quick switcher (QuickSwitcher.svelte:147), mod action descriptions (ModActionPicker.svelte:201), menu shortcuts and icons (dropdown-menu-shortcut `text-muted-foreground`, svg `text-muted-foreground`), selected snapshot rows (SnapshotList.svelte:44,60) and relationship-search hover rows. READABILITY_PAIRS has muted-foreground only on non-accent surfaces.
7. [medium, both] Status bar text is only just at 4.5 on the dark themes and reads poorly by APCA: `--status-bar-fg` on `--status-bar-bg` is 4.50 on KokoBrain Default (Lc -36.6), Twilight Violet Lc -38.2, Zettlr dark Lc -40.6 to -41.6 (7 themes under Lc 45, 12px). The children that use `text-muted-foreground` (SearchStatus.svelte, SemanticIndexStatus.svelte:59, SaveStatus.svelte:27 Modified) share the same Lc range (6 themes). StatusBar.svelte:9. Pair is already tested at 4.5 in READABILITY_PAIRS (`statusBarFg`), so the lever is a higher floor for 12px chrome text on dark themes.
8. [medium, both] `--file-explorer-primary` as text and as 15-20% tint in the search panel: Both/Semantic badges (SearchResult.svelte:151-155, 11px) 14/28 fail (Twilight Violet 3.25-3.27, Sakura 3.57, Shimmering Focus Light 3.55, Willemstad Dark 3.57); fuzzy `~` toggle on (SearchPanel.svelte:348, really on `bg-background`, not list-bg) 19/28 fail (Shimmering Focus Light 3.18, Zettlr Karl-Marx-Stadt Light 3.21, Zettlr Berlin Light 3.25); `§ heading` (SearchResult.svelte:167) 7/28 fail on list-bg (Twilight Violet 3.97) and 11/28 on the hovered row (Zettlr Berlin Light 3.33); "Open Settings" link (SearchPanel.svelte:265) 7/28 (Twilight Violet 3.97). `fileExplorerPrimary: p.primary` is lifted only on editorBg. Overlaps scout 02 #6 and #19.
9. [medium, app] Destructive `Button`: `text-white` hardcoded (button.svelte:12). Light themes: Tolaria Light 4.13, Shimmering Focus Light 4.20, Willemstad Light 4.20 fail on the solid fill; hover `bg-destructive/90` over popover fails on 4 (Tolaria Light 3.67, Shimmering Focus Light 3.80, Willemstad Light 3.78, Lavender Haze 4.38, the built-in light theme). Dark themes use `dark:bg-destructive/60` and all pass. Used by Empty Trash (TrashSection.svelte:74) and the mod run Stop button (ModActionPicker.svelte:159). It ignores `--destructive-foreground` and `labelColors`; same class as the owner's original bug.
10. [low, app] Type-colored icons on the selected accent row (quick switcher file icons from `--type-*`, QuickSwitcher.svelte:137-139 via `iconColorStyle`): 3:1 fails on 5 to 8 light themes depending on hue (Zettlr light 2.23-2.71, Sakura 2.92-2.96, Shimmering Focus Light 2.83-2.89, Lavender Haze 2.80-2.83, Shimmering Focus Dark blue 2.85). On plain popover only Zettlr Bordeaux Dark red (2.96) fails. The file name beside the icon carries identity.
11. [low, both] Todoist sync error in the status bar (`class:text-destructive`, TodoistSyncStatus.svelte:20, 12px): 12/28 fail (Zettlr Bordeaux Dark 3.39, Zettlr dark 3.55, Willemstad Light 3.62, Shimmering Focus Light 3.69, Tolaria Light 3.82, Twilight Violet 3.98, KokoBrain Default 4.01). Error state only.
12. [low, app] File History header timestamp `font-mono opacity-50` in `text-muted-foreground` on `bg-muted/50` (FileHistoryDialog.svelte:83): 28/28 fail, 1.65 to 2.78 (KokoBrain Default 2.50). The header text itself fails on 11/28 (Zettlr Bordeaux Dark 3.42).
13. [low, app] ZoomChip hover `text-primary` on popover (ZoomChip.svelte:16, 12px semibold): Sakura 3.73, Willemstad Dark 4.02, Graphite Violet 4.48.
14. [low, both] Properties picker section label `text-file-explorer-muted-fg` on a popover (RailPropertiesPicker.svelte:130, 11px): KokoBrain Default 3.71 (the token is only tested on `fileExplorerBg`); 6 more dark themes pass with Lc 38-43.
15. [low, both] Mod run progress bar: `bg-primary` fill on `bg-muted` track (ModActionPicker.svelte:119-126, 3:1 for a meaningful bar): Zettlr Frankfurt Dark 2.58, Karl-Marx-Stadt Dark 2.60, Berlin Dark 2.96.

Related and not reported separately: mod run "done" status (`text-success` on popover, ModActionPicker.svelte:18) 4.07 on Sakura only; sync-log filter selected pill (`variant=secondary` vs popover, TodoistSyncLogDialog.svelte:37) 1.00-1.81, selected state shown by fill only; search mode toggle selected segment `bg-background` vs `bg-muted` 1.00-2.07 (text contrast carries it, but see 5); search input border 1.01-2.07 vs list-bg (scout 02 #10).

## Passed

- Toasts: title `popover-foreground` on popover worst 7.97; sonner description (`#3f3f3f` light, `hsl(0 0% 91%)` dark, Toaster.svelte:665-678) on popover worst 8.09 on Sakura, popover polarity matches `html.dark` on all 28; action button (inverse of popover) worst 7.97; close button worst 8.72; left accents success/warning/info vs popover worst 3.73 (error fails only on Zettlr Bordeaux Dark, folded into 4). `toast.cancel` and `richColors` are unused.
- Tooltip: `text-background` on `bg-foreground` worst 7.31 (Zettlr Berlin Light). No custom tooltip classes found.
- Menus, popovers, dialogs: `popover-foreground` on popover worst 7.97; `accent-foreground` on accent worst 4.76; `muted-foreground` shortcut/description/placeholder/group heading on popover all pass (worst 4.51 Sakura, but 7 themes at Lc 38-44, same as 7); dialog description same; dialog close icon at opacity .7 worst 3.69; focus ring `--ring` vs popover/background/editor-bg worst 3.73 (Sakura vs popover); quick switcher `<mark>` is bold only, `text-foreground` on accent worst 4.76.
- Command palette and quick switcher body text, template picker, one-on-one picker: pass (same tokens).
- Rail popovers (sort, archived, properties): `tab-text-active` on popover worst 6.94, `tab-text-inactive` icons on popover worst 4.55, `popover-foreground` and `tab-text-active` on the hover `file-explorer-accent` worst 4.76.
- Note action bar: `tab-text-inactive` on editor-bg worst 4.52 (5 dark Zettlr at Lc 39); hover `editor-fg` on muted worst 4.82; favorite star `type-yellow` worst 3.71; organized circle `type-green` worst 3.73; check stroke `editor-bg` on the green fill worst 3.73; its dropdown inherits 1, 4, 6.
- Search: placeholder `file-explorer-muted-fg` on `background` worst 4.58 (7 themes Lc 40-42); plain snippet and result icons on list-bg worst 4.51, on hover row 3.68 (7 light themes fail, tied to 6).
- Default `Button` and secondary `Button` pass WCAG (default Lc 32.8-41.5 on 5 themes, scout 02 #8).
- Dock badge: the count is drawn by macOS (`applyDockBadge`), not by app CSS; nothing to measure.

## Not checked

- Real rendering (no browser or app launch): oklch and relative-color results are my math; WebKit may differ at the gamut edge.
- Sonner states I could not trace to a use: `closeButton: true` toasts on a light theme draw the close X with sonner's `--gray12` and border `--gray4` (checked color only, not the circle's border); the loading spinner and promise toasts.
- The settings side panel, EventPopover, TagColorPicker, collection/calendar popovers (other scouts' areas), native `title` tooltips and the macOS dock badge. User-chosen icon colors (arbitrary hex) cannot be measured.
- Disabled items (`opacity-50`, exempt), decorative scrim/elevation ring.
- Hover/focus compositions beyond those listed; `Tooltip` instances that pass custom classes (none found by grep).

## Raw measurements

Full per-check output (28 themes each) is in `/private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-17-overlays-feedback/a1.out`. Format: `fail N/28; worst ratio on Theme`, then the failing themes with ratios, then the themes that pass WCAG but sit under |Lc| 45.


```

## SB1: status bar text: status-bar-fg on status-bar-bg (WordCount, Saved, Todoist label) (min 4.5)
  fail 0/28; worst 4.50 on KokoBrain Default (fg #7c89a8 bg #21222e, Lc -36.56); apca<45 while wcag ok: 7
  APCA: KokoBrain Default 4.50/Lc-36.56; Twilight Violet 4.58/Lc-38.18; Zettlr Berlin Dark 5.34/Lc-41.60; Zettlr Bielefeld Dark 5.34/Lc-41.60; Zettlr Bordeaux Dark 5.20/Lc-40.59; Zettlr Frankfurt Dark 5.34/Lc-41.60; Zettlr Karl-Marx-Stadt Dark 5.34/Lc-41.60

## SB2: status bar text-muted-foreground (SearchStatus, SemanticIndexStatus, SaveStatus Modified) on status-bar-bg (min 4.5)
  fail 0/28; worst 4.58 on Twilight Violet (fg #908aa4 bg #27252d, Lc -38.18); apca<45 while wcag ok: 6
  APCA: Twilight Violet 4.58/Lc-38.18; Zettlr Berlin Dark 5.34/Lc-41.60; Zettlr Bielefeld Dark 5.34/Lc-41.60; Zettlr Bordeaux Dark 5.20/Lc-40.59; Zettlr Frankfurt Dark 5.34/Lc-41.60; Zettlr Karl-Marx-Stadt Dark 5.34/Lc-41.60

## SB3: status bar Todoist error text-destructive on status-bar-bg (min 4.5)
  fail 12/28; worst 3.39 on Zettlr Bordeaux Dark (fg #d3322f bg #1e1e1e, Lc -27.29); apca<45 while wcag ok: 1
  FAIL: KokoBrain Default 4.01; Lavender Haze 4.37; Shimmering Focus Dark 4.42; Shimmering Focus Light 3.69; Tolaria Light 3.82; Twilight Violet 3.98; Willemstad Light 3.62; Zettlr Berlin Dark 3.55; Zettlr Bielefeld Dark 3.55; Zettlr Bordeaux Dark 3.39; Zettlr Frankfurt Dark 3.55; Zettlr Karl-Marx-Stadt Dark 3.55
  APCA: Willemstad Dark 5.34/Lc-40.31

## ZC1: ZoomChip popover-foreground on popover (12px semibold) (min 4.5)
  fail 0/28; worst 7.97 on Zettlr Berlin Light (fg #50505a bg #ffffff, Lc 87.64); apca<45 while wcag ok: 0

## ZC2: ZoomChip hover:text-primary on popover (min 4.5)
  fail 3/28; worst 3.73 on Sakura (fg #bd4776 bg #eedede, Lc 55.56); apca<45 while wcag ok: 3
  FAIL: Graphite Violet 4.48; Sakura 3.73; Willemstad Dark 4.02
  APCA: Twilight Violet 4.95/Lc-37.38; Zettlr Frankfurt Dark 4.67/Lc-40.03; Zettlr Karl-Marx-Stadt Dark 4.70/Lc-40.75

## TO1: toast title popover-foreground on popover (min 4.5)
  fail 0/28; worst 7.97 on Zettlr Berlin Light (fg #50505a bg #ffffff, Lc 87.64); apca<45 while wcag ok: 0

## TO2: toast description: sonner hardcoded (#3f3f3f light / hsl(0 0% 91%) dark by editor-bg polarity) on popover (min 4.5)
  fail 0/28; worst 8.09 on Sakura (fg #3f3f3f bg #eedede, Lc 77.12); apca<45 while wcag ok: 0

## TO3: toast action button: popover text on popover-foreground fill (12px) (min 4.5)
  fail 0/28; worst 7.97 on Zettlr Berlin Light (fg #ffffff bg #50505a, Lc -92.33); apca<45 while wcag ok: 0

## TO4a: toast left accent error: destructive vs popover (3:1) (min 3)
  fail 1/28; worst 2.96 on Zettlr Bordeaux Dark (fg #d3322f bg #282832, Lc -25.52); apca<45 while wcag ok: 0
  FAIL: Zettlr Bordeaux Dark 2.96

## TO4b: toast left accent success vs popover (min 3)
  fail 0/28; worst 4.07 on Sakura (fg #3e7751 bg #eedede, Lc 58.87); apca<45 while wcag ok: 0

## TO4c: toast left accent warning vs popover (min 3)
  fail 0/28; worst 4.14 on Sakura (fg #7f681e bg #eedede, Lc 59.36); apca<45 while wcag ok: 0

## TO4d: toast left accent info: primary vs popover (min 3)
  fail 0/28; worst 3.73 on Sakura (fg #bd4776 bg #eedede, Lc 55.56); apca<45 while wcag ok: 0

## TO5: toast close button: sonner gray12 (#171717) on popover when light; normal-text on popover when dark (min 4.5)
  fail 0/28; worst 8.72 on Zettlr Bordeaux Dark (fg #c8c8c8 bg #282832, Lc -69.69); apca<45 while wcag ok: 0

## TT1: tooltip text-background on bg-foreground (12px) (min 4.5)
  fail 0/28; worst 7.31 on Zettlr Berlin Light (fg #f5f5f5 bg #50505a, Lc -85.74); apca<45 while wcag ok: 0

## M1: menu item popover-foreground on popover (min 4.5)
  fail 0/28; worst 7.97 on Zettlr Berlin Light (fg #50505a bg #ffffff, Lc 87.64); apca<45 while wcag ok: 0

## M2: menu highlighted: accent-foreground on accent (min 4.5)
  fail 0/28; worst 4.76 on Zettlr Berlin Light (fg #50505a bg #c8c8c8, Lc 55.89); apca<45 while wcag ok: 0

## M3: menu shortcut (12px) muted-foreground on popover (min 4.5)
  fail 0/28; worst 4.51 on Sakura (fg #735f6c bg #eedede, Lc 61.98); apca<45 while wcag ok: 7
  APCA: KokoBrain Default 4.52/Lc-43.63; Twilight Violet 5.32/Lc-40.06; Zettlr Berlin Dark 4.67/Lc-39.83; Zettlr Bielefeld Dark 4.67/Lc-39.83; Zettlr Bordeaux Dark 4.55/Lc-38.82; Zettlr Frankfurt Dark 4.67/Lc-39.83; Zettlr Karl-Marx-Stadt Dark 4.67/Lc-39.83

## M4: menu shortcut/svg icon muted-foreground on highlighted accent (min 4.5)
  fail 11/28; worst 3.02 on Zettlr Berlin Light (fg #6e6e77 bg #c8c8c8, Lc 43.15); apca<45 while wcag ok: 6
  FAIL: Lavender Haze 4.20; Graphite Violet 3.70; Sakura 4.26; Sepia 4.13; Tolaria Light 4.43; Twilight Violet 3.87; Zettlr Berlin Light 3.02; Zettlr Bielefeld Light 3.02; Zettlr Bordeaux Light 3.02; Zettlr Frankfurt Light 3.02; Zettlr Karl-Marx-Stadt Light 3.02
  APCA: Deep Ocean 4.50/Lc-43.66; Zettlr Berlin Dark 4.67/Lc-39.83; Zettlr Bielefeld Dark 4.67/Lc-39.83; Zettlr Bordeaux Dark 4.55/Lc-38.82; Zettlr Frankfurt Dark 4.67/Lc-39.83; Zettlr Karl-Marx-Stadt Dark 4.67/Lc-39.83

## M5: menu destructive text on popover (min 4.5)
  fail 12/28; worst 2.96 on Zettlr Bordeaux Dark (fg #d3322f bg #282832, Lc -25.52); apca<45 while wcag ok: 2
  FAIL: KokoBrain Default 3.02; Graphite Violet 4.14; Sakura 3.97; Shimmering Focus Dark 4.42; Shimmering Focus Light 4.09; Tolaria Light 4.13; Willemstad Light 4.20; Zettlr Berlin Dark 3.11; Zettlr Bielefeld Dark 3.11; Zettlr Bordeaux Dark 2.96; Zettlr Frankfurt Dark 3.11; Zettlr Karl-Marx-Stadt Dark 3.11
  APCA: Twilight Violet 4.63/Lc-35.45; Willemstad Dark 5.14/Lc-39.93

## M6: menu destructive highlighted (light /10, html.dark /20) on popover (min 4.5)
  fail 18/28; worst 2.56 on Zettlr Bordeaux Dark (fg #d3322f bg #4a2a31, Lc -23.08); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 2.62; Lavender Haze 4.41; Deep Ocean 4.32; Graphite Violet 3.07; Ink Night 3.98; Sakura 3.47; Shimmering Focus Dark 3.51; Shimmering Focus Light 3.55; Tolaria Dark 4.46; Tolaria Light 3.60; Twilight Violet 3.62; Willemstad Dark 4.06; Willemstad Light 3.64; Zettlr Berlin Dark 2.61; Zettlr Bielefeld Dark 2.61; Zettlr Bordeaux Dark 2.56; Zettlr Frankfurt Dark 2.61; Zettlr Karl-Marx-Stadt Dark 2.61

## M7: menu highlight indicator: accent vs popover (3:1) (min 3)
  fail 28/28; worst 1.00 on Zettlr Berlin Dark (fg #282832 bg #282832, Lc 0.00); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 1.24; Lavender Haze 1.51; Cool Mist 1.27; Deep Ocean 1.26; Foolscap 1.25; Graphite Violet 1.25; Ink Night 1.18; Lumen Contrast 1.26; Mint Linen 1.28; Sakura 1.06; Sepia 1.60; Shimmering Focus Dark 1.33; Shimmering Focus Light 1.34; Tolaria Dark 1.16; Tolaria Light 1.12; Twilight Violet 1.38; Willemstad Dark 1.01; Willemstad Light 1.18; Zettlr Berlin Dark 1.00; Zettlr Berlin Light 1.67; Zettlr Bielefeld Dark 1.00; Zettlr Bielefeld Light 1.67; Zettlr Bordeaux Dark 1.00; Zettlr Bordeaux Light 1.67; Zettlr Frankfurt Dark 1.00; Zettlr Frankfurt Light 1.67; Zettlr Karl-Marx-Stadt Dark 1.00; Zettlr Karl-Marx-Stadt Light 1.67

## C1: command placeholder/group heading/category/footer: muted-foreground on popover (min 4.5)
  fail 0/28; worst 4.51 on Sakura (fg #735f6c bg #eedede, Lc 61.98); apca<45 while wcag ok: 7
  APCA: KokoBrain Default 4.52/Lc-43.63; Twilight Violet 5.32/Lc-40.06; Zettlr Berlin Dark 4.67/Lc-39.83; Zettlr Bielefeld Dark 4.67/Lc-39.83; Zettlr Bordeaux Dark 4.55/Lc-38.82; Zettlr Frankfurt Dark 4.67/Lc-39.83; Zettlr Karl-Marx-Stadt Dark 4.67/Lc-39.83

## C2: selected command row: category/folder/description muted-foreground on accent (min 4.5)
  fail 11/28; worst 3.02 on Zettlr Berlin Light (fg #6e6e77 bg #c8c8c8, Lc 43.15); apca<45 while wcag ok: 6
  FAIL: Lavender Haze 4.20; Graphite Violet 3.70; Sakura 4.26; Sepia 4.13; Tolaria Light 4.43; Twilight Violet 3.87; Zettlr Berlin Light 3.02; Zettlr Bielefeld Light 3.02; Zettlr Bordeaux Light 3.02; Zettlr Frankfurt Light 3.02; Zettlr Karl-Marx-Stadt Light 3.02
  APCA: Deep Ocean 4.50/Lc-43.66; Zettlr Berlin Dark 4.67/Lc-39.83; Zettlr Bielefeld Dark 4.67/Lc-39.83; Zettlr Bordeaux Dark 4.55/Lc-38.82; Zettlr Frankfurt Dark 4.67/Lc-39.83; Zettlr Karl-Marx-Stadt Dark 4.67/Lc-39.83

## C3: Archived chip + footer kbd: muted-foreground on muted (11-12px) (min 4.5)
  fail 14/28; worst 2.52 on Zettlr Bordeaux Dark (fg #8f8f98 bg #505050, Lc -27.16); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 4.20; Sakura 4.26; Tolaria Light 4.15; Twilight Violet 3.87; Zettlr Berlin Dark 2.58; Zettlr Berlin Light 3.68; Zettlr Bielefeld Dark 2.58; Zettlr Bielefeld Light 3.68; Zettlr Bordeaux Dark 2.52; Zettlr Bordeaux Light 3.68; Zettlr Frankfurt Dark 2.58; Zettlr Frankfurt Light 3.68; Zettlr Karl-Marx-Stadt Dark 2.58; Zettlr Karl-Marx-Stadt Light 3.68

## C4: quick switcher match <mark> text-foreground on selected accent row (min 4.5)
  fail 0/28; worst 4.76 on Zettlr Berlin Light (fg #50505a bg #c8c8c8, Lc 55.89); apca<45 while wcag ok: 0

## C4b: quick switcher match <mark> text-foreground on popover (min 4.5)
  fail 0/28; worst 7.97 on Zettlr Berlin Light (fg #50505a bg #ffffff, Lc 87.64); apca<45 while wcag ok: 0

## C5: command item popover-foreground on popover (min 4.5)
  fail 0/28; worst 7.97 on Zettlr Berlin Light (fg #50505a bg #ffffff, Lc 87.64); apca<45 while wcag ok: 0

## CI-red-pop: quick switcher type icon type-red on popover (3:1) (min 3)
  fail 1/28; worst 2.96 on Zettlr Bordeaux Dark (fg #d3322f bg #282832, Lc -25.52); apca<45 while wcag ok: 0
  FAIL: Zettlr Bordeaux Dark 2.96

## CI-red-acc: quick switcher type icon type-red on selected accent row (3:1) (min 3)
  fail 1/28; worst 2.96 on Zettlr Bordeaux Dark (fg #d3322f bg #282832, Lc -25.52); apca<45 while wcag ok: 0
  FAIL: Zettlr Bordeaux Dark 2.96

## CI-orange-pop: quick switcher type icon type-orange on popover (3:1) (min 3)
  fail 0/28; worst 3.14 on Sakura (fg #be6638 bg #eedede, Lc 50.23); apca<45 while wcag ok: 0

## CI-orange-acc: quick switcher type icon type-orange on selected accent row (3:1) (min 3)
  fail 8/28; worst 2.39 on Zettlr Bordeaux Light (fg #c66420 bg #c8c8c8, Lc 35.04); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.80; Sakura 2.96; Shimmering Focus Light 2.83; Zettlr Berlin Light 2.44; Zettlr Bielefeld Light 2.55; Zettlr Bordeaux Light 2.39; Zettlr Frankfurt Light 2.44; Zettlr Karl-Marx-Stadt Light 2.44

## CI-yellow-pop: quick switcher type icon type-yellow on popover (3:1) (min 3)
  fail 0/28; worst 3.12 on Sakura (fg #987b11 bg #eedede, Lc 50.27); apca<45 while wcag ok: 0

## CI-yellow-acc: quick switcher type icon type-yellow on selected accent row (3:1) (min 3)
  fail 8/28; worst 2.23 on Zettlr Berlin Light (fg #a57f00 bg #c8c8c8, Lc 32.83); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.83; Sakura 2.95; Shimmering Focus Light 2.89; Zettlr Berlin Light 2.23; Zettlr Bielefeld Light 2.55; Zettlr Bordeaux Light 2.23; Zettlr Frankfurt Light 2.23; Zettlr Karl-Marx-Stadt Light 2.23

## CI-green-pop: quick switcher type icon type-green on popover (3:1) (min 3)
  fail 0/28; worst 3.09 on Sakura (fg #458d5e bg #eedede, Lc 49.94); apca<45 while wcag ok: 0

## CI-green-acc: quick switcher type icon type-green on selected accent row (3:1) (min 3)
  fail 8/28; worst 2.26 on Zettlr Berlin Light (fg #48942f bg #c8c8c8, Lc 33.31); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 2.82; Sakura 2.92; Shimmering Focus Light 2.88; Zettlr Berlin Light 2.26; Zettlr Bielefeld Light 2.54; Zettlr Bordeaux Light 2.26; Zettlr Frankfurt Light 2.26; Zettlr Karl-Marx-Stadt Light 2.26

## CI-teal-pop: quick switcher type icon type-teal on popover (3:1) (min 3)
  fail 0/28; worst 3.10 on Sakura (fg #488891 bg #eedede, Lc 50.11); apca<45 while wcag ok: 0

## CI-teal-acc: quick switcher type icon type-teal on selected accent row (3:1) (min 3)
  fail 7/28; worst 2.27 on Zettlr Berlin Light (fg #248fa3 bg #c8c8c8, Lc 33.34); apca<45 while wcag ok: 0
  FAIL: Sakura 2.93; Shimmering Focus Light 2.86; Zettlr Berlin Light 2.27; Zettlr Bielefeld Light 2.51; Zettlr Bordeaux Light 2.27; Zettlr Frankfurt Light 2.27; Zettlr Karl-Marx-Stadt Light 2.27

## CI-blue-pop: quick switcher type icon type-blue on popover (3:1) (min 3)
  fail 0/28; worst 3.47 on Sakura (fg #4878b8 bg #eedede, Lc 53.80); apca<45 while wcag ok: 0

## CI-blue-acc: quick switcher type icon type-blue on selected accent row (3:1) (min 3)
  fail 6/28; worst 2.37 on Zettlr Berlin Light (fg #237aff bg #c8c8c8, Lc 34.53); apca<45 while wcag ok: 0
  FAIL: Shimmering Focus Dark 2.85; Zettlr Berlin Light 2.37; Zettlr Bielefeld Light 2.52; Zettlr Bordeaux Light 2.37; Zettlr Frankfurt Light 2.37; Zettlr Karl-Marx-Stadt Light 2.37

## CI-purple-pop: quick switcher type icon type-purple on popover (3:1) (min 3)
  fail 0/28; worst 3.71 on Sakura (fg #8860b0 bg #eedede, Lc 56.00); apca<45 while wcag ok: 0

## CI-purple-acc: quick switcher type icon type-purple on selected accent row (3:1) (min 3)
  fail 5/28; worst 2.28 on Zettlr Berlin Light (fg #c358c4 bg #c8c8c8, Lc 33.25); apca<45 while wcag ok: 0
  FAIL: Zettlr Berlin Light 2.28; Zettlr Bielefeld Light 2.52; Zettlr Bordeaux Light 2.28; Zettlr Frankfurt Light 2.28; Zettlr Karl-Marx-Stadt Light 2.28

## CI-pink-pop: quick switcher type icon type-pink on popover (3:1) (min 3)
  fail 0/28; worst 3.40 on Zettlr Bordeaux Dark (fg #cb4c81 bg #282832, Lc -29.13); apca<45 while wcag ok: 0

## CI-pink-acc: quick switcher type icon type-pink on selected accent row (3:1) (min 3)
  fail 5/28; worst 2.65 on Zettlr Bordeaux Light (fg #ca487d bg #c8c8c8, Lc 38.16); apca<45 while wcag ok: 0
  FAIL: Zettlr Berlin Light 2.71; Zettlr Bielefeld Light 2.71; Zettlr Bordeaux Light 2.65; Zettlr Frankfurt Light 2.71; Zettlr Karl-Marx-Stadt Light 2.71

## CI-gray-pop: quick switcher type icon type-gray on popover (3:1) (min 3)
  fail 0/28; worst 4.51 on Sakura (fg #735f6c bg #eedede, Lc 61.98); apca<45 while wcag ok: 0

## CI-gray-acc: quick switcher type icon type-gray on selected accent row (3:1) (min 3)
  fail 0/28; worst 3.02 on Zettlr Berlin Light (fg #6e6e77 bg #c8c8c8, Lc 43.15); apca<45 while wcag ok: 0

## MA1: mod run status success text on popover (12px) (min 4.5)
  fail 1/28; worst 4.07 on Sakura (fg #3e7751 bg #eedede, Lc 58.87); apca<45 while wcag ok: 0
  FAIL: Sakura 4.07

## MA2: mod run status muted-fg on popover (min 4.5)
  fail 0/28; worst 4.51 on Sakura (fg #735f6c bg #eedede, Lc 61.98); apca<45 while wcag ok: 7
  APCA: KokoBrain Default 4.52/Lc-43.63; Twilight Violet 5.32/Lc-40.06; Zettlr Berlin Dark 4.67/Lc-39.83; Zettlr Bielefeld Dark 4.67/Lc-39.83; Zettlr Bordeaux Dark 4.55/Lc-38.82; Zettlr Frankfurt Dark 4.67/Lc-39.83; Zettlr Karl-Marx-Stadt Dark 4.67/Lc-39.83

## MA3: mod run log foreground on bg-muted/50 over popover (min 4.5)
  fail 0/28; worst 6.56 on Zettlr Bordeaux Dark (fg #c8c8c8 bg #3c3c41, Lc -64.67); apca<45 while wcag ok: 0

## MA4: mod progress fill primary vs muted track (3:1) (min 3)
  fail 3/28; worst 2.58 on Zettlr Frankfurt Dark (fg #5e97c7 bg #505050, Lc -28.37); apca<45 while wcag ok: 0
  FAIL: Zettlr Berlin Dark 2.96; Zettlr Frankfurt Dark 2.58; Zettlr Karl-Marx-Stadt Dark 2.60

## MD1: mod dialog textarea text-foreground/80 on input-bg (min 4.5)
  fail 0/28; worst 4.70 on Zettlr Berlin Light (fg #73737b bg #ffffff, Lc 72.67); apca<45 while wcag ok: 0

## MD2: mod dialog textarea placeholder muted-fg on input-bg (min 4.5)
  fail 0/28; worst 4.51 on Twilight Violet (fg #908aa4 bg #282630, Lc -37.97); apca<45 while wcag ok: 7
  APCA: KokoBrain Default 4.62/Lc-44.07; Twilight Violet 4.51/Lc-37.97; Zettlr Berlin Dark 4.53/Lc-39.39; Zettlr Bielefeld Dark 4.53/Lc-39.39; Zettlr Bordeaux Dark 4.68/Lc-38.98; Zettlr Frankfurt Dark 4.53/Lc-39.39; Zettlr Karl-Marx-Stadt Dark 4.53/Lc-39.39

## D1: dialog description muted-foreground on popover (min 4.5)
  fail 0/28; worst 4.51 on Sakura (fg #735f6c bg #eedede, Lc 61.98); apca<45 while wcag ok: 7
  APCA: KokoBrain Default 4.52/Lc-43.63; Twilight Violet 5.32/Lc-40.06; Zettlr Berlin Dark 4.67/Lc-39.83; Zettlr Bielefeld Dark 4.67/Lc-39.83; Zettlr Bordeaux Dark 4.55/Lc-38.82; Zettlr Frankfurt Dark 4.67/Lc-39.83; Zettlr Karl-Marx-Stadt Dark 4.67/Lc-39.83

## D2: dialog close X icon popover-foreground at opacity .7 on popover (3:1) (min 3)
  fail 0/28; worst 3.69 on Zettlr Berlin Light (fg #85858c bg #ffffff, Lc 64.25); apca<45 while wcag ok: 0

## D3: focus ring (ring-2 ring-ring) vs popover (3:1) (min 3)
  fail 0/28; worst 3.73 on Sakura (fg #bd4776 bg #eedede, Lc 55.56); apca<45 while wcag ok: 0

## D3b: focus ring vs background (3:1) (min 3)
  fail 0/28; worst 4.08 on Shimmering Focus Light (fg #108189 bg #eff0f5, Lc 62.95); apca<45 while wcag ok: 0

## D3c: focus ring vs editor-bg (min 3)
  fail 0/28; worst 4.52 on Shimmering Focus Light (fg #108189 bg #fbfcfd, Lc 69.90); apca<45 while wcag ok: 0

## BTN1: destructive Button: text-white on destructive (light) / destructive/60 over settings-dialog-bg (html.dark) (min 4.5)
  fail 3/28; worst 4.13 on Tolaria Light (fg #ffffff bg #e53e3e, Lc -72.47); apca<45 while wcag ok: 0
  FAIL: Shimmering Focus Light 4.20; Tolaria Light 4.13; Willemstad Light 4.20

## BTN1b: destructive Button on popover dialog (Stop, dark /60 over popover) (min 4.5)
  fail 4/28; worst 4.13 on Tolaria Light (fg #ffffff bg #e53e3e, Lc -72.47); apca<45 while wcag ok: 0
  FAIL: Graphite Violet 4.47; Shimmering Focus Light 4.20; Tolaria Light 4.13; Willemstad Light 4.20

## BTN2: destructive Button hover /90 (light: over popover) (min 4.5)
  fail 4/28; worst 3.67 on Tolaria Light (fg #ffffff bg #e85151, Lc -68.73); apca<45 while wcag ok: 0
  FAIL: Lavender Haze 4.38; Shimmering Focus Light 3.80; Tolaria Light 3.67; Willemstad Light 3.78

## BTN3: default Button primary-foreground on primary (min 4.5)
  fail 0/28; worst 4.51 on Zettlr Berlin Light (fg #030305 bg #12865e, Lc 32.82); apca<45 while wcag ok: 5
  APCA: Twilight Violet 4.95/Lc39.38; Willemstad Dark 4.51/Lc33.38; Zettlr Berlin Light 4.51/Lc32.82; Zettlr Frankfurt Dark 4.54/Lc40.79; Zettlr Karl-Marx-Stadt Dark 4.56/Lc41.49

## BTN4: secondary Button secondary-foreground on secondary (min 4.5)
  fail 0/28; worst 4.82 on Zettlr Bordeaux Dark (fg #c8c8c8 bg #505050, Lc -58.03); apca<45 while wcag ok: 0

## FH1: diff insert: success on success/15 over popover (14px mono) (min 4.5)
  fail 11/28; worst 3.41 on Sakura (fg #3e7751 bg #d4cfc9, Lc 48.71); apca<45 while wcag ok: 0
  FAIL: Cool Mist 4.29; Graphite Violet 3.83; Mint Linen 4.31; Sakura 3.41; Shimmering Focus Light 4.11; Tolaria Light 4.05; Willemstad Light 4.26; Zettlr Berlin Light 4.07; Zettlr Bordeaux Light 4.07; Zettlr Frankfurt Light 4.07; Zettlr Karl-Marx-Stadt Light 4.07

## FH2: diff delete: destructive on destructive/15 over popover (min 4.5)
  fail 21/28; worst 2.67 on Zettlr Bordeaux Dark (fg #d3322f bg #422a32, Lc -23.75); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 2.73; Lavender Haze 4.09; Graphite Violet 3.31; Ink Night 4.35; Sakura 3.24; Shimmering Focus Dark 3.75; Shimmering Focus Light 3.30; Tolaria Light 3.36; Twilight Violet 3.88; Willemstad Dark 4.36; Willemstad Light 3.39; Zettlr Berlin Dark 2.74; Zettlr Berlin Light 4.36; Zettlr Bielefeld Dark 2.74; Zettlr Bielefeld Light 4.36; Zettlr Bordeaux Dark 2.67; Zettlr Bordeaux Light 4.18; Zettlr Frankfurt Dark 2.74; Zettlr Frankfurt Light 4.36; Zettlr Karl-Marx-Stadt Dark 2.74; Zettlr Karl-Marx-Stadt Light 4.36

## FH3: diff line numbers muted-fg on success/15 tint (min 4.5)
  fail 17/28; worst 3.31 on KokoBrain Default (fg #95a0b9 bg #36504e, Lc -37.14); apca<45 while wcag ok: 1
  FAIL: KokoBrain Default 3.31; Deep Ocean 4.04; Graphite Violet 3.54; Ink Night 4.23; Sakura 3.77; Tolaria Light 4.07; Twilight Violet 4.08; Zettlr Berlin Dark 3.60; Zettlr Berlin Light 4.15; Zettlr Bielefeld Dark 3.60; Zettlr Bielefeld Light 4.11; Zettlr Bordeaux Dark 3.51; Zettlr Bordeaux Light 4.15; Zettlr Frankfurt Dark 3.60; Zettlr Frankfurt Light 4.15; Zettlr Karl-Marx-Stadt Dark 3.60; Zettlr Karl-Marx-Stadt Light 4.15
  APCA: Willemstad Dark 4.65/Lc-41.83

## FH4: diff line numbers muted-fg on destructive/15 tint (min 4.5)
  fail 15/28; worst 3.68 on Sakura (fg #735f6c bg #e9c4c6, Lc 50.23); apca<45 while wcag ok: 3
  FAIL: KokoBrain Default 4.09; Graphite Violet 3.70; Sakura 3.68; Tolaria Light 4.03; Twilight Violet 4.47; Zettlr Berlin Dark 4.12; Zettlr Berlin Light 3.98; Zettlr Bielefeld Dark 4.12; Zettlr Bielefeld Light 3.98; Zettlr Bordeaux Dark 4.10; Zettlr Bordeaux Light 3.97; Zettlr Frankfurt Dark 4.12; Zettlr Frankfurt Light 3.98; Zettlr Karl-Marx-Stadt Dark 4.12; Zettlr Karl-Marx-Stadt Light 3.98
  APCA: Deep Ocean 4.54/Lc-44.00; Ink Night 4.57/Lc-44.58; Willemstad Dark 5.22/Lc-43.38

## FH5: file history header muted-fg on muted/50 over popover (12px) (min 4.5)
  fail 11/28; worst 3.42 on Zettlr Bordeaux Dark (fg #8f8f98 bg #3c3c41, Lc -33.80); apca<45 while wcag ok: 1
  FAIL: Sakura 4.38; Zettlr Berlin Dark 3.51; Zettlr Berlin Light 4.33; Zettlr Bielefeld Dark 3.51; Zettlr Bielefeld Light 4.33; Zettlr Bordeaux Dark 3.42; Zettlr Bordeaux Light 4.33; Zettlr Frankfurt Dark 3.51; Zettlr Frankfurt Light 4.33; Zettlr Karl-Marx-Stadt Dark 3.51; Zettlr Karl-Marx-Stadt Light 4.33
  APCA: Twilight Violet 4.61/Lc-38.25

## FH6: file history header mono timestamp opacity-50 on muted/50 (min 4.5)
  fail 28/28; worst 1.65 on Zettlr Bordeaux Dark (fg #5c5c65 bg #3c3c41, Lc -10.54); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 2.50; Lavender Haze 1.80; Cool Mist 1.99; Deep Ocean 2.45; Foolscap 1.88; Graphite Violet 2.27; Ink Night 2.49; Lumen Contrast 2.18; Mint Linen 1.94; Sakura 1.88; Sepia 1.92; Shimmering Focus Dark 2.68; Shimmering Focus Light 2.32; Tolaria Dark 2.78; Tolaria Light 1.83; Twilight Violet 1.98; Willemstad Dark 2.50; Willemstad Light 2.66; Zettlr Berlin Dark 1.67; Zettlr Berlin Light 1.72; Zettlr Bielefeld Dark 1.67; Zettlr Bielefeld Light 1.72; Zettlr Bordeaux Dark 1.65; Zettlr Bordeaux Light 1.72; Zettlr Frankfurt Dark 1.67; Zettlr Frankfurt Light 1.72; Zettlr Karl-Marx-Stadt Dark 1.67; Zettlr Karl-Marx-Stadt Light 1.72

## FH7: snapshot list selected row: muted-fg on accent (12px) (min 4.5)
  fail 11/28; worst 3.02 on Zettlr Berlin Light (fg #6e6e77 bg #c8c8c8, Lc 43.15); apca<45 while wcag ok: 6
  FAIL: Lavender Haze 4.20; Graphite Violet 3.70; Sakura 4.26; Sepia 4.13; Tolaria Light 4.43; Twilight Violet 3.87; Zettlr Berlin Light 3.02; Zettlr Bielefeld Light 3.02; Zettlr Bordeaux Light 3.02; Zettlr Frankfurt Light 3.02; Zettlr Karl-Marx-Stadt Light 3.02
  APCA: Deep Ocean 4.50/Lc-43.66; Zettlr Berlin Dark 4.67/Lc-39.83; Zettlr Bielefeld Dark 4.67/Lc-39.83; Zettlr Bordeaux Dark 4.55/Lc-38.82; Zettlr Frankfurt Dark 4.67/Lc-39.83; Zettlr Karl-Marx-Stadt Dark 4.67/Lc-39.83

## NA1: action bar type label/idle icons tab-text-inactive on editor-bg (min 4.5)
  fail 0/28; worst 4.52 on Zettlr Bielefeld Light (fg #6e6e77 bg #f3f3e8, Lc 67.30); apca<45 while wcag ok: 5
  APCA: Zettlr Berlin Dark 4.53/Lc-39.39; Zettlr Bielefeld Dark 4.53/Lc-39.39; Zettlr Bordeaux Dark 4.68/Lc-38.98; Zettlr Frankfurt Dark 4.53/Lc-39.39; Zettlr Karl-Marx-Stadt Dark 4.53/Lc-39.39

## NA2: action bar icon hover: editor-fg on muted (min 4.5)
  fail 0/28; worst 4.82 on Zettlr Bordeaux Dark (fg #c8c8c8 bg #505050, Lc -58.03); apca<45 while wcag ok: 0

## NA3: action bar favorite star type-yellow on editor-bg (3:1) (min 3)
  fail 0/28; worst 3.71 on Zettlr Bordeaux Light (fg #a57f00 bg #fffff8, Lc 64.29); apca<45 while wcag ok: 0

## NA4: action bar organized circle type-green on editor-bg (3:1) (min 3)
  fail 0/28; worst 3.73 on Tolaria Light (fg #2a965f bg #ffffff, Lc 64.50); apca<45 while wcag ok: 0

## NA5: action bar organized check stroke editor-bg on type-green fill (3:1) (min 3)
  fail 0/28; worst 3.73 on Tolaria Light (fg #ffffff bg #2a965f, Lc -70.00); apca<45 while wcag ok: 0

## NA6: action bar idle icon vs pressed icon: tab-text-inactive vs editor-fg ratio (info) (min 1)
  fail 0/28; worst 1.25 on Shimmering Focus Dark (fg #b0b3c4 bg #c3c8df, Lc 9.34); apca<45 while wcag ok: 0

## RP1: rail popover row text-tab-text-active on popover (12px) (min 4.5)
  fail 0/28; worst 6.94 on KokoBrain Default (fg #bac5ee bg #333745, Lc -65.09); apca<45 while wcag ok: 0

## RP2: rail popover sort-dir icon tab-text-inactive on popover (3:1 icon) (min 3)
  fail 0/28; worst 4.55 on Zettlr Bordeaux Dark (fg #8f8f98 bg #282832, Lc -38.82); apca<45 while wcag ok: 0

## RP3: rail popover active row tab-text-active on hover file-explorer-accent over popover (min 4.5)
  fail 0/28; worst 4.76 on Zettlr Berlin Light (fg #50505a bg #c8c8c8, Lc 55.89); apca<45 while wcag ok: 0

## RP4: rail popover popover-foreground on hover file-explorer-accent (min 4.5)
  fail 0/28; worst 4.76 on Zettlr Berlin Light (fg #50505a bg #c8c8c8, Lc 55.89); apca<45 while wcag ok: 0

## RP5: rail popover section label (11px) file-explorer-muted-fg on popover (min 4.5)
  fail 1/28; worst 3.71 on KokoBrain Default (fg #8490ad bg #333745, Lc -35.48); apca<45 while wcag ok: 6
  FAIL: KokoBrain Default 3.71
  APCA: Twilight Violet 5.73/Lc-42.92; Zettlr Berlin Dark 4.67/Lc-39.83; Zettlr Bielefeld Dark 4.67/Lc-39.83; Zettlr Bordeaux Dark 4.55/Lc-38.82; Zettlr Frankfurt Dark 4.67/Lc-39.83; Zettlr Karl-Marx-Stadt Dark 4.67/Lc-39.83

## RP6: rail popover tab-text-inactive on hover accent (icon 3:1) (min 3)
  fail 0/28; worst 3.02 on Zettlr Berlin Light (fg #6e6e77 bg #c8c8c8, Lc 43.15); apca<45 while wcag ok: 0

## RP7: archived toggle idle icon tab-text-inactive (on list-bg? hover accent) -- skip (min 3)
  fail 0/28; worst 4.32 on Zettlr Bielefeld Light (fg #6e6e77 bg #edede8, Lc 64.01); apca<45 while wcag ok: 0

## S1: search snippet <mark>: file-explorer-muted-fg on lp-highlight-bg over list-bg (12px) (min 4.5)
  fail 14/28; worst 1.61 on Zettlr Berlin Dark (fg #91919a bg #737313, Lc -15.48); apca<45 while wcag ok: 1
  FAIL: KokoBrain Default 2.43; Lavender Haze 3.63; Deep Ocean 4.01; Foolscap 4.36; Graphite Violet 3.46; Ink Night 4.37; Sakura 4.08; Tolaria Light 4.40; Twilight Violet 2.72; Willemstad Dark 2.65; Zettlr Berlin Dark 1.61; Zettlr Bielefeld Dark 1.61; Zettlr Frankfurt Dark 1.61; Zettlr Karl-Marx-Stadt Dark 1.61
  APCA: Zettlr Bordeaux Dark 6.55/Lc-42.43

## S1h: search snippet <mark> on hover row (accent/60 over list-bg, then highlight) (min 4.5)
  fail 22/28; worst 1.53 on Zettlr Berlin Dark (fg #91919a bg #76761a, Lc -14.18); apca<45 while wcag ok: 1
  FAIL: KokoBrain Default 2.44; Lavender Haze 3.35; Deep Ocean 3.15; Foolscap 4.20; Graphite Violet 2.68; Ink Night 3.51; Mint Linen 4.31; Sakura 3.70; Sepia 4.34; Shimmering Focus Dark 4.01; Tolaria Light 4.23; Twilight Violet 2.53; Willemstad Dark 2.63; Zettlr Berlin Dark 1.53; Zettlr Berlin Light 4.09; Zettlr Bielefeld Dark 1.53; Zettlr Bielefeld Light 4.37; Zettlr Bordeaux Light 4.09; Zettlr Frankfurt Dark 1.53; Zettlr Frankfurt Light 4.09; Zettlr Karl-Marx-Stadt Dark 1.53; Zettlr Karl-Marx-Stadt Light 4.09
  APCA: Zettlr Bordeaux Dark 6.55/Lc-42.43

## S1c: search snippet plain text muted-fg on list-bg (min 4.5)
  fail 0/28; worst 4.51 on KokoBrain Default (fg #8490ad bg #262938, Lc -38.80); apca<45 while wcag ok: 7
  APCA: KokoBrain Default 4.51/Lc-38.80; Twilight Violet 4.60/Lc-40.06; Zettlr Berlin Dark 5.34/Lc-41.60; Zettlr Bielefeld Dark 5.34/Lc-41.60; Zettlr Bordeaux Dark 5.20/Lc-40.59; Zettlr Frankfurt Dark 5.34/Lc-41.60; Zettlr Karl-Marx-Stadt Dark 5.34/Lc-41.60

## S1d: search snippet plain text muted-fg on hover row (min 4.5)
  fail 7/28; worst 3.68 on Zettlr Bordeaux Light (fg #6e6e77 bg #dcdcdb, Lc 54.34); apca<45 while wcag ok: 6
  FAIL: Lavender Haze 4.26; Twilight Violet 4.20; Zettlr Berlin Light 3.68; Zettlr Bielefeld Light 3.83; Zettlr Bordeaux Light 3.68; Zettlr Frankfurt Light 3.68; Zettlr Karl-Marx-Stadt Light 3.68
  APCA: KokoBrain Default 4.55/Lc-38.88; Zettlr Berlin Dark 4.94/Lc-40.61; Zettlr Bielefeld Dark 4.94/Lc-40.61; Zettlr Bordeaux Dark 4.81/Lc-39.60; Zettlr Frankfurt Dark 4.94/Lc-40.61; Zettlr Karl-Marx-Stadt Dark 4.94/Lc-40.61

## S1e: what-if: file-explorer-fg on lp-highlight-bg over list-bg (min 4.5)
  fail 4/28; worst 4.42 on Zettlr Berlin Dark (fg #f0f0f0 bg #737313, Lc -70.09); apca<45 while wcag ok: 0
  FAIL: Zettlr Berlin Dark 4.42; Zettlr Bielefeld Dark 4.42; Zettlr Frankfurt Dark 4.42; Zettlr Karl-Marx-Stadt Dark 4.42

## S2: search § heading file-explorer-primary on list-bg (min 4.5)
  fail 7/28; worst 3.97 on Twilight Violet (fg #9a7bb9 bg #2c2a34, Lc -34.52); apca<45 while wcag ok: 2
  FAIL: Sakura 4.33; Shimmering Focus Light 4.30; Twilight Violet 3.97; Willemstad Dark 4.18; Zettlr Berlin Light 4.38; Zettlr Bielefeld Light 4.33; Zettlr Bordeaux Light 4.47
  APCA: Zettlr Frankfurt Dark 5.34/Lc-41.79; Zettlr Karl-Marx-Stadt Dark 5.37/Lc-42.52

## S2h: search § heading primary on hover row (min 4.5)
  fail 11/28; worst 3.33 on Zettlr Berlin Light (fg #12865e bg #dcdcdc, Lc 50.73); apca<45 while wcag ok: 2
  FAIL: Graphite Violet 4.50; Sakura 3.83; Sepia 4.47; Shimmering Focus Light 3.72; Twilight Violet 3.63; Willemstad Dark 4.11; Zettlr Berlin Light 3.33; Zettlr Bielefeld Light 3.51; Zettlr Bordeaux Light 3.41; Zettlr Frankfurt Light 3.61; Zettlr Karl-Marx-Stadt Light 3.44
  APCA: Zettlr Frankfurt Dark 4.94/Lc-40.81; Zettlr Karl-Marx-Stadt Dark 4.97/Lc-41.53

## S3: search Both badge primary on primary/15 over list-bg (11px) (min 4.5)
  fail 14/28; worst 3.25 on Twilight Violet (fg #9a7bb9 bg #3d3648, Lc -30.98); apca<45 while wcag ok: 1
  FAIL: Cool Mist 4.27; Sakura 3.57; Sepia 4.37; Shimmering Focus Light 3.55; Tolaria Light 4.03; Twilight Violet 3.25; Willemstad Dark 3.57; Zettlr Berlin Light 3.61; Zettlr Bielefeld Light 3.61; Zettlr Bordeaux Light 3.68; Zettlr Frankfurt Dark 4.29; Zettlr Frankfurt Light 3.89; Zettlr Karl-Marx-Stadt Dark 4.36; Zettlr Karl-Marx-Stadt Light 3.61
  APCA: Zettlr Berlin Dark 4.87/Lc-44.62

## S3b: search Semantic badge search-semantic-fg on search-semantic-bg over list-bg (min 4.5)
  fail 14/28; worst 3.27 on Twilight Violet (fg #9a7bb9 bg #3c3648, Lc -31.05); apca<45 while wcag ok: 1
  FAIL: Cool Mist 4.28; Sakura 3.57; Sepia 4.37; Shimmering Focus Light 3.56; Tolaria Light 4.04; Twilight Violet 3.27; Willemstad Dark 3.57; Zettlr Berlin Light 3.62; Zettlr Bielefeld Light 3.62; Zettlr Bordeaux Light 3.69; Zettlr Frankfurt Dark 4.29; Zettlr Frankfurt Light 3.89; Zettlr Karl-Marx-Stadt Dark 4.37; Zettlr Karl-Marx-Stadt Light 3.61
  APCA: Zettlr Berlin Dark 4.88/Lc-44.62

## S3c: search Text badge muted-fg on muted (min 4.5)
  fail 14/28; worst 2.52 on Zettlr Bordeaux Dark (fg #8f8f98 bg #505050, Lc -27.16); apca<45 while wcag ok: 1
  FAIL: Lavender Haze 3.68; Sakura 4.26; Tolaria Light 4.15; Twilight Violet 4.16; Zettlr Berlin Dark 2.58; Zettlr Berlin Light 3.68; Zettlr Bielefeld Dark 2.58; Zettlr Bielefeld Light 4.03; Zettlr Bordeaux Dark 2.52; Zettlr Bordeaux Light 3.68; Zettlr Frankfurt Dark 2.58; Zettlr Frankfurt Light 3.68; Zettlr Karl-Marx-Stadt Dark 2.58; Zettlr Karl-Marx-Stadt Light 3.68
  APCA: KokoBrain Default 4.60/Lc-39.07

## S4: search input placeholder file-explorer-muted-fg on background (min 4.5)
  fail 0/28; worst 4.58 on Tolaria Light (fg #71706d bg #f7f6f3, Lc 68.93); apca<45 while wcag ok: 7
  APCA: KokoBrain Default 4.93/Lc-40.03; Twilight Violet 5.24/Lc-41.86; Zettlr Berlin Dark 5.34/Lc-41.60; Zettlr Bielefeld Dark 5.34/Lc-41.60; Zettlr Bordeaux Dark 5.20/Lc-40.59; Zettlr Frankfurt Dark 5.34/Lc-41.60; Zettlr Karl-Marx-Stadt Dark 5.34/Lc-41.60

## S4b: search input text file-explorer-fg on background (min 4.5)
  fail 0/28; worst 7.31 on Zettlr Berlin Light (fg #50505a bg #f5f5f5, Lc 81.68); apca<45 while wcag ok: 0

## S5: mode toggle inactive: file-explorer-muted-fg on muted (11px) (min 4.5)
  fail 14/28; worst 2.52 on Zettlr Bordeaux Dark (fg #8f8f98 bg #505050, Lc -27.16); apca<45 while wcag ok: 1
  FAIL: Lavender Haze 3.68; Sakura 4.26; Tolaria Light 4.15; Twilight Violet 4.16; Zettlr Berlin Dark 2.58; Zettlr Berlin Light 3.68; Zettlr Bielefeld Dark 2.58; Zettlr Bielefeld Light 4.03; Zettlr Bordeaux Dark 2.52; Zettlr Bordeaux Light 3.68; Zettlr Frankfurt Dark 2.58; Zettlr Frankfurt Light 3.68; Zettlr Karl-Marx-Stadt Dark 2.58; Zettlr Karl-Marx-Stadt Light 3.68
  APCA: KokoBrain Default 4.60/Lc-39.07

## S5b: mode toggle active: file-explorer-fg on background (min 4.5)
  fail 0/28; worst 7.31 on Zettlr Berlin Light (fg #50505a bg #f5f5f5, Lc 81.68); apca<45 while wcag ok: 0

## S5c: mode toggle selected segment bg-background vs muted track (3:1 indicator) (min 3)
  fail 28/28; worst 1.00 on Shimmering Focus Light (fg #eff0f5 bg #eff0f5, Lc 0.00); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 1.07; Lavender Haze 1.34; Cool Mist 1.06; Deep Ocean 1.30; Foolscap 1.07; Graphite Violet 1.40; Ink Night 1.28; Lumen Contrast 1.11; Mint Linen 1.07; Sakura 1.28; Sepia 1.12; Shimmering Focus Dark 1.20; Shimmering Focus Light 1.00; Tolaria Dark 1.26; Tolaria Light 1.10; Twilight Violet 1.26; Willemstad Dark 1.04; Willemstad Light 1.06; Zettlr Berlin Dark 2.07; Zettlr Berlin Light 1.26; Zettlr Bielefeld Dark 2.07; Zettlr Bielefeld Light 1.26; Zettlr Bordeaux Dark 2.07; Zettlr Bordeaux Light 1.26; Zettlr Frankfurt Dark 2.07; Zettlr Frankfurt Light 1.26; Zettlr Karl-Marx-Stadt Dark 2.07; Zettlr Karl-Marx-Stadt Light 1.26

## S6: fuzzy toggle on: primary on primary/20 over background (11px) (min 4.5)
  fail 19/28; worst 3.18 on Shimmering Focus Light (fg #108189 bg #c2dadf, Lc 47.62); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 4.48; Cool Mist 3.83; Foolscap 4.20; Graphite Violet 4.26; Mint Linen 4.28; Sakura 3.46; Sepia 3.87; Shimmering Focus Light 3.18; Tolaria Light 3.61; Twilight Violet 3.42; Willemstad Dark 3.35; Zettlr Berlin Dark 4.44; Zettlr Berlin Light 3.25; Zettlr Bielefeld Light 3.61; Zettlr Bordeaux Light 3.32; Zettlr Frankfurt Dark 3.94; Zettlr Frankfurt Light 3.49; Zettlr Karl-Marx-Stadt Dark 4.02; Zettlr Karl-Marx-Stadt Light 3.21

## S6b: fuzzy toggle off: muted-fg on background (min 4.5)
  fail 0/28; worst 4.58 on Tolaria Light (fg #71706d bg #f7f6f3, Lc 68.93); apca<45 while wcag ok: 7
  APCA: KokoBrain Default 4.93/Lc-40.03; Twilight Violet 5.24/Lc-41.86; Zettlr Berlin Dark 5.34/Lc-41.60; Zettlr Bielefeld Dark 5.34/Lc-41.60; Zettlr Bordeaux Dark 5.20/Lc-40.59; Zettlr Frankfurt Dark 5.34/Lc-41.60; Zettlr Karl-Marx-Stadt Dark 5.34/Lc-41.60

## S7: search note link primary on list-bg (12px underlined) (min 4.5)
  fail 7/28; worst 3.97 on Twilight Violet (fg #9a7bb9 bg #2c2a34, Lc -34.52); apca<45 while wcag ok: 2
  FAIL: Sakura 4.33; Shimmering Focus Light 4.30; Twilight Violet 3.97; Willemstad Dark 4.18; Zettlr Berlin Light 4.38; Zettlr Bielefeld Light 4.33; Zettlr Bordeaux Light 4.47
  APCA: Zettlr Frankfurt Dark 5.34/Lc-41.79; Zettlr Karl-Marx-Stadt Dark 5.37/Lc-42.52

## S8: search input border vs list-bg (3:1) (min 3)
  fail 28/28; worst 1.01 on KokoBrain Default (fg #242835 bg #262938, Lc 0.00); apca<45 while wcag ok: 0
  FAIL: KokoBrain Default 1.01; Lavender Haze 1.25; Cool Mist 1.24; Deep Ocean 1.43; Foolscap 1.24; Graphite Violet 1.42; Ink Night 1.46; Lumen Contrast 1.65; Mint Linen 1.20; Sakura 1.23; Sepia 1.34; Shimmering Focus Dark 1.20; Shimmering Focus Light 1.27; Tolaria Dark 1.39; Tolaria Light 1.17; Twilight Violet 1.10; Willemstad Dark 1.36; Willemstad Light 1.73; Zettlr Berlin Dark 2.07; Zettlr Berlin Light 1.31; Zettlr Bielefeld Dark 2.07; Zettlr Bielefeld Light 1.17; Zettlr Bordeaux Dark 2.07; Zettlr Bordeaux Light 1.31; Zettlr Frankfurt Dark 2.07; Zettlr Frankfurt Light 1.31; Zettlr Karl-Marx-Stadt Dark 2.07; Zettlr Karl-Marx-Stadt Light 1.31

## S9: search result icon file-explorer-muted-fg on list-bg 3:1 (min 3)
  fail 0/28; worst 4.51 on KokoBrain Default (fg #8490ad bg #262938, Lc -38.80); apca<45 while wcag ok: 0

## K1: wikilink suggestion selected: accent-foreground on accent (min 4.5)
  fail 0/28; worst 4.76 on Zettlr Berlin Light (fg #50505a bg #c8c8c8, Lc 55.89); apca<45 while wcag ok: 0

## K2: relationship search subtitle (11px) muted-fg on popover (min 4.5)
  fail 0/28; worst 4.51 on Sakura (fg #735f6c bg #eedede, Lc 61.98); apca<45 while wcag ok: 7
  APCA: KokoBrain Default 4.52/Lc-43.63; Twilight Violet 5.32/Lc-40.06; Zettlr Berlin Dark 4.67/Lc-39.83; Zettlr Bielefeld Dark 4.67/Lc-39.83; Zettlr Bordeaux Dark 4.55/Lc-38.82; Zettlr Frankfurt Dark 4.67/Lc-39.83; Zettlr Karl-Marx-Stadt Dark 4.67/Lc-39.83

## K3: relationship search hover:bg-accent: muted-fg on accent (min 4.5)
  fail 11/28; worst 3.02 on Zettlr Berlin Light (fg #6e6e77 bg #c8c8c8, Lc 43.15); apca<45 while wcag ok: 6
  FAIL: Lavender Haze 4.20; Graphite Violet 3.70; Sakura 4.26; Sepia 4.13; Tolaria Light 4.43; Twilight Violet 3.87; Zettlr Berlin Light 3.02; Zettlr Bielefeld Light 3.02; Zettlr Bordeaux Light 3.02; Zettlr Frankfurt Light 3.02; Zettlr Karl-Marx-Stadt Light 3.02
  APCA: Deep Ocean 4.50/Lc-43.66; Zettlr Berlin Dark 4.67/Lc-39.83; Zettlr Bielefeld Dark 4.67/Lc-39.83; Zettlr Bordeaux Dark 4.55/Lc-38.82; Zettlr Frankfurt Dark 4.67/Lc-39.83; Zettlr Karl-Marx-Stadt Dark 4.67/Lc-39.83

## K4: status bar text on destructive? skip (min 1)
  fail 0/28; worst 4.50 on KokoBrain Default (fg #7c89a8 bg #21222e, Lc -36.56); apca<45 while wcag ok: 0
```
