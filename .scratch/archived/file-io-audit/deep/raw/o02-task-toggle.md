# o02-task-toggle: deep dive (raw)

Worktree: /Users/diegorv/Dev/pet-projects/koko/brain/.claude/worktrees/file-io-repro @ 0ba80e6a (identical to main).
No upstream (tauri / CodeMirror) source was needed: every step of both paths is in repo code.

Ids in the item file: cross-cutting-5, save-pipeline-4, fidelity-1, rust-writes-1, recovery-6, rust-writes-2.
Distinct bugs: 2.

---

## Bug A: Tasks-view toggle overwrites a dirty tab with the disk text and marks it clean

Covers: cross-cutting-5, save-pipeline-4, fidelity-1, rust-writes-1, recovery-6.
Verdict: CONFIRMED_BY_TEST. Severity: data-loss. Priority: P1 (see reachability).

### Trace (re-derived)

1. Typing: `editor-extensions.ts:170-189` updateListener -> `onDocChanged` -> `editor.service.ts:226-229 onContentChange` -> `editorStore.updateContent` (sets only `tab.content`, store :84-88) + `scheduleAutoSave('body')` -> `debouncedSave` = `debounce(saveDirtyTabs, 2000)` (:197). The tab is dirty, disk still has the old bytes.
2. Switching to the Tasks tab: `openTasksTab` / `toggleTasksTab` (tasks.service.ts:123-156) and `switchTab` (editor.service.ts:250-255) only call `setActiveIndex`. No save. No blur / visibilitychange save exists (grep of src/lib and src/routes). `EditorView.svelte:70-85`: `TasksView` renders only when the active tab is the Tasks tab, in place of `MarkdownEditor`, so the note is a background tab and `MarkdownEditor` is destroyed (`MarkdownEditor.svelte:147-165`, `view.destroy()`), taking its undo history with it.
3. Tick: `TasksView.svelte:66-68 handleToggle` -> `tasks.service.ts:100-120 toggleTask` -> IPC `toggle_task_status(path, lineNumber)`.
4. Rust `commands/vault.rs:664-690 toggle_task_status_inner`: `std::fs::read_to_string(path)` (disk, without the typing) -> `toggle_task_in_content` -> `vault_fs::write_atomic(path, &updated)` -> returns `updated_content` built from disk.
5. TS `tasks.service.ts:114`: `syncExternalContentToEditor(filePath, updatedContent, true, 'none')` -> `editor.service.ts:70-90`: `markSaved=true` -> `editorStore.updateTabContentByPath` (store :130-136) sets BOTH `tab.content` and `tab.savedContent` to the disk-based text. `'none'` arms no timer.
6. The already armed 2 s autosave fires: `saveDirtyTabs` (:183-194) filters `isTabDirty` -> the tab is clean -> nothing written. Disk = old bytes + toggle.
7. Returning to the note: `MarkdownEditor.svelte:98-108 onMount` builds a fresh `EditorState` from `tab.content` (the toggled disk text).

Result: the typed text is gone from the tab, from disk, and from undo (the view was destroyed). It never reached disk, so neither file history nor any backup holds it. No toast: the IPC succeeded.

### Guards looked for and not found

- No dirty check in `toggleTask` or `syncExternalContentToEditor`. Compare `frontmatter-write.service.ts:111-135`, which flushes the dirty buffer through `saveFileByPath` first.
- `toggle_task_status` takes only `(path, line_number)`; it cannot see the buffer.
- Existing test `src/tests/lib/features/tasks/tasks.service.test.ts` covers the toggle only with a clean tab.
- Early return on `!updateResult.changed` (tasks.service.ts:106): this protects the buffer ONLY when the disk line at `lineNumber` has no checkbox. It does not apply to the normal case.

### Corrections to the claims

- recovery-6 cites `MarkdownEditor.svelte:328-333 addToHistory(false)`. For the Tasks view that dispatch never runs: the note cannot be the active tab while TasksView is showing, so the signal is not bumped (`editor.service.ts:85-87`). Undo is lost anyway because `MarkdownEditor` is destroyed on the switch. The conclusion holds; the mechanism differs.
- recovery-6 also names the daily-note append and deep-link append / prepend / overwrite. I checked `src/lib/app/deep-link-actions.ts:52-64` and `deep-link.service.ts:262, 281, 298`: they use the same `readTextFile` -> write -> `syncExternalContentToEditor(..., true, 'none')` pattern, so the same loss applies. Those paths belong to the deep-link group; I repro'd only the Tasks path here.

### Reachability

