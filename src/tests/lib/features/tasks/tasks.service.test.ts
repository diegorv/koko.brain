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
	setTaskSources,
	toggleTask,
	setTaskStatus,
	setTaskStatusFromMenu,
	updateTask,
	updateTaskFromMenu,
	openTasksTab,
	closeTasksTab,
	toggleTasksTab,
	resetTasks,
	getTasksResetGeneration,
	loadSavedTasksView,
} from '#lib/features/tasks/tasks.service.js';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { headingSources } from '#lib/features/tasks/task-query.logic.js';
import { resolveDuePreset } from '#lib/features/tasks/task-row-edit.logic.js';
import { formatNow } from '#lib/utils/date.js';
import { setDueToken } from '#lib/utils/task-tokens.js';
import type { NoteEntryV2, ToggleTaskResultV2 } from '#lib/types/vault-v2.types.js';
import type { TaskItem } from '#lib/features/tasks/tasks.types.js';
import type { TaskPriority, TaskStatus } from '#lib/features/tasks/task-metadata.types.js';
import { taskV2 } from '../../../fixtures/tasks.fixture';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

/** A note's snapshot entry with one todo task per text, on lines 1, 2, ... (`modifiedAt` in seconds). */
function note(path: string, modifiedAtSec: number, texts: string[], overrides: Partial<NoteEntryV2> = {}): NoteEntryV2 {
	return entryV2(path, {
		modifiedAt: modifiedAtSec,
		tasks: texts.map((text, i) => taskV2(text, { lineNumber: i + 1 })),
		...overrides,
	});
}

/** The paths of the notes the rows come from, in row order. */
const rowPaths = () => [...new Set(tasksStore.rows.map((r) => r.filePath))];
const rowTexts = () => tasksStore.rows.map((r) => r.text);
/** The texts of the rows the list shows, after the sources, excludes and quick filters. */
const visibleTexts = () => tasksStore.visibleRows.map((r) => r.text);

/**
 * A note with a task under `## Inbox #to-list`, one under `## Job #work` and
 * one under `## Misc`, on lines 2, 4 and 6.
 */
function sectioned(path = '/vault/a.md'): NoteEntryV2 {
	return entryV2(path, {
		taskHeadings: [
			{ level: 2, text: 'Inbox #to-list', line: 1 },
			{ level: 2, text: 'Job #work', line: 3 },
			{ level: 2, text: 'Misc', line: 5 },
		],
		tasks: [
			taskV2('listed', { lineNumber: 2, heading: 0 }),
			taskV2('work item', { lineNumber: 4, heading: 1 }),
			taskV2('misc item', { lineNumber: 6, heading: 2 }),
		],
	});
}

/** Starts a test from an empty Tasks state, overlay and snapshot memo. */
function resetAll(): void {
	vi.clearAllMocks();
	resetTasks();
	invalidateVaultEntries();
	editorStore.reset();
}

