# Scout report: rust-fs-utils (read-only)

Scope: `src-tauri/src/utils/fs.rs`, `src-tauri/src/commands/files.rs`, and every disk write, delete, rename, mkdir or temp-file call in `src-tauri/src`. No build or test was run. Labels: **READ** = seen in code at the cited line; **FETCHED** = read from the official source by web fetch; **INFER** = reasoning, not run.

## 0. Inventory of disk mutations in src-tauri/src (grep, complete for the patterns below)

| # | Site | Operation | Target | Used by |
|---|------|-----------|--------|---------|
| W1 | `utils/fs.rs:16-32` `write_atomic` | write tmp + rename over target | user note | W2, W3, W4 |
| W2 | `commands/vault.rs:370` (in `propagate_type_rename_inner`) | `write_atomic` | member notes (from index) | `propagate_type_rename` cmd |
| W3 | `commands/vault.rs:683` (in `toggle_task_status_inner`) | `write_atomic` | note at FE-supplied `path` | `toggle_task_status` cmd |
| W4 | `commands/vault.rs:899` (`create_note`) | `write_atomic` after `exists()` check | new note | `create_note` cmd |
| W5 | `commands/vault.rs:925` (`create_folder`) | `create_dir_all` | folder | `create_folder` cmd |
| W6 | `commands/vault.rs:1231` | `remove_file` of cache | `.kokobrain/vault-index.msgpack` | scan path, on any cache read error |
| W7 | `vault/index_cache.rs:60-76` `write_snapshot_atomic` | create tmp, write, `sync_all`, rename | `.kokobrain/vault-index.msgpack` | scan path |
| W8 | `db/mod.rs:41` | `create_dir_all` for `.kokobrain` | derived DB dir | `open_database` |
| W9 | `semantic/model.rs:168-199` | tmp file, write, flush (no `sync_all`), rename, remove on error | model file, app data dir | model download |
| W10 | `quick_capture/commands.rs:140` | `std::fs::write` | `$TMPDIR/qc-shot-*.{png,jpg,bin}` | quick capture |
| (utils) | `utils/fs.rs:29` | `remove_file(tmp)` on rename failure only | tmp file | W1 |

Not present in src-tauri/src (**READ** by grep): `remove_dir_all`, `remove_dir`, `fs::copy`, `OpenOptions`, `set_permissions` (outside tests), any Rust-side rename of a user note other than inside `write_atomic`. Note delete and rename of user notes are TS-side through `@tauri-apps/plugin-fs` (see §1.4).

Test-only writes (`fs::write` in `semantic/model.rs:250-261`, `index_cache.rs` tests, `quick_capture/commands.rs:427-432`) are out of scope.

## 1. Entry points and call chains

### 1.1 `read_files_batch` (read path, path-safety)
- Caller: `src/lib/app/lifecycle/watcher-handler.service.ts:87-93` passes absolute watcher paths and `vaultPath`; results feed `applyNoteChange` at `:95-105`.
- Also named as a consumer in `src/lib/features/search/search.service.ts:15-20` (comment only, not traced).
- IPC: `src/lib/contracts/commands.ts:102` (`vaultPath`, `paths`).
- Rust: `commands/files.rs:24` (`read_files_batch`) → `:31` `validate_vault_path(&vault_path)` → `utils/fs.rs:39-47` (`canonicalize`, `is_dir`) → per path `:37` `Path::new(&path).canonicalize()` → `:49` `canonical.starts_with(&vault_root)` → `:63` `fs::read_to_string(&canonical)`.
- Same pattern elsewhere: `commands/search_index.rs:293-299`, `commands/semantic.rs:1353-1359` (READ).

