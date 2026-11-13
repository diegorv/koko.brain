# Scout 16: no vault, vault switching, hidden or closed main window, throttling

Read-only research at HEAD 130d6b8f7. Nothing was run. Paths are relative to the repo root.

## Bottom line

The composer autocomplete must be a pure enhancement: if suggestions cannot be produced for any reason (no vault, switching, main window gone, webview suspended, IPC error, slow answer), the list stays empty and typing and Cmd+Enter saving behave exactly as today. Three facts drive the design:

1. Rust gates both hotkeys on `db::is_open()` only. It does not know whether the vault index is ready, nor which vault the index holds.
2. Rust's `VaultIndex` is never cleared on vault close or switch, so any Rust-side read (`get_all_tags_v2`, `get_all_vault_entries_v2`) can return the PREVIOUS vault's data. The editor avoids this with a frontend-only guard (`vaultStore.indexReady`) that the composer webview cannot read.
3. The composer cannot rely on the main window answering: it may be destroyed (issue 003, parked) or its webview suspended while hidden.

## Findings

### F1. No vault open: the composer cannot be summoned from the hotkey

- `dispatch_shortcut` returns early when `!crate::db::is_open()` for both `OpenComposer` and `CaptureClipboard` (src-tauri/src/lib.rs:45-47, comment at :41-44). So with no vault open the popover never appears, and no autocomplete is needed.
- `db::is_open()` is `DB.lock().map(|db| db.is_some())` (src-tauri/src/db/mod.rs:104-106). `close_database` sets `DB` and `FTS_DB` to `None` (src-tauri/src/db/mod.rs:92-100); it is reached through the `close_vault_db` command (src-tauri/src/commands/db.rs:13-17) from `teardownVault` (src/lib/app/lifecycle/app-lifecycle.service.ts:636).
- The only other summon path, the `open_composer` command (src-tauri/src/quick_capture/commands.rs:413), has no gate, but I found no frontend caller: grep for `open_composer`/`openComposer` in src/ hits only the contract tables (src/lib/contracts/commands.ts:222, :325). So today the db gate is effectively the only entry. UNVERIFIED: that no `.svelte` builds the command name dynamically.
- Edge: the composer can already be visible when the vault is closed under it (switch started from the main window while the popover is open). Then `db::is_open()` is false, the draft text is still there, and a save fails visibly through the existing 'Could not save' path (src/routes/composer/+page.svelte:115-121, hint at :216). Autocomplete should just return nothing; it needs no extra handling.
- Recommended behavior: no suggestions, no error toast, no `console.error` spam in the composer (a failed or empty read is a normal state here). Note the composer has no toast host; the only user-facing surface is the hint line.

### F2. Vault switching: a stale-vault window exists on the Rust side

Sequence in `initializeVault` / `teardownVault` (src/lib/app/lifecycle/app-lifecycle.service.ts):

