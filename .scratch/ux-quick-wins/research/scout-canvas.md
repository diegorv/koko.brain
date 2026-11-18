# Scout: canvas slice (P12 P13 P07 P31 P133 P134 P135 P95 P136 P137)

Checked at HEAD 085b23c5d, all file:line refs are at that commit. Read-only research. `git diff --stat origin/main...origin/mvp-claude` touches no file in `src/lib/features/canvas/`, `src/lib/utils/keybindings.ts`, `NoteActionBar.svelte`, `SettingsPanel.svelte` or `help/documentation/11-canvas.md` (it does touch `src/lib/app/global-keybindings.ts` and `help/documentation/20-keyboard-shortcuts.md`, which no ticket below edits). No proposal in this slice is DONE or DROP: the screenshot `screens/canvas-view-light.png` and the code both confirm the problems.

Existing test seams in `src/tests/lib/features/canvas/`: `canvas.logic.test.ts` (pure), `canvas-markdown-css.test.ts` (source assertions on CSS, jsdom applies no CSS), `canvas-tab-switch.test.ts` (mounts the real `EditorView` + SvelteFlow in jsdom with fake timers, mocks only Tauri fs/core/event/dialog; 4 to 7 s first mount, `{ timeout: 20_000 }`). New component tests copy that harness.

## Summary table

| id | call | size | one-line reason |
|----|------|------|-----------------|
| P12 | QUICK-PART | S-M (mechanical, 13 files) | Swap white/black alpha literals for `color-mix` on theme tokens in the canvas chrome; leave node-tint hex suffix and shadows out. Same as open-itens 195 + 196 |
| P13 | QUICK-PART | S-M | Rename (group) and Edit label (edge) from the context menu with an inline input, 13 px group label; no dblclick, no "Add label" chip |
| P07 | DEFER | M | Changes the .canvas persist path (refuse-to-save guard) on a daily-use file; owner decision exists in open-itens 027, keep it there |
| P31 | QUICK-PART | S-M | Menu roles, roving focus, Escape/Tab close, focus restore, picker dialog roles and "Showing 20 of N"; the bits-ui rebuild and the Settings half are out |
| P133 | QUICK | S | New text card selected and in edit mode, cascading placement for repeated adds, pure helper plus transient `editing` strip |
| P134 | QUICK | S | Header click selects, Cmd/Ctrl+click or an always-visible icon opens, toast on bad URL, wire menu Open items, help doc line |
| P135 | QUICK | S | Enter or F2 on a selected text card starts editing, textarea fills the card with a focus ring; return focus to the node on Escape |
| P95 | QUICK-PART | S | Canvas menu hints through `formatShortcut`, Delete hints, NoteActionBar tooltips; new Undo/Redo/zoom-to-selection menu items are out |
| P136 | QUICK | S | Handles visible on selected nodes, 16 px hit area via pseudo-element, ImageNode gets the same 8 handles as the other nodes |
| P137 | QUICK-PART | S | ImageNode loading skeleton, "Image not found" state, basename alt, `object-fit: contain`; FileNode reload-on-index-change is out |

## Per-proposal detail

### P12. Canvas colours are dark-only

Call: QUICK-PART. Size S-M but purely mechanical.

HEAD check: still present. `CanvasInner.svelte:743-775` hard-codes `rgba(255,255,255,A)` for `--xy-node-border-color`, `--xy-edge-stroke` (0.3), `--xy-controls-button-border-color`, `--xy-background-pattern-color` (0.05) and `--xy-minimap-mask-background-color: rgba(0,0,0,0.6)`; `.add-card-btn` at 740-755. Overlay chrome: `CanvasContextMenu.svelte:183,206,210-212,231`, `CanvasFilePicker.svelte:91,103,135`, `CanvasLinkInput.svelte:91,108,110,151`, `CanvasEdge.svelte:66-67,72`, `ColorPicker.svelte:61,69`, `CanvasToolbar.svelte:55`, node chrome `FileNode.svelte:102,131,160`, `TextNode.svelte:94`, `LinkNode.svelte:140,166,199,201`, `ImageNode.svelte:71`, `GroupNode.svelte:31-32`. `color-mix` is already used in the repo (`TableOfContentsPanel.svelte`, `callout.ts`), `html.dark` is the theme switch (`src/app.css:8`), `--foreground`, `--background`, `--destructive` exist in both themes.

