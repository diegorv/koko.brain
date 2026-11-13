# Validation group 3: scouts 06, 11, 15, 16

Adversarial check at HEAD 130d6b8f7. Read-only: nothing was built, tested or edited apart from this file. Paths are relative to the repo root. UNVERIFIED marks what I could not confirm from repo or node_modules sources.

## Verdict summary

The four scouts agree on the main conclusion, and it holds: the composer can read the tag and entry data straight from Rust (`get_all_tags_v2`, `get_all_vault_entries_v2`) with no Rust edit, no capability edit and no editor edit. Relaying through the main window (scout 06 options b and c) fails when the main window is destroyed. Most of the errors are wrong line numbers. Four substantive corrections:

1. "The composer has no vault path" (scouts 06, 11, 15, 16) is wrong as stated. Both windows share the origin's localStorage, and `vaultStore.open` puts the last-opened vault path first in the list it saves there.
2. The UNVERIFIED worry that `reportError` pulls Sentry or settings into the composer (scouts 06, 16) is unfounded. `profiling.ts` has zero imports.
3. The index is not markdown-only (scout 11). It also holds `.view` entries, so the composer must filter them as the editor does.
4. "Does `core:default` cover JS emit / listen?" (scouts 06, 15) is answered: yes.

## Scout 06: cross-window data paths

### Confirmed
- `VaultIndexState` is process-global managed state: `src-tauri/src/lib.rs:319`. `get_all_vault_entries_v2` (`src-tauri/src/commands/vault.rs:562-573`) and `get_all_tags_v2` (`vault.rs:637-646`) take only `State<VaultIndexState>`, with no window or path argument.
- App commands are not gated per command. `src-tauri/build.rs` ends in plain `tauri_build::build()`, and there is no `src-tauri/permissions/` directory. `src-tauri/gen/schemas/acl-manifests.json` has no app ACL entry: its keys are plugins and `core:*` only. The composer already invokes `dismiss_composer` and `submit_composer_capture` (`src/routes/composer/+page.svelte:77`, `:102`) under `capabilities/composer.json`. The general Tauri rule remains UNVERIFIED against the tauri crate source, but the repo evidence is strong.
- `composer.json:4`, "no other IPC", states intent and is not enforced.
- `editor-host.ts:96-111`: the tags memo is keyed on vault path plus index version, returns `[]` until `indexReady`, and maps to `{name, count}`. `listLinkCandidates` reads files from the tree (`:76-85`, `:129`) and notes from `getVaultEntries()` filtered by `isLinkTargetFile` (`:131`).
- The index holds only `.md`, `.markdown` and `.view` (`vault.rs:315-323`). The editor's `files` are every non-`.view` file in the tree (`editor-host.ts:80`, `wikilink-resolution.logic.ts:15-20`).
- `read_files_batch` needs `vaultPath` (`src/lib/contracts/commands.ts:155`, `src-tauri/src/commands/files.rs:24-31`). The composer has no fs permission (`composer.json`).
- Option (b) template: `submit_composer_capture` emits `qc:capture-detected` (`quick_capture/commands.rs:468-486`), the main window answers with `report_composer_capture_result` (`:504-515`), and the composer waits with `RESULT_TIMEOUT_MS = 3000` (`+page.svelte:10, 59-69, 188-190`).
- No `backgroundThrottling` exists in `src-tauri/tauri.conf.json`, `src-tauri/src` or `Cargo.toml` (grep returned nothing).
- Both commands take a shared read lock and clone everything (`vault.rs:567-572`, `:642-645`).

