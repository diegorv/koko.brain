# 26: The empty editor becomes a launch point and drops the empty right sidebar

**Origin:** design review 2026-11-17, proposal P97 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/shell-tabs-navigation.html` (P97 section), research `.scratch/shell-sidebars-ux/research/verdict-sh-empty-zoom-status.md` (its T1) and `.scratch/shell-sidebars-ux/research/breakdown.md` (old ticket 13, now this one). No open-itens Issue is absorbed (`154-inline-title` edits the note branch of `EditorView.svelte`, not the empty branch).

**What to build:**

1. **Launch point.** With no tab open the editor shows "No note open" and "Pick one of these to start", then three rows: Quick switcher (Cmd+O), Command palette (Cmd+P), New note (Cmd+N). The New note row has `title` "Create a Quick Capture note", because Cmd+N is Quick Capture (`commands.ts:365-369`, it writes to `_notes/YYYY/MM-MMM`, not to the lens folder). A failed create shows `toast.error(...)` and logs with `error('EMPTY-EDITOR', ...)`. No recent-notes card. It replaces the single "Select a file to view its contents" line (`src/lib/app/EditorView.svelte:156`); the drag strip (`:154`) and `bg-editor-empty-bg` stay.
2. **No empty sidebar.** With no tab open the right sidebar and its toggle are not shown (today it shows "No file open", `PropertiesView.svelte:157-158`). Cmd+B and the palette toggle do nothing then, as on canvas or Tasks tabs. The saved `rightSidebarVisible` is untouched, so opening a note brings the sidebar back.
3. **Non-markdown text tabs (26.2).** A `.txt` or `.json` tab also hides the sidebar, using `isMarkdownFile` (`fs.logic.ts:65-67`, accepts `.md` and `.markdown`) and not `isMarkdownNoteTab`, so `.markdown` notes keep it. Those tabs get the full note panels today because `editor.service.ts:186-189` leaves `fileType` undefined for them.
4. **Code.**
   - `hidesRightSidebar(null)` returns true (`src/lib/core/layout/layout.logic.ts:24`); its JSDoc (`:22`) becomes "the tab at `activeTabPath`, or no tab"; update the comments at `layout.service.ts:24-29` and `AppShell.svelte:188`.
   - New `src/lib/app/EmptyEditorHint.svelte` (composition root, so no layer-baseline entry): `quickSwitcherStore.open()`, `commandPaletteStore.open()`, `createNoteComposer()` (`plugins/quick-capture/note-composer.service.ts:20`); each row shows `formatShortcut(shortcutFor(id))`.
   - Add `command: 'command-palette:toggle'` to the Cmd+P binding (`global-keybindings.ts:63-67`) so `shortcutFor` finds it, and widen the `command` field JSDoc (`:54`, "Id of the palette command"), since that id is not a palette command.
5. **Help:** `26-theming.md:168` (the "Select a file to view its contents" copy), `07-sidebar-panels.md:13` (one sentence: the sidebar and its toggle hide with no note open and on canvas, kanban, `.view`, Tags, Tasks, Graph and Calendar tabs), `03-editor.md:66`; `16-table-of-contents.md:41-43` (the now unreachable "Not available" paragraph).

Not in this ticket: a recent-notes card; the Claude chat panel on `mvp-claude` (26.1); clickable or restyled empty states elsewhere (12, and the feedback-components group).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh editor-empty-state.spec.ts sidebars.spec.ts`

- [ ] Failing test first, `src/tests/lib/core/layout/layout.logic.test.ts`: `isRightSidebarShown(true, null)` and `isRightSidebarShown(false, null)` are both false. This replaces "follows the setting when no tab is open" (`:48-51`) on purpose; the commit says the contract is flipped.
- [ ] `layout.service.test.ts`: `toggleRightSidebar()` with no tab writes nothing (modelled on the Calendar case, `:164`); the toggle tests at `:140-161` and `commands.test.ts:513-525` add a note tab first and still pass.
- [ ] `AppShell.test.ts`: with no tab and `rightSidebarVisible: true` there is no `[data-right-sidebar]` and no "Hide right sidebar" button; adding a note tab brings both back with the setting still true. The tab-less test at `:211-218` adds a note tab.
- [ ] `global-keybindings.test.ts`: `shortcutFor('command-palette:toggle')` equals `{ key: 'p', meta: true }` (it throws today); the "registers all 25 fixed global keybindings" count (`:142`) is unchanged.
- [ ] New `src/tests/lib/app/EmptyEditorHint.test.ts` (real `quickSwitcherStore` and `commandPaletteStore`; only `note-composer.service.js` mocked): the heading and three named buttons with their shortcuts; clicks set the two stores' `isOpen` and call `createNoteComposer` once; a rejection does not throw and toasts.
- [ ] `EditorView.test.ts`: no tab mounts the hint and "Select a file to view its contents" is absent; a note tab has no hint.
- [ ] Failing test first, `layout.logic.test.ts`: `/vault/a.txt` and `/vault/a.collection` hide the sidebar whatever the setting (replacing the case at `:39-42` on purpose); `.markdown`, `.md` and `/vault/board.kanban/note.md` follow the setting.
- [ ] E2E `editor-empty-state.spec.ts`: after closing all tabs the three rows show their shortcuts and `[data-right-sidebar]` has count 0; Quick switcher opens the dialog; opening `Welcome.md` removes the hint and shows the sidebar. The existing "Select a file to view its contents" assertions (`:24,29,32`) become the new heading. `sidebars.spec.ts` "Default pane sizes" (`:86-104`) stays green: the right pane now mounts after the deferred daily note at every launch.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P97.** The empty editor is a dead end beside empty sidebar chrome. `hidesRightSidebar(null)` returns true, and the one line is replaced by a short hint listing Quick switcher, Command palette and New note with their shortcuts. Validation: revise; no recent-notes card.

