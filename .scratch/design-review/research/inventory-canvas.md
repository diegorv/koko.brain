# Inventory: Canvas (src/lib/features/canvas)

Read-only fact sheet. All paths relative to repo root `src/lib/features/canvas/` unless shown otherwise. Line numbers from the files as of HEAD f2cd7f97b.

## 1. Components

Total `.svelte` lines: 2292 (13 files). Non-svelte: `canvas-markdown.css` (173 lines), `*.logic.ts`, `canvas.service.ts`, `canvas-image.service.ts`, `canvas.types.ts`.

shadcn/ui primitives: none. No file imports from `#lib/components/ui`. All markup is custom; icons come from `@lucide/svelte`, canvas and dialogs use the xyflow `SvelteFlow` primitives.

| File | Lines | Renders | Markup |
|---|---|---|---|
| CanvasView.svelte | 19 | Wrapper: `SvelteFlowProvider` around CanvasInner | none |
| CanvasInner.svelte | 817 | Whole board: SvelteFlow, Background, Controls (bottom-left), MiniMap, empty-hint, drop zone, context menu host, toolbar host, both pickers | custom; `<div class="canvas-container">` (CanvasInner.svelte:602) |
| TextNode.svelte | 131 | Text card: markdown preview or textarea | custom |
| FileNode.svelte | 188 | Note-embed card: header button, markdown preview of the file | custom `<button class="file-header">` (FileNode.svelte:66) |
| LinkNode.svelte | 216 | Link card: header button, or edit form with two inputs | custom |
| ImageNode.svelte | 102 | Image card: `<img>` or placeholder | custom |
| GroupNode.svelte | 45 | Dashed group frame with optional label | custom |
| CanvasEdge.svelte | 75 | Smoothstep edge, label, reconnect anchors | xyflow `BaseEdge`, `EdgeLabel`, `EdgeReconnectAnchor` |
| CanvasToolbar.svelte | 78 | Vertical stack of 5 icon buttons, bottom-left above Controls | custom `<button class="toolbar-btn">` |
| CanvasContextMenu.svelte | 234 | Pane / node / edge context menu | custom `<button class="menu-item">` |
| ColorPicker.svelte | 72 | Row of 7 round color dots (none + 6 presets) | custom `<button class="color-dot">` |
| CanvasFilePicker.svelte | 152 | Modal vault-note / image picker with search list | custom; backdrop `div` + `input` + `button.picker-item` |
| CanvasLinkInput.svelte | 163 | Modal "Add link" dialog, two inputs, Cancel/Add | custom |

## 2. States

### Empty
- Board empty: `+ Add card` button, `CanvasInner.svelte:603-609` (shown when `nodes` and `edges` are both empty; styles `:740-755`).
- Text card empty: placeholder `Double-click to edit` shown only when `data.text` is falsy, `TextNode.svelte:73-77`. A non-empty card shows no hint that it is editable.
- File card, file has no content: `Empty file`, `FileNode.svelte:84-85`.
- File picker, no matches (also shown when the tree is empty or still loading): `No files found`, `CanvasFilePicker.svelte:66-68`. The component never reads `fsStore.isLoading`.
- Group with no label: nothing rendered, `GroupNode.svelte:21-23`.
- Link with no URL: display name falls back to `Unknown URL`, `LinkNode.svelte:31`; header then renders no URL line (`:122`).
- Image with no file: placeholder shows empty path span, `ImageNode.svelte:54-58`.

### Loading
- File card: spinner `Loader2 animate-spin opacity-30`, `FileNode.svelte:76-79` (`loading` starts `true`, `:27`).
- Image card: no spinner. Loading and error both render the same icon-plus-path placeholder, `ImageNode.svelte:54` (`error || !imageSrc`).
- Link card, text card, group card, canvas board (JSON parse): no loading state. Board renders synchronously from `parseCanvas` (`CanvasInner.svelte:99-114`).
- File picker: no loading state (see Empty above).

