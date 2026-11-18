# Verdict: canvas slice (P12 P13 P07 P31 P133 P134 P135 P95 P136 P137)

Adversarial check of `scout-canvas.md` at HEAD `085b23c5d`. Read-only. I opened every canvas component (`src/lib/features/canvas/*.svelte`, `canvas.logic.ts`, `canvas-image.service.ts`), the xyflow 1.7.1 sources the tickets lean on (`node_modules/@xyflow/svelte/dist/lib/components/NodeWrapper/NodeWrapper.svelte`, `.../store/index.js`, `.../hooks/useSvelteFlow.svelte.js`), the source-scan tests that cover canvas files (`radius-scale.test.ts`, `chrome-type-scale.test.ts`, `menu-item-anatomy.test.ts`, `architecture/layer-rules.test.ts`), `NoteActionBar.svelte` and its test, `utils/keybindings.ts`, `app/global-keybindings.ts`, help `11-canvas.md`, open-itens 026/027/039/051/195/196 and the live shell-sidebars-ux Issues that touch the same files (15, 24, 25, 32). `git diff --stat origin/main...origin/mvp-claude` (mvp-claude at `361cbc32c`) touches no canvas file, no `NoteActionBar.svelte`, no `utils/keybindings.ts` and no `11-canvas.md`; it does touch `src/lib/app/global-keybindings.ts` and `src/lib/app/SettingsPanel.svelte`.

## Corrections the scout missed

1. **P13's persist mechanism is wrong.** The debounced persist effect watches only `nodes` (`CanvasInner.svelte:229-243`), so an edge label change never reaches the file through it. `updateEdgeData` does not exist in @xyflow/svelte 1.7.1 (`useSvelteFlow.svelte.js:36` has only `updateEdge`), and `flowEdgeToCanvasEdge` reads `flowEdge.label`, not `edge.data.label` (`canvas.logic.ts:234`). Clearing a group label also runs into open-itens 026: `flowNodeToCanvasNode` copies `label` only when it is `!== undefined` (`canvas.logic.ts:208`), so a cleared label comes back, and an empty string writes `"label": ""`. This is a new write path into the owner's daily .canvas files. It is DEFER.
2. **P133's "strip `editing` in flowToCanvas" is riskier than the fix it guards.** JSON Canvas allows extra keys, and `flowNodeToCanvasNode` keeps them through `...originalNode` (`canvas.logic.ts:195`). Stripping a key named `editing` on every save would delete a third-party field from the owner's files. The leak happens only on the new-node branch (`canvas.logic.ts:308-317` spreads `fn.data`). It is avoided by setting the flag *after* the creating `persistChanges`, because the node is then in `lastSyncedData` (`CanvasInner.svelte:124`) and the existing-node branch copies only the whitelisted keys (`:205-209`). That is the menu "Edit" path that already works today (`CanvasInner.svelte:659-663`). No change to the serialization path.
3. **P95's NoteActionBar part cannot import `shortcutFor`.** `layer-rules.test.ts:167` fails any file under `src/lib` outside `app/` that imports `#lib/app/`, so `NoteActionBar.svelte` (features) cannot read the real binding. `formatShortcut` upper-cases `key` (`keybindings.ts:47-48`), so `{ key: 'Backspace' }` prints "BACKSPACE". `CODE_DISPLAY_MAP` (`:29-34`) has no `Backspace` and no `Backslash`, so the Raw hint `{ code: 'Backslash', meta: true }` (`global-keybindings.ts:183-187`) would print "⌘Backslash". Raw has no `command` id, so `shortcutFor` cannot reach it, and adding one edits a file that mvp-claude changes.
4. **The radius ratchet is exact.** `radius-scale.test.ts:164-176` pins the count of px `border-radius` per canvas file with `toEqual` (`:200-205`). Any new rule with `border-radius: Npx` (image skeleton, label input, open-icon button) fails it. New CSS must use `var(--radius-*)`.
5. **P136 acceptance 2 passes today.** An edge whose handle is missing stays in the `edges` array and is serialized anyway, so the round-trip test proves nothing. jsdom never measures nodes (the ResizeObserver stub never fires), so edges never render there. The 8-handle id test is the real proof.
6. **P31 touches `ColorPicker.svelte`.** The node and edge menus embed the swatches (`CanvasContextMenu.svelte:137-141,155-159`). Under `role="menu"` those buttons need a menu role, and with roving focus plus "Tab closes" they are unreachable unless arrows include them. `ColorPicker.svelte` is also P88's file (another slice).
7. **The Settings half of P31 is out for a second reason.** `src/lib/app/SettingsPanel.svelte` is in the mvp-claude diff.
8. **shell-sidebars-ux 25 (ready-for-agent) edits the same canvas files.** It replaces `CanvasToolbar` with a `ViewHeader` in `CanvasInner.svelte` (its What to build 3), and its own test clicks "Add text card". The scout lists no overlap with it. Every canvas ticket below runs one at a time, before or after 25, never alongside it.

