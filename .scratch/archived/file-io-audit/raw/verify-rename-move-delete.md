# Verify: rename-move-delete

Adversarial pass over the nine RMD findings. Read-only: no build, no test, no app run. READ means I saw it in code at the cited line. INFER means I reasoned it from the code or from platform behavior.

Third-party source fetched: `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs`. READ there:
- `copy_file` is `std::fs::copy`, with no check on the destination.
- `rename` is `std::fs::rename`.
- `exists` returns `resolved_path.exists()`.
- `write_file_inner` defaults to `create: true` and `truncate: !append`, and writes in place with `write_all`.
- `resolve_path` checks the allow scope against a real path. It builds that path by canonicalizing, or for a path that does not exist yet, by walking up to the nearest existing ancestor and popping each `..` component. The command then runs on the unnormalized `resolved_path`.

I did not fetch notify-rs. The folder-rename event shape rests on the project's own comment (`trash.service.ts:159-162`) and on FSEvents behavior from memory. The APFS default (case-insensitive) is also from memory.

Known-issue check: `.scratch/architecture-stability/issues/*.md` and the rest of `.scratch` (this audit excluded) were grepped for closeTabsForDeletedPath, case-only, generateCopyName, replaceWikilinks, path-qualified and resolveDestination. One match is relevant: `.scratch/sidebar-fixes/work/01/discovery.md:31` records "Case-only rename on APFS ... now toasts 'already exists' ... Fixing case-only rename is out of scope", so RMD-7 is known. It is not filed as an Issue. Nothing else matched.

## rename-move-delete-1: CONFIRMED (data-loss)

READ:
- `path-change.service.ts:125` runs `if (to === null) closeTabsForDeletedPath(from);` before `await diskOp()` at :127.
- `editor.service.ts:356-366`: `closeTabsForDeletedPath` calls `removeTab` for the path and every child, with no `isTabDirty` check, no save and no prompt. Compare `closeTab` at :265-277, which does ask.
- `editor.service.ts:183-187`: the pending `saveDirtyTabs` filters `editorStore.tabs` and finds nothing to save.
- `debounce.ts` has no maxWait.
- Nothing else flushes the timer. `saveAllDirtyTabs` is called only from vault switch (`vault.service.ts:19`), app close (`app-lifecycle.service.ts:180`) and `tauri-listeners.service.ts:55`.
- The four callers of `deleteItem`: `note-action-bar.service.ts:19-28`, `NoteRowMenu.svelte:122-130` and `FilesNavigator.svelte:169-175` do not save first. Only `event-calendar.service.ts:1035-1037` saves first, and its comment states this gap.
- `trash.service.ts:71` moves only the disk bytes. On a throw (:87-96) the tabs are already closed and the note stays in the vault with its old content.

INFER: Tauri `ask()` is an awaited IPC promise, so the 2 s body timer (500 ms for frontmatter) can fire while the dialog is open. That limits the loss to edits from the last ~2 s before Enter. The failure branch loses whatever buffer was dirty at that moment.

Repro: test-first in `fs.service.test.ts`. Give a tab content different from its `savedContent`, call `deleteItem(path)` with `moveToTrash` mocked to reject, and assert that no `writeTextFile` happened and that the tab is gone. Today both hold. The fix should make the test require a save or a refusal.

Fix hint: in `applyPathChange`, call `saveFileByPath` for the path and each dirty child tab before `closeTabsForDeletedPath`, and abort the delete if a save fails, as the calendar does.

## rename-move-delete-2: CONFIRMED (data-loss, low likelihood)

READ:
- `fs.logic.ts:185`: `new Set(existingSiblingNames)` compares with exact case, and so do :203-208.
- `generateUniqueName` (:224-226) lowercases on purpose for APFS.
- `fs.service.ts:266-279`: `duplicateItem` calls `copyFile` with no `exists` check.
- Fetched source: `copy_file` is `std::fs::copy`, which truncates the destination.
- The only caller is `NoteRowMenu.svelte:68`, which duplicates files only (`false`).

INFER: on case-insensitive APFS, `note copy.md` opens the existing `Note copy.md`. The precondition is two siblings that differ only in case after the "copy" suffix, for example `Note.md` duplicated to `Note copy.md`, then `Note.md` deleted and a new `note.md` created. No guard was found.

Repro: unit test `generateCopyName('note.md', false, ['note.md', 'Note copy.md'])` returns `note copy.md`. Manually: perform the vault setup above on macOS and duplicate `note.md`. `Note copy.md` gets overwritten.

Fix hint: fold the sibling Set and the candidate with `toLowerCase()` the way `generateUniqueName` does, and pass `copyFile` a guard (exists check, or create_new).

## rename-move-delete-3: CONFIRMED (stale-state)