### Error
- File card: `Could not load file` text, `FileNode.svelte:80-81`. Lowercase-free sentence, no next step given.
- Image card: no error message. Error is indistinguishable from loading, `ImageNode.svelte:54`, `:35-37`.
- Corrupt `.canvas` JSON: `parseCanvas` silently returns an empty canvas (`canvas.logic.ts:46-47`), so the board shows the empty hint (`CanvasInner.svelte:603`), identical to a truly empty file. No error UI.
- Persist failure: `persistWithoutHistory` calls `onJsonChange` with no try/catch (`CanvasInner.svelte:120-126`); `persistChanges` (`:129-132`) likewise. No error surface anywhere in the feature.
- Image URL/file read failure in `canvas-image.service.ts:34` is not caught in the service; caught only in ImageNode (`ImageNode.svelte:35`).
- Link open failure: swallowed silently, `LinkNode.svelte:84-86` (`/* ignore */`).
- Dropped unsupported file type: silently ignored, `CanvasInner.svelte:591-592`.

### Disabled
- Link dialog Add button: `disabled={!url.trim()}`, `CanvasLinkInput.svelte:68`; style `:159-162` (opacity 0.4).
- Color dot "none": no disabled state; active state only (`ColorPicker.svelte:21-27`).
- Toolbar buttons: never disabled (`CanvasToolbar.svelte:25-39`).
- Context menu items: never disabled. Undo/redo have no menu items or buttons; they exist only as keyboard shortcuts (`CanvasInner.svelte:292-318`).
- Pane/node/edge menu items exist only when their callback prop is passed (see Copy and Interaction).

### Visibly absent
- No loading indicator for the board, link, text or group cards.
- No error UI for persist failure, corrupt JSON, or failed image load (only placeholder).
- No disabled state for "Add" on the file picker (it is a list, no confirm button).
- No empty/no-results distinction between "vault has no notes" and "query matched nothing" in `CanvasFilePicker.svelte:66-68`.
- No undo/redo affordance in the UI.

## 3. Interaction

### Keyboard (`CanvasInner.svelte:268-318`, container `onkeydown` at `:602`)
- `Escape`: clears node and edge selection (`:271-274`). Does not close the context menu (menu closes on pointerdown/pane click, `:625-626`).
- `Ctrl/Cmd+A`: select all (`:276-279`).
- `!` or `Shift+1`: fit view (`:281-284`). `@` or `Shift+2`: fit selection (`:286-290`).
- `Cmd/Ctrl+Z`: undo; `Cmd/Ctrl+Shift+Z`: redo (`:292-318`).
- Delete keys: `Backspace`, `Delete` (`:627`). Text and link inputs call `stopPropagation` so typing does not delete nodes (`TextNode.svelte:48-49`, `LinkNode.svelte:69`).
- Text card: `Escape` exits edit (`TextNode.svelte:45-47`). Enter inserts newline (no handler).
- Link edit: `Enter` saves, `Escape` cancels without saving (`LinkNode.svelte:61-69`). Focus leaving the form saves (`:72-77`).
- Link dialog: `Enter` submits, `Escape` clears both inputs and closes (`CanvasLinkInput.svelte:28-38`). Clearing on Escape discards typed input without confirmation.
- File picker: `Escape` clears the query and closes (`CanvasFilePicker.svelte:33-39`). Arrow keys do not move through results; no keyboard activation of items beyond native `button` Enter/Space on focus, and focus is only on the input.
- Context menu: no keyboard open (no `contextmenu` key or Shift+F10 handling found), no arrow-key navigation, no Escape close.
- No focus trap in the two modal dialogs (`CanvasFilePicker.svelte:48-71`, `CanvasLinkInput.svelte:48-71`). No focus restore on close.

### Focus management
- Text card: textarea focused via `requestAnimationFrame` after double-click or after the external `editing` flag, `TextNode.svelte:20-32`.
- Link edit: URL input focused via rAF, `LinkNode.svelte:44-49`.
- Pickers: input focused via rAF when `open`, `CanvasFilePicker.svelte:41-45`, `CanvasLinkInput.svelte:41-45`.

### Hover-only affordances
- Connection handles: `opacity: 0` until the node is hovered, `CanvasInner.svelte:807-816`. Keyboard and touch users cannot see connection points.
- File card "open" icon: `opacity: 0` until header hover, `FileNode.svelte:134-142`.
- Link underline on hover only, `LinkNode.svelte:176-178`.
- Edge reconnect anchors: visible only when edge is selected, `CanvasEdge.svelte:47-61`.
- Node resize handles: visible only when selected (`isVisible={selected}` in every node component).
- Toolbar and add-card hover backgrounds: `CanvasToolbar.svelte:75-77`, `CanvasInner.svelte:751-755`.

