# Layout review: app shell, pane headers, dividers, density

Scope: rail, navigator, note list, editor tabs, note action bar, editor body, right sidebar, status bar, settings drawer, view toolbars (collection, kanban, tasks, tags, calendar). Worktree at `dd4f06376`. Paths are relative to `src/`. Screenshots are under `references/ux-polish-2026-11-04/screens/{default,lavender}/`, 1440x900.

## 1. Current state

**Shell grid (AppShell.svelte:184-307).** From left to right: rail `w-12` (Rail.svelte:88, `bg-background`, `border-r border-file-explorer-border`), navigator pane, note list pane, editor pane, right sidebar, with a status bar across the bottom. There are two headers above the content:

- **Top band, 40px. Consistent.** Nine strips use `h-10 bg-tab-bar`: FilesNavigator:295, TypesNavigator:201, CalendarNavigator:88, RailNoteList:416, SearchPanel:68, EditorTabs:29, the empty-editor strip at EditorView:147, the right-sidebar strip at AppShell:273, and the traffic-light spacer at AppShell:253. The rail's own top (Rail.svelte:91) is `h-10` with no band, which is intentional.
- **Second row, under the band. No shared recipe.** Eight variants:

| Surface | File:line | Height | Gutter | Bottom edge |
|---|---|---|---|---|
| Note action bar | NoteActionBar.svelte:124 | `h-9` (36) | px-3 | `border-b border-border` |
| Collection toolbar | CollectionView.svelte:416 | `h-10` (40) | px-3 | `border-b border-border` |
| Tags header | TagsView.svelte:50 | `h-10` | px-4 | `border-b border-border` |
| Tasks toolbar | TasksView.svelte:105 | content (py-2) | px-4 | `border-b border-divider` |
| Kanban toolbar | KanbanView.svelte:462 | content (py-1.5) | px-4 | `border-b border-border` |
| Calendar header | EventCalendarHeader.svelte:35 | about 56px, two lines, flex-wrap | px-4 | `border-b border-border` |
| Properties header (sidebar) | PropertiesView.svelte:152,166 | `h-10` | px-3 | `<Separator>` (bg-divider) |
| Note list rule strip | RailNoteList.svelte:493 | content (py-1.5), `text-[11px]` | px-3 | `border-b border-file-explorer-border` |

**Dividers.** Four mechanisms are in use:

- An inset box-shadow on `--divider`, in 8 places: EditorTabs:102, AppShell:253 and :273, CalendarNavigator:89, SearchPanel:69, TypesNavigator:202, FilesNavigator:296, RailNoteList:417.
- `border-border`: 70 uses in `.svelte` files outside `components/ui`.
- `border-divider`: 2 uses.
- `border-file-explorer-border`: 4 uses.
- `Separator`, which is `bg-divider` (separator.svelte:17).

The theme values make the mix visible:
- KokoBrain Default (theme.logic.ts:95, :123): `border #242835` is darker than `editor-bg #2a2e3d`, and `divider #383a4f` is lighter.
- Lavender (theme.logic.ts:214, :239): `border #D5D0E2`, `divider #C0B8D0`.

The two edges stacked under every note header therefore render in two different line colors.

**Icon buttons.**
- There are 121 `title=` attributes in `.svelte` files outside ui. `Tooltip.Root` is used in only 2 files (DailyNoteButton, EventCalendarHeader).
- The recipes differ: `size-7 rounded-md` (NoteActionBar:119), `size-6` (AppShell:188), `p-1 rounded-md` (22), `p-1.5` (44), `p-0.5` (49).
- Four absolutely positioned source-mode toggles sit at `bottom-3 right-3` (EditorView:92-142).

**Chrome type.**
- Generic classes dominate: `text-xs` 198 and `text-sm` 111.
- The tokens are used far less: `text-meta` 30, `text-row` 33, `text-label` 10, `text-title` 8.
- `text-[11px]` appears 20 times, all duplicating `text-label`.
- `text-lg` appears 21 times, mostly the settings page `<h2>` in 14 section files.

