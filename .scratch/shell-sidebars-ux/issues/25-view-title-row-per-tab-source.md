# 25: Kanban, .view and canvas tabs get a title row with their own controls; source mode is per tab

**Origin:** design review 2026-11-17, proposal P18 (parts 2 and 3; counted here, part 1 is new 34), prototype `.scratch/design-review/prototypes/shell-tabs-navigation.html`, research `.scratch/shell-sidebars-ux/research/verdict-sh-view-headers-entry.md` (V1, V2) and `breakdown.md` (old tickets 31 and 32). Does not take open-itens 140's label bullet (new 16 owns it).

**What to build:**

1. **Title row.** Kanban, `.view` and canvas tabs get a row like a note's: `<kind> › <file name>`, the view's own controls, then a source-mode toggle at the end (`aria-pressed`, a state label, "(Cmd+\)" in its title, like the Raw button at `NoteActionBar.svelte:173-181`). New `src/lib/core/layout/ViewHeader.svelte`: the single `pane-toolbar` class list (no `flex-wrap`, `pane-toolbar.test.ts:30`), reads `editorStore.activeTab` for the name (`basename(path)`, so the extension shows until new 24's `stem` rule is shared), takes `kind` and a children snippet, calls the store setter. No new props on the three views.
2. **Kanban and `.view`.** `KanbanView.svelte` (`pane-toolbar` at `:462`) and `CollectionView.svelte` (`:516`) render `ViewHeader` around their controls; the four `.view` toolbar triggers move in as new 16 leaves them. The `.view` tab shows the row in its parse-error and "Building index..." branches too, so the user can reach source mode to repair the YAML.
3. **Canvas.** `CanvasInner.svelte` renders `ViewHeader kind="Canvas"` inside the `SvelteFlowProvider` above `.canvas-container` (`:602`; `fitView` comes from `useSvelteFlow()` at `:67`), with the five add buttons (text card, file, link, image, group; same callbacks, named by `aria-label` and `title`) in place of the vertical `CanvasToolbar` stack (`CanvasToolbar.svelte:44-46`, `bottom: 118px`; the call at `CanvasInner.svelte:689`). xyflow `Controls` and `MiniMap` stay (owner default 25.3). The header stays outside any future error branch, so open-itens 027's unparseable-canvas panel can call the same store setter.
4. **Floating toggles go.** In `EditorView.svelte` the kanban (`:96-108`), canvas (`:109-122`) and `.view` (`:123-135`) buttons are removed, with the local flags (`:30-35`) and the reset effect (`:47-53`). The text-file toggle (`:136-149`, flips `isLivePreview`) stays. In source mode, `EditorView` renders a row with the name and "Switch to board view" / "Switch to table view" / "Switch to canvas view" above `MarkdownEditor`.
5. **Per-tab state.** `sourceMode?: boolean` on `EditorTab` (`editor.types.ts`; not persisted, dropped with the tab by `removeTab`, follows `updateTabPath` since it mutates the same object, survives pin because `reorderTabsAfterPinChange` spreads the tab), a store setter and an `activeTabSourceMode` getter in `editor.store.svelte.ts`. Switching tabs keeps each tab's own mode.
6. **Cmd+\ routing.** `toggleSourceMode()` (`editor.service.ts:437-439`): on a kanban, canvas or `.view` tab it flips that tab's flag and leaves `isLivePreview`; on a Tasks, Tags, Graph or Calendar tab it does nothing; on a note it flips Raw as today. Today it flips the global flag everywhere, so Cmd+\ on a board makes the next note open in Raw.
7. No Favorite, Organized or Pin on these tabs (they write frontmatter).
8. Docs: `03-editor.md:51,72,85,107`, `12-views.md:188`, `11-canvas.md:108` (already stale: says bottom-right), `20-keyboard-shortcuts.md:30`; one amendment sentence in `docs/adr/0033-*.md` Consequences (`:102-103`): Cmd+\ also flips a view tab's source mode.

Not in this ticket: replacing xyflow `Controls` with header zoom buttons; Favorite, Organized and Pin on these tabs; the `.view` table-row keyboard and calendar halves of open-itens 140 (no owner in this batch, do not wontfix 140 whole).

**Blocked by:** 16

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` for `kanban-view.spec.ts` and `canvas-view.spec.ts`.

- [ ] Failing test first, `src/tests/lib/core/editor/editor.store.test.ts`: two kanban tabs, A's flag set: `activeTabSourceMode` is true while A is active and false on B; `updateTabPath` keeps it; `togglePin` keeps it; `removeTab` then re-adding gives false; `reset()` clears it.
- [ ] Failing test first, `editor.service.test.ts` (real `editorStore`): with a kanban, canvas or collection tab active, `toggleSourceMode()` flips only that tab's flag and leaves `isLivePreview` true; with a Tasks, Tags, Graph or Calendar tab it changes nothing; with a note it flips `isLivePreview` (the case at `:1086` stays green).
- [ ] Failing test first, `EditorView.test.ts` (real stores and views): kanban and `.view` tabs each render one `pane-toolbar` row with the file name and exactly one "Switch to source mode"; no `absolute` toggle remains for them; clicking shows `.cm-editor` under a row with "Switch to board view" (or "Switch to table view"); clicking returns. Replaces `:313-332`; the canvas case (`top-3`) is replaced by the header assertions below.
- [ ] Failing test first, new `src/tests/lib/features/canvas/CanvasHeader.test.ts` (real `CanvasView` with its provider, stubs as `canvas-tab-switch.test.ts`): one `pane-toolbar` row with the file name, the five add buttons by name and one "Switch to source mode"; no `.canvas-toolbar`; `CanvasToolbar.svelte` (if kept) has no `118px` and no `position: absolute`.
- [ ] "Add text card" adds a node to the real canvas state and calls `onJsonChange` with JSON holding it (assert the JSON, not only the call). Canvas source mode shows the row with "Switch to canvas view"; Cmd+\ flips it; the minimap and `Controls` still render.
- [ ] Regression: Cmd+\ on a board, then open a note: it opens in live preview (Raw `aria-pressed="false"`). Kanban A in source mode, switch to note B and back: A still in source mode, B not.
- [ ] A `.view` whose YAML does not parse, and one still building, show the row and the toggle reaches source mode.
- [ ] `CollectionView.test.ts` finds the four buttons by role and name (new 16's names unchanged); `CollectionView.view-writes`, `CollectionView.restored-view` and `KanbanView` tests stay green.
- [ ] `pane-toolbar.test.ts` lists `ViewHeader.svelte` in place of files that no longer carry a class list (the commit says why); `chrome-state-styles`, `chrome-type-scale` and `menu-item-anatomy` pass; E2E `kanban-view.spec.ts` and `canvas-view.spec.ts` pass.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P18.** Every view builds its own header, and kanban, canvas and `.view` tabs lack note chrome. (1) A `pane-band` utility for the 10 copies (new 34). (2) Kanban, canvas and collection tabs get a slim header in the existing `pane-toolbar` row with the title, view controls and source toggle, replacing the floating toggles and the canvas offset. (3) Cmd+\ toggles the active tab's own source mode. Favorite and pin stay off non-markdown files.

## Problem

The three tabs have no title. The source toggle sits in a different corner per file type and resets on every tab switch, and Cmd+\ flips only the markdown flag (the global `isLivePreview`), even on kanban and virtual tabs. The canvas add buttons float at a magic `bottom: 118px`.

## Evidence

Checked at `ab143a411`.

- `src/lib/app/EditorView.svelte:30-35` local flags, `:47-53` reset effect, `:96-135` the three floating toggles, `:136-149` the text-file toggle, `:154` the empty-branch band (new 26/34).
- `src/lib/core/editor/editor.service.ts:437-439` `toggleSourceMode` is one `setLivePreview` flip; `editor.store.svelte.ts:14` one global `isLivePreview`, reset only at `:169`. `editor.types.ts:2-15` `EditorTab` has no per-tab mode field.
- `src/lib/app/global-keybindings.ts:185-188` Cmd+\ binding (`toggleSourceMode`).
- `src/lib/plugins/kanban/KanbanView.svelte:462` and `src/lib/features/collection/CollectionView.svelte:516` carry their own `pane-toolbar`; canvas has no row (`CanvasInner.svelte:602`, `CanvasToolbar` call `:689`).
- `KanbanView` receives no `path` prop (mounted at `EditorView.svelte:81`), which is why the header reads the store.
- `NoteRowMenu.svelte:255-266` gates frontmatter writes on `isMarkdownFile`, and `.kanban` is its own extension (`fs.logic.ts:81-83`).

## Why blocked

- 16: Filters show their count and can be cleared; the .view tab's triggers are named single buttons; an empty table says filters hid its rows

## Sequence with

- `EditorView.svelte` and `EditorView.test.ts`: new 23 (fills `noteActions`), new 26 (empty branch `:154-157`, `hidesRightSidebar`), new 34 (`:154` band line).
- `editor.store.svelte.ts`, `editor.types.ts`, `editor.logic.ts`: new 22 (`moveTab`), new 31 (`history`; a reused tab object must clear `sourceMode`, which only non-markdown tabs set).
- `editor.service.ts`: new 23 (bulk closes), new 31 (loader, close path).
- `CollectionView.svelte` and `CanvasInner.svelte`: new 16 (blocker), open-itens 027 (error panel) and 196 (its `CanvasToolbar.svelte:55` item disappears here).
- `help/documentation/03-editor.md`: new 21, 22, 23, 24, 27, 31, 32, 33; `docs/adr/0033-*.md`.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: none explicit for this ticket. Defaults (not individually answered): 25.1 (old 31.1) source mode per tab, not reset on every switch; 25.2 (old 31.2) the title shows the file name with its extension until new 24's `stem` rule is shared; 25.3 (old 32.1) keep xyflow `Controls` (zoom, lock) and move only the add buttons.