### Refuted or corrected
- `NOOP_HOST` is at `src/lib/core/markdown-editor/editor-host.ts:87-98`, not `:76-87`. The `editorHost` facet is at `:104-107`, not `:94-97`. `LinkCandidates` and `VaultTag` are at `:13-24`, not `:14-27`.
- "Notes only read when query is non-empty (`wikilink/completion.ts:56`)": the `includeNotes` argument is at `:68` and the alias loop at `:86-113`. `resolveLink` / `readNote` are used at `:15-24` (`resolveTargetContent`), called from `:139` and `:191`, not at `:121-130`. The fields read from `NoteEntryV2` are at `:27-35` and `:87-90`.
- "`.logic.ts` helpers import only `utils/` and a type (`wikilink/completion.logic.ts:1-3`)": line 3 also imports `./navigation.logic`. That file has zero imports, so the conclusion stands.
- Section 5, UNVERIFIED "how heavy is `profiling`'s import graph": `src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts` has zero imports. `reportError` is `console.error` plus `port.log`, and the port defaults to `DISABLED`, a no-op (`profiling.ts:9-12`, `:36-39`). It is safe in the composer.
- (c), UNVERIFIED "JS emit needs `core:event`, does `core:default` cover it": it does. `core:default` includes `core:event:default`, which is `allow-listen`, `allow-unlisten`, `allow-emit` and `allow-emit-to` (`src-tauri/gen/schemas/acl-manifests.json`).
- `MIN_COMMANDS = 57` is at `src/tests/lib/contracts/ipc-parity.test.ts:24`, not `:26`.
- The 5-minute WebKit suspension claim is not at `003...md:53`. That line points to the deep dive. The claim itself is at `.scratch/open-itens/research/deep-dive-2026-11-12/SUMMARY.md:22` and `:90`. It cites tauri 2.12.5 `webview_window.rs:1254-1267`, which I did not read (UNVERIFIED).
- Section 1 cites the CSP as `connect-src ipc: http://ipc.localhost`. The real directive (`tauri.conf.json:29`) also lists todoist, huggingface, github and sentry hosts. This does not affect the conclusion.
- On the ADR: scout 06 says option (a) satisfies the ADR precondition. ADR 0028:68 names two preconditions, "CodeMirror swap + IPC exposing vault entries". Scout 06 omits the CodeMirror one.

## Scout 11: index freshness and event scope

### Confirmed
- Every `vault-index-updated` emit site uses `app.emit`, a broadcast: `vault.rs:373, 465, 757, 873, 982, 1164, 1255, 1406, 1752`. The only `emit_to` is `lib.rs:168`.
- `UpdateResult` fields are at `src-tauri/src/vault/index.rs:33-54`. The version is monotonic per process: `rebuild` bumps it (`index.rs:483`) and never resets it, and the index is one process-wide managed state.
- The throttle constants are `REFRESH_DELAY_MS = 2000` and `REFRESH_MIN_INTERVAL_MS = 10_000` (`src/lib/app/tauri-listeners.service.ts:106`, `:109`), with a prompt path at `:298-303`. One event fires per file in a watcher burst (`:128-130`).
- Rust's watcher only emits `vault-files-changed` (`src-tauri/src/commands/watcher.rs:11-23`). The main window's TS (`watcher-handler.service.ts:35+`) is what updates the index. With the main window destroyed, the index stops changing (indexing-watcher rules item 4).
- The JS `listen` default target is `Any` (`node_modules/@tauri-apps/api/event.d.ts:49-54`). The wrapper `on()` is at `src/lib/contracts/ipc.ts:84-89`.
- The root layout imports only `app.css` (`src/routes/+layout.svelte`), so the composer runs none of the `(app)` listener registration.
- No Rust command exposes the index version alone. `versionGated` (`src/lib/utils/inflight.ts:124-155`) is reusable, and `inflight.ts` has zero imports, which resolves scout 11's UNVERIFIED note.

### Refuted or corrected
- "Invokes only `dismiss_composer` (line 63) and `submit_composer_capture` (line 100)": the calls are at `+page.svelte:77` and `:102`. `resetForShow` is at `:146-159`, not `:143-157`. The save-then-dismiss path is `:123-134`, not `:131-141`.
- "The comment at `vault.rs:555-562` ... call it a multi-MB IPC": that comment (`vault.rs:553-561`) says nothing about size. Only `tauri-listeners.service.ts:131-132` says "multi-MB JSON IPC".
- Risk 2, "`get_all_vault_entries_v2` is markdown-only": the index also holds `.view` (`vault.rs:315-317`). The composer must drop `.view` entries with `isLinkTargetFile` for both `files` and `notes`, as `editor-host.ts:80` and `:131` do, or it offers view names the editor never offers.

## Scout 15: performance, payloads, caching

### Confirmed
- `get_all_vault_entries_v2` clones and sorts every entry (`vault.rs:570-571`). The `NoteEntry` fields match `src/lib/contracts/generated/NoteEntry.ts`. The snippet cap is 280 bytes (`src-tauri/src/vault/entry.rs:24`).
- `TagAggregate` is `{name, count, filePaths}` (`src-tauri/src/vault/task.rs:160-168`). `lookup_all_tags` clones one path per (tag, note) pair (`index.rs:1039-1065`), and the editor drops `filePaths` (`editor-host.ts:102`).
- Both commands are sync `pub fn`. The repo states that a sync `fn` command runs on the main thread (`vault.rs:114-117`). This is UNVERIFIED in the tauri source; it matches the Tauri 2 docs as I remember them.
- `scan_vault` is `async` with `spawn_blocking` (`vault.rs:119-125`).
- The CodeMirror defaults (`node_modules/@codemirror/autocomplete/dist/index.js`, v6.20.4) are `activateOnTypingDelay: 100` (`:379`) and `maxRenderedOptions: 100` (`:383`). The editor uses `autocompletion({override:[...], activateOnTyping:true})` (`setup/editor-extensions.ts:142-145`).
- No `validFor` means a re-query on every keystroke. `checkValid` returns false without `validFor` (`index.js:1036-1038`), so `ActiveResult.updateFor` falls through to `State.Pending` (`:1022`).
- An empty query sorts every file with `localeCompare` (`wikilink/completion.logic.ts` `matchFilesForWikilink`). `fuzzyMatch` allocates two lowercased strings per call (`src/lib/utils/fuzzy-match.ts:11-12`). The tag source checks the line for `#` before `doc.toString()` (`tag/completion.ts:19-21`).
- The entry-cloning figure, "~50-100 ms of allocations" on the dogfood vault, is at `vault.rs:590-597`.

