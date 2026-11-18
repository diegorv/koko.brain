# Verdict: note-list header and creation cluster (P33, P38, P84)

Adversarial check of `scout-nl-header-creation.md` against HEAD `ab143a411`. Read-only: I opened every cited source line I rely on below, the three prototype sections, both narrow screenshots, ADR 0003, 0004 and 0033, the overlapping open-itens Issues with their ledger rows, and the sibling scouts of this batch that edit the same files (`scout-nl-empty-states.md`, `scout-nl-rows-sections.md`, `scout-sh-view-headers-entry.md`).

## Proposals: still real?

| ID | Real | Verified at |
|---|---|---|
| P33 | yes | Header `RailNoteList.svelte:698-801`. Title `min-w-16 flex-1` (`:705`), count hidden below 12 rem (`:707`), every icon button `shrink-0` with `p-1` and a `size-3.5` icon (22 px), `gap-1`. Five controls on a type lens (Sort, Search, Properties, Archive, "+"), on Today and the day lens (Sort, Search, Properties, header action, "+") and on a view (Sort, Search, Properties, Filter, "+"). `screens/narrow-1024x700-today-light.png` (viewed): the Today list is about 150 px wide and shows the title, sort, search and sliders icons; Daily note and "+" are clipped. |
| P38 | partial | Files header is a title only (`FilesNavigator.svelte:303-311`). Creators `:80-91`, right-click menu `:346-403`. Palette creators `commands.ts:149-193` all use `vaultStore.path`. The review's "folder and canvas exist only on right-click" is wrong: `file-explorer:new-folder` and `canvas:new` exist. Names drift: "New Canvas", "New Kanban Board" (`kanban.service.ts:30`) next to "New note", "New table". |
| P84 | yes | Rail Filter trigger is tint only (`RailNoteList.svelte:754-760`, no count although `activeFilterCount` exists at `:174`). Archive is tint plus the mode in `title`/`aria-label` (`RailArchivedMenu.svelte:34-41`). `CollectionView.svelte:620-669`: Sort and Filter tint, Columns has a constant class, none has a name. `activeFilterCount` at `:221-225` is commented "for the toolbar badge" and no badge is rendered. No "Clear filters" anywhere in `src/lib`. |

## Where the scout is wrong or incomplete

1. **"Nothing under rail-shell or commands.ts changed since the review" is false.** The review was committed at `bb57e6165` (2026-11-17 13:20). After it, `2063e2bfe` (16:57, finders-ux 07) removed 20 lines from `RailNoteList.svelte` (the `KIND_ICONS` move) and `90ccfc691` (16:36, finders-ux 06) changed `commands.ts`. That is why every review line number in `RailNoteList.svelte` is off by about 16. The scout's own line numbers are at HEAD and check out; only the sentence is wrong.

2. **The overflow menu (N3) buys almost nothing; the title floor is what loses "+".** From the classes, with the Display fold in place:
   - Type lens: Search, Display, "+" (3 buttons). The prototype's narrow layout is Search, More, "+": also 3 buttons. Zero saved.
   - View lens: Search, Filter, Display, "+" versus Search, Filter, More, "+": 4 and 4. Zero saved.
   - Today and the day lens: Search, Display, Daily note, "+" (4) versus Search, More, "+" (3). One 22 px slot saved, on two lenses.
   
   What actually clips "+" at 150 px is the 64 px title floor plus 24 px of padding. The prototype says so itself: "At 150 px the title keeps about 38 px, so it truncates" (`note-list-rail.html:336`), with `min-width: 0` on the title and 8 px side padding and a 2 px gap below 220 px (`:136-137,153-157`). Arithmetic for Today as the first pane (left pad `--rail-header-pad` = 12 px beside the default labeled rail): 12 + 8 right + 4 buttons 88 + 4 gaps 8 = 116 px, which leaves the title 34 px at 150. Every lens fits at 150 px with the fold plus that narrow rule and no overflow menu. N3 as scouted is an M ticket with a new component, a second anchor for the Display panel, and a three-width e2e, for one icon on two lenses. Fold it into the header ticket as a container-query rule; keep the overflow menu only as the owner's alternative (question 1).