**Status bar and settings.**
- Status bar: `h-[32px] border-t border-border` (StatusBar.svelte:8).
- Settings drawer: `fixed top-0 right-0` with inline `bottom: 24px; width: 820px` (SettingsPanel.svelte:115-116).

## 2. Problems (verified)

### High

**P1. The active tab scrolls out of the tab strip, and nothing shows that tabs overflow.**
- Evidence: EditorTabs.svelte:29 is `overflow-x-auto` with no `scrollIntoView`, no fade and no overflow control. Nothing in EditorTabs or editor.service scrolls the strip.
- Screenshots: In 08-canvas the active `Map.canvas` tab is a 6px sliver at x≈1150. In 09-view-table, `Open projects` is not visible. In 12-cmd-toggle-calendar/graph/tags/tasks-view, the active virtual tab is entirely off-strip and `Open projects.vie` is cut at the window edge. Both themes are affected.
- Why it hurts: the user cannot see which document is open.

**P2. The note action bar is overloaded, and two of its controls are duplicated elsewhere.**
- Overload: NoteActionBar.svelte:145-230 renders up to 10 equal-weight 28px ghost buttons: favorite, organized, neighbourhood, raw, width, toc, reveal, copy-path, More, then a divider and the sidebar toggle. They are not grouped. The only divider is at :221, before the sidebar toggle. At 1440px all five foldables stay inline, because `BAR_RESERVED_WIDTH = 360` in note-action-bar.logic.ts:97 leaves room for them.
- Duplicate 1: the Raw button (:171, `toggleSourceMode`) is repeated by the floating `<>` button (EditorView.svelte:131-142, `setLivePreview`), which has the same effect.
- Duplicate 2: the sidebar toggle (:222) is repeated by the absolute top-right toggle (AppShell.svelte:187-193). Both call `toggleRightSidebar`.
- Screenshot 01-shell-initial shows two PanelRight icons (x1135,y57 and x1419,y18) and two `<>` icons (x929,y57 and x1133,y841).
- Why it hurts: this is the busiest line on screen and it reads as a flat icon strip. Linear and Craft keep 3-4 visible actions.

### Medium

**P3. Second-row headers do not share a height, so their bottom edges step.**
- The note action bar is `h-9` (edge at y=76) and sits next to the Properties header, which is `h-10` (edge at y=80). Screenshots 01, 03 and 04 show the 4px step.
- For a `.view` tab the collection toolbar is `h-10`, so it aligns with Properties (09-view-table). The alignment therefore depends on the file type.
- The calendar header is about 56px (12-cmd-toggle-calendar-view: title at y≈60, subtitle at y≈79). Kanban and Tasks size to their content.
- The second-row text baselines also differ: the note list caption is at y≈54, the breadcrumb at y≈57, and Properties at y≈60.

**P4. Header stacks use two divider colors, and the empty-editor strip has none.**
- The tab band draws a light `--divider` line. The action bar and view toolbars draw a dark `--border` line beneath it (see the theme values in section 1).
- The note list header (inset `--divider`) sits on a rule strip with `border-file-explorer-border` (RailNoteList:417 vs :493).
- EditorView.svelte:147 omits the inset divider that its siblings at AppShell:253 and :273 draw, so the bar edge changes when the last tab closes.

**P5. The note list header is crowded: the title truncates and the count is unreadable.**
- RailNoteList.svelte:416-484 puts the title, the count, Sort, Filter, a text button (`headerAction`, for example "Daily note") and a "New here" text button into one header that is about 280px wide.
- The title is the only item that shrinks. It renders as "Tod..." in 01-shell-initial in both themes.
- The count (:421) is `text-file-explorer-muted-fg` on `bg-tab-bar`. It is almost invisible ("6" and "2" in 02-rail-files and 03-note-roadmap), which contradicts the code's own comment at :422 that only tab-text tokens are readable on the tab bar.

**P6. The note list header has a traffic-light inset even when it is not the first pane.**
- RailNoteList:416 and SearchPanel:68 always use `pl-6`, which is meant to clear the macOS traffic lights.
- With a navigator shown (Files, Types), the list header title starts at x=267 while the caption starts at 255 and the row icons at 263 (02-rail-files). The header and body do not share a left edge.

