# Scout 05: sibling views, patterns to match or reuse

Scope: read-only survey of kanban, event-calendar, note-list, backlinks, outgoing-links, search, tags, graph-view and collection views, compared against `src/lib/features/tasks/TasksView.svelte`. Nothing was run (no app, no tests, no screenshots), so every judgement about "looks good" comes from reading markup and classes, and is labelled as opinion.

## Summary

TasksView is the only center-pane list view that skips most of the app's shared visual vocabulary. It already uses the shared `pane-toolbar` row and `bg-card`, but its group header is a bare purple link with two parenthesised counts, its rows have no chips, and it ignores the `dueDate` and `priority` data that `tasks.service.ts` already copies into every `TaskItem`. The closest in-app references are the Kanban list view (bordered group card, header with count, row with checkbox plus date chip colored by proximity), the Calendar header (title plus subtitle plus segmented control plus `Button` ghost icons) and the search result row (icon, title, muted subtitle, clamped snippet). Nothing in the app is a shared "list view" component: each view hand-rolls its own markup, so the redesign should reuse tokens, utilities and two small pieces of pure logic (`getDateProximity` and the proximity badge classes), not look for a component to import.

Best-looking in-app reference, by code only: the Kanban list view for the body (`KanbanListView.svelte`) and the Calendar header (`EventCalendarHeader.svelte`) for the toolbar. See Recommendations.

## Facts (verified in code)

### The Tasks view today

- Mounted as a tab body in `src/lib/app/EditorView.svelte:72-73`, under `EditorTabs` and next to `TagsView`, `GraphView`, `EventCalendarView`, `KanbanView`, `CollectionView` (lines 72-90). So it is a center-pane view and should match its center-pane siblings, not the sidebar panels.
- Root `div.flex.h-full.flex-col.bg-card` (`TasksView.svelte:90`). Toolbar uses the shared `pane-toolbar` (`:92`). Body is `ScrollArea` with `p-4` (`:137-138`).
- Toolbar content (`:93-133`): three text pills for date filter (`px-2 py-0.5 text-xs rounded-md`, active `bg-primary/20 text-primary`), an Eye/EyeOff icon button, a `#` prefixed text input `h-6 w-28`. No title, no count, no `ml-auto` grouping, so all controls cluster left (the three `div`s have no spacer).
- Stats line is a separate `text-xs text-muted-foreground mb-4` paragraph inside the body: `N tasks in M files` (`:144-146`).
- Group header: file name as a `text-sm font-medium text-purple-400` link, then `(date)` and `(count)` in muted text (`:152-165`). `text-purple-400` is the only hard-coded purple in `src/lib` (grep over `*.svelte`); no theme token is used.
- Row: `data-task-row`, `flex items-start gap-2 rounded-md px-1 py-0.5 hover:bg-accent/50`, indent through inline `padding-left` (`:172-176`), 16px `Circle` or `CircleCheckBig` icon (`:177-187`), text span `text-sm` with `line-through` when `task.checked` (`:190-213`). Wikilinks and URLs are rendered inline (`:194-212`).
- Empty and loading states are one centered `text-sm text-muted-foreground py-8` line each: "Indexing tasks..." and "No tasks found" (`:139-143`). No icon, no hint, and no distinction between "no tasks in the vault", "all hidden by hide-completed", and "section tag matches nothing".
- Data already available but not shown: `TaskItem.metadata` carries `dueDate`, `scheduledDate`, `startDate`, `createdDate`, `doneDate`, `cancelledDate`, `priority`, `recurrence`, `tags` (`tasks.types.ts:4-17`, `tasks.service.ts:23-44`, `contracts/generated/TaskMetadata.ts`). The only consumer of `dueDate` in a view is the Calendar (`event-calendar-tasks.logic.ts:44-60`). `priority` has no UI consumer in `src/lib` outside todoist-sync logic (grep of `src/lib` for `.priority`/`dueDate`).
- The row shows `task.text` parsed by `parseTaskTextSegments`, not `metadata.description` (`TasksView.svelte:194`), so signifiers like the due-date emoji appear as raw text in the row. The Calendar chip uses `metadata.description || text` (`event-calendar-tasks.logic.ts:56`).
- Store defaults: `hideCompleted = true`, `sectionTag = '#to-list'`, `dateFilter = 'all'` (`tasks.store.svelte.ts:4-10`). The default section tag silently narrows the list to a `#to-list` section; nothing in the UI says so except the small input.