3. **N3 acceptance criterion 4 cannot pass as written.** "Title width at least the minimum" at 150 px with Search, More and "+" pinned: 12 + 12 + 64 + 66 + 12 = 166 px. The 64 px floor and the 150 px target are incompatible; the prototype drops the floor there. The existing e2e (`rail-list-toolbar.spec.ts:240-280`) asserts the floor at about 220 px only, so a narrow rule that applies below the 220 px container keeps it green.

4. **The first-pane pad is larger than "a larger left pad".** `railHeaderPad = max(12, 120 - railWidth)` (`rail-items.logic.ts:193-195`), `railFormWidth` is 48 collapsed and 84 captioned (`:178-181`). So a first-pane list header pads 72 px beside a collapsed rail and 36 px beside a captioned one. No layout fits a five-control header at 150 px beside a collapsed rail (72 + 8 + 66 + 6 = 152 even with an overflow). The guarantee must name the rail form: 150 px with the labeled rail; the collapsed-rail case is the one `rail-styles.spec.ts:532-548` already pins at the default list size (Sort and Search do not overlap), and it must stay green with the Display trigger in Sort's place.

5. **Owner question 3 (below 150 px, raise `minSize`) is already decided.** ADR 0033's amendment of 2026-11-06, "default sizes are the minimums", records that the owner wants every pane to open at its 3 % minimum and drags them to size per monitor. Raising `minSize` would reverse an ADR. Out of scope; drop the question.

6. **Owner question 6 (merge New table and New view) is already decided.** ADR 0004's amendment states the Files folder menu offers New table (`Untitled.view` with `_visible: false` and `_open_in_editor: true`) next to New view. The scout reached the right answer ("keep both") from the code; cite the ADR and drop the question.

7. **"Clear filters" in `FilterPanel` would also appear in two places that must not have it.** `FilterPanel` has four consumers, not two: the rail (`RailNoteList.svelte:766`), the `.view` tab (`CollectionView.svelte:654`), the New view / Edit view dialog (`ViewDialog.svelte:202-210`) and every auto-organize rule (`AutoOrganizeRuleRow.svelte:332-340`, `showGlobal={false}`, `onGlobalFiltersChange={() => {}}`). In the rule editor a one-click clear would save the rule with an empty expression through `commitFilter` (`:168-171`); `filterProblem` then makes the rule match nothing (`auto-organize.logic.ts:38-46`), which silently disables a hand-written rule. The button must be opt-in (an optional `onClear` prop, rendered only when passed), and only the rail and the `.view` tab pass it. The scout's criterion "Clear filters is present with rows" would add it to the rule editor and the dialog.

8. **The `.view` toolbar triggers are buttons nested in buttons, so "the Filter button's accessible name" is ambiguous.** `PopoverTrigger` is bits-ui's trigger (`components/ui/popover/index.ts`), which renders its own `<button>`, and each wraps a shadcn `<Button>` with no `child` snippet (`CollectionView.svelte:594-602, 621-628, 644-651, 666-670`). Two tab stops per control; a name put on the inner `Button` is not on the element the trigger toggles. The scout's criterion 3 could pass on the inner button while the focusable trigger stays nameless. This is review P87 (`review.md`, "Interactive controls are nested inside other interactive controls"; evidence `CollectionView.svelte:594-670`), which belongs to the feedback-components prototype, not this batch. The ticket that names these four buttons must fix the nesting (the `child` snippet) in the same change; record that P87's `CollectionView` part is absorbed here.

9. **A hidden-column count is noisy; use a dot.** With a saved `order`, "hidden" is `allColumns` minus `order`, and `allColumns` is every vault property plus formulas (`CollectionView.svelte:227-230`). A hand-written three-column `order` would read "Columns, 40 hidden". Without an `order` the table infers its columns (open-itens 139) and the user hid nothing. Recommended: a dot, true when `localColumns` is defined and leaves out at least one of `allColumns`, and a name "Columns, some hidden". No count.

10. **A view's filter badge is a constant, not a change marker.** On a view lens and in the `.view` tab, the seeded filter rows are the view's definition. A view with three filters always shows "3". That is fine (Obsidian Bases does the same) but the help text and the criterion must say the badge counts the view's filters, not "filters you changed". It also sharpens owner question 5: "Clear filters" there rewrites the view's definition, and every toolbar write drops the file's YAML comments (open-itens 071, `docs/agents/view-files.md:155`).

