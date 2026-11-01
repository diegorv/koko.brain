// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Rail from '#lib/features/rail-shell/Rail.svelte';
import { ARCHIVE_LENS, FAVORITES_LENS, INBOX_LENS } from '#lib/features/rail-shell/lens.logic.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { excludeSystemFolder } from '#lib/features/type-definitions/type-sidebar.logic.js';
import { dockBadgeCount } from '#lib/features/dock-badge/dock-badge.logic.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

describe('Rail', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	const onSelect = vi.fn();

	function mountRail(activeItem = 'inbox') {
		component = mount(Rail, { target, props: { activeItem, onSelect } });
		flushSync();
	}

	const inbox = () => target.querySelector<HTMLButtonElement>('[data-rail-item="inbox"]')!;
	const badge = () => target.querySelector('[data-rail-badge]');

	beforeEach(() => {
		vaultStore._reset();
		vaultStore.open('/vault');
		typeDefinitionsStore.reset();
		settingsStore.reset();
		onSelect.mockReset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('holds Inbox, Favorites and Archive in PRD order, each with an accessible name', () => {
		mountRail();
		expect([...target.querySelectorAll('[data-rail-item]')].map((el) => el.getAttribute('aria-label'))).toEqual([
			'Inbox',
			'Favorites',
			'Archive',
		]);
	});

	it('pins Archive to the bottom of the rail', () => {
		mountRail();
		const bottom = target.querySelector('[data-rail-bottom]')!;
		expect(bottom.className).toContain('mt-auto');
		expect([...bottom.querySelectorAll('[data-rail-item]')].map((el) => el.getAttribute('data-rail-item'))).toEqual(['archive']);
		expect(bottom.parentElement).toBe(target.querySelector('[data-rail]'));
	});

	it('styles every item with the region tokens and highlights only the active one', () => {
		mountRail('favorites');
		for (const key of ['inbox', 'favorites', 'archive']) {
			const button = target.querySelector<HTMLButtonElement>(`[data-rail-item="${key}"]`)!;
			const active = key === 'favorites';
			expect(button.getAttribute('aria-current')).toBe(active ? 'page' : null);
			expect(button.className).toContain(active ? 'text-file-explorer-primary' : 'text-file-explorer-fg/70');
			expect(button.className).not.toMatch(/#[0-9a-f]{3,6}|rgb\(/i);
		}
	});

	it('shows the count badge only on Inbox', () => {
		typeDefinitionsStore.setEntries([
			entryV2('/vault/a.md', { favorite: true }),
			entryV2('/vault/b.md', { archived: true }),
		]);
		mountRail();
		const badges = [...target.querySelectorAll('[data-rail-badge]')];
		expect(badges).toHaveLength(1);
		expect(badges[0].closest('[data-rail-item]')?.getAttribute('data-rail-item')).toBe('inbox');
	});

	it('starts with a window drag strip that leaves room for the traffic lights', () => {
		mountRail();
		const nav = target.querySelector('[data-rail]')!;
		const strip = nav.firstElementChild as HTMLElement;
		expect(strip.hasAttribute('data-tauri-drag-region')).toBe(true);
		expect(strip.className).toContain('h-10');
	});

	it('uses the app background and highlights the active item', () => {
		mountRail('inbox');
		expect(target.querySelector('[data-rail]')!.className).toContain('bg-background');
		expect(inbox().getAttribute('aria-current')).toBe('page');
		// Same pairing as the classic nav selection; the accent background drops under 3:1 in the Zettlr light themes.
		expect(inbox().className).toContain('bg-file-explorer-primary/25 text-file-explorer-primary');
	});

	it('does not highlight Inbox when another item is active', () => {
		mountRail('today');
		expect(inbox().hasAttribute('aria-current')).toBe(false);
		expect(inbox().className).not.toContain('bg-file-explorer-primary/25');
	});

	it('shows the same count as the dock badge', () => {
		const entries = [
			entryV2('/vault/a.md'),
			entryV2('/vault/b.md'),
			entryV2('/vault/done.md', { organized: true }),
			entryV2('/vault/Types/Project.md', { isA: 'Type' }),
			entryV2('/vault/_system/templates/Daily.md'),
		];
		typeDefinitionsStore.setEntries(entries);
		mountRail();

		const dock = dockBadgeCount(true, excludeSystemFolder(entries, '/vault', settingsStore.templates.systemFolder));
		expect(badge()?.textContent).toBe(String(dock));
		expect(dock).toBe(2);
	});

	it('follows the entries snapshot', () => {
		typeDefinitionsStore.setEntries([entryV2('/vault/a.md')]);
		mountRail();
		expect(badge()?.textContent).toBe('1');

		typeDefinitionsStore.setEntries([entryV2('/vault/a.md'), entryV2('/vault/b.md')]);
		flushSync();
		expect(badge()?.textContent).toBe('2');
	});

	it('shows no badge when the Inbox is empty', () => {
		typeDefinitionsStore.setEntries([entryV2('/vault/done.md', { organized: true })]);
		mountRail();
		expect(badge()).toBeNull();
	});

	it('hands the Inbox lens to onSelect when clicked', () => {
		mountRail();
		inbox().click();
		expect(onSelect).toHaveBeenCalledWith('inbox', INBOX_LENS);
	});

	it('hands the Favorites and Archive lenses to onSelect when clicked', () => {
		mountRail();
		target.querySelector<HTMLButtonElement>('[data-rail-item="favorites"]')!.click();
		expect(onSelect).toHaveBeenLastCalledWith('favorites', FAVORITES_LENS);
		target.querySelector<HTMLButtonElement>('[data-rail-item="archive"]')!.click();
		expect(onSelect).toHaveBeenLastCalledWith('archive', ARCHIVE_LENS);
	});
});
