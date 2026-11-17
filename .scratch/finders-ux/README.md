# finders-ux

The design review of 2026-11-17 (`.scratch/design-review/review.md`) groups its proposals by surface, one prototype page per group in `.scratch/design-review/prototypes/<group>.html` (listed by `.scratch/design-review/index.html`). The finders group (command palette, quick switcher, Search panel, Tags view, graph; `prototypes/finders-search-tags-graph.html`) goes first. Each proposal was checked against the code by a scout and an adversarial verdict (`research/`), then combined in `research/breakdown.md`; the owner approved this numbering on 2026-11-17. `.scratch/open-itens` is abandoned, so the open-itens Issues these proposals overlapped are carried into the tickets below and marked wontfix there.

## Tickets

| NN | Ticket | Proposals | Blocked by |
|----|--------|-----------|------------|
| 01 | [Command dialogs: input anchored at 18vh, one-line rows, 400px list, key-hint footer, no close X](issues/01-command-dialogs-anchored-dense-rows.md) | P55, P56 | none |
| 02 | [Quick switcher offers Create while notes match (Shift+Enter), creates Folder/Note paths, and a failed create says why](issues/02-quick-switcher-create-while-matching.md) | P57 | 01 |
| 03 | [Search result cards: note name, folder, plain-text snippets, themed highlight](issues/03-search-result-cards-name-folder-plain-snippets.md) | P58, P158 | none |
| 04 | [Search states: short query, error, disabled mode; operator hints; a11y labels; index status only in the status bar](issues/04-search-panel-states-hints-labels.md) | P59, P161, P162 | 03 |
| 05 | [Search keeps previous results dimmed while searching, shows "N+" at the cap, and clearing mid-search does not stick on Searching...](issues/05-search-keeps-results-while-searching.md) | P30 (search half) | 04 |
| 06 | [Palette: calendar Undo/Redo only when they can act, Calendar category, Recent / All commands groups](issues/06-palette-calendar-undo-recent-groups.md) | P159, P160 | 01 |
| 07 | [Quick switcher rows: type icon, folder, Archived tag, match highlight, Recent notes heading](issues/07-quick-switcher-rows-type-icon-folder-highlight.md) | P179 | 02 |
| 08 | [Tags view keeps its list and expanded tags on screen while it refreshes](issues/08-tags-view-keeps-list-while-refreshing.md) | P30 (tags half) | none |
| 09 | [Tags header says "Showing X of Y" and the empty state explains the rare-tag filter](issues/09-tags-header-showing-x-of-y.md) | P76 | 08 |
| 10 | [Tags rows align leaves with parents, name their chevron and colour controls, and the Tags tab shows a tag icon](issues/10-tags-rows-align-label-controls-tab-icon.md) | P157, P187 | none |
| 11 | [Tags view filter box matching full paths](issues/11-tags-view-filter-box.md) | P157 (filter part) | 09, 10 |
| 12 | [Graph controls on shadcn Switch/Select: no Close, working "All", accessible names, filter that does not trap](issues/12-graph-controls-shadcn-switch-select.md) | P154 | none |
| 13 | [Local graph isolated, loading and error states with Retry](issues/13-local-graph-isolated-loading-error-states.md) | P155 | 12 |
| 14 | [Local graph depth stepper (1 to 3)](issues/14-local-graph-depth-stepper.md) | P155 (depth part) | 12, 13 |
| 15 | [Graph labels drawn by priority, skipping overlaps](issues/15-graph-labels-priority-skip-overlaps.md) | P78 | none |

Free to start: 01, 03, 08, 10, 12, 15. The blockers follow shared files: 03 to 05 all edit `search.service.ts` and `SearchPanel.svelte`; 02 and 07 both edit `QuickSwitcher.svelte`; 09 and 11 edit the `TagsView` header and empty branch; 12, 13 and 14 run in that order because 12 and 13 both add reactive graph state at `GraphView.svelte:44` and edit adjacent template lines, and 14 edits `GraphControls.svelte` (with 12) and `GraphView.svelte` and `GraphView.test.ts` (with 13). 15 is free because it edits only the label block of `render()` in `GraphView.svelte` and adds its own test file. `help/documentation/06-search-and-navigation.md` is edited by 02 to 07 in different sections, so parallel runs may need a trivial rebase.

## Dropped

- **P156** (the graph canvas ignores the open-in-new-tab modifier): the premise is false. A plain graph click calls `openFileInEditor`, which focuses the note's existing tab or pushes a new one through `editorStore.addTab`. The app has no replace-current-tab or preview-tab model, so a Cmd-click branch would behave exactly like a plain click. A preview-tab model would be a separate tab-model decision.

## Dropped edges

`research/breakdown.md` also ordered these tickets against open-itens Issues that touch the same files: 045, 087, 160, 165, 166, 204, 205 and 209. Those edges are dropped because `.scratch/open-itens` is abandoned. 045 (text-search operators are filtered after the FTS cap of 50, and tags match exactly) is the one with a behavioural tie: ticket 05 shows the "+" for today's capped behaviour and does not decide 045's fix, which is flagged to the owner separately.

## Not in this group

P74 (sidebar link rows truncate text and show raw markdown snippets) appears on the finders prototype page because its markdown stripping is shared with 03, but it belongs to the right-sidebar group (`prototypes/right-sidebar.html`).

## Replaced open-itens Issues

Each is marked wontfix in `.scratch/open-itens/issues/` with a pointer to its replacement.

| Old Issue | Replaced by |
|-----------|-------------|
| 218 command palette dense one-line rows | 01 |
| 164 quick switcher Create with a folder path | 02 |
| 220 Search panel stops repeating the index status | 04 |
| 057 clearing the search box while a search runs | 05 |
| 159 Tags view keeps its list while it refreshes | 08 |
| 212 Tags view explains the rare-tag filter | 09 |
| 208 graph controls and event dialog use shadcn controls (graph half only) | 12 |
| 206 graph, collection and kanban empty and error states (graph half only) | 13 |

The EventDialog checkbox half of 208 returns with the calendar-tasks group (`.scratch/design-review/prototypes/calendar-tasks.html`); the canvas, collection and kanban halves of 206 return with the canvas, collection-queryjs and kanban-board groups (`prototypes/canvas.html`, `prototypes/collection-queryjs.html`, `prototypes/kanban-board.html`).
