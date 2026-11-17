# Lens review: Information architecture and navigation

Scope: the whole app through one question: can the owner predict where a thing is, how to get back, and how views relate? Inputs: the 15 inventories and area reviews in this folder, the screenshots in `../screens/`, and the code. Every claim below was checked against code (file:line) or a screenshot. Findings already made by one area review are only repeated here when the cross-app pattern adds something.

Map of the app as it is today (for reference):

| Surface | Kind | Visible entry | Keyboard | Palette |
|---|---|---|---|---|
| Search | rail lens (fills note list) | rail | `/`, Cmd+Shift+F | Search in Vault |
| Inbox, Today, Favorites, Archive, pins | rail lens | rail | none | Go to X |
| Types, Calendar (navigator), Files | rail navigator + lens | rail | none | Go to X |
| Neighbourhood | lens with no rail button | action bar icon (folds into More) | none | none |
| Tasks | virtual tab | none | Cmd+Shift+T | Toggle Tasks View |
| Calendar (events) | virtual tab | "Open Calendar tab" button at the bottom of the Calendar navigator | Cmd+Shift+C | Toggle Calendar View |
| Graph | virtual tab | none | Cmd+G | Toggle Graph View |
| Tags | virtual tab | none | none | Toggle Tags View |
| Kanban, canvas, .view table | file tab | Files list, quick switcher | none | none |
| Settings | non-modal right sheet | macOS app menu | Cmd+, | Open Settings |
| File history | dialog | none | Cmd+Shift+H | View File History |
| Trash browser | inside Settings > Trash | Settings | none | none |

## Clear

### 1. Kanban, canvas and .view tables are second-class in navigation
- Problem: the owner opens boards, canvases and tables every day, but these tabs get none of the chrome a note gets. No action bar, so no breadcrumb, favorite, reveal, copy path, archive or delete (EditorView.svelte:68-70 renders `NoteActionBar` only when `isMarkdownNote`). They cannot be favorited (NoteRowMenu.svelte:256-266 hides Favorite for non-markdown files) and only `.view` files and types can be pinned to the rail (lens.logic.ts:219-229), so a board has no quick-access slot at all: Files tree, quick switcher or a pinned tab. The source toggle floats in a different corner per type (EditorView.svelte:97 kanban bottom-right, :111 canvas top-right, :124 table bottom-right). Cmd+\ calls `toggleSourceMode` (editor.service.ts:437-439), which flips `isLivePreview`, but kanban/canvas/table read their own local flags (EditorView.svelte:31-35, 80-91), so the shortcut silently does nothing on those tabs.
- Evidence: kanban-board-light.png (toolbar but no breadcrumb or actions), canvas-view-light.png (no header band at all, floating tool column), view-file-table-light.png.
- Proposal: one file header for every file tab (note, board, canvas, table): breadcrumb, favorite, source toggle wired to Cmd+\ for every type, More menu (reveal, copy path, history, rename, move to trash). Let Favorite and Pin to rail apply to any file: `.view` already carries `_rail` in YAML, so `_favorite` fits there; `.canvas` and `.kanban` need either a key in the file or a settings-side list (owner decision).
- Effort: M.

### 2. No navigation history: every open appends a tab and there is no Back
- Problem: `openFileInEditor` either focuses an existing tab or pushes a new one at the end (editor.service.ts:148-198, editor.store.svelte.ts:52-61). Every note-list click (NoteRow.svelte:71), wikilink (editor-host.ts:143-146), backlink, search result, graph node and calendar event goes through it. There is no back/forward anywhere (grep for history/back navigation in src/lib finds nothing; Cmd+Shift+[ and ] only cycle tabs, global-keybindings.ts:86-99). Following three links leaves three new tabs and no way to "go back" except finding the old tab in a strip that already overflows without an overflow control (tabs-bar-several-light.png). The row menu's "Open in new tab" (NoteRowMenu.svelte:224-227) calls the same function as a plain click, so the label promises a distinction that does not exist.
- Proposal: per-tab history. A plain click or link replaces the active unpinned tab and pushes its history; Cmd+click, middle-click and "Open in new tab" open a new tab; a pinned tab never gets replaced. Back/Forward on Cmd+[ / Cmd+] (and mouse buttons 4/5), with two chevrons at the left of the file header from finding 1. This changes daily muscle memory, so it is an owner decision; if tab-per-open stays, at least rename the row menu item and add the tab overflow list.
- Effort: L.