### Refuted or corrected
- `$effect(() => writeDraft(text))` is at `+page.svelte:34`, not `:40`. `show` is at `:28`, not `:25`. The emit is at `vault.rs:373`, not `:376`. The wikilink `doc.toString()` is at `wikilink/completion.ts:45` and the tag one at `tag/completion.ts:21` (cited as `:46` and `:23`).
- Section 2.3, "the composer has no vault path" for `scan_vault`, and section 1, "the only vault-wide list without a vault path": see the cross-cutting correction below. A vault path is readable from shared localStorage. That makes `scan_vault`, which is async and off the main thread but heavy, an option for non-index files.
- Q4, "does `core:default` cover listening?": yes, see the scout 06 correction.

## Scout 16: no vault, switching, hidden or closed main window

### Confirmed
- The hotkey gate is `db::is_open()` only (`lib.rs:45-47`, `src-tauri/src/db/mod.rs:105-107`). `close_vault_db` only drops the DB connections (`src-tauri/src/commands/db.rs:15-17`, `db/mod.rs:92-100`) and never clears `VaultIndex`.
- `open_composer` has no frontend caller: grep finds only `commands.ts:222` and `:325`.
- The lifecycle order is `resetIndexReady` (`app-lifecycle.service.ts:141`), `open_vault_db` (`:248`), `buildIndex` (`:337`), `markIndexReady` (`:353`). Teardown runs `close_vault_db` (`:636`), then `resetIndexReady` (`:649`). So the gate passes before the new vault's index exists.
- `VaultIndex` records `vault_root`, set by `build_with_root` (`index.rs:275`, `:349`, `:396-398`, `:417`).
- `show_composer` calls show, then focus, then emit, all on the main thread (`quick_capture/commands.rs:393-407`). The emit payload is `""`, which carries no vault identity.
- The main-window close calls `destroy()` (`tauri-listeners.service.ts:48-55`). The capture listener lives only in the main webview (`quick-capture.service.ts:51-75`). Issue 003 is parked as `needs-info` (`003...md:9-11`).

### Refuted or corrected
- `+page.svelte` line references: `resetForShow` is at `:146-159`, not "~105-118". The theme and draft re-read is at `:147-152`, not `:99-101`. `onMount` is at `:173-195`, not "~190-196". The keydown handler is at `:161-171` and its binding at `:202`, not "~157-168, :207". The "Could not save" hint is at `:214`; `:216` is "Save not confirmed".
- The failed-scan comment is at `app-lifecycle.service.ts:355-366`, not `:304-326`, which is the Step 3 user-data load and the Step 4 header.
- "UNVERIFIED whether `reportError` is safe in the composer (may touch Sentry/settings)" is refuted, as noted under scout 06: `profiling.ts` has zero imports. More broadly, both completion source files import only `@codemirror/state` at runtime (`Facet`, via `editor-host.ts:1`), plus pure modules with zero imports (`fuzzy-match.ts`, `navigation.logic.ts`, `profiling.ts`) and type-only modules (`vault-v2.types.ts`, `contracts/index.ts`). `@codemirror/autocomplete` is a type-only import in both (`wikilink/completion.ts:1`, `tag/completion.ts:1`). So importing them pulls in no stores, settings or Sentry. This answers Q5.
- F2, "the composer has no vault identity to key a cache on": partly wrong, see the cross-cutting correction.

## Cross-cutting correction: the composer can learn the vault path

