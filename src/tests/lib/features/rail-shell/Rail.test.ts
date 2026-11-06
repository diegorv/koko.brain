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
import Rail from '#lib/features/rail-shell/Rail.svelte';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { ARCHIVE_LENS, FAVORITES_LENS, FILES_LENS, INBOX_LENS, SEARCH_LENS, TODAY_LENS, TYPES_LENS, restoreRailItem } from '#lib/features/rail-shell/lens.logic.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { excludeSystemFolder } from '#lib/features/type-definitions/type-sidebar.logic.js';
import { dockBadgeCount } from '#lib/features/dock-badge/dock-badge.logic.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { getIconSync } from '#lib/features/file-icons/file-icons.icon-data.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';
import { reactiveProps } from '../../../fixtures/reactive-props.svelte';

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
		railRegistryStore.reset();
		editorStore.reset();
		fileIconsStore.reset();
		vi.mocked(getIconSync).mockReset();
		vi.mocked(openFileInEditor).mockReset();
		onSelect.mockReset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('holds Search, Inbox, Today, Favorites, Types, Files and Archive in PRD order, each with an accessible name', () => {
		mountRail();
		expect([...target.querySelectorAll('[data-rail-item]')].map((el) => el.getAttribute('aria-label'))).toEqual([
			'Search',
			'Inbox',
			'Today',
			'Favorites',
			'Types',
			'Files',
			'Archive',
		]);
	});

	it('puts a registered navigator (Calendar) between Types and Files, and drops it when unregistered', () => {
		const off = railRegistryStore.registerNavigator({
			id: 'calendar',
			label: 'Calendar',
			icon: CalendarDays,
			component: CalendarDays,
			lens: () => ({ kind: 'day', target: '2026-10-27' }),
		});
		mountRail('calendar');
		const keys = () => [...target.querySelectorAll('[data-rail-item]')].map((el) => el.getAttribute('data-rail-item'));
		expect(keys()).toEqual(['search', 'inbox', 'today', 'favorites', 'types', 'calendar', 'files', 'archive']);
		const calendar = target.querySelector<HTMLButtonElement>('[data-rail-item="calendar"]')!;
		expect(calendar.getAttribute('aria-label')).toBe('Calendar');
		expect(calendar.getAttribute('aria-current')).toBe('page');
		calendar.click();
		expect(onSelect).toHaveBeenCalledWith('calendar');

		off();
		flushSync();
		expect(keys()).toEqual(['search', 'inbox', 'today', 'favorites', 'types', 'files', 'archive']);
	});

	it('puts a divider between Favorites and Types', () => {
		mountRail();
		const divider = target.querySelector('[data-rail-divider]')!;
		expect(divider.previousElementSibling?.getAttribute('data-rail-item')).toBe('favorites');
		expect(divider.nextElementSibling?.getAttribute('data-rail-item')).toBe('types');
		expect(divider.className).toContain('bg-file-explorer-border');
	});

	it('drops the divider while every navigator item is hidden, so it never sits alone or next to the pinned divider', () => {
		railRegistryStore.registerNavigator({
			id: 'calendar',
			label: 'Calendar',
			icon: CalendarDays,
			component: CalendarDays,
			lens: () => ({ kind: 'day' }),
		});
		typeDefinitionsStore.setEntries([entryV2('/vault/Reading.view', { frontmatter: { _rail: true } })]);
		mountRail();
		settingsStore.updateLayout({ railHidden: ['types', 'calendar', 'files'] });
		flushSync();
		expect(target.querySelector('[data-rail-divider]')).toBeNull();
		expect(target.querySelectorAll('[data-rail-pinned-divider]')).toHaveLength(1);

		settingsStore.updateLayout({ railHidden: ['types', 'files'] });
		flushSync();
		expect(target.querySelector('[data-rail-divider]')?.nextElementSibling?.getAttribute('data-rail-item')).toBe('calendar');
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
		for (const key of ['search', 'inbox', 'today', 'favorites', 'types', 'files', 'archive']) {
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

	it('shows the Inbox badge only while the rail badge switch is on, apart from the dock badge switch', () => {
		typeDefinitionsStore.setEntries([entryV2('/vault/a.md')]);
		mountRail();
		expect(badge()?.textContent).toBe('1');

		settingsStore.updateLayout({ railInboxBadge: false });
		flushSync();
		expect(badge()).toBeNull();
		expect(settingsStore.dockBadgeInboxCount).toBe(true);

		settingsStore.updateLayout({ railInboxBadge: true });
		flushSync();
		expect(badge()?.textContent).toBe('1');
	});

	it('leaves out the hidden items and orders each group by the saved order, without a remount', () => {
		railRegistryStore.registerNavigator({
			id: 'calendar',
			label: 'Calendar',
			icon: CalendarDays,
			component: CalendarDays,
			lens: () => ({ kind: 'day' }),
		});
		mountRail();
		const keys = () => [...target.querySelectorAll('[data-rail-item]')].map((el) => el.getAttribute('data-rail-item'));

		settingsStore.updateLayout({ railHidden: ['favorites', 'archive', 'search', 'today'], railOrder: ['files', 'types', 'today'] });
		flushSync();
		expect(keys()).toEqual(['search', 'today', 'inbox', 'files', 'types', 'calendar']);
		expect(target.querySelector('[data-rail-bottom]')!.children).toHaveLength(0);

		settingsStore.updateLayout({ railHidden: [], railOrder: [] });
		flushSync();
		expect(keys()).toEqual(['search', 'inbox', 'today', 'favorites', 'types', 'calendar', 'files', 'archive']);
	});

	it('hands the clicked item key to onSelect', () => {
		mountRail();
		inbox().click();
		expect(onSelect).toHaveBeenCalledWith('inbox');
		target.querySelector<HTMLButtonElement>('[data-rail-item="today"]')!.click();
		expect(onSelect).toHaveBeenLastCalledWith('today');
		target.querySelector<HTMLButtonElement>('[data-rail-item="favorites"]')!.click();
		expect(onSelect).toHaveBeenLastCalledWith('favorites');
		target.querySelector<HTMLButtonElement>('[data-rail-item="types"]')!.click();
		expect(onSelect).toHaveBeenLastCalledWith('types');
		target.querySelector<HTMLButtonElement>('[data-rail-item="files"]')!.click();
		expect(onSelect).toHaveBeenLastCalledWith('files');
		target.querySelector<HTMLButtonElement>('[data-rail-item="archive"]')!.click();
		expect(onSelect).toHaveBeenLastCalledWith('archive');
		target.querySelector<HTMLButtonElement>('[data-rail-item="search"]')!.click();
		expect(onSelect).toHaveBeenLastCalledWith('search');
	});

	// The saved key is turned back into a lens by restoreRailItem; a rendered
	// item it does not know would restore as the default item, so its click would do nothing.
	it('renders only items that restoreRailItem restores to themselves', () => {
		mountRail();
		const keys = [...target.querySelectorAll<HTMLElement>('[data-rail-item]')].map((el) => el.dataset.railItem);
		expect(keys).toEqual(['search', 'inbox', 'today', 'favorites', 'types', 'files', 'archive']);
		expect(keys.map((key) => restoreRailItem(key))).toEqual([
			{ item: 'search', lens: SEARCH_LENS },
			{ item: 'inbox', lens: INBOX_LENS },
			{ item: 'today', lens: TODAY_LENS },
			{ item: 'favorites', lens: FAVORITES_LENS },
			{ item: 'types', lens: TYPES_LENS },
			{ item: 'files', lens: FILES_LENS },
			{ item: 'archive', lens: ARCHIVE_LENS },
		]);
	});
	describe('pinned items', () => {
		const READING = '/vault/Reading.view';
		const BOARD = '/vault/Board.view';
		const PROJECT_DEF = '/vault/_system/types/Project.md';
		const ROCKET = { name: 'rocket', pack: 'lucide' as const, svgContent: '<path d="M1 1"/>', viewBox: '0 0 24 24', keywords: [] };

		function setEntries(entries: NoteEntryV2[]) {
			typeDefinitionsStore.setEntries(entries);
			typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap(entries));
		}

		const PINNED = [
			entryV2(READING, { frontmatter: { _sidebar_label: 'To read', _rail: true } }),
			entryV2(BOARD, { frontmatter: { _rail: true, _open_in_editor: true } }),
			entryV2(PROJECT_DEF, { isA: 'Type', frontmatter: { _rail: true } }),
			entryV2('/vault/Other.view', { frontmatter: { _rail: 'true' } }),
		];

		const group = () => target.querySelector<HTMLElement>('[data-rail-pinned]');
		const pin = (key: string) => target.querySelector<HTMLButtonElement>(`[data-rail-pinned] [data-rail-item="${key}"]`)!;

		it('renders the pinned group under the navigator items, after a divider, above Archive', () => {
			setEntries(PINNED);
			mountRail();
			const keys = [...target.querySelectorAll('[data-rail-item]')].map((el) => el.getAttribute('data-rail-item'));
			expect(keys).toEqual(['search', 'inbox', 'today', 'favorites', 'types', 'files', 'type:Project', `view:${BOARD}`, `view:${READING}`, 'archive']);
			const divider = group()!.previousElementSibling!;
			expect(divider.hasAttribute('data-rail-pinned-divider')).toBe(true);
			expect(divider.previousElementSibling?.getAttribute('data-rail-item')).toBe('files');
			expect(group()!.nextElementSibling?.hasAttribute('data-rail-bottom')).toBe(true);
		});

		it('labels each pin with its tooltip and accessible name', () => {
			setEntries(PINNED);
			mountRail();
			expect([...group()!.querySelectorAll('[data-rail-item]')].map((el) => [el.getAttribute('title'), el.getAttribute('aria-label')])).toEqual([
				['Projects', 'Projects'],
				['Board', 'Board'],
				['To read', 'To read'],
			]);
		});

		it('renders no group and no divider without a pin', () => {
			setEntries([entryV2('/vault/Other.view', { frontmatter: { _rail: 'true' } })]);
			mountRail();
			expect(group()).toBeNull();
			expect(target.querySelector('[data-rail-pinned-divider]')).toBeNull();
		});

		it('follows the entries snapshot', () => {
			setEntries([]);
			mountRail();
			expect(group()).toBeNull();
			setEntries(PINNED);
			flushSync();
			expect(group()!.querySelectorAll('[data-rail-item]')).toHaveLength(3);
		});

		it('shows the resolved icon with its colour, else the fallback glyph of its kind', () => {
			fileIconsStore.setFrontmatterIcons(new Map([[READING, { iconPack: 'lucide', iconName: 'rocket', color: 'red' }]]));
			vi.mocked(getIconSync).mockImplementation((p, n) => (p === 'lucide' && n === 'rocket' ? ROCKET : undefined));
			setEntries(PINNED);
			mountRail();
			const reading = pin(`view:${READING}`).querySelector('svg')!;
			expect(reading.innerHTML).toContain('M1 1');
			expect(reading.getAttribute('style')).toContain('color');
			expect(pin(`view:${BOARD}`).querySelector('svg')!.getAttribute('class')).toContain('lucide-table');
			expect(pin('type:Project').querySelector('svg')!.getAttribute('class')).toContain('lucide-file-text');
		});

		it('hands a clicked pin key and the pin to onSelect, and opens nothing in the editor', () => {
			setEntries(PINNED);
			mountRail();
			pin(`view:${READING}`).click();
			expect(onSelect).toHaveBeenCalledWith(`view:${READING}`, expect.objectContaining({ key: `view:${READING}`, path: READING, opensInEditor: false }));
			pin('type:Project').click();
			expect(onSelect).toHaveBeenLastCalledWith('type:Project', expect.objectContaining({ key: 'type:Project', path: PROJECT_DEF, kind: 'type' }));
			expect(openFileInEditor).not.toHaveBeenCalled();
		});

		// The rail hands the pin to its owner (`selectRailItem`), which opens it in the editor; AppShell.test.ts covers that.
		it('hands a pinned _open_in_editor view to onSelect with its pin, and opens nothing in the editor itself', () => {
			setEntries(PINNED);
			mountRail();
			pin(`view:${BOARD}`).click();
			expect(onSelect).toHaveBeenCalledOnce();
			expect(onSelect).toHaveBeenCalledWith(`view:${BOARD}`, expect.objectContaining({ key: `view:${BOARD}`, path: BOARD, opensInEditor: true }));
			expect(openFileInEditor).not.toHaveBeenCalled();
		});

		it('highlights the active pin', () => {
			setEntries(PINNED);
			mountRail(`view:${READING}`);
			expect(pin(`view:${READING}`).getAttribute('aria-current')).toBe('page');
			expect(pin(`view:${READING}`).className).toContain('bg-file-explorer-primary/25 text-file-explorer-primary');
			expect(pin('type:Project').hasAttribute('aria-current')).toBe(false);
		});

		it('highlights a pinned _open_in_editor view while it is the active tab, not while another tab is', () => {
			setEntries(PINNED);
			editorStore.addTab({ path: '/vault/note.md', name: 'note', content: '', savedContent: '' });
			mountRail('today');
			expect(pin(`view:${BOARD}`).hasAttribute('aria-current')).toBe(false);
			editorStore.addTab({ path: BOARD, name: 'Board', content: '', savedContent: '' });
			flushSync();
			expect(editorStore.activeTabPath).toBe(BOARD);
			expect(pin(`view:${BOARD}`).getAttribute('aria-current')).toBe('page');
			// A list view is not highlighted because it is open in the active tab.
			editorStore.addTab({ path: READING, name: 'Reading', content: '', savedContent: '' });
			flushSync();
			expect(pin(`view:${READING}`).hasAttribute('aria-current')).toBe(false);
		});

		it('scrolls the pinned group and keeps every other rail child from shrinking', () => {
			setEntries(PINNED);
			mountRail();
			expect(group()!.classList).toContain('min-h-0');
			expect(group()!.classList).toContain('overflow-y-auto');
			for (const child of target.querySelector('[data-rail]')!.children) {
				if (child === group()) continue;
				expect(child.classList).toContain('shrink-0');
			}
		});

		it('restores each pin key to itself', () => {
			setEntries(PINNED);
			mountRail();
			for (const el of group()!.querySelectorAll<HTMLElement>('[data-rail-item]')) {
				expect(restoreRailItem(el.dataset.railItem).item).toBe(el.dataset.railItem);
			}
		});
	});

	describe('action buttons', () => {
		const SPARKLES = { name: 'sparkles', pack: 'lucide' as const, svgContent: '<path d="M2 2"/>', viewBox: '0 0 24 24', keywords: [] };
		const KEY = 'mod:hello:main';
		const button = () => target.querySelector<HTMLButtonElement>(`[data-rail-item="${KEY}"]`)!;
		const keys = () => [...target.querySelectorAll('[data-rail-item]')].map((el) => el.getAttribute('data-rail-item'));

		it('renders an action after the pinned block, after its own divider, before the bottom group', () => {
			typeDefinitionsStore.setEntries([entryV2('/vault/Reading.view', { frontmatter: { _rail: true } })]);
			railRegistryStore.registerAction({ key: KEY, label: 'Hello mod', icon: 'lucide:sparkles', run: vi.fn() });
			mountRail();
			expect(keys()).toEqual(['search', 'inbox', 'today', 'favorites', 'types', 'files', 'view:/vault/Reading.view', KEY, 'archive']);
			const block = target.querySelector('[data-rail-actions]')!;
			expect(block.previousElementSibling?.hasAttribute('data-rail-actions-divider')).toBe(true);
			expect(block.previousElementSibling?.previousElementSibling?.hasAttribute('data-rail-pinned')).toBe(true);
			expect(block.nextElementSibling?.hasAttribute('data-rail-bottom')).toBe(true);
			expect(block.classList).toContain('shrink-0');
		});

		it('renders no block and no divider without an action', () => {
			mountRail();
			expect(target.querySelector('[data-rail-actions]')).toBeNull();
			expect(target.querySelector('[data-rail-actions-divider]')).toBeNull();
		});

		it('labels the button, calls run on click, never onSelect, and has no aria-current', () => {
			const run = vi.fn();
			railRegistryStore.registerAction({ key: KEY, label: 'Hello mod', icon: 'lucide:sparkles', run });
			mountRail(KEY);
			expect(button().getAttribute('title')).toBe('Hello mod');
			expect(button().getAttribute('aria-label')).toBe('Hello mod');
			expect(button().hasAttribute('aria-current')).toBe(false);
			expect(button().className).not.toContain('bg-file-explorer-primary/25');

			button().click();
			expect(run).toHaveBeenCalledOnce();
			expect(onSelect).not.toHaveBeenCalled();
		});

		it('renders the icon of a pack:name or bare lucide ref once its pack is loaded', () => {
			vi.mocked(getIconSync).mockImplementation((p, n) => (p === 'lucide' && n === 'sparkles' ? SPARKLES : undefined));
			railRegistryStore.registerAction({ key: KEY, label: 'Hello mod', icon: 'lucide:sparkles', run: vi.fn() });
			railRegistryStore.registerAction({ key: 'mod:hello:bare', label: 'Bare', icon: 'sparkles', run: vi.fn() });
			mountRail();
			expect(button().querySelector('svg')!.innerHTML).toContain('M2 2');
			expect(target.querySelector('[data-rail-item="mod:hello:bare"] svg')!.innerHTML).toContain('M2 2');
		});

		it('falls back to the puzzle glyph for an unknown or invalid icon', () => {
			railRegistryStore.registerAction({ key: KEY, label: 'Hello mod', icon: 'lucide:no-such-icon', run: vi.fn() });
			railRegistryStore.registerAction({ key: 'mod:hello:bad', label: 'Bad', icon: 'nopack:x', run: vi.fn() });
			mountRail();
			expect(button().querySelector('svg')!.getAttribute('class')).toContain('lucide-puzzle');
			expect(target.querySelector('[data-rail-item="mod:hello:bad"] svg')!.getAttribute('class')).toContain('lucide-puzzle');
		});

		it('re-renders the icon when a pack finishes loading', () => {
			railRegistryStore.registerAction({ key: KEY, label: 'Hello mod', icon: 'lucide:sparkles', run: vi.fn() });
			mountRail();
			expect(button().querySelector('svg')!.getAttribute('class')).toContain('lucide-puzzle');

			vi.mocked(getIconSync).mockImplementation((p, n) => (p === 'lucide' && n === 'sparkles' ? SPARKLES : undefined));
			fileIconsStore.bumpPackVersion();
			flushSync();
			expect(button().querySelector('svg')!.innerHTML).toContain('M2 2');
		});

		it('shows a busy mark while busy() is true, read at render', () => {
			const state = reactiveProps({ busy: false });
			railRegistryStore.registerAction({ key: KEY, label: 'Hello mod', icon: 'lucide:sparkles', busy: () => state.busy, run: vi.fn() });
			mountRail();
			expect(button().hasAttribute('aria-busy')).toBe(false);
			expect(button().querySelector('[data-rail-busy]')).toBeNull();

			state.busy = true;
			flushSync();
			expect(button().getAttribute('aria-busy')).toBe('true');
			expect(button().querySelector('[data-rail-busy]')).not.toBeNull();

			state.busy = false;
			flushSync();
			expect(button().querySelector('[data-rail-busy]')).toBeNull();
		});

		it('shows no busy mark for an action without busy', () => {
			railRegistryStore.registerAction({ key: KEY, label: 'Hello mod', icon: 'lucide:sparkles', run: vi.fn() });
			mountRail();
			expect(button().hasAttribute('aria-busy')).toBe(false);
			expect(button().querySelector('[data-rail-busy]')).toBeNull();
		});

		it('drops the button when the action unregisters', () => {
			const off = railRegistryStore.registerAction({ key: KEY, label: 'Hello mod', icon: 'lucide:sparkles', run: vi.fn() });
			mountRail();
			expect(button()).not.toBeNull();
			off();
			flushSync();
			expect(target.querySelector(`[data-rail-item="${KEY}"]`)).toBeNull();
		});
	});
});
