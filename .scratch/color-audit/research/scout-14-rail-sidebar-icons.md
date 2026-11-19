# Scout 14: rail, sidebars and file explorer

Scripts and raw output: /private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-14-rail-sidebar-icons/ (lib.mts copied from scout 04, m1.mts harness, m2.mts main table, m3/m4/m5 extras; outputs m2.out, m3.out).

## Method

- Resolved every color from theme-tokens.json `cssVars` (all hex, oklch or rgba; no var()/color-mix values in the JSON). Derived surfaces per app.css:382-392: rail-bg (light: fe-bg x0.96 L in oklch; dark: L-0.06), nav-bg (light: fe-bg; dark: L-0.03), list-bg (light: 50/50 oklch mix of fe-bg and editor-bg; dark: fe-bg), rail-muted-fg (70% fe-muted-fg + 30% fe-fg in oklch). Approximation error of the oklch helpers is under 0.05 in ratio (same helpers as scout 04).
- Tinted states are alpha composites: Tailwind `bg-x/25` and `color-mix(in oklch, c 18%, transparent)` both resolve to color c at that alpha, flattened over the real surface (rail-bg, nav-bg or list-bg). Stacked states (pill 10% over an active row 25% over list-bg) are flattened in order.
- WCAG 2 ratio via color-tools.mts; APCA Lc via the copy used by scout 04. Thresholds: text 4.5, meaningful icons and state indicators 3.
- Surfaces were traced from the markup: Rail.svelte (rail-bg), FilesNavigator/TypesNavigator (nav-bg), RailNoteList/NoteRow (list-bg), popovers (bg-popover), headers (tab-bar).

## Findings (full structured result also returned)

