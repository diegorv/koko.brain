import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

// `vaultStore.open` persists the recent-vaults list.
setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeAsync: vi.fn(async (_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
}));

// Callable, as `toast(...)` returns the id the Undo toast is dismissed by.
vi.mock('svelte-sonner', () => ({
	toast: Object.assign(vi.fn(() => 'undo-1'), { error: vi.fn(), info: vi.fn(), dismiss: vi.fn() }),
}));

import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { error } from '#lib/utils/debug.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { areAllRecentSaves, resetHooks } from '#lib/core/editor/editor.hooks.js';
import {
	registerContentInvalidationListener,
	registerNoteChangeConsumer,
} from '#lib/core/filesystem/note-change.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import {
	buildTaskIndex,
	updateSectionTagFilter,
	toggleTask,
	setTaskStatus,
	setTaskStatusFromMenu,
	openTasksTab,
	closeTasksTab,
	toggleTasksTab,
	resetTasks,
	getTasksResetGeneration,
	loadSavedTasksView,
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

		expect(invoke).toHaveBeenCalledWith('get_tasks_in_section_v2', { sectionTags: ['#to-list'] });
	});

	it('sends every tag parsed from the section tag text', async () => {
		tasksStore.setSectionTag('#to-list work');
		vi.mocked(invoke).mockResolvedValueOnce([group('/vault/a.md', 100, ['listed'])]);

		await buildTaskIndex();

		expect(invoke).toHaveBeenCalledWith('get_tasks_in_section_v2', { sectionTags: ['#to-list', '#work'] });
		expect(tasksStore.fileTaskGroups.flatMap((g) => g.tasks.map((t) => t.text))).toEqual(['listed']);
	});

	it('lists every task when the section tag text holds no tag', async () => {
		tasksStore.setSectionTag(' , ');
		vi.mocked(invoke).mockResolvedValueOnce([group('/vault/a.md', 100, ['any'])]);

		await buildTaskIndex();

		expect(invoke).toHaveBeenCalledWith('get_all_tasks_v2');
		expect(vi.mocked(invoke).mock.calls.some(([cmd]) => cmd === 'get_tasks_in_section_v2')).toBe(false);
		expect(tasksStore.fileTaskGroups.flatMap((g) => g.tasks.map((t) => t.text))).toEqual(['any']);
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

	it('sets hasLoaded after a successful fetch', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([group('/vault/a.md', 100, ['x'])]);
		expect(tasksStore.hasLoaded).toBe(false);

		await buildTaskIndex();

		expect(tasksStore.hasLoaded).toBe(true);
	});

	it('sets hasLoaded after a failed fetch', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('boom'));

		await buildTaskIndex();

		expect(tasksStore.hasLoaded).toBe(true);
	});

	it('leaves hasLoaded false when a call resolves after resetTasks', async () => {
		let resolveCall!: (v: FileTaskGroupV2[]) => void;
		vi.mocked(invoke).mockImplementationOnce(() => new Promise((r) => (resolveCall = r)));

		const pending = buildTaskIndex();
		resetTasks();
		resolveCall([group('/vault/old-vault.md', 100, ['stale'])]);
		await pending;

		expect(tasksStore.hasLoaded).toBe(false);
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

describe('buildTaskIndex: note order', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tasksStore.reset();
		editorStore.reset();
		tasksStore.setSectionTag('');
	});

	const paths = () => tasksStore.fileTaskGroups.map((g) => g.filePath);

	it('lists notes by path, not in the newest-first order Rust sends', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([group('/vault/B.md', 200, ['b']), group('/vault/A.md', 100, ['a'])]);

		await buildTaskIndex();

		expect(paths()).toEqual(['/vault/A.md', '/vault/B.md']);
	});

	it('compares numbers in note paths as numbers', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([group('/vault/note 10.md', 200, ['x']), group('/vault/note 9.md', 100, ['y'])]);

		await buildTaskIndex();

		expect(paths()).toEqual(['/vault/note 9.md', '/vault/note 10.md']);
	});

	it('sorts the section tag fetch too', async () => {
		tasksStore.setSectionTag('#x');
		vi.mocked(invoke).mockResolvedValueOnce([group('/vault/C.md', 300, ['c']), group('/vault/A.md', 100, ['a']), group('/vault/B.md', 200, ['b'])]);

		await buildTaskIndex();

		expect(invoke).toHaveBeenCalledWith('get_tasks_in_section_v2', { sectionTags: ['#x'] });
		expect(paths()).toEqual(['/vault/A.md', '/vault/B.md', '/vault/C.md']);
	});
});

