# ux-quick-wins: ticket breakdown

Combined from the ten slice verdicts in this folder (`verdict-kanban.md`, `verdict-editor.md`, `verdict-collection.md`, `verdict-feedback-a.md`, `verdict-feedback-b.md`, `verdict-canvas.md`, `verdict-calendar-tasks.md`, `verdict-settings-a.md`, `verdict-settings-b.md`, `verdict-color.md`). Source proposals: `.scratch/design-review/review.md` (the `#### Pxx.` blocks) and `.scratch/design-review/prototypes/<group>.html`. HEAD `085b23c5d` (= origin/main), release 4.10.1. mvp-claude checked with `git diff --name-only origin/main...origin/mvp-claude`: no file a ticket below edits is on it.

Scope: only QUICK and QUICK-PART work from the 8 groups not yet ticketed (Kanban board, Editor authoring, Collection and QueryJS, Feedback and components, Canvas, Calendar and Tasks, Settings and Auto Organize, Colour contrast and theming). Every ticket is size S: one fresh agent, a few files, no Rust, no new dependency, no core save/index/watcher path, no live-preview decoration rework, no change to how `.kanban`, `.canvas`, `.view`, frontmatter or the settings schema are written. Where a ticket writes a vault or config file at all, it goes through a write path that already exists and the verdict checked it (named in the ticket).

The 61 slice tickets were merged to 47 where they share a component, primitive or token set. Most chains are serial because they share a file; the owner runs one workflow at a time, so the numbers are also the run order.

Gate for every ticket unless it says more: `pnpm check` + `pnpm vitest run`. An E2E spec is named only where a selector or an E2E assertion changes; run it with `bash scripts/e2e.sh <spec>`. Every acceptance list starts with a test that fails at HEAD.

## Counts

119 proposals: QUICK 36, QUICK-PART 66, DEFER 16, DONE 1, DROP 0 (two parts are dropped inside QUICK-PART proposals: P06 "scroll new lane into view" and P170 "Stopping...").

## ID coverage

Each ID is counted once, under the ticket that carries most of it. "Also" names tickets that build another part. `-` means no ticket (see Deferred).

| ID | Call | Counted in | Also |
|----|------|------------|------|
| **Kanban** | | | |
| P02 | QUICK-PART | 12 | |
| P03 | QUICK-PART | 01 | |
| P04 | QUICK | 03 | |
| P05 | QUICK-PART | 13 | |
| P06 | QUICK-PART | 13 | |
| P88 | QUICK-PART | 11 | |
| P143 | QUICK | 11 | lane half in 13 |
| P145 | QUICK-PART | 14 | |
| P144 | QUICK-PART | 15 | |
| P186 | QUICK | 14 | |
| **Editor** | | | |
| P10 | QUICK-PART | 07 | |
| P11 | QUICK-PART | 46 | canvas card half in 17 |
| P41 | DEFER | - | |
| P42 | DEFER | - | |
| P40 | QUICK-PART | 21 | |
| P112 | QUICK-PART | 07 | |
| P113 | QUICK-PART | 07 | |
| P114 | QUICK-PART | 08 | |
| P110 | QUICK-PART | 08 | |
| P111 | QUICK | 08 | |
| P116 | QUICK-PART | 09 | |
| **Collection and QueryJS** | | | |
| P09 | QUICK-PART | 04 | inline block half in 23 |
| P48 | QUICK-PART | 22 | |
| P82 | QUICK | 04 | |
| P49 | QUICK-PART | 25 | |
| P141 | DEFER | - | |
| P142 | QUICK | 22 | |
| P47 | QUICK | 22 | inline block half in 23 |
| P50 | QUICK | 23 | |
| P138 | QUICK-PART | 25 | |
| P139 | QUICK | 24 | |
| P140 | QUICK | 24 | |
| **Feedback and components** | | | |
| P01 | QUICK-PART | 47 | |
| P17 | QUICK-PART | 06 | |
| P14 | QUICK-PART | 05 | |
| P15 | QUICK | 05 | |
| P16 | QUICK-PART | 29 | item 3 in 27; item 1 DONE (0de35de11) |
| P21 | DEFER | - | |
| P22 | QUICK-PART | 24 | |
| P77 | QUICK-PART | 27 | |
| P83 | QUICK-PART | 34 | |
| P89 | QUICK-PART | 06 | |
| P91 | QUICK-PART | 43 | |
| P153 | QUICK-PART | 27 | |
| P86 | QUICK-PART | 01 | graph pair in 09 |
| P87 | QUICK-PART | 28 | SnapshotList part in 27 |
| P90 | QUICK-PART | 38 | |
| P92 | QUICK-PART | 19 | |
| P93 | DEFER | - | |
| P94 | QUICK | 01 | |
| P171 | QUICK-PART | 10 | |
| P172 | QUICK-PART | 09 | |
| P174 | QUICK-PART | fold into shell-sidebars-ux 06 (no ticket) | |
| P175 | DEFER | - | |
| **Canvas** | | | |
| P12 | QUICK-PART | 19 | |
| P13 | QUICK-PART | 19 | |
| P07 | DEFER | - | |
| P31 | QUICK-PART | 20 | |
| P133 | QUICK | 16 | |
| P134 | QUICK | 17 | |
| P135 | QUICK | 16 | |
| P95 | QUICK-PART | 20 | note action bar half in 21 |
| P136 | QUICK | 18 | |
| P137 | QUICK-PART | 18 | |
| **Calendar and Tasks** | | | |
| P64 | QUICK-PART | 41 | |
| P32 | QUICK-PART | 44 | |
| P65 | QUICK-PART | 42 | |
| P127 | QUICK-PART | 42 | |
| P63 | QUICK | 45 | |
| P128 | DEFER | - | |
| P129 | QUICK | 43 | |
| P130 | QUICK | 41 | |
| P131 | QUICK-PART | 44 | |
| P132 | QUICK-PART | 44 | |
| P163 | QUICK | 45 | |
| P164 | QUICK-PART | 45 | |
| P165 | QUICK | 45 | |
| P167 | QUICK | 45 | |
| P180 | QUICK | 45 | |
| P182 | QUICK | 43 | |
| P183 | QUICK-PART | 41 | |
| **Settings and Auto Organize** | | | |
| P08 | QUICK-PART | 30 | |
| P28 | QUICK-PART | 30 | rule row names in 31 |
| P66 | QUICK-PART | 30 | |
| P67 | DEFER | - | |
| P68 | QUICK | 30 | |
| P69 | QUICK-PART | 31 | |
| P70 | QUICK-PART | 31 | |
| P152 | QUICK | 31 | |
| P51 | DEFER | - | |
| P52 | DEFER | - | |
| P53 | QUICK-PART | 29 | |
| P54 | QUICK | 02 | |
| P79 | DEFER | - | |
| P80 | QUICK | 34 | |
| P81 | QUICK | 37 | |
| P124 | QUICK-PART | 35 | |
| P125 | DEFER | - | |
| P126 | QUICK | 34 | |
| P146 | QUICK-PART | 33 | |
| P147 | QUICK-PART | 32 | |
| P148 | QUICK-PART | 32 | |
| P149 | QUICK-PART | 31 | |
| P150 | QUICK | 30 | |
| P151 | QUICK | 32 | |
| P169 | QUICK | 36 | |
| P170 | QUICK-PART | 36 | |
| P185 | QUICK | 31 | |
| **Colour, contrast and theming** | | | |
| P19 | QUICK-PART | 26 | |
| P20 | QUICK-PART | 39 | weekend part in 44 |
| P23 | QUICK-PART | 10 | |
| P25 | QUICK-PART | 40 | |
| P26 | DEFER | - | |
| P27 | DEFER | - | |
| P85 | DEFER | - | |
| P109 | QUICK | 39 | |
| P106 | DONE | - | `applyStoredTheme()` at `src/routes/(app)/+layout.svelte:36` (7dd276998), pinned by `theme.service.test.ts:224-230` |
| P107 | QUICK-PART | 28 | |
| P108 | QUICK | 28 | |

### Parts dropped (premise false at HEAD)

- **P06, scroll a new lane into view:** `handleAddLane` sets the lane editing (`KanbanView.svelte:132`) and `KanbanLane.svelte:157-163` calls `laneTitleInput.focus()`, which scrolls it into view. A stubbed `scrollIntoView` test would pass with no change. Not checked in WKWebView.
- **P170, "Stopping..." state:** the abort listener cancels the run synchronously (`mods-host.service.ts:425-430`), so there is no interval to show.
- **P16 item 1:** DONE in 0de35de11 (`search.store.svelte.ts:16,46`, `SearchPanel.svelte:283-287`).

## Dependency graph

Arrows read "must land before". Only shared files or shared state make an edge.

```
Kanban (KanbanView.svelte):  01 -> 03 -> 11 -> 12 -> 13 -> 14 -> 15
                             11, 15 -> 26 (KanbanCardText, KanbanTableView)
Live preview (styles.ts):    04 -> 07 -> 08 -> 23
Collection:                  22 -> 23 -> 25 ; 22 -> 24 -> 33
Canvas (CanvasInner etc.):   16 -> 17 -> 18 -> 19 -> 20 -> 21 (CODE_DISPLAY_MAP)
Auto Organize:               02 -> 30 -> 31 -> 32 -> 33 ; 30, 31, 28 -> 47
Settings sections:           29 -> 35 (PeriodicNotesSection + its new test file)
app.css:                     10 -> 39
Calendar:                    41 -> 42 ; 41 -> 43
Live folders:                shell-sidebars-ux 16 -> 25, 33 ; 15 + 19 -> 40
```

Free to start now: 01, 02, 04, 05, 06, 09, 10, 16, 22, 27, 28, 29, 34, 36, 37, 38, 41, 44, 45, 46.

Never in parallel with a live Issue on the same file:
- shell-sidebars-ux 25 (ViewHeader): 01, 11, 12 (kanban toolbar `KanbanView.svelte:462-507`), 16 to 20 (`CanvasInner.svelte`, `CanvasToolbar.svelte`), 25 (`.view` header). 25 forbids a new prop on the three views, which is why 11 reads `editorStore`.
- shell-sidebars-ux 16: 22, 24 (`CollectionTableView.svelte`, `FilterPanel.svelte`); 25 and 33 are blocked by it.
- shell-sidebars-ux 15, 24, 32: 21 (`NoteActionBar.svelte`; 32 also extends `CODE_DISPLAY_MAP`, as 20 and 21 do).
- shell-sidebars-ux 15, 19: 40 (`NoteRow.svelte`). 23, 34: 39 (`EditorTabs.svelte`, different lines). 34: 44 (`CalendarNavigator.svelte:88`), 38 (one attribute in `TypesNavigator.svelte`).
- tasks-view-ux 129 (needs-info): 45 (row markup).

## Tickets

### 01. Kanban keyboard shortcuts act only on the card you see; the sort menu is the themed Select

- **Proposals:** P03 (part), P94, P86 (kanban view buttons).
- **Size:** S. **Blocked by:** none. Land before shell-sidebars-ux 25 starts or after it merges.
- **What to build:** the board key handler runs only in board mode. It returns when `e.target.closest('input, textarea, select, button, a, [role="button"], [role="gridcell"], [role="menuitem"], [contenteditable]')` is set, which still lets keys through from a card's bits-ui ContextMenu trigger `div` (tabindex -1, `menu.svelte.js:1593-1599`) and blocks the inline date picker's calendar days (`KanbanDatePicker.svelte:89-96`). Lane and card indexes and the ring come from the visible lanes (`board.lanes.map(displayLane)`), not stored `lane.items`. Focus clears when filter, sort or view mode changes. Then the native sort `<select>` (`KanbanView.svelte:488-496`) becomes `Select.Root type="single"` with `Select.Trigger size="sm" aria-label="Sort cards"` (recipe of `GraphControls.svelte`), calling the existing `handleSetSortMode`. A stored `sortMode` that is not a `SORT_LABELS` key shows its raw value or "Custom sort", never "Manual". The three view buttons get `aria-pressed` and an `aria-label` equal to their `title` (keep `title`).
- **Why together:** the Select trigger is a `<button>` whose keydown never stops propagation (`select.svelte.js:705-717`). Without the guard, Space toggles and Backspace deletes the focused card from the sort control. Shipping the guard and the Select in one ticket closes that path for good.
- **Files:** `src/lib/plugins/kanban/KanbanView.svelte`; tests `src/tests/lib/plugins/kanban/KanbanView.test.ts` (harness `src/tests/fixtures/KanbanViewHarness.svelte`, only `kanban.service.js` mocked).
- **Acceptance:**
  - [ ] Failing test first: lanes with `#x` and untagged cards, `setFilterQuery('#x')`, ArrowDown then Backspace on the board root deletes the ringed visible card and every hidden card stays in the persisted markdown.
  - [ ] Focus a card's trigger div; ArrowDown still moves the ring.
  - [ ] In list and table mode, Delete, Backspace and Space on the root change nothing.
  - [ ] Space or Enter on a button inside a card (check button, a calendar day) does not toggle or edit the ringed card.
  - [ ] With `kanbanStore.setFocus(0, 0)`, bubbling keydown of Space, Enter, Backspace and `n` on the sort trigger leaves the card, its checked state and `editingItemId` unchanged and issues no save.
  - [ ] No `select` element in the toolbar; "Sort cards" lists the `SORT_LABELS` in order; choosing "Text (A->Z)" persists `settings.sortMode === 'text-asc'`; mounting and re-choosing the current option issue no save; `"sortMode": "unchecked"` mounts without a save and the trigger does not read "Manual".
  - [ ] View buttons: `aria-pressed="true"` only on the current mode; `clickToolbarButton('List view')` (`KanbanView.test.ts:71-76`) still works. Changing sort, view or filter clears the ring.
  - [ ] Gate also runs `chrome-state-styles`, `menu-item-anatomy` and `chrome-type-scale` tests.

### 02. Settings number fields write only valid values and clamp on commit

- **Proposals:** P54. Absorbs open-itens 201.
- **Size:** S. **Blocked by:** none (first of the Auto Organize chain).
- **Why early:** clearing Retention days persists 1 today, and `cleanup_history` at vault open (`app-lifecycle.service.ts:296-300`) then deletes snapshots older than one day.
- **What to build:** Editor fields (font size 8-32, line height 1-3, paragraph spacing 0-2, content width 0 or 400-2000): `oninput` writes only a finite in-range value; `onchange` clamps with the existing `clamp*` helpers, writes and sets the field to the stored value; an empty or non-numeric commit writes nothing and restores the field. Auto Organize debounce: same, 500-30000 ms. Retention days: no write on input; `onchange` clamps to 1-365; empty commit restores. `min`, `max`, `step` and copy unchanged. No edit to `settings.logic.ts` (mvp-claude file); reuse its `clamp*` exports read-only.
- **Files:** `src/lib/core/settings/sections/EditorSection.svelte`, `src/lib/core/settings/sections/FileHistorySection.svelte`, `src/lib/features/auto-organize/AutoOrganizeSection.svelte` (debounce block only); tests `src/tests/lib/core/settings/EditorSection.test.ts`, new `src/tests/lib/core/settings/FileHistorySection.test.ts`, `src/tests/lib/features/auto-organize/AutoOrganizeSection.test.ts`.
- **Acceptance:**
  - [ ] Failing test first (real `settingsStore`): from the stored font size, typing `''` or `'1'` leaves the store unchanged; `'14'` stores 14; committing `'999'` stores 32 and shows `32`; committing `''` keeps the store. Content width: typing `'5'` leaves the store, committing it stores 400; `0` and `800` store.
  - [ ] Retention days from 7: typing `''`, `'1'` or `'30'` leaves 7; committing `'30'` stores 30; `'400'` stores 365; `''` keeps 30.
  - [ ] Debounce from 3000: typing `''` or `'0'` leaves 3000; `'2'` stores 2000; `'45'` leaves 2000, committing it stores 30000.
  - [ ] `EditorSection.test.ts:84-91` "raw while typing is deliberate" is rewritten to the new contract (the review approved it; say so in the commit); commit-clamp and heading typography tests unchanged.

### 03. Renaming a kanban lane keeps its settings; new lanes get unique names

