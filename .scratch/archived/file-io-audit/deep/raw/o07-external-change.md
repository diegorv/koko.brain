# o07-external-change: deep-dive raw report

Code read in `.claude/worktrees/file-io-repro` at `0ba80e6a` (identical to main).
Upstream fetched: `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs`
(`write_file_inner`; lockfile pins tauri-plugin-fs 2.7.1). With options `None` it opens with
`write: true, truncate: true, create: true, create_new: false`; with options present, `create`
defaults to `true` through `default_create_value` and `truncate` is `!append`.

Repro tests (all fail on their correct-behavior assertion, no import or mock errors; mocks are
only `@tauri-apps/plugin-fs`, `@tauri-apps/api/core`, `@tauri-apps/plugin-dialog`, with real stores
and real debounce under fake timers):

- `src/tests/repro/o07-external-change/external-change-overwrite.test.ts` (2 failing)
- `src/tests/repro/o07-external-change/reload-race.test.ts` (1 failing)
- `src/tests/repro/o07-external-change/external-delete.test.ts` (3 failing)

Run: `./node_modules/.bin/vitest run src/tests/repro/o07-external-change/<file>`

---

## Bug A: a blind tab-buffer write overwrites an external change (external-change-1, save-pipeline-8, calendar-1)

Verdict: CONFIRMED_BY_TEST. Severity: data-loss. Priority: P1.

Trace:
- `src/lib/core/editor/editor.service.ts:375-382`: `reloadExternallyChangedTabs` skips any tab where
  `isTabDirty(tab)` holds (`content !== savedContent`, `editor.logic.ts:44-46`), so it never reads
  the disk. The doc comment at :369-374 says this on purpose ("the editor always wins"), and the existing
  test `src/tests/lib/core/editor/editor.service.test.ts` ("skips dirty tabs, editor always wins")
  pins it.
- `editor.service.ts:161-178`: `saveFileByPath` calls `writeTextFile(path, content)` with no options
  and no check of the disk against `savedContent`. The plugin default (fetched) is create + truncate.
- The autosave runs 2000 ms after the last body keystroke and 500 ms after a frontmatter edit
  (`editor.service.ts:197-201`). A failing save retries every 5 s (`:183-195`) and keeps the tab dirty.
- `file-history.service.ts:190-196`: snapshots come only from the after-save observer, so they hold
  the content the app wrote. The watcher path (`watcher-handler.service.ts`) never snapshots, so the
  external bytes are never captured in the app.
- No conflict detection exists in `src/lib/core/editor`, `core/filesystem` or `app/` (grep for
  conflict, mtime and modifiedAt).
- Watcher latency before a reload can land: the Rust debounce is 500 ms after the last event
  (`watcher.rs:186-229`), then `fs.watcher.ts` rescans the tree before `notifyListeners`
  (`:122-186`), then a 300 ms TS debounce and a serialized batch (`app-lifecycle.service.ts:480-498`).
  A keystroke typed during this lead time makes the tab dirty, so the reload is skipped.
- calendar-1 is the same blind write through another caller. `frontmatter-write.service.ts:110-129`
  takes `base = tab.content` for an open tab and calls `saveFileByPath`. On a CLEAN tab whose disk
  changed but whose reload has not landed yet, the stale buffer plus the mutation is written. The
  later reload then sees `diskContent === savedContent` (`editor.service.ts:398`) and does nothing.
  Also, `notifyAfterSave` → `markRecentSave` makes `rebuildAllIndexes` treat the path as a
  self-save (`watcher-handler.service.ts:41`).

Test failures:
- `external-change-overwrite.test.ts:75`: `expect(externalVersionSurvives()).toBe(true)` gives
  `AssertionError: expected false to be true`. Steps: type one char, an external rewrite, the reload,
  the autosave. Afterwards no file holds the external line.
- `external-change-overwrite.test.ts:91`: same assertion for the calendar frontmatter write on a clean
  tab before the reload.

Reachability: default settings. The user is typing in note N (or did within the last 2 s, or a save
is failing) when a sync client, git pull or another editor rewrites N. This is realistic for a vault
synced to a phone or edited by a second tool. It is not daily for one user. calendar-1 needs a drag
within about 1 s of the external write, so it is rare.
Recoverable: not in the app. Undo never held the external text and File History holds only
app-written content. Only external sources help: git history (if the change came from git), or the sync
service's version history if it keeps one.
Refutation attempts: there is no guard in `saveFileByPath`, no Rust-side precondition (it is a plugin-fs
write), and no setting that enables a conflict check. The "editor always wins" behavior is a
documented design choice, but the result is still silent loss of the external version. Fixing it
means changing the pinned test, which needs the owner's approval.
Fix sketch: track the disk baseline (mtime or a hash of `savedContent`). Before a tab write, re-read
or stat the file. If the disk differs from `savedContent`, do not truncate: write a conflict copy
(`N (conflict <ts>).md`) or snapshot the disk bytes into File History, then save, and toast. The
same check covers the calendar tab branch, because it goes through `saveFileByPath`.

