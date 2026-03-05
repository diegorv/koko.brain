import { describe, it, expect, vi, beforeEach } from 'vitest';

// localStorage stub — vaultStore reads localStorage at module level
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
	value: {
		getItem: (key: string) => storage.get(key) ?? null,
		setItem: (key: string, value: string) => storage.set(key, value),
		removeItem: (key: string) => storage.delete(key),
		clear: () => storage.clear(),
	},
	writable: true,
});

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(),
	readDir: vi.fn(),
	mkdir: vi.fn(),
	writeTextFile: vi.fn(),
}));

// Mock side-effect services only
vi.mock('$lib/core/filesystem/fs.service', () => ({
	refreshTree: vi.fn(),
}));

vi.mock('$lib/core/note-creator/note-creator.service', () => ({
	openOrCreateNote: vi.fn(),
}));

import { exists, readDir, mkdir, writeTextFile } from '@tauri-apps/plugin-fs';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { refreshTree } from '$lib/core/filesystem/fs.service';
import { openOrCreateNote } from '$lib/core/note-creator/note-creator.service';
import { templatesStore } from '$lib/plugins/templates/templates.store.svelte';
import {
	loadTemplates,
	createFileFromTemplate,
	ensureTemplatesFolder,
	openTemplatePicker,
	resetTemplates,
} from '$lib/plugins/templates/templates.service';

describe('loadTemplates', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		storage.clear();
		templatesStore.reset();
		settingsStore.reset();
		vaultStore.open('/vault');
	});

	it('does nothing if no vault is open', async () => {
		vaultStore.close();

		await loadTemplates();

		expect(exists).not.toHaveBeenCalled();
		expect(templatesStore.templates).toEqual([]);
	});

	it('sets empty list if templates folder does not exist', async () => {
		vi.mocked(exists).mockResolvedValue(false);

		await loadTemplates();

		expect(templatesStore.templates).toEqual([]);
	});

	it('loads .md files from templates folder into store', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readDir).mockResolvedValue([
			{ name: 'Meeting.md', isDirectory: false, isFile: true, isSymlink: false },
			{ name: 'Daily.md', isDirectory: false, isFile: true, isSymlink: false },
			{ name: 'subfolder', isDirectory: true, isFile: false, isSymlink: false },
			{ name: 'notes.txt', isDirectory: false, isFile: true, isSymlink: false },
		] as any);

		await loadTemplates();

		expect(templatesStore.templates).toEqual([
			{ name: 'Daily', path: '/vault/_system/templates/Daily.md' },
			{ name: 'Meeting', path: '/vault/_system/templates/Meeting.md' },
		]);
	});

	it('handles errors gracefully', async () => {
		vi.mocked(exists).mockRejectedValue(new Error('fs error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await loadTemplates();

		expect(templatesStore.templates).toEqual([]);
		consoleSpy.mockRestore();
	});
});

describe('createFileFromTemplate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		storage.clear();
		templatesStore.reset();
		vaultStore.open('/vault');
	});

	it('does nothing if no vault is open', async () => {
		vaultStore.close();

		await createFileFromTemplate('/vault/_templates/Meeting.md', 'New Meeting');

		expect(openOrCreateNote).not.toHaveBeenCalled();
		expect(vaultStore.isOpen).toBe(false);
	});

	it('calls openOrCreateNote with correct options', async () => {
		await createFileFromTemplate('/vault/_templates/Meeting.md', 'My Meeting');

		expect(openOrCreateNote).toHaveBeenCalledWith({
			filePath: '/vault/My Meeting.md',
			templatePath: '/vault/_templates/Meeting.md',
			title: 'My Meeting',
		});
		expect(vaultStore.path).toBe('/vault');
	});

	it('appends .md if not provided', async () => {
		await createFileFromTemplate('/vault/_templates/Note.md', 'Test');

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				filePath: '/vault/Test.md',
			}),
		);
		expect(vaultStore.path).toBe('/vault');
	});

	it('does not double-append .md', async () => {
		await createFileFromTemplate('/vault/_templates/Note.md', 'Test.md');

		expect(openOrCreateNote).toHaveBeenCalledWith(
			expect.objectContaining({
				filePath: '/vault/Test.md',
				title: 'Test',
			}),
		);
		expect(vaultStore.path).toBe('/vault');
	});
});

describe('ensureTemplatesFolder', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		storage.clear();
		settingsStore.reset();
		vaultStore.open('/vault');
	});

	it('does nothing if no vault is open', async () => {
		vaultStore.close();

		await ensureTemplatesFolder();

		expect(exists).not.toHaveBeenCalled();
		expect(vaultStore.isOpen).toBe(false);
	});

	it('skips mkdir and writeTextFile if folder and all files exist', async () => {
		vi.mocked(exists).mockResolvedValue(true);

		await ensureTemplatesFolder();

		expect(mkdir).not.toHaveBeenCalled();
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(refreshTree).not.toHaveBeenCalled();
		expect(vaultStore.path).toBe('/vault');
	});

	it('creates folder and empty template files when everything is missing', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(mkdir).mockResolvedValue(undefined);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await ensureTemplatesFolder();

		expect(mkdir).toHaveBeenCalledWith('/vault/_system/templates', { recursive: true });
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/Daily Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/Weekly Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/Monthly Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/Quarterly Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/Quick Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/One on One.md', '');
		expect(refreshTree).toHaveBeenCalled();
	});

	it('uses template paths from settingsStore, not hardcoded defaults', async () => {
		settingsStore.updatePeriodicNotes({
			daily: { templatePath: '_system/templates/Daily Note.md' },
			weekly: { templatePath: '_system/templates/Weekly Note.md' },
			monthly: { templatePath: '_system/templates/Monthly Note.md' },
			quarterly: { templatePath: '_system/templates/Quarterly Note.md' },
		});
		settingsStore.updateQuickNote({ templatePath: '_system/templates/Quick Note.md' });
		settingsStore.updateOneOnOne({ templatePath: '_system/templates/One on One.md' });

		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(mkdir).mockResolvedValue(undefined);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await ensureTemplatesFolder();

		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/Daily Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/Weekly Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/Monthly Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/Quarterly Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/Quick Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/One on One.md', '');
		// Should NOT use default _templates/ paths
		expect(writeTextFile).not.toHaveBeenCalledWith('/vault/_templates/Daily Note.md', '');
	});

	it('handles errors gracefully', async () => {
		vi.mocked(exists).mockRejectedValue(new Error('fs error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await ensureTemplatesFolder();

		expect(consoleSpy).toHaveBeenCalled();
		expect(vaultStore.path).toBe('/vault');
		consoleSpy.mockRestore();
	});
});

describe('openTemplatePicker', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		storage.clear();
		templatesStore.reset();
		vaultStore.open('/vault');
	});

	it('loads templates and opens the picker', async () => {
		vi.mocked(exists).mockResolvedValue(false);

		await openTemplatePicker();

		expect(templatesStore.templates).toEqual([]);
		expect(templatesStore.isOpen).toBe(true);
	});
});

describe('resetTemplates', () => {
	it('clears all template state', () => {
		templatesStore.setTemplates([{ name: 'Test', path: '/vault/_templates/Test.md' }]);
		expect(templatesStore.templates).toHaveLength(1);

		resetTemplates();

		expect(templatesStore.templates).toEqual([]);
		expect(templatesStore.isOpen).toBe(false);
	});
});
