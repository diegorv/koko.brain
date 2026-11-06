// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { setupLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

// The markdown editor's context menu (bits-ui, @floating-ui/dom) needs ResizeObserver.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
// jsdom has no element scrolling; the editor restores scroll positions in a rAF.
Element.prototype.scrollTo ??= () => {};
// The tab strip scrolls the active tab into view.
Element.prototype.scrollIntoView ??= () => {};
// The canvas (xyflow) reads the color-scheme media query; jsdom has no matchMedia.
window.matchMedia ??= (query: string) =>
	({
		matches: false,
		media: query,
		onchange: null,
		addEventListener() {},
		removeEventListener() {},
		addListener() {},
		removeListener() {},
		dispatchEvent: () => false,
	}) as MediaQueryList;
// The system clipboard is a side-effect boundary.
const writeText = vi.fn((_text: string) => Promise.resolve());
Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(() => Promise.resolve(vi.fn())),
	emit: vi.fn(),
}));

// The disk read `openFileInEditor` makes; the other exports stay real.
vi.mock('@tauri-apps/plugin-fs', async (importOriginal) => ({
	...(await importOriginal<typeof import('@tauri-apps/plugin-fs')>()),
	readTextFile: vi.fn(),
}));

// Icon packs load lazily from bundled data; the lookup is stubbed so the
// test controls which icon a type resolves to.
vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));

import { readTextFile } from '@tauri-apps/plugin-fs';
import { getIconSync } from '#lib/features/file-icons/file-icons.icon-data.js';
import { registerAppPorts, unregisterAppPorts } from '#lib/app/boot.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { TAGS_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import EditorView from '#lib/app/EditorView.svelte';
import type { EditorView as CodeMirrorView } from '@codemirror/view';
import { appEditorHost, appFencedBlockRenderers } from '#lib/app/editor-host.js';
import { fencedBlockRenderers } from '#lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.js';
import { editorHost, NOOP_HOST } from '#lib/core/markdown-editor/editor-host.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { tocStore } from '#lib/plugins/table-of-contents/toc.store.svelte.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { registerCollectionPathChangeConsumer } from '#lib/features/collection/collection.service.js';
import { applyPathChange } from '#lib/core/filesystem/path-change.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { entryV2 } from '../../fixtures/vault-entries.fixture';

const ROCKET_PATH = 'M1 2L3 4';

