import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeAsync: vi.fn(async (_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), info: vi.fn() },
}));

import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { error } from '#lib/utils/debug.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import {
	buildTaskIndex,
	updateSectionTagFilter,
	toggleTask,
	openTasksTab,
	closeTasksTab,
	toggleTasksTab,
	resetTasks,
} from '#lib/features/tasks/tasks.service.js';
import type { FileTaskGroupV2, ToggleTaskResultV2 } from '#lib/types/vault-v2.types.js';
import type { TaskItem } from '#lib/features/tasks/tasks.types.js';
import type { TaskStatus } from '#lib/features/tasks/task-metadata.types.js';

function group(filePath: string, modifiedAtSec: number, taskTexts: string[]): FileTaskGroupV2 {
	return {
		filePath,
		fileName: filePath.split('/').pop()?.replace(/\.md$/, '') ?? '',
		modifiedAt: modifiedAtSec,
		tasks: taskTexts.map((text, i) => ({
			text,
			checked: false,
			indent: 0,
			lineNumber: i + 1,
			status: 'todo',
			metadata: { description: text, tags: [] },
		})),
	};
}

describe('buildTaskIndex', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tasksStore.reset();
		editorStore.reset();
		tasksStore.setSectionTag('');
	});

	it('populates fileTaskGroups via get_all_tasks_v2 IPC', async () => {
		const groups: FileTaskGroupV2[] = [
			group('/vault/a.md', 100, ['task one', 'task two']),
			group('/vault/b.md', 200, ['done task']),
		];
		vi.mocked(invoke).mockResolvedValueOnce(groups);

		await buildTaskIndex();

		expect(invoke).toHaveBeenCalledWith('get_all_tasks_v2');
		expect(tasksStore.fileTaskGroups).toHaveLength(2);
		expect(tasksStore.fileTaskGroups.flatMap((g) => g.tasks)).toHaveLength(3);
	});

	it('converts modifiedAt seconds → milliseconds', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([group('/vault/a.md', 1700000000, ['x'])]);

		await buildTaskIndex();

		expect(tasksStore.fileTaskGroups[0].modifiedAt).toBe(1700000000 * 1000);
	});

	it('clears loading state after completion', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([]);
		await buildTaskIndex();
		expect(tasksStore.isLoading).toBe(false);
	});

	it('handles empty IPC response', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([]);
		await buildTaskIndex();
		expect(tasksStore.fileTaskGroups).toEqual([]);
	});

	it('falls back to get_tasks_in_section_v2 when sectionTag is set', async () => {
		tasksStore.setSectionTag('#to-list');
		vi.mocked(invoke).mockResolvedValueOnce([group('/vault/a.md', 100, ['filtered'])]);

		await buildTaskIndex();

		expect(invoke).toHaveBeenCalledWith('get_tasks_in_section_v2', { sectionTag: '#to-list' });
	});

	it('clears loading state even on IPC error', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('boom'));
		await buildTaskIndex();
		expect(tasksStore.isLoading).toBe(false);
	});

	it('keeps the newer result when an older call resolves last', async () => {
		let resolveFirst!: (v: FileTaskGroupV2[]) => void;
		let resolveSecond!: (v: FileTaskGroupV2[]) => void;
		vi.mocked(invoke)
			.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
			.mockImplementationOnce(() => new Promise((r) => (resolveSecond = r)));

		const first = buildTaskIndex();
		const second = buildTaskIndex();
		resolveSecond([group('/vault/new.md', 200, ['new'])]);
		await second;
		expect(tasksStore.isLoading).toBe(false);
		resolveFirst([group('/vault/old.md', 100, ['old'])]);
		await first;

		expect(tasksStore.fileTaskGroups.map((g) => g.filePath)).toEqual(['/vault/new.md']);
		expect(tasksStore.isLoading).toBe(false);
	});

	it('stays loading while a newer call is in flight after an older one finishes', async () => {
		let resolveFirst!: (v: FileTaskGroupV2[]) => void;
		let resolveSecond!: (v: FileTaskGroupV2[]) => void;
		vi.mocked(invoke)
			.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
			.mockImplementationOnce(() => new Promise((r) => (resolveSecond = r)));

		const first = buildTaskIndex();
		const second = buildTaskIndex();
		resolveFirst([group('/vault/old.md', 100, ['old'])]);
		await first;
		expect(tasksStore.isLoading).toBe(true);
		expect(tasksStore.fileTaskGroups).toEqual([]);

		resolveSecond([group('/vault/new.md', 200, ['new'])]);
		await second;
		expect(tasksStore.fileTaskGroups.map((g) => g.filePath)).toEqual(['/vault/new.md']);
		expect(tasksStore.isLoading).toBe(false);
	});

	it('drops a call that resolves after resetTasks', async () => {
		let resolveCall!: (v: FileTaskGroupV2[]) => void;
		vi.mocked(invoke).mockImplementationOnce(() => new Promise((r) => (resolveCall = r)));

		const pending = buildTaskIndex();
		resetTasks();
		resolveCall([group('/vault/old-vault.md', 100, ['stale'])]);
		await pending;

		expect(tasksStore.fileTaskGroups).toEqual([]);
		expect(tasksStore.isLoading).toBe(false);
	});

	it('reports only the error of the latest call', async () => {
		let rejectFirst!: (e: Error) => void;
		vi.mocked(invoke)
			.mockImplementationOnce(() => new Promise((_r, j) => (rejectFirst = j)))
			.mockResolvedValueOnce([group('/vault/new.md', 200, ['new'])]);

		const first = buildTaskIndex();
		await buildTaskIndex();
		rejectFirst(new Error('superseded boom'));
		await first;
		expect(error).not.toHaveBeenCalled();

		vi.mocked(invoke).mockRejectedValueOnce(new Error('latest boom'));
		await buildTaskIndex();
		expect(error).toHaveBeenCalledWith('TASKS', 'buildTaskIndex failed:', expect.any(Error));
		expect(tasksStore.fileTaskGroups.map((g) => g.filePath)).toEqual(['/vault/new.md']);
	});
});