### Shared building blocks (reuse candidates)

- `pane-toolbar` utility: `flex h-10 shrink-0 items-center gap-1 px-3 border-b border-divider` (`src/app.css:148-150`). A source-scan test forbids overriding height, padding, gap, border colour or `flex-wrap` on any element that carries it, and lists TasksView as a toolbar site (`src/tests/lib/pane-toolbar.test.ts:14-52`). Any redesign of the toolbar must keep one `pane-toolbar` element with none of those classes. A second row of filters would need its own container, not `pane-toolbar`.
- Type scale tokens: `text-label` 11, `text-meta` 12, `text-rail` 13, `text-row` 14, `text-title` 15 semibold (`src/app.css:80-98`). Sidebar panels use them (`text-row`, `text-meta`); center views mostly use raw `text-sm`/`text-xs` (Kanban, Collection, Tasks).
- `section-label` utility: 11px uppercase semibold muted, "the one uppercase section label inside a panel" (`src/app.css:137-139`). No center view uses it today (candidate for group headers).
- Radius ladder `rounded-xs/sm/md/lg/xl` and shadows `shadow-xs/sm` are theme tokens (`src/app.css:101-125`).
- shadcn primitives present: `button`, `collapsible`, `command`, `context-menu`, `dialog`, `dropdown-menu`, `input`, `popover`, `resizable`, `scroll-area`, `select`, `separator`, `switch`, `tooltip` (`src/lib/components/ui/`). TasksView uses none except `ScrollArea`; it hand-rolls buttons and input.
- No shared EmptyState component exists. `grep` for `EmptyState|empty-state` in `src/lib` only hits `CollectionView.svelte` and `canvas/FileNode.svelte`, both unrelated to a shared component. Every view writes its own centered muted line.
- Date proximity logic and colors are reusable as-is: `getDateProximity(dateStr, todayStr)` returns `overdue | today | tomorrow | upcoming | future | none` (`plugins/kanban/kanban.logic.ts:689-701`); badge classes `PROXIMITY_BADGE` are local to `KanbanDatePicker.svelte:20-27` (red/yellow/orange/blue at 15% bg); the card left-border variant is local to `KanbanCard.svelte:118-125`. The list-view variant in `KanbanListView.svelte:48` and `KanbanTableView.svelte:69` only colors overdue and today, with `-500` text shades; the picker uses `-400`. So three slightly different copies of the same mapping exist. Under the layer rules a feature importing from `plugins/kanban` would be a `features/` to `plugins/` violation (CLAUDE.md layer table; baseline file holds known ones), so reuse means extracting the pure function to `utils/`, not importing it.

### Kanban (plugins/kanban)