**P7. The right sidebar has an empty band, inconsistent separators, three insets and two add buttons.**
- **Empty band:** AppShell:273 is an empty 40px strip whose only control is the duplicated absolute toggle.
- **Separators** are inconsistent:
  - PropertiesView draws its own (:166, :302).
  - AppShell adds one only after the TOC (:280). There is none between Backlinks and Outgoing links (01, y≈350).
  - `Separator` is imported but never rendered in TableOfContentsPanel:4, BacklinksPanel:6 and OutgoingLinksPanel:7.
- **Insets:** the Properties title is at 12px (px-3), Relationships at 16px (p-2 + px-2, PropertiesView:256), and the collapsible titles at about 32px (px-3 + chevron + ml-1.5).
- **Static vs collapsible headings:** "Relationships" is static but uses the same `text-title text-right-sidebar-primary` as the collapsible TOC, Backlinks and Outgoing headers, so nothing signals which ones expand.
- **Two add-property entry points:** the header `+` (:157-163, toggles) and the footer "Add property" row (:245-251, opens only).

**P8. The right sidebar stays open with nothing to show on board, canvas and view tabs.**
- `hidesRightSidebar` (layout.logic.ts:17) only covers the virtual tabs. On `.kanban`, `.canvas` and `.view` files the sidebar shows "Properties: Not available" (PropertiesView:170-173) plus empty TOC, Backlinks and Outgoing sections. This is visible in 07-kanban, 08-canvas and 09-view-table.
- In 07 it hides the third kanban lane, which shows only "Sh", with no sign that the board scrolls.

**P9. A stray active-line slab shows above the note title.**
- `.cm-activeLine` (setup/editor-theme.ts:52, `--syntax-active-line`) paints a full-width 24px band on the cursor line.
- When the cursor sits at document start inside the hidden frontmatter (frontmatter-field.ts hides those lines), the band is empty and floats above the title: 01 and 03 in both themes, and 02-rail-today. In 04 the same band sits behind the H1.
- Why it hurts: it reads as a broken widget, and it is the first thing seen on an empty daily note.

**P10. The settings drawer overlaps the status bar, and its headers do not line up.**
- The inline `bottom: 24px` (SettingsPanel.svelte:116) is stale against the `h-[32px]` status bar, so the drawer covers the top 8px of the status bar. In 20-settings-* the drawer edge is at y≈876 and the bar starts at y≈868.
- The nav header uses `py-5` plus `text-lg` (:122-124), while the content uses `py-8` (:153) plus each section's `<h2 class="mb-4 text-lg">`. As a result "Settings" sits at y≈25 and the page title at y≈45 on every page (03-rail, 06-1-1-notes, 15-todoist).
- The page title scrolls away with the content, and rows run to the window top edge (20-settings-04-periodic-notes-bottom).

**P11. The file name is repeated three times in 60px.**
- The tab shows "Roadmap.md", the breadcrumb shows "Note › Roadmap.md" (NoteActionBar:129-131), and the H1 shows "Roadmap" (03).
- The note list shows "Roadmap" without the extension, so the tab and breadcrumb are the outliers.

**P12. Search result and backlink rows: the calendar action covers text.**
- SearchResult.svelte:176 puts an opaque `absolute right-1 bottom-1` button over the 2-line snippet, which has no right gutter.
- LinkItem.svelte:34 puts `absolute right-1 top-0.5` over the title.
- This only happens for notes that are calendar events (ShowInCalendarButton renders only then), so it is real but conditional.

### Low

**P13. Tab heights vary.**
- Unpinned tabs: `py-1.5` plus a 20px text line, 32px total.
- Pinned tabs, which are icon only: `py-2` plus a 14px icon, 30px total.
- The active tab adds `border-b-2`, for +2px.
- With `items-end` (EditorTabs:29,37-40) the tab tops differ by 2-4px.

**P14. View toolbar gutters are mixed.**
- px-3 in NoteActionBar and CollectionView, px-4 in Tags, Tasks, Kanban and EventCalendarHeader.
- TagsView's header is px-4 but its body is p-3.

