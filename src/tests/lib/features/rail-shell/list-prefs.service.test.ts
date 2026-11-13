import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

// `vaultStore.open` persists the recent-vaults list; the node test env has no localStorage.
function localStorageStub() {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => { store[key] = value; },
		removeItem: (key: string) => { delete store[key]; },
		clear: () => { store = {}; },
	};
}

import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { resetHooks } from '#lib/core/editor/editor.hooks.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { _resetParseFrontmatterCache, parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import type { Property } from '#lib/core/frontmatter/properties.types.js';
import { saveTypeListProperties, saveTypeListSort, serializeListWrite } from '#lib/features/rail-shell/list-prefs.service.js';
import { parseListSort } from '#lib/features/rail-shell/list-sort.logic.js';

const VAULT = '/vault';
const DEFINITION = `${VAULT}/Podcast.md`;

/** In-memory disk behind the mocked `@tauri-apps/plugin-fs`. */
const disk = new Map<string, string>();

/** A definition note with the given frontmatter lines and body. */
function definition(frontmatter: string, body = '# Podcast\n'): string {
	return `---\n${frontmatter}\n---\n${body}`;
}

/** The properties of the note now on disk at `path`. */
function onDisk(path: string): Property[] {
	return parseFrontmatterProperties(disk.get(path) ?? '');
}

/** The value of `key` in the note on disk, or undefined. */
function diskValue(path: string, key: string): Property['value'] | undefined {
	return onDisk(path).find((p) => p.key === key)?.value;
}

