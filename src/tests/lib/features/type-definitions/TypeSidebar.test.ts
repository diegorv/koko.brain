// @vitest-environment jsdom
// Covers the sidebar's `.view` row rendering, which resolves each row's entry
// out of the entries index rather than scanning the entries array:
//   - the row order comes from sortViewFiles fed with the store's entriesByPath
//   - each row's label comes from getEntryByPath(view.path)
// A lookup that silently returns undefined shows up here as filename fallback
// labels and pure alphabetical ordering.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('#lib/core/editor/editor.service.js', () => ({ openFileInEditor: vi.fn() }));
vi.mock('#lib/core/filesystem/fs.service.js', () => ({ revealInSystemExplorer: vi.fn() }));
vi.mock('#lib/core/settings/settings.service.js', () => ({ saveSettings: vi.fn() }));
vi.mock('#lib/features/file-icons/file-icons.service.js', () => ({
	setIconForPath: vi.fn(),
	removeIconForPath: vi.fn(),
	trackRecentIcon: vi.fn(),
}));
vi.mock('#lib/features/type-definitions/type-definitions.service.js', () => ({
	createNoteOfType: vi.fn(),
	createTypeDefinition: vi.fn(),
	createView: vi.fn(),
	renameType: vi.fn(),
	updateViewIcon: vi.fn(),
	removeViewIcon: vi.fn(),
}));
vi.mock('#lib/features/type-definitions/view-parse-cache.js', () => ({
	refreshViewDefinition: vi.fn().mockResolvedValue({ success: false, error: 'stub' }),
}));
vi.mock('#lib/plugins/periodic-notes/periodic-notes.service.js', () => ({
	openOrCreateDailyNote: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import TypeSidebar from '#lib/features/type-definitions/TypeSidebar.svelte';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { getIconSync } from '#lib/features/file-icons/file-icons.icon-data.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import type { NormalizedIcon } from '#lib/features/file-icons/file-icons.types.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import type { FrontmatterValue, NoteEntryV2 } from '#lib/types/vault-v2.types.js';

const ALPHA_VIEW = '/vault/alpha.view';
const BETA_VIEW = '/vault/beta.view';

const makeEntry = (path: string, frontmatter: Record<string, FrontmatterValue>): NoteEntryV2 => ({
	path,
	title: path.split('/').pop() ?? '',
	frontmatter,
	outgoingLinks: [],
	tags: [],
	modifiedAt: 1700000000,
	createdAt: 1690000000,
	size: 128,
	wordCount: 10,
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
});

const tree: FileTreeNode[] = [
	{ name: 'alpha.view', path: ALPHA_VIEW, isDirectory: false },
	{ name: 'beta.view', path: BETA_VIEW, isDirectory: false },
];

/**
 * Labels of the rendered `.view` rows, in render order. Scoped structurally:
 * the row buttons are the element siblings that follow the "Views" section
 * header, so nav rows and type rows cannot leak into the assertion.
 */
function viewRowLabels(target: HTMLElement): string[] {
	const header = [...target.querySelectorAll('span')].find((s) => s.textContent?.trim() === 'Views');
	let node = header?.parentElement?.nextElementSibling ?? null;
	const labels: string[] = [];
	while (node && node.tagName === 'BUTTON') {
		labels.push(node.querySelector('span.truncate')?.textContent?.trim() ?? '');
		node = node.nextElementSibling;
	}
	return labels;
}

describe('TypeSidebar view rows', () => {
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	beforeEach(() => {
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		fsStore.reset();
		fileIconsStore.reset();
		typeDefinitionsStore.reset();
		collectionStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		vi.useRealTimers();
	});

	it('orders rows by _order and labels them from the resolved entry', async () => {
		fsStore.setFileTree(tree);
		typeDefinitionsStore.setEntries([
			makeEntry(ALPHA_VIEW, { _order: 20, _sidebar_label: 'Alpha View' }),
			makeEntry(BETA_VIEW, { _order: 10, _sidebar_label: 'Beta View' }),
		]);

		component = mount(TypeSidebar, { target });
		flushSync();
		await tick();

		// Alphabetically alpha precedes beta; _order 10 < 20 flips it.
		expect(viewRowLabels(target)).toEqual(['Beta View', 'Alpha View']);
	});

	it('falls back to the filename when the entry carries no _sidebar_label', async () => {
		fsStore.setFileTree(tree);
		typeDefinitionsStore.setEntries([makeEntry(BETA_VIEW, { _order: 10 })]);

		component = mount(TypeSidebar, { target });
		flushSync();
		await tick();

		// beta resolves (order 10), alpha is absent from the index (default 50).
		expect(viewRowLabels(target)).toEqual(['beta', 'alpha']);
	});

	it('renders no view rows when the file tree has none', async () => {
		typeDefinitionsStore.setEntries([]);

		component = mount(TypeSidebar, { target });
		flushSync();
		await tick();

		expect(viewRowLabels(target)).toEqual([]);
	});
});

describe('TypeSidebar type icon color', () => {
	const DEF_PATH = '/vault/Types/Project.md';
	const ROCKET: NormalizedIcon = { name: 'rocket', pack: 'lucide', svgContent: '<path d="M0 0"/>', viewBox: '0 0 24 24', keywords: [] };
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	beforeEach(() => {
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		fsStore.reset();
		fileIconsStore.reset();
		typeDefinitionsStore.reset();
		collectionStore.reset();
		vi.mocked(getIconSync).mockReturnValue(ROCKET);
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		vi.mocked(getIconSync).mockReset();
	});

	/** Mounts the sidebar with a Project type whose definition carries `_icon` and `color`, and one Project note. */
	async function mountWithProjectColor(color: string | undefined): Promise<Element | null> {
		const def = { ...makeEntry(DEF_PATH, { _icon: 'lucide:rocket', ...(color ? { _color: color } : {}) }), title: 'Project', isA: 'Type' };
		const note = { ...makeEntry('/vault/p1.md', {}), isA: 'Project' };
		typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap([def, note]));
		typeDefinitionsStore.setEntries([def, note]);
		fileIconsStore.setFrontmatterIcons(new Map([[DEF_PATH, { iconPack: 'lucide', iconName: 'rocket', color }]]));

		component = mount(TypeSidebar, { target });
		flushSync();
		await tick();

		const row = [...target.querySelectorAll('button')].find((b) => b.querySelector('span.truncate')?.textContent?.trim() === 'Projects');
		return row?.querySelector('svg') ?? null;
	}

	it('renders a palette-name _color with the theme token', async () => {
		const svg = await mountWithProjectColor('green');
		expect((svg as SVGElement | null)?.style.color).toBe('var(--type-green)');
	});

	it('renders a hex _color as it is', async () => {
		const svg = await mountWithProjectColor('#ff8800');
		// jsdom normalizes the hex to rgb(); the value itself is unchanged
		expect((svg as SVGElement | null)?.style.color).toBe('rgb(255, 136, 0)');
	});

	it('leaves the type icon uncolored without a _color', async () => {
		const svg = await mountWithProjectColor(undefined);
		expect(svg).not.toBeNull();
		expect(svg!.hasAttribute('style')).toBe(false);
	});
});