**P15. Empty states are placed inconsistently and are bare.**
- The editor empty state is centered vertically (EditorView:148) and offers no actions.
- View empty states sit at the top: CollectionView:606 and :620 use `flex-1` inside a block `overflow-auto` parent, Tasks shows "No tasks found" at y≈139, and Tags at y≈136.

**P16. Search duplicates the status bar.**
- "Indexed: 15 notes" (SearchPanel.svelte:99) appears together with "15 notes indexed" (SearchStatus.svelte:27) in 02-rail-search.

**P17. The floating source toggle overlaps the canvas minimap.**
- The toggle (EditorView:105-116, at x1120-1148, y827-855) sits on the minimap's corner (x946-1146, y703-853) in 08-canvas.

**P18. Rail settings: the up/down chevrons do not form a column.**
- Rows without a switch (Today, and Search) have no fixed switch slot in RailSection.svelte:74.
- The Today chevrons sit at x1338/1370 while the other rows' sit at x1294/1326 (20-settings-03-rail).

**P19. The table widget is narrower than the surrounding blocks.**
- It reserves 24px on the right for a hover-only add-column control (live-preview/styles.ts:405-411), plus a 6px add-row strip with a 6px font (:412-418).
- The table's right edge is at 1062, the code block's at 1086 and the callout's at 1089 (04-note-alpha-blocks).

**P20. The calendar header controls do not match in height.**
- The Today button uses `Button size="sm"` (EventCalendarHeader:42), but the D/W/M group is sized by hand (:99, :115).
- In 12-cmd-toggle-calendar-view the button is about 30px tall and the group about 22px.

**P21. Note list row metadata is inconsistent.** Rows show "Kanban", "Canvas" or "View" alone, but "Note · just now" for notes (02-rail-files, both themes).

**P22. The collection table header does not stick (CollectionTableView:39-42).** `sticky` alone will not work: the inner `overflow-auto` becomes the sticky container, while the outer CollectionView:587 is what scrolls.

**P23. Menu grouping is fragmented.**
- The note action bar More menu has 3 items and 2 separators when nothing is folded (NoteActionBar:196-217).
- NoteRowMenu has 6 separators splitting about 9 items into 7 groups: Change icon, Favorite and Reveal each stand alone (:230-251).

**P24. Smaller issues.**
- The vault root icon (lucide `vault`, FilesNavigator:327) reads as a boxed X at 16px (02, 03).
- NoteRow rename mode switches from `items-start mt-0.5` to `items-center` (NoteRow:44 vs :75), so the icon jumps on F2.
- ThemeEditor has a back arrow and a Cancel button that both call `onCancel` (ThemeEditor.svelte:132, :152).
- Backlinks and Outgoing use `max-h-[50vh] overflow-y-auto` inside the sidebar ScrollArea (BacklinksPanel:63, OutgoingLinksPanel:61), which nests scroll areas.

## 3. Recommended standard

**R1. Pane header (top band).**
- Every pane header is `h-10 bg-tab-bar` with a bottom divider, drawn by a single `@utility pane-header` in app.css (`height: 2.5rem; background: var(--tab-bar); box-shadow: inset 0 -1px 0 var(--divider)`). The utility replaces all 8 inline box-shadows and the scoped style in EditorTabs.
- The traffic-light inset `pl-6` is applied only to the first pane after the rail. Pass it as a prop or `data-first-pane`, never hard-coded.
- Files: AppShell, EditorView, EditorTabs, FilesNavigator, TypesNavigator, CalendarNavigator, RailNoteList, SearchPanel.

**R2. Pane toolbar (second row).**
- One `@utility pane-toolbar`: `flex h-10 shrink-0 items-center gap-1 px-3 border-b border-divider`.
- It applies to the note action bar (h-9 becomes h-10), the collection toolbar, Tags, Tasks and Kanban, the calendar header (one line, with the subtitle inline as `text-meta`), the Properties header and the note list rule strip.
- Chrome dividers use `--divider` only. `--border` stays for inputs, cards and popovers.
- Files: NoteActionBar, CollectionView, TagsView, TasksView, KanbanView, EventCalendarHeader, PropertiesView, RailNoteList.

