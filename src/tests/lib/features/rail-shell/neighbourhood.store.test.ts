import { describe, it, expect, beforeEach } from 'vitest';
import { neighbourhoodStore } from '#lib/features/rail-shell/neighbourhood.store.svelte.js';

describe('neighbourhoodStore', () => {
	beforeEach(() => {
		neighbourhoodStore.reset();
	});

	it('starts with no note', () => {
		expect(neighbourhoodStore.notePath).toBeNull();
	});

	it('keeps the note the neighbourhood was opened on', () => {
		neighbourhoodStore.setNotePath('/vault/a.md');
		expect(neighbourhoodStore.notePath).toBe('/vault/a.md');
		neighbourhoodStore.setNotePath('/vault/b.md');
		expect(neighbourhoodStore.notePath).toBe('/vault/b.md');
	});

	it('reset clears the note', () => {
		neighbourhoodStore.setNotePath('/vault/a.md');
		neighbourhoodStore.reset();
		expect(neighbourhoodStore.notePath).toBeNull();
	});
});
