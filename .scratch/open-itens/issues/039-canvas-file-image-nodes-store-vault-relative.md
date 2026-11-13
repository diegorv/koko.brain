# 039: Canvas file nodes added in the app load their note, and file nodes resolve both absolute and vault-relative paths

**Origin:** `audit-2026-11-05` Issue 15, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/audit-2026-11-04/issues/17-canvas-node-path-resolution.md` (audit 2026-11-05). Priority: daily use and UI correctness (bucket 2-ux). High likelihood: every file node picked or dropped in the app gets an absolute path and fails to load, which is a display failure rather than lost text. Owner decision D7 (b) is recorded in Notes.

**Audit check (re-read at `318b6e9b5` by the 2026-11-12 deep dive):** still present (ux, high). No resolver exists. FileNode.svelte:40 prefixes vaultStore.path onto the stored path. CanvasFilePicker.svelte:61 passes the absolute `file.path` (from flattenFileTree, file-entries.logic.ts:21) to handleSelect, and handleFileSelected (CanvasInner.svelte:481-487) and the `.md` branch of handleDrop (:574-575) pass it straight to createFileNode (canvas.logic.ts:353-355). A file node added in the app is therefore read at '/vault//vault/...' and shows 'Could not load file' (FileNode.svelte:81). The FileNode click (:55-57) opens data.file raw, so a vault-relative path (the JSON Canvas / Obsidian format) fails there.

**Scope:** file nodes only. The image half (picker and drop image writers, and resolveImageSrc in canvas-image.service.ts) moved to Issue 253, because image nodes cannot load until Issue 038 grants `fs:allow-read-file`: a readFile test with the plugin mocked would pass while every image node still fails in the app.

**What to build:** A note added to a canvas through the file picker or by dragging it from the file tree shows its content, instead of 'Could not load file'. Clicking a file node opens the note whether the .canvas stores an absolute or a vault-relative path. Fix:

- Two pure helpers in canvas.logic.ts. `resolveCanvasFilePath(file, vaultPath)` returns the path unchanged when it is absolute and joins it to the vault when it is relative (unchanged when vaultPath is null). `toVaultRelativePath(path, vaultPath)` strips the vault prefix from a path inside the vault and returns anything else unchanged.
- Readers: FileNode.svelte reads (:40) and opens (:55-57) through `resolveCanvasFilePath`.
- Writers: handleFileSelected and the `.md` branch of handleDrop in CanvasInner.svelte store `toVaultRelativePath(filePath, vaultStore.path)`. Leave handleImageSelected and the image branch of handleDrop to Issue 253.

Canvases already saved with absolute paths keep loading through the resolver; they are not rewritten.

**Blocked by:** 004

**Status:** ready-for-agent

**Answered:** 2026-11-12 (owner): 039 is un-deferred for its file-node half only. It runs after 004, since both edit CanvasInner.svelte. The image half, which needs 038's `fs:allow-read-file` grant, is Issue 253. D7 (b) of 2026-11-04 stands: new nodes store vault-relative paths, reads accept both forms. Nothing open.

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: a FileNode with `data.file` '/vault/notes/a.md' and vaultStore opened at '/vault' calls readTextFile with '/vault/notes/a.md' (readTextFile mocked at the Tauri boundary). It fails today ('/vault//vault/notes/a.md'). Use a component test, or assert the readTextFile argument through the mounted canvas (harness in src/tests/lib/features/canvas/canvas-tab-switch.test.ts).
- [ ] A FileNode with a vault-relative `data.file` 'notes/a.md' reads '/vault/notes/a.md', and a click on its header calls openFileInEditor with '/vault/notes/a.md'. The absolute form opens the same path.
- [ ] canvas.logic.test.ts covers both helpers: `resolveCanvasFilePath` with an absolute in-vault path, an absolute path outside the vault, a vault-relative path and a null vault path; `toVaultRelativePath` with an in-vault absolute path, a sibling path that only shares the prefix ('/vault2/a.md' stays unchanged), an already relative path and a path outside the vault.
- [ ] A test that dropping an absolute `.md` path (text/plain, as FilesNavigator.svelte:256 and NoteRow.svelte:77 set it) and picking one in CanvasFilePicker store a vault-relative `file` in the canvas JSON passed to writeTextFile.
- [ ] Frontend gate green.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/archived/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 3 of the parallel plan.
- **Finding `canvas-abs-path`:** real, medium. Root cause: Canvas writers store the absolute FileTreeNode.path in node.file (picker and drag-drop), while the readers prefix vaultStore.path, which gives '/vault//vault/x.md'. FileNode's click handler instead passes data.file raw to openFileInEditor, so a vault-relative path fails there. No single resolver handles both forms.
- **Owner decision (2026-11-04):** D7 (b): new nodes store vault-relative paths (JSON Canvas / Obsidian format); reads accept both absolute and vault-relative.
- **Code pointers (HEAD `318b6e9b5` to `635b4af36`):** writers CanvasFilePicker.svelte:21-24 and :61, CanvasInner.svelte handleFileSelected :481-487 and handleDrop :558-584 (drop text/plain set by FilesNavigator.svelte:256 and NoteRow.svelte:77, absolute). Reader FileNode.svelte:40 (error UI at :81), click :55-57. The file name shown in the header (FileNode.svelte:23) takes the last segment, so it is the same for both forms. Never mock canvas.logic.ts in the tests.
- **Series:** blocked by 004 because both edit CanvasInner.svelte; never run it beside another CanvasInner.svelte Issue (004, 026, 027, 052, 253). Issue 100 (canvas file nodes follow a note rename) is blocked by this Issue; once nodes store vault-relative paths, 100 must match both forms through `resolveCanvasFilePath`.
- **Nothing else reads node.file** (no rename or link-updater leg today; canvas.logic.ts:206 only copies it), so storing relative paths is safe.
- **Size:** S.

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, high). Confirmed. flattenFileTree returns node.path (file-entries.logic.ts:21), which is absolute. CanvasFilePicker.svelte:61 passes it to handleSelect. handleFileSelected and handleImageSelected and handleDrop store it unchanged through createFileNode and createImageNode (canvas.logic.ts:353-372). The readers then prefix the vault path again (FileNode.svelte:40, canvas-image.service.ts:33-34), producing '/vault//vault/x' and 'Could not load file'. The FileNode click opens data.file raw, so vault-relative (Obsidian) paths fail there. The note text is untouched: this is a display failure. Its line corrections are folded into the code pointers above.

## Comments

- 2026-11-06: migrated from `.scratch/archived/audit-2026-11-04/issues/17-canvas-node-path-resolution.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-12: the deep dive (validate-s5+s6, cross-tests-relay H5, critique M9) confirmed the bug and rated it high for a daily canvas user. By owner decision the Issue is un-deferred for its file-node half only and blocked by 004 (shared CanvasInner.svelte). The image half (image writers, resolveImageSrc and its readFile test, which passes with the plugin mocked while the missing `fs:allow-read-file` grant still breaks every image node) moved to new Issue 253, blocked by 038. The old canvas.logic.ts blocker note (Issue 13) and the stale line numbers were removed; the criteria now test FileNode's read and click and the two writers.