**R3. Gutter.**
- A 12px content edge (px-3) for headers, toolbars, sidebar sections and list containers.
- List rows sit in a `px-1` container with `px-2` rows, so text lands at 12px.
- Files: TagsView, TasksView, KanbanView, EventCalendarHeader, PropertiesView, OutgoingLinksPanel, BacklinksPanel, TableOfContentsPanel, RailNoteList, SearchPanel.

**R4. Icon buttons and the action budget.**
- One recipe: `size-7 rounded-md` with a `size-4` icon and a shadcn `Tooltip` (label plus shortcut) instead of `title=`.
- Group separator: `mx-1 h-4 w-px bg-divider`.
- Note action bar layout: [breadcrumb] … [hub button] | favorite, organized | raw | More | sidebar toggle. Neighbourhood, width, toc, reveal and copy-path start in More (raise `BAR_RESERVED_WIDTH` or default them to folded).
- Remove the floating `<>` for markdown notes (EditorView:131-142). Keep the floating toggle only for kanban, canvas and collection, which have no action bar, and move it clear of the canvas minimap (top-right of the canvas, or into CanvasToolbar).
- Keep exactly one sidebar toggle. Keep the tab-band one (AppShell:187), because it also serves non-note tabs, and drop NoteActionBar:221-230. The alternative is to move it into the right-sidebar header row when the sidebar is open.

**R5. Tabs.**
- Every tab is a fixed `h-8`. Inactive tabs get `border-b-2 border-transparent`. Pinned tabs change only their horizontal padding.
- On `activeIndex` change, call `scrollIntoView({ inline: 'nearest' })`.
- Show a gradient fade on the overflowing edge, plus a chevron menu that lists all tabs.
- Hide the `.md` extension in tab labels and the breadcrumb.
- File: EditorTabs.svelte, plus NoteActionBar breadcrumb logic (show the type and folder, not the file name again).

**R6. Right sidebar sections.**
- A `SidebarSection` wrapper with an `h-10 px-3` header (chevron slot always reserved, `text-title`), body `px-3 pb-2`, and `border-t border-divider` between sections, drawn by the wrapper. Remove AppShell:280 and the unused Separator imports.
- Static sub-headings (Relationships) use `section-label`.
- Use the empty 40px band (AppShell:273) for the sidebar title or a panel switcher, not nothing.
- Hide the sidebar, or show a single centered empty state, for `.kanban`, `.canvas` and `.view` tabs, by extending `hidesRightSidebar`.
- Keep one add-property entry point (the footer row) and drop the header `+`.

**R7. Empty states.**
- One `EmptyState` pattern: `flex h-full flex-col items-center justify-center gap-2 text-row text-muted-foreground`, with an optional icon and up to 2 actions.
- The editor empty state should offer New note, Today's note and the quick switcher shortcut.
- Files: EditorView, CollectionView, TasksView, TagsView, PropertiesView.

**R8. Editor body.**
- No active-line background in live preview, or only while the editor is focused and the cursor line is visible.
- Place the cursor at body start when the frontmatter is hidden.
- Files: setup/editor-theme.ts, frontmatter-field.ts (cursor placement).

**R9. Settings drawer.**
- Define `--status-bar-height: 2rem` once. Use it in StatusBar (replacing `h-[32px]` with `h-8`) and for the drawer bottom.
- One shared header row (`h-14`, same baseline) for the nav ("Settings" plus close) and the page title, with the content title sticky with a bottom divider.
- Move the section `<h2>` into SettingsPanel, derived from the section label, and delete the 14 per-file copies.

## 4. Quick wins vs larger changes

