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
//    state, so a stale seed does not merely fail to update - it wipes the
//    freshly parsed filter and the list shows everything.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// virtua only mounts rows after ResizeObserver reports the scroller size, and
// it skips entries whose target has no offsetParent. jsdom implements neither
// layout API, so this stub fires on observe() (in a microtask) with synthetic
// sizes (the VList scroller is recognizable by its inline overflow-y style)
// and offsetParent is exposed as parentElement. Same shim as
// TypeNoteList.perf.test.ts - without it zero rows mount and every row
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
		// Async like the real observer: virtua wires its scroll observer after observe()
		// returns, and its resize callback reads it.
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

const cacheMocks = vi.hoisted(() => ({
	getCachedViewDefinition: vi.fn(),
	getViewContentHash: vi.fn(),
	refreshViewDefinition: vi.fn(),
}));

vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('#lib/core/editor/editor.service.js', () => ({ openFileInEditor: vi.fn() }));
vi.mock('#lib/core/filesystem/fs.service.js', () => ({
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
vi.mock('#lib/features/type-definitions/type-definitions.service.js', () => ({
	createNoteOfType: vi.fn(),
	toggleFavoriteForPath: vi.fn(),
	updateViewQuery: vi.fn(),
}));
vi.mock('#lib/features/type-definitions/view-parse-cache.js', () => cacheMocks);
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import TypeNoteList from '#lib/features/type-definitions/TypeNoteList.svelte';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { updateViewQuery } from '#lib/features/type-definitions/type-definitions.service.js';
import { deleteItem, duplicateItem, renameItem } from '#lib/core/filesystem/fs.service.js';
import { ask } from '@tauri-apps/plugin-dialog';
import { toast } from 'svelte-sonner';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { getIconSync } from '#lib/features/file-icons/file-icons.icon-data.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import type { NoteRecord } from '#lib/features/collection/collection.types.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';

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

const VIEW_A = '/vault/a.view';
const VIEW_B = '/vault/b.view';

/** Same notes as `entries`, with both `.view` files of the two-view probe. */
const twoViewEntries: NoteEntryV2[] = [
	makeEntry({ path: '/vault/notes/alpha.md', title: 'Alpha' }),
	makeEntry({ path: '/vault/notes/beta.md', title: 'Beta' }),
	makeEntry({ path: '/vault/notes/gamma.md', title: 'Gamma' }),
	makeEntry({ path: VIEW_A, title: 'a' }),
	makeEntry({ path: VIEW_B, title: 'b' }),
];

/** View A: a definition-level filter, so FilterPanel renders an editable value input. */
const DEF_A_OPEN = {
	success: true,
	definition: { filters: "status == 'open'", views: [{ type: 'table', name: 'a' }] },
};
/** View B: a view-level filter selecting the other note. */
const DEF_B_DONE = {
	success: true,
	definition: { views: [{ type: 'table', name: 'b', filters: "status == 'done'" }] },
};

const DEF_NO_FILTER = {
	success: true,
	definition: { views: [{ type: 'table', name: 'v' }] },
};
const DEF_DONE_FILTER = {
	success: true,
	definition: { views: [{ type: 'table', name: 'v', filters: "status == 'done'" }] },
};

/** A view sorted by file name, newest-letter first. */
const DEF_SORT_BASENAME_DESC = {
	success: true,
	definition: { views: [{ type: 'table', name: 'v', sort: [{ column: 'file.basename', direction: 'DESC' }] }] },
};

/** `entries` with the `.view` entry carrying the given `_sort`. */
function entriesWithViewSort(sort: string): NoteEntryV2[] {
	return [
		...entries.filter((e) => e.path !== VIEW_PATH),
		makeEntry({ path: VIEW_PATH, title: 'v', frontmatter: { _sort: sort } }),
	];
}

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
		vi.mocked(updateViewQuery).mockReset();
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
		// selection change, no sub-filter click - each of those is a side channel
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

	// The Sort popover owns the visible order of a view. `_sort: title` would
	// list Alpha, Beta, Gamma; the view sort must win over it.
	it('lists notes in the .view sort order over its _sort', async () => {
		cacheMocks.getCachedViewDefinition.mockResolvedValue(DEF_SORT_BASENAME_DESC);
		cacheMocks.getViewContentHash.mockReturnValue('h1');
		collectionStore.setPropertyIndex(buildIndex());
		typeDefinitionsStore.setEntries(entriesWithViewSort('title'));

		component = mount(TypeNoteList, { target });
		flushSync();
		typeDefinitionsStore.setSelection({ kind: 'view', path: VIEW_PATH });
		await settle();

		expect(rowTitles(target)).toEqual(['Gamma', 'Beta', 'Alpha']);
	});

	it('reorders the list as soon as a sort is picked in the Sort popover', async () => {
		cacheMocks.getCachedViewDefinition.mockResolvedValue(DEF_NO_FILTER);
		cacheMocks.getViewContentHash.mockReturnValue('h1');
		vi.mocked(updateViewQuery).mockResolvedValue(undefined);
		collectionStore.setPropertyIndex(buildIndex());
		typeDefinitionsStore.setEntries(entriesWithViewSort('title'));

		component = mount(TypeNoteList, { target });
		flushSync();
		typeDefinitionsStore.setSelection({ kind: 'view', path: VIEW_PATH });
		await settle();

		// No sort on the view: `_sort` decides.
		expect(rowTitles(target)).toEqual(['Alpha', 'Beta', 'Gamma']);

		clickButtonWithIcon('svg.lucide-arrow-up-down');
		await settle();
		clickButtonWithText('Add sort');
		await settle();
		clickMenuItem('status');
		await settle();

		expect(vi.mocked(updateViewQuery)).toHaveBeenCalledWith(
			VIEW_PATH,
			expect.objectContaining({ viewSort: [{ column: 'status', direction: 'ASC' }] }),
		);
		// status ASC: done (Gamma) before open (Alpha, Beta, index order).
		expect(rowTitles(target)).toEqual(['Gamma', 'Alpha', 'Beta']);
	});

	// An empty localSort falls back to the parsed view's sort, so the list only
	// returns to `_sort` because updateViewQuery refreshes the parse cache first.
	it('returns to the _sort order when the last sort is removed in the Sort popover', async () => {
		cacheMocks.getCachedViewDefinition.mockResolvedValue(DEF_SORT_BASENAME_DESC);
		cacheMocks.getViewContentHash.mockReturnValue('h1');
		vi.mocked(updateViewQuery).mockImplementation(async () => {
			cacheMocks.getCachedViewDefinition.mockResolvedValue(DEF_NO_FILTER);
			cacheMocks.getViewContentHash.mockReturnValue('h2');
		});
		collectionStore.setPropertyIndex(buildIndex());
		typeDefinitionsStore.setEntries(entriesWithViewSort('title'));

		component = mount(TypeNoteList, { target });
		flushSync();
		typeDefinitionsStore.setSelection({ kind: 'view', path: VIEW_PATH });
		await settle();

		expect(rowTitles(target)).toEqual(['Gamma', 'Beta', 'Alpha']);

		clickButtonWithIcon('svg.lucide-arrow-up-down');
		await settle();
		clickButtonWithIcon('[role="listitem"] svg.lucide-x');
		await settle();

		expect(vi.mocked(updateViewQuery)).toHaveBeenCalledWith(
			VIEW_PATH,
			expect.objectContaining({ viewSort: [] }),
		);
		expect(rowTitles(target)).toEqual(['Alpha', 'Beta', 'Gamma']);
	});

	/** Clicks the toolbar button holding the given lucide icon. */
	function clickButtonWithIcon(selector: string): void {
		const trigger = document.querySelector(selector)?.closest('button');
		if (!trigger) throw new Error(`button with ${selector} not found`);
		trigger.click();
		flushSync();
	}

	/** Clicks the first button whose text is `text`. */
	function clickButtonWithText(text: string): void {
		const button = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
		if (!button) throw new Error(`button "${text}" not found`);
		button.click();
		flushSync();
	}

	/** Clicks the dropdown menu item whose text is `text`. */
	function clickMenuItem(text: string): void {
		const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
			(el) => el.textContent?.trim() === text,
		);
		if (!item) throw new Error(`menu item "${text}" not found`);
		item.click();
		flushSync();
	}

	/** Opens the Filter popover via its toolbar trigger (the ListFilter icon button). */
	function openFilterPanel(): void {
		const trigger = document.querySelector('svg.lucide-list-filter')?.closest('button');
		if (!trigger) throw new Error('filter toolbar button not found');
		trigger.click();
		flushSync();
	}

	/** The structured filter row's value input (renders in the popover portal). */
	function valueInput(): HTMLInputElement {
		const input = document.querySelector<HTMLInputElement>('input[placeholder="Value..."]');
		if (!input) throw new Error('filter value input not found: the popover row did not render');
		return input;
	}

	// persistViewState latches "the next parse is our own write, do not re-seed".
	// The latch must belong to the view that set it: buildOverriddenQuery REPLACES
	// the parsed filters with the local toolbar state, so a view that consumes
	// another view's latch renders the wrong filter and stays stuck there (its own
	// path and hash are recorded as seeded, so nothing re-seeds afterwards).
	it('does not let a view switch consume the previous view self-update latch', async () => {
		cacheMocks.getCachedViewDefinition.mockImplementation(async (path: string) =>
			path === VIEW_A ? DEF_A_OPEN : DEF_B_DONE,
		);
		cacheMocks.getViewContentHash.mockImplementation((path: string) => (path === VIEW_A ? 'ha' : 'hb'));
		collectionStore.setPropertyIndex(buildIndex());
		typeDefinitionsStore.setEntries(twoViewEntries);

		component = mount(TypeNoteList, { target });
		flushSync();
		typeDefinitionsStore.setSelection({ kind: 'view', path: VIEW_A });
		await settle();

		expect(rowTitles(target)).toEqual(['Alpha', 'Beta']);

		// Park the write so the latch is still set when the selection moves. A write
		// that resolves immediately lets A's own re-run consume it and proves nothing.
		let releaseWrite: () => void = () => {};
		vi.mocked(updateViewQuery).mockImplementation(
			() => new Promise<void>((resolve) => { releaseWrite = () => resolve(); }),
		);

		// One keystroke in the filter value input: the only path that sets the latch.
		openFilterPanel();
		const input = valueInput();
		expect(input.value).toBe('open');
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		// Precondition, not the verdict: without the write the latch was never set.
		expect(vi.mocked(updateViewQuery)).toHaveBeenCalledWith(VIEW_A, expect.anything());

		// View to view, never through a non-view selection: that detour would let the
		// reset effect heal the latch and hide the leak.
		typeDefinitionsStore.setSelection({ kind: 'view', path: VIEW_B });
		await settle();
		releaseWrite();
		await settle();
		typeDefinitionsStore.setEntries([...twoViewEntries]);
		await settle();

		expect(rowTitles(target)).toEqual(['Gamma']);

		// Back to A: the latch A set must not outlive B's seed either, or A returns
		// wearing B's filter.
		typeDefinitionsStore.setSelection({ kind: 'view', path: VIEW_A });
		await settle();

		expect(rowTitles(target)).toEqual(['Alpha', 'Beta']);
	});
});

