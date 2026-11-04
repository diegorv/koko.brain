# Views and states: design review

Scope: feature views (canvas, kanban, collection table/calendar/linear, event calendar, graph view, tasks, tags, search, properties, backlinks, outgoing links, file history, TOC) plus their empty, loading and error states, inline errors, badges and chips. Screenshots: `references/ux-polish-2026-11-04/screens/{default,lavender}/07-kanban, 08-canvas, 09-view-table, 02-rail-*, 12-cmd-toggle-*`. Commit `dd4f06376`. All counts are over the 75 `.svelte` files in `features/{canvas,collection,event-calendar,tasks,tags,search,properties,backlinks,outgoing-links,file-history}` and `plugins/{kanban,graph-view,calendar,table-of-contents}`, `src/tests` excluded.

## 1. Current state

**Tokens available.** `app.css:66-69` radius ladder (`sm` 6px, `md` 8px, `lg` 10px, `xl` 14px); `app.css:83-91` chrome scale (`text-label` 11, `text-meta` 12, `text-row` 14, `text-title` 15/600); `section-label` utility (`app.css:102`); per-area color tokens (`right-sidebar-*`, `file-explorer-*`, `destructive`, `primary`, `muted`). No Badge, Alert, Empty-state, Table or Calendar primitive in `components/ui/` (present: button, collapsible, command, context-menu, dialog, dropdown-menu, input, popover, resizable, scroll-area, select, separator, switch, tooltip).

**Measured usage (75 view files):**

| Pattern | Count | Where |
|---|---|---|
| `text-xs` / `text-sm` | 212 | collection 71, event-calendar 45, kanban 31, tasks 16, search 13, file-history 10, graph 9 |
| Chrome scale (`text-label/meta/row/title`) | 56 | properties 16, backlinks 12, collection 7, search 7, outgoing 7; **0** in canvas, kanban, event-calendar, graph, file-history |
| Arbitrary type `text-[Npx]` | 20 | `text-[11px]` x14, `text-[13px]` x4, `text-[14px]` x2 |
| CSS `font-size: Npx` / `border-radius: Npx` | 23 / 19 | almost all in canvas `<style>` blocks |
| Radius | `rounded-md` 80, bare `rounded` 61, `rounded-full` 17, `rounded-sm` 9, `rounded-lg` 9 | bare `rounded` (4px) is off the ladder |
| Shadow | `shadow` utilities 18, plus hand-written `box-shadow` rgba in canvas | |
| `rgba(...)` literals | 61 | canvas 42, collection calendars 12, graph 4, tags 3 |
| Hex literals | 7 | `GraphView.svelte:46-51` (4), `CanvasContextMenu.svelte:211` `#fb464c`, `CanvasEdge.svelte:66` |
| Tailwind palette colors (`red-500` etc.) | 27 | kanban 22, file-history 4, tasks 1 |
| `focus-visible` | event-calendar 27, collection 4, properties 1; **0** in canvas (29 raw `<button>`), kanban (21), graph (7), tags, tasks, search | |
| Native `<select>` | 2 view files | `KanbanView.svelte:488`, `GraphControls.svelte:100,113` |
| Empty/loading strings | about 30 distinct | 5 text sizes, 4 paddings, 5 end with a period, 1 has an icon (Trash) |

**Positive reference.** The event calendar is the most finished surface: tokens only (0 rgba), `focus-visible:ring-2` on every control, `aria-label`s, a real `+N more` button (`EventMonthGrid.svelte:141-149`). Two identical inline error callouts already exist and are good: `CollectionView.svelte:585-590` (filter error) and `RailNoteList.svelte:538-555` (view error with an "Open view" action): `role="alert" rounded-md border border-destructive/50 bg-destructive/10 p-3 text-row text-destructive`, title `font-medium`, detail `font-mono text-meta`. The count pill in `FilterPanel.svelte:102,164` (`rounded-full bg-primary/15 px-1.5 text-label font-semibold text-primary`) is the right badge recipe.

## 2. Problems (verified)