## Per proposal

### P12. Canvas colours are dark-only
**Call: QUICK-PART (unchanged).**
- Verified: 44 literal sites. `grep rgba(` over `src/lib/features/canvas/*.svelte` matches every line the scout lists. The `.svelte-flow__node` override (`CanvasInner.svelte:777-785`, `!important`) does hide `buildGroupStyle` (`canvas.logic.ts:146-152`). Flow `style` is never serialized (`flowNodeToCanvasNode` ignores it), so changing it is safe.
- Refinement: include `canvas.logic.ts:151` with 195's logic test, so open-itens 195 is fully covered and the guard can scan `.ts` as 196 asks (`canvas.types.ts` excluded).
- Overlaps:
  - `ColorPicker.svelte:61,69` is also P88's file; this ticket changes colours only.
  - Shadows (`CanvasInner.svelte:792,796`, overlay shadows) stay as they are for P92.
  - `CanvasToolbar.svelte:55` disappears if shell-sidebars-ux 25 lands first; drop that site then.
- No data risk.
- Out: the node-tint hex suffixes (`TextNode.svelte:57`, `GroupNode.svelte:18-19`, the `${bgColor}20` in File and Link nodes).

### P13. Groups and edges cannot be labelled
**Call: QUICK-PART (changed: was QUICK-PART for rename and edit label; now only the group-label typography).**
- Quick part: the group label at 13 px in `color-mix(in oklab, var(--foreground) 80%, transparent)` instead of 12 px muted (`GroupNode.svelte:36-44`). Pure CSS; it rides on the theme ticket.
- DEFER the rest: Rename, Edit label, inline inputs and the dead `oneditlabel` prop. See correction 1: it is a new .canvas write, the edge path needs an explicit `persistChanges`, and it depends on open-itens 026 (todo) for clearing. It is M with data risk.

### P07. Corrupt canvas JSON shows as an empty board
**Call: DEFER (unchanged).**
- Verified: `parseCanvas` returns empty on any failure (`canvas.logic.ts:36-49`). The next debounced or `onDestroy` persist (`CanvasInner.svelte:238-241,261-265`) overwrites the file.
- No safe slice: a banner without the write guard still loses the file. The guard is a write-path change.
- Stays in open-itens 027: owner decision D1 a, blocked by 026.

### P31. Overlays do not move, trap or restore focus
**Call: QUICK-PART (unchanged call, scope corrected).**
- Verified: the menu has no roles or keys (`CanvasContextMenu.svelte:88-95`). The container Escape only deselects (`CanvasInner.svelte:271-274`). The picker slices to 20 silently (`CanvasFilePicker.svelte:60`). Neither dialog has `role="dialog"`.
- Slice:
  - Menu roles, roving focus over every button including the swatches, Escape and Tab close with focus restore.
  - Picker and link dialogs: dialog roles, accessible names, focus restore.
  - "Showing 20 of N".
  - Swatches get `role="menuitemradio"` and `aria-checked` inside a `role="group"` labelled "Color". Their names ("1".."6", `ColorPicker.svelte:33`) stay for P88.
