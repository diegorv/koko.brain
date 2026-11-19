# Scout 04: hard-coded palette and shadcn variants

Scripts and raw output: /private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-04-hardcoded-palette/ (lib.mts, destructive.mts, rail.mts, search.mts, menu.mts, destr-text.mts, presets.mts, opacity.mts, muted.mts, switch.mts, events.mts, bracket.mts, primhover.mts, ring.mts).

## Method

1. Swept src/lib (minus canvas, kanban, queryjs, graph-view, collection) for `text-white|text-black|bg-white|bg-black`, Tailwind palette classes (`-red-500` etc.), hex/rgb/hsl/oklch literals, named colors, arbitrary `text-[...]`/`bg-[...]` colors, opacity-modified text utilities (`text-x/NN`), and `<style>` blocks. Result: the app has almost no Tailwind palette use. The only `text-white` is `components/ui/button/button.svelte:12`. There are no `components/ui` badge or alert components (ui has button, collapsible, command, context-menu, dialog, dropdown-menu, input, popover, resizable, scroll-area, select, separator, switch, tooltip). Hard-coded hex lives in: rail-items.logic.ts (rail icon colors), IconPicker.svelte and tag-colors.ts (user-pickable presets), app.css (`--event-*` hues, `.dark` defaults, `--search-semantic-*`), TagColorPicker.svelte (white rgba), composition-aware-bracket-matching.ts, live-preview/styles.ts (fallbacks only; every var is defined by app.css or the theme).
2. Resolved colors per theme from theme-tokens.json `cssVars` (all values are hex, oklch or rgba; none needed hsl/var resolution). Derived surfaces: `--rail-bg`, `--nav-bg`, `--list-bg` per app.css (light: oklch mix; dark: oklch L offset; my oklch/oklab helpers in lib.mts). Translucent colors flattened over the real surface. `dark:` utilities follow html.dark = `isDarkColor(--editor-bg)` (theme.service.ts:32); I checked that matches the `dark` flag for all 28 themes (no mismatches).
3. Tailwind cascade order checked by compiling the button classes with the repo's tailwindcss 4.3.5: `hover:` rule is `.x:hover` (specificity 0,2,0) and `dark:` rule is `:where(.dark,.dark *)` (0,1,0), so on dark themes `hover:bg-destructive/90` beats `dark:bg-destructive/60`.
4. WCAG 2 ratios via color-tools.mts `contrastRatio`; APCA via a copy of its APCA function (Lc, sign = polarity).

## Findings (details in the structured result)

