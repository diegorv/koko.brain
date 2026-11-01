// The Files navigator's saved pick and expanded folders follow folder renames
// and deletes made through the real fs.service and path-change owner; only the
// Tauri boundary is mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	remove: vi.fn(),
	rename: vi.fn(),
	exists: vi.fn(),
	copyFile: vi.fn(),
	readDir: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-opener', () => ({ revealItemInDir: vi.fn() }));
vi.mock('#lib/core/trash/trash.service.js', () => ({ moveToTrash: vi.fn() }));
vi.mock('#lib/core/editor/editor.service.js', () => ({ closeTabsForDeletedPath: vi.fn() }));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import { exists, rename } from '@tauri-apps/plugin-fs';
import { moveToTrash } from '#lib/core/trash/trash.service.js';
import { deleteItem, renameItem } from '#lib/core/filesystem/fs.service.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { registerFilesNavigatorPathChangeConsumer } from '#lib/features/rail-shell/files-navigator.service.js';

const WORK = '/vault/Work';
const PROJECTS = `${WORK}/projects`;
const JOB = '/vault/Job';

let unregister: (() => void) | null = null;

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	settingsStore.reset();
	fsStore.reset();
	vaultStore._reset();
	vaultStore.open('/vault');
	fsStore.setFileTree([{ name: 'Work', path: WORK, isDirectory: true, children: [] }]);
	// The tree rescan after the move reads an empty vault.
	vi.mocked(invoke).mockResolvedValue([]);
	vi.mocked(exists).mockResolvedValue(false);
	vi.mocked(rename).mockResolvedValue(undefined);
	vi.mocked(moveToTrash).mockResolvedValue(true);
	unregister = registerFilesNavigatorPathChangeConsumer();
});

afterEach(() => {
	unregister?.();
	unregister = null;
	vi.restoreAllMocks();
});

describe('registerFilesNavigatorPathChangeConsumer', () => {
	it('keeps a renamed picked folder picked, and its expanded state, under the new path', async () => {
		settingsStore.updateLayout({ railFolder: PROJECTS, railExpandedFolders: [WORK, PROJECTS] });

		await renameItem(WORK, 'Job');

		expect(settingsStore.layout.railFolder).toBe(`${JOB}/projects`);
		expect(settingsStore.layout.railExpandedFolders).toEqual([JOB, `${JOB}/projects`]);
	});

	it('sends the pick back to the vault root when the picked folder is moved to the Trash', async () => {
		settingsStore.updateLayout({ railItem: 'files', railFolder: WORK, railExpandedFolders: [WORK] });

		await deleteItem(WORK, true);

		expect(settingsStore.layout.railFolder).toBeNull();
		expect(settingsStore.layout.railExpandedFolders).toEqual([]);
		expect(settingsStore.layout.railItem).toBe('files');
	});

	it('leaves the layout alone for an unrelated rename', async () => {
		settingsStore.updateLayout({ railFolder: WORK, railExpandedFolders: [WORK] });

		await renameItem('/vault/Personal', 'Home');

		expect(settingsStore.layout.railFolder).toBe(WORK);
		expect(settingsStore.layout.railExpandedFolders).toEqual([WORK]);
	});

	it('leaves the layout alone when the rename fails', async () => {
		settingsStore.updateLayout({ railFolder: WORK });
		vi.mocked(rename).mockRejectedValue(new Error('Permission denied'));

		await expect(renameItem(WORK, 'Job')).rejects.toThrow('Permission denied');

		expect(settingsStore.layout.railFolder).toBe(WORK);
	});

	it('stops following once unregistered', async () => {
		settingsStore.updateLayout({ railFolder: WORK });
		unregister?.();
		unregister = null;

		await renameItem(WORK, 'Job');

		expect(settingsStore.layout.railFolder).toBe(WORK);
	});
});
