// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';

import SettingsPanel, { sectionComponents } from '#lib/app/SettingsPanel.svelte';
import { SETTINGS_SECTION_GROUPS } from '#lib/core/settings/settings.logic.js';
import { settingsPanelStore } from '#lib/core/settings/settings-panel.store.svelte.js';

// The content ScrollArea observes its size; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

/** Every section id the settings sidebar can navigate to, in nav order. */
const navIds = SETTINGS_SECTION_GROUPS.flatMap((g) => g.sections.map((s) => s.id));

describe('sectionComponents', () => {
	it('resolves every navigable section to a component', () => {
		for (const id of navIds) {
			expect(sectionComponents[id], `no component mapped for section "${id}"`).toBeDefined();
		}
	});

	it('has no entry for a section the sidebar does not expose', () => {
		expect(Object.keys(sectionComponents).sort()).toEqual([...navIds].sort());
	});

	it('maps every section to a distinct component', () => {
		const mapped = navIds.map((id) => sectionComponents[id]);
		expect(new Set(mapped).size).toBe(navIds.length);
	});
});

describe('SettingsPanel type scale', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		settingsPanelStore._reset();
		settingsPanelStore.open('templates');
		target = document.body.appendChild(document.createElement('div'));
		component = mount(SettingsPanel, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		settingsPanelStore._reset();
		document.body.innerHTML = '';
	});

	it('sets the panel title at the section title size, above the nav items', () => {
		const panelTitle = [...target.querySelectorAll('nav h2')].find((el) => el.textContent === 'Settings')!;
		const sectionTitle = [...target.querySelectorAll('h2')].find((el) => el.textContent === 'Templates')!;
		for (const cls of ['text-lg', 'font-semibold']) {
			expect(panelTitle.classList).toContain(cls);
			expect(sectionTitle.classList).toContain(cls);
		}
		const navItems = [...target.querySelectorAll<HTMLElement>('nav button')].filter((el) => el.textContent?.trim());
		expect(navItems).toHaveLength(navIds.length);
		for (const item of navItems) {
			expect(item.classList).toContain('text-row');
			expect(item.classList).not.toContain('text-lg');
		}
	});

	it('labels the nav groups with the section label', () => {
		const groups = [...target.querySelectorAll('nav h3')];
		expect(groups.map((el) => el.textContent?.trim())).toEqual(SETTINGS_SECTION_GROUPS.map((g) => g.group));
		for (const group of groups) expect(group.classList).toContain('section-label');
	});
});