- Toolbar (`KanbanView.svelte:462-507`): `pane-toolbar` with a 3-button icon segmented control (board/list/table, `rounded-xs border border-border`, active `bg-primary/10 text-primary`), a sort `<select>` with `ArrowUpDown` icon, and a filter text input with `Search` icon (placeholder "Filter cards..."). All left-aligned, no `ml-auto`.
- List view (`KanbanListView.svelte:18-60`): body `flex-1 overflow-y-auto p-4 gap-4`; each lane is a `rounded-lg border border-border` card, header `border-b bg-muted/30 px-3 py-2 text-sm font-semibold` with count `({n})` in `text-xs font-normal text-muted-foreground` (`:21-24`); rows `divide-y divide-border`, `px-3 py-2`, a 16px square checkbox that fills `bg-primary` with a `Check` when done (`:35-43`), text, then a right-aligned date chip (`rounded-xs px-1.5 py-0.5 text-xs`, overdue red, today yellow, else muted, `:47-51`). Empty lane shows "No cards" (`:54-56`).
- Board card (`KanbanCard.svelte:167`): `rounded-lg border bg-background p-2 shadow-sm hover:border-primary/30`, left border color by proximity (`:118-125`), drag grip appears on hover (`:227-229`), `KanbanDatePicker` chip (`:215-217`).
- Lane header (`KanbanLane.svelte:222-313`): chevron, title `text-sm font-semibold`, count `text-xs text-muted-foreground`, `text-destructive` when at WIP limit, green `CircleCheck` for auto-complete lanes (`:309-312`).

### Event calendar (features/event-calendar)

- Header (`EventCalendarHeader.svelte:35-123`): `pane-toolbar` with `h2 text-base font-semibold` title and a `text-meta text-muted-foreground` subtitle that truncates first (`:36-40`), then a right cluster: outline "Today" `Button`, ghost icon-sm prev/next/keyboard buttons each wrapped in a Tooltip (`:42-97`), then a D/W/M segmented tablist `rounded-md border border-border p-0.5` with active `bg-muted text-foreground` (`:99-123`). Keyboard-accessible tabs with arrow keys (`:24-32`). Most polished toolbar in the app by structure.
- Dated tasks already live here: `EventTaskChip.svelte:25-43` is an outlined `rounded-md border border-border` chip with a 12px Circle/CircleCheckBig, strikethrough when done, `aria-label` with status, click opens the note at the task's line. `EventTaskLane.svelte:29-47` gives it a "Tasks" row. So the Calendar is already a due-date view of the same tasks; the Tasks view should not try to be a second calendar, it can link to it.
- Today emphasis pattern: day number in `text-primary` for today, `bg-primary text-primary-foreground` for selected (`EventDayHeaders.svelte:36-43`).
- Quiet attention area (`EventCalendarNeedsAttention.svelte:64-115`): `border-t border-border px-4 py-2`, a `rounded-full bg-destructive/10 text-destructive text-xs font-medium` badge with a count (`:68-73`), `<details>` for secondary groups (`:81-85`), a footer line "N archived events hidden. Show" with an inline toggle link (`:101-113`). Good model for "N completed hidden. Show" feedback that TasksView lacks.
- States: "Indexing vault..." and a `text-destructive role="alert"` load error, both centered (`EventCalendarView.svelte:241-243`).

### Note list (features/note-list)

- `NoteRow.svelte:67-132`: `button.flex.w-full.flex-col.rounded-md.px-2.py-2` with `hover:bg-primary/10`, active `bg-primary/25`, focus ring `focus-visible:ring-2 ring-ring/50 ring-inset` (`:70`); 16px icon + `text-row font-medium` title + optional `text-[11px] text-muted-foreground` subtitle (`:82-95`); property pills `rounded-xs bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary/80 max-w-[140px]` (`:101-130`); archived rows `opacity-60` (`:70`). This is the app's pill style for metadata; a task's tags and priority could reuse it.
- Rows have no divider and no count header; grouping is not part of NoteRow.

### Backlinks and outgoing links (right sidebar)