### F1. `--destructive` used as text color (menus + ~50 error messages)
- Shadcn destructive menu items: dropdown-menu-item.svelte:23 and context-menu-item.svelte:23 (`text-destructive` on `bg-popover`; highlighted `bg-destructive/10`, dark `/20`). Same token is the error text in ~50 sites (grep `text-destructive`): settings sections, EventForm, AutoOrganizeRuleRow, ViewDialog, RailNoteList and TasksView banners (`bg-destructive/10`), DiffViewer (`bg-destructive/15`), OutgoingLinksPanel.
- Cause: theme-builder.logic.ts:187 `error = lift(p.error, 3)` against editorBg only, READABILITY_PAIRS only has destructiveForeground vs destructive (:122), no destructive-as-text pair. The built-in KokoBrain Default (#f3333b) is affected.
- Measured destructive text, fails 4.5 on: popover 12/28, settings-dialog-bg 12/28, editor-bg 10/28, right-sidebar-bg 13/28, list-bg 12/28, tinted banner (10% over list-bg) 15/28.
- Worst: KokoBrain Default 3.02 popover, 3.44 editor, 3.40 banner, menu highlighted 2.63 (APCA Lc -30 / -27). Zettlr Bordeaux Dark 2.96 popover, 2.56 highlighted. Zettlr Berlin/Bielefeld/Frankfurt/Karl-Marx-Stadt Dark 3.11 popover, 2.62 highlighted, 3.01 on settings. Graphite Violet 4.14 / 3.06. Light: Sakura 3.97 popover / 3.46 highlighted, Shimmering Focus Light 4.09 / 3.53 (3.69 on editor, 3.89 right sidebar), Tolaria Light 4.13 / 3.58, Willemstad Light 4.2 / 3.63 (3.62 editor), Twilight Violet 4.63 popover but 3.92 on editor and 3.71 on right sidebar.
- Fix owner: both. App: a derived `--destructive-text` (ensureContrast on the surface) used for text, or builder lifts `error`/destructive to 4.5 on editorBg, popover, settingsDialogBg, rightSidebarBg, listBg and adds READABILITY_PAIRS entries. Themes repo: same lift if themes set destructive directly. Keep `--destructive` for fills.

### F2. Rail icon colors hard-coded, same on every theme
- rail-items.logic.ts:143-165 (`RAIL_ITEM_COLORS`, `RAIL_FALLBACK_COLOR` #0ea5e9, `RAIL_ACTION_COLOR` #d946ef), applied at Rail.svelte:392 (`style:color=var(--rail-c)`), active row tint at Rail.svelte:384 (18% of the color over rail-bg).
- Icon (non-text, identifies the destination, 3:1) on `--rail-bg`. Light themes (15): favorites #eab308 1.31-1.58, tasks #22c55e 1.56-1.88, files #14b8a6 1.70-2.05, pin fallback #0ea5e9 1.90-2.28, today #f97316 1.92-2.31, action #d946ef 2.37-2.85, tags #ec4899 2.42-2.91, calendar #f43f5e 2.51-3.02, inbox #3b82f6 2.52-3.03, types #8b5cf6 2.90-3.49 (fail on 6 of 15). search, archive, graph pass on light (3.06 minimum). Sepia is worst (rail-bg #dfd5bc). Dark themes: all >= 3.0 at rest except none (min KokoBrain Default 3.57 search/archive, Twilight Violet 3.51).
- Active row (icon on its own 18% tint): light themes drop further (favorites 1.25-1.46); dark themes: Twilight Violet 2.94 (archive), KokoBrain Default 3.01-3.04 borderline.
- The labeled rail also shows the title, so the destination is not lost; collapsed and captioned styles rely on the icon (captioned has caption).
- Fix owner: app. Pick the icon color from the theme (ensureContrast per color against rail-bg, 3:1), or use the `--type-*` palette that buildTheme already holds to 3:1.

### F3. shadcn destructive Button: hard-coded `text-white`
- button.svelte:12 `bg-destructive hover:bg-destructive/90 dark:bg-destructive/60 text-white`. `--destructive-foreground` (tested at 4.5 in READABILITY_PAIRS) is ignored. Used by TrashSection.svelte:74 (Empty Trash), ModDialogHost.svelte:133, ModActionPicker.svelte:159.
- Light themes at rest (white on solid destructive, needs 4.5): Shimmering Focus Light 4.20, Willemstad Light 4.20, Tolaria Light 4.13. Hover (`/90` over popover): Shimmering Focus Light 3.80, Tolaria Light 3.67, Willemstad Light 3.80, Lavender Haze 4.40.
- Dark themes at rest (`/60` over the surface) pass (min 4.47 Graphite Violet on popover). Hover wins on specificity, so dark hover is white on `/90` of a bright destructive: Tolaria Dark 2.67, Deep Ocean 2.94, Graphite Violet 2.99, Ink Night 3.12, Shimmering Focus Dark 3.99, Willemstad Dark 4.06, Twilight Violet 4.41, KokoBrain Default 4.46 (popover surface; settings-dialog-bg gives similar values).
- Related, low: default variant hover (`hover:bg-primary/90`, primary-foreground) drops below 4.5 on 11 themes (min 3.76 Zettlr Bielefeld Light, 3.83 Willemstad Dark, 3.90 Zettlr Bordeaux Light, 3.93-3.94 Zettlr Karl-Marx-Stadt Dark / Shimmering Focus Light); rest passes everywhere (min 4.51).
- Fix owner: app (use labelColors-style text pick or `text-destructive-foreground`, and make hover not alpha-blend toward the surface).

### F4. Search result source badges
- SearchResult.svelte:153-157. Surface is `bg-list-bg` (SearchPanel.svelte:230).
- `bg-file-explorer-primary/15 text-file-explorer-primary` ("Both") and `bg-search-semantic-bg text-search-semantic-fg` ("Semantic"), 11px: both fail 4.5 on the same 14 of 28 themes: Twilight Violet 3.26, Sakura 3.56-3.57, Willemstad Dark 3.57, Shimmering Focus Light 3.57, Zettlr light family 3.61-3.89 (Berlin 3.62, Bielefeld 3.61, Bordeaux 3.70, Frankfurt 3.89, Karl-Marx-Stadt 3.61), Tolaria Light 4.04, Zettlr Frankfurt Dark 4.29, Cool Mist 4.28, Sepia 4.35, Zettlr Karl-Marx-Stadt Dark 4.37. APCA light themes Lc 52-58 (OK-ish), Willemstad Dark Lc -28.5, Twilight Violet Lc -31, Frankfurt Dark -39 (poor).
- The "Text" badge (`bg-muted text-file-explorer-muted-fg`) is covered by F5.
- Root cause: `searchSemanticFg` = primary (theme-builder.logic.ts:243) and `fileExplorerPrimary` are never tested against their own 15% tint; READABILITY_PAIRS has no fileExplorerPrimary or searchSemantic pair, and primary is lifted to 4.5 only on editorBg. The app.css fallback `--search-semantic-fg #60a5fa` on `rgba(59,130,246,.15)` is fine on KokoBrain Default (4.71).
- Fix owner: both (themes that set search tokens explicitly + app derive fg from the flattened tint with ensureContrast).

### F5. `text-muted-foreground` on `bg-muted` chips
- Sites: TrashSection.svelte:68 (count pill), AutoOrganizeRuleRow.svelte:444 ("Off" pill), QuickSwitcher.svelte:150 ("Archived" chip, 11px), EventForm.svelte:97 (timing-locked notice, 12px), SearchResult.svelte:156 (Text badge, uses file-explorer-muted-fg). Hover states `hover:bg-muted` on muted-text buttons (EventMonthGrid, EventAllDayLane, EventTaskLane) hit the same pair.
- READABILITY_PAIRS checks mutedForeground against editorBg, background, card and popover but not `--muted`. Fails 4.5 on 14 of 28 themes. Worst: Zettlr Bordeaux Dark 2.52, Zettlr Berlin/Bielefeld/Frankfurt/Karl-Marx-Stadt Dark 2.58 (Lc about -28), Lavender Haze (fe-muted-fg) 3.68, Zettlr light family 3.68, Twilight Violet 3.87, Tolaria Light 4.15, Lavender Haze (muted-fg) 4.20, Sakura 4.26.
- Fix owner: both (add the pair to READABILITY_PAIRS so buildTheme lifts mutedForeground; themes repo for hand-authored themes).

### F6. "Add property" button and plus icon dimmed with opacity
- PropertiesView.svelte:235 `text-tab-text-inactive/60` (14px label) on `--right-sidebar-bg`; PropertiesView.svelte:224 `text-right-sidebar-muted-fg/60` plus icon.
- All 28 themes fail 4.5; 21 of 28 below 3:1 (Tolaria Light 2.25, Zettlr light family 2.28, Foolscap 2.33, Mint Linen 2.41; Cool Mist 2.49, Sepia 2.49; best Tolaria Dark 3.82). APCA Lc 40-43 on light.
- Fix owner: app (drop the /60; hover state already solid).

### F7. Calendar rail: out-of-month day numbers and week numbers
- CalendarGrid.svelte:58 `text-file-explorer-muted-fg/40` for days outside the month, 13px, clickable buttons, on `--nav-bg`: 1.67-2.42 on all 28 themes (Zettlr Bielefeld Light 1.67, Lavender Haze 1.67, Tolaria Light 1.68; best Shimmering Focus Dark 2.42). APCA Lc about 26-28 on Lavender Haze/Zettlr light.
- CalendarGrid.svelte:31 week numbers `text-file-explorer-fg/70` on `bg-background/70`: 3.55-3.67 on 5 Zettlr light themes (min 3.55), fine elsewhere.
- Fix owner: app. Deliberate de-emphasis, but text; use a solid muted color that holds 4.5 (muted-fg is tested vs fe-bg) instead of 40% alpha.

### F8. Property value text at 70% opacity
- PropertyField.svelte:131 (display value) and :139 (`!text-right-sidebar-fg/70` input), PropertiesView.svelte:176 (type button on `bg-input-bg`): 14px, on `--right-sidebar-bg` / `--input-bg`.
- Fails 4.5 on 6 themes: Zettlr Berlin/Bielefeld/Bordeaux/Frankfurt/Karl-Marx-Stadt Light 3.55 on right-sidebar-bg and 3.71 on input-bg (Lc 60-65), Sakura 4.38 on right-sidebar-bg.
- Fix owner: app (the /70 is a value, not a placeholder; use full right-sidebar-fg).

### F9. Unchecked switch nearly invisible on light themes
- switch.svelte:18,26: track `data-[state=unchecked]:bg-switch-unchecked-bg`, thumb `bg-background` (light) / `dark:...bg-foreground`. Switches sit on `bg-setting-item-bg` (SettingItem.svelte:21).
- Thumb vs track (3:1) fails on 13 light themes: Sakura 1.28, Tolaria Light 1.31, Lavender Haze 1.38, Zettlr light family 1.53, Foolscap 1.54, Cool Mist 1.55, Mint Linen 1.53, Sepia 1.67, Shimmering Focus Light 2.34. Track vs surface fails 26 of 28 (Sakura 1.06, Lavender Haze 1.12, Tolaria Light 1.31; dark KokoBrain Default 1.74, Twilight Violet 1.36; only Willemstad Dark 2.80 comes close). Checked state passes everywhere (thumb on primary and primary on surface, both >= 3).
- Fix owner: both (the token `switchUncheckedBg` is theme-built; app can add a border or make thumb contrast the track).

### F10 (low). Preset swatches built for dark backgrounds
- tag-colors.ts:3-8 (red #fb464c, orange #e9973f, yellow #e0de71, green #44cf6e, cyan #53dfdd, purple #a882ff), used as TagColorDot (size-3 dot, TagItem) and the Tag icon tint (PropertyField.svelte:173); IconPicker.svelte:53-60 presets (Orange #f97316, Yellow #eab308, Green #22c55e, Cyan #06b6d4 fail 3:1 on all 15 light themes against list-bg/nav-bg: yellow 1.47-1.84, green 1.75-2.19, cyan 1.87-2.33, orange 2.15-2.69; Blue/Pink fail on a few).
- Tag presets on right-sidebar-bg, light themes: yellow 1.09-1.31, cyan 1.24-1.50, green 1.55-1.87, orange 1.80-2.17, purple 2.21-2.66, red 2.65-3.19.
- User-chosen content color, so low severity; the preset set is the app's choice.
- TagColorPicker.svelte:96,104 and :60: `rgba(255,255,255,0.1)` fill for the "none" dot and the empty custom dot, `rgba(255,255,255,0.5)` hover border: invisible on light popovers (~1.0:1). The X icon on the "none" dot is muted-fg and readable; the empty custom swatch has no visible boundary.

### F11 (low). Event calendar pills in Zettlr Bielefeld Light
- app.css:`--event-*-bg/fg` (hard-coded hues mixed with editor bg/fg 25/30), used by event-calendar-event.logic.ts:435. Fails 4.5 only on Zettlr light themes: Bielefeld Light cyan 4.06, green 4.10, orange 4.15, pink 4.31, blue 4.36, purple 4.40; Berlin/Frankfurt/Karl-Marx-Stadt Light green and cyan 4.44-4.48; Bordeaux Light orange 4.50 borderline. All other themes pass. The comment claims 4.5 on KokoBrain Default and Sakura only.
- Fix owner: app (tune mix percentages or run ensureContrast).

## What passed
- Input text `text-foreground/80` on `bg-input-bg`: min 4.70 (Zettlr light), no failures. Placeholder `muted-foreground` on `input-bg`: min 4.51 (Twilight Violet).
- Calendar selected day `primary-foreground` on `file-explorer-primary`: min 4.51.
- Bracket match/mismatch backgrounds (composition-aware-bracket-matching.ts:164-165) with inherited editor-fg: min 4.50 / 5.05 (borderline Zettlr Bordeaux Dark at 4.496).
- `--ring` against popover and setting-item-bg: all >= 3 (ring/50 alone is under 3 on 25 themes, but input also draws a full-strength `border-ring`; button uses full `ring-ring`, not measured per theme).
- Checked switch (thumb vs primary, primary vs surface): all >= 3.
- Tooltip (`bg-foreground text-background`): inverse of foreground/background, covered by the 4.5 pair.
- live-preview/styles.ts fallbacks (#ef4444, #f87171, white): every referenced var is defined, so the fallbacks never render.
- Theme-token text pairs already in READABILITY_PAIRS were not re-measured.

## Not checked
- IconRenderer user-chosen colors and mod-declared rail colors (user content).
- Surfaces other than those named (sites not on list-bg/nav-bg/popover/settings-item/right-sidebar/editor); hover backgrounds of rows (file-explorer-accent/60) for the search badges.
- oklch `color-mix` was approximated by oklab/oklch helpers (list-bg for light themes mixes in oklch with a simple shorter-hue average); expect error under 0.05 in ratio.
- Dark-theme highlighted destructive menu bg assumes `dark:...bg-destructive/20` wins over `/10` by source order (variant order was verified only for `hover` vs `dark`).
- No pixel-level verification in the running app (no app launch allowed).
