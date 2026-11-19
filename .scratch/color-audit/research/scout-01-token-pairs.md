# Scout 01: theme token pairs actually used together

Read-only audit. Scripts and raw output live under the scratchpad (audit-01-token-pairs/: engine.mts, pairs-table.mts, compact.mts, all.txt, results.json). No tracked file was edited.

## Method

1. Resolved the CSS variable table of each of the 28 themes from `theme-tokens.json` `cssVars`, then added what `src/app.css` derives for variables no theme sets: `--card-foreground`, `--rail-bg`, `--nav-bg`, `--list-bg`, `--rail-muted-fg`. The `.dark` branch follows `theme.service.ts` (`isDarkColor(--editor-bg)`), which equals the `dark` flag in the JSON. `color-mix(in oklch, ...)` and `oklch(from ... calc(l - ...))` were reimplemented (own OKLCH conversion; hue interpolation on the shorter arc), not approximated with the OKLab mixer.
2. Grepped every `text-/bg-/border-/ring-<token>` class under `src/lib` (+ `src/routes`), paired the fg and bg tokens found in the same class string (script `pairs.py`, 182 same-string hits), then read the surrounding markup to find the real surface stack (ancestor bg). Where a bg is a Tailwind opacity modifier (`bg-primary/25`) the tint is composited over the real ancestor surface (sRGB alpha, as the browser does); `text-x/70` is composited over its bg.
3. Measured about 150 pairs on all 28 themes (WCAG 2 ratio via `contrastRatio`, APCA Lc via the `apcaContrast` formula copied from `color.ts`). Thresholds: text 4.5, meaningful UI/icons/focus/borders 3. `dark:`-only classes are measured on the 13 dark themes only, light-only on the 15 light themes.
4. Sanity check: two values recomputed independently in Python (`#9ba3da` at 25% over `#262938` gives `#434860`, 3.70:1; `#357458` at 20% over `#eae6f2` gives `#c6cfd3`, 3.50:1). Both match.

Root-cause note shared by most findings: `buildTheme` (`src/lib/core/settings/theme-builder.logic.ts`) only guarantees fg tokens on the plain surfaces listed in `READABILITY_PAIRS` (editor, background, card, popover, file-explorer-bg). The app then draws the same fg on surfaces that are not in that list: `muted` and `accent` (which are `hover` and `selected` in the palette), and on tints of the fg itself (`bg-primary/25`, `bg-destructive/15`). `readableCore` lifts `error` to 3:1 only (line 187) and `primary` against the editor background only (line 186), while both are used as small text everywhere.

## Findings (grouped by root cause)

Numbers are WCAG ratio; "n/28" counts themes under the threshold.

### 1. Active row in the note list (high)
`features/note-list/NoteRow.svelte:108` (`bg-primary/25` when `isActive`), title `:127` `text-primary`, subtitle `:131` `text-muted-foreground`, pills `:141,152,162` (`bg-primary/10 text-primary`, stacked on the active tint).
- Title `text-primary` on primary/25 over list-bg: 21/28 fail. KokoBrain Default 3.70 (`#9ba3da` on `#434860`, Lc41), Lavender Haze 4.04, Twilight Violet 2.82, Sakura 3.10.
- Subtitle muted-foreground (11px) on the active row: 22/28 fail, KokoBrain Default 3.42, Zettlr Bielefeld Dark 2.96.
- Pill on the active row (primary/10 on top of primary/25): 26/28 fail, 8 under 3:1 (Twilight Violet 2.53), KokoBrain Default 3.20, Lavender Haze 3.57.
- Idle pills (primary/10 over list-bg): 10/28 fail, light themes 3.8 to 4.3.
This is the selected note in the default view of the default theme.

### 2. Highlighted destructive menu items (high)
`components/ui/dropdown-menu/dropdown-menu-item.svelte:23` and `context-menu/context-menu-item.svelte:23`: `data-[variant=destructive]:data-highlighted:bg-destructive/10` and `dark:...bg-destructive/20` with `text-destructive`. The destructive selectors out-specify `data-highlighted:bg-accent`, so the tint wins.
- Dark themes (/20 over popover): 13/13 fail, 6 under 3:1: Zettlr Bordeaux Dark 2.56, Zettlr Berlin/Bielefeld/Frankfurt/KMS Dark 2.62, KokoBrain Default 2.63 (`#f3333b` on `#593643`, Lc27).
- Light themes (/10): 5/15 fail (Sakura 3.46, SF Light 3.53, Tolaria Light 3.58, Willemstad Light 3.63, Lavender Haze 4.40).
Used by Delete items in Kanban card/lane menus and task view menus.

### 3. Status text on its own tint (high)
Same family as the badge bug the owner reported, other places:
- `plugins/kanban/kanban.logic.ts:752-755` (card/list/table/date-picker due badges, over `bg-background`): overdue 23/28 fail (KokoBrain Default 3.51, Willemstad Light 2.96); tomorrow (`type-orange` on /15) 16/28 fail, 3 under 3:1 (SF Light 2.90, Willemstad Light 2.91, Tolaria Light 2.96), Lavender Haze 3.16; upcoming (`type-blue`) 21/28 fail (Lavender Haze 4.07, Zettlr Light x4 3.05); today (`warning`) 14/28 fail (light themes 3.8 to 4.2).
- `features/file-history/DiffViewer.svelte:14-15` (over popover): deleted lines 21/28 fail, 6 under 3:1, KokoBrain Default 2.74 (`#f3333b` on `#503644`, Lc28); inserted lines 11/28 fail (Sakura 3.42).
- `core/settings/BuildInfo.svelte:30-33` channel badge (over setting-item-bg in Settings > Update; over bg-card in the footer variant): `preview` (`type-purple`) 23/28 fail, worst 2.78 Zettlr Berlin Light; `stable` 15/28 fail (Lavender Haze 3.13); `nightly` 15/28 (Lavender Haze 3.16); `dev` 19/28 (Sakura 2.93).
- Error panels `features/collection/CollectionView.svelte:520,716`, `features/tasks/TasksView.svelte:634`, `features/event-calendar/EventCalendarNeedsAttention.svelte:69` (`text-destructive` on `bg-destructive/10`): 14/28 fail, 5 under 3:1 (Zettlr dark 2.78), KokoBrain Default 3.19, Lavender Haze 3.62.
The token is lifted to 3:1 (error) or 4.5:1 (warning/success) only on plain surfaces; a 15 to 20% tint of the same hue lowers it again, and `type-*` tokens are only held to 3:1.

