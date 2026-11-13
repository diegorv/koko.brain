# Scout 11: index freshness and event scope (composer autocomplete)

Read-only research at HEAD 130d6b8f7. Paths are relative to the repo root. UNVERIFIED marks anything I could not confirm from repo or node_modules sources.

## 1. How the main window learns that tags or files changed

### 1.1 Rust is the source of truth, events carry a monotonic version

- Vault metadata (tags, entries, backlinks) lives in Rust `VaultIndex`, held as Tauri managed state `VaultIndexState` (`src-tauri/src/lib.rs:319`). The TS side does not mirror it (`docs/agents/indexing-watcher-rules.md:3`).
- Every `VaultIndex` mutation emits `vault-index-updated` with an `UpdateResult` (`src-tauri/src/events.rs:6-7`; emit sites `src-tauri/src/commands/vault.rs:373,465,757,873,982,1164,1255,1406,1752`).
- `UpdateResult` fields (`src-tauri/src/vault/index.rs:33-54`): `changed`, `affected`, `version: u64` (post-update monotonic index version), `upserted: Vec<String>`, `removed: Vec<String>`, `full_rescan: bool`. Paths are absolute.
- The watcher is native Rust (notify, 500 ms debounce). `start_vault_watcher` emits `vault-files-changed` with the filtered path list (`src-tauri/src/commands/watcher.rs:11-24`, `events.rs:9-11`).
- The main window consumes `vault-files-changed` in two places:
  - `src/lib/core/filesystem/fs.watcher.ts` (file tree rescan: modify-only batches leave the tree untouched, otherwise subtree or full `refreshTree`, see `fs.watcher.ts:127-200`).
  - `src/lib/app/lifecycle/watcher-handler.service.ts:36-` (`rebuildAllIndexes`: 1 to 10 markdown files go incremental through `read_files_batch` + `applyNoteChange`, otherwise `rebuildIndex` = `scan_vault_v2_cached`). The Rust index is refreshed by the main window's TS calling `update_note_in_index` / `scan_vault_v2_cached`, not by Rust on its own from the watcher (`watcher-handler.service.ts:57-111`, rules doc item 4). So Rust index freshness for external edits depends on the main window being alive and running that handler.

### 1.2 The main window's "index version" is a throttled mirror of the Rust version

- `vaultStore.vaultIndexVersion` is set by `bumpVaultIndexVersion(payload.version)` (`src/lib/core/vault/vault.store.svelte.ts:109-112`). It is process-global and never rewound across a vault switch (`vault.store.svelte.ts:138-147`, comment at `src/lib/core/vault/vault-entries.service.ts:21-24`). Only `_reset()` zeroes it (test hook, `vault.store.svelte.ts:150-158`).
- The bump is throttled in `registerVaultIndexUpdatedListener` (`src/lib/app/tauri-listeners.service.ts:185-318`): 2 s after an isolated event (`REFRESH_DELAY_MS`, line 106), at most once per 10 s during a burst (`REFRESH_MIN_INTERVAL_MS`, line 109), immediately only when `vaultStore.takePromptIndexRefresh()` is true (lines 298-303). So the version the editor keys its caches on can lag Rust by up to 10 s during bursts.
- `vault-entries.service.ts` is a `versionGated` memo of `get_all_vault_entries_v2` keyed on that version (`vault-entries.service.ts:26-38`, `src/lib/utils/inflight.ts:124-155`). The listener advances it incrementally with `patchVaultEntries` using `get_index_delta` (`tauri-listeners.service.ts:219-265`).
- `invalidateVaultEntries()` is what scopes the memo to one vault (rules doc item 12; called at `initializeVault` entry, after `markIndexReady()`, and in `teardownVault`).

### 1.3 How the editor's two completion sources get their data (freshness model)

