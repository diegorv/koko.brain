// The path-change tests rename, move and delete through the real fs.service
// and path-change owner; only the Tauri boundary is mocked.
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
import { deleteItem, moveItem, renameItem } from '#lib/core/filesystem/fs.service.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { neighbourhoodStore } from '#lib/features/rail-shell/neighbourhood.store.svelte.js';
import { openNeighbourhood, registerNeighbourhoodPathChangeConsumer } from '#lib/features/rail-shell/neighbourhood.service.js';
import {
	NEIGHBOURHOOD_LENS_KIND,
	NEIGHBOURHOOD_RAIL_ITEM,
	TODAY_RAIL_ITEM,
	restoreRailItem,
} from '#lib/features/rail-shell/lens.logic.js';

describe('openNeighbourhood', () => {
	beforeEach(() => {
		settingsStore.reset();
		neighbourhoodStore.reset();
		settingsStore.updateLayout({ shell: 'rail', railItem: 'inbox', railPanelsVisible: false });
	});

	it("sets the note, picks the Neighbourhood item and shows the panels Cmd+1 hid", () => {
		openNeighbourhood('/vault/a.md');
		expect(neighbourhoodStore.notePath).toBe('/vault/a.md');
		expect(settingsStore.layout.railItem).toBe(NEIGHBOURHOOD_RAIL_ITEM);
		expect(settingsStore.layout.railPanelsVisible).toBe(true);
		expect(restoreRailItem(settingsStore.layout.railItem, [], neighbourhoodStore.notePath).lens).toEqual({
			kind: NEIGHBOURHOOD_LENS_KIND,
			target: '/vault/a.md',
		});
	});

	it('moves to another note when opened again', () => {
		openNeighbourhood('/vault/a.md');
		openNeighbourhood('/vault/b.md');
		expect(neighbourhoodStore.notePath).toBe('/vault/b.md');
		expect(settingsStore.layout.railItem).toBe(NEIGHBOURHOOD_RAIL_ITEM);
	});

	it('does nothing in the classic shell, which has no note list', () => {
		settingsStore.updateLayout({ shell: 'classic' });
		openNeighbourhood('/vault/a.md');
		expect(neighbourhoodStore.notePath).toBeNull();
		expect(settingsStore.layout.railItem).toBe('inbox');
		expect(settingsStore.layout.railPanelsVisible).toBe(false);
	});
});

describe('registerNeighbourhoodPathChangeConsumer', () => {
	const NOTE = '/vault/Work/launch.md';
	let unregister: (() => void) | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, 'error').mockImplementation(() => {});
		settingsStore.reset();
		neighbourhoodStore.reset();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		fsStore.setFileTree([
			{ name: 'Work', path: '/vault/Work', isDirectory: true, children: [{ name: 'launch.md', path: NOTE, isDirectory: false }] },
		]);
		vi.mocked(invoke).mockResolvedValue([]);
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		vi.mocked(moveToTrash).mockResolvedValue(true);
		settingsStore.updateLayout({ shell: 'rail' });
		openNeighbourhood(NOTE);
		unregister = registerNeighbourhoodPathChangeConsumer();
	});

	afterEach(() => {
		unregister?.();
		unregister = null;
		vi.restoreAllMocks();
	});

	it('follows the note when it is renamed', async () => {
		await renameItem(NOTE, 'kickoff.md');
		expect(neighbourhoodStore.notePath).toBe('/vault/Work/kickoff.md');
		expect(settingsStore.layout.railItem).toBe(NEIGHBOURHOOD_RAIL_ITEM);
	});

	it('follows the note when it is moved', async () => {
		await moveItem(NOTE, '/vault/Archive');
		expect(neighbourhoodStore.notePath).toBe('/vault/Archive/launch.md');
	});

	it('follows the note when its folder is renamed', async () => {
		await renameItem('/vault/Work', 'Job');
		expect(neighbourhoodStore.notePath).toBe('/vault/Job/launch.md');
	});

	it('clears the note and falls back to Today when the note is deleted', async () => {
		await deleteItem(NOTE);
		expect(neighbourhoodStore.notePath).toBeNull();
		expect(settingsStore.layout.railItem).toBe(TODAY_RAIL_ITEM);
	});

	it('clears the note but keeps another rail item picked when the note is deleted', async () => {
		settingsStore.updateLayout({ railItem: 'inbox' });
		await deleteItem('/vault/Work', true);
		expect(neighbourhoodStore.notePath).toBeNull();
		expect(settingsStore.layout.railItem).toBe('inbox');
	});

	it('leaves the note alone for an unrelated rename or a sibling sharing its prefix', async () => {
		await renameItem('/vault/Work/launch.md.bak', 'old.md');
		await renameItem('/vault/Wor', 'Other');
		expect(neighbourhoodStore.notePath).toBe(NOTE);
		expect(settingsStore.layout.railItem).toBe(NEIGHBOURHOOD_RAIL_ITEM);
	});

	it('leaves the note alone when the rename fails', async () => {
		vi.mocked(rename).mockRejectedValue(new Error('Permission denied'));
		await expect(renameItem(NOTE, 'kickoff.md')).rejects.toThrow('Permission denied');
		expect(neighbourhoodStore.notePath).toBe(NOTE);
	});

	it('stops following once unregistered', async () => {
		unregister?.();
		unregister = null;
		await renameItem(NOTE, 'kickoff.md');
		expect(neighbourhoodStore.notePath).toBe(NOTE);
	});
});