describe('buildTaskIndex', () => {
	beforeEach(() => {
		resetAll();
		tasksStore.setSources([]);
	});

	it('fills the rows from the get_all_vault_entries_v2 snapshot', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([note('/vault/a.md', 100, ['task one', 'task two']), note('/vault/b.md', 200, ['done task'])]);

		await buildTaskIndex();

		expect(invoke).toHaveBeenCalledWith('get_all_vault_entries_v2');
		expect(vi.mocked(invoke).mock.calls.map(([cmd]) => cmd)).toEqual(['get_all_vault_entries_v2']);
		expect(rowPaths()).toEqual(['/vault/a.md', '/vault/b.md']);
		expect(rowTexts()).toEqual(['task one', 'task two', 'done task']);
	});

	it('converts modifiedAt seconds → milliseconds', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([note('/vault/a.md', 1700000000, ['x'])]);

		await buildTaskIndex();

		expect(tasksStore.rows[0].modifiedAt).toBe(1700000000 * 1000);
	});

	it('clears loading state after completion', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([]);
		await buildTaskIndex();
		expect(tasksStore.isLoading).toBe(false);
	});

	it('handles an empty snapshot', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([]);
		await buildTaskIndex();
		expect(tasksStore.rows).toEqual([]);
	});

	it('keeps every task in the rows, and a tag heading card selects the ones under its heading', async () => {
		tasksStore.setSources(headingSources(['#to-list']));
		vi.mocked(invoke).mockResolvedValueOnce([sectioned()]);

		await buildTaskIndex();

		expect(rowTexts()).toEqual(['listed', 'work item', 'misc item']);
		expect(visibleTexts()).toEqual(['listed']);
		expect([tasksStore.visibleRows[0].noteTaskCount, tasksStore.visibleRows[0].noteOpenCount]).toEqual([1, 1]);
	});

	it('selects a task under the heading of any tag card', async () => {
		tasksStore.setSources(headingSources(['#to-list', '#work']));
		vi.mocked(invoke).mockResolvedValueOnce([sectioned()]);

		await buildTaskIndex();

		expect(visibleTexts()).toEqual(['listed', 'work item']);
	});

	it('lists every task when there is no card', async () => {
		tasksStore.setSources([]);
		vi.mocked(invoke).mockResolvedValueOnce([sectioned()]);

		await buildTaskIndex();

		expect(rowTexts()).toEqual(['listed', 'work item', 'misc item']);
	});

	it('shares one snapshot read between two calls at one index version', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([note('/vault/a.md', 100, ['x'])]);

		await Promise.all([buildTaskIndex(), buildTaskIndex()]);

		expect(invoke).toHaveBeenCalledTimes(1);
		expect(rowTexts()).toEqual(['x']);
	});

	it('clears loading state even on IPC error', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('boom'));
		await buildTaskIndex();
		expect(tasksStore.isLoading).toBe(false);
	});

	it('keeps the newer result when an older call resolves last', async () => {
		let resolveFirst!: (v: NoteEntryV2[]) => void;
		let resolveSecond!: (v: NoteEntryV2[]) => void;
		vi.mocked(invoke)
			.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
			.mockImplementationOnce(() => new Promise((r) => (resolveSecond = r)));

		const first = buildTaskIndex();
		invalidateVaultEntries();
		const second = buildTaskIndex();
		resolveSecond([note('/vault/new.md', 200, ['new'])]);
		await second;
		expect(tasksStore.isLoading).toBe(false);
		resolveFirst([note('/vault/old.md', 100, ['old'])]);
		await first;

		expect(rowPaths()).toEqual(['/vault/new.md']);
		expect(tasksStore.isLoading).toBe(false);
	});

	it('stays loading while a newer call is in flight after an older one finishes', async () => {
		let resolveFirst!: (v: NoteEntryV2[]) => void;
		let resolveSecond!: (v: NoteEntryV2[]) => void;
		vi.mocked(invoke)
			.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
			.mockImplementationOnce(() => new Promise((r) => (resolveSecond = r)));

		const first = buildTaskIndex();
		invalidateVaultEntries();
		const second = buildTaskIndex();
		resolveFirst([note('/vault/old.md', 100, ['old'])]);
		await first;
		expect(tasksStore.isLoading).toBe(true);
		expect(tasksStore.rows).toEqual([]);

		resolveSecond([note('/vault/new.md', 200, ['new'])]);
		await second;
		expect(rowPaths()).toEqual(['/vault/new.md']);
		expect(tasksStore.isLoading).toBe(false);
	});

	it('drops a call that resolves after resetTasks', async () => {
		let resolveCall!: (v: NoteEntryV2[]) => void;
		vi.mocked(invoke).mockImplementationOnce(() => new Promise((r) => (resolveCall = r)));

		const pending = buildTaskIndex();
		resetTasks();
		resolveCall([note('/vault/old-vault.md', 100, ['stale'])]);
		await pending;

		expect(tasksStore.rows).toEqual([]);
		expect(tasksStore.isLoading).toBe(false);
	});

	it('sets hasLoaded after a successful fetch', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([note('/vault/a.md', 100, ['x'])]);
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
		let resolveCall!: (v: NoteEntryV2[]) => void;
		vi.mocked(invoke).mockImplementationOnce(() => new Promise((r) => (resolveCall = r)));

		const pending = buildTaskIndex();
		resetTasks();
		resolveCall([note('/vault/old-vault.md', 100, ['stale'])]);
		await pending;

		expect(tasksStore.hasLoaded).toBe(false);
	});

	it('reports only the error of the latest call', async () => {
		let rejectFirst!: (e: Error) => void;
		vi.mocked(invoke)
			.mockImplementationOnce(() => new Promise((_r, j) => (rejectFirst = j)))
			.mockResolvedValueOnce([note('/vault/new.md', 200, ['new'])]);

		const first = buildTaskIndex();
		invalidateVaultEntries();
		await buildTaskIndex();
		rejectFirst(new Error('superseded boom'));
		await first;
		expect(error).not.toHaveBeenCalled();

		vi.mocked(invoke).mockRejectedValueOnce(new Error('latest boom'));
		invalidateVaultEntries();
		await buildTaskIndex();
		expect(error).toHaveBeenCalledWith('TASKS', 'buildTaskIndex failed:', expect.any(Error));
		expect(rowPaths()).toEqual(['/vault/new.md']);
	});
});

describe('buildTaskIndex: note order', () => {
	beforeEach(() => {
		resetAll();
		tasksStore.setSources([]);
	});

	it('lists notes by path, whatever order the snapshot holds them in', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([note('/vault/B.md', 200, ['b']), note('/vault/A.md', 100, ['a'])]);

		await buildTaskIndex();

		expect(rowPaths()).toEqual(['/vault/A.md', '/vault/B.md']);
	});

	it('compares numbers in note paths as numbers', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([note('/vault/note 10.md', 200, ['x']), note('/vault/note 9.md', 100, ['y'])]);

		await buildTaskIndex();

		expect(rowPaths()).toEqual(['/vault/note 9.md', '/vault/note 10.md']);
	});

	it('sorts the notes a tag heading card keeps too', async () => {
		tasksStore.setSources(headingSources(['#to-list']));
		vi.mocked(invoke).mockResolvedValueOnce([sectioned('/vault/C.md'), sectioned('/vault/A.md'), sectioned('/vault/B.md')]);

		await buildTaskIndex();

		expect(rowPaths()).toEqual(['/vault/A.md', '/vault/B.md', '/vault/C.md']);
	});

	it('leaves the snapshot array in the order it came in', async () => {
		const snapshot = [note('/vault/B.md', 200, ['b']), note('/vault/A.md', 100, ['a'])];
		vi.mocked(invoke).mockResolvedValueOnce(snapshot);

		await buildTaskIndex();

		expect(snapshot.map((e) => e.path)).toEqual(['/vault/B.md', '/vault/A.md']);
	});
});

