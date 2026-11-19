# Scout 03: faded text (opacity modifiers on text)

Read-only audit. Scripts and raw output live in
/private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-03-faded-text/
(lib.mts, measure.mts, qjs.mts, events.mts, tag.mts, results.json, table.txt, qjs.txt, events.txt, tag.txt).

## Method

1. Enumerated every faded-text source under src (excluding src/tests) with grep:
   - Tailwind alpha on text/placeholder/fill/stroke utilities (`text-X/NN`, `placeholder:text-X/NN`): 32 hits.
   - `opacity-NN` utilities: 80 hits (most are `opacity-0` hover reveals, `disabled:opacity-50`, icons).
   - Inline and stylesheet `opacity: 0.N` in .svelte, .ts DOM builders and CSS: 29 hits + live-preview/styles.ts string values.
   - `color-mix(... transparent)` / rgba text colors: only app.css:480-481 (date inputs, 70%).
   No `style:opacity`, `fill-opacity`, `stroke-opacity` usage.
2. Traced each site to its real fg token and the surface stack behind it (read the component, parent classes, app.css derived tokens).
   - nav-bg / rail-bg derived as in app.css: light themes nav = file-explorer-bg, rail = 4% toward black; dark themes nav = file-explorer-bg L-0.03, rail L-0.06 (OKLab approximation of `oklch(from ...)`).
   - Event colors: `color-mix(in oklab, X 25%, editor-bg)` / `X 30%, editor-fg` via mixColors.
   - Opacity on a container is equivalent to a translucent fg over the surface; when the container also has a background (archived events, tag cloud chips) both fg and bg were faded and flattened over the surface behind.
3. For each of the 28 themes: flatten faded fg over bg, WCAG 2 ratio (color-tools contrastRatio) and APCA Lc (APCA-W3 0.0.98G, own implementation). Threshold 4.5 for text, 3 for meaningful icons.
4. Light = 15 themes, dark = 13 (per the `dark` flag).

Surface assumptions that matter:
- Editor-hosted views (collection toolbar/table/calendar, action bar): `--editor-bg`.
- QueryJS blocks and the collection calendar widget render on `--lp-collection-bg` (live-preview/styles.ts:923-931); text inherits `--editor-fg`. results.json rows `kbui-*`, `lp-qjs-*`, `collblock-*`, `lp-embed-*` used editor-bg/embed-bg first; the corrected numbers are in qjs.txt and are the ones quoted in findings.
- Canvas nodes: `--card` (TextNode.svelte:91-99, FileNode.svelte:98-107, ImageNode.svelte), canvas menus/picker: `--background`.

## Measurements (worst case and fail counts; fails counted against 4.5 unless icon = 3)

Format: case [file:line] alpha, fails/28 (light/15, dark/13), worst light, worst dark.
Full per-theme data: results.json.

