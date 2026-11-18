# Verdict: note actions and list keyboard model (P39, P24)

Adversarial check of `scout-nl-actions-keyboard.md` against HEAD `ab143a411`. Read-only. I opened every cited source line that a ticket depends on, the tests the criteria name, the architecture guards (`pure-logic.test.ts`, `layer-rules.test.ts`, `feature-cycle.test.ts`, `menu-item-anatomy.test.ts`), `file-history.service.ts`, `frontmatter-write.service.ts`, the help pages, the prototype's P39 script (`note-list-rail.html:826-945`), every open `.scratch/open-itens` Issue that names these files, and the sibling scouts `scout-sh-tabs.md` and `scout-sh-history-breadcrumb.md`.

## Proposals: still real?

| ID | Real | Verified at |
|---|---|---|
| P39 | yes | Row menu `NoteRowMenu.svelte:221-287` has no Archive, Organized, Move or History. Tab menu `EditorTabs.svelte:101-111` has Pin and Close only. More menu `NoteActionBar.svelte:207-219` has "Archive this note" and "Delete this note"; the row menu says "Move to Trash" (`:282-285`). Organized and Archive write only the active tab (`lifecycle.service.ts:30-41, 83-93`). Review evidence `commands.ts:405-415` is stale (it is Open Settings); the note commands are at `:338-351` and History at `:412-422`. `EditorTabs.svelte:98-109` is now `:101-111`. |
| P24 | partial | Rows are native Tab stops with no arrow keys (`NoteRow.svelte:67-81`); SearchPanel Escape only blurs (`SearchPanel.svelte:41-44`, review cites `:35-38`). Already true at HEAD: F2 rename (`NoteRow.svelte:73`), Enter and Space open a row (native button), the rail list search's Escape clears and closes (`RailListSearch.svelte:79-81` + `RailNoteList.svelte:511-514`). "Cmd+Enter for a new tab" has nothing distinct to do (`openFileInEditor` focuses or appends, `editor.service.ts:148-170`). |

The scout's code map holds. Where it is wrong or incomplete:

## Where the scout is wrong or incomplete

