# Scout 10: Kanban plugin colors

Read-only audit. Scripts and raw output (measure.mts, agg.mts, detail.mts, results.json, summary.txt) are in
/private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-10-kanban/
(reuses audit-03-faded-text/lib.mts: color-tools.mts + an APCA-W3 0.0.98G implementation).

## Method

1. Read every file in src/lib/plugins/kanban (KanbanView, KanbanLane, KanbanCard, KanbanCardText, KanbanDatePicker,
   KanbanListView, KanbanTableView, KanbanWikilinkSuggestions, kanban.logic PROXIMITY_CLASSES) plus
   src/lib/utils/color-presets.ts and the shadcn context-menu sub content (bg-popover).
2. Traced the surface stack. KanbanView mounts inside EditorView's `bg-editor-bg` wrapper, text inherits `--foreground` (body).
   - editor = `--editor-bg`
   - lane = `bg-muted/30` over editor (KanbanLane.svelte:248); archive column = `bg-muted/20` over editor, archive item `bg-background/50` over that
   - plain card = `--background` (opaque, `bg-background`)
   - coloured card / list row / table row = inline `background: rgba(preset, 0.15)` (COLOR_PRESET_BG). On the card the inline shorthand replaces
     `bg-background`, so the tint sits over the LANE (card) or the EDITOR (list and table rows)
   - tag chip = rgba(preset, .15) over whatever the card or row shows; text = oklab mix of preset 30% with `--editor-fg` (70% toward fg)
   - proximity badge = token at 15% over the card or row (`bg-X/15`), or opaque `--muted` for future/none
   - popovers (date picker, wikilink suggestions, context-menu swatches) = `--popover`
3. For all 28 themes: flatten fg over bg, WCAG 2 ratio and APCA Lc. Thresholds 4.5 text, 3 for meaningful non-text.
   Tailwind `/N` modifiers composited as alpha over the surface (matches color-mix with transparent). Tag chip mix via mixColors (OKLab).
   Light = 15 themes, dark = 13.
4. Measured 335 cases (card text, checked text, linked preview, wikilink, tag chips for 7 tag colors x 7 card colors x card/list/table,
   5 proximity tones x card/list/row x 7 colors, lane count and title, empty text, icons, checkbox, focus ring, drop indicator,
   toolbar, inputs, archive, list header, table header/status/hover, calendar popover, swatches, suggestion list).

## Passed (no failure on any of 28 themes)

- Card text `--foreground` on plain card (0 fails) and on every colour tint (worst 5.60 Zettlr Bielefeld Light, red).
- Checked card text, linked preview, and `text-primary` wikilinks on a PLAIN card pass except where listed below (checked/preview: 0 fails; wikilink: 5 themes).
- Lane title `--foreground` on lane, list header title, list row text, table header/lane column on plain editor (pass in all 28; muted-foreground near-miss in a few themes, see finding 13).
- Focus ring `ring-primary` vs lane and vs card: >= 3:1 in all 28 (KanbanCard.svelte:203). Drop indicator `bg-primary` vs lane: >= 3:1 in all 28.
- Checked checkbox: `--primary` fill vs card >= 3:1 and checkmark `--primary-foreground` on `--primary` >= 3:1 in all 28.
- Toolbar view-mode icons: active `text-primary` on `bg-primary/10` and inactive `text-muted-foreground` on editor >= 3:1 in all 28.
- Auto-complete lane icon `text-success` on lane >= 3:1; lane chevron `text-muted-foreground` >= 3:1.
- Proximity left border colors vs lane: >= 3:1 on all 15 light themes; fails only on 5 Zettlr dark themes (worst 2.57), but the badge repeats the information, so not reported.
- Tag chip text (Issue 39 fix) still holds on both built-in themes (min 4.96 Lavender Haze, 5.90 KokoBrain Default) over plain and all 7 coloured cards. It does NOT hold on Zettlr themes, see finding 11.
- Table row hover (`hover:bg-muted/20`) never applies on coloured rows (inline background wins), so no extra stack there.

## Findings (details in the structured result)

