# Coverage check of research/breakdown.md

Read-only critic pass at HEAD `ab143a411`. breakdown.md was not edited.

## Verdict

No blocking problems. Coverage, test-first criteria, edge ordering and citations hold. Eleven smaller problems follow, none changes what is built.

## What was checked and held

- **ID coverage.** All 35 ids (P43 P177 P121 P123 P45 P44 P122 P72 P46 P71 P74 P75 P115 P33 P38 P84 P39 P24 P29 P117 P119 P120 P34 P98 P35 P102 P18 P36 P37 P103 P104 P105 P97 P99 P176) appear exactly once in the "Proposals (counted)" column of the ticket table (checked with a script; no id twice, none missing, none extra). The ID coverage table agrees with the ticket table on every row. Dropped sub-parts all carry a reason under "Parts not built".
- **Sizes.** 11 S, 27 M, 7 L matches the table. 45 tickets listed, 01 to 45.
- **Test-first.** Every ticket has at least one "Failing test first" criterion in its Acceptance block. No criterion mocks a store or a `.logic.ts`: the mocks named are Tauri APIs, `svelte-sonner`, `lifecycle.service`, `vault.service`, `note-composer.service`, the history service and the virtua shim, all allowed. Tickets 03, 11, 13, 31 state "real stores" explicitly.
- **Cycle.** Every "Blocked by" edge goes from a lower to a higher ticket number, so the graph has no cycle. The Blocked-by column, the ASCII graph and the edge table agree on every edge (cross-checked 28 edges).
- **Edge reality.** The shared files or state named for 10->11 (`LayoutSettings` keys), 10->14 (`SidebarSection.svelte`), 11->22 (outgoing store path record), 02->16 (`propertyKeyRefusal`), 03->28 (`tabindex` on the Inbox check), 12->17 (`EmptyState`), 17->31 (four toolbar triggers), 27->28 (`roving-list.ts`), 20->33 (`lens-open.service.ts`) and 41->42,43 (`tab-history.service.ts`) are real new files or lines that the later ticket consumes.
- **open-itens.** 014, 046, 156, 210, 153, 204, 209, 140, 207 all have the Status line the breakdown reports (ready-for-agent, 210 needs-info) and `todo` in `ledger.md`. 206 is wontfix and is correctly not listed. vault-organization-v2 02 is resolved. `markdownToPlainText` exists at `src/lib/utils/markdown-plain-text.ts`.

## Citation spot-check (28 path:line citations, all correct)

`layout.logic.ts:24` (`hidesRightSidebar(null)` returns false today), `SaveStatus.svelte:16` (`animate-pulse`), `app.css:211-212` (`--status-bar-height: 2rem`), `RailNoteList.svelte:876-879` ("No notes here"), `EditorView.svelte:154,156` (file is `src/lib/app/EditorView.svelte`), `EditorTabs.svelte:88` (`max-w-40`), `settings.logic.ts:20-22` (`mergeLayout` copies saved values), `calendar-rail.service.ts:28`, `CalendarNavigator.svelte:92`, `one-on-one.logic.ts:239-241`, `MyPeopleSection.svelte:35-38`, `note-info.logic.ts:18` (`month: 'long'`), `NoteInfo.svelte:43-45`, `PropertyField.svelte:110` and `:168`, `TableOfContentsPanel.svelte:62`, `toc.service.ts:22-25`, `commands.ts:330-337`, `backlinks.service.ts:143`, `BacklinksPanel.svelte:61-62`, `kanban.service.ts:30` ("New Kanban Board"), `global-keybindings.ts:63-67` and `:197-202`, `commands.test.ts:151` (43), `global-keybindings.test.ts:142` (25), `LinkItem.svelte:34`, `NoteActionBar.svelte:128-132` and `:207-219`, `FilesNavigator.svelte:80-91`, `:437`, `:493`, `CollectionTableView.svelte:34-38`, `SearchPanel.svelte:41-44`, `editor.service.ts:437-439`, `PropertiesView.svelte:156`, `NoteRowMenu.svelte:203,209`, `entry.rs:383-386` (join with one space), `index.rs:157-158`, `list-search.logic.ts:36-58`, `AppShell.svelte:190-196,277`, `lib.rs` `build_menu` and `on_menu_event`. The ten band sites of ticket 45 are exactly the ten `h-10` + `bg-tab-bar` sites in `src/lib` (grep confirmed). Only imprecision: `entry.rs:376` is the `compute_snippet` signature, the 280-byte cap is `SNIPPET_MAX_LEN` at `entry.rs:24`.