**P1. [high] Hardcoded dark-only colors break the Lavender theme.**
- Graph view: `GraphView.svelte:46-51,429` paints the container `#1a1a1e` and nodes/labels in fixed greys, active `#c084fc`. In `lavender/12-cmd-toggle-graph-view.png` the whole pane is a black slab inside a light app, with light floating panels on top.
- Canvas: `CanvasInner.svelte:727-744` (comment says "for dark mode") sets `--xy-edge-stroke: rgba(255,255,255,0.3)`, node/control borders `rgba(255,255,255,0.15)`, background pattern white 5%, minimap mask `rgba(0,0,0,0.6)`. In `lavender/08-canvas.png` the edge between the two cards is almost invisible and the minimap is a dark grey block. The empty-state button (`:709-723`) is a white dashed border on white 5% fill, so it is invisible on a light canvas. Shadows `0 2px 8px rgba(0,0,0,0.3)` (`:761,765`) are heavy for light mode.
- Collection calendars: `CollectionCalendarView.svelte:120,137` and `CollectionLinearCalendarView.svelte:147,152,167,180` use `var(--foreground-15, rgba(255,255,255,0.15))`; `--foreground-15` is defined nowhere in `src/`, so the white fallback always applies and the grid lines vanish on Lavender. Dashed cell lines are raw `rgba(255,255,255,0.08)`.
- `TasksView.svelte:185` file names `text-purple-400` (not `text-primary`); `DiffViewer.svelte:14-15` `text-green-300` / `text-red-300` (pale text, low contrast on a light background); kanban `KanbanDatePicker.svelte:21-24` `text-yellow-400` / `text-orange-400` badges (unreadable on light).
Why it hurts: the light theme is a shipped built-in, and these views look broken or half-themed in it.

**P2. [high] No empty-state pattern; copy, size and placement vary per view, and some states say the wrong thing.**
- Sizes: `text-sm` (Tasks `:170,172`, Collection `:606,620`, CollectionTable `:35`, SnapshotList `:24,28`, EditorView `:149`, Graph `:432`), `text-xs` (SearchPanel `:109-113`, KanbanList `:55`), `text-meta` (right sidebar panels), `text-[13px]` (`RelationshipSearch.svelte:87`), unsized/inherited (`TagsView.svelte:80,82`, renders visibly larger in `12-cmd-toggle-tags-view.png`). Padding `py-4`, `py-8`, `py-12`, `p-8`.
- Copy: "No files found." vs "No files found" (QuickSwitcher `:105` vs RelationshipSearch `:87`), 5 of about 30 strings end with a period, ASCII `...` everywhere, "Not available" with no reason in Properties `:172`, Backlinks `:65`, Outgoing `:63` (visible on every canvas/kanban/view screenshot).
- Wrong state: Tags header shows "3 tags" while the body says "No tags found" (`12-cmd-toggle-tags-view.png`) because `hideRareTags` defaults to `true` (`tags.store.svelte.ts:5`) and hides tags under 10 notes (`TagsView.svelte:15,35-38`); the empty message ignores the filter and offers no way out. Tasks says "No tasks found" while a `#to-list` section-tag filter is active (`lavender/12-cmd-toggle-tasks-view.png`).
- Missing states: canvas empty is only a dashed "+ Add card" (`CanvasInner.svelte:572-578`) with no explanation, though the toolbar offers five actions; Kanban table has no empty row while the list view says "No cards" (`KanbanTableView.svelte:30` vs `KanbanListView.svelte:54-56`); kanban board shows nothing when `filterQuery` hides every card (`KanbanView.svelte:181`); both collection calendars render an empty grid with no message; Graph has no empty-vault or failed-load state (`GraphView.svelte:72-76` logs and returns, leaving "0 notes · 0 links").

**P3. [high] Error states: raw exception text, errors that look like empty states, one silent data loss.**
- Raw `String(err)` shown as UI copy: `TodoistPopover.svelte:76,89,107` rendered bare at `:217`; `SearchSection.svelte:49,85`; `EventCalendarView.svelte:242-244` "Could not load events: {raw}", no retry, no padding parity with the loading line above it.
- Failure indistinguishable from empty: `BacklinksPanel.svelte:28-29` `.catch(() => {})` (the service logs, `backlinks.service.ts:166-168`) then shows "No backlinks found"; canvas `FileNode.svelte:81,177-187` error is `opacity: 0.4` italic, styled like the 0.3 empty state, no reason; `ImageNode.svelte:54-58` uses one placeholder for loading and error (dimmed icon plus raw path), so a loading image looks broken.
- Data loss: `routes/composer/+page.svelte:45-49` catches a failed `submit_composer_capture` with `console.error` only, then `dismiss()` still runs and `resetForShow` clears the text. The capture is gone with no message.

