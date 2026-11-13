import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import { applyPropertyDelta, buildPropertyIndex } from '#lib/features/collection/collection.service.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { getAllKnownProperties } from '#lib/features/collection/toolbar/filter.logic.js';
import { getVaultEntries, invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { KBAPI } from '#lib/plugins/queryjs/kb-api.js';
import type { NoteRecord } from '#lib/contracts/generated/NoteRecord.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const VIEW_PATH = '/v/x.view';
const NOTE_PATH = '/v/note.md';

function record(path: string, properties: Record<string, unknown>): NoteRecord {
	const name = path.split('/').pop()!;
	const dot = name.lastIndexOf('.');
	return {
		path,
		name,
		basename: name.slice(0, dot),
		folder: '/v',
		ext: name.slice(dot),
		mtime: 1700000000000,
		ctime: 1690000000000,
		size: 10,
		properties,
	} as NoteRecord;
}

/** Builds the API the way `queryjs-block-widget` does: from the store and the entries memo. */
async function kbFromTheRealIndex(): Promise<KBAPI> {
	return new KBAPI({
		container: {} as HTMLElement,
		propertyIndex: collectionStore.propertyIndex,
		entries: await getVaultEntries(),
		propertyIndexVersion: collectionStore.version,
		currentFilePath: NOTE_PATH,
		vaultPath: '/v',
		systemFolder: '',
		loadScript: async () => '',
	});
}

describe('kb.page on a .view, through the real index path', () => {
	beforeEach(async () => {
		clearLocalStorage();
		collectionStore.reset();
		invalidateVaultEntries();
		vi.mocked(invoke).mockReset();
		vi.mocked(invoke).mockImplementation(async (command: string) => {
			if (command === 'get_all_property_records') {
				return [record(VIEW_PATH, { _rail: true, views: [] }), record(NOTE_PATH, { status: 'done' })];
			}
			if (command === 'get_all_vault_entries_v2') {
				return [entryV2(VIEW_PATH, { frontmatter: { _rail: true } }), entryV2(NOTE_PATH)];
			}
			return undefined;
		});
		await buildPropertyIndex();
	});

	afterEach(() => {
		collectionStore.reset();
		invalidateVaultEntries();
	});

	it('returns a page whose record the suggestions skip', async () => {
		const kb = await kbFromTheRealIndex();

		expect(kb.page(VIEW_PATH)?.file.path).toBe(VIEW_PATH);
		expect(getAllKnownProperties(collectionStore.propertyIndex)).not.toContain('_rail');
	});

	it('leaves the view out of kb.pages', async () => {
		const kb = await kbFromTheRealIndex();

		expect(kb.pages().map((p) => p.file.path).array()).toEqual([NOTE_PATH]);
	});

	it("gives the view no inlinks, though a note links its basename, and keeps the note's", async () => {
		const SAME_STEM = '/v/x.md';
		vi.mocked(invoke).mockImplementation(async (command: string) => {
			if (command === 'get_all_property_records') {
				return [record(VIEW_PATH, { views: [] }), record(SAME_STEM, {}), record(NOTE_PATH, {})];
			}
			if (command === 'get_all_vault_entries_v2') {
				return [
					entryV2(VIEW_PATH),
					entryV2(SAME_STEM),
					entryV2(NOTE_PATH, { outgoingLinks: [{ target: 'x', alias: null, heading: null, position: 0 }] }),
				];
			}
			return undefined;
		});
		collectionStore.reset();
		invalidateVaultEntries();
		await buildPropertyIndex();

		const kb = await kbFromTheRealIndex();

		expect(kb.page(VIEW_PATH)?.file.inlinks).toEqual([]);
		expect(kb.page(SAME_STEM)?.file.inlinks.map((l) => l.path)).toEqual([NOTE_PATH]);
	});

	it('finds a view that reached the index through a delta', async () => {
		applyPropertyDelta([record('/v/late.view', { _rail: false })], []);

		const kb = await kbFromTheRealIndex();

		expect(kb.page('/v/late.view')?.file.path).toBe('/v/late.view');
	});
});
