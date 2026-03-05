import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn((_tag: string, ...args: unknown[]) => {
		console.error(...args);
	}),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	readTextFile: vi.fn(),
}));

vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

vi.mock('$lib/core/editor/editor.hooks', () => ({
	markRecentSave: vi.fn(),
}));

vi.mock('$lib/core/filesystem/fs.service', () => ({
	refreshTree: vi.fn(),
}));

import { exists, writeTextFile, mkdir, readTextFile } from '@tauri-apps/plugin-fs';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { markRecentSave } from '$lib/core/editor/editor.hooks';
import { refreshTree } from '$lib/core/filesystem/fs.service';
import { openOrCreateNote } from '$lib/core/note-creator/note-creator.service';

describe('openOrCreateNote', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('opens the file directly when it already exists', async () => {
		vi.mocked(exists).mockResolvedValue(true);

		await openOrCreateNote({ filePath: '/vault/note.md', title: 'note' });

		expect(exists).toHaveBeenCalledWith('/vault/note.md');
		expect(mkdir).not.toHaveBeenCalled();
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/note.md');
	});

	it('creates parent directory and writes file when it does not exist', async () => {
		vi.mocked(exists).mockResolvedValue(false);

		await openOrCreateNote({ filePath: '/vault/sub/note.md', title: 'note' });

		expect(mkdir).toHaveBeenCalledWith('/vault/sub', { recursive: true });
		expect(writeTextFile).toHaveBeenCalledWith('/vault/sub/note.md', '');
		expect(markRecentSave).toHaveBeenCalledWith('/vault/sub/note.md');
		expect(refreshTree).toHaveBeenCalled();
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/sub/note.md');
	});

	it('does not mark recent save when file already exists', async () => {
		vi.mocked(exists).mockResolvedValue(true);

		await openOrCreateNote({ filePath: '/vault/note.md', title: 'note' });

		expect(markRecentSave).not.toHaveBeenCalled();
	});

	it('reads and processes template from templatePath', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(readTextFile).mockResolvedValue('# <% tp.file.title %>');

		await openOrCreateNote({
			filePath: '/vault/note.md',
			templatePath: '/vault/_templates/daily.md',
			title: 'My Note',
		});

		expect(readTextFile).toHaveBeenCalledWith('/vault/_templates/daily.md');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/note.md', '# My Note');
	});

	it('falls back to inlineTemplate when templatePath read fails', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(readTextFile).mockRejectedValue(new Error('not found'));

		await openOrCreateNote({
			filePath: '/vault/note.md',
			templatePath: '/vault/_templates/missing.md',
			inlineTemplate: '# <% tp.file.title %>',
			title: 'Fallback',
		});

		expect(writeTextFile).toHaveBeenCalledWith('/vault/note.md', '# Fallback');
	});

	it('falls back to empty content when templatePath read fails and no inlineTemplate', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(readTextFile).mockRejectedValue(new Error('not found'));

		await openOrCreateNote({
			filePath: '/vault/note.md',
			templatePath: '/vault/_templates/missing.md',
			title: 'note',
		});

		expect(writeTextFile).toHaveBeenCalledWith('/vault/note.md', '');
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/note.md');
	});

	it('uses empty content when no template is provided', async () => {
		vi.mocked(exists).mockResolvedValue(false);

		await openOrCreateNote({ filePath: '/vault/note.md', title: 'note' });

		expect(writeTextFile).toHaveBeenCalledWith('/vault/note.md', '');
	});

	it('passes customVariables to processTemplate', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		const customVars = { yesterdayPath: '/vault/yesterday.md' };

		await openOrCreateNote({
			filePath: '/vault/note.md',
			title: 'note',
			inlineTemplate: '<% yesterdayPath %>',
			customVariables: customVars,
		});

		expect(writeTextFile).toHaveBeenCalledWith('/vault/note.md', '/vault/yesterday.md');
	});

	it('throws and logs error when exists() fails', async () => {
		vi.mocked(exists).mockRejectedValue(new Error('permission denied'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(
			openOrCreateNote({ filePath: '/vault/note.md', title: 'note' }),
		).rejects.toThrow('permission denied');

		expect(consoleSpy).toHaveBeenCalledWith('Failed to open or create note:', expect.any(Error));
		expect(openFileInEditor).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('throws and logs error when mkdir fails', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(mkdir).mockRejectedValue(new Error('mkdir failed'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(
			openOrCreateNote({ filePath: '/vault/sub/note.md', title: 'note' }),
		).rejects.toThrow('mkdir failed');

		expect(consoleSpy).toHaveBeenCalledWith('Failed to open or create note:', expect.any(Error));
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(openFileInEditor).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('throws and logs error when writeTextFile fails', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(writeTextFile).mockRejectedValue(new Error('write failed'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(
			openOrCreateNote({ filePath: '/vault/note.md', title: 'note' }),
		).rejects.toThrow('write failed');

		expect(consoleSpy).toHaveBeenCalledWith('Failed to open or create note:', expect.any(Error));
		expect(refreshTree).not.toHaveBeenCalled();
		expect(openFileInEditor).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('still opens the file when refreshTree fails', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(refreshTree).mockRejectedValue(new Error('refresh failed'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await openOrCreateNote({ filePath: '/vault/note.md', title: 'note' });

		expect(writeTextFile).toHaveBeenCalled();
		expect(consoleSpy).toHaveBeenCalledWith('refreshTree failed after file creation:', expect.any(Error));
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/note.md');
		consoleSpy.mockRestore();
	});

	it('throws and logs error when openFileInEditor fails', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(openFileInEditor).mockRejectedValue(new Error('editor failed'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(
			openOrCreateNote({ filePath: '/vault/note.md', title: 'note' }),
		).rejects.toThrow('editor failed');

		expect(consoleSpy).toHaveBeenCalledWith('Failed to open or create note:', expect.any(Error));
		consoleSpy.mockRestore();
	});
});
