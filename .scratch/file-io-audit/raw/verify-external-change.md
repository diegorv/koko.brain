# Adversarial verification: external-change theme

Read-only. Nothing built or run. I assumed every finding was wrong and looked for something that blocks it: a guard, a caller that never passes the input, a test that proves otherwise. READ = lines I read myself. INFER = a conclusion drawn from them.

Third-party sources fetched:
- `https://raw.githubusercontent.com/notify-rs/notify/notify-8.2.0/notify/src/fsevent.rs`: `MUST_SCAN_SUBDIRS` becomes `Event::new(EventKind::Other).set_flag(Flag::Rescan)`, with info "rescan: user dropped" or "rescan: kernel dropped". The event carries the path FSEvents reported (`ev.add_path(path.clone())`). Stream flags are `FileEvents | NoDefer`, latency 0.0.
- `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs`: `write_text_file` forwards to `write_file_inner`. With no options it opens with `write: true, truncate: true, create: true, append: false`, then one `write_all`. No temp file, no rename, no fsync.

Known-issue check: `.scratch/architecture-stability/issues/*.md` has nothing on external-change reload, conflict handling or watcher deletes. Issue 34 is about the vault switch, so it is not the same defect. One partial match: F2 appears as M1 in the iOS research note `.scratch/ios-app/research/review-data-safety.md:19` ("`reloadExternallyChangedTabs` drops keystrokes typed while its read is in flight"). That is a research note, not a filed Issue.

Other refutation attempts that found nothing:
- No reload on window focus or tab switch. `tauri-listeners.service.ts:301-319` only refreshes the daily note.
- No mtime or conflict check anywhere in `src/lib` (grep for conflict, mtime, "changed on disk").
- No other path closes a tab on a watcher delete: `closeTabsForDeletedPath` has one caller, `path-change.service.ts:125`.

---

## external-change-1: CONFIRMED, data-loss

READ:
- `editor.service.ts:378-381`: a tab with `isTabDirty(tab)` (which is just `content !== savedContent`, `editor.logic.ts:44-46`) is skipped before any read. The doc comment at `:371-373` states it as policy. The test `editor.service.test.ts` "skips dirty tabs — editor always wins over external changes" pins it.
- `saveFileByPath` (`:161-178`) does `writeTextFile(path, tab.content)` with no precondition. The plugin default is create + truncate (fetched).
- The autosave is `debounce(saveDirtyTabs, 2000)` / `500` (`:195-198`). `saveDirtyTabs` saves every dirty tab (`:182-194`).
- File history snapshots only through the after-save observer (`file-history.service.ts:189-196`), which gets the saved content. The watcher path (`watcher-handler.service.ts`) writes no snapshot.

Refutation attempts: no reload-on-focus, no mtime or content compare before the write, no conflict copy, and the watcher batch never snapshots disk. Nothing blocks it.

INFER: this is a deliberate policy, but the outcome is exactly the owner's top concern: the external bytes are overwritten and no copy exists in the app.

Repro: open N, type one character, and within 2 s run `printf 'external' > N` from a terminal. Wait 3 s. The disk holds the old text plus the character. File history has no "external" version.
Test idea: add a tab with savedContent 'base' and content 'base+x', call `reloadExternallyChangedTabs` with readTextFile resolving to 'ext', then flush the debounce and assert the external text was preserved somewhere (a conflict copy or a prompt). Today it fails because writeTextFile gets 'base+x'.
Fix hint: before the autosave writes, compare the disk with `savedContent` (or check the mtime). On a mismatch, keep both: write a conflict copy, or snapshot the disk version into file history, and warn the user.

## external-change-2: CONFIRMED, data-loss (narrow window)

READ:
- The dirty check runs before the await (`editor.service.ts:378-382`). The reads are awaited together with `Promise.allSettled` (`:385-387`).
- After the await, the only checks are that the tab exists and that `diskContent === tab.savedContent` (`:397-398`). The comment says "Re-check tab state" but does not re-check dirty state.
- `:401` calls `syncExternalContentToEditor(path, disk, true, 'none')`, which reaches `updateTabContentByPath` and overwrites both `content` and `savedContent` (`editor.store.svelte.ts:129-136`). The `'none'` schedule arms nothing (`editor.service.ts:208-216`).
- `MarkdownEditor.svelte:310-337`: on the signal bump, the whole doc is replaced with `addToHistory.of(false)`, using `activeTab.content` (now the disk text).
- Keystrokes reach the store synchronously: CodeMirror `updateListener` (`editor-extensions.ts:170-189`) calls `onContentChange` (`MarkdownEditor.svelte:124`), which calls `editorStore.updateContent` (`editor.service.ts:224-227`, `editor.store.svelte.ts:84-88`). There is no debounce in between.
- A Properties edit goes through `syncExternalContentToEditor(activePath, newContent, false, 'frontmatter')` (`properties.service.ts:95`), which updates `content` only.
- After the reload, the pending autosave from the keystroke fires, finds the tab clean (content === savedContent === disk) and writes nothing.

