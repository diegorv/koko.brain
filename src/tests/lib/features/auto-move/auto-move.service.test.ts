import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('$lib/core/editor/editor.hooks', () => ({
	addAfterSaveObserver: vi.fn(() => vi.fn()),
}));

vi.mock('$lib/core/filesystem/fs.service', () => ({
	moveItem: vi.fn(() => Promise.resolve('/vault/Archive/note.md')),
}));

vi.mock('$lib/features/file-icons/file-icons.service', () => ({
	setIconForPath: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
}));

import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { addAfterSaveObserver } from '$lib/core/editor/editor.hooks';
import { moveItem } from '$lib/core/filesystem/fs.service';
import { setIconForPath } from '$lib/features/file-icons/file-icons.service';
import { autoMoveStore } from '$lib/features/auto-move/auto-move.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import {
	loadAutoMoveConfig,
	saveAutoMoveConfig,
	registerAutoMoveHook,
	toggleAutoMoveHook,
	resetAutoMove,
} from '$lib/features/auto-move/auto-move.service';

describe('auto-move.service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetAutoMove();
		settingsStore.updateAutoMove({ enabled: true, debounceMs: 50 });
	});

	describe('loadAutoMoveConfig', () => {
		it('loads config from disk into store', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({
				rules: [
					{ id: 'r1', name: 'Test', expression: "file.hasTag('test')", destination: 'Archive', enabled: true },
				],
				excludedFolders: ['_templates'],
			}));

			await loadAutoMoveConfig('/vault');

			expect(autoMoveStore.rules).toHaveLength(1);
			expect(autoMoveStore.rules[0].id).toBe('r1');
			expect(autoMoveStore.excludedFolders).toEqual(['_templates']);
			expect(autoMoveStore.isConfigLoaded).toBe(true);
		});

		it('initializes with empty defaults when file does not exist', async () => {
			vi.mocked(exists).mockResolvedValue(false);

			await loadAutoMoveConfig('/vault');

			expect(autoMoveStore.rules).toEqual([]);
			expect(autoMoveStore.excludedFolders).toEqual([]);
			expect(autoMoveStore.isConfigLoaded).toBe(true);
		});

		it('initializes with empty defaults when file is empty', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue('   ');

			await loadAutoMoveConfig('/vault');

			expect(autoMoveStore.rules).toEqual([]);
			expect(autoMoveStore.isConfigLoaded).toBe(true);
		});

		it('handles corrupt JSON gracefully', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue('not valid json{{{');

			await loadAutoMoveConfig('/vault');

			expect(autoMoveStore.rules).toEqual([]);
			expect(autoMoveStore.isConfigLoaded).toBe(true);
		});

		it('handles missing rules field gracefully', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ excludedFolders: ['_system'] }));

			await loadAutoMoveConfig('/vault');

			expect(autoMoveStore.rules).toEqual([]);
			expect(autoMoveStore.excludedFolders).toEqual(['_system']);
		});
	});

	describe('saveAutoMoveConfig', () => {
		it('saves current store state to disk', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(writeTextFile).mockResolvedValue(undefined as never);

			autoMoveStore.setConfig({
				rules: [{ id: 'r1', name: 'Test', expression: 'true', destination: 'Archive', enabled: true }],
				excludedFolders: ['_system'],
			});

			await saveAutoMoveConfig('/vault');

			expect(writeTextFile).toHaveBeenCalledTimes(1);
			const [path, content] = vi.mocked(writeTextFile).mock.calls[0];
			expect(path).toBe('/vault/.kokobrain/auto-move-rules.json');
			const parsed = JSON.parse(content as string);
			expect(parsed.rules).toHaveLength(1);
			expect(parsed.excludedFolders).toEqual(['_system']);
		});

		it('creates .kokobrain directory if it does not exist', async () => {
			vi.mocked(exists).mockResolvedValue(false);
			vi.mocked(mkdir).mockResolvedValue(undefined as never);
			vi.mocked(writeTextFile).mockResolvedValue(undefined as never);

			await saveAutoMoveConfig('/vault');

			expect(mkdir).toHaveBeenCalledWith('/vault/.kokobrain');
		});

		it('throws on write failure', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(writeTextFile).mockRejectedValue(new Error('Permission denied'));

			await expect(saveAutoMoveConfig('/vault')).rejects.toThrow('Permission denied');
		});
	});

	describe('registerAutoMoveHook', () => {
		it('registers an after-save observer and returns unsubscribe', () => {
			const unsubscribe = vi.fn();
			vi.mocked(addAfterSaveObserver).mockReturnValue(unsubscribe);

			const result = registerAutoMoveHook();

			expect(addAfterSaveObserver).toHaveBeenCalledTimes(1);
			expect(result).toBe(unsubscribe);
		});

		it('observer skips when auto-move is disabled', () => {
			settingsStore.updateAutoMove({ enabled: false });
			let capturedObserver: ((path: string, content: string) => void) | null = null;
			vi.mocked(addAfterSaveObserver).mockImplementation((observer) => {
				capturedObserver = observer;
				return vi.fn();
			});

			registerAutoMoveHook();
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

			registerAutoMoveHook();
			capturedObserver!('/vault/note.md', 'content');

			expect(moveItem).not.toHaveBeenCalled();
		});

		it('observer calls moveItem after debounce when rule matches', async () => {
			vi.useFakeTimers();

			// Set vault path
			vaultStore.open('/vault');

			// Add a rule that matches any file with tag 'archive'
			autoMoveStore.setConfig({
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

			registerAutoMoveHook();

			// Simulate saving a file with 'archive' tag in frontmatter
			const content = '---\ntags:\n  - archive\n---\n# My Note';
			capturedObserver!('/vault/notes/note.md', content);

			// moveItem should not be called yet (debounce)
			expect(moveItem).not.toHaveBeenCalled();

			// Advance past debounce
			await vi.advanceTimersByTimeAsync(100);

			expect(moveItem).toHaveBeenCalledWith('/vault/notes/note.md', '/vault/Archive');

			vi.useRealTimers();
			vaultStore.close();
		});

		it('observer skips files in excluded folders', async () => {
			vi.useFakeTimers();

			vaultStore.open('/vault');
			autoMoveStore.setConfig({
				rules: [{ id: 'r1', name: 'Test', expression: 'true', destination: 'Archive', enabled: true }],
				excludedFolders: ['_templates'],
			});

			let capturedObserver: ((path: string, content: string) => void) | null = null;
			vi.mocked(addAfterSaveObserver).mockImplementation((observer) => {
				capturedObserver = observer;
				return vi.fn();
			});

			registerAutoMoveHook();
			capturedObserver!('/vault/_templates/note.md', 'content');

			await vi.advanceTimersByTimeAsync(100);

			expect(moveItem).not.toHaveBeenCalled();

			vi.useRealTimers();
			vaultStore.close();
		});

		it('observer skips move but applies icon when file is already in destination', async () => {
			vi.useFakeTimers();

			vaultStore.open('/vault');
			autoMoveStore.setConfig({
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

			registerAutoMoveHook();
			capturedObserver!('/vault/Archive/note.md', '---\ntags:\n  - archive\n---\n');

			await vi.advanceTimersByTimeAsync(100);

			expect(moveItem).not.toHaveBeenCalled();
			expect(setIconForPath).toHaveBeenCalledWith(
				'/vault', '/vault/Archive/note.md', 'lucide', 'archive', '#ff0000', '#00ff00',
			);

			vi.useRealTimers();
			vaultStore.close();
		});

		it('observer skips move and icon when file is already in destination and rule has no icon', async () => {
			vi.useFakeTimers();

			vaultStore.open('/vault');
			autoMoveStore.setConfig({
				rules: [{ id: 'r1', name: 'Archive', expression: "file.hasTag('archive')", destination: 'Archive', enabled: true }],
				excludedFolders: [],
			});

			let capturedObserver: ((path: string, content: string) => void) | null = null;
			vi.mocked(addAfterSaveObserver).mockImplementation((observer) => {
				capturedObserver = observer;
				return vi.fn();
			});

			registerAutoMoveHook();
			capturedObserver!('/vault/Archive/note.md', '---\ntags:\n  - archive\n---\n');

			await vi.advanceTimersByTimeAsync(100);

			expect(moveItem).not.toHaveBeenCalled();
			expect(setIconForPath).not.toHaveBeenCalled();

			vi.useRealTimers();
			vaultStore.close();
		});
	});

	describe('toggleAutoMoveHook', () => {
		it('registers hook when enabled and not already registered', () => {
			const unsubscribe = vi.fn();
			vi.mocked(addAfterSaveObserver).mockReturnValue(unsubscribe);

			const result = toggleAutoMoveHook(true);

			expect(addAfterSaveObserver).toHaveBeenCalledTimes(1);
			expect(result).toBe(unsubscribe);
		});

		it('does not double-register when called twice with enabled=true', () => {
			vi.mocked(addAfterSaveObserver).mockReturnValue(vi.fn());

			toggleAutoMoveHook(true);
			toggleAutoMoveHook(true);

			expect(addAfterSaveObserver).toHaveBeenCalledTimes(1);
		});

		it('unregisters hook when disabled', () => {
			const unsubscribe = vi.fn();
			vi.mocked(addAfterSaveObserver).mockReturnValue(unsubscribe);

			toggleAutoMoveHook(true);
			toggleAutoMoveHook(false);

			expect(unsubscribe).toHaveBeenCalledTimes(1);
		});

		it('does nothing when disabling an already-disabled hook', () => {
			// Ensure clean state (resetAutoMove clears currentUnsubscribe)
			resetAutoMove();

			const result = toggleAutoMoveHook(false);

			expect(result).toBeNull();
			expect(addAfterSaveObserver).not.toHaveBeenCalled();
		});
	});

	describe('resetAutoMove', () => {
		it('clears store state', () => {
			autoMoveStore.setConfig({
				rules: [{ id: 'r1', name: 'Test', expression: 'true', destination: 'Archive', enabled: true }],
				excludedFolders: ['_system'],
			});

			resetAutoMove();

			expect(autoMoveStore.rules).toEqual([]);
			expect(autoMoveStore.excludedFolders).toEqual([]);
			expect(autoMoveStore.isConfigLoaded).toBe(false);
		});
	});
});