## Problem

An empty editor shows one line of grey text while the right sidebar beside it shows "No file open" and three panel headers. The idle state offers no next step, and the sidebar is chrome for nothing.

## Evidence

Checked at `ab143a411`.

- `src/lib/app/EditorView.svelte:153-158`: a 40 px drag strip and one `<p>` "Select a file to view its contents".
- `src/lib/core/layout/layout.logic.ts:23-28`: `hidesRightSidebar(null)` is false, so `isRightSidebarShown(true, null)` is true; `AppShell.svelte:265` (`rightSidebarShown`) mounts the sidebar and `PropertiesView.svelte:157-158` prints "No file open". The toggle at `AppShell.svelte:189-192` also shows.
- `src/lib/core/layout/layout.service.ts:24-29` `toggleRightSidebar` returns early only for the tabs `hidesRightSidebar` covers.
- `src/lib/app/global-keybindings.ts:54` the `command` JSDoc; `:63-67` the Cmd+P binding has no `command`; Cmd+O has `command: 'quick-switcher:open'` (`:69`).
- `src/lib/core/editor/editor.service.ts:186-189` `fileType` stays undefined for `.txt` and `.json`.
- `e2e/specs/editor-empty-state.spec.ts:24,29,32` assert the old line; `help/documentation/26-theming.md:168`, `07-sidebar-panels.md:13`, `03-editor.md:66`, `16-table-of-contents.md:41-43`.

## Sequence with

- `layout.logic.ts` and `layout.service.ts` (and their tests): 01 (adds `setRightPanelVisible` to `layout.service.ts`), 05 (adds `anyRightPanelVisible` to `layout.logic.ts`). Both edit the files this ticket rewrites in `hidesRightSidebar` and `toggleRightSidebar`.
- `EditorView.svelte` and `EditorView.test.ts`: 23 (fills the new `noteActions` snippet), 25 (removes the floating toggles and local flags), 34 (the `h-10` band at `:154`; 34 is blocked by this ticket). This ticket edits only the empty branch (`:153-158`).
- `AppShell.svelte` and `AppShell.test.ts` (`:269-285` sections test): 05, 09, 21, 34. This ticket edits the `:188` comment and relies on `rightSidebarShown` (`:265`).
- 21 (tab strip): its toggle reserve in `EditorTabs.svelte` reads `hidesRightSidebar`; with no tab the toggle is now absent, so the empty band needs no reserve.
- `global-keybindings.ts` and its count pin (`:142`): 28 (moves it to 26), 30, 32.
- `help/documentation/07-sidebar-panels.md`: 01, 04, 05, 06, 07, 09, 10. `03-editor.md`: 15, 21, 22, 23, 24, 25, 27, 31, 32, 33. `16-table-of-contents.md`: 08.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: the 34-ticket consolidation (this ticket keeps its old scope). Defaults (not individually answered): 26.1 the Claude chat on `mvp-claude` lives in the same sidebar, so it also hides with no tab open once main is merged there; ship on main as written and, at that merge, show the sidebar whenever the Claude panel is visible (`claudePanelShown || isRightSidebarShown(...)`) (breakdown.md question 13.1); 26.2 hide the sidebar for non-markdown text files such as `.txt` and `.json`, using `isMarkdownFile` (breakdown.md question 13.2); 26.3 with no tab, Cmd+B, the palette toggle and the toggle button do nothing, as on Tasks and Graph tabs (breakdown.md question 13.3).
