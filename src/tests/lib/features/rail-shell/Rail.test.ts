// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Rail from '#lib/features/rail-shell/Rail.svelte';
import { INBOX_LENS } from '#lib/features/rail-shell/lens.logic.js';
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

	it('holds only the Inbox item, with an accessible name', () => {
		mountRail();
		expect([...target.querySelectorAll('[data-rail-item]')].map((el) => el.getAttribute('aria-label'))).toEqual(['Inbox']);
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
});