Slice (the quick part): every white-alpha literal in the canvas chrome becomes `color-mix(in oklab, var(--foreground) A%, transparent)`; minimap mask becomes `color-mix(in oklab, var(--background) 60%, transparent)`; the private danger red (`#fb464c`) in the context menu becomes `var(--destructive)`; drop the dead fallbacks `var(--card, #2a2e3d)`, `var(--foreground, #fff)`; reword the comment "Override Svelte Flow theme for dark mode". Default dark keeps its look (foreground is near-white).

Out of the slice: node-tint hex suffix (`${bgColor}20`, TextNode:57, GroupNode:18-33) stays (the screenshot shows tints read fine); box-shadows and scrims stay (elevation-token cluster); `canvas.logic.ts:149-151` `buildGroupStyle` is dead for rendering (`CanvasInner.svelte:777-785` forces `background: transparent !important; border: none !important` on `.svelte-flow__node`, and `GroupNode` draws its own surface), so skip it unless the guard test needs it.

Files: the 13 `.svelte` files above (all in `src/lib/features/canvas/`). New `src/tests/lib/features/canvas/canvas-theme-colors.test.ts`.
Test seam: source assertions with comments stripped, like `canvas-markdown-css.test.ts` (no mocks). Weakness: a test cannot prove legibility, so the by-eye check in Lavender Haze and Default is an acceptance item.
Acceptance:
1. Failing test first: `canvas-theme-colors.test.ts` scans each `.svelte` in the folder; fails on `rgba(255` and on `#fb464c`, and allows `rgba(0` only inside `box-shadow` declarations and the two scrim backgrounds (`CanvasFilePicker.svelte:81`, `CanvasLinkInput.svelte:81`). It fails today.
2. The `--xy-*` block in `CanvasInner.svelte` reads `var(--foreground)` / `var(--background)` through `color-mix`; the minimap mask no longer uses `rgba(0, 0, 0, 0.6)`.
3. The context-menu danger item reads `--destructive` in both themes.
4. Node and menu shadows are byte-identical to HEAD (diff shows no shadow line changed).
5. `pnpm check` + `pnpm vitest run`; commit body records the by-eye check of Default and Lavender Haze on a real `.canvas` (edges, grid, minimap, menu hover visible).

### P13. Canvas groups and edges cannot be labelled from the UI

Call: QUICK-PART. Size S-M, largest of the QUICK candidates here; the lead may move it to the later wave.

HEAD check: still present. `createGroupNode(..., '')` (canvas.logic.ts:~330, CanvasInner:548-553 and 651-654) makes an empty label; `GroupNode.svelte:21-23` renders the label only when non-empty, 12 px muted at `:36-44`. `CanvasContextMenu.svelte:150-154` renders "Edit label" only when `oneditlabel` is passed, and `CanvasInner.svelte:635-686` never passes it (nor `onopenfile`/`onopenurl`, 127-136). `CanvasEdge.svelte:41-45` shows a label but nothing edits it; `help/documentation/11-canvas.md:69` says labels need Source Mode.
Persistence is already safe: `flowNodeToCanvasNode` writes `label` from node data (canvas.logic.ts:206) and `flowEdgeToCanvasEdge` writes `label` from the flow edge (canvas.logic.ts:232), so no schema or persist-path change.

