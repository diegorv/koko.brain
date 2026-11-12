---
summary: "Tasks view: lists open or all checkbox tasks grouped by note, filtered by heading tag and date, and toggles task status through Rust."
---

## Responsibility

Owns the Tasks list UI and state: section-tag, date and hide-closed filters, the path-ordered task index built from the Rust VaultIndex, the toggle flow that writes a task's checkbox back to disk, and the Tasks virtual editor tab. Task parsing and the section-tag filter are not here: Rust extracts tasks and filters them by heading (src-tauri/src/vault/task.rs, parsing.rs). It does not own the editor, vault index, watcher or Todoist sync; it calls into core/editor, core/filesystem and core/settings, and reads the vault version core/vault publishes.

## Key files

- `src/lib/features/tasks/tasks.service.ts`: buildTaskIndex, toggleTask, updateSectionTagFilter, loadSavedTasksView, Tasks tab open and close, resetTasks.
- `src/lib/features/tasks/tasks.store.svelte.ts`: groups, date filter, section tag, hide-completed, loading, error, scroll offset.
- `src/lib/features/tasks/tasks.logic.ts`: Pure filters, section tag parsing, tasksView parsing, empty-state explanation, display text and chips, path ordering.
- `src/lib/features/tasks/task-status.logic.ts`: Open versus closed, toggle target, status glyphs.
- `src/lib/features/tasks/task-headings.logic.ts`: Heading ancestor chains and tag-aware heading matching (matchesHeading); only tests and a parity fixture use it.
- `src/lib/features/tasks/TasksView.svelte`: Toolbar, grouped rows, toggle and open-note clicks, refetch on vault index version.
- `src/lib/features/tasks/tasks.types.ts`: TaskItem, FileTaskGroup, TaskDateFilter.

## State

- tasksStore: fileTaskGroups, dateFilter, sectionTag, hideCompleted, isLoading, hasLoaded, error, scrollOffset (non-reactive).
- tasksResetGeneration and latestTaskIndexRequest counters in tasks.service.ts.
- Persisted setting tasksView in the vault settings, written through settingsStore.updateTasksView from updateSectionTagFilter.
- A virtual editor tab at TASKS_VIRTUAL_PATH.

## Collaborators

- `IPC:get_all_tasks_v2`: buildTaskIndex when no section tag is set.
- `IPC:get_tasks_in_section_v2`: buildTaskIndex when the section tag yields tags; re-reads notes with tasks.
- `IPC:toggle_task_status`: toggleTask sends expectedText, expectedStatus and target; Rust writes the line and returns stale or an update result.
- `event:vault-index-updated`: Not listened to here; TasksView refetches on each vaultIndexVersion bump.
- `src/lib/core/editor`: toggleTask saves a dirty open tab; tab open and close for the Tasks tab; openFileInEditor and openNoteAt from TasksView; TASKS_VIRTUAL_PATH.
- `src/lib/core/filesystem`: settleTaskWrite syncs the open editor tab and caches after a Rust task write.
- `src/lib/core/vault`: vaultIndexVersion refetch trigger and vaultStore.path.
- `src/lib/core/settings`: tasksView setting; parseTasksView validates it.
- `src/lib/contracts`: call() wrapper and generated TaskPriority, TaskStatus, RecurrenceRule, TaskMetadata types.
- `src/lib/features/file-icons`: TasksView resolves icons and colors for source notes.
- `src/lib/app`: EditorView mounts TasksView; commands and global-keybindings call toggleTasksTab; app-lifecycle calls loadSavedTasksView and resetTasks.
- `src/lib/features/event-calendar`: EventTaskChip imports isTaskOpen from task-status.logic.

## Gotchas

- buildTaskIndex discards a response that is not the latest request (latestTaskIndexRequest), so only the newest call writes the store.
- resetTasks advances the request counter and tasksResetGeneration so work begun before a vault switch cannot write the new vault's store.
- Rust sends groups newest-first. fromV2 converts modifiedAt from seconds to milliseconds and groups are sorted with compareTaskPaths so a toggle does not reorder notes.
- toggleTask compares only the line text at lineNumber after saving a dirty tab, so a duplicated line can be toggled instead of the intended one.
- Done and cancelled are closed. Rust's checked flag is true for every status except todo, so isTaskOpen reads only the status.
- The section filter runs in Rust (extract_tasks_from_sections in src-tauri/src/vault/parsing.rs) as a case-sensitive substring match on heading text, so #to-list also matches #to-listing. The tag-aware matchesHeading in task-headings.logic.ts, which would not, has no production caller.
- TasksView's onDestroy writes a pending tag only if no reset happened in between, to avoid writing the old vault's tag into the new one.
- The view refetches on every vaultIndexVersion bump and a section-tag fetch re-reads notes with tasks from disk, so each toggle pays that scan.
- tasksView is stored unvalidated; only parseTasksView validates it, and an invalid value stays in settings until the next tag change.