### 4. Properties panel: "Add property" label and "Add item" placeholder (high)
`features/properties/PropertiesView.svelte:235` (`text-tab-text-inactive/60` on right-sidebar-bg; button label, shown for every note) 28/28 fail, 21 under 3:1; KokoBrain Default 2.93, Lavender Haze 2.80, Tolaria Light 2.25. `features/properties/PropertyField.svelte:191` placeholder `text-right-sidebar-muted-fg/30` on input-bg: 28/28 under 3:1 (1.46 to 1.91; KokoBrain Default 1.56). Also `PropertiesView.svelte:224` plus icon at /60: 21/28 under 3:1.

### 5. Off switch is nearly invisible (high, non-text)
`components/ui/switch/switch.svelte:18` (track `bg-switch-unchecked-bg`, token = `borderStrong`) on `bg-setting-item-bg` (every Settings row): 26/28 under 3:1: Sakura 1.06, Lavender Haze 1.12, Tolaria Light 1.31, Twilight Violet 1.36, KokoBrain Default 1.74. Light-theme thumb (`bg-background`, line 26) on the off track 13/15 under 3:1 (Sakura 1.28, Lavender Haze 1.38). Checked track (primary) and dark-theme thumbs pass.

### 6. Selected row in Files and Types navigators (medium)
`features/rail-shell/FilesNavigator.svelte:347-349`, `TypesNavigator.svelte:282,411`: `text-file-explorer-primary` on `bg-file-explorer-primary/25` over nav-bg: 20/28 fail, 2 under 3:1 (SF Light 2.97, Zettlr KMS Light 2.98), KokoBrain Default 4.05 (Lc43), Lavender Haze 3.87. Count badges inside the selected row (`FilesNavigator.svelte:569` file-explorer-muted-fg, `TypesNavigator.svelte:299,430` file-explorer-badge-fg): 21/28 fail, KokoBrain Default 3.08/3.09 (Lc32), Lavender Haze 3.15.

### 7. Primary text on a primary tint: toggles, chips, search badges (medium)
`plugins/kanban/KanbanView.svelte:549,558,567` (view-mode toggle, over editor-bg) 13/28 fail (3.91 to 4.47); `features/collection/toolbar/FilterPanel.svelte:96,162` count pill (over popover) 15/28 fail, KokoBrain Default 3.78, Sakura 3.11; `features/search/SearchPanel.svelte:348` fuzzy toggle on /20 over bg-background 19/28 fail (KokoBrain Default 4.47); `features/search/SearchResult.svelte:153,155` Both/Semantic badges 14/28 fail (3.26 to 4.37; `--search-semantic-fg` is `primary` in every repo theme); `plugins/table-of-contents/TableOfContentsPanel.svelte:57` hover 12/28 fail (3.61 to 4.45).

### 8. Destructive color as plain small text (medium)
About 75 `text-destructive` uses, mostly `text-meta` (12px) or `text-xs` validation and load errors: `features/type-definitions/ViewDialog.svelte:192-212`, `TypeNameDialog.svelte:90`, `core/settings/sections/SentrySection.svelte:75`, `UpdateSection.svelte:309`, `ThemeEditor.svelte:145`, `features/auto-organize/AutoOrganizeRuleRow.svelte:517-722`, `features/event-calendar/EventForm.svelte:88-198`, `features/collection/toolbar/FilterRow.svelte:116`, and others. On popover 12/28 fail (KokoBrain Default 3.02, Zettlr Bordeaux Dark 2.96), settings dialog 12/28 (KokoBrain Default 3.08, Lavender Haze 4.16), editor-bg 10/28 (KokoBrain Default 3.44, Zettlr dark 3.01), setting-item-bg 12/28 (Lavender Haze 3.66). APCA Lc 26 to 34 on the failing dark themes. Cause: `theme-builder.logic.ts:187` `lift(p.error, 3)` and no `destructive` text pair in `READABILITY_PAIRS`; the default theme's `error: '#f3333b'` (`theme.logic.ts:139`) is held to the same 3:1 floor.

### 9. Muted text on `bg-muted` pills (medium)
`plugins/kanban/kanban.logic.ts:756-757` (no-date and future badges), `core/settings/sections/TrashSection.svelte:68`, `features/auto-organize/AutoOrganizeRuleRow.svelte:444`, `features/quick-switcher/QuickSwitcher.svelte:150` (Archived), `features/event-calendar/EventForm.svelte:97`, `features/search/SearchResult.svelte:156` (file-explorer-muted-fg). All `text-muted-foreground` on opaque `--muted` (the palette `hover` color): 14/28 fail, 5 under 3:1: Zettlr Bordeaux Dark 2.52, other Zettlr dark 2.58; Zettlr light 3.68, Twilight Violet 3.87, Lavender Haze 4.20, Sakura 4.26. `READABILITY_PAIRS` checks mutedForeground on editor, background, card, popover only. Related: `features/collection/CollectionCalendarView.svelte:119` and `CollectionLinearCalendarView.svelte:147,152` weekday headers on `bg-muted/60` 12/28 fail (Zettlr dark 3.26); `components/ui/select/select-trigger.svelte:22` placeholder on `dark:bg-input/30` 6/13 dark themes fail (worst 3.85).