describe('buildTaskIndex: rows', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tasksStore.reset();
		editorStore.reset();
		tasksStore.setSectionTag('');
		vaultStore.open('/vault');
	});

	afterEach(() => {
		vaultStore.close();
	});

	it('stores the rows in the sorted note order with relPath and folder set', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			group('/vault/Projects/B.md', 200, ['b1', 'b2']),
			group('/vault/A.md', 100, ['a']),
		]);

		await buildTaskIndex();

		expect(tasksStore.rows.map((r) => [r.filePath, r.relPath, r.folder, r.lineNumber])).toEqual([
			['/vault/A.md', 'A.md', '', 1],
			['/vault/Projects/B.md', 'Projects/B.md', 'Projects', 1],
			['/vault/Projects/B.md', 'Projects/B.md', 'Projects', 2],
		]);
		expect(tasksStore.rows[0].modifiedAt).toBe(100 * 1000);
	});

	it('writes neither the groups nor the rows from a superseded request', async () => {
		let resolveFirst!: (v: FileTaskGroupV2[]) => void;
		let resolveSecond!: (v: FileTaskGroupV2[]) => void;
		vi.mocked(invoke)
			.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
			.mockImplementationOnce(() => new Promise((r) => (resolveSecond = r)));

		const first = buildTaskIndex();
		const second = buildTaskIndex();
		resolveSecond([group('/vault/new.md', 200, ['new'])]);
		await second;
		resolveFirst([group('/vault/old.md', 100, ['old'])]);
		await first;

		expect(tasksStore.fileTaskGroups.map((g) => g.filePath)).toEqual(['/vault/new.md']);
		expect(tasksStore.rows.map((r) => r.filePath)).toEqual(['/vault/new.md']);
	});

	it('leaves the rows empty after resetTasks', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([group('/vault/a.md', 100, ['x'])]);
		await buildTaskIndex();
		expect(tasksStore.rows).toHaveLength(1);

		resetTasks();

		expect(tasksStore.rows).toEqual([]);
	});

	it('leaves the rows untouched when the fetch fails', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([group('/vault/a.md', 100, ['x'])]);
		await buildTaskIndex();
		const before = tasksStore.rows;

		vi.mocked(invoke).mockRejectedValueOnce(new Error('boom'));
		await buildTaskIndex();

		expect(tasksStore.rows).toBe(before);
	});
});

