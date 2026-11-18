# Design review: Canvas (src/lib/features/canvas)

Evidence: canvas-view-light.png (only canvas screenshot, light theme, no dark), code read at HEAD f2cd7f97b, inventory-canvas.md. Findings marked "code only" were not seen rendered.

## Clear

1. File cards render the note's frontmatter as a giant heading (clear, content, S)
- FileNode.svelte:82-83 passes the raw file to renderCanvasMarkdown; `---\n_type: Meeting\n---` parses as hr + Setext h2. canvas-view-light.png: the "2026-11-09 Design sync.md" card shows "_type: Meeting" as its main content and hides the real note body. Every typed note in this vault has frontmatter, so every file card looks like this.
- `stripFrontmatter` already exists (embed-resolver.logic.ts:53) and live-preview note embeds use it.
- Proposal: strip frontmatter before rendering, show the first body lines (or a heading) in the preview.

2. Canvas surface is nearly invisible in the light theme (clear, color-theming, S)
- CanvasInner.svelte:758-775 sets `--xy-edge-stroke: rgba(255,255,255,.3)`, `--xy-background-pattern-color: rgba(255,255,255,.05)`, `--xy-node-border-color: rgba(255,255,255,.15)`, minimap mask `rgba(0,0,0,.6)`. canvas-view-light.png: edges are faint light lines (only the "leads to" label chip reads), no dot grid at all, and the minimap is a heavy dark slab with washed-out nodes. The comment on :757 says "dark mode".
- Proposal: derive these from `--border`/`--foreground` alpha (color-mix) so they work in both themes; lighter minimap mask; selected edge keeps `--primary`.

3. Corrupt or half-edited JSON looks like an empty board and the next action overwrites the file (clear, feedback-states, M)
- canvas.logic.ts:40-48 `parseCanvas` returns an empty canvas on any parse error; CanvasInner.svelte:603 shows the same "+ Add card" hint. EditorView.svelte:109-118 offers a source-mode toggle, so invalid JSON is reachable. Any later add/move persists (CanvasInner.svelte:120-132) and replaces the broken text.
- Proposal: keep a `parseError` state; show an inline banner "This canvas file is not valid JSON. Open source mode to fix it." with a source-mode button, and block persisting until the JSON parses.

4. Groups and edges cannot be labelled from the UI (clear, information-architecture, M)
- GroupNode.svelte:21-23 only renders `data.label`; createGroupNode is always called with '' (CanvasInner.svelte:550, :653). CanvasContextMenu.svelte:150-154 "Edit label" never renders because CanvasInner.svelte:635-686 never passes `oneditlabel` (likewise `onopenfile`, `onopenurl`). help/documentation/11-canvas.md says labels are set only in source mode. canvas-view-light.png: the "Research" group label is 12px muted text; "leads to" exists only because the fixture JSON has it.
- A mind map or brainstorm board (the documented use) needs named groups and labelled arrows.
- Proposal: double-click a group header or edge label to edit inline (same pattern as TextNode); add "Rename" on the group menu and "Edit label" on edges (wire the existing prop); give group labels a header chip (13px, foreground) instead of the 12px muted text above the frame; remove dead props or wire them.

5. Context menu has no keyboard or screen-reader support and does not close on Escape (clear, accessibility, M)
- CanvasContextMenu.svelte:88-95: plain div, no `role="menu"`, items without `role="menuitem"`, no focus on open, no arrow keys; Escape only clears selection (CanvasInner.svelte:271-274); menu closes on pointerdown only (:625-626). Kanban cards and tabs already use shadcn ContextMenu (KanbanCard.svelte:17, :154) which provides all of this.
- Proposal: move the three menus onto `components/ui/context-menu` (positioned at the pointer via a virtual trigger or controlled open), or add role/focus/arrow/Escape handling; ColorPicker dots become a `role="radiogroup"` with `aria-checked` and real color names.

