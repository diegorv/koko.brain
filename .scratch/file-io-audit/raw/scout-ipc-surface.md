# Scout report: ipc-surface

Slice: IPC surface (`src-tauri/src/lib.rs` registration and plugins, `src-tauri/capabilities/*.json` fs scopes, `src/lib/contracts/` and the `call()` wrapper), read-only audit. Repo root: `/Users/diegorv/Dev/pet-projects/koko/brain`.

Provenance tags: [READ] = read in this repo at the cited line. [FETCHED] = read from GitHub or docs by web fetch. The fetch tool returns a model summary, not a byte-exact copy, so quoted lines from fetched files are close paraphrases of the source; verify before relying on a single token. [INFER] = my reasoning from [READ]/[FETCHED] facts, not executed.

Nothing was built, run or tested. No repo file was edited.

---

## 0. External sources fetched

| Claim | Source fetched | Result |
|---|---|---|
| `write_text_file` / `write_file` open with truncate, write once, no temp file, no fsync | `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs` (`write_file_inner`, shared by `write_text_file`) | `OpenOptions { write: true, truncate: !opts.append, create: opts.create (default true), append }` then `file_handle.write_all(&data)`. No temp file, no rename, no `sync_all`/`sync_data`. Only exception: `append` mode. [FETCHED] |
| `rename` plugin command resolves both paths through the scope, then calls `std::fs::rename` | same file, `rename` | `resolve_path(... old_path ...)` then `resolve_path(... new_path ...)` then `std::fs::rename(&resolved_old_path, &resolved_new_path)`. No fsync. [FETCHED] |
| `remove` | same file | `remove_file` / `remove_dir_all` / `remove_dir` chosen by file type. No fsync. [FETCHED] |
| Scope check runs before every fs command | same file, `resolve_path` | `resolve_real_path` canonicalizes if possible, then `matches_forbidden_pattern` and `scope.is_allowed(&real_path)`. [FETCHED] |
| JS `writeTextFile` sends the whole string in one IPC payload | `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/guest-js/index.ts` | `invoke('plugin:fs|write_text_file', encoder.encode(data), { headers: { path, options } })`. One payload, no chunking. Only `writeFile` streams. [FETCHED] |
| Scope glob semantics in the Tauri core (`Scope::is_allowed`) | `https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri/src/scope/fs.rs` | `require_literal_separator` always on. `require_literal_leading_dot` defaults to true on Unix. A config entry `dir/**` adds only the `dir/**` pattern (no bare `dir` companion). **For a path that does not exist, `..` is NOT resolved** (`try_resolve_symlink_and_canonicalize` returns the path untouched). Existing paths are canonicalized (`..` and symlinks resolved). Matching is `glob::Pattern::matches_path_with`. [FETCHED]. Caveat: this is `dev` branch, not the version pinned in `Cargo.lock`. |
| Sync commands run on the main thread | `https://v2.tauri.app/develop/calling-rust/` | "Commands without the async keyword are executed on the main thread unless defined with #[tauri::command(async)]." Async commands run on a separate async task. [FETCHED] |

Not fetched: the exact `resolve_real_path` fallback in plugins-workspace `commands.rs` (summary said it canonicalizes when `Ok`, falls back otherwise, not confirmed for non-existing paths). The `..`-on-new-file lead (Lead 4) depends on that gap, so it stays low confidence.

---

## 1. Registration and plugin setup

- `src-tauri/src/lib.rs:279-287`: plugins registered in order: opener, fs, dialog, http, deep-link, clipboard-manager, global-shortcut (custom builder), updater, process. [READ]
- `src-tauri/src/lib.rs:288-292`: managed state: `VaultIndexState`, `VaultWatcherState`, `SentryState`, `PrevFrontmostPid`, `LastCaptureSignature`. [READ]
- `src-tauri/src/lib.rs:293-352`: `generate_handler!` with 58 commands. Counted: 58 registrations (sed 294-351 `::` count = 58). [READ]
- `src/lib/contracts/commands.ts:35-170`: `CommandMap` with 58 keys (`rg '^\t[a-z_0-9]+: \{'` = 58). Count matches. Full name-by-name parity is enforced by `ipc-parity.test.ts` (test not run). [READ]
- Plugin commands are NOT in `CommandMap`. Only raw `invoke` left in app code: `src/lib/core/settings/sections/UpdateSection.svelte:171` (`plugin:updater|download_and_install`, passes a `Channel`). `src/lib/contracts/ipc.ts:1` imports `invoke`. [READ]
- Every `plugin-fs` write, read, rename, remove, mkdir and exists goes straight from TS to the plugin. There is no Rust wrapper. Inventory in section 2B.

