import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	writeTextFile: vi.fn(),
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
}));

import { writeTextFile } from '@tauri-apps/plugin-fs';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { tasksStore } from '$lib/features/tasks/tasks.store.svelte';
import {
	buildTaskIndex,
	updateTaskIndexForFile,
	updateSectionTagFilter,
	toggleTask,
	openTasksTab,
	closeTasksTab,
	toggleTasksTab,
	resetTasks,
} from '$lib/features/tasks/tasks.service';

describe('buildTaskIndex', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tasksStore.reset();
		editorStore.reset();
		noteIndexStore.reset();
		// Clear default sectionTag filter so all tasks are visible
		tasksStore.setSectionTag('');
	});

	it('populates fileTaskGroups from note contents', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '- [ ] task one\n- [ ] task two'],
			['/vault/b.md', '- [x] done task'],
		]));

		buildTaskIndex();

		expect(tasksStore.fileTaskGroups.length).toBeGreaterThan(0);
		const allTasks = tasksStore.fileTaskGroups.flatMap(g => g.tasks);
		expect(allTasks.length).toBe(3);
	});

	it('sets isLoading false after completion', () => {
		noteIndexStore.setNoteContents(new Map());

		buildTaskIndex();

		expect(tasksStore.isLoading).toBe(false);
	});

	it('handles empty vault with no notes', () => {
		noteIndexStore.setNoteContents(new Map());

		buildTaskIndex();

		expect(tasksStore.fileTaskGroups).toEqual([]);
	});

	it('handles notes without tasks', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', 'No tasks here, just text.'],
		]));

		buildTaskIndex();

		expect(tasksStore.fileTaskGroups).toEqual([]);
	});

	it('groups tasks by file', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '- [ ] task a'],
			['/vault/b.md', '- [ ] task b1\n- [ ] task b2'],
		]));

		buildTaskIndex();

		expect(tasksStore.fileTaskGroups).toHaveLength(2);
		const fileB = tasksStore.fileTaskGroups.find(g => g.filePath === '/vault/b.md');
		expect(fileB?.tasks).toHaveLength(2);
	});
});

describe('updateTaskIndexForFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tasksStore.reset();
		editorStore.reset();
		noteIndexStore.reset();
		tasksStore.setSectionTag('');
	});

	it('adds tasks for a new file', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '- [ ] existing'],
		]));
		buildTaskIndex();
		expect(tasksStore.fileTaskGroups).toHaveLength(1);

		updateTaskIndexForFile('/vault/b.md', '- [ ] new task');

		// Cache-based rebuild: groups are built from fileTasksIndex directly
		expect(tasksStore.fileTaskGroups).toHaveLength(2);
		const allTasks = tasksStore.fileTaskGroups.flatMap(g => g.tasks);
		expect(allTasks).toHaveLength(2);
	});

	it('skips update when tasks are unchanged', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '- [ ] stable task'],
		]));
		buildTaskIndex();
		const groupsBefore = tasksStore.fileTaskGroups;

		updateTaskIndexForFile('/vault/a.md', '- [ ] stable task');

		// tasksEqual returns true, so groups should not be rebuilt
		expect(tasksStore.fileTaskGroups).toEqual(groupsBefore);
	});

	it('updates groups when tasks change', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '- [ ] old task'],
		]));
		buildTaskIndex();
		expect(tasksStore.fileTaskGroups[0]?.tasks[0]?.text).toBe('old task');

		updateTaskIndexForFile('/vault/a.md', '- [ ] new task');

		// Cache-based rebuild: groups reflect the updated fileTasksIndex immediately
		expect(tasksStore.fileTaskGroups[0]?.tasks[0]?.text).toBe('new task');
	});

	it('uses cache for rebuild when no sectionTag is set', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '- [ ] task a'],
		]));
		buildTaskIndex();
		expect(tasksStore.fileTaskGroups).toHaveLength(1);

		// Add a new file via incremental update (not in noteContents)
		updateTaskIndexForFile('/vault/b.md', '- [ ] task b');

		// Cache-based path: both files appear because groups are built from the index
		expect(tasksStore.fileTaskGroups).toHaveLength(2);
	});

	it('falls back to noteContents when sectionTag is active', () => {
		tasksStore.setSectionTag('');
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '## #work\n- [ ] work task\n## #play\n- [ ] play task'],
		]));
		buildTaskIndex();

		// Switch to section filter — rebuildGroups uses aggregateFileTasks path
		updateSectionTagFilter('#work');

		const tasks = tasksStore.fileTaskGroups.flatMap(g => g.tasks);
		expect(tasks).toHaveLength(1);
		expect(tasks[0].text).toBe('work task');
	});
});

