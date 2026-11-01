// @vitest-environment jsdom
// The rail note list on a view lens: the `.view` query result in the order its
// Sort shows, the Sort and Filter popovers in the header persisting to the
// file, and New here inferring the note's type from the filters. Only the
// disk is mocked: the `.view` is read and written through the real parse cache
// and `updateViewQuery`.
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

/** The `.view` files on the mocked disk, by path. */
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
}));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('#lib/core/editor/editor.service.js', () => ({ openFileInEditor: vi.fn() }));
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
vi.mock('#lib/features/type-definitions/type-definitions.service.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/features/type-definitions/type-definitions.service.js')>()),
	toggleFavoriteForPath: vi.fn(),
	createTypedNote: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import RailNoteList from '#lib/features/rail-shell/RailNoteList.svelte';
import { VIEW_LENS_KIND } from '#lib/features/rail-shell/lens.logic.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { createFile } from '#lib/core/filesystem/fs.service.js';
import { invoke } from '@tauri-apps/api/core';
import { createTypedNote } from '#lib/features/type-definitions/type-definitions.service.js';
import { clearAllViewParseCache, refreshViewDefinition } from '#lib/features/type-definitions/view-parse-cache.js';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { parseCollectionYaml } from '#lib/features/collection/yaml-parser.js';
import { toast } from 'svelte-sonner';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';
import { reactiveProps } from '../../../fixtures/reactive-props.svelte';

const VIEW = '/vault/Projects.view';
const LENS = { kind: VIEW_LENS_KIND, target: VIEW };
const PEOPLE_VIEW = '/vault/People.view';

const NOTES: Record<string, string> = {
	'/vault/Work/alpha.md': '---\n_type: Project\nstatus: open\n---\n',
	'/vault/Work/beta.md': '---\n_type: Project\nstatus: done\n---\n',
	'/vault/Work/gamma.md': '---\n_type: Project\nstatus: open\n---\n',
	'/vault/Work/shelved.md': '---\n_type: Project\nstatus: open\n_archived: true\n---\n',
	'/vault/person.md': '---\n_type: Person\nstatus: open\n---\n',
};

function buildIndex(): Map<string, PropertyIndexRecord> {
	return new Map(Object.entries(NOTES).map(([p, c]) => [p, buildNoteRecord(p, c)]));
}

const ENTRIES = [
	entryV2('/vault/Project.md', { isA: 'Type' }),
	entryV2('/vault/Work/alpha.md', { isA: 'Project', frontmatter: { status: 'open' } }),
	entryV2('/vault/Work/beta.md', { isA: 'Project', frontmatter: { status: 'done' } }),
	entryV2('/vault/Work/gamma.md', { isA: 'Project', frontmatter: { status: 'open' } }),
	entryV2('/vault/Work/shelved.md', { isA: 'Project', archived: true }),
	entryV2('/vault/person.md', { isA: 'Person' }),
	entryV2(VIEW, { frontmatter: { _sidebar_label: 'Open work', _sort: 'title', _list_properties_display: ['status'] } }),
	entryV2(PEOPLE_VIEW, { frontmatter: { _sidebar_label: 'People' } }),
];

/** Projects, sorted by file name, newest letter first. */
const PROJECTS_BY_NAME_DESC = `filters: "_type == 'Project'"
views:
  - type: table
    name: Projects
    sort:
      - column: file.basename
        direction: DESC
`;
/** Projects with no sort: the `.view`'s `_sort: title` decides. */
const PROJECTS_UNSORTED = `filters: "_type == 'Project'"
views:
  - type: table
    name: Projects
`;
/** Open notes of any type: New here makes a plain note. */
const OPEN_ANY_TYPE = `views:
  - type: table
    name: Open
    filters: "status == 'open'"
`;
/** People, for the view the lens moves to. */
const PEOPLE = `filters: "_type == 'Person'"
views:
  - type: table
    name: People
`;

async function settle(rounds = 6) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

