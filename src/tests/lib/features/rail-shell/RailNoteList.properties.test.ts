// @vitest-environment jsdom
// The rail note list's "Show in note list" picker over the real stores and
// writers. Only the disk and the IPC are mocked, so a save really runs through
// `updateNoteFrontmatter` or `updateViewListProperties`.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parse as parseYaml } from 'yaml';
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
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import { invoke } from '@tauri-apps/api/core';
import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';
import { reactiveProps } from '../../../fixtures/reactive-props.svelte';

const DEFINITION = '/vault/Project.md';
const TASK_DEFINITION = '/vault/Task.md';
const TYPE_LENS = { kind: 'type', target: 'Project' };
const TASK_LENS = { kind: 'type', target: 'Task' };
const VIEW = '/vault/Projects.view';
const VIEW_LENS = { kind: VIEW_LENS_KIND, target: VIEW };
const PROPERTY_KEY = '_list_properties_display';

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

/** The definition entry of `path` with `properties` as its saved pill keys. */
function withSavedProperties(path: string, properties: string[], base: NoteEntryV2[] = PROJECT_ENTRIES): NoteEntryV2[] {
	return base.map((e) => (e.path === path ? { ...e, frontmatter: { [PROPERTY_KEY]: properties } } : e));
}

/** The `_list_properties_display` value a written note holds, or undefined. */
function savedProperties(content: string): unknown {
	return parseFrontmatterProperties(content).find((p) => p.key === PROPERTY_KEY)?.value;
}