### 1.2 Note content saved by the editor (NOT Rust; main save path)
- `src/lib/core/editor/editor.service.ts:150-175` `saveFileByPath` → `:168` `writeTextFile(path, content)` (`@tauri-apps/plugin-fs`) → `editorStore.markSavedByPath` → `notifyAfterSave`.
- Capability scope: `src-tauri/capabilities/default.json:83-100` allows `fs:allow-write-text-file` on `$DOCUMENT/kokobrain-vaults/**` and `$HOME/kokobrain-vaults/**` (READ). The Rust `std::fs` commands are not covered by this ACL (the comment at `commands/vault.rs` ~858-861 says so).
- Other TS plugin-fs writes to note-like files: `link-updater.service.ts:39`, `frontmatter-write.service.ts:149` (`create: false`), `type-definitions.service.ts:218, 291, 309`, `deep-link.service.ts:260, 279, 296, 313`, `deep-link-actions.ts:61, 173`, `file-icons.service.ts:65, 98`, `templates.service.ts:116`, `auto-move.service.ts:81`.
- Deletes and renames of user files: `fs.service.ts:181` `remove(recursive)`, `:211` and `:239` `rename` (inside `applyPathChange` `diskOp`), `:252-278` `mkdir` + `copyFile` (folder move), `core/trash/trash.service.ts:71, 92, 126, 130, 188, 209` (`rename`/`remove`).

### 1.3 Rust write commands in the slice
- **Create note**: `fs.service.ts:129` `call('create_note', {path, content})` (from `createFile`, `:118-130`); `note-creator/note-creator.service.ts:103`. Rust `commands/vault.rs:889-911`: `ensure_safe_write_path` (`:895`) → `Path::exists()` (`:896-898`) → `write_atomic` (`:899`) → `read_file_mtime_secs` → `state.write()` (`:903`) → `update_note_in_index_inner` → emit.
- **Create folder**: `fs.service.ts:156`, `templates.service.ts:105`, `type-definitions.service.ts:120`, `note-creator.service.ts:98`. Rust `commands/vault.rs:919-926`: `ensure_safe_write_path` then `create_dir_all`.
- **Toggle task**: `features/tasks/tasks.service.ts:102-115` `call('toggle_task_status', {path, lineNumber})`. Rust `commands/vault.rs` command block (`state.write()` at `:717`) → `toggle_task_status_inner` (`:670-697`): `read_to_string` (`:669`), `toggle_task_in_content`, early return if unchanged (`:674-683` no write), `write_atomic` (`:683`), `read_file_mtime_secs`, `update_note_in_index_inner`. TS then calls `syncExternalContentToEditor(filePath, updatedContent, true, 'none')` (see Lead L1).
- **Propagate type rename**: `features/type-definitions/type-definitions.service.ts:218` (TS writes open tabs), `:226` `call('propagate_type_rename', ...)`. Rust `commands/vault.rs` command block (`state.write()` at `:405`) → `propagate_type_rename_inner` (`:350-388`): candidates from index `is_a == old_type` (`:355-362`), `read_to_string` per member (`:369`), `rewrite_type_in_frontmatter`, `write_atomic` (`:370`), index update. Per-file failures `continue` (`:371-377`, `:381-387`); the command still returns `Ok(updated)`.

### 1.4 Deletes (for orientation; TS side)
- `fs.service.ts:181` `remove(itemPath, {recursive: true})` and `trash.service.ts` (`rename` into trash, manifest `writeTextFile` at `:275`). No Rust deletes of notes exist.

## 2. Each write in the slice: how, preconditions, errors, state

