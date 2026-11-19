# 039 discovery

No `spec.md` exists in `.scratch/open-itens/`; the Issue is self-contained. This repeats Issue 038's pattern for images (`.scratch/open-itens/work/038/`), applied to file nodes. 038 already landed both helpers and their tests.

## Files that change

- `src/lib/features/canvas/FileNode.svelte:40` (read) and `:55-57` (click): resolve `data.file` through `resolveCanvasFilePath(data.file, vaultStore.path)` (canvas.logic.ts:379).
- `src/lib/features/canvas/CanvasInner.svelte:486` (handleFileSelected) and `:590` (`.md` branch of handleDrop): pass `toVaultRelativePath(filePath, vaultStore.path)` (canvas.logic.ts:389, already imported at :41).
- `src/tests/lib/features/canvas/canvas-tab-switch.test.ts`: new describe block for file nodes.

## What differs from 038

- Helpers: nothing to add. canvas.logic.test.ts:704-731 already covers every case criterion 3 lists (absolute in-vault, absolute outside, relative, null vault; in-vault strip, sibling `/vault2`, relative, outside). No missing case.
- Readers are a component (FileNode), not a service, so the read is asserted through the mounted canvas: `readTextFile` (mocked at the Tauri boundary) receives `/vault/notes/a.md`.
- Click: asserted on real state, not a spy. The real `openFileInEditor` runs, so after the header click `editorStore.activeTabPath` is `/vault/notes/a.md` (and the tab exists). editor.service is not mocked.

## Plan (test-first)

1. Tests (red): mounted canvas with a file node `/vault/notes/a.md` and one with `notes/a.md`, vault opened at `/vault`; both read `/vault/notes/a.md` and the header click opens `/vault/notes/a.md`. Drop of absolute `.md` (text/plain) and pick via "Add note from vault" store `notes/a.md` in the JSON written to the canvas path. Then the FileNode and CanvasInner changes (green). One commit for the reader, one for the writers.

## Prior art

- `canvas-tab-switch.test.ts` "canvas image nodes store vault-relative paths" (drop stub with MouseEvent + dataTransfer, picker click on `.picker-item`, `writtenImageFiles`).

## Risks / defaults

- The header click switches the active tab to a markdown note, which mounts the editor in jsdom; the first test in the harness already does this with `M`.
- Existing canvases with absolute paths are not rewritten (Issue scope); the resolver keeps them loading.
- Out of scope: image writers (038), rename following (Issue 100).