### Write-capable Rust commands (registered)

| Command | Writes disk? | Path guard | Source |
|---|---|---|---|
| `create_note` | yes, `write_atomic` (temp+rename) | `ensure_safe_write_path` (absolute, no `..`), then `exists()` check | `commands/vault.rs:887-914` (guard 895, exists 896, write 899) |
| `create_folder` | yes, `create_dir_all` | `ensure_safe_write_path` | `commands/vault.rs:921-926` (guard 924) |
| `toggle_task_status` | yes, `write_atomic` | NONE (reads/writes arbitrary `path`) | `commands/vault.rs:664-690` (write 683), command 707-733 |
| `propagate_type_rename` | yes, `write_atomic` per member note | NONE (paths from index) | `commands/vault.rs:342-386` (write 370), command 395-... |
| `rename_note` | NO disk I/O, index only | NONE on from/to | `commands/vault.rs:1001-1067` |
| `remove_note_from_index` | NO disk I/O, index only | none | `commands/vault.rs:937-962` |
| `update_note_in_index` | NO disk I/O (reads mtime/size only) | markdown-filename filter | `commands/vault.rs:254-329` |
| `save_vault_cache` / `scan_vault_v2_cached` | writes `.kokobrain/vault-index.msgpack` via `write_snapshot_atomic` (fsync + rename); deletes a corrupt cache file | path from TS | `vault/index_cache.rs:55-76`; `commands/vault.rs:1227-1235` |
| `open_vault_db` / `close_vault_db` | SQLite under `.kokobrain` (`db/mod.rs:41` create_dir_all) | `validate_vault_path` only (dir exists) | `commands/db.rs:5-18`, `db/mod.rs:41` |
| `save_snapshot` (file history) | SQLite row, not a note file | none beyond path string | `commands/history.rs:57` |
| `build_search_index`, `update_search_index_file`, `remove_from_search_index`, semantic write commands | SQLite / model files, not notes | `update_*` read the file via `vaultPath` | `commands/search_index.rs:270,302`; `commands/semantic.rs` |
| `submit_composer_capture` | no disk write; emits `qc:capture-detected`, main window writes the note | n/a | `quick_capture/commands.rs:349-363` |

Read-only commands that touch the vault: `scan_vault` (`commands/vault.rs:80-89`, `validate_vault_path` only, any readable dir), `read_files_batch` (`commands/files.rs:23-84`), `start_vault_watcher` (`commands/watcher.rs:11-23`).

---

## 2. Disk writes, deletes and renames in the slice

### 2A. Rust side

**`write_atomic`** (`src-tauri/src/utils/fs.rs:16-32`) [READ]
1. If target exists and is read-only: error (`:20-24`).
2. Temp path `"{path}.tmp-{pid}-{seq}"` in the same directory (`:25-26`).
3. `std::fs::write(&tmp, content)` (`:27`). No `sync_all`, no `sync_data`.
4. `std::fs::rename(&tmp, path)` (`:28`). On error removes temp (`:29`).
- Atomic in the sense of "old or new name" on a single filesystem [INFER from rename(2) semantics], but no fsync before rename, so after power loss the rename can persist before the data (inference; not tested on this FS).
- Not cleaned up by anything if the process dies between steps 3 and 4 (grep: no code handles `.tmp-` files; `rg '\.tmp-'` in `src-tauri/src` and `src/lib` returns only `utils/fs.rs`).
- New file gets default mode, not the original mode [INFER].
- Rename over a symlink target replaces the symlink with a regular file [INFER].

**`write_snapshot_atomic`** (`src-tauri/src/vault/index_cache.rs:55-76`) [READ]: `File::create(tmp)` (`:66`), `sync_all` (`:70`), `rename` (`:74`). Only place in the slice with fsync. Used for the index cache only, not notes.

**`create_note`** (`commands/vault.rs:887-914`) [READ]: `ensure_safe_write_path` then `Path::exists()` (`:896`) then `write_atomic` (`:899`) then index update under write lock, then emit. The "exists" check and the rename are separate syscalls; a file created in between is replaced silently [INFER, narrow window, external process only]. Two IPCs cannot interleave because the command is sync (main thread, section 3).