11. **Help locations.** `01-getting-started.md:112` describes Sort, Search and Show in note list but never the Archive menu; the rail's Hide / Show / Only archived menu is undocumented (grep of `help/documentation` for "Only archived" is empty). The `.view` tab toolbar is `12-views.md` § Toolbar (`:60`), not `25-types-and-relationships.md`. The rail view toolbar is `25-types-and-relationships.md:461-465` § Inline Filter and Sort Toolbar. `21-kanban.md:15` says the palette's board is created "in your current folder", which is false at HEAD (it is the vault root, `commands.ts:183-191`); it contradicts `02-file-explorer.md:20`.

12. **Label rename consumers.** Missed: `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts:895` asserts `['New Kanban Board']`; `help/documentation/25-types-and-relationships.md:296` names "the palette's **New File**". Overstated: no e2e looks up "New Canvas", "New Kanban Board" or any palette creator label (grep of `e2e/`); the Files-menu e2e lookups are "New note" and "New table", which do not change. Palette recents are keyed by command id (`command-palette.logic.ts:7-21`), so a label change keeps them. Palette search matches the label only (`:38`), so "New board" would stop matching "kanban"; the scout's default "New kanban board" stands.

13. **The ResizeObserver stub cannot drive a header width.** `RailNoteList.toolbar.test.ts:12-32` reports `width: 240` for every observed element, for virtua. A script-measured fold would need its own stub. With the CSS rule recommended in point 2, jsdom cannot see it at all, so the failing test for the narrow behaviour is the e2e.

14. **Sort is not `shrink-0`.** `RailSortMenu.svelte:106` is `min-w-0 max-w-full`; the trigger box shrinks while its arrow does not (that is what `rail-styles.spec.ts:542-546` checks). Irrelevant once Sort moves into Display, but the scout's "everything else is `shrink-0`" is not exact.

15. **Missed overlaps in this batch.**
    - sh-view-headers-entry T1 (P18) moves the `.view` toolbar into a shared `ViewHeader` and also claims to replace open-itens 140's label half for the same four buttons (`scout-sh-view-headers-entry.md:210`). Two clusters cannot both replace that bullet. Recommended: this cluster owns the names (they carry the counts), and P18 T1 moves the buttons as they are. Run T1 here first, then P18 T1.
    - sh-view-headers-entry T3 (`pane-band`) rewrites the header band class list of `RailNoteList.svelte:699` and `FilesNavigator.svelte:305`, the two header divs T2 and T3 here edit. Textual only; run in series.
    - sh-view-headers-entry T5 (P37) adds a "New note here" palette command that follows the shown lens and publishes `canCreate` from `RailNoteList`. That command is what P38's "creation commands follow the active lens" asks for, for notes. It is the reason to keep the palette's other creators at the vault root (owner question 2).
    - nl-empty-states T1 (P29) reads `activeFilterCount` and offers "Edit filters" in the filtered empty state, leaving "Clear filters" to P84 (`scout-nl-empty-states.md:100,131`). Consistent with T1 here; land in either order, not in parallel (same file).
    - nl-rows-sections T3 (folder counts) edits `FilesNavigator.svelte` folder rows (`scout-nl-rows-sections.md:127`); T3 here edits its header and creators. Serial.
16. **Missed overlaps in open-itens.** 154 (inline title, ready-for-agent, ledger `todo`) edits the same creator lines: `FilesNavigator.svelte:84` and the palette's new-file command (it cites `commands.ts:130`, now `:149-160`) to focus the title of a new blank note. The Files "+" menu reuses that creator, so 154's hook covers it; sequence only. 071 (comments lost on toolbar writes) is context for Clear filters.

Checked with no further overlap: 012 (cites `FilesNavigator.svelte` for its `ask` pattern only), 059 (New File from Template), 164 (wontfix), 174 (browser host), the remaining live folders (tasks-view-ux, frontmatter-rules, vault-organization-v2, preview-channel, claude-code-integration, mods-host-robustness). The scout's overlap table (207, 140, 134, 132, 136, 142, 013, 139, 010, 250, 137, 141, 204, 228) is accurate on status and lines.

## Grouping