describe('list prefs service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal('localStorage', localStorageStub());
		disk.clear();
		vaultStore._reset();
		vaultStore.open(VAULT);
		resetHooks();
		clearAllIndexed();
		_resetParseFrontmatterCache();
		vi.mocked(invoke).mockResolvedValue(undefined);
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			const path = String(p);
			if (!disk.has(path)) throw new Error(`No such file: ${path}`);
			return disk.get(path)!;
		});
		vi.mocked(writeTextFile).mockImplementation(async (p, data) => {
			disk.set(String(p), String(data));
		});
		vi.mocked(exists).mockImplementation(async (p) => disk.has(String(p)));
	});

	afterEach(() => {
		vaultStore._reset();
		resetHooks();
		vi.unstubAllGlobals();
	});

	describe('saveTypeListProperties', () => {
		it('writes _list_properties_display as a list and keeps the other keys and the body', async () => {
			disk.set(DEFINITION, definition('_type: Type\n_visible: true', '# Podcast\n\nNotes here\n'));

			await saveTypeListProperties(DEFINITION, ['_due', 'status']);

			expect(diskValue(DEFINITION, '_list_properties_display')).toEqual(['_due', 'status']);
			expect(diskValue(DEFINITION, '_type')).toBe('Type');
			expect(diskValue(DEFINITION, '_visible')).toBe(true);
			expect(disk.get(DEFINITION)).toContain('# Podcast\n\nNotes here\n');
		});

		it('replaces an existing list in place', async () => {
			disk.set(DEFINITION, definition('_type: Type\n_list_properties_display: [old]'));

			await saveTypeListProperties(DEFINITION, ['new', 'other']);

			expect(diskValue(DEFINITION, '_list_properties_display')).toEqual(['new', 'other']);
			expect(onDisk(DEFINITION).filter((p) => p.key === '_list_properties_display')).toHaveLength(1);
		});

		it('removes _list_properties_display when the list is empty and keeps the other keys', async () => {
			disk.set(DEFINITION, definition('_type: Type\n_list_properties_display: [due]\n_sort: title'));

			await saveTypeListProperties(DEFINITION, []);

			expect(diskValue(DEFINITION, '_list_properties_display')).toBeUndefined();
			expect(disk.get(DEFINITION)).not.toContain('_list_properties_display');
			expect(diskValue(DEFINITION, '_sort')).toBe('title');
		});

		it('marks the vault index for a prompt refresh before writing', async () => {
			disk.set(DEFINITION, definition('_type: Type'));

			await saveTypeListProperties(DEFINITION, ['due']);

			expect(vaultStore.takePromptIndexRefresh()).toBe(true);
		});

		it('propagates a write error', async () => {
			disk.set(DEFINITION, definition('_type: Type'));
			vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));

			await expect(saveTypeListProperties(DEFINITION, ['due'])).rejects.toThrow('disk full');
		});

		it('propagates a read error for a missing definition', async () => {
			await expect(saveTypeListProperties(`${VAULT}/Missing.md`, ['due'])).rejects.toThrow('No such file');
			expect(writeTextFile).not.toHaveBeenCalled();
		});
	});

	describe('saveTypeListSort', () => {
		it('writes _list_sort in the formatted form and keeps the other keys', async () => {
			disk.set(DEFINITION, definition('_type: Type\n_list_properties_display: [due]'));

			await saveTypeListSort(DEFINITION, { option: 'property:budget', direction: 'asc' });

			expect(diskValue(DEFINITION, '_list_sort')).toBe('property:budget:asc');
			expect(parseListSort(diskValue(DEFINITION, '_list_sort'))).toEqual({
				option: 'property:budget',
				direction: 'asc',
			});
			expect(diskValue(DEFINITION, '_list_properties_display')).toEqual(['due']);
		});

		it('replaces an existing _list_sort', async () => {
			disk.set(DEFINITION, definition('_type: Type\n_list_sort: title:asc'));

			await saveTypeListSort(DEFINITION, { option: 'modified', direction: 'desc' });

			expect(diskValue(DEFINITION, '_list_sort')).toBe('modified:desc');
			expect(onDisk(DEFINITION).filter((p) => p.key === '_list_sort')).toHaveLength(1);
		});

		it('marks the vault index for a prompt refresh before writing', async () => {
			disk.set(DEFINITION, definition('_type: Type'));

			await saveTypeListSort(DEFINITION, { option: 'title', direction: 'asc' });

			expect(vaultStore.takePromptIndexRefresh()).toBe(true);
		});

		it('propagates a write error', async () => {
			disk.set(DEFINITION, definition('_type: Type'));
			vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));

			await expect(
				saveTypeListSort(DEFINITION, { option: 'title', direction: 'asc' }),
			).rejects.toThrow('disk full');
		});

		it('propagates a read error for a missing definition', async () => {
			await expect(
				saveTypeListSort(`${VAULT}/Missing.md`, { option: 'title', direction: 'asc' }),
			).rejects.toThrow('No such file');
			expect(writeTextFile).not.toHaveBeenCalled();
		});
	});

	describe('review regressions', () => {
		it('removes _list_sort when the sort is reset', async () => {
			disk.set(DEFINITION, definition('_type: Type\n_list_sort: title:asc'));
			await saveTypeListSort(DEFINITION, null);
			expect(diskValue(DEFINITION, '_list_sort')).toBeUndefined();
			expect(diskValue(DEFINITION, '_type')).toBe('Type');
		});

		it('keeps both fields when a sort and a property save overlap on one note', async () => {
			disk.set(DEFINITION, definition('_type: Type'));
			await Promise.all([
				saveTypeListSort(DEFINITION, { option: 'title', direction: 'asc' }),
				saveTypeListProperties(DEFINITION, ['budget']),
			]);
			expect(diskValue(DEFINITION, '_list_sort')).toBe('title:asc');
			expect(diskValue(DEFINITION, '_list_properties_display')).toEqual(['budget']);
		});

		it('runs the next queued write after one fails, and rejects only the failed one', async () => {
			const order: string[] = [];
			const failing = serializeListWrite('/p', async () => {
				order.push('a');
				throw new Error('boom');
			});
			const next = serializeListWrite('/p', async () => {
				order.push('b');
				return 'ok';
			});
			await expect(failing).rejects.toThrow('boom');
			await expect(next).resolves.toBe('ok');
			expect(order).toEqual(['a', 'b']);
		});
	});
});
