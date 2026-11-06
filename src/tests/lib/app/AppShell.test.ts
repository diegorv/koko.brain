// @vitest-environment jsdom
// The app shell over the real stores, on the Types rail item: the Types navigator's
// rows follow the vault entries and the tree's `.view` files, and nothing else in
// the tree.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

// virtua and the resizable panes observe sizes; jsdom has no ResizeObserver.
globalThis.ResizeObserver = class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;
// An open note mounts the editor and the tab strip; jsdom has no element scrolling.
Element.prototype.scrollTo ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async () => null) }));
// A view lens reads its .view; none exists here.
vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn(async () => { throw new Error('not found'); }) }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ setBadgeCount: vi.fn(async () => {}) }) }));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));
vi.mock('#lib/features/type-definitions/type-definitions.service.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/features/type-definitions/type-definitions.service.js')>()),
	createView: vi.fn(),
}));
// Opens a tab and reads the file from disk; covered by editor.service.test.ts.
vi.mock('#lib/core/editor/editor.service.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/core/editor/editor.service.js')>()),
	openFileInEditor: vi.fn(),
}));

import { createRawSnippet, flushSync, mount, tick, unmount } from 'svelte';
import AppShell from '#lib/app/AppShell.svelte';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { FILES_RAIL_ITEM, SEARCH_RAIL_ITEM, TYPES_RAIL_ITEM } from '#lib/features/rail-shell/lens.logic.js';
import { createView } from '#lib/features/type-definitions/type-definitions.service.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { entryV2 } from '../../fixtures/vault-entries.fixture';

const file = (path: string): FileTreeNode => ({ name: path.split('/').pop()!, path, isDirectory: false });
const folder = (path: string, children: FileTreeNode[]): FileTreeNode => ({ name: path.split('/').pop()!, path, isDirectory: true, children });

const ENTRIES = [entryV2('/vault/Project.md', { isA: 'Type' }), entryV2('/vault/alpha.md', { isA: 'Project' })];

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

async function mountShell() {
	const children = createRawSnippet(() => ({ render: () => '<div></div>' }));
	component = mount(AppShell, { target, props: { children } });
	await settle();
}

const projectCount = () =>
	target.querySelector('[data-types-navigator-row="Project"] [data-types-navigator-count]')?.textContent?.trim();
const viewPaths = () =>
	[...target.querySelectorAll<HTMLElement>('[data-types-navigator-view]')].map((el) => el.dataset.typesNavigatorView);

beforeEach(() => {
	clearLocalStorage();
	settingsStore.reset();
	typeDefinitionsStore.reset();
	fsStore.reset();
	vaultStore._reset();
	vaultStore.open('/vault');
	settingsStore.updateLayout({ railItem: TYPES_RAIL_ITEM });
	typeDefinitionsStore.setEntries(ENTRIES);
	typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap(ENTRIES));
	fsStore.setFileTree([file('/vault/Project.md'), file('/vault/alpha.md'), file('/vault/Open.view')]);
	target = document.body.appendChild(document.createElement('div'));
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	target.remove();
});

describe('AppShell Types navigator rows', () => {
	it('shows the views from the tree and the types with their counts', async () => {
		await mountShell();
		expect(viewPaths()).toEqual(['/vault/Open.view']);
		expect(projectCount()).toBe('1');
	});

	it('does not rebuild the rows when the tree is replaced with the same view files', async () => {
		const entriesRead = vi.spyOn(typeDefinitionsStore, 'entries', 'get');
		await mountShell();
		entriesRead.mockClear();

		fsStore.setFileTree([folder('/vault/Work', [file('/vault/Work/new.md')]), file('/vault/Project.md'), file('/vault/alpha.md'), file('/vault/Open.view')]);
		await settle();
		expect(entriesRead).not.toHaveBeenCalled();
		expect(viewPaths()).toEqual(['/vault/Open.view']);
		entriesRead.mockRestore();
	});

	it('picks up a new view file in the tree', async () => {
		await mountShell();
		fsStore.setFileTree([file('/vault/Project.md'), file('/vault/alpha.md'), file('/vault/Open.view'), folder('/vault/Work', [file('/vault/Work/Board.view')])]);
		await settle();
		expect(viewPaths()).toEqual(['/vault/Work/Board.view', '/vault/Open.view']);
	});

	it('counts a new note of a type', async () => {
		await mountShell();
		const next = [...ENTRIES, entryV2('/vault/beta.md', { isA: 'Project' })];
		typeDefinitionsStore.setEntries(next);
		await settle();
		expect(projectCount()).toBe('2');
	});
});

