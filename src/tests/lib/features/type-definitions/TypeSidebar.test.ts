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

vi.mock('$lib/features/file-icons/file-icons.icon-data', () => ({
	getIconSync: vi.fn(),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('$lib/core/editor/editor.service', () => ({ openFileInEditor: vi.fn() }));
vi.mock('$lib/core/filesystem/fs.service', () => ({ revealInSystemExplorer: vi.fn() }));
vi.mock('$lib/core/settings/settings.service', () => ({ saveSettings: vi.fn() }));
vi.mock('$lib/features/file-icons/file-icons.service', () => ({
	setIconForPath: vi.fn(),
	removeIconForPath: vi.fn(),
	trackRecentIcon: vi.fn(),
}));
vi.mock('$lib/features/type-definitions/type-definitions.service', () => ({
	createNoteOfType: vi.fn(),
	createTypeDefinition: vi.fn(),
	createView: vi.fn(),
	renameType: vi.fn(),
	updateViewIcon: vi.fn(),
	removeViewIcon: vi.fn(),
}));
vi.mock('$lib/features/type-definitions/view-parse-cache', () => ({
	refreshViewDefinition: vi.fn().mockResolvedValue({ success: false, error: 'stub' }),
}));
vi.mock('$lib/plugins/periodic-notes/periodic-notes.service', () => ({
	openOrCreateDailyNote: vi.fn(),
}));
vi.mock('$lib/utils/log.service', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import TypeSidebar from '$lib/features/type-definitions/TypeSidebar.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import type { FileTreeNode } from '$lib/core/filesystem/fs.types';
import type { FrontmatterValue, NoteEntryV2 } from '$lib/types/vault-v2.types';

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