- **Proposals:** P04. Absorbs open-itens 049.
- **Size:** S. **Blocked by:** 01 (`KanbanView.svelte`).
- **What to build:** `renameLane` moves `laneSettings[old]` to the new title (copies it when another lane still has the old title, adds nothing when there is no entry) and suffixes a title another lane already has (" 2", " 3"). The suffix rule ships with the key move, never alone, or a rename onto an existing title overwrites that lane's limit and auto-complete. Exported `uniqueLaneTitle` serves rename and Add lane. This changes what a rename writes into the existing `%% kanban:settings` block through the existing serializer; it removes a settings loss and adds no new write. Open-itens 048 is not fixed and stays open.
- **Files:** `src/lib/plugins/kanban/kanban.logic.ts`, `src/lib/plugins/kanban/KanbanView.svelte` (`handleAddLane`); tests `src/tests/lib/plugins/kanban/kanban.logic.test.ts`, `KanbanView.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: lane "Done" with `{ autoComplete: true, maxItems: 5, collapsed: true }` renamed to "Complete": the three getters return true, 5, true for "Complete" and no "Done" key remains.
  - [ ] A lane with no settings renames without gaining an entry.
  - [ ] Renaming to another lane's title gives "<title> 2" and leaves that lane's settings unchanged.
  - [ ] Two lanes titled "Done" sharing one entry: renaming one keeps "Done" and gives the renamed lane a copy.
  - [ ] Serialize then `parseKanbanBoard` keeps the settings under the new title; a card moved into the renamed auto-complete lane with `isLaneAutoComplete` is checked.
  - [ ] Add lane twice gives "New Lane" and "New Lane 2".

### 04. QueryJS tables: Prev and Next work, tables scroll, buttons show focus

- **Proposals:** P82, P09 (QueryJS half).
- **Size:** S. **Blocked by:** none. First of the `live-preview/styles.ts` chain.
- **What to build:** `mousedown` `stopPropagation` on the pager Prev and Next (`kb-ui.ts:526-538`, pattern at `queryjs-block-widget.ts:217`). `kb.table` and the non-paginated `kb.ui.table` append a `cm-lp-table-scroll` div holding the table and still return the `<table>` (public contract `contract/kb-api.v1.ts:623-730`); the paginated wrapper gets the same scroll and is still returned. Date, KBDateTime and number cells get a nowrap class from `renderValue`'s Date / KBDateTime / number branches only (open-itens 060 owns the array branch). `.cm-lp-qjs-run:focus-visible` and `.cm-lp-qjs-table-nav-btn:focus-visible` copy the `--ring` box-shadow of `.cm-lp-meta-bind-btn:focus-visible`. Known effect to state: a script that moves the returned table leaves an empty zero-height scroll div in `kb.container`.
- **Files:** `src/lib/plugins/queryjs/kb-ui.ts`, `src/lib/plugins/queryjs/kb-api.ts`, `src/lib/core/markdown-editor/extensions/live-preview/styles.ts` (qjs rules only); tests new real-CodeMirror pager test under `src/tests/lib/plugins/queryjs/`, `kb-ui.test.ts`, `kb-api.test.ts`, `styles.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: port "pager Next survives its click and turns the page" from `.scratch/archived/live-preview-audit/repro/interactions/widget-click.test.ts:105-115` (real CodeMirror, setup of `collection-block-click.test.ts`): the widget stays drawn, the indicator reads `Page 2 of 3`, the cursor does not move. Same for Prev.
  - [ ] `kb.ui.table` and `kb.table` still return a `TABLE` (`kb-ui.test.ts:754`, `kb-api.test.ts:719` green) whose parent is the scroll div inside the container.
  - [ ] A `KBDateTime`, a `Date` and a number cell carry the nowrap class; a string cell does not.
  - [ ] Both buttons have a `:focus-visible` rule using `--ring`; radius ladder unchanged; `kb-api-contract` and `queryjs-block-widget` tests pass.
- **Overlap:** covers item 1 of open-itens 086 only; 086 stays open.

### 05. Quick Capture says what it does

- **Proposals:** P15, P14 (Saved hold).
- **Size:** S. **Blocked by:** none.
- **What to build:** hints "Esc hides (draft kept) · ⌘↩ saves", "Could not save. ⌘↩ retries, Esc hides (draft kept).", "Save not confirmed. ⌘↩ saves again, Esc hides (draft kept)."; `saving` becomes `$state` and the hint reads "Saving..." while waiting; a non-empty draft restored on mount or summon shows "Draft restored" with a Discard button that empties the text and the stored draft, removed on the first edit; a confirmed save shows a check and "Saved" for about 600 ms. On `ok === true` the stored draft becomes `withoutWritten(text, body)` before the hold, so a summon during the hold cannot restore and capture the same text twice. Draft stays in localStorage; no Rust, no DTO change.
- **Files:** `src/routes/composer/+page.svelte`; test `src/tests/routes/composer-page.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: the default hint is the new string and neither error hint says "cancels" (pins at `:107-108,271,429` updated).
  - [ ] While `submit_composer_capture` is pending the hint reads "Saving...".
  - [ ] Mount or summon with a stored draft shows "Draft restored"; typing removes it; Discard empties editor and storage; no draft shows no note.
  - [ ] A confirmed save keeps the `saved` class and "Saved" for 600 ms (fake timers) before `dismiss_composer`.
  - [ ] Esc then summon during the hold: editor empty, no "Draft restored", and Cmd+Enter sends no second `submit_composer_capture` (`:336-351` updated to the new hold).
  - [ ] Manual: Discard sits inside `data-tauri-drag-region` (`:241`); a click on it is not taken as a window drag.

### 06. Toasts follow the theme; Copy block link confirms

- **Proposals:** P17 (theme part), P89 (toasts only).
- **Size:** S. **Blocked by:** none. Later tickets that add toasts inherit the new look.
- **What to build:** `<Toaster>` drops `richColors` (`AppOverlays.svelte:17`) and gets `style="--normal-bg: var(--popover); --normal-text: var(--popover-foreground); --normal-border: var(--border)"`; `toastOptions.classes` gives error, success, warning and info a thin left accent from `--destructive`, `--success`, `--warning`, `--primary`. Copy block link: after a successful write, `toast.success('Block link copied')` or `'Block embed copied'`; an empty line toasts `toast.info('Place the cursor on a block')`. The `^id` insert order stays as it is (moving the clipboard write first would put the note dispatch after an `await` with a stale `line.to`).
- **Files:** `src/lib/app/AppOverlays.svelte`, `src/lib/features/copy-block-link/copy-block-link.service.ts`; tests `src/tests/lib/app/AppOverlays.test.ts`, `src/tests/lib/features/copy-block-link/copy-block-link.service.test.ts` (extend the `svelte-sonner` mock with `success` and `info`).
- **Acceptance:**
  - [ ] Failing test first: after `toast.error('x')` the toast has `data-rich-colors="false"`.
  - [ ] The toaster style declares the three `--normal-*` vars with those tokens; an error toast carries the error accent class and a success toast the success class.
  - [ ] Failing test first: a heading line with a working clipboard fires `toast.success`; a block line with `embed` fires it with the embed text; an empty line fires `toast.info` and writes nothing; failure cases keep `toast.error` and no success toast.
  - [ ] Manual: a toast in light and dark uses the popover colours. `copy-block-link.spec.ts` unaffected.

### 07. Live-preview widgets show failure and progress

- **Proposals:** P112 (part), P113 (part), P10 (button names only).
- **Size:** S. **Blocked by:** 04 (`styles.ts`).
- **What to build:** on an `<img>` `error` event, if `wrapper.isConnected`: add `cm-lp-image-missing` to the wrapper, replace the image with `Could not load "<name>"` (alt or wikilink target) and call `view.requestMeasure()`. The unresolved-link text `"<target>" not found` stays. `.cm-lp-image-missing` is muted text in a dashed `--radius-xs` box in the embed error colour. The mermaid container holds `Rendering diagram...` until the existing success or error assignment replaces it; cache and empty-source paths unchanged (live-preview rule 2). A rejected or missing `navigator.clipboard` shows "Copy failed" on the code-block button for 1500 ms, then "Copy". Table +col and +row get `aria-label` "Add column" / "Add row" (keep `title`); no change to layout, padding or the add dispatches.
- **Files:** `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts` (`ImageWidget`, `WikilinkImageEmbedWidget`, `attachAddButtons`), `widgets/mermaid-widget.ts`, `widgets/code-block-widget.ts`, `styles.ts`, `e2e/specs/live-preview/misc-features.spec.ts`; tests under `src/tests/lib/core/markdown-editor/extensions/live-preview/` (`widgets/image-widget`, `wikilink-image-embed-widget`, `mermaid-widget`, `code-block-widget`, `table-widget.test.ts`, `styles.test.ts`).
- **Acceptance:**
  - [ ] Failing test first: dispatching `error` on the `<img>` of an `ImageWidget` and of a resolved `WikilinkImageEmbedWidget` gives `cm-lp-image-missing` and `Could not load "<name>"`, keeps `cm-lp-image-wrapper`; a detached wrapper does nothing and throws nothing.
  - [ ] `styles.test.ts` finds `.cm-lp-image-missing` with `border-radius: var(--radius-xs)` (added to the ladder list at `:62`).
  - [ ] A pending mermaid `render` shows `Rendering diagram...`; resolved shows an SVG and no placeholder; the cached path has no placeholder; empty source still says "Empty mermaid diagram".
  - [ ] `writeText` rejecting, or no `navigator.clipboard`: "Copy failed", then "Copy" after 1500 ms, no unhandled rejection; success still "Copied!".
  - [ ] The two table buttons have the names; the mousedown `stopPropagation` (rule 11) and append tests are unchanged.
  - [ ] `misc-features.spec.ts` "image renders widget" routes its URL to a stub PNG (pattern `click-reveal/image.spec.ts:23-27`); a new step routed to 404 sees `.cm-lp-image-missing` with "Could not load". Also run `click-reveal/code-block-copy`, `embed-widgets`, `click-reveal/image`, `click-reveal/wikilink-image-embed`, `mermaid`, `click-reveal/table-add-buttons`.

### 08. Callouts, headings and the meta-bind number field read cleanly

- **Proposals:** P114 (part), P110 (part), P111.
- **Size:** S. **Blocked by:** 07 (`styles.ts`).
- **What to build:** the callout line style gains `--callout-accent: <header.color>` next to `border-left-color` (`callout-field.ts:171-174`); `.cm-lp-callout-type-label` gets `text-transform: capitalize` and `color: var(--callout-accent, inherit)`. Body italics cancelled with the zero-specificity `:where(.cm-lp-callout) span { font-style: normal }` (a plain `.cm-lp-callout span` would strip italics from meta-bind and math error spans) plus `.cm-lp-callout .cm-lp-italic, .cm-lp-callout .cm-lp-italic span { font-style: italic }`. `padding-top: var(--heading-hN-space-above, X)` on `.cm-lp-h1..h3` only (0.6em, 0.5em, 0.4em, tune by eye). `.cm-lp-meta-bind-input[type="number"]` gets `field-sizing: content; min-width: 4ch; max-width: 16ch` (Safari 26.2+; older WebKit keeps today's width). CSS and one style attribute; no default title, chevron or settings field.
- **Files:** `src/lib/core/markdown-editor/extensions/live-preview/styles.ts`, `plugins/callout-field.ts`; tests `styles.test.ts`, `plugins/callout-field.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: `exactRule('.cm-lp-callout-type-label')` has `text-transform: capitalize` and `color: var(--callout-accent, inherit)`.
  - [ ] A `[!warning]` header line's `style` carries `--callout-accent: ` plus the warning colour; decoration counts in `callout-field.test.ts` unchanged.
  - [ ] The theme has a `:where(.cm-lp-callout) span` rule with `font-style: normal` (no plain `.cm-lp-callout span` rule) and the `.cm-lp-callout .cm-lp-italic` italic rule.
  - [ ] `.cm-lp-h1..h3` contain `padding-top: var(--heading-h1-space-above` (etc.); h4-h6 have none.
  - [ ] The number-input rule has `field-sizing: content` and `min-width: 4ch`; the shared `.cm-lp-meta-bind-input` rule is unchanged.
  - [ ] E2E: `click-reveal/callout-text`, `click-reveal/callout-controls`, `click-reveal/heading`, `headings`, `click-reveal/meta-bind-*` pass. Owner eye check: a callout with `*emphasis*` and a meta-bind error inside, a yellow warning label in light theme, heading spacing, a number control beside a select.

### 09. Word count and graph stats read correctly for 0 and 1; graph mode buttons show their state

- **Proposals:** P172 (count copy), P116 (singular and zero), P86 (graph pair). Absorbs open-itens 213.
- **Size:** S. **Blocked by:** none.
- **What to build:** "1 word", "1 character", and no reading-time segment or separator at 0 words; `estimateReadingTime` unchanged. A pure `formatGraphStats(noteCount, linkCount)` in `graph-view.logic.ts` ("1 note · 1 link") rendered by the graph footer. The two graph mode buttons (`GraphControls.svelte:44-63`) get `aria-pressed` from `graphViewStore.mode`.
- **Files:** `src/lib/plugins/word-count/WordCount.svelte`, `src/lib/plugins/graph-view/GraphView.svelte`, `graph-view.logic.ts`, `GraphControls.svelte`; tests new `src/tests/lib/plugins/word-count/WordCount.test.ts`, `graph-view.logic.test.ts`, `GraphView.test.ts`, `GraphControls.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: `formatGraphStats` (0,0) "0 notes · 0 links", (1,1) "1 note · 1 link", (2,3) "2 notes · 3 links".
  - [ ] `WordCount` with the real `editorStore` and an active `.md` tab, timers advanced 500 ms: empty shows "0 words" and no "min read"; "hello" shows "1 word", "5 characters", "1 min read"; 250 words shows "2 min read".
  - [ ] `GraphView.test.ts:73` changes from `toContain('1 links')` to `toContain('1 link')` plus `not.toContain('1 links')` (it pins the bug; this corrects it); `:120,135` unchanged.
  - [ ] Graph mode buttons: `aria-pressed` follows `graphViewStore.mode`; `GraphControls.test.ts:290-296` lookups by `aria-label` still work.
  - [ ] `bash scripts/e2e.sh e2e/specs/word-count.spec.ts` passes.

### 10. Keyboard focus shows at full strength; spinners and pulses respect Reduce motion

- **Proposals:** P23 (primitives and base rule), P171 (base rule).
- **Size:** S. **Blocked by:** none.
- **What to build:** `button.svelte:7` `focus-visible:ring-ring/50` plus `ring-[3px]` becomes `focus-visible:ring-2 focus-visible:ring-ring` (no offset: `ring-offset-background` paints the sidebar colour on popovers). `button.svelte:12` destructive ring becomes `focus-visible:ring-destructive`. `dialog-content.svelte:38` close button rings only on `focus-visible`. `app.css:495` base `outline-ring/50` becomes `outline-ring`. Inputs, selects, switches, scroll-area, `aria-invalid` rings and feature-file copies are untouched, so for a while the app shows two ring strengths (state it in the commit). One unlayered `@media (prefers-reduced-motion: reduce)` block in `app.css`: `.animate-pulse { animation: none; }` and `.animate-spin { animation-duration: 1.5s; }`, with a comment that unlabelled spinners must still read as busy. `EventCalendarView.svelte:284` untouched.
- **Files:** `src/lib/components/ui/button/button.svelte`, `src/lib/components/ui/dialog/dialog-content.svelte`, `src/app.css`, `e2e/specs/focus-ring.spec.ts`; tests new `src/tests/lib/focus-ring-styles.test.ts`, new `src/tests/lib/reduced-motion-css.test.ts`, a dialog render test.
- **Acceptance:**
  - [ ] Failing test first: a source scan of `button.svelte`, `dialog-content.svelte` and `app.css` finds no `ring-ring/NN` or `ring-destructive/NN` on a `focus-visible:` variant, no `focus:ring` and no `outline-ring/NN` in the base layer. Its self-test: `focus-visible:ring-ring/50` and `dark:focus-visible:ring-destructive/40` match; `focus-visible:ring-ring`, `ring-offset-2` and `aria-invalid:ring-destructive/20` do not.
  - [ ] The dialog close button's class has `focus-visible:ring-2` and no `focus:ring-2`.
  - [ ] Failing test first: `app.css` has an unlayered `prefers-reduced-motion: reduce` block naming `.animate-pulse` and `.animate-spin`.
  - [ ] `focus-ring.spec.ts`: the raw-button probe (`:49`) and `ringToken()` (`:173`) move to full strength on purpose; the folder-row checks (`:84,:92`) keep a 50% probe under its own name because `FilesNavigator.svelte` still uses `ring-ring/50`; `:10-35` stays green. If a spec reaches the Rail busy dot, `page.emulateMedia({ reducedMotion: 'reduce' })` gives `animation-name: none`; otherwise the commit records a macOS Reduce motion check.
- **Owner question:** reduced-motion treatment. Default: spinners slow to 1.5 s, pulses stop. Flip in review if wanted.

### 11. Kanban filter clears, resets per board, and a tag click filters

- **Proposals:** P143 (toolbar half), P88 (part).
- **Size:** S. **Blocked by:** 03 (`KanbanView.svelte`). Not alongside shell-sidebars-ux 25.
- **What to build:** an X button named "Clear filter" shown only with a query; Escape in the input clears it. KanbanView clears filter and focus when `editorStore.activeTab?.path` changes and on destroy (no new prop, no EditorView edit, editing ids untouched to stay off the open-itens 006 path). A tag chip is a plain button that sets the filter to `#tag`. Tag colour moves to a "Tag color" card-menu submenu (one row per tag, swatches, "Reset to default") using the existing `onSetTagColor` / `onRemoveTagColor` (same `settings.tagColors` write as today). Known limit stated in the ticket: the filter is a substring match, so `#design` also shows `#design-system`. Help `21-kanban.md:154` rewritten.
- **Files:** `src/lib/plugins/kanban/KanbanView.svelte`, `KanbanCardText.svelte`, `KanbanCard.svelte`, `KanbanLane.svelte` (pass-through), `help/documentation/21-kanban.md`; test `KanbanView.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: typing a query shows "Clear filter"; clicking it empties `kanbanStore.filterQuery` and all cards render.
  - [ ] Escape in the filter input clears it.
  - [ ] With two kanban tabs in the real `editorStore`, switching the active tab path clears the filter; unmount clears it.
  - [ ] Clicking a `#design` chip sets the filter to `#design` and hides an untagged card.
  - [ ] "Tag color" (only on cards with tags) writes `settings.tagColors` in the persisted markdown; the menu pin at `KanbanView.test.ts:246-254` is updated on purpose.

