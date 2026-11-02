# Scout: deep-link slice (external-input writers)

Scope: URL-driven and clipboard-driven writers. Read-only audit. No repo file was edited, no build or test was run.

Notation: **READ** = read in source with file:line. **FETCHED** = official source fetched by URL. **INFER** = reasoning, not observed at runtime.

---

## 1. Entry points and call chains

### 1.1 `kokobrain://` URL (macOS / cold start)

1. Layout registers the listener: `src/routes/(app)/+layout.svelte:48-50` calls `registerDeepLinkListener()` (READ).
2. `registerDeepLinkListener` (`src/lib/features/deep-link/deep-link.service.ts:82-112`):
   - Live URLs: `onOpenUrl` (`:87-96`) calls `enqueueDeepLinkUrl(url)` per URL (`:89`).
   - Cold start: `getCurrent()` (`:99-106`) calls `enqueueDeepLinkUrl` per URL (`:102`).
3. `enqueueDeepLinkUrl` (`:25-33`) chains onto a module-level `dispatchQueue` promise. Errors are logged and the queue continues.
4. `handleDeepLinkUrl` (`:118-129`) calls `parseDeepLinkUri` (`deep-link.logic.ts:44-135`). Invalid input yields a toast only. Valid input goes to `resolveAndDispatch`.
5. `resolveAndDispatch` (`:150-169`):
   - `resolveVaultPath` (`:137-143`) matches `vaultStore.recentVaults` by name. No match is a toast (`:152-155`).
   - Same vault (`:158`): `executeAction` runs immediately.
   - Other vault (`:165-166`): `deepLinkStore.setPendingAction(action)` (single slot, `deep-link.store.svelte.ts:18-20`), then `await switchVault(resolvedPath)`.
6. `switchVault` (`src/lib/core/vault/vault.service.ts:18-22`): `saveAllDirtyTabs()` (return value ignored), `drainPendingWrites()`, `vaultStore.open(path)`. The new vault's `initializeVault` runs reactively. Step 8 calls `executePendingAction()` (`app-lifecycle.service.ts:502-505`).
7. `executePendingAction` (`deep-link.service.ts:329-341`) consumes the slot and runs `executeAction(action, vaultStore.path)` (`:333`, `:340`). It uses the current vault, not `action.vault`.
8. `executeAction` (`:175-207`) dispatches by type inside a try/catch that toasts on error (`:203-206`):
   - `open` (`:178-187`): `resolveFilePath` then `openFileInEditor`. Read-only.
   - `new` (`:189-190`): `executeNewAction` (`:243-323`). Writes.
   - `search` (`:193-196`): `openSearch`. No write.
   - `daily` / `capture` (`:198-201`): `runRegisteredAction`, which calls the handler registered from `src/lib/app/deep-link-actions.ts` (see 1.3).

### 1.2 Clipboard / composer capture (separate queue)

1. Global shortcut `Ctrl+Alt+Cmd+C` (`src-tauri/src/quick_capture/shortcuts.rs:28-38`) reaches `capture_clipboard_now` (`src-tauri/src/quick_capture/commands.rs:235-251`).
2. `capture_clipboard_now_with` (`commands.rs:71-97`) reads the clipboard (`clipboard.rs:74-113`), runs `decide` (`kind_detect.rs:79-87`), applies signature dedupe (`commands.rs:85-89`), materializes image bytes to `$TMPDIR` (`commands.rs:105-117`, `:123-142`), and returns JSON payloads.
3. `app.emit(QC_CAPTURE_DETECTED_EVENT)` (`commands.rs:246-249`), fire and forget.
4. Frontend listener `registerQuickCaptureListener` (`src/lib/plugins/quick-capture/quick-capture.service.ts:44-75`) has its own queue (`:53`, `:56-61`). Each payload goes to `handleDetectedCapture` (`:82-101`), which requires a vault (`:85-91`, toast and drop otherwise) and then calls `executeAction` (`:100`).
5. Composer path: `src/routes/composer/+page.svelte` calls `submit_composer_capture` (`:40`). Rust (`commands.rs:349-365`) emits the same event after a trim guard (`:353`). The composer then dismisses regardless of outcome (`:40-46`, `dismiss` at end of `submit`). Text is cleared on next show (`resetForShow`, `text = ''`).

### 1.3 Registered handlers for `daily` and `capture`

`src/lib/app/deep-link-actions.ts:184-192` registers `executeDailyAction` and `executeCaptureAction` in `src/lib/app/boot.ts:55-61` (READ, `registerDeepLinkActions()` is inside `registerAppPorts`).