### 10. Hover and active-row surfaces under muted or primary text (low to medium)
Persistent: `plugins/one-on-one/MyPeopleSection.svelte:50,62,70` active row `bg-file-explorer-accent` with file-explorer-muted-fg 11/28 fail (Zettlr light 3.02) and `text-warning` 12/28 fail. Hover: `core/settings/sections/AppearanceSection.svelte:173` and `TrashSection.svelte:91` (`hover:bg-settings-hover-bg`, text-muted-foreground) 15/28 fail, 5 under 3:1 (Zettlr dark 2.52 to 2.58), KokoBrain Default 4.05; theme "Active" label on the hover bg (`AppearanceSection.svelte:186`) 17/28 fail; `features/properties/PropertiesView.svelte:176` value on `hover:bg-right-sidebar-accent` 10/28 fail (Zettlr light 2.77); `features/event-calendar/EventMonthGrid.svelte:115,118,155` and `EventDayHeaders.svelte:44` today/other-month numbers on `hover:bg-muted` 14 to 15/28 fail (Zettlr Frankfurt Dark 2.58 for today); `core/markdown-editor/EditorTabs.svelte:276` tab-list trigger on `hover:bg-muted/60` 11/28 fail (3.44); `plugins/calendar/CalendarGrid.svelte:58,60` weekend day on `hover:bg-file-explorer-accent` 11/28 fail, 4 under 3:1.

### 11. Focus ring at 50% (medium, keyboard)
Rows that show focus only through `focus-visible:ring-2 ring-ring/50 ring-inset` (no border change): `features/rail-shell/FilesNavigator.svelte:349`, `TypesNavigator.svelte:281,410`, `features/note-list/NoteRow.svelte:108`, `RailNoteList.svelte:938,999,1011`, `core/markdown-editor/EditorTabs.svelte:276`, `app/AppShell.svelte:191`, `app/SettingsPanel.svelte:137`, plus 34 more `focus-visible:ring-ring/50` sites. Ring (primary at 50%) over editor-bg: 24/28 under 3:1 (KokoBrain Default 2.52, Lavender Haze 2.21, Willemstad Dark 1.93); over nav-bg also 24/28. Inputs are fine because `focus-visible:border-ring` adds a solid primary edge (4.15 worst on input-bg).

### 12. Form control boundaries (medium, non-text)
`components/ui/input/input.svelte:28,43` `border-input` (palette `borderStrong`) vs popover: 26/28 under 3:1 (KokoBrain Default 1.24, Lavender Haze 1.51, Sakura 1.06); the `bg-input-bg` fill vs popover is also under 3:1 in all 28 themes, so the border is the only edge. Same token on `PropertyField.svelte:126` native checkbox and settings inputs (26/28 under 3:1 on settings-dialog-bg). Kanban card checkbox `plugins/kanban/KanbanCard.svelte:214` `border-muted-foreground/40` on bg-background: 28/28 under 3:1 (1.68 to 2.40; KokoBrain Default 2.09, Lavender Haze 1.78).

### 13. Other opacity-dimmed text and icons (medium)
`plugins/kanban/KanbanView.svelte:607`, `KanbanLane.svelte:418` placeholder `/50` on bg-background: 28/28 fail, 27 under 3:1 (1.94 to 2.9); `plugins/calendar/CalendarGrid.svelte:58` out-of-month day numbers `text-file-explorer-muted-fg/40`: 28/28 under 3:1 (1.67 to 2.42; KokoBrain Default 1.91); `plugins/kanban/KanbanDatePicker.svelte:67,79` clear icons `/50`: 28/28 under 3:1 (default 2.25), `:130` out-of-month 28/28 under 3:1; `features/collection/CollectionCalendarView.svelte:144` out-of-month `/40`; delete/drag icon buttons `/50` in `features/collection/toolbar/FormulaRow.svelte:91,98`, `PropertiesPanel.svelte:135,142`, `SortPanel.svelte:91` (measured on popover, same pair as the date picker icons; surface assumed); `features/collection/CollectionView.svelte:613` result count `/60`. Out-of-month days may count as intentionally inactive; the clear and delete icons and placeholders carry meaning.

### 14. Property values drawn at 70% (medium)
`features/properties/PropertyField.svelte:131,139` and `PropertiesView.svelte:176`: `text-right-sidebar-fg/70` on input-bg: 6/28 fail (Zettlr light 3.71, Sakura 4.38); boolean value on right-sidebar-bg 6/28 (3.55); `app.css:480-481` date input text at 70% of foreground on input-bg 5/28 (3.71). Light themes with a mid-gray foreground (`#50505a`).

### 15. Fill/foreground pairs and APCA (medium)
`primaryForeground` on `primary` (button.svelte:10, `plugins/calendar/CalendarGrid.svelte:60`, `EventDayHeaders.svelte:42`, `EventMonthGrid.svelte:113`, `EventWeekStrip.svelte:51`, `CollectionCalendarView.svelte:143`, `EditorTabs.svelte:282`, `KanbanCard.svelte:214`) passes 4.5 in all 28 themes but reads poorly (Lc under 45): Zettlr Berlin Light near-black `#030305` on `#12865e` 4.51 (Lc33), Willemstad Dark `#090909` on `#567f83` 4.51 (Lc33), Twilight Violet 4.95 (Lc39), Zettlr Frankfurt/KMS Dark 4.54/4.56 (Lc41). This is the owner's black-on-saturated-mid-tone problem; `theme-builder.logic.ts:194` `ensureContrast(primaryFg, primary, 4.5)` only nudges the author's color to the WCAG floor; no APCA choice as in `labelColors`. Button hover `hover:bg-primary/90` over popover then drops 11/28 under 4.5 (Zettlr Bielefeld Light 3.76, Zettlr Bordeaux Light 3.91).

