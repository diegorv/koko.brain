# Inventory: Tasks view (src/lib/features/tasks)

Scope: the three Svelte components. Non-Svelte logic files (task-query.logic.ts, tasks-keys.logic.ts, task-status.logic.ts, etc.) are cited only for copy strings.
Read-only fact collection. No judgments.

## 1. Components

| File | Lines | Renders | shadcn/ui primitives used | Custom markup |
|---|---|---|---|---|
| TasksView.svelte | 1213 | Toolbar with title, count, refresh spinner, search, Display menu; filter bar; rule sentence + Sources edit; grouped task list with group headers and rows; empty state; refresh alert; Due date dialog | Button (1207-1208, Due dialog only), ContextMenu (1128-1176), Dialog (1184-1212), DropdownMenu (Display 923-961, Filters 966-992, Status/Due/Priority/Tag 994-1060, row menus 881-899), Input (1205, Due dialog only), ScrollArea (1075) | Native `<input type=search>` (915-922); every filter trigger is a raw `<button>` with hand-written classes (928, 971, 999, 1016, 1033, 1050); group toggle (715-726); group actions (729-748); row is `<div role="listitem">` (806-900); row toggle circle (818-828); text div (832-835); wikilink/link inline (845-858); Show N more (1151-1159); Edit/Clear (1086-1101); Reset filters (1062-1069); empty action (1116-1121); Retry (607-614) |
| TaskLists.svelte | 294 | List column (`nav`, 174-242), narrow dropdown (261-293), rename/save name input, "modified" marker bar (244-259) | DropdownMenu (menu 262-289, per-list actions 202-224), Input (inline name, 162-170) | `<nav>` column with raw buttons (185-226); Save view raw button (232-240); marker buttons use `markerButtonClass` string (74) |
| SourcesPanel.svelte | 496 | Sources cards with clauses (Folder, Type, Note tag, Heading, Property, Lifecycle), Global and This-list exclude sections with switches and lists | Button (many, 261, 261-263, 368, 398, 423-439, 452-461, 470-473, 482-484, 488-491, 315-317, 324-332), DropdownMenu (picker 258-273, operator 365-381, state 394-410, add clause 467-481), Input (358, 383, 412, 304, 362), Switch (287-291, 444-448) | Panel `div role=region` (344); cards `div role=group` (351); native `div`/`section` structure; section heading `h3` + `p` pairs |

Icons: lucide-svelte via `@lucide/svelte/icons/*`. Status glyphs map a name to a component through `GLYPH_ICONS` (TasksView.svelte:94-102).

No `Tooltip` component is imported in any of the three files.

## 2. States

### Loading
- Initial load: text-only "Indexing tasks..." centered, `text-sm`, no spinner (TasksView.svelte:1079-1081). Shown whenever `!tasksStore.hasLoaded` or (index not ready and zero rows), regardless of `tasksStore.error`.
- Refresh while loaded: `Loader2` spinner in toolbar with `role="status" aria-label="Refreshing tasks"` (TasksView.svelte:910-914).
- Retry button disabled while loading (TasksView.svelte:610, `disabled:cursor-default disabled:opacity-50` at 609).
- No skeleton, no per-row or per-group loading state, no loading state in TaskLists.svelte or SourcesPanel.svelte.
- `animate-spin` (TasksView.svelte:912) is unconditional.

### Error
- Shared `refreshAlert` snippet: `role="alert"`, destructive tokens, Retry button (TasksView.svelte:602-616).
- Rendered in three branches: no rows and error (1104-1106), empty explanation plus error (1108), list plus error (1125).
- Store error set/cleared at tasks.store.svelte.ts:49, 161, 190. Message comment says raw error text goes to the log (line 47).
- Not traced: whether `hasLoaded` becomes true when an error occurs before the first successful load. If it stays false, the "Indexing tasks..." branch (1079) hides the error alert, since the alert lives only in the `else` branch (1081-1125).
- Copy-failure error is a toast (TasksView.svelte:585-591, `toast.error('Could not copy the task text.')`).
- Due dialog Save is disabled when the draft is empty (TasksView.svelte:1208). Empty draft means clear is not offered in the dialog; clearing is a separate menu item (698).

