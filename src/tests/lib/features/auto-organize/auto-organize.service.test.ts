import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('#lib/core/editor/editor.hooks.js', () => ({
	addAfterSaveObserver: vi.fn(() => vi.fn()),
	// The real frontmatter writer notifies after a closed-note write.
	notifyAfterSave: vi.fn(),
}));

vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	moveItem: vi.fn(() => Promise.resolve('/vault/Archive/note.md')),
}));

vi.mock('#lib/features/file-icons/file-icons.service.js', () => ({
	setIconForPath: vi.fn(() => Promise.resolve()),
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
}));

import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { addAfterSaveObserver } from '#lib/core/editor/editor.hooks.js';
import { moveItem } from '#lib/core/filesystem/fs.service.js';
import { setIconForPath } from '#lib/features/file-icons/file-icons.service.js';
import { debug, error } from '#lib/utils/debug.js';
import { autoOrganizeStore } from '#lib/features/auto-organize/auto-organize.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import type { AutoOrganizeRule } from '#lib/features/auto-organize/auto-organize.types.js';
import {
	loadAutoOrganizeConfig,
	saveAutoOrganizeConfig,
	registerAutoOrganizeHook,
	toggleAutoOrganizeHook,
	resetAutoOrganize,
} from '#lib/features/auto-organize/auto-organize.service.js';

