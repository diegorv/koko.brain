# Scout: shared view header, rail naming and entry points, keyboard entry (P18, P36, P37)

Checked against HEAD `ab143a411` (main). The haiku leads in `research/raw/P18.md`, `P36.md`, `P37.md` were re-checked line by line in the code; where a lead was wrong or stale it is said below. Prototype: `.scratch/design-review/prototypes/shell-tabs-navigation.html` (sections `#P18` line 417, `#P37` line 468, `#P36` line 482; scripts at 1236, 1304, 1340). Read-only: nothing was run.

Neighbours (other clusters, not decided here): sh-tabs P34/P98 (`EditorTabs.svelte`, `AppShell.svelte:190-196,276`), sh-history-breadcrumb P35/P102 (`NoteActionBar.svelte` breadcrumb, `.md` stripping), sh-menus-settings P103/P104/P105 (`commands.ts`, Settings), sh-empty-zoom-status P97 (`EditorView.svelte:153-158`), nl-header-creation P33/P38 (`RailNoteList.svelte` header, "New here"), nl-actions-keyboard P24 (roving list, `NoteRow.svelte`, `RailNoteList.svelte`). P21 (toolbar kit, "migrate kanban first, together with P18") is in the review but belongs to none of the 13 clusters and has no ticket anywhere under `.scratch/`.

## Code map (what runs today)

| File | Role |
|---|---|
| `src/lib/app/EditorView.svelte` (162 lines) | Mounts `EditorTabs`, `NoteActionBar` (markdown notes only, `isMarkdownNote`), then the body by `fileType`. Owns three LOCAL source flags `collectionSourceMode`, `canvasSourceMode`, `kanbanSourceMode` (`:31-35`), an `$effect` that resets all three on every `activeTabPath` change (`:46-53`), and four floating `absolute` toggle buttons (`:96-151`): kanban bottom-right, canvas top-right, `.view` bottom-right, other non-markdown text files bottom-right (this last one flips `editorStore.isLivePreview`). Nothing else mounts Kanban/Collection/Canvas views (grep: only this file imports them). |
| `src/lib/core/editor/editor.store.svelte.ts` | `isLivePreview` `$state(true)` (`:14`), `setLivePreview` (`:102`), reset only in `reset()` (`:169`, vault switch). It is a single global flag, not per tab. |
| `src/lib/core/editor/editor.service.ts:437-439` | `toggleSourceMode()` = `setLivePreview(!isLivePreview)`. Callers: `global-keybindings.ts:185-189` (Cmd+\ by `code: 'Backslash'`) and `NoteActionBar.svelte:173-181` (Raw button). |
| `src/lib/core/markdown-editor/MarkdownEditor.svelte:113,244,658` | Reads `editorStore.isLivePreview` and reconfigures CodeMirror compartments. It is also the body shown when a kanban/canvas/.view tab is in source mode. |
| `src/lib/features/note-action-bar/NoteActionBar.svelte` + `note-action-bar.logic.ts` | The "note chrome": a `pane-toolbar` row with `typeLabel > fileName` crumb, hub button, Favorite, Organized, Raw (`:173-181`), More menu. Mounted only for `*.md` non-virtual tabs (`editor.logic.ts:28-32`). |
| `src/lib/plugins/kanban/KanbanView.svelte:461-505` | Own `pane-toolbar`: board/list/table segmented group (titles only), sort `<select>`, filter input. No title. |
| `src/lib/features/collection/CollectionView.svelte:515-520` | Own `pane-toolbar`, rendered only inside `{#if activeView}` after parse and index succeed (`:505-516`); the parse-error and "Building index..." branches have no toolbar. Left: view tabs (rename, context menu, add); then the four icon buttons (`:593-668`). No title. |
| `src/lib/features/canvas/CanvasView.svelte` (19 lines) + `CanvasInner.svelte` | `SvelteFlowProvider` around `CanvasInner`. Inner root is `.canvas-container`; xyflow `<Controls position="bottom-left">` and `<MiniMap>` (`:632-633`); `CanvasToolbar` rendered inside `SvelteFlow` (`:689`). `fitView` comes from `useSvelteFlow()` (`:67`), so any control that calls it must render inside the provider. |
| `src/lib/features/canvas/CanvasToolbar.svelte:43-46` | Vertical stack of 5 add buttons, `position:absolute; bottom:118px; left:10px` (the magic offset: sits above xyflow Controls). Hand-rolled `.toolbar-btn` 28 px with an rgba border fallback (`:55`). No unit test (grep of `src/tests` finds no `CanvasToolbar`). |
| `src/app.css:151-153` | `@utility pane-toolbar` (flex h-10 shrink-0 items-center gap-1 px-3 border-b border-divider); comment `:144-150` forbids height/padding/gap/border overrides. Consumers: NoteActionBar, KanbanView, CollectionView, TagsView, TasksView, EventCalendarHeader, SidebarSection. |
| The "top band" copies | Exactly 10 hand-written `h-10 ... bg-tab-bar` sites, confirmed by grep: `EditorTabs.svelte:46`, `AppShell.svelte:256` and `:276`, `EditorView.svelte:154`, `CalendarNavigator.svelte:88`, `SearchPanel.svelte:157`, `FilesNavigator.svelte:305`, `RailNoteList.svelte:699`, `TypesNavigator.svelte:217`, `Rail.svelte:270`. Nine carry `box-shadow: inset 0 -1px 0 var(--divider)` inline (EditorTabs has it in CSS at `:120`). `pane-band` does not exist. |
| `src/lib/plugins/calendar/calendar-rail.service.ts:25-32` | `registerCalendarRail()` registers the navigator `id: 'calendar'` (`CALENDAR_RAIL_ITEM`, `day-lens.logic.ts:12`), `label: 'Calendar'`. |
| `src/lib/plugins/calendar/CalendarNavigator.svelte` | Rail panel: header text "Calendar" (`:88-95`), "Periodic notes" section label (`:142`), "Open Calendar tab" button (`:153-160`, `openCalendarTab` `:76-78`). |
| `src/lib/features/rail-shell/rail-items.logic.ts:31-61` | `railItems()` builds the rail list (top: Search, Inbox, Today, Favorites; navigator: Types, registered navigators, Files; pins; bottom: Archive). Read by `Rail.svelte:75-82`, `LayoutSection.svelte:37-47` and `commands.ts` `railGoToCommands` (`:63-73`, id `rail:go-to:<key>`, label `Go to <label>`, category Navigation). `RAIL_ITEM_COLORS` `:119-128`. |
| `src/lib/features/rail-shell/Rail.svelte` | Rows are `Row` objects built by `itemRow`/`pinRow`/`actionRow` (`:150-190`); sections Workspace, Browse, Pinned, Actions (`:274-300`). `pinRow` highlights while the pinned file is the active tab (`:171-173`). |
| `src/lib/features/rail-shell/rail-registry.store.svelte.ts:95` + `rail-shell.types.ts:204-217` | `registerAction(RailAction)`: a button that only runs a callback; never picked, no highlight, no Go to command, no Settings > Layout row; today only mods use it (`mods-host.service.ts:600`). |
| `src/lib/app/rail-navigation.ts:14-24` | `selectRailItem`: Search -> `openSearch()`, pin with `opensInEditor` -> `openFileInEditor`, anything else -> `updateLayout({ railItem, railPanelsVisible: true })`. Shared by the rail click (`AppShell.svelte:203`) and the palette Go to. No focus call. |
| `src/lib/features/search/open-search.service.ts` + `search.store.svelte.ts:24,75-77` + `SearchPanel.svelte:24-34` | The one working "focus request" seam: a counter bumped by `requestFocus()`, consumed by an `$effect` with `handledFocusRequest` so a mount does not steal focus. |
| `src/lib/features/rail-shell/RailNoteList.svelte` | `shownLens` (`:119`), `currentNewNoteRule()` (`:572-586`, null while a view toolbar is not ready or a folder lens does not resolve), `handleNewHere` (`:593-605`, only caller of `createNoteHere`), button `data-note-list-new` (`:790-801`), `VList` of `NoteRow` (`:880-899`). No focus handling, no arrow keys. The lens itself is derived in `AppShell.svelte:104-151`, not in a store. |
| `src/lib/features/note-list/NoteRow.svelte:68-76` | `<button data-note-row>` per row, keydown handles only F2. Every row is its own Tab stop. |
| `src/lib/features/command-palette/CommandPalette.svelte:36-51` | `executeCommand`: `close()` first, then `await command.action()`. The dialog's own focus restoration on close is not read here (bits-ui); the design point below depends on it. |
| `src/lib/app/global-keybindings.ts:133-141,181` | `layout:toggle-left-sidebar` Cmd+Shift+B, `layout:hide-rail-panels` Cmd+1, `layout:show-rail-panels` Cmd+2, Cmd+0 reset zoom. Digits: no other binding (no `Ctrl`-based binding exists). `shortcutFor(command)` throws when a palette command names a binding that does not exist (`:211-216`). |
| `src/lib/utils/keybindings.ts:56-70` | `registerKeybinding` matches modifiers exactly (`binding.ctrl` vs `e.ctrlKey` both ways), `code` or `key`. `formatShortcut` prints Ctrl as the control glyph. |

