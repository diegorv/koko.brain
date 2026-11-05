// @vitest-environment jsdom
// The rail note list's Sort, Properties and Search controls over the real stores
// and writers. Only the disk and the IPC are mocked, so a save really runs through
// `updateNoteFrontmatter` or `updateViewToolbarKey`.
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
import RailNoteList from '#lib/features/rail-shell/RailNoteList.svelte';
import { INBOX_LENS, VIEW_LENS_KIND } from '#lib/features/rail-shell/lens.logic.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import { clearAllViewParseCache } from '#lib/features/type-definitions/view-parse-cache.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import { parseCollectionYaml } from '#lib/features/collection/yaml-parser.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { invoke } from '@tauri-apps/api/core';
import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const DEFINITION = '/vault/Project.md';
const TYPE_LENS = { kind: 'type', target: 'Project' };
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

/** A definition entry whose index snapshot carries `sort` as `_list_sort`. */
function withSavedSort(sort: string): NoteEntryV2[] {
	return PROJECT_ENTRIES.map((e) => (e.path === DEFINITION ? { ...e, frontmatter: { _list_sort: sort } } : e));
}

describe('RailNoteList - toolbar', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	async function mountList(lens: { kind: string; target?: string }) {
		component = mount(RailNoteList, { target, props: { lens } });
		await settle();
	}

	function rowTitles(): string[] {
		return [...target.querySelectorAll<HTMLElement>('[data-note-row]')].map(
			(el) => el.querySelector('.truncate')?.textContent?.trim() ?? '',
		);
	}

	function sortTrigger(): HTMLButtonElement {
		return target.querySelector<HTMLButtonElement>('[data-note-list-sort]')!;
	}

	async function pickSort(option: string, direction: 'asc' | 'desc') {
		sortTrigger().click();
		await settle();
		document.querySelector<HTMLButtonElement>(`[data-sort-option="${option}"] ~ [data-sort-dir="${direction}"]`)!.click();
		await settle();
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
		vi.mocked(invoke).mockResolvedValue(undefined);
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

	it('reorders a settings-backed flat list by the picked sort, shows it on the trigger and saves it', async () => {
		setEntries([
			entryV2('/vault/beta.md', { modifiedAt: 300 }),
			entryV2('/vault/alpha.md', { modifiedAt: 200 }),
			entryV2('/vault/gamma.md', { modifiedAt: 100 }),
		]);
		await mountList(INBOX_LENS);
		// No saved sort: the native order, with the lens's default on the trigger.
		const native = rowTitles();
		expect(sortTrigger().textContent).toContain('Modified');

		await pickSort('title', 'desc');

		expect(rowTitles()).toEqual(['gamma', 'beta', 'alpha']);
		expect(rowTitles()).not.toEqual(native);
		expect(sortTrigger().textContent).toContain('Title');
		expect(settingsStore.layout.railListPrefs).toEqual({ inbox: { sort: 'title:desc' } });
	});

	it('saves the sort of a type with a definition as _list_sort, not in settings', async () => {
		await mountList(TYPE_LENS);
		await pickSort('title', 'asc');

		expect(files[DEFINITION]).toContain('_list_sort: title:asc');
		expect(settingsStore.layout.railListPrefs).toEqual({});
		expect(rowTitles()).toEqual(['alpha', 'beta', 'gamma']);
	});

	it('keeps a picked sort while the snapshot is stale, then follows the source once it caught up', async () => {
		await mountList(TYPE_LENS);
		await pickSort('title', 'asc');

		// An index refresh that predates the write must not flip the header back.
		setEntries([...PROJECT_ENTRIES]);
		await settle();
		expect(sortTrigger().textContent).toContain('Title');
		expect(rowTitles()).toEqual(['alpha', 'beta', 'gamma']);

		setEntries(withSavedSort('title:asc'));
		await settle();
		expect(sortTrigger().textContent).toContain('Title');

		// Caught up, the overlay is gone: an edit of the definition elsewhere now shows.
		setEntries(withSavedSort('created:desc'));
		await settle();
		expect(sortTrigger().textContent).toContain('Created');
	});

	it('rolls a failed type save back and toasts', async () => {
		vi.mocked(writeTextFile).mockRejectedValue(new Error('disk full'));
		await mountList(TYPE_LENS);
		const native = rowTitles();

		await pickSort('title', 'desc');

		expect(toast.error).toHaveBeenCalledWith('Could not save the list');
		expect(sortTrigger().textContent).toContain('Modified');
		expect(rowTitles()).toEqual(native);
	});

	it('keeps the newest of two quick view picks and writes it last', async () => {
		collectionStore.setPropertyIndex(
			new Map(
				['alpha', 'beta', 'gamma'].map((name) => {
					const path = `/vault/${name}.md`;
					return [path, buildNoteRecord(path, '---\n_type: Project\n---\n')];
				}),
			),
		);
		let finishFirst = () => {};
		vi.mocked(writeTextFile).mockImplementationOnce(
			(p, content) =>
				new Promise<void>((resolve) => {
					finishFirst = () => {
						files[String(p)] = String(content);
						resolve();
					};
				}),
		);
		await mountList(VIEW_LENS);

		await pickSort('title', 'desc');
		await pickSort('title', 'asc');
		// The second pick is queued behind the parked write, and the header shows it already.
		expect(sortTrigger().textContent).toContain('Title');
		expect(vi.mocked(writeTextFile)).toHaveBeenCalledTimes(1);

		// An index refresh mid-save loads the view, which must not cost the later loads their self-update latch.
		setEntries([...PROJECT_ENTRIES]);
		await settle();

		finishFirst();
		await settle(12);

		const onDisk = parseCollectionYaml(files[VIEW]);
		expect(onDisk).toMatchObject({ success: true, definition: { views: [{ sort: [{ column: 'file.name', direction: 'ASC' }] }] } });
		expect(rowTitles()).toEqual(['alpha', 'beta', 'gamma']);
	});

	it('narrows the list and the count by the query, and says when nothing matches', async () => {
		vi.mocked(invoke).mockImplementation(async (command) =>
			command === 'search_fts' ? [{ path: 'gamma.md' }] : undefined,
		);
		await mountList(TYPE_LENS);
		target.querySelector<HTMLButtonElement>('[data-note-list-search-toggle]')!.click();
		await settle();
		const input = target.querySelector<HTMLInputElement>('[data-note-list-search] input')!;

		input.value = 'alp';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await new Promise((resolve) => setTimeout(resolve, 200));
		await settle();
		// A title match, and a full-text hit whose title does not match.
		expect(rowTitles().sort()).toEqual(['alpha', 'gamma']);
		expect(target.querySelector('[data-note-list-count]')?.textContent).toBe('2');

		vi.mocked(invoke).mockImplementation(async () => {
			throw new Error('fts database unavailable');
		});
		input.value = 'zzz';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await new Promise((resolve) => setTimeout(resolve, 200));
		await settle();
		// The full-text call failed: the local match answers, with no toast.
		expect(target.querySelector('[data-note-list-no-matches]')?.textContent?.trim()).toBe('No matching notes');
		expect(target.querySelector('[data-note-list-empty]')).toBeNull();
		expect(toast.error).not.toHaveBeenCalled();

		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await settle();
		expect(target.querySelector('[data-note-list-search]')).toBeNull();
		expect(rowTitles()).toHaveLength(3);
	});

	describe('review regressions', () => {
		function typeSearch(value: string) {
			const input = target.querySelector<HTMLInputElement>('[data-note-list-search] input')!;
			input.value = value;
			input.dispatchEvent(new Event('input', { bubbles: true }));
		}

		it('closes the multiple sort panel on a click on another header button', async () => {
			setEntries(PROJECT_ENTRIES);
			collectionStore.setPropertyIndex(new Map([['/vault/alpha.md', buildNoteRecord('/vault/alpha.md', '---\n_type: Project\n---\n')]]));
			await mountList(VIEW_LENS);
			await vi.waitFor(() => expect(sortTrigger()).not.toBeNull());
			sortTrigger().click();
			await settle();
			document.querySelector<HTMLElement>('[data-sort-multiple]')!.click();
			await vi.waitFor(() => expect(document.querySelector('[data-sort-multiple]')).toBeNull());
			// bits-ui registers the outside-click layer a tick after opening.
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(document.querySelector('[data-sort-panel-empty]')).not.toBeNull();
			target
				.querySelector<HTMLElement>('[data-note-list-filter]')!
				.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 1, clientY: 1 }));
			await vi.waitFor(() => expect(document.querySelector('[data-sort-panel-empty]')).toBeNull());
		});

		it('does not apply the previous query\'s full-text hits to a new query', async () => {
			setEntries(PROJECT_ENTRIES);
			await mountList(TYPE_LENS);
			target.querySelector<HTMLElement>('[data-note-list-search-toggle]')!.click();
			await settle();
			vi.mocked(invoke).mockImplementation(async (cmd) => (cmd === 'search_fts' ? [{ path: 'alpha.md', title: 'alpha', score: -1, snippet: '' }] : undefined));
			typeSearch('body-only');
			await new Promise((resolve) => setTimeout(resolve, 200));
			await settle();
			expect(rowTitles()).toEqual(['alpha']);
			// The next query's call never answers: only its own hits may count.
			vi.mocked(invoke).mockImplementation(() => new Promise(() => {}));
			typeSearch('other');
			await new Promise((resolve) => setTimeout(resolve, 200));
			await settle();
			expect(rowTitles()).toEqual([]);
		});

		it('drops the pill at once when the last property of a type is unticked', async () => {
			const entries = PROJECT_ENTRIES.map((e) =>
				e.path === DEFINITION
					? { ...e, frontmatter: { _list_properties_display: ['owner'] } }
					: e.path === '/vault/alpha.md'
						? { ...e, frontmatter: { owner: 'Ana' } }
						: e,
			);
			setEntries(entries);
			await mountList(TYPE_LENS);
			expect(target.textContent).toContain('Ana');
			target.querySelector<HTMLElement>('[data-note-list-properties]')!.click();
			await settle();
			document.querySelector<HTMLInputElement>('[data-note-list-property-row="owner"] input')!.click();
			await settle();
			expect(target.textContent).not.toContain('Ana');
		});
	});
});
