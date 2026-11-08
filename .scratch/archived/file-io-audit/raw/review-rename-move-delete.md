# Review: rename, move, delete

Senior review of the three scout maps (fs-service, path-change, rename-edges). Read-only: no build, test or app run. Every claim below was traced in the code at the cited lines. READ means seen in code; INFER means reasoned from code or docs, not observed.

Third-party source fetched: `tauri-apps/plugins-workspace` v2 `plugins/fs/src/commands.rs` (raw GitHub). READ there: `rename` is a single `std::fs::rename` with no destination check; `copy_file` is `std::fs::copy` with no destination check; `write_text_file` defaults to `create: true`, `append: false`, `truncate: true`, and writes in place with `OpenOptions` + `write_all` (no temp file, no rename). The notify crate was not fetched: the claim that a folder rename reaches the watcher as directory events only rests on the project's own comment at `src/lib/core/trash/trash.service.ts:159-162`.

Known-issue check: grep of `.scratch/architecture-stability/issues/*.md` (and the rest of `.scratch`, apart from this audit) for closeTabsForDeletedPath, unsaved/trash, folder search index, case-only, path-qualified, updateLinksAfterRename, generateCopyName. No filed Issue covers the findings below. Issues 45, 54, 58 and 59 cover calendar and view-cache races next to these paths, not these paths. Issue 34 (vault-switch save) does not apply. `.scratch/ios-app/research/review-data-safety.md` mentions case-only renames and `closeTabsForDeletedPath`, but for a future sync design, not as a bug in today's desktop code.

## Findings (most severe first)

### RMD-1 (data-loss, high confidence): deleting a note or folder drops unsaved edits, and a failed Trash move drops them while the note is still there

- READ `src/lib/core/filesystem/path-change.service.ts:125-127`: `closeTabsForDeletedPath(from)` runs before `await diskOp()`.
- READ `src/lib/core/editor/editor.service.ts:356-366`: `closeTabsForDeletedPath` removes every matching tab (the note itself, or every child of a folder) without calling `isTabDirty`, without saving and without asking.
- READ `editor.service.ts:183-197`: the pending debounced save then runs `saveDirtyTabs`, which finds no tab and writes nothing. `src/lib/utils/debounce.ts:9-17` has no maxWait.
- READ: the Trash holds only the disk bytes (`trash.service.ts:71`, a plain `rename`).
- READ, entry points that do not save first: `NoteRowMenu.svelte:122-130`, `note-action-bar.service.ts:19-28` (the action-bar Trash item for the note you are editing), `FilesNavigator.svelte:168-175` (folders). Only the calendar saves first, and its comment says why: `event-calendar.service.ts:1035-1037`, "`deleteItem` closes tabs without a dirty check and the Trash keeps only the disk bytes".
- Failure branch, READ: when `moveToTrash` throws (`trash.service.ts:87-96`), `applyPathChange` has already closed the tabs, so the unsaved text is gone while the note stays on disk with its old content.
- Calibration (INFER): the confirm `ask()` dialog is async, so the 2 s body timer (500 ms for frontmatter) keeps running while it is open. If the user takes more than about 2 s to confirm, the save fires first and nothing is lost. The loss is therefore limited to edits made in the last ~2 s before confirming: type, open the action-bar menu, Move to Trash, Enter. For a folder delete, the loss covers every child tab still dirty at that moment.
- Scenario: type a sentence in note N, open the action bar at once, choose Move to Trash and press Enter within 2 s. Restore N from the Trash: the sentence is missing. Or the Trash move fails (permissions, a `.kokobrain` on another volume): N is still in the vault, its tab is closed, and the sentence is gone.
- Known: not filed. The calendar comment shows the gap is known in code, but the other three entry points have no fix.

### RMD-2 (data-loss, high on mechanism, low likelihood): Duplicate can silently overwrite a sibling whose name differs only in case

