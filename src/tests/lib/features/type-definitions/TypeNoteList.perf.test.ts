// @vitest-environment jsdom
// Perf regression guard for the type-click path at real vault scale.
//
// With 7846 entries and 300 notes of the clicked type, two properties must
// hold on click:
// 1. Per-note icon resolution must not scan the reactive entries array. Before
//    2a6045bc every rendered row ran two linear scans of
//    typeDefinitionsStore.entries (resolveTypeIconForPath, then
//    resolveIconForType). A third, resolveNoteIcon's own entries.find, sits
//    behind the "row has no inherited icon" branch and never runs in this
//    fixture. The fixed path resolves through the store's O(1) Map indexes.
//    That is asserted here by COUNTING entry-property reads, not by timing the
//    flush: the original 1500ms wall-clock ceiling was a proxy for the same
//    thing and went red under CI contention alone.
// 2. The list is virtualized (virtua VList): only the rows near the viewport
//    mount in the DOM, even though the full dataset flows through (the Open
//    sub-filter tab still counts all 300).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// virtua only mounts rows after ResizeObserver reports the scroller size, and
// it skips entries whose target has no offsetParent. jsdom implements neither
// layout API, so this stub fires synchronously on observe() with synthetic
// sizes (the VList scroller is recognizable by its inline overflow-y style)
// and offsetParent is exposed as parentElement.
const VIEWPORT_HEIGHT = 600;
const ROW_HEIGHT = 60;
/** Viewport height the stub reports; raised by the O(1) probe to mount more rows. */
let viewportHeight = VIEWPORT_HEIGHT;
class ResizeObserverStub {
	private cb: ResizeObserverCallback;
	constructor(cb: ResizeObserverCallback) {
		this.cb = cb;
	}
	observe(el: Element) {
		const isViewport = (el as HTMLElement).style?.overflowY === 'auto';
		const height = isViewport ? viewportHeight : ROW_HEIGHT;
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
vi.mock('$lib/features/type-definitions/view-parse-cache', () => ({
	getCachedViewDefinition: vi.fn(),
	getViewContentHash: vi.fn(),
	refreshViewDefinition: vi.fn(),
}));
vi.mock('$lib/utils/log.service', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import TypeNoteList from '$lib/features/type-definitions/TypeNoteList.svelte';
import { getIconSync } from '$lib/features/file-icons/file-icons.icon-data';
import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import type { NormalizedIcon } from '$lib/features/file-icons/file-icons.types';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

const TOTAL = 7846;
const TYPED = 300;

/**
 * Counts reads of the three entry properties every linear scan of
 * `typeDefinitionsStore.entries` tests: `path`, `isA` and `title`.
 *
 * Scope, deliberately narrow: those three keys and no others. A regression
 * that scans `entries` reading some other field (`modifiedAt`, `frontmatter`,
 * ...) is invisible to both tests below. Widening to the remaining scalars
 * would also count the reads the row markup itself makes per mounted row
 * (`snippet`, `wordCount`, `modifiedAt`), which scale with row count and would
 * blunt the row-scaling guard. This is a guard on the icon-resolution path,
 * not a general-purpose stand-in for the wall clock it replaced.
 *
 * This instruments the DATA, not the store: `setEntries` still receives real
 * `NoteEntryV2` objects and the real store builds its real indexes from them.
 * Svelte's `$state` proxy creates a memoising signal only for writable data
 * properties (`svelte/src/internal/client/proxy.js`, `get` trap: the source is
 * created only when `get_descriptor(target, prop)?.writable` is truthy), so
 * accessor reads fall through to `Reflect.get` and keep reaching this counter
 * on every pass.
 */
let entryReads = 0;
const COUNTED_KEYS = ['path', 'isA', 'title'] as const;
function countReads(entry: NoteEntryV2): NoteEntryV2 {
	for (const key of COUNTED_KEYS) {
		const value = entry[key];
		Object.defineProperty(entry, key, {
			get() {
				entryReads++;
				return value;
			},
			enumerable: true,
			configurable: true,
		});
	}
	return entry;
}

const icon: NormalizedIcon = {
	name: 'target',
	pack: 'lucide',
	svgContent: '<path/>',
	viewBox: '0 0 24 24',
	keywords: ['target'],
};

const makeEntry = (overrides: Partial<NoteEntryV2>): NoteEntryV2 => ({
	path: '/vault/test.md',
	title: 'test',
	frontmatter: { _order: 1, status: 'open', source: 'web' },
	outgoingLinks: [],
	tags: ['tag1'],
	modifiedAt: 1700000000,
	createdAt: 1690000000,
	size: 1024,
	wordCount: 200,
	snippet: 'lorem ipsum',
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

/** 7846 entries: 300 Newsletter notes spread evenly, one Type def at ~80%. */
function buildEntries(): NoteEntryV2[] {
	const entries: NoteEntryV2[] = [];
	for (let i = 0; i < TOTAL; i++) {
		entries.push(makeEntry({ path: `/vault/notes/note-${i}.md`, title: `note-${i}`, isA: 'Misc' }));
	}
	let assigned = 0;
	for (let i = 0; i < TOTAL && assigned < TYPED; i += Math.floor(TOTAL / TYPED)) {
		entries[i] = makeEntry({ path: entries[i].path, title: entries[i].title, isA: 'Newsletter' });
		assigned++;
	}
	const defIdx = Math.floor(TOTAL * 0.8);
	entries[defIdx] = makeEntry({ path: '/vault/Newsletter.md', title: 'Newsletter', isA: 'Type' });
	return entries.map(countReads);
}

describe('TypeNoteList click flush at vault scale', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		editorStore.reset();
		fileIconsStore.reset();
		typeDefinitionsStore.reset();
		vi.mocked(getIconSync).mockReturnValue(icon);
		typeDefinitionsStore.setEntries(buildEntries());
		viewportHeight = VIEWPORT_HEIGHT;
		// Instrumentation self-check: one property read through the store's own
		// $state proxy must reach a countReads accessor. Without it reads = 0
		// satisfies every upper bound below, so both guards would go silently
		// dead the moment the accessors stop firing (a svelte proxy change, a
		// setEntries that clones or snapshots the array). Verified: stubbing
		// countReads to return the entry untouched turns this red.
		const probe = entryReads;
		void typeDefinitionsStore.entries[0].path;
		expect(entryReads).toBe(probe + 1);
		// Newsletter type def carries the icon; every note inherits it via isA.
		fileIconsStore.setFrontmatterIcons(
			new Map([['/vault/Newsletter.md', { iconPack: 'lucide', iconName: 'target' }]]),
		);
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	/**
	 * Mounts a fresh list at `height` px of viewport, clicks the Newsletter type
	 * and returns the mounted rows plus how many entry-property reads that click
	 * cost. Viewport height is the axis that drives how many rows virtua mounts.
	 */
	async function measureClick(height: number) {
		if (component) unmount(component);
		component = null;
		target.innerHTML = '';
		typeDefinitionsStore.setSelection(null);
		viewportHeight = height;
		component = mount(TypeNoteList, { target });
		flushSync();

		const readsBefore = entryReads;
		typeDefinitionsStore.setSelection({ kind: 'type', name: 'Newsletter' });
		flushSync();
		// virtua attaches its ResizeObserver in a tick().then(...) after mount;
		// settle a few microtask+flush rounds so measurement → range → row
		// rendering completes deterministically.
		for (let round = 0; round < 3; round++) {
			await tick();
			flushSync();
		}
		return {
			reads: entryReads - readsBefore,
			rows: target.querySelectorAll('[data-note-row]'),
		};
	}

	it('virtualizes 300 notes with type-inherited icons without scanning entries per note', async () => {
		const { reads, rows } = await measureClick(VIEWPORT_HEIGHT);

		// The first rows render real content (title sort puts note-0 first).
		expect(target.textContent).toContain('note-0');
		// The full dataset flowed through: the Open sub-filter tab counts all 300.
		expect(target.textContent).toContain(String(TYPED));
		// Virtualization: only rows near the viewport mount, not all 300.
		expect(rows.length).toBeGreaterThanOrEqual(1);
		expect(rows.length).toBeLessThan(TYPED / 2);
		// Type-inherited icon resolved for every mounted row (mocked lucide icon).
		expect(target.querySelectorAll('[data-note-row] svg').length).toBe(rows.length);

		// This ceiling bounds the TOTAL-sized passes only. The per-row O(1)
		// guarantee the test name states is asserted by the SECOND test, which
		// varies row count at a fixed entries array; a bound taken at one row
		// count cannot separate "one pass per row" from "a few passes per click".
		//
		// The click is allowed a handful of full passes over entries
		// (excludeSystemFolder, getNotesForSelection, countSubFilters, plus one
		// effect re-run). Measured on the O(1) path: 48295 reads = 6.16 x TOTAL
		// at 14 rows. Restoring both pre-2a6045bc per-row scans measures 185711
		// = 23.67 x; restoring only the resolveTypeIconForPath scan measures
		// 66410 = 8.46 x. The bound is 8 x TOTAL so that partial regression is
		// red too.
		//
		// Margin, stated honestly: that partial regression costs
		// (66410 - 48295) / 14 = ~1294 reads per mounted row, so this ceiling
		// only trips at 12 or more mounted rows. jsdom mounts 14 here and that
		// count belongs to virtua, not to this repo: at VIEWPORT_HEIGHT = 420
		// only 11 rows mount and the same partial regression measures 62058 =
		// 7.91 x, green. The second test is the guard that holds when it drifts
		// (it measured +205590 at that viewport, 26 x its own bound).
		//
		// No floor here on purpose: a floor demanding at least one full pass
		// would go red on a legitimate future optimisation (a by-type index in
		// typeDefinitionsStore removes those passes). The beforeEach self-check
		// is what proves the counter is still live.
		expect(reads).toBeLessThan(8 * TOTAL);
	}, 30000);

	it('resolves row icons in O(1): mounting 7x more rows costs no extra entries scan', async () => {
		const small = await measureClick(VIEWPORT_HEIGHT);
		const large = await measureClick(VIEWPORT_HEIGHT * 10);

		// Precondition: the taller viewport really did mount many more rows.
		expect(large.rows.length).toBeGreaterThan(small.rows.length * 5);
		// The guard itself: each extra row costs ~1 entry read
		// (getEntryByPath(path).isA), not a scan, so mounting many more rows must
		// not add even one full pass over entries. Load-independent by
		// construction - it compares two runs on the same machine instead of
		// reading a wall clock. Measured on the O(1) path: 14 rows / 48295 reads
		// vs 104 rows / 48430 reads, so +90 rows costs +135 reads. Restoring the
		// pre-2a6045bc per-row scans measures +1212819 for the same row delta.
		// A dead counter would report 0 - 0 and pass; the beforeEach self-check,
		// not any assertion in a sibling test, is what rules that out.
		expect(large.reads - small.reads).toBeLessThan(TOTAL);
	}, 30000);
});