1. **History from the row or tab menu would overwrite the active note.** The scout says `openFileHistory(absolutePath)` "works for any path". Opening does, restoring does not. `restoreSnapshot` (`file-history.service.ts:82-105`) dispatches the snapshot into `editorStore.editorView` and calls `saveCurrentFile()`, both of which are the ACTIVE tab, and only null-checks `fileHistoryStore.filePath`. Today every opener uses `activeTabPath` (`commands.ts:418`, `global-keybindings.ts:173`), so the bug (open-itens 023, ready-for-agent, P1 corruption) needs a tab change while the dialog is open. A History item on a non-active row or tab makes it one click: History on row B while A is active, Restore, and A is overwritten with B's snapshot. Fix inside B and C: the shared History action first activates the note (`await openFileInEditor(path)`, which focuses an existing tab or opens one), then calls `openFileHistory(path)`. It then behaves exactly like the palette and adds no new exposure. History stays markdown-only (a board tab has no editor view, the silent no-op half of 023).
2. **Icons cannot live in `note-actions.logic.ts`.** The scout's descriptor `{ id, label(state), icon, ... }` would import `@lucide/svelte/icons/*`. `pure-logic.test.ts` forbids any specifier matching `(^|[/@-])svelte([/-]|$)` from a `.logic.ts` (ADR-0004), so the gate fails. The logic file returns ids, labels, `danger`, `separatorBefore` and applicability; each menu maps `id` to its icon.
3. **The shared group breaks a pinned menu invariant.** `NoteRowMenu.test.ts:314-322` is named "groups the items so no group holds a single item". The prototype ends every menu with `'-', Move to Trash` (`note-list-rail.html:828-835`), a group of one, and keeps Rename above the separator. The scout's criterion "order tests are updated, not loosened" does not see that this specific test cannot pass as is. Resolution (no test weakened): the last group reads `Archive, Mark organized, History, Move to Trash` with no separator before Trash, Trash keeping `variant="destructive"`; or the owner approves dropping the invariant. Owner question 4, recommended default: no separator, invariant kept.
4. **Two criteria assert against mocks.** `NoteRowMenu.test.ts:38` and `RailNoteList.test.ts:33` both `vi.mock('#lib/features/properties/lifecycle.service.js')`. The scout's B2 ("assert the row's file changed") and A3 ("fs mocked, real writer") cannot be met in those files; with the mock they degrade to `toHaveBeenCalledWith` as the only assertion, which TESTING.md rejects. The real-writer precedent is `NoteRowMenu.favorite.test.ts` (fs and `invoke` mocked, real `lifecycle.service`). Put the by-path write assertions in `NoteRowMenu.lifecycle.test.ts` (new, modelled on the favorite file) and `RailNoteList.inbox-check.test.ts` (new, no lifecycle mock). In the jsdom list, "the row leaves" happens only when the test feeds the updated entry through `typeDefinitionsStore.setEntries` (as `RailNoteList.test.ts:99` does); the criterion must say so, and assert `vaultStore.takePromptIndexRefresh()` is true (real store state, `vault.store.svelte.ts:115-123`).
5. **Roving by `note.path` breaks the neighbourhood lens.** The grouped `VList` is not only Today. `resolveNeighbourhoodLens` (`lens.logic.ts:395-422`) puts one note in several groups (Outgoing links and Backlinks and Belongs to), keyed `${group.id}:${note.path}` (`RailNoteList.svelte:678`). With `note.path` as the roving key two rows share the tab stop and ArrowDown can jump back. Key the roving order by the list item key (`item.key` in the grouped list, `note.path` in the flat one). Also: `keepMounted` and `scrollToIndex` take indices into the VList `data` (`Virtualizer.type.d.ts:69,134`), which for a grouped list are `groupedItems` indices (headers, empties and sections included), not note indices.
6. **Palette "Move Note to Trash" must refuse virtual tabs.** The palette acts on `editorStore.activeTabPath`. For a Tasks, Graph or Tags tab that is `__virtual__/...` (`editor.logic.ts:18-20`); `deleteNoteWithConfirm` would ask to trash it. Guard with `isVirtualTab` and toast "No file is open." as View File History does (`commands.ts:418`).
7. **Missed consumer: `TypesNavigator.svelte:343` calls `deleteNoteWithConfirm`.** Moving `requestPromptIndexRefresh()` into the shared delete gives the Types navigator's `.view` delete a prompt refresh too (harmless, arguably right), and changing the prompt text changes its `.view` prompt documented at `help/documentation/25-types-and-relationships.md:182`. Owner question 5's default (file name everywhere, the current `deleteNoteWithConfirm` text) leaves TypesNavigator's text unchanged; only the row's prompt moves from title to file name.
8. **Help pages missed.** The labels and menus are documented: `02-file-explorer.md:53-67` (row menu table), `03-editor.md:27` (tab menu), `03-editor.md:50-52` (bar, More: "Archive this note", "Delete this note"), `25-types-and-relationships.md:182,284,659` ("Delete this note", "More > Archive this note"), `20-keyboard-shortcuts.md:101-` (palette commands without shortcuts), `06-search-and-navigation.md:90` ("`Escape` only leaves the input"). `e2e/specs/rail-shell.spec.ts:312` clicks the menu item "Archive this note"; the scout listed rail-shell.spec only for Inbox rows. `help/documentation/28-mods.md:657` "Archive this note" is a mod example title, not the app label: leave it.
9. **EditorTabs is a scheduling conflict, not a rebase.** `scout-sh-tabs.md` plans to key the `{#each}` by `tab.path`, wrap each tab trigger in a Tooltip through a `child` snippet, and reads `EditorTabs.test.ts:114-158` as "do not add menu items". C edits the same per-tab `ContextMenu.Root` block (`:49-113`) and that test. One of them goes first with a Blocked by line; C's test change to `['Pin tab', 'Close tab']` is the intended behaviour change and must be stated as such in the sh-tabs ticket too.
10. **Shortcut hint in the menus.** The prototype shows `⌘E` on "Mark organized" in the row and tab menus. Cmd+E acts on the active tab (`global-keybindings.ts:197-202`), not the menu's target, so the hint lies on a non-active row. `menu-item-anatomy.test.ts` also requires any hint to be `{formatShortcut(...)}`. Default: hint only in the More menu (the active note), none in row and tab menus, none on the inline check.
11. **"Move to..." is not a ticket in this wave.** No folder picker exists, the prototype only toasts a stub (`note-list-rail.html:858`), and the scout itself recommends leaving it out. Ticket D is dropped below, not parked as an optional ticket that would need its own grooming anyway.
12. **Rare race, stated not handled.** `updateNoteFrontmatter` on a closed note says "concurrent calls on one closed note race and the last write wins" (`frontmatter-write.service.ts:96-98`). Mark organized then Archive on the same closed note within one write could lose one flag. Two separate menu openings make this unlikely; recoverable. No code for it (CLAUDE.md section 2). The inline check double click is safe: with `set` semantics the second call sees `next === base` and writes nothing (`:125`).
13. **Container focus.** The bits-ui context-menu trigger spreads `tabindex: -1` onto the list wrapper (`node_modules/bits-ui/dist/bits/menu/menu.svelte.js:1599`, spread at `NoteRowMenu.svelte:203`). F's "focus was inside the list" rule must count the wrapper itself (a click on a blank area focuses it), and the wrapper must not become a Tab stop.