### W1 `write_atomic` (`utils/fs.rs:16-32`)
- Precondition: `metadata(path)` (follows symlinks) and `readonly()` → Err (`:20-24`). No check that the parent exists beyond what `write` fails on; no check that `path` is inside a vault (`utils/fs.rs` has no vault context).
- Temp name: `"{path}.tmp-{pid}-{seq}"` in the same directory (`:26`), `seq` is a per-process `AtomicU64` (`:9`, `:25`).
- Write: `std::fs::write(&tmp, content)` (`:27`). Failure returns Err **without removing tmp** (leak on partial write, e.g. ENOSPC).
- Rename: `std::fs::rename(&tmp, path)` (`:28`). On failure: `remove_file(&tmp)` (`:29`), Err.
- **No `sync_all`/`fsync` on the tmp file and none on the directory** (`:27-31`). Compare W7 which calls `sync_all` (`index_cache.rs:70`).
- New inode: mode is the umask default (INFER: 0644 typical), ownership is the process user, extended attributes (macOS Finder tags, quarantine, `com.apple.*`) are not copied, hard links are broken, and a symlink at `path` is replaced by a regular file (the link target is left untouched). INFER from POSIX `rename(2)` semantics; the Rust docs do not say this (see FETCHED below).
- Error handling to caller: `Result<(), String>`; W2 logs and continues, W3 propagates with `?`, W4 propagates.
- Success state: file replaced; caller then updates `VaultIndex` (`update_note_in_index_inner`) and emits `vault-index-updated` (W3 emits only if `changed`; W4 always emits).
- Failure state: W3/W4 leave the index untouched (index update is after the write). The TS tab in W3 is not updated (toast "Failed to save task change.", `tasks.service.ts:116-117`).

FETCHED: `https://doc.rust-lang.org/std/fs/fn.rename.html` says rename replaces an existing `to` "on Unix" and that behavior "may change in the future"; it does not mention symlinks at the destination or atomicity beyond the platform call.

### W2 propagate (`vault.rs:350-388`)
- Holds `VaultIndexState` write lock for the whole loop (`vault.rs:405` in the command). Disk I/O under the index lock.
- Read-modify-write from **disk** content; does not consult TS open tabs (dirty or not).
- Per-member failures are debug-logged and skipped (`:371-377`, `:381-387`); command returns `Ok(count)` (`:405-420`). Caller cannot tell which members failed.
- Index updated only for successful writes, so index and disk stay consistent per file.

### W3 toggle (`vault.rs:660-697`, command ~`:700-725`)
- Lock: `state.write()` held across `toggle_task_status_inner` (`:717`), so disk I/O is under the index lock.
- No `ensure_safe_write_path`, no absolute-path check, no vault containment check (contrast W4/W5 at `:862-875`). Path is supplied by the frontend (`tasks.service.ts:102-105`).
- Unchanged content → no write, no index update (`:674-683`).

### W4 `create_note` (`vault.rs:889-911`)
- `ensure_safe_write_path` (`:862-875`): requires absolute path and rejects `..` components. Does not require the path to be inside the vault. Does not reject an existing symlink target.
- `Path::new(&path).exists()` then `write_atomic` (`:896-899`). Not exclusive: a file created between the two calls is replaced by rename (TOCTOU). `exists()` follows symlinks, so a dangling symlink at `path` passes the check and the rename replaces the symlink.
- Doc comment (`:880-884`) says "Atomically creates a new note ... Errors when the file already exists". The error branch is check-then-act, not atomic.

### W5 `create_folder` (`vault.rs:919-926`)
- `ensure_safe_write_path` then `create_dir_all`. Intermediate components may be symlinks (not checked).

### W6 cache delete (`vault.rs:1224-1235`)
- Triggered on **any** `read_snapshot` error (including transient I/O), then `remove_file` of `.kokobrain/vault-index.msgpack`. Cache only; rebuilt by full scan.

### W7 `write_snapshot_atomic` (`vault/index_cache.rs:60-76`)
- `create_dir_all(parent)`, `File::create(tmp)` where tmp is `path.with_extension("msgpack.tmp")` (fixed name, not per-process), `write_all`, `sync_all`, `rename`. Early returns leave the tmp file behind on error. No directory fsync. Cache only; corrupt cache is detected on read.

