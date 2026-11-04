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

		expect(text).toContain('Show the right sidebar (Properties, Backlinks, Outgoing links, Table of contents)');
		expect(text).not.toContain('Tags');
	});

	it('names the outline panel in sentence case, like its panel title', () => {
		const text = target.textContent ?? '';

		expect(text).toContain('Table of contents');
		expect(text).not.toContain('Table of Contents');
	});
});

describe('GeneralSection - no layout choice', () => {
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

	it('offers no Classic or Rail layout picker', () => {
		expect(target.querySelector('select[aria-label="Layout"]')).toBeNull();
		expect(target.textContent ?? '').not.toContain('Classic');
	});
});