```
cal-nav-other-month [plugins/calendar/CalendarGrid.svelte:58] a=0.4 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Zettlr Bielefeld Light 1.67 Lc26 (#b5b5b8 on #e8e8e8)  worstDark KokoBrain Default 1.91 Lc-11  best 2.42
cal-nav-week-number [plugins/calendar/CalendarGrid.svelte:31] a=0.7 thr=4.5 fails 5/28 (light 5/15, dark 0/13)  worstLight Zettlr Berlin Light 3.55 Lc60 (#818188 on #f5f5f5)  worstDark Shimmering Focus Dark 5.40 Lc-44  best 8.93
coll-cal-other-month [features/collection/CollectionCalendarView.svelte:144] a=0.4 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Zettlr Bielefeld Light 1.65 Lc26 (#bbbbba on #eeeee6)  worstDark Zettlr Bordeaux Dark 1.80 Lc-11  best 2.40
coll-cal-current-month [features/collection/CollectionCalendarView.svelte:144] a=0.8 thr=4.5 fails 1/28 (light 1/15, dark 0/13)  worstLight Zettlr Bielefeld Light 4.35 Lc66 (#717176 on #f3f3e8)  worstDark Zettlr Bordeaux Dark 6.26 Lc-51  best 12.63
kanban-placeholder [plugins/kanban/KanbanView.svelte:607, KanbanLane.svelte:418] a=0.5 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Tolaria Light 1.94 Lc36 (#b4b3b0 on #f7f6f3)  worstDark Twilight Violet 2.23 Lc-15  best 3.06
kanban-date-icons [plugins/kanban/KanbanDatePicker.svelte:67,79] a=0.5 thr=3 fails 27/28 (light 15/15, dark 12/13)  worstLight Tolaria Light 1.94 Lc36 (#b4b3b0 on #f7f6f3)  worstDark Twilight Violet 2.23 Lc-15  best 3.06
sortpanel-grip [features/collection/toolbar/SortPanel.svelte:91] a=0.5 thr=3 fails 28/28 (light 15/15, dark 13/13)  worstLight Sakura 1.95 Lc32 (#b09ea5 on #eedede)  worstDark Zettlr Bordeaux Dark 2.20 Lc-16  best 2.96
coll-table-null-dash [features/collection/CollectionTableView.svelte:73] a=0.5 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Zettlr Bielefeld Light 1.94 Lc35 (#b0b0af on #f3f3e8)  worstDark Zettlr Bordeaux Dark 2.17 Lc-15  best 3.07
formula/props-panel-icons [FormulaRow.svelte:91,98 PropertiesPanel.svelte:135,142] a=0.5 thr=3 fails 28/28 (light 15/15, dark 13/13)  worstLight Sakura 1.95 Lc32 (#b09ea5 on #eedede)  worstDark Zettlr Bordeaux Dark 2.20 Lc-16  best 2.96
coll-results-count [features/collection/CollectionView.svelte:613] a=0.6 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Zettlr Bielefeld Light 2.26 Lc42 (#a3a3a4 on #f3f3e8)  worstDark Zettlr Bordeaux Dark 2.56 Lc-19  best 3.84
prop-checkbox-value [features/properties/PropertyField.svelte:131] a=0.7 thr=4.5 fails 6/28 (light 6/15, dark 0/13)  worstLight Zettlr Berlin Light 3.55 Lc60 (#818188 on #f5f5f5)  worstDark Shimmering Focus Dark 5.27 Lc-44  best 8.89
prop-input-value [PropertyField.svelte:139 / PropertiesView.svelte:176] a=0.7 thr=4.5 fails 6/28 (light 6/15, dark 0/13)  worstLight Zettlr Berlin Light 3.71 Lc65 (#84848b on #ffffff)  worstDark Zettlr Bordeaux Dark 5.11 Lc-42  best 9.14
prop-list-item [PropertyField.svelte:174] a=0.8 thr=4.5 fails 0/28 (light 0/15, dark 0/13)  worstLight Zettlr Berlin Light 4.70 Lc73 (#73737b on #ffffff)  worstDark Zettlr Bordeaux Dark 6.26 Lc-51  best 12.07
prop-list-placeholder [PropertyField.svelte:191] a=0.3 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Lavender Haze 1.46 Lc19 (#c4bfd1 on #eae6f2)  worstDark Zettlr Bordeaux Dark 1.56 Lc0  best 1.91
prop-plus-icon [PropertiesView.svelte:224] a=0.6 thr=3 fails 21/28 (light 14/15, dark 7/13)  worstLight Tolaria Light 2.25 Lc43 (#a7a6a3 on #f7f6f3)  worstDark Twilight Violet 2.53 Lc-19  best 3.82
prop-add-property-label [PropertiesView.svelte:235] a=0.6 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Tolaria Light 2.25 Lc43 (#a7a6a3 on #f7f6f3)  worstDark Zettlr Bordeaux Dark 2.75 Lc-20  best 3.82
rail-row-label [features/rail-shell/Rail.svelte:382] a=0.85 thr=4.5 fails 0/28 (light 0/15, dark 0/13)  worstLight Zettlr Bielefeld Light 4.54 Lc61 (#606068 on #dcdcdc)  worstDark Twilight Violet 8.07 Lc-60  best 13.59
input-typed-text [components/ui/input/input.svelte:43 (text-foreground/80)] a=0.8 thr=4.5 fails 0/28 (light 0/15, dark 0/13)  worstLight Zettlr Berlin Light 4.70 Lc73 (#73737b on #ffffff)  worstDark Zettlr Bordeaux Dark 6.26 Lc-51  best 12.07
welcome-allowed-locations [routes/(app)/+page.svelte:44] a=0.8 thr=4.5 fails 5/28 (light 5/15, dark 0/13)  worstLight Zettlr Berlin Light 4.44 Lc68 (#717179 on #f5f5f5)  worstDark Shimmering Focus Dark 6.40 Lc-52  best 11.38
welcome-icons [routes/(app)/+page.svelte:48,57] a=0.5 thr=3 fails 27/28 (light 15/15, dark 12/13)  worstLight Tolaria Light 1.94 Lc36 (#b4b3b0 on #f7f6f3)  worstDark Twilight Violet 2.23 Lc-15  best 3.06
date-input-fg70-foreground-on-input [app.css:480] a=0.7 thr=4.5 fails 5/28 (light 5/15, dark 0/13)  worstLight Zettlr Berlin Light 3.71 Lc65 (#84848b on #ffffff)  worstDark Zettlr Bordeaux Dark 5.11 Lc-42  best 9.14
date-input-fg70-sidebar [app.css:480 + PropertyField.svelte:140] a=0.7 thr=4.5 fails 6/28 (light 6/15, dark 0/13)  worstLight Zettlr Berlin Light 3.71 Lc65 (#84848b on #ffffff)  worstDark Zettlr Bordeaux Dark 5.11 Lc-42  best 9.14
actionbar-chevron [features/note-action-bar/NoteActionBar.svelte:150] a=0.6 thr=3 fails 17/28 (light 11/15, dark 6/13)  worstLight Zettlr Bielefeld Light 2.26 Lc42 (#a3a3a4 on #f3f3e8)  worstDark Zettlr Bordeaux Dark 2.56 Lc-19  best 3.84
outgoing-unresolved-destructive [features/outgoing-links/OutgoingLinksPanel.svelte:74] a=0.6 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Tolaria Light 2.30 Lc43 (#ec8886 on #f7f6f3)  worstDark Zettlr Bordeaux Dark 1.95 Lc-12  best 3.58
outgoing-unresolved-heading [OutgoingLinksPanel.svelte:74-80] a=0.6 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Tolaria Light 2.25 Lc43 (#a7a6a3 on #f7f6f3)  worstDark Twilight Violet 2.53 Lc-19  best 3.82
prop-relation-unresolved [features/properties/PropertiesView.svelte:273] a=0.5 thr=4.5 fails 23/28 (light 15/15, dark 8/13)  worstLight Zettlr Berlin Light 2.33 Lc44 (#a2a2a7 on #f5f5f5)  worstDark Shimmering Focus Dark 3.43 Lc-28  best 5.06
filehistory-timestamp [features/file-history/FileHistoryDialog.svelte:83] a=0.5 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Zettlr Berlin Light 1.87 Lc32 (#ababaf on #e8e8e8)  worstDark Zettlr Bordeaux Dark 1.99 Lc-15  best 2.96
search-slow-results [features/search/SearchPanel.svelte:292] a=0.5 thr=4.5 fails 22/28 (light 15/15, dark 7/13)  worstLight Zettlr Berlin Light 2.33 Lc44 (#a2a2a7 on #f5f5f5)  worstDark Shimmering Focus Dark 3.43 Lc-28  best 5.06
select-chevron/search-icon [ui/select-trigger.svelte:28, ui/command-input.svelte:19, collection toolbars] a=0.5 thr=3 fails 27/28 (light 15/15, dark 12/13)  worstLight Tolaria Light 2.00 Lc39 (#b8b7b6 on #ffffff)  worstDark Twilight Violet 2.17 Lc-15  best 3.02
semantic-status-icon [features/search/SemanticIndexStatus.svelte:63,65] a=0.6 thr=3 fails 20/28 (light 14/15, dark 6/13)  worstLight Tolaria Light 2.25 Lc43 (#a7a6a3 on #f7f6f3)  worstDark Twilight Violet 2.57 Lc-19  best 3.82
dialog-close-icon [ui/dialog/dialog-content.svelte:38] a=0.7 thr=3 fails 0/28 (light 0/15, dark 0/13)  worstLight Zettlr Berlin Light 3.55 Lc60 (#818188 on #f5f5f5)  worstDark Shimmering Focus Dark 5.27 Lc-44  best 8.89
kbui-opacity-0.7 [plugins/queryjs/kb-ui.ts:133,369] a=0.7 thr=4.5 fails 5/28 (light 5/15, dark 0/13)  worstLight Zettlr Bielefeld Light 3.48 Lc59 (#818184 on #f3f3e8)  worstDark Zettlr Bordeaux Dark 5.11 Lc-42  best 9.29
kbui-opacity-0.6 [plugins/queryjs/kb-ui.ts:215,228,339] a=0.6 thr=4.5 fails 14/28 (light 13/15, dark 1/13)  worstLight Zettlr Bielefeld Light 2.82 Lc51 (#919193 on #f3f3e8)  worstDark Zettlr Bordeaux Dark 4.12 Lc-34  best 6.98
kbui-opacity-0.5 [plugins/queryjs/kb-ui.ts:390] a=0.5 thr=4.5 fails 27/28 (light 15/15, dark 12/13)  worstLight Zettlr Bielefeld Light 2.31 Lc43 (#a1a1a1 on #f3f3e8)  worstDark Zettlr Bordeaux Dark 3.31 Lc-27  best 5.10
lp-formatting-block-0.6 [live-preview/styles.ts:109] a=0.6 thr=4.5 fails 14/28 (light 13/15, dark 1/13)  worstLight Zettlr Bielefeld Light 2.82 Lc51 (#919193 on #f3f3e8)  worstDark Zettlr Bordeaux Dark 4.12 Lc-34  best 6.98
lp-hard-break-0.5 [live-preview/styles.ts:140] a=0.5 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Zettlr Bielefeld Light 1.67 Lc28 (#d5b999 on #f3f3e8)  worstDark Zettlr Karl-Marx-Stadt Dark 1.60 Lc-9  best 3.24
lp-link-ref-def-0.5 [live-preview/styles.ts:150] a=0.5 thr=4.5 fails 27/28 (light 15/15, dark 12/13)  worstLight Zettlr Bielefeld Light 2.31 Lc43 (#a1a1a1 on #f3f3e8)  worstDark Zettlr Bordeaux Dark 3.31 Lc-27  best 5.10
lp-block-ref/inline-comment-0.5 [live-preview/styles.ts:588,595] a=0.5 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Zettlr Bielefeld Light 1.67 Lc28 (#d5b999 on #f3f3e8)  worstDark Zettlr Karl-Marx-Stadt Dark 1.60 Lc-9  best 3.24
lp-syntax-meta-full [syntax-meta unfaded (reference)] a=1 thr=4.5 fails 9/28 (light 5/15, dark 4/13)  worstLight Zettlr Bielefeld Light 3.03 Lc54 (#b7804b on #f3f3e8)  worstDark Zettlr Karl-Marx-Stadt Dark 3.00 Lc-27  best 13.58
lp-callout-fold-0.6 [live-preview/styles.ts:508] a=0.6 thr=3 fails 24/28 (light 14/15, dark 10/13)  worstLight Zettlr Bielefeld Light 2.12 Lc39 (#76aaf6 on #f3f3e8)  worstDark Zettlr Berlin Dark 2.11 Lc-15  best 3.70
lp-qjs-table-indicator-0.7 [live-preview/styles.ts:1074] a=0.7 thr=4.5 fails 5/28 (light 5/15, dark 0/13)  worstLight Zettlr Bielefeld Light 3.48 Lc59 (#818184 on #f3f3e8)  worstDark Zettlr Bordeaux Dark 5.11 Lc-42  best 9.29
lp-qjs-error-details-0.85 [live-preview/styles.ts:947] a=0.85 thr=4.5 fails 21/28 (light 12/15, dark 9/13)  worstLight Tolaria Light 3.44 Lc61 (#e95b5b on #ffffff)  worstDark Zettlr Bordeaux Dark 2.45 Lc-19  best 6.01
lp-embed-icon-0.7 [live-preview/styles.ts:709] a=0.7 thr=3 fails 11/28 (light 10/15, dark 1/13)  worstLight Sakura 2.48 Lc42 (#cc7495 on #eedede)  worstDark Willemstad Dark 2.67 Lc-17  best 5.44
collblock-calendar-outside-month-0.35 [features/collection/collection-block-widget.ts:271] a=0.35 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Zettlr Bielefeld Light 1.74 Lc30 (#babab6 on #f3f3e8)  worstDark Zettlr Bordeaux Dark 2.30 Lc-16  best 2.97
canvas-image-path-0.5 [canvas/ImageNode.svelte:90] a=0.5 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Tolaria Light 2.00 Lc39 (#b8b7b6 on #ffffff)  worstDark Twilight Violet 2.17 Lc-15  best 3.02
canvas-shortcut-0.4 [canvas/CanvasContextMenu.svelte:226] a=0.4 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Zettlr Berlin Light 1.92 Lc35 (#b3b3b7 on #f5f5f5)  worstDark Shimmering Focus Dark 2.68 Lc-20  best 3.67
canvas-text-placeholder-0.4 [canvas/TextNode.svelte:108] a=0.4 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Zettlr Berlin Light 1.96 Lc38 (#b9b9bd on #ffffff)  worstDark Zettlr Bordeaux Dark 2.60 Lc-19  best 3.65
canvas-textarea-placeholder [canvas/TextNode.svelte:129] a=0.5 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Tolaria Light 2.00 Lc39 (#b8b7b6 on #ffffff)  worstDark Twilight Violet 2.17 Lc-15  best 3.02
canvas-file-subpath-0.5 [canvas/FileNode.svelte:154] a=0.5 thr=4.5 fails 27/28 (light 15/15, dark 12/13)  worstLight Zettlr Berlin Light 2.40 Lc47 (#a7a7ac on #ffffff)  worstDark Zettlr Bordeaux Dark 3.31 Lc-27  best 5.13
canvas-file-error-0.4 [canvas/FileNode.svelte:177] a=0.4 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Zettlr Berlin Light 1.96 Lc38 (#b9b9bd on #ffffff)  worstDark Zettlr Bordeaux Dark 2.60 Lc-19  best 3.65
canvas-file-empty-0.3 [canvas/FileNode.svelte:183] a=0.3 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Zettlr Berlin Light 1.64 Lc28 (#cacacd on #ffffff)  worstDark Zettlr Bordeaux Dark 2.02 Lc-13  best 2.57
canvas-picker-path-0.4 [canvas/CanvasFilePicker.svelte:140] a=0.4 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Zettlr Berlin Light 1.92 Lc35 (#b3b3b7 on #f5f5f5)  worstDark Shimmering Focus Dark 2.68 Lc-20  best 3.67
canvas-link-url-0.4 [canvas/LinkNode.svelte:184] a=0.4 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Zettlr Berlin Light 1.96 Lc38 (#b9b9bd on #ffffff)  worstDark Zettlr Bordeaux Dark 2.60 Lc-19  best 3.65
canvas-link-input-placeholder-0.5 [canvas/LinkNode.svelte:214] a=0.5 thr=4.5 fails 28/28 (light 15/15, dark 13/13)  worstLight Tolaria Light 2.00 Lc39 (#b8b7b6 on #ffffff)  worstDark Twilight Violet 2.17 Lc-15  best 3.02
canvas-open-icon-0.5 [canvas/FileNode.svelte:140] a=0.5 thr=3 fails 12/28 (light 12/15, dark 0/13)  worstLight Zettlr Berlin Light 2.40 Lc47 (#a7a7ac on #ffffff)  worstDark Zettlr Bordeaux Dark 3.31 Lc-27  best 5.13
```