- Hidden interaction: the focus restore runs synchronously in `onclose`. Menu "Edit" focuses the textarea in a rAF (`TextNode.svelte:24`), and the pickers focus their input in a rAF (`CanvasFilePicker.svelte:43`). The restore must not win over those, so assert it.
- DEFER: the bits-ui or Command rebuild (M), and the Settings half (mvp-claude file).

### P133. New cards are not ready to type into and stack
**Call: QUICK (unchanged call, approach changed, see correction 2).**
- Verified: `addTextCard`, `handleFileSelected`, `handleImageSelected`, `handleLinkSubmitted` and `addGroup` all use `getViewportCenter()` (`CanvasInner.svelte:474-554`). Menu adds of file, link and image lose the click point because they open a picker (`:648-650`).
- Selection changes already trigger the 300 ms persist today with identical JSON (effect `:229-243`), so selecting the new card adds no new write.
- The cascade is a new pure function in `canvas.logic.ts`. No existing function changes.
- Overlaps:
  - open-itens 039 edits `handleFileSelected` (`:496-502`). Sequence; 039 stays.
  - open-itens 051 (Duplicate) keeps its own offset.
  - shell-sidebars-ux 25 moves the toolbar buttons; the test finds the button by name.

### P134. A single click on a file or link header navigates away
**Call: QUICK (unchanged).**
- Verified:
  - The header is a `button` that opens on click (`FileNode.svelte:55-57,66-70`; `LinkNode.svelte:80-88,118-121`).
  - The open icon is `opacity: 0` (`FileNode.svelte:134-142`).
  - URL failures are swallowed (`LinkNode.svelte:84-86`).
  - `onopenfile` and `onopenurl` are never passed (`CanvasInner.svelte:635-686`).
- No writes.
- Refinements:
  - The always-visible open button must be a sibling, not a nested button. The header becomes a non-interactive drag area, so keyboard users open through the icon button, which the acceptance must cover.
  - xyflow's multi-select key is Cmd on macOS, so Cmd+click also toggles selection; state it.
  - "Open in editor" passes `data.file` as stored, so the relative-path bug of open-itens 039 still applies (039 stays live).
  - Help `11-canvas.md:86-87` changes.

### P135. Text cards are hard to enter and cramped
**Call: QUICK (unchanged).**
- Verified xyflow behaviour:
  - A focused node wrapper handles Enter, Space and Escape (`NodeWrapper.svelte:189-192`).
  - Enter selects an unselected node and never toggles off a selected one unless the multi-select key is held (`store/index.js:196-202`).
  - Escape unselects the node and blurs it (`:199-201`).
  - The event bubbles to `.canvas-container` (`CanvasInner.svelte:602`).
- The textarea `stopPropagation` (`TextNode.svelte:49`) keeps typing keys away from both. F2 is not global (only `NoteRow.svelte:73`).
- The design must settle one point: on an unselected focused card, Enter selects and starts editing in the same keypress. Test that it does not take two presses unless chosen.
- No data risk. The textarea CSS is in one component.

### P95. Shortcut hints spelled four ways
**Call: QUICK-PART (unchanged call, split into two tickets, see correction 3).**
- Canvas part: Select all (`⌘A`), Zoom to fit (`⇧1`) and a Delete hint through `formatShortcut`. Delete needs `Backspace: '⌫'` added to `CODE_DISPLAY_MAP`. That is an additive change in `utils/keybindings.ts`, which shell-sidebars-ux 32 also extends; sequence them.
- NoteActionBar part: local combo constants in the component. The test cross-checks favorite and organized against `shortcutFor` (a test may import `app/`), and Raw against `Backslash: '\\'` in `CODE_DISPLAY_MAP`.
- E2E is safe: the specs locate these buttons by `aria-label` (`e2e/specs/note-action-bar.spec.ts:49,58,95`), not by title.
- `NoteActionBar.svelte` is edited by shell-sidebars-ux 15, 24 and 32 (all ready-for-agent); sequence, do not run in parallel.
- DEFER: the Undo, Redo and zoom-to-selection menu items and a shared `Kbd`.

