# Senior review: recovery (trash, file history, retention)

Read-only. Nothing was built or run. HEAD e9065422. Labels: READ = seen in code this session; FETCHED = third-party source fetched; INFER = reasoning, not executed.

Fetched:
- bits-ui `packages/bits-ui/src/lib/bits/utilities/escape-layer/use-escape-layer.svelte.ts` (main branch, not the pinned version): the dialog's document keydown listener returns early for every key except Escape and never calls `stopPropagation`. So the app's document-level keybindings still fire while a Dialog is open.
- Plugin-fs facts (writeTextFile truncates then writes, no temp+rename; rename replaces a non-dir target; remove of a missing path rejects) are taken from the trash and history scouts' fetches of `tauri-apps/plugins-workspace` v2 and not re-fetched.

Known-issue check: `.scratch/architecture-stability/issues/*.md` has no issue for any finding below. Issue 34 (dirty tabs before vault switch) is fixed and not re-raised. Sibling scouts in `.scratch/file-io-audit/raw/` reached parts of F4, F6, F7 independently. That is noted per finding.

---

## Findings (ranked)

### F1. A settings load failure resets retention to 7 days, and the same vault open then permanently purges File History [data-loss, high confidence on mechanism]

READ chain:
1. `loadSettings` falls back to `DEFAULT_SETTINGS` when settings.json is empty (`src/lib/core/settings/settings.service.ts:44-53`) or when the read or `JSON.parse` throws (`:166-178`). It then writes the defaults back to disk (`:49`, `:172`), so the user's value is lost for every later open as well.
2. Default `history.retentionDays` is 7 (`src/lib/core/settings/settings.store.svelte.ts:96`). `normalizeSettings` does not touch it (vault-settings scout, `settings.logic.ts`).
3. `initializeVault` loads settings at step 1 (`src/lib/app/lifecycle/app-lifecycle.service.ts:198`). At step 2 it reads `settingsStore.history.retentionDays` and fires `cleanup_history` (`:273-277`).
4. `cleanup_history` deletes every row older than `retention + 30` days and thins the band in between to one row per file per day (`src-tauri/src/commands/history.rs:143-157`; `src-tauri/src/db/history_repo.rs:82-89`, `:93-109`). The rows are gone in one transaction. No backup is kept.

Trigger: settings.json is rewritten through `writeTextFile` (`settings.service.ts:193`, truncate then write, not atomic). The debounced persistence (`settings-persistence.svelte.ts:59`) writes it on every settings mutation, including layout changes. A crash, a forced quit or a full disk mid-write leaves it empty or partial. A sync-client conflict copy or a hand edit with a trailing comma does the same.

User scenario: retention set to 365 days. settings.json is truncated. On the next launch the app silently runs on defaults, and every snapshot older than 37 days is deleted. Days 8 to 37 are thinned to one per day. No toast is shown (the catch only logs, `:167`).

Known: the vault-settings scout's L1 found the defaults reset, but not that it purges history. Not filed.

### F2. A failed or invalid trash manifest load becomes an empty list, and the next trash write orphans every earlier item. Empty Trash then destroys them, and its confirm text undercounts [data-loss, high confidence on mechanism, low-medium likelihood]

READ:
- `loadTrash` catches any read error and calls `setItems([])` (`src/lib/core/trash/trash.service.ts:37-39`). `parseTrashManifest` returns `[]` on invalid JSON without logging (`trash.logic.ts:58-66`). The store keeps no "load failed" flag, and the writers never check one.
- The next `moveToTrash` writes `[item, ...trashStore.items]` (`trash.service.ts:79`). Restore and permanent delete also write from the store (`:137-139`, `:191`). The same applies to `saveManifest`, which goes through `writeTextFile` (`:269-276`). The manifest on disk now lists only the new item. Every earlier `items/<uuid>/` directory is still on disk but has no manifest entry. It does not appear in the UI and cannot be restored there.
- The Empty Trash button shows as soon as one listed item exists (`TrashSection.svelte:73-77`). Its confirm text says "all 1 item" (`:50`), but `emptyTrash` removes the whole `items/` directory (`trash.service.ts:207-210`), orphans included.
- Trigger, via the same non-atomic write: a crash during `saveManifest` leaves the manifest empty or partial, and the next launch parses it as `[]`. `moveToTrash` also swallows a manifest write failure and still returns true (`:78-82`).

