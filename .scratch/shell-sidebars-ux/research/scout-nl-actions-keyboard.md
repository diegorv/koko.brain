# Scout: note actions and list keyboard model (P39, P24)

Checked against HEAD `ab143a411` (main). Haiku raw evidence (`research/raw/P39.md`, `research/raw/P24.md`) was treated as leads: every load-bearing claim below was re-read in the code. The prototype is `.scratch/design-review/prototypes/note-list-rail.html` (P39 section at `<!-- P39 -->`, script `NOTE_ACTIONS`/`doAction`/`mount39`; P24 section `#p24`, script `p24()`). Screens: `screens/note-row-context-menu-light.png`, `screens/rail-inbox-light.png`. Nothing in the files below changed since the review except that `EditorTabs.svelte` already has the Tags tab icon (finders-ux 10, resolved).

## Code map (what runs today)

Note actions today live on five surfaces, each with its own list, labels and write path.

| Surface | File | What it offers |
|---|---|---|
| Row context menu | `src/lib/features/note-list/NoteRowMenu.svelte:221-287` | Open in new tab, Duplicate, Show in Views (hidden `.view` only), Copy path, Change icon, Favorite (markdown only), Reveal in Finder, mod `extraItems`, Rename (F2 hint), Move to Trash. No Archive, Organized, Move, History. |
| Note action bar | `src/lib/features/note-action-bar/NoteActionBar.svelte:146-219` | Favorite and Organized icon buttons (aria-labels "Add to favorites", "Set note as organized"), More menu: folded actions, Copy deeplink, Archive this note / Restore this archived note, "Delete this note". Active note only. |
| Tab context menu | `src/lib/core/markdown-editor/EditorTabs.svelte:101-111` | "Pin tab"/"Unpin tab", "Close tab" (hidden when pinned). Per-tab `ContextMenu.Root` inside `{#each}`. |
| Palette | `src/lib/app/commands.ts:339-351` (Toggle Favorite, Toggle Organized), `:412-422` (View File History), `:129-135` (Close Tab) | Active note only. No Archive, no Trash, no Move. The review's evidence range `commands.ts:405-415` is stale (it is "Open Settings"). |
| Keyboard | `src/lib/app/global-keybindings.ts:191-199` | Cmd+D and Cmd+E act on the active tab's note. |

Write path and state:
- `src/lib/features/properties/lifecycle.service.ts:30-41` `updateActiveNote` returns unless the active tab is a markdown note; `toggleActiveNoteOrganized` (`:83-85`) and `toggleActiveNoteArchived` (`:91-93`) go through it. The only by-path writer is `toggleFavoriteForPath` (`:48-57`), which calls `vaultStore.requestPromptIndexRefresh()` then `updateNoteFrontmatter(path, mutate)` and toasts `FrontmatterWriteError`. There is no organized or archived by-path writer.
- `src/lib/features/properties/lifecycle.logic.ts:49-57` `toggleOrganized`/`toggleArchived` are pure and path-agnostic; `isOrganized` (`:31`) reads only a boolean `_organized: false` as not organized.
- `src/lib/features/note-action-bar/note-action-bar.logic.ts` `getActionBarState(path, content)` derives favorite/organized/archived from any tab's content, so a non-active tab's state can be read from `tab.content`.
- Delete has two copies of the same confirm: `src/lib/core/filesystem/delete-note.service.ts:12-28` (`ask("Move \"<basename>\" to trash?")`, used by the More menu) and `NoteRowMenu.svelte:162-170` `handleDelete` (`ask("Move \"<title>\" to trash?")`, wrapped in `runOrToast`, which first calls `vaultStore.requestPromptIndexRefresh()` at `:73-74`, per open-itens 043, resolved). The two differ in prompt text (title vs file name) and in the prompt refresh.
- Rows: `NoteRow.svelte:67-81` root is a `<button data-note-row>` (so a check inside it would be nested interactive content). `NoteRowNote` (`note-row.types.ts:4-18`) has no `organized` or `archived`; `LensNote` (`rail-shell.types.ts:37-56`) adds `archived` and `italic` (Inbox entries render italic in every lens, `lens.logic.ts:291`). `toLensNote` (`lens.logic.ts:280-295`) does not copy `organized`; `fileToLensNote` (`:960-975`) builds non-markdown rows as a literal.
- Only `RailNoteList.svelte` mounts `NoteRowMenu`/`NoteRow` (`:814`, `:893-906`; flat `VList` at `:881`, grouped at `:816`). Inbox lens: `lens.logic.ts:307`, `isInboxEntry` in `type-definitions/inbox-workflow.logic.ts:10-12` (the dock badge uses it too).
- `explicitOrganization` defaults to `true` (`settings.store.svelte.ts:158`), so Quick Capture and new notes start `_organized: false` and reach the Inbox by default.
- Layer constraint that shapes P39: `EditorTabs.svelte` is in `core/markdown-editor/` and is handed its feature-level bits as props from `app/EditorView.svelte:67` (`tabIcon`, `tabTitleColor`). It cannot import `features/properties` (layer-rules ratchet, baseline 3 entries, shrink-only). The tab menu therefore gets the shared note actions through a prop or snippet built in `EditorView.svelte`. Feature-to-feature imports must stay acyclic (`feature-cycle-baseline.json`, `featureCycleEdges: []`): a shared actions module imported by `note-list` must not live in `note-action-bar` (it imports `rail-shell`, which imports `note-list`: that would close a cycle). `features/properties` is safe: `note-list -> properties`, `note-action-bar -> properties` and `rail-shell -> properties` already exist.