**Quick wins** (each well under 1h, mostly class edits):
1. Remove the floating markdown `<>` toggle and the action bar sidebar toggle (P2). About 15 min.
2. Make the note action bar `h-10` (P3). About 5 min.
3. Add the divider to the empty-editor strip and swap `border-border` for `border-divider` in the 7 toolbars (P4). About 30 min.
4. Settings drawer: `bottom: 32px`, and change the status bar to `h-8` (P10). About 5 min.
5. Scroll the active tab into view (P1, first part). About 20 min.
6. Make the note list count `text-tab-text-inactive` and turn "New here" and the header action into icon buttons with tooltips (P5). About 30 min.
7. Remove the duplicate indexed line in SearchPanel (P16) and the duplicate ThemeEditor exit (P24). About 10 min.
8. Reserve the switch slot in RailSection rows (P18). About 10 min.
9. Fold neighbourhood, width, toc, reveal and copy-path into More by default (P2). About 15 min, plus a test update in note-action-bar.logic.
10. Reserve a right gutter (`pr-7`) on SearchResult snippets and the LinkItem title row (P12). About 10 min.

**Larger changes:**
1. `pane-header` and `pane-toolbar` utilities with first-pane inset logic, applied across about 15 files (P3, P4, P6, P14). About half a day.
2. The SidebarSection wrapper, hiding the sidebar for non-note files, and using the top band (P7, P8). Half a day to a day.
3. Tab strip overflow fade and chevron menu, fixed tab height, extension hiding (P1, P11, P13). Half a day.
4. The EmptyState component and editor empty-state actions (P15). About 3h.
5. Settings drawer header row, sticky title and centralized section titles (P10). About 3h.
6. Active-line and cursor placement with hidden frontmatter (P9). About 2h, plus editor tests.
7. Calendar header on one line at h-10 with a matched control height (P3, P20). About 2h.

## 5. Rejected leads

- #5 (status bar `::before` stray divider): child components render no element when empty, and 07-kanban shows no stray divider with WordCount hidden. Only the `h-[32px]` magic value is real, folded into P10.
- #8, #10, #11, #12 (canvas icon semantics, double resize grip, node chrome drift, min sizes): real or plausible, but they are component and token concerns, not layout. Left to that review.
- #9 (canvas toolbar at `bottom: 118px`): the toolbar sits flush above the zoom controls in both themes. The magic number is fragile but has no visible defect.
- #16 (FilterPanel duplication) and #39 (KanbanView indentation): code structure, not visible.
- #17, #18 (EventCalendarSection control heights): not visible in any captured screen. The calendar header case is kept as P20.
- #19 (weekday vs day-number inset, 2px): trivial and not captured.
- #20 (file history column headers): the only capture is the empty state, and the header mismatch is not observable there.
- #27 (RelationshipSearch 12px vs 8px inset): the popover is not captured, and the difference is trivial.
- #31 (Inbox badge in its own heading): settings information architecture, not shell layout.
- #32 (navigator header h-10 coupling): verified that all nine top-band strips are `h-10 bg-tab-bar`. The top band is the one consistent part of the shell.
- #34 (search input right edge 12px vs 8px): 2px in the screenshot (x314 vs 316), trivial.
- #35 (search card fixed h-20 clipping): deliberate (comment at SearchResult:134, for the virtual list), and no clipping is visible in the captures.
- #37, #38 (kanban overdue bar, lane rename jump): component states, left to the components review.
- #40 (welcome page overflow with many vaults): `MAX_RECENT_VAULTS = 3` (vault.logic.ts:13), so it cannot overflow at normal window sizes. #41 (missing `min-w-0` on the recent-vault button) is plausible and a one-class fix, but no capture shows it.
- #42 (table add-row 6px): kept as part of P19.
- #56 (Svelte Flow attribution): visible as a sliver under the minimap. Hiding it is a licensing decision for the owner (xyflow `proOptions.hideAttribution`), not a layout rule.
- #61 (calendar SUN column clipped): it is not clipped. The seven columns share the width equally (about 123px each) and the last one meets the window edge, which is normal.
- #63 (rail active state vs main view): by design. The rail selects the navigator and note list, while Tasks, Tags, Graph and Calendar are editor tabs.
- #71 (Update page badge repetition): settings copy and grouping, not shell layout.
- Out of scope but noticed: the status bar shows "1 min read" for 0 words (01), and the Tags header says "3 tags" while the body says "No tags found" (12-cmd-toggle-tags-view). The second may be a fixture artifact and needs a check in the real app.
