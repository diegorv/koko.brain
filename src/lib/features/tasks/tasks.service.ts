import { writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { parseWikilinks } from '$lib/features/backlinks/backlinks.logic';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { findTabIndex, TASKS_VIRTUAL_PATH } from '$lib/core/editor/editor.logic';
import { tasksStore } from './tasks.store.svelte';
import {
	extractTasks,
	aggregateFileTasks,
	buildGroupsFromIndex,
	buildModifiedAtMap,
	tasksEqual,
	toggleTaskInContent,
} from './tasks.logic';
import type { TaskItem } from './tasks.types';
import { debug, error, timeSync } from '$lib/utils/debug';

/** Per-file task cache for incremental updates (stores ALL tasks, unfiltered) */
let fileTasksIndex = new Map<string, TaskItem[]>();

/**
 * Rebuilds the displayed groups using the current sectionTag filter.
 * When no section filter is active, builds groups directly from the fileTasksIndex cache
 * (avoids re-parsing all noteContents). Falls back to full aggregation when a
 * sectionTag is set, since section filtering requires raw file content.
 */
function rebuildGroups(): void {
	const modifiedAtMap = buildModifiedAtMap(fsStore.fileTree);
	const sectionTag = tasksStore.sectionTag;

	if (sectionTag && sectionTag.trim().length > 0) {
		const noteContents = noteIndexStore.noteContents;
		const groups = aggregateFileTasks(noteContents, modifiedAtMap, sectionTag);
		tasksStore.setFileTaskGroups(groups);
	} else {
		const groups = buildGroupsFromIndex(fileTasksIndex, modifiedAtMap);
		tasksStore.setFileTaskGroups(groups);
	}
}

/**
 * Builds the full task index from all indexed note contents.
 * Called after buildIndex() completes during vault initialization.
 */
export function buildTaskIndex(): void {
	timeSync('TASKS', 'buildTaskIndex', () => {
		tasksStore.setLoading(true);

		const noteContents = noteIndexStore.noteContents;

		fileTasksIndex = new Map();

		for (const [filePath, content] of noteContents) {
			const tasks = extractTasks(content);
			if (tasks.length > 0) {
				fileTasksIndex.set(filePath, tasks);
			}
		}

		rebuildGroups();
		tasksStore.setLoading(false);

		let totalTasks = 0;
		for (const tasks of fileTasksIndex.values()) totalTasks += tasks.length;
		debug('TASKS', `Tasks: ${fileTasksIndex.size} files, ${totalTasks} tasks`);
	});
}

/**
 * Incrementally updates the task index for a single file.
 * Skips the update if the file's tasks haven't changed.
 */
export function updateTaskIndexForFile(filePath: string, content: string): void {
	const oldTasks = fileTasksIndex.get(filePath) ?? [];
	const newTasks = extractTasks(content);

	if (tasksEqual(oldTasks, newTasks)) return;

	if (newTasks.length > 0) {
		fileTasksIndex.set(filePath, newTasks);
	} else {
		fileTasksIndex.delete(filePath);
	}

	rebuildGroups();
}

/**
 * Rebuilds the task groups when the section tag filter changes.
 * Called from the UI when the user changes the section tag input.
 */
export function updateSectionTagFilter(tag: string): void {
	tasksStore.setSectionTag(tag);
	rebuildGroups();
}

/**
 * Toggles a task's checked state both in the store and on disk.
 * Uses the freshest content available: editor tab (if open) > backlinks index.
 * Updates stores synchronously after the disk write to minimize race windows.
 */
export async function toggleTask(filePath: string, lineNumber: number): Promise<void> {
	// Prefer editor content (freshest if file is open) over backlinks index
	const openTab = editorStore.tabs.find((t) => t.path === filePath);
	const content = openTab?.content ?? noteIndexStore.noteContents.get(filePath);
	if (!content) return;

	const updatedContent = toggleTaskInContent(content, lineNumber);

	try {
		await writeTextFile(filePath, updatedContent);
	} catch (err) {
		error('TASKS', 'Failed to toggle task on disk:', err);
		toast.error('Failed to save task change.');
		return;
	}

	// Update note index atomically (content + wikilinks) to keep stores consistent
	noteIndexStore.updateNoteEntry(filePath, updatedContent, parseWikilinks(updatedContent));

	// Sync CodeMirror if the toggled file is the active editor tab.
	// Without this, the editor shows stale content and the next save would revert the toggle.
	const view = editorStore.editorView;
	const activeTab = editorStore.activeTab;
	if (view && activeTab?.path === filePath) {
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: updatedContent },
		});
	}

	// Mark the tab as saved (content === savedContent → no dirty flag).
	// For non-active tabs, this ensures CodeMirror loads the updated content when switched to.
	editorStore.updateTabContentByPath(filePath, updatedContent);
	updateTaskIndexForFile(filePath, updatedContent);
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

/** Resets all task state including caches */
export function resetTasks(): void {
	fileTasksIndex = new Map();
	tasksStore.reset();
	closeTasksTab();
}