describe('TypeNoteList file operation failures', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(async () => {
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		editorStore.reset();
		fsStore.reset();
		fileIconsStore.reset();
		typeDefinitionsStore.reset();
		collectionStore.reset();
		vi.mocked(toast.error).mockReset();
		cacheMocks.getCachedViewDefinition.mockResolvedValue(DEF_NO_FILTER);
		cacheMocks.getViewContentHash.mockReturnValue('h1');
		typeDefinitionsStore.setEntries(entries);
		collectionStore.setPropertyIndex(buildIndex());
		target = document.body.appendChild(document.createElement('div'));
		component = mount(TypeNoteList, { target });
		flushSync();
		typeDefinitionsStore.setSelection({ kind: 'view', path: VIEW_PATH });
		await settle();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
	});

	/** Right-clicks the row titled `title` and clicks the menu item labelled `label`. */
	async function chooseMenuItem(title: string, label: string) {
		const row = [...target.querySelectorAll('[data-note-row]')].find(
			(el) => el.querySelector('.truncate')?.textContent?.trim() === title,
		)!;
		row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
		await settle();
		const item = [...document.querySelectorAll('[role="menuitem"]')].find((el) =>
			el.textContent?.trim().startsWith(label),
		) as HTMLElement;
		item.click();
		await settle();
	}

	it('rows of the classic Types note list do not drag (only the rail note list has drop targets)', () => {
		const rows = [...target.querySelectorAll('[data-note-row]')];
		expect(rows.length).toBeGreaterThan(0);
		for (const row of rows) expect(row.getAttribute('draggable')).not.toBe('true');
	});

	it('toasts when duplicating a note fails', async () => {
		vi.mocked(duplicateItem).mockRejectedValueOnce('Permission denied (os error 13)');

		await chooseMenuItem('Alpha', 'Duplicate');

		expect(toast.error).toHaveBeenCalledWith('Could not duplicate "alpha.md": Permission denied (os error 13)');
	});

	it('toasts when the new name is taken and keeps the old name', async () => {
		vi.mocked(renameItem).mockRejectedValueOnce(new Error('"beta.md" already exists in this folder'));

		await chooseMenuItem('Alpha', 'Rename');
		const input = target.querySelector('input:not([type])') as HTMLInputElement;
		input.value = 'beta';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		await settle();

		expect(renameItem).toHaveBeenCalledWith('/vault/notes/alpha.md', 'beta.md');
		expect(toast.error).toHaveBeenCalledWith('Could not rename "alpha.md": "beta.md" already exists in this folder');
		expect(rowTitles(target)).toContain('Alpha');
	});

	it('toasts when moving a note to trash fails', async () => {
		vi.mocked(ask).mockResolvedValueOnce(true);
		vi.mocked(deleteItem).mockRejectedValueOnce(new Error('trash is not writable'));

		await chooseMenuItem('Alpha', 'Move to Trash');

		expect(toast.error).toHaveBeenCalledWith('Could not move "alpha.md" to the Trash: trash is not writable');
	});

	it('shows no shortcut next to Move to Trash and only the bound F2 hint', async () => {
		const row = [...target.querySelectorAll('[data-note-row]')].find(
			(el) => el.querySelector('.truncate')?.textContent?.trim() === 'Alpha',
		)!;
		row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
		await settle();

		const trash = [...document.querySelectorAll('[role="menuitem"]')].find((el) =>
			el.textContent?.trim().startsWith('Move to Trash'),
		);
		const hints = [...document.querySelectorAll('[data-slot="context-menu-shortcut"]')].map((el) =>
			el.textContent?.trim(),
		);

		expect(trash).toBeDefined();
		expect(trash!.textContent?.trim()).toBe('Move to Trash');
		expect(trash!.querySelector('[data-slot="context-menu-shortcut"]')).toBeNull();
		expect(hints).toEqual(['F2']);
	});

	it('still moves a note to the Trash on click', async () => {
		vi.mocked(ask).mockResolvedValueOnce(true);
		vi.mocked(deleteItem).mockResolvedValueOnce(undefined);

		await chooseMenuItem('Alpha', 'Move to Trash');

		expect(deleteItem).toHaveBeenCalledWith('/vault/notes/alpha.md', false);
		expect(toast.error).not.toHaveBeenCalled();
	});
});