Scenario: the trash holds 5 notes, and the manifest gets truncated (crash mid-write or a sync conflict). On the next launch the Trash looks empty. The user trashes note X and the manifest becomes `[X]`. Later the user clicks Empty Trash, which says 1 item, and all 6 notes are destroyed. Until then the 5 notes can be found only through Finder under `.kokobrain/trash/items/`.

Related, same root (store treated as truth): `TrashSection.onMount` calls a second `loadTrash` with no version guard (`TrashSection.svelte:17-21`). If that load started before a move and resolves after it, `setItems` writes the older list (`trash.service.ts:35`). The just-trashed item drops out of the store, and the next write orphans it. This one does not self-heal. INFER: it needs Settings > Trash to be opened while a trash op is in flight, so it is low likelihood. By contrast, overlapping move/restore lost updates (scout L5) do self-heal: both ops update the store, so the next manifest write in the same session puts back the entry that was lost (`:83`, `:143`).

Known: the trash scout's L1/L2/L11. Not filed.

### F3. File History restore writes the snapshot into the ACTIVE tab, which can be a different note than the one the dialog shows [corruption, high confidence on code path, low-medium likelihood]

READ:
- `restoreSnapshot` reads `fileHistoryStore.filePath` only to check that it is not null (`src/lib/features/file-history/file-history.service.ts:86-87`). It then replaces the doc of `editorStore.editorView`, the single shared view of the active tab (`:90-95`; `MarkdownEditor.svelte:132`), and calls `saveCurrentFile()`, which saves `editorStore.activeTab` (`:99`; `editor.service.ts:151-155`). The dialog's file and the active tab are never compared.
- Tab keys still work while the dialog is open. `registerKeybinding` listens on `document` (`src/lib/utils/keybindings.ts:30-49`). Cmd+W close, Cmd+Shift+[ / ] switch (`src/lib/app/global-keybindings.ts:81-99`) and Cmd+O are all bound there, and bits-ui's escape layer does not stop non-Escape keys (FETCHED).
- Variant that needs no race: with the dialog open on A, switch to B and press Cmd+Shift+H again. `openFileHistory(B)` sets filePath to B but does not clear `selectedSnapshot` or `diffLines` (`file-history.service.ts:22-24`; the store only clears in `reset`, `file-history.store.svelte.ts:50-60`). If B has no snapshots, `selectSnapshot` never runs (`:44-46`), so A's selected snapshot and A's diff stay on screen under the title "File History: B". The Restore button stays visible (`FileHistoryDialog.svelte:98-102`).

Scenario: open history for A. Press Cmd+W out of habit to close the dialog; it closes the clean tab A instead, and B becomes active. Click "Restore This Version" and confirm. The confirm text does not name the file (`FileHistoryDialog.svelte:44-46`). A's old text replaces B's buffer and is saved to B's path.

Recovery: B's last in-app saved version is still in B's history. Cmd+Z works in the same session, because this dispatch has no `addToHistory(false)`. B's unsaved text and any B version never saved in-app are lost.

Known: history scout H1/H6. Not filed.

### F4. The generic delete closes tabs without saving before the disk op and never restores them, so unsaved text is lost on success and on failure [data-loss, high confidence on mechanism, low-medium likelihood]

READ:
- `applyPathChange` calls `closeTabsForDeletedPath(from)` before `await diskOp()` (`src/lib/core/filesystem/path-change.service.ts:125-127`). There is no try/finally.
- `closeTabsForDeletedPath` removes matching tabs, children of a deleted folder included, with no dirty check (`src/lib/core/editor/editor.service.ts:356-366`). The closed tab is then skipped by `saveDirtyTabs` (`:184-186`).
- None of the generic callers saves first: `FilesNavigator.svelte:174` (folder), `NoteRowMenu.svelte:128`, `note-action-bar.service.ts:24`. The event calendar does save first, and its comment says why (`event-calendar.service.ts:1035-1037`).

Scenarios:
- (a) Autosave for note N is failing, for example on a full disk. The tab stays dirty and retries every 5 s (`editor.service.ts:191-192`). The user moves N, or its folder, to the Trash. The trash keeps the last bytes on disk, and every unsaved edit is gone.
- (b) `moveToTrash` fails at the rename (permission error, EXDEV, scope denial). The user gets "Could not move ...", but the dirty tab is already gone, and the note on disk does not have the edits.
- (c) Success path within the 2 s body debounce. INFER: the native `ask` dialog probably lets the debounce timer fire, so the window is small. Not verified.

