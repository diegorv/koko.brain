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

// Closing the panel runs its `fly` outro through Element.animate, which jsdom
// lacks. The stub never finishes, so the outro just stays pending.
Element.prototype.animate ??= function () {
	return { onfinish: null, cancel() {}, effect: null, playState: 'running' };
} as unknown as Element['animate'];

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
		settingsPanelStore.open('files');
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
		const sectionTitle = [...target.querySelectorAll('h2')].find((el) => el.textContent === 'Files & Folders')!;
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

describe('SettingsPanel chrome', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	/** Nav buttons that name a section (the panel title row holds no button). */
	const navItems = () => [...target.querySelectorAll<HTMLElement>('nav button')].filter((el) => el.textContent?.trim());

	beforeEach(() => {
		settingsPanelStore._reset();
		settingsPanelStore.open('files');
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

	it('marks only the active section as the current page and follows section changes', () => {
		let current = navItems().filter((el) => el.getAttribute('aria-current') === 'page');
		expect(current).toHaveLength(1);
		expect(current[0].textContent?.trim()).toBe('Files & Folders');

		settingsPanelStore.setSection('editor');
		flushSync();

		current = navItems().filter((el) => el.getAttribute('aria-current') === 'page');
		expect(current).toHaveLength(1);
		expect(current[0].textContent?.trim()).toBe('Editor');
	});

	it('styles the selected item apart from the hover state', () => {
		const items = navItems();
		const selected = items.find((el) => el.getAttribute('aria-current') === 'page')!;
		const others = items.filter((el) => el !== selected);
		expect(others.length).toBeGreaterThan(0);

		expect(selected.classList).toContain('font-medium');
		expect([...selected.classList].filter((cls) => cls.startsWith('!'))).toEqual([]);
		expect(selected.classList).not.toContain('hover:bg-settings-hover-bg/60');
		for (const item of others) {
			expect(item.classList).toContain('hover:bg-settings-hover-bg/60');
			expect(item.classList).not.toContain('font-medium');
		}
	});

	it('puts a shadcn close button outside the nav that closes the panel', () => {
		const close = target.querySelector<HTMLButtonElement>('button[aria-label="Close settings"]')!;
		expect(close).not.toBeNull();
		expect(close.closest('nav')).toBeNull();
		expect(close.dataset.slot).toBe('button');

		close.click();
		flushSync();

		expect(settingsPanelStore.isOpen).toBe(false);
	});

	it('sizes and places the panel without inline bottom or width styles', () => {
		const root = target.querySelector<HTMLElement>('[role="dialog"][aria-label="Settings"]')!;
		expect(root).not.toBeNull();
		expect(root.style.bottom).toBe('');
		expect(root.style.width).toBe('');
	});
});