### 3. Two "Calendar"s, and four full views have no visible entry point
- Problem: the rail item "Calendar" is the periodic-notes navigator (calendar-rail.service.ts:26-32); the "Calendar" tab is the event calendar (commands.ts:226-234). Typing "cal" in the palette gives "Calendar: Redo", "Calendar: Undo", "Go to Calendar", "Calendar: Go to Today", "New Calendar Event" (command-palette-filtered-light.png): two different destinations under the same name. Settings mirrors the split: "Calendar" configures the tab, "Periodic Notes" configures the navigator (settings-calendar-light.png). Tasks, Graph and Tags have no visible button anywhere: `toggleTasksTab` is called only from commands.ts:222 and global-keybindings.ts:121, `toggleGraphTab` only from commands.ts:213 and global-keybindings.ts:112, `toggleTagsTab` only from commands.ts:291 (no shortcut). The Calendar tab's only visible door is a small "Open Calendar tab" button under the mini month (CalendarNavigator.svelte:153-160).
- Proposal: add a built-in "Views" group to the rail, reusing the existing Actions section pattern (Rail.svelte:294-302), with Tasks, Calendar, Graph and Tags as tab openers marked with a small "opens in editor" glyph, hideable and reorderable in Settings > Layout like every other item. Pinned `_open_in_editor` views already make rail items that open tabs (rail-navigation.ts:19-22), so ADR-0033's "every pick is a lens" already has this exception. Rename the navigator (for example "Journal") so "Calendar" means one thing, and recategorize Calendar Undo/Redo out of "Navigation".
- Effort: M.