Corrected QueryJS / collection-widget surface (lp-collection-bg):

```
kbui .7 bg --lp-collection-bg fails 5/28 (light 5/15, dark 0/13) worstLight Zettlr Berlin Light 3.55 Lc60 #818188 on #f5f5f5 worstDark Shimmering Focus Dark 5.27 Koko 8.18 Lav 4.54
kbui .6 bg --lp-collection-bg fails 15/28 (light 13/15, dark 2/13) worstLight Zettlr Berlin Light 2.84 Lc52 #929298 on #f5f5f5 worstDark Shimmering Focus Dark 4.28 Koko 6.36 Lav 3.49
kbui .5 bg --lp-collection-bg fails 22/28 (light 15/15, dark 7/13) worstLight Zettlr Berlin Light 2.33 Lc44 #a2a2a7 on #f5f5f5 worstDark Shimmering Focus Dark 3.43 Koko 4.84 Lav 2.72
collblock outside-month .35 bg --lp-collection-bg fails 28/28 (light 15/15, dark 13/13) worstLight Zettlr Berlin Light 1.76 Lc31 #bbbbbf on #f5f5f5 worstDark Shimmering Focus Dark 2.37 Koko 3.06 Lav 1.93
qjs error details .85 bg --lp-collection-bg fails 22/28 (light 14/15, dark 8/13) worstLight Lavender Haze 3.10 Lc48 #cb5060 on #ddd8e8 worstDark Zettlr Bordeaux Dark 2.76 Koko 5.50 Lav 3.10
lp-embed-icon .7 bg --lp-embed-bg fails 11/28 (light 10/15, dark 1/13) worstLight Sakura 2.48 Lc42 #cc7495 on #eedede worstDark Willemstad Dark 2.67 Koko 3.69 Lav 2.86
tagcloud 0.4 fails 28 worst Zettlr Berlin Light 1.69 best 3.23
tagcloud 0.7 fails 15 worst Zettlr Berlin Light 2.81 best 6.90
```

