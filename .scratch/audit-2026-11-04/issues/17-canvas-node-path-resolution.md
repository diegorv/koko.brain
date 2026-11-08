# 17: Canvas file and image nodes resolve both absolute and vault-relative paths

**What to build:** A note or image added to a canvas through the file picker or by dragging it from the file tree shows its content, instead of 'Could not load file' or a broken image. Clicking a file node opens the note whether the .canvas stores an absolute or a vault-relative path (Obsidian-made canvases are vault-relative). Fix: one pure resolver (e.g. resolveCanvasFilePath(file, vaultPath) in canvas.logic.ts) that returns the path unchanged when it is already absolute and joins it to the vault when it is relative. Use it in FileNode.svelte (read at :40 and click at :55) and in canvas-image.service.ts resolveImageSrc. Writers (handleFileSelected, handleImageSelected, handleDrop in CanvasInner.svelte) store vault-relative paths.

**Blocked by:** 13

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: in src/tests/lib/features/canvas/canvas-image.service.test.ts, with vaultStore opened at '/vault' and readFile mocked (Tauri boundary), resolveImageSrc('/vault/assets/pic.png') calls readFile with '/vault/assets/pic.png'. It fails today ('/vault//vault/assets/pic.png').
- [ ] The existing vault-relative case ('assets/pic.png' read as '/vault/assets/pic.png') stays green.
- [ ] canvas.logic.test.ts covers the resolver: absolute in-vault path, vault-relative path, null vault path, and an http URL left untouched.
- [ ] FileNode reads and opens through the resolver, checked by a component test or by asserting the readTextFile/openFileInEditor argument for both forms.
- [ ] A test that the picker and drop handlers store a vault-relative file in the serialized canvas.
- [ ] Frontend gate green.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 3 of the parallel plan.
- **Finding `canvas-abs-path`:** real, medium. Root cause: Canvas writers store the absolute FileTreeNode.path in node.file (picker and drag-drop), while both readers prefix vaultStore.path, which gives '/vault//vault/x.md'. FileNode's click handler instead passes data.file raw to openFileInEditor, so a vault-relative path (the JSON Canvas/Obsidian format) fails there. No single resolver handles both forms.
  Evidence: CanvasFilePicker.svelte:21 and :61 return file.path from flattenFileTree (file-entries.logic.ts:21, node.path, which is absolute per the CLAUDE.md absolute-path convention). CanvasInner.svelte:465-476 handleFileSelected/handleImageSelected and :541-559 handleDrop (FilesNavigator.svelte:246 and NoteRow.svelte:70 set an absolute path as text/plain) store it unchanged via createFileNode/createImageNode (canvas.logic.ts:353-372). Readers: FileNode.svelte:40 `${vaultStore.path}/${filePath}` (error UI at :81) and canvas-image.service.ts:33-34 (used by ImageNode.svelte:26). FileNode.svelte:55 openFileInEditor(data.file) with no resolution.
- **Blocking edge:** Both tickets edit canvas.logic.ts; the edge avoids a merge conflict.
- **Owner decision (2026-11-04):** D7 (b): new nodes store vault-relative paths (JSON Canvas / Obsidian format); reads accept both absolute and vault-relative.
- Writers: CanvasFilePicker.svelte:61 (file.path, absolute), CanvasInner.svelte:465-476 and :541-559 (drop text/plain from FilesNavigator.svelte:246 / NoteRow.svelte:70, absolute). Readers: FileNode.svelte:40, canvas-image.service.ts:33-34 (used by ImageNode.svelte:26). The click at FileNode.svelte:55 breaks for relative paths. Never mock canvas.logic.ts in the tests.
- **Size:** S.

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/039-canvas-file-image-nodes-store-vault-relative.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