### Drag and drop
- Node reparenting on drag stop, into or out of group: `CanvasInner.svelte:134-175`.
- Group delete releases children: `CanvasInner.svelte:197-223`, `:385-410`.
- Drop from file tree: container accepts any `text/plain` drag, sets `isDragOver` before checking the file type (`:560-566`), so the dashed outline appears for unsupported types. Drop of `.canvas` opens it as a tab (`:579-582`). Drop of image or `.md` creates a card at pointer (`:584-597`). Other types: no feedback (`:591-592`).
- Edge drop on empty pane creates a text card and connects it, `CanvasInner.svelte:522-545`.
- Drag-over feedback: 2px dashed `--primary` outline, `CanvasInner.svelte:723-726`.

### Context menus
- Trigger: `onpanecontextmenu`, `onnodecontextmenu`, `onedgecontextmenu` (`CanvasInner.svelte:622-624`).
- Positioning: flip threshold hard-coded to 200px, `CanvasInner.svelte:343-346`.
- Pane items: 5 add items, Select all (shortcut label `Ctrl+A`), Zoom to fit (`Shift+1`), `CanvasContextMenu.svelte:96-120`.
- Node items: Edit (text and link only), Open in editor (only if `onopenfile` passed), Open URL (only if `onopenurl` passed), color picker, Duplicate, Delete, `:121-148`.
- Edge items: Edit label (only if `oneditlabel` passed), color picker, Go to source, Go to target, Delete, `:149-174`.
- DEAD PATHS: `CanvasInner.svelte:635-686` never passes `onopenfile`, `onopenurl` or `oneditlabel`. So `Open in editor`, `Open URL` and `Edit label` (CanvasContextMenu.svelte:127-136, 150-154) never render. Grep for those prop names in CanvasInner.svelte returns nothing.
- Edge label: `CanvasEdge.svelte:41-45` renders a label if present, but no UI path sets `label` on an edge (only `handleConnect` and `handleConnectEnd` create edges, `CanvasInner.svelte:179-187`, `:534-540`).
- Group label: no UI path found that sets a group `label` (`GroupNode.svelte:21`, `canvas.logic.ts` `createGroupNode` called with `''`, `CanvasInner.svelte:550`). Group labels can only come from the file.
- Color: `ColorPicker` in node and edge menus (`CanvasContextMenu.svelte:137-141`, `:155-159`). Node color applied via `updateNodeData` (`CanvasInner.svelte:426-431`), edge color via inline `style` string and marker (`:434-448`).

### Tooltips
- Native `title` attribute only: toolbar (`CanvasToolbar.svelte:25,28,31,34,37`), color dots (`ColorPicker.svelte:24,34`). No custom tooltip component.

### Pointer and click handling on non-buttons
- `ondblclick` on text card and link card `div`s, `TextNode.svelte:59`, `LinkNode.svelte:97`.
- Backdrop `div` with `onclick` closes dialogs, `CanvasFilePicker.svelte:50`, `CanvasLinkInput.svelte:50`.
- `onpointerdown` stopPropagation on context menu and color picker `div`s, `CanvasContextMenu.svelte:94`, `ColorPicker.svelte:19`.
- Board container `div` has `onkeydown`, `ondragover`, `ondrop`, `ondragleave` (`CanvasInner.svelte:602`), with `svelte-ignore a11y_no_static_element_interactions` (`:601`).
- Also `svelte-ignore` on `TextNode.svelte:54`, `LinkNode.svelte:92`, `CanvasContextMenu.svelte:87`, `ColorPicker.svelte:18`, `CanvasFilePicker.svelte:49`, `CanvasLinkInput.svelte:49`.

## 4. Accessibility facts

### Icon-only buttons
| Element | Accessible name source | Location |
|---|---|---|
| Toolbar x5 | `title` only, no `aria-label`, no visible text | `CanvasToolbar.svelte:25-39` |
| Color dot "none" | `title="No color"`, icon `X` (aria-hidden by default in lucide, not verified) | `ColorPicker.svelte:20-27` |
| Color dots 1-6 | `title={key}`, i.e. the number "1" to "6", not a color name | `ColorPicker.svelte:28-35` |
| Node resize handles | xyflow defaults, not verified | - |

- Toolbar has no `role="toolbar"`, no `aria-label` for the group, no `aria-keyshortcuts`.

