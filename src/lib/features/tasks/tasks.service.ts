import { toast } from 'svelte-sonner';
import { call } from '#lib/contracts/ipc.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { saveFileByPath } from '#lib/core/editor/editor.service.js';
import { findTabIndex, isTabDirty, TASKS_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';
import { settleTaskWrite } from '#lib/core/filesystem/task-write.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { tasksStore } from './tasks.store.svelte';
import { buildTaskRows } from './task-query.logic';
import { statusMenuLabel, toggleTarget } from './task-status.logic';
import { compareTaskPaths, parseSectionTags, parseTasksView, taskDisplayText, withSectionTag } from './tasks.logic';
import type { TaskStatus } from './task-metadata.types';
import type { FileTaskGroup, TaskItem } from './tasks.types';
import type { FileTaskGroupV2 } from '#lib/types/vault-v2.types.js';
import { debug, error, timeAsync } from '#lib/utils/debug.js';

/**
 * Converts a `FileTaskGroupV2` (Rust, modifiedAt in seconds) into the
 * TS-side `FileTaskGroup` shape used by the store. Rust `NoteEntry`
 * carries `modifiedAt` in seconds since epoch; the FE filter logic
 * (`applyQuickFilters`' Note edited options) compares against `Date.now()`, which is milliseconds.
 * Multiply by 1000 here so the rest of the TS path keeps using ms.
 */
function fromV2(group: FileTaskGroupV2): FileTaskGroup {
	return {
		filePath: group.filePath,
		fileName: group.fileName,
		modifiedAt: group.modifiedAt * 1000,
		tasks: group.tasks.map((t) => ({
			text: t.text,
			checked: t.checked,
			indent: t.indent,
			lineNumber: t.lineNumber,
			status: t.status,
			metadata: {
				description: t.metadata.description,
				dueDate: t.metadata.dueDate,
				scheduledDate: t.metadata.scheduledDate,
				startDate: t.metadata.startDate,
				createdDate: t.metadata.createdDate,
				doneDate: t.metadata.doneDate,
				cancelledDate: t.metadata.cancelledDate,
				priority: t.metadata.priority,
				recurrence: t.metadata.recurrence,
				id: t.metadata.id,
				dependsOn: t.metadata.dependsOn,
				onCompletion: t.metadata.onCompletion,
				tags: t.metadata.tags,
			},
		})),
	};
}

/**
 * Sequence number of the latest `buildTaskIndex` call. The IPCs are async,
 * so an older call (a toggle's refetch, then the throttled version bump)
 * can resolve after a newer one; only the latest may write the store.
 */
let latestTaskIndexRequest = 0;

/** What the Tasks view shows when the latest refresh failed; the raw error goes to the log. */
const TASKS_REFRESH_ERROR = 'Tasks could not be refreshed. The log has the details.';

/** Number of `resetTasks` calls, so a caller can tell whether the store was reset since it looked. */
let tasksResetGeneration = 0;

/**
 * Returns how many times `resetTasks` has run. Capture it, then compare later:
 * a different value means the store was reset (a vault switch) in between,
 * and work begun before it must not write the new vault's store.
 */
export function getTasksResetGeneration(): number {
	return tasksResetGeneration;
}

/**
 * Fetches the full task index from the Rust `VaultIndex`. When
 * `parseSectionTags(sectionTag)` yields any tag, fans out to
 * `get_tasks_in_section_v2` with that list instead; otherwise calls
 * `get_all_tasks_v2`. Phase 7.6 — Rust now owns task
 * parsing end-to-end (see `src-tauri/src/vault/parsing.rs::extract_tasks`).
 * Groups, and their rows (`buildTaskRows`), are stored in path order
 * (`compareTaskPaths`), not the newest-first order Rust sends, so a toggle
 * that rewrites a note does not move it.
 * A call superseded by a newer one (or by `resetTasks`) while in flight
 * leaves the store, the loading flag, `hasLoaded` and error reporting to the
 * newer call. The latest call sets `hasLoaded` once it settles, on success or
 * failure, so the view swaps "Indexing tasks..." for the list or the empty
 * state only after the current vault's first fetch. The latest call's failure
 * sets `tasksStore.error` to a fixed message and leaves the groups as they
 * were; only a later success clears it.
 */
export async function buildTaskIndex(): Promise<void> {
	const request = ++latestTaskIndexRequest;
	tasksStore.setLoading(true);
	try {
		await timeAsync('TASKS', 'buildTaskIndex', async () => {
			const sectionTags = parseSectionTags(tasksStore.sectionTag);
			const v2 = sectionTags.length > 0
				? await call('get_tasks_in_section_v2', { sectionTags })
				: await call('get_all_tasks_v2');
			if (request !== latestTaskIndexRequest) return;
			const groups = v2.map(fromV2).sort((a, b) => compareTaskPaths(a.filePath, b.filePath));
			tasksStore.setFileTaskGroups(groups);
			tasksStore.setRows(buildTaskRows(groups, vaultStore.path));
			tasksStore.setError(null);
			let total = 0;
			for (const g of groups) total += g.tasks.length;
			debug('TASKS', `Tasks: ${groups.length} files, ${total} tasks`);
		});
	} catch (err) {
		if (request === latestTaskIndexRequest) {
			error('TASKS', 'buildTaskIndex failed:', err);
			tasksStore.setError(TASKS_REFRESH_ERROR);
		}
	} finally {
		if (request === latestTaskIndexRequest) {
			tasksStore.setLoading(false);
			tasksStore.setHasLoaded(true);
		}
	}
}

/**
 * Updates the section-tag text (one or more tags), saves it as typed in the
 * vault's settings (`tasksView.sectionTag`), and refetches groups via
 * `buildTaskIndex`. Text holding at least one tag runs the Rust
 * `get_tasks_in_section_v2` scan, which re-reads from disk every note that
 * has tasks, on a blocking thread, to apply heading-level filtering. Typing here is not its only trigger: the
 * store's default tag is non-empty, so the `TasksView` `vaultIndexVersion`
 * effect (which also runs on mount) and each task toggle pay the same scan.
 */
export async function updateSectionTagFilter(tag: string): Promise<void> {
	tasksStore.setSectionTag(tag);
	// Saved as typed into the settings store only: settings persistence writes the
	// file, and holds the guard for a session whose settings.json was never loaded.
	settingsStore.updateTasksView(withSectionTag(settingsStore.tasksView, tag));
	await buildTaskIndex();
}

/**
 * Applies the section tags saved in this vault's settings (`tasksView`) to the
 * Tasks store. Always sets the tag, `#to-list` included, so a vault without a
 * saved value never keeps the previous vault's tag. An invalid value is logged
 * and toasted but left in settings untouched: the next section tag change
 * replaces it. Writes nothing and starts no fetch (the view fetches on mount).
 */
export function loadSavedTasksView(): void {
	const raw = settingsStore.tasksView;
	const { sectionTag, valid } = parseTasksView(raw);
	if (!valid) {
		error('TASKS', 'Invalid tasksView in settings.json:', raw);
		toast.error('The saved Tasks section tags could not be read, so #to-list is used.');
	}
	tasksStore.setSectionTag(sectionTag);
}

/**
 * Writes `target` as the status of `task` via the Rust `toggle_task_status`
 * command, and returns true only when the line was rewritten. Rust does the
 * read → check → write → `VaultIndex` update → emit chain. The Rust update
 * emits `vault-index-updated`; panels react via `vaultStore.vaultIndexVersion`.
 * Search, the per-file consumers and the content caches are refreshed by
 * `afterTaskWrite`.
 *
 * A `target` equal to `task.status` returns false before anything runs: no
 * save, no IPC, no Undo dismissal. Rust would not skip it (it rewrites `[X]`
 * to `[x]`), and bits-ui calls a radio group's `onValueChange` again when the
 * checked item is picked. Any real write retires the menu's Undo toast.
 *
 * The list can lag disk by seconds, so Rust writes only when the line at
 * `task.lineNumber` still holds `task.text` with `task.status`. Otherwise
 * the result is `stale`: the list is refetched and the user asked to try
 * again.
 *
 * On a changed result the Tasks store is refetched right away: the version
 * bump is throttled (2 s, up to 10 s during a burst), and the clicked
 * checkbox must not look unclicked until then.
 *
 * The open editor tab gets `syncExternalContentToEditor` (in
 * `settleTaskWrite`) so the change is visible without waiting for the
 * watcher to round-trip the file change.
 *
 * Rust writes the DISK copy and the sync marks the tab saved, so a dirty
 * open tab is saved first or its unsaved typing would be overwritten. If
 * that save fails nothing is written. `lineNumber` comes from the index of
 * the disk copy, so when the saved typing moved that line the write is
 * skipped and the list refreshed instead of changing whatever line is there.
 * The check compares line text only: if the shift leaves an identical line
 * at `lineNumber` (a duplicated task), that line is the one written.
 */
export async function setTaskStatus(
	filePath: string,
	task: Pick<TaskItem, 'text' | 'status' | 'lineNumber'>,
	target: TaskStatus,
): Promise<boolean> {
	if (target === task.status) return false;
	dismissStatusUndo();
	const { lineNumber } = task;
	try {
		const tab = editorStore.tabs.find((t) => t.path === filePath);
		if (tab && isTabDirty(tab)) {
			const diskLine = lineAt(tab.savedContent, lineNumber);
			if (!(await saveFileByPath(filePath))) {
				toast.error('Task not changed: the note could not be saved.');
				return false;
			}
			const saved = editorStore.tabs.find((t) => t.path === filePath)?.savedContent;
			if (saved === undefined || lineAt(saved, lineNumber) !== diskLine) {
				await buildTaskIndex();
				toast.info('The note changed, so the list was refreshed. Try again.');
				return false;
			}
		}
		const result = await call('toggle_task_status', {
			path: filePath,
			lineNumber,
			expectedText: task.text,
			expectedStatus: task.status,
			target,
		});
		if (result.stale) {
			await buildTaskIndex();
			toast.info('The task changed on disk, so the list was refreshed. Try again.');
			return false;
		}
		if (!result.updateResult.changed) {
			return false;
		}
		await afterTaskWrite(filePath, result.updatedContent);
		return true;
	} catch (err) {
		error('TASKS', 'Failed to set task status:', err);
		toast.error('Failed to save task change.');
		return false;
	}
}

/** Toggles a task: writes `toggleTarget(task.status)` through `setTaskStatus`. Shows no Undo toast. */
export async function toggleTask(filePath: string, task: TaskItem): Promise<void> {
	await setTaskStatus(filePath, task, toggleTarget(task.status));
}

/** Id of the shown Undo toast of the last menu write, or null. Only that write can be undone. */
let statusUndoToastId: string | number | null = null;

/** Dismisses the menu write's Undo toast while one is shown. */
function dismissStatusUndo(): void {
	if (statusUndoToastId === null) return;
	toast.dismiss(statusUndoToastId);
	statusUndoToastId = null;
}

/**
 * A row menu's status change: `setTaskStatus`, then a `Task marked <Label>`
 * toast whose Undo writes `task.status` back. No toast when nothing was
 * written or the vault switched during the write. Undo does nothing after a
 * vault switch (the command writes any absolute path), and goes through
 * `setTaskStatus`, so it shows no toast of its own.
 */
export async function setTaskStatusFromMenu(filePath: string, task: TaskItem, target: TaskStatus): Promise<void> {
	const generation = tasksResetGeneration;
	if (!(await setTaskStatus(filePath, task, target)) || generation !== tasksResetGeneration) return;
	const forget = (t: { id: string | number }) => {
		if (statusUndoToastId === t.id) statusUndoToastId = null;
	};
	// An overlapping menu write may have stored its id after this write's start-of-write dismiss.
	dismissStatusUndo();
	statusUndoToastId = toast(`Task marked ${statusMenuLabel(target)}`, {
		description: taskDisplayText(task),
		onDismiss: forget,
		onAutoClose: forget,
		action: {
			label: 'Undo',
			onClick: () => {
				if (generation !== tasksResetGeneration) return;
				void setTaskStatus(filePath, { text: task.text, lineNumber: task.lineNumber, status: target }, task.status);
			},
		},
	});
}

/**
 * Settles a note a Rust task command wrote (`settleTaskWrite`), then
 * refetches the Tasks store right away instead of waiting for the throttled
 * version bump.
 * @param path - absolute path of the written note
 * @param updatedContent - the note's content after the write
 */
async function afterTaskWrite(path: string, updatedContent: string): Promise<void> {
	settleTaskWrite(path, updatedContent);
	await buildTaskIndex();
}

/** Returns the 1-based `lineNumber` line of `content` (undefined past the end). */
function lineAt(content: string, lineNumber: number): string | undefined {
	return content.split('\n')[lineNumber - 1];
}

/** Opens or focuses the Tasks tab. Creates it if it doesn't exist. */
export function openTasksTab(): void {
	const existingIndex = findTabIndex(editorStore.tabs, TASKS_VIRTUAL_PATH);
	if (existingIndex >= 0) {
		editorStore.setActiveIndex(existingIndex);
		return;
	}
	editorStore.addTab({
		path: TASKS_VIRTUAL_PATH,
		name: 'Tasks',
		content: '',
		savedContent: '',
		fileType: 'tasks',
	});
}

/** Closes the Tasks tab if it exists. */
export function closeTasksTab(): void {
	const index = findTabIndex(editorStore.tabs, TASKS_VIRTUAL_PATH);
	if (index >= 0) {
		editorStore.removeTab(index);
	}
}

/** Toggles the Tasks tab: opens if closed, closes if active, focuses if open but not active. */
export function toggleTasksTab(): void {
	const existingIndex = findTabIndex(editorStore.tabs, TASKS_VIRTUAL_PATH);
	if (existingIndex < 0) {
		openTasksTab();
	} else if (existingIndex === editorStore.activeIndex) {
		editorStore.removeTab(existingIndex);
	} else {
		editorStore.setActiveIndex(existingIndex);
	}
}

/**
 * Resets all task state. Advancing the request counter discards any
 * `buildTaskIndex` call still in flight, so a scan of the previous vault
 * cannot write into the reset store. Raises `getTasksResetGeneration()` and
 * dismisses a menu write's Undo toast.
 */
export function resetTasks(): void {
	latestTaskIndexRequest++;
	tasksResetGeneration++;
	dismissStatusUndo();
	tasksStore.reset();
	closeTasksTab();
}