describe('RailNoteList - view lens', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	async function mountList(lens: { kind: string; target?: string } = LENS) {
		component = mount(RailNoteList, { target, props: { lens } });
		await settle();
	}

	function rowTitles(): string[] {
		return [...target.querySelectorAll<HTMLElement>('[data-note-row]')].map(
			(el) => el.querySelector('.truncate')?.textContent?.trim() ?? '',
		);
	}

	function rowPills(): string[][] {
		return [...target.querySelectorAll('[data-note-row]')].map((row) =>
			[...row.querySelectorAll('.flex-wrap span')].map((el) => el.textContent?.trim() ?? ''),
		);
	}

	function clickButtonWithText(text: string) {
		const button = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
		if (!button) throw new Error(`button "${text}" not found`);
		button.click();
		flushSync();
	}

	function clickMenuItem(text: string) {
		const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) => el.textContent?.trim() === text);
		if (!item) throw new Error(`menu item "${text}" not found`);
		item.click();
		flushSync();
	}

	beforeEach(() => {
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		editorStore.reset();
		fsStore.reset();
		fileIconsStore.reset();
		typeDefinitionsStore.reset();
		settingsStore.reset();
		railRegistryStore.reset();
		collectionStore.reset();
		vi.clearAllMocks();
		clearAllViewParseCache();
		for (const p of Object.keys(files)) delete files[p];
		files[VIEW] = PROJECTS_BY_NAME_DESC;
		files[PEOPLE_VIEW] = PEOPLE;
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			const content = files[String(p)];
			if (content === undefined) throw new Error(`not found: ${String(p)}`);
			return content;
		});
		vi.mocked(writeTextFile).mockImplementation(async (p, content) => {
			files[String(p)] = String(content);
		});
		typeDefinitionsStore.setEntries(ENTRIES);
		typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap(ENTRIES));
		collectionStore.setPropertyIndex(buildIndex());
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it("shows the view's label, its filters as the rule, and its notes in the order its Sort shows", async () => {
		await mountList();
		expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('Open work');
		expect(target.querySelector('[data-note-list-rule]')?.textContent?.trim()).toBe("_type == 'Project', not archived");
		// file.basename DESC wins over the view's `_sort: title`; the archived project is left out.
		expect(rowTitles()).toEqual(['gamma', 'beta', 'alpha']);
		expect(rowPills()).toEqual([['open'], ['done'], ['open']]);
	});

	it("lists by the view's _sort when it has no Sort", async () => {
		files[VIEW] = PROJECTS_UNSORTED;
		await mountList();
		expect(rowTitles()).toEqual(['alpha', 'beta', 'gamma']);
	});

	it('reorders the list and saves the sort to the .view when a sort is picked', async () => {
		files[VIEW] = PROJECTS_UNSORTED;
		await mountList();
		expect(target.querySelector('[data-note-list-sort]')?.classList).toContain('text-tab-text-inactive');

		target.querySelector<HTMLButtonElement>('[data-note-list-sort]')!.click();
		await settle();
		clickButtonWithText('Add sort');
		await settle();
		clickMenuItem('status');
		await settle();

		expect(parseCollectionYaml(files[VIEW])).toMatchObject({
			success: true,
			definition: { views: [{ sort: [{ column: 'status', direction: 'ASC' }] }] },
		});
		// status ASC: done (beta) before open (alpha, gamma in index order).
		expect(rowTitles()).toEqual(['beta', 'alpha', 'gamma']);
		expect(target.querySelector('[data-note-list-sort]')?.classList).toContain('text-tab-text-active');
		expect(target.querySelector('[data-rail-note-list]')!.innerHTML).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(/i);
	});

	it('updates the list and saves the filter to the .view when a filter changes', async () => {
		await mountList();
		target.querySelector<HTMLButtonElement>('[data-note-list-filter]')!.click();
		await settle();
		const input = document.querySelector<HTMLInputElement>('input[placeholder="Value..."]')!;
		expect(input.value).toBe('Project');
		input.value = 'Person';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();

		expect(parseCollectionYaml(files[VIEW])).toMatchObject({ success: true, definition: { filters: "_type == 'Person'" } });
		expect(rowTitles()).toEqual(['person']);
		expect(target.querySelector('[data-note-list-rule]')?.textContent?.trim()).toBe("_type == 'Person', not archived");
	});

	it('toasts and goes back to what the .view holds when it cannot be saved', async () => {
		vi.mocked(writeTextFile).mockRejectedValue(new Error('disk full'));
		files[VIEW] = PROJECTS_UNSORTED;
		await mountList();
		target.querySelector<HTMLButtonElement>('[data-note-list-sort]')!.click();
		await settle();
		clickButtonWithText('Add sort');
		await settle();
		clickMenuItem('status');
		await settle();

		expect(toast.error).toHaveBeenCalledWith('Could not save the view');
		expect(files[VIEW]).toBe(PROJECTS_UNSORTED);
		// The unsaved status sort is dropped: the list and the toolbar match the file again.
		expect(rowTitles()).toEqual(['alpha', 'beta', 'gamma']);
		expect(target.querySelector('[data-note-list-sort]')?.classList).toContain('text-tab-text-inactive');
	});

	it('keeps the view the lens moved to while a save of the previous view is pending', async () => {
		files[VIEW] = PROJECTS_UNSORTED;
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
		const props = reactiveProps({ lens: LENS });
		component = mount(RailNoteList, { target, props });
		await settle();
		target.querySelector<HTMLButtonElement>('[data-note-list-sort]')!.click();
		await settle();
		clickButtonWithText('Add sort');
		await settle();
		clickMenuItem('status');
		await settle();

		props.lens = { kind: VIEW_LENS_KIND, target: PEOPLE_VIEW };
		await settle();
		expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('People');
		expect(rowTitles()).toEqual(['person']);

		finishWrite();
		await settle();
		expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('People');
		expect(rowTitles()).toEqual(['person']);
		expect(target.querySelector('[data-note-list-sort]')).not.toBeNull();
		expect(target.querySelector('[data-note-list-rule]')?.textContent?.trim()).toBe("_type == 'Person', not archived");
	});

	it('re-seeds from the file when its content changes on disk', async () => {
		await mountList();
		files[VIEW] = OPEN_ANY_TYPE;
		await refreshViewDefinition(VIEW);
		typeDefinitionsStore.setEntries([...ENTRIES]);
		await settle();
		expect(rowTitles()).toEqual(['alpha', 'gamma', 'person']);
	});

	it('leaves the toolbar state alone while the .view content hash is unchanged', async () => {
		await mountList();
		expect(rowTitles()).toEqual(['gamma', 'beta', 'alpha']);

		// An entries bump with the same hash must not re-seed, and must not change what the query returns.
		typeDefinitionsStore.setEntries([...ENTRIES]);
		await settle();

		expect(rowTitles()).toEqual(['gamma', 'beta', 'alpha']);
		expect(target.querySelector('[data-note-list-rule]')?.textContent?.trim()).toBe("_type == 'Project', not archived");
	});

	// persistViewState latches "the next parse is our own write, do not re-seed". The latch belongs to
	// the view that set it: the query REPLACES the parsed filters with the toolbar state, so a view
	// that keeps another view's latch shows the wrong filter and stays there.
	it("does not let a view switch consume the previous view's self-update latch", async () => {
		// Park the write so the latch is still set when the lens moves. A write that resolves at once
		// lets the view's own re-run consume it and proves nothing.
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
		const props = reactiveProps({ lens: LENS });
		component = mount(RailNoteList, { target, props });
		await settle();
		expect(rowTitles()).toEqual(['gamma', 'beta', 'alpha']);

		// One keystroke in the filter value input: it persists the toolbar state and sets the latch.
		target.querySelector<HTMLButtonElement>('[data-note-list-filter]')!.click();
		await settle();
		const input = document.querySelector<HTMLInputElement>('input[placeholder="Value..."]')!;
		expect(input.value).toBe('Project');
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
		// Precondition, not the verdict: without the write the latch was never set.
		expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(VIEW, expect.anything());

		// View to view, never through a non-view lens.
		props.lens = { kind: VIEW_LENS_KIND, target: PEOPLE_VIEW };
		await settle();
		finishWrite();
		await settle();
		typeDefinitionsStore.setEntries([...ENTRIES]);
		await settle();
		expect(rowTitles()).toEqual(['person']);

		// Back to the first view: the latch it set must not outlive the People seed, or it returns wearing People's filter.
		props.lens = LENS;
		await settle();
		expect(rowTitles()).toEqual(['gamma', 'beta', 'alpha']);
		expect(target.querySelector('[data-note-list-rule]')?.textContent?.trim()).toBe("_type == 'Project', not archived");
	});

	it('waits for the property index, then lists the view', async () => {
		collectionStore.reset();
		await mountList();
		expect(target.querySelector('[data-note-list-empty]')).not.toBeNull();
		collectionStore.setPropertyIndex(buildIndex());
		await settle();
		expect(rowTitles()).toEqual(['gamma', 'beta', 'alpha']);
	});

	it('shows the empty state and no toolbar when the .view cannot be parsed or read', async () => {
		files[VIEW] = 'views: [';
		await mountList();
		expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('Open work');
		expect(target.querySelector('[data-note-list-empty]')).not.toBeNull();
		expect(target.querySelector('[data-note-list-sort]')).toBeNull();
		expect(target.querySelector('[data-note-list-new]')).toBeNull();

		unmount(component!);
		component = null;
		clearAllViewParseCache();
		delete files[VIEW];
		await mountList();
		expect(target.querySelector('[data-note-list-empty]')).not.toBeNull();
	});

	describe('+ New here', () => {
		beforeEach(() => {
			vi.useFakeTimers({ toFake: ['Date'] });
			vi.setSystemTime(new Date(2026, 9, 31, 9, 15));
			vi.mocked(invoke).mockResolvedValue(undefined);
			vi.mocked(createFile).mockImplementation(async (dir, name) => `${dir}/${name}`);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("creates a note of the view's one type", async () => {
			vi.mocked(createTypedNote).mockResolvedValue('/vault/Work/Untitled Project.md');
			await mountList();
			target.querySelector<HTMLButtonElement>('[data-note-list-new]')!.click();
			await settle();

			expect(createTypedNote).toHaveBeenCalledWith({ typeName: 'Project', title: 'Untitled Project' });
			expect(openFileInEditor).toHaveBeenCalledWith('/vault/Work/Untitled Project.md');
		});

		it('creates a plain note in the Cmd+N folder when the view pins no type', async () => {
			files[VIEW] = OPEN_ANY_TYPE;
			await mountList();
			target.querySelector<HTMLButtonElement>('[data-note-list-new]')!.click();
			await settle();

			expect(createTypedNote).not.toHaveBeenCalled();
			expect(createFile).toHaveBeenCalledWith('/vault/_notes/2026/10-Oct', 'Untitled.md', '');
			expect(openFileInEditor).toHaveBeenCalledWith('/vault/_notes/2026/10-Oct/Untitled.md');
		});

		it('follows a filter change to another type', async () => {
			await mountList();
			target.querySelector<HTMLButtonElement>('[data-note-list-filter]')!.click();
			await settle();
			const input = document.querySelector<HTMLInputElement>('input[placeholder="Value..."]')!;
			input.value = 'Person';
			input.dispatchEvent(new Event('input', { bubbles: true }));
			await settle();
			target.querySelector<HTMLButtonElement>('[data-note-list-new]')!.click();
			await settle();

			expect(createTypedNote).toHaveBeenCalledWith({ typeName: 'Person', title: 'Untitled Person' });
		});
	});
});
