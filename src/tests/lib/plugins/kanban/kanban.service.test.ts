import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn((_tag: string, ...args: unknown[]) => {
		console.error(...args);
	}),
}));

vi.mock('$lib/core/filesystem/fs-rust.service', () => ({
	writeText: vi.fn(),
	readText: vi.fn(),
}));

vi.mock('$lib/core/filesystem/fs.service', () => ({
	createFile: vi.fn(),
}));

import { readText, writeText } from '$lib/core/filesystem/fs-rust.service';
import { createFile } from '$lib/core/filesystem/fs.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { createEmptyKanbanBoard, serializeKanbanBoard } from '$lib/plugins/kanban/kanban.logic';
import { createKanbanFile, resetKanban, loadLinkedFileContent } from '$lib/plugins/kanban/kanban.service';
import { kanbanStore } from '$lib/plugins/kanban/kanban.store.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';

describe('createKanbanFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore.open('/vault');
	});

	it('creates file and writes empty board markdown', async () => {
		vi.mocked(createFile).mockResolvedValue('/vault/Untitled.kanban');
		const expectedMd = serializeKanbanBoard(createEmptyKanbanBoard());

		const result = await createKanbanFile('/vault');

		expect(createFile).toHaveBeenCalledWith('/vault', 'Untitled.kanban');
		expect(writeText).toHaveBeenCalledWith('/vault', '/vault/Untitled.kanban', expectedMd);
		expect(result).toBe('/vault/Untitled.kanban');
		expect(expectedMd).toContain('## To Do');
		expect(expectedMd).toContain('## In Progress');
		expect(expectedMd).toContain('## Done');
	});

	it('returns null when createFile returns null', async () => {
		vi.mocked(createFile).mockResolvedValue(null);

		const result = await createKanbanFile('/vault');

		expect(result).toBeNull();
		expect(writeText).not.toHaveBeenCalled();
	});

	it('returns null when no vault is open', async () => {
		vaultStore.close();

		const result = await createKanbanFile('/vault');

		expect(result).toBeNull();
		expect(createFile).not.toHaveBeenCalled();
		expect(writeText).not.toHaveBeenCalled();
	});

	it('returns null and logs error on failure', async () => {
		vi.mocked(createFile).mockRejectedValue(new Error('disk full'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await createKanbanFile('/vault');

		expect(result).toBeNull();
		expect(consoleSpy).toHaveBeenCalledWith('Failed to create kanban file:', expect.any(Error));
		consoleSpy.mockRestore();
	});
});

describe('resetKanban', () => {
	it('resets the kanban store', () => {
		kanbanStore.setBoard({ lanes: [], archive: [], settings: {} });
		kanbanStore.setEditingItemId('some-id');

		resetKanban();

		expect(kanbanStore.board).toBeNull();
		expect(kanbanStore.editingItemId).toBeNull();
	});
});

describe('loadLinkedFileContent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		resetKanban();
		vaultStore.open('/vault');
		fsStore.setFileTree([
			{
				name: 'notes',
				path: '/vault/notes',
				isDirectory: true,
				children: [
					{
						name: 'My Note.md',
						path: '/vault/notes/My Note.md',
						isDirectory: false,
					},
				],
			},
		]);
	});

	it('returns empty string for card without wikilinks', async () => {
		const result = await loadLinkedFileContent('No links here');
		expect(result).toBe('');
		expect(readText).not.toHaveBeenCalled();
	});

	it('loads markdown content without frontmatter from linked file', async () => {
		vi.mocked(readText).mockResolvedValue('---\ntitle: Test Title\n---\nHello world\n\nSome content');

		const result = await loadLinkedFileContent('Review [[My Note]]');

		expect(readText).toHaveBeenCalledWith('/vault', '/vault/notes/My Note.md');
		expect(result).toBe('Hello world\n\nSome content');
	});

	it('returns full content when no frontmatter exists', async () => {
		vi.mocked(readText).mockResolvedValue('Just plain content');

		const result = await loadLinkedFileContent('Review [[My Note]]');

		expect(result).toBe('Just plain content');
	});

	it('returns empty string when wikilink cannot be resolved', async () => {
		const result = await loadLinkedFileContent('See [[Nonexistent]]');
		expect(result).toBe('');
		expect(readText).not.toHaveBeenCalled();
	});

	it('returns empty string when no vault is open', async () => {
		vaultStore.close();

		const result = await loadLinkedFileContent('Review [[My Note]]');

		expect(result).toBe('');
		expect(readText).not.toHaveBeenCalled();
	});

	it('caches results for same card text', async () => {
		vi.mocked(readText).mockResolvedValue('Some content');

		await loadLinkedFileContent('Review [[My Note]]');
		await loadLinkedFileContent('Review [[My Note]]');

		expect(readText).toHaveBeenCalledTimes(1);
	});
});