Slice: (a) a "Rename" item on the group node menu and "Edit label" on the edge menu (pass `oneditlabel` from CanvasInner); (b) inline input in `GroupNode` and `CanvasEdge`, started with the same `data.editing` trigger pattern that `TextNode.svelte:20-25` already uses (edges via `updateEdgeData`); Enter saves, Escape cancels, empty clears; (c) group label 13 px in `--foreground` at reduced opacity instead of 12 px muted; (d) remove the dead `onopenfile`/`onopenurl` props or wire them (P134 wires them, see there).
Out of slice: double-click on the label chip, the "Add label" chip on unlabelled edges, restyling the header into a chip (design decision), starting rename automatically on group creation (optional, one line).
Files: `GroupNode.svelte`, `CanvasEdge.svelte`, `CanvasContextMenu.svelte`, `CanvasInner.svelte`, `help/documentation/11-canvas.md:69` (the "Labels" line becomes wrong).
Test seam: mount `EditorView` as in `canvas-tab-switch.test.ts` with a group and an edge, drive the menu with real events, assert the written `.canvas` JSON (`writeTextFile` mock is the Tauri boundary).
Acceptance:
1. Failing test first: right-click a group, choose Rename, type "Research", Enter, advance the debounce; the written JSON has `label: "Research"` on that group. Fails today (no Rename item).
2. Same for an edge: Edit label then Enter writes `label` on the edge; clearing it removes the `label` key.
3. Escape cancels without writing; a blur saves like TextNode does.
4. The "Edit label" item appears on the edge menu and "Rename" on the group menu only (not on file/image nodes).
5. The `editing` flag never reaches the saved JSON (see P133 acceptance 4).
6. `pnpm check` + `pnpm vitest run`; help doc line updated.

### P07. A corrupt or half-edited canvas JSON shows as an empty board

Call: DEFER. Size M.

HEAD check: still present. `canvas.logic.ts:36-49` `parseCanvas` returns an empty canvas on any failure; `CanvasInner.svelte:99-114` syncs it and `persistWithoutHistory` (120-126) writes over the file on the first edit. Test `canvas.logic.test.ts` pins the silent-empty contract.
Why DEFER: the fix is a guard on the .canvas write path (persistChanges, persistWithoutHistory, 300 ms debounce, flusher, onDestroy, undo/redo) on the file the owner uses daily, plus a new result type that changes `parseCanvas` callers and its existing tests, plus an empty-string edge (a zero-byte or whitespace-only file must still open as an empty board, not as an error). It removes writes rather than adding them, so blast radius is low, but it is the one data-safety item in this slice and wants its own reviewed ticket. The owner already decided the design in open-itens 027 (D1 a: read-only error panel, never call `onJsonChange` while unparseable; ADR 0029 precedent). Note the review's "Open source mode" button needs `canvasSourceMode` state that lives in `EditorView.svelte:109-118`, a cross-component wiring; a text-only banner pointing at the existing top-right source toggle avoids that. 027 is blocked by 026 (clearing colour/title) which is still todo.
Overlap: open-itens 027 stays live, it is not replaced.

### P31. Hand-built overlays do not move, trap or restore focus

Call: QUICK-PART. Size S-M.

HEAD check: still present. `CanvasContextMenu.svelte:87-99` is a plain `div` of `button`s: no `role`, no arrow keys, nothing takes focus on open, and Escape never reaches it (`CanvasInner.svelte:271-274` only deselects). `CanvasFilePicker.svelte:50-71` and `CanvasLinkInput.svelte:50-71` have `onkeydown` Escape but no `role="dialog"`/`aria-modal`/labelled input, no focus restore, and the picker silently slices to 20 (`:60`).
Why not the full proposal: moving pane/node/edge menus onto bits-ui ContextMenu is M and not a drop-in (the shadcn `context-menu` in `src/lib/components/ui/context-menu/` is trigger-based, while the canvas opens menus from xyflow events with a target id), and the picker/link rebuild on Command/Dialog is M. Both DEFER.
Slice: (a) menu container `role="menu"`, items `role="menuitem"`, focus the first item on open (rAF), ArrowUp/ArrowDown/Home/End roving, Escape closes and stops propagation, Tab closes, focus returns to the element focused before opening; (b) picker and link input: `role="dialog"` `aria-modal="true"` `aria-label`, labelled inputs, focus restore on close; (c) picker shows "Showing 20 of N" when `filtered.length > 20`.
Settings half (`SettingsPanel.svelte:104-112` window Escape without a `defaultPrevented` guard, no focus move) is outside the canvas and not verified here (whether bits-ui selects call `preventDefault` on Escape is unchecked); route it to whichever settings ticket edits `src/lib/app/SettingsPanel.svelte`.
Files: `CanvasContextMenu.svelte`, `CanvasFilePicker.svelte`, `CanvasLinkInput.svelte`.
Test seam: mount `CanvasContextMenu` or the full canvas in jsdom; real events; no mocks beyond the existing Tauri stubs.
Acceptance:
1. Failing test first: open the pane menu, assert `role="menu"`, first item focused; ArrowDown moves focus to the second; Escape removes the menu and returns focus to the previously focused element. Fails today.
2. Home/End and ArrowUp wrap or clamp as chosen and are asserted.
3. File picker with 25 matching files renders "Showing 20 of 25"; with 5 files renders no count.
4. File picker and link input expose `role="dialog"` with an accessible name and restore focus on Escape.
5. Existing click behaviour of every menu item unchanged (`handle(action)` still runs action then `onclose`).
6. `pnpm check` + `pnpm vitest run`.