describe('AppShell stale rail pin', () => {
	const OPEN = '/vault/Open.view';
	const pinnedEntries = [...ENTRIES, entryV2(OPEN, { frontmatter: { _rail: true } })];

	/** Opens the vault's index and lands its first entries snapshot, which runs the once-per-vault-open check. */
	async function landFirstSnapshot() {
		await mountShell();
		vaultStore.markIndexReady();
		await settle();
		typeDefinitionsStore.setEntries(pinnedEntries);
		typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap(pinnedEntries));
		await settle();
	}

	it('sends a saved pin to a missing view back to Today after the first snapshot', async () => {
		settingsStore.updateLayout({ railItem: 'view:/vault/Gone.view' });
		await landFirstSnapshot();
		expect(settingsStore.layout.railItem).toBe('today');
	});

	it('keeps a saved pin to a pinned view', async () => {
		settingsStore.updateLayout({ railItem: `view:${OPEN}` });
		await landFirstSnapshot();
		expect(settingsStore.layout.railItem).toBe(`view:${OPEN}`);
		expect(target.querySelector(`[data-rail-pinned] [data-rail-item="view:${OPEN}"]`)?.getAttribute('aria-current')).toBe('page');
	});

	it('keeps a saved pin while the index loads', async () => {
		settingsStore.updateLayout({ railItem: 'view:/vault/Gone.view' });
		await mountShell();
		typeDefinitionsStore.setEntries(ENTRIES);
		await settle();
		expect(settingsStore.layout.railItem).toBe('view:/vault/Gone.view');
	});
});

describe('AppShell rail click', () => {
	it('shows the panels Cmd+1 hid when an item is clicked', async () => {
		settingsStore.updateLayout({ railItem: 'inbox', railPanelsVisible: false });
		await mountShell();

		target.querySelector<HTMLButtonElement>('[data-rail-item="favorites"]')!.click();
		await settle();
		expect(settingsStore.layout.railItem).toBe('favorites');
		expect(settingsStore.layout.railPanelsVisible).toBe(true);
	});

	it('opens a pinned _open_in_editor view in the editor and leaves the layout as it is', async () => {
		const BOARD = '/vault/Board.view';
		const entries = [...ENTRIES, entryV2(BOARD, { frontmatter: { _rail: true, _open_in_editor: true } })];
		typeDefinitionsStore.setEntries(entries);
		typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap(entries));
		settingsStore.updateLayout({ railItem: 'inbox', railPanelsVisible: false });
		vi.mocked(openFileInEditor).mockClear();
		await mountShell();

		target.querySelector<HTMLButtonElement>(`[data-rail-pinned] [data-rail-item="view:${BOARD}"]`)!.click();
		await settle();
		expect(openFileInEditor).toHaveBeenCalledExactlyOnceWith(BOARD);
		expect(settingsStore.layout.railItem).toBe('inbox');
		expect(settingsStore.layout.railPanelsVisible).toBe(false);
	});

	it('shows Today at once while the active item is hidden, keeps the saved item, and brings it back when shown', async () => {
		await mountShell();
		const active = () => target.querySelector('[data-rail] [aria-current="page"]')?.getAttribute('data-rail-item');
		expect(active()).toBe(TYPES_RAIL_ITEM);

		settingsStore.updateLayout({ railHidden: [TYPES_RAIL_ITEM] });
		await settle();
		expect(active()).toBe('today');
		expect(target.querySelector('[data-types-navigator-row]')).toBeNull();
		expect(settingsStore.layout.railItem).toBe(TYPES_RAIL_ITEM);

		settingsStore.updateLayout({ railHidden: [] });
		await settle();
		expect(active()).toBe(TYPES_RAIL_ITEM);
	});
});

describe('AppShell right sidebar', () => {
	it('sets the row role as the size its panels inherit', async () => {
		settingsStore.updateLayout({ rightSidebarVisible: true });
		await mountShell();

		const sidebar = target.querySelector<HTMLElement>('[data-right-sidebar]');
		expect(sidebar).not.toBeNull();
		expect(sidebar!.classList).toContain('text-row');
		expect(sidebar!.className).not.toMatch(/text-\[\d+px\]/);
	});

	describe('Info section', () => {
		const sidebarTitles = () =>
			[...target.querySelectorAll('[data-right-sidebar] h2')].map((h) => h.textContent?.trim());

		beforeEach(() => {
			editorStore.reset();
			editorStore.addTab({ path: '/vault/alpha.md', name: 'alpha.md', content: 'body', savedContent: 'body' });
			settingsStore.updateLayout({
				rightSidebarVisible: true,
				propertiesVisible: true,
				backlinksVisible: true,
				outgoingLinksVisible: true,
			});
		});

		afterEach(() => editorStore.reset());

		it('comes after every other panel', async () => {
			await mountShell();

			const titles = sidebarTitles();
			expect(titles).toContain('Outgoing links');
			expect(titles.at(-1)).toBe('Info');
		});

		it('hides with the Properties panel', async () => {
			settingsStore.updateLayout({ propertiesVisible: false });
			await mountShell();

			expect(sidebarTitles()).toContain('Outgoing links');
			expect(sidebarTitles()).not.toContain('Info');
		});
	});

	describe('sections', () => {
		beforeEach(() => {
			editorStore.reset();
			editorStore.addTab({ path: '/vault/alpha.md', name: 'alpha.md', content: 'body', savedContent: 'body' });
			settingsStore.updateLayout({
				rightSidebarVisible: true,
				propertiesVisible: true,
				tableOfContentsVisible: true,
				backlinksVisible: true,
				outgoingLinksVisible: true,
			});
		});

		afterEach(() => editorStore.reset());

		it('draws all four through one shared section header', async () => {
			await mountShell();

			const headers = [...target.querySelectorAll('[data-right-sidebar] [data-sidebar-section-header]')];
			expect(headers.map((h) => h.querySelector('h2')?.textContent?.trim())).toEqual([
				'Properties',
				'Table of contents',
				'Backlinks',
				'Outgoing links',
			]);
			for (const header of headers) {
				expect(header.classList).toContain('pane-toolbar');
				expect(header.firstElementChild!.hasAttribute('data-sidebar-section-chevron')).toBe(true);
			}
		});

		it('leaves the dividers between sections to the sections themselves', async () => {
			await mountShell();

			const separators = [...target.querySelectorAll('[data-right-sidebar] [data-slot="separator"]')];
			expect(separators.filter((s) => s.closest('[data-sidebar-section]') === null)).toEqual([]);
		});
	});
});

