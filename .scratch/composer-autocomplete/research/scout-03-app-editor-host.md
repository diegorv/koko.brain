# Scout 03: app EditorHost implementation and composer reuse

Read-only research at HEAD 130d6b8f7. Nothing was run or edited besides this file.

## 1. Where EditorHost is defined and installed

- Interface, `NOOP_HOST` and the facet live in `src/lib/core/markdown-editor/editor-host.ts`. `EditorHost` is at :44-76, `NOOP_HOST` at :87-98, `editorHost = Facet.define({ static: true, combine: values => values[0] ?? NOOP_HOST })` at :104-107.
- The facet falls back to `NOOP_HOST` when nothing is installed. NOOP gives `listTags: () => Promise.resolve([])` (:97), `listLinkCandidates: () => Promise.resolve({files: [], notes: []})` (:89), `resolveLink: () => null` (:88) and a rejecting `readNote` (:90). A CodeMirror view with the completion sources but no `editorHost.of(...)` therefore degrades silently to "no suggestions" and never throws. The composer still needs to install a real host.
- The only app implementation is `appEditorHost` at `src/lib/app/editor-host.ts:123-198`, one constant, never reconfigured.
- Installation path: `src/lib/app/EditorView.svelte:13,93` passes `host={appEditorHost}` to `MarkdownEditor.svelte` (prop at :56). `setup/editor-extensions.ts:129` does `editorHost.of(opts.host)` as the first entry of `createExtensions` (`CreateExtensionsOptions.host` at :68).
- Other consumers of the facet are not relevant to autocomplete: `live-preview/click-handler.ts:36,64`, `wikilink-navigation.ts:62`, `widgets.ts`, `meta-bind-button-widget.ts:96`.

## 2. How the four relevant methods are implemented

All four are in `src/lib/app/editor-host.ts`, and all depend on main-window state.

### listTags (:195-197 -> `vaultTags()` :96-111)
- Guard: returns `[]` until `vaultStore.indexReady` (:99). Comment at :97-98 says Rust still holds the previous vault's index until the current one is built.
- Memo key: `${vaultStore.path}\n${vaultStore.vaultIndexVersion}` (:100). One IPC per key, held in module-level `tagsMemo` (:93). A rejection is not cached (:106-108).
- IPC: `call('get_all_tags_v2')` (:102), mapped to `{name, count}`. The Rust command is `src-tauri/src/commands/vault.rs:638-648`. It reads `VaultIndexState` under a shared lock and returns `idx.lookup_all_tags()`.
- Types: `VaultTag` `{name, count}` is in `core/markdown-editor/editor-host.ts:19-24`.
- Does not use `tagsStore`. Comment at :89-91 says that store only rebuilds while the Tags view is mounted.

### listLinkCandidates (:128-133)
- `files` come from `treeLinkIndex()` (:76-85): `flattenFileTree(fsStore.fileTree)` filtered by `isLinkTargetFile` (drops `.view`), plus a name-resolution cache. Cached in a `WeakMap` keyed on the tree array identity (:73). `fsStore.fileTree` is `$state.raw` (`fs.store.svelte.ts:11`).
- `fileTree` is filled in the main window only: `loadDirectoryTree` -> `call('scan_vault', {path: vaultPath, sortBy: 'name'})` (`core/filesystem/fs.service.ts:100-116`), plus `app-lifecycle.service.ts:390`, `path-change.service.ts:184,211` and `fs.watcher.ts:250`.
- `scan_vault` (`src-tauri/src/commands/vault.rs:120-128`) takes a vault `path`, skips dot-files, and returns every file kind (images, pdf, `.view`, etc.), not only markdown.
- `notes` (only when `includeNotes`, i.e. query non-empty) come from `getVaultEntries()` filtered by `isLinkTargetFile` (:131). That is `core/vault/vault-entries.service.ts:36-38`: a `versionGated` memo on `vaultStore.vaultIndexVersion` (:26-29) over `call('get_all_vault_entries_v2')`. Also patched by `patchVaultEntries` (:73-84) from the `vault-index-updated` listener, and cleared by `invalidateVaultEntries()` (:45).
- Rust: `get_all_vault_entries_v2` (`commands/vault.rs:563-575`) clones every `NoteEntry` from the index, sorted by path. The index only holds markdown (`collect_markdown_paths_with_metadata`, `vault.rs:230,1639`; `is_markdown_filename`, `vault.rs:330`).