Archived event blocks (EventBlock.svelte:80, EventMonthGrid.svelte:135, EventAllDayLane.svelte:81: `opacity-50` on the whole block, 6 colors x 28 themes, flattened over editor-bg):

```
archived fails 168 / 168 light 90 dark 78
Zettlr Bielefeld Light/cyan 1.83 Lc30
Zettlr Bielefeld Light/green 1.83 Lc30
Zettlr Bielefeld Light/orange 1.85 Lc31
Zettlr Bielefeld Light/pink 1.86 Lc31
Zettlr Bielefeld Light/purple 1.86 Lc30
worstLight Zettlr Bielefeld Light cyan 1.83 #a1b0b2 #ddebe6 worstDark Zettlr Bordeaux Dark purple 2.45
KokoBrain Default 2.97; Lavender Haze 2.14; Cool Mist 2.19; Deep Ocean 2.76; Foolscap 2.16; Graphite Violet 2.78; Ink Night 3.07; Lumen Contrast 2.51; Mint Linen 2.10; Sakura 2.19; Sepia 2.10; Shimmering Focus Dark 2.63; Shimmering Focus Light 2.19; Tolaria Dark 2.97; Tolaria Light 2.12; Twilight Violet 2.65; Willemstad Dark 3.57; Willemstad Light 3.07; Zettlr Berlin Dark 2.93; Zettlr Berlin Light 1.87; Zettlr Bielefeld Dark 2.93; Zettlr Bielefeld Light 1.83; Zettlr Bordeaux Dark 2.45; Zettlr Bordeaux Light 1.87; Zettlr Frankfurt Dark 2.93; Zettlr Frankfurt Light 1.87; Zettlr Karl-Marx-Stadt Dark 2.93; Zettlr Karl-Marx-Stadt Light 1.87
base fails 15 / 168 light 15 dark 0
Zettlr Bielefeld Light/cyan 4.06 Lc58
Zettlr Bielefeld Light/green 4.10 Lc58
Zettlr Bielefeld Light/orange 4.15 Lc58
Zettlr Bielefeld Light/pink 4.31 Lc57
Zettlr Bielefeld Light/blue 4.36 Lc58
worstLight Zettlr Bielefeld Light cyan 4.06 #4f6e7d #c8e4e4 worstDark Zettlr Bordeaux Dark pink 5.24
Zettlr Berlin Light 4.44; Zettlr Bielefeld Light 4.06; Zettlr Bordeaux Light 4.43; Zettlr Frankfurt Light 4.44; Zettlr Karl-Marx-Stadt Light 4.44
```

