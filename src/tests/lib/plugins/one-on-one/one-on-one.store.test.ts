import { describe, it, expect, beforeEach } from 'vitest';
import { oneOnOneStore } from '$lib/plugins/one-on-one/one-on-one.store.svelte';

describe('oneOnOneStore', () => {
	beforeEach(() => {
		oneOnOneStore.reset();
	});

	it('starts closed with empty people', () => {
		expect(oneOnOneStore.isOpen).toBe(false);
		expect(oneOnOneStore.people).toEqual([]);
	});

	it('open sets isOpen to true', () => {
		oneOnOneStore.open();
		expect(oneOnOneStore.isOpen).toBe(true);
	});

	it('close sets isOpen to false', () => {
		oneOnOneStore.open();
		oneOnOneStore.close();
		expect(oneOnOneStore.isOpen).toBe(false);
	});

	it('toggle flips isOpen', () => {
		oneOnOneStore.toggle();
		expect(oneOnOneStore.isOpen).toBe(true);
		oneOnOneStore.toggle();
		expect(oneOnOneStore.isOpen).toBe(false);
	});

	it('setPeople replaces people list', () => {
		const people = [{ name: 'Alice', path: '/people/Alice.md' }] as any;
		oneOnOneStore.setPeople(people);
		expect(oneOnOneStore.people).toBe(people);
	});

	it('reset clears all state', () => {
		oneOnOneStore.open();
		oneOnOneStore.setPeople([{ name: 'A' }] as any);

		oneOnOneStore.reset();

		expect(oneOnOneStore.isOpen).toBe(false);
		expect(oneOnOneStore.people).toEqual([]);
	});
});