- Both windows load from the app origin (`WebviewUrl::App("/composer")`, `lib.rs:139`), and `theme.service.ts:9-11` states that secondary windows "share this origin's localStorage". The composer already relies on that for the theme (`+page.svelte:6`, `:143`, `:149`).
- `vaultStore.open(path)` saves the recent-vaults list with the opened vault first, under `kokobrain:recent-vaults` (`vault.store.svelte.ts:4`, `:80-87`; `vault.logic.ts:24-32`).
- Caveats: this is the last-opened vault, not a confirmed open one. `close()` leaves the list unchanged (`vault.store.svelte.ts:89-93`). The composer is reachable only while a DB is open (`lib.rs:45`), which narrows the gap. The composer could reread it per summon, as it already does for the theme.
- What it enables with zero Rust edits:
  - `read_files_batch(vaultPath, paths)` for `[[Note#heading` and `[[Note#^block` (`files.rs:24-31` checks the path is inside the vault).
  - `resolveWikilinkCached(..., vaultRoot)` with a cache from `buildResolutionCache(entryPaths)` (`wikilink-resolution.logic.ts:109`, `:128`).
  - `scan_vault(path, 'name')` for the editor's full set of non-index link targets.
- ADR 0028:63 says the composer "lives at its own Tauri origin". That contradicts `theme.service.ts:9-11`, and the ADR amendment should fix it.

## Gaps the scouts missed

1. **Non-index link targets the owner actually uses.** Scouts 06, 11 and 15 name images and PDFs. But `.canvas`, `.kanban` and `.collection` are also outside the index (`vault.rs:321-323`), and the editor offers them in `[[` because they are in the tree. The owner uses canvas and kanban (memory `owner-feature-usage`). An index-only composer is a visible divergence for this owner, not only for attachments.
2. **Wikilink file mode does not catch host rejections** (`wikilink/completion.ts:68`, no try/catch), unlike tags (`tag/completion.ts:25-30`). CodeMirror handles a rejected source by closing completion and calling `logException` (`@codemirror/autocomplete/dist/index.js:1212-1215`). That is not fatal, but the composer host's `listLinkCandidates` should resolve to empty on error, as scout 16 suggests.
3. **The stale-vault window is a switch-only case.** `VaultIndexState::default()` (`lib.rs:319`) is empty until the first scan, so on a cold start the composer sees empty data, not another vault's. The wrong-vault risk exists only after an in-process vault switch or a failed scan. A cheap read-only guard pattern already exists in Rust: `idx.vault_root() != Some(root)` checks at `vault.rs:807` and `:908`, and `ensure_open_vault` at `db/mod.rs:159`.
4. **The editor is not fully guarded either.** `vaultTags()` checks `indexReady` (`editor-host.ts:99`), but the alias path `getVaultEntries()` (`:131`) does not. After a failed scan, the editor can still offer the previous vault's aliases from the stale index (`app-lifecycle.service.ts:355-364`). Exact parity with the editor would include that quirk.
5. **Prefetch at summon competes with the focus retries.** `schedule_refocus_after_space_move` runs `set_focus` on the main thread at 150 ms and 280 ms (`quick_capture/commands.rs:375-386`). A sync command run on summon also occupies the main thread (`vault.rs:114-117`) and can delay those retries, which is the focus race the helper exists for. This is a concrete reason for scout 15's lazy-load recommendation. UNVERIFIED at runtime.
6. **A measurement path already exists.** `CmdTrace` logs `exit get_all_vault_entries_v2 after Nms` and `get_all_tags_v2` timings (`vault.rs:33-55`, `:566`, `:641`), and `log_vault_shape_once` logs the vault shape (`vault.rs:64+`), all to the session log when debug logging is on. The owner's existing logs may already answer scout 15 Q1. I did not read them: they are outside the working directory. These figures cover only the Rust clone, not serialization, transfer or `JSON.parse`.
7. **Debug-only side effect.** The main window's queue-wait pairing (`src/lib/contracts/ipc.ts:32-77`) matches each Rust `enter` line with the oldest invoke the main window recorded. A composer invoke of a `CmdTrace`-d command produces an `enter` the main window never recorded, so queue-wait figures can be mis-paired while debug tracing is on. This only skews diagnostics.
8. **Reusing the source modules needs a CodeMirror state.** The sources read the host through `state.facet(editorHost)` and build `apply` closures that call `view.dispatch` (`wikilink/completion.ts:74-81`, `:100-107`). A textarea composer could still call `detectTagContext`, `detectWikilinkContext`, `rankTags` and `matchFilesForWikilink` directly. It could not reuse `apply`, including the `noteName|alias` insert at `:103`, without an `EditorView`. This belongs to scouts 07 and 08, but it limits the "zero editor edits" reuse these scouts assume.
9. **Self-capture freshness.** Whether a composer capture is indexed at once (the `create_note` path, which skips the IPC per indexing-watcher rules item 6) or through a later save is UNVERIFIED. It decides scout 11's risk 6 window.