## Problems found

### A. Same file, no edge, not in "Sequence with" (rebase risk, no ordering change needed)

1. **`layout.logic.ts` and `layout.service.ts`: 10, 13 and 01.** 10 adds `anyRightPanelVisible` to `layout.logic.ts`; 13 rewrites `hidesRightSidebar` and its tests there; 01 adds `setRightPanelVisible` to `layout.service.ts` while 13 edits that file's comments and `toggleRightSidebar` tests (`layout.service.ts:24-29`, `layout.service.test.ts:140-161`). Ticket 09 says "No `layout.logic.ts` change (13 owns that file)", which is wrong: 10 edits it too. Add both files to the Sequence-with block and fix the 09 wording.
2. **`EditorView.svelte` and `EditorView.test.ts`: 30 vs 31 and 32.** 30 fills the new `noteActions` snippet in `EditorView.svelte`; 31 and 32 remove the floating toggles and the local flags from the same file and rewrite the same test file. 31 and 32 are chained, 30 is not chained to either. The Sequence-with block lists `editor.store`, `editor.types`, `editor.logic` but not `EditorView.svelte`.
3. **`editor.service.ts`: 30, 31, 41.** 30 adds `closeOtherTabs` and `closeTabsToTheRight`, 31 reroutes `toggleSourceMode` (`:437-439`), 41 extracts the loader from `openFileInEditor` and touches the close path. Not listed.
4. **`NoteRowMenu.svelte` and `NoteRowMenu.test.ts`: 19 and 28.** 19 rewrites the menu entries and its order pin; 28 edits `NoteRowMenu.svelte:203` (the `tabindex: -1` wrapper) and `note-row-menu.context.ts`. 19 and 28 share blockers 03 and 12 but have no edge between them. Not listed.
5. **`lens.logic.ts`: 04, 19, 20, 34.** 04->19 and 04->34 are edges, but 20 (`withExpandedAncestors`) has none with 04, 19 or 34. Different functions, so a rebase only.
6. **`PropertyField.svelte` and `PropertyField.test.ts`: 24 and 25.** 24 changes the icon in the main row, 25 rewrites the chip block; both come after 02, neither before the other, and 26 (blocked by both) is the only ticket that names the order. Not in the Sequence-with block (only `PropertiesView.svelte` is).
7. **`TableOfContentsPanel.svelte` and its test: 10 and 23.** 10 passes `onHide` and moves the heading locators (`TableOfContentsPanel.test.ts:133-140`); 23 removes row chevrons, adds `aria-current` and rewrites the same test file. Not listed. Also 10 and 23 both touch `table-of-contents.spec.ts` selectors.
8. **`MarkdownEditor.svelte`: 42 and 43.** 42 edits `:476-478` (scroll and cursor of a leaving path) and 43 edits `:273-289` (mousedown sites). Both blocked by 41, no edge between them.
9. **`commands.ts` list.** The Sequence-with line names 01, 19, 33, 36, 37, 38, 39, 42 but leaves out 07 (comment `:253-254`) and 21 (label rewrite `:149-193`, plus `commands.test.ts` label pins). Also `routes/(app)/+layout.svelte`: 11 (comment `:91-104`), 35 (`restoreZoom` call) and 36 (menu listener mount); `AppOverlays.svelte`: 35 (ZoomChip) and 37 (picker); `app/rail-navigation.ts`: 38, 39, 40 (38 and 39 are not chained).
10. **Ticket 45 "land last" is not enforced for every site.** It is blocked by 09, 13, 18, 21, 31 only, but also rewrites band lines in `CalendarNavigator.svelte` (07 edits `:92`), `SearchPanel.svelte` (27, and `SearchPanel.test.ts:105` is a pin 45 moves), `Rail.svelte` (39, 40) and `TypesNavigator.svelte`. If 07, 27, 39 or 40 land after 45 they must rebase onto `pane-band`; either add them to 45's Blocked by or add them to Sequence-with.