The scout's N2 and N3 edit the same header lines (`RailNoteList.svelte:698-801`) and the same Display popover, and point 2 shows N3 reduces to a few container-query classes. Merge them. Move the rail Filter count badge from N2 into N1: it is three lines on a trigger the fold does not touch (`:754-760`), and it shares the badge component and the count semantics with the `.view` tab. The Archive mark goes to the Display dot (Archive moves into Display), so it is not built twice. P38 stays apart (`FilesNavigator.svelte`, `commands.ts`, the kanban registration). Result: three tickets, in order T1 then T2; T3 any time.

## Final tickets

### T1. Filter triggers show their count and can be cleared; the `.view` tab's Sort and Columns show their state (P84 except the Display dot, P87 `CollectionView` part)

- **Size:** M.
- **Files touched:** `src/lib/features/collection/CollectionView.svelte` (`:221-225` count, `:593-670` the four triggers), `src/lib/features/collection/toolbar/FilterPanel.svelte` (opt-in Clear filters), `src/lib/features/collection/toolbar/filter.logic.ts` (shared row count), `src/lib/features/collection/toolbar/properties.logic.ts` (columns-hidden predicate), `src/lib/features/type-definitions/type-note-list.logic.ts` (`countActiveFilters` delegates to the shared helper, stays exported), new `src/lib/features/collection/toolbar/ToolbarCountBadge.svelte` (count pill), `src/lib/features/rail-shell/RailNoteList.svelte` (Filter trigger `:754-760` only: badge, name, Clear wiring), help `12-views.md` § Toolbar and `25-types-and-relationships.md:461-465`.
- **Blocked by:** none. Coordinate (serial, never parallel): nl-empty-states T1 (same `RailNoteList.svelte`, reads `activeFilterCount`), sh-view-headers-entry T1 (moves these four buttons; land this first), open-itens 013 (draft rows in `FilterPanel`), 139 (columns), 071 (comment loss on writes).

**What to build:**
- A pure `countFilterRows(global, view)` in `filter.logic.ts`; `countActiveFilters` and `CollectionView`'s inline sum both use it. Rows are counted as the panel shows them, draft rows included, until 013 defines drafts.
- A pure `hasHiddenColumns(saved, all)` in `properties.logic.ts`: false when `saved` is undefined, true when `saved` leaves out at least one of `all`.
- `ToolbarCountBadge`: a 14 px pill on the trigger's corner, theme tokens only (the FilterPanel recipe `bg-primary` family), `aria-hidden` because the trigger's name carries the number. A dot variant for Columns.
- `.view` tab: the four triggers use bits-ui's `child` snippet so each control is one `<button>`; each gets `aria-label` and `title`: "Filter" / "Filter, 2 active", "Sort" / "Sort, 1 column", "Columns" / "Columns, some hidden", "Calendar settings". Badge on Filter and Sort, dot on Columns.
- Rail: the Filter trigger gets the same badge and name, and a `focus-visible` ring like its neighbours.
- `FilterPanel` gets an optional `onClear`; when passed and any row exists, it renders "Clear filters", which empties both groups through the caller. The rail and `CollectionView` pass it; `ViewDialog` and `AutoOrganizeRuleRow` do not.

**Acceptance criteria:**
- [ ] Failing test first, `src/tests/lib/features/collection/toolbar/filter-logic.test.ts`: `countFilterRows` is 0 for empty input, sums rows across global and view groups, and counts a row with an empty value. `type-note-list.logic.test.ts:392-415` still passes unchanged.
- [ ] `properties-logic.test.ts`: `hasHiddenColumns(undefined, all)` is false; a saved list equal to `all` is false; a saved list missing one is true; a saved column absent from `all` does not make it true.
- [ ] `CollectionView.test.ts` (real `collectionStore`, Tauri mocked): each toolbar control is exactly one button (no `button button` in the toolbar); with two filter rows `getByRole('button', { name: /Filter, 2 active/ })` resolves and its pill reads 2; with none the name is "Filter" and no pill renders. Same for Sort with one sort, and Columns after hiding one column (dot present, name "Columns, some hidden").
- [ ] `FilterPanel.svelte.test.ts`: without `onClear` no "Clear filters" renders even with rows; with `onClear` it renders only when a row exists and calls it once.
- [ ] `CollectionView.view-writes.test.ts`: Clear filters writes the `.view` with no `filters` on the active view and none at the top level, asserted on the written YAML, the same content removing each row produces.
- [ ] `RailNoteList.view.test.ts` (real stores): a view with two filter rows shows a Filter trigger named "Filter, 2 active" with a 2 pill; Clear filters in its panel empties the rows and the trigger reads "Filter".
- [ ] `ViewDialog` and auto-organize tests still pass, and an auto-organize rule's filter panel has no "Clear filters" (one assertion in the existing `AutoOrganizeRuleRow` test).
- [ ] `pane-toolbar.test.ts`, `chrome-state-styles.test.ts`, `palette-classes.test.ts` and `feature-cycle.test.ts` pass.
- [ ] Help: `12-views.md` § Toolbar names the four buttons, the counts and Clear filters, and says a view's badge counts its own filters; `25-types-and-relationships.md` § Inline Filter and Sort Toolbar gets the same sentence for the rail.

