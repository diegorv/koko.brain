# 038 discovery

No `spec.md` exists in `.scratch/open-itens/`; the Issue is self-contained.

## Files that change

- `src-tauri/capabilities/default.json:66-81`: add an `fs:allow-read-file` entry after `fs:allow-read-text-file`, same four globs.
- `src/tests/lib/architecture/fs-capabilities.test.ts`: the file already exists (Issue 10's asset-scope test, stat test). Add a describe block there instead of creating it: scan `src/lib` + `src/routes` (`.ts`, `.js`, `.svelte`, walk copied from `raw-invoke.test.ts:58-64`) for `import { ... } from '@tauri-apps/plugin-fs'`, map each name to its permission, assert each is granted; unmapped name fails. Plus: read-file scope equals read-text-file scope.
- `src/lib/features/canvas/canvas.logic.ts`: add `resolveCanvasFilePath(file, vaultPath)` and `toVaultRelativePath(path, vaultPath)` (pure).
- `src/lib/features/canvas/canvas-image.service.ts:33-35`: read `resolveCanvasFilePath(filePath, vaultStore.path)`.
- `src/lib/features/canvas/CanvasInner.svelte:505` (handleImageSelected) and `:586` (image branch of handleDrop): pass `toVaultRelativePath(filePath, vaultStore.path)`; import vaultStore.

## Plan (test-first)

1. fs-capabilities test (red on readFile) -> JSON grant (green). Commit.
2. canvas.logic.test.ts helper cases (red) -> helpers (green). Commit.
3. canvas-image.service.test.ts absolute in-vault case (red) -> resolveImageSrc change (green). Commit.
4. canvas-tab-switch.test.ts: drop an absolute image path and pick one in the image picker; assert the JSON written to the canvas path has `"file":"assets/pic.png"` (red) -> CanvasInner call sites (green). Commit.

## Helper contracts (defaults taken)

- "Absolute" = starts with `/` (macOS/Linux only app; every vault path in the code is POSIX).
- `resolveCanvasFilePath`: absolute -> unchanged; relative + vaultPath -> `${vaultPath}/${file}`; vaultPath null -> unchanged. The empty-path case keeps today's `/vault/` result.
- `toVaultRelativePath`: `path.startsWith(vaultPath + '/')` -> strip it; else (sibling `/vault2`, outside, relative, null vault) unchanged.

## Prior art

- Scanner: `src/tests/lib/architecture/raw-invoke.test.ts`.
- Mount harness: `canvas-tab-switch.test.ts` (autosave test at :239). Picker list reads `fsStore.fileTree` (CanvasFilePicker.svelte:21), so the test seeds `fsStore.setFileTree`; toolbar button `title="Add image"` opens it. The plugin-fs mock needs `readFile` once ImageNode renders.

## Risks

- jsdom has no DragEvent: the drop test dispatches a plain `Event('drop')` with a `dataTransfer` stub on `.canvas-container`.
- Out of scope per the Issue: handleFileSelected, the `.md` drop branch, FileNode.svelte (Issue 039).