- `executeDailyAction` (`deep-link-actions.ts:31-65`): `openOrCreateDailyNote()` (`:37`, goes through `openOrCreateNote`, which opens the file), then `resolveContent` (`:40`), then `exists`/`readTextFile`/`writeTextFile` (`:51-61`), then `syncExternalContentToEditor(..., true, 'none')` (`:63`) and `notifyAfterSave` (`:64`).
- `executeCaptureAction` (`:102-178`): builds path (`:115-121`), `mkdir` (`:125-126`), optional template with a catch-all (`:131-160`, swallows all errors at `:157-159`), `resolveUniqueCapturePath` (`:171`, exists-then-write at `:76-88`), `writeTextFile` (`:173`), `notifyAfterSave` (`:174`), background tree refresh (`:177`).

### 1.4 `new` action write branches (`deep-link.service.ts:243-323`)

| Branch | Condition | Existence check | Write | Editor sync | Lines |
|---|---|---|---|---|---|
| prepend | `action.prepend` and file exists | `exists` (`:255`) | `readTextFile` (`:257`) then `writeTextFile(content + '\n' + existing)` (`:260`) | `syncExternalContentToEditor(..., true, 'none')` (`:262`) | 254-270 |
| append | `action.append` and file exists | `exists` (`:274`) | `readTextFile` (`:276`) then `writeTextFile(existing + '\n' + content)` (`:279`) | sync (`:281`) | 273-289 |
| overwrite | `action.overwrite` | none | `mkdir` (`:294`), `writeTextFile(content)` (`:296`) | sync (`:298`) | 292-306 |
| silent create | `action.silent`, no prepend/append/overwrite | **none** | `mkdir` (`:311`), `writeTextFile(content)` (`:313`) | **none** | 309-315 |
| visible create | not silent, no prepend/append/overwrite | via `openOrCreateNote` (`note-creator.service.ts:86`) | `create_note` only if missing (`note-creator.service.ts:89-125`) | opens tab | 316-322 |

Notes:
- Prepend and append fall through to create when the file is missing (`:268-269`, `:288-289`). That is by design.
- The silent create branch never checks `exists`. A silent `new` without `append`, `prepend` or `overwrite` replaces whatever is at the path, including with empty content (see Lead L1).
- The visible create branch with an existing file opens it and drops `content` (`note-creator.service.ts:89`, the create body is skipped). No toast.

### 1.5 Path resolution

`resolveFilePath` (`src/lib/utils/path.ts:33-53`, re-exported at `deep-link.logic.ts:318`):
- `normalizePath` (`path.ts:5-18`) collapses `.` and `..` lexically. No filesystem access.
- Escape check (`path.ts:42`): `normalized.startsWith(base + '/') || normalized === base`. Throws otherwise. Callers catch it (`executeAction` try at `deep-link.service.ts:176`, `:203`).
- Extension (`path.ts:46-50`): appends `.md` only when the last segment has no `.`.

Parameter parsing (`deep-link.logic.ts`): `URLSearchParams` decodes `%2F` to `/`, so `name=..%2FVault` reaches `resolveFilePath` as `../Vault`. `parseBooleanParam` treats `''` as true (`:338-341`). `vault` is required (`:62-65`). `new` requires `name` or `file` (`:84-86`).

### 1.6 Other slice files

- **`src/lib/features/tasks/todoist.service.ts`**: Todoist SDK calls plus local JSON `.kokobrain/todoist-sent.json`. Call chain: `TodoistPopover.svelte:97` calls `sendTaskToTodoist` (`todoist.service.ts:181-235`). `TasksView.svelte:73` calls `initTodoist` on mount. `TasksView.svelte:87` calls `syncTodoistTasks`. `TasksView` is mounted only when the Tasks virtual tab is active (`src/lib/app/EditorView.svelte:70-71`), and `TodoistPopover` lives inside it (`TasksView.svelte:265`).
- **`src/lib/features/type-definitions/type-definitions.service.ts`**: `renameType` (`:206-241`) is called from `TypesNavigator.svelte:368`. Icon writes come from `TypesNavigator.svelte:134,144`. View query writes come from `RailNoteList.svelte:201` (`persistViewState`, `:197-206`).
- **`src/lib/features/type-definitions/view-parse-cache.ts`**: in-memory cache of `.view` parses (`:11`), epoch and sequence guards (`:19-34`, used at `:47`). Consumers: `RailNoteList.svelte:159-160` (`getCachedViewDefinition`, no disk read on hit), `view-lens.service.ts:22` (`refreshViewDefinition` on every recount), `type-definitions.service.ts:310`. Eviction: `boot.ts:41-44` (path-change consumer, covers delete via `to === null`), `app-lifecycle.service.ts:621` (teardown).
- **`src-tauri/src/quick_capture/*`**: no vault writes. The only file write is `std::fs::write` to `$TMPDIR` (`commands.rs:139-140`). The only process spawn is `osascript` (`source.rs:243-259`), used for read-only browser URL and title lookup.

### 1.7 Tauri permissions