### 12. Kanban cards move between lanes from the card menu

- **Proposals:** P02 (part).
- **Size:** S. **Blocked by:** 11 (`KanbanView.svelte`, the card-menu pin in `KanbanCard.svelte`). Not alongside shell-sidebars-ux 25.
- **What to build:** a "Manual order paused" chip after the sort control, visible when `!canReorder`, titled to say drag reorder is off while sorted or filtered. A "Move to" submenu in the card menu lists the other lanes and calls `moveItem(board, from, id, to, storedTargetLength, isLaneAutoComplete(board, target.title))`; `moveItem` already refuses a missing lane (`kanban.logic.ts:437-438`). Drag handlers are not touched (open-itens 040 owns them). Help `21-kanban.md:73,76`.
- **Files:** `src/lib/plugins/kanban/KanbanView.svelte`, `KanbanLane.svelte`, `KanbanCard.svelte`, `help/documentation/21-kanban.md`; test `KanbanView.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: "Move to" > "Done" on a To Do card puts it last in Done in the persisted markdown.
  - [ ] Moving into an auto-complete lane checks the card; with a filter hiding cards in the target lane, the moved card lands after the hidden ones.
  - [ ] The current lane is not listed; with one lane the submenu is disabled.
  - [ ] The chip shows with a sort or a filter, not in manual order with no filter.

### 13. Kanban lanes: visible add row, empty and filtered counts, collapsed rail

- **Proposals:** P05 (part), P06 (part), P143 (lane half).
- **Size:** S. **Blocked by:** 12 (`KanbanLane.svelte`, `KanbanView.svelte`).
- **What to build:** the add form moves to a `shrink-0` row below the scroll list, always visible, still inside the lane root (so the `n` shortcut works), and its `KanbanWikilinkSuggestions` dropdown opens upward through a placement prop (the card editor keeps today's). An empty lane says "No cards. Drag one here or add a card."; a lane emptied by the filter says "No matching cards"; with a filter the count reads "n of m" (KanbanView passes `totalCount`). The auto-complete icon and the count get accessible names. A collapsed lane is a 40 px rail (chevron, count, vertical title), no resize handle; rename from the rail expands first. `collapsed` already persists through `toggleLaneCollapsed`.
- **Files:** `src/lib/plugins/kanban/KanbanLane.svelte`, `KanbanView.svelte`, `KanbanWikilinkSuggestions.svelte`; test `KanbanView.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: an empty lane renders "No cards. Drag one here or add a card."
  - [ ] The add input is outside the `role="list"` element; its form has no `opacity-0`; its suggestions use the upward placement.
  - [ ] A filter that empties a lane shows "No matching cards"; the count reads "1 of 3" while filtering and is unchanged (including `n/max`) without one.
  - [ ] The `n` shortcut still focuses the lane's add input.
  - [ ] A collapsed lane is 40 px wide, shows its title, has no "Resize lane" separator; expanding restores the width.

### 14. Kanban cards: no empty date row, clamped preview, growing editor

- **Proposals:** P186, P145 (part). Absorbs open-itens 197.
- **Size:** S. **Blocked by:** 13 (`KanbanView.svelte`).
- **What to build:** undated cards drop the date row; "Set date" sits at the end of the title line, outside the `ondblclick` span, revealed on hover or focus and kept visible while its inline popover is open (`has-[[data-state=open]]:opacity-100`; WebKit does not focus a clicked button). Dated cards unchanged; preview `line-clamp-3`; card `rounded-md`. The edit textarea grows with its content (`scrollHeight`). After Enter or Escape, once the textarea has unmounted (`tick()`), focus goes to the board root; moving it earlier fires `onblur={commitEdit}` a second time. Card text is never rewritten.
- **Files:** `src/lib/plugins/kanban/KanbanCard.svelte`, `KanbanView.svelte` (board root ref, focus after edit); test `KanbanView.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: an undated card has a "Set date" button and no separate date row element.
  - [ ] A dated card keeps its badge; the preview element has `line-clamp-3`; the card has `rounded-md`.
  - [ ] With a stubbed `scrollHeight`, typing sets the textarea height to it.
  - [ ] After Enter, `document.activeElement` is the board root and the harness persisted exactly once; after Escape, focus is the board root and nothing persisted.
  - [ ] `chrome-state-styles.test.ts` passes.

### 15. Kanban list, table and archive: named checks, clean cells, restore feedback

- **Proposals:** P144 (part).
- **Size:** S. **Blocked by:** 14 (`KanbanView.svelte`), 11 (`KanbanCardText.svelte`).
- **What to build:** check buttons named "Mark done" / "Mark open" in list and table. The table card cell renders through `KanbanCardText` with a new `hideTags` prop (same `parseCardSegments` parse as the board, clickable wikilinks, tags stay in the Tags column) and shows a "No cards" row when no lane has cards. Archive rows show `stripCardMetadata(item.text)`. Restore toasts "Restored to <first lane>". Help `21-kanban.md:25,27,109` rewritten (it documents plain-text cells today).
- **Files:** `src/lib/plugins/kanban/KanbanTableView.svelte`, `KanbanListView.svelte`, `KanbanCardText.svelte`, `KanbanView.svelte`, `help/documentation/21-kanban.md`; test `KanbanView.test.ts` (`svelte-sonner` mocked).
- **Acceptance:**
  - [ ] Failing test first: in table view the check button is found by name "Mark done" and flips to "Mark open" after a click.
  - [ ] The cell of `Ship #design [[Spec]]` shows "Ship" and a "Spec" button, no `#design`; clicking "Spec" calls `onOpenWikilink('Spec')`.
  - [ ] An empty board in table view shows "No cards".
  - [ ] An archived `Pay rent {2026-11-20} {color:red}` shows "Pay rent"; Restore toasts "Restored to To Do" and the card is in the first lane.

### 16. New canvas text cards open ready to type and cascade; Enter or F2 edits a selected card

- **Proposals:** P133, P135.
- **Size:** S. **Blocked by:** none. Not alongside shell-sidebars-ux 25. Sequence with open-itens 039 and 051 (same add paths).
- **What to build:** "Add text card" (toolbar and menu) adds the card, selects it, deselects the others and enters edit mode with focus in the textarea. The `editing` flag is set only after the creating `persistChanges`, through the same `updateNodeData(id, { editing: true })` menu Edit uses, so the whitelisted existing-node branch (`canvas.logic.ts:205-209`) never serializes it; no serialization function changes (do not strip keys in `flowToCanvas`, which would delete third-party fields). Repeated toolbar adds cascade through a new pure `cascadePosition` in `canvas.logic.ts`. Menu-opened file, link and image adds land at the right-click point. Enter or F2 on a focused, selected text or link card wrapper starts editing; Escape in the textarea ends it and returns focus to the wrapper. Textarea `height: 100%`, `resize: none`, focus ring on `--ring`; any new radius is a token (radius ratchet `radius-scale.test.ts:164-176`).
- **Files:** `src/lib/features/canvas/CanvasInner.svelte`, `TextNode.svelte`, `LinkNode.svelte`, `canvas.logic.ts` (new function only); tests `src/tests/lib/features/canvas/canvas.logic.test.ts`, new `canvas-text-editing.test.ts` (harness of `canvas-tab-switch.test.ts`).
- **Acceptance:**
  - [ ] Failing test first: `cascadePosition` returns the point when free, a stepped point when a node sits there, a further step for a third.
  - [ ] Click "Add text card" (by name): a `.canvas-textarea` is focused and the node is selected; a second click places a second card elsewhere.
  - [ ] Typing then advancing 300 ms puts the text in the tab content; no `onJsonChange` payload ever contains an `editing` key (assert every payload, the first included).
  - [ ] Enter and F2 on a selected text card wrapper open the textarea; Enter on a selected file card does nothing; Enter inside the textarea inserts a newline only. An unselected focused card does not need two presses unless the ticket chooses so (test whichever is chosen).
  - [ ] Escape in the textarea focuses the wrapper, keeps it selected, and Enter edits again.
  - [ ] Pane menu > Add link > submit places the node at the right-click flow point.

### 17. Canvas file and link cards: a plain click selects, an open button opens, previews skip frontmatter

- **Proposals:** P134, P11 (canvas card half). Absorbs open-itens 050.
- **Size:** S. **Blocked by:** 16 (`CanvasInner.svelte`).
- **What to build:** the file and link header no longer opens on a plain click; Cmd or Ctrl click opens (xyflow's multi-select key is also Cmd, so it also toggles selection; state it). An always-visible icon button, a sibling of the header and never nested in it, named "Open note" / "Open link", opens on click or Enter. `openUrl` rejecting or `isSafeUrl` false shows `toast.error`. Wire the existing "Open in editor" and "Open URL" menu items from `CanvasInner` (open-itens 039's relative-path bug still applies; 039 stays). File node previews render the body after the frontmatter through a wrapper over `stripFrontmatter` in `canvas-markdown.logic.ts`; a frontmatter-only file shows the existing "Empty file" state; text nodes keep rendering a leading `---`; CRLF files stay as today (known limit). Display only. Help `11-canvas.md:86-87`.
- **Files:** `src/lib/features/canvas/FileNode.svelte`, `LinkNode.svelte`, `CanvasInner.svelte`, `canvas-markdown.logic.ts`, `help/documentation/11-canvas.md`; tests new `canvas-node-open.test.ts`, `canvas-markdown.logic.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: a plain click on a file header adds no tab to the real `editorStore`, and on a link header does not call the mocked `openUrl` (`@tauri-apps/plugin-opener`).
  - [ ] Ctrl or Cmd click opens (tab added, or `openUrl` called with the URL).
  - [ ] The open button has no `opacity: 0` default, is reachable by Tab and opens on click.
  - [ ] `openUrl` rejecting and a `javascript:` URL each toast.
  - [ ] File nodes show "Open in editor" and link nodes "Open URL" in the menu, and they work.
  - [ ] Failing test first: the file preview of `---\ntype: person\n---\n# Title\nBody` has the heading and Body and neither `type: person` nor `<hr>`; frontmatter-only gives an empty body; no frontmatter renders as today; `renderCanvasMarkdown('---\ntext')` for a text node is unchanged.
- **Owner question:** a plain click on a card header selects instead of navigating away (validated P134; a daily-use behaviour change). Default: yes.

### 18. Canvas handles show on selected nodes; image cards get 8 handles and real loading and error states

- **Proposals:** P136, P137 (ImageNode part).
- **Size:** S. **Blocked by:** 17 (`CanvasInner.svelte`).
- **What to build:** ImageNode gets the same 8 handles with the same ids as TextNode (`canvasEdgeToFlowEdge` maps `fromSide: top` to `top-source`, which ImageNode lacks). Handles are visible on `.svelte-flow__node.selected` as well as on hover; a 16 px `::after` hit area applies only on hovered or selected nodes (an opacity-0 handle still takes hits). ImageNode: a loading skeleton (static under reduced motion), a separate "Image not found" state with the path, also from the `<img>` `onerror` of remote images, `alt` is the basename, `object-fit: contain`, radii are tokens.
- **Files:** `src/lib/features/canvas/ImageNode.svelte`, `CanvasInner.svelte` (handle CSS only); test new `canvas-image-node.test.ts` (mock `@tauri-apps/plugin-fs` `readFile`, stub `URL.createObjectURL`, run the real `resolveImageSrc`).
- **Acceptance:**
  - [ ] Failing test first: an image node renders 8 `.svelte-flow__handle` elements whose `data-handleid` set equals a text node's (4 today).
  - [ ] `readFile` rejecting shows "Image not found" and the path; pending shows the loading element and not "Image not found"; resolved gives `alt` = basename.
  - [ ] Source assertions: handles shown under `.svelte-flow__node.selected`; the hit area scoped to hover or selected; `.canvas-image` uses `object-fit: contain`; skeleton animation off under `prefers-reduced-motion`.
  - [ ] `radius-scale.test.ts` passes with the `ImageNode.svelte` baseline unchanged. By-eye check in the commit: resizing a selected node from a side midpoint still works.

### 19. Canvas surfaces and overlays draw from theme tokens

- **Proposals:** P12 (part), P13 (group-label typography), P92 (canvas overlay shadows). Absorbs open-itens 195 and 196.
- **Size:** S (many files, mechanical). **Blocked by:** 18 (every canvas component). Drop the `CanvasToolbar.svelte:55` site if shell-sidebars-ux 25 removed that file first.
- **What to build:** every `rgba(255, 255, 255, A)` becomes `color-mix(in oklab, var(--foreground) A%, transparent)`; the minimap mask becomes `color-mix(in oklab, var(--background) 60%, transparent)`; the context-menu danger item uses `var(--destructive)` with a 15% hover mix; drop the dead fallbacks in `CanvasEdge.svelte:66-67`; uncoloured `buildGroupStyle` (`canvas.logic.ts:151`, flow `style` is never serialized) uses the same form; reword the "for dark mode" comment. Group label 13 px in foreground at 80% (`GroupNode.svelte:36-44`). The three overlay shadows move to tokens: `CanvasContextMenu.svelte:187` `var(--shadow-md)`, `CanvasFilePicker.svelte:97` and `CanvasLinkInput.svelte:94` `var(--shadow-xl)`. Node shadows (`CanvasInner.svelte:792,796`), scrims and node-tint hex suffixes stay.
- **Files:** in `src/lib/features/canvas/`: `CanvasInner.svelte`, `CanvasContextMenu.svelte`, `CanvasFilePicker.svelte`, `CanvasLinkInput.svelte`, `CanvasEdge.svelte`, `CanvasToolbar.svelte`, `ColorPicker.svelte` (colours only), `FileNode.svelte`, `TextNode.svelte`, `LinkNode.svelte`, `ImageNode.svelte`, `GroupNode.svelte`, `canvas.logic.ts`; tests new `canvas-theme-colors.test.ts`, `canvas.logic.test.ts`.
- **Acceptance:**
  - [ ] Failing test first (comments stripped, style of `canvas-markdown-css.test.ts`): no `.svelte` or `.ts` file in the folder except `canvas.types.ts` has `rgba(255` or `#fb464c`; `rgba(0` appears only in the two node `box-shadow` lines and the two scrims (`CanvasFilePicker.svelte:81`, `CanvasLinkInput.svelte:81`); the three overlay shadows read the tokens exactly.
  - [ ] Failing test first: an uncoloured group's `style` has `var(--foreground)` and no `rgba(`; a coloured group keeps its `20` and `80` suffixes.
  - [ ] The two node shadow lines are byte-identical to HEAD; `radius-scale.test.ts` unchanged.
  - [ ] Commit records a by-eye check of edges, grid, minimap, menu hover and the overlay lift in Default and Lavender Haze.