### Empty
- Empty explanation computed in TasksView.svelte:171-181 from task-query.logic.ts `explainEmptyTasks` (1385-1507). Messages: "Every open task has a due date" / "Every matching task..." (1425), "No task in this vault has a due date" + hint (1429-1430), "No task matches the Due filter" (1433), "No tasks in this vault yet" (1459), "No note matches the sources" with "Edit sources" action (1465-1466), "Every matching note is excluded" with "Edit excludes" action (1472), "The only task is closed" / "No task has the chosen status" with "Show all" (1481-1486), "No task matches the {stage} filter" with "Reset {stage} filter" (1500-1501), fallback "No tasks found" (1507).
- Empty state renders message, optional hint, action button (TasksView.svelte:1109-1123). Action buttons have no focus-visible style (1116-1121).
- Empty explanation is not shown while loading (the Indexing branch takes priority, 1079).
- Empty Tag menu: `DropdownMenu.Item disabled` "No tags in these tasks" (TasksView.svelte:671). Empty Property menu: disabled "No properties in these tasks" (953).
- Empty suggestions picker: disabled "No suggestions" (SourcesPanel.svelte:270).
- Sources card with no clauses: "No clause: this card matches every note." (SourcesPanel.svelte:464).
- Empty Sources list: no empty-state beyond the Add card button (SourcesPanel.svelte:488-491).
- Empty group (no rows) is not rendered; comment at TasksView.svelte:345 says a Note group is never empty.
- Dimmed rows (`opacity-60`, TasksView.svelte:812) carry no legend or explanation text.

### Disabled
- Delete view disabled when it is the last saved view (TaskLists.svelte:220).
- Heading-related disabled controls: none beyond the above.
- Filter triggers, Display, Reset filters: never disabled.

### Visibly absent or weak
- No stale indicator for data older than the last refresh.
- No "saving" state for row menu writes (toast only, via `updateTaskFromMenu`; not traced in this scout).
- No empty-state for SourcesPanel exclude lists (they show nothing when empty, SourcesPanel.svelte:319 `{#if exclude[list.key].length > 0}`).

## 3. Interaction

