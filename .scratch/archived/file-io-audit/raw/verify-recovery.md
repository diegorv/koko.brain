# Adversarial verification: recovery (review-recovery.md)

Read-only. Nothing was built or run. HEAD e9065422. READ = seen in code this session. FETCHED = third-party source fetched this session. INFER = reasoning, not executed.

FETCHED: `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs`.
- `write_file` / `write_text_file` open the target with `truncate: true, create: true` and call `write_all` on that handle. There is no temp file and no rename, so the write is not atomic.
- `rename` is a plain `std::fs::rename`.
- `remove` calls `std::fs::symlink_metadata` first, so it rejects when the path is missing.

Known-issue check: I grepped `.scratch/architecture-stability/issues/*.md` for trash, snapshot, retention, `closeTabsForDeletedPath`, `toggleTask`, `restoreSnapshot` and `cleanup_history`. The only matches are IPC-typing issues (08, 10, 12) that mention command names. None of the nine findings is filed. Issue 34 (vault switch) is unrelated.

---

## recovery-1: settings load failure resets retention to 7, then cleanup purges history. CONFIRMED, data-loss

READ chain:
- `settings.service.ts:44-53`: an empty file falls back to `DEFAULT_SETTINGS`, and `saveSettings` writes the defaults back at `:49`.
- `:54`: `JSON.parse` of a truncated or hand-broken file throws. The catch at `:166-178` falls back to defaults and writes them at `:172`. The only signal is `error()` (console, Sentry, log). There is no toast.
- `settings.store.svelte.ts:96`: the default is `retentionDays: 7`. Neither `settings.logic.ts` nor the settings UI keeps a backup of the old file (grep for `.bak`/backup: none).
- `app-lifecycle.service.ts:198` runs `loadSettings`. `:273-277` then calls `cleanup_history({ retentionDays })` using the value that was just reset.
- `history.rs:137-157`: the cutoff is `now - days`. Everything older than `cutoff - 30d` is deleted (`history_repo.rs:84-89`, `DELETE ... WHERE created_at < ?1`), and the band in between is thinned (`:93-110`).
- The trigger exists: `writeSettingsFile` uses the non-atomic `writeTextFile` (`settings.service.ts:193`, FETCHED), and persistence rewrites the file on every settings mutation (`settings-persistence.svelte.ts:53-62`). A hand edit with a trailing comma triggers it deterministically.

Attempts to refute:
- No guard checks "the load failed" before the cleanup runs.
- The `.md` snapshot backups (`file-history.service.ts:120-148`) are not touched by `cleanup_history`, but they default to off, and the reset also turns them off.
- Only users who raised retention above 7 lose anything extra.

Repro: set retention to 365 and keep snapshots older than 40 days. Quit, put `{` into `.kokobrain/settings.json`, relaunch, then open File History on an old note. The old rows are gone. Failing test idea: in an `initializeVault` test with a throwing `readTextFile`, assert that `cleanup_history` is not called with the default.

Fix hint: on a load failure, keep the bad file (rename it to `settings.json.corrupt`), skip `cleanup_history` for that session and show a toast. Or write settings via temp+rename.

## recovery-2: failed or invalid manifest load becomes [], later trash writes orphan items, Empty Trash destroys them under an undercount. CONFIRMED, data-loss (low likelihood)

READ:
- `trash.service.ts:37-39`: a read failure gives `setItems([])`.
- `trash.logic.ts:58-66`: invalid JSON or a non-array parses to `[]` silently.
- The writers rebuild the manifest from the store: `:79` `[item, ...trashStore.items]`, `:137-139`, `:191`. `saveManifest` uses `writeTextFile` (`:269-276`, non-atomic per FETCHED).
- `moveToTrash` swallows a manifest write error (`:78-82`).
- `TrashSection.svelte:73-77` shows Empty Trash once one item is listed. `:50` counts `trashStore.count`, but `emptyTrash` removes the whole `items/` directory (`trash.service.ts:207-210`).

Refutation attempts:
- Nothing ever scans `items/` to reconcile the manifest.
- The orphans survive on disk until Empty Trash, so the loss happens only at that click. The data can be recovered through Finder until then.

Sub-claim, the stale `TrashSection.onMount` reload (`:17-21`): the path exists. A `loadTrash` that reads disk before a `moveToTrash` writes, and calls `setItems` after `addItem` (`:83`), drops the new item. This sub-claim is only PLAUSIBLE: the Settings panel has to be mounting while a trash op runs, and I could not pin down a UI path that does both.