- Init entry: `vaultStore.resetIndexReady()` (:141), `invalidateVaultEntries()`.
- Teardown: `close_vault_db` (:636), then `resetIndexReady()` (:649).
- Step 2 `open_vault_db` (:248) makes `db::is_open()` true again for the NEW vault.
- Step 4 builds the index; `markIndexReady()` at :353 only after it succeeds. Between step 2 and step 4 the hotkey passes its gate, but the Rust `VaultIndex` still holds the previous vault.
- Nothing in Rust resets the index: the only writers are `build_with_root` calls in src-tauri/src/commands/vault.rs:1474, :1597, :1703 (scan commands). I found no reset on `close_vault_db`. The index does record a `vault_root` (src-tauri/src/vault/index.rs:275, :347, `build_with_root` at :396), which a Rust command could compare against the open db path (compare `with_vault_db`/`ensure_open_vault`, src-tauri/src/db/mod.rs:139-165). That is an idea, not existing behavior.
- The editor knows this window and guards it: `vaultTags()` returns `[]` while `!vaultStore.indexReady` (src/lib/app/editor-host.ts:96-99, comment "Until the current vault's index is built, Rust still holds the previous vault's"). The comment at src/lib/app/lifecycle/app-lifecycle.service.ts:304-326 states the same for failed scans: a failed scan leaves the old vault's index in Rust for the whole session ("The user recovers by reopening").
- Wikilink candidates in the editor come from `fsStore.fileTree` (JS, per-vault, `treeLinkIndex()` src/lib/app/editor-host.ts:76-85) and, for aliases, `getVaultEntries()` (:128-133), which wraps `get_all_vault_entries_v2` (src-tauri/src/commands/vault.rs:563-573, no vault check) and is memoized and invalidated by the frontend (src/lib/core/vault/vault-entries.service.ts, invalidate calls at init entry and after `markIndexReady`). The composer webview has none of these stores, so a direct IPC read from the composer bypasses every one of these guards.
- Composer-side cache hazard: the composer webview lives for the whole app session, hidden (built at setup, src-tauri/src/lib.rs:135-153). Any tag/file list cached in the composer module state would survive a vault switch while hidden. `qc:open-composer` carries an empty payload (`handle.emit(QC_OPEN_COMPOSER_EVENT, "")`, src-tauri/src/quick_capture/commands.rs:406) so the composer has no vault identity to key a cache on. Safest: fetch on each summon (`resetForShow`, src/routes/composer/+page.svelte:~105-118) and never keep results across summons. The existing `resetForShow` already re-reads theme and draft per summon for the same "missed while hidden" reason (:99-101).

Recommended behavior: during the switch window and after a failed scan, no suggestions is correct and the safe default; wrong-vault suggestions are the failure to avoid (a `[[` completion inserting a link to a note that does not exist in the active vault). If suggestions come from a Rust command, that command must itself refuse (empty or Err) when the index root is not the open vault, because the composer cannot check `indexReady`. Open question Q2.

### F3. Main window closed or destroyed (issue 003)

- `registerCloseHandler` prevents close, runs `prepareForExit`, then `getCurrentWindow().destroy()` (src/lib/app/tauri-listeners.service.ts:48-55). The hidden composer keeps the process alive (src-tauri/src/commands/app_exit.rs:43-49 comment; `on_exit_requested` computes `has_main_window` at src-tauri/src/lib.rs:165). The run loop handles only `RunEvent::ExitRequested` (:402); no `Reopen` arm.
- Status of issue 003 (.scratch/open-itens/issues/003-closing-main-window-never-leaves-windowless-app.md): `needs-info`, parked by the owner on 2026-11-12 ("prefers to do nothing about this Issue now"); the hide-on-close + `RunEvent::Reopen` decision from 2026-11-06 stands for later. So today, after the red button, the app is windowless and the composer is still summonable (db stays open, F1), but the main webview is gone.
- Consequence for the composer today: a save already fails there. `qc:capture-detected` has no listener (listener is only in the main webview, src/lib/plugins/quick-capture/quick-capture.service.ts:53-75), so the composer hits `RESULT_TIMEOUT_MS = 3000` and shows 'Save not confirmed' (src/routes/composer/+page.svelte:10, :216). Autocomplete must not make this worse and does not need to fix it (scope constraint 3).
- Design consequence: if autocomplete data is requested THROUGH the main window (event request/response like `submit_composer_capture` -> `report_composer_capture_result`, src-tauri/src/quick_capture/commands.rs:469-515), it silently dies in this state and every completion would wait for a timeout. Either pick a source that does not need the main webview (direct Rust commands: `get_all_tags_v2` src-tauri/src/commands/vault.rs:638-648 and `get_all_vault_entries_v2` :563-573, both read only `VaultIndexState`, which is app-managed state, not window state), or bound the wait to a short timeout and return empty. Direct Rust commands also survive the future hide-on-close fix unchanged.
- If issue 003 is later fixed with hide-on-close, the main webview exists but is hidden: see F4.

### F4. Webview background throttling and hidden webviews