### P133. New canvas cards are not ready to type into and stack on each other

Call: QUICK. Size S.

HEAD check: still present. `CanvasInner.svelte:482-488` `addTextCard` adds at `getViewportCenter()` (474-479), unselected, not editing; `handleFileSelected`, `handleImageSelected`, `handleLinkSubmitted`, `addGroup` (496-554) all use the same centre so repeated adds stack exactly. Menu adds for text and group already use the click position (`getMenuCanvasPosition`, 644-654); file/link/image added from the menu lose it because the picker opens first. `TextNode.svelte:20-25` already starts editing from `data.editing`, used today by the menu "Edit" via `updateNodeData` (`CanvasInner.svelte:659-663`).
Behaviour change: a new text card is selected, others deselected, and enters edit mode with focus in the textarea; repeated toolbar adds cascade by a fixed step (e.g. 24 px) while a node already sits at the target spot; menu-opened file/link/image adds land at the right-click position (store it when the menu opens a picker).
Gotcha to guard: `editing: true` must never reach the .canvas JSON. `flowToCanvas` builds a brand-new node from `{...fn.data}` (canvas.logic.ts:~290), so a stray `editing` key would be serialised if persist runs before TextNode clears it. Add the strip in the pure logic (and test it), and do not persist with the flag set.
Files: `CanvasInner.svelte`, `TextNode.svelte` (only if the trigger needs a tweak), `canvas.logic.ts` (pure `cascadePosition` helper + `editing` strip). Tests: `canvas.logic.test.ts`, new `canvas-new-card.test.ts`.
Adjacent open-itens touching `handleFileSelected`/`handleDuplicateNode`: 039 and 051 (see overlaps); sequence, do not merge-conflict.
Test seam: pure helper tested directly; component test on the real canvas (toolbar button `title="Add text card"`), fake timers, `writeTextFile` mock.
Acceptance:
1. Failing test first: `canvas.logic.test.ts`, `cascadePosition` returns the same point when free and a stepped point when a node already sits there, and keeps stepping for a third add.
2. Component: click the toolbar "Add text card"; a `.canvas-textarea` exists, is `document.activeElement`, and the node has `selected`; a second click places a second card at a different position than the first.
3. Component: typing into the new card and advancing the debounce writes JSON with the typed text.
4. The written JSON contains no `editing` key at any point (assert on every `writeTextFile` call), and `flowToCanvas` drops a stray `editing` (logic test).
5. Right-click pane at a point, Add text card: the card position equals that point (regression for the part already working); menu "Add link" then submit lands at the right-click point.
6. `pnpm check` + `pnpm vitest run`.

### P134. A single click on a canvas file or link header navigates away

Call: QUICK. Size S.