describe('updateSectionTagFilter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tasksStore.reset();
		editorStore.reset();
	});

	it('sets section tag and refetches via the section IPC', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([group('/vault/a.md', 100, ['work'])]);

		await updateSectionTagFilter('#work');

		expect(tasksStore.sectionTag).toBe('#work');
		expect(invoke).toHaveBeenCalledWith('get_tasks_in_section_v2', { sectionTag: '#work' });
	});

	it('routes through get_all_tasks_v2 when filter cleared', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([]);

		await updateSectionTagFilter('');

		expect(invoke).toHaveBeenCalledWith('get_all_tasks_v2');
	});
});

describe('toggleTask', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tasksStore.reset();
		editorStore.reset();
	});

	function makeResult(updatedContent: string, changed = true, stale = false): ToggleTaskResultV2 {
		return {
			updatedContent,
			updateResult: { changed, affected: [], version: 1, upserted: [], removed: [], fullRescan: false },
			stale,
		};
	}

	/** A task as the Tasks list holds it. */
	function item(text: string, lineNumber = 1, status: TaskStatus = 'todo'): TaskItem {
		return {
			text,
			checked: status !== 'todo',
			indent: 0,
			lineNumber,
			status,
			metadata: { description: text, tags: [] },
		};
	}

	it('invokes toggle_task_status with the line, the expected task and the target status', async () => {
		vi.mocked(invoke).mockResolvedValueOnce(makeResult('- [x] task'));

		await toggleTask('/vault/a.md', item('task'));

		expect(invoke).toHaveBeenCalledWith('toggle_task_status', {
			path: '/vault/a.md',
			lineNumber: 1,
			expectedText: 'task',
			expectedStatus: 'todo',
			target: 'done',
		});
	});

	it('sends done as the target for an important task, and todo for a done one', async () => {
		vi.mocked(invoke).mockResolvedValue(makeResult('', false));

		await toggleTask('/vault/a.md', item('call', 3, 'important'));
		await toggleTask('/vault/a.md', item('call', 3, 'done'));

		expect(invoke).toHaveBeenNthCalledWith(1, 'toggle_task_status', {
			path: '/vault/a.md',
			lineNumber: 3,
			expectedText: 'call',
			expectedStatus: 'important',
			target: 'done',
		});
		expect(invoke).toHaveBeenNthCalledWith(2, 'toggle_task_status', {
			path: '/vault/a.md',
			lineNumber: 3,
			expectedText: 'call',
			expectedStatus: 'done',
			target: 'todo',
		});
	});

	it('refetches the Tasks store on a changed toggle without any vaultIndexVersion bump', async () => {
		const toggled = group('/vault/a.md', 100, ['task']);
		toggled.tasks[0].checked = true;
		toggled.tasks[0].status = 'done';
		tasksStore.setSectionTag('');
		vi.mocked(invoke)
			.mockResolvedValueOnce(makeResult('- [x] task'))
			.mockResolvedValueOnce([toggled]);

		await toggleTask('/vault/a.md', item('task'));

		// The throttled vault-index-updated bump can land 2-10 s later; the
		// acting view refetches itself so the checkbox reflects the click now.
		expect(invoke).toHaveBeenNthCalledWith(2, 'get_all_tasks_v2');
		expect(tasksStore.fileTaskGroups).toHaveLength(1);
		expect(tasksStore.fileTaskGroups[0].tasks[0].checked).toBe(true);
		expect(tasksStore.isLoading).toBe(false);
	});

	it('refetches the Tasks store and asks for a new click when the line is stale', async () => {
		editorStore.addTab({
			path: '/vault/a.md',
			name: 'a.md',
			content: '- [ ] other',
			savedContent: '- [ ] other',
		});
		const fresh = group('/vault/a.md', 100, ['other']);
		tasksStore.setSectionTag('');
		vi.mocked(invoke)
			.mockResolvedValueOnce(makeResult('- [ ] other', /* changed */ false, /* stale */ true))
			.mockResolvedValueOnce([fresh]);
		const signalBefore = editorStore.externalContentSignal;

		await toggleTask('/vault/a.md', item('task'));

		expect(invoke).toHaveBeenNthCalledWith(2, 'get_all_tasks_v2');
		expect(tasksStore.fileTaskGroups).toHaveLength(1);
		expect(tasksStore.fileTaskGroups[0].tasks[0].text).toBe('other');
		expect(toast.info).toHaveBeenCalledWith('The task changed on disk, so the list was refreshed. Click it again.');
		expect(editorStore.externalContentSignal).toBe(signalBefore);
	});

	it('does not refetch the Tasks store when the toggle is a no-op', async () => {
		vi.mocked(invoke).mockResolvedValueOnce(makeResult('- [ ] task', /* changed */ false));

		await toggleTask('/vault/a.md', item('task'));

		expect(invoke).toHaveBeenCalledTimes(1);
		expect(invoke).toHaveBeenCalledWith('toggle_task_status', {
			path: '/vault/a.md',
			lineNumber: 1,
			expectedText: 'task',
			expectedStatus: 'todo',
			target: 'done',
		});
		expect(tasksStore.fileTaskGroups).toHaveLength(0);
		expect(toast.info).not.toHaveBeenCalled();
	});

	it('bumps externalContentSignal when toggled file is the active tab', async () => {
		editorStore.addTab({
			path: '/vault/a.md',
			name: 'a.md',
			content: '- [ ] task',
			savedContent: '- [ ] task',
		});
		vi.mocked(invoke).mockResolvedValueOnce(makeResult('- [x] task'));

		const before = editorStore.externalContentSignal;
		await toggleTask('/vault/a.md', item('task'));

		expect(editorStore.externalContentSignal).toBeGreaterThan(before);
		expect(editorStore.tabs[0].content).toBe('- [x] task');
		expect(editorStore.tabs[0].savedContent).toBe('- [x] task');
	});

	it('skips editor sync when toggle is a no-op', async () => {
		const tabBefore = editorStore.externalContentSignal;
		vi.mocked(invoke).mockResolvedValueOnce(makeResult('- [ ] task', /* changed */ false));

		await toggleTask('/vault/a.md', item('task'));

		// changed=false → no editor signal bump (no doc replace).
		expect(editorStore.externalContentSignal).toBe(tabBefore);
	});

	it('swallows IPC errors via toast and does not bump editor signal', async () => {
		const tabBefore = editorStore.externalContentSignal;
		vi.mocked(invoke).mockRejectedValueOnce(new Error('disk full'));

		await toggleTask('/vault/a.md', item('task'));

		expect(editorStore.externalContentSignal).toBe(tabBefore);
	});
});

