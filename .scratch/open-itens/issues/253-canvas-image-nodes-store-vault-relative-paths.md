# 253: Canvas image nodes added in the app store vault-relative paths, and image nodes resolve both absolute and vault-relative ones

**Origin:** split from Issue 039 (the image half) on 2026-11-12, by owner decision after the 2026-11-12 deep dive (`.scratch/open-itens/research/deep-dive-2026-11-12/`, critique.md M9, cross-tests-relay.md H5).

**What to build:** An image added to a canvas through the image picker or by dragging it from the file tree is stored as a vault-relative path, and an image node loads its image whether the .canvas stores an absolute or a vault-relative path. Today handleImageSelected (CanvasInner.svelte:490-496) and the image branch of handleDrop (:572-573) store the absolute path from the picker (CanvasFilePicker.svelte:61) or the drag (FilesNavigator.svelte:256, NoteRow.svelte:77) through createImageNode (canvas.logic.ts:370-372), and resolveImageSrc (canvas-image.service.ts:28-40) prefixes vaultStore.path again at :33-34, so it reads '/vault//vault/...'. Fix:

- resolveImageSrc keeps http(s) URLs unchanged and otherwise reads `resolveCanvasFilePath(filePath, vaultStore.path)`.
- handleImageSelected and the image branch of handleDrop store `toVaultRelativePath(filePath, vaultStore.path)`.

Both helpers come from Issue 039 (canvas.logic.ts). If 039 has not landed, add them here as 039 describes.

The path fix alone does not make images show: resolveImageSrc calls plugin-fs readFile, and src-tauri/capabilities/default.json grants `fs:allow-read-text-file` (:66) but not `fs:allow-read-file`, so every image read is rejected and ImageNode.svelte shows the placeholder. Issue 038 adds that grant, which is why this Issue waits for it.

**Blocked by:** 038

**Status:** needs-info

**Answered:** 2026-11-12 (owner): the image half of 039 became this Issue, Status needs-info, blocked by 038. D7 (b) of 2026-11-04 applies: new nodes store vault-relative paths, reads accept both forms. Open: canvas Issue 038 is still deferred; this Issue is launched only after the owner un-defers 038.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: in src/tests/lib/features/canvas/canvas-image.service.test.ts, with vaultStore opened at '/vault' and readFile mocked (Tauri boundary), resolveImageSrc('/vault/assets/pic.png') calls readFile with '/vault/assets/pic.png'. It fails today ('/vault//vault/assets/pic.png').
- [ ] The existing cases in canvas-image.service.test.ts stay green: vault-relative 'assets/pic.png' reads '/vault/assets/pic.png', a raw path with no vault open, the http URL case with no readFile call, and the MIME cases.
- [ ] A test that dropping an absolute image path (text/plain) and picking one in the image picker store a vault-relative `file` in the canvas JSON passed to writeTextFile.
- [ ] Frontend gate green.

## Notes

- **Why the readFile test is not enough:** every vitest file mocks `@tauri-apps/plugin-fs`, so the first criterion passes while the missing permission still breaks every image node in the app. Only 038's `fs-capabilities.test.ts` covers the grant.
- **Owner check after delivery (not an acceptance criterion):** in a canvas, add an image through the picker and one by drag; both show the image, and so does an image node in an older canvas that stored an absolute path.
- **Series:** edits CanvasInner.svelte and canvas.logic.ts like 039 and 004, and canvas-image.service.ts like 038. Run it after 039 and 038; never beside another CanvasInner.svelte Issue (004, 026, 027, 039, 052).
- **Code pointers (HEAD `318b6e9b5` to `635b4af36`):** readFile is imported only in canvas-image.service.ts:1 and called at :35; ImageNode.svelte:26 calls resolveImageSrc and its catch shows the placeholder.
- **Size:** S.

## Comments

- 2026-11-12: created from Issue 039's image half by owner decision after the 2026-11-12 deep dive. Carries 039's resolveImageSrc criteria and adds the writer test; Status needs-info and blocked by 038, because without 038's `fs:allow-read-file` grant the image tests would pass while image nodes still fail (cross-tests-relay H5).
