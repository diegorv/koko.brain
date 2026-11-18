# Scout: History and breadcrumb cluster (P35, P102)

Checked against HEAD `ab143a411` (main). Haiku raw evidence in `research/raw/P35.md` and `research/raw/P102.md` was re-read and every load-bearing claim re-checked in the code below; two corrections are marked (CORRECTION). Prototype: `prototypes/shell-tabs-navigation.html` (section `#P35` at line 395, `#P102` at lines 451-466, shared mock `noteWindow()` at lines 1037-1213). Screenshot: `screens/note-action-bar-light.png` (MANIFEST.md:24).

Theme: a per-tab Back/Forward history (P35) and a breadcrumb that leads back to where the note lives (P102). Both live in the same surface (the note action bar left side and the editor tab model) but share almost no code beyond `NoteActionBar.svelte`.

## Code map (what runs today)

Tab model. A tab IS its path: `findTabIndex(tabs, path)` (`editor.logic.ts:40`) is the only identity lookup, `openFileInEditor` focuses an existing tab instead of adding one (`editor.service.ts:164-170`, race re-check `:178-182`), and per-tab state is keyed by path in module maps (`tab-view-state.ts:16,25` scroll/cursor and CodeMirror state; `pendingEditFlushers` `editor.service.ts:52`; save and autosave by path). Tabs are not restored across restarts (grep for tab persistence found none), so a history needs no persistence.

| File | Role |
|---|---|
| `src/lib/core/editor/editor.service.ts` | `openFileInEditor` (:148-198, append or focus, no mode argument), `switchTab` (:340), `closeTab` (:362-393, flush edits, save, ask on failure, `removeTab`, `deleteTabViewState`, `notifyTabClosed`), `switchToNext/PreviousTab` (:404,:411), `closeTabsForDeletedPath` (:463-476), tab-close listener registry (:15-45) |
| `src/lib/core/editor/editor.store.svelte.ts` | `tabs`, `activeIndex`, `addTab` (:52-60), `setActiveIndex` (:64), `removeTab` (:72), `updateTabPath` (:121, rename in place), `togglePin`. No history, back or forward state anywhere. |
| `src/lib/core/editor/editor.types.ts` | `EditorTab` (path, name, content, savedContent, fileType, pinned) |
| `src/lib/core/editor/editor.logic.ts` | pure helpers (`findTabIndex`, `isVirtualTab`, `isMarkdownNoteTab`, `isTabPinned`); natural home for pure history logic |
| `src/lib/core/markdown-editor/MarkdownEditor.svelte` | active-path `$effect` (:459-480): a path change that is not a recorded rename is a tab switch; it saves scroll/cursor/editor state of the leaving path only if that path is still a tab, else `deleteTabViewState` |
| `src/lib/core/markdown-editor/tab-view-state.ts` | per-path scroll/cursor and `EditorState` maps, `renameTabViewState` |
| `src/lib/core/filesystem/link-updater.service.ts` | `updateTabAfterRenameOrMove` (:~85-107) re-paths tabs and their view state on rename or move |
| `src/lib/app/EditorView.svelte` | mounts `EditorTabs`, mounts `NoteActionBar` only when `isMarkdownNoteTab` (:45,:69); canvas and collection views are `{#key path}` instances |
| `src/lib/core/markdown-editor/EditorTabs.svelte` | tab strip: `onclick={() => switchTab(index)}`, close button, Pin/Close context menu. No middle-click, no mouse-button handlers. |
| `src/lib/features/note-list/NoteRow.svelte` | row `<button>`; `onclick={() => openFileInEditor(note.path)}` (:71), no modifier or `auxclick` handling |
| `src/lib/features/note-list/NoteRowMenu.svelte` | context menu; first item labelled "Open in new tab" calls the same `openFileInEditor(target.path)` (:224-227) |
| `src/lib/app/editor-host.ts` | `openLink(path, anchor)` -> `openFileInEditor(path)` then `scrollToAnchor` (:143-146); reached from `followWikilink` (`wikilink-navigation.ts:17-20`) and `openNoteAt` (`open-note-at.service.ts:35-39`) |
| `src/lib/app/global-keybindings.ts` | declarative `GLOBAL_KEYBINDINGS`; `editor:previous/next-tab` = Cmd+Shift+[ / ] (:86-98); no alt bindings. `registerKeybinding` (`utils/keybindings.ts:60-79`) supports `alt`. |
| `src/lib/utils/keybindings.ts` | `formatShortcut` (:38-52): `CODE_DISPLAY_MAP` has no arrows, `key` is upper-cased, so `ArrowLeft` would print `ARROWLEFT` |
| `src/lib/app/commands.ts` | palette: Editor group (:120-150) has Next/Previous Tab; Navigation group (9 entries) has Quick Switcher, Search, Toggle Graph/Tasks/Calendar/Tags; no Back, Forward or Reveal |
| `src/lib/features/note-action-bar/NoteActionBar.svelte` | breadcrumb = two `<span>`s `typeLabel › fileName` (:128-132, no handler, no role); Favorite, Organized, Neighbourhood, Raw, foldables, More menu (:186-221); "Reveal in Finder" is a foldable (:99-103) |
| `src/lib/features/note-action-bar/note-action-bar.logic.ts` | `getActionBarState` (:27-40): `typeName` (null when no `_type`), `typeLabel` (`typeName ?? 'Note'`), `fileName: basename(path)` (extension kept); `FOLDABLE_ACTIONS`/`FOLD_ORDER`/`BAR_RESERVED_WIDTH` |
| `src/lib/features/note-action-bar/note-action-bar.service.ts` | `revealNote` = `revealItemInDir` (Finder, :23-30) |
| `src/lib/features/rail-shell/neighbourhood.service.ts` | `openNeighbourhood`: sets a store and `updateLayout({ railItem, railPanelsVisible: true })`; the only existing bar action that changes the note list |
| `src/lib/app/rail-navigation.ts` | `selectRailItem`, `openRailView` (:32-38, sets `railItem: types`, `railTypesLens`, `railPanelsVisible`): the pattern for opening a lens from outside the rail |
| `src/lib/features/rail-shell/lens.logic.ts` | `TYPES_LENS`/`UNTYPED_LENS`/`FOLDER_LENS_KIND`, `parseTypesPick` (:523), `pickedTypesLens` (:536), `pickedFolderLens` (:1011), `typeNavigatorRows` (:492; a type with `_visible: false` has no row, Untyped row only when `showUntypedNotes`), `staleFolderPickFix` (:1029), `toggleExpandedFolder` (:1050) |
| `src/lib/app/AppShell.svelte` | `railLens` (:146-152): Types item shows `railTypesLens` pick, Files item shows `railFolder` pick; navigator `onPick` handlers (:220-231) |
| `src/lib/features/rail-shell/FilesNavigator.svelte` | highlights `picked.target`; takes `expanded` from `layout.railExpandedFolders`; does NOT auto-expand ancestors of the pick (:431-432) |
| `src/lib/features/rail-shell/RailNoteList.svelte` | flat list `<VList data={notes}>` (:881) and grouped list (:816), both unbound; `activePath = editorStore.activeTabPath` (:564) only styles the active row (`isActive`, :897); `listIdentity` change closes search and resets the archive filter (:498-512); Files lens lists a folder's direct children, archived included (`offersArchivedFilter` false for folders, :138) |

