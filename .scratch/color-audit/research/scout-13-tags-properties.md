# Scout 13: tags and properties

Read-only audit. Scripts and raw output:
/private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-13-tags-properties/
(lib.mts copied from audit-03, measure.mts, extra.mts, extra2.mts, rows.json, table.txt).

## Method

1. Enumerated consumers of tag-colors.ts and color-presets.ts (grep under src, tests excluded):
   - tag-colors.ts: TagColorDot (TagItem in TagsView), TagColorPicker, PropertyField tag icon (PropertyField.svelte:173). No other reader: the live-preview `.cm-lp-tag` pill ignores user tag colors (it is `--primary` derived, measured by scout 05), `MarkdownEditor.svelte:668` only forces a rebuild.
   - color-presets.ts outside kanban: `evaluator.ts` (`badge`, `progress`, `color` collection display helpers, documented in help/documentation/12-views.md:322-324), `kb-ui.ts:922` (card tint, scout 11 area).
   - Properties panel (PropertiesView, PropertyField, NoteInfo) and note-list pills (NoteRow.svelte).
2. Traced the surface stack for each element:
   - Tags view: `bg-editor-bg` (EditorView.svelte:68); row hover `bg-accent`.
   - Picker: `--popover` (Popover.Content).
   - Properties panel: `bg-right-sidebar-bg` (AppShell.svelte:277), list container `bg-right-sidebar-accent`, chips and inputs `bg-input-bg`.
   - Note list: `bg-list-bg` (RailNoteList.svelte:914). list-bg = file-explorer-bg on dark, `color-mix(in oklch, file-explorer-bg 50%, editor-bg)` on light (approximated with mixColors). Row states: hover `bg-primary/10`, active `bg-primary/25`; pill `bg-primary/10` composited on the row.
   - Collection display helpers: `DisplayHTML` goes through `sanitizeHtml`, which keeps `style` (sanitize.ts:20), into `CollectionTableView.svelte:84` (editor-bg) and into QueryJS/collection widgets on `--lp-collection-bg`. Both surfaces measured.
3. Every translucent color was flattened over its real surface (alpha compositing), then WCAG 2 ratio (color-tools contrastRatio) and APCA Lc (APCA-W3 0.0.98G, same implementation as scout 03). 28 themes, 15 light, 13 dark by `dark` flag. Thresholds: text 4.5, meaningful non-text 3.

## Measurements (key rows; full table in table.txt, per-theme rows in rows.json)

Format: fails/28 (light/15, dark/13), worst light, worst dark.

### Collection display helpers (evaluator.ts)
Preset PALETTE rgb values used as text on a 15% tint of themselves (badge) or on the bare surface (color). Editor-bg surface; lp-collection-bg surface gives the same shape (worst Lavender Haze).
```
badge blue    25/28 (15/10) worst Sepia 2.27, KokoBrain Default 3.54
badge green   21/28 (15/6)  worst Sepia 1.85, KokoBrain Default 4.31
badge red     27/28 (15/12) worst Sepia 2.67, Graphite Violet 3.11
badge orange  21/28 (15/6)  worst Sepia 1.93, Graphite Violet 4.13
badge purple  27/28 (15/12) worst Sepia 2.78, KokoBrain Default 2.95
badge yellow  15/28 (15/0)  worst Sepia 1.51 (Lavender Haze 1.29 on lp-coll)
badge gray    22/28 (15/7)  worst Sepia 2.00, KokoBrain Default 4.00
color() blue 17/28 (15/2) worst Sepia 2.59 ; green 15/28 Sepia 2.06 ; red 24/28 (15/9) Sepia 3.20 ;
        orange 15/28 Sepia 2.17 ; purple 25/28 (15/10) Sepia 3.25 ; yellow 15/28 Sepia 1.63 ; gray 15/28 Sepia 2.22
```
Built-in themes: Lavender Haze (light) badge blue 2.36 (Lc 40), green 1.92, red 2.77; color() yellow 1.70. KokoBrain Default (dark) badge blue 3.54, red 3.13, purple 2.95.

Candidate fix measured: `COLOR_PRESET_CHIP_TEXT` (preset 30% / editor-fg 70%, the kanban fix) on the same badges: 3 of 196 pairs below 4.5 on editor-bg (Bielefeld Light green 4.38, orange 4.41, yellow 4.14) and 10 of 196 on lp-collection-bg (Zettlr light family, yellow 4.23, green 4.46). Same mix as bare-surface `color()` text: 0 of 196 below 4.5 (worst 4.51). So reusing the chip mix fixes both, with the weight nudged up for yellow on Zettlr light themes.