- READ `src/lib/core/filesystem/fs.logic.ts:185` and `:203-209`: `generateCopyName` builds its sibling Set with exact case. `generateUniqueName` (`:225-226`) lowercases on purpose, and its own JSDoc (`:215-218`) explains that APFS is case-insensitive.
- READ `fs.service.ts:266-279`: `duplicateItem` passes the chosen name straight to `copyFile`, with no `exists` check.
- READ (fetched): plugin-fs `copy_file` is `std::fs::copy`, which truncates and overwrites the destination.
- INFER: on a case-insensitive volume, `note copy.md` opens the existing `Note copy.md`.
- Scenario: the vault holds `note.md` and `Note copy.md` (for example a copy of an earlier `Note.md` that was renamed away, or a file made outside the app). Duplicate `note.md`. The candidate `note copy.md` is not in the exact-case Set, so `copyFile` overwrites `Note copy.md` with the contents of `note.md`. No Trash entry, no warning. Folders are safe: `copyDirectoryRecursive` calls a non-recursive `mkdir` (`fs.service.ts:252`), which fails when the folder exists.
- Known: not filed.

### RMD-3 (stale-state, medium-high confidence): renaming or moving a folder removes its notes from full-text and semantic search until the next vault open

- READ `path-change.service.ts:168-170`: `forgetNote` runs for every old child path and passes `vaultPath` (`:85-87`). `note-change.service.ts:197-219` then calls `remove_from_search_index` and `remove_semantic_file` for each one.
- READ: nothing writes the new child keys. `rename_note` (`src-tauri/src/commands/vault.rs:1001-1035`) re-keys only the `VaultIndex`.
- READ `src/lib/app/lifecycle/watcher-handler.service.ts:33-44`: a batch with no dotted basenames is dropped as "directory-only". The full-rebuild branch (`:68-75`) does not rebuild FTS or semantic. Only vault open does: `buildSearchIndex` is called at `app-lifecycle.service.ts:421` and nowhere else.
- READ `trash.service.ts:159-162`: the project already found that a directory rename arrives as one directory event and is dropped by this filter. Restore re-indexes folder children by hand for that reason. Rename and move have no matching step.
- Scenario: drag folder `Projects/` into `Archive/`, or rename it. Search for text from any note inside it: no results (text and semantic) until the app restarts, or until each note is edited and saved, since the save-side search observer re-adds that one path. Same for a dotted folder name such as `v1.2`: it passes the filter but takes the full-rebuild branch, which does not touch FTS.
- Known: not filed.

### RMD-4 (stale-state, high confidence): the link rewrite after a rename misses some links that point at the renamed note, leaving them dangling

- READ `src/lib/core/filesystem/link-updater.logic.ts:27`: a link is rewritten only when its whole target, lowercased, equals the bare old note name.
- READ: resolution falls back to the basename, so these links did point at the note before the rename. Rust: `src-tauri/src/vault/index.rs:110-124` (`resolve_with_cache`) with `by_path` keyed by stem (`:305-307`). TS: `wikilink-resolution.logic.ts:41-60`.
- Missed forms:
  - path-qualified `[[Work/Plan]]`
  - extension-qualified `[[Plan.md]]`
  - self-links inside the renamed note (filtered at `link-updater.service.ts:28`; Rust also drops self-links from backlinks, `index.rs:340-341`)
  - `[[Plan]]` typed into a still-unsaved buffer: the set of files to rewrite comes only from `get_backlinks_v2` (`link-updater.service.ts:27`), which reads the saved index.
- Scenario: note A contains `[[Work/Plan]]`. Rename `Work/Plan.md` to `Work/Roadmap.md`. A still says `[[Work/Plan]]`, which now resolves to nothing, and no warning is shown. Per-file write failures are only logged too (`link-updater.service.ts:56-60`).
- Known: not filed.

### RMD-5 (data-loss, small and rare; medium confidence): keystrokes typed into an affected open note during the link rewrite are reverted, with no undo