**P4. [medium] Collection table reads as a debug dump.** `09-view-table.png`: headers are raw keys (`file.name`, `_type`, `_favorite`) because `collection.logic.ts:389` falls back to `key` when no `displayName` is set; header and body share size, and only `text-muted-foreground font-medium` separates them (in Lavender they are nearly identical). Booleans are native disabled OS checkboxes (`CollectionTableView.svelte:65`), greyed and 12px, next to a muted em dash for missing values, so the boolean columns look unfinished. Icon cells print the icon name as text (`:72`). Every cell is `whitespace-nowrap` with no max width (`:61`). No sticky header in an `overflow-auto` scroller. The filter button only turns `text-primary`; the count the comment promises (`CollectionView.svelte:189` "for the toolbar badge") is never rendered, same in `RailNoteList.svelte:134`.

**P5. [medium] Chips and badges: about 12 recipes, no primitive.** Radius `rounded` / `rounded-sm` / `rounded-md` / `rounded-full`; size `text-xs` / `text-label` / `text-[11px]` / `text-[10px]`. Examples: date badge `KanbanDatePicker.svelte:67` (`rounded-sm text-xs`), list/table date `KanbanListView.svelte:48`, `KanbanTableView.svelte:69` (`rounded text-xs`), collection calendar event `CollectionCalendarView.svelte:154` (`rounded-sm text-[11px]`), event-calendar event `EventMonthGrid.svelte:125` (`rounded-md text-xs h-[22px]`), filter count `FilterPanel.svelte:102` (`rounded-full text-label`), attention badge `EventCalendarNeedsAttention.svelte:67` (`rounded-full text-xs px-2`), rail badge `Rail.svelte:131` (`text-[10px] leading-[14px]`). Kanban date proximity is defined three times with different shades: card border `red-500/yellow-500/orange-400/blue-400` (`KanbanCard.svelte:118-123`), picker text `red-400/yellow-400` (`KanbanDatePicker.svelte:20-27`), list/table text `red-500/yellow-500` inline ternaries. Completed cards keep the overdue/today border and badge while struck through (`KanbanCard.svelte:114,167,210`). Emoji as metadata icons in `TodoistPopover.svelte:127,132` (calendar and repeat emoji) beside lucide icons. Count formatting differs: lane "To Do 2" (board), "(2)" (`KanbanListView.svelte:23`), "(4)" (`TasksView.svelte:193`), "Archive (3)", "Unscheduled (n)" vs "n unscheduled" (`EventCalendarNeedsAttention.svelte:80` vs `:92`, two disclosure widgets for the same list).

**P6. [medium] Views bypass the chrome type scale.** 212 `text-xs/sm` vs 56 chrome-scale uses; canvas, kanban, event calendar, graph and file history use the scale zero times; canvas sets 23 pixel font sizes in CSS. Result: right-sidebar panels (on the scale) and center views (off it) use different sizes for the same roles (row 14 vs `text-sm` 14 is fine, but meta is `text-xs` 12 in some, `text-[11px]` in others, `text-[13px]` in RelationshipSearch).

**P7. [medium] Hand-rolled controls without focus styles.** Native `<select>` in the kanban toolbar ("Manual", `KanbanView.svelte:488`, visible in `07-kanban.png`) and graph controls (`GraphControls.svelte:100,113`, OS chevrons in the graph screenshot); a hand-built switch (`GraphControls.svelte:88-96`) while `ui/switch` exists; a hand-built canvas context menu with its own CSS and `#fb464c` danger color (`CanvasContextMenu.svelte:211`) while `ui/context-menu` exists, and it labels Select all "Ctrl+A" on macOS although the handler accepts Cmd (`CanvasInner.svelte:238,245`); inline SVG chevrons in `KanbanDatePicker.svelte:115,119` while the file imports lucide. Canvas, kanban, graph, tags, tasks and search have 0 `focus-visible` rules across 73 raw buttons. Canvas toolbar is positioned by a magic `bottom: 118px` (`CanvasToolbar.svelte:45`) to sit above SvelteFlow controls; the floating editor-mode button overlaps the minimap corner (`08-canvas.png`, bottom right), and the "Svelte Flow" attribution shows in Lavender.

