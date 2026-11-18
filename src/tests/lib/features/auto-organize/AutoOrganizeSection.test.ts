// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import AutoOrganizeSection from '#lib/features/auto-organize/AutoOrganizeSection.svelte';
import { autoOrganizeStore } from '#lib/features/auto-organize/auto-organize.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

describe('AutoOrganizeSection', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		autoOrganizeStore.reset();
		settingsStore.reset();
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(AutoOrganizeSection, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		autoOrganizeStore.reset();
		settingsStore.reset();
	});

	/** The debounce field, shown in seconds; the only number input in the section. */
	function debounceInput(): HTMLInputElement {
		const input = document.querySelector<HTMLInputElement>('input[type="number"]');
		if (!input) throw new Error('debounce input not rendered');
		return input;
	}

	/** Types a raw value, exactly as a keystroke does. */
	function type(input: HTMLInputElement, raw: string) {
		input.value = raw;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	/** Commits the typed value the way Enter or a focus change does. */
	function commit(input: HTMLInputElement) {
		input.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();
	}

	it('creates a new rule disabled, so it acts on no save while it is being written', () => {
		[...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Add rule')!.click();
		flushSync();

		expect(autoOrganizeStore.rules).toHaveLength(1);
		expect(autoOrganizeStore.rules[0].enabled).toBe(false);
		expect(autoOrganizeStore.enabledRules).toEqual([]);
		expect(document.querySelectorAll('[data-rule-property]')).toHaveLength(0);
	});

	it('writes the debounce while typing only when it is in range, and clamps on commit', () => {
		const input = debounceInput();
		expect(settingsStore.autoOrganize.debounceMs).toBe(3000);
		type(input, '');
		expect(settingsStore.autoOrganize.debounceMs).toBe(3000);
		type(input, '0');
		expect(settingsStore.autoOrganize.debounceMs).toBe(3000);
		type(input, '2');
		expect(settingsStore.autoOrganize.debounceMs).toBe(2000);
		type(input, '45');
		expect(settingsStore.autoOrganize.debounceMs).toBe(2000);
		commit(input);
		expect(settingsStore.autoOrganize.debounceMs).toBe(30000);
		expect(input.value).toBe('30');
	});

	it('keeps the stored debounce and restores the field on an empty commit', () => {
		const input = debounceInput();
		type(input, '');
		commit(input);
		expect(settingsStore.autoOrganize.debounceMs).toBe(3000);
		expect(input.value).toBe('3');
	});
});