- Tags: `appEditorHost.listTags()` -> `vaultTags()` (`src/lib/app/editor-host.ts:93-111,195-197`). Memo key is `${vaultStore.path}\n${vaultStore.vaultIndexVersion}`; one `call('get_all_tags_v2')` per key; a rejection is evicted (lines 101-109). Returns `[]` until `vaultStore.indexReady` (line 99; reason in the comment at lines 97-98: Rust still holds the previous vault's index until the new build ends). Maps to `{name, count}` only.
- Wikilinks: `appEditorHost.listLinkCandidates(includeNotes)` (`editor-host.ts:128-133`):
  - `files` come from `treeLinkIndex()`, a `WeakMap` keyed by the `fsStore.fileTree` array identity (lines 73-85). That is the file tree (from the Rust command `scan_vault`, `src/lib/core/filesystem/fs.service.ts:88-126`), not the Rust index. Every non-`.view` file is a candidate, so images and PDFs are included (`isLinkTargetFile`, `src/lib/core/filesystem/wikilink-resolution.logic.ts:15-18`).
  - `notes` (only for a non-empty query, `wikilink/completion.ts:68`) come from `getVaultEntries()` filtered by `isLinkTargetFile` (used for alias matching).
- Both sources call the host on every completion request. The facet is a read-through; there is no cache inside `completion.ts` files (`tag/completion.ts:26`, `wikilink/completion.ts:68`). All caching and invalidation is inside `src/lib/app/editor-host.ts` and the stores, which the composer webview cannot reach.

## 2. Event scope: app-wide vs main-window-only

Rust events (all names in `src-tauri/src/events.rs`, mirrored in `src/lib/contracts/events.ts:16-26`):

| Event | Emit call | Scope |
|---|---|---|
| `vault-index-updated` | `app.emit` (`commands/vault.rs` sites above) | app-wide broadcast |
| `vault-files-changed` | `app.emit` (`commands/watcher.rs:19`) | app-wide broadcast |
| `semantic-index-progress` | `app.emit` (`commands/semantic.rs:414`) | app-wide broadcast |
| `tauri-debug-log` | `log_handle.emit` (`lib.rs:288`) | app-wide broadcast |
| `menu:settings` | `app.emit` (`lib.rs:305`) | app-wide broadcast |
| `app:exit-requested` | `app.emit_to(MAIN_WINDOW_LABEL, ...)` (`lib.rs:168`) | main-window-only; the ONLY `emit_to` in `src-tauri/src` (grep of `emit_to` shows just this line) |
| `qc:capture-detected` | `app.emit` (`quick_capture/commands.rs:359,484`, `lib.rs:81`) | app-wide broadcast |
| `qc:open-composer` | `handle.emit` (`quick_capture/commands.rs:406`) | app-wide broadcast |
| `qc:composer-capture-result` | `app.emit` (`quick_capture/commands.rs:510`) | app-wide broadcast |

Evidence that `emit` on the `AppHandle` really reaches the composer webview: the composer already receives `qc:open-composer` and `qc:composer-capture-result` that Rust emits with plain `emit` (and `qc:composer-capture-result` is triggered by a command invoked from the main window), via `on()` -> `listen()` with default target `Any` (`src/lib/contracts/ipc.ts:84-89`; JS `listen` default target `{kind:'Any'}` at `node_modules/@tauri-apps/api/event.d.ts:49-54`). The Rust-side semantics of `Emitter::emit` (broadcast to every listener) are documented behavior of the tauri crate; I did not open the crate source (outside the allowed paths), so the general rule is UNVERIFIED, but the two working composer events are repo-level proof.

Consequence: the composer webview could `on(EVENT_NAMES.VAULT_INDEX_UPDATED, ...)` and get the same payloads as the main window with no Rust change. It does not listen to it today.

What the composer gets today (`src/routes/composer/+page.svelte`):
- Listens only to `qc:open-composer` (line 178-181, triggers `resetForShow`) and `qc:composer-capture-result` (lines 188-192).
- Invokes only `dismiss_composer` (line 63) and `submit_composer_capture` (line 100).
- Capability `src-tauri/capabilities/composer.json` grants `core:default`, `core:window:allow-hide`, `core:window:allow-set-focus`. It names no command permissions. `src-tauri/build.rs` calls plain `tauri_build::build()` with no `AppManifest`, and the composer already invokes the app commands `submit_composer_capture` and `dismiss_composer` under that capability, so app commands are not ACL-gated here (inference from working behavior; I did not read the Tauri ACL docs, so treat as UNVERIFIED in general). The description text in `composer.json` says "no other IPC" as intent, not as enforcement.
- Root layout `src/routes/+layout.svelte` only imports `app.css`; the `(app)` layout (where main-window listeners register, e.g. `tauri-listeners.service.ts`) is a different route group, so the composer runs none of the main window's listener registration.
- Composer commands registered in `lib.rs:392-395`.

## 3. Rust index is shared, so the composer can read it fresh

- `get_all_tags_v2` and `get_all_vault_entries_v2` are plain `#[tauri::command]`s over `State<VaultIndexState>` under a shared read lock (`src-tauri/src/commands/vault.rs:563-575`, `638-646`). Any webview that can invoke them reads the same live index the main window mutates. No window-specific state is involved.
- `get_all_tags_v2` returns `TagAggregate {name, count, file_paths}` (`vault/index.rs:1039-1064`), including a `file_paths` list per tag that completion discards (`editor-host.ts:102`). Payload cost scales with tag usage, not just tag count (UNVERIFIED how large on the owner's vault; no measurement).
- `get_all_vault_entries_v2` clones every entry and sorts them (`vault.rs:563-575`); the comment at `vault.rs:555-562` and the tauri-listeners doc (`tauri-listeners.service.ts:130-134`) call it a multi-MB IPC on large vaults. Calling it per keystroke from the composer would be heavy; per summon is the more defensible cadence.
- Rust-side version is exposed only inside `UpdateResult.version` (`index.rs:44-45`). There is no standalone "get index version" command (grep for `get_index_version` / `index_version` in `src-tauri/src/commands` and `lib.rs` found none).

## 4. If the composer caches candidates, how would it invalidate?

Options, cheapest first:

1. Refetch on every `qc:open-composer` (summon). The composer window is hidden and persistent (built once at startup, `lib.rs:297`; close is intercepted as hide, `lib.rs:93-100`), so a per-summon refetch is the natural freshness boundary. The `resetForShow()` hook already runs there (`+page.svelte:143-157`). Pros: no new listener, always at most one IPC per summon, fresher than the editor (which lags up to 10 s). Cons: the first completion may wait for the IPC if the user types `#` immediately after the summon; a refetch must not be awaited in `resetForShow`.
2. Lazy fetch with memo keyed on the latest `vault-index-updated` `payload.version`. The composer would add a listener for `vault-index-updated` (app-wide broadcast, no Rust change), store `latestVersion`, and have the memo key on it. This mirrors `vaultTags()` (`editor-host.ts:93-111`) but without the main window's 2 s / 10 s throttle, so it could refetch more often than the editor does (the event fires once per file in a watcher burst, per `tauri-listeners.service.ts:128-134`). The composer would need its own throttle or a "dirty flag, refetch on next completion" design to avoid one `get_all_tags_v2` per event while hidden. Listener on a hidden window: UNVERIFIED whether the hidden webview throttles JS timers or event delivery (macOS WKWebView may suspend background pages); not checked, so do not rely on a hidden-window listener without a test. A per-summon refetch avoids this question.
3. Combine 1 and 2: refetch at summon, and while the composer is visible mark dirty on `vault-index-updated`. Likely overkill for a popover that stays open for seconds; the sole realistic mid-session change is the user's own composer saves (a save dismisses the window, `+page.svelte:131-141`).
4. Vault switch scoping: `vaultStore.path` is part of the editor's memo key because the version is not rewound. A composer memo keyed only on `payload.version` would also see versions never rewound (rules doc item 12; `index.rs` version is monotonic per `UpdateResult` doc). A vault switch runs `scan_vault_v2*` which emits `fullRescan: true` with a new, higher version, so a version-keyed memo self-invalidates; a per-summon refetch trivially does too. The composer cannot read `vaultStore.path`.
5. File-tree freshness for wikilink file candidates: the editor's `files` come from `fsStore.fileTree`, rebuilt by the watcher path (`fs.watcher.ts`, `fs.service.ts:88-126`) and by in-app patches (`addToTree`). The composer has no tree. If it builds candidates from `get_all_vault_entries_v2` (Rust index) it avoids the tree, but see risk 5.2.

## 5. Risks

1. Not-ready index: the editor guards `[]` until `vaultStore.indexReady` (`editor-host.ts:99`) because Rust still holds the previous vault's index during open (`editor-host.ts:97-98`). The composer cannot read `indexReady`. The hotkey is gated on `crate::db::is_open()` (`lib.rs:42-47`), which is a database signal, not an index-built signal. I did not trace when `db::is_open` becomes true relative to `scan_vault_v2_cached` finishing (UNVERIFIED), so right after a vault switch the composer could offer the old vault's tags or notes for a short window. A cheap mitigation is to treat it as best-effort (suggestion only, never written without the user accepting) and refetch each summon. The `vault-index-updated` `fullRescan` event would also correct it if the composer listens.
2. Divergence in wikilink candidates: editor `files` include non-markdown files (`isLinkTargetFile` only excludes `.view`, `wikilink-resolution.logic.ts:15-18`) because they come from the tree; `get_all_vault_entries_v2` is markdown-only (`vault.rs:1422-1424` doc: `scan_vault_v2` emits only markdown leaves; entries come from `collect_v2_entries`, I did not verify the extension filter in code). A composer built on entries alone would miss `[[image.png]]` style targets that the editor offers. Alternatively `scan_vault` (the tree command) is a heavier call that returns a recursive tree (`vault.rs:120`).
3. Event storms while the composer is open: `vault-index-updated` is per file during watcher bursts (`tauri-listeners.service.ts:128-134`); a naive refetch-on-event in the composer would repeat the cost the main window throttles.
4. Capability description mismatch: `composer.json` states the popover "only needs to invoke the submit and dismiss commands ... no other IPC". Reading the index adds IPC use. There is no ACL change to make if app commands are ungated (see section 2), but the description text would become wrong. Editing it is outside "editor files" so allowed by constraint 2, though Constraint 3 (scope) may argue for a minimal text edit only.
5. Staleness vs editor: the editor itself is up to 2-10 s stale (section 1.2). A composer that refetches per summon is at least as fresh, so no fresher-than-editor consistency problem arises for tags.
6. Self-capture lag: after the user saves a composer capture, the note is written by the main window, then `applyNoteChange` updates the index and emits `vault-index-updated`. A new `#tag` typed in a capture appears in `get_all_tags_v2` only after that update lands (not measured). A user who opens the composer again within about a second could miss that tag in the first refetch. Minor, recoverable.
7. Never rewound version: do not use the raw `version` as a vault identifier across a vault switch; only as "newer than what I cached" (rules doc item 12 and `vault.store.svelte.ts:138-147`).

## 6. Reuse opportunities

- The `vault-index-updated` event and the `get_all_tags_v2` / `get_all_vault_entries_v2` commands already exist and are callable from the composer webview with no Rust or capability change (inference, section 2). The typed wrappers `call` and `on` (`src/lib/contracts/ipc.ts`) work in the composer as they already do for `submit_composer_capture` and `qc:open-composer`. Events payload types: `EventMap['vault-index-updated']: UpdateResult` (`src/lib/contracts/events.ts:34`).
- The memo shape of `vaultTags()` (`editor-host.ts:93-111`: key, promise, evict on rejection) is the template for a composer-side memo, but `appEditorHost` itself cannot be imported into the composer route without pulling `vaultStore`, the file tree, the note creator and the rest of the app graph (imports at `editor-host.ts:1-36`). A composer-side `EditorHost` would be a small separate object satisfying only `listTags` and `listLinkCandidates` (plus `resolveLink`/`readNote` for heading/blockId modes in `wikilink/completion.ts:15-24`; UNVERIFIED which of the other methods the completion sources call beyond those I read). All other methods could be `NOOP_HOST` entries (`editor-host.ts:87-98`), installed with the existing `editorHost.of(...)` facet, so zero edits to editor files are needed for freshness. That object is where the cache and invalidation would live; the editor's completion sources stay untouched.
- `versionGated` (`src/lib/utils/inflight.ts:124-155`) is generic and could back a composer memo keyed on a locally tracked version; it imports nothing app-specific in the part I read (UNVERIFIED for the whole file's imports).

## 7. Open questions

1. Should the composer refetch only at summon (simplest, immune to hidden-window event throttling) or also listen to `vault-index-updated`? Needs the owner's tolerance for a 1-2 s stale window right after a vault change.
2. Does the hidden composer webview keep receiving app-wide events while hidden (WKWebView background throttling)? Not verified; a per-summon refetch makes the answer irrelevant.
3. Wikilink file candidates: is markdown-only (index entries) acceptable, or must non-markdown files appear as in the editor (which would require `scan_vault` or a new Rust command)? Adding a Rust command is allowed by the constraints (only editor behavior is frozen) but widens scope.
4. When exactly is the Rust `VaultIndex` valid for the new vault relative to `db::is_open()` at vault open? Not traced.
5. Is a hidden-window refetch at summon blocking the first keystroke acceptable, or should the composer prefetch on `qc:open-composer` and show no popup until data arrives?
6. `get_all_tags_v2` returns `file_paths` per tag, unused by completion. If payload size on the owner's real vault is a concern, a slimmer Rust command is a possible later step (not needed for correctness).
