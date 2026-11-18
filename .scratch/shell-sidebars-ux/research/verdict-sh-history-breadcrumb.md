# Verdict: History and breadcrumb cluster (P35, P102)

Adversarial check of `scout-sh-history-breadcrumb.md` against HEAD `ab143a411`. Read-only. I opened every source line the scout cites, the two review blocks (`review.md:117-122`, `:406-411`), the prototype sections and mock (`shell-tabs-navigation.html:395`, `:451`, `:1072-1080`, `:1145-1160`, `:1209-1234`), the raw notes, open-itens 014, 024, 025, 094, 146, 148, 153, 154 and their ledger rows, the sibling scouts and verdicts that edit the same files (sh-tabs, nl-actions-keyboard, rs-links-toc, rs-relationships), `docs/agents/live-preview-rules.md`, ADR-0003 and ADR-0033, the layer and feature-cycle tests, `.github/workflows/e2e.yml` and the help pages.

## Proposals: still real?

| ID | Real | Verified at |
|---|---|---|
| P35 | yes | `openFileInEditor` focuses or appends (`editor.service.ts:148-198`, focus `:164-170`, race re-check `:178-182`, `addTab` `:188-191`). `NoteRow.svelte:71` and `NoteRowMenu.svelte:224-227` ("Open in new tab") call it identically. No history, back or forward anywhere in `editor.store.svelte.ts`. No mouse-button-3/4 or `auxclick` handler in `src/lib`. Cmd+[ / Cmd+] are CodeMirror `defaultKeymap` indent (`@codemirror/commands@6.11.1` `dist/index.js:1809-1810`), Cmd+Shift+[ / ] switch tabs (`global-keybindings.ts:86-99`). Cmd+Opt+Left/Right is unbound in CodeMirror (`:1744-1749`, `:1797-1798` bind Alt, Cmd and Ctrl arrows only) and in `GLOBAL_KEYBINDINGS`. |
| P102 | yes | Breadcrumb is two plain spans `typeLabel › fileName` (`NoteActionBar.svelte:128-132`), `fileName: basename(path)` keeps `.md` (`note-action-bar.logic.ts:35`). No folder segment exists today (the review's "Project > file.md" is the type, not a folder). Nothing scrolls the note list: no `bind:this` on either `VList` (`RailNoteList.svelte:816`, `:881`), no `scrollToIndex` call. `virtua@0.54.2` exports `scrollToIndex` from the Svelte component (`node_modules/virtua/lib/svelte/VList.svelte:48-51`). The only reveal is "Reveal in Finder" (`NoteActionBar.svelte:99-103`, `NoteRowMenu.svelte:266-269`). |

The scout's code map is accurate on the lines I opened. Its two marked corrections hold.

## Where the scout is wrong or incomplete

1. **The lens-opening service cannot live in `app/rail-navigation.ts`.** Candidate 3 offers "`app/rail-navigation.ts` or `features/rail-shell/`". `layer-rules.test.ts:166-183` (the `app-inbound` rule) fails when any file under `src/lib` outside `app/` imports `#lib/app/`. `NoteActionBar.svelte` is a feature, so the service goes in `features/rail-shell/` (`note-action-bar -> rail-shell` is already a recorded pair, `feature-cycle-baseline.json:14`). The palette command in `app/commands.ts` may import it from there.
2. **The E2E helper change as written breaks CI.** E2E runs on `ubuntu-24.04` (`.github/workflows/e2e.yml:20`). On Linux the app's open-link modifier is Ctrl (`utils/platform.ts:30-32`, `isOpenLinkModifier`). The new-tab click in `NoteRow` must use `isOpenLinkModifier(e, IS_MAC)`, not `metaKey`, and the `openFile` helper (`e2e/fixtures/helpers.ts:82-90`) must click with Playwright's `modifiers: ['ControlOrMeta']`. A hard-coded Cmd+click would be a plain click on CI, so every multi-`openFile` spec (29 files, 82 calls) would see one tab.
3. **Cmd+click on a wikilink already has a meaning, and the link path has no channel for it.** In the editor, the open-link modifier is how you follow a link whose raw `[[...]]` is revealed on the cursor line (`wikilink-click-target.ts:65-79`, `:70`). `followWikilinkClick` -> `followWikilinkInfo` -> `followWikilink` -> `host.openLink(path, anchor)` (`wikilink-navigation.ts:17-21`, `app/editor-host.ts:143-146`) carries no event or option. "Cmd+click opens a new tab" for links therefore needs an `EditorHost.openLink` option (the core interface at `core/markdown-editor/editor-host.ts:54`, its no-op host at `:92`) and the modifier threaded from three mousedown sites: `MarkdownEditor.svelte:273-289`, the table-cell link `widgets.ts:341-349` and the embed header `widgets.ts:675-681`. The scout's Candidate 1 lists `editor-host.ts` but none of this plumbing. With the plumbing, a revealed link can only be followed into a new tab, which is today's behaviour, so nothing regresses.
4. **Candidate 1 does not fit one agent context.** It spans the core tab model, rename and delete hooks, view-state retention in `MarkdownEditor.svelte`, the live-preview link sites (live-preview rules apply), four feature components and the E2E helper. finders-ux kept every ticket at S or M. Split below into an engine-plus-rows ticket, a links ticket and the Back/Forward ticket, with view-state retention moved to Back/Forward (it is only observable through Back).
5. **Missed data-safety dependency: open-itens 094.** 094 (ready-for-agent, ledger `todo`) puts a fatal UTF-8 decode check at `openFileInEditor`'s `readTextFile` (`editor.service.ts:175`) so a binary with an unlisted extension (`.sqlite`, `.docx`) is never opened as an editable U+FFFD tab and autosaved. A `navigateInActiveTab` with its own `readTextFile`, as the scout sketches, bypasses both that guard and today's `isBinaryFile` gate (`:158-162`). The engine must load through one shared helper extracted from `openFileInEditor`, so 094's guard covers both paths whichever lands first.
6. **Replacing a canvas or collection tab in place loses edits.** Canvas and collection views are `{#key editorStore.activeTab.path}` instances whose destroy flush writes "after the active tab moved" into the tab of their path (`EditorView.svelte:83-91`, `registerPendingEditFlusher` `editor.service.ts:62-75`). If that tab's path changes in place, the flush finds no tab. Recommended rule: Replace only when the active tab is an unpinned markdown note AND the target is a `.md` note; every other case opens a new tab as today. History then exists only on markdown tabs, which is also the only place the action bar (and its Back/Forward) is mounted (`EditorView.svelte:68-70`). This removes the scout's design point 7.
7. **`notifyTabClosed` is private.** It is a module function (`editor.service.ts:38-46`), not exported. A new `tab-history.service.ts` needs it exported, or the in-place swap must live in `editor.service.ts`. Either way, tests with a closed `editor.service` mock that now reach the new service (`RailNoteList.test.ts:45`, `{ openFileInEditor }` only) throw on the missing export when a row is clicked. Those tests must mock the new service (a side-effect service, allowed) or extend the factory.
8. **Rename and delete rewriting must be prefix-aware.** `updateTabAfterRenameOrMove` re-paths tabs under a renamed folder too (`link-updater.service.ts:101-107`), and `closeTabsForDeletedPath` removes children of a deleted folder (`editor.service.ts:467-468`). History rewriting and pruning need the same `oldPath + '/'` rule, with a test for a folder rename and a folder delete. The scout's criterion names only a file.
9. **Missed openers.** Relationship rows in `BacklinksPanel.svelte:93` call `openFileInEditor` beside `LinkItem.svelte:10` and `OutgoingLinksPanel.svelte:63`. `PropertiesView.svelte` also opens link targets. The owner question on surfaces must name them.
10. **Same-note link with an anchor.** `openLink(activePath, anchor)` (a heading link into the open note, or a link to itself) must not push history; only the scroll happens. Not in the scout's criteria.
11. **Type crumb clickability via `typeNavigatorRows` is too expensive for the bar.** The bar re-derives on every keystroke (`NoteActionBar.svelte:56`, `getActionBarState(path, editorStore.activeTab?.content)`), and `typeNavigatorRows` walks every entry (`lens.logic.ts:492-513`). A type has a navigator row exactly when its metadata is visible (`buildTypeSections` skips `!metadata.visible`, `type-sidebar.logic.ts:207-208`), so the bar should ask `getTypeMetadataFallback(typeName, typeDefinitionsStore.typeMetadataMap).visible` (`type-definitions.logic.ts:265`), an O(1) lookup.
12. **Hidden rail items make crumbs and Reveal silent.** `restoreRailItem` shows Today while the saved item is hidden (`AppShell.svelte:104-112`, `layout.railHidden`). A user who hid Files or Types gets a crumb click or Reveal that changes settings and shows nothing. Rule: a crumb whose rail item is hidden renders as plain text; Reveal with Files hidden toasts and leaves the layout alone.
13. **`getActionBarState` has no vault path.** Its signature is `(path, content)` (`note-action-bar.logic.ts:27`). Folder segments need the vault root. For a tab outside the vault, `relativePath` returns the absolute path unchanged (`utils/path.ts:98-103`), which would render the whole disk path as crumbs. Use `vaultRelativeKey` (`:120-123`, null outside the vault) and show no folder crumbs then.
14. **The Files lens has no property or archived filter.** `offersArchivedFilter` is false for folders (`RailNoteList.svelte:138`), and Sort/Filter state belongs to view lenses (`:150-155`). What survives a same-folder Reveal is only the list search (`query`, `searchOpen`, cleared by `closeSearch` `:516-519` only on a `listIdentity` change `:498-509`). Scout Candidate 4 criterion 3 ("search or property filter") must say the search.
15. **The flash must be a prop on `NoteRow`, never a store read in it.** `rail-shell -> note-list` is a recorded pair; a `note-list -> rail-shell` import would close a cycle and fail `feature-cycle.test.ts:67-82`. The scout says "a prop" in design point 5; the criterion should pin it.
16. **Help pages not listed.** `help/documentation/03-editor.md` (Tabs `:5-9`, Note Action Bar `:34-36`, Wikilink Navigation `:109-116`), `02-file-explorer.md:59` ("Open in new tab" row), `05-wikilinks.md:48` ("opens in a new tab"), `20-keyboard-shortcuts.md:28` (shortcut table).
17. **`formatShortcut` detail.** Upper-casing applies only to `key` (`utils/keybindings.ts:44-46`). With `code: 'ArrowLeft'` it prints `⌘⌥ArrowLeft`, not `ARROWLEFT`. Either way it needs arrow glyphs; the criterion should assert `⌘⌥←`.
18. **Shared lines with right-sidebar clusters.** rs-links-toc T2 (`LinkItem.svelte`) and T4 (`OutgoingLinksPanel.svelte:58-82`) and rs-relationships T1 (`BacklinksPanel.svelte:57-103`) rewrite the same rows whose `onclick` the links ticket changes. The links ticket goes after them (one-line rebase each).
19. **Crumb order mixes two hierarchies.** The prototype renders `Type › Folder › Folder › Name` (`shell-tabs-navigation.html:1076-1078`), which reads as if the folders sit inside the type. Kept as the prototype has it, but listed as an owner question.

Checked and fine: two more bar buttons fit inside `BAR_RESERVED_WIDTH = 960` (`note-action-bar.logic.ts:93-98`), so `foldActions` and its tests do not change. Restoring a saved `EditorState` is diffed against the tab's current content (`MarkdownEditor.svelte:226-232`), so keeping editor state for history paths cannot write stale text. Tabs are not persisted across restarts (no tab restore in `src/lib` or `src-tauri/src`). The Files lens is flat (only Today and Neighbourhood resolve `groups`, `lens.logic.ts:342`, `:412`), so only the flat `VList` needs a ref. Only dot-names are hidden from the Files lens (`lens.logic.ts:935-937`), so "note not listable" is near-impossible for an open note; one toast branch is enough. Open-itens 025 already handles the button's note being closed ("on disk when A is no longer open"), so Replace does not break it.

## Ticket breakdown

Order: crumbs (A) -> Reveal (B), independent of the owner's Replace decision. Then, when question 1 lands: engine and rows (C) -> Back/Forward (D) and links (E), in either order. If the owner rejects Replace, C, D and E collapse into one S ticket: rename "Open in new tab" to "Open" in `NoteRowMenu.svelte:226` with its `NoteRowMenu.test.ts:77,314,325,359` expectations, and drop Back/Forward.

### A. Clickable breadcrumb: type and folder crumbs, name without ".md" (P102 part 1, M)

**What to build:**
- `note-action-bar.logic.ts`: `getActionBarState(path, content, vaultPath)` adds `name` (`stem(path)`, `utils/path.ts:79`; the bar mounts only for `.md`) and `folders: { label, path }[]` with accumulated absolute paths, from `vaultRelativeKey`; a vault-root note or a tab outside the vault has none. A pure `collapseFolderCrumbs(folders, max = 2)` keeps the first and last folder and folds the middle into one ellipsis item whose `title` lists them (count-based, testable without layout).
- New `features/rail-shell/lens-open.service.ts`: `openTypeLens(typeName)` sets `railItem: TYPES_RAIL_ITEM`, `railTypesLens: { kind: 'type', target }` and `railPanelsVisible: true`; `openUntypedLens()` sets `UNTYPED_LENS`; `openFolderLens(folder)` sets `railItem: FILES_RAIL_ITEM`, `railFolder` (null for the vault root), `railPanelsVisible: true`, and adds every ancestor of `folder` to `railExpandedFolders` (no duplicates, existing entries kept), from a pure `withExpandedAncestors` in `lens.logic.ts`. `FilesNavigator` does not auto-expand (`FilesNavigator.svelte:430-432`).
- `NoteActionBar.svelte:128-132`: crumbs are `<button>`s with `title` and accessible names ("Show all Project notes", "Show Areas/Health in Files"); the name stays a plain `span` with `truncate`. The type crumb is a button only when `getTypeMetadataFallback(typeName, map).visible` and the Types item is not in `railHidden`; an untyped note's "Note" is a button only when `settingsStore.showUntypedNotes` is on; folder crumbs are buttons only when Files is not hidden. No `h-*`, `p*-*`, `gap-*` or `border-*` utilities on the `.pane-toolbar` row itself, only inside the breadcrumb `div`.
- Help: `03-editor.md` Note Action Bar (`:36`).

**Files:** `src/lib/features/note-action-bar/note-action-bar.logic.ts`, `NoteActionBar.svelte`, new `src/lib/features/rail-shell/lens-open.service.ts`, `src/lib/features/rail-shell/lens.logic.ts`, tests under `src/tests/lib/features/note-action-bar/` and `src/tests/lib/features/rail-shell/`, `e2e/specs/note-action-bar.spec.ts`, `help/documentation/03-editor.md`.

**Blocked by:** none. Coordinate: sh-tabs T3 hides `.md` in tab labels (same rule, `.md` only; the bar uses `stem` because it is markdown-only); open-itens 207 (bar icon sizes, merge order); P39 (nl-actions-keyboard, More menu, not touched here).

**Acceptance criteria:**
- [ ] Failing test first, `note-action-bar.logic.test.ts`: `getActionBarState('/v/Areas/Health/Sleep.md', '', '/v')` returns `name` "Sleep" and folders `Areas` (`/v/Areas`), `Health` (`/v/Areas/Health`). `/v/Root.md` has none, `/elsewhere/x.md` has none, `v1.2 notes.md` gives "v1.2 notes". `collapseFolderCrumbs` keeps 1 and 2 folders as they are and folds a 4-folder path to first, ellipsis, last.
- [ ] Failing test first, `lens-open.service.test.ts` (real `settingsStore`, no mocks beyond the usual Tauri set): `openFolderLens('/v/Areas/Health')` with panels hidden and `railExpandedFolders: ['/v/Other']` gives `railItem: 'files'`, `railFolder: '/v/Areas/Health'`, `railPanelsVisible: true` and expanded `['/v/Other', '/v/Areas']` plus any deeper ancestor; `openTypeLens('Project')` gives the Types pick.
- [ ] Failing test first, `NoteActionBar.test.ts` (real stores): clicking the "Project" crumb and an "Areas" crumb changes `settingsStore.layout` as above (assert state, not a spy).
- [ ] A type with `_visible: false`, an untyped note with `showUntypedNotes` off, and any crumb whose rail item is in `railHidden` render as plain text (no button). With `showUntypedNotes` on, "Note" opens `UNTYPED_LENS`.
- [ ] The name renders "Launch plan" (`NoteActionBar.test.ts:175`, `note-action-bar.logic.test.ts:22,40` change on purpose); `e2e/specs/note-action-bar.spec.ts:36` expects `Welcome`; a new E2E step clicks a folder crumb and sees the Files lens on that folder.
- [ ] `pane-toolbar.test.ts` and the `foldActions` tests stay green.
- Gate: `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh e2e/specs/note-action-bar.spec.ts`.

### B. "Reveal in note list" (P102 part 2, M)

**What to build:**
- In `features/rail-shell/`: a small reveal store (`{ path, nonce } | null`, getter-based, ADR-0005) and `revealInNoteList(path)` in `lens-open.service.ts`: calls `openFolderLens(parent folder)` (vault root -> `railFolder: null`) and sets the request. With Files in `railHidden`, it toasts and changes nothing.
- `RailNoteList.svelte`: `bind:this` on the flat `VList` (`:881`); an `$effect` with `untrack` (PATTERNS.md) consumes the request once `notes` holds the path: clears the list search (`closeSearch`), calls `scrollToIndex(i, { align: 'center' })`, marks the row flashing for about 1.5 s, then clears the request. A path the lens does not list toasts "Not shown in the note list" and clears the request.
- `NoteRow.svelte`: a `flash` prop rendered as `data-note-row-flash` plus a class. `NoteRow` imports nothing from `rail-shell`.
- `NoteActionBar.svelte`: "Reveal in note list" as a plain More item above Copy deeplink (not a `FoldableAction`). `app/commands.ts`: "Reveal in note list" in Navigation, only with an active markdown note.
- Help: `03-editor.md` Note Action Bar.

**Files:** `src/lib/features/rail-shell/lens-open.service.ts`, new `src/lib/features/rail-shell/reveal.store.svelte.ts`, `RailNoteList.svelte`, `src/lib/features/note-list/NoteRow.svelte`, `src/lib/features/note-action-bar/NoteActionBar.svelte`, `src/lib/app/commands.ts`, tests, `e2e/specs/rail-shell.spec.ts`, `help/documentation/03-editor.md`.

**Blocked by:** A (service, ancestor helper). Do not run in parallel with C (`NoteRow.svelte`), nl-rows-sections, P24/P39 tickets (`NoteRow`, More menu), or nl-header-creation / nl-empty-states tickets (`RailNoteList.svelte`).

**Acceptance criteria:**
- [ ] Failing test first, `RailNoteList.test.ts` (virtua shims at `:8-30`, real stores): a Files lens of 100 notes with the target off-screen; a reveal request mounts the target row with `data-note-row-flash`, and the mark clears after the timer (fake timers).
- [ ] Failing test first: with the same folder already picked and the list search open on a query that hides the target, a reveal clears the query and shows the row flashing.
- [ ] Failing test first, `lens-open.service.test.ts` (real stores): `revealInNoteList('/v/Areas/Health/Sleep.md')` with panels hidden sets the Files lens, `railFolder`, expanded ancestors and `railPanelsVisible: true`; a root note sets `railFolder: null`; with `railHidden: ['files']` the layout is unchanged and a toast shows.
- [ ] An archived note is revealed (the Files lens lists archived notes).
- [ ] The More menu shows "Reveal in note list"; the palette entry exists with an active markdown note and not without one (`commands.test.ts`; its closed `editor.service` mock at `:8` is unaffected because the command imports from `rail-shell`).
- [ ] `foldActions` tests unchanged; `feature-cycle.test.ts` and `layer-rules.test.ts` green.
- Gate: `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh e2e/specs/rail-shell.spec.ts` with a new case that reveals a note in a nested folder.

### C. Note-list rows open in the active tab and record a per-tab history (P35 part 1, L, needs owner decision 1)

**What to build:**
- New pure `core/editor/tab-history.logic.ts`: `push(history, leaving, cap = 50)` (clears forward), `back` / `forward` (move the current path across), `rewritePath(history, old, new)` and `prunePath(history, deleted)`, both prefix-aware for folders.
- `EditorTab` gets `history?: { back: string[]; forward: string[] }` (`editor.types.ts`); a store method swaps a tab's path, name, content, savedContent and history in place.
- Extract from `openFileInEditor` one loader (binary gate, `readTextFile`, `fileType` derivation, `editor.service.ts:158-191`) used by both paths, so open-itens 094's decode guard covers navigation.
- New `core/editor/tab-history.service.ts` `navigateInActiveTab(path)`: falls back to `openFileInEditor` when there is no active tab, the active tab is pinned, virtual or not a markdown note, or the target is not `.md`. A target already open in another tab is focused with no push; the active path itself is a no-op. Otherwise it runs what `closeTab` runs for the leaving note (`flushPendingEdits`, save with the second-save loop, `editor.service.ts:369-382`); on a failed flush or save it opens the target in a new tab and leaves the old tab and its edits alone (no prompt). After the read it re-checks that the active tab is still the leaving path and the target was not opened meanwhile, then swaps, pushes the leaving path and calls `notifyTabClosed(leaving)` (exported; queryjs invalidation, `queryjs-ports.ts:16`).
- `updateTabAfterRenameOrMove` rewrites every tab's history; `closeTabsForDeletedPath` prunes it.
- `NoteRow.svelte:71`: a plain primary click navigates; a click with `isOpenLinkModifier(e, IS_MAC)` or a middle click (`auxclick`, button 1) calls `openFileInEditor`. "Open in new tab" keeps `openFileInEditor`.
- `e2e/fixtures/helpers.ts` `openFile` clicks with `modifiers: ['ControlOrMeta']`, so existing specs keep their tab counts.
- Help: `03-editor.md` Tabs, `02-file-explorer.md:59`.

**Files:** `src/lib/core/editor/editor.types.ts`, `editor.store.svelte.ts`, `editor.service.ts`, new `tab-history.logic.ts` and `tab-history.service.ts`, `src/lib/core/filesystem/link-updater.service.ts`, `src/lib/features/note-list/NoteRow.svelte`, `e2e/fixtures/helpers.ts`, tests, help pages.

**Blocked by:** owner question 1 (and 3). Soft: 094 (shared loader; whichever lands second rebases). Do not run in parallel with B (`NoteRow.svelte`) or open-itens 148 (adds an open hook to `openFileInEditor`; the new path must report the same way when 148 lands).

**Acceptance criteria:**
- [ ] Failing test first, `tab-history.logic.test.ts` (no mocks): push clears forward and caps at 50; back then forward round-trips; `rewritePath` handles a file and a folder (`/v/A/x.md` under `/v/A` -> `/v/B`); `prunePath` drops a file and everything under a deleted folder.
- [ ] Failing test first, `tab-history.service.test.ts` (real `editorStore`; mock only `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-dialog`, `svelte-sonner`): with unpinned markdown tab A active, `navigateInActiveTab(B)` leaves one tab whose path, name and content are B's and whose history is `back: [A]`, `forward: []`. Fails today (no such function).
- [ ] Failing test first: a pinned A, a virtual active tab (Tasks), a `.canvas` target and a target with a binary extension each go through `openFileInEditor` (a new tab, or the binary toast), with A unchanged; B already open in another tab is focused with no history entry; navigating to A itself changes nothing.
- [ ] Failing test first: a dirty A whose save fails (`writeTextFile` rejects) opens B in a new tab, and A's tab keeps its unsaved content.
- [ ] Failing test first: renaming the folder holding A rewrites A in another tab's history; deleting it prunes it.
- [ ] `NoteRow` test (or `RailNoteList.test.ts`, whose row-click cases at `:338`, `:881` change on purpose): plain click navigates, modifier click and middle click call `openFileInEditor`.
- [ ] E2E: a new spec opens A by plain row click, then B by plain row click, and sees one tab titled B; the existing multi-`openFile` specs stay green unchanged.
- Gate: `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh` for `tabs.spec.ts`, `tab-pinning.spec.ts` and the new spec.

### D. Back and Forward: keys, palette, action bar, mouse buttons (P35 part 2, M)

**What to build:**
- `goBack()` / `goForward()` in `tab-history.service.ts` through the same leave, save and load steps as C; an entry whose file is gone is dropped with one toast and the next one is tried.
- View state: `MarkdownEditor.svelte:476-478` keeps scroll and cursor for a leaving path that is still in a tab's history (not only in a tab); `EditorState` is not saved for history-only paths (memory). `closeTab` and history truncation delete view state of the entries they drop.
- `GLOBAL_KEYBINDINGS`: `editor:go-back` / `editor:go-forward` on Cmd+Opt+ArrowLeft / ArrowRight; `formatShortcut` maps arrow codes to `←` `→` (`utils/keybindings.ts:27-32`); palette "Go Back" / "Go Forward" in the Editor group with `shortcutFor`.
- `NoteActionBar.svelte`: Back and Forward icon buttons at the start of the bar, disabled when the active tab's history side is empty, `title` and `aria-label` with the shortcut.
- A document `mouseup` listener for buttons 3 and 4, registered beside `registerGlobalKeybindings`, kept only if the manual check passes.
- Help: `03-editor.md` Tabs, `20-keyboard-shortcuts.md`.

**Files:** `src/lib/core/editor/tab-history.service.ts`, `editor.service.ts` (`closeTab`), `src/lib/core/markdown-editor/MarkdownEditor.svelte`, `tab-view-state.ts`, `src/lib/app/global-keybindings.ts`, `src/lib/utils/keybindings.ts`, `src/lib/app/commands.ts`, `src/lib/features/note-action-bar/NoteActionBar.svelte`, tests, help pages.

**Blocked by:** C. Shares `NoteActionBar.svelte` with A and B (sequence), `global-keybindings.ts` and `commands.ts` with sh-view-headers-entry P37 and sh-menus-settings P103-P105 (mechanical merge; P37's keys are Ctrl+1..9 or Cmd+Opt+1..9, not arrows) and open-itens 146 (wraps binding handlers; merge order only).

**Acceptance criteria:**
- [ ] Failing test first, `keybindings.test.ts`: `formatShortcut({ meta: true, alt: true, code: 'ArrowLeft' })` is `⌘⌥←`.
- [ ] Failing test first, `tab-history.service.test.ts`: after A -> B, `goBack()` shows A with `forward: [B]`, `goForward()` returns to B; empty history changes nothing; a new navigation after Back clears forward; Back onto a deleted A drops it and toasts once.
- [ ] Failing test first (`src/tests/lib/core/markdown-editor/`, real `tab-view-state`): after A -> B -> Back, `getTabViewState(A)` still holds A's cursor; after closing the tab, no view state remains for its history entries.
- [ ] `global-keybindings.test.ts` (extend its closed mocks at `:13`): `shortcutFor('editor:go-back')` and `'editor:go-forward'` resolve; Cmd+[ is not bound globally.
- [ ] `commands.test.ts`: "Go Back" / "Go Forward" show the shortcut label.
- [ ] `NoteActionBar.test.ts` (real stores): Back is disabled with no history, enabled after a navigation, and clicking it shows the previous note.
- [ ] Mouse buttons 4 and 5: unit test of the button mapping; manual check in `pnpm tauri dev` recorded in the ticket (WKWebView delivery is unverified).
- Gate: `pnpm check` + `pnpm vitest run`; E2E: link or row navigation, then Cmd+Opt+Left returns, tab count stays 1.

### E. Links follow in the active tab; the open-link modifier opens a new tab (P35 part 3, M)

**What to build:**
- `core/markdown-editor/editor-host.ts:54`: `openLink(path, anchor?, options?: { newTab?: boolean })` (and the no-op host `:92`). `app/editor-host.ts:143-146`: `newTab` -> `openFileInEditor`, else `navigateInActiveTab`, then `scrollToAnchor`. A link to the active note only scrolls.
- `followWikilink` / `followWikilinkInfo` / `followWikilinkClick` take `newTab`; the three mousedown sites pass `isOpenLinkModifier(e, IS_MAC)`: `MarkdownEditor.svelte:273-289`, `widgets.ts:341-349`, `widgets.ts:675-681` (keep `stopPropagation`, live-preview rule 11). Meta-bind button `open` actions and `openWikilinkTarget` (`app/editor-host.ts:206`; Tasks, Kanban, Canvas) keep add-or-focus. `createNote` for a dangling link keeps opening a new tab.
- `LinkItem.svelte:10`, `BacklinksPanel.svelte:93`, `OutgoingLinksPanel.svelte:63`: plain click navigates, modifier or middle click opens a new tab.
- Help: `03-editor.md:109-116`, `05-wikilinks.md:48`.

**Files:** `src/lib/core/markdown-editor/editor-host.ts`, `extensions/live-preview/wikilink-navigation.ts`, `extensions/live-preview/widgets.ts`, `MarkdownEditor.svelte`, `src/lib/app/editor-host.ts`, `src/lib/features/backlinks/LinkItem.svelte`, `BacklinksPanel.svelte`, `src/lib/features/outgoing-links/OutgoingLinksPanel.svelte`, `e2e/specs/wikilink-navigation.spec.ts`, tests, help pages.

**Blocked by:** C. After rs-links-toc T2 and T4 and rs-relationships T1 (same rows). Merge-order only with open-itens 024 and 025 (meta-bind `open`, `app/editor-host.ts`).

**Acceptance criteria:**
- [ ] Failing test first, `wikilink-navigation` tests with a stub host: a plain follow calls `openLink(path, anchor, { newTab: false })`, a modifier follow `{ newTab: true }`; a same-note `[[#H]]` still only moves the cursor.
- [ ] Failing test first, `app/editor-host` test (real `editorStore`, Tauri mocked): `openLink(B)` from markdown tab A swaps the tab to B with `back: [A]`; `openLink(A, anchor)` while A is active pushes nothing.
- [ ] Failing test first: `resolveWikilinkClickPosition` behaviour is unchanged (`wikilink-click-target` tests green) and the click handler passes the modifier.
- [ ] `LinkItem.test.ts`, `BacklinksPanel.test.ts`, `OutgoingLinksPanel.test.ts`: plain click navigates, modifier click opens a new tab (mock the history service, keep stores real).
- [ ] `wikilink-navigation.spec.ts:16-27` is rewritten for Replace (tab count stays at baseline, Welcome replaced by Roadmap), and a new case Ctrl/Cmd-clicks a link (`ControlOrMeta`) and sees baseline + 1.
- Gate: `pnpm check` + `pnpm vitest run`; `bash scripts/e2e.sh e2e/specs/wikilink-navigation.spec.ts`.

## Open-itens Issues replaced

| Issue | Ticket | Note |
|---|---|---|
| `.scratch/open-itens/issues/153-tab-strip-shows-overflow-hides-md-extension.md` (ledger `:169` `todo`) | A (breadcrumb half only) | sh-tabs replaces the rest (fade, tab list, `.md` in tab labels, its T1 and T3). 153's "no breadcrumb component found" is stale: it is `NoteActionBar.svelte:128-132`. |

Dependencies, not replacements: 094 (C shares its load path), 148 (C's new open path reports like `openFileInEditor`), 014 (owned by rs-links-toc T1; Back makes its A -> B -> A trigger one keystroke), 024 and 025 (E, same `app/editor-host.ts` region), 146 (D, binding handlers), 207 (A and D, bar icon buttons). Excluded: 012 (tab menu, sh-tabs), 132 (an `openFileInEditor` caller with no replace wanted), 154 (inline title in the editor, not the bar), `tasks-view-ux` "breadcrumb" (a Tasks field, name collision only). No live Issue proposes history, Back/Forward, clickable crumbs or Reveal.

## Dropped

- "Until then, make Open in new tab really open a second tab" (P35 Proposal): a tab is its path (`findTabIndex`, path-keyed saves, flushers, view state), so a second tab on the same path is not buildable without duplicate-path tabs. Under Replace the menu item is truthful for any note not already open.
- "Obsidian's default" for Cmd+Opt+Left/Right: unverifiable and not needed; the keys are free in CodeMirror, `GLOBAL_KEYBINDINGS` and the native menu.
- Back/Forward on canvas, kanban and collection tabs (scout design point 7): moot under the markdown-only Replace rule.

## Owner questions

1. **Replace or not?** A plain click on a note row or link replaces the active unpinned markdown tab; Cmd/Ctrl+click, middle click and "Open in new tab" add a tab. Downside: a tab you meant to keep is overwritten (Back undoes it). Alternative: keep add-or-focus, rename the item to "Open", drop C, D and E. (Recommended: Replace.)
2. **Which surfaces in the first pass?** (Recommended: note-list rows (C), editor wikilinks and the Backlinks, Relationships and Outgoing rows (E). Unchanged: quick switcher, search results, Properties link values, canvas nodes, Tasks, Calendar, deep links, mods, meta-bind `open`, dangling-link create. P24's Cmd+Enter reuses C's new-tab path later.)
3. **Replace only markdown to markdown?** (Recommended: yes; a canvas, kanban or view target, or a non-markdown active tab, opens a new tab.)
4. **Reveal target:** always the Files lens at the note's folder? (Recommended: yes; it lists archived notes and is predictable.)
5. **Untyped "Note" crumb:** open the Untyped lens when that row is enabled? (Recommended: yes, plain text otherwise.)
6. **Crumb order:** keep the prototype's `Type › folders › name`? (Recommended: yes.)
7. **Long paths:** fold middle folders by count, keeping the first and the last? (Recommended: yes, max 2 shown.)
8. **Mouse buttons 4/5:** if WKWebView does not deliver them, ship without? (Recommended: yes; keys, palette and bar cover it.)

## Not checked

- Whether Tauri's macOS WKWebView delivers mouse buttons 3 and 4 to JS or runs its own back navigation (needs the running app).
- Pixel behaviour of crumb truncation and the flash highlight (jsdom has no layout).
- I did not run tests, builds or E2E. Sibling tickets (sh-tabs T3, rs-links-toc T2/T4, rs-relationships T1, P39, P24) were read from their scout and verdict files, not re-verified in code.
