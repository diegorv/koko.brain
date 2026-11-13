# Scout 04: Rust data commands for composer autocomplete

Read-only research at HEAD 130d6b8f7. All paths are relative to the repo root. Nothing was run.

## Short answer

- The three data sources the editor host uses are served by Rust commands that take **no vault path**: `get_all_tags_v2` and `get_all_vault_entries_v2` read the Tauri-managed `VaultIndexState` only. They are plain `#[tauri::command]`s, so the composer webview can `call()` them as-is.
- The one exception is the file list. The editor's `files` (every non-`.view` file in the tree, including images and PDFs) comes from the frontend `fsStore.fileTree`, which is fed by `scan_vault(path, sortBy)`. That command needs a path. The Rust index only holds markdown-family files.
- Rust does know the open vault: indirectly via the open DB connection path, and directly via `VaultIndex::vault_root()` once a scan ran. There is no ready-made "current vault path" command. Adding one is a Rust-side change (new command), which is allowed by the owner constraints (only editor files are frozen).
- Window ACL: the composer capability lists no custom commands and still invokes `submit_composer_capture`, so custom commands are not gated per command here (details under Risks).

## 1. Commands and signatures

### Tags: `get_all_tags_v2`

- Defined at `src-tauri/src/commands/vault.rs:638-647`. Signature: `fn get_all_tags_v2(state: tauri::State<'_, VaultIndexState>) -> Result<Vec<TagAggregate>, String>`. Sync (not async), takes a read lock on the index, calls `idx.lookup_all_tags()`.
- Registered at `src-tauri/src/lib.rs:351`. TS contract: `src/lib/contracts/commands.ts:103` (`args: NoArgs`, `result: TagAggregate[]`), arg-name table at `commands.ts:284`.
- `TagAggregate` is `{ name, count, filePaths }` (`src-tauri/src/vault/task.rs:157-168`). `name` is the first-seen casing; `count` is the number of distinct notes, case-insensitive; sorted by lowercase name (`src-tauri/src/vault/index.rs:1039-1065`).
- The editor consumer maps each aggregate to `{ name, count }` and drops `filePaths` (`src/lib/app/editor-host.ts:102`). `VaultTag` is `{ name, count }` (`src/lib/core/markdown-editor/editor-host.ts:19-24`). So the payload carries every tag's full path list and the frontend discards it. On a large vault this is wasted IPC bytes for a composer that only needs name + count.
- Tag completion calls only `host.listTags()` (`src/lib/core/markdown-editor/extensions/tag/completion.ts:26`). It needs nothing else from the host.

### Note entries and frontmatter: `get_all_vault_entries_v2`

- Defined at `src-tauri/src/commands/vault.rs:562-575`. Signature: `fn get_all_vault_entries_v2(state: tauri::State<'_, VaultIndexState>) -> Result<Vec<NoteEntry>, String>`. Clones every entry under a read lock, sorts by path.
- Registered at `src-tauri/src/lib.rs:347`. TS contract `src/lib/contracts/commands.ts:95`, arg table `commands.ts:280`.
- The Rust type is `NoteEntry` (`src-tauri/src/vault/entry.rs:145-208`). The TS name `NoteEntryV2` is an import alias: `src/lib/types/vault-v2.types.ts:21` (`NoteEntry as NoteEntryV2`). There is no Rust struct named `NoteEntryV2`.
- Fields: path, title, `frontmatter: BTreeMap<String, JsonValue>`, outgoing_links, tags, timestamps, size, word_count, snippet, tasks, task_headings, is_a, lifecycle flags, relationship maps. This is the heavy "everything" DTO.
- What the wikilink completion reads from it: only `entry.path` and `entry.frontmatter['aliases'] ?? ['alias']` (`src/lib/core/markdown-editor/extensions/wikilink/completion.ts:27-36`, loop at `:87-91`). Everything else on the entry is unused by completion.
- The frontend wraps this in a version-keyed memo, `getVaultEntries()` (`src/lib/core/vault/vault-entries.service.ts:26-38`). That memo depends on `vaultStore.vaultIndexVersion` and is main-window state; the composer webview has none of it.
- `.view` entries are in the index entries. The editor filters them out client-side with `isLinkTargetFile` (`src/lib/app/editor-host.ts:131`; regex at `src/lib/core/filesystem/wikilink-resolution.logic.ts:15-20`). A composer fed directly from Rust must apply the same filter (or `VaultIndex` already excludes `.view` from its resolution caches, per comments at `index.rs:268-272`, but not from `entries`).

