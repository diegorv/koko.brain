# shell-sidebars-ux: ticket breakdown

Combined from the thirteen cluster verdicts in this folder: right sidebar (`verdict-rs-properties-layout.md`, `verdict-rs-properties-editing.md`, `verdict-rs-relationships.md`, `verdict-rs-links-toc.md`), note list and rail (`verdict-nl-header-creation.md`, `verdict-nl-actions-keyboard.md`, `verdict-nl-empty-states.md`, `verdict-nl-rows-sections.md`) and app shell (`verdict-sh-tabs.md`, `verdict-sh-history-breadcrumb.md`, `verdict-sh-view-headers-entry.md`, `verdict-sh-menus-settings.md`, `verdict-sh-empty-zoom-status.md`). Source proposals: `.scratch/design-review/review.md` (the `#### Pxx.` blocks) and the prototypes `right-sidebar.html`, `note-list-rail.html` and `shell-tabs-navigation.html` in `.scratch/design-review/prototypes/`. Line numbers are the verdicts' readings at HEAD `ab143a411`; each ticket's builder re-checks them.

Every open-itens Issue named below was `ready-for-agent` or `needs-info` and `todo` in `.scratch/open-itens/ledger.md` when this was written (210 is `needs-info`; the rest are `ready-for-agent`).

## How the tickets were grouped

The verdicts produced 50 tickets. Five merges bring that to 45:

| Merge | Why one ticket |
|-------|----------------|
| rs-relationships P72 into rs-links-toc T1 (ticket 11) | Same `BacklinksPanel.svelte:57-103` `{#if}` chain and store; the only practical P72 trigger is the 014 stale skip that T1 fixes (`verdict-rs-relationships.md` point 2). |
| rs-properties-layout T1 with sh-menus-settings C (ticket 10) | Both rebuild the `SidebarSection.svelte` header. C would otherwise have to rewrite T1's "the `h2` is sticky" structure and assertion to fit its menu trigger (`verdict-sh-menus-settings.md` point 10). One sticky wrapper holding the `h2` and the trigger is designed once. |
| rs-relationships T2 (P46) with rs-properties-layout T3 (ticket 15) | Both rewrite `RelationshipSearch.svelte` and the Relationships block of `PropertiesView.svelte`; T3's kind step reuses T2's active-row mechanism inside the same popover. |
| rs-links-toc T3 with T4 (ticket 22) | Both replace open-itens 046 on the same Outgoing links data (`resolvedPath`) and panel; T3 was an S that only T4 consumed. |
| nl-header-creation T1 with nl-empty-states T3 (ticket 17) | Same `CollectionView.svelte` filter count (`activeFilterCount`, `filterOpen`) and the same message, "filters are hiding rows". |

Kept apart on purpose: tickets that share a file but not state (most `RailNoteList.svelte`, `EditorTabs.svelte`, `PropertyField.svelte`, `NoteActionBar.svelte` and `commands.ts` work) and quick wins that would otherwise wait on an owner question (04 is not merged into 34, 03 not into 19, 02 not into 16).

## Tickets

| NN | Ticket | Proposals (counted) | Size | Blocked by |
|----|--------|---------------------|------|------------|
| 01 | Palette commands toggle each right sidebar panel and open Trash | P104, P105 | S | none |
| 02 | A refused property rename reverts and says why | P44 | S | none |
| 03 | Inbox rows get a one-click Mark organized | (part of P39) | S | none |
| 04 | Folder-lens rows stop repeating the folder | P117 | S | none |
| 05 | Backlink rows: folder line, plain two-line snippet, path tooltip, calendar action beside the title | P74 | S | none |
| 06 | Calmer status bar: 24px, no pulse, a save slot that does not shift | P176 | S | none |
| 07 | The day navigator stops being called Calendar | P36 | S | none (owner picks the name) |
| 08 | My people reads as a feature: setup button, "Nd ago", overdue icon, row ring | P120 | S | none |
| 09 | The tab strip shows what is off screen, tabs shrink, and the sidebar toggle stops covering them | P34, P98 | M | none |
| 10 | Right sidebar headers stay pinned, are valid headings, have a menu with Hide panel; Properties collapses and is remembered | P43 | L | 01 |
| 11 | Backlinks and Outgoing links stay open across note switches and always show the open note's links | P71, P72 | M | 10 |
| 12 | The rail note list says why it is empty and what to do next | P29 | M | none |
| 13 | The empty editor becomes a launch point and drops the empty right sidebar | P97 | M | none |
| 14 | The Info section uses the shared header and shows short dates | P177, P123 | S | 10 |
| 15 | Relationships: only kinds with links, one Add relationship row, a keyboard picker with recent notes first | P46 | L | none |
| 16 | Untyped notes get a Set type row, and Add property asks for a name and a type | P45 | M | 02 |
| 17 | Filters show their count and can be cleared; the `.view` tab's triggers are named single buttons; an empty table says filters hid its rows | P84 | L | 12 |
| 18 | Note-list header: one Display popover, a state dot, and "+" visible down to 150 px | P33 | L | 17 |
| 19 | One note-actions group (Archive, Mark organized, History, Move to Trash) in the row menu, the More menu and the palette | P39 | M | 03, 04, 12 |
| 20 | Clickable breadcrumb: type and folder crumbs, name without .md | P102 | M | none |
| 21 | Files header gets a "+" menu, and every creator says "New <kind>" | P38 | M | none |
| 22 | Outgoing links: only missing targets are broken, two-line rows, a Broken links group whose rows create the note | P75 | L | 11 |
| 23 | Table of contents: no decorative chevrons, the current heading follows the editor | P115 | M | none |
| 24 | The property icon opens a type menu that converts without loss | (part of P45) | M | 16 |
| 25 | List chips edit in place, and an empty list shows "+ Add" | P122 | M | 02 |
| 26 | Property rows stack key over value in a narrow sidebar | P121 | M | 16, 24, 25 |
| 27 | Shared roving-list util and arrow keys in Search results | (part of P24) | M | none |
| 28 | Rail note list: one Tab stop, arrow keys, focus follows removals and rename | P24 | L | 03, 12, 27 |
| 29 | Tabs can be dragged to reorder and show their full path on hover | (part of P34) | M | 09 |
| 30 | Tab menu: Close others, Close to the right, and the shared note group | (part of P39) | M | 19, 29 |
| 31 | Kanban and `.view` tabs get a title row with their source toggle; source mode is per tab | P18 | M | 17 |
| 32 | The canvas tab gets the title row with its add buttons; the 118 px offset goes away | (part of P18) | M | 31 |
| 33 | Reveal in note list | (part of P102) | M | 20 |
| 34 | Files tree puts configured system folders last and muted, with direct file counts | P119 | M | 04, 21 |
| 35 | Zoom shows a chip and is remembered on this machine | P99 | M | none |
| 36 | Switch vaults from inside a vault: palette commands, Cmd+Shift+O and a File menu | P103 | M | 01 |
| 37 | Go to heading command and picker | (part of P115) | M | none |
| 38 | Palette "Go to X" lands focus in the note list, and "New note here" becomes a command | P37 | M | 21, 28 |
| 39 | Tasks, Graph and Tags get rail entries that open their tab (needs-triage) | (part of P36) | M | 07 |
| 40 | Direct keys for rail items (needs-info) | (part of P37) | M | 39 |
| 41 | Note-list rows open in the active tab and record a per-tab history (owner decision) | P35 | L | none (owner decision 41.1) |
| 42 | Back and Forward: keys, palette, action bar, mouse buttons | (part of P35) | M | 41 |
| 43 | Links follow in the active tab; the open-link modifier opens a new tab | (part of P35) | M | 05, 11, 22, 41 |
| 44 | Markdown tab labels drop the .md extension (optional, open-itens 153) | none | S | 29 |
| 45 | One `pane-band` utility for the ten top-band copies (land last) | (part of P18) | S | 09, 13, 18, 21, 31 |

Sizes: 11 S, 27 M, 7 L.

**Free to start now:** 01, 02, 03, 04, 05, 06, 07 (default name), 08, 09, 12, 13, 15, 20, 21, 23, 27, 35, 37. 41 is free in code but waits for owner decision 41.1.

**Edge rule.** A "Blocked by" line means the later ticket builds on code or state the earlier one adds, or rewrites the same lines. Plain same-file overlap with disjoint lines is listed as "Sequence with" and needs only a rebase. Since the owner runs one relay workflow at a time, those never run in parallel anyway.

## ID coverage

Each of the 35 proposals is counted in exactly one ticket. A proposal split across tickets is counted under the ticket that carries most of it; the others list it as "part of Pxx". No proposal is dropped whole.

| ID | Counted in | Other tickets that build part of it |
|----|------------|-------------------------------------|
| P43 | 10 | 15 (empty Relationships chrome) |
| P177 | 14 | 15 (Relationships kind labels in sentence case) |
| P121 | 26 | |
| P123 | 14 | |
| P44 | 02 | 16 (the add half) |
| P45 | 16 | 24 (icon type menu) |
| P122 | 25 | |
| P72 | 11 | |
| P46 | 15 | |
| P71 | 11 | |
| P74 | 05 | 22 (outgoing half) |
| P75 | 22 | |
| P115 | 23 | 37 (Go to heading) |
| P33 | 18 | |
| P38 | 21 | 18 (folder-lens "+" title) |
| P84 | 17 | 18 (Display dot) |
| P39 | 19 | 03 (Inbox check), 30 (tab menu) |
| P24 | 28 | 27 (util and Search results) |
| P29 | 12 | 17 (collection table) |
| P117 | 04 | |
| P119 | 34 | |
| P120 | 08 | |
| P34 | 09 | 29 (reorder and tooltip) |
| P98 | 09 | |
| P35 | 41 | 42 (Back/Forward), 43 (links) |
| P102 | 20 | 33 (Reveal) |
| P18 | 31 | 32 (canvas), 45 (pane-band) |
| P36 | 07 | 39 (rail entries) |
| P37 | 38 | 40 (direct keys) |
| P103 | 36 | |
| P104 | 01 | 10 (header menu with Hide panel and the all-hidden state) |
| P105 | 01 | |
| P97 | 13 | |
| P99 | 35 | |
| P176 | 06 | |

Outside the 35: ticket 17 also absorbs the `CollectionView.svelte` part of review P87 (buttons nested in buttons on the four `.view` toolbar triggers, `CollectionView.svelte:594-670`), because naming those triggers needs the `child` snippet fix in the same change. P87's other sites stay with the feedback-components group.

### Parts not built

- **P43, opaque hover on the collapsible header:** not needed once the sticky wrapper is the opaque element (10).
- **P123, a separate long-form tooltip field on `NoteInfoRow`:** unrequested; `title={row.value}` already shows the full visible string when it truncates.
- **P122, drag-to-reorder chips:** optional in the review and absent from the prototype; no drag code exists in the feature. The hover-only add and remove buttons on non-empty lists stay (keyboard-reachable through `group-focus-within`); their layout is 26's, removal undo is P01's.
- **P45, a "Remove type" item in the Set type menu:** not requested.
- **P46, rebuilding the picker on bits-ui `Command` and dropping `trapFocus={false}`:** reverses commit `7af4d945a` (flaky picks inside the Popover); `computeAddRelationshipValue` (`properties.logic.ts:779-795`) does not dedupe, so a double pick would write `[[X]]` twice. Also dropped: the picker's key-hint footer, the "Linked X under Belongs to" status line and a file icon on relationship rows (prototype extras).
- **P74, a snippet window around the link:** deferred. The snippet is the leading 280 bytes (`entry.rs:376`) and the index keeps no body; a window needs a Rust read command and a ts-rs DTO. Revisit after 05 ships (owner question 05.1).
- **P71, a count badge on collapsed headers:** dropped by the review (it would restore the eager fetch removed in `77c8cbcda`).
- **P115, chevrons that collapse subtrees:** dropped in favour of removing them (owner question 23.1).
- **A shared link-row component** (rs-links-toc scout): speculative; only the pure label helper is shared (22).
- **P33, the overflow ("More") menu:** saves one 22 px slot on Today and the day lens only; a CSS narrow rule in 18 keeps "+" visible instead (owner question 18.1).
- **P38, a "+" menu in the note-list header, a palette "New table" command and palette creators that follow the lens:** the prototype keeps the note-list "+" a single action; the owner's finders-ux 02 precedent is "vault root, no other rule"; 38 adds the lens-following "New note here" (owner question 21.1).
- **P84 (and P29 prototype), the "showing N of M" strip and "N notes are hidden by filters":** both need an unfiltered second query of a view whose filters define it; the count reaches the user through 17's Filter badge.
- **P39, "Move to..." with a folder picker:** no picker exists; the prototype only toasts a stub. Its own ticket only on owner request, after 19 and 30.
- **P24, Cmd+Enter in lists:** it would do what Enter does; 41 holds the replace-vs-new-tab decision. Also not built: the key-hint bar and `listbox`/`option` roles (rows are buttons with menus), and the second step (Files and Types trees, collection rows), a later wave reusing `utils/roving-list.ts`.
- **P29, right-sidebar panels explaining non-note tabs:** replaced by hiding the sidebar for non-markdown text files, an owner-gated criterion in 13 (`hidesRightSidebar` is the function 13 rewrites). Also not built: "Remove from sidebar" on a missing view (the pin lives in the deleted file), kanban empty lanes (kanban-board group: P02, P05, P143), and a styling sweep of the other ~30 empty strings (open-itens 205 or the feedback-components group).
- **P117, relative modified time on canvas, kanban, view, PDF and image rows:** `fsStore.fileTree` `modifiedAt` is never updated on content saves (`fs.watcher.ts:119-124,185-196`), so an edited board would show a stale time; fixing it needs a tree write per autosave in the watcher hot path (owner question 04.1).
- **P119, the underscore-prefix rule and a "Show note counts" toggle:** `_notes` and `Work/_people` are user folders in a default vault; the configured `templates.systemFolder` / `templates.folder` predicate replaces the rule, and counts are in or out by owner answer, not a setting.
- **P120, hiding the section when nobody is tracked:** not the default; it needs a visibility field on `RailTodaySection` and edits to the shared `RailNoteList.svelte` (owner question 08.1). The premise "rows have no focus style" is false (`app.css:495`, pinned by `focus-ring.spec.ts:38-58`); 08 keeps only a consistency change.
- **P34, the prototype's absolute close-button overlay, a toggle tooltip with Cmd+B, and keying the tab `{#each}` by path:** the overlay is not in P34's text; appending Cmd+B to the toggle `title` breaks three title selectors; a keyed each throws `each_key_duplicate` in production on a reachable duplicate path (`path-change.service.ts:179`).
- **P35, "make Open in new tab really open a second tab":** a tab is its path, so it needs duplicate-path tabs. Also not built: Back/Forward on canvas, kanban and collection tabs (moot under the markdown-only Replace rule).
- **P18, Favorite, Organized and Pin on kanban, canvas and `.view` tabs** (they write frontmatter) and **replacing xyflow `Controls` with header zoom buttons** (owner question 32.1, default keep).
- **P36, the palette half (Calendar category, gated Undo/Redo):** already in HEAD via finders-ux 06 (resolved). The prototype's "Toggle Calendar View under Calendar" would reverse 06.
- **P37, merging Cmd+1, Cmd+2 and Cmd+Shift+B, and an F6 focus cycle:** a breaking shortcut change for no new capability; F6 has no precedent and overlaps 28.
- **P103, a native File > Open Recent submenu, a confirm before closing the current vault, and View, Go and Note menus:** Open Recent needs a new IPC command and DTO for at most two other vaults the palette already lists (owner question 36.2); the real `switchVault` saves every dirty tab and asks only on a failed save; the extra menus are polish per the review.
- **P104, Configure links on Backlinks, Outgoing links and TOC:** their only setting is the Layout switch that Hide panel already writes.
- **P105, a rail lens for Trash, a native Trash menu item and Undo after Move to Trash:** out of scope per the review (Undo stays with P01).
- **P97, a recent-notes card; P99, zoom palette commands; P176, clickable status bar items:** excluded by the review's validation.

## Dependency graph

```
01 palette panel toggles -> 10 headers + menu -> 11 links stay open -> 22 outgoing links
                         |                  -> 14 Info
                         -> 36 switch vaults
02 rename refusal -> 16 Set type -> 24 type menu -> 26 narrow rows
                  -> 25 list chips ---------------> 26
03 Inbox check -> 19 note actions -> 30 tab menu <- 29 tab drag <- 09 tab strip
               -> 28 list keyboard <- 27 roving util
04 folder subtitle -> 19
                   -> 34 system folders <- 21 Files "+" menu
05 backlink rows ----------------------------> 43 links in active tab
11 -----------------------------------------> 43
22 -----------------------------------------> 43 <- 41 Replace + history -> 42 Back/Forward
12 empty states -> 17 filters + table -> 18 Display
             |                       -> 31 view header -> 32 canvas header
             -> 19
             -> 28 -> 38 palette focus <- 21
07 Days -> 39 rail tab entries -> 40 direct keys
20 breadcrumb -> 33 Reveal
29 -> 44 .md labels (optional)
09, 13, 18, 21, 31 -> 45 pane-band (last)
06, 08, 13, 15, 23, 35, 37: no outgoing hard edge (13 and 15 are only rebases for 10 and 45)
```

Edges and the file or state that forces each:

| Edge | Forced by |
|------|-----------|
| 01 -> 10 | `setRightPanelVisible(panel, visible)` in `layout.service.ts`, which the header menu's Hide panel calls |
| 01 -> 36 | `commands.ts` list, the 43-command pin at `commands.test.ts:151`, the `06-search-and-navigation.md` category table |
| 10 -> 11 | `LayoutSettings` key list and defaults (`settings.types.ts:85-110`, `settings.store.svelte.ts:55-80`): 11 reuses 10's persisted open-state mechanism (owner question 11.1; with an in-memory answer the edge goes) |
| 10 -> 14 | `SidebarSection.svelte` header structure; `AppShell.test.ts:269-285` sections test; Info must stay menu-less |
| 11 -> 22 | per-list path record in `outgoing-links.store.svelte.ts` and the skip in `outgoing-links.service.ts`; `OutgoingLinksPanel.svelte` body |
| 02 -> 16 | `propertyKeyRefusal` in `core/frontmatter/properties.logic.ts` (16 shows its message under the add form) |
| 16 -> 24 | `defaultPropertyValue(type, today)` in `properties.logic.ts`; `PropertyField.svelte` `Props` (`:15-21`, changed by 02) |
| 02 -> 25 | `PropertyField.svelte` script and `PropertyField.test.ts` helpers (`onRename` return type changes in 02) |
| 16, 24, 25 -> 26 | 26 lays out the final row: type row `PropertiesView.svelte:165-206` (16), icon button in the main row `PropertyField.svelte:108-165` (24), chip block `:167-201` (25); its required E2E then covers the final elements once |
| 03 -> 19 | by-path writer shape in `lifecycle.service.ts` (`setOrganizedForPath`, then `setArchivedForPath`) |
| 04 -> 19 | `toLensNote` / `fileToLensNote` in `lens.logic.ts:258-290, 960-976` (19 adds `organized` and `archived` on the lines 04 edits) |
| 12 -> 19 | the Archive and Inbox hint strings in 12's `list-empty.logic.ts` table, which 19 updates when the row menu gains those actions |
| 19 -> 30 | `note-actions.logic.ts` list rendered in the tab menu |
| 09 -> 29 -> 30 | `EditorTabs.svelte` per-tab markup and `ContextMenu.Root` block (`:49-113`), `EditorTabs.test.ts:114-158` |
| 27 -> 28 | `src/lib/utils/roving-list.ts` |
| 03 -> 28 | the Inbox check button's `tabindex` on the tab-stop row (`NoteRow.svelte`) |
| 12 -> 28 | the `RailNoteList.svelte` list-body `{#if}` chain `:815-879` and both `VList`s |
| 12 -> 17 | `src/lib/components/EmptyState.svelte` (the empty collection table uses it) |
| 17 -> 18 | `RailNoteList.svelte` header `:698-801` and the Filter trigger 17 rewrites and 18 leaves pinned |
| 17 -> 31 | the four `.view` toolbar triggers `CollectionView.svelte:593-670`: 17 names them and fixes the nesting, 31 moves them into `ViewHeader` as they are |
| 31 -> 32 | `ViewHeader.svelte`, `EditorTab.sourceMode` and `toggleSourceMode` routing |
| 20 -> 33 | `features/rail-shell/lens-open.service.ts` and `withExpandedAncestors` in `lens.logic.ts` |
| 04, 21 -> 34 | `lens.logic.ts` (04); `FilesNavigator.svelte` and `FilesNavigator.test.ts` / `.menu.test.ts` (21) |
| 21 -> 38 | palette creator labels ("New File" becomes "New note" in 21); 38's "New note here" must follow the same label rule |
| 28 -> 38 | the list's current row and focus target in `RailNoteList.svelte` (both `VList`s) |
| 07 -> 39 | rail registration, `help` rail lists and the ADR-0033 Decision wording |
| 39 -> 40 | the visible rail item list the digits index |
| 41 -> 42, 43 | `core/editor/tab-history.service.ts` (`navigateInActiveTab`, history on `EditorTab`) |
| 05, 11, 22 -> 43 | the row `onclick`s 43 changes: `LinkItem.svelte:10` (05), `BacklinksPanel.svelte:93` (11), `OutgoingLinksPanel.svelte` rows (22) |
| 29 -> 44 | the tab label span in `EditorTabs.svelte` |
| 09, 13, 18, 21, 31 -> 45 | the band class lines 45 rewrites: `EditorTabs.svelte:46` wrapper (09), `EditorView.svelte:154` and `AppShell.svelte:256,276` (13), `RailNoteList.svelte:699` (18), `FilesNavigator.svelte:305` (21), `EditorView.svelte` (31) |

Sequence-with (same file, disjoint lines, rebase only):

