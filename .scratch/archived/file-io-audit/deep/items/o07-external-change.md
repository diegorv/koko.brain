# Deep-dive group o07-external-change

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## external-change-1: An external change to a note with unsaved edits is overwritten by the next autosave, and the external version is never kept
- claimed severity: data-loss
- anchor: src/lib/core/editor/editor.service.ts:380
- scenario: Type one character in note N (tab is now dirty). Within 2 s, git pull, a sync tool or another editor rewrites N. The watcher reload skips N because the tab is dirty. The autosave then writes the old buffer plus the character over N. The external content is gone from disk, file history has no copy, and no warning is shown. A sync tool then spreads the app's version to other devices. The window is wider than 2 s: a reload only lands after the 500 ms Rust gap, the tree rescan, the 300 ms TS debounce and any queued batch, and a keystroke typed during that lead time makes the tab dirty.
- evidence given: editor.service.ts:378-381: dirty tabs are skipped; comment :371-373 says 'the editor always wins'; pinned by the test at editor.service.test.ts:1150. saveFileByPath at :161-178 does writeTextFile with no mtime or content precondition and no conflict copy; autosave timers at :183-200. File history snapshots only after-save content (file-history.service.ts:189-195, editor.hooks.ts:85-91), and the watcher path never snapshots (watcher-handler.service.ts:86-116). A grep for conflict handling in src/lib found nothing. Latency stages: watcher.rs:222, fs.watcher.ts:157-185, app-lifecycle.service.ts:481-493.

## save-pipeline-8: A dirty tab silently overwrites an incoming external change on the next autosave ('editor always wins')
- claimed severity: data-loss
- anchor: src/lib/core/editor/editor.service.ts:380
- scenario: A sync or git pull rewrites N while N has edits under 2 s old (or a failing save). Autosave writes the buffer over the incoming version. No conflict copy is made and no history snapshot of the external bytes exists, so the external change is unrecoverable.
- evidence given: READ: editor.service.ts:369-381 skips dirty tabs on purpose; saveFileByPath (161-170) writes with no disk or mtime check against savedContent; history snapshots come only from editor saves (editor.hooks.ts:85-91).

## external-change-2: The reload apply does not re-check dirty state after its read, so keystrokes or Properties edits made during the read are replaced by disk content
- claimed severity: data-loss
- anchor: src/lib/core/editor/editor.service.ts:398
- scenario: Clean note N is changed on disk, and the watcher batch starts readTextFile(N). Before the read resolves, the user types 'abc' or changes a property. The apply step sets content and savedContent to the disk text and replaces the CodeMirror doc outside undo history. 'abc' disappears, and no autosave is armed, so it is never written anywhere.
- evidence given: Eligibility, including isTabDirty, is checked before the await at editor.service.ts:378-382. The reads are awaited together with allSettled at :385-387. After the await, :397-398 checks only that the tab exists and that disk differs from savedContent. :401 calls syncExternalContentToEditor(path, disk, true, 'none'), which reaches updateTabContentByPath (editor.store.svelte.ts:130-136); MarkdownEditor.svelte:311-337 then replaces the doc with addToHistory false. Keystrokes update the store synchronously (editor-extensions.ts:170-189, editor.service.ts:224-227), so the dirty state exists but is never re-read. Property edits go through properties.service.ts:95 and updateTabContentOnly. The window is the slowest eligible read.

## save-pipeline-13: Keystrokes typed during short async windows (watcher reload read, link or type rename write, close-handler awaits) are overwritten or dropped
- claimed severity: minor
- anchor: src/lib/core/editor/editor.service.ts:398
- scenario: A clean tab gets an external change. The user types while readTextFile is pending, then the reload replaces the doc with disk content and marks it saved. The same happens during the link-updater and renameType writes, and during the close handler's calendar drain and settings flush.
- evidence given: READ: editor.service.ts:380 checks dirty before the read but :398 compares only savedContent, then :401 markSaved=true; link-updater.service.ts:33-47; type-definitions.service.ts:213-220; tauri-listeners.service.ts:55-71.