---

## Bug B: reload apply does not re-check dirty state after its await (external-change-2, save-pipeline-13)

Verdict: CONFIRMED_BY_TEST. Severity: data-loss (a few keystrokes). Priority: P3.

Trace:
- `editor.service.ts:378-382` checks eligibility (including `isTabDirty`) BEFORE the
  `await Promise.allSettled(readTextFile…)` at :385-387.
- After the await, :396-398 re-finds the tab but checks only `diskContent === tab.savedContent`. A tab
  made dirty during the read still has the old `savedContent`, so it passes.
- :401 `syncExternalContentToEditor(path, disk, true, 'none')` → `updateTabContentByPath` sets
  content and savedContent to the disk text (`editor.store.svelte.ts:130-136`) and arms no autosave.
  `MarkdownEditor.svelte:312-337` replaces the CM doc with `addToHistory.of(false)`.
- Keystrokes reach the store synchronously: the CM updateListener (`editor-extensions.ts:170-189`) →
  `onDocChanged` → `onContentChange` (`MarkdownEditor.svelte:124`, `editor.service.ts:224-227`).
- Test: `reload-race.test.ts:69`: `expect(tab.content).toContain('abc')` gives
  `AssertionError: expected '# Note\nLine one.\nExternal line.\n' to contain 'abc'`.
- save-pipeline-13's other paths, checked:
  - link-updater (`link-updater.service.ts:31-47`) and `renameType`
    (`type-definitions.service.ts:213-220`) also apply a precomputed buffer after an await. They only
    run while the user is renaming in the explorer or a dialog, so typing in the editor at the same
    moment is theoretical.
  - The close handler (`tauri-listeners.service.ts:53-71`) awaits the calendar drain and the
    settings flush after `saveAllDirtyTabs`. Keystrokes typed after Cmd+Q in that gap are not saved.
    This is also theoretical.

Reachability: the window is one local `readTextFile` IPC round trip (milliseconds) for a clean tab
whose file just changed externally while the user resumes typing. It is rare. The loss is visible:
the typed characters disappear from the screen.
Recoverable: none. The replace is outside undo history, so undo cannot restore the typed text. The
user can see the loss and retype it.
Fix sketch: after the await, skip when `isTabDirty(tab)` (or when `tab.content` changed since
eligibility), and treat that as a conflict, as in Bug A.

---

## Bug C: an externally deleted or renamed open note stays open and later writes recreate it (external-change-5, save-pipeline-7, calendar-2)

Verdict: CONFIRMED_BY_TEST. Severity: corruption (resurrected or duplicate file). Priority: P2.

Trace:
- The watcher batch calls only `reloadExternallyChangedTabs` and then `rebuildAllIndexes`
  (`app-lifecycle.service.ts:480-487`). A rejected read is logged at debug level and the tab is kept
  (`editor.service.ts:390-393`). A dirty tab is not even read (:380).
- `closeTabsForDeletedPath` has one caller, `path-change.service.ts:125`, and runs only for in-app
  operations. The watcher delete branch (`watcher-handler.service.ts:105-108` → `applyNoteChange`
  delete) does not touch the editor (grep of `note-change.service.ts`). The other `removeTab`
  callers (tasks, tags, graph, event-calendar) toggle only virtual tabs.
- `saveFileByPath` → `writeTextFile(path, content)` with no options. With the fetched plugin default
  `create: true`, the file is recreated at the old path.
- calendar-2: `frontmatter-write.service.ts:112-129` takes the tab branch whenever a tab exists and
  calls `saveFileByPath` (create: true). The `exists` check plus `create: false` exist only in the
  closed-note branch (:139-149).
- External folder rename: the old parent directory is gone, so the open with create fails, the user
  gets a toast and the save retries every 5 s. That is not silent. Also, `filter_ancestor_paths`
  (`watcher.rs:87-98`) means the child note path may never be in `changedPaths`.
- Tests: `external-delete.test.ts:68`, `:79`, `:90`: `expect(disk.has(A)).toBe(false)` gives
  `AssertionError: expected true to be false` for the external delete with a later keystroke, the
  external rename a→b with a later keystroke, and the calendar write after an external delete.

Reachability: default settings. git checkout, Finder, Obsidian or a sync client deletes or renames a
note that is open in a tab. A dirty tab resurrects the note within 2 s. A clean tab does so on the
next keystroke or the next calendar drag. Common for git and sync users.
Recoverable: no content is lost. Edits made after the rename land in the resurrected old-path file,
which the user must find and merge by hand. A delete the user meant is undone, and the sync tool may
spread the resurrected file.
Fix sketch: in the watcher batch, when a read for an open tab rejects with not-found, close the tab
(clean) or mark it orphaned and stop autosave (dirty), and prompt. Use `create: false` in
`saveFileByPath` for tabs that were opened from an existing file.

---

Not checked: macOS FSEvents/notify event shapes for rename (assumed both paths are reported; Bug C's
clean-tab path does not depend on it). No E2E run in a real Tauri window.
