// @vitest-environment jsdom
// The rail note list's search row over the real stores: the toggle, what a query
// matches (title, property pills, full-text hits), and how a lens change, a grouped
// lens, Today's sections, the empty states, a view error and a saved sort meet the
// query. Only the disk and the IPC are mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// virtua mounts rows only after ResizeObserver reports sizes and skips targets
// without offsetParent; jsdom has neither. Same shim as TypeNoteList.view.test.ts.
class ResizeObserverStub {
	private cb: ResizeObserverCallback;
	constructor(cb: ResizeObserverCallback) {
		this.cb = cb;
	}
	observe(el: Element) {
		const height = (el as HTMLElement).style?.overflowY === 'auto' ? 600 : 60;
		queueMicrotask(() =>
			this.cb(
				[{ target: el, contentRect: { height, width: 240 } } as unknown as ResizeObserverEntry],
				this as unknown as ResizeObserver,
			),
		);
	}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
	get() {
		return this.parentElement;
	},
	configurable: true,
});

/** The files on the mocked disk, by path. */
const files = vi.hoisted(() => ({}) as Record<string, string>);

vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	getAllIconPacks: vi.fn(() => []),
	getIconsForPack: vi.fn(() => []),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
}));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	createFile: vi.fn(),
	deleteItem: vi.fn(),
	duplicateItem: vi.fn(),
	renameItem: vi.fn(),
	revealInSystemExplorer: vi.fn(),
}));
vi.mock('#lib/features/file-icons/file-icons.service.js', () => ({
	setIconForPath: vi.fn(),
	removeIconForPath: vi.fn(),
	trackRecentIcon: vi.fn(),
}));
vi.mock('#lib/features/properties/lifecycle.service.js', () => ({
	toggleFavoriteForPath: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import Plus from '@lucide/svelte/icons/plus';
import RailNoteList from '#lib/features/rail-shell/RailNoteList.svelte';
import { FAVORITES_LENS, INBOX_LENS, neighbourhoodLens, TODAY_LENS, VIEW_LENS_KIND } from '#lib/features/rail-shell/lens.logic.js';
import type { Lens } from '#lib/features/rail-shell/rail-shell.types.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import { clearAllViewParseCache } from '#lib/features/type-definitions/view-parse-cache.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { invoke } from '@tauri-apps/api/core';
import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { entryV2, outgoingLinksFromContent } from '../../../fixtures/vault-entries.fixture';
import { reactiveProps } from '../../../fixtures/reactive-props.svelte';

const DEFINITION = '/vault/Project.md';
const TYPE_LENS: Lens = { kind: 'type', target: 'Project' };
const VIEW = '/vault/Projects.view';
const VIEW_LENS = { kind: VIEW_LENS_KIND, target: VIEW };

const VIEW_YAML = `filters: "_type == 'Project'"
views:
  - type: table
    name: Projects
`;

const PROJECT_ENTRIES = [
	entryV2(DEFINITION, { isA: 'Type' }),
	entryV2('/vault/beta.md', { isA: 'Project', modifiedAt: 300 }),
	entryV2('/vault/alpha.md', { isA: 'Project', modifiedAt: 200 }),
	entryV2('/vault/gamma.md', { isA: 'Project', modifiedAt: 100 }),
	entryV2(VIEW),
];

async function settle(rounds = 6) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

/** Lets the 180 ms search debounce fire, with a real timer. */
function waitForDebounce() {
	return new Promise((resolve) => setTimeout(resolve, 200));
}

describe('RailNoteList - search', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	async function mountList(lens: Lens = TYPE_LENS) {
		component = mount(RailNoteList, { target, props: { lens } });
		await settle();
	}

	function rowTitles(): string[] {
		return [...target.querySelectorAll<HTMLElement>('[data-note-row]')].map(
			(el) => el.querySelector('.truncate')?.textContent?.trim() ?? '',
		);
	}

	function searchInput(): HTMLInputElement | null {
		return target.querySelector<HTMLInputElement>('[data-note-list-search] input');
	}

	async function openSearch() {
		target.querySelector<HTMLButtonElement>('[data-note-list-search-toggle]')!.click();
		await settle();
	}

	function typeSearch(value: string) {
		const input = searchInput()!;
		input.value = value;
		input.dispatchEvent(new Event('input', { bubbles: true }));
	}

	function groupHeaders(): string[] {
		return [...target.querySelectorAll<HTMLElement>('[data-note-list-group]')].map((el) => el.textContent?.replace(/\s+/g, ' ').trim() ?? '');
	}

	function setEntries(entries: NoteEntryV2[]) {
		typeDefinitionsStore.setEntries(entries);
		typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap(entries));
	}

	beforeEach(() => {
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		editorStore.reset();
		fsStore.reset();
		fsStore.setFileTree([{ name: 'Projects.view', path: VIEW, isDirectory: false }]);
		fileIconsStore.reset();
		typeDefinitionsStore.reset();
		settingsStore.reset();
		railRegistryStore.reset();
		collectionStore.reset();
		clearAllViewParseCache();
		vi.clearAllMocks();
		vi.mocked(invoke).mockImplementation(async (command) => (command === 'search_fts' ? [] : undefined));
		for (const p of Object.keys(files)) delete files[p];
		files[DEFINITION] = '---\n_type: Type\n---\n# Project\n';
		files[VIEW] = VIEW_YAML;
		vi.mocked(exists).mockImplementation(async (p) => files[String(p)] !== undefined);
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			const content = files[String(p)];
			if (content === undefined) throw new Error(`not found: ${String(p)}`);
			return content;
		});
		vi.mocked(writeTextFile).mockImplementation(async (p, content) => {
			files[String(p)] = String(content);
		});
		setEntries(PROJECT_ENTRIES);
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('opens the row and focuses its input, and closing it restores every row', async () => {
		await mountList();
		expect(searchInput()).toBeNull();

		await openSearch();
		expect(searchInput()).not.toBeNull();
		expect(document.activeElement).toBe(searchInput());

		typeSearch('alp');
		await waitForDebounce();
		await settle();
		expect(rowTitles()).toEqual(['alpha']);

		await openSearch();
		expect(target.querySelector('[data-note-list-search]')).toBeNull();
		expect(rowTitles().sort()).toEqual(['alpha', 'beta', 'gamma']);
		expect(target.querySelector('[data-note-list-count]')?.textContent).toBe('3');
	});

	it('matches a visible property pill, and not a property key the list does not show', async () => {
		setEntries([
			entryV2(DEFINITION, { isA: 'Type', frontmatter: { _list_properties_display: ['owner'] } }),
			entryV2('/vault/alpha.md', { isA: 'Project', frontmatter: { owner: 'Ana', client: 'Zeta' }, modifiedAt: 200 }),
			entryV2('/vault/beta.md', { isA: 'Project', frontmatter: { owner: 'Bo' }, modifiedAt: 300 }),
		]);
		await mountList();
		expect(target.textContent).toContain('Ana');

		await openSearch();
		typeSearch('ana');
		await waitForDebounce();
		await settle();
		expect(rowTitles()).toEqual(['alpha']);

		typeSearch('zeta');
		await waitForDebounce();
		await settle();
		expect(rowTitles()).toEqual([]);
		expect(target.querySelector('[data-note-list-no-matches]')).not.toBeNull();
	});

	it('lists a full-text hit whose title does not match, joining its vault-relative path', async () => {
		setEntries([...PROJECT_ENTRIES, entryV2('/vault/Work/notes.md', { isA: 'Project', modifiedAt: 50 })]);
		vi.mocked(invoke).mockImplementation(async (command) =>
			command === 'search_fts' ? [{ path: 'Work/notes.md' }] : undefined,
		);
		await mountList();
		await openSearch();

		typeSearch('alp');
		await waitForDebounce();
		await settle();

		expect(rowTitles().sort()).toEqual(['alpha', 'notes']);
		expect(target.querySelector('[data-note-list-count]')?.textContent).toBe('2');
	});

	it('closes the search and clears the query on a lens change, and the new lens shows all its rows', async () => {
		setEntries([...PROJECT_ENTRIES, entryV2('/vault/fav.md', { favorite: true, modifiedAt: 1 })]);
		const props = reactiveProps<{ lens: Lens }>({ lens: TYPE_LENS });
		component = mount(RailNoteList, { target, props });
		await settle();
		await openSearch();
		typeSearch('alp');
		await waitForDebounce();
		await settle();
		expect(rowTitles()).toEqual(['alpha']);

		props.lens = FAVORITES_LENS;
		await settle();
		expect(target.querySelector('[data-note-list-search]')).toBeNull();
		expect(rowTitles()).toEqual(['fav']);

		props.lens = TYPE_LENS;
		await settle();
		expect(target.querySelector('[data-note-list-search]')).toBeNull();
		expect(rowTitles().sort()).toEqual(['alpha', 'beta', 'gamma']);
		expect(target.querySelector('[data-note-list-count]')?.textContent).toBe('3');
	});

	it('does not let a debounce pending from the old lens filter the new one', async () => {
		setEntries([...PROJECT_ENTRIES, entryV2('/vault/fav.md', { favorite: true, modifiedAt: 1 })]);
		const props = reactiveProps<{ lens: Lens }>({ lens: TYPE_LENS });
		component = mount(RailNoteList, { target, props });
		await settle();
		await openSearch();
		// The 180 ms debounce has not fired when the lens changes.
		typeSearch('alp');
		props.lens = FAVORITES_LENS;
		await settle();

		await waitForDebounce();
		await settle();
		expect(target.querySelector('[data-note-list-search]')).toBeNull();
		expect(rowTitles()).toEqual(['fav']);
	});

	it('keeps every group header in a grouped lens, empties the groups with no match and recounts them', async () => {
		const HUB = '/vault/Work/Project Alpha.md';
		setEntries([
			entryV2(HUB, { outgoingLinks: outgoingLinksFromContent('[[Spec]]'), belongsTo: ['Roadmap'], relationships: { client: ['Acme'] } }),
			entryV2('/vault/Spec.md'),
			entryV2('/vault/Roadmap.md'),
			entryV2('/vault/Acme.md'),
			entryV2('/vault/mention.md', { outgoingLinks: outgoingLinksFromContent('[[Project Alpha]]') }),
		]);
		await mountList(neighbourhoodLens(HUB));
		expect(groupHeaders()).toHaveLength(7);

		await openSearch();
		typeSearch('spec');
		await waitForDebounce();
		await settle();

		expect(groupHeaders()).toEqual([
			'This note 0',
			'Outgoing links 1',
			'Backlinks 0',
			'Belongs to 0',
			'Related to 0',
			'Has many 0',
			'Other relationships 0',
		]);
		expect(rowTitles()).toEqual(['Spec']);
		expect(target.querySelectorAll('[data-note-list-group-empty]')).toHaveLength(6);
	});

	it('hides Today plugin sections while a query is active, and shows them again once the query is cleared', async () => {
		const today = eventCalendarViewStore.todayKey;
		setEntries([entryV2('/vault/Work/dated.md', { frontmatter: { date: today }, modifiedAt: 200 })]);
		railRegistryStore.registerTodaySection({ id: 'people', label: 'My people', component: Plus });
		await mountList(TODAY_LENS);
		expect(target.querySelector('[data-today-section="people"]')).not.toBeNull();

		await openSearch();
		typeSearch('dated');
		await waitForDebounce();
		await settle();
		expect(target.querySelector('[data-today-section]')).toBeNull();
		expect(groupHeaders()).toEqual(['Today 1']);
		expect(rowTitles()).toEqual(['dated']);

		target.querySelector<HTMLButtonElement>('[data-note-list-search-clear]')!.click();
		await settle();
		expect(target.querySelector('[data-today-section="people"]')).not.toBeNull();
		expect(groupHeaders()).toEqual(['My people', 'Today 1']);
	});

	it('says no notes match, and not that the list is empty, when a flat list has no match', async () => {
		await mountList();
		await openSearch();
		typeSearch('zzzz');
		await waitForDebounce();
		await settle();

		expect(target.querySelector('[data-note-list-no-matches]')?.textContent?.trim()).toBe('No matching notes');
		expect(target.querySelector('[data-note-list-empty]')).toBeNull();
	});

	it('says no notes here for an unfiltered empty flat list', async () => {
		setEntries([entryV2('/vault/done.md', { organized: true })]);
		await mountList(INBOX_LENS);

		expect(target.querySelector('[data-note-list-empty]')?.textContent?.trim()).toBe('No notes here');
		expect(target.querySelector('[data-note-list-no-matches]')).toBeNull();
	});

	it('hides the search toggle and row for a view in an error state', async () => {
		files[VIEW] = 'views: [';
		collectionStore.setPropertyIndex(new Map());
		await mountList(VIEW_LENS);
		await vi.waitFor(() => expect(target.querySelector('[data-note-list-error-message]')?.textContent?.trim()).toBeTruthy());

		expect(target.querySelector('[data-note-list-loading]')).toBeNull();
		expect(target.querySelector('[data-note-list-search-toggle]')).toBeNull();
		expect(target.querySelector('[data-note-list-search]')).toBeNull();
		expect(target.querySelector('[data-note-list-sort]')).toBeNull();
	});

	it('keeps the saved sort order among the notes a query matches', async () => {
		setEntries([
			entryV2(DEFINITION, { isA: 'Type', frontmatter: { _list_sort: 'title:desc' } }),
			entryV2('/vault/apple.md', { isA: 'Project', modifiedAt: 400 }),
			entryV2('/vault/cherry.md', { isA: 'Project', modifiedAt: 300 }),
			entryV2('/vault/banana.md', { isA: 'Project', modifiedAt: 200 }),
			entryV2('/vault/date.md', { isA: 'Project', modifiedAt: 100 }),
		]);
		await mountList();
		expect(rowTitles()).toEqual(['date', 'cherry', 'banana', 'apple']);

		await openSearch();
		typeSearch('a');
		await waitForDebounce();
		await settle();

		expect(rowTitles()).toEqual(['date', 'banana', 'apple']);
		expect(target.querySelector('[data-note-list-count]')?.textContent).toBe('3');
	});
});