Default settings. The window runs from the last keystroke until the 2 s body autosave fires (it does not get longer after the switch, because the debounce keeps running in the background). Inside it, the user has to click the Tasks tab and tick a task in the same note. That takes about 1-1.5 s by hand. It is realistic but not frequent. The window has no limit while saves are failing (5 s retry loop, `SAVE_RETRY_DELAY_MS`). The amount lost is everything since the last successful save, which is usually the last typing burst; a long burst with no 2 s pause is all lost.

P1 rather than P0: the loss is permanent and nothing can bring it back, but it takes a quick two-click sequence inside 2 s of typing (or a failing save). If the owner counts "type, then tick a task in the same note" as a common action, raise it to P0.

### Repro

`src/tests/repro/o02-task-toggle/task-toggle-dirty-buffer.test.ts`. It mocks only `@tauri-apps/api/core` (a fake `toggle_task_status` that matches the Rust inner function: read disk, flip the marker on the 1-based line, write), `@tauri-apps/plugin-fs` and `@tauri-apps/plugin-dialog`. It uses the real editor store, editor service and tasks service. It asserts the CORRECT behavior.

```
FAIL  ... > keeps the typed text in the tab and on disk after ticking a task of that note
AssertionError: expected '# Groceries\n- [x] buy milk\n' to contain 'A paragraph the user just typed.'
 ❯ src/tests/repro/o02-task-toggle/task-toggle-dirty-buffer.test.ts:81:23
     81|   expect(tab.content).toContain('A paragraph the user just typed.');
```

### Fix sketch

In `toggleTask`, before the IPC, if an open tab for `filePath` is dirty, `await saveFileByPath(filePath)` and abort on `false` (the same approach as frontmatter-write.service.ts). Or apply the toggle to `tab.content` in TS and save that. Apply the same fix to the deep-link / daily-append writers.

---

## Bug B: toggle_task_status keys only on the line number, so a stale Tasks list ticks the wrong line

Covers: rust-writes-2.
Verdict: CONFIRMED_BY_TRACE (the defect is in Rust; reaching it needs the TS throttle timing). Severity: corruption. Priority: P2.

### Trace

- `commands/vault.rs:708-713`: `toggle_task_status(path, line_number)`. No expected text, hash or mtime.
- `vault/parsing.rs:1873-1906 toggle_task_in_content`: takes line `line_number - 1` and flips the TASK_RE / ORDERED_TASK_RE group-2 marker on whatever task is on that line.
- The list's line numbers come from the Rust `VaultIndex` (`get_all_tasks_v2` / `get_tasks_in_section_v2`, tasks.service.ts:54-73). It refreshes only on TasksView mount (`TasksView.svelte:77-82`, effect on `vaultIndexVersion`), after its own toggle (tasks.service.ts:115), and on the throttled version bump (`tauri-listeners.service.ts:84-88`: 2 s after an isolated event, or no sooner than 10 s after the previous refresh).

The list and disk can disagree in two ways:

1. List behind disk (the claim's scenario). The user inserts `- [ ] new` above `- [ ] buy milk` and switches to the Tasks tab less than 1 s after the last keystroke. The layout content effect (`+layout.svelte:135-155`, 1 s) is then cleared by the activeTabPath change, so the index still has the old lines when TasksView mounts. The 2 s autosave writes the new bytes; `notifyAfterSave` -> `applyNoteChange('save')` -> `update_note_in_index` emits, but the version bump waits 2-10 s (typing pauses emit their own events, so a recent refresh is likely and the 10 s spacing applies). If the user clicks `buy milk` in that window, Rust toggles the line that now holds `new`. External edits behave the same way (watcher -> `update_note_in_index` -> throttled bump).
2. List ahead of disk (found during this dive, same root cause). After a 1 s typing pause, the `edit` source DOES call `update_note_in_index` with the unsaved buffer (`note-change.service.ts:86-88`, `rust: 'deduped'`), so the list shows the buffer's line numbers while disk still has the old bytes. A tick between the switch and the 2 s autosave applies the buffer's line number to the old disk text. This overlaps Bug A, which then also wipes the typing.

### Impact

A different task line is checked or unchecked on disk. When the line at that number has no checkbox, the toggle is a no-op. It is not fully silent: `buildTaskIndex` runs right after the toggle, so the list shows the wrong task flipped and the clicked one unchanged. One more click reverses it (it toggles back), and the edit is also in file history after the next save. So it is a wrong edit that can be undone, not lost content. P2.

### Fix sketch

Send the task text (or the line's text / content hash) the list showed, and have `toggle_task_status_inner` check that the line still matches. On a mismatch, find the task by text, or return a "stale" error so TS refetches the list.

---

## Not verified

- I did not run the Rust side (cargo is not allowed). The fake toggle in the repro was written from vault.rs:664-690 and parsing.rs:1873-1906 as read here.
- No real-app timing measurement of the throttle window for Bug B. The 2-10 s figure comes from the constants in tauri-listeners.service.ts.
