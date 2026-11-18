# Verdict: shared view header, rail naming and entry points, keyboard entry (P18, P36, P37)

Adversarial check of `scout-sh-view-headers-entry.md` against HEAD `ab143a411`. Read-only: I opened every cited source line, the tests the scout names, bits-ui's focus scope (`node_modules/bits-ui` 2.20.6), the help pages, ADR-0033, the open-itens Issues the raw notes list (140, 207, 071, 196, 154, 136, 146, 148, 142, 096, 153, 206, 215, 216, 027, 101, 087) with their Status lines and `ledger.md` rows, and the sibling scouts `scout-nl-header-creation.md`, `scout-nl-actions-keyboard.md`, `scout-sh-history-breadcrumb.md`, `scout-sh-empty-zoom-status.md`. Nothing was run.

## Proposals: still real?

| ID | Real | Verified at |
|---|---|---|
| P18 | yes | No title on the three tabs: `KanbanView.svelte:462` row starts with the view-mode group; `CollectionView.svelte:516` with the view tabs; canvas has no row (`CanvasView.svelte`, `CanvasInner.svelte:602`). Floating toggles: `EditorView.svelte:96-108` (kanban, `bottom-3 right-3`), `:109-122` (canvas, `top-3 right-3`), `:123-135` (`.view`), `:136-149` (other text files, flips `isLivePreview`). Local flags `:31-35`, reset effect `:47-53`. Cmd+\ is `global-keybindings.ts:185-188` -> `toggleSourceMode()` `editor.service.ts:437-439`, one global `isLivePreview` (`editor.store.svelte.ts:14`, reset only in `reset()` `:169`). Canvas offset `CanvasToolbar.svelte:44-46` (`bottom: 118px`). Ten `h-10 ... bg-tab-bar` copies confirmed by grep. The scout's line ranges for the toggles drift by 1 to 4 lines (EditorView is 159 lines, not 162); nothing load-bearing. |
| P36 | partial | Rail label `calendar-rail.service.ts:28`, header `CalendarNavigator.svelte:88-95`. The palette half (Calendar category, gated Undo/Redo) is in HEAD (`commands.ts:236-274`, finders-ux 06 resolved). Tasks, Graph, Tags have no rail entry (`rail-items.logic.ts:37-48`); openers exist (`tasks.service.ts:547`, `tags.service.ts:126`, `graph-view.service.ts:34`). |
| P37 | yes | `selectRailItem` writes layout only (`rail-navigation.ts:14-24`); no focus call or arrow handling in `RailNoteList.svelte`; "+ New here" has one caller (`handleNewHere` `:592-606`, button `:790-801`). Cmd+1/Cmd+2 at `global-keybindings.ts:140-141`, Cmd+Shift+B at `:133-139`, Cmd+0 at `:181`. No `ctrl` binding exists. |

## Where the scout is wrong or incomplete