`src-tauri/capabilities/default.json`: `fs:allow-write-text-file` (`:83-99`), `fs:allow-mkdir` (`:103-135`), `fs:allow-remove` (`:138-153`), `fs:allow-rename` (`:155-170`), `fs:allow-copy-file` (`:172-187`), `fs:allow-read-text-file` (`:66-81`), `fs:allow-exists` (`:189-220`). Scope is static: `$DOCUMENT/kokobrain-vaults/**`, `$HOME/kokobrain-vaults/**`, and their `.kokobrain/**`, plus `$APPLOG/**` for write. No runtime scope extension was found (grep for `allow_directory` / `fs_scope` in `src-tauri/src` returned nothing, READ). INFER: a vault located outside `kokobrain-vaults` would be denied all plugin-fs calls, so vault locations are presumably constrained in practice. Not verified.

---

## 2. Every disk write, delete and rename in the slice

Official source fetched (FETCHED, `raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs`): `write_text_file` goes through `write_file_inner` → `OpenOptions` with `truncate: true` and `create: true` by default (`truncate: !opts.append`), then one `write_all`. There is no temp file, no rename, no fsync. Writes are therefore **in place and non-atomic**: a crash or I/O error mid-write leaves a truncated or partial file. `create` uses `File::create` (also truncates).

| # | Location | Operation | Atomic? | Preconditions checked | Error handling | Store / state on success | State on failure |
|---|---|---|---|---|---|---|---|
| W1 | `deep-link.service.ts:260` (prepend) | `writeTextFile` of disk-read + content | No (in place) | `exists` (`:255`); content from disk `readTextFile` (`:257`), not from the open tab buffer | Propagates to `executeAction` catch, toast (`:203-206`) | `markRecentSave` (`:259`), `syncExternalContentToEditor(…, true, 'none')` (`:262`) which sets tab content AND savedContent (`editor.store.svelte.ts:130-136`), `notifyAfterSave` (`:263`), optional open | Tab untouched (sync not reached). Disk may be truncated. |
| W2 | `deep-link.service.ts:279` (append) | same pattern | No | `exists` (`:274`) | same | same as W1 at `:281-282` | same |
| W3 | `deep-link.service.ts:296` (overwrite) | `writeTextFile(content)` | No | none, `mkdir` recursive (`:294`) | same | sync (`:298`), notify (`:299`), background tree refresh (`:301`) | Disk may be truncated. |
| W4 | `deep-link.service.ts:313` (silent create) | `writeTextFile(content)` | No | **none** (no `exists`) | same | notify (`:314`), tree refresh (`:315`). **No editor sync.** | If the file is open, the tab keeps its old content (see L1). |
| W5 | `deep-link-actions.ts:61` (daily) | `writeTextFile` of disk-read + content | No | `exists` only; if missing, return silently (`:51-52`) | propagates to `executeAction` catch | markRecentSave (`:60`), sync (`:63`), notify (`:64`) | Tab untouched. |
| W6 | `deep-link-actions.ts:173` (capture) | `writeTextFile` new file | No (but new path) | `resolveUniqueCapturePath` exists-then-write (`:171`, `:76-88`); `mkdir` (`:126`) | propagates | markRecentSave (`:172`), notify (`:174`), tree refresh (`:177`) | Partial new file possible. Capture content has no retry source. |
| W7 | `deep-link-actions.ts:134-160` (template read) | `readTextFile` only | n/a | n/a | catch-all `:157-159` swallows everything, including `processTemplate` errors | none | silently raw body |
| W8 | `note-creator.service.ts:103` (`create_note`, via `openOrCreateNote` from `new` visible path and daily/periodic) | Rust `create_note` → `write_atomic` (per sibling scout `scout-rust-write-cmds.md`, not re-read here) | Atomic in Rust | `exists` check `:86` | propagates | `markRecentSave` (`:107`), `applyNoteChange` create (`:118`), tree refresh | n/a |
| W9 | `quick_capture/commands.rs:140` (shot temp) | `std::fs::write` in `$TMPDIR` | No | none, unique name by microsecond timestamp (`:136-139`) | `map_err` string to frontend (`:140`) | Payload path points at temp file | error string propagates, no payload emitted |
| W10 | `todoist.service.ts:127-129` | `mkdir` (`:127`) then `writeTextFile(JSON)` (`:129`) | No | `exists` on dir (`:126`) | propagates | none beyond debug | Possible truncated JSON. |
| W11 | `type-definitions.service.ts:218` (renameType tab loop) | `writeTextFile(tab.path, updated)` | No | content from store (`tab.content`), rewrite null means skip (`:216-217`) | propagates to try/catch (`:214-231`), toast, return | sync (`:220`), applyNoteChange save (`:224`), then Rust propagate (`:226`) | Loop aborts; remaining tabs and member notes not updated; definition already renamed (`renameItem` at `:209`). |
| W12 | `type-definitions.service.ts:291` (`updateViewIcon`) | `writeTextFile` read-modify-write | No | none | propagates to `TypesNavigator` | no cache refresh, no tab sync | n/a |
| W13 | `type-definitions.service.ts:309` (`updateViewQuery`) | `writeTextFile` read-modify-write | No | skip if unchanged (`:308`) | propagates to `persistViewState` catch (`RailNoteList.svelte:199-204`), toast "Could not save the view" | `refreshViewDefinition` (`:310`) | Toolbar reseeds from file on failure (`stepSeed save-failed`). |
| W14 | Rust `propagate_type_rename_inner` (`commands/vault.rs:370`) | `write_atomic` per member (per sibling scout, `write_atomic` is temp+rename without fsync) | Atomic per file | index `is_a == old` (`:355-362`) | per-file failures `continue` (`:371-377`); command still returns Ok | index update, `vault-index-updated` emit | skipped member keeps old `_type` |
| W15 | Rust `rename` via `renameItem` (`fs.service.ts:201-220`, delegates to `applyPathChange`) | TS `rename` | n/a | `exists(newPath)` (`:205`) throws `targetExistsError` | rethrow after log | tabs and link rewrite via owner (other scout) | `renameType` returns early (`type-definitions.service.ts:210-212`) |