Known: the trash scout's L3. path-change, tabs-buffers and editor-save scouts mention `closeTabsForDeletedPath`. Not filed.

### F5. Snapshots only ever hold content after a save, and retention deletes a note's last snapshot, so the first overwrite of any note not saved in-app in the last retention+30 days cannot be recovered [data-loss, high confidence, medium likelihood; a design gap, documented only in part]

READ:
- The only snapshot source is the after-save observer. It records the content just written (`editor.service.ts:168-170`; `file-history.service.ts:111-117`, `:190-196`). `save_snapshot` has no caller in TS other than `file-history.service.ts:117`. Nothing snapshots before a write.
- `delete_old_snapshots` deletes by age alone and does not keep each file's latest row (`history_repo.rs:82-89`). With the default 7 days, a note not saved in-app for 37 days has an empty history after the next vault open (`app-lifecycle.service.ts:273-277`).
- Writers that do not snapshot at all: `toggle_task_status` (`src-tauri/src/commands/vault.rs:683`), the link rewrite (`link-updater.service.ts:39`), the type-rename tab rewrite and Rust propagation (`type-definitions.service.ts:218-226`; `vault.rs:370`), and any external edit.

Scenario: open a note last edited two months ago, or a note imported from Obsidian and never saved in Kokobrain. Select all and paste over it by mistake, then switch tabs. Autosave writes after 2 s. File History lists only the pasted version, and the original exists nowhere. CM undo can bring it back only while the tab stays open: closing the tab calls `deleteTabViewState` (`editor.service.ts:286`).

The help page says snapshots let you "restore a previous one" (`help/documentation/15-file-history.md:11`) and that old snapshots are deleted (`:52`). It does not say that a stale note has no restorable prior version.

Known: history scout H4 (writers without snapshots). The retention part is new. Not filed.

### F6. Task toggle, daily append and deep-link append/prepend/overwrite replace a dirty buffer with disk-based text, outside both CM undo and history [data-loss, high confidence on code path, low-medium likelihood]

READ:
- `toggleTask`: Rust reads the file from disk (`vault.rs:669`) and writes it (`:683`). TS then calls `syncExternalContentToEditor(path, updated, true, 'none')` (`tasks.service.ts:114`), which sets both `content` and `savedContent` (`editor.store.svelte.ts:130-136`). The editor applies it with `Transaction.addToHistory.of(false)` (`MarkdownEditor.svelte:328-333`), so CM undo cannot reach it.
- Same pattern: `deep-link-actions.ts:54-64` (daily append: read disk, write, sync with markSaved) and `deep-link.service.ts:255-262`, `:274-281`, `:296-298`. In those three, the snapshot that follows (`notifyAfterSave`) records only the new disk text, without the lost keystrokes.
- Contrast, safe: the link updater builds from the dirty buffer (`link-updater.service.ts:33-35`), and the frontmatter writer from the tab content (`frontmatter-write.service.ts:112-128`).

Scenario: type into the daily note. Before the 2 s autosave, or while autosave keeps failing, a global-hotkey capture appends to the daily note, or the user ticks a task of that note in the Tasks tab. The typed text is gone from the tab, the disk, undo and history.

Known: editor-save scout (`scout-editor-save.md:151-152`), deep-link scout L2, history scout H2. Not filed.

### F7. A deep-link `overwrite` can rewrite `.kokobrain/trash/trash-manifest.json` or `.kokobrain/settings.json`, which leads into F2 and F1 with no confirmation [security, then data-loss; medium confidence]

READ:
- `resolveFilePath` keeps the path inside the vault, but it adds `.md` only when the last segment has no dot (`src/lib/utils/path.ts:33-53`). So `.kokobrain/trash/trash-manifest.json` passes through unchanged.
- The overwrite branch writes it unconditionally (`deep-link.service.ts:292-299`), with no in-app confirm (`:150-169`, `:177-208`).
- The fs write scope explicitly allows `<vault>/.kokobrain/**` under the kokobrain-vaults roots (`src-tauri/capabilities/default.json:72`, `:78`).
- INFER: `kokobrain://new?vault=<name>&file=.kokobrain/trash/trash-manifest.json&overwrite=true&content=[]` makes the trash manifest empty, and the next trash write orphans every item (F2). With `file=.kokobrain/settings.json` and invalid content, the next launch falls back to defaults and purges history (F1). The vault name comes from `recentVaults` (`deep-link.service.ts:139-145`), so it has to be guessed.
- Not verified: whether the browser or OS prompts before opening the scheme.

