// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import AutoOrganizeSection from '#lib/features/auto-organize/AutoOrganizeSection.svelte';
import { autoOrganizeStore } from '#lib/features/auto-organize/auto-organize.store.svelte.js';

describe('AutoOrganizeSection', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		autoOrganizeStore.reset();
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(AutoOrganizeSection, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		autoOrganizeStore.reset();
	});

	it('creates a new rule disabled, so it acts on no save while it is being written', () => {
		[...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Add rule')!.click();
		flushSync();

		expect(autoOrganizeStore.rules).toHaveLength(1);
		expect(autoOrganizeStore.rules[0].enabled).toBe(false);
		expect(autoOrganizeStore.enabledRules).toEqual([]);
		expect(document.querySelectorAll('[data-rule-property]')).toHaveLength(0);
	});
});