describe('EditorView tab icons', () => {
	let component: Record<string, unknown> | null = null;

	// The app wiring gives the icon resolver its type lookup.
	beforeAll(() => registerAppPorts());
	afterAll(() => unregisterAppPorts());

	beforeEach(() => {
		editorStore.reset();
		fileIconsStore.reset();
		typeDefinitionsStore.reset();
		vi.mocked(getIconSync).mockReturnValue({
			name: 'rocket',
			pack: 'lucide',
			svgContent: `<path d="${ROCKET_PATH}"/>`,
			viewBox: '0 0 24 24',
			keywords: [],
		});
		// A Project type whose definition note carries a rocket icon and a title color.
		typeDefinitionsStore.setEntries([
			entryV2('/vault/Project.md', { title: 'Project', isA: 'Type' }),
			entryV2('/vault/my-project.md', { title: 'my-project', isA: 'Project' }),
		]);
		fileIconsStore.setFrontmatterIcons(
			new Map([['/vault/Project.md', { iconPack: 'lucide', iconName: 'rocket', titleColor: '#ff8800' }]]),
		);
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	/** Mounts EditorView with a typed note tab and an active Tags tab; returns the tab elements. */
	function render(): HTMLElement[] {
		editorStore.addTab({ path: '/vault/my-project.md', name: 'my-project', content: '', savedContent: '' });
		editorStore.addTab({ path: TAGS_VIRTUAL_PATH, name: 'Tags', content: '', savedContent: '', fileType: 'tags' });
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(EditorView, { target });
		flushSync();
		return [...target.querySelectorAll<HTMLElement>('[role="tab"]')];
	}

	it("shows a note tab with its type's icon and title color", () => {
		const [noteTab] = render();

		expect(noteTab.textContent).toContain('my-project');
		expect(noteTab.querySelector(`svg path[d="${ROCKET_PATH}"]`)).not.toBeNull();
		// jsdom normalizes the hex to rgb()
		expect(noteTab.querySelector<HTMLElement>('span.truncate')!.style.color).toBe('rgb(255, 136, 0)');
	});

	it('shows a virtual tab with its fixed icon, not a resolved one', () => {
		const [, tagsTab] = render();

		expect(tagsTab.textContent).toContain('Tags');
		expect(tagsTab.querySelector(`svg path[d="${ROCKET_PATH}"]`)).toBeNull();
		expect(tagsTab.querySelector('svg')).not.toBeNull();
	});
});

describe('EditorView markdown editor host', () => {
	let component: Record<string, unknown> | null = null;

	beforeAll(() => registerAppPorts());
	afterAll(() => unregisterAppPorts());

	beforeEach(() => {
		editorStore.reset();
		settingsStore.reset();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	/** Mounts EditorView on a markdown note tab; returns the mounted CodeMirror view. */
	function renderNote(): CodeMirrorView {
		editorStore.addTab({ path: '/vault/note.md', name: 'note', content: '# Note\n\n[[Other]]', savedContent: '' });
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(EditorView, { target });
		flushSync();
		const view = editorStore.editorView;
		expect(view).not.toBeNull();
		return view!;
	}

	it("installs the app's host, not NOOP_HOST", () => {
		const view = renderNote();

		expect(view.state.facet(editorHost)).toBe(appEditorHost);
		expect(view.state.facet(editorHost)).not.toBe(NOOP_HOST);
	});

	it('installs the queryjs and collection renderers, and keeps them in source mode', () => {
		const view = renderNote();
		const installed = () => [...view.state.facet(fencedBlockRenderers).values()];

		expect([...view.state.facet(fencedBlockRenderers).keys()].sort()).toEqual(['collection', 'queryjs']);
		expect(installed()).toEqual([...appFencedBlockRenderers]);
		editorStore.setLivePreview(false);
		flushSync();
		expect(installed()).toEqual([...appFencedBlockRenderers]);
		editorStore.setLivePreview(true);
		flushSync();
	});

	it('keeps the host in source mode', () => {
		const view = renderNote();

		editorStore.setLivePreview(false);
		flushSync();

		expect(view.state.facet(editorHost)).toBe(appEditorHost);
		editorStore.setLivePreview(true);
		flushSync();
	});

	it('toggling profiling or periodic-notes settings reconfigures nothing and keeps the host', async () => {
		const view = renderNote();
		// Let the mount-time language load land before watching.
		await new Promise((r) => setTimeout(r, 0));
		const hostBefore = view.state.facet(editorHost);
		const update = vi.spyOn(view, 'update');

		settingsStore.updateLivePreviewProfiling(true);
		flushSync();
		settingsStore.updateLivePreviewProfiling(false);
		flushSync();
		settingsStore.updatePeriodicNotes({
			...settingsStore.periodicNotes,
			folder: 'Daily',
			daily: { ...settingsStore.periodicNotes.daily, format: 'YYYY-MM-DD' },
		});
		flushSync();

		const transactions = update.mock.calls.flatMap(([trs]) => trs);
		expect(transactions.filter((tr) => tr.reconfigured)).toEqual([]);
		expect(view.state.facet(editorHost)).toBe(hostBefore);
		update.mockRestore();
	});

	it('the action bar\'s More > Show the table of contents opens the table of contents on the note', async () => {
		renderNote();
		settingsStore.updateLayout({ rightSidebarVisible: false, tableOfContentsVisible: false });
		flushSync();

		const more = document.body.querySelector<HTMLButtonElement>('button[aria-label="More note actions"]')!;
		more.focus();
		more.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		await new Promise((r) => setTimeout(r, 0));
		flushSync();
		document.body.querySelector<HTMLElement>('[data-slot="dropdown-menu-item"][data-action="toc"]')!.click();
		await new Promise((r) => setTimeout(r, 0));
		flushSync();

		expect(settingsStore.layout.rightSidebarVisible).toBe(true);
		expect(settingsStore.layout.tableOfContentsVisible).toBe(true);
		expect(tocStore.expandedPath).toBe('/vault/note.md');
	});

	it('the context menu\'s Copy block link copies the heading link', async () => {
		renderNote();
		writeText.mockClear();

		document.body
			.querySelector('.absolute.inset-0')!
			.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 1, clientY: 1 }));
		flushSync();
		await new Promise((r) => setTimeout(r, 0));
		const item = [...document.body.querySelectorAll<HTMLElement>('[data-slot="context-menu-item"]')].find((el) =>
			el.textContent?.includes('Copy block link'),
		);
		item!.click();
		await new Promise((r) => setTimeout(r, 0));

		// The cursor sits on `# Note`, the first line.
		expect(writeText).toHaveBeenCalledWith('[[note#Note]]');
	});
});

describe('EditorView floating source toggle', () => {
	let component: Record<string, unknown> | null = null;

	beforeAll(() => registerAppPorts());
	afterAll(() => unregisterAppPorts());

	beforeEach(() => {
		editorStore.reset();
		settingsStore.reset();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	/** Mounts EditorView on one tab; returns the floating "Switch to ..." toggles it renders. */
	function render(tab: { path: string; content: string; fileType?: 'kanban' | 'canvas' | 'collection' }): HTMLButtonElement[] {
		editorStore.addTab({ ...tab, name: tab.path.split('/').pop()!, savedContent: tab.content });
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(EditorView, { target });
		flushSync();
		return [...target.querySelectorAll<HTMLButtonElement>('button')].filter((b) =>
			(b.getAttribute('aria-label') ?? '').startsWith('Switch to'),
		);
	}

	it('is absent on a Markdown note, whose action bar has Raw', () => {
		const toggles = render({ path: '/vault/note.md', content: '# Note\n' });

		expect(toggles).toEqual([]);
		expect(document.body.querySelector('[data-testid="note-action-bar"] button[aria-label="Show raw Markdown"]')).not.toBeNull();
	});

	it('is present on a kanban tab', () => {
		const toggles = render({ path: '/vault/board.kanban', content: '## To Do\n', fileType: 'kanban' });

		expect(toggles.map((b) => b.getAttribute('aria-label'))).toEqual(['Switch to source mode']);
	});

	it('is present on a canvas tab, at the top right clear of the bottom-right minimap', () => {
		const toggles = render({ path: '/vault/board.canvas', content: '{"nodes":[],"edges":[]}', fileType: 'canvas' });

		expect(toggles.map((b) => b.getAttribute('aria-label'))).toEqual(['Switch to source mode']);
		expect(toggles[0].classList).toContain('top-3');
		expect(toggles[0].classList).not.toContain('bottom-3');
	});

	it('is present on a view tab', () => {
		const toggles = render({ path: '/vault/Open.view', content: 'views:\n  - type: table\n    name: "All"\n', fileType: 'collection' });

		expect(toggles.map((b) => b.getAttribute('aria-label'))).toEqual(['Switch to source mode']);
	});
});

describe('EditorView on a .collection file', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		editorStore.reset();
		collectionStore.reset();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('opens it as text in the text editor, not in the collection editor', async () => {
		const yaml = 'views:\n  - type: table\n    name: "All"\n';
		vi.mocked(readTextFile).mockResolvedValue(yaml);

		await openFileInEditor('/vault/Foo.collection');
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(EditorView, { target });
		flushSync();

		expect(editorStore.activeTab?.fileType).toBeUndefined();
		expect(editorStore.editorView?.state.doc.toString()).toBe(yaml);
		expect(target.textContent).not.toContain('Building index');
		expect(target.querySelector('button[aria-label="Switch to table view"]')).toBeNull();
	});
});

describe('EditorView with no tab open', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => editorStore.reset());

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('draws the top-band divider under the empty strip, like the tab band it replaces', () => {
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(EditorView, { target });
		flushSync();

		const strip = target.querySelector<HTMLElement>('[data-tauri-drag-region]')!;
		expect(strip.classList).toContain('bg-tab-bar');
		expect(strip.getAttribute('style')).toMatch(/box-shadow:\s*inset 0 -1px 0 var\(--divider\)/);
	});
});

