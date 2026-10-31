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
