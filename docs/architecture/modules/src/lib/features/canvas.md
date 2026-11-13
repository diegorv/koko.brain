---
summary: "Frontend .canvas (JSON Canvas) editor built on Svelte Flow, plus new-canvas file creation."
---

## Responsibility

Owns the .canvas editor: parsing and serializing JSON Canvas data, converting it to and from Svelte Flow nodes and edges, rendering the five node kinds (text, file, link, group, image) and edges, and the editing interactions on top (drag and drop from the file explorer, context menus, file and link pickers, color, grouping, undo and redo). It also creates new empty .canvas files. It does not load or save the file: the editor tab holds the content and the canvas hands serialized JSON back through onJsonChange. It owns no Rust code, Tauri command or event.

## Key files

- `src/lib/features/canvas/CanvasView.svelte`: Entry component mounted by the editor for canvas tabs; wraps CanvasInner in the Svelte Flow provider and takes path, jsonContent and onJsonChange.
- `src/lib/features/canvas/CanvasInner.svelte`: Main editor: Svelte Flow state, sync from jsonContent, debounced persist, undo and redo, shortcuts, context menus and drop handling.
- `src/lib/features/canvas/canvas.logic.ts`: Pure conversion layer: parseCanvas, serializeCanvas, canvasToFlow, flowToCanvas, group containment, color resolution, node factories.
- `src/lib/features/canvas/canvas.types.ts`: JSON Canvas types (CanvasNode union, CanvasEdge, CanvasData) and the preset color map.
- `src/lib/features/canvas/canvas-history.logic.ts`: Undo and redo stack over Svelte Flow snapshots, compared by object identity.
- `src/lib/features/canvas/canvas.service.ts`: createCanvasFile, used by callers outside the folder to create a new canvas.
- `src/lib/features/canvas/canvas-image.service.ts`: Resolves image node sources: external URLs directly, vault files read into blob URLs.
- `src/lib/features/canvas/canvas-markdown.logic.ts`: Renders text card markdown to sanitized HTML.

## State

- No persistent state of its own. Canvas content lives in the editor tab as raw JSON text and is written by the editor save flow.
- Per-instance state in CanvasInner.svelte: Svelte Flow nodes and edges, lastSyncedJson and lastSyncedData, undo and redo history, and the pending persist timer.
- Blob URLs created by canvas-image.service.ts for vault images, revoked in ImageNode.svelte.

## Collaborators

- `src/lib/app`: EditorView mounts CanvasView and passes the tab content and persist callback; commands.ts creates canvases for the command palette.
- `src/lib/core/editor`: openFileInEditor opens dropped .canvas files and file-node targets.
- `src/lib/core/filesystem`: createFile for new canvases, and fsStore.fileTree with flattenFileTree and filterAndRank for CanvasFilePicker.
- `src/lib/core/vault`: vaultStore.path to build absolute paths for file and image nodes.
- `src/lib/utils`: sanitizeHtml for markdown cards and isSafeUrl before opening link nodes.
- `src/lib/features/rail-shell`: FilesNavigator offers New Canvas through createCanvasFile.

## Gotchas

- Persistence is a one-way handoff: CanvasInner calls onJsonChange(ownPath, json) after a debounce and again on destroy if a persist is pending. ownPath is read once with untrack so a tab switch cannot redirect a late write.
- External content syncs set a syncing flag that suppresses the debounced persist and is cleared in queueMicrotask. Undo and redo use the same flag around their own persist.
- A malformed .canvas file loads as an empty canvas because parseCanvas catches JSON errors. The next persist after an edit writes that empty structure over the file.
- History dedupe and undo compare node and edge object references, so changes must produce new objects instead of mutating existing ones.
- Group membership is absolute coordinates in the file and relative coordinates inside Svelte Flow. Reparenting, un-parenting, group deletion and canvasToFlow each convert between the two.
- canvas.logic.ts imports runtime values (Position, MarkerType) from @xyflow/svelte and canvas-history.logic.ts imports its types; both package edges are allowlisted in src/tests/lib/architecture/pure-logic.test.ts.
- Dropping a .canvas file opens it as a tab. Dropping an image adds an image node, a .md file adds a file node, and other types are ignored.
- Vault image blob URLs are revoked by ImageNode.svelte on change and unmount, not by canvas-image.service.ts.
- External links open through the opener plugin only after isSafeUrl passes. Markdown cards go through sanitizeHtml after rendering.
- No IPC is called directly. File reads use @tauri-apps/plugin-fs; new canvases are created through core/filesystem createFile.
