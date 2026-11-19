# Scout 09: collection views (table, calendar, linear-calendar chrome, expression display functions, block widget)

Scripts and raw output: `/private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-09-collection-views/` (`lib.mts`, `main.mts`, `main2.mts`, `badge.mts`, `inp.mts`, `extra.mts`, `out.json`, `out2.json`).

## Scope and what exists

Collection has three view types only: table, calendar, linear-calendar (no cards or board; kanban is a plugin, other scout). Two renderers:
- Svelte views (`CollectionView.svelte`, `CollectionTableView.svelte`, `CollectionCalendarView.svelte`, `CollectionLinearCalendarView.svelte`, `toolbar/*`), surface `bg-card` (CollectionView.svelte:517), panels on `--popover`.
- Live-preview widget (`collection-block-widget.ts` + `.cm-lp-collection-*` rules in `live-preview/styles.ts:600-678`), surface `--lp-collection-bg` over `--editor-bg`; the widget has table and calendar and linear calendar only.
- Expression display functions in `expression/evaluator.ts` (`badge`, `progress`, `color`), rendered by both (HTML string, sanitized by DOMPurify with `style` allowed, so the inline colors do reach the screen).

Excluded per brief: linear-calendar event bar fill/text (labelColors, commit aede19baa). kb.ui.* (other scout / in flight).

## Method

1. Resolved each theme from `theme-tokens.json` `cssVars` (all 28 carry every var used here). Tailwind `/NN` modifiers treated as the token at alpha NN composited in sRGB over the real surface stack (`color-mix(in oklab, X NN%, transparent)` is the same color at alpha NN).
2. Surface stacks:
   - widget cell: `--editor-bg` -> `--lp-collection-bg` (flattened); even rows add `--lp-collection-table-alt` (8-digit hex alpha); th uses `--lp-collection-table-header-bg`; hover `--lp-collection-table-hover`.
   - Svelte: `--card`; even rows `muted/20`; hover rows `muted/50`; calendar header `muted/60`; out-of-month cells `muted/20`; today `primary/5`; panels `--popover`.
   - badge chip: `rgba(palette,0.15)` over the stack, text is the raw `rgb(palette)` (COLOR_PRESET_TEXT).
3. WCAG ratio from `color-tools.mts` `contrastRatio` (alpha composited); APCA copied from the same file (not exported). Thresholds: text 4.5, meaningful icon/non-text 3.
4. Traced every token to its origin: `theme-builder.logic.ts` (`collectionNull`/`collectionEmpty` = `p.faintFg` at :283-284; `faintFg` is `c.preview.taskBorder`, :310), `app.css:328-339`, `theme.logic.ts` built-ins.
5. Compared the fix already used for kanban chips: `COLOR_PRESET_CHIP_TEXT` (color-presets.ts:37, the preset moved 70% toward `--editor-fg`). Applied to the same chip: 4.23 to 14.96 across all 28 themes and 7 hues, 10 of 392 combos on the widget surface still under 4.5 (yellow and green, min 4.23), 0 on the card surface. So reusing it fixes `badge()` on cards; the widget surface needs a small extra clamp.

## Findings (measured)

### F1. Widget "null/empty" text uses `faintFg` (a border color) as text color. HIGH
- Elements: null-cell dash `—` in table rows (styles.ts:657), empty state "No results match the current filters" / "No dated entries" (styles.ts:670), footer "Showing N of M" (styles.ts:676), "1 of N views" hint (styles.ts:619), `+N` overflow in calendar cell (collection-block-widget.ts:298), month names and `+N` lane count in the linear calendar (collection-block-widget.ts:373).
- Token: `--lp-collection-null` and `--lp-collection-empty`, both `p.faintFg` (theme-builder.logic.ts:283-284). `faintFg` is also the task-checkbox border, so themes keep it near the surface on purpose. READABILITY_PAIRS (theme-builder.logic.ts:144-146) covers collectionHeader, TableHeaderText and Loading but not Null or Empty.
- On `--lp-collection-bg`: 27 of 28 themes under 4.5, 21 under 3. Light 1.33 (Sakura) to 4.55; dark 1.75 (Twilight Violet) to 3.86. Built-ins: Lavender Haze 1.37, KokoBrain Default 2.46 (`#585b70` on `#1e1e2e`, app.css:336/328). Zettlr light family 1.53, Zettlr dark family 2.09. Only Lumen Contrast passes (4.55). APCA Lc 8 to 28 in the failing dark and Sakura/Lavender Haze cases.
- Even rows (alt tint) slightly worse; Lumen Contrast then fails too (4.43), so 28 of 28.
- Fix: app. Derive collectionNull/collectionEmpty from mutedFg (or `ensureContrast(faintFg, collectionBg, 4.5)`), add the two pairs to READABILITY_PAIRS and the built-in themes. Themes repo needs no change if the app clamps.

