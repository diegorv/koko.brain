import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
	readTextFile: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
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

import dayjs from 'dayjs';
import { exists, readTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { markRecentSave } from '$lib/core/editor/editor.hooks';
import { refreshTree } from '$lib/core/filesystem/fs.service';
import { registerCollectionNoteChangeConsumer } from '$lib/features/collection/collection.service';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { registerNoteChangeConsumer } from '$lib/core/filesystem/note-change.service';
import { clearAllIndexed, isAlreadyIndexed } from '$lib/utils/index-dedupe';
import { openOrCreateNote } from '$lib/core/note-creator/note-creator.service';

describe('openOrCreateNote', () => {
	let unregister: (() => void)[] = [];

	beforeEach(() => {
		vi.resetAllMocks();
		clearAllIndexed();
		collectionStore.reset();
		unregister = [registerCollectionNoteChangeConsumer()];
	});

	afterEach(() => {
		for (const u of unregister) u();
		unregister = [];
		collectionStore.reset();
	});

	it('opens the file directly when it already exists', async () => {
		vi.mocked(exists).mockResolvedValue(true);

		await openOrCreateNote({ filePath: '/vault/note.md', title: 'note' });

		expect(exists).toHaveBeenCalledWith('/vault/note.md');
		expect(invoke).not.toHaveBeenCalled();
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/note.md');
	});

	it('creates parent directory and writes file when it does not exist', async () => {
		vi.mocked(exists).mockResolvedValue(false);

		await openOrCreateNote({ filePath: '/vault/sub/note.md', title: 'note' });

		expect(invoke).toHaveBeenCalledWith('create_folder', { path: '/vault/sub' });
		expect(invoke).toHaveBeenCalledWith('create_note', { path: '/vault/sub/note.md', content: '' });
		expect(markRecentSave).toHaveBeenCalledWith('/vault/sub/note.md');
		expect(collectionStore.propertyIndex.has('/vault/sub/note.md')).toBe(true);
		// The 'create' policy row leaves the Rust index to `create_note` and
		// deliberately does NOT mark the dedupe signature.
		expect(invoke).not.toHaveBeenCalledWith('update_note_in_index', expect.anything());
		expect(isAlreadyIndexed('/vault/sub/note.md', '')).toBe(false);
		expect(refreshTree).toHaveBeenCalled();
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/sub/note.md');
	});

	it('still opens the file when a note-change consumer throws', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		unregister.push(registerNoteChangeConsumer({
			name: 'exploding',
			upsert: () => { throw new Error('index update failed'); },
			remove: () => {},
		}));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await openOrCreateNote({ filePath: '/vault/note.md', title: 'note' });

		expect(consoleSpy).toHaveBeenCalledWith(
			'exploding upsert failed:',
			expect.any(Error),
		);
		// The surviving consumer still indexed the new note.
		expect(collectionStore.propertyIndex.has('/vault/note.md')).toBe(true);
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/note.md');
		consoleSpy.mockRestore();
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
		expect(invoke).toHaveBeenCalledWith('create_note', { path: '/vault/note.md', content: '# My Note' });
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

		expect(invoke).toHaveBeenCalledWith('create_note', { path: '/vault/note.md', content: '# Fallback' });
	});

	it('falls back to empty content when templatePath read fails and no inlineTemplate', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(readTextFile).mockRejectedValue(new Error('not found'));

		await openOrCreateNote({
			filePath: '/vault/note.md',
			templatePath: '/vault/_templates/missing.md',
			title: 'note',
		});

		expect(invoke).toHaveBeenCalledWith('create_note', { path: '/vault/note.md', content: '' });
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/note.md');
	});

	it('uses empty content when no template is provided', async () => {
		vi.mocked(exists).mockResolvedValue(false);

		await openOrCreateNote({ filePath: '/vault/note.md', title: 'note' });

		expect(invoke).toHaveBeenCalledWith('create_note', { path: '/vault/note.md', content: '' });
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

		expect(invoke).toHaveBeenCalledWith('create_note', { path: '/vault/note.md', content: '/vault/yesterday.md' });
	});

	it('resolves tp.date.now() to contextDate when no explicit reference is given', async () => {
		vi.mocked(exists).mockResolvedValue(false);

		await openOrCreateNote({
			filePath: '/vault/note.md',
			title: '25-12-2026',
			inlineTemplate: 'created: <% tp.date.now("YYYY-MM-DD") %>',
			contextDate: dayjs('2026-12-25'),
		});

		expect(invoke).toHaveBeenCalledWith('create_note', {
			path: '/vault/note.md',
			content: 'created: 2026-12-25',
		});
	});

	it('falls back to the current date for tp.date.now() when no contextDate is given', async () => {
		vi.mocked(exists).mockResolvedValue(false);

		await openOrCreateNote({
			filePath: '/vault/note.md',
			title: 'note',
			inlineTemplate: 'created: <% tp.date.now("YYYY-MM-DD") %>',
		});

		expect(invoke).toHaveBeenCalledWith('create_note', {
			path: '/vault/note.md',
			content: `created: ${dayjs().format('YYYY-MM-DD')}`,
		});
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

	it('throws and logs error when create_folder fails', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(invoke).mockImplementation(async (cmd) => {
			if (cmd === 'create_folder') throw new Error('mkdir failed');
		});
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(
			openOrCreateNote({ filePath: '/vault/sub/note.md', title: 'note' }),
		).rejects.toThrow('mkdir failed');

		expect(consoleSpy).toHaveBeenCalledWith('Failed to open or create note:', expect.any(Error));
		expect(openFileInEditor).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('throws and logs error when create_note fails', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(invoke).mockImplementation(async (cmd) => {
			if (cmd === 'create_note') throw new Error('write failed');
		});
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

		expect(invoke).toHaveBeenCalledWith('create_note', expect.any(Object));
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
