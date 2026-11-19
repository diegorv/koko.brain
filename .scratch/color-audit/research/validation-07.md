# Validation 07 (adversarial pass on 18 scout findings)

Scripts: scratchpad/audit-validate-07/ (lib.mts, f1, f2, f6-f10, f10b, fk, f15, m1, m2). All ratios are WCAG 2 on the
flattened stack; Lc is APCA (sign: negative = light text on dark). Tailwind `x/NN` is treated as alpha NN over the
real surface. Light themes use `--nav-bg = --file-explorer-bg` (app.css:379-385), dark ones `L-0.03` (app.css:389-392).

## Verdicts

| # | key | verdict | sev | owner | my measurement |
|---|-----|---------|-----|-------|----------------|
| 1 | theme-builder.logic.ts:186 links on dark | confirmed | medium | both | Willemstad Dark all link tokens #567f83 on #070707 4.57 Lc-31 (raw palette primary 2.27); Frankfurt Dark #5e97c7 4.53 Lc-40; KMS Dark #eb6a60 4.56 Lc-40; Twilight Violet wikilink 4.53 Lc-36, link 5.46 Lc-44; Bordeaux Dark wikilink-heading 4.58 Lc-39. Also KokoBrain Default syntax-url 4.52 Lc-41, Graphite Violet wikilink-heading 4.80 Lc-43 |
| 2 | app.css:403 event chips | confirmed | low | app | Bielefeld Light cyan 4.06, green 4.10, orange 4.15, pink 4.31, blue 4.36, purple 4.40; Berlin/Frankfurt/KMS Light green 4.48 cyan 4.44; Bordeaux Light 4.46/4.43; Lc 57-64 |
| 3 | app.css:321 event pills | confirmed (duplicate of #2) | low | app | same numbers; line 321 is the lp-collection block, the mix is at app.css:403-414 |
| 4 | EventBlock.svelte:80 archived opacity-50 | confirmed | low | app | worst 1.83 Bielefeld Light (green, Lc30), Zettlr light 1.87, most light 2.1-2.2, dark 2.45-2.97 (Willemstad Dark 3.57); lock icon on cyan chip 2.50-2.63 on 5 Zettlr Light |
| 5 | EventBlock.svelte:79 ring-primary/70 | confirmed | low | app | vs editor-bg under 3 on 10: Bielefeld Light 2.69, SF Light 2.75, Willemstad Dark 2.75, Berlin Light 2.78, Sakura 2.80, Bordeaux Light 2.81, Frankfurt Light 2.90, Twilight 2.94, KMS Dark 2.95, Frankfurt Dark 2.98 |
| 6 | input.svelte:28 border-input | confirmed | medium | both | border vs setting-item-bg: Sakura 1.06, LavHaze 1.08, Default 1.09; vs popover Default 1.24; only Lumen Contrast (3.83-4.29) and Willemstad Light (3.40-3.95) pass; fill vs surface 1.00-1.32 everywhere |
| 7 | app.css:480 date input 70% | confirmed | medium | app | 3.71 on 5 Zettlr Light (Lc65), Sakura right sidebar 4.38. Same 70% on every property value: PropertyField.svelte:131/139 (3.55-3.71) |
| 8 | CalendarGrid.svelte:58 and other /40-/60 | confirmed | medium | app | out-of-month (nav-bg) 1.67-2.42, 28/28 under 3; DatePicker outside days 1.68-2.37; collection calendar 1.67-2.41; icon buttons /50 on popover 1.95-2.96 (28/28 under 3); result count /60 on editor 2.26-3.84 (19 under 3) |
| 9 | KanbanView.svelte:549 primary on tint | confirmed in part | medium | both | view toggle is an icon: 0/28 under 3:1 (refuted part). Filter pill 15/28 (Sakura 3.11, Default 3.78); fuzzy 19/28 (SF Light 3.18, Default 4.47); Both/Semantic badge 14/28 (Twilight 3.26); TOC hover 12/28 (SF Light 3.61) |
| 10 | kanban.logic.ts:752 status on tint | confirmed | high | both | overdue 23/28 (Willemstad Light 2.96, Default 3.51); tomorrow 16/28 (SF Light 2.90); upcoming 21/28; today 14/28; diff delete on popover 21/28 (Default 2.74 Lc-28, Bordeaux Dark 2.69); insert 11/28; build badges 16-21/28 (preview 2.94 Zettlr dark); error panels 15/28 (Zettlr dark 2.78, Default 3.19) |
| 11 | KanbanCard.svelte:204 coloured card | confirmed | medium | app | muted-fg worst 2.87 Zettlr dark yellow (#514930), 18/28 fail; primary wikilink 16/28 (Frankfurt Dark 2.87); foreground text passes everywhere |
| 12 | KanbanCard.svelte:214 checkbox border /40 | confirmed | medium | app | 1.68 (Tolaria Light, Zettlr light) to 2.40 (Tolaria Dark), 28/28 |
| 13 | KanbanCard.svelte:311 swatches | confirmed | low | app | yellow 1.47 Sakura, 1.92 on 14 light; green 1.86-2.43; orange 1.96-2.55; gray 2.01-2.61; blue 3 light; red/purple Sakura + Graphite Violet. Title gives a name; the selected ring (ring-foreground) is fine |
| 14 | KanbanCardText.svelte:25 wikilink on card | confirmed | low | both | SF Light 4.08, Willemstad Dark 4.18 (Lc-30), Berlin Light 4.19, Bordeaux Light 4.29, KMS Light 4.32 |
| 15 | KanbanDatePicker.svelte:130 selected day | confirmed | medium | both | WCAG passes 28/28; APCA: Berlin Light #030305 on #12865e Lc33 (white would be 4.57 / Lc-77), Willemstad Dark Lc33 (white 4.41 / Lc-76), Twilight Lc39, Frankfurt/KMS Dark Lc41. Same pair is the default Button and checked checkboxes |
| 16 | KanbanLane.svelte:256 limit count | confirmed | medium | both | 12/28: Zettlr dark 2.57 (Lc-23), Bordeaux Dark 2.61, Default 3.53, Tolaria Light 3.92, SF/Willemstad Light 3.96, Twilight 3.97, LavHaze 4.15, Sakura 4.47 |
| 17 | KanbanLane.svelte:418 placeholder /50 | confirmed | high | app | 1.94 (Tolaria Light) to 3.06 (Tolaria Dark); 27/28 under 3:1; Default 2.56, LavHaze 2.10 |
| 18 | KanbanWikilinkSuggestions.svelte:85 | confirmed | medium | both | accent vs popover 1.00 on 5 Zettlr dark, 1.01 Willemstad Dark, 1.06 Sakura, max 1.67 |

## Shared roots
- A: `readableCore` lifts primary only against editorBg to exactly 4.5 (theme-builder.logic.ts:186) and builds
  primaryFg with ensureContrast (:194). Findings 1, 14, 15, and the primary part of 9/11. Fix: APCA floor for accent
  text on dark editors (|Lc| >= 60, about 6-7:1 WCAG there), lift primary on background/card/popover too, and pick
  primaryFg black/white by APCA like `labelColors` (utils/color.ts).
- B: `lift(p.error, 3)` (theme-builder.logic.ts:187) and no destructive text pair: 10 (overdue/diff/error), 16.
- C: tinted surfaces not in READABILITY_PAIRS (text drawn on its own 10-20% tint): 9, 10, 11. Fix: derive text against the
  flattened tint (ensureContrast on the composite) or use foreground text on tints.
- D: opacity dimming of text and controls: 4, 7, 8, 12, 17. Fix: solid muted tokens, no alpha under 100% for text.
- E: event mix (app.css:403-414): 2, 3, 4.
- F: palette `selected == popoverBg` / no state pair: 18 (same as scouts 17 #1, 19 #1); `borderStrong` too close to surfaces: 6.

## Missed (next to this batch)
- Kanban tag chips (KanbanCardText.svelte:34,43; KanbanTableView.svelte:66): COLOR_PRESET_CHIP_TEXT on COLOR_PRESET_BG over the
  card's bg-background: yellow 4.23 on 5 Zettlr Light; on a coloured card (stacked tints) 3.36 Bielefeld Light, 3.57-3.58
  other Zettlr Light (yellow on red card), Bordeaux Dark 4.09. color-presets.test.ts only checks the built-in themes.
