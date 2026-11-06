// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('#lib/core/editor/editor.service.js', () => ({ openFileInEditor: vi.fn() }));

import { mount, unmount, flushSync } from 'svelte';
import CalendarDays from '@lucide/svelte/icons/calendar-days';
import LayoutSection from '#lib/features/rail-shell/LayoutSection.svelte';
import Rail from '#lib/features/rail-shell/Rail.svelte';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

describe('LayoutSection', () => {
	let page: HTMLElement;
	let rail: HTMLElement;
	const mounted: Record<string, unknown>[] = [];

	function mountBoth() {
		mounted.push(mount(LayoutSection, { target: page }));
		mounted.push(mount(Rail, { target: rail, props: { activeItem: 'inbox', onSelect: vi.fn() } }));
		flushSync();
	}

	const row = (key: string) => page.querySelector<HTMLElement>(`[data-rail-setting="${key}"]`)!;
	const toggle = (key: string) => row(key).querySelector<HTMLButtonElement>('[role="switch"]');
	const moveButton = (key: string, dir: 'up' | 'down') =>
		[...row(key).querySelectorAll<HTMLButtonElement>('button')].find((b) => b.getAttribute('aria-label')?.endsWith(` ${dir}`)) ?? null;
	const railKeys = () => [...rail.querySelectorAll('[data-rail-item]')].map((el) => el.getAttribute('data-rail-item'));
	const groupKeys = () =>
		[...page.querySelectorAll('h3')].map((h) => {
			const keys: string[] = [];
			for (let el = h.nextElementSibling; el && el.tagName !== 'H3'; el = el.nextElementSibling) {
				const key = el.getAttribute('data-rail-setting');
				if (key) keys.push(key);
			}
			return [h.textContent?.trim(), keys];
		});

	beforeEach(() => {
		vaultStore._reset();
		vaultStore.open('/vault');
		typeDefinitionsStore.reset();
		settingsStore.reset();
		railRegistryStore.reset();
		railRegistryStore.registerNavigator({
			id: 'calendar',
			label: 'Calendar',
			icon: CalendarDays,
			component: CalendarDays,
			lens: () => ({ kind: 'day' }),
		});
		page = document.body.appendChild(document.createElement('div'));
		rail = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		for (const c of mounted.splice(0)) unmount(c);
		document.body.innerHTML = '';
		railRegistryStore.reset();
	});

	it('lists every rail item per group, the registered navigator included, then the badges and the right sidebar', () => {
		mountBoth();
		expect(page.querySelector('h2')?.textContent).toBe('Layout');
		expect(groupKeys()).toEqual([
			['Rail top', ['search', 'inbox', 'today', 'favorites']],
			['Rail navigators', ['types', 'calendar', 'files']],
			['Rail bottom', ['archive']],
			['Inbox badges', []],
			['Right sidebar', []],
		]);
		expect(page.textContent).toContain('Show Inbox count on the rail');
	});

	it('offers no visibility switch for Search and Today, and no move for Search', () => {
		mountBoth();
		expect(toggle('search')).toBeNull();
		expect(toggle('today')).toBeNull();
		expect(row('search').querySelectorAll('button')).toHaveLength(0);
		expect(moveButton('today', 'up')).not.toBeNull();
		expect(toggle('calendar')?.getAttribute('aria-label')).toBe('Show Calendar');
		expect(moveButton('calendar', 'up')?.getAttribute('aria-label')).toBe('Move Calendar up');
		for (const key of ['inbox', 'favorites', 'types', 'calendar', 'files', 'archive']) {
			expect(toggle(key)?.getAttribute('aria-checked')).toBe('true');
			expect(moveButton(key, 'up')?.tagName).toBe('BUTTON');
			expect(moveButton(key, 'down')?.tagName).toBe('BUTTON');
		}
	});

	it('disables the moves past a group end and above Search', () => {
		mountBoth();
		expect(moveButton('inbox', 'up')!.disabled).toBe(true);
		expect(moveButton('favorites', 'down')!.disabled).toBe(true);
		expect(moveButton('types', 'up')!.disabled).toBe(true);
		expect(moveButton('files', 'down')!.disabled).toBe(true);
		expect(moveButton('archive', 'up')!.disabled).toBe(true);
		expect(moveButton('calendar', 'up')!.disabled).toBe(false);
	});

	it('hides an item from the rail and shows it again, without a reload', () => {
		mountBoth();
		toggle('calendar')!.click();
		flushSync();
		expect(settingsStore.layout.railHidden).toEqual(['calendar']);
		expect(toggle('calendar')!.getAttribute('aria-checked')).toBe('false');
		expect(railKeys()).not.toContain('calendar');
		expect(groupKeys()[1]).toEqual(['Rail navigators', ['types', 'calendar', 'files']]);

		toggle('calendar')!.click();
		flushSync();
		expect(settingsStore.layout.railHidden).toEqual([]);
		expect(railKeys()).toContain('calendar');
	});

	it('moves an item within its group, writing the full order of the listed items, and the rail follows', () => {
		mountBoth();
		moveButton('files', 'up')!.click();
		flushSync();
		expect(settingsStore.layout.railOrder).toEqual(['search', 'inbox', 'today', 'favorites', 'types', 'files', 'calendar', 'archive']);
		expect(railKeys()).toEqual(['search', 'inbox', 'today', 'favorites', 'types', 'files', 'calendar', 'archive']);
		expect(groupKeys()[1]).toEqual(['Rail navigators', ['types', 'files', 'calendar']]);

		moveButton('today', 'up')!.click();
		flushSync();
		expect(railKeys().slice(0, 4)).toEqual(['search', 'today', 'inbox', 'favorites']);
	});

	it('turns the rail Inbox badge off and on, leaving the dock badge switch alone', () => {
		typeDefinitionsStore.setEntries([entryV2('/vault/a.md')]);
		mountBoth();
		const badgeSwitch = page.querySelector<HTMLButtonElement>('[aria-label="Show Inbox count on the rail"]')!;
		expect(rail.querySelector('[data-rail-badge]')?.textContent).toBe('1');

		badgeSwitch.click();
		flushSync();
		expect(settingsStore.layout.railInboxBadge).toBe(false);
		expect(rail.querySelector('[data-rail-badge]')).toBeNull();
		expect(settingsStore.dockBadgeInboxCount).toBe(true);

		badgeSwitch.click();
		flushSync();
		expect(settingsStore.layout.railInboxBadge).toBe(true);
		expect(rail.querySelector('[data-rail-badge]')?.textContent).toBe('1');
	});

	/** The labels of the setting rows between the heading `heading` and the next one. */
	function rowLabelsUnder(heading: string): (string | undefined)[] {
		const start = [...page.querySelectorAll('h3')].find((h) => h.textContent?.trim() === heading)!;
		const labels: (string | undefined)[] = [];
		for (let el = start.nextElementSibling; el && el.tagName !== 'H3'; el = el.nextElementSibling) {
			labels.push(el.querySelector('span')?.textContent ?? undefined);
		}
		return labels;
	}

	it('keeps both inbox badges in one group', () => {
		mountBoth();
		expect(rowLabelsUnder('Inbox badges')).toEqual(['Show Inbox count on the rail', 'Show inbox count on dock']);
	});

	it('lists the right sidebar switch first in its group, above the panels', () => {
		mountBoth();
		expect(rowLabelsUnder('Right sidebar')).toEqual(['Show right sidebar', 'Properties', 'Backlinks', 'Outgoing links', 'Table of contents']);
	});

	it('turns the dock badge off and on from the same group, leaving the rail badge alone', () => {
		mountBoth();
		const dockSwitch = page.querySelector<HTMLButtonElement>('[aria-label="Show inbox count on dock"]')!;

		dockSwitch.click();
		flushSync();
		expect(settingsStore.dockBadgeInboxCount).toBe(false);
		expect(settingsStore.layout.railInboxBadge).toBe(true);

		dockSwitch.click();
		flushSync();
		expect(settingsStore.dockBadgeInboxCount).toBe(true);
	});

	it('no longer points the rail badge at another page', () => {
		mountBoth();
		expect(page.textContent).not.toContain('under Quick Capture');
	});

	it('shows and hides the right sidebar and each of its panels', () => {
		mountBoth();
		const switchOf = (label: string) => {
			const rowEl = [...page.querySelectorAll<HTMLElement>('.bg-setting-item-bg')].find(
				(el) => el.querySelector('span')?.textContent === label,
			);
			const control = rowEl?.querySelector<HTMLButtonElement>('[role="switch"]');
			if (!control) throw new Error(`no switch for "${label}"`);
			return control;
		};
		const flips: [string, () => boolean][] = [
			['Show right sidebar', () => settingsStore.layout.rightSidebarVisible],
			['Properties', () => settingsStore.layout.propertiesVisible],
			['Backlinks', () => settingsStore.layout.backlinksVisible],
			['Outgoing links', () => settingsStore.layout.outgoingLinksVisible],
			['Table of contents', () => settingsStore.layout.tableOfContentsVisible],
		];
		for (const [label, read] of flips) {
			const before = read();
			switchOf(label).click();
			flushSync();
			expect(read(), label).toBe(!before);
		}
	});

	it('names only the right-sidebar panels the page can toggle', () => {
		mountBoth();
		const text = page.textContent ?? '';
		expect(text).toContain('Show the right sidebar (Properties, Backlinks, Outgoing links, Table of contents)');
		expect(text).not.toContain('Tags');
	});

	it('names the outline panel in sentence case, like its panel title', () => {
		mountBoth();
		const text = page.textContent ?? '';
		expect(text).toContain('Table of contents');
		expect(text).not.toContain('Table of Contents');
	});

	describe('rail style and collapse', () => {
		const picker = () => page.querySelector<HTMLElement>('[data-rail-style-picker]')!;
		const styleButton = (name: string) => [...picker().querySelectorAll('button')].find((b) => b.textContent?.trim() === name)!;
		const collapseSwitch = () => page.querySelector<HTMLButtonElement>('[role="switch"][aria-label="Collapse rail"]')!;
		const railForm = () => rail.querySelector('[data-rail]')!.getAttribute('data-rail-form');
		const labelsAboveFirstHeading = () => {
			const labels: (string | null | undefined)[] = [];
			for (let el = page.querySelector('h2')!.nextElementSibling; el && el.tagName !== 'H3'; el = el.nextElementSibling) {
				labels.push(el.querySelector('span')?.textContent);
			}
			return labels;
		};

		it('sits above the first heading, with no heading of its own', () => {
			mountBoth();
			expect(labelsAboveFirstHeading()).toEqual(['Rail style', 'Collapse rail']);
			expect(page.querySelector('h3')!.textContent?.trim()).toBe('Rail top');
		});

		it('gives every heading the top margin, now that rows sit above the first', () => {
			mountBoth();
			for (const heading of page.querySelectorAll('h3')) expect(heading.classList).toContain('mt-6');
		});

		it('shows both styles, and aria-pressed follows the real store', () => {
			mountBoth();
			expect([...picker().querySelectorAll('button')].map((b) => b.textContent?.trim())).toEqual(['Labeled', 'Captioned']);
			expect(styleButton('Labeled').getAttribute('aria-pressed')).toBe('true');
			expect(styleButton('Captioned').getAttribute('aria-pressed')).toBe('false');

			settingsStore.updateLayout({ railStyle: 'captioned' });
			flushSync();
			expect(styleButton('Labeled').getAttribute('aria-pressed')).toBe('false');
			expect(styleButton('Captioned').getAttribute('aria-pressed')).toBe('true');
		});

		it('presses Labeled for a hand-edited unknown style', () => {
			settingsStore.updateLayout({ railStyle: 'B' as unknown as 'labeled' });
			mountBoth();
			expect(styleButton('Labeled').getAttribute('aria-pressed')).toBe('true');
			expect(styleButton('Captioned').getAttribute('aria-pressed')).toBe('false');
		});

		it('writes the real store on a click, and the rail and description follow', () => {
			mountBoth();
			expect(page.textContent).toContain('Titles, sections and counts; drag the edge to resize');

			styleButton('Captioned').click();
			flushSync();
			expect(settingsStore.layout.railStyle).toBe('captioned');
			expect(railForm()).toBe('captioned');
			expect(page.textContent).toContain('A caption under each icon');
			expect(page.textContent).not.toContain('Titles, sections and counts');

			styleButton('Labeled').click();
			flushSync();
			expect(settingsStore.layout.railStyle).toBe('labeled');
			expect(railForm()).toBe('labeled');
		});

		it('the switch follows and writes the real store, leaving the style alone', () => {
			settingsStore.updateLayout({ railStyle: 'captioned' });
			mountBoth();
			expect(page.textContent).toContain('Show the small rail with colored icons. The toggle next to the window controls does the same.');
			expect(collapseSwitch().getAttribute('aria-checked')).toBe('false');

			collapseSwitch().click();
			flushSync();
			expect(settingsStore.layout.railCollapsed).toBe(true);
			expect(settingsStore.layout.railStyle).toBe('captioned');
			expect(railForm()).toBe('collapsed');
			expect(collapseSwitch().getAttribute('aria-checked')).toBe('true');

			settingsStore.updateLayout({ railCollapsed: false });
			flushSync();
			expect(collapseSwitch().getAttribute('aria-checked')).toBe('false');
			expect(railForm()).toBe('captioned');
		});
	});

	it('offers no Classic or Rail layout picker', () => {
		mountBoth();
		expect(page.querySelector('select[aria-label="Layout"]')).toBeNull();
		expect(page.textContent ?? '').not.toContain('Classic');
	});
});