### F2. `badge()` display function: raw palette color as text on its own 15% tint. HIGH
- evaluator.ts:444-450 (`COLOR_PRESET_TEXT` fg on `COLOR_PRESET_BG`), shown in the Svelte table (CollectionTableView.svelte:84 `{@html}`) and the widget table cell (collection-block-widget.ts `td.innerHTML`). Font 0.85em weight 500.
- Same defect as the kanban chip fixed in f6ef510a0; the fix (`COLOR_PRESET_CHIP_TEXT`) was never applied here.
- On `--card` (Svelte table), light themes (15), worst Lavender Haze: blue 2.18-2.64, green 1.79-2.14, red 2.57-3.10, orange 1.86-2.23, purple 2.69-3.23, yellow 1.45-1.74, gray 1.93-2.32. Dark themes (13): red 2.80-4.41, purple 2.66-4.26, blue 3.20-5.17, gray 3.59-5.86, green 3.86-6.29, orange 3.76-6.08, yellow 4.65-7.63. 28/28 fail for red and purple; 27/28 blue.
- On widget surface: light 1.29 (yellow) to 3.00; dark red 3.42-4.29, purple 3.26-4.06, blue 3.97-4.92. Even rows similar. APCA Lc 11 to 54 (yellow on light Lc 11 to 18).
- Fix: app. Use `COLOR_PRESET_CHIP_TEXT` for the badge text (verified 0 failures on cards; widget min 4.23, so clamp with ensureContrast or use a slightly stronger mix).

### F3. `color()` and `progress()` display functions use raw palette on the surface. HIGH (light themes)
- evaluator.ts:459-464 `color(text, name)`: `rgb(palette)` text, no background. On `--card` light themes: yellow 1.56-1.92, green 1.98-2.43, orange 2.08-2.55, gray 2.13-2.61, blue 2.49-3.05, red 3.06-3.76, purple 3.12-3.83; dark: red 3.19-5.09 and purple 3.14-5.01 (12 of 13 dark themes fail 4.5), blue 3.93-6.28. Widget surface: light blue 2.19, yellow 1.38.
- evaluator.ts:451-458 `progress()`: percent label `rgb(160,160,160)` at 0.85em: light 2.13-2.61 on card, 1.88-2.42 in widget (15 of 15 light fail); dark passes (4.59-7.33). Bar fill vs the `rgba(160,160,160,.2)` track and vs the surface: meaningful non-text 3:1; yellow fill vs surface 1.38-1.92, green 1.74-2.43, orange 1.83-2.55, gray 1.88-2.61 on all light themes; fill vs track worse (yellow 1.23 Lavender Haze).
- Fix: app. For text use the chip-text mix (or ensureContrast against the live surface); for bar fill either darken light themes or add a 1px outline/track at 3:1. The percent label can use `--muted-foreground`.

### F4. Widget calendar: out-of-month cells dimmed with `opacity:.35`, including event pills. MEDIUM
- collection-block-widget.ts:271 `td.style.opacity = '0.35'` on the whole td: day number and any event pills (pill text is the clickable note title).
- `--editor-fg` at .35 on `--lp-collection-bg`: 26 of 28 under 3:1; light 1.76-2.40, dark 2.37-3.11 (Willemstad Dark 3.11, KokoBrain 3.06 pass 3 only). Pill text vs pill (alt tint at .35): 1.72 to 3.11. APCA Lc 16-44.
- Fix: app. Dim only the day number (and keep it at >=3:1), not the pills; or use `--muted-foreground` without opacity.

### F5. Svelte calendar: out-of-month day numbers `text-muted-foreground/40` on `bg-muted/20`. MEDIUM
- CollectionCalendarView.svelte:144, 12px day numbers. 28 of 28 themes fail, 1.69 (Zettlr Berlin/Bielefeld/Bordeaux/Frankfurt/Karl-Marx-Stadt Light) to 2.37 (Shimmering Focus Dark); Lavender Haze 1.73, KokoBrain Default 2.02. Lc 10-42.
- These numbers are information (adjacent month dates), not disabled controls. Fix: app, raise to `/70` or use muted-foreground and rely on the cell tint for the "other month" cue.