### resolveLink (:124-126)
- `resolveWikilinkCached(target, treeLinkIndex().cache, vaultStore.path)`. It is purely synchronous on the file tree plus `vaultStore.path`. The pure functions are in `core/filesystem/wikilink-resolution.logic.ts` (`resolveWikilink` ~:70, `buildResolutionCache` ~:106).
- Used only by heading and block-id completion (`wikilink/completion.ts:16`, via `resolveTargetContent`). Not used by plain `[[` file completion.

### readNote (:135-137)
- `readTextFile(path)` from `@tauri-apps/plugin-fs`. Uses the fs plugin, scoped by the main window capability (`src-tauri/capabilities/default.json` has `fs:allow-read-dir` scoped to `$DOCUMENT/kokobrain-vaults`, `$HOME/kokobrain-vaults`, ...; rest of file not read, so the read-file scope is UNVERIFIED).
- Used only for `[[Note#heading` and `[[Note#^block` completion (`wikilink/completion.ts:139,191`).

## 3. What the editor completion sources need (exact surface)

- `tagCompletionSource` (`extensions/tag/completion.ts:14-41`): needs only `state.facet(editorHost).listTags()` (:26). Imports `editorHost`/`VaultTag` from `../../editor-host`, `reportError` from `../live-preview/core/profiling`, and `detectTagContext`/`rankTags` from `./completion.logic`. `completion.logic.ts` imports only `utils/fuzzy-match.js` (:1). It is DOM-free and store-free.
- `wikilinkCompletionSource` (`extensions/wikilink/completion.ts:43-59`):
  - file mode: `listLinkCandidates(match.query.length > 0)` (:68). Aliases are read from `notes[].frontmatter['aliases'|'alias']` (:26-36).
  - heading and blockId modes: `resolveLink` + `readNote` (:15-24), or the current doc text when the target is empty (`[[#`, :135-137, :187-189).
  - Imports `getNoteName` from `core/filesystem/wikilink-resolution.logic.js` (:2), `fuzzyMatch`, types `NoteEntryV2`, `completion.logic`, `reportError`. All free of stores and Tauri. `completion.logic.ts` pulls `navigation.logic` (HEADING_RE, BLOCK_ID_RE) and the `FileEntry` type from `core/filesystem/file-entries.logic.js`. Importing `file-entries.logic` at runtime only pulls `fuzzyMatch`, but that file imports the `FileTreeNode` type only.
- Import caution: the barrel `extensions/wikilink/index.ts` also re-exports `./decoration` (CodeMirror view plugin code). The composer should import `extensions/wikilink/completion` directly (and `extensions/tag/completion`), not the barrel, to avoid pulling decoration code into the composer bundle. UNVERIFIED how much that matters for bundle size; the route is SPA-only (`src/routes/+layout.ts`: `ssr = false`), so no SSR hazard.
- `reportError` (`live-preview/core/profiling.ts`) is module-level and safe without configuration: it does `console.error` plus `port.log`, where `port` defaults to a no-op `DISABLED` port.

## 4. Can the host run inside the composer webview?

Context: the composer is a separate webview at route `/composer` (`src/routes/composer/+page.svelte`), built at `src-tauri/src/lib.rs:135-153`, URL `WebviewUrl::App("/composer")` (:139). Separate JS realm: no `vaultStore`, `fsStore`, `settingsStore`, no listeners from `tauri-listeners.service.ts`. Its layout is just `app.css` + children (`src/routes/+layout.svelte`).

