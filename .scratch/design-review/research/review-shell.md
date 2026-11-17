# Design review: App shell & navigation

Scope: src/routes, src/lib/app, features/rail-shell, core/layout, core/status-bar, core/zoom. Read-only review; every item verified against code and/or a screenshot in `.scratch/design-review/screens/`.

## Clear improvements

1. **Note-list header drops the "+" (new note) button when the column is narrow.**
   Evidence: RailNoteList.svelte:716-819 (title `min-w-16`, 5-7 shrink-0 icon buttons, `canCreate` button is last); narrow-1024x700-editor-light.png shows sort/search/one more icon and no "+".
   Proposal: below ~220px collapse the secondary actions (properties, archived, filter) into one "..." menu, and keep "+" pinned at the right end; or move "+" before the secondary actions so it is the last to clip.
   Impact: the most frequent note-list action disappears on laptops and when the list is narrowed.

2. **Navigator pane has no real minimum width: the Calendar navigator renders broken.**
   Evidence: AppShell.svelte:207-212 (navigator `minSize={3} maxSize={30}`, percent based), rail-shell.types.ts and rail-registry.store.svelte.ts carry no width hint; rail-calendar-light.png shows weekday headers colliding ("MONTUEWEDTHU..."), chevrons clipped, week numbers touching days.
   Proposal: let a registered navigator declare `minWidth` (px, ~232 for Calendar) and give the Files/Types navigators a px minimum (~160). Panes snap closed (or to the minimum) instead of rendering garbage.
   Impact: the Calendar lens is visibly broken at the width the shell offers by default.

3. **Tab strip overflow has no affordance, and tabs cannot be reordered.**
   Evidence: EditorTabs.svelte:52 (`overflow-x-auto`, scrollbar hidden by design, no onwheel/overflow menu), no `draggable` anywhere in the file; tabs-bar-several-light.png shows the left tab clipped to "ap.md".
   Proposal: fade masks on the scrolled edges, a trailing "list all tabs" chevron menu (with dirty dots), vertical-wheel to horizontal scroll, and drag-to-reorder with an insertion marker (pinned tabs stay left).
   Impact: with 5+ tabs (daily for a kanban/canvas/note workflow) you lose track of what is open.

## Moderate

4. **Right sidebar toggle overlaps the end of the tab strip and is not accessible.**
   Evidence: AppShell.svelte:190-196 (`absolute right-2 z-20`, `title` only, no aria-label, no focus-visible ring, no aria-pressed); EditorTabs strip has `px-1` and no right reserve (EditorTabs.svelte:52). With the sidebar hidden the button sits over the strip's right end (landing-default-pane-sizes-light.png).
   Proposal: reserve 40px on the right of the tab strip when the toggle is over it; add `aria-label`, `aria-pressed`, the shared `focus-visible:ring-[3px] ring-ring/50` class.

5. **Settings sheet: focus never moves in, and the title scrolls away.**
   Evidence: SettingsPanel.svelte:114-127 (role=dialog, no focus move/trap/aria-modal, no backdrop; title lives inside the scrolling `nav`); AppOverlays renders before AppShell in the DOM (+layout.svelte:183-187), so Tab from the editor never lands in the sheet; settings-appearance-light.png shows no "Settings" title at the top of the nav.
   Proposal: focus the active section button on open and restore focus to the opener on close, Tab-trap inside, make the "Settings" header sticky, `aria-modal` off only if click-through is intentional (then say so with a dimmed scrim on the covered 57%).

6. **No settings search across 19 sections.**
   Evidence: SettingsPanel.svelte:44-64 (19 sections in 6 groups), nav is a flat list (122-146).
   Proposal: a search field at the top of the nav (Cmd+F inside the sheet) that filters sections and highlights matching settings rows.

7. **Empty editor leaves a dead end and the right sidebar still shows empty chrome.**
   Evidence: EditorView.svelte:153-157 ("Select a file to view its contents" only); AppShell.svelte:265 shows the sidebar with "No file open" (PropertiesView.svelte:158) and three panel headers (editor-empty-state-light.png).
   Proposal: centered start card with Recent notes (5), "New note ⌘N", "Quick switcher ⌘O", "Command palette ⌘P"; hide the right sidebar while no tab is open (extend `hidesRightSidebar` for null path).

