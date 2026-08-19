// @vitest-environment jsdom
// Regression probes for the `.view` branch of the TypeNoteList notes effect.
//
// A. The effect must read the collection property index SYNCHRONOUSLY. Svelte 5
//    collects effect dependencies during the synchronous run only, so an index
//    read placed after `await getCachedViewDefinition(...)` never subscribes:
//    a view selected before the deferred buildPropertyIndex lands stays stuck on
//    "No notes" until an unrelated entries bump happens to re-fire the effect.
// B. The local toolbar state must be re-seeded when the `.view` content hash
//    changes. buildOverriddenQuery REPLACES the parsed filters with the local
//    state, so a stale seed does not merely fail to update — it wipes the
//    freshly parsed filter and the list shows everything.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// virtua only mounts rows after ResizeObserver reports the scroller size, and
// it skips entries whose target has no offsetParent. jsdom implements neither
// layout API, so this stub fires synchronously on observe() with synthetic
// sizes (the VList scroller is recognizable by its inline overflow-y style)
// and offsetParent is exposed as parentElement. Same shim as
// TypeNoteList.perf.test.ts — without it zero rows mount and every row
// assertion passes or fails for the wrong reason.
const VIEWPORT_HEIGHT = 600;
const ROW_HEIGHT = 60;
class ResizeObserverStub {
	private cb: ResizeObserverCallback;
	constructor(cb: ResizeObserverCallback) {
		this.cb = cb;
	}
	observe(el: Element) {
		const isViewport = (el as HTMLElement).style?.overflowY === 'auto';
		const height = isViewport ? VIEWPORT_HEIGHT : ROW_HEIGHT;
		this.cb(
			[{ target: el, contentRect: { height, width: 240 } } as unknown as ResizeObserverEntry],
			this as unknown as ResizeObserver,
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

const cacheMocks = vi.hoisted(() => ({
	getCachedViewDefinition: vi.fn(),
	getViewContentHash: vi.fn(),
	refreshViewDefinition: vi.fn(),
}));

vi.mock('$lib/features/file-icons/file-icons.icon-data', () => ({
	getIconSync: vi.fn(),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));
vi.mock('$lib/core/editor/editor.service', () => ({ openFileInEditor: vi.fn() }));
vi.mock('$lib/core/filesystem/fs.service', () => ({
	deleteItem: vi.fn(),
	duplicateItem: vi.fn(),
	renameItem: vi.fn(),
	revealInSystemExplorer: vi.fn(),
}));
vi.mock('$lib/features/file-icons/file-icons.service', () => ({
	setIconForPath: vi.fn(),
	removeIconForPath: vi.fn(),
	trackRecentIcon: vi.fn(),
}));
vi.mock('$lib/features/type-definitions/type-definitions.service', () => ({
	createNoteOfType: vi.fn(),
	toggleFavoriteForPath: vi.fn(),
	updateViewQuery: vi.fn(),
}));
vi.mock('$lib/features/type-definitions/view-parse-cache', () => cacheMocks);
vi.mock('$lib/utils/log.service', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import TypeNoteList from '$lib/features/type-definitions/TypeNoteList.svelte';
import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import type { NoteRecord } from '$lib/features/collection/collection.types';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

const VIEW_PATH = '/vault/v.view';

const makeEntry = (overrides: Partial<NoteEntryV2>): NoteEntryV2 => ({
	path: '/vault/notes/note.md',
	title: 'note',
	frontmatter: {},
	outgoingLinks: [],
	tags: [],
	modifiedAt: 1700000000,
	createdAt: 1690000000,
	size: 1024,
	wordCount: 200,
	snippet: '',
	tasks: [],
	isA: null,
	organized: true,
	archived: false,
	favorite: false,
	belongsTo: [],
	relatedTo: [],
	hasMany: [],
	relationships: {},
	...overrides,
});

const makeRecord = (path: string, status: string): NoteRecord => ({
	path,
	name: path.split('/').pop() ?? '',
	basename: (path.split('/').pop() ?? '').replace(/\.md$/, ''),
	folder: '/vault/notes',
	ext: '.md',
	mtime: 1700000000,
	ctime: 1690000000,
	size: 1024,
	properties: new Map<string, unknown>([['status', status]]),
});

/** Three notes plus the `.view` file itself, as the vault snapshot would carry them. */
const entries: NoteEntryV2[] = [
	makeEntry({ path: '/vault/notes/alpha.md', title: 'Alpha' }),
	makeEntry({ path: '/vault/notes/beta.md', title: 'Beta' }),
	makeEntry({ path: '/vault/notes/gamma.md', title: 'Gamma' }),
	makeEntry({ path: VIEW_PATH, title: 'v' }),
];

/** Property index records: Alpha/Beta are `open`, Gamma is `done`. */
const records: NoteRecord[] = [
	makeRecord('/vault/notes/alpha.md', 'open'),
	makeRecord('/vault/notes/beta.md', 'open'),
	makeRecord('/vault/notes/gamma.md', 'done'),
];

const DEF_NO_FILTER = {
	success: true,
	definition: { views: [{ type: 'table', name: 'v' }] },
};
const DEF_DONE_FILTER = {
	success: true,
	definition: { views: [{ type: 'table', name: 'v', filters: "status == 'done'" }] },
};

function buildIndex(): Map<string, NoteRecord> {
	return new Map(records.map((r) => [r.path, r]));
}

/** Drains the microtask queue and the effect queue so async loadViewNotes settles. */
async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

/** Titles of the mounted note rows, in render order (the title is the row's first `.truncate`). */
function rowTitles(target: HTMLElement): string[] {
	return [...target.querySelectorAll('[data-note-row]')].map(
		(el) => el.querySelector('.truncate')?.textContent?.trim() ?? '',
	);
}

/** Text of the panel header label (the toolbar's leading span). */
function headerText(target: HTMLElement): string {
	return target.querySelector('span.text-sm.font-medium')?.textContent?.trim() ?? '';
}

/** Property pill texts per mounted note row, in render order. */
function rowPills(target: HTMLElement): string[][] {
	return [...target.querySelectorAll('[data-note-row]')].map((row) =>
		[...row.querySelectorAll('.flex-wrap span')].map((el) => el.textContent?.trim() ?? ''),
	);
}

describe('TypeNoteList view pipeline', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		editorStore.reset();
		fsStore.reset();
		fileIconsStore.reset();
		typeDefinitionsStore.reset();
		collectionStore.reset();
		cacheMocks.getCachedViewDefinition.mockReset();
		cacheMocks.getViewContentHash.mockReset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('fills the list when the property index lands after the view is selected', async () => {
		cacheMocks.getCachedViewDefinition.mockResolvedValue(DEF_NO_FILTER);
		cacheMocks.getViewContentHash.mockReturnValue('h1');
		typeDefinitionsStore.setEntries(entries);

		component = mount(TypeNoteList, { target });
		flushSync();
		typeDefinitionsStore.setSelection({ kind: 'view', path: VIEW_PATH });
		await settle();

		// buildPropertyIndex has not run yet: executeQuery over an empty index
		// matches nothing.
		expect(collectionStore.isIndexReady).toBe(false);
		expect(target.textContent).toContain('No notes');
		expect(rowTitles(target)).toHaveLength(0);

		// The ONLY change is the deferred index build landing. No setEntries, no
		// selection change, no sub-filter click — each of those is a side channel
		// that would re-fire the effect and hide a missing subscription.
		collectionStore.setPropertyIndex(buildIndex());
		await settle();

		expect(collectionStore.isIndexReady).toBe(true);
		expect(rowTitles(target)).toEqual(['Alpha', 'Beta', 'Gamma']);
		expect(target.textContent).not.toContain('No notes');
	});

	it('re-seeds the toolbar filters when the .view content hash changes', async () => {
		cacheMocks.getCachedViewDefinition.mockResolvedValue(DEF_NO_FILTER);
		cacheMocks.getViewContentHash.mockReturnValue('h1');
		collectionStore.setPropertyIndex(buildIndex());
		typeDefinitionsStore.setEntries(entries);

		component = mount(TypeNoteList, { target });
		flushSync();
		typeDefinitionsStore.setSelection({ kind: 'view', path: VIEW_PATH });
		await settle();

		expect(rowTitles(target)).toEqual(['Alpha', 'Beta', 'Gamma']);

		// External edit to the same .view file: a new parsed definition carrying a
		// view filter, and a new content hash for it.
		cacheMocks.getCachedViewDefinition.mockResolvedValue(DEF_DONE_FILTER);
		cacheMocks.getViewContentHash.mockReturnValue('h2');
		typeDefinitionsStore.setEntries([...entries]);
		await settle();

		expect(rowTitles(target)).toEqual(['Gamma']);
	});

	it('leaves the toolbar state alone while the .view content hash is unchanged', async () => {
		cacheMocks.getCachedViewDefinition.mockResolvedValue(DEF_DONE_FILTER);
		cacheMocks.getViewContentHash.mockReturnValue('h1');
		collectionStore.setPropertyIndex(buildIndex());
		typeDefinitionsStore.setEntries(entries);

		component = mount(TypeNoteList, { target });
		flushSync();
		typeDefinitionsStore.setSelection({ kind: 'view', path: VIEW_PATH });
		await settle();

		expect(rowTitles(target)).toEqual(['Gamma']);

		// An entries bump with the same hash must not re-seed, and must not
		// change what the query returns.
		typeDefinitionsStore.setEntries([...entries]);
		await settle();

		expect(rowTitles(target)).toEqual(['Gamma']);
	});

	it('renders no notes when the .view fails to parse', async () => {
		cacheMocks.getCachedViewDefinition.mockResolvedValue({ success: false, error: 'bad yaml' });
		cacheMocks.getViewContentHash.mockReturnValue('h1');
		collectionStore.setPropertyIndex(buildIndex());
		typeDefinitionsStore.setEntries(entries);

		component = mount(TypeNoteList, { target });
		flushSync();
		typeDefinitionsStore.setSelection({ kind: 'view', path: VIEW_PATH });
		await settle();

		expect(target.textContent).toContain('No notes');
		expect(rowTitles(target)).toHaveLength(0);
	});

	// The header label and the row property pills both resolve the selected
	// `.view` entry out of the entries snapshot. These two assert the resolved
	// entry's frontmatter actually reaches the DOM, so a lookup that silently
	// returns undefined shows up as the filename fallback / missing pills.
	it('labels the header from the .view entry _sidebar_label', async () => {
		cacheMocks.getCachedViewDefinition.mockResolvedValue(DEF_NO_FILTER);
		cacheMocks.getViewContentHash.mockReturnValue('h1');
		collectionStore.setPropertyIndex(buildIndex());
		typeDefinitionsStore.setEntries([
			...entries.filter((e) => e.path !== VIEW_PATH),
			makeEntry({ path: VIEW_PATH, title: 'v', frontmatter: { _sidebar_label: 'Open Work' } }),
		]);

		component = mount(TypeNoteList, { target });
		flushSync();
		typeDefinitionsStore.setSelection({ kind: 'view', path: VIEW_PATH });
		await settle();

		expect(headerText(target)).toBe('Open Work');
	});

	it('falls back to the filename when the .view entry has no _sidebar_label', async () => {
		cacheMocks.getCachedViewDefinition.mockResolvedValue(DEF_NO_FILTER);
		cacheMocks.getViewContentHash.mockReturnValue('h1');
		collectionStore.setPropertyIndex(buildIndex());
		typeDefinitionsStore.setEntries(entries);

		component = mount(TypeNoteList, { target });
		flushSync();
		typeDefinitionsStore.setSelection({ kind: 'view', path: VIEW_PATH });
		await settle();

		expect(headerText(target)).toBe('v');
	});

	it('renders a pill per _list_properties_display value on each row', async () => {
		cacheMocks.getCachedViewDefinition.mockResolvedValue(DEF_DONE_FILTER);
		cacheMocks.getViewContentHash.mockReturnValue('h1');
		collectionStore.setPropertyIndex(buildIndex());
		typeDefinitionsStore.setEntries([
			makeEntry({ path: '/vault/notes/alpha.md', title: 'Alpha' }),
			makeEntry({ path: '/vault/notes/beta.md', title: 'Beta' }),
			makeEntry({
				path: '/vault/notes/gamma.md',
				title: 'Gamma',
				frontmatter: { status: 'done', owner: 'ada' },
			}),
			makeEntry({
				path: VIEW_PATH,
				title: 'v',
				frontmatter: { _list_properties_display: ['status', 'owner'] },
			}),
		]);

		component = mount(TypeNoteList, { target });
		flushSync();
		typeDefinitionsStore.setSelection({ kind: 'view', path: VIEW_PATH });
		await settle();

		expect(rowTitles(target)).toEqual(['Gamma']);
		expect(rowPills(target)).toEqual([['done', 'ada']]);
	});

	it('renders no notes when the parse cache read rejects', async () => {
		cacheMocks.getCachedViewDefinition.mockRejectedValue(new Error('read failed'));
		cacheMocks.getViewContentHash.mockReturnValue(undefined);
		collectionStore.setPropertyIndex(buildIndex());
		typeDefinitionsStore.setEntries(entries);

		component = mount(TypeNoteList, { target });
		flushSync();
		typeDefinitionsStore.setSelection({ kind: 'view', path: VIEW_PATH });
		await settle();

		expect(target.textContent).toContain('No notes');
		expect(rowTitles(target)).toHaveLength(0);
	});
});