describe('updateSectionTagFilter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tasksStore.reset();
		editorStore.reset();
		noteIndexStore.reset();
	});

	it('sets section tag in store', () => {
		updateSectionTagFilter('#work');

		expect(tasksStore.sectionTag).toBe('#work');
	});

	it('filters tasks by section tag', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '## #work\n- [ ] work task\n## #personal\n- [ ] personal task'],
		]));
		buildTaskIndex();

		updateSectionTagFilter('#work');

		const tasks = tasksStore.fileTaskGroups.flatMap(g => g.tasks);
		expect(tasks.every(t => t.text !== 'personal task')).toBe(true);
	});

	it('shows all tasks when filter is empty', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '- [ ] task one\n- [ ] task two'],
		]));
		buildTaskIndex();

		updateSectionTagFilter('');

		const tasks = tasksStore.fileTaskGroups.flatMap(g => g.tasks);
		expect(tasks).toHaveLength(2);
	});
});

describe('toggleTask', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tasksStore.reset();
		editorStore.reset();
		noteIndexStore.reset();
		tasksStore.setSectionTag('');
	});

	it('writes toggled content to disk and updates stores', async () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '- [ ] task'],
		]));
		buildTaskIndex();
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await toggleTask('/vault/a.md', 1);

		expect(writeTextFile).toHaveBeenCalledWith('/vault/a.md', '- [x] task');
		// noteIndexStore should have updated content (via updateNoteEntry)
		expect(noteIndexStore.noteContents.get('/vault/a.md')).toBe('- [x] task');
		// noteIndex should also be updated (not stale)
		expect(noteIndexStore.noteIndex.has('/vault/a.md')).toBe(true);
	});

	it('dispatches to CodeMirror EditorView when toggled file is the active tab', async () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '- [ ] task'],
		]));
		editorStore.addTab({
			path: '/vault/a.md',
			name: 'a.md',
			content: '- [ ] task',
			savedContent: '- [ ] task',
		});
		buildTaskIndex();
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		// Set up a mock EditorView
		const dispatchSpy = vi.fn();
		editorStore.setEditorView({
			dispatch: dispatchSpy,
			state: { doc: { length: '- [ ] task'.length } },
		} as any);

		await toggleTask('/vault/a.md', 1);

		expect(dispatchSpy).toHaveBeenCalledWith({
			changes: { from: 0, to: '- [ ] task'.length, insert: '- [x] task' },
		});
	});

	it('does not dispatch to EditorView when toggled file is not the active tab', async () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '- [ ] task'],
			['/vault/b.md', 'other note'],
		]));
		// Active tab is b.md, not a.md
		editorStore.addTab({
			path: '/vault/b.md',
			name: 'b.md',
			content: 'other note',
			savedContent: 'other note',
		});
		buildTaskIndex();
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		const dispatchSpy = vi.fn();
		editorStore.setEditorView({
			dispatch: dispatchSpy,
			state: { doc: { length: 'other note'.length } },
		} as any);

		await toggleTask('/vault/a.md', 1);

		// Should NOT dispatch since a.md is not the active tab
		expect(dispatchSpy).not.toHaveBeenCalled();
		// But tab content should still be updated via updateTabContentByPath
		expect(noteIndexStore.noteContents.get('/vault/a.md')).toBe('- [x] task');
	});

	it('prefers open tab content over backlinks index', async () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '- [ ] stale'],
		]));
		editorStore.addTab({
			path: '/vault/a.md',
			name: 'a.md',
			content: '- [ ] fresh task',
			savedContent: '- [ ] fresh task',
		});
		buildTaskIndex();
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await toggleTask('/vault/a.md', 1);

		expect(writeTextFile).toHaveBeenCalledWith('/vault/a.md', '- [x] fresh task');
	});

	it('does nothing when content is not found', async () => {
		noteIndexStore.setNoteContents(new Map());

		await toggleTask('/vault/missing.md', 1);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(noteIndexStore.noteContents.size).toBe(0);
	});

	it('does not update stores when disk write fails', async () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '- [ ] task'],
		]));
		buildTaskIndex();
		vi.mocked(writeTextFile).mockRejectedValue(new Error('write error'));

		await toggleTask('/vault/a.md', 1);

		// Content should remain unchanged since write failed
		expect(noteIndexStore.noteContents.get('/vault/a.md')).toBe('- [ ] task');
	});
});