### F6. Calendar and linear-calendar header cells: `text-muted-foreground` on `bg-muted/60`. MEDIUM
- CollectionCalendarView.svelte:119 (12px uppercase weekday names), CollectionLinearCalendarView.svelte:147 and :152 (11px day numbers 1-31).
- 12 of 28 under 4.5: Tolaria Light 4.46, Zettlr Berlin/Bielefeld/Bordeaux/Frankfurt/Karl-Marx-Stadt Light 4.20, Twilight Violet 4.12, Zettlr dark family 3.26-3.32 (Lc 33). Passes everywhere on plain `--card` (min 4.51), so the muted tint is what costs it.
- Fix: app. Use `bg-muted/30` or `text-foreground/70` for header text; or have theme-builder test mutedForeground against muted at 60%.

### F7. Filter panel count pill: `text-primary` on `bg-primary/15` at 11px semibold. MEDIUM
- FilterPanel.svelte:96 and :162 (`text-label font-semibold`, 11px) on `--popover`.
- 15 of 28 under 4.5: Sakura 3.11, KokoBrain Default 3.78, Graphite Violet 3.50, Shimmering Focus Light 3.74, Willemstad Dark 3.43, Twilight Violet 4.06, Zettlr Berlin Light 3.77 (and others 3.77-4.65); min 3.11, none under 3. Lc 28-74.
- Same pattern (primary on its own tint) used elsewhere in the app, likely in other scouts. Fix: app, use `text-foreground` on the tint (S9b active tab already does it: min 6.37) or a darkened primary.

### F8. Destructive text and tint: `text-destructive`, alone and on `bg-destructive/10`. MEDIUM
- CollectionView.svelte:520 and :716 (error panels, 14px, `bg-destructive/10` over `--card`): 14 of 28 under 4.5, 5 under 3: Zettlr Berlin/Bielefeld/Frankfurt/Karl-Marx-Stadt Dark 2.78, Bordeaux Dark 2.95, KokoBrain Default 3.19, Lavender Haze 3.62, Sakura 3.83.
- FormulaRow.svelte:72, :83 and FilterRow.svelte:116 (`text-meta` 12px messages on `--popover`): 12 of 28 under 4.5, min 2.96. Same `--destructive` token; on plain `--card` also 12 of 28 (min 3.01).
- Fix: both. Test `--destructive` as text against card/popover in READABILITY_PAIRS and clamp it in the builder; app can add `text-destructive` darkening on dark themes.

### F9. Widget error text `--lp-collection-error` on `--lp-collection-bg`. MEDIUM
- styles.ts:660 (`.cm-lp-collection-error`, shown for filter errors, collection-block-widget.ts:170) and styles.ts:900-961 (other widgets reuse it).
- `collectionError: p.error` (theme-builder.logic.ts:283) and no READABILITY_PAIRS entry. 11 of 28 under 4.5: Zettlr Bordeaux Dark 3.39, Zettlr Berlin/Bielefeld/Frankfurt/KMS Dark 3.55, Lavender Haze 3.66, Willemstad Light 3.62, Shimmering Focus Light 3.69, Tolaria Light 3.82, Sakura 3.97, Shimmering Focus Dark 4.42. Font 0.9em of 0.85em, about 11px.
- Fix: app, add pair and clamp.

### F10. Toolbar result count `text-muted-foreground/60`. MEDIUM
- CollectionView.svelte:613 ("N results, M without <prop>", 12px) on `--card`: 28 of 28 under 4.5, 21 under 3; 2.35 (Tolaria Light) to 3.77, Lavender Haze about 2.4. Lc 19-63.
- Fix: app, plain `text-muted-foreground` (passes 4.51+).

### F11. Icon-only row actions and drag handle at `text-muted-foreground/50`. MEDIUM (low if hover reveals)
- PropertiesPanel.svelte:135 and :142 (edit and remove formula), FormulaRow.svelte:91 and :98, SortPanel.svelte:91 (drag handle), 12px icons on `--popover`: 28 of 28 under 3:1, 1.95 to 2.96; on hover row `--accent` 1.66-2.82. They are the only affordance (no text).
- Fix: app, `/70` minimum or plain muted-foreground at rest.

### F12. Table null placeholder `text-muted-foreground/50` em dash. LOW
- CollectionTableView.svelte:73 on `--card`: 28 of 28 under 4.5, 27 under 3 (2.00 Tolaria Light to 3.02). Intentional "empty" marker, but the widget equivalent (F1) is the same case. Fix: app, `/70`.

