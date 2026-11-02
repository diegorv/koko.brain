# Scout 02: Rust search, semantic, history, sentry, updater (iOS inventory)

Scope: `src-tauri/src/commands/{semantic,search_index,history,sentry,update_channel}.rs`, `src-tauri/src/{search,semantic,db}/`. Read-only; no cargo or pnpm run. Line numbers are `path:line` in the repo at HEAD (main, 2026-11-02).

## Key findings

1. **FTS5 text search and file history are already ONNX-free and Tauri-free in logic.** Their only Tauri coupling is `#[tauri::command]` attributes and `ts_rs` derives. Their compile deps are `rusqlite` (bundled), `sha2`, `similar`, and `utils::fs`. Keep them on iOS with no code change beyond the shared DB open path.
2. **The ONNX surface is small and well contained.** `ort`, `tokenizers`, `ndarray`, and `half` are imported only in `semantic/embedder.rs` and `semantic/reranker.rs`. `ort` is also referenced in `semantic/mod.rs:14-48` and `semantic/qos.rs:126-147`. `reqwest` and `futures-util` are used only by `semantic/model.rs` downloads. `Cargo.toml:59-64` makes all of these unconditional deps.
3. **Pure semantic logic is separable from the model.** `chunker.rs`, `types.rs`, `filtering.rs`, `cache_stats.rs`, and `quantize.rs` import no ONNX crate. `cosine_similarity` and `deserialize_embedding` are pure, but they live inside `embedder.rs` (`:342`, `:364`) and must move out before `embedder.rs` can be gated.
4. **The `_inner` build and download functions already take a progress callback instead of `AppHandle`** (`commands/semantic.rs:412`, `:442`, `:480`). Only `emit_progress` (`:397-404`) and the 5 wrappers touch Tauri. This is the existing seam for a headless host.
5. **`search_hybrid` and `search_semantic` fail hard when the model is missing.** `search_hybrid` runs FTS first (`:946`) and then `ensure_embedder_loaded()?` (`:952`). The `?` discards the FTS results and returns Err. iOS needs an explicit FTS-only branch, not a missing-model error.
6. **The frontend calls semantic commands on every save and delete.** `note-change.service.ts:247-252` invokes `update_search_index_file` and `update_semantic_file`. `:209-218` invokes `remove_from_search_index` and `remove_semantic_file`. If `update_semantic_file` is not registered on iOS, every save rejects, and `error()` reports to Sentry (project CLAUDE.md). Keep the command registered as a no-op, or gate the call in the frontend.
7. **The DB path is hardcoded to `<vault>/.kokobrain/kokobrain.db`** (`db/mod.rs:37`). All stored keys are vault-relative, so the DB can be relocated without key rewrites. The loss is the "copy the folder" property (ADR-0019), and the WAL file must stay on one host (SQLite doc, quoted below).
8. **Updater and global-shortcut are not available on iOS.** `tauri-plugin-updater` lists iOS as unsupported. `tauri-plugin-global-shortcut` has `#![cfg(not(any(target_os="android", target_os="ios")))]`. `lib.rs` registers both unconditionally.
9. **A native ONNX Runtime iOS prebuilt exists for the pinned ort version.** `ort-sys` at tag `v2.0.0-rc.15` lists `aarch64-apple-ios+coreml` and `aarch64-apple-ios-sim+coreml` (ORT ms@1.31.0). Whether the iOS build reaches this binary, and whether it runs on-device within iOS memory limits, is UNVERIFIED.
10. **A partial iOS scaffold exists but was never linked.** `src-tauri/gen/apple/` contains `kokobrain.xcodeproj` and an `.xcarchive` (dated Jun 9-10, 2026). The archive's `KokoBrain.app` has no executable, and `gen/apple/Externals/arm64/debug/` is empty. Git does not track `gen/`. No evidence in the repo that a Rust iOS build has ever linked.

---

## 1. Command inventory

Registration: `lib.rs:293-352`. Frontend contract: `src/lib/contracts/commands.ts`. Events: `events.rs:9` (`semantic-index-progress`) is the only event from this scope.

### 1a. FTS5 and history (keep on iOS, no ONNX, no Tauri logic)