describe('auto-organize.service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetAutoOrganize();
		settingsStore.updateAutoOrganize({ enabled: true, debounceMs: 50 });
	});

	describe('loadAutoOrganizeConfig', () => {
		it('loads config from disk into store', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({
				rules: [
					{ id: 'r1', name: 'Test', expression: "file.hasTag('test')", destination: 'Archive', enabled: true },
				],
				excludedFolders: ['_templates'],
			}));

			await loadAutoOrganizeConfig('/vault');

			expect(autoOrganizeStore.rules).toHaveLength(1);
			expect(autoOrganizeStore.rules[0].id).toBe('r1');
			expect(autoOrganizeStore.excludedFolders).toEqual(['_templates']);
			expect(autoOrganizeStore.isConfigLoaded).toBe(true);
		});

		describe('config file name', () => {
			const rulesJson = JSON.stringify({
				rules: [{ id: 'r1', name: 'Test', expression: 'true', destination: 'Archive', enabled: true }],
				excludedFolders: ['_templates'],
			});
			/** A vault holding only the file at `present`, with `rulesJson` in it. */
			function vaultWith(present: string) {
				vi.mocked(exists).mockImplementation(async (path) => path === present);
				vi.mocked(readTextFile).mockImplementation(async (path) => {
					if (path === present) return rulesJson;
					throw new Error(`not found: ${path}`);
				});
			}

			it('loads the rules from .kokobrain/auto-organize-rules.json', async () => {
				vaultWith('/vault/.kokobrain/auto-organize-rules.json');

				await loadAutoOrganizeConfig('/vault');

				expect(autoOrganizeStore.rules.map((r) => r.id)).toEqual(['r1']);
				expect(autoOrganizeStore.excludedFolders).toEqual(['_templates']);
			});

			it('loads no rules from a vault holding only the old auto-move-rules.json', async () => {
				vaultWith('/vault/.kokobrain/auto-move-rules.json');

				await loadAutoOrganizeConfig('/vault');

				expect(autoOrganizeStore.rules).toEqual([]);
				expect(autoOrganizeStore.excludedFolders).toEqual([]);
				expect(autoOrganizeStore.isConfigLoaded).toBe(true);
				expect(readTextFile).not.toHaveBeenCalled();
			});
		});

		it('initializes with empty defaults when file does not exist', async () => {
			vi.mocked(exists).mockResolvedValue(false);

			await loadAutoOrganizeConfig('/vault');

			expect(autoOrganizeStore.rules).toEqual([]);
			expect(autoOrganizeStore.excludedFolders).toEqual([]);
			expect(autoOrganizeStore.isConfigLoaded).toBe(true);
		});

		it('initializes with empty defaults when file is empty', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue('   ');

			await loadAutoOrganizeConfig('/vault');

			expect(autoOrganizeStore.rules).toEqual([]);
			expect(autoOrganizeStore.isConfigLoaded).toBe(true);
		});

		it('handles corrupt JSON gracefully', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue('not valid json{{{');

			await loadAutoOrganizeConfig('/vault');

			expect(autoOrganizeStore.rules).toEqual([]);
			expect(autoOrganizeStore.isConfigLoaded).toBe(true);
		});

		it('drops property entries on todoist_project and a text value on _archived', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({
				rules: [{
					id: 'r1',
					name: 'Stamp',
					expression: 'true',
					destination: '',
					enabled: true,
					properties: [
						{ key: 'todoist_project', value: 'Work', mode: 'always' },
						{ key: '_archived', value: 'true', mode: 'if-missing' },
						{ key: 'archived', value: true, mode: 'if-missing' },
						{ key: '_belongs_to', value: '[[AWS]]', mode: 'if-missing' },
					],
				}],
				excludedFolders: [],
			}));

			await loadAutoOrganizeConfig('/vault');

			expect(autoOrganizeStore.rules[0].properties).toEqual([
				{ key: 'archived', value: true, mode: 'if-missing' },
				{ key: '_belongs_to', value: '[[AWS]]', mode: 'if-missing' },
			]);
		});

		it('drops an add whose value is a boolean, and keeps a remove without its value', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({
				rules: [{
					id: 'r1',
					name: 'Tag',
					expression: 'true',
					destination: '',
					enabled: true,
					properties: [
						{ key: 'tags', value: true, mode: 'add' },
						{ key: 'tags', value: 'work', mode: 'add' },
						{ key: 'status', value: 'draft', mode: 'remove' },
						{ key: '_archived', mode: 'remove' },
					],
				}],
				excludedFolders: [],
			}));

			await loadAutoOrganizeConfig('/vault');

			expect(autoOrganizeStore.rules[0].properties).toEqual([
				{ key: 'tags', value: 'work', mode: 'add' },
				{ key: 'status', mode: 'remove' },
				{ key: '_archived', mode: 'remove' },
			]);
		});

		it('loads a rule without properties unchanged, and drops a non-array properties field', async () => {
			const plain = { id: 'r1', name: 'Test', expression: 'true', destination: 'Archive', enabled: true };
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({
				rules: [plain, { ...plain, id: 'r2', properties: 'oops' }],
				excludedFolders: [],
			}));

			await loadAutoOrganizeConfig('/vault');

			expect(autoOrganizeStore.rules).toEqual([plain, { ...plain, id: 'r2' }]);
		});

		it('loads a string expression and an object filter unchanged', async () => {
			const old = { id: 'r1', name: 'Old', expression: "status == 'done'", destination: 'Archive', enabled: true };
			const builder = { ...old, id: 'r2', expression: { or: ["status == 'done'", "status == 'dropped'"] } };
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ rules: [old, builder], excludedFolders: [] }));

			await loadAutoOrganizeConfig('/vault');

			expect(autoOrganizeStore.rules).toEqual([old, builder]);
		});

		it('handles missing rules field gracefully', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ excludedFolders: ['_system'] }));

			await loadAutoOrganizeConfig('/vault');

			expect(autoOrganizeStore.rules).toEqual([]);
			expect(autoOrganizeStore.excludedFolders).toEqual(['_system']);
		});
	});

	describe('saveAutoOrganizeConfig', () => {
		it('saves current store state to disk', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(writeTextFile).mockResolvedValue(undefined as never);

			autoOrganizeStore.setConfig({
				rules: [{ id: 'r1', name: 'Test', expression: 'true', destination: 'Archive', enabled: true }],
				excludedFolders: ['_system'],
			});

			await saveAutoOrganizeConfig('/vault');

			expect(writeTextFile).toHaveBeenCalledTimes(1);
			const [path, content] = vi.mocked(writeTextFile).mock.calls[0];
			expect(path).toBe('/vault/.kokobrain/auto-organize-rules.json');
			const parsed = JSON.parse(content as string);
			expect(parsed.rules).toHaveLength(1);
			expect(parsed.excludedFolders).toEqual(['_system']);
		});

		it('creates .kokobrain directory if it does not exist', async () => {
			vi.mocked(exists).mockResolvedValue(false);
			vi.mocked(mkdir).mockResolvedValue(undefined as never);
			vi.mocked(writeTextFile).mockResolvedValue(undefined as never);

			await saveAutoOrganizeConfig('/vault');

			expect(mkdir).toHaveBeenCalledWith('/vault/.kokobrain');
		});

		it('throws on write failure', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(writeTextFile).mockRejectedValue(new Error('Permission denied'));

			await expect(saveAutoOrganizeConfig('/vault')).rejects.toThrow('Permission denied');
		});

		it('throws when mkdir fails and does not write the config file', async () => {
			vi.mocked(exists).mockResolvedValue(false);
			vi.mocked(mkdir).mockRejectedValue(new Error('EACCES: permission denied'));

			await expect(saveAutoOrganizeConfig('/vault')).rejects.toThrow('EACCES: permission denied');
			expect(writeTextFile).not.toHaveBeenCalled();
		});
	});

	describe('registerAutoOrganizeHook', () => {
		it('registers an after-save observer and returns unsubscribe', () => {
			const unsubscribe = vi.fn();
			vi.mocked(addAfterSaveObserver).mockReturnValue(unsubscribe);

			const result = registerAutoOrganizeHook();

			expect(addAfterSaveObserver).toHaveBeenCalledTimes(1);
			expect(result).toBe(unsubscribe);
		});

		it('observer skips when auto-organize is disabled', () => {
			settingsStore.updateAutoOrganize({ enabled: false });
			let capturedObserver: ((path: string, content: string) => void) | null = null;
			vi.mocked(addAfterSaveObserver).mockImplementation((observer) => {
				capturedObserver = observer;
				return vi.fn();
			});

			registerAutoOrganizeHook();
			vi.mocked(readTextFile).mockResolvedValue('content');
			capturedObserver!('/vault/note.md', 'content');

			// Should not set any timer (moveItem not called even after delay)
			expect(moveItem).not.toHaveBeenCalled();
		});

		it('observer skips when no enabled rules exist', () => {
			// Store has no rules
			let capturedObserver: ((path: string, content: string) => void) | null = null;
			vi.mocked(addAfterSaveObserver).mockImplementation((observer) => {
				capturedObserver = observer;
				return vi.fn();
			});

			registerAutoOrganizeHook();
			vi.mocked(readTextFile).mockResolvedValue('content');
			capturedObserver!('/vault/note.md', 'content');

			expect(moveItem).not.toHaveBeenCalled();
		});

		it('observer calls moveItem after debounce when rule matches', async () => {
			vi.useFakeTimers();

			// Set vault path
			vaultStore.open('/vault');

			// Add a rule that matches any file with tag 'archive'
			autoOrganizeStore.setConfig({
				rules: [{ id: 'r1', name: 'Archive', expression: "file.hasTag('archive')", destination: 'Archive', enabled: true }],
				excludedFolders: [],
			});

			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(moveItem).mockResolvedValue('/vault/Archive/note.md');

			let capturedObserver: ((path: string, content: string) => void) | null = null;
			vi.mocked(addAfterSaveObserver).mockImplementation((observer) => {
				capturedObserver = observer;
				return vi.fn();
			});

			registerAutoOrganizeHook();

			// Simulate saving a file with 'archive' tag in frontmatter
			const content = '---\ntags:\n  - archive\n---\n# My Note';
			vi.mocked(readTextFile).mockResolvedValue(content);
			capturedObserver!('/vault/notes/note.md', content);

			// moveItem should not be called yet (debounce)
			expect(moveItem).not.toHaveBeenCalled();

			// Advance past debounce
			await vi.advanceTimersByTimeAsync(100);

			expect(moveItem).toHaveBeenCalledWith('/vault/notes/note.md', '/vault/Archive');

			vi.useRealTimers();
			vaultStore.close();
		});

		it('moves a note an object filter matches, and not one it does not', async () => {
			vi.useFakeTimers();
			vaultStore.open('/vault');
			autoOrganizeStore.setConfig({
				rules: [{ id: 'r1', name: 'Closed', expression: { or: ["status == 'done'", "status == 'dropped'"] }, destination: 'Archive', enabled: true }],
				excludedFolders: [],
			});
			vi.mocked(exists).mockResolvedValue(true);
			let capturedObserver: ((path: string, content: string) => void) | null = null;
			vi.mocked(addAfterSaveObserver).mockImplementation((observer) => {
				capturedObserver = observer;
				return vi.fn();
			});
			registerAutoOrganizeHook();

			const active = '---\nstatus: active\n---\n';
			vi.mocked(readTextFile).mockResolvedValue(active);
			capturedObserver!('/vault/notes/a.md', active);
			await vi.advanceTimersByTimeAsync(100);
			expect(moveItem).not.toHaveBeenCalled();

			const dropped = '---\nstatus: dropped\n---\n';
			vi.mocked(readTextFile).mockResolvedValue(dropped);
			capturedObserver!('/vault/notes/b.md', dropped);
			await vi.advanceTimersByTimeAsync(100);
			expect(moveItem).toHaveBeenCalledWith('/vault/notes/b.md', '/vault/Archive');

			vi.useRealTimers();
			vaultStore.close();
		});

		it('reports an empty object filter and moves nothing', async () => {
			vi.useFakeTimers();
			vaultStore.open('/vault');
			autoOrganizeStore.setConfig({
				rules: [{ id: 'r1', name: 'Unfinished', expression: { not: ["file.name == ''"] }, destination: 'Archive', enabled: true }],
				excludedFolders: [],
			});
			vi.mocked(exists).mockResolvedValue(true);
			let capturedObserver: ((path: string, content: string) => void) | null = null;
			vi.mocked(addAfterSaveObserver).mockImplementation((observer) => {
				capturedObserver = observer;
				return vi.fn();
			});
			registerAutoOrganizeHook();

			const content = '---\nstatus: active\n---\n';
			vi.mocked(readTextFile).mockResolvedValue(content);
			capturedObserver!('/vault/notes/a.md', content);
			await vi.advanceTimersByTimeAsync(100);

			expect(moveItem).not.toHaveBeenCalled();
			expect(error).toHaveBeenCalledWith('AUTO-ORGANIZE', expect.stringContaining('Rule "Unfinished" failed to evaluate'), expect.objectContaining({ message: 'Every filter needs a value' }));

			vi.useRealTimers();
			vaultStore.close();
		});

		it('observer never moves a .view, while the same file.folder rule moves a .md', async () => {
			vi.useFakeTimers();

			vaultStore.open('/vault');
			autoOrganizeStore.setConfig({
				rules: [{ id: 'r1', name: 'Tidy', expression: "file.folder == '/vault/inbox'", destination: 'Archive', enabled: true }],
				excludedFolders: [],
			});

			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(moveItem).mockResolvedValue('/vault/Archive/note.md');

			let capturedObserver: ((path: string, content: string) => void) | null = null;
			vi.mocked(addAfterSaveObserver).mockImplementation((observer) => {
				capturedObserver = observer;
				return vi.fn();
			});

			registerAutoOrganizeHook();

			vi.mocked(readTextFile).mockResolvedValue('_sidebar_label: Projects\n');
			capturedObserver!('/vault/inbox/Projects.view', '_sidebar_label: Projects\n');
			await vi.advanceTimersByTimeAsync(100);
			expect(moveItem).not.toHaveBeenCalled();

			vi.mocked(readTextFile).mockResolvedValue('# Note');
			capturedObserver!('/vault/inbox/note.md', '# Note');
			await vi.advanceTimersByTimeAsync(100);
			expect(moveItem).toHaveBeenCalledTimes(1);
			expect(moveItem).toHaveBeenCalledWith('/vault/inbox/note.md', '/vault/Archive');

			vi.useRealTimers();
			vaultStore.close();
		});

		it('observer skips files in excluded folders', async () => {
			vi.useFakeTimers();

			vaultStore.open('/vault');
			autoOrganizeStore.setConfig({
				rules: [{ id: 'r1', name: 'Test', expression: 'true', destination: 'Archive', enabled: true }],
				excludedFolders: ['_templates'],
			});

			let capturedObserver: ((path: string, content: string) => void) | null = null;
			vi.mocked(addAfterSaveObserver).mockImplementation((observer) => {
				capturedObserver = observer;
				return vi.fn();
			});

			registerAutoOrganizeHook();
			vi.mocked(readTextFile).mockResolvedValue('content');
			capturedObserver!('/vault/_templates/note.md', 'content');

			await vi.advanceTimersByTimeAsync(100);

			expect(moveItem).not.toHaveBeenCalled();

			vi.useRealTimers();
			vaultStore.close();
		});

		it('observer skips move but applies icon when file is already in destination', async () => {
			vi.useFakeTimers();

			vaultStore.open('/vault');
			autoOrganizeStore.setConfig({
				rules: [{
					id: 'r1',
					name: 'Archive',
					expression: "file.hasTag('archive')",
					destination: 'Archive',
					enabled: true,
					icon: { iconPack: 'lucide', iconName: 'archive', color: '#ff0000', textColor: '#00ff00' },
				}],
				excludedFolders: [],
			});

			vi.mocked(exists).mockResolvedValue(true);

			let capturedObserver: ((path: string, content: string) => void) | null = null;
			vi.mocked(addAfterSaveObserver).mockImplementation((observer) => {
				capturedObserver = observer;
				return vi.fn();
			});

			registerAutoOrganizeHook();
			vi.mocked(readTextFile).mockResolvedValue('---\ntags:\n  - archive\n---\n');
			capturedObserver!('/vault/Archive/note.md', '---\ntags:\n  - archive\n---\n');

			await vi.advanceTimersByTimeAsync(100);

			expect(moveItem).not.toHaveBeenCalled();
			expect(setIconForPath).toHaveBeenCalledWith(
				'/vault', '/vault/Archive/note.md', 'lucide', 'archive', '#ff0000', '#00ff00',
			);

			vi.useRealTimers();
			vaultStore.close();
		});

		it('observer skips the icon of a note with lossy frontmatter and logs instead', async () => {
			vi.useFakeTimers();

			vaultStore.open('/vault');
			autoOrganizeStore.setConfig({
				rules: [{
					id: 'r1',
					name: 'Archive',
					expression: "file.hasTag('archive')",
					destination: 'Archive',
					enabled: true,
					icon: { iconPack: 'lucide', iconName: 'archive' },
				}],
				excludedFolders: [],
			});

			let capturedObserver: ((path: string, content: string) => void) | null = null;
			vi.mocked(addAfterSaveObserver).mockImplementation((observer) => {
				capturedObserver = observer;
				return vi.fn();
			});

			registerAutoOrganizeHook();
			vi.mocked(readTextFile).mockResolvedValue('---\n# keep me\ntags:\n  - archive\n---\n');
			capturedObserver!('/vault/Archive/note.md', '---\n# keep me\ntags:\n  - archive\n---\n');

			await vi.advanceTimersByTimeAsync(100);

			expect(moveItem).not.toHaveBeenCalled();
			expect(setIconForPath).not.toHaveBeenCalled();
			expect(debug).toHaveBeenCalledWith('AUTO-ORGANIZE', 'Skipped icon for /vault/Archive/note.md: frontmatter is comments');

			vi.useRealTimers();
			vaultStore.close();
		});

		it('observer moves a note with lossy frontmatter but skips its icon', async () => {
			vi.useFakeTimers();

			vaultStore.open('/vault');
			autoOrganizeStore.setConfig({
				rules: [{
					id: 'r1',
					name: 'Archive',
					expression: "file.hasTag('archive')",
					destination: 'Archive',
					enabled: true,
					icon: { iconPack: 'lucide', iconName: 'archive' },
				}],
				excludedFolders: [],
			});
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(moveItem).mockResolvedValue('/vault/Archive/note.md');

			let capturedObserver: ((path: string, content: string) => void) | null = null;
			vi.mocked(addAfterSaveObserver).mockImplementation((observer) => {
				capturedObserver = observer;
				return vi.fn();
			});

			registerAutoOrganizeHook();
			vi.mocked(readTextFile).mockResolvedValue('---\n# keep me\ntags:\n  - archive\n---\n');
			capturedObserver!('/vault/notes/note.md', '---\n# keep me\ntags:\n  - archive\n---\n');

			await vi.advanceTimersByTimeAsync(100);

			expect(moveItem).toHaveBeenCalledWith('/vault/notes/note.md', '/vault/Archive');
			expect(setIconForPath).not.toHaveBeenCalled();
			expect(debug).toHaveBeenCalledWith('AUTO-ORGANIZE', 'Skipped icon for /vault/Archive/note.md: frontmatter is comments');

			vi.useRealTimers();
			vaultStore.close();
		});

		it('observer skips the icon when the move fails', async () => {
			vi.useFakeTimers();

			vaultStore.open('/vault');
			autoOrganizeStore.setConfig({
				rules: [{
					id: 'r1',
					name: 'Archive',
					expression: "file.hasTag('archive')",
					destination: 'Archive',
					enabled: true,
					icon: { iconPack: 'lucide', iconName: 'archive' },
				}],
				excludedFolders: [],
			});
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(moveItem).mockRejectedValue(new Error('"note.md" already exists in this folder'));

			let capturedObserver: ((path: string, content: string) => void) | null = null;
			vi.mocked(addAfterSaveObserver).mockImplementation((observer) => {
				capturedObserver = observer;
				return vi.fn();
			});

			registerAutoOrganizeHook();
			vi.mocked(readTextFile).mockResolvedValue('---\ntags:\n  - archive\n---\n');
			capturedObserver!('/vault/notes/note.md', '---\ntags:\n  - archive\n---\n');

			await vi.advanceTimersByTimeAsync(100);

			expect(moveItem).toHaveBeenCalledWith('/vault/notes/note.md', '/vault/Archive');
			expect(setIconForPath).not.toHaveBeenCalled();

			vi.useRealTimers();
			vaultStore.close();
		});

		it('observer logs an IO error from the icon write and keeps the move', async () => {
			vi.useFakeTimers();

			vaultStore.open('/vault');
			autoOrganizeStore.setConfig({
				rules: [{
					id: 'r1',
					name: 'Archive',
					expression: "file.hasTag('archive')",
					destination: 'Archive',
					enabled: true,
					icon: { iconPack: 'lucide', iconName: 'archive' },
				}],
				excludedFolders: [],
			});
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(moveItem).mockResolvedValue('/vault/Archive/note.md');
			const failure = new Error('EACCES: permission denied');
			vi.mocked(setIconForPath).mockRejectedValueOnce(failure);

			let capturedObserver: ((path: string, content: string) => void) | null = null;
			vi.mocked(addAfterSaveObserver).mockImplementation((observer) => {
				capturedObserver = observer;
				return vi.fn();
			});

			registerAutoOrganizeHook();
			vi.mocked(readTextFile).mockResolvedValue('---\ntags:\n  - archive\n---\n');
			capturedObserver!('/vault/notes/note.md', '---\ntags:\n  - archive\n---\n');

			await vi.advanceTimersByTimeAsync(100);

			expect(moveItem).toHaveBeenCalledWith('/vault/notes/note.md', '/vault/Archive');
			expect(setIconForPath).toHaveBeenCalledWith('/vault', '/vault/Archive/note.md', 'lucide', 'archive', undefined, undefined);
			expect(error).toHaveBeenCalledWith('AUTO-ORGANIZE', 'Failed to apply icon:', failure);

			vi.useRealTimers();
			vaultStore.close();
		});

		it('observer skips move and icon when file is already in destination and rule has no icon', async () => {
			vi.useFakeTimers();

			vaultStore.open('/vault');
			autoOrganizeStore.setConfig({
				rules: [{ id: 'r1', name: 'Archive', expression: "file.hasTag('archive')", destination: 'Archive', enabled: true }],
				excludedFolders: [],
			});

			let capturedObserver: ((path: string, content: string) => void) | null = null;
			vi.mocked(addAfterSaveObserver).mockImplementation((observer) => {
				capturedObserver = observer;
				return vi.fn();
			});

			registerAutoOrganizeHook();
			vi.mocked(readTextFile).mockResolvedValue('---\ntags:\n  - archive\n---\n');
			capturedObserver!('/vault/Archive/note.md', '---\ntags:\n  - archive\n---\n');

			await vi.advanceTimersByTimeAsync(100);

			expect(moveItem).not.toHaveBeenCalled();
			expect(setIconForPath).not.toHaveBeenCalled();

			vi.useRealTimers();
			vaultStore.close();
		});
	});

	describe('rule properties', () => {
		/** Registers the hook and returns the observer it added. */
		function captureObserver(): (path: string, content: string) => void {
			let captured: ((path: string, content: string) => void) | null = null;
			vi.mocked(addAfterSaveObserver).mockImplementation((observer) => {
				captured = observer;
				return vi.fn();
			});
			registerAutoOrganizeHook();
			return captured!;
		}

		/** The content of the last `writeTextFile` call on `path`, or null. */
		function lastWrite(path: string): string | null {
			const calls = vi.mocked(writeTextFile).mock.calls.filter(([p]) => p === path);
			return calls.length ? (calls[calls.length - 1][1] as string) : null;
		}

		beforeEach(() => {
			vi.useFakeTimers();
			vaultStore.open('/vault');
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(writeTextFile).mockResolvedValue(undefined as never);
		});

		afterEach(() => {
			vi.useRealTimers();
			vaultStore.close();
		});

		it('a rule with no destination writes its property in place and does not move the note', async () => {
			autoOrganizeStore.setConfig({
				rules: [{
					id: 'r1',
					name: 'AWS topic notes',
					expression: "file.folder == '/vault/topics/AWS'",
					destination: '',
					properties: [{ key: '_belongs_to', value: '[[AWS]]', mode: 'if-missing' }],
					enabled: true,
				}],
				excludedFolders: [],
			});
			const content = '---\n_organized: false\n---\nbody';
			vi.mocked(readTextFile).mockResolvedValue(content);

			captureObserver()('/vault/topics/AWS/note.md', content);
			await vi.advanceTimersByTimeAsync(100);

			expect(moveItem).not.toHaveBeenCalled();
			const written = lastWrite('/vault/topics/AWS/note.md');
			expect(written).toContain('_belongs_to: "[[AWS]]"');
			expect(parseFrontmatterProperties(written!)).toEqual([
				{ key: '_organized', value: false, type: 'boolean' },
				{ key: '_belongs_to', value: '[[AWS]]', type: 'text' },
			]);
			expect(written!.endsWith('\nbody')).toBe(true);
		});

		/** A rule matching every note, with no destination unless given. */
		function rule(id: string, properties: AutoOrganizeRule['properties'], overrides: Partial<AutoOrganizeRule> = {}): AutoOrganizeRule {
			return { id, name: `Rule ${id}`, expression: 'true', destination: '', enabled: true, properties, ...overrides };
		}

		/** Loads `rules`, saves `path` with `content` on disk, and runs past the debounce. */
		async function saveAndRun(rules: AutoOrganizeRule[], path: string, content: string): Promise<void> {
			autoOrganizeStore.setConfig({ rules, excludedFolders: [] });
			vi.mocked(readTextFile).mockResolvedValue(content);
			captureObserver()(path, content);
			await vi.advanceTimersByTimeAsync(100);
		}

		const NOTE = '/vault/notes/note.md';

		describe('if-missing', () => {
			const belongs = [rule('r1', [{ key: '_belongs_to', value: '[[AWS]]', mode: 'if-missing' }])];

			it('leaves a note whose key holds a value unchanged', async () => {
				await saveAndRun(belongs, NOTE, '---\n_belongs_to: "[[Other]]"\n---\nbody');
				expect(writeTextFile).not.toHaveBeenCalled();
			});

			it('fills a key whose value is empty', async () => {
				await saveAndRun(belongs, NOTE, '---\n_belongs_to: ""\n---\nbody');
				expect(parseFrontmatterProperties(lastWrite(NOTE)!)).toEqual([
					{ key: '_belongs_to', value: '[[AWS]]', type: 'text' },
				]);
			});

			it('treats false as present', async () => {
				await saveAndRun(
					[rule('r1', [{ key: 'done', value: true, mode: 'if-missing' }])],
					NOTE,
					'---\ndone: false\n---\nbody',
				);
				expect(writeTextFile).not.toHaveBeenCalled();
			});
		});

		describe('always', () => {
			const active = [rule('r1', [{ key: 'status', value: 'active', mode: 'always' }])];

			it('replaces a differing value', async () => {
				await saveAndRun(active, NOTE, '---\nstatus: paused\n---\nbody');
				expect(parseFrontmatterProperties(lastWrite(NOTE)!)).toEqual([
					{ key: 'status', value: 'active', type: 'text' },
				]);
			});

			it('does not write a note already at the value', async () => {
				await saveAndRun(active, NOTE, '---\nstatus: active\n---\nbody');
				expect(writeTextFile).not.toHaveBeenCalled();
			});
		});

		describe('add', () => {
			const work = [rule('r1', [{ key: 'tags', value: 'work', mode: 'add' }])];

			it('appends a missing item and keeps the other tags', async () => {
				await saveAndRun(work, NOTE, '---\ntags: [a]\n---\nbody');
				expect(parseFrontmatterProperties(lastWrite(NOTE)!)).toEqual([
					{ key: 'tags', value: ['a', 'work'], type: 'list' },
				]);
			});

			it('does not write a list that already holds every item', async () => {
				await saveAndRun(work, NOTE, '---\ntags: [a, work]\n---\nbody');
				expect(writeTextFile).not.toHaveBeenCalled();
			});

			it('creates the list when the key is absent', async () => {
				await saveAndRun(
					[rule('r1', [{ key: 'projects', value: ['[[A]]', '[[B]]'], mode: 'add' }])],
					NOTE,
					'---\nstatus: open\n---\nbody',
				);
				expect(parseFrontmatterProperties(lastWrite(NOTE)!)).toEqual([
					{ key: 'status', value: 'open', type: 'text' },
					{ key: 'projects', value: ['[[A]]', '[[B]]'], type: 'list' },
				]);
			});

			it('turns a single string into a list: the old string, then the new items', async () => {
				await saveAndRun(work, NOTE, '---\ntags: a\n---\nbody');
				expect(parseFrontmatterProperties(lastWrite(NOTE)!)).toEqual([
					{ key: 'tags', value: ['a', 'work'], type: 'list' },
				]);
			});

			it('compares tags without a leading #, and leaves inline tags in the body alone', async () => {
				await saveAndRun(
					[rule('r1', [{ key: 'tags', value: ['#work', 'home'], mode: 'add' }])],
					NOTE,
					'---\ntags: ["#work"]\n---\nbody #inline',
				);
				const written = lastWrite(NOTE)!;
				expect(parseFrontmatterProperties(written)).toEqual([
					{ key: 'tags', value: ['#work', 'home'], type: 'list' },
				]);
				expect(written.endsWith('\nbody #inline')).toBe(true);
			});

			it('writes nothing on a number and logs the skip once per rule', async () => {
				const counter = [rule('r1', [{ key: 'count', value: 'x', mode: 'add' }])];
				await saveAndRun(counter, NOTE, '---\ncount: 3\n---\nbody');
				await saveAndRun(counter, NOTE, '---\ncount: 3\n---\nbody');

				expect(writeTextFile).not.toHaveBeenCalled();
				expect(error).toHaveBeenCalledTimes(1);
				expect(error).toHaveBeenCalledWith(
					'AUTO-ORGANIZE',
					`Rule "Rule r1" cannot add to count on ${NOTE}: the value is not a list or text`,
				);
			});
		});

		describe('remove', () => {
			it('deletes the key, whatever its value', async () => {
				await saveAndRun(
					[rule('r1', [{ key: 'status', mode: 'remove' }])],
					NOTE,
					'---\nstatus: ""\nother: kept\n---\nbody',
				);
				expect(parseFrontmatterProperties(lastWrite(NOTE)!)).toEqual([
					{ key: 'other', value: 'kept', type: 'text' },
				]);
			});

			it('does not write a note without the key', async () => {
				await saveAndRun([rule('r1', [{ key: 'status', mode: 'remove' }])], NOTE, '---\nother: kept\n---\nbody');
				expect(writeTextFile).not.toHaveBeenCalled();
			});

			it('drops _archived through its alias', async () => {
				await saveAndRun(
					[rule('r1', [{ key: 'archived', mode: 'remove' }])],
					NOTE,
					'---\n_archived: true\nstatus: done\n---\nbody',
				);
				expect(parseFrontmatterProperties(lastWrite(NOTE)!)).toEqual([
					{ key: 'status', value: 'done', type: 'text' },
				]);
			});

			it('on tags clears every frontmatter tag, whatever value the entry holds', async () => {
				await saveAndRun(
					[rule('r1', [{ key: 'tags', value: 'draft', mode: 'remove' }])],
					NOTE,
					'---\ntags: [draft, keep]\nstatus: done\n---\nbody #inline',
				);
				const written = lastWrite(NOTE)!;
				expect(parseFrontmatterProperties(written)).toEqual([
					{ key: 'status', value: 'done', type: 'text' },
				]);
				expect(written.endsWith('\nbody #inline')).toBe(true);
			});
		});

		it('a higher if-missing rule on tags blocks a lower add on tags', async () => {
			await saveAndRun(
				[
					rule('r1', [{ key: 'tags', value: ['first'], mode: 'if-missing' }]),
					rule('r2', [{ key: 'tags', value: 'work', mode: 'add' }]),
				],
				NOTE,
				'---\ntags: [a]\n---\nbody',
			);
			expect(writeTextFile).not.toHaveBeenCalled();
		});

		it('writes the higher rule\'s value when two matching rules set one key', async () => {
			await saveAndRun(
				[
					rule('r1', [{ key: 'status', value: 'high', mode: 'always' }]),
					rule('r2', [{ key: 'status', value: 'low', mode: 'always' }]),
				],
				NOTE,
				'---\nstatus: paused\n---\nbody',
			);
			expect(parseFrontmatterProperties(lastWrite(NOTE)!)).toEqual([
				{ key: 'status', value: 'high', type: 'text' },
			]);
		});

		it('a higher if-missing rule on a present key blocks a lower always rule on that key', async () => {
			await saveAndRun(
				[
					rule('r1', [{ key: 'icon', value: 'lucide:star', mode: 'if-missing' }]),
					rule('r2', [{ key: '_icon', value: 'lucide:cloud', mode: 'always' }]),
				],
				NOTE,
				'---\n_icon: lucide:book\n---\nbody',
			);
			expect(writeTextFile).not.toHaveBeenCalled();
		});

		it('a rule with properties and no destination does not block a later rule with one', async () => {
			vi.mocked(moveItem).mockResolvedValue('/vault/Archive/note.md');
			await saveAndRun(
				[
					rule('r1', [{ key: 'x', value: 1, mode: 'always' }]),
					rule('r2', undefined, { destination: 'Archive' }),
				],
				NOTE,
				'---\nstatus: done\n---\nbody',
			);
			expect(moveItem).toHaveBeenCalledWith(NOTE, '/vault/Archive');
			expect(parseFrontmatterProperties(lastWrite('/vault/Archive/note.md')!)).toEqual([
				{ key: 'status', value: 'done', type: 'text' },
				{ key: 'x', value: 1, type: 'number' },
			]);
		});

		it('a rule with a destination and properties moves first, then writes at the new path', async () => {
			vi.mocked(moveItem).mockResolvedValue('/vault/Archive/note.md');
			await saveAndRun(
				[rule('r1', [{ key: 'x', value: 1, mode: 'always' }], { destination: 'Archive' })],
				NOTE,
				'---\nstatus: done\n---\nbody',
			);
			expect(lastWrite(NOTE)).toBeNull();
			expect(lastWrite('/vault/Archive/note.md')).toContain('x: 1');
			expect(vi.mocked(moveItem).mock.invocationCallOrder[0]).toBeLessThan(
				vi.mocked(writeTextFile).mock.invocationCallOrder[0],
			);
		});

		it('a failed move writes nothing', async () => {
			vi.mocked(moveItem).mockRejectedValue(new Error('"note.md" already exists in this folder'));
			await saveAndRun(
				[rule('r1', [{ key: 'x', value: 1, mode: 'always' }], { destination: 'Archive' })],
				NOTE,
				'---\nstatus: done\n---\nbody',
			);
			expect(moveItem).toHaveBeenCalled();
			expect(writeTextFile).not.toHaveBeenCalled();
		});

		it('evaluates the note as it is when the timer fires, not as it was saved', async () => {
			autoOrganizeStore.setConfig({
				rules: [rule('r1', [{ key: 'x', value: 1, mode: 'always' }], { expression: 'status == "done"' })],
				excludedFolders: [],
			});
			const saved = '---\nstatus: draft\n---\nbody';
			const now = '---\nstatus: done\n---\nbody';
			vi.mocked(readTextFile).mockResolvedValue(now);

			captureObserver()(NOTE, saved);
			await vi.advanceTimersByTimeAsync(100);

			expect(parseFrontmatterProperties(lastWrite(NOTE)!)).toEqual([
				{ key: 'status', value: 'done', type: 'text' },
				{ key: 'x', value: 1, type: 'number' },
			]);
		});

		it('evaluates the open tab content over the disk content', async () => {
			autoOrganizeStore.setConfig({
				rules: [rule('r1', [{ key: 'x', value: 1, mode: 'always' }], { expression: 'status == "done"' })],
				excludedFolders: [],
			});
			vi.mocked(readTextFile).mockResolvedValue('---\nstatus: draft\n---\nbody');
			editorStore.reset();
			editorStore.addTab({
				path: NOTE,
				name: 'note.md',
				content: '---\nstatus: done\n---\nunsaved',
				savedContent: '---\nstatus: draft\n---\nbody',
			});

			try {
				captureObserver()(NOTE, '---\nstatus: draft\n---\nbody');
				await vi.advanceTimersByTimeAsync(100);

				expect(parseFrontmatterProperties(lastWrite(NOTE)!)).toEqual([
					{ key: 'status', value: 'done', type: 'text' },
					{ key: 'x', value: 1, type: 'number' },
				]);
				expect(lastWrite(NOTE)).toContain('unsaved');
			} finally {
				editorStore.reset();
			}
		});

		it('a note deleted before the timer fires produces no write and no error log', async () => {
			autoOrganizeStore.setConfig({ rules: [rule('r1', [{ key: 'x', value: 1, mode: 'always' }])], excludedFolders: [] });
			vi.mocked(readTextFile).mockRejectedValue(new Error('failed to open file: No such file or directory'));
			vi.mocked(exists).mockResolvedValue(false);

			captureObserver()(NOTE, '---\nstatus: done\n---\n');
			await vi.advanceTimersByTimeAsync(100);

			expect(writeTextFile).not.toHaveBeenCalled();
			expect(error).not.toHaveBeenCalled();
		});

		it('turning Auto Organize off before the timer fires prevents the write', async () => {
			autoOrganizeStore.setConfig({ rules: [rule('r1', [{ key: 'x', value: 1, mode: 'always' }])], excludedFolders: [] });
			vi.mocked(readTextFile).mockResolvedValue('---\nstatus: done\n---\n');

			captureObserver()(NOTE, '---\nstatus: done\n---\n');
			settingsStore.updateAutoOrganize({ enabled: false });
			await vi.advanceTimersByTimeAsync(100);

			expect(readTextFile).not.toHaveBeenCalled();
			expect(writeTextFile).not.toHaveBeenCalled();
		});

		it('writes a boolean value as a YAML boolean', async () => {
			await saveAndRun([rule('r1', [{ key: 'reviewed', value: true, mode: 'always' }])], NOTE, '# body\n');
			const written = lastWrite(NOTE)!;
			expect(written).toContain('reviewed: true\n');
			expect(written).not.toContain('"true"');
		});

		it('logs a failed property write once per rule, naming the rule and the note', async () => {
			const failure = new Error('EACCES: permission denied');
			vi.mocked(writeTextFile).mockRejectedValue(failure);
			const rules = [rule('r1', [{ key: 'x', value: 1, mode: 'always' }])];

			await saveAndRun(rules, NOTE, '---\nstatus: done\n---\n');
			await saveAndRun(rules, NOTE, '---\nstatus: done\n---\n');

			expect(error).toHaveBeenCalledTimes(1);
			expect(error).toHaveBeenCalledWith('AUTO-ORGANIZE', `Rule "Rule r1" failed to set properties on ${NOTE}:`, failure);
		});

		describe('gates', () => {
			const stamp = [rule('r1', [{ key: 'x', value: 1, mode: 'always' }])];
			const originalTemplates = { ...settingsStore.templates };

			afterEach(() => {
				settingsStore.updateTemplates(originalTemplates);
			});

			it('does not write a .canvas file', async () => {
				await saveAndRun(stamp, '/vault/notes/board.canvas', '{"nodes":[],"edges":[]}');
				expect(writeTextFile).not.toHaveBeenCalled();
				expect(debug).toHaveBeenCalledWith('AUTO-ORGANIZE', 'Skipped properties for /vault/notes/board.canvas: not Markdown');
			});

			it('does not write a note under the system folder', async () => {
				await saveAndRun(stamp, '/vault/_system/lists/note.md', '---\nstatus: done\n---\n');
				expect(writeTextFile).not.toHaveBeenCalled();
				expect(debug).toHaveBeenCalledWith('AUTO-ORGANIZE', 'Skipped properties for /vault/_system/lists/note.md: inside _system/');
			});

			it('does not write a note in a templates folder set outside the system folder', async () => {
				settingsStore.updateTemplates({ folder: 'Templates' });
				await saveAndRun(stamp, '/vault/Templates/Meeting.md', '---\nstatus: done\n---\n');
				expect(writeTextFile).not.toHaveBeenCalled();
				expect(debug).toHaveBeenCalledWith('AUTO-ORGANIZE', 'Skipped properties for /vault/Templates/Meeting.md: inside Templates/');
			});

			it('does not write a type definition note', async () => {
				await saveAndRun(stamp, '/vault/Project.md', '---\n_type: Type\n---\n# Project\n');
				expect(writeTextFile).not.toHaveBeenCalled();
				expect(debug).toHaveBeenCalledWith('AUTO-ORGANIZE', 'Skipped properties for /vault/Project.md: type definition');
			});

			it('does not write lossy frontmatter', async () => {
				await saveAndRun(stamp, NOTE, '---\n# keep me\nstatus: done\n---\n');
				expect(writeTextFile).not.toHaveBeenCalled();
				expect(debug).toHaveBeenCalledWith('AUTO-ORGANIZE', 'Skipped properties for /vault/notes/note.md: frontmatter is comments');
			});

			it('does not write an empty --- block', async () => {
				await saveAndRun(stamp, NOTE, '---\n---\nbody');
				expect(writeTextFile).not.toHaveBeenCalled();
				expect(debug).toHaveBeenCalledWith('AUTO-ORGANIZE', 'Skipped properties for /vault/notes/note.md: frontmatter block is unreadable');
			});

			it('still writes a sibling note outside the gated folders', async () => {
				settingsStore.updateTemplates({ folder: 'Templates' });
				await saveAndRun(stamp, '/vault/Templates-old/note.md', '---\nstatus: done\n---\n');
				expect(lastWrite('/vault/Templates-old/note.md')).toContain('x: 1');
			});
		});
	});

	describe('toggleAutoOrganizeHook', () => {
		it('registers hook when enabled and not already registered', () => {
			const unsubscribe = vi.fn();
			vi.mocked(addAfterSaveObserver).mockReturnValue(unsubscribe);

			const result = toggleAutoOrganizeHook(true);

			expect(addAfterSaveObserver).toHaveBeenCalledTimes(1);
			expect(result).toBe(unsubscribe);
		});

		it('does not double-register when called twice with enabled=true', () => {
			vi.mocked(addAfterSaveObserver).mockReturnValue(vi.fn());

			toggleAutoOrganizeHook(true);
			toggleAutoOrganizeHook(true);

			expect(addAfterSaveObserver).toHaveBeenCalledTimes(1);
		});

		it('unregisters hook when disabled', () => {
			const unsubscribe = vi.fn();
			vi.mocked(addAfterSaveObserver).mockReturnValue(unsubscribe);

			toggleAutoOrganizeHook(true);
			toggleAutoOrganizeHook(false);

			expect(unsubscribe).toHaveBeenCalledTimes(1);
		});

		it('does nothing when disabling an already-disabled hook', () => {
			// Ensure clean state (resetAutoOrganize clears currentUnsubscribe)
			resetAutoOrganize();

			const result = toggleAutoOrganizeHook(false);

			expect(result).toBeNull();
			expect(addAfterSaveObserver).not.toHaveBeenCalled();
		});
	});

	describe('resetAutoOrganize', () => {
		it('clears store state', () => {
			autoOrganizeStore.setConfig({
				rules: [{ id: 'r1', name: 'Test', expression: 'true', destination: 'Archive', enabled: true }],
				excludedFolders: ['_system'],
			});

			resetAutoOrganize();

			expect(autoOrganizeStore.rules).toEqual([]);
			expect(autoOrganizeStore.excludedFolders).toEqual([]);
			expect(autoOrganizeStore.isConfigLoaded).toBe(false);
		});
	});
});
