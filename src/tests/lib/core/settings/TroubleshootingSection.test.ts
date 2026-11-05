// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';

(globalThis as Record<string, unknown>).__APP_CHANNEL__ = 'stable';
(globalThis as Record<string, unknown>).__BUILD_INFO__ = '9.9.9 (abc1234) (test)';

vi.mock('#lib/utils/log.service.js');

import { mount, unmount, flushSync } from 'svelte';
import TroubleshootingSection from '#lib/core/settings/sections/TroubleshootingSection.svelte';
import { DECORATOR_LABELS, DECORATOR_NAMES } from '#lib/core/markdown-editor/extensions/live-preview/core/decorator-names.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

describe('TroubleshootingSection', () => {
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	/** The rows between the heading `heading` and the next one. */
	function rowsUnder(root: HTMLElement, heading: string): HTMLElement[] {
		const start = [...root.querySelectorAll('h3')].find((h) => h.textContent?.trim() === heading)!;
		const rows: HTMLElement[] = [];
		for (let el = start.nextElementSibling; el && el.tagName !== 'H3'; el = el.nextElementSibling) {
			if (el.classList.contains('bg-setting-item-bg')) rows.push(el as HTMLElement);
		}
		return rows;
	}

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

		expect(headings).toEqual(['Frontend', 'Live preview', 'Live preview decorators', 'Backend (Tauri)']);
	});

	it('labels every decorator switch with a readable name, under its own heading', () => {
		const labels = rowsUnder(render(), 'Live preview decorators').map((row) => row.querySelector('span')?.textContent);

		expect(labels).toEqual(DECORATOR_NAMES.map((name) => DECORATOR_LABELS[name]));
		expect(labels).toHaveLength(22);
		for (const name of DECORATOR_NAMES) expect(labels).not.toContain(name);
	});

	it('names each decorator switch for assistive technology', () => {
		const root = render();

		for (const name of DECORATOR_NAMES) {
			expect(root.querySelector(`[role="switch"][aria-label="${DECORATOR_LABELS[name]}"]`), name).not.toBeNull();
		}
	});

	it('keeps the persisted key when a decorator is turned off by its readable name', () => {
		const root = render();

		root.querySelector<HTMLButtonElement>('[aria-label="Math blocks"]')!.click();
		flushSync();

		expect(settingsStore.disabledDecorators.blockMath).toBe(true);
	});

	it('says what the switches do, without a restart claim or internal log tags', () => {
		const text = render().textContent ?? '';

		expect(text).toContain('Turn one off to isolate a rendering problem. A change applies the next time a note opens.');
		expect(text).not.toContain('require app restart');
		expect(text).not.toContain('[HB]');
	});

	it('shortens the Heartbeat row and names the log folder action', () => {
		const root = render();
		const text = root.textContent ?? '';

		expect(text).toContain('Log a tick every 250 ms, UI and main-thread stalls, and click-to-paint time. Needs a log file. Leave off unless you are chasing a stall.');
		expect([...root.querySelectorAll('button')].map((b) => b.textContent?.trim())).toContain('Show in Finder');
	});
});