**`ensure_safe_write_path`** (`commands/vault.rs:862-874`) [READ]: rejects non-absolute and any `ParentDir` component. Explicitly does not check vault containment (no `starts_with(vault)`). Its doc comment says `std::fs` is not covered by plugin-fs ACL (`:853-861`). So the Rust write commands are scoped only by the absolute-path and `..` rule.

**`toggle_task_status_inner`** (`commands/vault.rs:664-690`) [READ]: `read_to_string(path)` (`:669`), `write_atomic(path, &updated)` (`:683`). No `ensure_safe_write_path`, no containment check. Path comes from the frontend (`src/lib/features/tasks/tasks.service.ts:102-105`).

**`propagate_type_rename_inner`** (`commands/vault.rs:342-386`) [READ]: iterates index entries whose `is_a == old_type`, reads each, `write_atomic` (`:370`). Per-file errors logged and skipped (`:360-375`). Member list comes from the index, so paths are vault-internal in practice.

**`rename_note` / `rename_note_inner`** (`commands/vault.rs:1001-1067`) [READ]: index only. No disk op. Doc comment at `:1040-1043` says disk rename runs TS-side through plugin-fs.

**`read_files_batch`** (`commands/files.rs:23-84`) [READ]: `validate_vault_path(vault_path)` (`:31`), per-path `canonicalize` (`:37`), `canonical.starts_with(&vault_root)` (`:49`). Correct containment. Read-only.

### 2B. TS side: plugin-fs writes and deletes (non-exhaustive by call site, every importer listed)

Files importing `@tauri-apps/plugin-fs` writers/removers (from `rg`): `core/editor/editor.service.ts:1,168`; `core/filesystem/link-updater.service.ts:1,39`; `core/filesystem/fs.service.ts:1,48,181,205,211,233,239,251-260,252,278`; `core/trash/trash.service.ts:1,60-71,92,123-130,188,209,273-275`; `core/frontmatter/frontmatter-write.service.ts:1,149`; `core/settings/settings.service.ts:1,193`; `core/note-creator/note-creator.service.ts` (imports `exists, readTextFile` only); `app/deep-link-actions.ts:1,61,126,173`; `features/deep-link/deep-link.service.ts:3,260,279,294,296,311,313`; `features/auto-move/auto-move.service.ts:1,75,81,177`; `features/file-history/file-history.service.ts:2`; `features/file-icons/file-icons.service.ts:1`; `features/tasks/todoist.service.ts:1`; `features/type-definitions/type-definitions.service.ts:2`; `plugins/templates/templates.service.ts:1,116`; `plugins/one-on-one/one-on-one.service.ts` (readDir/exists only). [READ]

Other locations: `src/lib/utils/log.service.ts:1` (writeTextFile/mkdir/exists imported; not traced here).

Write call sites with the most user-data weight:
- `editor.service.ts:168` `writeTextFile(path, content)`. Save path for every dirty tab. Success: `editorStore.markSavedByPath` (`:169`), `notifyAfterSave` (`:170`). Failure: `error` + `toast.error('Failed to save file.')` and returns false (`:172-175`). [READ]
- `link-updater.service.ts:39` `writeTextFile(filePath, updatedContent)` rewrites wikilinks in every note referencing a renamed note. For dirty tabs it writes the in-memory content (`:30-37`). Run via `Promise.allSettled` (`:31`). [READ]
- `frontmatter-write.service.ts:149` `writeTextFile(path, next, { create: false })`. [READ]
- `deep-link.service.ts:260,279,296,313` (append, prepend, overwrite, silent create). See Lead 2.
- `trash.service.ts:275` `writeTextFile(manifestPath, serializeTrashManifest(items))`: the trash manifest, non-atomic. Trash moves use `rename(absolutePath, trashPath)` (`:71`) and restore `rename(trashPath, restorePath)` (`:126`), deletes via `remove(..., {recursive:true})` (`:92,130,188,209`). Trash scout owns the detail.
- `settings.service.ts:193` `writeTextFile(filePath, content)`: settings file, non-atomic.
- `fs.service.ts:48` writes `.kokobrain/folder-order.json` template only when missing. [READ]

### 2C. TS write routing summary (what each path uses)