### 20. The canvas context menu and pickers work from the keyboard and show Mac shortcut glyphs

- **Proposals:** P31 (canvas part), P95 (canvas part).
- **Size:** S. **Blocked by:** 19 (`CanvasContextMenu.svelte`, `ColorPicker.svelte`, `CanvasFilePicker.svelte`, `CanvasLinkInput.svelte`). Sequence with shell-sidebars-ux 32 (`CODE_DISPLAY_MAP`).
- **What to build:** the menu is `role="menu"` with `role="menuitem"` buttons; the colour section is a `role="group"` labelled "Color" with `menuitemradio` swatches and `aria-checked` (swatch names stay "1".."6"). On open the first item takes focus; ArrowUp/Down, Home and End move across every item, swatches included. Escape (with `stopPropagation`) and Tab close and restore the previous focus, without overriding the rAF focus an action moves elsewhere (`TextNode.svelte:24`, `CanvasFilePicker.svelte:43`). Picker and link input: `role="dialog"`, `aria-modal`, an accessible name, labelled inputs, focus restore; the picker shows "Showing 20 of N" when more match. Hints read `formatShortcut({ meta: true, key: 'a' })`, `formatShortcut({ shift: true, key: '1' })` and `formatShortcut({ code: 'Backspace' })`, with `Backspace: '⌫'` added to `CODE_DISPLAY_MAP`.
- **Files:** `src/lib/features/canvas/CanvasContextMenu.svelte`, `ColorPicker.svelte` (roles only), `CanvasFilePicker.svelte`, `CanvasLinkInput.svelte`, `src/lib/utils/keybindings.ts`; tests new `canvas-context-menu.test.ts`, `src/tests/lib/utils/keybindings.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: the pane menu has `role="menu"` and the first item focused; ArrowDown moves to the second, End to the last; Escape removes the menu, does not deselect nodes, and restores focus.
  - [ ] Menu "Edit" on a text card leaves focus in the textarea.
  - [ ] Menu text holds `⌘A` and `⇧1` and no "Ctrl+"; Delete items show `⌫`; `formatShortcut({ code: 'Backspace' })` is `⌫`.
  - [ ] 25 matches show "Showing 20 of 25", 5 show no count; picker and link input expose a named `role="dialog"` and restore focus on Escape.
  - [ ] Every item still runs its action, then `onclose`; `menu-item-anatomy.test.ts` passes.

### 21. Note action bar: Mac glyph tooltips, and the width toggle says when it cannot work

- **Proposals:** P95 (note action bar part), P40 (part).
- **Size:** S. **Blocked by:** 20 (`utils/keybindings.ts`). Not alongside shell-sidebars-ux 15, 24, 32 (same file).
- **What to build:** replace the "(Cmd+D)", "(Cmd+E)" and "(Cmd+\)" titles (`NoteActionBar.svelte:148,157,175`) with `formatShortcut` of combo constants local to the component (`layer-rules.test.ts:167` forbids importing `#lib/app/`), adding `Backslash: '\\'` to `CODE_DISPLAY_MAP`; `aria-label`s unchanged. While `settingsStore.editor.contentWidth === 0` the width action is disabled: label and title "Set a content width in Settings > Editor to use this"; inline `aria-disabled="true"` and the click does nothing; in More, `DropdownMenuItem disabled`. No settings file is touched.
- **Files:** `src/lib/features/note-action-bar/NoteActionBar.svelte`, `src/lib/utils/keybindings.ts`; tests `src/tests/lib/features/note-action-bar/NoteActionBar.test.ts`, `src/tests/lib/utils/keybindings.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: the favourite title is `` `${label} (${formatShortcut(shortcutFor('note:toggle-favorite'))})` `` (a test may import `app/`), the same for organized; the Raw title ends with `(⌘\)`; no title has "Cmd+" (assertions at `:183,191,200,207,214` updated, not deleted).
  - [ ] `formatShortcut({ code: 'Backslash', meta: true })` is `⌘\`.
  - [ ] Failing test first (real `settingsStore`): with `contentWidth` 0 the inline width button has `aria-disabled="true"` and the Settings label, and clicking leaves `wideNotes` unchanged; in a narrow bar the More item is disabled.
  - [ ] `NoteActionBar.test.ts:382-401` sets `contentWidth` 720 first and keeps its assertions; `layer-rules.test.ts` passes; `e2e/specs/note-action-bar.spec.ts` (finds buttons by `aria-label`, `:103-126` sets 600 first) passes.

### 22. Collection table: readable names, visible sort order, sticky header

- **Proposals:** P47 (view side), P48 (part), P142.
- **Size:** S. **Blocked by:** none. Not alongside shell-sidebars-ux 16 (`CollectionTableView.svelte`).
- **What to build:** pure `columnLabel(key, propertyConfigs)` (config `displayName`, else Name / Path / Folder / Extension / Size / Created / Modified for the seven `file.*` keys, else the key) used by `resolveColumns`, `PropertiesPanel` and `SortPanel`; pure `formatColumnCell(key, value)` drops a trailing `.md` for `file.name` only (values, filters and sorts unchanged); `th` `title` is the raw key when it differs. Pure `sortState(sorts, key)` gives `{ direction, rank } | null`; rank shows only with more than one sort; `aria-sort` on the primary sorted `th` only. Header click behaviour unchanged (replacing a saved multi-sort is deferred). The inner `overflow-auto` div (`CollectionTableView.svelte:39`) becomes a plain div; `th` gets `sticky top-0 z-10 bg-card` with an inset bottom shadow. Text cells wrap their text in a span with `max-w-80 truncate` and `title` (max-width on a `td` is unreliable in auto layout). Help `12-views.md` default column names.
- **Files:** `src/lib/features/collection/collection.logic.ts`, `CollectionTableView.svelte`, `toolbar/sort.logic.ts`, `toolbar/PropertiesPanel.svelte`, `toolbar/SortPanel.svelte` (`getDisplayName` bodies), `help/documentation/12-views.md`; tests `collection-logic.test.ts`, `sort-logic.test.ts`, `CollectionTableView.svelte.test.ts`, `CollectionView.test.ts`, new `toolbar/PropertiesPanel.svelte.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: with no `displayName`, `file.name` is `Name`, `file.mtime` is `Modified`, a note property keeps its key; `properties.file.name.displayName: Note` wins; `order`, filter and sort keys unchanged (`:342`, `:765` change in the same commit).
  - [ ] A `Roadmap.md` record renders `Roadmap`; header `title` is `file.name`; a `file.path` cell keeps its text; `getPropertyValue(record, 'file.name')` still returns `Roadmap.md`.
  - [ ] Two sorts render ranks 1 and 2 and only the first `th` has `aria-sort="ascending"`; one sort shows no rank; `CollectionView.view-writes.test.ts:195` stays green.
  - [ ] A 120-character text cell's inner span has `title` and the truncate classes; the `th` is `sticky`; no element between `th` and the component root has an `overflow-*` class.
  - [ ] `PropertiesPanel` and `SortPanel` show `Name` for `file.name`; `CollectionView.test.ts:422-460` compares names without `.md`; `RailNoteList.view.test.ts` and `.toolbar.test.ts` pass. Manual: header stays visible with 60+ rows.

### 23. Inline collection block: readable table, built-in names, other-views hint

- **Proposals:** P50, P09 (collection half), P47 (block side).
- **Size:** S. **Blocked by:** 22 (`columnLabel`, `formatColumnCell`), 08 (`styles.ts`).
- **What to build:** `buildCollectionTable` returns the table unchanged; `renderView` appends it inside a `cm-lp-table-scroll` div (`overflow-x: auto; overflow-wrap: normal; word-break: normal`, `th` nowrap). Month-grid and linear-calendar tables (they reuse `cm-lp-collection-table` with `tableLayout: fixed`) are not wrapped, and no new rule targets `.cm-lp-collection-table` alone. Date cells (`Date` or a `^\d{4}-\d{2}-\d{2}` string, since frontmatter dates are strings) and number cells get a nowrap class; text cells hold an inner span with max-width, ellipsis and `title`. Headers use `columnLabel` with `title` = key; name cells use `formatColumnCell`. `CollectionCacheEntry` carries the view names (computed on the cache-miss path, cache key unchanged); with more than one view the header appends a muted `1 of N views` whose `title` lists the other names.
- **Files:** `src/lib/features/collection/collection-block-widget.ts`, `src/lib/core/markdown-editor/extensions/live-preview/styles.ts` (collection rules only), `e2e/specs/collection-block.spec.ts`; tests `collection-block-widget.test.ts`, `styles.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: the table sits inside `.cm-lp-table-scroll`, the month-grid and linear-calendar tables do not; a date-string cell and a `Date` cell carry the nowrap class; a long text cell's span has `title`.
  - [ ] Headers read `Name` with `title="file.name"`; a `file.name` cell reads `w`, not `w.md` (`:188`, `:238`, `:254` updated).
  - [ ] A two-view YAML renders `1 of 2 views` with the second name in `title`, on first render and on a cache hit; one view renders no hint and the header stays `All (2)`.
  - [ ] `collection-block.spec.ts` expectations move to `'Roadmap | active'` / `'2026-Q2 | active'` and the row locator to `hasText: 'Roadmap'`; run it and `live-preview/click-reveal/collection-block.spec.ts`.

### 24. Filter and Sort panels: visible conjunction, keyboard sort order, named remove buttons

- **Proposals:** P139, P140, P22 (FilterRow and FormulaRow names).
- **Size:** S. **Blocked by:** 22 (`SortPanel.svelte` label line). Not alongside shell-sidebars-ux 16 (adds `onClear` to `FilterPanel.svelte`, different lines).
- **What to build:** conjunction triggers (`FilterPanel.svelte:113-115,175-177`) get the FilterRow trigger classes and a `ChevronDown`, labels unchanged. Sort rows sit in one `role="list"`; rows `tabindex="0"`; Alt+ArrowUp / Alt+ArrowDown call `onSortsChange(reorderSorts(sorts, i, i +/- 1))` (the same `.view` sort write a drop makes), focus stays on the moved row and a polite live region says "Moved <label> to position N of M". While dragging, an insertion line shows above the target when `dragIndex > target` and below when `dragIndex < target` (no pointer geometry), cleared on drop and dragend. Remove buttons get `aria-label` and `title`: "Remove sort by <label>", "Remove filter on <property>" (or "Remove filter"), "Remove formula <name>" (or "Remove formula"). No class change on FilterRow or FormulaRow.
- **Files:** `src/lib/features/collection/toolbar/FilterPanel.svelte`, `SortPanel.svelte`, `FilterRow.svelte`, `FormulaRow.svelte`; tests `toolbar/FilterPanel.svelte.test.ts`, new `toolbar/SortPanel.svelte.test.ts`, `FilterRow.svelte.test.ts`, `FormulaRow.svelte.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: both conjunction triggers contain a chevron and the bordered classes; text still "All the following are true"; choosing "Any" still emits `or`; `ViewDialog.svelte.test.ts` and `AutoOrganizeRuleRow.test.ts` unchanged.
  - [ ] Sort rows are `listitem`s inside one `list`; each remove is named "Remove sort by <label>".
  - [ ] Alt+ArrowDown on row 1 of 3 calls `onSortsChange` once with `reorderSorts(sorts, 0, 1)` and the live region names the position; Alt+ArrowUp on row 1 and a plain ArrowDown call nothing.
  - [ ] Dragging row 3 over row 2 shows the line above row 2, row 1 over row 2 below it; gone on drop and dragend.
  - [ ] `getByRole('button', { name: 'Remove filter on status' })` finds the visual-mode remove; raw-mode remove and both FormulaRow removes are found by name.
  - [ ] `RailNoteList.view.test.ts` and `.toolbar.test.ts` pass.

### 25. Calendars count undated notes; view tabs show their type

- **Proposals:** P49 (part), P138 (part).
- **Size:** S. **Blocked by:** shell-sidebars-ux 16 (`CollectionView.svelte`; its "Calendar settings" trigger name fixes the `svg.lucide-calendar` test trap at `CollectionView.test.ts:755`), 23 (widget header). Rebase over shell-sidebars-ux 25 if it lands first.
- **What to build:** pure `countUndated(records, dateProperty)` built on `extractDateFromRecord` in `calendar.logic.ts`; the widget computes it on the cache-miss path and stores it in `CollectionCacheEntry` (live-preview rule 2: no per-`toDOM` scan). For a calendar or linear-calendar view with a `dateProperty` and a count above 0, the block header reads `Name (12, 5 without date)` and the toolbar `12 results, 5 without <dateProperty>`; when records exist and none is dated, a muted "No dated entries" line replaces the empty grid in both places (`CollectionView.svelte:587` and the body branch `:695-720`). Each view tab shows a lucide `table` / `calendar` / `calendar-range` icon (`aria-hidden`); the disabled "Delete view" item carries the muted reason "A collection needs at least one view". No chevron menu; Rename, Change type and Delete handlers unchanged.
- **Files:** `src/lib/features/collection/calendar.logic.ts`, `collection-block-widget.ts`, `CollectionView.svelte`; tests `calendar-logic.test.ts`, `collection-block-widget.test.ts`, `CollectionView.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: `countUndated` is 0 for an empty list, counts missing and unparseable dates, ignores `endDateProperty`.
  - [ ] A calendar block over 3 records with 1 undated shows `1 without date` on first render and on a cache hit; a table block shows none; all undated shows "No dated entries".
  - [ ] The same counts in the toolbar for calendar and linear-calendar views; a table view still reads `N results` (`CollectionView.restored-view.test.ts:115-136` green).
  - [ ] Table, calendar and linear-calendar tabs render three different icons; with one view the Delete item has the reason and is still disabled; the `openConfig` helper (`CollectionView.test.ts:748-760`) finds the trigger by role and name.
  - [ ] Context-menu, double-click rename and `CollectionView.view-writes.test.ts` pass unchanged.
- **Overlap:** covers bullet 1 of open-itens 138 only; 138 stays open.

### 26. Readable text on coloured fills: kanban tag chips, linear-calendar bars, rail badge

- **Proposals:** P19 (part).
- **Size:** S. **Blocked by:** 11 (`KanbanCardText.svelte`), 15 (`KanbanTableView.svelte`). Rebase over open-itens 230 if it runs (`CollectionLinearCalendarView.svelte:198-205`).
- **What to build:** kanban tag chip text (board and table) becomes `color-mix(in oklab, <preset rgb> 30%, var(--editor-fg))` from a new `COLOR_PRESET_CHIP_TEXT` map (70% toward the editor foreground; 60% leaves 4.00:1 on Lavender Haze on a coloured card). Chip background and swatches keep `COLOR_PRESET_BG` / `COLOR_PRESET_TEXT`; `board.settings.tagColors` keys are untouched. Linear-calendar bars drop `text-white` and use the existing `barTextColor(...)`. The rail badge text is black or white by contrast with the item colour, from a pure helper in `rail-items.logic.ts` (Inbox becomes black on blue: 5.71 vs 3.68).
- **Files:** `src/lib/utils/color-presets.ts`, `src/lib/plugins/kanban/KanbanCardText.svelte`, `KanbanTableView.svelte`, `src/lib/features/collection/CollectionLinearCalendarView.svelte`, `src/lib/features/rail-shell/rail-items.logic.ts`, `Rail.svelte`; tests `src/tests/lib/utils/color-presets.test.ts`, `rail-items.logic.test.ts`, `Rail.test.ts`, `KanbanView.test.ts`, a linear-calendar render test.
- **Acceptance:**
  - [ ] Failing test first: for every tag preset on both built-in themes, chip text against the flattened real stack is at least 4.5:1 (`contrastRatio`, `flatten`, `mixColors` from `utils/color.ts`): tag tint 15% over (a) `--background` and (b) each card preset at 15% over `muted` at 30% over `editorBg`. It fails today (yellow on Lavender 1.57) and would fail at 60%.
  - [ ] `railBadgeTextColor('#3b82f6')` is `#000000`, a dark navy gives `#ffffff`, an unparseable value falls back to `var(--primary-foreground)`; `Rail.test.ts:451-457` moves on purpose.
  - [ ] A linear-calendar bar's `style` has `color: #000000` for a light `COLOR_PALETTE` hue and `var(--primary-foreground)` for the `var(--primary)` fallback.
  - [ ] A `#tag` chip's `style` contains `color-mix` and `--editor-fg`; swatches still use the full preset.