progress(): `%` label is a literal `rgb(160,160,160)` (evaluator.ts:457); bar fill is the full preset on a `rgba(160,160,160,0.2)` track.
```
progress % label gray on editor-bg: 15/28 (15/0) worst Sepia 2.22 Lc40 ; on lp-coll worst Lavender Haze 1.88
bar vs surface (3:1) blue 8/28 light, green/orange/yellow/gray 15/28 light (yellow Sepia 1.63), red/purple pass on editor-bg, 3 light fails on lp-coll
bar vs its track (3:1): blue/green/orange/yellow/gray 15/28 light (yellow 1.41), red 13/28, purple 12/28
track vs surface: 28/28 (1.12-1.43), decorative, the % text states the value
```

### Note list row (NoteRow.svelte, list-bg)
```
pill text-primary on bg-primary/10, row at rest   10/28 (8/2)  worst Twilight Violet 3.48 Lc-32, Shimmering Focus Light 3.78; 4 themes under Lc 45
pill on hovered row (row bg-primary/10)           20/28 (13/7) worst Twilight Violet 3.08
pill on ACTIVE row (row bg-primary/25)            26/28 (14/12) worst Twilight Violet 2.53; 8 themes under 3:1 (Sakura 2.79, Shimmering Focus Light 2.80, Willemstad Dark 2.80, Berlin Light 2.84, Bielefeld Light 2.87, Bordeaux Light 2.88, Karl-Marx-Stadt Light 2.73); 20 themes under Lc 45
title text-primary on active row                  21/28 (13/8) worst Twilight Violet 2.82
subtitle text-muted-foreground 11px on active row 22/28 (12/10) worst Bielefeld Light 3.16, Bielefeld Dark 2.96
wikilink pill hover on active row (hover:bg-primary/20) 28/28, 16 under 3:1, worst Karl-Marx-Stadt Light 2.42 (transient)
subtitle muted on resting row                     2/28 (Twilight Violet 4.27, Bielefeld Light 4.30)
```
Built-ins: KokoBrain Default active row pill 3.20, title 3.70; Lavender Haze active pill 3.57 (Lc 45), title 4.01. At rest both pass (4.97, 4.98).

### Tag color presets (non-text, 3:1)
Presets are #fb464c, #e9973f, #e0de71, #44cf6e, #53dfdd, #a882ff (tag-colors.ts:3-8), a dark-background palette.
```
Tags view dot (size-3) on editor-bg, light themes (15): yellow 1.20-1.41, cyan 1.38-1.62, green 1.72-2.02, orange 1.99-2.34, purple 2.44-2.88, red 2.93-3.45 (Sepia 2.93 only fail). Dark themes: all >= 3.91.
Same dots on hover:bg-accent: 15/28 fail per preset on light, down to 1.03 (cyan on Berlin Light).
Property tag icon on bg-input-bg: same shape (yellow 1.15 Lavender Haze, cyan 1.32, green 1.64, orange 1.91, purple 2.34, red 2.81).
Picker swatch on popover: same shape (yellow 1.09 Sakura).
```
Picker selected state (`.color-dot.active`: `border: 2px solid var(--foreground)` while the default border is transparent and the swatch background paints under it, so the ring replaces the outer 2px of the swatch):
```
ring vs enclosed swatch on dark themes: yellow 1.07-1.33, cyan 1.03-1.52, green 1.21-1.90, orange 1.40-2.21, purple 1.72-2.71, red 2.06-3.25 (all 13 dark themes fail 3:1 for orange/yellow/green/cyan/purple)
ring vs enclosed swatch on light themes: red 2.31-6.08 (5 fail), purple 2.77-7.30 (5 fail), others pass
ring vs popover: min 7.97, passes everywhere
```
Because the swatch fill extends under the ring, the active and inactive swatches have the same outer outline; the only change is a ring color that is nearly the swatch color on dark themes.

Custom and "none" dots (TagColorPicker.svelte:60, 96, 104):
```
custom swatch with no color set: rgba(255,255,255,0.1) on popover, no border, no glyph: 1.00-1.03 on light (invisible), 1.33-1.38 on dark; 28/28
hover border rgba(255,255,255,0.5): 1.00-1.15 on all 15 light themes (invisible), 4.09-5.28 on dark
none dot: same fill, 28/28 under 3:1, but carries an X icon (muted-fg on fill 3.30+, passes), so identifiable
```