describe('TypeNoteList type icon color', () => {
	const DEF_PATH = '/vault/Types/Project.md';
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
		vi.mocked(getIconSync).mockReturnValue({ name: 'rocket', pack: 'lucide', svgContent: '<path d="M0 0"/>', viewBox: '0 0 24 24', keywords: [] });
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		vi.mocked(getIconSync).mockReset();
	});

	/** Mounts the list on the Project type, whose definition carries `_icon` and `color`; returns the note row's svg. */
	async function mountProjectNote(color: string | undefined): Promise<SVGElement | null> {
		const def = makeEntry({ path: DEF_PATH, title: 'Project', isA: 'Type', frontmatter: { _icon: 'lucide:rocket', ...(color ? { _color: color } : {}) } });
		const note = makeEntry({ path: '/vault/notes/p1.md', title: 'P1', isA: 'Project' });
		typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap([def, note]));
		typeDefinitionsStore.setEntries([def, note]);
		fileIconsStore.setFrontmatterIcons(new Map([[DEF_PATH, { iconPack: 'lucide', iconName: 'rocket', color }]]));
		typeDefinitionsStore.setSelection({ kind: 'type', name: 'Project' });

		component = mount(TypeNoteList, { target });
		await settle();

		expect(rowTitles(target)).toEqual(['P1']);
		return target.querySelector('[data-note-row] svg');
	}

	it('renders the note row icon with the theme token of the type palette-name _color', async () => {
		const svg = await mountProjectNote('green');
		expect(svg?.style.color).toBe('var(--type-green)');
	});

	it('renders the note row icon with a hex _color as it is', async () => {
		const svg = await mountProjectNote('#ff8800');
		// jsdom normalizes the hex to rgb(); the value itself is unchanged
		expect(svg?.style.color).toBe('rgb(255, 136, 0)');
	});

	it('leaves the note row icon uncolored when the type has no _color', async () => {
		const svg = await mountProjectNote(undefined);
		expect(svg).not.toBeNull();
		expect(svg!.hasAttribute('style')).toBe(false);
	});
});