| Command | Defined | Args → Return | State | Events | Deps (crates / modules) | iOS disposition |
|---|---|---|---|---|---|---|
| `build_search_index` | `commands/search_index.rs:38-43` (async, `spawn_blocking`), body `:57-145` | `vaultPath` → `IndexStats {totalDocuments, added, updated, removed, unchanged}` (`:14-29`) | `FTS_DB` (`db/mod.rs:27`); writes `notes_content` + `notes_fts` via `with_fts_db_transaction` (`:92`); `checkpoint_fts_wal` (`:139`) | none | rusqlite, `utils::fs::validate_vault_path` (`:59`), `collect_markdown_paths_with_mtime(&vault, &[])` (`:62`), `search::fts_logic::plan_reconcile` (`:72`) | KEEP |
| `search_fts` | `commands/search_index.rs:148-161` (sync) → `search_fts_inner` `:164-182` | `query, maxResults?=50, fuzzy?=false` → `FtsSearchResult[] {path,title,score,snippet,tags}` (`db/fts_repo.rs:6-22`) | `FTS_DB` read | none | `fuzzy::expand_fuzzy_terms` via `notes_fts_vocab` (`search/fuzzy.rs:46-58`) | KEEP |
| `update_search_index_file` | `commands/search_index.rs:194-205` (async) → inner `:208-224` | `filePath, content, vaultPath` → `()` | `FTS_DB` transaction; stat via `file_mtime_secs` (`:291-308`) | none | rusqlite | KEEP |
| `remove_from_search_index` | `commands/search_index.rs:230-235` → `:238-241` | `filePath` → `()` | `FTS_DB` | none | rusqlite | KEEP |
| `save_snapshot` | `commands/history.rs:56-78` (sync) | `filePath, content` → `bool` (false = deduped by SHA-256 vs latest row) | main `DB` mutex (`db/mod.rs:17`) | none | sha2, `db::history_repo` (`db/history_repo.rs:18-43`) | KEEP |
| `get_file_history` | `commands/history.rs:81-84` | `filePath` → `SnapshotInfo[] {id, timestamp(ms), size}` (`db/history_repo.rs:7-14`) | main `DB` | none | `db/history_repo.rs:46-68` | KEEP |
| `get_snapshot_content` | `commands/history.rs:87-90` | `snapshotId` → `string` | main `DB` | none | `db/history_repo.rs:71-78` | KEEP |
| `compute_diff` | `commands/history.rs:94-135` (pure, no DB) | `oldContent, newContent` → `DiffLine[]` (`:10-42`) | none | none | similar | KEEP |
| `cleanup_history` | `commands/history.rs:142-158` | `retentionDays: u32` → `u32` deleted count | main `DB` in `with_db_transaction` | none | `db/history_repo.rs:82-109` | KEEP |
| `open_vault_db` | `commands/db.rs:7-11` | `vaultPath` → `()` | opens both connections (see section 4) | none | `utils::fs::validate_vault_path`, `db::open_database` | KEEP (path decision, section 4) |
| `close_vault_db` | `commands/db.rs:15-18` | `()` → `()` | drops both connections (`db/mod.rs:91-99`) | none | none | KEEP |

### 1b. Semantic (ONNX-bound unless noted)