### 16. Primary as text on non-editor surfaces (low, near misses)
`core/layout/SidebarSection.svelte:46`, `features/properties/NoteInfo.svelte:44` section titles (15px semibold, `text-right-sidebar-primary` on right-sidebar-bg) 7/28 fail (SF Light 4.08, Sakura 4.15); `plugins/calendar/CalendarGrid.svelte:46,58` weekend header and days on nav-bg 8/28 (4.08 to 4.40); `AppearanceSection.svelte:186` Active label on setting-item-bg 6/28 (Sakura 3.73). Cause: `theme-builder.logic.ts:186` `lift(p.primary, 4.5)` uses the editor background only.

### 17. Muted text on dark themes passes 4.5 but Lc 37 to 42 (low, APCA)
Status bar `core/status-bar/StatusBar.svelte:9` in KokoBrain Default `#7c89a8` on `#21222e` 4.50 (Lc37), 12px; rail/calendar muted text (`CalendarGrid.svelte:46` Lc40 default); placeholders (`input.svelte:43` Lc38 to 39 on Twilight Violet and Zettlr dark); inactive tabs and the action-bar breadcrumb on Zettlr dark themes (Lc39 to 42); note-row subtitles on Zettlr dark (Lc41 to 42). 7/28 themes for status bar, input placeholder, calendar header, search placeholder.

### 18. Destructive button text is hardcoded white (low)
`components/ui/button/button.svelte:12` `text-white` ignores `destructiveForeground`: light themes 3/15 under 4.5 (Tolaria Light 4.13, SF Light and Willemstad Light 4.20); dark themes (`dark:bg-destructive/60` over popover) Graphite Violet 4.47. Used by Trash "Empty trash" and mod Stop button.

## What passed

- `accent-foreground` on `accent` (menu items, command, select highlighted, ghost hover): min 4.76 (Zettlr Berlin Light). Menu icons: muted-foreground on highlighted accent 3.02 (just passes 3:1), idle on popover 4.51.
- Primary/secondary buttons at rest (4.51 min, but see 15), secondary 4.82, ghost hover dark 7.99, tooltip 7.31.
- Input text `foreground/80` on input-bg 4.70, placeholder 4.51 (APCA aside), `focus-visible:border-ring` 4.15, switch checked track/thumb, switch dark thumbs.
- Tabs: active label on editor-bg 7.13, inactive on tab-bar 4.58, active tab underline vs tab-bar 4.08.
- Rail: row hover text, selected row fg text 5.03, header buttons and their hover text 4.58 to 4.76, labels `file-explorer-fg/85` 4.54, `rail-muted-fg` 4.61. Calendar selected-day fill and today ring vs nav-bg 4.08.
- Collection: active tab text on primary/15 (6.37), hover tab, view tab idle; settings nav active and hover (4.82), settings descriptions on setting-item-bg (4.51), popover-foreground pairs, right-sidebar chip text (4.70), status bar WCAG (4.50), floating editor buttons (4.62), graph overlay (4.62), time-grid selection (5.94).

## Not checked

- Fixed colors outside theme tokens (hex literals, `style=` colors, `iconColorStyle` user colors, kb.ui, charts, graph canvas): other scouts.
- `color-mix` with `black`/`white`, shadows, scrim opacity; hover states that also change text color were only measured in their final state.
- Surfaces assumed from the nearest ancestor class; a few are inferred: Kanban lanes and toolbars over editor-bg, collection toolbar panels over popover, DiffViewer over popover (dialog), BuildInfo footer variant over bg-card.
- Rendered screenshots (no app run). Disabled-state `opacity-50` text (WCAG exempts it) was not measured. The resizable grip icon (`resizable-handle.svelte:32`, primary-foreground on primary/50 over a divider strip) was not reported: its real backdrop is a gradient strip I did not resolve.
- Dark/light class mismatch: a theme with dark panels and a light editor takes the light `:root` column rules; the 28 themes all have consistent editor/panel polarity as measured.

## Raw measurements (id, threshold, failing themes/total, worst case)

