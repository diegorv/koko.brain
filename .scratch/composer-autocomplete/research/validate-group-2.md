# Validation group 2: scouts 03, 04, 05

Adversarial check of `scout-03-app-editor-host.md`, `scout-04-rust-data-commands.md`, `scout-05-composer-permissions.md` against HEAD 130d6b8f7 (working tree has uncommitted `package.json`, `pnpm-lock.yaml`, `src-tauri/Cargo.lock` changes; Cargo.lock line refs below are from `git show HEAD:`). Read-only; nothing was built or run.

## Verdict summary

All three scouts' main conclusions hold. No claim that changes feasibility was wrong. Corrections are line offsets, one half-wrong cost claim in scout 03, and a few missed options and constraints (listed under Gaps).

## Scout 03 (app EditorHost)

Confirmed:
- `EditorHost` at `src/lib/core/markdown-editor/editor-host.ts:44-76`, `NOOP_HOST` :87-98 (resolveLink :88, listLinkCandidates :89, readNote rejects :90, listTags :97), static facet with `values[0] ?? NOOP_HOST` :104-107. Both exported, so `{ ...NOOP_HOST, listTags, listLinkCandidates }` type-checks against the interface.
- `appEditorHost` `src/lib/app/editor-host.ts:123-198`; `vaultTags()` :96-111 (indexReady guard :99, key :100, IPC + `{name,count}` map :102, failure not cached :106-108); `treeLinkIndex()` :76-85 with WeakMap :73; `resolveLink` :124-126; `listLinkCandidates` :128-133 (`.view` filter on notes :131); `readNote` = plugin-fs `readTextFile` :135-137. Imports :1-36 pull editor.service, fs/vault/settings/editor/typeDefinitions stores, plugin-fs, plugin-opener, note-creator, periodic notes, queryjs, collection, search. Not reusable in the composer: correct.
- Installed only via `src/lib/app/EditorView.svelte:13,93` -> `setup/editor-extensions.ts:129` (`editorHost.of(opts.host)`). Grep finds no other `editorHost.of` and no other user of `wikilinkCompletionSource` / `tagCompletionSource` (only `editor-extensions.ts:19,21,143`).
- Completion sources: `tag/completion.ts:14-41`, host call :26; `wikilink/completion.ts:43-59`, `listLinkCandidates(query.length > 0)` :68, aliases :27-36, `resolveTargetContent` :15-24 (resolveLink :16, readNote :19 with `reportError` + null on rejection), `[[#` uses own doc :135-137 / :187-189.
- Import hygiene: `profiling.ts` has no imports and defaults to a no-op port; `wikilink-resolution.logic.ts:1` is a type-only import; `navigation.logic.ts` has none; `file-entries.logic.ts` imports a type + `fuzzyMatch`. The barrel `wikilink/index.ts:2` re-exports `./decoration`, so importing `./completion` directly is the right call.
- `src/routes/+layout.ts` `ssr = false`; `src/routes/+layout.svelte` is only `app.css` + children.
- `resolveWikilinkCached(target, cache, vaultRoot?: string | null)` at `wikilink-resolution.logic.ts:128`: vaultRoot is optional (scout's UNVERIFIED item is now verified).
- `NoteEntry` fields (scout's UNVERIFIED item): `src-tauri/src/vault/entry.rs:145+` has path, title, frontmatter, outgoing_links, tags, modified_at, created_at, size, word_count, snippet, tasks, task_headings, is_a, organized, archived, favorite, belongs_to, related_to, ... `path` is absolute.

Refuted / corrected:
- `isLinkTargetFile` is at `wikilink-resolution.logic.ts:15`, not :19; `resolveWikilink` :64 (not ~:70); `buildResolutionCache` :109 (not ~:106).
- Composer keydown is at `+page.svelte:161-171` plus `<svelte:window on:keydown>` at :202 (scout: ~:166-180). `submit_composer_capture` call is :102 (scout 03: ~:108; scouts 04/05 have :102 right).
- `default.json` read-file scope "UNVERIFIED": `fs:allow-read-text-file` is at `src-tauri/capabilities/default.json:66`.
- Section 5.4 says "A composer-side memo per show keeps the same property" (only non-empty queries pay the entries IPC). Half wrong: if the composer derives `files` from `get_all_vault_entries_v2` (the only path-free source), the empty-query `[[` also needs that IPC, because `files` are always returned (`wikilink/completion.ts:68,71`, `matchFilesForWikilink` lists all files sorted for an empty query, `wikilink/completion.logic.ts:76-78`). So the editor's "entries only when the query is non-empty" saving is lost; the memo only caps it at one call per summon.
- Section 4 table: "versionGated memo needs a version source, so the composer would call IPC directly". Partly right; `versionGated` (`src/lib/utils/inflight.ts:124`, no imports) can be reused with a composer-local counter, as section 6 says, so the two sections disagree slightly. Not a blocker.

## Scout 04 (Rust data commands)

Confirmed:
- `get_all_tags_v2` `commands/vault.rs:637-647` (sync, read lock, `lookup_all_tags`), registered `lib.rs:351`, contract `commands.ts:103` / `:284`.
- `get_all_vault_entries_v2` `vault.rs:562-575` (clone + sort by path), `lib.rs:347`, `commands.ts:95` / `:280`. `NoteEntryV2` is an alias (`src/lib/types/vault-v2.types.ts:21`).
- `TagAggregate { name, count, file_paths }` `src-tauri/src/vault/task.rs:160-168`; `lookup_all_tags` `index.rs:1039-1065`, sorted by lowercase name; the editor drops `filePaths` (`editor-host.ts:102`).
- `scan_vault(path, sort_by)` `vault.rs:120-128`, dot-prefixed entries skipped (:151-153), symlinks skipped; contract `commands.ts:76`. Index holds `.md/.markdown/.view` only (`utils/fs.rs:143-146`, walk `utils/fs.rs:121-128`, called `vault.rs:230,1639`).
- `read_files_batch(vault_path, paths)` `commands/files.rs:23-27`, containment check against `validate_vault_path` root.
- `db::is_open()` `db/mod.rs:101-103`, hotkey gate `lib.rs:45`; `with_vault_db` :135-143, `ensure_open_vault` :159-176; neither tag nor entries command touches the DB.
- `VaultIndex::vault_root()` `index.rs:348-350` (doc :345-347), `build_with_root` :396-398, callers `vault.rs:1474,1597,1703`, consumers `vault.rs:807,908`.
- Vault-switch window: `initializeVault` Step 2 `open_vault_db` `app-lifecycle.service.ts:248`, Step 4 index + tree :339, `markIndexReady` :353, `invalidateVaultEntries` :145/:373/:650; `teardownVault` :565, `close_vault_db` :636.
- UNVERIFIED item 5 ("`VaultIndexState` never cleared at close"): confirmed. `rebuild` (`index.rs:416-423`) clears maps only when a scan runs; grep of `commands/`, `db/`, `quick_capture/`, `lib.rs`, `vault/watcher.rs` finds no `VaultIndex::default()`, `*idx =` or `idx.build(` outside scans.
- No "current vault path" command: confirmed against the full `generate_handler!` list `lib.rs:325-398`.

Refuted / corrected:
- "`name` is the first-seen casing": the code iterates a `HashMap` (`index.rs:1047-1053`), so the displayed casing is arbitrary among variants, as the comment at :1040-1046 admits. Parity with the editor still holds because both use the same command.
- `build.rs:19-27` is loose; `tauri_build::build()` is `build.rs:23`.
- Risk 7 UNVERIFIED "default index is empty": `VaultIndex::default()` is used as an empty index in tests (`index.rs:1873` then `build`); a real proof is `rebuild` being the only filler. Low stakes; the hotkey gate means the composer is not summoned with no DB open.

## Scout 05 (composer permissions)

Confirmed against crate sources (`~/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/`, versions match `HEAD:src-tauri/Cargo.lock:5372-5373,5424-5425,5737-5738`):
- `tauri_build::build()` = `try_build(Attributes::default())` (`tauri-build-2.7.4/src/lib.rs:634`). App manifest inserted only if it has a default permission, a set or a permission (`tauri-build-2.7.4/src/acl.rs:414-426`). No `src-tauri/permissions/` dir.
- `gen/schemas/acl-manifests.json` keys have no `__app-acl__` (checked by parsing the file; gitignored at `src-tauri/.gitignore:7`).
- Runtime gate `tauri-2.12.5/src/webview/mod.rs:2080`: `(plugin_command.is_some() || has_app_acl_manifest || !is_local) && invoke.acl.is_none()` rejects. `is_local_url` (:1961-2000) treats the `tauri://` protocol and anything relative to `devUrl`/`frontendDist` as local, so `WebviewUrl::App("/composer")` (`lib.rs:139`) is local in dev (`devUrl` `http://localhost:1420`, `tauri.conf.json:8`) and release. Conclusion "every custom command is callable from the composer with no capability edit" holds; this also settles scout 03 open question 4 and scout 04 risk 1.
- `composer.json:3-10` grants `core:default`, `core:window:allow-hide`, `core:window:allow-set-focus`; description at :4 says "no other IPC", which is false for custom commands (scout's point stands).
- `core:default` -> includes `core:event:default` = allow-listen/unlisten/emit/emit-to (acl-manifests.json).
- Plugin commands always ACL-checked, so `plugin:fs|read_text_file` is denied for the composer.

Refuted / corrected:
- `.manage(VaultIndexState::default())` is `lib.rs:319`, not :318. `COMPOSER_WINDOW_LABEL` is `quick_capture/commands.rs:31`, not :29-30. CSP is `tauri.conf.json:29`, not :27. `get_all_tags_v2` attribute starts at :637 and the fn ends at :647 (scout: 637-646).
- "Qc events broadcast at :359, :406, :484, :510": :406 is `handle.emit(QC_OPEN_COMPOSER_EVENT, "")` inside `show_composer`; correct, and note the payload is an empty string (see Gaps).

## Gaps the scouts missed

1. A lighter existing command for aliases: `get_all_property_records` (`vault.rs:1055-1067`, `lib.rs` handler list, `commands.ts:139`) returns `NoteRecord { path, name, basename, folder, ext, mtime, ctime, size, properties }` (`entry.rs:80-100`) where `properties` is `entry.frontmatter.clone()` plus injected keys (`vault.rs:1015-1037`). It omits tasks, snippet, outgoing links. A composer host could build `files` from `path/name/basename` and alias input from `properties`, with no Rust change. Cost: the wikilink source types `notes` as `NoteEntryV2[]` and reads only `path` and `frontmatter` (`wikilink/completion.ts:27-29,87-90`), so the host would need a cast or an adapter object. Payload saving UNVERIFIED (not measured).
2. `vault-index-updated` reaches the composer: Rust emits with `app.emit` (`vault.rs:373,465,757,873`), which targets all webviews (`tauri-2.12.5/src/lib.rs:962`), and the composer has `core:event:allow-listen`. Answers scout 03 open question 5. A composer could invalidate its memo on that event instead of (or in addition to) per summon; payload is `UpdateResult`.
3. Vault path without new Rust: the main window also receives `qc:open-composer` (broadcast) and holds `core:event:default` (emit-to), so it could reply to the composer with `vaultStore.path` via an app-defined event; that is a main-window code change plus a new `EventMap` entry (`events-parity.test.ts` checks it). Another hint: `localStorage['kokobrain:recent-vaults']` (`vault.store.svelte.ts:4,56`, same origin as the composer, as `THEME_VARS_STORAGE_KEY` proves) has the last opened vault first (`vault.logic.ts:30-31`), but it is written on open, not on index ready, so it is a hint, not an authority. Either is only needed for attachments in `[[` (via `scan_vault`) or for heading/block completion (via `read_files_batch`).
4. Repo architecture tests that bind composer code: `src/tests/lib/architecture/raw-invoke.test.ts` and `event-listen.test.ts` scan `src/routes` and require `call()` / `on()` from `#lib/contracts/ipc.js`; `markdown-editor-imports.test.ts` forbids stores, services, Tauri, features and plugins inside `src/lib/core/markdown-editor/`, so a composer host must not live under that folder. `src/lib/app/` may be imported only from `src/routes` (`layer-rules.test.ts:166-167`).
5. Autocompletion config parity: the editor's instance is `autocompletion({ override: [wikilinkCompletionSource, dateShortcutCompletionSource, tagCompletionSource], activateOnTyping: true })` inline in `editor-extensions.ts:142-145`, not exported. The composer must rebuild it (without `dateShortcutCompletionSource`, per scope). `autocompletion()` already adds `completionKeymap` at `Prec.highest` (`@codemirror/autocomplete@6.20.4` dist `index.js:384,2074`). The editor also has `closeBrackets()` (`editor-extensions.ts:138`), which changes what `[[` looks like while typing; whether the composer adds it is a UX choice outside "tags and wikilinks only".
6. Keyboard conflict the host topic touches: the composer's Esc and Cmd+Enter handler is on `svelte:window` (`+page.svelte:161-171,202`) and does not check `defaultPrevented`. CodeMirror keymap bindings preventDefault but do not stopPropagation by default (`@codemirror/view@6.43.15` dist `index.js:9203,9216,9223`), so Esc that closes the completion popup would also dismiss the composer. Belongs to scout 09; listed here because it decides whether host reuse is enough.
7. Ordering parity: the editor's `files` come in scan-tree order (dirs first, `sortBy: 'name'`, `fs.service.ts:96-99`); entries come sorted by path (`vault.rs:571`). `matchFilesForWikilink` sorts by score then `name` (`completion.logic.ts:84-87`), stable, so only same-file-name ties in different folders can order differently. Negligible.
8. Non-markdown targets in the editor list: images and PDFs appear with `label: file.nameWithoutExt` (`wikilink/completion.ts:72`), so accepting `photo.png` inserts `[[photo]]`. That is the editor's behavior; the composer would copy it only if it gets non-markdown files.

## Answers to open questions raised by the scouts

- Tauri ACL default for app commands (03 q4, 04 risk 1/q6, 05 F2): verified from source, no capability change needed.
- `vault-index-updated` reaches the composer (03 q5, 05 open q): yes (Gap 2).
- `VaultIndexState` cleared on close (04 q5): no.