| Command | Defined | Args → Return | State | Events | ONNX / model dependency | iOS disposition |
|---|---|---|---|---|---|---|
| `init_semantic_search` | `commands/semantic.rs:355-381` (async) | `vaultPath` → `bool` | `EMBEDDER`, `VAULT_PATH`, `MODEL_AVAILABLE` (`:24`, `:27`, `:36`) | none | `ensure_embedder_loaded` (`:242-268`) → `ort` session | GATE |
| `is_semantic_model_available` | `:383-387` | `vaultPath` → `bool` (file-exists check only) | none | none | `ModelManager::for_embedder` (`semantic/model.rs:78-93`) | KEEP as stub returning false when model feature is off (see section 6) |
| `is_reranker_model_available` | `:390-394` | `vaultPath` → `bool` | none | none | `model.rs:83-93` | same as above |
| `download_semantic_model` | `:436-439` → inner `:442-465` | `vaultPath` → `bool` | none | `semantic-index-progress` phase `Downloading` via `emit_progress` (`:397-404`) | reqwest + huggingface.co (`model.rs:25-35`, `:142-203`) | GATE |
| `download_reranker_model` | `:406-409` → inner `:412-434` | `vaultPath` → `bool` | none | phase `DownloadingReranker` | reqwest, 571 MB (`model.rs:38-56`) | GATE |
| `build_semantic_index` | `:467-478` → inner `:480-766` | `vaultPath` → `SemanticStats {totalChunks, totalSources, modelLoaded}` (`semantic/types.rs:25-35`) | `BUILD_LOCK` (`:95`, `:484`); `EMBEDDER` locked per batch (`:643`); `MODEL_AVAILABLE`; DB transactions; `invalidate_search_cache` (`:750`); `unload_embedder` (`:757`) | `semantic-index-progress` phases `Chunking`, `Embedding` | `EMBEDDER.embed_batch` (`:646`); `compute_model_hash` reads `model.onnx` (`:1467-1487`) | GATE |
| `search_semantic` | `:768-928` (async) | `query, maxResults?=20, minScore?=0.3` → `SemanticResult[]` (`semantic/types.rs:2-21`) | `EMBEDDER.try_lock` (`:792`); `RERANKER` (`:840-854`); `SEARCH_CACHE` (`get_or_load_cache`, `:152-229`) | none | `ensure_embedder_loaded()?` (`:788`); `ensure_reranker_loaded()?` (`:840`) | GATE |
| `search_hybrid` | `:930-1130` (async) | `query, maxResults?=20` → `SemanticResult[]` | as above, plus `search_fts_inner` at `:946` | none | `ensure_embedder_loaded()?` at `:952`, after FTS; `ensure_reranker_loaded()?` at `:1067` | SPLIT: keep command, return FTS results when the embedder is absent. Today it returns Err (finding 5). |
| `get_semantic_stats` | `:1132-1135` → `get_semantic_stats_inner` `:1377-1391` | `()` → `SemanticStats` | `MODEL_AVAILABLE` flag + `chunks` counts | none | none (DB only) | KEEP (returns zeros on iOS) |
| `get_semantic_file_status` | `:1144-1156` | `filePath` → `SemanticFileStatus {chunkCount, lastEmbeddedAt, modelLoaded}` (`types.rs:39-50`) | `MODEL_AVAILABLE` + `semantic_repo::get_file_index_info` | none | none | KEEP |
| `shutdown_semantic` | `:1158-1185` | `()` → `()` | clears `MODEL_AVAILABLE`, `EMBEDDER` (`:1162`), `RERANKER` (`:1165`), `SEARCH_CACHE` | none | drops `Embedder` and `Reranker` | KEEP, dropping the two ONNX lines (`:1161-1166`) under the gate |
| `remove_semantic_file` | `:1187-1208` (async) | `filePath` → `()` | `chunks` + `mtime:<rel>` in one transaction; cache invalidated only when rows were removed | none | none (DB only) | KEEP (called on every delete, `note-change.service.ts:217`) |
| `update_semantic_file` | `:1210-1344` (async) | `filePath, content, vaultPath` → `()` | empty-file branch (`:1222-1232`) and hash-skip branch (`:1247-1257`) are DB-only; embed branch takes `EMBEDDER` (`:1264-1266`) and calls `embed_batch` (`:1285`) | none | `ensure_embedder_loaded()?` at `:1264` | SPLIT: keep the DB-only branches; the embed branch needs the gate. Called on every save (`note-change.service.ts:252`). |

Helpers in the same file, used by the commands above:

| Helper | Line | Gate? |
|---|---|---|
| `invalidate_search_cache` | `:144-149` | keep (pure) |
| `get_or_load_cache` (loads chunks, quantizes to int8) | `:152-229` | keep, but move its `deserialize_embedding` and `cosine_similarity` imports out of `embedder.rs` first |
| `CachedChunk::score` (dot or cosine) | `:124-129` | keep |
| `unload_embedder`, `ensure_embedder_loaded` | `:231-240`, `:242-268` | GATE |
| `unload_reranker`, `ensure_reranker_loaded` | `:270-281`, `:283-312` | GATE |
| `schedule_embedder_unload`, `schedule_reranker_unload` | `:326-347`, `:314-324` | GATE |
| `update_stored_mtime` | `:1351-1375` | keep (DB + std fs) |
| `cleanup_orphaned_chunks` | `:1394-1433` | keep (called from build and tested model-free) |
| `clear_changed_files_without_chunks` | `:1435-1460` | keep |
| `compute_model_hash` (SHA-256 of first 8 KB of `.kokobrain/models/bge-m3/model.onnx` plus `EMBED_RECIPE_VERSION`) | `:1467-1487` | keep, but it returns "" when the model file is absent, and `check_and_update_model_hash` ignores "" (`:1490-1505`). Model-free behaviour is already defined. |
| `check_and_update_model_hash` | `:1490-1505` | keep (DB meta) |
| `emit_progress` | `:397-404` | Tauri glue, gate with the progress event |
| `search_cache_label` | `:85-91` | keep (used by `examples/retrieval_eval.rs`) |