**P8. [medium] Kanban card noise.** Every card without a date shows a 50%-opacity calendar icon row (`KanbanDatePicker.svelte:88-99`, rendered unconditionally at `KanbanCard.svelte:215-217`), so `07-kanban.png` has a stray glyph under every title. Table view header is not sticky and has no container, while the list view uses `rounded-lg border` (`KanbanTableView.svelte:18-21` vs `KanbanListView.svelte:20`).

**P9. [low] Copy polish.** No pluralization: `GraphView.svelte:442` "1 notes · 1 links", `WordCount.svelte:33` "1 words", "1 characters". `event-calendar-view.logic.ts:164` titles "November, 2026" (en-US has no comma). Event issue copy shows literal backticks (`EventCalendarNeedsAttention.svelte:36` "add `date:`") and starts lowercase with raw keys (`:19-28`, default branch prints the reason slug). Search index status is worded twice: "Indexed: 15 notes" (`SearchPanel.svelte:99`) and "15 notes indexed" (`SearchStatus.svelte:27`, status bar), both visible in `02-rail-search.png`. Kanban "Add Lane" is title case where the app uses sentence case ("Add property", "New here"). Tasks file meta "(Mar 3, 2026) (4)" is two unlabeled parentheticals and the count repeats the summary line (`TasksView.svelte:189-194`). Tasks tag input shows a `#` icon before a value that already starts with `#` ("# #to-list", `TasksView.svelte:152-160`).

**P10. [low] Small view details.** Collection calendar `+N more` is a non-interactive span (`CollectionCalendarView.svelte:160-163`), so hidden records cannot be reached; the event calendar already solves this with a button that opens the day. Today in the event month grid and day headers is marked by text color only when not selected (`EventMonthGrid.svelte:108`, `EventDayHeaders.svelte:41`). TOC heading rows carry the same `ChevronRight` as the section disclosure, so they read as expandable (`TableOfContentsPanel.svelte:70` vs `:50`). Outgoing-link rows truncate with no `title` (`OutgoingLinksPanel.svelte:76-78`). Canvas file picker caps results at 20 silently (`CanvasFilePicker.svelte:60`). QuickSwitcher draws a generic `FileText` for every note while RelationshipSearch resolves each note's own icon (`QuickSwitcher.svelte:81` vs `RelationshipSearch.svelte:63,72`). Custom relationship keys with more than one underscore keep the rest (`BacklinksPanel.svelte:103` `replace('_', ' ')`; built-in `belongs_to/related_to/has_many` are fine).

## 3. Recommended standard

