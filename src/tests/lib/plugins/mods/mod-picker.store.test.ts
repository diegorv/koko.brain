// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

import { modPickerStore, type ModPickerAction } from '#lib/plugins/mods/mod-picker.store.svelte.js';

const action = (id: string, description?: string): ModPickerAction => ({ id, title: `Title ${id}`, description, run: async () => {} });

describe('modPickerStore', () => {
	beforeEach(() => {
		modPickerStore.reset();
	});

	it('starts closed with no mod, no title and no actions', () => {
		expect(modPickerStore.isOpen).toBe(false);
		expect(modPickerStore.modId).toBeNull();
		expect(modPickerStore.title).toBe('');
		expect(modPickerStore.actions).toEqual([]);
	});

	it('open shows the mod, the button title and its actions in order', () => {
		const actions = [action('hello', 'Shows a toast'), action('bye')];
		modPickerStore.open('hello', 'Hello mod', actions);

		expect(modPickerStore.isOpen).toBe(true);
		expect(modPickerStore.modId).toBe('hello');
		expect(modPickerStore.title).toBe('Hello mod');
		expect(modPickerStore.actions.map((a) => [a.id, a.description])).toEqual([
			['hello', 'Shows a toast'],
			['bye', undefined],
		]);
	});

	it('opens with an empty action list', () => {
		modPickerStore.open('hello', 'Hello mod', []);
		expect(modPickerStore.isOpen).toBe(true);
		expect(modPickerStore.actions).toEqual([]);
	});

	it('a second open replaces the first', () => {
		modPickerStore.open('hello', 'Hello mod', [action('hello')]);
		modPickerStore.open('other', 'Other mod', [action('x')]);
		expect(modPickerStore.modId).toBe('other');
		expect(modPickerStore.actions.map((a) => a.id)).toEqual(['x']);
	});

	it('close empties every getter', () => {
		modPickerStore.open('hello', 'Hello mod', [action('hello')]);
		modPickerStore.close();
		expect(modPickerStore.isOpen).toBe(false);
		expect(modPickerStore.modId).toBeNull();
		expect(modPickerStore.title).toBe('');
		expect(modPickerStore.actions).toEqual([]);
	});

	it('closeForMod closes only a picker showing that mod', () => {
		modPickerStore.open('hello', 'Hello mod', [action('hello')]);
		modPickerStore.closeForMod('other');
		expect(modPickerStore.isOpen).toBe(true);

		modPickerStore.closeForMod('hello');
		expect(modPickerStore.isOpen).toBe(false);
	});

	it('closeForMod while closed changes nothing', () => {
		modPickerStore.closeForMod('hello');
		expect(modPickerStore.isOpen).toBe(false);
	});
});