describe('AppShell traffic-light inset', () => {
	const noteListHeader = () => target.querySelector('[data-rail-note-list] [data-note-list-label]')!.parentElement!;
	const searchHeader = () => target.querySelector('[data-rail-search-header]')!;

	it('insets the note list header when no navigator sits between it and the rail', async () => {
		settingsStore.updateLayout({ railItem: 'inbox' });
		await mountShell();

		expect(target.querySelector('[data-rail-note-list]')).not.toBeNull();
		expect(noteListHeader().classList).toContain('pl-[var(--rail-header-pad)]');
	});

	it('does not inset the note list header behind the Files or Types navigator', async () => {
		for (const railItem of [FILES_RAIL_ITEM, TYPES_RAIL_ITEM]) {
			settingsStore.updateLayout({ railItem });
			await mountShell();

			expect(noteListHeader().classList).toContain('pl-3');
			expect(noteListHeader().classList).not.toContain('pl-[var(--rail-header-pad)]');
			unmount(component!);
			component = null;
		}
	});

	it('insets the Search header, which has no navigator before it', async () => {
		settingsStore.updateLayout({ railItem: SEARCH_RAIL_ITEM });
		await mountShell();

		expect(searchHeader().classList).toContain('pl-[var(--rail-header-pad)]');
	});

	it('sets the header pad of the default rail width on its root', async () => {
		await mountShell();

		const root = target.querySelector<HTMLElement>('[data-rail]')!.closest<HTMLElement>('.h-screen')!;
		expect(root.style.getPropertyValue('--rail-header-pad')).toBe('12px');
	});
});

describe('AppShell with a Markdown note open', () => {
	beforeEach(() => {
		editorStore.reset();
		editorStore.addTab({ path: '/vault/alpha.md', name: 'alpha', content: '# Alpha\n', savedContent: '# Alpha\n' });
	});

	afterEach(() => editorStore.reset());

	const sidebarToggles = () =>
		[...target.querySelectorAll('button')].filter((b) => /right sidebar/i.test(`${b.title} ${b.getAttribute('aria-label') ?? ''}`));

	it('renders one right-sidebar toggle, the tab-band one', async () => {
		await mountShell();
		for (const visible of [true, false]) {
			settingsStore.updateLayout({ rightSidebarVisible: visible });
			await settle();
			expect(target.querySelector('[data-testid="note-action-bar"]')).not.toBeNull();
			expect(sidebarToggles().map((b) => b.title)).toEqual([visible ? 'Hide right sidebar' : 'Show right sidebar']);
		}
	});

	it('draws the note action bar and the Properties header as the same pane toolbar', async () => {
		settingsStore.updateLayout({ rightSidebarVisible: true });
		await mountShell();

		const bar = target.querySelector<HTMLElement>('[data-testid="note-action-bar"]')!;
		const propertiesHeader = [...target.querySelectorAll('[data-right-sidebar] h2')].find((h) => h.textContent?.trim() === 'Properties')!
			.parentElement!;
		expect(bar.classList).toContain('pane-toolbar');
		expect(propertiesHeader.classList).toContain('pane-toolbar');
	});
});

describe('AppShell New view from the Files navigator', () => {
	it('switches the rail to the Types item with the new view as its lens', async () => {
		settingsStore.updateLayout({ railItem: FILES_RAIL_ITEM });
		vi.mocked(createView).mockResolvedValue('/vault/Work/Reading.view');
		fsStore.setFileTree([folder('/vault/Work', []), file('/vault/Project.md'), file('/vault/alpha.md')]);
		await mountShell();

		const workRow = target.querySelector('[data-files-navigator-row="/vault/Work"]')!;
		workRow.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
		await settle();
		[...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((n) => n.textContent?.trim() === 'New view')!.click();
		await settle();
		const input = document.querySelector<HTMLInputElement>('input[placeholder="View name"]')!;
		input.value = 'Reading';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
		await settle();

		expect(createView).toHaveBeenCalledWith('Reading', undefined, '/vault/Work');
		expect(settingsStore.layout.railItem).toBe(TYPES_RAIL_ITEM);
		expect(settingsStore.layout.railTypesLens).toEqual({ kind: 'view', target: '/vault/Work/Reading.view' });
	});
});
