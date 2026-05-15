import { invoke } from '$lib/api';
import { toast } from 'svelte-sonner';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { syncExternalContentToEditor } from '$lib/core/editor/editor.service';
import { findTabIndex, TASKS_VIRTUAL_PATH } from '$lib/core/editor/editor.logic';
import { tasksStore } from './tasks.store.svelte';
import type { FileTaskGroup } from './tasks.types';
import type { FileTaskGroupV2, ToggleTaskResultV2 } from '$lib/types/vault-v2.types';
import { debug, error, timeAsync } from '$lib/utils/debug';

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
 * Fetches the full task index from the Rust `VaultIndex`. When a
 * `sectionTag` is set, fans out to `get_tasks_in_section_v2` instead;
 * otherwise calls `get_all_tasks_v2`. Phase 7.6 — Rust now owns task
 * parsing end-to-end (see `src-tauri/src/vault/parsing.rs::extract_tasks`).
 */
export async function buildTaskIndex(): Promise<void> {
	tasksStore.setLoading(true);
	try {
		await timeAsync('TASKS', 'buildTaskIndex', async () => {
			const sectionTag = tasksStore.sectionTag.trim();
			const v2 = sectionTag
				? await invoke<FileTaskGroupV2[]>('get_tasks_in_section_v2', { sectionTag })
				: await invoke<FileTaskGroupV2[]>('get_all_tasks_v2');
			const groups = v2.map(fromV2);
			tasksStore.setFileTaskGroups(groups);
			let total = 0;
			for (const g of groups) total += g.tasks.length;
			debug('TASKS', `Tasks: ${groups.length} files, ${total} tasks`);
		});
	} catch (err) {
		error('TASKS', 'buildTaskIndex failed:', err);
	} finally {
		tasksStore.setLoading(false);
	}
}

/**
 * Updates the section-tag filter and refetches groups via the Rust
 * `get_tasks_in_section_v2` command. The Rust scan re-reads each note's
 * raw content from disk to apply heading-level filtering — acceptable
 * cost behind the existing 400ms debounce in `TasksView.svelte`.
 */
export async function updateSectionTagFilter(tag: string): Promise<void> {
	tasksStore.setSectionTag(tag);
	await buildTaskIndex();
}

/**
 * Toggles a task's checked state via the Rust `toggle_task_status`
 * command. Rust does the read → toggle → write → index-update → emit
 * chain — no TS-side index sync remains. The Rust update emits
 * `vault-index-updated`; panels react via `vaultStore.vaultIndexVersion`.
 *
 * The open editor tab still gets `syncExternalContentToEditor` so the
 * checkbox toggle is visible without waiting for the watcher to
 * round-trip the file change.
 */
export async function toggleTask(filePath: string, lineNumber: number): Promise<void> {
	try {
		const result = await invoke<ToggleTaskResultV2>('toggle_task_status', {
			path: filePath,
			lineNumber,
		});
		if (!result.updateResult.changed) {
			return;
		}
		const updatedContent = result.updatedContent;
		// Sync the open tab (if any) with the new content + bump the external
		// signal so MarkdownEditor.svelte dispatches the doc replace when this
		// path matches the active tab.
		syncExternalContentToEditor(filePath, updatedContent, true);
	} catch (err) {
		error('TASKS', 'Failed to toggle task:', err);
		toast.error('Failed to save task change.');
	}
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

/** Resets all task state. */
export function resetTasks(): void {
	tasksStore.reset();
	closeTasksTab();
}
