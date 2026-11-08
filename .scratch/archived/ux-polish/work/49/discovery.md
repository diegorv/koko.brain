# Issue 49 discovery: note action bar trim

## Files that change

- `src/lib/features/note-action-bar/note-action-bar.logic.ts:92-120`: `BAR_RESERVED_WIDTH` 360 -> 960 and `foldActions(0)` folds all five (was: folds none).
- `src/lib/features/note-action-bar/NoteActionBar.svelte:124` `h-9` -> `h-10`; drop the sidebar toggle (`:221-230`) with `rightVisible`, `sidebarLabel`, `PanelRight`, `toggleRightSidebar`; add `mx-1 h-4 w-px bg-border` dividers: after the hub button (only when it shows), between Favorite/Organized and the Raw group, and before More.
- `src/lib/app/EditorView.svelte:130-143`: the generic floating `<>` renders only when `!isMarkdownNote` (the action bar's Raw covers Markdown notes); the canvas toggle (`:105`) moves from `bottom-3 right-3` to `top-3 right-3`, clear of the xyflow MiniMap (bottom-right by default, `CanvasInner.svelte:602`). Kanban and collection (`.view`) toggles stay bottom-right.
- `src/lib/app/AppShell.svelte:186-194`: unchanged; it stays the one sidebar toggle.

## Tests

- `src/tests/lib/features/note-action-bar/note-action-bar.logic.test.ts`: pin `BAR_RESERVED_WIDTH` (960), all five folded at 0 and at a typical ~600-990 px bar, unfold order unchanged (failing first).
- `src/tests/lib/features/note-action-bar/NoteActionBar.test.ts`: inline-button tests resize the bar wide first (`resizeBar` stub, prior art in the same file); default render lists all five in More; no right-sidebar button; bar has `h-10`.
- `src/tests/lib/app/EditorView.test.ts`: floating toggle absent on a `.md` tab, present on kanban, canvas and collection tabs; canvas toggle is `top-3`; the TOC test goes through More.
- `src/tests/lib/app/AppShell.test.ts`: one `button[title*="right sidebar"]` with a Markdown note open; bar and Properties header both `h-10`.
- E2E (not in the gate, updated to match): `e2e/specs/note-action-bar.spec.ts` (sidebar via the shell toggle, width / TOC / Copy path via More, fold test inverted), `e2e/specs/source-mode-toggle.spec.ts` (no floating toggle on a note), `e2e/specs/rail-shell.spec.ts:901` (Neighbourhood via More).

## Defaults taken (owner taste call per the Issue Notes)

- "Into More by default" keeps the width fold and raises the reserved width, the first option in `work/layout.md` R4: the five start in More at any bar under 992 px (the editor is about 600 px at 1440 with all panes open) and return one by one, in the existing order, from 992 px (all five at 1120 px). `foldActions(0)` folds all so there is no flash of inline buttons before the first measure.
- The view toggle means the collection tab (`.view` and `.collection` both map to `fileType: 'collection'`).
- Divider token stays `bg-border` as today; the `--divider` switch belongs to the `pane-toolbar` work.
- More menu contents and separators unchanged (P23 is separate).

## Risks

- A non-`.md` text file in the Markdown editor keeps the floating toggle (it has no action bar), as today.
- In canvas source mode the top-right toggle sits over the editor's top-right corner.
- E2E viewport widths for the unfold case are estimates until the spec runs.
