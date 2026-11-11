// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import AutoMoveSection from '#lib/features/auto-move/AutoMoveSection.svelte';
import { autoMoveStore } from '#lib/features/auto-move/auto-move.store.svelte.js';

describe('AutoMoveSection', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		autoMoveStore.reset();
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(AutoMoveSection, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		autoMoveStore.reset();
	});

	it('creates a new rule disabled, so it acts on no save while it is being written', () => {
		[...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Add rule')!.click();
		flushSync();

		expect(autoMoveStore.rules).toHaveLength(1);
		expect(autoMoveStore.rules[0].enabled).toBe(false);
		expect(autoMoveStore.enabledRules).toEqual([]);
		expect(document.querySelectorAll('[data-rule-property]')).toHaveLength(0);
	});
});