### Roles and labels
- Context menu `div.context-menu`: no `role="menu"`, items are plain `button`s with no `role="menuitem"` (`CanvasContextMenu.svelte:88-95`, `:97-174`).
- Color picker: no `role`, no `aria-pressed` on dots; selected state is a CSS class only (`ColorPicker.svelte:32`).
- Dialogs `CanvasFilePicker.svelte:48-71` and `CanvasLinkInput.svelte:48-71`: no `role="dialog"`, no `aria-modal`, no `aria-labelledby`. Dialog title `Add link` is a `div.link-title` (`CanvasLinkInput.svelte:52`), not a heading.
- Inputs without `<label>`: picker search (`CanvasFilePicker.svelte:52-58`), link URL and title (`CanvasLinkInput.svelte:53-65`), link edit URL and title (`LinkNode.svelte:101-115`), text card textarea (`TextNode.svelte:62-70`). Placeholders only.
- Image: `alt={data.file ?? ''}` = file path (`ImageNode.svelte:60`). Not a description.
- Canvas board: no `aria-label`, no role on `.canvas-container` (`CanvasInner.svelte:602`). Text content of nodes is not announced as a structure.
- Lists in the file picker: `div.picker-list` with `button` children, no `role="listbox"`/`option`.

### Focus-visible styles
- No `:focus-visible` rule in any canvas file (grep for `focus` returns only `LinkNode.svelte:208` and `CanvasLinkInput.svelte:117`).
- `outline: none` with no replacement focus style: picker input `CanvasFilePicker.svelte:107`, text-card textarea `TextNode.svelte:117`, link edit inputs `LinkNode.svelte:204`, link dialog inputs `CanvasLinkInput.svelte:113`. The link inputs get `border-color: var(--primary)` on `:focus` (`LinkNode.svelte:208-210`, `CanvasLinkInput.svelte:117-119`); the picker input and text-card textarea get nothing.
- Buttons (toolbar, menu items, color dots, picker items, file-header, link-header, add-card) rely on browser default focus ring, no custom style.

### Click handlers on non-buttons
- See Interaction > Pointer and click handling on non-buttons: text card and link card `div`s with `ondblclick` (keyboard users cannot start editing without the context menu; the context menu has no keyboard trigger).

### Contrast-relevant hints
- Placeholder text at opacity 0.5 (`TextNode.svelte:127-130`, `LinkNode.svelte:212-215`).
- Subpath and full URL at opacity 0.4-0.5 (`FileNode.svelte:154-155`, `LinkNode.svelte:183-184`, `ImageNode.svelte:90`).
- Empty and error text at opacity 0.3-0.4 (`FileNode.svelte:178-186`). Link card has no empty or error text.
- Shortcut hints at opacity 0.4 (`CanvasContextMenu.svelte:224-227`).
- Group label at 12px `--muted-foreground` (`GroupNode.svelte:36-44`).

## 5. Styling facts

### Raw color literals (non-token)
- Hex: `CanvasContextMenu.svelte:211` `#fb464c` (danger hover text); same value also in palette `canvas.types.ts:6`.
- Hex fallbacks: `CanvasEdge.svelte:66-67` `var(--card, #2a2e3d)`, `var(--foreground, #fff)`.
- Palette hex: `canvas.types.ts:6-11` (red `#fb464c`, orange `#e9973f`, yellow `#e0de71`, green `#44cf6e`, cyan `#53dfdd`, purple `#a882ff`).
- Inline rgba in logic: `canvas.logic.ts:149` and `:151` (`rgba(255,255,255,0.05)`, `rgba(255,255,255,0.2)`) inside a style string.
- rgba white alpha literals: about 50 occurrences across the area. Borders `rgba(255,255,255,.15)` in `CanvasToolbar.svelte:55`, `CanvasContextMenu.svelte:183`, `CanvasFilePicker.svelte:91`, `CanvasLinkInput.svelte:91,108`, `FileNode.svelte:102`, `TextNode.svelte:94`, `ImageNode.svelte:71`, `LinkNode.svelte:140,199`, `CanvasInner.svelte:761,773`. Overlays `rgba(255,255,255,0.05-0.1)` in hover and fill states. Shadows `rgba(0,0,0,.3-.5)` in `CanvasInner.svelte:792,796`, `CanvasContextMenu.svelte:187`, `CanvasFilePicker.svelte:97`, `CanvasLinkInput.svelte:94`.
- Markdown CSS fallbacks: `canvas-markdown.css:91,99,106,129,137,150,163,168` (rgba literals inside `var(..., fallback)`).
- Per-node color alpha by string suffix: `TextNode.svelte:57` `${bgColor}20`, `FileNode.svelte:63` `20`, `LinkNode.svelte:95` `20`, `GroupNode.svelte:18` `10` and `:19` `60`, `ImageNode.svelte:52` `60`. Assumes `resolveColor` returns a 6-digit hex (`canvas.logic.ts:57-60`).