**Owner questions:**
- Clear filters on a view rewrites the view's definition in one click, drops the file's YAML comments (071) and asks nothing. OK with no confirmation, inside the panel only (two clicks from the header)? Recommended: yes, and not on the trigger or in the empty state (P29 uses Edit filters).
- Columns: a dot and "some hidden", not a count? Recommended: dot.

**Replaces:** open-itens 140, bullet 1 only (the four toolbar names). Its table-row and calendar keyboard bullets stay out of this ticket. Agree the owner of this bullet with sh-view-headers-entry T1 in the README.

### T2. Note-list header: one Display popover for Sort, Properties and Archive with a state dot, and "+" stays visible down to 150 px (P33, P84 Display dot, P38 note-list "+" title)

- **Size:** L.
- **Files touched:** `src/lib/features/rail-shell/RailNoteList.svelte` (header `:698-801`), `RailSortMenu.svelte`, `RailPropertiesPicker.svelte`, `RailArchivedMenu.svelte` (each split into a panel body with the trigger removed, or kept as a thin wrapper), new `src/lib/features/rail-shell/RailDisplayMenu.svelte`, help `01-getting-started.md:112`, `25-types-and-relationships.md:461-465`, `help/examples/type-definitions-features/README.md:88`.
- **Blocked by:** T1 (same header and the Filter trigger it leaves pinned). Coordinate: nl-empty-states T1 and nl-actions-keyboard (same file, other regions; serial), sh-view-headers-entry T3 (`pane-band` on `:699`) and T5 (reads `canCreate`), open-itens 134 (reuses `RailPropertiesPicker`: keep `available`, `selected`, `onChange` as they are), 132 and 136 (each adds a header control later: they go inside Display or must pass the 150 px e2e), 207 (its note-list-header clause).

**What to build:**
- One Display trigger (sliders icon, the text "Display" from about 290 px of header width) replaces the Sort, Properties and Archive triggers. Its popover hosts three sections, each the existing panel body with its own key model: Sort by (focus lands on the active row as today; Left/Right still set direction; "Multiple sort..." still closes and opens the anchored sort panel on a view), Show in note list (search, checkboxes, drag and Alt+arrows), Archived notes (only when `offersArchivedFilter`). Tab moves between sections. No sort or properties logic is rewritten.
- A dot on Display, and its name "Display options, customised", when `sortCustomized`, `selectedProperties.length > 0` or `archivedFilter !== 'active'`; otherwise "Display options". The `title` also says the current sort ("Sorted by Modified") because the header no longer shows the sort label or the `+N` extra-sort count.
- Narrow rule, CSS only on the existing `@container` header: below a 220 px container the title drops `min-w-16` to `min-w-0`, the right padding is 8 px and the gap 2 px. Above it nothing changes. The left pad of a first pane stays `--rail-header-pad`.
- On a folder lens the "+" `title` reads "New note in <folder>/" ("in the vault root" for the root). Its accessible name stays "New here" (about 10 e2e lookups, `settings-copy.test.ts:112-115` and ten help pages use it). Other lenses keep "Create a note in this list".
- The selectors `data-sort-option`, `data-sort-multiple`, `data-archived-option` stay; the trigger hooks `data-note-list-sort`, `data-note-list-properties`, `data-note-list-archived` go, and a `data-note-list-display` arrives.