### B. Edge consistency

11. **01 -> 36 is weaker than the stated edge rule.** The only shared thing named is the `commands.ts` count pin (`commands.test.ts:151`) and the `06-search-and-navigation.md` table. The same pin is touched by 19, 33, 37, 38, 39 and 42 and those are "Sequence with", not edges, per the Edge rule paragraph. 36 also needs a Rust change that has nothing to do with 01. Either demote it to Sequence-with (36 becomes free to start) or name a real shared symbol.

### C. Size and ambiguity

12. **Five L tickets have no split point while the three smaller L/M ones do.**
    - 17 bundles four independent changes (badges and names on two toolbars, Clear filters in `FilterPanel`, the nested-button fix on four triggers, the empty table with `EmptyState`) across about ten source files and ten test files. Suggested split, in order: 17a badges, names and nested-button fix; 17b Clear filters and the empty table.
    - 18 replaces three popovers with one Display popover (`RailDisplayMenu.svelte` new, three panels split into bodies), a dot, a narrow-header CSS rule and a folder title. Suggested split: 18a Display popover and dot; 18b narrow header and folder "+" title.
    - 22 combines a service change (tree resolution, `treeLinkIndex` move into core), a pure label helper, a panel rewrite with a new group and a click path through `followWikilink`. Suggested split: 22a resolution and label logic; 22b panel markup, group and click.
    - 28 combines roving keys over two `VList`s with `keepMounted`/`scrollToIndex`, rename focus, removal focus and the search hand-off.
    - 41 combines pure history logic, a store swap method, a loader extraction from `openFileInEditor`, rename and delete rewriting, the row click rules and an `e2e/fixtures/helpers.ts` change that touches 29 specs.
    Each may still fit one context, but 10, 12 and 15 carry a split point for less work.
13. **Ticket 44 is sized S but edits 27 or more E2E assertion sites** across many specs (its own text). That is M by effort even though the source change is one line.
14. **Ambiguous test path in 17.** `hasHiddenColumns` lives in `features/collection/toolbar/properties.logic.ts` (test `properties-logic.test.ts`), a different file from `core/frontmatter/properties.logic.ts` used by 02, 16 and 24 (test `properties.logic.test.ts`). Ticket 17 writes `properties.logic.ts` without the folder, so a builder can edit the wrong one. No conflict between the tickets, only the wording.
15. **Two proposal details are replaced, not carried.** P29 asks for "Clear filters" on a filtered-out list; the tickets ship "Edit filters" (owner question 12.1) and put Clear filters inside the panel (17). This is stated and has a default, so only flagged for the owner to see it is a deliberate change.

## Not checked

- The sub-claims of each verdict were not re-derived beyond the 28 citations and the symbol-existence greps (`isOpenLinkModifier`, `splitRecentFiles`, `filterAndRank`, `treeLinkIndex`, `toggleFavoriteForPath`, `getPinnedBoundary`, `ZOOM_LEVELS`, `applyStoredTheme`, `explainEmptyTasks`, `countActiveFilters` exist; `setOrganizedForPath`, `navigateInActiveTab`, `hasHiddenColumns` are new by design).
- File-overlap detection in part A used a path-name scan of each ticket's "What to build" text, so overlaps that only show in test files or in code the tickets do not name could be missed.
