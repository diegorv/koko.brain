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
	createFile: vi.fn(),
	renameItem: vi.fn(),
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
import { createFile, moveItem, renameItem } from '#lib/core/filesystem/fs.service.js';
import { setIconForPath } from '#lib/features/file-icons/file-icons.service.js';
import { debug, error } from '#lib/utils/debug.js';
import { autoOrganizeStore } from '#lib/features/auto-organize/auto-organize.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import type { AutoOrganizeRule, RuleProperty } from '#lib/features/auto-organize/auto-organize.types.js';
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

		it('keeps an expr entry, drops one with both value and expr or neither, and drops a blank expr', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({
				rules: [{
					id: 'r1',
					name: 'Stamp',
					expression: 'true',
					destination: '',
					enabled: true,
					properties: [
						{ key: 'title', expr: 'file.basename', mode: 'always' },
						{ key: 'both', value: 'x', expr: 'file.basename', mode: 'always' },
						{ key: 'neither', mode: 'if-missing' },
						{ key: 'blank', expr: '  ', mode: 'if-missing' },
						{ key: 'number', expr: 3, mode: 'if-missing' },
						{ key: '_archived', expr: 'true', mode: 'add' },
						{ key: 'gone', expr: 'file.basename', mode: 'remove' },
					],
				}],
				excludedFolders: [],
			}));

			await loadAutoOrganizeConfig('/vault');

			expect(autoOrganizeStore.rules[0].properties).toEqual([
				{ key: 'title', expr: 'file.basename', mode: 'always' },
				{ key: 'gone', mode: 'remove' },
			]);
			expect(error).not.toHaveBeenCalled();
		});

		it('drops an always or add expr that reads now(), file.mtime, file.ctime or file.size, and logs it', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({
				rules: [{
					id: 'r1',
					name: 'Stamp',
					expression: 'true',
					destination: '',
					enabled: true,
					properties: [
						{ key: 'updated', expr: 'now()', mode: 'always' },
						{ key: 'seen', expr: 'file.mtime.format("YYYY")', mode: 'add' },
						{ key: 'born', expr: 'file.ctime', mode: 'always' },
						{ key: 'bytes', expr: 'file.size * 2', mode: 'always' },
						{ key: 'created', expr: 'file.ctime', mode: 'if-missing' },
						{ key: 'stamped', expr: 'now()', mode: 'if-missing' },
					],
				}],
				excludedFolders: [],
			}));

			await loadAutoOrganizeConfig('/vault');

			expect(autoOrganizeStore.rules[0].properties).toEqual([
				{ key: 'created', expr: 'file.ctime', mode: 'if-missing' },
				{ key: 'stamped', expr: 'now()', mode: 'if-missing' },
			]);
			expect(error).toHaveBeenCalledTimes(4);
			expect(error).toHaveBeenCalledWith(
				'AUTO-ORGANIZE',
				'Rule "Stamp" ignores updated: now() changes on every save, so it works only with "if missing"',
			);
			expect(error).toHaveBeenCalledWith(
				'AUTO-ORGANIZE',
				'Rule "Stamp" ignores seen: file.mtime changes on every save, so it works only with "if missing"',
			);
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

		describe('computed values', () => {
			beforeEach(() => {
				// No DST change in the week after, so "7d" is seven calendar days.
				vi.setSystemTime(new Date(2026, 5, 10, 15, 4, 5));
			});

			afterEach(() => {
				collectionStore.reset();
			});

			/** One rule with one computed property. */
			function computed(key: string, expr: string, mode: RuleProperty['mode'] = 'if-missing'): AutoOrganizeRule[] {
				return [rule('r1', [{ key, expr, mode }])];
			}

			it('writes the note\'s base name from file.basename', async () => {
				await saveAndRun(computed('title', 'file.basename'), NOTE, '---\nstatus: open\n---\nbody');
				expect(parseFrontmatterProperties(lastWrite(NOTE)!)).toEqual([
					{ key: 'status', value: 'open', type: 'text' },
					{ key: 'title', value: 'note', type: 'text' },
				]);
			});

			it('writes today() + "7d" as the local date seven days ahead', async () => {
				await saveAndRun(computed('due', 'today() + "7d"'), NOTE, '# body\n');
				const written = lastWrite(NOTE)!;
				expect(written).toContain('due: 2026-06-17\n');
				expect(parseFrontmatterProperties(written)).toEqual([{ key: 'due', value: '2026-06-17', type: 'date' }]);
			});

			it('writes an expression with now() as the local date and time', async () => {
				await saveAndRun(computed('stamped', 'now()'), NOTE, '# body\n');
				expect(parseFrontmatterProperties(lastWrite(NOTE)!)).toEqual([
					{ key: 'stamped', value: '2026-06-10T15:04:05', type: 'date' },
				]);
			});

			it('writes the note\'s folder name with split, slice and join', async () => {
				const path = '/vault/projects/Alpha/note.md';
				await saveAndRun(computed('area', 'file.folder.split("/").slice(-1).join("")'), path, '# body\n');
				expect(parseFrontmatterProperties(lastWrite(path)!)).toEqual([{ key: 'area', value: 'Alpha', type: 'text' }]);
			});

			it.each([
				['throws', 'file.folder.split("/").last()'],
				['returns null', 'missing_key'],
				['returns NaN, as + on text does', '"Note " + file.basename'],
				['returns an invalid date', 'date("junk")'],
			])('writes nothing for an expression that %s, and logs it once per rule', async (_case, expr) => {
				const rules = computed('title', expr);
				await saveAndRun(rules, NOTE, '---\nstatus: open\n---\nbody');
				await saveAndRun(rules, NOTE, '---\nstatus: open\n---\nbody');

				expect(writeTextFile).not.toHaveBeenCalled();
				expect(error).toHaveBeenCalledTimes(1);
				expect(vi.mocked(error).mock.calls[0][1]).toMatch(`Rule "Rule r1" could not compute title on ${NOTE}: `);
			});

			it('writes a boolean result on _archived, and nothing for a text result', async () => {
				const content = '---\nstatus: done\n---\nbody';
				await saveAndRun(computed('_archived', 'status == "done"'), NOTE, content);
				expect(parseFrontmatterProperties(lastWrite(NOTE)!)).toEqual([
					{ key: 'status', value: 'done', type: 'text' },
					{ key: '_archived', value: true, type: 'boolean' },
				]);

				vi.mocked(writeTextFile).mockClear();
				await saveAndRun(computed('_archived', 'status'), NOTE, content);
				expect(writeTextFile).not.toHaveBeenCalled();
				expect(error).toHaveBeenCalledTimes(1);
			});

			it('adds the items of a text list result', async () => {
				await saveAndRun(computed('tags', 'file.folder.split("/").slice(-1)', 'add'), NOTE, '---\ntags: [a]\n---\nbody');
				expect(parseFrontmatterProperties(lastWrite(NOTE)!)).toEqual([
					{ key: 'tags', value: ['a', 'notes'], type: 'list' },
				]);
			});

			it('writes nothing for an add whose result is a number', async () => {
				await saveAndRun(computed('tags', '1 + 1', 'add'), NOTE, '---\ntags: [a]\n---\nbody');
				expect(writeTextFile).not.toHaveBeenCalled();
				expect(error).toHaveBeenCalledTimes(1);
			});

			it('a failing expression still owns its key, so a lower rule does not write it', async () => {
				await saveAndRun(
					[rule('r1', [{ key: 'title', expr: 'missing_key', mode: 'always' }]), rule('r2', [{ key: 'title', value: 'x', mode: 'always' }])],
					NOTE,
					'# body\n',
				);
				expect(writeTextFile).not.toHaveBeenCalled();
			});

			describe('file stats', () => {
				const CONTENT = '---\nstatus: open\n---\nbody';

				it('reads file.size and file.mtime from the note\'s index record', async () => {
					collectionStore.setPropertyIndex(new Map([[NOTE, buildNoteRecord(NOTE, CONTENT, 1_700_000_000_000, 1_600_000_000_000, 512)]]));
					await saveAndRun(
						[rule('r1', [{ key: 'stamp', expr: 'number(file.mtime)', mode: 'if-missing' }], { expression: 'file.size == 512' })],
						NOTE,
						CONTENT,
					);
					expect(parseFrontmatterProperties(lastWrite(NOTE)!)).toContainEqual({ key: 'stamp', value: 1_700_000_000_000, type: 'number' });
				});

				it.each([
					['has no index record', null],
					['has an index record with zero stats', 0],
				])('uses the save time and the content length when the note %s', async (_case, stats) => {
					if (stats !== null) collectionStore.setPropertyIndex(new Map([[NOTE, buildNoteRecord(NOTE, CONTENT, stats, stats, stats)]]));
					const saved = Date.now();
					await saveAndRun(
						[rule('r1', [{ key: 'stamp', expr: 'number(file.ctime)', mode: 'if-missing' }], { expression: `file.size == ${CONTENT.length}` })],
						NOTE,
						CONTENT,
					);
					const stamp = parseFrontmatterProperties(lastWrite(NOTE)!).find((p) => p.key === 'stamp')?.value as number;
					expect(stamp).toBeGreaterThanOrEqual(saved);
					expect(stamp).toBeLessThanOrEqual(Date.now());
				});
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

		describe('create note', () => {
			const SOURCE = '/vault/notes/note.md';
			const TARGET = '/vault/notes/note follow-up.md';
			const FOLLOW_UP = '{folder}/{basename} follow-up.md';
			const SOURCE_CONTENT = '---\nstatus: open\n---\nbody';
			/** Files on the in-memory disk, by absolute path */
			let disk: Map<string, string>;
			/** Folders on the in-memory disk */
			let folders: Set<string>;
			const originalTemplates = { ...settingsStore.templates };

			beforeEach(() => {
				disk = new Map();
				folders = new Set(['/vault', '/vault/notes', '/vault/_system/templates']);
				vi.mocked(exists).mockImplementation(async (p) => disk.has(String(p)) || folders.has(String(p)));
				vi.mocked(readTextFile).mockImplementation(async (p) => {
					const content = disk.get(String(p));
					if (content === undefined) throw new Error(`not found: ${p}`);
					return content;
				});
				vi.mocked(mkdir).mockImplementation(async (p) => {
					folders.add(String(p));
				});
				vi.mocked(createFile).mockImplementation(async (parent, name, content = '') => {
					const path = `${parent}/${name}`;
					disk.set(path, content);
					return path;
				});
			});

			afterEach(() => {
				settingsStore.updateTemplates(originalTemplates);
				editorStore.reset();
			});

			/** A rule matching an open note, whose only consequence is `createNote`. */
			function creator(id: string, createNote: AutoOrganizeRule['createNote'], overrides: Partial<AutoOrganizeRule> = {}): AutoOrganizeRule {
				return rule(id, undefined, { expression: "status == 'open'", createNote, ...overrides });
			}

			/** Saves `path` with `content` on the in-memory disk and runs past the debounce. */
			async function run(rules: AutoOrganizeRule[], path = SOURCE, content = SOURCE_CONTENT, excludedFolders: string[] = []): Promise<void> {
				autoOrganizeStore.setConfig({ rules, excludedFolders });
				disk.set(path, content);
				captureObserver()(path, content);
				await vi.advanceTimersByTimeAsync(100);
			}

			it('creates the note at the resolved path with the template and properties, and changes nothing at the next save', async () => {
				disk.set('/vault/_system/templates/Follow-up.md', '---\ntype: follow-up\n---\n# <% tp.file.title %>\n');
				const rules = [creator('c1', {
					path: FOLLOW_UP,
					template: '_system/templates/Follow-up.md',
					properties: [
						{ key: 'source', expr: '["[[", file.basename, "]]"].join("")', mode: 'if-missing' },
						{ key: 'status', value: 'todo', mode: 'always' },
					],
				})];

				await run(rules);

				expect(createFile).toHaveBeenCalledTimes(1);
				expect(vi.mocked(createFile).mock.calls[0].slice(0, 2)).toEqual(['/vault/notes', 'note follow-up.md']);
				const created = disk.get(TARGET)!;
				expect(parseFrontmatterProperties(created)).toEqual([
					{ key: '_type', value: 'follow-up', type: 'text' },
					{ key: 'source', value: '[[note]]', type: 'text' },
					{ key: 'status', value: 'todo', type: 'text' },
				]);
				expect(created.endsWith('\n# note follow-up\n')).toBe(true);
				expect(writeTextFile).not.toHaveBeenCalled();

				await run(rules);

				expect(createFile).toHaveBeenCalledTimes(1);
				expect(disk.get(TARGET)).toBe(created);
				expect(writeTextFile).not.toHaveBeenCalled();
			});

			it('creates an empty note without a template or properties', async () => {
				await run([creator('c1', { path: FOLLOW_UP })]);

				expect(createFile).toHaveBeenCalledWith('/vault/notes', 'note follow-up.md', '');
			});

			it('leaves an existing target untouched', async () => {
				disk.set(TARGET, 'mine');

				await run([creator('c1', { path: FOLLOW_UP, properties: [{ key: 'status', value: 'todo', mode: 'always' }] })]);

				expect(createFile).not.toHaveBeenCalled();
				expect(writeTextFile).not.toHaveBeenCalled();
				expect(disk.get(TARGET)).toBe('mine');
			});

			it('creates a missing target folder', async () => {
				await run([creator('c1', { path: 'Follow-ups/{basename}.md' })]);

				expect(mkdir).toHaveBeenCalledWith('/vault/Follow-ups', { recursive: true });
				expect(createFile).toHaveBeenCalledWith('/vault/Follow-ups', 'note.md', '');
			});

			it('resolves the path against the note at its new folder after a move', async () => {
				vi.mocked(moveItem).mockResolvedValue('/vault/Archive/note.md');

				await run([creator('c1', { path: FOLLOW_UP }, { destination: 'Archive' })]);

				expect(moveItem).toHaveBeenCalledTimes(1);
				expect(createFile).toHaveBeenCalledWith('/vault/Archive', 'note follow-up.md', '');
			});

			it('creates nothing when the move fails', async () => {
				vi.mocked(moveItem).mockRejectedValueOnce(new Error('disk full'));

				await run([creator('c1', { path: FOLLOW_UP }, { destination: 'Archive' })]);

				expect(createFile).not.toHaveBeenCalled();
			});

			it('opens the note in a background tab with open: true, and not by default', async () => {
				editorStore.addTab({ path: SOURCE, name: 'note.md', content: SOURCE_CONTENT, savedContent: SOURCE_CONTENT });

				await run([creator('c1', { path: FOLLOW_UP })]);
				expect(editorStore.tabs.map((t) => t.path)).toEqual([SOURCE]);

				disk.delete(TARGET);
				await run([creator('c1', { path: FOLLOW_UP, open: true })]);
				expect(editorStore.tabs.map((t) => t.path)).toEqual([SOURCE, TARGET]);
				expect(editorStore.activeTabPath).toBe(SOURCE);
				expect(editorStore.tabs[1].content).toBe(disk.get(TARGET));
			});

			it('creates at most 5 notes in one run and logs the rest once', async () => {
				const rules = [1, 2, 3, 4, 5, 6].map((i) => creator(`c${i}`, { path: `{folder}/{basename} ${i}.md` }));

				await run(rules);

				expect(createFile).toHaveBeenCalledTimes(5);
				expect(disk.has('/vault/notes/note 6.md')).toBe(false);
				expect(error).toHaveBeenCalledTimes(1);
				expect(error).toHaveBeenCalledWith('AUTO-ORGANIZE', `Rule "Rule c6" did not create a note for ${SOURCE}: a run creates at most 5 notes`);
			});

			describe('gates', () => {
				it.each([
					['the system folder', '_system/{basename}.md', [] as string[], '_system/note.md: inside _system/'],
					['the templates folder', 'Templates/{basename}.md', [], 'Templates/note.md: inside Templates/'],
					['an excluded folder', 'Archive/{basename}.md', ['Archive'], 'Archive/note.md: inside an excluded folder'],
				])('never creates inside %s', async (_label, path, excluded, reason) => {
					settingsStore.updateTemplates({ folder: 'Templates' });

					await run([creator('c1', { path })], SOURCE, SOURCE_CONTENT, excluded);

					expect(createFile).not.toHaveBeenCalled();
					expect(mkdir).not.toHaveBeenCalled();
					expect(debug).toHaveBeenCalledWith('AUTO-ORGANIZE', `Rule "Rule c1" did not create ${reason}`);
				});

				it('refuses a target a frontmatter variable takes out of the vault, before any folder is created', async () => {
					await run([creator('c1', { path: '{status}/x.md' }, { expression: 'true' })], SOURCE, '---\nstatus: ../..\n---\nbody');

					expect(createFile).not.toHaveBeenCalled();
					expect(mkdir).not.toHaveBeenCalled();
					expect(debug).toHaveBeenCalledWith('AUTO-ORGANIZE', 'Rule "Rule c1" did not create ../../x.md: leaves the vault');
				});

				it('keeps a configured path or template a run refuses as stored on load, and creates nothing from it', async () => {
					vi.mocked(exists).mockResolvedValue(true);
					vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({
						rules: [
							{ id: 'r1', name: 'Abs', expression: 'true', destination: '', enabled: true, createNote: { path: '/etc/x.md' } },
							{ id: 'r2', name: 'Txt', expression: 'true', destination: '', enabled: true, createNote: { path: 'x.txt' } },
							{
								id: 'r3', name: 'Ok', expression: 'true', destination: '', enabled: true,
								createNote: { path: 'x.md', properties: [{ key: 'status', mode: 'remove' }, { key: 'todoist_project', value: 'W', mode: 'always' }, { key: 'a', value: 1, mode: 'always' }] },
							},
							{ id: 'r4', name: 'Out', expression: 'true', destination: '', enabled: true, createNote: { path: 'y.md', template: '../t.md', open: true } },
							{ id: 'r5', name: 'Junk', expression: 'true', destination: '', enabled: true, createNote: 'x.md' },
						],
						excludedFolders: [],
					}));

					await loadAutoOrganizeConfig('/vault');

					expect(autoOrganizeStore.rules.map((r) => r.createNote)).toEqual([
						{ path: '/etc/x.md' },
						{ path: 'x.txt' },
						{ path: 'x.md', properties: [{ key: 'a', value: 1, mode: 'always' }] },
						{ path: 'y.md', template: '../t.md', open: true },
						undefined,
					]);
					expect(autoOrganizeStore.rules.map((r) => 'createNote' in r)).toEqual([true, true, true, true, false]);

					const refused = autoOrganizeStore.rules.filter((r) => r.id !== 'r3');
					await run(refused);
					expect(createFile).not.toHaveBeenCalled();
				});

				it('creates nothing for a source the property gates skip', async () => {
					await run([creator('c1', { path: 'Follow-ups/{basename}.md' })], '/vault/_system/lists/note.md');

					expect(createFile).not.toHaveBeenCalled();
					expect(debug).toHaveBeenCalledWith('AUTO-ORGANIZE', 'Skipped creating notes for /vault/_system/lists/note.md: inside _system/');
				});
			});

			it('creates one note when two sources that resolve to it run together', async () => {
				folders.add('/vault/m');
				vi.mocked(createFile).mockImplementation(async (parent, name, content = '') => {
					await new Promise((resolve) => setTimeout(resolve, 20));
					disk.set(`${parent}/${name}`, content);
					return `${parent}/${name}`;
				});
				autoOrganizeStore.setConfig({ rules: [creator('c1', { path: '{folder}/Index.md' })], excludedFolders: [] });
				disk.set('/vault/m/A.md', SOURCE_CONTENT);
				disk.set('/vault/m/B.md', SOURCE_CONTENT);
				const observer = captureObserver();

				observer('/vault/m/A.md', SOURCE_CONTENT);
				observer('/vault/m/B.md', SOURCE_CONTENT);
				await vi.advanceTimersByTimeAsync(200);

				expect(createFile).toHaveBeenCalledTimes(1);
				expect(disk.has('/vault/m/Index.md')).toBe(true);
			});

			it('creates nothing when the new note would match the rule itself, and logs it once', async () => {
				const rules = [creator('c1', { path: FOLLOW_UP }, { expression: "file.inFolder('notes')" })];

				await run(rules);
				await run(rules);

				expect(createFile).not.toHaveBeenCalled();
				expect(error).toHaveBeenCalledTimes(1);
				expect(error).toHaveBeenCalledWith('AUTO-ORGANIZE', `Rule "Rule c1" did not create ${TARGET}: the new note would match the rule itself`);
			});

			it('creates nothing when the template makes the new note match the rule', async () => {
				disk.set('/vault/_system/templates/Meeting.md', '---\ntype: meeting\n---\n');

				await run(
					[creator('c1', { path: 'Follow-ups/{basename}.md', template: '_system/templates/Meeting.md' }, { expression: "type == 'meeting'" })],
					SOURCE,
					'---\ntype: meeting\n---\nbody',
				);

				expect(createFile).not.toHaveBeenCalled();
				expect(mkdir).not.toHaveBeenCalled();
				expect(error).toHaveBeenCalledWith(
					'AUTO-ORGANIZE',
					'Rule "Rule c1" did not create /vault/Follow-ups/note.md: the new note would match the rule itself',
				);
			});

			it('creates nothing when the template is missing, and logs it once', async () => {
				const rules = [creator('c1', { path: FOLLOW_UP, template: '_system/templates/Nope.md' })];

				await run(rules);
				await run(rules);

				expect(createFile).not.toHaveBeenCalled();
				expect(error).toHaveBeenCalledTimes(1);
				expect(error).toHaveBeenCalledWith(
					'AUTO-ORGANIZE',
					`Rule "Rule c1" did not create ${TARGET}: template _system/templates/Nope.md not found`,
				);
			});

			it('logs a failed create once per rule', async () => {
				const failure = new Error('disk full');
				vi.mocked(createFile).mockRejectedValue(failure);
				const rules = [creator('c1', { path: FOLLOW_UP })];

				await run(rules);
				await run(rules);

				expect(error).toHaveBeenCalledTimes(1);
				expect(error).toHaveBeenCalledWith('AUTO-ORGANIZE', `Rule "Rule c1" failed to create ${TARGET}:`, failure);
			});

			it('every matching rule creates its note, after the properties are written', async () => {
				const rules = [
					rule('p1', [{ key: 'seen', value: true, mode: 'if-missing' }]),
					creator('c1', { path: '{folder}/{basename} a.md' }),
					creator('c2', { path: '{folder}/{basename} b.md' }),
				];

				await run(rules);

				expect(createFile).toHaveBeenCalledTimes(2);
				expect(lastWrite(SOURCE)).toContain('seen: true');
			});
		});

		describe('rename', () => {
			const SOURCE = '/vault/notes/old.md';
			const MEETING = '---\ntype: meeting\n---\nbody';
			const MONTHLY = { name: '{year}-{month} Meeting' };
			/** Files on the in-memory disk, by absolute path */
			let disk: Map<string, string>;
			const originalTemplates = { ...settingsStore.templates };

			/** Moves `from` to `to` on the in-memory disk. */
			function moveOnDisk(from: string, to: string): string {
				disk.set(to, disk.get(from)!);
				disk.delete(from);
				return to;
			}

			beforeEach(() => {
				vi.setSystemTime(new Date(2026, 10, 10, 9, 5));
				disk = new Map();
				vi.mocked(exists).mockImplementation(async (p) => disk.has(String(p)));
				vi.mocked(readTextFile).mockImplementation(async (p) => {
					const content = disk.get(String(p));
					if (content === undefined) throw new Error(`not found: ${p}`);
					return content;
				});
				vi.mocked(writeTextFile).mockImplementation(async (p, content) => {
					disk.set(String(p), String(content));
				});
				vi.mocked(renameItem).mockImplementation(async (from, name) => moveOnDisk(from, `${from.slice(0, from.lastIndexOf('/'))}/${name}`));
				vi.mocked(moveItem).mockImplementation(async (from, dir) => moveOnDisk(from, `${dir}/${from.slice(from.lastIndexOf('/') + 1)}`));
			});

			afterEach(() => {
				settingsStore.updateTemplates(originalTemplates);
				editorStore.reset();
			});

			/** A rule matching meeting notes, whose only consequence is `rename` unless given. */
			function renamer(id: string, rename: AutoOrganizeRule['rename'], overrides: Partial<AutoOrganizeRule> = {}): AutoOrganizeRule {
				return rule(id, undefined, { expression: "type == 'meeting'", rename, ...overrides });
			}

			/** Saves `path` with `content` on the in-memory disk and runs past the debounce. */
			async function run(rules: AutoOrganizeRule[], path = SOURCE, content = MEETING): Promise<void> {
				autoOrganizeStore.setConfig({ rules, excludedFolders: [] });
				disk.set(path, content);
				captureObserver()(path, content);
				await vi.advanceTimersByTimeAsync(100);
			}

			it('renames a matching note from a name template, and leaves it alone at the next save', async () => {
				const rules = [renamer('n1', MONTHLY)];

				await run(rules);

				expect(renameItem).toHaveBeenCalledWith(SOURCE, '2026-11 Meeting.md');
				expect(disk.get('/vault/notes/2026-11 Meeting.md')).toBe(MEETING);

				await run(rules, '/vault/notes/2026-11 Meeting.md');
				expect(renameItem).toHaveBeenCalledTimes(1);
			});

			it('takes the first free numbered name on a clash, and leaves that name alone later', async () => {
				disk.set('/vault/notes/2026-11 Meeting.md', 'other');
				disk.set('/vault/notes/2026-11 Meeting 2.md', 'other');
				const rules = [renamer('n1', MONTHLY)];

				await run(rules);

				expect(renameItem).toHaveBeenCalledWith(SOURCE, '2026-11 Meeting 3.md');

				await run(rules, '/vault/notes/2026-11 Meeting 3.md');
				expect(renameItem).toHaveBeenCalledTimes(1);
			});

			it('renames, moves and writes the properties at the final path in one run, reading the new name', async () => {
				const rules = [renamer('n1', { name: 'Weekly' }, {
					destination: 'Archive',
					properties: [
						{ key: 'status', value: 'done', mode: 'always' },
						{ key: 'title', expr: 'file.basename', mode: 'always' },
					],
				})];

				await run(rules);

				expect(renameItem).toHaveBeenCalledWith(SOURCE, 'Weekly.md');
				expect(moveItem).toHaveBeenCalledWith('/vault/notes/Weekly.md', '/vault/Archive');
				expect([...disk.keys()]).toEqual(['/vault/Archive/Weekly.md']);
				expect(parseFrontmatterProperties(disk.get('/vault/Archive/Weekly.md')!)).toEqual([
					{ key: '_type', value: 'meeting', type: 'text' },
					{ key: 'status', value: 'done', type: 'text' },
					{ key: 'title', value: 'Weekly', type: 'text' },
				]);
				expect(writeTextFile).toHaveBeenCalledTimes(1);
			});

			it('picks the free name in the destination folder when the rule also moves the note', async () => {
				disk.set('/vault/Archive/Weekly.md', 'other');

				await run([renamer('n1', { name: 'Weekly' }, { destination: 'Archive' })]);

				expect(renameItem).toHaveBeenCalledWith(SOURCE, 'Weekly 2.md');
				expect(disk.has('/vault/Archive/Weekly 2.md')).toBe(true);
				expect(disk.get('/vault/Archive/Weekly.md')).toBe('other');
			});

			it('renames a note that already has the name when that name is taken in the destination', async () => {
				disk.set('/vault/Archive/Weekly.md', 'other');

				await run([renamer('n1', { name: 'Weekly' }, { destination: 'Archive' })], '/vault/notes/Weekly.md');

				expect(renameItem).toHaveBeenCalledWith('/vault/notes/Weekly.md', 'Weekly 2.md');
				expect(moveItem).toHaveBeenCalledWith('/vault/notes/Weekly 2.md', '/vault/Archive');
			});

			it('picks a name free in the current folder too when the rule moves the note', async () => {
				disk.set('/vault/notes/Weekly.md', 'other');

				await run([renamer('n1', { name: 'Weekly' }, { destination: 'Archive' })]);

				expect(renameItem).toHaveBeenCalledWith(SOURCE, 'Weekly 2.md');
				expect(disk.has('/vault/Archive/Weekly 2.md')).toBe(true);
			});

			it('resolves the destination with the new name', async () => {
				await run([renamer('n1', { name: 'Weekly' }, { destination: 'Meetings/{basename}' })]);

				expect(moveItem).toHaveBeenCalledWith('/vault/notes/Weekly.md', '/vault/Meetings/Weekly');
			});

			it('keeps the note\'s own extension', async () => {
				await run([renamer('n1', { name: 'Weekly' })], '/vault/notes/old.markdown');

				expect(renameItem).toHaveBeenCalledWith('/vault/notes/old.markdown', 'Weekly.markdown');
			});

			it('renames from an expression', async () => {
				await run([renamer('n1', { expr: 'title' })], SOURCE, '---\ntype: meeting\ntitle: "Sync: 1/2"\n---\n');

				expect(renameItem).toHaveBeenCalledWith(SOURCE, 'Sync- 1-2.md');
			});

			it('renames nothing for an expression with no usable result, logs it once, and still runs the rest', async () => {
				const rules = [renamer('n1', { expr: 'tags' }, { properties: [{ key: 'seen', value: true, mode: 'if-missing' }] })];
				const content = '---\ntype: meeting\ntags: [a, b]\n---\n';

				await run(rules, SOURCE, content);
				await run(rules, SOURCE, content);

				expect(renameItem).not.toHaveBeenCalled();
				expect(disk.get(SOURCE)).toContain('seen: true');
				expect(error).toHaveBeenCalledTimes(1);
				expect(error).toHaveBeenCalledWith('AUTO-ORGANIZE', `Rule "Rule n1" could not compute a name for ${SOURCE}: the result is not text, a number or a date`);
			});

			it('renames nothing for a name that resolves empty', async () => {
				await run([renamer('n1', { name: '{status}' })]);

				expect(renameItem).not.toHaveBeenCalled();
				expect(error).not.toHaveBeenCalled();
			});

			it('only the first matching rule with a rename renames', async () => {
				await run([renamer('n1', { name: 'First' }), renamer('n2', { name: 'Second' })]);

				expect(renameItem).toHaveBeenCalledTimes(1);
				expect(renameItem).toHaveBeenCalledWith(SOURCE, 'First.md');
			});

			it('a failed rename skips the move and the properties', async () => {
				vi.mocked(renameItem).mockRejectedValueOnce(new Error('disk full'));

				await run([renamer('n1', { name: 'Weekly' }, { destination: 'Archive', properties: [{ key: 'seen', value: true, mode: 'if-missing' }] })]);

				expect(moveItem).not.toHaveBeenCalled();
				expect(writeTextFile).not.toHaveBeenCalled();
				expect(disk.get(SOURCE)).toBe(MEETING);
			});

			describe('open note with unsaved edits', () => {
				it('is not renamed in that run, while the move still happens', async () => {
					editorStore.addTab({ path: SOURCE, name: 'old.md', content: MEETING, savedContent: '---\ntype: meeting\n---\n' });

					await run([renamer('n1', { name: 'Weekly' }, { destination: 'Archive' })]);

					expect(renameItem).not.toHaveBeenCalled();
					expect(moveItem).toHaveBeenCalledWith(SOURCE, '/vault/Archive');
					expect(debug).toHaveBeenCalledWith('AUTO-ORGANIZE', `Skipped renaming ${SOURCE}: it has unsaved edits`);
				});

				it('is renamed at the next save with no pending edit', async () => {
					const rules = [renamer('n1', { name: 'Weekly' })];
					editorStore.addTab({ path: SOURCE, name: 'old.md', content: MEETING, savedContent: '---\ntype: meeting\n---\n' });

					await run(rules);
					expect(renameItem).not.toHaveBeenCalled();

					editorStore.markSavedByPath(SOURCE, MEETING);
					await run(rules);
					expect(renameItem).toHaveBeenCalledWith(SOURCE, 'Weekly.md');
				});
			});

			describe('gates', () => {
				it.each([
					['a file that is not Markdown', '/vault/notes/Board.canvas', '{}', 'not Markdown'],
					['a note in the system folder', '/vault/_system/lists/x.md', MEETING, 'inside _system/'],
					['a note in the templates folder', '/vault/Templates/x.md', MEETING, 'inside Templates/'],
					['a type definition', '/vault/types/Meeting.md', '---\n_type: Type\n---\n', 'type definition'],
					['a Todoist project note', SOURCE, '---\ntype: meeting\ntodoist_project: Work\n---\n', 'a Todoist project note'],
				])('never renames %s', async (_label, path, content, reason) => {
					settingsStore.updateTemplates({ folder: 'Templates' });

					await run([renamer('n1', { name: 'Weekly' }, { expression: 'true' })], path, content);

					expect(renameItem).not.toHaveBeenCalled();
					expect(debug).toHaveBeenCalledWith('AUTO-ORGANIZE', `Skipped renaming ${path}: ${reason}`);
				});
			});

			it('loads a valid rename trimmed, and keeps as stored and logs one a run refuses, which renames nothing', async () => {
				vi.mocked(exists).mockResolvedValue(true);
				vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({
					rules: [
						{ id: 'r1', name: 'Ok', expression: 'true', destination: '', enabled: true, rename: { name: ' Weekly ' } },
						{ id: 'r2', name: 'Grows', expression: 'true', destination: '', enabled: true, rename: { name: '{year} {basename}' } },
						{ id: 'r3', name: 'Both', expression: 'true', destination: '', enabled: true, rename: { name: 'a', expr: 'b' } },
					],
					excludedFolders: [],
				}));

				await loadAutoOrganizeConfig('/vault');

				expect(autoOrganizeStore.rules.map((r) => r.rename)).toEqual([{ name: 'Weekly' }, { name: '{year} {basename}' }, { name: 'a', expr: 'b' }]);
				expect(error).toHaveBeenCalledWith('AUTO-ORGANIZE', `Rule "Grows" ignores its rename: The name uses the note's own name, so it would change at every save`);
				expect(error).toHaveBeenCalledWith('AUTO-ORGANIZE', 'Rule "Both" ignores its rename: Set a name or an expression, not both');

				await run(autoOrganizeStore.rules.slice(1));
				expect(renameItem).not.toHaveBeenCalled();
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
