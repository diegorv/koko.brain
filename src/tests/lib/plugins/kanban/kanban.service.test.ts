import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn((_tag: string, ...args: unknown[]) => {
		console.error(...args);
	}),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	writeTextFile: vi.fn(),
	readTextFile: vi.fn(),
}));

vi.mock('$lib/core/filesystem/fs.service', () => ({
	createFile: vi.fn(),
}));

import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { createFile } from '$lib/core/filesystem/fs.service';
import { createEmptyKanbanBoard, serializeKanbanBoard } from '$lib/plugins/kanban/kanban.logic';
import { createKanbanFile, resetKanban, loadLinkedFileContent, clearLinkedContentCache } from '$lib/plugins/kanban/kanban.service';
import { kanbanStore } from '$lib/plugins/kanban/kanban.store.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';

describe('createKanbanFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('creates file and writes empty board markdown', async () => {
		vi.mocked(createFile).mockResolvedValue('/vault/Untitled.kanban');
		const expectedMd = serializeKanbanBoard(createEmptyKanbanBoard());

		const result = await createKanbanFile('/vault');

		expect(createFile).toHaveBeenCalledWith('/vault', 'Untitled.kanban');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/Untitled.kanban', expectedMd);
		expect(result).toBe('/vault/Untitled.kanban');
		// Verify the written content has the default lanes
		expect(expectedMd).toContain('## To Do');
		expect(expectedMd).toContain('## In Progress');
		expect(expectedMd).toContain('## Done');
	});

	it('returns null when createFile returns null', async () => {
		vi.mocked(createFile).mockResolvedValue(null);

		const result = await createKanbanFile('/vault');

		expect(result).toBeNull();
		expect(writeTextFile).not.toHaveBeenCalled();
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
		resetKanban(); // clears content cache
		// Populate fsStore.fileTree so resolveWikilinkCached can resolve "My Note".
		// flattenFileTree walks directory nodes and surfaces leaf files, so we
		// shape one root dir wrapping the leaf — same shape `scan_vault` returns.
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
		expect(readTextFile).not.toHaveBeenCalled();
	});

	it('loads markdown content without frontmatter from linked file', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntitle: Test Title\n---\nHello world\n\nSome content');

		const result = await loadLinkedFileContent('Review [[My Note]]');

		expect(readTextFile).toHaveBeenCalledWith('/vault/notes/My Note.md');
		expect(result).toBe('Hello world\n\nSome content');
	});

	it('returns full content when no frontmatter exists', async () => {
		vi.mocked(readTextFile).mockResolvedValue('Just plain content');

		const result = await loadLinkedFileContent('Review [[My Note]]');

		expect(result).toBe('Just plain content');
	});

	it('returns empty string when wikilink cannot be resolved', async () => {
		const result = await loadLinkedFileContent('See [[Nonexistent]]');
		expect(result).toBe('');
		expect(readTextFile).not.toHaveBeenCalled();
	});

	it('caches results for same card text', async () => {
		vi.mocked(readTextFile).mockResolvedValue('Some content');

		await loadLinkedFileContent('Review [[My Note]]');
		await loadLinkedFileContent('Review [[My Note]]');

		// readTextFile should only be called once due to caching
		expect(readTextFile).toHaveBeenCalledTimes(1);
	});

	it('re-reads file after cache is cleared (e.g. linked file was edited)', async () => {
		vi.mocked(readTextFile)
			.mockResolvedValueOnce('Old content')
			.mockResolvedValueOnce('Updated content');

		const first = await loadLinkedFileContent('Review [[My Note]]');
		expect(first).toBe('Old content');

		clearLinkedContentCache();

		const second = await loadLinkedFileContent('Review [[My Note]]');
		expect(second).toBe('Updated content');
		expect(readTextFile).toHaveBeenCalledTimes(2);
	});
});