READ:
- `path-change.service.ts:168-170` calls `forgetNote` for the old folder path and each old child, with `vaultPath` (:85-87).
- `note-change.service.ts:197-219` then fires `remove_from_search_index` and `remove_semantic_file` per path.
- `rename_note_inner` (`vault.rs:1001-1033`) re-keys only `VaultIndex` entries.
- FTS upserts exist only in `note-change.service.ts:247-252` (the upsert branch, which needs a `vaultPath`), in the after-save observer (`search.service.ts:300-330`), and in `build_search_index`, which is called only at vault open (`app-lifecycle.service.ts:421`).
- Watcher (`watcher-handler.service.ts:33-44`): a batch with no dotted basenames is skipped. The full-rebuild branch (:68-75) touches no FTS or semantic data.
- Rust `watcher.rs` has no directory-to-children expansion (grep: no `read_dir`, `walk` or `is_dir` in the debounce path).

INFER: FSEvents reports a directory rename as the directory paths only, which `trash.service.ts:159-162` also records. If child paths did arrive, a folder with more than 10 notes would still take the full-rebuild branch, which skips FTS. Only a folder with 10 notes or fewer, under a hypothetical per-child event stream, would be repaired.

A single-file rename is fine: the watcher's incremental branch upserts the new path with `vaultPath` (:105-108), and the new path is not a recent save.

Repro: rename a folder that holds `a.md` containing the word "zebra", then search "zebra" in text mode: no hit until restart. As a test: in a `path-change` service test, rename a folder that has two children and assert that `update_search_index_file` is called for the new child keys. Today it is never called.

Fix hint: after `rename_note` succeeds for a folder, upsert FTS and semantic for each new child path (read from disk), the way `trash.service::indexRestoredNotes` does. Alternatively, add a Rust FTS re-key command.

## rename-move-delete-4: CONFIRMED (stale-state)

READ:
- `link-updater.logic.ts:27` rewrites a link only when `target.trim().toLowerCase() === oldName.toLowerCase()`, where `oldName` is the stem (:14-16).
- Rust `resolve_with_cache` (`index.rs:110-124`) falls back to `note_name_from_target` (:85-91), which strips both the folder and the extension, and `by_path` is keyed by the lowercased stem (:305-307).
- So `[[Work/Plan]]` and `[[Plan.md]]` resolve to `Plan.md`, and the source file appears in `get_backlinks_v2`. Its link is then left unchanged and dangles after the rename.
- Self-links: backlinks drop `resolved == src` (`index.rs:340-341`), and the service filters again at `link-updater.service.ts:28`.
- Unsaved buffers: the source set comes only from the Rust backlink index (:27), which the `edit` source does not update.
- Per-file failures are only logged (:56-60).

Repro: unit test `replaceWikilinks('[[Work/Plan]] [[Plan.md]]', 'Plan', 'Roadmap')` returns the input unchanged. As an E2E test: rename `Work/Plan.md` and assert that A now reads `[[Work/Roadmap]]`.

Fix hint: match a target when `note_name_from_target(target)` equals `oldName`, keep the folder prefix and extension and swap only the stem, and include the renamed note itself (self-links).

## rename-move-delete-5: PLAUSIBLE (minor; data-loss of a few keystrokes)

READ:
- `link-updater.service.ts:33-39` takes `openTab.content` (dirty) or `await readTextFile` (clean), then `await writeTextFile`.
- :47 `syncExternalContentToEditor(..., true, 'none')` calls `updateTabContentByPath` (`editor.store.svelte.ts:129-135`), which sets both `content` and `savedContent`.
- For the active tab, the signal bump makes `MarkdownEditor.svelte` (content-sync effect, about :311-336) replace the whole doc with `addToHistory(false)`.
- Keystrokes typed in X between the snapshot or read and the end of the write are overwritten in both the store and CodeMirror, and undo cannot restore them.

Not pinned: the user must be typing in X during one or two IPC round trips that start only after `get_backlinks_v2` returns, right after a rename typed in a different input. No in-app trigger was found that keeps the user typing in X through the rename. The calendar rename and the type-definition rename are programmatic and could do it, but I did not trace them.

Repro (test idea): mock `writeTextFile` to resolve on a deferred promise, change the tab content mid-flight, resolve it, and assert that the tab content keeps the mid-flight edit.

Fix hint: after the write, apply the rewrite only if `tab.content` still equals the snapshot. Otherwise re-run `replaceWikilinks` on the current content, leave the tab dirty, and skip the doc replace.

## rename-move-delete-6: PLAUSIBLE (minor)

READ:
- `path-change.service.ts:149` (`await updateLinksAfterRename`) and :153 (`await refreshTree()`) are outside any try.
- `link-updater.service.ts:27` calls `get_backlinks_v2` outside the `allSettled`.
- `loadDirectoryTree` rethrows (`fs.service.ts:96-98`).
- A rejection skips `rename_note` (:158-162) and the sweep (:168-170), and `renameItem` rethrows (`fs.service.ts:216-219`), so the caller shows a toast.