Keyboard today:
- `NoteRow.svelte:73` `onkeydown` handles only F2 (`RENAME_SHORTCUT`, `note-row-menu.context.ts:5`). A focused row button already opens on Enter and Space through the native click (`:71` `openFileInEditor`). Every row is a native Tab stop (no `tabindex`; the only `tabindex` is `-1` on the wikilink pill, `:116`).
- `RailNoteList.svelte`: no arrow keys, no roving. The list is virtualized with `virtua/svelte` `VList` (v0.54.2). Its handle has `scrollToIndex` and the prop `keepMounted?: readonly number[]` (`node_modules/virtua/lib/svelte/Virtualizer.type.d.ts:69,134`), so the current row can stay mounted.
- `RailListSearch.svelte:79-81`: Escape calls `onClose`, and `RailNoteList.svelte:511-514` `closeSearch()` clears the query and hides the bar. So "first Escape clears the query" already holds for the rail list search.
- `SearchPanel.svelte:41-44` `handleKeydown`: Escape only `inputEl?.blur()`. No arrow handling; results (`data-search-result-list`, `:213-217`) are a plain `{#each}` of `SearchResult.svelte` (`<div data-search-result><button>` at `:135-139`), not virtualized.
- Roving model today only in Tasks: `src/lib/features/tasks/tasks-keys.logic.ts` is pure (`resolveTaskKey` `:46-67`, `nextCurrentRow` `:75-88`, `tabStopRow` `:101-112`); DOM glue is in `TasksView.svelte:83,333,394-410,458-477,537,802-888,1136`. That list is not virtualized (rows capped per group), which is why `tabStopRow` only deals with collapsed groups. Kanban has an unrelated focus model (`KanbanView.svelte:236-300`, focus in `kanbanStore`).

Who reads the stores involved: `fsStore.renamingPath` (row rename), `editorStore.tabs/activeTab` (tab state, content), `typeDefinitionsStore.entriesByPath` and `vaultStore` index snapshot (lens lists), `searchStore` (SearchPanel). Consumers of the lens list: `RailNoteList.svelte` only; `dock-badge` reads `isInboxEntry`.

## P39. Note actions split across five surfaces; Inbox triage

**Still real: yes** (every claim holds; two evidence details are off, see below).

Current behaviour (verified, path:line):
- Organized and Archive exist only for the active tab (`lifecycle.service.ts:30-41, 83-93`); the row menu has none (`NoteRowMenu.svelte:221-287`, order pinned by `NoteRowMenu.test.ts:310-318`); the tab menu has only Pin and Close (`EditorTabs.svelte:101-111`, pinned by `EditorTabs.test.ts:143-158`).
- "Delete this note" (`NoteActionBar.svelte:216-218`) vs "Move to Trash" (`NoteRowMenu.svelte:282-285`, `delete-note.service.ts:14-18`), same action, two confirm implementations with different text.
- No Close others / Close to the right anywhere (`closeTab(index)` at `editor.service.ts:362` is the only primitive; it skips pinned tabs and prompts "Close anyway" when a dirty save fails).
- No row-level organized control; Inbox triage today is open the row, then click the bar's check (`NoteActionBar.svelte:155-167`): 2 actions per note.
- No "Move to..." anywhere: `moveItem(source, targetDir)` exists (`fs.service.ts:304`) but is used only by Files drag and drop; there is no folder picker component (`grep` for picker finds only `FilesNavigator.pickFolder`, which selects a lens). "History" exists as `openFileHistory(absolutePath)` (`file-history.service.ts:17`), which works for any path, but is reachable only from the palette and a global shortcut (`global-keybindings.ts:174`).
- Corrections to the review: `commands.ts:405-415` should read `339-351` and `412-422`; the tab menu label in code is "Close tab", the prototype says "Close".

What the prototype wants:
- One shared group appended to the row menu, the More menu and the tab menu, same labels and order: Archive, Mark organized (kbd Cmd+E), Move to..., History, separator, Move to Trash (danger). The prototype's "Highlight shared group" toggle shows the set. Row menu keeps Open in new tab, Duplicate, Copy path, Change icon, Favorite, Reveal in Finder, Rename above it. Tab menu: Pin tab, then Close, Close others, Close to the right, then the shared group. More menu: Copy deeplink, Reveal in Finder, then the shared group. Palette: the same actions under Note.
- Inbox rows get an inline organized check (absolutely positioned top right, hidden until row hover, focus-within or active row, hover turns green), `aria-label="Mark organized"`, title "Mark organized (Cmd+E)". Click removes the row from the list and its tab (prototype only; stubs "Move to..." and "History" with toasts). Prototype caption: 4 Inbox notes cost 8 clicks today, 4 after.
- The prototype's inline check is a `span role="button"` because a `<button>` cannot nest in the real row button.