describe('openTasksTab / closeTasksTab / toggleTasksTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tasksStore.reset();
		editorStore.reset();
	});

	it('openTasksTab creates a Tasks tab', () => {
		openTasksTab();
		expect(editorStore.tabs).toHaveLength(1);
		expect(editorStore.tabs[0].path).toBe('__virtual__/tasks');
		expect(editorStore.tabs[0].fileType).toBe('tasks');
		expect(editorStore.activeIndex).toBe(0);
	});

	it('openTasksTab focuses existing tab instead of duplicating', () => {
		openTasksTab();
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		expect(editorStore.activeIndex).toBe(1);

		openTasksTab();

		expect(editorStore.tabs).toHaveLength(2);
		expect(editorStore.activeIndex).toBe(0);
	});

	it('closeTasksTab removes the tab', () => {
		openTasksTab();
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
		toggleTasksTab();
		expect(editorStore.tabs).toHaveLength(0);
	});

	it('toggleTasksTab focuses when present but not active', () => {
		openTasksTab();
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		expect(editorStore.activeIndex).toBe(1);

		toggleTasksTab();

		expect(editorStore.activeIndex).toBe(0);
	});
});

describe('resetTasks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tasksStore.reset();
		editorStore.reset();
	});

	it('clears task groups and closes tab', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([group('/vault/a.md', 100, ['x'])]);
		await buildTaskIndex();
		openTasksTab();
		expect(tasksStore.fileTaskGroups.length).toBeGreaterThan(0);

		resetTasks();

		expect(tasksStore.fileTaskGroups).toEqual([]);
		expect(editorStore.tabs).toHaveLength(0);
	});
});
