# 038: Canvas image nodes load their image: the main capability grants fs:allow-read-file, and image nodes store and resolve vault-relative paths

**Origin:** `audit-2026-11-05` Issue 14, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Issue 253 (the image half of 039, split on 2026-11-12 after the deep dive in `research/deep-dive-2026-11-12/`, critique.md M9, cross-tests-relay.md H5) merged into this Issue on 2026-11-13 on the owner's approval. Issue numbers in this text use this folder's numbering.

**What to build:** an image node in a canvas shows its image, whether it was added in the app (picker or drag from the file tree) or read from a .canvas that stores an absolute or a vault-relative path. Two causes stack today, and both are fixed here.

**Part 1: the read permission.** resolveImageSrc (src/lib/features/canvas/canvas-image.service.ts:28-40) reads the image with plugin-fs readFile, which invokes plugin:fs|read_file. src-tauri/capabilities/default.json grants read_dir, read_text_file, write_text_file, mkdir, stat, remove, rename, copy_file and exists, but not read_file (the generated ACL maps fs:allow-read-text-file to read_text_file only), so the call is rejected and ImageNode.svelte:35-38 swallows the rejection into the placeholder.

- Add an `fs:allow-read-file` entry scoped exactly like `fs:allow-read-text-file` (default.json:66-81: `$DOCUMENT/kokobrain-vaults/**`, `$DOCUMENT/kokobrain-vaults/**/.kokobrain/**`, `$HOME/kokobrain-vaults/**`, `$HOME/kokobrain-vaults/**/.kokobrain/**`). No broader path.
- Add a test that every function the frontend imports from `@tauri-apps/plugin-fs` has a granted permission, so a new import cannot silently fail again. Today `readFile` (canvas-image.service.ts:1) is the only import without one; `stat` (mod-vault.service.ts) is granted as `fs:allow-stat`.
- Switching canvas images to convertFileSrc is not the fix: it would depend on the asset scope for ~/kokobrain-vaults.

**Part 2: the path.** handleImageSelected (CanvasInner.svelte:503-509) and the image branch of handleDrop (:585-586) store the absolute path from the picker (CanvasFilePicker.svelte:61) or the drag (FilesNavigator.svelte:256, NoteRow.svelte:77) through createImageNode (canvas.logic.ts:370-372), and resolveImageSrc prefixes vaultStore.path again at :33-34, so it reads '/vault//vault/...'. Owner decision D7 (b) of 2026-11-04 applies: new nodes store vault-relative paths, reads accept both forms.

- Two pure helpers in canvas.logic.ts, as Issue 039 describes them (039 has not landed; it reuses them later): `resolveCanvasFilePath(file, vaultPath)` returns the path unchanged when it is absolute and joins it to the vault when it is relative (unchanged when vaultPath is null). `toVaultRelativePath(path, vaultPath)` strips the vault prefix from a path inside the vault and returns anything else unchanged. Do not import `toVaultRelativePath` from `features/search/semantic-index-status.logic.ts`: it has another contract (it returns null).
- resolveImageSrc keeps http(s) URLs unchanged and otherwise reads `resolveCanvasFilePath(filePath, vaultStore.path)`.
- handleImageSelected and the image branch of handleDrop store `toVaultRelativePath(filePath, vaultStore.path)`. Leave handleFileSelected, the `.md` branch of handleDrop and FileNode.svelte to Issue 039.

Canvases already saved with absolute paths keep loading through the resolver; they are not rewritten.

**Blocked by:** none

**Blocked by (origin):** closed blockers dropped: audit-2026-11-05 10.

**Status:** resolved