Constants of note: `RERANK_CANDIDATE_POOL = 50` (`:62`), `EMBEDDER_IDLE_TIMEOUT_SECS = 120` (`:39`), `RERANKER_IDLE_TIMEOUT_SECS = 120` (`:52`), `DEFAULT_RRF_K = 60` (`search/rrf.rs:19`), build batch size 4 (`:611`), embedder `INFERENCE_BATCH_SIZE = 8` (`semantic/embedder.rs:47`).

### 1c. Sentry and updater

| Command | Defined | Args → Return | State | Events | Deps | iOS disposition |
|---|---|---|---|---|---|---|
| `configure_sentry` | `commands/sentry.rs:6-14` → `error_monitoring.rs:26-66` | `enabled, dsn, release` → `()` | `SentryState` (`lib.rs:290`); `Hub::main().bind_client` | none | `sentry` 0.49.3 with `default-features=false`, features `backtrace, contexts, panic, transport` (`Cargo.toml:70`) | KEEP as code. iOS support in `sentry` and its transport is UNVERIFIED. This is a privacy policy choice for the owner. |
| `check_for_update_on_channel` | `commands/update_channel.rs:87-129` | `channel, allowDowngrades?` → `UpdateMetadata \| null` (`:54-71`) | `webview.resources_table()` (`:123`) | none | `tauri_plugin_updater::UpdaterExt`, `webview.updater_builder()` (`:96-111`), `url` | GATE, desktop only. The plugin does not support iOS (finding 8). `UpdateMetadata` (`ts-rs` export at `:54-56`) is emitted by `cargo test` regardless of the cfg. |

Also in `lib.rs`: `tauri_plugin_updater::Builder` at `:286`, `tauri_plugin_process::init()` at `:287`, global-shortcut at `:15-17`, `:229-252`, `:271`, `:285`.

---

## 2. What depends on ort, tokenizers, ONNX model files

### 2a. Crate-level imports

| Crate | Where imported | Notes |
|---|---|---|
| `ort` (rc.15 resolved in `Cargo.lock`; `Cargo.toml:59` requires `2.0.0-rc.13`, `download-binaries, ndarray, half`) | `semantic/mod.rs:14-48` (`ort_environment`, `session_builder`); `semantic/embedder.rs:4` (`Session`), `:173-203` (tensor and `session.run`); `semantic/reranker.rs:4-5`, `:135-146`; `semantic/qos.rs:126-147` (`ThreadManager` impl, not cfg-gated) | `commands/semantic.rs` imports `Embedder` (`:5`) and `Reranker` (`:10`) |
| `tokenizers` 0.23.2 (`onig` feature, no default features) | `semantic/embedder.rs:6`, `:87-88`, `:145`; `semantic/reranker.rs:7`, `:69-86` | `onig` is a C dependency (oniguruma). iOS cross-compile: UNVERIFIED. |
| `ndarray` 0.17 | `semantic/embedder.rs:3`, `reranker.rs:3` | |
| `half` 2.7 | `semantic/embedder.rs:2`, `reranker.rs:2` | |
| `reqwest` 0.13 (`stream`), `futures-util` | `semantic/model.rs:1`, `:148-203` | `reqwest` is also in the lock for other crates; removing it from the app root does not remove it from the tree. |
| `tokio` (fs, io-util, rt-multi-thread) | `semantic/model.rs:3`, `:114-135`; `commands/semantic.rs:95` (`tokio::sync::Mutex`) | available on iOS |
| `tauri` | `commands/semantic.rs:21` (`AppHandle`, `Emitter`); `:355-1210` attributes and `emit_progress` | `semantic/` and `db/` have zero `tauri` refs (enforced, below) |