### 4. The keyboard can open a lens but cannot enter it, and shortcuts are spent unevenly
- Problem: Inbox, Today, Favorites, Types, Calendar navigator, Files, Archive, pins, Tags, the daily note and "+ New here" have no shortcut; "+ New here" has no palette command either (RailNoteList.svelte:808-819 is its only trigger). Meanwhile one toggle owns three bindings: Cmd+1 hide, Cmd+2 show and Cmd+Shift+B toggle the same rail panels (global-keybindings.ts:133-141). After "Go to Inbox", focus stays where it was: `selectRailItem` only writes layout (rail-navigation.ts:14-24), and the lists have no arrow keys or roving focus (review-note-list #3), so the next step needs the mouse or a long Tab trail.
- Proposal: Cmd+1..9 select rail items in rail order (the Mac convention for sidebar items), keeping Cmd+Shift+B as the only panel toggle; "Go to X" and those shortcuts move focus into the note list on its active row; a "New note here" command with a shortcut; a region-cycling key (F6 or Ctrl+Tab style) rail, navigator, list, editor, sidebar. Cmd+1/Cmd+2 were approved in ADR-0033, so re-binding them is an owner decision.
- Effort: M.

## Moderate

### 5. Creating something has many doors with different destination rules and names
- Problem: Cmd+N makes a timestamped capture in the capture folder (note-composer.service.ts:20-55). Palette "New File" writes `Untitled.md` at the vault root with no shortcut (commands.ts:148-159). Quick switcher Create writes to the root and only when nothing matches (QuickSwitcher.svelte:40-60). Palette "New Canvas" and "New Kanban Board" write to the root (commands.ts:171-192). The Files folder menu writes into that folder (FilesNavigator.svelte:80-91, 346-362). "+ New here" follows the lens rule and is mouse only (new-note.service.ts:26-46). Templates are palette only (commands.ts:371-376). Names drift: "New File", "New note", "New here", "Create a note in this list", "Create Quick Capture Note", "New Canvas", "New table", "New view", "New Kanban Board".
- Proposal: keep Cmd+N as capture (owner habit). Every other creation command uses the current lens's rule (the picked folder in Files, the type in Types, the day in Calendar) instead of the root, and says where in its label ("New canvas in Projects"). One vocabulary: "New <kind>". A "+" menu in the Files header and the note-list header lists the same kinds.
- Effort: M.

### 6. Note actions are split over five surfaces with different subsets and names
- Problem: row menu (NoteRowMenu.svelte:224-285): open, duplicate, copy path, change icon, favorite, reveal, rename, move to trash. Action bar (NoteActionBar.svelte:146-219): favorite, organized, neighbourhood, raw, width, TOC, reveal, copy path, copy deeplink, archive, delete. Tab menu (EditorTabs.svelte:98-109): pin, close. Palette: favorite, organized, history. File history has no menu entry anywhere, only Cmd+Shift+H and the palette (commands.ts:405-415). The same action is "Delete this note" in the bar (NoteActionBar.svelte:218) and "Move to Trash" in the row menu (:284); both move to trash (delete-note.service.ts:14-18).
- Proposal: one note-actions list rendered by the row menu, the action bar's More, the tab context menu and the palette, with the same labels and order: Open in new tab, Rename, Move to..., Duplicate, Favorite, Mark organized, Archive, History, Reveal, Copy path / link, Move to Trash. Tab menu also gets Close others, Close to the right and Reveal in list.
- Effort: M.

### 7. Full views hide the right sidebar but keep the note list
- Problem: `hidesRightSidebar` hides the right sidebar for Calendar, Tasks, Tags, Graph, canvas, table and kanban tabs (layout.logic.ts:14-28), derived and not persisted. The navigator and note list stay (AppShell.svelte:205-259). In calendar-week-light.png the Today list sits beside the week grid with nothing to do with it; in tasks-all-open-light.png the note list and the Tasks list column make two list columns side by side, and the kanban board loses its fourth lane to the right edge (kanban-board-light.png).
- Proposal: treat the left panels like the right sidebar: hidden while a full-view tab is active, without touching the saved setting, and back when a note tab is active. Cmd+Shift+B shows them for that session if wanted.
- Effort: S.

### 8. A `.view` has two homes and the surface decides which one you get
- Problem: clicking a `.view` row in the Files note list opens the table tab (NoteRow.svelte:71). Clicking it under Types > Views fills the note list unless `_open_in_editor` is set (TypesNavigator.svelte:414). The palette's "Open view" and a wikilink to a view follow the Types rule (commands.ts:98-110, rail-navigation.ts:32-38, editor-host.ts:185-188). Creating a view from the Files folder menu jumps the rail to Types (FilesNavigator.svelte:412, AppShell.svelte:231). Compare view-file-table-light.png and rail-types-light.png: same file, two layouts, no link between them.
- Proposal: one rule everywhere (`_open_in_editor` decides, Files list included), plus an explicit switch on both renderings: "Open as table" in the view lens header and "Show in note list" in the table tab's header.
- Effort: S.

### 9. Wayfinding: nothing in the open note leads back to where it lives
- Problem: the breadcrumb is two static spans, type then file name (NoteActionBar.svelte:129-131; note-action-bar-light.png "Project > file.md"), not clickable and without the folder. No command reveals the active note in Files or in the list (grep finds none). The Neighbourhood lens has no rail button (rail-items.logic.ts:24-25, lens.logic.ts:196), so when it is shown no rail item is active and there is no visible way back except picking another item. Search replaces the current lens (open-search.service.ts:11-15) and Escape only blurs the input.
- Proposal: clickable breadcrumb segments (type picks the Types lens for that type, folder picks it in Files and scrolls to the row); a "Reveal in list" command and tab menu item; Neighbourhood shown as a transient rail row or a dismissible header chip ("Neighbourhood of X ×") that returns to the previous lens; Escape on an empty search returns to the previous lens.
- Effort: M.

### 10. The macOS menu bar holds almost nothing
- Problem: the native menu has only KokoBrain (About, Settings, Services, Hide, Quit), Edit and Window (src-tauri/src/lib.rs:212-247). There is no File, View, Go or Note menu, which on macOS is where a user scans for commands and learns shortcuts. Vault switching has no entry once a vault is open: `openVaultDialog` and `openRecentVault` are only called from the start screen (+page.svelte:13-17).
- Proposal: File (New note here, Quick capture, New canvas / board / table / folder, Open quick switcher, Open vault, Open recent, Close tab), View (rail panels, right sidebar, source mode, zoom, Tasks, Calendar, Graph, Tags), Go (Back, Forward, rail items Cmd+1..9, next and previous tab), Note (the list from finding 6). Each item shows its accelerator, which documents the keyboard map for free.
- Effort: M.

### 11. Sidebar panels and feature settings can only be reached through the Settings sheet
- Problem: Properties, Backlinks and Outgoing links are shown or hidden only in Settings > Layout (LayoutSection.svelte:129-150), while Table of contents also has a palette command and an action-bar button (commands.ts:322-330, NoteActionBar.svelte:98). `settingsPanelStore.open(section)` exists (settings-panel.store.svelte.ts:11) but no caller passes a section, so no feature can say "configure this": the Calendar tab, disabled search modes (review-finders #6) and the empty History dialog (review-links #10) all leave the user to find the right one of 19 sections.
- Proposal: a hide control on each sidebar panel header and an "add panel" menu at the bottom of the sidebar for hidden ones; "Configure..." links from features that open Settings at their section.
- Effort: S.

### 12. Trash is browsed only from inside Settings
- Problem: the only UI that lists and restores trashed files is Settings > Trash (TrashSection.svelte is the only Svelte consumer of trash.service). Archive, its sibling, is a rail lens. Moving to trash confirms with a native dialog (delete-note.service.ts:14-19) and offers no Undo or "View Trash" afterwards.
- Proposal: a Trash lens next to Archive in the rail's bottom group (hideable like other items), an "Open Trash" command, and an Undo action on the trash toast.
- Effort: M.

## Polish

### 13. Vocabulary collisions: view, pin, toggle
- Problem: "view" names `.view` files and the Views section, Tasks saved lists ("Save view", TaskLists.svelte:239), the Tasks, Graph and Calendar tabs ("Toggle Tasks View", commands.ts:208-234), kanban board/list/table modes and calendar D/W/M. "Pin" means pin a tab (EditorTabs.svelte:99-102), pin to rail (TypesNavigator.svelte:445-448) and the rail's Pinned section, beside Favorites. "Toggle X View" closes the tab when it is active (tasks.service.ts:571-580, tags.service.ts:149-158), which a "go to" command never does.
- Proposal: "view" only for `.view` files; Tasks "Saved lists"; palette verbs "Open Tasks", "Open Calendar" (Cmd+W closes); keep "pin" for the rail and call tab pinning "Keep tab open" or keep it but drop "Pinned" as a rail section title in favor of the view or type names.
- Effort: S.

### 14. Tags is a full tab that only hands off to Search
- Problem: a tag click in the Tags tab runs `openSearch('tag:...')` (TagsView.svelte:17-19), the tab is reachable only from the palette with no shortcut (commands.ts:286-293), and the tab strip has no Tags icon so it falls back to the file icon (EditorTabs.svelte:69-83).
- Proposal: make Tags a rail navigator like Types and Files whose pick fills the note list with a tag lens, and retire the tab. Owner does not list tags among daily tools, so this is low priority.
- Effort: M.

## Not checked
- Runtime behavior beyond the screenshots: the harness is mocked, so hover, focus order and the real tab count over a working day were not observed.
- Whether Cmd+G is also taken by CodeMirror's find-next inside the editor (the editor keymap was not traced for this key).
- Dark theme for the surfaces above.
