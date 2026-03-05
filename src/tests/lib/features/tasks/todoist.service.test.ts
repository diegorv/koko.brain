import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Mock the Todoist SDK client factory
const { mockGetProjects, mockGetSections, mockAddTask, mockGetTask } = vi.hoisted(() => ({
	mockGetProjects: vi.fn(),
	mockGetSections: vi.fn(),
	mockAddTask: vi.fn(),
	mockGetTask: vi.fn(),
}));

vi.mock('$lib/features/tasks/todoist-client', () => ({
	createTodoistClient: () => ({
		getProjects: mockGetProjects,
		getSections: mockGetSections,
		addTask: mockAddTask,
		getTask: mockGetTask,
	}),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
	mkdir: vi.fn(),
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
}));

import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { todoistStore } from '$lib/features/tasks/todoist.store.svelte';
import {
	fetchProjects,
	fetchSections,
	createTodoistTask,
	fetchTaskById,
	loadSentTasks,
	saveSentTasks,
	sendTaskToTodoist,
	initTodoist,
} from '$lib/features/tasks/todoist.service';

describe('fetchProjects', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		todoistStore.reset();
	});

	it('returns mapped projects on success', async () => {
		mockGetProjects.mockResolvedValue({
			results: [
				{ id: '1', name: 'Inbox', color: 'charcoal', isFavorite: false, childOrder: 0 },
				{ id: '2', name: 'Work', color: 'blue', isFavorite: true, childOrder: 1 },
			],
			nextCursor: null,
		});

		const result = await fetchProjects('test-token');
		expect(result).toEqual([
			{ id: '1', name: 'Inbox', color: 'charcoal', is_favorite: false, child_order: 0 },
			{ id: '2', name: 'Work', color: 'blue', is_favorite: true, child_order: 1 },
		]);
	});

	it('throws on SDK error', async () => {
		mockGetProjects.mockRejectedValue(new Error('Unauthorized'));
		await expect(fetchProjects('bad-token')).rejects.toThrow('Unauthorized');
	});
});

describe('fetchSections', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns mapped sections for a project', async () => {
		mockGetSections.mockResolvedValue({
			results: [
				{ id: 's1', projectId: '1', name: 'Backlog', sectionOrder: 0 },
				{ id: 's2', projectId: '1', name: 'In Progress', sectionOrder: 1 },
			],
			nextCursor: null,
		});

		const result = await fetchSections('test-token', '1');
		expect(result).toEqual([
			{ id: 's1', project_id: '1', name: 'Backlog', section_order: 0 },
			{ id: 's2', project_id: '1', name: 'In Progress', section_order: 1 },
		]);
		expect(mockGetSections).toHaveBeenCalledWith({ projectId: '1' });
	});

	it('throws on SDK error', async () => {
		mockGetSections.mockRejectedValue(new Error('Not Found'));
		await expect(fetchSections('token', 'bad-id')).rejects.toThrow('Not Found');
	});
});

describe('createTodoistTask', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('sends args to SDK and returns id + url', async () => {
		mockAddTask.mockResolvedValue({
			id: 'td-99',
			content: 'Buy groceries',
			projectId: '1',
			sectionId: null,
			priority: 2,
			url: 'https://todoist.com/task/99',
			checked: false,
		});

		const result = await createTodoistTask('token', {
			content: 'Buy groceries',
			projectId: '1',
			priority: 2,
		});

		expect(result).toEqual({ id: 'td-99', url: 'https://todoist.com/task/99' });
		expect(mockAddTask).toHaveBeenCalledWith({
			content: 'Buy groceries',
			projectId: '1',
			priority: 2,
		});
	});

	it('throws on SDK error', async () => {
		mockAddTask.mockRejectedValue(new Error('Bad Request'));
		await expect(createTodoistTask('token', { content: '' })).rejects.toThrow('Bad Request');
	});
});

describe('fetchTaskById', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns task id and checked status', async () => {
		mockGetTask.mockResolvedValue({
			id: 'td-10',
			checked: true,
			content: 'Done task',
		});

		const result = await fetchTaskById('token', 'td-10');
		expect(result).toEqual({ id: 'td-10', checked: true });
	});

	it('returns null when task not found (404)', async () => {
		mockGetTask.mockRejectedValue(new Error('Request failed with status 404'));

		const result = await fetchTaskById('token', 'deleted-task');
		expect(result).toBeNull();
	});

	it('rethrows non-404 errors', async () => {
		mockGetTask.mockRejectedValue(new Error('Server Error 500'));
		await expect(fetchTaskById('token', 'td-10')).rejects.toThrow('Server Error 500');
	});
});

describe('loadSentTasks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/test-vault');
		todoistStore.reset();
	});

	it('returns empty array when file does not exist', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		const result = await loadSentTasks();
		expect(result).toEqual([]);
	});

	it('returns parsed entries from disk', async () => {
		const entries = [
			{ filePath: '/a.md', text: 'Task', todoistTaskId: '1', todoistUrl: '', sentAt: 1000 },
		];
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(entries));

		const result = await loadSentTasks();
		expect(result).toEqual(entries);
	});

	it('returns empty array on parse error', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue('not valid json');

		const result = await loadSentTasks();
		expect(result).toEqual([]);
	});
});