1. Proximity badges overdue/today/tomorrow/upcoming, token text on token/15 tint (kanban.logic.ts:752-755; rendered at KanbanCard via KanbanDatePicker.svelte:58, KanbanListView.svelte:49, KanbanTableView.svelte:75).
   Plain card: overdue 23/28 fail (worst 2.96 Willemstad Light #e93147 on #edd2d5; Lc45), today 14/28 (all light, worst 3.79 Shimmering Focus Light #896800 on #e0dcd0),
   tomorrow 16/28 (worst 2.90 Shimmering Focus Light #cc632c on #eadbd7; Lc46), upcoming 21/28 (worst 3.06 Zettlr Berlin Light #237aff on #d6e3f7).
   Built-ins: Lavender Haze 3.66 / 4.08 / 3.14 / 4.07; KokoBrain Default overdue 3.49, upcoming 4.77, tomorrow 4.91 (list row 4.26 / 4.10).
   List row (editor surface): overdue 19, today 14, tomorrow 19, upcoming 20 themes fail.
   On coloured cards it gets worse: overdue fails on 28/28 (worst 1.78 Zettlr Berlin Dark #cf413b on #644832 yellow card), upcoming 2.08, tomorrow 2.50 Lavender Haze on red card.
   Dark worst APCA Lc -22 to -30 (Zettlr dark overdue).
2. Proximity badges future/none, `bg-muted text-muted-foreground` (kanban.logic.ts:756-757): 14/28 fail on every surface (opaque bg). Worst 2.52 Zettlr Bordeaux Dark (#8f8f98 on #505050), 2.58 on the 4 other Zettlr dark, 3.68 on 5 Zettlr light, Twilight Violet 3.87,
   Tolaria Light 4.15, Lavender Haze 4.20 (built-in), Sakura 4.26. READABILITY_PAIRS tests mutedForeground on editorBg/background/card/popover only, never on `muted`.
   Applies to every card with a date more than 3 days out and every checked card with a date.
3. Coloured-card tint (COLOR_PRESET_BG 15%: KanbanCard.svelte:204, KanbanListView.svelte:33, KanbanTableView.svelte:43) lowers the contrast of secondary text that passes on a plain card:
   checked text (KanbanCard.svelte:247) and linked-note preview (:265): 18/28 themes fail on at least one colour, worst 2.87 Zettlr Berlin Dark yellow (#91919a on #514930); in light worst 3.55 Zettlr Bielefeld Light red.
   Wikilinks `text-primary` on tinted cards: 17/28 fail (worst 2.87 Zettlr Frankfurt Dark yellow, #5e97c7 on #514930), list/table 14-15 per colour.
   Table "Done" `text-success` on coloured rows: 11-15 themes per colour, worst 4.05 Zettlr Bordeaux Light red. Table lane column 13-14 themes, worst 3.33 Zettlr Berlin Dark yellow.
   Plain card with the same text passes everywhere, so the tint is the root cause.
4. Lane count at limit `font-semibold text-destructive` text-xs on lane (KanbanLane.svelte:256): 12/28 fail; worst 2.57 on 4 Zettlr dark (#cf413b on #363637), 2.61 Bordeaux Dark; built-in KokoBrain Default 3.53, Lavender Haze 4.15. Shown whenever a lane reaches its card limit.
5. Placeholders `placeholder:text-muted-foreground/50` (KanbanLane.svelte:418 add-card, KanbanView.svelte:607 filter): 28/28 fail, 1.94 Zettlr Berlin Light to 2.23 Twilight Violet; built-ins 2.10 Lavender Haze, 2.56 KokoBrain Default. Same case as scout 03 `kanban-placeholder`. The add-card input has no other label.
6. Low-opacity icons: date remove X and set-date icon `text-muted-foreground/50` (KanbanDatePicker.svelte:67,79): 27/28 fail 3:1, worst 1.94; on coloured cards the X is 1.74-1.83 Bielefeld Light and 1.80 Bordeaux Dark. Same as scout 03 `kanban-date-icons`. Lane and card drag grips at opacity-60 (KanbanLane.svelte:276, KanbanCard.svelte:273): 22 and 20 themes fail 3:1 (worst 2.20), hover-only.
7. Unchecked checkbox border `border-muted-foreground/40` (KanbanCard.svelte:214, KanbanListView.svelte:37, KanbanTableView.svelte:48): 28/28 fail 3:1; plain card 1.68 Zettlr Berlin Light, 1.88 Twilight Violet; on tinted card 1.55; built-ins 1.78 Lavender Haze, 2.09 KokoBrain Default. The border is the only drawn edge of the control.
8. Wikilink suggestion selected row `bg-accent` vs `bg-popover` (KanbanWikilinkSuggestions.svelte:85): ratio 1.00 on the 5 Zettlr dark themes (accent #282832 == popover #282832), so the keyboard-selected row is invisible; 1.06 Sakura, 1.12 Tolaria Light; all 28 under 3:1 (max 1.67). Text itself passes.
9. Card/tag colour swatches `COLOR_PRESET_TEXT` on popover (KanbanCard.svelte:311-312, 342-343): yellow 1.47 Sakura, 1.92 on 14 more light themes; green, orange, gray fail on all 15 light themes (green 1.86 Sakura); blue 3 themes, red and purple 1-2 themes. Colour is the only label (title tooltip only).
10. Date picker selected day `data-[selected]:text-primary-foreground` on `bg-primary` (KanbanDatePicker.svelte:130, same pair as every checked checkbox): passes WCAG (4.51+) but APCA Lc 33 Zettlr Berlin Light (#030305 on #12865e) and Willemstad Dark (#090909 on #567f83), Lc 39 Twilight Violet, Lc 41 Frankfurt Dark / Karl-Marx-Stadt Dark. Black on saturated mid colour, the owner's reported pattern.
11. Tag chip text (color-presets.ts:37) on Zettlr light themes: yellow chip on plain card 4.23 (#7b6d57 on #f3ebd1) x5 themes, green 4.46; on coloured cards down to 3.36 Zettlr Bielefeld Light (yellow chip on red card), 3.58 Berlin Light; Zettlr Bordeaux Dark 4.09. 273 of 1372 chip/card combos fail. Issue 39 test only runs the 2 built-in themes.
12. `text-primary` wikilinks on plain card (KanbanCardText.svelte:25): 5 themes just under 4.5: Shimmering Focus Light 4.08 (#108189 on #eff0f5), Willemstad Dark 4.18, Zettlr Berlin Light 4.19, Bordeaux Light 4.29, Karl-Marx-Stadt Light 4.32. Card surface is `--background`, but READABILITY_PAIRS and the theme repo check primary only on editorBg.
13. `text-muted-foreground` on lane `bg-muted/30` (lane count KanbanLane.svelte:256, empty text :400, list count KanbanListView.svelte:23, archive header KanbanView.svelte:707-716, table hover row): 6 themes fail 4.5, worst 3.86 on the 4 Zettlr dark (#91919a on #363637), 4.00 Bordeaux Dark, 4.25 Bielefeld Light. Passes on editor/background/card, which READABILITY_PAIRS tests.
14. Calendar popover outside-month days `text-muted-foreground/40` (KanbanDatePicker.svelte:130): 28/28 fail, 1.68 Sakura to 2.37; selectable days (not data-disabled).
15. Input borders `border-border` on filter input (KanbanView.svelte:607) and add-card input (KanbanLane.svelte:418): 1.06 to 1.22 on all 28 vs their surroundings. Standard shadcn pattern shared app-wide.

## Not reported

- Archive item text `text-muted-foreground` on bg-background/50 over archive: 1/28 at exactly 4.50 (Zettlr Bielefeld Light).
- Archive delete hover icon `text-destructive` on `bg-destructive/20`: 8 themes under 3:1 (worst 2.64 Zettlr Berlin Dark), hover-only, not reported separately (same root cause as finding 1 and 4).
- Lane/card/archive borders (decor), `border-primary/30` hover, dashed Add Lane border, lane at-limit border `border-destructive/50` (count text also shows the state).
- Calendar weekday header `text-muted-foreground` on popover: passes (min 4.55, but APCA Lc -39 on dark Zettlr).

## Could not check

- No screenshots or computed styles from the running app (no tauri dev, per rules). Everything is derived from classes and token values in theme-tokens.json.
- Tailwind `/N` and color-mix composition approximated as sRGB alpha compositing; error is under about 0.05 ratio.
- Dragging state (opacity-50 card), transition frames, and the Select.Trigger sort control (shared shadcn primitive, covered by UI scouts) were not measured.
- Whether bits-ui Calendar makes `data-outside-month` days selectable in this build (assumed yes; they are not `data-disabled`).
- Themes repo themes are taken as resolved in theme-tokens.json; I did not diff themes/*.json.