Tag cloud chips (kb-ui.ts:279-283, whole-chip opacity 0.4 + ratio*0.6, default chip bg rgba(139,108,239,0.3), text editor-fg) on editor-bg:

```
alpha 0.4 fails 28 worstLight Zettlr Bielefeld Light 1.68 worstDark Zettlr Bordeaux Dark 2.27 best 3.22
alpha 0.55 fails 27 worstLight Zettlr Bielefeld Light 2.11 worstDark Zettlr Bordeaux Dark 3.04 best 5.08
alpha 0.7 fails 16 worstLight Zettlr Bielefeld Light 2.77 worstDark Zettlr Bordeaux Dark 3.98 best 7.48
alpha 1 fails 0 worstLight Zettlr Bielefeld Light 5.13 worstDark Zettlr Bordeaux Dark 6.17 best 14.74
```

## Findings (as returned in the structured result)

1. Out-of-month day numbers at 35-40% alpha (CalendarGrid.svelte:58, CollectionCalendarView.svelte:144, collection-block-widget.ts:271): 1.65-2.4:1 on all 28 themes (cal navigator) and 1.76-3.06:1 in the widget. Day buttons in the navigator are clickable.
2. Muted info text at 60% in every collection toolbar (CollectionView.svelte:613 results count: 2.26-3.84:1, 28/28) and the properties panel "Add property" label (PropertiesView.svelte:235, tab-text-inactive/60: 2.25-3.82:1, 28/28).
3. Placeholders at 30-50% alpha: kanban inputs (KanbanView.svelte:607, KanbanLane.svelte:418: 1.94-3.06:1), properties list add input (PropertyField.svelte:191, muted/30: 1.46-1.91:1).
4. Canvas secondary text at opacity 0.3-0.5 (ImageNode.svelte:90, CanvasContextMenu.svelte:226, TextNode.svelte:108/129, FileNode.svelte:154/177/183, CanvasFilePicker.svelte:140, LinkNode.svelte:184/214): 1.64-3.7:1, 28/28.
5. Unresolved link rows dimmed by container opacity (OutgoingLinksPanel.svelte:74 opacity-60 on destructive text: 1.95-3.58:1; PropertiesView.svelte:273 opacity-50: 2.33-5.06:1).
6. Archived event blocks `opacity-50` (EventBlock.svelte:80 and two siblings): 1.83-3.57:1, 168/168 color-theme pairs. Aside: the unfaded pair already fails on 5 Zettlr light themes (4.06-4.44:1), that belongs to the calendar-colors scout.
7. Icon-only controls at 50-60% alpha (KanbanDatePicker.svelte:67,79; SortPanel.svelte:91; FormulaRow.svelte:91,98; PropertiesPanel.svelte:135,142; routes/(app)/+page.svelte:48,57): 1.94-3.06:1 vs 3:1.
8. QueryJS kb.ui secondary text at opacity 0.5-0.7 (kb-ui.ts:133,215,228,339,369,390): on lp-collection-bg 0.7 fails 5 light themes (3.55), 0.6 fails 15 (2.84 worst), 0.5 fails 22 (2.33 worst).
9. kb.ui.tagCloud whole-chip opacity down to 0.4 (kb-ui.ts:279-283): 1.69-3.23:1 at the floor, 28/28; still 15/28 failing at 0.7.
10. Live-preview dimmed syntax: inline comments and block refs (styles.ts:588,595 syntax-meta @0.5: 1.6-3.24:1, 28/28; base token itself fails 9 themes), hard-break arrow (styles.ts:140, same), link reference definitions (styles.ts:150: 2.31-5.1), revealed block marks (styles.ts:109 @0.6: fails 14, worst 2.82), qjs table page indicator (styles.ts:1074 @0.7: 3.48 on Zettlr light), qjs error details @0.85 on error color (22/28 fail, worst 2.76 dark / 3.10 light).
11. fg alpha 70-80% on bright light surfaces: right-sidebar-fg/70 in properties values (PropertyField.svelte:131,139, PropertiesView.svelte:176: Sakura 4.38, Zettlr light x5 3.55-3.71), date inputs `color-mix(... 70%, transparent)` (app.css:480-481: 3.71 Zettlr light), CalendarGrid week numbers fg/70 (3.55 Zettlr light), welcome page text-foreground/80 (+page.svelte:44: 4.44), collection calendar current-month fg/80 (4.35 Bielefeld Light).