Refutation attempts: there is no guard between the read and the apply, the keystroke path does not wait for the reload, and the `serializeWithRerun` wrapper does not block UI input. Nothing blocks it.

The outcome is deterministic once a keystroke lands in the window, so this is CONFIRMED. Likelihood is low: the window is the slowest `readTextFile` IPC among the eligible tabs (milliseconds on a local disk).

Partially known: iOS research note M1 (`.scratch/ios-app/research/review-data-safety.md:19`), not filed as an Issue.

Test idea: add a clean tab 'base'. Make readTextFile return a deferred promise. Start `reloadExternallyChangedTabs([p])`, then call `onContentChange('base+abc')` (with that tab active), resolve the read with 'ext' and await. Assert content is not 'ext' without the user's text. Today content === savedContent === 'ext'.
Fix hint: after the await, skip (or treat as a conflict) when `isTabDirty(tab)`, or when `tab.content` differs from the value captured at the eligibility check.

## external-change-3: PLAUSIBLE, data-loss (chain, low likelihood)

READ:
- `fs.watcher.ts:137, :149, :175`: `await refreshTree()` has no try. `notifyListeners` runs only after it (`:139, :151, :177, :185`).
- `refreshTree` leads to `loadDirectoryTree`, which logs and rethrows (`fs.service.ts:95-98`).
- The event handler is `void handleChangedPaths(payload.paths)` (`fs.watcher.ts:199`), so a rejection is unhandled. The batch's paths never reach `pendingWatcherPaths` (`app-lifecycle.service.ts:494-498`), and are lost for good.
- `scan_dir` fails the whole scan on `fs::read_dir(dir)?` (`vault.rs:96`), on `entry?` (`:100`) and on the recursive `?` (`:139`). Only the stat failure is skipped (`:112-115`).
- `resolveRescanParents` returns `[vaultPath]` whenever a changed path's parent is the vault root, or a missing directory walks up to it (`fs.logic.ts:298-313`). In that case `patchSubtree` returns the scanned root, but the incremental `scan_vault` on the root fails the same way, falls into the `catch` at `:172` and then into `refreshTree` at `:175`.
- `startWatching` catches its own error (`fs.watcher.ts:202-209`), so the `.catch` at `app-lifecycle.service.ts:499-501` can never fire. That claim is correct.

Why only PLAUSIBLE: the trigger needs an unlistable subfolder, or a directory removed between its lstat and its `read_dir` (for example during `git checkout` or a sync). With a persistent unlistable folder, the initial tree load also fails, so the user sees the "Failed to load vault contents" toast and an empty explorer (`app-lifecycle.service.ts:314-318`). The user is warned that something is wrong, but not that external changes will be ignored. The race variant drops one burst silently. I could not pin down how often either happens.

Repro: create `vault/locked/` with `chmod 000`, open the vault, open clean root-level note N, edit N externally, and type one character in the app. N gets the old text plus the character.
Test idea (TS): mock `call('scan_vault')` to reject for the root path, emit a `vault-files-changed` with a root-level path, and assert the listener still received the path. Today it does not.
Fix hint: wrap the `refreshTree` calls in try/catch and still call `notifyListeners(changedPaths)`. In Rust, skip an unreadable child directory the way an unstat-able entry is skipped.

## external-change-4: PLAUSIBLE, data-loss (chain) + stale-state, low likelihood

READ:
- `watcher.rs:254-262`: the closure forwards every `event.paths` entry and ignores kind and flags.
- `filter_ancestor_paths` (`watcher.rs:88-99`) drops a directory only when a deeper path in the same burst is under it. A lone rescan directory survives.
- Fetched notify 8.2.0: a rescan is `EventKind::Other` + `Flag::Rescan` on the reported path.
- On the TS side, `reloadExternallyChangedTabs` matches tabs by exact path (`editor.service.ts:379`), so a directory matches no tab.
- In `rebuildAllIndexes`, `filePaths` keeps basenames with a dot (`watcher-handler.service.ts:33-36`). A directory-only batch returns at `:41-44`. The tree does rescan (`fs.watcher.ts` full or incremental), which is correct.

Refutation attempts: nothing expands a rescan directory into its child files. The only escape is a folder whose name contains a dot (e.g. `v1.2`): it counts as a file, has no `.md`, so the batch takes the full `rebuildIndex` path, which still does not reload tabs.

Why only PLAUSIBLE: it depends on FSEvents actually dropping events. I could not pin down how often that happens.

Test idea: call `reloadExternallyChangedTabs(['/vault/Projects'])` with a clean tab `/vault/Projects/a.md` whose disk content changed, and assert it reloads. Today it is not even read. Do the same for `rebuildAllIndexes(['/vault/Projects'])`.
Fix hint: in Rust, when `event.need_rescan()` is set, emit a flag (or expand the directory to its .md children), and have TS reload the open tabs under that prefix and run a full index rebuild.

