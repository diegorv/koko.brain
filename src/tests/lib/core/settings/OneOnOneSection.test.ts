// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import OneOnOneSection from '#lib/core/settings/sections/OneOnOneSection.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

// No Tauri call in this tree: the real settings store is read back after real DOM events.
describe('OneOnOneSection - 1:1 due after', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		settingsStore.reset();
		target = document.body.appendChild(document.createElement('div'));
		component = mount(OneOnOneSection, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	function dueInput(): HTMLInputElement {
		const input = target.querySelector<HTMLInputElement>('input[type="number"][data-one-on-one-due-after]');
		if (!input) throw new Error('due-after input not rendered');
		return input;
	}

	function type(raw: string) {
		const input = dueInput();
		input.value = raw;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	it('groups the rows under People, New notes and Reminders', () => {
		expect([...target.querySelectorAll('h3')].map((h) => h.textContent?.trim())).toEqual(['People', 'New notes', 'Reminders']);
		const text = target.textContent ?? '';
		const order = ['People', 'Work people folder', 'Personal people folder', 'New notes', 'Folder format', 'Filename format', 'Template path', 'Reminders', '1:1 due after (days)'].map((label) => text.indexOf(label));
		expect(order).not.toContain(-1);
		expect(order).toEqual([...order].sort((a, b) => a - b));
	});

	it('shows the default of 14 days', () => {
		expect(dueInput().value).toBe('14');
		expect(target.textContent).toContain('1:1 due after (days)');
	});

	it('writes a typed number of days to the store', () => {
		type('7');
		expect(settingsStore.oneOnOne.dueAfterDays).toBe(7);
	});

	it('keeps whole, non-negative days', () => {
		type('2.6');
		expect(settingsStore.oneOnOne.dueAfterDays).toBe(2);
		type('-3');
		expect(settingsStore.oneOnOne.dueAfterDays).toBe(0);
	});

	it('leaves the store untouched while the field is empty', () => {
		type('');
		expect(settingsStore.oneOnOne.dueAfterDays).toBe(14);
	});
});
