# 50: Quick Capture clipboard screenshots live only in the OS temp dir, so the image is broken at once and lost on purge

**Status:** resolved

Priority: P1 (data loss: the app makes the only copy of the screenshot in a temp dir the editor cannot display and macOS purges)

**What to build:** A clipboard image becomes `ShotSource::Bytes` (src-tauri/src/quick_capture/kind_detect.rs:82-84). `materialize_input` (src-tauri/src/quick_capture/commands.rs:105-117) hands it to `write_shot_bytes_to_temp` (:123-142), which writes `std::env::temp_dir().join("qc-shot-<stamp>.<ext>")` (:139-140, `$TMPDIR` under `/var/folders/...` on macOS) and emits that absolute path as a normal shot payload (:176-184). The frontend writes a Quick Capture note whose body is `![qc-shot-...png](file:///var/folders/.../qc-shot-<stamp>.png)` (src/lib/features/deep-link/deep-link.logic.ts:272-275, `toFileUrl` at :288-291; src/lib/app/deep-link-actions.ts:104-180). The live-preview `ImageWidget` loads `file:` URLs through `host.assetUrl` = `convertFileSrc` (src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:143-161, src/lib/app/editor-host.ts:72-74), and the asset-protocol scope (src-tauri/tauri.conf.json:32-43) lists no temp dir, so the image is broken from the first open. The temp file is the only copy of the screenshot: once macOS cleans `$TMPDIR` and the clipboard has moved on, the capture is an empty link. The doc comment on `executeCaptureAction` (deep-link-actions.ts:98-102) accepts the `file://` link for files the user owns; it does not cover the copy the app itself creates in temp.

Fix: store a clipboard screenshot inside the vault and embed it by a vault-relative path. The Rust capture has no vault: the global-shortcut path (src-tauri/src/lib.rs:56-89) and `capture_clipboard_now` (commands.rs:235-256) emit payloads without one, and the frontend fills the vault in `handleDetectedCapture` (src/lib/plugins/quick-capture/quick-capture.service.ts:85-90). The TS fs plugin cannot read `$TMPDIR` either (`fs:allow-copy-file` and `fs:allow-rename` in src-tauri/capabilities/default.json allow only the vault folders). So:
- Keep the temp write as staging, and mark the payload of a `Shot::Bytes` that `materialize_input` wrote (for example `"staged": true`), carried through `buildCaptureAction` into `CaptureShotAction`. The `kokobrain://capture` URI parser (deep-link.logic.ts:208-220) must not accept the flag, so an external URI cannot ask the app to move a file.
- Add a Rust command that copies a staged shot into a vault folder and returns the new absolute path. It accepts only a `qc-shot-*` file directly inside `std::env::temp_dir()`, refuses a destination outside the vault (`canonicalize` + `starts_with`, as `read_files_batch` does), never overwrites (unique name), and removes the temp file after the copy succeeds.
- In `executeCaptureAction`, for a staged shot, call that command with the capture note's folder (`parentDir`, deep-link-actions.ts:127-128) before writing the note, and render a vault-relative `![[<vault-relative path>]]` embed, which `WikilinkImageEmbedWidget` resolves through `host.resolveLink` (widgets.ts:514-518). If the copy fails, propagate the error so the toast in `executeAction` (src/lib/features/deep-link/deep-link.service.ts:203-205) shows it, and write no note.
- Keep `file://` links for `Shot::Path` inputs (Finder copies, kind_detect.rs:113-116) and for `kokobrain://capture?kind=shot&path=` from external automation: those files belong to the user.

Attachment folder (owner decision 2026-11-02): the image goes in the same folder as its capture note, no attachments subfolder and no new setting. A vault outside the asset-protocol scope still shows no image (issue 37). Line numbers are from 1351a35d; widgets.ts moved since (Issues 46, 47), so re-read them.

**Blocked by:** none

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build` (Rust and frontend)

**Source:** src-tauri/src/quick_capture/commands.rs:99-142, :176-184, :235-256, src-tauri/src/quick_capture/kind_detect.rs:79-84, src-tauri/src/lib.rs:56-89, src-tauri/tauri.conf.json:32-43, src-tauri/capabilities/default.json, src/lib/plugins/quick-capture/quick-capture.service.ts:9-33, :78-100, src/lib/features/deep-link/deep-link.logic.ts:208-220, :272-291, src/lib/app/deep-link-actions.ts:98-180, src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:143-161, :514-518

- [x] Failing test comes first. The audit has no repro test (trace only), so write the red tests first: a Rust test that a staged shot copied by the new command lands inside the given vault folder with the same bytes, and a frontend test in `src/tests/lib/features/deep-link/deep-link.service.test.ts` that a staged shot capture writes a note whose embed is a vault-relative `![[...]]`, not `file://` to the temp dir
- [x] A clipboard screenshot capture leaves the image file inside the vault and the temp file removed
- [x] The capture note embeds the image by a vault-relative path that `WikilinkImageEmbedWidget` resolves to the copied file
- [x] The copy command refuses a source that is not a `qc-shot-*` file directly in the temp dir, and a destination outside the vault
- [x] A `kokobrain://capture?kind=shot&path=...` URI and a Finder-copied image still produce a `file://` link to the user's file, and the URI parser ignores a `staged` parameter
- [x] A failed copy shows an error and writes no note
- [x] The existing Rust test `image_clipboard_writes_temp_file_and_emits_path_payload` is updated to assert the staged marker