- Both are `SidebarSection` bodies (`BacklinksPanel.svelte:55`, `OutgoingLinksPanel.svelte:51`). `SidebarSection.svelte:34-47` uses `pane-toolbar` for its header with a chevron slot and `text-title` heading. Right-sidebar color tokens (`right-sidebar-muted-fg`, `right-sidebar-accent`) differ from center-pane tokens; not directly reusable in the center pane.
- Group sub-headers: `Collapsible.Trigger` row `rounded-md px-2 py-1.5 text-row font-medium hover:bg-right-sidebar-accent`, chevron that rotates 90 degrees, a muted icon, label, and a right-aligned count `ml-auto text-meta` (`BacklinksPanel.svelte:64-70`). Content indented `pl-2 mt-1 space-y-0.5` (`:72`). This is the collapsible group-with-count pattern TasksView lacks (its groups cannot collapse).
- `LinkItem.svelte:15-35`: file icon + `text-row truncate` name, then snippets `text-meta text-muted-foreground pl-5 truncate`, with the matched span highlighted in primary (`:26-28`). Unresolved links show `AlertCircle` in `text-destructive` at `opacity-60` (`OutgoingLinksPanel.svelte:74-80`).
- Empty states: `text-meta ... px-2 py-4 text-center`, one line ("No backlinks found", "No outgoing links", "Indexing vault...", "Not available") (`BacklinksPanel.svelte:57-62`).

### Search (features/search)

- Panel (`SearchPanel.svelte:72-149`): 40px header strip with the search input (`Search` icon absolutely positioned at left, `pl-7`, `:151-170`), a segmented mode toggle `rounded-md bg-muted p-0.5` with active `bg-background shadow-sm` (`:84-96`), a status line with `Loader2` spinner or "Indexed: N notes" (`:99-111`), then `ScrollArea`.
- Result count: `N result(s)` above the list, `text-meta text-muted-foreground` (`:122-124`). Rows are separated by `divide-y divide-divider/20` (`:125`).
- Empty states are three distinct messages by cause: "Searching...", "Type to search across all files", "No results found" (`:115-120`). This is the only view that separates the "nothing yet" from "nothing matched" cases.
- Row (`SearchResult.svelte:134-178`): fixed `h-20`, icon + `text-xs font-medium` title + right-aligned badge or score, `text-meta` subtitle (path, or `§ heading` in primary), 2-line clamped snippet. Hover `hover:bg-file-explorer-accent/60`. Shows `ShowInCalendarButton` as a sibling absolutely placed over the row (`:174-177`).

### Tags view (features/tags)

- `TagsView.svelte:49-91` is the nearest sibling in structure (same `pane-toolbar`, same `isLoading` / empty branches): title `h2 font-semibold text-sm text-primary` + `N tags` count in the toolbar (`:51-56`), right cluster via `ml-auto` of two ghost-style icon buttons for filter and sort whose icon turns `text-primary` when active (`:57-76`). Body `flex-1 overflow-y-auto p-3`. Empty branches are one line each (`:79-83`).
- `TagItem.svelte:27-70`: chevron tree, colored dot, `text-[14px]` name, right-aligned `text-xs text-muted-foreground` count. Rows `rounded-md px-2 py-1 hover:bg-accent`.
- This gives the toolbar convention in the center pane: title left, count next to it, `ml-auto` actions, active state shown by `text-primary`.

### Collection (features/collection)

- Toolbar (`CollectionView.svelte:516-...`): view tabs on the left (`text-xs px-2 py-0.5 rounded-xs`, active `bg-primary/15 text-foreground font-medium`, `:534-541`), then a muted `N results` count (`:587`), then right cluster `ml-auto` of ghost `size="icon-sm"` `Button`s each opening a `Popover` for Sort / Filter / Properties, colored `text-primary` when the setting is active (sort `:619-635`, filter `:638-...`; active-filter count drives color). Filters live in popovers (`FilterPanel.svelte`) with a conjunction model and "This view / All views" sections.
- Table view (`CollectionTableView.svelte:34-97`): `even:bg-muted/20` zebra, `hover:bg-muted/50`, sortable headers with an arrow glyph, "Showing X of Y" plus "Show more" (`:85-94`), empty state "No results match the current filters" (`:35-37`).
- Error state is a bordered `border-destructive/50 bg-destructive/10` alert block with a bold title and mono message (`:687-692`); "Configure a date property to display entries on the calendar" is a guidance empty state (`:705-707`).