HEAD check: still present. `FileNode.svelte:55-57,66-70` header is a `button` whose click opens the file; dragging a card by its header also ends in a click and opens it. The open icon is `opacity: 0` until hover (`:134-142`). `LinkNode.svelte:80-88,118` opens on click and swallows failures (`catch {}` and `isSafeUrl` false is silent). Double-click edit on link cards already exists (`:97`), so the revision "double-click cannot mean open" holds. `help/documentation/11-canvas.md:86-87` documents the click-to-open behaviour.
Behaviour change: plain click on the header only selects/drags; `metaKey`/`ctrlKey` click opens; a separate always-visible open-icon button (`aria-label` "Open note" / "Open link") opens on plain click; a failed `openUrl` or an unsafe URL shows a `toast.error` (svelte-sonner is used in features, e.g. `note-action-bar.service.ts:2`); the context-menu items "Open in editor" / "Open URL" (`CanvasContextMenu.svelte:127-136`, never wired today) get wired in `CanvasInner.svelte:635-686` so there is a menu path; help doc lines updated.
Known interaction: xyflow multi-select uses Meta/Ctrl, so Cmd+click both toggles selection and opens; acceptable, state it in the ticket.
Files: `FileNode.svelte`, `LinkNode.svelte`, `CanvasInner.svelte` (wire the two menu props), `help/documentation/11-canvas.md`.
Test seam: mount the canvas with a file node and a link node; mock `@tauri-apps/plugin-opener` `openUrl` and `plugin-fs` `readTextFile` (Tauri APIs only); assert real `editorStore` state for the file open.
Acceptance:
1. Failing test first: click a file node's header; `editorStore` gets no new tab (fails today, a tab opens). Same for a link header: `openUrl` not called.
2. Ctrl+click on the header opens the note (tab added) / calls `openUrl` with the URL.
3. The open-icon button is present without hover (not `opacity: 0` by default, asserted on source) and opens on plain click.
4. `openUrl` rejecting, or a `javascript:` URL, shows a toast instead of failing silently.
5. Context-menu "Open in editor" and "Open URL" appear and work.
6. `pnpm check` + `pnpm vitest run`; help doc 86-87 updated.

### P135. Canvas text cards are hard to enter and cramped once editing

Call: QUICK. Size S (review says M; with P133 sharing the same trigger it is S).

HEAD check: still present. Editing starts only from `ondblclick` or `data.editing` (`TextNode.svelte:20-25,59,76`). `.canvas-textarea` is `min-height: 40px; resize: vertical; outline: none` (`:112-125`). `CanvasInner.svelte:268-319` handles keys on the container.
Behaviour change: Enter or F2 on a selected text card (and link card, which already has an edit form) starts editing, via the same `updateNodeData(id, {editing: true})` trigger as the menu "Edit"; textarea `height: 100%`, `resize: none`, visible focus ring (`.canvas-text-node:focus-within` or textarea box-shadow); on Escape the focus returns to the node wrapper (`.svelte-flow__node`), otherwise the textarea unmounts, focus drops to body and Enter/F2 cannot be used again until a click. Placeholder copy may become "Double-click or press Enter to edit" (optional).
Guard rails: act only when the key target is the node wrapper itself (not the FileNode header button, not inside inputs; the textarea already calls `stopPropagation`), and verify xyflow's own Enter-to-select on a focused node does not fight it (xyflow NodeWrapper handles Enter/Space for selection).
Files: `CanvasInner.svelte` (handleKeydown), `TextNode.svelte` (CSS, Escape focus return), optionally `LinkNode.svelte`.
Test seam: canvas mount, `keydown` events on `.svelte-flow__node`; CSS via source assertion like `canvas-markdown-css.test.ts`.
Acceptance:
1. Failing test first: select a text card, dispatch Enter on its wrapper; `.canvas-textarea` appears and is focused. Same for F2. Fails today.
2. Enter on a selected file card does nothing.
3. Escape in the textarea ends editing and `document.activeElement` is the node wrapper; Enter again re-enters editing.
4. Source assertion: `.canvas-textarea` has `height: 100%` and `resize: none`, and a focus ring rule exists.
5. Typing in the textarea and pressing Enter inside it inserts a newline (does not retrigger the shortcut, no stray save).
6. `pnpm check` + `pnpm vitest run`.

### P95. Shortcut hints are spelled four ways, and the canvas shows "Ctrl+A" on a Mac

Call: QUICK-PART. Size S.