### P136. Handles hidden until hover and 8 px
**Call: QUICK (unchanged).**
- Verified:
  - Handles are 8 px and `opacity: 0` (`CanvasInner.svelte:807-816`).
  - ImageNode has 4 handles (`ImageNode.svelte:63-66`) against 8 on the other nodes (`TextNode.svelte:81-88`). `canvasEdgeToFlowEdge` maps `fromSide: top` to `top-source` (`canvas.logic.ts:163`), which ImageNode lacks.
- Adding the handles writes nothing and changes no id.
- Refinements:
  - Give the 16 px `::after` hit area only on hovered or selected nodes. An opacity-0 handle still takes pointer hits, so a hit area on every node steals node drags near the side midpoints.
  - On a selected node the NodeResizer lines run along the same edges; check by eye that resizing from a side midpoint still works.
  - Replace scout acceptance 2 (see correction 5).

### P137. File and image cards give weak or stale status
**Call: QUICK-PART (unchanged).**
- Verified: one placeholder for loading and error (`ImageNode.svelte:54-58`), `alt` is the full path (`:60`), and `object-fit: cover` (`:100`).
- Slice is ImageNode only.
- Refinements:
  - Any new radius must be a token (correction 4).
  - A remote `https` image that fails loads through `<img>`, not `resolveImageSrc` (`canvas-image.service.ts:31`), so the "not found" state needs an `onerror` on the `img` too.
  - Mock `@tauri-apps/plugin-fs` `readFile` and stub `URL.createObjectURL`, not the service, so the real `resolveImageSrc` runs.
- DEFER: the FileNode reload on index change (watcher or index subscription, indexing-watcher-rules territory).

## Final quick tickets

Run them one at a time, in this order. Q1 to Q5 all edit `src/lib/features/canvas/` and several edit `CanvasInner.svelte`. Each runs before or after shell-sidebars-ux 25, never alongside it. Q6 is independent of the canvas but runs one at a time with shell-sidebars-ux 15, 24 and 32. No ticket touches Rust, a store, the .canvas serialization functions (`flowToCanvas`, `flowNodeToCanvasNode`, `flowEdgeToCanvasEdge`, `serializeCanvas`, `parseCanvas`) or an mvp-claude file.

### Q1. New canvas text cards open ready to type, cascade, and Enter or F2 edits a selected card
- **Ids:** P133, P135
- **Touches:**
  - Source: `src/lib/features/canvas/CanvasInner.svelte`, `TextNode.svelte`, `LinkNode.svelte` (Enter or F2 only), `canvas.logic.ts` (a new pure `cascadePosition` only).
  - Tests: `src/tests/lib/features/canvas/canvas.logic.test.ts` and a new `canvas-text-editing.test.ts` (harness of `canvas-tab-switch.test.ts`).
- **What to build:**
  - New cards:
    - Toolbar and menu "Add text card" adds the card, selects it, deselects the others, and enters edit mode with focus in the textarea.
    - The `editing` flag is set only *after* the creating `persistChanges`, through the same `updateNodeData(id, { editing: true })` that menu Edit uses. No change to any serialization function.
    - Repeated toolbar adds cascade by a fixed step while a node already sits at the target point.
    - Menu-opened file, link and image adds land at the right-click point: store it when the menu opens the picker.
  - Editing:
    - Enter or F2 on a focused, selected text or link card wrapper (`e.target` is the `.svelte-flow__node`) starts editing.
    - Escape in the textarea ends editing and returns focus to the wrapper.
    - The textarea gets `height: 100%`, `resize: none` and a focus ring on `--ring`.
    - Any new radius uses a token (radius ratchet).
- **Acceptance:**
  - [ ] Failing test first, `canvas.logic.test.ts`: `cascadePosition` returns the point when free, a stepped point when a node sits there, and a further step for a third.
  - [ ] Failing test first, `canvas-text-editing.test.ts`: click "Add text card" (found by name, so it survives shell-sidebars-ux 25); a `.canvas-textarea` is `document.activeElement` and the node has `selected`. A second click places a second card at a different position.
  - [ ] Typing in the new card, then advancing the 300 ms debounce, puts the text in the tab content. No `onJsonChange` payload ever contains an `editing` key: assert on every payload, including the first, synchronous one.
  - [ ] Enter on a selected text card wrapper opens the textarea focused; F2 the same. Enter on a selected file card does nothing. Enter typed inside the textarea inserts a newline and starts nothing else.
  - [ ] Escape in the textarea: `document.activeElement` is the node wrapper, the node is still selected, and Enter edits again.
  - [ ] Right-click the pane, Add link, submit: the node sits at the right-click flow point.
  - [ ] Source assertion: `.canvas-textarea` has `height: 100%` and `resize: none`.
  - [ ] `pnpm check` + `pnpm vitest run`.