| Operation | Route | Atomic | fsync | Scope-checked by | Source |
|---|---|---|---|---|---|
| Note save (editor) | plugin-fs `writeTextFile` | NO (O_TRUNC + write_all) | NO | Tauri fs ACL | `editor.service.ts:168` |
| Note create (UI) | Rust `create_note` | temp+rename | NO | `ensure_safe_write_path` only | `fs.service.ts:129`, `commands/vault.rs:887` |
| Folder create | Rust `create_folder` | n/a (mkdir -p) | n/a | `ensure_safe_write_path` only | `fs.service.ts:156`, `vault.rs:921` |
| Folder create (templates, type-defs, new-note rules) | Rust `create_folder` | n/a | n/a | `ensure_safe_write_path` only | `templates.service.ts:105`, `new-note.service.ts:27`, `type-definitions.service.ts:120`, `note-creator.service.ts:98` |
| Note create (note-creator, deep-link) | Rust `create_note` / `openOrCreateNote` | temp+rename | NO | path guard | `note-creator.service.ts:103` |
| Task toggle | Rust `toggle_task_status` | temp+rename | NO | NONE | `vault.rs:683` |
| Type rename propagation | Rust `propagate_type_rename` | temp+rename | NO | index-derived paths | `vault.rs:370` |
| Rename / move / delete (note) | plugin-fs `rename` / trash `rename` | rename(2) | NO | Tauri ACL on both paths (rename) | `fs.service.ts:211,239`, `trash.service.ts:71` |
| Append/prepend/overwrite deep link | plugin-fs `writeTextFile` | NO | NO | ACL + `resolveFilePath` lexical guard | `deep-link.service.ts:260,279,292-300` |
| Settings / folder order / trash manifest / auto-move config | plugin-fs `writeTextFile` | NO | NO | ACL | `settings.service.ts:193`, `fs.service.ts:48`, `trash.service.ts:275`, `auto-move.service.ts:81` |
| Index cache | Rust `write_snapshot_atomic` | temp+fsync+rename | YES | n/a (app data) | `vault/index_cache.rs:55-76` |

Observation [READ]: the app already has an atomic, fsynced writer (`index_cache.rs`) and a temp+rename writer (`utils/fs.rs`), but note saves (the highest-value data) use neither. Every note save goes through the plugin's truncate-then-write.

### 2D. Path-change and index follow-up (IPC calls that are fire-and-forget)

- Delete branch of `applyNoteChange` (`core/filesystem/note-change.service.ts:196-220`): `call('remove_note_from_index')` (`:202`), `remove_from_search_index` (`:209`), `remove_semantic_file` (`:217`). Each `.catch` logs with `error()`, does not propagate and is not awaited. [READ]
- Upsert branch: `markIndexed(path, content)` at `note-change.service.ts:229`, BEFORE `call('update_note_in_index')` at `:235-239` (`.catch` logs only). If the IPC fails, the dedupe signature is already stored, so the same bytes are not re-sent until content changes. [READ]
- `rename_note` from `path-change.service.ts:157-161`: awaited inside try/catch; catch logs `error('FS', 'rename_note failed:', err)` and continues to `forgetNote` (`:166-170`). [READ]

---

## 3. Concurrency

- Tauri sync commands (no `async`) run on the MAIN thread [FETCHED]. Sync and therefore main-thread: `create_note` (`vault.rs:888`), `create_folder` (`:922`), `toggle_task_status` (`:708`), `rename_note` (`:1045`), `remove_note_from_index` (`:938`), `update_note_in_index` (`:303`), `propagate_type_rename` (`:396`), `read_files_batch` (`files.rs:24`), `start_vault_watcher`, `stop_vault_watcher`, `open_vault_db`, `close_vault_db`. Consequence [INFER]: writes from IPC are serialized by the main thread, which blocks UI for the duration of each disk write and index lock. Async (spawn_blocking): `scan_vault_v2` (`vault.rs:1093-1107`), `scan_vault_v2_cached` (`:1178-1192`).
- Index lock: `VaultIndexState` is an RwLock (`vault.rs` uses `.write()/.read()` with `map_err` on poisoning). Lock is dropped before `app.emit` in each command (e.g. `:311-327`, `:707-731`).
- `toggle_task_status` and `create_note` do read-modify-write on disk without any app-level lock. The only protection is that sync commands serialize on the main thread. TS-side saves (plugin-fs) run on the webview side and are NOT serialized with Rust writes. So a Rust `toggle_task_status` (write_atomic) and a TS `editor.service` save (O_TRUNC) to the same file can interleave: last rename/truncate wins, and the loser's content is lost without error [INFER from the two write mechanisms; not reproduced].
- Watcher: `start_vault_watcher` uses `replace_watcher` (`commands/watcher.rs:17`). Self-save suppression is TS-side `markRecentSave` (`fs.service.ts:130`, `deep-link.service.ts:257` etc.). Owned by the watcher slice.
- Frontend concurrency for rename: `renameItem` does `exists(newPath)` (`fs.service.ts:205`), then `applyPathChange` (diskOp `rename` at `:211`). Check and rename are separate awaits; `plugin-fs rename` overwrites silently on Unix [FETCHED: `std::fs::rename`]. A file created at `newPath` between check and rename is overwritten. Same in `moveItem` (`:233-239`).
- `switchVault` (`core/vault/vault.service.ts:18-22`): `saveAllDirtyTabs()` then `drainPendingWrites()` then `vaultStore.open`. Known: Issue 34 (`.scratch/architecture-stability/issues/34-save-dirty-tabs-before-vault-switch.md`), covered.
- Deep link: `onOpenUrl` enqueues URLs (`deep-link.service.ts:86-93`) and cold-start URL via `getCurrent()`. Actions run unconfirmed (see Lead 2).