No delete is performed directly by this slice. Trash and remove are outside the slice.

---

## 3. Concurrency

1. **Deep-link queue** (`deep-link.service.ts:23-33`). Serializes URL dispatch, including each `switchVault` await. Covers URL vs URL. It does **not** cover:
   - the Quick Capture queue (`quick-capture.service.ts:53-62`), which is independent. A `kokobrain://capture` URL and a Rust `qc:capture-detected` event can run `executeCaptureAction` concurrently. The comment at `deep-link-actions.ts:71-74` says "Capture dispatch is serialized in `registerQuickCaptureListener`", which is only true for clipboard and composer payloads, not for URL captures.
   - the editor autosave timers (`editor.service.ts:196-200`, 2000 ms body, 500 ms frontmatter, mutually exclusive via `scheduleAutoSave`, `:111-124`) or the watcher (`app-lifecycle.service.ts:487-496`, 300 ms debounce). Read-modify-write sequences in W1, W2, W5 have `await` gaps between `readTextFile` and `writeTextFile`, so an autosave can land in the gap (see L2).
2. **Pending deep-link slot** (`deep-link.store.svelte.ts:4,18-20`). Single value. A second different-vault URL that arrives before the first one's init reaches step 8 overwrites it (see L5). `resetDeepLink` at `app-lifecycle.service.ts:641`.
3. **Queue release timing**. `switchVault` resolves after `vaultStore.open` (`vault.service.ts:21`), not after `initializeVault`. The queue therefore continues with the next URL while the new vault is still initializing. A same-vault URL then hits `vaultStore.path === resolvedPath` (`deep-link.service.ts:158`) and runs against a half-built vault (INFER, L9).
4. **Pending action execution** (`app-lifecycle.service.ts:502-505`) sits after `await ensureTemplatesFolder()` (`:382`) with no `initVersion` guard at the call. A superseded init can still consume the slot and run it against the current vault (see L6).
5. **Self-save marker** `markRecentSave` (`editor.hooks.ts:37-44`, 15 s TTL `:24`). Watcher uses it only to skip rebuilds (`watcher-handler.service.ts:41`). It does not stop `reloadExternallyChangedTabs` (`editor.service.ts:375-405`), which the watcher calls for all changed paths (`app-lifecycle.service.ts:486`). For clean tabs that is harmless. For a tab that became dirty during the await, the apply step (`:397-401`) re-checks only `diskContent === tab.savedContent` and then overwrites content (sibling scout `scout-watcher-ts.md` covers this).
6. **Quick capture dedupe anchor** (`commands.rs:94`) advances during batch construction, before any frontend handoff (see L8).
7. **View cache** epoch and sequence guards (`view-parse-cache.ts:19-34,47`, issues 54 and 63 resolved). Covers out-of-order cache inserts. Does not cover `.view` read-modify-write (`updateViewQuery` and `updateViewIcon`, `type-definitions.service.ts:284-311`, no lock). `persistViewState` fires one `updateViewQuery` per toolbar change without serialization (`RailNoteList.svelte:197-206`).
8. **renameType tab loop** awaits per tab (`type-definitions.service.ts:215-225`). Keystrokes typed during the `writeTextFile` await are overwritten by `syncExternalContentToEditor` at `:220` (store replaces content, `editor.store.svelte.ts:130-136`).

---

## 4. Leads

Confidence: **H** = high (read in code, the chain is complete), **M** = medium (depends on timing or an unverified runtime fact), **L** = low.

### L1. Silent `new` replaces an existing note, including with empty content [H, high severity]