### Q2. A plain click on a canvas file or link header selects; Cmd+click or the open button opens
- **Ids:** P134
- **Touches:**
  - Source: `src/lib/features/canvas/FileNode.svelte`, `LinkNode.svelte`, `CanvasInner.svelte` (pass `onopenfile` and `onopenurl`), `help/documentation/11-canvas.md:86-87`.
  - Tests: a new `canvas-node-open.test.ts`.
- **What to build:**
  - The header no longer opens on a plain click. A Cmd or Ctrl click on it opens.
  - An always-visible icon button, a sibling of the header and never nested in it, with `aria-label` "Open note" or "Open link", opens on a plain click or Enter.
  - `openUrl` rejecting, or `isSafeUrl` false, shows `toast.error` from svelte-sonner.
  - Wire the existing menu items "Open in editor" and "Open URL" from `CanvasInner`.
  - Update the help lines.
- **Acceptance:**
  - [ ] Failing test first: a plain click on a file node header adds no tab to the real `editorStore`, and on a link header does not call the mocked `openUrl` (`@tauri-apps/plugin-opener`). Both fail today.
  - [ ] A Ctrl or Cmd click on the header opens: a tab is added, or `openUrl` is called with the URL.
  - [ ] The open button exists without hover (no `opacity: 0` default in the source), is reachable by Tab, and opens on click.
  - [ ] `openUrl` rejecting and a `javascript:` URL each show a toast.
  - [ ] The node menu shows "Open in editor" on file nodes and "Open URL" on link nodes, and they work.
  - [ ] Help `11-canvas.md:86-87` describes the new behaviour.
  - [ ] `pnpm check` + `pnpm vitest run`.

### Q3. Canvas handles show on selected nodes, and image cards get 8 handles and real loading and error states
- **Ids:** P136, P137 (ImageNode part)
- **Touches:**
  - Source: `src/lib/features/canvas/ImageNode.svelte`, `CanvasInner.svelte` (handle CSS only).
  - Tests: a new `canvas-image-node.test.ts`.
- **What to build:**
  - ImageNode gets the same 8 handles, with the same ids, as TextNode.
  - Handles are visible on `.svelte-flow__node.selected` as well as on hover. A 16 px `::after` hit area applies only on hovered or selected nodes.
  - ImageNode:
    - A loading skeleton, static under `prefers-reduced-motion`.
    - A separate "Image not found" state that shows the path, also on the `<img>` `onerror` of remote images.
    - `alt` is the basename and `object-fit` is `contain`.
    - Radii are tokens.
- **Acceptance:**
  - [ ] Failing test first: an image node renders 8 `.svelte-flow__handle` elements whose `data-handleid` set equals a text node's. It fails today (4).
  - [ ] With `readFile` mocked to reject, the node shows "Image not found" and the path. With it pending, a loading element shows and "Image not found" does not. With it resolved (`URL.createObjectURL` stubbed), the `img` `alt` is the basename. All of this fails today.
  - [ ] Source assertions:
    - A rule shows handles under `.svelte-flow__node.selected`.
    - The `::after` hit-area rule is scoped to hover or selected.
    - `.canvas-image` uses `object-fit: contain`.
    - The skeleton animation is off under `prefers-reduced-motion`.
  - [ ] `radius-scale.test.ts` still passes with the `ImageNode.svelte` baseline unchanged.
  - [ ] A by-eye check, recorded in the commit body: resizing a selected node from a side midpoint still works.
  - [ ] `pnpm check` + `pnpm vitest run`.

