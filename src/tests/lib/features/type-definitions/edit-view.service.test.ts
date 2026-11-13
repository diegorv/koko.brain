// `editView` against the real `view-parse-cache`, `yaml-parser`, note-change
// owner, `editor.hooks` and vault store, with only plugin-fs and `invoke`
// mocked at the Tauri boundary.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readDir: vi.fn(),
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { editView } from '#lib/features/type-definitions/type-definitions.service.js';
import { clearAllViewParseCache, getCachedViewDefinition } from '#lib/features/type-definitions/view-parse-cache.js';
import { areAllRecentSaves, resetHooks } from '#lib/core/editor/editor.hooks.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';

const VIEW = '/vault/Projects.view';
const ORIGINAL = "_sidebar_label: Projects\n_icon: lucide:rocket\nviews:\n  - type: table\n    name: Projects\n    filters: status == 'active'\n";

/** In-memory disk behind the plugin-fs mocks. */
const files: Record<string, string> = {};

function invokesOf(cmd: string): unknown[][] {
	return vi.mocked(invoke).mock.calls.filter(([c]) => c === cmd);
}

describe('editView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetHooks();
		clearAllIndexed();
		clearAllViewParseCache();
		vaultStore._reset();
		vaultStore.open('/vault');
		for (const p of Object.keys(files)) delete files[p];
		files[VIEW] = ORIGINAL;
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			const content = files[String(p)];
			if (content === undefined) throw new Error(`not found: ${String(p)}`);
			return content;
		});
		vi.mocked(writeTextFile).mockImplementation(async (p, content) => {
			files[String(p)] = String(content);
		});
		vi.mocked(exists).mockImplementation(async (p) => files[String(p)] !== undefined);
		vi.mocked(invoke).mockResolvedValue(undefined as never);
	});

	afterEach(() => {
		clearAllViewParseCache();
		resetHooks();
		clearAllIndexed();
		vaultStore._reset();
	});

	it('writes once to the same path and serves the new filters from the parse cache with no further read', async () => {
		await getCachedViewDefinition(VIEW);

		await editView(VIEW, { label: 'Live projects', viewFilters: "status == 'done'" });

		expect(vi.mocked(writeTextFile)).toHaveBeenCalledTimes(1);
		expect(vi.mocked(writeTextFile).mock.calls[0][0]).toBe(VIEW);
		expect(Object.keys(files)).toEqual([VIEW]);
		const saved = parseYaml(files[VIEW]);
		expect(saved._sidebar_label).toBe('Live projects');
		expect(saved._icon).toBe('lucide:rocket');
		expect(saved.views[0]).toEqual({ type: 'table', name: 'Live projects', filters: "status == 'done'" });

		const reads = vi.mocked(readTextFile).mock.calls.length;
		const cached = await getCachedViewDefinition(VIEW);
		expect(vi.mocked(readTextFile).mock.calls.length).toBe(reads);
		expect(cached.success && cached.definition.views[0].filters).toBe("status == 'done'");
	});

	it('sends the bytes through the note-change owner and marks a recent save', async () => {
		await editView(VIEW, { label: 'Live projects', viewFilters: undefined });

		expect(invokesOf('update_note_in_index')).toEqual([
			['update_note_in_index', { path: VIEW, content: files[VIEW] }],
		]);
		expect(invokesOf('update_search_index_file')).toEqual([]);
		expect(areAllRecentSaves([VIEW])).toBe(true);
	});

	it('asks for a prompt index refresh', async () => {
		await editView(VIEW, { label: 'Live projects', viewFilters: undefined });

		expect(vaultStore.takePromptIndexRefresh()).toBe(true);
	});

	it.each([
		['YAML that does not parse', 'views: ['],
		['a file with no views[0]', '_sidebar_label: Projects\nviews: []\n'],
	])('rejects and writes nothing for %s', async (_label, content) => {
		files[VIEW] = content;

		await expect(editView(VIEW, { label: 'X', viewFilters: undefined })).rejects.toThrow();

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(files[VIEW]).toBe(content);
		expect(invokesOf('update_note_in_index')).toEqual([]);
		expect(areAllRecentSaves([VIEW])).toBe(false);
	});

	it('rejects when the file cannot be read, and writes nothing', async () => {
		await expect(editView('/vault/Gone.view', { label: 'X' })).rejects.toThrow('not found');
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('rejects when the write fails, and leaves the cache on the old filters', async () => {
		await getCachedViewDefinition(VIEW);
		vi.mocked(writeTextFile).mockRejectedValue(new Error('disk full'));

		await expect(editView(VIEW, { label: 'X', viewFilters: undefined })).rejects.toThrow('disk full');

		const cached = await getCachedViewDefinition(VIEW);
		expect(cached.success && cached.definition.views[0].filters).toBe("status == 'active'");
		expect(invokesOf('update_note_in_index')).toEqual([]);
	});
});
