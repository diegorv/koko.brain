// @vitest-environment jsdom
// The rail note list's Sort menu over the real stores and writers: the order a
// lens shows, the saved preference (settings, definition note or `.view`) and
// the overlay that shows a pick until its write lands. Only the disk and the IPC
// are mocked, so a save really runs through `updateNoteFrontmatter`.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import dayjs from 'dayjs';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';
import { reactiveProps } from '../../../fixtures/reactive-props.svelte';

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
import { INBOX_LENS, TODAY_LENS } from '#lib/features/rail-shell/lens.logic.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import { clearAllViewParseCache } from '#lib/features/type-definitions/view-parse-cache.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { invoke } from '@tauri-apps/api/core';
import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { entryV2, outgoingLinksFromContent } from '../../../fixtures/vault-entries.fixture';

const DEFINITION = '/vault/Project.md';
const TYPE_LENS = { kind: 'type', target: 'Project' };
const VIEW = '/vault/Projects.view';

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

/** Area notes with no definition note: a type that saves its sort to settings. */
const AREA_ENTRIES = [
	entryV2('/vault/area-one.md', { isA: 'Area', modifiedAt: 100 }),
	entryV2('/vault/area-two.md', { isA: 'Area', modifiedAt: 200 }),
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

describe('RailNoteList - sort', () => {
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

	/** Group headers and note rows in DOM order, so a test can see which group each row sits under. */
	function layoutSequence(): string[] {
		return [...target.querySelectorAll<HTMLElement>('[data-note-list-group], [data-note-row]')].map((el) =>
			el.dataset.noteListGroup !== undefined
				? `group:${el.dataset.noteListGroup}`
				: `row:${el.querySelector('.truncate')?.textContent?.trim() ?? ''}`,
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

	async function resetSort() {
		sortTrigger().click();
		await settle();
		document.querySelector<HTMLButtonElement>('[data-sort-reset]')!.click();
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

	it('resets a settings-backed sort to the lens order, and offers the reset only while a sort is saved', async () => {
		setEntries([
			entryV2('/vault/beta.md', { modifiedAt: 300 }),
			entryV2('/vault/alpha.md', { modifiedAt: 200 }),
			entryV2('/vault/gamma.md', { modifiedAt: 100 }),
		]);
		await mountList(INBOX_LENS);
		const native = rowTitles();

		sortTrigger().click();
		await settle();
		expect(document.querySelector('[data-sort-reset]')).toBeNull();
		document.querySelector<HTMLButtonElement>('[data-sort-option="title"] ~ [data-sort-dir="desc"]')!.click();
		await settle();
		expect(rowTitles()).toEqual(['gamma', 'beta', 'alpha']);
		expect(settingsStore.layout.railListPrefs).toEqual({ inbox: { sort: 'title:desc' } });

		await resetSort();

		expect(rowTitles()).toEqual(native);
		expect(sortTrigger().textContent).toContain('Modified');
		expect(settingsStore.layout.railListPrefs).toEqual({});
	});

	it('removes _list_sort from the definition note on reset', async () => {
		await mountList(TYPE_LENS);
		await pickSort('title', 'asc');
		expect(files[DEFINITION]).toContain('_list_sort: title:asc');
		expect(rowTitles()).toEqual(['alpha', 'beta', 'gamma']);

		await resetSort();

		expect(files[DEFINITION]).not.toContain('_list_sort');
		expect(sortTrigger().textContent).toContain('Modified');
		expect(rowTitles()).toEqual(['beta', 'alpha', 'gamma']);
	});

	it('saves the sort of a type with no definition note under type:<name> and writes no file', async () => {
		setEntries([...PROJECT_ENTRIES, ...AREA_ENTRIES]);
		await mountList({ kind: 'type', target: 'Area' });

		await pickSort('title', 'desc');

		expect(settingsStore.layout.railListPrefs).toEqual({ 'type:Area': { sort: 'title:desc' } });
		expect(vi.mocked(writeTextFile)).not.toHaveBeenCalled();
		expect(rowTitles()).toEqual(['area-two', 'area-one']);
	});

	it('shares one folder preference: a sort picked on one folder applies to another', async () => {
		const note = (path: string): FileTreeNode => ({
			name: path.split('/').pop()!,
			path,
			isDirectory: false,
		});
		setEntries([
			entryV2('/vault/Work/w-one.md', { modifiedAt: 200 }),
			entryV2('/vault/Work/w-two.md', { modifiedAt: 100 }),
			entryV2('/vault/Home/h-one.md', { modifiedAt: 200 }),
			entryV2('/vault/Home/h-two.md', { modifiedAt: 100 }),
		]);
		fsStore.setFileTree([
			{
				name: 'Work',
				path: '/vault/Work',
				isDirectory: true,
				children: [note('/vault/Work/w-one.md'), note('/vault/Work/w-two.md')],
			},
			{
				name: 'Home',
				path: '/vault/Home',
				isDirectory: true,
				children: [note('/vault/Home/h-one.md'), note('/vault/Home/h-two.md')],
			},
		]);
		const props = reactiveProps({ lens: { kind: 'folder', target: '/vault/Work' } as { kind: string; target?: string } });
		component = mount(RailNoteList, { target, props });
		await settle();
		expect(rowTitles()).toEqual(['w-one', 'w-two']);

		await pickSort('title', 'desc');
		expect(rowTitles()).toEqual(['w-two', 'w-one']);

		props.lens = { kind: 'folder', target: '/vault/Home' };
		flushSync();
		await settle();

		expect(sortTrigger().textContent).toContain('Title');
		expect(rowTitles()).toEqual(['h-two', 'h-one']);
		expect(settingsStore.layout.railListPrefs).toEqual({ folder: { sort: 'title:desc' } });
	});

	it('orders each neighbourhood group internally and keeps the group headers in place', async () => {
		const HUB = '/vault/Project Alpha.md';
		setEntries([
			entryV2(HUB, { outgoingLinks: outgoingLinksFromContent('[[Zeta]] [[Alpha Spec]]') }),
			entryV2('/vault/Zeta.md'),
			entryV2('/vault/Alpha Spec.md'),
			entryV2('/vault/Beta note.md', { outgoingLinks: outgoingLinksFromContent('[[Project Alpha]]'), modifiedAt: 300 }),
			entryV2('/vault/Aardvark.md', { outgoingLinks: outgoingLinksFromContent('[[Project Alpha]]'), modifiedAt: 200 }),
		]);
		await mountList({ kind: 'neighbourhood', target: HUB });
		// virtua mounts about ten rows in this test's viewport, so the last header ("Other relationships") is out of the window.
		expect(layoutSequence()).toEqual([
			'group:note',
			'row:Project Alpha',
			'group:outgoing',
			'row:Zeta',
			'row:Alpha Spec',
			'group:backlinks',
			'row:Beta note',
			'row:Aardvark',
			'group:belongs-to',
			'group:related-to',
			'group:has-many',
		]);

		await pickSort('title', 'asc');

		expect(sortTrigger().textContent).toContain('Title');
		expect(layoutSequence()).toEqual([
			'group:note',
			'row:Project Alpha',
			'group:outgoing',
			'row:Alpha Spec',
			'row:Zeta',
			'group:backlinks',
			'row:Aardvark',
			'row:Beta note',
			'group:belongs-to',
			'group:related-to',
			'group:has-many',
		]);
		expect(settingsStore.layout.railListPrefs).toEqual({ neighbourhood: { sort: 'title:asc' } });
	});

	it('orders the notes inside the Today group by the saved sort', async () => {
		const today = dayjs().format('YYYY-MM-DD');
		setEntries([
			entryV2('/vault/Gamma.md', { frontmatter: { date: today }, modifiedAt: 300 }),
			entryV2('/vault/Alpha.md', { frontmatter: { date: today }, modifiedAt: 200 }),
			entryV2('/vault/Beta.md', { frontmatter: { date: today }, modifiedAt: 100 }),
		]);
		await mountList(TODAY_LENS);
		expect(layoutSequence()).toEqual(['group:today', 'row:Gamma', 'row:Alpha', 'row:Beta']);

		await pickSort('title', 'asc');

		expect(layoutSequence()).toEqual(['group:today', 'row:Alpha', 'row:Beta', 'row:Gamma']);
		expect(target.querySelector('[data-note-list-group="today"]')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Today 3');
		expect(settingsStore.layout.railListPrefs).toEqual({ today: { sort: 'title:asc' } });
	});

	it('keeps a type lens switched mid-save on its own trigger and rows when the old write lands', async () => {
		setEntries([...PROJECT_ENTRIES, ...AREA_ENTRIES]);
		let finishWrite = () => {};
		vi.mocked(writeTextFile).mockImplementationOnce(
			(p, content) =>
				new Promise<void>((resolve) => {
					finishWrite = () => {
						files[String(p)] = String(content);
						resolve();
					};
				}),
		);
		const props = reactiveProps({ lens: TYPE_LENS as { kind: string; target?: string } });
		component = mount(RailNoteList, { target, props });
		await settle();

		sortTrigger().click();
		await settle();
		document.querySelector<HTMLButtonElement>('[data-sort-option="title"] ~ [data-sort-dir="desc"]')!.click();
		await settle();
		expect(sortTrigger().textContent).toContain('Title');

		props.lens = { kind: 'type', target: 'Area' };
		flushSync();
		await settle();
		expect(sortTrigger().textContent).toContain('Modified');
		expect(rowTitles()).toEqual(['area-two', 'area-one']);

		finishWrite();
		await settle(12);

		expect(files[DEFINITION]).toContain('_list_sort: title:desc');
		expect(sortTrigger().textContent).toContain('Modified');
		expect(rowTitles()).toEqual(['area-two', 'area-one']);
	});

	describe('two picks in flight', () => {
		it('shows B and keeps it when A fails after B was picked', async () => {
			let rejectA: (reason: Error) => void = () => {};
			vi.mocked(writeTextFile).mockImplementationOnce(
				() =>
					new Promise<void>((_resolve, reject) => {
						rejectA = reject;
					}),
			);
			await mountList(TYPE_LENS);

			await pickSort('title', 'desc');
			await pickSort('title', 'asc');
			expect(sortTrigger().textContent).toContain('Title');
			expect(rowTitles()).toEqual(['alpha', 'beta', 'gamma']);

			rejectA(new Error('disk full'));
			await settle(12);

			expect(toast.error).toHaveBeenCalledWith('Could not save the list');
			expect(sortTrigger().textContent).toContain('Title');
			expect(rowTitles()).toEqual(['alpha', 'beta', 'gamma']);
			expect(files[DEFINITION]).toContain('_list_sort: title:asc');
		});

		it('clears the overlay when B fails and shows the saved source', async () => {
			let resolveA: () => void = () => {};
			vi.mocked(writeTextFile)
				.mockImplementationOnce(
					(p, content) =>
						new Promise<void>((resolve) => {
							resolveA = () => {
								files[String(p)] = String(content);
								// The index refresh that follows A's write lands before B's write runs.
								setEntries(withSavedSort('title:desc'));
								resolve();
							};
						}),
				)
				.mockRejectedValueOnce(new Error('disk full'));
			await mountList(TYPE_LENS);

			await pickSort('title', 'desc');
			await pickSort('title', 'asc');
			expect(rowTitles()).toEqual(['alpha', 'beta', 'gamma']);

			resolveA();
			await settle(12);

			expect(toast.error).toHaveBeenCalledWith('Could not save the list');
			expect(sortTrigger().textContent).toContain('Title');
			expect(rowTitles()).toEqual(['gamma', 'beta', 'alpha']);
		});
	});
});