## Passed

- `text-foreground/80` on `--input-bg` in ui/input.svelte (and EventForm/ModDialogHost textareas): min 4.70:1 (Zettlr Berlin Light), all 28 pass.
- Rail inactive row label file-explorer-fg/85 on rail-bg: min 4.54:1 (Zettlr Bielefeld Light), passes but borderline.
- PropertyField list item fg/80 on input-bg: min 4.70:1.
- Dialog close icon opacity-70 (3:1): min 3.55:1.
- prop-list-item, input typed text pass; other-theme dark pairs for fg/70 pass (min 5.11:1).

## Not reported (judged exempt or non-text)

- `disabled:opacity-50`, `opacity-40` on unavailable search mode (SearchPanel.svelte:253), `.cm-lp-qjs-table-nav-btn:disabled` .4, canvas `.btn-ok:disabled` .4: disabled state, exempt from WCAG 1.4.3.
- `opacity-0` hover/focus reveals (action buttons): measured only the revealed state where it has alpha.
- StatusBar.svelte:31 and WordCount.svelte:44 separators at 0.3: decorative 1px rules, not text.
- ThemePreview.svelte 3px bars with opacity: decorative preview swatches.
- TrashSection.svelte:84 icon opacity-30, ImageNode.svelte:56 and FileNode.svelte:77 empty/loading icons opacity-30: decorative empty-state glyphs.
- SearchPanel.svelte:292 `opacity-50` while searchSlow: transient loading state (measured 2.33-5.06:1, 22/28 fail), not reported separately.
- KanbanLane/KanbanCard grip `group-hover:opacity-60`: hover-only affordance; Kanban color swatch `hover:opacity-80`: not text.

## Could not check

- Real rendered colors in a running app (no pnpm tauri dev, no screenshots); all numbers are computed from theme-tokens.json and static CSS/Tailwind classes.
- `oklch(from ...)` relative colors for dark nav/rail approximated in OKLab with L shift and sRGB clamp; error under 1 level per channel expected.
- Hover/active/selected backgrounds (hover:bg-accent etc.) were not combined with faded text.
- Canvas nodes with a user-chosen node color (CanvasColor) may change the surface; measured the default `--card` only.
- Whether WKWebView applies any extra default opacity to `::placeholder` (assumed none beyond the explicit values; Chrome/WebKit do not add opacity, Firefox does).
- Text inherited color for kb-ui and live-preview widgets assumed `--editor-fg` (no color set on `.cm-lp-qjs-block`).
- Not covered here (other scouts): unfaded token pairs such as `--syntax-meta` (3.0:1 on 9 themes) and base event colors.
