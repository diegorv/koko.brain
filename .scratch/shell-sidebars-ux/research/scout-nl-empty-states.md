# Scout: Empty and loading states cluster (P29)

Checked against HEAD `ab143a411` (main). Raw leads: `research/raw/P29.md` (haiku). Every line number below was re-read at HEAD. The prototype is `prototypes/note-list-rail.html` section `<!-- P29 -->` (lines 413-424, CSS 215-226, data and `draw29` at 1017-1050). It only restyles the rail note list; every other site in the "about 25 variants" is a text claim in the review, not a drawn one.

## Code map (what runs today)

| File | Role |
|---|---|
| `src/lib/features/rail-shell/RailNoteList.svelte` (907 lines) | The note list. Status and empty branches at `:832-879` (see inventory). Reads `typeDefinitionsStore`, `fsStore`, `collectionStore`, `railRegistryStore`, `settingsStore`, `vaultStore`. Local state that decides the branch: `resolved` (`:177-188`), `searching` (`:495`), `fullTextLoading` (`:493`), `activeFilterCount` (`:174`, `countActiveFilters` over the view's global plus view filter rows), `filterOpen` (`:172`), `query` (`:490`) |
| `src/lib/features/rail-shell/lens.logic.ts` | `BUILT_IN_LENSES` (`:307-313`, only `label`, `rule`, `includes`, `newNote`; no hint), `resolveLens` (`:434-448`, returns null for a bare Types lens, a deleted folder, a missing neighbourhood note, an unknown provider kind), `resolveViewLens`, `viewEntriesLoaded` |
| `src/lib/features/rail-shell/rail-shell.types.ts` | `ResolvedLens.status` and `ViewLensStatus` = loading, missing, error (`:73`, `:79-85`) |
| `src/lib/features/rail-shell/RailListSearch.svelte` | The search row. Takes `value` and syncs its draft from it (`:31-38`), so the list setting `query = ''` clears the input |
| `src/lib/features/note-action-bar/NoteActionBar.svelte` | Star button `:146-153` (title "(Cmd+D)"), organized `:155-162` ("(Cmd+E)"), "Archive this note" in the More menu `:207-215`. The only place a user archives |
| `src/lib/features/note-list/NoteRowMenu.svelte` | Row menu: has Favorite (`:261-263`), no Archive and no Organized |
| `src/lib/app/global-keybindings.ts:189-201` | `note:toggle-favorite` = Cmd+D, `note:toggle-organized` = Cmd+E. `app/` is not importable from `features/` (`app-inbound` rule, `scripts/import-graph.mjs:201`); `formatShortcut` in `src/lib/utils/keybindings.ts:40` is |
| `src/lib/components/` | Only `ui/` (shadcn). No EmptyState anywhere (`grep EmptyState src` hits only `canvas/FileNode.svelte:85` `.empty-state` CSS and `SortPanel` `emptyText`) |
| `src/lib/features/tasks/task-query.logic.ts:1446` `explainEmptyTasks` | The in-repo model for this ticket: a pure `.logic.ts` function returns `{ message, hint?, action? }`, the component renders it. Tasks, Tags (`TagsView.svelte:125-136`), Search status (`SearchPanel.svelte:139-157`) and the Graph overlays already follow it (finders-ux 04, 09, 13; tasks-view-ux 108, 125) |

Who reads what matters little here: nothing outside `RailNoteList.svelte` consumes these branches. The shared-file risk is only the file itself.

## Inventory: the "about 25 variants"

Counted at HEAD by grep over `src/lib/**/*.svelte`. 36 sites. Disposition says who owns each.

| # | Site (path:line) | Text | Disposition |
|---|---|---|---|
| 1 | `RailNoteList.svelte:833-835` | "Nothing here" (empty group of Today) | T1, stays compact one-liner |
| 2 | `:843-847` | "Loading..." | T1 (spinner) |
| 3 | `:848-852` | "This view no longer exists" | T1 |
| 4 | `:853-870` | alert "This view cannot be shown" + message + Open view | T1 (add hint only) |
| 5 | `:872-875` | "No matching notes" | T1 |
| 6 | `:876-879` | "No notes here" for Inbox, Favorites, Archive, type, Untyped, folder, neighbourhood, a view with 0 rows, a filtered-out view, and a lens that resolved to null | T1 (one branch, many causes) |
| 7 | `TypesNavigator.svelte:274-275` | "No types yet" | not ticketed (see Q4) |
| 8 | `RailPropertiesPicker.svelte:172` | "No matching properties" | leave (popover list) |
| 9 | `plugins/one-on-one/MyPeopleSection.svelte:35-38` | "Add _one_on_one_every to a person in ..." | P120, nl-rows-sections |
| 10-11 | `search/SearchPanel.svelte:139-157` | Searching..., No results found, short query | done (finders-ux 04) |
| 12-15 | `tags/TagsView.svelte:125-136` | Indexing tags..., filtered-empty + Show all tags, No tags match, No tags found | done (finders-ux 09) |
| 16 | `properties/PropertiesView.svelte:158` | "No file open" | P97 (hidesRightSidebar(null)) |
| 17-20 | `PropertiesView.svelte:159-162`, `TableOfContentsPanel.svelte:46-47`, `OutgoingLinksPanel.svelte:53-54`, `BacklinksPanel.svelte:57-58` | "Not available" | T2 |
| 21-23 | `TableOfContentsPanel.svelte:49-50`, `OutgoingLinksPanel.svelte:55-56`, `BacklinksPanel.svelte:61-62` | "No headings found", "No outgoing links", "No backlinks found" | P72 owns Backlinks; others leave (Q4) |
| 24 | `BacklinksPanel.svelte:59-60` | "Indexing vault..." | P72 region, leave (loading copy) |
| 25 | `collection/CollectionTableView.svelte:35-38` | "No results match the current filters" (unconditional) | T3 |
| 26 | `collection/collection-block-widget.ts:160-165` | same text, CodeMirror DOM widget | leave (live-preview rules; the text is already correct) |
| 27 | `collection/CollectionView.svelte:706`, `:720` | "Configure a date property ..." | leave (a setup hint, not an empty state) |
| 28 | `plugins/kanban/KanbanListView.svelte:54-55` | "No cards" | kanban group (review P05 line 43, P02, P143) |
| 29 | `plugins/graph-view/GraphView.svelte:535-549` | 4 overlays | done (finders-ux 13) |
| 30 | `tasks/TasksView.svelte:1079-1118` | Indexing tasks..., explained empties | done (tasks-view-ux 108, 125) |
| 31 | `event-calendar/EventCalendarView.svelte:241` | "Indexing vault..." | leave (loading) |
| 32 | `canvas/CanvasInner.svelte:603-607`, `FileNode.svelte:85` | "+ Add card", "Empty file" | canvas group |
| 33 | `file-history/SnapshotList.svelte:21-28`, `DiffViewer.svelte:29-36` | Loading history..., No history available, Loading diff..., Select a snapshot... | P77 (other group) |
| 34 | settings: `TrashSection.svelte:80-86`, `AppearanceSection.svelte:259,301`, `AutoOrganizeSection.svelte:156-159`, `ModsStatusList.svelte:87-88`, `TodoistSyncLogDialog.svelte:30,47`, `UpdateSection.svelte:357` | various | settings group, leave |
| 35 | pickers: `CommandPalette:97`, `QuickSwitcher:200`, `TemplatePicker:107-109`, `OneOnOnePicker:90-92`, `ModActionPicker:168`, `ModDialogHost:194`, `EditorSection:66`, `RelationshipSearch:89`, `CanvasFilePicker:67`, `IconPicker:208-210` | "No X found" | leave (`Command.Empty` one-liners) |

Pattern: three sizes of padding (`py-8`, `py-4`, `py-12`, `p-8`), four muted tones (`file-explorer-muted-fg`, `right-sidebar-muted-fg`, `muted-foreground`, canvas local CSS), no icon anywhere except `TrashSection:82`. P29's value is concentrated in rows 1-6 and 25 (the ones that hide data with no cause). The rest is a styling sweep with no user-visible defect.

## P29 (empty and loading states)

**Still real: partial.**

Part by part:

1. **Rail list is bare: yes.** All of rows 2-6 render one muted sentence. Favorites, Archive and Inbox all show "No notes here" (`:876-879`); `lens.logic.ts:307-313` has no per-lens text.
2. **"Filtered-out list looks like data loss": yes, but only for a `.view`.** Filters exist only on a view lens (`localGlobalFilters`, `localViewFilters`, `:151-152`). A view whose query returns 0 rows lands in the generic `:876` branch with the Filter trigger tinted by colour only. `activeFilterCount` (`:174`) is available, so "N filters" is computable.
3. **Collection filters do not say a filter hid everything: wrong as stated.** `CollectionTableView.svelte:35-38` already says "No results match the current filters". The real defect is the opposite: it says it even when the view has no filters (an empty folder view), because the component never receives a filter count. That is T3.
4. **Kanban: not in this batch.** `KanbanView.svelte:181` filters cards by `filterQuery` and an all-hidden board shows empty lanes with counts of 0. Review P05 (line 43), P02 and P143 already own kanban empty lanes and the filter X.
5. **Properties explains unsupported files: mostly dead copy.** "Not available" exists in four panels (rows 17-20) but is unreachable for every non-markdown `fileType`: `hidesRightSidebar` (`core/layout/layout.logic.ts:23-28`) hides the whole sidebar for the Tasks, Tags, Graph and Event calendar virtual tabs and for `.canvas`, `.view` and `.kanban` files, which are all the `fileType`s `openFileInEditor` sets (`editor.service.ts:186-189`). The case that is live: a non-binary, non-`.md` text file (`.txt`, `.json`). It opens with `fileType` undefined (`editor.service.ts:150-190`, binaries are rejected at `:157`), so the four checks (`fileType && fileType !== 'markdown'`) are false and the full note panels render for it. `isMarkdownNoteTab` (`editor.logic.ts:28`) already encodes the right test. Not run in the app; from code only.
6. **Skeletons: no.** Review validation says none; the prototype uses a spinner. `animate-spin` is already the app's pattern (`TasksView.svelte:912`, `SearchPanel.svelte:263`).
7. **"About 25 variants": confirmed, 36 sites** (inventory above).

### Current behaviour of the rail branches (path:line)

- `RailNoteList.svelte:815-840` grouped branch (Today). Empty group item at `:833`. Built by `groupedItems` `:662-680`. While searching, every empty group prints "Nothing here".
- `:841-870` `resolved.status`: loading at `:843` (reachable when `entriesVersion === 0` for a lens that lists entries, `:184-186`, and for a view's first read `:177-181` and `loadView` `:240-243`), missing at `:848` (`!inTree`, `:245-249`), error at `:853` (read or parse failure). Sort, Filter, Search and Properties are hidden for all three (`listToolbarReady` `:549`).
- `:872` `notes.length === 0 && searching`: `searching = normalizeListQuery(query) !== ''`.
- `:876` `notes.length === 0`: also reached when `resolved` is null (`notes = shownResolved?.notes ?? []`, `:547`). The header then shows an empty label (`:705`). So an unresolvable lens (deleted folder, vanished neighbourhood note) says "No notes here" under a blank title.
- **Flash to verify in the ticket:** `filterResolvedLens` (`list-search.logic.ts:40-62`) uses full-text hits only when `fullText.text === query.trim()` (`:550`). Between a keystroke and the FTS answer, a content-only match is absent, so `notes.length === 0 && searching` can show "No matching notes" for a moment (`fullTextLoading` is true then, `:530-541`). Traced from code, not observed.

### What the prototype wants

Shared `EmptyState` (36 px primary-tint circle with an 18 px icon, 14 px/600 title, 12 px muted hint max 210 px, optional outlined 12 px button) restyling the same eight states, selector keys:

| State | After |
|---|---|
| favorites | star, "No favorites yet", "Star a note with Cmd+D or the star in the note toolbar." |
| archive | archive, "Nothing archived", "Archive a note from its row menu or the ... menu. Archived notes leave Inbox and Today." |
| inbox | circle-check, "Inbox zero", "Captured notes land here until you mark them organized with Cmd+E." |
| search | search, `No notes match "roadmp"`, "Search covers titles and content of this list.", action Clear search |
| filtered | filter, "No notes match 3 filters", "7 notes are hidden by filters.", action Clear filters |
| loading | spinner + "Loading notes", no skeleton |
| missing | alert, "This view no longer exists", "Its .view file was moved or deleted.", action Remove from sidebar |
| error | same alert plus hint "Fix the filter in the .view file." and the Open view button |

Copy is illustrative; none of it exists in `src`.

### Design points the ticket must settle

1. **Where the primitive lives and what it is.** `src/lib/components/ui/` is shadcn-generated (CLAUDE.md layer table), so `src/lib/components/EmptyState.svelte`. Layer `components` may be imported by any layer and may import none of core, features, plugins (`import-graph.mjs:208`). It is scanned by `chrome-type-scale.test.ts` (nothing under 11 px; `src/app.css:94-100` roles are 12/14/15 px) and `chrome-state-styles.test.ts`, which skip only `components/ui/`. Tone must come from a `class` prop, because the rail uses `text-file-explorer-muted-fg`, the right sidebar `text-right-sidebar-muted-fg`, settings `text-muted-foreground`. Props: optional icon component, `title`, optional `hint`, optional `action {label, onclick}`, `compact`, `spinner`, rest props for `data-*` hooks. Keep the compact variant rendering a `<p class="text-meta ...">` so the three right-sidebar tests that pin `p.text-meta` do not churn when those panels adopt it later.
2. **Logic in a pure file, not in the component.** New `list-empty.logic.ts` in `rail-shell/` (not in `lens.logic.ts`: 1000+ lines and P117 edits it). Input: lens kind, whether `resolved` is null, `searching`, trimmed query, `activeFilterCount`, view-or-not, `fullTextLoading`. Output: `{ icon, title, hint, action? }` with `action` a kind string (`clear-search`, `edit-filters`), as `explainEmptyTasks` does. No framework imports; may import `formatShortcut` from `utils` and lens kind constants from `lens.logic`.
3. **Per-lens hints.** Favorites and Inbox name the shortcuts through `formatShortcut({ meta: true, key: 'd' })` and `'e'` (the title attributes in `NoteActionBar.svelte:148,157` hardcode "Cmd+D", "Cmd+E"; bindings are fixed in `GLOBAL_KEYBINDINGS`, not user-configurable). Archive: the prototype says "its row menu", which is false at HEAD (`NoteRowMenu` has no Archive, `:261-263` is Favorite only). Write the hint against HEAD: the "..." menu of the open note's toolbar. P39 (nl-actions-keyboard) may add Archive to the row menu; then the hint changes in that ticket. Type, Untyped, folder, neighbourhood, a view with no filters, and the null lens each need their own short title and hint (proposals in T1).
4. **Filtered view action.** The prototype offers Clear filters. On a view the filter rows are the view's own definition and `handleGlobalFiltersChange` / `handleViewFiltersChange` write through to the `.view` file (`:350-358`, `persistViewState`). A one-click clear from an empty state would rewrite the user's file. Default: action "Edit filters", which sets `filterOpen = true` (`:172`, popover at `:754-775`). P84 (nl-header-creation) owns "Clear filters" and the count badge on the same trigger; coordinate, do not duplicate.
5. **"7 notes are hidden by filters" is not available.** It needs a second, unfiltered query of a view whose filters define it. Drop the line; show only "N filters".
6. **Missing view action.** "Remove from sidebar" has nothing to remove: a rail pin is `_rail: true` inside the `.view` file (`core/settings/rail-pin.logic.ts:1-7`), and the file is gone. Default: no action; hint names where to go ("Pick another list in Types").
7. **Search no-match.** Title shows the user's query: render it as text (never `{@html}`), clamp long queries with CSS. Action Clear search sets `query = ''` (RailListSearch re-syncs its draft from `value`, `RailListSearch.svelte:31-38`); keep the search row open. While `fullTextLoading` is true, do not show the no-match state (show the spinner state instead) so a content-only match does not flash as "no match".
8. **Loading.** Spinner plus "Loading notes". No skeleton rows. `data-note-list-loading` stays on the wrapper; the header count stays blank (`:707`).
9. **Error.** Keep `role="alert"`, `data-note-list-error-message` and the Open view button exactly (`:853-870`); add one hint line. The prototype's "Fix the filter" is wrong for a read failure; use "Fix the .view file and the list reloads." (the cache and `entriesVersion` effect re-run the load, `:204-218`).
10. **Hooks and tests.** Keep every `data-note-list-*` attribute (empty, no-matches, loading, missing, error, error-message, open-view, group-empty) on the wrapper of the new markup so the ~35 presence checks stay. Update the 17 text-pinned assertions on purpose (listed under Tests).
11. **Not in scope, flagged:** a type list whose notes are all archived says "No notes here" while `RailArchivedMenu` can show them. A cause-aware hint ("N archived notes. Show them") is cheap through `resolveLens(..., 'all')` but is a new behaviour; leave out unless the owner wants it.
12. **Today's group notice** (row 1) is a header-level one-liner; keep it compact and unchanged.

### Tests and seams

- `src/tests/lib/features/rail-shell/RailNoteList.test.ts` (1314 lines): real stores (`typeDefinitionsStore`, `fsStore`, `editorStore`), mocks only Tauri `invoke`, dialog, `svelte-sonner`, `fs.service`, `file-icons`, `type-definitions.service`, `lifecycle.service`, `log.service`. Text pins: `:381`, `:516`, `:872`, `:935` ("No notes here"), `:417` ("Loading..."); presence/count: `:419`, `:686`, `:834`, `:851` (group empty).
- `RailNoteList.view.test.ts` (933 lines): text pins `:589`, `:611`, `:702`, `:718`, `:746`, `:801`, `:860`, `:872`, `:880`; the view fixtures that seed filters are what T1's filtered case needs.
- `RailNoteList.toolbar.test.ts:317` ("No matching notes" after FTS failure); the popover is driven with `pointerdown` on `[data-note-list-filter]` (`:425`), reuse that for Edit filters.
- `RailNoteList.search.test.ts:326`, `:357`, `:365`; an FTS call can be held pending through `vi.mocked(invoke)` for the loading-flash case (pattern at `toolbar.test.ts:430-445`).
- `lens.logic.test.ts` exists; new `list-empty.logic.test.ts` beside it. New `src/tests/lib/components/EmptyState.test.ts` (dir exists, holds `ui/`).
- Architecture scans that will run over the new files: `chrome-type-scale.test.ts`, `chrome-state-styles.test.ts`, `palette-classes.test.ts`, `layer-rules.test.ts`, `lib-specifier-convention.test.ts`.
- E2E: `e2e/specs/rail-shell.spec.ts` asserts lens labels and rule lines only (`:182`, `:291`, `:318`, `:468`), no empty copy. No E2E needed; jsdom covers it.
- Never mock stores or `.logic.ts`. For T3 and T2 the same rule: seed real `editorStore`, `backlinksStore`, `propertiesStore`, `tocStore`.

## Candidate tickets

Gate for all three: frontend only (`pnpm check` + `pnpm vitest run`).

### T1. Rail note list states say the cause and a next step (P29, rail half). Size M

One fresh context fits: one new component, one new pure file, one edited branch region, tests in files that already exist. If the run struggles, the split line is "list states" (empty, no-match, loading, hints) versus "view statuses" (missing, error, filtered); both edit `:843-879`, so run them in sequence, not parallel.

- **Files:** new `src/lib/components/EmptyState.svelte`; new `src/lib/features/rail-shell/list-empty.logic.ts`; `RailNoteList.svelte` (`:833-879` only, plus `filterOpen`/`query` handlers wired to the actions); tests `src/tests/lib/components/EmptyState.test.ts`, `list-empty.logic.test.ts`, and the four `RailNoteList*.test.ts` files above.
- **Replaces:** open-itens 204 (EmptyState half).
- **Blockers:** none hard. Shared file `RailNoteList.svelte` with P33, P38, P84 (header `:714-820`, trigger `:752-777`, disjoint from `:832-879`), P24 (list body, may wrap the `VList`), P39 (row menu, hint copy for Archive). P117 edits `lens.logic.ts`; T1 does not. Land T1 before P84 if possible so P84 can add Clear filters next to a ready Edit filters.
- **Acceptance criteria (first item of each is the failing test):**
  1. `EmptyState.test.ts` red first: renders the title; renders the hint and the action button only when given; clicking the action calls its handler; `compact` renders a `<p class="text-meta">` with no icon circle; `spinner` renders the spinner and the label; the root accepts `data-*` attributes and a `class`.
  2. `list-empty.logic.test.ts` red first, real function, no mocks: Favorites returns "No favorites yet" and a hint containing `formatShortcut` of Cmd+D; Inbox "Inbox zero" with Cmd+E; Archive "Nothing archived" (hint names the note toolbar "..." menu); a view with 1 filter returns "No notes match 1 filter" (singular) and `edit-filters`; with 3 filters "3 filters"; a view with 0 filters returns "No notes in this view"; `searching` returns the quoted trimmed query and `clear-search` and wins over the lens text; a null `resolved` returns a title that is not "No notes here"; folder, type, Untyped and neighbourhood each return a distinct hint.
  3. `RailNoteList.test.ts`: the Favorites lens with no favorites renders the star title and hint inside `[data-note-list-empty]`; Archive and Inbox likewise; the Types lens with an unresolved target no longer says "No notes here".
  4. `RailNoteList.search.test.ts`: a no-match query shows `No notes match "<query>"` inside `[data-note-list-no-matches]`; clicking Clear search empties the input and restores the rows; with an FTS call held pending, `[data-note-list-no-matches]` is absent and the searching state shows, then the no-match state appears once the call resolves empty.
  5. `RailNoteList.view.test.ts`: a view with seeded filter rows and zero results shows "No notes match N filters" and Edit filters; activating it opens the Filter popover and writes nothing to the `.view` (assert no write call); loading shows the spinner and `Loading notes` and no `[data-note-list-empty]`; missing keeps its hook and gains the hint; error keeps `role="alert"`, the message and Open view, and gains the hint line.
  6. The 17 text assertions listed above are updated on purpose; every `data-note-list-*` hook still exists; `pnpm vitest run src/tests/lib` architecture and chrome scans pass with the new component.

### T2. Right-sidebar panels explain a tab that is not a note (P29, Properties half). Size S, tail ticket

Real only for non-binary, non-`.md` text files today (see P29 point 5). Lowest value of the three; do last or fold into whichever rs-* ticket already edits each panel.

- **Files:** `PropertiesView.svelte:159-162`, `TableOfContentsPanel.svelte:42,46-47`, `OutgoingLinksPanel.svelte:53-54`, `BacklinksPanel.svelte:57-58`; tests `PropertiesView.test.ts`, `TableOfContentsPanel.test.ts`, `OutgoingLinksPanel.test.ts`, `BacklinksPanel.test.ts` (none pins "Not available" today). Uses `isMarkdownNoteTab` from `core/editor/editor.logic.ts:28`.
- **Blockers (shared files):** rs-properties-layout (P43, P177, P121, P123), rs-properties-editing (P45, P44, P122), rs-relationships (P72, same `{#if}` chain in Backlinks), rs-links-toc (P71, P74, P75, P115), sh-empty-zoom-status (P97 deletes the `PropertiesView.svelte:158` branch's reachability). Depends on T1 for the compact `EmptyState`, though P72's scout keeps a plain `<p class="text-meta">`; either works, state which in the PR.
- **Acceptance criteria:**
  1. Failing test per panel: with an active tab `/vault/readme.txt` (no `fileType`) the panel shows a one-line "Only notes have <properties | headings | links | backlinks>" message and none of the note UI; red first because today the full panel renders.
  2. With a `.md` tab all four panels are unchanged.
  3. The four checks use `isMarkdownNoteTab`, not the repeated `fileType && fileType !== 'markdown'` expression.
  4. No `NoteInfo` change; it already tests `!tab.fileType || === 'markdown'` (`NoteInfo.svelte:15`) and is out of this batch.

### T3. Collection table says whether a filter hid the rows (P29, Collection half). Size S

- **Files:** `collection/CollectionTableView.svelte:34-38` (new `filterCount` and `onEditFilters` props), `CollectionView.svelte:726-731` (pass `activeFilterCount`, `:222`, and open `filterOpen`, `:111`); tests `CollectionTableView.svelte.test.ts` (exists, builds `QueryResult` fixtures), `CollectionView.test.ts`.
- **Replaces:** the collection half of wontfix 206 (its own comment says it returns with the collection-queryjs group).
- **Blockers:** P84 edits `CollectionView.svelte:221-225, 620-665` (badges, Clear filters on the same Filter trigger); collection-queryjs group (not in this batch) edits the same file. Depends on T1 for `EmptyState`.
- **Acceptance criteria:**
  1. Failing test first: an empty result with `filterCount = 0` does not mention filters ("No rows in this view"); red because the text is unconditional today.
  2. With `filterCount = 2`: "No rows match 2 filters" (1: singular) and an Edit filters action that calls `onEditFilters`.
  3. `CollectionView.test.ts`: the action opens the Filter popover; a view with rows is unchanged.
  4. The live-preview widget text (`collection-block-widget.ts:160-165`) is untouched (read `docs/agents/live-preview-rules.md` before deciding otherwise).

Not ticketed on purpose: rows 7, 8, 21-23, 31, 33-35 (styling sweep with no hidden-data defect; see Q4), kanban (row 28, kanban group), rows owned by other proposals (9, 16, 24, 32).

## Overlapping Issues

| Issue | Status | Overlap | Decision |
|---|---|---|---|
| `.scratch/open-itens/issues/204-emptystate-inlinealert-badge-primitives-exist.md` | ready-for-agent (ledger todo) | EmptyState primitive and call-site migration, `RailNoteList.svelte:862` alert pattern | **Replace** with T1 (EmptyState half). Its InlineAlert and Badge halves are not covered by any P29 ticket; list as residual in the README, do not carry silently |
| `.scratch/open-itens/issues/205-sidebar-panels-settings-use-empty-error-primitives.md` | ready-for-agent (todo, blocked by 204) | Migrates the true empties of Backlinks, Outgoing, TOC, Tags, Search, Trash, Appearance and the raw error text of SearchSection and the event calendar | **Replace** for the empties through T1 + T2 and the sidebar tickets; its raw-error-text and settings-alert halves belong to no proposal here, so record them as residual (Q4). Tags and Search empties already shipped without the primitive |
| `.scratch/open-itens/issues/206-graph-collection-kanban-views-show-real-empty.md` | wontfix (ledger still says todo, stale) | Collection and kanban empties | **Exclude**; T3 takes the collection half, kanban stays with its group |
| `.scratch/open-itens/issues/212-tags-view-explains-when-rare-tag-filter.md` | wontfix (ledger still says todo, stale) | Filtered-empty copy | **Exclude**; shipped as finders-ux 09 (`TagsView.svelte:126-132`) |
| `.scratch/open-itens/issues/010-filters-report-unknown-methods.md` | ready-for-agent | Feeds the error branch message (`evaluator.ts`), not the copy | **Exclude**, no file overlap with T1 beyond the message it already prints |
| `.scratch/open-itens/issues/131-sections-and-live-preview.md` | ready-for-agent | Its "Loading..." and "Finish the filter" are states of a view-editor section, not the rail list | **Exclude** |
| `.scratch/open-itens/issues/250-views-count-notes-filter-could-not-evaluate.md` | needs-info | A count line in the rail rule line `:809` | **Exclude**; adjacent to Edit filters, no shared branch |
| `.scratch/open-itens/issues/132`, `136`, `137` | ready-for-agent | Edit `RailNoteList.svelte` and its view tests | **Exclude**; shared-file rebase only |
| `.scratch/finders-ux/issues/04`, `09`, `13` | resolved | Pattern for hint, filtered-empty, loading states | Precedent only |
| `.scratch/tasks-view-ux/issues/108`, `125`, `234` | resolved | `explainEmptyTasks`, explained empties, error replaces empty | Precedent (active folder; no change there) |

The two stale ledger rows (206, 212 show todo while the files say wontfix) are bookkeeping for the owner; I did not edit them.

## Owner questions (only what the code cannot answer)

1. **Empty-state action for a filtered view: Edit filters or Clear filters?** Clear writes through to the `.view` file. Recommended: Edit filters (opens the popover, no write); P84 owns Clear.
2. **Show "N notes are hidden by filters"?** Needs an unfiltered second query. Recommended: omit; keep "No notes match N filters".
3. **Missing view: what should the action be?** The pin lives in the deleted file, so "Remove from sidebar" cannot work. Recommended: no action, hint "Pick another list in Types."
4. **Scope of the primitive.** Recommended: EmptyState only, in `src/lib/components/` (not `ui/`), compact plus spinner variants; adopt it in T1 and T3 now, and let each rs-* ticket adopt it when it already edits its panel. Skip the pure styling sweep (TypesNavigator, settings, pickers, rows 7, 8, 21-23, 34, 35). Decide what happens to 204's InlineAlert and Badge halves and 205's raw-error-text half: drop them with the abandoned folder, or keep one residual ticket.
5. **Archive hint wording.** HEAD has no row-menu Archive, so the hint says "the ... menu in the note toolbar". If P39 ships row-menu actions first, T1's copy is rewritten there. Recommended: write for HEAD now.
6. **Non-`.md` text files and the right sidebar.** Explain (T2) or hide the sidebar for them like canvas and kanban (`hidesRightSidebar`)? Recommended: explain, as the review proposes; it is the smaller change and keeps one rule per panel.
7. **Collection and kanban in this batch.** Recommended: T3 now (collection table only), kanban left to the kanban-board group (P02, P05, P143 already cover its filter and empty lanes).

## Not checked

- Did not run the app or any test (read-only). The flash of "No matching notes" while FTS is pending and the `.txt` showing full note panels are traced from code, not observed.
- Did not read `docs/agents/live-preview-rules.md`; the CodeMirror collection widget is excluded for that reason.
- Counts in the inventory come from grep of visible strings; text built from variables (for example `emptyText` in `SortPanel`, `explainEmptyTasks` messages) is counted by site, not by string.
- Did not verify the Today lens group ids and labels behind "Nothing here" (`resolveTodayLens`), nor how `Rail.svelte` falls back when a pinned `.view` vanishes.
