# 02 Ticking a task in the Tasks view replaces unsaved typing in that note

Status: needs-triage
Priority: P1
Severity: data-loss
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