- `RailNoteList.svelte`: 03, 12, 17, 18, 28, 33, 38.
- `PropertiesView.svelte`: 10 (`:156`), 15 (`:53-57`, `:243-290`, one line at `:252`), 16 (`:137-152`, `:164-241`), 26 (`:155`, `:165-206`).
- `AppShell.svelte`: 09 (`:190-196`), 10 (`:277` and the sidebar block), 13 (`:188` comment), 15 (`:279`), 45.
- `NoteActionBar.svelte`: 19 (More menu), 20 (breadcrumb `:128-132`), 33 (More item above Copy deeplink), 42 (Back/Forward at the start of the bar).
- `NoteRow.svelte`: 03, 28, 33 (flash prop), 41 (click).
- `commands.ts` and the count pin `commands.test.ts:151` (43 today): 01, 19, 33, 36, 37, 38, 39, 42. Each ticket that adds a fixed command changes the number on purpose and says so.
- `global-keybindings.ts` and its "registers all 25" pin (`global-keybindings.test.ts:142`): 13 (adds a `command` id, count unchanged), 36 (26), 40, 42.
- `editor.store.svelte.ts` / `editor.types.ts` / `editor.logic.ts`: 29 (`moveTab` carries the tab object whole, so 41's per-tab history moves with it), 31 (`sourceMode`), 41 (`history`; a reused tab object must clear `sourceMode`, which only non-markdown tabs set).
- `help/documentation/07-sidebar-panels.md`: 01, 02, 10, 11, 13, 14, 15, 16, 22, 24, 25. `03-editor.md`: 09, 13, 19, 20, 29, 30, 31, 33, 35, 41, 42, 43.

## Tickets

### 01: Palette commands toggle each right sidebar panel and open Trash

- **Slug:** `palette-toggles-right-panels-open-trash`
- **IDs:** P104 (palette half), P105. 10 builds P104's header half.
- **Size:** S. **Blocked by:** none.
- **Suggested status:** ready-for-agent.
- **What to build:**
  - The palette gets "Toggle Properties Panel", "Toggle Backlinks Panel" and "Toggle Outgoing Links Panel" (category Layout). "Toggle Table of Contents" keeps its id and label (`commands.ts:330-337`) and moves onto the same helper.
  - Turning a panel on also shows a hidden right sidebar, except where the sidebar never shows (canvas, kanban, `.view` and virtual tabs, the `hidesRightSidebar` rule), as `showTableOfContents` already does (`toc.service.ts:22-25`). Turning a panel off leaves the sidebar alone. Properties also hides Info (`AppShell.svelte:278,290`).
  - "Open Trash" (category Settings) opens the Settings sheet on Trash, never toggles it closed, and is listed only while a vault is open (with no vault the sheet would say "Trash is empty", `TrashSection.svelte:17-21`).
  - Implementation: `setRightPanelVisible(panel, visible)` and `toggleRightPanel(panel)` in `core/layout/layout.service.ts` beside `toggleRightSidebar`, over the four existing layout flags. No new persisted state. `settingsPanelStore.open('trash')`.
  - Help: palette rows in `06-search-and-navigation.md:69-78` and `20-keyboard-shortcuts.md:101-125`, "or from the palette" in `07-sidebar-panels.md:13,162`, a second way in `18-trash.md:13-15`.
- **Acceptance:**
  - [ ] Failing test first, `layout.service.test.ts` (real `settingsStore`, `editorStore`): `toggleRightPanel('backlinks')` flips `backlinksVisible` and no other flag; from `rightSidebarVisible: false` on a note tab, turning Backlinks on sets `rightSidebarVisible` true; with a `.kanban` tab active it stays false; turning a panel off leaves `rightSidebarVisible` as it was.
  - [ ] Failing test first, `commands.test.ts`: the three new ids exist with label and category Layout; running one twice returns its flag to the start and changes no other panel flag. The existing TOC test (`:527-540`) passes unchanged.
  - [ ] Failing test first, `commands.test.ts` (real `settingsPanelStore`): with a vault open, Open Trash sets `isOpen` and `activeSection === 'trash'`; a second run keeps both; with Settings open on `'editor'` it moves to `'trash'`; with no vault open the command does not exist.
  - [ ] The count pin at `commands.test.ts:151` changes on purpose.
  - [ ] E2E `settings.spec.ts`: the palette command "Open Trash" shows the Trash section heading.
  - [ ] Help pages above updated.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for `settings.spec.ts`.
- **Owner questions:**
  - 01.1 Turning a panel on shows a hidden sidebar (except canvas, kanban and view tabs)? Recommended: yes, matching `showTableOfContents`.
  - 01.2 Open Trash with no vault open: hidden? Recommended: yes.

### 02: A refused property rename reverts and says why

- **Slug:** `property-rename-refusal-reverts-says-why`
- **IDs:** P44 (rename half). 16 builds the add half on the same helper.
- **Size:** S. **Blocked by:** none.
- **Suggested status:** ready-for-agent.
- **What to build:**
  - Renaming a property to a name that already exists (including a hidden one such as `_type` or `_archived`) puts the saved name back in the field and shows one line under the row naming the existing key. A blank or whitespace-only name puts the saved name back silently.
  - Enter commits the rename (blur), Escape restores the saved name and clears the message, typing clears the message.
  - Code: pure `propertyKeyRefusal(properties, key, exceptKey?)` in `core/frontmatter/properties.logic.ts` returning `null`, `{ reason: 'blank' }` or `{ reason: 'duplicate', existingKey }` (trimmed, canonical and exact compare as `renameProperty` does today). `renameProperty` and `addNewProperty` (`properties.service.ts:159-194`) call it and keep their boolean returns. `PropertyField`'s `onRename` returns the message or null (`Props` `:15-21`); the field always resets `input.value` to `property.key` after the call (`handleKeyBlur` `:52-58`). The message is `role="alert"`; the input has `aria-invalid` and `aria-describedby` (id from `$props.id()`, never from the key) only while it shows, and `aria-label="Property name"`.
  - Help `07-sidebar-panels.md:53-54` mentions Enter and Escape on the name.
- **Acceptance:**
  - [ ] Failing test first, `properties.logic.test.ts`: `propertyKeyRefusal` covers blank, padded blank, exact duplicate, an alias twin (`type` while `_type` exists gives `existingKey: '_type'`), `exceptKey` ignored, and `Status` vs `status` not a duplicate.
  - [ ] `PropertyField.test.ts` (mounted, `onRename` returns a message): a blur on a duplicate restores `property.key` and shows one alert naming the key; the input has `aria-invalid="true"` and an `aria-describedby` pointing at it. Blank and `"  status "` restore with no alert and no `onRename` call. Escape restores and clears with no call. Enter on a focused input makes exactly one call. Typing clears the alert. The three helpers at `:17`, `:69`, `:132` are updated for the new return type.
  - [ ] `PropertiesView.test.ts` (real stores): renaming `status` to an existing `priority` leaves `propertiesStore.properties` unchanged and shows the alert; a free key still renames; on lossy frontmatter (comments) the key is restored, no inline alert shows and the mocked `svelte-sonner` toast is called.
  - [ ] `properties.service.test.ts` rename and add cases (`:207-260`, `:296-380`) and `properties-cross-note.test.ts:134-155` pass unchanged.
- **Gate:** `pnpm check` + `pnpm vitest run`.
- **Owner questions:**
  - 02.1 Duplicate rule: exact (today; `Status` and `status` are two keys) or case-insensitive (prototype)? Recommended: exact.

### 03: Inbox rows get a one-click Mark organized

- **Slug:** `inbox-rows-one-click-mark-organized`
- **IDs:** part of P39 (counted in 19).
- **Size:** S. **Blocked by:** none.
- **Suggested status:** ready-for-agent.
- **What to build:**
  - In the Inbox lens, each markdown row shows a check button at the top right (on hover, focus-within or the active row). Clicking it marks that note organized without opening it, even when another note is the active tab; the row leaves the Inbox and the count drops. No success toast, no shortcut in its tooltip (Cmd+E acts on the active tab, `global-keybindings.ts:197-202`).
  - Code: `setOrganizedForPath(path, organized)` in `features/properties/lifecycle.service.ts`, the shape of `toggleFavoriteForPath` (prompt refresh, `updateNoteFrontmatter(path, ...)`, frontmatter toast). `NoteRow.svelte` gets an optional `onOrganize`; the check is a sibling of `[data-note-row]` in a `relative` wrapper, `tabindex="-1"` (28 later gives the tab-stop row's check `tabindex="0"`). `RailNoteList.svelte`'s `noteRow` snippet passes it only for the Inbox lens and markdown rows.
  - Help: one line in `02-file-explorer.md` or the Inbox paragraph of `25-types-and-relationships.md`.
- **Acceptance:**
  - [ ] Failing test first, new `lifecycle.service.organized-path.test.ts` (modelled on `lifecycle.service.favorite-path.test.ts`; Tauri fs and `invoke` mocked, real writer and stores): a closed note with `_organized: false` gets `_organized: true` with `_archived` and the body unchanged; an open tab with unsaved body edits keeps them; a second call writes nothing; `vaultStore.takePromptIndexRefresh()` is true; lossy frontmatter toasts and writes nothing.
  - [ ] Failing test first, new `NoteRow.test.ts`: with `onOrganize` the check exists, is not inside `[data-note-row]`, has `tabindex="-1"`, an accessible name and a `title` with no shortcut; clicking it calls `onOrganize` and does not open the note; without `onOrganize` no check renders.
  - [ ] Failing test first, new `RailNoteList.inbox-check.test.ts` (no `lifecycle.service` mock; virtua shim from `RailNoteList.test.ts:9-30`): Inbox rows have the check; Favorites, Archive, type and folder lens rows do not; clicking it on Alpha writes `_organized: true` to Alpha's file while another note is active; after the updated entry is fed through `typeDefinitionsStore.setEntries`, Alpha's row is gone and the count drops.
  - [ ] Right-click on the check opens no menu (`NoteRowMenu.svelte:209` blank-area rule).
  - [ ] E2E: in Inbox, clicking the first row's check removes the row and the file has `_organized: true`; `rail-shell.spec.ts` and `rail-list-toolbar.spec.ts` stay green.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for the touched spec.
- **Owner questions:**
  - 03.1 Inbox lens only, or every unorganized (italic) row in any lens? Recommended: Inbox only, no toast, no shortcut in the tooltip.

### 04: Folder-lens rows stop repeating the folder

- **Slug:** `folder-lens-rows-drop-repeated-folder`
- **IDs:** P117 (first half; the second half is not built, see Parts not built).
- **Size:** S. **Blocked by:** none.
- **Suggested status:** ready-for-agent.
- **What to build:**
  - In a folder lens, a markdown row's second line shows only its modified time (`2h ago`), not `2h ago · Work`: a folder lens lists direct children only (`lens.logic.ts:1004-1006`), so the folder always equals the lens. Canvas, kanban, view, PDF, image, other files and unindexed markdown keep their kind word (`FILE_KIND_LABELS`, `:925-933`). Every other lens keeps `<time> · <folder>`.
  - Code: an explicit option on `toLensNote` / `noteSubtitle` (for example `{ withFolder: false }`), used by `fileToLensNote` (`:960-976`); not a `null` vault path. Update the doc comments on `noteSubtitle` (`:252-257`), `FILE_KIND_LABELS` (`:924`) and `LensNote.subtitle` (`rail-shell.types.ts:40`). `NoteRow.svelte` and `RailNoteList.svelte` are untouched.
- **Acceptance:**
  - [ ] Failing test first, `lens.logic.test.ts` `describe('resolveFolderLens through resolveLens')` under `pinClock()`: the `Plan` row of `folder(WORK)` reads `'2h ago'` (today `'2h ago · Work'` at `:1978`), the tree-order test reads `'4d ago'`, `'10m ago'` (`:2004-2007`); a nested folder (`Work/projects`) also drops it. These are expected updates, not weakened tests.
  - [ ] Kind labels unchanged: `:1979` `'Canvas'` and the Kanban, View, PDF, Image, File cases; an unindexed `.md` node still reads `'Note'`.
  - [ ] Other lenses unchanged: `noteSubtitle` tests (`:742-771`), Today, Favorites and type cases (`:235`, `:275`, `:417`, `:429`), neighbourhood `:1062`.
  - [ ] `RailNoteList.test.ts:1035`: `ALPHA`'s entry gets a `modifiedAt` under a pinned clock and the row reads the time only; `Board` still reads `'Canvas'` (`:1036`); a folder-lens markdown row with `modifiedAt: 0` renders no `[data-note-row-subtitle]`.
- **Gate:** `pnpm check` + `pnpm vitest run`.
- **Owner questions:**
  - 04.1 Non-markdown rows keep the kind word (`Canvas`, `Kanban`, `PDF`)? Recommended: yes. A modified time would be the last scan's, so a board edited today can read "3d ago".

### 05: Backlink rows: folder line, plain two-line snippet, path tooltip, calendar action beside the title

- **Slug:** `backlink-rows-folder-plain-snippet-tooltip`
- **IDs:** P74 (backlinks half). 22 builds the outgoing half. Replaces the `LinkItem` half of open-itens 209.
- **Size:** S. **Blocked by:** none.
- **Suggested status:** ready-for-agent.
- **What to build:**
  - A backlink row shows the source note's name on line one and its folder on a muted line two (none at the vault root), the vault-relative path on hover, and a snippet in plain text clamped to two lines instead of one truncated line of raw markdown.
  - The "Show in calendar" action on event notes sits in the title line's flex row, so it takes space only when it renders (no 28 px gutter on every row).
  - Code, `LinkItem.svelte`: line 2 from `entryFolder(vaultStore.path, sourcePath)` (`file-entries.logic.ts:38`); `title` with the vault-relative path. New pure `backlinkSnippetText(snippet)` in `backlinks.logic.ts`: reuses finders-ux 03's `markdownToPlainText`, then removes `#{1,6} ` and `[-*+] [.] ` markers that follow a join space (Rust joins every line with one space, `entry.rs:383-386`, so only the first marker is at a line start). `line-clamp-2` replaces `truncate`. The positioned-highlight branch (`:26-27`, unreachable in production because `backlinks.logic.ts:21` sets `linkStart = linkEnd = 0`) is unchanged. `ShowInCalendarButton` moves from `absolute right-1 top-0.5` (`:34`) into the flex row.
- **Acceptance:**
  - [ ] Failing test first, `backlinks.logic.test.ts` (pure): `backlinkSnippetText('# Roadmap Intro ## Goals - [ ] Ship [[Projects/Welcome|Start]] and **bold**')` is `Roadmap Intro Goals Ship Start and bold`; `'a - b'` keeps its hyphen; `''` gives `''`.
  - [ ] `LinkItem.test.ts` (real stores, `editor.service` and Tauri mocked): a `Projects/Roadmap.md` source shows `Roadmap` then `Projects`; a root note has no second line; the button `title` is `Projects/Roadmap.md`; the snippet `<p>` has `line-clamp-2` and not `truncate`.
  - [ ] `LinkItem.test.ts:74` (positioned highlight) stays green unchanged.
  - [ ] With the event fixture of `:99`, the calendar action is not `absolute`, sits after the name in the title row and still opens the day; a non-event source renders no extra element there (`:94` green).
  - [ ] E2E `sidebars.spec.ts:35-49` stays green unchanged.
- **Gate:** `pnpm check` + `pnpm vitest run`.
- **Owner questions:**
  - 05.1 A snippet window around the link (needs a Rust read command and a DTO): decide after using this ticket? Recommended: yes, decide later.

### 06: Calmer status bar: 24px, no pulse, a save slot that does not shift

- **Slug:** `status-bar-24px-no-pulse-stable-save-slot`
- **IDs:** P176.
- **Size:** S. **Blocked by:** none.
- **Suggested status:** ready-for-agent.
- **What to build:**
  - The status bar is 24 px tall (`--status-bar-height: 1.5rem`, `app.css:211-212`; `SettingsPanel.svelte:116` follows the token). The Modified icon no longer pulses (`SaveStatus.svelte:16` `animate-pulse` goes; filled `Circle` vs `CircleCheck` stays). Saved and Modified take the same width, so nothing to their left or right moves when the state flips.
  - Recommended: both labels stacked in one `inline-grid` cell inside the existing `inline-flex` span, the inactive one `invisible` and `aria-hidden`, so the bar's divider pseudo-element (`StatusBar.svelte:24-33`) stays outside the grid. `data-save-status` on the span for the E2E. No tab or a virtual tab still renders nothing.
  - Note in `help/documentation/mods/08-custom-ui.md:372` that a mod chip taller than 24 px overflows.
- **Acceptance:**
  - [ ] Failing test first, new `SaveStatus.test.ts` (real `editorStore`): a dirty tab renders "Modified" and no `.animate-pulse`; only the active label is exposed to assistive technology; a saved tab renders "Saved"; no tab and a virtual tab render nothing.
  - [ ] Failing E2E first: with a note open, `[data-status-bar]` is 24 (plus or minus 0.5) px tall; `[data-save-status]` keeps the same `x` and `width` while Saved, after typing (Modified) and after the autosave (`expect.poll` over the 2 s debounce). If the E2E vault can show Todoist sync's status item before it, run once with it; otherwise say so in the PR.
  - [ ] `settings.spec.ts:23` goes from 32 to 24 (a requested value change) and the Settings panel still ends at the bar's top edge.
  - [ ] `help/documentation/03-editor.md:141-151` stays true.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for `settings.spec.ts` and the new case.
- **Owner questions:**
  - 06.1 Reserve the save slot when nothing shows (no tab, virtual tab)? Recommended: no.

### 07: The day navigator stops being called Calendar

- **Slug:** `day-navigator-renamed-days`
- **IDs:** P36 (naming half). 39 builds the entry-point half. The palette half is already in HEAD (finders-ux 06).
- **Size:** S. **Blocked by:** none (the owner picks the name; the default unblocks it).
- **Suggested status:** ready-for-agent with the default name.
- **What to build:**
  - The rail item and the navigator header that list a picked day's notes read "Days" (default), so "Calendar" names only the Calendar tab. Keys stay (`calendar`, `data-rail-item="calendar"`, `rail:go-to:calendar`, `RAIL_ITEM_COLORS`), so saved layouts and usage ids are untouched. The in-panel "Periodic notes" section label and "Open Calendar tab" stay.
  - Code: `calendar-rail.service.ts:28`, `CalendarNavigator.svelte:92`. Rewrite the `commands.ts:253-254` comment (it names "Go to Calendar").
  - Help: `08-periodic-notes-and-calendar.md:18-20,40`, `27-calendar.md:15,217-225,236`, `01-getting-started.md` (rail list), `06-search-and-navigation.md:63`, `19-settings.md` (Layout rows), `20-keyboard-shortcuts.md:121` (Go to list only; the "Calendar" heading stays, `event-calendar-keys.logic.test.ts:236` reads it), `26-theming.md:129`; ADR-0033 Decision wording (`:34,37`).
- **Acceptance:**
  - [ ] Failing test first, `calendar-rail.service.test.ts:45`: the registered navigator is `['calendar', 'Days']`.
  - [ ] `commands.test.ts` over the real registration: "Go to Days" and "Toggle Calendar View" exist, "Go to Calendar" does not; finders-ux 06's gating and categories are unchanged.
  - [ ] The `commands.ts:253-254` comment no longer names "Go to Calendar".
  - [ ] E2E `rail-shell.spec.ts:949-1011` and `calendar-plugin.spec.ts` pass.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for the two specs.
- **Owner questions:**
  - 07.1 Name: "Days", "Journal" or keep "Calendar"? Recommended: "Days". "Periodic notes" collides with the panel's own section; "Journal" suggests journal notes only.

### 08: My people reads as a feature: setup button, "Nd ago", overdue icon, row ring

- **Slug:** `my-people-setup-button-ago-labels-overdue-icon`
- **IDs:** P120.
- **Size:** S. **Blocked by:** none.
- **Suggested status:** ready-for-agent.
- **What to build:**
  - With nobody tracked, My people shows one muted "Set up 1:1 tracking" button that opens Settings on the one-on-one page (`settingsPanelStore.open('one-on-one')`, precedent `SearchPanel.svelte:190`), instead of naming the property and the folder in the rail (`MyPeopleSection.svelte:35-38`). `data-my-people-empty` stays.
  - The Settings page gains one sentence at the top: a person in the work people folder is listed in My people when their note sets `_one_on_one_every` (`OneOnOneSection.svelte`).
  - Labels: `today` for 0 days, `Nd ago` otherwise, `never` for none (`myPeopleDaysLabel`, `one-on-one.logic.ts:239-241`).
  - Overdue rows (including `never`) get a `TriangleAlert` icon in `text-warning`, `aria-hidden`, plus visually hidden "Overdue" text. `data-overdue` unchanged.
  - Focus: the row wrapper shows the inset ring used by other rail rows (`has-[button:focus-visible]:ring-2 ... ring-inset`, `FilesNavigator.svelte:437`) and the open button gets `focus-visible:outline-none`, so one indicator shows.
  - Help `09-quick-notes-and-templates.md:112,121`.
- **Acceptance:**
  - [ ] Failing test first, `MyPeopleSection.test.ts` (real stores): with nobody tracked the text contains neither `_one_on_one_every` nor `Work/_people` (asserted today at `:195-196`) and a "Set up 1:1 tracking" button is inside `[data-my-people-empty]`; clicking it leaves the real `settingsPanelStore` with `isOpen` and `activeSection === 'one-on-one'`.
  - [ ] Failing test first, `OneOnOneSection.test.ts`: the page names `_one_on_one_every` and the configured work people folder.
  - [ ] Failing test first, `one-on-one.logic.test.ts:517-523`: `0` is `today`, `1` is `1d ago`, `15` is `15d ago`, `null` is `never`; section assertions `:109`, `:118`, `:155`, `:173`, `:188` follow.
  - [ ] Overdue and `never` rows render the icon and "Overdue"; on-time rows neither; the theme-token test (`:129-135`) stays green.
  - [ ] Class assertions for the row ring and `focus-visible:outline-none` (jsdom has no `:focus-visible`; `focus-ring.spec.ts:74-92` pins the pattern in a browser).
  - [ ] `RailNoteList.test.ts:464-475` and the registration test (`:202`) stay green.
- **Gate:** `pnpm check` + `pnpm vitest run`.
- **Owner questions:**
  - 08.1 Nobody tracked: the setup button (prototype) or hide My people? Recommended: the button. Hide touches the shared Today list and the rail registry.
  - 08.2 A 1:1 held today reads `today`, not `0d ago`? Recommended: yes.

### 09: The tab strip shows what is off screen, tabs shrink, and the sidebar toggle stops covering them

- **Slug:** `tab-strip-overflow-cues-shrinking-tabs-toggle`
- **IDs:** P34 (overflow half), P98. 29 builds P34's reorder and tooltip half. Replaces open-itens 153 criteria 2 and 3.
- **Size:** M. **Blocked by:** none.
- **Suggested status:** ready-for-agent.
- **What to build:**
  - Tabs shrink from 220 px down to 100 px before the strip scrolls (pinned tabs keep their size). The title no longer stops at 160 px (`EditorTabs.svelte:88` `max-w-40` goes).
  - When tabs are off screen, a 34 px fade shows at that edge, and a "List all tabs" button shows a count of hidden tabs. The button opens a menu with one row per tab in strip order (dirty dot for dirty file tabs, kind icon, name, pin mark, active row marked); choosing a row switches to it. The button is always visible; the badge only when tabs are hidden.
  - A vertical mouse wheel over an overflowing strip scrolls it sideways. The existing reveal of the active tab clears the fade (`scroll-padding-inline`).
  - With the right sidebar hidden on a note, the strip leaves 40 px at its right end, so the sidebar toggle never sits over a tab or the list button at any scroll position.
  - The toggle gets `aria-label="Right sidebar"`, `aria-pressed`, a pressed fill and a focus-visible ring (`AppShell.svelte:190-196`). Its `title` stays exactly "Hide right sidebar" / "Show right sidebar" (selected by `sidebars.spec.ts:70`, `note-action-bar.spec.ts:18,20`, `AppShell.test.ts:383`).
  - Code: a non-scrolling wrapper (`h-10 bg-tab-bar`, the divider, `relative`, `data-tauri-drag-region`) holds the scroller and the list button; the scroller keeps `editor-tabs-bar`, `role="tablist"`, `overflow-x-auto` and `data-tauri-drag-region`. Width classes go on `ContextMenu.Trigger` (bits-ui renders its own wrapper `div`, which is the strip's flex item), the inner tab becomes `w-full min-w-0`. Pure `edgeFades(scrollLeft, clientWidth, scrollWidth)` and `countHiddenTabs(scrollerRect, tabRects)` in new `editor-tabs.logic.ts`; recompute on `scroll`, on a `ResizeObserver` and in an effect on `editorStore.tabs.length`. `onwheel` on the scroller (Svelte's `wheel` is not passive). The reserve is a `$derived` over `hidesRightSidebar(activeTabPath)` and `rightSidebarVisible`, on the wrapper, not the scroller. No `layout.logic.ts` change (13 owns that file). Focus ring classes as `EditorView.svelte:98`.
  - Help `03-editor.md` Tabs: the list button and the wheel.
- **Acceptance:**
  - [ ] Failing test first, `editor-tabs.logic.test.ts`: `edgeFades` gives no fade when `scrollWidth <= clientWidth`, left only when `scrollLeft > 2`, right only while `scrollLeft + clientWidth < scrollWidth - 2`; `countHiddenTabs` counts a tab more than 4 px past either edge, not one within 4 px, and 0 for an empty list.
  - [ ] `EditorTabs.test.ts` (real stores, `ResizeObserver` stub as `EventCalendarView.test.ts:8-13`, stubbed geometry): an overflowing scroller in the middle shows both fades and the badge; nothing overflowing shows neither; opening one more tab without a resize updates the badge.
  - [ ] Every direct child of `.editor-tabs-bar` for an unpinned tab has `flex-[0_1_220px]` and `min-w-[100px]`, a pinned one `shrink-0`, and nothing in the strip has `max-w-40` (asserted on the scroller's children, not `[role="tab"]`).
  - [ ] The list menu has one row per tab in order, dirty dots only on dirty file tabs, pin marks, the active row marked; choosing the third row makes `editorStore.activeIndex` 2. `menu-item-anatomy.test.ts` green.
  - [ ] A vertical `WheelEvent` on an overflowing scroller raises `scrollLeft` and is `defaultPrevented`; on a non-overflowing one, or with `|deltaX| > |deltaY|`, it is not.
  - [ ] With a note active and `rightSidebarVisible` false the wrapper has `pr-10`; with it true, or a kanban, canvas, `.view`, tags, tasks, graph or calendar tab active, it does not. Both the wrapper and `.editor-tabs-bar` carry `data-tauri-drag-region`.
  - [ ] `AppShell.test.ts`: the toggle has `aria-label="Right sidebar"`, `aria-pressed` follows `rightSidebarVisible` both ways, and has the ring classes; "renders one right-sidebar toggle" passes unchanged.
  - [ ] E2E `tabs.spec.ts`: the existing overflow and reveal test passes unchanged; a new case shows unpinned tabs between 100 and 220 px wide when overflowing, and shrinking below natural width before the strip scrolls.
  - [ ] E2E `sidebars.spec.ts`: with the sidebar hidden and the strip overflowing, the right edges of `.editor-tabs-bar` and the list button are at or left of the toggle's left edge at both scroll ends.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for `tabs`, `sidebars`, `note-action-bar`, `tasks-view`, `collection-block` and `live-preview/click-reveal` (they select `.editor-tabs-bar`).
- **Owner questions:**
  - 09.1 List button always visible (about 28 px of strip) or only while overflowing? Recommended: always, badge only when tabs are hidden.

### 10: Right sidebar headers stay pinned, are valid headings, have a menu with Hide panel; Properties collapses and is remembered

- **Slug:** `right-sidebar-headers-pinned-collapsible-hide-menu`
- **IDs:** P43 (sticky headers, collapse, remember), P104 header half (counted in 01). Replaces open-itens 210 item 3.
- **Size:** L. **Blocked by:** 01 (`setRightPanelVisible`).
- **Suggested status:** ready-for-agent.
- **What to build:**
  - Each right sidebar section header (Properties, TOC, Backlinks, Outgoing links) stays pinned at the top of the sidebar while its section scrolls under it, and is a real heading with a button inside it (not a heading inside a button).
  - Properties' header collapses its section like the others, and the collapsed state is remembered across note switches, sidebar hide and show, and restarts.
  - Each header has a small menu (visible on header hover, focus-visible and while open): "Hide panel" turns that panel off; Properties also has "Configure types..." (`settingsPanelStore.open('types')`).
  - With every panel hidden and the sidebar shown, the sidebar says "All panels are hidden. Show them again from the palette." If 12's `EmptyState` exists by then, use its compact form.
  - Code, `SidebarSection.svelte`: a sticky wrapper `div` (`sticky top-0 z-10 bg-right-sidebar-bg relative`) holds an `h2` around the existing header element (button when collapsible, div when static; keeps `pane-toolbar`, `data-sidebar-section-header`, the chevron slot as first child and the translucent hover) and, as a sibling outside the `h2` and the button, the optional `DropdownMenu` trigger (`aria-label="<title> menu"`). The title text moves into a `<span>`, so the heading's name is exactly the title. Optional props `onHide` and `menuItems: { label, onSelect }[]`; with neither, no trigger renders. Keep exactly one `pane-toolbar` class list; trigger sizing goes on the trigger. `scrollbarYClasses="z-20"` on the right sidebar `ScrollArea` (`AppShell.svelte:277`), because the bits-ui scrollbar is an absolute sibling after the viewport and a `z-10` header would paint over the thumb.
  - Properties: `PropertiesView.svelte:156` passes `bind:open={() => settingsStore.layout.propertiesCollapsed !== true, (v) => settingsStore.updateLayout({ propertiesCollapsed: !v })}`. New `LayoutSettings.propertiesCollapsed: boolean`, default `false`, JSDoc "Loaded unvalidated, so read it only as `=== true`" (`mergeLayout` copies saved values unvalidated, `settings.logic.ts:20-22`).
  - `anyRightPanelVisible(layout)` in `layout.logic.ts`; the all-hidden text in the `AppShell.svelte:277-292` block. The four panels pass `onHide` at their `SidebarSection` call (`BacklinksPanel.svelte:55`, `OutgoingLinksPanel.svelte:51`, `PropertiesView.svelte:156`, `TableOfContentsPanel.svelte:46`). Info (14) passes neither and stays menu-less.
  - Help `07-sidebar-panels.md`: Properties collapses and is remembered; the header menu; the all-hidden state.
- **Acceptance:**
  - [ ] Failing test first, `SidebarSection.test.ts`: for a static and a collapsible section, the sticky wrapper carries `sticky`, `top-0`, `z-10`, `bg-right-sidebar-bg`; the `h2` is inside it and is the parent of `[data-sidebar-section-header]`; the collapsible header is a `button` inside the `h2`, its first child is the chevron slot, and clicking it toggles the body and `aria-expanded`.
  - [ ] Failing test first, `SidebarSection.test.ts`: with `onHide`, a button named "Backlinks menu" (`aria-haspopup="menu"`) exists, is not inside the toggle button or the `h2`, and the `h2`'s text is exactly the title; choosing "Hide panel" calls `onHide` once; without `onHide` and `menuItems` no trigger renders.
  - [ ] `pane-toolbar.test.ts` stays green unchanged.
  - [ ] Failing test first, `PropertiesView.test.ts` (real `settingsStore`): the header is a button with `aria-expanded="true"`; clicking it hides the body and sets `propertiesCollapsed` true; after `unmount` and a fresh `mount` it is still collapsed; a non-boolean (`'yes'` cast) reads as expanded. While collapsed, switching tabs still updates `propertiesStore.properties` (the parse effect `:105-119` keeps running). "Configure types..." sets `settingsPanelStore.activeSection === 'types'`.
  - [ ] `settings.store.test.ts`: default `false`. `settings.logic.test.ts`: `mergeLayout` keeps a saved `true`.
  - [ ] `BacklinksPanel.test.ts`, `OutgoingLinksPanel.test.ts`, `TableOfContentsPanel.test.ts`, `PropertiesView.test.ts` (real `settingsStore`): "Hide panel" sets that panel's flag false and leaves the others.
  - [ ] Failing test first, `layout.logic.test.ts`: `anyRightPanelVisible` is false only when all four flags are false. `AppShell.test.ts`: all four off with the sidebar shown renders the all-hidden text; one on renders none; Info still hides with Properties (`:221-255`).
  - [ ] The locators that move (`AppShell.test.ts:269-285, 390-398`, `TableOfContentsPanel.test.ts:133-140`, `OutgoingLinksPanel.test.ts:115-121`, `BacklinksPanel.test.ts:164-170`, `sidebars.spec.ts:6,43,56`, `event-calendar-focus.spec.ts:73`) assert the same facts as before (titles, `pane-toolbar` class, chevron first); none is deleted.
  - [ ] The trigger is reachable by Tab and opens with Enter; its visibility classes include hover, focus-visible and open.
  - [ ] E2E `sidebars.spec.ts` (fixture `rightSidebarSize: 20`): with Backlinks and Outgoing expanded on a note with enough rows, scrolling the sidebar keeps the header of the section under the top edge at the viewport's top; collapsing Properties makes `readPersistedLayout(page, 'propertiesCollapsed')` poll to `true` (the helper's key union grows); Hide panel on Backlinks removes its header and the palette "Toggle Backlinks Panel" brings it back; the header locators still click the toggle, not the trigger.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for `sidebars.spec.ts` and `event-calendar-focus.spec.ts`.
- **Split point if one context struggles:** first commit the sticky heading and Properties collapse, then the menu and the all-hidden state; same ticket, in that order.
- **Owner questions:**
  - 10.1 Properties' collapsed state persisted in settings, or for the session only? Recommended: persisted (`propertiesCollapsed`). 11 uses the same answer.
  - 10.2 All-hidden state: text only, or also a "Show all panels" button? Recommended: text only.
  - 10.3 "Configure types..." on Properties only (the other three have no setting besides the Layout switch)? Recommended: yes.

### 11: Backlinks and Outgoing links stay open across note switches and always show the open note's links

- **Slug:** `backlinks-outgoing-stay-open-show-open-note`
- **IDs:** P71, P72. Replaces open-itens 014.
- **Size:** M. **Blocked by:** 10 (the `LayoutSettings` key list; drop the edge if 11.1 is answered "in memory").
- **Suggested status:** ready-for-agent.
- **What to build:**
  - An expanded Backlinks or Outgoing links section stays expanded when you switch notes, hide and show the sidebar, or restart, and shows the new note's links. Today both collapse and reset on every switch (`BacklinksPanel.svelte:33-39`, `OutgoingLinksPanel.svelte:29-35`, deliberate since `77c8cbcda`).
  - Going A -> B -> A no longer shows "No backlinks found" for A (open-itens 014: the per-path skip at `backlinks.service.ts:143` and `outgoing-links.service.ts:68` fires while the store holds another path's list).
  - Relationship backlinks render on their own when a note has relationships but no linked mentions (`BacklinksPanel.svelte:61-62` checks only `linkedMentions`), and "No backlinks found" shows only when both are empty. The relationship label turns underscores into spaces and trims (`depends_on_project` -> `depends on project`, `_group` -> `group`).
  - Code:
    - Open flag: by default `backlinksExpanded` and `outgoingLinksExpanded` in `LayoutSettings`, read with `=== true`, never cleared by a store `reset()`.
    - On a path change while open, the panel calls `fetchData()` under `untrack`, with no store reset; while closed it fetches nothing. The layout prefetch at `+layout.svelte:129` stays; `+layout.svelte:122-124` follows any setter change.
    - Each store records the path its data belongs to, one record per list (`linkedMentions`, `relationshipBacklinks`, `outgoingLinks`). The skip fires only when the store holds this path at this version (and content length for outgoing), replacing the per-path Maps. A list renders only when its record equals `editorStore.activeTabPath`; otherwise the body is empty (no rows, no "No backlinks found").
    - `BacklinksPanel.svelte`: derive `hasMentions` and `hasRels` in the component; each group renders only with rows; the Relationships `mt-2` (`:81`) only below the mentions group; the label is one inline expression at `:96`. No store getter for it, no Rust or DTO change.
    - A -> B -> A now issues one `get_backlinks_v2` per switch (one indexed lookup, `index.rs:760-770`); accept it.
  - Help: `07-sidebar-panels.md:74,92` (stays open), `:76-78` (Relationships can appear without mentions and can list a note also under linked mentions), `25-types-and-relationships.md:248` ("underscores rendered as spaces", drop "leading"); the `+layout.svelte:91-104` comment.
- **Acceptance:**
  - [ ] Failing test first, `backlinks.service.test.ts` (real stores, mock only `@tauri-apps/api/core`): at a fixed `vaultIndexVersion`, A then B then A leaves `linkedMentions` holding A's entry; after `backlinksStore.reset()` the same call refills A.
  - [ ] Failing test first, `outgoing-links.service.test.ts`: after `outgoingLinksStore.reset()`, `fetchOutgoingLinksV2(A, content)` at the same version and length refills A.
  - [ ] Failing test first, `BacklinksPanel.test.ts` and `OutgoingLinksPanel.test.ts`: expanded on A, `editorStore.addTab(B)`, `flushSync`: still `data-state="open"`, and the panel's fetches were called with B.
  - [ ] Failing test first, `BacklinksPanel.test.ts` (real `backlinksStore`): expanded with one `belongs_to` relationship backlink and no mentions for the open note: no "No backlinks found", a "Relationships" trigger with count 1, the row's name and `belongs to`, no "Linked mentions" trigger. `depends_on_project` and `_group` render `depends on project` and `group` (exact `textContent`).
  - [ ] Store seeded with A's mentions and relationships, active tab B, B's fetch pending: neither A row renders and "No backlinks found" is absent. Collapsed on A, switch to B, expand: A's relationship row does not render before B's relationship fetch resolves.
  - [ ] The open flag survives `unmount` and remount, and `reset()` does not clear it (real store or settings, per 11.1).
  - [ ] Unchanged: "does not fetch while collapsed" (`BacklinksPanel.test.ts:62`, `OutgoingLinksPanel.test.ts:61`); neither list shows "No backlinks found" with `text-meta` (`:172-175`); mentions-only and both (`:177-197`); burst-save, version bump, content-length change, `resetBacklinks`/`resetOutgoingLinks` and the active-path guard (014 criteria 4 to 6).
  - [ ] Every new store getter has a store test (ADR-0034).
  - [ ] E2E `sidebars.spec.ts`: expand Backlinks on Roadmap, open Welcome, and Welcome's entries show with no second click; `:35` and `:51` stay green.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for `sidebars.spec.ts`.
- **Owner questions:**
  - 11.1 Open state: the same mechanism as Properties in 10 (persisted layout booleans)? Recommended: yes.
  - 11.2 Is the TOC also kept open across tabs? Asked in 23.2 (it ships "keep per-note collapse" unanswered).

### 12: The rail note list says why it is empty and what to do next

- **Slug:** `rail-note-list-empty-states-say-why`
- **IDs:** P29 (rail half). 17 builds the collection table half. Replaces the EmptyState half of open-itens 204.
- **Size:** M. **Blocked by:** none.
- **Suggested status:** ready-for-agent.
- **What to build:**
  - An empty list no longer just says "No notes here" (`RailNoteList.svelte:876-879`). Each case names its cause and, where there is one, a next step:
    - Favorites: "No favorites yet" / "Star a note with ⌘D, the star above the note, or its row menu."
    - Inbox: "Inbox zero" / "Notes not marked organized show here. Mark one with ⌘E."
    - Archive: "Nothing archived" / "Archive a note from the ... menu above it. Archived notes leave Inbox and Today."
    - Untyped: "Every note has a type." Type: "No {label} notes yet" / "Use + to create one." Folder: "This folder is empty."
    - View with no filters: "No notes in this view". View with N filters: "No notes match N filter(s)" with Edit filters (opens the Filter panel, writes nothing).
    - "Only archived" with nothing archived: "No archived {label} notes" with Show active. "Hide archived" with every note archived: "All {n} {label} notes are archived" with Show archived (both local state, no file write).
    - Gone targets: bare Types "No types yet"; folder "This folder no longer exists"; neighbourhood "This note is no longer in the vault"; unknown kind or plugin provider (the Calendar day lens) "Nothing to show here".
    - Search with no match: `No notes match "{query}"` / "Search covers titles and content of this list." with Clear search, also on grouped lenses (Today, neighbourhood), which today show empty group headers instead (`filterResolvedLens` keeps empty groups, `list-search.logic.ts:36-58`). While the full-text search runs with no local match: a compact "Searching note contents..." line, not the no-match state.
    - View statuses: Loading becomes a spinner with "Loading notes"; Missing gets "Its .view file was moved or deleted."; Error keeps `role="alert"`, the message and Open view, and adds "Fix the .view file and the list reloads."
  - Code: new `src/lib/components/EmptyState.svelte` (title, hint, icon, action, `compact`, `spinner`, `class`, rest props; imports nothing from core, features or plugins); new pure `features/rail-shell/list-empty.logic.ts` `explainEmptyList(input)` returning `{ icon, title, hint?, action? }` (icon as a key string mapped in the component, precedent `explainEmptyTasks`, `task-query.logic.ts:1436-1446`); precedence: searching, null lens, view filters, archived filter, per-lens copy, generic. All copy in one table so 19 updates one entry. `hiddenArchivedCount` from `resolveLens(shownLens, ctx, providers, 'all')`, computed only when a type or Untyped list is empty under "Hide archived". Every `data-note-list-*` hook stays; query text is text, never `{@html}`. No header edits.
  - Docs: `help/documentation/25-types-and-relationships.md:448-457`; one line in `docs/adr/0003-four-layer-source-taxonomy.md` (layout list) and the CLAUDE.md layer table: `components/` outside `ui/` holds hand-written shared primitives with the same import rule.
- **Acceptance:**
  - [ ] Failing test first, `list-empty.logic.test.ts` (no mocks), one case each pinning the literal title and action (hints as literals containing `⌘D` or `⌘E`): Favorites, Inbox, Archive; a view with 0, 1 and 3 filters (singular at 1); "Only archived" giving `show-active`; "Hide archived" with 4 hidden giving `show-archived`; each null case; `searching` beats every lens case; `fullTextLoading` with no local match gives the searching line.
  - [ ] `EmptyState.test.ts`: title; hint and action only when given, action click calls it; `compact` is one `p.text-meta` with no icon; `spinner` renders `animate-spin` and the title; `data-*` and `class` reach the root.
  - [ ] Failing test first, `RailNoteList.search.test.ts`: on `TODAY_LENS` with one dated note, a no-match query shows `[data-note-list-no-matches]` and no `[data-note-list-group-empty]` (red today); Clear search empties the input and restores rows; with the FTS `invoke` pending, `[data-note-list-searching]` shows and no-match does not, then no-match after it resolves empty.
  - [ ] `RailNoteList.test.ts`: Favorites, Inbox and Archive empties show title and hint inside `[data-note-list-empty]`; "Only archived" shows Show active and clicking it lists the active notes; a type whose only note is archived shows "All 1 ... notes are archived" and Show archived lists it; a bare Types lens shows "No types yet".
  - [ ] `RailNoteList.view.test.ts` (real stores, `invoke` mocked): two seeded filters and zero results show "No notes match 2 filters"; Edit filters opens the Filter panel, it is still open after a tick, and nothing was written; Loading, Missing and Error as above.
  - [ ] The text pins that change on purpose (`RailNoteList.test.ts:381,417,516,872,935`, `RailNoteList.view.test.ts:589,611,702,718,746,801,860,872,877,880`, `RailNoteList.search.test.ts:357,365`, `RailNoteList.toolbar.test.ts:317`) query the title element; none is loosened to `toContain`.
  - [ ] `layer-rules`, `feature-cycle`, `lib-specifier-convention`, `chrome-type-scale`, `chrome-state-styles` and `palette-classes` tests pass.
- **Gate:** `pnpm check` + `pnpm vitest run`.
- **Split point if one context struggles:** 12a the primitive, the logic and the flat and grouped list states; 12b the view statuses, filters, archived filter and help. In sequence.
- **Owner questions:**
  - 12.1 A filtered-out view offers Edit filters (opens the panel) rather than Clear filters (writes the `.view`)? Recommended: Edit filters; Clear filters lives inside the panel (17).
  - 12.2 Include the archived-filter causes (Show active, Show archived)? Recommended: yes.
  - 12.3 `EmptyState` in `src/lib/components/`, with one line in ADR-0003 and the CLAUDE.md layer table? Recommended: yes (not `components/ui/`, which is shadcn only per ADR-0002; not feature-local, which would close a `collection` -> `rail-shell` cycle once 17 uses it).
  - 12.4 The hint copy above? Recommended: as written; 19 updates the Archive and Inbox hints.
  - 12.5 Today's empty group keeps the compact "Nothing here" when not searching? Recommended: yes.

### 13: The empty editor becomes a launch point and drops the empty right sidebar

- **Slug:** `empty-editor-launch-point-no-empty-sidebar`
- **IDs:** P97.
- **Size:** M. **Blocked by:** none.
- **Suggested status:** ready-for-agent.
- **What to build:**
  - With no tab open, the editor shows "No note open" / "Pick one of these to start" and three rows: Quick switcher (⌘O), Command palette (⌘P), New note (⌘N, `title` "Create a Quick Capture note", since Cmd+N is Quick Capture, `commands.ts:365-369`). A failed create shows a toast and logs with `error('EMPTY-EDITOR', ...)`. No recent-notes card. Replaces the single "Select a file to view its contents" line (`EditorView.svelte:156`); the drag strip `:154` and `bg-editor-empty-bg` stay.
  - With no tab open, the right sidebar and its toggle are not shown (today the sidebar shows "No file open", `PropertiesView.svelte:157-158`). Cmd+B and the palette toggle do nothing then, as on canvas or Tasks tabs. The saved `rightSidebarVisible` is untouched, so opening a note brings the sidebar back.
  - Owner-gated (13.2): a `.txt` or `.json` tab also hides the sidebar, using `isMarkdownFile` (`fs.logic.ts:65-67`) so `.markdown` notes keep it. This is the case nl-empty-states handed over: those tabs get the full note panels today (`editor.service.ts:186-189` leaves `fileType` undefined).
  - Code: `hidesRightSidebar(null)` returns true (`layout.logic.ts:24`); JSDoc "the tab at `activeTabPath`, or no tab"; comments at `layout.service.ts:24-29` and `AppShell.svelte:188`. New `src/lib/app/EmptyEditorHint.svelte` (composition root, so no layer-baseline entry): `quickSwitcherStore.open()`, `commandPaletteStore.open()`, `createNoteComposer()`; each row shows `formatShortcut(shortcutFor(id))`. Add `command: 'command-palette:toggle'` to the Cmd+P binding (`global-keybindings.ts:63-67`) and widen the `command` field JSDoc (`:54`), since that id is not a palette command.
  - Help: `26-theming.md:168` (copy), `07-sidebar-panels.md:13` (one sentence: the sidebar and its toggle hide with no note open and on canvas, kanban, `.view`, Tags, Tasks, Graph and Calendar tabs), `03-editor.md:66`; with 13.2 yes, `16-table-of-contents.md:41-43` (the unreachable "Not available" paragraph).
- **Acceptance:**
  - [ ] Failing test first, `layout.logic.test.ts`: `isRightSidebarShown(true, null)` and `(false, null)` are false. This replaces "follows the setting when no tab is open" (`:48-51`) on purpose; the commit says the contract is flipped.
  - [ ] `layout.service.test.ts`: `toggleRightSidebar()` with no tab writes nothing (modelled on the Calendar case at `:163`); the toggle tests at `:140-161` and `commands.test.ts:513-525` add a note tab first and still pass.
  - [ ] `AppShell.test.ts`: with no tab and `rightSidebarVisible: true` there is no `[data-right-sidebar]` and no "Hide right sidebar" button; adding a note tab brings both back with the setting still true; `:211-218` adds a note tab.
  - [ ] `global-keybindings.test.ts`: `shortcutFor('command-palette:toggle')` equals `{ key: 'p', meta: true }` (throws today); the "registers all 25" count is unchanged.
  - [ ] New `EmptyEditorHint.test.ts` (real `quickSwitcherStore`, `commandPaletteStore`; only `note-composer.service.js` mocked): heading and three named buttons with their shortcuts; clicks set the two stores' `isOpen` and call `createNoteComposer` once; a rejection does not throw.
  - [ ] `EditorView.test.ts`: no tab mounts the hint and "Select a file to view its contents" is absent; a note tab has no hint.
  - [ ] With 13.2 yes, `layout.logic.test.ts`: `/vault/a.txt` hides the sidebar whatever the setting (replacing `:37-40` on purpose); `.markdown`, `.md` and `/vault/board.kanban/note.md` follow the setting.
  - [ ] E2E `editor-empty-state.spec.ts`: after closing all tabs the three rows show ⌘O, ⌘P and ⌘N and `[data-right-sidebar]` has count 0; Quick switcher opens the dialog; opening `Welcome.md` removes the hint and shows the sidebar. `sidebars.spec.ts` "Default pane sizes" (`:89-104`) stays green (the right pane now mounts after the deferred daily note at every launch).
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for `editor-empty-state.spec.ts` and `sidebars.spec.ts`.
- **Owner questions:**
  - 13.1 On `mvp-claude` the Claude chat lives in the right sidebar, so after this ticket it hides with no tab open. Recommended: ship on main as written; when main is merged into `mvp-claude`, show the sidebar whenever the Claude panel is visible (`claudePanelShown || isRightSidebarShown(...)`).
  - 13.2 Hide the sidebar for non-markdown text files (`.txt`, `.json`)? Recommended: yes, with `isMarkdownFile`.
  - 13.3 With no tab, Cmd+B, the palette toggle and the toggle button do nothing? Recommended: accept, as on Tasks and Graph.

### 14: The Info section uses the shared header and shows short dates

- **Slug:** `info-section-shared-header-short-dates`
- **IDs:** P177 (Info half), P123. 15 builds P177's Relationships labels. Replaces open-itens 210 item 1.
- **Size:** S. **Blocked by:** 10 (`SidebarSection` structure, the `AppShell.test.ts` sections test).
- **Suggested status:** ready-for-agent.
- **What to build:**
  - The Info title lines up with the other section titles (today 36 px in vs 30 px, `NoteInfo.svelte:43-45`): Info renders a static `<SidebarSection title="Info">` with no icon and no menu. The `Info` icon import and the stale `:42` comment go.
  - Dates read "Nov 5, 2026, 10:00" (`month: 'short'`, `note-info.logic.ts:18`; year and system-locale time kept). A value that does not fit wraps under its label instead of truncating beside it: the row gets `flex-wrap`, the label stays `shrink-0`, the value keeps `min-w-0 truncate max-w-full flex-1 text-right`. `title={row.value}` stays; `NoteInfoRow` keeps its shape.
- **Acceptance:**
  - [ ] Failing test first, `NoteInfo.test.ts`: "Info" is inside `[data-sidebar-section-header]` with an empty chevron slot, no svg icon, no menu trigger, and the same title classes as another `SidebarSection`.
  - [ ] Failing test first, `note-info.logic.test.ts`: Modified `Nov 5, 2026, <localTime>`, Created `May 12, 2026, <localTime>`; unknown is `'--'`; Words and Size unchanged; `:27`, `:29`, `:47` and `NoteInfo.test.ts:117` move to the short form.
  - [ ] `NoteInfo.test.ts`: the row has `flex-wrap`, the label is `shrink-0` and never `flex-1`, the value keeps `min-w-0` and `truncate`. This replaces "truncates the value before the label" (`:134-147`) on purpose, stated in the commit; `:124-129` stays unchanged.
  - [ ] `AppShell.test.ts` sections test lists five headers ending in `Info`; `:238-252` stay green.
  - [ ] E2E: at 1024x700 (fixture `rightSidebarSize: 20`) each date value's top is below its label's bottom; at 1280 px no Info value has `scrollWidth > clientWidth`. If the first run measures other widths, the builder writes them in the test comment and does not loosen the assertion.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for the touched spec.
- **Owner questions:**
  - 14.1 Dates keep the year? Recommended: yes.
  - 14.2 Info gets a pinned 40 px header band like the others? Recommended: yes, one recipe.

### 15: Relationships: only kinds with links, one Add relationship row, a keyboard picker with recent notes first

- **Slug:** `relationships-add-row-keyboard-picker-recents`
- **IDs:** P46; also builds part of P43 (empty Relationships chrome) and part of P177 (kind labels). Replaces open-itens 156 and open-itens 210 item 2.
- **Size:** L. **Blocked by:** none.
- **Suggested status:** ready-for-agent.
- **What to build:**
  - The relationship picker works from the keyboard: Up and Down move an active row (wrapping), Enter picks it, Escape closes as today; the hovered row becomes active; the active row scrolls into view. With an empty query, notes reached recently through the Quick Switcher come first under "Recent notes", then the rest with no heading (the Quick Switcher's shape, finders-ux 07). A query gives one flat ranked list. The list is capped by the helpers' `MAX_RESULTS` (100) and scrolls inside `max-h-48`, not sliced to 20.
  - A note with no relationships shows no separator, no "Relationships" heading and no empty kind rows, only one "Add relationship" row. A note with relationships shows the heading and only the kinds that have links, each with its label ("Belongs to", "Related to", "Has many": sentence case, `text-rail`, muted), its plus and its rows, with the Add row below them.
  - "Add relationship" opens one popover: a three-item kind step (keyboard-usable with the same active-row mechanism), then the note search. Picking a note adds the link to that kind; a second pick in an existing kind extends its value.
  - Code:
    - `RelationshipSearch.svelte` keeps the plain input, the `<button onmousedown>` pick with `preventDefault`, `Popover.Content trapFocus={false}` and the focus on open (commit `7af4d945a` left bits-ui `Command` because picks inside the Popover were flaky). A local `activeIndex` reset to 0 on query change, precedent `KanbanWikilinkSuggestions.svelte:20-65`. ARIA: input `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`; list `role="listbox"`; rows `role="option"` with ids from `$props.id()` plus index and `aria-selected`; the active row gets `bg-accent`.
    - Recents: a `recentPaths?: string[]` prop (default `[]`); `PropertiesView` forwards it; `AppShell` (`:279`) passes `quickSwitcherStore.recentPaths`. `features/properties` must not import `features/quick-switcher` (the cycle ratchet, `feature-cycle-baseline.json:23`). Groups via `splitRecentFiles`; flat via `filterAndRank(query, allFiles, recentPaths)`.
    - An optional kind prop: with it, the kind step comes first; without it, the picker is exactly the keyboard picker above (for the per-kind plus buttons).
    - `PropertiesView.svelte` `:53-57` (`FIXED_RELATIONSHIPS` labels, keys unchanged) and `:243-290`; picking calls the existing `addRelationshipLink(kind, name)`.
  - Docs: help `07-sidebar-panels.md:47` (typing, Up/Down, Enter, recent notes first, the single Add row), `25-types-and-relationships.md:542`; a dated amendment line in `docs/adr/0026-type-definitions-relationships-lifecycle.md` (its 2026-05-28 amendment records "a 'Has Many' row in the Properties panel"; empty kinds are now reached through Add relationship).
- **Acceptance:**
  - [ ] Failing test first, `RelationshipSearch.test.ts` (jsdom, real `fsStore`, `vaultStore`, `fileIconsStore`; `Element.prototype.scrollIntoView ??= () => {}`): three notes, empty query: the first option has `aria-selected="true"`; ArrowDown and ArrowUp move it; after each move the input's `aria-activedescendant` is the id of that option.
  - [ ] Failing test first, `PropertiesView.test.ts` (real `propertiesStore`, `editorStore`): open the Belongs to picker, type `Pro`, press Enter: `_belongs_to` equals `[[Projects]]` exactly once, the popover is closed, reopening shows an empty input.
  - [ ] Failing test first, `RelationshipSearch.test.ts`: `recentPaths` `['/vault/C.md', '/vault/Gone.md', '/vault/A.md']` with notes A, B, C lists C, A under "Recent notes", then B with no heading; the missing path is skipped; no `recentPaths` gives no heading and A, B, C; a query gives no heading.
  - [ ] A mousedown pick still writes exactly one `[[...]]` and closes; Escape closes and clears; Enter with no matches does not call `onSelect`. The three existing `RelationshipSearch` tests pass with selectors moved to `[role="option"]`.
  - [ ] Failing test first, `PropertiesView.test.ts`: a note with no relationship keys renders no "Relationships" h3, no `[data-slot="separator"]` inside Properties, no kind label, and exactly one "Add relationship" button.
  - [ ] A note with only `_belongs_to` renders the h3, a "Belongs to" label with its link and plus, no "Related to" or "Has many", and the Add row below. This replaces `:172-181` on purpose; `:151-158` (h3 is `section-label`) stays. Kind labels have `text-rail`, not `section-label`.
  - [ ] From the Add row, choosing "Has many" and a note writes `_has_many` with that link (asserted on the real store and tab content); a second pick in an existing kind extends it. The kind step works by keyboard (arrows and Enter pick a kind, then the search takes focus).
  - [ ] `feature-cycle.test.ts` and `layer-rules.test.ts` stay green.
- **Gate:** `pnpm check` + `pnpm vitest run`.
- **Split point if one context struggles:** the keyboard picker and recents first (open-itens 156's scope), then the Relationships block and the kind step.
- **Owner questions:**
  - 15.1 "Recent notes" means notes reached through the Quick Switcher (`addRecentPath` has two callers, `QuickSwitcher.svelte:82,108`). Ship it that way? Recommended: yes; recording every open is a core change.
  - 15.2 Headings as the Quick Switcher ("Recent notes" plus an unheaded rest), not the prototype's "Recent" / "All notes"? Recommended: match the switcher.

### 16: Untyped notes get a Set type row, and Add property asks for a name and a type

- **Slug:** `set-type-row-typed-add-property`
- **IDs:** P45 (Set type and typed add); builds the add half of P44. 24 builds P45's icon menu.
- **Size:** M. **Blocked by:** 02 (`propertyKeyRefusal`).
- **Suggested status:** ready-for-agent.
- **What to build:**
  - The type row always shows. With no `_type` or a blank one, its trigger reads "Set type"; choosing a type writes `_type` (through `upsertProperty('_type', name)`; `handleUpdate` maps and never appends, `properties.logic.ts:719-729`). Choosing the type already shown writes nothing. With no type definitions the menu shows a disabled "No types defined".
  - Add property becomes a small form: the name input ("Property name..."), five type buttons (text by default, `role="group"`, `aria-pressed`), Add and Cancel. Enter commits with the chosen type; Escape and Cancel close. A duplicate shows 02's message under the input and keeps the form open; a blank Enter stays a silent no-op.
  - New properties get typed defaults that survive a re-parse: text `''`, list `[]`, boolean `false`, number `0`, date today (an empty number or date is written `""` and re-parses as text, ADR 0029).
  - Code: `addNewProperty(key, type = 'text')`; `addProperty(properties, key, type = 'text', today?)` and pure `defaultPropertyValue(type, today)` in `properties.logic.ts`, with the service passing `formatNow('YYYY-MM-DD')` (the helper takes "today" as a parameter). `PropertiesView.svelte` type row `:164-206`, `handleAddProperty`/`handleAddKeydown` `:137-152`, add row `:221-241`.
  - Help `07-sidebar-panels.md:39-43,49`.
  - Known gap, out of scope: on a note whose block is exactly `---\n---\n`, Set type stacks a second block until open-itens 005/022 land (every panel add does that today).
- **Acceptance:**
  - [ ] Failing test first, `PropertiesView.test.ts`: a note with no frontmatter shows a "Set type" trigger; choosing "Podcast" leaves `{ key: '_type', value: 'Podcast' }` in `propertiesStore.properties` and the mocked `syncExternalContentToEditor` receives content with `_type: Podcast`.
  - [ ] `_type: ""` also shows "Set type" (the "empty placeholder" test at `:269-273` changes on purpose). Choosing the current type makes no `syncExternalContentToEditor` call. An empty `typeDefinitionsStore` shows "No types defined".
  - [ ] `properties.logic.test.ts`: for each type, `addProperty([], 'k', type, '2026-11-17')` then `serializeProperties` then `parseFrontmatterProperties` gives back that type; the existing `addProperty` cases (`:986-1006`) pass unchanged.
  - [ ] `properties.service.test.ts`: `addNewProperty('age', 'number')` returns true and writes `age: 0`; the text, blank, duplicate and alias cases pass unchanged.
  - [ ] Add form: pick Number, type a name, Enter adds a number property; Enter alone adds text; a duplicate shows the alert and keeps the form open; Escape closes.
  - [ ] E2E `properties-cross-note.spec.ts` and `note-action-bar.spec.ts` (they drive the "Add property" button and Enter-to-add) pass.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for the two specs.
- **Owner questions:**
  - 16.1 Typed add defaults: number `0` and date today? Or leave Number and Date out of the form? Recommended: `0` and today.
  - 16.2 Set type appends `_type`, or puts it first (as the event-calendar writer does, `event-calendar-event.logic.ts:346-347`)? Recommended: append.
  - 16.3 Blank `_type: ""` shows "Set type" instead of `--`? Recommended: yes.
  - 16.4 No type definitions: the disabled row only, or also free-text entry? Recommended: the row only.

### 17: Filters show their count and can be cleared; the `.view` tab's triggers are named single buttons; an empty table says filters hid its rows

- **Slug:** `filter-counts-clear-view-toolbar-names-empty-table`
- **IDs:** P84 (all but the Display dot), P29 collection half (counted in 12), the `CollectionView` part of review P87. Replaces open-itens 140 bullet 1 (the four toolbar names) only.
- **Size:** L. **Blocked by:** 12 (`EmptyState`).
- **Suggested status:** ready-for-agent.
- **What to build:**
  - The rail's Filter trigger and the `.view` tab's Filter trigger show a count pill and are named "Filter, 2 active" (or "Filter"). Sort shows a pill and "Sort, 1 column"; Columns shows a dot and "Columns, some hidden" when the saved columns leave one out (no count: `allColumns` is every vault property, so a three-column order would read "40 hidden"). The help says a view's badge counts the view's own filters.
  - Inside the filter panel of the rail and the `.view` tab, "Clear filters" empties both groups (it rewrites the view's definition, no confirm). The New view / Edit view dialog and auto-organize rules do not get it (a one-click clear there would save a rule that matches nothing, `auto-organize.logic.ts:38-46`).
  - Each `.view` toolbar control is one button, not a bits-ui trigger button wrapping a shadcn button (`CollectionView.svelte:594-602, 621-628, 644-651, 666-670`), and each has `aria-label` and `title` ("Filter", "Sort", "Columns", "Calendar settings").
  - An empty `.view` table says "No rows in this view" with no filters, or "No rows match N filter(s)" with an Edit filters action that opens the Filter popover and writes nothing (today it always says "No results match the current filters", `CollectionTableView.svelte:34-38`). The live-preview widget copy (`collection-block-widget.ts:160-165`) is untouched.
  - Code: pure `countFilterRows(global, view)` in `collection/toolbar/filter.logic.ts`, used by `countActiveFilters` (`type-note-list.logic.ts`, stays exported) and `CollectionView`'s inline sum (`:221-225`); pure `hasHiddenColumns(saved, all)` in `properties.logic.ts`; new `collection/toolbar/ToolbarCountBadge.svelte` (14 px pill, theme tokens, `aria-hidden`, dot variant); the `child` snippet on the four triggers; optional `onClear` on `FilterPanel` (rendered only when passed and a row exists); the rail Filter trigger (`RailNoteList.svelte:754-760`) gets the badge, name and a `focus-visible` ring. `CollectionTableView` gets `filterCount` and `onEditFilters` and uses `EmptyState`; `CollectionView.svelte:726-731` passes them.
  - Help: `12-views.md` § Toolbar (`:60`), `25-types-and-relationships.md:461-465`.
- **Acceptance:**
  - [ ] Failing test first, `filter-logic.test.ts`: `countFilterRows` is 0 for empty input, sums global and view rows, counts a row with an empty value; `type-note-list.logic.test.ts:392-415` passes unchanged.
  - [ ] `properties-logic.test.ts`: `hasHiddenColumns(undefined, all)` false; equal list false; missing one true; a saved column absent from `all` does not make it true.
  - [ ] Failing test first, `CollectionView.test.ts` (real `collectionStore`): no `button button` in the toolbar; two filter rows give `getByRole('button', { name: /Filter, 2 active/ })` with pill 2; none gives "Filter" and no pill; same for Sort and Columns.
  - [ ] `FilterPanel.svelte.test.ts`: no `onClear` means no "Clear filters"; with it, it shows only when a row exists and calls it once. `CollectionView.view-writes.test.ts`: Clear filters writes the `.view` with no `filters` on the active view or at the top level (asserted on the written YAML).
  - [ ] `RailNoteList.view.test.ts` (real stores): a view with two filters shows "Filter, 2 active" with a 2 pill; Clear filters empties the rows and the trigger reads "Filter".
  - [ ] An auto-organize rule's filter panel has no "Clear filters" (one assertion in the `AutoOrganizeRuleRow` test); `ViewDialog` tests pass.
  - [ ] Failing test first, `CollectionTableView.svelte.test.ts`: an empty result with `filterCount` 0 does not contain "filter" (red today); `filterCount` 2 shows "No rows match 2 filters" (1: singular) and an Edit filters button that calls `onEditFilters`. `CollectionView.test.ts`: on a filtered-out view, Edit filters opens the Filter panel and nothing is written.
  - [ ] `pane-toolbar`, `chrome-state-styles`, `palette-classes` and `feature-cycle` tests pass.
- **Gate:** `pnpm check` + `pnpm vitest run`.
- **Owner questions:**
  - 17.1 Clear filters on a view rewrites its definition in one click, drops the file's YAML comments (open-itens 071) and asks nothing. OK inside the panel only? Recommended: yes, not on the trigger or the empty state.
  - 17.2 Columns: a dot and "some hidden", not a count? Recommended: dot.

### 18: Note-list header: one Display popover, a state dot, and "+" visible down to 150 px

- **Slug:** `note-list-display-popover-narrow-header`
- **IDs:** P33; builds P84's Display dot and P38's folder-lens "+" title. Replaces the note-list-header clause of open-itens 207 only.
- **Size:** L. **Blocked by:** 17 (header and the Filter trigger).
- **Suggested status:** ready-for-agent.
- **What to build:**
  - One Display trigger (sliders icon; the word "Display" from about 290 px of header) replaces the Sort, Properties and Archive triggers. Its popover holds three sections, each the existing panel body with its own keys: Sort by (focus on the active row, Left/Right set direction, "Multiple sort..." on a view closes Display and opens the sort panel), Show in note list (search, checkboxes, drag, Alt+arrows), Archived notes (only when `offersArchivedFilter`). Tab moves between sections. No sort or properties logic is rewritten.
  - A dot on Display, named "Display options, customised", when the sort is customised, a property is shown, or the archived filter is not "active"; otherwise "Display options". Its `title` names the current sort ("Sorted by Modified"), since the header no longer shows the sort label or `+N`.
  - Below a 220 px header container, the title may shrink to nothing (`min-w-16` to `min-w-0`), right padding 8 px, gap 2 px, CSS only on the existing `@container` header; above it nothing changes. Every lens keeps "+" visible at 150 px beside the labeled rail.
  - On a folder lens, "+" has `title` "New note in <folder>/" ("in the vault root" at the root). Its accessible name stays "New here" (about ten e2e lookups, `settings-copy.test.ts:112-115`, ten help pages).
  - Code: `RailNoteList.svelte` header `:698-801`; `RailSortMenu.svelte`, `RailPropertiesPicker.svelte` (keep `available`, `selected`, `onChange`; open-itens 134 reuses it), `RailArchivedMenu.svelte` split into panel bodies; new `RailDisplayMenu.svelte`. Selectors `data-sort-option`, `data-sort-multiple`, `data-archived-option` stay; `data-note-list-sort`, `-properties`, `-archived` go; `data-note-list-display` arrives.
  - Help: `01-getting-started.md:112` (Display with its three sections, the dot and the narrow behaviour; the Archived menu has no help today), the view toolbar paragraph of `25-types-and-relationships.md:461-465`, `help/examples/type-definitions-features/README.md:88`.
- **Acceptance:**
  - [ ] Failing test first, `e2e/specs/rail-list-toolbar.spec.ts`: with the labeled rail, the Today, a type and a view list dragged to 150 px each show `[data-note-list-new]` visible and clickable (`click({ trial: true })`), Today also shows `[data-note-list-header-action]`, no header child ends past the pane edge, and the title has a non-zero width. The 220 px Inbox case still asserts the 64 px title.
  - [ ] `RailNoteList.toolbar.test.ts`: a type lens header has Search, `[data-note-list-display]` and "+", and none of the three removed hooks; Display shows the Archived section on type and Untyped lenses, not on a folder lens.
  - [ ] The sort cases of `RailNoteList.sort.test.ts`, the toggle and reorder cases of `RailNoteList.properties.test.ts`, and the archived cases pass after only their open step changes; no assertion removed.
  - [ ] New `RailDisplayMenu.test.ts`: the active sort row has focus on open; Tab reaches the first Properties control, then the first Archived option; Escape closes and returns focus to the trigger; on a view "Multiple sort..." closes Display and opens the sort panel, and a click on Filter then closes it (`rail-list-toolbar.spec.ts:226-238` keeps passing).
  - [ ] The dot and name: absent at defaults; present after a sort, a ticked property, or "Show archived"; gone after resetting each.
  - [ ] Folder lens "+" `title` reads "New note in Projects/" and "New note in the vault root"; its name is "New here" on every lens.
  - [ ] `rail-styles.spec.ts:532-548` (collapsed rail) passes with Display in Sort's place; `rail-shell.spec.ts:142` (`openSortPanel`) opens Display first. `rail-shell.boundary`, `layer-rules`, `chrome-state-styles`, `menu-item-anatomy`, `radius-scale` pass.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for `rail-list-toolbar`, `rail-styles` and `rail-shell`.
- **Owner questions:**
  - 18.1 Below a 220 px header: the narrow rule (title may shrink below four characters) or the prototype's overflow menu? Recommended: the narrow rule.
  - 18.2 The sort name and `+N` move from the header into Display's tooltip and name. OK? Recommended: yes.

### 19: One note-actions group in the row menu, the More menu and the palette

- **Slug:** `note-actions-group-row-more-palette`
- **IDs:** P39 (shared list). 03 builds the Inbox check, 30 the tab menu.
- **Size:** M. **Blocked by:** 03 (writer shape), 04 (`toLensNote` lines), 12 (hint table).
- **Suggested status:** ready-for-agent.
- **What to build:**
  - The note-list row menu and the note's More menu end with the same group, same order and labels: Archive / Restore, Mark organized / Mark not organized, History, Move to Trash (red, last, no separator before it so the pinned "no group holds a single item" rule at `NoteRowMenu.test.ts:314-322` holds). Canvas, view, PDF, image and other files get Move to Trash only. "Archive this note" and "Delete this note" go from the More menu (`NoteActionBar.svelte:207-219`).
  - Archive and Mark organized on a row act on that row's note, not the active tab. History first activates the note (opens or focuses its tab), then opens the History dialog, so Restore cannot write into another tab (open-itens 023's bug, which stays open). Shortcut hints only in the More menu (the active note).
  - One Trash prompt everywhere, with the file name (`Move "alpha.md" to trash?`); the row's delete calls `deleteNoteWithConfirm`, which now requests the prompt index refresh (`TypesNavigator.svelte:343` gains it harmlessly).
  - The palette gets "Toggle Archived" and "Move Note to Trash" (category Note, stable labels beside "Toggle Favorite" and "Toggle Organized"); Move Note to Trash on a virtual tab toasts "No file is open." and asks nothing.
  - Code: new pure `features/properties/note-actions.logic.ts` `noteActions(kind, { organized, archived })` returning ids, labels, `danger` (no icons: `pure-logic.test.ts` forbids svelte imports in `.logic.ts`; each menu maps id to icon). `setArchivedForPath` in `lifecycle.service.ts`. `NoteRowNote` gains required `organized` and `archived` (`note-row.types.ts`, `lens.logic.ts`, `rail-shell.types.ts`). `delete-note.service.ts`, `NoteRowMenu.svelte`, `NoteActionBar.svelte`, `commands.ts`. Update 12's Archive and Inbox hints in `list-empty.logic.ts` now that the row menu has those actions.
  - Help: `02-file-explorer.md:53-67`, `03-editor.md:50-52`, `25-types-and-relationships.md:182,284,659`, `20-keyboard-shortcuts.md:101-`; `e2e/specs/rail-shell.spec.ts:312`. Leave `28-mods.md:657` (a mod example).
- **Acceptance:**
  - [ ] Failing test first, new `note-actions.logic.test.ts`: markdown unorganized and active gives Archive, Mark organized, History, Move to Trash; organized and archived give Restore and Mark not organized; canvas, view and PDF give Move to Trash only; only Trash is `danger`.
  - [ ] Failing test first, `NoteRowMenu.test.ts` (keeps its lifecycle mock, asserts entries only): markdown order `['Open in new tab', 'Duplicate', '---', 'Copy path', 'Change icon', 'Favorite', 'Reveal in Finder', '---', 'Rename', 'Archive', 'Mark organized', 'History', 'Move to Trash']`; canvas ends `'Rename', 'Move to Trash'`; the single-item-group test stays as written.
  - [ ] Failing test first, new `NoteRowMenu.lifecycle.test.ts` (real writer, fs mocked, as `NoteRowMenu.favorite.test.ts`): with B active, Mark organized and Archive on row A write A's file and leave B's content unchanged; History on row A leaves A active and `fileHistoryStore.filePath === A`.
  - [ ] Failing test first, `NoteActionBar.test.ts`: More lists the same group for the same state (`:524`, `:532`); "Delete this note" and "Archive this note" appear nowhere under `src/lib`; More > Move to Trash confirmed trashes and closes the tab (`:324-350` renamed, same disk assertions).
  - [ ] Failing test first, `delete-note.service.test.ts`: `deleteNoteWithConfirm` requests a prompt refresh before the delete; the row's prompt matches the bar's (`NoteRowMenu.test.ts:430-438` now expects the file name); a `PreDeleteSaveError` adds no toast.
  - [ ] Failing test first, `commands.test.ts`: the two commands exist in category Note and act on the active note; with a virtual tab Move Note to Trash calls no `ask` and toasts "No file is open.". The count pin changes on purpose.
  - [ ] `lens.logic.test.ts`: `toLensNote` carries `organized` and `archived`; the folder-lens non-markdown row has `organized: true, archived: false`. `list-empty.logic.test.ts` pins the updated hints.
  - [ ] `pure-logic`, `menu-item-anatomy`, `feature-cycle` (no new pair) and `layer-rules` tests pass. E2E `file-operations.spec.ts`, `note-action-bar.spec.ts`, `rail-shell.spec.ts:312` updated and green.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for the three specs.
- **Owner questions:**
  - 19.1 Palette labels stable ("Toggle Archived", "Move Note to Trash"), state-aware only in menus? Recommended: yes (a state-aware label would rebuild the command list on every keystroke, `AppOverlays.svelte:19`).
  - 19.2 Move to Trash without its own separator group, last and red? Recommended: yes, rule kept.
  - 19.3 One Trash prompt with the file name? Recommended: yes.
  - 19.4 History on a non-active note activates it first? Recommended: yes, until 023 lands.

### 20: Clickable breadcrumb: type and folder crumbs, name without .md

- **Slug:** `breadcrumb-type-folder-crumbs`
- **IDs:** P102 (crumbs). 33 builds Reveal. Replaces the breadcrumb half of open-itens 153.
- **Size:** M. **Blocked by:** none.
- **Suggested status:** ready-for-agent.
- **What to build:**
  - The note action bar's breadcrumb reads `Type › Folder › Folder › Name`, with the name without `.md` (`stem(path)`, `utils/path.ts:79`). Clicking the type crumb opens the Types lens on that type; clicking a folder crumb opens the Files lens on that folder, showing the panels and expanding its ancestors in the navigator. An untyped note's "Note" crumb opens the Untyped lens when that row is enabled. A crumb whose target cannot show (hidden type, Untyped off, its rail item in `railHidden`) is plain text. A vault-root note or a tab outside the vault shows no folder crumbs. Long paths keep the first and last folder and fold the middle into one ellipsis with a tooltip.
  - Code: `getActionBarState(path, content, vaultPath)` in `note-action-bar.logic.ts` adds `name` and `folders: { label, path }[]` from `vaultRelativeKey` (`utils/path.ts:120-123`); pure `collapseFolderCrumbs(folders, max = 2)`. New `features/rail-shell/lens-open.service.ts` (`openTypeLens`, `openUntypedLens`, `openFolderLens`; not in `app/`, which `layer-rules.test.ts:166-183` forbids features to import) and pure `withExpandedAncestors` in `lens.logic.ts`. The type crumb checks `getTypeMetadataFallback(typeName, map).visible` (O(1); the bar re-derives on every keystroke). `NoteActionBar.svelte:128-132`: crumbs are buttons with `title` and accessible names ("Show all Project notes", "Show Areas/Health in Files"); the name is a `span` with `truncate`; spacing utilities only inside the breadcrumb `div`, never on the `.pane-toolbar` row.
  - Help `03-editor.md:36`.
- **Acceptance:**
  - [ ] Failing test first, `note-action-bar.logic.test.ts`: `getActionBarState('/v/Areas/Health/Sleep.md', '', '/v')` gives name "Sleep" and folders Areas (`/v/Areas`), Health (`/v/Areas/Health`); `/v/Root.md` and `/elsewhere/x.md` give none; `v1.2 notes.md` gives "v1.2 notes"; `collapseFolderCrumbs` keeps 1 and 2 folders and folds 4 to first, ellipsis, last.
  - [ ] Failing test first, `lens-open.service.test.ts` (real `settingsStore`): `openFolderLens('/v/Areas/Health')` with panels hidden and `railExpandedFolders: ['/v/Other']` gives `railItem: 'files'`, that `railFolder`, `railPanelsVisible: true` and the ancestors added without duplicates; `openTypeLens('Project')` gives the Types pick.
  - [ ] Failing test first, `NoteActionBar.test.ts` (real stores): clicking "Project" and "Areas" changes `settingsStore.layout` as above. A `_visible: false` type, an untyped note with `showUntypedNotes` off, and a crumb whose rail item is hidden are plain text; with `showUntypedNotes` on, "Note" opens `UNTYPED_LENS`.
  - [ ] The name reads "Launch plan" (`NoteActionBar.test.ts:175`, `note-action-bar.logic.test.ts:22,40` change on purpose); `note-action-bar.spec.ts:36` expects `Welcome`; a new E2E step clicks a folder crumb and sees the Files lens on that folder.
  - [ ] `pane-toolbar.test.ts` and the `foldActions` tests stay green.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh e2e/specs/note-action-bar.spec.ts`.
- **Owner questions:**
  - 20.1 The untyped "Note" crumb opens the Untyped lens when enabled? Recommended: yes.
  - 20.2 Crumb order `Type › folders › name` (it can read as if the folders sit inside the type)? Recommended: keep the prototype's order.
  - 20.3 Fold middle folders by count, showing at most two? Recommended: yes.

### 21: Files header gets a "+" menu, and every creator says "New <kind>"

- **Slug:** `files-header-plus-menu-new-kind-labels`
- **IDs:** P38.
- **Size:** M. **Blocked by:** none.
- **Suggested status:** ready-for-agent.
- **What to build:**
  - A "+" button at the right of the Files header (`aria-label="New in folder"`, `title` "New in <folder>/" or "New in the vault root") opens a menu headed "Create in <folder>" with the same items in the same order as the folder context menu: New note, New canvas, New table, New kanban board (and any registered folder creators), New view, New folder. It acts on the picked folder (the vault root when the root is picked). Mod folder actions stay in the context menu only. Both menus loop over one list (`fileCreators` `FilesNavigator.svelte:80-91`, menu `:346-370`).
  - Sentence case everywhere: "New note", "New folder", "New canvas", "New table", "New view", "New kanban board" in the Files menus, the kanban registration (`kanban.service.ts:30`) and the palette (`commands.ts:149-193`; "New File" becomes "New note", "New Folder" "New folder"). Command ids do not change (palette recents are keyed by id). "New File from Template" and "Create 1:1 Note" keep their labels. Palette creators keep writing to the vault root.
  - Help: `02-file-explorer.md:19-20,73`, `11-canvas.md:22-23`, `20-keyboard-shortcuts.md:107-110`, `06-search-and-navigation.md:54-57`, `21-kanban.md:5,15` (it wrongly says the palette's board lands "in your current folder"), `25-types-and-relationships.md:296`, `28-mods.md:206`, `mods/07-events-and-reactivity.md:441`, `mods/13-api-reference.md:110`.
- **Acceptance:**
  - [ ] Failing test first, `FilesNavigator.menu.test.ts`: the header has a "+" named "New in folder"; its menu lists exactly the folder context menu's labels minus mod items, in the same order, with New kanban board registered through the real `railRegistryStore`.
  - [ ] With `Projects` picked, New note from the header creates `Projects/Untitled.md` (fs.service and Tauri mocked), opens it and keeps `Projects` picked; at the root it creates at the root; New folder starts the inline rename; after the pick moves to `Areas`, the `title`, heading and target follow.
  - [ ] A picked folder deleted outside the app: New note toasts the create failure and does not re-create the folder (`fs.service.ts:198-223`).
  - [ ] Label pins updated: `FilesNavigator.menu.test.ts:202,218,274,326`, `FilesNavigator.new-view.test.ts:111`, `kanban.service.test.ts:41`, `app-lifecycle.service.test.ts:895`, `commands.test.ts`; `commands.new-commands.test.ts` still creates at `${VAULT}/Untitled.*` for every id.
  - [ ] `menu-item-anatomy`, `chrome-state-styles`, `rail-shell.boundary` pass; E2E `rail-shell.spec.ts:836-880` and `file-operations.spec.ts:5-9` pass untouched.
- **Gate:** `pnpm check` + `pnpm vitest run`.
- **Owner questions:**
  - 21.1 Palette creators keep the vault root, or follow the Files pick? Recommended: keep the vault root (finders-ux 02 precedent; 38 adds "New note here" for lens-following note creation).
  - 21.2 "New kanban board" rather than the prototype's "New board"? Recommended: "New kanban board" (the palette matches labels only).

### 22: Outgoing links: only missing targets are broken, two-line rows, a Broken links group whose rows create the note

- **Slug:** `outgoing-links-broken-group-two-line-rows`
- **IDs:** P75; builds P74's outgoing half. Replaces open-itens 046 (its "attachment row opens the file" criterion revised).
- **Size:** L. **Blocked by:** 11 (outgoing store path record and panel body).
- **Suggested status:** ready-for-agent.
- **What to build:**
  - Only a link whose target does not exist shows as broken. A same-note heading link (`[[#Action Items]]`) resolves to the note itself; an embed or link to an existing file (`![[photo.png]]`) resolves against the file tree with the editor's rule. Today both are red (`index.rs:157-158`, the index holds notes only).
  - Resolved rows show two lines: the alias or file name, then the folder and heading (`Projects › Goals`), with `target#heading` on hover. A root target has no folder.
  - Broken links move to a "Broken links" group with a count below the resolved rows. Each is a button (alert icon, no `opacity-60`, a "Create" pill, `title="Create <target>.md"`) that creates the note and opens it, exactly as clicking the missing link in the editor does (periodic routing, `.md`, the unorganized flag). A failed create shows an error toast and leaves the list unchanged. A resolved `[[Note#H]]` opens the note at H. A binary attachment row is drawn as resolved and is not a button (`openFileInEditor` would toast "Cannot open binary file").
  - Code:
    - `outgoing-links.service.ts`, after the IPC: empty target plus heading resolves to the note itself; other unresolved targets go through `resolveWikilinkCached` + `buildResolutionCache` over `flattenFileTree(fsStore.fileTree).filter(isLinkTargetFile)`; `deduplicateByTarget` keys on lowercase target plus heading. Recommended: move `treeLinkIndex()` (`app/editor-host.ts:75-84`, core-only dependencies) into a core module so the editor and the panel share one cache; `editor-host.ts` imports it. No Rust change.
    - Pure `outgoingLinkLabel(link)` and `partitionOutgoingLinks(links)` in `outgoing-links.logic.ts` (an empty stub today).
    - Clicks: `followWikilink(editorStore.editorView?.state.facet(editorHost) ?? NOOP_HOST, target, { heading, blockId: null })` (`core/markdown-editor/editor-host.ts:104`, `wikilink-navigation.ts:17-22`). Not `openOrCreateNote` (it would make `[[2026-11-17]]` a root note) and not moving the create flow into `core/` (a new core -> plugins edge fails `layer-rules.test.ts`).
  - Help `07-sidebar-panels.md:90` (the group; "target note does not exist" stays true).
- **Acceptance:**
  - [ ] Failing test first, `outgoing-links.service.test.ts` (real `fsStore`, `vaultStore`; Tauri mocked): IPC returns `photo.png`, `{target:'', heading:'Action Items'}` and `Missing`, all unresolved, with `photo.png` in the tree: after the fetch the first two have a `resolvedPath`, only `Missing` is unresolved. `[[#One]]`/`[[#Two]]` and `[[Note#A]]`/`[[Note#B]]` each give two rows.
  - [ ] If `treeLinkIndex` moves: the editor-host coverage stays green, the moved module has a unit test, `layer-rules.test.ts` passes.
  - [ ] Failing test first, `outgoing-links.logic.test.ts`: `outgoingLinkLabel({target:'Projects/Roadmap', alias:null, heading:'Goals'})` is `{title:'Roadmap', sub:'Projects › Goals', tooltip:'Projects/Roadmap#Goals'}`; an alias becomes the title; `{target:'', heading:'Tasks'}` titles `Tasks`; a root target has no folder in `sub`; `partitionOutgoingLinks([])` gives two empty lists and order is kept.
  - [ ] `OutgoingLinksPanel.test.ts` (real stores; a real `EditorView` built with `editorHost.of(host)` set through `editorStore.setEditorView`): broken rows render after resolved rows under "Broken links" with count 2, each a `button` without `opacity-60`; no label when none; `:124` rewritten on purpose for the new markup.
  - [ ] Clicking broken `[[Folder/New]]` calls `host.createNote('Folder/New', ...)`; clicking `[[Roadmap#Goals]]` calls `host.openLink(<abs Roadmap>, { heading: 'Goals', blockId: null })`; a `createNote` resolving `false` toasts and leaves `outgoingLinksStore.outgoingLinks` unchanged; a `.png` row is not a button and not red.
  - [ ] E2E `sidebars.spec.ts`: `:51-61` updated to the new accessible name; a new fixture note (not `Welcome.md`, which other specs pin) with `[[Nowhere]]` shows it under "Broken links", and clicking it creates `Nowhere.md` through the mocked `create_note` and opens it.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for `sidebars.spec.ts`.
- **Owner questions:**
  - 22.1 A broken row creates and opens the note (as the editor does), rather than create, stay and toast (prototype)? Recommended: create and open.
  - 22.2 Attachment rows non-interactive, or open with the system app? Recommended: non-interactive.

### 23: Table of contents: no decorative chevrons, the current heading follows the editor

- **Slug:** `toc-current-heading-no-chevrons`
- **IDs:** P115 (scroll-spy part). 37 builds the command.
- **Size:** M. **Blocked by:** none.
- **Suggested status:** ready-for-agent (ships "keep" for 23.2 unanswered).
- **What to build:**
  - The per-row chevrons go (`TableOfContentsPanel.svelte:62`); level-1 text lines up with other sidebar text (re-tune `padding-left` and `.toc-indent-lines`).
  - The heading at the middle of the editor viewport is marked current (`aria-current="true"`: tint, primary colour, semibold, inset left bar). Middle, not top, because a TOC click centres its heading (`MarkdownEditor.svelte:590-612`, `y: 'center'`); a top probe would mark the heading above after every click. Scrolled to the bottom, the last heading is current. A click marks its row at once. `title={heading.text}` stays (`table-of-contents.spec.ts:17`).
  - Code: pure `headingIndexAtLine(headings, line)` in `toc.logic.ts` by `heading.line`; `tocStore` gains the probe line (getter, setter, reset); a bridge in the panel (`$effect` on `editorStore.editorView` and `expanded`, passive `scroll` on `view.scrollDOM`, rAF-throttled, removed on collapse and destroy, `view.lineBlockAtHeight(scrollTop + clientHeight / 2)`).
  - Only on 23.2 "align": the open state stops being per note (a boolean in place of `expandedPath`, no clear on tab switch or destroy), `showTableOfContents` sets it, and `16-table-of-contents.md:11` changes.
  - Help `16-table-of-contents.md` describes the current-heading cue.
- **Acceptance:**
  - [ ] Failing test first, `toc.logic.test.ts`: `headingIndexAtLine` returns the last heading with `line <= line`, `-1` before the first and for `[]`, the last index past the end.
  - [ ] `TableOfContentsPanel.test.ts`: no `svg.lucide-chevron-right` in heading rows, the section chevron remains, every row keeps `title`; after `tocStore.setProbeLine(n)` exactly one row has `aria-current="true"` and it moves with `n`; a click marks its row.
  - [ ] `TableOfContentsPanel.test.ts` with a real jsdom `EditorView` via `editorStore.setEditorView` (29 files already build one, `test-helpers.ts`): a `scroll` on `view.scrollDOM` writes the probe line only while expanded, and not after collapse or unmount.
  - [ ] `toc.store.test.ts`: the probe-line getter, setter and reset.
  - [ ] E2E `table-of-contents.spec.ts` with a new long fixture note (8+ headings): click a mid-note heading, and once scrolling settles that row is current (fails with a top probe); scroll to the bottom, the last heading is current.
  - [ ] Owner decision 23.2 recorded in Notes. On "align", `TableOfContentsPanel.test.ts:77,92`, `toc.service.test.ts` (`expandedPath`) and the E2E "updates when switching files" (`:20-31`) are rewritten on purpose; on "keep" they stay.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for `table-of-contents.spec.ts`.
- **Owner questions:**
  - 23.1 Remove the chevrons, or make them collapse subtrees? Recommended: remove.
  - 23.2 Keep the TOC's per-note collapse on tab switch (deliberate, `80ee3491a`), or keep it open across tabs like 11? Recommended: align with 11 for one sidebar rule. Unanswered, the ticket ships "keep".

### 24: The property icon opens a type menu that converts without loss

- **Slug:** `property-type-menu-lossless-conversion`
- **IDs:** part of P45 (counted in 16).
- **Size:** M. **Blocked by:** 16 (`defaultPropertyValue`; 02's `Props`).
- **Suggested status:** ready-for-agent.
- **What to build:**
  - The type icon in front of each property (inert today, `PropertyField.svelte:110`) is a button ("Change property type"; accessible name "Change type of {key}, now {type}") opening a "Property type" menu with the five types and a check on the current one.
  - A type is offered only when the value converts with no loss and comes back as that type after a save and re-parse: an empty value converts to 16's default; a scalar to a list by wrapping (not splitting on commas); a list to text by joining with `", "` (a one-item list as its item); a string to number or boolean only under `typedOptionValue` (`String(Number(s)) === s`, `properties.logic.ts:674-680`, so `007` never becomes `7`); number and boolean to text with `String()`. Anything else is disabled, including an ISO-shaped value to text (`ISO_DATE_REGEX` re-infers it as a date). Picking the current type does nothing. Autosave writes within 500 ms, so a destructive conversion would be unrecoverable.
  - Code: `DropdownMenu` trigger in `PropertyField.svelte` (`typeIcons` `:42-50` reused, new `onType` prop); `changePropertyType(key, type): boolean` in `properties.service.ts` through `updatePropertyValue(..., value, type)` and `commitChanges`; pure `convertPropertyValue(property, to, today)` returning the value or null. No change to `serializeProperties` or the ADR 0029 empty-value form.
  - Help `07-sidebar-panels.md:55` ("The type is auto-detected from the value" becomes false).
- **Acceptance:**
  - [ ] Failing test first, `properties.logic.test.ts`: over the 5x5 matrix with an empty, a convertible and a non-convertible sample, every non-null result survives `serializeProperties` then `parseFrontmatterProperties` with the chosen type and value; `"hello"` to number, `"007"` to number, `"2026-11-17"` to text and `true` to number are null; no number or date result is `''`.
  - [ ] `PropertyField.test.ts`: the icon is a `<button>` with `aria-haspopup="menu"` and the accessible name; the menu lists five items with the current one checked and unavailable ones disabled; picking a type calls `onType(key, type)` once; the current one makes no call.
  - [ ] `properties.service.test.ts` (real `propertiesStore`, `editorStore`): `changePropertyType('n', 'number')` on `n: "5"` writes `n: 5` and stores `type: 'number'`; on lossy frontmatter it returns false and content is unchanged.
  - [ ] After a change the control matches the type (checkbox, `type="number"`, `type="date"`, chips); a list never iterates a string's characters.
  - [ ] `panel-meta-bind-lossy-rewrite.test.ts` and `frontmatter-number-spelling.test.ts` pass unchanged.
- **Gate:** `pnpm check` + `pnpm vitest run`.
- **Owner questions:**
  - 24.1 Lossless conversions only, the rest disabled? Recommended: yes.

### 25: List chips edit in place, and an empty list shows "+ Add"

- **Slug:** `list-chips-edit-in-place-empty-add`
- **IDs:** P122.
- **Size:** M. **Blocked by:** 02 (`PropertyField.svelte` script and test helpers).
- **Suggested status:** ready-for-agent.
- **What to build:**
  - Double-clicking a list chip, or pressing Enter or F2 on its focused text, turns it into an input (`aria-label="Edit item"`), focused and selected. Enter or blur commits the trimmed text: unchanged text writes nothing, empty text removes the item, otherwise that item is replaced. Escape cancels (a flag set before blur fires). When the write is refused the chip shows the stored text again.
  - An empty list shows a dashed "+ Add" button that opens the add input (today the block does not render, `PropertyField.svelte:168`). Non-empty lists keep today's controls. Enter in the add input adds the item and keeps the input open and focused.
  - Code: state `:25-27`, `removeListItem`/`addListItem` `:84-96` (`addListItem` checks `onUpdate`'s result), chip block `:167-201`; the dead `handleListKeydown` (`:98-103`) goes because this block is rewritten. The main row is not touched. The chip text stays in the first `span` with `truncate`.
  - Help `07-sidebar-panels.md:53-54` (double-click to edit).
- **Acceptance:**
  - [ ] Failing test first, `PropertyField.test.ts`: an empty list renders a visible "Add" button and no `[data-property-list-item]`; clicking it opens the add input. This replaces "renders no block for an empty list" (`:170-175`) on purpose.
  - [ ] `dblclick` on a chip shows an input with the item text; Enter calls `onUpdate('tags', [...])` with only that item replaced; Escape then blur makes no call; blur alone commits; unchanged text makes no call; empty text removes the item; `onUpdate` returning false shows the stored text.
  - [ ] New test (none exists today): Enter in the add input adds the item and keeps the input open and focused. Enter on a focused chip opens the edit input.
  - [ ] `:147-168` pass: the text stays in the first `span` with `truncate`, the remove button keeps `title="Remove item"`.
- **Gate:** `pnpm check` + `pnpm vitest run`.
- **Owner questions:**
  - 25.1 Add the Enter/F2 route, and delete an emptied chip (as the prototype)? Recommended: yes to both.

### 26: Property rows stack key over value in a narrow sidebar

- **Slug:** `property-rows-stack-narrow-sidebar`
- **IDs:** P121.
- **Size:** M. **Blocked by:** 16, 24, 25 (it lays out the final row: the type row, the icon button and the chip block).
- **Suggested status:** ready-for-agent.
- **Order note:** the two layout and editing verdicts disagreed on where P121 goes. It goes last among the `PropertyField.svelte` tickets, so its required E2E checks the row with every element 02, 16, 24 and 25 add, once.
- **What to build:**
  - Below 232 px of container width (`@max-[232px]:`, one constant named in the test), each property row becomes a two-column grid: a 14 px icon column and the content, with the name above the value. The sidebar can never be much wider than about 250 px at a 1024 px window (`maxSize={30}`).
  - The Remove button, and on list rows the Add item button, are taken out of the flow at every width (`absolute` in a `relative` row, `div.group` `:106`), visible on `group-hover` and `group-focus-within`, freeing about 24 px.
  - The type row follows the same layout and its spacer (`PropertiesView.svelte:203`) goes. `PropertiesView.svelte:155` root gets `@container`.
  - Selectors `input[data-property-key]`, `div.group` and `input:not([data-property-key])` keep matching (`frontmatter-write-keeps-scroll.spec.ts:180-191`, `properties-cross-note.spec.ts:100-104`); no new input comes before the value input.
- **Acceptance:**
  - [ ] Failing test first, `PropertiesView.test.ts`: the root has `@container`. `PropertyField.test.ts`: main row, key and value carry the `@max-[232px]:` stacked classes; the row is `relative`; Remove (and Add item on a list) is `absolute` with `group-hover:opacity-100` and `group-focus-within:opacity-100`.
  - [ ] Every value variant still renders and edits through its existing test; the list branch leaves no empty grid cell above the chips; the type row has no spacer and stacks the same way; the type-selector describe (`PropertiesView.test.ts:184-`) stays green.
  - [ ] E2E (required, jsdom computes no container query): at 1024x700 (fixture `rightSidebarSize: 20`, about 166 px) the first `input[data-property-key]` is above its value input and at least 100 px wide; at 1440 px key and value share one row. `properties-cross-note.spec.ts` stays green.
  - [ ] No change to `rightSidebarSize`, `minSize` or `maxSize` in `AppShell.svelte`.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for the touched specs.
- **Owner questions:**
  - 26.1 Remove out of the flow at every width (it overlays about 16 px of a long value's tail on hover)? Recommended: yes.
  - 26.2 Stacking threshold 232 px of container width? Recommended: yes.

### 27: Shared roving-list util and arrow keys in Search results

- **Slug:** `roving-list-util-search-results-keyboard`
- **IDs:** part of P24 (counted in 28).
- **Size:** M. **Blocked by:** none.
- **Suggested status:** ready-for-agent.
- **What to build:**
  - In the Search panel, ArrowDown in the input moves to the first result; arrows, Home and End move among results; ArrowUp on the first result returns to the input; only one result is a Tab stop and it follows focus. Enter opens a focused result as a click does.
  - With 27.1 approved: the first Escape clears a non-empty query and keeps focus in the input; Escape on an empty query leaves the input (today Escape only blurs, `SearchPanel.svelte:41-44`).
  - Code: pure `src/lib/utils/roving-list.ts` with the generic parts of `tasks-keys.logic.ts:46-112` (ArrowUp/Down/Home/End resolution, null on modifiers, `count === 0` or a key off the row; `nextCurrentRow`; `tabStopRow`). `tasks-keys.logic.ts` keeps every export and signature and delegates (tasks-view-ux 113, 241, 255 rely on it). `SearchPanel.svelte` (`[data-search-result] > button`, not virtualized); `SearchResult.svelte` only takes the `tabindex` it is given.
  - Help `06-search-and-navigation.md:90` (only with 27.1).
- **Acceptance:**
  - [ ] Failing test first, new `roving-list.test.ts`: clamping, Home/End, modifier and `count === 0` rules, `nextCurrentRow`, `tabStopRow`. `tasks-keys.logic.test.ts` and `TasksView.keyboard.test.ts` pass with no edit.
  - [ ] Failing test first, `SearchPanel.test.ts` (real `searchStore`, search service mocked as today): with three results, ArrowDown in the input focuses the first; ArrowDown, End, Home move focus; exactly one result has `tabindex="0"` and it follows focus; ArrowUp on the first returns to the input; Enter opens.
  - [ ] With 27.1: Escape on a non-empty query clears it and keeps focus; Escape on empty blurs and keeps Search shown (`:153-163` unchanged); `e2e/specs/search.spec.ts:39-51` rewritten for two Escapes with its rail-item tail kept. Without approval none of this changes.
  - [ ] `pure-logic.test.ts` green.
- **Gate:** `pnpm check` + `pnpm vitest run` (plus `bash scripts/e2e.sh` for `search.spec.ts` with 27.1).
- **Owner questions:**
  - 27.1 First Escape clears the query, the second leaves the input (matches the rail list search; rewrites a help sentence that promises the opposite)? Recommended: yes.

### 28: Rail note list: one Tab stop, arrow keys, focus follows removals and rename

- **Slug:** `rail-note-list-roving-keyboard`
- **IDs:** P24 (note list). 27 builds the util and Search.
- **Size:** L. **Blocked by:** 03 (check `tabindex`), 12 (list body `{#if}` chain), 27 (`utils/roving-list.ts`).
- **Suggested status:** ready-for-agent.
- **What to build:**
  - Tab enters the note list on one row and Tab leaves it; ArrowUp/Down, Home and End move between rows. Enter, Space and F2 keep their row behaviour. Group headers, empties and Today section components stay in normal Tab order and are skipped by the arrows.
  - When the focused row leaves the list (archived, organized, moved), focus moves to the neighbour; focus in the search input stays there. Rename: committing re-points the current row to the new path; Enter or Escape in the rename input returns focus to the row; arrows in the input move the caret. ArrowDown in the open list search moves to the first row; ArrowUp on the first row returns to it.
  - On the Inbox lens only the tab-stop row's check has `tabindex="0"`.
  - Code: a current-row key and one keydown handler on the list using 27's resolver for focus keys only. The roving order is the shown note items keyed by `item.key` in the grouped list and `note.path` in the flat one (the neighbourhood lens lists one note in several groups, `RailNoteList.svelte:678`). `keepMounted` holds the current row's index in that `VList`'s `data` (grouped indices include headers and sections); a move to an unmounted row calls `scrollToIndex` and focuses after mount. The bits-ui context-menu trigger puts `tabindex: -1` on the list wrapper (`NoteRowMenu.svelte:203`): "focus inside the list" counts the wrapper, which must not become a Tab stop. `RailListSearch.svelte` gets `onArrowDown`. No Cmd+Enter, no hint bar, no `listbox` role.
  - Files: `RailNoteList.svelte`, `RailListSearch.svelte`, `NoteRow.svelte`, `NoteRowMenu.svelte`, `note-row-menu.context.ts`; help `02-file-explorer.md`.
- **Acceptance:**
  - [ ] Failing test first, new `RailNoteList.keyboard.test.ts` (real stores, virtua shim): with 12 notes exactly one `[data-note-row]` has `tabindex="0"`; arrows move focus and the tab stop; Home and End go to the ends. If jsdom cannot mount a row after `scrollToIndex`, the 40-note End case moves to E2E, said in the commit.
  - [ ] Failing test first: neighbourhood lens with one note under both Outgoing links and Backlinks: one tab stop, ArrowDown walks each item once in display order, headers skipped; in Today, section components are not in the roving order.
  - [ ] Failing test first: rename input arrows move the caret; a committed rename leaves focus on the renamed row; Escape returns focus to the row; Enter on a focused row opens the note once.
  - [ ] Failing test first: ArrowDown in the open search input focuses the first row; ArrowUp on the first returns; `RailListSearch.test.ts:141-146` unchanged.
  - [ ] Failing test first: when the focused row leaves (an entries snapshot without it), focus moves to the next row; with focus in the search input it stays.
  - [ ] Inbox: only the tab-stop row's check has `tabindex="0"`.
  - [ ] E2E: Tab into the list lands on one row, arrows move, Tab leaves; `focus-ring.spec.ts:121-125` and `rail-shell.spec.ts` stay green.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for the touched specs.
- **Owner questions:** none beyond 27.1.

### 29: Tabs can be dragged to reorder and show their full path on hover

- **Slug:** `tabs-drag-reorder-hover-path`
- **IDs:** part of P34 (counted in 09).
- **Size:** M. **Blocked by:** 09 (strip markup and test).
- **Suggested status:** ready-for-agent.
- **What to build:**
  - Drag a tab to reorder; one drop marker shows the slot; the strip auto-scrolls within 40 px of its edges. Pinned tabs stay first: a pinned tab stays inside the pinned group and an unpinned one outside it. The active tab stays active.
  - Hovering a tab shows its name, its vault-relative path, "Unsaved changes" when dirty and "Pinned" when pinned, one per line (native `title`); virtual tabs show their name. Every tab, pinned ones included, has an accessible name (pinned tabs show no visible name, `EditorTabs.svelte:87`). The dirty dot says "Unsaved changes".
  - A tab dropped on a Files folder, a canvas or the editor does nothing: the drag carries only a private `application/x-kokobrain-tab` type, never `text/plain` (a `text/plain` path dropped on a folder moves the note on disk, `FilesNavigator.svelte:279-291`; precedent `RailPropertiesPicker.svelte:70-73`). The strip accepts only drags of that type.
  - Code: pure `moveTab(tabs, activeIndex, from, to)` in `editor.logic.ts` beside `reorderTabsAfterPinChange` (insertion index, clamps with `getPinnedBoundary`, keeps `activeIndex` by path, returns the same tab objects so per-tab state such as 41's history moves with them); `editorStore.moveTab(from, to)`. The `{#each}` stays unkeyed. Pure `tabTooltipText(tab, vaultPath)`.
  - Help `03-editor.md` Tabs: drag to reorder, the hover path.
- **Acceptance:**
  - [ ] Failing test first, `editor.logic.test.ts`: `moveTab` forward and backward; no-op for the same slot and out-of-range; clamps pinned and unpinned groups; keeps `activeIndex` on the same path in each case; returns the same objects (`toBe`).
  - [ ] `editor.store.test.ts`: `moveTab(0, 3)` reorders and keeps `activeTab`; invalid indices change nothing.
  - [ ] `EditorTabs.test.ts`: tabs are `draggable="true"`; `dragstart` stores `application/x-kokobrain-tab` and no `text/plain`; `dragover` past a midpoint shows exactly one marker; `drop` reorders the real store with pinned tabs first; `dragend` without a drop removes the marker. A `dragover` with only `['text/plain']` is not prevented and shows no marker; its `drop` changes nothing.
  - [ ] `tabTooltipText` cases (file, `TASKS_VIRTUAL_PATH`, dirty, pinned); every tab has `aria-label` equal to its name and that `title`; the dot has `title="Unsaved changes"`; tabs keep `tabindex="0"`; the context-menu tests at `:114-158` stay green.
  - [ ] E2E `tabs.spec.ts`: a real `dragTo` (precedent `rail-shell.spec.ts:901`) of the last tab onto the first unpinned slot reorders and keeps it active; a pinned tab dragged past the unpinned group stays at the pinned group's end; a tab dragged onto a Files folder moves nothing on disk.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for `tabs`, `tab-pinning` and `rail-shell`.
- **Owner questions:**
  - 29.1 Native multi-line `title` rather than a styled bits-ui tooltip (which needs a `Tooltip.Provider`, `tooltip.svelte.js:192`, and a third trigger on the tab)? Recommended: native `title`.
  - 29.2 Keyboard reorder: not here; if wanted, "Move tab left/right" goes into 30's menu. Recommended: not now.

### 30: Tab menu: Close others, Close to the right, and the shared note group

- **Slug:** `tab-menu-close-others-note-actions`
- **IDs:** part of P39 (counted in 19).
- **Size:** M. **Blocked by:** 19 (`note-actions.logic.ts`), 29 (`EditorTabs.svelte` per-tab block `:49-113`, `EditorTabs.test.ts:114-158`).
- **Suggested status:** ready-for-agent.
- **What to build:**
  - The tab menu reads: Pin or Unpin tab; then, for unpinned tabs, Close tab, Close others (disabled with no other closable tab), Close to the right (disabled on the last tab); then, for markdown note tabs, 19's group (Archive, Mark organized, History, Move to Trash) acting on that tab's note. Pinned tabs are skipped by the bulk closes; a dirty tab whose save fails still asks "Close anyway", and a declined prompt keeps it while the others close. After Close others the target is active.
  - Code: `closeOtherTabs(path)` and `closeTabsToTheRight(path)` in `editor.service.ts` (snapshot paths first, then for each re-find with `findTabIndex` and `await closeTab(index)`). `EditorTabs.svelte` gets an optional `noteActions?: Snippet<[EditorTab]>` (core cannot import features); `EditorView.svelte` fills it from 19's list with `getActionBarState(tab.path, tab.content)` and by-path writers; History activates the tab first.
  - Help `03-editor.md:27`.
- **Acceptance:**
  - [ ] Failing test first, `editor.service.test.ts`: tabs [A, B pinned, C dirty and saving, D dirty with a failing save and "Close anyway" declined, E]: `closeOtherTabs(A)` leaves [A, B, D] with A active and C saved first; `closeTabsToTheRight(C)` closes only tabs after C, skips pinned ones, and leaves `activeIndex` valid.
  - [ ] Failing test first, `EditorTabs.test.ts`: an unpinned markdown tab lists Pin tab, Close tab, Close others, Close to the right, then the shared group (the `['Pin tab', 'Close tab']` case at `:143-149` is the intended change); a pinned tab lists Unpin tab then the shared group; Tasks, Graph and Tags tabs list no shared group; disabled states as above.
  - [ ] Failing test first, `EditorView.test.ts`: Archive and Mark organized on a non-active markdown tab write that tab's path and leave the active tab's content unchanged.
  - [ ] `EditorTabs.svelte` imports nothing from `features/` or `plugins/` (`layer-rules.test.ts` baseline unchanged); `menu-item-anatomy.test.ts` green.
  - [ ] E2E `tab-pinning.spec.ts` (or `tabs.spec.ts`): Close others and Close to the right keep a pinned tab.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for the touched spec.
- **Owner questions:**
  - 30.1 Trash and History on canvas and kanban tabs too? Recommended: no, markdown tabs only.

### 31: Kanban and `.view` tabs get a title row with their source toggle; source mode is per tab

- **Slug:** `kanban-view-tabs-title-row-per-tab-source-mode`
- **IDs:** P18 (header and per-tab source mode). 32 builds the canvas, 45 the band utility. Does not take open-itens 140's label bullet (17 owns it).
- **Size:** M. **Blocked by:** 17 (the four `.view` toolbar triggers).
- **Suggested status:** ready-for-agent.
- **What to build:**
  - Kanban and `.view` tabs get a title row like notes: `<kind> › <file name>`, their own controls, then a source-mode toggle at the end (`aria-pressed`, a state label, "(Cmd+\)" in its title, like the action bar's Raw button). The floating toggles go (`EditorView.svelte:96-108` kanban, `:123-135` `.view`). The `.view` tab shows the row in its parse-error and "Building index..." states too, so the user can reach source mode to repair the YAML. In source mode, a row with the name and "Switch to board view" / "Switch to table view" sits above the editor.
  - Source mode is per tab: switching tabs keeps each tab's own mode. Cmd+\ on a kanban, canvas or `.view` tab flips that tab's mode; on a Tasks, Tags, Graph or Calendar tab it does nothing; on a note it flips Raw as today. Today Cmd+\ on a board flips the global `isLivePreview`, so the next note opens in Raw (`editor.service.ts:437-439`).
  - No Favorite, Organized or Pin on these tabs (they write frontmatter).
  - Code: `sourceMode?: boolean` on `EditorTab` (`editor.types.ts`, not persisted, dropped with the tab, follows `updateTabPath`, survives pin), a setter and an `activeTabSourceMode` getter in `editor.store.svelte.ts`; `toggleSourceMode` routing; new `core/layout/ViewHeader.svelte` (the single `pane-toolbar` class list, reads `editorStore.activeTab` for the name, children snippet, the toggle; no new props on the views; name `basename(path)`); `KanbanView.svelte`, `CollectionView.svelte` render it around their controls; `EditorView.svelte` drops the local flags and reset effect (`:31-35`, `:47-53`), keeps the canvas floating toggle bound to the store (32 removes it) and the text-file toggle.
  - Docs: `03-editor.md:51,72,85,107`, `12-views.md:188`, `11-canvas.md:108`, `20-keyboard-shortcuts.md:30`; one amendment sentence in ADR-0033 (Cmd+\ also flips a view tab's source mode, `:102-103`).
- **Acceptance:**
  - [ ] Failing test first, `editor.store.test.ts`: two kanban tabs, A's flag set: `activeTabSourceMode` true while A is active and false on B; `updateTabPath` keeps it; `togglePin` keeps it; `removeTab` then re-adding gives false; `reset()` clears it.
  - [ ] Failing test first, `editor.service.test.ts` (real `editorStore`): with kanban, canvas or collection active, `toggleSourceMode()` flips only that tab's flag and leaves `isLivePreview` true; with a Tasks, Tags, Graph or Calendar tab it changes nothing; with a note it flips `isLivePreview` (`:1086` green).
  - [ ] Failing test first, `EditorView.test.ts` (real stores and views): kanban and `.view` tabs each render one `pane-toolbar` row with the file name and one "Switch to source mode"; no `absolute` toggle remains for them; clicking shows `.cm-editor` under a row with "Switch to board view" (or table); clicking returns. Replaces `:313-332`.
  - [ ] Regression: Cmd+\ on a board, then open a note: it opens in live preview (Raw `aria-pressed="false"`). Kanban A in source mode, switch to note B and back: A still in source mode, B not.
  - [ ] A `.view` whose YAML does not parse, and one still building, show the row and the toggle reaches source mode.
  - [ ] `CollectionView.test.ts` finds the four buttons by role and name (17's names unchanged); `CollectionView.view-writes`, `CollectionView.restored-view` and `KanbanView` tests green.
  - [ ] `pane-toolbar.test.ts` lists `ViewHeader.svelte` in place of files that no longer carry a class list (commit says why); `chrome-state-styles`, `chrome-type-scale`, `menu-item-anatomy` pass.
  - [ ] E2E `kanban-view.spec.ts` and `canvas-view.spec.ts` pass.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for the two specs.
- **Owner questions:**
  - 31.1 Source mode per tab (prototype) or reset on every switch (today)? Recommended: per tab.
  - 31.2 Title shows the file name with its extension until 20's `stem` rule is shared? Recommended: yes.

### 32: The canvas tab gets the title row with its add buttons; the 118 px offset goes away

- **Slug:** `canvas-tab-title-row-add-buttons`
- **IDs:** part of P18 (counted in 31).
- **Size:** M. **Blocked by:** 31 (`ViewHeader`, the store flag and routing).
- **Suggested status:** ready-for-agent.
- **What to build:**
  - The canvas tab gets the same title row with its five add buttons (text card, file, link, image, group; same callbacks, named by `aria-label` and `title`) and the source toggle. The floating vertical stack at `bottom: 118px` (`CanvasToolbar.svelte:44-46`) and the floating toggle (`EditorView.svelte:109-122`) go. xyflow `Controls` and `MiniMap` stay.
  - The header renders inside the `SvelteFlowProvider` above `.canvas-container` (`CanvasInner.svelte:602,689`; `fitView` comes from `useSvelteFlow()`), and stays outside any error branch so open-itens 027's future error panel can call the same store setter.
  - Help `11-canvas.md`, `03-editor.md:107`.
- **Acceptance:**
  - [ ] Failing test first, new `CanvasHeader.test.ts` (real `CanvasView` with its provider, stubs as `canvas-tab-switch.test.ts`): one `pane-toolbar` row with the file name, the five add buttons by name and one "Switch to source mode"; no `.canvas-toolbar`; `CanvasToolbar.svelte` (if kept) has no `118px` and no `position: absolute`.
  - [ ] "Add text card" adds a node to the real canvas state and calls `onJsonChange` with JSON holding it (asserted on the JSON).
  - [ ] Canvas source mode shows the row with "Switch to canvas view"; Cmd+\ flips it; the minimap and `Controls` still render.
  - [ ] `EditorView.test.ts` canvas case (`top-3`) replaced by the header assertions; E2E `canvas-view.spec.ts` passes.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for `canvas-view.spec.ts`.
- **Owner questions:**
  - 32.1 Keep xyflow `Controls` (zoom, lock) and move only the add buttons? Recommended: yes.

### 33: Reveal in note list

- **Slug:** `reveal-in-note-list`
- **IDs:** part of P102 (counted in 20).
- **Size:** M. **Blocked by:** 20 (`lens-open.service.ts`, `withExpandedAncestors`).
- **Suggested status:** ready-for-agent.
- **What to build:**
  - "Reveal in note list" in the More menu (above Copy deeplink, not foldable) and in the palette (Navigation, only with an active markdown note) opens the Files lens on the note's folder (vault root for a root note), shows the panels, expands the ancestors, clears a list search that would hide the note, scrolls the row into the middle and flashes it for about 1.5 s. Archived notes are revealed too (the Files lens lists them). With Files hidden in the rail it toasts and changes nothing; a note the lens does not list toasts "Not shown in the note list".
  - Code: a getter-based reveal store `{ path, nonce } | null` in `features/rail-shell/`; `revealInNoteList(path)` in `lens-open.service.ts`; `RailNoteList.svelte`: `bind:this` on the flat `VList` (`:881`; virtua 0.54.2 exports `scrollToIndex`), an `$effect` with `untrack` that consumes the request once `notes` holds the path. `NoteRow.svelte` gets a `flash` prop (`data-note-row-flash`), never a store read (`note-list -> rail-shell` would close a feature cycle).
  - Help `03-editor.md` Note Action Bar.
  - Sequence with 28 (same flat `VList`; whichever lands second reuses the ref).
- **Acceptance:**
  - [ ] Failing test first, `RailNoteList.test.ts` (virtua shims, real stores): a 100-note Files lens with the target off-screen; a reveal request mounts the row with `data-note-row-flash`, cleared after the timer (fake timers).
  - [ ] Failing test first: same folder picked with a list search hiding the target: the reveal clears the query and the row flashes.
  - [ ] Failing test first, `lens-open.service.test.ts` (real stores): `revealInNoteList('/v/Areas/Health/Sleep.md')` with panels hidden sets the Files lens, `railFolder`, ancestors and `railPanelsVisible`; a root note sets `railFolder: null`; with `railHidden: ['files']` the layout is unchanged and a toast shows.
  - [ ] An archived note is revealed. The More menu shows the item; `commands.test.ts`: the palette entry exists with an active markdown note and not without (count pin on purpose).
  - [ ] `foldActions` tests unchanged; `feature-cycle` and `layer-rules` green.
  - [ ] E2E `rail-shell.spec.ts`: reveal a note in a nested folder.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh e2e/specs/rail-shell.spec.ts`.
- **Owner questions:**
  - 33.1 Reveal always targets the Files lens at the note's folder? Recommended: yes.

### 34: Files tree puts configured system folders last and muted, with direct file counts

- **Slug:** `files-tree-system-folders-last-counts`
- **IDs:** P119.
- **Size:** M. **Blocked by:** 04 (`lens.logic.ts`), 21 (`FilesNavigator.svelte` and its tests). Also owner questions 34.1 to 34.3.
- **Suggested status:** needs-info until 34.1 to 34.3 are answered; ready-for-agent with the defaults.
- **What to build:**
  - At the vault root of the Files navigator, the configured system folder (`templates.systemFolder`, default `_system`) and the templates folder (`templates.folder`) move after the other folders and their names are muted (also their subfolders, unless picked; a file-icon colour still wins). Not every `_` folder: `_notes` and `Work/_people` are user folders in a default vault. A blank setting disables that half. A custom root order (`fsStore.folderOrder['.']`, or any top-level folder in `fsStore.contentOrder`) keeps the incoming order, still muted. Only the navigator changes; `scan_vault`, the Rust sort, `fs.service.ts`, `fs.watcher.ts` and every other `fileTree` consumer keep scan order.
  - With 34.3 yes: each folder row (not the root) shows its direct, non-hidden file count, right-aligned and muted, from a pure helper that `resolveFolderLens` (`:1004-1005`) also uses, so it equals the note-list header for that folder. No number for zero.
  - Code: a predicate and a stable `systemFoldersLast(folders, isSystem)` in `lens.logic.ts` beside `navigatorFolders`, applied to `topFolders` (`FilesNavigator.svelte:77`); name span `:493`.
  - Help `02-file-explorer.md:86` (today "same order: by name"), `:9` (counts).
- **Acceptance:**
  - [ ] Failing test first, `lens.logic.test.ts`: the predicate is true for `_system`, `_system/templates` and `_templates` (when `templates.folder` is `_templates`), false for `_notes` and `Work/_people`; blank settings make it false; `systemFoldersLast` keeps relative order in each half.
  - [ ] Failing test first, `FilesNavigator.test.ts` (real `settingsStore`, `fsStore`, `vaultStore`): tree `_notes, _system, Areas, Daily` renders `[root, _notes, Areas, Daily, _system]`; `_system` has `text-file-explorer-muted-fg`, `_notes` does not; a custom root order keeps the incoming order with `_system` muted; an expanded `_system/templates` is muted; a `titleColor` rule wins; picking `_system` shows the primary colour.
  - [ ] Counts: two notes, a canvas, a dotfile and a subfolder show `3`; empty shows nothing; the number equals `resolveLens(folder(path)).notes.length`; it updates after `fsStore.setFileTree` adds a file.
  - [ ] E2E `file-explorer.spec.ts:57-75` expects `[root, Daily, Projects, _system, _templates]` (comment and title updated) and passes with `focus-ring.spec.ts` (`:74-80,97,108` take the first folder row).
  - [ ] `FilesNavigator.test.ts:92-98` and `lens.logic.test.ts:2036-2046` stay green.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for `file-explorer.spec.ts` and `focus-ring.spec.ts`.
- **Owner questions:**
  - 34.1 System folders are the configured System folder and templates folder, not every `_` folder? Recommended: yes, no new setting.
  - 34.2 Only the root level is reordered, and a custom root order switches it off (muting stays)? Recommended: yes.
  - 34.3 Counts: direct file count (equals the list header; `_notes`, whose files sit in subfolders, shows none) or recursive, or none? Recommended: direct.

### 35: Zoom shows a chip and is remembered on this machine

- **Slug:** `zoom-chip-remembered-per-machine`
- **IDs:** P99.
- **Size:** M. **Blocked by:** none (assumes 35.1's default).
- **Suggested status:** ready-for-agent.
- **What to build:**
  - Zooming (Cmd+= / Cmd+- / Cmd+0) shows a small chip with the level ("110%") for 1.5 s, restarted by each change; clicking it resets to 100%. The level is remembered on this Mac and applied at launch, also on the vault picker; restoring shows no chip.
  - Code: `zoom.service.ts` keeps `ZOOM_LEVELS` and the synchronous `currentZoom = factor` before the `await` (held Cmd+= fires repeated keydowns; moving it after the await would lose steps). After `setZoom` resolves: write `localStorage['kokobrain:zoom']` (remove at 1.0), set `zoomStore.level` and `chipVisible`, restart the hide timer (in the service). On rejection the error propagates and storage and store are unchanged. New `restoreZoom()` (try/catch read, only a value in `ZOOM_LEVELS`, no call for 1.0 or junk), called next to `applyStoredTheme()` (`(app)/+layout.svelte:36`) with a logged catch. New `zoom.store.svelte.ts` (getters only) and `ZoomChip.svelte` mounted once in `AppOverlays.svelte` (mounted on both screens; `AppShell` renders only `children` with no vault): a `<button aria-label="Reset zoom to 100%">` with a `role="status"` `aria-live="polite"` percentage, `fixed right-3 bottom-[calc(var(--status-bar-height)+0.75rem)]`, `motion-reduce:transition-none`. No palette commands.
  - Help `03-editor.md:157-165`.
- **Acceptance:**
  - [ ] Failing test first, `zoom.service.test.ts` (mock only `@tauri-apps/api/webviewWindow`, `localStorage.clear()` per test): after `zoomIn()` the key is `'1.1'`; `restoreZoom()` with `'1.25'` calls `setZoom(1.25)` once and a following `zoomIn()` calls `setZoom(1.5)`; `'abc'`, `'1.3'`, `'NaN'`, `'1'` or no key make no call and the next `zoomIn()` goes to 1.1; `resetZoom()` removes the key; a rejecting `setZoom` propagates and leaves key and `zoomStore.level`; two `zoomIn()` started without awaiting end at 1.25.
  - [ ] Fake timers, real store and service: a change sets `level` and `chipVisible`; it hides after 1500 ms; a second change at 1000 ms keeps it until 2500 ms; `restoreZoom()` never sets `chipVisible`.
  - [ ] `ZoomChip.test.ts`: absent before a change; "110%" after one `zoomIn()`; button name "Reset zoom to 100%"; clicking calls the mocked `setZoom(1)` and shows "100%". `AppOverlays.test.ts`: the chip appears after `zoomIn()` with no vault open.
  - [ ] Not covered by tests (stated in the PR): WKWebView zoom after a real relaunch, the chip at 50% and 200%, the composer window staying at 100%.
- **Gate:** `pnpm check` + `pnpm vitest run`.
- **Owner questions:**
  - 35.1 Per machine in `localStorage` (applies on the vault picker, never syncs with a vault) or per vault in `settings.json` (cannot apply before a vault opens)? Recommended: `localStorage`.

### 36: Switch vaults from inside a vault: palette commands, Cmd+Shift+O and a File menu

- **Slug:** `switch-vaults-palette-shortcut-file-menu`
- **IDs:** P103.
- **Size:** M. **Blocked by:** 01 (`commands.ts` list, count pin, help 06 table).
- **Suggested status:** ready-for-agent.
- **What to build:**
  - Inside a vault you can open another one: palette "Open Vault..." (category Vault, Cmd+Shift+O; Cmd+O stays the quick switcher), one "Open Vault: <name>" command per recent vault except the current one, and a native File menu between KokoBrain and Edit with exactly one item, "Open Vault..." (`CmdOrCtrl+Shift+O`). No Close Window item (Cmd+W must stay Close Tab, open-itens 023 relies on it), no Open Recent. `switchVault`, `openVaultDialog` and `openRecentVault` are unchanged: the switch saves every dirty tab and asks only when a save fails, so no confirm.
  - Code: `commands.ts` (`vault:open` with `shortcut: shortcutFor('vault:open')`; a `recentVaultCommands()` builder like `railGoToCommands`); `global-keybindings.ts` (`{ command: 'vault:open', key: 'o', meta: true, shift: true }`, logged and toasted catch as `:152`); `events.rs` `MENU_OPEN_VAULT_EVENT = "menu:open-vault"` and `contracts/events.ts` `EVENT_NAMES.MENU_OPEN_VAULT`; new `src-tauri/src/commands/app_menu.rs` with a pure `menu_action(id) -> MenuAction` enum (`OpenSettings | OpenVault | Quit | None`) and item id consts, registered in `commands/mod.rs`; `lib.rs` `build_menu` gets the File submenu, `on_menu_event` becomes a `match` whose arms each emit their own registry const (a local-variable emit fails `events-parity.test.ts:94-127`) and keep `app.exit(0)` for Quit; `registerMenuOpenVaultListener` in `tauri-listeners.service.ts`, mounted in `(app)/+layout.svelte`.
  - Help: `01-getting-started.md:146-152` "Switching Vaults" (today it says to close the current vault, which no UI does) and `:42-48`; a Vault row in `06-search-and-navigation.md`; Cmd+Shift+O in `20-keyboard-shortcuts.md`.
- **Acceptance:**
  - [ ] Failing test first, `commands.test.ts` (real `vaultStore`, `vault.service` mocked): after opening `/vaults/a` then `/vaults/b`, `vault:open` ("Open Vault...", Vault, shortcut `{ key: 'o', meta: true, shift: true }`) and `vault:open-recent:/vaults/a` ("Open Vault: a") exist, nothing for `/vaults/b`; after `removeRecent('/vaults/a')` none; with no vault open every recent gets one. The count pin changes on purpose.
  - [ ] Failing test first, `global-keybindings.test.ts`: `shortcutFor('vault:open')` equals `{ key: 'o', meta: true, shift: true }`; the fixed count (`:142`) moves to 26 on purpose; Cmd+O still opens the quick switcher (`:156`, `:363`).
  - [ ] Failing test first, `tauri-listeners.service.test.ts` (`vault.service` real; `open` added to the `@tauri-apps/plugin-dialog` mock): `menu:open-vault` with `open` resolving `/vaults/b` sets `vaultStore.path`; `null` leaves it and shows no toast; a rejection is logged with `error('LISTENERS', ...)` and does not throw; cleanup unlistens, also before `listen` resolves.
  - [ ] Failing test first, new `src-tauri/tests/commands/app_menu_test.rs` (registered in `src-tauri/tests/commands/mod.rs`): `"settings"` is `OpenSettings`, the File item id is `OpenVault`, `"quit"` is `Quit`, other ids `None`.
  - [ ] `events-parity.test.ts` passes unchanged.
  - [ ] E2E `vault-picker.spec.ts`: with the test vault open and a second vault in the fake fs, `setOpenResponse(secondPath)` then "Open Vault..." shows the second vault's file in the rail and none of the first (if the fake fs cannot serve two roots, assert the vault root row).
  - [ ] Manual check on the built app, recorded in the Issue: File sits between KokoBrain and Edit with one item; Cmd+Shift+O and File > Open Vault... each open the picker once inside a vault and on the welcome screen; Cmd+O still opens the switcher; Cmd+W still closes a tab; Quit still runs the exit flush.
- **Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm check`, `pnpm vitest run`; `bash scripts/e2e.sh` for `vault-picker.spec.ts`.
- **Notes:** open-itens 083 (refuse a folder outside the allowed roots) changes `openVaultDialog` and every entry point here inherits it. A first-class switch makes the overlapping-switch race in open-itens 105 a little more reachable; note it, no scope change.
- **Owner questions:**
  - 36.1 Cmd+Shift+O, declared in both `GLOBAL_KEYBINDINGS` and the File menu like Cmd+,? Recommended: yes.
  - 36.2 A native File > Open Recent (new IPC command, DTO, menu rebuild for at most two entries)? Recommended: no; ask again after this ships.

### 37: Go to heading command and picker

- **Slug:** `go-to-heading-command-picker`
- **IDs:** part of P115 (counted in 23).
- **Size:** M. **Blocked by:** none.
- **Suggested status:** ready-for-agent.
- **What to build:**
  - A palette command "Go to Heading" (category Navigation, beside the other Go to commands, no default shortcut) opens a picker listing the active note's headings in document order with an `H<level>` hint, filtered by fuzzy match. Enter jumps to the heading (the TOC click's rule, `openNoteAt(activeTabPath, { kind: 'offset', offset: heading.pos })`, same CRLF limit). Works with the TOC hidden or collapsed. With no active markdown tab the command toasts and opens nothing.
  - Code: picker component and a small open-state store in `src/lib/plugins/table-of-contents/`, built on `#lib/components/ui/command` (finders-ux 01) like `TemplatePicker`, `OneOnOnePicker`, `ModActionPicker`; mounted in `AppOverlays.svelte`; the command in `commands.ts`; headings from `extractTocHeadings(editorStore.activeTabContent)`.
  - Help `06-search-and-navigation.md:73`, `20-keyboard-shortcuts.md:120`, `16-table-of-contents.md`.
- **Acceptance:**
  - [ ] Failing test first, `commands.test.ts`: the command exists with the agreed id, label and category, and its action opens the picker (real store). The count pin changes on purpose.
  - [ ] Picker test (real stores): headings in order with their level; typing filters; empty query lists all; Enter sets `editorStore.pendingScrollPosition` to `heading.pos` and closes; Escape closes without moving.
  - [ ] No active tab, or a non-markdown tab: no dialog and a toast. Works with `tableOfContentsVisible` false.
- **Gate:** `pnpm check` + `pnpm vitest run`.
- **Owner questions:**
  - 37.1 Label and category "Go to Heading" in Navigation, no shortcut? Recommended: yes.

### 38: Palette "Go to X" lands focus in the note list, and "New note here" becomes a command

- **Slug:** `palette-go-to-focuses-note-list-new-note-here`
- **IDs:** P37 (focus and command). 40 builds direct keys.
- **Size:** M. **Blocked by:** 21 (palette creator label rule), 28 (the list's current row and focus target).
- **Suggested status:** ready-for-agent.
- **What to build:**
  - Running a palette "Go to <list>" (Inbox, Favorites, a type, a view lens; not Search, not a view that opens in the editor) or "Open view: X" leaves keyboard focus on a note row (the active note's row when mounted, else 28's current row), so arrows work at once. A rail mouse click does not move focus (owner question 38.1). "Search in Vault" still focuses the search input.
  - "New note here" in the palette creates a note in the shown list, the same path as the list's "+" (`handleNewHere`, `RailNoteList.svelte:592-606`). It is listed only while the note list is mounted and can create (not on Search, not while the panels are hidden, `AppShell.svelte:207-247`).
  - Code: new `features/rail-shell/rail-list-requests.store.svelte.ts` (focus request counter with a handled marker, `canCreate`, a new-here request), the request seam of `search.store.svelte.ts:24-77` / `SearchPanel.svelte:24-34`. `RailNoteList.svelte` publishes `canCreate` while mounted, clears it on destroy, and honours a request pending at mount once. `commands.ts` bumps the request from `railGoToCommands` and the `openRailView` path (`rail-navigation.ts:32-38`). The palette must not restore focus over a command that moved it: bits-ui's `FocusScope.unmount()` refocuses the pre-dialog element after the exit animation (`focus-scope.svelte.js:56-62, 93-112`); add `onCloseAutoFocus` with `preventDefault()` when the command moved focus, forwarded through `components/ui/command/command-dialog.svelte` to `Dialog.Content` (precedents `EventDialog.svelte:192`, `TasksView.svelte:896`).
  - Docs: `06-search-and-navigation.md`, `20-keyboard-shortcuts.md` (Commands Without Shortcuts), an ADR-0033 palette amendment sentence.
- **Acceptance:**
  - [ ] Failing test first, `commands.test.ts` (real stores): "Go to Inbox" and "Open view: X" (not opening in the editor) bump the request; "Search in Vault", "Go to Search" and an `_open_in_editor` view do not.
  - [ ] Failing test first, `RailNoteList` mount test: after a request `document.activeElement` is a `[data-note-row]` (active note's row when mounted, else the current row); a request made while unmounted is honoured once at mount and not replayed on remount; an empty list focuses nothing and does not throw.
  - [ ] Failing test first: with the list mounted on Inbox the palette lists "New note here"; running it creates the note through the real `createNoteHere` (Tauri `fs` mocked) and the new tab is active; on Search, on a view whose toolbar is not ready, and with the panels hidden, the command is absent. Count pin on purpose.
  - [ ] E2E: open the palette from the editor, run "Go to Inbox", the focused element is a note row (fails without `onCloseAutoFocus`); "Search in Vault" focuses the search input.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for the new case.
- **Owner questions:**
  - 38.1 Should a rail click also move focus into the list? Recommended: palette only.

### 39: Tasks, Graph and Tags get rail entries that open their tab (needs-triage)

- **Slug:** `rail-entries-tasks-graph-tags`
- **IDs:** part of P36 (counted in 07).
- **Size:** M. **Blocked by:** 07 (rail and help wording, ADR-0033). Also owner questions 39.1 and 39.2.
- **Suggested status:** needs-triage (an ADR-0033 amendment; the owner may skip it).
- **What to build:**
  - A rail section titled "Tabs" (not "Views", which the Types navigator and the palette already use for `.view` files) after Browse, with Tasks, Graph and Tags. A click opens or focuses the tab (never closes it) and leaves the selected rail item alone. The entries are hideable and reorderable in Settings > Layout. No Go to commands for them (their Toggle commands exist).
  - Code: a `tabs` group and keys in `rail-items.logic.ts`; `Rail.svelte` (lucide icons, `aria-current` while the tab is active); `LayoutSection.svelte` `GROUPS`; `app/rail-navigation.ts` calls `openTasksTab` / `openGraphTab` / `openTagsTab` (Graph is a plugin, so the opener and icon stay outside `rail-shell`, `rail-shell.boundary.test.ts`); `commands.ts` filters tab items out of Go to.
  - Docs: an ADR-0033 amendment naming the re-evaluation trigger it meets ("a new top-level area needs a rail slot that does not fit the lens model", `:221-222`); help `01-getting-started.md`, `07-sidebar-panels.md:98-100`, `19-settings.md`.
- **Acceptance:**
  - [ ] Failing test first, `rail-items.logic.test.ts`: the tab items form their own group after the navigators, honour `railHidden` and `railOrder`, and `moveRailItem` keeps them in the group.
  - [ ] Failing test first, `rail-navigation.test.ts` (real `editorStore`, `settingsStore`): selecting Tasks makes the Tasks tab active; a second select keeps it open; `layout.railItem` and `railPanelsVisible` are unchanged.
  - [ ] `Rail.test.ts`: the three rows render in every rail form; Tasks is `aria-current` only while its tab is active. `LayoutSection.test.ts`: the group with show/hide and move.
  - [ ] `commands.test.ts`: no "Go to Tasks", "Go to Graph", "Go to Tags"; count literals on purpose. `rail-shell.boundary.test.ts` and `e2e/specs/rail-shell.spec.ts:328-346` pass.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for `rail-shell.spec.ts`.
- **Owner questions:**
  - 39.1 On by default and hideable (no new setting), off by default (needs a setting), or skip this ticket? Recommended: on, hideable.
  - 39.2 A Tags shortcut? Recommended: no.

### 40: Direct keys for rail items (needs-info)

- **Slug:** `rail-item-direct-keys`
- **IDs:** part of P37 (counted in 38).
- **Size:** M. **Blocked by:** 39 (the item list the digits index). Also owner questions 40.1 and 40.2.
- **Suggested status:** needs-info.
- **What to build:** the chosen chord plus 1 to 9 selects the Nth visible rail item (hidden ones skipped, `railOrder` respected, pins and tab entries counted per 40.2). Hints on the first nine rows in the labeled and captioned rail forms. Bindings by `code: 'DigitN'` in `global-keybindings.ts`; `CODE_DISPLAY_MAP` digits in `utils/keybindings.ts` (today a `Digit1` code prints "Digit1"); a pure index helper in `rail-items.logic.ts`; `Rail.svelte`; `app/rail-navigation.ts`. ADR-0033 amendment; help `20-keyboard-shortcuts.md`, `01-getting-started.md`.
- **Acceptance:**
  - [ ] Failing test first, `rail-items.logic.test.ts`: the helper maps the visible rail order to digits 1..9, nothing past nine.
  - [ ] Failing test first, `global-keybindings.test.ts`: chord plus N selects the Nth visible item through the real `settingsStore`; Cmd+1 and Cmd+2 still hide and show the panels; `formatShortcut` prints the digit.
  - [ ] `Rail.test.ts`: hints in labeled and captioned forms, none collapsed. Not testable: collisions with macOS Mission Control or Parallels.
- **Gate:** `pnpm check` + `pnpm vitest run`.
- **Owner questions:**
  - 40.1 Cmd+Opt+1..9, Ctrl+1..9 (can be macOS "Switch to Desktop N") or none? Recommended: Cmd+Opt+1..9 if wanted; none is fine.
  - 40.2 Do pins and tab entries take digits? Recommended: yes, in visible rail order.

### 41: Note-list rows open in the active tab and record a per-tab history (owner decision)

- **Slug:** `note-list-rows-replace-active-tab-history`
- **IDs:** P35 (Replace and history). 42 builds Back/Forward, 43 links.
- **Size:** L. **Blocked by:** owner decision 41.1 (and 41.3).
- **Suggested status:** needs-info until 41.1 is answered.
- **What to build:**
  - A plain click on a note-list row opens the note in the active tab when that tab is an unpinned markdown note and the target is a `.md` note; the tab remembers where it was. Cmd/Ctrl+click (the open-link modifier, `isOpenLinkModifier(e, IS_MAC)`, Ctrl on Linux CI), a middle click and "Open in new tab" add a tab as today. A target already open elsewhere is focused; the active note itself is a no-op. Every other case (pinned, virtual, canvas, kanban or view active tab or target) opens a new tab, because canvas and collection flush edits into the tab of their path on destroy (`EditorView.svelte:83-91`).
  - Leaving a note runs what closing its tab runs (flush pending edits, save with the second-save loop, `editor.service.ts:369-382`); if the save fails, the target opens in a new tab and the old tab keeps its edits (no prompt).
  - Code: pure `core/editor/tab-history.logic.ts` (`push` with cap 50 clearing forward, `back`, `forward`, prefix-aware `rewritePath` and `prunePath`); `EditorTab.history?: { back: string[]; forward: string[] }` and a store method that swaps a tab's path, name, content, savedContent and history in place (and clears `sourceMode`, 31); one loader extracted from `openFileInEditor` (binary gate, `readTextFile`, `fileType`, `:158-191`) used by both paths, so open-itens 094's decode guard covers navigation; `core/editor/tab-history.service.ts` `navigateInActiveTab(path)` with the re-check after the read and an exported `notifyTabClosed` (queryjs invalidation). `updateTabAfterRenameOrMove` rewrites and `closeTabsForDeletedPath` prunes every tab's history, folder-prefix aware. `NoteRow.svelte:71` click rules. `e2e/fixtures/helpers.ts` `openFile` clicks with `modifiers: ['ControlOrMeta']` so the 29 multi-`openFile` specs keep their tab counts. Tests that mock `editor.service` with a closed factory (`RailNoteList.test.ts:45`) mock the new service too.
  - Help `03-editor.md` Tabs, `02-file-explorer.md:59`.
- **Acceptance:**
  - [ ] Failing test first, `tab-history.logic.test.ts`: push clears forward and caps at 50; back then forward round-trips; `rewritePath` handles a file and a folder; `prunePath` drops a file and everything under a deleted folder.
  - [ ] Failing test first, `tab-history.service.test.ts` (real `editorStore`; mock only `@tauri-apps/plugin-fs`, `plugin-dialog`, `svelte-sonner`): with unpinned markdown A active, `navigateInActiveTab(B)` leaves one tab with B's path, name and content and history `back: [A]`, `forward: []`.
  - [ ] Failing test first: a pinned A, a virtual active tab, a `.canvas` target and a binary target each go through `openFileInEditor` with A unchanged; B open elsewhere is focused with no entry; navigating to A changes nothing; a dirty A whose save fails opens B in a new tab and A keeps its content.
  - [ ] Failing test first: renaming A's folder rewrites A in another tab's history; deleting it prunes it.
  - [ ] Row click: plain navigates, modifier and middle click call `openFileInEditor` (`RailNoteList.test.ts:338,881` change on purpose).
  - [ ] E2E: a new spec opens A then B by plain row clicks and sees one tab titled B; the existing multi-`openFile` specs stay green unchanged.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for `tabs.spec.ts`, `tab-pinning.spec.ts` and the new spec.
- **If the owner rejects Replace:** 41, 42 and 43 collapse into one S ticket that renames "Open in new tab" to "Open" (`NoteRowMenu.svelte:226`, `NoteRowMenu.test.ts:77,314,325,359`), and Back/Forward is dropped.
- **Owner questions:**
  - 41.1 Replace or not? A plain click replaces the active unpinned markdown tab; Back undoes it. Recommended: Replace.
  - 41.2 Surfaces in the first pass: note-list rows (41) and editor wikilinks plus Backlinks, Relationships and Outgoing rows (43); unchanged: quick switcher, search results, Properties link values, canvas nodes, Tasks, Calendar, deep links, mods, meta-bind `open`, dangling-link create. Recommended: yes.
  - 41.3 Replace only markdown to markdown? Recommended: yes.

### 42: Back and Forward: keys, palette, action bar, mouse buttons

- **Slug:** `back-forward-keys-bar-mouse`
- **IDs:** part of P35 (counted in 41).
- **Size:** M. **Blocked by:** 41 (`tab-history.service.ts`).
- **Suggested status:** blocked until 41 lands.
- **What to build:**
  - Cmd+Opt+Left and Cmd+Opt+Right (free in CodeMirror and `GLOBAL_KEYBINDINGS`; Cmd+[ and Cmd+] are CodeMirror indent), palette "Go Back" / "Go Forward" (Editor group, with the shortcut), and Back/Forward buttons at the start of the note action bar (disabled when that side of the tab's history is empty; `title` and `aria-label` with the shortcut, shown as `⌘⌥←`). An entry whose file is gone is dropped with one toast and the next is tried. Returning restores the note's scroll and cursor.
  - Mouse buttons 4 and 5 through a document `mouseup` listener beside `registerGlobalKeybindings`, kept only if the manual check passes.
  - Code: `goBack()` / `goForward()` in `tab-history.service.ts` through 41's leave, save and load steps; `MarkdownEditor.svelte:476-478` keeps scroll and cursor for a leaving path still in a tab's history (no `EditorState` for history-only paths); `closeTab` and truncation drop view state of the entries they remove (`tab-view-state.ts`); `formatShortcut` maps arrow codes to glyphs (`utils/keybindings.ts:27-32`).
  - Help `03-editor.md` Tabs, `20-keyboard-shortcuts.md:28`.
- **Acceptance:**
  - [ ] Failing test first, `keybindings.test.ts`: `formatShortcut({ meta: true, alt: true, code: 'ArrowLeft' })` is `⌘⌥←`.
  - [ ] Failing test first, `tab-history.service.test.ts`: after A -> B, `goBack()` shows A with `forward: [B]`, `goForward()` returns to B; empty history changes nothing; a navigation after Back clears forward; Back onto a deleted A drops it and toasts once.
  - [ ] Failing test first (real `tab-view-state`): after A -> B -> Back, `getTabViewState(A)` holds A's cursor; after closing the tab no view state remains for its history entries.
  - [ ] `global-keybindings.test.ts`: `shortcutFor('editor:go-back')` and `'editor:go-forward'` resolve; Cmd+[ is not bound globally; the fixed count changes on purpose. `commands.test.ts`: the two commands show the shortcut label (count pin on purpose).
  - [ ] `NoteActionBar.test.ts` (real stores): Back disabled with no history, enabled after a navigation, clicking it shows the previous note.
  - [ ] Mouse buttons: a unit test of the mapping; a manual check in `pnpm tauri dev` recorded in the ticket.
  - [ ] E2E: navigate by row, then Cmd+Opt+Left returns and the tab count stays 1.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for the new case.
- **Owner questions:**
  - 42.1 If WKWebView does not deliver mouse buttons 4/5, ship without them? Recommended: yes.

### 43: Links follow in the active tab; the open-link modifier opens a new tab

- **Slug:** `links-follow-in-active-tab`
- **IDs:** part of P35 (counted in 41).
- **Size:** M. **Blocked by:** 41 (`navigateInActiveTab`), 05, 11, 22 (the row `onclick`s it changes).
- **Suggested status:** blocked until 41 lands.
- **What to build:**
  - A plain click on a wikilink in the editor, or on a Backlinks, Relationships or Outgoing links row, opens the target in the active tab (41's rule); with the open-link modifier, or a middle click on a row, it opens a new tab. A link to the open note (a heading link, or a link to itself) only scrolls and adds no history. Following a revealed `[[...]]` on the cursor line with the modifier still works (it now opens a new tab, as today). Meta-bind `open` actions, `openWikilinkTarget` (Tasks, Kanban, Canvas) and dangling-link create keep add-or-focus.
  - Code: `EditorHost.openLink(path, anchor?, options?: { newTab?: boolean })` in `core/markdown-editor/editor-host.ts:54` (and the no-op host `:92`); `app/editor-host.ts:143-146` routes `newTab` to `openFileInEditor`, else `navigateInActiveTab`, then `scrollToAnchor`. `followWikilink`, `followWikilinkInfo`, `followWikilinkClick` take `newTab`; the three mousedown sites pass `isOpenLinkModifier(e, IS_MAC)`: `MarkdownEditor.svelte:273-289`, `widgets.ts:341-349`, `widgets.ts:675-681` (keep `stopPropagation`, live-preview rule 11). `LinkItem.svelte:10`, `BacklinksPanel.svelte:93`, `OutgoingLinksPanel.svelte` row clicks.
  - Help `03-editor.md:109-116`, `05-wikilinks.md:48`.
- **Acceptance:**
  - [ ] Failing test first, `wikilink-navigation` tests (stub host): a plain follow calls `openLink(path, anchor, { newTab: false })`, a modifier follow `{ newTab: true }`; a same-note `[[#H]]` only moves the cursor.
  - [ ] Failing test first, `app/editor-host` test (real `editorStore`, Tauri mocked): `openLink(B)` from markdown A swaps the tab to B with `back: [A]`; `openLink(A, anchor)` while A is active pushes nothing.
  - [ ] `wikilink-click-target` tests unchanged; the click handler passes the modifier.
  - [ ] `LinkItem.test.ts`, `BacklinksPanel.test.ts`, `OutgoingLinksPanel.test.ts`: plain click navigates, modifier click opens a new tab (history service mocked, stores real).
  - [ ] E2E `wikilink-navigation.spec.ts:16-27` rewritten for Replace (tab count stays at baseline); a new case Ctrl/Cmd-clicks (`ControlOrMeta`) a link and sees baseline + 1.
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh e2e/specs/wikilink-navigation.spec.ts`. Read `docs/agents/live-preview-rules.md` before editing `widgets.ts`.
- **Owner questions:** none beyond 41.1 and 41.2.

### 44: Markdown tab labels drop the .md extension (optional)

- **Slug:** `markdown-tab-labels-drop-md`
- **IDs:** none (open-itens 153 criterion 1).
- **Size:** S. **Blocked by:** 29 (the label span).
- **Suggested status:** needs-info (owner question 44.1).
- **What to build:** a markdown note tab reads `Roadmap`, not `Roadmap.md`: the label span renders `isMarkdownNoteTab(tab) ? stem(tab.path) : tab.name` (`utils/path.ts:79`, the same rule as 20's breadcrumb). `tab.name` does not change (`MarkdownEditor.svelte:413,502,528` pick the language from it); the close button's `aria-label`, 29's `aria-label` and the tooltip keep the full name.
- **Acceptance:**
  - [ ] Failing test first, `EditorTabs.test.ts`: `Roadmap.md` renders `Roadmap`, `Map.canvas` renders `Map.canvas`, `notes.txt` renders `notes.txt`, the close button is still "Close Roadmap.md"; `editorStore.tabs[i].name` still ends in `.md`.
  - [ ] Every E2E assertion on rendered tab text is updated (27 or more sites, including the `activeTab(page)` and `[aria-selected="true"]` forms in `e2e/specs/live-preview/click-reveal/`; find them with `grep -rnE 'role="tab"[^)]*\.md|editor-tabs-bar[^)]*\.md' e2e` and `grep -rnE "(toContainText|toHaveText)\(['\"][^'\"]*\.md" e2e/specs`).
- **Gate:** `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for every touched spec.
- **Owner questions:**
  - 44.1 Hide `.md` in tab labels (not in P34; edits 27+ E2E sites)? Recommended: yes. If no, close 153's label part as wontfix.

### 45: One `pane-band` utility for the ten top-band copies (land last)

- **Slug:** `pane-band-utility`
- **IDs:** part of P18 (counted in 31).
- **Size:** S. **Blocked by:** 09, 13, 18, 21, 31 (the band class lines it rewrites).
- **Suggested status:** ready-for-agent once its blockers land.
- **What to build:** `@utility pane-band` in `app.css` = `h-10 shrink-0 bg-tab-bar` plus the inset divider shadow. Each of the ten sites keeps only what is not height, background or divider: `EditorTabs.svelte:46` (09's wrapper, and its `<style>` `:118-122`), `AppShell.svelte:256,276`, `EditorView.svelte:154`, `CalendarNavigator.svelte:88`, `SearchPanel.svelte:157`, `FilesNavigator.svelte:305`, `RailNoteList.svelte:699`, `TypesNavigator.svelte:217`, `Rail.svelte:270`. No visible change.
- **Acceptance:**
  - [ ] Failing test first, new `pane-band.test.ts` (source scan modelled on `pane-toolbar.test.ts`): the utility applies `h-10`, `shrink-0`, `bg-tab-bar` and the divider shadow; no class list in `src/lib` outside `components/ui` combines `h-10` with `bg-tab-bar`; no inline `box-shadow: inset 0 -1px 0 var(--divider)` remains; each site uses `pane-band` with no height, background or border override.
  - [ ] The four assertions that pin the old classes (`EditorView.test.ts:381-382`, `Rail.test.ts:187,190`, `SearchPanel.test.ts:105`) move on purpose to `pane-band`; the commit says they move with the recipe.
  - [ ] `RailNoteList.test.ts` contrast cases (`:253`, `:1160`) and `AppShell.test.ts` stay green.
- **Gate:** `pnpm check` + `pnpm vitest run`. Not covered by tests: a by-eye check in light and dark themes (say so in the commit).
- **Owner questions:** none.

## Replaced open-itens Issues

Mark each fully replaced Issue wontfix with a pointer to its replacement. For a partial replacement, edit the Issue to drop the replaced part and keep it open.

| Old Issue | Status / ledger | Replaced by | Whole or part |
|-----------|-----------------|-------------|---------------|
| 014 Backlinks and Outgoing links always show the open note | ready-for-agent, `todo` | 11 | Whole: all six criteria carried. |
| 046 Outgoing links marks a row broken only when its target is missing | ready-for-agent, `todo` | 22 | Whole; its "attachment row opens the file" criterion is revised (binary rows are drawn resolved and are not buttons). |
| 156 relationship picker navigates with arrow keys | ready-for-agent, `todo` | 15 | Whole; its "rebuild on shadcn Command" and its `pnpm build` gate do not carry over. |
| 210 NoteInfo and Relationships heading follow the sidebar section recipe | needs-info, `todo` | 10 (item 3), 14 (item 1), 15 (item 2) | Whole once all three land; item 2's owner decision is settled by the prototype (heading only when links exist). |
| 153 tab strip shows overflow and hides the .md extension | ready-for-agent, `todo` | 09 (fade and tab list, criteria 2 and 3), 44 (tab label `.md`, criterion 1), 20 (breadcrumb `.md`) | Whole if 44 is accepted; if not, wontfix with a link to 09 and a note that the label part was declined. |
| 204 EmptyState, InlineAlert and Badge primitives exist | ready-for-agent, `todo` | 12 | Part: the EmptyState half. Badge goes to review P93 and InlineAlert to the feedback-components group (nearest P16). Keep 204 open for those or move them. |
| 209 search results and link rows reserve a gutter | ready-for-agent, `todo` | 05 | Part: the `LinkItem` half. The `SearchResult.svelte:175-178` and `LayoutSection` chevron halves stay in 209. |
| 140 `.view` tab keyboard and labels | ready-for-agent, `todo`, blocked by 139 | 17 | Part: bullet 1 (the four toolbar names). Its table-row keyboard (`CollectionTableView.svelte:44-58`) and collection calendar halves have no owner in this batch; do not wontfix 140 whole. 31 moves the buttons as 17 leaves them and does not claim the bullet. |
| 207 chrome icon buttons share sizes and use shadcn tooltips | ready-for-agent, `todo` | 18 | Part: the note-list header buttons clause. The rail, tab band, note action bar, button sizes and `text-heading` parts stay. |

## Open-itens Issues that stay open (dependencies, not replacements)

| Issue | Relation |
|-------|----------|
| 023 File History Restore writes into the active tab (P1) | 19 and 30 open History only after activating the note, so they add no exposure. Still open, and 101 depends on it; 36 must keep its premise (no Cmd+W menu item). Flag to the owner since the folder is abandoned. |
| 027 an unparseable canvas is never overwritten (data loss) | Same `CanvasInner.svelte` as 32, which keeps the header outside any error branch. Review P07, not in this batch. No live owner: flag to the owner. |
| 094 non-UTF-8 files open read-only | 41 extracts the shared loader so its guard covers navigation; whichever lands second rebases. |
| 148 open hook in `openFileInEditor` | 41's new open path must report the same way. |
| 005, 022 empty frontmatter block stacking | 16's known gap. |
| 008 no-op commit arms the skip flag; 105 minor write races | Each properties ticket (02, 16, 24, 25) has a "no call when unchanged" criterion; 36 notes 105. |
| 083 vault outside the allowed folders | 36's entry points inherit it. |
| 090 Dock Quit exit flush | Same `lib.rs` file as 36, not the same functions; no dependency. |
| 205 sidebar panels and settings use the empty and error primitives | Not replaced: no ticket edits its sites, and it excludes "Not available". Owner call: wontfix with the abandoned folder, or hand it to the feedback-components group (P16, P172). 10's all-hidden text uses 12's `EmptyState` if it exists. |
| 071 toolbar writes drop YAML comments | Context for 17's Clear filters (owner question 17.1). |
| 013 draft filter rows, 139 inferred columns | 17 coordinates with them (count semantics, `hasHiddenColumns`). |
| 154 inline title for a new note | Same creator lines as 21 (`FilesNavigator.svelte:84`, the palette new-file command) and the note branch of `EditorView.svelte` (13 edits only the empty branch). Sequence only. |
| 196 canvas theme tokens | Its `CanvasToolbar.svelte:55` item disappears with 32; the rest stays. |
| 010, 132, 134, 136, 137, 142, 146, 024, 025, 012, 199, 200, 066, 101 | Same files, other changes (rebase only): 010 (view unknown methods, 12), 132/136/137 (`RailNoteList` header and tests, 18), 134 (reuses `RailPropertiesPicker`, 18 keeps its props), 142 ("New here" type, 38 inherits), 146 (binding handlers, 42), 024/025 (`app/editor-host.ts`, 43), 012 (`.view` tab strip, pattern only for 30), 199/200 (Settings focus and scrim, inherited by 01 and 10), 066 (status bar left group, 06), 101 (board-view restore may read 31's flag later). |

## Overlaps with live folders

| Folder | Relation |
|--------|----------|
| `claude-code-integration` 03 (code on `mvp-claude`, PR #247) | Dependency at merge time only, never on main: the `LayoutSettings` key list (10, 11), the all-hidden helper (10 counts four flags on main; `claudeVisible` is added on that branch), the `AppShell.test.ts` sections test, the `commands.ts` list. 13 hides the right sidebar, and with it the Claude chat, when no tab is open (owner question 13.1). |
| `finders-ux` (all resolved) | 05 reuses 03's `markdownToPlainText`; 15 follows 07's "Recent notes" shape for the picker; 07 rewrites 06's `commands.ts:253-254` comment, and P36's palette half is already 06's; 21 keeps 02's "vault root, no other rule" for palette creators; 37 and 38 build on 01's command primitives (`command-dialog.svelte` gains `onCloseAutoFocus` forwarding in 38). |
| `tasks-view-ux` | 27 must leave `tasks-keys.logic.ts` behaviour and tests (113, 241, 255, resolved) unchanged. 240's "sticky in this ScrollArea is unverified" note is verified by the rs-properties-layout verdict (point 5), not edited there. |
| `vault-organization-v2`, `frontmatter-rules`, `preview-channel`, `mods-host-robustness` | No overlap. 08 uses vault-organization-v2 02's resolved `buildMyPeople`. Mods: 06's 24 px bar can clip a taller mod status chip (noted in `mods/08-custom-ui.md`). |

## Consolidated owner questions

Each has a recommended default; a ticket ships with its default unless the owner answers otherwise. Questions that block a ticket from starting are marked **blocking**.

1. **41.1 (blocking for 41, 42, 43):** Replace: a plain click on a note row or link replaces the active unpinned markdown tab, Cmd/Ctrl+click and middle click add a tab, Back undoes. Recommended: Replace. If no, 41 to 43 collapse into one S rename of "Open in new tab" to "Open".
2. **41.2:** first-pass surfaces are note-list rows, editor wikilinks and the Backlinks, Relationships and Outgoing rows. Recommended: yes.
3. **41.3:** Replace only markdown to markdown. Recommended: yes.
4. **42.1:** ship without mouse buttons 4/5 if WKWebView does not deliver them. Recommended: yes.
5. **39.1 (blocking for 39, 40):** Tasks, Graph and Tags rail entries on by default and hideable, off, or skip 39. Recommended: on, hideable.
6. **39.2:** a Tags shortcut. Recommended: no.
7. **40.1 (blocking for 40):** direct rail keys Cmd+Opt+1..9, Ctrl+1..9 or none. Recommended: Cmd+Opt+1..9 if wanted.
8. **40.2:** pins and tab entries take digits. Recommended: yes.
9. **44.1 (blocking for 44):** hide `.md` in tab labels. Recommended: yes.
10. **34.1 to 34.3 (blocking for 34):** system folders are the configured System and templates folders, only the root level is reordered and a custom order turns it off, counts are the direct file count. Recommended: yes to all three.
11. **07.1:** the day navigator's name. Recommended: "Days".
12. **10.1 / 11.1:** Properties' collapsed state and Backlinks/Outgoing open state persisted in settings. Recommended: persisted, one mechanism. (With "in memory", 11 is no longer blocked by 10.)
13. **10.2:** all-hidden state text only. Recommended: yes.
14. **10.3:** "Configure types..." on Properties only. Recommended: yes.
15. **23.2:** TOC open state kept per note (today) or across tabs like 11. Recommended: align with 11; unanswered, 23 ships "keep".
16. **23.1:** remove the TOC chevrons. Recommended: remove.
17. **13.1:** Claude chat on `mvp-claude` hides with no tab open after 13. Recommended: ship on main; on merge, show the sidebar whenever the Claude panel is visible.
18. **13.2:** hide the right sidebar for `.txt` and `.json` tabs (with `isMarkdownFile`). Recommended: yes.
19. **13.3:** with no tab, Cmd+B and the toggle do nothing. Recommended: accept.
20. **01.1:** turning a panel on shows a hidden sidebar (except canvas, kanban, view tabs). Recommended: yes.
21. **01.2:** no Open Trash command while no vault is open. Recommended: yes.
22. **36.1:** Cmd+Shift+O for Open Vault, in both the keybindings and the File menu. Recommended: yes.
23. **36.2:** a native File > Open Recent. Recommended: no, ask again later.
24. **02.1:** duplicate property names compared exactly (`Status` and `status` differ). Recommended: exact.
25. **16.1 to 16.4:** typed add defaults `0` and today; Set type appends `_type`; blank `_type` shows "Set type"; no type definitions shows a disabled row only. Recommended: yes to all.
26. **24.1:** lossless type conversions only. Recommended: yes.
27. **25.1:** Enter/F2 edits a chip and an emptied chip is deleted. Recommended: yes.
28. **26.1, 26.2:** Remove out of the flow at every width; stack below 232 px. Recommended: yes.
29. **14.1, 14.2:** Info dates keep the year; Info gets the pinned band. Recommended: yes.
30. **15.1, 15.2:** picker recents are Quick Switcher picks; headings match the Quick Switcher. Recommended: yes.
31. **22.1, 22.2:** a broken outgoing row creates and opens the note; attachment rows are not interactive. Recommended: yes.
32. **05.1:** decide on a link-window snippet later. Recommended: yes.
33. **12.1 to 12.5:** Edit filters in the empty state; include archived-filter causes; `EmptyState` in `src/lib/components/` with an ADR-0003 and CLAUDE.md line; the hint copy; Today's compact empty group. Recommended: yes to all.
34. **17.1, 17.2:** Clear filters with no confirm, inside the panel only; Columns shows a dot. Recommended: yes.
35. **18.1, 18.2:** narrow CSS rule instead of the overflow menu; sort name and `+N` move into Display. Recommended: yes.
36. **21.1, 21.2:** palette creators keep the vault root; "New kanban board". Recommended: yes.
37. **19.1 to 19.4:** stable palette labels; Trash last with no separator; one Trash prompt with the file name; History activates the note first. Recommended: yes to all.
38. **30.1:** no Trash or History on canvas and kanban tab menus. Recommended: no (markdown only).
39. **29.1, 29.2:** native `title` tooltip; no keyboard reorder for now. Recommended: yes.
40. **09.1:** the List all tabs button always visible. Recommended: yes.
41. **31.1, 31.2:** source mode per tab; title with extension until 20's rule is shared. Recommended: yes.
42. **32.1:** keep xyflow `Controls` on the canvas. Recommended: yes.
43. **20.1 to 20.3:** untyped "Note" crumb opens Untyped; crumb order `Type › folders › name`; fold to two folders. Recommended: yes.
44. **33.1:** Reveal targets the Files lens. Recommended: yes.
45. **38.1:** only palette Go to moves focus, not a rail click. Recommended: palette only.
46. **27.1:** first Escape in Search clears the query. Recommended: yes.
47. **03.1:** Inbox check on the Inbox lens only, no toast. Recommended: yes.
48. **04.1:** non-markdown folder-lens rows keep the kind word. Recommended: yes.
49. **08.1, 08.2:** My people shows the setup button; "today" for a 1:1 held today. Recommended: yes.
50. **06.1:** no reserved save slot for virtual tabs. Recommended: no reserve.
51. **35.1:** zoom remembered per machine in `localStorage`. Recommended: yes.
52. **37.1:** "Go to Heading" in Navigation, no shortcut. Recommended: yes.

Also for the owner (not questions on a ticket): open-itens 023 (File History restore, P1) and 027 (canvas data loss) stay open with no live owner since `.scratch/open-itens` is abandoned; 205 needs a wontfix-or-move decision; 204's Badge and InlineAlert halves need a home in the feedback-components breakdown.

## Not checked

- Nothing was run. Every figure and line number comes from the cluster verdicts, which were read against HEAD `ab143a411`; no ticket's line pointers were re-opened for this combination beyond the open-itens Status lines and ledger rows.
- The merged tickets (10, 15, 17, 22) were sized by adding their parts; whether each fits one fresh agent context is a judgement, so 10, 12 and 15 carry a split point.
- The order between 26 (P121) and the other `PropertyField.svelte` tickets resolves a disagreement between two verdicts by choosing "layout last"; the layout verdict's case for "layout first" is that later tickets build inside the grid.
