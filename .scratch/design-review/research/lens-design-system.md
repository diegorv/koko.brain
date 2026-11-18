# Lens: design system and visual consistency

Scope: the whole app, through one question: do features build from the same tokens and primitives, or does each view rebuild its own? The area reviews already cover the primitive gaps (review-foundation #4, #7, #8, #15), the canvas dark-only chrome (review-canvas #7, #12), kb-ui literals (review-foundation #13, review-plugins-misc #11) and kanban tag contrast (review-kanban #4, #8). This file does not repeat them. It looks for the pattern that repeats across views and names one shared token or primitive that would replace all the copies.

Evidence: grep under `src/` (counts are per line unless noted), code read at the cited lines, screenshots in `.scratch/design-review/screens/` (files-note-list-light, kanban-board-light/dark, tasks-all-open-light, calendar-week-light, view-file-table-light, graph-view-light, canvas-view-light, search-results-light, settings-editor-light, vault-picker-light). Contrast ratios are computed with the WCAG 2.x formula from literal values. Nothing was run.

## What is already systemic (keep it)

- `pane-toolbar` (app.css:151-153) is used by 7 sites: NoteActionBar, KanbanView, TasksView, CollectionView, EventCalendarHeader, TagsView, SidebarSection. Second rows line up at y=80 across views in the screenshots.
- The type scale roles (`text-label/meta/rail/row/title`, app.css:77-102), the radius ladder (:110-115) and the elevation tokens (:125-129) are well designed. Live preview styles use `var(--radius-*)` and `var(--shadow-md)` throughout (styles.ts:236-824).
- `formatShortcut` (utils/keybindings.ts:40) already renders Mac glyphs, and the palette and two context menus use it.
- No Tailwind palette colors (`text-red-500` etc.) appear anywhere outside `components/ui`.

The problems below are where these systems stop: the top band, the toolbar controls, the colors of things the user tags or picks, and state treatments.

## Clear

### 1. Every view builds its own header: 10 copies of the top band, 7 title styles, two views with no band

Category: consistency. Effort: M.

- The 40px top band (`h-10 bg-tab-bar` plus `style="box-shadow: inset 0 -1px 0 var(--divider)"`) is pasted inline in 10 places with no utility: AppShell.svelte:256, :276; EditorView.svelte:154; Rail.svelte:270; FilesNavigator.svelte:304-306; TypesNavigator.svelte:216-218; CalendarNavigator.svelte:87-89; RailNoteList.svelte:716-718; SearchPanel.svelte:74-76; EditorTabs.svelte:117 (scoped CSS). `pane-toolbar` exists for the second row; the first row has nothing.
- Pane titles use seven treatments: `text-title` (RailNoteList.svelte:723, FilesNavigator.svelte:309, TypesNavigator.svelte:221, TasksView.svelte:906); `text-sm font-medium` (CalendarNavigator.svelte:92); `text-base font-semibold` (EventCalendarHeader.svelte:38, visibly larger than "Tasks" in calendar-week vs tasks-all-open); `font-semibold text-sm text-primary` (TagsView.svelte:51); `text-title text-right-sidebar-primary` (SidebarSection.svelte:47, the purple "Properties" / "Table of contents" in every screenshot); `text-lg font-semibold` (settings section h2, e.g. AppearanceSection.svelte:149, and dialog-title.svelte:15); and no title at all in Kanban, Collection, Graph and Canvas (kanban-board-light, view-file-table-light, graph-view-light, canvas-view-light).
- Canvas and Graph have no pane band. Their controls float over the content (GraphControls.svelte:26 `absolute top-3 left-3`; CanvasToolbar bottom-left), so switching tabs between a board, a canvas and a table moves the first content row by 40px.
- "View source" lives in three places: in the note action bar for notes (NoteActionBar code button), floating bottom-right for kanban and .view files (EditorView.svelte:98, :125), floating top-right for canvas (EditorView.svelte:112), plus a fourth floating copy at :139. Non-note files get no breadcrumb and no "more" menu.

Proposal:
- Add `@utility pane-band` (h-10, bg-tab-bar, bottom divider, `data-tauri-drag-region` stays in markup) and replace the 10 copies.
- Make `text-title` the only pane-title role. Right sidebar section titles move to `text-title text-right-sidebar-fg`, with primary color only on the chevron or not at all. Settings h2 stays larger, but becomes a named role (`text-heading`, 18px) shared with dialog titles.
- Every file-backed tab (note, kanban, canvas, view) gets the same `FileToolbar` in the pane-toolbar slot: left = type icon and file title, middle = view-specific controls, right = source toggle and the "more" menu. Graph and Canvas move their mode, zoom and add controls into that toolbar. The floating source buttons go away.

Impact: kanban, canvas, tables and notes are the owner's daily tabs. Today each one has a different header height, title weight and place for the same action.

### 2. Seven separate categorical palettes, two of them for tags, most of them theme-blind

Category: color-theming. Effort: M.

The app has one theme-aware hue set, `--type-*` (9 hues, app.css:194-202, contrast-checked per theme). Six more palettes define "red", "yellow" and so on independently:

| Palette | Where | Values | Used by |
|---|---|---|---|
| `--type-*` | app.css:194-202 + theme.logic.ts | theme tokens | type icons, kanban date proximity (kanban.logic.ts:712-719) |
| `PALETTE` | utils/color-presets.ts:2-10 | 7 fixed rgb | kanban tags (KanbanCard.svelte:13, KanbanCardText.svelte:3), collection display functions (evaluator.ts:7), kb-ui cards (kb-ui.ts:24) |
| `TAG_COLOR_PRESETS` | utils/tag-colors.ts:2-9 | 6 fixed hex | global tag colors: editor, Tags view, Properties (MarkdownEditor.svelte:668, TagItem.svelte:23, PropertyField.svelte:171) |
| canvas colors | canvas.types.ts:6-11 | the same 6 hex again | canvas nodes and edges |
| icon colors | IconPicker.svelte:53-60 | 8 Tailwind-500 hex | file and folder icons |
| rail colors | rail-items.logic.ts:124-141 | 10 Tailwind-500 hex | rail icons, active fill, count badge |
| event hues | app.css:402-413 | 6 Tailwind-500 hex mixed with editor bg/fg | calendar events |

Consequences:
- A tag has two colors: the global one (settings `tagColors`, tag-colors.ts) in the editor, Tags view and Properties, and a per-board one (`board.settings.tagColors`, kanban.logic.ts:775) in kanban. `#design` can be purple in the note and gray on the board.
- Fixed colors ignore the theme. Rail count badges are white text on the rail hue (Rail.svelte:374): white on inbox `#3b82f6` is 3.68:1, on today `#f97316` 2.81:1, on favorites `#eab308` 1.92:1, at 11px. Kanban `#docs` on light (kanban-board-light) is yellow `rgb(234,179,8)` text on a 15% tint of itself, about 1.8:1.
- The calendar event hues already show the right technique: `color-mix(in oklab, <hue> 25%, var(--editor-bg))` for bg and 30% toward `--editor-fg` for fg.

Proposal: one categorical palette, `--hue-{red,orange,yellow,green,teal,blue,purple,pink,gray}`, defined as the existing `--type-*` values. Each hue gets derived pair tokens `--hue-X-bg` / `--hue-X-fg` built with the event-calendar `color-mix` recipe, so every theme gets readable chips for free. Migrate in order: kanban tags and color-presets (largest contrast failures), rail badges and icons (names already match: inbox=blue, today=orange, favorites=yellow, types=purple, files=teal, archive/search=gray), tag colors, icon picker, event hues, canvas. Stored values stay valid through a name map (canvas `'1'..'6'` and tag hex resolve to the nearest hue name; custom hex keeps working as a custom color). Kanban reads the global tag color when the board has none.

Impact: tags, kanban and the rail are on screen all day. One palette means a tag looks the same everywhere and every chip is readable in light themes.

### 3. Toolbar controls: icon buttons in three sizes, seven search-field recipes, four kinds of dropdown trigger

Category: consistency. Effort: M.

Inside the same 40px `pane-toolbar` row:

- Icon buttons are 22px (`p-1` + 14px icon: RailNoteList.svelte:774-820, RailSortMenu.svelte:105, RailPropertiesPicker.svelte:105, KanbanView.svelte:464-484, GraphControls.svelte:28-60), 28px (NoteActionBar.svelte:115-116 `size-7` + 16px icon; TagsView.svelte:59-75 `p-1.5` + 16px; EditorView.svelte:98-139 floating) and 32px (Button `icon-sm` = `size-8`, button.svelte:24: EventCalendarHeader.svelte:44-83 with 16px icons, CollectionView.svelte:595-670 with 14px icons). Visible in kanban-board-light (tiny 14px toggles) next to calendar-week-light (32px chevrons).
- "Active" state on an icon button is `text-primary` (TagsView.svelte:63, CollectionView.svelte:598), `text-tab-text-active` (RailNoteList.svelte:774, RailSortMenu.svelte:106), `bg-primary/10 text-primary` (KanbanView.svelte:465), or a hue (`text-type-yellow` favorite, NoteActionBar.svelte:148).
- Search and filter fields: TasksView.svelte:915-922 (h-6, rounded-md, `bg-background/50 border-border/50`, focus `border-primary/50`); KanbanView.svelte:500-503 (py-0.5, rounded-xs, icon outside the field, focus `border-primary`); GraphControls.svelte:78-82 (h-7, rounded-xs, focus `ring-1`); SearchPanel.svelte:154-161 (py-1.5, rounded-md, `border-file-explorer-border`, ring-1); RailListSearch.svelte:86-90 (Input primitive, h-7, ring-[3px]); RailPropertiesPicker.svelte:131-136 (Input, h-8); RelationshipSearch.svelte:55-60 (h-8, borderless, `text-[13px]`). Placeholder color is `muted-foreground` in some and `/50` in others.
- Dropdown triggers: native `<select>` (KanbanView.svelte:488-496, GraphControls.svelte:100, :113), ghost text plus chevron (TasksView.svelte:928-937 "Display", filter row "Status: open"), icon-only popover (CollectionView.svelte:595-670, RailNoteList.svelte:774) and the `Select` primitive (properties type field).

Proposal: a small toolbar kit in `components/ui/toolbar/`:
- `ToolbarButton`: 28px square, 16px icon, `rounded-md`, hover `--state-hover` (see 5), active = `--state-selected` bg plus `text-foreground`, required `label` (feeds aria-label and the styled tooltip that review-foundation #4 proposes). Hue-colored states (favorite star) stay as icon color only.
- `ToolbarSearch`: h-7, leading search icon inside the field, clear button, `text-meta`, one focus style (the `focus-ring` utility from review-foundation #8).
- `ToolbarMenuTrigger`: ghost button, label plus value plus chevron ("Sort: Manual"), opening a `DropdownMenu` radio group. Replaces the three native selects and the Tasks filter triggers.
Migrate per view: kanban (worst: 22px, native select, unlabeled), graph, collection, note-list header, tasks, calendar, tags.

Impact: these controls are clicked many times a day in kanban, tables, tasks and the note list; today their size, hit area and focus behavior change per view.

## Moderate

### 4. Six segmented controls, five selected looks, one with ARIA

Category: consistency. Effort: S.

| Site | Wrapper | Selected item | Semantics |
|---|---|---|---|
| KanbanView.svelte:463-485 (Board/List/Table) | `rounded-xs border`, gap-0.5 | `bg-primary/10 text-primary` | none, title only |
| EventCalendarHeader.svelte:99-123 (D/W/M) | `rounded-md border p-0.5` | `bg-muted text-foreground` | tablist/tab, arrow keys |
| GraphControls.svelte:28-46 (Global/Local) | `rounded-md border bg-background/90 p-1` | `bg-muted text-foreground` | none |
| SearchPanel.svelte:83-95 (Text/Semantic/Hybrid) | `rounded-md bg-muted p-0.5` | `bg-background shadow-sm` | none |
| CollectionView.svelte:522-551 (view tabs) | none | `bg-primary/15 font-medium` | none |
| ThemeEditor.svelte:176-185 (color groups) | bottom border | underline `border-b-2 border-primary` | none |

search-results-light shows the cost: on the muted track the unselected "Semantic"/"Hybrid" read as disabled (they are also `opacity-40` when the model is missing, SearchPanel.svelte:89), so "unselected" and "unavailable" look alike.

Proposal: `SegmentedControl` (track `bg-muted p-0.5 rounded-md`, item `rounded-sm px-2 h-6 text-meta`, selected `bg-background text-foreground shadow-xs`, disabled with a tooltip explaining why) with the calendar's roving-tabindex keyboard model generalised, and icon-only items carrying a label. Underline `Tabs` stays a separate primitive for page-level tabs (theme editor, collection views). This is the concrete spec for the SegmentedControl that review-foundation #7 asks for.

### 5. Hover and selected states: 28 hover recipes and 8 selected treatments, no state tokens

Category: color-theming. Effort: M.

- Selected rows: rail item `color-mix(var(--rail-c) 18%)` (Rail.svelte:361); Types row `bg-file-explorer-primary/25 text-file-explorer-primary` (TypesNavigator.svelte:281-283); note row `bg-primary/25` plus title `text-primary` (NoteRow.svelte:70, :89); Tasks list `bg-accent` plus `font-medium` (TaskLists.svelte:185, :191); settings nav `bg-settings-hover-bg font-medium` (SettingsPanel.svelte:137); theme row `ring-2 ring-primary` (AppearanceSection.svelte:173); event `ring-2 ring-primary/70` (EventBlock.svelte:77); menus `data-highlighted:bg-accent` (dropdown-menu-item.svelte:23). files-note-list-light shows three selection colors in one glance (teal rail fill, lavender folder, lighter lavender note row); tasks-all-open-light adds a gray one.
- Hover backgrounds outside `components/ui`: 28 distinct classes (grep `hover:bg-*`): `hover:bg-accent` 53, `hover:bg-muted` 30, `hover:bg-file-explorer-accent` 26, `hover:bg-accent/50` 7, `hover:bg-primary/10` and `hover:bg-file-explorer-primary/10` for the same list-row role, plus `/20`, `/25`, `/30`, `/50`, `/60` variants. In editor-area views `accent` and `muted` are mixed for the same job (TasksView uses accent, NoteActionBar.svelte:116 and the floating EditorView buttons use muted).

Proposal: per-surface state tokens derived in `themeColorsToCssVars`, the way `--elev-*` already are: `--state-hover`, `--state-selected`, `--state-selected-fg`, plus utilities `row-hover` and `row-selected` (and `aria-current`/`data-selected` variants). The rail keeps its per-item hue as a 3px leading marker or icon color, and the fill becomes the shared `--state-selected`. Add the selected pair to READABILITY_PAIRS so selected text stays at 4.5:1.

### 6. Floating surfaces bypass the elevation tokens; dialogs come in 8 widths and 3 paddings

Category: consistency. Effort: M.

- Literal shadows and borders outside the tokens: SettingsPanel.svelte:116 `shadow-[-4px_0_12px_rgba(0,0,0,0.15)]`; CanvasContextMenu.svelte:183-187, CanvasFilePicker.svelte:91-97, CanvasLinkInput.svelte:91-94 (white 15% border, `8px` radius, black 40-50% shadow, `var(--background)` instead of `--popover`); CanvasInner.svelte:792, :796 node shadows. White and black alpha literals (`rgba(255,255,255,a)` / `rgba(0,0,0,a)`) appear in 20 files, 18 of them canvas or picker code (CanvasInner 11, CanvasLinkInput 6, canvas-markdown.css 6, CanvasFilePicker 5, LinkNode 4, CanvasContextMenu 4, TagColorPicker 3, FileNode 3, ...). Kanban's own popovers do it right (KanbanCardText.svelte:46, KanbanDatePicker.svelte:90: `bg-popover border shadow-md`).
- Dialog widths: `sm:max-w-xs` (TasksView.svelte:1187), `max-w-[440px]` twice (EventDialog.svelte:192, EventShortcutsDialog.svelte:12), `sm:max-w-md` twice (TypeNameDialog.svelte:56, ModDialogHost.svelte:94), `sm:max-w-lg` (ViewDialog.svelte:169), `max-w-[550px]` (IconPicker.svelte:165), `max-w-[720px]` (TodoistSyncLogDialog.svelte:24), `!max-w-5xl h-[80vh]` (FileHistoryDialog.svelte:55; the 1020x720 empty dialog in file-history-light). Padding is the default p-6, p-5 or p-0.

Proposal: a `surface-floating` utility (`bg-popover text-popover-foreground border-border rounded-md shadow-md`) used by every hand-built menu, picker and panel, and a lint test that fails new `rgba(255,255,255` / `rgba(0,0,0` literals outside `theme.logic.ts`. `Dialog.Content` gets a `size` prop (`sm` 400, `md` 520, `lg` 720, `full` for File History) with one padding (p-5); the settings sheet uses `shadow-xl`. The canvas modals become `Dialog` or `Command.Dialog` (review-canvas #7 already asks for this; this item is the token rule that keeps it from coming back).

### 7. Three confirmation patterns for the same kind of action

Category: consistency. Effort: S.

- Native OS sheet via Tauri `ask()` in 8 places: TrashSection.svelte:34, :49; UpdateSection.svelte:238; delete-note.service.ts:14; editor.service.ts:376; NoteRowMenu.svelte:163; FileHistoryDialog.svelte:44; FilesNavigator.svelte:196.
- In-app shadcn Dialog for mod confirmations (ModDialogHost.svelte:130-140), with app typography and theme.
- No confirmation and no undo for deleting a kanban card or lane, an auto-organize rule or a user theme (review-kanban #2, review-organize #2, review-settings #9).

Proposal: one `confirmAction({ title, body, confirmLabel, destructive })` helper that renders an in-app `AlertDialog` (Cancel focused by default for destructive actions, verb-specific confirm label: "Move to Trash", "Delete rule"). For reversible deletes (cards, lanes, rules, notes to trash), prefer an undo toast over a confirm. Keep the native sheet only for app-level prompts outside a window context (quit with unsaved changes).

### 8. Chips and badges are rebuilt per feature

Category: consistency. Effort: M.

- Type chip: `rounded-xs bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary/80` repeated three times in NoteRow.svelte:103, :114, :124. It ignores the type's own hue, so "Event", "Person" and "Project" chips are identical (tasks-all-open-light, view-file-table-light).
- Tag chip: editor `.cm-lp-tag` (styles.ts:269-276, color-mix of primary, `radius-xs`, `0 3px`); kanban (KanbanCardText.svelte:37-38, `rounded-sm px-1 py-0.5 text-xs`, color-presets); Properties tags list (PropertyField.svelte:171-186, icon-colored only).
- Count badge: rail (Rail.svelte:374, filled hue, white text); collection filter count (FilterPanel.svelte:102, :164, `rounded-full bg-primary/15 text-label`); note-list header count, kanban lane count and task list count are plain text; Tasks "2 of 2 open" plain text.
- Date chip: kanban proximity (`rounded-xs` in KanbanListView.svelte:48 and KanbanTableView.svelte:69, `rounded-sm` in KanbanDatePicker.svelte:58); tasks date is text plus calendar icon with red overdue; calendar task chip `rounded-md border` (EventTaskChip.svelte:27).
- Build badge: BuildInfo.svelte:50 (`rounded-xs uppercase tracking-wider`).

Proposal: a `Badge` primitive with variants `count` (pill, tabular-nums, `text-label`), `tag` (uses the `--hue-X-bg/fg` pair from item 2, `#` prefix), `type` (the type's hue, not primary), `date` (tone = overdue/today/soon/none from one shared `dateTone()` used by kanban and tasks) and `status`. One radius (`rounded-sm`) and one height (18px) for all of them.

## Polish

### 9. Shortcut display: a formatter exists, but titles, canvas and kbd tags spell keys three other ways

Category: content-copy. Effort: S.

`formatShortcut` gives `⌘D` (CommandPalette.svelte:62, NoteRowMenu.svelte:280, MarkdownEditor.svelte:755). Elsewhere: "(Cmd+D)" and "(Cmd+E)" in NoteActionBar.svelte:148, :157 titles; "Ctrl+A" in CanvasContextMenu.svelte:115 (wrong modifier on macOS); "Cmd+Z", "Cmd+Shift+Z" in event-calendar-keys.logic.ts:64-65, rendered as kbd chips; "Ctrl+Alt+Cmd+Space" in QuickCaptureSection.svelte:33. Three `<kbd>` styles: TemplatePicker.svelte:85 and ModActionPicker.svelte:163 (`rounded-xs border px-1.5 py-0.5 text-xs`), EventShortcutsDialog.svelte:23-24 (adds `bg-muted font-mono`).
Proposal: a `Kbd` primitive that takes a key combo and renders glyphs through `formatShortcut`; use it in tooltips (review-foundation #4), menus, dialogs and settings copy.

### 10. Cursor policy is split between "native" and "web"

Category: interaction. Effort: S.

`cursor-pointer` appears in 33 files (TasksView 19 lines, Collection calendars 12, TaskLists 5, Properties 8, IconPicker 4, TagItem 3, BacklinksPanel 3); `cursor-default` in 29 (the whole rail shell, CalendarNavigator 7, RailSortMenu 6, RailNoteList 5). Moving from the note list to the Tasks view flips the hand cursor on and off for the same kind of row. Proposal: macOS convention, set once in `@layer base`: `cursor: default` for buttons and rows, `pointer` only for links (wikilinks, URLs); drop the per-site classes.

### 11. Radius, line and size hygiene outside the ladder

Category: consistency. Effort: S.

- Literal radii in px bypass `--radius-*`: kb-ui.ts (8, 6, 3, 10, 12, 50%, 25%: lines 118, 202, 232, 308, 329, 346, 878), canvas (CanvasContextMenu.svelte:184 8px, :201 4px; CanvasLinkInput.svelte:92, :109, :139; CanvasFilePicker.svelte:92, :130), ThemePreview.svelte (12 lines, acceptable for a miniature).
- No named card radius: kanban card `rounded-lg` (KanbanCard.svelte:158), note row `rounded-md` (NoteRow.svelte:70), calendar events `rounded-md`, canvas nodes 8px literal, collection calendar items `rounded-sm` (CollectionCalendarView.svelte:154). Proposal: `--radius-card` = `--radius-md`, `--radius-chip` = `--radius-sm`.
- Two line tokens with no rule: `border-border` 59 lines vs `border-divider` 4 (plus `pane-toolbar`); separators `bg-border` 11 vs `bg-divider` 1. Proposal: `divider` for structure between panes and rows, `border` for control outlines only; document it next to `pane-toolbar`.
- Icon sizes are three steps (`size-3` 66, `size-3.5` 125, `size-4` 118) with no rule for which goes where. Proposal: 16px in toolbars and list rows, 14px inside chips and inline metadata, 12px only inside badges.

## Not covered

- Runtime-only states (hover, drag, focus rings in motion) were not exercised; claims about them come from the code.
- Dark variants were checked only for kanban, calendar week, tasks and settings appearance.
- The vault picker renders dark in vault-picker-light.png although the light theme was set. `app.html:2` hard-codes `class="dark"` and the picker relies on the `kokobrain:theme-vars` localStorage mirror (`applyStoredTheme`, `(app)/+layout.svelte:36`); the harness may simply have had an empty localStorage. Not verified on a real install.