**Answered:** owner, 2026-11-13: merge 253 into 038 and run them together. D7 (b) of 2026-11-04 stands. Nothing open.

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`. No e2e: every e2e and vitest run mocks plugin-fs, so none of them sees the permission.

- [x] Failing test first, in src/tests/lib/architecture/fs-capabilities.test.ts (new file next to layer-rules.test.ts): collect the names imported from '@tauri-apps/plugin-fs' under src/lib and src/routes, map each to its permission (readFile -> fs:allow-read-file, readTextFile -> fs:allow-read-text-file, and so on), and assert each is present in src-tauri/capabilities/default.json. It fails today on readFile. An imported name with no known mapping fails the test too.
- [x] The test also asserts that the fs:allow-read-file scope equals the fs:allow-read-text-file scope.
- [x] Failing test first: in src/tests/lib/features/canvas/canvas-image.service.test.ts, with vaultStore opened at '/vault' and readFile mocked (Tauri boundary), resolveImageSrc('/vault/assets/pic.png') calls readFile with '/vault/assets/pic.png'. It fails today ('/vault//vault/assets/pic.png').
- [x] The existing cases in canvas-image.service.test.ts stay green: vault-relative 'assets/pic.png' reads '/vault/assets/pic.png', a raw path with no vault open, the http URL case with no readFile call, and the MIME cases.
- [x] canvas.logic.test.ts covers both helpers: `resolveCanvasFilePath` with an absolute in-vault path, an absolute path outside the vault, a vault-relative path and a null vault path; `toVaultRelativePath` with an in-vault absolute path, a sibling path that only shares the prefix ('/vault2/a.png' stays unchanged), an already relative path and a path outside the vault.
- [x] A test that dropping an absolute image path (text/plain) and picking one in the image picker store a vault-relative `file` in the canvas JSON passed to writeTextFile (harness in src/tests/lib/features/canvas/canvas-tab-switch.test.ts).
- [x] Both gates green.

## Notes

- **Size:** S. About 12 lines of JSON, two helpers of a few lines each, three one-line call-site changes, and the tests above.
- **Why the readFile test is not enough:** every vitest file mocks `@tauri-apps/plugin-fs`, so the path tests pass while a missing permission still breaks every image node in the app. Only `fs-capabilities.test.ts` covers the grant.
- **Owner check after delivery (not an acceptance criterion):** in a canvas, add an image through the picker and one by drag; both show the image, and so does an image node in an older canvas that stored an absolute path.
- **Series:** edits CanvasInner.svelte and canvas.logic.ts like 039, 026, 027 and 052; never run it beside them. 039 runs after this Issue and uses its helpers.
- **Evidence (verified by reading code at `5f8003d67`, re-checked at `3c6e74e20`):** src/lib/features/canvas/canvas-image.service.ts:1 imports readFile; :35 await readFile(fullPath) (the only readFile import in src/lib) -> src-tauri/capabilities/default.json: fs entries are allow-read-dir, allow-read-text-file (:66), allow-write-text-file, allow-mkdir, allow-stat, allow-remove, allow-rename, allow-copy-file, allow-exists; no allow-read-file, no fs:default -> src-tauri/gen/schemas/acl-manifests.json: allow-read-text-file allows ['read_text_file'], allow-read-file allows ['read_file'] -> src/lib/features/canvas/ImageNode.svelte:26-38 .catch sets error = true -> :54-58 placeholder. Tests mock readFile at the boundary (src/tests/lib/features/canvas/canvas-image.service.test.ts), so nothing exercises the ACL.
- **Priority:** daily use and UI correctness (bucket 2-ux). The canvas JSON and the images are intact; only the display fails.
- **Related Issues before the audit:** `.scratch/archived/audit-2026-11-04/issues/17-canvas-node-path-resolution.md`

## Comments

- 2026-11-06: Blocked by 10 added after the order review (`raw/first-wave-order-review.json`): the two edit the same code.
- 2026-11-12: the image half of 039 became Issue 253, blocked by this Issue.
- 2026-11-13: Issue 253 merged in on the owner's approval (the permission and the path are both needed before an image shows). Gate stays Both, without `pnpm build` (no dependency change).
- 2026-11-13: delivered from branch issue/038-canvas-image-nodes-load-their-image-main. The main capability grants fs:allow-read-file with the read-text-file scope; new `resolveCanvasFilePath`/`toVaultRelativePath` helpers in canvas.logic.ts; resolveImageSrc reads absolute in-vault paths as is; dropped and picked images store vault-relative paths; fs-capabilities.test.ts checks every plugin-fs import against the grant and fails on imports it cannot parse. Tests: full suite at 2f9d6cda2, 637 files / 16910 tests passed, 54 skipped, 1 todo, exit 0; `pnpm check` 0 errors. Reviews: round 1 APPROVED (review.md), fix round, round 2 APPROVED (review-2.md, no findings).