### W9 model download (`semantic/model.rs:160-200`)
- tmp `dest.with_extension("tmp")`, `write_all` per chunk, `flush` (no `sync_all`), `rename`, `remove_file(tmp)` on error. Not vault data.

### W10 quick capture temp (`quick_capture/commands.rs:132-141`)
- `std::env::temp_dir().join("qc-shot-<stamp>.<ext>")` with `std::fs::write`. No removal in production Rust code (only the test at `:432`). Whether the frontend deletes it was not checked. May contain a screenshot.

## 3. Concurrency

- `VaultIndexState` (RwLock) serializes Rust index writers. Lock is held across disk I/O in W2 (`:405` onward) and W3 (`:717` onward). W4 writes before taking the lock (`:899` then `:903`).
- No file lock or coordination between Rust `write_atomic` and TS `writeTextFile`. The editor (`editor.service.ts:168`) writes in place, so a Rust rename and a TS in-place write to the same file can interleave: last writer wins with no merge.
- `write_atomic` tmp names are unique per process+seq (`utils/fs.rs:25-26`). Two processes with the same pid cannot happen for the same running app. Concurrent `write_atomic` calls to the same target: both succeed, last rename wins.
- Watcher: `vault/watcher.rs:72-80` filters only dot-prefixed path segments. The tmp name `Note.md.tmp-<pid>-<seq>` is not dot-prefixed, so a rename by W1 emits watcher events for the tmp path and for the target. The tmp path is transient (renamed away) unless the process dies mid-write.
- Folder-tree scan `scan_dir` (`commands/vault.rs:91-150`) skips only dot-names and symlinks; it does not filter by extension. A leftover `X.md.tmp-...` appears in the sidebar tree until removed by hand.
- Markdown index guard: `update_note_in_index_inner` returns early for non-markdown names (`commands/vault.rs:~274-277`, `is_markdown_filename` in `utils/fs.rs:114-117`). A tmp name ends in `-<seq>` so it is not markdown. The TS side (`watcher-handler.service.ts:95-105` → `applyNoteChange`) passes the tmp path into `applyNoteChange` with `vaultPath` set; whether the FTS5/semantic legs filter non-markdown was NOT verified (INFER: unknown).
- Timers mentioned in CLAUDE.md (not re-read in code): editor autosave 2000 ms body / 500 ms frontmatter; watcher 500 ms debounce; `vault-index-updated` throttled ~2 s / 10 s. Relevant to L1: a dirty tab can stay dirty for up to the autosave window.

## 4. Leads (hypotheses; confidence stated)

**L1. Toggling a task overwrites unsaved edits in the open tab. Confidence: high on the code path, medium on the UI trigger.**
- Steps: open note A, type text (tab dirty, not yet autosaved; body autosave is 2 s per CLAUDE.md). Within that window click a task checkbox in the Tasks panel for note A.
- Path: `tasks.service.ts:102-111` calls Rust. Rust reads **disk** content (`vault.rs:669`), writes the toggled disk content (`:683`), returns `updatedContent` built from disk. TS calls `syncExternalContentToEditor(filePath, updatedContent, true, 'none')` (`tasks.service.ts` after `:107`).
- `editor.service.ts:76-82` with `markSaved=true` calls `editorStore.updateTabContentByPath`, which sets `tab.content = content` and `tab.savedContent = content` with no dirty check (`editor.store.svelte.ts:130-136`). The CodeMirror doc is replaced via `bumpExternalContentSignal` (`editor.service.ts:87-89`).
- Result: the unsaved text is gone from memory and from disk, and the tab is shown clean.
- Not verified: whether the Tasks checkbox is reachable for the open note while it is dirty (it probably is), and whether a guard exists elsewhere.