describe('openTasksTab / closeTasksTab / toggleTasksTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tasksStore.reset();
		editorStore.reset();
		noteIndexStore.reset();
	});

	it('openTasksTab creates a Tasks tab', () => {
		openTasksTab();

		expect(editorStore.tabs).toHaveLength(1);
		expect(editorStore.tabs[0].path).toBe('__virtual__/tasks');
		expect(editorStore.tabs[0].name).toBe('Tasks');
		expect(editorStore.tabs[0].fileType).toBe('tasks');
		expect(editorStore.activeIndex).toBe(0);
	});

	it('openTasksTab focuses existing tab instead of creating duplicate', () => {
		openTasksTab();
		// Open another tab so Tasks is not active
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		expect(editorStore.activeIndex).toBe(1);

		openTasksTab();

		expect(editorStore.tabs).toHaveLength(2);
		expect(editorStore.activeIndex).toBe(0);
	});

	it('closeTasksTab removes the tab', () => {
		openTasksTab();
		expect(editorStore.tabs).toHaveLength(1);

		closeTasksTab();

		expect(editorStore.tabs).toHaveLength(0);
	});

	it('closeTasksTab does nothing when tab does not exist', () => {
		closeTasksTab();

		expect(editorStore.tabs).toHaveLength(0);
	});

	it('toggleTasksTab opens when not present', () => {
		toggleTasksTab();

		expect(editorStore.tabs).toHaveLength(1);
		expect(editorStore.tabs[0].fileType).toBe('tasks');
	});

	it('toggleTasksTab closes when active', () => {
		openTasksTab();
		expect(editorStore.activeIndex).toBe(0);

		toggleTasksTab();

		expect(editorStore.tabs).toHaveLength(0);
	});

	it('toggleTasksTab focuses when present but not active', () => {
		openTasksTab();
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		expect(editorStore.activeIndex).toBe(1);

		toggleTasksTab();

		expect(editorStore.activeIndex).toBe(0);
		expect(editorStore.tabs).toHaveLength(2);
	});
});

describe('resetTasks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tasksStore.reset();
		editorStore.reset();
		noteIndexStore.reset();
		tasksStore.setSectionTag('');
	});

	it('clears task groups and closes tab', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '- [ ] task'],
		]));
		buildTaskIndex();
		openTasksTab();
		expect(tasksStore.fileTaskGroups.length).toBeGreaterThan(0);
		expect(editorStore.tabs).toHaveLength(1);

		resetTasks();

		expect(tasksStore.fileTaskGroups).toEqual([]);
		expect(editorStore.tabs).toHaveLength(0);
	});

	it('resets loading state', () => {
		resetTasks();

		expect(tasksStore.isLoading).toBe(false);
	});
});