function noteRecord(path: string, status: string): PropertyIndexRecord {
	const name = path.split('/').pop() ?? path;
	return {
		path,
		name,
		basename: name.replace(/\.md$/, ''),
		folder: path.substring(0, path.lastIndexOf('/')),
		ext: '.md',
		mtime: 0,
		ctime: 0,
		size: 0,
		properties: new Map([['status', status]]),
	};
}

describe('EditorView collection tabs', () => {
	const A_PATH = '/vault/a.view';
	const B_PATH = '/vault/b.view';
	const A_YAML = `filters: 'status == "open"'
views:
  - type: table
    name: "A1"
  - type: table
    name: "A2"
  - type: table
    name: "A3"
`;
	const B_YAML = `filters: 'status == "review"'
views:
  - type: table
    name: "B1"
  - type: table
    name: "B2"
`;
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	beforeAll(() => registerAppPorts());
	afterAll(() => unregisterAppPorts());

	beforeEach(() => {
		editorStore.reset();
		collectionStore.reset();
		// 3 open, 3 review, the rest closed: each collection matches 3 rows.
		const index = new Map<string, PropertyIndexRecord>();
		for (let i = 0; i < 200; i++) {
			const path = `/vault/note-${i}.md`;
			index.set(path, noteRecord(path, i < 3 ? 'open' : i < 6 ? 'review' : 'closed'));
		}
		collectionStore.setPropertyIndex(index);
		// A view lists its rows through the port, which reads the vault's entries.
		typeDefinitionsStore.setEntries([...index.keys()].map((path) => entryV2(path)));
		vaultStore.open('/vault');
		editorStore.addTab({ path: A_PATH, name: 'a', content: A_YAML, savedContent: A_YAML, fileType: 'collection' });
		editorStore.addTab({ path: B_PATH, name: 'b', content: B_YAML, savedContent: B_YAML, fileType: 'collection' });
		editorStore.setActiveIndex(0);
		target = document.body.appendChild(document.createElement('div'));
		component = mount(EditorView, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		collectionStore.reset();
		typeDefinitionsStore.reset();
		vaultStore.close();
	});

	function viewTab(name: string): HTMLButtonElement {
		const found = [...target.querySelectorAll('button')].find((b) => b.textContent?.trim() === name);
		if (!found) throw new Error(`view tab "${name}" not found`);
		return found;
	}

	/** Name of the highlighted view tab. */
	function activeViewName(): string | undefined {
		return [...target.querySelectorAll('button.font-medium')].map((b) => b.textContent?.trim())[0];
	}

	function openTab(index: number): void {
		editorStore.setActiveIndex(index);
		flushSync();
	}

	it('opens a collection never opened in the session on its first view', () => {
		viewTab('A3').click();
		flushSync();
		expect(activeViewName()).toBe('A3');

		openTab(1);

		expect(activeViewName()).toBe('B1');
	});

	it('restores the view last used in a collection when returning to it', () => {
		viewTab('A3').click();
		flushSync();
		openTab(1);
		expect(activeViewName()).toBe('B1');

		openTab(0);

		expect(activeViewName()).toBe('A3');
	});

	it('keeps the active view when the active collection is renamed', async () => {
		viewTab('A3').click();
		flushSync();
		const unregister = registerCollectionPathChangeConsumer();
		try {
			await applyPathChange({ from: A_PATH, to: '/vault/renamed.view', isDirectory: false, diskOp: async () => {} });
			flushSync();
		} finally {
			unregister();
		}

		expect(editorStore.activeTab?.path).toBe('/vault/renamed.view');
		expect(activeViewName()).toBe('A3');
	});

	it('builds only the new collection\'s filtered rows on a file switch', () => {
		expect(target.querySelectorAll('tbody tr')).toHaveLength(3);
		const observer = new MutationObserver(() => {});
		observer.observe(target, { childList: true, subtree: true });

		openTab(1);

		const records = observer.takeRecords();
		observer.disconnect();
		const rows = (nodes: Node[]) =>
			nodes.flatMap((n) => (n instanceof Element ? (n.nodeName === 'TR' ? [n] : [...n.querySelectorAll('tbody tr')]) : []));
		const removed = rows(records.flatMap((m) => [...m.removedNodes]));
		const added = rows(records.flatMap((m) => [...m.addedNodes]));
		// Only A's 3 rows go and only B's 3 rows come: no unfiltered or stale pass.
		expect(removed).toHaveLength(3);
		expect(added).toHaveLength(3);
		expect(target.querySelectorAll('tbody tr')).toHaveLength(3);
		expect(target.textContent).toContain('note-3');
		expect(target.textContent).not.toContain('note-0');
	});
});
