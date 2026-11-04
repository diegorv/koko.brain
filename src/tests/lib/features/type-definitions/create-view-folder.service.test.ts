// New view from a folder: createView with a folder creates the `.view` there
// through the real createFile, which dedupes against that folder's siblings.
// Only the Tauri boundary is mocked; the stores are real.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

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
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import { readDir } from '@tauri-apps/plugin-fs';
import { createView } from '#lib/features/type-definitions/type-definitions.service.js';
import { buildNewViewYaml } from '#lib/features/type-definitions/type-sidebar.logic.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { findNodeByPath } from '#lib/core/filesystem/fs.logic.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';

const WORK = '/vault/Work';

/** The names `readDir` lists in each folder. */
const folders: Record<string, string[]> = {};

function createNoteCalls(): { path: string; content: string }[] {
	return vi
		.mocked(invoke)
		.mock.calls.filter(([cmd]) => cmd === 'create_note')
		.map(([, args]) => args as { path: string; content: string });
}

beforeEach(() => {
	vi.clearAllMocks();
	clearLocalStorage();
	vaultStore._reset();
	vaultStore.open('/vault');
	typeDefinitionsStore.reset();
	fsStore.reset();
	fsStore.setFileTree([{ name: 'Work', path: WORK, isDirectory: true, children: [] }]);
	for (const key of Object.keys(folders)) delete folders[key];
	folders['/vault'] = ['Reading.view'];
	folders[WORK] = [];
	vi.mocked(readDir).mockImplementation(async (dir) => (folders[String(dir)] ?? []).map((name) => ({ name }) as never));
	vi.mocked(invoke).mockResolvedValue(undefined);
});

describe('createView in a folder', () => {
	it('creates <name>.view in the folder, adds it to the tree and selects it', async () => {
		const path = await createView('Reading', undefined, WORK);

		expect(path).toBe(`${WORK}/Reading.view`);
		expect(readDir).toHaveBeenCalledWith(WORK);
		expect(createNoteCalls()).toEqual([{ path: `${WORK}/Reading.view`, content: buildNewViewYaml('Reading') }]);
		expect(findNodeByPath(fsStore.fileTree, path)).not.toBeNull();
		expect(typeDefinitionsStore.selectedTypeOrNav).toEqual({ kind: 'view', path });
		expect(vaultStore.takePromptIndexRefresh()).toBe(true);
	});

	it("dedupes the file name against the folder's siblings, not the vault root's", async () => {
		folders[WORK] = ['Reading.view'];
		folders['/vault'] = [];

		expect(await createView('Reading', undefined, WORK)).toBe(`${WORK}/Reading 1.view`);
		// The label and the view name keep the typed name.
		expect(createNoteCalls()[0].content).toBe(buildNewViewYaml('Reading'));
	});

	it('creates at the vault root without a folder', async () => {
		expect(await createView('Reading')).toBe('/vault/Reading 1.view');
		expect(readDir).toHaveBeenCalledWith('/vault');
	});

	it('rejects and selects nothing when the folder cannot be read', async () => {
		vi.mocked(readDir).mockRejectedValue(new Error('permission denied'));

		await expect(createView('Reading', undefined, WORK)).rejects.toThrow('permission denied');

		expect(createNoteCalls()).toEqual([]);
		expect(typeDefinitionsStore.selectedTypeOrNav).toBeNull();
	});

	it('rejects without a vault and creates nothing', async () => {
		vaultStore._reset();

		await expect(createView('Reading', undefined, WORK)).rejects.toThrow('No vault is open');

		expect(readDir).not.toHaveBeenCalled();
	});
});
