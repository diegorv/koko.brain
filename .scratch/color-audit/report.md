# Color readability audit (2026-11-19)

Read-only audit of every place the app draws text, icons or meaningful
boundaries in color. 20 sonnet scouts, one UI area each, measured on the
resolved tokens of all 28 themes: the 2 built-in themes and the 26 in
koko.brain-themes, 15 light and 13 dark. 10 opus validators re-measured every
finding.

- 179 scout findings, all 179 confirmed by the validators. Validators added 16
  missed findings.
- Severity: 23 high, 89 medium, 67 low.
- Where the fix belongs: 123 in the app, 52 in app and theme together, 4 in
  the themes repo only.
- Raw data, with each finding's fg, bg, worst theme, ratio and fix:
  `research/workflow-result.json`.
- Notes: `research/scout-*.md` and `research/validation-*.md`.
- Token dump of the 28 themes: `research/theme-tokens.json`.

Thresholds: 4.5:1 for text (WCAG 2 AA), 3:1 for meaningful non-text. Text that
passes WCAG 2 but has APCA |Lc| under 45 is flagged separately.

Already fixed before the audit: the rail Inbox badge and the linear-calendar
bars (aede19baa), and the kb.ui statusCards badge, tags and chart error text
(afb031c18).

## Root causes

Most findings come from a handful of shared causes. Fixing a cause fixes every
finding listed under it.

### A. Opacity or alpha on text and icons (~30 findings, several high)

Tokens such as `muted-foreground` are tuned by the theme builder to 4.5:1. A
`/40`, `/50`, `/60` modifier or an `opacity-NN` on a container then throws that
away. Typical results are 1.5 to 3:1.

Sites:
- canvas: LinkNode:184, the context menu, the file picker, placeholders
- collection: CollectionView:613 results count, the table null em dash,
  out-of-month calendar days
- properties: PropertiesView:230/235, PropertyField:131/139/191
- kanban: placeholders at KanbanView:607 and KanbanLane:418, KanbanDatePicker:67
  icons, the unchecked KanbanCard:214 checkbox
- OutgoingLinksPanel:74 unresolved rows
- live preview: comments, block ids, hard break and link reference
  definitions (styles.ts:108/149/593-595)
- kb-ui: secondary text and tagCloud (kb-ui.ts:279/390), heatmap label
- FileHistoryDialog:83, CalendarGrid:58, EventBlock:80 archived chips, the
  `app.css:480` date input

Fix: full-strength muted tokens for text and meaningful icons. A guard test
could forbid `text-*/NN` on text tokens.

### B. Accent or status color as text on its own tint (~25 findings, several high)

The pattern is primary on `primary/10-25`, destructive on `destructive/15`, or
a preset color on its own 15% tint.

Sites:
- selected rows: NoteRow:108/127/141, FilesNavigator:347-349, TypesNavigator:299
- search: SearchResult:151-156 badges
- kanban: due badges (kanban.logic.ts:752), lane limit (KanbanLane:256),
  KanbanView:549 toggles
- DiffViewer:14
- the collection evaluator `badge()`, `color()` and `progress()` functions
  (evaluator.ts:444-462)
- BuildInfo:29
- destructive menu items (dropdown and context-menu `-item.svelte:23`)
- FilterPanel:96
- the TasksView:634 error banner

Fix: one shared "text on tint" rule, color-mix toward `--editor-fg` as the
`--event-*-fg` tokens and kanban chips already do, or theme-builder tokens
for it.

### C. Theme builder guarantees only 4 base surfaces (~25 findings)

`READABILITY_PAIRS` and `readableCore` lift text to exactly 4.5:1 on the
editor, background, card and popover surfaces. Muted and primary text then
fail on the hover, selected, accent and muted surfaces of the same palette.

Sites:
- command palette and quick switcher highlighted rows (command-item:20,
  CommandPalette:60, QuickSwitcher:137)
- SearchPanel:251, TrashSection:68, AutoOrganizeSection:266,
  kanban.logic:756 (muted text on muted chips)
- TaskLists:197, TasksView:845, AppearanceSection:190, TagItem:62,
  MyPeopleSection:50, EventMonthGrid:118
- type palette icons on the selected row (theme-builder:123)
- no pair exists for destructive as text (held to 3:1, builder:187), for
  syntax-meta (3:1, highlight-styles:41), for Settings surfaces (builder:105),
  or for the blockquote, callout and highlight tints

Fix: add the real surface pairs to the builder, so all 28 themes inherit the
fix, since they all derive from palettes.

### D. Non-text boundaries and states under 3:1 (~20 findings)

Sites:
- input and select borders (input.svelte:28/43, FilterRow:102,
  SearchPanel:334, TasksView:955)
- the off-state switch track (switch.svelte:18, high)
- unchecked task checkbox borders (styles.ts:234 and builder:273, high on
  19 themes)
- the `ring-ring/50` focus rings (Rail:382, FilesNavigator:348)
- the scrollbar thumb, outline buttons (button.svelte:13), and the Settings
  active section (SettingsPanel:137)
- graph controls and edges, active rail item (Rail:384), TagColorPicker
  selected ring

Fix: builder tokens for border, input and ring at 3:1 against their surfaces;
drop `/50` from focus rings.

### E. Hard-coded colors that ignore the theme (~25 findings, several high)

Sites:
- rail icon palette `RAIL_ITEM_COLORS` (rail-items.logic.ts:143-144, high):
  1.3 to 3:1 on light themes
- canvas: xyflow light defaults and white-alpha borders (CanvasInner:610,
  745, 758-771, CanvasLinkInput:108); uncolored edges are invisible on light
  themes (high); group nodes; preset palette (canvas.types.ts:5);
  canvas-markdown.css:133
- kb-ui: heatmap and calendar scales, the today marker, chart colors, and
  charts that bake `html.dark` and never redraw (kb-ui.ts:29, 215, 421, 608,
  800, 977, 1067)
- IconPicker:51 and the tag-colors.ts presets, which are dark-tuned
- composition-aware-bracket-matching:164 (pale blue)
- mermaid keeps its theme after a theme switch (mermaid-widget:121)
- graph view labels and nodes
- button.svelte:12 destructive hard-codes white

### F. Readable by WCAG 2, poor by APCA (~10 findings, medium)

Sites:
- the muted text family on 6 dark themes (builder:192, StatusBar,
  SettingItem:28)
- links and wikilinks on dark themes (builder:186)
- primaryForeground on mid-tone primary fills (builder:194, EventMonthGrid:113,
  KanbanDatePicker:130), the same root as the badge fixed earlier
- accent text on dark themes (builder:128), and TasksView:879/902

### G. Theme tooling

- themes that users create, edit or import skip every contrast check
  (theme.logic.ts:105)
- the 26 catalog themes have no contrast test or CI
- the schema accepts `hsl()` and formats color.ts cannot parse, so dark
  detection and lifting silently fail (color.ts:14)

### H. Themes repo only

- the Zettlr palettes use the border gray as the hover and selected surface
  (the themes/zettlr-*.json files)
- the blockquote bar on Shimmering Focus, NoteInfo:44, and TagItem:62

## Other notes

- Validators confirmed every finding. They re-measured but did not refute
  any, so a few low ones may be judgement calls (for example the Svelte Flow
  attribution link).
- Nothing was checked in the running app; every ratio is computed from tokens.