### Graph view (plugins/graph-view)

- Controls float over the canvas, not in a toolbar: `absolute top-3 left-3 flex-col gap-2` with `rounded-md border border-border bg-background/90 backdrop-blur-sm` panels, mode segmented control with Globe/Target icons, zoom buttons, a `Switch`-like toggle and select (`GraphControls.svelte:26-101`). Empty message "Open a note to see its local graph" (`GraphView.svelte:452-453`). Not a pattern for a list view; mention only because it is the one view without `pane-toolbar`.

### Cross-view consistency findings

- Active-state styling for toggles differs per view: Tasks `bg-primary/20 text-primary`; Kanban `bg-primary/10 text-primary`; Collection tab `bg-primary/15 text-foreground`; Calendar `bg-muted text-foreground`; Search `bg-background shadow-sm`. No single token.
- Segmented controls exist in three flavors: Calendar (`rounded-md border p-0.5`, `EventCalendarHeader.svelte:99-100`), Kanban (`rounded-xs border`, `KanbanView.svelte:463`), Search (`rounded-md bg-muted p-0.5`, `SearchPanel.svelte:84`).
- Counts are shown as `(n)` in Tasks and Kanban list, as right-aligned `ml-auto` numbers in Backlinks, Tags, Kanban lane, and as a sentence "N results" in Search and Collection.
- Check boxes: Tasks uses circles (lucide Circle/CircleCheckBig), Kanban uses a square 16px bordered box filled with primary and `Check`, Calendar chips use circles at 12px. The circle idiom is shared by Tasks and Calendar, so keeping circles is consistent with the other task surface.

## Problems and opportunities (opinions, derived from the facts above)

1. Group header is the weakest piece: purple link with two parenthesised muted values. Siblings put the count right-aligned and make the group collapsible (Backlinks `:64-70`, Kanban lane `:222-313`).
2. Rows carry no metadata chips although dueDate, priority, tags and recurrence are already in memory. The Kanban list row already proves the layout (checkbox, text, right-aligned proximity chip).
3. The toolbar mixes unrelated concepts at one level: a date filter that filters on the file's modifiedAt (not the task's date, easy to misread as a due-date filter), a hide toggle with only an icon, and an unlabeled section-tag input. Calendar and Tags show the better convention: title and count on the left, `ml-auto` actions, `Button` ghost icons with Tooltips, active = `text-primary`.
4. No feedback on hidden content: hide-completed defaults to on and the section tag defaults to `#to-list`, yet the empty state says only "No tasks found". Calendar's "N archived events hidden. Show" and Search's three-way empty states are existing patterns for this.
5. Hard-coded `text-purple-400` is off-token and unique in the codebase.
6. TasksView uses raw `text-sm`/`text-xs`, as the other center views do; the type scale tokens exist but are used mainly in sidebars, so either is defensible; matching Kanban/Collection (center) is safest.
7. No collapsing, no keyboard navigation, no focus ring on rows (`NoteRow` has a ring, `EventTaskChip` has `focus-visible:ring-2`); the circle toggle button has an `aria-label` but the text span is a clickable non-focusable span (`TasksView.svelte:188-193`, with `svelte-ignore`).
8. Calendar already visualizes dated tasks, so a "due date" grouping in Tasks would overlap; the two should cross-link rather than duplicate.

## Recommendations for the redesign

Opinions, in priority order. All reuse existing tokens and patterns.