### F13. Input and select borders in toolbar controls. MEDIUM, app-wide pattern
- `border-input bg-background` on every filter/sort/formula/calendar-config control: FilterRow.svelte:102, :126, :168, :189; FormulaRow.svelte:42, :48, :80; SortPanel.svelte:102; CalendarConfigPanel.svelte:53, :75, :101, :125; FilterPanel.svelte:108, :175. `--input` is `p.borderStrong` (theme-builder.logic.ts:237).
- Border vs `--popover`: 26 of 28 under 3:1, 1.06 (Sakura) to 3.83; the fill (`--background`) vs popover is 1.00-1.38, so neither border nor fill identifies the field. Only Lumen Contrast 4.29 and Willemstad Light 3.95 pass. KokoBrain Default 1.24, Lavender Haze 1.51.
- Also a default shadcn pattern in the rest of the app, so other scouts should hit it. Fix: both (builder `borderStrong` clamp to 3:1 against editor/popover; themes repo palette).

### F14. `text-primary` as small text on the card and widget. LOW
- Month label button CollectionCalendarView.svelte:91 and linear year label CollectionLinearCalendarView.svelte:104 (18px bold, just under the 18.66px large-text size): 4 of 28 under 4.5 (Sakura 4.15, Twilight Violet 4.19, Shimmering Focus Light 4.30, Willemstad Dark 4.34); on the hover bg `--accent` 11 of 28 under 4.5 (min 2.73 Zettlr Berlin Light).
- Table link CollectionTableView.svelte:78: on `--card` same 4; on the row hover tint `muted/50` 12 of 28 (Zettlr Frankfurt Dark 3.43); `hover:text-primary/80` makes it worse: 21 of 28 under 4.5, min 2.70 (Zettlr Karl-Marx-Stadt Dark), Sakura 2.89.
- Widget today day number collection-block-widget.ts:279 (`--primary`, bold about 11px) on `--lp-collection-bg`: 6 of 28 under 4.5, Sakura 3.73, Shimmering Focus Light 4.08, Willemstad Dark 4.18, Zettlr Berlin Light 4.19.
- Root cause is `--primary` tested only against editorBg. Fix: both; drop `/80` on hover (use underline or `brightness`), builder pair primary vs card and collectionBg.

### F15. Linear-calendar legend swatches. LOW
- CollectionLinearCalendarView.svelte:132-133, `barColors(...).fill` square (12px) vs `--card`, meaningful non-text 3:1. The five light fills (green `#47d18c`, amber `#e6bf4c`, teal `#4dcbcb`, lime `#8cc653`, yellow `#d7d742`) fail on all 15 light themes (1.25-1.66, Lavender Haze green 1.59, yellow 1.25); the darkened fills (`#407ab4` etc.) fail on 2 dark themes (Graphite Violet 2.62-2.67 and one more). The bars share the fill, so the same applies to bar identity against the surface, but the bar carries its own text. Fix: app, give the swatch a 1px border (`color-mix` of text) or a ring.

## Passed

- Widget: `--lp-collection-header` on bg (4.58+), table header text on header bg (4.53+), loading text (4.58+), `--editor-fg` body text on block bg, even rows, hover rows and pills (6.50 to 19+), 28 of 28.
- Svelte: day number `foreground/80` on card (4.70+), today `primary-foreground` on `primary` (4.51+), event chip `foreground` on `primary/15`, also over muted/20 and with hover `primary/25` over `primary/5` (4.57+), "+N more" and header `muted-foreground` on card (4.51+), chevrons 3:1 (4.51+), active tab `foreground` on `primary/15` (6.37+), tab hover `foreground` on `muted` (4.82+), placeholder on background (4.58+), collapsible trigger text on popover (4.51+), checked checkbox `primary` vs popover (3.73+), `hover:text-destructive` icon on accent (1 theme at 2.96, 3:1 icon), `aria-invalid` destructive border vs popover (1 theme at 2.96).
- Fallback linear bar `primary-foreground` on `primary` (4.51+).

## Not checked

- Runtime pixels: nothing was rendered; ratios are computed from tokens and traced CSS. `.cm-content` text color assumed to be `--editor-fg` for widget inherited text.
- Hover and focus states of the tabs and menu items beyond those listed; disabled controls; context-menu text.
- `value.__display === 'link'` in the widget table (widget ignores link/icon/image displays); sanitized user HTML inside cells beyond the three display functions.
- Collection `colorProperty` palette colors for the Svelte month calendar (it does not use them).
- Tailwind opacity modifiers are approximated as sRGB alpha, which is how the browser composites them.