### 2b. Model files and paths

| Artifact | Path | Source | Size | Refs |
|---|---|---|---|---|
| BGE-M3 INT8 embedder | `<vault>/.kokobrain/models/bge-m3/{model.onnx,tokenizer.json}` | Xenova/bge-m3 on HF | ~542 MB (ADR-0019) | `semantic/model.rs:20-36`, `:63-75` |
| BGE-reranker-v2-m3 INT8 | `<vault>/.kokobrain/models/bge-reranker-v2-m3/{model.onnx,tokenizer.json}` | onnx-community on HF | ~571 MB | `semantic/model.rs:38-56` |
| Model hash input | `<vault>/.kokobrain/models/bge-m3/model.onnx` (first 8 KB) | | | `commands/semantic.rs:1467-1477` |

Embedding dimension: 1024, declared in the registry (`model.rs:35`) and enforced at inference time (`embedder.rs:210-216`, `validate_dimensions`).

### 2c. Test binaries (`src-tauri/tests/`)

- Ratchet: `tests/core_tauri_free_test.rs:9`, `:22-43` fails if `vault`, `db`, `search`, `semantic`, or `utils` contain `tauri::`, `use tauri`, `AppHandle`, or `Emitter`. Any iOS refactor must keep these modules free of Tauri. `commands/` is exempt.
- Names suggest session and ORT tests: `semantic_embedder_qos_session_test.rs`, `semantic_embedder_threads_test.rs`, `semantic_reranker_test.rs`, `semantic_session_builder_test.rs` (names only, contents not read).
- `tests/semantic_commands_test.rs` covers both model-free paths (`compute_model_hash`, `check_and_update_model_hash`, `cleanup_orphaned_chunks`, `clear_changed_files_without_chunks`, lines `:31-446`) and the embed path. Test `:925` asserts a build without a model "reports chunking then fails to embed".

---

## 3. Exact cfg-gate and split list

Recommended mechanism: a Cargo feature (for example `semantic-onnx`, default on) that owns `ort`, `tokenizers`, `ndarray`, `half`, `reqwest`, and `futures-util` as `optional = true` deps, plus `#[cfg(feature = "semantic-onnx")]` on the modules below. This is a recommendation, not verified against a working iOS build.

### 3a. Modules

| File | Action |
|---|---|
| `semantic/mod.rs:1-9` | `pub mod embedder; pub mod reranker; pub mod model;` and `ort_environment` / `session_builder` (`:11-48`) behind the feature. `cache_stats`, `chunker`, `filtering`, `qos` (partly), `quantize`, `types` stay ungated. |
| `semantic/embedder.rs` | Gate the whole file, except that `deserialize_embedding` (`:342-362`) and `cosine_similarity` (`:364-`) move to an ungated module (for example `semantic/vector.rs`). `commands/semantic.rs:5` and `:152-229` import them from there. |
| `semantic/reranker.rs` | Gate the whole file. |
| `semantic/model.rs` | Gate the whole file (reqwest, the HF download URLs, and the ONNX-specific file names are model-specific). |
| `semantic/qos.rs:126-147` | Gate `UtilityQosThreadManager`. `enter_utility_qos` (`:89-104`) is already a no-op off macOS, so it can stay ungated. |
| `commands/semantic.rs` | See 3b. |

### 3b. `commands/semantic.rs` line-level gate list

| Lines | Item | Action |
|---|---|---|
| `:5`, `:7`, `:10` | imports of `Embedder`, `ModelManager`, `Reranker` | gate |
| `:24`, `:45` | `EMBEDDER`, `RERANKER` statics | gate |
| `:231-268` | `unload_embedder`, `ensure_embedder_loaded` | gate |
| `:270-312` | `unload_reranker`, `ensure_reranker_loaded` | gate |
| `:314-347` | `schedule_reranker_unload`, `schedule_embedder_unload` | gate |
| `:355-381` | `init_semantic_search` | gate (or stub returning `Ok(false)`) |
| `:383-394` | `is_semantic_model_available`, `is_reranker_model_available` | keep as stubs returning `false` on iOS |
| `:406-466` | `download_reranker_model*`, `download_semantic_model*` | gate |
| `:467-766` | `build_semantic_index` and inner | gate |
| `:768-928` | `search_semantic` | gate |
| `:930-1130` | `search_hybrid` | split: keep the command, FTS-only fallback when the embedder is absent. The reranker and cosine legs are gated. |
| `:1158-1185` | `shutdown_semantic` | keep, gate the `EMBEDDER` / `RERANKER` lines (`:1162-1167`) |
| `:1210-1344` | `update_semantic_file` | split: keep the empty-file and hash-skip branches; gate the embed branch (`:1264-1285`) |
| `:1467-1487` | `compute_model_hash` | keep (it already returns "" without the model) |
| `:1507-` | test module | the `BUILD_LOCK` test (`:1514-1520`) is ungated |

