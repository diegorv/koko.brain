// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';

import { mount, unmount, flushSync } from 'svelte';
import QuickCaptureSection from '#lib/core/settings/sections/QuickCaptureSection.svelte';

describe('QuickCaptureSection', () => {
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function render(): HTMLElement {
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(QuickCaptureSection, { target });
		flushSync();
		return target;
	}

	it('leaves the dock badge to the Layout page', () => {
		const root = render();

		expect(root.textContent).not.toContain('Show inbox count on dock');
		expect([...root.querySelectorAll('h3')].map((h) => h.textContent?.trim())).toEqual(['Templates by kind']);
	});

	it('keeps the capture settings', () => {
		const text = render().textContent ?? '';

		expect(text).toContain('Folder format');
		expect(text).toContain('Filename format');
	});
});