1. **pane-band (T3) breaks four tests; "pass untouched" is false.** `EditorView.test.ts:381` (`classList` contains `bg-tab-bar`, and `:382` the inline `box-shadow` style), `Rail.test.ts:187` (`className` contains `h-10`) and `:190` (`bg-tab-bar`), `SearchPanel.test.ts:105` (`bg-tab-bar`). A `@utility pane-band` replaces those classes and the inline style, so all four fail. They must be moved on purpose to assert the `pane-band` class (the new source scan holds the recipe), and the commit must say why. That is a deliberate edit, not a weakening.
2. **Cmd+\ also leaks from virtual tabs.** The scout found the kanban case (Cmd+\ on a board silently flips `isLivePreview`, so the next Markdown note opens in Raw). The same happens on Tasks, Tags, Graph and Calendar tabs: `toggleSourceMode()` has no tab check at all. The routing criterion must cover "virtual tab: no-op", not only "no tab".
3. **Per-tab state: a field on `EditorTab`, not a path-keyed map.** `EditorTab` (`editor.types.ts:2-15`) is not persisted anywhere (no session restore of tabs in `src/lib`). A `sourceMode?: boolean` field set through one store method is dropped with the tab by `removeTab`, follows a rename (`updateTabPath` mutates the same object, `editor.store.svelte.ts:121-127`) and survives pinning (`reorderTabsAfterPinChange` spreads the tab, `editor.logic.ts:82`). A map needs all three handled by hand. One caveat for sh-history-breadcrumb P35 (navigate in the active tab): if that ticket reuses a tab object for a new path, it must clear the field. Today P35 replaces only Markdown tabs, which never set it.
4. **`ViewHeader` can read the store itself.** KanbanView receives no `path` (`KanbanView.svelte:51` Props, mounted at `EditorView.svelte:81` with content only). A header in `core/layout/` that takes `kind` and a children snippet, reads `editorStore.activeTab` for the name and calls the store setter, needs no new props on the three views. `core/layout` importing `core/editor` is inside one layer. While a view is mounted its tab is never in source mode, so the view's own header always shows "Switch to source mode"; only EditorView's source-mode row shows the "back" label.
5. **Help pages and ADR missing from T1.** The per-tab flag and the new position contradict `help/documentation/03-editor.md:107` ("bottom right ... resets when you switch tabs") and `:85`, `12-views.md:188` ("bottom-right corner"), `11-canvas.md:108` (already stale: says bottom-right, the code says top-right), and `20-keyboard-shortcuts.md:30` / `03-editor.md:51,72` (Cmd+\ is "Raw" only). ADR-0033 Consequences says "Raw moves from Cmd+K to Cmd+\" (`docs/adr/0033-...md:102-103`); extending Cmd+\ to the tab's own source mode is one amendment sentence.
6. **"Periodic notes" is the wrong recommended name.** The navigator already has a section labelled "Periodic notes" (`CalendarNavigator.svelte:142`), so the header and the section would read the same. The navigator also lists every note dated the picked day, not only periodic notes (`day-lens.logic.ts:30-40`; help `08-periodic-notes-and-calendar.md:40`). The scout's argument against "Journal" is inverted: the default periodic formats name the files `_journal-day-...`, `__journal-week-...` (`settings.store.svelte.ts` defaults), which argues for "Journal", not against it. Recommended: "Days" (you pick a day and see that day's notes; it pairs with "Today"). The help already explains the two calendars (`27-calendar.md:217-225`), so the rename is a small quick win, not a fix of a missing explanation.
7. **The finders-ux 06 comment goes stale with the rename.** `commands.ts:253-254` says an idle Undo "would outrank 'Go to Calendar' for 'cal'". After the rename there is no "Go to Calendar", so the comment must be rewritten in the rename ticket (CLAUDE.md: update comments the change makes wrong). Only `calendar-rail.service.test.ts:45` asserts the real label; `Rail.test.ts:95,104,129,653`, `rail-items.logic.test.ts:26,54`, `LayoutSection.test.ts:55`, `lens.logic.test.ts:960,994`, `commands.test.ts:572` are fixtures with their own label and need no change. Do not rename the "Calendar" heading of `20-keyboard-shortcuts.md` (`event-calendar-keys.logic.test.ts:236` reads it; it is the Calendar tab's section).
8. **"Views" is taken.** The prototype names the tab-entry section "Views". The Types navigator already has a "Views" section for `.view` files (`TypesNavigator.svelte:251`), and the palette has "Open view: <view>" commands. A rail section "Views" holding Tasks, Graph and Tags would mean something else. Use another title (recommended "Tabs").
9. **P36 tab entries hit ADR-0033's re-evaluation trigger.** The ADR ends with "a new top-level area needs a rail slot that does not fit the lens model" (`0033-...md:221-222`). The amendment must say it is that case, not only "a third non-lens kind". Graph is a plugin: hard-coding a `graph` key in `features/rail-shell/rail-items.logic.ts` is fine for a key, but the opener and the icon must stay outside `rail-shell` (`rail-shell.boundary.test.ts`); `app/rail-navigation.ts` may import the plugin.
10. **P37's focus will likely be stolen by the palette's close.** The scout left this as unread. bits-ui's `FocusScope.unmount()` calls `#handleCloseAutoFocus()`, which focuses the element that had focus before the dialog opened (`node_modules/bits-ui/dist/bits/utilities/focus-scope/focus-scope.svelte.js:56-62, 93-112`). The content unmounts after the exit animation, so after `executeCommand` (`CommandPalette.svelte:41-51`) has already run the action and the list's `$effect` has focused a row. The fix is `onCloseAutoFocus` with `preventDefault()` when the command moved focus; the app already uses that hook (`EventDialog.svelte:192`, `TasksView.svelte:896`). `Command.Dialog` does not forward it to `Dialog.Content` today (`src/lib/components/ui/command/command-dialog.svelte`), so that file is in the ticket. The e2e is required, not optional. Unverified side note: palette "Search in Vault" uses the same seam and may already lose focus the same way; the e2e should cover it too.
11. **"New note here" cannot both be gated and "show the panels first".** `RailNoteList` unmounts while the panels are hidden (`AppShell.svelte:207-247`, `{#if settingsStore.layout.railPanelsVisible}`), so the `canCreate` it would publish is either stale or cleared. Scout T5 criterion 4 contradicts criterion 3. Recommended: the list publishes `canCreate` while mounted and clears it on destroy, so the command is not listed while the panels are hidden. Drop "shows the panels first".
12. **Two lists, not one, and the grouped one is not all rows.** `RailNoteList` has two `VList`s: grouped (`:816-841`, with header, empty and Today-section items) and flat (`:881-888`). "The first row always is mounted" is false after a scroll, and in the grouped Today list the first item can be a section component. The target is the first mounted `[data-note-row]` or the active row. nl-actions-keyboard ticket F (roving list, `keepMounted`, current row, both VLists) owns exactly this focus logic in the same component. Landing P37 first means F rewrites it. Recommended: V6 is blocked by F and calls F's "focus the current row"; that removes the interim target logic from V6.
13. **Rail click versus palette.** Bumping the request inside `selectRailItem` also fires on a mouse click on the rail (`AppShell.svelte:203`). In the Tauri WebKit view a clicked button does not take focus, so today a rail click leaves focus in the editor; the bump would pull it into the list. The proposal's problem is "After Go to X". Recommended: bump from the palette's Go to and Open view commands (`commands.ts` `railGoToCommands`, and the `openRailView` path `rail-navigation.ts:32-38`, which the scout missed), not from the rail click.
14. **Collision with nl-header-creation N4.** N4 renames the palette's "New File" to "New note" and, in its part 2, makes it follow the Files pick ("New note in Projects/"). A P37 "New note here" next to that is two commands that do the same thing on the Files lens. The ticket must name the overlap and land after N4 or agree one label rule. The note-list button keeps its accessible name "New here" (N4's scout point 7).
15. **Missed overlap: open-itens 027 (data loss, canvas).** `027-unparseable-canvas-opens-error-state-never-overwritten.md` (ready-for-agent, ledger `todo`, blocked by 004 done and 026 todo) adds an error panel in `CanvasInner.svelte` with "switch to source mode to repair it", which the review re-files as P07 (not in this batch). The canvas header ticket edits the same component and must keep the header and its toggle outside any error branch, so 027's action can call the same store setter. It is not replaced by anything here: it stays a data-loss bug with no owner in a live folder; flag it to the owner.
16. **Partial overlaps must not be wontfixed whole.** 140's label half (the four `.view` toolbar buttons, `CollectionView.svelte:593-668`) is absorbed by V1. Its table-row keyboard (`CollectionTableView.svelte:44-58`) and collection calendar halves are owned by no ticket in this batch; P22 (not in this batch) also covers the same labels. 196's `CanvasToolbar.svelte:55` line disappears with V2, but its context menu, pickers, edge labels and ColorPicker items stay. Neither Issue should get wontfix only because of these tickets.