### 3c. Other files

| File | Lines | Action |
|---|---|---|
| `lib.rs:15-17` | `tauri_plugin_global_shortcut` imports | `#[cfg(desktop)]` |
| `lib.rs:229-252` | accelerator parse and `ShortcutBuilder` | gate |
| `lib.rs:271` | `register_multiple(shortcuts)` | gate |
| `lib.rs:285` | `.plugin(shortcut_builder.build())` | gate |
| `lib.rs:286` | `.plugin(tauri_plugin_updater::Builder::new().build())` | gate (desktop) |
| `lib.rs:287` | `.plugin(tauri_plugin_process::init())` | not checked (see section 7) |
| `lib.rs:256-257`, `:274-278` | `build_menu`, `set_menu`, `on_menu_event` | not checked for iOS support (section 7) |
| `lib.rs:293-352` | `generate_handler!` entries for the gated commands | per-entry `#[cfg(...)]` attributes. Verified below: the macro applies command attributes to the generated match arms. |
| `commands/update_channel.rs` (whole module) | `:17-19` imports and `:87-129` command | gate the module with `#[cfg(desktop)]` |
| `Cargo.toml:67` | `tauri-plugin-updater` | move to `[target.'cfg(not(any(target_os="ios", target_os="android")))'.dependencies]` |
| `Cargo.toml:28` | `tauri-plugin-global-shortcut` | same target-scoped move |
| `Cargo.toml:59-64` | `ort`, `tokenizers`, `ndarray`, `half`, `reqwest`, `futures-util` | optional under the `semantic-onnx` feature |

`generate_handler!` per-entry cfg: `tauri-apps/tauri` `crates/tauri-macros/src/command/handler.rs:155-177` pushes each command's `attrs` onto its generated match arm (`#(#(#attrs)* #command_name_macros => ...)`), so `#[cfg(...)]` on a `lib.rs` entry is honoured. Checked on the default branch, not the 2.12.5 tag.

---

## 4. Database: open path, WAL, and moving it out of the vault

### 4a. Current behaviour

| Item | Value | Ref |
|---|---|---|
| Entry | `open_vault_db(vault_path)` → `validate_vault_path` (canonicalize + is_dir) → `db::open_database(&root)` | `commands/db.rs:7-11` |
| Path | `vault_path.join(".kokobrain").join("kokobrain.db")` | `db/mod.rs:37` (ADR-0019 cites `:18-23`; stale) |
| Dir create | `create_dir_all(<vault>/.kokobrain)` | `db/mod.rs:40-43` |
| Connection 1 (`DB`, main) | `journal_mode=WAL`, `busy_timeout=5000`, default `synchronous` | `db/mod.rs:45-57`, statics `:17` |
| Schema | `schema::create_tables` (creates `snapshots`, `app_meta`, `chunks`, `semantic_meta`, `notes_content`, `notes_fts`, `notes_fts_vocab`; FTS schema version `v3-external-content`) | `db/schema.rs:17-134`; FTS tokenizer `unicode61 remove_diacritics 2` (`:13`) |
| Connection 2 (`FTS_DB`) | same file; `journal_mode=WAL`, `busy_timeout=5000`, `synchronous=NORMAL` | `db/mod.rs:69-85`, static `:27` |
| Checkpoint | `PRAGMA wal_checkpoint(TRUNCATE)` after a batch reconcile | `db/mod.rs:191-197`, called `commands/search_index.rs:138-141` |
| Global state | two `Mutex<Option<Connection>>`; no cross-process lock | `db/mod.rs:17`, `:27` |
| Table keys | `notes_content.path` (vault-relative, `search_index.rs:66-68`), `snapshots.file_path` (relative from frontend, `file-history.service.ts:31`, `:117`), `chunks.source_path` (relative, `semantic.rs` Phase 2 and `update_semantic_file`), `semantic_meta` `mtime:<rel>` (`db/semantic_repo.rs:67-76`). No absolute path is stored in the DB. |