HEAD check: still present. `CanvasContextMenu.svelte:115` "Ctrl+A", `:119` "Shift+1" literals; `NoteActionBar.svelte:148,157,175` titles "(Cmd+D)", "(Cmd+E)", "(Cmd+\)". `formatShortcut` exists (`src/lib/utils/keybindings.ts:40`, macOS glyphs, e.g. `{meta:true,key:'a'}` gives the command-A glyph form). Handlers: select-all meta or ctrl (CanvasInner:276-279), zoom-to-fit Shift+1, zoom-to-selection Shift+2, undo/redo (292-318), Delete/Backspace via `deleteKey` (627).
Slice: the two canvas menu hints go through `formatShortcut`; add a Delete hint on the node and edge "Delete" items; the three NoteActionBar tooltips go through `formatShortcut` using the same combos as the real bindings (`global-keybindings.ts:195,201`; confirm the third from its binding before writing). Out of the slice: the review's Undo, Redo and zoom-to-selection hints have no menu item to carry them, so adding them means new menu items (owner design call) and a shared `Kbd` component; DEFER. If another slice builds a shared `Kbd` primitive, reuse it.
Files: `CanvasContextMenu.svelte`, `NoteActionBar.svelte`, tests `NoteActionBar.test.ts` plus a new menu test.
Test seam: pure `formatShortcut` stays real; mount the menu / NoteActionBar.
Acceptance:
1. Failing test first: rendered pane menu text for Select all equals the `formatShortcut({meta:true,key:'a'})` result and contains no "Ctrl+"; Zoom to fit equals `formatShortcut({shift:true,key:'1'})`. Fails today.
2. Node and edge menus show a Delete hint.
3. NoteActionBar favorite/organized/raw titles no longer contain "Cmd+" and contain the `formatShortcut` string of their binding.
4. Existing `NoteActionBar.test.ts` updated to the new titles.
5. `pnpm check` + `pnpm vitest run`.

### P136. Canvas connection handles are hidden until hover and only 8 px

Call: QUICK. Size S.

HEAD check: still present. `CanvasInner.svelte:807-816` handles are `8px`, `opacity: 0`, visible only on `.svelte-flow__node:hover`. `ImageNode.svelte:63-66` has 4 handles (`top-target`, `bottom-source`, `left-target`, `right-source`) while Text/File/Link have all 8 (e.g. `TextNode.svelte:81-88`). With xyflow, an image edge whose saved side is `fromSide: top` maps to handle `top-source`, which ImageNode lacks, so that edge cannot attach (data-visible bug, fixed by this slice).
Behaviour change: handles also visible on `.svelte-flow__node.selected`; a 16 px invisible hit area through a `::after` pseudo-element (`inset: -4px`); ImageNode gets the same 8 handles with the same ids. Handle ids and the side mapping (`flowEdgeToCanvasEdge` regex on `top|right|bottom|left-`) stay as they are. Group nodes have no handles and stay so.
Files: `CanvasInner.svelte` (style), `ImageNode.svelte`.
Test seam: canvas mount with an image node and an edge using `fromSide: 'top'`; source assertion for the selector rule.
Acceptance:
1. Failing test first: the image node renders 8 `.svelte-flow__handle` elements with the same ids as the text node. Fails today (4).
2. An edge with `fromSide: "top"` and `toSide: "left"` on an image node survives a load and save round trip with both sides intact.
3. Source assertion: a rule shows handles for `.svelte-flow__node.selected`, and a `::after` rule gives the handle a 16 px hit area.
4. Dropping a connection on empty canvas still creates a connected card (existing behaviour, regression check if a test exists, otherwise skip).
5. `pnpm check` + `pnpm vitest run`.

### P137. Canvas file and image cards give weak or stale status

Call: QUICK-PART. Size S for the slice (review says M).

HEAD check: still present. `ImageNode.svelte:54-61` one placeholder for loading and error (`error || !imageSrc`), `alt={data.file}`, `.canvas-image { object-fit: cover }` (`:97-101`). `FileNode.svelte:31-52` reads the note once per `data.file` change and never refreshes.
Slice (ImageNode only): a loading skeleton (respect `prefers-reduced-motion`), a separate "Image not found" state showing the path, `alt` = basename, `object-fit: contain`.
Out of the slice: FileNode reload when the index reports a change (needs a watcher/index event subscription, `docs/agents/indexing-watcher-rules.md` territory; also the review notes the canvas remounts on tab return, which already refreshes). DEFER.
Files: `ImageNode.svelte`.
Test seam: canvas mount with an image node; mock `canvas-image.service` `resolveImageSrc` (side-effect service) to pending, resolved and rejected states.
Acceptance:
1. Failing test first: with `resolveImageSrc` rejecting, the node shows text "Image not found" and the path; with it pending, it shows a loading element and not "Image not found". Fails today (same placeholder).
2. With it resolved, the `img` has `alt` equal to the file basename, not the full path.
3. Source assertion: `.canvas-image` uses `object-fit: contain`.
4. The skeleton animation is disabled under `prefers-reduced-motion` (source assertion).
5. `pnpm check` + `pnpm vitest run`.