---

## 4. Capabilities (fs scopes)

Source: `src-tauri/capabilities/default.json` (main window). `composer.json` grants only `core:window:allow-hide` and `allow-set-focus`, no fs. [READ]

| Permission | Allowed (glob) | Lines |
|---|---|---|
| `fs:allow-read-dir` | `$DOCUMENT/kokobrain-vaults[/**][/.kokobrain[/**]]`, same under `$HOME` | 37-64 |
| `fs:allow-read-text-file` | `$DOCUMENT/kokobrain-vaults/**` (+`.kokobrain/**`), same under `$HOME` | 66-81 |
| `fs:allow-write-text-file` | same as read, plus `$APPLOG/**` | 83-101 |
| `fs:allow-mkdir` | vault root + `/**` + `.kokobrain`, plus `$APPLOG` | 103-136 |
| `fs:allow-remove` | `kokobrain-vaults/**` and `.kokobrain/**` under `$DOCUMENT` and `$HOME` (no `$APPLOG`) | 138-153 |
| `fs:allow-rename` | same as remove | 155-170 |
| `fs:allow-copy-file` | same as remove | 172-187 |
| `fs:allow-exists` | as mkdir, plus `$APPLOG` | 189-222 |
| `opener:allow-open-path` | `$APPLOG` only | 24-34 |
| `http:allow-fetch*` | `https://api.todoist.com/**` | 223-254 |
| `deep-link:default`, `clipboard-manager:allow-read-text`, `global-shortcut:*`, `dialog:default`, `updater:default`, `process:allow-restart` | n/a | 18-22, 35, 255-256 |

What this means [READ + INFER]:
- Scope is on the TS plugin-fs path only. The Rust write commands listed in 2A are NOT governed by this ACL. The comment at `vault.rs:853-861` says so. So for a vault outside `$DOCUMENT/kokobrain-vaults` or `$HOME/kokobrain-vaults`, the Rust commands (`create_note`, `create_folder`, `toggle_task_status`, `propagate_type_rename`) still write, while the TS plugin-fs writes are denied. See Lead 3.
- Vault choice is NOT restricted in code. `openVaultDialog` (`core/vault/vault.service.ts:25-28`) uses `open({ directory: true })` with no containment check. `openRecentVault` (`:38-52`) only checks existence. The onboarding text says "Allowed locations: ~/Documents/kokobrain-vaults/ and ~/kokobrain-vaults/" (`src/routes/(app)/+page.svelte:44`), but nothing enforces it.
- `tauri.conf.json` assetProtocol scope (`src-tauri/tauri.conf.json:30-43`) lists `$HOME/kokobrain-vault/**` (singular, no `s`) and `$HOME/MyFiles/**`, which do not match the `kokobrain-vaults` write scope. Read-only (asset protocol), so no write impact. Config drift [READ].
- Scope glob behavior [FETCHED, see section 0]: for non-existing paths `..` is not resolved before matching, and `**` matches path components including `..`. So an allow check on a NEW file path containing `..` may pass, and the OS then resolves the `..` on write. Confidence low to medium (see Lead 4).
- `fs:allow-write-text-file` does not list `$APPLOG` for read, and `fs:allow-remove` has no `$APPLOG`. Fine as configured [READ].