Checked and correct: layer constraint (`EditorTabs.svelte` cannot import features; `EditorView.svelte:67` passes snippets), feature pairs (`note-list -> properties`, `note-action-bar -> properties`, `properties -> file-history` all exist in `feature-cycle-baseline.json`, so `note-actions.logic.ts` in `features/properties` adds no pair), by-path writes run `notifyAfterSave` for a closed note (`frontmatter-write.service.ts:150-161`), so a row Archive applies `_archive_to` like the bar; `closeTab` re-finds by path after its awaits (`editor.service.ts:384-386`); `tasks-keys.logic.ts:46-112`; `explicitOrganization` default true (`settings.store.svelte.ts:158`); `getBuiltInCommands()` evaluated in the template (`AppOverlays.svelte:19`).

## Ticket breakdown

Order: A, then B, then C (C after or before the sh-tabs EditorTabs ticket, never in parallel). E is independent of A to C; F needs E and A.

### A. Inbox rows get a one-click "Mark organized" (P39, Inbox half) (S)

**What to build:** `setOrganizedForPath(path, organized)` in `lifecycle.service.ts`, same shape as `toggleFavoriteForPath` (prompt refresh, `updateNoteFrontmatter(path, (p) => toggleOrganized(p, organized))`, frontmatter toast). `NoteRow.svelte` gets an optional `onOrganize?: (note) => void`; when set, the row renders in a `relative` wrapper with a sibling `<button tabindex="-1" aria-label="Mark organized" title="Mark organized">` (CircleCheck, top right, shown on hover, focus-within or active row, green on hover) and the title reserves right padding. The check is a sibling of `[data-note-row]`, never inside it. `RailNoteList.svelte`'s `noteRow` snippet passes `onOrganize` only when `lens.kind === INBOX_LENS.kind` and the row is markdown. No toast on success (Cmd+E shows none).

**Files:** `src/lib/features/properties/lifecycle.service.ts`, `src/lib/features/note-list/NoteRow.svelte`, `src/lib/features/rail-shell/RailNoteList.svelte`.

**Blocked by:** none. Shares `RailNoteList.svelte` with nl-header-creation and nl-empty-states (other regions), `NoteRow.svelte` with nl-rows-sections P117/P120: sequence, one at a time.