### Vault file list: `scan_vault`

- `src-tauri/src/commands/vault.rs:120-128`: `async fn scan_vault(path: String, sort_by: String) -> Result<Vec<FileNode>, String>`, runs on `spawn_blocking`; it canonicalizes the given path via `validate_vault_path` and walks the tree (`vault.rs:130-137`). Skips dot-prefixed entries. Contract `commands.ts:76`.
- This is what feeds the editor's `files`: `treeLinkIndex()` does `flattenFileTree(fsStore.fileTree).filter(isLinkTargetFile)` (`src/lib/app/editor-host.ts:76-85`). `FileEntry` is `{ name, nameWithoutExt, path }` (`src/lib/core/filesystem/file-entries.logic.ts:4-8`), and `matchFilesForWikilink` fuzzy-matches `file.name` only (`wikilink/completion.logic.ts:75-90`).
- The Rust index does NOT contain non-markdown files. `is_markdown_filename` accepts only `.md`, `.markdown`, `.view` (`src-tauri/src/utils/fs.rs:143-146`) and the index scan uses `collect_markdown_paths_with_metadata` (`utils/fs.rs:121-128`, called from `vault.rs` `collect_v2_entries`). So a composer fed only from `get_all_vault_entries_v2` would offer notes but not attachments (images, PDFs) that the editor offers. Closing that gap needs `scan_vault` (path required) or a new Rust command that walks without the frontend's tree.
- The main-window `fsStore.fileTree` is built by the frontend; the composer cannot read it.

### Content reads (for `[[Note#heading` and `[[Note^block` completion)

- Heading/block completion calls `host.resolveLink` then `host.readNote(path)` (`wikilink/completion.ts:16-21`). The app host implements `readNote` with `@tauri-apps/plugin-fs` `readTextFile` (`src/lib/app/editor-host.ts:135-137`). The composer capability grants no fs permission (`src-tauri/capabilities/composer.json`), so that path is closed in the composer.
- The only Rust content-read command found is `read_files_batch(vault_path, paths)` (`src-tauri/src/commands/files.rs:23-27`): requires `vault_path`, rejects paths outside it (`files.rs:31,49`). Usable if heading/block completion is in scope; the owner's scope says tags and wikilinks only. Open question whether `[[Note#` counts (see below).

## 2. Do they need `vault_path`?

| Command | Needs path arg | Checks open vault | Source |
|---|---|---|---|
| `get_all_tags_v2` | no | no | `vault.rs:638-647` |
| `get_all_vault_entries_v2` | no | no | `vault.rs:562-575` |
| `scan_vault` | yes (`path`, plus `sortBy`) | no; just canonicalizes | `vault.rs:120-137` |
| `read_files_batch` | yes (`vault_path`) | no; containment check only | `files.rs:23-49` |

- `with_vault_db(vault_path, f)` and `ensure_open_vault` (`src-tauri/src/db/mod.rs:135-143`, `:159-176`) guard **database** access only (history, semantic, todoist repos per the contract comments at `commands.ts:60-64`). They compare the canonical `<vault_path>/.kokobrain/kokobrain.db` against the open connection's file (`conn.path()`). Neither tag nor entry commands touch the DB; they use the `VaultIndex` held in managed state (`src-tauri/src/lib.rs:319`, type at `src-tauri/src/vault/mod.rs:26`).
- Consequence: neither `with_vault_db` nor `ensure_open_vault` is relevant to tag or note-entry reads. They would matter only if a new composer command wanted to verify "the DB I think is open is the vault whose index I read".

## 3. Does Rust know the open vault path?

There is no stored "current vault path" field or getter command. What exists:

1. **DB connection path.** `open_database(vault_path)` opens `{vault_path}/.kokobrain/kokobrain.db` into the global `DB` mutex (`db/mod.rs:37-80`; statics at `:14-21`). `ensure_open_vault` shows the way to recover the path: `conn.path()` returns the DB file; the vault dir is two parents up (`db/mod.rs:159-176`). `db::is_open()` (`db/mod.rs:101-103`) is the only public "is a vault open" probe and is what the global hotkeys already gate on (`src-tauri/src/lib.rs:45`). No helper currently returns the path.
2. **`VaultIndex::vault_root()`** (`src-tauri/src/vault/index.rs:349-351`): the canonical root set by `build_with_root` (`index.rs:396-398`), called from `scan_vault_v2` (`vault.rs:1474`), the cache-miss path of `scan_vault_v2_cached` (`vault.rs:1597`), and the cache-hit path (`vault.rs:1703`). `None` before the first scan or after a plain `build` (doc at `index.rs:344-348`). Existing in-Rust consumers compare it to a canonicalized caller path (`vault.rs:807`, `vault.rs:908`).
3. **Watcher.** `start_watcher_inner(vault_path, ...)` holds a path (`src-tauri/src/vault/watcher.rs:257-284`), but only via `VaultWatcherState` internals; not inspected for a getter.
4. **Composer side.** The comment at `src-tauri/src/quick_capture/commands.rs:457-458` states the composer has no `vaultStore` (separate JS context), and the capture payload is built "minus `vault`, which the frontend fills" (`commands.rs:~55-60` doc). Rust-side quick capture also does not know the vault: `import_staged_shot` takes `vault_path` from the frontend (`commands.rs:~172-182`).

So a composer-side command can answer **without the frontend passing a path** for tags and entries (they do not need one), and could answer a "vault path" question from `VaultIndex::vault_root()` or the DB path, but nothing exposes either today.

### Staleness window to design around

- Vault switch order in `initializeVault`: Step 2 `open_vault_db` runs first (`src/lib/app/lifecycle/app-lifecycle.service.ts:246-254`), then the index scan (Step 4, markIndexReady at `:~345-352`). Between them the Rust `VaultIndex` still holds the previous vault, which is why the editor host returns `[]` until `vaultStore.indexReady` (`src/lib/app/editor-host.ts:96-99`).
- `close_vault_db` closes only the DB (`commands/db.rs:~17-21`); no command found that clears `VaultIndexState` at teardown (`teardownVault` at `app-lifecycle.service.ts:~620-650` calls `close_vault_db` and resets TS state, not the Rust index). UNVERIFIED: I did not read every command; I found no `VaultIndexState` clearing command in `src-tauri/src/commands/*.rs` by grep (only `scan_vault_v2*` rebuild it).
- The global hotkey gate is only `db::is_open()` (`lib.rs:45`). During the Step 2 to Step 4 window of a vault switch, the composer can open while the index is the old vault's. A composer command reading `VaultIndexState` unguarded would offer the previous vault's tags/notes in that window. A guard is possible in Rust: compare `idx.vault_root()` against the vault dir derived from the open DB path (same canonical-compare idea as `ensure_open_vault`). This is the Rust-side equivalent of the editor host's `indexReady` check.

## 4. Reuse opportunities

- **Tags: zero new Rust needed for correctness.** The composer can `call('get_all_tags_v2')` directly (route already imports `call` from `#lib/contracts/ipc.js`, `src/routes/composer/+page.svelte:5`). Map to `{ name, count }` exactly as `editor-host.ts:102` does, then feed the editor's `rankTags` (`tag/completion.logic.ts`) / `VaultTag`. Optional Rust tweak: a lean variant that omits `filePaths` (payload size only).
- **Wikilink notes and aliases: `get_all_vault_entries_v2` directly.** Gives paths (build `FileEntry` as `{ name, nameWithoutExt, path }`, same shape `flattenFileTree` produces) and frontmatter for aliases. Same `.view` filter needed client-side. Output feeds `matchFilesForWikilink` unchanged.
- **Attachments are the gap.** Either accept notes-only in the composer, or add a Rust command that lists non-markdown files for the open vault without a path argument (derive root from `vault_root()`/DB path). Decision for the owner: whether `[[img.png` offers in the composer matters.
- **A single purpose-built Rust command** (for example one that returns `{ files: [{name, path}], aliases: [{path, alias}] }` and `{ tags }`) would avoid shipping full `NoteEntry` clones (tasks, snippets, outgoing links) to a small popover. It would need a new IPC DTO (`#[ts(export)]`), which per CLAUDE.md rule 6 makes the change "Both" (cargo test regenerates `src/lib/contracts/generated/`). Not required: the existing two commands cover the data.
- **Facet-level reuse:** the editor's sources read data only through the `editorHost` facet (`editor-host.ts`: `listTags`, `listLinkCandidates`, `readNote`, `resolveLink`). A composer host implementing `EditorHost` over the Rust commands above plugs into the unchanged completion sources. That is the topic of other scouts; for this scout the relevant fact is that every host method has a Rust-backed source except `readNote` (needs fs permission or `read_files_batch`).