### Theme tokens used
- Shared: `--card`, `--background`, `--foreground`, `--muted`, `--muted-foreground`, `--primary`, `--primary-foreground`.
- xyflow overrides: `--xy-*` set on `.svelte-flow` in `CanvasInner.svelte:758-775`; toolbar reads `--xy-controls-button-*` with `rgba` fallbacks (`CanvasToolbar.svelte:55-56`).
- Markdown: `--syntax-heading1..6`, `--syntax-strong`, `--syntax-emphasis`, `--syntax-strikethrough`, `--syntax-link`, `--syntax-code`, `--syntax-quote` (`canvas-markdown.css:33-133`). `--lp-*` live-preview tokens with fallbacks (`canvas-markdown.css:89-168`). `--heading-h1..h6-*` (`canvas-markdown.css:29-73`).
- Theme variance: `app.css:158` (`:root`, `--card: oklch(1 0 0)`, white) and `app.css:219` (dark, `--card: #2a2e3d`). Light theme is real. The white-alpha border and overlay literals above are not theme-aware: on the light `:root`, `rgba(255,255,255,.15)` borders sit on a white card. Verified by reading only; not rendered.

### Hard-coded font sizes (px)
- 11px: `CanvasEdge.svelte:70`, `FileNode.svelte:154`, `ImageNode.svelte:89`, `LinkNode.svelte:183`, `CanvasContextMenu.svelte:219,225`, `CanvasFilePicker.svelte:139`.
- 12px: `CanvasContextMenu.svelte:199`, `CanvasLinkInput.svelte:140`, `FileNode.svelte:180,186`, `GroupNode.svelte:40`.
- 13px: `TextNode.svelte:97,119`, `FileNode.svelte:105`, `LinkNode.svelte:143,203`, `CanvasFilePicker.svelte:106,128,150`, `CanvasLinkInput.svelte:112`.
- 14px: `CanvasLinkInput.svelte:99`, `CanvasInner.svelte:746`.
- Markdown: relative em values with token fallbacks, `canvas-markdown.css:29-73`, `0.9em` at `:119,158`.

### Border radius (px, mixed)
- 0: `CanvasToolbar.svelte:68,72`. 4px: `CanvasContextMenu.svelte:201`, `CanvasFilePicker.svelte:130`, `FileNode.svelte:117`, `LinkNode.svelte:153`, `CanvasEdge.svelte:69`, `canvas-markdown.css:110`. 6px: `CanvasLinkInput.svelte:109` (inputs) and `:140` (buttons). 8px: `CanvasInner.svelte:741,780`, `TextNode.svelte:93`, `ImageNode.svelte:72`, `GroupNode.svelte:30`, `CanvasContextMenu.svelte:184`, `CanvasFilePicker.svelte:92`, `CanvasLinkInput.svelte:92`. 50%: `ColorPicker.svelte:50`, `CanvasInner.svelte:802` (resize handle). Line numbers for the 4px/6px/8px rows are approximate to the nearest declaration; the file contents are authoritative.
- Note: `CanvasLinkInput.svelte` uses both 6px (inputs and buttons) and 8px (dialog).

### Spacing (px, mixed)
- Node padding `12px 16px` (`TextNode.svelte:92`, `FileNode.svelte:100`, `LinkNode.svelte:138`). Image placeholder `16px` (`ImageNode.svelte:84`).
- Menu padding `4px`, items `6px 10px`, labels `6px 10px 2px` (`CanvasContextMenu.svelte:185,195,218`).
- Picker input `10px 14px` (`CanvasFilePicker.svelte:101`), picker item `6px 10px` (`:124`), dialog padding `16px` (`CanvasLinkInput.svelte:95`).
- Add-card button `8px 20px` (`CanvasInner.svelte:741`).
- Color picker gap `4px`, padding `6px 10px` (`ColorPicker.svelte:42-43`).
- Toolbar `bottom: 118px; left: 10px` magic number (`CanvasToolbar.svelte:45-46`), chosen to sit above the xyflow Controls at bottom-left (`CanvasInner.svelte:632`).