Not pinned: `get_backlinks_v2` fails only on a poisoned `VaultIndex` lock (`vault.rs:436-438`), and then every index command fails anyway. `scan_vault` failing on the vault root right after a successful rename is unlikely too. The control flow is real, but the trigger is close to "app already broken", so I regraded it from stale-state to minor.

Repro: in a test, mock `get_backlinks_v2` to reject during a rename. Assert that `rename_note` is still called and that `renameItem` resolves with the new path. Today `rename_note` is not called and `renameItem` rejects.

Fix hint: wrap the link rewrite and `refreshTree` in try/catch inside `applyPathChange` and log the error, so the index legs always run once `diskOp` succeeded.

## rename-move-delete-7: CONFIRMED (minor, KNOWN)

READ:
- `fs.service.ts:204`: `oldPath === newPath` compares with exact case.
- :205: `exists(newPath)`, which is `resolved_path.exists()` in the fetched source.
- `FilesNavigator.svelte:146` (`trimmed === name`) and `type-note-list.logic.ts:16` (`trimmed === currentTitle`) both pass a case-only change on to the rename.

INFER: on APFS, `exists` is true for the case variant, so `targetExistsError` fires.

Known: `.scratch/sidebar-fixes/work/01/discovery.md:31` names this exact toast and calls the fix out of scope. It is not filed as an Issue.

Repro: on macOS, rename `meeting notes.md` to `Meeting Notes.md`: the toast says the name already exists.

Fix hint: when `oldPath.toLowerCase() === newPath.toLowerCase()`, skip the `exists` check, since `std::fs::rename` handles a case-only rename on APFS.

## rename-move-delete-8: PLAUSIBLE (minor)

READ:
- `path-change.service.ts:127-132`: tab paths change only after `await diskOp()`.
- `saveDirtyTabs` (`editor.service.ts:183-190`) reads `tab.path` when the timer fires.
- `writeTextFile` defaults to `create: true` (fetched source).
- `notifyAfterSave(oldPath)` (:170) runs.
- `markSavedByPath(oldPath)` (:169) finds no tab once the path has moved, so the tab stays dirty and its next save goes to the new path. No content is lost.
- The final sweep `forgetNote(from)` (:168-170) then drops the index entry for the duplicate it just created, so the duplicate is on disk but unindexed until the watcher sees it.

Not pinned: whether the plugin-fs `write_file` and `rename` commands run in parallel or in issue order. If the write lands first, it writes the old file before the rename moves it, and nothing goes wrong. The window is one rename IPC, about 2 s after the last keystroke. Auto-move (`auto-move.service.ts:112-121`) runs after its own debounce (`settingsStore.autoMove.debounceMs`) following a save, and the user may still be typing then, so it is the likeliest trigger.

Repro (test idea): make `rename` resolve on a deferred promise, fire `debouncedSave` while it is pending, then resolve it. Assert that no `writeTextFile` targets the old path after the `rename` call.

Fix hint: cancel the pending debounced saves and await `saveFileByPath` for the affected tabs before `diskOp` in `applyPathChange`, or skip a save whose path is in an in-flight path change.

## rename-move-delete-9: PLAUSIBLE (security, low)

READ:
- `auto-move.logic.ts:116-128` substitutes `status` and `_type` from frontmatter and cleans only slashes.
- `auto-move.service.ts:173-188` joins the result onto `vaultPath`, then calls `mkdir(..., recursive)` and `moveItem`.
- `isAlreadyInDestination` (`auto-move.logic.ts:69-81`) is a plain string compare, so it does not block a `..` destination.
- The fetched `resolve_path` scope-checks the real path, popping each `..`.
- `capabilities/default.json`: `fs:allow-mkdir` and `fs:allow-rename` allow `$HOME/kokobrain-vaults/**` and `$DOCUMENT/kokobrain-vaults/**`.

INFER: with a rule destination of `Tasks/{status}` and `status: ../../Other`, the note lands in `kokobrain-vaults/Other`, a sibling of the vault. A deeper `../../../x` falls outside the scope and is refused. So the escape is bounded to the vaults root. Nothing is deleted; the note is still on disk.

Not pinned: whether any real rule uses `{status}` or `{type}`. Rules are user-configured, and I did not read whether the lifecycle rules (`generateLifecycleRules`) place frontmatter values into destinations.

Repro: `resolveDestination('Tasks/{status}', record with status '../../Other', '/v')` returns `Tasks/../../Other` (unit test).

Fix hint: reject or strip `.` and `..` segments in `resolveDestination`, and assert that the normalized `destPath` is still under `vaultPath + '/'`.