6. Add actions are icon-only with no accessible name, no labels and no shortcuts (clear, accessibility, S)
- CanvasToolbar.svelte:25-39: five 28px buttons with `title` only; icons Type, FileText, ExternalLink, Image, Square (Square = group is not guessable; ExternalLink = link). No `aria-label`, no `role="toolbar"`. Compare the neighbouring source toggle (EditorView.svelte:110-115) which has aria-label and a focus-visible ring. Docs call them "Text", "File", "Link" buttons, which they are not. Position is a magic `bottom: 118px` (CanvasToolbar.svelte:45) tuned to xyflow Controls, so it detaches if Controls change height. In canvas-view-light.png the stack sits flush on the zoom controls and reads as one confusing 9-button column.
- Proposal: add aria-label to all five, use the app tooltip component with shortcut hints, give the group a visible gap and a divider from zoom controls, and anchor it in a flex container with Controls instead of a pixel offset. Consider a labelled "Add" popover if shortcuts are not added.

## Moderate

7. File picker and link dialog are hand-built modals (moderate, consistency, M)
- CanvasFilePicker.svelte:48-71 and CanvasLinkInput.svelte:48-71: no `role="dialog"`/`aria-modal`, no focus trap or restore, no arrow-key navigation (only the input is focusable, results need Tab), inputs without labels, `outline: none` on the picker input (:107). Picker shows 20 rows max (`slice(0, 20)`, :61) with no "more" hint, and "No files found" appears while the tree loads (:66). TemplatePicker uses `Command.Dialog` (TemplatePicker.svelte:65-113) with up/down/enter.
- Proposal: rebuild both on `components/ui/command` and `components/ui/dialog`; the picker gets arrow navigation, a count/"showing 20 of N" row, and an empty state that distinguishes "no notes" from "no match".

8. New cards are not ready to type into, stack on each other, and are placed inconsistently (moderate, interaction, S)
- addTextCard (CanvasInner.svelte:482-488), edge-drop (:523-545) and menu "Add text card" create `text: ''` cards that show the placeholder "Double-click to edit" (TextNode.svelte:76); nothing sets `editing` or `selected`. Toolbar adds always land at the same viewport-center coordinates (:474-479, :498, :507, :516), so a second click hides under the first. In the pane menu, text and group use the click position (:644-654) but note/link/image use viewport center (:496-520).
- Proposal: new text cards start in edit mode (the `editing` flag already exists, TextNode.svelte:20-25) and are selected; menu-invoked adds remember the click position through the picker; repeated toolbar adds cascade by 20-30px.

9. Single click on a file or link header acts immediately, and the open affordance is hidden (moderate, interaction, S)
- FileNode.svelte:66 / LinkNode.svelte:118 header buttons run `openFileInEditor` / `openUrl` on click. The header is the natural place to grab a card, so selecting or starting a drag from the title risks navigating away or launching the browser. The open icon is `opacity: 0` until header hover (FileNode.svelte:134-142); failures to open a URL are swallowed (LinkNode.svelte:84-86).
- Proposal: first click selects; open on Cmd+click, double-click, or the explicit icon (always visible at low contrast); show a toast when the URL cannot open.

10. Text-card editing is hard to enter and hard to use (moderate, interaction, M)
- Entry is only double-click (TextNode.svelte:59) or context menu; a keyboard-selected card cannot be edited with Enter. In edit mode the textarea has `min-height: 40px`, no height:100%, `resize: vertical` (TextNode.svelte:112-125) inside a card that has its own resizer, and `outline: none` with no replacement focus style, so edit mode is only distinguishable by the placeholder. A non-empty card gives no hint it is editable or that markdown works.
- Proposal: Enter (or F2) on a selected card starts editing; textarea fills the card (height 100%, resize none), card gets a primary ring while editing; Cmd+Enter or Escape to finish, shown in a small hint on first edit.