Known: deep-link scout L3 covers dotfile overwrite (the Todoist store example), but not the trash and history consequences. Not filed.

### F8. History is keyed by path and does not follow a rename, move, auto-move or suffixed restore, and the help tells users to recover moved files through it [stale-state, high confidence, medium likelihood]

READ:
- The key is the vault-relative path (`file-history.service.ts:27`, `:115`; `file-history.logic.ts:109-118`). No code re-keys `snapshots` (only `history_repo.rs` and `schema.rs` touch the table; history scout grep). `applyPathChange` has no history leg (`path-change.service.ts:117-171`).
- A Trash restore onto a taken path gets a `(restored)` suffix (`trash.service.ts:116-118`), so its history is unreachable.
- `help/documentation/22-auto-move.md:177` and `:188` point users to File History to recover a mis-moved file. That cannot work: the moved note opens with an empty history, and the old rows age out (F5).
- A new note created at an old path inherits the old note's rows. Restoring one of them replaces the new note with another note's text. The user has to confirm, but nothing says the rows belong to a different note.

Known: history scout H3. Not filed.

### F9. Phantom trash entries cannot be deleted or restored, only cleared by Empty Trash [minor, medium-high confidence]

READ:
- `deletePermanently` removes the item directory before writing the manifest (`trash.service.ts:187-191`), and the plugin rejects `remove` on a missing path. So an entry whose directory is gone throws on every click and stays listed.
- `restoreItem`'s rename also rejects (`:126`).
- How phantoms appear: a crash between the restore rename (`:126`) and its manifest write (`:139`), a swallowed write failure (`:140-142`), or a partial `emptyTrash` (`:209` then `:213`).
- The only way out is Empty Trash, and it destroys every real item as well (F2).

---

## Paths checked and found SAFE

- `fs.service.ts:179-181`: the permanent `remove` fallback runs only when `vaultStore.path` is falsy. `vaultStore.close()` (`vault.store.svelte.ts:89`) has no caller in `src/lib` (grep), so this cannot be reached in the app.
- `moveToTrash` removes the container only when the rename has not happened (`trash.service.ts:88-93`), so the user's only copy is never deleted.
- Restore does not overwrite a live file in the normal case: `exists` plus the `(restored N)` suffix (`trash.service.ts:113-118`, `:283-291`). Only a ms-wide check-then-rename TOCTOU remains.
- No automatic trash purge exists. No Rust code deletes notes: `remove_file` appears only for the cache (`vault.rs:1231`), temp files (`utils/fs.rs:29`, `semantic/model.rs:199`) and a test (`quick_capture/commands.rs:432`). The only other TS `remove` deletes a bookmarks metadata file after migration (`bookmark-migration.service.ts:102`).
- `create_note` refuses an existing path and writes atomically (`vault.rs:896-899`; `utils/fs.rs:14-33`). `toggle_task_status` writes atomically (`vault.rs:683`).
- The link rewrite keeps unsaved buffer text (`link-updater.service.ts:33-35`).
- The frontmatter writer keeps the unsaved body and refuses to re-create a deleted note (`frontmatter-write.service.ts:112-157`, `create: false` at `:145`).
- The calendar delete saves the tab before trashing (`event-calendar.service.ts:1037`).
- A snapshot is written only after a successful disk write and holds exactly the bytes written (`editor.service.ts:165-170`). Dedupe check and insert run under one mutex hold (`history.rs:66-77`).
- The history restore dispatch can be undone with Cmd+Z, since it has no `addToHistory(false)` (`file-history.service.ts:92-94`).
- The watcher reload skips dirty tabs (`editor.service.ts:375-380`).
- Deep-link dispatch is serialized, so append/prepend do not race each other (`deep-link.service.ts:23-33`).
- History SQL is parameterized, and the history commands do no filesystem I/O (`history_repo.rs`).

## Not verified

- Nothing was run.
- Whether the native `ask` dialog lets the 2 s autosave timer fire (affects F4c).
- Browser and OS prompts for `kokobrain://` (F7).
- bits-ui behavior at the project's pinned version; I fetched main (F3).
- Real-fs truncation under ENOSPC (F1/F2 triggers).