## 5. Risks

1. **Per-command ACL.** `src-tauri/build.rs` calls plain `tauri_build::build()` with no app manifest (`build.rs:19-27`), and `composer.json` grants only `core:default` + two window permissions yet the route invokes `submit_composer_capture` and `dismiss_composer` (`composer/+page.svelte:77,102`). This is consistent with Tauri 2 allowing app commands for all windows unless an `AppManifest` restricts them. I did not verify that against the Tauri source or docs in this session: UNVERIFIED beyond the repo evidence above. If a new command is added, add it to `lib.rs` `generate_handler!` (`lib.rs:326+`) and to the contract tables in `src/lib/contracts/commands.ts` (args at ~`:229`, names at ~`:327`).
2. **Wrong-vault window** (section 3): Step 2 to Step 4 of a vault switch, and after teardown the index is not cleared (see UNVERIFIED note). Hotkeys gate on DB open only.
3. **Freshness.** The editor's tag/entries data is a memo keyed by `vaultIndexVersion` with throttled bumps (`vault-entries.service.ts:7-25`, `editor-host.ts:87-111`). A composer calling the commands per open has no version key; the index itself is fresh to the last Rust mutation (the throttle is a frontend cache concern, not a Rust one), so reading at summon time is at least as fresh as the editor.
4. **Cost per call.** `get_all_vault_entries_v2` clones every `NoteEntry` (including tasks and snippets) and serializes them over IPC; on a 2k+ note vault this is the same cost the app already pays once per version (rules doc `docs/agents/indexing-watcher-rules.md` item 12). In the composer it would run on each summon unless cached in the composer route. `get_all_tags_v2` ships `filePaths` per tag, also wasteful. Neither blocks the read lock for long, but both hold `VaultIndexState` read locks (writers wait); acceptable, not measured.
5. **Case and nesting parity.** Tag aggregation is case-insensitive with first-seen casing (`index.rs:1039-1065`); `editor-host.ts` adds nothing on top, so parity with the editor is by construction if the same command is used.
6. **Non-markdown/`.view` parity** (section 1): notes-only list differs from the editor's list unless a path-free file lister is added.
7. **Not-open vault.** With no vault open the hotkeys no-op (`lib.rs:45`); if the composer is ever shown in that state the commands return the empty default index, not an error (`VaultIndex::default()` managed at `lib.rs:319`; UNVERIFIED that default is empty: only inferred from `Default` use in tests, `index.rs:1873`).

## 6. Open questions

1. Is attachment (`.png`, `.pdf`) completion required in the composer, or is notes + aliases enough? It decides whether a new path-free file-listing Rust command is needed.
2. Is heading/block completion (`[[Note#`, `[[Note^`) in scope? It needs content reads, which the composer cannot do today (no fs capability); `read_files_batch` requires a vault path argument.
3. Where should the vault root for any new Rust command come from: `VaultIndex::vault_root()`, the DB path, or a new field set at `open_vault_db`? The first two exist today; the DB-path derivation matches the open-vault semantics of `with_vault_db`.
4. Should a new composer command guard against the vault-switch window (compare `vault_root()` with the open DB's vault dir), or is returning possibly-stale data for a few seconds acceptable (the owner's memory rule: no core changes for corner cases applies to core write paths, not necessarily a read guard)?
5. UNVERIFIED: whether `VaultIndexState` is ever cleared at vault close (no clearing command found by grep).
6. UNVERIFIED: Tauri 2 default ACL behavior for app commands, from repo evidence only.