**L2. Non-atomic primary save path (`writeTextFile`) can leave a note truncated. Confidence: high that it is non-atomic, low-to-medium that it loses data in practice.**
- FETCHED: `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs`, `write_file_inner`: with no options the file is opened with `write: true, truncate: true, create: true`, then one `write_all(&data)`. No `fsync`, no temp file, no rename. The JS `writeTextFile` → Rust mapping was not read; this is the Rust side only.
- Scenario: process killed, panic, power loss, or ENOSPC between truncate and the end of `write_all` leaves a truncated or empty note. On ENOSPC the tab stays dirty and autosave retries later; on kill or crash the buffer is lost.
- This is the TS save path, outside this slice, but it is the owner's top concern and the W1 atomic write is only used by three Rust commands, not by the editor.

**L3. `write_atomic` has no fsync before rename. Confidence: medium (INFER from POSIX/APFS behavior, not tested).**
- `utils/fs.rs:27-28` vs `index_cache.rs:70`. After a power loss, the rename can persist before the data blocks, leaving a zero-length note under the target name. Affects W2, W3, W4.

**L4. `write_atomic` replaces symlinks and drops mode and xattrs. Confidence: high by reading, medium on impact.**
- `utils/fs.rs:28` renames over `path`. If `path` is a symlink, the symlink entry is replaced by a regular file; the target keeps old content, so edits diverge (INFER from `rename(2)`).
- Mode and extended attributes (macOS Finder tags, `com.apple.metadata:*`, quarantine) are lost on W2/W3 because the tmp file is new. Save via TS `writeTextFile` keeps them (in-place write). So the same note keeps its tags after a TS save but loses them after a task toggle (INFER).
- Reachability of symlinks: `scan_dir` and `walk_dir` skip symlinks (`commands/vault.rs:119-121`, `utils/fs.rs:157-159`), so symlinked notes are not in the index and not in the tree. W2/W3 target index paths, so symlink reachability is low. W4 can target any absolute path (see L6).

**L5. Leftover temp files. Confidence: high by reading.**
- W1 leaks `"<note>.md.tmp-<pid>-<seq>"` when `std::fs::write` fails partway (`utils/fs.rs:27` uses `?` with no cleanup) or the process dies between write and rename.
- These names are not dot-prefixed and not markdown, so `scan_dir` shows them in the sidebar tree (`commands/vault.rs:91-150`) and the watcher reports them (`vault/watcher.rs:72-80`). The index ignores them (`utils/fs.rs:114-117`).
- W7 leaves `vault-index.msgpack.tmp` on error (`index_cache.rs:66-74`); cache only.
- Test gap: `utils_fs_test.rs:491-500` covers only the success path, no test for write failure cleanup, symlink target, mode/xattr, or concurrency.

**L6. Path-safety: write surface is not vault-scoped. Confidence: high by reading; impact low given the trusted-frontend model.**
- `ensure_safe_write_path` (`commands/vault.rs:862-875`) allows any absolute path without `..`. It does not check vault containment, so the "prevents escape" wording covers only `..` traversal. `create_note` at `:895-899` can write `/Users/<user>/somefile.md` if the frontend sends it.
- `toggle_task_status` (`:660-697`, `:717`) writes whatever path it receives, with no absolute-path, `..`, or containment check. Any file whose line N looks like a checkbox is rewritten.
- `std::fs` calls bypass the plugin-fs ACL (`capabilities/default.json`), per the comment at `vault.rs` ~858-861.
- Symlinks in intermediate components are followed by `create_dir_all`/`create_note` (W4/W5); no check.

**L7. `read_files_batch` containment is relative to a caller-supplied root. Confidence: high by reading.**
- `files.rs:24-31`: `vault_path` is a parameter, canonicalized and trusted (`utils/fs.rs:39-47`). A caller passing `/` can read any `.md`-readable file. The comment at `files.rs:19-20` ("prevent arbitrary file reads if the frontend is compromised") overstates the guard.
- The component-wise `Path::starts_with` (`files.rs:49`) is correct against `/vault` vs `/vault-evil`. Symlink-out-of-vault is rejected by canonicalize (tested, `tests/commands/files_test.rs:152-170`). Residual TOCTOU between canonicalize and open is minor and read-only.