Confirmed as the scout states: no other mount of KanbanView, CollectionView, CanvasView or CanvasToolbar (grep of imports); `pane-toolbar.test.ts:46-50` requires exactly one class list per listed file, so a view that delegates to `ViewHeader` leaves `TOOLBARS`; xyflow `fitView` comes from `useSvelteFlow()` (`CanvasInner.svelte:67`), so canvas controls must render inside the provider; a real canvas mounts in jsdom (`canvas-tab-switch.test.ts`); `NoteRowMenu.svelte:255-266` gates frontmatter writes on `isMarkdownFile`, and `.kanban` is its own extension (`fs.logic.ts:81-83`), so Favorite and Pin stay off; the NoteActionBar Raw button has both `aria-pressed` and a state label (`NoteActionBar.svelte:173-181`), which is the house pattern for the new toggle; `formatShortcut` has no `Digit` entries in `CODE_DISPLAY_MAP` (`utils/keybindings.ts`), so a `code: 'Digit1'` binding prints "Digit1" until the map grows; open-itens 146 records usage in the AppShell click handler, not in `selectRailItem` (`146-...md:56-58`), so it is a dependency only; 087 is unaffected as long as the Graph entry calls `openGraphTab` (it captures the center, `graph-view.service.ts:24-36`).

## Ticket breakdown