Repro: put 3 items in the trash, truncate `trash-manifest.json` to `[`, relaunch, trash one note, click Empty Trash ("all 1 item"). All 4 directories are gone. Test idea: with a real store, mock fs where the manifest read returns `"["`, run `moveToTrash`, then assert on the written manifest or that `emptyTrash` refuses.

Fix hint: when the parse fails, keep the bad file and rebuild the manifest from `items/*/`. Empty Trash should delete only the ids it lists.

## recovery-3: File History restore writes into the active tab, not the dialog's file. CONFIRMED, corruption

READ:
- `file-history.service.ts:86-87` reads `filePath` only for a null check.
- `:90-95` dispatches into `editorStore.editorView`. The only setter is `MarkdownEditor.svelte:132`, so it is the single active-tab view.
- `:99` calls `saveCurrentFile`, which saves `editorStore.activeTab` (`editor.service.ts:151-155`).
- Nothing compares `filePath` to `activeTabPath`.

Can the active tab change while the dialog is open?
- `registerKeybinding` adds a plain `document` keydown listener (`utils/keybindings.ts:30-49`). Bindings exist for Cmd+W (`global-keybindings.ts:81-85`, `closeActiveTab`), Cmd+Shift+[ / ] (`:87-99`) and Cmd+Shift+H (`:166-175`).
- The dialog wrapper (`components/ui/dialog/dialog-content.svelte`) adds no key handler.
- The native menu has no Cmd+W item that would swallow the key (`src-tauri/src/lib.rs` `build_menu`: Settings, Edit, Window only).
- The reviewer's bits-ui claim (escape layer handles only Escape) I did not re-fetch. Focus inside the dialog does not stop keydown from bubbling to `document` (INFER: standard DOM).
- Closing clean tab A with Cmd+W shows no prompt (`editor.service.ts:270-277`), so B becomes active.

Variant check:
- `openFileHistory` calls `setFilePath`/`setSnapshots` but never clears `selectedSnapshot`/`diffLines` (`:22-46`). Only `reset()` clears them (`file-history.store.svelte.ts:50-60`).
- Reopening on a B that has no history keeps A's snapshot selected, and `FileHistoryDialog.svelte:98-102` still shows Restore. The confirm text (`:44-46`) does not name the file.

Limits:
- If B is a virtual tab, MarkdownEditor is unmounted, `editorView` is null and the save is a no-op, so nothing is written.
- The dispatch has no `addToHistory(false)`, so Cmd+Z works in the same session.

Repro: open A and B, focus A, press Cmd+Shift+H, press Cmd+Shift+] (B becomes active), click Restore and confirm. B's file now holds A's old text. Test idea: open history for A, then `setActiveIndex(B)`, call `restoreSnapshot`, and assert that B's content is unchanged or that the call refuses.

Fix hint: in `restoreSnapshot`, refuse or switch when `filePath !== editorStore.activeTabPath`, or write via `saveFileByPath(filePath)` on that tab. Clear the selection in `openFileHistory`.

## recovery-4: generic delete closes dirty tabs without saving, before the disk op and with no restore. CONFIRMED, data-loss

READ:
- `path-change.service.ts:125` runs `closeTabsForDeletedPath(from)` before `await diskOp()` (`:127`), with no try/finally. The comment at `:96-97` says this ordering is deliberate.
- `editor.service.ts:356-366` has no dirty check and no save. Once the tab is gone, `saveDirtyTabs` (`:183-194`) cannot see it.
- `fs.service.ts:167-190` `deleteItem` does not save first. Its callers (`note-action-bar.service.ts:19-28`, `NoteRowMenu.svelte:121-129`, `FilesNavigator.svelte:168-175`) only `ask` and then call `deleteItem`.
- The only caller that saves first is `event-calendar.service.ts:1035-1037`. Its comment names exactly this bug.

Refutation attempts:
- The native `ask` is async, so JS timers keep running and the 2 s debounce can fire while the dialog is up (INFER). That closes the success window unless the user confirms in under 2 s after the last keystroke, for example typing and then using the action-bar delete with Enter.
- Two cases are not timing-bound:
  - (a) Autosave keeps failing (`:191-192`, a 5 s retry). The tab stays dirty indefinitely, and the delete drops it.
  - (b) `moveToTrash` throws at the rename (`trash.service.ts:71`, rethrown at `:95`). The tab was already closed at `:125` and is never reopened, so the edits are lost even though the delete failed.