- READ `link-updater.service.ts:33-47`: the content is captured from a snapshot (`openTab.content`, or `await readTextFile` for a clean tab), then `await writeTextFile`, then `syncExternalContentToEditor(filePath, updatedContent, true, 'none')`. That sets both `content` and `savedContent` to the stale-based rewrite (`editor.store.svelte.ts:130-136`).
- READ: for the active tab, it bumps the signal, and `MarkdownEditor.svelte:312-336` replaces the whole document with `addToHistory(false)`.
- Scenario: note X is open and links to `[[Old]]`. Rename Old from the note list, then click back into X and type at once. Characters that land between the read (or snapshot) and the end of the write are removed from the store and from CodeMirror, and Cmd+Z cannot bring them back. The window is one or two IPC round trips (milliseconds), so this is rare.
- Known: not filed.

### RMD-6 (stale-state, high on control flow, low trigger): a failure after the disk rename reports "Could not rename" for a rename that happened, and skips the index re-key

- READ `path-change.service.ts:148-153`: `await updateLinksAfterRename` and `await refreshTree()` are outside any try. Inside the link updater, `call('get_backlinks_v2')` (`link-updater.service.ts:27`) is not inside the `allSettled`. `loadDirectoryTree` rethrows (`fs.service.ts:96-98`).
- READ: a rejection skips `rename_note` (`:158-162`) and the old-path sweep (`:168-170`), and `renameItem` rethrows (`fs.service.ts:216-219`), so the caller toasts.
- Scenario: `get_backlinks_v2` fails (a poisoned `VaultIndex` lock makes every later call fail: `vault.rs:436-438`) or `scan_vault` fails. The note is renamed on disk and its tab has moved, yet the toast says the rename failed, the tree still shows the old name, the Rust index keeps the old paths, and a retry fails ("already exists" or ENOENT). The watcher repairs a single file's index entry, but not a folder's (see RMD-3).
- Known: not filed.

### RMD-7 (minor, high on code, APFS behavior inferred): a case-only rename is refused as "already exists"

- READ `fs.service.ts:204-205`: `oldPath === newPath` compares with exact case, then `exists(newPath)` runs.
- INFER: on case-insensitive APFS, `exists('…/note.md')` is true while `Note.md` exists, so `targetExistsError` fires. Neither `buildRenameFileName` (`type-note-list.logic.ts:14-22`) nor `FilesNavigator.commitRename` (`FilesNavigator.svelte:140-153`) handles this case. As a result, the link updater's case-insensitive early return (`link-updater.service.ts:25`) is never reached for this kind of rename.
- Scenario: rename `meeting notes.md` to `Meeting Notes.md`. The toast says `"Meeting Notes.md" already exists in this folder`, and the casing cannot be fixed in the app. Same for folders. Visible, no loss.
- Known: not filed.

### RMD-8 (minor, medium confidence, low likelihood): an auto-save that fires during the rename IPC writes the old path and creates a duplicate note

- READ `path-change.service.ts:127-132`: during `await diskOp()`, tab paths are still the old paths. They are updated only after the rename resolves.
- READ: `saveDirtyTabs` (`editor.service.ts:183-190`) reads `tab.path` when it fires, and `saveFileByPath` writes with `create: true` (the default, per the fetched plugin-fs source). Then `notifyAfterSave(oldPath)` indexes it (`:168-170`).
- INFER: if the 2 s timer fires while the rename IPC is in flight, the write runs after the rename and creates `old.md` again with the buffer text. The tab then moves to the new path and stays dirty, so its own text still reaches the new file. Nothing is lost, but a duplicate note appears at the old name. For a folder, the write fails with ENOENT (the parent is gone), shows a "Failed to save file." toast, and retries after 5 s against the new path.
- Auto-move (`auto-move.service.ts:114-121`, `:188`) raises the odds: it moves the note you just saved, which is the note you are typing in. The duplicate it re-creates then fails its own auto-move on "already exists" (`fs.service.ts:233`), so it stays in the original folder.
- The comment at `path-change.service.ts:100-101` covers a timer that fires after the rename, not during it.
- Known: not filed.