1. **Colors: tokens only in views.** No `rgba(255,...)`, hex or palette classes in view markup. Canvas maps SvelteFlow vars to `--border`, `--muted-foreground` (edges), `color-mix(in oklab, var(--foreground) 6%, transparent)` (dot pattern), `color-mix(... var(--background) 60%, transparent)` (minimap mask), shadows `shadow-sm` / `shadow-md`. Graph reads `getComputedStyle` of `--background`, `--muted-foreground`, `--primary`, `--border` on mount and on theme change. Collection calendar borders `border-border` and `border-border/50 border-dashed` classes. Add semantic status tokens (`--success`, `--warning`, `--info` with `-foreground` pairs, per theme in `app.css` and `theme.logic.ts`) and use them for diff, kanban proximity, "up to date", sync states. Files: `CanvasInner.svelte`, `CanvasEdge.svelte`, `CanvasContextMenu.svelte`, `CanvasFilePicker.svelte`, `CanvasLinkInput.svelte`, `CanvasToolbar.svelte`, `FileNode/GroupNode/ImageNode/LinkNode/TextNode.svelte`, `ColorPicker.svelte`, `GraphView.svelte`, `CollectionCalendarView.svelte`, `CollectionLinearCalendarView.svelte`, `TasksView.svelte:185`, `DiffViewer.svelte:14-15`, `KanbanCard/KanbanDatePicker/KanbanListView/KanbanTableView/KanbanLane.svelte`, `app.css`.
2. **One `EmptyState` component** (`components/ui/empty-state/` or `core/`): props `icon?`, `title`, `description?`, `action?` (snippet). Layout `flex flex-col items-center gap-2 py-8 px-4 text-center`; icon `size-6 text-muted-foreground/60`; title `text-row text-muted-foreground`; description `text-meta text-muted-foreground/80 max-w-64`; action a `Button variant="outline" size="sm"`. Dense panels (right sidebar, pickers) use a `compact` variant: no icon, `py-4`, `text-meta`. Copy rule: sentence case, no trailing period on single-line states, the ellipsis character for loading, say why when filtered ("No tags used in 10 or more notes" + "Show all tags"). Loading uses the same container with `Loader2 size-4 animate-spin`. Files: every file listed in P2.
3. **One `InlineAlert`** extracted from `CollectionView.svelte:585-590` / `RailNoteList.svelte:538-555` (title, optional mono detail, optional action). Raw error text goes into the detail slot or `error()` only, never as the headline. Every async view renders error separately from empty and offers Retry. Files: `EventCalendarView.svelte`, `BacklinksPanel.svelte`, `TodoistPopover.svelte`, `SearchSection.svelte`, `GraphView.svelte`, `FileNode.svelte`, `ImageNode.svelte`, `routes/composer/+page.svelte` (keep window open, keep text, show the error in the `.hint` row).
4. **`Badge` primitive** (shadcn-svelte badge, adapted): `inline-flex items-center gap-1 rounded-md px-1.5 h-5 text-label font-medium`, variants `neutral` (`bg-muted text-muted-foreground`), `primary` (`bg-primary/15 text-primary`), `success/warning/destructive/info` (`bg-<status>/15 text-<status>`), `count` (`rounded-full min-w-4 justify-center tabular-nums`). Event/record chips in calendars: `h-6 rounded-md px-1.5 text-meta` everywhere. Counts render as a `count` badge or as bare `tabular-nums text-meta text-muted-foreground`, never in parentheses. One `PROXIMITY` map in `kanban.logic.ts` consumed by card, picker, list and table; `checked` forces `none`. Files: P5 list, plus toolbar filter buttons in `CollectionView.svelte:545-552` and `RailNoteList.svelte:447`.
5. **Type: chrome scale in views.** Rows `text-row`, secondary/meta `text-meta`, chips/headers `text-label`, view titles `text-title`, table headers `section-label`-like (`text-label font-medium uppercase tracking-wide text-muted-foreground`). Ban `text-[Npx]` and CSS `font-size` in view files. Files: all of canvas, kanban, event-calendar, collection, file-history, graph-view.
6. **Controls: shadcn primitives only.** `Select size="sm"` for the kanban sort and graph filters, `Switch` for graph toggles, `ui/context-menu` for the canvas menu (with the platform modifier from the keybindings module), lucide for every glyph, `Button variant="ghost" size="icon-sm"` with a `Tooltip` for icon-only toolbar buttons (gives `focus-visible` rings for free). Radius on the ladder: controls `rounded-md`, cards/panels `rounded-lg`, chips `rounded-md` or `rounded-full` for counts; no bare `rounded`. Files: `KanbanView.svelte`, `GraphControls.svelte`, `CanvasContextMenu.svelte`, `CanvasToolbar.svelte`, `KanbanDatePicker.svelte`, `TagsView.svelte`, `TasksView.svelte`.
7. **Tables.** Shared table classes for collection and kanban table: container `rounded-lg border border-border overflow-auto`, `thead` sticky `top-0 bg-background`, header cells as in rule 5, rows `h-8 hover:bg-muted/50`, cells `max-w-80 truncate` with `title`, booleans as a read-only lucide `Check` (true) or nothing (false), missing as a muted em dash. Header fallback humanizes keys (`file.name` to "Name", strip leading `_`, sentence case) without touching stored config. Files: `CollectionTableView.svelte`, `collection.logic.ts:389`, `KanbanTableView.svelte`.

## 4. Quick wins vs larger changes

**Quick wins (each under 1 hour):**
- Composer: do not dismiss on failure, keep text, show error (`+page.svelte:45-50`). 20 min. Data-loss fix, needs a test.
- Collection calendars: replace the undefined `--foreground-15` fallbacks with `border-border` classes. 20 min.
- `TasksView.svelte:185` `text-purple-400` to `text-primary`; diff colors to tokens once status tokens exist (10 min each).
- Pluralize graph and word-count counters; "November 2026"; "Add lane"; drop backticks in event hints; one index-status wording. 30 min total.
- Tags filtered-empty message with a "Show all tags" button; Tasks empty message naming the active tag filter; drop the duplicate `#`. 30 min.
- Kanban: hide the empty-date trigger until card hover (`opacity-0 group-hover:opacity-100 focus-visible:opacity-100`), neutral proximity for checked cards. 20 min.
- Collection calendar `+N more` as a button reusing the event-calendar recipe. 20 min.
- Render the existing `activeFilterCount` as a count pill on both filter buttons. 20 min.
- "Not available" to "Only available for Markdown notes" in the three sidebar panels. 10 min.
- TOC heading rows without the chevron; `title` on truncated outgoing links. 10 min.

