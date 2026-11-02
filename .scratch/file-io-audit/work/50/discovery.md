# Issue 50 discovery

## Files that change
- src-tauri/src/quick_capture/commands.rs:80-96 (`capture_clipboard_now_with`): note that the input was `Shot::Bytes` before `materialize_input`, add `"staged": true` to its payload. New command `import_staged_shot(source, dest_dir, vault_path) -> String` plus a testable inner fn taking the temp dir.
- src-tauri/src/lib.rs:379-382: register the command in `generate_handler!`.
- src/lib/contracts/commands.ts:162-169, :249-252: `import_staged_shot` in `CommandMap` and `COMMAND_ARGS` (ipc-parity test).
- src/lib/features/deep-link/deep-link.types.ts:125-131: `staged?: boolean` on `CaptureShotAction` (set only by Quick Capture, never by the URI parser at deep-link.logic.ts:208-220).
- src/lib/plugins/quick-capture/quick-capture.service.ts:17-33, :137-144: payload `staged?`, carried into the shot action only when `=== true`.
- src/lib/app/deep-link-actions.ts:97-137: staged shot -> `call('import_staged_shot', { source, destDir: parentDir, vaultPath })` after the mkdir and before any write, body `![[<vault-relative path>]]` via `vaultRelativeKey`. A throw propagates to `executeAction`'s toast (deep-link.service.ts:203-205); no note is written.

## Rust command rules
- source: canonicalized; file name starts with `qc-shot-`; parent == canonicalized `std::env::temp_dir()` (macOS /var -> /private/var, so canonicalize both sides).
- dest: `validate_vault_path(vault_path)`; canonicalized dest_dir must be a dir and `starts_with` the vault root.
- never overwrite: `OpenOptions::create_new` on `<name>`, `<stem>-1.<ext>`, ... ; then `std::io::copy`; remove the temp file after the copy (a removal failure is logged, the copy already succeeded).
- returns `Path::new(dest_dir).join(name)` (the caller's spelling, so `vaultRelativeKey` against the frontend vault path works).

## Tests (red first)
- Rust (commands.rs tests): copy into a vault subfolder keeps bytes and removes the temp file; refuses non-`qc-shot-*` name, a file in a subdir of temp, a dest outside the vault; no overwrite of an existing same-name file. Use `tempfile` (check dev-deps) for vault and a fake temp dir passed to the inner fn. Update `image_clipboard_writes_temp_file_and_emits_path_payload` to assert `staged == true`; Finder path payload has no `staged`.
- Frontend: deep-link.service.test.ts `kind=shot` block: staged shot -> invoke mocked (`@tauri-apps/api/core`) returns vault path -> note is `![[Inbox/.../qc-shot-x.png]]`; invoke rejects -> no writeTextFile, toast.error. Unstaged shot still `file://`. deep-link.logic.test.ts: `staged=true` URI param ignored. quick-capture.service.test.ts: `buildCaptureAction` carries `staged`.

## Defaults taken
- Image lands in the capture note's folder (owner decision), keeps its `qc-shot-<stamp>.<ext>` name.
- Embed target is the full vault-relative path; `resolveWikilink` matches on the basename, which the stamp makes unique.
- No asset-scope change (issue 37 owns vaults outside the scope).

## Risks
- If the note write fails after the copy, the image stays in the vault as an orphan (visible, recoverable; not data loss).