### Z-index
- 5: `CanvasToolbar.svelte:47`.
- 10: `CanvasContextMenu.svelte:181`, `CanvasInner.svelte:733` (empty hint).
- 50: `CanvasFilePicker.svelte:82`, `CanvasLinkInput.svelte:82`. Both pickers rendered twice in tree (`CanvasInner.svelte:698-713`) but only one is open at a time.
- xyflow Controls/MiniMap z-index: not checked.

### Shadows
- Node: `0 2px 8px rgba(0,0,0,.3)` (`CanvasInner.svelte:792`), selected adds `0 0 0 2px var(--primary)` (`:796`).
- Menu: `0 4px 16px rgba(0,0,0,.4)` (`CanvasContextMenu.svelte:187`).
- Dialogs: `0 8px 32px rgba(0,0,0,.5)` (`CanvasFilePicker.svelte:97`, `CanvasLinkInput.svelte:94`).

### Inline styles
- Reconnect anchors: `style="background: var(--primary); border-radius: 50%; width: 12px; height: 12px; border: 2px solid var(--background);"` duplicated, `CanvasEdge.svelte:53,60`.
- Edge stroke via string `stroke: ${resolved};`, `CanvasInner.svelte:440`.
- Node colors via `style:background-color` and `style:border-color`, listed in section above.
- Context menu position via `style:top|left|right|bottom`, `CanvasContextMenu.svelte:90-93`.
- Color dot background `style:background-color={hex}`, `ColorPicker.svelte:31`.

### Custom CSS files
- `canvas-markdown.css` (173 lines), imported globally from `CanvasInner.svelte:16`. Scoped by `.canvas-node-content`. Test asserts heading rules: `src/tests/lib/features/canvas/canvas-markdown-css.test.ts`.
- Global overrides of xyflow inside `CanvasInner.svelte:757-816` via `:global`.

### Transitions and animations
- `transition: all 0.15s`: `CanvasToolbar.svelte:62`, `CanvasInner.svelte:748` (`add-card-btn`). Only two uses of `all`.
- `transition` 0.15s on single properties: `CanvasInner.svelte:811` (opacity), `ColorPicker.svelte:56` (border-color), `FileNode.svelte:120` (background), `FileNode.svelte:137` (opacity), `LinkNode.svelte:156` (background).
- fitView duration 300ms: `CanvasInner.svelte:283,289,422,658`.
- Sync debounce 300ms: `CanvasInner.svelte:241`.
- Infinite spinner: `animate-spin` on `Loader2`, `FileNode.svelte:78`.
- `prefers-reduced-motion`: no matches in any canvas file. Spinner, transitions and fitView animation do not check it.

### Radius and token guard
- `src/tests/lib/radius-scale.test.ts:164-173` counts px border-radius per canvas file as a frozen baseline. New px radii in canvas files fail or require a baseline bump.

## 6. Copy inventory and inconsistencies

### Terminology drift
- "card" vs "text card" vs "node" vs "note" vs "file": `+ Add card` (`CanvasInner.svelte:606`), `Add text card` (`CanvasToolbar.svelte:25`, `CanvasContextMenu.svelte:98`), `Add note from vault` (`CanvasToolbar.svelte:28`, `CanvasContextMenu.svelte:101`), `Open in editor` (`CanvasContextMenu.svelte:129`), `Could not load file` (`FileNode.svelte:81`), `Empty file` (`FileNode.svelte:85`), `Unknown file` (`FileNode.svelte:23`). Code also says node. User-visible kinds are: text card, note card, link card, image card, group.
- Verb drift: `Add ...` for four items, `Create group` for the group item (`CanvasToolbar.svelte:37`, `CanvasContextMenu.svelte:110`).
- "vault" vs "note" vs "file": `Search vault files...` (`CanvasFilePicker.svelte:57`), `Add note from vault` (above), `No files found` (`:67`). The picker lists `.md` only (default extensions, `CanvasFilePicker.svelte:16`).
- Shortcut label `Ctrl+A` (`CanvasContextMenu.svelte:115`) while handler accepts Cmd or Ctrl (`CanvasInner.svelte:269,276`). On macOS the displayed shortcut does not match the key the user presses.
- Delete shortcut (Backspace/Delete, `CanvasInner.svelte:627`) is not listed in the menu. Undo/redo shortcuts (`:292-318`) are not listed anywhere in the UI.
- Shift+1 and Shift+2 zoom shortcuts: only Shift+1 is listed in menu (`CanvasContextMenu.svelte:119`). Shift+2 (zoom to selection) is not listed.