describe('buildTaskIndex: refresh error', () => {
	const MESSAGE = 'Tasks could not be refreshed. The log has the details.';

	beforeEach(() => {
		vi.clearAllMocks();
		tasksStore.reset();
		editorStore.reset();
		tasksStore.setSectionTag('');
	});

	it('sets the fixed message when the latest call fails, logging the raw error, and keeps the groups', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([group('/vault/a.md', 100, ['x'])]);
		await buildTaskIndex();
		const before = tasksStore.fileTaskGroups;

		const raw = new Error('secret path /vault/x');
		vi.mocked(invoke).mockRejectedValueOnce(raw);
		await buildTaskIndex();

		expect(tasksStore.error).toBe(MESSAGE);
		expect(tasksStore.error).not.toContain('secret');
		expect(error).toHaveBeenCalledWith('TASKS', 'buildTaskIndex failed:', raw);
		expect(tasksStore.fileTaskGroups).toBe(before);
	});

	it('keeps the error while a new call is in flight and clears it when that call succeeds', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('boom'));
		await buildTaskIndex();
		expect(tasksStore.error).toBe(MESSAGE);

		let resolveCall!: (v: FileTaskGroupV2[]) => void;
		vi.mocked(invoke).mockImplementationOnce(() => new Promise((r) => (resolveCall = r)));
		const pending = buildTaskIndex();
		expect(tasksStore.error).toBe(MESSAGE);

		resolveCall([group('/vault/a.md', 100, ['x'])]);
		await pending;
		expect(tasksStore.error).toBeNull();
	});

	it('does not set the error for a superseded call that fails', async () => {
		let rejectFirst!: (e: Error) => void;
		vi.mocked(invoke)
			.mockImplementationOnce(() => new Promise((_r, j) => (rejectFirst = j)))
			.mockResolvedValueOnce([group('/vault/new.md', 200, ['new'])]);

		const first = buildTaskIndex();
		await buildTaskIndex();
		rejectFirst(new Error('superseded boom'));
		await first;

		expect(tasksStore.error).toBeNull();
	});

	it('does not clear the error for a superseded call that succeeds', async () => {
		let resolveFirst!: (v: FileTaskGroupV2[]) => void;
		vi.mocked(invoke)
			.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
			.mockRejectedValueOnce(new Error('latest boom'));

		const first = buildTaskIndex();
		await buildTaskIndex();
		expect(tasksStore.error).toBe(MESSAGE);
		resolveFirst([group('/vault/old.md', 100, ['old'])]);
		await first;

		expect(tasksStore.error).toBe(MESSAGE);
	});

	it('does not set the error for a call that fails after resetTasks', async () => {
		let rejectCall!: (e: Error) => void;
		vi.mocked(invoke).mockImplementationOnce(() => new Promise((_r, j) => (rejectCall = j)));

		const pending = buildTaskIndex();
		resetTasks();
		rejectCall(new Error('old vault boom'));
		await pending;

		expect(tasksStore.error).toBeNull();
	});
});

describe('updateSectionTagFilter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tasksStore.reset();
		editorStore.reset();
		settingsStore.reset();
	});

	it('sets section tag and refetches via the section IPC', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([group('/vault/a.md', 100, ['work'])]);

		await updateSectionTagFilter('#work');

		expect(tasksStore.sectionTag).toBe('#work');
		expect(invoke).toHaveBeenCalledWith('get_tasks_in_section_v2', { sectionTags: ['#work'] });
		expect((settingsStore.tasksView as { sectionTag: string }).sectionTag).toBe('#work');
	});

	it('routes through get_all_tasks_v2 when filter cleared', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([]);

		await updateSectionTagFilter('');

		expect(invoke).toHaveBeenCalledWith('get_all_tasks_v2');
		expect((settingsStore.tasksView as { sectionTag: string }).sectionTag).toBe('');
	});

	it('saves the tag in the settings store before it refetches', async () => {
		let savedAtFetch: unknown;
		vi.mocked(invoke).mockImplementationOnce(async () => {
			savedAtFetch = { ...(settingsStore.tasksView as object) };
			return [];
		});

		await updateSectionTagFilter('#a');

		expect(savedAtFetch).toEqual({ version: 1, sectionTag: '#a' });
	});
});