## Candidate quick tickets

Order matters because three tickets edit `CanvasInner.svelte`: T1, T2, T3, T4, T5 sequentially, one at a time.

1. **T1 canvas-new-card-and-text-edit-flow**: P133 + P135. Files: `CanvasInner.svelte`, `TextNode.svelte`, `canvas.logic.ts`, tests. Size S-M. Highest value, no data-write risk once the `editing` strip is tested.
2. **T2 canvas-card-affordances**: P134 + P136 + P137 (image slice). Files: `FileNode.svelte`, `LinkNode.svelte`, `ImageNode.svelte`, `CanvasInner.svelte` (CSS + menu wiring), help doc. Size S-M. All are node-component behaviour with real-canvas tests; split P137 off if it grows.
3. **T3 canvas-theme-tokens**: P12 slice. 13 files, mechanical CSS, one guard test, by-eye check on Default and Lavender Haze. Size S-M. Supersedes open-itens 195 and 196 (see overlaps).
4. **T4 canvas-menu-and-picker-keyboard-and-hints**: P31 slice + P95 slice. Files: `CanvasContextMenu.svelte`, `CanvasFilePicker.svelte`, `CanvasLinkInput.svelte`, `NoteActionBar.svelte`. Size S-M. Run after T3 (same style blocks).
5. **T5 canvas-group-and-edge-labels**: P13 slice. Files: `GroupNode.svelte`, `CanvasEdge.svelte`, `CanvasContextMenu.svelte`, `CanvasInner.svelte`, help doc. Size S-M. Optional, the lead may push it to the later wave; run after T4.

Not ticketed from this slice: P07 (DEFER, stays in open-itens 027), bits-ui rebuild of the canvas menus and Command/Dialog pickers (P31), double-click label editing and the "Add label" chip (P13), new Undo/Redo/zoom-to-selection menu items (P95), FileNode live reload (P137), node-tint `color-mix` and shadow tokens (P12).

## Overlaps found

- open-itens **195** (canvas nodes, edges, grid on theme tokens) and **196** (canvas menus, pickers, edge labels on theme tokens): both fully covered by T3, which keeps their acceptance (guard test over the folder, `--destructive`, by-eye check) and the same exclusions (shadows, scrims, `canvas.types.ts` presets). Mark both wontfix with a pointer to T3 once it is created. One correction to carry over: 195's `canvas.logic.ts:151` `buildGroupStyle` item is dead for rendering (`CanvasInner.svelte:777-785` overrides it with `!important`), so drop it or keep it only to satisfy 195's logic test.
- open-itens **027** (unparseable .canvas): this is P07, stays live, owner decision D1 a recorded, blocked by 026 which is todo. Not covered by any ticket here.
- open-itens **026** (clearing a node colour or link title saves), **039** (file nodes added in the app: `handleFileSelected` stores an absolute path), **051** (Duplicate uses stale geometry, `handleDuplicateNode`): not covered by T1 to T5 but they edit the same functions in `CanvasInner.svelte` as P133 (`handleFileSelected`, add paths). Land them in separate sequential tickets; the P133 cascade must not change what 051 computes for Duplicate (Duplicate keeps its own offset).
- Shared pieces for the other scouts: P95's NoteActionBar tooltips and any shared `Kbd` primitive are owned here; the Settings half of P31 (`src/lib/app/SettingsPanel.svelte:104-112`) is not scheduled here; the color-group scout should confirm none of P19 to P27, P85, P106 to P109 re-ticket the canvas colours that T3 owns.