---

## 5. Contracts and the `call()` wrapper

- `src/lib/contracts/ipc.ts:21-26`: `call(cmd, ...args)` returns `invoke(cmd, args[0])` directly. No try/catch, no transformation, no default. Rejections (Rust `Err(String)`) propagate to the caller unchanged. Zero-arg commands get `invoke(cmd)` (`:25`). [READ]
- `ipc.ts:33-38`: typed `on()` for events, payload unwrapped. [READ]
- Error handling in callers is per call site. Write-path callers that log-and-continue: `note-change.service.ts:202,209,217,235,247,252` (all `.catch` log only; the semantic one at `:252` is `debug`), `path-change.service.ts:159` (logs and continues). Callers that rethrow: `fs.service.ts:129,156` (`createFile`/`createFolder` log and rethrow), `tasks.service.ts:102` (catch shows toast, does not rethrow). [READ]
- Generated types: `src/lib/contracts/generated/` (ts-rs, 35 files + serde_json/JsonValue). `index.ts` re-exports (`contracts/index.ts:6-39`). Not hand-edited. [READ]
- `scan_vault_v2` is registered but not invoked from TS (`commands.ts:52`). [READ]
- `update_note_in_index` / `remove_note_from_index` / `rename_note` accept any `path` string. They never touch disk, but they re-key the index. A bogus path inserts an entry that the next watcher or full scan may not reproduce. Low.

---

## 6. Leads (hypotheses, ranked; none executed)

### Lead 1. Note saves are truncate-and-write, not atomic, no fsync
- Confidence: HIGH that the mechanism exists. LOW-to-MEDIUM that it loses data in practice (needs a crash or power loss during the write window).
- Mechanism: `editor.service.ts:168` calls plugin `writeTextFile`, which opens with O_TRUNC and does one `write_all` with no temp, no fsync [FETCHED plugins-workspace `commands.rs`, `write_file_inner`]. The atomic writer `utils/fs.rs:16-32` exists and is NOT used for user notes.
- Scenario: user edits a multi-KB note, app is killed (force quit, kernel panic, battery loss) during the save. The file is left truncated or empty. Dirty-tab state is cleared only after `writeTextFile` resolves (`editor.service.ts:169`), so the in-memory copy survives a clean crash only, not a power loss.
- Same routing for `link-updater.service.ts:39` (writes many notes in one rename), `trash.service.ts:275` (trash manifest), `settings.service.ts:193`.
- Mitigation present: file history snapshot on save (`file-history.service.ts:117`) may keep a copy, but only after the write returns successfully.
- Suggested check (not run): reproduce by writing a large note and killing the process mid-write with a test harness (outside the app); or confirm by code that no retry or journal exists.

### Lead 2. Deep links overwrite existing notes with no confirmation
- Confidence: HIGH on the code path, MEDIUM on how easily the scheme is triggered (depends on macOS/browser prompting).
- Code: `deep-link.service.ts:292-304` (`overwrite` branch: `writeTextFile(fullPath, content)`, no existence check, no confirm). `deep-link.service.ts:308-315` (`silent` create branch: unconditional `writeTextFile(fullPath, content)` after `mkdir`, no `exists()` check). Only prepend/append check existence (`:262-263`, `:276`). Non-silent create goes to `openOrCreateNote`, which does check (`note-creator.service.ts:86-89`). [READ]
- Entry: `onOpenUrl` (`deep-link.service.ts:87-93`) and cold start (`getCurrent`, `:96+`). `deep-link:default` permission in capabilities. No `ask`/`confirm` anywhere in `deep-link.service.ts` or `deep-link-actions.ts` (rg).
- Scenario: a web page or another app opens `kokobrain://new?vault=<name>&file=Inbox&silent=true&content=...`. Inbox.md is replaced with the new content. History only snapshots the NEW content (`file-history.service.ts:117`, `save_snapshot` dedupes on content, stores what was saved), so the prior body is not in history unless it was saved by the app earlier. Note `resolveFilePath` (`src/lib/utils/path.ts:33-44`) keeps the write inside the vault, so this is "wrong note in vault", not traversal.
- Not in `.scratch/architecture-stability/issues/` (grep for deep-link/overwrite/silent: only Issue 67 e2e specs and unrelated). Treat as new.
- Suggested check: confirm what `resolveContent` returns when `content` is absent (I did not read it; if it returns '' this silent+no-content link blanks a note).