### 4b. What breaks if the DB lives outside the vault

Verified against the code:

- **Signature change needed.** `open_database` takes the vault root and joins `.kokobrain` itself (`db/mod.rs:36-37`). A relocated DB needs a separate `db_path` argument. `build_search_index` and `update_search_index_file` also take `vault_path` (`search_index.rs:39`, `:195-199`) to read files, so two roots are needed.
- **Model location stays in the vault unless moved too.** `ModelManager::new` (`semantic/model.rs:67-75`) and `compute_model_hash` (`commands/semantic.rs:1467-1477`) hard-code `<vault>/.kokobrain/models/`. The 542 MB model is not in the DB and does not move with it unless you change both.
- **Keys survive relocation.** Because keys are vault-relative (above), relocating the DB file does not require key rewrites. The DB is still bound to one vault: a second vault with the same relative paths would share nothing, but a DB pointed at the wrong vault would silently serve wrong content until reconcile fixes it (`plan_reconcile`, `search_index.rs:72`; reconcile diffs disk mtimes, so a changed vault is re-read but a wrong vault mapping is not detected).
- **The "copy the folder" property is lost.** ADR-0019 (`docs/adr/0019-kokobrain-in-vault-data-dir.md`, Context and Consequences) makes this the stated reason for the in-vault layout. A relocated DB must be re-created on each new device; FTS rebuilds from disk, and file history (`snapshots`) and chunk embeddings are lost.
- **WAL must stay on one host.** SQLite: "WAL does not work over a network filesystem... all processes using a database must be on the same host computer" (https://www.sqlite.org/wal.html, sections "1. Overview" and "2.2. Concurrency"). A DB inside a sync-engine folder (iCloud Drive, Dropbox, Syncthing) violates this. ADR-0019 already flags it: "Sharing a single `.kokobrain/` ... will corrupt the database."
- **Orphaned mapping on iOS.** The app-sandbox container path is what would be persisted to find the DB again. Whether the container UUID changes across app updates or reinstalls is UNVERIFIED (from memory, not checked against Apple docs).
- **`validate_vault_path` needs the vault to be a real directory** (`utils/fs.rs:39-47`). A security-scoped folder picked on iOS may need access calls before canonicalize works. UNVERIFIED (from memory).

### 4c. Recommendation for the study (not a decision)

Keep the DB under an app-owned path (sandbox `Application Support`) keyed by a stable vault id, and keep the vault as plain markdown. This keeps WAL local, drops sync-corruption risk, and trades away "copy the folder" (ADR-0019 consequence). Keeping the DB in the vault is only safe if the vault itself is local, not a sync-engine folder. Owner decision needed; the tradeoff should go to the owner before a schema or path change.

---

## 5. What the frontend expects from these commands (breakage risk on iOS)

| Frontend caller | Command | Behaviour if the command is missing on iOS |
|---|---|---|
| `note-change.service.ts:247-252` (every save, debounced) | `update_search_index_file`, `update_semantic_file` | Every save rejects. `error()` logs and reports to Sentry (project CLAUDE.md). Register stubs or gate the call. |
| `note-change.service.ts:209-218` (every delete) | `remove_from_search_index`, `remove_semantic_file` | Same. `remove_semantic_file` is DB-only, so keep it. |
| `search.service.ts:340-349` | `is_semantic_model_available` → `init_semantic_search` → `get_semantic_stats` | Gated by `is_semantic_model_available`. A stub returning false keeps the semantic path off with no further calls. |
| `search.service.ts:150`, `:250`, `:287` | `search_hybrid`, `search_semantic`, `build_search_index` | `search_hybrid` must fall back to FTS (finding 5). |
| `search.service.ts:387` | `build_semantic_index` | gate in frontend |
| `SearchSection.svelte:28-73` | `is_reranker_model_available`, `download_reranker_model`, `is_semantic_model_available`, `download_semantic_model` | hide the download UI on iOS |
| `app-lifecycle.service.ts:275` | `cleanup_history` | keep |
| `app-lifecycle.service.ts:597` | `shutdown_semantic` | keep |
| `core/settings/update-check.service.ts:24`, `sections/UpdateSection.svelte:143` | `check_for_update_on_channel` | hide on iOS (App Store update path, not checked) |
| `core/settings/sentry.service.ts:50` | `configure_sentry` | keep if Sentry stays |

---

## 6. Dependency weight

- Model downloads: 542 MB (embedder INT8) and 571 MB (reranker INT8), both from huggingface.co (ADR-0019; `semantic/model.rs:40`). iOS storage and first-run download policy: owner decision.
- Memory: the code documents about 1.6 GB peak RSS on macOS CPU-only for the embedder (`semantic/mod.rs:27-31`, measured 2026-10-27 on macOS). The reranker holds about 571 MB resident (`commands/semantic.rs:45-52`). No iOS measurement exists in the repo. iOS jetsam limits are UNVERIFIED.
- Inference is CPU only on macOS: `AutoDevicePolicy::PreferCPU` (`semantic/mod.rs:42`) because CoreML pushed the process to 30 GB (`:27-31`). The iOS build has the same policy. Whether iOS CoreML would change this is UNVERIFIED.
- Idle unload is 120 s for both models (`commands/semantic.rs:39`, `:52`), so memory is not held when idle.

---

## 7. External sources checked

| Claim | Source | Result |
|---|---|---|
| WAL needs one host, no network FS | https://www.sqlite.org/wal.html | confirmed; quoted in section 4b |
| `rusqlite` bundled enables FTS5 | `gh api repos/rusqlite/rusqlite/contents/libsqlite3-sys/build.rs` (default branch) | `-DSQLITE_ENABLE_FTS5` at line 177. Not checked against the exact `libsqlite3-sys` 0.39.0 tag (lock version); tag lookup returned nothing. |
| ORT prebuilt for iOS | `gh api repos/pykeio/ort/contents/ort-sys/build/download/dist.tsv?ref=v2.0.0-rc.15` | rows `aarch64-apple-ios  coreml` and `aarch64-apple-ios-sim  coreml` (ms@1.31.0). Which variant `download-binaries` selects for iOS is UNVERIFIED. |
| ORT iOS xcframework linking | `gh api repos/pykeio/ort/contents/ort-sys/build/static_link/apple.rs` | supported via env `ORT_IOS_XCFWK_PATH` (`ort-sys/build/vars.rs:8`). Alternative to the prebuilt. |
| Updater not on iOS | `gh api repos/tauri-apps/plugins-workspace/contents/plugins/updater/README.md` | platform table: iOS `x`, Android `x`. |
| Global-shortcut excluded on iOS | `gh api repos/tauri-apps/plugins-workspace/contents/plugins/global-shortcut/src/lib.rs` line 15 | `#![cfg(not(any(target_os = "android", target_os = "ios")))]` |
| fs, dialog, clipboard-manager on iOS | same org, each plugin `README.md` | iOS supported (fs, dialog, clipboard-manager) |
| `generate_handler!` honours per-command `#[cfg]` | `gh api repos/tauri-apps/tauri/contents/crates/tauri-macros/src/command/handler.rs` lines 155-177 | attrs applied to match arms. Default branch. |

## 8. Not verified or not checked

- iOS compile of `ort` (download path, binary variant), `tokenizers` with `onig`, `sentry` transport, `reqwest` TLS, and `rusqlite` bundled on `aarch64-apple-ios`. Not built (per rules, no cargo run).
- `lib.rs:256-257`, `:274-278` (`set_menu`, `on_menu_event`) and `:287` (`tauri_plugin_process`) on iOS: not checked.
- iOS security-scoped folder access and container path stability: from memory, not verified.
- iOS memory budget for the ONNX sessions: no measurement.
- `libsqlite3-sys` 0.39.0 tag contents: default branch only.
- `embedder.rs` and `reranker.rs` test bodies and `semantic_*` test binaries: names only.
- Whether `search.service.ts` already falls back to FTS when `search_hybrid` errors: frontend not traced here.

Dirty-state note: no files were modified other than this output file (`.scratch/ios-app/research/`).