**Acceptance criteria:**
- [ ] Failing test first, `e2e/specs/rail-list-toolbar.spec.ts` (run through `bash scripts/e2e.sh`): with the labeled rail, the Today list, a type list and a view list dragged to 150 px each show `[data-note-list-new]` visible and clickable (`click({ trial: true })`), Today also shows `[data-note-list-header-action]`, no header child ends past the pane edge, and the title has a non-zero width. The existing 220 px Inbox case still asserts the 64 px title.
- [ ] `RailNoteList.toolbar.test.ts` (jsdom, real stores): a type lens header has Search, `[data-note-list-display]` and "+", and no `[data-note-list-sort]`, `[data-note-list-properties]` or `[data-note-list-archived]`. Display on a type or Untyped lens shows the Archived section; on a folder lens it does not.
- [ ] The saved behaviour runs through Display unchanged: the sort cases of `RailNoteList.sort.test.ts` (settings-backed, `_list_sort`, `.view` `sort:`), the toggle and reorder cases of `RailNoteList.properties.test.ts`, and the archived cases (rows and rule line change, nothing is saved) pass after only their open step changes. No assertion is removed.
- [ ] New `RailDisplayMenu.test.ts`: on open the active sort row has focus; Tab reaches the first Properties control and then the first Archived option; Escape closes and returns focus to the trigger; on a view "Multiple sort..." closes Display and opens the sort panel, and a click on Filter then closes that panel (the e2e at `rail-list-toolbar.spec.ts:226-238` keeps passing).
- [ ] The dot and the name: absent at defaults; present after choosing a sort, after ticking a property, and after picking "Show archived"; gone again after resetting each.
- [ ] Folder lens "+" `title` reads "New note in Projects/" for a picked `Projects` and "New note in the vault root" for the root; its name is "New here" on every lens.
- [ ] `rail-styles.spec.ts:532-548` (collapsed rail, default list size) passes with Display in Sort's place; `rail-shell.spec.ts:142` (`openSortPanel`) opens Display first.
- [ ] `rail-shell.boundary.test.ts`, `layer-rules.test.ts`, `chrome-state-styles.test.ts`, `menu-item-anatomy.test.ts`, `radius-scale.test.ts` pass.
- [ ] Help: `01-getting-started.md:112` describes Display (with its three sections, the Archived one included, which no help page describes today), the dot and the narrow behaviour; the view toolbar paragraph and the examples README say Display instead of the Sort icon.