**L8. `create_note` is not exclusive: concurrent or external creation at the same path can be overwritten. Confidence: medium.**
- `vault.rs:896-899`: `exists()` then `rename`. A file that appears between the two steps (another process, sync client, or a second `create_note` for the same daily-note path) is silently replaced. Both calls return Ok. The event-calendar store comment (`event-calendar-daily-note.store.svelte.ts:18`) shows this race was already seen on the TS side.
- Window is microseconds; severity depends on how often two creators target one path. Fix would be `create_new`/`hard_link`-style exclusive create, not a check.

**L9. Propagate type rename is partial and silent. Confidence: medium.**
- `vault.rs:371-377, 381-387`: per-member write or read failures are logged and skipped, and the command returns `Ok(updated)` (`:405-420`). The TS caller (`type-definitions.service.ts:226`) cannot see which notes kept the old `_type`, so those notes silently drop out of the renamed type's collection. Index stays consistent per file.
- Not verified: the TS ordering at `type-definitions.service.ts:218-226` (open tabs written before the Rust rename) and whether dirty tabs of member notes are overwritten by the TS write at `:218`.

**L10. Quick-capture screenshots persist in `$TMPDIR`. Confidence: medium, unverified TS cleanup.**
- `quick_capture/commands.rs:140` writes `qc-shot-*` with no removal in production Rust (only test at `:432`). If the TS side does not delete it, captures accumulate in the OS temp dir (possibly sensitive). Not data loss for notes.

**L11. Cache-delete on any read error. Confidence: high by reading, impact low.**
- `vault.rs:1224-1235` deletes the cache on any `read_snapshot` error, including transient I/O. Cache only; the next scan rebuilds it. Listed for completeness.

### Not leads (checked, fine)
- `read_files_batch` symlink-out-of-vault and `..` cases are rejected and tested (`files_test.rs:104-170`).
- `write_atomic` read-only target is an error (`utils/fs.rs:20-24`, test `utils_fs_test.rs:511-523`).
- `walk_dir*` skip symlinks via `symlink_metadata` (`utils/fs.rs:151-159`, `:202-209`, `:258-265`).
- Index is updated only after successful disk writes in W2, W3, W4.

## 5. Known issues cross-check
- `.scratch/architecture-stability/issues/34-save-dirty-tabs-before-vault-switch.md`: resolved; about save ordering on `switchVault`, not about non-atomic writes, the toggle overwrite (L1), or the Rust write surface. Related but different.
- `.scratch/architecture-stability/issues/28-move-command-logic-into-domain-modules.md:10`: plans to move `read_files_batch` body to `vault/files.rs`. No fix for L7.
- No issue in the list covers `write_atomic` durability, symlink replacement, temp leftovers, toggle/dirty-tab overwrite, or Rust path containment. These are new relative to the list.

## 6. Checked sources
- FETCHED `https://doc.rust-lang.org/std/fs/fn.rename.html`: Unix replaces an existing destination; no symlink or atomicity statement.
- FETCHED `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs`: `write_file_inner` truncates and writes in place, no fsync, no temp file, no rename for `write_text_file` (marked for removal in v3 in favor of `write_file`).
- Not fetched: `std::fs::write` docs, notify crate, macOS APFS fsync semantics, JS `writeTextFile` mapping. All INFER labels above rest on that.

## 7. Not checked / risks
- No tests or builds run (per rules). Test names above are from reading only.
- Not read: `applyNoteChange` handling of non-markdown tmp paths (L5 impact on FTS/semantic), the Tasks panel guard for dirty tabs (L1 trigger), `type-definitions.service.ts:195-230` in full (L9), `quick_capture` TS cleanup (L10), watcher debounce constant.
- Durability claims (L2, L3) and xattr loss (L4) were not reproduced on macOS.