Stores read by the relevant code: `editorStore` (`activeTab`, `activeTabPath`, `isLivePreview`) by EditorView, NoteActionBar, MarkdownEditor; `settingsStore.layout.railItem/railPanelsVisible/railHidden/railOrder` by Rail, LayoutSection, AppShell, `rail-navigation.ts`, `commands.ts`; `railRegistryStore` (navigators, actions) by Rail, LayoutSection, commands.

## P18. One header for kanban, canvas and .view tabs

**Still real: yes, with two corrections to the haiku lead.**

Current behaviour:
- No title on the three tabs. Kanban toolbar starts with the view-mode group (`KanbanView.svelte:462-467`), the `.view` toolbar with the view tabs (`CollectionView.svelte:516-520`), canvas has no row at all (`CanvasView.svelte`, `CanvasInner.svelte`). A markdown note gets `typeLabel > fileName` from NoteActionBar.
- Source toggle in three corners: kanban `EditorView.svelte:96-107` (`bottom-3 right-3`), canvas `:109-124` (`top-3 right-3`, comment says the minimap owns bottom-right), `.view` `:126-139` (`bottom-3 right-3`). Aria labels the e2e specs select: "Switch to source mode", "Switch to board view", "Switch to canvas view", "Switch to table view" (`e2e/specs/kanban-view.spec.ts:31-60`, `canvas-view.spec.ts:32-60`).
- Cmd+\ reaches only `isLivePreview` (`global-keybindings.ts:185-189`, `editor.service.ts:437-439`). Correction/extension to the lead: because `isLivePreview` is one global flag that only `editorStore.reset()` clears, Cmd+\ on a kanban tab in board mode silently flips it, and the next markdown note opens in Raw (derived from the code, not run). The same flag is what MarkdownEditor shows in a kanban/canvas/.view source pane, so Cmd+\ while IN source mode does flip live preview of that pane, but never leaves source mode.
- Correction: the raw says the fourth floating toggle (`:140-151`) is for "PDF, image". `openFileInEditor` refuses binary content (`editor.service.ts:154-157`), so it is for other text files (for example `.collection`, `.txt`, per `EditorView.test.ts:337-365`). It stays out of P18.
- Source flags are local and reset on each tab switch (`:46-53`). The prototype keeps a flag per tab (`S.src[S.tab]`), so adopting it removes that reset (a behaviour change, not a preservation).
- Count of band copies: 10, confirmed (table above). The review's claim holds; `pane-band` is absent.
- Canvas offset: `CanvasToolbar.svelte:45-46` `bottom: 118px`. Holds.
- Favorite and Pin: `NoteRowMenu.svelte:255-266` gates frontmatter writes on `isMarkdownFile`. Keep Favorite, Organized and Pin off these tabs (review validation, prototype note).

What the prototype wants: one `pane-toolbar` row per tab with a crumb (kind chevron name: "Kanban > Board"), the view's own controls, then a divider and a source button at the same end (`aria-pressed`, tooltip "Show source" / "Back to the <kind> view", hint Cmd+\). Canvas row: five add buttons, divider, zoom out, zoom in, fit. `.view` row: view chip, add view, "N results", sort/filter/columns. Cmd+\ flips only the active tab's own flag and the toast says "this tab only".