Design points a ticket must settle:
1. **By-path writers.** Add `setOrganizedForPath(path, organized)` and `setArchivedForPath(path, archived)` next to `toggleFavoriteForPath` (same shape: prompt refresh, `updateNoteFrontmatter`, toast `FrontmatterWriteError`). Use explicit set, not toggle, for the inline check: a double click before the row leaves the list (the index refresh is async, `lifecycle.service.ts:34` comment) would otherwise un-organize the note. Archive keeps `toggleArchived`'s semantics: `_organized` untouched, after-save hooks apply `_archive_to`.
2. **Row state.** The row menu needs `organized` and `archived` on `NoteRowNote` (labels "Mark organized"/"Mark not organized", "Archive"/"Restore"). Add both to `NoteRowNote`, fill them in `toLensNote` and the literal in `fileToLensNote`. The inline check itself does not need `organized` (Inbox rows are unorganized by definition), so ticket A can ship without the field.
3. **Which rows get the check.** Prototype and P39 text say Inbox rows. Italic marks every unorganized note in any lens (`lens.logic.ts:291`); a check on all of them is possible but not asked. Default: Inbox lens only, markdown rows only, via an `onOrganize` prop that RailNoteList passes only when `lens.kind === INBOX_LENS.kind`.
4. **Nested interactive.** The check must be a sibling of the row button inside a new wrapper (`relative` div), not a child. `data-note-row` stays on the button (the menu's blank-area test uses `closest('[data-note-row]')`, `NoteRowMenu.svelte:211`; right-click on the check then counts as blank, acceptable). Reserve right padding on the title while the check is visible so it does not overlap the truncated title. The wrapper must not change the virtualized row height.
5. **Tab stops.** A check per row doubles the Tab stops that P24 wants to remove. Default: the check is a `<button tabindex="-1">` (mouse and menu path first); ticket F makes it part of the roving tab stop. Icon-only buttons are P22's territory (IconButton + Tooltip): use `aria-label` plus `title` unless IconButton lands first.
6. **Shared list location and shape.** A pure `note-actions.logic.ts` in `features/properties` (see layer notes): ordered descriptors `{ id, label(state), icon, danger, applies(kind), shortcut? }` plus group separators. Menus render them with their own primitive (ContextMenu, DropdownMenu, EditorTabs prop), because the primitives differ; the list owns labels, order and applicability (markdown only for Organized/Archive/Favorite, as `NoteRowMenu.svelte:256` already guards for frontmatter safety; canvas/view/pdf rows get only Move to Trash and, later, Move to).
7. **Tab menu composition.** `EditorTabs` gets an optional `noteActions` snippet (or `Snippet<[EditorTab]>`) that `EditorView.svelte` fills for markdown note tabs only (`isMarkdownNoteTab`); tasks/graph/tags/canvas/kanban/virtual tabs keep Pin and Close. State for a non-active tab comes from `getActionBarState(tab.path, tab.content)`.
8. **Close others / Close to the right.** New helpers in `editor.service.ts` that iterate over paths, not indexes (`closeTab` awaits saves and prompts, so indexes shift), call `closeTab` per tab so the dirty-save "Close anyway" prompt and pinned-skip are reused, and re-find each tab by `findTabIndex` right before closing (the existing `closeTab` already re-finds after its awaits at `:384`). After Close others the kept tab becomes active. A declined "Close anyway" skips that tab and continues. `closeTab` returns void, so a helper that must stop on cancel needs it to return a boolean; default is to continue.
9. **One Trash action.** Row menu and More menu call `deleteNoteWithConfirm`; move the `requestPromptIndexRefresh()` that `runOrToast` does into it (or call it before), or the row loses the 043 behaviour (`NoteRowMenu.test.ts` pins the toast text at `:446-450`). Prompt text must be unified (title vs file name). Label everywhere: "Move to Trash". `FilesNavigator.svelte:195-202,399` and `TypesNavigator.svelte:345` already use it; not part of this change.
10. **Palette.** `getBuiltInCommands()` is evaluated in the template (`AppOverlays.svelte:19`), so a state-aware label would re-run on every keystroke if it read `activeTab.content`. Default: palette entries keep stable labels (existing "Toggle Favorite", "Toggle Organized"; add "Toggle Archived", "Move Note to Trash", and later "Move Note to...") in the same relative order; menus keep state-aware labels. This narrows P39's "same labels" for the palette only.
11. **Feedback after the inline check.** The row leaves the list when the index refreshes (prompt refresh is requested, so about one watcher round trip, not measured). Prototype shows a toast; Cmd+E shows none today. Default: no toast.
12. **Focus after the check.** A keyboard activation removes the focused element. Ticket F's `nextCurrentRow` logic handles it for the roving list; until F, the check is mouse-only (`tabindex=-1`), so no focus loss exists.
13. **Open-itens 132** adds an "Edit view" row item and P35 may rename "Open in new tab": the shared list's row group must be built so those items slot into the unshared top group.

Test files and seams (never mock stores or `.logic.ts`; mock Tauri APIs, dialogs, fs and side-effect services):
- Path writers: new `src/tests/lib/features/properties/lifecycle.service.organized-path.test.ts` modelled on `lifecycle.service.favorite-path.test.ts` (mocks `@tauri-apps/plugin-fs`, `@tauri-apps/api/core`, `editor.service.js`, `svelte-sonner`; real writer, real `vaultStore`, `editorStore`). Add a `lifecycle.logic.test.ts` case only if a pure helper is added.
- Row menu: `src/tests/lib/features/note-list/NoteRowMenu.test.ts` (menu order `:310-329`, delete cases `:429-457`, mocks `lifecycle.service.js` with only `toggleFavoriteForPath`: the factory must gain the new exports) with harness `src/tests/fixtures/NoteRowMenuHarness.svelte` (plain `{#each}`, no VList).
- New `src/tests/lib/features/note-list/NoteRow.test.ts` for the inline check (no NoteRow test exists today); extend the harness with an `onOrganize` prop.
- Inbox wiring: `src/tests/lib/features/rail-shell/RailNoteList.test.ts` (Inbox lens cases near `:182`, `:376`; the file already shims `ResizeObserver` and `offsetParent` for virtua) and `lens.logic.test.ts` (`organized`/`archived` on `toLensNote`).
- Shared list: new `src/tests/lib/features/properties/note-actions.logic.test.ts`.
- More menu: `src/tests/lib/features/note-action-bar/NoteActionBar.test.ts` (`:298` Archive, `:324,341` Delete, `:519` group order; label rename breaks these on purpose).
- Delete: `src/tests/lib/core/filesystem/delete-note.service.test.ts`.
- Palette: `src/tests/lib/app/commands.test.ts` (`:154`) and `commands.new-commands.test.ts`.
- Tab menu: `src/tests/lib/core/markdown-editor/EditorTabs.test.ts` (`:143-158` pins `['Pin tab', 'Close tab']`), `src/tests/lib/core/editor/editor.service.test.ts` (`describe('closeTab')` at `:616`), `src/tests/lib/app/EditorView.test.ts`.
- E2E: `e2e/specs/file-operations.spec.ts:15-25` (row menu `/Move to Trash/i`), `tab-pinning.spec.ts`, `note-action-bar.spec.ts` (label "Set note as organized" at `:56-58`), `rail-shell.spec.ts` and `rail-list-toolbar.spec.ts` (Inbox rows via `[data-note-row]`). No spec covers Close others or an inline Inbox check; one Inbox triage spec (click check, row leaves, count drops) is worth adding. E2E only via `bash scripts/e2e.sh`.

## P24. Lists have no keyboard model except Tasks; every row is a Tab stop

**Still real: partial.** Confirmed: rows are native Tab stops with no arrows (`NoteRow.svelte:67-81`); SearchPanel Escape only blurs and has no arrows (`SearchPanel.svelte:41-44`); the model to reuse exists (`tasks-keys.logic.ts:46-112`); Kanban has its own model and stays. Stale or wrong in the proposal text:
- F2 rename already exists on the row (`NoteRow.svelte:73`).
- Enter (and Space) already open a focused row (native button click).
- "Cmd+Enter for a new tab" has no distinct behaviour to build: `openFileInEditor` focuses an existing tab or appends one (`editor.service.ts:148-170`), the same function the menu's "Open in new tab" and a plain click call. finders-ux dropped P156 for the same reason, and P35 (shell-history-breadcrumb cluster) holds the owner decision on replace-vs-new-tab.
- "First Escape clears the query" already holds for the rail list search (`RailListSearch.svelte:79-81` plus `RailNoteList.svelte:511-514` clears and closes). It is a change only for SearchPanel.
- Review cites `SearchPanel.svelte:35-38`; the handler is at `:41-44`.
- Tier mismatch: the prototype tags P24 "moderate", the review says Effort L. Treat as L for the note list, M for Search.

What the prototype wants (`#p24`): a "Projects" list pane where only one row has `tabindex=0` (caption "Tab stops among rows: 1" vs 7 before); `role="listbox"`/`option`; ArrowDown/ArrowUp, Home/End; ArrowUp on the first row focuses the search input; Enter opens (marks opened); Cmd/Ctrl+Enter logs "Opened in a new tab"; F2 swaps the title for an inline input (Enter commits, Escape cancels); in the search input ArrowDown focuses the first row and Escape clears a non-empty query, else blurs; a key-hint bar (`.khint`, shown only while the pane has focus-within) with arrows/Enter/Cmd+Enter/F2. The prototype's "search" is a title filter on one list (the rail list search), not the Search rail item.

Design points a ticket must settle:
1. **Extraction shape.** The pure part is already in `tasks-keys.logic.ts`, but `resolveTaskKey` is Tasks-specific (Space toggles, Enter opens at a line, menu keys). Extract only the generic parts (`focus` resolution for ArrowUp/ArrowDown/Home/End with clamping, repeat and modifier rules, `nextCurrentRow`, `tabStopRow`) into a pure shared module (`src/lib/utils/roving-list.ts`: pure, no state, usable from any layer). `tasks-keys.logic.ts` keeps its exports and signatures and delegates, so `tasks-keys.logic.test.ts` and `TasksView.keyboard.test.ts` pass unchanged. Do not rewrite `TasksView.svelte`.
2. **Note rows need only focus keys.** Enter, Space and F2 already work per row; resolver for note rows returns `focus` actions only. Keep the row's own F2 handler.
3. **Virtualization.** Unlike Tasks, unmounted rows exist. ArrowDown/End must `scrollToIndex` then focus after mount; the tab stop row must stay mounted or Tab cannot land (pass `keepMounted={[currentIndex]}` to both VLists). The grouped list (`groupedItems`, `RailNoteList.svelte:816`) mixes header, empty and Today-section items: roving order is the note rows only; section components (MyPeopleSection etc.) stay in normal tab order (P120 owns their focus rings).
4. **Row identity.** Key = `note.path`. Rename changes the path (`renameItem`), so the current row must be re-pointed to the new path on commit, and focus restored to the row after Enter/Escape in the rename input (today `commitRename` ends on blur and focus is lost when the row remounts from `div` back to `button`).
5. **Inline check and roving.** Ticket A's check is `tabindex=-1`; F gives it `tabindex=0` only on the tab-stop row (Tasks precedent `rowTabindex`). Cmd+E is global and acts on the active tab, not the focused row: with arrow focus a user can press Cmd+E on a row that is not the open note. Default: leave Cmd+E as is and drop the shortcut from the check tooltip.
6. **Focus after removal.** When the focused row leaves (organized from Inbox, delete, archive filter), `nextCurrentRow`/`tabStopRow` pick the neighbour and focus follows only when focus was on the removed row or inside the list (Tasks `$effect` at `TasksView.svelte:458-477` is the reference, including the "only when free" rule so typing in the search box never steals focus).
7. **Search input handoff.** `RailListSearch` needs `onArrowDown` to focus the first row; ArrowUp on the first row returns to the input when the search bar is open. SearchPanel: ArrowDown from the input focuses the first `[data-search-result] button`; ArrowUp on the first result returns to the input; results are not virtualized, so a `querySelectorAll` roving is enough. One tab stop for the results list.
8. **SearchPanel Escape.** Proposal: first Escape clears the query when non-empty, then blurs. This contradicts `SearchPanel.test.ts:153-158` (empty query: blur and keep Search shown, still valid) and `e2e/specs/search.spec.ts:39-51` (types "Roadmap", presses Escape, expects blur and the result still visible: invalid under the new rule and must be rewritten). The repo forbids changing a test to make it pass without approval, hence owner question 2.
9. **a11y semantics.** The prototype uses `role="listbox"`/`option`; real rows are buttons that open on activation and carry a context menu, pills and (later) a check. Default: no listbox role; keep buttons, add a single labelled container (`role="group"` is not needed), and rely on roving `tabindex`. Add `aria-keyshortcuts` only if the hint bar ships.
10. **Hint bar.** Prototype shows a key-hint bar while the list has focus. It is optional chrome inside the rail pane (a new row in the list area, adds height and a P22/P23-adjacent surface); default: ship it only if the owner wants it, behind its own criterion.
11. **Focus ring.** `NoteRow.svelte:70` ring is `ring-ring/50` (P23 token, other group). Roving keeps the ring on the focused row; `e2e/specs/focus-ring.spec.ts:123,159-165` `tabUntil('[data-note-row]')` should still land on the tab-stop row, unconfirmed until run.
12. **Out of this wave.** Files and Types trees, collection rows and the quick switcher/palette (cmdk already handles arrows) are the proposal's "second" step. FilesNavigator (`FilesNavigator.svelte`) and TypesNavigator would reuse the same module later.

Test files and seams:
- Pure logic: new `src/tests/lib/utils/roving-list.test.ts` (or beside the module); `tasks-keys.logic.test.ts` must stay green unmodified.
- Search: `src/tests/lib/features/search/SearchPanel.test.ts` (real `searchStore`, mocked search service, as it does today; Escape cases `:145-160`), `SearchResult.test.ts`; e2e `e2e/specs/search.spec.ts:39-51` rewritten, new case for ArrowDown into results.
- Note list: `src/tests/lib/features/rail-shell/RailNoteList.test.ts` (real stores, virtua shimmed with a 600 px viewport and 60 px rows: more than about 10 notes are needed to exercise scrolling to an unmounted row), `RailNoteList.search.test.ts`, `RailListSearch.test.ts:141-143`, and a new `RailNoteList.keyboard.test.ts` modelled on `TasksView.keyboard.test.ts`. The `NoteRowMenuHarness` has no VList, so it cannot test virtualization.
- E2E: new keyboard spec for the note list (one tab stop, arrows, Home/End, focus after Enter); `rail-shell.spec.ts` and `focus-ring.spec.ts` must keep passing.

## Candidate tickets

Grouping rule applied: same component, same state and same files in one ticket; split where an independent risky part exists (multi-tab close prompts, a new folder-picker dialog, virtualization) or a ticket would exceed one agent context.

### A. Inbox rows get an inline "Mark organized" check (P39, Inbox half)
- Size: M (small end).
- Files: `src/lib/features/properties/lifecycle.service.ts` (+ `setOrganizedForPath`), `src/lib/features/note-list/NoteRow.svelte` (sibling wrapper + check button, `onOrganize` prop), `src/lib/features/rail-shell/RailNoteList.svelte` (`noteRow` snippet passes `onOrganize` only for the Inbox lens).
- Blockers: none inside this cluster. Shared files with other clusters: `RailNoteList.svelte` (nl-header-creation P33/P38/P84 edit the header, nl-empty-states P29 edits the empty branches; different regions, rebase only), `NoteRow.svelte` (nl-rows-sections P117/P120 touch row subtitle and My people; P22/P23 elsewhere).
- Acceptance criteria:
  1. Failing test first, `lifecycle.service.organized-path.test.ts`: `setOrganizedForPath(path, true)` on a note with `_organized: false` writes `_organized: true`, leaves `_archived`, the body and an open tab's unsaved edits alone, and calls `requestPromptIndexRefresh`; calling it twice leaves it organized (idempotent, no toggle); a lossy-frontmatter refusal shows the frontmatter toast and propagates nothing else.
  2. Failing test first, new `NoteRow.test.ts`: with `onOrganize`, the row renders a `<button aria-label="Mark organized">` that is a sibling of the `[data-note-row]` button (not a descendant); clicking it calls `onOrganize(note)` and does not call `openFileInEditor`; without `onOrganize` no check renders.
  3. Failing test first, `RailNoteList.test.ts`: in the Inbox lens every markdown row has the check; in Favorites, Archive, a type lens and a folder lens none do; clicking the check on a row writes `_organized: true` for that path (fs mocked, real writer) and the row leaves the list after the index refreshes.
  4. A double click on the check does not flip the note back (covered by criterion 1's idempotence, asserted at the component level with two clicks).
  5. The check has `tabindex="-1"`, an accessible name and a `title`; the title carries no shortcut (Cmd+E acts on the active tab); right-click on the check does not open the row menu for another row (blank-area rule).
  6. E2E (`bash scripts/e2e.sh`): in Inbox, click the check on the first row, the row and its count disappear, and the note's file has `_organized: true`; existing `rail-shell.spec.ts` and `rail-list-toolbar.spec.ts` stay green.

### B. One note-actions list in the row menu, the More menu and the palette (P39, shared list)
- Size: M (large end); if it overruns, move the palette into its own commit-sized follow-up, not into another ticket.
- Files: new `src/lib/features/properties/note-actions.logic.ts`, `lifecycle.service.ts` (+ `setArchivedForPath`), `src/lib/features/note-list/NoteRowMenu.svelte`, `note-row.types.ts` (+ `organized`, `archived`), `src/lib/features/rail-shell/lens.logic.ts` (`toLensNote`, `fileToLensNote`), `src/lib/features/note-action-bar/NoteActionBar.svelte` (More menu), `src/lib/core/filesystem/delete-note.service.ts`, `src/lib/app/commands.ts`.
- Blockers: A (shares `lifecycle.service.ts`, the `NoteRowMenu.test.ts` lifecycle mock and the by-path writer). Cross-cluster: `NoteActionBar.svelte` (sh-history-breadcrumb P102 adds "Reveal in note list" to the same More menu and the breadcrumb), `commands.ts` (sh-menus-settings P103/P104/P105 add palette commands), `lens.logic.ts` (P117), `NoteRowMenu.svelte` (open-itens 132 and 028, P35 label of "Open in new tab").
- Acceptance criteria:
  1. Failing test first, `note-actions.logic.test.ts`: for a markdown note the list is, in order, Archive or Restore, Mark organized or Mark not organized, History, then Move to Trash (danger, after a separator group); for a canvas, view or PDF note only Move to Trash; labels follow `{organized, archived}` state.
  2. Failing test first, `NoteRowMenu.test.ts`: the row menu (markdown) ends with the shared group in that order after Rename; its labels equal the More menu's for the same state; "Mark organized" writes by the row's path, not the active tab (open another note, act on the row, assert the row's file changed); a non-markdown row shows only "Move to Trash" in the shared group. The existing order tests (`:310-329`) are updated for the added items, not loosened.
  3. Failing test first, `NoteActionBar.test.ts`: the More menu has "Move to Trash" (no "Delete this note" anywhere in `src/lib`), Archive/Restore and Mark organized in the shared order, and `deleteNoteWithConfirm` is the only confirm path.
  4. Failing test first, `delete-note.service.test.ts` and `NoteRowMenu.test.ts`: both menus produce the same `ask` text and options, and the row path still requests a prompt index refresh before the delete (043 behaviour kept); PreDeleteSaveError still adds no toast.
  5. Failing test first, `commands.test.ts`: palette has stable-label "Toggle Archived" and "Move Note to Trash" (category Note) next to the existing two, each acting on the active note; "View File History" stays.
  6. `lens.logic.test.ts`: `toLensNote` carries `organized` and `archived`; the folder lens non-markdown literal has `organized: true, archived: false`.
  7. E2E: update `file-operations.spec.ts` (still `/Move to Trash/i`), `note-action-bar.spec.ts` for the renamed item; Gate: frontend (`pnpm check` + `pnpm vitest run`).

### C. Tab menu: Close others, Close to the right, and the shared note group (P39, tab half)
- Size: M.
- Files: `src/lib/core/markdown-editor/EditorTabs.svelte` (menu items, new `noteActions` snippet prop), `src/lib/app/EditorView.svelte` (builds the group for markdown tabs), `src/lib/core/editor/editor.service.ts` (`closeOtherTabs(path)`, `closeTabsToTheRight(path)`).
- Blockers: B (shared list and by-path writers). Shared files: `EditorTabs.svelte` with sh-tabs P34 (tab strip overflow, tooltips, reorder) and P98, and open-itens 153 (strip overflow, `.md` naming); schedule one of them first and rebase. The Close helpers have no dependency on B and could ship earlier as a separate S ticket if the owner wants the quick win.
- Acceptance criteria:
  1. Failing test first, `editor.service.test.ts`: `closeOtherTabs` with tabs [A, B, C, D] (B pinned, C dirty and saving fine, D dirty and the save failing with the "Close anyway" dialog declined) keeps B (pinned), D (declined) and the target; closes the rest, saves C first, and activates the target tab; by-path iteration is used (closing one tab does not make a later close hit the wrong tab).
  2. Failing test first: `closeTabsToTheRight` closes only tabs after the target, skips pinned ones, and leaves the active index valid when the active tab was to the right.
  3. Failing test first, `EditorTabs.test.ts`: a markdown tab's menu lists Pin tab, Close tab, Close others, Close to the right, then the shared group in the B order; "Close others" is disabled with one tab and "Close to the right" on the last tab; a pinned tab keeps only Unpin tab and the shared group (no Close items), as today. The existing `['Pin tab', 'Close tab']` assertion (`:143-149`) is updated, not deleted.
  4. Failing test first: a non-markdown tab (tasks, graph, tags, canvas, kanban) shows no shared note group; acting on a non-active markdown tab's Archive/Mark organized writes that tab's path, not the active one.
  5. `EditorTabs.svelte` imports nothing from `features/` or `plugins/` (`layer-rules.test.ts` stays at its baseline size).
  6. E2E: extend `tab-pinning.spec.ts`/`tabs.spec.ts` with Close others and Close to the right. Gate: frontend.

### D. "Move to..." with a folder picker (P39, optional)
- Size: M. Independent risky part: no folder picker exists; this is a new dialog.
- Files: new picker dialog (a command-dialog style list of vault folders using the finders-ux 01 dialog shell), a `moveNoteWithPicker(path)` service over `moveItem` (`fs.service.ts:304`, throws `TargetExistsError`), `note-actions.logic.ts`, the three menus and the palette.
- Blockers: B and C (adds one item to each surface); finders-ux 01 (resolved) for the dialog primitives. Not in the prototype's real behaviour (it toasts a stub). Do only if the owner wants it (question 5); until then the shared list omits Move.
- Acceptance criteria: failing test first for the folder filter/fuzzy list (pure) and for the move (fs mocked: target exists shows a toast and leaves the note); the open tab and the rail row follow the path change (`applyPathChange` owner); the picker excludes the note's current folder and system folders; palette and menus each get the item. Gate: frontend plus E2E for one move.

### E. Shared roving-list logic and a keyboard model for Search results (P24, Search half)
- Size: M.
- Files: new `src/lib/utils/roving-list.ts` (pure), `src/lib/features/tasks/tasks-keys.logic.ts` (delegates, same exports), `src/lib/features/search/SearchPanel.svelte`, `SearchResult.svelte`.
- Blockers: none in this cluster (finders-ux 03, 04, 05 already merged and edit the same files). Cross-cluster: none known.
- Acceptance criteria:
  1. Failing test first, `roving-list.test.ts`: arrows clamp, Home/End, repeat and modifier rules, `nextCurrentRow` and `tabStopRow` cases copied from the Tasks cases (they must pass for both modules); `tasks-keys.logic.test.ts` and `TasksView.keyboard.test.ts` pass unmodified.
  2. Failing test first, `SearchPanel.test.ts`: with results shown, ArrowDown in the input focuses the first result; ArrowUp on the first result returns to the input; ArrowDown/Up/Home/End move among results; exactly one result button has `tabindex=0`.
  3. Failing test first: Escape in the input with a non-empty query clears it (results gone); Escape with an empty query blurs and keeps Search shown (the existing `:153-158` assertion, unchanged).
  4. `e2e/specs/search.spec.ts:39-51` is rewritten for the new Escape rule only with the owner's approval (question 2): Escape clears the query, a second Escape leaves the input; the "another rail item closes Search" tail stays.
  5. Enter on a focused result opens the note exactly as a click does (existing `SearchResult.test.ts` stays green).
  6. Gate: frontend.

### F. Rail note list: one tab stop, arrow keys, focus that follows removals (P24, note list half)
- Size: L. Independent risky part: virtualization (`VList`, `keepMounted`, `scrollToIndex`).
- Files: `src/lib/features/rail-shell/RailNoteList.svelte` (both VLists, key handler, current-row state, focus effect), `RailListSearch.svelte` (`onArrowDown`), `src/lib/features/note-list/NoteRow.svelte` (`tabindex`, inline check tabindex, rename focus return), `NoteRowMenu.svelte`/`note-row-menu.context.ts` (rename commit re-points the current row), `src/lib/utils/roving-list.ts` (from E).
- Blockers: E (shared logic) and A (the check's tab stop). Cross-cluster: nl-header-creation (P33/P38/P84) and nl-empty-states (P29) edit `RailNoteList.svelte`; nl-rows-sections P120 (Today sections focus); sh-history-breadcrumb P35 (Cmd+Enter semantics, owner decision pending).
- Acceptance criteria:
  1. Failing test first, `RailNoteList.keyboard.test.ts` (real stores, virtua shim): with 40 notes exactly one `[data-note-row]` has `tabindex=0` (the first, or the current), all others `-1`; ArrowDown/ArrowUp move focus and the tab stop; End focuses the last note, which was unmounted before (it mounts and takes focus); Home returns.
  2. Failing test first: in the grouped Today list, arrows skip group headers and section components; the roving order equals the note rows only.
  3. Failing test first: Enter on a focused row calls `openFileInEditor` once (no double open); F2 starts rename; committing a rename re-points the current row to the new path and focus returns to that row; Escape in the rename input returns focus to the row.
  4. Failing test first: with the search bar open, ArrowDown in the input focuses the first row; ArrowUp on the first row returns to the input; Escape still closes and clears (existing `RailListSearch.test.ts:141-143` unchanged).
  5. Failing test first: when the focused row leaves the list (Inbox check clicked by keyboard, delete), focus moves to the neighbouring row only if it was on the removed row or inside the list; typing in the search box never moves focus.
  6. The Inbox check gets `tabindex=0` only on the tab-stop row; no Cmd+Enter binding is added (question 1).
  7. E2E: a keyboard spec (Tab into the list lands on one row, arrows move, Tab leaves the list); `focus-ring.spec.ts` and `rail-shell.spec.ts` stay green. Gate: frontend.

Recommended order: A, E (parallel, disjoint), B, F, C, then D if wanted.

## Overlapping Issues

Checked Status lines and `.scratch/open-itens/ledger.md` (the ledger still says `todo` for several items whose Status line is already `wontfix`; the Status line wins). `.scratch/open-itens` is abandoned: an unresolved overlap is REPLACED.

| Issue | Status | Verdict |
|---|---|---|
| `.scratch/open-itens/issues/220-search-panel-stops-repeating-index-status-status.md` | wontfix (ledger `todo`, stale) | Already replaced by finders-ux 04. Exclude. |
| `.scratch/open-itens/issues/057-clearing-search-box-while-search-still-running.md` | wontfix (ledger `todo`, stale) | Already replaced by finders-ux 05. Exclude. |
| `.scratch/open-itens/issues/012-tab-menu-right-tab-and-delete-confirm.md` | ready-for-agent | Different surface: the `.view` tab strip in `CollectionView.svelte:519-585` (it copies `EditorTabs`' per-tab `ContextMenu.Root` pattern). Not replaced by C. It owns the Delete view confirm. Exclude; C may reuse its menu pattern. |
| `.scratch/open-itens/issues/132-edit-view-from-anywhere.md` | ready-for-agent (blocked by 131) | Adds an "Edit view" item to `NoteRowMenu.svelte` (top group). Not replaced: it is a feature, not an action-split fix. Depend: B's list keeps a top group for such items; run 132 and B in series (same file and `NoteRowMenu.show-in-views.test.ts`). |
| `.scratch/open-itens/issues/028-duplicate-saves-note-s-unsaved-typing-before.md` and `029-...` | ready-for-agent | Duplicate behaviour in `NoteRowMenu.svelte:84-86` and its test; different action. Depend (same file as B): sequence, do not replace. |
| `.scratch/open-itens/issues/153-tab-strip-shows-overflow-hides-md-extension.md` | ready-for-agent | Overlaps P34 (sh-tabs), not P39: strip overflow and tab names in `EditorTabs.svelte`. Belongs to the sh-tabs cluster's replacement list. For C: same file, sequence. |
| `.scratch/open-itens/issues/140-view-tab-keyboard-and-labels.md`, `156-relationship-picker-navigates-arrow-keys.md` | ready-for-agent | Keyboard on other surfaces (`.view` tab, relationship picker). Not P24's note list or search. Exclude. |
| `.scratch/open-itens/issues/043-lens-lists-follow-user-s-own-rename.md`, `004`, `015` | resolved | Constraints, not overlaps: keep the prompt index refresh on row actions (043) and the dirty-tab save-then-close behaviour in Close others (015). |
| `.scratch/open-itens/issues/204-emptystate-inlinealert-badge-primitives-exist.md`, `205`, `207` | todo/ready | Primitives for other clusters (P29, P22). Exclude. |
| `.scratch/tasks-view-ux/issues/113-keyboard-and-a11y.md`, `255-...` | resolved | Dependency: E must keep `tasks-keys.logic.ts` behaviour and its tests (`tabStopRow`, `nextCurrentRow`) intact. |
| `.scratch/finders-ux/issues/04-search-panel-states-hints-labels.md`, `05-search-keeps-results-while-searching.md`, `03-search-result-cards-name-folder-plain-snippets.md` | resolved | Already merged; E builds on their SearchPanel markup (labels, `aria-busy`). |

No live issue mentions Close others, Close to the right, "Move to...", an inline Inbox check, or a roving note list.

## Owner questions (code cannot answer)

1. **Cmd+Enter in the lists (P24).** It would do exactly what Enter does today, and P35 holds the pending decision on replace-vs-new tab. Recommended default: build no Cmd+Enter now; revisit once P35 decides. The row menu keeps "Open in new tab".
2. **SearchPanel Escape.** Approve changing the rule so the first Escape clears a non-empty query and the second blurs, which means rewriting `e2e/specs/search.spec.ts:39-51` (a test change needs approval). Recommended default: yes, it matches the rail list search; the empty-query unit test stays as is. The rail list search keeps its current Escape (it already clears and closes).
3. **Inline check scope and shortcut.** Inbox lens only (recommended) or every row that renders italic (any unorganized note in any lens)? Also: no shortcut in the tooltip (recommended, since Cmd+E acts on the active tab, not the focused row), no success toast (recommended, matches Cmd+E; the prototype shows one).
4. **Palette labels.** Stable toggles ("Toggle Organized", "Toggle Archived", "Move Note to Trash") while menus show state-aware labels (recommended; a state-aware palette label would recompute the command list on every keystroke), or accept that cost? This is the one place P39's "same labels everywhere" is narrowed.
5. **"Move to...".** Include it (a new folder picker, ticket D) or leave it out of the shared list until the owner wants a picker? Recommended default: leave it out for now and ship D only on request; the prototype itself only stubs it.
6. **One Trash prompt text.** The row asks `Move "<note title>" to trash?` and the bar asks with the file name (`alpha.md`); the toast already uses the file name. Recommended default: file name everywhere (this changes the row's prompt text and its test).
7. **Hint bar.** Ship the prototype's key-hint bar in the rail list (extra row of chrome, shown while the list has focus)? Recommended default: no, add it later if keyboard users ask; the roving model does not depend on it.

## Not checked

- No test, build or app run (read-only). The index refresh latency after an organized flip is unmeasured, so "the row leaves at once" is the prototype's behaviour, not today's guarantee.
- jsdom with the virtua shim can mount rows, but scrolling to an unmounted row (End on 40 notes) was not exercised; if it proves flaky the F criterion 1 moves to E2E.
- Whether `keepMounted` plus `scrollToIndex` keeps the tab stop mounted across fast scrolls was read from the type definitions only.
- `e2e/specs/keyboard-shortcuts.spec.ts` was not read (may cover Cmd+E); the `focus-ring.spec.ts` Tab walk is expected to keep passing but is unconfirmed.
- The Files and Types trees, collection rows and `CollectionView` keyboard (the proposal's second step) were not read in depth.
- Other clusters' proposals (P22, P23, P33, P34, P35, P102 to P105, P117, P120) were read only as far as their review blocks to find shared files, not against code.