```
menu-hl-text           text4.5 0/28 fail (0 <3) worst 4.76 Lc56 Zettlr Berlin Light fg=#50505a bg=#c8c8c8
menu-hl-icon           ui3 0/28 fail (0 <3) worst 3.02 Lc43 Zettlr Berlin Light fg=#6e6e77 bg=#c8c8c8
menu-icon              ui3 0/28 fail (0 <3) worst 4.51 Lc62 Sakura fg=#735f6c bg=#eedede
menu-destr             text4.5 12/28 fail (1 <3) worst 2.96 Lc26 Zettlr Bordeaux Dark fg=#d3322f bg=#282832
menu-destr-hl-l        text4.5 5/15 fail (0 <3) worst 3.46 Lc49 Sakura fg=#cc3040 bg=#ebccce
menu-destr-hl-d        text4.5 13/13 fail (6 <3) worst 2.56 Lc23 Zettlr Bordeaux Dark fg=#d3322f bg=#4a2a31
btn-default            text4.5 0/28 fail (0 <3) worst 4.51 Lc33 Zettlr Berlin Light fg=#030305 bg=#12865e
btn-default-hover      text4.5 11/28 fail (0 <3) worst 3.76 Lc66 Zettlr Bielefeld Light fg=#f3f3f4 bg=#9d744e
btn-secondary          text4.5 0/28 fail (0 <3) worst 4.82 Lc58 Zettlr Bordeaux Dark fg=#c8c8c8 bg=#505050
btn-destr-l            text4.5 3/15 fail (0 <3) worst 4.13 Lc72 Tolaria Light fg=#ffffff bg=#e53e3e
btn-destr-d            text4.5 1/13 fail (0 <3) worst 4.47 Lc76 Graphite Violet fg=#ffffff bg=#9a6b6e
btn-destr-d-hover      text4.5 0/13 fail (0 <3) worst 4.79 Lc78 Tolaria Dark fg=#ffffff bg=#a55f5b
btn-ghost-hover        text4.5 0/13 fail (0 <3) worst 7.99 Lc69 Shimmering Focus Dark fg=#c3c8df bg=#2d2f3c
input-text             text4.5 0/28 fail (0 <3) worst 4.70 Lc73 Zettlr Berlin Light fg=#73737b bg=#ffffff
input-placeholder      text4.5 0/28 fail (0 <3) worst 4.51 Lc38 Twilight Violet fg=#908aa4 bg=#282630
input-border           ui3 26/28 fail (26 <3) worst 1.06 Lc0 Sakura fg=#e8d8d8 bg=#eedede
input-border-sb        ui3 26/28 fail (26 <3) worst 1.17 Lc0 Twilight Violet fg=#343040 bg=#282630
input-bg-edge          ui3 28/28 fail (28 <3) worst 1.00 Lc0 Cool Mist fg=#ffffff bg=#ffffff
focus-ring-border      ui3 0/28 fail (0 <3) worst 4.15 Lc62 Sakura fg=#bd4776 bg=#f5ebeb
focus-ring50           ui3 24/28 fail (24 <3) worst 1.93 Lc8 Willemstad Dark fg=#2f4345 bg=#070707
focus-ring50-rail      ui3 24/28 fail (24 <3) worst 1.90 Lc32 Zettlr Bielefeld Light fg=#bda691 bg=#e8e8e8
switch-track-off       ui3 26/28 fail (26 <3) worst 1.06 Lc0 Sakura fg=#e8d8d8 bg=#eedede
switch-thumb-off-l     ui3 13/15 fail (13 <3) worst 1.28 Lc16 Sakura fg=#fdf5f5 bg=#e8d8d8
switch-thumb-off-d     ui3 0/13 fail (0 <3) worst 3.96 Lc53 Shimmering Focus Dark fg=#c3c8df bg=#575c75
switch-thumb-on-l      ui3 0/15 fail (0 <3) worst 4.08 Lc68 Shimmering Focus Light fg=#eff0f5 bg=#108189
switch-thumb-on-d      ui3 0/13 fail (0 <3) worst 4.51 Lc33 Willemstad Dark fg=#090909 bg=#567f83
switch-track-on        ui3 0/28 fail (0 <3) worst 3.73 Lc56 Sakura fg=#bd4776 bg=#eedede
tooltip                text4.5 0/28 fail (0 <3) worst 7.31 Lc86 Zettlr Berlin Light fg=#f5f5f5 bg=#50505a
tab-active             text4.5 0/28 fail (0 <3) worst 7.13 Lc80 Zettlr Bielefeld Light fg=#50505a bg=#f3f3e8
tab-inactive           text4.5 0/28 fail (0 <3) worst 4.58 Lc69 Tolaria Light fg=#71706d bg=#f7f6f3
tab-inactive-hover     text4.5 9/28 fail (0 <3) worst 4.04 Lc61 Tolaria Light fg=#71706d bg=#e9e8e5
tab-indicator          ui3 0/28 fail (0 <3) worst 4.08 Lc63 Shimmering Focus Light fg=#108189 bg=#eff0f5
notebar-crumb          text4.5 0/28 fail (0 <3) worst 4.52 Lc67 Zettlr Bielefeld Light fg=#6e6e77 bg=#f3f3e8
tablist-hover          text4.5 11/28 fail (0 <3) worst 3.44 Lc34 Zettlr Bordeaux Dark fg=#8f8f98 bg=#3c3c3c
rail-sel               text4.5 20/28 fail (2 <3) worst 2.97 Lc44 Shimmering Focus Light fg=#108189 bg=#b7d4da
rail-sel-icon-idle     ui3 0/28 fail (0 <3) worst 3.92 Lc55 Lavender Haze fg=#6b6486 bg=#dbd7e5
rail-hover-text        text4.5 0/28 fail (0 <3) worst 6.31 Lc72 Zettlr Karl-Marx-Stadt Light fg=#50505a bg=#f2e1e1
rail-sel-fg            text4.5 0/28 fail (0 <3) worst 5.03 Lc59 Zettlr Karl-Marx-Stadt Light fg=#50505a bg=#efc3c3
rail-sel-muted         text4.5 21/28 fail (0 <3) worst 3.08 Lc32 KokoBrain Default fg=#8490ad bg=#3e425b
rail-btn               ui3 0/28 fail (0 <3) worst 4.58 Lc69 Tolaria Light fg=#71706d bg=#f7f6f3
rail-btn-hover         text4.5 0/28 fail (0 <3) worst 4.76 Lc56 Zettlr Berlin Light fg=#50505a bg=#c8c8c8
rail-btn-hover-idle    text4.5 9/28 fail (0 <3) worst 3.02 Lc43 Zettlr Berlin Light fg=#6e6e77 bg=#c8c8c8
rail-label             text4.5 0/28 fail (0 <3) worst 4.54 Lc61 Zettlr Bielefeld Light fg=#606068 bg=#dcdcdc
rail-label-hover       text4.5 0/28 fail (0 <3) worst 5.51 Lc61 Zettlr Bielefeld Light fg=#4a4a54 bg=#cdcdce
rail-muted             text4.5 0/28 fail (0 <3) worst 4.61 Lc61 Zettlr Bielefeld Light fg=#5f5f67 bg=#dcdcdc
nr-title-active        text4.5 21/28 fail (1 <3) worst 2.82 Lc28 Twilight Violet fg=#9a7bb9 bg=#483e55
nr-fg-active           text4.5 0/28 fail (0 <3) worst 5.22 Lc61 Zettlr Karl-Marx-Stadt Light fg=#50505a bg=#f2c7c7
nr-subtitle            text4.5 2/28 fail (0 <3) worst 4.27 Lc37 Twilight Violet fg=#908aa4 bg=#2c2a34
nr-subtitle-active     text4.5 22/28 fail (2 <3) worst 2.96 Lc31 Zettlr Bielefeld Dark fg=#91919a bg=#564432
nr-subtitle-hover      text4.5 10/28 fail (0 <3) worst 3.75 Lc35 Twilight Violet fg=#908aa4 bg=#373242
nr-pill                text4.5 10/28 fail (0 <3) worst 3.48 Lc32 Twilight Violet fg=#9a7bb9 bg=#373242
nr-pill-active         text4.5 26/28 fail (8 <3) worst 2.53 Lc26 Twilight Violet fg=#9a7bb9 bg=#50445f
nr-pill-link-hover     text4.5 20/28 fail (0 <3) worst 3.03 Lc30 Twilight Violet fg=#9a7bb9 bg=#423a4f
sr-both                text4.5 14/28 fail (0 <3) worst 3.26 Lc31 Twilight Violet fg=#9a7bb9 bg=#3c3648
sr-semantic            text4.5 14/28 fail (0 <3) worst 3.26 Lc31 Twilight Violet fg=#9a7bb9 bg=#3c3648
sr-text                text4.5 14/28 fail (5 <3) worst 2.52 Lc27 Zettlr Bordeaux Dark fg=#8f8f98 bg=#505050
sr-fuzzy               text4.5 19/28 fail (0 <3) worst 3.18 Lc48 Shimmering Focus Light fg=#108189 bg=#c2dadf
sr-fuzzy-off           text4.5 0/28 fail (0 <3) worst 4.58 Lc69 Tolaria Light fg=#71706d bg=#f7f6f3
sr-input               text4.5 0/28 fail (0 <3) worst 4.58 Lc69 Tolaria Light fg=#71706d bg=#f7f6f3
cal-sel                text4.5 0/28 fail (0 <3) worst 4.51 Lc33 Zettlr Berlin Light fg=#030305 bg=#12865e
cal-weekend            text4.5 8/28 fail (0 <3) worst 4.08 Lc63 Shimmering Focus Light fg=#108189 bg=#eff0f5
cal-weekend-hover      text4.5 11/28 fail (4 <3) worst 2.73 Lc39 Zettlr Berlin Light fg=#12865e bg=#c8c8c8
cal-header             text4.5 0/28 fail (0 <3) worst 4.50 Lc64 Lavender Haze fg=#6b6486 bg=#e8e7ec
cal-outside            text4.5 28/28 fail (28 <3) worst 1.67 Lc26 Zettlr Bielefeld Light fg=#b5b5b8 bg=#e8e8e8
cal-fg70               text4.5 6/28 fail (0 <3) worst 3.53 Lc56 Zettlr Bielefeld Light fg=#797980 bg=#e8e8e8
cal-today-ring         ui3 0/28 fail (0 <3) worst 4.08 Lc63 Shimmering Focus Light fg=#108189 bg=#eff0f5
cal-primary-vs-sel     ui3 0/28 fail (0 <3) worst 4.08 Lc63 Shimmering Focus Light fg=#108189 bg=#eff0f5
mp-muted-active        text4.5 11/28 fail (0 <3) worst 3.02 Lc43 Zettlr Berlin Light fg=#6e6e77 bg=#c8c8c8
mp-warn-active         text4.5 12/28 fail (0 <3) worst 3.05 Lc43 Zettlr Berlin Light fg=#886a0e bg=#c8c8c8
mp-warn                text4.5 0/28 fail (0 <3) worst 4.54 Lc64 Zettlr Bielefeld Light fg=#82640d bg=#e8e8e8
kb-overdue             text4.5 23/28 fail (1 <3) worst 2.96 Lc45 Willemstad Light fg=#e93147 bg=#edd2d5
kb-today               text4.5 14/28 fail (0 <3) worst 3.79 Lc55 Shimmering Focus Light fg=#896800 bg=#e0dcd0
kb-tomorrow            text4.5 16/28 fail (3 <3) worst 2.90 Lc46 Shimmering Focus Light fg=#cc632c bg=#eadbd7
kb-upcoming            text4.5 21/28 fail (0 <3) worst 3.05 Lc49 Zettlr Berlin Light fg=#237aff bg=#d6e3f6
kb-future              text4.5 14/28 fail (5 <3) worst 2.52 Lc27 Zettlr Bordeaux Dark fg=#8f8f98 bg=#505050
kb-check-border        ui3 28/28 fail (28 <3) worst 1.68 Lc28 Zettlr Berlin Light fg=#bfbfc3 bg=#f5f5f5
kb-viewmode            text4.5 13/28 fail (0 <3) worst 3.91 Lc37 Zettlr Frankfurt Dark fg=#5e97c7 bg=#30363c
kb-date-clear          ui3 28/28 fail (28 <3) worst 1.95 Lc32 Sakura fg=#b09ea5 bg=#eedede
kb-outside             text4.5 28/28 fail (28 <3) worst 1.68 Lc26 Sakura fg=#bdabb0 bg=#eedede
kb-ph                  text4.5 28/28 fail (27 <3) worst 1.94 Lc36 Tolaria Light fg=#b4b3b0 bg=#f7f6f3
kb-lane-muted          text4.5 6/28 fail (0 <3) worst 3.86 Lc37 Zettlr Berlin Dark fg=#91919a bg=#363637
col-tab-active         text4.5 0/28 fail (0 <3) worst 6.37 Lc73 Zettlr Karl-Marx-Stadt Light fg=#50505a bg=#fae0e0
col-tab-hover          text4.5 0/28 fail (0 <3) worst 4.82 Lc58 Zettlr Bordeaux Dark fg=#c8c8c8 bg=#505050
col-tab-idle           text4.5 0/28 fail (0 <3) worst 4.51 Lc38 Twilight Violet fg=#908aa4 bg=#282630
col-tab-idle-hover     text4.5 0/28 fail (0 <3) worst 4.82 Lc58 Zettlr Bordeaux Dark fg=#c8c8c8 bg=#505050
col-err                text4.5 14/28 fail (5 <3) worst 2.78 Lc25 Zettlr Berlin Dark fg=#cf413b bg=#3c2d2e
col-err-editor         text4.5 15/28 fail (5 <3) worst 2.78 Lc25 Zettlr Berlin Dark fg=#cf413b bg=#3c2d2e
col-cal-head           text4.5 12/28 fail (0 <3) worst 3.26 Lc33 Zettlr Berlin Dark fg=#91919a bg=#414142
col-filter-count       text4.5 15/28 fail (0 <3) worst 3.11 Lc45 Sakura fg=#bd4776 bg=#e7c7cf
col-today              text4.5 0/28 fail (0 <3) worst 4.51 Lc33 Zettlr Berlin Light fg=#030305 bg=#12865e
col-cell-fg            text4.5 0/28 fail (0 <3) worst 5.04 Lc59 Zettlr Bordeaux Dark fg=#c8c8c8 bg=#075563
col-ghost-icon-hover   ui3 0/28 fail (0 <3) worst 3.02 Lc43 Zettlr Berlin Light fg=#6e6e77 bg=#c8c8c8
tv-primary-hover       ui3 4/28 fail (4 <3) worst 2.73 Lc39 Zettlr Berlin Light fg=#12865e bg=#c8c8c8
bi-stable              text4.5 15/28 fail (0 <3) worst 3.13 Lc43 Lavender Haze fg=#357458 bg=#bbc4cb
bi-nightly             text4.5 15/28 fail (0 <3) worst 3.16 Lc43 Lavender Haze fg=#786714 bg=#c9c1be
bi-preview             text4.5 23/28 fail (5 <3) worst 2.78 Lc45 Zettlr Berlin Light fg=#c358c4 bg=#ebd6eb
bi-dev                 text4.5 19/28 fail (1 <3) worst 2.93 Lc42 Sakura fg=#bd4776 bg=#e4c0c9
bi-stable-card         text4.5 21/28 fail (0 <3) worst 3.50 Lc49 Lavender Haze fg=#357458 bg=#c6cfd3
bi-nightly-card        text4.5 16/28 fail (0 <3) worst 3.55 Lc49 Lavender Haze fg=#786714 bg=#d3cdc6
bi-preview-card        text4.5 19/28 fail (4 <3) worst 2.94 Lc28 Zettlr Berlin Dark fg=#c358c4 bg=#49344a
bi-dev-card            text4.5 17/28 fail (0 <3) worst 3.18 Lc31 Twilight Violet fg=#9a7bb9 bg=#3f374b
set-nav-active         text4.5 0/28 fail (0 <3) worst 4.82 Lc58 Zettlr Bordeaux Dark fg=#c8c8c8 bg=#505050
set-nav-hover          text4.5 0/28 fail (0 <3) worst 6.38 Lc73 Zettlr Berlin Light fg=#50505a bg=#e6e6e6
set-row-hover-muted    text4.5 15/28 fail (5 <3) worst 2.52 Lc27 Zettlr Bordeaux Dark fg=#8f8f98 bg=#505050
set-row-hover-text     text4.5 0/28 fail (0 <3) worst 4.82 Lc58 Zettlr Bordeaux Dark fg=#c8c8c8 bg=#505050
set-row-active         text4.5 6/28 fail (0 <3) worst 3.73 Lc56 Sakura fg=#bd4776 bg=#eedede
set-row-active-hover   text4.5 17/28 fail (3 <3) worst 2.58 Lc28 Zettlr Frankfurt Dark fg=#5e97c7 bg=#505050
set-pill               text4.5 14/28 fail (5 <3) worst 2.52 Lc27 Zettlr Bordeaux Dark fg=#8f8f98 bg=#505050
set-muted-item         text4.5 0/28 fail (0 <3) worst 4.51 Lc62 Sakura fg=#735f6c bg=#eedede
set-uptodate           text4.5 2/28 fail (0 <3) worst 3.97 Lc56 Lavender Haze fg=#357458 bg=#ddd8e8
diff-ins               text4.5 11/28 fail (0 <3) worst 3.42 Lc49 Sakura fg=#3e7751 bg=#d4cfc9
diff-del               text4.5 21/28 fail (6 <3) worst 2.69 Lc24 Zettlr Bordeaux Dark fg=#d3322f bg=#412932
quick-archived         text4.5 14/28 fail (5 <3) worst 2.52 Lc27 Zettlr Bordeaux Dark fg=#8f8f98 bg=#505050
quick-archived-hl      text4.5 14/28 fail (5 <3) worst 2.52 Lc27 Zettlr Bordeaux Dark fg=#8f8f98 bg=#505050
ao-off                 text4.5 14/28 fail (5 <3) worst 2.52 Lc27 Zettlr Bordeaux Dark fg=#8f8f98 bg=#505050
ev-locked              text4.5 14/28 fail (5 <3) worst 2.52 Lc27 Zettlr Bordeaux Dark fg=#8f8f98 bg=#505050
fh-bar                 text4.5 11/28 fail (0 <3) worst 3.42 Lc34 Zettlr Bordeaux Dark fg=#8f8f98 bg=#3c3c41
ev-today-hover         text4.5 15/28 fail (3 <3) worst 2.58 Lc28 Zettlr Frankfurt Dark fg=#5e97c7 bg=#505050
ev-today-primary       text4.5 0/28 fail (0 <3) worst 4.51 Lc33 Zettlr Berlin Light fg=#030305 bg=#12865e
ev-muted-hover         text4.5 14/28 fail (5 <3) worst 2.52 Lc27 Zettlr Bordeaux Dark fg=#8f8f98 bg=#505050
ev-fg-primary15        text4.5 0/28 fail (0 <3) worst 5.94 Lc69 Zettlr Bielefeld Light fg=#50505a bg=#e5dece
editorview-btn         text4.5 0/28 fail (0 <3) worst 4.62 Lc69 Zettlr Bielefeld Light fg=#6e6e77 bg=#f5f5f2
editorview-btn-hover   text4.5 0/28 fail (0 <3) worst 4.82 Lc58 Zettlr Bordeaux Dark fg=#c8c8c8 bg=#505050
graph-label            text4.5 0/28 fail (0 <3) worst 4.62 Lc70 Tolaria Light fg=#71706d bg=#f8f7f4
toc-hover              text4.5 12/28 fail (0 <3) worst 3.61 Lc55 Shimmering Focus Light fg=#108189 bg=#d8e5ea
rs-title               text4.5 7/28 fail (0 <3) worst 4.08 Lc63 Shimmering Focus Light fg=#108189 bg=#eff0f5
rs-prop-val            text4.5 6/28 fail (0 <3) worst 3.71 Lc65 Zettlr Berlin Light fg=#84848b bg=#ffffff
rs-prop-val-hover      text4.5 10/28 fail (5 <3) worst 2.77 Lc40 Zettlr Berlin Light fg=#74747b bg=#c8c8c8
rs-prop-val-bool       text4.5 6/28 fail (0 <3) worst 3.55 Lc60 Zettlr Berlin Light fg=#818188 bg=#f5f5f5
rs-chip-text           text4.5 0/28 fail (0 <3) worst 4.70 Lc73 Zettlr Berlin Light fg=#73737b bg=#ffffff
rs-chip-ph             text4.5 28/28 fail (28 <3) worst 1.46 Lc19 Lavender Haze fg=#c4bfd1 bg=#eae6f2
rs-add-prop            text4.5 28/28 fail (21 <3) worst 2.25 Lc43 Tolaria Light fg=#a7a6a3 bg=#f7f6f3
rs-add-prop-hover      text4.5 5/28 fail (0 <3) worst 3.75 Lc56 Zettlr Berlin Light fg=#6e6e77 bg=#dedede
rs-plus                ui3 21/28 fail (21 <3) worst 2.25 Lc43 Tolaria Light fg=#a7a6a3 bg=#f7f6f3
rs-muted               ui3 0/28 fail (0 <3) worst 4.08 Lc39 KokoBrain Default fg=#8a96b1 bg=#333544
bg-sel-primary-resize  ui3 21/28 fail (21 <3) worst 1.91 Lc10 Willemstad Dark fg=#090909 bg=#2f4345
date-input             text4.5 5/28 fail (0 <3) worst 3.71 Lc65 Zettlr Berlin Light fg=#84848b bg=#ffffff
destr-popover          text4.5 12/28 fail (1 <3) worst 2.96 Lc26 Zettlr Bordeaux Dark fg=#d3322f bg=#282832
destr-settings         text4.5 12/28 fail (0 <3) worst 3.01 Lc26 Zettlr Berlin Dark fg=#cf413b bg=#2b2b2c
destr-settings-item    text4.5 12/28 fail (0 <3) worst 3.39 Lc27 Zettlr Bordeaux Dark fg=#d3322f bg=#1e1e1e
destr-editor           text4.5 10/28 fail (0 <3) worst 3.01 Lc26 Zettlr Berlin Dark fg=#cf413b bg=#2b2b2c
destr-fe               ui3 0/28 fail (0 <3) worst 3.39 Lc27 Zettlr Bordeaux Dark fg=#d3322f bg=#1e1e1e
destr-auto             text4.5 12/28 fail (0 <3) worst 3.39 Lc27 Zettlr Bordeaux Dark fg=#d3322f bg=#1e1e1e
primary-on-card        text4.5 5/28 fail (0 <3) worst 4.08 Lc63 Shimmering Focus Light fg=#108189 bg=#eff0f5
select-ph              text4.5 6/13 fail (0 <3) worst 3.85 Lc36 Zettlr Bordeaux Dark fg=#8f8f98 bg=#34343b
rail-sel-badge         text4.5 21/28 fail (0 <3) worst 3.09 Lc32 KokoBrain Default fg=#8a8faa bg=#3e425b
rail-badge             text4.5 0/28 fail (0 <3) worst 4.50 Lc64 Lavender Haze fg=#6b6486 bg=#e8e7ec
status                 text4.5 0/28 fail (0 <3) worst 4.50 Lc37 KokoBrain Default fg=#7c89a8 bg=#21222e
```