### Keyboard
- Roving tabindex: one tab-stop row, others `tabindex=-1` (TasksView.svelte:801-802, 810, 821, 845, 852, 888).
- List keydown handler (TasksView.svelte:390-417) delegates to `resolveTaskKey` (tasks-keys.logic.ts). Actions: focus (row move), toggle, open, and "menu" (clicks the row's actions button with detail 0, 416).
- Focus tracking: `onfocusin` sets current row (420-425). Focus follows rows through list changes (448-479). Focus on open (487-495). Focus restore after row menu, context menu, due dialog close (528-539) and after section item removal (SourcesPanel.svelte:197-201, 210-214, 223-227, 249-254).
- Search input: native input, Enter has no handler, updates on every keystroke (TasksView.svelte:915-919, 230-232).
- TaskLists: name input Enter commits, Escape cancels (TaskLists.svelte:143-151). Exclude inputs Enter adds (SourcesPanel.svelte:308-313).
- Sources picker and dropdown behavior: bits-ui defaults.

### Focus management
- Keyboard focus ring defined per control, see Accessibility.
- Two layers of focus-restoration code (close focus, row focus, section removal focus) exist; comments reference bits-ui default behavior being overridden (TasksView.svelte:519-527).

### Hover-only affordances
- Group header actions: `opacity-0`, shown on `group-hover/header` or `group-focus-within/header` (TasksView.svelte:733-734). Comment (728) states they "stay in the Tab order while hidden".
- Per-list actions button in TaskLists: `opacity-0` until hover, focus-within, or menu open (TaskLists.svelte:209).
- Row text click opens the note; no hover affordance shown (TasksView.svelte:832-835, cursor-pointer only).
- Row hover background `hover:bg-accent/50` (TasksView.svelte:812).
- Row actions button (`Ellipsis`) is always visible, with `hover:bg-accent` (890). Not hover-only.

### Drag and drop
- None. Grep for `draggable`, `ondrag`, `dnd`, `drop` in the three files returned no UI drag handlers (only the word "dropdown" matched).

### Context menus
- List context menu: one ContextMenu for the whole list (TasksView.svelte:1128-1176). Right-click outside a row is prevented and clears the context row (511-516).
- Row context menu uses the same snippet as the actions dropdown (`rowMenuItems`, 676-712, used at 897 and 1173).
- Row context menu items: Open at line, Copy task text, status radio group, Due submenu (presets, Pick a date, Clear), Priority submenu (TasksView.svelte:677-711).
- List-level ContextMenu also used for rows in a `contextmenu` handler on the row (811).

### Tooltips
- No Tooltip component. Only native `title` attributes: group title modified date (770), status glyph word on task toggle (824), link URL (855), chip title (868).

### Click on non-button elements
- `div` with `onclick` (opens note at line): TasksView.svelte:832-835. Carries `svelte-ignore` for `a11y_click_events_have_key_events` and `a11y_no_static_element_interactions` (831). Keyboard equivalent is the row Enter key (414).
- `div role="listitem"` with `oncontextmenu` (811) and `tabindex` (810), handled via list keydown. Carries `svelte-ignore a11y_no_noninteractive_tabindex` (805).
- Group header label `span` (786) and title `button` (767-774) are not interactive beyond their button.
- No other click-handler-on-non-button found by grep.

## 4. Accessibility

### Icon-only buttons and labels
- Toggle circle: `aria-label` "Mark task as done/not done: {text} ({glyph})" (TasksView.svelte:823), `title` (824).
- Group chevron: `aria-label` "Expand/Collapse {label}", `aria-expanded` (720-721).
- Group rule actions: text labels with `aria-label` "{label} {target}" (740).
- Row actions: `aria-label="Task actions"` (891), no `title`.
- Per list actions: `aria-label="List actions: {name}"` (TaskLists.svelte:208).
- Picker: `aria-label` "Key suggestions", "Suggestions" (SourcesPanel.svelte:261, 364, 391, 419).
- Remove clause: `aria-label="Remove clause"` (SourcesPanel.svelte:456). Remove entry: "Remove {noun} {value}" (328). Remove card: visible text "Remove card" (482-484).
- Dropdown triggers with `Ellipsis` or `ChevronDown` icons: ChevronDown has `aria-hidden` in Display and filter triggers (TasksView.svelte:931, 974, 1002, 1019, 1036, 1053), not in TaskLists.svelte:273 (has `aria-hidden`), not in SourcesPanel.svelte:262 (has `aria-hidden`), not on `Ellipsis` in TaskLists.svelte:211 or TasksView.svelte:892 (no aria-hidden).
- Search input: `aria-label="Search tasks"` and `placeholder` (TasksView.svelte:919-920). No visible label.
- Display, Status, Due, Priority, Tag, Filters triggers: visible text only, no aria-label.
- Show N more: visible text, no aria-label (1151-1159).
- Edit/Clear sources buttons: visible text only, `aria-expanded`/`aria-controls` on Edit (1088-1094).
- Retry, Reset filters, empty-state action: visible text only.
- Due dialog date input: `aria-label="Due date"` (1205).
- Loader spinner: `role="status" aria-label` on a wrapping span (911-912).

### Roles and ARIA
- `nav aria-label="Task lists"` (TaskLists.svelte:175-176), `aria-current` on active list (189), `aria-describedby` on each list button pointing to its count (190), count spans with `id` (197).
- `role="alert"` on refresh alert (603). `role="status"` on spinner (911).
- Rows `role="listitem"` (810); groups' item container `role="list" aria-label={group.label}` (1145).
- Source panel `role="region" aria-label="Sources and excludes"` (344). Cards `role="group" aria-label="Card N"` (351). Heading match group `role="group" aria-label="Heading match"` (422). Pressed state `aria-pressed` on Tag/Contains (427, 436).
- Excludes sections are `section aria-label` (279, 345).
- Toggle Switch: `aria-label` with suffix per scope (SourcesPanel.svelte:288, 306, 316, 445). The visible switch label is `aria-hidden="true"` (292, 449), so the switch's own label is the only one read.
- Rendering with `role` on the Save view/Edit flows: none.

### Focus-visible styles
- `focus-visible:ring-[3px] focus-visible:ring-ring/50` on: group toggle (719), group action (739), row toggle (822), row actions (890), Show N more (1154), column list buttons (191), per list actions (209), Save view in column (235).
- Row container: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset` (812).
- Search input: `focus:outline-none focus:border-primary/50` (921). Border-only feedback, no ring.
- No focus-visible style (browser default or none):
  - Display trigger (928), Filters trigger (971), Status (999), Due (1016), Priority (1033), Tag (1050) raw buttons.
  - Reset filters (1063-1068).
  - Edit (1086-1094) and Clear (1097-1099) sentence buttons, with `hover:underline` only.
  - Retry (608-613).
  - Empty-state action (1116-1121).
  - Wikilink button (845-848) and external link (851-858), `hover:underline` or `hover:decoration` only.
  - Marker buttons Save, Revert, Reset, Save as view (TaskLists.svelte:250-256), `markerButtonClass` (74), `hover:underline`.
  - Mode switch in menu trigger (TaskLists.svelte:270) raw button without ring.
  - Filter menu items and shadcn primitives: rely on shadcn defaults.
- `outline-none` appears on 10 elements across the three files. Each of those without a ring replacement removes default browser focus.

### Other
- Color-only status: status toggle glyphs use `glyph.tone` color plus shape (TasksView.svelte:827).
- Strike-through and muted color for closed tasks (838): color and line-through.
- Overdue due chip uses `text-destructive` icon and `data-overdue` (871-874), and `text-foreground` label. Color plus icon.
- Dimmed rows: `opacity-60` only (812).
- No explicit `lang` or `aria-live` regions except role="alert"/status.

## 5. Styling facts

### Raw color values
- None in the three `.svelte` files (grep for hex, `rgb(`, `rgba(`, `hsl(` returned no matches).
- Only theme tokens used: `text-muted-foreground`, `text-foreground`, `text-primary`, `text-destructive`, `bg-accent`, `bg-accent/50`, `bg-muted`, `bg-muted/30`, `bg-background`, `bg-background/50`, `bg-destructive/10`, `border-border`, `border-border/50`, `border-divider`, `border-destructive/50`, `border-primary/50`, `ring-ring/50`, `decoration-primary`, `decoration-primary/40`.
- Glyph tone colors come from `task-status.logic.ts` (`glyph.tone`, not read in this scout).

### Font sizes
- Custom token scale defined in src/app.css:92-102: `--text-label` 11px, `--text-meta` 12px, `--text-rail` 13px, `--text-row` 14px, `--text-title` 15px.
- Tailwind default `text-xs` (12px) and `text-sm` (14px) used alongside the tokens:
  - `text-xs`: about 23 uses across the three files (e.g. TasksView.svelte:739, 778, 1154, 1112, 1001).
  - `text-meta`: about 30 uses (e.g. SourcesPanel.svelte:281, 282, 300, 322; TasksView.svelte:908; TaskLists.svelte:235, 246).
  - `text-row`: TaskLists.svelte:191; TasksView.svelte:605.
  - `text-sm`: TasksView.svelte:786, 838, 1080, 1110; SourcesPanel: none.
  - `text-title`: TasksView.svelte:906; `text-label`: TasksView.svelte:869 (chip).
- Same 12px visual size is expressed by both `text-xs` and `text-meta`; same 14px by `text-sm` and `text-row`.
- No arbitrary `text-[11px]`-style values in these files (grep returned none). The only arbitrary values are ring widths `ring-[3px]` (many) and container queries.

### Inline styles
- `style={iconColorStyle(resolved?.color)}` on FileText fallback icon (TasksView.svelte:762).
- `style={flat ? undefined : \`padding-left: ${row.indent * 1.25 + 0.25}rem\`}` (813). Dynamic indent inline style.

### z-index
- None in the three files. Overlay stacking is left to shadcn primitives.

### Spacing and layout
- Toolbar: `pane-toolbar` utility (app.css:151-152, `h-10 px-3 border-b border-divider`), used at TasksView.svelte:905.
- Filter bar: `px-3 py-1.5 gap-2` (965). Filter triggers `h-6 px-2 gap-1` (repeated, 928-1050).
- Content padding `p-4` (TasksView.svelte:1076). Groups `space-y-6` (1135). Rows `space-y-1` (1145), row `px-1 py-0.5` (812).
- Sources panel: `mb-3 space-y-4 p-3` (344); cards `p-2 space-y-2` (351).
- Negative margins used for hit area: `p-1 -mx-1 -mb-1 -mt-0.5` on row toggle (822), `p-0.5 -my-0.5` on row actions (890).
- Heights: `h-6`, `h-7`, `size-7`, `size-5`, `size-3.5`, `size-4` mixed (e.g. input `h-6` at 921, input `h-7` in SourcesPanel 304, 358, 383, 414).

### Container queries and breakpoints
- Root `@container` (TasksView.svelte:903). Breakpoints: 420px (count hidden, 908), 560px (filters fold into Filters menu 971 vs 999-1050; subtitle hidden 778; chips wrap 833; SourcesPanel grid 296), 720px (column hidden / menu shows, TaskLists.svelte:178, 261).
- Container queries rely on the `@container` plugin; there is no `@media` query in the three files.

### Custom CSS files
- None in the tasks folder (only `.svelte` and `.ts` files).
- Shared utility in app.css: `@utility pane-toolbar` (151), `text-label` class composition (141: `text-label font-semibold tracking-wide uppercase text-muted-foreground`).

### Transitions and animation
- `transition-colors` (default 150ms Tailwind duration): TaskLists.svelte:270; TasksView.svelte:609, 928, 971, 999, 1016, 1033, 1050, 1064, 1117.
- `transition-opacity`: group actions (TasksView.svelte:734), also `transition-colors` on row (812).
- `transition-transform`: group chevron (TasksView.svelte:724, `rotate-90` when expanded).
- `animate-spin`: Loader2 (912).
- Durations are the Tailwind defaults, since no custom `duration-` values appear.

### prefers-reduced-motion
- No `prefers-reduced-motion` or `motion-reduce:` usage in the three files or in src/app.css. A repo-wide grep for `prefers-reduced-motion` returned only `src/lib/features/event-calendar/EventCalendarView.svelte`.
- `animate-spin`, `transition-transform`, `transition-opacity` apply unconditionally.

### Theme tokens and dark mode
- All colors come from semantic tokens (see above). Dark mode, if any, is handled by app.css and was not traced here.

## 6. Copy

Case and tone:
- Sentence case throughout most labels. Exceptions: "Global excludes" (SourcesPanel.svelte:494 aria-label) vs visible "Global" (495 title); section title "This list" vs aria-label "This list's excludes" (SourcesPanel.svelte:495).
- Title Case-like: "Next 7 days" (TasksView.svelte:109) vs "Note edited in the last 7 days" (113) vs "In a week" (TasksView.svelte:549) vs "This week" (task-query.logic.ts:905). Three phrasings for seven days.
- "modified" lowercase marker (TaskLists.svelte:246), other marker text is not lowercase.
- Ellipsis style: "Indexing tasks..." (TasksView.svelte:1080) uses three dots; other ellipses not checked.

Terminology conflicts:
- Reset verbs: "Reset filters" (TasksView.svelte:1067), "Reset Due filter" and "Reset {name} filter" (task-query.logic.ts:1492, 1501), "Reset" (TaskLists.svelte:253, built-in list), "Revert" (TaskLists.svelte:256, saved list), "Clear" (TasksView.svelte:1097 sources; SourcesPanel.svelte:482 "Remove card"; SourcesPanel.svelte:456 "Remove clause" aria-label; TasksView.svelte:698 Due "Clear").
- Save verbs: "Save view" (TaskLists.svelte:239, 286), "Save as view" (251), "Save" (255). Also "Save" in Due dialog (TasksView.svelte:1208). Save as view and Save view differ only by "as".
- Open: "Open at line" (TasksView.svelte:678) and aria-label "Open" not present; "Open note" wording absent.
- Group rule actions: "Hide this note", "Only this folder", "Hide this folder", "Only this type", "Hide this type" (TasksView.svelte:348-362). Mixed "this X" pattern with "Only" first in some cases.
- "Edit" (sources, TasksView.svelte:1094) vs "Edit sources" (task-query.logic.ts:1466) vs "Edit excludes" (1472). Same action, label varies.
- Sources vs excludes naming: panel "Sources and excludes" (SourcesPanel.svelte:344); section "Global excludes" vs "This list's excludes" (494-495); per-list lists "Excluded folder/note/note tag/type" nouns (SourcesPanel.svelte:63-66).
- Tag vs Note tags vs Tags: filter bar trigger "Tag" (TasksView.svelte:1052), Group by label "Note" "Folder" "Due date" "Priority" "Status" "Type", Property sub-item; exclude list label "Note tags" (SourcesPanel.svelte:65); clause kind "Note tag" (28); Heading match "Tag" (SourcesPanel.svelte:423-431) meaning heading tag.
- "Due" vs "Due date": filter trigger "Due:" (TasksView.svelte:1018), dialog title "Due date" (1193), menu "Pick a date" (695), "Due set to ..." toast (554).
- "Open/Closed/All" (SHOW_OPTIONS, TasksView.svelte:117-121) vs "Show all" (task-query.logic.ts:1486, TasksView.svelte:250 action) vs "Status: {label}" (1001). "Show" used both as a filter name and as a verb.
- Group by "Heading" (TasksView.svelte:958) is in a separate radio group below the Property submenu, outside the Group by heading.
- Empty messages: "No tasks found" (task-query.logic.ts:1507) vs "No tasks in this vault yet" (1459) vs "No task has ..." vs "The only task is closed" (1483). Mixed "task"/"tasks" and "No"/"Every" openers.
- Priority: "No priority" (task-query.logic.ts:915) vs "None" as the default priority in menus (TasksView.svelte:561 uses `'none'`). Not verified which label the menu shows.
- Tone: mostly neutral and plain. Explanation hint uses an emoji calendar (task-query.logic.ts:1430 "Type 📅 ..."). Only emoji in these strings.

Other copy:
- Placeholders: "Search tasks", "View name", "status", "active", "Archive/Old", "Inbox/Scratch.md", "#someday", "Meeting" (TasksView.svelte:919; TaskLists.svelte:167; SourcesPanel.svelte:359, 385, 63-66). Example values are lowercase in property placeholders and capitalized for folder/type.
- Toast: "Due cleared", "Due set to {date}", "Priority set to ..." (TasksView.svelte:554, 563). Other toasts: "Could not copy the task text." (589).
- Retry, Cancel, Save, Add, Remove card, Add card, Add clause, Add (buttons): consistent.
- Dialog title "Due date" (1193), field label "Due date" (1205).

## 7. Summary of the most notable facts

1. Three components: TasksView.svelte (1213 lines), SourcesPanel.svelte (496), TaskLists.svelte (294). No custom CSS file.
2. Filter bar triggers (TasksView.svelte:928-1050) are raw buttons with no focus-visible style, while row controls use ring-[3px] focus rings.
3. No prefers-reduced-motion handling in the feature or app.css. `animate-spin` (912) and `transition-transform`/`transition-opacity` apply unconditionally.
4. Loading state is text only ("Indexing tasks...", 1079-1081). Error alert is only in the loaded branch (1104-1125), so a pre-load error may be hidden behind it (not traced).
5. Hover-only actions: group header actions (734) and list actions (TaskLists.svelte:209). Both keep focus-within reveal and stay in the tab order.
6. No drag and drop, no Tooltip component. Native `title` only (770, 824, 855, 868).
7. Typography uses both token sizes (`text-meta` 12px, `text-row` 14px, from app.css:92-102) and Tailwind sizes (`text-xs`, `text-sm`) for the same visual sizes. No arbitrary font sizes, no raw colors, no z-index in these files.
8. Reset and Save verbs diverge across menus: "Reset filters" (1067), "Reset" vs "Revert" (TaskLists.svelte:253, 256), "Save view" vs "Save as view" (239, 251). "Edit sources"/"Edit" and "Due date"/"Pick a date" are also mismatched.
9. Seven-day wording differs: "Next 7 days" (109), "In a week" (549), "This week" (905).
10. Interactive `div` text target opens the note (TasksView.svelte:832-835) with keyboard equivalence only via the row's Enter key (414). Icon-only buttons all carry aria-label, except Ellipsis icons in TasksView 892 and TaskLists 211 which lack aria-hidden (inside labeled buttons, so no name impact).