describe('loadSavedTasksView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tasksStore.reset();
		settingsStore.reset();
	});

	it('sets #to-list when nothing was saved, and starts no fetch', () => {
		tasksStore.setSectionTag('#stale');

		loadSavedTasksView();

		expect(tasksStore.sectionTag).toBe('#to-list');
		expect(invoke).not.toHaveBeenCalled();
		expect(settingsStore.tasksView).toBeUndefined();
	});

	it('sets the saved tag', () => {
		settingsStore.updateTasksView({ version: 1, sectionTag: '#work' });

		loadSavedTasksView();

		expect(tasksStore.sectionTag).toBe('#work');
		expect(error).not.toHaveBeenCalled();
	});

	it('logs and toasts an invalid value, and leaves it in settings', () => {
		settingsStore.updateTasksView(42);

		loadSavedTasksView();

		expect(tasksStore.sectionTag).toBe('#to-list');
		expect(error).toHaveBeenCalledWith('TASKS', 'Invalid tasksView in settings.json:', 42);
		expect(toast.error).toHaveBeenCalledWith('The saved Tasks section tags could not be read, so #to-list is used.');
		expect(settingsStore.tasksView).toBe(42);
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

	it('refetches the Tasks store and asks to try again when the line is stale', async () => {
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
		expect(toast.info).toHaveBeenCalledWith('The task changed on disk, so the list was refreshed. Try again.');
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

	describe('after a task write', () => {
		let upserts: [string, string][] = [];
		let invalidations = 0;
		/** `upserts.length` at each invalidation, to pin the consumer fan-out ahead of the signal. */
		let upsertsAtInvalidation: number[] = [];
		let unregister: (() => void)[] = [];

		/** Answers every command, so the note-change owner's `.catch` chains get a promise. */
		function mockToggle(result: ToggleTaskResultV2): void {
			vi.mocked(invoke).mockImplementation((cmd: string) =>
				Promise.resolve(cmd === 'toggle_task_status' ? result : cmd.startsWith('get_') ? [] : undefined),
			);
		}

		beforeEach(() => {
			upserts = [];
			invalidations = 0;
			upsertsAtInvalidation = [];
			resetHooks();
			vaultStore.open('/vault');
			unregister = [
				registerNoteChangeConsumer({
					name: 'probe',
					upsert: (path, content) => upserts.push([path, content]),
					remove: () => {},
				}),
				registerContentInvalidationListener('probe', () => {
					invalidations++;
					upsertsAtInvalidation.push(upserts.length);
				}),
			];
		});

		afterEach(() => {
			for (const u of unregister) u();
			unregister = [];
			vaultStore.close();
			resetHooks();
			vi.mocked(invoke).mockReset();
		});

		it('reaches search, the per-file consumers, the invalidation signal and the watcher self-save guard', async () => {
			mockToggle(makeResult('- [x] task'));

			await toggleTask('/vault/a.md', item('task'));

			expect(invoke).toHaveBeenCalledWith('update_search_index_file', {
				filePath: 'a.md',
				content: '- [x] task',
				vaultPath: '/vault',
			});
			expect(upserts).toEqual([['/vault/a.md', '- [x] task']]);
			expect(invalidations).toBe(1);
			expect(areAllRecentSaves(['/vault/a.md'])).toBe(true);
		});

		it('runs the per-file consumers before the invalidation signal fires', async () => {
			mockToggle(makeResult('- [x] task'));

			await toggleTask('/vault/a.md', item('task'));

			expect(upsertsAtInvalidation).toEqual([1]);
		});

		it('does not refresh the Rust index, which the task command already updated', async () => {
			mockToggle(makeResult('- [x] task'));

			await toggleTask('/vault/a.md', item('task'));

			expect(vi.mocked(invoke).mock.calls.map((c) => c[0])).not.toContain('update_note_in_index');
		});

		it.each([
			['a no-op', makeResult('- [ ] task', /* changed */ false)],
			['a stale', makeResult('- [ ] other', /* changed */ false, /* stale */ true)],
		])('%s toggle reaches neither search, the consumers nor the signal', async (_label, result) => {
			mockToggle(result);

			await toggleTask('/vault/a.md', item('task'));

			expect(vi.mocked(invoke).mock.calls.map((c) => c[0])).not.toContain('update_search_index_file');
			expect(upserts).toEqual([]);
			expect(invalidations).toBe(0);
			expect(areAllRecentSaves(['/vault/a.md'])).toBe(false);
		});
	});
});

describe('setTaskStatus', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tasksStore.reset();
		editorStore.reset();
		tasksStore.setSectionTag('');
	});

	afterEach(() => {
		vi.mocked(invoke).mockReset();
	});

	function result(changed: boolean, stale = false): ToggleTaskResultV2 {
		return {
			updatedContent: changed ? '- [/] task' : '',
			updateResult: { changed, affected: [], version: 1, upserted: [], removed: [], fullRescan: false },
			stale,
		};
	}

	function item(text: string, lineNumber = 1, status: TaskStatus = 'todo'): TaskItem {
		return { text, checked: status !== 'todo', indent: 0, lineNumber, status, metadata: { description: text, tags: [] } };
	}

	/** Answers `toggle_task_status` with `answer` and every fetch with no groups. */
	function mockToggle(answer: () => ToggleTaskResultV2 | Promise<ToggleTaskResultV2>): void {
		vi.mocked(invoke).mockImplementation(async (cmd: string) =>
			cmd === 'toggle_task_status' ? answer() : cmd.startsWith('get_') ? [] : undefined,
		);
	}

	const commands = () => vi.mocked(invoke).mock.calls.map((c) => c[0]);

	it('sends the target status with the expected raw text and status, and reports the write', async () => {
		mockToggle(() => result(true));

		const written = await setTaskStatus('/vault/a.md', item('Call Ana 📅 2026-11-20 ^abc', 4), 'in-progress');

		expect(written).toBe(true);
		expect(invoke).toHaveBeenCalledWith('toggle_task_status', {
			path: '/vault/a.md',
			lineNumber: 4,
			expectedText: 'Call Ana 📅 2026-11-20 ^abc',
			expectedStatus: 'todo',
			target: 'in-progress',
		});
	});

	it('refetches and writes nothing more on a stale line, with the stale message', async () => {
		mockToggle(() => result(false, true));

		const written = await setTaskStatus('/vault/a.md', item('task'), 'cancelled');

		expect(written).toBe(false);
		expect(commands()).toEqual(['toggle_task_status', 'get_all_tasks_v2']);
		expect(toast.info).toHaveBeenCalledWith('The task changed on disk, so the list was refreshed. Try again.');
	});

	it('returns false for an unchanged write', async () => {
		mockToggle(() => result(false));

		expect(await setTaskStatus('/vault/a.md', item('task'), 'done')).toBe(false);
	});

	it('sends no IPC and leaves a dirty open tab dirty when the target is the current status', async () => {
		editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content: '- [/] task\ntyped', savedContent: '- [/] task' });
		mockToggle(() => result(true));

		const written = await setTaskStatus('/vault/a.md', item('task', 1, 'in-progress'), 'in-progress');

		expect(written).toBe(false);
		expect(invoke).not.toHaveBeenCalled();
		expect(editorStore.tabs[0].content).toBe('- [/] task\ntyped');
		expect(editorStore.tabs[0].savedContent).toBe('- [/] task');
		expect(toast.dismiss).not.toHaveBeenCalled();
	});

	it('toggleTask goes through the same path: done for an open task, todo for a closed one', async () => {
		mockToggle(() => result(false));

		await toggleTask('/vault/a.md', item('call', 3, 'in-progress'));
		await toggleTask('/vault/a.md', item('call', 3, 'cancelled'));

		const sent = vi.mocked(invoke).mock.calls.filter((c) => c[0] === 'toggle_task_status').map((c) => c[1]);
		expect(sent).toEqual([
			{ path: '/vault/a.md', lineNumber: 3, expectedText: 'call', expectedStatus: 'in-progress', target: 'done' },
			{ path: '/vault/a.md', lineNumber: 3, expectedText: 'call', expectedStatus: 'cancelled', target: 'todo' },
		]);
	});

	describe('from the menu, with Undo', () => {
		afterEach(() => {
			// Releases a held toast id so the next test starts with none.
			resetTasks();
		});

		/** The options of the `n`th (0-based) `toast(...)` call. */
		function toastOptions(n = 0) {
			return vi.mocked(toast).mock.calls[n][1] as {
				description: string;
				action: { label: string; onClick: () => void };
				onDismiss: (t: { id: string | number }) => void;
			};
		}

		it('shows an Undo toast after a menu write, and Undo writes the previous status back', async () => {
			mockToggle(() => result(true));

			await setTaskStatusFromMenu('/vault/a.md', item('Call Ana 🆔 td-123 ^abc', 2), 'cancelled');

			expect(toast).toHaveBeenCalledTimes(1);
			expect(vi.mocked(toast).mock.calls[0][0]).toBe('Task marked Cancelled');
			const options = toastOptions();
			expect(options.description).toBe('Call Ana');
			expect(options.action.label).toBe('Undo');

			options.action.onClick();
			await vi.waitFor(() => expect(commands().filter((c) => c === 'toggle_task_status')).toHaveLength(2));
			const sent = vi.mocked(invoke).mock.calls.filter((c) => c[0] === 'toggle_task_status').map((c) => c[1]);
			expect(sent[1]).toEqual({
				path: '/vault/a.md',
				lineNumber: 2,
				expectedText: 'Call Ana 🆔 td-123 ^abc',
				expectedStatus: 'cancelled',
				target: 'todo',
			});
			// Undo shows no second toast.
			expect(toast).toHaveBeenCalledTimes(1);
		});

		it('shows no toast when the write changed nothing or went stale', async () => {
			mockToggle(() => result(false));
			await setTaskStatusFromMenu('/vault/a.md', item('task'), 'done');
			mockToggle(() => result(false, true));
			await setTaskStatusFromMenu('/vault/a.md', item('task'), 'done');
			await setTaskStatusFromMenu('/vault/a.md', item('task', 1, 'done'), 'done');

			expect(toast).not.toHaveBeenCalled();
		});

		it('shows no toast when the vault switched while the write was in flight', async () => {
			let resolve!: (r: ToggleTaskResultV2) => void;
			mockToggle(() => new Promise((r) => (resolve = r)));

			const pending = setTaskStatusFromMenu('/vault/a.md', item('task'), 'done');
			await vi.waitFor(() => expect(commands()).toContain('toggle_task_status'));
			resetTasks();
			resolve(result(true));
			await pending;

			expect(toast).not.toHaveBeenCalled();
		});

		it('writes nothing on an Undo clicked after a vault switch', async () => {
			mockToggle(() => result(true));
			await setTaskStatusFromMenu('/vault/a.md', item('task'), 'done');
			const onClick = toastOptions().action.onClick;

			resetTasks();
			onClick();
			await Promise.resolve();

			expect(commands().filter((c) => c === 'toggle_task_status')).toHaveLength(1);
		});

		it('dismisses the first toast on a second write, and a held toast on resetTasks', async () => {
			mockToggle(() => result(true));
			await setTaskStatusFromMenu('/vault/a.md', item('one', 1), 'done');
			expect(toast.dismiss).not.toHaveBeenCalled();

			await setTaskStatusFromMenu('/vault/a.md', item('two', 2), 'done');
			expect(toast.dismiss).toHaveBeenCalledTimes(1);
			expect(toast.dismiss).toHaveBeenCalledWith('undo-1');

			resetTasks();
			expect(toast.dismiss).toHaveBeenCalledTimes(2);
		});

		it('dismisses the first toast when two menu writes overlap', async () => {
			const resolvers: Array<(r: ToggleTaskResultV2) => void> = [];
			mockToggle(() => new Promise((r) => resolvers.push(r)));
			vi.mocked(toast).mockReturnValueOnce('undo-1').mockReturnValueOnce('undo-2');

			const first = setTaskStatusFromMenu('/vault/a.md', item('one', 1), 'done');
			const second = setTaskStatusFromMenu('/vault/a.md', item('two', 2), 'done');
			await vi.waitFor(() => expect(resolvers).toHaveLength(2));
			resolvers[0](result(true));
			await first;
			resolvers[1](result(true));
			await second;

			expect(toast).toHaveBeenCalledTimes(2);
			expect(toast.dismiss).toHaveBeenCalledTimes(1);
			expect(toast.dismiss).toHaveBeenCalledWith('undo-1');
		});

		it('a circle toggle after a menu write dismisses its toast', async () => {
			mockToggle(() => result(true));
			await setTaskStatusFromMenu('/vault/a.md', item('one', 1), 'in-progress');

			await toggleTask('/vault/a.md', item('two', 2));

			expect(toast.dismiss).toHaveBeenCalledWith('undo-1');
			expect(toast).toHaveBeenCalledTimes(1);
		});

		it('never calls toast.dismiss with no id held: not after the toast was dismissed, not on resetTasks', async () => {
			mockToggle(() => result(true));
			resetTasks();
			await setTaskStatus('/vault/a.md', item('one', 1), 'done');
			expect(toast.dismiss).not.toHaveBeenCalled();

			await setTaskStatusFromMenu('/vault/a.md', item('two', 2), 'done');
			toastOptions().onDismiss({ id: 'undo-1' });
			resetTasks();
			await setTaskStatus('/vault/a.md', item('three', 3), 'done');

			expect(toast.dismiss).not.toHaveBeenCalled();
		});
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

	it('raises the reset generation by one on each call', () => {
		const start = getTasksResetGeneration();

		resetTasks();
		expect(getTasksResetGeneration()).toBe(start + 1);
		resetTasks();
		expect(getTasksResetGeneration()).toBe(start + 2);
	});
});