### Placeholder and hint copy
- `Type something...` (`TextNode.svelte:69`) and `Double-click to edit` (`TextNode.svelte:76`). The first is shown inside the textarea only after the user has already entered edit mode. Ellipsis character style: three periods.
- `Search vault files...` (`CanvasFilePicker.svelte:57`).
- `https://example.com` (`LinkNode.svelte:107`, `CanvasLinkInput.svelte:58`).
- `Title (optional)` (`LinkNode.svelte:114`, `CanvasLinkInput.svelte:64`).

### Labels and buttons
- `Add link` dialog title (`CanvasLinkInput.svelte:52`), buttons `Cancel` (`:67`) and `Add` (`:68`). Sentence case, consistent.
- Color label `Color` (`CanvasContextMenu.svelte:139,157`). Color titles: `No color` (`ColorPicker.svelte:24`) and bare numbers `1`..`6` (`ColorPicker.svelte:34`). Presets have names in the source map, but the UI shows numbers only. Inconsistent with the "No color" title.
- Menu item labels: `Edit`, `Open in editor`, `Open URL`, `Edit label`, `Duplicate`, `Delete`, `Go to source`, `Go to target`, `Select all`, `Zoom to fit`. Sentence case throughout. `Edit label` is dead (see Interaction > Context menus).
- Dead-copy risk: `Open in editor`, `Open URL`, `Edit label` strings exist in the component but never show.

### Error and fallback copy
- `Could not load file` (`FileNode.svelte:81`), no period, no action, no file name.
- `Unknown URL` (`LinkNode.svelte:31`) vs `Unknown file` (`FileNode.svelte:23`). Same pattern, different noun.
- `Untitled.canvas` (`canvas.service.ts:9`). No other user-visible default name in the feature.

### Other
- Empty-hint button label `+ Add card` uses a literal `+` in the text (`CanvasInner.svelte:606`); toolbar and menu use icons, not `+`.
- Canvas copy language: all English, as the rule requires.

## 7. Dialog and popover inventory

| Surface | Trigger | Dismiss | Focus on open | Location |
|---|---|---|---|---|
| Context menu | right click pane, node, edge | pointerdown on pane, menu item, color pick | none (not focused) | `CanvasInner.svelte:338-363`, `CanvasContextMenu.svelte` |
| Vault file picker | toolbar, pane menu, drop | Escape, backdrop click, select | input via rAF | `CanvasFilePicker.svelte:41-45` |
| Image picker | toolbar, pane menu | same as above | same | `CanvasInner.svelte:708-713` |
| Link dialog | toolbar, pane menu | Escape, Cancel, backdrop click, Add | URL input via rAF | `CanvasLinkInput.svelte:41-45` |
| Link edit (inline) | double-click link card, context menu Edit | Enter, Escape, blur | URL input via rAF | `LinkNode.svelte:43-77` |
| Text edit (inline) | double-click text card, context menu Edit | Escape, blur | textarea via rAF | `TextNode.svelte:28-36` |
| Color picker | node or edge context menu | selection closes the menu | none | `ColorPicker.svelte` |

Dialog z-index 50 and backdrop `rgba(0,0,0,.5)` (`CanvasFilePicker.svelte:81`, `CanvasLinkInput.svelte:81`). Pickers are `position: fixed`, the context menu is `absolute` inside the board.

## 8. Notes on what was not verified

- xyflow default styling and a11y (Controls, MiniMap, node focus, handle focus) is not in this area and was not inspected in `node_modules`.
- Whether `@lucide/svelte` icons render `aria-hidden` by default was not checked.
- No rendering or screenshots taken. Light-theme contrast claims are from token values only.
- `canvas.logic.ts` and `canvas-history.logic.ts` internals were only read where they touch styling or copy.