### Lead 3. Non-home vaults: Rust writes succeed, plugin-fs writes fail, dirty tabs can be stranded
- Confidence: MEDIUM. Mechanism is strongly supported by [READ] (dialog allows any folder, capability scope is limited, Rust commands unscoped) plus [FETCHED] (plugin-fs denies out-of-scope paths via `resolve_path`).
- Scenario: user picks `~/Desktop/notes` as vault. `create_note` succeeds (`commands/vault.rs:899`), so a file exists and is indexed. Editing and saving the note calls `writeTextFile` (`editor.service.ts:168`), which the ACL denies. `editor.service.ts:172-175` shows "Failed to save file." and the tab stays dirty. Quitting or closing the tab can lose the unsaved text depending on lifecycle guards (not checked in this slice; lifecycle scout should confirm).
- Also: `vault-index-updated` and watcher events make the note appear in lists even though saves fail. Inconsistent state for the user.
- Suggested check: open a vault outside the two allowed roots and try an edit and save.

### Lead 4. `..` in not-yet-existing paths may pass the plugin-fs scope
- Confidence: LOW-to-MEDIUM. Depends on `resolve_real_path` behavior for non-existing paths in plugins-workspace, which I did not fully confirm (summary only). The core `is_allowed` glob behavior with unresolved `..` is [FETCHED].
- Mechanism: `scope/fs.rs` does not canonicalize non-existing paths, so `$HOME/kokobrain-vaults/V/../../../../x.md` (new file) matches `$HOME/kokobrain-vaults/**` literally. OS then resolves `..` on write.
- Why it matters: Rust explicitly blocks `..` (`vault.rs:862-874`) because of a wikilink audit finding (`[[../../x]]`). The same class of path can reach TS plugin-fs writers built by string concatenation: `templates.service.ts:115-116` (`${vaultPath}/${relPath}`), `auto-move.service.ts:75-81`, `type-definitions.service.ts`, `fs.service.ts:48`. Deep-link paths are protected by `resolveFilePath` (`utils/path.ts:33-44`).
- Scenario needing a source: a TS caller that builds a new-file path from user or note content without `resolveFilePath`. I did not find one in this slice; auto-move config values and template paths were not traced.
- Suggested check: test `write_text_file` with `...vault/V/../../../x.md` against the real scope (needs a running app or the plugin's Rust tests; not run here).

### Lead 5. `toggle_task_status` writes any path it is given, no containment check
- Confidence: LOW (needs a compromised or buggy frontend). Mechanism [READ]: `vault.rs:664-690` reads and `write_atomic`s `path` with no `ensure_safe_write_path` and no index-membership check. Caller `tasks.service.ts:102-105` passes a path from the tasks panel (index-derived). The ACL does not apply.
- Impact if reached: rewrites `- [ ]`/`- [x]` on the given line of an arbitrary file the process can write, via temp+rename (inode replaced, mode changed [INFER]).

### Lead 6. Stale Rust index after a failed IPC (dedupe stored first)
- Confidence: MEDIUM that it happens on IPC failure; LOW impact (index and search only, not files). Mechanism: `note-change.service.ts:229` marks the content as indexed before `update_note_in_index` (`:235-239`) and swallows its error. A retry on the same bytes is skipped by `isAlreadyIndexed`, so the Rust index and FTS/semantic rows stay stale until content changes or a full rescan (`scan_vault_v2*`). Also `rename_note` failure (`path-change.service.ts:157-161`) leaves new-path entries missing until a watcher event or rescan.
- Owned by the index/note-change scout; listed here because the IPC error handling is in this slice.

### Lead 7. `write_atomic` leaves visible stray files; no fsync; mode and symlink side effects
- Confidence: HIGH that stray `*.md.tmp-<pid>-<seq>` files can remain after a crash between `fs::write` and `rename` (no cleanup code exists; `rg` confirms). Not hidden: `scan_dir` skips only dot-prefixed names (`vault.rs:103`), so stray `Note.md.tmp-123-0` appears in the file tree. Not indexed (not markdown, `utils/fs.rs:114-117`).
- No fsync (`utils/fs.rs:27-28`), so after power loss the rename may be persisted before data (ext4 `auto_da_alloc` is not guaranteed on APFS) [INFER].
- New file mode is default umask, not the original mode; symlink targets are replaced by a regular file [INFER].
- Impact: cosmetic clutter plus a narrow power-loss window. Lower priority than Lead 1 because the app's note saves don't use this path anyway.

### Lead 8. `renameItem` existence check and case-only renames on case-insensitive volumes
- Confidence: LOW-to-MEDIUM [INFER from APFS default case-insensitivity; not tested]. `fs.service.ts:205` `exists(newPath)` returns true for `note.md` -> `Note.md` on APFS, so a case-only rename throws "already exists". Behavior bug, not data loss.
- Same for `moveItem` (`:233`) when moving to the same folder with different case.

### Lead 9. Permanent-delete fallback when no vault is open
- Confidence: LOW (reachability unclear). `fs.service.ts:173-182`: if `vaultStore.path` is null, `deleteItem` calls plugin `remove(itemPath, {recursive: true})`, which bypasses the trash. Scope allows `$DOCUMENT/kokobrain-vaults/**` and `$HOME/...`. Confirm in the trash scout whether this can run.

### Lead 10. Out-of-scope rename or move is denied only after the path is chosen
- Confidence: LOW. `moveItem` and `renameItem` pass both paths to plugin-fs `rename`, which checks both (FETCHED: `resolve_path` for old and new). A move out of the vault (drag to ~/Desktop) fails at the ACL. `applyPathChange` runs diskOp first (per its comment), so failure should leave the index untouched. Not an issue if the ordering holds; note for the path-change scout.

### Non-leads (checked, no finding)
- `read_files_batch` containment is correct (`files.rs:37,49`).
- `ensure_safe_write_path` rejects `..` for `create_note` and `create_folder` (`vault.rs:862-874,895,924`). Only true `..` components; `a..b.md` allowed (doc at `:857-861`).
- `call()` does not swallow errors (`ipc.ts:21-26`).
- Command count parity 58 = 58 (`lib.rs:294-351` vs `commands.ts:35-170`).
- `resolveFilePath` lexical containment (`utils/path.ts:33-44`) is correct for the deep-link paths.
- `write_snapshot_atomic` is correct for the index cache (`index_cache.rs:55-76`).

---

## 7. Known issues cross-check

- Issue 34, save dirty tabs before vault switch: KNOWN. `switchVault` at `vault.service.ts:18-22` covers this slice's entry.
- Issue 10 and 37, typed `call()` and migration of invoke sites: DONE per file. Only `UpdateSection.svelte:171` still uses raw `invoke` (plugin command, intentional per `ipc.ts:17-19`).
- Issue 12, typed E2E IPC mock: relevant to parity, not re-checked.
- Issue 65 (incremental index refresh) and 69 (E2E shape): cover `get_index_delta` and `vault-index-updated`. Not re-audited here.
- Issues 54 and 63 (view parse cache out-of-order insert): not write-path; not re-checked.
- Nothing in `.scratch/architecture-stability/issues/` covers: plugin-fs write atomicity (Lead 1), deep-link overwrite (Lead 2), non-home vault scope (Lead 3), `..` scope (Lead 4), toggle containment (Lead 5), dedupe-before-IPC (Lead 6), stray tmp files (Lead 7). Treat these as NEW unless the owner says otherwise.

---

## 8. Not checked

- Did not run `cargo`, `pnpm`, vitest, playwright or any build. No scope behavior was executed.
- Did not verify the plugins-workspace `resolve_real_path` for non-existing paths (Lead 4), nor the exact plugin version the app pins (only `main`/`v2` fetched). Did not verify tauri `dev`-branch scope code against the locked version.
- Did not read `trash.service.ts`, `path-change.service.ts`, `note-change.service.ts` beyond the call sites listed, `lifecycle` quit guards, `resolveContent` (deep link), `auto-move` target path construction, `log.service.ts` writes, or the watcher self-save logic. Those belong to other scouts in `.scratch/file-io-audit/raw/`.
- Did not confirm APFS case-insensitivity behavior for Lead 8 on this machine.
- Did not check ADR text for the vault-location decision (whether the two-root restriction was intended and enforced elsewhere). `docs/` not searched.

Risks the owner must know: Lead 1 (note saves are non-atomic) and Lead 2 (deep links overwrite notes silently) are the two items that can destroy user content with no recovery path inside the app. Lead 3 can strand unsaved edits on vaults outside the two allowed roots.
