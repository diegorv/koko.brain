import { toast } from 'svelte-sonner';
import { call } from '#lib/contracts/ipc.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { saveFileByPath, syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { findTabIndex, isTabDirty, TASKS_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';
import { markRecentSave } from '#lib/core/editor/editor.hooks.js';
import { applyNoteChange, notifyContentInvalidated } from '#lib/core/filesystem/note-change.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { tasksStore } from './tasks.store.svelte';
import { toggleTarget } from './task-status.logic';
import type { FileTaskGroup, TaskItem } from './tasks.types';
import type { FileTaskGroupV2 } from '#lib/types/vault-v2.types.js';
import { debug, error, timeAsync } from '#lib/utils/debug.js';

/**
 * Converts a `FileTaskGroupV2` (Rust, modifiedAt in seconds) into the
 * TS-side `FileTaskGroup` shape used by the store. Rust `NoteEntry`
 * carries `modifiedAt` in seconds since epoch; the FE filter logic
 * (`filterByDate`) compares against `Date.now()` which is milliseconds.
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

/**
 * Fetches the full task index from the Rust `VaultIndex`. When a
 * `sectionTag` is set, fans out to `get_tasks_in_section_v2` instead;
 * otherwise calls `get_all_tasks_v2`. Phase 7.6 — Rust now owns task
 * parsing end-to-end (see `src-tauri/src/vault/parsing.rs::extract_tasks`).
 * A call superseded by a newer one (or by `resetTasks`) while in flight
 * leaves the store, the loading flag and error reporting to the newer call.
 */
export async function buildTaskIndex(): Promise<void> {
	const request = ++latestTaskIndexRequest;
	tasksStore.setLoading(true);
	try {
		await timeAsync('TASKS', 'buildTaskIndex', async () => {
			const sectionTag = tasksStore.sectionTag.trim();
			const v2 = sectionTag
				? await call('get_tasks_in_section_v2', { sectionTag })
				: await call('get_all_tasks_v2');
			if (request !== latestTaskIndexRequest) return;
			const groups = v2.map(fromV2);
			tasksStore.setFileTaskGroups(groups);
			let total = 0;
			for (const g of groups) total += g.tasks.length;
			debug('TASKS', `Tasks: ${groups.length} files, ${total} tasks`);
		});
	} catch (err) {
		if (request === latestTaskIndexRequest) error('TASKS', 'buildTaskIndex failed:', err);
	} finally {
		if (request === latestTaskIndexRequest) tasksStore.setLoading(false);
	}
}

/**
 * Updates the section-tag filter and refetches groups via `buildTaskIndex`.
 * A non-empty tag runs the Rust `get_tasks_in_section_v2` scan, which
 * re-reads from disk every note that has tasks, on a blocking thread, to
 * apply heading-level filtering. Typing here is not its only trigger: the
 * store's default tag is non-empty, so the `TasksView` `vaultIndexVersion`
 * effect (which also runs on mount) and each task toggle pay the same scan.
 */
export async function updateSectionTagFilter(tag: string): Promise<void> {
	tasksStore.setSectionTag(tag);
	await buildTaskIndex();
}

/**
 * Toggles a task via the Rust `toggle_task_status` command, writing the
 * status `toggleTarget(task.status)` picks. Rust does the read → check →
 * write → `VaultIndex` update → emit chain. The Rust update emits
 * `vault-index-updated`; panels react via `vaultStore.vaultIndexVersion`.
 * Search, the per-file consumers and the content caches are refreshed by
 * `afterTaskWrite`.
 *
 * The list can lag disk by seconds, so Rust writes only when the line at
 * `task.lineNumber` still holds `task.text` with `task.status`. Otherwise
 * the result is `stale`: the list is refetched and the user asked to click
 * again.
 *
 * On a changed result the Tasks store is refetched right away: the version
 * bump is throttled (2 s, up to 10 s during a burst), and the clicked
 * checkbox must not look unclicked until then.
 *
 * The open editor tab gets `syncExternalContentToEditor` (in
 * `afterTaskWrite`) so the checkbox toggle is visible without waiting for
 * the watcher to round-trip the file change.
 *
 * Rust toggles the DISK copy and the sync marks the tab saved, so a dirty
 * open tab is saved first or its unsaved typing would be overwritten. If
 * that save fails nothing is written. `lineNumber` comes from the index of
 * the disk copy, so when the saved typing moved that line the toggle is
 * skipped and the list refreshed instead of ticking whatever line is there.
 * The check compares line text only: if the shift leaves an identical line
 * at `lineNumber` (a duplicated task), that line is the one toggled.
 */
export async function toggleTask(filePath: string, task: TaskItem): Promise<void> {
	const { lineNumber } = task;
	try {
		const tab = editorStore.tabs.find((t) => t.path === filePath);
		if (tab && isTabDirty(tab)) {
			const diskLine = lineAt(tab.savedContent, lineNumber);
			if (!(await saveFileByPath(filePath))) {
				toast.error('Task not changed: the note could not be saved.');
				return;
			}
			const saved = editorStore.tabs.find((t) => t.path === filePath)?.savedContent;
			if (saved === undefined || lineAt(saved, lineNumber) !== diskLine) {
				await buildTaskIndex();
				toast.info('The note changed, so the task list was refreshed. Click the task again.');
				return;
			}
		}
		const result = await call('toggle_task_status', {
			path: filePath,
			lineNumber,
			expectedText: task.text,
			expectedStatus: task.status,
			target: toggleTarget(task.status),
		});
		if (result.stale) {
			await buildTaskIndex();
			toast.info('The task changed on disk, so the list was refreshed. Click it again.');
			return;
		}
		if (!result.updateResult.changed) {
			return;
		}
		await afterTaskWrite(filePath, result.updatedContent);
	} catch (err) {
		error('TASKS', 'Failed to toggle task:', err);
		toast.error('Failed to save task change.');
	}
}

/**
 * Settles a note a Rust task command already wrote to disk and indexed in
 * `VaultIndex`. Every task write goes through here, so none of these steps
 * is duplicated at a call site.
 *
 * The watcher is no fallback: it skips a batch whose paths were all saved in
 * the last 15 s, which a toggle on a just-saved note is (`toggleTask` saves a
 * dirty tab first). So the FTS5 / semantic tables, the per-file consumers and
 * the content caches are refreshed here, through the note-change owner.
 *
 * The `task` source has no yield, so the consumer fan-out has finished before
 * `notifyContentInvalidated()` clears the QueryJS cache, as in `notifyAfterSave`.
 * @param path - absolute path of the written note
 * @param updatedContent - the note's content after the write
 */
async function afterTaskWrite(path: string, updatedContent: string): Promise<void> {
	// Sync the open tab (if any) and bump the external signal so
	// MarkdownEditor.svelte replaces the doc when this is the active tab.
	// `'none'`: Rust already wrote the content to disk.
	syncExternalContentToEditor(path, updatedContent, true, 'none');
	markRecentSave(path);
	void applyNoteChange({
		kind: 'upsert',
		source: 'task',
		path,
		content: updatedContent,
		vaultPath: vaultStore.path ?? undefined,
	});
	notifyContentInvalidated();
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
 * cannot write into the reset store.
 */
export function resetTasks(): void {
	latestTaskIndexRequest++;
	tasksStore.reset();
	closeTasksTab();
}