Acceptance criteria:
- [ ] Failing test first, new `src/tests/lib/features/properties/lifecycle.service.organized-path.test.ts` (modelled on `lifecycle.service.favorite-path.test.ts`; Tauri fs and `invoke` mocked, real writer and stores): a closed note with `_organized: false` gets `_organized: true` with `_archived` and the body unchanged; an open tab with unsaved body edits keeps them; a second call writes nothing; `vaultStore.takePromptIndexRefresh()` is true after the call; lossy frontmatter shows the frontmatter toast and writes nothing.
- [ ] Failing test first, new `src/tests/lib/features/note-list/NoteRow.test.ts`: with `onOrganize` the check exists, is not a descendant of `[data-note-row]`, has `tabindex="-1"`, an accessible name and a `title` with no shortcut; clicking it calls `onOrganize` with the note and does not open the note (`openFileInEditor` is a mocked editor service, a side-effect boundary); without `onOrganize` no check renders.
- [ ] Failing test first, new `src/tests/lib/features/rail-shell/RailNoteList.inbox-check.test.ts` (no `lifecycle.service` mock; fs and `invoke` mocked; virtua shim copied from `RailNoteList.test.ts:9-30`): Inbox rows have the check, Favorites, Archive, a type lens and a folder lens rows have none; clicking the check on Alpha writes `_organized: true` to Alpha's file even while another note is the active tab; after the test feeds the updated entry through `typeDefinitionsStore.setEntries`, Alpha's row is gone and the count drops; two clicks leave the file organized.
- [ ] Right-click on the check opens no menu for any row (blank-area rule, `NoteRowMenu.svelte:209`).
- [ ] `RailNoteList.test.ts`, `NoteRowMenu.test.ts`, `layer-rules`, `feature-cycle` and `pure-logic` tests stay green.
- [ ] E2E via `bash scripts/e2e.sh`: in Inbox, click the first row's check; the row leaves, the Inbox count drops, the file has `_organized: true`; `rail-shell.spec.ts` and `rail-list-toolbar.spec.ts` stay green.
- [ ] Help: `02-file-explorer.md` (or the Inbox paragraph in `25-types-and-relationships.md`) gets one line on the check.
- Gate: `pnpm check` + `pnpm vitest run`.

### B. One note-actions group in the row menu, the More menu and the palette (P39, shared list) (M)

