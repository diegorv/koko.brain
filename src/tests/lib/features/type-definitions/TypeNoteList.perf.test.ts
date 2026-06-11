// @vitest-environment jsdom
// Perf regression guard for the type-click path at real vault scale.
//
// With 7846 entries and 300 notes of the clicked type, per-note icon
// resolution must not scan the reactive entries array (the O(notes x entries)
// scan regression made this click flush take ~5.8s; the O(1)-lookup path runs
// it in ~200ms). The 1500ms ceiling leaves ~7x headroom for slow CI machines
// while sitting ~4x below the regressed cost, so it only trips on a real
// complexity regression, not on noise.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

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
	refreshViewDefinition: vi.fn(),
	setViewQueryResult: vi.fn(),
}));
vi.mock('$lib/utils/log.service', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync } from 'svelte';
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
const CEILING_MS = 1500;

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
	return entries;
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

	it('renders 300 notes with type-inherited icons without scanning entries per note', () => {
		component = mount(TypeNoteList, { target });
		flushSync();

		const t0 = performance.now();
		typeDefinitionsStore.setSelection({ kind: 'type', name: 'Newsletter' });
		flushSync();
		const elapsed = performance.now() - t0;

		// All 300 notes rendered with their titles (real content, not just containers).
		expect(target.textContent).toContain('note-0');
		const rows = target.querySelectorAll('button');
		expect(rows.length).toBeGreaterThanOrEqual(TYPED);
		// Type-inherited icon resolved for the rows (mocked lucide target icon).
		expect(target.querySelectorAll('svg').length).toBeGreaterThanOrEqual(TYPED);

		expect(elapsed).toBeLessThan(CEILING_MS);
	}, 30000);
});
