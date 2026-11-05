// @vitest-environment jsdom
// The rail note list on a view lens: the `.view` query result in the order its
// Sort shows, the Sort and Filter popovers in the header persisting to the
// file, and New here inferring the note's type from the filters. Only the
// disk is mocked: the `.view` is read and written through the real parse cache
// and `updateViewToolbarKey`.
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
	exists: vi.fn(),
}));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
// No `.view` is open in a tab here, so the `.view` writer never reaches the tab save.
vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
	saveFileByPath: vi.fn(),
	syncExternalContentToEditor: vi.fn(),
	waitForTabSave: vi.fn(),
}));
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
	createTypedNote: vi.fn(),
}));
vi.mock('#lib/features/properties/lifecycle.service.js', () => ({
	toggleFavoriteForPath: vi.fn(),
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
import { openFileInEditor, saveFileByPath } from '#lib/core/editor/editor.service.js';
import { createFile } from '#lib/core/filesystem/fs.service.js';
import { invoke } from '@tauri-apps/api/core';
import { createTypedNote } from '#lib/features/type-definitions/type-definitions.service.js';
import { clearAllViewParseCache, refreshViewDefinition } from '#lib/features/type-definitions/view-parse-cache.js';
import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { parseCollectionYaml } from '#lib/features/collection/yaml-parser.js';
import { toast } from 'svelte-sonner';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
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

/** The file tree with both `.view` files in it, so the views the tests pick are not missing. */
const TREE: FileTreeNode[] = [
	{ name: 'Projects.view', path: VIEW, isDirectory: false },
	{ name: 'People.view', path: PEOPLE_VIEW, isDirectory: false },
];

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

// A `.view` write waits for its queue, a tab save and an existence check before it lands.
async function settle(rounds = 12) {
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

	/** Opens the multi-column Sort panel, which sits behind the Sort dropdown's last item. */
	async function openSortPanel() {
		target.querySelector<HTMLButtonElement>('[data-note-list-sort]')!.click();
		await settle();
		document.querySelector<HTMLButtonElement>('[data-sort-multiple]')!.click();
		await settle();
		// The dropdown's exit runs after a frame; until then two popovers are in the DOM.
		await vi.waitFor(() => expect(document.querySelector('[data-sort-multiple]')).toBeNull());
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
		fsStore.setFileTree(TREE);
		fileIconsStore.reset();
		typeDefinitionsStore.reset();
		settingsStore.reset();
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });
		railRegistryStore.reset();
		collectionStore.reset();
		vi.clearAllMocks();
		// A `.view` write reaches the note-change owner, whose IPC calls need a promise.
		vi.mocked(invoke).mockResolvedValue(undefined);
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
		vi.mocked(exists).mockImplementation(async (p) => files[String(p)] !== undefined);
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

	it('shows the type chip on a view whose filters do not pin one type', async () => {
		files[VIEW] = `filters: "status == 'open'"\nviews:\n  - type: table\n    name: Open\n`;
		await mountList();

		expect(rowTitles()).toContain('alpha');
		expect(rowPills()[rowTitles().indexOf('alpha')]).toContain('Project');
	});

	it("lists by the view's _sort when it has no Sort", async () => {
		files[VIEW] = PROJECTS_UNSORTED;
		await mountList();
		expect(rowTitles()).toEqual(['alpha', 'beta', 'gamma']);
	});

	it("shows the view's _sort in the Sort popover when the view has no sort of its own", async () => {
		files[VIEW] = PROJECTS_UNSORTED;
		await mountList();
		await openSortPanel();
		expect(document.querySelector('[data-sort-panel-empty]')?.textContent?.trim()).toBe('Sorted by _sort: title');
		expect(document.body.textContent).not.toContain('No sorts applied');
	});

	it('shows the default in the Sort popover of a view with no sort and no _sort', async () => {
		files[PEOPLE_VIEW] = PEOPLE;
		await mountList({ kind: VIEW_LENS_KIND, target: PEOPLE_VIEW });
		await openSortPanel();
		expect(document.querySelector('[data-sort-panel-empty]')?.textContent?.trim()).toBe('Sorted by the default: modified, newest first');
	});

	it('ends the rule line with "first view" for a .view with more than one view', async () => {
		files[VIEW] = `${PROJECTS_UNSORTED}  - type: table\n    name: Second\n`;
		await mountList();
		expect(target.querySelector('[data-note-list-rule]')?.textContent?.trim()).toBe("_type == 'Project', not archived, first view");
	});

	describe('with _rail_view naming the second view', () => {
		const RAIL_VIEW = `_rail_view: Done
views:
  - type: table
    name: Open
    filters: "status == 'open'"
    sort:
      - column: priority
        direction: ASC
  - type: table
    name: Done
    filters: "status == 'done'"
    sort:
      - column: status
        direction: DESC
`;

		function viewsOnDisk() {
			const parsed = parseCollectionYaml(files[VIEW]);
			if (!parsed.success) throw new Error(parsed.error);
			return parsed.definition;
		}

		it('lists the second view and names it on the rule line', async () => {
			files[VIEW] = RAIL_VIEW;
			await mountList();
			expect(rowTitles()).toEqual(['beta']);
			expect(target.querySelector('[data-note-list-rule]')?.textContent?.trim()).toBe(`status == 'done', not archived, view "Done"`);
		});

		it("seeds the Sort and Filter popovers from the second view's sort and filters", async () => {
			files[VIEW] = RAIL_VIEW;
			await mountList();
			await openSortPanel();
			const sortText = document.querySelector('[data-slot="popover-content"]')!.textContent ?? '';
			expect(sortText).toContain('status');
			expect(sortText).not.toContain('priority');
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
			await settle();

			target.querySelector<HTMLButtonElement>('[data-note-list-filter]')!.click();
			await settle();
			expect([...document.querySelectorAll<HTMLInputElement>('input[placeholder="Value..."]')].map((i) => i.value)).toEqual(['done']);
		});

		it('writes a filter edit to the second view and leaves the first as it was', async () => {
			files[VIEW] = RAIL_VIEW;
			const before = viewsOnDisk();
			await mountList();
			target.querySelector<HTMLButtonElement>('[data-note-list-filter]')!.click();
			await settle();
			const input = document.querySelector<HTMLInputElement>('input[placeholder="Value..."]')!;
			input.value = 'open';
			input.dispatchEvent(new Event('input', { bubbles: true }));
			await settle();

			const after = viewsOnDisk();
			expect(after.views[1].filters).toBe("status == 'open'");
			expect(after.views[1].sort).toEqual([{ column: 'status', direction: 'DESC' }]);
			expect(after.views[0]).toEqual(before.views[0]);
			expect(after.railView).toBe('Done');
			expect(rowTitles()).toEqual(['alpha', 'gamma', 'person']);
		});
	});

	it('keeps a view in its query order when a sort is saved under the view lens key', async () => {
		settingsStore.updateLayout({ railListPrefs: { view: { sort: 'title:asc' } } });
		await mountList();
		// A view is ordered by its query; a sort stored under its key does not reorder it.
		expect(rowTitles()).toEqual(['gamma', 'beta', 'alpha']);
	});

	it('reorders the list and saves the sort to the .view when a sort is picked', async () => {
		files[VIEW] = PROJECTS_UNSORTED;
		await mountList();
		expect(target.querySelector('[data-note-list-sort]')?.classList).toContain('text-tab-text-inactive');

		await openSortPanel();
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
		await openSortPanel();
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

	describe('a toolbar edit writes only its key', () => {
		/** The file's filters changed in another editor; nothing bumped the entries, so the rail still shows the old ones. */
		const OPEN_FILTERS_ON_DISK = `filters:
  and:
    - "status == 'open'"
views:
  - type: table
    name: Projects
`;
		const PEOPLE_FILTERS = PROJECTS_BY_NAME_DESC.replace("_type == 'Project'", "_type == 'Person'");
		const CONFLICT_TOAST = 'This view changed. Your edit was not saved.';

		async function typeFilterValue(value: string) {
			target.querySelector<HTMLButtonElement>('[data-note-list-filter]')!.click();
			await settle();
			const input = document.querySelector<HTMLInputElement>('input[placeholder="Value..."]')!;
			expect(input.value).toBe('Project');
			input.value = value;
			input.dispatchEvent(new Event('input', { bubbles: true }));
			await settle();
		}

		function filterValues(): string[] {
			return [...document.querySelectorAll<HTMLInputElement>('input[placeholder="Value..."]')].map((i) => i.value);
		}

		it('keeps the filters changed on disk when only the Sort changes, then shows them', async () => {
			files[VIEW] = PROJECTS_UNSORTED;
			await mountList();
			files[VIEW] = OPEN_FILTERS_ON_DISK;

			await openSortPanel();
			clickButtonWithText('Add sort');
			await settle();
			clickMenuItem('status');
			await settle();

			const onDisk = parseCollectionYaml(files[VIEW]);
			if (!onDisk.success) throw new Error(onDisk.error);
			// The filter bytes keep their shape: `and: [x]` is not collapsed to `x`.
			expect(onDisk.definition.filters).toEqual({ and: ["status == 'open'"] });
			expect(onDisk.definition.views[0].sort).toEqual([{ column: 'status', direction: 'ASC' }]);
			expect(toast.error).not.toHaveBeenCalled();
			// The other key differs from the toolbar after the write: the rail re-seeds from the file.
			expect(target.querySelector('[data-note-list-rule]')?.textContent?.trim()).toBe("status == 'open', not archived");
		});

		it('refuses a filter edit when the filters changed on disk, toasts, and shows the file', async () => {
			await mountList();
			files[VIEW] = PEOPLE_FILTERS;

			await typeFilterValue('Task');

			expect(files[VIEW]).toBe(PEOPLE_FILTERS);
			expect(toast.error).toHaveBeenCalledWith(CONFLICT_TOAST);
			expect(filterValues()).toEqual(['Person']);
			expect(rowTitles()).toEqual(['person']);
		});

		it('refuses a filter edit while a dirty tab holds other filters, leaving its buffer alone', async () => {
			editorStore.addTab({ path: VIEW, name: 'Projects.view', content: PEOPLE_FILTERS, savedContent: PROJECTS_BY_NAME_DESC, fileType: 'collection' });
			await mountList();

			await typeFilterValue('Task');

			expect(editorStore.tabs.find((t) => t.path === VIEW)?.content).toBe(PEOPLE_FILTERS);
			expect(files[VIEW]).toBe(PROJECTS_BY_NAME_DESC);
			expect(saveFileByPath).not.toHaveBeenCalled();
			expect(writeTextFile).not.toHaveBeenCalled();
			expect(toast.error).toHaveBeenCalledWith(CONFLICT_TOAST);
		});

		it('writes two edits in a row with no conflict', async () => {
			await mountList();
			await typeFilterValue('Person');
			const input = document.querySelector<HTMLInputElement>('input[placeholder="Value..."]')!;
			input.value = 'Project';
			input.dispatchEvent(new Event('input', { bubbles: true }));
			await settle();

			expect(toast.error).not.toHaveBeenCalled();
			expect(parseCollectionYaml(files[VIEW])).toMatchObject({ success: true, definition: { filters: "_type == 'Project'" } });
		});
	});

	it('leaves the toast to the editor when the open tab of the .view fails to save, and goes back to the file', async () => {
		files[VIEW] = PROJECTS_UNSORTED;
		editorStore.addTab({ path: VIEW, name: 'Projects.view', content: PROJECTS_UNSORTED, savedContent: PROJECTS_UNSORTED, fileType: 'collection' });
		// `saveFileByPath` reports a failed tab save after toasting it itself.
		vi.mocked(saveFileByPath).mockResolvedValueOnce(false);
		await mountList();
		await openSortPanel();
		clickButtonWithText('Add sort');
		await settle();
		clickMenuItem('status');
		await settle();

		expect(saveFileByPath).toHaveBeenCalledWith(VIEW);
		expect(toast.error).not.toHaveBeenCalled();
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
		await openSortPanel();
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

	it('lists a renamed view once the lens follows the rename and the tree refresh reports the new path', async () => {
		const RENAMED = '/vault/Work.view';
		files[VIEW] = PROJECTS_UNSORTED;
		const props = reactiveProps({ lens: LENS });
		component = mount(RailNoteList, { target, props });
		await settle();
		expect(rowTitles()).toEqual(['alpha', 'beta', 'gamma']);

		// The path-change consumer moves the pick before `applyPathChange` refreshes the tree.
		files[RENAMED] = PROJECTS_UNSORTED;
		delete files[VIEW];
		props.lens = { kind: VIEW_LENS_KIND, target: RENAMED };
		await settle();
		fsStore.setFileTree([{ name: 'Work.view', path: RENAMED, isDirectory: false }]);
		await settle();

		expect(rowTitles()).toEqual(['alpha', 'beta', 'gamma']);
		expect(target.textContent).not.toContain('This view no longer exists');
	});

	it('reads the file again on an index bump, with no manual refresh: rows and Filter popover follow it', async () => {
		await mountList();
		expect(rowTitles()).toEqual(['gamma', 'beta', 'alpha']);

		files[VIEW] = OPEN_ANY_TYPE;
		typeDefinitionsStore.setEntries([...ENTRIES]);
		await settle();

		expect(rowTitles()).toEqual(['alpha', 'gamma', 'person']);
		target.querySelector<HTMLButtonElement>('[data-note-list-filter]')!.click();
		await settle();
		expect([...document.querySelectorAll<HTMLInputElement>('input[placeholder="Value..."]')].map((i) => i.value)).toEqual(['open']);
	});

	it('a view deleted outside the app and re-created at the same path shows the new content', async () => {
		await mountList();

		fsStore.setFileTree([{ name: 'People.view', path: PEOPLE_VIEW, isDirectory: false }]);
		await settle();
		expect(target.textContent).toContain('This view no longer exists');

		files[VIEW] = PEOPLE;
		fsStore.setFileTree(TREE);
		await settle();
		expect(rowTitles()).toEqual(['person']);
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
		expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(VIEW, expect.anything(), { create: false });

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

	function toolbarButtons() {
		return {
			sort: target.querySelector('[data-note-list-sort]'),
			filter: target.querySelector('[data-note-list-filter]'),
			newHere: target.querySelector('[data-note-list-new]'),
		};
	}

	function expectNoToolbar() {
		expect(toolbarButtons()).toEqual({ sort: null, filter: null, newHere: null });
	}

	it('shows Loading, not an empty list, until the property index is ready, then lists the view', async () => {
		collectionStore.reset();
		await mountList();
		expect(target.querySelector('[data-note-list-loading]')?.textContent?.trim()).toBe('Loading...');
		expect(target.querySelector('[data-note-list-empty]')).toBeNull();
		expectNoToolbar();
		collectionStore.setPropertyIndex(buildIndex());
		await settle();
		expect(target.querySelector('[data-note-list-loading]')).toBeNull();
		expect(rowTitles()).toEqual(['gamma', 'beta', 'alpha']);
		expect(toolbarButtons().sort).not.toBeNull();
	});

	describe('before the entries land', () => {
		it('shows Loading and no toolbar with the index ready, then the rows once the entries land', async () => {
			files[VIEW] = PROJECTS_UNSORTED;
			typeDefinitionsStore.reset();
			collectionStore.setPropertyIndex(buildIndex());
			await mountList();
			expect(target.querySelector('[data-note-list-loading]')?.textContent?.trim()).toBe('Loading...');
			expect(target.querySelector('[data-note-list-empty]')).toBeNull();
			expect(target.querySelector('[data-note-list-count]')?.textContent).toBe('');
			expectNoToolbar();
			typeDefinitionsStore.setEntries([...ENTRIES]);
			await settle();
			expect(target.querySelector('[data-note-list-loading]')).toBeNull();
			expect(rowTitles()).toEqual(['alpha', 'beta', 'gamma']);
			expect(toolbarButtons().sort).not.toBeNull();
		});

		it('does not read or seed from the .view while it only waits', async () => {
			typeDefinitionsStore.reset();
			collectionStore.setPropertyIndex(buildIndex());
			vi.mocked(readTextFile).mockClear();
			await mountList();
			expect(readTextFile).not.toHaveBeenCalled();
		});

		it('says a view that matches nothing is empty once the entries landed', async () => {
			files[VIEW] = `filters: "_type == 'Recipe'"\nviews:\n  - type: table\n    name: Projects\n`;
			typeDefinitionsStore.reset();
			collectionStore.setPropertyIndex(buildIndex());
			await mountList();
			expect(target.querySelector('[data-note-list-empty]')).toBeNull();
			typeDefinitionsStore.setEntries([...ENTRIES]);
			await settle();
			expect(target.querySelector('[data-note-list-loading]')).toBeNull();
			expect(target.querySelector('[data-note-list-empty]')?.textContent?.trim()).toBe('No notes here');
		});

		it('leaves Loading in a vault with no notes', async () => {
			typeDefinitionsStore.reset();
			collectionStore.setPropertyIndex(new Map());
			await mountList();
			expect(target.querySelector('[data-note-list-loading]')).not.toBeNull();
			typeDefinitionsStore.setEntries([]);
			await settle();
			expect(target.querySelector('[data-note-list-loading]')).toBeNull();
			expect(target.querySelector('[data-note-list-empty]')).not.toBeNull();
		});

		it('does not count a leftover refresh that rewrote the index as well, which Rust answers from the previous vault', async () => {
			files[VIEW] = 'views:\n  - type: table\n    name: All\n';
			typeDefinitionsStore.reset();
			const previous = '/previous/stale.md';
			collectionStore.setPropertyIndex(new Map([[previous, buildNoteRecord(previous, '---\n---\n')]]));
			typeDefinitionsStore.setEntries([entryV2(previous)]);
			await mountList();
			expect(target.querySelector('[data-note-list-loading]')).not.toBeNull();
			expect(rowTitles()).toEqual([]);
			collectionStore.setPropertyIndex(buildIndex());
			typeDefinitionsStore.setEntries([...ENTRIES]);
			await settle();
			expect(target.querySelector('[data-note-list-loading]')).toBeNull();
			expect(rowTitles()).toContain('alpha');
		});

		it('does not count a refresh left over from the previous vault as the entries landing', async () => {
			files[VIEW] = PROJECTS_UNSORTED;
			typeDefinitionsStore.reset();
			collectionStore.setPropertyIndex(buildIndex());
			await mountList();
			typeDefinitionsStore.setEntries([entryV2('/previous/note.md')]);
			await settle();
			expect(typeDefinitionsStore.entriesVersion).toBeGreaterThan(0);
			expect(target.querySelector('[data-note-list-loading]')).not.toBeNull();
			expect(target.querySelector('[data-note-list-empty]')).toBeNull();
			typeDefinitionsStore.setEntries([...ENTRIES]);
			await settle();
			expect(rowTitles()).toEqual(['alpha', 'beta', 'gamma']);
		});
	});

	it('shows Loading, not an empty list, while the first read of the .view is in flight', async () => {
		let finishRead = () => {};
		vi.mocked(readTextFile).mockImplementationOnce(
			(p) =>
				new Promise<string>((resolve) => {
					finishRead = () => resolve(files[String(p)]);
				}),
		);
		await mountList();
		expect(target.querySelector('[data-note-list-loading]')?.textContent?.trim()).toBe('Loading...');
		expect(target.querySelector('[data-note-list-empty]')).toBeNull();
		expectNoToolbar();
		finishRead();
		await settle();
		expect(target.querySelector('[data-note-list-loading]')).toBeNull();
		expect(rowTitles()).toEqual(['gamma', 'beta', 'alpha']);
	});

	it('shows Loading before missing while the index is not ready', async () => {
		collectionStore.reset();
		fsStore.setFileTree([]);
		await mountList();
		expect(target.querySelector('[data-note-list-loading]')).not.toBeNull();
		expect(target.querySelector('[data-note-list-missing]')).toBeNull();
	});

	it("shows the parser's or the read's message, Open view and no toolbar when the .view cannot be parsed or read", async () => {
		files[VIEW] = 'views: [';
		const parsed = parseCollectionYaml(files[VIEW]);
		if (parsed.success) throw new Error('fixture parses');
		await mountList();
		expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('Open work');
		expect(target.querySelector('[data-note-list-error-message]')?.textContent).toBe(parsed.error);
		expect(target.querySelector('[data-note-list-open-view]')).not.toBeNull();
		expect(target.querySelector('[data-note-list-empty]')).toBeNull();
		expectNoToolbar();

		unmount(component!);
		component = null;
		clearAllViewParseCache();
		delete files[VIEW];
		await mountList();
		expect(target.querySelector('[data-note-list-error-message]')?.textContent).toBe(`Could not read the view: not found: ${VIEW}`);
		expect(target.querySelector('[data-note-list-open-view]')).not.toBeNull();
		expect(target.querySelector('[data-note-list-empty]')).toBeNull();
		expectNoToolbar();
	});

	it('shows the filter error, Open view and no toolbar for a .view whose filter does not parse', async () => {
		files[VIEW] = `filters: "status = 'open'"\nviews:\n  - type: table\n    name: Projects\n`;
		await mountList();
		expect(target.querySelector('[data-note-list-error-message]')?.textContent).toContain("status = 'open'");
		expect(target.querySelector('[data-note-list-open-view]')).not.toBeNull();
		expect(target.querySelector('[data-note-list-empty]')).toBeNull();
		expectNoToolbar();
	});

	it('opens the .view in the editor from Open view', async () => {
		files[VIEW] = 'views: [';
		await mountList();
		target.querySelector<HTMLButtonElement>('[data-note-list-open-view]')!.click();
		await settle();
		expect(openFileInEditor).toHaveBeenCalledWith(VIEW);
	});

	it('says a .view that is not in the file tree no longer exists, with no Open view and no toolbar', async () => {
		fsStore.setFileTree([TREE[1]]);
		await mountList();
		expect(target.querySelector('[data-note-list-missing]')?.textContent?.trim()).toBe('This view no longer exists');
		expect(target.querySelector('[data-note-list-open-view]')).toBeNull();
		expect(target.querySelector('[data-note-list-empty]')).toBeNull();
		expectNoToolbar();
	});

	it('switches to "no longer exists" when the .view leaves the tree while its parse is cached, without a remount', async () => {
		await mountList();
		expect(rowTitles()).toEqual(['gamma', 'beta', 'alpha']);
		// A delete outside the app: the watcher refreshes the tree, the parse cache keeps the old parse.
		fsStore.setFileTree([TREE[1]]);
		await settle();
		expect(target.querySelector('[data-note-list-missing]')?.textContent?.trim()).toBe('This view no longer exists');
		expect(rowTitles()).toEqual([]);
		expectNoToolbar();
	});

	it('shows "No notes here" and the toolbar only for a view that ran and matched nothing', async () => {
		files[VIEW] = `filters: "_type == 'Recipe'"\nviews:\n  - type: table\n    name: Projects\n`;
		await mountList();
		expect(target.querySelector('[data-note-list-empty]')?.textContent?.trim()).toBe('No notes here');
		expect(target.querySelector('[data-note-list-error-message]')).toBeNull();
		expect(toolbarButtons().sort).not.toBeNull();
		expect(toolbarButtons().filter).not.toBeNull();
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
