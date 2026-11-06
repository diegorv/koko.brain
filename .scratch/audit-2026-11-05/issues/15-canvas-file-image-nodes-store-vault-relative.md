# 15: Canvas file and image nodes store vault-relative paths and resolve both absolute and vault-relative ones

**Migrated from:** `.scratch/audit-2026-11-04/issues/17-canvas-node-path-resolution.md` (audit 2026-11-05). Priority: daily use and UI correctness (bucket 2-ux). High likelihood: every picked or dropped node gets an absolute path and fails to load, which is a display failure rather than lost text. Its Blocked-by 13 only avoided a merge conflict in canvas.logic.ts, so it is dropped, and owner decision D7 (b) is recorded.

**Audit check at `5f8003d67`:** still_present (content, high). No resolver exists. src/lib/features/canvas/canvas-image.service.ts:33-34 and src/lib/features/canvas/FileNode.svelte:40 prefix vaultStore.path onto the stored path. src/lib/features/canvas/CanvasFilePicker.svelte:61 passes the absolute file.path to handleSelect, and CanvasInner.svelte:481-496 (handleFileSelected/handleImageSelected) and the drop handler (~:556-575) pass it straight to createFileNode/createImageNode (canvas.logic.ts:353-372). A node added in the app is therefore read at '/vault//vault/...' and shows 'Could not load file' (FileNode.svelte:81). FileNode.svelte:56 opens data.file raw. No commit since f37acb402 touches src/lib/features/canvas.

**Stale in the text below:** Line numbers match HEAD. The Blocked-by 13 status was not checked. Likelihood is high for this owner: every file or image node added from the picker or by drag is affected.

**What to build:** A note or image added to a canvas through the file picker or by dragging it from the file tree shows its content, instead of 'Could not load file' or a broken image. Clicking a file node opens the note whether the .canvas stores an absolute or a vault-relative path (Obsidian-made canvases are vault-relative). Fix: one pure resolver (e.g. resolveCanvasFilePath(file, vaultPath) in canvas.logic.ts) that returns the path unchanged when it is already absolute and joins it to the vault when it is relative. Use it in FileNode.svelte (read at :40 and click at :55) and in canvas-image.service.ts resolveImageSrc. Writers (handleFileSelected, handleImageSelected, handleDrop in CanvasInner.svelte) store vault-relative paths.

**Blocked by:** none

**Status:** ready-for-agent

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

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, high). Confirmed. flattenFileTree returns node.path (file-entries.logic.ts:21), which is absolute. CanvasFilePicker.svelte:61 passes it to handleSelect. handleFileSelected and handleImageSelected (CanvasInner.svelte:481-496) and handleDrop (:558-583, absolute text/plain set by FilesNavigator.svelte:253 and NoteRow.svelte:72) store it unchanged through createFileNode and createImageNode (canvas.logic.ts:353-372). The readers then prefix the vault path again (FileNode.svelte:40, canvas-image.service.ts:33-34), producing '/vault//vault/x' and 'Could not load file'. The FileNode click (:56-58) opens data.file raw, so vault-relative (Obsidian) paths fail there. Nothing else reads node.file (no rename or link-updater leg), so storing relative paths is safe. The note text is untouched: this is a display failure. Corrections to apply while implementing: The header verdict says 'content, high'. It is ux, as the Issue's own bucket says. 'Line numbers match HEAD' is wrong for the Notes: CanvasInner handleFileSelected/handleImageSelected are at :481-496 (not :465-476), handleDrop at :558-583 (not :541-559), FilesNavigator setData at :253 (not :246), NoteRow at :72 (not :70), and the FileNode click handler at :56-58 (not :55).

## Comments

- 2026-11-06: migrated from `.scratch/audit-2026-11-04/issues/17-canvas-node-path-resolution.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