### RMD-9 (security / path-safety, low confidence): auto-move destinations taken from frontmatter are not checked for `..`

- READ `src/lib/features/auto-move/auto-move.logic.ts:116-128`: `{status}` and `{type}` are filled in from frontmatter. Only repeated slashes and leading or trailing slashes are cleaned.
- READ `auto-move.service.ts:173-188`: `destPath = vaultPath/resolved`, then `mkdir(..., recursive)` and `moveItem`.
- INFER, not checked: the plugin-fs scope (`capabilities/default.json:40-61`, `kokobrain-vaults/**`) still allows a lexically normalized target in a sibling vault or in the vaults root.
- Scenario: a rule with destination `Tasks/{status}` and a note whose frontmatter has `status: ../../Other`. Saving it moves the note out of this vault. It disappears from the app, and its tab and index keys hold a path containing `..`. The note is still on disk.
- Known: not filed.

## Paths checked and found safe

- Moving a folder into itself or one of its children: `validateDragDrop` (`fs.logic.ts:260-270`) is checked before `moveItem` in `FilesNavigator.svelte:246`. `moveItem` has no guard of its own, but `rename` would fail before any side effect: tabs are closed only on delete, and `childPaths` is only a read.
- Rename or move onto an existing name: the `exists` check in `fs.service.ts:205` and `:233` refuses it. On APFS the check is case-insensitive, so a case-variant target is refused too. Only the race with an outside writer remains (one IPC window). It is not reported: it is speculative and has no live in-app trigger, because auto-move timers are per file and the second move's `exists` check sees the first.
- Trash move: a fresh UUID container, then `rename` into it. The container is removed only when the rename did not happen (`trash.service.ts:49-96`), so the user's only copy is never deleted.
- Dirty child tabs on a folder rename or move: they are retargeted by prefix (`link-updater.service.ts:73-86`) right after `diskOp` (`path-change.service.ts:132`).
- A timer that fires after the rename finishes saves to the new path, because `saveDirtyTabs` reads `tab.path` when it fires (`editor.service.ts:183-190`).
- `VaultIndex` ordering: `rename_note` is awaited before the removal sweep (`path-change.service.ts:155-170`, `vault.rs:1001-1035`).
- The collection property index follows a folder move through the `vault-index-updated` delta from `rename_note` (`collection.service.ts:117-124`; the emit is at `vault.rs:1057-1064`).
- Pure moves (same name) skip the link rewrite (`link-updater.service.ts:25`).
- Scout claim rejected: "same-basename links are re-pointed". Backlinks are stored per resolved path (`index.rs:335-352`, `587-597`), and resolution is first-match by basename in both Rust and TS. So every `[[Notes]]` in a backlink source already resolves to the renamed note, and rewriting it to the new name keeps the same target.
- Scout claim rejected as a loss: "the link rewrite persists a dirty buffer and marks it clean". The 2 s auto-save would write the same buffer anyway, and `savedContent` matches the disk afterwards. Only the keystroke race (RMD-5) is a real loss.
- The delete fallback to a permanent `remove` when no vault is open (`fs.service.ts:179-182`) needs the vault to close between the confirm and the disk operation. No live trigger was found, so it is not reported.
- Duplicating a folder never overwrites (non-recursive `mkdir`, `fs.service.ts:252`).
- Rename name validation: every UI caller validates (`FilesNavigator.svelte:148`, `type-note-list.logic.ts:21`), and `getFileNameError` rejects `/`, a leading `.` and control characters (`fs.logic.ts:117-124`).

## What I did not verify

No runtime checks. Not verified: FSEvents behavior for child paths on a folder rename (relied on the project's own comment), APFS case behavior (default from memory), whether Tauri processes concurrent plugin-fs commands in order (RMD-8), and Tauri's scope normalization of `..` (RMD-9).