Order: V1 -> V2. V4 -> V5 -> V7. nl-actions-keyboard F -> V6 (and after nl-header-creation N4 for the command label). V3 last, after V1, sh-tabs (P98, `AppShell`, `EditorTabs`), nl-header-creation (P33, `RailNoteList` header) and sh-empty-zoom-status (P97, `EditorView.svelte:155-157`). Quick wins: V4 (S), V3 (S).

### V1. Kanban and `.view` tabs get a title row with their source toggle; source mode is per tab and Cmd+\ flips it (P18 parts 2 and 3, non-canvas). Size M

**Files:** `src/lib/core/editor/editor.types.ts` (`sourceMode?: boolean`), `editor.store.svelte.ts` (setter + `activeTabSourceMode` getter), `editor.service.ts` (`toggleSourceMode` routing), new `src/lib/core/layout/ViewHeader.svelte`, `src/lib/app/EditorView.svelte` (local flags and reset effect removed; kanban and `.view` floating buttons removed; source-mode row; canvas floating button and the text-file button stay, the canvas one now bound to the store), `src/lib/plugins/kanban/KanbanView.svelte`, `src/lib/features/collection/CollectionView.svelte` (header in all three branches; names on the four icon buttons), `src/tests/lib/pane-toolbar.test.ts`, help `03-editor.md`, `12-views.md`, `11-canvas.md`, `20-keyboard-shortcuts.md`, `docs/adr/0033-...md` (one amendment sentence).

**Blocked by:** none. Shares `editor.types.ts`/`editor.store.svelte.ts` with sh-history-breadcrumb (P35 history, other lines) and `EditorView.svelte` with P97 (`:155-157`) and V3 (`:154`).

**What to build:**
- A tab-level `sourceMode` flag, set through one store method, read by `activeTabSourceMode`. Default off. Per tab: switching tabs keeps each tab's own flag (owner question 1).
- `toggleSourceMode()`: active tab kanban, canvas or collection: flip that tab's flag, leave `isLivePreview`. A virtual tab: nothing. Anything else: today's `isLivePreview` flip.
- `ViewHeader`: the single `pane-toolbar` class list, a crumb `<kind> › <name>` (name = `basename(path)` as the note crumb does today; P102 may later share a helper that drops extensions), a children snippet for the view's own controls, a divider and the source button at the end with `aria-pressed`, a state label and "(Cmd+\)" in its title, following the NoteActionBar Raw button. Labels kept for the e2e: "Switch to source mode", "Switch to board view", "Switch to table view" (and "Switch to canvas view" for V2). The crumb truncates (`min-w-0 truncate`); no `flex-wrap` (`pane-toolbar.test.ts:30`).
- KanbanView and CollectionView render `ViewHeader` around their controls. CollectionView renders it in the parse-error and "Building index..." branches too, so the toggle is there when the user needs to repair the YAML. EditorView renders it (name + back toggle only) above `MarkdownEditor` when a kanban, canvas or `.view` tab is in source mode.
- The four `.view` icon buttons (calendar settings, sort, filter, properties) get `aria-label` and `title` (open-itens 140, label half).
- No Favorite, Organized or Pin on these tabs.

**Acceptance criteria:**
- [ ] Failing test first, `src/tests/lib/core/editor/editor.store.test.ts`: on two open kanban tabs, setting A's flag makes `activeTabSourceMode` true right after the write while A is active and false when B is active; `updateTabPath` keeps it on the renamed tab; `togglePin` keeps it; `removeTab` then re-adding the same path gives false; `reset()` clears it.
- [ ] Failing test first, `editor.service.test.ts` (real `editorStore`): `toggleSourceMode()` with an active kanban, canvas or collection tab flips only that tab's flag and leaves `isLivePreview` true; with a Tasks, Tags, Graph or Calendar tab it changes nothing; with a Markdown tab it flips `isLivePreview` as today (the existing case at `:1086` stays green). The kanban and virtual cases fail today.
- [ ] Failing test first, `EditorView.test.ts` (real stores and views, only Tauri and the icon-data module mocked as the file does today): a kanban tab and a `.view` tab each render one `pane-toolbar` row with the file name and exactly one button named "Switch to source mode"; no `absolute` toggle remains for them. Clicking it shows `.cm-editor` under a row with the name and "Switch to board view" (or "Switch to table view"); clicking that returns to the view. Replaces the kanban and `.view` cases at `:313-332`; the canvas case keeps its aria labels and now toggles through the store.
- [ ] Regression: Cmd+\ path on a kanban board, then open a Markdown note: the note opens in live preview (`isLivePreview` true, NoteActionBar Raw `aria-pressed="false"`).
- [ ] A `.view` tab whose YAML does not parse, and one whose index is still building, show the title and the toggle, and the toggle reaches source mode.
- [ ] Per tab: kanban A in source mode, switch to note B, back to A: A is still in source mode, B is not.
- [ ] The four `.view` icon buttons are found by role and name in `CollectionView.test.ts`; `CollectionView.view-writes.test.ts`, `CollectionView.restored-view.test.ts` and `KanbanView.test.ts` stay green.
- [ ] `pane-toolbar.test.ts` lists `ViewHeader.svelte` instead of the files that no longer carry a class list (commit says why); `chrome-state-styles`, `chrome-type-scale` and `menu-item-anatomy` scans pass.
- [ ] Help and ADR sentences above updated; `e2e/specs/kanban-view.spec.ts` and `canvas-view.spec.ts` pass via `bash scripts/e2e.sh`.
- Gate: `pnpm check` + `pnpm vitest run`.

