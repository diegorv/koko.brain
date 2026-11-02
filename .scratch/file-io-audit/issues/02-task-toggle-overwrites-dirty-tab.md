# 02: Task toggle and deep-link writes save the open dirty tab before writing from disk

**Status:** resolved

Priority: P1 (data loss in a realistic path, nothing to recover from)

**What to build:** Several writers build new note text from the DISK copy, write it, and then call `syncExternalContentToEditor(path, content, true, ...)`. That call sets both `content` and `savedContent` (editor.service.ts:70-91, editor.store.svelte.ts:130-136), so an open tab with unsaved typing is overwritten and marked clean, and the typing never reaches disk:
- `toggleTask` (src/lib/features/tasks/tasks.service.ts:100-115): Rust `toggle_task_status` reads the note from disk (vault.rs:669).
- Daily-note append/prepend (src/lib/app/deep-link-actions.ts:36-64).
- Deep-link `new` with append/prepend/overwrite (src/lib/features/deep-link/deep-link.service.ts:254-300).

This Issue absorbs former issue 03 (deep links), because the root cause and the fix are the same.

Fix: before the disk-based write, if an open tab for that path is dirty, `await saveFileByPath(path)` (editor.service.ts:161). If it returns false, abort the write and show a toast, so the user keeps the buffer. `frontmatter-write.service.ts:111-135` already follows this pattern. Overwrite mode must save too, so the replaced text gets a File History snapshot. Do not change the Rust command.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/features/tasks/tasks.service.ts:100-115, src/lib/app/deep-link-actions.ts:36-64, src/lib/features/deep-link/deep-link.service.ts:254-300, src/lib/core/editor/editor.service.ts:70-91, src/lib/core/editor/editor.service.ts:161

- [x] Failing tests come first. Move `.scratch/file-io-audit/repro/o02-task-toggle/task-toggle-dirty-buffer.test.ts` and `.scratch/file-io-audit/repro/o03-deep-link/deep-link-dirty-buffer.test.ts` under `src/tests/`
- [x] Ticking a task of a note with unsaved typing keeps the typing in the tab and on disk, with the task toggled
- [x] Daily append, daily prepend, and `new` with append, prepend and overwrite keep (or, for overwrite, snapshot) the unsaved typing
- [x] When the pre-save fails, nothing is written and the tab stays dirty with its text
- [x] A clean tab or a closed note behaves as today

## Audit evidence