Repro (b): make the note's parent read-only (or deny the scope), type in it, and delete it from the note list. You get an error toast, the tab is gone and the edits are not on disk. Test idea: mark a tab dirty, make `moveToTrash` reject, call `deleteItem`, and assert the tab is still open or its content was written.

Fix hint: in `deleteItem` (or `applyPathChange` when `to === null`), `saveFileByPath` every matching dirty tab first and abort on failure, as the calendar does. Close the tabs only after `diskOp` resolves, and cancel the debounce instead.

## recovery-5: snapshots are post-save only and retention deletes a note's last snapshot. CONFIRMED, data-loss (design gap)

READ:
- `save_snapshot` has one TS caller, `file-history.service.ts:117`, reached only from the after-save observer (`:190-196`). That observer fires from `saveFileByPath` after the write (`editor.service.ts:168-170`), and `save_snapshot` stores the content it is given (`history.rs:57-78`). Nothing snapshots the pre-write disk bytes.
- `delete_old_snapshots` is a plain age delete (`history_repo.rs:84-89`) that does not keep each file's latest row.
- Cleanup runs on every vault open (`app-lifecycle.service.ts:273-277`).

Refutation attempts:
- There is no "snapshot on open" and no "snapshot before first save" anywhere (grep for `save_snapshot`).
- In-session CM undo still works until the tab closes.

Repro: with retention at 7, open a note last saved in-app more than 37 days ago (or never), select all, paste, and wait 2 s. History shows only the new text. Test idea: a Rust test that inserts one snapshot older than the cutoff, runs `cleanup_history(7)`, and asserts the file keeps one row. The current code deletes it.

Fix hint: keep each file's latest row in `delete_old_snapshots` (`AND id NOT IN (SELECT MAX(id) ... GROUP BY file_path)`), and snapshot the disk bytes before the first in-app overwrite of a file with no rows.

## recovery-6: task toggle, daily append and deep-link append/prepend/overwrite replace a dirty buffer. CONFIRMED, data-loss (needs a dirty tab)

READ, task toggle:
- `vault.rs:669` reads the file from disk, and `:683` writes the result atomically.
- `tasks.service.ts:114` calls `syncExternalContentToEditor(path, updated, true, 'none')`, which sets `content` and `savedContent` (`editor.store.svelte.ts:130-136`), so the tab now looks clean.
- For an active tab, `MarkdownEditor.svelte:311-336` replaces the doc with `addToHistory.of(false)`. For a background tab, the tab-switch replace at `:225-233` uses the same annotation.
- The only toggle caller is `TasksView.svelte:67`.

READ, the same pattern elsewhere:
- Daily append: `deep-link-actions.ts:54-64`.
- `new` prepend/append/overwrite: `deep-link.service.ts:255-263`, `:274-282`, `:292-299`.

Refutation attempts:
- No tab-switch save exists. `switchTab` only calls `setActiveIndex` (`editor.service.ts:250-255`), and no other save trigger shows up in a grep for `saveFileByPath`/`saveAllDirtyTabs`.
- No dirty check before the sync.
- For overwrite, the user asked to replace the note, so losing the buffer is arguably intended. Append and prepend are the real loss.
- Timing: the task toggle needs the Tasks tab within 2 s of the last keystroke, or a failing autosave. An external `kokobrain://daily?append` (Shortcuts, Raycast) can arrive at any moment while the user types.

Repro: type in today's daily note, then within 2 s run `open "kokobrain://daily?vault=<v>&content=x"`. The typed text is gone. Test idea: with a dirty tab N, call `toggleTask(N, line)` and assert that N's unsaved text is kept, or that the call refuses.

Fix hint: before a disk read-modify-write, `saveFileByPath(path)` for a dirty tab, or apply the change to the tab buffer and let the normal save run.

## recovery-7: deep-link overwrite of `.kokobrain/trash/trash-manifest.json` or `settings.json`. PLAUSIBLE, security (re-graded: chain weaker than stated)

