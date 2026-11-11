import { describe, it, expect, beforeEach } from 'vitest';

import { modsStore, type ModCallbackError, type ModStatusEntry } from '#lib/plugins/mods/mods.store.svelte.js';

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

	it('removes the entry of a folder and keeps the others', () => {
		modsStore.setEntries([HELLO, BROKEN]);

		modsStore.removeEntry('hello');

		expect(modsStore.entries).toEqual([BROKEN]);
	});

	it('removing an unknown folder changes nothing', () => {
		modsStore.setEntries([HELLO]);

		modsStore.removeEntry('missing');

		expect(modsStore.entries).toEqual([HELLO]);
	});

	it('reset empties the list', () => {
		modsStore.setEntries([HELLO]);

		modsStore.reset();

		expect(modsStore.entries).toEqual([]);
	});

	describe('callback errors', () => {
		const SAVE_ERROR: ModCallbackError = { callback: 'onNoteSaved', message: 'bad save', stack: 'Error: bad save', at: 1000 };
		const WATCH_ERROR: ModCallbackError = { callback: 'watch', message: 'bad watch', at: 2000 };

		it('an unknown folder has none', () => {
			expect(modsStore.callbackErrorFor('missing')).toBeNull();
		});

		it('records a folder\'s last error and replaces it with the next one', () => {
			modsStore.recordCallbackError('hello', SAVE_ERROR);
			expect(modsStore.callbackErrorFor('hello')).toEqual(SAVE_ERROR);

			modsStore.recordCallbackError('hello', WATCH_ERROR);
			expect(modsStore.callbackErrorFor('hello')).toEqual(WATCH_ERROR);
		});

		it('clearing one folder keeps the others', () => {
			modsStore.recordCallbackError('hello', SAVE_ERROR);
			modsStore.recordCallbackError('broken', WATCH_ERROR);

			modsStore.clearCallbackError('hello');
			modsStore.clearCallbackError('missing');

			expect(modsStore.callbackErrorFor('hello')).toBeNull();
			expect(modsStore.callbackErrorFor('broken')).toEqual(WATCH_ERROR);
		});

		it('reset empties them', () => {
			modsStore.recordCallbackError('hello', SAVE_ERROR);

			modsStore.reset();

			expect(modsStore.callbackErrorFor('hello')).toBeNull();
		});
	});
});
