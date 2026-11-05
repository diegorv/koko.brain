// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';

(globalThis as Record<string, unknown>).__APP_CHANNEL__ = 'stable';
(globalThis as Record<string, unknown>).__BUILD_INFO__ = '9.9.9 (abc1234) (test)';

vi.mock('#lib/utils/log.service.js');

import { mount, unmount, flushSync } from 'svelte';
import TroubleshootingSection from '#lib/core/settings/sections/TroubleshootingSection.svelte';

describe('TroubleshootingSection', () => {
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function render(): HTMLElement {
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(TroubleshootingSection, { target });
		flushSync();
		return target;
	}

	it('leaves the build info to the Update page', () => {
		const root = render();

		expect(root.textContent).not.toContain('9.9.9 (abc1234) (test)');
		expect([...root.querySelectorAll('h3')].map((h) => h.textContent?.trim())).not.toContain('About');
	});

	it('starts with the Frontend group and keeps the others', () => {
		const headings = [...render().querySelectorAll('h3')].map((h) => h.textContent?.trim());

		expect(headings).toEqual(['Frontend', 'Live Preview', 'Backend (Tauri)']);
	});
});