describe('RailNoteList - show in note list', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	async function mountList(lens: { kind: string; target?: string }) {
		component = mount(RailNoteList, { target, props: { lens } });
		await settle();
	}

	function rowFor(title: string): HTMLElement | undefined {
		return [...target.querySelectorAll<HTMLElement>('[data-note-row]')].find(
			(el) => el.querySelector('[data-note-row-title]')?.textContent?.trim() === title,
		);
	}

	/** The text of a row, pills included. Empty when the row is not rendered. */
	function rowText(title: string): string {
		return rowFor(title)?.textContent ?? '';
	}

	function openPicker() {
		if (document.querySelector('[data-note-list-property-row]')) return;
		target.querySelector<HTMLButtonElement>('[data-note-list-properties]')!.click();
	}

	/** The picker's checkbox for `key`, opening the picker when it is closed. */
	async function checkbox(key: string): Promise<HTMLInputElement> {
		openPicker();
		await settle();
		return document.querySelector<HTMLInputElement>(`[data-note-list-property-row="${key}"] input`)!;
	}

	async function tickProperty(key: string) {
		(await checkbox(key)).click();
		await settle();
	}

	function pickerKeys(): string[] {
		return [...document.querySelectorAll<HTMLElement>('[data-note-list-property-row]')].map(
			(el) => el.dataset.noteListPropertyRow ?? '',
		);
	}

	function setSearch(value: string) {
		const input = target.querySelector<HTMLInputElement>('[data-note-list-search] input')!;
		input.value = value;
		input.dispatchEvent(new Event('input', { bubbles: true }));
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
		files[TASK_DEFINITION] = '---\n_type: Type\n---\n# Task\n';
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

	it('shows a ticked key on the rows at once and saves it in settings, with no file written', async () => {
		setEntries([
			entryV2('/vault/alpha.md', { frontmatter: { owner: 'Ana' }, modifiedAt: 200 }),
			entryV2('/vault/beta.md', { frontmatter: { budget: '5' }, modifiedAt: 300 }),
		]);
		await mountList(INBOX_LENS);
		expect(rowText('beta')).not.toContain('5');

		await tickProperty('budget');

		expect(rowText('beta')).toContain('5');
		expect(rowText('alpha')).not.toContain('Ana');
		expect(settingsStore.layout.railListPrefs).toEqual({ inbox: { properties: ['budget'] } });
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('falls back to each typed note\'s type display when the lens has no selection, and the override wins until it is unticked', async () => {
		setEntries([
			entryV2(DEFINITION, { isA: 'Type', frontmatter: { [PROPERTY_KEY]: ['owner'] } }),
			entryV2('/vault/alpha.md', { isA: 'Project', frontmatter: { owner: 'Ana' }, modifiedAt: 200 }),
			entryV2('/vault/beta.md', { frontmatter: { budget: '5' }, modifiedAt: 300 }),
		]);
		await mountList(INBOX_LENS);
		// The typed note keeps its type's pill; the untyped note has no type display.
		expect(rowText('alpha')).toContain('Ana');
		expect(rowText('beta')).not.toContain('5');

		await tickProperty('budget');

		// The selection replaces the type display on every row.
		expect(rowText('alpha')).not.toContain('Ana');
		expect(rowText('beta')).toContain('5');
		expect(settingsStore.layout.railListPrefs).toEqual({ inbox: { properties: ['budget'] } });

		await tickProperty('budget');

		// Empty again: each note goes back to its type's display.
		expect(rowText('alpha')).toContain('Ana');
		expect(rowText('beta')).not.toContain('5');
		expect(settingsStore.layout.railListPrefs).toEqual({});
	});

	it('writes _list_properties_display into the definition note, keeps its body and other keys, and shows the pill before the snapshot refreshes', async () => {
		files[DEFINITION] = '---\n_type: Type\ncategory: work\n---\n# Project\n\nBody line\n';
		setEntries(PROJECT_ENTRIES.map((e) => (e.path === '/vault/alpha.md' ? { ...e, frontmatter: { owner: 'Ana' } } : e)));
		await mountList(TYPE_LENS);
		expect(rowText('alpha')).not.toContain('Ana');

		await tickProperty('owner');

		const written = files[DEFINITION];
		expect(savedProperties(written)).toEqual(['owner']);
		expect(parseFrontmatterProperties(written).find((p) => p.key === 'category')?.value).toBe('work');
		expect(written).toContain('Body line');
		expect(written).toContain('# Project');
		// The entries snapshot still lacks the key: the overlay carries the pill.
		expect(rowText('alpha')).toContain('Ana');
		expect(settingsStore.layout.railListPrefs).toEqual({});
	});

	it('writes _list_properties_display into the .view and keeps views and filters', async () => {
		setEntries(PROJECT_ENTRIES.map((e) => (e.path === '/vault/alpha.md' ? { ...e, frontmatter: { owner: 'Ana' } } : e)));
		collectionStore.setPropertyIndex(
			new Map([
				['/vault/alpha.md', buildNoteRecord('/vault/alpha.md', '---\n_type: Project\nowner: Ana\n---\n')],
				['/vault/beta.md', buildNoteRecord('/vault/beta.md', '---\n_type: Project\n---\n')],
				['/vault/gamma.md', buildNoteRecord('/vault/gamma.md', '---\n_type: Project\n---\n')],
			]),
		);
		await mountList(VIEW_LENS);
		await vi.waitFor(() => expect(target.querySelector('[data-note-list-properties]')).not.toBeNull());
		expect(rowText('alpha')).not.toContain('Ana');

		await tickProperty('owner');

		expect(parseYaml(files[VIEW])).toEqual({ ...parseYaml(VIEW_YAML), [PROPERTY_KEY]: ['owner'] });
		expect(rowText('alpha')).toContain('Ana');
		expect(settingsStore.layout.railListPrefs).toEqual({});
	});

	it('still offers keys that only notes hidden by the query carry, and a selected key no note carries', async () => {
		vi.mocked(invoke).mockImplementation(async (command) => (command === 'search_fts' ? [] : undefined));
		files[DEFINITION] = `---\n_type: Type\n${PROPERTY_KEY}:\n  - ghost\n---\n# Project\n`;
		setEntries(
			withSavedProperties(DEFINITION, ['ghost'], [
				...PROJECT_ENTRIES.filter((e) => e.path !== '/vault/beta.md' && e.path !== '/vault/alpha.md'),
				entryV2('/vault/alpha.md', { isA: 'Project', frontmatter: { owner: 'Ana' }, modifiedAt: 200 }),
				entryV2('/vault/beta.md', { isA: 'Project', frontmatter: { budget: '5' }, modifiedAt: 300 }),
			]),
		);
		await mountList(TYPE_LENS);
		target.querySelector<HTMLButtonElement>('[data-note-list-search-toggle]')!.click();
		await settle();
		setSearch('alp');
		await new Promise((resolve) => setTimeout(resolve, 200));
		await settle();
		expect(rowText('beta')).toBe('');
		expect(rowText('alpha')).not.toBe('');

		expect((await checkbox('ghost')).checked).toBe(true);
		expect(pickerKeys()).toEqual(expect.arrayContaining(['budget', 'owner', 'ghost']));

		await tickProperty('ghost');

		expect(savedProperties(files[DEFINITION])).toBeUndefined();
		expect(files[DEFINITION]).not.toContain(PROPERTY_KEY);
		// Nothing selects or carries it any more, so the picker stops offering it.
		expect(pickerKeys()).not.toContain('ghost');
	});

	it('rolls a failed type write back and toasts once', async () => {
		vi.mocked(writeTextFile).mockRejectedValue(new Error('disk full'));
		setEntries(PROJECT_ENTRIES.map((e) => (e.path === '/vault/alpha.md' ? { ...e, frontmatter: { owner: 'Ana' } } : e)));
		await mountList(TYPE_LENS);

		await tickProperty('owner');

		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(toast.error).toHaveBeenCalledWith('Could not save the list');
		expect(rowText('alpha')).not.toContain('Ana');
		expect((await checkbox('owner')).checked).toBe(false);
	});

	it('keeps both keys on disk when two ticks land on one definition note while the first write is held', async () => {
		setEntries(
			PROJECT_ENTRIES.map((e) => {
				if (e.path === '/vault/alpha.md') return { ...e, frontmatter: { owner: 'Ana' } };
				if (e.path === '/vault/beta.md') return { ...e, frontmatter: { budget: '5' } };
				return e;
			}),
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
		await mountList(TYPE_LENS);

		await tickProperty('owner');
		await tickProperty('budget');
		// The second write waits for the held first one.
		expect(vi.mocked(writeTextFile)).toHaveBeenCalledTimes(1);

		finishFirst();
		await settle(12);

		expect(savedProperties(files[DEFINITION])).toEqual(['owner', 'budget']);
		expect(rowText('alpha')).toContain('Ana');
		expect(rowText('beta')).toContain('5');
	});

	it('drops the overlay when the lens changes, so the next type shows its own selection', async () => {
		setEntries([
			...PROJECT_ENTRIES.map((e) => (e.path === '/vault/alpha.md' ? { ...e, frontmatter: { owner: 'Ana' } } : e)),
			entryV2(TASK_DEFINITION, { isA: 'Type', frontmatter: { [PROPERTY_KEY]: ['budget'] } }),
			entryV2('/vault/task1.md', { isA: 'Task', frontmatter: { budget: '250', owner: 'Bo' }, modifiedAt: 400 }),
		]);
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
		const props = reactiveProps<{ lens: { kind: string; target?: string } }>({ lens: TYPE_LENS });
		component = mount(RailNoteList, { target, props });
		await settle();

		await tickProperty('owner');
		expect(rowText('alpha')).toContain('Ana');

		props.lens = TASK_LENS;
		flushSync();
		await settle();

		expect(rowText('task1')).toContain('250');
		expect(rowText('task1')).not.toContain('Bo');
		expect((await checkbox('owner')).checked).toBe(false);
		expect((await checkbox('budget')).checked).toBe(true);

		// The held write of the first type lands after the switch and must not touch the new lens.
		finishFirst();
		await settle(12);
		expect(rowText('task1')).not.toContain('Bo');
	});
});
