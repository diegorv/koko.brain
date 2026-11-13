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

	describe('input step', () => {
		const idea: ModPickerAction = { ...action('idea'), input: { placeholder: 'Describe the idea' } };

		it('has no input action while closed or on the action list', () => {
			expect(modPickerStore.inputAction).toBeNull();
			modPickerStore.open('hello', 'Hello mod', [idea]);
			expect(modPickerStore.inputAction).toBeNull();
		});

		it('askInput moves the open picker to the input step of that action', () => {
			modPickerStore.open('hello', 'Hello mod', [idea]);

			modPickerStore.askInput(idea);

			expect(modPickerStore.isOpen).toBe(true);
			expect(modPickerStore.inputAction).toBe(idea);
			expect(modPickerStore.modId).toBe('hello');
		});

		it('askInput while closed changes nothing', () => {
			modPickerStore.askInput(idea);
			expect(modPickerStore.isOpen).toBe(false);
			expect(modPickerStore.inputAction).toBeNull();
		});

		it('close, closeForMod and a new open leave the input step', () => {
			modPickerStore.open('hello', 'Hello mod', [idea]);
			modPickerStore.askInput(idea);
			modPickerStore.close();
			expect(modPickerStore.inputAction).toBeNull();

			modPickerStore.open('hello', 'Hello mod', [idea]);
			modPickerStore.askInput(idea);
			modPickerStore.closeForMod('hello');
			expect(modPickerStore.inputAction).toBeNull();

			modPickerStore.open('hello', 'Hello mod', [idea]);
			modPickerStore.askInput(idea);
			modPickerStore.open('hello', 'Hello mod', [idea]);
			expect(modPickerStore.inputAction).toBeNull();
		});
	});

	describe('run view', () => {
		const KEY = 'mod:hello:action:idea';

		it('has no run key while closed or on the action list', () => {
			expect(modPickerStore.runKey).toBeNull();
			modPickerStore.open('hello', 'Hello mod', [action('hello')]);
			expect(modPickerStore.runKey).toBeNull();
		});

		it('showRun opens the run view of an action, from the input step or while closed', () => {
			const idea: ModPickerAction = { ...action('idea'), input: {} };
			modPickerStore.open('hello', 'Hello mod', [idea]);
			modPickerStore.askInput(idea);

			modPickerStore.showRun('hello', KEY);

			expect(modPickerStore.isOpen).toBe(true);
			expect(modPickerStore.runKey).toBe(KEY);
			expect(modPickerStore.modId).toBe('hello');
			expect(modPickerStore.inputAction).toBeNull();

			modPickerStore.close();
			modPickerStore.showRun('hello', KEY);
			expect(modPickerStore.isOpen).toBe(true);
			expect(modPickerStore.runKey).toBe(KEY);
		});

		it('closeForMod keeps a run view open, so it shows how the run ended', () => {
			modPickerStore.showRun('hello', KEY);

			modPickerStore.closeForMod('hello');

			expect(modPickerStore.runKey).toBe(KEY);
		});

		it('close and a new open leave the run view', () => {
			modPickerStore.showRun('hello', KEY);
			modPickerStore.close();
			expect(modPickerStore.runKey).toBeNull();

			modPickerStore.showRun('hello', KEY);
			modPickerStore.open('hello', 'Hello mod', [action('hello')]);
			expect(modPickerStore.runKey).toBeNull();
		});
	});
});