READ:
- `utils/path.ts:33-53` keeps the path inside the vault and adds `.md` only when the last segment has no dot, so `.kokobrain/trash/trash-manifest.json` passes unchanged.
- `deep-link.service.ts:292-299` writes with no confirm. Dispatch (`:150-169`, `:175-207`) has no confirm either.
- `src-tauri/capabilities/default.json:83-96` grants `fs:allow-write-text-file` on `.../.kokobrain/**`.

Refuted part of the chain: overwriting the manifest with `[]` does NOT orphan items at the next trash op in the same session. `trashStore.items` still holds them, and `moveToTrash` writes `[item, ...trashStore.items]` (`trash.service.ts:79`), which heals the manifest. Orphaning needs a reload from disk first: an app restart, or opening Settings > Trash (`TrashSection.svelte:17-21`). Similarly, the corrupted `settings.json` is rewritten with good settings by any in-session settings mutation (`settings-persistence.svelte.ts:53-62`), so it reaches recovery-1 only if nothing changes before quit.

Also not pinned down:
- The vault name must be guessed (`:137-143`).
- OS or browser prompts for the scheme are unknown.
- Without `silent`, the JSON file opens in a tab, which tips the user off.
- The same deep-link `overwrite` can already wipe any note directly, so the extra harm is limited.

Repro: `open "kokobrain://new?vault=<v>&file=.kokobrain/trash/trash-manifest.json&overwrite=true&silent=true&content=%5B%5D"`, restart, and the Trash shows empty. Test idea: assert that `executeNewAction` rejects any path segment that starts with `.`.

Fix hint: reject deep-link targets under dot-directories, or that are not Markdown, in `resolveFilePath` callers. Require a confirm for `overwrite`.

## recovery-8: history keyed by path, lost on rename, move, auto-move or suffixed restore. CONFIRMED, stale-state

READ:
- The key is `getRelativePath` (`file-history.logic.ts:108-117`), used at `file-history.service.ts:27` and `:115`.
- A grep for `UPDATE snapshots` over `src-tauri/src` returns nothing. `applyPathChange` (`path-change.service.ts:117-171`) has no history leg, and `rename_note` has no history or snapshot reference.
- The Trash suffix logic is at `trash.service.ts:116-118` and `:283-291`.
- `help/documentation/22-auto-move.md:177` ("Use the Trash or File History ... to recover a mistakenly moved file") and the "Next Steps" link in the same file.
- There is no vault-wide history browser. The dialog opens only for the active tab path (`commands.ts:308-310`, `global-keybindings.ts:173-174`).

Small overstatement: A's rows can still be reached by creating a new note at A's old path, since keys are path-based. The same mechanism causes the "inherits another note's history" half, which is confirmed.

Repro: save a note A twice, rename it to B, and open File History on B: it is empty. Create a new A: it shows the old rows. Test idea: in a path-change test, assert the history rows follow `from` to `to`.

Fix hint: add a path-change consumer that calls a Rust `rename_history(from, to)` (prefix-aware for folders) and clears rows on a delete-then-create.

## recovery-9: phantom trash entries cannot be deleted or restored. CONFIRMED, minor

READ:
- `deletePermanently` calls `remove(itemDir)` first (`trash.service.ts:187-188`). The plugin rejects a missing path (FETCHED: `symlink_metadata`), so it throws before `saveManifest` (`:191`) and the entry stays.
- `restoreItem`'s `rename` (`:126`) rejects too.
- Phantoms come from:
  - A crash between `:126` and `:139`.
  - A swallowed manifest write at `:140-142`. The store drops the item, but the disk manifest keeps it, so it is a phantom at the next launch.
  - `emptyTrash` failing at `:213` after `:209`.
  - A user deleting `items/<uuid>` in Finder.

The only way out is Empty Trash (`:205-222`), which takes every real item with it.

Repro: trash a note, delete `.kokobrain/trash/items/<uuid>` in Finder, relaunch, then click Delete. You get an error toast every time. Test idea: make `remove` reject with ENOENT and assert that `deletePermanently` still drops the entry.

Fix hint: in `deletePermanently`/`restoreItem`, treat a missing item directory as already gone, then drop the manifest entry.

---

## Not verified
- Nothing was run.
- I did not re-fetch bits-ui (recovery-3). The verdict rests on DOM bubbling and on the absence of any app-side key guard.
- Whether the native `ask` lets the 2 s debounce fire (recovery-4 success window).
- OS and browser prompting for `kokobrain://` (recovery-7).