| Method | Main-window dependency | Possible in composer? |
|---|---|---|
| `listTags` | `vaultStore.indexReady/path/vaultIndexVersion` for the memo key and guard; IPC `get_all_tags_v2` | The IPC itself works from any window (see below). Memo key and `indexReady` guard do not exist in the composer. |
| `listLinkCandidates` files | `fsStore.fileTree` (never populated in composer) | Not as written. Needs a replacement data source. |
| `listLinkCandidates` notes | `getVaultEntries()` -> `vaultStore.vaultIndexVersion`; IPC `get_all_vault_entries_v2` | IPC works; the versionGated memo needs a version source, so the composer would call IPC directly. |
| `resolveLink` | `fsStore.fileTree` + `vaultStore.path` | Not as written. Only needed for heading/block modes. |
| `readNote` | `plugin-fs` `readTextFile` | Not permitted: composer capability has no `fs:*` (see below). Only needed for heading/block modes. |

### IPC permissions for the composer
- `src-tauri/capabilities/composer.json`: windows `["composer"]`, permissions `core:default`, `core:window:allow-hide`, `core:window:allow-set-focus`. No plugin-fs, no event/listen extras beyond core:default.
- `src-tauri/build.rs` ends with plain `tauri_build::build()` (no `Attributes`/`AppManifest` with a command list). Therefore app-defined `#[tauri::command]`s are callable from any window without a per-command permission entry. Evidence in the repo: the composer already calls `dismiss_composer` and `submit_composer_capture` while its capability lists no such permission (`+page.svelte` ~:77, ~:108). I did not read the Tauri ACL docs/source to confirm the default, so this inference is UNVERIFIED beyond that precedent; the comment in composer.json ("only needs to invoke the submit and dismiss commands") is consistent with it.
- Consequence: `get_all_tags_v2` and `get_all_vault_entries_v2` (both registered at `src-tauri/src/lib.rs:347,351`, state `VaultIndexState` managed app-wide at :319) should be callable from the composer with zero capability changes. No Rust change is needed for tags or for note entries.
- `call()` from `#lib/contracts/ipc.js` is a thin typed `invoke` wrapper (`ipc.ts` ~:20-35) and already used by the composer page (`+page.svelte` imports `call`, `on`). The generated command types include these two commands (used by `editor-host.ts:102` and `vault-entries.service.ts:27`).

### The file-list gap (key risk)
- The editor's `files` (what `matchFilesForWikilink` ranks and offers as `type: 'file'` options, `wikilink/completion.ts:71-82`) come from the file tree, so it includes non-markdown files (images, pdf, etc. , confirmed by `scan_vault` returning all non-hidden files, `vault.rs:120-175`; the existing test "listLinkCandidates lists the files of the current tree", `src/tests/lib/app/editor-host.test.ts:230`).
- The only IPC available without a vault path that returns data is `get_all_vault_entries_v2`, which holds markdown only. A composer host built from entries would offer notes but not attachments. UNVERIFIED whether a composer user would care; `[[image.png]]` in a quick capture is plausible (the repo has Quick Capture shot embeds, test at `editor-host.test.ts:135`).
- `scan_vault` needs `path`. I found no Rust command that returns the current vault path to a window (grep of `src-tauri/src/lib.rs` and `quick_capture/*.rs` for vault_path state found only `import_staged_shot` args at `quick_capture/commands.rs:176-211`). The composer does read vault path by neither route today. Open question below.
- Building a `FileEntry[]` from entries is cheap: `{name, nameWithoutExt, path}` from `NoteEntry.path` using `getNoteName` (`wikilink-resolution.logic.ts:4-8`). `NoteEntry` field names beyond `path`, `frontmatter` and `title` are UNVERIFIED (generated type under `src/lib/contracts/generated/` not opened).

## 5. Staleness and lifecycle risks specific to the composer