- `src-tauri/tauri.conf.json` has no `backgroundThrottling` (grep returned nothing in tauri.conf.json, Cargo.toml and src-tauri/src; the deep dive notes the same, .scratch/open-itens/research/deep-dive-2026-11-12/SUMMARY.md:21). The composer is built without a throttling option too (src-tauri/src/lib.rs:136-149).
- Per that deep dive (SUMMARY.md:90, citing tauri 2.12.5 webview_window.rs:1254-1267, macOS 14+): WebKit suspends a hidden or minimized view's tasks after about 5 minutes. I did NOT read the Tauri crate source (outside the repo, scope rule), so this is UNVERIFIED by me; treat it as a lead.
- Implication for the composer itself: it is hidden between summons, so it is the throttled view, and the hotkey path is `window.show()` then `emit` (src-tauri/src/quick_capture/commands.rs:400-406), i.e. the view is shown before the event, which is what wakes it. The route already tolerates a late wake: `onMount` registers listeners once and `textareaEl?.focus()` (src/routes/composer/+page.svelte:~190-196). A completion IPC issued from the composer after it is shown runs in a live view, so composer-side throttling is not a risk for a pull-on-summon design. UNVERIFIED on a real machine: first-keystroke latency after a long hidden period.
- Implication for the main window: if autocomplete depended on the hidden main webview (after a future hide-on-close, or minimized main), it could be suspended and never answer. This is a second reason to prefer direct Rust IPC over a composer -> main round trip.
- The composer already works with stale `localStorage` and missed `storage` events while hidden (src/routes/composer/+page.svelte:99-101); same reasoning applies to any cached completion data.

### F5. What Rust knows today (inventory)

- `db::is_open()` (src-tauri/src/db/mod.rs:104-106): DB connection present. Set in step 2 of init, before the index is built.
- `VaultIndexState` (src-tauri/src/vault/mod.rs:26, `RwLock<VaultIndex>`): holds entries, tags, a `vault_root: Option<String>` (src-tauri/src/vault/index.rs:275). Not cleared on close; always readable, so reads never error with "no vault", they return stale or empty data.
- `with_vault_db(vault_path, f)` / `ensure_open_vault` (src-tauri/src/db/mod.rs:139-165): the existing pattern for "is this the open vault" check, keyed on a caller-supplied vault path. The composer has no vault path.
- No Rust-side "active vault path" or "index ready" accessor was found. UNVERIFIED: I did not grep every command module for a hidden one; I checked db/mod.rs, vault/mod.rs, vault/index.rs and the grep of `build_with_root` / index resets.
- Custom command access from the composer window: src-tauri/build.rs calls plain `tauri_build::build()` with no app manifest restricting commands, and capabilities/composer.json lists only `core:default`, `core:window:allow-hide`, `core:window:allow-set-focus` (src-tauri/capabilities/composer.json). By my reading of Tauri 2, app commands registered in `generate_handler!` are callable from any window when no `AppManifest` limits them, so `get_all_tags_v2` would work from the composer without a capability change. UNVERIFIED (no Tauri source or runtime check); the file's own description says the composer "only needs to invoke the submit and dismiss commands", which is a statement of intent, not enforcement.

## Recommended behavior per state

| State | Composer autocomplete should |
|---|---|
| No vault open | Never reachable via hotkey (F1). If visible anyway: no suggestions, no error surface, typing and save unaffected. |
| Vault switching (db open, index not built) | No suggestions. Needs a Rust-side guard or an accepted risk (Q2). |
| Failed scan (stale index for whole session) | Same risk as above; the editor accepts it only because of the `indexReady` guard. |
| Main window destroyed (issue 003 as is) | Work if data comes from Rust commands; return empty after a short timeout if it comes from the main webview. Never block save. |
| Main window hidden (future 003 fix) or minimized | Same; prefer direct Rust IPC. |
| Composer hidden for hours, vault switched meanwhile | Fetch on each summon, drop results on dismiss; never trust a cache from an earlier show. |
| IPC rejects or is slow | Swallow into an empty list (log through `debug`, not `console.error`), keep the popover usable; a completion source that rejects must not break key handling. |

## Reuse opportunities

