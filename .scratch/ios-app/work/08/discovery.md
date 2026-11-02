# 08 discovery: Edit and save from the browser

No `spec.md`; the plan is `architecture-proposal-2026-11-02.md` 4.3, with the base taken from the tab (`savedContent`) instead of a host read set. Builds on `work/02` (policy, dispatcher), `work/03` (containment) and `work/07` (events, `fake-host.ts`, `browser-mac-changes.test.ts`). Gate: Both.

## Files that change
- `src-tauri/src/remote/policy.rs:25-110`: `Class::Write`; Write rows for `plugin:fs|write_text_file`, `plugin:fs|mkdir`, `create_note`, `create_folder`, `save_snapshot`. `fs_path_rule` (`:170-193`) allows `FsOp::Write` on a plain vault path (root, dot segments and `.kokobrain` rules unchanged). `PATH_ARGS` rows: `create_note.path`, `create_folder.path` (Inside), `save_snapshot.filePath` (Relative, the frontend sends a vault-relative key).
- `src-tauri/src/remote/write.rs` (new, Tauri-free): `disk_text` (UTF-8 lossy, BOM stripped, as `TextDecoder`), `write_checked(path, text, base)` and `create_new(path, text)`. One process-wide lock. Existing file: `open(O_RDWR|O_NOFOLLOW)`, read from the fd, accept when `sha256(disk) == sha256(base)` or `== sha256(text)` (no write then), else `CONFLICT_PREFIX` error; no base on an existing file refused; truncate + write on the same fd. Missing file: with a base it is a conflict (deleted on the Mac), without one `O_CREAT|O_EXCL|O_NOFOLLOW`.
- `src-tauri/src/remote/dispatch.rs:41-56,166-176`: Write arm. `write_text_file` under `.kokobrain/` stays acknowledged and dropped (02); elsewhere body `args.text`, base `headers.base`. `mkdir` refused under `.kokobrain`. `create_note` = `create_new` + `UpdateResult` at the current version (index untouched: the Mac watcher indexes it). `save_snapshot` reads the disk text at the canonical path and snapshots that.
- `src-tauri/src/remote/rpc.rs:33,190-198`: an error starting with `CONFLICT_PREFIX` gets code `-32001`. `Cargo.toml`: `libc = "0.2"` (already 0.2.191 in the lock).
- `src/lib/contracts/note-conflict.ts` (new): `NoteConflictError`, `NOTE_CONFLICT_MESSAGE`.
- `src/lib/core/editor/note-write.port.ts` (new): `setNoteWriter` / `writeNote(path, content, base)`; default `writeTextFile(path, content)`.
- `src/lib/core/editor/editor.service.ts:161-194`: save via `writeNote(path, content, tab.savedContent)`, single-flight per path (a save waits for the one in flight, so its base is the landed content, not a self-conflict); a `NoteConflictError` toasts the message, keeps the tab dirty and puts the path in a conflicted set that `saveDirtyTabs` skips and does not retry; cleared when the tab closes, its content is reloaded as saved, or `resetEditor`.
- `src/lib/app/remote/remote-note-writer.ts` (new): implements the port with `invoke('plugin:fs|write_text_file', bytes, { headers: { path, base } })`, maps code `-32001` to `NoteConflictError`; `startRemoteSession` registers it. `remote-transport.ts:178` keeps the JSON-RPC `code` on the rejection. `tauri-bridge-stand-in.ts:46-52` sends a `write_text_file` byte body as `{ text }` (other byte bodies stay dropped).
- `src/lib/core/filesystem/fs.service.ts:167-260`: `deleteItem` / `renameItem` / `moveItem` throw "not available in the browser yet" when `isRemoteBrowser()` (callers toast the message).

## Tests (prior art)
- Rust: `remote_containment_test.rs` Sandbox (writes, swap-after-check link, outside the vault), `remote_ws_test.rs` (policy rows, conflict code over the real WS), `remote_policy_test.rs` rows, `history_test.rs` DB setup for `save_snapshot`.
- vitest: `editor.service.test.ts` (conflict, single-flight, retry stops), `tauri-bridge-stand-in.test.ts`, `remote-transport.test.ts`, `fs.service` tests, `browser-mac-changes.test.ts` + `fake-host.ts` (write with base check, create_note).

## Risks
- Desktop writes stay unchecked (Issue note, accepted). Other browser writers of an existing note with no base (link rewrite, frontmatter writer outside the tab) are now refused instead of silently dropped.
- O_NOFOLLOW covers the final component only (criterion); a swapped parent dir is not covered.

## Defaults taken
- "Reload the note" = close and reopen the tab (no reload command exists); an explicit save (Cmd+S) still tries once more.
- The base travels as text in a header, hashed by the host (no `crypto.subtle`, which an http LAN page lacks).
- E2E (`bash scripts/e2e.sh`) left to deliver.