Readers of the editor tab state that a history change touches: `+layout.svelte` backlinks/outgoing effects keyed on `activeTabPath`, `NoteRow.isActive`, `EditorTabs` (name and active styling), Properties panel, TOC.

Verified facts that correct or sharpen the raw notes:
- CORRECTION 1: the Mod-[ / Mod-] indent bindings are CodeMirror `defaultKeymap` (`node_modules/@codemirror/commands/dist/index.js:1809-1810`), spread at `editor-extensions.ts:159`; `indentWithTab` is only Tab. Cmd+Opt+Left/Right is free in CodeMirror (mac `Alt-ArrowLeft` is `cursorGroupLeft`, and `Mod-Alt-` is bound only for ArrowUp/Down and `\`, lines 1803-1811), in `GLOBAL_KEYBINDINGS`, and in the native menu (`lib.rs` accelerators: only `CmdOrCtrl+,` and `CmdOrCtrl+Q`).
- CORRECTION 2: the breadcrumb is `Type › file.md` only. It has no folder segments at all (the raw notes and the review's "Project > file.md" are the type, here "Project"). The P102 proposal's folder segments are new rendering, not a link-ification of existing segments.
- `virtua@0.54.2` `VList` exports `scrollToIndex(index, opts?)` through `bind:this` (`node_modules/virtua/lib/svelte/VList.svelte:48-51`), so the raw note's "unconfirmed" is resolved.
- The shared E2E helper `openFile` (`e2e/fixtures/helpers.ts:82-90`) opens a file by clicking its note-list row; 29 spec files call it 82 times, many then count `[role="tab"]`. Any plain-click policy change moves all of them (see P35).
- Tests that `vi.mock('#lib/core/editor/editor.service.js', ...)` with a closed factory: 67 files, including `global-keybindings.test.ts:13` and `commands.test.ts:8`. A new export that those modules import breaks the mocks (vitest throws on a missing mock export). Put history navigation in a NEW module so only the importers' mocks change.

## P35. No navigation history; "Open in new tab" equals a plain click

**Still real: yes** (Problem and Evidence hold at HEAD, apart from correction 1).

Current behaviour:
- `openFileInEditor` (`editor.service.ts:148-198`) either focuses the existing tab for that path (:164-170) or `addTab`s a new one (:188-191). No options, no history. About 37 files call it.
- `NoteRow.svelte:71` plain click and `NoteRowMenu.svelte:224-227` "Open in new tab" call it identically. A plain click on a note that is not open already adds a tab, so "Open in new tab" is already truthful in that case; for a note that IS open the two both focus.
- Mouse buttons 4 and 5: no handler (`e.button` checks in `src/lib` are only `!== 0`). `auxclick` (middle click) is not handled on rows or tabs.
- Wikilink follow: plain click on a rendered wikilink (`wikilink-click-target.ts:58-75`, button 0) -> `followWikilink` -> `host.openLink` (`app/editor-host.ts:143`) -> `openFileInEditor`. The e2e `wikilink-navigation.spec.ts:16-27` asserts the tab count goes to baseline + 1.

What the prototype wants: Back and Forward in the action bar, a history per tab (Tab 1 and Tab 2 each keep their own chip list), a mode switch "Plain click replaces the tab (proposed)" vs "adds a tab (today)", Cmd+click and right-click item open a new tab. The prototype renders no real Back/Forward buttons in the P35 section's own copy (it describes them in the "After" label) but the mock's `hist()` drives them; icons and placement are open. The keys line says Cmd+Opt+Left/Right or mouse 4/5, and Cmd+[ stays indent.

Design points a ticket must settle:
1. History only exists under Replace. With the tab identity being its path and one tab per path, "make Open in new tab really open a second tab" is not possible without duplicate-path tabs (path-keyed saves, flushers, view state, `findTabIndex`); it already adds a tab for an unopened note. So P35 splits on the owner decision: if Replace is rejected the whole proposal collapses to renaming the menu item to "Open" (S) and dropping Back/Forward (or a different meaning: Back = previously active tab, which is MRU switching, not the proposal).
2. Where replace applies: active tab must be an unpinned, non-virtual markdown note tab; pinned tab, virtual tab (Tasks, Graph, Tags, Calendar) or no tab -> new tab as today. Target already open in another tab -> focus that tab (no history push).
3. Replace is not `updateTabPath`: it swaps path, name, content, savedContent and fileType in place. It must run what `closeTab` runs for the leaving note: `flushPendingEdits(path)`, `saveFileByPath` if dirty (`editor.service.ts:371-382`), `notifyTabClosed(leaving)` (queryjs invalidation), and decide on failure. Recommended: if flush or save fails, open the target in a NEW tab (never lose edits, never prompt on navigation).
4. History shape: `back: string[]` and `forward: string[]` on the tab (dies with the tab), capped (recommend 50, cap is not a question). A normal navigation pushes the leaving path and clears forward. Back and Forward move the active tab to a neighbour path and load it with `readTextFile` (async; one `openFileInEditor`-style race guard). Entries are paths, so `fileType` is derived per target (`isViewFile`/`isCanvasFile`/`isKanbanFile`).
5. Path lifecycle: a rename or move must rewrite entries in every tab's history (`updateTabAfterRenameOrMove` only re-paths tabs whose OWN path matches, `link-updater.service.ts:~92-107`), and a delete must drop entries (`closeTabsForDeletedPath` iterates tabs only, `editor.service.ts:463`). Back must skip entries whose file is gone (readTextFile failure -> drop the entry, toast once, keep going).
6. View state: today the editor effect deletes the leaving path's scroll/cursor when it is no longer a tab (`MarkdownEditor.svelte:476-478`), so Back would land at the top. Recommended: keep scroll and cursor for paths still in any tab's history (change the condition at :476), and make `closeTab` and history truncation delete view state for dropped entries (avoid a leak; `tabEditorStates` holds a full `EditorState` per path, so cap or skip saving editor state for history-only paths).
7. Back and Forward from a non-markdown tab (canvas, kanban, collection): the bar is mounted only for markdown notes (`EditorView.svelte:68-70`). Keys, mouse buttons and palette work on any file tab; the bar buttons exist only on notes. P18 (sh-view-headers-entry) plans a slim header for those tabs and could host buttons later.
8. Input: `registerKeybinding` supports `alt`, so Cmd+Opt+Left/Right is two `GLOBAL_KEYBINDINGS` entries with `command` ids and palette entries (Editor or Navigation group). `formatShortcut` must learn arrow glyphs or the palette shows `ARROWLEFT` (test in `keybindings.test.ts`). Mouse buttons 3 and 4: a document `mouseup` (or `auxclick`) listener; whether Tauri's macOS WKWebView delivers them to JS (and does not also run its own back navigation) is UNVERIFIED here: it needs a manual check in the real app.
9. Open policy surface (see owner questions): `openFileInEditor` stays add-or-focus for all 37 callers; new code is `navigateInActiveTab(path)` in a new `core/editor/tab-history.service.ts`, adopted by NoteRow, wikilink follow (`editor-host.openLink`), and the Backlinks/Outgoing link rows. Cmd+click (`metaKey`), middle click (`auxclick`) and the menu item use `openFileInEditor`, i.e. a new tab. `openNoteAt` (`open-note-at.service.ts:35-39`) calls `openFileInEditor` when the path is not the active tab: it follows links from search/tasks, decide in the ticket (recommended: unchanged).
10. E2E blast radius: `openFile` clicks a row, so under Replace every multi-`openFile` spec (tabs, tab-pinning, wikilink-navigation, editor, properties-cross-note, ...) would see one tab. Change `openFile` to Cmd+click (new tab) in the same ticket, so only the specs that assert replace semantics change. `wikilink-navigation.spec.ts:16-27` (expects baseline + 1) must be rewritten for Replace, not deleted.

Test files and seams:
- New `src/tests/lib/core/editor/editor.logic.test.ts` additions (or `tab-history.logic.test.ts`) for pure push, back, forward, cap, truncation, rename and delete rewriting. No mocks.
- `src/tests/lib/core/editor/editor.store.test.ts` (real store) for history getters on the tab.
- `src/tests/lib/core/editor/tab-history.service.test.ts` modelled on `editor.service.test.ts:1-70`: mock only `@tauri-apps/plugin-fs` (`readTextFile`, `writeTextFile`), `@tauri-apps/plugin-dialog`, `svelte-sonner`; real `editorStore`; assert tab path, name, content, `back`/`forward` and that a failed save opens a new tab.
- `src/tests/lib/app/global-keybindings.test.ts` (its `editor.service` mock is closed at :13, so a new import from a NEW module needs its own mock entry there) and `commands.test.ts` (same, :8).
- `NoteRowMenu.test.ts` (:77, :314, :325, :359-361 assert "Open in new tab" calls `openFileInEditor`); `RailNoteList.test.ts` mocks editor.service as `{ openFileInEditor: vi.fn() }` (:49): a row click now calls the new service, so the mock set changes.
- `NoteActionBar.test.ts` (real stores and services, Tauri boundaries mocked) for the Back/Forward buttons' disabled state.
- `MarkdownEditor` view-state retention: `src/tests/lib/core/markdown-editor/` (a real `tab-view-state` assertion through the effect).
- E2E: `wikilink-navigation.spec.ts`, `tabs.spec.ts`, helper `openFile`; add a history spec (click a link, Cmd+Opt+Left returns, tab count stays 1) run via `bash scripts/e2e.sh`.

## P102. Nothing in the open note leads back to where it lives

**Still real: yes.**

Current behaviour:
- Breadcrumb = `typeLabel › fileName`, plain spans (`NoteActionBar.svelte:128-132`), `fileName = basename(path)` with `.md` (`note-action-bar.logic.ts:35`). Tests assert it: `NoteActionBar.test.ts:168-176` (`Launch plan.md`, `Note`), `note-action-bar.logic.test.ts:22`, `e2e/specs/note-action-bar.spec.ts:30-41` (`Welcome.md`).
- No "Reveal in note list" anywhere in `src/lib`. "Reveal in Finder" is a foldable action (`:99-103`) and a row-menu item (`NoteRowMenu.svelte:266-269`). The palette has no reveal command.
- The note list marks the open note's row (`isActive`, `RailNoteList.svelte:897`) but nothing scrolls to it, there is no `bind:this` on either `VList`, and no highlight/flash style exists in rail-shell.
- Lens plumbing exists: Types pick = `layout.railTypesLens` `{kind:'type', target: typeName}`, Files pick = `layout.railFolder` (absolute folder path, none = vault root), both shown only when `railItem` is `types` or `files` and `railPanelsVisible` (`AppShell.svelte:146-152`).

What the prototype wants: clickable type segment (tooltip "Show all <Type> notes", opens the Types lens), one clickable segment per folder segment (accumulated path, opens the Files lens at that folder), the name as plain text without `.md`. "Reveal in note list" is the first item of the More menu (green "new" badge) and a palette entry (category Navigation); it always switches to the Files lens at the note's folder, scrolls the row to the middle, and flashes it; toast "Files lens at <folder>/, row highlighted". A vault-root note shows only the type crumb and the name. The mock never models a note without `_type`, an archived note, an active search or a hidden folder.

Design points a ticket must settle:
1. A single "open lens for this note" service (new `rail-shell` or `app/rail-navigation.ts` function): `openTypeLens(typeName)` (`updateLayout({ railItem: TYPES_RAIL_ITEM, railTypesLens: {kind:'type', target}, railPanelsVisible: true })`) and `openFolderLens(folderPath)` (`railItem: FILES_RAIL_ITEM, railFolder: folder, railExpandedFolders` extended with every ancestor so the navigator shows the pick; `FilesNavigator` does not auto-expand, `:431-432`). Pure part (ancestor list, folder segments from a vault-relative path via `relativePath`, `utils/path.ts:98`) belongs in a `.logic.ts`.
2. Type crumb target: clickable only when a `typeNavigatorRows` row exists for `typeName` (a `_visible: false` type has none, so a click would set a pick that `staleTypesPickFix` clears on next open). Untyped note: today shows "Note" (`logic.ts:33`); recommended: clickable only when `settingsStore.showUntypedNotes` (default false, `settings.store.svelte.ts:159`), opening `UNTYPED_LENS`; else plain text.
3. The Types lens hides archived notes by default (`archivedFilter = 'active'`, `RailNoteList.svelte:140`), so a type-crumb click from an archived note shows a list without it. Accept for crumbs (it is "all notes of this type"); Reveal uses the Files lens, which lists archived notes.
4. Reveal flow: a small store (`{ path, nonce }`) set by the service, consumed by `RailNoteList` in an `$effect` with `untrack` (CLAUDE.md pattern) that waits until `notes` contains the path (lens resolution is not synchronous in every case), calls `vlist.scrollToIndex(i, { align: 'center' })` on a bound `VList`, sets a highlight flag on that row for about 1.5 s, then clears the request. Cases to define: note not in the resolved list (hidden by name, i.e. `isHiddenName`, or in a hidden/system folder) -> toast "Not shown in the note list" and no lens change; same lens already picked (so `listIdentity` does not change and an open search or filter persists) -> reveal must clear the search query and filters itself; grouped lens never applies (Files is flat), so only the flat `VList` needs the ref.
5. Highlight needs a prop on `NoteRow.svelte` (a `data-note-row-flash` attribute plus a CSS class); `NoteRow` is also edited by nl-rows-sections (P117, P119, P120) and P24 (see overlaps).
6. More-menu entry: adding a `reveal-in-list` value to `FoldableAction` changes `foldActions` and its tests (`note-action-bar.logic.test.ts:67-102`); recommended: a plain menu item in More (not foldable), above Copy deeplink, so fold order is untouched. The bar's Neighbourhood button already covers "show in list" for the graph neighbours; the review dropped it from P102.
7. Dropping `.md`: change `fileName` in `getActionBarState` to the stem for markdown (`stem` exists in `utils/path.ts:79`), keep it for other extensions; the bar mounts only for `.md` notes, so it always drops. Update the three tests above. This is the breadcrumb half of open-itens 153.
8. Keyboard/a11y: crumbs are `<button>`s with `title` and accessible names ("Show all Project notes", "Show Areas/Health in Files"); the file name stays a plain span. The bar is `pane-toolbar` (height band guarded by `pane-toolbar.test.ts`): do not add height, padding or gap utilities to that row, only inside the breadcrumb `div`.
9. Narrow bars: the breadcrumb `div` is `min-w-0 flex-1` with only the file name `truncate`; with folder segments added, long paths must truncate the middle (folders first) so the actions stay visible. Define the rule (suggest: folder crumbs collapse into the first and last segment plus an ellipsis when over a width), and test it with the logic, not pixel layout (jsdom has no layout; the bar test shims `clientWidth`).

Test files and seams:
- `src/tests/lib/features/note-action-bar/note-action-bar.logic.test.ts` (new: folder segments, stem, type clickability) and `NoteActionBar.test.ts` (real stores and services; click a crumb and assert `settingsStore.layout.railItem`/`railTypesLens`/`railFolder`/`railExpandedFolders`, not a spy).
- New `lens-open.service.test.ts` (or `rail-navigation.test.ts` additions) with real `settingsStore`; no mocks needed beyond the usual Tauri set.
- `RailNoteList.test.ts` (already has the ResizeObserver and `offsetParent` shims for virtua, :8-30): reveal request scrolls and flashes the row; assert the DOM flag and that `scrollToIndex` ran by checking the row is mounted, not by mocking virtua.
- `commands.test.ts` (palette entry, its editor.service mock is closed) and `e2e/specs/note-action-bar.spec.ts` (`moreAction` helper :24-27), `e2e/specs/rail-shell.spec.ts` (Neighbourhood test at :1014 shows the helpers `listRow`, `folderButton`).

## Candidate tickets

Grouping rationale: P35 is two independent risk areas (the tab/history engine with the replace policy; the input and UI surfaces for it). P102 is two (crumbs plus lens opening; reveal with list scroll/highlight). Crumbs and surfaces share only `NoteActionBar.svelte`. If the owner rejects Replace, candidates 1 and 2 collapse to one S ticket (see end of this section).

### Candidate 1: Per-tab navigation history and in-tab opening for note rows and links (P35)
Size: L. Blocked by: owner questions 1 and 2.
Files: `core/editor/editor.types.ts`, `editor.logic.ts`, `editor.store.svelte.ts`, new `core/editor/tab-history.service.ts` (+ logic), `core/editor/editor.service.ts` (`closeTab` view-state cleanup, `closeTabsForDeletedPath`), `core/filesystem/link-updater.service.ts`, `core/markdown-editor/MarkdownEditor.svelte` (:476 condition), `features/note-list/NoteRow.svelte` (:71), `NoteRowMenu.svelte` (:224-227), `app/editor-host.ts` (`openLink`), `features/backlinks/LinkItem.svelte`, `features/outgoing-links/OutgoingLinksPanel.svelte`, `e2e/fixtures/helpers.ts`, `e2e/specs/wikilink-navigation.spec.ts`.
Shared files: `NoteRow.svelte` with nl-rows-sections (P117, P119, P120) and nl-actions-keyboard P24 (Cmd+Enter new tab on rows is the same click handler: the P24 ticket must reuse this ticket's `newTab` path); `NoteRowMenu.svelte` with P39 (one note-actions list, same labels); `editor.service.ts` is also touched by the open-itens 148 usage hook callers, no code collision. `EditorTabs.svelte` is NOT touched here (sh-tabs P34/P98 free).
Acceptance criteria:
- Failing test first (real `editorStore`, mocked `plugin-fs`): with an unpinned markdown tab A active, `navigateInActiveTab(B)` leaves one tab whose path is B, name B, content from disk, and history `back = [A]`, `forward = []`; fails today (no such function).
- Failing test first: `goBack()` restores A with `forward = [B]`, `goForward()` returns to B; calling `goBack()` with empty history changes nothing; a new navigation after `goBack()` clears `forward`; history is capped.
- Failing test first: a pinned tab, a virtual tab, or a failed save of the leaving note (`writeTextFile` rejects) opens the target in a NEW tab and leaves the old tab and its edits intact; a target already open in another tab is focused with no history entry.
- Failing test first: renaming A (via `updateTabAfterRenameOrMove` path) rewrites A inside every tab's history; deleting A (`closeTabsForDeletedPath`) removes it; `goBack()` onto a vanished file drops the entry and toasts once.
- Failing test first: after Back the editor restores the leaving note's cursor and scroll (`getTabViewState`), and closing the tab deletes view state for its history entries (no leaked map entries).
- A plain click on a `NoteRow` and a wikilink click navigate in the active tab; Cmd+click, middle click and the renamed-or-kept "Open in new tab" menu item add a tab; the e2e `openFile` helper uses Cmd+click so existing specs keep their tab counts, and `wikilink-navigation.spec.ts` asserts Replace.
- Frontend gate: `pnpm check` and `pnpm vitest run`; e2e via `bash scripts/e2e.sh` for the touched specs.

### Candidate 2: Back and Forward controls: keys, mouse buttons, palette, action bar (P35)
Size: M. Blocked by: candidate 1.
Files: `app/global-keybindings.ts`, `utils/keybindings.ts` (`formatShortcut` arrow glyphs), `app/commands.ts`, a document-level mouse-button listener (`app/` registration beside `registerGlobalKeybindings`), `features/note-action-bar/NoteActionBar.svelte`.
Shared files: `global-keybindings.ts` and `commands.ts` with sh-view-headers-entry P37 (rail shortcuts, "New note here" command) and sh-menus-settings P103-P105 (new commands); mechanical merge, no key overlap (P37 candidates are Ctrl+1..9 or Cmd+Opt+1..9, not arrows). `NoteActionBar.svelte` with candidates 3 and 4 and P39. `NoteActionBar.test.ts` is one file all three extend.
Acceptance criteria:
- Failing test first: `formatShortcut({ meta: true, alt: true, code: 'ArrowLeft' })` returns a glyph form, not `ARROWLEFT`.
- Failing test first: `shortcutFor('editor:go-back')` and `'editor:go-forward'` resolve (the command list throws on a missing binding) and a keydown of Cmd+Opt+ArrowLeft/Right calls the history service; Cmd+[ is untouched (still CodeMirror indent).
- Failing test first (real stores): palette commands "Go Back" and "Go Forward" appear with the shortcut label and move the active tab's history; they do nothing when there is no history.
- Failing test first: `NoteActionBar` shows Back and Forward buttons whose `disabled` state follows the active tab's history, with `title` and `aria-label` including the shortcut, and clicking Back restores the previous note.
- Mouse buttons 3 and 4 trigger Back and Forward in the real app: manual verification noted in the ticket (WKWebView delivery unverified), with a unit test for the listener's button mapping.
- Frontend gate: `pnpm check` and `pnpm vitest run`.

### Candidate 3: Clickable breadcrumb with folder segments and no ".md" (P102)
Size: M. Blocked by: none.
Files: `features/note-action-bar/NoteActionBar.svelte` (:128-132), `note-action-bar.logic.ts`, a new lens-opening service (`app/rail-navigation.ts` or `features/rail-shell/`), `features/rail-shell/lens.logic.ts` (ancestor and segment helpers), `src/tests` for each, `e2e/specs/note-action-bar.spec.ts` (:35-36).
Shared files: `NoteActionBar.svelte` and its tests with candidates 2 and 4; `rail-navigation.ts` with sh-view-headers-entry P37; `settings.types` untouched. Replaces open-itens 153's breadcrumb half; the tab-label `.md` half stays with the sh-tabs ticket (P34 does not list it).
Acceptance criteria:
- Failing test first (`note-action-bar.logic.test.ts`): `getActionBarState('/v/Areas/Health/Sleep.md', ...)` returns `fileName` "Sleep" and folder segments `Areas`, `Health` with accumulated vault-relative paths; a vault-root note has none.
- Failing test first (`NoteActionBar.test.ts`, real stores): clicking the type crumb sets `railItem` types, `railTypesLens {kind:'type', target}` and `railPanelsVisible`; clicking a folder crumb sets `railItem` files, `railFolder` to the absolute folder and adds every ancestor to `railExpandedFolders`.
- Failing test first: a type with no navigator row (`_visible: false`) and an untyped note with `showUntypedNotes` off render a non-clickable segment; with it on, "Note" opens `UNTYPED_LENS`.
- Crumbs are buttons with accessible names and `title`; long folder paths truncate without pushing the action buttons out (logic-level test of the collapse rule).
- `Welcome.md` expectations in `note-action-bar.spec.ts` and the unit tests change to `Welcome`; other extensions would keep theirs.
- Frontend gate: `pnpm check` and `pnpm vitest run`; the spec via `bash scripts/e2e.sh`.

### Candidate 4: "Reveal in note list" (P102)
Size: M. Blocked by: candidate 3 (lens-opening service and ancestor-expansion helper); shares `NoteActionBar.svelte` with 2 and 3.
Files: new reveal store and service in `features/rail-shell/`, `RailNoteList.svelte` (`bind:this` on the flat `VList`, effect), `features/note-list/NoteRow.svelte` (flash flag and class), `NoteActionBar.svelte` (More item), `app/commands.ts` (palette entry), tests.
Shared files: `NoteRow.svelte` with candidate 1, P24 and nl-rows-sections; `RailNoteList.svelte` with nl-header-creation (P33, P38 header, a different region), nl-empty-states P29 (empty branches), P84 (filter badges), nl-rows-sections; `commands.ts` with candidate 2, P36, P37, P103-P105; More menu with P39.
Acceptance criteria:
- Failing test first (`RailNoteList.test.ts`, virtua shims already present): with a Files lens of 100 notes and the target row off-screen, a reveal request mounts the target row and marks it flashing; the mark clears.
- Failing test first (real stores): the service sets `railItem` files, `railFolder` to the note's folder (null at the vault root), `railPanelsVisible` true and the ancestors expanded; it works while panels were hidden.
- Failing test first: an open list search or property filter is cleared by a reveal on the already-picked folder (the case where `listIdentity` does not change).
- Failing test first: a note the Files lens cannot list (hidden folder) leaves the layout unchanged and toasts.
- "Reveal in note list" appears in the More menu and as a palette command, runs with the active note, and the palette entry is absent or inert with no active note.
- `foldActions` tests are unchanged (the item is not a foldable).
- Frontend gate: `pnpm check` and `pnpm vitest run`; a rail-shell e2e that reveals a note in a nested folder.

If the owner rejects Replace (question 1), replace candidates 1 and 2 with one S ticket: rename the row-menu item and the Cmd+click behaviour only (middle click and Cmd+click are a no-op when every open already adds), with a menu-label test change in `NoteRowMenu.test.ts`. Candidates 3 and 4 are unaffected.

Run order suggestion: 3, then 4 (small and independent of the owner decision); 1 then 2 when the decision lands.

## Overlapping Issues

| Issue | Status | Verdict |
|---|---|---|
| `.scratch/open-itens/issues/153-tab-strip-shows-overflow-hides-md-extension.md` (ledger.md:169 `todo`) | ready-for-agent | REPLACE. Its `.md` hiding "in tab labels and the breadcrumb" is the breadcrumb half of candidate 3. Its edge fade and tab-list menu are P34 (sh-tabs); the tab-label `.md` is not in any P34 text, so the sh-tabs analyst must either take it or the owner accepts it is dropped. The Issue's "no breadcrumb component found" is stale: the breadcrumb is `NoteActionBar.svelte:128-132`. |
| `.scratch/open-itens/issues/014-backlinks-outgoing-links-always-show-open-note.md` (ledger:51 `todo`) | ready-for-agent | DEPEND, not replaced (no proposal overlap, different files). Its trigger is "return to A"; Back makes that trigger a one-keystroke action, so candidate 1 raises its frequency. Worth sequencing 014 first, not required. |
| `.scratch/open-itens/issues/148-usage-count-file-opens-by-type.md` (ledger:164 `todo`, blocked by 146) | ready-for-agent | DEPEND. It instruments file opens; the new navigate path must report like `openFileInEditor` (adopt its hook when 148 lands). No file collision. |
| `.scratch/open-itens/issues/012-tab-menu-right-tab-and-delete-confirm.md` (ledger:49) | ready-for-agent | EXCLUDE from this cluster (tab-strip context menu, sh-tabs territory). |
| `.scratch/open-itens/issues/024`, `025` (meta-bind open action) | ready-for-agent | DEPEND. They edit the same `host.openLink` / `followWikilink` region candidate 1 changes (`editor-host.ts:143-146`). Merge order only. |
| `.scratch/open-itens/issues/132-edit-view-from-anywhere.md` (ledger:148, blocked by 131) | ready-for-agent | EXCLUDE. One more `openFileInEditor` caller, no replace semantics wanted (opens a view in an editor tab). |
| `.scratch/open-itens/issues/207-chrome-icon-buttons-share-sizes-use-shadcn.md` (ledger:223) | ready-for-agent | DEPEND. Changes the bar's icon button sizes/tooltips (`iconButton` const); candidate 2's new buttons should use whatever lands first. Not a replacement. |
| `.scratch/finders-ux/issues/07-quick-switcher-rows-type-icon-folder-highlight.md` | resolved | DEPEND (done). `KIND_ICONS` shared map is available if crumbs want icons; not needed. |
| `.scratch/finders-ux/issues/06-palette-calendar-undo-recent-groups.md` | resolved | DEPEND (done). Palette groups are settled; new commands go into Editor (Back/Forward) and Navigation (Reveal). |
| `.scratch/tasks-view-ux/issues/*` | mixed | EXCLUDE. "breadcrumb" there is a Tasks row field (`112-group-and-sort.md`), name collision only. |
| Review proposals P24, P39 (nl-actions-keyboard), P18, P36, P37 (sh-view-headers-entry), P34, P98 (sh-tabs), P103-P105 (sh-menus-settings) | not yet Issues | COORDINATE as listed per candidate (shared files: `NoteRow.svelte`, `NoteRowMenu.svelte`, `NoteActionBar.svelte`, `commands.ts`, `global-keybindings.ts`, `rail-navigation.ts`). P24's Cmd+Enter "new tab" must call candidate 1's new-tab path, not invent a second one. |

No live Issue proposes per-tab history, Back/Forward, a clickable breadcrumb or "Reveal in note list".

## Owner questions

1. Should a plain click replace the active unpinned markdown tab (P35's own owner decision)? Downside: a tab the owner meant to keep is overwritten (Back undoes it) and every e2e spec opening several files needs the helper change; alternative: keep add-or-focus, rename "Open in new tab" to "Open", drop Back/Forward. Recommended default: Replace, with Cmd+click, middle click, the "Open in new tab" menu item, pinned tabs and virtual tabs always opening a new tab, and a target that is already open focusing its tab.
2. Which surfaces get Replace in the first pass? Recommended default: note-list rows, wikilink follow, and the Backlinks and Outgoing link rows only; quick switcher, search results, canvas nodes, Tasks rows, Calendar, deep links and mods keep add-or-focus (the quick switcher and search follow with P24's Cmd+Enter once the model is proven).
3. Reveal target: always switch to the Files lens at the note's folder (the prototype), or stay in the current lens when the note is already listed there? Recommended default: always Files at the folder (predictable, and the Files lens lists archived notes).
4. Untyped notes: should the "Note" crumb open the Untyped lens when that row is enabled (`showUntypedNotes` is false by default)? Recommended default: yes when enabled, plain text otherwise.

Not questions (code answers them): history is not persisted (tabs are not restored), the cap and truncation rules, the keys (Cmd+Opt+Left/Right are free in CodeMirror, the global bindings and the native menu; Obsidian's own default for Navigate back could not be confirmed from `obsidian.md/help/hotkeys`, so the "Obsidian's default" wording in the review is from memory and is not needed to pick the keys).

## Not checked

Mouse buttons 3 and 4 reaching JS in Tauri's WKWebView (needs the running app). Obsidian's default back/forward keys. Pixel behaviour of the breadcrumb truncation and of the flash highlight (jsdom has no layout). P115/P71 sibling right-sidebar work (the raw note says no overlap with P102; not re-read). No tests, builds or e2e were run.