**Larger changes:**
- Status tokens in both themes plus kanban/diff/update migration (rule 1). 0.5 day.
- Canvas retheme: SvelteFlow vars, node CSS, context menu to `ui/context-menu`, toolbar to `Button`+`Tooltip`, real empty state (rule 1, 2, 6). 1 day.
- Graph view theming from CSS vars with a theme-change listener, plus empty and error states. 0.5 day.
- `EmptyState` + `InlineAlert` components and migration of about 30 call sites (rules 2, 3). 1 day.
- `Badge` primitive and chip migration, single proximity map (rule 4). 0.5 day.
- Collection table pass: header humanizing, sticky header, booleans, truncation, icon cells (rule 7). 0.5 day.
- Chrome-scale migration across canvas, kanban, event calendar, collection (rule 5). 1 day, mostly mechanical, needs screenshot review in both themes.

## 5. Rejected or reduced leads

- 1 (editor empty): kept only as part of P2 copy/size; a shortcut hint is a feature choice for the shell theme.
- 2 (command-loading unstyled): `Command.Loading` is not used anywhere in `src/lib`; no visible effect.
- 3, 27, 40, 46, 47, 48, 49 (tabs, palette, Reveal in Finder, switcher footer, FilesNavigator, rail icons): shell/navigation theme, not views; 49's color-only filter state is merged into P4/rule 4.
- 4, 5, 6, 8, 9, 10, 81 (BuildInfo, font cap, Templates copy, Sentry, Trash, Update, release notes): settings theme, covered by `settings.md`; verified that 7 (theme import error under the name field, `ThemeEditor.svelte:108,147-149`) and 10 (`formatBytes` returns "?") are real, and 81 shows "Update playwright.config.ts" despite the "tooling commits are hidden" note. Routed there.
- 12: built-in relationship types have one underscore; reduced to the custom-key case in P10.
- 14: kept as P7 detail; Shift+1 is correct, only the Ctrl label is off on macOS.
- 15 terminology: toolbar title is "Add text card" (`CanvasToolbar.svelte:25`), so "card" is consistent; the empty-state part is kept in P2.
- 18 (LinkNode URL repeats hostname): minor, below the bar.
- 22, 64: merged into P4/P8.
- 25, 26 (placeholder wording, empty property menus): low value, not reproduced in screenshots; fold into rule 2 copy when touched.
- 28, 29, 30: merged into P5 (two disclosures) and P9 (copy). Raw YAML keys are useful to the owner, who edits frontmatter; render them as code, do not hide them.
- 33: two toast shapes is minor; dropped.
- 34, 36: merged into P10 (low).
- 35: `h-[22px]` is likely sized for the month slot math; folded into rule 4 (`h-6` chips) as a check, not a defect.
- 37 (diff gutter size): fine for a mono diff; only the colors are kept (P1).
- 38: `HardDriveIcon` is used (`SnapshotList.svelte:57`); empty state merged into P2.
- 41, 44, 45: kept in P10 / P2.
- 52: both components are mounted; kept as P9 wording.
- 56, 57: merged into P5 / P3.
- 59: callers toast on failure (`type-definitions.service.ts:180,185,193,242`); not silent.
- 62, 63, 65, 66: merged into P5, P7, P2.
- 67: kept in P10.
- 71: false (empty checkbox) vs missing (dash) is correct semantics; the problem is the native checkbox look, kept in P4.
- 72: kept in P4; there is a header `border-b` (`CollectionTableView.svelte:42`), the issue is raw keys and weak contrast.
- 73: kept as P8.
- 74, 78, 79, 80 (new folder name, .md in tabs, row meta, "New here"): file explorer and note list theme.
- 75, 76: kept in P2/P9; the eye toggle does have a `title` (`TasksView.svelte:127`).
- 77: the now-line spans only today's column by design (common calendar pattern), not an artifact.

Not verified: Lavender rendering of the collection calendars (no screenshot; the white fallback is from code), how the composer window looks after a failure, and whether `hideRareTags` was on in the tags screenshot (inferred from the store default and the "3 tags" header).