### 27. File History says what it compares and when something failed

- **Proposals:** P77 (part), P153 (part), P16 (item 3), P87 (SnapshotList part).
- **Size:** S (four component files, one store, one logic file). **Blocked by:** none. open-itens 023 (restore guard) is not covered; this ticket's catch will show its future error.
- **What to build:**
  - Failures: `handleRestore` catches and toasts "Could not restore this version. The editor may hold the restored text unsaved." and the dialog stays open (the save path itself is unchanged). The store gets `loadError` and `diffError`, cleared on success and by `reset()`. The list pane shows the load error with Retry only when no snapshots loaded (a `loadBackupTimestamps` failure after `setSnapshots` keeps the list). The diff pane shows the diff error with Retry instead of any diff, so a failed diff never leaves the previous snapshot's lines under the new selection.
  - Orientation: the header reads "Compared with the note on disk" and the snapshot date and time; the raw epoch goes (the right side is `readTextFile` at open, not the editor buffer, so never say "current"). `formatSnapshotLabel` gives "Latest saved version", "1 version before the latest", "N versions before the latest". A pure `diffSummary(lines)` in `file-history.logic.ts` feeds "+N" and "-M" chips; when both are 0 the pane shows "No differences from the note on disk" instead of chips. The diff table gets a `thead`: "Version" over old line numbers, "Note" over new, with `title`s.
  - Snapshot list: the reveal control becomes a sibling `<button aria-label="Show backup file in Finder">` next to the row's select button inside a wrapper that carries the hover and selected background; no `role="button"` inside a `<button>`.
- **Files:** `src/lib/features/file-history/FileHistoryDialog.svelte`, `SnapshotList.svelte`, `DiffViewer.svelte`, `file-history.store.svelte.ts`, `file-history.logic.ts`, `file-history.service.ts`; tests `src/tests/lib/features/file-history/FileHistoryDialog.test.ts`, `file-history.logic.test.ts`, `file-history.store.test.ts`, `file-history.service.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: `restoreSnapshot` rejects after confirm; the dialog stays open, `toast.error` fires, no unhandled rejection.
  - [ ] `get_file_history` rejects: `loadError` set, the list shows the message and Retry, not "No history available"; Retry reloads. A `loadBackupTimestamps` failure after snapshots loaded keeps the list.
  - [ ] A shown, then B selected and `compute_diff` rejects: `diffError` set, A's lines not rendered, Retry runs `selectSnapshot(B)`.
  - [ ] `diffSummary` counts `insert` and `delete` and gives `{ added: 0, removed: 0 }` for `[]` and all-`equal`; an all-equal diff shows the no-differences notice and no chips; `formatSnapshotLabel(0/1/2)` read as above (`file-history.logic.test.ts:79-92` updated, not removed).
  - [ ] With a selected snapshot the header has "Compared with the note on disk", "+N", "-M" and no 13-digit number; the `thead` number cells read "Version" and "Note".
  - [ ] No `role="button"` inside a `button` in the dialog; the reveal button has a name, works on Enter and Space, and does not change `selectedSnapshot`.
  - [ ] `reset()` clears both errors; `e2e/specs/focus-ring.spec.ts` dialog case still passes.

### 28. Appearance settings: theme rows ignore keys from their buttons, one catalog error with its reason, Install and apply, a theme editor that confirms discards and restores the theme on close

- **Proposals:** P108, P107 (part), P87 (theme row). Absorbs open-itens 155.
- **Size:** S. **Blocked by:** none. open-itens 205 (InlineAlert) comes after this.
- **What to build:**
  - Theme row keydown (`AppearanceSection.svelte:172-178`) selects only when the row itself is the target, and Space calls `preventDefault`. Today Enter on Delete of a non-active theme first makes it active, then `deleteTheme` resets to the default, so the real active theme is lost.
  - The catalog failure no longer toasts; the inline error keeps Retry and shows `err.message`. An install entry gets a primary "Install and apply" (one `updateAppearance({ ...result.appearance, activeTheme: pkg.name })`, then `applyActiveTheme()`) and an outline "Install" with today's behaviour; install failures keep their toast. Existing settings key, no schema change.
  - Theme editor: Back and Cancel on a dirty draft show an inline "Discard changes?" row with Keep editing and Discard; a clean draft cancels at once. `ThemeEditor` re-applies the active theme in `onDestroy` (idempotent after Save), so Esc, X and switching sections no longer leave the draft painted; `SettingsPanel.svelte` (mvp-claude) is not touched. The colour picker and hex field get accessible names from the row label.
- **Files:** `src/lib/core/settings/sections/AppearanceSection.svelte`, `ThemeEditor.svelte`, `ThemeColorRow.svelte`, `help/documentation/26-theming.md` (`:57`, Install bullet); tests `src/tests/lib/core/settings/AppearanceSection.test.ts`, `ThemeEditor.test.ts`.
- **Acceptance:**
  - [ ] Failing test first (real `settingsStore`): bubbling Enter and Space on Duplicate (and Edit for a user theme) of a non-active row leave `appearance.activeTheme` unchanged; Enter on Delete of a non-active user theme keeps the previous theme active; Enter on the row itself still selects it.
  - [ ] Failing test first: with the catalog fetch rejected (the `theme-catalog.service` network call mocked), `toast.error` is not called and `theme-catalog-error` shows Retry and the message (replaces `:316`, `:327`).
  - [ ] "Install and apply" adds the theme, sets `activeTheme` and `:root --background` equals the built theme's; "Install" leaves `activeTheme`; a name collision still toasts and changes nothing.
  - [ ] Failing test first (155): with Default active, open Create new theme, change a colour, unmount without Save: `:root` holds the active theme's value and `appliedThemeStore.isDark` matches.
  - [ ] Back on a clean draft calls `onCancel` once; after a colour change Back shows "Discard changes?" and `onCancel` fires only on Discard.
  - [ ] `getByRole` finds both inputs of a row by its label (hex with a "hex" suffix); the first-button queries (`:90,:92,:105,...`) target buttons by text.

### 29. Settings switches: dependents disable while their parent is off, and a switch that failed to start turns back off

- **Proposals:** P53 (part), P16 (items 2 and 4).
- **Size:** S. **Blocked by:** none.
- **What to build:** Auto-pin `disabled={!autoPin && !autoOpen}`; Heartbeat and Profile decoration plugins `disabled={!value && !(debugLogToFile || debugTauriLogToFile)}`. A switch that is on is never disabled, so it can always be turned off; stored values never change; "Save mod run messages to file" is not touched (separate consent, `TroubleshootingSection.test.ts:41-60`, `e2e/specs/settings.spec.ts:73-100`). These three switches get `aria-label` equal to their row label. Vault mods: on `startModsHost` rejection, toast "Could not start vault mods", `modsEnabledStore.setEnabled(false)` and `stopModsHost()` (the listener is registered before the first await, `mods-host.service.ts:1077`). Debug log: after `initLogSession()` resolves with `!isLogSessionActive()`, toast and set the switch that started it back to false (`updateDebugLogToFile(false)` / `updateDebugTauriLogToFile(false)`), no heartbeat.
- **Files:** `src/lib/core/settings/sections/PeriodicNotesSection.svelte`, `src/lib/core/settings/sections/TroubleshootingSection.svelte`, `src/lib/app/LabsSection.svelte`; tests new `src/tests/lib/core/settings/PeriodicNotesSection.test.ts`, `TroubleshootingSection.test.ts`, `src/tests/lib/app/LabsSection.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: with Auto-open and Auto-pin off, Auto-pin is disabled; Auto-open on enables it; Auto-pin stored on with Auto-open off is enabled, clicking turns it off and then it is disabled.
  - [ ] Both log options off: Heartbeat and Profile decoration plugins disabled; either log option on enables both; a stored-on Heartbeat with logs off can be turned off.
  - [ ] Failing test first: `startModsHost` rejects; `modsEnabledStore.enabled` is false, `stopModsHost` ran and a toast fired.
  - [ ] `isLogSessionActive` false after init: `debugLogToFile` ends false, a toast fired, `startHeartbeat` not called; same for the Tauri log switch; with the other log already active, turning one on keeps it on.
  - [ ] The consent test `:41-60` passes unchanged; `bash scripts/e2e.sh settings.spec.ts vault-mods.spec.ts` passes.

### 30. Auto Organize section: honest copy, archive-off hint, save-failure toast, excluded folders with feedback, named controls

- **Proposals:** P68, P66 (hint), P08 (toast), P28 (section names), P150.
- **Size:** S. **Blocked by:** 02 (`AutoOrganizeSection.svelte`, its test file).
- **What to build:**
  - Copy: Enable row "After a save, applies the rules below and the archive rules of your types: notes are moved, renamed or updated automatically." Rules help: "Rules run top to bottom after a save. The first matching rule wins for rename, move to folder and run mod action. Set properties and create note apply from every matching rule. Your types' archive rules run last. Conditions use the same syntax as Collection filters (e.g. `file.hasTag('archive')`)." Excluded folders: "Rules never run on notes inside these folders." (the hook skips every effect there, `auto-organize.service.ts:220-223`).
  - Hint, text only (an Enable button would also start every enabled user rule): when Auto Organize is off and at least one `typeDefinitionsStore.typeMetadataMap` entry has `archiveTo`, `<p class="px-4 text-meta text-muted-foreground">` "N of your types set an archive folder. While Auto Organize is off, Archive marks a note as archived but does not move it."
  - Failed save: `saveConfig`'s `.catch` also calls `toast.error('Could not save auto-organize rules', { id: 'auto-organize-save' })`. Service and file format unchanged; the loader guard (open-itens 031) stays deferred.
  - Excluded folders: a pure `isDuplicateExcluded(list, folder)` (trimmed, case-insensitive) in `auto-organize.logic.ts`; a duplicate is not added and "Already excluded" shows in an `aria-live` line; the input gets a `<datalist>` of vault-relative folders (`collectAllDirPaths` + `getRelativePath`); a chip whose folder is not in the tree (case-insensitive like `isInExcludedFolder`; skipped when the tree is empty or the folder is dot-prefixed) shows a muted "missing"; placeholder "e.g. _templates"; "No excluded folders" when empty.
  - Names: Enable switch "Enable Auto Organize", Debounce input "Debounce delay", Excluded folder input "Folder to exclude", each chip remove "Remove <folder> from excluded folders".
- **Files:** `src/lib/features/auto-organize/AutoOrganizeSection.svelte`, `auto-organize.logic.ts`; tests `AutoOrganizeSection.test.ts`, `auto-organize.logic.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: the text contains the three new sentences and no longer "determines the destination folder" or "never be automatically moved".
  - [ ] With Auto Organize off and two of three types setting `archiveTo`, the hint reads "2 of your types set an archive folder"; on, or no `archiveTo`, no hint; no new button.
  - [ ] With `writeTextFile` (`@tauri-apps/plugin-fs`) rejecting, "Add rule" toasts "Could not save auto-organize rules" once and `autoOrganizeStore.rules` still holds the new rule.
  - [ ] Adding "Archive", then "Archive" and "archive", leaves `['Archive']` and shows "Already excluded"; with `/vault/Archive` in the tree the datalist offers it; chip "Old Notes" shows "missing", "archive" and ".kokobrain" do not; an empty tree shows no marks; an empty list shows "No excluded folders".
  - [ ] The four controls have their names; removing `_templates` by name empties `excludedFolders`.
  - [ ] `settings-copy`, `settings-text`, `settings-controls` tests pass unchanged (still one raw button); `isInExcludedFolder` unchanged; `bash scripts/e2e.sh auto-organize-flows.spec.ts` passes.

### 31. Auto Organize rule row: stable property rows, template variables, named controls, Off state, focus on what you just added

- **Proposals:** P152, P69 (part), P70 (part), P185, P149 (part), P28 (rule row names).
- **Size:** S. **Blocked by:** 30 (`AutoOrganizeSection.svelte`, focus prop).
- **What to build:**
  - Property rows (set-property and create-note) keyed by a parallel `$state` id array in the Row: append on add, splice on remove, unchanged on edit, rebuilt when the array length changes from outside. A `WeakMap` keyed on the object breaks on Svelte deep-state proxies. Ids are never written to the rule. This removes today's wrong write, where the next row saves a deleted row's refused expression.
  - `TEMPLATE_VARIABLES` and `unknownTemplateVariables(template)` in `auto-organize.logic.ts`, using the same `/\{(\w+)\}/g` as `resolveDestination` and `includes` (never an object lookup); `resolveDestination` unchanged. Under Move to folder a `text-meta text-muted-foreground` variables line, replaced by a `text-destructive` warning "{yaer} is not a variable, so a folder named {yaer} would be created"; under Create note path and Rename (Name mode) only the warning. Nothing blocked or rewritten.
  - Names: "Rule name", "Enable rule", "Move rule up", "Move rule down", "Delete rule", "Move to folder", the icon button its existing title.
  - Off state: when `!rule.enabled` the card gets `border-dashed` and an "Off" pill (`data-rule-off`) beside the switch; every card gets `focus-within:border-ring`; no opacity change, inputs not disabled.
  - Focus: after "Add rule" the new rule's name input has focus (Section passes the new id); after "Add property", "Add note property" or "Add expression" the new row's first input has focus after `tick()` (the expression input found inside `[data-rule-filter]`, no `FilterRow` edit). `focus()` scrolls, so no `scrollIntoView`.
- **Files:** `src/lib/features/auto-organize/auto-organize.logic.ts`, `AutoOrganizeRuleRow.svelte`, `AutoOrganizeSection.svelte` (two or three lines); tests `auto-organize.logic.test.ts`, `AutoOrganizeRuleRow.test.ts` (edits additive: shell-sidebars-ux 16 adds one assertion), `AutoOrganizeSection.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: a rule with two set-property rows where row 0 shows a refused expression; remove row 0; the remaining row shows no error, and changing its mode saves its own expression (`autoOrganizeStore.rules[0].properties`), never row 0's.
  - [ ] A refused expression stays visible after a key change on the same row (no remount); `JSON.stringify(autoOrganizeStore.rules)` has no Row id field.
  - [ ] `unknownTemplateVariables('{folder}/{yaer}')` is `['yaer']`; valid, plain and empty give `[]`; `'{constructor}'` gives `['constructor']`; every `TEMPLATE_VARIABLES` name resolves through the real `resolveDestination`.
  - [ ] Typing `{folder}/{yaer}` shows the warning and the saved `destination` is exactly that text; a valid template shows the variables line.
  - [ ] The named controls are found by role and name; a disabled rule has `[data-rule-off]` and `border-dashed`, an enabled one neither, and the pill follows a prop change.
  - [ ] "Add rule" focuses the new "Rule name"; "Add property", "Add note property" and "Add expression" focus the new row's first input; mounting existing rows moves no focus.
  - [ ] `bash scripts/e2e.sh auto-organize-flows.spec.ts` passes (it finds the rule switch by `getByRole('switch').nth(1)`).

### 32. Auto Organize property rows: verb mode labels, errors tied to their fields, the legacy icon only where set