### Q4. Canvas surfaces and overlays draw from theme tokens
- **Ids:** P12 (slice), P13 (group-label typography only)
- **Touches:**
  - Source: in `src/lib/features/canvas/`, `CanvasInner.svelte`, `CanvasContextMenu.svelte`, `CanvasFilePicker.svelte`, `CanvasLinkInput.svelte`, `CanvasEdge.svelte`, `CanvasToolbar.svelte` (unless shell-sidebars-ux 25 removed it), `ColorPicker.svelte`, `FileNode.svelte`, `TextNode.svelte`, `LinkNode.svelte`, `ImageNode.svelte`, `GroupNode.svelte` and `canvas.logic.ts:151`.
  - Tests: a new `canvas-theme-colors.test.ts` and `canvas.logic.test.ts`.
- **What to build:**
  - Every `rgba(255, 255, 255, A)` becomes `color-mix(in oklab, var(--foreground) A%, transparent)`.
  - The minimap mask becomes `color-mix(in oklab, var(--background) 60%, transparent)`.
  - The context-menu danger item uses `var(--destructive)`, with a 15% mix for the hover background.
  - Drop the dead fallbacks in `CanvasEdge.svelte:66-67`.
  - The uncolored `buildGroupStyle` uses the same form.
  - Reword the "for dark mode" comment.
  - The group label becomes 13 px in foreground at 80%.
  - Shadows, scrims and node-tint hex suffixes stay as they are.
- **Acceptance:**
  - [ ] Failing test first, `canvas-theme-colors.test.ts` (comments stripped, the style of `canvas-markdown-css.test.ts`): every `.svelte` and `.ts` file in the folder except `canvas.types.ts` has no `rgba(255` and no `#fb464c`. `rgba(0` appears only in `box-shadow` declarations and the two scrims (`CanvasFilePicker.svelte:81`, `CanvasLinkInput.svelte:81`). It fails today.
  - [ ] Failing test first, `canvas.logic.test.ts`: an uncolored group's `style` contains `var(--foreground)` and no `rgba(`; a colored group keeps its `20` and `80` suffixes.
  - [ ] Every shadow line is byte-identical to HEAD.
  - [ ] `radius-scale.test.ts` passes unchanged.
  - [ ] `pnpm check` + `pnpm vitest run`. The commit body records a by-eye check of edges, grid, minimap and menu hover in the Default and Lavender Haze themes.
  - [ ] It replaces open-itens 195 and 196.

### Q5. The canvas context menu and pickers work from the keyboard and show Mac shortcut glyphs
- **Ids:** P31 (canvas slice), P95 (canvas part)
- **Touches:**
  - Source: `src/lib/features/canvas/CanvasContextMenu.svelte`, `ColorPicker.svelte` (roles only), `CanvasFilePicker.svelte`, `CanvasLinkInput.svelte`, `src/lib/utils/keybindings.ts` (add `Backspace: '⌫'` to `CODE_DISPLAY_MAP`).
  - Tests: a new `canvas-context-menu.test.ts` and `src/tests/lib/utils/keybindings.test.ts`.
- **What to build:**
  - Menu:
    - The menu is `role="menu"` and its buttons `role="menuitem"`; the colour section is a `role="group"` labelled "Color" with `menuitemradio` swatches and `aria-checked`.
    - On open, the first item takes focus. ArrowUp, ArrowDown, Home and End move it across every item, swatches included.
    - Escape (with `stopPropagation`) and Tab close the menu and restore the previous focus, without overriding the focus an action moves elsewhere.
  - Pickers and link input: `role="dialog"`, `aria-modal`, an accessible name, labelled inputs and focus restore on close. The picker shows "Showing 20 of N" when more match.
  - Hints: the menu reads `formatShortcut({ meta: true, key: 'a' })` and `formatShortcut({ shift: true, key: '1' })`, and both Delete items read `formatShortcut({ code: 'Backspace' })`.
