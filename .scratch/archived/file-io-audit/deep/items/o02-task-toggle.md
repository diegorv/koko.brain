# Deep-dive group o02-task-toggle

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## cross-cutting-5: Task checkbox toggle replaces the open note's unsaved buffer with disk content and marks it clean
- claimed severity: data-loss
- anchor: src/lib/features/tasks/tasks.service.ts:114
- scenario: Type in note N (dirty, under 2 s or a failing save), then tick one of N's tasks in the Tasks view. The typed text disappears, the tab shows clean, and there is no toast.
- evidence given: READ: Rust reads disk (vault.rs:669) and write_atomic (vault.rs:683). TS then calls syncExternalContentToEditor(path, updated, true, 'none') at tasks.service.ts:114, and updateTabContentByPath sets content and savedContent (editor.store.svelte.ts:130-136). Contrast frontmatter-write.service.ts:113-131, which patches the buffer. Same as rust-writes F1 and SP-4.

## save-pipeline-4: Task toggle in the Tasks tab rewrites the note from disk and overwrites the open tab's unsaved edits
- claimed severity: data-loss
- anchor: src/lib/features/tasks/tasks.service.ts:114
- scenario: Type in note N, switch to the Tasks tab within 2 s (or while N's save is failing), and tick a checkbox that belongs to N. N's tab is replaced by disk content plus the toggle and marked saved, and the typed text is lost.
- evidence given: READ: tasks.service.ts:100-115 calls toggle_task_status, then syncExternalContentToEditor(filePath, updatedContent, true, 'none'). Rust toggle_task_status_inner reads from disk (vault.rs:669) and writes (vault.rs:683). TasksView renders only in the virtual Tasks tab (EditorView.svelte:71), so the edited note's tab is still open and dirty.

## fidelity-1: Task toggle in Tasks view replaces unsaved edits of the same note with disk text and marks the tab clean
- claimed severity: data-loss
- anchor: src/lib/features/tasks/tasks.service.ts:114
- scenario: Type in note N, within 2 s switch to the Tasks tab (switchTab does not save) and tick a task in N. Rust reads disk, toggles, writes; TS sets tab content and savedContent to the disk-based text. The typed paragraph is gone from editor and disk; file history has no copy.
- evidence given: editor.service.ts:250-255 (switchTab no save), :197 (2 s debounce); tasks.service.ts:100-114; vault.rs:664-683 (reads disk at :669); editor.service.ts:78-80 -> editor.store.svelte.ts:130-136 (content+savedContent); saveDirtyTabs filters clean tabs editor.service.ts:183-187; file-history.service.ts:190-196 snapshots only saved content. Same class: deep-link-actions.ts:54-63, deep-link.service.ts:257-262, :276-281 (mapped by scout-deep-link L2).

## rust-writes-1: Ticking a task in the Tasks tab deletes unsaved typing in that note
- claimed severity: data-loss
- anchor: src/lib/features/tasks/tasks.service.ts:114
- scenario: Type a line in note A, switch to the Tasks tab (switching does not save), and tick a task from A within about 2 s of the last keystroke. Rust reads and toggles the disk version, which lacks the typing. TS then sets both tab.content and savedContent to that result. The pending autosave finds nothing dirty, and the remounted editor shows the toggled disk text. The typing is lost from memory and disk, the undo history is gone, and file history has no copy.
- evidence given: Rust reads disk at commands/vault.rs:669-670 and writes at :683. TS calls syncExternalContentToEditor(path, updated, true, 'none') at tasks.service.ts:114, which reaches updateTabContentByPath at editor.store.svelte.ts:130-136. saveDirtyTabs skips the now-clean tab (editor.service.ts:184-187), switchTab does not save (editor.service.ts:250-255), and the remounted MarkdownEditor builds from tab.content (MarkdownEditor.svelte:99-108). Other writers handle this correctly: frontmatter-write.service.ts:111-135 and link-updater.service.ts:33-35 use the dirty buffer. The only test (tasks.service.test.ts:190-201) uses a clean tab.

## recovery-6: Task toggle, daily append and deep-link append/prepend/overwrite replace a dirty buffer, outside both CM undo and history
- claimed severity: data-loss
- anchor: src/lib/features/tasks/tasks.service.ts:114
- scenario: The user types in a note (within 2 s of the last keystroke, or while autosave is failing), then ticks one of its tasks in the Tasks tab, or a hotkey capture appends to the open daily note. Rust or TS rebuilds the file from disk and the tab is set to that text, marked saved. The dispatch uses addToHistory(false), so the typed text is gone from the tab, the disk, undo and history.
- evidence given: vault.rs:669 reads from disk and :683 writes; tasks.service.ts:114 syncs with markSaved=true; editor.store.svelte.ts:130-136 sets content and savedContent; MarkdownEditor.svelte:328-333 applies addToHistory(false). Same pattern: deep-link-actions.ts:54-64; deep-link.service.ts:255-262, 274-281, 296-298

## rust-writes-2: A Tasks list a few seconds stale can tick the wrong task
- claimed severity: corruption
- anchor: src-tauri/src/commands/vault.rs:708
- scenario: Insert '- [ ] new' above '- [ ] buy milk' (line 10), switch to Tasks within 2 s, and let the autosave land. The list still shows buy milk at line 10 until the throttled index bump (2 s, up to 10 s in a burst). Clicking buy milk toggles line 10, so 'new' gets checked instead. An edit from an outside tool while the Tasks tab is open hits the same window.
- evidence given: toggle_task_status takes only (path, line_number) at commands/vault.rs:708-713. toggle_task_in_content flips whatever task marker is on that line, with no text, hash or mtime check (vault/parsing.rs:1873-1906). The list refreshes only on mount, after its own toggle (tasks.service.ts:115), or on a throttled vaultIndexVersion bump (tauri-listeners.service.ts:84-88, TasksView.svelte:77-82).
