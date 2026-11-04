// The Types navigator's saved pick of a view is cleared when the view goes to
// the Trash through the real fs.service and path-change owner; only the Tauri
// boundary and the Trash move are mocked.
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
vi.mock('#lib/core/editor/editor.service.js', () => ({ closeTabsForDeletedPath: vi.fn(() => []) }));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import { exists, rename } from '@tauri-apps/plugin-fs';
import { moveToTrash } from '#lib/core/trash/trash.service.js';
import { deleteItem, renameItem } from '#lib/core/filesystem/fs.service.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { registerTypesNavigatorPathChangeConsumer } from '#lib/features/rail-shell/types-navigator.service.js';
import { pickedTypesLens, viewNavigatorRows } from '#lib/features/rail-shell/lens.logic.js';

const VIEWS = '/vault/Views';
const PROJECTS = `${VIEWS}/Projects.view`;
const READING = '/vault/Reading.view';

let unregister: (() => void) | null = null;

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	settingsStore.reset();
	fsStore.reset();
	vaultStore._reset();
	vaultStore.open('/vault');
	fsStore.setFileTree([
		{ name: 'Views', path: VIEWS, isDirectory: true, children: [{ name: 'Projects.view', path: PROJECTS, isDirectory: false }] },
		{ name: 'Reading.view', path: READING, isDirectory: false },
	]);
	// The tree rescan after the move reads an empty vault.
	vi.mocked(invoke).mockResolvedValue([]);
	vi.mocked(exists).mockResolvedValue(false);
	vi.mocked(rename).mockResolvedValue(undefined);
	vi.mocked(moveToTrash).mockResolvedValue(true);
	unregister = registerTypesNavigatorPathChangeConsumer();
});

afterEach(() => {
	unregister?.();
	unregister = null;
	vi.restoreAllMocks();
});

describe('registerTypesNavigatorPathChangeConsumer', () => {
	it('clears the pick of a view moved to the Trash; the Types item stays and shows its first row', async () => {
		settingsStore.updateLayout({ railItem: 'types', railTypesLens: { kind: 'view', target: PROJECTS } });

		await deleteItem(PROJECTS, false);

		expect(moveToTrash).toHaveBeenCalledWith('/vault', PROJECTS, false);
		expect(settingsStore.layout.railTypesLens).toBeNull();
		expect(settingsStore.layout.railItem).toBe('types');
		const rows = viewNavigatorRows([{ name: 'Reading.view', path: READING, isDirectory: false }], new Map());
		expect(pickedTypesLens(settingsStore.layout.railTypesLens, rows)).toEqual({ kind: 'view', target: READING });
	});

	it('clears the pick when the folder holding the picked view goes to the Trash', async () => {
		settingsStore.updateLayout({ railTypesLens: { kind: 'view', target: PROJECTS } });

		await deleteItem(VIEWS, true);

		expect(settingsStore.layout.railTypesLens).toBeNull();
	});

	it('leaves the pick alone when the Trash move fails', async () => {
		settingsStore.updateLayout({ railTypesLens: { kind: 'view', target: PROJECTS } });
		vi.mocked(moveToTrash).mockRejectedValue(new Error('Permission denied'));

		await expect(deleteItem(PROJECTS, false)).rejects.toThrow('Permission denied');

		expect(settingsStore.layout.railTypesLens).toEqual({ kind: 'view', target: PROJECTS });
	});

	it('leaves the pick alone when another view is trashed, or the picked one is renamed', async () => {
		settingsStore.updateLayout({ railTypesLens: { kind: 'view', target: PROJECTS } });

		await deleteItem(READING, false);
		expect(settingsStore.layout.railTypesLens).toEqual({ kind: 'view', target: PROJECTS });

		await renameItem(PROJECTS, 'Work.view');
		expect(settingsStore.layout.railTypesLens).toEqual({ kind: 'view', target: PROJECTS });
	});

	it('leaves a type pick alone', async () => {
		settingsStore.updateLayout({ railTypesLens: { kind: 'type', target: 'Project' } });

		await deleteItem(PROJECTS, false);

		expect(settingsStore.layout.railTypesLens).toEqual({ kind: 'type', target: 'Project' });
	});

	describe('a pinned view the rail shows', () => {
		it('sends the rail back to Today when the view goes to the Trash', async () => {
			settingsStore.updateLayout({ railItem: `view:${PROJECTS}` });

			await deleteItem(PROJECTS, false);

			expect(settingsStore.layout.railItem).toBe('today');
		});

		it('sends the rail back to Today when the folder holding the view goes to the Trash, and clears a Types pick of it too', async () => {
			settingsStore.updateLayout({ railItem: `view:${PROJECTS}`, railTypesLens: { kind: 'view', target: PROJECTS } });

			await deleteItem(VIEWS, true);

			expect(settingsStore.layout.railItem).toBe('today');
			expect(settingsStore.layout.railTypesLens).toBeNull();
		});

		it('keeps the rail when the Trash move fails', async () => {
			settingsStore.updateLayout({ railItem: `view:${PROJECTS}` });
			vi.mocked(moveToTrash).mockRejectedValue(new Error('Permission denied'));

			await expect(deleteItem(PROJECTS, false)).rejects.toThrow('Permission denied');

			expect(settingsStore.layout.railItem).toBe(`view:${PROJECTS}`);
		});

		it('keeps the rail when another view is trashed, or the shown one is renamed', async () => {
			settingsStore.updateLayout({ railItem: `view:${PROJECTS}` });

			await deleteItem(READING, false);
			expect(settingsStore.layout.railItem).toBe(`view:${PROJECTS}`);

			await renameItem(PROJECTS, 'Work.view');
			expect(settingsStore.layout.railItem).toBe(`view:${PROJECTS}`);
		});
	});

	it('stops following once unregistered', async () => {
		settingsStore.updateLayout({ railTypesLens: { kind: 'view', target: PROJECTS } });
		unregister?.();
		unregister = null;

		await deleteItem(PROJECTS, false);

		expect(settingsStore.layout.railTypesLens).toEqual({ kind: 'view', target: PROJECTS });
	});
});