Source: file I/O audit, deep-dive group(s) o02-task-toggle (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

Reviewer note: read tasks.service.ts toggleTask -> syncExternalContentToEditor(path, updatedContent, true, ...) which calls updateTabContentByPath (marks saved) with no dirty check.

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: cross-cutting-5, save-pipeline-4, fidelity-1, rust-writes-1, recovery-6

**How a user hits it.** Default settings. The user types in note N, clicks the Tasks tab and ticks one of N's tasks within 2 s of the last keystroke, before the 2 s body autosave fires (switchTab does not save). Two quick clicks, realistic but not frequent. While saves are failing (5 s retry loop) the window never closes. Loses everything since the last successful save, usually the last typing burst. Borderline P0 if the owner counts this as a common action.

**Recoverable from.** none: the typed text never reached disk (no file history or backup copy), and MarkdownEditor is destroyed on the switch to the Tasks tab, so the undo history is gone too

**Root cause.** src/lib/features/tasks/tasks.service.ts:114 (syncExternalContentToEditor(..., true, 'none') with no dirty check), combined with src-tauri/src/commands/vault.rs:669 reading the base text from disk

**Evidence.** Typing: editor-extensions.ts:170-189 -> editor.service.ts:226-229 onContentChange -> store.updateContent (content only) + debouncedSave 2000ms (:197). Switch: switchTab/openTasksTab only setActiveIndex (editor.service.ts:250-255, tasks.service.ts:123-136). EditorView.svelte:70-85 renders TasksView instead of MarkdownEditor, and MarkdownEditor.svelte:147-165 destroys the view. Tick: TasksView.svelte:66-68 -> toggleTask -> Rust toggle_task_status_inner reads disk (vault.rs:669), toggles, write_atomic (:683), returns the disk-based text. tasks.service.ts:114 -> editor.service.ts:70-90 markSaved -> editor.store.svelte.ts:130-136 sets content AND savedContent. The pending saveDirtyTabs (:183-194) skips the clean tab. On return, MarkdownEditor onMount (:98-108) builds from tab.content. Contrast frontmatter-write.service.ts:111-135, which saves the dirty buffer first. The only guard is the early return on !changed (tasks.service.ts:106), which applies only when the disk line has no checkbox. Correction to recovery-6: the addToHistory(false) dispatch never runs for the Tasks view (the note is a background tab); undo is lost because the view is destroyed. recovery-6's deep-link/daily-append half (deep-link-actions.ts:52-64, deep-link.service.ts:262/281/298) uses the same pattern, confirmed by trace and owned by the deep-link group.

**Repro test.** `.scratch/file-io-audit/repro/o02-task-toggle/task-toggle-dirty-buffer.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
FAIL > keeps the typed text in the tab and on disk after ticking a task of that note
AssertionError: expected '# Groceries\n- [x] buy milk\n' to contain 'A paragraph the user just typed.'
 ❯ task-toggle-dirty-buffer.test.ts:81:23  expect(tab.content).toContain('A paragraph the user just typed.');
```

**Fix sketch.** In toggleTask, when an open tab for filePath is dirty, await saveFileByPath(filePath) before the IPC and abort if it returns false. Or apply the toggle to tab.content in TS and save that. Fix the deep-link/daily-append writers the same way.

## Audit evidence from former issue 03 (deep links)

Source: file I/O audit, deep-dive group(s) o03-deep-link (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: save-pipeline-3, cross-cutting-6, feature-writers-4

**How a user hits it.** Needs an external automation (Raycast, Shortcuts, clipper) that fires kokobrain://daily or new with append, prepend or overwrite. It hits when the user typed in that note in the last 2 s (the debounced autosave), or while the note's save keeps failing. Default settings. There is no save-on-blur, and nothing flushes before the merge.

**Recoverable from.** none. CodeMirror doc replace uses addToHistory(false), so undo does not restore it. The typing was never saved, so File History has no snapshot.

**Root cause.** src/lib/app/deep-link-actions.ts:54-63 and src/lib/features/deep-link/deep-link.service.ts:257-262, 276-281, 296-298 (disk read + syncExternalContentToEditor(...,true,'none'))

**Evidence.** onContentChange -> updateContent (editor.service.ts:224-227, editor.store.svelte.ts:84-88). The deep link reads the disk copy (deep-link-actions.ts:54), writes disk+clip (:61), then syncs with markSaved=true (:63). That calls updateTabContentByPath (editor.service.ts:78-79), which sets content and savedContent (editor.store.svelte.ts:130-136). saveDirtyTabs then sees a clean tab (editor.service.ts:183-186). MarkdownEditor.svelte:311-336 replaces the doc with addToHistory false. The race-audit test (deep-link.service.race-audit.test.ts:130-160) mocks syncExternalContentToEditor and only pins the call.

**Repro test.** `.scratch/file-io-audit/repro/o03-deep-link/deep-link-dirty-buffer.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
3 failed: AssertionError: expected '# Today\n\nCLIP' to contain 'A sentence the user typed a second ago.' (daily); expected '# Inbox\n\nCLIP' to contain ... (new+append); expected 'CLIP\n# Inbox\n' to contain ... (new+prepend)
```

**Fix sketch.** When the target tab is open and dirty, merge into tab.content instead of the disk copy. Or call saveFileByPath(path) first and abort if it fails. Then write and sync.

## Comments

- 2026-11-02, branch issue/02-task-toggle-overwrites-dirty-tab: task toggle and deep-link daily/new writes now save the open dirty tab before reading from disk, and abort without writing when that save fails. Repro tests moved under src/tests/; a fix round added an edited-task-line test. Full suite (pnpm vitest run && pnpm build) at fe46f1e8: exit=0, 422 files, 9872 tests passed, 1 skipped, 1 todo; build ok. Reviews: round 1 APPROVED, round 2 APPROVED (one optional nit on the refresh assertion, not applied).