- **Acceptance:**
  - [ ] Failing test first: open the pane menu. It has `role="menu"` and the first item is focused. ArrowDown moves focus to the second item, End to the last. Escape removes the menu, does not deselect the nodes, and puts focus back where it was. It fails today.
  - [ ] Menu "Edit" on a text card leaves focus in the textarea, not on the restored element.
  - [ ] The pane menu text holds `⌘A` and `⇧1` and no "Ctrl+". The node and edge Delete items show `⌫`. `keybindings.test.ts`: `formatShortcut({ code: 'Backspace' })` is `⌫`.
  - [ ] The picker with 25 matches shows "Showing 20 of 25", and with 5 matches no count. Picker and link input expose `role="dialog"` with a name and restore focus on Escape.
  - [ ] Every item still runs its action, then `onclose`.
  - [ ] `pnpm check` + `pnpm vitest run`.

### Q6. Note action bar tooltips use Mac shortcut glyphs
- **Ids:** P95 (NoteActionBar part)
- **Touches:**
  - Source: `src/lib/features/note-action-bar/NoteActionBar.svelte`, `src/lib/utils/keybindings.ts` (add `Backslash: '\\'` to `CODE_DISPLAY_MAP`).
  - Tests: `src/tests/lib/features/note-action-bar/NoteActionBar.test.ts` and `src/tests/lib/utils/keybindings.test.ts`.
- **What to build:**
  - Replace the "(Cmd+D)", "(Cmd+E)" and "(Cmd+\)" titles (`NoteActionBar.svelte:148,157,175`) with `formatShortcut` of combo constants local to the component. Importing `#lib/app/` is forbidden by `layer-rules.test.ts:167`.
  - The `aria-label`s do not change.
- **Acceptance:**
  - [ ] Failing test first, `NoteActionBar.test.ts`: the favorite title is `` `${label} (${formatShortcut(shortcutFor('note:toggle-favorite'))})` ``, the same for organized; the Raw title ends with `(⌘\)`; no title contains "Cmd+". Existing title assertions at `:183,191,200,207,214` are updated, not deleted.
  - [ ] `keybindings.test.ts`: `formatShortcut({ code: 'Backslash', meta: true })` is `⌘\`.
  - [ ] `layer-rules.test.ts` passes. E2E locators are unaffected: the note-action-bar spec uses names.
  - [ ] `pnpm check` + `pnpm vitest run`.

## Deferred

- P07: a data-safety guard on the .canvas write path. It stays in open-itens 027 (owner decision D1 a, blocked by 026).
- P13 rename and edit label: a new .canvas write, needs an explicit edge persist (`CanvasInner.svelte:229-243` ignores edges), and depends on open-itens 026 for clearing. M.
- P13 double-click label editing, the "Add label" chip and the header chip: design, M.
- P31 rebuild of the canvas menus on bits-ui ContextMenu, and of the pickers on Command or Dialog: M; the menus open from xyflow events, not from a trigger.
- P31 Settings focus and Escape half: `SettingsPanel.svelte` is in the mvp-claude diff.
- P95 Undo, Redo and zoom-to-selection menu items, and a shared `Kbd` primitive: new menu items and a design call.
- P137 FileNode reload on index change: a watcher or index subscription, indexing-watcher-rules territory.
- P12 node-tint `color-mix` (hex alpha suffixes) and the shadow and scrim tokens: P92 and the elevation work.

## Overlaps to record

- open-itens **195** and **196**: fully covered by Q4, including 195's `buildGroupStyle` item and 196's `.ts` scan. Mark both wontfix with a pointer once Q4 exists.
- open-itens **026**, **027**, **039** and **051** stay live. 039 shares `handleFileSelected` with Q1 and the "Open in editor" path with Q2; 051 shares the add paths with Q1. They are dependencies to sequence, not replacements.
- shell-sidebars-ux **25** edits `CanvasInner.svelte` and `CanvasToolbar.svelte`. Q1 to Q5 run before or after it, never together. Q1's test finds the button by name.
- shell-sidebars-ux **15**, **24** and **32** edit `NoteActionBar.svelte`, and 32 also extends `CODE_DISPLAY_MAP`. Run Q6 one at a time with them.
- P88 (another slice) owns the swatch names in `ColorPicker.svelte`, which Q4 and Q5 touch for colour and roles only. P92 owns the shadows that Q4 leaves alone.
