# 14: Canvas image nodes load their image: the main capability grants fs:allow-read-file on the vault roots

**What to build:** resolveImageSrc (src/lib/features/canvas/canvas-image.service.ts:28-40) reads the image with plugin-fs readFile, which invokes plugin:fs|read_file. src-tauri/capabilities/default.json grants read_dir, read_text_file, write_text_file, mkdir, remove, rename, copy_file and exists, but not read_file (the generated ACL maps fs:allow-read-text-file to read_text_file only), so the call is rejected and ImageNode.svelte:35-38 swallows the rejection into the placeholder. Issue 17 fixes the path join but tests with readFile mocked, so it would pass while images still fail. Fix direction: add an fs:allow-read-file entry scoped like fs:allow-read-text-file (both vault roots and their .kokobrain subtrees), and add a test that every plugin-fs function the frontend imports has a granted permission, so a new import cannot silently fail again. Switching canvas images to convertFileSrc instead is an alternative, but it then depends on the asset-scope Issue for ~/kokobrain-vaults.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/architecture/fs-capabilities.test.ts (new file next to layer-rules.test.ts): collect the names imported from '@tauri-apps/plugin-fs' under src/lib and src/routes, map each to its permission (readFile -> fs:allow-read-file, readTextFile -> fs:allow-read-text-file, and so on), and assert each is present in src-tauri/capabilities/default.json. It fails today on readFile.
- [ ] The fs:allow-read-file scope equals the fs:allow-read-text-file scope; no broader path is granted.
- [ ] An image node in a canvas of a vault at either allowed root shows the image (manual check in the app).
- [ ] The existing canvas-image.service.test.ts cases stay green.
- [ ] Both gates: cargo test --manifest-path src-tauri/Cargo.toml, then pnpm check and pnpm vitest run.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/high. Every canvas image node shows the placeholder because plugin:fs|read_file is not granted. Canvas is daily.
- **Trigger:** Open a canvas that has an image node, or add one through the picker or by dragging an image from the file tree. The node always shows the grey placeholder with the path.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/features/canvas/canvas-image.service.ts:1 imports readFile; :35 await readFile(fullPath) (the only readFile import in src/lib, per rg counts) -> src-tauri/capabilities/default.json: fs entries are allow-read-dir, allow-read-text-file (:66), allow-write-text-file, allow-mkdir, allow-remove, allow-rename, allow-copy-file, allow-exists (:189); no allow-read-file, no fs:default -> src-tauri/gen/schemas/acl-manifests.json: allow-read-text-file allows ['read_text_file'], allow-read-file allows ['read_file'] -> src/lib/features/canvas/ImageNode.svelte:26-38 .catch sets error = true -> :54-58 placeholder. Tests mock readFile at the boundary (src/tests/lib/features/canvas/canvas-image.service.test.ts:7,134-150), so nothing exercises the ACL.
- **Related Issues before the audit:** `.scratch/audit-2026-11-04/issues/17-canvas-node-path-resolution.md`
- **Second opinion:** upheld (ux, high). canvas-image.service.ts:35 calls plugin-fs readFile, which invokes plugin:fs|read_file (node_modules plugin-fs dist index.js:470). The ACL manifest maps allow-read-text-file to read_text_file only, and capabilities/default.json has no allow-read-file, read-files or fs:default. Every canvas image node is therefore rejected and falls back to the placeholder. The canvas JSON and the images are intact, so this is ux. Corrections to apply while implementing: Category content -> ux.
- **Source:** audit 2026-11-05, domain `file-io`, finding `N-file-io-02` (from file-io-rust-1). Size S.

## Comments
