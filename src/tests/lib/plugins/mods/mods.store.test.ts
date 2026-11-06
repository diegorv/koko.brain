import { describe, it, expect, beforeEach } from 'vitest';

import { modsStore, type ModStatusEntry } from '#lib/plugins/mods/mods.store.svelte.js';

const HELLO: ModStatusEntry = { id: 'hello', folder: 'hello', name: 'Hello', version: '1.0.0', state: 'loaded' };
const BROKEN: ModStatusEntry = {
	id: 'broken',
	folder: 'broken',
	name: 'broken',
	version: '',
	state: 'error',
	error: { message: '_system/mods/broken: main.js: boom', stack: 'Error: boom\n    at main.js:1' },
};

describe('modsStore', () => {
	beforeEach(() => {
		modsStore.reset();
	});

	it('starts with no entries', () => {
		expect(modsStore.entries).toEqual([]);
	});

	it('sets the whole list, sorted by folder', () => {
		modsStore.setEntries([HELLO, BROKEN]);

		expect(modsStore.entries.map((e) => e.folder)).toEqual(['broken', 'hello']);
	});

	it('replaces an entry with the same folder and keeps the others', () => {
		modsStore.setEntries([HELLO, BROKEN]);

		modsStore.upsertEntry({ ...BROKEN, state: 'loaded', error: undefined, name: 'Fixed' });

		expect(modsStore.entries).toEqual([
			{ ...BROKEN, state: 'loaded', error: undefined, name: 'Fixed' },
			HELLO,
		]);
	});

	it('adds an entry for a new folder in folder order', () => {
		modsStore.upsertEntry(HELLO);
		modsStore.upsertEntry(BROKEN);

		expect(modsStore.entries.map((e) => e.folder)).toEqual(['broken', 'hello']);
	});

	it('keeps the message and stack of an error entry', () => {
		modsStore.upsertEntry(BROKEN);

		expect(modsStore.entries[0].state).toBe('error');
		expect(modsStore.entries[0].error).toEqual({
			message: '_system/mods/broken: main.js: boom',
			stack: 'Error: boom\n    at main.js:1',
		});
	});

	it('reset empties the list', () => {
		modsStore.setEntries([HELLO]);

		modsStore.reset();

		expect(modsStore.entries).toEqual([]);
	});
});