### Tags view and properties panel text
```
tags-view count (text-xs muted-foreground) at rest on editor-bg: min 4.52 pass
count on hover:bg-accent: 11/28 (9/2) worst Zettlr light family 3.02 (muted #6e6e77 on accent #c8c8c8), Twilight Violet 3.87, Graphite Violet 3.70
tags heading text-primary on editor-bg: min 4.52 pass; Hash icon, filter icon: pass
NoteInfo h2 text-title (15px semibold, not large) right-sidebar-primary on right-sidebar-bg: 7/28 (5/2) worst Shimmering Focus Light 4.08, Willemstad Dark 4.18, Sakura 4.15, Twilight Violet 4.19
NoteInfo labels and values: pass (min 4.50, 4.58)
property key muted-fg at rest: pass (4.50); on row hover (right-sidebar-accent/50): 7/28 worst Berlin Light 3.75
property type icon tab-text-inactive: pass (min 4.58)
property tag chip text fg/80 on input-bg: pass (min 4.70); tag icon muted on input-bg: pass (min 4.08)
```

## Findings (summary; structured output has the detail)
1. evaluator.ts:447-449 badge() uses the raw preset color as text on its own 15% tint: unreadable on every light theme and on most dark ones for red/purple/blue.
2. evaluator.ts:459-463 color() draws the raw preset as text on the bare surface: all presets fail on all 15 light themes (yellow 1.38-1.63).
3. NoteRow.svelte active row (108, 127, 131, 141, 152, 162): primary text and pills on `bg-primary/25`: 26/28 pill fail, 8 themes under 3:1, built-in dark 3.20.
4. NoteRow.svelte:141,152,162 pills at rest (`text-primary` 11px on `bg-primary/10`): 10/28 under 4.5.
5. tag-colors.ts:3-8 presets as dot, property icon and picker swatches on light themes: 1.03-3.45, five of six presets fail on all 15 light themes.
6. TagColorPicker.svelte:99-101 selected ring is the swatch color on dark themes (1.03-2.2).
7. TagColorPicker.svelte:60, 95-97 hard-coded white translucent fill and hover border: invisible custom-color swatch on every theme and invisible hover border on light themes.
8. evaluator.ts:455-457 progress(): label fixed `rgb(160,160,160)` 15/15 light fail; bars of five presets fail 3:1 on light.
9. NoteInfo.svelte:44 heading 7/28 at 4.08-4.32 (low).
10. TagItem.svelte:62,89 counts on hovered row 11/28 (low, hover only).

## Already covered by other scouts, re-measured here, not re-reported
- Faded text in the properties panel: add-property label `text-tab-text-inactive/60` 2.25-3.82 (28/28), list-item add placeholder `/30` 1.46 (28/28), value `text-right-sidebar-fg/70` on input-bg 6 light themes at 3.71 (scout 03: prop-add-property-label, prop-list-placeholder, prop-input-value). Same numbers.
- Tag presets on right-sidebar-bg and `IconPicker` presets (scout 04 F10, rated low). This scout measured the presets on the surfaces they actually sit on and adds the picker ring and custom swatch problems.
- `.cm-lp-tag` (editor body tag pill) is scout 05's.

## What passed
Tags view heading, counts, Hash icon and toolbar icons at rest (min 4.52); picker ring vs popover (7.97); picker X icon on none dot (3.30); property keys, type icons, list item text and tag icon (4.08-4.70); NoteInfo labels and values; note-row title at rest and archive icon at rest.

## Not checked
- Nothing was rendered; surfaces and states were traced from code. Row hover `hover:bg-primary/10` on top of an already-hovered pill is assumed (CSS group of the button). `--primary` is the theme token in the note list (no override seen).
- `list-bg` and `color-mix` values on light themes are OKLab approximations (mixColors), as in earlier scouts.
- User-chosen custom tag colors (any hex) cannot be bounded; only the six presets were measured.
- The native `<input type="checkbox">` in PropertyField (`border-input`): rendered by the OS, not measurable here.
- kb-ui.ts:922 card tint text (scout 11), kanban chips (fixed in f6ef510a0, re-checked only through the CHIP_TEXT candidate on badges).
- Dark-mode tag color presets as dots pass everywhere (>= 3.91) so no dark-theme issue exists for tag-colors.ts.
