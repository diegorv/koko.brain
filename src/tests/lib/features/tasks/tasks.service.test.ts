import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/api', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeAsync: vi.fn(async (_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn() },
}));

import { invoke } from '$lib/api';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { tasksStore } from '$lib/features/tasks/tasks.store.svelte';
import {
	buildTaskIndex,
	updateSectionTagFilter,
	toggleTask,
	openTasksTab,
	closeTasksTab,
	toggleTasksTab,
	resetTasks,
} from '$lib/features/tasks/tasks.service';
import type { FileTaskGroupV2, ToggleTaskResultV2 } from '$lib/types/vault-v2.types';

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

	function makeResult(updatedContent: string, changed = true): ToggleTaskResultV2 {
		return {
			updatedContent,
			updateResult: { changed, affected: [], version: 1 },
		};
	}

	it('invokes toggle_task_status with the right path/lineNumber', async () => {
		vi.mocked(invoke).mockResolvedValueOnce(makeResult('- [x] task'));

		await toggleTask('/vault/a.md', 1);

		expect(invoke).toHaveBeenCalledWith('toggle_task_status', {
			path: '/vault/a.md',
			lineNumber: 1,
		});
	});

	it('does not invoke any TS-side index update beyond toggle_task_status', async () => {
		vi.mocked(invoke).mockResolvedValueOnce(makeResult('- [x] task'));

		await toggleTask('/vault/a.md', 1);

		// Rust `toggle_task_status` already updated VaultIndex and emitted
		// `vault-index-updated`; panels react via vaultIndexVersion. No
		// secondary IPC fires from the TS side after the toggle.
		expect(invoke).toHaveBeenCalledTimes(1);
		expect(invoke).toHaveBeenCalledWith('toggle_task_status', {
			path: '/vault/a.md',
			lineNumber: 1,
		});
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
		await toggleTask('/vault/a.md', 1);

		expect(editorStore.externalContentSignal).toBeGreaterThan(before);
		expect(editorStore.tabs[0].content).toBe('- [x] task');
		expect(editorStore.tabs[0].savedContent).toBe('- [x] task');
	});

	it('skips editor sync when toggle is a no-op', async () => {
		const tabBefore = editorStore.externalContentSignal;
		vi.mocked(invoke).mockResolvedValueOnce(makeResult('- [ ] task', /* changed */ false));

		await toggleTask('/vault/a.md', 1);

		// changed=false → no editor signal bump (no doc replace).
		expect(editorStore.externalContentSignal).toBe(tabBefore);
	});

	it('swallows IPC errors via toast and does not bump editor signal', async () => {
		const tabBefore = editorStore.externalContentSignal;
		vi.mocked(invoke).mockRejectedValueOnce(new Error('disk full'));

		await toggleTask('/vault/a.md', 1);

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