- `deep-link.service.ts:309-315`: the silent create branch calls `writeTextFile(fullPath, content)` with no `exists` check. Any `kokobrain://new?vault=V&name=<existing note>&silent=true` (no `append`, `prepend` or `overwrite`) replaces the note.
- `content` can be empty: `resolveContent` returns `''` when there is no `content` param and clipboard is empty or disabled (`:214-224`, test `deep-link.service.test.ts:603-606`). Then `writeTextFile(path, '')` truncates the note to zero bytes. `clipboard=true&silent=true` with a non-text clipboard does the same.
- Test gap: silent-create tests (`deep-link.service.test.ts:287-306`, `:376-395`, `:485-504`, `:536-557`, `:1240-1250`) all use paths and mocks that do not exercise an existing target with no mode flag. No test asserts that silent create preserves an existing file.
- Scenario: user has `Journal.md`. A Shortcut or web link fires `kokobrain://new?vault=Work&name=Journal&silent=true`. `Journal.md` becomes empty on disk, and if the tab is open the tab keeps old content, so the next autosave writes the old content back (no sync, L2b).
- Also: visible create with an existing target silently drops `content` (`note-creator.service.ts:89-125` skipped, opens existing file, no toast). Medium-low, data in the URL is discarded.

### L2. Append, prepend, daily and overwrite discard unsaved keystrokes in an open dirty tab [H, high severity]

