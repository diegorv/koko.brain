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

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('#lib/core/note-creator/note-creator.service.js', () => ({
	openOrCreateNote: vi.fn(),
}));

import { exists, readDir, mkdir, writeTextFile } from '@tauri-apps/plugin-fs';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { openOrCreateNote } from '#lib/core/note-creator/note-creator.service.js';
import { templatesStore } from '#lib/plugins/templates/templates.store.svelte.js';
import {
	loadTemplates,
	createFileFromTemplate,
	ensureTemplatesFolder,
	openTemplatePicker,
	resetTemplates,
} from '#lib/plugins/templates/templates.service.js';

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
		settingsStore.reset();
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });
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

	it('marks the rendered template unorganized while Explicit organization is on', async () => {
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: true });

		await createFileFromTemplate('/vault/_templates/Meeting.md', 'My Meeting');

		const { buildContent } = vi.mocked(openOrCreateNote).mock.calls[0][0];
		const written = buildContent!('---\nattendees: []\n---\n# My Meeting\n');
		expect(written).toBe('---\n_organized: false\nattendees: []\n---\n# My Meeting\n');
		expect(written.match(/^_organized:/gm)).toHaveLength(1);
	});

	it('keeps a template that already sets _organized: true while the switch is on', async () => {
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: true });

		await createFileFromTemplate('/vault/_templates/Meeting.md', 'My Meeting');

		const { buildContent } = vi.mocked(openOrCreateNote).mock.calls[0][0];
		const rendered = '---\n_organized: true\n---\n# My Meeting\n';
		expect(buildContent!(rendered)).toBe(rendered);
	});

	it('writes the rendered template as is while Explicit organization is off', async () => {
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });

		await createFileFromTemplate('/vault/_templates/Meeting.md', 'My Meeting');

		const { buildContent } = vi.mocked(openOrCreateNote).mock.calls[0][0];
		const rendered = '---\nattendees: []\n---\n# My Meeting\n';
		expect(buildContent?.(rendered) ?? rendered).toBe(rendered);
	});
});

describe('ensureTemplatesFolder', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		storage.clear();
		settingsStore.reset();
		fsStore.reset();
		vaultStore.open('/vault');
	});

	/** Every path in the file tree, depth first. */
	function treePaths(): string[] {
		const out: string[] = [];
		const walk = (nodes: typeof fsStore.fileTree) => {
			for (const n of nodes) {
				out.push(n.path);
				if (n.children) walk(n.children);
			}
		};
		walk(fsStore.fileTree);
		return out;
	}

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
		expect(fsStore.fileTree).toEqual([]);
		expect(vaultStore.path).toBe('/vault');
	});

	it('creates folder and empty template files when everything is missing', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await ensureTemplatesFolder();

		// Phase 8.8: folder creation routes through Rust `create_folder`.
		const { invoke } = await import('@tauri-apps/api/core');
		expect(invoke).toHaveBeenCalledWith('create_folder', { path: '/vault/_system/templates' });
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/periodic-note/Daily-Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/periodic-note/Weekly-Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/periodic-note/Monthly-Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/periodic-note/Quarterly-Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/periodic-note/Yearly-Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/quick-capture/Composer-Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/quick-capture/Clip-Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/quick-capture/Link-Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/quick-capture/Shot-Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/quick-capture/File-Note.md', '');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/_system/templates/periodic-note/One-On-One.md', '');
		// Each created path lands in the tree, sorted, with no vault scan.
		expect(invoke).not.toHaveBeenCalledWith('scan_vault', expect.anything());
		expect(treePaths()).toEqual([
			'/vault/_system',
			'/vault/_system/templates',
			'/vault/_system/templates/periodic-note',
			'/vault/_system/templates/periodic-note/Daily-Note.md',
			'/vault/_system/templates/periodic-note/Monthly-Note.md',
			'/vault/_system/templates/periodic-note/One-On-One.md',
			'/vault/_system/templates/periodic-note/Quarterly-Note.md',
			'/vault/_system/templates/periodic-note/Weekly-Note.md',
			'/vault/_system/templates/periodic-note/Yearly-Note.md',
			'/vault/_system/templates/quick-capture',
			'/vault/_system/templates/quick-capture/Clip-Note.md',
			'/vault/_system/templates/quick-capture/Composer-Note.md',
			'/vault/_system/templates/quick-capture/File-Note.md',
			'/vault/_system/templates/quick-capture/Link-Note.md',
			'/vault/_system/templates/quick-capture/Shot-Note.md',
		]);
	});

	it('adds only the missing template file to an existing folder', async () => {
		fsStore.setFileTree([
			{ name: '_system', path: '/vault/_system', isDirectory: true, children: [
				{ name: 'templates', path: '/vault/_system/templates', isDirectory: true, children: [] },
			] },
		]);
		vi.mocked(exists).mockImplementation(async (p) => String(p) !== '/vault/_system/templates/periodic-note/Daily-Note.md');
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await ensureTemplatesFolder();

		expect(treePaths()).toEqual([
			'/vault/_system',
			'/vault/_system/templates',
			'/vault/_system/templates/periodic-note',
			'/vault/_system/templates/periodic-note/Daily-Note.md',
		]);
	});

	it('uses template paths from settingsStore, not hardcoded defaults', async () => {
		settingsStore.updatePeriodicNotes({
			daily: { templatePath: '_system/templates/Daily Note.md' },
			weekly: { templatePath: '_system/templates/Weekly Note.md' },
			monthly: { templatePath: '_system/templates/Monthly Note.md' },
			quarterly: { templatePath: '_system/templates/Quarterly Note.md' },
		});
		settingsStore.updateQuickCapture({ templates: { note: '_system/templates/Quick Note.md' } });
		settingsStore.updateOneOnOne({ templatePath: '_system/templates/One on One.md' });

		vi.mocked(exists).mockResolvedValue(false);
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