describe('buildTaskIndex: rows', () => {
	beforeEach(() => {
		resetAll();
		tasksStore.setSources([]);
		vaultStore.open('/vault');
	});

	afterEach(() => {
		vaultStore.close();
	});

	it('stores the rows in the sorted note order with relPath and folder set', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			note('/vault/Projects/B.md', 200, ['b1', 'b2']),
			note('/vault/A.md', 100, ['a']),
		]);

		await buildTaskIndex();

		expect(tasksStore.rows.map((r) => [r.filePath, r.relPath, r.folder, r.lineNumber])).toEqual([
			['/vault/A.md', 'A.md', '', 1],
			['/vault/Projects/B.md', 'Projects/B.md', 'Projects', 1],
			['/vault/Projects/B.md', 'Projects/B.md', 'Projects', 2],
		]);
		expect(tasksStore.rows[0].modifiedAt).toBe(100 * 1000);
	});

	it('carries the note fields of the entry', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			note('/vault/A.md', 100, ['a'], { isA: 'Project', tags: ['work'], favorite: true, frontmatter: { n: 1 } }),
		]);

		await buildTaskIndex();

		expect(tasksStore.rows[0]).toMatchObject({ noteType: 'Project', noteTags: ['work'], favorite: true, properties: { n: 1 } });
	});

	it('writes no rows from a superseded request', async () => {
		let resolveFirst!: (v: NoteEntryV2[]) => void;
		let resolveSecond!: (v: NoteEntryV2[]) => void;
		vi.mocked(invoke)
			.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
			.mockImplementationOnce(() => new Promise((r) => (resolveSecond = r)));

		const first = buildTaskIndex();
		invalidateVaultEntries();
		const second = buildTaskIndex();
		resolveSecond([note('/vault/new.md', 200, ['new'])]);
		await second;
		resolveFirst([note('/vault/old.md', 100, ['old'])]);
		await first;

		expect(rowPaths()).toEqual(['/vault/new.md']);
	});

	it('leaves the rows empty after resetTasks', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([note('/vault/a.md', 100, ['x'])]);
		await buildTaskIndex();
		expect(tasksStore.rows).toHaveLength(1);

		resetTasks();

		expect(tasksStore.rows).toEqual([]);
	});

	it('leaves the rows untouched when the fetch fails', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([note('/vault/a.md', 100, ['x'])]);
		await buildTaskIndex();
		const before = tasksStore.rows;

		vi.mocked(invoke).mockRejectedValueOnce(new Error('boom'));
		invalidateVaultEntries();
		await buildTaskIndex();

		expect(tasksStore.rows).toBe(before);
	});
});

describe('buildTaskIndex: refresh error', () => {
	const MESSAGE = 'Tasks could not be refreshed. The log has the details.';

	beforeEach(() => {
		resetAll();
		tasksStore.setSources([]);
	});

	it('sets the fixed message when the latest call fails, logging the raw error, and keeps the rows', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([note('/vault/a.md', 100, ['x'])]);
		await buildTaskIndex();
		const before = tasksStore.rows;

		const raw = new Error('secret path /vault/x');
		vi.mocked(invoke).mockRejectedValueOnce(raw);
		invalidateVaultEntries();
		await buildTaskIndex();

		expect(tasksStore.error).toBe(MESSAGE);
		expect(tasksStore.error).not.toContain('secret');
		expect(error).toHaveBeenCalledWith('TASKS', 'buildTaskIndex failed:', raw);
		expect(tasksStore.rows).toBe(before);
	});

	it('keeps the error while a new call is in flight and clears it when that call succeeds', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('boom'));
		await buildTaskIndex();
		expect(tasksStore.error).toBe(MESSAGE);

		let resolveCall!: (v: NoteEntryV2[]) => void;
		vi.mocked(invoke).mockImplementationOnce(() => new Promise((r) => (resolveCall = r)));
		const pending = buildTaskIndex();
		expect(tasksStore.error).toBe(MESSAGE);

		resolveCall([note('/vault/a.md', 100, ['x'])]);
		await pending;
		expect(tasksStore.error).toBeNull();
	});

	it('does not set the error for a superseded call that fails', async () => {
		let rejectFirst!: (e: Error) => void;
		vi.mocked(invoke)
			.mockImplementationOnce(() => new Promise((_r, j) => (rejectFirst = j)))
			.mockResolvedValueOnce([note('/vault/new.md', 200, ['new'])]);

		const first = buildTaskIndex();
		invalidateVaultEntries();
		await buildTaskIndex();
		rejectFirst(new Error('superseded boom'));
		await first;

		expect(tasksStore.error).toBeNull();
	});

	it('does not clear the error for a superseded call that succeeds', async () => {
		let resolveFirst!: (v: NoteEntryV2[]) => void;
		vi.mocked(invoke)
			.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
			.mockRejectedValueOnce(new Error('latest boom'));

		const first = buildTaskIndex();
		invalidateVaultEntries();
		await buildTaskIndex();
		expect(tasksStore.error).toBe(MESSAGE);
		resolveFirst([note('/vault/old.md', 100, ['old'])]);
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

describe('setTaskSources', () => {
	beforeEach(() => {
		resetAll();
		settingsStore.reset();
	});

	it('sets the cards, saves the tag cards and lists the tasks under them, with no fetch', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([sectioned()]);
		await buildTaskIndex();

		setTaskSources(headingSources(['#work']));

		expect(tasksStore.query.sources).toEqual(headingSources(['#work']));
		expect(visibleTexts()).toEqual(['work item']);
		expect(settingsStore.tasksView).toEqual({ version: 1, sectionTag: '#work' });
		expect(invoke).toHaveBeenCalledTimes(1);
		expect(tasksStore.isLoading).toBe(false);
	});

	it('lists every task and saves an empty text when the cards are cleared', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([sectioned()]);
		await buildTaskIndex();

		setTaskSources([]);

		expect(visibleTexts()).toEqual(['listed', 'work item', 'misc item']);
		expect(tasksStore.query.sources).toEqual([]);
		expect(settingsStore.tasksView).toEqual({ version: 1, sectionTag: '' });
	});

	it('leaves settingsStore.tasksView unchanged while the tag cards are unchanged', () => {
		const before = settingsStore.tasksView;
		const folder = { clauses: [{ kind: 'folder' as const, path: 'Projects' }] };
		const substring = { clauses: [{ kind: 'heading' as const, text: 'Inbox', match: 'substring' as const }] };

		setTaskSources([...headingSources(['#to-list']), folder]);
		setTaskSources([...headingSources(['#to-list']), folder, substring]);
		setTaskSources([...headingSources(['#to-list']), { clauses: [...folder.clauses, ...headingSources(['#x'])[0].clauses] }]);
		tasksStore.setExclude({ ...tasksStore.query.exclude, archived: false });

		expect(settingsStore.tasksView).toBe(before);
	});

	it('does not save an emptied heading card until it holds text', () => {
		setTaskSources([...headingSources(['#to-list']), ...headingSources([''])]);
		setTaskSources([...headingSources(['#to-list']), ...headingSources(['#'])]);
		expect(settingsStore.tasksView).toBeUndefined();

		setTaskSources([...headingSources(['#to-list']), ...headingSources(['#w'])]);

		expect(settingsStore.tasksView).toEqual({ version: 1, sectionTag: '#to-list #w' });
	});

	it('starts no fetch before any rows were loaded', () => {
		setTaskSources(headingSources(['#a']));

		expect(invoke).not.toHaveBeenCalled();
		expect(tasksStore.query.sources).toEqual(headingSources(['#a']));
		expect(settingsStore.tasksView).toEqual({ version: 1, sectionTag: '#a' });
	});
});