### V2. The canvas tab gets the title row with its add buttons and toggle; the 118 px offset goes away (P18 part 2, canvas). Size M

**Files:** `src/lib/features/canvas/CanvasInner.svelte` (header inside the provider above `.canvas-container`; the `CanvasToolbar` call at `:689`), `CanvasToolbar.svelte` (becomes the header's add-button group or is deleted), `CanvasView.svelte` (flex column if needed), `src/lib/app/EditorView.svelte` (canvas floating toggle removed), `help/documentation/11-canvas.md`, `03-editor.md:107`.

**Blocked by:** V1 (`ViewHeader`, store flag, routing). Coordinate with open-itens 027 (same component, see point 15) and 196 (its `:55` item disappears).

**What to build:** `ViewHeader kind="Canvas"` rendered in `CanvasInner` with the five add buttons (same callbacks: `addTextCard`, file picker, link input, image picker, `addGroup`), named by `aria-label` and `title`. The vertical stack and `bottom: 118px` go. xyflow `Controls` and `MiniMap` stay (owner question 3). The header stays outside any future error branch.

**Acceptance criteria:**
- [ ] Failing test first, new `src/tests/lib/features/canvas/CanvasHeader.test.ts` (real `CanvasView` with its `SvelteFlowProvider`, jsdom stubs and Tauri mocks as `canvas-tab-switch.test.ts` does): the canvas renders one `pane-toolbar` row with the file name, the five add buttons by accessible name and one "Switch to source mode" button; no `.canvas-toolbar` element remains; `CanvasToolbar.svelte` (if kept) has no `118px` and no `position: absolute`.
- [ ] Clicking "Add text card" adds a node to the real canvas state and calls `onJsonChange` with JSON holding it (assert the JSON, not only the call).
- [ ] Canvas source mode shows EditorView's row with the name and "Switch to canvas view"; Cmd+\ (through `toggleSourceMode`) flips it; the minimap and `Controls` still render.
- [ ] `EditorView.test.ts` canvas case (`top-3`) is replaced by the header assertions; `e2e/specs/canvas-view.spec.ts` passes via `bash scripts/e2e.sh`.
- Gate: `pnpm check` + `pnpm vitest run`.

### V3. One `pane-band` utility for the ten top-band copies (P18 part 1). Size S

**Files:** `src/app.css`, `EditorTabs.svelte:46` (and its `<style>` `:118-122`), `AppShell.svelte:256,276`, `EditorView.svelte:154`, `CalendarNavigator.svelte:88`, `SearchPanel.svelte:157`, `FilesNavigator.svelte:305`, `RailNoteList.svelte:699`, `TypesNavigator.svelte:217`, `Rail.svelte:270`; new `src/tests/lib/pane-band.test.ts`; `EditorView.test.ts:375-383`, `Rail.test.ts:187,190`, `SearchPanel.test.ts:105`.

**Blocked by:** none logically; land after V1, sh-tabs P98, nl-header-creation P33 and P97 (one class line in each of their files).

**What to build:** `@utility pane-band` = `h-10 shrink-0 bg-tab-bar` plus the divider inset shadow. Each site keeps only what is not height, background or divider (`sticky top-0 z-10`, `pl-[var(--rail-header-pad)]`, `items-end pt-1 px-1 gap-0.5` for the tab strip, flex and gap for headers).

**Acceptance criteria:**
- [ ] Failing test first, `pane-band.test.ts` (source scan modelled on `pane-toolbar.test.ts`): the utility applies `h-10`, `shrink-0`, `bg-tab-bar` and the inset divider shadow; no `class` list in `src/lib` outside `components/ui` combines `h-10` with `bg-tab-bar`; no inline `box-shadow: inset 0 -1px 0 var(--divider)` remains; each of the ten sites uses `pane-band` with no height, background or border override.
- [ ] The four existing assertions are moved on purpose to `pane-band` (class present, style gone); the commit says they move with the recipe.
- [ ] `RailNoteList.test.ts` contrast cases (`:253`, `:1160`) and `AppShell.test.ts` stay green.
- Gate: `pnpm check` + `pnpm vitest run`. Not covered by tests: the by-eye check in light and dark themes (say so in the commit).

### V4. The day navigator stops being called "Calendar" (P36 part 1). Size S

**Files:** `src/lib/plugins/calendar/calendar-rail.service.ts:28`, `CalendarNavigator.svelte:92`, `src/lib/app/commands.ts:253-254` (comment), `src/tests/lib/plugins/calendar/calendar-rail.service.test.ts:45`, help `08-periodic-notes-and-calendar.md:18-20,40`, `27-calendar.md:15,217-225,236`, `01-getting-started.md` (rail list), `06-search-and-navigation.md:63`, `19-settings.md` (Layout rows), `20-keyboard-shortcuts.md:121` (Go to list only), `26-theming.md:129`, ADR-0033 Decision wording (`:34,37`).

**Blocked by:** owner question 2 (the name). None in code.

**What to build:** the new label (recommended "Days") on the registration and the navigator header; keys stay (`calendar`, `data-rail-item="calendar"`, `rail:go-to:calendar`, `RAIL_ITEM_COLORS`), so saved layouts and usage ids are untouched. The in-panel "Periodic notes" section label and "Open Calendar tab" stay.

**Acceptance criteria:**
- [ ] Failing test first, `calendar-rail.service.test.ts:45`: the registered navigator is `['calendar', '<new name>']`.
- [ ] `commands.test.ts`: over the real registration, the palette lists "Go to <new name>" and "Toggle Calendar View" and no "Go to Calendar"; finders-ux 06 gating and categories unchanged.
- [ ] The `commands.ts:253-254` comment no longer names "Go to Calendar".
- [ ] `e2e/specs/rail-shell.spec.ts:949-1011` (selects by `data-rail-item`) and `calendar-plugin.spec.ts` pass via `bash scripts/e2e.sh`; the "Calendar" heading of `20-keyboard-shortcuts.md` is unchanged (`event-calendar-keys.logic.test.ts:236`).
- Gate: `pnpm check` + `pnpm vitest run`.

### V5. Tasks, Graph and Tags get rail entries that open their tab (P36 part 2). Size M, needs-triage

**Files:** `src/lib/features/rail-shell/rail-items.logic.ts` (a `tabs` group and keys, colours), `rail-shell.types.ts` only if `RailItem` needs a marker, `Rail.svelte` (section, icons from lucide, active while the tab is active), `LayoutSection.svelte` (`GROUPS`), `src/lib/app/rail-navigation.ts` (branch that calls `openTasksTab` / `openGraphTab` / `openTagsTab` and writes no layout), `src/lib/app/commands.ts` (filter tab items out of Go to), `docs/adr/0033-...md` (amendment), help `01-getting-started.md`, `07-sidebar-panels.md:98-100`, `19-settings.md`.

**Blocked by:** V4 (same help and ADR lines); owner questions 4 and 5.

**What to build:** a rail section (title "Tabs", not "Views", point 8) after Browse with the three entries. A click opens or focuses the tab (never toggles it closed) and leaves `layout.railItem` alone, like a pin that opens in the editor. Hideable and reorderable in Settings > Layout. No Go to command for them (the Toggle commands exist).

**Acceptance criteria:**
- [ ] Failing test first, `rail-items.logic.test.ts`: the tab items sit in their own group after the navigators, honour `railHidden` and `railOrder`, and `moveRailItem` keeps them in their group.
- [ ] Failing test first, `rail-navigation.test.ts` (real `editorStore` and `settingsStore`): selecting Tasks makes the Tasks virtual tab active; a second select keeps it open and active; `layout.railItem` and `railPanelsVisible` are unchanged.
- [ ] `Rail.test.ts`: the three rows render in every rail form; Tasks is `aria-current` while the Tasks tab is active and not otherwise.
- [ ] `LayoutSection.test.ts`: the group is listed with show/hide and move; default visibility per owner question 4.
- [ ] `commands.test.ts`: no "Go to Tasks", "Go to Graph", "Go to Tags"; count literals change on purpose.
- [ ] `rail-shell.boundary.test.ts` passes (no plugin import in `rail-shell`); `e2e/specs/rail-shell.spec.ts:328-346` passes.
- [ ] ADR-0033 amendment names the re-evaluation trigger it meets; help pages updated (Tags is no longer palette-only).
- Gate: `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh`.

### V6. Palette "Go to X" lands focus in the note list, and "New note here" becomes a command (P37 parts 1 and 2). Size M

**Files:** new `src/lib/features/rail-shell/rail-list-requests.store.svelte.ts` (focus request counter and handled marker, `canCreate`, new-here request), `src/lib/features/rail-shell/RailNoteList.svelte` (consumers; publishes and clears `canCreate`), `src/lib/app/commands.ts` (Go to and Open view bump the request; the new command), `src/lib/features/command-palette/CommandPalette.svelte` and `src/lib/components/ui/command/command-dialog.svelte` (`onCloseAutoFocus`), help `06-search-and-navigation.md`, `20-keyboard-shortcuts.md` (Commands Without Shortcuts), ADR-0033 palette amendment sentence.

**Blocked by:** nl-actions-keyboard F (roving list: the focus target and both VLists, point 12). Land after nl-header-creation N4 or agree the label (point 14). Shares `commands.ts` with V4, V5 and sh-menus-settings. open-itens 142 (New here type from a compound filter) is inherited, not a blocker.

**What to build:** the request seam of `search.store.svelte.ts:24-77` / `SearchPanel.svelte:24-34` (counter, `untrack`, handled marker so a mount does not steal focus). The palette's Go to (list lenses only, not Search, not an `_open_in_editor` pin) and Open view commands bump it; the rail click does not (owner question 6). RailNoteList focuses F's current row on a new request, including one pending at mount. The palette does not restore focus over a command that moved it. "New note here" is listed only while the mounted list says it can create, and runs the same `handleNewHere` path.

**Acceptance criteria:**
- [ ] Failing test first, `commands.test.ts` (real stores): running "Go to Inbox" and "Open view: X" (not opening in the editor) bumps the focus request; "Search in Vault", "Go to Search" and an `_open_in_editor` view do not.
- [ ] Failing test first, `RailNoteList` mount test: after a request, `document.activeElement` is a `[data-note-row]` (the active note's row when mounted, else F's current row); a request made while the list was unmounted is honoured once at mount; an already handled request is not replayed on remount; an empty list focuses nothing and does not throw.
- [ ] Failing test first: with the list mounted on Inbox, the palette lists "New note here"; running it creates the note through the real `createNoteHere` (only Tauri `fs` mocked) and the new tab is active. On Search, on a view whose toolbar is not ready, and while the panels are hidden (list unmounted), the command is absent.
- [ ] e2e via `bash scripts/e2e.sh`: open the palette from the editor, run "Go to Inbox", and the focused element is a note row (fails without the `onCloseAutoFocus` change); run "Search in Vault" and the search input is focused.
- [ ] Count literals in `commands.test.ts` change on purpose.
- Gate: `pnpm check` + `pnpm vitest run`.

### V7. Direct keys for rail items (P37 part 3). Size M, needs-info

**Files:** `src/lib/app/global-keybindings.ts` (nine bindings by `code: 'DigitN'`), `src/lib/utils/keybindings.ts` (`CODE_DISPLAY_MAP` digits), `rail-items.logic.ts` (pure index helper), `Rail.svelte` (hints), `src/lib/app/rail-navigation.ts`, ADR-0033, help `20-keyboard-shortcuts.md`, `01-getting-started.md`.

**Blocked by:** owner questions 7 and 8; V5 (the item list the digits index); V6 only if a key should also move focus.

**Acceptance criteria:**
- [ ] Failing test first, `rail-items.logic.test.ts`: the helper maps the visible rail order (hidden skipped, `railOrder` respected, pins and tab entries counted per the decision) to digits 1..9, nothing past nine.
- [ ] Failing test first, `global-keybindings.test.ts`: the chosen chord with digit N selects the Nth visible item through the real `settingsStore`; Cmd+1 and Cmd+2 still hide and show the panels; `formatShortcut` prints the digit, not "Digit1".
- [ ] `Rail.test.ts`: the first nine rows show their hint in labeled and captioned forms, none collapsed.
- [ ] ADR-0033 amendment and help list the keys. Not testable: collisions with macOS Mission Control or Parallels.
- Gate: `pnpm check` + `pnpm vitest run`.

## open-itens Issues each ticket replaces

| Issue | Status | Ticket | Decision |
|---|---|---|---|
| 140 `.view` tab keyboard and labels | ready-for-agent, ledger `todo`, blocked by 139 | V1 | Label half only. Its row keyboard and collection calendar halves have no owner in this batch: do not wontfix 140 until they move (edit its text to drop the labels instead). |
| 196 canvas theme tokens | ready-for-agent, blocked by 195 | V2 | Not replaced. Only its `CanvasToolbar.svelte:55` item goes away. |
| 027 unparseable canvas never overwritten | ready-for-agent, blocked by 004 (done), 026 | V2 | Not replaced (P07, not in this batch). Same component; V2 keeps the header outside any error branch. Data-loss bug, flag to the owner. |
| 207 chrome icon buttons | ready-for-agent | none | Dependency (P21 kit ancestor; rail, tab band, action bar, note-list header, not the view headers). |
| 071, 136, 146, 148, 142, 153, 154, 101 | ready-for-agent | none | Dependencies or boundaries, as the scout says (101: board-view restore could read V1's flag later). |
| 206 | wontfix | none | Empty and error states of these views are not claimed. |
| 215 (ready-for-agent; the scout said needs-triage), 216 (needs-info) | | none | Table header, not the pane header. Exclude. |

No open-itens Issue is fully replaced by this cluster.

## Dropped

- **P36 palette half** (Calendar category, gated Undo/Redo): already in HEAD via finders-ux 06 (resolved). The prototype's "Toggle Calendar View under Calendar" reverses 06's decision; not taken.
- **P37 merging Cmd+1, Cmd+2 and Cmd+Shift+B:** breaking shortcut change rewriting five help pages and ADR-0033 text for no new capability (owner question 9, default no).
- **P37 F6 focus cycle:** no code, no precedent, overlaps F's roving work (owner question 9).
- **P18 Favorite, Organized and Pin on these tabs:** they write frontmatter (review validation).
- **Replacing xyflow `Controls` with header zoom buttons:** kept as owner question 3, default keep.

## Owner questions

1. Source mode per tab (prototype) or reset on every tab switch (today) for kanban, canvas and `.view`? Recommended: per tab.
2. Name for the day navigator: "Days", "Journal" or keep "Calendar"? Recommended: "Days". "Periodic notes" collides with the panel's own "Periodic notes" section and undersells the day lens; "Journal" matches the default file names but suggests only journal notes.
3. Canvas: keep xyflow `Controls` (zoom and lock, bottom left) and move only the five add buttons to the header? Recommended: yes.
4. Tasks, Graph and Tags rail entries: on by default (no new setting; hideable in Settings > Layout like every item) or off (needs a new setting, since a saved `railHidden` would show them to existing vaults)? Recommended: on, hideable. Or skip V5 entirely if Cmd+Shift+T, Cmd+G and the palette are enough.
5. A Tags shortcut? Recommended: no.
6. Should a rail click also move focus into the list, or only the palette's Go to and Open view? Recommended: palette only.
7. Direct keys: Cmd+Opt+1..9, Ctrl+1..9 or none? Recommended: Cmd+Opt+1..9 by `code` if wanted (Ctrl+digit can be macOS "Switch to Desktop N"); none is a fine answer.
8. Do pins and tab entries take digits? Recommended: yes, in visible rail order.
9. Merge the three panel bindings, or add F6? Recommended: neither.
10. Title text on these tabs: file name with extension (as the note crumb today) until P102's helper lands? Recommended: yes.

## Not checked

- Nothing was run. The Cmd+\ leak and the palette focus theft are read from code (bits-ui `FocusScope.unmount` order), not reproduced; whether palette "Search in Vault" already loses focus is unverified.
- Narrow-width behaviour of the kanban row with title, three control groups and the toggle (no layout in jsdom; check by eye).
- The other clusters' final ticket order; the blockers assume sh-tabs, nl-header-creation, nl-actions-keyboard and sh-empty-zoom-status land as their scouts propose.