8. **Rail items have no shortcuts; tooltips are native `title` without them.**
   Evidence: global-keybindings.ts:140-141 only Cmd+1/2 for panels, `/` for search; Rail.svelte:362 `title={row.label}`; a Tooltip primitive exists at components/ui/tooltip but no component in scope uses it.
   Proposal: Cmd+Alt+1..n (or Ctrl+1..n) selects rail items in rail order; use the shadcn Tooltip with label plus shortcut chip on rail rows and all header icon buttons (delay ~400ms).

9. **Fresh vault opens with 3% panes, an unusable state, and the user can drag panes back to it.**
   Evidence: settings.store.svelte.ts:72-74 (`noteListSize: 3` etc., deliberate per the comment at 70-71), AppShell.svelte:207-243 `minSize={3}`; landing-default-pane-sizes-light.png (40px note list, one word per line).
   Proposal: px-based minimum (see item 2) with collapse-on-drag-under-threshold, and a sane first-run default (note list ~280px) that is still overridable; keep editor-widest as a "Focus" option, not the default.

10. **Right sidebar: static Properties pushes the other panels below the fold.**
    Evidence: AppShell.svelte:277-292, SidebarSection.svelte:56-72 (Properties is the non-collapsible variant), PropertiesView.svelte:153; right-sidebar-all-expanded-light.png needs scroll once two panels open.
    Proposal: make Properties collapsible (state remembered) and sticky section headers, so TOC/Backlinks stay one click away.

11. **Zoom has no feedback and no persistence.**
    Evidence: zoom.service.ts:3-29 (`currentZoom` module state, no indicator, no read-back, no persistence; grep for "zoom" in settings finds nothing), shortcuts at global-keybindings.ts:177-181.
    Proposal: brief "125%" toast/status-bar chip on change (click resets), persist the factor in settings and reapply on boot.

12. **Empty states give no next step and wording drifts.**
    Evidence: RailNoteList.svelte:890-897 ("No notes here" for Favorites and Archive: rail-favorites-light.png), 852 ("Nothing here"), 863 plain "Loading..." text; FilesNavigator.svelte has no empty branch.
    Proposal: one EmptyState pattern (icon, one line, one action): Favorites "Star a note with Cmd+D", Archive "Archived notes appear here", skeleton rows instead of "Loading...".

13. **Icon-only buttons missing labels and rings.**
    Evidence: RailNoteList.svelte:773-781 (Filter: title only, no ring), TypesNavigator.svelte:252-260 and 224-226 (title only), Rail.svelte:248-257 and AppShell.svelte:190-196 (no ring), RailNoteList.svelte:879-886.
    Proposal: one `IconButton` class set (aria-label from tooltip text, shared hover tint, ring) used in all pane headers.

## Polish

14. **Four different hover tints and two active tints for the same row role.** Rail.svelte:359/361, FilesNavigator.svelte:295-296, RailNoteList.svelte:738, AppShell.svelte:191. Pick one `row-hover` and one `row-active` utility.
15. **No `prefers-reduced-motion` handling.** SettingsPanel.svelte:117 (fly 200ms), Rail.svelte:377, SaveStatus.svelte:16, RailListSearch.svelte:103.
16. **Floating source-mode buttons sit in three different corners and word title vs aria differently.** EditorView.svelte:97-149 (canvas top-right, others bottom-right; "Board view" vs "Switch to board view"). Move them into the action bar or one fixed spot.
17. **Copy drift.** LayoutSection.svelte:51 vs 62 ("Inbox"/"inbox"), RailNoteList.svelte:812-813 ("Create a note in this list" vs "New here"), TypesNavigator.svelte:225/255/467 (Create vs New), Rail.svelte:274-297 title case vs SidebarSection sentence case.
18. **Status bar is 32px tall for 12px non-interactive text.** app.css:212, StatusBar.svelte:9. Drop to 24px and make "Saved"/words clickable (open history, toggle read-time).
19. **Tab a11y.** EditorTabs.svelte:44-77 (every tab tabindex=0, nested close button inside role=tab, dirty dot with no label, no arrow-key roving).
20. **Start screen and rail resize handle.** +page.svelte:49-55 (recent rows no focus ring), 12-14 (no pending state while opening a vault); Rail.svelte:312-318 resize handle `tabindex="-1"` (pointer only).
