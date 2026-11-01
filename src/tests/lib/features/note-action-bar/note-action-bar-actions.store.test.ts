import { describe, it, expect, beforeEach } from 'vitest';
import { noteActionBarActionsStore } from '#lib/features/note-action-bar/note-action-bar-actions.store.svelte.js';
import type { NoteHubAction } from '#lib/features/note-action-bar/note-action-bar.logic.js';

function action(id: string): NoteHubAction {
	return { id, label: id, typeName: 'Person', run: async () => {} };
}

describe('noteActionBarActionsStore', () => {
	beforeEach(() => {
		noteActionBarActionsStore.reset();
	});

	it('starts empty', () => {
		expect(noteActionBarActionsStore.actions).toEqual([]);
	});

	it('lists registered actions in registration order', () => {
		const a = action('a');
		const b = action('b');
		noteActionBarActionsStore.register(a);
		noteActionBarActionsStore.register(b);

		expect(noteActionBarActionsStore.actions).toEqual([a, b]);
	});

	it('unregister removes only its own registration and is idempotent', () => {
		const a = action('a');
		const b = action('b');
		const unregisterA = noteActionBarActionsStore.register(a);
		noteActionBarActionsStore.register(b);

		unregisterA();
		unregisterA();

		expect(noteActionBarActionsStore.actions).toEqual([b]);
	});

	it('reset drops every registration', () => {
		noteActionBarActionsStore.register(action('a'));
		noteActionBarActionsStore.reset();

		expect(noteActionBarActionsStore.actions).toEqual([]);
	});
});
