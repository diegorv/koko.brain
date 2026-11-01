// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { mount, unmount, flushSync } from 'svelte';
import GeneralSection from '#lib/core/settings/sections/GeneralSection.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

describe('GeneralSection - right sidebar description', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		settingsStore.reset();
		target = document.body.appendChild(document.createElement('div'));
		component = mount(GeneralSection, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	it('names only the right-sidebar panels the section can toggle', () => {
		const text = target.textContent ?? '';

		expect(text).toContain('Show the right sidebar (Properties, Backlinks, Outgoing links, Table of Contents)');
		expect(text).not.toContain('Tags');
	});
});

describe('GeneralSection - layout choice', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	function layoutSelect(): HTMLSelectElement {
		return target.querySelector<HTMLSelectElement>('select[aria-label="Layout"]')!;
	}

	function choose(value: string) {
		const select = layoutSelect();
		select.value = value;
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();
	}

	beforeEach(() => {
		settingsStore.reset();
		target = document.body.appendChild(document.createElement('div'));
		component = mount(GeneralSection, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	it('offers Classic and Rail, with Classic selected by default', () => {
		const options = [...layoutSelect().options].map((o) => [o.value, o.textContent?.trim()]);
		expect(options).toEqual([['classic', 'Classic'], ['rail', 'Rail']]);
		expect(layoutSelect().value).toBe('classic');
	});

	it('writes the chosen shell to the layout settings', () => {
		choose('rail');
		expect(settingsStore.layout.shell).toBe('rail');

		choose('classic');
		expect(settingsStore.layout.shell).toBe('classic');
	});

	it('shows a shell set elsewhere', () => {
		settingsStore.updateLayout({ shell: 'rail' });
		flushSync();
		expect(layoutSelect().value).toBe('rail');
	});
});