1. Toolbar: keep exactly one `pane-toolbar` element (test constraint). Follow the Tags/Calendar convention: `h2` title "Tasks" with a `text-meta text-muted-foreground` count on the left (`TagsView.svelte:51-56`, `EventCalendarHeader.svelte:36-40`), then `ml-auto` actions. Use `Button variant="ghost" size="icon-sm"` plus Tooltip for the hide-completed toggle, with `text-primary` when it changes the list (Collection `:619-635`). Put the date range as a segmented control in the Calendar style (`EventCalendarHeader.svelte:99-123`), or a popover like Collection if more filters are added later.
2. Group card: take the Kanban list view structure (`KanbanListView.svelte:20-25`): `rounded-lg border border-border`, `bg-muted/30` header, `divide-y divide-border` rows. Replace the purple link by the file name in `text-foreground font-medium` with a file icon (same `FileText` as `LinkItem.svelte:21`), right-aligned count `ml-auto text-xs text-muted-foreground`, modifiedAt as muted secondary text, and make the group collapsible with the Backlinks chevron pattern (`BacklinksPanel.svelte:64-70`).
3. Row: checkbox circle on the left (keep Circle/CircleCheckBig, consistent with `EventTaskChip.svelte:36-42`), description, then a right cluster of chips: due date with proximity color, priority, tags. Use the NoteRow pill style for tags (`NoteRow.svelte:103`) and the Kanban proximity palette for due date. Show `metadata.description` instead of raw `text` so emoji signifiers are not duplicated by the chips (`event-calendar-tasks.logic.ts:56` does this).
4. Extract `getDateProximity` and the badge class map to a shared pure util before reuse (layer rules: features must not import from `plugins/kanban`); consider also collapsing the three divergent copies. This is an optional slice, it only pays off if proximity chips ship.
5. Empty and loading states: three branches like Search (`SearchPanel.svelte:115-120`): loading, no tasks at all, none match filters. In the filtered case say what is hiding things ("N completed hidden" with a Show link, like `EventCalendarNeedsAttention.svelte:101-113`, and name the active section tag) and offer a reset. Use `role="alert"` plus destructive text for load errors like `EventCalendarView.svelte:243`.
6. Accessibility parity: give the text span a focusable control with a visible ring (`NoteRow` ring classes, `NoteRow.svelte:70`) so keyboard users can open the note, not just toggle.
7. Section tag: keep the input, but label it ("Section" with the `Hash` icon is already there) and surface the active tag as a removable chip in the toolbar or empty state, so the silent default of `#to-list` is visible.
8. Do not build a bespoke EmptyState or ListView component for one view; the app has none and every sibling hand-rolls. If more than one ticket needs the same chip or empty block, extract at that point.

Best in-app reference (opinion, from code only): Kanban list view for the body and group card, Calendar header for the toolbar, Search results for state handling, NoteRow for pills. If one must be named, `KanbanListView.svelte` is the closest match in content (checkable items, grouped, counted, date chips) and needs the least invention.

## Open questions for the owner

1. Is the date filter meant to filter on when the file changed (today's behavior) or on the task's own dates (due, scheduled, done)? The metadata exists; the answer changes the toolbar.
2. Should Tasks stay grouped by file, or may it also group by due date or priority? If grouped by due date, how does it differ from the Calendar's task lane?
3. Is the default `#to-list` section filter intentional for everyone, or a personal convention that should be an opt-in setting with an "All tasks" default?
4. Circles (current, matches Calendar) or Kanban-style filled squares for the checkbox?
5. Should the view ever write beyond toggling (edit text, set due date, set priority inline), or is it read plus toggle only? Inline editing would pull in `KanbanDatePicker`-style popovers and is a much bigger slice.
6. Is a screenshot comparison available? This survey is code-only; "best-looking" should be confirmed by the owner against the running app, in both light and dark themes (not checked here: hard-coded Kanban colors `text-red-400`/`-500` contrast on light backgrounds).

## Not checked

No visual rendering, no theme checks, no tests run. Did not read `EventCalendarSection.svelte`, `EventPopover.svelte`, `EventForm.svelte`, or `NoteRowMenu.svelte` in detail; they are dialogs and menus, not list layouts. Did not verify how the Tasks tab title and icon are drawn in `EditorTabs`.