## Audit evidence (editor-data-safety, 2026-11-02)

Source: editor-data-safety audit, finding G4 (`.scratch/editor-data-safety/audit-2026-11-02.md`; cross-reference in `.scratch/editor-data-safety/xref-file-io-audit.md`: no existing issue covers it; it was seen only in raw/scout-deep-link.md and raw/scout-rust-fs-utils.md and never promoted; issues 20 and 38 cover other Quick Capture paths). Code re-read at 1351a35d.

## Quick Capture clipboard screenshots are stored only in the OS temp dir, the note never displays them, and macOS deletes them later

- Verdict: CONFIRMED_BY_TRACE (priority P1, likelihood occasional)

**How a user hits it.** Copy an image (a screenshot to the clipboard) and press the capture-clipboard shortcut. A Quick Capture note is written whose whole content is `![qc-shot-<stamp>.png](file:///var/folders/.../T/qc-shot-<stamp>.png)`. Opening the note shows a broken image at once. Later macOS's temp cleanup removes the file; by then the clipboard has moved on, so the screenshot exists nowhere.

**Recoverable from.** Only while the image is still on the clipboard or the temp file still exists (the user can copy it out of `$TMPDIR` by hand). After the purge, nothing: the app never wrote the image anywhere else. That macOS purges old `$TMPDIR` files on its own (about 3 days) is from memory, not verified.

**Code trace.** kind_detect.rs:82-84 maps `ClipboardSnapshot::Image` to `ShotSource::Bytes`. commands.rs:90 calls `materialize_input`, :110 `write_shot_bytes_to_temp`, :139-140 write into `std::env::temp_dir()`; :176-184 emit `kind: "shot"` with that path. quick-capture.service.ts:85-99 fills the vault and calls `executeAction`. deep-link-actions.ts:130 `renderCaptureBody` -> deep-link.logic.ts:272-275 `![label](file://...)`; deep-link-actions.ts:175 writes only that link. widgets.ts:143-147 routes `file:` URLs to `applyFileSrc`, :155-161 `host.assetUrl(fsPath)` (`convertFileSrc`, editor-host.ts:72-74). tauri.conf.json:32-43 asset scope has `$DOCUMENT`, `$HOME/MyFiles`, `$HOME/kokobrain-vault`, `$DESKTOP`, `$PICTURE`, `$DOWNLOAD` and the app cache, no temp dir; no runtime scope extension in src-tauri/src (grep for `asset_protocol_scope`, `allow_directory`, `allow_file` finds nothing).

**Repro test.** None: the audit traced it (`TRACE: src-tauri/src/quick_capture/commands.rs:122-141`). The behavior sits in Rust and the Tauri asset-scope config, and a TS test of `renderCaptureBody` would only restate the string format. The red tests named in the first checklist item cover the fix.

**Fix sketch (audit).** In `materialize_input`, write `Shot::Bytes` into the vault (e.g. an attachments folder under the capture's folder) instead of `temp_dir`, and emit a vault-relative `![[...]]` or relative link. Keep `file://` only for `Shot::Path` inputs that the user owns. The issue text moves the copy to the frontend-triggered step because the Rust capture path does not know the vault.

## Comments

- 2026-11-02, branch `issue/50-quick-capture-shot-temp-only`: clipboard screenshots are now staged with a `staged` marker and moved into the capture folder by the new `import_staged_shot` command (validates a `qc-shot-*` source directly in the temp dir and a destination inside the vault); the note embeds them as vault-relative `![[...]]`. URI and Finder-copied shots keep `file://`. Review fixes: JSDoc for the orphan-image case, an editor-host resolution test, `mockRejectedValueOnce`. Tests at d5ac97bb: `pnpm vitest run && pnpm build` exit=0 (438 files, 10096 passed, 1 skipped, 1 todo); `cargo test` exit=0 (1219 passed). Reviews: round 1 APPROVED (4 findings, 3 fixed, 1 no change), round 2 APPROVED (no findings).
