import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

const { mockAddTask } = vi.hoisted(() => ({
	mockAddTask: vi.fn(),
}));

vi.mock('#lib/features/tasks/todoist-client.js', () => ({
	createTodoistClient: () => ({
		addTask: mockAddTask,
	}),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
	mkdir: vi.fn(),
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
}));

import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { todoistStore } from '#lib/features/tasks/todoist.store.svelte.js';
import { initTodoist, sendTaskToTodoist } from '#lib/features/tasks/todoist.service.js';

const SENT_PATH = '/test-vault/.kokobrain/todoist-sent.json';

// Repro for feature-writers-12: sent-task history that fails to parse loads as
// [], and the next send rewrites the file with only the new entry. Correct
// behavior asserted here: the unreadable history is not overwritten by the
// next send (the file is left alone, or copied aside first).
describe('todoist sent history after an unreadable load (h08 feature-writers-12)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		todoistStore.reset();
		settingsStore.reset();
		settingsStore.updateTodoist({ apiToken: 'test-token' });
		vaultStore._reset();
		vaultStore.open('/test-vault');
	});

	it('does not overwrite an unparseable sent-tasks file on the next send', async () => {
		const corrupt = '[{"filePath":"/a.md","text":"Old task","todoistTaskId":"1"';
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(mkdir).mockResolvedValue(undefined);
		vi.mocked(readTextFile).mockResolvedValue(corrupt);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		mockAddTask.mockResolvedValue({ id: 'td-2', url: 'https://todoist.com/task/2' });

		await initTodoist();
		await sendTaskToTodoist('/test-vault/b.md', 'New task');

		const calls = vi.mocked(writeTextFile).mock.calls;
		const sentWrites = calls.filter(([path]) => path === SENT_PATH);
		const originalKeptElsewhere = calls.some(([path, content]) => path !== SENT_PATH && content === corrupt);

		expect(sentWrites.length === 0 || originalKeptElsewhere).toBe(true);
	});
});