Design points a ticket must settle:
1. Where the header lives. Kanban and Collection state (view mode, `activeViewIndex`, rename) is local to those components, so the row has to be rendered by them (as TasksView does at `TasksView.svelte:905`), not by EditorView. But their branches differ: `.view` has no toolbar while parsing, erroring or building the index, and a source-mode tab unmounts the view entirely. So a shared component (working name `ViewHeader`: `pane-toolbar` + crumb + children snippet + source toggle) is mounted by KanbanView, by CollectionView in ALL its branches, and by EditorView for the source-mode body. Otherwise the toggle vanishes exactly when the user needs to get out of a broken `.view` (a real regression versus the floating button, which is always there).
2. Where source state lives. Cmd+\ has no access to EditorView locals, so the per-tab flag moves to a store: either `editorStore` (keyed by path, cleared in `removeTab`/`reset`, followed on rename) or a small dedicated store. `toggleSourceMode()` becomes: active tab kanban/canvas/collection -> flip that tab's flag; otherwise unchanged. NoteActionBar Raw and the fourth floating toggle keep `isLivePreview`. Stores expose getters; a getter test is mandatory (CLAUDE.md rule 3 and Testing).
3. Per-tab persistence (prototype) versus reset on tab switch (today). Recommended default: per tab, as the prototype.
4. Title text: basename with or without the extension. P102 (sh-history-breadcrumb) proposes dropping `.md` from the note crumb and open-itens 153 strips `.md` in tab titles. Use one shared pure helper whichever lands first; this ticket should not invent a second naming rule.
5. `pane-toolbar.test.ts` requires exactly one `pane-toolbar` class list per listed file with no override classes (`pane-toolbar.test.ts:42-52`). `ViewHeader` should carry the single class list; KanbanView and CollectionView keep zero direct `pane-toolbar` lists if they delegate, so their entries in `TOOLBARS` move to the new file (a deliberate edit of that test, not a weakening: state it in the commit).
6. Source pane liveness: a source-mode kanban/canvas/.view shows MarkdownEditor with whatever global `isLivePreview` is (default true, so rendered-markdown styling). Whether source mode should force the raw gutter-ful editor is a separate behaviour; keep unchanged unless the owner asks.
7. Canvas is the risky part: its controls need the xyflow provider context, the header cannot sit in EditorView. Split into its own ticket (below). Replacing xyflow `Controls` with header zoom buttons is a product decision (owner question 3).

Test files and seams:
- `src/tests/lib/app/EditorView.test.ts:278-333` ("EditorView floating source toggle"): real EditorView, real stores, real child views; only Tauri `invoke`/`listen`/`readTextFile` and the icon-data module are mocked. The canvas case asserts `top-3` (`:312-318`) and the kanban/.view cases assert the aria label; they change with the move.
- `editor.service.test.ts:1086` (`toggleSourceMode`), `global-keybindings.test.ts:272,704-710` (Cmd+\ calls `toggleSourceMode`; no test names the panel bindings), new store getter tests in the editor store test file.
- `KanbanView.test.ts` + `src/tests/fixtures/KanbanViewHarness.svelte`, `CollectionView.test.ts`, `CollectionView.view-writes.test.ts`, `CollectionView.restored-view.test.ts` + `CollectionViewHarness.svelte`.
- `pane-toolbar.test.ts`, `chrome-state-styles.test.ts`, `chrome-type-scale.test.ts`, `menu-item-anatomy.test.ts` (chrome source scans; run them after any new header markup).
- Canvas: `canvas-tab-switch.test.ts` exists; there is no `CanvasToolbar` test, so the canvas ticket adds a header test with a real `SvelteFlowProvider` (jsdom needs the `matchMedia` and `ResizeObserver` stubs `EditorView.test.ts:11-24` already installs).
- E2E to keep green or update on purpose: `e2e/specs/kanban-view.spec.ts`, `canvas-view.spec.ts` (selectors by aria label: keep the labels). No e2e presses Cmd+\ on these tabs; a failing unit test is enough.

## P36. Calendar naming and entry points

**Still real: partial.**

Current behaviour:
- Rail label "Calendar" (`calendar-rail.service.ts:28`) is also the rail tooltip and accessible name, the palette "Go to Calendar" (`commands.ts:63-73`), the Settings > Layout row, and the navigator's own header (`CalendarNavigator.svelte:88-95`). "Toggle Calendar View" (`commands.ts:227-235`, Cmd+Shift+C) opens the event Calendar tab. Typing "cal" in the palette therefore lists two different things. Real.
- Palette half is already DONE at HEAD. `event-calendar:undo` and `:redo` are category Calendar and listed only when `canUndo`/`canRedo` (`commands.ts:253-274`), with new-event and today also Calendar (`:236-252`). This is finders-ux 06 (Status resolved). The prototype's palette ("Toggle Calendar View" under Calendar, idle Undo/Redo shown) contradicts that resolved decision; finders-ux 06 keeps the toggle in Navigation next to the other "Toggle X View". Do not redo it. Remaining palette work: none, unless the owner reverses 06.
- Tasks, Graph and Tags: no rail item (`rail-items.logic.ts:37-61`); the only entries are palette commands (`commands.ts:208-225,293-300`) and shortcuts for Graph (Cmd+G), Tasks (Cmd+Shift+T), Calendar (Cmd+Shift+C) (`global-keybindings.ts:108-131`). Tags has no shortcut and its docs say palette-only (`help/documentation/07-sidebar-panels.md:98-100`). grep of every caller of the open/toggle functions finds only `commands.ts` and `global-keybindings.ts`: no button anywhere. Real.
- The review validation "The Calendar tab already has a button": confirmed as the navigator's "Open Calendar tab" (`CalendarNavigator.svelte:153-160`). It is a rail-panel button, not a rail item.