## external-change-5: CONFIRMED, corruption

READ:
- A rejected reload read is logged at debug level and the tab is kept (`editor.service.ts:390-393`). The test "handles read errors gracefully (file may be deleted)" pins that the tab stays unchanged.
- `closeTabsForDeletedPath` has one caller, `path-change.service.ts:125`, for in-app operations only. `updateTabPath` is called only from `link-updater.service.ts:79,83`, also in-app.
- `saveFileByPath` calls `writeTextFile(path, content)` (`:168`), which creates the file (fetched plugin default `create: true`).
- The watcher's incremental path sends a `delete` for a path whose read returned null (`watcher-handler.service.ts:104-109`), so the indexes drop N while the tab keeps it.
- Retry on a failed save: `:191-193` (5 s).

Refutation attempts: the dirty-tab case could be seen as "preserving unsaved work", and that part is defensible. Even so, the file reappears at a path the external tool removed, with no prompt. The rename case leaves a duplicate `a.md` next to `b.md`. Nothing tells the user. CONFIRMED. Severity stays corruption (content or files changed without the user asking). It is not data-loss: the external version is still at `b.md`, or in git.

Repro: open a.md (clean), `mv a.md b.md` in a terminal, wait 1 s, and type a character. Within 2 s, a.md is back on disk next to b.md.
Fix hint: when the reload read fails with not-found, mark the tab "deleted on disk" and stop autosaving it until the user chooses to keep (re-create) or close it. For a rename, match the old path to the new path in the same burst.

## external-change-6: CONFIRMED, stale-state

READ:
- `rebuildAllIndexes` returns early when `areAllRecentSaves(filePaths)` (`watcher-handler.service.ts:41-44`, `editor.hooks.ts:47-49`).
- `RECENT_SAVE_TIMEOUT_MS = 15000` (`editor.hooks.ts:24`). Every `markRecentSave` resets the timer (`:37-44`), and `notifyAfterSave` calls it on every save (`:68`). The skip does not consume the entries (comment `watcher-handler.service.ts:39-40`).
- The tab reload runs before the index step and is not gated (`app-lifecycle.service.ts:486-487`).
- The partial heal is real: for the active tab, the 1 s content effect (`src/routes/(app)/+layout.svelte:133-157`) calls `updateIndexesForFile(path, content)`. That call carries no vaultPath, so FTS5 and semantic are not refreshed (INFER from the signature use, consistent with CLAUDE.md "on the save side those tables belong to the search after-save observer"). A background tab, or a closed note, gets nothing.

Refutation attempts: there is no content compare in the skip, and no later rescan. Nothing blocks it.

Repro: save N, close its tab, and within 15 s run `echo '#newtag' >> N` externally. The tags panel and search do not show `#newtag` until N is touched again or the vault is reopened.
Fix hint: skip only when the read content equals the last saved content (the dedupe map already has it), instead of skipping on path membership.

## external-change-7: CONFIRMED, stale-state (folder-rename part inferred)

READ:
- The full path runs only `rebuildIndex`, `buildPropertyIndex`, `buildFrontmatterIconIndex` and `notifyContentInvalidated` (`watcher-handler.service.ts:66-75`).
- The TS callers of `update_search_index_file`, `remove_from_search_index`, `update_semantic_file` and `remove_semantic_file` are only `note-change.service.ts:209,217,247,252` and the save observer `search.service.ts:302-330`.
- `buildSearchIndex` has one caller, `app-lifecycle.service.ts:421` (vault open).
- `search_fts` returns raw FTS rows with no existence or VaultIndex filter (`search_index.rs:149-182`). The TS side only applies operator filters (`search.service.ts:200-227`).
- A directory-only batch returns at `watcher-handler.service.ts:41-44`.

Refutation attempts: I found no FTS refresh tied to `vault-index-updated`, and no FTS work in `scan_vault_v2_cached` (`vault.rs` has no FTS references in that path). The >10-note case is CONFIRMED. That an external folder rename updates no index for its children rests on FSEvents not reporting the children, which I did not verify, so that sub-claim is PLAUSIBLE.

Repro: externally delete 11 notes at once (`rm` in a terminal). Text search still lists them, and opening one shows "Failed to open file."
Fix hint: in the full-rebuild branch, call `build_search_index` (it is mtime-incremental per its doc) and the semantic orphan cleanup, or feed the changed paths through `applyNoteChange` with a vaultPath in chunks.

---

## Not verified
- None of this was reproduced at runtime.
- How often FSEvents emits MustScanSubDirs, and whether a folder rename reports its children.
- The fetched sources were notify tag 8.2.0 (the lockfile pins 8.2.1) and plugins-workspace branch `v2` (the repo uses plugin-fs 2.7.1), not the exact locked versions.