describe('saveSentTasks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/test-vault');
	});

	it('creates .kokobrain dir if needed and writes file', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(mkdir).mockResolvedValue(undefined);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		const entries = [
			{ filePath: '/a.md', text: 'Task', todoistTaskId: '1', todoistUrl: '', sentAt: 1000 },
		];
		await saveSentTasks(entries);

		expect(mkdir).toHaveBeenCalledWith('/test-vault/.kokobrain');
		expect(writeTextFile).toHaveBeenCalledWith(
			'/test-vault/.kokobrain/todoist-sent.json',
			expect.any(String),
		);
	});

	it('skips mkdir when .kokobrain dir exists', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await saveSentTasks([]);
		expect(mkdir).not.toHaveBeenCalled();
		expect(writeTextFile).toHaveBeenCalledWith(
			'/test-vault/.kokobrain/todoist-sent.json',
			JSON.stringify([], null, '\t'),
		);
	});
});

describe('sendTaskToTodoist', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/test-vault');
		settingsStore.reset();
		settingsStore.updateTodoist({ apiToken: 'test-token-123' });
		todoistStore.reset();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
	});

	it('creates task, marks as sent, and persists', async () => {
		mockAddTask.mockResolvedValue({
			id: 'td-50',
			content: 'Write tests',
			projectId: 'p1',
			sectionId: null,
			priority: 2,
			url: 'https://todoist.com/task/50',
			checked: false,
		});

		await sendTaskToTodoist('/vault/todo.md', 'Write tests', 'p1', undefined, 2);

		// Verify task was marked as sent in real store
		expect(todoistStore.isSent('/vault/todo.md', 'Write tests')).toBe(true);
		expect(todoistStore.sentTasks).toHaveLength(1);
		expect(todoistStore.sentTasks[0].todoistTaskId).toBe('td-50');

		// Verify selections were remembered
		expect(todoistStore.lastProjectId).toBe('p1');
		expect(todoistStore.lastPriority).toBe(2);

		// Verify persisted to disk
		expect(writeTextFile).toHaveBeenCalled();
	});

	it('passes SDK-style args (camelCase)', async () => {
		mockAddTask.mockResolvedValue({
			id: 'td-51',
			content: 'Task',
			url: 'https://todoist.com/task/51',
			checked: false,
		});

		await sendTaskToTodoist('/vault/todo.md', 'Task', 'proj1', 'sec1', 3);

		expect(mockAddTask).toHaveBeenCalledWith({
			content: 'Task',
			projectId: 'proj1',
			sectionId: 'sec1',
			priority: 3,
		});
		expect(todoistStore.isSent('/vault/todo.md', 'Task')).toBe(true);
		expect(todoistStore.lastSectionId).toBe('sec1');
	});

	it('omits optional fields when not provided', async () => {
		mockAddTask.mockResolvedValue({
			id: 'td-52',
			content: 'Simple task',
			url: 'https://todoist.com/task/52',
			checked: false,
		});

		await sendTaskToTodoist('/vault/todo.md', 'Simple task');

		expect(mockAddTask).toHaveBeenCalledWith({
			content: 'Simple task',
		});
		expect(todoistStore.isSent('/vault/todo.md', 'Simple task')).toBe(true);
		expect(todoistStore.isSending).toBe(false);
	});

	it('sends priority=1 (Normal) when explicitly selected', async () => {
		mockAddTask.mockResolvedValue({
			id: 'td-53',
			content: 'Task with normal priority',
			url: 'https://todoist.com/task/53',
			checked: false,
		});

		await sendTaskToTodoist('/vault/todo.md', 'Task with normal priority', undefined, undefined, 1);

		expect(mockAddTask).toHaveBeenCalledWith(
			expect.objectContaining({ priority: 1 }),
		);
		expect(todoistStore.lastPriority).toBe(1);
	});

	it('falls back to raw text when metadata description is empty', async () => {
		mockAddTask.mockResolvedValue({
			id: 'td-60',
			content: 'Buy milk 📅 2026-03-01 🔺',
			url: 'https://todoist.com/task/60',
			checked: false,
		});

		const metadata = {
			description: '',
			status: 'open' as const,
			priority: 'highest' as const,
			dueDate: '2026-03-01',
			tags: [],
			recurrence: undefined,
		};

		await sendTaskToTodoist('/vault/todo.md', 'Buy milk 📅 2026-03-01 🔺', undefined, undefined, undefined, metadata);

		// Should use raw text since metadata.description is empty
		expect(mockAddTask).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'Buy milk 📅 2026-03-01 🔺' }),
		);
		expect(todoistStore.isSent('/vault/todo.md', 'Buy milk 📅 2026-03-01 🔺')).toBe(true);
	});

	it('uses metadata description when available', async () => {
		mockAddTask.mockResolvedValue({
			id: 'td-61',
			content: 'Buy milk',
			url: 'https://todoist.com/task/61',
			checked: false,
		});

		const metadata = {
			description: 'Buy milk',
			status: 'open' as const,
			priority: 'high' as const,
			dueDate: '2026-03-01',
			tags: [],
			recurrence: undefined,
		};

		await sendTaskToTodoist('/vault/todo.md', 'Buy milk 📅 2026-03-01 🔼', undefined, undefined, undefined, metadata);

		// Should use metadata.description (clean version without emojis)
		expect(mockAddTask).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'Buy milk' }),
		);
	});

	it('clears sending flag even on error', async () => {
		mockAddTask.mockRejectedValue(new Error('Server Error'));

		await expect(
			sendTaskToTodoist('/vault/todo.md', 'Fail task', 'p1'),
		).rejects.toThrow();

		expect(todoistStore.isSending).toBe(false);
	});
});

describe('initTodoist', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/test-vault');
		todoistStore.reset();
	});

	it('loads sent tasks from disk into store', async () => {
		const entries = [
			{ filePath: '/a.md', text: 'Task A', todoistTaskId: '1', todoistUrl: '', sentAt: 1000 },
		];
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(entries));

		await initTodoist();

		expect(todoistStore.sentTasks).toEqual(entries);
		expect(todoistStore.isSent('/a.md', 'Task A')).toBe(true);
	});
});