What the prototype wants: rename the rail navigator ("Journal" default, "Days" alternative), tooltip "Periodic notes navigator"; an optional, off-by-default "Views" rail section with Tasks, Graph, Tags that opens the tab; Tags gets a shortcut only if the owner wants one; hideable and reorderable in Settings > Layout; needs an ADR-0033 amendment.

Design points a ticket must settle:
1. New name. The rename touches user-visible strings only; keys stay (`railItem: 'calendar'`, `data-rail-item="calendar"`, command id `rail:go-to:calendar`, so usage stats by id are unaffected). Strings and tests to change: `calendar-rail.service.ts:28`, `CalendarNavigator.svelte:88-95` header, `calendar-rail.service.test.ts:45`, `Rail.test.ts:95,104,129,653`, `LayoutSection.test.ts:55`, `rail-items.logic.test.ts:26,54`, `commands.test.ts:572`, `lens.logic.test.ts:960,994` (these last ones are fixtures with their own label and need no change unless they assert the real registration). Help to update: `27-calendar.md:15,223`, `19-settings.md:34,45`, `06-search-and-navigation.md:63`, `01-getting-started.md:73,93`, `08-periodic-notes-and-calendar.md:20`, `20-keyboard-shortcuts.md:121`, `26-theming.md:129`, and ADR-0033 Decision wording ("Types, Calendar, Files"). The Settings sections "Periodic Notes" and "Calendar" (`settings.logic.ts:269-272`) already use "Periodic Notes" for this feature's configuration, which argues for "Periodic notes" over "Journal"; the review's own idea ("Journal") also collides with the `_[journal]-` tokens in the default file-name formats (`settings.store.svelte.ts:10,17,25`) and open-itens 096's `Journal/` folder case. Owner question 1.
2. Mechanism for tab entries. Three options, all verified feasible in code:
   - a. `railRegistryStore.registerAction` (exists, Actions section): zero rail-core change, but no highlight, no Go to command, no hide/reorder in Settings > Layout, and the Actions color is the mod fuchsia. Does not meet the prototype.
   - b. A new `RailItem` group (for example `views`) in `railItems()` with a `tab` field, a Rail section, `RAIL_ITEM_COLORS`, a fourth group in `LayoutSection.GROUPS` (`:24-28`), and a new `selectRailItem` branch that opens the tab and does NOT write `layout.railItem` (the same shape as `pin.opensInEditor`, `rail-navigation.ts:19-22`, whose row already follows the active tab, `Rail.svelte:171-173`). `selectRailItem` lives in `app/`, which may import Tasks, Tags and the Graph plugin; `rail-items.logic.ts` (features, pure) only carries a key. Recommended.
   - c. Palette-only (status quo).
   Precedent already breaks "every pick is a lens": ADR-0033 amendments allow a pin that opens the editor without picking, and mod Actions. The amendment records tab entries as a third non-lens kind.
3. Open versus toggle. A rail click should open or focus the tab, not close it: `openTasksTab` `tasks.service.ts:547`, `openTagsTab` `tags.service.ts:126`, `openGraphTab` `graph-view.service.ts:34` exist; the palette uses `toggle*`. Use `open*`.
4. Default visibility. `layout.railHidden` defaults to `[]` (`settings.store.svelte.ts:59`) and a vault that saved the key keeps its saved list, so "hidden by default" needs either a new setting or a one-off migration; "visible by default" is free. Owner question 2.
5. Go to commands. If the new items go through `railItems()`, `railGoToCommands` creates "Go to Tasks", "Go to Graph", "Go to Tags" next to "Toggle Tasks View" etc. Either accept the duplicates or filter the tab items out of Go to (a test must say which). The count literals in `commands.test.ts` change on purpose.
6. Tags shortcut: not decided by code. Owner question 4.
7. Digits for P37 index the visible rail order; adding a section here shifts them (see P37). Land P36's list change before P37's key hints.

Test files and seams: `calendar-rail.service.test.ts`, `rail-items.logic.test.ts` (new group, hidden and order), `rail-navigation.test.ts` (mocks only `openFileInEditor`; a tab-entry case would mock only the Tauri-facing tab services or use the real `editorStore` and assert the active virtual tab, which is stronger), `Rail.test.ts` (row, order, active highlight while the tab is active, no `railItem` write), `LayoutSection.test.ts`, `commands.test.ts` (`getBuiltInCommands rail commands` block at `:566+` builds real `railRegistryStore`/`settingsStore`), `rail-shell.boundary.test.ts` (rail-shell may not import plugins; the opener must stay in `app/`). E2E: `rail-shell.spec.ts:949-1011` (Calendar navigator by `[data-rail-item="calendar"]` and the "Open Calendar tab" button, unaffected by a label change except if it selects by accessible name), `:328-346` (Tasks, Calendar, Tags, Graph tabs hide the right sidebar).

## P37. Keyboard entry into lenses

**Still real: yes** (every evidence line holds; see the code map). Details and corrections:

- `selectRailItem` writes layout only (`rail-navigation.ts:23`). After palette "Go to X" the focus is wherever the palette dialog returns it. `RailNoteList.svelte` has no `focus()` call and no arrow handling; rows are individual Tab stops (`NoteRow.svelte:70-76`).
- "+ New here" has one caller: the header button's `handleNewHere` (`RailNoteList.svelte:593-605`). Its rule needs component-local state (`viewToolbarReady`, `resolved`, `viewTypeName`, `shownLens`, `canCreate`), and the lens is derived in `AppShell.svelte:104-151`. A palette command cannot rebuild it from stores today without duplicating those guards.
- Cmd+1 hide, Cmd+2 show, Cmd+Shift+B toggle (`global-keybindings.ts:133-141`) are the "three panel bindings" (the review does not name them; inference confirmed by `layout.service.ts:7-32` and `help/documentation/20-keyboard-shortcuts.md:17-19`). Cmd+B is the right sidebar, separate.
- No digit-based binding exists; no `ctrl: true` binding exists in `global-keybindings.ts`. `registerKeybinding` supports `code`, which matters for Cmd+Opt+digit (Option+digit prints a different `key` on macOS).
- Ctrl+1..9 caution (checked on the web, not on a machine): Control-N is the macOS Mission Control "Switch to Desktop N" shortcut, a checkbox in System Settings > Keyboard > Keyboard Shortcuts > Mission Control that is not reliably enabled by default but is common for Spaces users; Parallels can also intercept Ctrl+digit while a Windows VM runs (sources: https://discussions.apple.com/thread/8363144, https://kb.parallels.com/br/118730/). The app cannot detect it; this is an owner decision with an honest cost.
- ADR-0033 assigns Cmd+1 and Cmd+2 (Decision section `Layout and keys`, and the 2026-11-04 palette amendment citing `global-keybindings.ts:140-141`); Cmd+1..9 would need an amendment. Ctrl or Cmd+Opt do not collide with a binding but still belong in the same ADR amendment as the new commands.
- Haiku lead said the palette's focus restoration is unconfirmed. It is: `CommandPalette.svelte:36-51` closes the dialog and then runs the action; whether bits-ui restores focus to the previously focused element after the action's focus call is not read in this scout. The existing `searchStore.requestFocus` seam works from the same palette path, and its consumer focuses from an `$effect`, so copy that pattern and let the test prove the ordering with a real mounted palette.

What the prototype wants: "Go to X" moves focus to the lens's active or first row, ArrowUp/Down move, Enter opens and moves focus to the editor; a "New note here" command and a "+" in the list header (the header "+" already exists in the app); optional key hints on rail rows (Ctrl+1.., Cmd+Opt+1.., or none; the prototype wires only four digits).

Design points a ticket must settle:
1. Focus target. Minimal and standalone: focus the active row if rendered else the first `[data-note-row]`; the list is a `VList` (virtua), so the active row may not be mounted, and the first row always is. The full interaction (arrows, Enter, one Tab stop) is P24's roving list (nl-actions-keyboard, effort L). Recommended: this ticket only lands focus on the first or active row and reuses `NoteRow` as is; P24 later swaps the target to its list container.
2. The seam. One new small store in `features/rail-shell/` with two request counters, `focusListRequest` and `newHereRequest`, consumed by `RailNoteList` in an `$effect` with `untrack()` and a "handled" marker (the exact pattern of `search.store.svelte.ts:24-77` and `SearchPanel.svelte:24-34`). `rail-navigation.ts` bumps the first after `updateLayout` for list lenses (not Search, which already focuses its input; not a pin that opens in the editor); the palette command bumps the second. The list may not be mounted yet (panels hidden) so the consumer handles "request pending at mount".
3. "New note here" availability. A command that cannot act should not be listed (finders-ux 06 precedent for Calendar Undo/Redo). That needs `canCreate` readable from `commands.ts`, so `RailNoteList` publishes it to the same store. Alternative: always list it and toast when there is nothing to create; recommended default is the gated version.
4. Dependency on open-itens 142 (New here infers the type from a compound `&&` filter, Status ready-for-agent): a palette command from such a view inherits the bug. Not a blocker; list it.
5. Direct keys. Index into the visible rail order from `railItems()`; Search keeps `/`; skip hidden items; pins and tab entries (P36) count. Rail rows would show the key as a hint. All of it is an owner decision (questions 5 to 7) and needs the ADR-0033 amendment.
6. Merging Cmd+1/Cmd+2/Cmd+Shift+B: removing bindings is a breaking shortcut change with `help/documentation/01-getting-started.md:82`, `02-file-explorer.md:14`, `06-search-and-navigation.md:70-72`, `19-settings.md:39`, `20-keyboard-shortcuts.md:17-19` to rewrite. Not proposed as default.
7. F6 focus cycle: no code, no test, no precedent; optional per the review. Leave out.

Test files and seams: `rail-navigation.test.ts` (it mocks `openFileInEditor` only and uses real `settingsStore`/`searchStore`; add a real new-store assertion that a list pick bumps the request and Search/pin picks do not), `RailNoteList.test.ts` and friends (real `AppShell`-less mount with `lens` prop: assert `document.activeElement` is the first `[data-note-row]` after the request, and that a mount with a handled request does not steal focus), `commands.new-commands.test.ts` or `commands.test.ts` (command listed only when the store says it can create; running it creates a note through the real `createNoteHere` with only Tauri mocked), `new-note.service.test.ts`, `global-keybindings.test.ts` (digits, if the owner picks them: assert `Ctrl+1` handler picks the first visible item and `Cmd+1` still hides panels), `Rail.test.ts` (hints). E2E: `rail-shell.spec.ts` covers "New here" per lens (`:270,284,458,483,563,743,914,949`); no spec presses a Go to command or digit, so one e2e for "palette Go to Inbox then focus is in the list" is justified because jsdom cannot show real dialog focus restoration.

## Candidate tickets

Grouping rationale: P18 splits into the shared header (state, Cmd+\, kanban, `.view`, source-mode bar), the canvas header (needs the xyflow provider, independent risk) and the `pane-band` utility (10 mechanical sites in other clusters' files). P36 is one ticket for rename plus tab entries (same files: `rail-items.logic.ts`, `Rail.svelte`, `commands.ts`, `LayoutSection`, ADR), with the rename optional to split if the owner wants it first. P37 splits into the palette-to-list seam (focus plus New note here, same new store and same two components) and the direct-keys ticket (owner decisions, depends on P36 ordering).

### T1. Kanban and .view tabs get a title and one source toggle; Cmd+\ flips the tab's own mode (P18 parts 2 and 3, non-canvas)

Size M (about 8 source files, 8 test files). Optional split if budget is tight: T1a state + Cmd+\ (S), T1b header (M).
Files: `src/lib/core/editor/editor.store.svelte.ts` (per-tab source flag, getters), `editor.service.ts` (`toggleSourceMode` routing), `src/lib/app/EditorView.svelte` (flags and kanban/.view floating buttons removed; source-mode bar; canvas and fourth toggle stay), new `ViewHeader.svelte` (suggested `src/lib/core/layout/`), `KanbanView.svelte`, `CollectionView.svelte`, `src/tests/lib/pane-toolbar.test.ts`.
Blockers: none inside this batch. Shares `EditorView.svelte` with T3 (canvas), P97 (empty state, `:153-158`) and `pane-band` T4; shares `NoteActionBar.svelte` read-only with P102 (title helper). Run T1 before T3.
Acceptance criteria:
- [ ] Failing test first, editor store: a tab's source flag is per path, defaults off, clears when the tab closes and on `reset()`; the getter reads fresh right after a write.
- [ ] Failing test first, `editor.service.test.ts`: `toggleSourceMode()` with an active kanban, canvas or collection tab flips only that tab's flag and leaves `isLivePreview` untouched; with a markdown tab it still flips `isLivePreview`; with no tab it does nothing.
- [ ] Failing test first, `EditorView.test.ts` (real stores and views): a kanban tab and a `.view` tab show the file name in their `pane-toolbar` row and ONE source button at the row's end with `aria-pressed`, labelled "Switch to source mode" / "Switch to board view" / "Switch to table view"; no `absolute` floating toggle remains for them; Favorite, Organized and Pin are absent.
- [ ] A `.view` tab whose YAML fails to parse (and one still "Building index...") still shows the title and the toggle, and the toggle reaches source mode.
- [ ] Source mode of each tab shows the same header row (title + toggle) above the MarkdownEditor, and the toggle returns to the view; Cmd+\ does the same through the keybinding handler.
- [ ] Switching tabs keeps each tab's own flag (the old reset effect is gone); switching back restores it.
- [ ] `pane-toolbar.test.ts` still passes with the header as the single `pane-toolbar` class list of its file; `chrome-*` scans pass; `e2e/specs/kanban-view.spec.ts` selectors still match.
- [ ] Gate: `pnpm check` + `pnpm vitest run` (frontend only); also `bash scripts/e2e.sh` for kanban-view and canvas-view specs.

### T2. Canvas tab gets the header: title, add and zoom controls, source toggle; the 118 px offset goes away (P18 part 2, canvas)

Size M. Independent risky part: xyflow context, replacing `Controls` is a product choice.
Files: `CanvasInner.svelte` (header rendered inside the provider above `.canvas-container`; `Controls` and `CanvasToolbar` call sites), `CanvasToolbar.svelte` (becomes a row component or is deleted), `EditorView.svelte` (canvas floating toggle removed), `ViewHeader.svelte` (consumer), `CanvasView.svelte` if the wrapper needs to become a flex column.
Blockers: T1 (shared `ViewHeader`, store flag). Overlaps open-itens 196 (rgba border fallback at `CanvasToolbar.svelte:55`, ready-for-agent): the rewrite replaces that line, so 196's canvas-toolbar line item is covered; 196's menus, pickers and edge-label items are not.
Acceptance criteria:
- [ ] Failing test first (new, real `SvelteFlowProvider`, Tauri/jsdom stubs only): a canvas tab renders a `pane-toolbar` row with the file name, five add buttons by accessible name, and one source toggle; the vertical stack and `bottom: 118px` are gone (no `absolute` toolbar in the markup, no `118px` in the stylesheet).
- [ ] Clicking Add text creates a card (same callbacks as today: `addTextCard`, file picker, link input, image picker, `addGroup`), asserted on real canvas state.
- [ ] Zoom out, zoom in and fit call the xyflow instance (fit uses `fitView({ duration: 300 })` like `CanvasInner.svelte:658`); outcome per owner question 3 for the xyflow `Controls`.
- [ ] Canvas source mode keeps the header with title and toggle; Cmd+\ flips it (from T1); the minimap is untouched.
- [ ] `EditorView.test.ts` canvas case (`top-3` assertion) is replaced by the header assertions; `e2e/specs/canvas-view.spec.ts` aria-label selectors still match.
- [ ] Gate: `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for canvas-view.

### T3. One `pane-band` utility for the 10 top-band copies (P18 part 1)

Size S (mechanical, 10 files plus `app.css` and one source-scan test). Best done last in the batch.
Files: `src/app.css`, `EditorTabs.svelte`, `AppShell.svelte` (2), `EditorView.svelte`, `CalendarNavigator.svelte`, `SearchPanel.svelte`, `FilesNavigator.svelte`, `RailNoteList.svelte`, `TypesNavigator.svelte`, `Rail.svelte`; new `src/tests/lib/pane-band.test.ts` modelled on `pane-toolbar.test.ts`.
Blockers: edits one class line in files other clusters change (P98 `AppShell`/`EditorTabs`, P33 `RailNoteList` header, P97 `EditorView:154`); land after those clusters or rebase. Independent of T1/T2 except the `EditorView.svelte` empty strip.
Acceptance criteria:
- [ ] Failing test first: a source scan finds no `h-10` + `bg-tab-bar` class list outside the `@utility pane-band` definition in `src/lib`, and the definition contains `h-10 shrink-0 bg-tab-bar` plus the divider inset shadow.
- [ ] The scan allows per-site extras only for layout that is not height, background or divider (the rail's `sticky top-0 z-10`, `pl-[var(--rail-header-pad)]`), mirroring `OVERRIDE` in `pane-toolbar.test.ts`.
- [ ] Every site renders unchanged: existing `Rail.test.ts`, `RailNoteList.test.ts`, `SearchPanel`, `TypesNavigator`, `FilesNavigator`, `EditorTabs.test.ts` (`h-10`) and `AppShell.test.ts` pass untouched.
- [ ] Note in the commit that `EditorTabs.svelte:120` already holds the divider in CSS and is brought onto the utility.
- [ ] Gate: `pnpm check` + `pnpm vitest run`; a visual pass in `pnpm tauri dev` is not covered by tests (say so).

### T4. The periodic-notes navigator stops being called "Calendar", and Tasks, Graph and Tags get rail entries (P36)

Size M. Optional split: T4a rename (S: label, header, help, ADR wording) and T4b entries (M).
Files: `calendar-rail.service.ts`, `CalendarNavigator.svelte`, `rail-items.logic.ts`, `Rail.svelte`, `LayoutSection.svelte`, `rail-navigation.ts`, `rail-shell.types.ts` (if `RailItem` gains a `tab` field), `commands.ts` (Go to filter or count), `global-keybindings.ts` only if the owner wants a Tags key, `docs/adr/0033-...md` amendment, seven help pages listed above.
Blockers: ADR amendment text is part of the ticket. Shares `rail-items.logic.ts`, `Rail.svelte`, `rail-navigation.ts`, `commands.ts` with T5 and T6; shares `commands.ts` with P103/P104/P105 (sh-menus-settings). Do T4 before T6 (digits index this list).
Acceptance criteria:
- [ ] Failing test first, `calendar-rail.service.test.ts:45`: the registered navigator label is the new name; `Rail.test.ts` finds the button by the new accessible name; the key stays `calendar` (`data-rail-item="calendar"`, `rail:go-to:calendar`).
- [ ] Failing test first, `commands.test.ts`: the palette lists "Go to <new name>" and "Toggle Calendar View" with no command named "Go to Calendar"; Calendar Undo/Redo gating and categories are unchanged (finders-ux 06 tests still pass).
- [ ] Failing test first, `rail-items.logic.test.ts`: the tab items sit in their own group, honour `railHidden` and `railOrder`, and never become `layout.railItem`.
- [ ] Failing test first, `rail-navigation.test.ts`: selecting a tab item opens or focuses that virtual tab with the REAL `editorStore` (a second click does not close it) and leaves `layout` untouched; `Rail.test.ts`: the row is highlighted while its tab is active.
- [ ] `LayoutSection.test.ts`: the new group is listed with show/hide and move up/down; default visibility as the owner decides.
- [ ] Help pages and ADR-0033 amendment updated in the same commit; `20-keyboard-shortcuts.md` lists a Tags key only if one is added.
- [ ] Gate: `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for rail-shell Calendar and tab specs.

### T5. Go to X lands focus in the list, and "New note here" becomes a command (P37 parts 1 and 2)

Size M.
Files: new request store in `features/rail-shell/` (name per ticket), `rail-navigation.ts`, `RailNoteList.svelte` (consumers; publishes `canCreate`), `commands.ts`, `AppShell.svelte` only if the click path needs the same bump (it shares `selectRailItem`), help `06-search-and-navigation.md` and `20-keyboard-shortcuts.md`.
Blockers: depends softly on P24 (nl-actions-keyboard): if P24 lands first the focus target becomes its list container; otherwise first or active `[data-note-row]`. Shares `RailNoteList.svelte` with nl-header-creation (P33, header region only) and nl-actions-keyboard; shares `commands.ts` and `rail-navigation.ts` with T4. open-itens 142 is a dependency candidate, open-itens 146 (usage recorder, same `selectRailItem` and `railGoToCommands`) is replaced only if T5 adopts usage recording, otherwise a dependency; open-itens 140 is not touched.
Acceptance criteria:
- [ ] Failing test first, `rail-navigation.test.ts`: picking Inbox, Today, Favorites, Types, Files, Archive, a navigator or a pin that does not open in the editor bumps the list focus request; Search and an `_open_in_editor` pin do not.
- [ ] Failing test first, `RailNoteList` mount test: after the request, `document.activeElement` is the active row if mounted else the first `[data-note-row]`; a pending request at mount (panels were hidden, `railPanelsVisible` flips) is honoured once; an empty list focuses nothing and does not throw; an already handled request is not replayed.
- [ ] Failing test first, `commands` test: "New note here" is listed only when the shown lens can create (store flag), is absent on Search and on a view whose toolbar is not ready, and running it creates the note through the real `createNoteHere` and opens it (only Tauri mocked); category Navigation (or "Note", per `commands.test.ts` conventions), id stable.
- [ ] The command shows the rail panels first when Cmd+1 hid them, same as Go to.
- [ ] Unit test cannot prove real dialog focus restoration after the palette closes: add one e2e (palette Go to Inbox, press Down/Enter or assert focus) via `bash scripts/e2e.sh`.
- [ ] Count literals in `commands.test.ts` change on purpose and say why.

### T6. Direct keys for rail items (P37 part 3, owner decision)

Size M. Do not start before owner questions 5 to 7 are answered.
Files: `global-keybindings.ts` (digits by `code`), `rail-items.logic.ts` (key index helper), `Rail.svelte` (hints), `rail-navigation.ts`, `utils/keybindings.ts` only if the hint format needs it, `docs/adr/0033-...md`, `help/documentation/20-keyboard-shortcuts.md`, `01-getting-started.md`.
Blockers: T4 (the item list and its order); T5 only for focus-after-pick; owner decisions. Shares `global-keybindings.ts` with P35 (history keys Cmd+Opt+Left/Right, no digit overlap) and any shortcut ticket in sh-menus-settings.
Acceptance criteria:
- [ ] Failing test first, `global-keybindings.test.ts`: the chosen chord with digit N selects the Nth visible rail item (hidden items skipped, reordering respected, pins and tab entries counted per the decision); Cmd+1 and Cmd+2 still hide and show panels.
- [ ] Failing test first, pure helper in `rail-items.logic.test.ts`: index to key mapping, more digits than items, nine-item cap.
- [ ] `Rail.test.ts`: each of the first nine rows shows its key hint in labeled and captioned forms, none in collapsed.
- [ ] Key is a no-op while focus is in a text input if the owner chooses a chord that types characters (Cmd+Opt+digit does not; Ctrl+digit does not).
- [ ] ADR-0033 amendment and the two help pages list the keys.
- [ ] Gate: frontend gate; not verifiable in tests: collision with macOS Mission Control or Parallels shortcuts.

## Overlapping Issues

| Issue | Status | Overlaps | Decision |
|---|---|---|---|
| `.scratch/open-itens/issues/140-view-tab-keyboard-and-labels.md` | ready-for-agent (ledger todo, blocked by 139) | The four `.view` toolbar icon buttons without `aria-label` or `title` (`CollectionView.svelte:593-668`), the toolbar T1 touches. Its row keyboard and calendar halves are other surfaces (P24, collection). | Replace for the label half (T1 adds names to the buttons it moves into the header); the row and calendar halves leave with the abandoned folder to the collection group. |
| `.scratch/open-itens/issues/207-chrome-icon-buttons-share-sizes-use-shadcn.md` | ready-for-agent | Same hand-rolled chrome buttons; it is the P21 toolbar kit's ancestor. | Replace only if a ticket takes P21; otherwise dependency and do not widen T1/T2. |
| `.scratch/open-itens/issues/071-view-toolbar-icon-writes-keep-file-s.md` | ready-for-agent | `.view` toolbar write path (sort, filter, columns YAML). T1 moves the row's chrome, not the writes. | Depend (no code overlap beyond tests in `CollectionView.view-writes.test.ts`). |
| `.scratch/open-itens/issues/196-canvas-menus-pickers-edge-labels-use-theme.md` | ready-for-agent | `CanvasToolbar.svelte:55` rgba fallback, removed by T2. | Replace the canvas-toolbar line item only; the rest of 196 stays unowned. |
| `.scratch/open-itens/issues/154-inline-title.md` | ready-for-agent | Explicitly leaves Canvas, Kanban, `.view`, PDF and image tabs unchanged. | Boundary, not a replacement. T1/T2 do not make the title editable. |
| `.scratch/open-itens/issues/136-rail-view-switcher.md` | ready-for-agent | Multi-view `.view` switching in the rail list header; different surface from the pane header. | Depend; exclude. |
| `.scratch/open-itens/issues/146-usage-recorder-and-seams.md` | ready-for-agent | Edits `selectRailItem` and the Go to commands (`commands.ts` about `:56-73`) T4 and T5 also edit; renaming keeps ids, so usage stats are not affected by T4. | Depend: land one of them first and rebase; replace only if a ticket adopts usage recording. |
| `.scratch/open-itens/issues/148-usage-count-file-opens-by-type.md` | ready-for-agent | Same rail click path as 146. | Depend via 146. |
| `.scratch/open-itens/issues/142-new-here-type-from-compound-filter.md` | ready-for-agent | `newNoteRule` type inference; the T5 palette command inherits its bug. | Depend (not a blocker). |
| `.scratch/open-itens/issues/096-root-unarchive-writes-vault-x-md-auto.md` | ready-for-agent | Real `Journal/` folder name collides with a "Journal" rail label; only context for the naming question. | Exclude. |
| `.scratch/open-itens/issues/153-tab-strip-shows-overflow-hides-md-extension.md` | ready-for-agent | `.md` stripping in tab titles; the same naming rule T1's crumb needs. | Depend on a shared helper; owned by sh-tabs/sh-history-breadcrumb. |
| `.scratch/open-itens/issues/206-graph-collection-kanban-views-show-real-empty.md` | wontfix | Empty and error states for these views are explicitly NOT carried to P18. | Exclude; T1 must not claim them. |
| `.scratch/open-itens/issues/215-collection-table-reads-table.md`, `216-...` | needs-triage / needs-info | Table header inside the `.view` body, not the pane header. | Exclude. |
| `.scratch/finders-ux/issues/06-palette-calendar-undo-recent-groups.md` | resolved | Palette Calendar category and Undo/Redo gating, already in HEAD (`commands.ts:236-274`). | Dependency: T4 keeps its tests green and does not move "Toggle Calendar View". |
| `.scratch/finders-ux/issues/09, 10, 11` (Tags header, tab icon, filter) | resolved | `TagsView` toolbar rules under `pane-toolbar`. | Dependency: keep `pane-toolbar.test.ts` green. |
| `.scratch/tasks-view-ux/issues/111-quick-filters.md`, `112-group-and-sort.md` | done | `TasksView.svelte:905` already puts the title "Tasks" in `pane-toolbar`: the precedent for the T1 header. | Dependency only. |

## Owner questions (only what the code cannot answer)

1. New name for the rail's periodic-notes navigator: "Journal" (review), "Periodic notes" (matches the Settings section and the plugin name) or "Days"? Recommended: "Periodic notes". Reason: Settings already says "Periodic Notes", and "Journal" collides with the `_[journal]-` tokens in the default formats and with a possible user `Journal/` folder (open-itens 096).
2. Should the Tasks, Graph and Tags rail entries be on or off by default? Recommended: on for new and old vaults alike is simplest but grows the rail; the prototype shows them optional and off. If off, the ticket needs a new setting (a saved `railHidden` list would show them to existing vaults). Recommended default: off, with a one-line hint in Settings > Layout.
3. Canvas zoom: replace the xyflow `Controls` (bottom-left zoom and lock buttons) with zoom buttons in the header, as the prototype shows, or keep `Controls` and put only the five add buttons in the header? Recommended: add buttons only in the header, keep `Controls` (smaller, reversible change); revisit zoom later.
4. Should Tags get a keyboard shortcut (Tasks has Cmd+Shift+T, Graph Cmd+G, Calendar Cmd+Shift+C)? Recommended: no, the rail entry now covers discoverability, and free chords are scarce.
5. Direct keys for rail items: Ctrl+1..9 (review default, risk of macOS Mission Control Desktop N and Parallels), Cmd+Opt+1..9, or none? Recommended: Cmd+Opt+1..9 by `code` (no Mission Control clash, no change to Cmd+1/Cmd+2); if the owner wants Ctrl, test it on the daily machine first.
6. Merge Cmd+1, Cmd+2 and Cmd+Shift+B into one chord? Recommended: no; keep all three, it is a breaking shortcut change with five help pages and ADR-0033 text for no new capability.
7. Optional F6 focus cycle between rail, list and editor? Recommended: leave out of this batch; it overlaps the roving-list work in P24.
8. Per-tab source mode (prototype) versus reset on every tab switch (today) for kanban, canvas and `.view`? Recommended: per tab, as the prototype.

## Not checked

- Nothing was run: no tests, no app, no build. The `isLivePreview` leak from Cmd+\ on a kanban tab into the next markdown note is derived from reading `editor.store.svelte.ts` and `MarkdownEditor.svelte`, not reproduced.
- bits-ui's focus restoration when the palette `Dialog` closes (it decides whether T5's focus call survives) was not read; the T5 e2e exists for that reason.
- `Collection*View` internals beyond the toolbar, `canvas.service.ts`, kanban store, and the CodeMirror side of source mode were skimmed only.
- macOS shortcut defaults (Ctrl+digit) come from community pages, not Apple documentation or a machine.
- Which of the other 12 clusters' tickets will actually land first; the blocker notes assume the order given in the batch list.