**Owner questions:**
- Below a 220 px header: the narrow rule (title may shrink below 4 characters; nothing moves) or the prototype's overflow menu (Display and Daily note move into "More")? Recommended: the narrow rule. The overflow saves one icon on Today and the day lens only and costs a component and a second panel anchor.
- Losing the sort name and `+N` from the header (they move into Display's tooltip and name). OK? Recommended: yes, as in the prototype.

**Replaces:** open-itens 207, its "note list header buttons" clause only. 207's rail, tab band, note action bar, button sizes and `text-heading` parts stay out of this ticket and are not built here.

### T3. Files header gets a "+" menu, and every creator says "New <kind>" (P38)

- **Size:** M.
- **Files touched:** `src/lib/features/rail-shell/FilesNavigator.svelte` (header `:303-311`, `fileCreators` `:80-91`, menu `:346-370`), `src/lib/plugins/kanban/kanban.service.ts:30`, `src/lib/app/commands.ts:149-193` (labels only), help `02-file-explorer.md:19-20,73`, `11-canvas.md:22-23`, `20-keyboard-shortcuts.md:107-110`, `06-search-and-navigation.md:54-57`, `21-kanban.md:5,15`, `25-types-and-relationships.md:296`, `28-mods.md:206`, `mods/07-events-and-reactivity.md:441`, `mods/13-api-reference.md:110`.
- **Blocked by:** none. Coordinate (serial): open-itens 154 (same creator lines), nl-rows-sections T3 (folder rows in `FilesNavigator.svelte`), sh-view-headers-entry T3 (`pane-band` on `:305`) and T5 / sh-menus-settings (other commands in `commands.ts`). Does not touch `RailNoteList.svelte`.

**What to build:**
- A "+" icon button at the right of the Files header (`aria-label="New in folder"`, `title` "New in <folder>/" or "New in the vault root") opening a `DropdownMenu` headed "Create in <folder>" with the same items, in the same order, as the folder context menu: the `fileCreators` (built-ins, then `railRegistryStore.folderCreators`), New view, New folder. Both menus loop over one list; the header menu acts on the picked folder (`picked.target`, the vault root when `rootPicked`) through the existing `handleNewFile`, `handleNewView` and `handleNewFolder`. Mod folder actions (`railRegistryStore.menuItems`) stay in the context menu only.
- Sentence case everywhere: "New note", "New folder", "New canvas", "New table", "New view", "New kanban board" in the Files menus, the kanban registration and the palette ("New File" becomes "New note", "New Folder" "New folder"). Command ids do not change. "New File from Template" and "Create 1:1 Note" are other flows and keep their labels.
- Palette creators keep writing to the vault root (owner question 1), as `02-file-explorer.md:20` says.

**Acceptance criteria:**
- [ ] Failing test first, `FilesNavigator.menu.test.ts`: the header has a "+" button named "New in folder"; its menu lists exactly the labels of the folder context menu minus mod items, in the same order: New note, New canvas, New table, New kanban board (registered through the real `railRegistryStore`), New view, New folder.
- [ ] With `Projects` picked, New note from the header menu creates `Projects/Untitled.md` (fs.service and Tauri mocked, nothing else), opens it, and keeps `Projects` picked; with the vault root picked it creates at the root. New folder from the header starts the inline rename of the created folder.
- [ ] After the pick changes from `Projects` to `Areas`, the header's `title` and the menu heading name `Areas`, and New note creates there.
- [ ] A picked folder that was deleted outside the app: New note from the header toasts the create failure and does not re-create the folder (`createFile` reads the parent first, `fs.service.ts:198-223`).
- [ ] Labels: `FilesNavigator.menu.test.ts:202,218,274,326`, `FilesNavigator.new-view.test.ts:111`, `kanban.service.test.ts:41`, `app-lifecycle.service.test.ts:895` and `commands.test.ts` assert the new labels; `commands.new-commands.test.ts` still creates at `${VAULT}/Untitled.*` for every id.
- [ ] `menu-item-anatomy.test.ts`, `chrome-state-styles.test.ts` and `rail-shell.boundary.test.ts` pass; e2e `rail-shell.spec.ts:836-880` and `file-operations.spec.ts:5-9` pass untouched.
- [ ] Help pages above use the new labels, and `21-kanban.md:15` says the palette creates the board at the vault root and the Files menus create it in a folder.

**Owner questions:**
- Palette destination: keep the vault root, or follow the Files navigator's pick while the Files item is active? Recommended: keep the vault root. The owner chose "typed folder or vault root, no other rule" for the quick switcher (finders-ux 02), sh-view-headers-entry T5 adds "New note here" for lens-following note creation, and the Files "+" covers the other kinds in a folder.
- "New kanban board" or the prototype's "New board"? Recommended: "New kanban board", since the palette matches labels only and "kanban" would stop finding it.

**Replaces:** none.

## Dropped

- P38's "+ menu in the note-list header": the prototype itself keeps the note-list "+" a single action ("The note-list + keeps creating a note in the listed folder"). Only its `title` change survives, in T2.
- P38's palette "New table" command and the palette destination change (scout N4 part 2): not in the proposal's text (new table command) or replaced by T3's default and sh-view-headers-entry T5 (destination). Revisit only if the owner answers T3's first question the other way.
- P33's overflow menu (scout N3): replaced by T2's narrow rule unless the owner picks the overflow.
- P84's strip under the header and "No notes match N filters" empty state: owned by nl-empty-states T1 (P29), which reads `activeFilterCount`.
- Scout owner questions 3 (below 150 px), 4 (rename "New here") and 6 (merge New table and New view): decided by ADR 0033 (2026-11-06 amendment), by the cost the scout listed, and by ADR 0004 respectively. T2 and T3 record the defaults.

## Not checked

- Nothing was run. Every width figure comes from Tailwind classes and the 150 px screenshot, not from a rendered measurement.
- I did not open `ViewDialog` or `AutoOrganizeRuleRow` test files to name the exact assertion T1 adds; whether a `.view` toolbar write leaves a file-history snapshot (an undo path for Clear filters) was not checked.
