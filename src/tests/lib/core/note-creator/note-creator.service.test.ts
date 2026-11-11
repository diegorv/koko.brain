import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('#lib/utils/debug.js', () => ({
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

vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
}));

vi.mock('#lib/core/editor/editor.hooks.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/core/editor/editor.hooks.js')>()),
	markRecentSave: vi.fn(),
}));

vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	addToTree: vi.fn(),
}));

import dayjs from 'dayjs';
import { exists, readTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { addNoteCreatedObserver, markRecentSave, resetHooks } from '#lib/core/editor/editor.hooks.js';
import { addToTree } from '#lib/core/filesystem/fs.service.js';
import { registerCollectionNoteChangeConsumer } from '#lib/features/collection/collection.service.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { registerNoteChangeConsumer } from '#lib/core/filesystem/note-change.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { clearAllIndexed, isAlreadyIndexed } from '#lib/utils/index-dedupe.js';
import { loadNoteTemplate, openOrCreateNote } from '#lib/core/note-creator/note-creator.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { createNoteComposer } from '#lib/plugins/quick-capture/note-composer.service.js';

describe('openOrCreateNote', () => {
	let unregister: (() => void)[] = [];

	beforeEach(() => {
		vi.resetAllMocks();
		clearAllIndexed();
		clearLocalStorage();
		vaultStore._reset();
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
		expect(addToTree).toHaveBeenCalledWith('/vault/sub/note.md');
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/sub/note.md');
	});

	it('upserts a created note into FTS5 and semantic with its vault-relative key', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(invoke).mockResolvedValue(undefined);
		vaultStore.open('/vault');

		await openOrCreateNote({ filePath: '/vault/Daily/2026-11-10.md', title: '2026-11-10', inlineTemplate: '# Today' });

		expect(invoke).toHaveBeenCalledWith('update_search_index_file', {
			filePath: 'Daily/2026-11-10.md',
			content: '# Today',
			vaultPath: '/vault',
		});
		expect(invoke).toHaveBeenCalledWith('update_semantic_file', {
			filePath: 'Daily/2026-11-10.md',
			content: '# Today',
			vaultPath: '/vault',
		});
	});

	it('skips the FTS5 and semantic upsert for a path outside the vault', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(invoke).mockResolvedValue(undefined);
		vaultStore.open('/vault');

		await openOrCreateNote({ filePath: '/elsewhere/note.md', title: 'note' });

		expect(invoke).toHaveBeenCalledWith('create_note', { path: '/elsewhere/note.md', content: '' });
		expect(invoke).not.toHaveBeenCalledWith('update_search_index_file', expect.anything());
		expect(invoke).not.toHaveBeenCalledWith('update_semantic_file', expect.anything());
	});

	it('skips the FTS5 and semantic upsert for a non-Markdown file', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(invoke).mockResolvedValue(undefined);
		vaultStore.open('/vault');

		await openOrCreateNote({ filePath: '/vault/board.canvas', title: 'board' });

		expect(invoke).toHaveBeenCalledWith('create_note', { path: '/vault/board.canvas', content: '' });
		expect(invoke).not.toHaveBeenCalledWith('update_search_index_file', expect.anything());
		expect(invoke).not.toHaveBeenCalledWith('update_semantic_file', expect.anything());
	});

	it('skips the FTS5 and semantic upsert when no vault is open', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(invoke).mockResolvedValue(undefined);

		await openOrCreateNote({ filePath: '/vault/note.md', title: 'note' });

		expect(invoke).toHaveBeenCalledWith('create_note', { path: '/vault/note.md', content: '' });
		expect(invoke).not.toHaveBeenCalledWith('update_search_index_file', expect.anything());
		expect(invoke).not.toHaveBeenCalledWith('update_semantic_file', expect.anything());
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

	it('writes the rendered template through buildContent', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(invoke).mockResolvedValue(undefined);

		await openOrCreateNote({
			filePath: '/vault/note.md',
			title: 'note',
			inlineTemplate: '# <% tp.file.title %>',
			buildContent: (content) => `${content}\nadded`,
		});

		expect(invoke).toHaveBeenCalledWith('create_note', { path: '/vault/note.md', content: '# note\nadded' });
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/note.md');
	});

	it('does not run buildContent when the note already exists', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		const buildContent = vi.fn((c: string) => c);

		await openOrCreateNote({ filePath: '/vault/note.md', title: 'note', buildContent });

		expect(buildContent).not.toHaveBeenCalled();
		expect(invoke).not.toHaveBeenCalled();
	});

	it('creates no file when buildContent throws', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(invoke).mockResolvedValue(undefined);
		const failure = new Error('bad frontmatter');

		await expect(
			openOrCreateNote({ filePath: '/vault/note.md', title: 'note', buildContent: () => { throw failure; } }),
		).rejects.toBe(failure);

		expect(invoke).not.toHaveBeenCalledWith('create_note', expect.anything());
		expect(openFileInEditor).not.toHaveBeenCalled();
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
		expect(addToTree).not.toHaveBeenCalled();
		expect(openFileInEditor).not.toHaveBeenCalled();
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

describe('openOrCreateNote reports a created note', () => {
	let created: { path: string; tabOpened: boolean }[];
	let tabOpened: boolean;

	beforeEach(() => {
		vi.resetAllMocks();
		resetHooks();
		clearAllIndexed();
		vaultStore._reset();
		created = [];
		tabOpened = false;
		addNoteCreatedObserver((path) => created.push({ path, tabOpened }));
		vi.mocked(openFileInEditor).mockImplementation(async () => {
			await Promise.resolve();
			tabOpened = true;
		});
	});

	afterEach(() => {
		resetHooks();
	});

	it('notifies once, after the tab opened, when it created the note', async () => {
		vi.mocked(exists).mockResolvedValue(false);

		await openOrCreateNote({ filePath: '/vault/New.md', title: 'New' });

		expect(created).toEqual([{ path: '/vault/New.md', tabOpened: true }]);
	});

	it('does not notify when the note already existed', async () => {
		vi.mocked(exists).mockResolvedValue(true);

		await openOrCreateNote({ filePath: '/vault/Old.md', title: 'Old' });

		expect(openFileInEditor).toHaveBeenCalledWith('/vault/Old.md');
		expect(created).toEqual([]);
	});

	it('does not notify when create_note fails', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(invoke).mockImplementation(async (cmd) => {
			if (cmd === 'create_note') throw new Error('write failed');
		});
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(openOrCreateNote({ filePath: '/vault/New.md', title: 'New' })).rejects.toThrow('write failed');

		expect(created).toEqual([]);
		consoleSpy.mockRestore();
	});

	it('does not notify when opening the tab rejects', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(openFileInEditor).mockRejectedValue(new Error('editor failed'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(openOrCreateNote({ filePath: '/vault/New.md', title: 'New' })).rejects.toThrow('editor failed');

		expect(created).toEqual([]);
		consoleSpy.mockRestore();
	});
});

describe('loadNoteTemplate', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('reads the template file and processes it', async () => {
		vi.mocked(readTextFile).mockResolvedValue('# <% tp.file.title %>');

		const content = await loadNoteTemplate({
			templatePath: '/vault/_templates/event.md',
			inlineTemplate: 'inline',
			title: 'Standup',
		});

		expect(readTextFile).toHaveBeenCalledWith('/vault/_templates/event.md');
		expect(content).toBe('# Standup');
	});

	it('falls back to the inline template when the read fails', async () => {
		vi.mocked(readTextFile).mockRejectedValue(new Error('not found'));

		const content = await loadNoteTemplate({
			templatePath: '/vault/_templates/missing.md',
			inlineTemplate: '---\n_type: Event\n---\n# <% tp.file.title %>',
			title: 'Standup',
		});

		expect(content).toBe('---\n_type: Event\n---\n# Standup');
	});

	it('returns empty content when the read fails and there is no inline template', async () => {
		vi.mocked(readTextFile).mockRejectedValue(new Error('not found'));

		const content = await loadNoteTemplate({ templatePath: '/vault/_templates/missing.md', title: 'note' });

		expect(content).toBe('');
	});

	it('uses the inline template alone when no templatePath is given', async () => {
		const content = await loadNoteTemplate({ inlineTemplate: 'title: <% tp.file.title %>', title: 'Standup' });

		expect(readTextFile).not.toHaveBeenCalled();
		expect(content).toBe('title: Standup');
	});

	it('returns empty content when neither template source is given', async () => {
		const content = await loadNoteTemplate({ title: 'note' });

		expect(readTextFile).not.toHaveBeenCalled();
		expect(content).toBe('');
	});

	it('applies processTemplate with customVariables', async () => {
		const content = await loadNoteTemplate({
			inlineTemplate: '<% yesterdayPath %>',
			title: 'note',
			customVariables: { yesterdayPath: '/vault/yesterday.md' },
		});

		expect(content).toBe('/vault/yesterday.md');
	});

	it('resolves tp.date.now() to contextDate', async () => {
		const content = await loadNoteTemplate({
			inlineTemplate: 'date: <% tp.date.now("YYYY-MM-DD") %>',
			title: 'Standup',
			contextDate: dayjs('2026-11-12'),
		});

		expect(content).toBe('date: 2026-11-12');
	});
});

// The Cmd+N composer (an openOrCreateNote path) with the real openOrCreateNote,
// so the wrapped content reaches the mocked `create_note` IPC.
describe('Explicit organization on an openOrCreateNote path', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearAllIndexed();
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		vaultStore.open('/vault');
		settingsStore.updateQuickCapture({ templates: { note: '' } });
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: true });
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(invoke).mockResolvedValue(undefined);
	});

	afterEach(() => {
		settingsStore.reset();
		vaultStore._reset();
	});

	it('writes _organized: false through create_note', async () => {
		await createNoteComposer();

		const createCall = vi.mocked(invoke).mock.calls.find(([cmd]) => cmd === 'create_note');
		expect((createCall![1] as { content: string }).content).toBe('---\n_organized: false\n---\n');
		expect(openFileInEditor).toHaveBeenCalledTimes(1);
	});

	it('propagates a create_note rejection and opens no note', async () => {
		vi.mocked(invoke).mockImplementation(async (cmd) => {
			if (cmd === 'create_note') throw new Error('write failed');
		});
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(createNoteComposer()).rejects.toThrow('write failed');

		expect(addToTree).not.toHaveBeenCalled();
		expect(openFileInEditor).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});