11. Connection handles are hidden until hover and only 8px (moderate, interaction, S)
- CanvasInner.svelte:807-816: `opacity: 0` unless `.svelte-flow__node:hover`, 8px size; text/file/link nodes carry 8 handles (source+target on each side, TextNode.svelte:81-88) which overlap pairwise. Connecting is the core action of a canvas, and nothing indicates it until the pointer is over a card.
- Proposal: show handles on selected nodes too, give each side a ~16px hit area with the 8px dot centered, and use one handle per side (connectionMode loose) to remove the stacked pair.

12. Overlay chrome is hard-coded for dark and invisible in light (moderate, color-theming, M, code only)
- White-alpha literals drive menu hover (CanvasContextMenu.svelte:182-211), separators, picker item hover (CanvasFilePicker.svelte:134), link dialog input fill and border (CanvasLinkInput.svelte:108-109), link edit inputs (LinkNode.svelte:199-200), the empty-state button border/fill (CanvasInner.svelte:743-744), color-dot "none" fill (ColorPicker.svelte:69), group default style (canvas.logic.ts:149-151), node border `rgba(255,255,255,.15)` in five node files. On the light theme these are white on white: menu rows will show no hover, the empty "+ Add card" button has no visible border. Node tint uses `${hex}20` string suffix (TextNode.svelte:57 etc.) which breaks for any non-6-digit color.
- Proposal: replace with `--border`, `--accent`/`--muted` and `color-mix(in oklab, var(--foreground) 15%, transparent)`; use `color-mix` for node tints. Verify in light and dark.

13. File and image cards: status is missing or stale (moderate, feedback-states, M)
- FileNode loads once per `data.file` (FileNode.svelte:30-52): editing the note elsewhere does not refresh the card, and "Could not load file" (:81) names no file and offers no action. ImageNode shows the same icon+path placeholder for loading and error (ImageNode.svelte:54), uses `alt={data.file}` (:60) and `object-fit: cover` (:100) which crops photos when a card is resized.
- Proposal: refresh the preview when the file changes (reuse the vault watcher/mtime events), error state "Note not found: <name>" with Open and Remove-card actions, image skeleton while loading vs a distinct "Image not found" error, `object-fit: contain` (or a toggle).

14. Shortcut and copy drift (moderate, content-copy, S)
- CanvasContextMenu.svelte:115 shows `Ctrl+A` while the handler accepts Cmd or Ctrl (CanvasInner.svelte:269); app has `formatShortcut` (utils/keybindings.ts:40) that prints macOS glyphs. Shift+2, Delete, Cmd+Z/Shift+Cmd+Z have no visible hint or menu item anywhere. Naming is mixed: "+ Add card" (CanvasInner.svelte:606), "Add text card", "Add note from vault", "Create group", "Search vault files..." for a list that holds only `.md`.
- Proposal: use formatShortcut for all hints; list Delete, Undo, Redo, Zoom to selection; one noun set (Text card / Note / Link / Image / Group) with verb "Add" everywhere; picker placeholder "Search notes...".

## Polish

15. Opening a canvas may mark it modified (polish, feedback-states, S)
- canvas-view-light.png: tab dirty dot and status-bar "Modified" right after open. The capture fixture is 2-space JSON (zz-design-capture.spec.ts:261-279) while serializeCanvas writes tabs (canvas.logic.ts:54-56), and persist has no equality check (CanvasInner.svelte:120-126), so any first persist differs. Not verified whether a tab-indented file also triggers it (xyflow may write measured sizes back through `bind:nodes`, which would also arm the debounce effect at :229-243).
- Proposal: skip persist when the serialized result equals the canonical serialization of the original, so merely viewing never rewrites or dirties a file.

## Not covered

No dark-theme canvas screenshot, no screenshot of the menu, pickers, selected state or edit state. xyflow's own Controls/MiniMap accessibility was not inspected. Library "Svelte Flow" attribution at bottom-right under the minimap (canvas-view-light.png) is a library credit; removing it is a licensing decision for the owner, so it is not proposed here.