## external-change-5: A note deleted or renamed outside the app stays open, and the next autosave recreates it at the old path
- claimed severity: corruption
- anchor: src/lib/core/editor/editor.service.ts:391
- scenario: git checkout removes note N while it is open and dirty, and within 2 s the autosave writes N back as an untracked file. If N was clean, it comes back on the next keystroke. An external rename a.md to b.md leaves the tab on a.md, and the next save creates a duplicate a.md while links and the explorer point at b.md. For an external folder rename, the save fails with a toast and retries every 5 s.
- evidence given: editor.service.ts:391-393: a rejected reload read is only logged at debug level and the tab is kept. closeTabsForDeletedPath has one caller, path-change.service.ts:125 (in-app operations only). editor.service.ts:168 calls writeTextFile with no options, and the fetched plugins-workspace v2 commands.rs defaults to create plus truncate. The watcher removes the old path from the indexes (watcher-handler.service.ts:105-108). Save retry at editor.service.ts:173-177 and :191-193.

## save-pipeline-7: External rename or delete of an open note leaves the tab on the old path; the next autosave resurrects the old file
- claimed severity: corruption
- anchor: src/lib/core/editor/editor.service.ts:391
- scenario: A.md is open. A sync client, Obsidian, Finder or git mv renames it to B.md. The user keeps typing, or the tab was already dirty. Autosave recreates A.md with the newest text while B.md keeps the older text, and a deleted note comes back.
- evidence given: READ: the watcher batch only calls reloadExternallyChangedTabs (app-lifecycle.service.ts:481-487), which skips failed reads silently (editor.service.ts:391-393). Tabs are retargeted or closed only by the in-app applyPathChange (path-change.service.ts:125,132). saveFileByPath writes with the default create:true (editor.service.ts:168; plugin default fetched).

## calendar-2: Calendar drag recreates a note deleted or renamed outside the app while its tab is open (Issue 59 invariant holds only for closed notes)
- claimed severity: corruption
- anchor: src/lib/core/editor/editor.service.ts:168
- scenario: User deletes Standup.md in Finder, git or a sync tool while it is open in a tab, then drags the Standup event within the 2-10 s before the index bump. The note is recreated from the tab buffer, a 'Move event' op is recorded, and the note is re-indexed, with no error. An external rename yields a duplicate at the old path.
- evidence given: The tab closes only in applyPathChange (path-change.service.ts:125). The external-reload read failure is swallowed (editor.service.ts:391-393). The throttled bump keeps the event visible (tauri-listeners.service.ts:85-88). updateNoteFrontmatter finds the tab (frontmatter-write.service.ts:112), then saveFileByPath calls writeTextFile with no options, and create defaults to true (FETCHED plugins-workspace v2 fs commands.rs). The calendar settles and records (event-calendar.service.ts:793-794). create:false exists only in the closed branch (frontmatter-write.service.ts:146-149).

## calendar-1: Calendar write on an open, clean tab overwrites an external edit that landed within the reload window
- claimed severity: data-loss
- anchor: src/lib/core/frontmatter/frontmatter-write.service.ts:115
- scenario: A note is open in a clean background tab. A sync client or git rewrites it on disk. Within about 1 s (500 ms Rust debounce plus 300 ms TS debounce) the user drags that event. The disk then holds the stale tab buffer plus the new date/start, and the external edit is gone with no warning. Without the calendar, a clean tab would never have saved.
- evidence given: tab branch uses base = tab.content (frontmatter-write.service.ts:112-115), builds next (:124), syncs it into the tab (:128), then saveFileByPath writes the whole buffer (:129, editor.service.ts:161-168). The reload runs only from runWatcherBatch (app-lifecycle.service.ts:480-493). After the calendar write, reloadExternallyChangedTabs skips because diskContent === savedContent (editor.service.ts:398).