- **Proposals:** P147 (part), P148 (part), P151.
- **Size:** S. **Blocked by:** 31 (`AutoOrganizeRuleRow.svelte`, `AutoOrganizeRuleProperty.svelte`; 31's stable keys keep each error on its row).
- **What to build:**
  - Modes: labels "Set if missing", "Always overwrite", "Remove", "Add to list", each option with its label in its own element and a one-line description ("Writes only when the note has no value", "Replaces the note's value on every save", "Deletes the property", "Adds items to a list"); the trigger fits "Always overwrite"; stored `mode` values unchanged. `exprProblem`'s message (`auto-organize.logic.ts:511`) names "Set if missing" (copy only).
  - Errors: `aria-invalid="true"` and `aria-describedby` (ids from `$props.id()`, per row instance) on Create note path, Create note template, Rename to, Property expression, and Property key while `isRefusedKey`. Refusals kept unsaved lead with "Not saved:" in markup only, never in `BLANK_VALUE_ERROR` (the loader's `filterProblem` returns it too) or `exprProblem`. A stored invalid path, template or rename (hand-edited JSON) says a run ignores it, not "not saved".
  - Legacy icon (validated: no data migration): the button renders only when `rule.icon` is set, as an outline button "Legacy icon on move" with `pack:name` in its title and a muted hint pointing to the `_icon` property; picker, recolour and remove unchanged, so removing the icon hides the button.
  - Help `22-auto-organize.md:68,328,339,341,485` (labels only; the backtick stored values stay); `:62` only if the quoted message changes.
- **Files:** `src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte`, `AutoOrganizeRuleRow.svelte`, `auto-organize.logic.ts` (the message at `:511`), `help/documentation/22-auto-organize.md`; tests `AutoOrganizeRuleRow.test.ts`, `auto-organize.logic.test.ts`, `auto-organize.service.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: the mode menu offers the four labels with descriptions; choosing "Always overwrite" calls `onupdate` with `mode: 'always'`; `allowRemove={false}` offers no "Remove"; a lifecycle key offers no "Add to list".
  - [ ] Committing `notes/bad` in Create note path sets `aria-invalid` and its `aria-describedby` text starts "Not saved:"; a valid path removes both; the same for template, refused rename and refused expression; two property rows get different message ids; a stored invalid `createNote.path` shows the message without "Not saved:".
  - [ ] A rule without `icon` has no "Legacy icon on move"; with one, it opens the picker ("Change icon") and the `_icon` hint shows.
  - [ ] `exprProblem('now()', 'always')` names "Set if missing" (the three test files updated); `filterProblem` unchanged; the `choose` helper (`AutoOrganizeRuleRow.test.ts:187-199`) matches on the label element.
  - [ ] `bash scripts/e2e.sh auto-organize.spec.ts auto-organize-flows.spec.ts` passes, including "every property row fits its controls side by side inside the rule card" (`auto-organize.spec.ts:98-130`), which jsdom cannot check.

### 33. The rule filter reads "When" with one "Add condition"

- **Proposals:** P146 (part).
- **Size:** S. **Blocked by:** shell-sidebars-ux 16 (`FilterPanel.svelte` `onClear`), 24 (`FilterPanel.svelte`), 32 (`AutoOrganizeRuleRow.svelte`).
- **What to build:** `addFilter` (`FilterPanel.svelte:73-85`) moves to `filter.logic.ts` as a pure export taking groups, properties and index; `FilterPanel` calls it unchanged. `FilterPanel` gets one optional prop (default off) that hides its view-section header and its add button; only the rule row sets it. The row's label column reads "When", and one "Add condition" dropdown offers "Property filter" and "Expression", replacing both buttons. A blank row is still not saved. Help `22-auto-organize.md:82,109`.
- **Files:** `src/lib/features/collection/toolbar/FilterPanel.svelte`, `toolbar/filter.logic.ts`, `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte`, `e2e/specs/auto-organize-flows.spec.ts`, `help/documentation/22-auto-organize.md`; tests `FilterPanel.svelte.test.ts`, `filter.logic.test.ts`, `AutoOrganizeRuleRow.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: a rule row renders "When" and none of "This view", "Add filter", "Add expression"; `FilterPanel.svelte.test.ts:73,81` and the ViewDialog tests still find "This view".
  - [ ] "Add condition" > "Property filter" adds a filter row, "Expression" an expression row; `rule.expression` unchanged until a value is typed.
  - [ ] `addFilter` on `[]` makes one `and` group; on existing groups it appends to the first only.
  - [ ] `auto-organize-flows.spec.ts:29` opens "Add condition" and picks "Expression"; it passes, as do `rail-shell.spec.ts:661-712` and `rail-list-toolbar.spec.ts:237`.

### 34. Settings: text you can select, the Todoist root row fits, the update button says it downloads

- **Proposals:** P83 (part), P80, P126.
- **Size:** S. **Blocked by:** none. open-itens 157 (UpdateSection state on remount) runs after this.
- **What to build:** `select-text` on the SettingItem label and description spans, BuildInfo's container (`BuildInfo.svelte:49-52`), the dialog description, the Update error span and the "Changes in this build" text; toasts stay non-selectable (sonner's swipe fights drag-select). The Todoist Root project row (`TodoistSection.svelte:120-148`) uses `layout="stacked"`. The update button reads "Check and download"; install still waits for "Restart to update". The downloading state renders a `role="progressbar"` named "Download of update v<version>", with `aria-valuenow` when the size is known and text without "(?)" when it is not. Check and Retry handlers become `() => checkForUpdates()` (a refactor; the current call is already identical, so no test of its own). Help `19-settings.md:330,336` (separate hunk from mvp-claude's `:261-279`).
- **Files:** `src/lib/core/settings/sections/SettingItem.svelte`, `src/lib/core/settings/BuildInfo.svelte`, `src/lib/components/ui/dialog/dialog-description.svelte`, `src/lib/core/settings/sections/UpdateSection.svelte`, `src/lib/features/todoist-sync/TodoistSection.svelte`, `help/documentation/19-settings.md`; tests `SettingItem.test.ts`, `BuildInfo.test.ts`, `TodoistSection.test.ts`, `UpdateSection.restart.test.ts`, `UpdateSection.layout.test.ts`, a download-progress case.
- **Acceptance:**
  - [ ] Failing test first: SettingItem label and description, BuildInfo, a dialog description and the Update error carry `select-text`.
  - [ ] The `sync-root` row's root has `flex-col` and no control box with `max-w-[50%]`; Load projects, choose and load-error tests unchanged.
  - [ ] The idle button reads "Check and download"; existing flow tests change only the label lookup (`restart.test.ts:98,115,134,143`, `layout.test.ts:50`).
  - [ ] `Started{contentLength: 1000}` then `Progress{chunkLength: 500}` gives a named progressbar with `aria-valuenow="50"`; `contentLength: null` gives no "?" and no `aria-valuenow`.
  - [ ] Manual in `pnpm tauri dev`: a Settings description and the version can be selected and copied; rail and tabs cannot; the Root project row has no overlap at 1440 px.

### 35. Periodic Notes and 1:1: live path examples and missing-template marks

- **Proposals:** P124 (part).
- **Size:** S. **Blocked by:** 29 (`PeriodicNotesSection.svelte` and the test file it creates).
- **What to build:** format and template rows use `layout="stacked"`. Under each Format, a muted "Today: <folder>/<formatNow(format)>.md" using the existing `formatNow` (`utils/date.ts:15`), joined as `buildPeriodicNotePath` joins; an empty format shows the timestamp a create really makes. Under each periodic Template path and the 1:1 Template path, a muted "File not found" when the path is non-empty, a vault is open, the tree is loaded, no segment is dot-prefixed (`scan_vault` skips dot folders) and `findFileNode(fsStore.fileTree, vault, `${vault}/${path}`)` is null. Display only; no dayjs import in either Section.
- **Files:** `src/lib/core/settings/sections/PeriodicNotesSection.svelte`, `OneOnOneSection.svelte`; tests `PeriodicNotesSection.test.ts`, `OneOnOneSection.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: system time 2026-11-18, folder `Daily`, format `YYYY-MM-DD` shows "Today: Daily/2026-11-18.md"; editing the format updates it; the line equals `buildPeriodicNotePath('', folder, format, dayjs())` without the leading slash.
  - [ ] A template path absent from the tree shows "File not found"; present, empty, dot-prefixed, no vault or empty tree shows nothing; same for 1:1.
  - [ ] `settingsStore.periodicNotes` and `oneOnOne` are identical before and after rendering; `settings-copy.test.ts` and `layer-rules.test.ts` green.

### 36. Mods: each mod says what it does; the run view shows status and progress clearly

- **Proposals:** P169, P170 (part).
- **Size:** S. **Blocked by:** none (mods-host-robustness 01-04 touch none of these sites).
- **What to build:** `ModStatusEntry.description?: string`, set from the manifest at `mods-host.service.ts:758,843,873` and from `previous?.description` at `:1126`; shown as a muted line under the name. The load time moves to a `title` on the state label ("Loaded in 42 ms", "< 1 ms" kept); `data-mod-load-ms` stays. Run view: status coloured (`text-success` Done, `text-destructive` Failed, muted otherwise) with the text unchanged; progressbar `aria-label` "<title>, <done> of <total>"; log box `role="log"`. Help `28-mods.md:54-55`.
- **Files:** `src/lib/plugins/mods/mods.store.svelte.ts`, `mods-host.service.ts` (four object literals), `ModsStatusList.svelte`, `ModActionPicker.svelte`, `help/documentation/28-mods.md`; tests `ModsStatusList.test.ts`, `mods-host.service.test.ts`, `ModActionPicker.test.ts`.
- **Acceptance:**
  - [ ] Failing test first (real host, fs mocked): a manifest `description` shows in the row after load; none gives no empty line; it survives `disableMod` and a load error that had a manifest.
  - [ ] The row no longer contains "Loaded · 42 ms"; the state label `title` is "Loaded in 42 ms"; `data-mod-load-ms="42"` intact (`ModsStatusList.test.ts:116-133` updated).
  - [ ] The progressbar name contains the run title; `[data-mod-run-status]` has the destructive class on Failed and success class on Done with the same text; the log has `role="log"`.
  - [ ] Stop, focus and Enter tests unchanged; `bash scripts/e2e.sh vault-mods.spec.ts` passes.
- **Owner question:** the inline load time was added on purpose on 2026-11-08 (59f88c7be, mods-load-time Issue 01); the validated P169 moves it to a tooltip. Default: move it. If you want it inline, the ticket keeps only the description line.

### 37. The template picker names the template and what Enter will do

- **Proposals:** P81. Absorbs open-itens 059 (opposite design: refuse; P81 announces instead).
- **Size:** S. **Blocked by:** none.
- **What to build:** in the naming step, a chip with the chosen template's name; the hint reads "Creates <name>.md in the vault root" (the folder part as typed when the name has a `/`), or "Enter opens the existing note" when a file with that vault-relative path exists, matched case-insensitively against `fsStore.fileTree` by a pure function in `templates.logic.ts` (APFS `exists()` is case-insensitive; `findFileNode` is not). Backspace on an empty name returns to the template list with the dialog open. `createFileFromTemplate` is unchanged.
- **Files:** `src/lib/plugins/templates/TemplatePicker.svelte`, `templates.logic.ts`; tests `TemplatePicker.test.ts`, `templates.logic.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: after selecting "Daily" and typing "Standup", the dialog shows "Daily" and "Creates Standup.md in the vault root".
  - [ ] With `/vault/Standup.md` in the tree, "standup" shows "Enter opens the existing note"; Enter still calls `createFileFromTemplate` once with the typed name.
  - [ ] Backspace on the empty input shows the list again, keeps the dialog open, creates nothing.
  - [ ] An empty tree never shows "opens the existing note"; existing create, trim, close and empty-Enter tests pass.

### 38. The type name dialog stays open while it saves

- **Proposals:** P90 (part).
- **Size:** S. **Blocked by:** none. One attribute line in `TypesNavigator.svelte` rebases over shell-sidebars-ux 15 and 34.
- **What to build:** `TypeNameDialog` keeps itself open while `onConfirm` runs: the confirm button is disabled and shows a busy label (optional `busyLabel` prop; the rename passes "Updating notes..."); Cancel, the X, Escape and an outside click do nothing while busy; the error and "Saved as" line keep their pre-confirm state while busy (the store gains the new name mid-await and `validate` would flash "already exists"); the dialog closes in a `finally`. No inline-error branch: no caller rejects (`type-definitions.service.ts:173-196,220-246`). The rename write path is untouched.
- **Files:** `src/lib/features/type-definitions/TypeNameDialog.svelte`, `src/lib/features/rail-shell/TypesNavigator.svelte` (`busyLabel` at `:487-496`); tests new `src/tests/lib/features/type-definitions/TypeNameDialog.test.ts`, `TypesNavigator.test.ts`.
- **Acceptance:**
  - [ ] Failing test first (real component, `onConfirm` returns a held promise): after Enter the dialog is open, the confirm button is disabled with the busy label, and Cancel, X and Escape do not close it; once the promise resolves it closes.
  - [ ] While busy, a `validate` that starts returning an error renders no error line.
  - [ ] Enter twice while busy calls `onConfirm` once.
  - [ ] `TypesNavigator.test.ts` new-type and rename flows stay green.

### 39. Default theme: a darker tab strip with a visible tab hover, bold and italic off the link blue

- **Proposals:** P109, P20 (Default `inlineFg` part).
- **Size:** S. **Blocked by:** 10 (`src/app.css`). Rebase over shell-sidebars-ux 23 and 34 (`EditorTabs.svelte`, other lines); after open-itens 194 if that is ever run (same Default block and snapshot).
- **What to build:** delete `tabBar` from the Default overrides (`theme.logic.ts:155`) and set the static `.dark` fallback (`app.css:236`) to `#21222e`. Inactive tabs get a hover visible on the darker strip in place of `hover:bg-muted/30` (`EditorTabs.svelte:213`, which drops to 1.02:1), for example `hover:bg-editor-bg/60`. Delete `inlineFg` from Default (`:141`) so bold and italic derive to `fg`; set the static `--syntax-emphasis` / `--syntax-strong` (`app.css:292-293`) to match. Add `colorDistance(a, b)` (OKLab x100) to `utils/color.ts`. Built-in themes are served from code, so this restyles every vault on Default and writes nothing to it; user themes keep their saved colours.
- **Files:** `src/lib/core/settings/theme.logic.ts`, `src/app.css`, `src/lib/utils/color.ts`, `src/lib/core/markdown-editor/EditorTabs.svelte`; tests `theme-builder.logic.test.ts`, `theme.logic.test.ts:40`, `theme.service.test.ts:25,32`, `__snapshots__/theme-snapshot.test.ts.snap`, `src/tests/lib/utils/color.test.ts`, an EditorTabs test.
- **Acceptance:**
  - [ ] Failing test first over `BUILTIN_THEMES`: (a) `tabBar` luminance ratio to `editorBg` at most 1.5 (2.08 on Default today); (b) the inactive-tab hover composite against `tabBar` at least 1.1:1; (c) `colorDistance(strong, link)`, `(emphasis, link)` and `(strong, wikilink.target)` each at least 12 (10.7 today).
  - [ ] `colorDistance` unit test: equal colours 0; `#93c5fd`/`#60a5fa` about 10.7.
  - [ ] An inactive tab carries the new hover class and not `hover:bg-muted/30`.
  - [ ] The snapshot, `theme.logic.test.ts:40` and `theme.service.test.ts:25,32` move on purpose; `READABILITY_PAIRS` still pass on both themes.
  - [ ] The commit says the dark result was not checked by eye if it was not.

### 40. Faded text below 4.5:1 in the note list and search results

- **Proposals:** P25 (part).
- **Size:** S. **Blocked by:** shell-sidebars-ux 15 and 19 (`NoteRow.svelte`).
- **What to build:** note-row type and property chips use full `text-primary` (`NoteRow.svelte:103,114,124`); archived rows lose `opacity-60` (`:70`), keep the Archive icon and `data-note-row-archived`, and the prop doc at `:33` changes with them; the search snippet uses `text-file-explorer-muted-fg` (`SearchResult.svelte:171`).
- **Files:** `src/lib/features/note-list/NoteRow.svelte`, `src/lib/features/search/SearchResult.svelte`; tests under `src/tests/lib/features/note-list/` and `src/tests/lib/features/search/`, one contrast test.
- **Acceptance:**
  - [ ] Failing test first: on both built-in themes, `primary` on `primary` at 10% flattened over `fileExplorerBg` is at least 4.5:1, and the `/80` composite fails on at least one (Lavender 3.58).
  - [ ] An archived row has no `opacity-60` and keeps the attribute and icon (`RailNoteList.toolbar.test.ts:342` green).
  - [ ] The snippet has `text-file-explorer-muted-fg` and no `/60`.

### 41. Calendar month grid reads at a glance

- **Proposals:** P64 (part), P183 (part), P130.
- **Size:** S. **Blocked by:** none.
- **What to build:** month cells size their chip slots from the measured row height with the "+N more" footer reserved; unmeasured keeps today's 3. `focusViewFor` (`event-calendar-view.logic.ts:242-254`) keeps `MONTH_MAX_CHIPS` and gets a comment that the `[data-month-more]` focus fallback (`EventCalendarView.svelte:173-178`) covers a smaller measured capacity. The title drops the comma ("November 2026"). Out-of-month cells lose `bg-muted/40`, numbers keep `text-muted-foreground`. The daily-note button shows on cell or header hover, on focus and always on today (`opacity-0`, never `invisible`, so E2E can click it and it stays a Tab stop), with a `calendar-plus` glyph and the shared Tooltip under a `Tooltip.Provider` owned by `EventMonthGrid` and `EventDayHeaders` (bits-ui Tooltip throws without one, and six tests mount the grids bare). The today mark itself waits for the owner (see Deferred). Doc `27-calendar.md:30`.
- **Files:** `src/lib/features/event-calendar/EventMonthGrid.svelte`, `EventDayHeaders.svelte`, `EventDailyNoteButton.svelte`, `event-calendar-tasks.logic.ts`, `event-calendar-view.logic.ts`, `help/documentation/27-calendar.md`, `e2e/specs/event-calendar.spec.ts`, `e2e/specs/event-calendar-focus.spec.ts`, `e2e/specs/calendar-plugin.spec.ts`; tests `event-calendar-tasks.logic.test.ts`, `event-calendar-view.logic.test.ts`, `event-calendar-view.store.test.ts`, `EventMonthGrid.test.ts`, `EventCalendarView.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: `monthCellSlots` with capacity `{ all: 3, withFooter: 2 }` and 4 items shows 2, hides 2; 3 items shows 3; no capacity with 5 shows 3, hides 2. 125 px gives `{ 3, 2 }`; 40 px gives at least 1.
  - [ ] With the cells element's `clientHeight` stubbed to 750, a day with 4 events shows 2 chips and "+2 more".
  - [ ] New E2E at the default viewport: a day seeded with 5 events (`window.__e2e.fs.writeFile` + `vault-index-updated`) has its `[data-month-more]` bottom at or above its `[data-month-cell]` bottom (jsdom cannot prove the clip is gone).
  - [ ] `focusViewFor` unchanged, `event-calendar-view.logic.test.ts:434,675` green.
  - [ ] `rangeLabel(...).title` is `November 2026` for month, week and day; pins in `event-calendar-view.logic.test.ts:164-232`, `event-calendar-view.store.test.ts:119-133`, `EventCalendarView.test.ts:117` and the three E2E files updated.
  - [ ] Out-of-month cells have no `bg-muted/40`; `EventMonthGrid.test.ts:91,102` change on purpose.
  - [ ] A non-today daily-note button has `opacity-0` plus hover and `focus-visible` reveal classes, today's does not; `aria-label` and `data-daily-note` kept, no `title`; the six bare-mount sites and `event-calendar-daily-note.spec.ts` pass unchanged.

### 42. Calendar time grid shows what is now and what is hidden

- **Proposals:** P65 (part), P127 (part).
- **Size:** S. **Blocked by:** 41 (`event-calendar-tasks.logic.ts`).
- **What to build:** in week view a day with more than 3 tasks shows 2 chips and a "+N" that opens day view (the `buildAllDayChips` pattern); in day view the lane label shows the count and keeps its scroll. On mount, when today is visible and the now-line would sit below the viewport after the start-hour scroll, scroll so it sits a third down; otherwise keep the start-hour scroll. The mount reads `Date.now()` itself, because the store clock is acquired in the parent's `$effect` and can be hours stale at the child's `onMount`. Doc `27-calendar.md:34,40`.
- **Files:** `src/lib/features/event-calendar/EventTaskLane.svelte`, `EventTimeGrid.svelte`, `event-calendar-tasks.logic.ts`, `event-calendar-layout.logic.ts`, `help/documentation/27-calendar.md`; tests `event-calendar-tasks.logic.test.ts`, `event-calendar-layout.logic.test.ts`, `EventTaskLane.test.ts`, `EventTimeGrid.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: `taskLaneCells` with 5 tasks returns 2 chips and overflow 3; with 3 returns 3 and 0.
  - [ ] Week view, 5 tasks: 2 `[data-calendar-task]` and one `[data-task-lane-more]` "+3" named "3 more tasks, open day view"; clicking sets that date and the day view. Day view: no "+N", the label shows the count, every task renders.
  - [ ] `mountScrollTop` with now 15:40, start 8, viewport 600, header 90 puts the line a third down; 09:30 returns `8 * HOUR_HEIGHT`; before the start hour or no visible today returns the start-hour scroll.
  - [ ] With the store clock at a stale 08:00 and `vi.setSystemTime` at 22:15, the mounted `scrollTop` equals the 22:15 value; `EventTimeGrid.test.ts:287` still passes at a morning clock.

### 43. Calendar events say what you can do; the new-event form opens without an error

- **Proposals:** P129, P182, P91 (part). Absorbs open-itens 217.
- **Size:** S. **Blocked by:** 41 (`EventMonthGrid.svelte`).
- **What to build:** a "Mouse" group in the shortcuts dialog, with its own heading, from a new `CALENDAR_GESTURES` constant (gestures unchanged; the doc-tie tests on `CALENDAR_SHORTCUTS` stay untouched); doc 27 gains the month and all-day chip drag rows the code already supports. Read-only events get a decorative lock icon, `cursor-default`, ", read-only" at the end of the block's accessible name, and a popover caption reusing `EventForm.svelte:80`'s sentence. EventForm: `titleTouched` set on title input and blur; `aria-invalid`, `aria-describedby` and the message use `titleTouched && errors.title`; Save still reads the full `errors`; placeholder "Event title"; message `text-meta`.
- **Files:** `src/lib/features/event-calendar/event-calendar-keys.logic.ts`, `EventShortcutsDialog.svelte`, `EventBlock.svelte`, `EventMonthGrid.svelte`, `EventAllDayLane.svelte`, `EventPopover.svelte`, `EventForm.svelte`, `help/documentation/27-calendar.md`; tests `event-calendar-keys.logic.test.ts`, `EventCalendarView.test.ts`, `EventMonthGrid.test.ts`, `EventAllDayLane.test.ts`, `EventTimeGrid.test.ts`, `EventPopover.test.ts`, `EventDialog.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: the popover of a `readOnly` event shows `[data-popover-readonly]` with the sentence; a normal event does not.
  - [ ] `CALENDAR_GESTURES` is non-empty, each row has a label and a view scope, none repeats a `CALENDAR_SHORTCUTS` chord; the dialog via `openHelp()` shows a "Mouse" heading and one row per gesture; a doc tie checks each gesture row against `27-calendar.md`, month chip drag included.
  - [ ] Read-only month chip, all-day chip and time block contain the lock marker, and the block's name ends with "read-only"; `EventMonthGrid.test.ts:567` and `EventAllDayLane.test.ts:141` unchanged.
  - [ ] Failing test first: opening create shows no `[data-error="title"]`, no `aria-invalid`, Save disabled; focus and blur of the empty title show "Enter a title." with `aria-invalid="true"` and `aria-describedby`; spaces, colon and edit-mode cases unchanged; placeholder "Event title".

### 44. The Days mini month works narrow and by screen reader

- **Proposals:** P32 (part), P131 (part), P132 (part), P20 (weekend part).
- **Size:** S. **Blocked by:** none. Sequence with shell-sidebars-ux 34 (`CalendarNavigator.svelte:88`).
- **What to build:** a container-aware grid and header: `@container` on the navigator body, below about 190 px one-letter weekdays, hidden week column and short month label, chevrons `shrink-0`; `data-calendar-month-label` wraps only the full label (Playwright `toHaveText` reads hidden text). Day buttons get full-date labels with note counts ("1 note", "2 notes"), `aria-current="date"` on today, `aria-pressed` on the picked day; week buttons get `aria-label` "Open weekly note, week N". Today is a soft fill and bold number instead of `ring-1`, using a class token other than the exact `bg-file-explorer-primary` that the selected helpers read. Weekly-note failures toast "Could not open the weekly note". An explicit Today button sits beside all four existing chevrons (keep Previous/Next year: E2E uses "Next year"); the month label becomes plain text. Weekend headers and days use muted text, so weekend headers now look like weekday headers.
- **Files:** `src/lib/plugins/calendar/CalendarGrid.svelte`, `CalendarNavigator.svelte`, `calendar.logic.ts`, `e2e/specs/calendar-plugin.spec.ts`; tests `CalendarGrid.test.ts`, `CalendarNavigator.test.ts`, `calendar.logic.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: a week-number click whose `openOrCreatePeriodicNoteForDate` rejects calls `toast.error('Could not open the weekly note')`.
  - [ ] `buildMonthGrid(...)` exposes `shortLabel` ("Nov 2026") beside `label`.
  - [ ] A day with 2 notes has a name with weekday, full date and "2 notes"; 1 note "1 note"; none no count.
  - [ ] Today has `aria-current="date"` and no `ring-1`; the picked day has `aria-pressed="true"` and the exact `bg-file-explorer-primary`; today's fill uses another token (helpers at `CalendarNavigator.test.ts:44-50` move on purpose).
  - [ ] A named Today button returns to today's month and clears `railDay` after a month step; year and month chevrons stay.
  - [ ] Weekend headers and days carry `text-file-explorer-muted-fg`, never `text-file-explorer-primary` (`CalendarGrid.test.ts:61,69,71` move on purpose).
  - [ ] `[data-calendar-month-label]` holds only the full label and is not a button; `calendar-plugin.spec.ts:25,35-40` and `rail-shell.spec.ts:980-1000` pass with only "label goes back to today" rewritten to the Today button.
  - [ ] By-eye check at 140, 163, 200 and 260 px recorded in the commit (jsdom has no container queries).
- **Owner question:** weekend headers stop being marked (P20). Default: accept, weekend day numbers stay distinct.

### 45. The Tasks toolbar and list say what they do

- **Proposals:** P163, P165, P167, P63, P180, P164 (part).
- **Size:** S (one large component; the "Edit" rename churns about 20 test lookups, all mechanical). **Blocked by:** none. Sequence with tasks-view-ux 129 (needs-info, row markup).
- **What to build:**
  - Toolbar: the Display trigger shows the current grouping ("Display · Note"), truncating a long property key (the trigger is `shrink-0`); the sentence button reads "Edit sources"; the search field uses full `border-border` and `placeholder:text-muted-foreground`; Cmd/Ctrl+F focuses and selects it while the view is mounted, from a listener in `TasksView.svelte` that acts only when focus is in the view or on `<body>` (one TasksView can be mounted; `global-keybindings.ts` and doc 20, both mvp-claude, untouched).
  - List: the folder moves inline after "N of M open" (muted, truncated, hidden under 560 px), group spacing `space-y-4`, `data-task-group-subtitle` kept; dimmed context rows keep full opacity, get a thin token-coloured left rule from an inset shadow or pseudo-element (padding-left is inline, so a border would shift the indent), `title="Shown for context"` and `data-task-context`; an `aria-hidden` "or" divider between consecutive source cards.
  - Doc `10-tasks-and-todoist.md:107,158` and a Cmd+F mention.
- **Files:** `src/lib/features/tasks/TasksView.svelte`, `SourcesPanel.svelte`, `help/documentation/10-tasks-and-todoist.md`, `e2e/specs/tasks-view.spec.ts`; tests `TasksView.grouping.test.ts`, `TasksView.sources.test.ts`, `TasksView.lists.test.ts`, `tasks-view-settings.test.ts`, `TasksView.test.ts`, `TasksView.keyboard.test.ts`, `TasksView.filters.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: the default Display trigger includes "Note"; after `setGroupBy('due')` "Due date"; `{ property: 'area' }` "area"; `'heading'` "Heading"; its name starts with "Display" (`TasksView.grouping.test.ts:40` changes on purpose).
  - [ ] "Edit sources" keeps `aria-expanded`/`aria-controls` and toggles the panel; every "Edit" lookup (`TasksView.sources.test.ts`, `TasksView.lists.test.ts`, `tasks-view-settings.test.ts:345`, `TasksView.test.ts:409`) and `tasks-view.spec.ts:279` updated; the empty-state lookup is scoped to its container.
  - [ ] Cmd+F on a task row focuses the search input; from a contenteditable outside the view it does nothing and is not `preventDefault`ed; after unmount the listener is gone; Cmd+Shift+F still reaches the global handler. The search input has no `/50` class.
  - [ ] `[data-task-group-subtitle]` sits in the same row as the title and count; the list has `space-y-4`; the count text is unchanged.
  - [ ] A dimmed parent row has the title and data attribute, no `opacity-60`, an enabled toggle and the same inline `padding-left` as a passing row; a passing row has neither attribute.
  - [ ] Two source cards render one "or" separator (`aria-hidden`), one or zero none; Add card, Remove card and clause edits unchanged.

### 46. Frontmatter reads as metadata in source mode

- **Proposals:** P11 (source-mode part).
- **Size:** S. **Blocked by:** none.
- **What to build:** a source-only line-decoration ViewPlugin (shape of `extensions/callout/callout.ts`) that reuses `findFrontmatterBlock` / `FRONTMATTER_FENCE_RE` (`extensions/live-preview/parsers/frontmatter.ts:10-32`), wired into `sourceModeExtensions()` (`setup/editor-extensions.ts:99-107`). Lines from the opening `---` to the closing `---` get `cm-source-frontmatter`; the theme sets them and their spans to body size, normal weight and `var(--syntax-meta)`. Recompute on doc change only. No class when line 1 is not a fence, the fence is unclosed, or for a later `---`. This is a new source-mode decoration, not a change to live preview's decorations; read `docs/agents/live-preview-rules.md` before starting.
- **Files:** a new file under `src/lib/core/markdown-editor/extensions/`, `src/lib/core/markdown-editor/setup/editor-extensions.ts`; test `src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: in source mode `---\n_type: Meeting\n---\n# Title` puts the class on lines 1-3, not 4; live preview on none; the compartment swap toggles it (the `legacyClasses` objects gain the key on purpose).
  - [ ] No class for a doc not starting with `---`, an unclosed fence or a body `---`; typing the closing fence adds it and deleting it removes it.
  - [ ] The theme has a `.cm-source-frontmatter` rule for lines and spans with normal weight and `var(--syntax-meta)`.
  - [ ] `e2e/specs/live-preview/source-mode.spec.ts` and `source-mode-toggle.spec.ts` pass. Owner eye check: a typed note in source mode.

### 47. Undo for deleted Auto Organize rules and themes

- **Proposals:** P01 (parts b and d).
- **Size:** S. **Blocked by:** 30, 31 (`AutoOrganizeSection.svelte`), 28 (`AppearanceSection.svelte`). Lowest value of the list.
- **What to build:** rule delete and user-theme delete show an Undo toast for 8000 ms. Undo re-inserts only the removed item at its old index (clamped, pure "insert at index" helper in `auto-organize.logic.ts`), then saves through `saveAutoOrganizeConfig(capturedVaultPath)` / `updateAppearance` (existing writers, no schema change). Theme Undo restores `activeTheme` only when the deleted theme was active and the active theme is still the default, then `applyActiveTheme()`. Undo does nothing when `vaultStore.path` differs from the path at delete time (both stores are per vault: an Undo after a vault switch would write the rule into the other vault, where it moves notes), or when an item with the same id or name already exists. The Undo closure does not depend on the Settings panel staying mounted.
- **Files:** `src/lib/features/auto-organize/AutoOrganizeSection.svelte`, `auto-organize.logic.ts`, `src/lib/core/settings/sections/AppearanceSection.svelte`; tests `AutoOrganizeSection.test.ts`, `auto-organize.logic.test.ts`, `AppearanceSection.test.ts`.
- **Acceptance:**
  - [ ] Failing test first: removing a rule shows a toast with an Undo action and duration 8000; Undo restores it at its index and saves; a rule edited in between keeps its edit.
  - [ ] Undo after the vault path changed touches no store and writes nothing.
  - [ ] Undo works after the section unmounted.
  - [ ] Theme delete and Undo, including the `activeTheme` rule.

## Deferred

The list for later, by group. "Needs" says what would unblock it.

### Kanban board

| ID | Why deferred | Needs |
|----|--------------|-------|
| P02 drag while sorted or filtered, lane insertion bar | Same drop handlers and index math as open-itens 040 (unfixed, off-by-one) | 040 first, then a drag ticket |
| P03 roving tabindex, focus-visible ring, shortcut hint | M, changes the focus model of every card and menu | Focus-model design pass |
| P05 "..." lane menu | M, second copy of six lane actions and their pins | Menu design |
| P06 edge fades, scrollbar, toolbar Add lane / Archive, drops on the rail | M layout; moves the archive panel; toolbar is shell-sidebars-ux 25's | After 25 |
| P88 shared swatch radiogroup | Cross-feature primitive (canvas ColorPicker too) | A swatch primitive ticket |
| P145 editing without `{date}` / `{color}` tokens | Rewrites stored card text on commit | Owner data rule decision |
| P144 lane picker on Restore | Archived items store no lane | Design decision |
| P01 (a) kanban card, lane and archive Undo, lane-with-cards prompt | Rewrites `.kanban` files used daily | Write-path design and owner nod |
| open-itens 214 part 2 (lane grip) | Advertises lane drag that is broken (040) | After 040 |

### Editor authoring

| ID | Why deferred | Needs |
|----|--------------|-------|
| P41 | Lezer parses only `[ xX]`; `statusGlyph` is in `features/tasks` (core to features import); the status menu writes note text | New parse path, after open-itens 061 |
| P42 | Cmd+B is the right-sidebar toggle; `registerKeybinding` ignores `defaultPrevented`; `commands.ts` and `global-keybindings.ts` are mvp-claude files | Owner call on Cmd+B, after mvp-claude merges |
| P10 raw-mode Tab, pipe alignment, cell menu, 20 px handle and overlay (open-itens 211) | Rewrites table text; conflicts with pinned `table-add-buttons.spec.ts:31-42` and the tuned gap | Owner decision |
| P11 keys styled apart from values | Polish on top of 46 | After 46 |
| P40 default `contentWidth` | Settings store is an mvp-claude file; owner picks the number | After mvp-claude, owner number |
| P112 embedded notes as read-only markdown | M, new render path | Own ticket |
| P113 Toggle task command, Cmd+L, widget ARIA | Semantics undecided; `commands.ts` is mvp-claude; shares `TaskCheckboxWidget` with 061 | Owner semantics |
| P114 type name as default title, chevron dimming | Header text decoration; Phase 17 decision | Owner |
| P110 per-level space-above setting | Settings schema in `settings.types.ts` (mvp-claude) | After mvp-claude |
| P111 date input chrome | WebKit internals | None planned |
| P116 "N of M words" for a selection | No selection state in `editor.store.svelte.ts` (M) | New store state |

### Collection and QueryJS

| ID | Why deferred | Needs |
|----|--------------|-------|
| P141 column reorder | Writes `order` to the `.view`; built on open-itens 139 | 139 first |
| P48 plain click replaces sort | Rewrites a saved multi-column sort in the `.view` | Owner guard |
| P49 undated chip that opens a list | New popover and list UI (M) | Own ticket |
| P138 chevron tab menu | One click to a no-confirm Delete view and to `stringifyYaml` rewrites that drop comments (open-itens 071) | Delete confirm or undo decision |
| P09 ellipsis on QueryJS cells | Would hide script output | None planned |
| P47 humanized note-property and `formula.*` keys | Owner decision in open-itens 216 | Owner |

### Feedback and components

| ID | Why deferred | Needs |
|----|--------------|-------|
| P21 | New toolbar kit across 7+ components and an owner sizing decision | Owner sizes, then M |
| P93 | Badge primitive with no visible change until NoteRow and kanban adopt it | open-itens 204 |
| P175 | Pressed fill needs P85 state tokens in the shared `button.svelte`; cursor policy over ~148 sites | P85, owner policy |
| P01 (c) mod confirm focuses Cancel | Changes the documented `ctx.ui.confirm` Enter contract (`28-mods.md:446`) | Owner API decision |
| P01 property removal Undo | Frontmatter write; `PropertyField.svelte` owned by shell-sidebars-ux 04/10/11 | After those |
| P17 sticky errors, close button, Copy details, 8 s default | A toast helper and a sweep of about 104 call sites (M) | Helper ticket |
| P14 "Saved to <folder>/<name>", clipboard and deep-link feedback | Rust DTO change; `tauri-plugin-notification` is a new dependency | Rust ticket |
| P22 IconButton and Tooltip primitive | M, open-itens 207 | 207 |
| P77 compact empty-history dialog | Layout rework of the whole dialog | Own ticket |
| P83 selectable toasts | Drag-select fights sonner swipe; waits for Copy details | P17 helper |
| P89 clipboard before `^id`, shared copy helper | Moves a note write after an `await` with a stale offset; other call sites in live folders | Line re-validation design |
| P91 one error style across forms | Components owned by other slices | Sweep later |
| P153 Previous/Next change | Hunk index, scroll and focus (M) | Own ticket |
| P86 SegmentedControl primitive | Restyles six surfaces; owner design call | Owner |
| P87 NoteRow pills inside the row button; theme list as radio group | Note-list restructure; overlaps P85 | shell-sidebars-ux, P85 |
| P90 failure keeps the typed name | Needs the type-rename write path to report failure | Write-path change |
| P92 Settings shadow, Dialog size prop, Settings scrim | `SettingsPanel.svelte` is mvp-claude; size prop is M; scrim is open-itens 200 | After mvp-claude |
| P171 Settings `fly`, JS smooth scroll | mvp-claude file; other slices' files | Later |
| P172 "Failed to" / "Could not" voice sweep | Owner choice, many pinned strings (M) | Owner |
| P174 `text-[Npx]` lint, radius and z-index tokens | Needs a per-file baseline over other groups' files | Own ticket |

### Canvas

| ID | Why deferred | Needs |
|----|--------------|-------|
| P07 | A banner without a write guard still loses the file; the guard is a `.canvas` write-path change | open-itens 027 (owner D1 a, after 026) |
| P13 rename and edit label, double-click editing, "Add label" chip | New `.canvas` write; the persist effect ignores edges; `updateEdgeData` does not exist in xyflow 1.7.1; clearing hits open-itens 026 | 026 first, then M |
| P31 rebuild on bits-ui ContextMenu or Command; Settings focus half | M (menus open from xyflow events); `SettingsPanel.svelte` is mvp-claude | Later |
| P95 Undo, Redo, zoom-to-selection items, shared `Kbd` | New menu items and a design call | Owner |
| P137 FileNode reload on index change | Watcher or index subscription (indexing-watcher rules) | Own ticket under those rules |
| P12 node-tint hex suffixes | Not in the quick slice | Theming pass |

### Calendar and Tasks

| ID | Why deferred | Needs |
|----|--------------|-------|
| P128 | Restructures the sticky header 41-43 read; shrinking the empty all-day lane also shrinks the week create target | Design decision, M |
| P183 permanent today mark in the month grid | A primary ring equals the focus ring (`--ring` = `--primary`, `app.css:162,174`), the defect P132 removes | Owner picks ring or 44's fill; then a quick follow-up in `EventMonthGrid.svelte` |
| P64 5-row months, "+N" in the day row | Alternative design | None planned |
| P65 in-place expansion in day view | Sticky header growth needs a max-height design | Design |
| P127 Today button scrolls to now, "Now" pill | Needs a store signal; the grid does not remount within a week | Own ticket |
| P129 hover hint on empty month cells | Not in the quick slice | Later |
| P32 per-navigator `minWidth` | Pane and layout code | Later |
| P132 roving tabindex with arrows, Home, End | New focus management | Own ticket |
| P164 Global excludes behind a disclosure | `openSources('excludes')` focuses into it; tests reach it directly | Own ticket |

### Settings and Auto Organize

| ID | Why deferred | Needs |
|----|--------------|-------|
| P51 | `SettingsPanel.svelte` is mvp-claude | After mvp-claude merges (then quick) |
| P52 | Owner "if wanted"; edits `SETTINGS_SECTION_GROUPS` with mvp-claude | Owner, after mvp-claude |
| P67 | Apply-to-N-notes and Undo after automatic moves are bulk vault moves and renames (L) | Owner, indexing-watcher rules |
| P79 | Clickable status bar items were left for later (P176, shell-sidebars-ux 02); owner uses no external sync | Owner |
| P125 | Table rewrite of the Periodic Notes section (M) | After 35 |
| P08 loader guard, banner, Reveal and Retry, blocked save | Changes the rules-file write path | open-itens 031 |
| P28 SettingItem names every control; row click toggles its switch | 93 rows in 19 files plus mvp-claude's new section; click-through widens the hit area of data-writing switches; M | Owner nod, design |
| P53 "Save mod run messages" disabled while the log is off | Reverses a deliberate separate consent (eea4ae3cd), tested in unit and E2E | Owner |
| P66 read-only "From your types" rule list | Layout pass (M) | Own ticket |
| P69 Insert variable menu, live preview, folder suggestions; `{constructor}` own-key fix in `resolveDestination` | M; the fix touches the move path | Own tickets |
| P70 collapsible rule cards, effect summary, "Add action" | L, restructures the 549-line row | After 31 and 32 |
| P146 shared two-column label grid | Cosmetic, goes with P70 | With P70 |
| P147 collapse Source and Type choosers | Hides the Expression source, disclosure state, overlaps P70 | With P70 |
| P124 1:1 Folder and Filename format examples, Calendar day start | `{person}` substitution path unverified | Later |

### Colour, contrast and theming

| ID | Why deferred | Needs |
|----|--------------|-------|
| P26 | Needs a control-boundary token or a darker `borderStrong`, which also feeds `hrBorder`: a colour decision across every field | Contrast-pairs pass, owner colours |
| P27 | Folding the destructive label to `destructive-foreground` drops dark-mode labels to about 2.7:1 on the `/60` fill; the fix restyles every dark destructive button; error text needs a new token | Contrast-pairs pass |
| P85 | Three state tokens across navigators, note list, Tasks lists and the mvp-claude Settings nav | Contrast-pairs pass, after mvp-claude |
| P19 QueryJS and collection chips; one tag colour system | Live-preview widget; changing `.kanban` `tagColors` keys rewrites data | Later, owner |
| P20 section titles to foreground | After shell-sidebars-ux 05 | 05 |
| P23 `--focus-ring` token, feature-site sweep, scroll-area and `aria-invalid` rings | mvp-claude and live-folder files, unit pins, E2E `ringToken()`; design calls | After those folders land |
| P25 selected-row text, `--faint-fg`, property value alphas | New tokens; shell-sidebars-ux 04/10/11 own the property rows | Contrast-pairs pass |
| P107 Simple mode, per-token reset, grouping | L | Own ticket |

## Overlaps

### open-itens Issues fully covered (mark wontfix with a pointer once the ticket exists)

All were `ready-for-agent` in `.scratch/open-itens/issues/` at HEAD.

| open-itens | Covered by |
|------------|------------|
| 049 renaming a kanban lane keeps card limit and auto-complete | 03 |
| 197 kanban cards drop the empty date row | 14 |
| 213 word count and graph stats read correctly at zero | 09 |
| 050 canvas file nodes preview without YAML | 17 |
| 217 new event dialog shows "Enter a title" only after touch | 43 |
| 195 canvas nodes, edges and grid draw from theme | 19 |
| 196 canvas menus, pickers and edge labels use theme | 19 |
| 201 retention days and debounce accept typed values | 02 |
| 155 leaving the theme editor restores the theme | 28 |
| 059 new file from template says the name is taken | 37 (opposite design; do not run both) |

### open-itens Issues partly covered or touched (stay open)

- 086 (item 1 only, by 04), 138 (bullet 1 only, by 25), 215 (truncation only, by 22), 216 (sticky header and `file.*` names by 22; note keys still need the owner; needs-info).
- Same code, sequence with: 040 and 006 (kanban drag and wrong-tab write; 01, 11, 14 avoid their paths), 048 (lane rename to "Archive"), 214, 023 (File History restore guard; 27 shows its error), 031 (rules loader), 026, 027, 039, 051 (canvas data paths; 16, 17 sequence with them), 060 (`renderValue` array branch next to 04), 139, 140, 143, 157 (after 34), 194 (before 39), 205 (after 28), 230 (before or after 26), 204, 207, 089 (narrowed by 38, not fixed), 061, 071, 200, 211, 225 (its criterion will read 01's trigger), 226.

### Live folders (dependencies or exclusions, never replaced)

- **shell-sidebars-ux:** 25 (01, 11, 12, 16-20, 25), 16 (22, 24, 25, 33), 15/24/32 (21; 32 also `CODE_DISPLAY_MAP` with 20), 15/19 (40), 23/34 (39), 34 (44, 38), 05 (P20 titles, deferred), 06 (P174 imports: add the two unused `Separator` imports in `BacklinksPanel.svelte:6` and `OutgoingLinksPanel.svelte:6` to 06's checklist or commit them right after it), 04/10/11 (`PropertyField.svelte`, deferred P28 and P01 parts).
- **tasks-view-ux:** 129 (45). The P23 ring sites in `TasksView.svelte` / `TaskLists.svelte` stay with that folder.
- **frontmatter-rules:** 05 evaluates rules in the Auto Organize service; 30-33 and 47 do not touch the service.
- **claude-code-integration (mvp-claude):** no ticket edits a file on its diff. P42, P51, P52, the P40 default, the P110 setting, P113, the P31 Settings half, the P92 Settings shadow and the P171 `fly` wait for it to merge.
- **mods-host-robustness:** 01-04 touch none of 29's or 36's sites.
- **finders-ux:** done; no overlap.

## Colour and contrast: how big is it

Small. The group has 11 proposals: 1 is DONE (P106), 2 are QUICK (P108, P109), 5 are QUICK-PART (P19, P20, P23, P25, P107) and 3 are DEFER (P26, P27, P85). So 7 of 11 ship something now, and they fit in 5 tickets: 26 (readable chip text), 39 (Default tab strip and bold), 10 (focus ring, shared with reduced motion), 28 (Appearance settings, shared with the theme-row key fix) and 40 (faded text). Each is S, mostly token values and class swaps with contrast arithmetic as the failing test. It does not need dozens of issues.

What is left is one coherent "contrast pairs" pass: state tokens for selected and hover rows (P85), a control-boundary token (P26), and destructive label and error-text pairs (P27), plus the deferred halves of P23 and P25. Those need owner colour decisions and touch live-folder and mvp-claude files, so they wait; sized now they are one or two M tickets, not dozens.

## Owner questions

Each has a recommended default; a ticket proceeds with the default unless the owner says otherwise.

1. **17:** a plain click on a canvas file or link header selects instead of opening (validated P134, a daily-use change). Default: yes.
2. **36:** move the mods load time from the row into a tooltip, reversing mods-load-time Issue 01 (59f88c7be). Default: yes, as validated.
3. **44:** weekend headers in the mini month stop being highlighted (P20). Default: accept; weekend day numbers stay distinct.
4. **10:** under Reduce motion, spinners slow to 1.5 s and pulses stop. Default: as stated.

Deferred decisions to take later (not blocking any ticket): today mark in the month grid, ring or fill (P183; recommended fill, to match 44); Cmd+B (P42); Delete view guard (P138); plain-click sort semantics (P48); mod confirm Enter contract (P01 c).

## Not verified

Nothing was run; the verdicts read code at HEAD. Real-webview behaviour (WKWebView `field-sizing`, `select-text` under `body { user-select: none }`, container queries, sticky headers, focus scrolling, Playwright hidden-text matching) and every visual result need the by-eye checks named in the tickets.