### 1. Rail icon palette is fixed, not theme-aware (overlaps scout 04 F2; extended to hover/active and dark)
- rail-items.logic.ts:144-165 (`RAIL_ITEM_COLORS`, fallback #0ea5e9, action #d946ef), applied Rail.svelte:392 (`style:color=var(--rail-c)`), active tint Rail.svelte:384, hover Rail.svelte:382 (`hover:bg-file-explorer-fg/10`).
- At rest on rail-bg (3:1 icon): fails on all 15 light themes for favorites #eab308 (1.31 Sepia, best 1.58), tasks #22c55e (1.56), files #14b8a6 (1.70), pin fallback #0ea5e9 (1.90), today #f97316 (1.92), mod action #d946ef (2.37), tags #ec4899 (2.42); calendar #f43f5e 14/28, inbox #3b82f6 10/28 (2.52 Sepia), types #8b5cf6 1/28 (2.90 Sepia). search, archive, graph pass at rest (min 3.06 Sepia).
- On hover (fg/10 over rail-bg): everything drops; the three that pass at rest fail too: search 8/28 (L5 D3; KokoBrain Default 2.68, Sepia 2.75, Twilight Violet 2.81, Graphite Violet 2.88), archive 7/28 (KokoBrain Default 2.66), graph 12/28 (L10 D2; Sepia 2.58, KokoBrain Default 2.86). Favorites 1.11 on Sepia hover.
- On the active tint (18% of own color): search 8/28 (L6 D2; Sepia 2.73, KokoBrain Default 2.96), archive 6/28 (Sepia 2.74, KokoBrain Default 2.94), graph 15/28, favorites 1.24 Sepia.
- Dark themes at rest pass for every item (min 3.0+); the dark failures are only hover/active of the slate/stone/indigo items, including the default theme.
- Pins resolved to a type palette color (`_color: green`) take `var(--type-green)` and on their own 18% active tint fail 3:1 on 5-10 light themes (orange/yellow/green/teal 10/28, pink 8/28, red 4/28, blue 6/28, purple 5/28; worst 2.51 Willemstad Light).
- Labeled and captioned forms also show the label (4.5 passes, see below), so identification survives there. The collapsed rail (Rail.svelte:129-138, `title: null`) is icons only.
- Fix owner: app (derive icon color with ensureContrast against rail-bg, and against the hover/active surface, or reuse the theme's type palette).

### 2. Selected row: primary text on its own 25% tint
- Note list: NoteRow.svelte:108 (`bg-primary/25`) with title `text-primary` at :127 (14px, font-medium). Files navigator: FilesNavigator.svelte:347-349 (`bg-file-explorer-primary/25` + `text-file-explorer-primary`, also the folder icon :562-564 and the Vault root :415). Types navigator: TypesNavigator.svelte:282 and :411, same pair.
- Measured: note list 21/28 fail 4.5 (L13 D8): Twilight Violet 2.82 (Lc -28), Zettlr Karl-Marx-Stadt Light 3.09, Sakura 3.10, Willemstad Dark 3.11, Shimmering Focus Light 3.12, Zettlr light family 3.16-3.39, Tolaria Light 3.46, KokoBrain Default 3.70, Graphite Violet 3.86. Files/Types 20/28 (L13 D7): Shimmering Focus Light 2.97 (Lc 43.8), Karl-Marx-Stadt Light 2.98, Sakura 3.00, Twilight Violet 3.06, Willemstad Dark 3.34, KokoBrain Default 4.05.
- Root cause: `primary` and `fileExplorerPrimary` are lifted to 4.5 against editorBg only (theme-builder.logic.ts:186); READABILITY_PAIRS has no pair for primary on its own tint, and a 25% tint of the text color removes about a third of the contrast.
- A fixed alternative already exists: file-explorer-fg on the same tint measures 5.03+ on all 28 themes (5.22+ on the list tint), so using it for the label and keeping primary for the icon or a side bar passes everywhere.
- Fix owner: both (app picks or derives the label color against the flattened tint; builder or themes repo can pin a primary-on-tint pair).

### 3. Active rail item has no strong cue (non-text state indicator)
- Rail.svelte:382-384: active = `color-mix(in oklch, var(--rail-c) 18%, transparent)` over rail-bg, `aria-current`; labeled/captioned also get `font-medium` and full fg instead of fg/85; collapsed has neither (no title).
- Tint vs rail-bg: 1.06 to 1.45 on all 28 themes (favorites on Sepia 1.06, best Twilight Violet 1.45; most items 1.12-1.30). Hover (fg/10) is 1.15-1.34, i.e. the selected state is no more visible than hover.
- Same weakness for the note list and Files rows (S3/S4): tint vs list-bg 1.34-1.80, there compensated by the text color change, which is itself finding 2.
- Fix owner: app (add a 3:1 marker such as a primary side bar or ring, or a stronger tint in the collapsed rail).

### 4. Muted and badge text on hovered and selected row tints
- Files folder count: FilesNavigator.svelte:569 `text-meta text-file-explorer-muted-fg` (12px). Types counts: TypesNavigator.svelte:299 and :430 `text-file-explorer-badge-fg`. Note subtitle: NoteRow.svelte:131 `text-[11px] text-muted-foreground`; fallback and archived icons :124, :135.
- Rest state passes (fe-muted-fg on nav-bg min 4.50 Lavender Haze; badge-fg same; subtitle on list-bg 2 fails, 4.27 Twilight Violet, 4.30 Zettlr Bielefeld Light).
- On the selected row (primary/25): Files count 21/28 fail (L12 D9), worst KokoBrain Default 3.08 (Lc -31.7), Lavender Haze 3.15, Tolaria Light 3.19, Zettlr Bielefeld/Bordeaux Dark 3.24; Types count 21/28, KokoBrain Default 3.09; subtitle 22/28, Zettlr Bielefeld Dark 2.96, Bordeaux Dark 2.97, Twilight Violet 3.03, KokoBrain Default 3.42.
- On hover (primary/10): Files and Types counts 12/28 (Lavender Haze 3.92, Tolaria Light 3.96, KokoBrain Default 4.13); subtitle 10/28 (Twilight Violet 3.75, Zettlr Bielefeld Light 3.80).
- Fallback and archived icons (3:1) on the selected row fail only on Zettlr Bielefeld Dark 2.96 and Zettlr Bordeaux Dark 2.97.
- Fix owner: app (muted text on a tint needs the tint accounted for: darker/lighter muted token on selected rows, or lower tint) plus builder pair for muted on selected tint.

### 5. Note list type chip and property pills
- NoteRow.svelte:141, :152, :162: `bg-primary/10 text-primary` 11px; hover pill `hover:bg-primary/20` :152.
- At rest on list-bg 10/28 fail (L8 D2): Twilight Violet 3.48, Willemstad Dark 3.77, Shimmering Focus Light 3.78, Sakura 3.79, Zettlr light family 3.82-4.13, Tolaria Light 4.32.
- On a hovered row (chip over row tint) 20/28 (Twilight Violet 3.08); on the selected row 26/28 (Twilight Violet 2.53, Karl-Marx-Stadt Light 2.73, KokoBrain Default 3.20); wikilink pill hover (/20) 20/28.
- Fix owner: app (derive chip fg from the flattened tint, or use fe-fg on the tint; builder pair for primary on primary/10).

### 6. Focus ring `ring-ring/50` on rows
- Rail.svelte:382, FilesNavigator.svelte:348 and :510, TypesNavigator.svelte:281/410, NoteRow.svelte:108: `focus-visible:ring-2 ring-ring/50 ring-inset`. Toolbar buttons use `ring-[3px] ring-ring/50` (RailNoteList.svelte:938, :999, :1011, RailArchivedMenu.svelte:34, FilesNavigator.svelte:364, TypesNavigator.svelte:224).
- Half-strength ring over rail-bg, nav-bg and list-bg: 24/28 below 3:1 (L15 D9), worst 1.82 Zettlr Bielefeld Light on rail-bg, 1.90 nav-bg, 1.92 list-bg, 1.94 on the tab-bar. Over a selected row tint: 28/28 below 3:1 (worst 1.68, best 2.76 Deep Ocean).
- The full-strength `ring-ring` passes on rail-bg (min 3.62 Shimmering Focus Light); on the selected tint it equals primary-on-tint (2 fails: Shimmering Focus Light 2.97, Twilight Violet 2.82 on the list tint).
- Fix owner: app.

### 7. IconPicker presets offered for the Text color (and the icon swatches)
- IconPicker.svelte:51-60 `PRESET_COLORS` (hex, theme-independent) feed both the Icon and the Text swatch rows (IconPicker.svelte:258 and :286). Title color is applied raw: FilesNavigator.svelte:566, TypesNavigator.svelte:294 and :424, NoteRow.svelte:127 (`style:color=titleColor`), without `iconColorCss`.
- As row title text (4.5) on nav-bg / list-bg: Yellow 1.47-1.54 worst (15/28), Cyan 1.87-1.95 (15), Green 1.75-1.83 (15), Orange 2.15-2.26 (15), Pink fails 17-19/28 (L15 D2-4; list-bg Sepia 2.84, KokoBrain Default 4.09), Blue 18-19/28 (Sepia 2.96), Red 19-24/28 (list-bg: L15 D9; KokoBrain Default 3.83), Purple 19-25/28 (list-bg: L15 D10; KokoBrain Default 3.64, Tolaria Dark 4.49 passes). Dark themes fail too for red, blue, purple, pink.
- Icon use (3:1) only fails on light themes (scout 04 F10): swatches are fixed hex and several are invisible on the light surfaces they are then drawn on.
- Selection ring `ring-primary` on `background` passes (min 4.08).
- Fix owner: app (store type palette names or resolve per theme/surface with ensureContrast; `iconColorCss` already maps palette names for icons but not for titles).

### 8. Type palette tokens on tinted states and the organize check
- builder tests TYPE_PALETTE_TOKENS only against fileExplorerBg at 3:1 (theme-builder.logic.ts:123). Measured on fe-bg/nav-bg/list-bg/rail-bg they pass everywhere (min 3.04 on rail-bg).
- Used as icon color (`_color: green` becomes var(--type-green)) on rows whose selected tint is primary/25: Files/Types rows 10-13/28 fail 3:1 (orange, yellow, green, teal 10; blue 11; purple 10; pink 13; red 12 with Zettlr Bordeaux Dark 2.11); note list rows 10-12/28 (red 1.94 Zettlr Bordeaux Dark, blue 2.34, pink 2.22 Zettlr Bielefeld Dark; light: orange 2.43 Willemstad Light). On hover tint only 0-3/28.
- Inbox organize check (NoteRow.svelte:90): `hover:bg-primary/15 hover:text-type-green`, shown at full opacity on the active row: type-green 3:1 fails on 8/28 on a plain row (Karl-Marx-Stadt Light 2.89) and 15/28 on the active row (Willemstad Light 1.98, Karl-Marx-Stadt Light 2.07).
- Fix owner: both (add selected-tint surfaces to the builder pairs, or app lifts icon color on selected rows).

### 9. BuildInfo channel badge (type palette consumer; outside the rail area, measured because it uses type-purple)
- BuildInfo.svelte:29-34: `bg-success/20 text-success`, `bg-warning/20 text-warning`, `bg-type-purple/20 text-type-purple`, `bg-primary/20 text-primary` (11px, uppercase, semibold) on setting-item-bg (Settings) and card (footer).
- On setting-item-bg: stable 15/28 fail (Lavender Haze 3.13), nightly 15/28 (Lavender Haze 3.16), preview 23/28 (Zettlr light family 2.78), dev 19/28 (Sakura 2.93). On card: stable 21/28 (Lavender Haze 3.50), nightly 16/28 (3.55), dev 17/28 (Twilight Violet 3.18), preview 19/28 (Zettlr Berlin Dark 2.94).
- The dev badge is on screen in every `pnpm tauri dev` session and the preview badge on Preview builds.
- Fix owner: app (labelColors or ensureContrast on the flattened tint).

### 10. Note list toolbar state by color only
- RailNoteList.svelte:938-940 (search open), :974-976 (filter active), RailSortMenu.svelte:106-108 (custom sort), RailArchivedMenu.svelte:34-36, RailPropertiesPicker.svelte:105-107: an icon button is `text-tab-text-active` when its state is on and `text-tab-text-inactive` when off; the filter and properties triggers have no other mark.
- tab-text-active vs tab-text-inactive: 1.25 (Shimmering Focus Dark) to 2.74 (Zettlr Berlin Dark) on all 28 themes, so the on/off difference is under 3:1 everywhere. Each color alone is fine on the tab-bar (inactive min 4.58, active min 7.31). Hover uses the active color, so a hovered off button looks like an on one.
- Fix owner: app (add a dot or fill, or aria-pressed plus a visible marker).

### 11. Popover section label in the default theme
- RailPropertiesPicker.svelte:130 (`section-label ... text-file-explorer-muted-fg`, 11px) and :172 (meta), rendered on bg-popover: KokoBrain Default 3.71 (Lc -35.5), the only failure (popover #333745 is lighter than fe-bg #262938, which the token is tuned for). muted-foreground on popover passes everywhere (min 4.51 Sakura).
- Fix owner: app (use muted-foreground, which is tested on popover).

## What passed
- Rail row titles: inactive fe-fg/85 on rail-bg min 4.54 (Zettlr Bielefeld Light, Lc 60.6); hover fe-fg on fg/10 min 5.51; active fe-fg on each item's 18% tint min 5.22 for all 13 items; rail-muted-fg section labels min 4.61. Busy dot and full `ring-ring` on rail-bg min 3.62.
- Navigator and list base text: fe-fg on nav-bg min 7.15, on hover primary/10 min 6.31, on list-bg min 7.45, on hover 6.56; drag-over fe-fg on accent/50 min 5.92; section labels, group labels, rules and empty texts (fe-muted-fg) on nav-bg min 4.50 and list-bg min 4.51 (both borderline, APCA Lc under 45 on 7 themes each: KokoBrain Default Lc -38.8 on list-bg).
- Toolbar: tab-text-inactive on tab-bar min 4.58; hover tab-text-active on file-explorer-accent min 4.76; sort/archive popover items (tab-text-inactive on popover min 4.55, popover-foreground on accent min 4.76); search icons fe-muted-fg on input-bg min 3.79.
- Type palette on fe-bg, nav-bg, list-bg, rail-bg at 3:1 (min 3.04); type-yellow/green on editor-bg (NoteActionBar favorite and organized icons) min 3.71.
- IconPicker selection ring-primary on background min 4.08; icon grid foreground min 7.31.
- Rail count badges and event bars were excluded as already fixed.

## Not checked
- User-chosen custom colors (`_color`, `title_color`, mod-declared rail colors): content, not app tokens. Note `title_color: green` renders CSS green (titleColor skips iconColorCss) while `_color: green` renders the theme token.
- Kanban `bg-type-orange/15 text-type-orange` badges (kanban.logic.ts:754-755): another scout's area, surface not measured here.
- Rail Inbox/count badge, linear-calendar bars: excluded as fixed.
- Pixel-level rendering in the running app (no launch allowed), tab-bar surface for ring-[3px] toolbar rings beyond one ratio, drag-handle hover (`hover:bg-file-explorer-primary/40` on the rail edge), CalendarNavigator and MyPeopleSection (other scouts).
- oklch/color-mix surfaces approximated, error under 0.05 in ratio; borderline results within 0.05 of a threshold are not listed as failures (e.g. N3a Lavender Haze 4.50).