**What to build:**
- New pure `src/lib/features/properties/note-actions.logic.ts`: `noteActions(kind, { organized, archived })` returns ordered `{ id, label, danger }` for `archive` ("Archive" / "Restore"), `organized` ("Mark organized" / "Mark not organized"), `history` ("History"), `trash` ("Move to Trash", danger). Markdown gets all four; canvas, view, PDF, image and other files get `trash` only. No icons in this file (finding 2); each menu maps id to icon.
- `setArchivedForPath(path, archived)` in `lifecycle.service.ts` (A's shape, `toggleArchived` semantics: `_organized` untouched, after-save hooks apply `_archive_to`).
- `NoteRowNote` gains required `organized` and `archived` (moved down from `LensNote`); `toLensNote` copies `entry.organized`; the `fileToLensNote` literal sets `organized: true, archived: false`.
- `NoteRowMenu.svelte`: the last group becomes Rename then the shared group, no separator before Trash (finding 3, owner question 4). Its delete calls `deleteNoteWithConfirm`; the prompt refresh `runOrToast` did moves into `deleteNoteWithConfirm` (`core/filesystem` importing `core/vault` is core to core).
- `NoteActionBar.svelte` More menu: after Copy deeplink, the shared group in the same order and labels ("Archive this note" and "Delete this note" go away). The inline Organized button keeps its own labels.
- History in every menu: activate the note first, then open History (finding 1). Shortcut hint only in the More menu, via `formatShortcut` (finding 10).
- Palette (`commands.ts`, category Note, stable labels beside "Toggle Favorite" and "Toggle Organized"): "Toggle Archived" and "Move Note to Trash", both on the active tab; Trash refuses a virtual tab (finding 6).
- Help pages from finding 8, plus `e2e/specs/rail-shell.spec.ts:312`.

**Files:** new `note-actions.logic.ts`, `lifecycle.service.ts`, `src/lib/features/note-list/NoteRowMenu.svelte`, `note-row.types.ts`, `src/lib/features/rail-shell/lens.logic.ts`, `rail-shell.types.ts`, `src/lib/features/note-action-bar/NoteActionBar.svelte`, `src/lib/core/filesystem/delete-note.service.ts`, `src/lib/app/commands.ts`, help pages.

**Blocked by:** A (same `lifecycle.service.ts`, same writer shape). Cross-cluster: `NoteActionBar.svelte` More menu with sh-history-breadcrumb P102 ("Reveal in note list" first item), `commands.ts` with sh-menus-settings, `lens.logic.ts` with nl-rows-sections P117, `NoteRowMenu.svelte` "Open in new tab" with P35: sequence.

Acceptance criteria:
- [ ] Failing test first, new `src/tests/lib/features/properties/note-actions.logic.test.ts`: markdown `{organized: false, archived: false}` gives Archive, Mark organized, History, Move to Trash; organized and archived give Restore and Mark not organized; canvas, view and PDF give Move to Trash only; only Trash is `danger`.
- [ ] Failing test first, `NoteRowMenu.test.ts` (keeps its lifecycle mock, asserts entries only): the markdown order test becomes `['Open in new tab', 'Duplicate', '---', 'Copy path', 'Change icon', 'Favorite', 'Reveal in Finder', '---', 'Rename', 'Archive', 'Mark organized', 'History', 'Move to Trash']`; the canvas test ends `'Rename', 'Move to Trash'`; "no group holds a single item" stays as written; labels follow the row's `organized` and `archived`.
- [ ] Failing test first, new `src/tests/lib/features/note-list/NoteRowMenu.lifecycle.test.ts` (real writer, fs mocked, as `NoteRowMenu.favorite.test.ts`): with note B the active tab, Mark organized and Archive on row A write A's file and leave B's tab content unchanged.
- [ ] Failing test first: History on row A while B is active leaves A the active tab and `fileHistoryStore.filePath === A` (real `editorStore` and `fileHistoryStore`; `get_file_history` via mocked `invoke`).
- [ ] Failing test first, `NoteActionBar.test.ts`: More lists the shared group in the same order and labels as the row menu for the same state (`:524` and `:532` updated); "Delete this note" and "Archive this note" appear nowhere under `src/lib`; More > Move to Trash confirmed trashes and closes the tab (`:324-350` cases renamed, same disk assertions).
- [ ] Failing test first, `delete-note.service.test.ts`: `deleteNoteWithConfirm` requests a prompt refresh (`vaultStore.takePromptIndexRefresh()` true) before the delete; the row's delete asks the same text and options as the bar (`NoteRowMenu.test.ts:430-438` now expects the file name); a `PreDeleteSaveError` still adds no toast.
- [ ] Failing test first, `commands.test.ts`: "Toggle Archived" and "Move Note to Trash" exist in category Note and act on the active note; with a virtual tab active, Move Note to Trash calls no `ask` and toasts "No file is open.".
- [ ] `lens.logic.test.ts`: `toLensNote` carries `organized` and `archived`; the folder-lens non-markdown row has `organized: true, archived: false`.
- [ ] `pure-logic.test.ts`, `menu-item-anatomy.test.ts`, `feature-cycle.test.ts` (no new pair) and `layer-rules.test.ts` stay green.
- [ ] E2E: `file-operations.spec.ts` (still `/Move to Trash/i`), `note-action-bar.spec.ts` and `rail-shell.spec.ts:312` updated for the new labels.
- Gate: `pnpm check` + `pnpm vitest run`.

### C. Tab menu: Close others, Close to the right, and the shared note group (P39, tab half) (M)

**What to build:** `closeOtherTabs(path)` and `closeTabsToTheRight(path)` in `editor.service.ts`: snapshot the target paths first, then for each path re-find with `findTabIndex` and `await closeTab(index)`, so pinned tabs are skipped and the dirty-save "Close anyway" prompt is reused; a declined prompt keeps that tab and the loop goes on; after Close others the target is active. `EditorTabs.svelte` menu: Pin or Unpin tab; then, unpinned only, Close tab, Close others (disabled with one closable other), Close to the right (disabled on the last tab); then an optional `noteActions?: Snippet<[EditorTab]>` rendered for markdown note tabs. `EditorView.svelte` fills the snippet from B's list, with state from `getActionBarState(tab.path, tab.content)` and by-path writers; History activates the tab first (finding 1).

**Files:** `src/lib/core/editor/editor.service.ts`, `src/lib/core/markdown-editor/EditorTabs.svelte`, `src/lib/app/EditorView.svelte`, `help/documentation/03-editor.md:27`.

**Blocked by:** B. Same block of `EditorTabs.svelte` (`:49-113`) and `EditorTabs.test.ts:114-158` as the sh-tabs ticket (P34): one Blocked by the other, chosen at breakdown (finding 9).

Acceptance criteria:
- [ ] Failing test first, `editor.service.test.ts`: tabs [A, B pinned, C dirty and saving, D dirty with the save failing and "Close anyway" declined, E]; `closeOtherTabs(A)` leaves [A, B, D] with A active, C saved before closing; `closeTabsToTheRight(C)` closes only tabs after C, skips pinned ones, and leaves `activeIndex` valid when the active tab was among them.
- [ ] Failing test first, `EditorTabs.test.ts`: an unpinned markdown tab lists Pin tab, Close tab, Close others, Close to the right, then the shared group in B's order (the `['Pin tab', 'Close tab']` case at `:143-149` is updated as the intended change); a pinned tab lists Unpin tab then the shared group; a Tasks, Graph or Tags tab lists no shared group; disabled states as above.
- [ ] Failing test first, `EditorView.test.ts`: Archive and Mark organized on a non-active markdown tab write that tab's path, the active tab's content unchanged.
- [ ] `EditorTabs.svelte` imports nothing from `features/` or `plugins/` (`layer-rules.test.ts` baseline unchanged); `menu-item-anatomy.test.ts` green.
- [ ] E2E: `tab-pinning.spec.ts` (or `tabs.spec.ts`) covers Close others and Close to the right with a pinned tab kept.
- Gate: `pnpm check` + `pnpm vitest run`.

### E. Shared roving-list logic and keyboard for Search results (P24, Search half) (M)

**What to build:** pure `src/lib/utils/roving-list.ts` with the generic parts of `tasks-keys.logic.ts`: focus resolution for ArrowUp/ArrowDown/Home/End (clamped, null on modifiers or `count === 0` or a key off the row), `nextCurrentRow`, `tabStopRow`. `tasks-keys.logic.ts` keeps every export and signature and delegates. `SearchPanel.svelte`: ArrowDown in the input focuses the first result button; arrows, Home and End move among result buttons (`[data-search-result] > button`, not virtualized); ArrowUp on the first result returns to the input; one result button has `tabindex=0`. Escape follows owner question 2. `SearchResult.svelte` only takes the `tabindex` it is given.

**Files:** new `src/lib/utils/roving-list.ts`, `src/lib/features/tasks/tasks-keys.logic.ts`, `src/lib/features/search/SearchPanel.svelte`, `src/lib/features/search/SearchResult.svelte`, `help/documentation/06-search-and-navigation.md:90`.

**Blocked by:** none (finders-ux 03 to 05 are merged).

Acceptance criteria:
- [ ] Failing test first, new `src/tests/lib/utils/roving-list.test.ts`: clamping, Home and End, modifier and `count === 0` rules, `nextCurrentRow` and `tabStopRow` cases. `tasks-keys.logic.test.ts` and `TasksView.keyboard.test.ts` pass with no edit.
- [ ] Failing test first, `SearchPanel.test.ts` (real `searchStore`, search service mocked as today): with three results, ArrowDown in the input focuses the first result; ArrowDown, End, Home move focus; exactly one result button has `tabindex="0"` and it follows focus; ArrowUp on the first returns to the input; Enter on a focused result opens it as a click does.
- [ ] If the owner approves question 2: Escape with a non-empty query clears it and keeps focus in the input; Escape with an empty query blurs and keeps Search shown (`SearchPanel.test.ts:153-163` unchanged); `e2e/specs/search.spec.ts:39-51` rewritten for two Escapes with its rail-item tail kept; `06-search-and-navigation.md:90` rewritten. Without approval none of this changes.
- [ ] `pure-logic.test.ts` green (`utils/roving-list.ts` imports nothing).
- Gate: `pnpm check` + `pnpm vitest run`.

### F. Rail note list: one Tab stop, arrow keys, focus that follows removals (P24, note list half) (L)

**What to build:** in `RailNoteList.svelte`, a current-row key and one keydown handler on the list that uses E's resolver for focus keys only (Enter, Space and F2 keep their row behaviour). Roving order and key: the note items of the shown list, keyed by `item.key` in the grouped list and `note.path` in the flat one (finding 5). Headers, empties and Today section components stay in normal Tab order. The tab-stop row gets `tabindex=0`, every other row `-1`; `keepMounted` holds the current row's index in that VList's `data`, and a move to an unmounted row calls `scrollToIndex` and focuses after mount. Removal: `nextCurrentRow` and `tabStopRow` pick the neighbour, and focus follows only when it was on the removed row or inside the list wrapper (finding 13), never from the search input. `RailListSearch.svelte` gets `onArrowDown`; ArrowUp on the first row returns to the open search input. Rename: commit re-points the current row to the new path, and Enter or Escape in the rename input returns focus to the row. A's check gets `tabindex=0` on the tab-stop row only. No Cmd+Enter, no hint bar, no `listbox` role.

**Files:** `src/lib/features/rail-shell/RailNoteList.svelte`, `src/lib/features/rail-shell/RailListSearch.svelte`, `src/lib/features/note-list/NoteRow.svelte`, `src/lib/features/note-list/NoteRowMenu.svelte`, `src/lib/features/note-list/note-row-menu.context.ts`, `help/documentation/02-file-explorer.md`.

**Blocked by:** E, A. Cross-cluster: nl-header-creation and nl-empty-states (`RailNoteList.svelte`), nl-rows-sections P120 (Today section focus), P35 (Cmd+Enter).

Acceptance criteria:
- [ ] Failing test first, new `src/tests/lib/features/rail-shell/RailNoteList.keyboard.test.ts` (real stores, virtua shim): with 12 notes exactly one `[data-note-row]` has `tabindex="0"`; ArrowDown and ArrowUp move focus and the tab stop; Home and End go to the ends. If jsdom cannot mount an unmounted row after `scrollToIndex`, the 40-note End case moves to E2E, said in the commit.
- [ ] Failing test first: in the neighbourhood lens, with one note listed under both Outgoing links and Backlinks, exactly one row has `tabindex="0"` and ArrowDown walks each item once in display order; group headers are skipped; in Today, section components are not in the roving order.
- [ ] Failing test first: arrows typed in the rename input move the caret, not row focus; committing a rename leaves focus on the renamed row (new path); Escape in the input returns focus to the row; Enter on a focused row opens the note once.
- [ ] Failing test first: with the search bar open, ArrowDown in its input focuses the first row; ArrowUp on the first row returns to the input; `RailListSearch.test.ts:141-146` unchanged.
- [ ] Failing test first: when the focused row leaves (the test feeds an entries snapshot without it), focus moves to the next row; when focus is in the search input, it stays there.
- [ ] On the Inbox lens only the tab-stop row's check has `tabindex="0"`.
- [ ] E2E: Tab into the list lands on one row, arrows move, Tab leaves the list; `focus-ring.spec.ts:121-125` and `rail-shell.spec.ts` stay green.
- Gate: `pnpm check` + `pnpm vitest run`.

## Open-itens Issues replaced

None. I checked every open Issue that names these files or keys:
- `023` (File History Restore writes into the active tab; ready-for-agent, P1): not replaced. B and C open History only after activating the note, so they add no exposure (finding 1). It stays the owner of the write-path guard. Since `.scratch/open-itens` is abandoned, the owner should know it is still open and that 101 depends on it.
- `012` (the `.view` tab strip in `CollectionView.svelte`): another surface; C may copy its per-tab menu pattern.
- `132` (Edit view item in `NoteRowMenu.svelte`'s top group), `028`/`029` (Duplicate in the same file): different actions in the same file. Sequence with B, do not replace.
- `153` (tab strip overflow): belongs to sh-tabs. Same file as C, sequence.
- `096` (root unarchive path; opt-in Auto Move): a row Archive or Restore reaches the same code as the bar's. No change in exposure.
- `140`, `156` (keyboard on other surfaces): excluded.
- `.scratch/tasks-view-ux` 113, 241, 255 (resolved): E must keep `tasks-keys.logic.ts` behaviour and its tests unchanged.

## Dropped

- **D, "Move to..." with a folder picker (P39 part):** no picker exists, the prototype only toasts a stub, and the shared list works without it. Build only on the owner's request, as its own ticket after B and C.
- **Cmd+Enter in the lists (P24 part):** it would do what Enter does. P35 holds the replace-vs-new-tab decision.
- **Key-hint bar and `listbox`/`option` roles (prototype `#p24`):** extra chrome, and the rows are buttons with menus. Roving tabindex alone gives the one Tab stop.
- **Files and Types trees, collection rows (P24 "second" step):** a later wave reusing `utils/roving-list.ts`.

## Owner questions

1. **Inline check scope (A):** Inbox lens only, or every italic (unorganized) row in any lens? Recommended: Inbox only. No success toast, no shortcut in its tooltip. Recommended: yes to both.
2. **SearchPanel Escape (E):** first Escape clears a non-empty query, the second leaves the input. This rewrites `e2e/specs/search.spec.ts:39-51` and the help sentence at `06-search-and-navigation.md:90`, which today promises the opposite. Recommended: yes, it matches the rail list search.
3. **Palette labels (B):** stable "Toggle Archived" and "Move Note to Trash" beside the existing toggles, with state-aware labels only in menus? Recommended: yes. A state-aware palette label would rebuild the command list on every editor keystroke (`AppOverlays.svelte:19`).
4. **Trash as its own group (B, C):** the prototype separates Move to Trash. That breaks the pinned "no group holds a single item" rule (`NoteRowMenu.test.ts:314`). Recommended: no separator, Trash last and red, rule kept.
5. **One Trash prompt (B):** file name everywhere (`Move "alpha.md" to trash?`, as the bar, the toast and TypesNavigator already use), or the note title? Recommended: file name.
6. **History on a non-active note (B, C):** History activates the note and then opens the dialog. Recommended: yes, it keeps Restore safe until 023 lands.
7. **Trash and History on non-markdown tabs (C):** canvas and kanban tabs are files, and the row menu offers them Move to Trash. Should their tab menu offer Trash too? Recommended: no, markdown tabs only in this ticket, as the scout proposed.

## Not checked

- I ran no tests, builds or app. Two things are unverified: that a snippet from `EditorView.svelte` rendering `ContextMenu.Item` inside `EditorTabs`' `ContextMenu.Content` resolves the bits-ui context, and that jsdom with the virtua shim mounts a row after `scrollToIndex`.
- I did not read `keyboard-shortcuts.spec.ts`, and I did not re-verify the Kanban focus model.