describe('loadSavedTasksView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tasksStore.reset();
		settingsStore.reset();
	});

	it('sets the #to-list card when nothing was saved, and starts no fetch', () => {
		tasksStore.setSources([]);

		loadSavedTasksView();

		expect(tasksStore.query.sources).toEqual(headingSources(['#to-list']));
		expect(invoke).not.toHaveBeenCalled();
		expect(settingsStore.tasksView).toBeUndefined();
	});

	it('sets one heading card per saved tag', () => {
		settingsStore.updateTasksView({ version: 1, sectionTag: '#work, home' });

		loadSavedTasksView();

		expect(tasksStore.query.sources).toEqual(headingSources(['#work', '#home']));
		expect(error).not.toHaveBeenCalled();
	});

	it('logs and toasts an invalid value, and leaves it in settings', () => {
		settingsStore.updateTasksView(42);

		loadSavedTasksView();

		expect(tasksStore.query.sources).toEqual(headingSources(['#to-list']));
		expect(error).toHaveBeenCalledWith('TASKS', 'Invalid tasksView in settings.json:', 42);
		expect(toast.error).toHaveBeenCalledWith('The saved Tasks section tags could not be read, so #to-list is used.');
		expect(settingsStore.tasksView).toBe(42);
	});
});

describe('toggleTask', () => {
	beforeEach(() => {
		resetAll();
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

	it('shows a changed toggle at once from the memoized snapshot, without any vaultIndexVersion bump', async () => {
		tasksStore.setSources([]);
		vi.mocked(invoke)
			.mockResolvedValueOnce([note('/vault/a.md', 100, ['task'])])
			.mockResolvedValueOnce(makeResult('- [x] task'));
		await buildTaskIndex();

		await toggleTask('/vault/a.md', tasksStore.rows[0]);

		// The throttled vault-index-updated bump can land 2-10 s later; the
		// overlay shows the write now, over the snapshot the memo still holds.
		expect(vi.mocked(invoke).mock.calls.map(([cmd]) => cmd)).toEqual(['get_all_vault_entries_v2', 'toggle_task_status']);
		expect(tasksStore.rows).toHaveLength(1);
		expect(tasksStore.rows[0].checked).toBe(true);
		expect(tasksStore.isLoading).toBe(false);
	});

	it('refetches the Tasks store and asks to try again when the line is stale', async () => {
		editorStore.addTab({
			path: '/vault/a.md',
			name: 'a.md',
			content: '- [ ] other',
			savedContent: '- [ ] other',
		});
		tasksStore.setSources([]);
		vi.mocked(invoke)
			.mockResolvedValueOnce([note('/vault/a.md', 100, ['task'])])
			.mockResolvedValueOnce(makeResult('- [ ] other', /* changed */ false, /* stale */ true))
			.mockResolvedValueOnce([note('/vault/a.md', 100, ['other'])]);
		await buildTaskIndex();
		const signalBefore = editorStore.externalContentSignal;

		await toggleTask('/vault/a.md', tasksStore.rows[0]);

		// The memo was primed by the first read: the stale result reads the snapshot again.
		expect(invoke).toHaveBeenNthCalledWith(3, 'get_all_vault_entries_v2');
		expect(rowTexts()).toEqual(['other']);
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
		expect(tasksStore.rows).toHaveLength(0);
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
		resetAll();
		tasksStore.setSources([]);
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
		expect(commands()).toEqual(['toggle_task_status', 'get_all_vault_entries_v2']);
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
		resetAll();
		tasksStore.setSources([]);
	});

	it('clears the rows and closes tab', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([note('/vault/a.md', 100, ['x'])]);
		await buildTaskIndex();
		openTasksTab();
		expect(tasksStore.rows.length).toBeGreaterThan(0);

		resetTasks();

		expect(tasksStore.rows).toEqual([]);
		expect(editorStore.tabs).toHaveLength(0);
	});

	it('writes nothing to settings', () => {
		settingsStore.reset();
		setTaskSources(headingSources(['#work']));
		const saved = settingsStore.tasksView;

		resetTasks();

		expect(settingsStore.tasksView).toBe(saved);
		expect(tasksStore.query.sources).toEqual(headingSources(['#to-list']));
	});

	it('raises the reset generation by one on each call', () => {
		const start = getTasksResetGeneration();

		resetTasks();
		expect(getTasksResetGeneration()).toBe(start + 1);
		resetTasks();
		expect(getTasksResetGeneration()).toBe(start + 2);
	});
});

describe("the view's own writes: overlay and prompt refresh", () => {
	const PATH = '/vault/a.md';
	/** The checkbox char of each status the fake writes, and back. */
	const CHAR: Partial<Record<TaskStatus, string>> = { todo: ' ', done: 'x', 'in-progress': '/', cancelled: '-' };
	const STATUS_OF = Object.fromEntries(Object.entries(CHAR).map(([status, char]) => [char, status as TaskStatus]));

	/** Fake disk: file contents by path. */
	const disk = new Map<string, string>();
	/** What `get_all_vault_entries_v2` returns; the fake never updates it on a write, as the throttled bump would. */
	let snapshot: NoteEntryV2[] = [];
	/** Version of the next write: above the current `vaultIndexVersion`. */
	let nextVersion = 0;
	let baseVersion = 0;
	/** Run inside `toggle_task_status`, before it answers. */
	let onToggle: (() => void) | null = null;
	let toggleThrows = false;
	/** Makes `toggle_task_status` answer unchanged without stale, as Rust does when the write is a no-op. */
	let unchangedNext = false;

	/**
	 * A fake Rust over the fake disk. `toggle_task_status` compares the disk
	 * line with `expectedText` / `expectedStatus` as `toggle_task_status_inner`
	 * does: a mismatch is `stale`, a target equal to the line is unchanged,
	 * otherwise the line is rewritten and a version above the current one
	 * returned.
	 */
	function fakeRust(): void {
		vi.mocked(invoke).mockImplementation(async (cmd: string, raw?: unknown) => {
			if (cmd === 'get_all_vault_entries_v2') return snapshot;
			if (cmd !== 'toggle_task_status') return undefined;
			onToggle?.();
			if (toggleThrows) throw new Error('disk gone');
			const args = raw as { path: string; lineNumber: number; expectedText: string; expectedStatus: TaskStatus; target: TaskStatus };
			const content = disk.get(args.path) ?? '';
			const lines = content.split('\n');
			const match = /^(\s*- \[)(.)(\] )(.*)$/.exec(lines[args.lineNumber - 1] ?? '');
			const unchanged = { changed: false, affected: [], version: vaultStore.vaultIndexVersion, upserted: [], removed: [], fullRescan: false };
			if (unchangedNext) return { updatedContent: content, updateResult: unchanged, stale: false };
			if (!match || match[4] !== args.expectedText || STATUS_OF[match[2]] !== args.expectedStatus) {
				return { updatedContent: content, updateResult: unchanged, stale: true };
			}
			if (args.target === args.expectedStatus) return { updatedContent: content, updateResult: unchanged, stale: false };
			lines[args.lineNumber - 1] = `${match[1]}${CHAR[args.target]}${match[3]}${match[4]}`;
			const updated = lines.join('\n');
			disk.set(args.path, updated);
			return {
				updatedContent: updated,
				updateResult: { changed: true, affected: [], version: nextVersion++, upserted: [args.path], removed: [], fullRescan: false },
				stale: false,
			};
		});
	}

	const toggleCalls = () =>
		vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'toggle_task_status').map(([, args]) => args as Record<string, unknown>);
	const snapshotReads = () => vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'get_all_vault_entries_v2').length;

	beforeEach(() => {
		resetAll();
		tasksStore.setSources([]);
		disk.clear();
		disk.set(PATH, '- [ ] task');
		snapshot = [note(PATH, 100, ['task'])];
		baseVersion = vaultStore.vaultIndexVersion;
		nextVersion = baseVersion + 1;
		onToggle = null;
		toggleThrows = false;
		unchangedNext = false;
		fakeRust();
	});

	afterEach(() => {
		// The counter is module state: later tests expect overlay versions above it.
		vaultStore.bumpVaultIndexVersion(baseVersion);
		vaultStore.takePromptIndexRefresh();
		vi.mocked(invoke).mockReset();
	});

	it('shows a toggle at once and lets the row toggle back, with the snapshot still before it', async () => {
		await buildTaskIndex();

		await toggleTask(PATH, tasksStore.rows[0]);

		expect(tasksStore.rows[0]).toMatchObject({ status: 'done', checked: true, open: false });

		await toggleTask(PATH, tasksStore.rows[0]);

		expect(toggleCalls()[1]).toMatchObject({ expectedText: 'task', expectedStatus: 'done', target: 'todo' });
		expect(toast.info).not.toHaveBeenCalled();
		expect(tasksStore.rows[0]).toMatchObject({ status: 'todo', checked: false, open: true });
		expect(disk.get(PATH)).toBe('- [ ] task');
	});

	it('asks for a prompt index refresh right before the toggle command', async () => {
		let requestedAtCall: boolean | undefined;
		onToggle = () => {
			requestedAtCall = vaultStore.takePromptIndexRefresh();
			// The probe must not consume what it measures.
			if (requestedAtCall) vaultStore.requestPromptIndexRefresh();
		};
		await buildTaskIndex();

		await toggleTask(PATH, tasksStore.rows[0]);

		expect(requestedAtCall).toBe(true);
	});

	it.each([
		['a stale result', () => disk.set(PATH, '- [ ] edited elsewhere')],
		['an unchanged result', () => (unchangedNext = true)],
		['a thrown call', () => (toggleThrows = true)],
	])('clears the prompt refresh request after %s, when Rust emits nothing', async (_label, arrange) => {
		let requestedAtCall: boolean | undefined;
		onToggle = () => {
			requestedAtCall = vaultStore.takePromptIndexRefresh();
			if (requestedAtCall) vaultStore.requestPromptIndexRefresh();
		};
		arrange();

		await setTaskStatus(PATH, { text: 'task', status: 'todo', lineNumber: 1 }, 'done');

		expect(requestedAtCall).toBe(true);
		expect(vaultStore.takePromptIndexRefresh()).toBe(false);
	});

	it('keeps the written status until a snapshot read at the write version, then shows the snapshot', async () => {
		nextVersion = baseVersion + 7;
		await buildTaskIndex();
		await toggleTask(PATH, tasksStore.rows[0]);
		expect(tasksStore.rows[0].status).toBe('done');

		vaultStore.bumpVaultIndexVersion(baseVersion + 6);
		await buildTaskIndex();
		expect(snapshotReads()).toBe(2);
		expect(tasksStore.rows[0].status).toBe('done');

		// The snapshot still says todo: at the write's version it must win.
		vaultStore.bumpVaultIndexVersion(baseVersion + 7);
		await buildTaskIndex();
		expect(snapshotReads()).toBe(3);
		expect(tasksStore.rows[0]).toMatchObject({ status: 'todo', checked: false, open: true });
	});

	it('reads a fresh snapshot on a stale result and drops the overlay entry of that line', async () => {
		await buildTaskIndex();
		await toggleTask(PATH, tasksStore.rows[0]);
		expect(tasksStore.rows[0]).toMatchObject({ text: 'task', status: 'done' });

		// Another writer replaced the line; the memo still holds the first snapshot.
		disk.set(PATH, '- [ ] other');
		snapshot = [note(PATH, 200, ['other'])];
		await toggleTask(PATH, tasksStore.rows[0]);

		expect(snapshotReads()).toBe(2);
		expect(tasksStore.rows[0]).toMatchObject({ text: 'other', status: 'todo' });
		expect(toast.info).toHaveBeenCalledWith('The task changed on disk, so the list was refreshed. Try again.');
	});

	it('clears the overlay on resetTasks, so it never applies to the next vault at the same key', async () => {
		await buildTaskIndex();
		await toggleTask(PATH, tasksStore.rows[0]);
		expect(tasksStore.rows[0].status).toBe('done');

		resetTasks();
		invalidateVaultEntries();
		tasksStore.setSources([]);
		await buildTaskIndex();

		expect(tasksStore.rows[0]).toMatchObject({ text: 'task', status: 'todo' });
	});
});