1. The composer webview is long-lived and hidden/shown (`intercept_close_as_hide`, `lib.rs:151`), summoned by event `qc:open-composer` (`+page.svelte` `resetForShow`, ~:150). Any memo must be refreshed per show, because there is no `vaultIndexVersion` there. Simplest consistent rule: fetch lazily on first completion after each summon, or on each completion trigger.
2. Wrong-vault window: the editor guards with `vaultStore.indexReady` because Rust briefly holds the previous vault's index (`editor-host.ts:97-98`; `app-lifecycle.service.ts` ~:360-375 invalidates the entries memo for the same reason). The composer cannot read `indexReady`. If it fetches while the main window is mid vault switch it could show the previous vault's tags/notes. Low likelihood, visible and self-healing on the next summon. (CLAUDE.md global rule: no code for rare races unless data/security/money at risk; this one is a visible, recoverable glitch.)
3. No vault open / main window never initialised: Rust index is empty or the previous vault; completion returns nothing or stale. UNVERIFIED which of the two at cold start (`VaultIndexState::default()`, `lib.rs:319`, is empty).
4. Cost: `get_all_vault_entries_v2` clones every `NoteEntry` including frontmatter and outgoing links (`vault.rs:563-575`). Over IPC this is large for big vaults. The editor mitigates by asking for notes only when the query is non-empty (`completion.ts:68`) and by memoising per index version. A composer-side memo per show keeps the same property.
5. `get_all_tags_v2` is small and cheap (aggregate list, `vault.rs:638-648`).
6. `isLinkTargetFile` filtering: the app host filters `.view` from both files and notes (`editor-host.ts:80,131`). A composer host must reuse `isLinkTargetFile` (`wikilink-resolution.logic.ts:19`) to keep alias behavior identical. With entries-only data this is moot for files (index is markdown only) but still harmless.
7. Heading/block completion (`[[Note#`): needs `resolveLink` + `readNote`. In the composer these would have to be (a) omitted (host methods resolve null / reject so `resolveTargetContent` returns null and the source returns null, `completion.ts:15-24,141`), or (b) backed by new IPC. `readNote` rejection is already handled: `reportError` then `null` (:18-23). So returning `resolveLink: () => null` degrades to "no suggestions" without errors. `[[#heading` (empty target) works against the composer's own text with no host support (`completion.ts:135-137`).

## 6. Reuse opportunities (zero edits to editor files)