- The write reads from disk, not from the tab buffer: `deep-link.service.ts:257,276` and `deep-link-actions.ts:54`.
- Then `syncExternalContentToEditor(path, newContent, true, 'none')` (`deep-link.service.ts:262,281,298`, `deep-link-actions.ts:63`). With `markSaved=true` it calls `updateTabContentByPath` (`editor.service.ts:78-80`), which sets `tab.content = content` and `tab.savedContent = content` (`editor.store.svelte.ts:130-136`). The tab is marked clean with the disk-derived text. Typed text that was only in the buffer is gone from both editor and disk.
- The autosave timer (`editor.service.ts:196-200`) is not re-armed because `schedule='none'` (`:90`, `scheduleAutoSave` at `:111-124` does nothing for `'none'`). Any pending timer then sees a clean tab (`saveDirtyTabs` filters by `isTabDirty`, `:183-186`) and skips it.
- Window: any keystroke in the 2-second autosave window (`editor.service.ts:197`). Also the `await` gap between read (`:276`) and write (`:279`) lets an autosave land first (L2b).
- Scenario: user types in `Today.md` (today's daily note is open and dirty). Within 2 s a Shortcut runs `kokobrain://daily?vault=Work&append=true&clipboard=true`. The typed text vanishes from editor and disk.
- Sibling scouts `scout-editor-save.md:88-96,157-158` and `scout-rust-write-cmds.md:118-137` reached the same mechanism for other callers. Confirmed here for deep-link and daily.

### L2b. Silent create (no sync) leaves a stale open tab that autosave writes back over the URL write [H, medium severity]

- `deep-link.service.ts:309-315` does not call `syncExternalContentToEditor`. Watcher reload covers only clean tabs (`editor.service.ts:377-381`). A dirty tab (user typing) is never reloaded, and the 2 s autosave writes its stale buffer back over the URL content (`saveDirtyTabs` `:183-194`).
- Scenario: note `N.md` open, user has typed (dirty). `kokobrain://new?vault=V&name=N&content=X&silent=true` writes X to disk. Within 2 s the autosave writes the old buffer back. X is lost with no toast.

### L3. Overwrite has no confirmation and can hit any file in the vault, including dotfiles and non-markdown [H, high severity for the write, M for the trigger]

- `deep-link.service.ts:292-306` replaces the target with `writeTextFile` unconditionally. The `overwrite` flag is documented as "overwrite the file entirely even if it already exists" (`deep-link.types.ts:35`).
- The `.md` suffix is added only when the last segment has no `.` (`path.ts:46-50`). So `name=.kokobrain/todoist-sent.json&overwrite=true&content=...` writes the Todoist sent-task store directly (`todoist.service.ts:12`). Similarly `name=attachments/photo.png&overwrite=true` replaces a binary attachment with text.
- Any local process that can open a `kokobrain://` URL (Shortcuts, Raycast, a browser that does not prompt for external protocols, scripts) can trigger this. There is no user confirmation step in the handler (`deep-link.service.ts:118-129`, `:150-169`).

### L4. Path escape to the vault parent via a name that normalizes to the vault root [H on the code path, M on impact]

- `path.ts:42`: `normalized === base` is accepted. Then `path.ts:46-50` appends `.md` because the last segment is the vault name (no dot).
- Example: vault `/Users/me/kokobrain-vaults/Work`, URL `name=..%2FWork` (decoded to `../Work`), or `name=.`. `resolveFilePath` returns `/Users/me/kokobrain-vaults/Work.md`, outside the vault folder. With `silent` or `overwrite`, that file is written. `deep-link.service.ts:245-246` derives the file name from it.
- Scope limit (READ, `capabilities/default.json:83-99`): plugin-fs write scope is `$HOME/kokobrain-vaults/**`, so the escape stays inside that tree unless the vault sits elsewhere. Impact depends on vault location (INFER).
- The `open` action has the same escape (`deep-link.service.ts:181`, read-only).

### L5. Two different-vault URLs in quick succession drop the first action [M]

- `deep-link.service.ts:165`: `setPendingAction` overwrites the single slot (`deep-link.store.svelte.ts:18-20`). The queue (`:23-33`) releases after `switchVault` returns (`:166`), which is after `vaultStore.open` but before `initializeVault` runs step 8 (`app-lifecycle.service.ts:502`).
- Scenario: in vault A, URL1 `kokobrain://new?vault=B&name=Log&append=true&content=one` then URL2 `kokobrain://new?vault=C&...` arrive back to back. URL1 sets the slot and switches to B. The queue continues, URL2 finds `resolvedPath` C, overwrites the slot, switches to C. URL1 never runs. No toast.
- Timing depends on when Svelte's layout effect runs `initializeVault` relative to the queue continuation (INFER).

### L6. Pending action runs against the current vault, not `action.vault` [M-L]

- `deep-link.service.ts:333`: `vaultPath = vaultStore.path` at execution time. The action's own vault (`action.vault`, resolved at `:151`) is not compared.
- Step 8 (`app-lifecycle.service.ts:502-505`) sits after `await ensureTemplatesFolder()` (`:382`) with no `initVersion !== version` check at the call. Scenario: URL for B (slot set, switch to B), init(B) is suspended at `:382`, user opens C, init(C) starts. When init(B) resumes it consumes the slot and writes the B action into C.
- Not verified at runtime.

### L7. Cold-start URL may be executed twice on macOS, doubling append content [M, INFER]

- `registerDeepLinkListener` subscribes to `onOpenUrl` (`deep-link.service.ts:87`) and separately calls `getCurrent()` (`:99`). `enqueueDeepLinkUrl` has no deduplication (`:25-33`).
- FETCHED, `raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/deep-link/src/lib.rs`: on macOS, `RunEvent::Opened` both emits `deep-link://new-url` and stores the URLs for `get_current`. The file's docs recommend deduplicating on macOS.
- If the event reaches the JS listener after it registers (`onOpenUrl` resolves asynchronously, `:87-96`), the same URL is enqueued twice. For `append=true` or `prepend=true` content is written twice. For `capture` a second note is created.
- Not verified at runtime. The race is INFER from the Rust code order.

### L8. Clipboard dedupe anchor advances before the capture is written; a dropped capture cannot be retried [H]

- `quick_capture/commands.rs:85-95`: `*last_signature = signature` is set when the payload is built, before emit (`:246-249`) and before the frontend handles it.
- Frontend drops the capture without writing in two cases: no vault open (`quick-capture.service.ts:85-91`, toast "Open a vault before capturing", return) and any executeAction failure (`deep-link.service.ts:203-206`, toast only).
- Scenario: user copies a paragraph while no vault is open, presses `Ctrl+Alt+Cmd+C` (captured, dropped). The user opens a vault and presses it again with the same clipboard. Rust returns an empty batch (`commands.rs:86-88`) and nothing is written. The paragraph is lost, and only the clipboard content is the source.
- Same for a failed write (disk full, or fs scope denial, `W6`).

### L9. Composer text is discarded if the main window does not persist it [H]

- `commands.rs:349-365`: `submit_composer_capture` emits with no acknowledgment. The composer's `submit` (`src/routes/composer/+page.svelte:40-46`) sets `saved = true` on IPC success, then always calls `dismiss` (end of submit), and `resetForShow` clears `text` (`:resetForShow`).
- If the main window listener drops the payload (no vault, `quick-capture.service.ts:87-91`, or write failure), the text is gone. The composer already dismissed and the flash said saved.
- Scenario: user writes a composer note with no vault open. "Saved" flashes, the popover closes, the note never exists.

### L10. Multi-file clipboard batch: partial failure drops earlier items and leaves the anchor set [L-M]

- `commands.rs:80-91`: `materialize_input(input)?` (`:90`) returns early from `capture_clipboard_now_with`. `out` (already filled) is discarded, but `*last_signature = signature` was set for items already pushed (`:94`).
- Scenario: three files, third temp write fails (`:140`). Nothing is emitted. Retrying with the same clipboard: the last item's signature matches the anchor and is skipped, the first two re-emit. Net effect: one item lost per retry cycle. Low frequency.

### L11. Todoist sent-task history is erased by a failed or interrupted read followed by a write [M]

- `todoist.service.ts:103-118`: `loadSentTasks` catches every error (read failure, JSON parse failure) and returns `[]` (`:114-117`).
- `todoist.service.ts:238-244` `initTodoist` stores that `[]` (`:241-242`). `saveSentTasks` writes `todoistStore.sentTasks` (`:224`, `:281`) with no guard. The file is then replaced by the store contents (only new entries), and the write is in place (FETCHED: truncate, no atomic rename), so a crash mid-write leaves a truncated file.
- Consequence: sent-task records (which note line was sent, its Todoist id and URL, `:215-221`) disappear. `isSent` (`todoist.store.svelte.ts:49-51`) then returns false and the same task can be sent again.
- Race: `initTodoist` is called from `onMount` without await (`TasksView.svelte:73`). A send issued before the async load resolves writes only the new entry (`:224`) over the full file.

### L12. Todoist save after vault switch writes the old vault's list into the new vault [L-M]

- `sendTaskToTodoist` awaits the network (`todoist.service.ts:213`), then `addSentTask` (`:223`) and `saveSentTasks` (`:224`). `sentTasksPath()` is evaluated at save time (`:96`, `:129`), not at send time.
- If the vault switches during the network await, the store (cleared by `todoistStore.reset()` at `app-lifecycle.service.ts:644` during teardown) and the path (new vault) disagree. The write may land a near-empty or old-vault list into the new vault's `.kokobrain/todoist-sent.json`.
- Low probability. Narrow timing window.

### L13. renameType: partial propagation and lost keystrokes in the tab loop [M-L]

- `type-definitions.service.ts:209`: `renameItem` runs first and throws on failure (`fs.service.ts:205-206` throws `targetExistsError`). That path is safe (`:210-212`).
- After that, the tab loop (`:215-225`) writes each matching tab (`:218`) and syncs (`:220`). A throw at any step goes to the catch (`:227-231`): toast "Type renamed, but updating member notes failed", return. The definition is already renamed. Remaining open tabs are not rewritten on disk, and the Rust propagation (`:226`) does not run. The toast is accurate.
- Keystrokes typed between `rewriteTypeInFrontmatter(tab.content)` (`:216`) and the sync at `:220` are overwritten, because `updateTabContentByPath` replaces content (`editor.store.svelte.ts:130-136`). Window is the `writeTextFile` IPC round trip.

### L14. `.view` read-modify-write races and toolbar-stale writes [M-L]

- Unserialized: `updateViewQuery` (`type-definitions.service.ts:305-311`) and `updateViewIcon` (`:284-292`) read, transform, write, with no lock. `persistViewState` fires one `updateViewQuery` per toolbar change (`RailNoteList.svelte:197-206`). Two overlapping calls on the same file: the second write drops the first change. The toolbar keeps both locally (`:197-206`) and then reloads from the file (`loadView`, `:185-195`), so the lost change disappears from the UI too.
- Stale-seeded writes: `updateViewQuery` writes all filter and sort fields from toolbar state (`buildViewYamlUpdates`, `RailNoteList.svelte:201`). That state is seeded from the cached parse (`getCachedViewDefinition`, `RailNoteList.svelte:159`). Nothing invalidates the cache on an external `.view` edit (only path changes and teardown, `boot.ts:41-44`, `app-lifecycle.service.ts:621`). A recount (`view-lens.service.ts:22`) refreshes it, but only when it runs. So an external filter edit can be reverted by the next toolbar change (INFER: needs external edit plus no recount between).
- `updateViewIcon` does not refresh the cache (`type-definitions.service.ts:290-291`). Stale hash until next refresh. Not data loss.

### L15. Capture template errors swallowed, raw body written silently [L]

- `deep-link-actions.ts:157-159`: catch-all includes `processTemplate` errors (`:155`), not only the missing-template case the comment names. The note is written without the template and without a toast. Not data loss, but silent divergence from configuration.

### L16. Clipboard screenshots exist only in `$TMPDIR` [M, known by design]

- `commands.rs:123-142`: clipboard image bytes are written to `std::env::temp_dir()` and never copied into the vault. The capture links to that path (`deep-link-actions.ts:131-160`, body via `renderCaptureBody`, `deep-link.logic.ts:272-274`).
- The code documents the limitation: `deep-link-actions.ts:93-101` ("The note breaks if the user later moves or deletes the referenced file; durable attachments are a future change"). Screenshot bytes have no other copy, so temp purge makes them unrecoverable. macOS purge behaviour for `$TMPDIR` is INFER, not verified.
- Temp files are never removed (`commands.rs:139-142`; only the test removes one, `:432`).

### L17. Capture filename collision across queues [L]

- `resolveUniqueCapturePath` (`deep-link-actions.ts:76-88`) is exists-then-write. Its comment (`:71-74`) relies on the quick-capture queue, which URL captures bypass (see section 3.1). Default `filenameFormat` includes milliseconds (`settings.store.svelte.ts:35`, `[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS`), so a collision needs two writes in the same millisecond. Low, but the comment is wrong about the serialization.

### L18. Same-vault URL runs against a vault that is still initializing [L, INFER]

- `resolveAndDispatch` checks only `vaultStore.path === resolvedPath` (`deep-link.service.ts:158`). `vaultStore.open` sets the path before `initializeVault` finishes (`vault.service.ts:21`, `app-lifecycle.service.ts:191` onward). A URL in that window runs `executeAction` (including writes) before indexes and the editor are ready. Not verified.

### L19. Known: vault switch proceeds after a failed dirty-tab save [known, issue 34]

- `vault.service.ts:19-21` ignores the array returned by `saveAllDirtyTabs` (failed paths). The switch continues, teardown resets the editor, and the dirty content of the failed tab is discarded. Issue 34 (`.scratch/architecture-stability/issues/34-save-dirty-tabs-before-vault-switch.md:35`, status resolved) records that "whether to block the switch instead is the owner's call". Deep links trigger this switch without a prompt, so an external URL can cause the discard.

---

## 5. Known issues cross-check

Checked `.scratch/architecture-stability/issues/*.md` by keyword (deep-link, todoist, rename, view-parse, silent, capture, overwrite, dirty):

- **34** (save dirty tabs before vault switch): resolved. `switchVault` now awaits `saveAllDirtyTabs` (`vault.service.ts:19`). Its deep-link entry point is covered. Open question: switch still proceeds on save failure (L19). Known.
- **54** (view-parse-cache stale insert after rename): resolved. Epoch guard in `view-parse-cache.ts:19,43-47`. Known, fixed.
- **63** (view-parse-cache out-of-order insert): resolved. Per-path sequence in `view-parse-cache.ts:27-34,47`. Known, fixed.
- **67** (E2E specs for deep links, copy-block-link, collection): marked resolved. I did not verify whether `e2e/specs/deep-link.spec.ts` exists. Relevant because no E2E test covers the write branches in section 1.4.
- Not matched by keyword: no issue covers silent-create overwrite (L1), the dirty-buffer sync loss (L2, L2b), the pending-slot overwrite (L5), the clipboard dedupe on failure (L8), composer loss (L9), Todoist history erasure (L11), or the `.view` cache and toolbar races (L14). These are new as far as the issue list goes.

---

## 6. Read vs inferred (summary)

- READ: all code paths and line numbers above, including `deep-link.service.ts`, `deep-link-actions.ts`, `deep-link.logic.ts`, `deep-link.store.svelte.ts`, `utils/path.ts`, `editor.service.ts`, `editor.store.svelte.ts`, `editor.hooks.ts`, `note-creator.service.ts`, `periodic-notes.service.ts`, `quick-capture.service.ts`, `todoist.service.ts`, `todoist.store.svelte.ts`, `type-definitions.service.ts`, `type-definitions.logic.ts` (`rewriteTypeInFrontmatter`), `view-parse-cache.ts`, `view-lens.service.ts`, `RailNoteList.svelte` (relevant range), `boot.ts`, `vault.service.ts`, `app-lifecycle.service.ts` (step 8 and `:382`, `:621`, `:641-644`), `quick_capture/*.rs`, `capabilities/default.json`, and the deep-link tests (grep and targeted reads).
- FETCHED: `plugins/fs/src/commands.rs` (write_text_file in place, truncate by default, no rename); `plugins/deep-link/src/lib.rs` (macOS: event and `get_current` both populated from `RunEvent::Opened`).
- INFER: whether the cold-start double delivery actually occurs at runtime (L7); the `setPendingAction` overwrite timing (L5); whether the vault roots are always under `kokobrain-vaults` (L4 impact); temp purge (L16); the `.view` external-edit revert (L14).
- Not read by me, cited from sibling scouts: `write_atomic` internals and `create_note` (`scout-rust-write-cmds.md`, `scout-rust-fs-utils.md`), path-change owner (`scout-path-change.md`), watcher TS (`scout-watcher-ts.md`).

## 7. Not checked (risk to the user)

- No runtime test or repro. All leads are code-level hypotheses. L1 and L2 are the most likely to reproduce; each needs one manual check.
- Did not verify whether the Tauri deep-link JS plugin's `onOpenUrl` delivers the cold-start URL after registration in the app's real launch sequence (L7).
- Did not verify the Rust `create_note` and `write_atomic` behaviour beyond sibling scouts.
- Did not verify the e2e deep-link spec (issue 67) or the mock's `exists` default in `deep-link.service.test.ts`.
- Did not check `openSearch` (`features/search/open-search.service.ts`) or `renderCaptureBody` escaping of `originalName`/`title` in markdown (a `]` or newline in a URL-supplied label could break the link syntax; not a data-loss lead, not checked).