describe('updateTask: a row menu text write through write_task_text', () => {
	const PATH = '/vault/a.md';
	const CHAR: Partial<Record<TaskStatus, string>> = { todo: ' ', done: 'x', 'in-progress': '/', cancelled: '-' };
	const STATUS_OF = Object.fromEntries(Object.entries(CHAR).map(([status, char]) => [char, status as TaskStatus]));
	const PRIORITY_OF: Record<string, TaskPriority> = { '🔺': 'highest', '⏫': 'high', '🔼': 'medium', '🔽': 'low', '⏬': 'lowest' };

	/** Fake disk: file contents by path. */
	const disk = new Map<string, string>();
	/** What `get_all_vault_entries_v2` returns; the fake never updates it on a write, as the throttled bump would. */
	let snapshot: NoteEntryV2[] = [];
	let nextVersion = 0;
	let baseVersion = 0;
	/** Run inside `write_task_text`, before it answers. */
	let onWrite: (() => void | Promise<void>) | null = null;
	let writeThrows = false;

	/** The metadata Rust parses from a task text: due date and priority only, which is all these tests read. */
	function parsed(text: string): TaskItem['metadata'] {
		const due = /📅 (\d{4}-\d{2}-\d{2})/u.exec(text)?.[1];
		const priority = /[🔺⏫🔼🔽⏬]/u.exec(text)?.[0];
		return {
			description: text,
			tags: [],
			...(due ? { dueDate: due } : {}),
			...(priority ? { priority: PRIORITY_OF[priority] } : {}),
		};
	}

	/**
	 * A fake Rust over the fake disk. `write_task_text` reads
	 * `vaultRoot/relPath`, answers `stale` when the line no longer holds
	 * `expectedText` with `expectedStatus`, unchanged when `newText` equals it,
	 * and otherwise writes the text after the prefix and returns the re-parsed
	 * task at a version above the current one. `toggle_task_status` writes the
	 * status char the same way.
	 */
	function fakeRust(): void {
		vi.mocked(invoke).mockImplementation(async (cmd: string, raw?: unknown) => {
			if (cmd === 'get_all_vault_entries_v2') return snapshot;
			const unchanged = { changed: false, affected: [], version: vaultStore.vaultIndexVersion, upserted: [], removed: [], fullRescan: false };
			const changed = (path: string) => ({ changed: true, affected: [], version: nextVersion++, upserted: [path], removed: [], fullRescan: false });
			if (cmd === 'toggle_task_status') {
				const args = raw as { path: string; lineNumber: number; expectedText: string; expectedStatus: TaskStatus; target: TaskStatus };
				const lines = (disk.get(args.path) ?? '').split('\n');
				const m = /^(\s*- \[)(.)(\] )(.*)$/.exec(lines[args.lineNumber - 1] ?? '')!;
				lines[args.lineNumber - 1] = `${m[1]}${CHAR[args.target]}${m[3]}${m[4]}`;
				disk.set(args.path, lines.join('\n'));
				return { updatedContent: lines.join('\n'), updateResult: changed(args.path), stale: false };
			}
			if (cmd !== 'write_task_text') return undefined;
			await onWrite?.();
			if (writeThrows) throw new Error('disk gone');
			const args = raw as {
				vaultRoot: string;
				relPath: string;
				lineNumber: number;
				expectedText: string;
				expectedStatus: TaskStatus;
				newText: string;
			};
			const path = `${args.vaultRoot}/${args.relPath}`;
			const content = disk.get(path) ?? '';
			const lines = content.split('\n');
			const m = /^(\s*- \[)(.)(\] )(.*)$/.exec(lines[args.lineNumber - 1] ?? '');
			if (!m || m[4] !== args.expectedText || STATUS_OF[m[2]] !== args.expectedStatus) {
				return { updatedContent: content, updateResult: unchanged, stale: true, task: null };
			}
			if (args.newText === args.expectedText) return { updatedContent: content, updateResult: unchanged, stale: false, task: null };
			lines[args.lineNumber - 1] = `${m[1]}${m[2]}${m[3]}${args.newText}`;
			const updated = lines.join('\n');
			disk.set(path, updated);
			const status = STATUS_OF[m[2]];
			return {
				updatedContent: updated,
				updateResult: changed(path),
				stale: false,
				task: { text: args.newText, checked: status !== 'todo', indent: 0, lineNumber: args.lineNumber, status, metadata: parsed(args.newText) },
			};
		});
	}

	const writeCalls = () =>
		vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'write_task_text').map(([, args]) => args as Record<string, unknown>);
	const commands = () => vi.mocked(invoke).mock.calls.map((c) => c[0]);

	/** The options of the `n`th (0-based) `toast(...)` call. */
	function toastOptions(n = 0) {
		return vi.mocked(toast).mock.calls[n][1] as { description: string; action: { label: string; onClick: () => void } };
	}

	beforeEach(() => {
		resetAll();
		vaultStore.open('/vault');
		tasksStore.setSources([]);
		disk.clear();
		disk.set(PATH, '- [ ] Call Ana ^abc');
		snapshot = [note(PATH, 100, ['Call Ana ^abc'])];
		baseVersion = vaultStore.vaultIndexVersion;
		nextVersion = baseVersion + 1;
		onWrite = null;
		writeThrows = false;
		fakeRust();
	});

	afterEach(() => {
		vaultStore.bumpVaultIndexVersion(baseVersion);
		vaultStore.takePromptIndexRefresh();
		// Releases a held toast id so the next test starts with none.
		resetTasks();
		vi.useRealTimers();
		vi.mocked(invoke).mockReset();
	});

	it("sends the menu's Due tomorrow to write_task_text, and Undo sends the old text back", async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(2026, 10, 5, 12));
		await buildTaskIndex();
		const row = tasksStore.rows[0];
		const date = resolveDuePreset('tomorrow', formatNow('YYYY-MM-DD'));
		const newText = setDueToken(row.text, date);

		await updateTaskFromMenu(PATH, row, newText, `Due set to ${date}`);

		expect(writeCalls()).toEqual([
			{
				vaultRoot: '/vault',
				relPath: 'a.md',
				lineNumber: 1,
				expectedText: 'Call Ana ^abc',
				expectedStatus: 'todo',
				newText: 'Call Ana 📅 2026-11-06 ^abc',
			},
		]);
		expect(disk.get(PATH)).toBe('- [ ] Call Ana 📅 2026-11-06 ^abc');
		expect(vi.mocked(toast).mock.calls[0][0]).toBe('Due set to 2026-11-06');
		expect(toastOptions().description).toBe('Call Ana');
		expect(toastOptions().action.label).toBe('Undo');

		toastOptions().action.onClick();
		await vi.waitFor(() => expect(writeCalls()).toHaveLength(2));
		expect(writeCalls()[1]).toMatchObject({
			lineNumber: 1,
			expectedText: 'Call Ana 📅 2026-11-06 ^abc',
			expectedStatus: 'todo',
			newText: 'Call Ana ^abc',
		});
		await vi.waitFor(() => expect(disk.get(PATH)).toBe('- [ ] Call Ana ^abc'));
		// Undo shows no second toast.
		expect(toast).toHaveBeenCalledTimes(1);
	});

	it('sends nothing and shows no toast when the new text equals the row text', async () => {
		await buildTaskIndex();
		editorStore.addTab({ path: PATH, name: 'a.md', content: '- [ ] Call Ana ^abc\ntyped', savedContent: '- [ ] Call Ana ^abc' });
		vi.mocked(invoke).mockClear();

		expect(await updateTask(PATH, tasksStore.rows[0], 'Call Ana ^abc')).toBe(false);
		await updateTaskFromMenu(PATH, tasksStore.rows[0], 'Call Ana ^abc', 'Due cleared');

		expect(invoke).not.toHaveBeenCalled();
		expect(editorStore.tabs[0].savedContent).toBe('- [ ] Call Ana ^abc');
		expect(toast).not.toHaveBeenCalled();
		expect(toast.dismiss).not.toHaveBeenCalled();
	});

	it('refetches on a stale line, shows the stale copy and writes nothing more', async () => {
		await buildTaskIndex();
		disk.set(PATH, '- [ ] Call Ana tomorrow ^abc');
		snapshot = [note(PATH, 200, ['Call Ana tomorrow ^abc'])];
		vi.mocked(invoke).mockClear();

		await updateTaskFromMenu(PATH, tasksStore.rows[0], 'Call Ana 🔼 ^abc', 'Priority set to Medium');

		expect(commands()).toEqual(['write_task_text', 'get_all_vault_entries_v2']);
		expect(toast.info).toHaveBeenCalledWith('The task changed on disk, so the list was refreshed. Try again.');
		expect(toast).not.toHaveBeenCalled();
		expect(disk.get(PATH)).toBe('- [ ] Call Ana tomorrow ^abc');
		expect(tasksStore.rows[0].text).toBe('Call Ana tomorrow ^abc');
	});

	it('shows no toast for a write that resolves after resetTasks', async () => {
		await buildTaskIndex();
		const row = tasksStore.rows[0];
		let release!: () => void;
		onWrite = () => new Promise<void>((r) => (release = r));

		const pending = updateTaskFromMenu(PATH, row, 'Call Ana ⏫ ^abc', 'Priority set to High');
		await vi.waitFor(() => expect(writeCalls()).toHaveLength(1));
		resetTasks();
		release();
		await pending;

		expect(toast).not.toHaveBeenCalled();
	});

	it('sends nothing on an Undo clicked after a vault switch', async () => {
		await buildTaskIndex();
		await updateTaskFromMenu(PATH, tasksStore.rows[0], 'Call Ana ⏫ ^abc', 'Priority set to High');
		const onClick = toastOptions().action.onClick;

		resetTasks();
		onClick();
		await Promise.resolve();

		expect(writeCalls()).toHaveLength(1);
	});

	it('asks for a prompt index refresh right before the write command', async () => {
		let requestedAtCall: boolean | undefined;
		onWrite = () => {
			requestedAtCall = vaultStore.takePromptIndexRefresh();
			if (requestedAtCall) vaultStore.requestPromptIndexRefresh();
		};
		await buildTaskIndex();

		expect(await updateTask(PATH, tasksStore.rows[0], 'Call Ana ⏫ ^abc')).toBe(true);

		expect(requestedAtCall).toBe(true);
	});

	it.each([
		['a stale result', () => disk.set(PATH, '- [ ] edited elsewhere')],
		['a thrown call', () => (writeThrows = true)],
	])('clears the prompt refresh request after %s, when Rust emits nothing', async (_label, arrange) => {
		let requestedAtCall: boolean | undefined;
		onWrite = () => {
			requestedAtCall = vaultStore.takePromptIndexRefresh();
			if (requestedAtCall) vaultStore.requestPromptIndexRefresh();
		};
		arrange();

		expect(await updateTask(PATH, { text: 'Call Ana ^abc', status: 'todo', lineNumber: 1 }, 'Call Ana ⏫ ^abc')).toBe(false);

		expect(requestedAtCall).toBe(true);
		expect(vaultStore.takePromptIndexRefresh()).toBe(false);
	});

	it('logs and toasts a thrown write, and shows no Undo toast', async () => {
		writeThrows = true;
		await buildTaskIndex();

		await updateTaskFromMenu(PATH, tasksStore.rows[0], 'Call Ana ⏫ ^abc', 'Priority set to High');

		expect(toast.error).toHaveBeenCalledWith('Failed to save task change.');
		expect(error).toHaveBeenCalledWith('TASKS', expect.any(String), expect.any(Error));
		expect(toast).not.toHaveBeenCalled();
	});

	it('refuses a note outside the open vault without sending the write', async () => {
		expect(await updateTask('/elsewhere/b.md', { text: 'x', status: 'todo', lineNumber: 1 }, 'x ⏫')).toBe(false);

		expect(writeCalls()).toHaveLength(0);
		expect(toast.error).toHaveBeenCalledWith('Failed to save task change.');
		expect(vaultStore.takePromptIndexRefresh()).toBe(false);
	});

	it('shows the written due date from the re-parsed task until a snapshot read at the write version', async () => {
		nextVersion = baseVersion + 7;
		await buildTaskIndex();
		expect(tasksStore.rows[0].metadata.dueDate).toBeUndefined();

		await updateTask(PATH, tasksStore.rows[0], 'Call Ana 📅 2026-11-06 ^abc');
		expect(tasksStore.rows[0]).toMatchObject({ text: 'Call Ana 📅 2026-11-06 ^abc', metadata: { dueDate: '2026-11-06' } });

		vaultStore.bumpVaultIndexVersion(baseVersion + 6);
		await buildTaskIndex();
		expect(tasksStore.rows[0].metadata.dueDate).toBe('2026-11-06');

		// The snapshot still holds the pre-edit line: at the write's version it wins.
		vaultStore.bumpVaultIndexVersion(baseVersion + 7);
		await buildTaskIndex();
		expect(tasksStore.rows[0].text).toBe('Call Ana ^abc');
		expect(tasksStore.rows[0].metadata.dueDate).toBeUndefined();
	});

	it('keeps the written due date when a circle toggle follows the due edit', async () => {
		await buildTaskIndex();
		await updateTask(PATH, tasksStore.rows[0], 'Call Ana 📅 2026-11-06 ^abc');

		await toggleTask(PATH, tasksStore.rows[0]);

		expect(tasksStore.rows[0]).toMatchObject({ status: 'done', metadata: { dueDate: '2026-11-06' } });
	});

	it('dismisses the Undo toast of a status menu write, and a status write dismisses its toast', async () => {
		await buildTaskIndex();
		await setTaskStatusFromMenu(PATH, tasksStore.rows[0], 'in-progress');
		expect(toast.dismiss).not.toHaveBeenCalled();

		await updateTaskFromMenu(PATH, tasksStore.rows[0], 'Call Ana ⏫ ^abc', 'Priority set to High');
		expect(toast.dismiss).toHaveBeenCalledTimes(1);

		await toggleTask(PATH, tasksStore.rows[0]);
		expect(toast.dismiss).toHaveBeenCalledTimes(2);
		expect(toast).toHaveBeenCalledTimes(2);
	});
});
