import { describe, it, expect, beforeEach } from 'vitest';
import { templatesStore } from '$lib/plugins/templates/templates.store.svelte';

describe('templatesStore', () => {
	beforeEach(() => {
		templatesStore.reset();
	});

	it('starts closed with empty templates', () => {
		expect(templatesStore.isOpen).toBe(false);
		expect(templatesStore.templates).toEqual([]);
	});

	it('open sets isOpen to true', () => {
		templatesStore.open();
		expect(templatesStore.isOpen).toBe(true);
	});

	it('close sets isOpen to false', () => {
		templatesStore.open();
		templatesStore.close();
		expect(templatesStore.isOpen).toBe(false);
	});

	it('toggle flips isOpen', () => {
		templatesStore.toggle();
		expect(templatesStore.isOpen).toBe(true);
		templatesStore.toggle();
		expect(templatesStore.isOpen).toBe(false);
	});

	it('setTemplates replaces templates list', () => {
		const templates = [{ title: 'Daily', path: '/templates/daily.md' }] as any;
		templatesStore.setTemplates(templates);
		expect(templatesStore.templates).toBe(templates);
	});

	it('reset clears all state', () => {
		templatesStore.open();
		templatesStore.setTemplates([{ title: 'A' }] as any);

		templatesStore.reset();

		expect(templatesStore.isOpen).toBe(false);
		expect(templatesStore.templates).toEqual([]);
	});
});