- Tag read: `get_all_tags_v2` exists and is what `vaultTags()` wraps (src/lib/app/editor-host.ts:96-110); it returns `{ name, count }[]` and the host maps to `VaultTag` (the `VaultTag` type is in src/lib/core/markdown-editor/editor-host.ts). A composer host's `listTags` can call it directly through `call()` (src/lib/contracts/ipc.ts).
- Link candidates read: `get_all_vault_entries_v2` (src-tauri/src/commands/vault.rs:563-573) gives `NoteEntryV2[]` (aliases for `includeNotes`). For `files`, the editor derives them from `fsStore.fileTree` (JS), which the composer lacks; deriving `FileEntry[]` from the entries list would be new code (other scouts own this).
- `NOOP_HOST` (src/lib/core/markdown-editor/editor-host.ts:~84-98): the existing "no data" host. A composer host that wraps `listTags`/`listLinkCandidates` in try/catch and falls back to the NOOP shapes gives the no-vault/error behavior for free, with zero editor edits.
- The editor's tag completion already treats a rejected `listTags` as empty and reports it (src/lib/core/markdown-editor/extensions/tag/completion.ts:26-28 via `reportError('TAG_COMPLETION', ...)`). UNVERIFIED whether `reportError` is safe in the composer webview (it may touch Sentry/settings stores, which the composer does not load; see the `utils/debug.ts` layer exception noted in CLAUDE.md). Check before reusing completion.ts unchanged.
- Per-summon refresh hook: `resetForShow()` in the composer route is the natural point to invalidate any composer-side memo.

## Risks

- R1 (highest): wrong-vault suggestions during a switch or after a failed scan, because Rust has no index-ready or active-vault signal and `get_all_*` never refuse. Mitigation needs a new Rust guard (a small command that returns empty unless index root == open db's vault) or acceptance of a short rare window. Per owner memory, do not add behavior to core write paths for rare corner cases; a new read-only command is not a write path, but the owner should decide.
- R2: composer -> main round trip dies silently when the main window is gone (today after the red button). Avoid it.
- R3: cached completion data in the long-lived composer webview going stale across hidden vault switches.
- R4: a completion that throws or hangs must never swallow Cmd+Enter or Esc. The composer binds both on `svelte:window` keydown (src/routes/composer/+page.svelte:~157-168, :207); CodeMirror's autocompletion keymap would also bind Enter/Escape when its popup is open, which is a conflict that belongs to the UI scouts, but the no-data states must leave the popup closed so Esc still dismisses the composer.
- R5: large vaults: `get_all_vault_entries_v2` clones every entry per call (src-tauri/src/commands/vault.rs:570); fetching it on every summon and keystroke from the composer has no version-keyed memo (the editor's memo is keyed on `vaultStore.vaultIndexVersion`, which the composer lacks). Fetch lazily, only after `[[` is typed, and once per summon.
- R6: documentation drift: ADR docs/adr/0028-quick-capture-merge-into-kokobrain.md lists `[[` autocomplete in the composer as out of scope and requiring "IPC exposing vault entries to the composer webview"; this work reverses that and the ADR needs an amendment (other scouts own it).

## Open questions for the owner or other scouts

- Q1: Is it acceptable that suggestions can come from a data source other than the main window's stores (direct Rust IPC from the composer), given the editor's `indexReady` guard has no composer equivalent?
- Q2: Accept the rare stale-vault window (switch in progress with the popover opened) or add a read-only Rust guard that compares the index root with the open db? Asking the main window instead would avoid it but reintroduces R2. Needs an owner call.
- Q3: Should the composer show anything (for example a muted hint) when suggestions are unavailable, or stay silent? Scope constraint 3 argues for silent.
- Q4: Confirm on a real machine (not verified here): that app commands run from the composer webview with the current capability file, and the post-5-minute-hidden first-keystroke latency.
- Q5: Does anything in the composer webview's module graph (settings store, Sentry via `error()`) initialize when importing the editor's completion files? Another scout should confirm imports before relying on `reportError`.