- Both completion sources can be reused unchanged as CodeMirror `CompletionSource`s. They read everything through `state.facet(editorHost)`. A composer-side object implementing `EditorHost` (or `Pick` plus `NOOP_HOST` spread for the unused methods: `{...NOOP_HOST, listTags, listLinkCandidates, resolveLink?, readNote?}`) installed with `editorHost.of(...)` is enough. `NOOP_HOST` is exported, which makes a partial host easy and type-safe without touching the editor.
- Pure helpers reusable as-is: `isLinkTargetFile`, `getNoteName`, `resolveWikilinkCached`/`buildResolutionCache` (`wikilink-resolution.logic.ts`), `flattenFileTree`/`FileEntry` (`file-entries.logic.ts`), `rankTags`, `detectTagContext`, `matchFilesForWikilink`.
- Tag path in the composer is nearly free: `call('get_all_tags_v2')` mapped to `{name, count}` exactly like `editor-host.ts:102`.
- File path: map entries to `FileEntry[]` and reuse `buildResolutionCache` if `resolveLink` is wanted (it only needs paths, `buildResolutionCache(paths)` at `wikilink-resolution.logic.ts` ~:106 and `resolveWikilinkCached(target, cache, vaultRoot)`; vault root can be null since the function takes an optional root, UNVERIFIED for `resolveWikilinkCached`'s exact signature as only its call site `editor-host.ts:125` was read).
- Dedup helper available: `versionGated` / `dedupeInflight` in `src/lib/utils/inflight.ts`. `versionGated(fn, versionOf)` could be used with a composer-local counter incremented on each `qc:open-composer` as the version.
- Not reusable from the composer: `appEditorHost` itself (`src/lib/app/editor-host.ts`). It imports `fsStore`, `vaultStore`, `editorStore`, `settingsStore`, note creator, periodic notes, `plugin-fs`, `plugin-opener`, the rail, Search and typed stores (:1-36). Importing it would pull the whole main-window graph into the composer bundle with empty stores, and would give wrong answers (`indexReady` false -> `[]`). Also would likely trip the architecture layer test conventions. The composer needs its own small host object.

## 7. Constraints check against the owner's rules

- Editor files: no edit needed for tags/wikilink `[[` file completion. The sources, logic and host interface are reusable as exported. `NOOP_HOST` and `editorHost` are already exported.
- ADR 0028 line 68 lists this as out of scope because it required "CodeMirror swap + IPC exposing vault entries to the composer webview". On the IPC side, no new command should be needed (section 4). The CodeMirror swap (replacing the `<textarea>` with an `EditorView`) is outside this scout's topic but is the other half; the composer today is a plain textarea (`+page.svelte` textarea element, `bind:value={text}`, with Esc/Cmd+Enter on a `svelte:window` keydown at ~:166-180 and the `data-tauri-drag-region` markup).
- This scout makes no claim about whether `autocompletion()` popup UI (tooltip) fits in the 600x240 non-resizable transparent window; UNVERIFIED and outside the topic. A tooltip rendered inside the webview is clipped to the window.

## 8. Open questions

1. Attachments in `[[`: is markdown-only candidate data acceptable (entries IPC) or must non-markdown files appear as in the editor? If the latter, the composer needs the vault path to call `scan_vault`, and there is no existing way found for it to learn it (options: pass via `qc:open-composer` payload, store it in localStorage as theme vars are shared through `THEME_VARS_STORAGE_KEY`, or a new tiny Rust command; each needs a decision).
2. Heading/block completion (`[[Note#`) in the composer: omit (host returns null) or support? Support requires a way to read a note from the composer (no fs permission; `read_files_batch` exists at `src-tauri/src/commands/files.rs:24`, unread, so its args/scope are UNVERIFIED).
3. What do `get_all_tags_v2` / `get_all_vault_entries_v2` return when the composer is summoned before the main window finished indexing, or with no vault? Likely empty; not verified at runtime.
4. Confirm via Tauri ACL docs/source that app commands need no capability entry when `build.rs` has no `AppManifest` (inferred from precedent only).
5. Does the `vault-index-updated` event (`app.emit`, `vault.rs:373`) reach the composer? `app.emit` is app-wide in Tauri 2 (UNVERIFIED by source). If yes the composer could mirror a version counter; not required if it refetches per show.

## 9. Files read

- `src/lib/app/editor-host.ts`, `src/lib/core/markdown-editor/editor-host.ts`
- `src/lib/core/markdown-editor/extensions/{tag,wikilink}/completion.ts`, `completion.logic.ts` (header only), `wikilink/index.ts`
- `src/lib/core/markdown-editor/setup/editor-extensions.ts` (parts)
- `src/lib/core/vault/vault-entries.service.ts`, `src/lib/utils/inflight.ts`, `src/lib/contracts/ipc.ts` (head)
- `src/lib/core/filesystem/wikilink-resolution.logic.ts`, `file-entries.logic.ts`, `fs.service.ts` (loadDirectoryTree)
- `src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts` (head)
- `src/routes/composer/+page.svelte`, `src/routes/+layout.svelte`, `src/routes/+layout.ts`
- `src-tauri/capabilities/composer.json`, `default.json` (head), `src-tauri/build.rs`, `src-tauri/src/lib.rs` (parts), `src-tauri/src/commands/vault.rs` (parts)
- `src/tests/lib/app/editor-host.test.ts` (test names only)
